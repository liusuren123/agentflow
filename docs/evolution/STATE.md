# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0061      # 当前/下一个迭代号（CLOSE 时 +1）
phase: VERIFY     # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: BK-0045       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-28 09:44  # 本次迭代开始时间
updated: 2026-10-28 10:42  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: VERIFY 完成，判 FAIL→修复轮 1（V6②一点红）：核心目标 BUG-0057-02 收口达成（V5 两轮独立全量 PASS 170/FAIL 0 ×2 + PE3 C×10 采样失败率 0 ×2 + C/D 各 4 组独立全绿；smoke 157/0 实测；0057 机制件补录四件核验合规）；判红点 = BUG-0061-01（Minor·存量）：会话停止后面板状态行终态「流已结束」，exit 帧「会话已结束（reason）」文本被本地合成 end 帧覆盖（app.js:3267-3268），修复面一行级在 SPEC §6 清单内；V1-V3 build/gate/test 由工作流脚本已跑采信。详见 iterations/0061/REPORT.md §2
```
