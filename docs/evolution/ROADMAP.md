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
- 里程碑 M3 · golden 场景扩充（s4 工作流面板在线态 / s5 历史面板在线态）
  - 状态：**已完成（实现段落地，迭代 0011 / BK-0026，2026-10-24）**——issue#7 用户
    批复（2026-10-23T15:48:48Z）后实现轮落地：gate.mjs 147→225 行（HEALTH_FIXTURE/
    WF_ROUTES/RUN_ROUTES 三路由 fixture + wfReady/runReady 确定性等待 + 不变量增量），
    s4/s5 四基线经 golden-created 通道落盘（gate.mjs:192-196，未用 gate:update），
    s0~s3 既有基线逐字节零漂移，产品提交 e3bf60b，VERIFY PASS 零 BUG（gate 6/6
    diffPx=0 + 反演红绿 + npm test 8/8），证据 iterations/0011/REPORT.md；
    后续迭代 0013（BK-9001）再扩 s6/s7；修宪轮持续增量至 **16 场景 s0~s15**
    （s8 agent·0031 / s9 goal 面板·0032 / s10~s12 呈现三件套·0033~0035 /
    s13·s14 拾取器与 lang 联动·0038 / s15 caps·0039；gate.mjs 头注计数已同步，BK-0058）

## T3 · 后端执行能力

基于 Vercel AI SDK 7 引擎（ADR-0004）与 SQLite 持久化（ADR-0005）的节点能力进化：
handler、变量/表达式、检索与工具链增强。所有出站走 guard、沙箱与超时约束不变。
**硬边界：`packages/shared/src/nodes.ts` 的 DEFS（名称/参数/默认值/关键词）是宪法
保护对象——T3 一切演进只改后端实现（handler/engine/tools），不改 DEFS 呈现性字段；
需要新节点或新参数即触 UI，只能走待批准区。**

现状基线（2026-10-26 W44 治理日更新）：**18 种基础 handler 全部实装 + llm.ts +
agent.ts（节点合计 20 种、参数 42）**——handlers.ts 头注已同步（迭代 0046/BK-0055）、
server.ts 头注已补 sessions/capabilities（迭代 0047/BK-0056）；agent 节点 goal 模式
已落地（迭代 0031/0032，ADR-0013：maxSteps 预算循环 + 持久会话绑定 + goal 会话面板）
+ 呈现三件套 webshow/termview/jsoncanvas（迭代 0033~0035，ADR-0015，呈现型 sink
零出站）+ `GET /api/v1/capabilities` 只读供数端点（迭代 0039，ADR-0018）；MCP 工具
filesystem/fetch/web-search/sqlite 真实实现（sqlite 迭代 0026 真接入 BK-0008：DB
锚定 sandbox/mcp-sqlite.db + SQL 黑名单 + mcp-stubs M12-M17 断言），browser 维持
stub 如实降级（ADR-0011 评估终态）；**真 MCP client 已落地（ADR-0012 实施链
BK-0028~0030，2026-10-25）**：stdio / Streamable HTTP 双传输统一 McpConnection、env
白名单注册表（MCP_HTTP_SERVERS/MCP_STDIO_SERVERS）+ 工具发现缓存 + 会话注入 +
guard mcpFetch 出站收口（前端 caps 勾选清单已换后端供数源，迭代 0039）；
websearch eng 参数严格路由已生效（迭代 0005，BK-0007：博查→BOCHA_API_KEY、
SearXNG→SEARXNG_URL、Bing/Google 未接入如实 warn 后回退链）。

- 里程碑 M1 · websearch 引擎参数生效化
  - 状态：**已完成（迭代 0005，BK-0007 关账）**
  - 关账证据：eng 严格路由落地（config zod 校验 + guard 动态主机网关；降级文案四分支
    互斥可断言），产品提交 a5b284f（7 文件 +154/−12）；VERIFY PASS 零缺陷（smoke 39/0 +
    定向 E2E 13/0 + 反演红绿双向），证据 `iterations/0005/REPORT.md`；博查正路径无密钥
    未实测（PRD 标可选），留部署后点位
- 里程碑 M2 · sqlite MCP 工具沙箱接入
  - 状态：**已完成（迭代 0026 重试轮，2026-10-25，BK-0008 关账）**——sqlite
    query/execute 真实现落地：DB 锚定 sandbox/mcp-sqlite.db（由 SANDBOX 常量派生，
    与主库 data/agentflow.db 物理隔离）、ATTACH/DETACH/PRAGMA/load_extension 黑名单
    拒绝（错误消息含「沙箱」）、行集/单元格限幅；TOOL_SPECS 摘标记三处同步
    （mcp-stubs M12-M17 断言守护）；产品提交 a66c0e9，VERIFY PASS 零 BUG
    （smoke:server 95/0，证据 iterations/0026/REPORT.md）。首轮尝试（迭代 0020）
    因 Mimosa 编辑钩子对 db.exec 形态启发式误报 blocked（环境级非需求失败），用户
    「两个门都降 warn」决策后重试成功（背景链见 BACKLOG BK-0008 行）
  - 验收：工具返回不再含 not implemented（sqlite 半面达成；browser 半面归
    ADR-0011 维持 stub 终态）；sandbox 外路径被拒；gate 全绿——三项达成
- 里程碑 M3 · browser MCP 工具可行性评估（仅 ADR 草案，不实现）
  - 状态：**已完成（2026-10-24 治理日批处理消化，BK-0009）**——评估性 ADR
    docs/adr/0011-browser-mcp-feasibility.md 落盘：结论为维持 stub 如实降级
    为默认终态，headless 资源预算 / SSRF 面 / 放弃条件均已成文；零实现零依赖
  - 验收：草案存在于 `docs/adr/`（承载项 BK-0009）——已达成（ADR-0011）
- 补充（2026-10-23 治理日新增，非原里程碑）：**BK-0022 · BUG-0012 修复**（code 节点
  lang 切 JavaScript 后默认码仍为 Python 样例、运行必报语法错）——dogfooding 实跑发现
  的 Major 缺陷，后端兜底方案（POLICY 自主区）；后端兜底已于迭代 0014 落地关账
  （done，提交 807ee5d，VERIFY PASS）；前端联动修复仍归 issue #6 待批复

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
    `iterations/0004/REPORT.md`。**遗留漂移（2026-10-23 扫描、2026-10-24 治理日批处理
    消化，BK-0024 done）**：README:55 网页搜索行已补 eng 严格路由与 SearXNG；常用
    命令表补 test:canvas 与 smoke:shutdown（迭代 0012 落地后新增的同类漂移一并清账）
- 里程碑 M3 · 治理节奏成型
  - 状态：**部分完成**——W43 内三次治理执行（10-22 首发 / 10-23 二次 / 10-24 三次，
    均有治理产物落盘），实际节奏高于「每周日」基线；周报 weekly/43.md 续档承载；
    「连续两周缺席即失效」的判定窗口自 W44 起算，暂无判定

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
  结构化裁决回填 + 审计留痕。状态：**已完成（4/4，2026-10-26 W44 治理日收口）**——
  BK-0016 已落地（迭代 0015，提交 7239afb：sessions/messages 表 + 五端点 + 停止信号
  + SSE 会话流，验收点「会话可列出/恢复/续聊/停止」达成，证据 iterations/0015/REPORT.md）；
  BK-0017 已落地（迭代 0016，提交 a9ac875：node:id 审批人引用 + 受控 LLM 裁决 +
  approval_audits 审计，验收点「结构化裁决回填 + 审计留痕」达成，证据
  iterations/0016/REPORT.md）；**BK-0013 经 ADR-0012 拆分链全部落地（2026-10-25）**：
  BK-0027 SPEC 先行（迭代 0017）+ BK-0028 传输层（迭代 0023，b560334）+ BK-0029
  注册与工具发现（迭代 0024，82f5b56）+ BK-0030 会话注入与 guard 收口（迭代 0025，
  dded158），验收点「外部 MCP server 工具可发现可调用（guard 约束内）」全链达成
  （issue#10 随终子项关单）；BK-0015 已随批关账（2026-10-26 W44 治理日置 done，BACKLOG 回写在案）：ADR-0013
  §7 联合评估结论——承载 = agent 节点 maxSteps 预算（随 BK-0033 迭代 0031 落地），
  「LLM 节点具备停止条件与预算控制」验收由 agent 路径达成；llm 节点 round≤3 维持
  现状（若未来需节点级预算，按 ADR-0013 §7 b 案另开 needs-approval）。
- 里程碑 M2 · 环境感知与数据真实化（全部触UI=否）：BK-0014 扩展发现器、BK-0018
  记忆工具组、BK-0019 KB 管理管道、BK-0020 on-error 策略。
  验收：项目与 ~/.agents 扩展可发现并注册（白名单+审计）；跨 run 记忆可读写；
  retrieval 命中真实入库文档；节点失败可按策略降级。状态：未开始（proposed，四项
  实现轮均含需批准面，节奏见 BACKLOG 各自备注）。
- 里程碑 M3 · 智能体工作台 UI（全部触UI=是；issues #2~#5 用户于 2026-10-23 批复、
  #6 于 2026-10-24 批复——五项修宪授权齐备）：通用智能体节点 + goal 模式会话面板
  （#2）→ 呈现三件套节点（#3）→ git/diff/目录树右栏（#4）→ PTY 交互终端（#5，
  安全世界设计先行）→ 参数扩展杂项（#6，BUG-0012 前端联动修复已追评并入）。
  **协议前置已满足（2026-10-25 回写）**：BK-0021 NDP 目录制迁移 done——批次 1
  （迭代 0021，e880511）+ 批次 2 终轮（迭代 0022，c17866f），16 目录终态、内联
  残留=0、等价性 sha256 08ba1229…f275 全程守护；先行项 BK-0031 done（迭代 0018）。
  「先迁移后扩展」兑现：新节点/新参数一律按 NDP 定义（src/nodes/&lt;type&gt;/node.ts）
  后进注册表。**L 项拆分已落地（2026-10-25 治理日）**：BK-9002~9006 → BK-0032~0050
  （19 子项；SPEC 先行者 4 项 ready，实现块 15 项 proposed 随链晋升；父行 skipped
  留指向，批复承继 issue#2~#6，关单留各链终轮）。状态：**实施段推进中
  （2026-10-26 W44 治理日回写）**——SPEC 四连全部收官（BK-0032·迭代 0027 /
  BK-0043·迭代 0028 / BK-0035·迭代 0029 / BK-0039·迭代 0030）；**BK-9002 链闭合**
  （BK-0033 节点·0031 + BK-0034 面板·0032，issue#2 已关单）；**BK-9003 链闭合**
  （BK-0036/0037/0038·迭代 0033/0034/0035，issue#3 已关单）；BK-9006 五子项
  done 3/5（BK-0050 类目·0037 / BK-0046 拾取器·0038 / BK-0049 caps 动态化·0039；
  余 BK-0047/0048 待 T5-M2 后端语义先行）；BK-9004 链批次 1（BK-0040）成果完整
  滞留 feat/0036-iter 待合并仲裁（W44 处置建议：下轮心跳合并，场景号 s12→s16
  按落盘时序改号），BK-0041/0042 随链 proposed；BK-9005 链 SPEC 闭合（ADR-0014·
  迭代 0028），BK-0044/0045 阻塞于附录 A needs-approval **issue#14**（W44 治理日
  补开，待用户批复）；T5-M2 后端语义拆分已启动（BK-0060/0061/0062 SPEC 先行
  ready，W44 立项）。完整序列见底部待办节。

---

## 待办（治理周维护）· 2026-10-26 更新（W44 第五次治理 · 周一治理日）

- **本日核心产出**：BK-0015 随批关账（T5-M1 4/4 收口）；BK-0051 doc 批处理消化
  （README 正编两处 + 同主题扩围清账 + boundaries 行数刷新）；新增 BK-0060/0061/
  0062（T5-M2 后端语义三项的 SPEC 先行拆分，全部 ready）与 BK-0063（ADR-0017
  编号撞号消解，proposed）；ADR-0014 附录 A needs-approval issue **#14** 补开
  （此前从未开出——BK-0044 转 ready 门槛余一即 #14 获批）；残留已合并分支 ×5
  清理（feat/0042/0043/0044/0048/0049-iter）。
- **ready 队列（治理日后）**：非 doc 4 项——BK-0060（P1/S，BK-0019 拆分 SPEC
  先行）、BK-0061（P2/S，BK-0020 拆分）、BK-0062（P2/M，BK-0014 拆分）、
  BK-0040（P0/M，成果滞留 feat/0036-iter 待合并仲裁，占位锁维持不释放）；
  doc 1 项 BK-0063（proposed，心跳不选）。
- **新实施序列（PLAN 选题指导；本序列为 PLAN 指导、先例在案，优先于主池表序）**：
  1. **feat/0036-iter 合并仲裁**（BK-0040 收口）：下轮心跳优先执行——三硬条件
     = ①s12→s16 场景号按落盘时序改号（改名非重录）②非「双方各自新增」型产品
     代码冲突立即停手上交用户裁决 ③集成收口（主干复测四件套 + golden 16→17
     计数收口 + smoke B 组并入总数口径 + server.ts 头注补 workbench 端点行 +
     metrics 补 0036 行溯引 3eb86e5）；
  2. **BK-9004 链续**：BK-0041 diff 审查 → BK-0042 目录树（链终轮回执 #4）；
  3. **T5-M2 SPEC 三连穿插**：BK-0060 → BK-0061 → BK-0062（纯文档轮，可与
     修宪链交替；BK-0060 若定新依赖即持附录开 needs-approval，等待期不空转）；
  4. **BK-9005 链**：issue#14 获批 → BK-0044 PTY 后端 → BK-0045 终端节点 UI
     （链终轮回执 #5）；
  5. **BK-9006 收官**：BK-0047（待 BK-0019 实现块 = BK-0060 CLOSE + 依赖批复）、
     BK-0048（待 BK-0020 实现块 = BK-0061 CLOSE + env 批复）→ 末项 CLOSE 回执
     issue#6 关单。
- **待批准 issues 现状（W44 治理日 gh 亲核）**：**#14**（ADR-0014 附录 A：PTY
  依赖两项 + env×4 + 残余风险知悉——本日新开）与 **#12**（CI 像素门禁 s3 亚像素
  抖动处置）为仅存待批面；#4/#5/#6 修宪授权已由子项链承继消费中（关单留各链
  终轮）；#9 user-request 用户已亲改在库待自行关单。
- **机制提案（待用户批复，WORKFLOW §6 护栏 3）**：ADR 编号分配宜比照 golden
  场景号「落盘时序裁决」补条（BK-0063 首例：两路并行各自新增 ADR 同号，先落盘
  者保留、后落者取下一号，改名非重写、不回改已定稿迭代产物）。
- 历史注记：T1 主题闭环（0001/0008）；T2-M1/M2/M3、T3-M1/M2/M3、T4-M1/M2 已
  关账；**T5-M1 4/4 收口（本日）**；迭代 0010 中断未续（无 metrics 行）；0020
  blocked 经 0026 重试关账；0033/0040 两笔账本更正（脚本侧误判，双层记录在案）；
  迭代号 0042/0043/0044/0048/0049 为分配未产出空号（noop/基线复验轮，无 metrics
  行）。
