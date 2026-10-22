# REPORT · 迭代 0008 · BK-0012 legacy 模块与 React 骨架职责边界文档化（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-22 19:30
> 输入：`PRD.md`（AC1–AC6）+ `SPEC.md` §4 验收口径（E1–E5 + §4.3 排除项）+
> 产品产物 `docs/frontend-module-boundaries.md`（178 行）+ `JOURNAL.md`。
> 门禁分工：`npm run build` / `npm run gate` / `npm test` 由工作流脚本于 BUILD 后
> 统一执行（派发指令明示已通过，本 VERIFY 按指令不重跑全套；旁证见 §3）。

## 0. 结论

**verdict = PASS（6/6 AC 通过，无缺陷，无修复轮）**

- 验收对象：`docs/frontend-module-boundaries.md`（唯一产品产物，纯新增）。
- 判据：PRD AC1–AC6 逐条执行 + SPEC §4.2 E1–E5 逐点位留证 + 交互回归抽查
  （派发指令「针对性 E2E 按职责执行」→ 存量 Playwright 画布交互回归）。
- 本会话全部检查均为实跑（命令与输出见各节）；未跑项如实列入 §5。

## 1. AC 逐条结果

| AC | 判据 | 结果 | 证据（本会话实跑） |
| --- | --- | --- | --- |
| AC1 落位与覆盖 | `docs/` 下新文档在 `docs/evolution/` 之外；四模块各一节、四要素齐备；组合时序节 + 头部声明在位 | ✅ PASS | `ls docs/` 输出含 `frontend-module-boundaries.md`（与 `evolution/`、`adr/` 平级）。文档实读：头部定位声明（:3-9，现状整合视图不构成新约束源 + 约束顺位 + 引用原则 + 核对日期 2026-10-22）；§1 总览表；§2 Skeleton.tsx / §3 legacy/app.js / §4 server-sync.js / §5 app.css 各一节；§6 组合时序四步。四要素形态见 §1.1 说明 |
| AC2 可追溯与行数一致 | 每条断言挂四类指针之一；行数与实测一致带核对日期 | ✅ PASS | `wc -l` 实测四模块 = **182 / 2419 / 131 / 532**（另 App.tsx 15 / main.tsx 9 / 文档 178），与文档总览表「核对 2026-10-22」零漂移，与迭代 0001 基线（`iterations/0001/JOURNAL.md:164-169` 实读）逐项一致。指针抽查 30+ 条全中（清单见 §2），无一条虚指 |
| AC3 渲染零影响 | build + gate 4 场景 diffPx=0 + test 全绿 | ✅ PASS（脚本门禁） | 派发指令明示「build/gate/test 已由脚本运行且通过」，本 VERIFY 按指令不重跑全套。旁证（本会话实查）：`tests/golden/diff/` 目录文件计数 **0**（gate 失败会残留差异图，全绿则空）；`apps/web/dist` 构建产物在位（gate/test:canvas 前置满足）。T1-M2 验收②「文档变更不得触碰渲染路径」达成（`ROADMAP.md:33-37` 实读核对口径） |
| AC4 改动面白名单 | 产品路径仅 `docs/` 新文档 1 个；apps/packages/tools/tests/.github/CONSTITUTION/AGENTS 零改动 | ✅ PASS | `git status --porcelain` 实跑输出仅 3 行：` M docs/evolution/STATE.md`（迭代产物面）+ `?? docs/evolution/iterations/0008/`（迭代产物面：PRD/SPEC/JOURNAL）+ `?? docs/frontend-module-boundaries.md`（唯一产品路径）。§2.2 零改动清单全程零出现 |
| AC5 防打转 | productPaths 非空（产品路径在 `docs/evolution/` 之外）→ 产品提交成立 | ✅ PASS | 产品路径 `docs/frontend-module-boundaries.md` 在过滤器放行侧（`evolution-iteration.dwf.ts:241` 口径）；VERIFY 时点文件尚未入库（untracked），提交由工作流脚本在门禁后统一执行（JOURNAL §6 / STATE last_result 同分工记录）——时序属脚本控制，非缺陷；productPaths 非空判据已成立 |
| AC6 引用不复制 | 宪法条文 / AGENTS 约定 / DEFS 数据无整段复制，指针引用为主 | ✅ PASS | 宪法：文档仅指针（「宪法第 1 条结构层（`CONSTITUTION.md:16-18`）」「宪法第 3 条」）+ 一句概括，无正文复制；AGENTS.md：条款级引用 + 仓库地图条目 8 字短属性短语「CSS 原文（逐字，勿改）」作定位；`packages/shared` DEFS（events/nodes/types/index 共 237 行，`wc -l packages/shared/src/*.ts` 实测）：文档通篇零 DEFS 数据复制，仅指针 + `app.js:3,133` 锚点 |

### 1.1 形态观察（Minor，不影响 AC1 判定，如实记档）

- §5 app.css 节的「事实源指针」为**内联形式**（每条断言就地挂 `CONSTITUTION.md:16-18` /
  `gate.mjs:91` / `main.tsx:3` / `0001/JOURNAL.md:93-95`），非独立小节——SPEC §1.3 §5
  基线表本身即无独立事实源行（仅职责/保护机制/互操作三行、指针内联第三列），BUILD
  按 §1.3 基线落地并在 JOURNAL §4.2/§5 如实记录。AC1 判据「每节**具备**四要素
  （职责/禁止/互操作/事实源）」以内容在位为准：四要素内容全部在位且每条挂指针 → 达成。
- `app.js:9-11` 指针覆盖 `__af_booted` 声明（:10）与 `bootLegacyApp` 函数头（:11），
  防重入语句在 :12——指针指向机制代码块起始范围（SPEC §1.3 同指针），支撑断言成立。

## 2. E2 指针抽查清单（SPEC §4.2 要求 ≥10 条；本会话实跑 30+ 条，全部命中）

| # | 文档断言（节） | 指针 | 核验方式（本会话实跑） | 结果 |
| --- | --- | --- | --- | --- |
| 1 | §2 等价 JSX 头注五规则 | `Skeleton.tsx:1-7` / `:3-6` | `sed -n '1,10p'`：头注含五规则全文（id/class/层级/属性值逐字保留、class→className、style 串→对象、非 void 显式闭合、table 显式 tbody） | ✅ |
| 2 | §2 `#viewport` / 空 `#nodes-layer` | `Skeleton.tsx:71/:74` | `grep -n 'id="viewport"\|id="nodes-layer"'` → `71:` / `74:` 精确命中，`#nodes-layer` 为空 div | ✅ |
| 3 | §2 被 App.tsx 唯一消费 | `App.tsx:10,14` | Read 全文（15 行）：:10 `import Skeleton`、:14 `return <Skeleton />` | ✅ |
| 4 | §2 退役史 −168/+182 同一提交 | 提交 `828ae57`；`0001/JOURNAL.md:135-145` | `git show --stat 828ae57` 活仓库实跑：`Skeleton.tsx | 182 +`、`skeleton.html | 168 -`；0001 JOURNAL diffstat 段 sed 实读一致 | ✅ |
| 5 | §2 ADR-0002 CP-C | `...md:33-44` | `sed -n '33,44p'`：CP-C 实施记录（等价 JSX 转换、skeleton.html 删除、原文权威在 git 历史） | ✅ |
| 6 | §3 逐字提取 + bootLegacyApp 包装 | `app.js:1-2` | `sed -n '1,13p'`：头注两行原文 | ✅ |
| 7 | §3 挂载幂等 | `app.js:9-11` | 同上：:10 `let __af_booted = false`、:11 `export function bootLegacyApp(){`（:12 防重入语句，见 §1.1 观察） | ✅ |
| 8 | §3 DEFS 单一事实源 | `app.js:3,133` | :3 `import { NODES } from '@agentflow/shared'`；:133 `const DEFS = NODES;`（含 ADR-0003 注释） | ✅ |
| 9 | §3 import server-sync 导出清单 | `app.js:4-6` | :4-6 实读：SVR/refresh·load/fetch·save·delete 系列/on*Arrive/fmtTs/replayLines/runCardMeta 与文档列举一致 | ✅ |
| 10 | §3 运行类端点直连 `/api/*` 恰 4 处 | `app.js:2041/2062/2220/2230` | `grep -n "fetch(" app.js` → **仅 4 行命中**，行号与端点逐条对应（health/stop/approve/run） | ✅ |
| 11 | §3 main.tsx 无 StrictMode | `main.tsx:5-6` | Read 全文（9 行）：:5-6 注释原文（单次挂载生命周期） | ✅ |
| 12 | §3 2419 行与 400 行上限边界 | AGENTS 硬性约定 4；`0001/JOURNAL.md:96-97` | AGENTS.md 原文「新增源文件 ≤ 400 行」（仅约束新增）；0001 JOURNAL §4.2-2 sed 实读一致 | ✅ |
| 13 | §4 ADR-0002 决策 2（画布保持命令式） | `...md:24-26` | `sed -n '24,26p'`：决策 2 收尾（不做响应式化、消除虚拟 DOM diff 漂移） | ✅ |
| 14 | §4 头注定位（数据与状态层 / 被消费） | `server-sync.js:1-9` | Read 全文（131 行）：头注 :1-9 逐条对应 | ✅ |
| 15 | §4 不操作面板 DOM | `server-sync.js:5-8`；ADR-0006 §4.6 | :6-7 头注原文；`sed -n '187,191p' 0006`：§4.6「fetch 完成后仅更新该分组的容器节点，不得整面板重绘」 | ✅ |
| 16 | §4 fetch 封装 + 超时 8000 | `server-sync.js:15-20` | :16-20 apiJson：非 2xx 抛 Error、`AbortSignal.timeout(8000)`（:17） | ✅ |
| 17 | §4 SVR 内存态不入 localStorage | `server-sync.js:35-43`；ADR-0006 §4.4 | :35-43 SVR 定义（null=尚未成功拉取）；`sed -n '170,177p' 0006`：§4.4「均为内存态，不入 localStorage」 | ✅ |
| 18 | §4 回调注册 | `server-sync.js:45-48` | :46-48 wfArrive/runsArrive 注册 | ✅ |
| 19 | §4/§6 refresh/load 与回调重绘 | `server-sync.js:50-67` | :50-67 refreshWorkflows/refreshRuns/loadRunDetail → arrive 回调 | ✅ |
| 20 | §4/§6 回放静态重放、序号不虚构时间 | `server-sync.js:78-84`（块注释）/ `:78-120` | :78-84 块注释原文（静态重放不产生画布副作用、run:progress/node:delta 不落日志、序号唯一诚实顺序标记）；mapEvent/replayLines :85-120 | ✅ |
| 21 | §4 仅 /api/v1 前缀拼接 | `server-sync.js:11,17` | :11 `const V1 = '/api/v1'`；:17 `fetch(V1 + path, ...)` | ✅ |
| 22 | §4 精确化注记（作用域区分） | AGENTS 仓库地图；`app.js:2041/2062/2220/2230` | AGENTS.md 仓库地图原文「`/api/v1/*` 正式命名空间与 `/api/*` 别名并存，workflows/runs 新端点仅 v1」；app.js 4 处别名调用实测（#10）；server-sync 全文件仅 V1 拼接（#16/21）→ 双向区分成立 | ✅ |
| 23 | §5 色板像素采样头注 | `app.css:1-5` | `sed -n '1,8p'`：:3「色板：取自 ComfyUI 实机截图像素采样」+ `:root` 变量 | ✅ |
| 24 | §5 经 main.tsx 引入 | `main.tsx:3` | :3 `import './app.css'` | ✅ |
| 25 | §5 保护机制（gate cssVars 间接保护） | `gate.mjs:91`；`0001/JOURNAL.md:93-95` | `sed -n '88,93p' gate.mjs`：:91 cssVars 断言行；0001 JOURNAL §4.2-1 sed 实读一致 | ✅ |
| 26 | §5/AC3 gate 4 场景 | `gate.mjs:60-65` | `sed -n '55,70p' gate.mjs`：SCENARIOS 恰 4 项（s0-initial/s1-select-node/s2-settings/s3-library） | ✅ |
| 27 | §6 时序步骤 1/2 | `App.tsx:14/:13`；`app.js:9-11` | Read App.tsx 全文：:13 `useEffect(() => { bootLegacyApp(); }, [])`、:14 `return <Skeleton />` | ✅ |
| 28 | §6 宪法结构层指针 | `CONSTITUTION.md:16-18` | Read 全文：:16-18 结构层条款（id/class 命名与层级、CSS 选择器与声明、字节等价拼接） | ✅ |
| 29 | 总览 T1-M2 验收口径 | `ROADMAP.md:29-37` | `sed -n '29,37p'`：M2 验收①②原文（四模块行数与职责表述、gate 4 场景）与文档记载一致 | ✅ |
| 30 | 头部声明行数基线引用 | `0001/JOURNAL.md:164-169` | `sed -n '164,169p'`：wc 基线 182/2419/131/532 | ✅ |

## 3. 交互回归抽查（派发指令「针对性 E2E 按职责执行」）

**命令**：`npm run test:canvas`（= `node tests/canvas/geometry.mjs`，前置 apps/web/dist 已在位）

**结果**：`15 passed / 0 failed`——C1 单节点执行 / C2 折叠+展开 / C3 textarea 改高 /
C4 拖拽位移 ≥50px / C5 拖线释放新建节点自动连线（portCache 失效五场景，
BK-0004 存量回归），全部连线端点偏差 `startDev=0.00px, endDev=0.00px` ≤ TOL=1px。

选型说明：本项为纯文档新增、零渲染路径接触，SPEC §4.3 明示不设浏览器在线交互
点位（gate 4 场景本身即浏览器级交互验证 s0-s3，已由脚本执行）；本抽查跑存量
画布交互几何回归（SPEC §4.3 授权「可选跑」）作为交互层未受扰动的补充证据。

## 4. E1/E3/E5 执行记录（SPEC §4.2 点位）

- **E1 落位与覆盖**：`ls docs/` → `frontend-module-boundaries.md` 在 `docs/` 根
  （evolution/ 之外）；章节骨架与 SPEC §1.2 逐项对照一致（头部声明/总览表/
  四模块节/时序节/精确化注记）。ADR 编号止于 0008（`ls docs/adr/`），PRD「不新增
  ADR」成立。
- **E3 行数复核**：`wc -l` 六文件实测 = 182/2419/131/532（+15/+9/178），与文档
  「核对日期：2026-10-22」记载零漂移——AC2 如实原则达成，无需回改文档。
- **E5 改动面白名单**：`git status --porcelain` 输出见 AC4；产品面恰 1 个新增路径，
  迭代产物面（STATE/0008 目录）在 `docs/evolution/` 内，非产品面。

## 5. 未跑项 / 排除项（如实记档，SPEC §4.3 口径）

| 项 | 状态 | 理由 |
| --- | --- | --- |
| `npm run build` / `npm run gate` / `npm test` 全套重跑 | **未跑**（本会话） | 派发指令明示已由工作流脚本统一执行且通过，VERIFY 不重复；旁证物证见 AC3（diff 目录空 + dist 在位 + test:canvas 前置自检通过即间接佐证 dist 可用） |
| 浏览器在线交互 E2E（拖拽/缩放/连线等人工点位） | **未跑** | SPEC §4.3 明示排除：零渲染路径接触，AC3 以 gate 机器判据为裁决；gate 4 场景（s0-s3）即浏览器级交互验证，已由脚本执行 |
| `npm run gate:update` / golden 重录 | **未跑且禁跑** | WORKFLOW §6 护栏 2；纯文档项无任何重录通道 |
| `smoke:server` | **未跑** | SPEC §4.3：非本项验收面，存量回归可选项；本项零后端接触 |
| 产品 git 提交核对（AC5 提交本体） | **未落盘核对** | VERIFY 时点产品提交尚未由脚本执行（文件 untracked）；productPaths 非空判据已成立，提交时序归脚本（JOURNAL §6 分工一致），非验收缺陷 |

## 6. 缺陷清单

**无。** 无 Blocker / Critical / Major / Minor 缺陷；§1.1 两条形态观察不构成缺陷
（判据以内容在位为准，且有 SPEC §1.3 基线与 JOURNAL §4.2 记录支撑）。

## 7. 结论与建议

- **VERIFY PASS**，建议进入 CLOSE：BK-0012 置 done、T1-M2 关账（ROADMAP T1 四
  里程碑全部闭环）、metrics 追加一行、归档提交纳入本 REPORT。
- 后续治理日可按 PRD 风险 1 对文档行数数据做抽查（核对日期 2026-10-22 已限定时效）。
