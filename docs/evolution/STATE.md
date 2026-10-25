# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0036      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 00:59  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0035 / BK-0038 CLOSE=done（呈现三件套·JSON 画布节点 jsoncanvas，修宪轮批次 3·BK-9003 链终轮·**链闭合**；v3 工作树轮：BUILD 全程 .zcode/worktree/feat/0035-iter 分支 feat/0035-iter，产品提交 15f3502 +382/−22 恰 SPEC §7 白名单 + 合并后收口补提交 f3fc830（jsoncanvas 节点目录首轮漏提交，合并后首轮 build 拦截、0034 教训兑现），合并 1e770d1 零冲突）。主干复测四项全绿（merge-arbiter 实跑）：build ✓ · gate **13 场景 diffPx=0**（s12-jsoncanvas-node golden-created 新场景 + s0~s11 零波动、s3-library 修宪重录预案零消费、gate:update 全程 0 次）· npm test **30/30**（baseline 20 键 / 42 参数联动全过）· smoke **125 passed / 0 failed**（0034 基线 118 + J01~J04 + C01 清理 3；预提交期 89/1 系 V09 环境哨兵时点性假红先例形态，一次性副本豁免后 125/0）。VERIFY PASS 零 BUG（REPORT：AC0~AC8 全过含 AC4 五点位浏览器亲跑——节点库条目/widget/结构化树 8 jc-row/expand+fmt 交互/非 JSON 原文降级+零额外请求；交互回归 8 项全绿）。证据 docs/evolution/iterations/0035/evidence/（4 确定性截图 + build/gate/test/smoke 四日志 + manifest 含 4 场景 sha256）+ MERGE.md §4 复测表；issue#3 链终，🤖 关单回执归脚本执行（WORKFLOW §4 CLOSE：done 关单）
```
