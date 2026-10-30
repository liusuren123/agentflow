/* loop — 循环（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * list 输入端口（与批次 1 retrieval 输出同型）；max 为最大迭代义（跨节点
 * 同名异义键 p.max，NDP §4.2）；capabilities.data = 纯编排无 IO（handlers.ts loop）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'loop',
  identity: { name: '循环', category: 'logic', icon: 'repeat',
    keywords: 'loop for each 循环 遍历 迭代',
    description: '遍历列表，逐项执行下游节点。' },
  ports: {
    inputs:  [{ id: 'in-list', label: '列表', type: 'list' }],
    outputs: [{ id: 'out-item', label: '元素', type: 'text' }],
  },
  params: [
    { id: 'max', label: '最大迭代', widget: 'number', default: 10, min: 1, max: 100, step: 1 },
    { id: 'conc', label: '并发执行', widget: 'toggle', default: false },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'loop', capabilities: { data: true } },
} satisfies NodeDefJson;
