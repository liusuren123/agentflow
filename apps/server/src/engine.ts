/* ================================================================
 *  engine.ts — AgentFlow 真实工作流执行引擎（服务端）
 *  · 拓扑排序逐节点执行，与前端画布动画一一对应（事件驱动）
 *  · LLM 节点：Vercel AI SDK 7 streamText 流式 / generateText 工具循环（llm.ts）
 *  · 条件分支：真实求值（expr.ts，自研解析器，无 eval）
 *  · 循环节点：下游闭包子图按迭代反复执行（支持并发）
 *  · 人工审批：真实挂起，等待 /api/run/:id/approve
 *  · 代码节点：Python / JavaScript 均以独立子进程执行（code.ts，
 *    5s 超时强杀，JSON over stdio 交换数据，服务进程内存不与用户代码共享）
 *  · HTTP / 知识库检索(TF-IDF) / 网页搜索 / Webhook 通知均为真实调用
 *  · 节点失败 on-error 策略：skip（默认，= 下游失活形态）/ retry（指数退避重试）/
 *    abort（run 级 fail-fast）——env 全局承载（BK-0020 / ADR-0022）
 * ================================================================ */
import { NODE_NAMES, paramDefaultsOf } from '@agentflow/shared';
import { ABORT_MSG, abortableSleep, isAbort, preview } from './util.js';
import { config } from './config.js';
import { BASIC_HANDLERS } from './handlers.js';
import { llmHandler } from './llm.js';
import { agentHandler } from './agent.js';
import type { ApprovalWaiters, HandlerArgs, NodeHandler, NodeResult, RunCtx, Scope, WFEdge, WFNode, WorkflowRunResult } from './types.js';

/* ---------------- 节点元信息（来自 @agentflow/shared 单一事实源） ----------------
 * DEFS_META 与参数默认值原为前端 DEFS 的手工副本（两处同步漂移风险），
 * 现统一由 packages/shared 的节点注册表派生（契约测试保证一致性）。
 * 注：NODE_NAMES 值为纯显示名字符串，meta.name 实际恒为 undefined ——
 * 保留既有字面形状（title/defName 回退 n.title/n.type），行为零变化。 */
const DEFS_META = NODE_NAMES;
const paramsDefaults = (type: string): Record<string, unknown> => paramDefaultsOf(type);

export const HANDLERS: Record<string, (ctx: RunCtx, args: HandlerArgs) => Promise<NodeResult>> = {
  ...BASIC_HANDLERS,
  llm: llmHandler,
  agent: agentHandler,
};

/* ---------------- 主入口 ---------------- */
export async function executeWorkflow(ctx: RunCtx): Promise<WorkflowRunResult> {
  const { wf, emit, ac } = ctx;
  const nodes: WFNode[] = wf.nodes || [], edges: WFEdge[] = wf.edges || [];
  const byId = new Map<number, WFNode>(nodes.map(n=>[n.id, n]));
  const outEs = (id: number): WFEdge[] => edges.filter(e=>e.fn===id);
  const inEs  = (id: number): WFEdge[] => edges.filter(e=>e.tn===id);
  const P = (n: WFNode): Record<string, any> => ({ ...(paramsDefaults(n.type)), ...(n.params || {}) });

  const vars: Record<string, any> = { question: ctx.inputs?.question ?? '如何申请退货?' };  // 与 UI 演示一致的默认问题
  const outputs: string[] = [];
  ctx.outputs = outputs;
  const approvalWaiters: ApprovalWaiters = new Map();
  ctx.resolveApproval = (nodeId, ok, comment) => {
    const w = approvalWaiters.get(nodeId);
    if(w){ approvalWaiters.delete(nodeId); w({ ok, comment }); return true; }
    return false;
  };

  /* ---- 拓扑序（Kahn，与前端相同算法） ---- */
  const topo: number[] = (()=>{
    const indeg: Record<number, number> = {}; nodes.forEach(n=>indeg[n.id]=0);
    edges.forEach(e=>{ if(indeg[e.tn]!==undefined) indeg[e.tn] = (indeg[e.tn] || 0) + 1; });
    const q = nodes.filter(n=>indeg[n.id]===0).map(n=>n.id);
    const order: number[] = [];
    while(q.length){
      const id = q.shift()!; order.push(id);
      edges.filter(e=>e.fn===id).forEach(e=>{ indeg[e.tn] = (indeg[e.tn] || 0) - 1; if(indeg[e.tn] === 0) q.push(e.tn); });
    }
    return order;
  })();
  if(topo.length < nodes.length) emit('log', { lvl:'warn', msg:`⚠ 检测到 ${nodes.length-topo.length} 个节点不在执行路径上（可能存在环）` });
  ctx._topo = topo;

  const prog = ctx.progress = { done:0, total: topo.length, t0: Date.now() };
  const progress = () => emit('run:progress', { done: prog.done, total: prog.total, elapsed: Date.now()-prog.t0 });
  emit('run:start', { name: wf.name || '未命名工作流', total: prog.total });

  const mainScope: Scope = { results:new Map(), executed:new Set(), firedEdges:new Set() };

  /* ---- on-error 策略（BK-0020 / ADR-0022 §2/§5）：本层承载「env 全局默认 > 内建
   * 缺省」两层（节点参数层归 BK-0048，零预写）。三 env 全未配置时 onError='skip' +
   * retries=0 ≡ 现状行为逐位一致（零强制漂移，硬护栏）。 ---- */
  const onErrorStrategy = config.onError;   // 'skip' | 'retry' | 'abort'（未配置默认 skip）
  const onErrorRetries = onErrorStrategy === 'retry' ? config.onErrorRetries : 0;   // 重试次数仅 retry 策略消费（ADR-0022 §3）
  const onErrorRetryDelayMs = config.onErrorRetryDelayMs;
  let onErrorAborted = false;   /* abort 策略 run 级独立标志位：不调 ac.abort，stopped 恒保持「用户/停机中止」独占语义（§2.3） */

  /* 重试宿主（ADR-0022 §4.2）：仅包裹 handler 调用的循环——args 在 runNode 内重建
   * （入参快照不变），不重跑 bypass / node:start；过程经既有 log 事件 lvl:'warn'
   * 通报（零新事件类型）；退避 = abortable sleep 竞速 ac.signal（stop 端点与优雅
   * 停机在等待期内即时中断，不等待到期）；中止一律原样上抛（策略不截获中止）。 */
  async function callHandlerWithRetry(handler: NodeHandler, args: HandlerArgs, title: string): Promise<NodeResult> {
    const maxAttempts = 1 + onErrorRetries;
    let lastErr: unknown;
    for(let attempt = 1; attempt <= maxAttempts; attempt++){
      if(ac.signal.aborted) throw Object.assign(new Error(ABORT_MSG), { name:'AbortError' });   // 每次尝试前复查
      try{
        return await handler(ctx, args);
      }catch(err){
        if(isAbort(err) || ac.signal.aborted) throw err;   // 中止优先级最高，重试不截获
        lastErr = err;
        if(attempt < maxAttempts){
          const delay = Math.min(onErrorRetryDelayMs * 2 ** (attempt - 1), 30000);
          /* 通报先行（退避等待窗内即达消费端：流式 delta 叠加观感由此可解释——issue#15
           * ③知悉项；OE06 stop 即时中断亦以该事件为时序门），随后 abortable sleep 竞速
           * ac.signal（stop 端点与优雅停机在等待期内即时中断，不等待到期）。 */
          emit('log', { lvl:'warn', msg:`⚠ [${title}] 第 ${attempt + 1} 次尝试将在 ${delay}ms 退避后执行（前次失败：${String((lastErr as Error)?.message || lastErr)}）` });
          await abortableSleep(delay, ac.signal);   // 指数退避 ×2^(n-1)，单次封顶 30000ms
        }
      }
    }
    if(maxAttempts === 1) throw lastErr;   // 零重试路径：错误原样上抛（未配置/skip/abort 行为逐位一致）
    throw new Error(`${String((lastErr as Error)?.message || lastErr)}（已重试 ${maxAttempts - 1} 次）`);   // 耗尽：末次错误 + 尝试概要（外层按 skip 终态收尾，§2.2）
  }


  function edgeValue(e: WFEdge, scope: Scope): unknown {
    const src = scope.results.get(e.fn);
    if(!src) return undefined;
    if(Array.isArray(src.ports) && src.ports.length) return src.ports[e.fp] !== undefined ? src.ports[e.fp] : src.value;
    return src.value;
  }

  /* ---------------- 单节点执行（scope/vars 可被循环迭代覆写） ---------------- */
  async function runNode(id: number, scope: Scope, iteration: number | null, varsOverride: Record<string, any> | null): Promise<void> {
    const n = byId.get(id); if(!n) return;
    const meta = (DEFS_META[n.type] || {}) as { name?: string };
    const p = P(n);
    const title = n.title || meta.name || n.type;
    const effVars = varsOverride || vars;
    if(n.bypass){
      scope.executed.add(id);
      emit('node:bypass', { id, title });
      prog.done++; progress();
      return;
    }
    emit('node:start', { id, title, defName: meta.name || n.type, iteration: iteration || null });
    const inVals = inEs(id).map(e => edgeValue(e, scope));
    const input = inVals.length ? inVals.filter(v=>v!==undefined).shift() : undefined;
    let r: NodeResult;
    try{
      const args: HandlerArgs = { n, p, def: meta, input, inVals, vars: effVars, scope, emit, iteration,
        approvalWaiters, byId, edges, outEs, inEs, ctx,
        sub: (cid, s2, v2, idx) => runNode(cid, s2, idx, v2) };
      r = await callHandlerWithRetry((HANDLERS[n.type] || HANDLERS.__pass)!, args, title);
    }catch(e){
      scope.executed.add(id);
      prog.done++; progress();
      if(isAbort(e) || ac.signal.aborted){   /* 中止判定：位置与语义不动，重试/策略不截获中止（ADR-0022 §4.1） */
        emit('node:error', { id, title, message:'已中止' });
        throw e;
      }
      /* 策略分派点（ADR-0022 §4.1）：skip（默认；retry 耗尽同径）= 既有失活形态
       * named 化，序列零搬移零行为差；abort = 同一终态序列 + run 级标志位（主循环
       * 同位检查，失败后停止调度全部后续节点，stopped 语义不被污染，§2.3）。 */
      const message = String((e as Error).message || e);
      emit('node:error', { id, title, message });
      ctx.log.warn({ nodeId: id, title, err: message }, '节点执行失败');
      if(onErrorStrategy === 'abort') onErrorAborted = true;
      return;
    }
    scope.executed.add(id);
    scope.results.set(id, r);
    prog.done++; progress();
    /* 默认激活全部出边；条件分支只激活所选端口 */
    const firedPort = r && typeof r.firePort === 'number' ? r.firePort : null;
    outEs(id).forEach(e=>{ if(firedPort===null || e.fp===firedPort) scope.firedEdges.add(e.id); });
    /* 各输入端口的实际到达值（属性面板「运行数据」） */
    const inPreview = inEs(id).map((e, i)=>{
      const src = byId.get(e.fn);
      return {
        tp: e.tp,
        from: (src && (src.title || ((DEFS_META[src.type] || {}) as { name?: string }).name)) || '?',
        fromFp: e.fp,
        val: preview(inVals[i], 140),
      };
    });
    emit('node:done', { id, title, out: r.out, ms: r.ms, tokens: r.tokens, firePort: firedPort, iteration: iteration || null, inputs: inPreview });
    if(n.type === 'condition') emit('cond', { id, title, expr: p.expr, branch: r.firePort===0?'真':'假' });
  }

  /* ---------------- 主循环（单遍拓扑，动态可达：分支未激活即跳过） ---------------- */
  let stopped = false;
  try{
    for(const id of topo){
      if(ac.signal.aborted){ stopped = true; break; }
      if(onErrorAborted) break;   /* abort 策略 fail-fast：全部后续节点（含同级独立分支）不再调度（ADR-0022 §2.3） */
      if(mainScope.executed.has(id)) continue;            // 已被循环迭代执行过
      const es = inEs(id);
      if(es.length && !es.some(e=>mainScope.firedEdges.has(e.id))) continue;
      await runNode(id, mainScope, null, null);
    }
  }catch(e){
    stopped = ac.signal.aborted || isAbort(e);
    if(!stopped) throw e;
  }

  const ms = Date.now() - prog.t0;
  /* 变量表快照（属性面板「可用变量」提示的数据来源） */
  const varsSnap: Record<string, string> = {};
  for(const [k,v] of Object.entries(vars)) varsSnap[k] = preview(v, 100);
  const ok = !stopped && !onErrorAborted;   /* ok 语义扩展仅 abort 策略可达（标志位仅该策略置位），未配置/skip/retry 恒 ≡ !stopped（ADR-0022 §4.4） */
  emit('run:done', { ms, done: prog.done, total: Math.max(prog.total, prog.done), ok, stopped, outputs, vars: varsSnap });
  return { ms, done: prog.done, outputs, stopped, ok };
}
