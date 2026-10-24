/* ================================================================
 *  mcp/registry.ts — 外部 MCP server 注册表与工具清单发现（迭代 0024 / BK-0029）
 *  ADR-0012 §7 案 A + §8：注册源 = env 白名单（MCP_HTTP_SERVERS /
 *  MCP_STDIO_SERVERS，形如 "name1=url,name2=…" / "name1=命令 参数…,…"，
 *  未配置 = 空注册表，现状行为零变化）；§6.3 外部注册名不得与内置五 id
 *  冲突（warn + 拒绝该条，进程不退出——与格式错 fail-fast 不混淆）。
 *  发现 = 按 serverId 建连 → tools/list → 进程级快照缓存，发现即关
 *  （finally 必达 close，立即拆链防 stdio 孤儿）；v1 无失效 API——进程
 *  生命周期即缓存生命周期，server 端清单变更需重启进程；BK-0030 消费侧
 *  若需 per-run 失效再扩展。格式合法性（E1-E8）由 config.ts zod 启动期
 *  fail-fast——本模块 parse 两纯函数即该校验实现（config 复用，零漂移）。
 *  BK-0014 loaders 扩展点（ADR §9）：McpServersLoader 函数签名 + v1 唯一
 *  成员 envLoader，不设抽象基类/注册机制。零生产消费方（唯一消费者 =
 *  tests/smoke/mcp-registry.mjs 与 config.ts 纯函数引用）；零生产出站
 *  路径（真实 endpoint 出站收口归 BK-0030 的 guard mcpFetch 注入）。
 * ================================================================ */
import { createHttpMcpConnection } from './http.js';
import { createStdioMcpConnection } from './stdio.js';
import type { McpConnection, McpToolInfo } from './connection.js';
import type { FetchLike } from '@modelcontextprotocol/client';
import { logger } from '../logger.js';

/* ---- 注册表条目（plain data：双传输构造参数的载体） ---- */
export interface HttpServerEntry { kind: 'http'; serverId: string; url: string }
export interface StdioServerEntry { kind: 'stdio'; serverId: string; command: string; args: string[] }
export type McpServerEntry = HttpServerEntry | StdioServerEntry;

/* 内置五 id（tools.ts IMPL 键的字面镜像，ADR §6.3；冒烟 MR09 与 dist/tools.js
 * IMPL 键集 deepEqual 防漂移）。外部注册名命中即拒绝：内置 id 是前端清单与
 * DEFS 勾选语义锚点，外部同名引入不可分辨双源。 */
export const BUILTIN_MCP_IDS: readonly string[] = ['filesystem', 'fetch', 'sqlite', 'browser', 'web-search'];

/* 冲突 warn 固定子串锚 = 前 14 字「外部 MCP 注册名与内置 id 冲突」（SPEC §2.2；冒烟 MR05/MR06 断言面） */
const CONFLICT_WARN = '外部 MCP 注册名与内置 id 冲突，已拒绝该注册（内置 id 保留给画布内置 server）';

/* name 合法字符：字母/数字/_/-（覆盖内置 web-search 连字符形态，SPEC §2.1） */
const NAME_RE = /^[A-Za-z0-9_-]+$/;

/* ---- 纯解析（零 IO；config.ts zod 与冒烟直测共用同一实现，SPEC §3.1） ----
 * 规则从窄不猜测（SPEC §2.1）：整值 trim 后为空 = 未配置；逗号分割条目并逐条
 * trim；首个 "=" 分割 name/值（值内后续 "=" 归值，URL query 不受影响）；
 * E1-E8 任一命中即 problems 非空（E9 跨 env 重复归 config 交叉校验）。 */
interface ParseResult<T> { entries: T[]; problems: string[] }
type StepResult<T> = { ok: true; value: T } | { ok: false; problem: string };

function splitNameValue(item: string, label: string): StepResult<{ name: string; value: string }> {
  const eq = item.indexOf('=');
  if (eq < 0) return { ok: false, problem: `${label}：name 缺失（无 "="）` };                     /* E1 */
  const name = item.slice(0, eq).trim();
  const value = item.slice(eq + 1).trim();
  if (!name) return { ok: false, problem: `${label}：name 为空` };                               /* E2 */
  if (!NAME_RE.test(name)) return { ok: false, problem: `${label}：name 含非法字符（只允许字母/数字/_/-）：${name}` };  /* E3 */
  return { ok: true, value: { name, value } };   /* 值空（E4/E7）判在传输各自回调（消息分面） */
}

function parseSpec<T>(
  spec: string,
  toEntry: (name: string, value: string, label: string) => StepResult<T>,
): ParseResult<T> {
  const entries: T[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  const s = spec.trim();
  if (!s) return { entries, problems };   /* 整值空白 = 未配置（沿 config.ts 空串归一语义） */
  s.split(',').forEach((raw, i) => {
    const item = raw.trim();
    const label = `条目 ${i + 1}`;
    if (!item) { problems.push(`${label}：空条目（连续/首尾逗号）`); return; }                      /* E5 */
    const nv = splitNameValue(item, label);
    if (!nv.ok) { problems.push(nv.problem); return; }
    if (seen.has(nv.value.name)) { problems.push(`${label}：name 重复：${nv.value.name}`); return; }  /* E8 */
    const r = toEntry(nv.value.name, nv.value.value, label);
    if (r.ok) { seen.add(nv.value.name); entries.push(r.value); } else problems.push(r.problem);
  });
  return { entries, problems };
}

export function parseHttpServersSpec(spec: string): ParseResult<HttpServerEntry> {
  return parseSpec(spec, (name, value, label): StepResult<HttpServerEntry> => {
    if (!value) return { ok: false, problem: `${label}：值为空` };                                /* E4 */
    let u: URL | null = null;
    try { u = new URL(value); } catch { /* 非法 URL */ }
    if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:'))
      return { ok: false, problem: `${label}：URL 非法或协议非 http/https：${value}` };             /* E6 */
    return { ok: true, value: { kind: 'http', serverId: name, url: value } };
  });
}

export function parseStdioServersSpec(spec: string): ParseResult<StdioServerEntry> {
  return parseSpec(spec, (name, value, label): StepResult<StdioServerEntry> => {
    if (!value) return { ok: false, problem: `${label}：值为空（command 缺失）` };                /* E7（E4 的 stdio 面） */
    const argv = value.split(/\s+/);   /* 值已 trim 无空 token；argv[0]=command 余为 args */
    const command = argv[0];
    if (!command) return { ok: false, problem: `${label}：command 缺失` };                        /* 防御（理论不可达） */
    return { ok: true, value: { kind: 'stdio', serverId: name, command, args: argv.slice(1) } };
  });
}

/* ---- BK-0014 loaders 扩展点（ADR §9）：仅函数签名 + v1 唯一成员，不做抽象设施 ---- */
export interface McpRegistrySources { mcpHttpServers?: string; mcpStdioServers?: string }
export type McpServersLoader = () => McpRegistrySources;

/* v1 loader = env 解析器：读两 key，空串归一为未配置（config.ts rawEnv 同语义）。
 * 后续 .mcp.json / ~/.agents 扫描 loader（BK-0014）届时以新成员加入本签名。 */
export const envLoader: McpServersLoader = () => ({
  mcpHttpServers: process.env.MCP_HTTP_SERVERS || undefined,
  mcpStdioServers: process.env.MCP_STDIO_SERVERS || undefined,
});

/* ---- 注册表构建（语义层：内置 id 冲突 warn+拒绝该条；格式合法性由 config 前置保证） ---- */
export interface BuildRegistryOptions {
  warn?: (fields: { serverId: string; kind: string }, msg: string) => void;   /* 缺省 logger.warn（冒烟注入 collector） */
  httpFetch?: FetchLike;   /* BK-0030：HTTP 发现连接的 fetch 注入（默认 SDK 全局 fetch，MR 兼容） */
}

export function buildMcpRegistry(sources: McpRegistrySources, opts?: BuildRegistryOptions): McpRegistry {
  const warn = opts?.warn ?? ((fields, msg) => { logger.warn(fields, msg); });
  const http = parseHttpServersSpec(sources.mcpHttpServers ?? '');
  const stdio = parseStdioServersSpec(sources.mcpStdioServers ?? '');
  const problems = [...http.problems, ...stdio.problems];
  if (problems.length > 0)
    throw new Error(`MCP 注册源解析失败（理论不可达：config 已前置校验）：${problems.join('；')}`);
  const entries: McpServerEntry[] = [];
  for (const e of [...http.entries, ...stdio.entries]) {
    if (BUILTIN_MCP_IDS.includes(e.serverId)) {
      warn({ serverId: e.serverId, kind: e.kind }, CONFLICT_WARN);   /* 拒绝该条，进程继续 */
      continue;
    }
    entries.push(e);
  }
  return new McpRegistry(entries, opts?.httpFetch);
}

/* ---- 注册表：tools/list 发现入口 + 进程级快照缓存（SPEC §2.3） ---- */
export class McpRegistry {
  readonly entries: readonly McpServerEntry[];
  private readonly byId = new Map<string, McpServerEntry>();
  private readonly toolsCache = new Map<string, McpToolInfo[]>();
  private readonly discoveryCounts = new Map<string, number>();
  private readonly stdioPids = new Map<string, number | null>();
  private readonly httpFetch?: FetchLike;   /* BK-0030 注入缝：undefined = 现行为（SDK 全局 fetch） */

  constructor(entries: readonly McpServerEntry[], httpFetch?: FetchLike) {
    this.entries = entries;
    this.httpFetch = httpFetch;
    for (const e of entries) this.byId.set(e.serverId, e);
  }

  has(serverId: string): boolean { return this.byId.has(serverId); }

  /** 工具清单发现：未命中 → 建连 → connect → listTools → 快照缓存；finally 必达
   *  close（发现即关、立即拆链，超时继承 BK-0028 默认不自制定时器；connect/
   *  listTools 失败原样外抛、失败结果不缓存）；命中 → 直接回快照（零连接零出站）。 */
  async discoverTools(serverId: string): Promise<McpToolInfo[]> {
    const cached = this.toolsCache.get(serverId);
    if (cached) return cached;
    const entry = this.byId.get(serverId);
    if (!entry) throw new Error(`未注册的 MCP server: ${serverId}`);
    this.discoveryCounts.set(serverId, (this.discoveryCounts.get(serverId) ?? 0) + 1);
    const conn: McpConnection = entry.kind === 'http'
      ? createHttpMcpConnection(entry.serverId, entry.url, this.httpFetch ? { fetch: this.httpFetch } : undefined)
      : createStdioMcpConnection(entry.serverId, entry.command, entry.args);
    try {
      await conn.connect();
      if (entry.kind === 'stdio') this.recordStdioPid(serverId, conn);
      const tools = await conn.listTools();
      this.toolsCache.set(serverId, tools);
      return tools;
    } finally {
      await conn.close();
    }
  }

  /* 测试探针面（非接口承诺，生产代码不得依赖；stdio.ts get pid 同型先例） */
  discoveryCount(serverId: string): number { return this.discoveryCounts.get(serverId) ?? 0; }
  stdioPidOf(serverId: string): number | null | undefined { return this.stdioPids.get(serverId); }

  /* connect 后 spawn 已发生，pid 可读（stdio.ts transport.pid 透传探针，close 前记录） */
  private recordStdioPid(serverId: string, conn: McpConnection): void {
    const pid = (conn as { readonly pid?: number | null }).pid;
    this.stdioPids.set(serverId, typeof pid === 'number' && pid > 0 ? pid : null);
  }
}
