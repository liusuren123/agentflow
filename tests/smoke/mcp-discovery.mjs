#!/usr/bin/env node
/* ================================================================
 *  mcp-discovery.mjs — BK-0014 扩展发现器独立冒烟（MC01-MC22）· 迭代 0071 · SPEC §6.3
 *  进程内组（MC01-MC17）：直测 apps/server/dist/mcp/*.js（mcp-registry.mjs
 *  「dist 进程内直测」先例形态），扫描根经 DiscoverOptions 注入缝供 fixture
 *  副本（tmp 拷贝；链接/oversize/上限应力等运行时增补——git 不保链接形态，
 *  实际手段本头注存证）。子进程组（MC18-MC22）：startServer 真实接线 E2E，
 *  fixture 写真实仓库根（存在性守卫 + finally 必达清理）。
 *  审计断言 = better-sqlite3 只读直查 data/agentflow.db 的 discovery_audits
 *  （delta 口径隔离多次扫描）。fail-fast + finally 清理 + SIGINT/SIGBREAK；
 *  汇总 `==== smoke:mcp:discovery：X passed / Y failed ====`,
 *  退出码 failed===0?0:1。
 *  ================================================================ */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { Checker, SmokeFailError, deepEqual, getFreePort, sleep, startServer, api } from './lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_DIR = path.join(REPO_ROOT, 'apps', 'server', 'dist');
const FIXTURE_ROOT = path.join(REPO_ROOT, 'tests', 'smoke', 'fixtures', 'discovery');
const DB_FILE = path.join(REPO_ROOT, 'data', 'agentflow.db');
const C = new Checker();

/* env 干净化（显式空串压制宿主/.env 泄入，config 空串归一未配置）+ 放行回环
 * （mcp-inject.mjs:235 同款：主进程 env 于 dist import 前定型，127.0.0.1 mock 可达） */
process.env.MCP_HTTP_SERVERS = '';
process.env.MCP_STDIO_SERVERS = '';
process.env.MCP_DISCOVERY_SOURCES = '';
process.env.MCP_DISCOVERY_ALLOW = '';
process.env.ALLOW_PRIVATE_NET = '1';

const MOCK_TOOLS = [
  { name: 'echo', description: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
];
const EXPECT_TOOLS = [
  { name: 'echo', desc: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
];
const SESSION_ID = 'mock-session-1';
const SKILL_BODY = fs.readFileSync(path.join(FIXTURE_ROOT, 'project', '.agents', 'skills', 'fixture-skill', 'SKILL.md'), 'utf8');
const RULE_BODY = fs.readFileSync(path.join(FIXTURE_ROOT, 'project', '.agents', 'rules', 'fixture-rule.md'), 'utf8');
const BIG_SENTINEL = 'OVERSIZE-SENTINEL-q7z9';
const PLACEHOLDER = 'http://127.0.0.1:0/mcp';

/* ---------- 进程内 mock HTTP MCP（mcp-registry.mjs 同源裁剪：initialize + tools/list） ---------- */
function startMockHttpMcp() {
  return new Promise((resolve) => {
    const requests = [];
    const srv = http.createServer((req, res) => {
      const bufs = [];
      req.on('data', (c) => bufs.push(c));
      req.on('end', () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { /* 容忍 */ }
        requests.push({ method: req.method, body });
        const reply = (status, obj) => {
          try {
            if (obj === undefined) { res.writeHead(status); res.end(); }
            else { res.writeHead(status, { 'Content-Type': 'application/json', 'Mcp-Session-Id': SESSION_ID }); res.end(JSON.stringify(obj)); }
          } catch { /* 客户端已断开容忍 */ }
        };
        if (req.method === 'DELETE') { reply(405); return; }
        if (req.method !== 'POST' || !body) { reply(405); return; }
        if (body.id === undefined || body.id === null) { reply(202); return; }
        if (body.method === 'initialize') {
          reply(200, { jsonrpc: '2.0', id: body.id, result: { protocolVersion: body.params?.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'mock-http-mcp', version: '1.0.0' } } });
        } else if (body.method === 'tools/list') {
          reply(200, { jsonrpc: '2.0', id: body.id, result: { tools: MOCK_TOOLS } });
        } else reply(200, { jsonrpc: '2.0', id: body.id, error: { code: -32601, message: '未知 method' } });
      });
    });
    getFreePort().then((port) => { srv.listen(port, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${port}`, requests })); });
  });
}

/* ---------- fixture / 审计读面 ---------- */
const TMP_BASE = fs.mkdtempSync(path.join(os.tmpdir(), 'af-disc-'));
let tmpSeq = 0;
const NOPE = path.join(TMP_BASE, 'definitely-missing');   /* 恒不存在路径（零 fs 触碰断言锚） */
function copyFixture(name) {
  const dest = path.join(TMP_BASE, `c${++tmpSeq}`, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(path.join(FIXTURE_ROOT, name), dest, { recursive: true });
  return dest;
}
function rewriteUrl(projRoot, rel, url) {
  const p = path.join(projRoot, rel);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').split(PLACEHOLDER).join(url));
}
let auditDb = null;
function auditCount(kind, entry) {
  try {
    if (!auditDb) {
      if (!fs.existsSync(DB_FILE)) return 0;
      auditDb = new Database(DB_FILE, { readonly: true });
      auditDb.pragma('busy_timeout = 2000');
    }
    return entry === undefined
      ? auditDb.prepare('SELECT COUNT(*) AS n FROM discovery_audits WHERE kind = ?').get(kind).n
      : auditDb.prepare('SELECT COUNT(*) AS n FROM discovery_audits WHERE kind = ? AND entry = ?').get(kind, entry).n;
  } catch { return 0; }   /* 表未建 = 零行语义（delta 断言安全侧：漏写会红，不虚绿） */
}
function auditSummaryHits(needle) {
  try { return auditDb.prepare('SELECT COUNT(*) AS n FROM discovery_audits WHERE summary LIKE ?').get(`%${needle}%`).n; }
  catch { return -1; }
}
async function stopServer(srv) {
  try { srv.child.kill('SIGTERM'); } catch { /* 已退出 */ }
  const info = await Promise.race([srv.exitPromise, sleep(5000).then(() => null)]);
  if (!info) { try { srv.child.kill('SIGKILL'); } catch { /* 已退出 */ } await sleep(200); }
}
async function cleanup() {
  if (mockHttp) {
    const srv = mockHttp.srv;
    mockHttp = null;
    try { srv.closeAllConnections(); } catch { /* 旧版 Node 无此 API */ }
    await new Promise((r) => srv.close(r));
  }
}
async function expectFastFail(env) {
  let srv = null;
  let boom = null;
  try { srv = await startServer(await getFreePort(), { env }, 10000); } catch (e) { boom = e; }
  if (srv) { await stopServer(srv); return null; }
  return { msg: String(boom?.message ?? ''), tail: String(boom?.logTail ?? '') };
}

const C_ALL = ['project-mcp', 'project-agents', 'home-agents'].join(',');
let mockHttp = null;
let discoveryMod = null;
let registryMod = null;

async function main() {
  /* ---------- 前置：dist 产物在位（缺失 → 全量 FAIL + 可操作报错，MR01 先例） ---------- */
  const distFiles = ['mcp/discovery.js', 'mcp/discovery-audit.js', 'mcp/registry.js', 'guard.js', 'server.js'].map((f) => path.join(DIST_DIR, f));
  const missing = distFiles.filter((f) => !fs.existsSync(f));
  const MC_IDS = Array.from({ length: 22 }, (_, i) => `MC${String(i + 1).padStart(2, '0')}`);
  if (missing.length > 0) {
    for (const id of MC_IDS)
      C.fail(id, '（apps/server/dist 产物不可用，本条无法执行）', { expected: 'dist 产物在位', actual: `缺失：${missing.map((m) => path.relative(DIST_DIR, m)).join(', ')}（请先 npm run build:server）`, ctx: DIST_DIR });
    return;
  }
  discoveryMod = await import(pathToFileURL(path.join(DIST_DIR, 'mcp', 'discovery.js')).href);
  registryMod = await import(pathToFileURL(path.join(DIST_DIR, 'mcp', 'registry.js')).href);
  const { mcpFetch } = await import(pathToFileURL(path.join(DIST_DIR, 'guard.js')).href);

  /* ---------- MC01 · SOURCES+ALLOW 全链（AC3）+ MC02 · 恰一行 allow-hit ---------- */
  {
    mockHttp = await startMockHttpMcp();
    const proj = copyFixture('project');
    rewriteUrl(proj, '.mcp.json', `${mockHttp.url}/mcp`);
    const loader = () => ({
      discoverySources: 'project-mcp,project-agents',
      discoveryAllow: 'project-mcp:fixture-server,project-agents:fixture-skill,project-agents:fixture-rule',
    });
    const bHit = auditCount('allow-hit', 'fixture-server');
    const bCand = auditCount('candidate');
    discoveryMod.resetDiscoverySnapshotForTest();
    const src = discoveryMod.composeSources(loader, { projectRoot: proj, homeDir: NOPE });
    const reg = registryMod.buildMcpRegistry(src, { httpFetch: mcpFetch });
    const tools = await reg.discoverTools('fixture-server');
    const reg2 = registryMod.buildMcpRegistry(discoveryMod.composeSources(() => ({}), { projectRoot: proj }), { warn: () => {} });
    const external = reg2.entries.map((e) => ({ serverId: e.serverId, kind: e.kind }));
    const bad1 = [];
    if (!deepEqual(src.discoveredEntries, [{ kind: 'http', serverId: 'fixture-server', url: `${mockHttp.url}/mcp` }])) bad1.push(`entries=${JSON.stringify(src.discoveredEntries)}`);
    if (!reg.has('fixture-server')) bad1.push('registry 缺 fixture-server');
    if (!deepEqual(tools, EXPECT_TOOLS)) bad1.push(`tools=${JSON.stringify(tools)}`);
    if (!deepEqual(external, [{ serverId: 'fixture-server', kind: 'http' }])) bad1.push(`external=${JSON.stringify(external)}`);
    C.ok(bad1.length === 0, 'MC01', 'SOURCES+ALLOW 全链（AC3）：composeSources.discoveredEntries=fixture http 条目；buildMcpRegistry 合并后 has=true；discoverTools 经 httpFetch=mcpFetch 对进程内 mock tools/list 成功；capabilities 同构实例 external 含该条目',
      { expected: '全链打通', actual: bad1.length ? bad1.join(' | ') : '全符合', ctx: `mock ${mockHttp.url}/mcp；projectRoot=${proj}` });
    C.ok(auditCount('allow-hit', 'fixture-server') - bHit === 1 && auditCount('candidate') - bCand >= 4, 'MC02',
      '恰一行 allow-hit（AC3）：fixture-server 的 allow-hit 审计行每快照构建恰 +1（candidate 含 skill/rule 共 ≥4 行并存）',
      { expected: 'delta allow-hit=1', actual: `delta=${auditCount('allow-hit', 'fixture-server') - bHit} candDelta=${auditCount('candidate') - bCand}`, ctx: 'sqlite 直查 discovery_audits（delta 口径）' });
  }

  /* ---------- MC03 · 仅 SOURCES 零激活（AC2，含 home-agents 注入根） ---------- */
  {
    const proj = copyFixture('project');
    const home = copyFixture('home');
    const bCandByEntry = {};
    for (const e of ['fixture-server', 'agents-server', 'fixture-skill', 'fixture-rule', 'home-skill', 'home-rule']) bCandByEntry[e] = auditCount('candidate', e);
    const reqBefore = mockHttp.requests.length;
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap = discoveryMod.discoverCandidates({ sources: C_ALL }, { projectRoot: proj, homeDir: home });
    const b = [];
    if (snap.entries.length !== 0 || snap.skills.length !== 0 || snap.rules.length !== 0) b.push(`快照非空=${JSON.stringify(snap)}`);
    for (const [e, before] of Object.entries(bCandByEntry))
      if (auditCount('candidate', e) - before < 1) b.push(`candidate 行缺失：${e}`);
    if (mockHttp.requests.length !== reqBefore) b.push('mock 收到请求（零出站被破）');
    C.ok(b.length === 0, 'MC03', '仅 SOURCES 零激活（AC2）：快照零 body 载荷（entries/skills/rules 空集=零激活语义）；六候选（两源 mcp+两 skill+两 rule，含 home-agents 注入根）逐条 candidate 行；零出站（mock 请求零增量）',
      { expected: '空快照 + 六候选行 + 零出站', actual: b.length ? b.join(' | ') : '全符合', ctx: 'SOURCES=三源；homeDir=fixture 副本（非真实 ~）' });
  }

  /* ---------- MC04 · 零配置零行为（AC1） ---------- */
  {
    const bAny = auditCount('scan') + auditCount('candidate') + auditCount('allow-hit') + auditCount('parse-fail');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap = discoveryMod.discoverCandidates({}, { projectRoot: NOPE, homeDir: NOPE });
    const comp = discoveryMod.composeSources(() => ({ mcpHttpServers: 'x=http://a.example/mcp' }), { projectRoot: NOPE });
    const bAny2 = auditCount('scan') + auditCount('candidate') + auditCount('allow-hit') + auditCount('parse-fail');
    const ok4 = deepEqual(snap, { entries: [], skills: [], rules: [], counts: { 'project-mcp': { mcp: 0, skill: 0, rule: 0, parseFail: 0 }, 'project-agents': { mcp: 0, skill: 0, rule: 0, parseFail: 0 }, 'home-agents': { mcp: 0, skill: 0, rule: 0, parseFail: 0 } } })
      && bAny2 === bAny
      && deepEqual(comp, { mcpHttpServers: 'x=http://a.example/mcp', discoveredEntries: [] });
    C.ok(ok4, 'MC04', '零配置零行为（AC1）：两 key 缺省 → 空快照（projectRoot 指向不存在路径不抛错不读盘）、审计零新行、composeSources 输出 = loader() + discoveredEntries:[]（deepEqual）',
      { expected: '空快照 + 审计零行 + compose 恒等', actual: JSON.stringify({ snapEmpty: snap.entries.length + snap.skills.length + snap.rules.length === 0, auditDelta: bAny2 - bAny, comp }), ctx: '短路于任何 IO 前' });
  }

  /* ---------- MC05 · discoveredSysExtension 三态（经生产接缝 composeSources 供快照） ---------- */
  {
    discoveryMod.resetDiscoverySnapshotForTest();
    const zero = discoveryMod.discoveredSysExtension({ projectRoot: NOPE });
    discoveryMod.resetDiscoverySnapshotForTest();
    discoveryMod.composeSources(() => ({ discoverySources: 'project-agents' }), { projectRoot: copyFixture('project') });
    const scanOnly = discoveryMod.discoveredSysExtension();
    discoveryMod.resetDiscoverySnapshotForTest();
    discoveryMod.composeSources(() => ({ discoverySources: 'project-agents', discoveryAllow: 'project-agents:fixture-skill,project-agents:fixture-rule' }), { projectRoot: copyFixture('project') });
    const full = discoveryMod.discoveredSysExtension();
    const expectFull = `\n\n【发现技能 fixture-skill】\n${SKILL_BODY}\n\n【规则 fixture-rule】\n${RULE_BODY}`;
    const ok5 = zero === '' && scanOnly === '' && deepEqual(full, expectFull);
    C.ok(ok5, 'MC05', 'discoveredSysExtension 三态：零配置 \'\'；仅 SOURCES \'\'（快照零激活条目）；SOURCES+ALLOW 输出【发现技能 …】+正文、【规则 …】+正文且序=skills 先 rules 后（deepEqual 全文）',
      { expected: "'' / '' / 全文等值", actual: JSON.stringify({ zero: zero.length, scanOnly: scanOnly.length, fullEq: deepEqual(full, expectFull) }), ctx: `锚子串「【发现技能 」「【规则 」full=${JSON.stringify(full.slice(0, 60))}…` });
  }

  /* ---------- MC06 · 6000 字节截断 ---------- */
  {
    const proj = copyFixture('project');
    fs.writeFileSync(path.join(proj, '.agents', 'skills', 'fixture-skill', 'SKILL.md'), 'a'.repeat(7000), 'utf8');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap = discoveryMod.discoverCandidates({ sources: 'project-agents', allow: 'project-agents:fixture-skill' }, { projectRoot: proj });
    const body = snap.skills[0]?.body ?? '';
    C.ok(body.length === 6001 && body.endsWith('…') && body.startsWith('aaaa'), 'MC06',
      '6000 字节截断：>6000 字节 ASCII 正文 ALLOW 后 body 长=6000+1（…），尾字符 …，内容为截断正文',
      { expected: 'length=6001 + endsWith(…)', actual: `length=${body.length} tail=${JSON.stringify(body.slice(-2))}`, ctx: 'clipBody = Buffer.byteLength 口径 + … 尾标' });
  }

  /* ---------- MC07-MC12 · 纪律矩阵（AC7；链接/oversize/上限为运行时增补） ---------- */
  {
    /* MC07 符号链接（win32 = junction 免特权；POSIX = dir 符号链接） */
    const proj = copyFixture('project');
    const linkPath = path.join(proj, '.agents', 'skills', 'link-skill');
    let linkMade = true;
    try { fs.symlinkSync(path.join(proj, '.agents', 'skills', 'fixture-skill'), linkPath, process.platform === 'win32' ? 'junction' : 'dir'); }
    catch { linkMade = false; }
    const bF = auditCount('parse-fail', 'link-skill');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap = discoveryMod.discoverCandidates({ sources: 'project-agents', allow: 'project-agents:link-skill,project-agents:fixture-skill' }, { projectRoot: proj });
    C.ok(!linkMade || (auditCount('parse-fail', 'link-skill') - bF === 1 && snap.skills.length === 1 && snap.skills[0]?.name === 'fixture-skill' && auditCount('candidate', 'link-skill') === 0), 'MC07',
      '符号链接不入扫描（AC7）：link-skill（junction/符号链接）→ parse-fail 行 + 条目缺席 + 零 candidate 行；他条（fixture-skill）不受阻断',
      { expected: 'parse-fail=1 + 仅 fixture-skill 入快照', actual: linkMade ? `pf=${auditCount('parse-fail', 'link-skill') - bF} skills=${JSON.stringify(snap.skills.map((s) => s.name))}` : 'SKIP：链接创建失败（平台不支持）', ctx: 'lstat isSymbolicLink → 不入扫描（比 tree.ts 更严：链接本体形态都不取）' });

    /* MC08 .git / FOLD 名单 */
    const proj8 = copyFixture('project');
    for (const d of ['.git', 'node_modules']) {
      fs.mkdirSync(path.join(proj8, '.agents', 'skills', d, 'inner'), { recursive: true });
      fs.writeFileSync(path.join(proj8, '.agents', 'skills', d, 'inner', 'SKILL.md'), 'x');
    }
    fs.writeFileSync(path.join(proj8, '.agents', 'rules', 'data.md'), 'x');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap8 = discoveryMod.discoverCandidates({ sources: 'project-agents', allow: 'project-agents:fixture-skill' }, { projectRoot: proj8 });
    const pf8 = ['.git', 'node_modules', 'data'].map((e) => auditCount('parse-fail', e)).reduce((a, x) => a + (x > 0 ? 1 : 0), 0);
    C.ok(pf8 === 3 && snap8.skills.length === 1 && snap8.skills[0]?.name === 'fixture-skill' && snap8.counts['project-agents'].parseFail === 3, 'MC08',
      '.git/FOLD 域恒排除（AC7）：skills/.git、skills/node_modules、rules/data.md 三条 parse-fail；他条（fixture-skill）保留',
      { expected: '3 条 parse-fail + fixture-skill 保留', actual: `pfHit=${pf8} skills=${JSON.stringify(snap8.skills.map((s) => s.name))} parseFail=${snap8.counts['project-agents'].parseFail}`, ctx: 'EXCLUDE = .git + FOLD（tree.ts:34 字面）' });

    /* MC09 oversize 不读内容（哨兵佐证：条目与正文不出现在任何审计/快照） */
    const proj9 = copyFixture('project');
    fs.writeFileSync(path.join(proj9, '.agents', 'rules', 'big.md'), (BIG_SENTINEL + '\n' + 'a'.repeat(1023) + '\n').repeat(300), 'utf8');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap9 = discoveryMod.discoverCandidates({ sources: 'project-agents', allow: 'project-agents:big' }, { projectRoot: proj9 });
    C.ok(auditCount('parse-fail', 'big') > 0 && snap9.rules.length === 0 && auditSummaryHits(BIG_SENTINEL) === 0 && !JSON.stringify(snap9).includes(BIG_SENTINEL), 'MC09',
      'oversize 不读内容（AC7）：>256KiB big.md → parse-fail 行；零快照条目；哨兵串零出现于审计 summary 与快照（lstat size 判定，内容未被读取的佐证）',
      { expected: 'parse-fail + 哨兵零泄漏', actual: `pfBig=${auditCount('parse-fail', 'big')} rules=${snap9.rules.length} sumHits=${auditSummaryHits(BIG_SENTINEL)}`, ctx: 'oversize 判定仅靠 lstatSync().size' });

    /* MC10 非法名称 */
    const proj10 = copyFixture('badname');
    fs.mkdirSync(path.join(proj10, '.agents', 'skills', 'bad$name', 'x'), { recursive: true });
    fs.writeFileSync(path.join(proj10, '.agents', 'skills', 'bad$name', 'x', 'SKILL.md'), 'x');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap10 = discoveryMod.discoverCandidates({ sources: 'project-mcp,project-agents', allow: 'project-mcp:good-entry' }, { projectRoot: proj10, homeDir: NOPE });
    C.ok(deepEqual(snap10.entries, [{ kind: 'http', serverId: 'good-entry', url: 'http://127.0.0.1:9/mcp' }])
      && auditCount('parse-fail', 'bad.name') > 0 && auditCount('parse-fail', 'bad$name') > 0, 'MC10',
      '非法名称条目（AC7）：mcp 键 bad.name 与 skill 目录 bad$name 均 parse-fail；他条（good-entry）保留并入快照',
      { expected: '两 parse-fail + good-entry 激活', actual: JSON.stringify({ entries: snap10.entries, pfBadName: auditCount('parse-fail', 'bad.name'), pfBadSkill: auditCount('parse-fail', 'bad$name') }), ctx: 'NAME_RE = registry.ts 同一名称域（本轮转 export 复用）' });

    /* MC11 坏 JSON 整源 parse-fail */
    const proj11 = copyFixture('badjson');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap11 = discoveryMod.discoverCandidates({ sources: 'project-mcp' }, { projectRoot: proj11, homeDir: NOPE });
    C.ok(snap11.entries.length === 0 && auditCount('parse-fail', '-') > 0 && snap11.counts['project-mcp'].parseFail === 1, 'MC11',
      '坏 JSON 整源 parse-fail（AC7）：非法 .mcp.json → 整源 parse-fail（entry=-）+ 空集 + 进程不退（本断言可达即证）',
      { expected: '空集 + parse-fail=1', actual: JSON.stringify({ n: snap11.entries.length, pf: snap11.counts['project-mcp'] }), ctx: '扫描层 fail-open 分层（ADR-0023 §2.3）' });

    /* MC12 每源 rules ≤32 上限截断（65 条运行时生成——「实际手段」注记，SPEC §6.3） */
    const proj12 = copyFixture('project');
    for (let i = 0; i < 65; i++) fs.writeFileSync(path.join(proj12, '.agents', 'rules', `r${String(i).padStart(2, '0')}.md`), `rule ${i}`);
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap12 = discoveryMod.discoverCandidates({ sources: 'project-agents' }, { projectRoot: proj12 });
    C.ok(snap12.counts['project-agents'].rule === 32 && snap12.counts['project-agents'].parseFail === 1, 'MC12',
      '每源 rules ≤32 上限（AC7）：65 条 rule → 恰接受 32（排序后字典序前 32）+ 1 条上限 parse-fail，后续全部跳过',
      { expected: 'rule=32 + parseFail=1', actual: JSON.stringify(snap12.counts['project-agents']), ctx: '65 个 rule 文件运行时生成进 tmp 副本（实际手段：文件生成而非目录应力）' });
  }

  /* ---------- MC13 · 根缺失合法空态 ---------- */
  {
    const emptyDir = path.join(TMP_BASE, `c${++tmpSeq}`, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const bScan = auditCount('scan');
    const bPf = auditCount('parse-fail');
    discoveryMod.resetDiscoverySnapshotForTest();
    const snap = discoveryMod.discoverCandidates({ sources: C_ALL }, { projectRoot: emptyDir, homeDir: emptyDir });
    const scanDelta = auditCount('scan') - bScan;
    const pfDelta = auditCount('parse-fail') - bPf;
    const allZero = Object.values(snap.counts).every((c) => c.mcp === 0 && c.skill === 0 && c.rule === 0 && c.parseFail === 0);
    C.ok(allZero && scanDelta === 3 && pfDelta === 0, 'MC13',
      '根缺失合法空态：三源 scan 行齐（计数全 0）、零 parse-fail、零 warn（空态非失败）',
      { expected: 'scan=3 + parseFail=0 + 计数全 0', actual: JSON.stringify({ scanDelta, pfDelta, allZero }), ctx: '与「未配置」唯一差别 = 多一行 scan 审计' });
  }

  /* ---------- MC14/MC15 · 两纯函数矩阵（AC4 静态层） ---------- */
  {
    const pss = discoveryMod.parseDiscoverySourcesSpec;
    const pas = discoveryMod.parseDiscoveryAllowSpec;
    const bad14 = [];
    if (!deepEqual(pss('   '), { entries: [], problems: [] })) bad14.push('空白≠未配置');
    if (!deepEqual(pss(' home-agents , project-mcp ').entries, ['home-agents', 'project-mcp'])) bad14.push('声明序不保');
    for (const [spec, kw] of [['nope', '条目 1：未知扫描源：nope'], ['project-mcp,project-mcp', '条目 2：扫描源重复'], ['project-mcp,', '条目 2：空条目']])
      if (!pss(spec).problems.some((p) => p.includes(kw))) bad14.push(`${spec} → ${JSON.stringify(pss(spec).problems)}`);
    C.ok(bad14.length === 0, 'MC14', 'parseDiscoverySourcesSpec 矩阵（AC4）：空白=未配置；声明序保留；未知源/重复/空条目 problems 含「条目 N：」前缀与原因',
      { expected: '全符合', actual: bad14.length ? bad14.join(' | ') : '全符合', ctx: 'config.ts zod superRefine 复用同一实现（零漂移）' });
    const bad15 = [];
    if (!deepEqual(pas(' project-mcp:abc '), { entries: [{ source: 'project-mcp', name: 'abc' }], problems: [] })) bad15.push('合法正例');
    for (const [spec, kw] of [['abc', '须为 源:名称 形态'], ['project-mcp:', '须为 源:名称 形态'], ['nope:x', '未知扫描源'], ['project-mcp:b@d', '非法字符'], ['project-mcp:a,project-mcp:a', '条目重复'], ['project-mcp:a,,project-mcp:b', '空条目']])
      if (!pas(spec).problems.some((p) => p.includes(kw))) bad15.push(`${spec} → ${JSON.stringify(pas(spec).problems)}`);
    C.ok(bad15.length === 0, 'MC15', 'parseDiscoveryAllowSpec 矩阵（AC4）：缺冒号/空段/未知源/非法名/重复/空条目逐形态 problems 命中',
      { expected: '全符合', actual: bad15.length ? bad15.join(' | ') : '全符合', ctx: '首个冒号分割（NAME_RE 无冒故唯一）' });
  }

  /* ---------- MC16 · 合并重名拒绝（AC6）+ MC17 · discovery 臂不抛错 ---------- */
  {
    const collected = [];
    const reg16 = registryMod.buildMcpRegistry({
      mcpHttpServers: 'fixture-server=http://127.0.0.1:9/mcp',
      discoveredEntries: [
        { kind: 'http', serverId: 'fixture-server', url: 'http://127.0.0.1:9/mcp' },
        { kind: 'http', serverId: 'filesystem', url: 'http://127.0.0.1:9/mcp' },
      ],
    }, { warn: (f, m) => collected.push({ f, m }) });
    const ok16 = collected.length === 2 && collected.every((x) => x.m.includes('已拒绝该 discovery 条'))
      && reg16.entries.length === 1 && reg16.has('fixture-server') && !reg16.has('filesystem');
    C.ok(ok16, 'MC16', '合并重名拒绝（AC6）：discoveredEntries 与 env 条目同名 / 与 BUILTIN_MCP_IDS 同名 → warn 锚「已拒绝该 discovery 条」各一次；env 条目保留、注册表整体可用',
      { expected: '2 warn + env 条保留', actual: JSON.stringify({ warns: collected.map((x) => x.m.slice(0, 30)), entries: reg16.entries.map((e) => e.serverId) }), ctx: 'registry.ts discovery 合并臂（v1 语义零改动）' });
    const collected17 = [];
    let threw = null;
    let reg17 = null;
    try {
      reg17 = registryMod.buildMcpRegistry({
        discoveredEntries: [
          { kind: 'http', serverId: 'bad-url', url: 'notaurl' },
          { kind: 'weird', serverId: 'weird-k' },
          { kind: 'stdio', serverId: 'ok-stdio', command: 'node', args: ['--version'] },
        ],
      }, { warn: (f, m) => collected17.push(m) });
    } catch (e) { threw = e; }
    C.ok(!threw && reg17 !== null && !reg17.has('bad-url') && !reg17.has('weird-k') && reg17.has('ok-stdio') && collected17.length === 2, 'MC17',
      'discovery 臂不抛错（理论不可达防御）：直调 buildMcpRegistry 注入问题条目（非法 URL / 非法 kind）→ 不触发抛错通道、问题条被拒（warn）、合法条接受',
      { expected: '不抛错 + 2 拒 1 收', actual: `threw=${String(threw?.message ?? '无')} has=${JSON.stringify({ badUrl: reg17?.has('bad-url'), weird: reg17?.has('weird-k'), ok: reg17?.has('ok-stdio') })}`, ctx: 'discoveredEntryProblem 形状复核（:122 抛错通道不适用于 discovery 臂）' });
  }

  /* ---------- MC18-MC22 · 子进程组（真实接线 E2E；fixture 写真实仓库根） ---------- */
  const REPO_MCP = path.join(REPO_ROOT, '.mcp.json');
  const REPO_AGENTS = path.join(REPO_ROOT, '.agents');
  const guardHit = fs.existsSync(REPO_MCP) || fs.existsSync(REPO_AGENTS);
  const writeRepoFixtures = () => {
    fs.writeFileSync(REPO_MCP, JSON.stringify({ mcpServers: { 'mc19-server': { url: 'http://127.0.0.1:9/mcp' } } }, null, 2));
    fs.mkdirSync(path.join(REPO_AGENTS, 'skills', 'mc19-skill'), { recursive: true });
    fs.writeFileSync(path.join(REPO_AGENTS, 'skills', 'mc19-skill', 'SKILL.md'), '# mc19-skill\nSUBPROCESS-SLOGAN-k2p8\n');
    fs.mkdirSync(path.join(REPO_AGENTS, 'rules'), { recursive: true });
    fs.writeFileSync(path.join(REPO_AGENTS, 'rules', 'mc19-rule.md'), 'SUBPROCESS-RULE-m4n6\n');
  };
  const cleanRepoFixtures = () => {
    fs.rmSync(REPO_MCP, { force: true });
    fs.rmSync(REPO_AGENTS, { recursive: true, force: true });
  };
  /* 进程级兜底清理（同步 rmSync）：uncaught 异常 / 管道断裂（EPIPE）等绕过
   * try/finally 时仍不遗留真实仓库根 fixture（本仓 0071 自测实发：输出管道
   * 中断 → finally 未达 → 遗留；exit 钩子幂等补删） */
  let repoFixturesLive = false;
  process.on('exit', () => {
    if (!repoFixturesLive) return;
    try { fs.rmSync(REPO_MCP, { force: true }); } catch { /* 尽力清理 */ }
    try { fs.rmSync(REPO_AGENTS, { recursive: true, force: true }); } catch { /* 尽力清理 */ }
  });
  if (guardHit) {
    for (const [id, why] of [['MC18', '存在性守卫触发'], ['MC19', '随 MC18 SKIP'], ['MC20', '随 MC18 SKIP'], ['MC21', '随 MC18 SKIP'], ['MC22', '随 MC18 SKIP']])
      C.pass(id, `SKIP：${why}——仓库根已有 .mcp.json/.agents，绝不覆写用户文件（MC19/MC20 需仓库根 fixture；请在清洁检出复核）`);
  } else {
    const SUB_ENV = { MCP_HTTP_SERVERS: '', MCP_STDIO_SERVERS: '' };   /* 注册通道显式清零：external 清单确定性 */
    C.pass('MC18', '存在性守卫通过：仓库根无 .mcp.json/.agents，子进程组以临时 fixture 写真实根（finally + exit 钩子必达清理）');
    try {
      /* MC19 · AC2 子进程版：仅 SOURCES 扫描零激活 */
      writeRepoFixtures();
      repoFixturesLive = true;
      const bC19 = auditCount('candidate', 'mc19-server');
      const bScan19 = auditCount('scan');
      const srv19 = await startServer(await getFreePort(), { env: { ...SUB_ENV, MCP_DISCOVERY_SOURCES: 'project-mcp,project-agents', MCP_DISCOVERY_ALLOW: '' } });
      const caps19 = await api(srv19.base, 'GET', '/api/v1/capabilities');
      const ext19 = caps19.json?.mcp?.external ?? [];
      const log19 = srv19.log.tail();
      await stopServer(srv19);
      C.ok(caps19.status === 200 && !ext19.some((e) => e.serverId === 'mc19-server') && log19.includes('MCP 扩展发现候选')
        && auditCount('candidate', 'mc19-server') - bC19 >= 1 && auditCount('scan') - bScan19 >= 2, 'MC19',
        'AC2 子进程版：SOURCES=project-mcp,project-agents + ALLOW 缺省 → server 健康、capabilities external 不含 fixture 条目、日志含「MCP 扩展发现候选」锚、candidate/scan 审计行落库',
        { expected: 'external 无 + 日志锚 + 审计行', actual: JSON.stringify({ status: caps19.status, ext: ext19, logHit: log19.includes('MCP 扩展发现候选'), candDelta: auditCount('candidate', 'mc19-server') - bC19, scanDelta: auditCount('scan') - bScan19 }), ctx: 'startServer 真实接线（lib.mjs 基建）' });

      /* MC20 · AC3 子进程版：SOURCES+ALLOW 全链激活 */
      const bHit20 = auditCount('allow-hit', 'mc19-server');
      const srv20 = await startServer(await getFreePort(), { env: { ...SUB_ENV, MCP_DISCOVERY_SOURCES: 'project-mcp,project-agents', MCP_DISCOVERY_ALLOW: 'project-mcp:mc19-server' } });
      const caps20 = await api(srv20.base, 'GET', '/api/v1/capabilities');
      const ext20 = caps20.json?.mcp?.external ?? [];
      await stopServer(srv20);
      C.ok(caps20.status === 200 && deepEqual(ext20.filter((e) => e.serverId === 'mc19-server'), [{ serverId: 'mc19-server', kind: 'http' }])
        && auditCount('allow-hit', 'mc19-server') - bHit20 === 1, 'MC20',
        'AC3 子进程版：+ALLOW project-mcp:mc19-server → capabilities external 含 {serverId, kind:http}；sqlite 恰一行 allow-hit（接线证明）',
        { expected: 'external 含条目 + allow-hit delta=1', actual: JSON.stringify({ ext: ext20.filter((e) => e.serverId === 'mc19-server'), hitDelta: auditCount('allow-hit', 'mc19-server') - bHit20 }), ctx: '真仓根 fixture（写入→扫描→清理）' });
    } finally {
      cleanRepoFixtures();
      repoFixturesLive = false;
    }

    /* MC21 · AC4 fail-fast 子进程版（零 fixture 依赖） */
    {
      const r21 = await expectFastFail({ ...SUB_ENV, MCP_DISCOVERY_SOURCES: 'nope', MCP_DISCOVERY_ALLOW: '' });
      C.ok(r21 !== null && /code=1\b/.test(r21.msg) && r21.tail.includes('MCP_DISCOVERY_SOURCES') && r21.tail.includes('条目 1'), 'MC21',
        'AC4 fail-fast：SOURCES 含未知源 nope → 子进程提前退出 code=1，logTail 含变量名 MCP_DISCOVERY_SOURCES 与「条目 1」（config.ts fail 通道形态）',
        { expected: 'code=1 + 变量名 + 条目 1', actual: r21 ? `${r21.msg} | tail 片段：${r21.tail.slice(-240)}` : '服务意外健康启动', ctx: 'expectFastFail（mcp-registry MR02 先例形态）' });
    }

    /* MC22 · AC5 ALLOW 时序宽容（零 fixture 依赖：project-mcp 根缺失=合法空态） */
    {
      const bScan22 = auditCount('scan');
      const srv22 = await startServer(await getFreePort(), { env: { ...SUB_ENV, MCP_DISCOVERY_SOURCES: 'project-mcp', MCP_DISCOVERY_ALLOW: 'project-mcp:ghost' } });
      const log22 = srv22.log.tail();
      await stopServer(srv22);
      C.ok(log22.includes('不在扫描快照中，已忽略') && auditCount('allow-hit', 'ghost') === 0 && auditCount('scan') - bScan22 >= 1, 'MC22',
        'AC5 时序宽容：ALLOW 登记快照不存在条目 project-mcp:ghost → server 健康（不退）、warn 锚「不在扫描快照中，已忽略」、ghost 零审计行（scan 行落库证 DB 链路活着）',
        { expected: '健康 + warn 锚 + ghost 零行', actual: JSON.stringify({ logHit: log22.includes('不在扫描快照中，已忽略'), ghost: auditCount('allow-hit', 'ghost'), scanDelta: auditCount('scan') - bScan22 }), ctx: '无发现事实可审 → 仅 warn（ADR-0023 §4.3）' });
    }
  }
}

/* ---------- 运行器：fail-fast + finally 清理 + 汇总 + 退出码 ---------- */
const onSignal = (sig) => {
  console.log(`\n收到 ${sig}：执行清理后退出`);
  void (async () => {
    await cleanup();
    try { fs.rmSync(TMP_BASE, { recursive: true, force: true }); } catch { /* 尽力清理 */ }
    process.exit(130);
  })();
};
process.on('SIGINT', () => onSignal('SIGINT'));
process.on('SIGBREAK', () => onSignal('SIGBREAK'));

try {
  await main();
} catch (e) {
  if (e instanceof SmokeFailError) {
    console.log(`（fail-fast：断言 ${e.assertId} 失败，停止后续断言，进入清理）`);
  } else {
    console.error(`ERROR 未预期的异常：${e?.stack ?? e}`);
    C.failed += 1;
  }
} finally {
  try { await cleanup(); } catch (e) { console.error(`ERROR 清理阶段异常：${e?.stack ?? e}`); }
  try { fs.rmSync(TMP_BASE, { recursive: true, force: true }); } catch { /* 尽力清理 */ }
  try { auditDb?.close(); } catch { /* 只读连接，尽力关闭 */ }
}
console.log(`==== smoke:mcp:discovery：${C.passed} passed / ${C.failed} failed ====`);
process.exit(C.failed === 0 ? 0 : 1);
