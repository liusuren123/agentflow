# JOURNAL · 迭代 0045 · BUILD（BK-0054 契约测试同族字面残留清理）

> 工作树 `feat/0045-iter`；BUILD 契约见 WORKFLOW §4；S 项免 SPEC（skipSpec=true，
> 受影响文件清单与验收口径内嵌 PRD §4/§5）。

## 改动清单（与 PRD §3 一一对应）

| 文件 | 改动 | 对应 REQ |
| --- | --- | --- |
| `packages/shared/test/synthesis.test.mjs:15` | 测试名字面量「其余 16 键」→「其余 17 键」（20 类型 − 3 caps = 17） | REQ-0054-01 |
| `packages/shared/test/synthesis.test.mjs:24` | 断言消息字面量「16 节点无 caps 的复现条件」→「17 节点无 caps 的复现条件」 | REQ-0054-02 |
| `packages/shared/test/defs-drift.test.mjs:49` | 断言消息字面量「定稿 18 种漂移」→「定稿 20 种漂移」（与 :11 注释「20 种节点 × 42 参数」一致） | REQ-0054-03 |
| `packages/shared/test/defs-drift.test.mjs:31` | 删除重复键行 `termview:   { lines: 200, autoscroll: true },`（保留 :28 行，值逐字不变） | REQ-0054-04 |

预算核验：3 处字面量替换 + 1 行删除 = 改动总量 4 行级（≤ PRD §3 非功能 ≤5 行级）；
断言本体（断言函数/期望值）、EXPECTED_DEFAULTS 其余 19 键、`nodes.baseline.json`、
`packages/shared/src/**` 零改动。

**termview 二留一的取舍依据**：改前亲核 `packages/shared/src/nodes.ts:119-138`
NODES 声明序为 `…reply → termview → setvar → webshow → jsoncanvas → approval`——
:28 的 termview 正处声明序正确位置（reply 与 setvar 之间），:31（webshow 与
jsoncanvas 之间）系 0035 jsoncanvas 落地时的错位复行，故删 :31 保留 :28。
键序对断言无影响（②③ 均 `.sort()` 后 deepEqual），取舍纯为表序与声明序一致。

## BUILD 前证据亲核（2026-10-26 07:53，工作树内）

- E1/E2 亲读成立：`synthesis.test.mjs:15` 测试名含「其余 16 键」、`:24` 断言消息
  含「16 节点」；而循环体遍历 NODES（20 类型）跳过 llm/agent/code 三键后为 17。
- E3 亲读成立：`defs-drift.test.mjs:49` 消息含「定稿 18 种」；`:11` 注释自证
  「20 种节点 × 42 参数」，`:47-48` 键集断言对 EXPECTED_DEFAULTS 20 键实跑通过。
- E4 亲读成立：`:28` 与 `:31` 两行 `termview` 值全同
  `{ lines: 200, autoscroll: true }`（JS 后者覆盖前者，键集不受影响）。
- 起点干净：`git status --short` 产品代码零脏（仅 PLAN 轮机制件
  BACKLOG/STATE/iterations/0045/ 在途）。

## 自测记录（工作树内实跑，2026-10-26 07:54）

- `npm test -w @agentflow/shared`（工作树根，直接对基线门禁已产的 `dist/` 实跑；
  本轮 `src/**` 零改动故 dist 现行有效）：**tests 30 / pass 30 / fail 0**；输出含
  「✔ caps 固定序：llm/agent=[mcp,skill] / code=[mcp] / 其余 **17** 键无 caps 键」
  「✔ DEFS 默认值 42/42 全量断言」——①②③ 既有断言（含期望表 20 键 × 42 参数
  计数护栏）去重后全过，键值集合改前后 deepEqual 相等（AC1 核心面）。
- `git --no-pager diff --stat` + 全量 diff 逐行核验：产品面恰 2 文件——
  `synthesis.test.mjs | 4 ++--`（2 处替换）、`defs-drift.test.mjs | 3 +--`
  （1 处替换 + 1 行删除），其余一切行零变化（AC2）。
- `git diff HEAD -- apps packages/shared/src tools/pixel-gate tests/golden .github
  package*.json` → **空输出 exit 0**（AC5 禁区白名单恒空）。

## 未跑项（按派发契约归脚本统一执行）

完整门禁 `npm run build` / `npm run gate` / `npm test`（正式口径，根目录链式含
build:shared+build:server）/ `npm run smoke:server` 与 git 提交由脚本在 BUILD 之后
统一执行——本轮未自行运行（上述 `npm test -w @agentflow/shared` 为 BUILD 自测
口径的工作区定向调用，命令与结果已如实记录）。AC3/AC4 回归面（gate 16 场景 /
smoke 133/0）以脚本门禁输出为准；AC3 预案（s3 本机采样抖动）未在本轮触发。

## 越界判定

零触碰 UI / DEFS / golden / 依赖 / env / CI；无需扩大影响面；无 pending-approval
触发；PRD §6 不做范围全部遵守。

## 门禁首轮红处置（修复轮，2026-10-26 07:56+）

**现象（脚本统一门禁输出，本轮门禁由脚本执行）**：15 场景 pass · diffPx=0，唯
`s3-library` FAIL · **diffPx=23**（diff 产物落 `tests/golden/diff/`：
current.png / diff.png / invariants.json 三件齐）。

**定性：PRD AC3 预案内的本机采样抖动，非本轮缺陷，无产品修复项。** 本会话四路亲核：

1. **PRD 预案命中**：PRD §5 AC3 原文「Given 0037~0041 已归档的本机 s3-library
   采样抖动（diffPx≈23、rerun 即绿、CI 权威），When 合并后 gate 首跑仅 s3 红，
   Then 按预案处置：不消费 `gate:update`，复核 DOM 不变量逐键全等后以复跑/CI
   权威裁决」——本轮实发即该形态（同场景同值，第四轮连续命中：0039/0040/0041
   合并后首跑均 s3 diffPx=23，均终态 done）。
2. **DOM 不变量逐键全等**：`node` 比对 `tests/golden/ui/s3-library.invariants.json`
   （golden）vs `tests/golden/diff/s3-library.invariants.json`（失败帧）——六键
   `bottomClosed / counts / cssVars / nodes / view / zoom` 逐键 JSON 全等零值差
   （INVARIANTS-ALL-EQUAL，exit 0）。DOM 结构与 CSS 变量零漂移，差异纯属光栅采样层。
3. **差异坐标确定性定位（本 round 新增，比 0041 目视更强）**：用与 gate.mjs:450
   完全相同的比对（`pixelmatch`、`threshold: 0`）对既有产物
   `tests/golden/ui/s3-library.png` vs `tests/golden/diff/s3-library.current.png`
   程序化复算：**numDiff=23 与门禁报告 diffPx=23 一致**；23 像素全部落于
   **x∈[20,29] / y∈[794,887]**（1600×900 视口左缘下部 = 左侧图标工具栏下缘），
   与 0041 JOURNAL 在案散点位置（x≈15-30/y≈790-880）及 0039
   `evidence/gate-first-run.log:3` 记录（x≈20/y≈780-890）逐点吻合——图标
   反走样的亚像素级采样抖动形态，非结构性渲染变化。
4. **零因果路径 grep 可证（AC3 原文要求）**：本轮两改动文件 import 面仅
   `node:test` / `node:assert/strict` / `node:fs` / 只读 `../dist/index.js`
   （synthesis:10-13、defs-drift:6-8）；`grep -rn "shared/test" apps/web
   tools/pixel-gate apps/server/src packages/shared/src` → 零命中——两文件不在
   任何构建/门禁因果路径。且 15/16 场景 diffPx=0 排除全局性致变。

**处置**：不消费 `gate:update`（宪法第 3 条，非修宪轮）；`tests/golden/diff/`
残留系 gitignored（.gitignore:20）沿 0039/0041 处置保留；按派发指令本轮未自行
重跑门禁、未提交——rerun 判绿与 CI 权威裁决归脚本后续门禁轮。零新增产品改动
（productFiles 跨轮累积并集维持首轮两文件不变）。
