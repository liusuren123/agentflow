/* ================================================================
 *  store.ts — SQLite 持久化仓储（ADR-0005）
 *  · 数据文件 data/agentflow.db（仓库根 data/ 目录，不入库；WAL 模式）
 *  · 全部 SQL 收敛在本模块：路由与引擎只见函数、不见 SQL
 *    （接口层隔离，未来可平移 PostgreSQL）
 *  · 落库语义：事件「先落库后写网」（SSE 断线不丢历史）；
 *    事件行与 runs 行状态更新同一事务——进程崩溃时最多丢
 *    「最后一条尚未写入」的事件，已写行原子一致（ADR 反例语义）。
 *  表结构（ADR-0005 首批最小集）：
 *    workflows(id, text, updated_at)
 *    runs(id, text, workflow_name, status, started_at, ended_ms, done, total)
 *    run_events(run_id, seq, json, PRIMARY KEY(run_id, seq))
 *    sessions(id, title, model, sys, created_at, updated_at)（迭代 0015 / BK-0016）
 *    messages(session_id, seq, role, text, created_at, PRIMARY KEY(session_id, seq))
 *    —— 会话/消息与 runs/run_events 完全正交：无外键、无联合查询；
 *    会话的持久资产是 messages 表（turn 的 SSE 事件不入 run_events）。
 *    approval_audits(id, run_id, node_id, reviewer, mode, verdict, reason, created_at)
 *    （迭代 0016 / BK-0017）—— 审批决议留痕（auto/agent/agent-fallback/human 四方式
 *    全覆盖）；与 runs/run_events 正交（对齐靠 run_id+node_id，run 级联删除不清理）。
 * ================================================================ */
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');   // apps/server/dist → 仓库根
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'agentflow.db');

export type RunStatus = 'running' | 'done' | 'error' | 'stopped';

/* runs 列表/详情的对外形状（GET /api/v1/runs 行，不含 text 概要） */
export interface RunRow {
  id: string;
  workflow_name: string;
  status: RunStatus;
  started_at: number;
  ended_ms: number | null;
  done: number;
  total: number;
}
export interface WorkflowSummary { id: string; name: string; updated_at: number }

/* 会话与消息的对外形状（GET /api/v1/sessions* 行，迭代 0015 / BK-0016） */
export interface SessionRow {
  id: string;
  title: string;
  model: string | null;
  sys: string | null;
  created_at: number;
  updated_at: number;
}
export interface MessageRow { seq: number; role: 'user' | 'assistant'; text: string; created_at: number }

/* SSE 事件落库钩子：一个 run 一个 recorder（首条事件与 runs 行插入同事务） */
export interface RunRecorder { record(seq: number, ev: Record<string, unknown>): void }

/* 建表迁移（幂等；新增表/列时在此追加） */
const DDL = `
  CREATE TABLE IF NOT EXISTS workflows(
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS runs(
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    workflow_name TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_ms INTEGER,
    done INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS run_events(
    run_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    json TEXT NOT NULL,
    PRIMARY KEY(run_id, seq)
  );
  CREATE TABLE IF NOT EXISTS sessions(
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    model TEXT,
    sys TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages(
    session_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    role TEXT NOT NULL,          -- 'user' | 'assistant'
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(session_id, seq)
  );
  CREATE TABLE IF NOT EXISTS approval_audits(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    node_id INTEGER NOT NULL,
    reviewer TEXT NOT NULL,      -- 原样 role 参数文本（'node:2' / '值班经理' / 'node:99'）
    mode TEXT NOT NULL,          -- 'auto' | 'agent' | 'agent-fallback' | 'human'（迭代 0016 值域）
    verdict TEXT NOT NULL,       -- 'allow' | 'deny'
    reason TEXT,                 -- 可空：LLM 理由 / 裁决失败 why / 人工 comment / 策略名
    created_at INTEGER NOT NULL
  );
`;

let db: Database.Database | null = null;
let S: {
  upsertWorkflow: Database.Statement;
  listWorkflows: Database.Statement;
  getWorkflow: Database.Statement;
  deleteWorkflow: Database.Statement;
  insertRun: Database.Statement;
  insertEvent: Database.Statement;
  patchRun: Database.Statement;
  listRuns: Database.Statement;
  getRun: Database.Statement;
  listEvents: Database.Statement;
  deleteRun: Database.Statement;
  deleteEvents: Database.Statement;
  insertSession: Database.Statement;
  listSessionsStmt: Database.Statement;
  getSessionStmt: Database.Statement;
  listMessages: Database.Statement;
  listRecentMessages: Database.Statement;
  insertMessage: Database.Statement;
  touchSession: Database.Statement;
  insertApprovalAudit: Database.Statement;
  listDanglingRuns: Database.Statement;
  sweepRuns: Database.Statement;
};
/* 两个事务（openRunRecorder 复用；runId 等经闭包外的参数传入） */
let txFirst: (runId: string, wfText: string, wfName: string, startedAt: number, seq: number, json: string) => void;
let txEvent: (runId: string, seq: number, json: string,
  status: string | null, done: number | null, total: number | null, endedMs: number | null) => void;
/* run 级联删除事务（ADR-0007：run_events 无外键，须手工先删事件行再删 runs 行） */
let txDeleteRun: (runId: string) => boolean;
/* 会话消息事务（迭代 0015）：消息行 + sessions.updated_at 同步更新原子成立 */
let txAppendMessage: (sessionId: string, role: 'user' | 'assistant', text: string) => void;
let txSweepDanglingRuns: () => string[];   /* 启动扫尾事务（迭代 0019 / BK-0011）：SELECT+UPDATE 同事务，SET 仅 status（ended_ms/done/total 原值、事件零新增——不伪造历史） */

/* ---------- 初始化（server.ts 启动期调用一次） ---------- */
export function initStore(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.exec(DDL);

  S = {
    upsertWorkflow: db.prepare(
      `INSERT INTO workflows(id, text, updated_at) VALUES(?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`),
    listWorkflows: db.prepare(`SELECT id, text, updated_at FROM workflows ORDER BY updated_at DESC`),
    getWorkflow: db.prepare(`SELECT id, text, updated_at FROM workflows WHERE id = ?`),
    deleteWorkflow: db.prepare(`DELETE FROM workflows WHERE id = ?`),

    insertRun: db.prepare(
      `INSERT INTO runs(id, text, workflow_name, status, started_at) VALUES(?, ?, ?, 'running', ?)`),
    insertEvent: db.prepare(`INSERT INTO run_events(run_id, seq, json) VALUES(?, ?, ?)`),
    /* 缺省字段传 NULL 保持原值（status/done/total/ended_ms 按事件类型选择性更新） */
    patchRun: db.prepare(
      `UPDATE runs SET
         status   = COALESCE(?, status),
         done     = COALESCE(?, done),
         total    = COALESCE(?, total),
         ended_ms = COALESCE(?, ended_ms)
       WHERE id = ?`),
    listRuns: db.prepare(
      `SELECT id, workflow_name, status, started_at, ended_ms, done, total
       FROM runs ORDER BY started_at DESC LIMIT ?`),
    getRun: db.prepare(
      `SELECT id, workflow_name, status, started_at, ended_ms, done, total FROM runs WHERE id = ?`),
    listEvents: db.prepare(`SELECT json FROM run_events WHERE run_id = ? ORDER BY seq ASC`),
    deleteRun: db.prepare(`DELETE FROM runs WHERE id = ?`),
    deleteEvents: db.prepare(`DELETE FROM run_events WHERE run_id = ?`),

    /* 会话/消息（迭代 0015 / BK-0016；seq 由单语句内子查询自增——跨进程原子，
       双实例共用同一 DB 文件时语句级锁保证不重号） */
    insertSession: db.prepare(
      `INSERT INTO sessions(id, title, model, sys, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)`),
    listSessionsStmt: db.prepare(
      `SELECT id, title, model, sys, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?`),
    getSessionStmt: db.prepare(
      `SELECT id, title, model, sys, created_at, updated_at FROM sessions WHERE id = ?`),
    listMessages: db.prepare(
      `SELECT seq, role, text, created_at FROM messages WHERE session_id = ? ORDER BY seq ASC`),
    listRecentMessages: db.prepare(
      `SELECT seq, role, text FROM messages WHERE session_id = ? ORDER BY seq DESC LIMIT ?`),
    insertMessage: db.prepare(
      `INSERT INTO messages(session_id, seq, role, text, created_at)
       VALUES(?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM messages WHERE session_id = ?), ?, ?, ?)`),
    touchSession: db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`),
    /* 审批审计（迭代 0016 / BK-0017；单条 INSERT，同 insertEvent 形态） */
    insertApprovalAudit: db.prepare(
      `INSERT INTO approval_audits(run_id, node_id, reviewer, mode, verdict, reason, created_at)
       VALUES(?, ?, ?, ?, ?, ?, ?)`),
    listDanglingRuns: db.prepare(`SELECT id FROM runs WHERE status = 'running'`),
    sweepRuns: db.prepare(`UPDATE runs SET status = 'stopped' WHERE status = 'running'`),
  };

  /* 事务①：runs 行插入 + 首事件（run:accepted）——run 的存在性与首事件原子成立 */
  txFirst = db.transaction((runId: string, wfText: string, wfName: string, startedAt: number, seq: number, json: string) => {
    S.insertRun.run(runId, wfText, wfName, startedAt);
    S.insertEvent.run(runId, seq, json);
  });
  /* 事务②：事件行 + runs 状态更新（run:start→total；run:done→status/done/total/ended_ms；
     run:error→status；stop 经 run:done(stopped) 收敛为 status='stopped'） */
  txEvent = db.transaction((runId: string, seq: number, json: string,
    status: string | null, done: number | null, total: number | null, endedMs: number | null) => {
    S.insertEvent.run(runId, seq, json);
    S.patchRun.run(status, done, total, endedMs, runId);
  });
  /* 事务③：run 级联删除（ADR-0007）——run_events 无外键，须手工先删事件行再删
     runs 行；返回 runs 行是否真删（changes>0 即 run 存在，404 判据来自此处） */
  txDeleteRun = db.transaction((runId: string) => {
    S.deleteEvents.run(runId);
    return S.deleteRun.run(runId).changes > 0;
  });
  /* 事务④：会话消息行 + sessions.updated_at 同一事务（迭代 0015 / BK-0016） */
  txAppendMessage = db.transaction((sessionId: string, role: 'user' | 'assistant', text: string) => {
    S.insertMessage.run(sessionId, sessionId, role, text, Date.now());
    S.touchSession.run(Date.now(), sessionId);
  });
  txSweepDanglingRuns = db.transaction((): string[] => {
    const ids = (S.listDanglingRuns.all() as { id: string }[]).map(r => r.id);
    S.sweepRuns.run();
    return ids;
  });
  logger.info({ dbFile: DB_FILE }, 'SQLite 存储就绪（WAL，表迁移完成）');
}

/* ---------- 工作流（GET/PUT /api/v1/workflows） ---------- */
export function saveWorkflow(id: string | undefined,
  doc: { name?: string; nodes: unknown[]; edges?: unknown[]; inputs?: Record<string, unknown> }):
  { id: string; updated_at: number } {
  const wid = id || crypto.randomUUID();
  const updated_at = Date.now();
  const text = JSON.stringify({
    name: doc.name || '未命名工作流',
    nodes: doc.nodes,
    edges: Array.isArray(doc.edges) ? doc.edges : [],
    ...(doc.inputs ? { inputs: doc.inputs } : {}),
  });
  S.upsertWorkflow.run(wid, text, updated_at);
  return { id: wid, updated_at };
}

export function listWorkflows(): WorkflowSummary[] {
  const rows = S.listWorkflows.all() as { id: string; text: string; updated_at: number }[];
  return rows.map(r => {
    let name = '未命名工作流';
    try{ name = (JSON.parse(r.text) as { name?: string }).name || name; }catch{ /* 容忍异常文本 */ }
    return { id: r.id, name, updated_at: r.updated_at };
  });
}

/* 单个工作流完整回读（BUG-001：列表只给摘要，补读取端点的数据层） */
export function getWorkflow(id: string): { id: string; name: string; nodes: unknown[]; edges: unknown[]; inputs?: Record<string, unknown>; updated_at: number } | null {
  if (!db || !S) return null;
  const row = S.getWorkflow.get(id) as { id: string; text: string; updated_at: number } | undefined;
  if (!row) return null;
  let doc: { name?: string; nodes?: unknown[]; edges?: unknown[]; inputs?: Record<string, unknown> };
  try{ doc = JSON.parse(row.text); }catch{ doc = {}; }
  return {
    id: row.id,
    name: doc.name || '未命名工作流',
    nodes: Array.isArray(doc.nodes) ? doc.nodes : [],
    edges: Array.isArray(doc.edges) ? doc.edges : [],
    ...(doc.inputs ? { inputs: doc.inputs } : {}),
    updated_at: row.updated_at,
  };
}

/* 删除工作流（ADR-0007）：无子表，单语句；changes=0 即行不存在（404 判据，不额外 SELECT） */
export function deleteWorkflow(id: string): boolean {
  return S.deleteWorkflow.run(id).changes > 0;
}

/* ---------- 运行落库钩子（server.ts 事件序列化单一出口处创建） ---------- */
export function openRunRecorder(runId: string,
  wf: { name: string; nodes: unknown[]; edges: unknown[] }, inputs: Record<string, unknown>): RunRecorder {
  const wfText = JSON.stringify({ name: wf.name, nodes: wf.nodes, edges: wf.edges, inputs });
  let begun = false;
  return {
    record(seq, ev) {
      const json = JSON.stringify(ev);
      try{
        if(!begun){
          begun = true;
          txFirst(runId, wfText, wf.name, Date.now(), seq, json);
          return;
        }
        switch(ev.type){
          case 'run:start':
            txEvent(runId, seq, json, null, null, num(ev.total), null); break;
          case 'run:done': {
            const status = ev.stopped ? 'stopped' : (ev.ok ? 'done' : 'error');
            txEvent(runId, seq, json, status, num(ev.done), num(ev.total), num(ev.ms));
            break;
          }
          case 'run:error':
            txEvent(runId, seq, json, 'error', null, null, null); break;
          default:
            txEvent(runId, seq, json, null, null, null, null);
        }
      }catch(e){
        /* 持久化失败不阻断 SSE 执行流（降级为仅实时流，如实记错） */
        logger.error({ runId, seq, type: ev.type, err: String((e as Error).message || e) }, '事件落库失败（本次 run 持久化降级）');
      }
    },
  };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* ---------- 运行历史（GET /api/v1/runs · /api/v1/runs/:id） ---------- */
export function listRuns(limit: number): RunRow[] {
  return S.listRuns.all(limit) as RunRow[];
}

export function getRunDetail(id: string): { run: RunRow; events: unknown[] } | null {
  const run = S.getRun.get(id) as RunRow | undefined;
  if(!run) return null;
  const events = (S.listEvents.all(id) as { json: string }[]).map(r => JSON.parse(r.json));
  return { run, events };
}

/* 删除运行记录（ADR-0007）：事务级联清理 run_events（先删事件行再删 runs 行，原子） */
export function deleteRun(id: string): boolean {
  return txDeleteRun(id);
}

export function sweepDanglingRuns(): { count: number; ids: string[] } {
  const ids = txSweepDanglingRuns();
  return { count: ids.length, ids };
}

/* ---------- 会话（迭代 0015 / BK-0016，仅 v1 命名空间；与 runs 正交） ---------- */
export function createSession(doc: { title?: string; model?: string; sys?: string }): SessionRow {
  const id = crypto.randomUUID();
  const now = Date.now();
  const title = typeof doc.title === 'string' && doc.title.trim() ? doc.title : '新会话';
  const model = typeof doc.model === 'string' && doc.model.trim() ? doc.model : null;
  const sys = typeof doc.sys === 'string' ? doc.sys : null;
  S.insertSession.run(id, title, model, sys, now, now);
  return getSession(id)!;
}

export function listSessions(limit: number): SessionRow[] {
  return S.listSessionsStmt.all(limit) as SessionRow[];       // updated_at 倒序
}

export function getSession(id: string): SessionRow | null {
  return (S.getSessionStmt.get(id) as SessionRow | undefined) ?? null;
}

export function getSessionDetail(id: string): { session: SessionRow; messages: MessageRow[] } | null {
  const session = getSession(id);
  if(!session) return null;
  return { session, messages: S.listMessages.all(id) as MessageRow[] };   // seq 升序
}

/* 送模历史截断取数（DB 全量保存不截断；返回 seq DESC，调用方自行反序为 ASC） */
export function listRecentMessages(sessionId: string, limit: number): { seq: number; role: 'user' | 'assistant'; text: string }[] {
  return S.listRecentMessages.all(sessionId, limit) as { seq: number; role: 'user' | 'assistant'; text: string }[];
}

export function appendMessage(sessionId: string, role: 'user' | 'assistant', text: string): void {
  txAppendMessage(sessionId, role, text);   // 本迭代无删除端点，sessionId 必存在（chat handler 已判 404）
}

/* ---------- 审批审计（迭代 0016 / BK-0017，与 runs/run_events 正交；无查询端点） ---------- */
export type ApprovalAuditMode = 'auto' | 'agent' | 'agent-fallback' | 'human';

/* 决议留痕：纯策略短路/智能体裁决/裁决失败降级/人工（含超时中止）统一落一行；
 * 写入时序为「先落库后写网」doctrine 延伸——决议产生 → 本函数 → emit。
 * 容错（SPEC §4.5）：内部 catch + pino warn（镜像 openRunRecorder 先例），不阻断决议。 */
export function recordApprovalAudit(runId: string, nodeId: number, reviewer: string,
  mode: ApprovalAuditMode, verdict: 'allow' | 'deny', reason: string | null): void {
  try{
    S.insertApprovalAudit.run(runId, nodeId, reviewer, mode, verdict, reason, Date.now());
  }catch(e){
    logger.warn({ runId, nodeId, reviewer, mode, verdict, err: String((e as Error).message || e) },
      '审批审计落库失败（决议照常执行）');
  }
}

/* ---------- 关闭（优雅停机时 WAL checkpoint 落盘） ---------- */
export function closeStore(): void {
  if(!db) return;
  try{ db.close(); logger.info('SQLite 存储已关闭'); }catch{ /* 已关闭 */ }
  db = null;
}
