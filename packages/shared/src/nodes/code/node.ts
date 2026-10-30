/* code — 代码执行（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）。
 * capabilities.exec = 子进程 + 超时强杀（AGENTS.md 硬性约定 3）；mcp 为现行
 * caps:['mcp'] 的复现条件（节点属性面板 MCP 工具配置入口）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'code',
  identity: { name: '代码执行', category: 'tools', icon: 'code',
    keywords: 'code python js 执行 脚本',
    description: '运行自定义 Python / JavaScript 代码片段。' },
  ports: {
    inputs:  [{ id: 'in-input',  label: '输入', type: 'any' }],
    outputs: [{ id: 'out-result', label: '结果', type: 'any' }],
  },
  params: [
    { id: 'lang', label: '语言', widget: 'combo',
      options: [
        { value: 'Python', label: 'Python' },
        { value: 'JavaScript', label: 'JavaScript' },
      ], default: 'Python' },
    { id: 'code', label: '代码', widget: 'textarea',
      default: '# 处理输入后返回\nresult = input\nreturn result' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'code',
    capabilities: { exec: { mode: 'sandboxed' }, mcp: { toolSelection: 'user' } } },
} satisfies NodeDefJson;
