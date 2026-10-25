# MERGE · 迭代 0033 · BK-0036 呈现三件套·网页展示节点（webshow）

> 产出角色：merge-arbiter（MERGE 阶段）· 2026-10-25 21:08~21:10（主干 `main`）。
> 输入：分支 `feat/0033-iter`（bf25202 产品提交 + cc8a862 机制件提交）。

## 结论

**合并成功，零冲突；主干端到端复测四项全绿；证据已留档。**

## 1. 合并执行

- 合并前 `git status`：主干工作区干净（`nothing to commit, working tree clean`）。
- 合并排他锁：`.zcode/locks/merge.lock` 原持锁进程 pid=17992 已消亡（`tasklist`
  确认无此进程，判定为陈旧锁），删除后经 `node .zcode/tools/wt.mjs lock` 原子重建获取。
- 命令：`git merge --no-ff feat/0033-iter`（'ort' 策略，无冲突自动完成）。
- **合并提交：`2b761168032a77cd75be4e4fc42788ea7ec1a048`**。
- 合并内容：25 文件，+1667/−34（`apps/server/src/handlers.ts`、`apps/web/src/app.css`、
  `apps/web/src/legacy/app.js`、`packages/shared/src/nodes*`（含新增
  `src/nodes/webshow/{node.ts,README.md}`）、`packages/shared/test/*` 7 文件、
  `tests/golden/ui/s10-webshow-node.{png,invariants.json}`（**新增场景**，非既有基线
  重录）、`tests/smoke/smoke-server.mjs`、`tools/pixel-gate/gate.mjs`、`tools/gen-node-readmes.mjs`、
  `docs/adr/0015-presentation-triplet-nodes.md`、`docs/evolution/iterations/0033/{PRD,SPEC,JOURNAL,REPORT}.md`、
  `docs/evolution/BACKLOG.md`）。
- 完整性自检：`git diff feat/0033-iter HEAD` 仅剩主干独有提交 682ff29 的
  `.zcode/workflows/evolution-iteration.dwf.ts`（主干侧内容，预期保留）；分支侧全部
  文件逐字节并入；冲突标记零残留（合并过程未检出任何冲突文件）。

## 2. 冲突清单与处理方式

**conflicts = []（零冲突）。**
merge-base = `84ee8ec`；merge-base 之后主干唯一新提交 `682ff29` 仅改
`.zcode/workflows/evolution-iteration.dwf.ts`（分支未触碰），与分支 25 文件改动集
不相交，故无任何冲突检出，无需分类仲裁。分支对 `docs/evolution/BACKLOG.md` 的
BK-0050（proposed→ready 晋升备注）主干侧无并行改动，随合并原样并入。

## 3. 主干端到端复测（全部实跑，日志见 evidence/）

| # | 检查 | 命令 | 结果 |
| --- | --- | --- | --- |
| 1 | 构建 | `npm run build` | **绿**，exit 0（vite 67 modules，dist/index.html 352.88 kB） |
| 2 | 宪法门禁 | `npm run gate` | **绿**，exit 0——**11 场景全 pass 且 diffPx=0**，含本轮新增 `s10-webshow-node`（`✓ s10-webshow-node pass · diffPx=0`） |
| 3 | 契约测试 | `npm test` | **绿**，exit 0——30/30 pass / 0 fail |
| 4 | 后端冒烟 | `npm run smoke:server` | **绿**，exit 0——**113 passed / 0 failed**，含本轮新增 webshow O 组 O01~O05 全 PASS（smoke.log:80-84；O05=30 条事件全过 RunEventSchema） |

- 本轮为「非修宪重录轮」：全程**未执行** `npm run gate:update`，未放宽任何门禁；
  s10 为新增场景文件随分支并入，既有 s0~s9 golden 零触碰、零差异。
- 门禁以本机实跑为准；golden 权威在 CI（windows-latest），推送后 `ui-constitution`
  为 required check（由 CLOSE/推送流程盯守）。

## 4. 证据路径（docs/evolution/iterations/0033/evidence/）

| 文件 | 内容 |
| --- | --- |
| `build.log` | npm run build 全输出 + `BUILD_EXIT=0` |
| `gate.log` | npm run gate 全输出（11 场景 diffPx=0）+ `GATE_EXIT=0` |
| `test.log` | npm test 全输出（30 pass）+ `TEST_EXIT=0` |
| `smoke.log` | npm run smoke:server 全输出（113/0，含 O01~O05）+ `SMOKE_EXIT=0` |
| `01-initial.png` ~ `04-library.png` | 4 张确定性截图（`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0033/evidence` 产出，渲染节点 19） |
| `manifest.json` | 图像证据清单（viewport 1600×900、逐图 sha256） |

## 5. 后续（移交 CLOSE）

- 主干侧最终记账（STATE / BACKLOG / metrics、issue 回执）与 evidence + MERGE.md 的
  归档提交由 CLOSE 阶段（协调者，合并锁内）完成；本文件与 evidence/ 当前为工作区
  未提交产物，属预期。
- 分支 `feat/0033-iter` 与工作树 `.zcode/worktree/feat/0033-iter/` 留待 CLOSE 清理。
- 合并排他锁已释放（复测与证据留档完成即止，记账锁由 CLOSE 重新获取）。
