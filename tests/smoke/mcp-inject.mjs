#!/usr/bin/env node
/* ================================================================
 *  mcp-inject.mjs — BK-0030 MCP 工具会话注入与 guard 出站收口独立冒烟
 *  （MI01-MI12）· 迭代 0025 · SPEC §5
 *  被测对象 = apps/server/dist/mcp/inject.js + dist/llm.js 直驱
 *  （mcp-stubs/mcp-transport dist 直连先例）：三分支边界 / spec 桥接达
 *  模型 / 外部工具真实调用（HTTP+stdio 双形态）/ 发现失败降级 / run 中止
 *  级联 / 私网拦截（--child-guard、--child-fetch 自我子进程，env 干净化后
 *  import dist）。mock 面：进程内 HTTP mock MCP（echo/add/opt_flag/weird/
 *  hang + 逐请求记录）+ fixtures/mock-stdio-server.mjs（--pid-file
 *  --hang-tool 门控）+ OpenAI 兼容 mock 模型（G 组同型：首轮点名工具、次轮
 *  收束）。主进程 env 于 dist import 前设置（config.ts 模块级装载 + guard
 *  ALLOW_PRIVATE 快照；显式赋值压制本机 .env 泄入）。fail-fast（首 FAIL 进
 *  finally 清理）；SIGINT/SIGBREAK 清理后 exit 130；汇总
 *  `==== smoke:mcp:inject：X passed / Y failed ====`，退出码 0/1。
 *  ================================================================ */
import http from 'node:http';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Checker, SmokeFailError, getFreePort, sleep, waitFor } from './lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = path.join(REPO_ROOT, 'apps', 'server', 'dist'), SRC_MCP = path.join(REPO_ROOT, 'apps', 'server', 'src', 'mcp');
const FIXTURE = path.join(REPO_ROOT, 'tests', 'smoke', 'fixtures', 'mock-stdio-server.mjs'), SELF = fileURLToPath(import.meta.url);
const MI_IDS = Array.from({ length: 12 }, (_, i) => `MI${String(i + 1).padStart(2, '0')}`);
const MOCK_FINAL = '外部工具链执行完毕（mock 终文）', SESSION_ID = 'mock-session-1';

/* ---------- mock HTTP MCP 工具面（SPEC §5：echo/add/opt_flag/weird/hang） ---------- */
const HTTP_TOOLS = [
  { name: 'echo', description: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string', description: '要回显的文本' } }, required: ['text'] } },
  { name: 'add', description: '两数相加', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
  { name: 'opt_flag', description: '可选布尔旗标', inputSchema: { type: 'object', properties: { flag: { type: 'boolean', description: '旗标' } } } },
  { name: 'weird', description: '无 type 字段的怪参数', inputSchema: { type: 'object', properties: { cfg: { description: '任意配置' } } } },
  { name: 'hang', description: '挂起 3 秒后返回', inputSchema: { type: 'object', properties: {} } },
];
function rpcError(code, message) { const e = new Error(message); e.rpcCode = code; return e; }
async function routeHttp(method, params) {
  if (method === 'initialize') return { protocolVersion: params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'mock-http-mi', version: '1.0.0' } };
  if (method === 'tools/list') return { tools: HTTP_TOOLS };
  if (method === 'tools/call') {
    const { name } = params; const args = params.arguments ?? {};
    if (name === 'hang') { await sleep(3000); return { content: [{ type: 'text', text: 'late' }], isError: false }; }   /* MI08 在途延迟源 */
    if (name === 'echo') return { content: [{ type: 'text', text: JSON.stringify({ echo: args.text }) }], isError: false };
    if (name === 'add') return { content: [{ type: 'text', text: String((args.a ?? 0) + (args.b ?? 0)) }], isError: false };
    if (name === 'opt_flag') return { content: [{ type: 'text', text: JSON.stringify({ flag: args.flag ?? null }) }], isError: false };
    if (name === 'weird') return { content: [{ type: 'text', text: 'weird-ok' }], isError: false };
    throw rpcError(-32602, `未知工具：${name}`);
  }
  throw rpcError(-32601, `未知 method：${method}`);
}
function startMockHttpMcp(port) {
  return new Promise((resolve) => {
    const requests = [];
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
          } catch { /* 对端已断开容忍 */ }
        };
        if (req.method === 'DELETE' || req.method !== 'POST' || !body) { reply(405); return; }
        if (body.id === undefined || body.id === null) { reply(202); return; }
        try {
          reply(200, { jsonrpc: '2.0', id: body.id, result: await routeHttp(body.method, body.params ?? {}) });
        } catch (e) {
          reply(200, { jsonrpc: '2.0', id: body.id, error: { code: e.rpcCode ?? -32603, message: String(e?.message ?? e) } });
        }
      });
    });
    (port != null ? Promise.resolve(port) : getFreePort()).then((p) => {
      srv.listen(p, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${p}`, port: p, requests }));
    });
  });
}

/* ---------- OpenAI 兼容 mock 模型（G 组同型裁剪；generateText 非 stream）：
 * 首轮（无 tool 消息）按末位 user 提示词点名工具回 tool_calls；次轮回固定终文。 ---------- */
function startMockModel() {
  return new Promise((resolve) => {
    const requests = [];
    const m = http.createServer((req, res) => {
      const bufs = [];
      req.on('data', (c) => bufs.push(c));
      req.on('end', () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { /* 容忍 */ }
        requests.push(body);
        const reply = (message) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'chatcmpl-mi', object: 'chat.completion', created: 1700000000, model: 'mock-model',
            choices: [{ index: 0, message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }],
            usage: { prompt_tokens: 9, completion_tokens: 9, total_tokens: 18 },
          }));
        };
        const msgs = body?.messages ?? [];
        if (msgs.some((x) => x?.role === 'tool')) { reply({ role: 'assistant', content: MOCK_FINAL }); return; }
        const c = String([...msgs].reverse().find((x) => x?.role === 'user')?.content ?? '');
        const pick = (suffix, callArgs) => { const t = (body?.tools ?? []).find((x) => x?.function?.name?.endsWith(suffix)); return t ? { id: 'call_mi_1', type: 'function', function: { name: t.function.name, arguments: JSON.stringify(callArgs) } } : null; };
        const tc = c.includes('点名 echo') ? pick('_echo', { text: 'hi' })
          : c.includes('点名 add') ? pick('_add', { a: 2, b: 3 })
          : c.includes('点名 hang') ? pick('_hang', {}) : null;
        reply(tc ? { role: 'assistant', content: null, tool_calls: [tc] } : { role: 'assistant', content: MOCK_FINAL });
      });
    });
    getFreePort().then((port) => {
      m.listen(port, '127.0.0.1', () => resolve({ srv: m, url: `http://127.0.0.1:${port}`, requests }));
    });
  });
}

/* ---------- 断言/直驱小工具 ---------- */
const isAbortChain = (e) => {
  let cur = e;
  for (let i = 0; cur && i < 5; i += 1) {
    if (cur.name === 'AbortError' || /abort|cancel|terminated/i.test(`${cur.name ?? ''} ${cur.message ?? ''}`)) return true;
    cur = cur.cause;
  }
  return false;
};
const noOrphanWithin = async (pid, ms = 2000) => {
  const t0 = Date.now();
  for (;;) {
    let alive = true;
    try { process.kill(pid, 0); } catch { alive = false; }
    if (!alive) return true;
    if (Date.now() - t0 > ms) return false;
    await sleep(50);
  }
};
const readPid = (file) => { try { const s = readFileSync(file, 'utf8').trim(); return /^\d+$/.test(s) ? Number(s) : null; } catch { return null; } };
/* llmHandler 直驱器：手工构造 RunCtx + HandlerArgs（types.ts 形状；llm.ts 实际消费面 = n/p/input/inVals/vars/emit/ctx） */
function startRun(llmHandler, { mcp, prompt }) {
  const events = [];
  const emit = (type, payload) => { events.push({ type, ...payload }); };
  const ac = new AbortController();
  const ctx = { runId: 'mi-run', wf: { name: 'mi', nodes: [], edges: [] }, inputs: {}, ac, emit, log: { info() {}, warn() {}, error() {} } };
  const args = {
    n: { id: 1, type: 'llm', title: 'MI', mcp }, p: { model: 'mock-model', sys: '', temp: 0.2, max: 200 }, def: { name: 'LLM' },
    input: undefined, inVals: [prompt], vars: {}, emit, scope: { results: new Map(), executed: new Set(), firedEdges: new Set() }, iteration: null,
    approvalWaiters: new Map(), byId: new Map(), edges: [], outEs: () => [], inEs: () => [], ctx, sub: async () => {},
  };
  return { ac, events, promise: llmHandler(ctx, args) };
}
/* stdio command token：execPath 含空格时解析 8.3 短名（mcp-registry.mjs 同源；ADR §7 env 表达力边界仅测试侧绕行） */
async function resolveNodeCommandToken() {
  const p = process.execPath;
  if (!/\s/.test(p)) return p;
  return await new Promise((resolve, reject) => {
    const c = spawn('cmd.exe', ['/d', '/c', `for %A in ("${p}") do @echo %~sA`], { shell: false });
    let out = '';
    c.stdout.setEncoding('utf8'); c.stdout.on('data', (d) => { out += d; });
    c.on('error', (e) => reject(new Error(`8.3 短名解析失败：${e?.message ?? e}`)));
    c.on('close', () => {
      const s = (out.split(/\r?\n/).find((l) => l.trim()) ?? '').trim();
      if (s && !/\s/.test(s)) resolve(s);
      else reject(new Error(`8.3 短名仍含空格或不可用（卷可能禁用 8dot3）：${s || '(空输出)'}`));
    });
  });
}
/* 自我子进程运行器（MI10/MI11）：env 覆盖 + 30s 兜底强杀 + MI_CHILD_RESULT 行回收 */
async function runSelf(modeEnv, args) {
  const child = spawn(process.execPath, [SELF, ...args], { shell: false, env: { ...process.env, ...modeEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.setEncoding('utf8'); child.stdout.on('data', (d) => { out += d; }); child.stderr.setEncoding('utf8'); child.stderr.on('data', (d) => { out += d; });
  const r = await new Promise((resolve) => {
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* 已退出 */ } resolve({ code: 'timeout' }); }, 30000);
    child.once('error', (e) => { clearTimeout(timer); resolve({ code: String(e?.message ?? e) }); });
    child.once('exit', (code) => { clearTimeout(timer); resolve({ code }); });
  });
  const line = out.split(/\r?\n/).find((l) => l.startsWith('MI_CHILD_RESULT '));
  return { code: r.code, out, payload: line ? JSON.parse(line.slice('MI_CHILD_RESULT '.length)) : null };
}

/* ---------- 自我子进程分支：--child-guard（MI10 · env 干净化拦截） ---------- */
if (process.argv.includes('--child-guard')) {
  const mock = await startMockHttpMcp(Number(process.env.MI_MOCK_PORT || 0) || null);
  const { buildToolSession } = await import(pathToFileURL(path.join(DIST_DIR, 'mcp', 'inject.js')).href);
  const { isStubImpl } = await import(pathToFileURL(path.join(DIST_DIR, 'tools.js')).href);
  const warns = [];
  const sess = await buildToolSession({ badhttp: ['echo'] }, undefined, { warn: (f, m) => warns.push({ f, m }) });
  const stub = isStubImpl(sess.impls.get('badhttp.echo'));
  await sleep(200);   /* 给潜在漏网出站留时窗 */
  console.log(`MI_CHILD_RESULT ${JSON.stringify({ warns, stub, requests: mock.requests.length })}`);
  process.exit(0);
}
/* ---------- 自我子进程分支：--child-fetch（MI11 · mcpFetch 直调） ---------- */
if (process.argv.includes('--child-fetch')) {
  const { mcpFetch } = await import(pathToFileURL(path.join(DIST_DIR, 'guard.js')).href);
  const out = {};
  try { await mcpFetch('ftp://example.invalid/x', {}); out.ftp = '(未抛错)'; } catch (e) { out.ftp = String(e?.message ?? e); }
  try { await mcpFetch(`http://127.0.0.1:${Number(process.env.MI_MOCK_PORT || 9)}/mcp`, {}); out.loop = '(未抛错)'; } catch (e) { out.loop = String(e?.message ?? e); }
  console.log(`MI_CHILD_RESULT ${JSON.stringify(out)}`);
  process.exit(0);
}

const C = new Checker();
let mockMcp = null, mockModel = null;
const PIDFILE = path.join(os.tmpdir(), `mi-pidfile-${process.pid}.txt`);
async function cleanup() {
  for (const m of [mockMcp, mockModel]) {
    if (!m) continue;
    try { m.srv.closeAllConnections(); } catch { /* 旧版 Node 无此 API */ }
    await new Promise((r) => m.srv.close(r));
  }
  mockMcp = null; mockModel = null;
  try { rmSync(PIDFILE); } catch { /* 不存在容忍 */ }
}

async function main() {
  /* env token 可用性（ADR §7：MCP_STDIO_SERVERS 值按空白分割，token 内空白不可表达） */
  let nodeCmd = null, envErr = null;
  try { nodeCmd = await resolveNodeCommandToken(); } catch (e) { envErr = String(e?.message ?? e); }
  const badTokens = [];
  if (envErr || !nodeCmd) badTokens.push(envErr || 'node command token 解析失败');
  if (nodeCmd && /\s/.test(nodeCmd)) badTokens.push(`node command 含空白：${nodeCmd}`);
  if (/\s/.test(FIXTURE)) badTokens.push(`FIXTURE 路径含空白：${FIXTURE}`);
  if (/\s/.test(PIDFILE)) badTokens.push(`PIDFILE 路径含空白：${PIDFILE}（请以 TMP 指向无空白临时目录重跑）`);
  if (badTokens.length > 0) {
    for (const id of MI_IDS) C.fail(id, '（env token 含空白/不可用，本条无法执行）', { expected: 'node 命令/FIXTURE/PIDFILE 均无空白字符', actual: badTokens.join(' | '), ctx: 'ADR-0012 §7 env 表达力边界（actionable，不静默跳过）' });
    return;
  }
  const PORT_MCP = await getFreePort();
  const PORT_DEAD = await getFreePort();
  /* 主进程 env（dist import 前定型）：ALLOW_PRIVATE_NET=1 放行 127.0.0.1 mock；显式赋值压制本机 .env 泄入 */
  process.env.ALLOW_PRIVATE_NET = '1';
  process.env.MCP_HTTP_SERVERS = `mockhttp=http://127.0.0.1:${PORT_MCP}/mcp,deadhttp=http://127.0.0.1:${PORT_DEAD}/mcp`;
  process.env.MCP_STDIO_SERVERS = `mockstdio=${nodeCmd} ${FIXTURE} --pid-file ${PIDFILE} --hang-tool`;
  mockMcp = await startMockHttpMcp(PORT_MCP);
  mockModel = await startMockModel();
  process.env.AI_BASE_URL = mockModel.url; process.env.AI_API_KEY = 'smoke-mock-key';
  process.env.AI_MODELS = 'MockChat:mock-model'; process.env.AI_MODEL = 'mock-model';

  /* MI01 前置：dist 四产物在位（缺失 → 全量 FAIL + 可操作报错，不静默跳过） */
  const missing = ['mcp/inject.js', 'llm.js', 'guard.js', 'mcp/registry.js'].map((f) => path.join(DIST_DIR, f)).filter((f) => !existsSync(f));
  if (missing.length > 0) {
    for (const id of MI_IDS) C.fail(id, '（apps/server/dist 产物不可用，本条无法执行）', { expected: 'dist 产物在位', actual: `缺失：${missing.map((m) => path.relative(DIST_DIR, m)).join(', ')}（请先在仓库根执行 npm run build:server）`, ctx: `dir: ${DIST_DIR}` });
    return;
  }
  const { buildToolSession } = await import(pathToFileURL(path.join(DIST_DIR, 'mcp', 'inject.js')).href);
  const { llmHandler } = await import(pathToFileURL(path.join(DIST_DIR, 'llm.js')).href);
  const toolsMod = await import(pathToFileURL(path.join(DIST_DIR, 'tools.js')).href);
  C.pass('MI01', `前置：dist 四产物在位（mcp/inject.js + llm.js + guard.js + mcp/registry.js，dir=${DIST_DIR}）`);

  { /* MI07 · 空注册面零发现（先于 MI02-MI06 执行：注册面存在但选择未触达） */
    const before = mockMcp.requests.length;
    const sel = { filesystem: ['read_file'], nosuch: ['x'] };
    const sess7 = await buildToolSession(sel);
    const direct7 = toolsMod.collectTools(sel);
    /* stubOf 每次生成新闭包（tools.ts stub 臂语义）：引用相等仅对 IMPL 条目可证，
     * stub 条目以 isStubImpl 等价承载（session ≡ collectTools 现状输出） */
    const sameRef = [...direct7.keys()].every((k) => {
      const a = sess7.impls.get(k); const b = direct7.get(k);
      return toolsMod.isStubImpl(b) ? toolsMod.isStubImpl(a) : a === b;
    });
    C.ok(sess7.extSpecs.size === 0 && sameRef && mockMcp.requests.length === before, 'MI07',
      '空注册面零发现：{filesystem:[read_file],nosuch:[x]} session → extSpecs 空 + impls 与 collectTools 同选逐项引用相等 + mockhttp 请求数不变（对 mockhttp/deadhttp 零发现——本组先于 MI02-MI06 执行，deadhttp 首次发现证明在 MI06；AC1）',
      { expected: 'extSpecs=0 + 引用相等 + 请求数不变', actual: JSON.stringify({ ext: sess7.extSpecs.size, sameRef, reqDelta: mockMcp.requests.length - before }), ctx: '注入层单例不导出（SPEC §3.2），零发现以 mock 请求数为机器证据' });
  }
  { /* MI02+MI03 · HTTP E2E：spec 桥接达模型 + 真实调用（单 run 双断言，SPEC §5 压缩序） */
    const r23 = startRun(llmHandler, { mcp: { mockhttp: ['echo', 'add', 'opt_flag', 'weird'] }, prompt: '请点名 echo 工具' });
    const res23 = await r23.promise;
    const r1 = mockModel.requests.find((r) => Array.isArray(r?.tools) && r.tools.some((t) => t?.function?.name === 'mockhttp_echo'));
    const fns = r1 ? Object.fromEntries(r1.tools.map((t) => [t.function.name, t.function])) : {};
    const pars = (fn) => fn?.parameters ?? {}; const reqK = (fn, k) => Array.isArray(pars(fn).required) && pars(fn).required.includes(k);
    const e = fns.mockhttp_echo, a = fns.mockhttp_add, o = fns.mockhttp_opt_flag, w = fns.mockhttp_weird;
    C.ok(e?.description === '回显输入' && pars(e).properties?.text?.type === 'string' && reqK(e, 'text')
      && pars(a).properties?.a?.type === 'number' && pars(a).properties?.b?.type === 'number' && reqK(a, 'a') && reqK(a, 'b')
      && pars(o).properties?.flag?.type === 'boolean' && !reqK(o, 'flag')
      && pars(w).properties?.cfg?.type === 'string' && !reqK(w, 'cfg'), 'MI02',
      'HTTP E2E·spec 桥接达模型：模型首轮 tools 含 mockhttp_echo（desc=回显输入；text→string+required、a/b→number+required、opt_flag→boolean 非 required、weird(cfg 无 type)→string 非 required）——§4.2 映射表逐行（AC3）',
      { expected: '五工具桥接形状', actual: JSON.stringify({ echo: pars(e), add: pars(a), opt: pars(o), weird: pars(w) }), ctx: `mock 模型请求数=${mockModel.requests.length}` });
    const callEcho = mockMcp.requests.find((r) => r.body?.method === 'tools/call' && r.body?.params?.name === 'echo' && r.body?.params?.arguments?.text === 'hi');
    const toolMsg = (mockModel.requests.find((r) => (r?.messages ?? []).some((m) => m?.role === 'tool'))?.messages ?? []).find((m) => m?.role === 'tool');
    let toolText = null; try { toolText = JSON.parse(String(toolMsg?.content)).content?.[0]?.text ?? null; } catch { toolText = null; }
    const logHit = r23.events.some((ev) => ev.type === 'log' && String(ev.msg).includes('🔧 工具调用 mockhttp.echo('));
    C.ok(!!callEcho && toolText === '{"echo":"hi"}' && res23.value === MOCK_FINAL && logHit, 'MI03',
      'HTTP E2E·真实调用：mock MCP 收到 tools/call echo {text:"hi"}；模型次轮请求含工具结果 {"echo":"hi"}（CallToolResult 原样透传 text 面）；节点终值 = mock 终文；emit 含「🔧 工具调用 mockhttp.echo(」日志行（AC3）',
      { expected: '调用发生 + 结果回传 + 终文 + 日志行', actual: JSON.stringify({ called: !!callEcho, toolText, value: res23?.value, logHit }), ctx: '工具调用日志沿 llm.ts 既有形态' });
  }
  { /* MI04 · stdio E2E + 发现/调用子进程零残留（run 正常结束，AC4 后半） */
    await buildToolSession({ mockstdio: ['echo', 'add'] });   /* 首次发现（spawn→tools/list→close），预热并留 PIDFILE 快照 */
    const discPid4 = readPid(PIDFILE);
    const nA = mockModel.requests.length;
    const rA = startRun(llmHandler, { mcp: { mockstdio: ['echo', 'add'] }, prompt: '请点名 echo 工具' });
    const resA = await rA.promise;
    const a2 = mockModel.requests.slice(nA).find((r) => (r?.messages ?? []).some((m) => m?.role === 'tool'));
    const nB = mockModel.requests.length;
    const rB = startRun(llmHandler, { mcp: { mockstdio: ['echo', 'add'] }, prompt: '请点名 add 工具' });
    const resB = await rB.promise;
    const b2 = mockModel.requests.slice(nB).find((r) => (r?.messages ?? []).some((m) => m?.role === 'tool'));
    const specOk = mockModel.requests.some((r) => Array.isArray(r?.tools) && r.tools.some((t) => t?.function?.name === 'mockstdio_echo' && t.function.description === '回显输入'));
    const textOf = (r2) => { const m2 = (r2?.messages ?? []).find((x) => x?.role === 'tool'); try { return JSON.parse(String(m2?.content)).content?.[0]?.text ?? null; } catch { return null; } };
    const lastPid = readPid(PIDFILE);
    const clean4 = discPid4 && lastPid && discPid4 !== lastPid ? (await noOrphanWithin(discPid4)) && (await noOrphanWithin(lastPid)) : false;
    C.ok(resA.value === MOCK_FINAL && resB.value === MOCK_FINAL && specOk && textOf(a2) === '{"echo":"hi"}' && textOf(b2) === '5' && clean4, 'MI04',
      'stdio E2E：echo/add 两 run 均正常收束（终值=mock 终文）；spec 达模型（mockstdio_echo desc=回显输入）；工具结果 {"echo":"hi"}/5 与 mock 定义一致；发现阶段 pid 与末次 per-call pid 均 process.kill(pid,0) 轮询至退出（run 正常结束零残留，AC3/AC4）',
      { expected: '双 run 收束 + spec + 结果 + 无孤儿', actual: JSON.stringify({ a: resA?.value === MOCK_FINAL, b: resB?.value === MOCK_FINAL, specOk, aText: textOf(a2), bText: textOf(b2), discPid: discPid4, lastPid, clean4 }), ctx: `spawn: ${path.basename(nodeCmd)} ${path.basename(FIXTURE)} --pid-file --hang-tool` });
  }
  { /* MI05 · 三分支边界（内置/外部/stub 混合勾选各走各分支） */
    const sess5 = await buildToolSession({ filesystem: ['read_file'], mockhttp: ['echo', 'not_in_manifest'], nosuch: ['ghost'] });
    const builtinRef = sess5.impls.get('filesystem.read_file') === toolsMod.IMPL.filesystem.read_file;
    const extImpl = sess5.impls.get('mockhttp.echo');
    const r5 = extImpl && !toolsMod.isStubImpl(extImpl) ? await extImpl({ text: 'yo' }) : null;
    C.ok(builtinRef && !toolsMod.isStubImpl(extImpl) && r5?.content?.[0]?.text === '{"echo":"yo"}'
      && toolsMod.isStubImpl(sess5.impls.get('mockhttp.not_in_manifest')) && toolsMod.isStubImpl(sess5.impls.get('nosuch.ghost'))
      && sess5.extSpecs.has('mockhttp.echo') && !sess5.extSpecs.has('mockhttp.not_in_manifest'), 'MI05',
      '三分支边界：filesystem.read_file === IMPL.filesystem.read_file（引用相等，内置零语义改动最强证据）；mockhttp.echo 非 stub 且直调返回 mock 结果；not_in_manifest/nosuch.ghost 均 stub（isStubImpl 摘要口径不变）；extSpecs 仅含清单命中项（AC5/AC1）',
      { expected: '内置引用相等 + 外部动态 + 未命中 stub', actual: JSON.stringify({ builtinRef, ext: !toolsMod.isStubImpl(extImpl), text: r5?.content?.[0]?.text, miss: toolsMod.isStubImpl(sess5.impls.get('mockhttp.not_in_manifest')), ghost: toolsMod.isStubImpl(sess5.impls.get('nosuch.ghost')) }), ctx: '结构执法：只覆写 isStubImpl===true 条目' });
  }
  { /* MI06 · 发现失败降级（stub 化 + warn，不静默吞） */
    const warns6 = [];
    const sess6 = await buildToolSession({ deadhttp: ['echo'] }, undefined, { warn: (f, m) => warns6.push({ f, m }) });
    const w0 = warns6[0];
    C.ok(toolsMod.isStubImpl(sess6.impls.get('deadhttp.echo')) && warns6.length === 1 && w0?.f?.serverId === 'deadhttp' && w0?.f?.kind === 'http'
      && String(w0?.m).includes('工具发现失败，已降级为 stub') && /fetch failed|ECONNREFUSED|refused|连接拒绝/i.test(String(w0?.f?.error)), 'MI06',
      '发现失败降级：deadhttp（无监听死端口）→ stub 化（isStubImpl）+ warn collector 收到 {serverId:"deadhttp",kind:"http"} + msg 含「工具发现失败，已降级为 stub」+ error 含连接失败字样（不静默吞；AC5/REQ-01④；deadhttp 首次发现在此，亦证 MI07 前置零发现）',
      { expected: 'stub + 1 次 warn + error 如实', actual: JSON.stringify(warns6), ctx: '失败不缓存（registry 语义零触碰）' });
  }
  { /* MI08 · run 中止级联（stdio hang 在途中止）+ MI09 尾接基线复跑（SPEC §5 压缩序） */
    const p8Before = readPid(PIDFILE);
    const n8 = mockModel.requests.length;
    const r8 = startRun(llmHandler, { mcp: { mockstdio: ['hang'] }, prompt: '请点名 hang 工具' });
    await waitFor(() => mockModel.requests.slice(n8).some((r) => (r?.tools ?? []).some((t) => t?.function?.name === 'mockstdio_hang')), 20000, 'MI08 模型首轮点名 mockstdio_hang');
    let callPid8 = null;
    await waitFor(() => { const p = readPid(PIDFILE); if (p && p !== p8Before) { callPid8 = p; return true; } return false; }, 20000, 'MI08 per-call 子进程 spawn（PIDFILE 更新）', 20);
    await sleep(300);   /* hang(3s) 确定在途 */
    r8.ac.abort();
    let err8 = null;
    try { await r8.promise; } catch (e) { err8 = e; }
    const oneRound8 = mockModel.requests.length === n8 + 1;
    const clean8 = callPid8 ? await noOrphanWithin(callPid8) : false;
    C.ok(!!err8 && isAbortChain(err8) && oneRound8 && clean8, 'MI08',
      'run 中止级联：stdio hang 调用在途 ctx.ac.abort() → handler 以 abort 型错误拒绝（cause 链判据，MT07 同型；signal 透传 callTool + finally close 级联）；per-call 子进程 pid process.kill(pid,0) 轮询至退出（无孤儿；发现阶段 pid 孤儿断言在 MI04——MI08 会话缓存命中零发现 spawn）；mock 模型恰 +1 次请求（未入次轮）（AC4）',
      { expected: 'abort 拒绝 + 无孤儿 + 1 次请求', actual: JSON.stringify({ err: err8 ? `${err8.name}:${String(err8.message).slice(0, 60)}` : '无', abortType: isAbortChain(err8), oneRound8, callPid: callPid8, clean8 }), ctx: 'connection.ts:29 signal 面 + dynamicImpl finally close' });
    const before9 = mockMcp.requests.length;
    await buildToolSession({ mockhttp: ['echo'] });
    const cached9 = mockMcp.requests.length === before9;
    const r9 = startRun(llmHandler, { mcp: { mockhttp: ['echo'] }, prompt: '请点名 echo 工具' });
    const res9 = await r9.promise;
    C.ok(cached9 && res9.value === MOCK_FINAL, 'MI09',
      '中止级联后基线复跑：同进程再次 buildToolSession({mockhttp:[echo]}) → mockhttp 请求数不变（进程级快照缓存命中零重连）；随后完整 handler 正常收束（中止不污染后续 run，终值=mock 终文）（AC4）',
      { expected: '缓存命中 + 正常收束', actual: JSON.stringify({ cached9, value: res9?.value === MOCK_FINAL }), ctx: 'registry 发现缓存语义零触碰' });
  }
  { /* MI10 · 子进程拦截（ALLOW_PRIVATE_NET="" 自我子进程：未出站证明） */
    const PORT_MCP2 = await getFreePort(); const parentReqs = mockMcp.requests.length;
    const r10 = await runSelf({ ALLOW_PRIVATE_NET: '', MCP_HTTP_SERVERS: `badhttp=http://127.0.0.1:${PORT_MCP2}/mcp`, MCP_STDIO_SERVERS: '', MI_MOCK_PORT: String(PORT_MCP2) }, ['--child-guard']);
    const p10 = r10.payload;
    const w10json = JSON.stringify(p10?.warns ?? []);
    C.ok(r10.code === 0 && w10json.includes('已拦截') && w10json.includes('已降级为 stub') && p10?.stub === true && p10?.requests === 0
      && mockMcp.requests.length === parentReqs, 'MI10',
      '子进程拦截：ALLOW_PRIVATE_NET="" 子进程自起 mock MCP 后 buildToolSession({badhttp:[echo]}) → warn 含「已拦截」（error 字段）+「已降级为 stub」；子进程 mock 收到 0 请求（未出站证明）；impl stub 化；主进程 mock 亦零增量（AC2）',
      { expected: 'code=0 + 拦截 + 0 请求 + stub', actual: JSON.stringify({ code: r10.code, payload: p10, parentDelta: mockMcp.requests.length - parentReqs, tail: r10.out.slice(-160) }), ctx: `子进程 env: badhttp=http://127.0.0.1:${PORT_MCP2}/mcp` });
  }
  { /* MI11 · 子进程直调 mcpFetch（非 http(s)/回环面；=1 放行由 MI02-MI04 交叉证明） */
    const r11 = await runSelf({ ALLOW_PRIVATE_NET: '', MI_MOCK_PORT: String(mockMcp.port) }, ['--child-fetch']);
    const p11 = r11.payload;
    C.ok(r11.code === 0 && String(p11?.ftp).includes('仅允许 http(s) 协议') && String(p11?.loop).includes('已拦截'), 'MI11',
      '子进程直调 mcpFetch：ftp:// → 「仅允许 http(s) 协议」；http://127.0.0.1:<mockport>/ → 「已拦截」（ALLOW_PRIVATE_NET="" 拦截面；主进程 ALLOW_PRIVATE_NET=1 的 MI02-MI04 全通即 =1 放行证据，交叉引用）（AC2）',
      { expected: '两拦截字样', actual: JSON.stringify(p11), ctx: 'mcpFetch = guardedFetch 薄包装（AC7）' });
  }
  { /* MI12 · 源扫描：无绕过注入面的裸出站（MT12/MR10 同型） */
    const hits = [];
    for (const f of ['connection.ts', 'http.ts', 'stdio.ts', 'registry.ts', 'inject.ts']) {
      const abs = path.join(SRC_MCP, f);
      let src = null;
      try { src = readFileSync(abs, 'utf8'); } catch (e) { hits.push(`${f}: 不可读 ${e?.message ?? e}`); continue; }
      src.split(/\r?\n/).forEach((l, i) => { if (/(?<![\w.$])fetch\s*\(/.test(l)) hits.push(`${f}:${i + 1}: ${l.trim()}`); });
    }    C.ok(hits.length === 0, 'MI12',
      '源扫描：readFileSync 五个 src/mcp/*.ts，/(?<![\\w.$])fetch\\s*\\(/ 零命中（无绕过注入面裸出站；fetch: mcpFetch / opts?.fetch 属性形态不误报；MCP HTTP 生产出站唯一通道 = guard.mcpFetch）（AC2/AC7）',
      { expected: '0 命中', actual: hits.length === 0 ? '0 命中' : hits.join(' | '), ctx: `dir: apps/server/src/mcp（${path.sep === '\\' ? 'win32' : process.platform}）` });
  }
}

/* ---------- 运行器：fail-fast + finally 清理 + 汇总 + 退出码（mcp-transport.mjs 先例） ---------- */
process.on('SIGINT', () => { console.log('\n收到 SIGINT：执行清理后退出'); void (async () => { await cleanup(); process.exit(130); })(); });
process.on('SIGBREAK', () => { console.log('\n收到 SIGBREAK：执行清理后退出'); void (async () => { await cleanup(); process.exit(130); })(); });
try {
  await main();
} catch (e) {
  if (e instanceof SmokeFailError) {
    console.log(`（fail-fast：断言 ${e.assertId} 失败，停止后续断言，进入清理）`);
  } else {
    console.error(`ERROR 未预期的异常：${e?.stack ?? e}`);
    C.failed += 1;   /* 未预期异常计入 failed（OBS-001 口径） */
  }
} finally {
  try { await cleanup(); } catch (e) { console.error(`ERROR 清理阶段异常：${e?.stack ?? e}`); }
}
console.log(`==== smoke:mcp:inject：${C.passed} passed / ${C.failed} failed ====`);
process.exit(C.failed === 0 ? 0 : 1);
