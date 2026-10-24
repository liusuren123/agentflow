/* ================================================================
 *  mcp/inject.ts — MCP 工具会话注入层（迭代 0025 / BK-0030 · ADR-0012 §6.3）
 *  三分支解析表的会话层外部臂：collectTools 内核（内置/stub 两分支，行为
 *  零改动）先产出，再对「注册表命中 ∧ 发现成功 ∧ 清单命中」的工具以动态
 *  impl 覆写 stub——只覆写 isStubImpl===true 的条目（结构执法：内置 impl
 *  绝不被外部替换）；发现快照桥接为模型可见 desc/zod shape（规则从窄）。
 *  外部连接生命周期 = 一次性 per-call（SPEC §4.3 定稿）：connect → callTool
 *  → finally 必达 close（幂等），code.ts 一次性子进程先例、无常驻池；run
 *  中止经闭包捕获的 signal 透传 callTool（connection.ts:29），中止/超时后
 *  级联拆链防 stdio 孤儿。CallToolResult 原样透传不解包（SPEC §4.5）。
 *  全局注册表模块级即建（ADR §6.3 启动 warn 时序；两 env 未配置 = 空解析
 *  零 IO 零副作用）；MCP HTTP 生产出站唯一通道 = guard.mcpFetch——发现
 *  （registry httpFetch 注入缝）与 per-call 两个构造点全量注入（AC2/AC7）。
 * ================================================================ */
import { z } from 'zod';
import { mcpFetch } from '../guard.js';
import { collectTools, isStubImpl } from '../tools.js';
import { createHttpMcpConnection } from './http.js';
import { createStdioMcpConnection } from './stdio.js';
import { buildMcpRegistry, envLoader } from './registry.js';
import type { McpRegistry, McpServerEntry } from './registry.js';
import type { McpToolInfo } from './connection.js';
import { logger } from '../logger.js';

type ToolImpl = (args: any) => Promise<any>;   /* tools.ts 同型（其 type 未导出——tools.ts 行为零改动约束） */

export interface ExternalToolSpec { desc: string; shape: Record<string, any> }   /* shape 值 = zod 类型 */
export interface ToolSession {
  impls: Map<string, ToolImpl>;          /* 全部选中工具（内置/外部动态/降级 stub） */
  extSpecs: Map<string, ExternalToolSpec>;   /* 仅分支②工具（模型可见 desc/shape） */
}

/* 发现失败降级 warn 固定子串锚 = 前 22 字（沿 registry.ts CONFLICT_WARN 先例） */
const DISCOVER_FAIL_WARN = '外部 MCP server 工具发现失败，已降级为 stub';

/* 全局注册表单例（模块级即建）；httpFetch 注入缝保证发现路径同经 guard 收口 */
const registry: McpRegistry = buildMcpRegistry(envLoader(), { httpFetch: mcpFetch });

export interface BuildSessionOptions {
  warn?: (fields: { serverId: string; kind: string; error: string }, msg: string) => void;   /* 缺省 logger.warn（冒烟注入 collector） */
}

function entryOf(serverId: string): McpServerEntry | undefined {
  return registry.entries.find((e) => e.serverId === serverId);
}

/* 分支②动态 impl：per-call 生命周期；HTTP 一律 { fetch: mcpFetch } 注入（AC2），
 * stdio 无出站面；超时继承 BK-0028 默认（connect/listTools 10s、callTool 30s）。 */
function dynamicImpl(entry: McpServerEntry, toolName: string, signal?: AbortSignal): ToolImpl {
  return async (args) => {
    const conn = entry.kind === 'http'
      ? createHttpMcpConnection(entry.serverId, entry.url, { fetch: mcpFetch })
      : createStdioMcpConnection(entry.serverId, entry.command, entry.args);
    try {
      await conn.connect();
      return await conn.callTool(toolName, args ?? {}, undefined, signal);
    } finally {
      await conn.close();
    }
  };
}

/* 发现快照 inputSchema（JSON Schema 子集）→ zod shape，规则从窄（SPEC §4.2 映射表）：
 * string/number/integer/boolean 基本类型 + required 判定；其余（type 缺失/array/
 * object/oneOf…）降级 z.string().optional() 且忽略 required（防 AI SDK 按 shape
 * 校验参数硬失败）；非对象/无 properties → shape={}（与 TOOL_SPECS 未命中现状
 * 一致，模型盲调）。不引入 JSON-Schema 全量解析器。 */
function bridgeSpec(info: McpToolInfo): ExternalToolSpec {
  const desc = String(info.desc || '').trim() || info.name;
  const shape: Record<string, any> = {};
  const raw = info.inputSchema;
  const props = raw && typeof raw === 'object' && (raw as any).properties && typeof (raw as any).properties === 'object'
    ? (raw as any).properties as Record<string, any> : null;
  if (!props) return { desc, shape };
  const reqList = Array.isArray((raw as any).required) ? (raw as any).required.filter((r: unknown) => typeof r === 'string') as string[] : null;
  for (const [k, def] of Object.entries(props)) {
    const defObj = def && typeof def === 'object' ? def as Record<string, any> : null;
    const d = String(defObj?.description ?? k);
    const type = defObj?.type;
    const req = reqList !== null && reqList.includes(k);
    if (type === 'string') shape[k] = (req ? z.string() : z.string().optional()).describe(d);
    else if (type === 'number' || type === 'integer') shape[k] = (req ? z.number() : z.number().optional()).describe(d);
    else if (type === 'boolean') shape[k] = (req ? z.boolean() : z.boolean().optional()).describe(d);
    else shape[k] = z.string().optional().describe(d);
  }
  return { desc, shape };
}

/* 会话构建（llm.ts:38 唯一生产消费点）——三分支解析表（SPEC §2）：
 * ① 内置：collectTools IMPL 臂（零改动）；② 外部：注册表命中 ∧ 发现成功 ∧
 * 清单命中 → 动态 impl 覆写 stub + extSpecs 桥接；③ stub：其余一切（未注册/
 * 清单未命中/发现失败——失败 warn 如实不静默吞，失败不缓存下次重试）。 */
export async function buildToolSession(
  mcpSel: Record<string, unknown> | undefined | null,
  signal?: AbortSignal,
  opts?: BuildSessionOptions,
): Promise<ToolSession> {
  const impls = collectTools(mcpSel);
  const extSpecs = new Map<string, ExternalToolSpec>();
  const warn = opts?.warn ?? ((fields, msg) => { logger.warn(fields, msg); });
  for (const [server, names] of Object.entries(mcpSel || {})) {
    if (!Array.isArray(names) || names.length === 0) continue;   /* 空选零发现（capSummaryServer 同口径） */
    if (!registry.has(server)) continue;                          /* 未注册 → 分支③留 stub */
    let tools: McpToolInfo[];
    try {
      tools = await registry.discoverTools(server);               /* 进程级快照缓存（registry.ts） */
    } catch (e) {
      warn({ serverId: server, kind: entryOf(server)?.kind ?? '-', error: String((e as Error)?.message ?? e) }, DISCOVER_FAIL_WARN);
      continue;                                                   /* 分支③留 stub（不伪造不静默） */
    }
    const entry = entryOf(server);
    if (!entry) continue;
    const manifest = new Map(tools.map((t) => [t.name, t]));
    for (const name of names) {
      const info = manifest.get(String(name));
      if (!info) continue;                                        /* 清单未命中 → 分支③留 stub */
      const key = `${server}.${name}`;
      if (!isStubImpl(impls.get(key))) continue;                  /* 结构执法：绝不覆写非 stub */
      impls.set(key, dynamicImpl(entry, info.name, signal));      /* 分支② */
      extSpecs.set(key, bridgeSpec(info));
    }
  }
  return { impls, extSpecs };
}
