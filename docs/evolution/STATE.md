# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0065      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 17:05  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0061（BK-0045 PTY 交互终端节点 UI）经用户授权 A 案收口终态 done（账本更正，0033/0040 双层记录同径）：保全分支 feat/0061-iter 工作树重验六项全绿（门禁四件套 build/test 30·30/gate 20 场景 diffPx=0/smoke 157·0 + V5 矩阵 PASS 170/FAIL 0 + PE3 C×10 失败率 0 + V6 五点位 9/9）→ 合并 b0b2a19（冲突仅 STATE/BACKLOG 状态机文件取主干版，产品零冲突；app.js sessionEnded 守卫 + pty-echo-matrix.mjs + 0057/0061 机制件入主干）→ 主干复测四绿（gate 20 场景首跑全绿 · smoke 168/0），证据 iterations/0061/{MERGE.md,evidence/}；BK-0045 置 done、**BK-9005 链闭合**（issue#5/#14 关单回执已执）；熔断解除，主干健康，下一轮心跳可正常开工（ready 队列：BK-0061/0062 SPEC 项、BK-0047 待晋升修宪轮）
```
