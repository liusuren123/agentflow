# AgentFlow 进化待办池

> 项格式与状态定义见 WORKFLOW.md §3.2；选题只允许 `ready`。
> 优先级 P0 > P1 > P2；同优先级按表中顺序。
> 2026-10-22 周度治理（W43）：ready 队列由 2 项补至 6 项，新增 BK-0006 ~ BK-0011。

## 主池

| ID | 标题 | 类型 | 触UI | 优先 | 大小 | 状态 | 来源 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BK-0001 | 现状盘点：核对 ADR-0002 各 CP 落地状态与移植余量，细化 ROADMAP 里程碑 | doc | 否 | P0 | S | blocked | T1 | 迭代 0001 终态 blocked：防打转校验判定产品提交为空（docs/evolution 之外无任何改动）不予提交；盘点与 VERIFY 本身 PASS（iterations/0001/REPORT.md），ROADMAP 回写产出随归档提交入库，重立项口径待治理日裁定 |
| BK-0002 | 后端 E2E 冒烟脚本：`/api/v1` workflows/runs CRUD + `/api/v1/run` SSE 全事件链 | test | 否 | P1 | M | done | T2 | 迭代 0002 终态 done：`npm run smoke:server` 一键可跑（`tests/smoke/lib.mjs` + `smoke-server.mjs` + 根 package.json 一行，提交 79788a3）；正例两连跑 33 passed/0 failed、exit 0，负例 exit 1 带构建指引，VERIFY PASS 见 iterations/0002/REPORT.md；T3 各项 VERIFY 公共基座就位 |
| BK-0003 | 契约测试补齐：16 种节点注册表与 SSE 事件契约的 DEFS 漂移防护覆盖核对 | test | 否 | P1 | M | done | T2 | 迭代 0003 终态 done：默认值 33/33 全量断言 + 事件反例 12 条 + HANDLERS⊇NODES 三测试落地（defs-drift/events-negative/handlers-coverage，contract.test.mjs 原样未动），engine.ts:26 一词零行为导出 HANDLERS，根 test 链改 build:shared→build:server→test（产品提交 1551994）；VERIFY PASS 零缺陷（node --test 8/8、反演 a/b/c 与裸跑防御先红后还原复绿、E2E P1-P3 全过）见 iterations/0003/REPORT.md；ROADMAP T2-M1 关账 |
| BK-0006 | README 能力同步：补记 ADR-0006/0007 已落地能力（DELETE 端点 + 服务端工作流/历史回放） | doc | 否 | P1 | S | done | T4 | 迭代 0004 终态 done：四落点补记（:43 smoke:server 命令行 / :68 节标题更新至 ADR-0004~0007 / :74-77 两 DELETE 端点行含 404/409/内存注册表判据/事务级联四语义 / :78-83 双源句 + 前端能力 C1-C8），产品提交 01c6749（README.md +12/−3，净 +9 行 111→120，`git show --numstat` 实查）；VERIFY PASS 零缺陷（E1-E6 文档 E2E 独立复跑 + E7 smoke:server 33/33 + ai-sdk 抽查 7/7 + 浏览器在线态实操，iterations/0004/REPORT.md）；ROADMAP T4-M2 两验收点关账 |
| BK-0007 | websearch 引擎参数生效化：eng 参数路由（博查/SearXNG），未接入引擎如实降级 | capability | 否 | P1 | M | done | T3 | 迭代 0005 终态 done：eng 严格路由落地（博查严格走 BOCHA_API_KEY、SearXNG 严格走新增可选 env SEARXNG_URL：config zod 校验 + guard 动态主机网关；Bing/Google/未知值先发「未接入」warn 后回退链逐字保留），降级文案四分支互斥可断言，产品提交 a5b284f（7 文件 +154/−12，`git show --numstat` 实查）；VERIFY PASS 零缺陷（smoke:server 39/0 + 定向 E2E 13/0 + 反演演练红绿双向 + UI 抽查 8 项，iterations/0005/REPORT.md）；M1 博查正路径未实测（无密钥，PRD 标可选不阻断）留部署后点位；ROADMAP T3-M1 关账 |
| BK-0004 | 已知陷阱回归用例：portCache 失效场景（节点高度/变换变化后 measurePorts） | test | 否 | P2 | S | done | T2 | 迭代 0006 终态 done：`npm run test:canvas` 一键离线几何断言（tests/canvas/lib.mjs +147、geometry.mjs +216 + 根 package.json 一行，产品提交 570d163 含修复轮 1，`git show --numstat` 实查 +364/−0）；首轮 VERIFY FAIL（BUG-0001：单移除 app.js:1272 后 C5 反演不红）经修复轮 1 关闭——lib.fit 增 excludeIds 单往返定位新边 + C5 双时点断言（<220ms 自愈窗 + 300ms 稳定），复验 5/5 锁定点反演全红（B5 endDev=141.38px 与 SPEC §4.2 预测同量级、B1-B4 回归复命中）、现状 15 passed/0 failed 双跑一致、gate 4 场景 diffPx=0、smoke:server 39/0、改动面限 tests/canvas + package.json 一行（受保护路径零改动），VERIFY PASS 证据 iterations/0006/REPORT.md §9；AC7 现状结论：未发现存量失配（REQ-0004-06 预案未触发） |
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
