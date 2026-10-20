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
`;

let db: Database.Database | null = null;
let S: {
  upsertWorkflow: Database.Statement;
  listWorkflows: Database.Statement;
  insertRun: Database.Statement;
  insertEvent: Database.Statement;
  patchRun: Database.Statement;
  listRuns: Database.Statement;
  getRun: Database.Statement;
  listEvents: Database.Statement;
};
/* 两个事务（openRunRecorder 复用；runId 等经闭包外的参数传入） */
let txFirst: (runId: string, wfText: string, wfName: string, startedAt: number, seq: number, json: string) => void;
let txEvent: (runId: string, seq: number, json: string,
  status: string | null, done: number | null, total: number | null, endedMs: number | null) => void;

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

/* ---------- 关闭（优雅停机时 WAL checkpoint 落盘） ---------- */
export function closeStore(): void {
  if(!db) return;
  try{ db.close(); logger.info('SQLite 存储已关闭'); }catch{ /* 已关闭 */ }
  db = null;
}
