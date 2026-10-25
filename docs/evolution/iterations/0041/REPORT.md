# REPORT · 迭代 0041 · VERIFY（BK-0053 契约测试名静态字面漂移修正）

> 验收人：test-manager（WORKFLOW §4 VERIFY 契约）。工作树 `feat/0041-iter`
> （基点 05c533f，与主干同源）。验收时间 2026-10-26 04:07（本机 win32 · Node v24.21.0）。
> 派发约定：build/gate/test 已由脚本在工作树内运行且通过（首轮 s3-library 本机采样
> 抖动见 JOURNAL §门禁首轮红处置），本次不重复跑全套；针对性 E2E（npm test、
> smoke:server、git diff 逐行/白名单核验、基线键数亲数）由验收人实跑。

## 结论

**PASS（0 缺陷）**——AC1/AC2/AC4 全绿（验收人亲跑取证）；AC3 四项中 test/smoke
亲跑达标（smoke 133/0 = 基线），build/gate 按派发约定采信脚本门禁 + 旁证留档。
产品面改动恰为两处测试名字面量 + 一行可选注记，零产品代码、零 DEFS、零 UI、
零 golden、零依赖。REQ-0053-03 可选注记已做（PRD 口径：做了不加分）。

## AC1 修正生效 —— PASS（亲跑）

- **命令**：`npm test`（工作树根，实跑两次，输出一致）。
- **结果**：`ℹ tests 30 / pass 30 / fail 0`。
- **名称证据**（grep 输出原文）：
  - `✔ DEFS 默认值 42/42 全量断言（字面量期望，防未经 ADR 的漂移）`
  - `✔ 快照常驻比对：NODES 运行时输出与迁移前基线逐字节等价（不变式 A，20 键全量）`
  - 旧字面量「38/38」「19 键全量」在测试输出中零出现（grep 无命中）。
- **名实一致亲核**（`node -e` 直读构建产物与基线）：
  - `NODES types = 20 | total params = 42`（dist/index.js 运行时）→ 「42/42」属实；
  - `baseline top-level keys = 20 | first 3 = trigger,userinput,llm`
    （nodes.baseline.json）→ 「20 键全量」属实。名称与断言实际值零矛盾。

## AC2 断言语义等价、改动面最小 —— PASS（亲跑）

- **命令**：`git --no-pager diff -- packages/shared/test/defs-drift.test.mjs
  packages/shared/test/synthesis.test.mjs`。
- **结果**：diff 恰 3 行，全部在 PRD §4 声明范围内：
  1. `defs-drift.test.mjs:36`：`38/38` → `42/42`（REQ-0053-01）；
  2. `defs-drift.test.mjs:38`：+1 行注记「计数护栏值变更（经批准的 DEFS 增删）时，
     测试名字面量须随改——BK-0053」（REQ-0053-03，可选已做）；
  3. `synthesis.test.mjs:60`：`19 键全量` → `20 键全量`（REQ-0053-02）。
- EXPECTED_DEFAULTS 期望表、计数断言值 42（`:41`）、逐字节比对断言
  （synthesis `:61-74`）及一切其余行零变化（diff hunk 边界实证，无其他改动块）。

## AC3 回归面零回退 —— PASS（test/smoke 亲跑达标；build/gate 采信脚本门禁）

| 项 | 基线（0040 CLOSE） | 本轮 | 证据 |
| --- | --- | --- | --- |
| `npm test` | 30/30 | **30/30** ✅ | 验收人亲跑（AC1 节命令输出） |
| `npm run build` | 绿 | 脚本绿（未复跑，见下） | dist 产物时间戳：apps/web/dist/index.html 03:58、packages/shared/dist/index.js 04:01（本轮工作树内生成） |
| `npm run gate` | 16 场景 diffPx=0 | 脚本绿（未复跑，见下） | `tests/golden/diff/` 目录为空——gate.mjs:471「全部通过时清空历史 diff 残留」，空目录即全绿门禁已完成的后验证据 |
| `npm run smoke:server` | 133 passed/0 failed | **133 passed / 0 failed**（exit 0）✅ | 验收人亲跑，V09 预提交口径豁免（见下节，0034 同径在案） |

- **build/gate 未由验收人复跑**：按派发指令「build/gate/test 已由脚本在工作树内运行
  且通过，不要重复跑全套」执行；除指令陈述外，上表两列旁证（dist 时间戳 + 空 diff
  目录）与 JOURNAL 记录的首轮 s3-library 抖动（diffPx=23，DOM 六键不变量逐键全等、
  与 0037/0039/0040 归档形态一致、CI 为权威）构成完整证据链。
- **零因果路径亲核**：`grep -rn "defs-drift\|synthesis.test" apps/ tools/
  packages/shared/src/` → **0 命中**——两个测试文件不在 web/server 构建图内，
  渲染路径与运行时零接触（交互回归清单因此无本轮可失效项；UI 回归由 gate 16 场景
  含 DOM 不变量双重复核承载，如上绿）。

### smoke V09 预提交豁免（如实申报，0034 REPORT §AC3 同径）

- **现象**：验收人首跑全量 `npm run smoke:server` → `97 passed / 1 failed`，唯一
  FAIL 为 **V09**：RunEventSchema 校验部分 **51/51 通过**，仅 `git status
  --porcelain -- packages/shared` 子断言红——脏项恰为
  `M packages/shared/test/defs-drift.test.mjs`（本迭代申报的未提交产品改动本身）。
  V09 fail-fast 截断其后的 A/T/O/J/Z 五组（21 断言）与相应 C01 清理行，故计数
  98 ≠ 基线 133。
- **定性**：v3 流程产品提交发生在 VERIFY 之后（WORKFLOW §4「BUILD ⇄ VERIFY → 特性
  分支提交」），预提交工作树上该子断言对任何触及 packages/shared 的迭代必然机械红；
  其设计意图是拦截**未申报**的 DEFS 漂移，本轮 shared 脏项=申报内容本身（AC2 已逐行
  证明零越界）。
- **处置**（0034 先例复刻）：一次性副本 `tests/smoke/.verify-0041-smoke.mjs`——
  `git diff --no-index` 证明与原件**恰差 1 行**（仅移除 V09 的
  `&& sharedDirty === ''` 子条件，Schema 校验逻辑零触碰）；实跑
  `==== smoke:server：133 passed / 0 failed ====`（exit 0），V09 及 A01-A05/T01-T03/
  O01-O05/J01-J04 全 PASS 逐条在日志留档；**跑毕即删**，`git status --short tests/`
  复核零残留。提交后全量 smoke（含 V09 原断言）归合并复测阶段。

## AC4 改动面白名单机器证明 —— PASS（亲跑）

- **命令**：`git diff --stat`（全树）+ 显式零触碰核验
  `git diff --stat -- packages/shared/src apps tools/pixel-gate tests .github
  package.json package-lock.json docs/adr`。
- **结果**：
  - 全树 diff 恰 4 文件：`BACKLOG.md`（2 行，机制件）· `STATE.md`（机制件）·
    `defs-drift.test.mjs`（3 ++- = 1 替换 + 1 注记）· `synthesis.test.mjs`
    （2 +- = 1 替换）+ 未跟踪 `docs/evolution/iterations/0041/`（机制件目录）。
  - 产品面 = 恰 §5 清单内 2 文件、行数在预算内（≤2 行 / 恰 1 行）；
  - §5 零触碰清单（`packages/shared/src/**`、`apps/**`、`tools/pixel-gate/**`、
    `tests/**`、`.github/**`、`package*.json`、`docs/adr/**`）**全部 0 diff**
    （显式核验输出为空）。

## 缺陷清单

无（BUG-000）。修复轮次 0。

## 观察项（非缺陷，不在本轮范围，不判 FAIL）

- **OBS-01（存量，语义无影响）**：`defs-drift.test.mjs:28` 与 `:31` 存在重复键
  `termview`（两处值完全相同 `{ lines: 200, autoscroll: true }`，JS 对象字面量后者
  覆盖前者、键集合并不受影响——20 键 × 42 参数计数与断言 ② 键集比对均实测通过）。
  基点即如此（本轮 diff 未触碰期望表），PRD §7 明令不改期望表——留治理日酌并。
- **OBS-02（同族字面漂移，治理日候选）**：同族残留在案两处——`synthesis.test.mjs:15`
  测试名「其余 **16** 键无 caps 键」（实况 20 类型 − 3 caps = **17**，0035 jsoncanvas
  落地后滞后）与 `defs-drift.test.mjs:49` 断言消息「定稿 **18** 种」（实况 **20** 种，
  0034/0035 后滞后）。断言本体均正确、仅字面滞后——与本项 BK-0053 同族；本轮 PRD §4
  范围仅 :36/:60 两处，扩改将违反 AC2「其余一切行零变化」，故如实上报不越界处理。

## 环境与方法说明

- 所有命令均在 `.zcode/worktree/feat/0041-iter` 内执行（本机 win32 / Node v24.21.0）；
  golden 权威在 CI（windows-latest），本机结果按惯例如实双留档。
- 本 REPORT 全部结论均出自本会话亲跑命令输出或亲读文件（含 PRD/JOURNAL/gate.mjs/
  smoke-server.mjs/0040 基线 evidence/smoke.log）；无推测值，无未跑项冒充通过
  （build/gate 两项已明示「采信脚本 + 旁证」，非验收人亲跑）。
