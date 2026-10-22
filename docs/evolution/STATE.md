# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0003      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-22 08:02  # 本次迭代开始时间
updated: 2026-10-22 08:27  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0002（BK-0002）终态 done：后端 E2E 冒烟脚本 `npm run smoke:server` 落地（产品提交 79788a3，+532 行：tests/smoke/lib.mjs + smoke-server.mjs + package.json 一行），VERIFY PASS（smoke 两连跑 33/0、exit 0，负例 exit 1，证据 iterations/0002/REPORT.md），BACKLOG 置 done、metrics 已追加
```
