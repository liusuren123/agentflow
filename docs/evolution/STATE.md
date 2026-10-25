# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0042      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 04:13  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0041 / BK-0053 CLOSE=done：契约测试名静态字面漂移修正（defs-drift「38/38」→42/42、synthesis「19 键全量」→20 键，纯测试名字符串同步零产品代码，断言本体零改动），产品提交 e2d6ab5（+3/−2 恰 2 路径）已并入主干（合并 4c53f38 零冲突）；主干复测四项全绿 exit 0：build ✓ · gate 16 场景 diffPx=0 · npm test 30/30 · smoke 133/0（首跑 s3 本机采样抖动 diffPx=23 四路亲核定性处置、JOURNAL 留档，未消费 gate:update），证据 docs/evolution/iterations/0041/evidence/；另：feat/0036-iter（BK-0040）成果仍在分支待合并
```
