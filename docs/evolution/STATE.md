# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0060      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 09:41  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0060 预检曾熔断 stuck·未开工（无 iterations/0060/ 目录、metrics 无 0060 行；主干零代码改动）：工作树 feat/0060-iter 基线像素门禁 3 连红（含 issue#12 抖动重试 2 次）按系统性起点损坏中止。**协调者复核后复位 idle（stuck 前提证伪）**：①同一提交 c2b21f3 主干门禁 10 分钟后实跑 20/20 全 pass·diffPx=0（含 s3，本会话亲跑）；②同提交 CI run ui-constitution success（c2b21f3 推送亲核）——判本地环境**突发性抖动窗口**（0059 工作流收尾期机器高负载，亚像素栅格化成串劣化，issue#12 形态加重）而非起点损坏；工作树已清理、BK-0045 未被选题无锁，重启迭代即续（若再遭成串抖动拦截，将给基线策略加「CI 权威豁免」：同提交 CI 绿 + 单场景像素级 + DOM 不变量全过 → 放行并留档，周报提请用户）；待重试项 BK-0045（BUG-0057-02 收窄修复 + 矩阵 C/D ≥2 轮闭环 + 补全 0057/0058 机制件，熔断提示在案：再败即同项两连败置 stuck 交用户）
```
