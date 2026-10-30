/* prompt — 提示词模板（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0022 / BK-0021 批次 2）。
 * capabilities.data = render 纯模板渲染、无 IO（handlers.ts prompt）；
 * tpl 默认值含 \n 换行（与批次 1 code 已验形态同构，迁移 SPEC §4）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'prompt',
  identity: { name: '提示词模板', category: 'chat', icon: 'file-text',
    keywords: 'prompt template 模板 提示词',
    description: '使用 {{变量}} 组装提示词文本。' },
  ports: {
    inputs:  [{ id: 'in-var',     label: '变量',   type: 'any' }],
    outputs: [{ id: 'out-prompt', label: '提示词', type: 'text' }],
  },
  params: [
    { id: 'tpl', label: '模板内容', widget: 'textarea',
      default: '你是一名金牌客服。请结合以下资料回答用户问题：\n{{context}}\n\n用户问题：{{question}}' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'prompt', capabilities: { data: true } },
} satisfies NodeDefJson;
