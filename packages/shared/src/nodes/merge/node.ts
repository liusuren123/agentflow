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
  ],
  binding: { handler: 'merge', capabilities: { data: true } },
} satisfies NodeDefJson;
