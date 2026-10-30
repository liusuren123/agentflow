# MERGE · 迭代 0074 · BK-0064 工具执行异常可观测性（合并仲裁轮）

> 产出角色：merge-arbiter（MERGE 阶段）· 2026-10-31 · 主干 main
> 分支：`feat/0074-iter`（领先主干 1 提交：cd9f25a「chore(evolution): 迭代 0074 归档（补题）」；
> 合并基 = 合并时主干 HEAD `0c6efbd`，主干 0 领先——`git merge-base main feat/0074-iter`
> 与 `git rev-parse main` 亲核两值相等）

## 0. 结论：**合并成功 · 零冲突 · 主干复测四项全绿**——但须如实声明合并内容与迭代主题的偏差

**偏差声明（必读）**：本轮分支实含内容为 **PLAN 轮补题机制件**（BACKLOG BK-0064 行
proposed→ready 晋升 + 0074 晋升注追加 + `iterations/0074/PRD.md` 211 行 + STATE 过程态），
**不含任何产品代码改动**。合并提交信息中所述的迭代主题实施（`llm.ts` execute 包装器
异常捕获 emit warn + 触发既有降级直生成轮）**既不在分支上、合并后也不在主干上**——
`git diff 0c6efbd HEAD -- apps/server/src/llm.ts tests/smoke docs/adr` 输出为空（合并前后
逐字节未变，亲核）；PRD §0 自述 `outcome=replenished 补题轮`、skipSpec=true，
实施归后续心跳的 BUILD 轮（受影响文件清单与验收口径已内嵌 PRD §4/§5 可直接复用）。
本轮按派发口径「纯机制件变更（无产品代码改动）」执行合并与复测；**BK-0064 的实施与
终态记账移交 CLOSE / 后续轮裁决**。本文件以下各节均为上述范围内事实的可复核记录。

## 1. 合并执行

- 前置确认：`git status --porcelain` 输出为空（主干工作区干净）；
  `git merge-base main feat/0074-iter` = `0c6efbd` = `git rev-parse main`（主干零分叉，
  合并不可能产生 git 冲突，实际亦零冲突）。
- 命令：`git merge --no-ff --no-commit feat/0074-iter` → exit 0「Automatic merge went
  well; stopped before committing as requested」，随后按契约处理 STATE.md 并提交。
- 合并提交：`1682867`（父提交 `0c6efbd` + `cd9f25a`，`git log --format='%h parents:%p' -1`
  亲核，--no-ff 拓扑正确）
  `merge(evolution): 合并迭代 0074 工具执行异常可观测性：llm.ts execute 包装器异常捕获 emit warn + 触发既有降级直生成轮（全工具族失败路径）`
  （信息文本按派发指令逐字使用；其含义与实际并入 diff 的偏差见 §0 声明。）
- 改动面（`git diff 0c6efbd HEAD --stat` 实查）：3 文件 +213/−2，全部位于
  `docs/evolution/`——BACKLOG.md（BK-0064 行单行改写，见 §2）、
  STATE.md（合并仲裁处理，见 §2）、iterations/0074/PRD.md（211 行新增）。

## 2. 冲突清单与处理方式

**冲突文件：无（空数组）。** 主干在分支开工后零推进（合并基即主干 HEAD），git ort
策略自动合并干净完成，全程无 `<<<<<<<` 冲突标记产生（合并后
`grep -rn '^<<<<<<< \|^>>>>>>> \|^=======$' docs/evolution/` 零命中亲核）。

无 git 冲突 ≠ 零仲裁动作，逐文件分类核对如下：

- **`docs/evolution/STATE.md`（分支携带过程态，按契约主动处理）**：分支版本为 PLAN
  过程态（phase: PLAN / item: BK-0064 / started 07:33 / last_result「迭代 0074 已开工」）。
  按 WORKFLOW §3.1「工作树内 STATE 只承载过程态，不随分支合入主干」与本角色契约
  「以主干当前值为基线，phase 收尾为 idle」，`git checkout HEAD -- STATE.md` 恢复主干
  基线值（iteration: 0074 / phase: idle / item: - / started: 2026-10-26 13:47 /
  last_result = 0073 终态摘要原文逐字保留），仅 `updated` 刷新为合并时点
  `2026-10-31 07:44`（`date "+%Y-%m-%d %H:%M"` 亲核）。终态记账（iteration+1 /
  last_result 重写）仍归 CLOSE。合并提交内该文件净 diff 恰 1 行（updated）。
- **`docs/evolution/BACKLOG.md`（非冲突，追加型核对）**：BK-0064 行为**严格单行改写**
  （`git diff 0c6efbd HEAD -- BACKLOG.md` 恰 −1/+1、仅该行亲核）；行内三段注记共存
  逐项 `grep -o` 计数亲核各恰 1 次——0068 立项原文（「2026-10-31 迭代 0068 REPORT
  §二 BUG-0068-05 定位立项」）+ 0072 延后注（「2026-10-31 迭代 0072 PLAN 轮延后注」）
  + 0074 新晋升注（「2026-10-31 迭代 0074 PLAN 轮晋升 ready 并选为本轮项」，含 ready
  队列 grep 存证 / 占位锁亲核空 / 残缺标记·悬挂 run·issue 批复三源处置记录）；状态格
  `| ready | T5 |`（`| proposed |` 零残留亲核）。「同 ID 取语义更靠后状态」规则本轮无
  竞争对象（主干侧该行合并期间未被触碰，proposed→ready 即语义后位）。
- **`docs/evolution/iterations/0074/PRD.md`**：全新文件 211 行，与分支逐字一致
  （`git diff feat/0074-iter -- <该文件>` 空 + `wc -l` = 211 亲核）。按目录号隔离，
  零冲突。`iterations/0074/` 此前主干无目录，本轮随合并新建（仅 PRD.md，正常——
  PLAN 补题轮无 JOURNAL/REPORT 产物）。
- **`docs/evolution/metrics.md`**：不在分支 diff 中，零触碰（追加记账归 CLOSE）。
- **产品代码 / 禁区**：`git diff 0c6efbd HEAD --name-only -- apps packages tools tests
  .github package.json package-lock.json CONSTITUTION.md AGENTS.md docs/adr` 输出为空
  ——零产品代码、零 shared、零前端、零 golden、零 pixel-gate、零 CI、零 ADR 触碰
  （亲核；特别核验 `apps/server/src/llm.ts` 与 `tests/smoke/` 见 §0）。本轮非修宪轮，
  全程未运行 `gate:update`，golden 零接触。

**内容完整性自检（机械解冲突丢内容防线）**：冲突标记零残留（上）+ BACKLOG 单行改写
三段注记齐备（计数各 1）+ PRD 行数与分支一致 + STATE 基线恢复净 diff 恰 1 行，
逐项通过。

## 3. 主干端到端复测（逐项实跑，真实退出码，均在合并提交 1682867 上）

| # | 命令 | 退出码 | 关键输出 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | `npm run build` | **0** | vite 构建成功，`dist/index.html` 723.72 kB，✓ built in 1.88s（与 0071~0073 基线同值，零前端变化旁证） | `evidence/build.log` |
| 2 | `npm run gate` | **0** | **21/21 场景首跑全 pass，diffPx 全 0**（含 s3-library=0；`grep -c 'pass · diffPx=0'` = 21、fail 行 0 亲核），「宪法门禁：通过 ✓」——**首跑即绿，未触发 issue#12 复跑例外** | `evidence/gate.log` |
| 3 | `npm test` | **0** | `tests 30 / pass 30 / fail 0`（契约测试，DEFS 零漂移） | `evidence/test.log` |
| 4 | `npm run smoke:server` | **0** | `==== smoke:server：203 passed / 0 failed ====`（= 0073 收口基线 203/0，零回退；C01-C04 清理零残留） | `evidence/smoke.log` |

任一项红即失败的红线未触发；未放宽任何门禁、未重录 golden、零 `gate:update`。

## 4. 图像证据（脚本采集）

`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0074/evidence`
→ exit 0，4 张确定性截图（1600×900，渲染节点 35/张）+ `manifest.json`（含逐张 sha256
与字节数）。四张字节数与 0073/0072 轮证据逐张同值（92168 / 109109 / 107251 /
132182 B）——零渲染变化旁证：

- `01-initial.png`（92,168 B）· `02-node-selected.png`（109,109 B）·
  `03-settings.png`（107,251 B）· `04-library.png`（132,182 B）

## 5. 证据目录

`docs/evolution/iterations/0074/evidence/`：
`build.log` · `gate.log` · `test.log` · `smoke.log` · `01-initial.png` ·
`02-node-selected.png` · `03-settings.png` · `04-library.png` · `manifest.json`

## 6. 移交 CLOSE 与风险声明

1. **BK-0064 终态裁决**：本项以 `ready` 并入主干（PLAN 补题轮晋升 + 选题存证），
   主题所述 llm.ts 实施**未发生**（§0 声明）。CLOSE 不得凭本轮合并将其记 done；
   维持 ready 待后续心跳 BUILD（PRD §4 受影响文件清单 / §5 验收口径可直接复用），
   或由 CLOSE 按其口径另行处置。
2. **本轮 metrics 记账口径**：本轮无产品代码、无 VERIFY REPORT，CLOSE 记账时建议
   如实标注「PLAN 补题机制件轮，主题所述实施未发生」（outcome=replenished，0072
   同径先例）；本文件 §0/§2 即事实依据。
3. **Mimosa 提交钩子告知（非本轮引入）**：合并提交与证据提交过钩子时，Mimosa 报告
   存量 high 项两条——`apps/server/src/workbench/routes.ts:21`（collectGitInfo 1 跳达
   command-injection）、`apps/server/src/workbench/routes.ts:76`（collectTree 为
   path-traversal 入口）；钩子明示「低危/提示不阻断」，两处均为本轮零触碰的存量产品
   代码，如实上报（与 0072 轮 MERGE.md §6.3 所报同源，是否立项归侦察/PM 裁决）。
4. **issue 面**：本轮无来源 issue（sourceIssue 不设，来源=T5 侦察补题链），无回执
   义务；issue#12（CI 像素抖动）维持待批准不动，本轮 gate 首跑即绿未消费其例外口径。
5. 主干复测四项全绿、工作区干净；分支 `feat/0074-iter` 与其工作树保留，清理归 CLOSE。
