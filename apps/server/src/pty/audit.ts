/* ================================================================
 *  audit.ts — pty_audits 审计仓储（ADR-0014 §3.2-a · 迭代 0055 / BK-0044）
 *  承载落点 = pty 模块自有仓储（SPEC D1）：同一主库文件 data/agentflow.db
 *  的第二个 better-sqlite3 连接（WAL；store.ts 零改动——该文件恰 400 行贴线，
 *  扩表须同步拆分，违背「一次迭代只做一件事」）。SQL 出 store.ts 的先例 =
 *  tools.ts 沙箱 sqlite；同进程同步语义 + Node 单线程 ⇒ 双连接零交错竞争，
 *  busy_timeout=2000 兜底跨进程并发（冒烟多探针实例同库）。
 *  只作事后审计，不作判活源（ADR-0014 §4.3，BK-0011 教训）。
 * ================================================================ */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

/* dist/pty/audit.js → 仓库根（store.ts ROOT 派生式同型，多一层 pty/） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DB_FILE = path.join(ROOT, 'data', 'agentflow.db');

export const SUMMARY_MAX_CHARS = 256;   /* 审计摘要限幅（SPEC D5；防大输出整段落库） */

export type PtyAuditOrigin = 'user' | 'agent' | 'system';
export type PtyAuditKind = 'create' | 'write' | 'write-blocked' | 'close' | 'timeout';

export interface PtyAuditRow {
  sessionId: string;
  origin: PtyAuditOrigin;
  kind: PtyAuditKind;
  summary: string;
  reason?: string | null;
  danger?: boolean;
  pid?: number | null;
}

let db: Database.Database | null = null;
let insertStmt: Database.Statement | null = null;

/* ---------- 启动期开连接 + DDL（server.ts initStore 之后调用；目录已由 store 保证） ---------- */
export function initPtyAuditStore(): void {
  if(db) return;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('busy_timeout = 2000');
  db.exec(`
  CREATE TABLE IF NOT EXISTS pty_audits(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    origin TEXT NOT NULL,            -- 'user' | 'agent' | 'system'（ADR-0014 §3.2-a 值域）
    kind TEXT NOT NULL,              -- 'create' | 'write' | 'write-blocked' | 'close' | 'timeout'
    summary TEXT NOT NULL,           -- 摘要限幅 ≤SUMMARY_MAX_CHARS，截断加 '…'
    reason TEXT,                     -- 可空细因：close→stop|shutdown|exit|sweep-stale；timeout→idle|max-duration
    danger INTEGER NOT NULL DEFAULT 0,  -- 危险模式命中标记位（REQ-0044-03）
    pid INTEGER,                     -- 仅 create 行：PTY 子进程 pid（探针/forensics 锚点）
    created_at INTEGER NOT NULL
  );
  `);
  insertStmt = db.prepare(
    'INSERT INTO pty_audits(session_id, origin, kind, summary, reason, danger, pid, created_at) VALUES(?,?,?,?,?,?,?,?)');
  logger.info('pty_audits 审计存储已就绪');
}

/* ---------- 优雅停机关连接（server.ts closeStore 之前调用——时序保证停机 close 审计行先落库） ---------- */
export function closePtyAuditStore(): void {
  if(!db) return;
  try{ db.close(); }catch{ /* 已关闭 */ }
  db = null;
  insertStmt = null;
}

/** 摘要限幅（超长截断加 '…'， Secrets 面：不整段落库大输出） */
function clip(s: string): string {
  return s.length > SUMMARY_MAX_CHARS ? s.slice(0, SUMMARY_MAX_CHARS) + '…' : s;
}

/* ---------- 写入（容错：内部 catch + pino warn，recordApprovalAudit store.ts 同型；
 *  审计失败不阻断会话行为，如实记错） ---------- */
export function recordPtyAudit(row: PtyAuditRow): void {
  if(!insertStmt){
    logger.warn({ sessionId: row.sessionId }, 'pty 审计落库失败：审计存储未初始化（initPtyAuditStore 未调用）');
    return;
  }
  try{
    insertStmt.run(row.sessionId, row.origin, row.kind, clip(row.summary), row.reason ?? null,
      row.danger ? 1 : 0, row.pid ?? null, Date.now());
  }catch(e){
    logger.warn({ row: { ...row, summary: clip(row.summary) }, err: String((e as Error).message || e) },
      'pty 审计落库失败（会话行为照常执行）');
  }
}

/* ---------- 启动扫尾查询（SPEC D8 审计对账式）：有 create 行、无终局行
 *  （close/timeout）的 session_id——上次进程未优雅收尾的开放记录 ---------- */
export function listOpenPtySessionIds(): string[] {
  if(!db) return [];
  const rows = db.prepare(`
    SELECT DISTINCT session_id FROM pty_audits WHERE kind = 'create'
      AND session_id NOT IN (SELECT session_id FROM pty_audits WHERE kind IN ('close','timeout'))
    ORDER BY session_id`).all() as { session_id: string }[];
  return rows.map(r => r.session_id);
}
