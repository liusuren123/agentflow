# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0007      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle         # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -             # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-22 17:04  # 本次迭代开始时间
updated: 2026-10-22 18:08  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0006（BK-0004）终态 done：portCache 失效场景回归用例落地——`npm run test:canvas` 一键离线几何断言 5 场景（tests/canvas/lib.mjs +147、geometry.mjs +216、根 package.json +1，产品提交 570d163 含修复轮 1 共 +364/−0），首轮 VERIFY FAIL（BUG-0001：单移除 app.js:1272 后 C5 反演不红——1271 定时器 220ms 自愈掩盖）经修复轮 1 关闭（lib.fit 增 excludeIds 单往返 + C5 双时点断言，B5 反演红 endDev=141.38px 与 SPEC 预测同量级、B1-B4 反演回归复命中、现状 15 passed/0 failed 双跑一致、gate 4 场景 diffPx=0、smoke:server 39/0，证据 docs/evolution/iterations/0006/REPORT.md §9），repair_round=1（上限 2 内），BACKLOG 置 done、metrics 已追加；ready 队列已归零，下次心跳 PLAN 须转「补题」
```
