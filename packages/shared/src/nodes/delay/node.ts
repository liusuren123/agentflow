/* delay — 延时等待（NDP 纯数据模块，T1 最小骨架模板）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）；
 * 端口 id 一次性定稿、一经发布即冻结（NDP §5.3）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'delay',
  identity: { name: '延时等待', category: 'logic', icon: 'timer',
    keywords: 'delay wait sleep 等待 延时',
    description: '等待指定时间后继续执行。' },
  ports: {
    inputs:  [{ id: 'in-any',  label: '输入', type: 'any' }],
    outputs: [{ id: 'out-any', label: '输出', type: 'any' }],
  },
  params: [
    { id: 's', label: '等待 (秒)', widget: 'number',
      default: 2, min: 1, max: 60, step: 1 },
  ],
  binding: { handler: 'delay', capabilities: { data: true } },
} satisfies NodeDefJson;
