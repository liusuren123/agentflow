# MERGE · 迭代 0039 · BK-0049 MCP·skills 清单动态化：app.js 硬编码改后端供数（修宪轮）

> 产出角色：merge-arbiter（MERGE 轮）。
> 合并日期：2026-10-26。
> 分支：`feat/0039-iter`（基点 7421d1b，主干在其后经历 0038 合并 7d8df55 / 收口 17d2128 / 留档 08f254f / 归档 b6f8f55）。
> 授权链：ADR-0018（issue#6 批复承继，BK-9006 子项·短修宪穿插项；本轮为重录轮，s15 场景 golden-created）。

## 1. 合并结果

- 合并提交：**ce6cfe3**（`merge(evolution): 合并迭代 0039 BK-9006 子项·MCP·skills 清单动态化：app.js 硬编码 MCP_SERVERS/SKILL_LIST 改后端供数（修宪轮）`，--no-ff）。
- 合并前主干工作区干净（`git status`：nothing to commit, working tree clean；基线 b6f8f55）。
- 自动合并成功：`apps/web/src/legacy/app.js`、`apps/web/src/server-sync.js`、`docs/evolution/BACKLOG.md`、`tests/smoke/smoke-server.mjs`、`apps/server/src/server.ts`（另 5 个纯新增文件无冲突路径）。
- 提交钩子备注：Mimosa 按兼容策略放行（完整扫描结论未得出：library_source/callgraph 部分超限），与 7d8df55 同况，如实记录，不据此宣称项目安全。

## 2. 冲突清单与解决方式（1 个文件、2 处区域）

唯一冲突：`tools/pixel-gate/gate.mjs`（`git merge --no-ff` 报 CONFLICT content）。
定性：**非语义冲突**——两处均为「两路在同一位置各自插入」且叠加「golden 场景号撞号」，
两侧内容互不相干（主干 0038 的 approval 拾取器 / code-lang 联动场景基建 vs 分支 0039 的
能力配置面板场景基建），不存在「同一处语义两路写了不同实现」，无「择一」问题。按
WORKFLOW.md §4 MERGE 段两类明文规则处理（同 7d8df55 先例，BACKLOG BK-0046 行在案）：

| # | 冲突区域 | ours（主干） | theirs（0039） | 解决方式 |
| --- | --- | --- | --- | --- |
| 1 | 场景基建区（L251-343） | `s13 审批人拾取器`（pickOpen/pickReady/pickInv）+ `s14 code lang 联动`（CODE_WF_SEED/codeLangJs/codeSwapped/codeInv）基建（迭代 0038） | `s13 能力配置面板`基建（CAP_FIXTURE/CAP_ROUTES/CAPS_WF_SEED/capsReady/capsInv） | **两侧完整保留**拼接（主干 0038 两块在前、0039 一块在后，各自补齐闭括号）；0039 侧注释场景号同步改 s15 并加合并仲裁注 |
| 2 | SCENARIOS 注册表尾部（L368-378） | `{ id: 's13-approval-role-picker' }` + `{ id: 's14-code-lang-sync' }` | `{ id: 's13-caps-panel' }` | **三条都保留**；0039 一条改号为 `s15-caps-panel`，行内注明改号缘由 |

### 2.1 场景号撞号与时序裁决（改名非重录）

主干已落盘 `s13-approval-role-picker` + `s14-code-lang-sync`（迭代 0038 先落盘），0039
分支自带 `s13-caps-panel`（分支基点 7421d1b 时主干最大号 s12，分支顺取 s13；其后 0038
先合并占去 s13/s14）。按 WORKFLOW §4「golden 场景号按落盘时序裁决」先例（0033/0034
webshow/termview、0038 s12→s13/s13→s14 两代先例）：先落盘者（0038）保留 s13/s14，
后合并者（0039）顺延改号——**s13→s15**。改动仅编号字面量与 golden 文件名，**像素内容
零变化**，属改名非重录，不触宪法第 3 条重录通道：

- `git mv`：`s13-caps-panel.{png,invariants.json}` → `s15-caps-panel.*`（PNG 字节未动）；
- `gate.mjs` 场景号字面量同步（基建注释头 + SCENARIOS 一条 id）+ 合并仲裁注两处；
- 全仓 `git grep s13-caps -- tools tests apps packages` = **零残留**；invariants.json
  内部无场景 id 字段，改名零内容改动。

### 2.2 合并后自检（职责硬性约束，全部通过）

- 冲突标记（`<<<<<<<`/`=======`/`>>>>>>>`）全仓残留计数 = **0**（`git grep -c` 无命中）；未合并路径数 = **0**；
- `node --check tools/pixel-gate/gate.mjs` = **SYNTAX OK**；
- `git diff main -- tools/pixel-gate/gate.mjs` 删除行数 = **0**（主干侧内容零丢失；相对分支侧净差异恰为改号注释 + id 字面量）；
- SCENARIOS 共 **16 条**（s0~s15）完整、无重复号；
- 自动合并文件逐项核对两侧插入都在：`app.js` 0038 侧 role-pick/CODE_JS_SAMPLE 与 0039 侧 capabilities 供数换源（MCP_SERVERS/SKILL_LIST 8 处）都在；`smoke-server.mjs` 0038 K04 源锁与 0039 CAP 组（CAP01-CAP05）都在；
- `BACKLOG.md`：不同 ID 两侧都保留——BK-0046 done（主干 0038 终态）、BK-0049 ready（分支 PLAN 轮晋升行）都在，无冲突路径；
- `STATE.md` / `metrics.md` 本轮未出现在分支侧改动，无冲突（最终记账归 CLOSE 轮）。

## 3. 主干端到端复测（实跑，退出码与关键输出）

| 项 | 命令 | 退出码 | 结果 | 关键输出 |
| --- | --- | --- | --- | --- |
| build | `npm run build` | **0** | ✅ | vite · `dist/index.html 362.51 kB (gzip 109.69 kB)` · built in 743ms |
| gate | `npm run gate`（复跑） | **0** | ✅ | **16 场景全 pass · diffPx=0**（s0~s15，含改名后 s15-caps-panel 像素与 DOM 不变量双过）· `宪法门禁：通过 ✓` |
| test | `npm test` | **0** | ✅ | **30/30 pass · 0 fail**（契约测试；duration 600ms） |
| smoke | `npm run smoke:server` | **0** | ✅ | **131 passed / 0 failed**（0038 主干基线 126 + 0039 CAP 组 5 = 131；K04 源锁与 CAP01-CAP05 全 PASS） |

### 3.1 gate 首跑红（如实留档，同 0037/0038 双留档先例）

合并提交后 gate 首跑 exit 1：`s3-library` diffPx=23，**DOM 不变量全过**；差异像素为
左侧竖向图标工具栏下缘零星散点（x≈20 / y≈780-890），不在库面板内容、画布或属性面板。
与 0037 归档记录「s3 本机采样抖动，以 CI 为权威」（BACKLOG BK-0050 行在案）同形态，
且 0039 改动面（caps 清单供数链）不触及 s3 采集面。**未做任何收口修改、未跑
`gate:update`、未放宽门禁**，仅复跑验证：复跑两次均 16 场景全 pass diffPx=0（exit 0），
证实为采样抖动而非合并回归。首跑输出重建留档于 `evidence/gate-first-run.log`
（同路径 tee 被复跑覆盖，按会话捕获原文重建，缘由在该文件头注明）。

## 4. 证据清单（evidence/）

- `build.log` / `gate.log`（复跑绿，16 场景全 pass）/ `gate-first-run.log`（首跑红重建留档）/ `test.log` / `smoke.log`；
- `01-initial.png`（76884B）· `02-node-selected.png`（91689B）· `03-settings.png`（94615B）· `04-library.png`（119520B）——`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0039/evidence` 实采，渲染节点 19 与 0038 manifest 口径一致；
- `manifest.json`（wt.mjs 产出）。

## 5. 结论

合并成功（ce6cfe3，--no-ff）；唯一冲突 `tools/pixel-gate/gate.mjs` 两处按「同位置各自
插入→两侧完整保留」+ WORKFLOW §4 场景号落盘时序裁决（0039 s13→s15，改名非重录）解决，
主干侧零丢失；主干复测四项全绿（gate 首跑 s3 本机采样抖动如实留档，复跑稳定全绿，
CI 为权威）。本轮未做 CLOSE 记账（BACKLOG 终态 / metrics 行 / STATE 推进归 CLOSE 轮）。
