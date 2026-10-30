/* ================================================================
 *  memory/store.ts — 跨 run 记忆仓储（BK-0018 / ADR-0024 §4.2 案甲）
 *  承载 = 同一主库文件 data/agentflow.db 的第二个 better-sqlite3 连接
 *  （pty/audit.ts:1-60 与 kb/store.ts:1-75 两直系先例：WAL 同库、
 *  busy_timeout=2000 兜底跨进程并发、DDL 单语句 prepare 数组、store.ts
 *  主仓储零改动——该文件恰 400 行贴线，BK-0044 备注在案）。
 *  表 memory_entries 单表（key PRIMARY KEY），与主仓储六表、kb_ 三表、
 *  pty_audits 无联合查询无外键（领域正交）。SQL 收敛本模块：tools.ts
 *  只见函数。
 *  隐私面（issue#17 知悉款）：全局 KV 无用户/工作流隔离——任意 run 的模型
 *  可读写全部条目；明文落库 data/agentflow.db（gitignore，与 runs/sessions
 *  同库同安全等级）；MEMORY_ENABLED=0/未配置时本模块不 init 不连接（server.ts
 *  门控接线），懒自启仅由注入后的工具调用触达。
 * ================================================================ */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

/* dist/memory/store.js → 仓库根（kb/store.ts:16 ROOT 派生式同型，同退四层） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DB_FILE = path.join(ROOT, 'data', 'agentflow.db');

export interface MemoryGetHit { key: string; found: true; value: string; bytes: number; updated_at: number }
export interface MemoryGetMiss { key: string; found: false }
export interface MemoryListEntry { key: string; bytes: number; updated_at: number }
export interface MemoryListResult { entries: MemoryListEntry[]; total: number; truncated: boolean }

let db: Database.Database | null = null;

/* DDL 终稿（ADR-0024 §4.2 案甲字段集）：表名 memory_ 前缀域防撞名
 * （pty_audits / kb_ 先例同型）。逐条单语句 prepare 执行（kb/store.ts:28-51
 * 同型：DDL 为模块级常量、零用户输入，单语句形态即静态可核）。key 列未声明
 * COLLATE → 默认 BINARY（UTF-8 码点序），ORDER BY key 即字典序（确定性输出序
 * ——list 语义与分页的排序基础）。 */
const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS memory_entries(
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
];

/* ---------- 启动期开连接 + DDL（server.ts 门控调用；幂等） ---------- */
export function initMemoryStore(): void {
  if(db) return;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('busy_timeout = 2000');
  for(const stmt of DDL) db.prepare(stmt).run();
  logger.info('memory 跨 run 记忆存储已就绪');
}

/* ---------- 优雅停机关连接（server.ts closeKbStore 之后、closeStore 之前——
 * 「停机先关副仓储」时序先例同型；未 init 时零操作） ---------- */
export function closeMemoryStore(): void {
  if(!db) return;
  try{ db.close(); }catch{ /* 已关闭 */ }
  db = null;
}

/* 连接访问器：懒自启兜底（kb/store.ts:72-75 防御路径同型——幂等 DDL 保证
 * 任意序安全；仅 MEMORY_ENABLED=1 注入后的工具调用会触达本路径） */
function conn(): Database.Database {
  if(!db) initMemoryStore();
  return db!;
}

/* ---------- get：未命中不 throw（found:false，模型可据此初始化） ---------- */
export function memoryGet(key: string): MemoryGetHit | MemoryGetMiss {
  const row = conn().prepare(
    'SELECT value, bytes, updated_at FROM memory_entries WHERE key = ?').get(key) as
    { value: string; bytes: number; updated_at: number } | undefined;
  if(!row) return { key, found: false };
  return { key, found: true, value: row.value, bytes: row.bytes, updated_at: row.updated_at };
}

/* ---------- set：upsert 覆盖更新（同 key 覆写刷 updated_at、created_at 保留
 * 首写——ON CONFLICT DO UPDATE 不触 created_at 列；调用方先做限幅与满载判定） ---------- */
export function memoryUpsert(key: string, value: string, bytes: number): { key: string; bytes: number; updated_at: number } {
  const now = Date.now();
  conn().prepare(`
    INSERT INTO memory_entries(key, value, bytes, created_at, updated_at) VALUES(?,?,?,?,?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, bytes = excluded.bytes, updated_at = excluded.updated_at`)
    .run(key, value, bytes, now, now);
  return { key, bytes, updated_at: now };
}

/* ---------- 满载判定用计数（条目上限闸在 tools.ts，SQL 只出计数） ---------- */
export function countMemoryEntries(): number {
  const row = conn().prepare('SELECT COUNT(*) AS n FROM memory_entries').get() as { n: number };
  return row.n;
}

/* LIKE 前缀转义（\ % _ 三字符；ESCAPE '\' 保证用户前缀按字面匹配，不引入通配） */
function likePrefixOf(prefix: string): string {
  return prefix.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
}

/* ---------- list：前缀过滤 + key 字典序（BINARY 码点序）+ offset/limit 分页
 * （ADR-0024 §2.2：truncated = offset + limit < total；确定性输出序
 * kb/store.ts:113-115 先例。prefix 空缺 = 全量。） ---------- */
export function memoryList(prefix: string | undefined, limit: number, offset: number): MemoryListResult {
  const d = conn();
  const where = prefix !== undefined && prefix !== '' ? 'WHERE key LIKE ? ESCAPE \'\\\'' : '';
  const args = prefix !== undefined && prefix !== '' ? [likePrefixOf(prefix)] : [];
  const total = (d.prepare(`SELECT COUNT(*) AS n FROM memory_entries ${where}`).get(...args) as { n: number }).n;
  const entries = d.prepare(
    `SELECT key, bytes, updated_at FROM memory_entries ${where} ORDER BY key LIMIT ? OFFSET ?`)
    .all(...args, limit, offset) as MemoryListEntry[];
  return { entries, total, truncated: offset + limit < total };
}
