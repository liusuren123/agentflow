/* reply — 直接回复（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * 空输出数组（终点节点，与 notify 同构）；capabilities.data = emit('output')
 * + ctx.outputs 汇入运行产物、无出站 IO（handlers.ts reply）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'reply',
  identity: { name: '直接回复', category: 'output', icon: 'reply',
    keywords: 'reply output answer 输出 回复 结果 终点',
    description: '将内容直接输出给用户（终点节点）。' },
  ports: {
    inputs: [{ id: 'in-content', label: '内容', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'tpl', label: '输出模板', widget: 'textarea', default: '{{content}}' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'reply', capabilities: { data: true } },
} satisfies NodeDefJson;
