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

/* 运行历史：列表（started_at 倒序）/ 单条完整事件回放 */
export const fetchRunList = (limit = 50) => apiJson('/runs?limit=' + limit).then(j => Array.isArray(j.runs) ? j.runs : []);
export const fetchRunDetail = id => apiJson('/runs/' + encodeURIComponent(id));

/* ---------- 服务端缓存（内存态 —— ADR 4.4；null = 尚未成功拉取过） ---------- */
export const SVR = {
  wf: null,            // WorkflowSummary[] | null：{id,name,updated_at}
  wfErr: false,        // 最近一次列表拉取失败 → 分组渲染错误空态
  runs: null,          // RunRow[] | null：{id,workflow_name,status,started_at,ended_ms,done,total}
  runsErr: false,
  runEvents: new Map(),// runId → events[]（成功）| null（404/失败）
  openRunId: null,     // 历史面板当前展开回放的 runId（同面板同时只展开一个）
};

/* ---------- 按需刷新回调（app.js 注册；容器不在 DOM 时回调自行 no-op） ---------- */
let wfArrive = null, runsArrive = null;
export function onWorkflowsArrive(fn){ wfArrive = fn; }
export function onRunsArrive(fn){ runsArrive = fn; }

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
