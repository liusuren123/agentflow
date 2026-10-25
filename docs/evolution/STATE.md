# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0033      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 18:40  # 本次迭代开始时间
updated: 2026-10-25 20:10  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0032 / BK-0034 CLOSE=done（goal 模式会话面板 UI，BK-9002 链终轮——协调者手动全流程：agent 节点主体双击入口（排除 .ntitle/.wdg/.port）+ 动态单例面板（会话流/输入区/停止/恢复列表）+ server-sync 四函数数据面 + SSE 恰 7 事件消费 + gate s9 golden-created；产品提交 49d54de +370/−3 恰白名单 7 文件、前端三文件纯插入、Skeleton/sessions.ts/shared/lock 零 diff；gate 10 场景 diffPx=0（s0~s8 零波及实测）、契约 30/30、smoke 104/0（零 shared 触及无 V09 假红）、canvas 15/0、五点位浏览器 E2E mock 后端全 PASS（真模型流式未跑如实标注）；BUILD 期两起环境/笔误闭环修复（入口守卫 defOf(n).type→n.type、node_modules/.bin 被裸 npx tsc 清空经 npm install 恢复）；issue#2 链终关单）——docs/evolution/iterations/0032/REPORT.md
```
