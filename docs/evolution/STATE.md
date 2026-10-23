# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0013      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 02:04  # 本次迭代开始时间
updated: 2026-10-24 02:23  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0012（BK-0025）终态 done：CI contracts job 挂接 SIGTERM 优雅停机断言——tests/smoke/shutdown-sigterm.mjs 新增 185 行（P01/P02 前置缺产物 FAIL 不静默 + H01 spawn dist/server.js 健康探针就绪 + T01-T04 停机三要素断言，win32 SKIP+原因 exit 0）+ package.json 恰 +1 行 smoke:shutdown + .github/workflows/ci.yml contracts job +5 行（恰 2 step，ui-constitution job 零改动），产品提交 592be6e（恰 PRD 白名单三处 +191/−0，git show --numstat 实查；apps/web/packages/shared/apps/server src 零触及），VERIFY PASS 零 BUG（AC2 反演 T01/T02 双 FAIL exit 1 还原复绿零残留 / AC3 本机 SKIP exit 0 / AC5 smoke:server 50/50 + test:canvas 15/15 实跑，证据 docs/evolution/iterations/0012/REPORT.md）；AC1 PASS 路径与 AC4 CI 绿属 CI 权威未到时点（沿 0011 先例不判过不判挂），推送后盯 contracts job 与 issue#8 回执关单由脚本执行；BUILD 偏差 1（CI build step 补 npm run build，server.ts:52-56 硬依赖）记 JOURNAL §2；BACKLOG 置 done、metrics 已追加；ready 队列余 10 项（队首 BK-9001 修宪轮，issue#1 已批；L 项 BK-9002~9005 先拆分再实现），下次心跳按 §4 优先序选题
```
