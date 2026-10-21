# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0002      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-22 00:26  # 本次迭代开始时间
updated: 2026-10-22 00:48  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0001（BK-0001）终态 blocked：VERIFY 本身 PASS（iterations/0001/REPORT.md），但产品提交为空（docs/evolution 之外无任何改动）被防打转校验打回，实现改动已清理，产出随归档提交入库
```
