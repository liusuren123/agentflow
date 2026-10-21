# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0001      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID
started: -           # 本次迭代开始时间
updated: 2026-10-22  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 周度治理 W43 完成（weekly/43.md）：全量回归无阻断（gate 4 场景 diffPx=0、test 5/5、后端冒烟 PASS）；BACKLOG ready 补至 6 项，首跳选题 BK-0001；等待首次心跳
```
