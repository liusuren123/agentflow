# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0041      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 03:20  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0040 / BK-0052 CLOSE=failed（脚本机械判：merge 仲裁员返回缺 retest 字段→evolution-iteration.dwf.ts:793 回退默认 build/gate/test/smoke=false×4——主干复测实跑四项全绿 exit 0：build ✓·gate 16 场景 diffPx=0（首跑 s3 本机抖动双留档）·test 30/30·smoke 133/0 含 W08/W09 新护栏双过，证据 docs/evolution/iterations/0040/evidence/，0033 同型先例待复核更正）；产品提交 145fe46（sendFile {root} 相对形态，+25/−4 恰白名单 2 文件）已并入 e9f0fce 零冲突；feat/0036-iter（BK-0040）仍在途待合并
```
