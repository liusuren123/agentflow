/* userinput — 用户输入（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）。
 * vtype/req 为 UI-only 僵尸参数（handler 只读 var/defv，handlers.ts userinput）
 * ——implemented:false 如实标注，聚合层静默丢弃标注（NDP §6.4）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'userinput',
  identity: { name: '用户输入', category: 'input', icon: 'keyboard',
    keywords: 'input variable 变量 用户 参数',
    description: '采集用户提供的输入变量。' },
  ports: {
    inputs: [],
    outputs: [{ id: 'out-value', label: '值', type: 'text' }],
  },
  params: [
    { id: 'var', label: '变量名', widget: 'text', default: 'question' },
    { id: 'vtype', label: '值类型', widget: 'combo',
      options: [
        { value: '文本', label: '文本' },
        { value: '数字', label: '数字' },
        { value: '布尔', label: '布尔' },
      ], default: '文本', implemented: false },
    { id: 'req', label: '必填', widget: 'toggle', default: true, implemented: false },
    { id: 'defv', label: '默认值', widget: 'text', default: '如何申请退货?' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'userinput', capabilities: { data: true } },
} satisfies NodeDefJson;
