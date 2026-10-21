# AgentFlow 进化待办池

> 项格式与状态定义见 WORKFLOW.md §3.2；选题只允许 `ready`。
> 优先级 P0 > P1 > P2；同优先级按表中顺序。
> 2026-10-22 周度治理（W43）：ready 队列由 2 项补至 6 项，新增 BK-0006 ~ BK-0011。

## 主池

| ID | 标题 | 类型 | 触UI | 优先 | 大小 | 状态 | 来源 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BK-0001 | 现状盘点：核对 ADR-0002 各 CP 落地状态与移植余量，细化 ROADMAP 里程碑 | doc | 否 | P0 | S | blocked | T1 | 迭代 0001 终态 blocked：防打转校验判定产品提交为空（docs/evolution 之外无任何改动）不予提交；盘点与 VERIFY 本身 PASS（iterations/0001/REPORT.md），ROADMAP 回写产出随归档提交入库，重立项口径待治理日裁定 |
| BK-0002 | 后端 E2E 冒烟脚本：`/api/v1` workflows/runs CRUD + `/api/v1/run` SSE 全事件链 | test | 否 | P1 | M | ready | T2 | 一键可跑（建议 `npm run smoke:server`）；是 T3 各项 VERIFY 的公共基座，故列 P1 表首 |
| BK-0003 | 契约测试补齐：16 种节点注册表与 SSE 事件契约的 DEFS 漂移防护覆盖核对 | test | 否 | P1 | M | ready | T2 | 已核对现状（2026-10-22）：默认值仅 6/33 抽样断言、HANDLERS 键集无防护、事件反例仅 2 条；补差点见 ROADMAP T2-M1 |
| BK-0006 | README 能力同步：补记 ADR-0006/0007 已落地能力（DELETE 端点 + 服务端工作流/历史回放） | doc | 否 | P1 | S | ready | T4 | 2026-10-22 核实 README 止于 ADR-0005（无 DELETE/删除记述）；纯文档 |
| BK-0007 | websearch 引擎参数生效化：eng 参数路由（博查/SearXNG），未接入引擎如实降级 | capability | 否 | P1 | M | ready | T3 | 现状 `apps/server/src/handlers.ts` 完全忽略 p.eng；不改 shared DEFS；新增可选 env 走 config zod；VERIFY 依赖 BK-0002 |
| BK-0004 | 已知陷阱回归用例：portCache 失效场景（节点高度/变换变化后 measurePorts） | test | 否 | P2 | S | ready | T2 | 陷阱出处 AGENTS.md「已知陷阱」；新测试独立于 tools/pixel-gate/（不改门禁），仅新增文件 |
| BK-0005 | MCP 工具能力核对：sqlite/browser 未实现项的如实降级文案与日志一致性 | debt | 否 | P2 | S | proposed | T3 | 不伪造结果原则；在 BK-0008 之前执行，若 sqlite 已真实接入则范围缩减为 browser |
| BK-0008 | sqlite MCP 工具真实接入：query/execute 落地 better-sqlite3，DB 锚定 sandbox 专用文件 | capability | 否 | P2 | M | proposed | T3 | 消除 tools.ts `'sqlite': null` 降级；BK-0002/0005 完成后转 ready；沙箱禁越界随 SPEC 评审 |
| BK-0009 | browser MCP 工具可行性评估 ADR 草案：headless 资源预算/超时并发约束/放弃条件 | doc | 否 | P2 | M | proposed | T3 | 仅评估不实现，不引入依赖；架构选型 ADR（非宪法类） |
| BK-0010 | golden 场景扩充提案 ADR 草案：工作流/历史面板在线态（s4/s5）基线扩充 | doc | 否 | P2 | S | proposed | T2 | 草案完成后入待批准区；实现触 golden 基线与 tools/pixel-gate/，须用户批准（宪法第 3 条）后另行立项 |
| BK-0011 | 悬挂 run 启动终结标记：服务启动时将上次进程遗留的 running 状态 run 收尾 | capability | 否 | P2 | S | proposed | T3 | 周报 W43 体检 O1（库里 1 条 running 悬挂记录）；状态值沿用现有枚举、不新增契约字段；若 SPEC 评审发现触 UI 则转待批准区 |

## 待批准区（触 UI —— 用户主权接口）

> 用户在本区批复「批准」即进入修宪通道：spec-designer 补全 ADR（动机/影响面/像素对比
> 证据）→ 用户最终批准 → 实现 → 同一变更内重录 golden。未批复项心跳永不触碰。

| ID | 标题 | 类型 | 触UI | 优先 | 状态 | ADR 草案 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| BK-9001 | 底部日志面板按级别过滤（info/warn/error） | ui-proposal | 是 | P2 | pending-approval | - | 示范项：等待用户批复或驳回 |
