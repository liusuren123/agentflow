# AgentFlow 进化待办池

> 项格式与状态定义见 WORKFLOW.md §3.2；选题只允许 `ready`。
> 优先级 P0 > P1 > P2；同优先级按表中顺序。
> 2026-10-22 周度治理（W43）：ready 队列由 2 项补至 6 项，新增 BK-0006 ~ BK-0011。
> 2026-10-22 迭代 0007 补题轮（终态 replenished，CLOSE 于 18:24）：ready 归零后补 4 项
> （新增 BK-0012，晋升 BK-0005/0010/0011），防重复对照与依据见 iterations/0007/PRD.md；
> 本轮无实现、无产品提交；AC1-AC6 核对通过（AC5：改动全限 docs/evolution/）。

## 主池

| ID | 标题 | 类型 | 触UI | 优先 | 大小 | 状态 | 来源 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BK-0001 | 现状盘点：核对 ADR-0002 各 CP 落地状态与移植余量，细化 ROADMAP 里程碑 | doc | 否 | P0 | S | blocked | T1 | 迭代 0001 终态 blocked：防打转校验判定产品提交为空（docs/evolution 之外无任何改动）不予提交；盘点与 VERIFY 本身 PASS（iterations/0001/REPORT.md），ROADMAP 回写产出随归档提交入库，重立项口径待治理日裁定 |
| BK-0002 | 后端 E2E 冒烟脚本：`/api/v1` workflows/runs CRUD + `/api/v1/run` SSE 全事件链 | test | 否 | P1 | M | done | T2 | 迭代 0002 终态 done：`npm run smoke:server` 一键可跑（`tests/smoke/lib.mjs` + `smoke-server.mjs` + 根 package.json 一行，提交 79788a3）；正例两连跑 33 passed/0 failed、exit 0，负例 exit 1 带构建指引，VERIFY PASS 见 iterations/0002/REPORT.md；T3 各项 VERIFY 公共基座就位 |
| BK-0003 | 契约测试补齐：16 种节点注册表与 SSE 事件契约的 DEFS 漂移防护覆盖核对 | test | 否 | P1 | M | done | T2 | 迭代 0003 终态 done：默认值 33/33 全量断言 + 事件反例 12 条 + HANDLERS⊇NODES 三测试落地（defs-drift/events-negative/handlers-coverage，contract.test.mjs 原样未动），engine.ts:26 一词零行为导出 HANDLERS，根 test 链改 build:shared→build:server→test（产品提交 1551994）；VERIFY PASS 零缺陷（node --test 8/8、反演 a/b/c 与裸跑防御先红后还原复绿、E2E P1-P3 全过）见 iterations/0003/REPORT.md；ROADMAP T2-M1 关账 |
| BK-0006 | README 能力同步：补记 ADR-0006/0007 已落地能力（DELETE 端点 + 服务端工作流/历史回放） | doc | 否 | P1 | S | done | T4 | 迭代 0004 终态 done：四落点补记（:43 smoke:server 命令行 / :68 节标题更新至 ADR-0004~0007 / :74-77 两 DELETE 端点行含 404/409/内存注册表判据/事务级联四语义 / :78-83 双源句 + 前端能力 C1-C8），产品提交 01c6749（README.md +12/−3，净 +9 行 111→120，`git show --numstat` 实查）；VERIFY PASS 零缺陷（E1-E6 文档 E2E 独立复跑 + E7 smoke:server 33/33 + ai-sdk 抽查 7/7 + 浏览器在线态实操，iterations/0004/REPORT.md）；ROADMAP T4-M2 两验收点关账 |
| BK-0007 | websearch 引擎参数生效化：eng 参数路由（博查/SearXNG），未接入引擎如实降级 | capability | 否 | P1 | M | done | T3 | 迭代 0005 终态 done：eng 严格路由落地（博查严格走 BOCHA_API_KEY、SearXNG 严格走新增可选 env SEARXNG_URL：config zod 校验 + guard 动态主机网关；Bing/Google/未知值先发「未接入」warn 后回退链逐字保留），降级文案四分支互斥可断言，产品提交 a5b284f（7 文件 +154/−12，`git show --numstat` 实查）；VERIFY PASS 零缺陷（smoke:server 39/0 + 定向 E2E 13/0 + 反演演练红绿双向 + UI 抽查 8 项，iterations/0005/REPORT.md）；M1 博查正路径未实测（无密钥，PRD 标可选不阻断）留部署后点位；ROADMAP T3-M1 关账 |
| BK-0004 | 已知陷阱回归用例：portCache 失效场景（节点高度/变换变化后 measurePorts） | test | 否 | P2 | S | done | T2 | 迭代 0006 终态 done：`npm run test:canvas` 一键离线几何断言（tests/canvas/lib.mjs +147、geometry.mjs +216 + 根 package.json 一行，产品提交 570d163 含修复轮 1，`git show --numstat` 实查 +364/−0）；首轮 VERIFY FAIL（BUG-0001：单移除 app.js:1272 后 C5 反演不红）经修复轮 1 关闭——lib.fit 增 excludeIds 单往返定位新边 + C5 双时点断言（<220ms 自愈窗 + 300ms 稳定），复验 5/5 锁定点反演全红（B5 endDev=141.38px 与 SPEC §4.2 预测同量级、B1-B4 回归复命中）、现状 15 passed/0 failed 双跑一致、gate 4 场景 diffPx=0、smoke:server 39/0、改动面限 tests/canvas + package.json 一行（受保护路径零改动），VERIFY PASS 证据 iterations/0006/REPORT.md §9；AC7 现状结论：未发现存量失配（REQ-0004-06 预案未触发） |
| BK-0005 | MCP 工具能力核对：sqlite/browser 未实现项的如实降级文案与日志一致性 | debt | 否 | P2 | S | done | T3 | 迭代 0009 终态 done：tools.ts stub 工厂显式化（stubOf/STUB_MARK/isStubImpl，载荷逐字保留、IMPL 追加 export 供断言）+ llm.ts stub 调用 SSE lvl warn/sys 与 pino level40+stub:true/level30 双路路由 + preview bound 200（真实路径维持 60）+ ✓ 摘要「（N 未接入）」分项（无 stub 时逐字节同旧），新增 tests/smoke/mcp-stubs.mjs（M01-M11）挂接 smoke:server；产品提交 50dd43e（恰 SPEC §7 四文件白名单 +160/−7，`git show --numstat` 实查；apps/web 与 packages/shared 零触及）；VERIFY PASS 6/6 AC 零缺陷（smoke:server 亲跑 50 passed/0 failed + 反演演练四步篡改全红→还原复绿 sha256 一致 + DEEPSEEK 真模型 E2E 9/0，iterations/0009/REPORT.md）；矩阵终论 20 格：修复 10（触点3/4 ×5）/维持 10（触点1/2 ×5），三疑点 A/B/C 实判全成立；BK-0008 摘标记/删 stub 路径已有 M07 断言守护 |
| BK-0008 | sqlite MCP 工具真实接入：query/execute 落地 better-sqlite3，DB 锚定 sandbox 专用文件 | capability | 否 | P2 | M | proposed | T3 | 消除 tools.ts `'sqlite': null` 降级；BK-0002/0005 完成后转 ready；沙箱禁越界随 SPEC 评审 |
| BK-0009 | browser MCP 工具可行性评估 ADR 草案：headless 资源预算/超时并发约束/放弃条件 | doc | 否 | P2 | M | proposed | T3 | 仅评估不实现，不引入依赖；架构选型 ADR（非宪法类） |
| BK-0010 | golden 场景扩充提案 ADR 草案：工作流/历史面板在线态（s4/s5）基线扩充 | doc | 否 | P2 | S | ready | T2 | 草案完成后入待批准区；实现触 golden 基线与 tools/pixel-gate/，须用户批准（宪法第 3 条）后另行立项；0007 补题轮晋升 ready——现状核实 gate 仅 s0-s3 四场景（gate.mjs:61-64，无 s4/s5），T2-M3 承载项至今无迭代承载；本项产出仅 ADR 草案与待批准区条目，零 golden/pixel-gate 改动 |
| BK-0011 | 悬挂 run 启动终结标记：服务启动时将上次进程遗留的 running 状态 run 收尾 | capability | 否 | P2 | S | ready | T3 | 周报 W43 体检 O1（库里 1 条 running 悬挂记录）；状态值沿用现有枚举、不新增契约字段；若 SPEC 评审发现触 UI 则转待批准区；0007 补题轮晋升 ready——现状核实服务启动无悬挂 run 收尾逻辑（server.ts 全文 grep "running" 仅 :179 注释；store.ts 无启动扫尾），runs 插入即 'running'（store.ts:106）、进程崩溃即永久悬挂；与 BK-0002 冒烟 409 断言（内存注册表判活）正交 |
| BK-0012 | legacy 模块与 React 骨架职责边界文档化：四模块边界说明合入 docs/（ROADMAP T1-M2） | doc | 否 | P1 | S | done | T1 | 迭代 0008 终态 done：docs/frontend-module-boundaries.md 纯新增 178 行（四模块各一节×四要素 + 总览表 + 组合时序四步 + /api 作用域精确化注记，全部断言挂事实指针），产品提交 1ff70fb（`git show --numstat` 实查 +178/−0）；VERIFY PASS 6/6 AC 零缺陷（行数 182/2419/131/532 零漂移 + 指针抽查 30+ 条全中 + test:canvas 15/0 + 改动面白名单达成），证据 iterations/0008/REPORT.md；ROADMAP T1-M2 关账（T1 四里程碑全部闭环） |

## 待批准区（已迁移 GitHub Issues · v2）

> 触 UI 项由脚本开 `needs-approval` issue（用户评论「批准 / 驳回」，手机可达；
> 批复仅认 owner 本人，循环评论带 🤖 前缀），本表不再维护。
> 历史在档迁移：BK-9001 → liusuren123/agentflow#1。
