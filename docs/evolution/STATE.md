# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0065      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 15:16  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0064（BK-0019 KB 管道后端）终态 done（过程性 failed 后协调者授权 MERGE 收口，0033/0040 双层记录同径）：产品提交 1562a8c + 失败留档 59f3e31（补齐 kb/ 五模块，productFiles 第 6 发后收口规则已同日根治 9134cd6）+ 合并 5c1627c 零产品冲突 + VERIFY-2 PASS（BUG-0064-01 修复轮闭环）+ 主干复测四绿（gate 20 场景首跑全绿 · smoke 168/0 = 157+KB01-KB11），证据 iterations/0064/{MERGE.md,evidence/}（2c0c1b2）；BK-0019 置 done、BK-0047「kb 清单端点承载段落地」约束解除；BK-0045 熔断待裁仍在案（A/B/C）；主干健康，下一轮心跳可正常开工（ready 队列：BK-0061/0062 SPEC 项、BK-0047 待晋升修宪轮）
```
