# PRD · 迭代 0041 · BK-0053 契约测试名静态字面漂移修正

> 工作树：`.zcode/worktree/feat/0041-iter`（分支 feat/0041-iter）。本 PRD 与一切
> 过程产物仅写工作树内路径。
> S 项免独立 SPEC（WORKFLOW §4 PLAN，type=test / 触UI=否 / S）：受影响文件清单
> 与验收口径内嵌于本 PRD（§5/§6），skipSpec=true。

## 0. 结论先行

**建议做（本轮已选）**：纯测试名字符串同步——零产品代码、零 DEFS、零 UI、
零 golden、零依赖。POLICY 自主区「测试与回归基建」，S 项单轮收官，无批次编排。

## 1. 背景与证据

来源链：迭代 0035 CLOSE 观察（`docs/evolution/metrics.md` 0035 行备注：「测试名
静态字面漂移两处 defs-drift.test.mjs:36『38/38』与 synthesis.test.mjs:60『19 键
全量』滞后于实际 42 参数/20 键，断言本体正确，文档级非缺陷留治理日」）→
2026-10-26 迭代 0040 PLAN 轮补题立项 BK-0053（BACKLOG 主池行，备注明示
「心跳 S 项轮可选或治理日批处理」）。

本轮（0041 PLAN）在工作树 feat/0041-iter 内亲核复核，证据全部成立：

| # | 证据指针（本轮亲读/亲跑） | 亲核结果 |
| --- | --- | --- |
| E1 | `packages/shared/test/defs-drift.test.mjs:36` | 测试名「DEFS 默认值 **38/38** 全量断言（字面量期望，防未经 ADR 的漂移）」 |
| E2 | 同文件 `:40-41` | 计数断言值已为 **42**（断言消息「期望表参数总数应为 42——表自身被误改」）——断言本体正确，仅名称滞后 |
| E3 | `packages/shared/test/synthesis.test.mjs:60` | 测试名「快照常驻比对：NODES 运行时输出与迁移前基线逐字节等价（不变式 A，**19 键**全量）」 |
| E4 | `packages/shared/test/nodes.baseline.json`（node 亲数） | 顶层键数 = **20**（键序前 3 = trigger,userinput,llm）——逐字节比对断言零变化，仅名称滞后 |

漂移成因（历史背书，无需另证）：参数总数 38→42 由迭代 0034（termview +2，加
lines/autoscroll）与 0035（jsoncanvas +2，加 expand/fmt）累计；键数 19→20 由
迭代 0035 jsoncanvas 落地。两次计数护栏联动均只改断言值未同步测试名。

## 2. 选题过程存证（规则 ①~④ 逐项）

- **规则①（approved 批复同步）**：本轮档案「approved：无」→ 零动作。
- **规则②（user-request 收录）**：issue 面板 **#12 / #6 / #5 / #4** 四项（CI 像素
  门禁误报 / BK-9006 杂项 / BK-9005 PTY 终端 / BK-9004 工作台）均带
  needs-approval 未获批，无 user-request 新项 → 零建行、零 uiIssueNumbers。
- **规则③（rejected）**：「rejected：无」→ 零 skipped 改写。
- **规则④（常规选题 + 枯竭判定）**：
  - ready 队列亲核：`grep -n "| ready |" docs/evolution/BACKLOG.md` 全表唯一
    命中 **BK-0040**，且被并行工作流占位**本轮禁选** → ready 可选集枯竭。
  - 侦察档案逐项评估：
    - 【残缺标记】`apps/server/src/tools.ts:5`（设计原则注释「不伪造结果」）与
      `:137-138`（stubOf 工厂，迭代 0009 BK-0005 建立的如实降级机制）为设计
      在案；`:116` `'browser': null, /* 未实现 */` 为唯一剩余 stub——维持 stub
      系 ADR-0011 评估终态（T3-M3 done，「近期不实施」裁决在库）→ **非缺陷，
      不构成新补题候选**。
    - 【悬挂 run】探针输出 `[]` → 无候选。
    - 【issue 面板】见规则②，无候选。
    - 【覆盖差集 / 文档漂移 / dogfooding】：档案口径「治理日产物（weekly/ 与
      BACKLOG 既有证据行），心跳不重复采集」——BK-0053 行即该类既有证据行，
      直接采信并本轮亲核复核（§1 表）。
  - 既有 proposed 项可选集筛查：BK-0041/0042（前置 BK-0040 未竟）、BK-0044/
    0045（ADR-0014 附录 A 依赖批复未获）、BK-0047/0048（前置 BK-0019/BK-0020
    未落地）、BK-0014/0018/0019/0020（实现轮含需批准承载，治理日口径 SPEC
    先行）、BK-0015（不再独立立项，待随批关账——系记账动作非选题）、BK-0051
    （doc，心跳不选）——**唯一无前置、无批复门、非 doc、心跳可选的项 =
    BK-0053**（备注明示「心跳 S 项轮可选或治理日批处理」，排期条件在立项时
    已自足）。
  - 处置：BK-0053 晋升 ready 并选为本轮项——沿迭代 0038（BK-0046）/ 0039
    （BK-0049）PLAN 轮「晋升并入选」先例（ready 可选集被并行占位/前置封锁
    时的既定机制）；非无证据立项、非凑数。

## 3. 触 UI 分类结论

**触UI = 否。** 改动仅限 `packages/shared/test/` 两个测试文件的测试名字符串
（与可选一行注释）：零产品源码、零 DEFS、零 SSE 契约、零 CSS/DOM、零 golden、
零依赖、零 env。POLICY 自主区（测试与回归基建）——不涉宪法第 3 条，全程禁
`npm run gate:update`。

## 4. 需求（REQ）

- **REQ-0053-01**：`defs-drift.test.mjs:36` 测试名字面量「38/38」→「42/42」，
  与 `:40` 计数断言值一致；断言本体、EXPECTED_DEFAULTS 期望表零改动。
- **REQ-0053-02**：`synthesis.test.mjs:60` 测试名字面量「19 键全量」→
  「20 键全量」，与 `nodes.baseline.json` 实际键数一致；逐字节比对断言零改动。
- **REQ-0053-03（可选增强，非验收必需）**：在 `defs-drift.test.mjs` 计数断言
  附近加一行机制注记（建议内容：「计数护栏值变更（经批准的 DEFS 增删）时，
  测试名字面量须随改——BK-0053」）防同类漂移复发。VERIFY 对本条「做了不加分、
  不做不判 FAIL」。

## 5. 受影响文件清单（S 项内嵌，skipSpec=true）

| 文件 | 改动 | 预算 |
| --- | --- | --- |
| `packages/shared/test/defs-drift.test.mjs` | `:36` 测试名字面量替换（38/38→42/42）；可选 +1 行注释（REQ-0053-03） | ≤2 行 |
| `packages/shared/test/synthesis.test.mjs` | `:60` 测试名字面量替换（19 键全量→20 键全量） | 恰 1 行 |

零触碰白名单（AC4 机器核验）：`packages/shared/src/**`、`apps/**`、
`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、`tests/canvas/**`、
`.github/**`、`package.json`、`package-lock.json`、`docs/adr/**`。

## 6. 验收口径与 Given/When/Then（S 项内嵌）

验收命令（BUILD 工作树内门禁 + VERIFY 逐条执行）：
`npm test`（根，含 shared 契约 30 项）+ `npm run build` + `npm run gate` +
`npm run smoke:server` + `git diff --stat` 白名单核验。

- **AC1（修正生效）**
  Given 两处测试名已按 REQ-0053-01/02 修改，
  When 运行 `npm test`，
  Then **30/30 全绿**，且测试运行输出中两测试名分别含「42/42」与「20 键全量」，
  名称与断言实际值零矛盾。
- **AC2（断言语义等价，改动面最小）**
  Given 本项改动仅测试名字符串，
  When `git diff` 逐行核验两文件，
  Then diff 仅含 REQ-0053-01/02 的字面量替换（与可选 REQ-0053-03 注释行）；
  EXPECTED_DEFAULTS 期望表、计数断言值（42）、逐字节比对断言、其余一切行零变化。
- **AC3（回归面零回退）**
  Given 上一轮基线（迭代 0040 CLOSE 更正行在案）：gate 16 场景 diffPx=0 /
  test 30/30 / smoke 133 passed/0 failed，
  When 在工作树内实跑 `npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server`，
  Then 四项全绿且计数不低于基线（gate 16 场景 / test 30 / smoke 133）。
  s3-library 本机采样抖动（diffPx≈23、rerun 即绿）系 0037~0040 已归档的环境侧
  形态、CI 为权威——如实双留档，不消费 gate:update。
- **AC4（改动面白名单机器证明）**
  When `git diff --stat` 核验（产品提交前），
  Then 恰 §5 清单内 ≤2 文件（含可选注记至多 2 行），§5 零触碰清单全部 0 diff。

## 7. 不做范围（out of scope）

- 不改任何断言本体 / 期望表 / 基线文件（42 与 20 已正确——本项只修「名实不符」）。
- 不新增断言、不扩测试面。
- 不动 golden、不触产品源码、零依赖、零环境变量。
- BK-0051（README 漂移，doc）仍归治理日批处理，不并入本轮。
- BK-0015 随批关账、ROADMAP 状态行回写等治理记账不在本轮范围。

## 8. 选题与编排元信息

- 本项来源列 = T2（主题锚点），非 issue#N → 无 sourceIssue 回执义务。
- 单轮 S 项，无批次/分期编排 → itemContinues=false；迭代 CLOSE 时 STATE.item
  置回、BK-0053 置终态。
- reconstitutional=false（纯测试基建，无 UI、无 golden 接触，禁 gate:update）。
