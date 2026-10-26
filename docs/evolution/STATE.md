# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0048      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 11:58  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 心跳熔断后复验翻案（2026-10-26 11:58，运行 dwfrun-5fff270a）：迭代 0049 预检工作树（feat/0049-iter，11:46 checkout，HEAD 615e227）基线像素门禁红 1 场景熔断未开工（失败行在转发输出 s0~s5 段被截断、场景名未核得，s6~s15 全 pass · diffPx=0）；协调者主干复验 npm run build + npm run gate 16 场景 diffPx=0 全绿（含 s3-library），HEAD 615e227 自 11:00 全绿复验后产品代码零改动、工作树为同 HEAD checkout——判定为 s3-library 已知本机采样抖动再次发作（0037~0048 同形态 rerun 即绿，CI 为权威，issue #12 待用户批复），非代码回归，phase 复位 idle；GitHub 网络已恢复，#12 本次发作证据评论已补发（🤖）；0049 工作树已注销、分支已清理（.zcode/worktree/feat/ 下 0033~0049 目录壳残留未清理，不影响 git 状态）；主干健康，下一轮心跳可正常开工
```
