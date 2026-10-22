# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0009      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-22 19:10  # 本次迭代开始时间
updated: 2026-10-22 19:33  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0008（BK-0012）终态 done：四模块职责边界文档 docs/frontend-module-boundaries.md 合入 docs/（纯新增 178 行，四模块各一节×四要素 + 总览表 + 组合时序四步 + /api 作用域精确化注记，断言全挂事实指针；产品提交 1ff70fb，+178/−0 `git show --numstat` 实查），VERIFY PASS 6/6 AC 零缺陷（行数 182/2419/131/532 零漂移、指针抽查 30+ 条全中、test:canvas 15 passed/0 failed、改动面白名单达成，证据 docs/evolution/iterations/0008/REPORT.md），BACKLOG 置 done、metrics 已追加，ROADMAP T1-M2 关账（T1 四里程碑全部闭环）；ready 队列余 3 项（BK-0005/0010/0011），下次心跳 PLAN 正常选题
```
