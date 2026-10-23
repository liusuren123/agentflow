/* ================================================================
 *  sessions.ts — 持久会话与流式会话 API（迭代 0015 / BK-0016）
 *  · 会话 = 与 run 正交的第一等资产：不执行画布工作流、不入 runs 表；
 *    turn 事件不入 run_events——run_events 是 run 的回放资产，会话的
 *    持久资产是 messages 表（「先落库后写网」doctrine 延伸至终态事件：
 *    assistant 全文/已累积部分均在 run:done 之前落库）。
 *  · turn 流式复用现有 15 种 SSE 事件承载（run:accepted / node:start /
 *    node:delta / node:done / log / run:error / run:done），零新增契约——
 *    packages/shared 零改动；node:delta 携带累积全文（llm.ts 同型）。
 *  · 模型调用经 providers.ts 既有通道（与 guard.ts 管的节点出站是两条
 *    既有路径，不经 guard）。
 *  · 活动判活只用内存注册表 sessionsById（与 runsById 同构，无 DB status
 *    字段——进程崩溃后 DB 残留不可信，BK-0011 教训）。
 *  · 客户端断连不监听 req close：turn 照常执行并落库（runHandler 同语义）。
 * ================================================================ */
import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import { streamText } from 'ai';
import type { ModelMessage } from 'ai';
import { getModel, providerInfo } from './providers.js';
import { isAbort, sseWriteEvent, sseWriteComment } from './util.js';
import {
  appendMessage, createSession, getSession, getSessionDetail, listRecentMessages, listSessions,
} from './store.js';
import { logger } from './logger.js';

const HISTORY_LIMIT = 20;        // 送模历史截断（DB 全量保存不截断）
const SESSION_NODE_ID = 0;       // 会话合成节点 id（信封内恒 0）
const SESSION_TEMP = 0.7;        // 与 llm.ts 默认同值；本轮无 API 覆盖面
const SESSION_MAX_TOKENS = 2048; // 与 llm.ts 默认同值
const DELTA_EMIT_MS = 60;        // node:delta 节流（llm.ts 同值）
const PING_MS = 15000;           // SSE 保活（server.ts 同值）

/* 会话活动 turn 注册表：sessionId → { ac }（置入唯一入口 = chat 步④，
   删除唯一出口 = chat finally；409 守卫 / stop 判活 / 停机计数三方共用） */
const sessionsById: Record<string, { ac: AbortController }> = Object.create(null);

/* ---------- 建会话 / 列出 / 恢复（仅 v1 命名空间） ---------- */
export const sessionsCreateHandler: RequestHandler = (req, res)=>{
  const { title, model, sys } = req.body || {};   // 宽松解析（workflowsPutHandler 先例）
  res.status(201).json(createSession({ title, model, sys }));
};

export const sessionsListHandler: RequestHandler = (req, res)=>{
  const n = Number(req.query.limit ?? 20);
  if(!Number.isInteger(n) || n < 1 || n > 100){ res.status(400).json({ error:'limit 必须是 1-100 的整数' }); return; }
  res.json({ sessions: listSessions(n) });        // updated_at 倒序
};

export const sessionDetailHandler: RequestHandler = (req, res)=>{
  const d = getSessionDetail(String(req.params.id));
  if(!d){ res.status(404).json({ error:'session not found' }); return; }
  res.json(d);                                    // { session, messages }（seq 升序）
};

/* ---------- 停止信号（无活动 turn 404；与 stopHandler 同语义：
   不区分「会话不存在」与「无活动 turn」） ---------- */
export const sessionStopHandler: RequestHandler = (req, res)=>{
  const t = sessionsById[String(req.params.id)];
  if(!t){ res.status(404).json({ error:'session turn not found' }); return; }
  t.ac.abort();
  res.json({ ok: true });
};

/* ---------- 续聊（SSE 流式 turn） ----------
 * 步骤①-④同步闭合（零 await，better-sqlite3 同步）：Node 单线程下 409 守卫
 * 无 interleaving 窗口；首个 await 在 streamText——此前 400/404/409 均走普通
 * JSON 应答，绝不半开 SSE。 */
export const sessionChatHandler: RequestHandler = (req, res)=>{
  const id = String(req.params.id);
  const text = (req.body ?? {}).text;                                        /* ① */
  if(typeof text !== 'string' || !text.trim()){
    res.status(400).json({ error:'body.text 必须是非空字符串' }); return;
  }
  const s = getSession(id);                                                  /* ② */
  if(!s){ res.status(404).json({ error:'session not found' }); return; }
  if(sessionsById[id]){ res.status(409).json({ error:'session turn is active' }); return; }  /* ③ */
  const ac = new AbortController();                                          /* ④ */
  sessionsById[id] = { ac };
  const turnId = crypto.randomUUID();
  const t0 = Date.now();
  res.writeHead(200, {                                                       /* ⑤ SSE 头（runHandler 同型六头） */
    'Content-Type':'text/event-stream; charset=utf-8',
    'Cache-Control':'no-cache, no-transform',
    'Connection':'keep-alive',
    'X-Accel-Buffering':'no',
    'X-Content-Type-Options':'nosniff',
  });
  /* 事件序列化出口：turn 事件不入 run_events（头注 doctrine），直写 SSE */
  const send = (ev: Record<string, unknown>)=>{ sseWriteEvent(res, ev); };
  send({ type:'run:accepted', runId: turnId });
  const ping = setInterval(()=>{ sseWriteComment(res, 'ping'); }, PING_MS);
  const log = logger.child({ sessionId: id, turnId });
  const finish = (o: { ok: boolean; stopped: boolean; done: number; outputs: string[] })=>{
    send({ type:'run:done', ms: Date.now() - t0, done: o.done, total: 1,
      ok: o.ok, stopped: o.stopped, outputs: o.outputs });
  };

  void (async ()=>{
    let acc = '';
    let lastErr: unknown = null;
    try{
      appendMessage(id, 'user', text);                                       /* ⑥ user 消息先落库 */
      const model = getModel(s.model ?? undefined);                          /* ⑦ */
      if(!model){
        send({ type:'log', lvl:'warn', msg:'⚠ 模型服务未配置，本轮回复终止' });
        send({ type:'run:error', message:`模型服务未配置（${providerInfo().note}）` });
        finish({ ok:false, stopped:false, done:0, outputs:[] });             // assistant 不落库
        return;
      }
      /* ⑧ ⑥已落库，历史末位即本轮 user 消息（不再重复追加）；DESC 取数反序为 ASC */
      const history = listRecentMessages(id, HISTORY_LIMIT).reverse();
      const messages: ModelMessage[] = history.map(r=>({ role: r.role, content: r.text }));
      send({ type:'node:start', id: SESSION_NODE_ID, title: s.title, iteration: null });  /* ⑨ */
      const result = streamText({
        model, system: s.sys || undefined, messages,   // AI SDK 7：system 走独立参数
        temperature: SESSION_TEMP, maxOutputTokens: SESSION_MAX_TOKENS,
        abortSignal: ac.signal,
        onError({ error }){ lastErr = error; },
      });
      let lastEmit = 0;
      for await (const d of result.textStream){
        acc += d;
        const nowT = Date.now();
        if(nowT - lastEmit > DELTA_EMIT_MS){
          send({ type:'node:delta', id: SESSION_NODE_ID, text: acc });       // 累积全文
          lastEmit = nowT;
        }
      }
      send({ type:'node:delta', id: SESSION_NODE_ID, text: acc });           /* ⑩ 补发末次 */
      /* 实测（node v24 + ai@7）：abort 后 textStream 迭代优雅终止而非抛 AbortError，
         已收部分保留在 acc——此处显式判 ac.signal.aborted 走停止路径（部分保留落库），
         与步⑫ 的 isAbort(e) || ac.signal.aborted 判定同语义（后者覆盖流建立前中止等抛错路径） */
      if(ac.signal.aborted){
        if(acc) appendMessage(id, 'assistant', acc);
        finish({ ok:false, stopped:true, done:0, outputs: acc ? [acc] : [] });
        return;
      }
      const full = acc;
      if(!full && lastErr) throw new Error(`模型调用失败：${(lastErr as Error).message || String(lastErr)}`);
      if(!full) throw new Error('模型返回为空');
      let tokens: number | undefined;                                        /* ⑪ */
      try{ const u = await result.usage; tokens = u?.totalTokens || u?.outputTokens || undefined; }catch{ /* usage 不可用 */ }
      send({ type:'node:done', id: SESSION_NODE_ID, title: s.title, out: full, ms: Date.now() - t0,
        ...(tokens !== undefined ? { tokens } : {}), firePort: null, iteration: null });
      send({ type:'log', lvl:'ok', msg:`✓ 会话回复 · 生成 ${tokens ?? '?'} tokens · ${((Date.now() - t0) / 1000).toFixed(1)}s` });
      appendMessage(id, 'assistant', full);                                  // 先落库后写网（终态事件）
      finish({ ok:true, stopped:false, done:1, outputs:[full] });
    }catch(e){
      if(isAbort(e) || ac.signal.aborted){                                   /* ⑫ 停止路径：已累积部分保留 */
        if(acc) appendMessage(id, 'assistant', acc);
        finish({ ok:false, stopped:true, done:0, outputs: acc ? [acc] : [] });
      }else{
        log.error({ err: String((e as Error).message || e) }, '会话 turn 异常');
        send({ type:'run:error', message: String((e as Error).message || e) });
        finish({ ok:false, stopped:false, done:0, outputs:[] });
      }
    }finally{                                                                /* ⑬ */
      clearInterval(ping);
      delete sessionsById[id];
      try{ res.end(); }catch{ }
    }
  })();
};

/* ---------- 优雅停机协作出口（server.ts 调用；注册表不出本模块） ---------- */
export function abortActiveSessions(): number {
  let n = 0;
  for(const id of Object.keys(sessionsById)){
    try{ sessionsById[id]!.ac.abort(); n++; }catch{ /* 已结束 */ }
  }
  return n;
}
export function activeSessionCount(): number {
  return Object.keys(sessionsById).length;
}
