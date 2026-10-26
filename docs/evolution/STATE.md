# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0051      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 12:47  # 本次迭代开始时间
updated: 2026-10-26 13:24  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0050（BK-0057 冒烟编排头注序列同步：smoke-server.mjs:5 编排串 12→19 组，纯注释零行为零渲染因果）终态 done：产品提交 f3ad843（+1/−1 恰 1 路径）已并入主干（合并 fedbbb2 零冲突，merge-base 8cf561e）；门禁结论按裁定硬性口径如实留痕——本地工作树门禁 15/16 场景绿，s3-library 红（diffPx=23，12:58/13:04 两次逐坐标一致复现 coords sha256 相同，差异=左栏 rail-group bottom 三内联 SVG 图标抗锯齿微扰、DOM 不变量恒等），修复轮 2 上限到且三修复路径全封死，升级裁定依宪法第 2 条 CI 权威口径放行（5 条护栏全文 JOURNAL §9；issue #12 OPEN/needs-approval 在案待批复，禁止表述门禁全绿）；主干复测四项全绿 exit 0：build ✓ · gate 16 场景 diffPx=0 · npm test 30/30 · smoke 133/0，证据 docs/evolution/iterations/0050/evidence/（4 PNG + build/gate/test/smoke 四日志 + manifest）；同轮侦察留档 BK-0058（gate.mjs 头注场景数 6→16，pending-approval 待 needs-approval 流程）；CI ui-constitution 推送后盯守（红则 rerun 一次仍红报 #12）；主干健康，下一轮心跳可正常开工
```
