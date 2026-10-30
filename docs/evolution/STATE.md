# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0074      # 当前/下一个迭代号（CLOSE 时 +1）
phase: PLAN      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: BK-0064       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-31 07:33  # 本次迭代开始时间
updated: 2026-10-31 07:44  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0074 已开工（工作树 feat/0074-iter）
```
