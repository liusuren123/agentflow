# 迭代 0055 · MERGE — 合并仲裁记录（BK-0044 PTY 会话后端运行时）

> 产物角色：merge-arbiter · 2026-10-27 · 主干 main · 消费方：CLOSE 记账
> 输入：feat/0055-iter（b9f919d）· 迭代目录 docs/evolution/iterations/0055/
> 本轮重录轮：**否**（未动 gate:update，golden 零改动）

## 1. 合并结果

| 项 | 值 |
| --- | --- |
| 合并方式 | `git merge --no-ff feat/0055-iter`（主干工作区干净：`nothing to commit, working tree clean`） |
| 分叉状态 | 主干与分支**零分叉**（merge-base 55b78dc = 主干 HEAD），合并纯快进载荷 |
| 合并提交 | **`edbfc27`** `merge(evolution): 合并迭代 0055 PTY 会话后端运行时：pty 模块 + /api/v1/pty 端点族（五端点）+ pty_audits 审计 + 三闸门生命周期约束落地` |
| 冲突文件 | **无**（STATE.md / metrics.md / BACKLOG.md 本轮分支侧未提交改动，未进冲突面；BACKLOG.md 仅分支侧单边改 BK-0044，自动合并） |

## 2. 重大发现：分支提交遗漏 pty 四文件（已补救，`7908a5b`）

**事实链**（逐条可复核）：

1. `git diff --stat main...feat/0055-iter` 的 12 个文件中**不含 `apps/server/src/pty/`**；
   `git ls-tree -r feat/0055-iter` 证实分支树无该目录——BUILD 提交 `805a0c9` 时
   **漏 `git add` 新目录**（其提交信息却声称「pty 四文件模块」）。
2. 已合并进主干的 `apps/server/src/server.ts:60-62` import `./pty/routes.js`、
   `./pty/audit.js`、`./pty/session.js`——若不补救，主干 `npm run build` 必红。
3. VERIFY 报告（REPORT §1 V3）如实记录该目录当时为 untracked；工作树
   `.zcode/worktree/feat/0055-iter/` 中四文件仍在且为 untracked（即 57/0
   smoke:pty 实测所依据的同一批文件）。
4. 补救：经 Write 通道逐文件补录（Mimosa 钩子要求，Bash cp 被拦截），
   `cmp` 逐文件核对与工作树**字节一致**；行数 session 304 / routes 97 /
   audit 100 / danger 23，与 REPORT §1 V4 逐项相符。**零内容改动**。
5. 补录提交：**`7908a5b`** `fix(server): 补录迭代 0055 分支遗漏提交的 pty 四文件模块`。

**Mimosa 判定留痕**：
- Write 通道对 `audit.ts:44` 报「命令注入·高危」。核验：该行为
  `db.exec(\`CREATE TABLE IF NOT EXISTS pty_audits(...)\`)`——纯静态 DDL
  字面量，无插值、无用户输入；better-sqlite3 `exec()` 仅执行本地 SQLite
  SQL，不触系统 shell。判**误报**，选「保持原写法」（文件为 VERIFY 实测
  产物逐字节副本，改写即偏离已验证产物且越出仲裁员边界）。
- 补录提交的 pre-commit 扫描报**既有代码**（非本轮引入，0055 diff 不含
  workbench）：`apps/server/src/workbench/routes.ts:19` collectGitInfo 经
  1 跳到达 command-injection（high）。按钩子要求**明确告知用户**：该风险
  属既有 workbench 代码，建议后续迭代立项审查。

**未并入项**：工作树内另有一处未提交改动 `docs/evolution/STATE.md`
（10 行），属 CLOSE 阶段记账事务，不在合并职责内，留待 CLOSE 在主干处理。

## 3. 主干复测（全部本会话实跑，日志在 evidence/）

前置：`npm install`（exit 0，新增 node-pty@1.1.0 + node-addon-api 2 包，
原生模块编译成功——allowScripts 已由本轮 package.json 授权）。

| # | 命令 | 退出码 | 结果 | 日志 |
| --- | --- | --- | --- | --- |
| R1 | `npm run build` | **0** | shared + web 构建成功（vite ✓ built in 709ms） | evidence/build.log（31 行） |
| R2 | `npm run gate` | **0** | **首跑全绿**：18/18 场景 pass，diffPx 全 0，DOM 不变量过，「宪法门禁：通过 ✓」。未触发 issue #12 抖动口径（无需复跑双留档），未重录 golden | evidence/gate.log（24 行） |
| R3 | `npm test` | **0** | 契约测试 **30/30**（pass 30 · fail 0） | evidence/test.log（62 行） |
| R4 | `npm run smoke:server` | **0** | 后端 E2E **145/0 零回退**（C01~C04 收尾断言全绿；145 基线与 REPORT §1 V2 一致；server 启动即 import pty 模块 → 主干 node-pty 原生绑定可加载得证） | evidence/smoke.log（150 行） |

## 4. 证据清单（docs/evolution/iterations/0055/evidence/）

- `build.log` / `gate.log` / `test.log` / `smoke.log` — 复测四项完整输出
- `01-initial.png`（76884B，渲染节点 19）/ `02-node-selected.png`（91689B）/
  `03-settings.png`（94615B）/ `04-library.png`（119528B）—
  `node .zcode/tools/wt.mjs evidence apps/web/dist …` 采集的确定性截图
- `manifest.json` — 截图清单（viewport 1600×900）

## 5. 结论

迭代 0055 成果已完整落主干（`edbfc27` + 补录 `7908a5b`），合并零冲突、
零 golden 改动；复测四项全绿（build ✓ / gate ✓ 18 场景 0 像素差 /
test 30/30 / smoke 145/0）。分支侧遗漏提交已如实补救并留痕；既有
workbench 高危项与 Mimosa 误报判定均已披露。可进入 CLOSE 记账。
