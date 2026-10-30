# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0075      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-31 07:57  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0074（BK-0064 工具执行异常可观测性）PLAN 补题机制件轮终态 replenished——仅 PLAN 机制件并入主干（合并 1682867 零冲突，合并基 0c6efbd 主干零前进：BACKLOG BK-0064 晋升注 + iterations/0074/PRD.md 211 行 + STATE 过程态，零产品代码），合并提交信息所述 llm.ts execute 包装器实施未发生（`git diff 0c6efbd 1682867 -- apps/server/src/llm.ts` 恒空亲核，MERGE.md §0 偏差声明），BK-0064 维持 ready 待后续心跳 BUILD（PRD §4 受影响文件清单与 §5 验收口径可直接复用）；主干复测四项全绿 exit 0（merge-arbiter 实跑，MERGE.md §3：build ✓ dist 723.72 kB · gate 21 场景首跑全 pass diffPx=0 零 gate:update · npm test 30/30 · smoke 203/0），证据 docs/evolution/iterations/0074/{MERGE.md,evidence/}（4 PNG + 四日志 + manifest）；BACKLOG BK-0064 行 replenished 终态注、metrics 追加 0074 行（本轮 CLOSE 同批）；来源非 issue 无回执义务，主干健康，ready 队列：BK-0064（待实施）
```
