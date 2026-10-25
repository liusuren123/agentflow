# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0039      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 02:02  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0038 / BK-0046 CLOSE=done（approval 审批人节点引用拾取器 + BUG-0012 code lang 前端联动，修宪轮 issue#6 承继 + ADR-0017；产品提交 fe44c50 + 合并 7d8df55 场景号撞号裁决改号 s12→s13/s13→s14 像素零变化 + 收口 17d2128；VERIFY PASS 0 BUG）；主干复测四项全绿（merge-arbiter 实跑，MERGE.md §3）：build ✓ · gate 15 场景 diffPx=0 · npm test 30/30 · smoke 126/0，证据 docs/evolution/iterations/0038/evidence/；另：迭代 0036（BK-0040）成果仍在分支 feat/0036-iter 待合并
```
