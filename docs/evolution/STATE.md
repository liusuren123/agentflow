# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0056      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 00:00  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0055（BK-0044 PTY 会话后端运行时：pty 四文件模块 + /api/v1/pty 五端点 + pty_audits 审计 + 三闸门生命周期，非修宪轮零 UI 接触、gate:update 零消费）终态 done：产品提交 805a0c9 + 补录 7908a5b（分支漏 add pty 四文件，0034/0036 同型故障三发，仲裁员逐文件补录 cmp 字节一致，MERGE §2 留痕）+ 机制件 b9f919d 已并入主干（合并 edbfc27 零冲突，merge-base 55b78dc 零分叉）；主干复测四项全绿 exit 0：build ✓ · gate 18 场景 diffPx=0（首跑全绿）· npm test 30/30 · smoke 145/0（node-pty 原生绑定主干可加载得证），证据 docs/evolution/iterations/0055/evidence/（4 PNG + build/gate/test/smoke 四日志 + manifest.json；REPORT PASS 零 BUG / MERGE.md）；BK-0044 置 done、issue#14 仅进度回执（itemContinues=true，关单与 issue#5 均留 BK-0045 链终轮）、BK-0045 晋升条件就此兑现归下轮 PLAN、STATE 复位 idle、iteration 推进 0056
```
