# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0068      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-29 13:17  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0067（BK-0062·BK-0014 拆分 SPEC 先行：扩展发现器「安全方案」（.mcp.json/.agents/~/.agents 扫描白名单 + 首次确认 + 审计留痕 + 出站类别清单）+ loaders 接线定界 + ADR-0023 草案，纯文档轮，触UI=否自主区）终态 done：产品提交 d501e4e（恰 1 路径 docs/adr/0023-mcp-extension-discovery-security.md +307）已并入主干（合并 b23e08c 零冲突）→ 主干复测四项全绿 exit 0（build ✓（dist 718.51 kB）· gate 21 场景首跑全绿 diffPx=0 · npm test 30/30 · smoke 168/0），证据 iterations/0067/{MERGE.md,evidence/}；BK-0062 置 done、BK-0014 定界回写在案（维持 proposed，晋升条件余附录 A needs-approval 获批，issue 开立归脚本）、metrics 追加行；主干健康，下一轮心跳可正常开工
```
