# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0008      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-22 18:20  # 本次迭代开始时间
updated: 2026-10-22 18:24  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0007 补题轮终态 replenished：ready 归零后补 4 项（新增 BK-0012 边界文档·T1-M2 唯一承载，晋升 BK-0005/0010/0011 为 ready），BK-0008/0009 维持 proposed、待批准区零进出，无实现、无产品提交；PRD 验收 AC1-AC6 核对通过（AC5：git status 改动全限 docs/evolution/），产出与防重复对照见 docs/evolution/iterations/0007/PRD.md；下次心跳 PLAN 从 4 项 ready 正常选题（P1 唯一项为 BK-0012）
```
