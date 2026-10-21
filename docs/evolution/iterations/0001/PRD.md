# PRD · 迭代 0001 · BK-0001 现状盘点：核对 ADR-0002 各 CP 落地状态与移植余量，细化 ROADMAP 里程碑

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 00:26
> 来源：BACKLOG BK-0001（P0 / doc / S / ready / 触UI=否）；主题归属 ROADMAP T1（移植收尾
> 与骨架一致性），关账结论同时服务 T4-M1（进化闭环首跑）。

## 结论

**建议做（本迭代即做）**：一句话理由——机制首跑最安全的试金石（零代码改动、零 UI 风险），
且其产出（T1-M1 关账 + 里程碑细化）直接决定后续心跳选题的证据质量。

## 触 UI 分类结论

**否。** 本项为纯文档盘点：不改动任何渲染路径（无 `apps/web`、`apps/server`、
`packages/shared` 代码变更），唯一写入目标是 `docs/evolution/ROADMAP.md` 与本迭代目录
产物。按 CONSTITUTION 第 4 条，文档变更不触发门禁（但仍需常规 review，且验收含
「gate 仍全绿」以防误触）。

## 背景

1. ADR-0002 记录了前端机械移植的三个 checkpoint（CP-B/CP-C/CP-D），均标注
   2026-10-21 完成并以「4 场景 diffPx=0」验收（`docs/adr/0001-0003-constitution-mechanical-port-shared.md:27-44`）。
2. ROADMAP T1-M1 现状为「已落地，待 BK-0001 交叉核对手工关账」，关账验收三条：
   gate 4 场景 diffPx=0、test 5/5、盘点确认 `apps/web/src` 无 `?raw` /
   `dangerouslySetInnerHTML` 残留注入路径（`docs/evolution/ROADMAP.md:16-20`）。
3. ROADMAP 头部口径（2026-10-22 治理核定）：已完成 = 有可复现证据；禁止以
   「看起来一致」作为任何判定依据（`docs/evolution/ROADMAP.md:5-7`）。
4. PLAN 阶段初查（2026-10-22 00:26，只读）：`grep -rn "dangerouslySetInnerHTML"
   apps/web/src` 与 `grep -rn "?raw" apps/web/src` 均 0 处匹配（两次 exit=1）——
   与 CP-C 实施记录一致；正式留证由 BUILD/VERIFY 复核完成。

## 目标

1. 以仓库现状为证据，逐项核对 ADR-0002 三条 CP 的落地状态，产出「一致 / 不一致 +
   证据」结论。
2. 摸清移植余量（与 T1-M2「职责边界文档化」等未完成里程碑的差距），把余量转化为
   ROADMAP 上带验收口径的可执行里程碑。
3. 给出 T1-M1 关账与否的明确结论并回写 `docs/evolution/ROADMAP.md`。

## 非目标（out of scope）

- 不写任何代码（doc 项）；不改 UI 三层（视觉/DOM/交互）与 CSS。
- 不产出 T1-M2 边界文档本身（独立里程碑，盘点只识别差距）。
- 不重录 golden、不运行 `npm run gate:update`（宪法第 3 条 / WORKFLOW §6 护栏 2）。
- 不触碰 BACKLOG 待批准区（BK-9001 等留给用户主权决策）。
- 盘点发现不一致时不擅自修代码：如实记缺口，新项立项由 CLOSE 阶段处理。

## 用户故事

1. 作为 PM，我需要一份以代码现状为证据的移植收尾盘点，使 ROADMAP 完成度标注可信、
   后续心跳选题有据可依。
2. 作为协调者，我需要 T1-M1 的关账结论（关账或列缺口），以刷新 BACKLOG 状态与
   metrics 首行，完成 T4-M1 进化闭环首跑。

## 需求条目

- **REQ-0001-01 · CP 落地状态逐项核对**：对 CP-B / CP-C / CP-D 三条实施记录逐项
  对照仓库现状，每项产出「一致 / 不一致 + 证据（`路径:行` 或命令输出摘要）」。
  注意：CP-B 记录中的 `?raw + dangerouslySetInnerHTML` 注入路径是被 CP-C 取代的
  中间形态——核对点是 CP-B 的**最终形态**仍在位（Vite + React 18 + TS + singlefile
  构建、server 托管 dist、门禁 target 为构建产物），而非其中间实现。
- **REQ-0001-02 · 残留注入路径检查**：确认 `apps/web/src` 无 `?raw` 与
  `dangerouslySetInnerHTML` 残留注入路径（T1-M1 关账条件之三）。
- **REQ-0001-03 · 基线证据**：以 `npm run build && npm run gate`（4 场景 diffPx=0）
  与 `npm test`（5/5）的命令输出作为盘点证据基线（本项不触代码，故该基线既是
  关账证据也是「文档零影响」证据）。
- **REQ-0001-04 · 移植余量清单**：盘点 `apps/web/src` 三模块（`Skeleton.tsx` /
  `src/legacy/app.js` / `src/server-sync.js`）职责边界现状与 T1-M2 目标的差距，
  及其他余量（如 `app.css` 逐字等价约束的持续成立性），形成清单。
- **REQ-0001-05 · ROADMAP 回写**：T1-M1 完成度标注按盘点结论更新（全部一致则
  关账为「已完成」并附证据；存在缺口则如实列缺口与证据）；移植余量细化为带
  验收口径的里程碑条目；回写后重跑 gate 确认仍全绿。

## 非功能要求

1. **证据可复现**：每条结论附命令原文与输出摘要，或 `路径:行` 指针；不满足
   ROADMAP 头部「可复现证据」口径的判定一律不得写入。
2. **审计友好**：盘点过程与结论沉淀在本迭代目录（JOURNAL/REPORT），ROADMAP 只留
   结论与证据指针，不复述过程。
3. **篇幅约束**：仅文档变更，无源文件行数约束，但 ROADMAP 增量保持精炼（里程碑
   条目化、可勾选）。

## 验收标准（Given / When / Then）

- **AC1 · 残留注入路径**：Given 仓库 HEAD 干净工作区，When 执行
  `grep -rn "dangerouslySetInnerHTML" apps/web/src` 与 `grep -rn "?raw" apps/web/src`，
  Then 均为 0 处匹配（exit=1）并留有输出证据；若出现匹配，则如实列入 ROADMAP 缺口
  （T1-M1 不关账），不得隐藏。
- **AC2 · 基线命令**：Given 已执行 `npm run build`，When 运行 `npm run gate`，
  Then 4 个 golden 场景全部 `diffPx=0`；When 运行 `npm test`，Then 5/5 通过——
  两者输出摘要写入盘点证据。
- **AC3 · CP 逐项结论**：Given ADR-0002 实施记录三条，When 逐项核对仓库现状
  （CP-C：`Skeleton.tsx` 为唯一骨架源且 `skeleton.html` 不存在于工作区；CP-D：
  `src/legacy/app.js` 消费 `@agentflow/shared` 导入、门禁 target 为构建产物；
  CP-B 最终形态：Vite + React 18 + TS 构建链在位），Then 每条 CP 有明确的
  「一致 / 不一致」结论且各附至少一个可复现证据。
- **AC4 · ROADMAP 回写质量**：Given AC1–AC3 的盘点结论，When 更新
  `docs/evolution/ROADMAP.md`，Then T1-M1 标注与证据一致（关账附证据 / 未关账附
  缺口），移植余量表现为带验收口径的里程碑条目，全文无「看起来一致」类无证据表述。
- **AC5 · 渲染零影响**：Given 本项仅变更 `docs/` 下文件，When 于回写后重跑
  `npm run gate`，Then 仍 4 场景全绿（diffPx=0）。

## 依赖与风险

- **依赖**：无外部依赖；命令基线与 2026-10-22 治理日全量回归（weekly/43.md §二，
  gate 4 场景 diffPx=0、test 5/5）一致，预期可复现。
- **风险 1**：盘点发现某 CP 结论与 ADR 记录不一致 → T1-M1 不关账，缺口如实写入
  ROADMAP 并建议新 BACKLOG 项（CLOSE 处理），本迭代仍算成功交付（盘点结论本身
  即产出）。
- **风险 2**：本机 Windows gate 结果与 CI（windows-latest 权威）存在差异的可能
  （AGENTS.md 已知陷阱）→ 证据标注运行环境，必要时以 CI 结果为准。
