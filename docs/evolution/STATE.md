# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0067      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-29 11:52  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0066（BK-0061·BK-0020 拆分 SPEC 先行：引擎 on-error 策略 env 语义清单与失败路径改造定界 + ADR-0022 草案，S 项 skipSpec 纯文档轮，触UI=否自主区）终态 done：产品提交 271080f（恰 1 路径 docs/adr/0022-engine-onerror-policy-env.md +315）已并入主干（合并 cd16c37 零冲突）→ 主干复测四项全绿 exit 0（build ✓（dist 718.51 kB）· gate 21 场景首跑全绿 diffPx=0 · npm test 30/30 · smoke 168/0），证据 iterations/0066/{MERGE.md,evidence/}；BK-0061 置 done、BK-0020 定界回写在案、metrics 追加行（BK-0020 晋升余附录 A needs-approval 获批，issue 开立归脚本）；主干健康，下一轮心跳可正常开工（ready 队列：BK-0062 SPEC 项、BK-0020 待批复）
```
