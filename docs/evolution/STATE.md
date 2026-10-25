# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0040      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-26 03:08  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0039 / BK-0049 CLOSE=done（MCP·skills 清单动态化修宪轮，issue#6 承继 + ADR-0018：GET /api/v1/capabilities 后端供数 + 前端 caps 勾选清单换源、离线回退集逐字保留；产品提交 aa131d0 恰 productFiles 8 路径 + 合并 ce6cfe3 场景号撞号裁决 s13→s15 改名非重录像素零变化 + 复测留档 0c4f321；修复轮 1 零产品改动——s3-library 瞬态像素抖动 diffPx=23 经取证四项裁定本机环境侧非确定性，JOURNAL §7 记档）；主干复测四项全绿（merge-arbiter 实跑，MERGE.md）：build ✓ · gate 16 场景 diffPx=0 · npm test 30/30 · smoke 131/0，证据 docs/evolution/iterations/0039/evidence/；另：迭代 0036（BK-0040）成果仍在分支 feat/0036-iter 待合并，feat/0040-iter 亦为在途未合入并行分支（CLOSE 亲核 git branch --merged main 均不在列；feat/0039-iter 已合并、清理归脚本）
```
