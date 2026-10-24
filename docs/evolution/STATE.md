# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0019      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`；补题轮无所选 ID 亦为 `-`）
started: 2026-10-24 17:46  # 本次迭代开始时间
updated: 2026-10-24 18:16  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0018 / BK-0031 CLOSE=done（零 shared 源码/零依赖的资产+文档先行轮，VERIFY PASS 零 BUG）：等价基线快照 packages/shared/test/nodes.baseline.json（11521 字节，sha256 08ba1229…f275，再生产逐字节相等）+ 实施轮 SPEC 342 行 + SPEC 附录 A needs-approval issue 草案，产品提交 6f10551（+956/−0 恰 3 路径）；BK-0021/0023 维持 proposed，issue 待脚本持附录 A 字面量开启、批复前 BK-0021 零实现——docs/evolution/iterations/0018/REPORT.md
```
