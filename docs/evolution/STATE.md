# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0022      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: BK-0021       # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）——跨迭代批次续填（迭代 0021 批次 1 已 CLOSE、批次 2 待续做，PRD.md:215/REPORT.md §六② 编排，至批次 2 终轮 CLOSE 方置 done 与 `-`）
started: 2026-10-24 20:27  # 本次迭代开始时间
updated: 2026-10-24 21:36  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0021 / BK-0021 批次 1 CLOSE=done（VERIFY PASS 零 BUG，产品提交 e880511；跨迭代 doing——批次 2 余 8 目录+README 生成器+终态断言+在线 E2E+BK-0023 随批关账留下一迭代续做、item 续填，PRD.md:215/REPORT.md §六② 编排；issue#11 已被脚本通用 CLOSE 模板提前关单，gh 亲核）——iterations/0021/REPORT.md
```
