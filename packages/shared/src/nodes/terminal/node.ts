/* terminal — 交互终端（NDP 纯数据模块）
 * ADR-0014 §7 定界（迭代 0057 / BK-0045 修宪轮·BK-9005 链终轮，issue#5 批复承继）。
 * tools 类交互节点：双击节点主体打开终端面板（termOpen，gate s19 触发形态），
 * 用户与 agent 双写方共享同一 PTY shell 会话（origin 贯穿审计；ADR-0014 §2.2
 * 三层缓解：初始 cwd 锚定 + 全量审计 + 默认关）。in-ctx 上下文入 /
 * out-session 会话引用出（写回绑定，D4）；capabilities.exec.mode='pty' 为
 * ADR-0014 §2.2 定级在 DEF 面的落点（handlers.ts terminal，PTY_ENABLED=0 降级）。
 * 【补录注记】本文件由合并仲裁员重建（迭代 0057 合并轮）：特性分支提交漏录
 * 本目录、工作树源码已被提交流程清除，数据自工作树 dist 编译产物（验证轮
 * 2026-10-28 04:28 所出）逐字段转写，与 test/nodes.baseline.json terminal
 * 条目及 gate s19/README 生成器互证——事实链见
 * docs/evolution/iterations/0057/MERGE.md §2。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'terminal',
  identity: { name: '交互终端', category: 'tools', icon: 'keyboard',
    keywords: 'terminal 终端 交互 shell pty 会话 共享 接管',
    description: '双击打开终端面板：与 agent 共享同一 shell 会话（PTY）。' },
  ports: {
    inputs: [{ id: 'in-ctx', label: '上下文', type: 'any' }],
    outputs: [{ id: 'out-session', label: '会话引用', type: 'object' }],
  },
  params: [
    { id: 'cmd', label: '兜底命令', widget: 'text', default: '' },
    { id: 'session', label: '会话绑定', widget: 'text', default: '' },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'terminal', capabilities: { exec: { mode: 'pty' } } },
} satisfies NodeDefJson;
