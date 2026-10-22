# SPEC · 迭代 0008 · BK-0012 legacy 模块与 React 骨架职责边界文档化（ROADMAP T1-M2）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 19:15
> 输入：`iterations/0008/PRD.md`（REQ-0012-01~06 / AC1–AC6）+ 四模块源码与头注、
> App.tsx、main.tsx、CONSTITUTION.md、AGENTS.md、ADR-0002/0003/0005/0006、
> `iterations/0001/JOURNAL.md`、gate.mjs、evolution-iteration.dwf.ts。
> 本会话只读核验记录见 §3（每条陈述可溯）。

## 0. 范围定性与 ADR 判定

1. **纯文档项，零代码改动**：唯一产品产物为 `docs/` 下新增 Markdown 1 个文件
   （PRD REQ-0012-01/06）。宪法第 4 条明文文档不在门禁适用范围
   （`CONSTITUTION.md:47`），触 UI=否（PRD 分类结论，本 SPEC 认同）。
2. **needsAdr = false**：本项是**现状整合**，不含任何新架构选型——四模块边界
   的决策已分别沉淀于 ADR-0002（机械移植 + 命令式画布）、ADR-0003（shared 单一
   事实源）、ADR-0006（前端持久化数据层与渲染时序规约）；PRD 背景 8 同判定且
   明令「不新增 ADR 编号」。SPEC 的唯一裁量点是文档命名定稿（§1.1），属 REQ-0012-01
   明示授权，非架构决策，不触发 ADR 通道。

## 1. 交付物规格：`docs/frontend-module-boundaries.md`

### 1.1 落位与命名（REQ-0012-01 定稿）

- **定稿路径：`docs/frontend-module-boundaries.md`**（采纳 PRD 建议：英文名
  kebab-case 与 `docs/adr/` 文件名风格一致，中文正文）。位于 `docs/` 根、
  `docs/evolution/` 之外——防打转过滤器放行侧（`evolution-iteration.dwf.ts:241`
  本会话复核，产品提交非空的机器判据）。
- 纯新增单文件；**不得改动任何既有文件**（含四模块头注本身——文档引用现状头注，
  非改写头注迁就文档，PRD 非目标）。
- 行数建议 ≤ 200 行（PRD 非功能 1；超出先砍冗余，不砍 §1.3 四要素与时序节）。
- 风格与 `docs/ai-sdk-7-功能汇总.md` 一致：条目化、表格化、指针化。

### 1.2 文档骨架（章节模板，BUILD 按此落笔）

```markdown
# 前端四模块职责边界（现状整合视图）
> 头部声明（必置）：本文件是对现状的整合视图与导航，不构成新约束源；
> 约束以 CONSTITUTION.md / AGENTS.md / docs/adr/ 为准，冲突时以宪法为先。
> 行数等易变数据核对日期：2026-10-22。

## 1. 总览（四模块一览表：路径 / 行数(核对日期) / 一句话职责 / 边界权威指针）
## 2. Skeleton.tsx —— 静态骨架等价 JSX
## 3. legacy/app.js —— 画布与交互命令式模块
## 4. server-sync.js —— /api/v1 数据与状态层
## 5. app.css —— CSS 原文逐字冻结
## 6. 组合时序与数据流（App.tsx 挂载链路）
```

第 2–5 节每节必含**四要素**小节：① 职责边界 ② 禁止事项 ③ 依赖与互操作
④ 事实源指针（REQ-0012-02）。头部声明是 PRD 风险 5 的落实点（防文档升格为
第六个散落源）。

### 1.3 内容基线 · 四模块四要素（REQ-0012-02；指针均已本会话核验）

**§2 Skeleton.tsx（182 行）**

| 要素 | 必含内容 | 事实源指针 |
| --- | --- | --- |
| 职责 | 静态骨架**等价 JSX 唯一源**（ADR-0002 CP-C）：顶栏/左侧 rail/侧栏/属性面板/日志面板/弹窗等 app 壳层静态结构；画布容器 `#viewport`（`Skeleton.tsx:71`）内 `#nodes-layer` 为**空容器**（`Skeleton.tsx:74`），子树由 legacy 命令式生成 | `Skeleton.tsx:1-7`；ADR-0002 CP-C（`docs/adr/0001-0003-constitution-mechanical-port-shared.md:33-44`） |
| 职责 | 机械转换五规则：id/class/层级/属性值逐字保留；class→className；style 串→对象（CSS 值逐字）；非 void 标签显式闭合；`<table>` 内显式 `<tbody>` | `Skeleton.tsx:3-6`；ADR-0002 CP-C 实施记录 |
| 禁止 | 不含运行态逻辑（React 侧唯一 effect 是 App.tsx 挂载 `bootLegacyApp()`）；不生成画布内容；改 DOM/视觉即触宪法第 1 条 | `App.tsx:12-15`；`CONSTITUTION.md:10-18` |
| 互操作 | 被 `App.tsx` 唯一消费（import + return） | `App.tsx:10,14` |
| 事实源 | 退役史：skeleton.html −168 行 / Skeleton.tsx +182 行同一提交删除与新增；原文权威在 git 历史与 golden 基线 | 提交 `828ae57`（`iterations/0001/JOURNAL.md:135-145` git show --stat）；`Skeleton.tsx:2-3` |

**§3 legacy/app.js（2419 行）**

| 要素 | 必含内容 | 事实源指针 |
| --- | --- | --- |
| 职责 | 画布/交互命令式模块：自原单文件 index.html **逐字提取**（提取工具 tools/extract-web.mjs 已退役）+ `bootLegacyApp()` 包装；挂载幂等（`__af_booted` 防重入）；承载宪法第 1 条交互层全部语义（拖拽/缩放/框选/连线/滚轮门控/数字步进/快捷键/审批弹窗） | `app.js:1-2,9-11`；`CONSTITUTION.md:18`；ADR-0002 决策 2 |
| 禁止 | **DEFS 不得本地复制**：节点注册表/SSE 契约唯一来源是 `packages/shared`（违例由契约测试抓 DEFS 漂移，AGENTS 硬性约定 2）；UI 三层改动禁止（本文件是结构层/交互层主要载体） | `app.js:3,133`（`const DEFS = NODES`）；ADR-0003；`AGENTS.md` 硬性约定 1/2 |
| 互操作 | import `@agentflow/shared` 的 NODES；import `server-sync.js` 导出（SVR / fetch·save·delete / refresh·load 系列 / on*Arrive 回调 / fmtTs / replayLines / runCardMeta）；**运行类端点直连 `/api/*` 别名是合法现状**（`/api/health` 探活、`/api/run` 提交、approve/stop 控制），与 server-sync 的「仅 /api/v1」分属两个作用域（见 §4 精确化注记） | `app.js:3-6,2041,2062,2220,2230` |
| 事实源 | 存量 2419 行不违 AGENTS 硬性约定 4（400 行上限只约束**新增**源文件）；模块化拆分是长期余量，本文档只记载、不执行 | `AGENTS.md` 硬性约定 4；`iterations/0001/JOURNAL.md:96-97`（§4.2-2） |

**§4 server-sync.js（131 行）**

| 要素 | 必含内容 | 事实源指针 |
| --- | --- | --- |
| 职责 | `/api/v1` **数据与状态层**（ADR-0006 方案 A §4.4）四块能力：① fetch 封装（非 2xx/网络错误统一抛 Error，调用方静默降级；`AbortSignal.timeout(8000)`）② 服务端列表缓存 SVR（**内存态、不入 localStorage**；null=尚未成功拉取）③ 回放事件→`.logline` 行映射（run:progress / node:delta 不落日志；`.t` 列显示事件序号，不虚构时间）④ 按需刷新回调注册 | `server-sync.js:1-9,15-20,35-43,45-48,78-120`；ADR-0006 §4.3/§4.4（`docs/adr/0006-frontend-persistence-ui.md:142-177`） |
| 禁止 | **不直接操作面板 DOM**：渲染时序规约归 app.js——fetch 完成后仅触发注册的回调重绘**对应分组容器**，不得整面板重绘；**仅 `/api/v1` 命名空间**（持久化端点无旧别名） | `server-sync.js:5-8,11`；ADR-0006 §4.6（`docs/adr/0006-frontend-persistence-ui.md:187-191`）；ADR-0005 |
| 互操作 | 被 legacy/app.js 消费（不操作面板 DOM、被 legacy 消费是双向契约） | `app.js:4-6`；`server-sync.js:2-3` 头注 |

**精确化注记（作用域区分，防误改）**：「仅 /api/v1」是 **server-sync.js（持久化类
端点）** 的约束；`legacy/app.js` 直连的 `/api/health`、`/api/run`、approve/stop 属
运行类端点，走 `/api/*` 别名是**合法现状**（AGENTS.md 仓库地图：`/api/v1/*` 正式
命名空间与 `/api/*` 别名并存，workflows/runs 持久化新端点仅 v1）。文档必须把两个
作用域分开写，防止未来协作者把 app.js:2041/2062/2220/2230 的别名调用当违例「修正」，
或反向放任 server-sync 使用别名。（本会话 grep 核验：app.js 内 fetch 调用恰为
上述 4 处，均 `/api/*`；server-sync 内全部经 `V1='/api/v1'` 前缀拼接。）

**§5 app.css（532 行）**

| 要素 | 必含内容 | 事实源指针 |
| --- | --- | --- |
| 职责/现状 | CSS **原文逐字冻结**：宪法第 1 条结构层冻结「CSS 源文件的选择器与声明」（拆分文件时保持字节等价拼接）；色板取自 ComfyUI 实机截图像素采样 | `CONSTITUTION.md:16-18`；`AGENTS.md` 硬性约定 1；`app.css:1-5` |
| 保护机制 | **如实记载现状、不新设机制**：逐字等价无专用自动断言；由 gate 像素门禁 4 场景 0 容差 diff + DOM 不变量 `:root` cssVars 表比对**间接保护** | `tools/pixel-gate/gate.mjs:91`；`iterations/0001/JOURNAL.md:93-95`（§4.2-1） |
| 互操作 | 由 `main.tsx` 引入构建（`import './app.css'`） | `main.tsx:3` |

### 1.4 内容基线 · 组合时序与数据流（REQ-0012-03，第 6 节）

以 `App.tsx` 为组合点，四步链路（每步挂指针）：

1. React 渲染 `<Skeleton />` → app 壳层静态 DOM 就位（`App.tsx:14`）；
2. `useEffect` 挂载后调 `bootLegacyApp()`（幂等）→ legacy 接管画布与全部交互
   （`App.tsx:13`；`app.js:9-11`）；
3. server-sync 数据到达（refreshWorkflows / refreshRuns / loadRunDetail）→ **仅**
   触发 app.js 注册的回调重绘对应分组容器，不整面板重绘（`server-sync.js:50-67`；
   ADR-0006 §4.6）；
4. 历史回放为静态重放：replayLines 仅产出 logline 行数据，不产生任何画布副作用
   （`server-sync.js:78-84` 块注释）。

### 1.5 可追溯与「引用不复制」规约（REQ-0012-04/05）

- 每条边界/禁止/互操作断言必须挂四类指针之一：`路径:行` / ADR 编号 / 宪法·AGENTS
  条款 / 提交号；禁止无事实源陈述（与 `ROADMAP.md:5-7` 禁「看起来一致」同口径）。
- 行数等易变数据一律带「核对日期：2026-10-22」；BUILD 时 `wc -l` 复核（§5 步骤 1），
  漂移以实测为准更新文档后再提交（PRD AC2 如实原则）。
- 宪法条文、AGENTS 约定、`packages/shared` DEFS 数据一律**指针引用不整段复制**
  （例：「见 CONSTITUTION.md 第 1 条」）——文档增量价值是整合视图与追溯链，
  不是第二份原文。

## 2. 受影响文件清单

### 2.1 产品提交面（唯一产品改动，AC4 白名单机器核对）

| 动作 | 路径 | 约束 |
| --- | --- | --- |
| 新增 | `docs/frontend-module-boundaries.md` | 单文件；≤200 行建议；按 §1.2 骨架 + §1.3/§1.4 内容基线 |

### 2.2 零改动面（任何一条出现即 AC4 红、迭代按违例处理）

`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、`CONSTITUTION.md`、
`AGENTS.md`、CI 配置；既有 `docs/` 文件全部（含四模块头注、README、既有 ADR、
`docs/ai-sdk-7-功能汇总.md`）。

### 2.3 迭代产物面（非产品面；归档提交由工作流脚本/CLOSE 处理）

`docs/evolution/iterations/0008/`：SPEC.md（本文件，本阶段落盘）+ 后续
JOURNAL.md（BUILD）+ REPORT.md（VERIFY）；CLOSE 时 STATE.md / BACKLOG.md /
metrics.md 随归档提交更新（WORKFLOW §4）。

## 3. SPEC 会话事实核验表（2026-10-22 19:05-19:15 本会话只读执行）

| # | 事实 | 核验方式 |
| --- | --- | --- |
| 3.1 | 四模块行数 = 182 / 2419 / 131 / 532（App.tsx 另 15 行），与 PRD 背景 2、`iterations/0001/JOURNAL.md:164-169` 零漂移 | `wc -l apps/web/src/Skeleton.tsx apps/web/src/legacy/app.js apps/web/src/server-sync.js apps/web/src/app.css apps/web/src/App.tsx` |
| 3.2 | 边界文档不存在；`docs/` 现仅 adr/ + ai-sdk-7-功能汇总.md + evolution/；ADR 编号止于 0008 | `ls docs/` + `ls docs/adr/` |
| 3.3 | 四模块头注、App.tsx 全文、`#viewport`/空 `#nodes-layer`、`__af_booted` 幂等、`const DEFS = NODES`、SVR/回调/映射导出、`:root` 色板注释均在所述行号 | Read `Skeleton.tsx:1-40`、`app.js:1-160`、`server-sync.js` 全文、`App.tsx` 全文、`app.css:1-20`；`grep -n "viewport\|nodes-layer" Skeleton.tsx`（:71/:74） |
| 3.4 | app.js 直连 `/api/*` 恰 4 处（health/stop/approve/run），server-sync 全部 `V1='/api/v1'` 拼接；app.css 由 `main.tsx:3` 引入 | `grep -n "fetch(" apps/web/src/legacy/app.js`；`grep -rn "app.css" apps/web/src`（排除 legacy） |
| 3.5 | 防打转过滤器：产品提交 = `docs/evolution/` 之外改动，空则 blocked | `sed -n '230,250p' .zcode/workflows/evolution-iteration.dwf.ts`（过滤行 :241） |
| 3.6 | gate 场景恰 4 个（s0-initial / s1-select-node / s2-settings / s3-library）；cssVars 断言在 `gate.mjs:91` | `sed -n '55,70p' tools/pixel-gate/gate.mjs`；`grep -n "cssVars\|:root" gate.mjs` |
| 3.7 | `npm test` 现口径 = node --test 8 项（迭代 0003 起） | `metrics.md` 迭代 0003–0006 各行（node --test 8 项记载） |
| 3.8 | ADR-0002 CP-C 记录、ADR-0006 §4.3/§4.4/§4.6 原文与行号 | Read `docs/adr/0001-0003-...md` 全文；`sed -n '170,200p' docs/adr/0006-...md` |
| 3.9 | BK-0012 条目、T1-M2 验收口径、0001 盘点 §4 边界记载 | Read `BACKLOG.md`（:25）、`ROADMAP.md`（:29-37）、`iterations/0001/JOURNAL.md` 全文 |

## 4. 验收口径

### 4.1 机器门禁（BUILD 后由工作流脚本统一执行，WORKFLOW §4）

| 命令 | 通过判据 | 对应 |
| --- | --- | --- |
| `npm run build` | shared + web 构建成功（gate 前置） | AC3 前置 |
| `npm run gate` | 4 场景（s0-s3，`gate.mjs:60-65`）全绿 diffPx=0 | AC3、T1-M2 验收② |
| `npm test` | node --test 8 项全绿（`metrics.md` 迭代 0003 起口径） | AC3 |

### 4.2 手动 E2E 点位（VERIFY 逐条执行并留证 REPORT）

- **E1 · 落位与覆盖（AC1）**：`ls docs/` 确认 `frontend-module-boundaries.md` 存在
  且在 `docs/evolution/` 之外；打开文档核对章节骨架与 §1.2 一致——四模块各一节、
  每节四要素小节齐备、组合时序节在位、头部声明（现状整合视图 + 约束顺位）在位。
- **E2 · 指针抽查（AC2）**：四模块节各抽 ≥2 条、组合时序节抽 ≥2 条（合计 ≥10 条）
  指针，逐条以 `sed -n 'X,Yp' <路径>`（或 Read）验证指向内容确实支撑该断言，
  抽查清单与结果记入 REPORT。
- **E3 · 行数复核（AC2）**：`wc -l` 四模块 = 182 / 2419 / 131 / 532，与文档
  「核对日期：2026-10-22」行一致；漂移则以实测为准更新文档（如实原则）。
- **E4 · 引用不复制（AC6）**：对照 `CONSTITUTION.md` 第 1 条、AGENTS.md 硬性约定 1、
  `packages/shared/src/nodes.ts`——文档中无整段复制（宪法条文/DEFS 数据以指针引用）。
- **E5 · 改动面白名单（AC4/AC5）**：`git status --porcelain` 产品改动仅
  `docs/frontend-module-boundaries.md` 一个新增路径（§2.2 清单零出现）；防打转
  判据由脚本执行（productPaths 非空 → 产品提交成立）。

### 4.3 明示排除项（如实记档，不装作跑过）

- **无浏览器交互 E2E**：本项零渲染路径接触（PRD AC3 以 gate 机器判据为裁决），
  不设在线点位；VERIFY 在 REPORT「未跑项/排除项」栏注明理由。
- **无 `npm run gate:update` / golden 重录 / smoke:server**：非本项验收面
  （WORKFLOW §6 护栏 2；PRD 非目标）。smoke/test:canvas 为存量回归，不在本项
  AC 内，VERIFY 可选跑但不作判据。

## 5. BUILD 实施序列

1. **基线复核**：`wc -l` 四模块，预期 182 / 2419 / 131 / 532（§3.1）；漂移则以
   实测值入文档并同步核对日期。
2. **撰写文档**：按 §1.2 骨架新建 `docs/frontend-module-boundaries.md`，内容按
   §1.3 各表 + §1.4 时序 + §1.5 规约落笔；指针从本 SPEC §3 核验表直取。
3. **自查清单**：四节×四要素齐备；时序四步在位；头部声明在位；行数 ≤200；
   每条断言有指针；无宪法/AGENTS/DEFS 整段复制；「仅 /api/v1」作用域注记在位
   （§4 精确化注记）。
4. **门禁与提交**：`npm run build` / `npm run gate` / `npm test` 与 git 白名单
   核对、产品提交均由工作流脚本统一执行（BUILD 不自行 git 写操作，同迭代 0001
   JOURNAL §0 分工惯例）；JOURNAL.md 记录撰写过程与自查输出。

## 6. 风险与回滚

| 风险 | SPEC 落实点 |
| --- | --- |
| 文档陈旧化（PRD 风险 1） | 行数带核对日期（§1.5）；BUILD 步骤 1 复核；治理日抽查兜底，不建自动机制 |
| 双源漂移（PRD 风险 2） | 引用不复制规约（§1.5）+ E4 抽查 |
| 空提交复发（PRD 风险 3） | 落位 `docs/` 根（§1.1，`docs/evolution/` 之外）+ E5 双判据 |
| 范围蔓延（PRD 风险 4） | §2.2 零改动面白名单；任何 `apps/**` 改动即红 |
| 文档被误读为新约束源（PRD 风险 5） | 头部声明模板（§1.2）为必置项，E1 核对 |
| 作用域误读（本 SPEC 新增）：「仅 /api/v1」被泛化到 app.js | §4 精确化注记强制入文档，E1/E2 覆盖 |
| 回滚 | 纯新增单文件，`git revert` 产品提交即净（WORKFLOW §6 护栏 6，禁 force/reset） |
