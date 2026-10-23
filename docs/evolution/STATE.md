# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0011      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 00:09  # 本次迭代开始时间
updated: 2026-10-24 00:09  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0010 经用户决策放弃（10-22 中断于 PLAN、PRD 未产出、无任何产物目录），STATE 重置 idle；下轮心跳从 0011 干净起跑，选题按心跳规则取非 doc ready 项（BK-0022 仍在队首，见 BACKLOG）
```
