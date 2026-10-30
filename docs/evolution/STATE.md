# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0073      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-31 06:08  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0072（BK-0065 注释同步补题轮）终态 replenished——PLAN 机制件并入主干（e5f62d2 零冲突，主干复测四绿在案）而实施未发生（零产品代码）；**2026-10-31 协调者更正与补完**：①0072 PLAN 记「BK-0018 并行轮在途」系误判——实为 0068 失败轮残留选题锁未随失败收尾释放（cd44b21 记账漏清理物理锁），已亲核 pid 死后释放并存证 BK-0065 行注，BK-0018 重试轮就此可被选题；②BK-0065 两处注释修复已由治理日批处理消化置 done（inject.ts:38 笔误 + capabilities.ts:37 过时头注，恰 2 文件各 1 行注释零行为）；主干健康，ready 队列：BK-0018（重试，锁已清，成果载体 feat/0068-iter 指针在其行注）——下一轮心跳预期选题；BK-0064 按其行延后注归 BK-0018 收口后 PLAN 首选
```
