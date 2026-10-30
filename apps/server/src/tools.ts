/* ================================================================
 *  tools.ts — LLM 节点 MCP 工具的真实实现（供 AI SDK tool 调用）
 *  与前端 MCP_SERVERS 注册表一一对应；文件操作全部限制在
 *  server/sandbox/ 目录内（路径穿越防护），未实现的工具如实返回
 *  "not implemented"，不伪造结果。
 * ================================================================ */
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webSearch } from './search.js';
import type { SearchResponse } from './search.js';
import { guardedFetch } from './guard.js';
import Database from 'better-sqlite3';

/* 编译产物位于 dist/，沙箱锚定到包根 apps/server/sandbox（与 TS 化前一致） */
const SANDBOX = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'sandbox');

async function safePath(rel: unknown): Promise<string> {
  const p = path.resolve(SANDBOX, String(rel ?? '').replace(/^[/\\]+/,''));
  if(p !== SANDBOX && !p.startsWith(SANDBOX + path.sep)) throw new Error('路径越界：只允许访问沙箱目录');
  return p;
}
async function ensureSandbox(){ await fsp.mkdir(SANDBOX, { recursive:true }); }

/* ---------- sqlite 沙箱工具基建（迭代 0026 / BK-0008 · SPEC §3）----------
 * DB 锚定沙箱专用文件 mcp-sqlite.db：路径仅由 SANDBOX 常量派生，与主库
 * data/agentflow.db（store.ts:31，不同根）物理隔离；惰性单例连接，句柄缓存到
 * 进程退出（不注册停机钩子，SPEC §3.1 边界声明）。
 * 越界防护 = 无 SQL 解析器前提下的全文 token 黑名单（ATTACH/DETACH/PRAGMA/
 * VACUUM + load_extension 调用面；实证向量见迭代 0020 SPEC §2.2），命中即
 * throw（对齐 safePath 异常语义）；沙箱锚定为第二道兜底。模型传入 SQL 原样
 * 透传 prepare/exec，代码零拼装（SPEC §3.7）。 */
const SQLITE_DB = path.join(SANDBOX, 'mcp-sqlite.db');
const MAX_ROWS = 100;    /* query 行上限（iterate 早停，不整表物化） */
const MAX_CELL = 512;    /* 单元格文本化截断上限（对齐 read_file/fetch 限幅族） */
const SQL_DENY = /\b(attach|detach|pragma|vacuum)\b/i;
const SQL_DENY_FN = /\bload_extension\s*\(/i;
let sdb: Database.Database | null = null;   /* 惰性单例（进程生命周期） */

async function getDb(): Promise<Database.Database> {
  if(!sdb){ await ensureSandbox(); sdb = new Database(SQLITE_DB); }
  return sdb;
}
function assertSql(raw: unknown): string {
  if(typeof raw !== 'string' || !raw.trim()) throw new Error('sqlite 工具参数错误：sql 必须为非空字符串');
  if(SQL_DENY.test(raw) || SQL_DENY_FN.test(raw))
    throw new Error('SQL 越界：ATTACH/DETACH/PRAGMA/VACUUM/扩展加载被拒（sqlite 工具仅允许操作沙箱专用数据库）');
  return raw;
}
function cellOf(v: unknown): unknown {
  if(v === null || v === undefined) return null;
  const s = typeof v === 'string' ? v : Buffer.isBuffer(v) ? v.toString('utf8') : String(v);
  return s.length > MAX_CELL ? s.slice(0, MAX_CELL) + '…' : s;
}

type ToolImpl = (args: any) => Promise<any>;

export const IMPL: Record<string, Record<string, ToolImpl> | null> = {
  'filesystem': {
    read_file: async ({ path: rel }) => {
      const p = await safePath(rel);
      return { path:rel, content:(await fsp.readFile(p,'utf8')).slice(0, 200*1024) };
    },
    write_file: async ({ path: rel, content }) => {
      const p = await safePath(rel);
      await fsp.mkdir(path.dirname(p), { recursive:true });
      await fsp.writeFile(p, String(content ?? ''), 'utf8');
      return { path:rel, bytes:Buffer.byteLength(String(content ?? '')) };
    },
    list_directory: async ({ path: rel = '' }) => {
      const p = await safePath(rel);
      const names = await fsp.readdir(p, { withFileTypes:true });
      return { entries: names.map(d=>({ name:d.name, type:d.isDirectory()?'dir':'file' })) };
    },
  },
  'fetch': {
    fetch: async ({ url }) => {
      const r = await guardedFetch(url, { signal: AbortSignal.timeout(15000), headers:{ 'User-Agent':'AgentFlow/1.0' } });
      const text = (await r.text()).slice(0, 200*1024);
      return { status:r.status, contentType:r.headers.get('content-type') || '', excerpt:text.slice(0, 4000) };
    },
    download: async ({ url }) => {
      const r = await guardedFetch(url, { signal: AbortSignal.timeout(20000) });
      const buf = Buffer.from(await r.arrayBuffer());
      const name = 'download-' + Date.now() + '-' + (String(url).split('/').pop() || 'file').replace(/[^\w.-]/g,'_').slice(0,60);
      await ensureSandbox();
      await fsp.writeFile(path.join(SANDBOX, name), buf);
      return { savedAs:name, bytes:buf.length, status:r.status };
    },
  },
  'sqlite': {
    query: async ({ sql }) => {
      const q = assertSql(sql);
      const stmt = (await getDb()).prepare(q);   /* 多语句/语法错由 better-sqlite3 原生 throw，如实透传 */
      if(!stmt.reader) throw new Error('sqlite.query 仅支持返回行集的语句；写入或建表请用 sqlite.execute');
      const rows: Record<string, unknown>[] = [];
      let truncated = false;
      for(const row of stmt.iterate()){
        if(rows.length >= MAX_ROWS){ truncated = true; break; }   /* 早停：不整表物化 */
        const cells: Record<string, unknown> = {};
        for(const [k, v] of Object.entries(row as Record<string, unknown>)) cells[k] = cellOf(v);
        rows.push(cells);
      }
      return { rows, truncated };
    },
    execute: async ({ sql }) => {
      const q = assertSql(sql);
      const db = await getDb();
      const before = (db.prepare('SELECT total_changes() AS c').get() as { c:number }).c;
      db.exec(q);   /* 多语句以 ; 分隔累计计数；SELECT 行集被丢弃（desc 已声明） */
      const after = (db.prepare('SELECT total_changes() AS c').get() as { c:number }).c;
      const lastInsertRowid = (db.prepare('SELECT last_insert_rowid() AS r').get() as { r:number }).r;
      return { changes: after - before, lastInsertRowid };
    },
  },
  'browser': null,  /* 未实现 */
  'web-search': {
    search: async ({ query, count = 5 }) => {
      const res = (await webSearch(query, count)) as SearchResponse | null;
      if(!res) return { available:false, note:'搜索服务不可用（未配置 BOCHA_API_KEY 且 DuckDuckGo 不可达）' };
      return { engine:res.engine, results:res.results };
    },
    news: async ({ query, count = 5 }) => {
      const res = (await webSearch(query + ' 最新消息 新闻', count)) as SearchResponse | null;
      if(!res) return { available:false, note:'搜索服务不可用' };
      return { engine:res.engine, results:res.results };
    },
  },
};

export interface ToolSpec { desc: string; schema: Record<string, string> }

/* ---------- 如实降级 stub（迭代 0009 · BK-0005）----------
 * 载荷逐字保留原文；STUB_MARK 供 llm.ts 区分日志级别与摘要——
 * tools.ts 无 emit/pino 通道，运行态观测一律归 llm.ts 单一出口。 */
export const STUB_MARK = '__stub';
export function stubOf(server: string, name: string): ToolImpl {
  const f: ToolImpl = async () => ({ error: 'not implemented', note: `工具 ${server}.${name} 未接入真实实现` });
  (f as any)[STUB_MARK] = true;
  return f;
}
export const isStubImpl = (f: unknown): boolean =>
  typeof f === 'function' && (f as any)[STUB_MARK] === true;

export const TOOL_SPECS: Record<string, ToolSpec> = {
  'filesystem.read_file':      { desc:'读取沙箱目录内的文本文件', schema:{ path:'要读取的相对路径' } },
  'filesystem.write_file':     { desc:'将文本写入沙箱目录内的文件', schema:{ path:'相对路径', content:'要写入的内容' } },
  'filesystem.list_directory': { desc:'列出沙箱目录的内容', schema:{ path:'相对路径，可为空' } },
  'fetch.fetch':               { desc:'抓取一个 http(s) URL，返回正文摘录', schema:{ url:'完整 URL' } },
  'fetch.download':            { desc:'下载 URL 资源保存到沙箱目录', schema:{ url:'URL' } },
  'web-search.search':         { desc:'联网搜索，返回标题/链接/摘要', schema:{ query:'搜索关键词', count:'结果数量，默认5' } },
  'web-search.news':           { desc:'检索某话题的最新新闻', schema:{ query:'话题关键词', count:'结果数量，默认5' } },
  'sqlite.query':              { desc:'在沙箱数据库执行 SELECT 查询并返回行集（上限 100 行；仅限沙箱数据库，不能访问其他数据库文件）', schema:{ sql:'SQL 语句' } },
  'sqlite.execute':            { desc:'在沙箱数据库执行写入或结构 SQL（CREATE/INSERT/UPDATE/DELETE 等，多语句以 ; 分隔；仅限沙箱数据库）', schema:{ sql:'SQL 语句' } },
  'browser.navigate':          { desc:'（未实现）打开页面', schema:{ url:'URL' } },
  'browser.click':             { desc:'（未实现）点击元素', schema:{ selector:'选择器' } },
  'browser.screenshot':        { desc:'（未实现）截屏', schema:{} },
  /* 跨 run 记忆三工具（BK-0018 / ADR-0024 §2）：plain key——capabilities.ts `${id}.` 前缀派生零命中
   * （端点响应逐字节不变）+ llm.ts 安全名清洗恒等；实现体在 memory/tools.ts，注入 = llm.ts env 门控 merge，绝不入上方 IMPL（防绕过 env 门禁）。 */
  'memory_get':                { desc:'读取跨 run 记忆中一个键的值（全局共享，未命中返回 found:false 不报错）', schema:{ key:'要读取的键名（1-128 字符，字母数字起头，可含 ._:/-）' } },
  'memory_set':                { desc:'写入或更新跨 run 记忆（同 key 覆盖更新；value 上限 4096 UTF-8 字节，超限报错不截断；全局共享，后续任何 run 可读回）', schema:{ key:'要写入的键名（1-128 字符，字母数字起头，可含 ._:/-）', value:'要记住的内容' } },
  'memory_list':               { desc:'列出跨 run 记忆的键（按 key 字典序，可选前缀过滤与翻页）', schema:{ prefix:'可选，按键名前缀过滤', count:'可选，返回条数上限（1-100，默认 50）', offset:'可选，跳过条数（≥0，默认 0）' } },
};

/* 把节点勾选的 mcp 配置（{serverId:[toolName,...]}）展开为 {toolName: impl} 映射。
 * 三分支解析表（迭代 0025 / BK-0030 · SPEC §2）的内核两臂：IMPL 命中 → 内置
 * impl；否则 → stub。第三臂「外部注册工具动态覆写」在会话层 mcp/inject.ts
 * （buildToolSession：只覆写 isStubImpl===true 的条目，绝不替换内置 impl）。 */
export function collectTools(mcpSel: Record<string, unknown> | undefined | null): Map<string, ToolImpl> {
  const out = new Map<string, ToolImpl>();
  for(const [server, names] of Object.entries(mcpSel || {})){
    if(!Array.isArray(names)) continue;
    for(const n of names){
      const group = IMPL[server];
      if(group && typeof group[n] === 'function') out.set(`${server}.${n}`, group[n]!);
      else out.set(`${server}.${n}`, stubOf(server, n));
    }
  }
  return out;
}
