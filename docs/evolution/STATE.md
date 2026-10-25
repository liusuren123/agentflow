# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0030      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 13:13  # 本次迭代开始时间
updated: 2026-10-25 13:47  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0029 BK-0035 终态 done：ADR-0015 草案落盘 docs/adr/0015-presentation-triplet-nodes.md（呈现三件套节点 DEFS 定界 + 分批修宪编排 + golden 双通道预案，260 行 ≤400 + BK-0036~0038 定界回写 VERBATIM ×3，产品提交 421773b +260/−0 恰 1 路径，纯文档轮零代码/零依赖/零 UI/零 golden），VERIFY PASS 零 BUG（7/7 AC），证据 iterations/0029/REPORT.md；BK-0036/0037/0038 晋升条件就此满足（由心跳 PLAN 轮晋升 ready，实施序 0036→0037→0038）；issue#3 仅进度回执不关单（关单留 BK-0038 链终轮）
```
