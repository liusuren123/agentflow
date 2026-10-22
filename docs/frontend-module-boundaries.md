# 前端四模块职责边界（现状整合视图）

> **定位声明**：本文件是对现状的整合视图与导航，**不构成新约束源**；约束以
> `CONSTITUTION.md` / `AGENTS.md` / `docs/adr/` 为准，冲突时以宪法为先。
> 引用原则：宪法条文、AGENTS 约定、`packages/shared` DEFS 数据一律指针引用、
> 不整段复制——本文档的增量价值是整合视图与追溯链，不是第二份原文。
> 行数等易变数据核对日期：**2026-10-22**（`wc -l` 实测，与迭代 0001 盘点基线
> `docs/evolution/iterations/0001/JOURNAL.md:164-169` 零漂移）。
> 来源：迭代 0008 · BK-0012（ROADMAP T1-M2）。

## 1. 总览

| 模块 | 路径 | 行数（核对 2026-10-22） | 一句话职责 | 边界权威指针 |
| --- | --- | --- | --- | --- |
| React 骨架 | `apps/web/src/Skeleton.tsx` | 182 | app 壳层静态结构的等价 JSX 唯一源 | ADR-0002 CP-C；`Skeleton.tsx:1-7` |
| 画布/交互 | `apps/web/src/legacy/app.js` | 2419 | 命令式画布与全部交互语义（bootLegacyApp） | ADR-0002 决策 2；宪法第 1 条交互层 |
| 数据接入 | `apps/web/src/server-sync.js` | 131 | `/api/v1` 数据与状态层，不操作面板 DOM | ADR-0006 方案 A；`server-sync.js:1-9` |
| 样式 | `apps/web/src/app.css` | 532 | CSS 原文逐字冻结 | 宪法第 1 条结构层；AGENTS.md 硬性约定 1 |

- 组合点：`apps/web/src/App.tsx`（15 行）——React 只承载骨架，挂载后 boot
  legacy（§6）。
- 样式经 `apps/web/src/main.tsx:3`（`import './app.css'`）进入构建。
- 节点注册表 / 参数默认值 / SSE 事件的单一事实源是 `packages/shared`
  （ADR-0003）：前端模块只消费、不复制（AGENTS.md 硬性约定 2）。

## 2. Skeleton.tsx —— 静态骨架等价 JSX

### 职责边界

- 静态骨架的**等价 JSX 唯一源**（ADR-0002 CP-C，
  `docs/adr/0001-0003-constitution-mechanical-port-shared.md:33-44`）：顶栏
  标签页、左侧图标工具栏、侧栏面板、浮动运行卡、底部日志面板、右侧属性
  面板、全部弹窗等 app 壳层静态结构（`Skeleton.tsx:1-7` 头注）。
- 画布容器 `#viewport`（`Skeleton.tsx:71`）内的 `#nodes-layer` 是**空容器**
  （`Skeleton.tsx:74`）——画布子树由 legacy 命令式生成，不在 JSX 内。

### 机械转换五规则（「等价 JSX」的含义）

id/class/层级/属性值逐字保留；`class`→`className`；style 串→对象（CSS 值
逐字）；非 void 标签显式闭合；`<table>` 内显式 `<tbody>`（`Skeleton.tsx:3-6`）。

### 禁止事项

- 不含运行态逻辑：React 侧唯一 effect 是 App.tsx 挂载 `bootLegacyApp()`
  （`App.tsx:12-15`）；state 组合与交互语义一律归 legacy 模块。
- 不生成画布内容（`#nodes-layer` 空，见上）。
- 改 DOM 结构 / 视觉即触宪法第 1 条结构层（`CONSTITUTION.md:16-18`）——
  唯一通道是宪法第 3 条：ADR + 用户本人批准后同 PR 重录 golden。

### 依赖与互操作

- 被 `App.tsx` 唯一消费：import（`App.tsx:10`）+ return `<Skeleton />`
  （`App.tsx:14`）。

### 事实源指针

- 退役史：`skeleton.html` −168 行 / `Skeleton.tsx` +182 行，同一提交内删除
  与新增（提交 `828ae57`，`git show --stat` 记录见
  `docs/evolution/iterations/0001/JOURNAL.md:135-145`）；原文权威在 git 历史
  与 golden 基线（`Skeleton.tsx:2-3`）。

## 3. legacy/app.js —— 画布与交互命令式模块

### 职责边界

- 画布/交互命令式模块：自原单文件 `index.html` **逐字提取**（提取工具
  `tools/extract-web.mjs` 已退役、git 历史可溯），包装为 `bootLegacyApp()`
  供 React 挂载（`app.js:1-2`）。
- 挂载幂等：`__af_booted` 防重入（`app.js:9-11`）；`main.tsx` 为保持单次
  挂载生命周期不启用 StrictMode（`main.tsx:5-6`）。
- 承载宪法第 1 条**交互层**全部语义：拖拽/缩放/框选/连线/滚轮门控/数字
  步进/快捷键/审批弹窗等（`CONSTITUTION.md:18`）；「画布层保持命令式」的
  架构决策见 ADR-0002 决策 2
  （`docs/adr/0001-0003-constitution-mechanical-port-shared.md:24-26`）。

### 禁止事项

- **DEFS 不得本地复制**：节点类型 / 参数默认值 / SSE 事件的唯一来源是
  `packages/shared`（ADR-0003）；本模块消费锚点为 `const DEFS = NODES`
  （`app.js:3,133`）。前后端各自复制即违例，由契约测试抓 DEFS 漂移
  （AGENTS.md 硬性约定 2）。
- UI 三层改动禁止：本文件是结构层 / 交互层的主要载体（宪法第 1 条；
  AGENTS.md 硬性约定 1）。

### 依赖与互操作

- import `@agentflow/shared` 的 `NODES`（`app.js:3`）。
- import `../server-sync.js` 导出：SVR / fetch·save·delete 系列 / refresh·load
  系列 / on*Arrive 回调 / fmtTs / replayLines / runCardMeta（`app.js:4-6`）。
- **运行类端点直连 `/api/*` 别名是合法现状**：`/api/health` 探活
  （`app.js:2041`）、`/api/run` 提交（`app.js:2230`）、approve/stop 控制
  （`app.js:2220,2062`）——与 server-sync 的「仅 /api/v1」分属两个作用域
  （§4 精确化注记）。

### 事实源指针

- 存量 2419 行不违 AGENTS.md 硬性约定 4（400 行上限只约束**新增**源文件）；
  模块化拆分是长期余量，本文档只记载、不执行
  （`docs/evolution/iterations/0001/JOURNAL.md:96-97` §4.2-2）。

## 4. server-sync.js —— /api/v1 数据与状态层

### 职责边界（ADR-0006 方案 A「数据与状态层」§4.4，`docs/adr/0006-frontend-persistence-ui.md:170-177`）

- fetch 封装：非 2xx / 网络错误统一抛 Error、调用方静默降级，超时
  `AbortSignal.timeout(8000)`（`server-sync.js:15-20`）。
- 服务端列表缓存 SVR：**内存态、不入 localStorage**；null = 尚未成功拉取
  （`server-sync.js:35-43`）。
- 回放事件 → `.logline` 行映射：run:progress / node:delta 不落日志；`.t` 列
  显示事件序号，不虚构时间（`server-sync.js:78-120`；ADR-0006 §4.3）。
- 按需刷新回调注册：app.js 注册、数据到达时触发（`server-sync.js:45-48`）。

### 禁止事项

- **不直接操作面板 DOM**：渲染时序规约归 app.js——fetch 完成后仅触发注册
  的回调重绘**对应分组容器**，不得整面板重绘（`server-sync.js:5-8`；
  ADR-0006 §4.6 渲染时序约束，`docs/adr/0006-frontend-persistence-ui.md:187-191`）。
- **仅 `/api/v1` 命名空间**：本模块所有请求经 `V1 = '/api/v1'` 前缀拼接
  （`server-sync.js:11,17`）；持久化端点无旧别名（ADR-0005）。

### 依赖与互操作

- 被 legacy/app.js 消费（`app.js:4-6`；`server-sync.js:2-3` 头注明示
  「被 legacy/app.js 消费」）。

### 事实源指针

- 模块头注（`server-sync.js:1-9`）与 ADR-0005（`docs/adr/0005-sqlite-persistence-apiv1.md`，
  /api/v1 正式命名空间）、ADR-0006（`docs/adr/0006-frontend-persistence-ui.md`
  §4.3/§4.4/§4.6，本模块能力与规约的设计源）。

### 精确化注记（作用域区分，防误改）

「仅 /api/v1」是 **server-sync.js（持久化类端点）** 的约束；`legacy/app.js`
直连的 `/api/health`、`/api/run`、approve/stop 属**运行类端点**，走 `/api/*`
别名是**合法现状**——`/api/v1/*` 正式命名空间与 `/api/*` 别名并存，
workflows/runs 持久化新端点仅 v1（AGENTS.md 仓库地图）。两个作用域必须分
开：既不能把 `app.js:2041/2062/2220/2230` 的别名调用当违例「修正」，也不
能反向放任 server-sync 使用别名。

## 5. app.css —— CSS 原文逐字冻结

### 职责边界（现状）

- CSS **原文逐字冻结**：宪法第 1 条结构层冻结「CSS 源文件的选择器与声明」
  （拆分文件时保持字节等价拼接；`CONSTITUTION.md:16-18`）；AGENTS.md 硬性
  约定 1 同款口径（仓库地图标注「CSS 原文（逐字，勿改）」）。
- 色板取自 ComfyUI 实机截图像素采样（`app.css:1-5` 头注与 `:root` 块）。

### 禁止事项

- 选择器与声明的任何改动（含「顺手优化」/格式化重排）均触宪法第 1 条结构层；
  确需拆分文件时保持字节等价拼接（`CONSTITUTION.md:16-18`；AGENTS.md 硬性
  约定 1）。

### 保护机制（如实记载现状，不新设机制）

- 逐字等价无专用自动断言；由 gate 像素门禁（4 场景 0 容差 diff）+ DOM
  不变量 `:root` cssVars 表比对**间接保护**（`tools/pixel-gate/gate.mjs:91`；
  `docs/evolution/iterations/0001/JOURNAL.md:93-95` §4.2-1）。

### 依赖与互操作

- 由 `main.tsx` 引入构建：`import './app.css'`（`main.tsx:3`）。

## 6. 组合时序与数据流（App.tsx 挂载链路）

组合点 `App.tsx`（头注：React 仅承载静态骨架，画布与全部交互在 legacy
模块，`App.tsx:1-7`）。四步链路：

1. React 渲染 `<Skeleton />` → app 壳层静态 DOM 就位（`App.tsx:14`）。
2. `useEffect` 挂载后调 `bootLegacyApp()`（幂等）→ legacy 接管画布与全部
   交互（`App.tsx:13`；`app.js:9-11`）。
3. server-sync 数据到达（refreshWorkflows / refreshRuns / loadRunDetail）→
   **仅**触发 app.js 注册的回调重绘对应分组容器，不整面板重绘
   （`server-sync.js:50-67`；ADR-0006 §4.6）。
4. 历史回放为静态重放：`replayLines` 仅产出 logline 行数据，不产生任何
   画布副作用（`server-sync.js:78-84` 块注释）。
