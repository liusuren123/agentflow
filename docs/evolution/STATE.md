# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0074      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-31 07:44  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0073（BK-0018 重试轮）终态 done——产品提交 3f86196（0068 留档 d5ddb27 带入并 rebase 于主干现版 + BUG-0068-06 八处标记词补尾冒号，产品语义零新增）已并入主干（合并 92c844f 零冲突，合并基 823a4a2 主干零分叉），主干复测四项全绿 exit 0（build ✓ dist 723.72 kB · gate 21 场景首跑全 pass diffPx=0 零 gate:update · npm test 30/30 · smoke 203/0 含 MEM01-07 净增 7 条首次套件内执行证据），证据 docs/evolution/iterations/0073/{MERGE.md,evidence/}（4 PNG + 四日志 + manifest）；BACKLOG BK-0018 置 done、metrics 追加 0073 行（本轮 CLOSE 同批）；BK-0064 解阻（其行延后注「BK-0018 收口后下一轮 PLAN 首选」兑现归下轮 PLAN），issue#17 关单回执归脚本
```
