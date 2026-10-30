# MERGE · 迭代 0073 · BK-0018 跨 run 记忆工具组（memory.get/set/list）重试轮

> 产出角色：merge-arbiter（MERGE 阶段）· 2026-10-31 · 主干 main
> 分支：`feat/0073-iter`（领先主干 2 提交：`3f86196` 产品提交 fix(smoke) +
> `036649b` 机制件提交 docs(evolution)；合并基 = 合并时主干 HEAD `823a4a2`，
> `git merge-base main feat/0073-iter` 亲核 = 主干 HEAD，主干零分叉）

## 0. 结论：**合并成功 · 零冲突 · 主干复测四项全绿**

BK-0018 重试轮交付物按分支申报并入主干：跨 run 记忆工具组产品面
（`apps/server/src/memory/store.ts` 115 行 + `memory/tools.ts` 82 行，自 0068 留档
d5ddb27 带入并 rebase 于主干现版）+ config/llm/server/.env.example 纯 memory 增量
（+6/+9/+5/+1）+ tools.ts TOOL_SPECS 三行 + 冒烟 MEM 套件断言面（MEM01-07 整块）
+ BUG-0068-06 八处 wfMem 标记词补尾冒号（smoke 测试内，memTokOf 正则零改动）+
ADR-0024 + 0073 迭代产物（PRD/JOURNAL/REPORT，REPORT 结论 **PASS**）。
本轮非重录轮，全程零 `gate:update`、零 golden 接触。

## 1. 合并执行

- 前置确认：`git status` 输出 nothing to commit, working tree clean（主干工作区干净）；
  `git merge-base main feat/0073-iter` = `823a4a2` = 合并时 `git rev-parse main`，
  主干在分支开工后零推进，git 冲突在结构上不可能产生（实际亦零冲突）。
- 合并锁核对：`.zcode/locks/merge.lock` 存在（`{"pid":38244,"at":"2026-10-30T23:13:35.681Z"}`），
  `tasklist /FI "PID eq 38244"` 查无此进程——锁系陈旧残留，无存活的并行合并者在途
  （与派发上下文 R5 escalate 裁决「ListWorkflowRuns 全账本仅本运行、无并行在途路」
  一致），本次合并串行性成立，未重建锁文件。
- 命令：`git merge --no-ff feat/0073-iter -m "<派发指令合并信息逐字>"` → exit 0，
  ort 策略自动合并干净完成。
- 合并提交：**`92c844f`**（父提交 `823a4a2` + `036649b`，`git log --format='%h parents:%p' -1` 亲核）。
- 改动面（`git diff 823a4a2..feat/0073-iter --stat` 实查）：13 文件 +1103/−13——
  `apps/server/.env.example`(+1) · `src/config.ts`(+6) · `src/llm.ts`(+9) ·
  `src/memory/store.ts`(新 115) · `src/memory/tools.ts`(新 82) · `src/server.ts`(+5) ·
  `src/tools.ts`(+5) · `docs/adr/0024-memory-tools-crossrun.md`(+16) ·
  `iterations/0073/{JOURNAL,PRD,REPORT}.md`（114/279/167 行全新）·
  `tests/smoke/mcp-stubs.mjs`(+19) · `tests/smoke/smoke-server.mjs`(+298)。

## 2. 冲突清单与处理方式

**冲突文件：无（空数组）。** 全程无 `<<<<<<<`/`=======`/`>>>>>>>` 冲突标记产生
（合并后对 apps/ packages/ tools/ tests/ docs/evolution/iterations/0073/ 逐域 grep
零命中亲核）。逐文件分类核对如下：

- **三账本（STATE.md / BACKLOG.md / metrics.md）**：`git diff 823a4a2..feat/0073-iter
  --name-only -- docs/evolution/STATE.md docs/evolution/BACKLOG.md docs/evolution/metrics.md`
  输出为空——分支未携带任何账本文件，主干侧零触碰（亲核）。按 WORKFLOW §3.1 记账位置，
  **终态记账（BK-0018 终态 / metrics 行 / STATE 复位 idle·iteration+1）全部归 CLOSE**，
  本阶段不代行。无同 ID 状态竞争，「语义更靠后」规则本轮无适用对象。
- **产品代码冲突**：零。`apps/` 下 7 文件均为分支单向新增/追加（主干无并发改动），
  无需亦未做任何择一裁决。
- **`docs/evolution/iterations/0073/`**：主干此前无该目录（合并前 ls 亲核），
  PRD/JOURNAL/REPORT 三件全新并入，按目录号隔离零冲突。
- **tests/**：`smoke-server.mjs` +298、`mcp-stubs.mjs` +19，主干无并发改动，零冲突。

**内容完整性自检**：冲突标记零残留（上）+ 合并后 13 文件 stat 与分支 diff stat 逐项
一致 + `git status` 干净，逐项通过。

## 3. 主干端到端复测（逐项实跑，真实退出码，均在合并提交 92c844f 上）

| # | 命令 | 退出码 | 关键输出 | 证据 |
| --- | --- | --- | --- | --- |
| 1 | `npm run build` | **0** | shared+web 构建成功，`dist/index.html` 723.72 kB，✓ built in 1.91s | `evidence/build.log` |
| 2 | `npm run gate` | **0** | **21/21 场景首跑全 pass，diffPx 全 0**（含 s3-library=0），「宪法门禁：通过 ✓」——**首跑即绿，未触发 issue#12 复跑例外**，零 `gate:update` | `evidence/gate.log` |
| 3 | `npm test` | **0** | `tests 30 / pass 30 / fail 0`（契约测试，DEFS 零漂移） | `evidence/test.log` |
| 4 | `npm run smoke:server` | **0** | `==== smoke:server：203 passed / 0 failed ====`（日志 PASS 行 grep 恰 203、FAIL 行恰 0，双口径一致；C01-C04 清理零残留） | `evidence/smoke.log` |

任一项红即失败的红线未触发；未放宽任何门禁、未重录 golden。

**冒烟断言面构成核对（对照 0072 主干证据 smoke.log 逐行差集）**：

- **MEM01-07：本轮主干净新增 7 条**，各恰 1 条 PASS（0072 日志零 MEM 行）——
  跨 run 记忆组首次在主干套件内取得执行证据（MEM02 工具注入面 / MEM03 跨 run
  持久化 + SQLite 直查对账 / MEM04 list 分页语义 / MEM05 负例不崩 / MEM06
  capabilities 逐字节不变 / MEM07 zod fail-fast exit 1）。
- **Z01-04：主干既有断言**（0072 证据日志已在案），本轮带 memory 工具在场的全套件
  复跑下逐条 PASS——提交信息「Z01-04 首次取得套件内执行证据」系分支谱系内口径
  （0068 两轮 fail-fast 掩盖），非主干新增，特此如实澄清。
- **M02 就地重写**：「TOOL_SPECS 键集恰为冻结 12 键 且 IMPL 键集恰为 5」→
  「点前缀键集恰为冻结 12 键 且 plain key …」（memory 三 plain key 进 plain 面），
  计数中性。
- 净计数 196→203（+7）= MEM01-07 七条，逐项对账闭合。

## 4. 图像证据（脚本采集）

`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0073/evidence`
→ exit 0，4 张确定性截图（1600×900，渲染节点 35/张）+ `manifest.json`（含逐张
sha256 与字节数）。四张字节数与 0072 轮证据逐张同值（92168 / 109109 / 107251 /
132182 B）——本轮零前端改动、零渲染变化的旁证：

- `01-initial.png`（92,168 B）· `02-node-selected.png`（109,109 B）·
  `03-settings.png`（107,251 B）· `04-library.png`（132,182 B）

## 5. 证据目录

`docs/evolution/iterations/0073/evidence/`：
`build.log` · `gate.log` · `test.log` · `smoke.log` · `01-initial.png` ·
`02-node-selected.png` · `03-settings.png` · `04-library.png` · `manifest.json`

## 6. 移交 CLOSE

1. **BK-0018 终态记账**：主干复测四项全绿 + REPORT PASS（AC-R1~R6 全过、0 新增
   BUG、0 修复轮），BK-0018 具备记 done 条件，终态归 CLOSE 裁定并回执来源 issue
   （如有）。
2. **metrics 行 / STATE 复位**：本轮 metrics 追加与 STATE（phase=idle /
   iteration+1 / last_result 含本文件指针）归 CLOSE 在合并锁内统一完成。
3. **分支与工作树清理**：`feat/0073-iter` 与其工作树保留，清理归 CLOSE
   （WORKFLOW §4 CLOSE 契约）。
4. **JOURNAL §2-2 偏差声明并入档**：BUG-0068-06 实施与 REPORT §6-3 方案文本的
   一处偏差（mem02/mem05 负键两处标记补全为域前缀+尾冒号，语义中性有据）已在
   JOURNAL 如实记录，CLOSE 记账时可引。
5. **Mimosa 提交钩子告知（非本轮引入）**：合并提交与证据提交过钩子时，Mimosa 报告
   存量 high 项两条——`apps/server/src/workbench/routes.ts:21`（collectGitInfo 1 跳达
   command-injection）、`apps/server/src/workbench/routes.ts:76`（collectTree 为
   path-traversal 入口）；钩子明示「低危/提示不阻断」，两处均为本轮零触碰的存量产品
   代码（与 0072 MERGE §6-3 同源），如实上报，是否立项归侦察/PM 裁决。
6. 提交均经 Mimosa 预提交钩子放行，无阻断。
