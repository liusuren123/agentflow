# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0004      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-22 11:37  # 本次迭代开始时间
updated: 2026-10-22 12:12  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0003（BK-0003）终态 done：DEFS 漂移防护补齐——默认值 33/33 全量断言 + 事件反例 12 条 + HANDLERS⊇NODES 三新测试（产品提交 1551994，+132/−2：engine.ts 一词零行为导出 HANDLERS + 三测试文件 59/39/32 行 + 根 test 链改 build:shared→build:server→test，contract.test.mjs 原样未动），VERIFY PASS 零缺陷（node --test 8/8、反演 a/b/c 与裸跑防御先红后还原复绿、E2E P1-P3 全过，证据 iterations/0003/REPORT.md），BACKLOG 置 done、metrics 已追加
```
