# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0060      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 09:05  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0059（BK-0060 BK-0019 拆分 SPEC 先行：KB 管道后端嵌入存储选型 + 上传/切分/嵌入/入库管道与 kb 清单端点定界 + ADR-0020 草案）终态 done：产品提交 acd3973（docs/adr/0020-kb-pipeline-embedding-storage.md +288/−0 恰 1 路径纯新增，推荐案=纯表扫描 + L1 本地词法嵌入 + 案甲 kb 自有仓储，ADR-0020 §8 明文无需批复）+ 机制件 b90f56f（BK-0019 定界回写 + iterations/0059/{PRD/JOURNAL/REPORT}）已并入主干（合并 dab1278 零冲突，merge-base 0327566 零分叉）；修复轮 1 零产品改动（工作树门禁唯一红 s3-library 经四步取证裁定 issue#12 已知本机渲染瞬态抖动非本轮缺陷，处置按 PRD AC6 预案 + issue#12 纪律交脚本 rerun，JOURNAL §6）；主干复测四项全绿 exit 0（merge-arbiter 实跑，MERGE.md §2）：build ✓ · gate 复跑 20 场景 diffPx=0（首跑 s3 diffPx=21 按口径双留档以复跑为准）· npm test 30/30 · smoke 157/0，证据 docs/evolution/iterations/0059/evidence/（4 PNG + 五日志 + manifest；REPORT PASS 零 BUG / MERGE.md）；BK-0060 置 done（来源 T5 无 issue 无回执义务）、BK-0019 维持 proposed 晋升条件兑现归下轮 PLAN、BK-0047 依赖链解阻、BK-0045（0058 成果被脚本销毁）仍 ready 待重做轮；STATE 复位 idle、iteration 推进 0060
```
