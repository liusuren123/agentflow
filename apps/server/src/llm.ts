/* ================================================================
 *  llm.ts — LLM 节点（流式 / MCP 工具循环）
 *  自 engine.js 原文拆出，逻辑逐字保留（ADR-0004 TS 化拆分）。
 * ================================================================ */
import { generateText, streamText, tool, type ToolSet } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { getModel, providerInfo } from './providers.js';
import { isStubImpl, TOOL_SPECS } from './tools.js';
import { buildToolSession } from './mcp/inject.js';
import { isAbort, preview, renderIfTemplate, strInput, toStr } from './util.js';
import type { NodeHandler, NodeResult, WFNode } from './types.js';

export const llmHandler: NodeHandler = async (ctx, args) => {
  const { n, p, input, inVals, vars, emit } = args;
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
    contextText = ctxRaw.map(h => h && typeof h === 'object' ? `【${(h as { src?: string }).src || '片段'}】${(h as { text?: unknown }).text || toStr(h)}` : toStr(h)).join('\n');
  } else if(ctxRaw != null && !(ctxRaw as { __trigger?: unknown }).__trigger){
    contextText = toStr(ctxRaw);
  }
  if(!promptText) promptText = vars.question || strInput(input, '');
  let userMsg = promptText || '(请根据系统提示词回答)';
  if(contextText) userMsg += `\n\n【参考资料】\n${contextText.slice(0, 6000)}`;

  const skills = (n.skills || []) as string[];
  const sys = (p.sys || '') + (skills.length ? `\n\n你装配了以下技能，可按需运用其方法：${skills.join('、')}` : '');
  const temperature = Number(p.temp ?? 0.7);
  const maxOutputTokens = Math.min(32768, Math.max(64, Number(p.max) || 2048));
  const t0 = Date.now();
  const sess = await buildToolSession(n.mcp, ctx.ac.signal);   /* 三分会话：内置/外部动态/降级 stub（迭代 0025 / BK-0030） */
  const toolImpls = sess.impls;
  let text = '', tokens = 0, stubCount = 0;

  if(toolImpls.size){
    /* ---- 工具循环（generateText，最多 3 轮；失败自动降级为无工具调用） ---- */
    const zTools: ToolSet = {};
    const keyOf = new Map<string, string>();   // 安全工具名 → 原名
    for(const [name, impl] of toolImpls){
      if(isStubImpl(impl)) stubCount++;   /* 未接入工具计数（✓ 摘要分项，迭代 0009） */
      const ext = sess.extSpecs.get(name);   /* 分支②：发现快照桥接 spec（mcp/inject.ts bridgeSpec） */
      const spec = TOOL_SPECS[name] || { desc: ext?.desc ?? name, schema: {} as Record<string, string> };
      const shape: Record<string, any> = {};
      if(ext) Object.assign(shape, ext.shape);
      else for(const [k, d] of Object.entries(spec.schema || {})){
        shape[k] = /数量|count/i.test(k) ? z.number().optional().describe(String(d)) : z.string().optional().describe(String(d));
      }
      const safe = name.replace(/[^\w]/g,'_');   /* OpenAI 函数名仅允许 \w，连字符/点号一并清洗 */
      keyOf.set(safe, name);
      zTools[safe] = tool({ description: spec.desc, inputSchema: z.object(shape), execute: async (a: any)=>{
        const res = await impl(a || {});
        const stub = isStubImpl(impl);   /* 未接入工具如实降级（tools.ts STUB_MARK） */
        const bound = stub ? 200 : 60;   /* F3：stub 载荷 ≤66 字符，200 保证如实 note 不被截断 */
        ctx.log[stub ? 'warn' : 'info']({ tool: name, stub, args: preview(a, 40), result: preview(res, bound) }, '工具调用');
        emit('log', { lvl: stub ? 'warn' : 'sys', msg:`🔧 工具调用 ${name}(${preview(a,40)}) → ${preview(res,bound)}` });
        return res;
      }});
    }
    try{
      /* AI SDK 7：system 提示词必须走独立参数，不允许出现在 messages 里 */
      let messages: ModelMessage[] = [{ role:'user', content: userMsg }];
      for(let round=1; round<=3; round++){
        const res = await generateText({ model, system: sys || undefined, messages, tools: zTools, temperature, maxOutputTokens, abortSignal: ctx.ac.signal });
        tokens += (res.usage?.totalTokens || res.usage?.outputTokens || 0);
        if(res.toolCalls && res.toolCalls.length){
          emit('log', { lvl:'sys', msg:`🤖 模型请求调用工具：${res.toolCalls.map(tc=>keyOf.get(tc.toolName) || tc.toolName).join(', ')}（第 ${round} 轮）` });
          /* 工具已在 execute 回调中真实执行；response.messages 已含 assistant 调用与 tool 结果，直接续接 */
          messages = messages.concat(res.response.messages);
          continue;
        }
        text = res.text || '';
        break;
      }
    }catch(e){
      if(isAbort(e) || ctx.ac.signal.aborted) throw e;
      emit('log', { lvl:'warn', msg:`工具循环异常（${String((e as Error).message || e)}），降级为直接生成` });
      const res = await generateText({ model, system: sys || undefined, prompt: userMsg, temperature, maxOutputTokens, abortSignal: ctx.ac.signal });
      tokens += (res.usage?.totalTokens || res.usage?.outputTokens || 0);
      text = res.text || '';
    }
    emit('node:delta', { id: n.id, text });
  } else {
    /* ---- 纯流式（streamText，逐 token 推送到画布打字机） ---- */
    let lastEmit = 0, acc = '', lastErr: unknown = null;
    const result = streamText({
      model, system: sys || undefined, prompt: userMsg, temperature, maxOutputTokens,
      abortSignal: ctx.ac.signal,
      onError({ error }){ lastErr = error; },
    });
    for await (const d of result.textStream){
      acc += d;
      const nowT = Date.now();
      if(nowT - lastEmit > 60){ emit('node:delta', { id: n.id, text: acc }); lastEmit = nowT; }
    }
    emit('node:delta', { id: n.id, text: acc });
    text = acc || await Promise.resolve(result.text).catch(()=> '');
    try{ const u = await result.usage; tokens = u?.totalTokens || u?.outputTokens || 0; }catch{ /* usage 不可用 */ }
    if(!text && lastErr) throw new Error(`模型调用失败：${(lastErr as Error).message || String(lastErr)}`);
    if(!text) throw new Error('模型返回为空');
  }

  const cap = capSummaryServer(n);
  const mcpTxt = cap.servers ? ` · MCP ${cap.servers} 服务/${cap.tools} 工具${stubCount ? `（${stubCount} 未接入）` : ''}` : '';
  const capsTxt = mcpTxt + (cap.skills ? ` · 技能 ${cap.skills}` : '');
  emit('log', { lvl:'ok', msg:`✓ ${n.title || 'LLM'} · 生成 ${tokens || '?'} tokens${capsTxt} · ${((Date.now()-t0)/1000).toFixed(1)}s` });
  return {
    value: text,
    ports: [text],
    tokens: tokens || undefined,
    out: text.length > 160 ? text.slice(0,160)+'…' : text,
  };
};

function capSummaryServer(n: WFNode): { servers: number; tools: number; skills: number } {
  let tools = 0, servers = 0;
  Object.entries((n.mcp || {}) as Record<string, unknown>).forEach(([sid, arr])=>{ if(Array.isArray(arr) && arr.length){ servers++; tools += arr.length; } });
  return { servers, tools, skills: (n.skills || []).length };
}
