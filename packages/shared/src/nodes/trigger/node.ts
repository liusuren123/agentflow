/* trigger — 触发器（NDP 纯数据模块，T2 条件参数模板）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）。
 * 三个参数均为 UI-only（后端未接入，handler 零参数读取、out 硬编码「手动触发」，
 * handlers.ts trigger 签名）——implemented:false 如实标注，聚合层静默丢弃该标注
 * （NDP §6.4：不得删除或改造参数本体，触 UI 走修宪通道）。
 * capabilities:{} = handler 无任何 IO；Webhook 入站触发若未来实装属扩展 kind
 * ingress，非出站 net。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'trigger',
  identity: { name: '触发器', category: 'input', icon: 'zap',
    keywords: 'trigger start 开始 入口 启动',
    description: '工作流执行入口，支持手动 / 定时 / Webhook 触发。' },
  ports: {
    inputs: [],
    outputs: [{ id: 'out-start', label: '开始', type: 'any' }],
  },
  params: [
    { id: 'mode', label: '触发方式', widget: 'combo',
      options: [
        { value: '手动触发', label: '手动触发' },
        { value: '定时触发', label: '定时触发' },
        { value: 'Webhook',  label: 'Webhook' },
      ], default: '手动触发', implemented: false },
    { id: 'cron', label: 'Cron 表达式', widget: 'text', default: '0 9 * * 1-5',
      visibleIf: { param: 'mode', equals: '定时触发' }, implemented: false },
    { id: 'path', label: 'Webhook 路径', widget: 'text', default: '/api/run',
      visibleIf: { param: 'mode', equals: 'Webhook' }, implemented: false },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'trigger', capabilities: {} },
} satisfies NodeDefJson;
