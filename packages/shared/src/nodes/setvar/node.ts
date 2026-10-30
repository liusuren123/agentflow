/* setvar — 变量赋值（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * capabilities.data = 纯数据写入运行级变量表、无 IO（handlers.ts setvar）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'setvar',
  identity: { name: '变量赋值', category: 'output', icon: 'tag',
    keywords: 'variable set assign 变量 赋值 保存',
    description: '将值写入工作流全局变量。' },
  ports: {
    inputs:  [{ id: 'in-value',  label: '值', type: 'any' }],
    outputs: [{ id: 'out-value', label: '值', type: 'any' }],
  },
  params: [
    { id: 'name', label: '变量名', widget: 'text', default: 'answer' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'setvar', capabilities: { data: true } },
} satisfies NodeDefJson;
