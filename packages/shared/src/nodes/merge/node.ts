/* merge — 合并（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * 双输入端口 A/B（引擎按入边数组序取值，engine.ts:92-93 首条非 undefined
 * 已知债务，见本目录 README）；capabilities.data = 纯数据汇聚（handlers.ts merge）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'merge',
  identity: { name: '合并', category: 'logic', icon: 'merge',
    keywords: 'merge join 合并 汇聚',
    description: '汇聚多路输入为一路。' },
  ports: {
    inputs: [
      { id: 'in-a', label: 'A', type: 'any' },
      { id: 'in-b', label: 'B', type: 'any' },
    ],
    outputs: [{ id: 'out-merged', label: '合并', type: 'any' }],
  },
  params: [
    { id: 'mode', label: '合并策略', widget: 'combo',
      options: [
        { value: '等待全部', label: '等待全部' },
        { value: '任一到达', label: '任一到达' },
      ], default: '等待全部' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'merge', capabilities: { data: true } },
} satisfies NodeDefJson;
