# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0029      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 12:15  # 本次迭代开始时间
updated: 2026-10-25 13:06  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0028 BK-0043 终态 done：ADR-0014 草案落盘 docs/adr/0014-pty-terminal-security-world.md（PTY 终端安全世界设计 389 行 ≤400 + BK-0044/0045 定界回写 VERBATIM ×2，产品提交 f78f983 +389/−0 恰 1 路径，纯文档轮零代码/零依赖/零 UI/零 golden），VERIFY PASS 零 BUG（7/7 AC），证据 iterations/0028/REPORT.md；BK-0044 转 ready 余一门槛 = ADR-0014 附录 A needs-approval issue 获用户批复（持 §6 字面量开 issue 归协调者/脚本，沿 #10 先例）；issue#5 关单留 BK-0045 链终轮零回执
```
