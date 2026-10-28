# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0064      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: BK-0019       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 15:07  # 最近更新时间
repair_round: 1     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0064（BK-0019）MERGE 收口：前态 failed 系过程性（产品提交 1562a8c 漏申报 kb/ 五模块，留档提交 59f3e31 补齐提交面，成果完整），经协调者授权由 merge-arbiter 合并 feat/0064-iter 入主干；VERIFY-2 复验 PASS 在案（iterations/0064/REPORT.md：BUG-0064-01 修复轮 1 闭环、污染态背靠背两轮 smoke 168/0 幂等、九项 AC 全绿）；主干端到端复测结论与证据见 iterations/0064/MERGE.md——最终记账（iteration+1 / BACKLOG 终态 / metrics 行）归 CLOSE
```
