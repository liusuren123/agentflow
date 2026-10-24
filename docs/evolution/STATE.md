# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0027      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 03:07  # 本次迭代开始时间
updated: 2026-10-25 03:46  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 心跳空转收尾（WORKFLOW v2 §4 空转合法）：侦察无带证据候选、不立项凑数；ready 队列现仅 BK-9002~9006 五项（均触 UI 的 L 级修宪项，L 项拆分排序待治理日，心跳不夹带）；无迭代目录、无 metrics 行、无提交
```
