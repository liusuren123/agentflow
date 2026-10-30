/* webshow — 网页展示（NDP 纯数据模块）
 * 迭代 0033 / BK-0036 修宪轮落盘（issue#3 承继 2026-10-23T15:49:32Z + ADR-0015 §2.1）。
 * sink 同构 reply：outputs 空数组（终点节点）；capabilities.data = emit('output') +
 * ctx.outputs 汇入运行产物、服务端零出站（不抓取/不代理/不转存——内容获取归既有
 * http 节点，handlers.ts webshow）；icon globe 复用 ICON_PATHS 既有键（app.js:64，
 * 与 websearch 同键——I() 按键查表无唯一性约束）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'webshow',
  identity: { name: '网页展示', category: 'output', icon: 'globe',
    keywords: 'webshow 网页 展示 预览 iframe 呈现',
    description: '将上游网址以内嵌安全视图呈现（终点节点）。' },
  ports: {
    inputs: [{ id: 'in-url', label: '网址', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'url', label: '兜底网址', widget: 'text', default: '' },
    { id: 'sandbox', label: '沙箱隔离', widget: 'toggle', default: true },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'webshow', capabilities: { data: true } },
} satisfies NodeDefJson;
