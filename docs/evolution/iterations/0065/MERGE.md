# 迭代 0065 · MERGE — 合并与主干复测记录（BK-9006 子项·retrieval kb 参数动态化，修宪轮）

> 产物角色：合并仲裁员（merge-arbiter）· 2026-10-29 · 主干 main
> 输入：feat/0065-iter（7599b7a 产品修复提交 + 30e8365 机制件归档提交）· 迭代目录 docs/evolution/iterations/0065/
> 授权链：BK-0047 修宪轮（issue#6 批复承继 2026-10-24T08:38:51Z 在案，ADR-0021 §头声明；golden 变更集恰 s20 双文件 + gate.mjs s20 场景基建，均在批复射程内）

## 1. 合并前置核验

- 主干工作区干净：`git status` = `nothing to commit, working tree clean`（main @ 91e5a1c）。
- merge-base = `91e5a1c`（即主干自分支切出后零前进），分支侧 2 提交（7599b7a + 30e8365）。
- ADR-0021（docs/adr/0021-retrieval-kb-combo-server-fed-options.md）随分支入库，头部明载 issue#6 批复承继授权链与「草案·待实施轮消费」显著声明；golden/gate.mjs 变更属修宪轮射程，`npm run gate:update` 重录通道授权成立（本轮 REPORT/JOURNAL 记载 s20 缺陷态光栅→干净稳态一次重录，重录后 4/4 pass diffPx=0）。

## 2. 合并结果

| 项 | 值 |
| --- | --- |
| 合并方式 | `git merge --no-ff feat/0065-iter -m "merge(evolution): 合并迭代 0065 BK-9006 子项·retrieval kb 参数动态化：combo 选项由后端 kb 清单端点供数（修宪轮，issue#6 批复承继）"` |
| 合并提交 | **`3133857`**（3133857e2adbc8996b46687109a26edb9e7c23af） |
| 冲突 | **0 文件**（ort 策略自动合并，`Merge made by the 'ort' strategy`，无任何冲突检出——主干自 merge-base 零前进，故 STATE/metrics/BACKLOG/产品代码均无双侧改动） |
| 载入主干 | 产品：apps/web/src/legacy/app.js（+29/−8，refreshKbs 改「仅变更到达」断绝 renderProps⇄refreshKbs⇄onKbsArrive 自反馈死循环，BUG-0065-01）+ apps/web/src/server-sync.js（+39/−8，kbShapeOf/fetchKbList/SVR.kbs/refreshKbs/onKbsArrive 供数链）+ tools/pixel-gate/gate.mjs（+53/−3，s20-retrieval-kb-online 场景基建，20→21 场景）；golden：tests/golden/ui/s20-retrieval-kb-online.{png,invariants.json} 双文件新增（**亲核 golden 变更集恰 s20 双文件**——`git diff --stat 91e5a1c..3133857 -- tests/golden/` 仅此二文件，既有 20 场景 PNG 零出现）；机制件：ADR-0021 + iterations/0065/{PRD,SPEC,JOURNAL,REPORT}.md + verify-shots/ 15 件 + BACKLOG.md BK-0047 行过程态注（proposed→ready 晋升注，终态记账归 CLOSE 主干侧） |

冲突自检：无冲突检出，无需逐文件核对；合并后工作区仅含本轮新增证据与 MERGE.md（机制件，CLOSE 提交）。

## 3. 主干端到端复测（合并后 main @ 3133857 实跑，日志 evidence/）

| # | 命令 | 退出码 | 结果 | 日志 |
| --- | --- | --- | --- | --- |
| R1 | `npm run build` | **0** | shared tsc + server tsc + web vite ✓（dist/index.html 718.51 kB，built in 4.28s） | build.log |
| R2 | `npm run gate` | **0** | **21/21 场景 pass，diffPx 全 0**（s0~s20 首跑全绿，含新 s20-retrieval-kb-online；无 issue#12 s3-library 抖动形态，未复跑；零 gate:update） | gate.log |
| R3 | `npm test` | **0** | 契约测试 **30/30**（pass 30 / fail 0） | test.log |
| R4 | `npm run smoke:server` | **0** | 后端 E2E **168 passed / 0 failed**（=0061 收口基线 168/0 零回退） | smoke.log |

复测结论：四项全绿，均实跑留证，未放宽门禁、未重录 golden。

## 4. 图像证据

`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0065/evidence` → exit 0，4 张确定性截图 + manifest.json（renderedNodes=19 ×4，sha256 逐张在案）：01-initial.png / 02-node-selected.png / 03-settings.png / 04-library.png。

## 5. 证据清单（docs/evolution/iterations/0065/evidence/）

- 日志：build.log · gate.log · test.log · smoke.log
- 图像：01-initial.png · 02-node-selected.png · 03-settings.png · 04-library.png · manifest.json

## 6. 后续（归 CLOSE）

- 主干侧最终记账：STATE（phase=idle、iteration 推进、last_result 含本文件指针）、BACKLOG BK-0047 终态、metrics 追加一行；issue#6 进度回执（BK-0048 未竟，不关单）。
- 推送后盯守 CI `ui-constitution`（golden 权威在 CI windows-latest）。
