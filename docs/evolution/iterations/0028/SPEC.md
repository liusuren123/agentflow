# SPEC · 迭代 0028 · BK-0043 PTY 交互终端「安全世界设计」ADR 草案 SPEC 先行（纯文档轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 12:26
> 输入：`docs/evolution/iterations/0028/PRD.md`（PLAN 产物）+ 本会话只读核实
> （代码锚点 + npm registry 联网调研，见 §2.2/§7.6）。
> 冲突顺位：CONSTITUTION.md > 代码实现 > 本 PRD > 本文档。本文引用的 `path:line`
> 均本会话亲读（锚点清单见 §2.2）；npm 事实均本会话亲查 registry.npmjs.org
> （2026-10-25 12:2x，调研记录见 §7.6）。
> **本迭代零代码 / 零依赖 / 零 env / 零出站 / 零 shared 契约 / 零 UI / 零 golden**：
> BUILD 阶段仅按本 SPEC 蓝图落 ADR-0014 草案 + BACKLOG 两行定界回写。
> 先例：BK-0032（迭代 0027，`iterations/0027/SPEC.md`——SPEC 先行纯文档轮同款分工
> 与 VERBATIM 验收标准；BK-0027（迭代 0017）为附录 A 五要素直系先例。

## 0 · 定位与硬前置判定

- **纯文档轮**：产品提交 = `docs/adr/0014-pty-terminal-security-world.md`
  纯新增（命名本 SPEC §3 定）+ BACKLOG 两行备注定界回写（归档提交面）；其余
  一切路径零字节改动（AC5 白名单机器核对，含 package-lock.json 零变化 = 零依赖
  引入证明）。非修宪轮，**全程禁 `npm run gate:update` / golden 任何接触**
> （POLICY 禁止区）。
- **POLICY 校验**：文档与实现同步（ADR 记述）+ 侦察与立项（BACKLOG 维护）均属
  自主区（POLICY.md:15/17）。ADR 草案内容虽为 BK-0044（后端运行时）/BK-0045
  （终端节点 UI 修宪轮）定界，但 ADR 本身是文档（CONSTITUTION 第 4 条「不适用」
  面）；**不预支任何依赖安装、env、出站与代码实现**——依赖面授权须另开
  needs-approval issue 获批（父项 issue#5 批复不自动覆盖，BK-0043 行内既定口径，
  BACKLOG.md:56；BK-0044 行内同款，BACKLOG.md:57）。
- **ADR 判定：needsAdr=false**（PRD「SPEC 阶段衔接说明」既定口径，PRD.md:272）：
  本项产品即 ADR 草案本身，不再叠 ADR——ADR-0014 由 BUILD 阶段按本 SPEC
  §3~§8 蓝图落盘（本阶段不新建 `docs/adr/` 文件）。分工沿迭代 0027 先例：本
  SPEC 承载全部设计定稿内容（同等强度对照表 / 权限选项矩阵 / 生命周期状态机 /
  依赖评估 / 请批清单字面量 / 定界字面量），BUILD 转写为 ADR 正文，无自主设计
  决策空间。
- **skipSpec=false**（M 项，PRD.md:265），本 SPEC 即其载体。
- **编号顺延**：`docs/adr/` 现行 0001~0013（ls 亲核，2026-10-25 本会话），
  本项 ADR 编号 **0014** 成立。

## 1 · 受影响文件清单（本迭代全部改动面）

| 文件 | 改动 | 预算（行） |
| --- | --- | --- |
| `docs/adr/0014-pty-terminal-security-world.md` | **新增**（BUILD 按本 SPEC §3~§8 转写落盘） | ~290（区间 280±60；上限 400，AGENTS.md 硬性约定 4；对齐 ADR-0012 体量 283 行 / ADR-0013 体量 297 行） |
| `docs/evolution/BACKLOG.md` | BK-0044 / BK-0045 两行**备注列替换**（按本 SPEC §8.4 模板字面量）；表结构不变（零新行、状态列不动——两行均维持 proposed）；BK-0043 状态流转归 CLOSE | 2 行原地替换（增量 ≤30 行口径） |
| 其余一切路径（`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、根/子包 `package.json` 与 `package-lock.json`、`CONSTITUTION.md`、`AGENTS.md`、`README.md`、`docs/evolution/ROADMAP.md`、`docs/evolution/metrics.md`、golden 基线 `tests/golden/**`） | **零改动**（AC5 机器核对） | — |

机制件（随归档提交，不属产品白名单，与 0011~0027 同机制）：`docs/evolution/STATE.md`、
`docs/evolution/metrics.md`、`iterations/0028/` 四件。BK-0033/BK-0034 晋升 ready
回写已由 PLAN 轮完成（BACKLOG.md:46-47 行内 2026-10-25 迭代 0028 PLAN 轮字样
本会话亲核），本轮零动作。

## 2 · 模块边界

### 2.1 角色分工

```
spec-designer（本阶段）    产出本 SPEC（设计蓝图全量定稿）；不碰任何代码与
                           CONSTITUTION 正文；不新建 docs/adr/ 文件（needsAdr=false）
code-developer（BUILD）    按本 SPEC §3~§8 逐节转写 ADR-0014（无自主设计决策空间——
                           若发现蓝图与代码现状矛盾：中止并上报，不得自行改写技术
                           结论）+ 执行 §8.4 BACKLOG 两行回写（模板字面量逐字粘贴）
                           + 提交；不安装依赖、不开 issue（开 issue 归脚本持附录 A
                           字面量执行，沿 BK-0027→#10 先例）
test-manager（VERIFY）     按 §9 AC1~AC7 逐条执行；AC4 VERBATIM 两行比对；AC7 指针
                           抽样 ≥5 条
协调者（CLOSE）            BK-0043 置 done；issue#5 仅发进度回执不关单（关单留
                           BK-0045 链终轮，PRD 批次编排在案）；持 ADR 附录 A 字面量
                           开 needs-approval issue（沿 BK-0027→#10 补开先例——
                           脚本无「从附录草案开 issue」步骤时由协调者补开）
```

### 2.2 ADR 与代码冲突顺位 + 本会话亲核锚点清单（BUILD/VERIFY 复核起点）

以代码实现为准（spec-designer 职责约定）。本 SPEC 撰写时全部指针亲读：

- `apps/server/src/code.ts`（69 行 wc -l 亲核）：`:50` `spawn(cmd, argv,
  {stdio:['pipe','pipe','pipe']})` 子进程承载代码节点；`:53` `setTimeout(...,
  5000)` 超时 kill；`:60` 超时错误语义「`${lang} 执行超时（5s），已终止`」。
- `apps/server/src/tools.ts`（175 行 wc -l 亲核）：`:16` SANDBOX 常量锚定
  `apps/server/sandbox/`；`:18-22` safePath（`:20` 越界拒绝「路径越界：只允许
  访问沙箱目录」）；`:23` ensureSandbox 惰性建目录；`:33` SQLITE_DB 由 SANDBOX
  派生锚定专用文件（迭代 0026 先例）；`:34-35` MAX_ROWS/MAX_CELL 限幅族。
- `apps/server/src/guard.ts`（109 行 wc -l 亲核）：`:33-56` assertPublicUrl
  （私网/回环/链路本地/CGNAT 拦截 + DNS 解析核验；`:37` ALLOW_PRIVATE 逃生）；
  `:59-62` guardedFetch；`:71/:81/:93` 博查/DuckDuckGo/SearXNG 三网关；
  `:107-109` mcpFetch（迭代 0025）——现五出口。
- `apps/server/src/mcp/connection.ts`（84 行 wc -l 亲核）：`:22-31` McpConnection
  五面接口（connect/listTools/callTool(+signal)/close + timeoutMs 参数化）；
  `:35-36` 连接/调用默认超时 10s/30s；`:46-47` connectAttempted/closed 双标志
  （握手失败也拆链防 stdio 孤儿、close 幂等可重入 `:77-83`）。
- `apps/server/src/config.ts`（129 行 wc -l 亲核）：`:29-34` rawEnv 白名单 15
  key（`:33` 含 MCP_HTTP_SERVERS/MCP_STDIO_SERVERS，迭代 0024）；`:51-74`
  EnvSchema zod fail-fast；`:76-79` fail 通道（退出码 1）。
- `apps/server/src/sessions.ts`（176 行 wc -l 亲核）：`:2-14` 头注（「会话 =
  与 run 正交的第一等资产」「复用现有 15 种 SSE 事件承载，零新增契约」「活动
  判活只用内存注册表——进程崩溃后 DB 残留不可信，BK-0011 教训」）；`:34-36`
  sessionsById 内存注册表；`:56-63` sessionStopHandler（404 不区分会话不存在
  与无活动）；`:69-164` chat 步①-⑬；`:167-176` abortActiveSessions/
  activeSessionCount 停机出口。
- `apps/server/src/server.ts`（254 行 wc -l 亲核）：`:215-219` sessions 五路由
  （v1-only）；`:229-252` shutdown 链（`:235` abortActiveSessions 并入、
  `:243` 5s 宽限 deadline、`:242` 轮询不代删、`:249` closeStore）。
- `apps/server/src/engine.ts`：`:33` ctx.ac 解构；`:103/:135/:142` abort 判定
  （run 级中止信号语义）。
- `apps/server/src/store.ts`（400 行 wc -l 亲核，恰贴 AGENTS.md 硬性约定 4 阈值）：
  `:100-109` approval_audits 审计表 DDL（reviewer/mode/verdict/reason 字段族，
  迭代 0016 先例）；`:200` insertApprovalAudit。
- 根 `package.json:34-35`：allowScripts 白名单 `"better-sqlite3@12.11.1": true`
  （native module 安装审批纪律先例）。
- **PTY 零承载**：`grep -rni "node-pty|\bpty\b" apps/server/src package.json
  apps/server/package.json` exit 1 零命中（本会话亲跑）——仓内无任何 PTY
  依赖与模块。
- `docs/adr/0012-mcp-client-transport.md`（283 行）：§6.1 stdio 子进程网络行为
  不可控「残余风险声明」直系先例；§7 env 方案选项矩阵；附录 A 五要素样板。
  `docs/adr/0013-agent-node-goal-session-panel.md`（297 行）：头部状态块
  「草案 · 待实施轮消费」双位标注 + §8 定界节体例。
- `docs/evolution/BACKLOG.md`：BK-0043（:56）/BK-0044（:57）/BK-0045（:58）/
  BK-9005（:76，批复承继 2026-10-23T15:49:06Z）行；`docs/evolution/ROADMAP.md`:
  :124-130（T5 差异化定位）、:156-168（M3 智能体工作台 UI）、:184-190（SPEC
  四连先行实施序列）、:195-197（BK-9005 链序列）、:205-209（下一个预期新批项）。
- `tools/pixel-gate/gate.mjs:176-187`：SCENARIOS 恰 8 项 s0~s7（grep -c 亲核
  =8）；WF_ROUTES/RUN_ROUTES 在线路由 fixture 先例。
- npm registry 联网调研（2026-10-25 12:2x 本会话亲查，详见 §7.6）。

## 3 · ADR-0014 章节骨架与行数预算分配（PRD 衔接说明 ①载体）

文件名：`docs/adr/0014-pty-terminal-security-world.md`（kebab-case，沿
ADR-0012/0013 命名式；语义 = PTY 交互终端安全世界设计，PRD 受影响文件清单
「命名 SPEC 定」兑现）。头部状态块沿 ADR-0012/0013 样板，状态行字面：

```
- 状态：**草案 · 待用户批准（依赖与 env 请批面——附录 A）/ 待实施轮消费
  （BK-0044 PTY 后端运行时 / BK-0045 终端节点 UI 修宪轮——链终轮）；授权链 =
  issue#5 用户批复承继（2026-10-23T15:49:06Z，见 BACKLOG BK-9005 行）——承继的
  是修宪实施授权，依赖面须另批、父项批复不自动覆盖**
```

不写「已批准」字样（PRD 非功能要求 3：issue#5 批复承继的是修宪实施授权，依赖
面授权另批；ADR 自身状态行更新留实施轮 CLOSE——0010/0012 先例）。显著声明块
（沿 ADR-0012/0013 体例）：本 ADR 为安全世界设计草案，不实施任何代码、不引入
任何依赖、不新增任何 env、不改变任何运行时行为；全部依赖/env/出站事项仅以文字
方案存在，BK-0044/BK-0045 转 ready 的前置含 needs-approval issue 获用户本人批复。

| ADR 章节 | 承载的 PRD 七要素 | 内容来源（本 SPEC） | 行数预算 |
| --- | --- | --- | --- |
| 头部状态块 + 显著声明 | 草案双标注 + 授权链 + 依赖面另批声明 | 本节上文 | 18 |
| §1 动机与现状证据 | ① | §3.1（下文） | 22 |
| §2 PTY 会话进程模型与沙箱边界（含同等强度对照表） | ② | §4 | 52 |
| §3 用户与 agent 共享会话的权限/审计面（三选项矩阵） | ③ | §5 | 46 |
| §4 超时/生命周期/中止级联（状态机草图） | ④ | §6 | 40 |
| §5 依赖与出站类别评估（五面 + 调研记录） | ⑤ | §7 | 56 |
| §6 附录 A · 请批清单五要素字面量 | ⑥ | §8.3 | 34 |
| §7 BK-0044/BK-0045 实施定界（影响面索引） | ⑦ | §8.4 | 22 |
| **合计** | | | **~290 ≤400** ✓ |

- **§3.1 动机要素（ADR §1 内容）**：issue#5 链上下文（交互式 PTY 终端节点，
  用户与 agent 共享 shell 会话；治理日拆分 BK-0043→0044→0045）+「安全世界
  设计先行」立项语兑现（BK-9005 行内原文，BACKLOG.md:76）+ 差异化定位（T5
  「画布编排 × 深度智能体工作台」空白带，ROADMAP.md:126-128；PTY 共享会话是
  agent 工作台赛道 Claude Code / Cursor 的核心交互形态，DAG 编排赛道普遍缺位）
  + 安全素材地基四条（code.ts 子进程+超时 / tools.ts 沙箱锚定 / guard 五出口 /
  connection+sessions 生命周期——均 done，锚点见 §2.2）。
- **§3.2 不做范围要素（ADR §7 尾部收口）**：本轮（BK-0043）零代码零依赖零
  env 零出站零 shared 零 UI 零 golden；BK-0044/0045 是实施轮（后者修宪轮），
  按 §7 定界消费本 ADR，链晋升 ready 前不实施；BK-0035/0039（SPEC 四连先行
  后两位）、BK-0033/0034（BK-9002 链）不在本 ADR 射程。

## 4 · 进程模型与沙箱边界蓝图（PRD 衔接说明 ②载体；ADR §2 蓝图）

### 4.1 进程拓扑三案（选项+利弊+推荐）

| 拓扑案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · 每会话一 PTY 子进程（推荐）** | 会话创建时惰性 spawn 一个 PTY 子进程（shell），会话关闭即进程收尾 | 与既有纪律同构：code.ts:50 一次性子进程 + connection.ts 惰性连接先例；会话间零交叉污染；崩溃半径=单会话；审计与生命周期一一对应 | 会话数=进程数，须配会话数上限（§4.4） | **推荐**——池化与复用在「交互式 shell」语义下无收益（shell 状态即会话状态，复用即串话） |
| b · 进程池预热 | 预热 N 个 shell 待分配 | 首键延迟低 | shell 启动 <100ms 量级，预热收益可忽略；池管理+消毒（环境变量/工作目录/历史残留）复杂度高；串话风险 | 否决 |
| c · 共享单 shell 多路复用 | 全部会话复用一个 shell 进程 | 进程面最小 | 双写方（用户+agent）×多会话交叉污染，审计不可归属；单点崩溃全灭 | 否决（安全面一票否决） |

### 4.2 cwd 锚定方案与沙箱纪律的关系（ADR §2 必答项，如实定级）

- **锚定方案**：每会话初始工作目录 = `apps/server/sandbox/pty/<sessionId>/`
  （SANDBOX 常量派生子目录——对齐 tools.ts:16 → :33 SQLITE_DB 派生先例；会话
  建立时惰性 mkdir，对齐 ensureSandbox :23）。
- **如实定级（本 ADR 核心诚实面）**：tools.ts safePath 的**强制路径越界拒绝
  （:19-20）在 PTY 形态不可移植**——shell 的本质就是可 `cd` 到任意目录，任何
  运行时拦截都是伪安全（`cd` 变形万花筒：子 shell/符号链接/env 扩展）。故 PTY
  对沙箱纪律的强度评级 = **「如实降级 + 残余风险显式声明」**而非同等强度：缓解
  三层 = ① 初始 cwd 锚定沙箱（默认操作面在沙箱内）；② 全量审计留痕（§5.2）；
  ③ 启用主权在运维（env 默认关，§7.5）。声明口径沿 ADR-0012 §6.1「stdio 子
  进程网络行为不可控（固有属性）」先例——安全审计者按此口径评审，不按 safePath
  同等强度口径。
- **会话资产隔离**：每会话独立子目录使会话产物（临时文件/下载物）物理隔离，
  且与 mcp-sqlite.db（tools.ts:33）异目录互不覆盖。

### 4.3 AGENTS.md 硬性约定 3 同等强度对照表（制式：三条款 × 两栏；ADR §2 主表）

制式：每行 = 硬性约定条款 | 既有先例锚点 | PTY 形态外推结论与强度评级。强度
评级三档：**同等强度**（纪律可直接移植）/ **同等强度·形态外推**（纪律语义保持，
参数形态重定义）/ **如实降级 + 声明**（强制不可移植，显式声明+缓解，沿 ADR-0012
§6.1 先例）。定稿内容：

| # | 硬性约定 3 条款（AGENTS.md） | 既有先例锚点 | PTY 形态外推结论 | 强度评级 |
| --- | --- | --- | --- | --- |
| 1 | 后端出站请求必须走 `apps/server/src/guard.ts` | guard.ts 五出口：`:59` guardedFetch / `:71/:81/:93` 搜索网关 / `:107` mcpFetch | guard 收口的是 **server Node 进程内**的 fetch 族出站；PTY 子进程内任意命令（curl/ssh/git push…）的网络访问**不经 guard.ts**——这是 PTY 形态的固有属性（与 ADR-0012 §6.1 stdio 子进程同型）。server 自身因 PTY 会话管理**零新增出站类别**（本地进程面，无 HTTP 出站）。缓解 = ① PTY_ENABLED 默认关（启用主权在运维）；② 残余风险显式声明入附录 A ③ 知悉项；③ 全量审计留痕 | **如实降级 + 声明**（沿 §6.1 stdio 先例） |
| 2 | 文件工具只在 `apps/server/sandbox/` 内 | tools.ts:16 SANDBOX 锚定 / `:19-20` safePath 越界拒绝 / `:33` DB 派生锚定 | safePath 强制拒绝不可移植（§4.2）；外推 = 初始 cwd 锚定 sandbox/pty/<id> 派生目录 + 会话资产物理隔离 + 审计兜底 | **如实降级 + 声明**（§4.2 论证） |
| 3 | 代码节点必须子进程 + 超时 | code.ts:50 spawn 子进程 / `:53` 5s 一次性硬超时 / `:60` 超时语义 | 子进程半面直接同构（PTY 会话=per-session 子进程，§4.1 案 a）；**超时半面必须形态外推**——5s 一次性硬超时对「长驻交互式会话」不可用（交互会话首键即超时）。外推 = 三闸门：idle 超时（无输入输出达阈值即收尾）+ 最大会话时长（硬顶）+ 显式停止（用户/停机触发），数值 env 承载（§7.5），提案默认值 idle 10min / max 60min（量级论证：本仓超时参照系——guard 族 12-20s 为单次出站、connection 10s/30s 为单次调用、code 5s 为一次性执行、sessions turn 无硬顶（人机同席即时交互）；PTY 首次引入「无人值守长驻」形态，双闸提案值为 ADR 提案而非既有先例外推，env 可调、如实标注） | 子进程=**同等强度**；超时=**同等强度·形态外推**（一次性硬超时 → 三闸门） |

### 4.4 资源限额面（ADR §2 尾部）

- **会话数上限**：提案默认 4（env PTY_MAX_SESSIONS；超上限创建请求 429/409
  语义由 BK-0044 实施 SPEC 定）——每会话一子进程（§4.1），上限即进程数护栏。
- **输出限幅**：会话输出回放采用环形缓冲 + 单帧限幅（对齐 tools.ts:34-35
  MAX_ROWS/MAX_CELL 限幅族先例；具体字节数 BK-0044 实施 SPEC 定，ADR 只定
  「环形缓冲 + 限幅存在」的原则）。
- **写入限幅**：单次 write 载荷上限（防巨型注入打爆 PTY 缓冲；数值同上归
  实施 SPEC）。

## 5 · 共享会话权限/审计选项矩阵（PRD 衔接说明 ③载体；ADR §3 蓝图）

**核心安全议题（本链区别于既有单向工具面）**：双写方——用户键入与 agent 注入
进入同一 shell 会话，若不可区分则审计与责任归属失效；且 agent 注入是模型输出
（不可信输入面），用户键入是人因操作（误操作面），两类风险处置路径不同。

### 5.1 双写方标识矩阵

| 方案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · API origin 字段贯穿（推荐）** | 写入端点 body 携带 `origin: 'user' \| 'agent'`（缺省/非法 400），全链路透传至审计表与流回显标记 | 溯源结构化、可查询可断言；agent 路径由服务端会话工具注入（origin=agent 由服务端权威填写，前端不可伪造 agent 身份——用户侧端点校验 origin=user 仅来自面板写入通道） | 多一字段契约面 | **推荐**——溯源是审计的地基，结构性成本最低 |
| b · 仅审计表区分（流不标记） | 审计留痕区分双源，终端流内不呈现来源 | 流呈现零改动 | 事后审查可溯源、实时观察不可辨（共享会话的实时价值减半） | 备选（a 的降级子集） |
| c · 前缀文本标记 | 注入内容自带 `[agent]` 前缀文本 | 零契约改动 | 前缀进入 shell 命令行即语法污染（破坏被执行命令）；可被注入内容伪造 | 否决 |

### 5.2 审计留痕矩阵

| 方案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · 新 pty_audits 表（推荐）** | 沿 approval_audits 先例（store.ts:100-109 字段族形态）新增审计表：{sessionId, origin('user'\|'agent'\|'system'), kind('write'\|'create'\|'close'\|'timeout'…), 摘要（限幅）, created_at}；写入/生命周期事件全量留痕 | 结构化可查询（对照 sessions/messages 表先例）；审计与业务数据同库同事务纪律 | 新表 DDL 面 | **推荐**——沿 approval_audits 直系先例；承载落点（store.ts 扩表 vs pty 模块自有仓储）由 BK-0044 实施 SPEC 定，约束见 §8.4 注 |
| b · 仅 pino 日志留痕 | logger.info 记写入事件 | 零 DDL | 日志非查询面、无完整性承诺 | 不足（可作 a 的补充出口，不独立成案） |
| c · 复用 sessions/messages 表 | 把 PTY 写入当会话消息存 | 零新表 | 语义混淆（messages 是 LLM turn 资产，PTY 写入是 shell 输入流）；schema 强扭 | 否决 |

### 5.3 危险命令面处置矩阵

| 方案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · 仅警示 + 审计（推荐 v1）** | 服务端对写入内容做只读模式匹配（如 rm -rf/格式化/shutdown 族固定清单），命中不拦截、emit 警示事件 + 审计标记位 | 零可用性损失；警示与审计给人事后与实时双通道；不制造伪安全 | 无强制力（如实标注） | **推荐 v1**——与 §4.2/§4.3「如实降级」定级自洽：PTY 面本就无强制边界，处置策略不假装有 |
| b · 拦截清单 | 命中固定清单即拒绝写入 | 表面强制 | shell 变形万花筒（引号/变量/子串/base64/别名）使清单必然漏拦——伪安全比无安全更危险（制造已防护错觉） | 否决（除非未来配合外层强隔离环境） |
| c · 白名单模式 | 仅允许清单内命令 | 真强制（若清单完备） | 对交互式终端可用性致命（用户开终端就是为了任意操作）；清单维护无尽头 | 否决 v1（可作未来「受限模式」档位提案，不在本链） |

**推荐组合（ADR §3 结论段字面）**：5.1-a（origin 贯穿）+ 5.2-a（pty_audits）+
5.3-a（仅警示+审计）——三者合成 v1 权限/审计面；强制边界在 PTY 形态如实声明
为不存在（§4.3 评级），安全承诺=全量溯源 + 启用主权在运维 + 双闸超时，不虚报。

## 6 · 生命周期状态机草图（PRD 衔接说明 ④载体；ADR §4 蓝图）

**表述边界（PRD ④ 明确）**：只列状态与迁移，不写代码、不写伪代码——节点/
处理器实现归 BK-0044 实施 SPEC。

### 6.1 状态与迁移（ADR §4 主图，文字状态机）

```
[不存在] ──create(会话创建请求, PTY_ENABLED=1, 会话数<上限)──▶ active
active  ──idle 超时(PTY_IDLE_TIMEOUT_MS 无输入输出)──▶ closed
active  ──最大时长(PTY_MAX_SESSION_MS 硬顶)──▶ closed
active  ──显式停止(用户 stop / agent 侧停止工具)──▶ closed
active  ──优雅停机(abortActivePtySessions 级联, 5s 宽限强杀)──▶ closed
active  ──PTY 子进程自然退出(exit)──▶ closed
closed  = 终态：close 幂等（重复调用 no-op），子进程已收尾（kill + wait 双确认）
```

- **active 态内子状态 idle 计时**：无输入输出时段的计时态（非实体态）——
  每次有效输入/输出刷新 idle 计时器。
- **PTY_ENABLED=0（默认）**：create 请求直接拒绝（503 语义——功能未启用，
  与「会话不存在」404 区分；具体码 BK-0044 实施 SPEC 定）。

### 6.2 run 正交与注入级联（ADR §4 必答项）

- **PTY 会话与 run 正交**（沿 sessions.ts:3 头注「会话 = 与 run 正交的第一等
  资产」先例）：run 中止/结束时 PTY 会话**存续**——终端会话的生命周期由 §6.1
  六迁移自治管辖，不随 run 绑定。
- **agent 注入通道随 run 级联**：agent 对会话的写入若发生在 run 执行域内（如
  工具调用注入），该次调用随 run 中止级联取消（ctx.ac.signal 透传，engine.ts:33
  + connection.ts callTool signal 先例 + inject.ts per-call finally 同型）；级联
  只断「本次注入调用」，不断会话本身。
- **注入并发约束**：同一会话同一时刻至多一个进行中的 agent 注入（409 守卫，
  sessions.ts:77 同型）；用户键入与 agent 注入的服务端写入串行化（PTY 主进程
  写入天然串行，写入端点无需额外锁，BK-0044 实施 SPEC 复核）。

### 6.3 close 幂等、孤儿防护与启动扫尾（ADR §4 必答项）

- **close 幂等**：沿 connection.ts:46-47 双标志先例——spawnAttempted 置位于
  spawn 发起时（spawn 失败也要走收尾路径防半开态）；closed 置位后重复 close
  为 no-op。
- **判活只用内存注册表**：沿 sessions.ts:12-13「进程崩溃后 DB 残留不可信
  （BK-0011 教训）」——PTY 会话判活 = 进程内注册表（ptyById 同构 sessionsById
  sessions.ts:34-36），DB/审计表只作事后审计不作判活源。
- **孤儿防护双通道**：① 优雅停机——PTY 会话中止并入 shutdown 链（server.ts
  :229-252 序列内，abortActivePtySessions 与 abortActiveSessions :235 同批，
  5s 宽限 (:243) 内未收尾即强杀进程后退出）；② 崩溃恢复——server 重启时进程
  内注册表为空，遗留 PTY 子进程（若有）成为孤儿——启动扫尾沿 BK-0011
  sweepDanglingRuns 形态评估（BK-0044 实施 SPEC 定具体机制：如启动时按审计表
  开放会话记录打 stopped 标记 + 孤儿进程检测；ADR 只定「启动扫尾义务存在」）。

## 7 · 依赖与出站评估（PRD 衔接说明 ⑤载体；ADR §5 蓝图，五面制式）

### 7.1 面 1 · 选型（后端 PTY 库）

| 候选 | 要点（本会话 registry 亲核） | 评估 |
| --- | --- | --- |
| **A · node-pty ^1.1.0（推荐）** | MIT · Microsoft 官方维护 · 单运行依赖 node-addon-api ^7.1.0 · install 脚本 = `node scripts/prebuild.js \|\| node-gyp rebuild`（预编译优先、源码回退）· 自带 TS typings · 无 engines 声明 | **推荐**：事实标准（VS Code 终端同源）；依赖树最小；prebuild 优先降低构建面；官方 lineage 活跃 |
| B · @homebridge/node-pty-prebuilt-multiarch ^0.14.1 | 社区 prebuilt fork · engines node >=20 <27 · 额外依赖 prebuild-install ^7.1.3 + node-addon-api ^8.9.0 | 备选：prebuilt 覆盖面广但多一个运行时依赖 + engines 上限 <27（Node 27+ 即断链）；社区 fork 跟进节奏风险 |
| C · 手写 ConPTY/Unix PTY 绑定 | 零 npm 依赖 | 否决：Windows ConPTY FFI/原生绑定自担成本与安全面远超收益；ADR-0012 §4 案 C 手写 client 同款否决逻辑 |
| ~~@lydell/pty~~ | registry 404 Not Found（本会话亲查） | 不存在，不采（调研记录在案防后人重查） |

### 7.2 面 2 · native 构建（better-sqlite3 教训对照，ADR 必载）

- **allowScripts 纪律**：node-pty 有 install 脚本（prebuild 下载 + node-gyp
  回退）→ 安装须过根 package.json allowScripts 白名单（先例
  `"better-sqlite3@12.11.1": true`，package.json:34-35 亲核）；BK-0044 实施轮
  增 `node-pty@1.1.0: true` 同款。
- **Node 大版本升级**：native 模块随 Node ABI 变化需重装编译（AGENTS.md 已知
  陷阱 better-sqlite3 条目同款纪律：`npm install-scripts approve` + rebuild）。
- **预编译被墙风险**：prebuild 下载走 GitHub release 域——被墙环境回退源码
  编译（需 Windows VS Build Tools / POSIX toolchain）；缓解先例 =
  PLAYWRIGHT_DOWNLOAD_HOST 镜像（AGENTS.md 已知陷阱），实施轮若 CI 拉取失败
  按同域问题处置（镜像 env 或 CI cache）。

### 7.3 面 3 · CI 影响

- contracts job（.github/workflows/ci.yml）增 node-pty 安装编译面：windows-latest
  已证明可编译 better-sqlite3 同链（native 工具链就绪），node-pty prebuild 命中
  时零编译、未命中时同链回退——CI 风险评级低但**首次接入必须实测**（BK-0044
  验收含 CI 盯守）。
- lock 变化：+node-pty（含 node-addon-api 传递依赖）；apps/server/package.json
  +1 依赖 + 根 package.json allowScripts +1 行。

### 7.4 面 4 · 出站类别

- **server Node 进程自身：零新增出站类别**——PTY 会话管理是本地进程面
  （spawn/IPC/SSE 推送），无任何新 HTTP 出站目标；guard.ts 五出口零改动。
- **残余风险（非类别申报，声明知悉项）**：PTY 子进程内命令的网络访问不经
  guard.ts（§4.3 条款 1 同一事实）——处置 = 声明入附录 A ③ + PTY_ENABLED
  默认关 + 审计留痕。**结论：无新「guard 出站类别」申报项，有残余风险声明项，
  两者在附录 A 分列不混同。**

### 7.5 面 5 · env 承载（均属 POLICY 需批准区，config.ts 白名单纪律）

| env（提案名） | 语义 | 提案默认 | 校验（zod fail-fast，config.ts:51-74 先例） |
| --- | --- | --- | --- |
| PTY_ENABLED | PTY 会话功能总开关（默认关——启用主权在运维，§4.3/§7.4 缓解①） | 0 | TRUTHY/FALSY（ALLOW_PRIVATE_NET 同款 :39-40） |
| PTY_IDLE_TIMEOUT_MS | idle 超时闸门（§6.1） | 600000 | 正整数，下限护栏（如 ≥60000，防误配秒级超时） |
| PTY_MAX_SESSION_MS | 最大会话时长硬顶（§6.1） | 3600000 | 正整数，≥ idle 超时（交叉校验，E9 跨 env 先例 config.ts:101-108） |
| PTY_MAX_SESSIONS | 并发会话数上限（§4.4） | 4 | 正整数 1-16 |

- 备选「常量内嵌零 env」否决理由：三闸门数值是运维参数（不同部署环境风险
  档位不同），内嵌即每次调优都要发版——与 config.ts 全 env 风格（15 key 白名单
  :29-34）相悖。
- **前端渲染依赖补充评估（BK-0045 行内既定口径「xterm.js 类前端依赖若需要随
  BK-0043 SPEC 评估一并请批」）**：@xterm/xterm ^6.0.0——MIT · **零依赖**纯
  前端渲染库（registry 亲核）；旧包名 xterm@5.3.0 **已弃用**（官方提示迁移至
  @xterm/xterm）→ 选型定稿 @xterm/xterm ^6.0.0（scoped 新名），随附录 A ① 一并
  请批（BK-0045 消费）。前端依赖入 apps/web/package.json——**注意**：web 构建链
  （Vite）接入新包不触 UI 三层渲染结果（终端节点 UI 是 BK-0045 修宪轮新增面），
  但依赖安装本身属 POLICY 需批准区，一律入 issue。

### 7.6 调研记录（日期与来源，2026-10-25 12:2x 本会话亲查；BUILD 转写 ADR 时
**必须复核时效**——沿 ADR-0012「实施轮必须复核时效」先例，BK-0044 实施 SPEC
落笔时逐项复验版本号与 install 面）

| 事实 | 来源 |
| --- | --- |
| node-pty 1.1.0：MIT / Microsoft / 单依赖 node-addon-api ^7.1.0 / install = `node scripts/prebuild.js \|\| node-gyp rebuild` / 自带 typings / 无 engines / 无 os 限制 | registry.npmjs.org/node-pty/latest（curl 亲取） |
| @homebridge/node-pty-prebuilt-multiarch 0.14.1：engines node >=20 <27 / 依赖 node-addon-api ^8.9.0 + prebuild-install ^7.1.3 | registry.npmjs.org/@homebridge/node-pty-prebuilt-multiarch/latest |
| @lydell/pty：Not Found（包不存在） | registry.npmjs.org/@lydell/pty/latest → 404 |
| @xterm/xterm 6.0.0：MIT / 零 dependencies | registry.npmjs.org/@xterm/xterm/latest |
| xterm 5.3.0 已弃用："This package is now deprecated. Move to @xterm/xterm instead." | registry.npmjs.org/xterm/latest |

## 8 · 请批结论、附录 A 五要素与 BK-0044/0045 定界（PRD 衔接说明 ⑥⑦载体）

### 8.1 请批结论（ADR §5 尾部结论段字面）

**结论 = 有需批准面**（非零请批面）：① 新增 npm 依赖两项（node-pty ^1.1.0
后端 + @xterm/xterm ^6.0.0 前端，§7.1/§7.5）；② 新增 env 语义四项（§7.5）；
③ PTY 子进程网络/文件两处残余风险声明知悉（§4.2/§4.3/§7.4）；④ 实施顺序
授权（BK-0044 → BK-0045）。四项均以附录 A issue 草案承载，**获批前 BK-0044/
0045 维持 proposed 零实现**；父项 issue#5 批复（2026-10-23T15:49:06Z）承继的
是 BK-0045 修宪实施授权，不自动覆盖本清单任何一项。

### 8.2 端点族与流格式设计定稿（定界依据；ADR §3 尾部/§7 引用）

- **端点族（/api/v1/pty/*，v1-only 沿 sessions :215-219 先例；最终命名
  BK-0044 实施 SPEC 可微调，ADR 定语义）**：
  `POST /api/v1/pty/sessions`（创建→201 {sessionId}；PTY_ENABLED=0 拒绝）·
  `GET /api/v1/pty/sessions`（列出活动会话）·
  `GET /api/v1/pty/sessions/:id/stream`（SSE 输出流，服务端→客户端单向）·
  `POST /api/v1/pty/sessions/:id/write`（双源写入 body {data, origin}，
  origin 校验 §5.1-a）·
  `POST /api/v1/pty/sessions/:id/stop`（显式停止；404 无活动语义沿
  sessionStopHandler :56-63 先例）。
- **流格式 = 端点私有事件面，零 shared 契约**：PTY 输出流是独立端点域（非 run
  流、非 session turn 流），采用**端点私有 SSE 帧**（如 JSON 帧 {t:'data'|
  'exit', …}），**不进 RunEventSchema**（packages/shared 零改动）——与 BK-0016
  「turn 流复用 15 种事件」是两条不同的合规路径（复用是选择，不进契约也是选择；
  本案选后者因 node:delta 累积全文语义与 ANSI 追加流不合身）。**护栏**：实施中
  确需把 PTY 事件加入 RunEventSchema 即触 POLICY 需批准区（shared 契约变更），
  立即中止转 needs-approval，不得自主新增（沿 BK-0016 行内护栏先例口径）。

### 8.3 附录 A 五要素字面量（ADR §6 载体；脚本开 issue 逐字取用；ADR-0012
附录 A 直系样板）

**标题**：

```
[needs-approval] BK-0044/0045 PTY 交互终端实施：请批新增依赖（node-pty + @xterm/xterm）+ 新 env 语义 ×4 + 残余风险知悉（ADR-0014）
```

**正文**：

```
按 POLICY.md 需批准区，PTY 交互终端实施（BK-0044 后端运行时 / BK-0045 终端节点
UI 修宪轮）需先经您批复以下承载。安全世界设计方案全文见 ADR-0014 草案
（docs/adr/0014-pty-terminal-security-world.md，2026-10-25 调研）。批准前零实现。
父项 issue#5 的批复（2026-10-23）承继的是 BK-0045 修宪实施授权，不自动覆盖本清单。

请批清单：

① 新增 npm 依赖两项：
   - node-pty ^1.1.0（后端 PTY 承载）：MIT · Microsoft 官方 · 单依赖
     node-addon-api ^7.1.0 · install 走 prebuild 优先 + node-gyp 源码回退；native
     模块须入根 package.json allowScripts 白名单（better-sqlite3 同款纪律），
     Node 大版本升级需重装编译（AGENTS.md 已知陷阱同款）。否决社区 prebuilt fork
     （多一运行时依赖 + engines <27 断链风险）与手写绑定（成本/安全面不可担）。
   - @xterm/xterm ^6.0.0（前端终端渲染，BK-0045 消费）：MIT · 零依赖；旧包名
     xterm 已弃用，采 scoped 新名（BK-0045 行内既定「随 BK-0043 SPEC 一并请批」）。

② 新增环境变量语义四项（config.ts zod fail-fast 白名单）：PTY_ENABLED（总开关，
   默认 0 关——启用主权在运维）/ PTY_IDLE_TIMEOUT_MS（idle 超时，默认 600000）/
   PTY_MAX_SESSION_MS（会话时长硬顶，默认 3600000）/ PTY_MAX_SESSIONS（并发上限，
   默认 4）。超时三闸门 = code 节点 5s 一次性硬超时向长驻交互形态的外推
   （ADR §2 对照表条款 3）。

③ 残余风险声明知悉（如实降级 + 缓解，非同等强度承诺）：PTY 子进程内命令的
   网络访问不经 guard.ts（guard 只覆盖 server 进程内 fetch 族——与 ADR-0012
   §6.1 stdio 子进程同型固有属性）；shell 可 cd 出沙箱（safePath 强制拒绝在
   PTY 形态不可移植）。缓解三层：初始 cwd 锚定 sandbox/pty/<会话id>/ + 全量
   pty_audits 审计留痕（沿 approval_audits 先例）+ PTY_ENABLED 默认关。
   server 进程自身零新增出站类别、guard 五出口零改动。

④ 实施顺序：BK-0044（后端：pty 模块会话管理 + /api/v1/pty 端点族 + pty_audits
   + 停机/启动扫尾）→ BK-0045（终端节点 UI 修宪轮，链终轮回执 issue#5 关单；
   修宪授权 = issue#5 批复承继 + ADR-0014）。本 issue 批准即解除 BK-0044 转
   ready 的依赖门槛；BK-0045 另待 BK-0044 CLOSE。

⑤ 证据链接：ADR-0014 草案（docs/adr/0014-pty-terminal-security-world.md）·
   PRD（docs/evolution/iterations/0028/PRD.md）· SPEC
   （docs/evolution/iterations/0028/SPEC.md，安全设计定稿与调研记录）· 代码现状
   （code.ts:50-60 子进程+超时 / tools.ts:16-33 沙箱锚定 / guard.ts:33-109 五
   出口 / mcp/connection.ts:22-47 生命周期 / config.ts:29-74 env 白名单）·
   BACKLOG 定界（BK-0043/0044/0045 行，迭代 0028 回写）。

您在本 issue 评论「批准」即视为同时授权 ①~③ 项承载并确认 ④ 实施顺序
（BK-0044 转 ready）；评论「驳回」则 BK-0044/0045 维持 proposed，ADR-0014 归档
为未采纳方案。
```

### 8.4 BK-0044/BK-0045 定界与 BACKLOG 回写字面量（权威字面量单一载体=本节；
BUILD 逐字转写 ADR §7 + 逐字粘贴 BACKLOG 行备注）

**BK-0044（PTY 会话后端运行时）四要素**：

> 受影响文件 = `apps/server/src/pty/` 新模块（session.ts 会话管理+注册表判活+
> 三闸门超时 + routes.ts 端点族五端点 + audit 仓储；各文件 ≤400 行）+
> `server.ts` 路由注册 + 停机出口并入（abortActivePtySessions 与
> abortActiveSessions :235 同批 + 启动扫尾接线）+ `config.ts` rawEnv 白名单
> +4 key 与 zod 校验 + 交叉校验（E9 先例）+ store.ts 扩 pty_audits 表或 pty
> 模块自有仓储（二选一由实施 SPEC 定；约束 = store.ts 现恰 400 行贴线，扩表
> 须同步拆分沿 ≤400 纪律）+ 根 package.json allowScripts +node-pty 行 +
> `apps/server/package.json` +node-pty ^1.1.0 + `tests/smoke/` pty 断言组
> （创建/双源写入/流回放/停止/idle 与 max 超时/停机级联/无孤儿/PTY_ENABLED=0
> 拒绝）+ 根 package.json 冒烟 script 行。验收口径 = npm run build:server +
> npm test + npm run smoke:server 扩断言零回退 + 端点级手动 E2E（curl 五端点
> 全走查 + 双源写入流式回放 + 停止 + 超时触发）+ CI contracts job 盯守（native
> 编译面首次接入实测）。依赖关系 = 前置 BK-0043 CLOSE 且 ADR-0014 附录 A
> needs-approval issue 获用户批复；晋升条件 = 两者齐备后由 PLAN 轮晋升。

**BK-0045（PTY 交互终端节点 UI 修宪轮——BK-9005 链终轮）四要素**：

> 受影响文件 = `packages/shared/src/nodes/<type>/{node.ts,README.md}` 新增
> （NDP 目录制；节点类型名/端口/参数草案以 ADR-0014 §7 索引为准——建议 type
> 'terminal'、in-ctx 上下文入 / out-session 会话引用出，DEFS 细化归 BK-0045
> 实施 SPEC，本 ADR 不预写 DEFS 代码块）+ `nodes.ts` 聚合层 +1 import +1 键 +
> `nodes.baseline.json` 重产 + 守卫/契约测试联动 + 前端三文件（终端节点渲染/
> 流式呈现/用户输入交互；@xterm/xterm ^6.0.0 已随 ADR-0014 附录 A ① 一并请批）
> + gate 场景增量（新场景 golden-created、受波及既有场景修宪轮重录，通道与
> 场景清单 BK-0045 实施 SPEC 定）。验收口径 = npm run build + npm run gate
> （增量后全绿）+ npm test + npm run smoke:server 零回退 + 手动 E2E（用户与
> agent 共享会话交互点位：建会话 → 用户键入 → agent 注入 → 停止 → 恢复，
> BK-0045 实施 SPEC 定细化）。依赖关系 = 前置 BK-0043 + BK-0044；晋升条件 =
> 两者 CLOSE 后随链晋升。**本链终轮——CLOSE 时回执 issue#5 关单**（沿
> issue#10/11 终轮先例，中间子项不回执）。授权链 = issue#5 批复承继
> （2026-10-23T15:49:06Z）+ ADR-0014（修宪实施授权）；SSE 契约护栏 = PTY 流走
> 端点私有事件面零 shared 改动（ADR-0014 §6 流格式定稿），确需进 RunEventSchema
> 即中止转 needs-approval。

**BACKLOG 两行回写字面量（BUILD 逐字粘贴；仅替换备注列，其余列含状态
proposed 逐字不动）**：

**BK-0044 行备注 →**：

```
触UI=否（后端承载项）但含需批准面——新依赖 node-pty ^1.1.0（ADR-0014 §5 选型定稿：MIT/官方/单依赖/prebuild 优先，否决 prebuilt fork 与手写绑定）+ @xterm/xterm ^6.0.0 前端渲染（BK-0045 消费，随 ADR-0014 附录 A ① 一并请批——本行既定口径兑现）+ 新 env 语义 ×4（PTY_ENABLED 默认 0/PTY_IDLE_TIMEOUT_MS/PTY_MAX_SESSION_MS/PTY_MAX_SESSIONS）+ PTY 子进程网络不经 guard 与 shell 可越沙箱两处残余风险声明知悉（ADR-0014 §2 同等强度对照表：如实降级+缓解三层）——均入 ADR-0014 附录 A 请批 issue，获批前零实现；受影响文件=apps/server/src/pty/ 新模块（session.ts 会话管理+注册表判活+三闸门超时 + routes.ts 端点族五端点（create/list/stream SSE/write 双源 origin/stop，流走端点私有事件面零 shared 契约）+ audit 仓储，各 ≤400 行）+ server.ts 路由注册与停机出口并入（abortActivePtySessions 同批 + 启动扫尾沿 BK-0011 形态）+ config.ts +4 env 白名单与 zod + store.ts pty_audits 表（沿 approval_audits 先例；store 现 400 行贴线，承载落点实施 SPEC 定）+ package.json allowScripts +node-pty + apps/server/package.json +1 依赖 + tests/smoke pty 断言组；验收口径=npm run build:server + npm test + smoke:server 扩断言零回退 + 端点级手动 E2E（五端点走查/双源写入流式回放/停止/超时/停机级联无孤儿）+ CI contracts 盯守（native 首次接入实测）；依赖关系=前置 BK-0043 CLOSE 且 ADR-0014 附录 A needs-approval issue 获用户批复；晋升条件=两者齐备后由 PLAN 轮晋升
```

**BK-0045 行备注 →**：

```
触UI=是——修宪轮（授权链 = issue#5 批复承继 2026-10-23T15:49:06Z + ADR-0014，ADR §7 定界与迭代 0028 SPEC §8.4 字面一致）：受影响文件=packages/shared/src/nodes/<type>/{node.ts,README.md} 新增（NDP 目录制；建议 type 'terminal'/in-ctx 入/out-session 出，DEFS 细化归实施 SPEC，ADR 不预写 DEFS 代码块）+ nodes.ts 聚合层 +1 import +1 键 + nodes.baseline.json 重产 + 守卫/契约测试联动 + 前端三文件（终端节点渲染/流式呈现/用户输入交互；@xterm/xterm ^6.0.0 已随 ADR-0014 附录 A ① 请批——旧包名 xterm 已弃用）+ gate 场景增量（新场景 golden-created、受波及场景修宪轮重录，清单实施 SPEC 定）；SSE 契约护栏=PTY 流走端点私有事件面零 shared 改动（ADR-0014 §6 定稿），确需进 RunEventSchema 即中止转 needs-approval；验收口径=npm run build + npm run gate（增量后全绿）+ npm test + smoke:server 零回退 + 手动 E2E（共享会话交互点位：建会话→用户键入→agent 注入→停止→恢复）；依赖关系=前置 BK-0043 + BK-0044；晋升条件=两者 CLOSE 后随链晋升；**本链终轮**——CLOSE 时回执 issue#5 关单（沿 issue#10/11 终轮先例，中间子项不回执）
```

**BK-0043 行**：状态流转（ready→doing→done）归脚本/CLOSE，BUILD 不碰；
BK-9005 行（skipped 留指向）逐字不动。

### 8.5 回写规则

BUILD 逐字粘贴 §8.4 两段字面量到对应行备注列（`|` 分隔最后单元格整列替换）；
VERIFY 按 AC4 与 ADR-0014 §7 定界节做三方比对（BACKLOG 行 ↔ ADR §7 ↔ 本
SPEC §8.4——三者关键内容一致，BACKLOG 行与 ADR §7 以「ADR §7 定界与迭代
0028 SPEC §8.4 字面一致」互指 + 四要素逐项语义相等为 VERBATIM-OK 判据；本
SPEC §8.4 为权威字面量单一载体，ADR §7 由其压缩转写，行内细节差异以本 SPEC
为准——BK-0027/BK-0032 VERBATIM-OK 先例同构）。

## 9 · 验收口径（AC1~AC7 逐条执行命令与核对方法）

**总门禁（AC6，工作流脚本统一执行——先例 0012/0014/0016/0017/0019/0023~0027：
VERIFY 不必复跑全套，REPORT 引用门禁结论）**：

```
npm run build        # shared + web 构建
npm run gate         # 8 场景 0 容差像素比对（纯回归面——前端零改动，预期 diffPx=0）
npm test             # build:shared + build:server + shared 契约测试（现基线 30/30，metrics 0022 行）
npm run smoke:server # 后端冒烟（现基线 95 passed / 0 failed，metrics 0026/0027 行）
```

零代码改动轮四命令全绿即证基线未受扰动；任何红即环境异常回滚不硬闯。smoke
V09 时点性假红先例（产品提交前 git 半边必红，0018/0021/0022/0024）：提交后
CLOSE 复跑自愈，VERIFY 记实得值判据 = 0 failed。

- **AC1 · ADR 落盘与七要素完备**：`ls docs/adr/0014-*.md` 恰一文件；
  `wc -l docs/adr/0014-pty-terminal-security-world.md` ≤400；
  `grep -n "草案" docs/adr/0014-*.md` 状态行命中且含「待用户批准（依赖与 env
  请批面——附录 A）/ 待实施轮消费」双位标注 + 授权链（issue#5 批复承继
  2026-10-23T15:49:06Z）+「依赖面须另批、父项批复不自动覆盖」字面；逐节核对
  ADR §1~§7 对照 PRD 七要素（动机/进程模型与沙箱边界/共享会话权限与审计/
  超时与生命周期/依赖与出站评估/请批清单/子项定界）每要素成节可索引。
- **AC2 · 安全设计锚点真实可核**：按 ADR §2 同等强度对照表逐条对照代码锚点
  （code.ts:50/:53/:60、tools.ts:16/:19-20/:23/:33、guard.ts:33-56/:59-62/:71/
  :81/:93/:107、connection.ts:22-31/:46-47、config.ts:29-34/:51-74、
  sessions.ts:34-36/:56-63/:167-176、server.ts:215-219/:229-252、engine.ts:33、
  store.ts:100-109、package.json:34-35）——逐一相符、无一杜撰；对照表三条款
  （guard 出站/文件限沙箱/子进程+超时）逐条有强度评级落点，且含 code 节点 5s
  一次性超时向长会话外推的明确结论（三闸门）。
- **AC3 · 依赖评估与请批结论成文**：ADR §5 五面齐备（选型利弊含 node-pty 与
  替代、native 构建含 better-sqlite3/allowScripts 教训对照、CI 影响、出站
  （零新类别结论 + 残余风险声明分列）、env 承载四项 + 前端 @xterm/xterm 评估）
  + 调研记录表（含来源与「实施轮必须复核时效」义务）；结论 = 有需批准面，
  附录 A 五要素齐备（标题/背景/请批面清单/授权范围边界/批复语义——§8.3 字面
  量转写）；两种结论路径均不改变本轮零依赖边界（lock 零变化机器证明兜底）。
- **AC4 · 定界回写 VERBATIM 一致**：读 BACKLOG BK-0044/BK-0045 两行备注与
  本 SPEC §8.4 字面量逐字比对（BK-0027/BK-0032 VERBATIM-OK 先例标准）；ADR
  §7 定界节与 §8.4 语义相等（§8.5 判据）；`grep -n "| proposed |"
  docs/evolution/BACKLOG.md` BK-0044/BK-0045 两行状态仍在；BK-9005 行逐字
  不动（`git diff <base> -- docs/evolution/BACKLOG.md` 核对，另含 PLAN 轮
  BK-0033/0034 晋升改写为预期存量差异）。
- **AC5 · 白名单与零代码机器证明**：`git show --numstat <产品提交>` 输出恰
  `docs/adr/0014-pty-terminal-security-world.md`（+N/−0 纯新增）一行；
  `git diff <base>..<产品提交> -- apps packages tools tests .github
  package.json package-lock.json` 输出为空（零依赖引入 = lock 零变化）。
- **AC7 · 指针抽样可开**：从 ADR 引用的代码/文件/issue 指针抽样 ≥5 条逐一
  打开比对（建议抽样：`code.ts:50-60`、`tools.ts:16-33`、`guard.ts:59-109`、
  `mcp/connection.ts:22-47`、`config.ts:29-74`、`sessions.ts:167-176`、
  `server.ts:229-252`、BACKLOG BK-0043/BK-0044/BK-0045/BK-9005 行、issue#5
  链、ADR-0012 §6.1/附录 A 任五以上）；file:line 或行段射程内命中；任一失效
  即 FAIL 列 BUG。
- **手动 E2E 点位（纯文档轮，非阻塞）**：`npm start`（或等效）→ 浏览器打开
  http://localhost:3000 确认应用可起、画布正常加载、节点库 16 节点清单不变
  （证明文档轮对运行时零影响）；门禁四命令已覆盖其余回归面。

## 10 · 回滚步骤

`git revert <产品提交>`（WORKFLOW §6 唯一回滚手段）。纯文档提交无运行时影响：
ADR-0014 移除、BACKLOG 两行备注回到拆分时文案；BK-0044/0045 状态全程 proposed
不受回滚影响；无数据迁移、无降级脚本。issue#5 无回执义务（本轮仅进度回执，
关单留 BK-0045 终轮）；若附录 A issue 已开而本轮回滚，由协调者在 issue 留言
作废（脚本动作）。

## 11 · 风险与声明

1. **ADR 越界预支实现**（PRD 风险 1）：本 SPEC 已把定界粒度锚定 BK-0027/
   BK-0032 先例（方案选项+利弊+推荐+文件清单+验收口径）；§6 状态机只列状态与
   迁移不写代码；BK-0045 明确「ADR 不预写 DEFS 代码块」（§8.4）；BUILD 转写
   禁止扩写实施伪代码；VERIFY AC1 逐节审。
2. **把「依赖面须另批」弱化为「父项批复已覆盖」**（PRD 风险 2）：AC1 硬性
   双标注（状态行字面含「依赖面须另批、父项批复不自动覆盖」）；§8.1 结论四项
   分列；附录 A 授权范围边界独立成段（批复语义精确到「①~③ 承载 + ④ 顺序」）。
3. **安全设计脱离既有纪律自创新口径**（PRD 风险 3）：§4.3 对照表锚定 AGENTS.md
   硬性约定 3 三条款 + 十余处代码先例，且**强度评级如实分档**（同等强度 / 形态
   外推 / 如实降级+声明）——不为 PTY 虚构「已防护」强度；AC2 逐条复核兜底。
4. **依赖评估遗漏 native 构建/CI 面**（PRD 风险 4）：§7.2/§7.3 强制含
   allowScripts 纪律（package.json:34-35 先例）+ prebuild 被墙回退（镜像先例）
   + CI 首次接入实测义务；§7.6 调研记录含「实施轮必须复核时效」。
5. **定界回写与 ADR 漂移**（PRD 风险 5）：§8.5 三方 VERBATIM 判据 + 权威字面量
   单一载体（本 SPEC §8.4）；VERIFY 逐字比对。
6. **smoke V09 时点性假红**（PRD 风险 6）：沿先例口径——提交后 CLOSE 复跑
   自愈，VERIFY 记实得值判据 0 failed。
7. **npm 事实时效风险**（本 SPEC 新增）：§7 六项 registry 事实为 2026-10-25
   快照（node-pty 1.1.0 等）；BUILD 转写 ADR 时照录并保留调研记录表与复核
   义务（ADR-0012「实施轮必须复核时效」同款），**不更新为转写日新值**（快照
   与方案评估配套；实施轮 SPEC 复核才是更新时点）。
8. **超时提案值无先例锚**（本 SPEC 新增）：idle 10min / max 60min / 上限 4
   会话为**提案值**（本仓无会话级超时先例，§4.3 条款 3 已如实标注「提案而非
   外推」）；用户或实施轮可调（env 承载即为此设计），ADR 不将其表述为先例
   外推结论。
