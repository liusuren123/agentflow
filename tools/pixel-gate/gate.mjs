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

/* ---------- s6/s7 底部日志面板场景基建（ADR-0010 · SPEC 0013） ---------- */
/* 时序：normalize 收起面板（gate.mjs:46-52）→ 本钩子经 #rail-bp 真实 toggle 重开
   （走 app.js:1790 真实交互路径，含 renderMinimap；normalize 保证前置必为 closed，
   toggle 结果必为展开，幂等成立）。注入不走 addLog：规避 now() 时间戳（app.js:32）
   与时区依赖，改 evaluate 直写固定字面量（.t 恒 '00:00:00'）；innerHTML='' 先清
   boot 欢迎行（app.js:2416）；probe 失败静默（app.js:2250 catch 无 addLog）且无
   周期重试 → 注入后 #log-body 无新行来源。字面量仅 ASCII+CJK（沿 ADR-0009 §3
   fixture 字形安全口径，规避 emoji 跨环境字形差异）；5 行不溢出（面板体约 188px
   可视高，5 行约 110px）→ 无滚动条不确定性。login 入场动画 .2s 由既有稳定双帧等待
   （gate.mjs:149-156，350ms×10）消化；面板 max-height 过渡 .22s 由 logPanelAfter
   内 style.transition='none' 禁用（BUG-0026 修复轮修订：过渡途中的 viewport 高度
   相位会被 renderMinimap 一次性绘制固化，稳定双帧无法回改已绘制 canvas——原
   「过渡被稳定双帧消化」论证对一次性 canvas 绘制不成立）。 */
const logPanelAfter = openLvl => async page => {
  await page.evaluate(() => {
    /* BUG-0026 修复（迭代 0013 修复轮，VERIFY REPORT §四）：#rail-bp 的 click 同步
       调 renderMinimap（app.js:1790），其视口矩形取绘制当刻 viewport 高度
       （app.js:1095-1104）并一次绘制固化；须在点击前禁面板过渡使高度立即跳变，
       绘制必捕获终态 → canvas 确定性成立（内联 style 覆盖 app.css 过渡声明） */
    document.getElementById('bottompanel').style.transition = 'none';
    document.getElementById('rail-bp').click();
  });
  await page.evaluate(() => {
    const body = document.getElementById('log-body');
    body.innerHTML = '';
    const LINES = [
      ['sys',  '执行后端已连接 node v20.11.0'],
      ['info', 'LLM 节点开始执行 #3'],
      ['warn', 'HTTP 请求节点已旁路，跳过执行'],
      ['ok',   '运行完成 3/3 节点，总耗时 2.4s'],
      ['info', '最终输出：你好，AgentFlow'],
    ];
    for (const [lvl, m] of LINES) {
      const div = document.createElement('div');
      div.className = 'logline ' + lvl;
      div.innerHTML = '<span class="t">00:00:00</span><span class="m">' + m + '</span>';
      body.appendChild(div);
    }
  });
  if (openLvl) await page.evaluate(lvl => {
    document.querySelector('#log-filter .chip[data-lvl="' + lvl + '"]').click();
  }, openLvl);
};
/* s6/s7 专属不变量（spread 于公共六键之后，s0~s5 零新增键，JSON 键序稳定）：
   chips 词表+激活态（'*' 后缀）、过滤属性缺省读作 'all'、逐行级别+可见性
   （display:none 判定，'-' 隐藏 / '+' 可见） */
const logInv = page => page.evaluate(() => ({
  chips: [...document.querySelectorAll('#log-filter .chip')]
    .map(c => c.dataset.lvl + (c.classList.contains('on') ? '*' : '')),
  filter: document.getElementById('log-body').dataset.lvl || 'all',
  lines: [...document.querySelectorAll('#log-body .logline')]
    .map(l => (getComputedStyle(l).display === 'none' ? '-' : '+') + l.className.replace('logline ', '')),
}));

/* ---------- s8 智能体节点场景基建（ADR-0013 §6 · 迭代 0031 / BK-0033 修宪轮） ---------- */
/* 触发形态 = localStorage 预置含 agent 节点的最小工作流（LS_KEY='agentflow.v2'，
   app.js loadLocal 消费）：seed 在 localStorage.clear 之后、reload 之前写入 → boot 走
   loadLocal 分支（fresh=false，无 fitView/欢迎日志）。离线静态态（无路由拦截，probe
   失败静默 → model combo 保持 DEFS 6 项）；runs/settings 缺省 = boot 默认（确定性）。
   采集面 = chat 类目色标题栏 + sparkles 图标 + 2 入 2 出端口 + model/sys/maxSteps
   widget 行 + 一条连线；不变量 = 公共六键（无 per-scenario 增量）。 */
const AGENT_WF_SEED = JSON.stringify({ tabs: [{ name: '智能体示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'agent',   x: 410, y: 250, title: '通用智能体' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });

/* ---------- s10 网页展示节点场景基建（ADR-0015 §6 · 迭代 0033 / BK-0036 修宪轮） ----------
   触发形态 = localStorage 预置含 webshow 节点的最小工作流（LS_KEY='agentflow.v2'，
   app.js loadLocal 消费）；离线静态态（无路由拦截）；采集面 = output 类目色标题栏 +
   globe 图标 + in-url 端口 + 兜底网址/沙箱隔离 widget 行 + 一条连线；不变量 = 公共六键。 */
const WEBSHOW_WF_SEED = JSON.stringify({ tabs: [{ name: '网页展示示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'webshow', x: 410, y: 250, title: '网页展示' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });

/* ---------- s9 goal 会话面板在线态场景基建（ADR-0013 §6 · 迭代 0032 / BK-0034） ----------
   面板打开路径（app.js openGoalPanel）：refreshSessions（GET list）→ 同名「通用智能体」
   恢复优先命中 → fetchSessionDetail（GET :id）→ 两条消息气泡回放；无 POST（新建/续聊/
   停止静态态不触发）。fixture 字面量同 WF_ROUTES 口径（整点毫秒 + 固定中文样例）。
   注册序注意：Playwright 路由后注册者先匹配——list 模式 `sessions?*` 的 `?`/`*`
   也会命中 detail URL，故 detail 必须注册在 list 之后（先试 detail、回落 list）。 */
const SESSION_FIX_ID = 'sess-goal-fix';
const SESSION_ROUTES = [
  { pattern: '**/api/health',
    handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/sessions?*',
    handler: route => route.fulfill({ json: { sessions: [
      { id: SESSION_FIX_ID, title: '通用智能体', model: 'GLM-4.7',
        created_at: 1767225600000, updated_at: 1767312000000 },
    ] } }) },
  { pattern: '**/api/v1/sessions/sess-goal-fix',
    handler: route => route.fulfill({ json: { session: {
        id: SESSION_FIX_ID, title: '通用智能体', model: 'GLM-4.7',
        sys: '你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。',
        created_at: 1767225600000, updated_at: 1767312000000 },
      messages: [
        { seq: 1, role: 'user',      text: '整理本周仓库提交记录，输出变更摘要' },
        { seq: 2, role: 'assistant', text: '已完成梳理：本周共 6 次提交，覆盖 NDP 迁移、会话 API 与门禁扩充三个主题。' },
      ] } }) },
];
const goalOpen = page => page.evaluate(() => document.querySelector('.node[data-id="2"]')
  .dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
const goalReady = page => page.waitForFunction(
  () => document.querySelectorAll('#goal-panel .gp-msg').length === 2,
  undefined, { timeout: 10000, polling: 100 });

/* ---------- s11 终端只读流节点场景基建（ADR-0015 §6 · 迭代 0034 / BK-0037 修宪轮） ----------
   采集面 = output 类目色标题栏 + code 图标（既有键复用）+ lines/autoscroll 两 widget 行
   + in-stream 单入端口 + trigger→termview 一条连线；呈现区为惰性挂载（首个 delta 才创建）
   → 静态态不出现 → 场景与 s8 同构确定。 */
const TERMVIEW_WF_SEED = JSON.stringify({ tabs: [{ name: '终端只读流示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'termview', x: 410, y: 250, title: '终端只读流' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });

/* ---------- s12 JSON 画布节点场景基建（ADR-0015 §6 · 迭代 0035 / BK-0038 修宪轮） ----------
   seed 同 s8/s10/s11 形态（localStorage 预置最小工作流）；steps 点击 #float-run 走
   runSimulated（gate 静态托管 probe 失败 → 离线分支）；ready 等待运行退场且树渲染
   达标（4 顶层行）——PRD REQ-0038-05「树渲染完成终态」的机器判据。 */
const JSONCANVAS_WF_SEED = JSON.stringify({ tabs: [{ name: 'JSON 画布示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'jsoncanvas', x: 410, y: 250, title: 'JSON 画布' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });
const jcRunClick = page => page.evaluate(() => document.getElementById('float-run').click());
const jcReady = page => page.waitForFunction(
  () => !document.body.classList.contains('running')
     && document.querySelectorAll('.node-jtree .jc-row').length >= 4,
  undefined, { timeout: 10000, polling: 100 });

/* ---------- s13 能力配置面板在线态场景基建（ADR-0018 · 迭代 0039 / BK-0049 修宪轮） ----------
   触发形态 = localStorage 预置 trigger→llm 最小工作流（llm 带 caps [mcp,skill]，
   预选 web-search:['search'] + skills:['doc-writer'] → 画布徽章与面板选中态均在采集面）；
   在线态 = CAP_ROUTES 路由 fixture（health + capabilities）供数；fixture external
   含 1 条 caps-ext → .cap-server 计数 6 ≠ 回退集 5，即供数链到达的确定性判据
   （同 s4 wfReady 以 data-wf-id 判到达的口径）；徽章分母 6 同理入 .node-caps。
   注：capsHtml 冻结面里 data-sid 在 .cap-server 容器内的 input 上（app.js capsHtml），
   计数/取 sid 均经既有 DOM 路径，模板零改动。 */
const CAP_FIXTURE = { mcp: { builtin: [
  { id: 'filesystem', name: 'filesystem', desc: '本地文件读写',
    tools: [ { n: 'read_file', d: '读取沙箱目录内的文本文件' },
             { n: 'write_file', d: '将文本写入沙箱目录内的文件' },
             { n: 'list_directory', d: '列出沙箱目录的内容' } ] },
  { id: 'fetch', name: 'fetch', desc: '网页抓取',
    tools: [ { n: 'fetch', d: '抓取一个 http(s) URL，返回正文摘录' },
             { n: 'download', d: '下载 URL 资源保存到沙箱目录' } ] },
  { id: 'sqlite', name: 'sqlite', desc: '数据库查询',
    tools: [ { n: 'query', d: '在沙箱数据库执行 SELECT 查询并返回行集（上限 100 行；仅限沙箱数据库，不能访问其他数据库文件）' },
             { n: 'execute', d: '在沙箱数据库执行写入或结构 SQL（CREATE/INSERT/UPDATE/DELETE 等，多语句以 ; 分隔；仅限沙箱数据库）' } ] },
  { id: 'browser', name: 'browser', desc: '浏览器自动化',
    tools: [ { n: 'navigate', d: '（未实现）打开页面' },
             { n: 'click', d: '（未实现）点击元素' },
             { n: 'screenshot', d: '（未实现）截屏' } ] },
  { id: 'web-search', name: 'web-search', desc: '联网搜索',
    tools: [ { n: 'search', d: '联网搜索，返回标题/链接/摘要' },
             { n: 'news', d: '检索某话题的最新新闻' } ] },
], external: [ { serverId: 'caps-ext', kind: 'http' } ] }, skills: [
  { id: 'ppt-builder',  name: 'PPT 生成器',  desc: '根据大纲生成演示文稿' },
  { id: 'doc-writer',   name: '文档撰写',    desc: '长文写作与润色' },
  { id: 'data-analyst', name: '数据分析',    desc: '表格解读与图表建议' },
  { id: 'coder',        name: '编程助手',    desc: '代码生成与审查' },
  { id: 'translator',   name: '多语言翻译',  desc: '中英日韩互译' },
] };
const CAP_ROUTES = [
  { pattern: '**/api/health',           handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/capabilities',  handler: route => route.fulfill({ json: CAP_FIXTURE }) },
];
const CAPS_WF_SEED = JSON.stringify({ tabs: [{ name: '能力配置示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'llm',     x: 410, y: 250, title: 'LLM 节点',
    mcp: { 'web-search': ['search'] }, skills: ['doc-writer'] },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });
const capsReady = page => page.waitForFunction(
  () => document.querySelectorAll('#props .cap-server').length === 6
     && !!document.querySelector('#props .cap-server input[data-sid="caps-ext"]'),
  undefined, { timeout: 10000, polling: 100 });
const capsInv = page => page.evaluate(() => ({
  capServers: [...document.querySelectorAll('#props .cap-server')].map(s =>
    (s.querySelector('input[data-sid]')?.dataset.sid ?? '?') + (s.classList.contains('on') ? '*' : '')),
  capSkills: [...document.querySelectorAll('#props .cap-skill')].map(s =>
    (s.querySelector('input[data-sid]')?.dataset.sid ?? '?') + (s.classList.contains('on') ? '*' : '')),
  capsSum: document.querySelector('#props .caps-sum')?.textContent ?? null,
  nodeCaps: document.querySelector('.node[data-id="2"] .node-caps')?.textContent ?? null,
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
  { id: 's6-log-panel',       steps: [], after: logPanelAfter(null),   inv: logInv },
  { id: 's7-log-filter-warn', steps: [], after: logPanelAfter('warn'), inv: logInv },
  { id: 's8-agent-node', steps: [],
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), AGENT_WF_SEED) },
  { id: 's9-goal-panel-online', routes: SESSION_ROUTES,
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), AGENT_WF_SEED),
    steps: [goalOpen], ready: goalReady },
  { id: 's10-webshow-node', steps: [],
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), WEBSHOW_WF_SEED) },
  { id: 's11-termview-node', steps: [],
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), TERMVIEW_WF_SEED) },
  { id: 's12-jsoncanvas-node', steps: [jcRunClick], ready: jcReady,
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), JSONCANVAS_WF_SEED) },
  { id: 's13-caps-panel', routes: CAP_ROUTES,
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), CAPS_WF_SEED),
    steps: [selectNode('.node[data-id="2"]')], ready: capsReady, inv: capsInv },
];

const runScenario = async (browser, sc) => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 },
    ...(sc.timezoneId ? { timezoneId: sc.timezoneId } : {}) });   /* 仅 s4/s5 传 'UTC' */
  /* 路由拦截须在 goto 之前注册（SPEC §3.1.2）；page.route 在 reload 后持续生效，
     localStorage.clear→reload 流程的二次 probe 由同一路由继续供数 */
  for (const r of sc.routes || []) await page.route(r.pattern, r.handler);
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  /* s8 seed 钩子（迭代 0031）：clear 之后、reload 之前预置工作流（s0~s7 无 seed 字段=零行为变化） */
  if (sc.seed) await sc.seed(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  for (const step of sc.steps) await step(page);
  /* 在线态 DOM 就绪等待（仅 s4/s5）：fetch 数据落 DOM 后才进 normalize/稳定帧，
     杜绝稳定双帧在「加载中…」占位态连取两帧一致产生伪基线 */
  if (sc.ready) await sc.ready(page);
  await normalize(page);
  if (sc.after) await sc.after(page);   /* s6/s7 post-normalize 钩子（迭代 0013）；s0~s5 无此字段=无操作 */
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
