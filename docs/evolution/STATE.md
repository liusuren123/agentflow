# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0005      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-22 12:40  # 本次迭代开始时间
updated: 2026-10-22 13:09  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0004（BK-0006）终态 done：README 四落点补记 ADR-0006/0007 已落地能力（:43 smoke:server 命令行 / :68 节标题至 ADR-0004~0007 / :74-77 两 DELETE 端点行 / :78-83 双源句+前端能力，产品提交 01c6749，README.md +12/−3 净 +9 行），VERIFY PASS 零缺陷（E1-E6 复跑 + smoke:server 33/33 + ai-sdk 抽查 7/7 + 浏览器在线态实操，证据 docs/evolution/iterations/0004/REPORT.md），repair_round=0，BACKLOG 置 done、metrics 已追加，ROADMAP T4-M2 两验收点关账
```
