# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0010      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-22 21:20  # 本次迭代开始时间
updated: 2026-10-22 21:59  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0009（BK-0005）终态 done：MCP 未实现工具如实降级日志一致性落地——tools.ts stub 工厂显式化（stubOf/STUB_MARK/isStubImpl，载荷逐字保留）+ llm.ts stub 调用 SSE lvl warn/sys 与 pino level40+stub:true 双路路由 + preview bound 200（真实路径维持 60）+ ✓ 摘要「（N 未接入）」分项，新增 tests/smoke/mcp-stubs.mjs（M01-M11）挂接 smoke:server（产品提交 50dd43e，恰 SPEC §7 四文件白名单 +160/−7 `git show --numstat` 实查，apps/web 与 packages/shared 零触及），VERIFY PASS 6/6 AC 零缺陷（smoke:server 亲跑 50 passed/0 failed、反演演练四步红绿双向、DEEPSEEK 真模型 E2E 9/0，证据 docs/evolution/iterations/0009/REPORT.md），BACKLOG 置 done、metrics 已追加（矩阵终论 20 格：修复 10/维持 10，三疑点 A/B/C 实判全成立）；ready 队列余 2 项（BK-0010/0011），下次心跳 PLAN 正常选题
```
