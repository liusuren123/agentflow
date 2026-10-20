/* ================================================================
 *  server.js — AgentFlow 执行后端（Express）
 *  · GET  /            → 托管根目录 index.html（同源，无 CORS 问题）
 *  · GET  /api/health  → 引擎/模型配置状态
 *  · GET  /api/models  → 可用模型列表（前端据此刷新 LLM 节点下拉）
 *  · POST /api/run     → 提交工作流，SSE 流式返回执行事件
 *  · POST /api/run/:id/stop    → 中止运行（AbortController）
 *  · POST /api/run/:id/approve → 人工审批 通过/拒绝
 *  出站安全：工作流中用户配置的 URL 一律经 guard.js 守卫
 *  （私网/回环默认拦截，ALLOW_PRIVATE_NET=1 显式放行）。
 * ================================================================ */
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { executeWorkflow } from './engine.js';
import { providerInfo } from './providers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');   // apps/server → 仓库根（托管 index.html）
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '4mb' }));

/* 运行注册表：runId → ctx（对象索引，运行结束即删除） */
const runsById = Object.create(null);

/* ---------- 静态托管（React 构建产物，同源访问） ----------
 * 前端已迁移至 apps/web（宪法门禁保证与 2026-10 定稿 UI 像素级一致）；
 * 首次启动前需在仓库根执行 npm run build:web。 */
const WEB_INDEX = path.join(ROOT, 'apps', 'web', 'dist', 'index.html');
if (!existsSync(WEB_INDEX)) {
  console.error('缺少前端构建产物：请先在仓库根执行  npm run build:web');
  process.exit(1);
}
app.get('/', (_q, res)=>res.sendFile(WEB_INDEX));
app.get('/index.html', (_q, res)=>res.sendFile(WEB_INDEX));

/* ---------- 状态 ---------- */
app.get('/api/health', (_q, res)=>{
  res.json({ ok:true, engine:'agentflow-server', node:process.version, provider: providerInfo() });
});
app.get('/api/models', (_q, res)=>{
  res.json(providerInfo());
});

/* ---------- 运行（SSE 事件流） ---------- */
app.post('/api/run', (req, res)=>{
  const { name, nodes, edges, inputs } = req.body || {};
  if(!Array.isArray(nodes)){ res.status(400).json({ error:'body.nodes 必须是数组' }); return; }
  const runId = crypto.randomUUID();
  res.writeHead(200, {
    'Content-Type':'text/event-stream; charset=utf-8',
    'Cache-Control':'no-cache, no-transform',
    'Connection':'keep-alive',
    'X-Accel-Buffering':'no',
  });
  res.write(`data: ${JSON.stringify({ type:'run:accepted', runId })}\n\n`);
  const ping = setInterval(()=>{ try{ res.write(': ping\n\n'); }catch{ } }, 15000);

  const ctx = {
    runId,
    wf: { name: name || '未命名工作流', nodes, edges: Array.isArray(edges)?edges:[] },
    inputs: inputs || {},
    ac: new AbortController(),
    emit(type, payload){ try{ res.write(`data: ${JSON.stringify({ type, ...payload })}\n\n`); }catch{ /* 连接已断 */ } },
  };
  runsById[runId] = ctx;

  executeWorkflow(ctx)
    .catch(err=>{
      ctx.emit('run:error', { message: String(err && err.message || err) });
      ctx.emit('run:done', { ms: Date.now() - (ctx.progress?.t0 ?? Date.now()), done: ctx.progress?.done ?? 0,
        total: Math.max(ctx.progress?.total ?? 0, ctx.progress?.done ?? 0), ok:false, stopped:false, outputs: ctx.outputs || [] });
    })
    .finally(()=>{
      clearInterval(ping);
      delete runsById[runId];
      try{ res.end(); }catch{ }
    });
});

/* ---------- 停止 ---------- */
app.post('/api/run/:id/stop', (req, res)=>{
  const ctx = runsById[req.params.id];
  if(!ctx){ res.status(404).json({ error:'run not found' }); return; }
  ctx.ac.abort();
  res.json({ ok:true });
});

/* ---------- 审批 ---------- */
app.post('/api/run/:id/approve', (req, res)=>{
  const ctx = runsById[req.params.id];
  if(!ctx){ res.status(404).json({ error:'run not found' }); return; }
  const { nodeId, approve, comment } = req.body || {};
  const ok = ctx.resolveApproval?.(nodeId, !!approve, comment || '');
  res.json({ ok: !!ok });
});

app.listen(PORT, ()=>{
  const info = providerInfo();
  console.log(`AgentFlow server → http://localhost:${PORT}`);
  console.log(`  模型: ${info.configured ? info.note : '未配置（LLM 节点将报错，其余节点正常）'}`);
});
