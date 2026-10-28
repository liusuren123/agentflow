/* ================================================================
 *  server-sync.js — 服务端持久化接入层（ADR-0006 方案 A）
 *  · 被 legacy/app.js 消费；本模块只承载「数据与状态层」（ADR 4.4）：
 *    /api/v1 fetch 封装、服务端列表缓存（内存态，不入 localStorage）、
 *    回放事件 → logline 行映射、按需刷新回调。
 *  · 不直接操作面板 DOM：渲染时序规约（ADR 4.6）归 app.js —— fetch
 *    完成后仅触发注册的回调重绘对应分组容器，不整面板重绘。
 *  · 仅 /api/v1 命名空间（ADR-0005：持久化端点无旧别名）。
 * ================================================================ */

const V1 = '/api/v1';

const escHtml = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- fetch 封装：非 2xx / 网络错误统一抛 Error（调用方静默降级） ---------- */
async function apiJson(path, opts = {}){
  const r = await fetch(V1 + path, { signal: AbortSignal.timeout(8000), ...opts });
  if(!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/* 工作流：列表摘要 / 完整回读 / upsert 保存（id 为空 = 服务端生成新 id） */
export const fetchWorkflowList = () => apiJson('/workflows').then(j => Array.isArray(j.workflows) ? j.workflows : []);
export const fetchWorkflow = id => apiJson('/workflows/' + encodeURIComponent(id));
export const saveWorkflowToServer = (id, body) => apiJson('/workflows' + (id ? '/' + encodeURIComponent(id) : ''),
  { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
/* 删除（ADR-0007）：单卡删除；成功 {ok:true}，404/409 走非 2xx 抛错（HTTP 状态进 message） */
export const deleteWorkflowFromServer = id => apiJson('/workflows/' + encodeURIComponent(id), { method: 'DELETE' });
export const deleteRunFromServer = id => apiJson('/runs/' + encodeURIComponent(id), { method: 'DELETE' });

/* 会话（BK-0034）：列表（updated_at 倒序）/ 详情 {session,messages} / 新建 / 停止
 * ——仅数据层（ADR 4.4），面板 DOM 归 app.js；409/404 走非 2xx 抛错由调用方提示 */
export const fetchSessionList = (limit = 20) => apiJson('/sessions?limit=' + limit).then(j => Array.isArray(j.sessions) ? j.sessions : []);
export const fetchSessionDetail = id => apiJson('/sessions/' + encodeURIComponent(id));
export const createSessionOnServer = body => apiJson('/sessions',
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export const stopSessionOnServer = id => apiJson('/sessions/' + encodeURIComponent(id) + '/stop', { method: 'POST' });

/* 运行历史：列表（started_at 倒序）/ 单条完整事件回放 */
export const fetchRunList = (limit = 50) => apiJson('/runs?limit=' + limit).then(j => Array.isArray(j.runs) ? j.runs : []);
export const fetchRunDetail = id => apiJson('/runs/' + encodeURIComponent(id));
/* 工作台（BK-0040）：git 信息（E1）——仅数据层（ADR 4.4），面板 DOM 归 app.js；
   404/500 走非 2xx 抛错，由调用方渲染错误态 */
export const fetchWorkbenchGit = (limit = 20) => apiJson('/workbench/git?limit=' + limit);
/* 工作台（BK-0041 / 迭代 0054）：diff 审查（E2，ADR-0016 §3.2）——仅数据层零 DOM；
   URLSearchParams 负责查询串编码（ref/path 含 / 与 . 安全传递），空串省略 = 端点
   缺省语义（base=HEAD、head=工作区）；400/404/500 走非 2xx 抛错 → 面板错误态；
   stat 模式为 API 级能力，前端不传（UI 无开关，SPEC §1 不做范围） */
export const fetchWorkbenchDiff = (q = {}) => {
  const p = new URLSearchParams();
  if(q.base) p.set('base', q.base);
  if(q.head) p.set('head', q.head);
  if(q.path) p.set('path', q.path);
  if(q.stat) p.set('stat', '1');
  const s = p.toString();
  return apiJson('/workbench/diff' + (s ? '?' + s : ''));
};
/* 工作台（BK-0042 / 迭代 0056）：目录树（E3，ADR-0016 §3.3）——仅数据层零 DOM；
   path/depth 经 URLSearchParams 编码；空串省略 = 端点缺省语义（根 + depth 2）；
   400/404/500 走非 2xx 抛错 → 面板错误态；行级下钻直调本函数（不占 SVR.wbTree
   当前根树缓存，ADR-0006「fetch 封装」边界） */
export const fetchWorkbenchTree = (q = {}) => {
  const p = new URLSearchParams();
  if(q.path) p.set('path', q.path);
  if(q.depth) p.set('depth', String(q.depth));
  const s = p.toString();
  return apiJson('/workbench/tree' + (s ? '?' + s : ''));
};

/* PTY 会话（BK-0045 / 迭代 0057）：仅数据层零 DOM（ADR 4.4）；create 201/503/429/500
   与 write 404/400/403、stop 404 走非 2xx 抛错（HTTP 状态进 message），由面板态呈现；
   SVR 缓存/arrive 回调零新增——v1 无 pty 列表 UI 消费面（sessions 数据面收窄，
   SPEC D5）。 */
export const createPtySessionOnServer = () => apiJson('/pty/sessions', { method: 'POST' });
export const writePtySession = (id, data) => apiJson('/pty/sessions/' + encodeURIComponent(id) + '/write',
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, origin: 'user' }) });
export const stopPtySessionOnServer = id => apiJson('/pty/sessions/' + encodeURIComponent(id) + '/stop', { method: 'POST' });

/* PTY 输出流（端点私有帧 ready/data/warn/exit，零 shared 契约，ADR-0014 §3.4）：
   fetch + getReader 逐帧 JSON.parse（goalSendTurn SSE 同型）→ onFrame 回调分发；
   body 耗尽时补发本地合成帧 {t:'end'}（客户端私有，非端点契约——gate mock 静态
   body 的确定性终点）。消费循环整体 try/catch + 单帧回调隔离（BUG-0057-02
   修复轮）：原形态任一瞬时读错或 onFrame 异常 = unhandled rejection 静默杀死
   循环——此后所有帧（含 agent 注入回显）永不到达面板且零呈现；现在异常帧
   跳过、读循环异常如实发 {t:'error'}（signal 主动中止除外）、close() 幂等。 */
export async function openPtyStream(id, { signal, onFrame } = {}){
  const resp = await fetch(V1 + '/pty/sessions/' + encodeURIComponent(id) + '/stream', { signal });
  if(!resp.ok || !resp.body) throw new Error('HTTP ' + resp.status);
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  void (async () => {
    try{
      for(;;){
        const { done, value } = await reader.read();
        if(done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while((idx = buf.indexOf('\n\n')) >= 0){
          const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
          const line = chunk.split('\n').find(l => l.startsWith('data: '));
          if(!line) continue;
          let f; try{ f = JSON.parse(line.slice(6)); }catch(_){ continue; }
          try{ onFrame && onFrame(f); }catch(_){ /* 单帧回调异常不杀循环（BUG-0057-02） */ }
        }
      }
      onFrame && onFrame({ t: 'end' });
    }catch(err){
      if(signal && signal.aborted) return;   /* close()/dispose 的主动中止：非异常 */
      onFrame && onFrame({ t: 'error', msg: String(err && err.message || err).slice(0, 60) });
    }
  })();
  return { close(){ try{ reader.cancel(); }catch(_){ /* 已断 */ } } };
}

/* 能力清单（BK-0049 / ADR-0018）：GET /api/v1/capabilities → 归一化 {servers,skills}
 * 数据层三件套：fetch（apiJson 8s 超时同口径）→ SVR.caps 缓存 → onCapsArrive 回调。
 * capShapeOf 纯数据变换（零 DOM）：形态非法抛错 → refreshCaps 捕获 → 前端回退集
 * 保持（app.js 持有回退字面量，ADR-0018 §6 等价迁移口径）。 */
function capShapeOf(j){
  const bad = () => { throw new Error('capabilities 形态非法'); };
  if(!j || typeof j !== 'object') bad();
  const builtin = j.mcp && j.mcp.builtin, external = j.mcp && j.mcp.external, skills = j.skills;
  if(!Array.isArray(builtin) || !Array.isArray(external) || !Array.isArray(skills)) bad();
  for(const sv of builtin){
    if(typeof sv.id !== 'string' || typeof sv.name !== 'string' || typeof sv.desc !== 'string'
       || !Array.isArray(sv.tools)) bad();
    for(const t of sv.tools) if(typeof t.n !== 'string' || typeof t.d !== 'string') bad();
  }
  for(const e of external) if(typeof e.serverId !== 'string' || typeof e.kind !== 'string') bad();
  for(const sk of skills) if(typeof sk.id !== 'string' || typeof sk.name !== 'string' || typeof sk.desc !== 'string') bad();
  /* external → 服务级行（v1 无 tools 细目，ADR-0018 §2.3；desc 固定文案无时间戳，确定性） */
  return {
    servers: [
      ...builtin.map(sv => ({ id: sv.id, name: sv.name, desc: sv.desc, tools: sv.tools.map(t => ({ n: t.n, d: t.d })) })),
      ...external.map(e => ({ id: e.serverId, name: e.serverId, desc: '外部注册（' + e.kind + '）', tools: [] })),
    ],
    skills: skills.map(sk => ({ id: sk.id, name: sk.name, desc: sk.desc })),
  };
}
export const fetchCapabilities = () => apiJson('/capabilities').then(capShapeOf);

/* kb 清单（BK-0047 / ADR-0021）：GET /api/v1/kb → { kbs:[{name,docs,chunks,updated_at}] }
 * 数据层三件套（capabilities 同构）：fetch（apiJson 8s 超时同口径）→ SVR.kbs 缓存
 * → onKbsArrive 回调。kbShapeOf 纯数据变换（零 DOM，ADR-0006 边界）：契约全字段
 * 校验，非法抛错 → refreshKbs 捕获 → 前端回退集保持（回退集 = shared DEFS 合成 o
 * 的既有渲染，app.js 不持字面量，ADR-0003 单一来源）。结构全量缓存：消费面当前只取
 * name，全形为链末项 BK-0048 与未来 kb 管理面留档。 */
function kbShapeOf(j){
  const bad = () => { throw new Error('kb 清单形态非法'); };
  if(!j || typeof j !== 'object' || !Array.isArray(j.kbs)) bad();
  for(const kb of j.kbs){
    if(typeof kb.name !== 'string' || typeof kb.docs !== 'number'
       || typeof kb.chunks !== 'number' || typeof kb.updated_at !== 'number') bad();
  }
  return { kbs: j.kbs.map(kb => ({ name: kb.name, docs: kb.docs, chunks: kb.chunks, updated_at: kb.updated_at })) };
}
export const fetchKbList = () => apiJson('/kb').then(kbShapeOf);

/* ---------- 服务端缓存（内存态 —— ADR 4.4；null = 尚未成功拉取过） ---------- */
export const SVR = {
  wf: null,            // WorkflowSummary[] | null：{id,name,updated_at}
  wfErr: false,        // 最近一次列表拉取失败 → 分组渲染错误空态
  runs: null,          // RunRow[] | null：{id,workflow_name,status,started_at,ended_ms,done,total}
  runsErr: false,
  runEvents: new Map(),// runId → events[]（成功）| null（404/失败）
  openRunId: null,     // 历史面板当前展开回放的 runId（同面板同时只展开一个）
  sessions: null,      // SessionRow[] | null：{id,title,model,sys,created_at,updated_at}（BK-0034）
  sessionsErr: false,  // 最近一次会话列表拉取失败 → 恢复列表错误空态
  caps: null,          // {servers,skills} | null：能力清单（BK-0049 / ADR-0018；null=未成功拉取过，前端保持回退集）
  capsErr: false,      // 最近一次能力清单拉取失败（静默降级，无 toast/日志行）
  kbs: null,           // {kbs:[{name,docs,chunks,updated_at}]} | null：kb 清单（BK-0047 / ADR-0021；null=未成功拉取过，前端保持 DEFS 回退集）
  kbsErr: false,       // 最近一次 kb 清单拉取失败（静默降级，无 toast/日志行，capsErr 同口径）
  wbGit: null,         // E1 出参 | null：{branch,head,changes,commits}（BK-0040）
  wbGitErr: false,     // 最近一次 git 信息拉取失败 → 工作台错误空态
  wbDiff: null,        // E2 出参 | null：{files:[{path,status,adds,dels,patch}],truncated}（BK-0041 / 迭代 0054）
  wbDiffErr: false,    // 最近一次 diff 拉取失败 → diff 页错误空态
  wbTree: null,        // E3 出参 | null：{root:{name,path,children},truncated}（BK-0042 / 迭代 0056）
  wbTreeErr: false,    // 最近一次目录树拉取失败 → tree 页错误空态
};

/* ---------- 按需刷新回调（app.js 注册；容器不在 DOM 时回调自行 no-op） ---------- */
let wfArrive = null, runsArrive = null, sessionsArrive = null, capsArrive = null, kbsArrive = null;
let wbGitArrive = null;   // 工作台 git 信息到达回调（BK-0040）
let wbDiffArrive = null;  // 工作台 diff 到达回调（BK-0041 / 迭代 0054）
let wbTreeArrive = null;  // 工作台目录树到达回调（BK-0042 / 迭代 0056）
export function onWorkflowsArrive(fn){ wfArrive = fn; }
export function onRunsArrive(fn){ runsArrive = fn; }
export function onSessionsArrive(fn){ sessionsArrive = fn; }
export function onCapsArrive(fn){ capsArrive = fn; }
export function onKbsArrive(fn){ kbsArrive = fn; }
export function onWorkbenchGitArrive(fn){ wbGitArrive = fn; }
export function onWorkbenchDiffArrive(fn){ wbDiffArrive = fn; }
export function onWorkbenchTreeArrive(fn){ wbTreeArrive = fn; }

export async function refreshWorkflows(){
  try{ SVR.wf = await fetchWorkflowList(); SVR.wfErr = false; }
  catch(_){ SVR.wfErr = true; }
  wfArrive && wfArrive();
}
export async function refreshRuns(){
  try{ SVR.runs = await fetchRunList(50); SVR.runsErr = false; }
  catch(_){ SVR.runsErr = true; }
  runsArrive && runsArrive();
}
export async function refreshSessions(){
  try{ SVR.sessions = await fetchSessionList(20); SVR.sessionsErr = false; }
  catch(_){ SVR.sessionsErr = true; }
  sessionsArrive && sessionsArrive();
}
/* 能力清单刷新：fire-and-forget（app.js init 调用）；失败静默——SVR.caps 保持
 * null，到达回调据此 no-op，前端回退集不动（ADR-0018 §6）。 */
export async function refreshCaps(){
  try{ SVR.caps = await fetchCapabilities(); SVR.capsErr = false; }
  catch(_){ SVR.capsErr = true; }
  capsArrive && capsArrive();
}
/* kb 清单刷新：fire-and-forget（app.js init / 选中 retrieval 节点时调用）；失败
 * 静默——SVR.kbs 保持原值、回调不触发（数据未变，无需重绘）。成功且内容有变
 * （含 null→数据首达）才发 kbsArrive：「仅变更到达」是渲染⇄拉取环的唯一断点
 * （BUG-0065-01 修复轮）——到达回调 renderProps → renderProps 内又刷新本清单，
 * 原无条件回调即成 renderProps⇄refreshKbs⇄onKbsArrive 死循环（在线态选中
 * retrieval 实测 315 次 GET /3s，REPORT §1）；内容比对基于 kbShapeOf 归一化
 * 输出（键序固定，stringify 比对确定）。不变则不重绘：环必终止，且「数据
 * 真实变化才重绘」与 ADR-0018 §6 到达语义一致。 */
export async function refreshKbs(){
  try{
    const next = await fetchKbList();
    const changed = !SVR.kbs || JSON.stringify(SVR.kbs) !== JSON.stringify(next);
    SVR.kbs = next; SVR.kbsErr = false;
    if(changed) kbsArrive && kbsArrive();
  }
  catch(_){ SVR.kbsErr = true; }
}
export async function refreshWorkbenchGit(limit = 20){
  try{ SVR.wbGit = await fetchWorkbenchGit(limit); SVR.wbGitErr = false; }
  catch(_){ SVR.wbGitErr = true; }
  wbGitArrive && wbGitArrive();
}
export async function refreshWorkbenchDiff(q){
  try{ SVR.wbDiff = await fetchWorkbenchDiff(q); SVR.wbDiffErr = false; }
  catch(_){ SVR.wbDiffErr = true; }
  wbDiffArrive && wbDiffArrive();
}
export async function refreshWorkbenchTree(q){
  try{ SVR.wbTree = await fetchWorkbenchTree(q); SVR.wbTreeErr = false; }
  catch(_){ SVR.wbTreeErr = true; }
  wbTreeArrive && wbTreeArrive();
}

/* 展开回放：成功/失败都写入缓存（null=获取失败），由回调重绘分组容器 */
export async function loadRunDetail(id){
  try{
    const d = await fetchRunDetail(id);
    SVR.runEvents.set(id, Array.isArray(d.events) ? d.events : []);
  }catch(_){ SVR.runEvents.set(id, null); }
}

/* ---------- 时间格式化（started_at / updated_at：Unix 毫秒 → 本地时间串） ---------- */
const p2 = n => String(n).padStart(2, '0');
export function fmtTs(ts){
  const d = new Date(ts);
  return Number.isFinite(d.getTime())
    ? `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
    : '-';
}

/* ================================================================
 *  回放事件 → .logline 行映射（ADR 4.3）
 *  逐条对齐 runReal.onEvent 中 addLog 的实时语义——回放是静态重放，
 *  不产生任何画布副作用；run:progress / node:delta 实时亦不落日志，跳过。
 *  .t 列显示事件序号（= run_events.seq，run:accepted=0 起与数组下标一致；
 *  SSE 事件契约不含时间戳，序号是唯一诚实的顺序标记，不虚构时间）。
 * ================================================================ */
function mapEvent(ev){
  switch(ev.type){
    case 'run:accepted':    return { m: `run 已受理 · #${escHtml(String(ev.runId || '').slice(0, 8))}`, lvl: 'info' };
    case 'run:start':       return { m: `━━ 开始运行「${escHtml(ev.name || '')}」 · ${ev.total ?? 0} 个节点待执行 ━━`, lvl: 'sys' };
    case 'node:start':      return { m: `▶ ${escHtml(ev.title)} · ${escHtml(ev.defName || '')}${ev.iteration ? ` · 迭代${ev.iteration}` : ''}`, lvl: 'info' };
    case 'node:bypass':     return { m: `⏸ ${escHtml(ev.title)} · 已旁路，跳过执行`, lvl: 'warn' };
    case 'node:done': {
      const s = String(ev.out != null ? ev.out : '');
      return { m: `✓ ${escHtml(ev.title)} · ${escHtml(s.slice(0, 44))}${s.length > 44 ? '…' : ''}`, lvl: 'ok' };
    }
    case 'node:error':      return { m: `✗ ${escHtml(ev.title)} · ${escHtml(String(ev.message || '').slice(0, 90))}`, lvl: 'warn' };
    case 'cond':            return { m: `↳ ${escHtml(ev.title)} · ${escHtml(ev.expr || '条件')} → <b style="color:#22d3ee">${escHtml(ev.branch)}</b>`, lvl: 'sys' };
    case 'log':             return { m: escHtml(ev.msg || ''), lvl: ev.lvl || 'info' };
    case 'output': {
      const s = String(ev.text || '');
      return { m: `◉ 最终输出：${escHtml(s.slice(0, 100))}${s.length > 100 ? '…' : ''}`, lvl: 'ok' };
    }
    case 'approval:required': return { m: `⏳ ${escHtml(ev.title)} · 等待人工审批`, lvl: 'sys' };
    case 'approval:done':     return { m: `👤 审批已${ev.approve ? '通过' : '拒绝'}`, lvl: 'sys' };
    case 'run:error':       return { m: `✗ 引擎错误：${escHtml(String(ev.message || '').slice(0, 140))}`, lvl: 'warn' };
    case 'run:done':
      return { m: `● ${ev.stopped ? '运行停止' : '运行完成'} · ${ev.done ?? 0}/${ev.total ?? 0} · ${(Number(ev.ms) || 0) / 1000}s`,
               lvl: (ev.ok !== false && !ev.stopped) ? 'ok' : 'warn' };
    default: return null;   /* run:progress / node:delta / 未知类型：不渲染行 */
  }
}

export function replayLines(events){
  const out = [];
  (Array.isArray(events) ? events : []).forEach((ev, i) => {
    if(!ev || !ev.type) return;
    const line = mapEvent(ev);
    if(line) out.push({ t: '#' + String(i).padStart(2, '0'), m: line.m, lvl: line.lvl });
  });
  return out;
}

/* ---------- 服务端 runs 行 → 卡片呈现参数（复用既有 .run-item 双态色） ---------- */
/* status → {cls, icon, rtSuffix}（ADR 4.2：error/stopped 共用琥珀，差异落文本） */
export function runCardMeta(status){
  switch(status){
    case 'done':    return { cls: 'ok',   icon: 'check', suffix: '' };
    case 'error':   return { cls: 'stop', icon: 'square', suffix: ' · 失败' };
    case 'running': return { cls: 'stop', icon: 'square', suffix: ' · 进行中' };
    default:        return { cls: 'stop', icon: 'square', suffix: '' };   /* stopped */
  }
}
