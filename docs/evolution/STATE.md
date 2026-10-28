# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0064      # 当前/下一个迭代号（CLOSE 时 +1）
phase: VERIFY     # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: BK-0019       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-28 13:35  # 本次迭代开始时间
updated: 2026-10-28 17:00  # 最近更新时间
repair_round: 1     # VERIFY→BUILD 修复轮次（上限 2）
last_result: VERIFY-2 复验 PASS（iterations/0064/REPORT.md：BUG-0064-01 修复核验=KB05 改独占库 smoke-kb-upload 纯测试件、产品代码零触碰；污染态起始背靠背两轮 smoke 均 168/0 幂等实证；AC7 复跑恒空；九项 AC 全绿——A/B 等价 18 组独立复核零差异、M1-M4 全链绿、禁区 diff 恒空、零反转）——可进 MERGE
```
