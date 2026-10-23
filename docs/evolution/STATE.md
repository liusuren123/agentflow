# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0015      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 04:58  # 本次迭代开始时间
updated: 2026-10-24 05:19  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0014（BK-0022）终态 done：BUG-0012（code 节点 lang 切 JavaScript 后默认码错配必挂）后端窄口径兜底——handlers.ts +15/−1（paramDefaultsOf 取 shared 默认样例逐字比对，唯一错配组合命中 → JS 等价样例替换 + warn 告知 log，不命中零行为变化）+ smoke-server.mjs +41/−1 K01~K03 断言，产品提交 807ee5d 恰白名单两文件（+56/−2，git show --numstat 实查；零 UI/零 DEFS/零新依赖，S 项免 SPEC）；VERIFY PASS 零未决 BUG（AC1~AC5 全过：smoke:server 亲跑 56/0 + AC2 反演红绿双向 sha256 还原一致零残留 + shared diff 空 + gate 8 场景与 npm test 8 项脚本门禁通过，证据 iterations/0014/REPORT.md）；OBS-001 Minor 非缺陷（smoke 增量 41 行超 PRD ≤40 行预算 1 行，CLOSE 无需处理）；前端联动方案触交互层归 issue #6 待批准；BACKLOG 置 done、metrics 已追加；ready 队列余 8 项（修宪 BK-9002~9005 均 L 且前置未竟顺延、非修宪 BK-0016/0017/0011/0008），下次心跳按 §4 优先序选题（P1/M BK-0016 为两项 P0 修宪前置，建议优先评估）
```
