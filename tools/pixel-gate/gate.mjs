/* ================================================================
 *  gate.mjs — UI 宪法门禁（CONSTITUTION.md 第 2 条的执行器）
 *  · 静态托管当前应用（离线模式，天然确定性；不依赖后端）
 *  · 4 个 golden 场景，双重复核：像素 0 容差 diff + DOM 不变量
 *  · npm run gate         → 校验（CI required check）
 *    npm run gate:update  → 重录 golden（宪法第 3 条：需 ADR + 用户批准后使用）
 *  · 稳定性等待：连续两帧截图一致才算场景就绪（消化入场动画/字体加载）
 * ================================================================ */
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
/* --target <dir>：校验另一目录下的应用（如 apps/web/dist）对同一 golden 的符合度。
   golden 始终是 2026-10 定稿基线，不随 target 变化 —— React 版必须长得和原版一模一样 */
const targetIdx = process.argv.indexOf('--target');
const TARGET_DIR = targetIdx >= 0 ? path.resolve(ROOT, process.argv[targetIdx + 1]) : ROOT;
if (!TARGET_DIR.startsWith(ROOT) || !existsSync(path.join(TARGET_DIR, 'index.html'))) {
  console.error(`--target 目录无效（需含 index.html）：${TARGET_DIR}`); process.exit(2);
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

const SCENARIOS = [
  { id: 's0-initial',  steps: [] },
  { id: 's1-select-node', steps: [selectNode('.node[data-id="3"]')] },
  { id: 's2-settings', steps: [clickRail('settings')] },
  { id: 's3-library',  steps: [clickRail('nodes')] },
];

const runScenario = async (browser, sc) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  for (const step of sc.steps) await step(page);
  await normalize(page);
  /* 稳定性等待：连续两帧一致 */
  let prev = await page.screenshot();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(350);
    const cur = await page.screenshot();
    if (Buffer.compare(cur, prev) === 0) break;
    prev = cur;
  }
  const invariants = await page.evaluate(() => ({
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
  }));
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
process.exit(fail === 0 ? 0 : 1);
