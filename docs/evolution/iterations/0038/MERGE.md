# MERGE · 迭代 0038 · BK-0046 approval 审批人节点选择器 + BUG-0012 前端联动（修宪轮）

> 产出角色：merge-arbiter（MERGE 轮）。
> 合并日期：2026-10-26。
> 分支：`feat/0038-iter`（基点 915e131，主干在其后经历 0035 补提交/合并与 0037 合并）。
> 授权链：ADR-0017（issue#6 批复承继，BK-9006 短修宪穿插项）。

## 1. 合并结果

- 合并提交：**7d8df55**（`merge(evolution): 合并迭代 0038 BK-0046 approval 审批人节点选择器 + BUG-0012 前端联动（BK-9006 短修宪穿插项，修宪轮）`，--no-ff）。
- 合并前主干工作区干净（`git status`：nothing to commit, working tree clean）。
- 自动合并成功：`apps/web/src/app.css`、`apps/web/src/legacy/app.js`、`docs/evolution/BACKLOG.md`、`tests/smoke/smoke-server.mjs`。
- 后续合流收口提交：**17d2128**（见 §3.2）。
- 提交钩子备注：Mimosa 两次提交均按兼容策略放行（完整扫描结论未得出：library_source/callgraph 部分超限），如实记录，不据此宣称项目安全。

## 2. 冲突清单与解决方式（1 个文件、2 处区域）

唯一冲突：`tools/pixel-gate/gate.mjs`（`git merge --no-ff` 报 CONFLICT content）。
定性：**非语义冲突**——两处均为「两路在同一位置各自插入」且叠加「golden 场景号撞号」，
两侧内容互不相干（主干 0035 的 jsoncanvas 场景基建 vs 分支 0038 的 approval/code-lang
场景基建），不存在「同一处语义两路写了不同实现」，无「择一」问题。按
WORKFLOW.md §4 MERGE 段两类明文规则处理：

| # | 冲突区域 | ours（主干） | theirs（0038） | 解决方式 |
| --- | --- | --- | --- | --- |
| 1 | 场景基建区（约 L237-287） | `s12 JSON 画布节点场景基建`（JSONCANVAS_WF_SEED / jcRunClick / jcReady，迭代 0035） | `s12 审批人拾取器`（pickOpen/pickReady/pickInv）+ `s13 code lang 联动`（CODE_WF_SEED/codeLangJs/codeSwapped/codeInv）基建 | **两侧完整保留**拼接（主干 jsoncanvas 在前、0038 两块在后）；0038 侧注释场景号同步改 s13/s14 |
| 2 | SCENARIOS 注册表尾部（约 L309-317） | `{ id: 's12-jsoncanvas-node', … }` | `{ id: 's12-approval-role-picker', … }` + `{ id: 's13-code-lang-sync', … }` | **三条都保留**；0038 两条改号为 `s13-approval-role-picker` / `s14-code-lang-sync`，行内注明改号缘由 |

### 2.1 场景号撞号与时序裁决（改名非重录）

主干已落盘 `s12-jsoncanvas-node`（迭代 0035 先落盘），0038 分支自带
`s12-approval-role-picker` + `s13-code-lang-sync`。按 WORKFLOW §4「golden 场景号按
落盘时序裁决」先例（0033/0034 合流：webshow 保留 s10、termview 取 s11）：先落盘者
（jsoncanvas）保留 s12，后合并者（0038）顺延改号——**s12→s13、s13→s14**（保持分支内
相对顺序）。改动仅编号字面量与 golden 文件名，**像素内容零变化**，属改名非重录，
不触宪法第 3 条重录通道：

- `git mv`：`s12-approval-role-picker.{png,invariants.json}` → `s13-*`；
  `s13-code-lang-sync.{png,invariants.json}` → `s14-*`（PNG 字节未动）。
- `gate.mjs` 场景号字面量同步（基建注释 + SCENARIOS 两条 id）。
- 全仓 `grep s12-approval|s13-code` 于 tests/tools/apps/packages 零残留；
  两份 invariants.json 内部无场景 id 字段，改名零内容改动。

### 2.2 合并后自检（职责硬性约束，全部通过）

- 冲突标记（`<<<<<<<`/`=======`/`>>>>>>>`）残留计数 = **0**；
- `node --check tools/pixel-gate/gate.mjs` = **SYNTAX OK**；
- `git diff main -- tools/pixel-gate/gate.mjs` 删除行数 = **0**（主干侧内容零丢失，
  净变更为纯新增 0038 侧基建 + 改号注释）；
- SCENARIOS 共 **15 条**（s0~s14）完整、无重复号；
- 自动合并文件逐项核对两侧插入都在：`app.css` 主干 `--cat-agent` 保留 + 0038
  `.role-pick` 三处选择器净增 9 行；`app.js` 净增恰 +77/−0 且主干侧 jsoncanvas（7 处）
  与 catColor（5 处）都在；`smoke-server.mjs` 主干 J 组（17 处）与 0038 K04（2 处）都在；
- `BACKLOG.md`：不同 ID 两侧都保留——BK-0038 done（主干 0035 收官）、BK-0050 done
  （主干 0037 收官）、BK-0046 ready（分支 PLAN 轮晋升）；行数 124=两侧一致，零丢行。
- `STATE.md` / `metrics.md` 本轮未出现在分支侧改动，无冲突（最终记账归 CLOSE 轮）。

## 3. 主干端到端复测（实跑，退出码与关键输出）

| 项 | 命令 | 退出码 | 结果 | 关键输出 |
| --- | --- | --- | --- | --- |
| build | `npm run build` | **0** | ✅ | vite 69 modules · `dist/index.html 361.25 kB (gzip 109.28 kB)` · built in 707ms |
| gate | `npm run gate`（收口后） | **0** | ✅ | **15 场景全 pass · diffPx=0**（s0~s14，含 s12-jsoncanvas 与新 s13/s14）· `宪法门禁：通过 ✓` |
| test | `npm test` | **0** | ✅ | **30/30 pass · 0 fail**（契约测试；duration 549ms） |
| smoke | `npm run smoke:server` | **0** | ✅ | **126 passed / 0 failed**（主干 0035 侧 J 组基线 125 + 0038 K04 = 126；K04 源锁 PASS：app.js 与 handlers.ts 各恰 1 处「// 处理输入后返回」逐字一致） |

### 3.1 gate 首跑红（如实留档）

合并提交后 gate 首跑 exit 1：s13/s14 两场景**像素 diffPx=0 但 DOM 不变量不一致**
（s0~s12 全 pass）。逐字 diff 证实差异面**恰 1 行**：基线 cssVars 表缺
`"--cat-agent": "#14b8a6"`——分支基点（915e131）早于迭代 0037，新基线停留 7 类目
变量表，而合流后主干预载 0037 的 8 类目表。与 0037×0035 合流时 s12 收口（提交
40f9d06）完全同款。处置：基线 JSON **一行同步**（PNG 不动、未跑 `gate:update`、
像素零变化），收口提交 **17d2128**，复跑 15 场景全 pass。首跑输出重建留档于
`evidence/gate-first-run.log`（同 0037 双留档先例）。

### 3.2 收口提交

- 7d8df55：merge(evolution) 合并提交（含冲突解决与 golden 改名）。
- 17d2128：fix(golden) s13/s14 不变量同步 `--cat-agent`（2 文件各 +1 行，像素零变化）。

## 4. 证据留档（docs/evolution/iterations/0038/evidence/）

| 文件 | 内容 |
| --- | --- |
| `build.log` | npm run build 全输出（exit 0） |
| `gate-first-run.log` | 合并后 gate 首跑（exit 1，s13/s14 不变量红 + 仲裁注记） |
| `gate.log` | 收口后 gate 全绿（15 场景 pass · diffPx=0 · exit 0） |
| `test.log` | npm test（30/30 · exit 0） |
| `smoke.log` | smoke:server（126/0 · exit 0 · K04 PASS） |
| `01-initial.png` ~ `04-library.png` | `node .zcode/tools/wt.mjs evidence apps/web/dist …` 采集的 4 张确定性截图（均渲染节点 19） |
| `manifest.json` | 证据清单（脚本生成） |

## 5. 结论

合并成功（7d8df55 + 收口 17d2128），冲突 1 文件 2 处按契约分类解决（同位置各自
插入→两侧保留；场景号撞号→时序裁决改号 s12→s13/s13→s14，像素零变化），主干复测
四项全绿（build ✓ / gate 15 场景 ✓ / test 30/30 ✓ / smoke 126/0 ✓），证据与本文
留档于 `docs/evolution/iterations/0038/`。备注：迭代产物文档（PRD/SPEC/REPORT/
JOURNAL）中的 s12/s13 编号系分支内时点记录，主干实际编号以本文件 §2.1 为准；
CI `ui-constitution` 推送后以 windows-latest 为权威盯守。
