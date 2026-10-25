/* agent — 通用智能体（NDP 纯数据模块，goal 会话形态）。
 * 迭代 0031 / BK-0033 修宪轮落盘（issue#2 承继 + ADR-0013 §2.1）；
 * maxSteps=步数预算（v1 无 token 硬顶，ADR-0013 §3）；model 6 项与 llm 节点
 * 逐字同源（nodes/llm/node.ts:22-28）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'agent',
  identity: { name: '通用智能体', category: 'chat', icon: 'sparkles',
    keywords: 'agent 智能体 goal 会话 自主 loop 预算',
    description: 'goal 模式智能体：自主工具循环 + 持久会话，可点开进入流式会话面板。' },
  ports: {
    inputs: [
      { id: 'in-goal', label: '目标', type: 'text' },
      { id: 'in-ctx',  label: '上下文', type: 'any' },
    ],
    outputs: [
      { id: 'out-result',  label: '结果', type: 'text' },
      { id: 'out-session', label: '会话引用', type: 'object' },
    ],
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
      default: '你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。' },
    { id: 'maxSteps', label: '最大步数', widget: 'number',
      default: 32, min: 1, max: 256, step: 1 },
  ],
  binding: {
    handler: 'agent',
    capabilities: {
      llm: true,
      mcp: { toolSelection: 'user' },
      skills: true,
      agent: { sessionMode: 'goal' },
    },
  },
} satisfies NodeDefJson;
