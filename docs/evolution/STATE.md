# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0023      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）——BK-0021 跨迭代批次续填链已于迭代 0022 终轮收口（done 与 `-` 同置，iterations/0021/PRD.md:215/REPORT.md §六② 编排兑现）
started: 2026-10-24 23:36  # 本次迭代开始时间
updated: 2026-10-25 00:31  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0022 / BK-0021 批次 2 终轮 CLOSE=done（VERIFY PASS 零 BUG，产品提交 c17866f 恰 30 路径 +990/−56 白名单零越界、不变式 A 终态 sha256 08ba1229…f275/11521B、shared 30/30、在线五点位 5/5；BK-0023 随批关账 done、T5-M3 修宪链解阻、STATE.item 置 `-` 收口；issue#11 实况 OPEN，标准关单+🤖 回执留脚本执行）——iterations/0022/REPORT.md
```
