# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0024      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 00:43  # 本次迭代开始时间
updated: 2026-10-25 01:15  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0023 / BK-0028 CLOSE=done（VERIFY PASS 零 BUG：smoke:mcp 亲跑 12/0 + smoke:server 亲跑 89/0，产品提交 b560334 恰 SPEC §6 白名单 8 路径 +694/−0、禁区 diff 恒空；BK-0029/0030 前置就此满足、issue#10 授权继续覆盖（gh 亲核 OPEN））——iterations/0023/REPORT.md
```
