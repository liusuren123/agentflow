/* ================================================================
 *  geometry.mjs — test:canvas 入口（迭代 0006 / BK-0004 · SPEC §4.2-4.4）
 *  portCache 失效场景回归（AGENTS.md 已知陷阱 2 的可执行化）：
 *    C1 单节点执行（锁 app.js:1202/1214 起止配对）
 *    C2 折叠+展开（锁 rerenderNode 内配对 app.js:1078）
 *    C3 textarea 手工改高 mouseup（锁 app.js:1669 配对）
 *    C4 拖拽位移 ≥50px（锁移动中 updateEdgesOf app.js:1473）
 *    C5 拖线释放空白→搜索弹窗新建节点自动连线（锁 addNode 同步
 *       measurePorts app.js:1272，缓存缺失即落入 portCenter 回退猜测值；
 *       双时点断言：早期 <220ms 自愈窗 + 300ms 稳定——BUG-0001 修复）
 *  每场景独立新页+重新播种；骨架 = 前置断言（非空虚设防）→ 合成事件操作
 *  → 稳定等待 → fit 端点贴合断言（两端各 ≤ TOL=1px）。
 *
 *  与 SPEC §4.3 的唯一实质偏差（BUILD 修正，详见 JOURNAL）：
 *  种子追加节点 C(reply) + 边 200(B.out→C.in)。原因——SPEC 原种子边 100 的
 *  TO 端点 B.in[0] 位于 widget 块之上（makeNodeEl app.js:766-774），textarea
 *  改高只下移其下的 out 端口（app.css 布局序），原种子对「移除 app.js:1669
 *  配对」黑盒不敏感（d 端点无一移动 → 假绿），与 PRD AC4「移除后 C3 必红」
 *  矛盾；边 200 的 FROM 端点 = B.out[0]（widget 块之下）补齐该敏感性。
 *  连带调整：nextId 3→4（C5 新节点 id=4）、C5 新边排除法同时排除 100/200。
 *
 *  运行：npm run test:canvas（前置 apps/web/dist，缺则 preflight 报指引退出）。
 * ================================================================ */
import { chromium } from 'playwright';
import { preflight, startServer, Checker, PreconditionError, EDGE_SEL, TOL, fit, bootPage } from './lib.mjs';

const EDGE_100 = EDGE_SEL(100);   // A.out[0] → B.in[0]
const EDGE_200 = EDGE_SEL(200);   // B.out[0] → C.in[0]（C3 敏感化标的）
const FROM_A = '.node[data-id="1"] .port.out[data-p="0"]';
const FROM_B = '.node[data-id="2"] .port.out[data-p="0"]';
const TO_B = '.node[data-id="2"] .port.in[data-p="0"]';

/* ---------- 小工具 ---------- */
const nodeH = (page, id) => page.evaluate(i => document.querySelector(`.node[data-id="${i}"]`).offsetHeight, id);
const nodeXY = (page, id) => page.evaluate(i => {
  const el = document.querySelector(`.node[data-id="${i}"]`);
  return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
}, id);
async function assertFit(page, chk, name, sel) {
  const dev = await fit(page, sel);
  const val = `startDev=${dev.startDev.toFixed(2)}px, endDev=${dev.endDev.toFixed(2)}px`;
  chk.ok(dev.startDev <= TOL && dev.endDev <= TOL, `${name}（${val}）`,
    `端点偏差超容差 TOL=${TOL}px · ${val} · edge=${sel.edgeSel ?? `排除${sel.excludeIds.join('/')}`} from=${sel.fromSel} to=${sel.toSel}`);
}
/* 选中节点（gate s1 手法：节点 mousedown + body mouseup，F5） */
const selectNode = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s);
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
}, sel);

/* ---------- C1 单节点执行：输出区填充 + 进度条起止位移（SPEC §4.2） ---------- */
async function c1({ browser, url, chk }) {
  const page = await bootPage(browser, url);
  const h0 = await nodeH(page, 1);
  await selectNode(page, '.node[data-id="1"]');
  await page.evaluate(() => document.getElementById('ntb-exec').click());
  await page.waitForFunction(() => {
    const el = document.querySelector('.node[data-id="1"]');
    return el.classList.contains('st-done') && el.querySelector('.node-out').textContent.trim() !== '';
  }, null, { timeout: 3000 });
  await page.waitForTimeout(60);
  const after = await page.evaluate(() => ({
    h: document.querySelector('.node[data-id="1"]').offsetHeight,
    out: document.querySelector('.node[data-id="1"] .node-out').textContent.trim(),
  }));
  chk.pre(after.h > h0, 'C1 前置 · 节点A高度增长（输出区填充显示）', `h0=${h0}px, h1=${after.h}px`);
  chk.pre(after.out !== '', 'C1 前置 · node-out 文本非空', 'node-out 为空（执行未产出）');
  await assertFit(page, chk, 'C1 · 单节点执行后连线端点贴合',
    { edgeSel: EDGE_100, fromSel: FROM_A, toSel: TO_B });
  await page.close();
}

/* ---------- C2 折叠/展开：widget 块整体显隐（SPEC §4.2，C2a 折叠 / C2b 展开） ---------- */
async function c2({ browser, url, chk }) {
  const page = await bootPage(browser, url);
  const h0 = await nodeH(page, 1);
  const toggleCollapse = () => page.evaluate(() =>
    document.querySelector('.node[data-id="1"] .ncollapse').click());
  await toggleCollapse(); await page.waitForTimeout(100);
  const hC = await nodeH(page, 1);
  chk.pre(hC < h0 - 40, 'C2a 前置 · 折叠后高度收缩 ≥40px（widget 块显隐）',
    `h0=${h0}px, hCollapsed=${hC}px（收缩量 ${h0 - hC}px）`);
  await assertFit(page, chk, 'C2a · 折叠后连线端点贴合',
    { edgeSel: EDGE_100, fromSel: FROM_A, toSel: TO_B });
  await toggleCollapse(); await page.waitForTimeout(100);
  const hE = await nodeH(page, 1);
  chk.pre(hE > hC + 40, 'C2b 前置 · 展开后高度恢复 ≥40px',
    `hCollapsed=${hC}px, hExpanded=${hE}px（恢复量 ${hE - hC}px）`);
  await assertFit(page, chk, 'C2b · 展开后连线端点贴合',
    { edgeSel: EDGE_100, fromSel: FROM_A, toSel: TO_B });
  await page.close();
}

/* ---------- C3 textarea 手工改高 + mouseup（SPEC §4.2；断言标的 = 边 200） ---------- */
async function c3({ browser, url, chk }) {
  const page = await bootPage(browser, url);
  const h0 = await nodeH(page, 2);
  await page.evaluate(() => {
    const ta = document.querySelector('.node[data-id="2"] .wdg-raw textarea[data-k="sys"]');
    ta.style.height = (ta.offsetHeight + 60) + 'px';   // resize:vertical 的手工改高等价物
    ta.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.waitForTimeout(50);
  const h1 = await nodeH(page, 2);
  chk.pre(Math.abs((h1 - h0) - 60) <= 2, 'C3 前置 · 节点B高度增长 60±2px',
    `h0=${h0}px, h1=${h1}px, Δ=${h1 - h0}px`);
  await assertFit(page, chk, 'C3 · textarea 改高 mouseup 后连线端点贴合',
    { edgeSel: EDGE_200, fromSel: FROM_B, toSel: '.node[data-id="3"] .port.in[data-p="0"]' });
  await page.close();
}

/* ---------- C4 拖拽位移：.ntitle mousedown → 3 步 mousemove → mouseup（SPEC §4.2） ---------- */
async function c4({ browser, url, chk }) {
  const page = await bootPage(browser, url);
  const p0 = await nodeXY(page, 1);
  await page.evaluate(() => {
    const t = document.querySelector('.node[data-id="1"] .ntitle');
    const r = t.getBoundingClientRect();
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    t.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: sx, clientY: sy }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: sx + 27, clientY: sy + 17 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: sx + 54, clientY: sy + 34 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: sx + 80, clientY: sy + 50 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: sx + 80, clientY: sy + 50 }));
  });
  await page.waitForTimeout(50);
  const p1 = await nodeXY(page, 1);
  const disp = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  chk.pre(disp >= 50, 'C4 前置 · 位移向量 ≥50px',
    `位移=${disp.toFixed(1)}px（${p0.x},${p0.y} → ${p1.x},${p1.y}）`);
  await assertFit(page, chk, 'C4 · 拖拽位移后连线端点贴合',
    { edgeSel: EDGE_100, fromSel: FROM_A, toSel: TO_B });
  await page.close();
}

/* ---------- C5 拖线释放空白 → 搜索弹窗新建节点自动连线（SPEC §4.2） ----------
 * 双时点断言（BUG-0001 修复）：
 *   早期时点（click 返回后单次 evaluate 往返，≈ms 级）锁 addNode 同步
 *   measurePorts（app.js:1272）——若丢失，portCenter 落入回退猜测值
 *   {x:n.x+150, y:n.y+20}（app.js:805-809），新边 TO 端偏差 ≈140px；该失效
 *   会被 app.js:1271 的 220ms 定时器全量重测自愈（app.js:792-804），故单独
 *   300ms 稳定时点对「仅移除 1272」结构性失明，必须早期时点兜住。
 *   创建类前置（节点/连线计数）需额外往返、后置于早期断言——存在性由 fit
 *   自身保证（边缺失即抛错判场景失败，无假绿路径）。 */
async function c5({ browser, url, chk }) {
  const page = await bootPage(browser, url);
  await page.evaluate(() => {
    const port = document.querySelector('.node[data-id="1"] .port.out[data-p="0"]');
    const r = port.getBoundingClientRect();
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    /* 释放点 = 世界 (880,340)（B/C 之间的空白区）；屏幕坐标经 #world 实际
     * transform 精确换算（DOMMatrix：e/f = translate，a/d = scale） */
    const vp = document.getElementById('viewport').getBoundingClientRect();
    const m = new DOMMatrix(getComputedStyle(document.getElementById('world')).transform);
    const ex = vp.left + m.e + 880 * m.a, ey = vp.top + m.f + 340 * m.d;
    port.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: sx, clientY: sy }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: (sx + ex) / 2, clientY: (sy + ey) / 2 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: ex, clientY: ey }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: ex, clientY: ey }));
  });
  await page.waitForFunction(() => document.getElementById('search-modal').classList.contains('show'),
    null, { timeout: 3000 });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    const inp = document.getElementById('search-input');
    inp.value = '直接回复';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.s-item[data-type="reply"]').click();
  });
  /* 早期时点：confirmSearch 内 addNode+addEdge 同步完成于 click 返回前，
   * app.js:1271 定时器（220ms）尚未触发——excludeIds 页内定位新边，单往返 */
  await assertFit(page, chk, 'C5 · 新增节点自动连线端点贴合（早期时点 <220ms 自愈窗）',
    { excludeIds: ['100', '200'], fromSel: FROM_A, toSel: '.node[data-id="4"] .port.in[data-p="0"]' });
  await page.waitForTimeout(300);   // ≥260ms：入场动画 + addNode 220ms 重测稳定窗（SPEC §4.2）
  const st = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.node').length,
    edges: document.querySelectorAll('#edges g.edge').length,
    n4: !!document.querySelector('.node[data-id="4"]'),
    newEdgeId: (() => {
      const g = [...document.querySelectorAll('#edges g.edge')]
        .find(g => g.dataset.id !== '100' && g.dataset.id !== '200');
      return g ? g.dataset.id : null;
    })(),
  }));
  chk.pre(st.nodes === 4 && st.n4, 'C5 前置 · 节点 3→4 且新节点 id=4（种子 nextId=4）',
    `nodes=${st.nodes}, node4=${st.n4}`);
  chk.pre(st.edges === 3 && st.newEdgeId !== null, 'C5 前置 · 连线 2→3 且新边已建',
    `edges=${st.edges}, newEdgeId=${st.newEdgeId}`);
  await assertFit(page, chk, 'C5 · 新增节点自动连线端点贴合（300ms 稳定时点）',
    { excludeIds: ['100', '200'], fromSel: FROM_A, toSel: '.node[data-id="4"] .port.in[data-p="0"]' });
  await page.close();
}

/* ---------- 入口（SPEC §4.4）：逐场景 try/catch，互不中断；finally 关服务与浏览器 ---------- */
const SCENARIOS = [['C1', c1], ['C2', c2], ['C3', c3], ['C4', c4], ['C5', c5]];
const chk = new Checker();
preflight();
const { server, url } = await startServer();
const browser = await chromium.launch();
try {
  for (const [id, fn] of SCENARIOS) {
    try { await fn({ browser, url, chk }); }
    catch (err) {
      /* 前置失败已在 pre 内记 FAIL；其余异常（选择器缺失/等待超时）如实记场景失败 */
      if (!(err instanceof PreconditionError)) {
        chk.fail(`${id} · 场景执行异常`, String((err && err.message) || err));
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
chk.summary();
process.exit(chk.exitCode());
