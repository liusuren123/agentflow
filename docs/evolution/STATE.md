# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0061      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: BK-0045       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 10:57  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0061（BK-0045）终态 failed：；全部成果已留档在分支 feat/0061-iter 与工作树（绝不销毁），未并入主干，待下轮续用或人工处置
```
