/* ================================================================
 *  handlers.ts — 节点处理器（基础 16 种；LLM 见 llm.ts）
 *  自 engine.js 原文拆出，逻辑逐字保留（ADR-0004 TS 化拆分）。
 * ================================================================ */
import { paramDefaultsOf } from '@agentflow/shared';
import { evalExpr } from './expr.js';
import { retrieve } from './kb.js';
import { webSearch, strictBochaSearch, strictSearxngSearch } from './search.js';
import { guardedFetch } from './guard.js';
import { runUserCode } from './code.js';
import { abortableSleep, preview, render, strInput, toStr, esc } from './util.js';
import { parseAgentRole, runAgentReview } from './approval-review.js';
import type { AgentReviewResult } from './approval-review.js';
import { recordApprovalAudit } from './store.js';
import type { NodeHandler, NodeResult } from './types.js';

export const BASIC_HANDLERS: Record<string, NodeHandler> = {
  async __pass(_ctx, { input }): Promise<NodeResult> {
    return { value: input ?? null, out: '完成' };
  },

  async trigger(ctx): Promise<NodeResult> {
    return { value: { __trigger: true, run: ctx.runId, at: new Date().toISOString() }, out: `手动触发 · run #${String(ctx.runId).slice(0,6)}` };
  },

  async userinput(ctx, { p, vars }): Promise<NodeResult> {
    const name = p.var || 'question';
    const v = ctx.inputs?.[name] ?? p.defv ?? '';
    vars[name] = v;
    return { value: v, out: `${name} = "${preview(v, 60)}"` };
  },

  async prompt(_ctx, { p, input, vars }): Promise<NodeResult> {
    const rendered = render(p.tpl ?? '', { ...vars, input });
    return { value: rendered, out: `模板渲染完成 · ${rendered.length} 字符` };
  },

  async retrieval(_ctx, { p, input, vars, emit }): Promise<NodeResult> {
    const q = strInput(input, vars.question || '');
    /* 两级阈值：原始余弦分数量级 ~0.05-0.4，先 ×4 归一化到直观 0-1 刻度，
       再用节点的「相似度阈值」参数（默认 0.5）过滤——与 UI 语义一致 */
    const raw = retrieve(p.kb || '产品手册 v2.3', q, 20, 0.02);
    const hits = raw
      .map(h=>({ ...h, score:+Math.min(0.99, h.score*4).toFixed(2) }))
      .filter(h=>h.score >= (Number(p.th)||0.5))
      .slice(0, Math.max(1, Number(p.topk)||3));
    vars.confidence = hits.length ? hits[0]!.score : 0;
    vars.context = hits.map(h=>`【${h.src}】${h.text}`).join('\n');
    if(!hits.length) emit('log', { lvl:'warn', msg:`知识库「${p.kb}」未命中任何片段（阈值 ${p.th}）` });
    return { value: hits, ports: [hits], out: `命中 ${hits.length} 条片段 · 最高相似度 ${vars.confidence || 0}` };
  },

  async websearch(_ctx, { p, input, vars, emit }): Promise<NodeResult> {
    const q = strInput(input, vars.question || '');
    const eng = String(p.eng ?? 'Bing');
    const n = Number(p.max) || 5;
    /* 严格路由（迭代 0005 · BK-0007）：显式选择博查/SearXNG = 明确用户意图，
       未配置/失败一律如实跳过并指明原因，绝不静默换引擎（REQ-0007-01） */
    if(eng === '博查' || eng === 'SearXNG'){
      const r = eng === '博查' ? await strictBochaSearch(q, n) : await strictSearxngSearch(q, n);
      if(!Array.isArray(r) && 'skipped' in r && r.skipped){
        emit('log', { lvl:'warn', msg:`搜索不可用：引擎「${eng}」${r.reason}，本次跳过联网参考（不回退其他引擎）` });
        return { value: [], ports: [[]], out: `搜索不可用 · 已跳过联网参考（eng=${eng} · ${r.reason}）` };
      }
      /* 成功（含 0 条结果；空查询 [] 走同款存量边缘，不新增特判） */
      const res = r as { engine: string; results: { title: string; url: string; snippet: string }[] };
      vars.results = res.results;
      vars.context_web = res.results.map((x,i)=>`${i+1}. ${x.title} — ${x.snippet}`).join('\n');
      return { value: res.results, ports: [res.results], out: `${res.engine} 返回 ${res.results.length} 条结果` };
    }
    /* Bing/Google/未知值：后端未接入真实 API——先如实标注，再维持既有回退链（存量零回归） */
    emit('log', { lvl:'warn', msg:`引擎「${eng}」未接入 AgentFlow 后端，已按回退链（博查 → DuckDuckGo）执行` });
    const res = (await webSearch(q, n)) as { engine: string; results: { title: string; url: string; snippet: string }[] } | null;
    if(!res){
      emit('log', { lvl:'warn', msg:'搜索服务不可用（未配置 BOCHA_API_KEY 且 DuckDuckGo 不可达），本次跳过联网参考' });
      return { value: [], ports: [[]], out: '搜索不可用 · 已跳过联网参考（其余流程继续）' };
    }
    vars.results = res.results;
    vars.context_web = res.results.map((r,i)=>`${i+1}. ${r.title} — ${r.snippet}`).join('\n');
    return { value: res.results, ports: [res.results], out: `${res.engine} 返回 ${res.results.length} 条结果` };
  },

  async http(_ctx, { p, input }): Promise<NodeResult> {
    const method = (p.m||'GET').toUpperCase();
    const opt: { method: string; headers: Record<string, string>; signal: AbortSignal; body?: string } = { method, headers:{'User-Agent':'AgentFlow/1.0'}, signal: AbortSignal.timeout((Number(p.to)||30)*1000) };
    if(['POST','PUT','PATCH'].includes(method) && input != null){
      opt.headers['Content-Type'] = 'application/json';
      opt.body = typeof input === 'string' ? input : JSON.stringify(input);
    }
    const t = Date.now();
    const r = await guardedFetch(p.url, opt);   /* SSRF 守卫：私网/回环默认拦截 */
    const ms = Date.now() - t;
    const ct = r.headers.get('content-type') || '';
    const txt = (await r.text()).slice(0, 50000);
    let data: unknown;
    try{ data = JSON.parse(txt); }catch{ data = txt.slice(0, 2000); }
    return { value: { status:r.status, ms, contentType:ct, data }, out: `${r.status} · ${ms}ms · ${ct.split(';')[0]}` };
  },

  async code(_ctx, { p, input, vars, emit }): Promise<NodeResult> {
    const t = Date.now();
    const logs: string[] = [];
    /* BUG-0012 兜底（迭代 0014 / BK-0022）：前端切 lang 只写 lang 不动代码框（app.js
       change 处理器直写 params），引擎默认合并出 lang=JavaScript + Python 默认样例的
       错配组合，JS wrapper 会把样例首行 # 注释按函数体语法执行即 SyntaxError。窄口径
       兜底：仅「lang=JavaScript 且 code 逐字等于 DEFS 默认样例」时替换为 JS 等价样例
       并告知（默认样例经 paramDefaultsOf 取自 shared 单一来源，不本地复制字面量；
       JS 等价串为本执行层常量，非 DEFS 复制——DEFS 无 JS 样例）；其余组合零行为
       变化，不猜测语言。 */
    const pySample = paramDefaultsOf('code').code as string;
    let src = p.code || '';
    if(p.lang === 'JavaScript' && src === pySample){
      src = '// 处理输入后返回\nresult = input\nreturn result';
      emit('log', { lvl:'warn', msg:'code 节点默认样例与所选语言不匹配，已替换为等价样例执行（lang=JavaScript，编辑代码框可覆盖）' });
    }
    const result = await runUserCode(p.lang || 'Python', src, input, vars, logs);
    logs.slice(0,10).forEach(l=>emit('log',{lvl:'info',msg:'<span style="color:var(--text3)">stdout:</span> '+esc(l)}));
    const tdesc = Array.isArray(result) ? `数组(${result.length})`
      : result && typeof result === 'object' ? `对象(${Object.keys(result).length} 字段)`
      : typeof result;
    return { value: result, out: `执行成功 · ${Date.now()-t}ms · 返回 ${tdesc}` };
  },

  async notify(ctx, { p, input, vars, emit }): Promise<NodeResult> {
    const content = toStr(input) || vars.answer || vars.content || '';
    if((p.ch==='Webhook') && /^https?:\/\//.test(p.to||'')){
      const r = await guardedFetch(p.to, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ from:'AgentFlow', workflow: ctx.wf.name, content, ts:new Date().toISOString() }),
        signal: AbortSignal.timeout(15000) });   /* SSRF 守卫 */
      return { value: content, out: `已推送 Webhook · ${r.status}` };
    }
    emit('log', { lvl:'info', msg:`通知渠道「${p.ch}」未接入真实发送，已记录内容（${preview(content,60)}）` });
    return { value: content, out: `通知已通过${p.ch}发送 (渠道未接入，已记录)` };
  },

  async condition(_ctx, { p, input, vars }): Promise<NodeResult> {
    const scope = { ...vars, input };
    let truth: boolean;
    try{
      truth = !!evalExpr(p.expr, scope);
    }catch(e){
      throw new Error(`条件表达式错误：${(e as Error).message}`);
    }
    return { value: input ?? null, ports: [input ?? null, input ?? null], firePort: truth?0:1,
      out: `表达式 ${p.expr} 判定为 ${truth?'真':'假'}` };
  },

  async loop(_ctx, args): Promise<NodeResult> {
    const { n, p, input, vars, scope, emit, ctx: runCtx, edges, sub } = args;
    const list = Array.isArray(input) ? input : (input == null || input === '' ? [] : [input]);
    const maxIter = Math.min(100, Math.max(1, Number(p.max)||10));
    const items = list.slice(0, maxIter);
    if(!items.length) return { value: [], out: '输入为空 · 0 次迭代' };

    /* 下游闭包：从循环节点出边出发，只收纳「全部上游都在闭包内（或是循环自身）」的节点 */
    const closure = new Set<number>();
    const cand = new Set<number>(edges.filter(e=>e.fn===n.id).map(e=>e.tn));
    let changed = true;
    while(changed){
      changed = false;
      for(const c of [...cand]){
        if(closure.has(c)) continue;
        const upstream = edges.filter(e=>e.tn===c).map(e=>e.fn);
        if(upstream.every(u => u===n.id || closure.has(u))){
          closure.add(c); changed = true;
          edges.filter(e=>e.fn===c).forEach(e=>cand.add(e.tn));
        }
      }
    }
    const topo = runCtx._topo || [];
    const closureOrder = [...closure].sort((a,b)=>topo.indexOf(a)-topo.indexOf(b));

    const iterTotal = items.length;
    emit('log', { lvl:'sys', msg:`⟳ 循环开始 · ${iterTotal} 个元素 × ${closureOrder.length} 个下游节点` });
    if(closureOrder.length) runCtx.progress!.total += closureOrder.length * (iterTotal-1);

    const runIteration = async (item: unknown, idx: number) => {
      const iterVars = { ...vars, item, index: idx };
      const iterScope = { results:new Map(scope.results), executed:new Set<number>(), firedEdges:new Set(scope.firedEdges) };
      /* 循环节点在当前迭代中的输出 = 本轮元素（handler 尚未返回，需手动注入迭代作用域；out 仅展示用，此处不参与） */
      iterScope.results.set(n.id, { value: item, ports: [item] } as NodeResult);
      edges.filter(e=>e.fn===n.id).forEach(e=>iterScope.firedEdges.add(e.id));
      for(const cid of closureOrder){
        if(runCtx.ac.signal.aborted) break;
        await sub(cid, iterScope, iterVars, idx+1);
      }
      /* 末次迭代结果写回主作用域，供闭包之外的下游节点使用 */
      iterScope.results.forEach((v,k)=>{ if(closure.has(k)) scope.results.set(k,v); });
      closure.forEach(k=>scope.executed.add(k));
      emit('log', { lvl:'sys', msg:`⟳ 迭代 ${idx+1}/${iterTotal} 完成 · item=${preview(item,30)}` });
    };

    if(p.conc){
      const CONC = 3;
      for(let i=0; i<items.length; i+=CONC){
        await Promise.all(items.slice(i,i+CONC).map((it,k)=>runIteration(it, i+k)));
      }
    } else {
      for(let i=0; i<items.length; i++){
        if(runCtx.ac.signal.aborted) break;
        await runIteration(items[i]!, i);
      }
    }
    return { value: items, ports: [items[items.length-1]], out: `迭代 ${items.length}/${iterTotal} 完成` };
  },

  async delay(ctx, { p }): Promise<NodeResult> {
    const s = Math.min(60, Math.max(0.1, Number(p.s)||1));
    await abortableSleep(s*1000, ctx.ac.signal);
    return { value: null, out: `等待 ${s}s 完成` };
  },

  async merge(_ctx, { p, inVals }): Promise<NodeResult> {
    const got = inVals.map(v=>v===undefined?null:v);
    let value: unknown;
    if((p.mode||'等待全部')==='任一到达'){
      value = got.find(v=>v!=null) ?? null;
    } else {
      value = { A: got[0] ?? null, B: got[1] ?? null };
    }
    const n = got.filter(v=>v!=null).length;
    return { value, out: `已合并 ${n} 路输入` };
  },

  async reply(ctx, { p, input, vars, emit }): Promise<NodeResult> {
    const content = input ?? vars.answer ?? '';
    const rendered = render(p.tpl ?? '{{content}}', { ...vars, content });
    vars.content = content;
    ctx.outputs!.push(rendered);
    emit('output', { text: rendered });
    return { value: rendered, out: `已输出回复 · ${rendered.length} 字` };
  },

  async termview(ctx, { input, emit }): Promise<NodeResult> {
    const text = toStr(input);
    ctx.outputs!.push(text);
    emit('output', { text });
    return { value: text, out: `已呈现流 · ${text.length} 字` };
  },

  async setvar(_ctx, { p, input, vars }): Promise<NodeResult> {
    const name = p.name || 'answer';
    vars[name] = input ?? null;
    return { value: input ?? null, out: `${name} 已写入变量` };
  },

  /* webshow（迭代 0033 / BK-0036 修宪轮）：呈现型 sink，reply 同构。
     协议白名单 http(s)：与前端 app.js WS_HTTP_S 同字面量双保险（ADR-0015 §4.1，
     两端各自独立校验）。零出站：不抓取、不代理、不转存——本节点仅校验并透传
     网址字符串，内容获取归既有 http 节点（出站走 guard.ts 的现状不变）。 */
  async webshow(ctx, { p, input, emit }): Promise<NodeResult> {
    const cand = [strInput(input, ''), String(p.url ?? '')]   /* 输入端口值优先，静态兜底参数兜底 */
      .map(s => s.trim())
      .find(s => /^https?:\/\/\S+$/i.test(s));
    if (!cand) {
      /* 降级分支：warn + 占位，不伪造结果（outputs 不汇入、不 emit output 事件） */
      emit('log', { lvl: 'warn',
        msg: 'webshow：输入与静态兜底均无有效 http(s) 网址，已占位降级呈现（不伪造结果）' });
      return { value: '', out: '未呈现 · 无有效网址（占位降级）' };
    }
    ctx.outputs!.push(cand);                                  /* reply 同构：run 产物汇入 */
    emit('output', { text: cand });                           /* 既有事件类型，零新增 */
    return { value: cand, out: `已呈现网页 · ${preview(cand, 80)}` };
  },

  async approval(_ctx, { n, p, input, emit, approvalWaiters, byId, ctx: runCtx }): Promise<NodeResult> {
    const policy = p.to || '挂起';
    let ok = true, note = '';
    const reviewerText = p.role || '审批人';
    /* 人工挂起分支（现状语句逐字保留；含互审失败回退；迭代 0016 仅追加审计行）——
     * 提为闭包供「无前缀挂起」与「互审失败回退」两条路径真正执行（BUG-0013 修复：
     * 原实现在互审块自然结束后落入末尾 return，ok 保持初始 true 即静默自动通过） */
    const humanApproval = async (): Promise<void> => {
      emit('approval:required', { runId: runCtx.runId, nodeId: n.id, title: n.title || '人工审批',
        role: p.role || '审批人', inputPreview: preview(input, 200) });
      runCtx.log.info({ nodeId: n.id, title: n.title || '人工审批', role: p.role || '审批人' }, '审批挂起：等待人工决议');
      const res = await new Promise<{ ok: boolean; comment: string }>((resolve)=>{
        const timer = setTimeout(()=>{ approvalWaiters.delete(n.id); resolve({ ok:true, comment:'等待超时(10分钟)，自动通过' }); }, 10*60*1000);
        approvalWaiters.set(n.id, v=>{ clearTimeout(timer); resolve(v); });
        runCtx.ac.signal.addEventListener('abort', ()=>{ clearTimeout(timer); resolve({ ok:false, comment:'运行已中止' }); }, { once:true });
      });
      ok = res.ok;
      if(res.comment) note = ` · ${res.comment}`;
      recordApprovalAudit(runCtx.runId, n.id, reviewerText, 'human', ok ? 'allow' : 'deny', res.comment || null);
      emit('approval:done', { nodeId: n.id, approve: ok });
      runCtx.log.info({ nodeId: n.id, approve: ok, comment: res.comment || undefined }, '审批决议');
    };
    const agentId = parseAgentRole(p.role);
    if(agentId !== null){
      /* ---- 智能体互审（迭代 0016 / BK-0017）：role=node:<id> 指派画布 LLM 节点为审官 ----
       * 裁决子任务与审官节点自身的拓扑执行互不影响（approval-review.ts 头注）；
       * 裁决失败降级链（SPEC §4.4）：挂起→回退人工全链路；自动通过/拒绝→按超时策略降级。 */
      const reviewer = byId.get(agentId);
      let review: AgentReviewResult;
      if(!reviewer || reviewer.type !== 'llm'){
        review = { kind:'fail', why: !reviewer ? `审官节点不可用：node:${agentId} 不存在` : '审官节点不可用：节点类型不是 LLM' };
      } else {
        emit('log', { lvl:'sys', msg:`⚖ 互审裁决中 · 审官 ${reviewer.title || 'LLM'}（node:${reviewer.id}）` });
        review = await runAgentReview(runCtx, reviewer, { wfName: runCtx.wf.name, nodeTitle: n.title || '人工审批', nodeId: n.id, inputPreview: preview(input, 200) });
      }
      if(review.kind === 'verdict'){
        ok = review.ok;
        recordApprovalAudit(runCtx.runId, n.id, reviewerText, 'agent', ok ? 'allow' : 'deny', review.reason ?? null);
        emit('approval:done', { nodeId: n.id, approve: ok });
        runCtx.log.info({ nodeId: n.id, approve: ok, reviewer: reviewerText, reason: review.reason ?? undefined }, '智能体裁决');
        return { value: input ?? null, out: `审批${ok?'通过':'拒绝'} · 智能体裁决 · 审官 ${reviewer?.title || 'LLM'}（node:${agentId}）${review.reason ? ` · ${review.reason}` : ''}` };
      }
      if(policy === '自动通过' || policy === '自动拒绝'){
        ok = policy === '自动通过';
        recordApprovalAudit(runCtx.runId, n.id, reviewerText, 'agent-fallback', ok ? 'allow' : 'deny', `裁决失败：${review.why}`);
        emit('log', { lvl:'warn', msg:`⚖ 互审裁决失败（${review.why}），按超时策略「${policy}」降级` });
        emit('approval:done', { nodeId: n.id, approve: ok });
        return { value: input ?? null, out: `审批${ok?'通过':'拒绝'} · ${reviewerText}（裁决失败降级：${preview(review.why, 60)}）` };
      }
      /* 挂起（及未知 to 值）→ 回退人工全链路（安全侧默认：裁决失败不自动放行） */
      emit('log', { lvl:'warn', msg:`⚖ 互审裁决失败（${review.why}），回退人工审批` });
      await humanApproval();
    }
    else if(policy === '自动通过'){ ok = true; recordApprovalAudit(runCtx.runId, n.id, reviewerText, 'auto', 'allow', `超时策略「${policy}」`); }
    else if(policy === '自动拒绝'){ ok = false; recordApprovalAudit(runCtx.runId, n.id, reviewerText, 'auto', 'deny', `超时策略「${policy}」`); }
    else { await humanApproval(); }
    return { value: input ?? null, out: `审批${ok?'通过':'拒绝'} · ${p.role || '审批人'}${note}` };
  },
};
