# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0035      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-25 22:20  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0034 / BK-0037 CLOSE=done（**v3 工作树模型首个真实双路并行合流**：迭代 0033 BK-0036 webshow 与 0034 BK-0037 termview 自同一基点 84ee8ec 并行推进，各得独立迭代号/工作树/分支、并行期主干零改动；选题占位互斥实测生效——0034 首轮撞 BK-0036 → PM 重选 BK-0037，PRD 留痕）。合并时 5 文件 7 处冲突全为「双方各自新增/各自更新状态行」型、逐项并存解决（零语义对立），**场景编号裁决=termview 取 s11**（ADR-0015 §5 落盘时序：webshow 先落保留 s10），仅编号字面量与 golden 文件名变更、像素内容零变化非重录。合流后集成收口=节点 18→19 / 参数 38→40 / 目录 18→19（契约测试 6 处计数断言 + 生成器护栏 + defs-drift 期望表补 termview 默认值 + 节点 README 重跑）。主干复测四项全绿：build ✓·gate **12 场景 diffPx=0**（s0~s9 零波动 + s10-webshow-node + s11-termview-node）·npm test 30/30·smoke **118/0**（原 113 + T 组 T01~T03 五条）；证据 iterations/0034/evidence/（4 确定性截图 + 4 份复测日志 + manifest 含 4 场景 sha256），合流过程 iterations/0034/MERGE.md。修复轮=BUG-001（在线 delta 未按边转发下游呈现）修复后 PASS 零缺陷。合流期另修两处脚本缺陷（productFiles 跨轮覆盖致首轮新建文件漏提交、证据自检路径错配）。issue#3 链未竟（BK-0038 JSON 画布待实施）→ issue 保持开放仅发进度回执不关单
```
