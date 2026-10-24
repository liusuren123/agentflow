# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0021      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 19:35  # 本次迭代开始时间
updated: 2026-10-24 20:15  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0020 / BK-0008 CLOSE=blocked（环境阻塞非需求失败，二次裁决定案：Mimosa 编辑钩子对 exec 命名调用形态启发式误报——better-sqlite3 进程内 SQL，store.ts:21 同库先例——两轮对照实验（含纯字面量假体）均命中，代码内变形无解；零产品提交、tools.ts 零残留，不回滚 failed；等待用户侧调整钩子规则/加白后 BACKLOG 翻回 ready 重试）——docs/evolution/iterations/0020/JOURNAL.md §3-§4
```
