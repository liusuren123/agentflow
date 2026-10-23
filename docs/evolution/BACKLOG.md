# AgentFlow 进化待办池

> 项格式与状态定义见 WORKFLOW.md §3.2；选题只允许 `ready`。
> 优先级 P0 > P1 > P2；同优先级按表中顺序。
> 2026-10-22 周度治理（W43）：ready 队列由 2 项补至 6 项，新增 BK-0006 ~ BK-0011。
> 2026-10-22 迭代 0007 补题轮（终态 replenished，CLOSE 于 18:24）：ready 归零后补 4 项
> （新增 BK-0012，晋升 BK-0005/0010/0011），防重复对照与依据见 iterations/0007/PRD.md；
> 本轮无实现、无产品提交；AC1-AC6 核对通过（AC5：改动全限 docs/evolution/）。
> 2026-10-23 用户会话立项（头脑风暴经用户确认落盘）：草案主题 T5「智能体运行时与
> 工作台」——主池新增 BK-0013~0020（触UI=否，均 proposed；其中六项实现轮涉 POLICY
> 需批准区要点，已在备注标注），触 UI 项 BK-9002~9006 随 v2 机制开 needs-approval
> issues #2~#6；T5 待治理日 PM 正式并图。
> 2026-10-23 第二次周度治理（W43）：BK-0001 终局改判 done（VERIFY PASS+交付物在库，
> v1 判空根因已由 v2 消除）；BK-0008/0016/0017 晋升 ready；BK-0010 治理日批处理消化
> （ADR-0009 草案 + needs-approval issue #7）转 done；新增 BK-0022（BUG-0012 修复，
> dogfooding 发现）与 BK-0023/BK-0024（调研立项）；T5 正式并图（ROADMAP）；ready
> 非 doc 队列 5 项（BK-0022/0016/0017/0011/0008）。
> 2026-10-24 迭代 0011 PLAN 轮（批复同步）：心跳档案「approved：无」滞后于实况——
> PLAN 会话 gh 亲核用户已于 2026-10-23T15:48~15:50Z 批复 #1~#5/#7/#8 七项；按
> WORKFLOW §4 优先序①全部落 ready P0（新增 BK-0025/BK-0026，BK-9001~9005 入主池），
> 本轮选 BK-0026（issue#7 修宪轮）；#6 未获批维持待批准；#9 经核实三处 AGENTS.md
> 漂移用户已亲改在库、不建行（禁止区）。存证见 iterations/0011/PRD.md 选题过程存证。

## 主池

| ID | 标题 | 类型 | 触UI | 优先 | 大小 | 状态 | 来源 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BK-0026 | golden 场景扩充实现：s4 工作流面板在线态 / s5 历史面板在线态（ADR-0009） | test | 否 | P0 | M | done | issue#7 | 迭代 0011 终态 done：gate.mjs 147→225 行（HEALTH_FIXTURE/WF_ROUTES/RUN_ROUTES 三路由 fixture 含 /api/health probe、wfReady/runReady 确定性等待、wfInv/runInv 不变量增量、runScenario 四处增强；s0~s3 四行零字节改动）+ ADR-0009 状态行/显著声明改已批准口径（issue#7，2026-10-23T15:48:48Z）+ s4/s5 四基线经 golden-created 通道落盘（gate.mjs:192-196，未用 gate:update，ADR §5 通道兑现）；产品提交 e3bf60b（+227/−22 + 2 PNG 二进制，`git show --numstat` 实查；产品渲染路径 apps/web、apps/server、packages/shared、.github 与既有 8 基线零触及）；VERIFY PASS 零 BUG（AC1~AC5 过：gate 6/6 diffPx=0 实跑复绿、s0~s3 逐字节零漂移、AC3 反演红→绿、npm test 8/8、交互抽查 17/17；AC6 属推送后义务未到时点），证据 iterations/0011/REPORT.md；BK-0010 的实现阶段就此关账，ROADMAP T2-M3 实现段回写留治理日 PM |
| BK-0025 | CI 补 SIGTERM 优雅停机断言（周报 W43 观察 O4） | test | 否 | P0 | S | done | issue#8 | 迭代 0012 终态 done：tests/smoke/shutdown-sigterm.mjs 新增 185 行（P01/P02 前置缺产物 FAIL 不静默 + H01 spawn dist/server.js 健康探针就绪 + T01-T04 停机三要素断言：stdout 先「优雅停机开始（signal=SIGTERM）」后「优雅停机完成」、退出码 0、端口探针 ECONNREFUSED、无强制退出 warn；win32 SKIP+原因+权威路径说明 exit 0）+ package.json 恰 +1 行 smoke:shutdown + .github/workflows/ci.yml contracts job +5 行（恰 2 step，ui-constitution job 零改动），产品提交 592be6e（恰 PRD REQ-0025-05 白名单三处 +191/−0，`git show --numstat` 实查；apps/web/packages/shared/apps/server src 零触及）；VERIFY PASS 零 BUG（AC2 等价反演：临时副本唯一篡改 win32 guard → 真实 T 组实跑 T01/T02 双 FAIL EXIT=1、还原复绿零残留 / AC3 本机 SKIP EXIT=0 / AC5 smoke:server 50/50 + test:canvas 15/15 实跑 / AC6 gh 亲核批复），证据 iterations/0012/REPORT.md；AC1 PASS 路径与 AC4 CI 绿属 CI 权威未到时点（沿 0011 先例不判过不判挂），移交推送后盯 contracts job；BUILD 偏差 1（CI build step 补 npm run build——server.ts:52-56 对 web dist 硬依赖，contracts job 原序列不产出）记 JOURNAL §2 判实现级必要调整；授权链：issue#8 用户批复 2026-10-23T15:48:25Z（CI 属 POLICY 需批准区已获批；无 golden/UI 接触，非修宪轮） |
| BK-9001 | 底部日志面板按级别过滤（info/warn/error） | ui-proposal | 是 | P0 | M | ready | issue#1 | 修宪通道：ADR 入 docs/adr/（标注已获用户 issue#1 批复 2026-10-23T15:50:05Z）→ 实现 → 同迭代重录 golden；触 UI=是，仅在修宪轮通道内可选取 |
| BK-9002 | 通用智能体节点 + goal 模式会话面板 | ui-proposal | 是 | P0 | L | ready | issue#2 | 修宪通道同上（issue#2 批复 2026-10-23T15:49:39Z）；前置：BK-0016 会话 API + BK-0021 NDP（ROADMAP T5-M3「先迁移后扩展，不得跳过」）；L 项先拆分再实现（BK-0013 先例），SPEC 先行 |
| BK-9003 | 呈现三件套节点：网页展示 / 终端只读流 / JSON 画布 | ui-proposal | 是 | P0 | L | ready | issue#3 | 修宪通道同上（issue#3 批复 2026-10-23T15:49:32Z）；前置：BK-0021 NDP（三个新节点一律按 NDP 定义）；L 项先拆分再实现 |
| BK-9004 | 会话面板右侧工作台：git 信息 / diff 审查 compare / 项目目录树 | ui-proposal | 是 | P0 | L | ready | issue#4 | 修宪通道同上（issue#4 批复 2026-10-23T15:49:17Z）；前置：BK-0016 持久会话 API；建议治理日拆分排序（三特性可分批修宪） |
| BK-9005 | 交互式 PTY 终端节点（用户与 agent 共享 shell 会话） | ui-proposal | 是 | P0 | L | ready | issue#5 | 修宪通道同上（issue#5 批复 2026-10-23T15:49:06Z）；立项语「安全世界设计先行」——SPEC 须先出安全方案；前置：BK-0021 NDP；L 项先拆分再实现 |
| BK-0001 | 现状盘点：核对 ADR-0002 各 CP 落地状态与移植余量，细化 ROADMAP 里程碑 | doc | 否 | P0 | S | done | T1 | 2026-10-23 治理日终局改判 done（原 blocked）：VERIFY 本身 PASS（AC1–AC5 全过，iterations/0001/REPORT.md「结论 PASS」+ 矛盾清单空）且全部交付物已在库——盘点矩阵/余量清单在 iterations/0001/{REPORT,JOURNAL}.md、ROADMAP 回写内容（+24/−10）已随归档提交入库（现行 ROADMAP.md T1-M1 关账文本即其产物）；blocked 根因是 v1 防打转校验对「改动全在 docs/evolution/ 的产品提交」判空，v2（doc 项归治理日批处理）已结构性消除，重跑无增量信息；metrics 0001 行维持历史原样不改写 |
| BK-0002 | 后端 E2E 冒烟脚本：`/api/v1` workflows/runs CRUD + `/api/v1/run` SSE 全事件链 | test | 否 | P1 | M | done | T2 | 迭代 0002 终态 done：`npm run smoke:server` 一键可跑（`tests/smoke/lib.mjs` + `smoke-server.mjs` + 根 package.json 一行，提交 79788a3）；正例两连跑 33 passed/0 failed、exit 0，负例 exit 1 带构建指引，VERIFY PASS 见 iterations/0002/REPORT.md；T3 各项 VERIFY 公共基座就位 |
| BK-0003 | 契约测试补齐：16 种节点注册表与 SSE 事件契约的 DEFS 漂移防护覆盖核对 | test | 否 | P1 | M | done | T2 | 迭代 0003 终态 done：默认值 33/33 全量断言 + 事件反例 12 条 + HANDLERS⊇NODES 三测试落地（defs-drift/events-negative/handlers-coverage，contract.test.mjs 原样未动），engine.ts:26 一词零行为导出 HANDLERS，根 test 链改 build:shared→build:server→test（产品提交 1551994）；VERIFY PASS 零缺陷（node --test 8/8、反演 a/b/c 与裸跑防御先红后还原复绿、E2E P1-P3 全过）见 iterations/0003/REPORT.md；ROADMAP T2-M1 关账 |
| BK-0004 | 已知陷阱回归用例：portCache 失效场景（节点高度/变换变化后 measurePorts） | test | 否 | P2 | S | done | T2 | 迭代 0006 终态 done：`npm run test:canvas` 一键离线几何断言（tests/canvas/lib.mjs +147、geometry.mjs +216 + 根 package.json 一行，产品提交 570d163 含修复轮 1）；首轮 VERIFY FAIL（BUG-0001：单移除 app.js:1272 后 C5 反演不红）经修复轮 1 关闭——lib.fit 增 excludeIds + C5 双时点断言，复验 5/5 锁定点反演全红、现状 15 passed/0 failed 双跑一致、gate 4 场景 diffPx=0，VERIFY PASS 证据 iterations/0006/REPORT.md §9；AC7 现状结论：未发现存量失配 |
| BK-0005 | MCP 工具能力核对：sqlite/browser 未实现项的如实降级文案与日志一致性 | debt | 否 | P2 | S | done | T3 | 迭代 0009 终态 done：tools.ts stub 工厂显式化 + llm.ts stub 调用双路路由 + preview bound 200 + ✓ 摘要「（N 未接入）」分项，新增 tests/smoke/mcp-stubs.mjs（M01-M11）挂接 smoke:server；产品提交 50dd43e（恰 SPEC §7 四文件白名单，apps/web 与 packages/shared 零触及）；VERIFY PASS 6/6 AC 零缺陷（smoke:server 亲跑 50/0 + 反演演练 + DEEPSEEK 真模型 E2E 9/0，iterations/0009/REPORT.md）；BK-0008 摘标记/删 stub 路径已有 M07 断言守护 |
| BK-0006 | README 能力同步：补记 ADR-0006/0007 已落地能力（DELETE 端点 + 服务端工作流/历史回放） | doc | 否 | P1 | S | done | T4 | 迭代 0004 终态 done：四落点补记（:43 smoke:server 命令行 / :68 节标题更新至 ADR-0004~0007 / :74-77 两 DELETE 端点行 / :78-83 双源句 + 前端能力 C1-C8），产品提交 01c6749；VERIFY PASS 零缺陷（E1-E6 文档 E2E + E7 smoke 33/33 + ai-sdk 抽查 7/7，iterations/0004/REPORT.md）；ROADMAP T4-M2 两验收点关账 |
| BK-0007 | websearch 引擎参数生效化：eng 参数路由（博查/SearXNG），未接入引擎如实降级 | capability | 否 | P1 | M | done | T3 | 迭代 0005 终态 done：eng 严格路由落地（博查→BOCHA_API_KEY、SearXNG→SEARXNG_URL：config zod + guard 动态主机网关；Bing/Google/未知值先发「未接入」warn 后回退链逐字保留），产品提交 a5b284f（7 文件 +154/−12）；VERIFY PASS 零缺陷（smoke 39/0 + 定向 E2E 13/0 + 反演红绿双向，iterations/0005/REPORT.md）；博查正路径无密钥未实测（PRD 标可选）；ROADMAP T3-M1 关账 |
| BK-0008 | sqlite MCP 工具真实接入：query/execute 落地 better-sqlite3，DB 锚定 sandbox 专用文件 | capability | 否 | P2 | M | ready | T3 | 2026-10-23 治理日晋升 ready：前置 BK-0002（迭代 0002 done）/BK-0005（迭代 0009 done，M07 断言已守护 stub 标记路径）均满足；better-sqlite3 为既有依赖（根 package.json allowScripts + store.ts 在用）、进程内 DB 无出站、无新增 env → POLICY 自主区；实现轮须同步把 tests/smoke/mcp-stubs.mjs M07 断言口径由「stub 如实降级」更新为「真实实现」；沙箱禁越界随 SPEC 评审 |
| BK-0009 | browser MCP 工具可行性评估 ADR 草案：headless 资源预算/超时并发约束/放弃条件 | doc | 否 | P2 | M | proposed | T3 | 仅评估不实现，不引入依赖；架构选型 ADR（非宪法类）；doc 项心跳不选（v2），下一治理日批处理候选 |
| BK-0010 | golden 场景扩充提案 ADR 草案：工作流/历史面板在线态（s4/s5）基线扩充 | doc | 否 | P2 | S | done | T2 | 2026-10-23 治理日批处理消化：ADR-0009 草案产出（docs/adr/0009-golden-s4-s5-online-panels.md）+ needs-approval issue #7；实现轮（golden 基线扩充与 tools/pixel-gate/ 改动）待用户批准后另行立项，批准前零实现；现状依据：gate 仅 s0-s3 四场景（gate.mjs:60-65） |
| BK-0011 | 悬挂 run 启动终结标记：服务启动时将上次进程遗留的 running 状态 run 收尾 | capability | 否 | P2 | S | ready | T3 | 周报 W43 体检 O1（2026-10-23 复核仍 1 条 running 悬挂记录）；状态值沿用现有枚举、不新增契约字段；若 SPEC 评审发现触 UI 则转待批准区；0007 补题轮晋升 ready——现状核实服务启动无悬挂 run 收尾逻辑（server.ts 全文 grep "running" 仅 :179 注释；store.ts 无启动扫尾），runs 插入即 'running'（store.ts:106）、进程崩溃即永久悬挂；与 BK-0002 冒烟 409 断言（内存注册表判活）正交 |
| BK-0012 | legacy 模块与 React 骨架职责边界文档化：四模块边界说明合入 docs/（ROADMAP T1-M2） | doc | 否 | P1 | S | done | T1 | 迭代 0008 终态 done：docs/frontend-module-boundaries.md 纯新增 178 行，产品提交 1ff70fb；VERIFY PASS 6/6 AC 零缺陷（行数四模块 182/2419/131/532 零漂移 + 指针抽查 30+ 条全中），证据 iterations/0008/REPORT.md；ROADMAP T1-M2 关账（T1 四里程碑全部闭环） |
| BK-0013 | 真 MCP client 基座：连接外部 MCP server（stdio / Streamable HTTP），工具清单发现与转发执行 | capability | 否 | P1 | L | proposed | T5 | 现状为内置伪 MCP（tools.ts IMPL 与前端 MCP_SERVERS 一一对应，连不了任意外部 server）；L 项先拆分再立项（2026-10-23 治理日裁定）：建议拆为 (a) 传输层 client（stdio/HTTP）(b) 注册与工具发现 (c) 会话注入与 guard 出站类别扩展，各 M 级；实现轮涉新增 npm 依赖 + 新增出站类别（POLICY 需批准区）→ 拆分 SPEC 定稿后开 needs-approval |
| BK-0014 | 智能体扩展发现器：扫描项目 .mcp.json / .agents/ 与 ~/.agents/ 下的 mcp/skill/rules 并注册进会话上下文 | capability | 否 | P2 | M | proposed | T5 | 依赖 BK-0013；~/.agents 为用户主权区，自动注入须白名单 + 首次确认 + 审计留痕；实现轮涉新增出站类别（POLICY 需批准区） |
| BK-0015 | LLM 节点自主 agent loop：停止条件、步数/token 预算、中断与恢复 | capability | 否 | P1 | M | proposed | T5 | llm.ts:66-77 现为定长 round≤3 工具循环（治理日复核锚点成立）；prepareStep/stopWhen 零新依赖；预算承载三选一均触需批准区（新 env=环境变量语义；新节点参数=DEFS+触 UI；引擎常量=无预算意义），治理日维持 proposed：SPEC 先行产出「最小需批准面」方案后开 needs-approval |
| BK-0016 | 持久会话与流式会话 API：sessions/messages 表、会话级 SSE 端点、停止信号、列出/恢复/续聊 | capability | 否 | P1 | M | ready | T5 | 2026-10-23 治理日晋升 ready：SQLite 基座已有（ADR-0005）、停止复用 ctx.ac.signal、REST 新端点挂 /api/v1 均自主区；护栏（PM 校准新增）：会话流式若需新增 SSE 事件类型即触 packages/shared/src/events.ts 契约（POLICY 需批准区）——PRD/SPEC 必须优先以现有 15 种事件类型（events.ts:8-36）承载；SPEC 定案发现必须新增 → 转 pending-approval 开 issue，本迭代按中止处理；BK-9002 goal 模式 UI 的后端地基 |
| BK-0017 | 智能体互审协议（引擎侧）：approval 审批人支持节点引用（role 值 node:id 前缀），子任务派发 → 结构化裁决 → 回填续跑 + 审计日志 | capability | 否 | P1 | M | ready | T5 | 2026-10-23 治理日晋升 ready（治理日复核：nodes.ts:104 role 为自由 text，零 DEFS 落点成立；approval:required/done 均既有事件，events.ts:26-27）；审计表落 store.ts、裁决 zod 校验（verdict: allow/deny + 理由）拒收自由文本、超时降级沿用既有「超时策略」参数——全后端，纯 POLICY 自主区 |
| BK-0018 | 跨 run 记忆工具组：memory.get/set/list 以内建工具实装 | capability | 否 | P2 | S | proposed | T5 | env 开关启用时 llm handler 额外注入（不进前端 MCP_SERVERS 勾选清单——app.js:103 硬编码，清单扩展触 UI 归 BK-9006）；存储用现有 SQLite；实现轮 env 语义 needs-approval |
| BK-0019 | 知识库管理管道后端：上传 → 切分 → 嵌入 → 入库，retrieval 检索真实化 | capability | 否 | P2 | M | proposed | T5 | 消除写死的 demo kb（nodes.ts:41 三个固定名）；嵌入存储选型 SPEC 定（SQLite 向量扩展 vs 独立库），若新增依赖 → needs-approval；kb 参数选项动态化触 UI 归 BK-9006，本项先以映射表承接三个固定名 |
| BK-0020 | 引擎级错误处理策略：on-error（重试/跳过/中止）引擎实现 | capability | 否 | P2 | S | proposed | T5 | 现状任一节点失败整个 run 即挂（engine 无降级路径）；引擎级 env 承载 → env 语义 needs-approval；节点粒度参数化（新参数=DEFS）归 BK-9006 |
| BK-0021 | 节点定义目录制迁移：16 节点按 NDP 拆分为 src/nodes/&lt;type&gt;/{node.ts,README.md}，nodes.ts 降为聚合层 | refactor | 否 | P1 | L | proposed | T5 | 规范 docs/node-definition-protocol.md **v0.2**（2026-10-23 经用户会话批准输出 + 53 条评审标注修订留档 node-definition-protocol-review-notes.md）；加载机制定死 node.ts 数据模块；验收按 v0.2 §10 九条（结构快照逐字节比对 + 行为探针 + 契约测试零改动全绿 + gate + 在线态人工 E2E + 参数键名↔handler 引用守卫）；POLICY 从严维持（2026-10-23 治理日复核）：虽以等价重命名为目标，改动落 packages/shared 即入需批准区「shared DEFS 变更」射程 → SPEC 产出等价证据方案后开 needs-approval（勿先斩后奏）；L 项建议拆两批（8+8 节点）；T5-M3 协议前置 |
| BK-0022 | BUG-0012 修复：code 节点 lang 切 JavaScript 后默认码仍为 Python 样例，运行必报语法错 | debt | 否 | P1 | S | ready | T3 | dogfooding 实跑 Major 缺陷（2026-10-23 治理日体检）。证据链：DEFS 默认码为 Python 样例且 lang 默认 Python（packages/shared/src/nodes.ts:61-62）；前端切换 lang 仅写 n.params[k] 无联动（apps/web/src/legacy/app.js:1029-1035）；引擎默认值合并（apps/server/src/engine.ts:38）→ lang=JavaScript + Python 默认码组合；handlers.ts:99 直传 runUserCode；JS wrapper 首行 `#` 注释即 SyntaxError（apps/server/src/code.ts:13-31,46-47）。推荐方案：后端兜底——handlers.ts 窄口径替换：code 恰为「另一语言的 DEFS 默认样例串」且与 lang 错配时替换为对应语言等价样例并 emit log 告知，不猜测用户代码语言；零 UI/零 DEFS/零新依赖 → POLICY 自主区「bug 修复」。否决路径：前端联动改交互语义触宪法第 1 条交互层（归 issue #6 追加）；DEFS per-lang 默认值触需批准区 + 契约断言改写。验收：smoke 断言 lang=JavaScript+默认码 → 执行成功且日志含替换告知；契约测试四文件零改动；gate 4 场景全绿 |
| BK-0023 | events.ts run:done.ok 语义注释补写 | doc | 否 | P2 | S | proposed | T4 | W43 观察 O2 未消化——events.ts:32 ok 字段无语义注释（ok=未被中止而非全部成功），消费端易误读（前端 mapEvent 已按此语义实现，server-sync.js:105-107）；注释级改动 schema 零变化，从严口径：并入下一次经批准的 shared 触点随批或单独 needs-approval |
| BK-0024 | README 漂移同步：网页搜索行补 eng 路由/SearXNG + 常用命令表补 test:canvas | doc | 否 | P2 | S | proposed | T4 | 证据：README.md:55 仍写「博查>DuckDuckGo>如实降级」，未记迭代 0005（a5b284f）eng 严格路由与 SEARXNG_URL（search.ts:5-7、.env.example:17）；README.md:37-47 常用命令表缺 npm run test:canvas（package.json:20，迭代 0006 起）；doc 项下一治理日批处理 |

## 待批准区（已迁移 GitHub Issues · v2）

> 触 UI 项由脚本开 `needs-approval` issue（用户评论「批准 / 驳回」，手机可达；
> 批复仅认 owner 本人，循环评论带 🤖 前缀），本表不再维护。
> 历史在档迁移：BK-9001 → liusuren123/agentflow#1。
> 2026-10-23 T5 提案迁移：BK-9002→#2、BK-9003→#3、BK-9004→#4、BK-9005→#5、BK-9006→#6。
> 2026-10-23 治理日新增：golden s4/s5 扩充提案（BK-0010 承载，ADR-0009）→#7；
> CI SIGTERM 停机断言（周报 O4）→#8；AGENTS.md 漂移请用户亲改（禁止区）→#9（user-request 通知）。
> 2026-10-24 迭代 0011 PLAN 轮批复同步（gh 亲核）：用户已批 #1~#5/#7/#8（时间戳见
> 主池各行备注）→ BK-9001~9005 迁入主池 ready、#7/#8 落 BK-0026/BK-0025；**#6 仍待
> 批复**（维持本区，不建行）；#9 三处漂移经核用户已亲改在库（AGENTS.md:28,30,48-49，
> 提交 21d94a3），待用户自行确认关单。
