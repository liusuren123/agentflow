#!/usr/bin/env node
/* ================================================================
 *  shutdown-sigterm.mjs — SIGTERM 优雅停机三要素断言（迭代 0012 / BK-0025）
 *  一键入口：npm run smoke:shutdown（根 package.json scripts）。
 *  背景（PRD §背景 2 / 周报 W43 观察 O4）：Windows 跨进程信号走
 *  TerminateProcess，process.on('SIGTERM')（server.ts:233）不触发，
 *  ADR-0004 停机路径（server.ts:204-233）本机不可验证——本脚本在
 *  CI ubuntu-latest（ci.yml contracts job）作为权威断言环境：
 *    spawn apps/server/dist/server.js（注入独立 PORT=3901）
 *    → 轮询 /api/v1/health 就绪（≤10s）→ process.kill(SIGTERM) → 断言：
 *    T01 stdout（pino 默认流，BUILD 实测见 JOURNAL）先后含
 *        「优雅停机开始」（signal==='SIGTERM'）与「优雅停机完成」（:216/:228）
 *    T02 子进程退出码 === 0（process.exit(0)，server.ts:230）
 *    T03 退出后端口连接 ECONNREFUSED（server.close 摘除监听，server.ts:217）
 *    T04 空载（activeRuns=0）无「强制退出」warn（server.ts:226，附带断言）
 *  Windows（win32）：SKIP + 原因 + exit 0（REQ-0025-02 如实降级，不伪造通过）。
 *  卫生（REQ-0025-06）：整体硬超时 30s；结束前确保子进程终止
 *  （SIGTERM → 3s → SIGKILL，沿 smoke-server C04 时序）。
 *  边界（沿 lib.mjs §2）：只用 node 内建模块 + ./lib.mjs 断言工具；
 *  不 import 产品代码；不读写 data/agentflow.db。
 * ================================================================ */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Checker, SmokeFailError, sleep } from './lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVER_ENTRY = path.join(REPO_ROOT, 'apps', 'server', 'dist', 'server.js');
const WEB_INDEX = path.join(REPO_ROOT, 'apps', 'web', 'dist', 'index.html'); /* server 启动硬依赖（server.ts:52-56，缺失即 fatal exit 1） */
const PORT = 3901;                /* 独立端口（PRD REQ-0025-01 示例值；避开 3000 与并发心跳互踩） */
const HEALTH_TIMEOUT_MS = 10000;  /* 就绪上限 ~10s（PRD REQ-0025-01） */
const EXIT_TIMEOUT_MS = 10000;    /* 停机宽限 ≤5s（server.ts:221），10s 观察上限 */
const HARD_TIMEOUT_MS = 30000;    /* 整体硬超时（REQ-0025-06，防停机宽限回归挂死 CI） */

const C = new Checker();
let child = null;
let closePromise = null;
let hardTimer = null;

/* ---------- REQ-0025-02：Windows 如实降级（SKIP ≠ 伪造通过） ---------- */
if (process.platform === 'win32') {
  console.log('SKIP smoke:shutdown：Windows 跨进程信号模拟限制——SIGTERM 经 TerminateProcess 投递，');
  console.log('process.on("SIGTERM") 停机 handler 不触发（周报 W43 观察 O4），停机三要素本机不可断言。');
  console.log('权威断言路径：CI ubuntu-latest（.github/workflows/ci.yml contracts job 的 npm run smoke:shutdown）。');
  process.exit(0);
}

/* ---------- pino JSON 单行解析（stdout 全量累积后按行 parse；非 JSON 行忽略） ---------- */
function parseLogLines(text) {
  const records = [];
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try { records.push(JSON.parse(s)); } catch { /* 崩溃栈等非 JSON 行忽略 */ }
  }
  return records;
}

/* ---------- 端口拒绝探针（T03）：connect 只认 ECONNREFUSED，2s 上限防挂 ---------- */
function probeRefused(port) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r) => { if (settled) return; settled = true; clearTimeout(timer); sock.destroy(); resolve(r); };
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.on('connect', () => finish({ refused: false, code: 'CONNECTED（端口仍在监听）' }));
    sock.on('error', (e) => finish({ refused: e?.code === 'ECONNREFUSED', code: e?.code ?? String(e) }));
    const timer = setTimeout(() => finish({ refused: false, code: 'PROBE_TIMEOUT' }), 2000);
  });
}

/* ---------- 进程卫生（REQ-0025-06）：成败皆确保子进程终止、不留孤儿占端口 ---------- */
async function killChildForSure() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try { child.kill('SIGTERM'); } catch { /* 已退出 */ }
  const gone = await Promise.race([closePromise.then(() => true), sleep(3000).then(() => false)]);
  if (!gone) { try { child.kill('SIGKILL'); } catch { /* 已退出 */ } }
  await Promise.race([closePromise.then(() => true), sleep(1000).then(() => false)]);
}

/* ---------- 断言主体 ---------- */
async function main() {
  /* P 组：前置（缺产物 FAIL + 可操作报错，不静默跳过——先例 mcp-stubs.mjs M01） */
  C.ok(existsSync(SERVER_ENTRY), 'P01', 'apps/server/dist/server.js 在位（spawn 对象）',
    { expected: '存在', actual: '缺失（请先在仓库根执行 npm run build:server）', ctx: `file: ${SERVER_ENTRY}` });
  C.ok(existsSync(WEB_INDEX), 'P02', 'apps/web/dist/index.html 在位（server 启动硬依赖，server.ts:52-56 fatal）',
    { expected: '存在', actual: '缺失（请先在仓库根执行 npm run build）', ctx: `file: ${WEB_INDEX}` });

  /* H 组：起进程（process.execPath + shell:false，kill 直达 node 进程）+ 健康等待；
   * env PORT 注入（config.ts:17-24 .env 不覆盖已有键 → 优先级正确，沿 lib.mjs 先例） */
  child = spawn(process.execPath, [SERVER_ENTRY], {
    cwd: path.join(REPO_ROOT, 'apps', 'server'),
    env: { ...process.env, PORT: String(PORT) },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  closePromise = new Promise((resolve) => child.once('close', (code, signal) => resolve({ code, signal })));
  let closeInfo = null;
  void closePromise.then((info) => { closeInfo = info; });
  let stdoutText = '';
  let stderrText = '';
  child.stdout.setEncoding('utf8'); child.stdout.on('data', (c) => { stdoutText += c; });
  child.stderr.setEncoding('utf8'); child.stderr.on('data', (c) => { stderrText += c; });

  const base = `http://127.0.0.1:${PORT}`;
  const t0 = Date.now();
  let ready = false;
  while (!ready) {
    if (closeInfo) {
      C.fail('H01', 'GET /api/v1/health → 200 且 ok===true',
        { expected: '200 + ok:true', actual: `server 子进程提前退出（code=${closeInfo.code} signal=${closeInfo.signal}）`, ctx: `PORT=${PORT}` });
      if (stdoutText || stderrText) console.log(`---- server 输出尾（末 40 行）----\n${`${stdoutText}\n${stderrText}`.trim().split(/\r?\n/).slice(-40).join('\n')}`);
      throw new SmokeFailError('H01');
    }
    if (Date.now() - t0 > HEALTH_TIMEOUT_MS) {
      C.fail('H01', 'GET /api/v1/health → 200 且 ok===true',
        { expected: '200 + ok:true', actual: `健康等待超时（${HEALTH_TIMEOUT_MS}ms）`, ctx: `PORT=${PORT}` });
      throw new SmokeFailError('H01');
    }
    try {
      const r = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
      if (r.status === 200) {
        const j = await r.json().catch(() => null);
        if (j?.ok === true) ready = true;
      }
    } catch { /* 未就绪，继续轮询 */ }
    if (!ready) await sleep(250);
  }
  C.pass('H01', `GET /api/v1/health → 200 且 ok===true（PORT=${PORT} 就绪）`);

  /* T 组：SIGTERM → 停机三要素（以 close 事件 + 端口探针为门，不猜时序 sleep） */
  try { process.kill(child.pid, 'SIGTERM'); } catch { /* 已退出：交由下方断言如实 FAIL */ }
  const exitInfo = await Promise.race([
    closePromise,
    sleep(EXIT_TIMEOUT_MS).then(() => null),
  ]);

  const records = parseLogLines(stdoutText);
  const startIdx = records.findIndex((r) => r?.msg === '优雅停机开始');
  const doneIdx = records.findIndex((r) => r?.msg === '优雅停机完成');
  C.check(startIdx >= 0 && doneIdx > startIdx && records[startIdx]?.signal === 'SIGTERM',
    'T01', 'stdout 先后出现「优雅停机开始」（signal=SIGTERM）与「优雅停机完成」',
    { expected: "开始行序 < 完成行序 且 开始行 signal==='SIGTERM'",
      actual: `开始=${startIdx}（signal=${JSON.stringify(records[startIdx]?.signal)}）完成=${doneIdx}；stdout 共 ${records.length} 条 JSON 行`,
      ctx: 'pino 默认写 stdout（logger.ts:10 无 destination；BUILD 实测见 JOURNAL）' });
  C.check(exitInfo !== null && exitInfo.code === 0,
    'T02', '子进程退出码 === 0（process.exit(0)，server.ts:230）',
    { expected: 'code=0', actual: exitInfo === null ? `${EXIT_TIMEOUT_MS}ms 内未观察到退出` : `code=${exitInfo.code} signal=${exitInfo.signal}`, ctx: 'SIGTERM → close 事件' });
  const probe = await probeRefused(PORT);
  C.check(probe.refused,
    'T03', `退出后 127.0.0.1:${PORT} 连接被拒（ECONNREFUSED，监听已释放）`,
    { expected: 'ECONNREFUSED', actual: probe.code, ctx: 'net.connect 探针（server.close，server.ts:217）' });
  const forced = records.filter((r) => String(r?.msg ?? '').includes('强制退出'));
  C.check(forced.length === 0,
    'T04', '空载停机无「强制退出」warn 行（activeRuns=0；server.ts:226，附带断言）',
    { expected: '0 条', actual: `${forced.length} 条（开始行 activeRuns=${JSON.stringify(records[startIdx]?.activeRuns)}）`, ctx: 'PRD REQ-0025-01 附带断言' });
}

/* ---------- 运行器：硬超时 + finally 清理 + 汇总 + 退出码（沿 smoke-server §8 形态） ---------- */
process.on('SIGINT', () => {
  console.log('\n收到 SIGINT：执行清理后退出');
  void (async () => { await killChildForSure(); clearTimeout(hardTimer); process.exit(130); })();
});

hardTimer = setTimeout(() => {
  console.log('FAIL 硬超时（30s，REQ-0025-06）——SIGKILL 子进程后退出（停机宽限逻辑回归嫌疑）');
  try { if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); } catch { /* 已退出 */ }
  process.exit(1);
}, HARD_TIMEOUT_MS);

try {
  await main();
} catch (e) {
  if (e instanceof SmokeFailError) {
    console.log(`（fail-fast：断言 ${e.assertId} 失败，进入清理）`);
  } else {
    console.error(`ERROR 未预期的异常：${e?.stack ?? e}`);
  }
} finally {
  try { await killChildForSure(); } catch (e) { console.error(`ERROR 清理阶段异常：${e?.stack ?? e}`); }
  clearTimeout(hardTimer);
}
console.log(`==== smoke:shutdown：${C.passed} passed / ${C.failed} failed ====`);
process.exit(C.failed === 0 ? 0 : 1);
