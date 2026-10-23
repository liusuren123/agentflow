# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0010      # 当前/下一个迭代号（CLOSE 时 +1）
phase: PLAN          # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -              # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-22 23:04  # 本次迭代开始时间
updated: 2026-10-23  # 最近更新时间
repair_round: 0      # VERIFY→BUILD 修复轮次（上限 2）
last_result: 周度治理 W43 第二次完成（weekly/43.md §五）：全量回归全绿（gate 4 场景 diffPx=0、test 8/8、smoke 50/0、canvas 15/0）+ dogfooding 发现 BUG-0012 立项 BK-0022；BK-0001 改判 done、BK-0008/0016/0017 晋升 ready、BK-0010 治理日消化（ADR-0009+issue #7）；迭代 0010 仍处 PLAN（10-22 23:04 中断、PRD 未产出）待心跳续跑，续跑选题改为 BK-0022（非 doc ready 表首，勿按旧记录的 BK-0010/0011 取题）
```
