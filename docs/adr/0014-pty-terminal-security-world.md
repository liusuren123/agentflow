# ADR-0014 · PTY 交互终端「安全世界设计」草案（进程模型 / 沙箱锚定 / 共享会话权限审计 / 生命周期 / 依赖与出站请批）

- 状态：**草案 · 待用户批准（依赖与 env 请批面——附录 A）/ 待实施轮消费
  （BK-0044 PTY 后端运行时 / BK-0045 终端节点 UI 修宪轮——链终轮）；授权链 =
  issue#5 用户批复承继（2026-10-23T15:49:06Z，见 BACKLOG BK-9005 行）——承继的
  是修宪实施授权，依赖面须另批、父项批复不自动覆盖**
- 日期：2026-10-25（SPEC 阶段产出，迭代 0028 / BK-0043）
- 关联：BACKLOG BK-0043（本 SPEC 先行轮，issue#5）/ BK-0044（PTY 后端运行时，
  proposed）/ BK-0045（终端节点 UI 修宪轮，链终轮，proposed）/ BK-9005（skipped，
  拆分母项）/ BK-0021（NDP 目录制，done）/ BK-0016（sessions 与停机级联，done）/
  BK-0028 · BK-0030（连接生命周期与 guard 出站收口，done）；ADR-0012（§6.1
  残余风险声明 + 附录 A 五要素直系先例）/ ADR-0013（头部状态块体例）；
  ROADMAP T5-M3 智能体工作台 UI；POLICY.md 需批准区（新增 npm 依赖、新增
  环境变量语义）
- 调研时点：2026-10-25（npm registry 联网调研，来源清单见 §5.6；**BK-0044
  实施 SPEC 必须复核时效**——落笔时逐项复验版本号与 install 面）
- 版式对齐：ADR-0012 / ADR-0013

> **显著声明：本 ADR 为安全世界设计草案，不实施任何代码、不引入任何依赖、不新增
> 任何 env、不改变任何运行时行为。全部依赖 / env / 出站事项仅以文字方案存在，
> BK-0044 / BK-0045 转 ready 的前置含 needs-approval issue 获用户本人批复（附录 A）；
> 父项 issue#5 批复承继的是 BK-0045 修宪实施授权，不自动覆盖本清单任何一项。本文件
> 状态行在实施轮 CLOSE 时按 ADR-0010/0012 先例更新，全文不出现批准态措辞。**

## 1. 动机与现状证据

issue#5（BK-9005，用户批复 2026-10-23T15:49:06Z；2026-10-25 治理日拆分后由
BK-0043→0044→0045 承继授权）注入的是**交互式 PTY 终端节点**：用户与 agent 共享
同一 shell 会话。立项语「安全世界设计先行」（BK-9005 行内原文）即本 ADR 的使命：
先定安全世界，再谈实现。「用户共享会话 = 双写方（用户键入 + agent 注入）」是本链
区别于既有单向工具面（MCP 工具 / 代码节点）的核心安全议题。

差异化定位（ROADMAP T5「画布编排 × 深度智能体工作台」空白带）：PTY 共享会话是
agent 工作台赛道（Claude Code / Cursor）的核心交互形态，DAG 编排赛道普遍缺位——
本链是差异化主轴的关键一子。

安全素材地基四条（均 done；本文引用锚点均 2026-10-25 BUILD 会话亲核）：

- **子进程 + 超时纪律**：`apps/server/src/code.ts:50` spawn 三管道子进程承载代码
  节点，`:53` 5s 超时强杀，`:60` 超时语义如实报错。
- **沙箱锚定**：`apps/server/src/tools.ts:16` SANDBOX 常量锚定
  `apps/server/sandbox/`，`:19-20` safePath 路径越界拒绝，`:23` ensureSandbox
  惰性建目录，`:33` DB 派生锚定先例。
- **出站收口**：`apps/server/src/guard.ts` 现五出口——`:59` guardedFetch /
  `:71` `:81` `:93` 搜索三网关 / `:107` mcpFetch。
- **生命周期**：`apps/server/src/mcp/connection.ts:46-47` 双标志 + close 幂等
  （`:77-83`）；`apps/server/src/sessions.ts` 与 run 正交的会话资产 +
  `:167-176` abortActiveSessions 停机出口；`server.ts:229-252` 优雅停机链
  （`:235` 会话同批中止、`:241-243` 5s 宽限轮询、`:250` closeStore）。

仓内 PTY 零承载：`grep -rni "node-pty|\bpty\b" apps/server/src package.json
apps/server/package.json` 零命中（BUILD 会话亲跑，exit 1）——本链为全新能力面，
无存量包袱亦无存量防护。

## 2. PTY 会话进程模型与沙箱边界

### 2.1 进程拓扑三案

| 拓扑案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · 每会话一 PTY 子进程（推荐）** | 会话创建时惰性 spawn 一个 PTY 子进程（shell），会话关闭即进程收尾 | 与既有纪律同构：code.ts:50 一次性子进程 + connection.ts 惰性连接先例；会话间零交叉污染；崩溃半径=单会话；审计与生命周期一一对应 | 会话数=进程数，须配会话数上限（§2.4） | **推荐**——池化与复用在「交互式 shell」语义下无收益（shell 状态即会话状态，复用即串话） |
| b · 进程池预热 | 预热 N 个 shell 待分配 | 首键延迟低 | shell 启动 <100ms 量级，预热收益可忽略；池管理 + 消毒（环境变量/工作目录/历史残留）复杂度高；串话风险 | 否决 |
| c · 共享单 shell 多路复用 | 全部会话复用一个 shell 进程 | 进程面最小 | 双写方 × 多会话交叉污染，审计不可归属；单点崩溃全灭 | 否决（安全面一票否决） |

### 2.2 cwd 锚定方案与沙箱纪律的关系（如实定级）

- **锚定方案**：每会话初始工作目录 = `apps/server/sandbox/pty/<sessionId>/`
  （SANDBOX 常量派生子目录——对齐 tools.ts:16 → :33 SQLITE_DB 派生先例；会话
  建立时惰性 mkdir，对齐 ensureSandbox :23）。
- **如实定级（本 ADR 核心诚实面）**：tools.ts safePath 的**强制路径越界拒绝
  （:19-20）在 PTY 形态不可移植**——shell 的本质就是可 `cd` 到任意目录，任何
  运行时拦截都是伪安全（`cd` 变形万花筒：子 shell / 符号链接 / env 扩展）。故
  PTY 对沙箱纪律的强度评级 = **「如实降级 + 残余风险显式声明」**而非同等强度：
  缓解三层 = ① 初始 cwd 锚定沙箱（默认操作面在沙箱内）；② 全量审计留痕
  （§3.2）；③ 启用主权在运维（env 默认关，§5.5）。声明口径沿 ADR-0012 §6.1
  「stdio 子进程网络行为不可控（固有属性）」先例——安全审计者按此口径评审，
  不按 safePath 同等强度口径。
- **会话资产隔离**：每会话独立子目录使会话产物（临时文件/下载物）物理隔离，
  且与 mcp-sqlite.db（tools.ts:33）异目录互不覆盖。

### 2.3 AGENTS.md 硬性约定 3 同等强度对照表

强度评级三档：**同等强度**（纪律可直接移植）/ **同等强度 · 形态外推**（纪律
语义保持，参数形态重定义）/ **如实降级 + 声明**（强制不可移植，显式声明 +
缓解，沿 ADR-0012 §6.1 先例）。

| # | 硬性约定 3 条款（AGENTS.md） | 既有先例锚点 | PTY 形态外推结论 | 强度评级 |
| --- | --- | --- | --- | --- |
| 1 | 后端出站请求必须走 guard.ts | guard.ts 五出口（:59/:71/:81/:93/:107） | guard 收口的是 **server Node 进程内**的 fetch 族出站；PTY 子进程内任意命令（curl/ssh/git push…）的网络访问**不经 guard.ts**——PTY 形态的固有属性（与 ADR-0012 §6.1 stdio 子进程同型）。server 自身因 PTY 会话管理**零新增出站类别**（本地进程面，无 HTTP 出站）。缓解 = ① PTY_ENABLED 默认关（启用主权在运维）；② 残余风险显式声明入附录 A ③ 知悉项；③ 全量审计留痕 | **如实降级 + 声明**（沿 §6.1 stdio 先例） |
| 2 | 文件工具只在 apps/server/sandbox/ 内 | tools.ts:16 锚定 / :19-20 越界拒绝 / :33 派生锚定 | safePath 强制拒绝不可移植（§2.2）；外推 = 初始 cwd 锚定 sandbox/pty/&lt;id&gt; 派生目录 + 会话资产物理隔离 + 审计兜底 | **如实降级 + 声明**（§2.2 论证） |
| 3 | 代码节点必须子进程 + 超时 | code.ts:50 spawn / :53 5s 一次性硬超时 / :60 超时语义 | 子进程半面直接同构（PTY 会话=per-session 子进程，§2.1 案 a）；**超时半面必须形态外推**——5s 一次性硬超时对「长驻交互式会话」不可用（交互会话首键即超时）。外推 = 三闸门：idle 超时（无输入输出达阈值即收尾）+ 最大会话时长（硬顶）+ 显式停止（用户/停机触发），数值 env 承载（§5.5），提案默认 idle 10min / max 60min（量级论证：本仓超时参照系——guard 族 12-20s 为单次出站、connection 10s/30s 为单次调用、code 5s 为一次性执行、sessions turn 无硬顶（人机同席即时交互）；PTY 首次引入「无人值守长驻」形态，双闸提案值为 ADR 提案而非既有先例外推，env 可调、如实标注） | 子进程=**同等强度**；超时=**同等强度 · 形态外推**（一次性硬超时 → 三闸门） |

### 2.4 资源限额面

- **会话数上限**：提案默认 4（env PTY_MAX_SESSIONS；超上限创建请求 429/409
  语义由 BK-0044 实施 SPEC 定）——每会话一子进程（§2.1），上限即进程数护栏。
- **输出限幅**：会话输出回放采用环形缓冲 + 单帧限幅（对齐 tools.ts:34-35
  MAX_ROWS/MAX_CELL 限幅族先例；具体字节数 BK-0044 实施 SPEC 定，本 ADR 只定
  「环形缓冲 + 限幅存在」的原则）。
- **写入限幅**：单次 write 载荷上限（防巨型注入打爆 PTY 缓冲；数值同上归
  实施 SPEC）。

## 3. 用户与 agent 共享会话的权限 / 审计面

**核心安全议题（本链区别于既有单向工具面）**：双写方——用户键入与 agent 注入
进入同一 shell 会话，若不可区分则审计与责任归属失效；且 agent 注入是模型输出
（不可信输入面），用户键入是人因操作（误操作面），两类风险处置路径不同。

### 3.1 双写方标识矩阵

| 方案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · API origin 字段贯穿（推荐）** | 写入端点 body 携带 `origin: 'user' \| 'agent'`（缺省/非法 400），全链路透传至审计表与流回显标记 | 溯源结构化、可查询可断言；agent 路径由服务端会话工具注入（origin=agent 由服务端权威填写，前端不可伪造 agent 身份——用户侧端点校验 origin=user 仅来自面板写入通道） | 多一字段契约面 | **推荐**——溯源是审计的地基，结构性成本最低 |
| b · 仅审计表区分（流不标记） | 审计留痕区分双源，终端流内不呈现来源 | 流呈现零改动 | 事后审查可溯源、实时观察不可辨（共享会话的实时价值减半） | 备选（a 的降级子集） |
| c · 前缀文本标记 | 注入内容自带 `[agent]` 前缀文本 | 零契约改动 | 前缀进入 shell 命令行即语法污染（破坏被执行命令）；可被注入内容伪造 | 否决 |

### 3.2 审计留痕矩阵

| 方案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · 新 pty_audits 表（推荐）** | 沿 approval_audits 先例（store.ts:100-109 字段族形态）新增审计表：{sessionId, origin('user'\|'agent'\|'system'), kind('write'\|'create'\|'close'\|'timeout'…), 摘要（限幅）, created_at}；写入/生命周期事件全量留痕 | 结构化可查询（对照 sessions/messages 表先例）；审计与业务数据同库同事务纪律 | 新表 DDL 面 | **推荐**——沿 approval_audits 直系先例；承载落点（store.ts 扩表 vs pty 模块自有仓储）由 BK-0044 实施 SPEC 定，约束 = store.ts 现恰 400 行贴线（AGENTS.md 硬性约定 4），扩表须同步拆分沿 ≤400 纪律 |
| b · 仅 pino 日志留痕 | logger.info 记写入事件 | 零 DDL | 日志非查询面、无完整性承诺 | 不足（可作 a 的补充出口，不独立成案） |
| c · 复用 sessions/messages 表 | 把 PTY 写入当会话消息存 | 零新表 | 语义混淆（messages 是 LLM turn 资产，PTY 写入是 shell 输入流）；schema 强扭 | 否决 |

### 3.3 危险命令面处置矩阵

| 方案 | 形态 | 利 | 弊 | 结论 |
| --- | --- | --- | --- | --- |
| **a · 仅警示 + 审计（推荐 v1）** | 服务端对写入内容做只读模式匹配（如 rm -rf/格式化/shutdown 族固定清单），命中不拦截、emit 警示事件 + 审计标记位 | 零可用性损失；警示与审计给人事后与实时双通道；不制造伪安全 | 无强制力（如实标注） | **推荐 v1**——与 §2.2/§2.3「如实降级」定级自洽：PTY 面本就无强制边界，处置策略不假装有 |
| b · 拦截清单 | 命中固定清单即拒绝写入 | 表面强制 | shell 变形万花筒（引号/变量/子串/base64/别名）使清单必然漏拦——伪安全比无安全更危险（制造已防护错觉） | 否决（除非未来配合外层强隔离环境） |
| c · 白名单模式 | 仅允许清单内命令 | 真强制（若清单完备） | 对交互式终端可用性致命（用户开终端就是为了任意操作）；清单维护无尽头 | 否决 v1（可作未来「受限模式」档位提案，不在本链） |

**推荐组合**：3.1-a（origin 贯穿）+ 3.2-a（pty_audits）+ 3.3-a（仅警示 +
审计）——三者合成 v1 权限/审计面；强制边界在 PTY 形态如实声明为不存在
（§2.3 评级），安全承诺 = 全量溯源 + 启用主权在运维 + 双闸超时，不虚报。

### 3.4 端点族与流格式设计定稿（BK-0044/0045 定界依据）

- **端点族（/api/v1/pty/*，v1-only 沿 sessions server.ts:215-219 先例；最终
  命名 BK-0044 实施 SPEC 可微调，本 ADR 定语义）**：
  `POST /api/v1/pty/sessions`（创建→201 {sessionId}；PTY_ENABLED=0 拒绝）·
  `GET /api/v1/pty/sessions`（列出活动会话）·
  `GET /api/v1/pty/sessions/:id/stream`（SSE 输出流，服务端→客户端单向）·
  `POST /api/v1/pty/sessions/:id/write`（双源写入 body {data, origin}，origin
  校验 §3.1-a）· `POST /api/v1/pty/sessions/:id/stop`（显式停止；404 无活动
  语义沿 sessionStopHandler sessions.ts:56-63 先例）。
- **流格式 = 端点私有事件面，零 shared 契约**：PTY 输出流是独立端点域（非 run
  流、非 session turn 流），采用**端点私有 SSE 帧**（如 JSON 帧
  {t:'data'\|'exit', …}），**不进 RunEventSchema**（packages/shared 零改动）——
  与 BK-0016「turn 流复用 15 种事件」是两条不同的合规路径（复用是选择，不进
  契约也是选择；本案选后者因 node:delta 累积全文语义与 ANSI 追加流不合身）。
  **护栏**：实施中确需把 PTY 事件加入 RunEventSchema 即触 POLICY 需批准区
  （shared 契约变更），立即中止转 needs-approval，不得自主新增。

## 4. 超时 / 生命周期 / 中止级联

**表述边界**：只列状态与迁移，不写代码、不写伪代码——节点/处理器实现归
BK-0044 实施 SPEC。

### 4.1 状态与迁移（文字状态机）

```
[不存在] ──create(会话创建请求, PTY_ENABLED=1, 会话数<上限)──▶ active
active  ──idle 超时(PTY_IDLE_TIMEOUT_MS 无输入输出)──▶ closed
active  ──最大时长(PTY_MAX_SESSION_MS 硬顶)──▶ closed
active  ──显式停止(用户 stop / agent 侧停止工具)──▶ closed
active  ──优雅停机(abortActivePtySessions 级联, 5s 宽限强杀)──▶ closed
active  ──PTY 子进程自然退出(exit)──▶ closed
closed  = 终态：close 幂等（重复调用 no-op），子进程已收尾（kill + wait 双确认）
```

- **active 态内子状态 idle 计时**：无输入输出时段的计时态（非实体态）——每次
  有效输入/输出刷新 idle 计时器。
- **PTY_ENABLED=0（默认）**：create 请求直接拒绝（503 语义——功能未启用，
  与「会话不存在」404 区分；具体码 BK-0044 实施 SPEC 定）。

### 4.2 run 正交与注入级联

- **PTY 会话与 run 正交**（沿 sessions.ts:3 头注「会话 = 与 run 正交的第一等
  资产」先例）：run 中止/结束时 PTY 会话**存续**——终端会话的生命周期由 §4.1
  六迁移自治管辖，不随 run 绑定。
- **agent 注入通道随 run 级联**：agent 对会话的写入若发生在 run 执行域内（如
  工具调用注入），该次调用随 run 中止级联取消（ctx.ac.signal 透传，
  engine.ts:33 + connection.ts callTool signal 先例 + inject.ts per-call finally
  同型）；级联只断「本次注入调用」，不断会话本身。
- **注入并发约束**：同一会话同一时刻至多一个进行中的 agent 注入（409 守卫，
  sessions.ts:77 同型）；用户键入与 agent 注入的服务端写入串行化（PTY 主进程
  写入天然串行，写入端点无需额外锁，BK-0044 实施 SPEC 复核）。

### 4.3 close 幂等、孤儿防护与启动扫尾

- **close 幂等**：沿 connection.ts:46-47 双标志先例——spawnAttempted 置位于
  spawn 发起时（spawn 失败也要走收尾路径防半开态）；closed 置位后重复 close
  为 no-op。
- **判活只用内存注册表**：沿 sessions.ts:12-13「进程崩溃后 DB 残留不可信
  （BK-0011 教训）」——PTY 会话判活 = 进程内注册表（ptyById 同构 sessionsById
  sessions.ts:34-36），DB/审计表只作事后审计不作判活源。
- **孤儿防护双通道**：① 优雅停机——PTY 会话中止并入 shutdown 链
  （server.ts:229-252 序列内，abortActivePtySessions 与 abortActiveSessions
  :235 同批，5s 宽限（:241-243）内未收尾即强杀进程后退出）；② 崩溃恢复——
  server 重启时进程内注册表为空，遗留 PTY 子进程（若有）成为孤儿——启动扫尾
  沿 BK-0011 sweepDanglingRuns 形态评估（BK-0044 实施 SPEC 定具体机制：如启动
  时按审计表开放会话记录打 stopped 标记 + 孤儿进程检测；本 ADR 只定「启动
  扫尾义务存在」）。

## 5. 依赖与出站类别评估（五面）

### 5.1 面 1 · 选型（后端 PTY 库）

| 候选 | 要点（2026-10-25 registry 亲核） | 评估 |
| --- | --- | --- |
| **A · node-pty ^1.1.0（推荐）** | MIT · Microsoft 官方维护 · 单运行依赖 node-addon-api ^7.1.0 · install 脚本 = `node scripts/prebuild.js \|\| node-gyp rebuild`（预编译优先、源码回退）· 自带 TS typings · 无 engines 声明 | **推荐**：事实标准（VS Code 终端同源）；依赖树最小；prebuild 优先降低构建面；官方 lineage 活跃 |
| B · @homebridge/node-pty-prebuilt-multiarch ^0.14.1 | 社区 prebuilt fork · engines node &gt;=20 &lt;27 · 额外依赖 prebuild-install ^7.1.3 + node-addon-api ^8.9.0 | 备选：prebuilt 覆盖面广但多一个运行时依赖 + engines 上限 &lt;27（Node 27+ 即断链）；社区 fork 跟进节奏风险 |
| C · 手写 ConPTY/Unix PTY 绑定 | 零 npm 依赖 | 否决：Windows ConPTY FFI/原生绑定自担成本与安全面远超收益（ADR-0012 §4 案 C 手写 client 同款否决逻辑） |
| ~~@lydell/pty~~ | registry 404 Not Found（2026-10-25 亲查） | 不存在，不采（调研记录在案防后人重查） |

### 5.2 面 2 · native 构建（better-sqlite3 教训对照）

- **allowScripts 纪律**：node-pty 有 install 脚本（prebuild 下载 + node-gyp
  回退）→ 安装须过根 package.json allowScripts 白名单（先例
  `"better-sqlite3@12.11.1": true`，package.json:34-35 亲核）；BK-0044 实施轮
  增 `node-pty@1.1.0: true` 同款。
- **Node 大版本升级**：native 模块随 Node ABI 变化需重装编译（AGENTS.md 已知
  陷阱 better-sqlite3 条目同款纪律：`npm install-scripts approve` + rebuild）。
- **预编译被墙风险**：prebuild 下载走 GitHub release 域——被墙环境回退源码
  编译（需 Windows VS Build Tools / POSIX toolchain）；缓解先例 =
  PLAYWRIGHT_DOWNLOAD_HOST 镜像（AGENTS.md 已知陷阱），实施轮若 CI 拉取失败按
  同域问题处置（镜像 env 或 CI cache）。

### 5.3 面 3 · CI 影响

- contracts job（.github/workflows/ci.yml）增 node-pty 安装编译面：
  windows-latest 已证明可编译 better-sqlite3 同链（native 工具链就绪），
  node-pty prebuild 命中时零编译、未命中时同链回退——CI 风险评级低但**首次
  接入必须实测**（BK-0044 验收含 CI 盯守）。
- lock 变化：+node-pty（含 node-addon-api 传递依赖）；apps/server/package.json
  +1 依赖 + 根 package.json allowScripts +1 行。

### 5.4 面 4 · 出站类别

- **server Node 进程自身：零新增出站类别**——PTY 会话管理是本地进程面
  （spawn/IPC/SSE 推送），无任何新 HTTP 出站目标；guard.ts 五出口零改动。
- **残余风险（非类别申报，声明知悉项）**：PTY 子进程内命令的网络访问不经
  guard.ts（§2.3 条款 1 同一事实）——处置 = 声明入附录 A ③ + PTY_ENABLED
  默认关 + 审计留痕。**结论：无新「guard 出站类别」申报项，有残余风险声明项，
  两者在附录 A 分列不混同。**

### 5.5 面 5 · env 承载（均属 POLICY 需批准区，config.ts 白名单纪律）

| env（提案名） | 语义 | 提案默认 | 校验（zod fail-fast，config.ts:51-74 先例） |
| --- | --- | --- | --- |
| PTY_ENABLED | PTY 会话功能总开关（默认关——启用主权在运维，§2.3/§5.4 缓解①） | 0 | TRUTHY/FALSY（ALLOW_PRIVATE_NET 同款 config.ts:39-40） |
| PTY_IDLE_TIMEOUT_MS | idle 超时闸门（§4.1） | 600000 | 正整数，下限护栏（如 ≥60000，防误配秒级超时） |
| PTY_MAX_SESSION_MS | 最大会话时长硬顶（§4.1） | 3600000 | 正整数，≥ idle 超时（交叉校验，E9 跨 env 先例 config.ts:100-108） |
| PTY_MAX_SESSIONS | 并发会话数上限（§2.4） | 4 | 正整数 1-16 |

- 备选「常量内嵌零 env」否决理由：三闸门数值是运维参数（不同部署环境风险档位
  不同），内嵌即每次调优都要发版——与 config.ts 全 env 风格（15 key 白名单
  :29-34）相悖。
- **前端渲染依赖补充评估**（BK-0045 行内既定口径「xterm.js 类前端依赖若需要随
  BK-0043 SPEC 评估一并请批」）：@xterm/xterm ^6.0.0——MIT · **零依赖**纯前端
  渲染库（registry 亲核）；旧包名 xterm@5.3.0 **已弃用**（官方提示迁移至
  @xterm/xterm）→ 选型定稿 @xterm/xterm ^6.0.0（scoped 新名），随附录 A ①
  一并请批（BK-0045 消费）。前端依赖入 apps/web/package.json——web 构建链
  （Vite）接入新包不触 UI 三层渲染结果（终端节点 UI 是 BK-0045 修宪轮新增面），
  但依赖安装本身属 POLICY 需批准区，一律入 issue。

### 5.6 调研记录（日期与来源，2026-10-25 SPEC 会话亲查；**BK-0044 实施 SPEC 落笔时必须复核时效**——沿 ADR-0012「实施轮必须复核时效」先例，逐项复验版本号与 install 面；本表为快照，与 §5 评估配套，不作转写日更新）

| 事实 | 来源 |
| --- | --- |
| node-pty 1.1.0：MIT / Microsoft / 单依赖 node-addon-api ^7.1.0 / install = `node scripts/prebuild.js \|\| node-gyp rebuild` / 自带 typings / 无 engines / 无 os 限制 | registry.npmjs.org/node-pty/latest |
| @homebridge/node-pty-prebuilt-multiarch 0.14.1：engines node &gt;=20 &lt;27 / 依赖 node-addon-api ^8.9.0 + prebuild-install ^7.1.3 | registry.npmjs.org/@homebridge/node-pty-prebuilt-multiarch/latest |
| @lydell/pty：Not Found（包不存在） | registry.npmjs.org/@lydell/pty/latest → 404 |
| @xterm/xterm 6.0.0：MIT / 零 dependencies | registry.npmjs.org/@xterm/xterm/latest |
| xterm 5.3.0 已弃用："This package is now deprecated. Move to @xterm/xterm instead." | registry.npmjs.org/xterm/latest |

### 5.7 请批结论

**结论 = 有需批准面**（非零请批面）：① 新增 npm 依赖两项（node-pty ^1.1.0
后端 + @xterm/xterm ^6.0.0 前端，§5.1/§5.5）；② 新增 env 语义四项（§5.5）；
③ PTY 子进程网络/文件两处残余风险声明知悉（§2.2/§2.3/§5.4）；④ 实施顺序授权
（BK-0044 → BK-0045）。四项均以附录 A issue 草案承载，**获批前 BK-0044/0045
维持 proposed 零实现**；父项 issue#5 批复（2026-10-23T15:49:06Z）承继的是
BK-0045 修宪实施授权，不自动覆盖本清单任何一项。

## 6. 附录 A · needs-approval issue 草案（字面量，脚本逐字取用）

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

## 7. BK-0044 / BK-0045 实施定界（影响面索引）

权威字面量单一载体 = `docs/evolution/iterations/0028/SPEC.md` §8.4（BACKLOG
两行按其逐字回写；本节为压缩索引——ADR §7 定界与迭代 0028 SPEC §8.4 字面一致，
四要素逐项语义相等）：

- **BK-0044（PTY 会话后端运行时，proposed；触UI=否但含需批准面——依赖/env/
  残余风险均入附录 A 请批，获批前零实现）**：
  **受影响文件** = `apps/server/src/pty/` 新模块（session.ts 会话管理 + 注册表
  判活 + 三闸门超时；routes.ts 端点族五端点——create/list/stream SSE/write 双源
  origin/stop，流走端点私有事件面零 shared 契约（§3.4）；audit 仓储；各文件
  ≤400 行）+ `server.ts` 路由注册与停机出口并入（abortActivePtySessions 与
  abortActiveSessions 同批 + 启动扫尾接线沿 BK-0011 形态）+ `config.ts` +4 env
  白名单与 zod + 交叉校验（E9 先例）+ store.ts 扩 pty_audits 表或 pty 模块自有
  仓储（二选一由实施 SPEC 定；store 现 400 行贴线，扩表须同步拆分）+ 根
  package.json allowScripts +node-pty + `apps/server/package.json` +node-pty
  ^1.1.0 + `tests/smoke/` pty 断言组（创建/双源写入/流回放/停止/idle 与 max
  超时/停机级联/无孤儿/PTY_ENABLED=0 拒绝）+ 根 package.json 冒烟 script 行。
  **验收口径** = npm run build:server + npm test + npm run smoke:server 扩断言
  零回退 + 端点级手动 E2E（五端点走查/双源写入流式回放/停止/超时触发/停机级联
  无孤儿）+ CI contracts job 盯守（native 编译面首次接入实测）。
  **依赖关系** = 前置 BK-0043 CLOSE 且 ADR-0014 附录 A needs-approval issue 获
  用户批复；**晋升条件** = 两者齐备后由 PLAN 轮晋升。
- **BK-0045（PTY 交互终端节点 UI 修宪轮——BK-9005 链终轮，proposed；触UI=是
  修宪轮，授权链 = issue#5 批复承继 2026-10-23T15:49:06Z + ADR-0014）**：
  **受影响文件** = `packages/shared/src/nodes/<type>/{node.ts,README.md}` 新增
  （NDP 目录制；建议 type 'terminal' / in-ctx 上下文入 / out-session 会话引用出，
  DEFS 细化归 BK-0045 实施 SPEC，本 ADR 不预写 DEFS 代码块）+ `nodes.ts` 聚合层
  +1 import +1 键 + `nodes.baseline.json` 重产 + 守卫/契约测试联动 + 前端三文件
  （终端节点渲染/流式呈现/用户输入交互；@xterm/xterm ^6.0.0 已随附录 A ① 一并
  请批——旧包名 xterm 已弃用）+ gate 场景增量（新场景 golden-created、受波及
  既有场景修宪轮重录，清单实施 SPEC 定）。
  **SSE 契约护栏** = PTY 流走端点私有事件面零 shared 改动（§3.4 定稿；BACKLOG
  行内「ADR-0014 §6 定稿」为迭代 0028 SPEC §8.4 字面量既定表述，所指即该定稿
  内容），确需进 RunEventSchema 即中止转 needs-approval。
  **验收口径** = npm run build + npm run gate（增量后全绿）+ npm test +
  npm run smoke:server 零回退 + 手动 E2E（共享会话交互点位：建会话 → 用户键入
  → agent 注入 → 停止 → 恢复，实施 SPEC 定细化）。
  **依赖关系** = 前置 BK-0043 + BK-0044；**晋升条件** = 两者 CLOSE 后随链晋升。
  **本链终轮**——CLOSE 时回执 issue#5 关单（沿 issue#10/11 终轮先例，中间子项
  不回执）。

**不做范围（本轮 BK-0043 收口）**：零代码零依赖零 env 零出站零 shared 零 UI
零 golden——本 ADR 与 BACKLOG 两行定界回写为全部产物；BK-0044/0045 是实施轮
（后者修宪轮），按 §7 定界消费本 ADR，链晋升 ready 前不实施；BK-0035/0039
（SPEC 四连先行后两位）与 BK-0033/0034（BK-9002 链实现段）不在本 ADR 射程。
