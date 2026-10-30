/* ================================================================
 *  agent.ts — 通用智能体节点（goal 会话形态，迭代 0031 / BK-0033 修宪轮）
 *  maxSteps 步数预算工具循环（v1 无 token 硬顶，ADR-0013 §3，tokens 仅报告）；
 *  每次执行绑定一个持久会话（store.ts createSession/appendMessage，BK-0016 产物），
 *  out-session 端口输出 { sessionId }（goal 面板 BK-0034 的恢复入口数据锚）；
 *  工具会话复用 buildToolSession 三分支（mcp/inject.ts，BK-0030），zod 桥接沿
 *  llm.ts 同型；与 llm.ts 的刻意差异：工具循环异常如实上抛不降级（会话绑定 +
 *  goal 语义下降级会静默丢失语义，SPEC §4.3），模型未配置如实 throw（run:error）。
 * ================================================================ */
import { generateText, tool, type ToolSet } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { getModel, providerInfo } from './providers.js';
import { isStubImpl, TOOL_SPECS } from './tools.js';
import { buildToolSession } from './mcp/inject.js';
import { discoveredSysExtension } from './mcp/discovery.js';   /* BK-0014：ALLOW 命中技能/规则正文注入（纯追加，零命中 = ''） */
import { createSession, appendMessage } from './store.js';
import { preview, renderIfTemplate, strInput, toStr } from './util.js';
import type { NodeHandler, WFNode } from './types.js';

export const agentHandler: NodeHandler = async (ctx, args) => {
  const { n, p, input, inVals, vars, emit } = args;
  const model = getModel(p.model);
  if(!model){
    throw new Error(`模型服务未配置（${providerInfo().note}）`);
  }
  /* 目标：上游「目标」端口；上下文：上游「上下文」端口（llm.ts 输入合成同型） */
  let goal = strInput(inVals[0], '');
  goal = renderIfTemplate(goal, vars);
  const ctxRaw = inVals[1];
  let contextText = '';
  if(Array.isArray(ctxRaw) && ctxRaw.length){
    contextText = ctxRaw.map(h => h && typeof h === 'object' ? `【${(h as { src?: string }).src || '片段'}】${(h as { text?: unknown }).text || toStr(h)}` : toStr(h)).join('\n');
  } else if(ctxRaw != null && !(ctxRaw as { __trigger?: unknown }).__trigger){
    contextText = toStr(ctxRaw);
  }
  if(!goal) goal = vars.question || strInput(input, '');
  let userMsg = goal || '(未提供目标，请根据系统提示词自主推进)';
  if(contextText) userMsg += `\n\n【参考资料】\n${contextText.slice(0, 6000)}`;

  const skills = (n.skills || []) as string[];
  /* BK-0014：尾部纯追加发现技能/规则正文（llm.ts 同型；快照零命中 = ''）。
   * :48 createSession 落库仍存原始 sys——发现正文不落跨会话存储（ADR-0023 §9.3）。 */
  const sys = (p.sys || '') + (skills.length ? `\n\n你装配了以下技能，可按需运用其方法：${skills.join('、')}` : '') + discoveredSysExtension();
  const temperature = 0.7;
  const maxOutputTokens = 2048;
  const maxSteps = Math.min(256, Math.max(1, Math.round(Number(p.maxSteps) || 32)));
  const t0 = Date.now();

  /* 会话绑定：先建后跑——建会话 → user 落库 → 预算循环 → assistant 仅非空落库 */
  const session = createSession({ title: n.title || '通用智能体', model: p.model, sys: p.sys });
  appendMessage(session.id, 'user', userMsg);

  /* 工具会话：三分支（内置/外部动态/降级 stub）+ 安全名 zod 桥接（llm.ts 同型） */
  const sess = await buildToolSession(n.mcp, ctx.ac.signal);
  if(ctx.ac.signal.aborted) throw new Error('已中止');
  const toolImpls = sess.impls;
  let stubCount = 0;
  const zTools: ToolSet = {};
  const keyOf = new Map<string, string>();   /* 安全工具名 → 原名 */
  for(const [name, impl] of toolImpls){
    if(isStubImpl(impl)) stubCount++;   /* 未接入工具计数（✓ 摘要分项） */
    const ext = sess.extSpecs.get(name);
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
      const stub = isStubImpl(impl);
      const bound = stub ? 200 : 60;
      ctx.log[stub ? 'warn' : 'info']({ tool: name, stub, args: preview(a, 40), result: preview(res, bound) }, '工具调用');
      emit('log', { lvl: stub ? 'warn' : 'sys', msg:`🔧 工具调用 ${name}(${preview(a,40)}) → ${preview(res,bound)}` });
      return res;
    }});
  }

  /* 预算循环：步数上限语义；每 await 后显式判中止（SDK 优雅终止不抛错时兜底），
   * 异常如实上抛不降级（SPEC §4.3） */
  let messages: ModelMessage[] = [{ role:'user', content: userMsg }];
  let text = '', tokens = 0, steps = 0;
  for(let step=1; step<=maxSteps; step++){
    const res = await generateText({ model, system: sys || undefined, messages, tools: zTools, temperature, maxOutputTokens, abortSignal: ctx.ac.signal });
    tokens += (res.usage?.totalTokens || res.usage?.outputTokens || 0);
    steps = step;
    if(ctx.ac.signal.aborted) throw new Error('已中止');
    if(res.toolCalls && res.toolCalls.length){
      emit('log', { lvl:'sys', msg:`🤖 模型请求调用工具：${res.toolCalls.map(tc=>keyOf.get(tc.toolName) || tc.toolName).join(', ')}（第 ${step} 步）` });
      /* 工具已在 execute 回调中真实执行；response.messages 已含 assistant 调用与 tool 结果，直接续接 */
      messages = messages.concat(res.response.messages);
      continue;
    }
    text = res.text || '';
    break;
  }

  emit('node:delta', { id: n.id, text });
  if(text) appendMessage(session.id, 'assistant', text);   /* 空文本不落库（预算耗尽/中止路径） */

  const cap = capSummaryServer(n);
  const mcpTxt = cap.servers ? ` · MCP ${cap.servers} 服务/${cap.tools} 工具${stubCount ? `（${stubCount} 未接入）` : ''}` : '';
  const capsTxt = mcpTxt + (cap.skills ? ` · 技能 ${cap.skills}` : '');
  const outSummary = text || `（已达最大步数 ${maxSteps}）`;
  const exhausted = !text && steps >= maxSteps;
  emit('log', { lvl:'ok', msg:`✓ ${n.title || '通用智能体'} · ${steps}/${maxSteps} 步${exhausted ? '（预算耗尽）' : ''} · 生成 ${tokens || '?'} tokens${capsTxt} · ${((Date.now()-t0)/1000).toFixed(1)}s` });
  return {
    value: text,
    ports: [text, { sessionId: session.id }],
    tokens: tokens || undefined,
    out: outSummary.length > 160 ? outSummary.slice(0,160)+'…' : outSummary,
  };
};

function capSummaryServer(n: WFNode): { servers: number; tools: number; skills: number } {
  let tools = 0, servers = 0;
  Object.entries((n.mcp || {}) as Record<string, unknown>).forEach(([sid, arr])=>{ if(Array.isArray(arr) && arr.length){ servers++; tools += arr.length; } });
  return { servers, tools, skills: (n.skills || []).length };
}
