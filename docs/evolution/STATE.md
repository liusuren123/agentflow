# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0006      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-22 15:24  # 本次迭代开始时间
updated: 2026-10-22 16:19  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0005（BK-0007）终态 done：websearch eng 参数生效化——博查严格走 BOCHA_API_KEY、SearXNG 严格走新增可选 env SEARXNG_URL（zod 校验 + guard 动态主机网关）、Bing/Google/未知值先发「未接入」warn 后回退链逐字保留（产品提交 a5b284f，7 文件 +154/−12），VERIFY PASS 零缺陷（smoke:server 39/0、定向 E2E 13/0、反演演练红绿双向、UI 抽查 8 项，证据 docs/evolution/iterations/0005/REPORT.md），repair_round=0，BACKLOG 置 done、metrics 已追加，ROADMAP T3-M1 关账
```
