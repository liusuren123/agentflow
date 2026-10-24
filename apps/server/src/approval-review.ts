/* ================================================================
 *  approval-review.ts — 智能体互审裁决子任务（迭代 0016 / BK-0017）
 *  · approval 节点 role 填 `node:<id>`（如 node:4）时，该 id 指向的画布 LLM
 *    节点被指派为审官：以审官自身的模型/系统提示词参数跑一次受控
 *    generateText 单轮子任务，对审批请求做结构化裁决
 *    （{"verdict":"allow"|"deny","reason":...}，zod 严格校验拒收自由文本）。
 *  · 双重执行语义：裁决子任务与审官节点自身的拓扑执行是两次独立调用——
 *    审官若未被 bypass 且在拓扑序中可达，会照常执行一次自己的 LLM 生成
 *    （发自己的 node:start/delta/done），与裁决子任务互不影响；裁决子任务
 *    不 emit 任何事件（log 的 emit 权在 handlers.ts——唯一事件面），绝不发
 *    node:* 事件。后续维护者不得合并两者。
 *  · 失败不抛错：返回 { kind:'fail', why } 交由 handler 走降级链（审官不可用
 *    / 模型未配置 / 调用失败 / 输出不可解析 / 协议不符 → 按节点 to 策略降级）；
 *    唯一例外是 abort（run 中止≠裁决失败）——沿 isAbort 既有语义透传，
 *    不降级、不落审计（决议未产生）。无独立超时、无工具循环（SPEC §4.2）。
 * ================================================================ */
import { generateText } from 'ai';
import { z } from 'zod';
import { paramDefaultsOf } from '@agentflow/shared';
import { getModel } from './providers.js';
import { isAbort, preview } from './util.js';
import type { RunCtx, WFNode } from './types.js';

/* role 参数 → 审官节点 id：'^node:(\d+)$' 命中返回数字 id；其余一律 null=人工路径 */
export function parseAgentRole(role: unknown): number | null {
  const m = String(role || '').match(/^node:(\d+)$/);
  return m ? Number(m[1]) : null;
}

/* 裁决协议尾缀（追加在审官自身 sys 之后）：要求仅输出一个 JSON 对象 */
const REVIEW_PROTOCOL_SYS = '\n\n你是审批裁决审官。请对用户给出的审批请求做出裁决，仅输出一个 JSON 对象：{"verdict":"allow" 或 "deny","reason":"简短理由"}，不要输出任何其他文字。';

/* 裁决请求 user 提示词（SPEC §4.2 精确模板；inputPreview 与 approval:required 载荷同源同长） */
function buildReviewUserPrompt(info: { wfName: string; nodeTitle: string; nodeId: number; inputPreview: string }): string {
  return `【审批裁决请求】\n工作流：${info.wfName}\n审批节点：${info.nodeTitle}（node ${info.nodeId}）\n输入摘要：${info.inputPreview}\n请裁决是否放行以上请求。`;
}

/* 输出文本 → 首个平衡 {...} 块（先剥 markdown 围栏；字符串字面量内的 {}/引号转义不计深度） */
function extractBalancedJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const src = fence ? fence[1]! : text;
  const start = src.indexOf('{');
  if(start < 0) return null;
  let depth = 0, inStr = false;
  for(let i = start; i < src.length; i++){
    const ch = src[i]!;
    if(inStr){
      if(ch === '\\') i++;
      else if(ch === '"') inStr = false;
      continue;
    }
    if(ch === '"') inStr = true;
    else if(ch === '{') depth++;
    else if(ch === '}'){ depth--; if(depth === 0) return src.slice(start, i + 1); }
  }
  return null;
}

/* 裁决协议 schema（strict：多余键 / verdict 越值 / 自由文本一律拒收） */
const VerdictSchema = z.object({
  verdict: z.enum(['allow', 'deny']),
  reason: z.string().optional(),
}).strict();

export type AgentReviewResult =
  | { kind: 'verdict'; ok: boolean; reason: string | null }
  | { kind: 'fail'; why: string };

/* 裁决子任务：单轮受控 generateText（模型/参数取审官节点 paramDefaultsOf('llm') ∪
 * 审官.params，与 engine P() 同式；maxOutputTokens 收紧 ≤512——裁决只需一行 JSON） */
export async function runAgentReview(ctx: RunCtx, reviewer: WFNode,
  info: { wfName: string; nodeTitle: string; nodeId: number; inputPreview: string }): Promise<AgentReviewResult> {
  const rp = { ...paramDefaultsOf('llm'), ...(reviewer.params || {}) } as Record<string, any>;
  const model = getModel(rp.model);
  if(!model) return { kind: 'fail', why: '模型未配置' };
  let text = '';
  try{
    const res = await generateText({
      model,
      system: (rp.sys || '') + REVIEW_PROTOCOL_SYS,
      prompt: buildReviewUserPrompt(info),
      temperature: Number(rp.temp ?? 0.7),
      maxOutputTokens: Math.min(512, Math.max(64, Number(rp.max) || 256)),
      abortSignal: ctx.ac.signal,
    });
    text = res.text || '';
  }catch(e){
    if(isAbort(e) || ctx.ac.signal.aborted) throw e;
    return { kind: 'fail', why: `模型调用失败：${preview(String((e as Error).message || e), 80)}` };
  }
  const jsonText = extractBalancedJson(text);
  if(jsonText === null) return { kind: 'fail', why: '输出不可解析为 JSON' };
  let parsed: unknown;
  try{ parsed = JSON.parse(jsonText); }catch{ return { kind: 'fail', why: '输出不可解析为 JSON' }; }
  const verdict = VerdictSchema.safeParse(parsed);
  if(!verdict.success) return { kind: 'fail', why: '输出不符合裁决协议' };
  return { kind: 'verdict', ok: verdict.data.verdict === 'allow',
    reason: verdict.data.reason != null && verdict.data.reason !== '' ? verdict.data.reason : null };
}
