# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0047      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 09:19  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0046 / BK-0055 CLOSE=done：handlers.ts 头注计数同步——「基础 16 种」→「基础 18 种」+ 指注补 agent.ts（纯注释单行零行为零契约零 golden，S 项 skipSpec），产品提交 79cb42f（+1/−1 恰 1 路径）已并入主干（合并 1611210 零冲突）；主干复测四项全绿 exit 0：build ✓ · gate 16 场景 diffPx=0 · npm test 30/30 · smoke 133/0，证据 docs/evolution/iterations/0046/evidence/；另：feat/0036-iter（BK-0040）成果仍在分支待合并
```
