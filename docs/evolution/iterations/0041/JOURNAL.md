# JOURNAL · 迭代 0041 · BUILD（BK-0053 契约测试名静态字面漂移修正）

> 工作树 `feat/0041-iter`；BUILD 契约见 WORKFLOW §4；S 项免 SPEC（skipSpec=true，
> 受影响文件清单与验收口径内嵌 PRD §5/§6）。

## 改动清单（与 PRD §5 一一对应）

| 文件 | 改动 | 对应 REQ |
| --- | --- | --- |
| `packages/shared/test/defs-drift.test.mjs:36` | 测试名字面量「38/38」→「42/42」（与 `:41` 计数断言值 42 一致） | REQ-0053-01 |
| `packages/shared/test/defs-drift.test.mjs:38` | 新增 1 行机制注记「计数护栏值变更（经批准的 DEFS 增删）时，测试名字面量须随改——BK-0053」 | REQ-0053-03（可选增强，已做） |
| `packages/shared/test/synthesis.test.mjs:60` | 测试名字面量「19 键全量」→「20 键全量」（与 baseline 实际键数一致） | REQ-0053-02 |

预算核验：defs-drift ≤2 行（1 替换 + 1 注记）、synthesis 恰 1 行——均在 §5 预算内。
断言本体、EXPECTED_DEFAULTS 期望表、逐字节比对断言、`nodes.baseline.json` 零改动。

## BUILD 前证据亲核（2026-10-26 03:54，工作树内）

- E1/E2/E3 亲读成立：`defs-drift.test.mjs:36` 名含「38/38」而 `:39-41` 断言值已 42；
  `synthesis.test.mjs:60` 名含「19 键全量」。
- E4 亲跑成立：`node -e`（require nodes.baseline.json）→ 顶层键数 **20**，
  前 3 键 `trigger,userinput,llm`。
- 起点干净：`git status --short` 产品代码零脏（仅 PLAN 轮机制件
  BACKLOG/STATE/iterations/0041/ 在途）。

## 自测记录（工作树内实跑）

- `npm test`（根，shared 契约）：**tests 30 / pass 30 / fail 0**；输出含
  「✔ DEFS 默认值 42/42 全量断言（字面量期望，防未经 ADR 的漂移）」与
  「✔ 快照常驻比对：NODES 运行时输出与迁移前基线逐字节等价（不变式 A，20 键全量）」
  ——名称与断言实际值零矛盾（AC1）。
- `git --no-pager diff -- <两文件>` 逐行核验：恰 REQ-0053-01/02 字面量替换 +
  REQ-0053-03 注记行，其余一切行零变化（AC2）。
- `git diff --stat`：产品面仅 §5 清单内两文件（3 ++- / 2 +-）；PRD §5 零触碰清单
  （`packages/shared/src/**`、`apps/**`、`tools/pixel-gate/**`、`tests/**`、
  `.github/**`、`package*.json`、`docs/adr/**`）全部 0 diff（AC4 自检）。

## 未跑项（按派发契约归脚本统一执行）

完整门禁 `npm run build` / `npm run gate` / `npm test`（正式口径）/ 
`npm run smoke:server` 与 git 提交由脚本在 BUILD 之后统一执行——本轮未自行运行
（上述 `npm test` 为 BUILD 自测口径，命令与结果已如实记录）。AC3 回归面
（gate 16 场景 / smoke 133）以脚本门禁输出为准。

## 越界判定

零触碰 UI / DEFS / golden / 依赖 / env；无需扩大影响面；无 pending-approval 触发。

## 门禁首轮红处置（修复轮，2026-10-26 03:55+）

**现象（脚本统一门禁输出，本轮门禁由脚本执行）**：15 场景 pass · diffPx=0，
唯 `s3-library` FAIL · **diffPx=23**（diff 产物落 `tests/golden/diff/s3-library.*`）。

**定性：PRD AC3 预案内的本机采样抖动，非本轮缺陷，无产品修复项。** 本会话四路亲核：

1. **PRD 预案命中**：PRD §6 AC3 原文「s3-library 本机采样抖动（diffPx≈23、
   rerun 即绿）系 0037~0040 已归档的环境侧形态、CI 为权威——如实双留档，
   不消费 gate:update」——本轮实发即该形态（同场景同值）。
2. **DOM 不变量逐键全等**：`node` 比对 `git show HEAD:tests/golden/ui/
   s3-library.invariants.json` vs 失败帧 `tests/golden/diff/s3-library.
   invariants.json` → 六键（bottomClosed/counts/cssVars/nodes/view/zoom）
   键集相同、**值差键数 = 0**——DOM 结构零漂移（0039 JOURNAL 同法取证同结论）。
3. **差异像素位置与归档形态一致**：目视 `diff/s3-library.diff.png`，显著差异为
   零星橙点、位于左侧竖向图标工具栏下缘 x≈15-30 / y≈790-880——与
   `iterations/0039/evidence/gate-first-run.log:3` 记录位置（x≈20/y≈780-890）吻合；
   图中大片浅灰系 diff 覆盖图常规底衬（gate 实报 diffPx=23，非成片差异）。
4. **零因果路径**：`grep -rn "defs-drift|synthesis.test" apps/ tools/
   packages/shared/src/` → **零命中**（测试名字符串不在 web 构建图内）；
   且 15/16 场景 diffPx=0——若改动致渲染变化不可能单场景独红。

**归档同形态先例**：0039/0040 合并后 gate 首跑均 `s3-library FAIL · diffPx=23`
（`0039/evidence/gate-first-run.log:12`、`0040/evidence/gate-first-run.log:8`），
两轮终态均 done；0037 MERGE.md §4.1 同 golden 同 dist 5 次采样
diffPx=0/23/0/21/0 交替——环境侧形态在案。

**处置**：① 不消费 `gate:update`（宪法第 3 条 / PRD §3 禁令）；② diff 产物残留
保留不清理——目录 gitignored（`.gitignore:20`，`git check-ignore -v` 亲验），
不入提交（0039 JOURNAL:124 同处置）；③ 按派发指令**未自行重跑门禁、未提交**——
rerun 判绿与 CI 权威裁决归脚本后续门禁轮，本节即 AC3 口径的「红因如实留档」。
