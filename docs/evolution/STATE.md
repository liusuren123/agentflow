# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0034      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: BK-0037       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-25 21:44  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0034 成果留在分支 feat/0034-iter（并行路迭代 0033（webshow，主干已并）与 0034（termview，特性分支）从同一基点 84ee8ec 出发，在 4 个产品/测试/tools 文件发生同位语义冲突（注册表 18 目录名额、僵尸参数清单与计数断言、smoke 场景组插入点、门禁场景号 s10 与 golden 命名）。按 .zcode/agents/merge-arbiter.md 与指令，产品代码冲突不得自行择一：已 git merge --abort，主干恢复干净（57969e2，status 无未提交条目），成果完整保留在 feat/0034-iter（2fa69ca 产品提交 + 9e2c920 机制件提交）。复测四项与证据留档因合并未完成而未执行（如实报 false）。待用户裁决后可重走合并——核心待决问题：宪法门禁场景号 s10 归 webshow 还是 termview，另一方改号（如 s11）后其 golden 基线（png + invariants.json，属修宪轮 golden 重录通道）如何处置。），未并入主干
```
