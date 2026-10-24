#!/usr/bin/env node
/* ================================================================
 *  mcp-transport.mjs — BK-0028 真 MCP client 传输层独立冒烟（MT01-MT12）
 *  迭代 0023 · SPEC §5：双传输全链（Streamable HTTP 进程内 node:http mock
 *  + stdio node 子进程 mock 夹具）各跑 initialize(connect) → tools/list →
 *  tools/call → close 四步；超时（小值 timeoutMs 覆写）与 abort（callTool
 *  进行中中止）如实报错不伪造结果；stdio close 后无孤儿子进程。
 *  被测对象 = apps/server/dist/mcp/*.js（mcp-stubs.mjs dist 直连先例）；
 *  SdkErrorCode 直引 SDK（workspace hoisting，smoke-server.mjs 直引
 *  better-sqlite3 同法先例）。前置：dist/mcp/*.js 在位，缺失即 FAIL 并给
 *  「先 npm run build:server」可操作报错（M01 先例，不静默跳过）。
 *  fail-fast（首 FAIL 进 finally 清理）；SIGINT/SIGBREAK 清理后 exit 130；
 *  汇总 `==== smoke:mcp：X passed / Y failed ====`，退出码 failed===0?0:1。
 *  ================================================================ */
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SdkErrorCode } from '@modelcontextprotocol/client';
import { Checker, SmokeFailError, deepEqual, getFreePort, sleep } from './lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = path.join(REPO_ROOT, 'apps', 'server', 'dist', 'mcp');
const SRC_DIR = path.join(REPO_ROOT, 'apps', 'server', 'src', 'mcp');
const FIXTURE = path.join(REPO_ROOT, 'tests', 'smoke', 'fixtures', 'mock-stdio-server.mjs');
const MT_IDS = Array.from({ length: 12 }, (_, i) => `MT${String(i + 1).padStart(2, '0')}`);

/* ---------- mock 工具面（与 fixtures/mock-stdio-server.mjs 逐字相同，SPEC §5.3） ---------- */
const MOCK_TOOLS = [
  { name: 'echo', description: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'add', description: '两数相加', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
];
const MOCK_DELAY = { slow_echo: 800, hang: 3000 };
/* initialize 应答携带会话头（SPEC §5.2）：transport 记录 sessionId 后
 * terminateSession 才会发 DELETE（SDK：!sessionId 即短路 return）。 */
const SESSION_ID = 'mock-session-1';

function rpcError(code, message) {
  const e = new Error(message);
  e.rpcCode = code;
  return e;
}

async function routeMock(method, params, serverName) {
  if (method === 'initialize') {
    return { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: serverName, version: '1.0.0' } };
  }
  if (method === 'tools/list') return { tools: MOCK_TOOLS };
  if (method === 'tools/call') {
    const name = params.name;
    const args = params.arguments ?? {};
    const delay = MOCK_DELAY[name] ?? 0;
    if (delay) await sleep(delay);   /* slow_echo/hang：超时/abort 断言的延迟源 */
    if (name === 'echo' || name === 'slow_echo') return { content: [{ type: 'text', text: JSON.stringify({ echo: args.text }) }], isError: false };
    if (name === 'add') return { content: [{ type: 'text', text: String((args.a ?? 0) + (args.b ?? 0)) }], isError: false };
    if (name === 'hang') return { content: [{ type: 'text', text: 'late' }], isError: false };
    throw rpcError(-32602, `未知工具：${name}`);
  }
  throw rpcError(-32601, `未知 method：${method}`);   /* liberal server：未知 method 即答 -32601，防挂死 */
}

/* ---------- 进程内 mock HTTP MCP endpoint（SPEC §5.2；startMockModel 同法） ---------- */
function startMockHttpMcp() {
  return new Promise((resolve) => {
    const requests = [];   /* 逐请求记录 { method, url, body } 供断言 */
    const srv = http.createServer((req, res) => {
      const bufs = [];
      req.on('data', (c) => bufs.push(c));
      req.on('end', async () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { /* 非 JSON 容忍 */ }
        requests.push({ method: req.method, url: req.url, body });
        const reply = (status, obj) => {
          try {
            if (obj === undefined) { res.writeHead(status); res.end(); }
            else { res.writeHead(status, { 'Content-Type': 'application/json', 'Mcp-Session-Id': SESSION_ID }); res.end(JSON.stringify(obj)); }
          } catch { /* 客户端已断开（abort/timeout 后写失败容忍） */ }
        };
        if (req.method === 'DELETE') { reply(405); return; }   /* terminateSession 容忍路径（V9） */
        if (req.method !== 'POST') { reply(405); return; }
        if (!body) { reply(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
        if (body.id === undefined || body.id === null) { reply(202); return; }   /* notification → 202 空体 */
        try {
          const result = await routeMock(body.method, body.params ?? {}, 'mock-http-mcp');
          reply(200, { jsonrpc: '2.0', id: body.id, result });
        } catch (e) {
          reply(200, { jsonrpc: '2.0', id: body.id, error: { code: e.rpcCode ?? -32603, message: String(e?.message ?? e) } });
        }
      });
    });
    getFreePort().then((port) => {
      srv.listen(port, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${port}`, requests }));
    });
  });
}

/* ---------- 断言面（SPEC §5.4 判据；V10/V11） ---------- */
const EXPECT_TOOLS = [
  { name: 'echo', desc: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'add', desc: '两数相加', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
];
const toolsShapeOk = (tools) => Array.isArray(tools) && tools.length === 2
  && deepEqual(tools[0], EXPECT_TOOLS[0]) && deepEqual(tools[1], EXPECT_TOOLS[1]);
const callsShapeOk = (rEcho, rAdd) =>
  rEcho?.content?.[0]?.text === '{"echo":"hi"}' && rAdd?.content?.[0]?.text === '5';
const isTimeoutErr = (e) => e?.code === SdkErrorCode.RequestTimeout
  || String(e?.code) === 'REQUEST_TIMEOUT' || /timeout|timed\s*out/i.test(String(e?.message ?? ''));
const isAbortErr = (e) => e?.name === 'AbortError' || /abort|cancel/i.test(`${e?.name ?? ''} ${e?.message ?? ''}`);

const C = new Checker();
let mockHttp = null;
const openConns = new Set();
const track = (conn) => { openConns.add(conn); return conn; };
const untrack = (conn) => { openConns.delete(conn); return conn; };

async function assertNoOrphan(pid, id, name) {
  const t0 = Date.now();
  for (;;) {
    let alive = true;
    try { process.kill(pid, 0); } catch { alive = false; }
    if (!alive) { C.pass(id, name); return; }
    if (Date.now() - t0 > 2000) { C.fail(id, name, { expected: '子进程已退出（无孤儿）', actual: `pid=${pid} 轮询 2s 后仍存活` }); return; }
    await sleep(50);
  }
}

async function cleanup() {
  for (const conn of [...openConns]) {
    try { await conn.close(); } catch { /* best-effort + 幂等 */ }
  }
  openConns.clear();
  if (mockHttp) {
    const srv = mockHttp.srv;
    mockHttp = null;
    try { srv.closeAllConnections(); } catch { /* 旧版 Node 无此 API */ }
    await new Promise((r) => srv.close(r));
  }
}

async function main() {
  /* 前置：dist/mcp 三产物在位（缺失 → 全量 FAIL + 可操作报错，不静默跳过） */
  const distFiles = ['connection.js', 'http.js', 'stdio.js'].map((f) => path.join(DIST_DIR, f));
  const missing = distFiles.filter((f) => !existsSync(f));
  if (missing.length > 0) {
    for (const id of MT_IDS)
      C.fail(id, '（apps/server/dist/mcp/*.js 不可用，本条无法执行）', { expected: 'dist 产物在位', actual: `缺失：${missing.map((m) => path.basename(m)).join(', ')}（请先在仓库根执行 npm run build:server）`, ctx: `dir: ${DIST_DIR}` });
    return;
  }
  const { createHttpMcpConnection } = await import(pathToFileURL(path.join(DIST_DIR, 'http.js')).href);
  const { createStdioMcpConnection } = await import(pathToFileURL(path.join(DIST_DIR, 'stdio.js')).href);

  mockHttp = await startMockHttpMcp();
  const url = `${mockHttp.url}/mcp`;

  /* ---------- Streamable HTTP（先行传输，AC3） ---------- */
  const conn = track(createHttpMcpConnection('mock-http', url));
  await conn.connect();
  { /* MT01 */
    const initReq = mockHttp.requests.find((r) => r.method === 'POST' && r.body?.method === 'initialize');
    C.ok(!!initReq && initReq.body?.params?.clientInfo?.name === 'AgentFlow', 'MT01',
      'HTTP connect 成功；mock 请求日志含 initialize 且 clientInfo.name==="AgentFlow"（clientInfo 透传）',
      { expected: 'initialize 请求 + clientInfo.name=AgentFlow', actual: initReq ? JSON.stringify(initReq.body?.params?.clientInfo) : '无 initialize 请求', ctx: `requests=${mockHttp.requests.length} 条` });
  }
  { /* MT02 */
    const tools = await conn.listTools();
    C.ok(toolsShapeOk(tools), 'MT02',
      'HTTP listTools 返回恰 2 项，name/desc/inputSchema 与 mock 定义 deepEqual',
      { expected: JSON.stringify(EXPECT_TOOLS), actual: JSON.stringify(tools), ctx: 'echo/add 断言面 = V11（name/description/inputSchema）' });
  }
  { /* MT03 */
    const rEcho = await conn.callTool('echo', { text: 'hi' });
    const rAdd = await conn.callTool('add', { a: 2, b: 3 });
    C.ok(callsShapeOk(rEcho, rAdd), 'MT03',
      'HTTP callTool：echo → {"echo":"hi"}；add(2,3) → "5"（content[0].text 逐字）',
      { expected: '{"echo":"hi"} / 5', actual: `${rEcho?.content?.[0]?.text} / ${rAdd?.content?.[0]?.text}`, ctx: 'CallToolResult 原样透传（BK-0030 前不解包）' });
  }
  { /* MT04 */
    await conn.close();
    const hasDelete = mockHttp.requests.some((r) => r.method === 'DELETE');
    let secondCloseOk = true;
    try { await conn.close(); } catch { secondCloseOk = false; }
    C.ok(hasDelete && secondCloseOk, 'MT04',
      'HTTP close：mock 日志含 DELETE（terminateSession 已发）；405 下 close 仍成功；二次 close 不抛（幂等）',
      { expected: 'DELETE 在日志 + 二次 close 无抛', actual: `DELETE=${hasDelete} 二次close无抛=${secondCloseOk}`, ctx: `requests=${mockHttp.requests.length} 条` });
  }
  { /* MT05 · fetch 注入面（BK-0030 前向依据，REQ-01） */
    let fetchCalls = 0;
    const countingFetch = async (u, i) => { fetchCalls += 1; return fetch(u, i); };
    const conn5 = track(createHttpMcpConnection('mock-http-fetch', url, { fetch: countingFetch }));
    await conn5.connect();
    await conn5.listTools();
    await conn5.callTool('echo', { text: 'x' });
    C.ok(fetchCalls >= 3, 'MT05',
      'HTTP fetch 注入面：计数 wrapper 构造，connect+listTools+callTool 全链后调用数 ≥3（注入点真实生效）',
      { expected: '≥3', actual: String(fetchCalls), ctx: 'StreamableHTTPClientTransportOptions.fetch（SPEC §2-V5/V6）' });
    await untrack(conn5).close();
  }
  { /* MT06 · 超时（小值覆写，AC5） */
    const conn6 = track(createHttpMcpConnection('mock-http-timeout', url));
    await conn6.connect();
    const t0 = Date.now();
    let err = null;
    try { await conn6.callTool('slow_echo', { text: 'x' }, 100); } catch (e) { err = e; }
    const dt = Date.now() - t0;
    C.ok(!!err && isTimeoutErr(err) && dt < 1000, 'MT06',
      'HTTP 超时：slow_echo + timeoutMs=100 → 拒绝；SdkError code=REQUEST_TIMEOUT（或消息含 timeout）；实测耗时 <1s',
      { expected: '拒绝 + REQUEST_TIMEOUT + <1000ms', actual: `err=${err ? `${err.name}/${err.code ?? ''}:${String(err.message).slice(0, 80)}` : '无'} dt=${dt}ms`, ctx: '默认 30s 恒被覆写（不自制定时器，V10）' });
    await untrack(conn6).close();
  }
  { /* MT07 · abort（AC5） */
    const conn7 = track(createHttpMcpConnection('mock-http-abort', url));
    await conn7.connect();
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 100);
    let err = null;
    try { await conn7.callTool('hang', {}, undefined, ac.signal); } catch (e) { err = e; }
    let closeOk = true;
    try { await untrack(conn7).close(); } catch { closeOk = false; }
    C.ok(!!err && isAbortErr(err) && closeOk, 'MT07',
      'HTTP abort：hang + AbortController 100ms 后中止 → 拒绝（AbortError 或消息含 abort/cancel）；随后 close() 成功无泄漏',
      { expected: '拒绝 + close 成功', actual: `err=${err ? `${err.name}:${String(err.message).slice(0, 80)}` : '无'} closeOk=${closeOk}`, ctx: 'callTool 第 4 参 signal（SPEC §3.1 扩展面）' });
  }

  /* ---------- stdio（同项第二传输，AC4） ---------- */
  const conn8 = track(createStdioMcpConnection('mock-stdio', process.execPath, [FIXTURE]));
  await conn8.connect();
  { /* MT08 · 四步全链（close 步在 MT09 内收口） */
    const tools = await conn8.listTools();
    const rEcho = await conn8.callTool('echo', { text: 'hi' });
    const rAdd = await conn8.callTool('add', { a: 2, b: 3 });
    C.ok(toolsShapeOk(tools) && callsShapeOk(rEcho, rAdd), 'MT08',
      'stdio 全链 connect→listTools→callTool(echo/add) 成功，断言形状同 MT02/MT03（双传输可比性 = 共享工具面）',
      { expected: `${JSON.stringify(EXPECT_TOOLS)} + {"echo":"hi"}/5`, actual: `${JSON.stringify(tools)} + ${rEcho?.content?.[0]?.text}/${rAdd?.content?.[0]?.text}`, ctx: `spawn: node ${path.basename(FIXTURE)}` });
  }
  { /* MT09 · close 后无孤儿（进程存活探针；pid 探针面 = transport.pid 透传，非接口承诺） */
    const pid = conn8.pid;
    await untrack(conn8).close();
    if (typeof pid !== 'number' || pid <= 0) {
      C.fail('MT09', 'stdio close 后无孤儿：close 前记 pid（可用），close 后 process.kill(pid,0) 轮询至进程退出',
        { expected: 'pid number>0 且轮询至退出', actual: `pid=${String(pid)}`, ctx: 'transport.pid 透传探针面（SPEC §3.3）' });
    } else {
      await assertNoOrphan(pid, 'MT09', 'stdio close 后无孤儿：close 前记 pid，close 后 process.kill(pid,0) 轮询（50ms×40 上限 2s）至进程退出');
    }
  }
  { /* MT10 · stdio 超时 */
    const conn10 = track(createStdioMcpConnection('mock-stdio-timeout', process.execPath, [FIXTURE]));
    await conn10.connect();
    const t0 = Date.now();
    let err = null;
    try { await conn10.callTool('slow_echo', { text: 'x' }, 100); } catch (e) { err = e; }
    const dt = Date.now() - t0;
    C.ok(!!err && isTimeoutErr(err) && dt < 1000, 'MT10',
      'stdio 超时：slow_echo + timeoutMs=100 → 及时拒绝（同 MT06 判据）',
      { expected: '拒绝 + REQUEST_TIMEOUT + <1000ms', actual: `err=${err ? `${err.name}/${err.code ?? ''}:${String(err.message).slice(0, 80)}` : '无'} dt=${dt}ms`, ctx: '超时如实报错不伪造结果' });
    await untrack(conn10).close();
  }
  { /* MT11 · stdio abort */
    const conn11 = track(createStdioMcpConnection('mock-stdio-abort', process.execPath, [FIXTURE]));
    await conn11.connect();
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 100);
    let err = null;
    try { await conn11.callTool('hang', {}, undefined, ac.signal); } catch (e) { err = e; }
    let closeOk = true;
    try { await untrack(conn11).close(); } catch { closeOk = false; }
    C.ok(!!err && isAbortErr(err) && closeOk, 'MT11',
      'stdio abort：hang + abort → 拒绝；close 成功（SIGTERM→SIGKILL 级联，SDK 负责）',
      { expected: '拒绝 + close 成功', actual: `err=${err ? `${err.name}:${String(err.message).slice(0, 80)}` : '无'} closeOk=${closeOk}`, ctx: 'run 级中止级联归 BK-0029/0030 消费侧' });
  }

  /* ---------- MT12 · spawn 安全源扫描（AC8 机器化） ---------- */
  const shellHits = [];
  for (const f of ['connection.ts', 'http.ts', 'stdio.ts']) {
    const abs = path.join(SRC_DIR, f);
    let src = null;
    try { src = readFileSync(abs, 'utf8'); } catch (e) { shellHits.push(`${f}: 不可读 ${e?.message ?? e}`); continue; }
    src.split(/\r?\n/).forEach((l, i) => { if (/shell/i.test(l)) shellHits.push(`${f}:${i + 1}: ${l.trim()}`); });
  }
  C.ok(shellHits.length === 0, 'MT12',
    'spawn 安全源扫描：readFileSync 三个 src/mcp/*.ts，/shell/ 零命中（argv 直传、零命令解释器拼接）',
    { expected: '0 命中', actual: shellHits.length === 0 ? '0 命中' : shellHits.join(' | '), ctx: `dir: apps/server/src/mcp（${path.sep === '\\' ? 'win32' : process.platform}）` });
}

/* ---------- 运行器：fail-fast + finally 清理 + 汇总 + 退出码（smoke-server 先例） ---------- */
process.on('SIGINT', () => {
  console.log('\n收到 SIGINT：执行清理后退出');
  void (async () => { await cleanup(); process.exit(130); })();
});
process.on('SIGBREAK', () => {
  console.log('\n收到 SIGBREAK：执行清理后退出');
  void (async () => { await cleanup(); process.exit(130); })();
});

try {
  await main();
} catch (e) {
  if (e instanceof SmokeFailError) {
    console.log(`（fail-fast：断言 ${e.assertId} 失败，停止后续断言，进入清理）`);
  } else {
    console.error(`ERROR 未预期的异常：${e?.stack ?? e}`);
    C.failed += 1;   /* 未预期异常计入 failed（OBS-001 口径），退出码如实为 1 */
  }
} finally {
  try {
    await cleanup();
  } catch (e) {
    console.error(`ERROR 清理阶段异常：${e?.stack ?? e}`);
  }
}
console.log(`==== smoke:mcp：${C.passed} passed / ${C.failed} failed ====`);
process.exit(C.failed === 0 ? 0 : 1);
