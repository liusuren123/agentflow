/* termview — 终端只读流（NDP 纯数据模块）
 * ADR-0015 §2.2 定稿（迭代 0034 / BK-0037 修宪轮）。呈现型 sink：与 reply 同构——
 * outputs 空数组（终点节点）、单入 in-stream type any、capabilities.data =
 * emit('output') + ctx.outputs 汇入运行产物、无出站 IO（handlers.ts termview）。
 * 命名刻意避开 terminal/pty 语义词（ADR-0015 §4.4 PTY 边界切割：只读呈现，
 * 无用户输入面，严禁 node-pty/PTY——BK-0045 专属面归 ADR-0014 附录 A）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'termview',
  identity: { name: '终端只读流', category: 'output', icon: 'code',
    keywords: 'termview 终端 只读 流式 呈现 输出',
    description: '将上游文本流以等宽终端样式只读呈现（终点节点）' },
  ports: {
    inputs: [{ id: 'in-stream', label: '数据流', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'lines', label: '缓冲行数', widget: 'number', default: 200, min: 20, max: 2000, step: 20 },
    { id: 'autoscroll', label: '自动滚动', widget: 'toggle', default: true },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'termview', capabilities: { data: true } },
} satisfies NodeDefJson;
