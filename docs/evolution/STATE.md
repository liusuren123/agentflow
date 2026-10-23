# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0010      # 当前/下一个迭代号（CLOSE 时 +1）
phase: stuck         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-22 23:04  # 本次迭代开始时间
updated: 2026-10-23 23:59  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 预检未通过置 stuck——STATE.phase=PLAN 非 idle，上轮迭代未收尾（迭代 0010 自 2026-10-22 23:04 中断于 PLAN、PRD 未产出），按 WORKFLOW.md §5.4 处理后再来；续跑选题按前次记录为 BK-0022（非 doc ready 表首，勿取 BK-0010/0011）
```
