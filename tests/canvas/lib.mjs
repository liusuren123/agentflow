/* ================================================================
 *  lib.mjs — test:canvas 基础设施层（迭代 0006 / BK-0004 · SPEC §4.1）
 *  只提供机制，不含业务断言：preflight / startServer / Checker / SEED /
 *  bootPage / fit（端点贴合断言的浏览器侧执行体）。
 *  边界规则（SPEC §3）：触达被测系统仅四条通道——
 *    ① HTTP 静态托管 apps/web/dist/index.html（其余 404 → ENGINE.probe
 *       走离线分支，F7；独立实现，不 import tools/pixel-gate）；
 *    ② DOM 只读观测（getAttribute('d') / getBoundingClientRect /
 *       getScreenCTM / 计数查询）；
 *    ③ localStorage 播种（agentflow.v2，F6；autosave:false 根除回写竞态）；
 *    ④ 合成 UI 事件（MouseEvent / click / input，F5 路径，
 *       零 Playwright actionability 依赖）。
 *  不 import 产品代码 / 不写文件系统 / 零新增 npm 依赖（Playwright 已在位）。
 * ================================================================ */
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* 端点贴合容差（SPEC D4）：port rect → 偏移÷scale → +n.x/n.y → d 全精度浮点直写
 * → CTM 精确仿射，全程无舍入点；1px 仅覆盖浏览器内部变换舍入余量。
 * 已知最小真实失效 = 2px（st-running 进度条布局位移，纯 CSS 定值）→ 必红。 */
export const TOL = 1.0;
export const DIST_HTML = path.join(ROOT, 'apps', 'web', 'dist', 'index.html');
export const EDGE_SEL = id => `#edges g.edge[data-id="${id}"]`;

/* ---------- 前置校验（AC3：缺 dist → 指引 + exit 1，绝不静默跳过） ---------- */
export function preflight() {
  if (!existsSync(DIST_HTML)) {
    console.error('[test:canvas] apps/web/dist 不存在——先在仓库根执行 npm run build:web（或完整 npm run build）后再跑本测试');
    process.exit(1);
  }
}

/* ---------- 极简静态服务：仅 / → dist/index.html，其余 404（SPEC §4.1） ---------- */
export function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      if (req.url.split('?')[0] === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(DIST_HTML));
      } else { res.writeHead(404); res.end(); }
    });
    const port = Number(process.env.CANVAS_PORT) || 0;   // 默认 listen(0) 系统分配（SPEC §3.4）
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      resolve({ server, port: actual, url: `http://127.0.0.1:${actual}/` });
    });
  });
}

/* ---------- 断言工具（smoke Checker 同款形态；pre = 非空虚设防，
 * 失败即记 FAIL 并中止该场景——防「没动所以贴合」的假绿，REQ-0004-03） ---------- */
export class PreconditionError extends Error {}
export class Checker {
  constructor() { this.passed = 0; this.failed = 0; }
  pass(name) { this.passed += 1; console.log(`✓ ${name}`); }
  fail(name, detail) { this.failed += 1; console.log(`✗ ${name}${detail ? ` · ${detail}` : ''}`); }
  ok(cond, name, failDetail) {
    if (cond) this.pass(name); else this.fail(name, failDetail);
    return cond;
  }
  pre(cond, name, failDetail) {
    if (cond) { this.pass(name); return true; }
    this.fail(name, failDetail);
    throw new PreconditionError(name);
  }
  summary() { console.log(`\n${this.passed} passed / ${this.failed} failed`); }
  exitCode() { return this.failed === 0 ? 0 : 1; }
}

/* ---------- 种子工作流（SPEC §4.3；C3 敏感化偏差见 geometry.mjs 头注） ----------
 * 类型链（F7 typeOk）：userinput.out(text)→llm.in[0](text) ✓；
 * llm.out(text)→reply.in[0](any) ✓。params 不给值 → paramsOf 用 DEFS 默认值。
 * settings.autosave:false → saveLocal 全程 no-op（根除 clear+reload 与 350ms
 * 防抖回写的竞态，F6）；flowAnim:false / speed:1 / snap:false 固定确定性地板。 */
export const SEED = {
  tabs: [{
    name: 'portCache 回归种子',
    nodes: [
      { id: 1, type: 'userinput', x: 120, y: 140, title: 'A·用户输入' },  // 4 widget 药丸（折叠敏感）+ out: text
      { id: 2, type: 'llm', x: 520, y: 140, title: 'B·LLM' },             // in[0]: text + sys textarea（C3 标的）
      { id: 3, type: 'reply', x: 920, y: 140, title: 'C·直接回复' },      // in[0]: any ← B.out（C3 敏感化）
    ],
    edges: [
      { id: 100, fn: 1, fp: 0, tn: 2, tp: 0 },
      { id: 200, fn: 2, fp: 0, tn: 3, tp: 0 },
    ],
    nextId: 4,                    // C5 新节点将得 id=4（确定性）
    view: { x: 60, y: 40, scale: 1 },
  }],
  activeTab: 0,
  runs: [],
  settings: { grid: false, flowAnim: false, speed: 1, autosave: false, snap: false },
};

/* ---------- 每场景独立引导：新页 → 播种 → reload → 字体/入场稳定（SPEC §4.1） ---------- */
export async function bootPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(s => localStorage.setItem('agentflow.v2', JSON.stringify(s)), SEED);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  return page;
}

/* ---------- 端点贴合断言（SPEC D3） ----------
 * d 格式恒为 `M x1 y1 C cx1 cy1, cx2 cy2, x2 y2`（app.js bezier 模板直写，F2）：
 * 首二数 = 起点（世界系）、末二数 = 终点。#edges 位于 #world 内（Skeleton.tsx:73），
 * getScreenCTM() 即浏览器渲染这条 path 所用的世界系→屏幕系仿射（含 view
 * translate+scale），零手工复算。返回 {startDev, endDev}（px，欧氏距离），
 * 容差判定由调用方执行。 */
/* edgeSel 与 excludeIds 二选一：给 excludeIds 时在页内定位「id 不在排除表中的
 * 那条边」（新边 id 为 Date.now()+random 不可预测，app.js:1299，按排除法取），
 * 免去一次发现往返——C5 早期时点断言须以单往返挤进 <220ms 自愈窗
 * （app.js:1271 定时器，BUG-0001）。 */
export function fit(page, { edgeSel, excludeIds, fromSel, toSel }) {
  return page.evaluate(([edgeSel, excludeIds, fromSel, toSel]) => {
    let sel = edgeSel;
    if (!sel) {
      const g = [...document.querySelectorAll('#edges g.edge')]
        .find(g => !excludeIds.includes(g.dataset.id));
      if (!g) throw new Error(`未找到排除 ${excludeIds.join('/')} 之外的新连线`);
      sel = `#edges g.edge[data-id="${g.dataset.id}"]`;
    }
    const vis = document.querySelector(sel + ' .vis');
    if (!vis) throw new Error(`连线不存在：${edgeSel}`);
    const d = vis.getAttribute('d') || '';
    const nums = (d.match(/-?[\d.]+/g) || []).map(Number);
    if (nums.length < 4) throw new Error(`d 属性解析失败：${d}`);
    const svg = document.getElementById('edges');
    const ctm = svg.getScreenCTM();
    if (!ctm) throw new Error(`getScreenCTM() 为 null（未渲染）：${edgeSel}`);
    const map = (x, y) => { const p = svg.createSVGPoint(); p.x = x; p.y = y;
      const q = p.matrixTransform(ctm); return [q.x, q.y]; };
    const s = map(nums[0], nums[1]);
    const e = map(nums[nums.length - 2], nums[nums.length - 1]);
    const center = sel => { const el = document.querySelector(sel);
      if (!el) throw new Error(`端口不存在：${sel}`);
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2]; };
    const p = center(fromSel), q = center(toSel);
    return { startDev: Math.hypot(s[0] - p[0], s[1] - p[1]), endDev: Math.hypot(e[0] - q[0], e[1] - q[1]) };
  }, [edgeSel, excludeIds || null, fromSel, toSel]);
}
