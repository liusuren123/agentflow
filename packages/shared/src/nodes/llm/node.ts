/* llm — LLM 对话（NDP 纯数据模块，T3 能力绑定模板）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）。
 * model 标 runtimeOverridable:true = 现状 app.js 运行期被 /api/health 返回的
 * provider.models 覆写 options（NDP §6.3 文档侧先行；实现缺陷修正单独立项）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'llm',
  identity: { name: 'LLM 对话', category: 'chat', icon: 'bot',
    keywords: 'llm gpt 大模型 对话 chat glm 生成',
    description: '调用大语言模型生成回复，可注入提示词与上下文。' },
  ports: {
    inputs: [
      { id: 'in-prompt', label: '提示词', type: 'text' },
      { id: 'in-ctx',    label: '上下文', type: 'any' },
    ],
    outputs: [{ id: 'out-reply', label: '回复', type: 'text' }],
  },
  params: [
    { id: 'model', label: '模型', widget: 'combo',
      options: [
        { value: 'GLM-4.7', label: 'GLM-4.7' },
        { value: 'GLM-4.7-Air', label: 'GLM-4.7-Air' },
        { value: 'GLM-4.6-Flash', label: 'GLM-4.6-Flash' },
        { value: 'DeepSeek-V4', label: 'DeepSeek-V4' },
        { value: 'GPT-5', label: 'GPT-5' },
        { value: 'Claude Sonnet 4.5', label: 'Claude Sonnet 4.5' },
      ], default: 'GLM-4.7', runtimeOverridable: true },
    { id: 'sys', label: '系统提示词', widget: 'textarea',
      default: '你是智能客服助手，回答需准确、简洁、友好。' },
    { id: 'temp', label: '温度', widget: 'number',
      default: 0.7, min: 0, max: 2, step: 0.1 },
    { id: 'max', label: '最大 Tokens', widget: 'number',
      default: 2048, min: 64, max: 32768, step: 64 },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: {
    handler: 'llm',
    capabilities: { llm: true, mcp: { toolSelection: 'user' }, skills: true },
  },
} satisfies NodeDefJson;
