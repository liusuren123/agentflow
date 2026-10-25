# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0043      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 05:50  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0043 空转收尾（WORKFLOW §4）：侦察无带证据候选可立项，ready 队列仅 BK-0040 一项且其成果在 feat/0036-iter 分支（0a92918）待合并仲裁不重做，本轮零提交零迭代目录零 metrics 行
```
