# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0025      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 01:22  # 本次迭代开始时间
updated: 2026-10-25 01:59  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0024 / BK-0029 CLOSE=done（VERIFY PASS 零 BUG：smoke:mcp:registry 亲跑 11/0 + smoke:mcp 12/0，产品提交 82f5b56 恰 SPEC §6 白名单 4 路径 +540/−0、禁区 diff 恒空；BK-0030 前置就此满足、issue#10 授权继续覆盖不关单）——iterations/0024/REPORT.md
```
