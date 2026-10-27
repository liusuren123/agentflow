#!/usr/bin/env node
/* ================================================================
 *  pty-sessions.mjs — PTY 会话五端点独立冒烟（P 组 PY0-PY12）
 *  迭代 0055 / BK-0044 · SPEC §7：五端点契约 / 双源写入与防伪造 /
 *  危险仅警示 / 三闸门与状态机 / 停机级联（win32 模块级演练，SIGTERM
 *  真路径归 smoke:shutdown，CI ubuntu 权威——0012/0016 先例）/ 无孤儿
 *  （pid 探针，BK-0028 Win32_Process 先例 → 本文件用 process.kill(pid,0)
 *  等价探测）/ env fail-fast ×5。
 *  实例矩阵：主实例（PTY_ENABLED=0 显式压制）+ 探针 A/B/C/D（小数值 env
 *  覆盖，lib.mjs startServer(port,{env}) 注入）+ PY10 快速失败 spawn ×5；
 *  内部 API（agentWrite/abortActivePtySessions）= dist 直连（mcp-transport
 *  .mjs 先例）；审计核对 = auditsOf 只读直查共享 SQLite（V 组先例）。
 *  独立入口 npm run smoke:pty（SPEC D7）：不触碰 smoke-server.mjs，145
 *  断言基线零回退为结构性保证。fail-fast（首 FAIL 进 finally 清理）；
 *  汇总 `==== smoke:pty：X passed / Y failed ====`，退出码 failed===0?0:1。
 *  ================================================================ */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { Checker, SmokeFailError, api, getFreePort, preflight, sleep, startServer, waitFor, REPO_ROOT } from './lib.mjs';

const c = new Checker();
const DIST_PTY = path.join(REPO_ROOT, 'apps', 'server', 'dist', 'pty');
const SERVER_JS = path.join(REPO_ROOT, 'apps', 'server', 'dist', 'server.js');
const DB_FILE = path.join(REPO_ROOT, 'data', 'agentflow.db');
const PTY_ROOT = path.join(REPO_ROOT, 'apps', 'server', 'sandbox', 'pty');
const ENV_ON = { PTY_ENABLED: '1', PTY_IDLE_TIMEOUT_MS: '600000', PTY_MAX_SESSION_MS: '600000', PTY_MAX_SESSIONS: '4' };
const children = [];
let inProc = null;   /* dist 直连模块句柄（PY3 起惰性加载） */

/* ---------- 审计只读直查（V 组 auditsOf 先例；表未建视 0 行） ---------- */
function auditsOf(sessionId) {
  if (!existsSync(DB_FILE)) return [];
  const db = new Database(DB_FILE, { readonly: true, fileMustExist: true });
  try {
    return db.prepare('SELECT * FROM pty_audits WHERE session_id = ? ORDER BY id').all(sessionId);
  } finally { db.close(); }
}
function auditCount() {
  if (!existsSync(DB_FILE)) return 0;
  const db = new Database(DB_FILE, { readonly: true, fileMustExist: true });
  try { return db.prepare('SELECT COUNT(*) AS n FROM pty_audits').get().n; }
  catch { return 0; } finally { try { db.close(); } catch { } }
}
function createsSince(t0) {
  if (!existsSync(DB_FILE)) return [];
  const db = new Database(DB_FILE, { readonly: true, fileMustExist: true });
  try { return db.prepare("SELECT session_id, pid FROM pty_audits WHERE kind = 'create' AND created_at >= ?").all(t0); }
  finally { db.close(); }
}
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

/* 异步谓词轮询（lib.mjs waitFor 是同步谓词——async 谓词恒 truthy 假通过，不可用） */
async function waitForAsync(fn, ms, label) {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return;
    if (Date.now() - t0 > ms) throw new Error(`waitForAsync 超时（${ms}ms）：${label}`);
    await sleep(150);
  }
}

/* ---------- GET SSE 流消费（lib.mjs openSse 的 GET 版，帧解析互逆） ---------- */
async function openPtyStream(base, id, timeoutMs = 30000) {
  const res = await fetch(`${base}/api/v1/pty/sessions/${id}/stream`, { signal: AbortSignal.timeout(timeoutMs) });
  if (res.status !== 200) throw new Error(`stream 意外状态 ${res.status}`);
  const events = []; const waiters = new Set();
  let ended = false; let endResolve;
  const endPromise = new Promise((r) => { endResolve = r; });
  const wake = () => { for (const w of [...waiters]) w(); waiters.clear(); };
  void (async () => {
    try {
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          for (const line of buf.slice(0, i).split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try { events.push(JSON.parse(line.slice(6))); } catch { /* 非法帧忽略 */ }
          }
          buf = buf.slice(i + 2);
        }
      }
    } catch { /* 流中断 */ }
    ended = true; wake(); endResolve();
  })();
  return {
    events,
    async waitFor(pred, ms) {
      const t0 = Date.now();
      for (;;) {
        const hit = events.find(pred);
        if (hit) return hit;
        if (ended) throw new Error('stream 已收束，未等到期望帧');
        if (Date.now() - t0 > ms) throw new Error(`stream 等待超时（${ms}ms，已收 ${events.length} 帧）`);
        await new Promise((resolve) => {
          const w = () => { clearTimeout(timer); waiters.delete(w); resolve(); };
          const timer = setTimeout(() => { waiters.delete(w); resolve(); }, 200);
          waiters.add(w);
        });
      }
    },
    async close() { try { await res.body.cancel(); } catch { } },
  };
}

/* ---------- env fail-fast 探针（PY10）：spawn → 期望 exit≠0 且输出指明变量名 ---------- */
function spawnEnvFail(port, env, needle, id, name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SERVER_JS], {
      cwd: path.join(REPO_ROOT, 'apps', 'server'),
      env: { ...process.env, PORT: String(port), ...ENV_ON, ...env }, shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    children.push(child);
    let out = '';
    child.stdout.setEncoding('utf8'); child.stdout.on('data', (d) => { out += d; });
    child.stderr.setEncoding('utf8'); child.stderr.on('data', (d) => { out += d; });
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { } }, 15000);
    child.once('exit', (code) => {
      clearTimeout(timer);
      c.check(code !== 0, id, `${name}（exit≠0）`, { expected: '非 0', actual: code });
      c.check(out.includes(needle), `${id}b`, `${name}（指明变量名）`, { expected: needle, actual: out.slice(-260) });
      resolve();
    });
  });
}

/* ---------- 探针实例收尾：逐会话 stop（close 路径收尸 PTY）→ SIGKILL 兜底 ---------- */
async function killServer(srv) {
  if (!srv) return;
  try {
    const l = await api(srv.base, 'GET', '/api/v1/pty/sessions');
    for (const s of (l.json && l.json.sessions) || []) {
      try { await api(srv.base, 'POST', `/api/v1/pty/sessions/${s.id}/stop`, {}); } catch { /* 已关 */ }
    }
    /* 必须等 close 收尾（kill+wait ≤2s）完成、注册表清空后才准 SIGKILL，
       否则服务器中途死 → 无终局审计行 + PTY 子进程孤儿化（首轮实发） */
    await waitForAsync(async () => api(srv.base, 'GET', '/api/v1/pty/sessions')
      .then((r) => (r.json && r.json.sessions ? r.json.sessions.length === 0 : true))
      .catch(() => true), 5000, 'pty 探针会话收束');
  } catch { /* server 已死或无会话 */ }
  try { srv.child.kill('SIGKILL'); } catch { /* 已退出 */ }
  await srv.exitPromise.catch(() => { });
}

async function main() {
  /* PY0：构建产物在位（preflight P01/P02 + dist/pty 四文件） */
  const pre = preflight();
  c.check(pre.every((d) => d.exists), 'PY0', '构建产物在位（web+server dist）', { expected: 'P01/P02 存在', actual: pre.map((d) => `${d.id}:${d.exists}`).join(' ') });
  const ptyFiles = ['session.js', 'routes.js', 'audit.js', 'danger.js'].map((f) => path.join(DIST_PTY, f));
  c.ok(ptyFiles.every(existsSync), 'PY0b', 'dist/pty/*.js 在位', { expected: '先在仓库根执行 npm run build:server', actual: `缺失：${ptyFiles.filter((p) => !existsSync(p)).join(',')}` });

  const t0 = Date.now();

  /* PY1：默认禁用（主实例 PTY_ENABLED=0 显式压制 dev .env） */
  const portMain = await getFreePort();
  const mainSrv = await startServer(portMain, { env: { PTY_ENABLED: '0' } });
  children.push(mainSrv.child);
  const nBefore = auditCount();
  const r503 = await api(mainSrv.base, 'POST', '/api/v1/pty/sessions', {});
  c.eq(r503.status, 503, 'PY1', '未启用 create → 503', ctxOf503(r503));
  c.ok(/未启用/.test(r503.json && r503.json.error || ''), 'PY1b', '503 文案含「未启用」', { expected: '未启用', actual: r503.json });
  const rList0 = await api(mainSrv.base, 'GET', '/api/v1/pty/sessions');
  c.ok(rList0.status === 200 && Array.isArray(rList0.json.sessions) && rList0.json.sessions.length === 0, 'PY1c', '未启用 list → 200 空集');
  c.eq(auditCount(), nBefore, 'PY1d', '拒绝路径零审计行');
  await killServer(mainSrv);

  /* PY2-PY6：探针 A（PTY_ENABLED=1，默认闸门） */
  const portA = await getFreePort();
  const A = await startServer(portA, { env: ENV_ON });
  children.push(A.child);
  const rCreate = await api(A.base, 'POST', '/api/v1/pty/sessions', {});
  c.eq(rCreate.status, 201, 'PY2', 'create → 201');
  const sid = rCreate.json && rCreate.json.sessionId;
  c.ok(!!sid && typeof sid === 'string', 'PY2b', '应答含 sessionId');
  c.ok(existsSync(path.join(PTY_ROOT, sid || 'x')), 'PY2c', '会话目录 sandbox/pty/<id>/ 建立');
  await waitFor(() => auditsOf(sid || '').some((r) => r.kind === 'create'), 3000, 'create 审计行');
  const aCreate = auditsOf(sid).find((r) => r.kind === 'create');
  c.ok(aCreate && aCreate.origin === 'system' && Number.isInteger(aCreate.pid) && aCreate.pid > 0, 'PY2d', '审计 create 行（origin=system，pid 数值在）');
  const rListA = await api(A.base, 'GET', '/api/v1/pty/sessions');
  c.ok(rListA.json.sessions.some((s) => s.id === sid), 'PY2e', 'list 含该会话');

  /* PY3：流回放 + 双源写入（HTTP user + dist 直连 agent） */
  const stream = await openPtyStream(A.base, sid);
  await stream.waitFor((e) => e.t === 'ready', 5000);
  c.pass('PY3', 'stream 建流收 ready 帧');
  const rWrite = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/write`, { data: 'echo hi\r', origin: 'user' });
  c.eq(rWrite.status, 200, 'PY3b', 'user write → 200', ctxOf503(rWrite));
  await stream.waitFor((e) => e.t === 'data' && String(e.data).includes('hi'), 8000);
  c.pass('PY3c', 'data 帧按序回放含 hi');
  await waitFor(() => auditsOf(sid).some((r) => r.kind === 'write' && r.origin === 'user'), 3000, 'user write 审计行');
  c.pass('PY3d', '审计 write 行 origin=user');
  process.env.PTY_IDLE_TIMEOUT_MS = '600000'; process.env.PTY_MAX_SESSION_MS = '3600000'; process.env.PTY_MAX_SESSIONS = '4';
  inProc = await Promise.all([
    import(pathToFileURL(path.join(DIST_PTY, 'session.js')).href),
    import(pathToFileURL(path.join(DIST_PTY, 'audit.js')).href),
  ]).then(([s, a]) => { a.initPtyAuditStore(); return { session: s, audit: a }; });
  const mk = inProc.session.createPtySession();
  c.ok(mk.ok, 'PY3e', 'dist 直连建会话（agent 注入载体）');
  const ag = await inProc.session.agentWrite(mk.sessionId, 'echo agent-hello\r');
  c.ok(ag.ok && ag.echo.includes('agent-hello'), 'PY3f', 'agentWrite → ok 且 echo 含回声', { expected: 'agent-hello', actual: ag.ok ? ag.echo.slice(-120) : ag });
  await waitFor(() => auditsOf(mk.sessionId).some((r) => r.kind === 'write' && r.origin === 'agent'), 3000, 'agent write 审计行');
  c.pass('PY3g', '审计 write 行 origin=agent');

  /* PY4：入参反例 + 防伪造 403 + agent 并发 409 + 载荷超限 */
  const rMiss = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/write`, { data: 'x' });
  c.eq(rMiss.status, 400, 'PY4', 'origin 缺省 → 400');
  const rBob = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/write`, { data: 'x', origin: 'bob' });
  c.eq(rBob.status, 400, 'PY4b', 'origin 非法词形 → 400');
  const rAgent = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/write`, { data: 'echo x\r', origin: 'agent' });
  c.eq(rAgent.status, 403, 'PY4c', 'HTTP origin=agent → 403（防伪造反例）', ctxOf503(rAgent));
  await waitFor(() => auditsOf(sid).some((r) => r.kind === 'write-blocked' && r.origin === 'agent'), 3000, 'write-blocked 审计行');
  c.pass('PY4d', '审计 write-blocked 行（origin=agent 如实）');
  const [ag1, ag2] = await Promise.all([
    inProc.session.agentWrite(mk.sessionId, 'echo one\r'),
    inProc.session.agentWrite(mk.sessionId, 'echo two\r'),
  ]);
  c.ok(!!(ag1.ok && !ag2.ok && ag2.status === 409) || !!(ag2.ok && !ag1.ok && ag1.status === 409), 'PY4e', '并发 agentWrite 第二发 → 409', { expected: '一 ok 一 409', actual: `${JSON.stringify(ag1.ok)} ${JSON.stringify(ag2.status)}` });
  const rBig = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/write`, { data: 'a'.repeat(17000), origin: 'user' });
  c.eq(rBig.status, 400, 'PY4f', 'data >16KiB → 400');

  /* PY5：危险模式仅警示不拦截（AC4） */
  const rDanger = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/write`, { data: 'rm -rf ./x\r', origin: 'user' });
  c.ok(rDanger.status === 200 && rDanger.json && rDanger.json.danger === true, 'PY5', '危险写入 200 danger=true（不拦截）', { expected: '200 danger:true', actual: rDanger.json });
  await stream.waitFor((e) => e.t === 'warn', 5000);
  c.pass('PY5b', 'warn 帧到达');
  await waitFor(() => auditsOf(sid).some((r) => r.kind === 'write' && r.danger === 1), 3000, 'danger 审计位');
  c.pass('PY5c', '审计行 danger=1');
  await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/write`, { data: 'echo after\r', origin: 'user' });
  await stream.waitFor((e) => e.t === 'data' && String(e.data).includes('after'), 8000);
  c.pass('PY5d', '透传：后续输出帧仍推进');

  /* PY6：显式停止 + 幂等 + 未知 404 + pid 收尸 */
  const pidA = aCreate && aCreate.pid;
  const rStop = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/stop`, {});
  c.eq(rStop.status, 200, 'PY6', 'stop → 200');
  const exitFrame = await stream.waitFor((e) => e.t === 'exit', 6000);
  c.ok(exitFrame.reason === 'stop', 'PY6b', '流收 exit 帧（reason=stop）', { expected: 'stop', actual: exitFrame.reason });
  const rStop2 = await api(A.base, 'POST', `/api/v1/pty/sessions/${sid}/stop`, {});
  c.eq(rStop2.status, 404, 'PY6c', '重复 stop → 404');
  const rW404 = await api(A.base, 'POST', '/api/v1/pty/sessions/00000000-0000-0000-0000-000000000000/write', { data: 'x', origin: 'user' });
  const rS404 = await api(A.base, 'POST', '/api/v1/pty/sessions/00000000-0000-0000-0000-000000000000/stop', {});
  const rSt404 = await fetch(`${A.base}/api/v1/pty/sessions/00000000-0000-0000-0000-000000000000/stream`).then((r) => r.status);
  c.ok(rW404.status === 404 && rS404.status === 404 && rSt404 === 404, 'PY6d', '未知 id 三端点 → 404', { expected: '404/404/404', actual: `${rW404.status}/${rS404.status}/${rSt404}` });
  await waitFor(() => !pidAlive(pidA), 5000, '探针 A 会话 pid 消亡');
  c.pass('PY6e', 'pid 已收尸（kill+wait 双确认）');
  await stream.close();
  await killServer(A);

  /* PY7：idle 超时（探针 B：IDLE=1000） */
  const portB = await getFreePort();
  const B = await startServer(portB, { env: { ...ENV_ON, PTY_IDLE_TIMEOUT_MS: '1000', PTY_MAX_SESSION_MS: '3600000' } });
  children.push(B.child);
  const rb = await api(B.base, 'POST', '/api/v1/pty/sessions', {});
  const sidB = rb.json && rb.json.sessionId;
  const streamB = await openPtyStream(B.base, sidB);
  await streamB.waitFor((e) => e.t === 'ready', 5000);
  const exitB = await streamB.waitFor((e) => e.t === 'exit', 6000);
  c.ok(exitB.reason === 'idle', 'PY7', '静置超 idle → exit 帧 reason=idle', { expected: 'idle', actual: exitB.reason });
  await waitFor(() => auditsOf(sidB).some((r) => r.kind === 'timeout' && r.reason === 'idle'), 3000, 'idle 审计行');
  c.ok(auditsOf(sidB).some((r) => r.kind === 'timeout' && r.reason === 'idle'), 'PY7b', '审计 kind=timeout reason=idle');
  await waitForAsync(async () => (await api(B.base, 'GET', '/api/v1/pty/sessions')).json.sessions.length === 0, 4000, 'B list 空');
  c.pass('PY7c', 'list 收敛空集');
  await streamB.close();
  await killServer(B);

  /* PY8：max 硬顶先于被 keep-alive 续命的 idle 兑现（探针 C：IDLE=1500 MAX=2000
   * + 每 400ms 写续命——SPEC §7 字面组 IDLE=60000>MAX=2000 与 §6.2 交叉校验
   * （MAX<IDLE 须 fail-fast，PY10e 同款）自相矛盾，改取最近合法对，断言语义不变） */
  const portC = await getFreePort();
  const C = await startServer(portC, { env: { ...ENV_ON, PTY_IDLE_TIMEOUT_MS: '1500', PTY_MAX_SESSION_MS: '2000' } });
  children.push(C.child);
  const rc = await api(C.base, 'POST', '/api/v1/pty/sessions', {});
  const sidC = rc.json && rc.json.sessionId;
  const streamC = await openPtyStream(C.base, sidC);
  await streamC.waitFor((e) => e.t === 'ready', 5000);
  for (let i = 0; i < 8; i++) {
    await sleep(400);
    try { await api(C.base, 'POST', `/api/v1/pty/sessions/${sidC}/write`, { data: '\r', origin: 'user' }); } catch { /* 已关 */ }
  }
  const exitC = await streamC.waitFor((e) => e.t === 'exit', 6000);
  c.ok(exitC.reason === 'max-duration', 'PY8', 'keep-alive 下 max 硬顶先兑现（reason=max-duration）', { expected: 'max-duration', actual: exitC.reason });
  c.ok(auditsOf(sidC).some((r) => r.kind === 'timeout' && r.reason === 'max-duration'), 'PY8b', '审计 kind=timeout reason=max-duration');
  await streamC.close();
  await killServer(C);

  /* PY9：会话数上限（探针 D：MAX_SESSIONS=1） */
  const portD = await getFreePort();
  const D = await startServer(portD, { env: { ...ENV_ON, PTY_MAX_SESSIONS: '1' } });
  children.push(D.child);
  const rd1 = await api(D.base, 'POST', '/api/v1/pty/sessions', {});
  c.eq(rd1.status, 201, 'PY9', '首会话 create → 201');
  const rd2 = await api(D.base, 'POST', '/api/v1/pty/sessions', {});
  c.eq(rd2.status, 429, 'PY9b', '满员 create → 429', ctxOf503(rd2));
  await killServer(D);

  /* PY10：env fail-fast ×5（非法值启动即拒，输出指明变量名） */
  const p10 = await getFreePort();
  await spawnEnvFail(p10, { PTY_IDLE_TIMEOUT_MS: '500' }, 'PTY_IDLE_TIMEOUT_MS', 'PY10', 'IDLE=500 < 下限 1000');
  await spawnEnvFail(p10 + 1, { PTY_MAX_SESSIONS: '0' }, 'PTY_MAX_SESSIONS', 'PY10b', 'SESSIONS=0');
  await spawnEnvFail(p10 + 2, { PTY_MAX_SESSIONS: '17' }, 'PTY_MAX_SESSIONS', 'PY10c', 'SESSIONS=17');
  await spawnEnvFail(p10 + 3, { PTY_ENABLED: 'maybe' }, 'PTY_ENABLED', 'PY10d', 'ENABLED=maybe 非法词形');
  await spawnEnvFail(p10 + 4, { PTY_IDLE_TIMEOUT_MS: '2000', PTY_MAX_SESSION_MS: '1000' }, 'PTY_MAX_SESSION_MS', 'PY10e', 'MAX=1000 < IDLE=2000 交叉校验');

  /* PY11：停机级联模块级演练（win32 如实标注；SIGTERM 真路径归 smoke:shutdown） */
  const frames = [];
  const fakeRes = { write: (f) => { frames.push(f); return true; }, end: () => { } };
  const mk2 = inProc.session.createPtySession();
  const h2 = inProc.session.ptyStreamAttach(mk2.sessionId);
  c.ok(!!h2 && h2.subscribe(fakeRes), 'PY11', '模块级建会话并接入订阅者');
  const abortedN = inProc.session.abortActivePtySessions();
  c.ok(abortedN >= 1, 'PY11b', 'abortActivePtySessions 返回中止数 ≥1', { expected: '≥1', actual: abortedN });
  await waitFor(() => frames.some((f) => { try { return JSON.parse(f.slice(6).trim()).t === 'exit'; } catch { return false; } }), 5000, 'exit 帧广播');
  c.pass('PY11c', 'exit 帧广播至订阅者');
  c.ok(frames.some((f) => { try { return JSON.parse(f.slice(6).trim()).reason === 'shutdown'; } catch { return false; } }), 'PY11d', 'exit 帧 reason=shutdown');
  await waitFor(() => auditsOf(mk2.sessionId).some((r) => r.kind === 'close' && r.reason === 'shutdown'), 3000, 'shutdown 审计行');
  c.pass('PY11e', '审计 close 行 reason=shutdown');
  await waitFor(() => inProc.session.activePtyCount() === 0, 4000, '模块注册表清空');
  c.pass('PY11f', 'activePtyCount 收敛 0');

  /* PY12：本轮全部 create 行 pid 均已消亡（无孤儿） */
  const rows = createsSince(t0).filter((r) => Number.isInteger(r.pid) && r.pid > 0);
  await sleep(500);
  const orphans = rows.filter((r) => pidAlive(r.pid));
  c.ok(orphans.length === 0, 'PY12', `无孤儿 PTY 子进程（本轮 create ${rows.length} 例）`, { expected: '0 孤儿', actual: orphans.map((o) => `${o.session_id.slice(0, 8)}:${o.pid}`).join(',') });
}

const ctxOf503 = (r) => `${r.method} ${r.url} → ${r.status} ${String(r.text).slice(0, 160)}`;

async function cleanup() {
  try { if (inProc) { try { inProc.session.abortActivePtySessions(); } catch { } await sleep(300); inProc.audit.closePtyAuditStore(); } } catch { /* 尽力而为 */ }
  for (const ch of children) { try { ch.kill('SIGKILL'); } catch { /* 已退出 */ } }
  await sleep(300);
}

process.on('SIGINT', () => { void cleanup().finally(() => process.exit(130)); });
process.on('SIGBREAK', () => { void cleanup().finally(() => process.exit(130)); });

main()
  .catch((e) => {
    if (!(e instanceof SmokeFailError)) {
      c.fail('P-EX', '未预期异常', { expected: '-', actual: `${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e)}` });
    }
  })
  .finally(() => void cleanup())
  .finally(() => {
    console.log(`==== smoke:pty：${c.passed} passed / ${c.failed} failed ====`);
    process.exit(c.failed === 0 ? 0 : 1);
  });
