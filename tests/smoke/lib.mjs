/* ================================================================
 * lib.mjs — smoke:server 基础设施层（迭代 0002 / BK-0002 · SPEC §2）
 * 只提供机制，不含业务断言：
 *   preflight / getFreePort / startServer / api / openSse / waitFor
 *   + 断言工具 Checker（ok/eq/deepEq/includes，PASS/FAIL 计数，fail-fast）。
 * 边界规则（SPEC §2 硬性）：触达被测系统仅两条通道——/api/v1/* HTTP 契约
 * 与构建产物存在性检查；不 import 任何产品代码；不读写 data/agentflow.db。
 * SSE 帧解析与 apps/server/src/util.ts:14-22 的写出格式互逆：
 * 事件帧 `data: <json>\n\n`，注释帧 `: ping\n\n`（跳过）。
 * ================================================================ */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* 构建产物前置要求（SPEC §6 P01/P02；缺失时的指引对应 server.ts:52-56 fatal 语义） */
export const DIST_REQUIREMENTS = [
  { id: 'P01', file: 'apps/web/dist/index.html', buildCmd: 'npm run build' },
  { id: 'P02', file: 'apps/server/dist/server.js', buildCmd: 'npm run build:server' },
];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 前置校验（SPEC §5.1） ---------- */
export function preflight() {
  return DIST_REQUIREMENTS.map((d) => {
    const abs = path.join(REPO_ROOT, d.file);
    return { ...d, abs, exists: existsSync(abs) };
  });
}

/* ---------- 空闲端口（SPEC §5.2：listen(0) 取端口后关闭） ---------- */
export function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/* ---------- 子进程日志环形缓冲（末 maxLines 行；持续排水防写阻塞，SPEC §5.3） ---------- */
function ringLog(maxLines) {
  const lines = [];
  return {
    push(chunk) {
      for (const l of String(chunk).split(/\r?\n/)) {
        if (l === '') continue;
        lines.push(l);
        if (lines.length > maxLines) lines.shift();
      }
    },
    tail(n = maxLines) { return lines.slice(-n).join('\n'); },
  };
}

/* ---------- 起真实 server 子进程 + 健康等待（SPEC §5.3-5.4）
 * process.execPath + shell:false：Windows 不经 cmd 包装，kill 直达 node 进程；
 * env PORT 传入子进程（config.ts:17-24 .env 不覆盖已有环境变量 → 优先级正确）；
 * 健康：250ms 轮询 /api/v1/health（server.ts:64-66），200 且 ok===true 即就绪；
 * 子进程提前退出或超时 → 抛错并附 logTail（FAIL 时打印，SPEC §8）。 ---------- */
export async function startServer(port, timeoutMs = 20000) {
  const entry = path.join(REPO_ROOT, 'apps', 'server', 'dist', 'server.js');
  const child = spawn(process.execPath, [entry], {
    cwd: path.join(REPO_ROOT, 'apps', 'server'),
    env: { ...process.env, PORT: String(port) },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const log = ringLog(200);
  child.stdout.setEncoding('utf8'); child.stdout.on('data', log.push);
  child.stderr.setEncoding('utf8'); child.stderr.on('data', log.push);
  const exitPromise = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
  let exitInfo = null;
  void exitPromise.then((info) => { exitInfo = info; });
  const base = `http://127.0.0.1:${port}`;
  const boom = (msg) => { const e = new Error(msg); e.logTail = log.tail(); return e; };
  const t0 = Date.now();
  for (;;) {
    if (exitInfo) throw boom(`server 子进程提前退出（code=${exitInfo.code} signal=${exitInfo.signal}）`);
    try {
      const r = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
      if (r.status === 200) {
        const json = await r.json().catch(() => null);
        if (json && json.ok === true) {
          return { child, base, log, exitPromise, health: { status: r.status, json } };
        }
      }
    } catch { /* 未就绪，继续轮询 */ }
    if (Date.now() - t0 > timeoutMs) {
      /* 超时也必须杀掉存活子进程（REQ-0002-02：成败皆然终止、释放端口） */
      try { child.kill('SIGKILL'); } catch { /* 已退出 */ }
      throw boom(`健康等待超时（${timeoutMs}ms）`);
    }
    await sleep(250);
  }
}

/* ---------- fetch JSON 封装（SPEC §2 api()；默认 15s 超时） ---------- */
export async function api(base, method, urlPath, body, timeoutMs = 15000) {
  const opt = { method, signal: AbortSignal.timeout(timeoutMs), headers: {} };
  if (body !== undefined) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(`${base}${urlPath}`, opt);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON 体 */ }
  return { status: res.status, json, text, method, url: urlPath };
}

/* FAIL 行的 ctx 摘要（SPEC §8：METHOD url → status + 响应体摘要） */
export const ctxOf = (r) => (r ? `${r.method} ${r.url} → ${r.status} ${String(r.text).slice(0, 200)}` : '-');

/* ---------- SSE 流式消费（SPEC §2 openSse）：POST /api/v1/run ----------
 * 按 \n\n 分帧、取 `data: ` 行 JSON.parse、跳过 `:` 注释行；
 * 事件推入累积数组并唤醒等待者；waitEnd 等流收束（reader done）。 ---------- */
export async function openSse(base, body, timeoutMs = 60000) {
  const res = await fetch(`${base}/api/v1/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status !== 200) throw new Error(`POST /api/v1/run 意外状态 ${res.status}`);
  const events = [];
  const waiters = new Set();
  let ended = false;
  let endErr = null;
  let endResolve;
  const endPromise = new Promise((r) => { endResolve = r; });
  const wake = () => { for (const w of [...waiters]) w(); waiters.clear(); };
  void (async () => {
    try {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          for (const line of frame.split('\n')) {
            if (!line.startsWith('data: ')) continue;   /* `: ping` 等注释行跳过 */
            try { events.push(JSON.parse(line.slice(6))); } catch { /* 非法帧忽略 */ }
          }
        }
      }
    } catch (e) { endErr = e; }
    ended = true;
    wake();
    endResolve();
  })();
  return {
    events,
    /* 等待首个满足 predicate 的事件（事件到达即唤醒；250ms 兜底轮询 + 超时） */
    async waitFor(predicate, timeoutMs2) {
      const t0 = Date.now();
      for (;;) {
        const hit = events.find(predicate);
        if (hit) return hit;
        if (ended) throw endErr ?? new Error('SSE 流已收束，未等到期望事件');
        if (Date.now() - t0 > timeoutMs2) throw new Error(`SSE 等待超时（${timeoutMs2}ms，已收 ${events.length} 事件）`);
        await new Promise((resolve) => {
          const w = () => { clearTimeout(timer); waiters.delete(w); resolve(); };
          const timer = setTimeout(() => { waiters.delete(w); resolve(); }, 250);
          waiters.add(w);
        });
      }
    },
    /* 流收束等待：正常 done → true；异常 → 抛 endErr；超时 → false */
    async waitEnd(ms = 10000) {
      const ok = await Promise.race([endPromise.then(() => true), sleep(ms).then(() => false)]);
      if (ok && endErr) throw endErr;
      return ok;
    },
  };
}

/* ---------- 通用等待（SPEC §2 waitFor） ---------- */
export async function waitFor(predicate, timeoutMs, label = '条件', intervalMs = 100) {
  const t0 = Date.now();
  for (;;) {
    if (predicate()) return;
    if (Date.now() - t0 > timeoutMs) throw new Error(`waitFor 超时（${timeoutMs}ms）：${label}`);
    await sleep(intervalMs);
  }
}

/* ---------- 深相等（键序无关；W04/R03 用） ---------- */
export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}

/* ---------- 断言工具（SPEC §2：ok/eq/deepEq/includes + PASS/FAIL 计数） ----------
 * ok() 失败抛 SmokeFailError（fail-fast，SPEC §8）；check() 只记录不抛
 * （finally 清理用：尽力而为 + 如实报告）。 ---------- */
export class SmokeFailError extends Error {
  constructor(id) { super(`断言失败：${id}`); this.name = 'SmokeFailError'; this.assertId = id; }
}
const fmt = (v) => (typeof v === 'string' ? v : JSON.stringify(v) ?? String(v));
export class Checker {
  constructor() { this.passed = 0; this.failed = 0; }
  pass(id, name) { this.passed += 1; console.log(`PASS ${id} ${name}`); }
  fail(id, name, info = {}) {
    this.failed += 1;
    console.log(`FAIL ${id} ${name} | expected: ${fmt(info.expected ?? true)} | actual: ${fmt(info.actual ?? false)} | ctx: ${info.ctx ?? '-'}`);
  }
  check(cond, id, name, info = {}) {
    if (cond) this.pass(id, name); else this.fail(id, name, info);
    return cond;
  }
  ok(cond, id, name, info = {}) {
    if (cond) { this.pass(id, name); return true; }
    this.fail(id, name, info);
    throw new SmokeFailError(id);
  }
  eq(actual, expected, id, name, ctx) {
    this.ok(Object.is(actual, expected), id, name, { expected, actual, ctx });
  }
  deepEq(actual, expected, id, name, ctx) {
    this.ok(deepEqual(actual, expected), id, name, { expected: '深相等', actual: '不相等', ctx });
  }
  includes(list, predicate, expected, id, name, ctx) {
    const hit = Array.isArray(list) && list.some(predicate);
    this.ok(hit, id, name, { expected, actual: hit ? expected : '未找到', ctx });
  }
}
