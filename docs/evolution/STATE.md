# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0071      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-31 04:08  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0070（BK-0048 BK-9006 子项·节点级 on-error 参数：NDP 全 21 类统一 onError/onErrorRetries 双参数（combo 跟随全局哨兵/跳过/重试/中止 + number 次数 0-5 默认 2）+ engine runNode 级 resolveOnError 逐调用解析（ADR-0022 §5 优先序：节点参数>env 全局默认>内建缺省 skip+0；陷阱破解=节点 retry 次数由节点参数承载、env retries=0 不使之退化）+ 属性面板 UI，修宪轮 issue#6 链末子项随链晋升 ready 并入选，BK-0020 引擎语义已落地解阻，v3 工作树轮 feat/0070-iter）终态 done——产品提交 10bf122（+1005/−209 文本恰 90 路径：engine +34/−12 / 21 类 NDP 双参数 42 文件 / baseline +441 / 契约测试三件联动 / golden 42 文件修宪轮 gate:update 恰一次重录恰枚举（ADR-0025，首跑 21/21 红 ≡ SPEC §4.2 枚举、重录 DOM 不变量与首跑捕获逐键全等）/ smoke OEN01-07 +117/−9）已并入主干（合并 53bf3c6 零冲突，merge-base 0922d25）；主干复测四项全绿 exit 0（merge-arbiter 实跑，MERGE.md §3）：build ✓（dist 723.72 kB）· gate **21 场景首跑全 pass diffPx=0**（evidence/gate.log 亲读 21 行 pass +「宪法门禁：通过 ✓」，复测阶段零 gate:update）· npm test **30/30** · smoke **196 passed / 0 failed**（含 OEN01-07 全 PASS）；VERIFY PASS 零产品缺陷零修复轮（REPORT §0，AC1~AC10 全过）；证据 docs/evolution/iterations/0070/{REPORT.md,SPEC.md,JOURNAL.md,MERGE.md,evidence/}（4 PNG + build/gate/test/smoke 四日志 + manifest）；**BK-9006 链闭合**（0037/0038/0039/0065/0070 五子项全终），issue#6 关单回执归脚本；主干健康，ready 队列：BK-0014 / BK-0018（重试）
```
