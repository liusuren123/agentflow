# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0027      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 03:07  # 本次迭代开始时间
updated: 2026-10-25 04:55  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 周度治理 W43 四次（2026-10-25 周日）完成：L 项拆分 BK-9002~9006 → 19 子项 BK-0032~0050（四 SPEC 先行项 ready：0032 agent 节点/0043 PTY 安全方案/0035 呈现三件套/0039 工作台）+ BK-0051 README 漂移项；ROADMAP 里程碑回写；全量回归 6/6 全绿（gate 8 场景 diffPx=0、smoke:server 95/0、契约 30/30、canvas 15/15、shutdown win32 预期 SKIP）；周报 weekly/43.md §七；0019 PRD 笔误批处理修正——ready 队列已补充，心跳可续跑
```
