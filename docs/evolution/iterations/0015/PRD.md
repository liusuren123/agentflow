# PRD · 迭代 0015 · BK-0016 持久会话与流式会话 API

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 06:2x
> 来源：BACKLOG BK-0016（P1 / capability / M / ready / 触UI=否，来源主题 T5；2026-10-23
> 治理日晋升 ready，SSE 契约护栏与 BK-9002 地基定位均在行内备注）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · 里程碑 M1「runtime 承重墙」四项之一
> （`ROADMAP.md:122-127`；BK-9002 goal 模式会话面板的**后端地基**——BACKLOG BK-0016
> 行备注与 BK-9002 行「前置：BK-0016 会话 API」互为印证）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 06:0x~06:3x 核实）：
> ① **批复项无新动作且现存批复项全部顺延**——档案「approved：无」与 BACKLOG 实况一致
> （七项批复已于 0011 轮全部落 ready，其中 BK-0026/BK-0025/BK-9001 已相继 done 归档）。
> 余下批复 ready 项 BK-9002~9005（P0/L/触UI=是）顺延论证**本轮复核仍成立**（0014 PRD
> 头部先例）：BK-9002/BK-9004 前置 BK-0016（即本轮项——先做前置即推进优先序①）、
> BK-9003/BK-9005 前置 BK-0021（proposed 且 POLICY 从严需 SPEC 后开 needs-approval）；
> 四项均 L 级且行内备注「L 项先拆分再实现」，ROADMAP T5-M3 明载「先迁移后扩展，
> 不得跳过」，心跳直接抓取即夹带拆分、违反「一次迭代只做一件事」→ 顺延，拆分排序
> 归治理日。② **user-request 无**——档案 issue 面板为空，无建行、无 uiIssueNumbers。
> ③ rejected 无。④ **常规选题取 BK-0016**——批复项顺延后最高优先 ready 队首
> （P1/M，非 doc、非触 UI；同优先级表序先于 BK-0017，且为两项 P0 修宪项的共同前置，
> STATE 0014 轮 last_result 明示「P1/M BK-0016 为两项 P0 修宪前置，建议优先评估」）。
> 与最近 3 次迭代重叠面核对：0014=handlers.ts + smoke-server.mjs K 组（本轮共享
> smoke-server.mjs 触点，S 组纯追加、K 组零改动——正交；store.ts/server.ts 上次
> 触碰为 a6f7e31[ADR-0007 删除端点]，llm.ts 上次为 0009，本轮均只读不改）；0013=
> apps/web 三文件 + gate.mjs + golden s6/s7 + ADR（零重叠）；0012=shutdown-sigterm.mjs
> 新增 + ci.yml + package.json（零重叠）。

## 结论

**建议做（本迭代即做）**：一句话理由——T5-M3 工作台 UI 五项修宪已全部获批却全部
压在「没有会话 API」这一前置上（BK-9002/BK-9004 行内明载），而会话是智能体工作台
的第一等公民：没有跨请求的会话持久化与流式续聊通道，goal 模式面板无从谈起。本迭代
在既有 SQLite 基座（ADR-0005）与 AbortController 运行注册表先例上落一组纯后端的
`/api/v1/sessions*` REST + SSE 端点（建会话 / 列出 / 恢复 / 续聊流式 / 停止），
**全程复用现有 15 种 SSE 事件类型承载会话流**（护栏见触 UI 分类结论第 3 条），
零 UI / 零 shared 契约 / 零新依赖，M 尺寸一轮可完。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为 `apps/server/src/store.ts`（DDL 追加两表 + 仓储函数）、`apps/server/src/
   sessions.ts`（**新增**，会话 turn 编排：SSE 信封 + 模型流式调用 + 中止）、
   `apps/server/src/server.ts`（路由注册 + 停机循环扩展）与 `tests/smoke/
   smoke-server.mjs`（S 组断言追加）；`apps/web/**`、`packages/shared/**`、
   `tools/pixel-gate/**`、`tests/golden/**`、`.github/**` 零字节改动——视觉 /
   DOM 结构 / 交互三层与 golden 基线均不接触，`npm run gate` 8 场景为纯回归面（AC6）。
2. POLICY 校验：后端能力演进（`apps/server/src/**`）限既有出站类别、不新增 npm
   依赖——自主区。模型调用复用 providers.ts 既有 AI SDK 通道（`providers.ts:80`
   `getModel`，AI_BASE_URL/AI_API_KEY 等 env 语义既有，`config.ts:29,50-51`），
   **不新增出站类别**（该通道与 guard.ts 管的节点出站是两条既有路径，providers.ts /
   llm.ts 均 zero import guard，本会话 grep 实查）；SQLite 沿用既有 better-sqlite3。
3. **SSE 契约护栏（BK-0016 行内备注明载，本轮重申为硬约束）**：会话流式若需新增
   SSE 事件类型即触 `packages/shared/src/events.ts` 契约（POLICY 需批准区）——本 PRD
   已论证现有 15 种事件（`events.ts:8-36`）足以承载（见背景 4 的信封映射）；
   **SPEC 定案若发现必须新增事件类型 → BK-0016 转 pending-approval 开 issue，
   本迭代按中止处理**（行内备注口径）。
4. **DEFS 不动**：会话不是画布节点，不进节点注册表；BK-9002「通用智能体节点」
   才是新节点（触 UI，其行内备注含 BK-0021 NDP 前置），本迭代只做后端地基。

## 背景（代码事实源，2026-10-24 06:0x~06:3x 本会话只读核实）

1. **持久化基座现状**（`store.ts`，wc -l 255 行）：DDL 为幂等 `CREATE TABLE IF NOT
   EXISTS` 追加式迁移（`:44-66` 注释明示「新增表/列时在此追加」）——sessions/
   messages 两表按同式追加即合法；「先落库后写网」doctrine（`:6-8` 头注 +
   `openRunRecorder` `:195-227` 先例）；`patchRun` COALESCE 选择性更新（`:109-115`）、
   三事务先例（`:127-143`）。runs 表的 status 联动是 run 特有，messages 表无此需求
   （单条 INSERT 即可，`insertEvent` `:107` 单语句先例）。
2. **HTTP/SSE 基座现状**（`server.ts`，wc -l 233 行）：运行注册表 `runsById`
   （`:47`）承载判活（stop `:126-132` 404/abort、DELETE 活动 run 409 `:176-183`）；
   SSE 响应头与 `send()` 单一出口（`:76-92`）；`/api/v1` 新端点仅注册 v1 无旧别名的
   先例（`:193-202` ADR-0005/0007）；优雅停机循环中止全部活动 run（`:211-231`）——
   会话活动 turn 必须并入同一停机收尾，否则停机时 turn 悬挂写孤儿消息。
3. **模型调用与流式语义现状**（`llm.ts` 122 行 / `providers.ts`）：`getModel(name)`
   未配置返回 null（`providers.ts:86-90` + `llm.ts:16-17` 抛错先例）、传 undefined
   取默认模型（`resolveModel` 默认链，`providers.ts:86`）；`streamText` 增量流 +
   **`node:delta` 携带累积全文**（`llm.ts:94-99`，每 ~60ms emit 一次 acc、末次补发）；
   `abortSignal: ctx.ac.signal` 中止先例（`:67,:91`）。会话 turn 复用同型流式（llm.ts
   本身零改动——其 handler 与节点 id/ports 语义绑定，会话流在新模块 sessions.ts 内
   直调 AI SDK）。
4. **15 种事件足以承载会话流的信封映射**（逐事件对照 `events.ts:8-36`）：一个
   会话 turn = 一次「迷你 run」信封——`run:accepted{runId:turnId}`（:9，runId 为
   自由 string）→ `node:start{id:0,title}`（:12，id 数值合成 0，defName 可选）→
   `node:delta{id:0,text:累积}` ×N（:14，llm.ts:97 同型）→ `node:done{id:0,title,
   out:全文,ms,tokens?}`（:15-21）→ `log{lvl,msg}`（:24，✓ 摘要/降级告知）→
   异常时 `run:error{message}`（:28）→ 终态 `run:done{ms,done,total,ok,stopped,
   outputs:[全文]}`（:29-35）。**全部字段在既有 schema 射程内**，且前端
   server-sync.js 的事件回放映射（ADR-0006）无需任何改动即可消费——BK-9002 面板
   落地时零契约迁移。seq/落库策略：turn 事件不入 run_events（run_events 是 run 的
   回放资产；会话的持久资产是 messages 表，见需求 REQ-0016-02）。
5. **会话状态机（无先例，本 PRD 定义）**：session 无独立 status 字段——活动 turn
   由内存注册表 `sessionsById`（sessionId → {ac}）判活，与 runsById 同构（DB 状态
   字段会重演 BK-0011 的悬挂问题：进程崩溃后 DB 残留 'running' 而内存已失忆）。
   一个 session 同时至多一个活动 turn（409 并发守卫，`server.ts:180` 先例）。
6. **冒烟确定性策略（沿 0009/0012/0014 既有手法组合）**：`tests/smoke/lib.mjs
   startServer(port,{env})` 以 `{...process.env, PORT, ...opts.env}` 注入子进程
   （lib.mjs:69-76 本会话 read）——可起**第二实例**注入 `AI_BASE_URL` 指向进程内
   mock OpenAI 兼容端点（node:http 内联 ~40 行，分块延时流出固定文本）：显式配置
   优先于环境密钥（providers.ts `resolveConfig` 显式分支优先），宿主机有无真实密钥
   均不影响该实例行为 → 停止信号 / 409 并发 / 流式累积三类时序敏感断言获得
   **确定性可复现载体**；无密钥降级路径在主实例按 `GET /api/v1/models` 的
   `configured` 字段（`providers.ts:92-99`）分支如实断言（两分支皆合法，不断言
   未发生的事）。模型调用不经 guard（背景 2 已核），loopback mock 无拦截风险。
7. **竞品对照**（product-manager.md 职责 2）：ChatGPT/Claude 等会话产品的会话
   面板共性是「历史可恢复 + 流式续聊 + 可中断」；ComfyUI 无会话概念（其赛道为
   图编排）——这正是 T5 主题「画布编排 × 深度智能体工作台」差异化定位
   （ROADMAP T5 头注）的后端地基。本项对齐会话产品的**能力面**（列出/恢复/续聊/
   停止），不做任何 UI。

## 目标

1. **持久化**：sessions / messages 两表（幂等 DDL 追加），消息「先落库后写网」。
2. **REST 面**：建会话 / 列出（updated_at 倒序）/ 恢复（会话 + 全量消息）/
   续聊（SSE 流式 turn）/ 停止——五个端点，仅 `/api/v1` 命名空间。
3. **流式信封**：turn 事件序全部落在现有 15 种事件类型内，且逐条可通过
   `RunEventSchema` 校验（AC5 机器证明）。
4. **生命周期**：turn 可中止（run:done stopped 收尾 + 已累积文本落库）、并发
   second-chat 409、优雅停机并入活动 turn 收尾。
5. **证明**：冒烟 S 组（含 mock 实例确定性时序断言）+ 反演 + 契约零漂移 + gate
   纯回归全绿。

## 非目标（out of scope）

- **不做任何 UI / 前端改动**：BK-9002 goal 模式面板（含会话 UI 消费这些端点的
  接线）是修宪轮，批复在案但前置（本项 + BK-0021）未竟，顺延。
- **不新增 SSE 事件类型 / 不改 events.ts**：硬护栏（触 UI 分类结论第 3 条）；
  SPEC 发现必须新增即中止转待批准。
- **不做会话删除端点**（DELETE /api/v1/sessions/:id）：BACKLOG 行内措辞仅
  「列出/恢复/续聊」，删除非本轮范围，留后续按需补 S 项（ADR-0007 先例可循）。
- **不做工具循环 / goal 模式 agent loop / 停止条件**：会话 turn 本轮为**纯多轮
  对话**（历史 + 新消息 → 流式回复）；agent loop 是 BK-0015（proposed，承载方案
  未定），工具装配归 BK-9002 落地时再议——两者皆不夹带。
- **不做会话内节点编排执行**（会话 ≠ run：不执行画布工作流）；runs 与 sessions
  两资产完全正交。
- **不做跨设备并发编辑 / 消息分页**（GET :id 全量返回；单会话消息量级在 UI 消费
  侧由 BK-9002 再评估分页）。
- **不做消息级审计/软删除/编辑**；**不新增 env / npm 依赖 / 出站类别**。
- 不更新 ROADMAP / metrics 状态（CLOSE 职责）。

## 用户故事

1. 作为工作流作者（未来的 goal 模式用户），我重启浏览器后希望我的智能体对话还在，
   能列出所有会话、点开恢复上下文、继续追问，而不是每次从零开始。
2. 作为工作流作者，智能体正在长篇输出时我发现方向错了，我要能立刻点停——已生成
   的部分要保住（落库），不能整轮丢失。
3. 作为 test-manager，我需要停止/并发/流式三类时序敏感行为有确定性冒烟断言
   （mock 模型实例），而不是「有密钥才能测」或依赖真实网络。
4. 作为宪法主权者，我已批复的工作台 UI 五项（#2~#5）压在本项前置上——我期望
   本轮零 UI/零契约地夯实地基，让修宪轮（BK-9002）下一轮有可直接消费的后端。
5. 作为 BK-9002 的实现者（未来修宪轮 code-developer），我需要会话流直接复用
   server-sync.js 既有事件映射，前端消费零适配。

## 需求条目

- **REQ-0016-01 · 数据层（store.ts）**：DDL 追加（幂等）：
  `sessions(id TEXT PRIMARY KEY, title TEXT NOT NULL, model TEXT, sys TEXT,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)` 与
  `messages(session_id TEXT NOT NULL, seq INTEGER NOT NULL, role TEXT NOT NULL,
  text TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(session_id, seq))`
  （role 取值 'user'/'assistant'；`model` 为空时用默认模型、`sys` 为会话级系统
  提示词——BK-9002 goal 模式的显式预留列，纯存储不触契约）。仓储函数：
  createSession / listSessions（updated_at 倒序 + limit 校验，沿 runsListHandler
  `:160-164` 口径）/ getSessionDetail（session + messages 按 seq 升序）/
  appendMessage（单条 INSERT + sessions.updated_at 同步更新，事务包裹）。
  「全部 SQL 收敛在本模块」doctrine 不破（store.ts 头注 `:4-5`）。
- **REQ-0016-02 · 会话 turn 编排（sessions.ts 新增）**：`POST /api/v1/sessions/:id/
  chat` body `{text}`：① 校验 session 存在（404）且无活动 turn（409）；② user 消息
  **先落库**；③ SSE 头（沿 runHandler `:76-82` 同型）+ `run:accepted{runId:turnId}`；
  ④ 取历史消息（**最近 N 条常量截断**，建议 20，SPEC 定稿——防无界增长）+
  ModelMessage[] 组装（user/assistant 交替映射）+ 新消息；⑤ `getModel(session.model
  ?? undefined)`——null 时**不抛 HTTP 错**，SSE 内如实降级：`log{lvl:'warn'}` +
  `run:error{message:模型服务未配置…}` + `run:done{ok:false}`（`llm.ts:16-17` 同
  文案语义），assistant 消息不落库；⑥ 正常路径 streamText（system: session.sys ||
  undefined、abortSignal）→ `node:start{id:0}` → `node:delta{id:0,text:累积}` ×N
  → `node:done{out:全文, ms, tokens?}` → assistant 全文**先落库**再 `run:done{ok:true,
  outputs:[全文]}`（先落库后写网 doctrine 延伸至终态事件）；⑦ ping 保活
  （15s，沿 `:94`）；⑧ finally 清注册表 + res.end。
- **REQ-0016-03 · 停止信号**：`POST /api/v1/sessions/:id/stop`——注册表无此 session
  活动 turn → 404（`stopHandler :128` 同语义）；有 → `ac.abort()` → 流式循环退出，
  已累积文本（非空时）落库为 assistant 消息，`run:done{stopped:true, ok:false,
  outputs:[已累积]}` 收尾。
- **REQ-0016-04 · 其余端点（server.ts 注册，仅 v1）**：`POST /api/v1/sessions`
  （body `{title?, model?, sys?}` → 201 形状 `{id,…}`）、`GET /api/v1/sessions?limit=`
  （1-100 默认 20，400 校验同 runs 先例）、`GET /api/v1/sessions/:id`（404 /
  `{session, messages}`）。注册沿 `:193-202` v1-only 段。
- **REQ-0016-05 · 优雅停机并入**：shutdown() 的活动收尾循环（`server.ts:218-220`）
  扩展为同时 abort 全部活动会话 turn（同一宽限轮询内收敛）。
- **REQ-0016-06 · 冒烟 S 组（smoke-server.mjs 纯追加）**：主实例：S01 建/列/恢复
  形状与 404；S02 chat 降级或正常分支断言（按 models.configured 分支，见背景 6）；
  S03 stop 无活动 404。第二实例（AI_BASE_URL=进程内 mock）：S04 确定性流式
  （node:delta 累积终值 = mock 全文、node:done.out、assistant 落库复核、run:done
  ok:true）；S05 活动流 stop → run:done stopped:true + 已累积落库；S06 活动 turn
  期间并发 chat → 409。mock 端点 node:http 内联于 smoke（分块延时流出）。
- **REQ-0016-07 · 改动面白名单**：产品提交 git diff 仅允许——`apps/server/src/
  store.ts`、`apps/server/src/sessions.ts`（新增）、`apps/server/src/server.ts`、
  `tests/smoke/smoke-server.mjs`；其余任何路径零改动（AC6 机器核对）。

## 非功能要求

1. **契约零漂移**：会话流每一事件逐条通过 `RunEventSchema.parse`（AC5 机器断言，
   VALIDATE 入口 `events.ts:40-42`）。
2. **确定性**：S04-S06 时序断言全部锚定 mock 实例（无真实网络、无宿主密钥依赖）；
   mock 流出固定字面量。
3. **规模**：sessions.ts 新文件 ≤ 400 行（硬性约定 4）；store.ts 255 → 预估 ≤ 340；
   server.ts 233 → 预估 ≤ 290；smoke-server.mjs 386 → 预估 ≤ 470（既有文件追加，
   非 400 上限对象；SPEC 给精确预算）。
4. **零新增依赖 / env / 出站类别**（模型调用走 providers 既有通道）。
5. **历史有界**：送模历史常量截断（N=20 建议值），DB 全量保存不截断。

## 验收标准（Given / When / Then）

- **AC1 · 会话 CRUD 与恢复**：Given 已构建后端，When `POST /api/v1/sessions`
  `{title:'测试'}` → Then 2xx 且返回 `{id,title,…}`；When `GET /api/v1/sessions`
  → Then 列表含该 id（updated_at 倒序）；When `GET /api/v1/sessions/:id` → Then
  `{session, messages}` 按 seq 升序；When `GET /api/v1/sessions/<不存在id>` → Then 404。
- **AC2 · 续聊流式（确定性路径）**：Given mock 实例（AI_BASE_URL 注入）已建会话，
  When `POST /api/v1/sessions/:id/chat` `{text:'你好'}`，Then SSE 事件序为
  `run:accepted → node:start{id:0} → node:delta×≥1（末次 text=mock 全文）→
  node:done{out=mock 全文} → run:done{ok:true, outputs:[mock 全文]}`；When 再
  `GET /api/v1/sessions/:id`，Then messages 含该 user 消息与 assistant 全文消息
  （各 1 条，seq 递增）；When 再 chat 第二轮，Then mock 收到的请求体含第一轮
  user/assistant 历史（续聊上下文生效——mock 记录请求可断言）。
- **AC3 · 停止信号与部分保留**：Given mock 流出中（延时未完）的活动 turn，When
  `POST /api/v1/sessions/:id/stop`，Then 应答 `{ok:true}` 且 SSE 以
  `run:done{stopped:true, ok:false}` 收尾；When `GET /api/v1/sessions/:id`，Then
  assistant 消息含已累积部分文本；When 对无活动 turn 的会话 stop，Then 404。
- **AC4 · 并发守卫**：Given 活动 turn 进行中（mock 延时流出），When 同 session 再次
  chat，Then 409；When chat 不存在的 session，Then 404。
- **AC5 · SSE 契约零漂移（机器证明）**：When 对 AC2/AC3 全事件流逐条
  `RunEventSchema.parse`（`@agentflow/shared` `validateEvent`），Then 全部通过；
  When 核对产品提交 git diff，Then `packages/shared/**` 零改动；`npm test` 全绿。
- **AC6 · 白名单与全量回归**：When 核对产品提交 git diff，Then 仅 REQ-0016-07
  白名单四处；`npm run gate` 8 场景全绿（纯回归面）+ `npm run smoke:server`
  全绿（既有 56 断言零回退 + S 组新增全过）。
- **AC7 · 保护力反演**：When（VERIFY 演练）临时摘除「assistant 落库」（或停止
  路径的部分保留落库）重建后重跑对应 S 断言，Then 该断言 FAIL；还原重建复绿，
  `git status` 干净。证明 S 组非恒真。

## SPEC 要求（skipSpec=false）

BK-0016 为 M 项——不免 SPEC。SPEC 须含：受影响文件清单展开到函数/语句级（含
store.ts DDL 与函数签名、sessions.ts 模块结构、server.ts 注册与停机扩展 diff 位）、
SSE 信封事件序的精确字段表（对照 events.ts 逐条）、历史截断常量与 ModelMessage
组装规则、mock 模型端点契约（路径/分块/延时/请求记录）、409/404 判定的注册表
时序（turn 结束与 stop 竞态的 finally 删除语义）、`sessionsById` 与 shutdown 的
收尾顺序、回滚步骤（revert + DDL 幂等性说明——新表留存对旧代码无害）。
**硬前置判定**：SPEC 定案时若得出「必须新增 SSE 事件类型」结论 → 立即中止并按
触 UI 分类结论第 3 条转 pending-approval。

## 依赖与风险

- **依赖**：`npm run build:server`（冒烟 spawn 对象）；better-sqlite3 / express /
   ai 既有依赖；`startServer(port,{env})` 既有注入机制（lib.mjs:69-76）。
- **风险 1 · 双实例共享同一 SQLite 文件**（data/agentflow.db 路径由模块位置推导，
  store.ts:21-24）：mock 实例写入的会话对主实例可见——S 组列表断言一律按**自身
  创建的 id 存在性**断言，不做全局计数；SPEC 固化该纪律。
- **风险 2 · stop 与 turn 自然结束竞态**：stop 时 turn 恰已结束 → 注册表已删 →
  404（与 stopHandler 同语义，不算错误）；abort 后 streamText 抛 AbortError 的
  识别沿 `isAbort`（util.ts）先例处理。
- **风险 3 · 宿主机有真实密钥时主实例降级分支不触发**：按 `configured` 字段
  分支断言（背景 6），两分支皆合法通过；降级路径的**确定性**由 mock 实例的
  「不注入密钥但有 BASE_URL」形态覆盖不了——若 SPEC 评审认为必要，可加第三
  minimal-env 实例（env 剥离密钥），SPEC 定（非本 PRD 硬性要求）。
- **风险 4 · 会话消息与 run_events 混淆**：turn 事件不入 run_events（背景 4 已
  论证）；SPEC 在模块头注显式声明该边界，防后续维护者「顺手补齐」。
- **风险 5 · server.ts 行数预算**：预估 ≤290 行，若 SPEC 展开超出则路由 handler
  内联进 sessions.ts 导出（Express RequestHandler 形状），server.ts 只留注册行。

---

## 选题过程存证

- **批复栏「approved：无」处置（规则①）**：与 BACKLOG 实况一致——七项批复已于
  0011 轮全部落 ready，三项（BK-0026/BK-0025/BK-9001）已 done 归档，本轮无新批复
  需落行。现存批复 ready 项 BK-9002~9005（P0/L/触UI=是）**顺延**（0014 PRD 先例
  复核仍成立：前置未竟 + L 项先拆分 + 一次迭代只做一件事）；本轮选 BK-0016 正是
  解锁 BK-9002/BK-9004 两项 P0 修宪的共同前置——优先序①的推进动作。
- **user-request（规则②）**：档案 issue 面板为空 → 无建行、无触 UI 隔离，
  uiIssueNumbers 为空。
- **rejected（规则③）**：无处置。
- **残缺标记档案**（tools.ts:5,82 stub 如实降级）与**悬挂 run 探针**（161ce4ff
  running 1 条，智能客服助手）：均已知状态——前者 BK-0005 done + M07 断言守护 /
  BK-0008 ready 承载，后者 BK-0011 ready 承载；无新项，不重复立项（悬挂 run 的
  根治恰与本项目「内存注册表判活」设计取向一致——本 PRD 背景 5 依此为会话
  选内存注册表而非 DB status 字段）。
- **选题（规则④）**：BK-0016——批复项顺延后最高优先 ready 队首（P1/M；表序先于
  BK-0017；STATE 0014 last_result 明示建议优先评估；非 doc、非触 UI）。次序参考：
  BK-0017（P1/M）→ BK-0011（P2/S）→ BK-0008（P2/M）。
- **skipSpec 判定**：M 项 → 不免 SPEC（skipSpec=false），SPEC 要求见专节。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE 全文
  read；iterations/0012/0013/0014 PRD 全文 read；`store.ts` 全文 read 255 行
  （DDL :44-66、事务 :127-143、先落库后写网头注 :6-8）；`server.ts` 全文 read
  233 行（runsById :47、send 单一出口 :89-92、stop 404 :126-132、v1-only 注册
  :193-202、停机 :211-231、409 先例 :180）；`events.ts` 全文 read（15 事件
  :8-36、validateEvent :40-42）；`llm.ts` 全文 read 122 行（node:delta 累积
  :94-99、getModel null :16-17、abortSignal :67/:91）；`providers.ts` :37-40 显式
  配置优先 + :80-114 getModel/providerInfo read；`config.ts` grep（AI_BASE_URL
  :29,:50-51、port :90）；guard import 于 providers/llm 零命中 grep（模型通道
  不经 guard 实查）；`types.ts` 全文 read（RunCtx.ac :52）；`engine.ts:1-120`
  read；`tests/smoke/lib.mjs` startServer :69-96 read（env 合并语义）；wc -l：
  store 255 / server 233 / llm 122 / util 61 / smoke-server 386；git log -2 实查
  store.ts=server.ts 最后触达 a6f7e31（ADR-0007）、smoke-server.mjs 最后触达
  807ee5d（迭代 0014）；package.json:19-20 scripts read；date 实查 2026-10-24
  06:28。
