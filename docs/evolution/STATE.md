# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0061      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 11:12  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 【BK-0045 同项两连败熔断·等用户裁决】迭代 0061（BK-0045 重试收口轮）终态 failed（过程性——修复轮后提交阶段环节）：核心 BUG-0057-02 已两轮独立全量 E2E 闭环（PASS 170/FAIL 0 ×2 + 矩阵 C/D 各 ≥2 轮，产品零改动·验收基建伪影定性）、Minor BUG-0061-01 修复与 0057 机制件补录均在留档提交 08461c3（feat/0061-iter + 工作树保留，**只差重验+合并一轮收口**）；处置选项：A 授权一轮收口（重验后合并、链终关单 issue#5/#14）/ B 先亲验（:3000 已含终端节点，PTY_ENABLED=0 降级态）/ C 搁置转其他 ready 项（BK-0019 实现块等）——详见 BACKLOG BK-0045 行与 metrics 0061 行；BK-0045 心跳禁选、选题锁保留待裁决
```
