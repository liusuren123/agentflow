# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0032      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 14:36  # 本次迭代开始时间
updated: 2026-10-25 18:30  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0031 / BK-0033 CLOSE=done（首个 UI 功能修宪轮：通用智能体节点 agent NDP + 注册表入列 + agent.ts handler 会话/预算承载 + 节点库呈现——BUILD 主体由工作流子智能体在 provider 双中断前完成，用户指示停工作流后协调者手动接管：核实实现与 SPEC 逐项一致零补写、产品提交 081b32d 恰白名单 20 行 +569/−37、gate 9 场景 diffPx=0（s8 golden-created + s3 重录恰一次）、契约 30/30、smoke 提交后 104/0（A01-A05 全绿，提交前 V09 时点性假红为先例形态）、canvas 15/0、前端三文件/llm.ts/events.ts/lock 零 diff；AC6-④ 真模型 E2E 未跑如实标注；issue#2 进度回执不关单留 BK-0034 链终）——docs/evolution/iterations/0031/REPORT.md
```
