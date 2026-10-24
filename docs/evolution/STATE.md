# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0017      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 07:58  # 本次迭代开始时间
updated: 2026-10-24 08:57  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0016 / BK-0017 CLOSE=done（R0 FAIL→修复轮 R1 PASS）：approval 审批人节点引用（role=node:id 受控 LLM 裁决 + zod 降级链 + approval_audits 审计）落地，产品提交 a9ac875（初始+R1 合一，+382/−4 恰白名单四路径，零 UI/零 shared/零新 SSE 事件），BUG-0013/OBS-001 均修复经 smoke 84/0 + API/UI 复验收定——docs/evolution/iterations/0016/REPORT.md（R1 复验节）
```
