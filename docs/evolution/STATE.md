# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0034      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-25 21:18  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0033 / BK-0036 CLOSE=failed（终态为脚本侧证据落盘自检误判、非产品失败：evolution-iteration.dwf.ts:782 以工作树前缀 wtPath 读 evidence/manifest.json 而工作树内无此路径 → evidenceOk=false → :788 在 VERIFY PASS+复测全绿下机械判 failed；证据实际按 MERGE 契约落盘主干 docs/evolution/iterations/0033/evidence/，本会话亲核在库——4 日志 BUILD/GATE/TEST/SMOKE_EXIT=0 + 4 确定性截图 + manifest 含 scenes；产品实况=REPORT PASS 零 BUG、repair_round=0，产品提交 bf25202 +417/−35 恰 SPEC §2 白名单、合并 2b76116 零冲突，webshow 修宪轮批次 1 全量入干）——主干复测 build=true gate=true test=true smoke=true（gate 11 场景全 pass diffPx=0 含 s10-webshow-node golden-created、npm test 30/30、smoke 113/0 含 O01~O05 套内全绿）；证据 docs/evolution/iterations/0033/evidence/（MERGE.md §3~§4）；失败要点与翻回 ready 重试路径见 BACKLOG BK-0036 行备注
```
