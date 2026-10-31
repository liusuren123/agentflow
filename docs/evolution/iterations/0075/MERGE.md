# MERGE · 迭代 0075 · BK-0064 工具执行异常可观测性（合并仲裁轮）

> 产出角色：merge-arbiter（MERGE 阶段）· 2026-10-31 · 主干 main
> 分支：`feat/0075-iter`（领先主干 2 提交：a13b040 产品提交「feat(server): BK-0064
> 工具执行异常可观测性——llm.ts execute 包装器异常捕获 emit warn + 触发既有降级直
> 生成轮（MEM05 断言同批改写 + ADR-0024 §4.1 反写注）」+ 4d455c6 机制件提交
> 「docs(evolution): 归档迭代 0075 产物与机制件」；合并基 = 合并时主干 HEAD
> `7725486`，主干 0 领先——`git merge-base main feat/0075-iter` = `7725486…`
> 与合并前 `git rev-parse main` 同值亲核）

## 0. 结论：**合并成功 · 零冲突 · 主干复测四项全绿**

与 0074 补题轮不同，本轮合并内容与迭代主题**完全一致无偏差**：BK-0064 的实施
（llm.ts execute 包装器异常捕获 emit warn + 触发既有降级直生成轮 + smoke MEM05
断言同批改写 + ADR-0024 §4.1 反写注）已真实并入主干（`git diff main~1..7bd198d
-- apps/server/src/llm.ts` +18/−1 亲核，execute 回调内 try/catch 捕获 impl 异常、
pino + SSE 双路 warn、`toolErr` 置位跳出工具轮走降级直生成 generateText 全在位），
且主干复测冒烟 203/0 中 **MEM05 PASS 行命中新形态**（`evidence/smoke.log:139`
亲核）——实施因果性在主干侧有第一手运行证据（工作树内 VERIFY 反演抽查另见
REPORT §二 REQ-0075-05④）。

## 1. 合并执行

- 前置确认：`git status` 输出「nothing to commit, working tree clean」（主干工作区
  干净；main 领先 origin/main 4 提交属既有状态，与本轮无关）。
- 合并基亲核：`git merge-base main feat/0075-iter` = `77254865eaa8…`，恰为合并前
  主干 HEAD（主干在分支开工后零推进）——合并在 git 层面不可能产生冲突，实际亦零冲突。
- 命令：`git merge --no-ff feat/0075-iter -m "merge(evolution): 合并迭代 0075 工具
  执行异常可观测性：llm.ts execute 包装器异常捕获 emit warn + 触发既有降级直生成轮
  （全工具族失败路径）"` → exit 0「Merge made by the 'ort' strategy」。
- 合并提交：`7bd198d`（完整哈希 `7bd198d21dfed12eaec65ffff0fd375d6c05dbaf`，父提交
  `7725486` + `4d455c6`，`git log --format='%h parents:%p' -1` 亲核，--no-ff 拓扑
  正确）。
- 改动面（`git diff main~1..7bd198d --numstat` 实查）：7 文件 +561/−19——
  `apps/server/src/llm.ts`（+18/−1）· `docs/adr/0024-memory-tools-crossrun.md`
  （+5/−0）· `tests/smoke/smoke-server.mjs`（+32/−17）· `docs/evolution/BACKLOG.md`
  （1/1 单行改写）· `docs/evolution/iterations/0075/{JOURNAL.md +89, PRD.md +227,
  REPORT.md +189}`（全新文件）。
- **合并结果与分支尖逐字一致**：`git diff feat/0075-iter..7bd198d --stat` 输出为空
  （主干零分叉 → 合并产物 = 分支内容原样落盘，任何一侧内容零丢失的机械证明）。

## 2. 冲突清单与处理方式

**冲突文件：无（空数组）。** git ort 策略自动合并干净完成，全程无冲突标记产生
（合并后 `grep -rn '<<<<<<<\|>>>>>>>' apps/ packages/ tests/ docs/evolution/STATE.md
docs/evolution/metrics.md docs/evolution/BACKLOG.md` 零命中亲核）。

无 git 冲突 ≠ 零仲裁核对，逐文件分类核对如下（机械核对，非择一裁决）：

- **`docs/evolution/STATE.md`**：不在分支 diff 中（机制件提交 4d455c6 仅触
  BACKLOG + iterations/0075/*，STATE 过程态本轮未随分支携带——
  `git diff main~1..7bd198d -- docs/evolution/STATE.md` 空 + `docs/evolution/
  metrics.md` 空，均亲核）→ 主干基线原样保持（iteration: 0075 / phase /
  last_result 均主干值），零仲裁动作。终态记账（phase=idle / iteration+1 /
  last_result 重写）归 CLOSE。
- **`docs/evolution/metrics.md`**：不在分支 diff 中，零触碰（0075 行追加记账归 CLOSE）。
- **`docs/evolution/BACKLOG.md`**：BK-0064 行**严格单行改写**
  （`git diff main~1..7bd198d -- docs/evolution/BACKLOG.md` 恰 −1/+1、仅该行亲核）：
  在 0074 终态注（replenished，原文逐字保留）之后追加「2026-10-31 迭代 0075 PLAN
  轮选为本轮项」注（选题存证 / 锚点现场刷新 / skipSpec=true / 状态列 ready 维持、
  「done 归 CLOSE 依 VERIFY 回写」行内自注在案）；状态格维持 `| ready |`——
  行内自声明与「同 ID 取语义更靠后」规则无冲突（终态改写是 CLOSE 的记账动作，
  非合并仲裁动作；本轮无主干侧并发改写可竞争）。
- **`docs/evolution/iterations/0075/`**：JOURNAL/PRD/REPORT 三个全新文件（目录号
  隔离，主干此前无 0075 目录，随合并新建），与分支逐字一致（合并 diff 亲核 =
  分支提交 4d455c6 的同文件新增行数 89/227/189）。REPORT.md 在位即验收报告。
- **产品代码（`apps/`、`tests/`）与 ADR**：`apps/server/src/llm.ts` +18/−1、
  `tests/smoke/smoke-server.mjs` +32/−17、`docs/adr/0024-memory-tools-crossrun.md`
  +5/−0——三处均与主干零交叠（主干自合并基零前进），自动合并干净；按角色契约
  「产品代码冲突不得自行择一」条款，本轮**无冲突即无择一场景**，内容以机械证明
  （§1 末条 diff 空）确认与分支一致。0068 补记原文（ADR §4.1 :182-187）逐字保留、
  其后 0075 反写注（:188-192）追加在位（`sed -n '182,192p'` 亲核）。
- **禁区**：`packages/`、`apps/web/`、`tools/`、`tests/golden/`、`.github/`、
  `package.json`、`package-lock.json` 零触碰（合并 numstat 实查无其一）。本轮非
  修宪轮（派发明示「否 = 禁止 gate:update」），全程未运行 `gate:update`，golden
  零接触。

**内容完整性自检（机械解冲突丢内容防线）**：冲突标记零残留（上）+ 分支尖与合并
产物 diff 为空（两侧实质内容保全的最强形态）+ BACKLOG 单行改写、0074 前注原文
保留（上），逐项通过。

## 3. 主干端到端复测（逐项实跑，真实退出码，均在合并提交 7bd198d 上）

| # | 命令 | 退出码 | 关键输出 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | `npm run build` | **0** | vite 构建成功，`dist/index.html` 723.72 kB，✓ built in 1.98s（与 0074 主干复测同值，零前端变化旁证） | `evidence/build.log` |
| 2 | `npm run gate` | **0** | **21/21 场景首跑全 pass，diffPx 全 0**（`grep -c 'pass · diffPx=0'` = 21、fail 行 0 亲核），「宪法门禁：通过 ✓」——**首跑即绿，未触发 issue#12 复跑例外** | `evidence/gate.log` |
| 3 | `npm test` | **0** | `tests 30 / pass 30 / fail 0`（契约测试，DEFS 零漂移——本轮零 shared 改动的回归旁证） | `evidence/test.log` |
| 4 | `npm run smoke:server` | **0** | `==== smoke:server：203 passed / 0 failed ====`（= 0074 主干基线 203/0 零回退）；**MEM05 PASS 行命中 0075 新形态**（smoke.log:139：非法 key run 恰 2 请求——第 1 携 tools、第 2 无 tools = 降级直生成请求流实证；warn「工具执行异常 <工具名>：…」+「工具执行异常（…），降级为直接生成」双行锚定；零 🔧 行；run:done ok:true；token 域行数仍 2） | `evidence/smoke.log` |

任一项红即失败的红线未触发；未放宽任何门禁、未重录 golden、零 `gate:update`。

## 4. 图像证据（脚本采集）

`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0075/evidence`
→ exit 0「evidence ok: 4 张」，4 张确定性截图（渲染节点 35/张）+ `manifest.json`
（capturedAt / viewport / distDir / 4 scenes）。四张字节数与 0073/0074 轮证据逐张
同值（92168 / 109109 / 107251 / 132182 B）——零渲染变化旁证：

- `01-initial.png`（92,168 B）· `02-node-selected.png`（109,109 B）·
  `03-settings.png`（107,251 B）· `04-library.png`（132,182 B）

## 5. 证据目录

`docs/evolution/iterations/0075/evidence/`：
`build.log` · `gate.log` · `test.log` · `smoke.log` · `01-initial.png` ·
`02-node-selected.png` · `03-settings.png` · `04-library.png` · `manifest.json`

## 6. 移交 CLOSE 与风险声明

1. **BK-0064 终态记账**：实施已真实并入主干且主干复测四项全绿（§0/§3），BACKLOG
   状态列现为 `ready`（分支行内自注「done 归 CLOSE 依 VERIFY 回写」）——CLOSE
   据本轮 REPORT（PASS，0 BUG，1 项 Minor 观察 OBS-0075-01）与本文件复测结论执行
   done 记账 + metrics 0075 行追加 + STATE 终态（phase=idle / iteration+1 /
   last_result 含复测与证据路径）。issue 面无回执义务（来源 T5 非 issue）。
2. **OBS-0075-01（Minor，不阻塞收口）**：REPORT §四如实记录，是否立项归侦察/PM
   裁决，非本轮合并射程。
3. **issue#12 复跑例外未消费**：gate 首跑即 21/21 全绿，双留档（gate-first-run.log）
   通道本轮未启用。
4. 主干复测四项全绿、工作区干净；分支 `feat/0075-iter` 与其工作树保留，清理归 CLOSE。
