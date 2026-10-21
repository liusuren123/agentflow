# AgentFlow 进化待办池

> 项格式与状态定义见 WORKFLOW.md §3.2；选题只允许 `ready`。
> 优先级 P0 > P1 > P2；同优先级按表中顺序。

## 主池

| ID | 标题 | 类型 | 触UI | 优先 | 大小 | 状态 | 来源 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BK-0001 | 现状盘点：核对 ADR-0002 各 CP 落地状态与移植余量，细化 ROADMAP 里程碑 | doc | 否 | P0 | S | ready | T1 | 产出写入 ROADMAP.md；不写代码 |
| BK-0002 | 后端 E2E 冒烟脚本：`/api/v1` workflows/runs CRUD + `/api/v1/run` SSE 全事件链 | test | 否 | P1 | M | ready | T2 | 脚本落 `tests/` 或 `apps/server`，一键可跑 |
| BK-0003 | 契约测试补齐：16 种节点注册表与 SSE 事件契约的 DEFS 漂移防护覆盖核对 | test | 否 | P1 | M | proposed | T2 | 先核对 `npm test` 现有覆盖再补差 |
| BK-0004 | 已知陷阱回归用例：portCache 失效场景（节点高度/变换变化后 measurePorts） | test | 否 | P2 | S | proposed | T2 | 陷阱出处 AGENTS.md「已知陷阱」 |
| BK-0005 | MCP 工具能力核对：sqlite/browser 未实现项的如实降级文案与日志一致性 | debt | 否 | P2 | S | proposed | T3 | 不伪造结果原则 |

## 待批准区（触 UI —— 用户主权接口）

> 用户在本区批复「批准」即进入修宪通道：spec-designer 补全 ADR（动机/影响面/像素对比
> 证据）→ 用户最终批准 → 实现 → 同一变更内重录 golden。未批复项心跳永不触碰。

| ID | 标题 | 类型 | 触UI | 优先 | 状态 | ADR 草案 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BK-9001 | 底部日志面板按级别过滤（info/warn/error） | ui-proposal | 是 | P2 | pending-approval | - | 示范项：等待用户批复或驳回 |
