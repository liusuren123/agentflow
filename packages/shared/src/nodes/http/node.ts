/* http — HTTP 请求（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）。
 * capabilities.net = 出站必须走 guard.ts SSRF 守卫（AGENTS.md 硬性约定 3）；
 * to 为超时秒数义（跨节点同名异义键 p.to，NDP §4.2，禁止按节点改名单独优化）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'http',
  identity: { name: 'HTTP 请求', category: 'tools', icon: 'plug',
    keywords: 'http api request 接口 请求 rest',
    description: '调用外部 HTTP 接口获取或提交数据。' },
  ports: {
    inputs:  [{ id: 'in-body',     label: '请求体', type: 'any' }],
    outputs: [{ id: 'out-response', label: '响应', type: 'object' }],
  },
  params: [
    { id: 'm', label: '请求方法', widget: 'combo',
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'DELETE', label: 'DELETE' },
      ], default: 'GET' },
    { id: 'url', label: 'URL', widget: 'text', default: 'https://api.example.com/v1/orders' },
    { id: 'to', label: '超时 (秒)', widget: 'number', default: 30, min: 1, max: 120, step: 1 },
  ],
  binding: { handler: 'http', capabilities: { net: { mode: 'guarded' } } },
} satisfies NodeDefJson;
