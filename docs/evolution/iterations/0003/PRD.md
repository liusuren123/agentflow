# PRD · 迭代 0003 · BK-0003 契约测试补齐：16 种节点注册表与 SSE 事件契约的 DEFS 漂移防护覆盖核对

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 11:37
> 来源：BACKLOG BK-0003（P1 / test / M / ready / 触UI=否，`docs/evolution/BACKLOG.md:13`）；
> 主题归属 ROADMAP T2-M1（质量基建 · shared 契约测试防漂移覆盖全部 16 种节点 + SSE 事件全集，
> `docs/evolution/ROADMAP.md:41-48`）。
> 选题依据：ready 队列非枯竭，共 4 项（BK-0003/0006/0007/0004，`BACKLOG.md:13-16`）；
> 最高优先级 P1 共 3 项，按 BACKLOG 头注「同优先级按表中顺序」取表首 BK-0003
> （先于 BK-0006/BK-0007）。大小 M，无需拆分。与 done/failed 历史无重叠：迭代 0001
> 为 T1 盘点（doc）、0002 为 T2-M2 冒烟脚本（test，BK-0002）；本项为 T2-M1 契约测试，
> 三者主题、承载项、改动面互斥。

## 结论

**建议做（本迭代即做）**：一句话理由——`packages/shared` 是节点/参数/SSE 契约的单一
事实源且 DEFS 为宪法保护对象（`packages/shared/src/nodes.ts:3-5`、ROADMAP T3 硬边界），
但现有 5 条契约测试对它只有抽样级防护（默认值 6/33、HANDLERS 键集 0 防护、事件反例
仅 2 条），补齐后任何无 ADR 的 DEFS 漂移或「新增节点缺 handler」都会在 `npm test`
红线暴露——这是比 UI 门禁更早一层的宪法执行手段，且纯测试改动、零运行时行为变化。

## 触 UI 分类结论

**否。** 本项改动面：① `packages/shared/test/contract.test.mjs` 扩充断言（测试，宪法
第 4 条「不适用」清单）；② 为使测试能读到后端 handler 键集，可能新增**一处零行为
导出**（`apps/server/src/engine.ts` 的 `HANDLERS` 目前是模块私有，engine.ts:26-29，
唯一导出是 `executeWorkflow`，engine.ts:32）——导出常量不改变任何执行路径、不触
`apps/web`、不改 DEFS 本身；③ 视 SPEC 方案可能调整根/子包 test scripts 串联（构建
配置，同属「不适用」但仍需常规 review）。不在 UI 三层（视觉/DOM/交互）任何一层上；
验收仍要求 `npm run gate` 复跑全绿以防误触（AC6）。

## 背景（含代码事实源，2026-10-22 只读核实）

1. **注册表规模**（本会话 `node -e` 实测 `packages/shared/dist/index.js`）：16 种
   节点、参数合计 33——trigger(3) userinput(4) llm(4) prompt(1) retrieval(3)
   websearch(2) http(3) code(2) notify(2) condition(1) loop(2) delay(1) merge(1)
   reply(1) setvar(1) approval(2)。与 ROADMAP T2-M1「全部 33 参数」口径一致
   （`ROADMAP.md:47`）。
2. **现有防护与其缺口**（`packages/shared/test/contract.test.mjs`，69 行 5 测试）：
   - 16 节点字段齐全 / 端口类型合法（test 1-2，行 10-26）——已有，不动。
   - 默认值抽样仅 6 处、覆盖 4/16 种节点（llm.model/temp/max、condition.expr、
     retrieval.topk、approval.to，行 28-36）；ROADMAP 明确缺口「默认值仅覆盖 4/16
     种节点」（`ROADMAP.md:44`）。
   - 15 事件正例回放 + 仅 2 条反例（run:start total 非数、unknown:event，行 59-60）；
     ROADMAP 明确缺口「事件契约反例仅 2 条」（`ROADMAP.md:46`）。
   - legacy 从 shared 导入（行 63-69）——已有，不动。
3. **HANDLERS 键集零防护**：后端 handler 表 = `BASIC_HANDLERS`（`apps/server/src/
   handlers.ts:13`，键 `__pass` + 15 种节点，grep 实测行 14-205）+ engine 侧注入
   `llm: llmHandler`（`apps/server/src/engine.ts:26-29`），合计 16 节点键 + `__pass`，
   当前与 NODES 键集一致（本会话逐一比对）——但**无任何测试锁定**。engine 对缺
   handler 的节点静默回退 `HANDLERS.__pass`（engine.ts:99），即「新增节点类型忘写
   handler」不报错、节点假装成功（`__pass` 返回 `{value: input, out: '完成'}`，
   handlers.ts:14-16），属最危险的静默漂移。ROADMAP 明确缺口「HANDLERS 键集与
   NODES 注册表一致性零防护」（`ROADMAP.md:45`）。
4. **测试运行链**：根 `npm test` = `build:shared && npm test -w @agentflow/shared`
   （根 package.json:18），子包脚本 `node --test`（packages/shared/package.json，
   cwd=packages/shared）——测试文件落 `packages/shared/test/`，从 `../dist/index.js`
   导入（contract.test.mjs:8）。**注意**：该链不构建 server；若断言要 import
   `apps/server/dist/*`，SPEC 须给出前置构建方案（见 REQ-0003-03 约束）。
5. **前端事件面不缺防护**：legacy `onEvent` switch 已覆盖全部 15 事件
   （`apps/web/src/legacy/app.js:2127-2209`，grep 实测 15 个 case），且第 5 条测试
   已锁「legacy 必须从 shared 导入」；前端 case 覆盖防护不在本项缺口清单
   （ROADMAP T2-M1 验收亦未列），列入 out of scope。

## 目标

1. 关账 ROADMAP T2-M1：`npm test` 全绿且新增三类断言——① paramDefaultsOf 对 16 种
   节点全部 33 参数逐一断言；② 后端 HANDLERS 键集 ⊇ NODES 键集；③ SSE 事件反例
   覆盖主要字段型错误（验收口径逐条来自 `ROADMAP.md:47-48`）。
2. 使「DEFS 漂移」从不可见变为 `npm test` 红线：DEFS 是宪法保护对象，任何无 ADR
   的默认值/参数增删都会被字面量断言抓住，为宪法第 3 条流程提供机器可查的哨兵。
3. 使「新增节点缺 handler」从静默 `__pass` 假成功变为测试失败，堵住 engine.ts:99
   的静默回退风险面。

## 非目标（out of scope）

- 不改 `NODES`/`RunEventSchema` 任何内容（DEFS 是被保护对象，本项只加防护，不动
  被防护物）；不改 engine/handlers 的运行时行为（允许的唯一产品源码触点是零行为
  导出，见 REQ-0003-03）。
- 不触 UI 三层；不改 `tools/pixel-gate/`、CI 配置与 golden 基线（WORKFLOW §6 护栏
  2/3）；不运行 `npm run gate:update`。
- 不为 engine 缺 handler 增加**运行时**告警/报错（那是行为变化，另立项；本项只做
  测试时防护）。
- 不做前端 onEvent case 覆盖断言、不做 server-sync 事件映射断言（背景 5：现状
  不缺；若治理日认为需要，另行立项）。
- 不引入新测试框架/依赖（沿用 node:test + assert/strict，零依赖口径与现文件一致）。

## 用户故事

1. 作为开发者，我改 shared 或 server 节点相关代码时跑 `npm test` 即可确认没有弄丢
   任何节点 handler、没有漂移任何 DEFS 默认值，而不是等运行时静默假成功。
2. 作为 test-manager，我需要 DEFS 漂移在 VERIFY 阶段之前就被红线暴露，使宪法第 3
   条（UI/契约变更须 ADR + 用户批准）有机器执行的哨兵。
3. 作为协调者，我需要 T2-M1 关账证据：`npm test` 全绿输出 + 三类新断言逐条命中。

## 需求条目

- **REQ-0003-01 · 默认值全量断言（33/33）**：以**字面量期望值**（非从 NODES 派生
  ——派生断言对 DEFS 自身漂移不敏感）对 16 种节点全部 33 参数逐一断言
  `paramDefaultsOf(type)[k]` 与 2026-10 定稿值相等（期望值表即 nodes.ts:9-107 的
  `d` 字段快照；`__unknown__` 返回 `{}` 的既有断言保留）。断言须逐参数可定位
  （失败信息含 type 与 k）。
- **REQ-0003-02 · 事件反例扩充**：在既有 15 正例回放不变的前提下，新增 ≥8 条
  `validateEvent` 反例（`assert.throws`），覆盖 ≥6 个事件族的主要字段型错误，至少
  包含四类失败形态各 ≥1：类型错误（如 node:delta.text 非串）、必填缺失（如
  approval:required 缺 runId）、非法枚举（如 log.lvl='bad'，events.ts:24）、
  可空性违规（如 node:done.iteration 传 undefined 以外的非法非数——按
  events.ts:12 `.nullable()` 语义）；具体清单 SPEC 定稿，PRD 不锁死。
- **REQ-0003-03 · HANDLERS ⊇ NODES 断言**：断言后端 handler 表键集 ⊇ `Object.keys
  (NODES)`。机制由 SPEC 定，候选：engine.ts 导出 `HANDLERS`（或其键集快照）供测试
  import `apps/server/dist/engine.js`。**硬约束**：① 唯一允许的产品源码触点是
  零行为导出（不改逻辑、不改既有签名）；② 断言不可静默跳过——若 server dist 未
  构建，测试须以可操作报错失败（提示先 `npm run build:server`）或 SPEC 调整 test
  链先行构建，二选一由 SPEC 定并写入验收命令；③ 测试侧不得手工复刻 engine 的
  handler 组装（那会把 engine.ts:26-29 的知识复制进测试，制造新的漂移面）。
- **REQ-0003-04 · 测试文件规模与归属**：断言落 `packages/shared/test/`（可拆新
  文件，如 `defs-drift.test.mjs` / `handlers-coverage.test.mjs`，`node --test`
  自动发现）；单文件 ≤400 行（AGENTS 硬性约定 4）；原 contract.test.mjs 既有
  5 测试语义不变（允许合并重构，但正例回放与 legacy 导入断言必须保留）。

## 非功能要求

1. **可复现**：验收命令为一键（`npm test`，或 SPEC 定稿的等价链），输出含逐测试
   通过计数；失败时信息足以定位到具体参数/事件/键。
2. **零行为变化**：产品源码若被触及（仅限 REQ-0003-03 的导出），gate 与 smoke 均
   须复跑绿，证明运行时行为不变。
3. **防漂移即防宪法侵蚀**：字面量期望值表注明「源自 2026-10 定稿 DEFS，宪法保护
   对象；本测试变红 = 出现未经 ADR 的契约变更」。
4. **Windows 兼容**：不引入路径/Shell 敏感操作（纯 node:test）。

## 验收标准（Given / When / Then）

- **AC1 · 默认值 33/33**：Given 已执行 `npm run build:shared`，When 运行 `npm test`，
  Then 默认值断言对 16 种节点 × 33 参数全部命中（输出计数佐证）；When 人为把任一
  期望值改错（反演演练，VERIFY 可选做），Then 对应断言红且失败信息含节点 type 与
  参数 k。
- **AC2 · 事件反例**：Given 15 正例回放仍全过，When 运行新增 ≥8 条反例，Then 全部
  以 `assert.throws` 命中（校验器确实拒绝这些坏样本）；且四类失败形态（类型错误/
  必填缺失/非法枚举/可空性）各至少 1 条。
- **AC3 · HANDLERS ⊇ NODES**：Given server 构建产物在位（按 SPEC 定稿的前置），
  When 运行 handler 覆盖断言，Then 16 个 NODES 键全部存在于后端 handler 表键集
  （`__pass` 作为额外键允许存在）；When 反演演练（临时从断言输入中移除一个键，
  VERIFY 可选做），Then 断言红。
- **AC4 · 一键与不可静默跳过**：When 在仓库根执行验收命令（`npm test` 或 SPEC
  定稿等价链），Then 全部新旧测试通过、退出码 0；When server 产物缺失且 SPEC
  方案依赖之，Then 相关测试以含「先构建」指引的报错失败而非 skip。
- **AC5 · 既有防护不回退**：Then 原 5 条契约测试的防护语义（16 节点字段、端口
  类型、15 正例、legacy 导入 shared）全部保留且通过。
- **AC6 · 渲染零影响**：Given 本迭代改动仅测试文件 + （如 SPEC 采用）一处零行为
  导出 + 可能的 scripts 串联，When 产品提交前运行 `npm run gate` 与
  `npm run smoke:server`，Then gate 4 场景全绿（diffPx=0）、smoke 33 断言全过
  exit 0（smoke 为强推荐回归，因 engine.ts 被导出性触及）。

## 依赖与风险

- **依赖**：`apps/server/dist` 构建在位（仅 REQ-0003-03 的 import 方案需要；
  smoke:server 的前置校验模式可参考复用，`tests/smoke/lib.mjs`）。基线与
  2026-10-22 治理日一致（weekly/43.md §二：gate 4 场景、test 5/5）。
- **风险 1 · SPEC 否决 engine 导出方案**（如认为任何产品源码触点都应避免）：
  备选是测试 import handlers/llm 两 dist 后组装——被 REQ-0003-03 约束③禁止；
  再备选是本项降范围为 ①+② 并把 HANDLERS 防护另立项（ROADMAP T2-M1 相应改口）。
  该决策属技术方案域，交 SPEC；若 SPEC 认为必须改 PRD 范围，按 WORKFLOW §2 回
  PLAN 重签。
- **风险 2 · 字面量期望值表抄写错误**：33 项手工抄写可能自带笔误 → BUILD 后首次
  `npm test` 即暴露（断言 vs 实际值），属自纠错；VERIFY 抽查 3 项与 nodes.ts
  原文比对。
- **风险 3 · node --test 文件发现范围**：cwd=packages/shared，新测试文件必须落在
  其下才会被发现（背景 4）；若 SPEC 选择放 server 侧则须改根 test 链——两方案
  均需在 SPEC 写明最终验收命令，避免「跑错目录测试假绿」。

---

> 选题过程存证：本 PRD 由独立 PLAN 会话产出。ready 队列核对（BACKLOG.md:13-16）：
> BK-0003（P1/M/test）为 P1 表首 → 选中；BK-0006（P1/S/doc）、BK-0007（P1/M/
> capability）顺位其后，BK-0004（P2/S）殿后。与最近两次迭代（0001=T1 盘点、
> 0002=T2-M2 冒烟）零重叠。代码引用均于 2026-10-22 本会话只读核实（nodes.ts/
> events.ts/contract.test.mjs/engine.ts/handlers.ts/package.json×2/legacy app.js）。
