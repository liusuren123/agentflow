/* ================================================================
 *  server.ts — AgentFlow 执行后端（Express）
 *  · GET  /            → 托管 apps/web/dist/index.html（同源，无 CORS 问题）
 *  · GET  /api[/v1]/health   → 引擎/模型配置状态
 *  · GET  /api[/v1]/models   → 可用模型列表（前端据此刷新 LLM 节点下拉）
 *  · POST /api[/v1]/run      → 提交工作流，SSE 流式返回执行事件
 *  · POST /api[/v1]/run/:id/stop    → 中止运行（AbortController）
 *  · POST /api[/v1]/run/:id/approve → 人工审批 通过/拒绝
 *  · GET/PUT /api/v1/workflows[/:id] → 工作流存取/upsert（ADR-0005）
 *  · GET  /api/v1/runs?limit=  · GET /api/v1/runs/:id → 运行历史 + 事件回放
 *  · DELETE /api/v1/workflows/:id · DELETE /api/v1/runs/:id → 删除（ADR-0007，
 *    run 级联清 run_events；活动 run 以内存注册表判 409）
 *  · POST /api/v1/sessions（创建）· GET /api/v1/sessions[/:id]（列表/详情）
 *    · POST …/chat（SSE 续聊）· POST …/stop（停止）→ 持久会话五端点（迭代 0015 / BK-0016）
 *  · GET  /api/v1/capabilities → 能力清单（builtin MCP × TOOL_SPECS 派生 +
 *    外部注册条目 + skills 常量；只读进程内状态，迭代 0039 / BK-0049）
 *  · GET  /api/v1/workbench/git → 工作台 git 信息页数据源（branch/head/changes/
 *    commits；git 只读白名单三命令子进程 + 项目根模块级常量锚定，零出站零 env，
 *    ADR-0016 §3.1，迭代 0036 / BK-0040）
 *  · GET  /api/v1/workbench/diff → 工作台 diff 审查页数据源（base/head ref 对 +
 *    path 前缀 + stat 统计模式；git 只读白名单 diff 一命令子进程，ref 白名单与
 *    path 防越界 400 / 404 无仓库 / 500 超时，零出站零 env，ADR-0016 §3.2，
 *    迭代 0054 / BK-0041）
 *  /api/v1/* 为正式命名空间（ADR-0004/0005），旧 /api/* 为等价别名
 *  （workflows/runs/sessions/capabilities/workbench 为新端点，仅 v1 命名空间）；前端本阶段仍用旧路径。
 *  持久化（ADR-0005）：SSE 事件在序列化单一出口 send() 处「先落库后写网」
 *  （run:accepted 直写与 ctx.emit 同径；`: ping` 保活注释不落库）。
 *  出站安全：工作流中用户配置的 URL 一律经 guard.ts 守卫
 *  （私网/回环默认拦截，ALLOW_PRIVATE_NET=1 显式放行）。
 *  优雅停机：SIGINT/SIGTERM → server.close + 中止全部活动 run
 *  （SSE 发 run:done(stopped) 后收尾）+ 关闭 SQLite + 退出码 0（ADR-0004/0005）。
 * ================================================================ */
import express from 'express';
import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { executeWorkflow } from './engine.js';
import { providerInfo } from './providers.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { sseWriteEvent, sseWriteComment } from './util.js';
import {
  initStore, closeStore, openRunRecorder, listWorkflows, getWorkflow, saveWorkflow, listRuns, getRunDetail,
  deleteWorkflow, deleteRun, sweepDanglingRuns,
} from './store.js';
import {
  sessionsCreateHandler, sessionsListHandler, sessionDetailHandler, sessionChatHandler, sessionStopHandler,
  abortActiveSessions, activeSessionCount,
} from './sessions.js';
import { capabilitiesHandler } from './capabilities.js';
import { workbenchGitHandler } from './workbench/routes.js';
import { workbenchDiffHandler } from './workbench/routes.js';
import type { RunCtx } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..');   // apps/server/dist → 仓库根（托管 index.html）
const PORT = config.port;

const app = express();
app.use(express.json({ limit: '4mb' }));

/* 运行注册表：runId → ctx（对象索引，运行结束即删除） */
const runsById: Record<string, RunCtx> = Object.create(null);

/* ---------- 静态托管（React 构建产物，同源访问） ----------
 * 前端已迁移至 apps/web（宪法门禁保证与 2026-10 定稿 UI 像素级一致）；
 * 首次启动前需在仓库根执行 npm run build:web。
 * sendFile 实参用「相对路径 + {root}」而非绝对路径（迭代 0040 / BK-0052）：
 * send 库对 Windows 绝对路径（盘符冒号）解析抛 NotFoundError → 本机 404；
 * 相对形态跨平台等价，托管终点仍为同一 apps/web/dist/index.html。 */
const WEB_DIR = path.join(ROOT, 'apps', 'web', 'dist');
const WEB_INDEX = path.join(WEB_DIR, 'index.html');
if (!existsSync(WEB_INDEX)) {
  logger.fatal({ webIndex: WEB_INDEX }, '缺少前端构建产物：请先在仓库根执行  npm run build:web');
  process.exit(1);
}
app.get('/', (_q, res)=>res.sendFile('index.html', { root: WEB_DIR }));
app.get('/index.html', (_q, res)=>res.sendFile('index.html', { root: WEB_DIR }));

/* ---------- SQLite 持久化（ADR-0005：data/agentflow.db，WAL） ---------- */
initStore();

/* 启动扫尾（迭代 0019 / BK-0011）：上次进程崩溃/强杀遗留的 running 行收敛 stopped
 *（不伪造终结事件、不回填 ended_ms）；零命中静默（正常路径无噪音） */
const swept = sweepDanglingRuns();
if (swept.count > 0) {
  logger.warn({ count: swept.count, ids: swept.ids.slice(0, 20) }, '启动扫尾：遗留 running run 已标记 stopped');
}

/* ---------- 状态 ---------- */
const healthHandler: RequestHandler = (_q, res)=>{
  res.json({ ok:true, engine:'agentflow-server', node:process.version, provider: providerInfo() });
};
const modelsHandler: RequestHandler = (_q, res)=>{
  res.json(providerInfo());
};

/* ---------- 运行（SSE 事件流） ---------- */
const runHandler: RequestHandler = (req, res)=>{
  const { name, nodes, edges, inputs } = req.body || {};
  if(!Array.isArray(nodes)){ res.status(400).json({ error:'body.nodes 必须是数组' }); return; }
  const runId = crypto.randomUUID();
  res.writeHead(200, {
    'Content-Type':'text/event-stream; charset=utf-8',
    'Cache-Control':'no-cache, no-transform',
    'Connection':'keep-alive',
    'X-Accel-Buffering':'no',
    'X-Content-Type-Options':'nosniff',   /* 禁止浏览器嗅探为可执行类型 */
  });
  /* 事件序列化单一出口（ADR-0005 落库钩子）：run:accepted 直写与 ctx.emit
   * 全部经 send()——先落库后写网（SSE 断线不丢历史）；seq 自 run:accepted=0 递增；
   * `: ping` 保活注释不经过此处，天然不落库。 */
  const wf = { name: name || '未命名工作流', nodes, edges: Array.isArray(edges)?edges:[] };
  const recorder = openRunRecorder(runId, wf, inputs || {});
  let seq = 0;
  const send = (ev: Record<string, unknown>)=>{
    recorder.record(seq++, ev);
    sseWriteEvent(res, ev);
  };
  send({ type:'run:accepted', runId });
  const ping = setInterval(()=>{ sseWriteComment(res, 'ping'); }, 15000);

  const ctx: RunCtx = {
    runId,
    wf,
    inputs: inputs || {},
    ac: new AbortController(),
    emit(type, payload){ send({ type, ...payload }); },
    log: logger.child({ runId }),
  };
  runsById[runId] = ctx;
  ctx.log.info({ name: ctx.wf.name, nodes: nodes.length, edges: ctx.wf.edges.length }, 'run 开始');

  let outcome: { ms: number; ok: boolean; stopped: boolean } | null = null;
  executeWorkflow(ctx)
    .then(r=>{ outcome = { ms: r.ms, ok: !r.stopped, stopped: r.stopped }; })
    .catch(err=>{
      outcome = { ms: Date.now() - (ctx.progress?.t0 ?? Date.now()), ok: false, stopped: false };
      ctx.log.error({ err: String((err as Error).message || err) }, 'run 异常');
      ctx.emit('run:error', { message: String((err as Error).message || err) });
      ctx.emit('run:done', { ms: outcome.ms, done: ctx.progress?.done ?? 0,
        total: Math.max(ctx.progress?.total ?? 0, ctx.progress?.done ?? 0), ok:false, stopped:false, outputs: ctx.outputs || [] });
    })
    .finally(()=>{
      if(outcome) ctx.log.info({ ...outcome, done: ctx.progress?.done ?? 0, total: ctx.progress?.total ?? 0 }, 'run 结束');
      clearInterval(ping);
      delete runsById[runId];
      try{ res.end(); }catch{ }
    });
};

/* ---------- 停止 ---------- */
const stopHandler: RequestHandler = (req, res)=>{
  const ctx = runsById[String(req.params.id)];
  if(!ctx){ res.status(404).json({ error:'run not found' }); return; }
  ctx.ac.abort();
  ctx.log.info('run 被客户端请求中止');
  res.json({ ok:true });
};

/* ---------- 审批 ---------- */
const approveHandler: RequestHandler = (req, res)=>{
  const ctx = runsById[String(req.params.id)];
  if(!ctx){ res.status(404).json({ error:'run not found' }); return; }
  const { nodeId, approve, comment } = req.body || {};
  const ok = ctx.resolveApproval?.(nodeId, !!approve, comment || '');
  res.json({ ok: !!ok });
};

/* ---------- 工作流存取（ADR-0005，仅 v1 命名空间） ---------- */
const workflowsGetHandler: RequestHandler = (_q, res)=>{
  res.json({ workflows: listWorkflows() });   // updated_at 倒序（摘要）
};
const workflowGetHandler: RequestHandler = (req, res)=>{
  const wf = getWorkflow(String(req.params.id));   // 完整内容（nodes/edges/inputs）
  if(!wf){ res.status(404).json({ error:'workflow not found' }); return; }
  res.json(wf);
};
const workflowsPutHandler: RequestHandler = (req, res)=>{
  const { name, nodes, edges, inputs } = req.body || {};
  if(!Array.isArray(nodes)){ res.status(400).json({ error:'body.nodes 必须是数组' }); return; }
  /* upsert：路径 :id 优先，其次 body.id，均缺省则生成新 id */
  res.json(saveWorkflow(req.params.id || (req.body && req.body.id) || undefined, { name, nodes, edges, inputs }));
};

/* ---------- 运行历史（ADR-0005，仅 v1 命名空间） ---------- */
const runsListHandler: RequestHandler = (req, res)=>{
  const n = Number(req.query.limit ?? 20);
  if(!Number.isInteger(n) || n < 1 || n > 100){ res.status(400).json({ error:'limit 必须是 1-100 的整数' }); return; }
  res.json({ runs: listRuns(n) });             // started_at 倒序
};
const runDetailHandler: RequestHandler = (req, res)=>{
  const d = getRunDetail(String(req.params.id));
  if(!d){ res.status(404).json({ error:'run not found' }); return; }
  res.json(d);                                 // { run, events } —— 完整事件回放
};

/* ---------- 删除（ADR-0007，仅 v1 命名空间） ---------- */
const workflowDeleteHandler: RequestHandler = (req, res)=>{
  if(!deleteWorkflow(String(req.params.id))){ res.status(404).json({ error:'workflow not found' }); return; }
  res.json({ ok:true });                       // 与 stop/approve 应答同型
};
const runDeleteHandler: RequestHandler = (req, res)=>{
  const id = String(req.params.id);
  /* 活动 run 守卫用内存注册表（runsById）而非 DB status：进程崩溃重启后残留的
     僵尸 running 行恰需可删；真正活动的 run 删行会让 recorder 持续写孤儿事件行 */
  if(runsById[id]){ res.status(409).json({ error:'run is active' }); return; }
  if(!deleteRun(id)){ res.status(404).json({ error:'run not found' }); return; }
  res.json({ ok:true });                       // runs 行 + 全部 run_events 行同一事务删除
};

/* ---------- 路由注册：/api/v1/*（正式）+ /api/*（旧别名，前端零改动） ---------- */
for(const base of ['/api', '/api/v1']){
  app.get(`${base}/health`, healthHandler);
  app.get(`${base}/models`, modelsHandler);
  app.post(`${base}/run`, runHandler);
  app.post(`${base}/run/:id/stop`, stopHandler);
  app.post(`${base}/run/:id/approve`, approveHandler);
}
/* ADR-0005 新端点：仅注册 v1（无旧别名，前端本阶段不消费） */
app.get('/api/v1/workflows', workflowsGetHandler);
app.get('/api/v1/workflows/:id', workflowGetHandler);
app.put('/api/v1/workflows', workflowsPutHandler);
app.put('/api/v1/workflows/:id', workflowsPutHandler);
app.get('/api/v1/runs', runsListHandler);
app.get('/api/v1/runs/:id', runDetailHandler);
/* ADR-0007 删除端点：仅注册 v1（沿 ADR-0005：持久化端点无旧别名） */
app.delete('/api/v1/workflows/:id', workflowDeleteHandler);
app.delete('/api/v1/runs/:id', runDeleteHandler);
/* 迭代 0015 / BK-0016 会话端点：仅注册 v1（沿 ADR-0005：新端点无旧别名） */
app.post('/api/v1/sessions', sessionsCreateHandler);
app.get('/api/v1/sessions', sessionsListHandler);
app.get('/api/v1/sessions/:id', sessionDetailHandler);
app.post('/api/v1/sessions/:id/chat', sessionChatHandler);
app.post('/api/v1/sessions/:id/stop', sessionStopHandler);
/* 迭代 0039 / BK-0049 能力清单端点：仅注册 v1（沿 ADR-0005：新端点无旧别名） */
app.get('/api/v1/capabilities', capabilitiesHandler);
/* 迭代 0036 / BK-0040 workbench 端点：仅注册 v1（沿 ADR-0005：新端点无旧别名） */
app.get('/api/v1/workbench/git', workbenchGitHandler);
/* 迭代 0054 / BK-0041 workbench diff 端点：仅注册 v1（沿 ADR-0005：新端点无旧别名） */
app.get('/api/v1/workbench/diff', workbenchDiffHandler);

/* ---------- 优雅停机（ADR-0004：SIGINT/SIGTERM 同径） ---------- */
const server = app.listen(PORT, ()=>{
  const info = providerInfo();
  logger.info({ port: PORT, node: process.version, provider: info.configured ? info.note : '未配置（LLM 节点将报错，其余节点正常）' },
    `AgentFlow server 启动 → http://localhost:${PORT}`);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if(shuttingDown) return;
  shuttingDown = true;
  const active = Object.keys(runsById);
  /* 会话活动 turn 与 run 同批中止（迭代 0015 / BK-0016）：各 turn 走停止路径
     （部分文本落库 → run:done(stopped) → finally 自清注册表），shutdown 只轮询不代删 */
  const sessionsAborted = abortActiveSessions();
  logger.info({ signal, activeRuns: active.length, activeSessions: sessionsAborted }, '优雅停机开始');
  server.close();                                    /* ① 停止接受新请求 */
  for(const id of active){                           /* ② 中止活动 run：SSE 发 run:done(stopped) 后收尾 */
    try{ runsById[id]!.ac.abort(); }catch{ /* 已结束 */ }
  }
  const deadline = Date.now() + 5000;                /* 宽限上限 5s（Docker 默认 10s 窗口内） */
  while(Object.keys(runsById).length + activeSessionCount() && Date.now() < deadline){
    await new Promise(r=>setTimeout(r, 100));
  }
  if(Object.keys(runsById).length + activeSessionCount()){
    logger.warn({ remaining: Object.keys(runsById).length, remainingSessions: activeSessionCount() },
      '停机宽限期内 run 未收尾，强制退出');
  }
  logger.info('优雅停机完成');
  closeStore();                                     /* SQLite 关闭（WAL checkpoint 落盘，ADR-0005） */
  process.exit(0);                                   /* ③ 退出码 0 */
}
process.on('SIGINT', ()=>{ void shutdown('SIGINT'); });
process.on('SIGTERM', ()=>{ void shutdown('SIGTERM'); });
