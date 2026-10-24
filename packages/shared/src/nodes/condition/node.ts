/* condition — 条件分支（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）。
 * expr 的消费点在 engine.ts（cond 事件唯一发射点，n.type==='condition' + p.expr）
 * ——参数 id 逐字等于现行 k，改名即守卫测试红（NDP §4.2 必踩点 2）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'condition',
  identity: { name: '条件分支', category: 'logic', icon: 'git-branch',
    keywords: 'if else condition branch 分支 判断 条件',
    description: '按条件表达式将流程分流为 真 / 假 两路。' },
  ports: {
    inputs: [
      { id: 'in-input', label: '输入', type: 'any' },
    ],
    outputs: [
      { id: 'out-true',  label: '真', type: 'any' },
      { id: 'out-false', label: '假', type: 'any' },
    ],
  },
  params: [
    { id: 'expr', label: '条件表达式', widget: 'text', default: 'confidence > 0.7' },
  ],
  binding: { handler: 'condition', capabilities: { data: true } },
} satisfies NodeDefJson;
