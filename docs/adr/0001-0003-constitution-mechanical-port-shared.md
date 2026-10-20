# ADR-0001 · UI 宪法门禁

- 状态：已接受（2026-10-21，用户批准）
- 背景：AgentFlow 的 UI 以 ComfyUI 实机截图逐像素采样定稿（README 视觉规格表），
  是产品的核心资产；同时项目进入长期迭代（框架迁移/TS 化/功能扩张），
  渲染结果被无意改动的风险陡增。
- 决策：确立宪法（`CONSTITUTION.md`）——UI 视觉/DOM 结构/交互三层 1:1 为不变式；
  由 CI required check `ui-constitution` 强制：4 个 golden 场景 0 容差像素 diff
  + DOM 不变量（view transform/节点矩形/32 个 CSS 变量/元素计数）。
  golden 以 windows-latest CI 环境为权威。变更 UI 需 ADR + 用户批准 + 重录 golden。
- 验证：门禁连续两次校验全绿（确定性）；负向测试（--accent #0b8ce9→#0b8ceb，
  肉眼不可辨）被 4 场景全部拦截（diffPx 2280-3116 + DOM 不变量变化）。
- 后果：任何前端 PR 都能被机器判定是否违宪；「顺手美化」在制度上不可能溜进来。

# ADR-0002 · 前端演进策略：机械移植 + 命令式画布保留

- 状态：已接受（2026-10-21，用户选定 React + 全仓 TS）
- 背景：单文件 2988 行不可长期维护，需框架化；但 ADR-0001 禁止渲染结果变化。
- 决策：
  1. React 18 只承载**静态骨架**（顶栏/侧栏/属性面板/弹窗）的等价 JSX 化，
     id/class/层级逐字保留；CSS 切 8 文件字节等价拼接。
  2. **画布层（#nodes-layer、SVG 连线、端口测量、拖拽/滚轮交互）保持命令式模块**，
     在 React 组件 useEffect 中挂载——300+ 节点高频 DOM 操作不做响应式化，
     同时消除虚拟 DOM diff 引入 1:1 漂移与性能风险的可能。
  3. 分 6-8 个 checkpoint 迁移，每个 checkpoint 过像素门禁后提交。
- 备选：全响应式化（拒绝：门禁风险与性能不可控）；继续单文件（拒绝：不可维护）。

# ADR-0003 · 单一事实源 packages/shared

- 状态：已接受（2026-10-21）
- 背景：盘点发现前后端 5 处手工同步（节点显示名/参数默认值/模型列表/知识库名/
  MCP 注册表），已出现漂移土壤。
- 决策：`packages/shared`（TS）承载节点注册表（DEFS 单一来源）与 15 种 SSE
  事件 zod 契约；后端 engine 的 DEFS_META/paramsDefaults 改由其派生；
  契约测试用正则从 index.html 权威 DEFS 提取默认值做交叉校验，
  前端 Stage 2 迁移后直接 import，届时删除测试中的 HTML 提取逻辑。
- 后果：改节点定义只改一处；前后端漂移在 CI 被测试捕获。
