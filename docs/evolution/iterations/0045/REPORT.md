# 迭代 0045 · REPORT — BK-0054 契约测试同族字面残留清理（VERIFY）

> VERIFY 轮产物（WORKFLOW.md §4 VERIFY 契约）。验收口径：PRD §5 AC1~AC5（S 项
> skipSpec，验收口径内嵌 PRD）。测试经理定义 `.zcode/agents/test-manager.md`。
>
> 验收环境：隔离工作树 `.zcode/worktree/feat/0045-iter`（分支 `feat/0045-iter`，
> 基点 = main HEAD `ea93ff3`；验收时分支零提交、产品改动在工作区未提交——故
> AC2/AC5 的 `git diff HEAD` 即产品面基线，与 PRD 命令口径一致）。win32 /
> Node v24.21.0。验收执行时间 2026-10-26 08:00–08:05。

## 0. 结论

**PASS**（缺陷 0，修复轮次消耗 0）。BK-0054 四处字面清理全部落地且与实况一致；
AC1/AC2/AC5 以本轮亲跑命令的机器证明全过；AC3 按预案形态收敛（非本轮缺陷）；
AC4 中 `npm test` 亲跑 30/30，`build`/`gate` 以脚本统一门禁输出为准（派发指令
确认已通过，按约不重复跑全套），`smoke:server` 按 PRD §5 明示口径归合并复测执行。
建议进入 MERGE。

## 1. 逐 REQ 核验（4/4 ✓，全部本轮亲读改后文件 + diff 行比对）

| REQ | 位置（改后） | 亲核结果 | 证据 |
| --- | --- | --- | --- |
| REQ-0054-01 | `packages/shared/test/synthesis.test.mjs:15` | 测试名「其余 **17** 键无 caps 键」✓ | 亲读 + AC2 diff 行（`16 键`→`17 键`）+ AC1 实跑 ✔ 该测试名 |
| REQ-0054-02 | `packages/shared/test/synthesis.test.mjs:24` | 断言消息「**17** 节点无 caps 的复现条件」✓ | 亲读 + AC2 diff 行（`16 节点`→`17 节点`） |
| REQ-0054-03 | `packages/shared/test/defs-drift.test.mjs:48`（改前 :49，因删行前移） | 断言消息「定稿 **20** 种漂移」✓，与 :10-11 注释「20 种节点 × 42 参数」自洽 | 亲读 + AC2 diff 行（`18 种`→`20 种`） |
| REQ-0054-04 | `packages/shared/test/defs-drift.test.mjs:28` | `grep -n termview` 全文件**恰 1 处**（:28，值逐字 `{ lines: 200, autoscroll: true }`）；被删的是 webshow/jsoncanvas 之间的改前 :31 错位复行（BUILD 取舍依据 = `nodes.ts` 声明序，:28 正处 reply→termview→setvar 正位） | 亲读 + AC2 diff 删除行 + grep 输出 |

## 2. 验收标准逐条执行

### AC1 正路径 ✓（本轮亲跑）

- 命令：`npm test`（工作树根，正式口径 = `build:shared + build:server +
  test -w @agentflow/shared`；本轮 `src/**` 零改动，构建为增量重建）。
- 结果：**`ℹ tests 30 / ℹ pass 30 / ℹ fail 0`，exit 0**；实跑输出含
  「✔ caps 固定序：llm/agent=[mcp,skill] / code=[mcp] / 其余 17 键无 caps 键」
  ——新字面量测试名在断言全过下生效。30/30 与 0041 基线一致，零增量断言（PRD 口径）。
- **字面计数 vs 实况独立核证**（不经由断言文本；node 直读
  `packages/shared/dist/index.js`（脚本门禁 08:00 构建产物）本轮亲跑）：
  `NODES_KEYS=20`；`CAPS_KEYS=["llm","agent","code"]`；`NO_CAPS_COUNT=17`
  → 「17 键 / 17 节点」与实况一致；期望表（改后）20 键 42 参数 → 「20 种」与实况一致。

### AC2 改动面机器证明 ✓（本轮亲跑）

- `git --no-pager diff HEAD --stat -- packages/`：
  `defs-drift.test.mjs | 3 +--`、`synthesis.test.mjs | 4 ++--`——**恰 2 文件**，
  3 insertions / 4 deletions = 3 处字面替换 + 1 行删除（PRD §3 非功能「≤5 行级」✓）。
- 全量 diff 逐行亲核：其余一切行零变化（diff 中仅上下文参照行）；断言本体
  （断言函数/期望值）、`nodes.baseline.json`、`EXPECTED_DEFAULTS` 其余 19 键零改动。
- **期望表改前后等价独立证明**（本轮亲跑：node 求值 `git show HEAD:` 改前表
  vs 当前表，纯对象字面量求值）：
  `OLD_KEYS=20 / NEW_KEYS=20`；`OLD_PARAMS=42 / NEW_PARAMS=42`；
  `DEEP_EQUAL=true`；`KEY_ORDER_EQUAL=true`——键集合、参数总数、键序改前后
  全等（强于 PRD 的 deepEqual 口径一级）。

### AC3 门禁红预案 ✓（预案形态收敛，非本轮缺陷）

- 门禁由脚本统一执行；派发指令确认 build/gate 已在工作树内运行且**通过**，
  本轮按约不重复跑全套。首轮 `s3-library` diffPx=23 的四路亲核（PRD AC3 预案
  命中 / DOM 不变量六键全等 / 23 像素坐标 `x∈[20,29],y∈[794,887]` 与
  0039~0041 在案散点吻合 / 零因果 grep）已留档 JOURNAL「门禁首轮红处置」节。
- 本轮补充亲证三件：
  1. 因果 grep 复跑 `grep -rn "shared/test" apps/web/src apps/server/src
     tools/pixel-gate packages/shared/src` → **零命中（exit 1）**——两改动文件
     不在任何前端/门禁/后端构建因果路径；
  2. `ls tests/golden/diff/` → **无残留产物**——与「脚本复跑门禁通过、首轮红
     diff 产物已随绿跑清理」自洽；golden 本体零接触由 AC5 diff 空证明；
  3. 不可复现项如实标注：JOURNAL 时的 s3 失败帧 `invariants.json` 已随产物
     清理（本轮复核 `S3_RECHECK_SKIP: ENOENT`），无法重比；以 JOURNAL 在案
     记录 + 脚本复跑通过事实 + 本轮零因果 grep 三证采信。
- `gate:update` 零消费（非修宪轮，宪法第 3 条）✓。

### AC4 回归面 ✓（亲跑/引用分列如实）

- `npm test`：**本轮亲跑 30/30 exit 0**（AC1）。
- `npm run build` / `npm run gate`：脚本统一门禁已跑且通过（派发指令 + JOURNAL
  首轮红→预案处置→复跑记录）；本轮按派发契约不重复跑全套。golden/pixel-gate
  路径零 diff（AC5 亲证）为本轮独立的因果旁证。
- `npm run smoke:server` 133/0：**本轮未跑**——PRD §5 明示验收命令口径四件套
  「归合并复测执行」；且改动为 node:test 测试文件，对 server 构建零因果
  （AC3 grep 亲证 `apps/server/src` 无引用）。留 MERGE 阶段主干复测执行。

### AC5 禁区白名单 ✓（本轮亲跑）

- 命令：`git diff HEAD -- apps packages/shared/src tools/pixel-gate
  tests/golden .github 'package*.json'` → **空输出 exit 0**。禁区六路零触碰。

## 3. 交互回归抽查（裁剪为零执行，附理由）

本迭代改动面 = `packages/shared/test/` 两文件（node:test 契约测试），本轮亲证
零渲染因果：① AC5 diff 证明 `apps/web`（含 `src/legacy/app.js`、`Skeleton.tsx`、
`app.css`）与 `tools/pixel-gate`、`tests/golden` 零字节改动；② AC3 grep 证明
两文件不被 `apps/web/src`、`apps/server/src`、`tools/pixel-gate`、
`packages/shared/src` 任何模块引用（其 import 面仅 `node:test` /
`node:assert/strict` / `node:fs` / 只读 `../dist/index.js`，亲读 :6-13）；③ 门禁
（DOM 不变量 + 像素）由脚本跑过通过。故交互回归清单（拖拽/缩放/框选/连线/审批
弹窗/撤销重做/导入导出等）无执行对象——渲染产物与基线逐字节同源，无回归面可抽。

## 4. 缺陷清单

无（BUG-000）。未发现任何偏离 PRD §3/§5/§6 的行为。

## 5. 越界与不做范围核查（PRD §6 逐条）

- `EXPECTED_DEFAULTS` 其余 19 键值与键集合组成零改动（AC2 diff + DEEP_EQUAL）✓。
- BK-0051 / issue #12 / BK-0040 链 / BK-9004/9005 链零触碰（AC5 禁区空 +
  `git status` 机制件仅 BACKLOG.md / STATE.md / iterations/0045/）✓。
- 0041 已定稿 PRD/REPORT 文本零回改（本轮仅读）✓。
- 改动总量 4 行级 ≤ 5 ✓；新增源文件 0（≤400 行约束不适用）✓。

## 6. 观察项（非缺陷，仅留档）

- OBS-0045-01：AC2 独立核证显示改前/改后期望表**连键序也全等**
  （`KEY_ORDER_EQUAL=true`）——被删的 :31 错位复行在 JS 对象求值语义下本就被
  :28 同值覆盖，运行时对象零变化，本次去重仅使表文本与 `nodes.ts` 声明序一致。
  与 PRD E4「语义无影响的同表杂质」判断互相印证，无需后续动作。
