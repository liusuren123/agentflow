# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0076      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-31 08:49  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0075（BK-0064 工具执行异常可观测性）终态 done——llm.ts execute 包装器异常捕获 emit warn + 触发既有降级直生成轮（标记位协作形态：execute try/catch 捕获 impl 异常、abort 不吞照旧 throw，toolErr 置位跳出工具轮走既有形态无工具降级直生成 + 降级 warn，既有 catch 零改动）已真实并入主干（产品提交 a13b040 +55/−18 恰 3 路径：llm.ts/smoke MEM05 同批改写/ADR-0024 §4.1 反写注 + 机制件 4d455c6，合并 7bd198d 零冲突，合并基 7725486 主干零前进）；主干复测四项全绿 exit 0（merge-arbiter 实跑，MERGE.md §3：build ✓ dist 723.72 kB · gate 21 场景首跑全 pass diffPx=0 零 gate:update · npm test 30/30 · smoke 203/0 且 MEM05 PASS 行命中 0075 新形态 warn 双行 + 每 run 恰 2 请求 [携tools,无tools] 降级流，smoke.log:139）；VERIFY PASS 0 BUG 0 修复轮（1 项 Minor OBS-0075-01 留侦察/PM 裁决）；证据 docs/evolution/iterations/0075/{REPORT.md,MERGE.md,JOURNAL.md,PRD.md,evidence/}（4 PNG + build/gate/test/smoke 四日志 + manifest）；BACKLOG BK-0064 置 done、metrics 追加 0075 行（本轮 CLOSE 同批）；来源 T5 非 issue 无回执义务，feat/0075-iter 分支与工作树清理归 CLOSE 后续（MERGE.md §6.4）
```
