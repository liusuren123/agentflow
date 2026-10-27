/* ================================================================
 *  routes.ts — /api/v1/pty 五端点（ADR-0014 §3 · 迭代 0055 / BK-0044）
 *  · POST /api/v1/pty/sessions            → 201 {sessionId}（503 未启用 / 429 满员 / 500 spawn 失败）
 *  · GET  /api/v1/pty/sessions            → 200 活动会话列表（禁用态恒空集）
 *  · GET  /api/v1/pty/sessions/:id/stream → SSE 输出流（ready/data/warn/exit 私有帧）
 *  · POST /api/v1/pty/sessions/:id/write  → 200（404/400/403——origin=agent 仅服务端内部通道）
 *  · POST /api/v1/pty/sessions/:id/stop   → 200（404 无活动）
 *  v1-only（无 /api/* 旧别名，sessions server.ts:232-237 先例）；流 = 端点私有
 *  SSE 帧零 shared 契约（ADR-0014 §3.4 定稿；绝不进 RunEventSchema）。
 * ================================================================ */
import type { RequestHandler } from 'express';
import { config } from '../config.js';
import { sseWriteEvent, sseWriteComment } from '../util.js';
import { recordPtyAudit } from './audit.js';
import {
  WRITE_MAX_BYTES, activePtyCount, createPtySession, listPtySessions, ptySessionActive,
  ptyStreamAttach, stopPtySession, userWrite,
} from './session.js';

const PING_MS = 15000;   /* SSE 保活（sessions.ts PING_MS 同值） */

/* ---------- 创建（503/429 前置于任何 PTY 副作用） ---------- */
export const ptyCreateHandler: RequestHandler = (_req, res)=>{
  if(!config.ptyEnabled){
    res.status(503).json({ error: 'PTY 会话功能未启用（PTY_ENABLED=0）' }); return;   // SPEC D2
  }
  if(activePtyCount() >= config.ptyMaxSessions){
    res.status(429).json({ error: `PTY 并发会话数已达上限（PTY_MAX_SESSIONS=${config.ptyMaxSessions}）` }); return;   // SPEC D3
  }
  const r = createPtySession();
  if(!r.ok){
    res.status(500).json({ error: `PTY 会话创建失败：${r.error}` }); return;   // spawn 失败不留半开态
  }
  res.status(201).json({ sessionId: r.sessionId });
};

/* ---------- 列表（禁用态恒 {"sessions":[]}，SPEC D2：list 不判 flag） ---------- */
export const ptyListHandler: RequestHandler = (_req, res)=>{
  res.json({ sessions: listPtySessions() });
};

/* ---------- 输出流（SSE；判活 404 不半开流） ---------- */
export const ptyStreamHandler: RequestHandler = (req, res)=>{
  const id = String(req.params.id);
  const handle = ptyStreamAttach(id);
  if(!handle){ res.status(404).json({ error: 'pty session not found' }); return; }
  res.writeHead(200, {                                   /* 六头（sessions chat 同型） */
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
  });
  sseWriteEvent(res, { t: 'ready', sessionId: id, replayBytes: handle.replayBytes });
  for(const chunk of handle.replay) sseWriteEvent(res, { t: 'data', data: chunk });   /* 环形缓冲按序回放 */
  if(!handle.subscribe(res)){                            /* 建流间隙会话已关闭：补终帧收束 */
    sseWriteEvent(res, { t: 'exit', code: null, reason: 'exit' });
    try{ res.end(); }catch{ /* 连接已断 */ }
    return;
  }
  const ping = setInterval(()=>{ sseWriteComment(res, 'ping'); }, PING_MS);
  /* 客户端断连仅自清 subscriber（会话不受影响——turn 正交同语义） */
  req.on('close', ()=>{
    clearInterval(ping);
    handle.unsubscribe(res);
  });
};

/* ---------- 写入（校验序全部先于任何 PTY 副作用，SPEC §4.4） ---------- */
export const ptyWriteHandler: RequestHandler = (req, res)=>{
  const id = String(req.params.id);
  const { data, origin } = req.body || {};
  if(!ptySessionActive(id)){ res.status(404).json({ error: 'pty session not found' }); return; }
  if(typeof data !== 'string' || !data || Buffer.byteLength(data) > WRITE_MAX_BYTES){
    res.status(400).json({ error: `body.data 必须是非空字符串且 ≤${WRITE_MAX_BYTES} 字节` }); return;
  }
  if(origin !== 'user' && origin !== 'agent'){
    res.status(400).json({ error: "body.origin 必须是 'user' 或 'agent'" }); return;
  }
  if(origin === 'agent'){
    /* 防伪造（SPEC D4）：agent 身份唯一入口 = 服务端内部 agentWrite()；
       403 = 值合法但本通道无权；审计如实记录实际 origin */
    recordPtyAudit({ sessionId: id, origin: 'agent', kind: 'write-blocked', summary: String(data) });
    res.status(403).json({ error: 'origin=agent 仅允许服务端内部通道' }); return;
  }
  const r = userWrite(id, data);
  if(!r.ok){ res.status(r.status).json({ error: 'pty session not found' }); return; }
  res.json({ ok: true, danger: r.danger });
};

/* ---------- 显式停止（404 无活动；重复 stop 同 404，幂等由注册表删除自然成立） ---------- */
export const ptyStopHandler: RequestHandler = (req, res)=>{
  if(!stopPtySession(String(req.params.id))){
    res.status(404).json({ error: 'pty session not found' }); return;
  }
  res.json({ ok: true });
};
