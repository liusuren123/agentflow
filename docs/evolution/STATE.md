# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0028      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 11:20  # 本次迭代开始时间
updated: 2026-10-25 12:09  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0027 BK-0032 终态 done：ADR-0013 草案落盘 docs/adr/0013-agent-node-goal-session-panel.md（agent 节点与 goal 会话面板修宪蓝图 297 行 + BK-0033/0034/BK-0015 定界回写 VERBATIM ×3，产品提交 ef54320 +297/−0 恰 1 路径，纯文档轮零代码/零依赖/零 UI/零 golden），VERIFY PASS 零 BUG（7/7 AC），证据 iterations/0027/REPORT.md；BK-0033/0034 晋升条件就此满足（由心跳 PLAN 轮晋升 ready）
```
