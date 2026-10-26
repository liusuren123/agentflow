# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0046      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 08:19  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0045 / BK-0054 CLOSE=done：契约测试同族字面残留清理（synthesis「16 键/16 节点」→17、defs-drift「18 种」→20、termview 重复键去重，纯测试名/消息字面量同步零产品代码，断言本体零改动），产品提交 e832579（+3/−4 恰 2 路径）已并入主干（合并 a1ef739 零冲突）；主干复测四项全绿 exit 0：build ✓ · gate 16 场景 diffPx=0（门禁首轮 s3 本机采样抖动——工作树首跑 diffPx=23 四路亲核留档 JOURNAL、主干三采样 21/21/0 终绿 MERGE.md §3.1 定性非缺陷，未消费 gate:update）· npm test 30/30 · smoke 133/0，证据 docs/evolution/iterations/0045/evidence/；另：feat/0036-iter（BK-0040）成果仍在分支待合并
```
