# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0014      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 03:30  # 本次迭代开始时间
updated: 2026-10-24 04:26  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0013（BK-9001）终态 done（修宪轮）：底部日志面板按级别过滤 chips 全部/sys/info/warn/ok + gate s6/s7 新场景与基线落地——产品三文件纯插入零删改（Skeleton +7 / app.css +11 / app.js +7）+ ADR-0010（issue#1 批复 2026-10-23T15:50:05Z）+ gate.mjs +57 + s6/s7 基线 4 文件 golden-created 通道（未用 gate:update），产品提交 9bcb3bd（+375/−0 + 2 PNG，git show --numstat 实查）；首轮 VERIFY FAIL（BUG-0026 Major：s6/s7 minimap 视口矩形过渡相位固化致间歇像素抖动）经修复轮 1 关闭——产品代码零改动（app.js hash c55b2dd0 前后一致），gate.mjs logPanelAfter 点击 #rail-bp 前置内联 transition:'none' + 基线重录；复验 PASS 零未决 BUG（gate 连续 6 轮 8/8 diffPx=0 含反演重做 + canvas 确定性探针 ×10 单一哈希，证据 docs/evolution/iterations/0013/REPORT.md §七）；AC8 CI 盯守未到时点（沿 0012 先例不判过不判挂），推送后盯 ui-constitution 8 场景与 issue#1 回执关单由脚本执行；BACKLOG 置 done、metrics 已追加；ready 队列余 9 项（修宪 BK-9002~9005 均 L 先拆分再实现、非修宪 BK-0022/0016/0017/0011/0008），下次心跳按 §4 优先序选题
```
