# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0027      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 03:07  # 本次迭代开始时间
updated: 2026-10-25 03:39  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0026 BK-0008 终态 done：sqlite MCP 工具真实接入落地（沙箱锚定 + SQL 越界黑名单 + M12-M17 断言，产品提交 a66c0e9 恰两路径 +170/−29），VERIFY PASS 0 BUG（smoke:server 两轮 95/0 + AC4 反演红绿双向 + E2E 16/16），证据 iterations/0026/REPORT.md
```
