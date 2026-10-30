/* notify — 消息通知（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * 空输出数组（终点形态之一，与 reply 同构）；to 为接收人义（跨节点同名异义键
 * p.to，NDP §4.2）；capabilities.net = Webhook 分支 guardedFetch（handlers.ts）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'notify',
  identity: { name: '消息通知', category: 'tools', icon: 'send',
    keywords: 'notify message send 通知 邮件 短信',
    description: '通过邮件 / 短信 / IM 发送通知。' },
  ports: {
    inputs: [{ id: 'in-content', label: '内容', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'ch', label: '通知渠道', widget: 'combo',
      options: [
        { value: '邮件', label: '邮件' },
        { value: '短信', label: '短信' },
        { value: '企业微信', label: '企业微信' },
        { value: 'Webhook', label: 'Webhook' },
      ], default: '邮件' },
    { id: 'to', label: '接收人', widget: 'text', default: 'support@team.com' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'notify', capabilities: { net: { mode: 'guarded' } } },
} satisfies NodeDefJson;
