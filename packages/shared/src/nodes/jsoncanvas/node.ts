/* jsoncanvas — JSON 画布（NDP 纯数据模块）
 * ADR-0015 §2.3 定稿（迭代 0035 / BK-0038 修宪轮·BK-9003 链终轮）。呈现型 sink：
 * 与 reply 同构——outputs 空数组（终点节点）、单入 in-data type any、
 * capabilities.data = emit('output') + ctx.outputs 汇入运行产物、无出站 IO
 * （handlers.ts jsoncanvas）。object 严型案已否决（ADR-0015 §2.3）：any 入口
 * 不挑食，非 JSON 输入由前端 JSON.parse 失败如实降级原文呈现（不伪造树）。
 * 零进程零出站零用户输入面（呈现型 sink；PTY 面归 BK-0045 / ADR-0014）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'jsoncanvas',
  identity: { name: 'JSON 画布', category: 'output', icon: 'box-select',
    keywords: 'jsoncanvas json 画布 结构化 树 呈现',
    description: '将上游 JSON 数据以结构化树呈现（终点节点）' },
  ports: {
    inputs: [{ id: 'in-data', label: '数据', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'expand', label: '展开层级', widget: 'number', default: 2, min: 0, max: 6, step: 1 },
    { id: 'fmt', label: '格式化缩进', widget: 'toggle', default: true },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'jsoncanvas', capabilities: { data: true } },
} satisfies NodeDefJson;
