# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0020      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 18:47  # 本次迭代开始时间
updated: 2026-10-24 19:15  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0019 / BK-0011 CLOSE=done（启动扫尾落地：真实悬挂 run 161ce4ff 经重启收敛 stopped、事件 22→22 零伪造，smoke 亲跑 89/0+反演红绿双向，产品提交 12b6527 恰三路径 +92/−3 零依赖，VERIFY PASS 仅 BUG-0001 Minor 文档笔误留治理日；周报 W43 O1 关账）——docs/evolution/iterations/0019/REPORT.md
```
