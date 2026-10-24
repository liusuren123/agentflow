#!/usr/bin/env node
/* ================================================================
 *  mcp-registry.mjs — BK-0029 外部 MCP server 注册表与工具清单发现独立冒烟
 *  （MR01-MR11）· 迭代 0024 · SPEC §5
 *  被测对象 = apps/server/dist/mcp/registry.js（进程内直测）+ dist/server.js
 *  启动链（fail-fast 端到端经 startServer 子进程，Z01 先例的 boom/logTail
 *  形态）。mock 面复用 BK-0028 基建：stdio 直用 fixtures/mock-stdio-server.mjs
 *  （零改动）；HTTP 为文件内精简进程内 mock（initialize + tools/list 两路由
 *  + 逐请求计数，mcp-transport.mjs 同源裁剪）。fail-fast（首 FAIL 进 finally
 *  清理）；SIGINT/SIGBREAK 清理后 exit 130；汇总
 *  `==== smoke:mcp:registry：X passed / Y failed ====`，退出码 failed===0?0:1。
 *  ================================================================ */
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Checker, SmokeFailError, deepEqual, getFreePort, sleep, startServer } from './lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = path.join(REPO_ROOT, 'apps', 'server', 'dist');
const DIST_MCP = path.join(DIST_DIR, 'mcp');
const REGISTRY_DIST = path.join(DIST_MCP, 'registry.js');
const FIXTURE = path.join(REPO_ROOT, 'tests', 'smoke', 'fixtures', 'mock-stdio-server.mjs');
const MR_IDS = Array.from({ length: 11 }, (_, i) => `MR${String(i + 1).padStart(2, '0')}`);

/* ---------- mock 工具面（与 mcp-transport.mjs MOCK_TOOLS/EXPECT_TOOLS 逐字相同，SPEC §5.2） ---------- */
const MOCK_TOOLS = [
  { name: 'echo', description: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'add', description: '两数相加', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
];
const EXPECT_TOOLS = [
  { name: 'echo', desc: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'add', desc: '两数相加', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
];
const SESSION_ID = 'mock-session-1';   /* initialize 应答带会话头（terminateSession 才发 DELETE，MT04 同源） */

/* ---------- 进程内精简 mock HTTP MCP（mcp-transport.mjs startMockHttpMcp 同源裁剪： ----------
 * 仅 initialize / tools/list 两路由 + 逐请求计数（缓存命中的「initialize 请求数不增」断言源） */
function startMockHttpMcp() {
  return new Promise((resolve) => {
    const requests = [];
    const srv = http.createServer((req, res) => {
      const bufs = [];
      req.on('data', (c) => bufs.push(c));
      req.on('end', () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { /* 非 JSON 容忍 */ }
        requests.push({ method: req.method, url: req.url, body });
        const reply = (status, obj) => {
          try {
            if (obj === undefined) { res.writeHead(status); res.end(); }
            else { res.writeHead(status, { 'Content-Type': 'application/json', 'Mcp-Session-Id': SESSION_ID }); res.end(JSON.stringify(obj)); }
          } catch { /* 客户端已断开容忍 */ }
        };
        if (req.method === 'DELETE') { reply(405); return; }   /* terminateSession 容忍路径 */
        if (req.method !== 'POST' || !body) { reply(405); return; }
        if (body.id === undefined || body.id === null) { reply(202); return; }   /* notification → 202 */
        if (body.method === 'initialize') {
          reply(200, { jsonrpc: '2.0', id: body.id, result: { protocolVersion: body.params?.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'mock-http-mcp', version: '1.0.0' } } });
        } else if (body.method === 'tools/list') {
          reply(200, { jsonrpc: '2.0', id: body.id, result: { tools: MOCK_TOOLS } });
        } else {
          reply(200, { jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `未知 method：${body.method}` } });
        }
      });
    });
    getFreePort().then((port) => {
      srv.listen(port, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${port}`, requests }));
    });
  });
}

/* ---------- stdio command token：execPath 含空格时解析 8.3 短名（仅测试侧绕行； ----------
 * env 案 A 值无空格表达力为 ADR §7 既定取舍，生产注册表无此逻辑） */
async function resolveNodeCommandToken() {
  const p = process.execPath;
  if (!/\s/.test(p)) return p;
  return await new Promise((resolve, reject) => {
    const c = spawn('cmd.exe', ['/d', '/c', `for %A in ("${p}") do @echo %~sA`], { shell: false });
    let out = '';
    c.stdout.setEncoding('utf8');
    c.stdout.on('data', (d) => { out += d; });
    c.on('error', (e) => reject(new Error(`8.3 短名解析失败：${e?.message ?? e}`)));
    c.on('close', () => {
      const s = (out.split(/\r?\n/).find((l) => l.trim()) ?? '').trim();
      if (s && !/\s/.test(s)) resolve(s);
      else reject(new Error(`8.3 短名仍含空格或不可用（卷可能禁用 8dot3）：${s || '(空输出)'}`));
    });
  });
}

const C = new Checker();
let mockHttp = null;

async function cleanup() {
  if (mockHttp) {
    const srv = mockHttp.srv;
    mockHttp = null;
    try { srv.closeAllConnections(); } catch { /* 旧版 Node 无此 API */ }
    await new Promise((r) => srv.close(r));
  }
}

/* 启动应 fatal 却健康返回时：杀子进程并记 FAIL（成败皆然终止） */
async function expectFastFail(id, name, env) {
  let srv = null;
  let boom = null;
  try {
    srv = await startServer(await getFreePort(), env, 10000);
  } catch (e) {
    boom = e;
  }
  if (srv) {
    try { srv.child.kill('SIGKILL'); } catch { /* 已退出 */ }
    C.fail(id, name, { expected: '启动 fatal 退出码 1', actual: '服务意外健康启动（zod 校验未生效）', ctx: 'startServer 正常返回' });
    return null;
  }
  return { msg: String(boom?.message ?? ''), tail: String(boom?.logTail ?? '') };
}

async function main() {
  /* env 干净化：宿主 MCP env 不泄入本进程（MR11 envLoader 确定性）与 startServer
   * 子进程基线（MR02/03 的坏值由 opts.env 显式注入，不经宿主） */
  delete process.env.MCP_HTTP_SERVERS;
  delete process.env.MCP_STDIO_SERVERS;

  /* ---------- MR01 前置：dist 六产物在位（缺失 → 全量 FAIL + 可操作报错） ---------- */
  const distFiles = ['mcp/connection.js', 'mcp/http.js', 'mcp/stdio.js', 'mcp/registry.js', 'server.js', 'tools.js'].map((f) => path.join(DIST_DIR, f));
  const missing = distFiles.filter((f) => !existsSync(f));
  if (missing.length > 0) {
    for (const id of MR_IDS)
      C.fail(id, '（apps/server/dist 产物不可用，本条无法执行）', { expected: 'dist 产物在位', actual: `缺失：${missing.map((m) => path.relative(DIST_DIR, m)).join(', ')}（请先在仓库根执行 npm run build:server）`, ctx: `dir: ${DIST_DIR}` });
    return;
  }
  const registryMod = await import(pathToFileURL(REGISTRY_DIST).href);
  C.pass('MR01', `前置：dist 六产物在位（mcp/connection|http|stdio|registry.js + server.js + tools.js，dir=${DIST_DIR}）`);

  /* ---------- MR02 · fail-fast 端到端（HTTP / E1） ---------- */
  {
    const r = await expectFastFail('MR02', 'fail-fast（HTTP）：MCP_HTTP_SERVERS="no-equal-sign" → 子进程提前退出 code=1，logTail 含变量名与「环境变量配置错误」',
      { env: { MCP_HTTP_SERVERS: 'no-equal-sign' } });
    if (r) C.ok(/code=1\b/.test(r.msg) && r.tail.includes('MCP_HTTP_SERVERS') && r.tail.includes('环境变量配置错误'), 'MR02',
      'fail-fast（HTTP）：E1 无 "=" → fatal 指明 MCP_HTTP_SERVERS 与原因、退出码 1（config.ts:65-68 通道）',
      { expected: 'code=1 + 变量名 + 环境变量配置错误', actual: `${r.msg} | logTail 片段：${r.tail.slice(-300)}`, ctx: 'startServer 子进程（Z01 先例 boom/logTail 形态）' });
  }

  /* ---------- MR03 · fail-fast 端到端（stdio / E8） ---------- */
  {
    const r = await expectFastFail('MR03', 'fail-fast（stdio）：MCP_STDIO_SERVERS="a=node x,a=node y" → code=1，logTail 含变量名与重复 name 原因',
      { env: { MCP_STDIO_SERVERS: 'a=node x,a=node y' } });
    if (r) C.ok(/code=1\b/.test(r.msg) && r.tail.includes('MCP_STDIO_SERVERS') && r.tail.includes('重复'), 'MR03',
      'fail-fast（stdio）：E8 同 env name 重复 → fatal 指明 MCP_STDIO_SERVERS 与「name 重复」原因、退出码 1',
      { expected: 'code=1 + 变量名 + 重复', actual: `${r.msg} | logTail 片段：${r.tail.slice(-300)}`, ctx: '同 MR02 形态' });
  }

  /* ---------- MR04 · 形态枚举全覆盖（进程内直测两纯函数，SPEC §2.1 E1-E8 + 合法正例） ---------- */
  {
    const bad = [];
    const HTTP_BAD = [
      ['E1 无 =', 'no-equal-sign', 'name 缺失'],
      ['E2 name 空', '=https://h/mcp', 'name 为空'],
      ['E3 name 非法字符', 'a.b=https://h/mcp', '非法字符'],
      ['E4 值空', 'name=', '值为空'],
      ['E5 空条目', 'a=https://h/mcp,', '空条目'],
      ['E6 URL 非法', 'name=notaurl', 'URL'],
      ['E6 协议非白名单', 'name=ftp://x', '协议'],
      ['E8 同 env name 重复', 'a=https://h1/mcp,a=https://h2/mcp', '重复'],
    ];
    const STDIO_BAD = [
      ['E3 name 含空格', 'a b=node x', '非法字符'],
      ['E5 连续逗号', 'a=node x,,b=node y', '空条目'],
      ['E7 值空/command 缺失', 'name=   ', 'command 缺失'],
      ['E8 同 env name 重复', 'a=node x,a=node y', '重复'],
    ];
    for (const [label, spec, kw] of HTTP_BAD) {
      const r = registryMod.parseHttpServersSpec(spec);
      if (r.problems.length === 0 || !r.problems.some((p) => p.includes(kw))) bad.push(`http ${label}→${JSON.stringify(r.problems)}`);
    }
    for (const [label, spec, kw] of STDIO_BAD) {
      const r = registryMod.parseStdioServersSpec(spec);
      if (r.problems.length === 0 || !r.problems.some((p) => p.includes(kw))) bad.push(`stdio ${label}→${JSON.stringify(r.problems)}`);
    }
    const blankH = registryMod.parseHttpServersSpec('   ');
    const blankS = registryMod.parseStdioServersSpec('   ');
    if (blankH.entries.length !== 0 || blankH.problems.length !== 0 || blankS.entries.length !== 0 || blankS.problems.length !== 0)
      bad.push('整值空白=未配置（SPEC §2.1 规则 1）不成立');
    const vh = registryMod.parseHttpServersSpec('searxng=https://gw.internal/mcp, echo-http=http://127.0.0.1:9/mcp');
    const vs = registryMod.parseStdioServersSpec('sql=npx --yes @modelcontextprotocol/server-sqlite');
    const vhOk = vh.problems.length === 0 && deepEqual(vh.entries, [
      { kind: 'http', serverId: 'searxng', url: 'https://gw.internal/mcp' },
      { kind: 'http', serverId: 'echo-http', url: 'http://127.0.0.1:9/mcp' },
    ]);
    const vsOk = vs.problems.length === 0 && deepEqual(vs.entries, [
      { kind: 'stdio', serverId: 'sql', command: 'npx', args: ['--yes', '@modelcontextprotocol/server-sqlite'] },
    ]);
    if (!vhOk) bad.push(`http 合法正例→${JSON.stringify(vh)}`);
    if (!vsOk) bad.push(`stdio 合法正例→${JSON.stringify(vs)}`);
    C.ok(bad.length === 0, 'MR04',
      '形态枚举全覆盖：E1-E8 逐形态 problems 非空且含期望关键词；整值空白=未配置；两合法正例 entries 结构精确 deepEqual（kind/serverId/url/command/args）',
      { expected: '全符合（SPEC §2.1 表）', actual: bad.length === 0 ? '全符合' : bad.join(' | '), ctx: 'import dist/mcp/registry.js 直测纯函数（零 IO）' });
  }

  /* ---------- MR05 · 冲突拒绝（注入路：warn collector） ---------- */
  {
    const collected = [];
    const reg5 = registryMod.buildMcpRegistry({ mcpStdioServers: 'sqlite=node a,good=node b' }, { warn: (fields, msg) => collected.push({ fields, msg }) });
    const ok5 = reg5.entries.length === 1 && reg5.entries[0]?.serverId === 'good' && !reg5.has('sqlite')
      && collected.length === 1 && collected[0]?.msg.includes('外部 MCP 注册名与内置 id 冲突')
      && collected[0]?.fields?.serverId === 'sqlite' && collected[0]?.fields?.kind === 'stdio';
    C.ok(ok5, 'MR05',
      '冲突拒绝（注入路）：sqlite=… 与内置 id 冲突 → warn（固定子串 + fields.serverId=sqlite/kind=stdio）+ 拒绝该条；entries 恰 1 条（good）；无异常进程继续',
      { expected: '1 条 good + 1 次 warn', actual: JSON.stringify({ entries: reg5.entries, collected }), ctx: 'buildMcpRegistry({ warn: collector })——语义冲突 ≠ fail-fast' });
  }

  /* ---------- MR06 · 冲突拒绝（默认 logger 路：独立 node -e 子进程） ---------- */
  {
    const code = `import { pathToFileURL } from 'node:url';
const m = await import(pathToFileURL(${JSON.stringify(REGISTRY_DIST)}).href);
m.buildMcpRegistry({ mcpHttpServers: 'fetch=http://127.0.0.1:9/mcp' });
console.log('MR06_DONE');`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { out += d; });
    const exit6 = await new Promise((resolve) => { child.once('error', (e) => resolve(String(e?.message ?? e))); child.once('exit', (c) => resolve(c)); });
    C.ok(exit6 === 0 && out.includes('外部 MCP 注册名与内置 id 冲突') && out.includes('"serverId":"fetch"') && out.includes('MR06_DONE'), 'MR06',
      '冲突拒绝（默认路）：独立 node -e 带 fetch=http://… 冲突源 → stdout 含 pino warn 固定子串「外部 MCP 注册名与内置 id 冲突」+ serverId 字段 + 完成标记、退出码 0（进程不退出）',
      { expected: 'code=0 + warn 子串 + serverId + MR06_DONE', actual: `exit=${String(exit6)} out=${JSON.stringify(out.slice(0, 400))}`, ctx: '默认 warn = logger.warn（pino JSON 单行 stdout）' });
  }

  /* ---------- MR07 · HTTP 发现 + 缓存 ---------- */
  mockHttp = await startMockHttpMcp();
  {
    const reg7 = registryMod.buildMcpRegistry({ mcpHttpServers: `mock-http=${mockHttp.url}/mcp` });
    const t1 = await reg7.discoverTools('mock-http');
    const t2 = await reg7.discoverTools('mock-http');
    const initCount = mockHttp.requests.filter((r) => r.method === 'POST' && r.body?.method === 'initialize').length;
    C.ok(deepEqual(t1, EXPECT_TOOLS) && deepEqual(t2, EXPECT_TOOLS) && reg7.discoveryCount('mock-http') === 1 && initCount === 1, 'MR07',
      'HTTP 发现 + 缓存：discoverTools("mock-http") → EXPECT_TOOLS deepEqual；再次发现命中缓存（discoveryCount=1 + mock initialize 请求数仍 1，零重连零出站）',
      { expected: `${JSON.stringify(EXPECT_TOOLS)} + count=1 + init=1`, actual: `tools=${JSON.stringify(t2)} count=${reg7.discoveryCount('mock-http')} init=${initCount}`, ctx: `endpoint: ${mockHttp.url}/mcp（进程内 node:http mock）` });
  }

  /* ---------- MR08 · stdio 发现 + 缓存 + 无孤儿 ---------- */
  {
    let nodeCmd = null;
    let cmdErr = null;
    try { nodeCmd = await resolveNodeCommandToken(); } catch (e) { cmdErr = String(e?.message ?? e); }
    if (!nodeCmd) {
      C.fail('MR08', 'stdio 发现：command token 解析（execPath 含空格时 8.3 短名绕行）', { expected: '无空格 command token', actual: cmdErr, ctx: process.execPath });
    } else {
      const reg8 = registryMod.buildMcpRegistry({ mcpStdioServers: `mock-stdio=${nodeCmd} ${FIXTURE}` });
      const tools8 = await reg8.discoverTools('mock-stdio');
      const pid8 = reg8.stdioPidOf('mock-stdio');
      const tools8b = await reg8.discoverTools('mock-stdio');   /* 缓存命中（不再触子进程） */
      let orphan = '未取到 pid';
      if (typeof pid8 === 'number' && pid8 > 0) {
        const t0 = Date.now();
        for (;;) {
          let alive = true;
          try { process.kill(pid8, 0); } catch { alive = false; }
          if (!alive) { orphan = '已退出'; break; }
          if (Date.now() - t0 > 2000) { orphan = `pid=${pid8} 轮询 2s 后仍存活`; break; }
          await sleep(50);
        }
      }
      C.ok(deepEqual(tools8, EXPECT_TOOLS) && deepEqual(tools8b, EXPECT_TOOLS) && reg8.discoveryCount('mock-stdio') === 1 && orphan === '已退出', 'MR08',
        'stdio 发现 + 缓存 + 无孤儿：discoverTools → EXPECT_TOOLS deepEqual；再次发现命中缓存（count=1）；stdioPidOf 取 pid 后 process.kill(pid,0) 轮询（50ms×40 上限 2s）至子进程退出（发现即关，沿 MT09 探针形态）',
        { expected: 'deepEqual + count=1 + 已退出', actual: `tools=${JSON.stringify(tools8b)} count=${reg8.discoveryCount('mock-stdio')} pid=${String(pid8)} 孤儿=${orphan}`, ctx: `spawn: ${path.basename(nodeCmd)} ${path.basename(FIXTURE)}` });
    }
  }

  /* ---------- MR09 · 内置清单防漂移（IMPL 键集 ↔ BUILTIN_MCP_IDS） ---------- */
  {
    const toolsMod = await import(pathToFileURL(path.join(DIST_DIR, 'tools.js')).href);
    const implKeys = Object.keys(toolsMod.IMPL).sort();
    const builtin = [...registryMod.BUILTIN_MCP_IDS].sort();
    C.ok(deepEqual(implKeys, builtin), 'MR09',
      '内置清单防漂移：dist/tools.js IMPL 键集排序 deepEqual registry 导出 BUILTIN_MCP_IDS 排序（五 id 单一事实源机器锚）',
      { expected: JSON.stringify(builtin), actual: JSON.stringify(implKeys), ctx: 'filesystem/fetch/sqlite/browser/web-search（ADR §6.3）' });
  }

  /* ---------- MR10 · 源扫描（AC7 机器化，与 MT12 互证） ---------- */
  {
    const hits = [];
    for (const [label, abs] of [['registry.ts', path.join(REPO_ROOT, 'apps', 'server', 'src', 'mcp', 'registry.ts')], ['config.ts', path.join(REPO_ROOT, 'apps', 'server', 'src', 'config.ts')]]) {
      let src = null;
      try { src = readFileSync(abs, 'utf8'); } catch (e) { hits.push(`${label}: 不可读 ${e?.message ?? e}`); continue; }
      src.split(/\r?\n/).forEach((l, i) => { if (/shell/i.test(l)) hits.push(`${label}:${i + 1}: ${l.trim()}`); });
    }
    C.ok(hits.length === 0, 'MR10',
      '源扫描（AC7）：readFileSync src/mcp/registry.ts + src/config.ts，/shell/ 零命中（registry 只把解析出的 argv 传给 createStdioMcpConnection，无命令拼接/解释形态）',
      { expected: '0 命中', actual: hits.length === 0 ? '0 命中' : hits.join(' | '), ctx: `dir: apps/server/src（${path.sep === '\\' ? 'win32' : process.platform}）` });
  }

  /* ---------- MR11 · 空注册表基线（AC1 直接断言） ---------- */
  {
    const sources = registryMod.envLoader();
    const reg11 = registryMod.buildMcpRegistry(sources);
    let rejected = null;
    try { await reg11.discoverTools('any'); } catch (e) { rejected = e; }
    const ok11 = sources.mcpHttpServers === undefined && sources.mcpStdioServers === undefined
      && reg11.entries.length === 0 && !reg11.has('filesystem') && !reg11.has('anything')
      && /未注册的 MCP server/.test(String(rejected?.message ?? ''));
    C.ok(ok11, 'MR11',
      '空注册表基线：envLoader（两 env 未设）→ 空注册表（0 条目、has() 恒 false、sources 两值 undefined）；discoverTools("any") → reject 含「未注册的 MCP server」（AC1 空注册表零副作用）',
      { expected: '0 条 + reject 未注册', actual: JSON.stringify({ sources, n: reg11.entries.length, err: String(rejected?.message ?? '无') }), ctx: 'main() 起始已 delete 两 env（确定性）' });
  }
}

/* ---------- 运行器：fail-fast + finally 清理 + 汇总 + 退出码（mcp-transport.mjs 先例） ---------- */
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
console.log(`==== smoke:mcp:registry：${C.passed} passed / ${C.failed} failed ====`);
process.exit(C.failed === 0 ? 0 : 1);
