# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0026      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 02:04  # 本次迭代开始时间
updated: 2026-10-25 03:01  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0025 BK-0030 终态 done：CLOSE 归档完成——产品提交 dded158（+565/−8 恰 SPEC §6 白名单 8 路径，`git show --numstat` CLOSE 亲核）+ VERIFY PASS 0 BUG（AC1-AC7 全过，证据 iterations/0025/REPORT.md），BACKLOG 置 done、metrics 已记行，BK-0013 拆分三子项全部收官（issue#10 关单回执由脚本执行）
```
