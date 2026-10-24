/* approval — 人工审批（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * to 为超时策略义（跨节点同名异义键 p.to，NDP §4.2）；capabilities 如实声明
 * 双路径：human=挂起-恢复（handlers.ts approval）、llm=智能体互审裁决可选路径
 * （approval-review.ts generateText，role=node:<id> 时启用）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'approval',
  identity: { name: '人工审批', category: 'human', icon: 'user-check',
    keywords: 'human approval audit 人工 审批 审核',
    description: '流程转人工审核，通过后继续执行。' },
  ports: {
    inputs:  [{ id: 'in-input',  label: '输入', type: 'any' }],
    outputs: [{ id: 'out-result', label: '结果', type: 'any' }],
  },
  params: [
    { id: 'role', label: '审批人', widget: 'text', default: '值班经理' },
    { id: 'to', label: '超时策略', widget: 'combo',
      options: [
        { value: '自动通过', label: '自动通过' },
        { value: '自动拒绝', label: '自动拒绝' },
        { value: '挂起', label: '挂起' },
      ], default: '挂起' },
  ],
  binding: { handler: 'approval', capabilities: { human: true, llm: true } },
} satisfies NodeDefJson;
