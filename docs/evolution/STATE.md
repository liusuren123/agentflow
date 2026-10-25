# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0038      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 01:42  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0037 / BK-0050 CLOSE=done（节点库「智能体」类目：agent 节点独立分组 + 类目色 #14b8a6，修宪轮 issue#6 承继 + ADR-0017；产品提交 6d038cd 恰 23 路径 + 合并 c0cb38e 零冲突 + 合流收口 40f9d06）；主干复测四项全绿（merge-arbiter 实跑，MERGE.md §4）：build ✓ · gate 13 场景 diffPx=0 · npm test 30/30 · smoke 125/0，证据 docs/evolution/iterations/0037/evidence/；另：迭代 0036（BK-0040）成果仍在分支 feat/0036-iter 待合并（合并锁占用）
```
