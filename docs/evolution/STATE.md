# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0012      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 00:41  # 本次迭代开始时间
updated: 2026-10-24 01:54  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0011（BK-0026）终态 done：golden s4/s5 在线态场景扩充落地——gate.mjs 147→225 行（三路由 fixture + 确定性等待 + 不变量增量，s0~s3 零字节改动）+ ADR-0009 改已批准口径 + 4 基线文件经 golden-created 通道落盘（未用 gate:update），产品提交 e3bf60b（+227/−22 + 2 PNG 二进制，git show --numstat 实查，产品渲染路径与既有 8 基线零触及），VERIFY PASS 零 BUG（gate 6/6 diffPx=0 实跑复绿、AC3 反演红→绿、npm test 8/8、交互抽查 17/17，证据 docs/evolution/iterations/0011/REPORT.md）；AC6 推送后盯 CI ui-constitution 与 issue#7 回执关单由脚本执行；BACKLOG 置 done、metrics 已追加；ready 队列余 11 项（队首 BK-0025，issue#8），下次心跳按 §4 优先序选题
```
