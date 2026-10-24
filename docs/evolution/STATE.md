# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0018      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 16:45  # 本次迭代开始时间
updated: 2026-10-24 17:19  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0017 / BK-0027 CLOSE=done（纯文档轮，VERIFY PASS 零 BUG）：ADR-0012 真 MCP client 传输选型草案（278 行：两传输都做/统一 McpConnection 抽象/Streamable HTTP 先行/@modelcontextprotocol/client ^2.4 推荐）+ BK-0028~0030 定界回写 VERBATIM ×3（维持 proposed）+ 附录 A needs-approval issue 草案落盘，产品提交 de278bb（+278/−0 恰 1 路径），smoke:server 亲跑 84/0——docs/evolution/iterations/0017/REPORT.md；issue 待脚本开启，批复前三子项不转 ready
```
