/* websearch — 网页搜索（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * capabilities.net = 出站全经 guard.ts 网关代发（search.ts 头注明示「本模块
 * 不含任何网络出口」）；max 为结果数量义（跨节点同名异义键 p.max，NDP §4.2）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'websearch',
  identity: { name: '网页搜索', category: 'knowledge', icon: 'globe',
    keywords: 'search web 联网 搜索 engine bing google',
    description: '调用搜索引擎查询互联网信息。' },
  ports: {
    inputs:  [{ id: 'in-query',    label: '查询', type: 'text' }],
    outputs: [{ id: 'out-results', label: '结果', type: 'list' }],
  },
  params: [
    { id: 'eng', label: '搜索引擎', widget: 'combo',
      options: [
        { value: 'Bing', label: 'Bing' },
        { value: 'Google', label: 'Google' },
        { value: '博查', label: '博查' },
        { value: 'SearXNG', label: 'SearXNG' },
      ], default: 'Bing' },
    { id: 'max', label: '结果数量', widget: 'number', default: 5, min: 1, max: 20, step: 1 },
  ],
  binding: { handler: 'websearch', capabilities: { net: { mode: 'guarded' } } },
} satisfies NodeDefJson;
