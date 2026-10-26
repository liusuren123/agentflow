# 迭代 0052 · MERGE — BK-0058 gate.mjs 头注场景数同步 6→16（主干合并与复测）

> MERGE 轮产物（WORKFLOW.md §4 MERGE 契约）。merge-arbiter 产出。
> 合并环境：主干 `main`（仓库根），Windows / Git Bash；时间 2026-10-26 15:20–15:26。
> 全部命令在主干实跑，退出码逐项如实记录。

## 1. 合并结果

- 合并方式：`git merge --no-ff feat/0052-iter`，**合并提交 `70d4ab6`**。
- 合并提交信息：`merge(evolution): 合并迭代 0052 gate.mjs 头注场景数同步：「6 个 golden 场景」→ 实况 16 场景（issue#13 批复解阻，纯注释级，非修宪轮）`。
- **冲突清单：空（零冲突）**。merge-base = `f981a45`（主干 HEAD），主干自基点零改动，
  分支 2 提交（`3a323f1` 产品 + `f0dc092` 机制件归档）线性并入，ort 策略自动合并，
  无任何冲突标记产生，无 ours/theirs 裁决发生。
- 并入文件（`git diff --stat` 合并前后核对，5 路径 +485/−4）：
  - `tools/pixel-gate/gate.mjs`（+5/−3，全部位于文件头 `/* … */` 注释区 ：4-8，
    亲核 diff 逐行：仅场景计数「6→16」与在线态枚举行对齐 SCENARIOS 实况
    （s4/s5/s9/s15 在线、s6~s8·s10~s14 离线扩展、s4/s5 时区钉 UTC），零行为变化）
  - `docs/evolution/BACKLOG.md`（BK-0058 行 `pending-approval → ready` + 批复备注）
  - `docs/evolution/iterations/0052/{PRD,JOURNAL,REPORT}.md`（新增，迭代产物）
- 产品代码冲突高危检查：`apps/`、`packages/`、`tests/` 零触碰（分支 diff 恒空）；
  `tools/pixel-gate/gate.mjs` 属 POLICY 需批准区，授权链 = issue #13 用户批复
  （PRD §0 / REPORT §0 在案），非仲裁员自主放行。

## 2. 冲突解决方式

无冲突，无需分类解决。自检（职责定义硬性项）：合并后 `git status` clean、
全仓 `grep -c '^<<<<<<<'` 于并入文件 = 0（无冲突标记产生即无残留）；
BACKLOG.md 仅 BK-0058 单行变更，其余行（BK-0055/0056/0057/0059 等）逐行在位，
零丢行。

## 3. 主干端到端复测（四项实跑，退出码如实）

| 项 | 命令 | 退出码 | 结果 | 关键输出 |
| --- | --- | --- | --- | --- |
| 构建 | `npm run build` | **0** | ✓ | vite 69 modules transformed，dist/index.html 362.51 kB，built in 1.73s |
| 宪法门禁 | `npm run gate` | **0**（复跑） | ✓ | 16/16 场景全 pass diffPx=0（s0~s15），「宪法门禁：通过 ✓」 |
| 契约测试 | `npm test` | **0** | ✓ | tests 30 / pass 30 / fail 0 |
| 后端冒烟 | `npm run smoke:server` | **0** | ✓ | 133 passed / 0 failed（含 C01~C04 清理零残留） |

### 3.1 gate 首跑 s3 本机采样抖动（如实双留档）

首跑（`evidence/gate-first-run.log`）：15/16 pass，s3-library `diffPx=23`，exit 1。
签名核对：diffPx 恰 23 像素，与在案本机抖动形态**逐数值一致**（迭代 0037~0041、
0047 主干复测首跑、0050 工作树两跑均为 diffPx=23；0050 JOURNAL §9 定位 =
左栏 rail-group 底部三个内联 SVG 图标抗锯齿灰阶 ±2~6 微扰，DOM 不变量恒等）。
本轮 `tests/golden/diff/s3-library.invariants.json` 亲读：view/nodes/cssVars 全量
在案、无结构差异。处置沿 0047 主干复测先例：不重录、不放宽，复跑一次 →
16/16 全 pass diffPx=0（`evidence/gate.log`）。宪法第 2 条：golden 权威在 CI
（ui-constitution required check），本地差异仅参考；推送后由 CLOSE/CI 盯守。
**全程零 `gate:update`、golden 零接触**（本轮非重录轮，`git status` tests/ 恒净）。

## 4. 证据留档

`docs/evolution/iterations/0052/evidence/`（本目录）：

- `build.log` / `gate.log` / `test.log` / `smoke.log` — 四项复测完整日志
- `gate-first-run.log` — gate 首跑 s3 抖动红记录（§3.1，双留档之一）
- `evidence-capture.log` — 图像采集过程（4 张全成，渲染节点 19）
- `01-initial.png`(76884B) / `02-node-selected.png`(91689B) /
  `03-settings.png`(94615B) / `04-library.png`(119528B) — 确定性截图，
  `node .zcode/tools/wt.mjs evidence apps/web/dist <本目录>` 采集，exit 0
- `manifest.json` — 4 场景 sha256 与 renderedNodes=19 逐张登记

## 5. 结论

合并零冲突完成（`70d4ab6`），主干复测四项全绿（gate 复跑形态与 0047 先例一致并
双留档）。VERIFY 报告 PASS（5/5，缺陷清单空，REPORT.md §0~§5）。本轮纯注释级、
golden 零接触，不触宪法第 3 条重录通道。可进入 CLOSE 最终记账。
