/* ================================================================
 *  discovery-audit.ts — discovery_audits 审计仓储（迭代 0071 / BK-0014 · ADR-0023 §4）
 *  承载 = pty/audit.ts 同型：同一主库文件 data/agentflow.db 的自有
 *  better-sqlite3 连接（store.ts 零改动——该文件恰 400 行贴线，扩表须同步
 *  拆分；SQL 出 store.ts 的先例 = tools.ts 沙箱 sqlite 与 pty/kb 自有仓储）。
 *  同进程同步语义 + Node 单线程 ⇒ 多连接零交错竞争，busy_timeout=2000 兜底
 *  跨进程并发。只作事后审计，不作判活/判权源（ADR-0014 §4.3 定位承袭）。
 *  懒自启兜底（kb/store.ts:70-75 conn() 同型）：发现扫描发生在 mcp/inject.js
 *  模块装载期（早于 server.ts 显式 init），recordDiscoveryAudit 首写自 init
 *  ——幂等 DDL 保证任意求值序安全，扫描期审计行必落库（SPEC §5.3 时序论证）。
 *  v1 无 HTTP 读面，对账 = sqlite 直查（ADR-0023 §4.5）。
 * ================================================================ */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

/* dist/mcp/discovery-audit.js → 仓库根（pty/audit.ts:17 ROOT 派生式同型，mcp/ 多一层） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DB_FILE = path.join(ROOT, 'data', 'agentflow.db');

export const SUMMARY_MAX_CHARS = 256;   /* 审计摘要限幅（pty/audit.ts:20 同值；不落文件正文，防敏感面整段落库） */

export type DiscoveryAuditKind = 'scan' | 'candidate' | 'allow-hit' | 'parse-fail';

export interface DiscoveryAuditRow {
  source: string;   /* 'project-mcp' | 'project-agents' | 'home-agents'；全局解析失败行用 '-'（SPEC §4.2） */
  entry: string;    /* 条目名（mcp 键名 / skill 名 / rule 名去扩展名）；scan 与整源失败行为 '-' */
  kind: DiscoveryAuditKind;
  summary: string;  /* 只含元数据（名称/路径/原因/计数），不落文件正文；写入时 clip ≤256 截断加 '…' */
}

let db: Database.Database | null = null;
let insertStmt: Database.Statement | null = null;

/* ---------- 启动期开连接 + DDL（server.ts initStore 之后调用；幂等） ---------- */
export function initDiscoveryAuditStore(): void {
  if(db) return;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('busy_timeout = 2000');
  db.exec(`
  CREATE TABLE IF NOT EXISTS discovery_audits(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,      -- 'project-mcp' | 'project-agents' | 'home-agents'；全局解析失败行用 '-'
    entry  TEXT NOT NULL,      -- 条目名（mcp 键名 / skill 名 / rule 名去扩展名）；scan 行为 '-'
    kind   TEXT NOT NULL,      -- 'scan' | 'candidate' | 'allow-hit' | 'parse-fail'
    summary TEXT NOT NULL,     -- ≤256 字符截断加 '…'；只含元数据（名称/路径/原因/计数），不落文件正文
    created_at INTEGER NOT NULL
  );
  `);
  insertStmt = db.prepare(
    'INSERT INTO discovery_audits(source, entry, kind, summary, created_at) VALUES(?,?,?,?,?)');
  logger.info('discovery_audits 审计存储已就绪');
}

/* ---------- 优雅停机关连接（server.ts closeStore 之前调用——审计连接先于主库关闭） ---------- */
export function closeDiscoveryAuditStore(): void {
  if(!db) return;
  try{ db.close(); }catch{ /* 已关闭 */ }
  db = null;
  insertStmt = null;
}

/* 连接访问器：懒自启兜底（kb/store.ts:70-75 conn() 同型——模块加载期扫描的
 * 时序兜底；幂等 DDL 保证任意序安全） */
function conn(): Database.Database {
  if(!db) initDiscoveryAuditStore();
  return db!;
}

/** 摘要限幅（超长截断加 '…'；pty/audit.ts:71-73 clip 同型） */
function clip(s: string): string {
  return s.length > SUMMARY_MAX_CHARS ? s.slice(0, SUMMARY_MAX_CHARS) + '…' : s;
}

/* ---------- 写入（容错：内部 catch + pino warn，recordPtyAudit 同型；
 *  审计失败不阻断行为，如实记错） ---------- */
export function recordDiscoveryAudit(row: DiscoveryAuditRow): void {
  try{
    const stmt = insertStmt ?? conn().prepare(
      'INSERT INTO discovery_audits(source, entry, kind, summary, created_at) VALUES(?,?,?,?,?)');
    insertStmt = stmt;
    stmt.run(row.source, row.entry, row.kind, clip(row.summary), Date.now());
  }catch(e){
    logger.warn({ row: { ...row, summary: clip(row.summary) }, err: String((e as Error).message || e) },
      'discovery 审计落库失败（行为照常执行）');
  }
}
