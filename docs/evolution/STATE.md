# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0058      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-28 05:07  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0057（BK-0045 PTY 交互终端节点 UI：NDP 定义 + 画布终端节点 + 会话共享交互（修宪轮）——BK-9005 链终轮）终态 failed（修复循环耗尽，链终轮未闭合、issue#5/#14 留开放待重试）：BUG-0057-02（Major）——run 含并行第二根（如游离 terminal 节点）时 terminal handler 对面板已订阅会话的 agent 注入回显不在面板 xterm 渲染，判别矩阵 C/D 形态 2/2 复现（resid2.mjs）、完整 E2E 6/6 失败、同形态 diag 偶过=时序敏感高概率、服务端三证无责（node:done「已注入命令·回显 21 字」+ 独立流订阅者 live 收到注入帧 + 原生 curl SSE 完整至 run:done）、串行链（trigger→terminal / trigger→delay→terminal）实测完全正常，违反 AC3「同一面板可见其回显」与 AC6 M4 点位多根形态，后续修复须按 REPORT §4.3 矩阵 C/D 各 ≥2 轮全绿闭环；BUG-0057-01（Minor）smoke T 组断言 ID 与 0034 termview 撞号已修复（b442840 重编号 PT01-PT06）；成果已并入主干（合并 810835e 零冲突 + 补录 5d7fcdc 分支漏提交 terminal NDP 模块等价重建 +651/−31 + 2 PNG）；主干复测四项全绿 exit 0：build ✓ · gate 20 场景 diffPx=0 · npm test 30/30 · smoke 157/0（=0056 基线 151 + PT01-PT06），证据 docs/evolution/iterations/0057/evidence/（4 PNG + 6 日志 + manifest 落盘亲读）；BK-0045 置 failed（失败要点入 BACKLOG 备注）、metrics 追加 0057 行、STATE 复位 idle、iteration 推进 0058
```
