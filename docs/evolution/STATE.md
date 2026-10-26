# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0048      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 10:20  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0047 / BK-0056 CLOSE=done：server.ts 头注路由清单同步——补 /api/v1/sessions 五端点行（创建/列表/详情/chat/stop，迭代 0015 / BK-0016）+ v1-only 括注补 sessions/capabilities（纯头注注释 +3/−1 零行为，S 项 skipSpec），产品提交 55a36c2 已并入主干（合并 16e538e 零冲突）；主干复测四项全绿 exit 0：build ✓ · gate 16 场景 diffPx=0（首跑 s3 抖动 23 双留档）· npm test 30/30 · smoke 133/0，证据 docs/evolution/iterations/0047/evidence/；另：feat/0036-iter（BK-0040）成果仍在分支待合并
```
