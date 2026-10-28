/* ================================================================
 *  pty-echo-matrix.mjs — BUG-0057-02 注入回显判别矩阵 E2E（迭代 0061 / BK-0045）
 *  · 判别矩阵（SPEC §3）：A trigger→terminal（对照）/ B trigger→delay→terminal
 *    （对照）/ C trigger→terminal + 游离 terminal 第二根（topo [1,3,2]）/ D
 *    trigger 扇出 delay+terminal 双根——C/D 为 0057 复现形态；拓扑序从 run
 *    事件流的 node:start 序列机器断言（Kahn 按 nodes 数组序，engine.ts:53-63）。
 *  · 全链六点位（SPEC §4.2 PE2）：①create 写回 ②订阅确立（xterm 回放已渲染，
 *    强于 0057「面板可见」判据）③注入计数（node:done「已注入命令 · 回显 N 字」
 *    N>0）④回显 marker 落面板 xterm ⑤run:done ⑥关闭→会话存续→重开回放恢复。
 *  · 会话纪律（SPEC §3 硬性）：每轮停止本轮新建全部会话并断言回归基线数
 *    （PTY_MAX_SESSIONS=4，不清理即满员降级污染口径——根因面 P4 排除项）。
 *  · 等待全部为状态量（waitForFunction / waitFor 轮询），零裸 sleep。
 *  · 模式：默认 = PE0 前置 + PE1/PE2（A/B×1、C/D×2 全链）+ PE3（C×10 采样）；
 *    --baseline = 修复前基线（C/D 各 ×10 采样出失败率，BUILD 判「已复现」）；
 *    --probe = 单轮 C 三通道取证（DOM/网络/业务，根因判别用，不进判绿口径）。
 *  · 环境：自起真实 server（PTY_ENABLED=1，env 全量钉值防 .env 泄入，
 *    smoke/pty-sessions.mjs ENV_ON 同款）+ Playwright chromium 开真实 dist
 *    （server 同源托管 /，/api 同源直达）。前置：npm run build && npm run build:server。
 * ================================================================ */
import { chromium } from 'playwright';
import { preflight, getFreePort, startServer, api, waitFor, Checker } from '../smoke/lib.mjs';

const PROBE = process.argv.includes('--probe');
const BASELINE = process.argv.includes('--baseline');
const ENV_ON = { PTY_ENABLED: '1', PTY_IDLE_TIMEOUT_MS: '600000', PTY_MAX_SESSION_MS: '600000', PTY_MAX_SESSIONS: '4' };
const TMO = { boot: 15000, sub: 10000, run: 60000, mark: 5000, back: 8000 };
const WF_NAME = 'PE矩阵';

/* ---------- 判别矩阵（SPEC §3 定稿）：T = 面板绑定 terminal；marker 每轮唯一 ---------- */
const FORMS = {
  A: { T: 2, N: 2, topo: [1, 2] },
  B: { T: 3, N: 3, topo: [1, 2, 3] },
  C: { T: 2, N: 3, topo: [1, 3, 2] },   /* 游离根 id3 与 trigger 同为入度 0，数组序后入队先执行 */
  D: { T: 3, N: 3, topo: [1, 2, 3] },   /* 单 trigger 扇出双支，delay 支先入队 */
};
const nodesOf = (form, m) => {
  const term = (id, x, y, title) => ({ id, type: 'terminal', x, y, title, params: { cmd: `echo ${m}`, session: '' } });
  if (form === 'A') return [{ id: 1, type: 'trigger', x: 60, y: 200, title: '触发' }, term(2, 340, 200, '终端T')];
  if (form === 'B') return [{ id: 1, type: 'trigger', x: 60, y: 200, title: '触发' },
    { id: 2, type: 'delay', x: 200, y: 360, title: '延迟', params: { s: 1 } }, term(3, 430, 200, '终端T')];
  if (form === 'C') return [{ id: 1, type: 'trigger', x: 60, y: 260, title: '触发' },
    term(2, 340, 260, '终端T'), term(3, 340, 60, '游离终端')];   /* 第二根：同 cmd、session 空、不连线 */
  return [{ id: 1, type: 'trigger', x: 40, y: 260, title: '触发' },
    { id: 2, type: 'delay', x: 190, y: 420, title: '延迟', params: { s: 1 } }, term(3, 430, 200, '终端T')];
};
const edgesOf = form => (form === 'A' || form === 'C') ? [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }]
  : form === 'B' ? [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }, { id: 2, fn: 2, fp: 0, tn: 3, tp: 0 }]
  : [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }, { id: 2, fn: 1, fp: 0, tn: 3, tp: 0 }];
const seedOf = (form, m) => JSON.stringify({ tabs: [{ name: WF_NAME, nodes: nodesOf(form, m),
  edges: edgesOf(form), nextId: 9, view: { x: 40, y: 40, scale: 0.85 } }], activeTab: 0 });

/* ---------- 服务端会话面（纪律 + 诊断） ---------- */
const listSessions = async base => (((await api(base, 'GET', '/api/v1/pty/sessions')).json || {}).sessions || []).map(s => s.id);
const stopSessions = async (base, ids) => { for (const id of ids) await api(base, 'POST', `/api/v1/pty/sessions/${id}/stop`); };

/* ---------- 页面动作（gate termOpen :513-514 / jcRunClick :251 同型） ---------- */
const dblClickNode = (page, id) => page.evaluate(i =>
  document.querySelector(`.node[data-id="${i}"]`).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })), id);
/* 订阅确立 / marker 断言共用：m 为空 = 等回放首帧（t.length>=4 且含提示符字符） */
const waitRows = (page, m, timeout) => page.waitForFunction(arg => {
  const t = ((document.querySelector('#term-panel .xterm-rows') || {}).textContent) || '';
  return arg ? t.includes(arg) : (t.length >= 4 && /[>$%#]/.test(t));
}, m, { timeout, polling: 100 });

/* ---------- probe 通道 2：Node 侧独立 SSE 订阅（0057 证明② 复刻）——到达帧序列 + 时刻 ---------- */
function openFrameTap(base, sid) {
  const frames = [];
  const ac = new AbortController();
  const t0 = Date.now();
  void (async () => {
    try {
      const r = await fetch(`${base}/api/v1/pty/sessions/${sid}/stream`, { signal: ac.signal });
      const rd = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i).split('\n').find(l => l.startsWith('data: '));
          buf = buf.slice(i + 2);
          if (!line) continue;
          try { const f = JSON.parse(line.slice(6));
            frames.push({ dt: Date.now() - t0, t: f.t, data: String(f.data ?? f.msg ?? '').slice(0, 200) });
          } catch { /* 非法帧忽略 */ }
        }
      }
    } catch { /* stop() 主动中止 */ }
  })();
  return { frames, stop: () => ac.abort() };
}

/* ---------- 单轮全链：六点位 + 矩阵断言 + 会话纪律；任一步超时 → 本轮 RED + 诊断 ---------- */
async function runRound(C, page, base, form, tag, opts = {}) {
  const f = FORMS[form];
  const marker = `af61${form.toLowerCase()}${tag}`;
  const aid = `${form}-${tag}`;
  const cp = { writeback: false, sub: false, injected: false, marker: false, done: false,
    persist: false, replay: false, topo: false, status: false, sidMatch: false };
  let sid = '', panelSid = null, tap = null, diag = '', extraCount = 0;
  const baseIds = new Set(await listSessions(base));
  /* 网络侧：捕获面板 create 的 sessionId（probe 通道 2/3 的比对锚点） */
  const onResp = async resp => { try {
    const u = new URL(resp.url());
    if (resp.request().method() === 'POST' && u.pathname === '/api/v1/pty/sessions') {
      const j = await resp.json();
      if (j && j.sessionId) panelSid = j.sessionId;
    }
  } catch { /* 非关键通道 */ } };
  page.on('response', onResp);
  try {
    /* ① 预置工作流（gate s19 同径：clear → seed → reload）+ boot/在线探针（状态量） */
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(v => localStorage.setItem('agentflow.v2', v), seedOf(form, marker));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(n => document.querySelectorAll('.node').length === n, f.N, { timeout: TMO.boot, polling: 100 });
    await page.waitForFunction(() => [...document.querySelectorAll('.logline')]
      .some(l => (l.textContent || '').includes('执行后端已连接')), undefined, { timeout: TMO.boot, polling: 100 });
    /* ② 双击 T 主体开面板 → 订阅确立探针（xterm 已渲染回放/首帧 = 帧在流动的强判据） */
    await dblClickNode(page, f.T);
    await waitRows(page, null, TMO.sub);
    cp.sub = true;
    sid = await page.evaluate(id =>
      ((document.querySelector(`.node[data-id="${id}"] input[data-k="session"]`) || {}).value) || '', f.T);
    cp.writeback = !!sid && sid.length > 10;
    if (opts.probe) {
      /* probe 通道 1：面板 DOM 增量时间线（rows 长度 + 状态行文本，变更才记录） */
      await page.evaluate(() => {
        window.__peTL = [];
        const rows = document.querySelector('#term-panel .xterm-rows');
        const st = document.querySelector('#term-panel .tp-status');
        let ll = -1, ls = '';
        const rec = () => {
          const l = rows ? rows.textContent.length : -1, s = st ? st.textContent : '';
          if (l !== ll || s !== ls) {
            window.__peTL.push({ t: Math.round(performance.now()), len: l,
              tail: (rows ? rows.textContent : '').slice(-24), run: document.body.classList.contains('running'), st: s });
            ll = l; ls = s;
          }
        };
        for (const el of [rows, st].filter(Boolean))
          new MutationObserver(rec).observe(el, { subtree: true, childList: true, characterData: true });
      });
      tap = openFrameTap(base, panelSid || sid);
    }
    /* ③ 运行（点击 #float-run）→ run 收尾状态量（body.running 摘除 = run:done 已消费） */
    const runT0 = Date.now();
    await page.evaluate(() => document.getElementById('float-run').click());
    await page.waitForFunction(() => !document.body.classList.contains('running'), undefined, { timeout: TMO.run, polling: 100 });
    cp.done = true;
    /* ④ 回显 marker 落面板（状态量等待；帧真丢失则此处超时红——核心断言点） */
    await waitRows(page, marker, TMO.mark);
    cp.marker = true;
    /* ⑤ 业务侧：run 行 → 事件流（拓扑序 + T 的注入计数 + #sid8 漂移判别 P1） */
    const rows = (((await api(base, 'GET', '/api/v1/runs?limit=8')).json || {}).runs || []);
    const row = rows.filter(r => r.workflow_name === WF_NAME && r.started_at >= runT0 - 1500)
      .sort((a, b) => b.started_at - a.started_at)[0];
    if (row) {
      const evs = (((await api(base, 'GET', '/api/v1/runs/' + row.id)).json || {}).events) || [];
      const starts = evs.filter(e => e.type === 'node:start').map(e => e.id);
      cp.topo = JSON.stringify(starts) === JSON.stringify(f.topo);
      const out = String(((evs.find(e => e.type === 'node:done' && e.id === f.T) || {}).out) || '');
      cp.injected = out.includes('已注入命令') && Number((/回显 (\d+) 字/.exec(out) || [])[1]) > 0;
      cp.sidMatch = !!sid && new RegExp('#' + String(sid).slice(0, 8)).test(out);
      diag += `topo=[${starts}] T.out="${out.slice(0, 64)}"`;
    } else diag += 'run行未找到';
    /* ⑥ 面板状态行无异常态（warn/exit/end/error 唯一呈现面，D3） */
    const st = await page.evaluate(() => ((document.querySelector('#term-panel .tp-status') || {}).textContent) || '');
    cp.status = !/(结束|中断|失败)/.test(st);
    diag += ` status="${st}"`;
    /* ⑦ 关闭（客户端拆链）→ 会话存续（ADR-0014 §4.1）→ 重开回放恢复（环形缓冲） */
    await page.evaluate(() => document.querySelector('#term-panel [data-tp="close"]').click());
    cp.persist = (await listSessions(base)).includes(sid);
    await dblClickNode(page, f.T);
    await waitRows(page, marker, TMO.sub);
    cp.replay = true;
  } catch (e) {
    diag += ` error=${String((e && e.message) || e)}`;
    try {
      const d = await page.evaluate(() => ({
        rowsTail: (((document.querySelector('#term-panel .xterm-rows') || {}).textContent) || '').slice(-70),
        status: ((document.querySelector('#term-panel .tp-status') || {}).textContent) || '',
        logs: [...document.querySelectorAll('.logline')].slice(-5).map(l => (l.textContent || '').slice(0, 88)),
      }));
      diag += ` diag=${JSON.stringify(d)}`;
    } catch { /* 页面已不可达 */ }
  } finally {
    page.off('response', onResp);
    /* 会话纪律（硬性）：停本轮新建全部会话 → 断言回归基线数（P4 排除的机器兑现） */
    let discipline = true;
    try {
      const extra = (await listSessions(base)).filter(id => !baseIds.has(id));
      extraCount = extra.length;
      if (extra.length) {
        await stopSessions(base, extra);
        await waitFor(async () => (await listSessions(base)).length === baseIds.size, TMO.back, '会话回归基线数');
      }
    } catch (e) { discipline = false; diag += ` cleanup=${String((e && e.message) || e)}`; }
    /* 断言记账（check 非抛：一轮红不拖垮整个矩阵，逐项如实留痕） */
    C.check(cp.writeback, `PE2-${aid}-c1`, '① create 写回 session 非空');
    C.check(cp.sub, `PE2-${aid}-c2`, '② 订阅确立（xterm 已渲染回放）');
    C.check(cp.injected, `PE2-${aid}-c3`, '③ 注入计数（已注入命令 · 回显 N>0 字）');
    C.check(cp.marker, `PE2-${aid}-c4`, '④ 回显 marker 落面板 xterm');
    C.check(cp.done, `PE2-${aid}-c5`, '⑤ run:done 收尾');
    C.check(cp.replay, `PE2-${aid}-c6`, '⑥ 重开回放恢复含 marker');
    C.check(cp.topo, `PE1-${aid}-topo`, `拓扑序 == ${JSON.stringify(f.topo)}`);
    C.check(cp.status, `PE1-${aid}-status`, '面板状态行无 error/end 异常');
    C.check(cp.sidMatch, `PE1-${aid}-sid`, 'node:done #sid8 == 面板绑定 sid（P1 漂移判别）');
    C.check(discipline, `PE1-${aid}-clean`, `会话纪律（本轮新建 ${extraCount} 个全停止）`);
    cp.all = Object.values(cp).every(v => v === true) && discipline;
    console.log(`[round ${aid}] ${cp.all ? 'GREEN' : 'RED'} · ${diag}`);
    if (opts.probe) {
      const tl = await page.evaluate(() => (window.__peTL || [])).catch(() => []);
      if (tap) tap.stop();
      console.log(`[probe] 面板 sid=${sid || panelSid || '-'} · 本轮新建会话 ${extraCount} 个`);
      console.log(`[probe] ch2 独立订阅者帧（${tap ? tap.frames.length : 0}）：${
        (tap ? tap.frames : []).map(x => `${x.t}@${x.dt}ms`).join(' ') || '(零帧)'}`);
      console.log(`[probe] ch2 含 marker 帧：${(tap ? tap.frames : []).some(x => x.data.includes(marker)) ? '有' : '无'}`);
      console.log(`[probe] ch1 DOM 时间线：${JSON.stringify(tl.slice(0, 40))}`);
    }
  }
  return cp;
}

/* ================================================================ */
const C = new Checker();
console.log(`== pty-echo-matrix（BUG-0057-02 判别矩阵 E2E）== mode=${PROBE ? 'probe' : BASELINE ? 'baseline' : 'full'}`);
/* PE0：前置产物 + 探针 server + 会话基线（SPEC §4.2） */
C.ok(preflight().every(d => d.exists), 'PE0-1', '构建产物前置（npm run build && npm run build:server）',
  { actual: preflight().filter(d => !d.exists).map(d => d.file).join(',') || 'ok' });
const port = await getFreePort();
const srv = await startServer(port, { env: ENV_ON });   /* 失败即抛（附 logTail）= PE0-2 红 */
C.pass('PE0-2', `探针 server 健康（PTY_ENABLED=1 · ${srv.base}）`);
const base = srv.base;
C.eq((await listSessions(base)).length, 0, 'PE0-3', '会话基线数 0');
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
try {
  if (PROBE) {
    await runRound(C, page, base, 'C', 'p1', { probe: true });
  } else if (BASELINE) {
    for (const form of ['C', 'D']) {
      let red = 0;
      for (let i = 1; i <= 10; i++) if (!(await runRound(C, page, base, form, `b${i}`)).marker) red++;
      console.log(`[baseline] 形态 ${form}：${10 - red}/10 绿 · 失败率 ${red}/10 ${red > 0 ? '（已复现）' : '（未复现）'}`);
    }
  } else {
    for (const [form, n] of [['A', 1], ['B', 1], ['C', 2], ['D', 2]])
      for (let i = 1; i <= n; i++)
        C.check((await runRound(C, page, base, form, `r${i}`)).all, `PE1-${form}-r${i}`, `${form} 形态第 ${i} 轮全链绿`);
    let red = 0;
    for (let i = 1; i <= 10; i++) if (!(await runRound(C, page, base, 'C', `s${i}`)).all) red++;
    C.check(red === 0, 'PE3-summary', 'C 形态高频采样 10 轮失败率 0', { actual: `失败率 ${red}/10` });
  }
} finally {
  await browser.close().catch(() => { /* 已关 */ });
  try { srv.child.kill('SIGKILL'); } catch { /* 已退出 */ }
  await srv.exitPromise;
}
console.log(`== 结果 PASS ${C.passed} / FAIL ${C.failed} ==`);
process.exit(C.failed ? 1 : 0);
