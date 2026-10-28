# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0066      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-29 00:35  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0065（BK-0047·BK-9006 子项 retrieval kb 参数动态化：combo 选项由后端 kb 清单端点供数，修宪轮 issue#6 批复承继）终态 done：产品提交 7599b7a（BUG-0065-01 修复轮收口——refreshKbs 改「仅变更到达」断绝 renderProps⇄refreshKbs⇄onKbsArrive 自反馈死循环，在线选中 retrieval 请求 315 次/3s→1 次；s20 golden 经修宪轮通道重录恰双文件）已并入主干（合并 3133857 零冲突，merge-base 91e5a1c 零前进）→ 主干复测四项全绿 exit 0（build ✓（dist 718.51 kB）· gate 21 场景首跑全绿 diffPx=0 · npm test 30/30 · smoke 168/0），证据 iterations/0065/{MERGE.md,evidence/}；BK-0047 置 done、metrics 追加行（issue#6 进度回执归脚本不关单——BK-9006 链余 BK-0048 未竟）；主干健康，下一轮心跳可正常开工（ready 队列：BK-0061/0062 SPEC 项）
```
