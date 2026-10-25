# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0034      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-25 21:40  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0033 / BK-0036 CLOSE=done（**账本更正**：原判 failed 系脚本侧证据落盘自检路径错配误判——evolution-iteration.dwf.ts:782 以工作树前缀 wtPath 读 evidence/manifest.json，而证据按 MERGE 契约落盘主干 docs/evolution/iterations/0033/evidence/，故 evidenceOk=false → :788 在 VERIFY PASS+复测全绿下机械判 failed；脚本已修为「主干路径优先、工作树兜底」。按同一轮已落库证据复核终态=**done**：产品提交 bf25202（+417/−35 恰 SPEC §2 白名单 20 路径）+ 合并 2b76116（零冲突，webshow 修宪轮批次 1 全量入干）+ 主干复测 build=true gate=true（11 场景全 pass diffPx=0，含 s10-webshow-node golden-created 新增、s0~s9 零触碰、零 gate:update）test=true（30/30）smoke=true（113/0 含 O01~O05 套内全绿）+ REPORT PASS 零 BUG（repair_round=0）+ 证据在库 docs/evolution/iterations/0033/evidence/（4 日志 BUILD/GATE/TEST/SMOKE_EXIT=0 + 4 确定性截图 + manifest 含 4 场景 sha256，MERGE.md §3~§4）；双层记录：BACKLOG BK-0036 行状态列改 done + 备注留更正，metrics 0033 原行不改写、另加更正行。issue#3 链未竟（BK-0037 批次 2 在迭代 0034 并行推进中、BK-0038 批次 3 待做）→ issue 保持开放仅发进度回执不关单）
```
