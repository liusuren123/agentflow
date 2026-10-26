# 迭代 0045 合并复测报告（MERGE）

> 合并仲裁员产出 · 2026-10-26。主题：BK-0054 契约测试同族字面残留清理
> （synthesis「16 键/16 节点」→17、defs-drift「18 种」→20、期望表 termview 重复键去重）。

## 1. 合并结果

- 主干合并前状态：`git status --porcelain` 空（工作区干净），分支 `main` @ `ea93ff3`。
- 特性分支：`feat/0045-iter`（产品提交 `e832579` + 机制件提交 `a7b4cd4`），
  merge-base = `ea93ff3` = 主干 HEAD（主干自分支分出后无新提交）。
- 合并命令：`git merge --no-ff feat/0045-iter`。
- 合并提交：**`a1ef739`**（`merge(evolution): 合并迭代 0045 BK-0054 契约测试同族字面残留
  清理：synthesis「16 键/16 节点」→17、defs-drift「18 种」→20、期望表 termview 重复键去重`）。
- 改动面（`git diff ea93ff3 a1ef739 --stat`）：6 文件 +325/−4，与分支侧 diff 完全一致——
  `packages/shared/test/defs-drift.test.mjs`（+2/−1：termview 重复键去重、「18 种」→「20 种」）、
  `packages/shared/test/synthesis.test.mjs`（+2/−2：「16 键」→「17 键」、「16 节点」→「17 节点」）、
  `docs/evolution/BACKLOG.md`（+1：BK-0054 行）、`iterations/0045/{PRD,JOURNAL,REPORT}.md` 新增。

## 2. 冲突清单与处理方式

**零冲突**。主干在 merge-base 之后无提交，git 'ort' 策略自动合并全部 6 文件。
合并后自检：

- 冲突标记（`<<<<<<<`/`=======`/`>>>>>>>`）于全部合并文件 grep 零命中；
- 主干原内容零丢失（合并 diff 与分支 diff 逐文件一致）；
- 关键内容亲核：synthesis.test.mjs 两处字面量已为 17（:15 测试名、:24 断言消息）、
  defs-drift.test.mjs 中 `termview` 仅出现 1 次（重复键已去重）、BACKLOG.md 含 BK-0054 行。

## 3. 主干端到端复测（四项实跑）

| 项 | 命令 | 结果 | 退出码 | 关键输出 |
| --- | --- | --- | --- | --- |
| build | `npm run build` | ✅ 绿 | 0 | shared + web 构建，dist/index.html 362.51 kB（gzip 109.69 kB），built in 713ms |
| gate | `npm run gate` | ✅ 绿（终跑） | 0 | 16 场景 diffPx=0，「宪法门禁：通过 ✓」；首跑与二跑 s3-library diffPx=21，见 §3.1 |
| test | `npm test` | ✅ 绿 | 0 | 30/30 pass · 0 fail（含本轮更名后「其余 17 键无 caps 键」「20 键全量」等断言） |
| smoke | `npm run smoke:server` | ✅ 绿 | 0 | 133 passed / 0 failed（C01~C04 清理与零残留复查全过） |

### 3.1 gate 首跑红定性（本机采样抖动，非本轮所致）

首跑与复跑均仅 `s3-library` FAIL diffPx=21（其余 15 场景三次采样全部 diffPx=0），第三次
采样 s3-library pass · diffPx=0，门禁整体通过 exit 0。三次采样序列 21/21/0，与 0037
MERGE §4.1 归档的「五次采样 0/23/0/21/0」同场景波动形态一致。定性依据（四路亲核）：

1. **渲染路径零改动**：`git diff ea93ff3 a1ef739 -- apps/ packages/shared/src/
   tools/pixel-gate/ tests/golden/` 为 0 文件——本轮唯一产品改动是两个测试文件的
   字符串字面量，不进 web 构建产物；
2. **15/16 场景零差异**：排除全局性致变（CSS/字体/结构级变化会波及多场景）；
3. **DOM 不变量全等**：`tests/golden/diff/s3-library.invariants.json` 与 golden
   `tests/golden/ui/s3-library.invariants.json` 逐键比对 ALL-INVARIANTS-EQUAL（结构层零漂移）；
4. **差异坐标与先例同位**：解析 diff.png 差异像素（红/黄标记）51 个，全部位于
   x=23–30 / y=792–889，即 0041 BACKLOG 备注归档的「左侧图标工具栏下缘
   x≈15-30/y≈790-880」抗锯齿抖动区（0039 记录 x≈20/y≈780-890；本轮 diffPx=21 与
   0037 采样序列中的 21 完全同值同位）。

处置沿 0040/0041 已归档先例：首跑红原始日志双留档（`gate-first-run.log` 保留，终绿
覆盖 `gate.log`），**未运行 `gate:update`**（本轮非重录轮），未放宽门禁；golden 权威
在 CI（宪法第 2 条），本机差异仅作参考。

## 4. 证据清单（`docs/evolution/iterations/0045/evidence/`）

| 文件 | 内容 |
| --- | --- |
| `build.log` | npm run build 全输出（exit 0） |
| `gate-first-run.log` | gate 首跑原始红记录（s3-library diffPx=21） |
| `gate.log` | gate 终跑绿记录（16 场景 diffPx=0，通过） |
| `test.log` | npm test 全输出（30/30，exit 0） |
| `smoke.log` | npm run smoke:server 全输出（133/0，exit 0） |
| `01-initial.png` ~ `04-library.png` | wt.mjs evidence 采集的 4 张确定性截图（渲染节点 19） |
| `manifest.json` | 截图清单（脚本生成） |

采集命令：`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0045/evidence`（exit 0）。

## 5. 结论

迭代 0045（BK-0054）已成功并回主干（合并提交 `a1ef739`，零冲突），主干端到端复测
四项全绿（build ✓ / gate ✓ / test 30/30 / smoke 133/0），证据齐全。合并仲裁阶段无
阻塞事项，可进入 CLOSE 记账。
