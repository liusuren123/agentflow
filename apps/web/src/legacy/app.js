/* 本文件由 tools/extract-web.mjs 从 index.html 逐字提取（宪法：机械移植）。
 * 原脚本为顶层副作用式；此处包装为 bootLegacyApp() 供 React 在骨架渲染后调用。 */
import { NODES } from '@agentflow/shared';
import { SVR, refreshWorkflows, refreshRuns, loadRunDetail, fetchWorkflow, saveWorkflowToServer,
         deleteWorkflowFromServer, deleteRunFromServer,
         onWorkflowsArrive, onRunsArrive, fmtTs, replayLines, runCardMeta } from '../server-sync.js';
import { fetchSessionDetail, createSessionOnServer, stopSessionOnServer, refreshSessions,
         refreshCaps, onCapsArrive, refreshKbs, onKbsArrive } from '../server-sync.js';
import { refreshWorkbenchGit } from '../server-sync.js';
import { refreshWorkbenchDiff } from '../server-sync.js';
import { refreshWorkbenchTree, fetchWorkbenchTree } from '../server-sync.js';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { createPtySessionOnServer, writePtySession, stopPtySessionOnServer, openPtyStream } from '../server-sync.js';

'use strict';
let __af_booted = false;
export function bootLegacyApp(){
  if (__af_booted) return; __af_booted = true;

/* ================================================================
 *  AgentFlow — 仿 ComfyUI 新前端布局的智能体工作流原型（纯前端演示）
 *  布局依据 ComfyUI_frontend 源码：
 *   - 左侧 56px 图标工具栏       SideToolbar.vue / splitterConstants.ts
 *   - 侧栏内容面板 ≥312px        LiteGraphCanvasSplitterOverlay.vue
 *   - 顶栏工作流标签页            WorkflowTabs.vue
 *   - 画布顶中浮动运行卡          TopMenuSection.vue → ComfyActionbar
 *   - 画布右下工具条              GraphCanvasMenu.vue
 *   - 右侧属性面板 ≥240px        NodePropertiesPanel
 *   - 底部日志面板                BottomPanel.vue
 *  单文件 · 零依赖 · 数据保存在 localStorage
 * ================================================================ */

/* ---------- 基础工具 ---------- */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const esc = s => String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const now = () => { const d=new Date(); return [d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':'); };

/* ---------- 端口类型（颜色取自 ComfyUI 实机截图：亮=连线，暗=端口） ---------- */
/* pc = 已连接端口色（类型色调白 40%，text 实测 #64b5f6）；dc = 未连接暗色 */
const PTYPES = {
  any:    { c:'#f06060', dc:'#602020', pc:'#f6a0a0', label:'任意' },
  text:   { c:'#0080e0', dc:'#206090', pc:'#64b5f6', label:'文本' },
  list:   { c:'#f0d000', dc:'#785b33', pc:'#f6ec66', label:'列表' },
  object: { c:'#b090d0', dc:'#785776', pc:'#cfbde3', label:'对象' },
  number: { c:'#60b0f0', dc:'#2a5070', pc:'#a3d2f6', label:'数值' },
};
const typeOk = (a,b) => a===b || a==='any' || b==='any';

/* ---------- 节点定义 ---------- */
const CATS = {
  input:     { name:'输入',   c:'var(--cat-input)' },
  chat:      { name:'对话',   c:'var(--cat-chat)' },
  agent:     { name:'智能体',   c:'var(--cat-agent)' },
  knowledge: { name:'知识',   c:'var(--cat-knowledge)' },
  tools:     { name:'工具',   c:'var(--cat-tools)' },
  logic:     { name:'逻辑',   c:'var(--cat-logic)' },
  output:    { name:'输出',   c:'var(--cat-output)' },
  human:     { name:'人工',   c:'var(--cat-human)' },
};

/* ---------- SVG 图标（Lucide 风格：stroke currentColor，随上下文变色） ---------- */
const ICON_PATHS = {
  'zap':'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  'keyboard':'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/>',
  'bot':'<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  'file-text':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h6"/>',
  'book-open':'<path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/>',
  'globe':'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  'plug':'<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>',
  'code':'<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>',
  'send':'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  'git-branch':'<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'repeat':'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  'timer':'<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
  'merge':'<path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/>',
  'reply':'<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
  'tag':'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  'user-check':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>',
  'save':'<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
  'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  'upload':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  'sparkles':'<path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287z"/>',
  'plus':'<path d="M5 12h14"/><path d="M12 5v14"/>',
  'x':'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'trash':'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'pencil':'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  'copy':'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'clipboard':'<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  'box-select':'<path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M14 3h1"/><path d="M9 21h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/>',
  'maximize':'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  'star':'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'check':'<polyline points="20 6 9 17 4 12"/>',
  'square':'<rect width="14" height="14" x="5" y="5" rx="1.5"/>',
  'x-square':'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
  'chev-right':'<path d="m9 18 6-6-6-6"/>',
  'chev-down':'<path d="m6 9 6 6 6-6"/>',
  'workflow':'<rect width="8" height="7" x="3" y="14" rx="1"/><rect width="8" height="7" x="13" y="3" rx="1"/><path d="M7 14V7a2 2 0 0 1 2-2h4"/>',
  'play':'<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
  'info':'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  'pause':'<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  'rotate':'<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
  'dots':'<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>',
  'stop':'<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>',
};
const I = name => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(ICON_PATHS[name]||'')+'</svg>';

/* ---------- 能力注册表：MCP 服务器 / Skill —— 离线回退集（在线时经
 * /api/v1/capabilities 刷新为后端供数，ADR-0018 / BK-0049；字面量逐字保留） ---------- */
let MCP_SERVERS = [
  { id:'filesystem', name:'filesystem', desc:'本地文件读写',
    tools:[{n:'read_file',d:'读取文件'},{n:'write_file',d:'写入文件'},{n:'list_directory',d:'列出目录'}] },
  { id:'fetch', name:'fetch', desc:'网页抓取',
    tools:[{n:'fetch',d:'抓取 URL'},{n:'download',d:'下载资源'}] },
  { id:'sqlite', name:'sqlite', desc:'数据库查询',
    tools:[{n:'query',d:'执行查询'},{n:'execute',d:'执行写入'}] },
  { id:'browser', name:'browser', desc:'浏览器自动化',
    tools:[{n:'navigate',d:'打开页面'},{n:'click',d:'点击元素'},{n:'screenshot',d:'截屏'}] },
  { id:'web-search', name:'web-search', desc:'联网搜索',
    tools:[{n:'search',d:'搜索'},{n:'news',d:'新闻检索'}] },
];
let SKILL_LIST = [
  { id:'ppt-builder', name:'PPT 生成器', desc:'根据大纲生成演示文稿' },
  { id:'doc-writer', name:'文档撰写', desc:'长文写作与润色' },
  { id:'data-analyst', name:'数据分析', desc:'表格解读与图表建议' },
  { id:'coder', name:'编程助手', desc:'代码生成与审查' },
  { id:'translator', name:'多语言翻译', desc:'中英日韩互译' },
];
/* 节点能力声明：caps:['mcp','skill'] */
const capSummary = n => {
  let tools=0, servers=0;
  Object.entries(n.mcp||{}).forEach(([sid,arr])=>{ if(arr&&arr.length){ servers++; tools+=arr.length; } });
  return { servers, tools, skills:(n.skills||[]).length };
};

const catColor = t => getComputedStyle(document.documentElement)
  .getPropertyValue({input:'--cat-input',chat:'--cat-chat',agent:'--cat-agent',knowledge:'--cat-knowledge',tools:'--cat-tools',
    logic:'--cat-logic',output:'--cat-output',human:'--cat-human'}[t]).trim()||'#666';

const DEFS = NODES;   /* 单一事实源：@agentflow/shared（ADR-0003） */

/* ---------- 内置模板（Templates 侧栏） ---------- */
const SAMPLES = {
  kefu: { name:'智能客服助手', desc:'RAG 知识库检索 + LLM 生成回复，按置信度分流：高置信直接回复，低置信转人工审批并升级通知。',
    nodes:[
      {id:1, type:'trigger',    x:40,  y:330, title:'手动触发'},
      {id:2, type:'prompt',     x:410, y:60,  title:'客服提示词'},
      {id:3, type:'retrieval',  x:410, y:330, title:'知识库检索'},
      {id:4, type:'llm',        x:790, y:200, title:'LLM 生成回复',
       mcp:{'web-search':['search']}, skills:['doc-writer']},
      {id:5, type:'condition',  x:1170,y:200, title:'置信度判断'},
      {id:6, type:'reply',      x:1540,y:70,  title:'直接回复用户'},
      {id:7, type:'approval',   x:1540,y:350, title:'转人工审批'},
      {id:8, type:'notify',     x:1910,y:350, title:'升级通知'},
    ], edges:[
      {id:1, fn:1,fp:0, tn:3,tp:0}, {id:2, fn:2,fp:0, tn:4,tp:0},
      {id:3, fn:3,fp:0, tn:4,tp:1}, {id:4, fn:4,fp:0, tn:5,tp:0},
      {id:5, fn:5,fp:0, tn:6,tp:0}, {id:6, fn:5,fp:1, tn:7,tp:0},
      {id:7, fn:7,fp:0, tn:8,tp:0},
    ]},
  content: { name:'内容创作流水线', desc:'网页搜索热点参考 + 提示词模板，双 LLM 串联完成初稿撰写与润色优化，最终输出成稿。',
    nodes:[
      {id:1, type:'userinput', x:40,  y:310, title:'主题输入'},
      {id:2, type:'websearch', x:40,  y:60,  title:'热点搜索'},
      {id:3, type:'prompt',    x:410, y:60,  title:'文案提示词', params:{tpl:'请围绕主题《{{topic}}》撰写一篇约 800 字的小红书种草文案，要求包含 emoji、分段小标题与话题标签。'}},
      {id:4, type:'llm',       x:790, y:190, title:'撰写初稿'},
      {id:5, type:'llm',       x:1170,y:190, title:'润色优化', params:{sys:'你是资深新媒体编辑，擅长把稿件改得更生动、更有感染力。', model:'GLM-4.7'}},
      {id:6, type:'reply',     x:1540,y:190, title:'输出成稿'},
    ], edges:[
      {id:1, fn:1,fp:0, tn:3,tp:0}, {id:2, fn:2,fp:0, tn:4,tp:1},
      {id:3, fn:3,fp:0, tn:4,tp:0}, {id:4, fn:4,fp:0, tn:5,tp:0},
      {id:5, fn:5,fp:0, tn:6,tp:0},
    ]},
};

/* ---------- 全局状态（多标签页工作流） ---------- */
const LS_KEY = 'agentflow.v2';
let tabs = [];          // [{name, nodes, edges, nextId, view}]
let activeTab = 0;
let state = { name:'未命名工作流', nodes:[], edges:[], nextId:1 };
let view  = { x:60, y:40, scale:1 };
let runs = [];          // 运行历史 [{name,time,dur,nodes,ok}]
let lastRunVars = null;         // 最近一次真实运行的变量表快照（run:done 附带）
const lastRunData = new Map();  // 节点id → {inputs:[{tp,from,val}], out}（node:done 附带）
let settings = { grid:false, flowAnim:true, speed:1, autosave:true, snap:false, favs:['llm','retrieval','condition'] };
let railTab = null;     // 当前展开的侧栏: nodes/workflows/templates/history/settings
let canvasMode = 'pan'; // pan | select
const sel  = { nodes:new Set(), edges:new Set() };
let undoStack = [], redoStack = [];
let running = false, stopFlag = false;
let clipboard = null;
const portCache = new Map();
const edgeEls  = new Map();

const viewport = $('#viewport'), world = $('#world'), edgesSvg = $('#edges'),
      nodesLayer = $('#nodes-layer'), ghost = $('#ghost-link');

const nodeById = id => state.nodes.find(n=>n.id===id);
const defOf    = n => DEFS[n.type];
const paramsOf = n => {
  const out = {};
  (defOf(n).params||[]).forEach(p=>out[p.k]=p.d);
  return Object.assign(out, n.params||{});
};

/* ================================================================
 *  标签页（WorkflowTabs）
 * ================================================================ */
/* wfId/wfInputs：服务端关联字段（ADR-0006 4.4）——可选，旧 localStorage 数据无此字段即纯本地工作流 */
function snapshotTab(){ const t = tabs[activeTab]||{}; return {name:state.name, nodes:state.nodes, edges:state.edges, nextId:state.nextId, view, wfId:t.wfId, wfInputs:t.wfInputs}; }
function syncToTabs(){ if(tabs[activeTab]) tabs[activeTab] = snapshotTab(); }
function renderTabsBar(){
  const list = $('#tabs-list');
  list.innerHTML = tabs.map((t,i)=>`
    <div class="wtab ${i===activeTab?'active':''}" data-i="${i}">
      <span class="wt-dot"></span><span class="wt-name">${esc(t.name||'未命名')}</span>
      <button class="wt-close" data-i="${i}" title="关闭">${I('x')}</button>
    </div>`).join('');
}
function switchTab(i){
  if(i===activeTab || !tabs[i]) return;
  if(running){ toast('运行中无法切换工作流','warn'); return; }
  syncToTabs();
  activeTab = i;
  const t = tabs[i];
  state = {name:t.name, nodes:t.nodes, edges:t.edges, nextId:t.nextId};
  view = t.view || {x:60,y:40,scale:1};
  clearSel(); undoStack=[]; redoStack=[];
  applyView(); renderAll(); renderTabsBar();
  if(railTab==='workflows') renderSidebar();
}
function closeTab(i){
  if(running){ toast('运行中无法关闭工作流','warn'); return; }
  if(tabs.length<=1){ toast('至少保留一个工作流标签页','warn'); return; }
  tabs.splice(i,1);
  if(activeTab>=tabs.length) activeTab = tabs.length-1;
  else if(activeTab>i) activeTab--;
  else if(activeTab===i){ const t=tabs[activeTab];
    state = {name:t.name, nodes:t.nodes, edges:t.edges, nextId:t.nextId};
    view = t.view || {x:60,y:40,scale:1};
    clearSel(); undoStack=[]; redoStack=[]; applyView(); renderAll();
  }
  renderTabsBar(); saveLocal();
  if(railTab==='workflows') renderSidebar();
}
function newTab(){
  syncToTabs();
  tabs.push({name:'未命名工作流', nodes:[], edges:[], nextId:1, view:{x:80,y:60,scale:1}});
  activeTab = tabs.length-1;
  const t = tabs[activeTab];
  state = {name:t.name, nodes:t.nodes, edges:t.edges, nextId:t.nextId};
  view = {...t.view};
  clearSel(); undoStack=[]; redoStack=[];
  applyView(); renderAll(); renderTabsBar(); saveLocal();
  if(railTab==='workflows') renderSidebar();
}
function addTabFromSample(key){
  const s = SAMPLES[key]; if(!s) return;
  syncToTabs();
  tabs.push({ name:s.name,
    nodes: s.nodes.map(n=>({...n, params:{...(n.params||{})}})),
    edges: s.edges.map(e=>({...e})),
    nextId: Math.max(...s.nodes.map(n=>n.id))+1, view:null });
  activeTab = tabs.length-1;
  const t = tabs[activeTab];
  state = {name:t.name, nodes:t.nodes, edges:t.edges, nextId:t.nextId};
  view = {x:60,y:40,scale:1};
  clearSel(); undoStack=[]; redoStack=[];
  applyView(); renderAll(); fitView(); renderAll();
  renderTabsBar(); saveLocal();
  addLog(`已从模板创建「${s.name}」`,'sys');
  if(railTab==='workflows'||railTab==='templates') renderSidebar();
}
$('#tabs-list').addEventListener('click', e=>{
  const close = e.target.closest('.wt-close');
  if(close){ closeTab(+close.dataset.i); return; }
  const tab = e.target.closest('.wtab');
  if(tab) switchTab(+tab.dataset.i);
});
$('#tabs-list').addEventListener('dblclick', e=>{
  const tab = e.target.closest('.wtab'); if(!tab) return;
  const i = +tab.dataset.i;
  const name = prompt('重命名工作流：', tabs[i].name);
  if(name){ tabs[i].name = name.trim()||tabs[i].name;
    if(i===activeTab) state.name = tabs[i].name;
    renderTabsBar(); saveLocal(); if(railTab==='workflows') renderSidebar(); }
});
$('#tabs-list').addEventListener('mousedown', e=>{ if(e.button===1){ const t=e.target.closest('.wtab'); if(t){ e.preventDefault(); closeTab(+t.dataset.i);} } });
$('#tab-new').addEventListener('click', newTab);

/* ================================================================
 *  左侧工具栏 + 侧栏内容
 * ================================================================ */
function setRailTab(id){
  if(railTab===id){ railTab=null; } else railTab=id;
  $('#sidebar').classList.toggle('open', !!railTab);
  $$('#rail .rail-btn[data-stab]').forEach(b=>b.classList.toggle('selected', b.dataset.stab===railTab));
  if(railTab) renderSidebar();
}
$$('#rail .rail-btn[data-stab]').forEach(b=>b.addEventListener('click', ()=>setRailTab(b.dataset.stab)));
$('#side-close').addEventListener('click', ()=>setRailTab(railTab));

const SIDE_TITLES = { nodes:'节点库', workflows:'工作流', templates:'模板', history:'任务历史', settings:'设置' };
function renderSidebar(){
  if(!railTab) return;
  $('#side-title').textContent = SIDE_TITLES[railTab]||'';
  const body = $('#side-body');
  if(railTab==='nodes') renderSideNodes(body);
  else if(railTab==='workflows') renderSideWorkflows(body);
  else if(railTab==='templates') renderSideTemplates(body);
  else if(railTab==='history') renderSideHistory(body);
  else if(railTab==='settings') renderSideSettings(body);
}

/* ----- 节点库侧栏 ----- */
let libTab = 'all';
function renderSideNodes(body){
  const favs = settings.favs||[];
  body.innerHTML = `
    <div class="lib-tabs">
      <button data-lt="all" class="${libTab==='all'?'on':''}">全部节点</button>
      <button data-lt="fav" class="${libTab==='fav'?'on':''}">收藏 · ${favs.length}</button>
    </div>
    <div class="lib-search"><input id="lib-q" placeholder="搜索节点…" spellcheck="false"></div>
    <div id="lib-list"></div>`;
  const paint = q=>{
    const s = (q||'').trim().toLowerCase();
    let html='', total=0;
    Object.entries(CATS).forEach(([cat,cfg])=>{
      const items = Object.entries(DEFS).filter(([k,d])=>
        d.cat===cat && (libTab!=='fav'||favs.includes(k)) &&
        (!s || (d.name+' '+d.kw+' '+d.desc+' '+cfg.name).toLowerCase().includes(s)));
      if(!items.length) return;
      total += items.length;
      html += `<div class="lib-cat" data-cat="${cat}">
        <div class="lib-cat-title"><span class="dot" style="background:${cfg.c}"></span>${cfg.name}
          <span class="cnt">${items.length}</span><span class="arr">▼</span></div>
        <div class="lib-items">${items.map(([k,d])=>`
          <div class="lib-node" data-type="${k}">
            <span class="lic" style="border-left:3px solid ${cfg.c}">${I(d.icon)}</span>
            <div><div class="ln">${esc(d.name)} ${(d.caps||[]).map(c=>`<span class="mini-tag">${c==='mcp'?'MCP':'Skill'}</span>`).join(' ')}</div><div class="ld">${esc(d.desc.slice(0,20))}…</div></div>
            <button class="fav ${favs.includes(k)?'on':''}" data-fav="${k}" title="收藏">${I('star')}</button>
          </div>`).join('')}</div></div>`;
    });
    $('#lib-list').innerHTML = html ||
      (libTab==='fav' ? '<div class="side-empty">还没有收藏<br>悬停节点卡片，点击星标收藏常用节点</div>'
                      : '<div class="side-empty">没有匹配的节点</div>');
  };
  paint('');
  $('#lib-q').addEventListener('input', e=>paint(e.target.value));
  body.querySelectorAll('.lib-tabs button').forEach(b=>
    b.addEventListener('click', ()=>{ libTab=b.dataset.lt; renderSideNodes(body); }));
}
$('#side-body').addEventListener('click', e=>{
  const t = e.target.closest('.lib-cat-title');
  if(t) t.parentElement.classList.toggle('closed');
});
/* 节点库拖入画布（自定义 ghost） */
$('#side-body').addEventListener('mousedown', e=>{
  const item = e.target.closest('.lib-node'); if(!item) return;
  e.preventDefault();
  dragCtx = { mode:'palette', type:item.dataset.type, sx:e.clientX, sy:e.clientY, moved:false, overViewport:false };
  const g = $('#pal-drag-ghost');
  g.innerHTML = I(DEFS[item.dataset.type].icon)+'<span style="margin-left:6px">'+esc(DEFS[item.dataset.type].name)+'</span>';
  g.style.display='block'; g.style.left=(e.clientX+14)+'px'; g.style.top=(e.clientY+10)+'px';
});

/* ----- 工作流侧栏 ----- */
function renderSideWorkflows(body){
  syncToTabs();
  body.innerHTML = `<div class="side-section-title">已打开 (${tabs.length})</div>` +
    tabs.map((t,i)=>`
      <div class="wf-item ${i===activeTab?'active':''}" data-i="${i}">
        <div class="wt">${esc(t.name||'未命名')} ${i===activeTab?'<span class="badge">当前</span>':''}</div>
        <div class="wm">${(t.nodes||[]).length} 节点 · ${(t.edges||[]).length} 连线</div>
      </div>`).join('') +
    `<div class="side-section-title">操作</div>
     <div style="padding:2px 12px 16px;display:flex;gap:8px">
       <button class="ibtn" id="wf-new" style="flex:1;justify-content:center">${I('plus')} 新建空白</button>
       <button class="ibtn" id="wf-templates" style="flex:1;justify-content:center">${I('sparkles')} 浏览模板</button>
     </div>` +
    /* 服务端分组（ADR-0006 方案 A）：离线仅提示（4.5），在线同步占位 + 异步填充（4.6） */
    (ENGINE.online
      ? `<div class="side-section-title">服务端</div>
         <div style="padding:2px 12px 16px;display:flex;gap:8px">
           <button class="ibtn" id="wf-cloud-save" style="flex:1;justify-content:center">${I('upload')} 保存当前工作流到服务端</button>
         </div>
         <div id="wf-cloud-list"><div class="side-empty">加载中…</div></div>`
      : `<div class="side-section-title">服务端</div>
         <div class="side-empty">后端未连接 · 启动 server 后可保存 / 加载工作流</div>`);
  if(ENGINE.online) refreshWorkflows();
}

/* ----- 服务端持久化（ADR-0006 方案 A）：分组渲染与交互 ----- */
/* fetch 回来后仅重绘「服务端」分组容器（4.6 时序规约；容器不在 DOM 时 no-op） */
function paintServerWfGroup(){
  const box = $('#wf-cloud-list'); if(!box) return;
  if(SVR.wfErr){
    box.innerHTML = `<div class="side-empty">服务端列表获取失败<br>请确认后端已启动后重开本面板</div>`;
    return;
  }
  const list = SVR.wf||[];
  box.innerHTML = list.length ? list.map(w=>`
    <div class="wf-item" data-wf-id="${esc(w.id)}">
      <div class="wt">${I('workflow')} ${esc(w.name)}</div>
      <div class="wm">更新于 ${fmtTs(w.updated_at)} · 点击打开</div>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button class="ibtn" data-wf-overwrite="${esc(w.id)}" style="flex:1;justify-content:center;height:24px"
          title="用当前标签页「${esc(state.name)}」的内容覆盖保存此服务端工作流「${esc(w.name)}」（不引入确认弹窗）">${I('save')} 覆盖保存</button>
        <button class="ibtn" data-wf-del="${esc(w.id)}" style="justify-content:center;height:24px;padding:0 9px;border-color:#7a3d3d;color:#c66"
          title="从服务端删除此工作流（不可恢复，需确认）">${I('trash')} 删除</button>
      </div>
    </div>`).join('')
    : `<div class="side-empty">服务端暂无保存的工作流<br>点击上方按钮保存当前工作流</div>`;
}
/* 保存当前工作流到服务端：body 带 tab.wfId（若有）→ 同 id upsert；成功后写回 wfId */
async function cloudSaveCurrent(){
  if(running){ toast('运行中无法保存','warn'); return; }
  syncToTabs();
  const tab = tabs[activeTab]||{};
  try{
    const r = await saveWorkflowToServer(tab.wfId||null,
      {name:state.name, nodes:state.nodes, edges:state.edges, inputs:tab.wfInputs||{}});
    if(tabs[activeTab]) tabs[activeTab].wfId = r.id;
    saveLocal();
    toast('已保存到服务端','ok');
    refreshWorkflows();
  }catch(_){ toast('保存到服务端失败（后端未连接？）','warn'); }
}
/* 打开服务端工作流：仿 addTabFromSample 装载路径，新标签页 + fitView（ADR 4.1） */
async function openServerWorkflow(id){
  if(running){ toast('运行中无法切换工作流','warn'); return; }
  let wf;
  try{ wf = await fetchWorkflow(id); }
  catch(_){ toast('打开失败：工作流不存在或后端未连接','warn'); return; }
  if(!Array.isArray(wf.nodes)){ toast('服务端数据无效（nodes 非数组）','warn'); return; }
  syncToTabs();
  tabs.push({ name:wf.name||'未命名工作流',
    nodes: wf.nodes.map(n=>({...n, params:{...(n.params||{})}})),
    edges: (Array.isArray(wf.edges)?wf.edges:[]).map(e=>({...e})),
    nextId: Math.max(0,...wf.nodes.map(n=>n.id||0))+1, view:null,
    wfId: wf.id, wfInputs: wf.inputs||undefined });
  activeTab = tabs.length-1;
  const t = tabs[activeTab];
  state = {name:t.name, nodes:t.nodes, edges:t.edges, nextId:t.nextId};
  view = {x:60,y:40,scale:1};
  clearSel(); undoStack=[]; redoStack=[];
  applyView(); renderAll(); fitView(); renderAll();
  renderTabsBar(); saveLocal();
  addLog(`已从服务端打开「${esc(wf.name||'未命名工作流')}」`,'sys');
  if(railTab==='workflows') renderSidebar();
}
/* 覆盖保存：目标 id = 所点服务端条目，内容 = 当前激活标签页（ADR 4.1 已知语义边界，
 * title 与 toast 文案显式表达；不重绑 tabs[activeTab].wfId） */
async function cloudOverwrite(id){
  if(running){ toast('运行中无法保存','warn'); return; }
  syncToTabs();
  const tab = tabs[activeTab]||{};
  const target = (SVR.wf||[]).find(w=>w.id===id);
  try{
    await saveWorkflowToServer(id, {name:state.name, nodes:state.nodes, edges:state.edges, inputs:tab.wfInputs||{}});
    toast(`已用当前标签页「${state.name}」覆盖保存到「${target?target.name:id}」`,'ok');
    refreshWorkflows();
  }catch(_){ toast('覆盖保存失败（后端未连接？）','warn'); }
}

/* ----- 删除确认弹窗（ADR-0007 4.3）：动态单例，复用 .modal-mask/.show 开关语义 -----
 * 零新增 CSS：盒体内联样式的每个值取自 #help-modal .box / h2 / .close-row 与
 * #approve-reject 的既有声明值（危险色 #7a3d3d/#c66 同款）；首次使用时挂到 body。 */
let confirmResolve = null;
function ensureConfirmModal(){
  if($('#confirm-modal')) return;
  const mask = document.createElement('div');
  mask.className = 'modal-mask'; mask.id = 'confirm-modal';
  mask.innerHTML = `
    <div class="box" style="margin-top:10vh;width:380px;background:var(--panel2);
         border:1px solid var(--border2);border-radius:14px;
         box-shadow:0 24px 80px rgba(0,0,0,.6);padding:22px 26px">
      <h2 style="font-size:15px;margin-bottom:12px"></h2>
      <div id="confirm-text" style="font-size:12px;color:var(--text2);line-height:1.7"></div>
      <div class="close-row" style="text-align:right;margin-top:16px">
        <button class="ibtn" id="confirm-cancel">取消</button>
        <button class="ibtn" id="confirm-ok" style="border-color:#7a3d3d;color:#c66">删除</button>
      </div>
    </div>`;
  document.body.appendChild(mask);
  $('#confirm-cancel').addEventListener('click', ()=>closeConfirm(false));
  $('#confirm-ok').addEventListener('click', ()=>closeConfirm(true));
  mask.addEventListener('mousedown', e=>{ if(e.target===e.currentTarget) closeConfirm(false); });
}
/* 关闭即决议（取消/遮罩/ESC → false，删除 → true）；三径关闭均不发请求，DELETE 由调用方在 true 后发出 */
function closeConfirm(v){
  const m = $('#confirm-modal');
  if(!m || !m.classList.contains('show')) return;
  m.classList.remove('show');
  const r = confirmResolve; confirmResolve = null;
  r && r(v);
}
function confirmDialog({title='删除确认', html='', okText='删除'} = {}){
  ensureConfirmModal();
  if(confirmResolve) confirmResolve(false);      /* 单例防重开：已在开时先按取消收掉前一个 */
  const m = $('#confirm-modal');
  m.querySelector('h2').textContent = title;
  $('#confirm-text').innerHTML = html;
  $('#confirm-ok').textContent = okText;
  m.classList.add('show');
  return new Promise(r=>{ confirmResolve = r; });
}
/* 删除服务端工作流（ADR-0007 4.1/4.4）：确认 → DELETE → 刷新 + 防复活清理。
 * 不设 running 拦截（ADR 4.1 如实区分：删除不触碰画布与执行状态，引擎用提交时内存快照） */
async function cloudDeleteWorkflow(id){
  const target = (SVR.wf||[]).find(w=>w.id===id);
  const name = target ? target.name : id;
  const ok = await confirmDialog({
    html: `将从服务端删除工作流 <b style="color:var(--text)">「${esc(name)}」</b>。<br>此操作不可恢复；对应标签页的本地内容不受影响。`,
  });
  if(!ok) return;
  try{ await deleteWorkflowFromServer(id); }
  catch(_){ toast('删除失败（后端未连接？）','warn'); return; }
  /* 防复活清理：清掉 tabs 中指向该 id 的关联，否则该 tab 下次「保存到服务端」
     会带旧 wfId upsert、以同一 id 复活刚删的工作流；清理后保存 = 生成新 id 新条目 */
  let touched = false;
  tabs.forEach(t=>{ if(t.wfId===id){ t.wfId = undefined; touched = true; } });
  if(touched) saveLocal();
  toast(`已删除『${name}』`,'ok');
  refreshWorkflows();
}
/* 删除服务端运行记录（ADR-0007 4.2/4.4）：确认 → DELETE → 回放缓存/展开态清理 + 刷新 */
async function deleteRunCard(id){
  const r = (SVR.runs||[]).find(x=>x.id===id);
  const name = r ? r.workflow_name : id;
  const ok = await confirmDialog({
    html: `将删除运行记录 <b style="color:var(--text)">「${esc(name)}」</b> 及其全部事件回放。<br>此操作不可恢复。`,
  });
  if(!ok) return;
  try{ await deleteRunFromServer(id); }
  catch(err){ /* 409 = 活动 run（守卫在服务端内存注册表）；文案转译为人话 */
    toast(/409/.test(String(err.message)) ? '运行中的记录不可删除，等运行结束后再试' : '删除失败（后端未连接？）','warn');
    return;
  }
  SVR.runEvents.delete(id);                        /* 回放缓存 */
  if(SVR.openRunId===id) SVR.openRunId = null;     /* 收起展开回放态 */
  toast(`已删除运行记录『${name}』`,'ok');
  refreshRuns();
}

/* ----- 模板侧栏 ----- */
function renderSideTemplates(body){
  body.innerHTML = `<div class="side-section-title">官方模板</div>` +
    Object.entries(SAMPLES).map(([k,s])=>`
      <div class="wf-item" data-sample="${k}">
        <div class="wt">${I('sparkles')} ${esc(s.name)}</div>
        <div class="wd">${esc(s.desc)}</div>
        <div class="wm">${s.nodes.length} 节点 · ${s.edges.length} 连线 · 点击新建标签页打开</div>
      </div>`).join('') +
    `<div class="side-empty">模板将在新标签页中打开，不影响当前工作流</div>`;
}

/* ----- 任务历史侧栏 ----- */
/* 本地数据源渲染（现状分支不动；服务端模式下拉取失败时也回退到此 —— ADR 4.2） */
function localRunsHtml(){
  return (runs.length ? runs.map(r=>`
    <div class="run-item ${r.ok?'ok':'stop'}">
      <span class="ri">${I(r.ok?'check':'square')}</span>
      <div style="min-width:0;flex:1"><div class="rn">${esc(r.name)}</div><div class="rt">${esc(r.time)}</div></div>
      <span class="rd">${r.nodes} 节点<br>${r.dur}</span>
    </div>`).join('')
    : `<div class="side-empty">暂无运行记录<br>点击画布顶部的「▶ 运行」开始</div>`) +
    (runs.length?`<div style="padding:10px 12px"><button class="ibtn" id="runs-clear" style="width:100%;justify-content:center">清空历史</button></div>`:'');
}
function renderSideHistory(body){
  if(ENGINE.online){
    /* 服务端数据源：同步画缓存/占位 → 异步重拉（ADR 4.6；无「清空历史」——服务端无清空端点） */
    body.innerHTML = `<div id="sv-runs-list"></div>`;
    paintServerRuns();
    refreshRuns();
    return;
  }
  body.innerHTML = localRunsHtml();
}
/* 服务端 runs 分组重绘（fetch 回调 / 展开 toggling 共用；容器不在 DOM 时 no-op） */
function paintServerRuns(){
  const box = $('#sv-runs-list'); if(!box) return;
  if(SVR.runsErr){ box.innerHTML = localRunsHtml(); return; }   /* 拉取失败 → 回退本地 */
  const list = SVR.runs;
  if(!list){ box.innerHTML = `<div class="side-empty">加载中…</div>`; return; }
  box.innerHTML = list.length ? list.map(r=>{
    const meta = runCardMeta(r.status);
    const dur = r.ended_ms!=null ? (r.ended_ms/1000).toFixed(1)+'s' : '…';
    return `<div class="run-item ${meta.cls}" data-run-id="${esc(r.id)}">
        <span class="ri">${I(meta.icon)}</span>
        <div style="min-width:0;flex:1"><div class="rn">${esc(r.workflow_name)}</div><div class="rt">${fmtTs(r.started_at)}${meta.suffix}</div></div>
        <span class="rd">${r.done??0}/${r.total??0} 节点<br>${dur}</span>
        <button class="ibtn" data-run-del="${esc(r.id)}" style="flex:none;height:24px;padding:0 7px"
          title="删除此运行记录（不可恢复，需确认）">${I('trash')}</button>
      </div>` + (SVR.openRunId===r.id ? replayHtml(r.id) : '');
  }).join('') : `<div class="side-empty">服务端暂无运行记录<br>点击画布顶部的「▶ 运行」开始</div>`;
}
/* 就地展开的事件回放（ADR 4.2/4.3）：无类名容器 + 内联 var(--border) 分隔线 + .logline 行 */
function replayHtml(id){
  const wrap = inner => `<div style="padding:6px 14px 10px;border-bottom:1px solid var(--border)">${inner}</div>`;
  const evs = SVR.runEvents.get(id);
  if(evs === undefined) return wrap(`<div class="side-empty" style="padding:10px">事件回放加载中…</div>`);
  if(evs === null)      return wrap(`<div class="side-empty" style="padding:10px">回放获取失败（该 run 可能已被清理）</div>`);
  const lines = replayLines(evs);
  return wrap(lines.map(l=>`<div class="logline ${l.lvl}"><span class="t">${l.t}</span><span class="m">${l.m}</span></div>`).join('')
    || `<div class="side-empty" style="padding:10px">无事件</div>`);
}
/* 卡片点击：就地展开/收起回放；同面板同时只展开一个（ADR 4.2） */
async function toggleRunReplay(id){
  if(SVR.openRunId === id){ SVR.openRunId = null; }
  else{
    SVR.openRunId = id;
    if(!SVR.runEvents.has(id)){
      paintServerRuns();          /* 先画「回放加载中」占位 */
      await loadRunDetail(id);    /* 成功/失败均写缓存后重绘 */
    }
  }
  paintServerRuns();
}
$('#side-body').addEventListener('click', e=>{
  const fav = e.target.closest('.fav');
  if(fav){ const k = fav.dataset.fav;
    settings.favs = settings.favs||[];
    const i = settings.favs.indexOf(k);
    i>=0?settings.favs.splice(i,1):settings.favs.push(k);
    saveLocal(); renderSidebar(); return; }
  /* 服务端分支（ADR-0006/0007）：卡内按钮须先于整卡判断（删除/覆盖先于「打开」，删除先于「展开回放」） */
  const wdel = e.target.closest('[data-wf-del]'); if(wdel){ cloudDeleteWorkflow(wdel.dataset.wfDel); return; }
  const ovw = e.target.closest('[data-wf-overwrite]'); if(ovw){ cloudOverwrite(ovw.dataset.wfOverwrite); return; }
  const cwf = e.target.closest('.wf-item[data-wf-id]'); if(cwf){ openServerWorkflow(cwf.dataset.wfId); return; }
  if(e.target.closest('#wf-cloud-save')){ cloudSaveCurrent(); return; }
  const rdel = e.target.closest('[data-run-del]'); if(rdel){ deleteRunCard(rdel.dataset.runDel); return; }
  const srv = e.target.closest('.run-item[data-run-id]'); if(srv){ toggleRunReplay(srv.dataset.runId); return; }
  const wf = e.target.closest('.wf-item[data-i]'); if(wf){ switchTab(+wf.dataset.i); return; }
  const sm = e.target.closest('.wf-item[data-sample]'); if(sm){ addTabFromSample(sm.dataset.sample); return; }
  if(e.target.closest('#wf-new')){ newTab(); return; }
  if(e.target.closest('#wf-templates')){ setRailTab('templates'); return; }
  if(e.target.closest('#runs-clear')){ runs=[]; saveLocal(); renderSidebar(); return; }
});
/* 服务端列表 fetch 完成后的分组重绘回调注册（ADR 4.6；回调内部容器缺失时 no-op） */
onWorkflowsArrive(paintServerWfGroup);
onRunsArrive(paintServerRuns);
/* 能力清单到达（BK-0049 / ADR-0018）：回退集 → 后端供数；失败（SVR.caps=null）
   静默保持回退集。重渲染面 = ① caps 节点徽章（rerenderNode 自带 measurePorts+
   updateEdgesOf，AGENTS portCache 陷阱内建解）；② 属性面板（选中恰 1 个 caps
   节点时，scrollTop 保持沿 #props change 处理器先例）。 */
onCapsArrive(()=>{
  if(!SVR.caps) return;
  MCP_SERVERS = SVR.caps.servers;
  SKILL_LIST  = SVR.caps.skills;
  state.nodes.forEach(n=>{ if((defOf(n).caps||[]).length) rerenderNode(n); });
  if(sel.nodes.size===1){
    const n = nodeById([...sel.nodes][0]);
    if(n && (defOf(n).caps||[]).length){
      const st = $('#props').scrollTop;
      renderProps(); $('#props').scrollTop = st;
    }
  }
});
/* kb 清单到达（BK-0047 / ADR-0021）：回退集（DEFS 合成 o）→ 服务端供数；失败
   （SVR.kbs=null）静默保持回退集（onCapsArrive 同口径）。重渲染面 = ① retrieval
   节点 kb combo widget 行（rerenderNode 自带 measurePorts+updateEdgesOf，AGENTS
   portCache 陷阱内建解）；② 属性面板（选中恰 1 个 retrieval 节点时，scrollTop
   保持沿 onCapsArrive 先例）。 */
onKbsArrive(()=>{
  if(!SVR.kbs) return;
  state.nodes.forEach(n=>{ if(n.type==='retrieval') rerenderNode(n); });
  if(sel.nodes.size===1){
    const n = nodeById([...sel.nodes][0]);
    if(n && n.type==='retrieval'){
      const st = $('#props').scrollTop;
      renderProps(); $('#props').scrollTop = st;
    }
  }
});

/* ----- 设置侧栏 ----- */
function renderSideSettings(body){
  body.innerHTML = `
    <div class="side-section-title">画布</div>
    <div class="set-row"><div><div class="sl">显示网格</div><div class="sd">画布点阵背景</div></div>
      <label class="switch"><input type="checkbox" data-set="grid" ${settings.grid?'checked':''}><i></i></label></div>
    <div class="set-row"><div><div class="sl">连线流动动画</div><div class="sd">运行时连线虚线流动</div></div>
      <label class="switch"><input type="checkbox" data-set="flowAnim" ${settings.flowAnim?'checked':''}><i></i></label></div>
    <div class="set-row"><div><div class="sl">网格吸附</div><div class="sd">移动节点时对齐 26px 网格</div></div>
      <label class="switch"><input type="checkbox" data-set="snap" ${settings.snap?'checked':''}><i></i></label></div>
    <div class="side-section-title">执行</div>
    <div class="set-row"><div><div class="sl">模拟执行速度</div><div class="sd">演示动画节奏</div></div>
      <div class="seg" id="seg-speed">
        <button data-v="0.5" ${settings.speed==0.5?'class="on"':''}>慢</button>
        <button data-v="1" ${settings.speed==1?'class="on"':''}>正常</button>
        <button data-v="2" ${settings.speed==2?'class="on"':''}>快</button>
      </div></div>
    <div class="side-section-title">存储</div>
    <div class="set-row"><div><div class="sl">自动保存</div><div class="sd">保存到浏览器本地</div></div>
      <label class="switch"><input type="checkbox" data-set="autosave" ${settings.autosave?'checked':''}><i></i></label></div>
    <div class="side-section-title">执行引擎</div>
    <div class="side-empty" style="padding:18px 16px;line-height:1.8">${
      ENGINE.online
        ? `AgentFlow v1.0 · <span style="color:var(--ok)">真实执行后端已连接</span><br>Vercel AI SDK 7 · Node ${esc(ENGINE.info?.node||'')}<br>${esc(ENGINE.info?.provider?.note||'')}`
        : `AgentFlow v1.0 · 离线演示模式<br>布局参考 ComfyUI 新前端<br><span style="color:var(--text3)">启动后端（server 目录 npm start）即可接入真实智能体执行</span>`
    }</div>`;
}
$('#side-body').addEventListener('change', e=>{
  const k = e.target.dataset && e.target.dataset.set;
  if(k!==undefined && e.target.type==='checkbox'){
    settings[k] = e.target.checked;
    applySettings(); saveLocal();
  }
});
$('#side-body').addEventListener('click', e=>{
  const seg = e.target.closest('#seg-speed button');
  if(seg){ settings.speed = Number(seg.dataset.v);
    $$('#seg-speed button').forEach(b=>b.classList.toggle('on', b===seg));
    saveLocal(); }
});
function applySettings(){
  viewport.style.backgroundImage = settings.grid
    ? `radial-gradient(circle, var(--grid) 1.2px, transparent 1.4px)` : 'none';
}

/* ================================================================
 *  视图变换
 * ================================================================ */
function applyView(){
  world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.scale})`;
  const g = 26*view.scale;
  viewport.style.backgroundSize = `${g}px ${g}px`;
  viewport.style.backgroundPosition = `${view.x}px ${view.y}px`;
  applySettings();
  $('#zoom-lvl').textContent = Math.round(view.scale*100)+'%';
  renderMinimap(); updateStats(); updateNodeToolbox();
}
function toWorld(cx, cy){
  const r = viewport.getBoundingClientRect();
  return { x:(cx-r.left-view.x)/view.scale, y:(cy-r.top-view.y)/view.scale };
}
function zoomAt(factor, cx, cy){
  const r = viewport.getBoundingClientRect();
  cx = cx ?? r.left+r.width/2; cy = cy ?? r.top+r.height/2;
  const mx = cx-r.left, my = cy-r.top;
  const ns = clamp(view.scale*factor, 0.25, 2.5);
  const k = ns/view.scale;
  view.x = mx-(mx-view.x)*k; view.y = my-(my-view.y)*k; view.scale = ns;
  applyView();
}
function fitView(){
  if(!state.nodes.length){ view={x:80,y:60,scale:1}; applyView(); return; }
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  const rs = viewport.getBoundingClientRect();
  state.nodes.forEach(n=>{
    const el = nodesLayer.querySelector(`.node[data-id="${n.id}"]`);
    const w = el?el.offsetWidth:250, h = el?el.offsetHeight:140;
    minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
    maxX=Math.max(maxX,n.x+w); maxY=Math.max(maxY,n.y+h);
  });
  const pad=70, bw=maxX-minX+pad*2, bh=maxY-minY+pad*2;
  const s = clamp(Math.min(rs.width/bw, rs.height/bh), 0.55, 1);
  view.scale = s;
  view.x = (rs.width-(maxX+minX)*s)/2; view.y = (rs.height-(maxY+minY)*s)/2;
  applyView();
}

/* ================================================================
 *  渲染
 * ================================================================ */
function renderAll(){
  renderNodes(); renderEdges(); renderProps(); renderMinimap(); updateStats();
  $('#empty-hint').style.display = state.nodes.length ? 'none':'flex';
  saveLocal();
}
/* kb combo 在线供数（BK-0047 / ADR-0021）：SVR.kbs 到达即整表替换选项，
 * null（离线/失败/未到达）= DEFS 回退集（p.o 原样，零拷贝零漂移）。
 * 仅 (retrieval, kb) 命中；其余 combo 恒 p.o。 */
const comboOptionsOf = (node, p) =>
  (node.type==='retrieval' && p.k==='kb' && SVR.kbs) ? SVR.kbs.kbs.map(x=>x.name) : p.o;
function widgetHtml(node, p){
  const v = paramsOf(node)[p.k];
  const val = v===undefined||v===null ? '' : v;
  switch(p.t){
    case 'combo':
      return `<div class="wdg"><label title="${esc(p.l)}">${esc(p.l)}</label><div class="ctl">
        <select data-k="${p.k}">${comboOptionsOf(node, p).map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join('')}</select></div></div>`;
    case 'text':
      return `<div class="wdg"><label title="${esc(p.l)}">${esc(p.l)}</label><div class="ctl">
        <input type="text" data-k="${p.k}" value="${esc(val)}" spellcheck="false"></div></div>`;
    case 'number':
      return `<div class="wdg"><label title="${esc(p.l)}（拖动调节）" class="drag-num">${esc(p.l)}</label><div class="ctl">
        <span class="numwrap"><input type="number" data-k="${p.k}" value="${esc(val)}" min="${p.min??0}" max="${p.max??9999}" step="${p.step??1}"><span class="nspin" data-dir="1"><svg viewBox="0 0 8 5"><path d="M0 5l4-5 4 5z" fill="currentColor"/></svg></span><span class="nspin" data-dir="-1"><svg viewBox="0 0 8 5"><path d="M0 0l4 5 4-5z" fill="currentColor"/></svg></span></span></div></div>`;
    case 'toggle':
      return `<div class="wdg"><label title="${esc(p.l)}">${esc(p.l)}</label><div class="ctl" style="display:flex;justify-content:flex-end">
        <label class="switch"><input type="checkbox" data-k="${p.k}" ${val?'checked':''}><i></i></label></div></div>`;
    case 'textarea':
      return `<div class="wdg wdg-raw" style="flex-direction:column;align-items:stretch;background:transparent;border:none;padding:0">
        <label style="width:auto;padding:0 2px 1px">${esc(p.l)}</label>
        <textarea data-k="${p.k}" rows="3" spellcheck="false">${esc(val)}</textarea></div>`;
  }
  return '';
}
function makeNodeEl(node){
  const def = defOf(node), ps = paramsOf(node);
  const el = document.createElement('div');
  el.className = 'node'+(node.collapsed?' collapsed':'')+(node.bypass?' st-bypass':'')+(sel.nodes.has(node.id)?' selected':'');
  el.dataset.id = node.id;
  el.style.setProperty('--nc', catColor(def.cat));
  el.style.left = node.x+'px'; el.style.top = node.y+'px';
  const widgets = (def.params||[]).filter(p=>!p.if||p.if(ps)).map(p=>widgetHtml(node,p)).join('');
  const ins  = (def.inputs ||[]).map((p,i)=>`<div class="port-row in"><span class="port in" data-dir="in" data-p="${i}" style="--pc-d:${PTYPES[p.t].dc}" title="${esc(p.n)} · 类型：${PTYPES[p.t].label}"></span>${esc(p.n)} <span style="color:var(--text3);font-size:9px;margin-left:4px">${PTYPES[p.t].label}</span></div>`).join('');
  const outs = (def.outputs||[]).map((p,i)=>`<div class="port-row out"><span style="color:var(--text3);font-size:9px;margin-right:4px">${PTYPES[p.t].label}</span>${esc(p.n)}<span class="port out" data-dir="out" data-p="${i}" style="--pc-d:${PTYPES[p.t].dc}" title="${esc(p.n)} · 类型：${PTYPES[p.t].label}"></span></div>`).join('');
  el.innerHTML = `
    <div class="node-head"><button class="ncollapse" title="折叠/展开参数"></button><span class="ntitle">${esc(node.title||def.name)}</span>
      <span class="nstat"></span></div>
    <div class="node-progress"><i></i></div>
    ${ins?`<div class="node-ports-in">${ins}</div>`:''}
    ${widgets?`<div class="node-widgets">${widgets}</div>`:''}
    ${outs?`<div class="node-ports-out">${outs}</div>`:''}
    ${capsChips(node)}
    <div class="node-out"></div>`;
  return el;
}
/* 节点能力徽章 chips */
function capsChips(n){
  if(!(defOf(n).caps||[]).length) return '';
  const c = capSummary(n);
  if(!c.servers && !c.skills) return '';
  const chips = [];
  if(c.servers) chips.push(`<span class="cap-chip">${I('plug')} MCP ${c.servers}/${MCP_SERVERS.length} · 工具 ${c.tools}</span>`);
  if(c.skills) chips.push(`<span class="cap-chip cap-chip-s">${I('sparkles')} 技能 ${c.skills}</span>`);
  return `<div class="node-caps">${chips.join('')}</div>`;
}
function renderNodes(){
  nodesLayer.innerHTML = '';
  state.nodes.forEach(n=>nodesLayer.appendChild(makeNodeEl(n)));
  measurePorts();
}
function measurePorts(){
  portCache.clear();
  state.nodes.forEach(n=>{
    const el = nodesLayer.querySelector(`.node[data-id="${n.id}"]`);
    if(!el){ portCache.set(n.id,{in:[],out:[]}); return; }
    const nr = el.getBoundingClientRect(), m = {in:[],out:[]};
    el.querySelectorAll('.port').forEach(pt=>{
      const r = pt.getBoundingClientRect();
      m[pt.dataset.dir][+pt.dataset.p] = {x:(r.left+r.width/2-nr.left)/view.scale, y:(r.top+r.height/2-nr.top)/view.scale};
    });
    portCache.set(n.id, m);
  });
}
function portCenter(nodeId, dir, idx){
  const n = nodeById(nodeId), m = portCache.get(nodeId);
  if(!n||!m||!m[dir][idx]) return {x:n?n.x+150:0, y:n?n.y+20:0};
  return { x:n.x+m[dir][idx].x, y:n.y+m[dir][idx].y };
}
function bezier(p1, p2){
  const dx = clamp(Math.abs(p2.x-p1.x)*.35, 30, 140);
  return `M ${p1.x} ${p1.y} C ${p1.x+dx} ${p1.y}, ${p2.x-dx} ${p2.y}, ${p2.x} ${p2.y}`;
}
function cubicMid(p1,p2){
  const dx = clamp(Math.abs(p2.x-p1.x)*.35, 30, 140);
  const c1={x:p1.x+dx,y:p1.y}, c2={x:p2.x-dx,y:p2.y}, t=.5, u=1-t;
  return { x: u*u*u*p1.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*p2.x,
           y: u*u*u*p1.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*p2.y };
}
function edgeColor(e){
  const sn = nodeById(e.fn); if(!sn) return '#5b5b68';
  const op = defOf(sn).outputs[e.fp];
  return op ? PTYPES[op.t].c : '#5b5b68';
}
function edgeD(e){ return bezier(portCenter(e.fn,'out',e.fp), portCenter(e.tn,'in',e.tp)); }
function edgeSvg(e){
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  g.classList.add('edge'); g.dataset.id = e.id;
  const hit = document.createElementNS('http://www.w3.org/2000/svg','path'); hit.setAttribute('class','hit');
  const vis = document.createElementNS('http://www.w3.org/2000/svg','path'); vis.setAttribute('class','vis');
  vis.setAttribute('stroke', edgeColor(e));
  const del = document.createElementNS('http://www.w3.org/2000/svg','g'); del.setAttribute('class','edel');
  del.innerHTML = '<circle r="8"/><line x1="-3" y1="-3" x2="3" y2="3"/><line x1="3" y1="-3" x2="-3" y2="3"/>';
  const tip = document.createElementNS('http://www.w3.org/2000/svg','title');
  const sn = nodeById(e.fn), tn = nodeById(e.tn);
  if(sn&&tn) tip.textContent =
    `${sn.title||defOf(sn).name}.${defOf(sn).outputs[e.fp]?.n ?? ''} → ${tn.title||defOf(tn).name}.${defOf(tn).inputs[e.tp]?.n ?? ''}`;
  const d = edgeD(e);
  hit.setAttribute('d',d); vis.setAttribute('d',d);
  const mid = cubicMid(portCenter(e.fn,'out',e.fp), portCenter(e.tn,'in',e.tp));
  del.setAttribute('transform',`translate(${mid.x},${mid.y})`);
  g.append(tip,hit,vis,del);
  return g;
}
function renderEdges(){
  [...edgesSvg.querySelectorAll('g.edge')].forEach(g=>g.remove());
  edgeEls.clear();
  state.edges.forEach(e=>{
    const g = edgeSvg(e);
    edgesSvg.appendChild(g);
    if(sel.edges.has(e.id)) g.classList.add('selected');
    edgeEls.set(e.id,{g,vis:g.querySelector('.vis')});
  });
  updateAllPortColors();
}
function updateEdgesOf(nodeIds){
  const ids = new Set(nodeIds);
  state.edges.forEach(e=>{
    if(!ids.has(e.fn)&&!ids.has(e.tn)) return;
    const rec = edgeEls.get(e.id); if(!rec) return;
    const d = edgeD(e);
    rec.vis.setAttribute('d',d);
    const hit = rec.g.querySelector('.hit'); hit && hit.setAttribute('d',d);
    const del = rec.g.querySelector('.edel');
    const mid = cubicMid(portCenter(e.fn,'out',e.fp), portCenter(e.tn,'in',e.tp));
    del && del.setAttribute('transform',`translate(${mid.x},${mid.y})`);
  });
}

/* ----- 属性面板 ----- */
/* ① 端口/连接摘要 */
function portsHtml(n, def){
  const ins = (def.inputs||[]).map((p,i)=>{
    const e = state.edges.find(x=>x.tn===n.id && x.tp===i);
    const src = e ? nodeById(e.fn) : null;
    const txt = src ? `${src.title||defOf(src).name}.${(defOf(src).outputs||[])[e.fp]?.n??''}` : '未连接';
    return `<div class="pin-row"><i class="pdot" style="background:${PTYPES[p.t].c}"></i><span class="pname">${esc(p.n)}</span><span class="ptype">${PTYPES[p.t].label}</span><span class="psrc ${src?'':'off'}" title="${esc(txt)}">${esc(txt)}</span></div>`;
  }).join('');
  const outs = (def.outputs||[]).map((p,i)=>{
    const ts = state.edges.filter(x=>x.fn===n.id && x.fp===i).map(x=>{
      const t = nodeById(x.tn); return t?`${t.title||defOf(t).name}.${(defOf(t).inputs||[])[x.tp]?.n??''}`:'?';
    });
    const txt = ts.length ? ts.join('、') : '未连接';
    return `<div class="pin-row"><i class="pdot" style="background:${PTYPES[p.t].c}"></i><span class="pname">${esc(p.n)}</span><span class="ptype">${PTYPES[p.t].label}</span><span class="psrc ${ts.length?'':'off'}" title="${esc(txt)}">${esc(txt)}</span></div>`;
  }).join('');
  if(!ins && !outs) return '';
  return `<div class="psec">端口</div>${ins}${outs}`;
}
/* ② 运行时输入/输出值预览（真实执行后可用） */
function runDataHtml(n){
  const rd = lastRunData.get(n.id); if(!rd) return '';
  const def = defOf(n);
  const rows = rd.inputs.map(ip=>{
    const pname = (def.inputs||[])[ip.tp]?.n ?? ('入'+ip.tp);
    return `<div class="pin-row"><span class="pname">${esc(pname)}</span><span class="ptype">← ${esc(ip.from)}</span><span class="pval" title="${esc(ip.val)}">${esc(ip.val)}</span></div>`;
  }).join('');
  return `<div class="psec">运行数据</div>${rows}<div class="pin-row"><span class="pname">输出</span><span class="pval" title="${esc(rd.out)}">${esc(String(rd.out).slice(0,160))}</span></div>`;
}
/* ③ 模板可用变量（优先用最近真实运行的变量表，否则静态扫描画布） */
function varNamesFor(){
  if(lastRunVars && Object.keys(lastRunVars).length) return Object.keys(lastRunVars);
  const s = new Set(['question','context','confidence','item','index']);
  state.nodes.forEach(x=>{
    if(x.type==='userinput') s.add(paramsOf(x).var||'question');
    if(x.type==='setvar') s.add(paramsOf(x).name||'value');
  });
  return [...s];
}
function varHintsHtml(n){
  if(n.type!=='prompt' && n.type!=='reply') return '';
  return `<div class="psec">可用变量（点击插入）</div><div class="pvars">${varNamesFor().map(k=>`<span class="pvar" data-var="${esc(k)}">{{${esc(k)}}}</span>`).join('')}</div>`;
}
function renderProps(){
  const box = $('#props');
  if(sel.nodes.size===0 && sel.edges.size===0){
    box.innerHTML = `<h3>属性</h3><div class="props-empty">未选中任何对象。<div class="tips">
      <span><kbd>单击</kbd> 选中节点 / 连线后在此编辑参数</span>
      <span><kbd>双击画布</kbd> 快速搜索添加节点</span>
      <span><kbd>▶ 运行</kbd> 观看模拟执行动画</span></div></div>`;
    return;
  }
  if(sel.nodes.size>1){
    box.innerHTML = `<h3>属性</h3><div class="props-empty">已选中 <b style="color:var(--text)">${sel.nodes.size}</b> 个节点<br>
      <span style="font-size:11px">可拖拽移动、复制 (Ctrl+C) 或删除 (Del)</span></div>`;
    return;
  }
  if(sel.nodes.size===1){
    const n = nodeById([...sel.nodes][0]); if(!n) return;
    const def = defOf(n), ps = paramsOf(n);
    if(n.type==='retrieval') refreshKbs();   /* kb 清单随面板打开时机刷新（BK-0047：fire-and-forget，失败静默保持回退集，非轮询） */
    const rows = (def.params||[]).filter(p=>!p.if||p.if(ps)).map(p=>{
      const v = ps[p.k];
      if(p.t==='combo') return `<div class="prow"><label>${esc(p.l)}</label><select data-k="${p.k}">${comboOptionsOf(n, p).map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
      if(p.t==='toggle') return `<div class="prow"><div class="switchline"><label>${esc(p.l)}</label><label class="switch"><input type="checkbox" data-k="${p.k}" ${v?'checked':''}><i></i></label></div></div>`;
      if(p.t==='textarea') return `<div class="prow"><label>${esc(p.l)}</label><textarea data-k="${p.k}" spellcheck="false">${esc(v)}</textarea></div>`;
      if(p.t==='number') return `<div class="prow"><label class="drag-num" title="${esc(p.l)}（拖动调节）">${esc(p.l)}</label><span class="numwrap"><input type="number" data-k="${p.k}" value="${esc(v)}" min="${p.min??0}" max="${p.max??9999}" step="${p.step??1}"><span class="nspin" data-dir="1"><svg viewBox="0 0 8 5"><path d="M0 5l4-5 4 5z" fill="currentColor"/></svg></span><span class="nspin" data-dir="-1"><svg viewBox="0 0 8 5"><path d="M0 0l4 5 4-5z" fill="currentColor"/></svg></span></span></div>`;
      return `<div class="prow"><label>${esc(p.l)}</label><input type="text" data-k="${p.k}" value="${esc(v)}" spellcheck="false"></div>`;
    }).join('');
    box.innerHTML = `<h3>属性</h3>
      <div class="ph"><div class="picon" style="border-color:${catColor(def.cat)}">${I(def.icon)}</div>
        <div><div class="pt">${esc(n.title||def.name)}</div><div class="pid">#${n.id} · ${def.name} · ${CATS[def.cat].name}</div></div></div>
      <div class="pdesc">${esc(def.desc)}</div>
      <div class="prow"><label>节点名称</label><input type="text" id="prop-title" value="${esc(n.title||def.name)}" spellcheck="false"></div>
      ${rows}
      ${portsHtml(n, def)}
      ${runDataHtml(n)}
      ${varHintsHtml(n)}
      ${capsHtml(n, def)}
      <div class="pbtns">
        <button class="ibtn" id="prop-copy">${I('copy')} 复制</button>
        <button class="ibtn danger" id="prop-del">${I('trash')} 删除</button>
      </div>`;
    if(n.type==='approval') mountApprovalRolePicker();
    return;
  }
  const e = state.edges.find(x=>x.id===[...sel.edges][0]);
  if(!e){ clearSel(); renderProps(); return; }
  const fn = nodeById(e.fn), tn = nodeById(e.tn);
  box.innerHTML = `<h3>连线属性</h3><div class="props-empty">
    <div style="line-height:2.2">
    <b style="color:var(--text)">${esc(fn?fn.title||defOf(fn).name:'?')}</b> <span style="color:var(--text3)">(${esc(defOf(fn).outputs[e.fp].n)})</span><br>
    <span style="color:var(--text3)">↓</span><br>
    <b style="color:var(--text)">${esc(tn?tn.title||defOf(tn).name:'?')}</b> <span style="color:var(--text3)">(${esc(defOf(tn).inputs[e.tp].n)})</span></div>
    <div class="pbtns"><button class="ibtn danger" id="prop-del-edge">${I('trash')} 删除连线</button></div></div>`;
}
/* ----- 能力配置（MCP / Skill） ----- */
const mcpExpanded = new Set();   // 当前展开的 MCP 服务器（UI 状态，不持久化）
function capsHtml(n, def){
  const caps = def.caps||[];
  if(!caps.includes('mcp') && !caps.includes('skill')) return '';
  n.mcp = n.mcp||{}; n.skills = n.skills||[];
  const sum = capSummary(n);
  let h = `<div class="caps-sec"><div class="caps-title">能力配置</div>`;
  if(caps.includes('mcp')){
    h += `<div class="caps-group">MCP 服务</div>`;
    h += MCP_SERVERS.map(sv=>{
      const sel = n.mcp[sv.id]||[];
      const open = mcpExpanded.has(sv.id);
      return `<div class="cap-server ${sel.length?'on':''}">
        <div class="cap-row">
          <label class="switch"><input type="checkbox" data-cap="mcp-server" data-sid="${sv.id}" ${sel.length?'checked':''}><i></i></label>
          <span class="cap-name">${esc(sv.name)}</span>
          <span class="cap-count">${sel.length?sel.length+'/'+sv.tools.length:''}</span>
          <button class="cap-exp" data-expand="${sv.id}" title="展开工具">${I(open?'chev-down':'chev-right')}</button>
        </div>
        ${open?`<div class="cap-tools">${sv.tools.map(t=>`
          <label class="cap-tool"><input type="checkbox" data-cap="mcp-tool" data-sid="${sv.id}" data-tool="${esc(t.n)}" ${sel.includes(t.n)?'checked':''}><span class="cap-tool-n">${esc(t.n)}</span><span class="cap-tool-d">${esc(t.d)}</span></label>`).join('')}</div>`:''}
      </div>`;
    }).join('');
  }
  if(caps.includes('skill')){
    h += `<div class="caps-group">技能 Skill</div>`;
    h += SKILL_LIST.map(sk=>`
      <label class="cap-row cap-skill ${n.skills.includes(sk.id)?'on':''}">
        <input type="checkbox" data-cap="skill" data-sid="${sk.id}" ${n.skills.includes(sk.id)?'checked':''}>
        <span class="cap-name">${esc(sk.name)}</span><span class="cap-tool-d">${esc(sk.desc)}</span>
      </label>`).join('');
  }
  h += `<div class="caps-sum">已启用 ${sum.servers} 个 MCP 服务 · ${sum.tools} 个工具 · ${sum.skills} 个技能</div></div>`;
  return h;
}

/* ===== 审批人节点引用拾取器（BK-0046 / ADR-0017 §2）===== */
function mountApprovalRolePicker(){
  /* 幂等：innerHTML 刚整体替换，无残留按钮；仅 approval 单选态被调用 */
  const inp = $('#props input[data-k="role"]');
  if(!inp) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'role-pick';
  btn.title = '从画布选择节点作为互审审官（写入 node:<id>）';
  btn.innerHTML = I('workflow') + '<span>从画布选择审官节点</span>';
  inp.insertAdjacentElement('afterend', btn);
}
function openApprovalRolePicker(n){
  /* 现状选中态：role 已为 node:<id> 时对应项带 ✓（PRD REQ-0046-01 第二组 GWT） */
  const cur = String(paramsOf(n).role||'').match(/^node:(\d+)$/);
  const others = state.nodes.filter(x=>x.id!==n.id);   /* 排除自身（PRD 硬约束） */
  const items = [];
  if(!others.some(x=>x.type==='llm'))
    items.push({ cls:'mtitle', t:'画布无 LLM 节点（审官须为 LLM 类型）' });
  others.forEach(x=>{
    const isLLM = x.type==='llm';
    const hit = cur && +cur[1]===x.id;
    items.push({
      ic: defOf(x).icon,
      t: `${x.title||defOf(x).name} · #${x.id}`,
      cls: isLLM ? '' : 'off',
      mk: hit ? '✓' : (isLLM ? 'LLM' : ''),
      f: isLLM ? ()=>{ writeRolePick(n, 'node:'+x.id); }
               : ()=>{ toast('仅 LLM 节点可担任互审审官','warn'); },
    });
  });
  const r = $('#props .role-pick').getBoundingClientRect();
  showMenu(r.left, r.bottom+6, items);
}
function writeRolePick(n, val){
  /* 覆盖语义（PRD：含已有值时整体覆盖，SPEC 定）：选中即整体替换；
   * 经既有 change 委托落 params + rerenderNode（与 .pvar 插入同型，app.js:1055） */
  const inp = $('#props input[data-k="role"]');
  if(!inp) return;
  inp.value = val;
  inp.dispatchEvent(new Event('change',{bubbles:true}));
}

/* ===== code 节点 lang 切换样例联动（BUG-0012 / ADR-0017 §3）===== */
/* JS 等价样例：与 apps/server/src/handlers.ts:113 兜底字面量逐字一致（含 \n 转义
 * 形态）——两处漂移由 smoke K04 源锁断言守护（ADR-0017 §3）。 */
const CODE_JS_SAMPLE = '// 处理输入后返回\nresult = input\nreturn result';

function syncCodeSampleLang(n){
  /* 触发条件：lang change 已写入（select 的 change 仅在取值实际变化时触发）；
   * cur 逐字等于「切换前语言的默认样例」才替换，其余零改动（绝不覆盖用户代码，
   * 与后端兜底「唯一组合命中」同口径，handlers.ts:106-109）。 */
  const ps = paramsOf(n);
  const pySample = DEFS.code.params.find(p=>p.k==='code').d;   /* 单一来源：DEFS 运行时值 */
  const cur = ps.code;
  let next = null;
  if(ps.lang==='JavaScript' && cur===pySample) next = CODE_JS_SAMPLE;
  else if(ps.lang==='Python' && cur===CODE_JS_SAMPLE) next = pySample;
  if(next===null || next===cur) return;
  n.params = n.params||{};
  n.params.code = next;
  rerenderNode(n);                                    /* 节点体 textarea 重建为新值 */
  const ta = $('#props textarea[data-k="code"]');     /* #props 面板同步（该委托不重渲染 #props） */
  if(ta) ta.value = next;
  toast('默认样例与所选语言不匹配，已替换为等价样例');
}

$('#props').addEventListener('change', e=>{
  if(sel.nodes.size!==1) return;
  const n = nodeById([...sel.nodes][0]); if(!n) return;
  const cap = e.target.dataset.cap;
  if(cap){
    pushUndo();
    const sid = e.target.dataset.sid;
    if(cap==='mcp-server'){
      const sv = MCP_SERVERS.find(x=>x.id===sid);
      if(e.target.checked) n.mcp[sid] = sv.tools.map(t=>t.n);
      else { delete n.mcp[sid]; }
    } else if(cap==='mcp-tool'){
      const arr = n.mcp[sid]||(n.mcp[sid]=[]);
      const tn = e.target.dataset.tool;
      const i = arr.indexOf(tn);
      if(e.target.checked && i<0) arr.push(tn);
      if(!e.target.checked && i>=0) arr.splice(i,1);
      if(!arr.length) delete n.mcp[sid];
    } else if(cap==='skill'){
      const i = n.skills.indexOf(sid);
      if(e.target.checked && i<0) n.skills.push(sid);
      if(!e.target.checked && i>=0) n.skills.splice(i,1);
    }
    saveLocal();
    const st = $('#props').scrollTop;
    rerenderNode(n); renderProps(); $('#props').scrollTop = st;
    return;
  }
  const k = e.target.dataset.k;
  if(k!==undefined){
    n.params = n.params||{};
    n.params[k] = e.target.type==='checkbox' ? e.target.checked :
                  e.target.type==='number' ? Number(e.target.value) : e.target.value;
    if(n.type==='code' && k==='lang') syncCodeSampleLang(n);   /* BUG-0012 前端联动（ADR-0017 §3） */
    rerenderNode(n); renderMinimap(); saveLocal();
  }
});
$('#props').addEventListener('click', e=>{
  const exp = e.target.closest('[data-expand]');
  if(exp){
    const sid = exp.dataset.expand;
    mcpExpanded.has(sid)?mcpExpanded.delete(sid):mcpExpanded.add(sid);
    renderProps(); return;
  }
  /* BK-0046：审批人行拾取入口 → 打开画布节点清单（ADR-0017 §2） */
  const rpick = e.target.closest('.role-pick');
  if(rpick && sel.nodes.size===1){
    const n = nodeById([...sel.nodes][0]);
    if(n && n.type==='approval') openApprovalRolePicker(n);
    return;
  }
  /* ③ 可用变量 chip → 在光标处插入 {{变量}} */
  const vchip = e.target.closest('.pvar');
  if(vchip){
    const ta = $('#props textarea[data-k="tpl"]');
    if(ta){
      const ins = '{{'+vchip.dataset.var+'}}';
      const s = ta.selectionStart??ta.value.length, ed = ta.selectionEnd??s;
      ta.value = ta.value.slice(0,s)+ins+ta.value.slice(ed);
      ta.focus();
      ta.setSelectionRange(s+ins.length, s+ins.length);
      ta.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return;
  }
  if(e.target.closest('#prop-del')){ deleteSel(); return; }
  if(e.target.closest('#prop-copy')){ copySel(); toast('已复制节点','ok'); return; }
  if(e.target.closest('#prop-del-edge')){
    const id = [...sel.edges][0];
    pushUndo(); removeEdge(id); clearSel(); renderAll(); return;
  }
});
$('#props').addEventListener('input', e=>{
  if(e.target.id==='prop-title' && sel.nodes.size===1){
    const n = nodeById([...sel.nodes][0]);
    n.title = e.target.value || defOf(n).name;
    const t = nodesLayer.querySelector(`.node[data-id="${n.id}"] .ntitle`);
    if(t) t.textContent = n.title;
    saveLocal();
  }
});
function rerenderNode(n){
  const old = nodesLayer.querySelector(`.node[data-id="${n.id}"]`);
  const el = makeNodeEl(n);
  if(old) old.replaceWith(el); else nodesLayer.appendChild(el);
  measurePorts(); updateEdgesOf([n.id]); updateNodeToolbox();
}

/* ----- 小地图 ----- */
function nodeSizeOf(n){
  const el = nodesLayer.querySelector(`.node[data-id="${n.id}"]`);
  return { w:(el?el.offsetWidth/view.scale:250), h:(el?el.offsetHeight/view.scale:140) };
}
function renderMinimap(){
  const cv = $('#minimap'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#141419'; ctx.fillRect(0,0,W,H);
  if(!state.nodes.length) return;
  let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
  state.nodes.forEach(n=>{ const s=nodeSizeOf(n);
    minX=Math.min(minX,n.x); minY=Math.min(minY,n.y); maxX=Math.max(maxX,n.x+s.w); maxY=Math.max(maxY,n.y+s.h); });
  const rs = viewport.getBoundingClientRect();
  const vw = rs.width/view.scale, vh = rs.height/view.scale;
  minX=Math.min(minX,-view.x/view.scale); minY=Math.min(minY,-view.y/view.scale);
  maxX=Math.max(maxX,-view.x/view.scale+vw); maxY=Math.max(maxY,-view.y/view.scale+vh);
  const pad=60; minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
  const s = Math.min(W/(maxX-minX), H/(maxY-minY));
  const ox = (W-(maxX-minX)*s)/2, oy = (H-(maxY-minY)*s)/2;
  const tx = x=>ox+(x-minX)*s, ty = y=>oy+(y-minY)*s;
  ctx.strokeStyle = 'rgba(139,152,255,.7)'; ctx.lineWidth = 1;
  ctx.strokeRect(tx(-view.x/view.scale), ty(-view.y/view.scale), vw*s, vh*s);
  ctx.fillStyle = 'rgba(139,152,255,.06)';
  ctx.fillRect(tx(-view.x/view.scale), ty(-view.y/view.scale), vw*s, vh*s);
  state.nodes.forEach(n=>{
    const sz = nodeSizeOf(n), w = sz.w*s, h = sz.h*s;
    ctx.fillStyle = catColor(defOf(n).cat); ctx.globalAlpha = sel.nodes.has(n.id)?1:.65;
    ctx.fillRect(tx(n.x), ty(n.y), Math.max(w,3), Math.max(h,3));
    ctx.globalAlpha = 1;
    if(sel.nodes.has(n.id)){ ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(tx(n.x),ty(n.y),Math.max(w,3),Math.max(h,3)); }
  });
}
$('#minimap').addEventListener('mousedown', e=>{
  e.preventDefault(); e.stopPropagation();
  const move = ev=>{
    const cv = $('#minimap'), r = cv.getBoundingClientRect();
    let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    state.nodes.forEach(n=>{ const s=nodeSizeOf(n);
      minX=Math.min(minX,n.x); minY=Math.min(minY,n.y); maxX=Math.max(maxX,n.x+s.w); maxY=Math.max(maxY,n.y+s.h); });
    if(minX>maxX) return;
    const pad=60; minX-=pad;minY-=pad;maxX+=pad;maxY+=pad;
    const s = Math.min(r.width/(maxX-minX), r.height/(maxY-minY));
    const ox=(r.width-(maxX-minX)*s)/2, oy=(r.height-(maxY-minY)*s)/2;
    const wx = minX+((ev.clientX-r.left)-ox)/s, wy = minY+((ev.clientY-r.top)-oy)/s;
    const rs = viewport.getBoundingClientRect();
    view.x = rs.width/2 - wx*view.scale; view.y = rs.height/2 - wy*view.scale;
    applyView();
  };
  move(e);
  const up = ()=>{ window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); };
  window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
});
function updateStats(){
  $('#canvas-stats').textContent = `节点 ${state.nodes.length} · 连线 ${state.edges.length} · ${Math.round(view.scale*100)}%`;
}

/* ================================================================
 *  选择
 * ================================================================ */
function clearSel(){ sel.nodes.clear(); sel.edges.clear(); refreshSel(); }
function updatePortColors(nodeId){
  const n = nodeById(nodeId); if(!n) return;
  const el = nodesLayer.querySelector(`.node[data-id="${nodeId}"]`); if(!el) return;
  const def = defOf(n);
  el.querySelectorAll('.port').forEach(pt=>{
    const dir = pt.dataset.dir, p = +pt.dataset.p;
    const t = dir==='in' ? def.inputs[p].t : def.outputs[p].t;
    const e = state.edges.find(e => dir==='in' ? (e.tn===nodeId&&e.tp===p) : (e.fn===nodeId&&e.fp===p));
    if(!e){ pt.style.setProperty('--pc-d', PTYPES[t].dc); return; }
    // 已连接：any 类型显示实际对端类型色，其余用自己的亮色
    let shown = t;
    if(t==='any'){
      const other = dir==='in'
        ? defOf(nodeById(e.fn)).outputs[e.fp].t
        : (defOf(nodeById(e.tn)).inputs[e.tp].t);
      shown = other==='any' ? t : other;
    }
    pt.style.setProperty('--pc-d', PTYPES[shown].pc);
  });
}
function updateAllPortColors(){ state.nodes.forEach(n=>updatePortColors(n.id)); }
/* ----- 选中节点悬浮工具条（SelectionToolbox） ----- */
function updateNodeToolbox(){
  const tb = $('#node-tb');
  if(!sel.nodes.size){
    tb.classList.remove('show'); tb.style.display='none'; return;
  }
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  sel.nodes.forEach(id=>{
    const el = nodesLayer.querySelector(`.node[data-id="${id}"]`);
    if(!el) return;
    const r = el.getBoundingClientRect();
    minX=Math.min(minX,r.left); minY=Math.min(minY,r.top);
    maxX=Math.max(maxX,r.right); maxY=Math.max(maxY,r.bottom);
  });
  if(minX===Infinity){ tb.classList.remove('show'); tb.style.display='none'; return; }
  const vpR = viewport.getBoundingClientRect();
  const cx = (minX+maxX)/2 - vpR.left;
  const wasShown = tb.classList.contains('show');
  tb.style.display='flex';
  if(!wasShown) tb.classList.add('show');
  const single = sel.nodes.size===1;
  [['ntb-info',single],['ntb-bypass',single],['ntb-refresh',single],['ntb-exec',single&&!running],['ntb-more',single]]
    .forEach(([id,vis])=>{ $('#'+id).style.display = vis?'':'none'; });
  if(!single) $('#ntb-del').style.flex = '1';
  else $('#ntb-del').style.flex = '';
  // 默认悬浮在选区上方居中；顶部空间不足时翻到下方
  const above = (minY - vpR.top) > 52;
  const x = cx, y = above ? (minY - vpR.top - 10) : (maxY - vpR.top + 10);
  tb.style.left = x+'px'; tb.style.top = y+'px';
  tb.style.transform = 'translateX(-50%) translateY(-100%)';
  if(!above) tb.style.transform = 'translateX(-50%)';
}
function runSingleNode(n){
  if(running) return;
  running = true; stopFlag = false;
  const el = nodeEl(n.id);
  el.classList.remove('st-done','st-error');
  el.classList.add('st-running');
  measurePorts(); updateEdgesOf([n.id]);
  const def = defOf(n), meta = RUN_META[n.type]||{dur:600,out:()=>'完成'};
  const dur = meta.dur/(settings.speed||1);
  addLog(`▶ ${esc(n.title||def.name)} · 单节点执行 <span style="color:var(--text3)">#${n.id}</span>`);
  const bar = el.querySelector('.node-progress i');
  bar.style.transition='none'; bar.style.width='0%'; void bar.offsetWidth;
  bar.style.transition=`width ${dur}ms linear`; bar.style.width='100%';
  cancellableSleep(dur).then(()=>{
    const outText = meta.out(n);
    el.classList.remove('st-running');
    el.classList.add('st-done');
    setNodeOut(n.id, outText);
    measurePorts(); updateEdgesOf([n.id]);
    addLog(`✓ ${esc(n.title||def.name)} · 单节点执行完成 · ${(dur/1000).toFixed(1)}s`,'ok');
    running = false; updateNodeToolbox();
  });
}
function refreshSel(){
  updateNodeToolbox();
  nodesLayer.querySelectorAll('.node').forEach(el=>el.classList.toggle('selected', sel.nodes.has(+el.dataset.id)));
  edgeEls.forEach((rec,id)=>{
    rec.g.classList.toggle('selected', sel.edges.has(id));
    rec.g.classList.remove('hl');
  });
  if(sel.nodes.size){
    state.edges.forEach(e=>{
      if(sel.nodes.has(e.fn)||sel.nodes.has(e.tn)){
        const rec = edgeEls.get(e.id); rec&&rec.g.classList.add('hl');
      }
    });
  }
  renderProps();
}
function selectNode(id, additive){
  if(!additive){ sel.nodes.clear(); sel.edges.clear(); }
  sel.nodes.has(id) && additive ? sel.nodes.delete(id) : sel.nodes.add(id);
  refreshSel();
}
function selectAll(){ sel.nodes=new Set(state.nodes.map(n=>n.id)); sel.edges.clear(); refreshSel(); }

/* ================================================================
 *  编辑操作
 * ================================================================ */
function pushUndo(){
  undoStack.push(JSON.stringify({nodes:state.nodes, edges:state.edges, name:state.name}));
  if(undoStack.length>60) undoStack.shift();
  redoStack.length = 0;
}
function undo(){
  if(!undoStack.length||running) return;
  redoStack.push(JSON.stringify({nodes:state.nodes, edges:state.edges, name:state.name}));
  const s = JSON.parse(undoStack.pop());
  Object.assign(state, s); state.name = s.name; clearSel(); renderAll(); renderTabsBar(); toast('已撤销');
}
function redo(){
  if(!redoStack.length||running) return;
  undoStack.push(JSON.stringify({nodes:state.nodes, edges:state.edges, name:state.name}));
  const s = JSON.parse(redoStack.pop());
  Object.assign(state, s); state.name = s.name; clearSel(); renderAll(); renderTabsBar(); toast('已重做');
}
function addNode(type, x, y, extra){
  pushUndo();
  const def = DEFS[type];
  const n = { id:state.nextId++, type, x:Math.round(x), y:Math.round(y),
              title: extra?.title || def.name, params: extra?.params ? {...extra.params} : {} };
  state.nodes.push(n);
  const el = makeNodeEl(n);
  el.classList.add('anim-in');
  nodesLayer.appendChild(el);
  setTimeout(()=>{ el.classList.remove('anim-in'); measurePorts(); updateEdgesOf([n.id]); }, 220);
  measurePorts(); renderMinimap(); updateStats();
  $('#empty-hint').style.display='none';
  saveLocal();
  return n;
}
function removeNode(id){
  state.edges = state.edges.filter(e=>e.fn!==id && e.tn!==id);
  state.nodes = state.nodes.filter(n=>n.id!==id);
  const el = nodesLayer.querySelector(`.node[data-id="${id}"]`);
  if(el){ el.classList.add('anim-out'); const gone=el; setTimeout(()=>gone.remove(), 180); }
  portCache.delete(id);
  renderEdges(); renderMinimap(); updateStats();
  $('#empty-hint').style.display = state.nodes.length?'none':'flex';
  saveLocal();
}
function removeEdge(id){
  state.edges = state.edges.filter(e=>e.id!==id);
  const g = edgesSvg.querySelector(`g.edge[data-id="${id}"]`); g&&g.remove();
  edgeEls.delete(id); updateStats(); saveLocal();
}
function addEdge(fn,fp,tn,tp){
  const sn = nodeById(fn), tnn = nodeById(tn);
  if(!sn||!tnn||sn===tnn) return false;
  const so = defOf(sn).outputs[fp], ti = defOf(tnn).inputs[tp];
  if(!so||!ti||!typeOk(so.t,ti.t)) return false;
  if(state.edges.some(e=>e.fn===fn&&e.fp===fp&&e.tn===tn&&e.tp===tp)) return false;
  pushUndo();
  const e = { id:Date.now()+Math.floor(Math.random()*1000), fn,fp,tn,tp };
  state.edges.push(e);
  const g = edgeSvg(e);
  edgesSvg.appendChild(g);
  edgeEls.set(e.id,{g,vis:g.querySelector('.vis')});
  // 连线绘制生长动画
  try{
    const vis = g.querySelector('.vis'), L = vis.getTotalLength();
    vis.style.transition='none';
    vis.style.strokeDasharray=L; vis.style.strokeDashoffset=L;
    void vis.getBoundingClientRect();
    vis.style.transition='stroke-dashoffset .26s ease';
    vis.style.strokeDashoffset='0';
    setTimeout(()=>{ vis.style.strokeDasharray=''; vis.style.transition=''; }, 320);
  }catch(_){}
  updatePortColors(fn); updatePortColors(tn);
  updateStats(); saveLocal();
  return true;
}
function deleteSel(){
  if(!sel.nodes.size && !sel.edges.size) return;
  const cnt = sel.nodes.size + sel.edges.size;
  pushUndo();
  [...sel.edges].forEach(removeEdge);
  [...sel.nodes].forEach(removeNode);
  clearSel(); renderMinimap();
  toast(`已删除 ${cnt} 个对象`,'ok');
}
function copySel(){
  if(!sel.nodes.size) return;
  const ids = new Set(sel.nodes);
  clipboard = {
    nodes: state.nodes.filter(n=>ids.has(n.id)).map(n=>JSON.parse(JSON.stringify(n))),
    edges: state.edges.filter(e=>ids.has(e.fn)&&ids.has(e.tn)),
  };
}
function pasteSel(at){
  if(!clipboard||!clipboard.nodes.length) return;
  pushUndo(); clearSel();
  const idMap = {};
  let minX=1e9,minY=1e9;
  clipboard.nodes.forEach(n=>{ minX=Math.min(minX,n.x); minY=Math.min(minY,n.y); });
  let cx, cy;
  if(at){ cx=at.x; cy=at.y; } else {
    const r = viewport.getBoundingClientRect();
    const w = toWorld(r.left+r.width/2, r.top+r.height/2); cx=w.x; cy=w.y;
  }
  const offX = cx-minX-150, offY = cy-minY-60;
  clipboard.nodes.forEach(n=>{
    const old = n.id;
    const nn = JSON.parse(JSON.stringify(n));
    nn.id = state.nextId++; nn.x+=offX+24; nn.y+=offY+24;
    idMap[old]=nn.id; state.nodes.push(nn);
    nodesLayer.appendChild(makeNodeEl(nn)); sel.nodes.add(nn.id);
  });
  clipboard.edges.forEach(e=>{
    state.edges.push({id:Date.now()+Math.floor(Math.random()*1000), fn:idMap[e.fn], fp:e.fp, tn:idMap[e.tn], tp:e.tp});
  });
  measurePorts(); renderEdges(); refreshSel(); renderMinimap(); updateStats(); saveLocal();
  toast(`已粘贴 ${clipboard.nodes.length} 个节点`,'ok');
}

/* ================================================================
 *  持久化
 * ================================================================ */
let saveTimer = null;
function saveLocal(){
  if(!settings.autosave) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    syncToTabs();
    try{ localStorage.setItem(LS_KEY, JSON.stringify({tabs, activeTab, runs, settings})); }catch(_){}
    renderTabsBar();
  }, 350);
}
function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return false;
    const d = JSON.parse(raw);
    if(!d.tabs||!Array.isArray(d.tabs)||!d.tabs.length) return false;
    tabs = d.tabs; activeTab = clamp(d.activeTab||0, 0, tabs.length-1);
    runs = d.runs||[];
    settings = Object.assign(settings, d.settings||{});
    const t = tabs[activeTab];
    state = {name:t.name, nodes:t.nodes, edges:t.edges, nextId:t.nextId};
    view = t.view || {x:60,y:40,scale:1};
    return true;
  }catch(_){ return false; }
}

/* ================================================================
 *  画布交互
 * ================================================================ */
let dragCtx = null;

viewport.addEventListener('mousedown', e=>{
  if(e.button===1){ e.preventDefault(); startPan(e); return; }
  if(e.button!==0) return;
  const nodeEl = e.target.closest('.node');
  const portEl = e.target.closest('.port');

  if(portEl && nodeEl && !running){
    e.preventDefault();
    document.body.classList.add('linking');
    const from = { id:+nodeEl.dataset.id, dir:portEl.dataset.dir, p:+portEl.dataset.p };
    dragCtx = { mode:'link', from, moved:false };
    ghost.style.display='block';
    const fn = nodeById(from.id), def = defOf(fn);
    const fromT = from.dir==='out' ? def.outputs[from.p].t : def.inputs[from.p].t;
    nodesLayer.querySelectorAll('.port').forEach(pt=>{
      const el = pt.closest('.node'); if(!el||+el.dataset.id===from.id) return;
      if(pt.dataset.dir===from.dir) return;
      const od = defOf(nodeById(+el.dataset.id));
      const t = pt.dataset.dir==='out' ? od.outputs[+pt.dataset.p].t : od.inputs[+pt.dataset.p].t;
      if(typeOk(fromT,t)) pt.classList.add('compat');
    });
    return;
  }
  if(nodeEl){
    if(e.target.closest('input,select,textarea,button,.ncollapse')){
      /* 点击控件不阻止聚焦/编辑，但同样选中所属节点（滚轮调值等编辑意图的前提） */
      const cid = +nodeEl.dataset.id;
      if(!sel.nodes.has(cid)) selectNode(cid, e.shiftKey);
      return;
    }
    e.preventDefault();
    const id = +nodeEl.dataset.id;
    dragCtx = { mode:'node', moved:false, sx:e.clientX, sy:e.clientY, undoPushed:false,
      nodes: sel.nodes.has(id)
        ? [...sel.nodes].map(i=>({n:nodeById(i), ox:nodeById(i).x, oy:nodeById(i).y}))
        : [{n:nodeById(id), ox:nodeById(id).x, oy:nodeById(id).y}] };
    if(!sel.nodes.has(id)) selectNode(id, e.shiftKey);
    else if(e.shiftKey) selectNode(id, true);
    nodeEl.style.zIndex = 10;
    return;
  }
  const edgeG = e.target.closest('g.edge');
  if(edgeG){
    if(e.target.closest('.edel')){
      pushUndo(); removeEdge(+edgeG.dataset.id); clearSel(); renderProps(); return;
    }
    if(!e.shiftKey){ sel.nodes.clear(); sel.edges.clear(); }
    sel.edges.add(+edgeG.dataset.id); refreshSel();
    return;
  }
  if(e.ctrlKey||e.metaKey||canvasMode==='select'){ dragCtx={mode:'box', sx:e.clientX, sy:e.clientY, moved:false}; }
  else { startPan(e); }
});
function startPan(e){
  dragCtx = { mode:'pan', sx:e.clientX, sy:e.clientY, ox:view.x, oy:view.y, moved:false };
  viewport.classList.add('panning');
  e.preventDefault&&e.preventDefault();
}
window.addEventListener('mousemove', e=>{
  if(!dragCtx) return;
  const dx = e.clientX-dragCtx.sx, dy = e.clientY-dragCtx.sy;
  if(dragCtx.mode==='pan'){
    if(Math.abs(dx)+Math.abs(dy)>2) dragCtx.moved=true;
    view.x = dragCtx.ox+dx; view.y = dragCtx.oy+dy; applyView();
  }
  else if(dragCtx.mode==='node'){
    if(Math.abs(dx)+Math.abs(dy)>2){
      dragCtx.moved=true;
      if(!dragCtx.undoPushed){ pushUndo(); dragCtx.undoPushed=true; }
    }
    dragCtx.nodes.forEach(it=>{
      if(!it.n) return;
      let nx = it.ox+dx, ny = it.oy+dy;
      if(settings.snap){ nx = Math.round(nx/26)*26; ny = Math.round(ny/26)*26; }
      it.n.x = Math.round(nx); it.n.y = Math.round(ny);
      const el = nodesLayer.querySelector(`.node[data-id="${it.n.id}"]`);
      if(el){ el.style.left=it.n.x+'px'; el.style.top=it.n.y+'px'; }
    });
    updateEdgesOf(dragCtx.nodes.map(it=>it.n.id));
    updateNodeToolbox();
    renderMinimapThrottled();
  }
  else if(dragCtx.mode==='box'){
    dragCtx.moved=true;
    const r = viewport.getBoundingClientRect();
    const x1=Math.min(dragCtx.sx,e.clientX)-r.left, y1=Math.min(dragCtx.sy,e.clientY)-r.top;
    const w=Math.abs(e.clientX-dragCtx.sx), h=Math.abs(e.clientY-dragCtx.sy);
    const bs=$('#boxsel'); bs.style.display='block'; bs.style.left=x1+'px'; bs.style.top=y1+'px';
    bs.style.width=w+'px'; bs.style.height=h+'px';
  }
  else if(dragCtx.mode==='link'){
    dragCtx.moved=true;
    const w = toWorld(e.clientX, e.clientY);
    const c = portCenter(dragCtx.from.id, dragCtx.from.dir, dragCtx.from.p);
    ghost.setAttribute('d', dragCtx.from.dir==='out' ? bezier(c,w) : bezier(w,c));
  }
  else if(dragCtx.mode==='palette'){
    dragCtx.moved=true;
    const g = $('#pal-drag-ghost');
    g.style.left=(e.clientX+14)+'px'; g.style.top=(e.clientY+10)+'px';
    const r = viewport.getBoundingClientRect();
    g.style.outline = (e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom)?'2px solid var(--accent)':'';
    const over = document.elementFromPoint(e.clientX,e.clientY);
    dragCtx.overViewport = !!(over&&viewport.contains(over));
  }
});
window.addEventListener('mouseup', e=>{
  if(!dragCtx) return;
  const ctx = dragCtx; dragCtx = null;
  viewport.classList.remove('panning');
  if(ctx.mode==='pan' && !ctx.moved && !e.shiftKey){ clearSel(); }
  else if(ctx.mode==='node'){
    nodesLayer.querySelectorAll('.node').forEach(el=>el.style.zIndex='');
    if(ctx.moved){ measurePorts(); updateStats(); saveLocal(); }
  }
  else if(ctx.mode==='box'){
    const bs=$('#boxsel');
    const w1=toWorld(Math.min(ctx.sx,e.clientX),Math.min(ctx.sy,e.clientY));
    const w2=toWorld(Math.max(ctx.sx,e.clientX),Math.max(ctx.sy,e.clientY));
    bs.style.display='none';
    if(!e.shiftKey){ sel.nodes.clear(); sel.edges.clear(); }
    state.nodes.forEach(n=>{
      const sz = nodeSizeOf(n);
      if(n.x<w2.x && n.x+sz.w>w1.x && n.y<w2.y && n.y+sz.h>w1.y) sel.nodes.add(n.id);
    });
    refreshSel();
  }
  else if(ctx.mode==='link'){
    ghost.style.display='none'; ghost.setAttribute('d','');
    document.body.classList.remove('linking');
    nodesLayer.querySelectorAll('.port').forEach(pt=>pt.classList.remove('compat'));
    const pt = document.elementFromPoint(e.clientX,e.clientY)?.closest('.port');
    if(pt){
      const nodeEl = pt.closest('.node');
      const to = { id:+nodeEl.dataset.id, dir:pt.dataset.dir, p:+pt.dataset.p };
      if(to.id!==ctx.from.id && to.dir!==ctx.from.dir){
        const out = ctx.from.dir==='out'?ctx.from:to, inn = ctx.from.dir==='in'?ctx.from:to;
        if(addEdge(out.id,out.p,inn.id,inn.p)) toast('已创建连线','ok');
        else toast('端口类型不兼容','warn');
      }
    } else if(ctx.moved){
      // 释放到空白：弹出节点搜索，创建后自动连线（ComfyUI litegraph 行为）
      openSearch(toWorld(e.clientX,e.clientY), ctx.from);
    }
  }
  else if(ctx.mode==='palette'){
    $('#pal-drag-ghost').style.display='none';
    if(ctx.overViewport && ctx.moved){
      const w = toWorld(e.clientX,e.clientY);
      const n = addNode(ctx.type, w.x-150, w.y-30);
      selectNode(n.id,false);
    } else if(!ctx.moved){
      const r = viewport.getBoundingClientRect();
      const w = toWorld(r.left+r.width/2, r.top+r.height/2);
      const n = addNode(ctx.type, w.x-150+(Math.random()*60-30), w.y-60+(Math.random()*40-20));
      selectNode(n.id,false);
    }
  }
});
viewport.addEventListener('wheel', e=>{
  /* 仅当指针位于「已选中节点」的编辑控件上时接管滚轮（点中=编辑意图）：
     数字框滚轮=步进数值（累积阈值兼容触控板）、textarea 保留原生滚动、其余控件吞掉；
     未选中节点的控件与空白处一律走画布缩放 */
  const ctl = e.target.closest('input,select,textarea,[contenteditable=true]');
  if(ctl && ctl.closest('.node.selected')){
    if(ctl.tagName==='INPUT' && ctl.type==='number' && !ctl.disabled){
      const now = performance.now();
      ctl.__wacc = (now - (ctl.__wt||0) < 300) ? (ctl.__wacc||0) + e.deltaY : e.deltaY;
      ctl.__wt = now;
      const steps = Math.trunc(Math.abs(ctl.__wacc) / 100);
      if(steps > 0){
        const dir = ctl.__wacc < 0 ? 1 : -1;
        for(let i=0;i<steps;i++) numStep(ctl, dir);
        ctl.__wacc -= Math.sign(ctl.__wacc) * steps * 100;
      }
    }
    else if(ctl.tagName!=='TEXTAREA'){ /* 下拉/文本框：仅吞掉 */ }
    else return;   /* textarea：不阻止默认滚动 */
    e.preventDefault();
    return;
  }
  e.preventDefault();
  if(Math.abs(e.deltaX)>Math.abs(e.deltaY)&&!e.ctrlKey){ view.x-=e.deltaX; view.y-=e.deltaY; applyView(); return; }
  zoomAt(e.deltaY>0?0.9:1.111, e.clientX, e.clientY);
}, {passive:false});
viewport.addEventListener('dblclick', e=>{
  if(e.target.closest('.node')||e.target.closest('g.edge')) return;
  openSearch(toWorld(e.clientX,e.clientY));
});
viewport.addEventListener('contextmenu', e=>{
  e.preventDefault();
  const nodeEl = e.target.closest('.node');
  const edgeG = e.target.closest('g.edge');
  const w = toWorld(e.clientX,e.clientY);
  if(nodeEl){
    const id = +nodeEl.dataset.id;
    if(!sel.nodes.has(id)) selectNode(id,false);
    const n = nodeById(id);
    showMenu(e.clientX,e.clientY,[
      {t:`#${n.id} ${esc(n.title||defOf(n).name)}`,cls:'mtitle'},
      {ic:'pencil',t:'重命名节点',f:()=>{
        const el = nodesLayer.querySelector(`.node[data-id="${n.id}"] .ntitle`);
        el && el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
      }},
      {ic:n.collapsed?'chev-right':'chev-down',t:(n.collapsed?'展开参数':'折叠参数'),f:()=>{n.collapsed=!n.collapsed;rerenderNode(n);saveLocal();}},
      {ic:'copy',t:'复制',mk:'Ctrl+C',f:()=>{copySel();toast('已复制节点','ok');}},
      {sep:1},
      {ic:'trash',t:'删除节点',mk:'Del',cls:'danger',f:deleteSel},
    ]);
  } else if(edgeG){
    showMenu(e.clientX,e.clientY,[{ic:'trash',t:'删除连线',cls:'danger',f:()=>{pushUndo();removeEdge(+edgeG.dataset.id);clearSel();renderProps();}}]);
  } else {
    showMenu(e.clientX,e.clientY,[
      {ic:'plus',t:'添加节点…',mk:'双击',f:()=>openSearch(w)},
      {ic:'clipboard',t:'粘贴',mk:'Ctrl+V',f:()=>clipboard&&pasteSel(w)},
      {sep:1},
      {ic:'box-select',t:'框选全部',mk:'Ctrl+A',f:selectAll},
      {ic:'maximize',t:'适应视图',mk:'Home',f:fitView},
      {ic:'git-branch',t:'工作台 · 仓库信息',f:()=>wbOpen('git')},
      {sep:1},
      {ic:'trash',t:'清空当前画布',cls:'danger',f:()=>{ if(confirm('确定清空当前工作流的节点与连线？')){ pushUndo(); state.nodes=[];state.edges=[];clearSel();renderAll(); } }},
    ]);
  }
});
/* 选中工具条事件 */
$('#node-tb').addEventListener('mousedown', e=>e.stopPropagation());
$('#node-tb').addEventListener('click', e=>{
  const n = sel.nodes.size===1 ? nodeById([...sel.nodes][0]) : null;
  if(e.target.closest('#ntb-del')){ deleteSel(); return; }
  if(!n) return;
  if(e.target.closest('#ntb-info')){
    const input = $('#prop-title');
    if(input){ input.scrollIntoView({block:'nearest'}); input.focus(); input.select(); }
    toast(`节点 #${n.id} · ${defOf(n).name} · (${Math.round(n.x)}, ${Math.round(n.y)})`);
    return;
  }
  if(e.target.closest('#ntb-bypass')){
    pushUndo(); n.bypass = !n.bypass; rerenderNode(n); saveLocal();
    toast(n.bypass?'已旁路：执行时将跳过此节点':'已取消旁路','ok');
    return;
  }
  if(e.target.closest('#ntb-refresh')){
    const el = nodeEl(n.id);
    el.classList.remove('st-done','st-error','st-running');
    el.querySelector('.node-out').textContent='';
    saveLocal(); toast('节点状态已重置','ok');
    return;
  }
  if(e.target.closest('#ntb-exec')){ runSingleNode(n); return; }
  if(e.target.closest('#ntb-more')){
    const r = e.target.closest('#ntb-more').getBoundingClientRect();
    showMenu(r.left, r.bottom+6, [
      {ic:'pencil',t:'重命名节点',f:()=>{
        const t = nodesLayer.querySelector(`.node[data-id="${n.id}"] .ntitle`);
        t && t.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
      }},
      {ic:'copy',t:'复制节点',f:()=>{ copySel(); toast('已复制节点','ok'); }},
      {ic:n.collapsed?'chev-right':'chev-down',t:(n.collapsed?'展开参数':'折叠参数'),f:()=>{n.collapsed=!n.collapsed;rerenderNode(n);saveLocal();}},
      {ic:'pause',t:n.bypass?'取消旁路':'旁路（跳过执行）',f:()=>{ pushUndo(); n.bypass=!n.bypass; rerenderNode(n); saveLocal(); }},
      {sep:1},
      {ic:'trash',t:'删除节点',mk:'Del',cls:'danger',f:deleteSel},
    ]);
    return;
  }
});
nodesLayer.addEventListener('click', e=>{
  const btn = e.target.closest('.ncollapse');
  if(btn){
    const n = nodeById(+btn.closest('.node').dataset.id);
    n.collapsed = !n.collapsed; rerenderNode(n); saveLocal();
  }
});
nodesLayer.addEventListener('mouseup', e=>{
  if(e.target.tagName==='TEXTAREA'){
    const nodeEl = e.target.closest('.node'); if(!nodeEl) return;
    measurePorts(); updateEdgesOf([+nodeEl.dataset.id]);
  }
});
nodesLayer.addEventListener('change', e=>{
  const nodeEl = e.target.closest('.node'); if(!nodeEl) return;
  const n = nodeById(+nodeEl.dataset.id); if(!n) return;
  const k = e.target.dataset.k; if(k===undefined) return;
  n.params = n.params||{};
  n.params[k] = e.target.type==='checkbox'?e.target.checked : e.target.type==='number'?Number(e.target.value):e.target.value;
  if(n.type==='code' && k==='lang') syncCodeSampleLang(n);   /* BUG-0012 前端联动·节点体入口（ADR-0017 §3） */
  const def = defOf(n), ps = paramsOf(n);
  if((def.params||[]).some(p=>p.if&&p.k===k)){ rerenderNode(n); }
  renderMinimap(); saveLocal();
});

/* ================================================================
 *  搜索弹窗
 * ================================================================ */
let searchPos = null, searchIdx = 0, searchItems = [], pendingLinkCtx = null;
function openSearch(worldPos, linkCtx){
  searchPos = worldPos;
  pendingLinkCtx = linkCtx||null;
  $('#search-modal').classList.add('show');
  const inp = $('#search-input'); inp.value=''; inp.focus();
  renderSearchList('');
}
function closeSearch(){ $('#search-modal').classList.remove('show'); searchPos=null; pendingLinkCtx=null; }
function renderSearchList(q){
  const s = q.trim().toLowerCase();
  searchItems = Object.entries(DEFS).filter(([k,d])=>
    !s || (d.name+' '+d.kw+' '+d.desc+' '+CATS[d.cat].name).toLowerCase().includes(s)).slice(0,14);
  searchIdx = 0;
  $('#search-list').innerHTML = searchItems.length ? searchItems.map(([k,d],i)=>`
    <div class="s-item ${i===0?'active':''}" data-type="${k}">
      <span class="sicon" style="border:1px solid ${catColor(d.cat)}">${I(d.icon)}</span>
      <div><div class="sn">${esc(d.name)}</div><div class="sd">${esc(d.desc)}</div></div>
      <span class="stag">${CATS[d.cat].name}</span>
    </div>`).join('') : '<div class="s-empty">未找到匹配节点</div>';
}
function confirmSearch(type){
  const p = searchPos || (()=>{ const r=viewport.getBoundingClientRect(); return toWorld(r.left+r.width/2,r.top+r.height/2); })();
  const n = addNode(type, p.x-150, p.y-40);
  // 连线释放到空白后创建节点：自动连接到兼容端口（litegraph 行为）
  if(pendingLinkCtx){
    const lc = pendingLinkCtx;
    const srcNode = nodeById(lc.id);
    if(srcNode){
      const srcDef = defOf(srcNode), newDef = DEFS[type];
      let done = false;
      if(lc.dir==='out'){
        const st = srcDef.outputs[lc.p].t;
        newDef.inputs.some((ip,pi)=>typeOk(st,ip.t) && addEdge(lc.id,lc.p,n.id,pi) && (done=true));
      } else {
        const tt = srcDef.inputs[lc.p].t;
        newDef.outputs.some((op,pi)=>typeOk(op.t,tt) && addEdge(n.id,pi,lc.id,lc.p) && (done=true));
      }
      if(done) toast('已创建节点并自动连线','ok');
    }
    pendingLinkCtx = null;
  }
  selectNode(n.id,false);
  closeSearch();
  toast(`已添加「${DEFS[type].name}」`,'ok');
}
$('#search-input').addEventListener('input', e=>renderSearchList(e.target.value));
$('#search-input').addEventListener('keydown', e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();
    if(!searchItems.length) return;
    searchIdx = (searchIdx + (e.key==='ArrowDown'?1:-1) + searchItems.length) % searchItems.length;
    $$('#search-list .s-item').forEach((el,i)=>el.classList.toggle('active',i===searchIdx));
    $$('#search-list .s-item')[searchIdx]?.scrollIntoView({block:'nearest'});
  } else if(e.key==='Enter'){
    if(searchItems.length) confirmSearch(searchItems[searchIdx][0]);
  } else if(e.key==='Escape') closeSearch();
});
$('#search-list').addEventListener('click', e=>{
  const it = e.target.closest('.s-item'); if(it) confirmSearch(it.dataset.type);
});
$('#search-modal').addEventListener('mousedown', e=>{ if(e.target===e.currentTarget) closeSearch(); });

/* ================================================================
 *  菜单
 * ================================================================ */
function showMenu(x, y, items){
  const m = $('#ctxmenu');
  m.innerHTML = items.map(i=> i.sep?'<div class="msep"></div>' :
    i.cls==='mtitle' ? `<div class="mtitle">${i.t}</div>` :
    `<div class="mi ${i.cls||''}" data-i="${items.indexOf(i)}">${i.ic?I(i.ic):''}<span class="mi-t">${i.t}</span>${i.mk?`<span class="mk">${i.mk}</span>`:''}</div>`).join('');
  m.classList.add('show');
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth-r.width-8)+'px';
  m.style.top  = Math.min(y, innerHeight-r.height-8)+'px';
  m._items = items;
}
document.addEventListener('mousedown', e=>{
  const m = $('#ctxmenu');
  if(m.classList.contains('show') && !e.target.closest('#ctxmenu')) m.classList.remove('show');
}, true);
$('#ctxmenu').addEventListener('click', e=>{
  const mi = e.target.closest('.mi'); if(!mi) return;
  const item = $('#ctxmenu')._items[+mi.dataset.i];
  $('#ctxmenu').classList.remove('show');
  item&&item.f&&item.f();
});

/* ================================================================
 *  顶栏 / 浮动卡 / 工具条 / 菜单按钮
 * ================================================================ */
$('#float-run').addEventListener('click', ()=>runWorkflow());
$('#float-stop').addEventListener('click', ()=>{ stopFlag=true; ENGINE.cancelRun(); });
$('#fl-undo').addEventListener('click', undo);
$('#fl-redo').addEventListener('click', redo);
$('#zoom-in').addEventListener('click', ()=>zoomAt(1.2));
$('#zoom-out').addEventListener('click', ()=>zoomAt(1/1.2));
$('#zoom-lvl').addEventListener('click', ()=>zoomAt(1/view.scale));
$('#zoom-fit').addEventListener('click', fitView);
$('#mode-pan').addEventListener('click', ()=>{ canvasMode='pan'; $('#mode-pan').classList.add('on'); $('#mode-select').classList.remove('on'); });
$('#mode-select').addEventListener('click', ()=>{ canvasMode='select'; $('#mode-select').classList.add('on'); $('#mode-pan').classList.remove('on'); });
$('#rail-help').addEventListener('click', ()=>$('#help-modal').classList.add('show'));
$('#help-close').addEventListener('click', ()=>$('#help-modal').classList.remove('show'));
$('#help-modal').addEventListener('mousedown', e=>{ if(e.target===e.currentTarget) $('#help-modal').classList.remove('show'); });
$('#rail-bp').addEventListener('click', ()=>{ $('#bottompanel').classList.toggle('closed'); renderMinimap(); });
$('#bp-close').addEventListener('click', ()=>{ $('#bottompanel').classList.add('closed'); renderMinimap(); });
$('#log-clear').addEventListener('click', ()=>{ $('#log-body').innerHTML=''; });
$('#log-filter').addEventListener('click', e=>{
  const chip = e.target.closest('.chip'); if(!chip) return;
  document.querySelectorAll('#log-filter .chip').forEach(c=>c.classList.toggle('on', c===chip));
  const lvl = chip.dataset.lvl;
  if(lvl==='all') delete $('#log-body').dataset.lvl;
  else $('#log-body').dataset.lvl = lvl;
});
$('#rail-menu').addEventListener('click', e=>{
  const r = e.currentTarget.getBoundingClientRect();
  showMenu(r.right+6, r.top+4, [
    {ic:'save',t:'保存到本地',mk:'Ctrl+S',f:()=>{ saveLocal(); toast('已保存到浏览器本地存储','ok'); }},
    {ic:'download',t:'导出当前工作流 JSON',f:exportJSON},
    {ic:'upload',t:'导入 JSON',f:()=>$('#file-import').click()},
    {sep:1},
    {ic:'sparkles',t:'模板：智能客服助手',f:()=>addTabFromSample('kefu')},
    {ic:'sparkles',t:'模板：内容创作流水线',f:()=>addTabFromSample('content')},
    {ic:'plus',t:'新建空白工作流',f:newTab},
    {sep:1},
    {ic:'x-square',t:'关闭其他标签页',f:()=>{ if(tabs.length>1){ tabs=[tabs[activeTab]]; activeTab=0; syncToTabs(); renderTabsBar(); saveLocal(); if(railTab==='workflows') renderSidebar(); } }},
  ]);
});
function exportJSON(){
  syncToTabs();
  const data = JSON.stringify({ app:'AgentFlow', version:2, name:state.name, nodes:state.nodes, edges:state.edges }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data],{type:'application/json'}));
  a.download = (state.name||'workflow')+'.json'; a.click();
  URL.revokeObjectURL(a.href);
  toast('已导出 workflow JSON','ok');
}
$('#file-import').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{
    try{
      const d = JSON.parse(rd.result);
      if(!Array.isArray(d.nodes)) throw 0;
      pushUndo();
      state.name = d.name||'导入的工作流';
      state.nodes = d.nodes; state.edges = d.edges||[];
      state.nextId = Math.max(0,...state.nodes.map(n=>n.id||0))+1;
      clearSel(); renderAll(); fitView(); renderTabsBar();
      toast('导入成功','ok');
    }catch(_){ toast('导入失败：文件格式不正确','warn'); }
    e.target.value='';
  };
  rd.readAsText(f);
});

/* ================================================================
 *  日志 & Toast
 * ================================================================ */
function addLog(msg, lvl='info'){
  const body = $('#log-body');
  const div = document.createElement('div');
  div.className = 'logline '+lvl;
  div.innerHTML = `<span class="t">${now()}</span><span class="m">${msg}</span>`;
  body.appendChild(div);
  while(body.children.length>300) body.firstChild.remove();
  body.scrollTop = body.scrollHeight;
}
function toast(msg, cls=''){
  const t = document.createElement('div');
  t.className = 'toast '+cls; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); }, 2100);
}
let mmTimer=null;
function renderMinimapThrottled(){ if(mmTimer) return; mmTimer=setTimeout(()=>{mmTimer=null;renderMinimap();},120); }

/* ================================================================
 *  模拟执行
 * ================================================================ */
const RUN_META = {
  trigger:   {dur:450,  out:()=>'手动触发 · run #1024'},
  userinput: {dur:350,  out:n=>`${paramsOf(n).var||'question'} = "如何申请退货?"`},
  prompt:    {dur:380,  out:()=>'模板渲染完成 · 312 字符'},
  retrieval: {dur:950,  out:()=>'命中 3 条片段 · 最高相似度 0.87'},
  websearch: {dur:1100, out:n=>`${paramsOf(n).eng||'Bing'} 返回 5 条结果`},
  llm:       {dur:1900, out:()=>'根据知识库中的退货政策，商品自签收之日起 7 天内可申请无理由退货；超过 7 天且在保修期内出现质量问题，可凭订单号发起售后工单。已为您生成回复并附操作指引。'},
  http:      {dur:1000, out:()=>'200 OK · 412ms · application/json'},
  code:      {dur:800,  out:()=>'执行成功 · 返回 1 个对象'},
  notify:    {dur:650,  out:n=>`通知已通过${paramsOf(n).ch||'邮件'}发送 (模拟)`},
  condition: {dur:500,  out:n=>`表达式 ${paramsOf(n).expr||'true'} 判定为 {结果}`},
  loop:      {dur:1500, out:()=>'迭代 3/3 完成'},
  delay:     {dur:1400, out:n=>`等待 ${Math.min(2,paramsOf(n).s||2)}s 完成`},
  merge:     {dur:300,  out:()=>'已合并 2 路输入'},
  reply:     {dur:600,  out:()=>'已输出回复 · 248 字'},
  setvar:    {dur:250,  out:n=>`${paramsOf(n).name||'answer'} 已写入变量`},
  webshow:   {dur:500,  out:n=>{ const u=String(paramsOf(n).url||''); return WS_HTTP_S.test(u)?'已呈现网页 · '+u:'未呈现 · 无有效网址（占位降级）'; }},
  approval:  {dur:1300, out:()=>'审批通过 · 值班经理 (模拟)'},
  termview:  {dur:700,  out:()=>'[agentflow] stream ready\n▍ 等宽只读流演示 · 逐行追加\n▍ 本文本为离线模拟文案'},
  jsoncanvas: {dur:800,  out:()=>'{"工作流":"AgentFlow","版本":2,"特性":["结构化树","可折叠"],"配置":{"主题":"dark","展开层级":2}}'},
};
function topoOrder(){
  const indeg = {}; state.nodes.forEach(n=>indeg[n.id]=0);
  state.edges.forEach(e=>{ if(indeg[e.tn]!==undefined) indeg[e.tn]++; });
  const q = state.nodes.filter(n=>indeg[n.id]===0).map(n=>n.id);
  const order = [];
  while(q.length){
    const id = q.shift(); order.push(id);
    state.edges.filter(e=>e.fn===id).forEach(e=>{ if(--indeg[e.tn]===0) q.push(e.tn); });
  }
  return order;
}
function nodeEl(id){ return nodesLayer.querySelector(`.node[data-id="${id}"]`); }
function setNodeOut(id, text){ const el = nodeEl(id); if(el) el.querySelector('.node-out').textContent = text; }
/* ---------- webshow 网页呈现（迭代 0033 / BK-0036 修宪轮：纯插入，不改既有文本路径） ---------- */
const WS_HTTP_S = /^https?:\/\/\S+$/i;   /* http(s) 白名单——与 handlers.ts webshow 同字面量双保险 */
function webshowUrlOf(n, inputs){
  /* 呈现源解析（镜像 handler 序）：① 最近真实运行 in-url 到达值（node:done 事件
   * inputs 预览，engine preview 140 截断——>140 字 URL 截断后不过正则即诚实回落，
   * 不伪造）；② params.url 静态兜底；③ 均无效返回 ''（占位降级）。 */
  const inVal = (inputs || lastRunData.get(n.id)?.inputs || [])[0]?.val;
  if (typeof inVal === 'string' && WS_HTTP_S.test(inVal)) return inVal;
  const u = String(paramsOf(n).url ?? '').trim();
  return WS_HTTP_S.test(u) ? u : '';
}
function setNodeWebshow(id, ev){
  const n = nodeById(id), el = nodeEl(id); if(!n || !el) return;
  const out = el.querySelector('.node-out'); if(!out) return;
  const url = webshowUrlOf(n, Array.isArray(ev?.inputs) ? ev.inputs : undefined);
  out.classList.add('ws-on');
  out.textContent = '';
  if(url){
    const f = document.createElement('iframe');
    f.className = 'ws-frame';
    f.src = url;
    f.title = '网页呈现';
    f.referrerPolicy = 'no-referrer';                 /* ADR-0015 §4.1「CSP/嵌入策略收紧」评估项落地 */
    if(paramsOf(n).sandbox !== false) f.setAttribute('sandbox', '');   /* 空值最严；false=用户显式关闭（责任翻转） */
    out.appendChild(f);
  } else {
    const ph = document.createElement('div');
    ph.className = 'ws-placeholder';
    ph.textContent = '无有效网址 · 占位呈现';
    out.appendChild(ph);
  }
}
function flashEdges(ids){
  if(!settings.flowAnim) return;
  ids.forEach(eid=>{
    const rec = edgeEls.get(eid); if(!rec) return;
    rec.g.classList.add('flowing');
    setTimeout(()=>rec.g.classList.remove('flowing'), 850);
  });
}
/* ===== termview（BK-0037）：等宽只读流呈现区（ADR-0015 §4.2） =====
 * 惰性挂载：首个 node:delta/node:error 才创建（s0~s9 静态态零波及的前提）；
 * 只读——纯 div + textContent，无 input/stdin/写入面（PTY 切割护栏）。 */
const termEl = id => {
  const el = nodeEl(id); if(!el) return null;
  let t = el.querySelector('.node-term');
  if(!t){
    t = document.createElement('div'); t.className = 'node-term';
    el.insertBefore(t, el.querySelector('.node-out'));   /* .node-out(:775) 恒存在 */
    measurePorts(); updateEdgesOf([id]);                 /* 高度变化 → portCache 刷新（已知陷阱条款） */
  }
  return t;
};
const termConsume = ev => {
  /* delta 按边转发（迭代 0034 修复轮 · BUG-001）：node:delta 的 ev.id = 发射节点（上游
   * llm/agent，llm.ts 纯流式分支 acc 累积语义）；termview handler 自身无 delta 通道
   * （仅 emit('output')）——呈现目标 = state.edges 中 ev.id 的下游 type==='termview'
   * 且未旁路节点（发射节点自身即 termview 时并入，模拟执行路径直喂即此形态）。零引擎改动。 */
  if(ev.type==='node:delta'){
    const targets = new Set();
    const src = nodeById(ev.id);
    if(src && src.type==='termview' && !src.bypass) targets.add(ev.id);
    state.edges.forEach(e=>{
      if(e.fn!==ev.id) return;
      const d = nodeById(e.tn);
      if(d && d.type==='termview' && !d.bypass) targets.add(e.tn);
    });
    targets.forEach(tid=>{
      const t = termEl(tid); if(!t) return;
      const m = nodeById(tid);
      const N = Math.max(1, Number(paramsOf(m).lines)||200);
      const kept = String(ev.text||'').split('\n').slice(-N).join('\n');   /* 超限裁旧 */
      t.textContent = kept + '▌';
      if(paramsOf(m).autoscroll !== false) t.scrollTop = t.scrollHeight;   /* 自动滚动 */
      measurePorts(); updateEdgesOf([tid]);
    });
    return;
  }
  const n = nodeById(ev.id); if(!n || n.type!=='termview') return;
  if(ev.type==='node:done'){
    const box = nodeEl(ev.id)?.querySelector('.node-term'); if(!box) return;
    if(box.textContent.endsWith('▌')) box.textContent = box.textContent.slice(0,-1);  /* 定稿去光标 */
  }else if(ev.type==='node:error'){
    const t = termEl(ev.id); if(!t) return;
    const err = document.createElement('div'); err.className = 'node-term-err';
    err.textContent = '✗ ' + String(ev.message||'').slice(0,200);
    t.appendChild(err);
    if(paramsOf(n).autoscroll !== false) t.scrollTop = t.scrollHeight;
    measurePorts(); updateEdgesOf([ev.id]);
  }
};

/* ===== jsoncanvas（BK-0038）：结构化树呈现区（ADR-0015 §4.3 · 迭代 0035） =====
 * 惰性挂载：首个携带数据的消费事件才创建（s0~s11 静态态零波及前提，沿 termEl 先例）；
 * 只读——纯 div + textContent，无 input/写入面；上游 JSON 不可信，全部内容一律
 * textContent 注入、零 innerHTML（XSS 结构性排除，webshow sandbox 同级安全必答项）。 */
const jcFoldClick = ev => {
  const f = ev.target.closest('.jc-fold'); if(!f) return;
  const row = f.parentElement;
  row.classList.toggle('jc-closed');
  f.textContent = row.classList.contains('jc-closed') ? '▸' : '▾';
};
const jtreeEl = id => {
  const el = nodeEl(id); if(!el) return null;
  let t = el.querySelector('.node-jtree');
  if(!t){
    t = document.createElement('div'); t.className = 'node-jtree';
    t.addEventListener('click', jcFoldClick);           /* 委托在容器：重渲染不丢监听 */
    el.insertBefore(t, el.querySelector('.node-out'));  /* .node-out(:775) 恒存在 */
    measurePorts(); updateEdgesOf([id]);                /* 高度变化 → portCache 刷新（已知陷阱条款） */
  }
  return t;
};
const jcBuild = (val, depth, expand, fmt) => {
  const box = document.createElement('div'); box.className = 'jc-val';
  if(val === null || typeof val !== 'object'){
    const s = document.createElement('span'); s.className = 'jc-prim';
    s.textContent = fmt ? String(val) : (JSON.stringify(val) ?? 'null');
    box.appendChild(s); return box;
  }
  const kids = document.createElement('div'); kids.className = 'jc-kids';
  const entries = Array.isArray(val) ? val.map((v,i)=>[i,v]) : Object.entries(val);
  for(const [k,v] of entries){
    const row = document.createElement('div'); row.className = 'jc-row';
    const key = document.createElement('span'); key.className = 'jc-key';
    key.textContent = Array.isArray(val) ? '['+k+']' : k+':';
    row.appendChild(key);
    if(v !== null && typeof v === 'object'){
      const open = depth + 2 <= expand;                 /* 子层号 ≤ expand 才默认展开（expand=0 全折叠） */
      if(!open) row.classList.add('jc-closed');
      const fold = document.createElement('span'); fold.className = 'jc-fold';
      fold.textContent = open ? '▾' : '▸';
      row.appendChild(fold);
      const n = Array.isArray(v) ? v.length : Object.keys(v).length;
      const badge = document.createElement('span'); badge.className = 'jc-badge';
      badge.textContent = Array.isArray(v) ? 'Array('+n+')' : '{'+n+'}';
      row.appendChild(badge);
      row.appendChild(jcBuild(v, depth + 1, expand, fmt));
    } else {
      const s = document.createElement('span'); s.className = 'jc-prim';
      s.textContent = fmt ? (typeof v === 'string' ? '"'+v+'"' : String(v)) : JSON.stringify(v);
      row.appendChild(s);
    }
    kids.appendChild(row);
  }
  box.appendChild(kids);
  return box;
};
const jcRender = (id, text) => {
  const n = nodeById(id); if(!n || n.bypass) return;
  const t = jtreeEl(id); if(!t) return;
  t.innerHTML = '';                                     /* 重渲染语义：最新文本为权威 */
  let val;
  try { val = JSON.parse(String(text ?? '')); }
  catch {                                               /* parse 失败如实降级原文 + warn（不伪造树） */
    const fb = document.createElement('div'); fb.className = 'node-jtree-fallback';
    fb.textContent = String(text ?? '');
    const w = document.createElement('div'); w.className = 'node-jtree-warn';
    w.textContent = '注意：非 JSON 文本 · 已按原文降级呈现';
    t.appendChild(fb); t.appendChild(w);
    measurePorts(); updateEdgesOf([id]);
    return;
  }
  const ex = Number(paramsOf(n).expand);
  const expand = Number.isFinite(ex) ? Math.min(6, Math.max(0, Math.round(ex))) : 2;
  if(paramsOf(n).fmt !== false){
    t.appendChild(jcBuild(val, 0, expand, true));
  } else {                                              /* fmt=false：紧凑原文（无缩进单段） */
    const fb = document.createElement('div'); fb.className = 'node-jtree-fallback';
    let compact = '';
    try { compact = JSON.stringify(val) ?? String(val); } catch { compact = String(val); }
    fb.textContent = compact;
    t.appendChild(fb);
  }
  measurePorts(); updateEdgesOf([id]);
};
let jcPending = null;  /* output 事件归属 = 最近 node:start 的 jsoncanvas 节点
  （events.ts:25 output 无 id；引擎顺序执行 engine.ts:136-142 保证唯一在途） */
const jsonConsume = ev => {
  if(ev.type === 'node:start'){
    const n = nodeById(ev.id);
    jcPending = (n && n.type === 'jsoncanvas') ? ev.id : null;
    return;
  }
  if(ev.type === 'output'){
    if(jcPending != null) jcRender(jcPending, ev.text);  /* 真实运行权威全文通道（§1 裁示） */
    return;
  }
  /* node:done：本节点 done → 清归属 + 树空时以 out 兜底（模拟执行/降级路径）；
     上游 done → 零操作（真实运行树数据源 = 本节点 handler 的 output 全文，非上游摘要） */
  const n = nodeById(ev.id);
  if(!n || n.type !== 'jsoncanvas') return;
  jcPending = null;
  const t = nodeEl(ev.id)?.querySelector('.node-jtree');
  if(!t || !t.firstChild) jcRender(ev.id, ev.out);
};

async function runWorkflow(){
  if(running) return;
  if(!state.nodes.length){ toast('画布为空，请先添加节点','warn'); return; }
  if(ENGINE.online){
    try{ await runReal(); return; }
    catch(err){ addLog(`⚠ 后端执行异常：${esc(err.message||String(err))} · 回退到模拟执行`,'warn'); toast('后端异常 · 已回退模拟','warn'); }
  }
  await runSimulated();
}
async function runSimulated(){
  if(running) return;
  if(!state.nodes.length){ toast('画布为空，请先添加节点','warn'); return; }
  running = true; stopFlag = false;
  document.body.classList.add('running');
  clearSel();
  state.nodes.forEach(n=>{ const el=nodeEl(n.id); el&&el.classList.remove('st-running','st-done','st-error'); });
  state.nodes.forEach(n=>{ const el=nodeEl(n.id); el&&el.querySelector('.node-out')&&(el.querySelector('.node-out').textContent=''); });
  measurePorts(); renderEdges();

  const order = topoOrder();
  if(order.length < state.nodes.length) addLog(`⚠ 检测到 ${state.nodes.length-order.length} 个节点不在执行路径上（可能存在环）`,'warn');
  addLog(`━━ 开始运行「${esc(state.name)}」 · ${order.length} 个节点待执行 ━━`,'sys');

  const branch = {};
  const isCond = t=>t==='condition';
  const roots = order.filter(id=>!state.edges.some(e=>e.tn===id));
  const startIds = roots.length?roots:[order[0]].filter(Boolean);
  const reach = new Set(); const stack=[...startIds];
  while(stack.length){
    const id = stack.pop();
    if(reach.has(id)) continue; reach.add(id);
    const n = nodeById(id); if(!n) continue;
    state.edges.filter(e=>e.fn===id).forEach(e=>{
      if(isCond(n.type)){
        if(branch[id]===undefined) branch[id] = Math.random()<0.72 ? 0 : 1;
        if(e.fp===branch[id]) stack.push(e.tn);
      } else stack.push(e.tn);
    });
  }
  const speed = settings.speed||1;
  const t0 = performance.now();
  let doneCount = 0;
  const progTxt = $('#float-prog-txt');
  const progBar = $('#float-bar i');
  progBar.style.width = '0%';
  const timer = setInterval(()=>{
    const el = (performance.now()-t0)/1000;
    progTxt.innerHTML = `<b>${doneCount}/${reach.size}</b> · ${el.toFixed(1)}s`;
    progBar.style.width = (doneCount/Math.max(1,reach.size)*100)+'%';
  }, 100);

  for(const id of order){
    if(stopFlag) break;
    const n = nodeById(id);
    if(!n || !reach.has(id)) continue;
    const def = defOf(n), meta = RUN_META[n.type]||{dur:600,out:()=>'完成'};
    const title = esc(n.title||def.name);
    const el = nodeEl(id);
    if(n.bypass){
      el.classList.add('st-done');
      setNodeOut(id,'已旁路跳过');
      flashEdges(state.edges.filter(e=>e.tn===id).map(e=>e.id));
      doneCount++;
      addLog(`⏸ ${title} · 已旁路，跳过执行`,'warn');
      continue;
    }
    el.classList.add('st-running');
    measurePorts(); updateEdgesOf([id]);
    flashEdges(state.edges.filter(e=>e.tn===id).map(e=>e.id));
    addLog(`▶ ${title} · ${def.name} <span style="color:var(--text3)">#${id}</span>`);
    const bar = el.querySelector('.node-progress i');
    const dur = meta.dur/speed;
    bar.style.transition='none'; bar.style.width='0%'; void bar.offsetWidth;
    bar.style.transition=`width ${dur}ms linear`; bar.style.width='100%';

    let outText = '';
    if(n.type==='llm'){
      const full = meta.out(n); let i=0;
      const tw = setInterval(()=>{
        if(stopFlag){ clearInterval(tw); return; }
        i = Math.min(full.length, i+3);
        setNodeOut(id, full.slice(0,i)+'▌');
      }, Math.max(20, dur/full.length*3));
      await cancellableSleep(dur);
      clearInterval(tw);
      outText = full;
    } else {
      await cancellableSleep(dur*(0.85+Math.random()*0.3));
      outText = meta.out(n);
    }
    if(n.type==='condition'){
      const choice = branch[id]===0?'真':'假';
      outText = String(outText).replace('{结果}',choice);
      addLog(`↳ ${title} · ${esc(paramsOf(n).expr||'条件')} → <b style="color:#22d3ee">${choice}</b>`,'sys');
    }
    el.classList.remove('st-running');
    if(stopFlag){ el.classList.add('st-error'); setNodeOut(id,'已中止'); measurePorts(); updateEdgesOf([id]); continue; }
    el.classList.add('st-done');
    if(n.type==='termview'){ termConsume({id,type:'node:delta',text:outText}); termConsume({id,type:'node:done'}); }
    if(n.type==='jsoncanvas'){ jsonConsume({id, type:'node:done', out: outText}); }
    setNodeOut(id, outText);
    measurePorts(); updateEdgesOf([id]);
    flashEdges(state.edges.filter(e=>e.fn===id&&(isCond(n.type)?e.fp===branch[id]:true)).map(e=>e.id));
    doneCount++;
    if(n.type==='llm'){
      const c = capSummary(n);
      const capsTxt = (c.servers?` · MCP ${c.servers} 服务/${c.tools} 工具`:'')+(c.skills?` · 技能 ${c.skills}`:'');
      addLog(`✓ ${title} · 生成 248 tokens${capsTxt} · ${(dur/1000).toFixed(1)}s`,'ok');
    }
    else addLog(`✓ ${title} · ${esc(String(outText).slice(0,44))}${String(outText).length>44?'…':''}`,'ok');
  }
  clearInterval(timer);
  document.body.classList.remove('running');
  const total = ((performance.now()-t0)/1000).toFixed(1);
  if(stopFlag){
    addLog(`■ 运行已停止 · 已完成 ${doneCount} 个节点 · ${total}s`,'warn');
    toast('运行已停止','warn');
    runs.unshift({name:state.name, time:now(), dur:total+'s', nodes:doneCount, ok:false});
  } else {
    addLog(`● 运行完成 · ${doneCount}/${reach.size} 个节点执行 · 总耗时 ${total}s`,'ok');
    toast(`运行完成 · ${total}s`,'ok');
    runs.unshift({name:state.name, time:now(), dur:total+'s', nodes:doneCount, ok:true});
  }
  if(runs.length>50) runs.length=50;
  saveLocal();
  if(railTab==='history') renderSidebar();
  running = false; stopFlag = false;
}
async function cancellableSleep(ms){
  const step = 60; let waited = 0;
  while(waited<ms){ if(stopFlag&&waited>300) return; await sleep(Math.min(step,ms-waited)); waited+=step; }
}

/* ================================================================
 *  真实执行后端（Vercel AI SDK 7 · SSE 事件驱动）
 *  · 在线：POST /api/run 提交工作流，事件流驱动与模拟执行完全相同
 *    的视觉语言（st-running/st-done/st-error、连线流动、打字机、进度）
 *  · 离线（双击打开 / 后端未启动）：自动使用上方模拟执行
 * ================================================================ */
const ENGINE = { online:false, info:null, runId:null, ac:null };

ENGINE.probe = async ()=>{
  if(location.protocol === 'file:'){ ENGINE.online = false; return; }
  try{
    const r = await fetch('/api/health', {signal:AbortSignal.timeout(2500)});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    ENGINE.online = true; ENGINE.info = j;
    const prov = j.provider||{};
    addLog(`⚡ 执行后端已连接 · Vercel AI SDK 7 · Node ${esc(j.node||'')} · ${esc(prov.note||'')}`,'sys');
    if(Array.isArray(prov.models) && prov.models.length){
      DEFS.llm.params[0].o = prov.models.map(m=>m.name);
      const selIds = [...sel.nodes];
      const selNode = selIds.length===1 ? nodeById(selIds[0]) : null;
      if(selNode && selNode.type==='llm' && !prov.models.some(m=>m.name===paramsOf(selNode).model)) renderProps();
    }
  }catch(_){ ENGINE.online = false; }
  /* probe 结果落定后刷新已打开的面板：settings（现状）+ workflows/history（ADR-0006：
     面板内容依赖 ENGINE.online，启动早期打开的面板需从离线态刷新） */
  if(railTab==='settings'||railTab==='workflows'||railTab==='history') renderSidebar();
};

ENGINE.cancelRun = ()=>{
  stopFlag = true;
  if(ENGINE.ac){ try{ ENGINE.ac.abort(); }catch(_){} }
  if(ENGINE.runId){ fetch('/api/run/'+ENGINE.runId+'/stop', {method:'POST'}).catch(()=>{}); }
};

async function runReal(){
  running = true; stopFlag = false;
  lastRunData.clear(); lastRunVars = null;
  document.body.classList.add('running');
  clearSel();
  state.nodes.forEach(n=>{ const el=nodeEl(n.id); el&&el.classList.remove('st-running','st-done','st-error'); });
  state.nodes.forEach(n=>{ const el=nodeEl(n.id); el&&el.querySelector('.node-out')&&(el.querySelector('.node-out').textContent=''); });
  measurePorts(); renderEdges();

  const progTxt = $('#float-prog-txt'), progBar = $('#float-bar i');
  progBar.style.width = '0%';
  let rDone = 0, rTotal = state.nodes.length, finalized = false;
  const t0 = performance.now();
  const timer = setInterval(()=>{
    const el = (performance.now()-t0)/1000;
    progTxt.innerHTML = `<b>${rDone}/${rTotal}</b> · ${el.toFixed(1)}s`;
    progBar.style.width = (rDone/Math.max(1,rTotal)*100)+'%';
  }, 100);

  const finalize = (ok, stopped)=>{
    if(finalized) return; finalized = true;
    clearInterval(timer);
    document.body.classList.remove('running');
    const total = ((performance.now()-t0)/1000).toFixed(1);
    if(stopped){
      addLog(`■ 运行已停止 · 已完成 ${rDone} 个节点 · ${total}s`,'warn');
      toast('运行已停止','warn');
      runs.unshift({name:state.name, time:now(), dur:total+'s', nodes:rDone, ok:false});
    } else if(ok){
      addLog(`● 运行完成 · ${rDone}/${rTotal} 个节点执行 · 总耗时 ${total}s`,'ok');
      toast(`运行完成 · ${total}s`,'ok');
      runs.unshift({name:state.name, time:now(), dur:total+'s', nodes:rDone, ok:true});
    } else {
      addLog(`■ 运行失败 · 已完成 ${rDone} 个节点 · ${total}s`,'warn');
      toast('运行失败（详见日志）','warn');
      runs.unshift({name:state.name, time:now(), dur:total+'s', nodes:rDone, ok:false});
    }
    if(runs.length>50) runs.length=50;
    saveLocal();
    if(railTab==='history') renderSidebar();
    $('#approve-modal').classList.remove('show');
    running = false; stopFlag = false; ENGINE.runId = null; ENGINE.ac = null;
    updateNodeToolbox();
  };

  /* ---- 事件 → 画布渲染（与模拟执行同一套视觉语言） ---- */
  const barStart = el=>{
    const bar = el.querySelector('.node-progress i');
    bar.style.transition='none'; bar.style.width='0%'; void bar.offsetWidth;
    bar.style.transition='width 30s linear'; bar.style.width='96%';
  };
  const barDone = el=>{ const bar = el.querySelector('.node-progress i');
    bar.style.transition='width .2s ease'; bar.style.width='100%'; };

  const refreshPropsIfIdle = id=>{
    /* 用户正在属性面板输入时不打断焦点 */
    const focused = document.activeElement && $('#props').contains(document.activeElement);
    if(!focused && sel.nodes.size===1 && (id===undefined || sel.nodes.has(id))) renderProps();
  };

  const onEvent = ev=>{
    /* termview 消费钩子（BK-0037）：delta/done/error 三事件旁路进呈现区；
       既有 case 语义零触碰——.node-out 摘要行为保持原样（容器纪律） */
    if(ev.type==='node:delta'||ev.type==='node:done'||ev.type==='node:error') termConsume(ev);
    /* jsoncanvas 消费钩子（BK-0038）：start 归属 / output 全文 / done 兜底三旁路；
       既有 case 语义零触碰——.node-out 摘要行为保持原样（容器纪律） */
    if(ev.type==='node:start'||ev.type==='node:done'||ev.type==='output') jsonConsume(ev);
    switch(ev.type){
      case 'run:accepted': ENGINE.runId = ev.runId; break;
      case 'run:start':
        rTotal = ev.total||rTotal;
        addLog(`━━ 开始运行「${esc(state.name)}」 · ${rTotal} 个节点待执行 ━━`,'sys');
        break;
      case 'run:progress': rDone = ev.done??rDone; rTotal = Math.max(ev.total??rTotal, rDone); break;
      case 'node:start': {
        const el = nodeEl(ev.id); if(!el) break;
        el.classList.remove('st-done','st-error'); el.classList.add('st-running');
        measurePorts(); updateEdgesOf([ev.id]);
        flashEdges(state.edges.filter(e=>e.tn===ev.id).map(e=>e.id));
        addLog(`▶ ${esc(ev.title)} · ${esc(ev.defName||'')} <span style="color:var(--text3)">#${ev.id}${ev.iteration?` · 迭代${ev.iteration}`:''}</span>`);
        barStart(el);
        break;
      }
      case 'node:bypass': {
        const el = nodeEl(ev.id); if(!el) break;
        el.classList.remove('st-running'); el.classList.add('st-done');
        setNodeOut(ev.id, '已旁路跳过');
        flashEdges(state.edges.filter(e=>e.tn===ev.id).map(e=>e.id));
        addLog(`⏸ ${esc(ev.title)} · 已旁路，跳过执行`,'warn');
        break;
      }
      case 'node:delta': {
        const t = String(ev.text||'');
        setNodeOut(ev.id, (t.length>160?t.slice(0,160):t)+'▌');
        break;
      }
      case 'node:done': {
        const el = nodeEl(ev.id); if(!el) break;
        el.classList.remove('st-running'); el.classList.add('st-done');
        setNodeOut(ev.id, ev.out!=null?String(ev.out):'完成');
        if(nodeById(ev.id)?.type==='webshow') setNodeWebshow(ev.id, ev);
        barDone(el);
        measurePorts(); updateEdgesOf([ev.id]);
        const n = nodeById(ev.id);
        flashEdges(state.edges.filter(e=>e.fn===ev.id&&(n&&n.type==='condition'?e.fp===ev.firePort:true)).map(e=>e.id));
        if(!n || n.type!=='llm'){   /* LLM 的 ✓ 日志由后端带 tokens 统计先行输出 */
          const s = String(ev.out!=null?ev.out:'');
          addLog(`✓ ${esc(ev.title)} · ${esc(s.slice(0,44))}${s.length>44?'…':''}`,'ok');
        }
        /* ② 运行数据：记录该节点各输入端口的实际到达值并刷新面板 */
        lastRunData.set(ev.id, { inputs: Array.isArray(ev.inputs)?ev.inputs:[], out: ev.out!=null?String(ev.out):'' });
        refreshPropsIfIdle(ev.id);
        break;
      }
      case 'node:error': {
        const el = nodeEl(ev.id); if(!el) break;
        el.classList.remove('st-running'); el.classList.add('st-error');
        setNodeOut(ev.id, '执行失败 · '+String(ev.message||'').slice(0,120));
        barDone(el);
        measurePorts(); updateEdgesOf([ev.id]);
        addLog(`✗ ${esc(ev.title)} · <span style="color:var(--warn)">${esc(String(ev.message||'').slice(0,90))}</span>`,'warn');
        break;
      }
      case 'cond':
        addLog(`↳ ${esc(ev.title)} · ${esc(ev.expr||'条件')} → <b style="color:#22d3ee">${ev.branch}</b>`,'sys');
        break;
      case 'log': addLog(ev.msg||'', ev.lvl||'info'); break;
      case 'output': {
        const s = String(ev.text||'');
        addLog(`◉ 最终输出：${esc(s.slice(0,100))}${s.length>100?'…':''}`,'ok');
        break;
      }
      case 'approval:required': {
        $('#approve-info').innerHTML =
          `工作流在 <b style="color:var(--text)">${esc(ev.title)}</b> 处等待人工审批<br>`+
          `审批人：${esc(ev.role||'-')} · 运行 #${esc(String(ev.runId||'').slice(0,8))}<br>`+
          `<div style="margin-top:6px;padding:8px 10px;background:rgba(0,0,0,.35);border-left:2px solid var(--accent);color:var(--text2);word-break:break-all">${esc(ev.inputPreview||'(无输入预览)')}</div>`;
        $('#approve-ok').disabled = false; $('#approve-reject').disabled = false;
        $('#approve-modal').classList.add('show');
        $('#approve-ok').onclick = ()=>sendApproval(ev, true);
        $('#approve-reject').onclick = ()=>sendApproval(ev, false);
        addLog(`⏳ ${esc(ev.title)} · 等待人工审批（弹窗中通过 / 拒绝）`,'sys');
        break;
      }
      case 'approval:done':
        $('#approve-modal').classList.remove('show');
        addLog(`👤 审批已${ev.approve?'通过':'拒绝'}`,'sys');
        break;
      case 'run:error':
        addLog(`✗ 引擎错误：${esc(String(ev.message||'').slice(0,140))}`,'warn');
        break;
      case 'run:done':
        rDone = ev.done??rDone; rTotal = Math.max(ev.total??rTotal, rDone);
        if(ev.vars) lastRunVars = ev.vars;   /* ③ 变量表快照 → 可用变量提示 */
        refreshPropsIfIdle();
        progBar.style.width = '100%';
        finalize(ev.ok!==false && !ev.stopped, !!ev.stopped);
        break;
    }
  };
  const sendApproval = (ev, approve)=>{
    $('#approve-ok').disabled = true; $('#approve-reject').disabled = true;
    fetch(`/api/run/${ev.runId}/approve`, {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({nodeId:ev.nodeId, approve})})
      .then(()=>{ if(!approve) $('#approve-modal').classList.remove('show'); })
      .catch(()=>{ $('#approve-ok').disabled = false; $('#approve-reject').disabled = false; });
  };

  /* ---- 提交并消费 SSE ---- */
  ENGINE.ac = new AbortController();
  let accepted = false;
  try{
    const resp = await fetch('/api/run', {
      method:'POST', headers:{'Content-Type':'application/json'}, signal: ENGINE.ac.signal,
      body: JSON.stringify({name:state.name, nodes:state.nodes, edges:state.edges, inputs:{}}),
    });
    if(!resp.ok || !resp.body) throw new Error('后端返回 HTTP '+resp.status);
    const reader = resp.body.getReader();
    const dec = new TextDecoder(); let buf = '';
    for(;;){
      const {done, value} = await reader.read();
      if(done) break;
      buf += dec.decode(value, {stream:true});
      let idx;
      while((idx = buf.indexOf('\n\n')) >= 0){
        const chunk = buf.slice(0, idx); buf = buf.slice(idx+2);
        const line = chunk.split('\n').find(l=>l.startsWith('data: '));
        if(!line) continue;
        let ev; try{ ev = JSON.parse(line.slice(6)); }catch(_){ continue; }
        if(ev.type==='run:accepted') accepted = true;
        onEvent(ev);
      }
    }
    if(!finalized) finalize(true, stopFlag);   /* 流正常结束但未收到 run:done */
  }catch(err){
    if(!accepted) throw err;                    /* 启动失败 → 上层回退模拟 */
    finalize(false, stopFlag || err.name==='AbortError');  /* 中途断流 → 按中断收尾 */
    if(!stopFlag && err.name!=='AbortError')
      addLog(`⚠ 与执行后端的连接中断：${esc(err.message||String(err))}`,'warn');
  }
}

/* ================================================================
 *  键盘快捷键
 * ================================================================ */
window.addEventListener('keydown', e=>{
  const inInput = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable;
  if(e.key==='Escape'){
    if($('#search-modal').classList.contains('show')) return closeSearch();
    if($('#help-modal').classList.contains('show')) return $('#help-modal').classList.remove('show');
    if($('#confirm-modal') && $('#confirm-modal').classList.contains('show')) return closeConfirm(false);
    if($('#ctxmenu').classList.contains('show')) return $('#ctxmenu').classList.remove('show');
    if(dragCtx&&dragCtx.mode==='link'){ ghost.style.display='none'; dragCtx=null; document.body.classList.remove('linking'); nodesLayer.querySelectorAll('.port').forEach(p=>p.classList.remove('compat')); }
    clearSel(); return;
  }
  if(inInput) return;
  const mod = e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); }
  else if(mod&&e.key.toLowerCase()==='y'){ e.preventDefault(); redo(); }
  else if(mod&&e.key.toLowerCase()==='c'){ copySel(); if(sel.nodes.size) toast('已复制 '+sel.nodes.size+' 个节点'); }
  else if(mod&&e.key.toLowerCase()==='v'){ pasteSel(); }
  else if(mod&&e.key.toLowerCase()==='a'){ e.preventDefault(); selectAll(); }
  else if(mod&&e.key.toLowerCase()==='s'){ e.preventDefault(); saveLocal(); toast('已保存到浏览器本地存储','ok'); }
  else if(mod&&e.key.toLowerCase()==='t'){ e.preventDefault(); newTab(); }
  else if(e.key==='Delete'||e.key==='Backspace'){ if(sel.nodes.size||sel.edges.size){ e.preventDefault(); pushUndo();[...sel.edges].forEach(removeEdge);[...sel.nodes].forEach(removeNode);clearSel();renderProps();renderMinimap(); } }
  else if(e.key==='Home'){ fitView(); }
  else if(e.key==='0'){ zoomAt(1/view.scale); }
  else if(e.key==='='||e.key==='+'){ zoomAt(1.2); }
  else if(e.key==='-'){ zoomAt(1/1.2); }
});

/* ================================================================
 *  深化交互：数字拖动调节 / 标题重命名 / 坐标信息
 * ================================================================ */

/* 数字输入步进按钮（▲/▼）：单击步进一次，按住 420ms 后连续步进 */
function numStep(input, dir){
  const step = Number(input.step)||1;
  const min = input.min!==''?Number(input.min):-1e9;
  const max = input.max!==''?Number(input.max):1e9;
  const dec = (String(input.step).split('.')[1]||'').length;
  let v = (Number(input.value)||0) + dir*step;
  v = clamp(v, min, max);
  input.value = dec ? v.toFixed(dec) : String(Math.round(v*1e6)/1e6);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}
let nspinTimer=null, nspinDelay=null;
const nspinStop = ()=>{ clearTimeout(nspinDelay); clearInterval(nspinTimer); nspinDelay=nspinTimer=null; };
document.addEventListener('pointerdown', e=>{
  const btn = e.target.closest('.nspin'); if(!btn) return;
  e.preventDefault();
  const input = btn.closest('.numwrap')?.querySelector('input[type=number]');
  if(!input || input.disabled) return;
  const nodeEl = btn.closest('.node');   /* 点击步进按钮同样确保节点选中 */
  if(nodeEl && !sel.nodes.has(+nodeEl.dataset.id)) selectNode(+nodeEl.dataset.id, e.shiftKey);
  const dir = Number(btn.dataset.dir)||1;
  numStep(input, dir);
  nspinDelay = setTimeout(()=>{ nspinTimer = setInterval(()=>numStep(input,dir), 70); }, 420);
});
document.addEventListener('pointerup', nspinStop);
document.addEventListener('pointercancel', nspinStop);

/* 数字参数：拖动 label 左右调节（ComfyUI widget 行为） */
document.addEventListener('mousedown', e=>{
  const lbl = e.target.closest('.drag-num'); if(!lbl) return;
  const box = lbl.closest('.wdg,.prow'); if(!box) return;
  const input = box.querySelector('input[type=number]'); if(!input||input.disabled) return;
  e.preventDefault();
  const sx = e.clientX, sv = Number(input.value)||0;
  const step = Number(input.step)||1;
  const min = input.min!==''?Number(input.min):-1e9, max = input.max!==''?Number(input.max):1e9;
  let moved = false;
  const mv = ev=>{
    const d = ev.clientX - sx;
    if(!moved && Math.abs(d)>3){ moved = true; input.classList.add('num-dragging'); }
    if(!moved) return;
    input.value = clamp(sv + Math.round(d/6)*step, min, max);
  };
  const up = ()=>{
    window.removeEventListener('mousemove',mv); window.removeEventListener('mouseup',up);
    input.classList.remove('num-dragging');
    if(moved) input.dispatchEvent(new Event('change',{bubbles:true}));
  };
  window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
});

/* 双击节点标题 → 内联重命名 */
nodesLayer.addEventListener('dblclick', e=>{
  const titleEl = e.target.closest('.ntitle'); if(!titleEl) return;
  const nodeEl = titleEl.closest('.node'); const n = nodeById(+nodeEl.dataset.id); if(!n) return;
  const old = n.title||defOf(n).name;
  titleEl.innerHTML = `<input value="${esc(old)}" spellcheck="false">`;
  const inp = titleEl.querySelector('input');
  inp.focus(); inp.select();
  let done = false;
  const commit = ()=>{
    if(done) return; done = true;
    const v = inp.value.trim()||old;
    if(v!==old){ pushUndo(); n.title = v; }
    titleEl.textContent = v;
    saveLocal();
    if(sel.nodes.size===1 && sel.nodes.has(n.id)) renderProps();
  };
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', ev=>{
    ev.stopPropagation();
    if(ev.key==='Enter') commit();
    else if(ev.key==='Escape'){ inp.value = old; commit(); }
  });
});

/* 画布坐标信息（仿 CanvasInfo） */
let mmXY = null, mmTick = false;
viewport.addEventListener('mousemove', e=>{
  mmXY = toWorld(e.clientX, e.clientY);
  if(mmTick) return; mmTick = true;
  requestAnimationFrame(()=>{
    mmTick = false;
    if(!mmXY) return;
    $('#canvas-stats').textContent =
      `x ${Math.round(mmXY.x)} · y ${Math.round(mmXY.y)} · 节点 ${state.nodes.length} · 连线 ${state.edges.length} · ${Math.round(view.scale*100)}%`;
  });
});

/* ================================================================
 *  初始化
 * ================================================================ */
(function init(){
  // 静态按钮注入 SVG 图标
  $('#side-close').innerHTML = I('x');
  $('#tab-new').innerHTML = I('plus');
  $('#float-run').innerHTML = I('play')+'<span>运行</span>';
  $('#float-stop').innerHTML = I('stop')+'<span>停止</span>';
  document.querySelector('#empty-hint .big').innerHTML = I('workflow');
  $('#ntb-del').innerHTML = I('trash');
  $('#ntb-info').innerHTML = I('info');
  $('#ntb-bypass').innerHTML = I('pause');
  $('#ntb-refresh').innerHTML = I('rotate');
  $('#ntb-exec').innerHTML = I('play');
  $('#ntb-more').innerHTML = I('dots');
  let fresh = false;
  if(!loadLocal()){
    fresh = true;
    const s = SAMPLES.kefu;
    tabs = [{ name:s.name,
      nodes: s.nodes.map(n=>({...n, params:{...(n.params||{})}})),
      edges: s.edges.map(e=>({...e})),
      nextId: Math.max(...s.nodes.map(n=>n.id))+1, view:null }];
    activeTab = 0;
    state = {name:s.name, nodes:tabs[0].nodes, edges:tabs[0].edges, nextId:tabs[0].nextId};
    view = {x:60,y:40,scale:1};
  }
  renderTabsBar();
  applyView();
  renderAll();
  ENGINE.probe();   /* 异步探测后端；成功后追加连接日志并刷新模型下拉 */
  refreshCaps();    /* 能力清单：fire-and-forget，失败静默保持回退集（ADR-0018 §6） */
  refreshKbs();     /* kb 清单：fire-and-forget，失败静默保持回退集（BK-0047 / ADR-0021） */
  if(fresh){ try{ fitView(); renderAll(); }catch(e){ console.error(e); } }
  if(fresh) addLog('欢迎使用 AgentFlow · 点击画布顶部「▶ 运行」开始执行','sys');
})();

/* ================================================================
 *  goal 会话面板（BK-0034 / 迭代 0032 修宪轮 · ADR-0013 §4 入口案 B）
 *  动态单例 #goal-panel（默认不可见 → s0~s8 零波及）；入口 = agent 节点主体
 *  双击（排除 .ntitle 重命名 / .wdg 输入 / .port）；会话绑定 = 同名恢复优先、
 *  无则新建（GOAL_BIND 运行时表，不入 localStorage/undo）；SSE turn 恰消费
 *  7 种既有事件（ADR-0013 §5.2 语义逐条），零新增契约（§5.3 护栏）。
 * ================================================================ */
const GOAL_BIND = new Map();                    /* nodeId → sessionId（运行时绑定） */
const GOAL = { nodeId:null, sid:null, turning:false };

function goalEnsure(){
  let p = $('#goal-panel');
  if(p) return p;
  p = document.createElement('div');
  p.id = 'goal-panel';
  p.innerHTML = `
    <div class="gp-head">
      <span class="gp-title"></span>
      <span class="gp-status"></span>
      <button class="ibtn" data-gp="list" title="历史会话">${I('book-open')}</button>
      <button class="ibtn" data-gp="close" title="关闭">${I('x')}</button>
    </div>
    <div class="gp-stream"></div>
    <div class="gp-list"></div>
    <div class="gp-input">
      <textarea spellcheck="false" placeholder="向智能体输入本轮目标…（Enter 发送 / Shift+Enter 换行）"></textarea>
      <button class="gp-send">发送</button>
      <button class="gp-stop">停止</button>
    </div>`;
  document.body.appendChild(p);
  p.querySelector('[data-gp="close"]').addEventListener('click', ()=>p.classList.remove('show'));
  p.querySelector('[data-gp="list"]').addEventListener('click', ()=>goalToggleList());
  p.querySelector('.gp-send').addEventListener('click', ()=>goalSendTurn());
  p.querySelector('.gp-stop').addEventListener('click', ()=>goalStopTurn());
  p.querySelector('textarea').addEventListener('keydown', ev=>{
    ev.stopPropagation();
    if(ev.key==='Enter' && !ev.shiftKey){ ev.preventDefault(); goalSendTurn(); }
  });
  return p;
}
function goalStream(){ return $('#goal-panel .gp-stream'); }
function goalScroll(){ const s = goalStream(); if(s) s.scrollTop = s.scrollHeight; }
function goalAddMsg(role, text){
  const d = document.createElement('div');
  d.className = 'gp-msg ' + role;
  d.textContent = text;
  goalStream().appendChild(d); goalScroll();
  return d;
}
function goalAddSys(text){
  const d = document.createElement('div');
  d.className = 'gp-sys'; d.textContent = text;
  goalStream().appendChild(d); goalScroll();
  return d;
}
function goalSetTurning(on){
  GOAL.turning = on;
  const p = $('#goal-panel'); if(!p) return;
  p.classList.toggle('turning', on);
  p.querySelector('textarea').disabled = on;
  p.querySelector('.gp-status').textContent = on ? '生成中…' : '';
}
/* 入口：agent 节点主体双击（再次双击同节点 = 收起）；.ntitle 重命名 / .wdg 输入 /
 * .port 连线手势零触碰（既有 :2353/:1580 分支行为不变） */
nodesLayer.addEventListener('dblclick', e=>{
  const nodeEl = e.target.closest('.node'); if(!nodeEl) return;
  if(e.target.closest('.ntitle') || e.target.closest('.wdg') || e.target.closest('.port')) return;
  const n = nodeById(+nodeEl.dataset.id);
  if(!n || n.type !== 'agent') return;
  const p = $('#goal-panel');
  if(p && p.classList.contains('show') && GOAL.nodeId === n.id){ p.classList.remove('show'); return; }
  openGoalPanel(n);
});
async function openGoalPanel(n){
  const p = goalEnsure();
  GOAL.nodeId = n.id;
  p.classList.add('show');
  p.classList.remove('gp-mode-list');
  p.querySelector('.gp-title').textContent = n.title || defOf(n).name;
  const stream = goalStream();
  stream.innerHTML = '';
  goalAddSys('正在连接会话…');
  try{
    let sid = GOAL_BIND.get(n.id);
    if(!sid){
      await refreshSessions();
      const hit = (SVR.sessions || []).find(s => s.title === (n.title || defOf(n).name));
      if(hit) sid = hit.id;                    /* 同名恢复优先（服务端持久会话） */
      else{
        const ps = paramsOf(n);
        sid = (await createSessionOnServer({ title:n.title||defOf(n).name, model:ps.model, sys:ps.sys })).id;
      }
      GOAL_BIND.set(n.id, sid);
    }
    GOAL.sid = sid;
    const d = await fetchSessionDetail(sid);
    stream.innerHTML = '';
    const msgs = Array.isArray(d.messages) ? d.messages : [];
    if(!msgs.length) goalAddSys('暂无消息 · 在下方输入目标开始');
    msgs.forEach(m => goalAddMsg(m.role === 'assistant' ? 'assistant' : 'user', m.text));
  }catch(err){
    stream.innerHTML = '';
    GOAL.sid = null;
    goalAddSys('后端不可达或会话不存在（' + String(err && err.message || err).slice(0,60) + '）');
  }
}
/* 续聊：POST chat SSE 流式消费——恰 7 种事件（ADR-0013 §5.2 表逐条）；
 * stopped=true 时服务端不发 node:done（部分文本已落库），以末次 delta 累积全文固化 */
async function goalSendTurn(){
  if(GOAL.turning || !GOAL.sid) return;
  const p = $('#goal-panel'); if(!p) return;
  const ta = p.querySelector('textarea');
  const text = ta.value.trim();
  if(!text) return;
  ta.value = '';
  goalAddMsg('user', text);
  goalSetTurning(true);
  let bubble = null, lastText = '', accepted = false, finalized = false;
  const finish = stopped => {
    if(finalized) return; finalized = true;
    goalSetTurning(false);
    if(stopped && bubble){
      bubble.textContent = lastText || '（已停止，无输出）';
      const foot = document.createElement('span');
      foot.className = 'gp-foot'; foot.textContent = '已停止';
      bubble.appendChild(foot); goalScroll();
    }
  };
  try{
    const resp = await fetch('/api/v1/sessions/' + encodeURIComponent(GOAL.sid) + '/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text }),
    });
    if(resp.status === 409){ goalAddSys('回复进行中，请稍候'); goalSetTurning(false); return; }
    if(!resp.ok || !resp.body) throw new Error('HTTP ' + resp.status);
    const reader = resp.body.getReader();
    const dec = new TextDecoder(); let buf = '';
    for(;;){
      const {done, value} = await reader.read();
      if(done) break;
      buf += dec.decode(value, {stream:true});
      let idx;
      while((idx = buf.indexOf('\n\n')) >= 0){
        const chunk = buf.slice(0, idx); buf = buf.slice(idx+2);
        const line = chunk.split('\n').find(l=>l.startsWith('data: '));
        if(!line) continue;
        let ev; try{ ev = JSON.parse(line.slice(6)); }catch(_){ continue; }
        switch(ev.type){
          case 'run:accepted': accepted = true; break;            /* turn 边界：不渲染日志行 */
          case 'node:start':  bubble = goalAddMsg('assistant', ''); break;
          case 'node:delta':                                        /* 累积全文，覆盖式渲染 */
            lastText = String(ev.text || '');
            if(!bubble) bubble = goalAddMsg('assistant', '');
            bubble.textContent = lastText; goalScroll();
            break;
          case 'node:done': {                                       /* 定稿 + tokens/耗时脚注 */
            const t = String(ev.out != null ? ev.out : lastText);
            if(!bubble) bubble = goalAddMsg('assistant', '');
            bubble.textContent = t;
            const foot = document.createElement('span');
            foot.className = 'gp-foot';
            foot.textContent = (ev.tokens != null ? ev.tokens + ' tokens · ' : '') + ((Number(ev.ms)||0)/1000).toFixed(1) + 's';
            bubble.appendChild(foot); goalScroll();
            break;
          }
          case 'log':        goalAddSys(ev.msg || ''); break;       /* ⚠/🔧/✓ 系统行 */
          case 'run:error':  goalAddSys('✗ ' + String(ev.message||'').slice(0,120)); break;
          case 'run:done':   finish(!!ev.stopped); break;           /* stopped → 末次 delta 固化 */
          default: break;                                           /* 其余 8 种 turn 流不发射 */
        }
      }
    }
    finish(false);   /* 流正常结束但未收到 run:done（服务端异常断开兜底） */
  }catch(err){
    if(!accepted) goalAddSys('发送失败（' + String(err && err.message || err).slice(0,60) + '）');
    finish(false);
  }
}
/* 停止：服务端中止（POST stop）；404 = 无活动 turn 的兜底语义（ADR §5.1） */
async function goalStopTurn(){
  if(!GOAL.turning || !GOAL.sid) return;
  try{
    await stopSessionOnServer(GOAL.sid);
  }catch(err){
    if(String(err && err.message || '').includes('404')) goalAddSys('当前无进行中回复');
    /* 其余失败不阻断：turn 仍由 run:done 收尾 */
  }
}
/* 恢复列表：GET sessions（limit 20）→ 点击回放详情并绑定为当前会话 */
async function goalToggleList(){
  const p = $('#goal-panel'); if(!p) return;
  if(!p.classList.contains('gp-mode-list')){
    const list = p.querySelector('.gp-list');
    list.innerHTML = '<div class="gp-empty">加载中…</div>';
    p.classList.add('gp-mode-list');
    await refreshSessions();
    list.innerHTML = '';
    if(SVR.sessionsErr || !SVR.sessions || !SVR.sessions.length){
      list.innerHTML = '<div class="gp-empty">' + (SVR.sessionsErr ? '会话列表拉取失败' : '暂无历史会话') + '</div>';
      return;
    }
    SVR.sessions.forEach(s=>{
      const it = document.createElement('div');
      it.className = 'gp-item';
      it.innerHTML = '<b>' + esc(s.title || '未命名会话') + '</b><br><span class="gp-item-meta">'
        + esc(s.model || '') + ' · ' + fmtTs(s.updated_at) + '</span>';
      it.addEventListener('click', async ()=>{
        GOAL.sid = s.id; GOAL_BIND.set(GOAL.nodeId, s.id);
        p.classList.remove('gp-mode-list');
        const stream = goalStream(); stream.innerHTML = '';
        try{
          const d = await fetchSessionDetail(s.id);
          const msgs = Array.isArray(d.messages) ? d.messages : [];
          if(!msgs.length) goalAddSys('暂无消息 · 在下方输入目标开始');
          msgs.forEach(m => goalAddMsg(m.role === 'assistant' ? 'assistant' : 'user', m.text));
        }catch(_){ goalAddSys('会话详情拉取失败'); }
      });
      list.appendChild(it);
    });
  }
  else p.classList.remove('gp-mode-list');
}

/* ================================================================
 *  工作台右栏（BK-0040 / 迭代 0036 修宪轮 · ADR-0016 §2 B 案）
 *  懒创建：#wb-tabs/#workbench 首次打开时动态创建（goalEnsure 先例），
 *  未打开前零新增可见 DOM（默认态像素 = 基线，s0~s11 零波及）；打开后
 *  页签条常驻至页面重载。#props 面零触碰（B 案核心承诺）：视图切换只靠
 *  #rightbar 类名（wb-page-git/wb-page-diff/wb-page-tree 时 #props
 *  display:none，renderProps 语义不受影响）。数据面 = server-sync
 *  refreshWorkbenchGit / refreshWorkbenchDiff / refreshWorkbenchTree
 *  （on-open fetch + 页内手动刷新，零轮询零 SSE，ADR-0016 §2.4）；
 *  git/diff/tree 三页均已落地（0036/0054/0056），四页签全部启用
 *  （容器基建收官）。
 * ================================================================ */
const WB = { page:'props' };   /* 运行时页态（内存，不入 localStorage/undo，GOAL_BIND 先例） */

function wbEnsure(){
  if($('#wb-tabs')) return;
  const bar = $('#rightbar');
  const mk = (id, t, dis) =>
    `<button class="wb-tab" data-wb="${id}" ${dis?'disabled title="后续批次提供"':''}>${t}</button>`;
  const tabs = document.createElement('div');
  tabs.id = 'wb-tabs';
  tabs.innerHTML = mk('props','属性',false) + mk('git','仓库',false)
                  + mk('diff','变更',false) + mk('tree','目录',false);
  tabs.addEventListener('click', e=>{
    const b = e.target.closest('.wb-tab'); if(!b || b.disabled) return;
    wbSwitch(b.dataset.wb);
  });
  bar.prepend(tabs);
  const wb = document.createElement('div');
  wb.id = 'workbench';
  wb.innerHTML = `
    <div class="wb-topbar">
      <span class="wb-title">仓库信息</span>
      <button class="ibtn wb-refresh" title="刷新">${I('rotate')} 刷新</button>
    </div>
    <div class="wb-scroll"></div>`;
  wb.querySelector('.wb-refresh').addEventListener('click', async ()=>{
    /* 按页派发（BK-0041/0042）：diff 页刷新即「应用 ref 对/路径过滤」控件（右栏宽度
       约束下不新增第二按钮，ADR-0016 §2.4 克制形态）；tree 页重取当前根树整树重渲
       （展开态重置为响应内嵌层级，诚实刷新语义）；git 页保持既有两行 */
    if(WB.page === 'diff'){ await refreshWorkbenchDiff(wbdQuery()); wbRenderDiff(); }
    else if(WB.page === 'tree'){ await refreshWorkbenchTree(); wbRenderTree(); }
    else { await refreshWorkbenchGit(); wbRenderGit(); }
  });
  wb.querySelector('.wb-scroll').addEventListener('click', e=>{
    /* 目录树行级下钻委托（BK-0042）：容器常驻一次注册，覆盖重渲与新插入子行 */
    const row = e.target.closest('.wb-tree-dir');
    if(row) wbTreeDrill(row);
  });
  bar.appendChild(wb);
}

async function wbOpen(page){
  wbEnsure();
  $('#rightbar').classList.add('wb-on');
  await wbSwitch(page || 'git');
}

async function wbSwitch(page){
  const bar = $('#rightbar');
  WB.page = page;
  bar.classList.toggle('wb-page-git', page === 'git');
  bar.classList.toggle('wb-page-diff', page === 'diff');
  bar.classList.toggle('wb-page-tree', page === 'tree');
  const title = $('.wb-title');   /* 顶栏标题随页态（首开即 wbSwitch，无中间态可见） */
  if(title) title.textContent = page === 'diff' ? '变更对比' : page === 'git' ? '仓库信息'
    : page === 'tree' ? '项目目录' : '属性';
  $$('#wb-tabs .wb-tab').forEach(b=>b.classList.toggle('on', b.dataset.wb === page));
  if(page === 'git'){
    await refreshWorkbenchGit();   /* on-open fetch：打开/切回 git 页即取（REQ-0040-05） */
    wbRenderGit();
  }else if(page === 'diff'){
    await refreshWorkbenchDiff(wbdQuery());   /* on-open fetch：打开/切至 diff 页即取（REQ-0041-02） */
    wbRenderDiff();
  }else if(page === 'tree'){
    await refreshWorkbenchTree();   /* on-open fetch：打开/切至 tree 页即取（REQ-0042-02） */
    wbRenderTree();
  }
}

function wbRenderGit(){
  const box = $('#workbench .wb-scroll'); if(!box) return;
  if(SVR.wbGitErr || !SVR.wbGit){
    box.innerHTML = `<div class="wb-empty">git 信息拉取失败 · 点击刷新重试</div>`;
    return;
  }
  const d = SVR.wbGit;
  const changes = Array.isArray(d.changes) ? d.changes : [];
  const commits = Array.isArray(d.commits) ? d.commits : [];
  const chgHtml = changes.length
    ? changes.map(c=>{
        const from = c.from ? `<span class="wb-path-o">${esc(String(c.from))} → </span>` : '';
        return `<div class="wb-change"><span class="wb-st">${esc(String(c.status||''))}</span>`+
               `<span class="wb-path">${from}${esc(String(c.path||''))}</span></div>`;
      }).join('')
    : `<div class="wb-empty">无变更文件（工作区干净）</div>`;
  box.innerHTML = `
    <div class="wb-summary">
      <div class="wb-kv"><span>分支</span><b>${esc(String(d.branch||'-'))}</b></div>
      <div class="wb-kv"><span>HEAD</span><b class="wb-sha">${esc(String(d.head||'-'))}</b></div>
      <div class="wb-kv"><span>变更</span><b>${changes.length} 个文件</b></div>
    </div>
    <div class="wb-sec">最近提交</div>
    ${commits.map(c=>`<div class="wb-commit">
        <div class="wb-c1"><span class="wb-sha">${esc(String(c.short||''))}</span>`+
          `<span class="wb-au">${esc(String(c.author||''))}</span><span class="wb-ts">${fmtTs(c.ts)}</span></div>
        <div class="wb-c2">${esc(String(c.subject||''))}</div>
      </div>`).join('') || `<div class="wb-empty">暂无提交记录</div>`}
    <div class="wb-sec">变更文件</div>
    ${chgHtml}`;
}

/* ---------- diff 审查页（BK-0041 / 迭代 0054 修宪轮 · ADR-0016 §2.2）----------
   ref 对选择行（base/head/path 三输入，WBD 为唯一事实源——重渲染回填不丢值）+
   文件列表（状态码/路径/±行数）+ 选中文件等宽补丁视图；刷新 = on-open fetch +
   .wb-refresh 按页派发 + 输入 Enter 同径（零轮询零 SSE，ADR-0016 §2.4）。
   tree 页签已随 BK-0042 解禁（目录树页见下，迭代 0056）。类名一律 wb-diff-/
   wb-ref 前缀（不触 .wtab/.wdg/.port/.node 计数面与 -- 自定义属性面）。 */
const WBD = { base:'', head:'', path:'', sel:0 };   /* diff 页运行时态（内存，WB 先例） */
const wbdQuery = () => {
  const q = {};
  if(WBD.base) q.base = WBD.base;
  if(WBD.head) q.head = WBD.head;
  if(WBD.path) q.path = WBD.path;
  return q;   /* 空串省略 = 端点缺省语义 */
};

function wbRenderDiff(){
  const box = $('#workbench .wb-scroll'); if(!box) return;
  if(SVR.wbDiffErr || !SVR.wbDiff){
    box.innerHTML = `<div class="wb-empty">diff 拉取失败 · 点击刷新重试</div>`;
    return;
  }
  const d = SVR.wbDiff;
  const files = Array.isArray(d.files) ? d.files : [];
  if(!files.length){
    box.innerHTML = `<div class="wb-empty">无变更（选定范围工作区干净）</div>`;
    return;
  }
  if(WBD.sel >= files.length) WBD.sel = 0;
  const stCls = s => s === 'A' ? 'wa' : s === 'D' ? 'wd' : s === 'R' ? 'wr' : 'wm';
  box.innerHTML = `
    ${d.truncated ? `<div class="wb-empty">diff 输出已截断 · 可用 path 过滤收窄范围</div>` : ''}
    <div class="wb-diff-bar">
      <input class="wb-ref" data-wbd="base" placeholder="HEAD" value="${esc(WBD.base)}">
      <input class="wb-ref" data-wbd="head" placeholder="工作区" value="${esc(WBD.head)}">
      <input class="wb-ref" data-wbd="path" placeholder="路径过滤" value="${esc(WBD.path)}">
    </div>
    <div class="wb-sec">文件</div>
    ${files.map((f,i)=>`<div class="wb-diff-file${i === WBD.sel ? ' on' : ''}" data-idx="${i}">
        <span class="wb-diff-st ${stCls(String(f.status||''))}">${esc(String(f.status||''))}</span>
        <span class="wb-diff-path">${esc(String(f.path||''))}</span>
        <span class="wb-diff-nums">+${Number(f.adds)||0}/-${Number(f.dels)||0}</span>
      </div>`).join('')}
    <div class="wb-sec">补丁</div>
    <pre class="wb-diff-pre">${esc(String(files[WBD.sel]?.patch ?? ''))}</pre>`;
  $$('#workbench .wb-ref').forEach(inp=>{
    inp.addEventListener('input', ()=>{ WBD[inp.dataset.wbd] = inp.value; });
    inp.addEventListener('keydown', async e=>{
      if(e.key === 'Enter'){ await refreshWorkbenchDiff(wbdQuery()); wbRenderDiff(); }
    });
  });
  $$('#workbench .wb-diff-file').forEach(row=>{
    row.addEventListener('click', ()=>{   /* 仅重渲补丁区（输入焦点不丢） */
      WBD.sel = Number(row.dataset.idx) || 0;
      $$('#workbench .wb-diff-file').forEach(r=>r.classList.toggle('on', r === row));
      const pre = $('#workbench .wb-diff-pre');
      if(pre) pre.textContent = String(files[WBD.sel]?.patch ?? '');
    });
  });
}

/* ---------- 目录树页（BK-0042 / 迭代 0056 修宪轮 · ADR-0016 §2.2）----------
   缩进树三形态分级（判据 = E3 契约二态）：dir 且 children 键缺席 = 未取可下钻
   （chev-right + 行级 fetch 下钻）；dir 且 children 非空 = 已展开（chev-down +
   子行随响应内嵌渲染，.open 类标态）；dir 且 children === [] = 折叠占位/空目录
   统一置灰（无 chev 无点击——折叠占位不展开）；file 无 chev（size 不展示——右栏
   宽度约束下的克制形态）。行级下钻逐次带 path 前缀请求 E3（fetchWorkbenchTree
   行级直调，不占 SVR.wbTree 当前根树缓存——零全量预取，ADR-0016 §2.2）；收起后
   再展开 = 重新 fetch 最新状态（零子树缓存）；缩进为内联 padding-left 动态值
   （不触 cssVars 不变量）。类名一律 wb-tree- 前缀；图标只用既有 ICON_PATHS 键
   （chev-right/chev-down）；chev 展开态由 DOM 自承载（.open 类 + 子行在场）。 */
const wbTreeRows = (children, level, prefix) =>
  (Array.isArray(children) ? children : []).map(n=>{
    const tp = prefix + String(n.name ?? '');
    const row = (cls, ic) => `<div class="wb-tree-row ${cls}" data-tp="${esc(tp)}" data-lv="${level}"`+
      ` style="padding-left:${12 + level * 14}px">${ic}<span class="wb-tree-name">${esc(String(n.name||''))}</span></div>`;
    if(n.type !== 'dir')
      return row('wb-tree-file', '');
    if(!Array.isArray(n.children))
      return row('wb-tree-dir', I('chev-right'));          /* 未取可下钻 */
    if(n.children.length === 0)
      return row('wb-tree-fold', '');                      /* 折叠占位/空目录置灰 */
    return row('wb-tree-dir open', I('chev-down')) + wbTreeRows(n.children, level + 1, tp + '/');
  }).join('');

const wbTreeChev = (row, icon) => {
  const svg = row.querySelector('svg');
  if(svg) svg.outerHTML = I(icon);
};

async function wbTreeDrill(row){
  const lv = Number(row.dataset.lv) || 0;
  if(row.classList.contains('open')){   /* 收起：移除后随更高 data-lv 相邻行 + chev 复位 */
    let el = row.nextElementSibling;
    while(el && el.classList.contains('wb-tree-row') && (Number(el.dataset.lv) || 0) > lv){
      const nx = el.nextElementSibling;
      el.remove();
      el = nx;
    }
    row.classList.remove('open');
    wbTreeChev(row, 'chev-right');
    return;
  }
  /* 重试前清理旧失败行（上次下钻失败遗留的 .wb-empty） */
  let dead = row.nextElementSibling;
  while(dead && dead.classList.contains('wb-empty')){
    const nx = dead.nextElementSibling;
    dead.remove();
    dead = nx;
  }
  try{
    const sub = await fetchWorkbenchTree({ path: row.dataset.tp });   /* 行级下钻（零全量预取） */
    if(!sub || !Array.isArray(sub.root?.children)) throw new Error('tree 形态非法');
    row.insertAdjacentHTML('afterend', wbTreeRows(sub.root.children, lv + 1, row.dataset.tp + '/'));
    row.classList.add('open');
    wbTreeChev(row, 'chev-down');
  }catch(_){
    row.insertAdjacentHTML('afterend', `<div class="wb-empty">子目录拉取失败</div>`);   /* 不静默吞 */
  }
}

function wbRenderTree(){
  const box = $('#workbench .wb-scroll'); if(!box) return;
  if(SVR.wbTreeErr || !SVR.wbTree){
    box.innerHTML = `<div class="wb-empty">目录树拉取失败 · 点击刷新重试</div>`;
    return;
  }
  const d = SVR.wbTree;
  const kids = d.root && Array.isArray(d.root.children) ? d.root.children : [];
  box.innerHTML = `
    ${d.truncated ? `<div class="wb-empty">目录条目已截断 · 可下钻子目录收窄范围</div>` : ''}
    ${wbTreeRows(kids, 0, '')}`;
}

/* ================================================================
 *  终端面板（BK-0045 / 迭代 0057 修宪轮 · ADR-0014 §7 · goal panel 三要素同构）
 *  动态单例 #term-panel（默认 display:none → 既有场景零波及）；入口 = terminal
 *  节点主体双击（本文件第二个 nodesLayer dblclick 监听器——agent 监听器
 *  :2793 零触碰，两监听器各自 type 判据早退）；会话绑定 = 节点参数 session
 *  （画布侧单一事实源，D4：面板写回 + run 提交体透传，agent 经 handler 接管
 *  同一会话——双写方共享）；SSE 消费 = openPtyStream 回调式（server-sync，
 *  端点私有帧零 shared 契约）；xterm 每次打开新建（D8 确定性参数组：
 *  cols 80/rows 24 与服务端 spawn 几何一致；Consolas 字体栈两端恒在；
 *  cursorBlink 关——静止光标）。warn/exit/end 帧只进状态行不写入终端流
 *  （D3：终端内只该有 shell 真实输出，警示与流内容分离）。
 * ================================================================ */
const TERM = { nodeId: null, sid: null, term: null, stream: null, abort: null };

function termEnsure(){
  let p = $('#term-panel');
  if(p) return p;
  p = document.createElement('div');
  p.id = 'term-panel';
  p.innerHTML = `
    <div class="tp-head">
      <span class="tp-title"></span>
      <span class="tp-status"></span>
      <button class="ibtn" data-tp="stop" title="停止会话">${I('stop')}</button>
      <button class="ibtn" data-tp="close" title="关闭">${I('x')}</button>
    </div>
    <div class="tp-body"></div>`;
  document.body.appendChild(p);
  p.querySelector('[data-tp="close"]').addEventListener('click', ()=>{
    p.classList.remove('show');
    termDispose();                     /* 仅客户端拆链——会话存续（ADR §4.1） */
  });
  p.querySelector('[data-tp="stop"]').addEventListener('click', ()=>termStopSession());
  return p;
}
function termSetStatus(text){
  const el = $('#term-panel .tp-status');
  if(el) el.textContent = text;        /* warn/exit/end/降级态唯一呈现面（D3） */
}
function termShowEmpty(html){
  termDispose();                       /* 清 xterm 与流（降级态无终端可持） */
  const body = $('#term-panel .tp-body');
  if(body) body.innerHTML = '<div class="tp-empty">' + html + '</div>';
}
function termDispose(){
  if(TERM.term){ try{ TERM.term.dispose(); }catch(_){ /* 已释放 */ } }
  if(TERM.stream) TERM.stream.close();
  if(TERM.abort) TERM.abort.abort();
  TERM.term = null; TERM.stream = null; TERM.abort = null; TERM.sid = null; TERM.nodeId = null;
}
async function termAttach(sid){
  const p = $('#term-panel'); if(!p) throw new Error('面板未就绪');
  const body = p.querySelector('.tp-body');
  body.innerHTML = '';
  TERM.sid = sid;
  TERM.abort = new AbortController();
  TERM.term = new Terminal({ cols: 80, rows: 24,
    fontFamily: 'Consolas, "Courier New", monospace', fontSize: 12,
    cursorBlink: false, scrollback: 1000, convertEol: false, allowProposedApi: false });
  TERM.term.open(body);
  /* 键入透传（origin=user 通道，含控制序列）；写失败进状态行不进流 */
  TERM.term.onData(data => {
    writePtySession(sid, data).catch(err => termSetStatus('发送失败（' + String(err && err.message || err).slice(0, 30) + '）'));
  });
  let sessionEnded = false;   /* BUG-0061-01：exit 终态文本不被本地合成 end 帧覆盖（六 reason 终态文本可达） */
  TERM.stream = await openPtyStream(sid, { signal: TERM.abort.signal, onFrame: f => {
    if(f.t === 'data'){ if(TERM.term) TERM.term.write(String(f.data ?? '')); }
    else if(f.t === 'warn') termSetStatus('⚠ ' + String(f.msg ?? ''));
    else if(f.t === 'exit'){ sessionEnded = true; termSetStatus('会话已结束（' + String(f.reason ?? '-') + '）'); }
    else if(f.t === 'end'){ if(!sessionEnded) termSetStatus('流已结束'); }
    else if(f.t === 'error') termSetStatus('流中断（' + String(f.msg ?? '-') + '）· 重开面板可恢复回放');   /* BUG-0057-02 修复轮：读循环异常不再静默 */
  }});
  TERM.term.focus();
}
async function openTermPanel(n){
  const p = termEnsure();
  termDispose();                       /* 上一会话拆链（会话存续，重开重附流回放） */
  p.querySelector('.tp-body').innerHTML = '';
  TERM.nodeId = n.id;
  p.classList.add('show');
  p.querySelector('.tp-title').textContent = n.title || defOf(n).name;
  termSetStatus('连接会话…');
  /* ① 绑定解析（D4）：p.session 非空且建流成功 → 直接接管（重开恢复语义）；
     失活绑定（404）→ 落新建分支 */
  let sid = String(paramsOf(n).session || '').trim(), attached = false;
  if(sid){ try{ await termAttach(sid); attached = true; }catch(_){ attached = false; } }
  if(!attached){
    /* ② 新建：503 → 「未启用」态（单次提示不刷屏）；429 → 「满员」态；其余如实态 */
    try{ sid = (await createPtySessionOnServer()).sessionId; }
    catch(err){
      const s = String(err && err.message || '');
      termShowEmpty(s.includes('503') ? 'PTY 会话功能未启用（PTY_ENABLED=0）<br>启用后面板即可交互'
                   : s.includes('429') ? 'PTY 并发会话数已达上限<br>停止闲置会话后重试'
                   : 'PTY 会话建立失败（' + esc(s.slice(0, 40)) + '）');
      termSetStatus('');
      return;
    }
    /* ③ 写回绑定（画布侧单一事实源）+ 节点级重渲（widget 呈现当前 session，
       :1175-1177 makeNodeEl replaceWith 形态；几何不变 → portCache 零失效）+ 持久化 */
    n.params = Object.assign({}, n.params, { session: sid });
    const old = nodesLayer.querySelector('.node[data-id="' + n.id + '"]');
    if(old) old.replaceWith(makeNodeEl(n));
    saveLocal();
    try{ await termAttach(sid); }
    catch(err){
      termShowEmpty('PTY 流建立失败（' + esc(String(err && err.message || err).slice(0, 40)) + '）');
      termSetStatus('');
    }
  }
}
/* 停止会话：POST stop → 200 状态行提示（exit 帧随后到达收尾）；404 = 无活动会话 */
async function termStopSession(){
  if(!TERM.sid) return;
  try{
    await stopPtySessionOnServer(TERM.sid);
    termSetStatus('已发送停止…');
  }catch(err){
    const s = String(err && err.message || '');
    if(s.includes('404')) termSetStatus('无活动会话');
    else termSetStatus('停止失败（' + s.slice(0, 40) + '）');
  }
}
/* 入口：terminal 节点主体双击（再次双击同节点 = 收起）；.ntitle 重命名 / .wdg
 * 输入 / .port 连线手势零触碰（与 goal panel :2793 同款判据，各自 type 早退） */
nodesLayer.addEventListener('dblclick', e=>{
  const nodeEl = e.target.closest('.node'); if(!nodeEl) return;
  if(e.target.closest('.ntitle') || e.target.closest('.wdg') || e.target.closest('.port')) return;
  const n = nodeById(+nodeEl.dataset.id);
  if(!n || n.type !== 'terminal') return;
  const p = $('#term-panel');
  if(p && p.classList.contains('show') && TERM.nodeId === n.id){ p.classList.remove('show'); termDispose(); return; }
  openTermPanel(n);
});

}
