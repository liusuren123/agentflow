# PRD · 迭代 0008 · BK-0012 legacy 模块与 React 骨架职责边界文档化（ROADMAP T1-M2）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 19:10
> 来源：BACKLOG BK-0012（P1 / doc / S / ready / 触UI=否，`docs/evolution/BACKLOG.md:25`）；
> 主题归属 ROADMAP T1·移植收尾与骨架一致性 · 里程碑 M2（`docs/evolution/ROADMAP.md:29-37`，
> 验收口径为迭代 0001 细化版）。0007 补题轮新增项（`iterations/0007/PRD.md:55-70`），
> 本轮为该选题的正常实现轮。
> 选题依据：ready 队列现存 4 项——BK-0012（P1/S/doc）与 BK-0005/0010/0011（均 P2/S）
> （`BACKLOG.md:20,23-25` 全表核对，2026-10-22 19:05 本会话实查；其余为 done×5 /
> blocked×1 / proposed×2 / 待批准区×1）。BK-0012 为**唯一 P1** → 最高优先级 ready；
> S 大小正合选题规则偏好（优先 S/M，无 L 项需拆分）。
> 与最近 3 次迭代零重叠：0005=apps/server+tests/smoke（websearch eng 路由）、
> 0006=tests/canvas+package.json 一行（portCache 回归）、0007=纯 docs/evolution/ 补题轮
> （零实现）——本项产品改动面为 `docs/` 下**新文档 1 个文件**（`docs/evolution/` 之外），
> 与三者路径互斥。

## 结论

**建议做（本迭代即做）**：一句话理由——前端四模块（`Skeleton.tsx` / `legacy/app.js` /
`server-sync.js` / `app.css`）的职责边界目前散落在五处（各文件头注 + AGENTS.md 仓库地图 +
ADR-0002/0003/0006 + 迭代 0001 盘点 JOURNAL），无一处整合视图（本会话 `ls docs/` 实查：
仅 adr/、ai-sdk-7-功能汇总.md、evolution/，边界文档不存在）；任何新协作者（人或 AI）改前端
前必须逆向工程 3264 行代码才能知道「哪个文件能动、哪个绝不能动」。ROADMAP T1-M2 是全图
**最后一个无承载项的里程碑**（0007 PRD 防重复对照核实），纯文档项 S 大小单迭代可完整交付
并直接关账 T1-M2——补齐后 T1 主题四里程碑全部闭环。

## 触 UI 分类结论

**否。** 论证（逐层对照宪法第 1 条三层）：

1. **文档在门禁不适用清单内**：宪法第 4 条明文「不适用于……后端逻辑、构建配置、
   文档、测试」（`CONSTITUTION.md:47`）。本项唯一产品产物是 `docs/` 下新 Markdown 文档，
   **描述**现状、不改 `apps/web` / `packages/shared` 任何字节——不触视觉/DOM/交互三层。
2. **改动面白名单机器可核**：产品提交仅含 `docs/` 新文档 1 个文件（REQ-0012-06/AC4）；
   `apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、`CONSTITUTION.md`、
   `AGENTS.md` 零改动（WORKFLOW §6 护栏 3 的受保护路径全在禁改清单）。
3. **防误触兜底**：验收仍要求 `npm run gate` 4 场景全绿 + `npm test` 全绿（AC3）——
   文档项零渲染路径接触的机器证据，此判据即 ROADMAP T1-M2 验收②原文
   （`ROADMAP.md:36-37`「文档变更不得触碰渲染路径」）。

## 背景（含代码事实源，2026-10-22 19:05-19:10 本会话只读核实）

1. **T1-M2 验收口径（唯一权威）**：`ROADMAP.md:33-37` 迭代 0001 细化版——① 边界说明
   文档合入 `docs/`，覆盖四模块：`Skeleton.tsx`（182 行）只承载静态骨架等价 JSX；
   `src/legacy/app.js`（2419 行）画布/交互命令式（逐字提取 + bootLegacyApp）；
   `src/server-sync.js`（131 行）/api/v1 数据接入、不操作面板 DOM；`app.css`（532 行）
   逐字冻结；② 合入后 `npm run gate` 仍 4 场景全绿。
2. **行数基线复核**：本会话 `wc -l` 实测四模块 = 182 / 2419 / 131 / 532（合计 3264），
   与迭代 0001 盘点（`iterations/0001/JOURNAL.md` §4.1 与 §6 附录 wc 输出）**逐项一致，
   零漂移**——文档行数数据有可靠事实源，BUILD 时再复核一次即可（AC2）。
3. **边界信息现状散落五处**（本会话逐处核实）：
   - `Skeleton.tsx:1-7` 头注：等价 JSX 机械转换规则（id/class/层级/属性值逐字保留、
     class→className、style 串→对象、非 void 显式闭合、table 内显式 tbody）；
   - `legacy/app.js:1-2` 头注：tools/extract-web.mjs 逐字提取 + `bootLegacyApp()` 包装；
     `app.js:3` 消费 `@agentflow/shared`（`app.js:133` `const DEFS = NODES` 单一事实源锚点）；
   - `server-sync.js:1-9` 头注：ADR-0006 方案 A、数据与状态层定位、明示
     「不直接操作面板 DOM：渲染时序规约归 app.js」、仅 /api/v1 命名空间；
   - `App.tsx:1-7` 头注 + `App.tsx:12-15`：React 只承载骨架，`useEffect` 挂载后
     `bootLegacyApp()`——四模块的组合点与挂载时序；
   - `app.css:1-5` 头注：色板取自 ComfyUI 实机截图像素采样；AGENTS.md 硬性约定 1
     「UI 三层不许改、CSS 原文逐字」；宪法第 1 条（`CONSTITUTION.md:10-18`）结构层
     冻结 CSS 选择器与声明。
   JOURNAL §4.3 结论原话：「职责边界现状散落于各文件头注 + AGENTS.md 仓库地图，无独立
   的边界说明文档合入 `docs/`——此即 T1-M2（未开始）的全部余量」。
4. **app.css 的保护机制**（文档须如实记载现状而非新设机制）：逐字等价无专用自动断言，
   由 gate DOM 不变量的 `:root` cssVars 比对间接保护（`iterations/0001/JOURNAL.md` §4.2-1）。
5. **legacy/app.js 行数与 400 行约定的关系**：AGENTS.md 硬性约定 4 的上限只约束**新增**
   源文件，存量 2419 行不违例；模块化拆分是长期余量记录（JOURNAL §4.2-2），本项文档
   只记载该边界事实，不做拆分。
6. **防打转机制与 BK-0001 教训**：工作流脚本的产品提交过滤器只收 `docs/evolution/`
   之外路径（`.zcode/workflows/evolution-iteration.dwf.ts:241` 本会话实查：
   `changed.filter((p) => !p.startsWith("docs/evolution/"))`，空则判 blocked——
   `BACKLOG.md:14` BK-0001 备注与 `metrics.md:7` 同因）。本项产品提交目标（docs/ 新
   文档）在过滤器放行侧，通道先例已验证：BK-0006 README.md（`metrics.md:10`，
   产品提交 01c6749）。
7. **gate/test 现状口径**：gate 场景 s0-initial / s1-select-node / s2-settings /
   s3-library 共 4 个（`tools/pixel-gate/gate.mjs:60-65` 本会话实查）；`npm test` 为
   node --test 8 项（迭代 0003 后口径，`metrics.md:9-12` 各行）。两者全绿是本项 AC3。
8. **docs/ 目录先例**：`docs/ai-sdk-7-功能汇总.md` 为中文技术文档既有风格参照；
   ADR 编号现止于 0008（`docs/adr/` 本会话 ls 实查）——本项**不是 ADR**（描述现状而非
   架构决策，决策已在 ADR-0002/0003/0006 沉淀），不新增 ADR 编号。

## 目标

1. 关账 ROADMAP T1-M2：`docs/` 合入四模块职责边界说明文档，一处可读掌握
   「哪个文件承载什么、禁止什么、如何互操作、事实源在哪」。
2. 把「边界知识」从人脑/头注考古升级为可引用、可追溯的仓库产物：新协作者（人或 AI）
   改前端前的第一站；后续 T1 类余量（如 app.js 模块化评估）的事实基座。
3. T1 主题四里程碑全部闭环（M1 已于迭代 0001 关账，`ROADMAP.md:16-28`）。

## 非目标（out of scope）

- **不改任何代码**：`apps/**`、`packages/**`、`tools/**`、`tests/**` 零改动（AC4 白名单
  机器核对）；包括**不改四模块头注本身**（文档引用现状头注，而非改写头注去迁就文档）。
- 不新增 ADR、不重录 golden、不运行 `npm run gate:update`（WORKFLOW §6 护栏 2）；
  不改 `CONSTITUTION.md`、`AGENTS.md`、CI 配置（护栏 3）。
- 不更新 ROADMAP / BACKLOG / metrics 状态（CLOSE 职责，本项交付物不含治理文件变更）。
- 不做 legacy/app.js 模块化拆分或任何重构（背景 5，长期余量另行评估）。
- 不复制 CONSTITUTION / AGENTS / DEFS 正文（REQ-0012-05 引用不复制原则）。

## 用户故事

1. 作为新加入的 AI 协作者（或人类开发者），我在动前端代码前读一份文档即掌握四模块
   边界与禁止事项，不必逆向工程 3264 行代码或考古五个散落出处。
2. 作为 code-developer，我明确知道：`app.css` 逐字冻结、`Skeleton.tsx` 不含运行态逻辑、
   `server-sync.js` 不操作面板 DOM、`legacy/app.js` 消费 `@agentflow/shared`——
   违反任一条即触宪法，先停手走修宪通道。
3. 作为 test-manager，我需要文档项的零渲染影响有机器判据（gate/test 全绿 + git 白名单），
   而非「文档当然不影响」的假设。
4. 作为仓库所有者，我需要 T1-M2 关账证据可审计：文档每条陈述挂事实源指针，
   符合 ROADMAP 头注「禁止以『看起来一致』作为任何判定依据」的口径（`ROADMAP.md:5-7`）。

## 需求条目

- **REQ-0012-01 · 文档落位与形态**：`docs/` 根下新增**单一** Markdown 边界文档
  （`docs/evolution/` 之外——防打转过滤器判据，背景 6）。命名建议
  `docs/frontend-module-boundaries.md`（英文名与 ADR 文件名风格一致；中文正文），
  最终命名 SPEC 定稿。文档为纯新增文件，不改任何既有文件。
- **REQ-0012-02 · 四模块覆盖矩阵（内容硬口径）**：每模块一节，各含四要素——
  ① 职责边界；② 禁止事项；③ 依赖与互操作；④ 事实源指针（`路径:行` / ADR 编号 /
  宪法·AGENTS 条款 / 提交号）。最低内容基线（对应背景 2-5 逐条核实的事实）：
  - `Skeleton.tsx`：静态骨架等价 JSX 唯一源；机械转换五规则（背景 3 第 1 条）；
    不含运行态逻辑（state/effect 组合时序归 App.tsx，`App.tsx:12-15`）；退役史
    （skeleton.html −168 / Skeleton.tsx +182，提交 828ae57，JOURNAL §6）。
  - `legacy/app.js`：画布/交互命令式模块（逐字提取 + bootLegacyApp 包装，`app.js:1-2`）；
    DEFS 单一事实源消费（`app.js:3,133`，ADR-0003）；存量 2419 行与 400 行新增上限的
    边界事实（背景 5）。
  - `server-sync.js`：/api/v1 数据与状态层（fetch 封装、内存态列表缓存不入
    localStorage、回放事件→logline 映射、按需刷新回调）；**不操作面板 DOM**（渲染时序
    归 app.js，`server-sync.js:6-7`）；仅 /api/v1 命名空间（ADR-0005/0006）。
  - `app.css`：CSS 原文逐字冻结（宪法第 1 条结构层）；保护机制现状 = gate 像素门禁 +
    DOM 不变量 cssVars 间接比对（背景 4，如实记载、不新设机制）。
- **REQ-0012-03 · 组合时序与数据流一节**：以 `App.tsx` 为组合点说明挂载链路——
  React 渲染 `<Skeleton/>` → `useEffect` 调 `bootLegacyApp()`（`App.tsx:12-15`）→
  legacy 接管画布 → server-sync 数据到达后仅触发注册回调重绘对应分组容器
  （`server-sync.js:6-7`）。此节是「互操作边界」的时序化表述，T1-M2 验收①
  「四模块覆盖」的完整性判据之一。
- **REQ-0012-04 · 可追溯硬口径**：文档内每条边界/禁止/互操作断言必须挂可核查指针
  （源文件头注行号、ADR 编号、宪法/AGENTS 条款、提交号四类之一）；行数等易变数据
  一律标注「核对日期」；禁止无事实源的凭空陈述（口径与 `ROADMAP.md:5-7` 同源）。
- **REQ-0012-05 · 引用不复制（防双源漂移）**：宪法条文、AGENTS 约定、DEFS 数据
  （节点注册表/SSE 契约）一律以指针引用（如「见 CONSTITUTION.md 第 1 条」），
  不整段复制正文——文档的增量价值是**整合视图与追溯链**，不是第二份原文。
- **REQ-0012-06 · 渲染零影响与改动面白名单（硬约束）**：产品提交的 git diff 仅允许
  `docs/` 下新文档 1 个文件；其余任何路径零改动（AC4 机器核对）。gate 4 场景 +
  `npm test` 全绿为提交前置（WORKFLOW §4 BUILD 门禁，非本项特设）。

## 非功能要求

1. **精炼**：AGENTS.md 硬性约定 4 的 400 行上限约束源文件，文档不属硬限对象；但单文件
   建议控制在 200 行以内（超出先自审砍冗余，不砍 REQ-0012-02 四要素）。
2. **风格一致**：中文 Markdown，与 `docs/ai-sdk-7-功能汇总.md` 同风格（条目化、
   表格化、指针化）。
3. **时效可核**：所有行数/现状数据带「核对日期：2026-10-22」；BUILD 时以 `wc -l`
   复核四模块行数仍与文档一致（AC2），不一致则以实测为准更新文档后再提交。
4. **零依赖**：无构建/运行时依赖；文档项不需任何工具链（gate/test 为既有门禁）。

## 验收标准（Given / When / Then）

- **AC1 · 文档落位与四模块覆盖**：Given 本 PRD 已落盘，When 检查 `docs/` 目录，
  Then 存在新边界文档（位于 `docs/evolution/` 之外，REQ-0012-01），含四模块各一节
  （Skeleton.tsx / legacy/app.js / server-sync.js / app.css），每节具备
  REQ-0012-02 四要素（职责/禁止/互操作/事实源），且含 REQ-0012-03 组合时序一节。
- **AC2 · 可追溯性与行数一致**：When 逐条核对文档陈述，Then 每条边界/禁止/互操作
  断言挂四类指针之一（路径:行 / ADR / 宪法·AGENTS 条款 / 提交号），无凭空陈述；
  文档行数数据带核对日期，且 BUILD 时 `wc -l` 复核四模块（182/2419/131/532 基线，
  背景 2）与文档记载一致——若代码现状已漂移，以实测为准更新文档（如实原则）。
- **AC3 · 渲染零影响**：When 产品提交前运行 `npm run build` + `npm run gate` +
  `npm test`（脚本统一门禁），Then gate 4 场景（s0-s3，`gate.mjs:60-65`）全绿
  diffPx=0、test 全绿（node --test 8 项口径，`metrics.md:9-12`）。
- **AC4 · 改动面白名单**：When 产品提交前核对 `git status` / git diff，Then 产品路径
  仅 `docs/` 新文档 1 个文件；`apps/**`、`packages/**`、`tools/**`、`tests/**`、
  `.github/**`、`CONSTITUTION.md`、`AGENTS.md` 零改动。
- **AC5 · 防打转通过**：Given AC4 成立（新文档在 `docs/evolution/` 之外），When 工作流
  脚本执行防打转校验（`evolution-iteration.dwf.ts:240-242`），Then productPaths 非空、
  产品提交成立——BK-0001 空提交复发风险排除的机器判据（背景 6）。
- **AC6 · 引用不复制**：When 抽查文档与 CONSTITUTION.md / AGENTS.md /
  `packages/shared` DEFS 的重叠度，Then 宪法条文与 DEFS 数据无整段复制（指针引用为主，
  REQ-0012-05）。

## 依赖与风险

- **依赖**：迭代 0001 盘点基线（`iterations/0001/JOURNAL.md` §4）——本会话已复核
  行数零漂移（背景 2），BUILD 时按 AC2 再复核一次；无其他构建/运行时依赖。
- **风险 1 · 文档随代码演进陈旧化**：行数等易变数据以「核对日期」限定时效；边界
  本身是宪法级稳定约定（UI 冻结期内四模块职责不变），漂移风险低；治理日抽查兜底
  （不在本项范围设自动校验——文档项不值得为此建机制）。
- **风险 2 · 复制原文造成双源漂移**：REQ-0012-05 立规 + AC6 抽查核对。
- **风险 3 · 空提交复发（BK-0001 同因）**：AC4 白名单 + AC5 防打转双重机器判据；
  SPEC 若把落位挪回 `docs/evolution/` 内即违例，回签 PLAN。
- **风险 4 · 范围蔓延（顺手改头注/改代码）**：非目标明令禁止；AC4 白名单机器核对，
  任何 `apps/**` 改动即红。
- **风险 5 · 文档内容被误读为新的约束源**：文档头须声明「本文件为现状整合视图，
  约束以 CONSTITUTION.md / AGENTS.md / ADR 为准」——避免文档升格为第六个散落源时
  与宪法冲突（宪法顺位最高）。此点并入 REQ-0012-05 的 SPEC 落实细节。

---

> 选题过程存证：本 PRD 由独立 PLAN 会话产出。ready 队列核对（`BACKLOG.md:20,23-25`，
> 2026-10-22 19:05 实查）：ready 共 4 项（BK-0012 P1 + BK-0005/0010/0011 P2）→ P1 唯一项
> BK-0012 选中；无 L 项需拆分。与最近 3 次迭代（0005=T3-M1 apps/server、0006=T2
> tests/canvas、0007=补题轮零实现）承载项与改动面零重叠。代码与文档引用均于
> 2026-10-22 19:05-19:10 本会话只读核实（四模块 wc -l 与头注 read、App.tsx 全文 read、
> docs 与 docs/adr 目录 ls、gate.mjs 场景段 sed、evolution-iteration.dwf.ts:240-242
> 防打转过滤段 sed、BACKLOG / ROADMAP / metrics / STATE / 0005-0007 三迭代 PRD、
> iterations/0001/JOURNAL.md 全文）。
