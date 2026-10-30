# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0070      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-31 02:07  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0069（BK-0020 引擎级 on-error 策略：重试/跳过/中止，issue#15 批复解阻、S 项 skipSpec、ADR-0022 权威蓝图，v3 工作树轮 feat/0069-iter）终态 done——产品提交 1b2dbdb（+327/−16 恰 7 路径：engine 策略分派 / config 三 env zod / types ok 字段 / server 一行 / events 注释 / .env.example / smoke OE01-08）已并入主干（合并 65e8c98 零冲突）；主干复测四项全绿 exit 0（merge-arbiter 实跑，MERGE.md §3）：build ✓ · gate 21 场景首跑全绿 diffPx=0（零 gate:update）· npm test 30/30 · smoke 182/0（=0065 基线 168 + OE01-08 8 条 + C 组清理 6 条，账目吻合）；VERIFY PASS 零产品缺陷零修复轮（AC1~AC10 全过）；证据 docs/evolution/iterations/0069/evidence/（4 PNG + build/gate/test/smoke 四日志 + manifest）与 REPORT/MERGE/JOURNAL；issue#15 关单回执归脚本；解阻 BK-0048（晋升条件兑现归下轮 PLAN 轮晋升）与 BK-9006 收官路径；主干健康，ready 队列：BK-0014 / BK-0018（重试），BK-0048 待下轮晋升
```
