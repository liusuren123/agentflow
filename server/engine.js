/* ================================================================
 *  engine.js — AgentFlow 真实工作流执行引擎（服务端）
 *  · 拓扑排序逐节点执行，与前端画布动画一一对应（事件驱动）
 *  · LLM 节点：Vercel AI SDK 7 streamText 流式 / generateText 工具循环
 *  · 条件分支：真实求值（expr.js，自研解析器，无 eval）
 *  · 循环节点：下游闭包子图按迭代反复执行（支持并发）
 *  · 人工审批：真实挂起，等待 /api/run/:id/approve
 *  · 代码节点：Python / JavaScript 均以独立子进程执行（5s 超时强杀，
 *    JSON over stdio 交换数据，服务进程内存不与用户代码共享）
 *  · HTTP / 知识库检索(TF-IDF) / 网页搜索 / Webhook 通知均为真实调用
 * ================================================================ */
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';
import { getModel, providerInfo } from './providers.js';
import { evalExpr } from './expr.js';
import { retrieve } from './kb.js';
import { webSearch } from './search.js';
import { collectTools, TOOL_SPECS } from './tools.js';
import { guardedFetch } from './guard.js';
import { spawn } from 'node:child_process';

const ABORT_MSG = 'The operation was aborted';

/* ---------------- 小工具 ---------------- */
const isAbort = e => !!(e && (e.name === 'AbortError' || /abort/i.test(String(e.message||''))));
const preview = (v, n=44) => { const s = toStr(v); return s.length>n ? s.slice(0,n)+'…' : s; };
function toStr(v){
  if(v == null) return '';
  if(typeof v === 'string') return v;
  if(typeof v === 'object'){
    if(v.__trigger) return '';
    try{ return JSON.stringify(v, null, 0); }catch{ return String(v); }
  }
  return String(v);
}
function render(tpl, vars){
  return String(tpl ?? '').replace(/\{\{\s*([\w\u4e00-\u9fa5.\[\]'"]+)\s*\}\}/g, (_, k)=>{
    let v;
    try{ v = evalExpr(k, vars); }catch{ v = undefined; }
    if(v == null) return '';
    return typeof v === 'object' ? toStr(v) : String(v);
  });
}
const renderIfTemplate = (s, vars) => /\{\{.*\}\}/.test(String(s||'')) ? render(s, vars) : s;
const strInput = (v, fallback='') => {
  if(typeof v === 'string' && v.trim()) return v;
  if(Array.isArray(v) && v.length) return v.map(x=>toStr(x)).join('\n');
  if(v && typeof v === 'object' && !v.__trigger){ return toStr(v); }
  return fallback;
};
const esc = s => String(s??'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- 主入口 ---------------- */
export async function executeWorkflow(ctx){
  const { wf, emit, ac } = ctx;
  const nodes = wf.nodes || [], edges = wf.edges || [];
  const byId = new Map(nodes.map(n=>[n.id, n]));
  const outEs = id => edges.filter(e=>e.fn===id);
  const inEs  = id => edges.filter(e=>e.tn===id);
  const P = n => ({ ...(paramsDefaults(n)), ...(n.params||{}) });

  const vars = { question: ctx.inputs?.question ?? '如何申请退货?' };  // 与 UI 演示一致的默认问题
  const outputs = [];
  ctx.outputs = outputs;
  const approvalWaiters = new Map();
  ctx.resolveApproval = (nodeId, ok, comment) => {
    const w = approvalWaiters.get(nodeId);
    if(w){ approvalWaiters.delete(nodeId); w({ ok, comment }); return true; }
    return false;
  };

  /* ---- 拓扑序（Kahn，与前端相同算法） ---- */
  const topo = (()=>{
    const indeg = {}; nodes.forEach(n=>indeg[n.id]=0);
    edges.forEach(e=>{ if(indeg[e.tn]!==undefined) indeg[e.tn]++; });
    const q = nodes.filter(n=>indeg[n.id]===0).map(n=>n.id);
    const order = [];
    while(q.length){
      const id = q.shift(); order.push(id);
      edges.filter(e=>e.fn===id).forEach(e=>{ if(--indeg[e.tn]===0) q.push(e.tn); });
    }
    return order;
  })();
  if(topo.length < nodes.length) emit('log', { lvl:'warn', msg:`⚠ 检测到 ${nodes.length-topo.length} 个节点不在执行路径上（可能存在环）` });
  ctx._topo = topo;

  const prog = ctx.progress = { done:0, total: topo.length, t0: Date.now() };
  const progress = () => emit('run:progress', { done: prog.done, total: prog.total, elapsed: Date.now()-prog.t0 });
  emit('run:start', { name: wf.name || '未命名工作流', total: prog.total });

  const mainScope = { results:new Map(), executed:new Set(), firedEdges:new Set() };

  function edgeValue(e, scope){
    const src = scope.results.get(e.fn);
    if(!src) return undefined;
    if(Array.isArray(src.ports) && src.ports.length) return src.ports[e.fp] !== undefined ? src.ports[e.fp] : src.value;
    return src.value;
  }

  /* ---------------- 单节点执行（scope/vars 可被循环迭代覆写） ---------------- */
  async function runNode(id, scope, iteration, varsOverride){
    const n = byId.get(id); if(!n) return;
    const meta = DEFS_META[n.type] || {};
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
    let r;
    try{
      const args = { n, p, def:meta, input, inVals, vars: effVars, scope, emit, iteration,
        approvalWaiters, byId, edges, outEs, inEs, ctx,
        sub: (cid, s2, v2, idx) => runNode(cid, s2, idx, v2) };
      r = await (HANDLERS[n.type] || HANDLERS.__pass)(ctx, args);
    }catch(e){
      scope.executed.add(id);
      prog.done++; progress();
      if(isAbort(e) || ac.signal.aborted){
        emit('node:error', { id, title, message:'已中止' });
        throw e;
      }
      emit('node:error', { id, title, message: String(e.message || e) });
      return;
    }
    scope.executed.add(id);
    scope.results.set(id, r);
    prog.done++; progress();
    /* 默认激活全部出边；条件分支只激活所选端口 */
    const firedPort = r && typeof r.firePort === 'number' ? r.firePort : null;
    outEs(id).forEach(e=>{ if(firedPort===null || e.fp===firedPort) scope.firedEdges.add(e.id); });
    emit('node:done', { id, title, out: r.out, ms: r.ms, tokens: r.tokens, firePort: firedPort, iteration: iteration || null });
    if(n.type === 'condition') emit('cond', { id, title, expr: p.expr, branch: r.firePort===0?'真':'假' });
  }

  /* ---------------- 主循环（单遍拓扑，动态可达：分支未激活即跳过） ---------------- */
  let stopped = false;
  try{
    for(const id of topo){
      if(ac.signal.aborted){ stopped = true; break; }
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
  emit('run:done', { ms, done: prog.done, total: Math.max(prog.total, prog.done), ok: !stopped, stopped, outputs });
  return { ms, done: prog.done, outputs, stopped };
}

/* ---------------- 节点元信息（与前端 DEFS 对齐） ---------------- */
const DEFS_META = {
  trigger:{name:'触发器'}, userinput:{name:'用户输入'}, llm:{name:'LLM 对话'}, prompt:{name:'提示词模板'},
  retrieval:{name:'知识库检索'}, websearch:{name:'网页搜索'}, http:{name:'HTTP 请求'}, code:{name:'代码执行'},
  notify:{name:'消息通知'}, condition:{name:'条件分支'}, loop:{name:'循环'}, delay:{name:'延时等待'},
  merge:{name:'合并'}, reply:{name:'直接回复'}, setvar:{name:'变量赋值'}, approval:{name:'人工审批'},
};
function paramsDefaults(n){
  const out = {};
  const ps = {
    trigger:[['mode','手动触发'],['cron','0 9 * * 1-5'],['path','/api/run']],
    userinput:[['var','question'],['vtype','文本'],['req',true],['defv','如何申请退货?']],
    llm:[['model','GLM-4.7'],['sys','你是智能客服助手，回答需准确、简洁、友好。'],['temp',0.7],['max',2048]],
    prompt:[['tpl','你是一名金牌客服。请结合以下资料回答用户问题：\n{{context}}\n\n用户问题：{{question}}']],
    retrieval:[['kb','产品手册 v2.3'],['topk',3],['th',0.5]],
    websearch:[['eng','Bing'],['max',5]],
    http:[['m','GET'],['url','https://api.example.com/v1/orders'],['to',30]],
    code:[['lang','Python'],['code','# 处理输入后返回\nresult = input\nreturn result']],
    notify:[['ch','邮件'],['to','support@team.com']],
    condition:[['expr','confidence > 0.7']],
    loop:[['max',10],['conc',false]],
    delay:[['s',2]],
    merge:[['mode','等待全部']],
    reply:[['tpl','{{content}}']],
    setvar:[['name','answer']],
    approval:[['role','值班经理'],['to','挂起']],
  }[n.type] || [];
  ps.forEach(([k,v])=>out[k]=v);
  return out;
}

/* ================================================================
 *  节点处理器
 * ================================================================ */
const HANDLERS = {
  async __pass(ctx, { input }){
    return { value: input ?? null, out: '完成' };
  },

  async trigger(ctx){
    return { value: { __trigger:true, run: ctx.runId, at: new Date().toISOString() }, out: `手动触发 · run #${String(ctx.runId).slice(0,6)}` };
  },

  async userinput(ctx, { p, vars }){
    const name = p.var || 'question';
    const v = ctx.inputs?.[name] ?? p.defv ?? '';
    vars[name] = v;
    return { value: v, out: `${name} = "${preview(v, 60)}"` };
  },

  async prompt(ctx, { p, input, vars }){
    const rendered = render(p.tpl ?? '', { ...vars, input });
    return { value: rendered, out: `模板渲染完成 · ${rendered.length} 字符` };
  },

  async retrieval(ctx, { p, input, vars, emit }){
    const q = strInput(input, vars.question || '');
    /* 两级阈值：原始余弦分数量级 ~0.05-0.4，先 ×4 归一化到直观 0-1 刻度，
       再用节点的「相似度阈值」参数（默认 0.5）过滤——与 UI 语义一致 */
    const raw = retrieve(p.kb || '产品手册 v2.3', q, 20, 0.02);
    const hits = raw
      .map(h=>({ ...h, score:+Math.min(0.99, h.score*4).toFixed(2) }))
      .filter(h=>h.score >= (Number(p.th)||0.5))
      .slice(0, Math.max(1, Number(p.topk)||3));
    vars.confidence = hits.length ? hits[0].score : 0;
    vars.context = hits.map(h=>`【${h.src}】${h.text}`).join('\n');
    if(!hits.length) emit('log', { lvl:'warn', msg:`知识库「${p.kb}」未命中任何片段（阈值 ${p.th}）` });
    return { value: hits, ports: [hits], out: `命中 ${hits.length} 条片段 · 最高相似度 ${vars.confidence || 0}` };
  },

  async websearch(ctx, { p, input, vars, emit }){
    const q = strInput(input, vars.question || '');
    const res = await webSearch(q, Number(p.max)||5);
    if(!res){
      emit('log', { lvl:'warn', msg:'搜索服务不可用（未配置 BOCHA_API_KEY 且 DuckDuckGo 不可达），本次跳过联网参考' });
      return { value: [], ports: [[]], out: '搜索不可用 · 已跳过联网参考（其余流程继续）' };
    }
    vars.results = res.results;
    vars.context_web = res.results.map((r,i)=>`${i+1}. ${r.title} — ${r.snippet}`).join('\n');
    return { value: res.results, ports: [res.results], out: `${res.engine} 返回 ${res.results.length} 条结果` };
  },

  async http(ctx, { p, input }){
    const method = (p.m||'GET').toUpperCase();
    const opt = { method, headers:{'User-Agent':'AgentFlow/1.0'}, signal: AbortSignal.timeout((Number(p.to)||30)*1000) };
    if(['POST','PUT','PATCH'].includes(method) && input != null){
      opt.headers['Content-Type'] = 'application/json';
      opt.body = typeof input === 'string' ? input : JSON.stringify(input);
    }
    const t = Date.now();
    const r = await guardedFetch(p.url, opt);   /* SSRF 守卫：私网/回环默认拦截 */
    const ms = Date.now() - t;
    const ct = r.headers.get('content-type') || '';
    const txt = (await r.text()).slice(0, 50000);
    let data;
    try{ data = JSON.parse(txt); }catch{ data = txt.slice(0, 2000); }
    return { value: { status:r.status, ms, contentType:ct, data }, out: `${r.status} · ${ms}ms · ${ct.split(';')[0]}` };
  },

  async code(ctx, { p, input, vars, emit }){
    const t = Date.now();
    const logs = [];
    const result = await runUserCode(p.lang || 'Python', p.code || '', input, vars, logs);
    logs.slice(0,10).forEach(l=>emit('log',{lvl:'info',msg:'<span style="color:var(--text3)">stdout:</span> '+esc(l)}));
    const tdesc = Array.isArray(result) ? `数组(${result.length})`
      : result && typeof result === 'object' ? `对象(${Object.keys(result).length} 字段)`
      : typeof result;
    return { value: result, out: `执行成功 · ${Date.now()-t}ms · 返回 ${tdesc}` };
  },

  async notify(ctx, { p, input, vars, emit }){
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

  async condition(ctx, { p, input, vars }){
    const scope = { ...vars, input };
    let truth;
    try{
      truth = !!evalExpr(p.expr, scope);
    }catch(e){
      throw new Error(`条件表达式错误：${e.message}`);
    }
    return { value: input ?? null, ports: [input ?? null, input ?? null], firePort: truth?0:1,
      out: `表达式 ${p.expr} 判定为 ${truth?'真':'假'}` };
  },

  async loop(ctx, args){
    const { n, p, input, vars, scope, emit, ctx: runCtx, edges, sub } = args;
    const list = Array.isArray(input) ? input : (input == null || input === '' ? [] : [input]);
    const maxIter = Math.min(100, Math.max(1, Number(p.max)||10));
    const items = list.slice(0, maxIter);
    if(!items.length) return { value: [], out: '输入为空 · 0 次迭代' };

    /* 下游闭包：从循环节点出边出发，只收纳「全部上游都在闭包内（或是循环自身）」的节点 */
    const closure = new Set();
    const cand = new Set(edges.filter(e=>e.fn===n.id).map(e=>e.tn));
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
    const topo = runCtx._topo;
    const closureOrder = [...closure].sort((a,b)=>topo.indexOf(a)-topo.indexOf(b));

    const iterTotal = items.length;
    emit('log', { lvl:'sys', msg:`⟳ 循环开始 · ${iterTotal} 个元素 × ${closureOrder.length} 个下游节点` });
    if(closureOrder.length) runCtx.progress.total += closureOrder.length * (iterTotal-1);

    const runIteration = async (item, idx) => {
      const iterVars = { ...vars, item, index: idx };
      const iterScope = { results:new Map(scope.results), executed:new Set(), firedEdges:new Set(scope.firedEdges) };
      /* 循环节点在当前迭代中的输出 = 本轮元素（handler 尚未返回，需手动注入迭代作用域） */
      iterScope.results.set(n.id, { value: item, ports: [item] });
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
        await runIteration(items[i], i);
      }
    }
    return { value: items, ports: [items[items.length-1]], out: `迭代 ${items.length}/${iterTotal} 完成` };
  },

  async delay(ctx, { p }){
    const s = Math.min(60, Math.max(0.1, Number(p.s)||1));
    await abortableSleep(s*1000, ctx.ac.signal);
    return { value: null, out: `等待 ${s}s 完成` };
  },

  async merge(ctx, { p, inVals }){
    const got = inVals.map(v=>v===undefined?null:v);
    let value;
    if((p.mode||'等待全部')==='任一到达'){
      value = got.find(v=>v!=null) ?? null;
    } else {
      value = { A: got[0] ?? null, B: got[1] ?? null };
    }
    const n = got.filter(v=>v!=null).length;
    return { value, out: `已合并 ${n} 路输入` };
  },

  async reply(ctx, { p, input, vars, emit }){
    const content = input ?? vars.answer ?? '';
    const rendered = render(p.tpl ?? '{{content}}', { ...vars, content });
    vars.content = content;
    ctx.outputs.push(rendered);
    emit('output', { text: rendered });
    return { value: rendered, out: `已输出回复 · ${rendered.length} 字` };
  },

  async setvar(ctx, { p, input, vars }){
    const name = p.name || 'answer';
    vars[name] = input ?? null;
    return { value: input ?? null, out: `${name} 已写入变量` };
  },

  async approval(ctx, { n, p, input, emit, approvalWaiters, ctx: runCtx }){
    const policy = p.to || '挂起';
    let ok = true, note = '';
    if(policy === '自动通过'){ ok = true; }
    else if(policy === '自动拒绝'){ ok = false; }
    else {
      emit('approval:required', { runId: runCtx.runId, nodeId: n.id, title: n.title || '人工审批',
        role: p.role || '审批人', inputPreview: preview(input, 200) });
      const res = await new Promise((resolve)=>{
        const timer = setTimeout(()=>{ approvalWaiters.delete(n.id); resolve({ ok:true, comment:'等待超时(10分钟)，自动通过' }); }, 10*60*1000);
        approvalWaiters.set(n.id, v=>{ clearTimeout(timer); resolve(v); });
        runCtx.ac.signal.addEventListener('abort', ()=>{ clearTimeout(timer); resolve({ ok:false, comment:'运行已中止' }); }, { once:true });
      });
      ok = res.ok;
      if(res.comment) note = ` · ${res.comment}`;
      emit('approval:done', { nodeId: n.id, approve: ok });
    }
    return { value: input ?? null, out: `审批${ok?'通过':'拒绝'} · ${p.role || '审批人'}${note}` };
  },
};

/* ================================================================
 *  LLM 节点（流式 / MCP 工具循环）
 * ================================================================ */
HANDLERS.llm = async (ctx, args) => {
  const { n, p, input, inVals, vars, emit, ctx: runCtx } = args;
  const model = getModel(p.model);
  if(!model){
    throw new Error(`模型服务未配置（${providerInfo().note}）`);
  }
  /* 提示词：上游「提示词」端口；上下文：上游「上下文」端口 */
  let promptText = strInput(inVals[0], '');
  promptText = renderIfTemplate(promptText, vars);   // {{context}} 等到此时才填充（依赖检索结果）
  const ctxRaw = inVals[1];
  let contextText = '';
  if(Array.isArray(ctxRaw) && ctxRaw.length){
    contextText = ctxRaw.map(h => h && typeof h==='object' ? `【${h.src||'片段'}】${h.text||toStr(h)}` : toStr(h)).join('\n');
  } else if(ctxRaw != null && !ctxRaw.__trigger){
    contextText = toStr(ctxRaw);
  }
  if(!promptText) promptText = vars.question || strInput(input, '');
  let userMsg = promptText || '(请根据系统提示词回答)';
  if(contextText) userMsg += `\n\n【参考资料】\n${contextText.slice(0, 6000)}`;

  const sys = (p.sys || '') + ((n.skills||[]).length ? `\n\n你装配了以下技能，可按需运用其方法：${n.skills.join('、')}` : '');
  const temperature = Number(p.temp ?? 0.7);
  const maxOutputTokens = Math.min(32768, Math.max(64, Number(p.max)||2048));
  const t0 = Date.now();
  const toolImpls = collectTools(n.mcp);
  let text = '', tokens = 0;

  if(toolImpls.size){
    /* ---- 工具循环（generateText，最多 3 轮；失败自动降级为无工具调用） ---- */
    const zTools = {};
    const keyOf = new Map();   // 安全工具名 → 原名
    for(const [name, impl] of toolImpls){
      const spec = TOOL_SPECS[name] || { desc:name, schema:{} };
      const shape = {};
      for(const [k, d] of Object.entries(spec.schema||{})){
        shape[k] = /数量|count/i.test(k) ? z.number().optional().describe(String(d)) : z.string().optional().describe(String(d));
      }
      const safe = name.replace(/[^\w]/g,'_');   /* OpenAI 函数名仅允许 \w，连字符/点号一并清洗 */
      keyOf.set(safe, name);
      zTools[safe] = tool({ description: spec.desc, inputSchema: z.object(shape), execute: async (a)=>{
        const res = await impl(a || {});
        emit('log', { lvl:'sys', msg:`🔧 工具调用 ${name}(${preview(a,40)}) → ${preview(res,60)}` });
        return res;
      }});
    }
    try{
      /* AI SDK 7：system 提示词必须走独立参数，不允许出现在 messages 里 */
      let messages = [{ role:'user', content: userMsg }];
      for(let round=1; round<=3; round++){
        const res = await generateText({ model, system: sys || undefined, messages, tools:zTools, temperature, maxOutputTokens, abortSignal: ctx.ac.signal });
        tokens += (res.usage?.totalTokens || res.usage?.outputTokens || 0);
        if(res.toolCalls && res.toolCalls.length){
          emit('log', { lvl:'sys', msg:`🤖 模型请求调用工具：${res.toolCalls.map(tc=>keyOf.get(tc.toolName)||tc.toolName).join(', ')}（第 ${round} 轮）` });
          /* 工具已在 execute 回调中真实执行；response.messages 已含 assistant 调用与 tool 结果，直接续接 */
          messages = messages.concat(res.response.messages);
          continue;
        }
        text = res.text || '';
        break;
      }
    }catch(e){
      if(isAbort(e) || ctx.ac.signal.aborted) throw e;
      emit('log', { lvl:'warn', msg:`工具循环异常（${String(e.message||e)}），降级为直接生成` });
      const res = await generateText({ model, system: sys || undefined, prompt: userMsg, temperature, maxOutputTokens, abortSignal: ctx.ac.signal });
      tokens += (res.usage?.totalTokens || res.usage?.outputTokens || 0);
      text = res.text || '';
    }
    emit('node:delta', { id:n.id, text });
  } else {
    /* ---- 纯流式（streamText，逐 token 推送到画布打字机） ---- */
    let lastEmit = 0, acc = '', lastErr = null;
    const result = streamText({
      model, system: sys || undefined, prompt: userMsg, temperature, maxOutputTokens,
      abortSignal: ctx.ac.signal,
      onError({ error }){ lastErr = error; },
    });
    for await (const d of result.textStream){
      acc += d;
      const nowT = Date.now();
      if(nowT - lastEmit > 60){ emit('node:delta', { id:n.id, text: acc }); lastEmit = nowT; }
    }
    emit('node:delta', { id:n.id, text: acc });
    text = acc || await result.text.catch(()=> '');
    try{ const u = await result.usage; tokens = u?.totalTokens || u?.outputTokens || 0; }catch{}
    if(!text && lastErr) throw new Error(`模型调用失败：${lastErr.message || String(lastErr)}`);
    if(!text) throw new Error('模型返回为空');
  }

  const cap = capSummaryServer(n);
  const capsTxt = (cap.servers?` · MCP ${cap.servers} 服务/${cap.tools} 工具`:'') + (cap.skills?` · 技能 ${cap.skills}`:'');
  emit('log', { lvl:'ok', msg:`✓ ${n.title||'LLM'} · 生成 ${tokens||'?'} tokens${capsTxt} · ${((Date.now()-t0)/1000).toFixed(1)}s` });
  return {
    value: text,
    ports: [text],
    tokens: tokens || undefined,
    out: text.length > 160 ? text.slice(0,160)+'…' : text,
  };
};

function capSummaryServer(n){
  let tools=0, servers=0;
  Object.entries(n.mcp||{}).forEach(([sid,arr])=>{ if(arr&&arr.length){ servers++; tools+=arr.length; } });
  return { servers, tools, skills:(n.skills||[]).length };
}

/* ================================================================
 *  代码节点：Python / JavaScript 均在独立子进程中执行
 *  协议：stdin 传入 JSON {input, vars}；stdout 末行 __AF_RESULT__<json>
 *  5 秒超时强杀；进程内无服务端对象，天然隔离
 * ================================================================ */
function runUserCode(lang, code, input, vars, logs){
  return new Promise((resolve, reject)=>{
    let wrapper;
    const py = process.platform === 'win32' ? 'python' : 'python3';
    if(lang === 'JavaScript'){
      /* 用户代码在函数体内执行：显式 return 优先生效；
         未 return 时回退取其设置的 result 变量（非严格模式下为全局赋值，typeof 可安全探测） */
      const body = String(code) + '\n;return (typeof result === "undefined" ? undefined : result);';
      wrapper = [
        "let __af_chunks=[];",
        "process.stdin.on('data',d=>__af_chunks.push(d));",
        "process.stdin.on('end',()=>{",
        "  const __af_in=JSON.parse(Buffer.concat(__af_chunks).toString()||'{}');",
        "  const input=__af_in.input, vars=__af_in.vars;",
        "  const __af_str=x=>{try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}};",
        "  const console={log:(...a)=>process.stdout.write(a.map(__af_str).join(' ')+'\\n')};",
        "  let result;",
        "  const __af_out=(function(){",
        body,
        "  })();",
        "  process.stdout.write('__AF_RESULT__'+JSON.stringify(__af_out===undefined?null:__af_out));",
        "});",
      ].join('\n');
    } else {
      const indented = String(code).split('\n').map(l=>'    '+l).join('\n');
      wrapper = [
        'import json, sys, math, re, datetime',
        '__af_in = json.loads(sys.stdin.read() or "{}")',
        'input = __af_in.get("input")',
        'vars = __af_in.get("vars", {})',
        'def __af_main():',
        indented,
        '    return locals().get("result")',
        '__af_out = __af_main()',
        'sys.stdout.write("__AF_RESULT__" + json.dumps(__af_out, ensure_ascii=False, default=str))',
      ].join('\n');
    }
    const cmd = lang === 'JavaScript' ? process.execPath : py;
    const argv = lang === 'JavaScript' ? ['--input-type=commonjs', '-e', wrapper] : ['-I', '-c', wrapper];
    let child;
    try{
      child = spawn(cmd, argv, { stdio:['pipe','pipe','pipe'] });
    }catch(e){ reject(new Error(`无法启动 ${lang} 运行时：${e.message}`)); return; }
    let out = '', err = '', killed = false;
    const timer = setTimeout(()=>{ killed = true; child.kill(); }, 5000);
    child.stdout.on('data', d=>out += d);
    child.stderr.on('data', d=>err += d);
    child.on('error', e=>{ clearTimeout(timer); reject(new Error(`无法启动 ${lang} 运行时（${cmd}）：${e.message}`)); });
    child.on('close', codeNum=>{
      clearTimeout(timer);
      out.split(/\r?\n/).filter(Boolean).forEach(l=>{ if(!l.startsWith('__AF_RESULT__')) logs.push(l); });
      if(killed){ reject(new Error(`${lang} 执行超时（5s），已终止`)); return; }
      if(codeNum !== 0){ reject(new Error(`${lang} 退出码 ${codeNum}：${err.slice(-300)}`)); return; }
      const m = out.match(/__AF_RESULT__([\s\S]*)$/);
      if(!m){ resolve(null); return; }
      try{ resolve(JSON.parse(m[1])); }catch{ resolve(m[1]); }
    });
    child.stdin.write(JSON.stringify({ input: input ?? null, vars }));
    child.stdin.end();
  });
}

const abortableSleep = (ms, signal) => new Promise((resolve, reject)=>{
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', ()=>{ clearTimeout(t); reject(Object.assign(new Error(ABORT_MSG), {name:'AbortError'})); }, { once:true });
});
