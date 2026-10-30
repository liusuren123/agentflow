/* ================================================================
 *  memory/tools.ts — 跨 run 记忆三工具实装（BK-0018 / ADR-0024 §2/§4.1）
 *  memory_get / memory_set / memory_list（plain key，无点前缀——capabilities
 *  派生零命中 + llm.ts 安全名清洗恒等的结构前提，ADR-0024 §2.1）。
 *  结构执法（ADR-0024 §4.1 写死）：三工具绝不注册进 tools.ts IMPL——IMPL 唯一
 *  消费 collectTools 只看节点 mcp 选择，入 IMPL 即可被任意 run body 携
 *  mcp:{memory:[…]} 绕过 MEMORY_ENABLED env 门禁；唯一注入通道 =
 *  mergeMemoryTools（llm.ts 会话取得后 env 门控合并，普通 Map set 零魔法）。
 *  限幅以模块常量承载不入 env（ADR-0024 §3 否决多 env 族；tools.ts:34-35
 *  MAX_ROWS/MAX_CELL 同族先例）。失败语义如实 throw 不截断（ADR-0024 §2.2）。
 * ================================================================ */
import { countMemoryEntries, memoryGet, memoryList, memoryUpsert } from './store.js';

type ToolImpl = (args: any) => Promise<any>;   /* tools.ts 同型（其 type 未导出——tools.ts 唯一触点 = TOOL_SPECS，mcp/inject.ts:25 先例） */

/* ---------- 限幅常量（ADR-0024 §2.4 草案值定稿）---------- */
export const MEMORY_KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._:\-/]{0,127}$/;   /* 1-128 字符，字母数字起头；拒空白/控制字符防日志与 list 呈现面混乱 */
export const MEMORY_VALUE_MAX_BYTES = 4096;    /* UTF-8 字节（Buffer.byteLength 口径）——单条记忆 = 一段可注入上下文 */
export const MEMORY_MAX_ENTRIES = 1000;        /* 全局条目上限；满载新 key 拒绝、覆写既有 key 不受限 */
export const MEMORY_LIST_LIMIT_MAX = 100;      /* 分页上限（tools.ts MAX_ROWS=100 同款形态） */
export const MEMORY_LIST_LIMIT_DEFAULT = 50;

function fail(msg: string): never { throw new Error(`memory 工具参数错误：${msg}`); }

/* key 校验（错误信息不回显原值——非法值可含超长/控制字符，如实拒绝即可） */
function assertKey(v: unknown): string {
  if(typeof v === 'string' && MEMORY_KEY_RE.test(v)) return v;
  fail('key 非法（只允许 1-128 字符，字母数字起头，字符集 A-Za-z0-9 与 ._:/-；不含空白/控制字符）');
}

function toInt(v: unknown, def: number, name: string): number {
  if(v === undefined || v === null || v === '') return def;
  const n = typeof v === 'number' ? v : Number(v);
  if(!Number.isInteger(n)) fail(`${name} 必须是整数`);
  return n;
}

/* ---------- memory_set：覆盖更新；超限 throw 不截断（存储事实截断即伪造）；
 * 满载时新 key 拒绝（指引覆写）、既有 key 覆写不受限；空串 value 合法 ---------- */
async function setImpl(args: { key?: unknown; value?: unknown }) {
  const key = assertKey(args?.key);
  if(typeof args?.value !== 'string') fail('value 必须是字符串（空串合法，无删除语义）');
  const bytes = Buffer.byteLength(args.value, 'utf8');
  if(bytes > MEMORY_VALUE_MAX_BYTES)
    fail(`value 超限（${bytes} > ${MEMORY_VALUE_MAX_BYTES} UTF-8 字节）——不截断，请缩短内容`);
  if(!memoryGet(key).found && countMemoryEntries() >= MEMORY_MAX_ENTRIES)
    fail(`记忆条目已满（${MEMORY_MAX_ENTRIES} 条）——无删除工具，请覆写既有 key`);
  return { ok: true, ...memoryUpsert(key, args.value, bytes) };
}

/* ---------- memory_get：未命中不 throw（found:false，模型可据此初始化）---------- */
async function getImpl(args: { key?: unknown }) {
  return memoryGet(assertKey(args?.key));
}

/* ---------- memory_list：前缀过滤 + 字典序 + 分页（ADR-0024 §2.2：limit 1-100
 * 默认 50、offset ≥0 默认 0、truncated = offset+limit < total）。
 * 参数名定稿说明：分页上限参数名 count（原 ADR §2.2 草案名 limit）——llm.ts
 * zod shape 机械派生以 /数量|count/i 识别数值参数（web-search.search count
 * 先例），limit 键会被降为字符串型；语义逐字保留，仅承载名随派生规则定稿。 ---------- */
async function listImpl(args: { prefix?: unknown; count?: unknown; offset?: unknown }) {
  const rawPrefix = args?.prefix;
  if(rawPrefix !== undefined && rawPrefix !== null && typeof rawPrefix !== 'string') fail('prefix 必须是字符串');
  const prefix = typeof rawPrefix === 'string' ? rawPrefix : undefined;
  const limit = toInt(args?.count, MEMORY_LIST_LIMIT_DEFAULT, 'count');
  const offset = toInt(args?.offset, 0, 'offset');
  if(limit < 1 || limit > MEMORY_LIST_LIMIT_MAX) fail(`count 必须在 1-${MEMORY_LIST_LIMIT_MAX}（默认 ${MEMORY_LIST_LIMIT_DEFAULT}）`);
  if(offset < 0) fail('offset 必须 ≥0');
  return memoryList(prefix, limit, offset);
}

export const MEMORY_TOOL_NAMES = ['memory_get', 'memory_set', 'memory_list'] as const;

/* ---------- env 门控注入（llm.ts 唯一生产消费点，ADR-0024 §4.1）：
 * 会话取得后、工具循环消费前普通 Map set；返回注入工具数（sys 通报行用）。
 * stub 计数不受影响（实装非 stub，isStubImpl 零命中）。 ---------- */
export function mergeMemoryTools(impls: Map<string, ToolImpl>): number {
  impls.set('memory_get', getImpl);
  impls.set('memory_set', setImpl);
  impls.set('memory_list', listImpl);
  return MEMORY_TOOL_NAMES.length;
}
