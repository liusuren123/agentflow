# AgentFlow 进化路线图

> 产品经理维护；心跳选题须可追溯至本图某主题。主题权重由周度治理依 metrics 趋势调整。
> 铁律：一切「触 UI=是」的候选只进待批准区（GitHub Issues needs-approval），未经用户批准不得进入里程碑。
> 完成度标注口径（2026-10-22 周度治理核定）：已完成 = 有可复现证据（命令输出 / ADR 实施
> 记录 / 文件现状）；部分完成 = 证据仅覆盖部分验收点；未开始 = 无证据。禁止以「看起来一致」
> 作为任何判定依据。

## T1 · 移植收尾与骨架一致性（四里程碑全部闭环，2026-10-22）

React 机械移植（ADR-0002 系列）的收尾：等价 JSX 骨架覆盖度核对、legacy 命令式模块
边界清晰化、`apps/web/dist` 与 golden 基线的持续 1:1。**验收口径永远是 `npm run gate`
全绿，不是「看起来一样」。**

- 里程碑 M1 · 全部静态骨架等价 JSX 化
  - 状态：**已完成（迭代 0001 盘点关账，BK-0001）**
  - 关账证据（2026-10-22 BUILD 复核，详见 `docs/evolution/iterations/0001/JOURNAL.md`）：
    - CP-B/C/D 落地核对 10/10 一致（B1–B4 / C1–C3 / D1–D3）：构建链在位
      （`apps/web/package.json:14,21-23` + `apps/web/vite.config.ts:7`）；server 托管
      dist（`apps/server/src/server.ts:52-56`）；门禁默认 target 为构建产物
      （`tools/pixel-gate/gate.mjs:25-30`）；`Skeleton.tsx` 唯一骨架源、skeleton.html
      退役（828ae57 同提交 −168/+182）；legacy 消费 `@agentflow/shared`
      （`apps/web/src/legacy/app.js:3,133`）；原单文件与提取工具退役（git 索引与
      工作区均无，apps/web/index.html 12 行系 Vite 合法入口）
    - 残留注入路径 0 匹配：`grep -rn "dangerouslySetInnerHTML" apps/web/src` 与
      `grep -rn "?raw" apps/web/src` 均 0 输出、exit=1（JOURNAL §2）
    - gate/test 基线：2026-10-22 治理日全量回归绿（`weekly/43.md` §二）；迭代 0001
      复跑由工作流门禁统一执行，结果以 `iterations/0001/REPORT.md` 为准
- 里程碑 M2 · legacy 模块与 React 骨架职责边界文档化
  - 状态：**已完成（迭代 0008，BK-0012 关账；T1 四里程碑全部闭环）**
  - 关账证据：`docs/frontend-module-boundaries.md` 纯新增 178 行（四模块各一节×四要素 +
    总览表 + 组合时序四步），产品提交 1ff70fb（`git show --numstat` 实查 +178/−0）；
    VERIFY PASS 6/6 AC 零缺陷（行数 182/2419/131/532 零漂移 + 指针抽查 30+ 条全中），
    证据 `iterations/0008/REPORT.md`

## T2 · 质量基建

- 里程碑 M1 · shared 契约测试防漂移覆盖全部 16 种节点 + SSE 事件全集
  - 状态：**已完成（迭代 0003，BK-0003 关账）**
  - 关账证据：默认值 33/33 全量断言 + 事件反例 12 条 + HANDLERS⊇NODES 三测试落地
    （defs-drift/events-negative/handlers-coverage），产品提交 1551994；VERIFY PASS
    零缺陷（node --test 8/8），证据 `iterations/0003/REPORT.md`；2026-10-23 治理日
    体检复跑 npm test 8/8 PASS
- 里程碑 M2 · 后端 E2E 冒烟脚本一键执行
  - 状态：**已完成（迭代 0002，BK-0002 关账）**
  - 关账证据：`npm run smoke:server` 一键可跑（tests/smoke/lib.mjs + smoke-server.mjs），
    产品提交 79788a3；正例两连跑 33/0、负例 exit 1；后续迭代 0005/0009 扩至 39/50 断言，
    2026-10-23 治理日体检 50 passed/0 failed；证据 `iterations/0002/REPORT.md`
- 里程碑 M3 · golden 场景扩充提案（s4 工作流面板在线态 / s5 历史面板在线态）
  - 状态：**已完成（提案阶段验收达成，2026-10-23 治理日，BK-0010 批处理消化）**——
    ADR-0009 草案产出（docs/adr/0009-golden-s4-s5-online-panels.md）并开
    needs-approval issue #7；**实现阶段（golden 基线扩充与 tools/pixel-gate/ 改动）待
    用户批准后另行立项**（宪法第 3 条 + POLICY 需批准区，批准前零实现）
  - 原验收口径（ADR 草案产出并入待批准区，含新场景步骤定义与影响面）：已达成

## T3 · 后端执行能力

基于 Vercel AI SDK 7 引擎（ADR-0004）与 SQLite 持久化（ADR-0005）的节点能力进化：
handler、变量/表达式、检索与工具链增强。所有出站走 guard、沙箱与超时约束不变。
**硬边界：`packages/shared/src/nodes.ts` 的 DEFS（名称/参数/默认值/关键词）是宪法
保护对象——T3 一切演进只改后端实现（handler/engine/tools），不改 DEFS 呈现性字段；
需要新节点或新参数即触 UI，只能走待批准区。**

现状基线（2026-10-23 治理日更新）：16 种 handler 全部实装（`apps/server/src/handlers.ts` +
`llm.ts`）；MCP 工具 filesystem/fetch/web-search 真实实现，sqlite/browser 如实降级
（迭代 0009 stub 工厂显式化，BK-0005）；websearch eng 参数严格路由已生效（迭代 0005，
BK-0007：博查→BOCHA_API_KEY、SearXNG→SEARXNG_URL、Bing/Google 未接入如实 warn 后回退链）。

- 里程碑 M1 · websearch 引擎参数生效化
  - 状态：**已完成（迭代 0005，BK-0007 关账）**
  - 关账证据：eng 严格路由落地（config zod 校验 + guard 动态主机网关；降级文案四分支
    互斥可断言），产品提交 a5b284f（7 文件 +154/−12）；VERIFY PASS 零缺陷（smoke 39/0 +
    定向 E2E 13/0 + 反演红绿双向），证据 `iterations/0005/REPORT.md`；博查正路径无密钥
    未实测（PRD 标可选），留部署后点位
- 里程碑 M2 · sqlite MCP 工具沙箱接入
  - 状态：**进行中（BK-0008 于 2026-10-23 治理日晋升 ready，待心跳选题）**——前置
    BK-0002/0005 均 done；better-sqlite3 既有依赖（根 package.json allowScripts +
    store.ts 在用）、DB 锚定 `apps/server/sandbox/` 专用文件、无新增依赖/env/出站类别，
    POLICY 自主区；实现轮须同步更新 tests/smoke M07 断言口径（sqlite 由 stub 转 real）
  - 验收：工具返回不再含 not implemented；sandbox 外路径被拒；gate 全绿
- 里程碑 M3 · browser MCP 工具可行性评估（仅 ADR 草案，不实现）
  - 状态：未开始（BK-0009，doc 项——v2 起心跳不选，攒下一治理日批处理）
  - 验收：草案存在于 `docs/adr/`（承载项 BK-0009）
- 补充（2026-10-23 治理日新增，非原里程碑）：**BK-0022 · BUG-0012 修复**（code 节点
  lang 切 JavaScript 后默认码仍为 Python 样例、运行必报语法错）——dogfooding 实跑发现
  的 Major 缺陷，后端兜底方案（POLICY 自主区），P1/S/ready，证据链见 BACKLOG 备注

## T4 · 文档与治理

ADR 体系持续沉淀；`docs/evolution/` 机制自身按 WORKFLOW.md §6 护栏第 3 条迭代；
README 与 `docs/ai-sdk-7-功能汇总.md` 随实现同步。

- 里程碑 M1 · 进化闭环首跑
  - 状态：**已完成（2026-10-22 心跳迭代 0001~0009 全链路跑通）**
  - 关账证据：`docs/evolution/metrics.md` 已 9 行（0001~0009，含补题轮 0007）；
    `iterations/0001~0009/` 四产物齐全并随归档提交入库（0007 补题轮按契约仅 PRD）；
    状态机全路径验证含修复轮（0006 BUG-0001 一轮修复）与 blocked 分支（0001）
- 里程碑 M2 · 文档与实现同步
  - 状态：**已完成（迭代 0004，BK-0006 关账）**
  - 关账证据：README 四落点补记（smoke 命令 / ADR-0004~0007 标题 / 两 DELETE 端点 /
    双源句 + 前端能力 C1-C8），产品提交 01c6749；ai-sdk 抽查 7/7 一致；证据
    `iterations/0004/REPORT.md`。**遗留漂移（2026-10-23 治理日扫描）**：README:55
    网页搜索行未记迭代 0005 后的 eng 路由与 SearXNG；常用命令表缺 test:canvas——
    已立项 BK-0024（doc，下一治理日批处理）
- 里程碑 M3 · 治理节奏成型
  - 状态：**部分完成**——首次周报 `weekly/43.md` 已产出（2026-10-22）；2026-10-23 为
    第二次治理执行（同 ISO 周 43，周报由协调者并入或续档）；「连续两周缺席即失效」的
    判定窗口自 W44 起算，暂无判定

## T5 · 智能体运行时与工作台（2026-10-23 治理日正式并图）

> 2026-10-23 用户会话头脑风暴立项，同日治理日 PM 校准并图。竞品对照结论：DAG 编排赛道
> （n8n/Dify/Langflow，Flowise 已于 2026-08 EOL）与 agent 工作台赛道（Claude Code/
> Cursor/Devin）之间，「画布编排 × 深度智能体工作台」是空白带，即本主题差异化定位。
> 硬边界同 T3：新节点/新参数即触 UI，走 needs-approval issue；主池各项实现轮涉
> 新增依赖 / env 语义 / 出站类别 / shared SSE 事件契约者另按 `POLICY.md` 需批准区处理。
> POLICY 校准（2026-10-23 治理日逐项）：BK-0016/0017 判自主区晋升 ready（0016 附
> SSE 契约护栏：若 SPEC 需新增事件类型即触需批准区转 pending-approval）；BK-0013 L 项
> 先拆分后立项；BK-0015/0018/0019/0020 实现轮含需批准承载（env/依赖），SPEC 先行；
> BK-0021 从严——SPEC 产出等价证据方案后开 needs-approval。

- 里程碑 M1 · runtime 承重墙（全部触UI=否）：BK-0013 真 MCP client、BK-0015 自主
  agent loop、BK-0016 持久会话与流式会话 API、BK-0017 智能体互审协议。
  验收：外部 MCP server 工具可发现可调用（guard 约束内）；LLM 节点具备停止条件与
  预算控制；会话可列出/恢复/续聊/停止（/api/v1 端点）；approval 审批人为节点引用时
  结构化裁决回填 + 审计留痕。状态：**未开始（BK-0016/0017 已 ready 待心跳选题；
  BK-0013 待拆分、BK-0015 待承载方案）**。
- 里程碑 M2 · 环境感知与数据真实化（全部触UI=否）：BK-0014 扩展发现器、BK-0018
  记忆工具组、BK-0019 KB 管理管道、BK-0020 on-error 策略。
  验收：项目与 ~/.agents 扩展可发现并注册（白名单+审计）；跨 run 记忆可读写；
  retrieval 命中真实入库文档；节点失败可按策略降级。状态：未开始（proposed，四项
  实现轮均含需批准面，节奏见 BACKLOG 各自备注）。
- 里程碑 M3 · 智能体工作台 UI（全部触UI=是，BK-9002~9006 已开 needs-approval
  issues #2~#6，批复后走宪法第 3 条修宪通道）：通用智能体节点 + goal 模式会话面板
  （#2）→ 呈现三件套节点（#3）→ git/diff/目录树右栏（#4）→ PTY 交互终端（#5，
  安全世界设计先行）→ 参数扩展杂项（#6，随主池节奏分批；BUG-0012 的前端联动修复
  与离线模拟器同款错配修复建议并入本 issue 追加条目，2026-10-23 已追评）。
  **协议前置：BK-0021（NDP 节点定义目录制迁移，规范 v0.2）——新节点一律按
  NDP 定义后进注册表，先迁移后扩展，不得跳过。**状态：未开始（等批复；
  BK-0021 前置）。

---

## 待办（治理周维护）· 2026-10-23 更新

- **迭代 0010 续跑注记**：STATE phase=PLAN（2026-10-22 23:04 启动后被中断，PRD 未
  产出）。下次心跳续跑 PLAN 时按本日治理后的 BACKLOG 重新选题（doc 项心跳不选）；
  建议选题 BK-0022（P1/S 非 doc ready 表首），后续序列见 weekly/43.md §五选题建议。
- **ready 队列（治理日后）**：非 doc 5 项——BK-0022（P1/S）、BK-0016（P1/M）、
  BK-0017（P1/M）、BK-0011（P2/S）、BK-0008（P2/M）；doc 项 0（BK-0010 本日消化，
  BK-0009 留下一治理日）。预计支撑至下个治理日。
- **待批准 issues 现状（全部 open，等用户评论，不催办、不代批）**：#1 BK-9001 日志
  级别过滤；#2~#6 BK-9002~9006（T5-M3 工作台 UI 五项）；#7 golden s4/s5 扩充
  （ADR-0009，本日新增）；#8 CI SIGTERM 停机断言（本日新增）；#9 AGENTS.md 漂移
  请用户亲改（user-request 通知，非批准项）。
- 历史注记：迭代 0001（BK-0001）盘点 + 迭代 0008（BK-0012）边界文档已分别关账
  T1-M1/T1-M2，T1 主题闭环；BK-0001 终局处置见 BACKLOG 备注（2026-10-23 治理日
  改判 done）。
