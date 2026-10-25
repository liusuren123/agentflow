#!/usr/bin/env node
/* ================================================================
 *  evidence.mjs — 主干端到端复测的「图像证据」采集器
 *  （.zcode/ 内，本机文件，不入库）
 *
 *  用法：node .zcode/tools/evidence.mjs <distDir> <outDir>
 *   · 静态托管 distDir（离线确定性，端口随机）
 *   · Playwright 打开应用，按与 pixel-gate 同源的确定性操作序列截 4 张图：
 *       01-initial / 02-node-selected / 03-settings / 04-library
 *   · 写 manifest.json（场景名、视口、字节数、sha256）
 *  退出码：0 全部截图成功；非 0 = 证据采集失败（调用方据此判定复测红）。
 * ================================================================ */
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';

const [, , distDir, outDir] = process.argv;
if (!distDir || !outDir) {
  console.error('用法：evidence.mjs <distDir> <outDir>');
  process.exit(2);
}
if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error(`dist 目录无效（缺 index.html）：${distDir}`);
  process.exit(2);
}

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const MIME = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.js': 'text/javascript' };
/* 目录一律先绝对化：distDir 可能是相对路径（克隆/演练场景），
   若用 path.join(相对) 与 path.resolve(绝对) 混做安全检查，两者永不相等 →
   所有请求 404 → 截出空白页（曾真实发生）。 */
const DIST = path.resolve(distDir);
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  const file = path.join(DIST, url === '/' ? 'index.html' : url);
  if (!file.startsWith(DIST) || !existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

mkdirSync(outDir, { recursive: true });

/* 场景序列：与 tools/pixel-gate/gate.mjs 同源的选择器与归一化动作，
   保证截图为确定性形态（不依赖时区/时间戳/在线态数据）。 */
const normalize = page =>
  page.evaluate(() => {
    document.getElementById('bottompanel')?.classList.add('closed');
    const toasts = document.getElementById('toasts');
    if (toasts) toasts.innerHTML = '';
    if (document.activeElement?.blur) document.activeElement.blur();
  });
const selectNode = sel => page =>
  page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return;
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  }, sel);
const clickRail = id => page =>
  page.evaluate(t => {
    const el = document.querySelector(`[data-stab="${t}"]`);
    if (el) el.click();
  }, id);

const SCENES = [
  { id: '01-initial', steps: [] },
  { id: '02-node-selected', steps: [selectNode('.node[data-id="3"]')] },
  { id: '03-settings', steps: [clickRail('settings')] },
  { id: '04-library', steps: [clickRail('nodes')] },
];

const browser = await chromium.launch();
const manifest = [];
try {
  for (const scene of SCENES) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    for (const step of scene.steps) await step(page);
    await normalize(page);
    /* 稳定双帧：连续两帧一致才算场景就绪（消化入场动画/字体加载） */
    let prev = await page.screenshot();
    for (let i = 0; i < 10; i += 1) {
      await page.waitForTimeout(350);
      const cur = await page.screenshot();
      if (Buffer.compare(cur, prev) === 0) break;
      prev = cur;
    }
    const file = path.join(outDir, `${scene.id}.png`);
    writeFileSync(file, prev);
    /* 空白防护：渲染失败会产出几 KB 的纯色图，肉眼不易察觉——
       用画布节点数做硬校验，宁可失败也不留空白证据 */
    const rendered = await page.evaluate(
      () => document.querySelectorAll('#world .node, #world svg, #world canvas').length,
    );
    await page.close();
    if (rendered === 0) {
      console.error(`✗ ${scene.id} 渲染为空（#world 下无节点/画布）——证据无效，终止`);
      process.exit(3);
    }
    manifest.push({
      scene: scene.id,
      file: path.basename(file),
      bytes: statSync(file).size,
      renderedNodes: rendered,
      sha256: createHash('sha256').update(prev).digest('hex'),
    });
    console.log(`✓ ${scene.id} ${statSync(file).size}B（渲染节点 ${rendered}）`);
  }
} finally {
  await browser.close();
  server.close();
}

writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      viewport: { width: 1600, height: 900 },
      distDir: DIST,
      scenes: manifest,
    },
    null,
    2,
  ),
);
console.log(`evidence ok: ${manifest.length} 张 → ${outDir}`);
