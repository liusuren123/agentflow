/* ================================================================
 *  session.ts — PTY 会话运行时（ADR-0014 §2/§4 · 迭代 0055 / BK-0044）
 *  · 进程模型 = ADR-0014 §2.1 案 a：每会话一 PTY 子进程（create 时惰性
 *    spawn；无池化/复用/共享——b/c 案否决）；会话关闭即进程收尾
 *    （kill + wait 双确认）。
 *  · 判活唯一源 = 模块级内存注册表 ptyById（sessions.ts sessionsById 同构）；
 *    DB/审计表只作事后审计不作判活源（ADR-0014 §4.3，BK-0011 教训）。
 *  · 【如实定级声明（ADR-0014 §2.2）】safePath 强制越界拒绝在 PTY 形态
 *    不可移植（shell 可 cd）——本模块安全强度 = 「初始 cwd 锚定 + 全量审计
 *    + PTY_ENABLED 默认关」三层缓解，不是 tools.ts safePath 同等强度；
 *    本文件与日志不宣称强制边界。残余风险：PTY 子进程网络不经 guard.ts。
 *  · run 正交（sessions.ts:3 先例）：PTY 会话生命周期不随 run 绑定；
 *    agentWrite 的 signal 中止只断本次注入调用（ADR-0014 §4.2）。
 * ================================================================ */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Response } from 'express';
import { spawn as ptySpawn } from 'node-pty';
import type { IPty } from 'node-pty';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { sseWriteEvent } from '../util.js';
import { recordPtyAudit, listOpenPtySessionIds } from './audit.js';
import { scanDangerous } from './danger.js';

/* SANDBOX 根：dist/pty/session.js → 包根 apps/server/sandbox（tools.ts:16 解析式
 * 同型，多一层 pty/）；不 import tools.ts 私有常量（tools.ts 零改动）。
 * 会话目录 sandbox/pty/<id>/ 与 mcp-sqlite.db 异目录互不覆盖（ADR-0014 §2.2）。 */
const SANDBOX_ROOT = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), 'sandbox');

/* 资源限幅族（SPEC D5，ADR-0014 §2.4 存在性原则的数值定案） */
const RING_CAPACITY_BYTES = 262144;  /* 输出环形缓冲 256KiB/会话（超容丢最旧） */
const FRAME_MAX_BYTES = 32768;       /* 单 SSE 帧上限 32KiB（超长 chunk 拆帧按序发） */
export const WRITE_MAX_BYTES = 16384;/* 写入载荷上限（超限 400） */
const CLOSE_WAIT_MS = 2000;          /* close 后等 PTY 退出确认的宽限 */
const AGENT_ECHO_MS = 500;           /* agent 注入输出回显收集窗口（= in-flight 区间） */

export type PtyCloseReason = 'stop' | 'idle' | 'max-duration' | 'exit' | 'shutdown';

interface PtySession {
  sessionId: string;
  spawnAttempted: boolean;        /* spawn 发起即置位（失败也走收尾路径防半开态） */
  closed: boolean;                /* 终态标志（closed 置位后重复 close no-op） */
  createdAt: number;
  lastActivityAt: number;
  ring: string[];                 /* 输出环形缓冲（chunk 序列，字节总量封顶丢最旧） */
  ringBytes: number;
  subscribers: Set<Response>;     /* SSE 扇出（stream 端点） */
  echoCollectors: Array<(chunk: string) => void>;  /* agentWrite 回显收集窗口 */
  agentInFlight: boolean;         /* agent 注入单飞守卫（409 语义） */
  proc: IPty | null;
  pid: number | null;
  exitCode: number | null;        /* 自然退出码（超时未确认时保持 null，不伪造） */
  exited: boolean;
  exitWaiters: Array<() => void>;
  idleTimer: ReturnType<typeof setTimeout> | null;
  maxTimer: ReturnType<typeof setTimeout> | null;
}

/* 判活唯一源（内存注册表；运行结束即删除） */
const ptyById: Record<string, PtySession> = Object.create(null);
const log = logger.child({ mod: 'pty' });

/* ---------- 工具 ---------- */
function byteLen(s: string): number { return Buffer.byteLength(s); }

/* 超长 chunk 拆帧（按字节预算切，不切断多字节字符） */
function frameChunks(s: string): string[] {
  const out: string[] = [];
  let buf = '', bytes = 0;
  for(const ch of s){
    const b = byteLen(ch);
    if(bytes + b > FRAME_MAX_BYTES && buf){ out.push(buf); buf = ''; bytes = 0; }
    buf += ch; bytes += b;
  }
  if(buf) out.push(buf);
  return out;
}

function appendRing(s: PtySession, chunk: string): void {
  s.ring.push(chunk);
  s.ringBytes += byteLen(chunk);
  while(s.ringBytes > RING_CAPACITY_BYTES && s.ring.length > 1){
    s.ringBytes -= byteLen(s.ring[0]!);
    s.ring.shift();
  }
}

function broadcast(s: PtySession, ev: Record<string, unknown>): void {
  for(const res of s.subscribers) sseWriteEvent(res, ev);
}

function armIdle(s: PtySession): void {
  if(s.idleTimer) clearTimeout(s.idleTimer);
  s.idleTimer = setTimeout(()=>{ void closePtySession(s, 'idle'); }, config.ptyIdleTimeoutMs);
}

function waitForExit(s: PtySession, ms: number): Promise<boolean> {
  if(s.exited) return Promise.resolve(true);
  return new Promise(resolve=>{
    const t = setTimeout(()=>{ s.exitWaiters = s.exitWaiters.filter(w => w !== wake); resolve(false); }, ms);
    const wake = ()=>{ clearTimeout(t); resolve(true); };
    s.exitWaiters.push(wake);
  });
}

/* ---------- close：六迁移唯一收尾出口（幂等；双标志见头注字段） ----------
 * 序：no-op 判定 → 置 closed → 清计时器 → kill → 等 onExit（≤CLOSE_WAIT_MS，
 * 超时记 warn 不伪造退出码）→ 广播 exit 帧并收束 subscribers → 审计行 →
 * 删注册表。spawn 失败路径同样走本出口（spawnAttempted 已置位）。 */
async function closePtySession(s: PtySession, reason: PtyCloseReason): Promise<void> {
  if(s.closed) return;                                   /* 幂等：双触发 no-op 无双 kill */
  s.closed = true;
  if(s.idleTimer){ clearTimeout(s.idleTimer); s.idleTimer = null; }
  if(s.maxTimer){ clearTimeout(s.maxTimer); s.maxTimer = null; }
  if(s.proc && !s.exited){
    try{ s.proc.kill(); }catch{ /* 已死 */ }
    const confirmed = await waitForExit(s, CLOSE_WAIT_MS);
    if(!confirmed) log.warn({ sessionId: s.sessionId }, 'PTY 退出确认超时（kill 已发出，视为收尾）');
  }
  for(const res of s.subscribers){
    sseWriteEvent(res, { t: 'exit', code: s.exitCode, reason });
    try{ res.end(); }catch{ /* 连接已断 */ }
  }
  s.subscribers.clear();
  recordPtyAudit({
    sessionId: s.sessionId, origin: 'system',
    kind: reason === 'idle' || reason === 'max-duration' ? 'timeout' : 'close',
    summary: `会话关闭（${reason}）`, reason,
  });
  delete ptyById[s.sessionId];
  log.info({ sessionId: s.sessionId, reason, pid: s.pid }, 'PTY 会话关闭');
}

/* ---------- PTY 数据/退出事件 ---------- */
function onData(s: PtySession, chunk: string): void {
  for(const c of s.echoCollectors) c(chunk);             /* agentWrite 回显窗口先收原始 chunk */
  appendRing(s, chunk);
  for(const f of frameChunks(chunk)) broadcast(s, { t: 'data', data: f });
  s.lastActivityAt = Date.now();                          /* 有效输出刷新 idle 计时 */
  if(!s.closed) armIdle(s);
  log.debug({ sessionId: s.sessionId, bytes: byteLen(chunk) }, 'pty 输出');
}

function onExit(s: PtySession, e: { exitCode: number; signal?: number }): void {
  s.exitCode = e.exitCode ?? null;
  s.exited = true;
  for(const w of s.exitWaiters.splice(0)) w();
  void closePtySession(s, 'exit');                        /* 第六迁移：自然退出 → closed */
}

/* ---------- 创建（spawn 失败不留半开态，应答 500 语义由 routes 转译） ---------- */
export function createPtySession(): { ok: true; sessionId: string } | { ok: false; error: string } {
  const sessionId = crypto.randomUUID();
  const cwd = path.join(SANDBOX_ROOT, 'pty', sessionId);
  try{ mkdirSync(cwd, { recursive: true }); }             /* 惰性建目录（ensureSandbox 同语义） */
  catch(e){ return { ok: false, error: String((e as Error).message || e) }; }
  const s: PtySession = {
    sessionId, spawnAttempted: true, closed: false,
    createdAt: Date.now(), lastActivityAt: Date.now(),
    ring: [], ringBytes: 0, subscribers: new Set(), echoCollectors: [],
    agentInFlight: false, proc: null, pid: null,
    exitCode: null, exited: false, exitWaiters: [],
    idleTimer: null, maxTimer: null,
  };
  ptyById[sessionId] = s;                                 /* 先注册：任何路径的收尾都能找到它 */
  const shell = process.platform === 'win32' ? (process.env.COMSPEC ?? 'cmd.exe') : (process.env.SHELL ?? '/bin/sh');
  try{
    s.proc = ptySpawn(shell, [], {
      name: 'af-pty-' + sessionId.slice(0, 8),
      cols: 80, rows: 24, cwd, env: process.env as Record<string, string>,
    });
  }catch(e){
    void closePtySession(s, 'exit');                      /* spawn 失败走收尾（防半开态） */
    return { ok: false, error: String((e as Error).message || e) };
  }
  s.pid = s.proc.pid;
  s.proc.onData(chunk => onData(s, chunk));
  s.proc.onExit(e => onExit(s, e));
  armIdle(s);
  s.maxTimer = setTimeout(()=>{ void closePtySession(s, 'max-duration'); },
    Math.max(0, s.createdAt + config.ptyMaxSessionMs - Date.now()));
  recordPtyAudit({ sessionId, origin: 'system', kind: 'create', summary: `会话创建（shell=${path.basename(shell)}）`, pid: s.pid });
  log.info({ sessionId, pid: s.pid, cwd }, 'PTY 会话创建');
  return { ok: true, sessionId };
}

/* ---------- 列表 / 判活 / 停止 ---------- */
export function listPtySessions(): { id: string; createdAt: number; lastActivityAt: number }[] {
  return Object.values(ptyById)
    .map(s => ({ id: s.sessionId, createdAt: s.createdAt, lastActivityAt: s.lastActivityAt }))
    .sort((a, b) => b.createdAt - a.createdAt);           /* 创建时间倒序 */
}

export function ptySessionActive(id: string): boolean { return !!ptyById[id]; }

export function stopPtySession(id: string): boolean {
  const s = ptyById[id];
  if(!s) return false;                                    /* 404 语义：不区分不存在与已关闭 */
  void closePtySession(s, 'stop');
  return true;
}

/* ---------- 用户写入（HTTP 通道；校验序在 routes，本函数只做副作用面） ---------- */
export function userWrite(id: string, data: string): { ok: true; danger: boolean } | { ok: false; status: 404 } {
  const s = ptyById[id];
  if(!s) return { ok: false, status: 404 };
  const danger = writeWithScan(s, data, 'user');
  return { ok: true, danger };
}

/* 双源共径写入：危险模式扫描（仅警示不拦截，ADR-0014 §3.3-a）→ warn 帧 →
 * proc.write → 刷新 idle → 审计（node-pty 写入天然串行：单线程事件循环 +
 * 同步 write，无 interleaving 窗口，sessions.ts:66-77 同款论证）。 */
function writeWithScan(s: PtySession, data: string, origin: 'user' | 'agent'): boolean {
  const hit = scanDangerous(data);
  if(hit){
    broadcast(s, { t: 'warn', msg: `危险命令警示（不拦截）：${hit}`, origin });
    log.warn({ sessionId: s.sessionId, origin, pattern: hit }, 'PTY 危险模式命中（仅警示+审计，不拦截）');
  }
  s.proc?.write(data);
  s.lastActivityAt = Date.now();
  if(!s.closed) armIdle(s);
  recordPtyAudit({ sessionId: s.sessionId, origin, kind: 'write', summary: data, danger: !!hit });
  return !!hit;
}

/* ---------- agent 注入唯一入口（origin='agent' 由本函数权威填写，外部不可伪造；
 *  HTTP write 端点不接受 agent 词形——防伪造机制 SPEC D4）。流程见 SPEC §3.4。 ---------- */
export async function agentWrite(sessionId: string, data: string,
  opts: { signal?: AbortSignal } = {}): Promise<{ ok: true; echo: string; danger: boolean } | { ok: false; status: 404 | 409 | 400 }> {
  const s = ptyById[sessionId];
  if(!s) return { ok: false, status: 404 };
  if(typeof data !== 'string' || !data || byteLen(data) > WRITE_MAX_BYTES) return { ok: false, status: 400 };
  if(s.agentInFlight) return { ok: false, status: 409 };  /* 同会话至多一个进行中注入（ADR-0014 §4.2） */
  s.agentInFlight = true;
  try{
    const danger = writeWithScan(s, data, 'agent');
    const echo = await new Promise<string>(resolve=>{
      let acc = '';
      const onChunk = (chunk: string)=>{ acc += chunk; };
      s.echoCollectors.push(onChunk);
      const done = ()=>{
        const i = s.echoCollectors.indexOf(onChunk);
        if(i >= 0) s.echoCollectors.splice(i, 1);
        resolve(acc);
      };
      const t = setTimeout(done, AGENT_ECHO_MS);
      opts.signal?.addEventListener('abort', ()=>{ clearTimeout(t); done(); }, { once: true });
    });
    return { ok: true, echo, danger };
  }finally{
    s.agentInFlight = false;
  }
}

/* ---------- SSE 流接入（routes 消费；注册表不出本模块） ---------- */
export interface PtyStreamHandle {
  replay: string[];            /* 建流时环形缓冲快照（按序） */
  replayBytes: number;
  subscribe(res: Response): boolean;   /* false = 建流间隙会话已关闭（由 route 补发 exit 帧） */
  unsubscribe(res: Response): void;
}

export function ptyStreamAttach(id: string): PtyStreamHandle | null {
  const s = ptyById[id];
  if(!s) return null;
  return {
    replay: [...s.ring],
    replayBytes: s.ringBytes,
    subscribe(res){
      if(s.closed || s.proc === null) return false;
      s.subscribers.add(res);
      return true;
    },
    unsubscribe(res){ s.subscribers.delete(res); },
  };
}

/* ---------- 优雅停机协作出口（server.ts 调用；sessions.ts:167-176 同型） ---------- */
export function abortActivePtySessions(): number {
  let n = 0;
  for(const id of Object.keys(ptyById)){
    try{ void closePtySession(ptyById[id]!, 'shutdown'); n++; }catch{ /* 已结束 */ }
  }
  return n;
}
export function activePtyCount(): number {
  return Object.keys(ptyById).length;
}

/* ---------- 启动扫尾（SPEC D8 审计对账式；sweepDanglingRuns store.ts 同型）：
 * 对「有 create 行、无终局行」的会话补 close(sweep-stale) 行。孤儿进程检测/
 * 击杀 v1 不实现（跨重启按 PID 击杀存在 PID 复用错杀风险，不制造伪安全）；
 * 无孤儿主保障 = 优雅停机 kill+wait 双确认，崩溃场景孤儿为 ADR-0014 §2.2 已声明残余。 ---------- */
export function sweepStalePtySessions(): { count: number; ids: string[] } {
  const ids = listOpenPtySessionIds();
  for(const id of ids){
    recordPtyAudit({ sessionId: id, origin: 'system', kind: 'close', summary: '启动扫尾：遗留开放会话记录标记关闭', reason: 'sweep-stale' });
  }
  return { count: ids.length, ids };
}
