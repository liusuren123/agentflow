# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0041      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 03:23  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0040 / BK-0052 CLOSE=done（03:23 账本更正：原判 failed 系脚本机械判——merge 仲裁员返回缺 retest 字段致 evolution-iteration.dwf.ts:793 回退默认 false×4，协调者复核亲读四日志后按 0033 同径更正，metrics 追加 0040 更正行双层记录）；实况=产品提交 145fe46（sendFile {root} 相对形态修复 Windows 静态托管 404，+25/−4）已并入 e9f0fce 零冲突，主干复测四项全绿 exit 0：build ✓ · gate 16 场景 diffPx=0（首跑 s3 本机抖动双留档）· test 30/30 · smoke 133/0 含 W08/W09 首获机器护栏，证据 docs/evolution/iterations/0040/evidence/；另：feat/0036-iter（BK-0040）成果仍在分支待合并
```
