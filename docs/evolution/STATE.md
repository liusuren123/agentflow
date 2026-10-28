# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0061      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 13:16  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0062 首启曾因工作树基线像素门禁 3 连红熔断 stuck（未开工、无残留），**协调者复核后复位 idle（0060 同型二次实发）**：同树主干门禁复跑全绿（「宪法门禁：通过 ✓」本会话亲跑）——成串抖动再次坐实为环境侧；已给进化脚本加「CI 权威豁免」（工作树 3 连红 → 主干同树复跑 build+gate，主干绿即豁免开工并全量留档、主干红维持熔断；下游门禁不放宽），BK-0019（P1·KB 管道实现，ADR-0020 定界零批复等待）为 ready 队列最高优先，重启迭代即选；另 BK-0045 同项两连败裁决仍在案等用户（feat/0061-iter 留档，选项 A/B/C 见 BACKLOG BK-0045 行）
```
