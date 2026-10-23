/* ================================================================
 *  gate.mjs — UI 宪法门禁（CONSTITUTION.md 第 2 条的执行器）
 *  · 静态托管当前应用（离线模式，天然确定性；不依赖后端）
 *  · 6 个 golden 场景，双重复核：像素 0 容差 diff + DOM 不变量
 *    s0~s3 离线静态态；s4/s5 在线态（ADR-0009，issue#7 批准）——Playwright
 *    路由拦截 fixture 供数（probe 的 /api/health + /api/v1 列表）+ 时区钉死 UTC
 *  · npm run gate         → 校验（CI required check）
 *    npm run gate:update  → 重录 golden（宪法第 3 条：需 ADR + 用户批准后使用）
 *  · 稳定性等待：连续两帧截图一致才算场景就绪（消化入场动画/字体加载）
 * ================================================================ */
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GOLDEN_DIR = path.join(ROOT, 'tests', 'golden', 'ui');
const DIFF_DIR = path.join(ROOT, 'tests', 'golden', 'diff');
const PORT = Number(process.env.GATE_PORT) || 4173;
const UPDATE = process.argv.includes('--update');
/* --target <dir>：校验指定目录下的应用。默认 apps/web/dist（当前权威 UI 产物，
   需先 npm run build:web）。golden 始终是 2026-10 定稿基线（原 index.html 时代录制，
   该文件已退役进 git 历史），永不重录 —— React 版必须长得和定稿一模一样 */
const targetIdx = process.argv.indexOf('--target');
const TARGET_DIR = targetIdx >= 0 ? path.resolve(ROOT, process.argv[targetIdx + 1]) : path.join(ROOT, 'apps', 'web', 'dist');
if (!TARGET_DIR.startsWith(ROOT) || !existsSync(path.join(TARGET_DIR, 'index.html'))) {
  console.error(`--target 目录无效（需含 index.html；默认 target 需先 npm run build:web）：${TARGET_DIR}`);
  process.exit(2);
}

/* ---------- 极简静态服务（仅 index.html 与同目录资源） ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = path.join(TARGET_DIR, url === '/' ? 'index.html' : url);
  if (!file.startsWith(TARGET_DIR) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

/* ---------- 场景定义 ---------- */
const normalize = async page => {
  await page.evaluate(() => {
    document.getElementById('bottompanel').classList.add('closed');
    document.getElementById('toasts').innerHTML = '';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
};
const clickRail = id => page => page.evaluate(t => {
  document.querySelector(`[data-stab="${t}"]`).click();
}, id);
const selectNode = sel => page => page.evaluate(s => {
  const el = document.querySelector(s);
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}, sel);

/* ---------- s4/s5 在线态场景基建（ADR-0009 · SPEC 0011） ---------- */
/* probe（app.js ENGINE.probe）打的是 /api/health 旧别名而非 /api/v1，不拦截则
   ENGINE.online=false → 面板渲染离线分支，快照到错误形态（SPEC §0）。
   provider.models 刻意留空：probe 的模型列表分支会写 DEFS.llm 并可能触发
   renderProps，空数组跳过该分支，消除非必要副作用；node/note 只进底部日志行
   （normalize 已闭面板）与设置面板（s4/s5 不打开），不影响像素。 */
const HEALTH_FIXTURE = { ok: true, engine: 'agentflow-server', node: 'v20.11.0',
  provider: { configured: false, endpoint: null, models: [], note: 'gate fixture' } };
/* fixture 固定字面量：时间戳取整点毫秒（2026-01-01/02/03 UTC），timezoneId:'UTC'
   下 fmtTs 确定性渲染 1/1 00:00:00 等；名称 ASCII + 固定中文样例覆盖字形路径 */
const WF_ROUTES = [
  { pattern: '**/api/health',
    handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/workflows',
    handler: route => route.fulfill({ json: { workflows: [
      { id: 'wf-alpha-001', name: 'Demo Alpha',    updated_at: 1767225600000 },
      { id: 'wf-beta-002',  name: '示例工作流乙',  updated_at: 1767312000000 },
      { id: 'wf-gamma-003', name: 'Runner Gamma',  updated_at: 1767398400000 },
    ] } }) },
];
/* s5 三态刻意各一（done/error/running——僵尸行渲染是 ADR-0007 §3.2 关注面）；
   runs 路由的尾通配 pattern 覆盖 /api/v1/runs?limit=50（fetchRunList 实际请求） */
const RUN_ROUTES = [
  { pattern: '**/api/health',
    handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/runs**',
    handler: route => route.fulfill({ json: { runs: [
      { id: 'run-done-001',  workflow_name: 'Demo Alpha',    status: 'done',
        started_at: 1767225600000, ended_ms: 812300, done: 4, total: 4 },
      { id: 'run-error-002', workflow_name: '示例工作流乙',  status: 'error',
        started_at: 1767312000000, ended_ms: 245000, done: 2, total: 5 },
      { id: 'run-live-003',  workflow_name: 'Runner Gamma',  status: 'running',
        started_at: 1767398400000, ended_ms: null,    done: 1, total: 3 },
    ] } }) },
];
/* 确定性就绪等待（SPEC 0011 §4）：状态量而非时延量——条件即「在线分支已渲染且
   fetch 数据已落 DOM」（占位态 0 卡、离线分支无此容器，两种错误形态都被卡住）；
   超时抛错使该轮 gate 非零退出（红即 FAIL 信号，不落伪基线） */
const wfReady = page => page.waitForFunction(
  () => document.querySelectorAll('#wf-cloud-list .wf-item[data-wf-id]').length === 3,
  undefined, { timeout: 10000, polling: 100 });
const runReady = page => page.waitForFunction(
  () => document.querySelectorAll('#sv-runs-list .run-item[data-run-id]').length === 3,
  undefined, { timeout: 10000, polling: 100 });
/* per-scenario 不变量增量（SPEC §3.4）：data-wf-id / data-run-id 区别于本地条目，
   计数不混入；服务端工作流卡（app.js paintServerWfGroup）/ 运行卡（paintServerRuns）
   专属属性；s0~s3 无 inv 字段 → 零新增键，JSON.stringify 键序不变是硬约束 */
const wfInv = page => page.evaluate(() => ({
  sideOpen: document.getElementById('sidebar').classList.contains('open'),
  sideTitle: document.getElementById('side-title').textContent,
  serverWf: [...document.querySelectorAll('#wf-cloud-list .wf-item[data-wf-id]')]
    .map(c => c.dataset.wfId),
}));
const runInv = page => page.evaluate(() => ({
  sideOpen: document.getElementById('sidebar').classList.contains('open'),
  sideTitle: document.getElementById('side-title').textContent,
  serverRuns: [...document.querySelectorAll('#sv-runs-list .run-item[data-run-id]')]
    .map(c => `${c.dataset.runId}:${c.classList.contains('ok') ? 'ok' : 'stop'}`),
}));

const SCENARIOS = [
  { id: 's0-initial',  steps: [] },
  { id: 's1-select-node', steps: [selectNode('.node[data-id="3"]')] },
  { id: 's2-settings', steps: [clickRail('settings')] },
  { id: 's3-library',  steps: [clickRail('nodes')] },
  { id: 's4-workflows-online', routes: WF_ROUTES, timezoneId: 'UTC',
    steps: [clickRail('workflows')], ready: wfReady, inv: wfInv },
  { id: 's5-history-online',  routes: RUN_ROUTES, timezoneId: 'UTC',
    steps: [clickRail('history')],  ready: runReady, inv: runInv },
];

const runScenario = async (browser, sc) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 },
    ...(sc.timezoneId ? { timezoneId: sc.timezoneId } : {}) });   /* 仅 s4/s5 传 'UTC' */
  /* 路由拦截须在 goto 之前注册（SPEC §3.1.2）；page.route 在 reload 后持续生效，
     localStorage.clear→reload 流程的二次 probe 由同一路由继续供数 */
  for (const r of sc.routes || []) await page.route(r.pattern, r.handler);
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  for (const step of sc.steps) await step(page);
  /* 在线态 DOM 就绪等待（仅 s4/s5）：fetch 数据落 DOM 后才进 normalize/稳定帧，
     杜绝稳定双帧在「加载中…」占位态连取两帧一致产生伪基线 */
  if (sc.ready) await sc.ready(page);
  await normalize(page);
  /* 稳定性等待：连续两帧一致 */
  let prev = await page.screenshot();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(350);
    const cur = await page.screenshot();
    if (Buffer.compare(cur, prev) === 0) break;
    prev = cur;
  }
  /* 不变量 = 公共六键原样采集 + per-scenario 增量键（展开序保证 s0~s3 键序与
     内容与既有 golden 完全一致——124 行 JSON.stringify 全等比对，键序敏感） */
  const invariants = {
    ...(await page.evaluate(() => ({
      view: document.getElementById('world').style.transform,
      zoom: document.getElementById('zoom-lvl').textContent,
      nodes: [...document.querySelectorAll('.node')].map(n => {
        const r = n.getBoundingClientRect();
        return `${n.dataset.id}:${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`;
      }),
      cssVars: Object.fromEntries([...document.styleSheets[0].cssRules].flatMap(r => r.style ? [...r.style].filter(p => p.startsWith('--')).map(p => [p, r.style.getPropertyValue(p)]) : [])),
      counts: {
        nodes: document.querySelectorAll('.node').length,
        edges: document.querySelectorAll('#edges g.edge').length,
        widgets: document.querySelectorAll('.wdg').length,
        ports: document.querySelectorAll('.port').length,
        tabs: document.querySelectorAll('.wtab').length,
      },
      bottomClosed: document.getElementById('bottompanel').classList.contains('closed'),
    }))),
    ...(sc.inv ? await sc.inv(page) : {}),
  };
  await page.close();
  return { png: prev, invariants };
};

/* ---------- 比对 ---------- */
const decode = buf => PNG.sync.read(buf);
const results = [];
const browser = await chromium.launch();
mkdirSync(GOLDEN_DIR, { recursive: true });
for (const sc of SCENARIOS) {
  const cur = await runScenario(browser, sc);
  const gPng = path.join(GOLDEN_DIR, `${sc.id}.png`);
  const gInv = path.join(GOLDEN_DIR, `${sc.id}.invariants.json`);
  if (UPDATE || !existsSync(gPng)) {
    writeFileSync(gPng, cur.png);
    writeFileSync(gInv, JSON.stringify(cur.invariants, null, 1));
    results.push({ id: sc.id, status: existsSync(gPng) && !UPDATE ? 'golden-created' : 'golden-updated' });
    continue;
  }
  const a = decode(readFileSync(gPng)), b = decode(cur.png);
  const diff = new PNG({ width: a.width, height: b.height });
  const numDiff = pixelmatch(a.data, b.data, diff.data, Math.max(a.width, b.width), Math.max(a.height, b.height), { threshold: 0 });
  const goldenInv = JSON.parse(readFileSync(gInv, 'utf8'));
  const invDiff = JSON.stringify(goldenInv) !== JSON.stringify(cur.invariants);
  if (numDiff > 0 || invDiff) {
    mkdirSync(DIFF_DIR, { recursive: true });
    if (numDiff > 0) writeFileSync(path.join(DIFF_DIR, `${sc.id}.diff.png`), PNG.sync.write(diff));
    writeFileSync(path.join(DIFF_DIR, `${sc.id}.current.png`), cur.png);
    writeFileSync(path.join(DIFF_DIR, `${sc.id}.invariants.json`), JSON.stringify(cur.invariants, null, 1));
  }
  results.push({ id: sc.id, status: numDiff === 0 && !invDiff ? 'pass' : 'FAIL', numDiff, invDiff });
}
await browser.close();
server.close();

/* ---------- 报告 ---------- */
let fail = 0;
for (const r of results) {
  if (r.status === 'FAIL') fail++;
  console.log(`${r.status === 'pass' ? '✓' : r.status === 'FAIL' ? '✗' : '⊕'} ${r.id.padEnd(16)} ${r.status}${r.numDiff !== undefined ? ` · diffPx=${r.numDiff}` : ''}${r.invDiff ? ' · DOM不变量变化' : ''}`);
}
console.log(fail === 0 ? `\n宪法门禁：${UPDATE ? 'golden 已更新（请人工确认符合宪法第 3 条流程）' : '通过 ✓'}` : `\n宪法门禁：${fail} 个场景违宪 ✗（差异详见 tests/golden/diff/）`);
/* 全部通过时清空历史 diff 残留（BUG-002：陈旧差异图会误导排障） */
if (fail === 0 && !UPDATE && existsSync(DIFF_DIR)) {
  for (const f of readdirSync(DIFF_DIR)) rmSync(path.join(DIFF_DIR, f), { recursive: true, force: true });
}
process.exit(fail === 0 ? 0 : 1);
