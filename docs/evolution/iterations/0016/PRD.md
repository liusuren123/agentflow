# PRD · 迭代 0016 · BK-0017 智能体互审协议（引擎侧）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 07:58
> 来源：BACKLOG BK-0017（P1 / capability / M / ready / 触UI=否，来源主题 T5；2026-10-23
> 治理日晋升 ready，备注逐点核实「全后端，纯 POLICY 自主区」）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · 里程碑 M1「runtime 承重墙」四项之二
> （`ROADMAP.md:122-127`；BK-0016 已于迭代 0015 done，本项为 M1 第二项落地）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 07:4x~07:58 核实）：
> ① **批复项无新动作且现存批复项全部顺延**——档案「approved：无」与 BACKLOG 实况一致
> （七项批复已于 0011 轮全部落 ready，其中 BK-0026/BK-0025/BK-9001/BK-0016 相关四项
> 已相继 done）。余下批复 ready 项 BK-9002~9005（P0/L/触UI=是）顺延论证**本轮逐项复核**：
> BK-9002/BK-9003/BK-9005 前置 BK-0021（NDP 迁移，proposed 且 POLICY 从严需 SPEC 后开
> needs-approval）未竟（BK-9002 另一前置 BK-0016 已 done）；BK-9004 前置 BK-0016 已 done，
> 但为 L 项且行内备注「建议治理日拆分排序（三特性可分批修宪）」——次日（10-25 周日）
> 即治理日，心跳抓取即夹带拆分、违反「一次迭代只做一件事」→ 顺延，拆分排序归治理日
> （0014/0015 PRD 头部先例复核仍成立）。② **user-request 仅 #9 且不建行**——AGENTS.md
> 为 POLICY 禁止区（仅用户可改），BACKLOG 待批准区注记在案：三处漂移用户已亲改在库
> （提交 21d94a3），待用户自行确认关单；无触 UI 的 user-request，uiIssueNumbers 为空。
> ③ rejected 无。④ **常规选题取 BK-0017**——批复项顺延后最高优先 ready 队首
> （P1/M，非 doc、非触 UI；BK-0016 done 后 P1 ready 仅剩本项；0015 PRD 选题存证的
> 次序参考即以 BK-0017 为首）。与最近 3 次迭代重叠面核对：0015=store.ts + sessions.ts
> 新增 + server.ts + smoke-server.mjs G 组（本轮共享 store.ts 追加式 DDL 与 smoke
> mock 基建两触点——追加不同表/不同断言组，正交；server.ts 预计零改动）；0014=
> handlers.ts code handler + smoke K 组（本轮改 approval handler，同文件不同 handler，
> 正交）；0013=apps/web + gate.mjs + golden s6/s7 + ADR（零重叠）。engine.ts 最后触达
> 1551994（迭代 0003，`git log -2` 本会话实查），本轮预计零改动。

## 结论

**建议做（本迭代即做）**：一句话理由——approval 节点的审批人现在只能是「人」（挂起等
`/api/run/:id/approve` 或 10 分钟超时自动通过，`handlers.ts:237-257`），而 T5 主题的
差异化定位是「画布编排 × 深度智能体工作台」：让画布上的 LLM 节点能被指派为审官
（role 填 `node:<id>`），由它对审批节点做**结构化裁决**（verdict allow/deny + 理由）、
回填续跑并落审计日志——这是 agent 工作台赛道的新兴共性能力（agent-as-reviewer），
且 `role` 参数本就是自由 text（`nodes.ts:104`），`node:` 前缀零 DEFS / 零 SSE 契约 /
零 UI 变化即可承载（治理日复核锚点，本会话重核成立）。纯后端，POLICY 自主区，
M 尺寸一轮可完；裁决失败降级链回到人工主权（默认 `挂起` 策略即回退人工等待）。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为 `apps/server/src/handlers.ts`（approval handler 增互审分支 + 审计写入）、
   `apps/server/src/store.ts`（DDL 追加 `approval_audits` 表 + 仓储函数）与
   `tests/smoke/smoke-server.mjs`（V 组断言追加）；`apps/web/**`、`packages/shared/**`、
   `tools/pixel-gate/**`、`tests/golden/**`、`.github/**` 零字节改动——视觉 / DOM 结构 /
   交互三层与 golden 基线均不接触，`npm run gate` 8 场景为纯回归面（AC6）。
2. POLICY 校验：后端能力演进（`apps/server/src/**`）——自主区。LLM 调用复用
   providers.ts 既有 AI SDK 通道（模型通道不经 guard，与节点出站是两条既有路径，
   0015 PRD 背景 2 已 grep 实查）；zod / better-sqlite3 均既有依赖；**不新增
   npm 依赖 / env / 出站类别**。
3. **SSE 契约零新增（硬护栏）**：互审路径只在既有 15 种事件内取用——`log{lvl:'sys'}`
   （`events.ts:24`，裁决进行中通知）与 `approval:done{nodeId,approve}`（`events.ts:27`，
   裁决结果）；回退人工时 `approval:required`（`events.ts:26`）。**互审正路径绝不发
   `approval:required`**——前端收到该事件会弹人工审批模态框并等待用户点通过/拒绝
   （`app.js:2197-2207` 本会话亲读），智能体自动裁决却弹人工窗即事实性交互语义破坏；
   `approval:done` 前端仅关弹窗 + 记日志（`app.js:2209-2211`），未开窗时移除 class
   无害，语义正确。SPEC 定案若发现必须新增事件类型 → 转 pending-approval 开 issue，
   本迭代按中止处理。
4. **DEFS 不动**：`role` 仍为自由 text（默认 `'值班经理'`，`nodes.ts:104`）、`to` 仍为
   三值 combo（`nodes.ts:105`）——`node:4` 只是 role 的一个新**取值约定**，不是参数
   定义变化。role 下拉换节点选择器触 UI，已归 issue #6（BK-9006「approval 审批人
   节点选择」条目），本迭代明确不做。

## 背景（代码事实源，2026-10-24 07:4x~07:58 本会话只读核实）

1. **DEFS 现状**：approval 节点 `role`（text，默认 `'值班经理'`）与 `to`（combo
   `['自动通过','自动拒绝','挂起']`，默认 `'挂起'`）见 `packages/shared/src/nodes.ts:
   101-106`——`node:<id>` 前缀值在自由 text 射程内，零注册表改动（治理日复核锚点
   「nodes.ts:104 role 为自由 text，零 DEFS 落点成立」本会话重核一致）。
2. **approval handler 现状**（`handlers.ts:237-257` 逐行亲读）：`policy = p.to || '挂起'`
   三分支——自动通过 / 自动拒绝立即短路；挂起分支 emit `approval:required`（:243）→
   Promise 等待（10 分钟 timer 超时自动通过 :247；`approvalWaiters.set` :248；abort
   监听 resolve 拒绝 :249）→ `approval:done`（:253）→ 返回 out 文本（:256）。
   互审分支插入点：挂起分支内、emit `approval:required` **之前**判定 role 前缀。
3. **人工决议链（零改动）**：`ctx.resolveApproval` 由 engine 挂载（`engine.ts:43-48`
   亲读），HTTP 入口 `approveHandler`（`server.ts:139-145` 亲读）——本迭代该链逐字
   保留（AC4 回归对象）。HandlerArgs 已含 `byId`（`types.ts:73`），审官节点查找无需
   改 engine。
4. **受控 LLM 子调用先例**：`generateText` 单轮 + `abortSignal: ctx.ac.signal`
   （`llm.ts:67,:81`）；`getModel(p.model)` null 检查（`llm.ts:15-17` 抛错先例——
   互审不抛 HTTP 错，走降级链）；zod 已在服务端在用（`llm.ts:7`）。审官节点的
   model/sys/temp/max 参数直接取其 `paramsDefaults ∪ params`（与 engine.ts:38 P()
   同式，可在 handler 内以 byId + paramDefaultsOf 组装）。
5. **审计落库先例**：store.ts DDL 为幂等追加式（`:58-97` 五表「新增表/列时在此追加」
   头注）；`insertEvent` 单语句 INSERT（:107 先例）；「先落库后写网」doctrine 延伸——
   审计行在决议产生后、`approval:done` emit 前写入（决议与留痕原子性由同一同步
   路径保证，SPEC 定稿）。
6. **冒烟确定性载体（0015 已建）**：`tests/smoke/lib.mjs startServer(port,{env})` 注入
   子进程 env（`AI_BASE_URL` 指向进程内 OpenAI 兼容 mock 端点，smoke-server.mjs G 组
   既有基建，675 行现状本会话 wc 实查）——V 组让 mock 对裁决请求返回固定 JSON
   （allow/deny/非 JSON 三态），互审全路径获得无网络、无宿主密钥的确定性断言；
   无模型降级分支在主实例按 `GET /api/v1/models` `configured` 字段分支如实断言
   （0015 PRD 背景 6 同法）。
7. **竞品对照**（product-manager.md 职责 2）：ComfyUI 无审批/互审概念（图编排赛道）；
   n8n 的 approval 节点停留于人工 wait；「agent-as-reviewer」（智能体互审：LLM 审官
   对产出做结构化裁决）是 agent 工作台赛道的新兴共性（PR-reviewer bots、subagent
   review 模式）——正是 T5「画布编排 × 深度智能体工作台」空白带定位（ROADMAP T5
   头注）的能力面。本项对齐其**能力面**（审官指派 / 结构化裁决 / 留痕），零 UI。

## 目标

1. **互审触发**：`to='挂起'` 且 role 匹配 `node:<数字id>` → 进入智能体裁决（不再
   等待人工端点）。
2. **结构化裁决**：以审官 LLM 节点的参数跑一次受控 `generateText` 子任务，输出
   `{"verdict":"allow"|"deny","reason":...}`，zod 严格校验拒收自由文本。
3. **回填续跑**：verdict 映射审批决议（allow→通过 / deny→拒绝，reason 进 comment），
   run 沿审批节点出边继续，事件面 `log` + `approval:done`（无 `approval:required`）。
4. **降级链**：审官不存在 / 非 LLM 节点 / 模型未配置 / 调用异常 / 输出不可解析 →
   按既有 `to` 超时策略降级（自动通过→allow / 自动拒绝→deny / 挂起→回退人工审批
   全链路），warn log 如实告知。
5. **审计日志**：`approval_audits` 表落库——人工 / 互审 / 降级一切决议方式均留痕
   （run_id、node_id、reviewer、mode、verdict、reason、时间戳）。
6. **证明**：冒烟 V 组（mock 三态确定性）+ 反演 + 契约零漂移 + gate 纯回归全绿。

## 非目标（out of scope）

- **不做任何 UI / 前端改动**：审批弹窗、节点参数面板、role 节点选择器零接触
  （选择器归 issue #6 / BK-9006 追加条目）。
- **不新增 SSE 事件类型 / 不改 events.ts / 不改 nodes.ts DEFS**（触 UI 分类结论
  第 3、4 条硬护栏）。
- **不做审官节点的 MCP 工具循环**：裁决子任务为纯 `generateText` 单轮（审官的
  mcp/skills 装配留后续按需，避免子任务时长不可控）。
- **不做审计查询端点**（如 GET /runs/:id/approvals）：审计先落库，查询面留后续
  按需补 S 项（ADR-0007 删除端点 / 0015 会话端点均有先例可循）。
- **不做多审官投票 / 递归互审 / 审官子图执行**：单审官单裁决；审官节点不触发自身
  出边（裁决结果只回填审批节点——审官在拓扑序中若可达仍会正常执行一次，两次
  执行互不影响）。
- **不改人工审批既有行为**：approveHandler / resolveApproval / 10 分钟超时 /
  abort 语义逐字保留（AC4）。
- **不新增 env / npm 依赖 / 出站类别**；不更新 ROADMAP / metrics 状态（CLOSE 职责）。

## 用户故事

1. 作为工作流作者，我希望画布上的 LLM 节点能当审官：把 approval 的审批人填成
   `node:4`，节点 4 就用它的模型与提示词对审批请求做裁决，无人值守的工作流也能
   带质量闸门跑完。
2. 作为工作流作者，裁决失败时（审官配错、模型没配、输出不是 JSON）我要可预期的
   行为：按我设的超时策略走——默认挂起就回到人工审批，绝不静默乱判。
3. 作为合规审计者（未来消费方），每次审批决议——无论人判还是智能体判——都要在
   SQLite 里有不可抵赖的一行：谁判的、什么方式、allow 还是 deny、理由。
4. 作为 test-manager，我需要互审三态（allow/deny/不可解析）与降级链都有 mock
   实例确定性断言，不依赖真实模型与网络。
5. 作为宪法主权者，我要求互审路径不弹人工审批窗（approval:required 只属于人工），
  前端零改动零适配。

## 需求条目

- **REQ-0017-01 · 互审触发与审官解析（handlers.ts approval handler）**：在挂起分支
  顶部判定 `role` 匹配 `^node:(\d+)$`：命中 → 从 `byId` 取审官节点；未命中 / id 无效
  → 人工路径逐字保留。审官节点不存在或 `type !== 'llm'` → `log{lvl:'warn'}` 告知
  （msg 含「审官节点不可用」类固定子串）→ 按降级链（REQ-0017-03）处理。
- **REQ-0017-02 · 裁决子任务（受控 generateText）**：`getModel(审官p.model)`；模型
  参数取审官节点 `paramDefaultsOf('llm') ∪ 审官.params`（sys/temp/max；max 建议收紧
  ≤512，SPEC 定）；system = `审官p.sys || ''` + 固定协议尾缀（要求**仅输出** JSON
  `{"verdict":"allow"|"deny","reason":"简短理由"}`）；user = 裁决上下文（工作流名 /
  审批节点标题 / 输入 preview 200）+ 指令；`abortSignal: ctx.ac.signal`；子任务期间
  emit `log{lvl:'sys'}`（互审裁决中，msg 含审官 title 与 node:id）。**不发**
  `node:start / node:delta / node:done / approval:required`。
- **REQ-0017-03 · 结构化裁决校验与降级链**：输出文本提取首个平衡 `{...}` 块（容忍
  markdown 围栏）→ `JSON.parse` → zod `z.object({ verdict: z.enum(['allow','deny']),
  reason: z.string().optional() })` 严格校验（多余键 / 自由文本拒收）。成功：
  verdict→ok、reason→comment，emit `approval:done`，out 文本带审官信息。失败
  （审官不可用 / getModel null / 调用异常含 abort 透传 / 解析或校验失败）→
  按 `to` 降级：`自动通过`→allow、`自动拒绝`→deny（均 warn log + 审计）；`挂起`→
  **回退人工审批全链路**（emit `approval:required` → approvalWaiters → 10 分钟
  timer → `approval:done`，与现状逐字同径）。abort（run 中止）不属降级，沿既有
  abort 语义透传。
- **REQ-0017-04 · 审计日志（store.ts）**：DDL 追加（幂等）
  `approval_audits(id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL,
  node_id INTEGER NOT NULL, reviewer TEXT NOT NULL, mode TEXT NOT NULL,
  verdict TEXT NOT NULL, reason TEXT, created_at INTEGER NOT NULL)`——mode 建议值域
  `'agent' | 'human' | 'agent-fallback'`（SPEC 定稿）；仓储函数 `recordApprovalAudit`
  （单条 INSERT 先例）。写入点：approval handler 内一切决议产生后、`approval:done`
  emit 前统一落——人工（含超时/中止）与互审同表同函数，mode 区分。
- **REQ-0017-05 · 冒烟 V 组（smoke-server.mjs 纯追加）**：mock 实例（复用 0015 G 组
  OpenAI 兼容 mock，扩展按请求特征返回裁决三态）：V01 role=node:<llm> + mock allow →
  事件序含「互审裁决中」log + `approval:done{approve:true}` + **无 approval:required**
  （全程断言）+ run 正常走完 + node:done out 含审官字样；V02 mock deny →
  approve:false + out「审批拒绝」+ 审计行 verdict='deny'；V03 mock 返回非 JSON +
  to='自动拒绝' → 直接 deny 不挂起 + 审计 mode='agent-fallback'；V04 审官 id 不存在
  + to='挂起' → approval:required 出现 + approve 端点人工决议后 run 继续 + 审计
  mode='human'；V05 role 普通文本（无前缀）→ 人工路径行为与现状一致（对照回归）；
  V06 主实例按 models.configured 分支断言降级路径（无密钥环境：模型未配置 + to=
  '自动拒绝' → deny，两分支皆合法如实断言）。审计核对直查 SQLite 文件或经 store
  导出（SPEC 定）。
- **REQ-0017-06 · 改动面白名单**：产品提交 git diff 仅允许——`apps/server/src/
  handlers.ts`、`apps/server/src/store.ts`、`tests/smoke/smoke-server.mjs`；若 SPEC
  评审拆出独立模块则允许追加 `apps/server/src/approval-review.ts`（新增，≤400 行）。
  `apps/server/src/engine.ts`、`server.ts` 预计零改动；其余任何路径零改动（AC6
  机器核对）。

## 非功能要求

1. **契约零漂移**：互审与回退路径全部事件逐条通过 `RunEventSchema.parse`
   （AC5 机器断言，VALIDATE 入口 `events.ts:40-42`）。
2. **确定性**：V01-V04 锚定 mock 实例（固定 JSON 字面量、无真实网络）；V06 按
   configured 分支两态皆合法。
3. **规模**：handlers.ts 258 → 预估 ≤ 360（400 硬上限内；若超则拆 approval-review.ts）；
   store.ts 351 → 预估 ≤ 390；smoke-server.mjs 675 → 预估 ≤ 760（追加非上限对象，
   SPEC 给精确预算）。
4. **零新增依赖 / env / 出站类别**（模型调用走 providers 既有通道，不经 guard）。
5. **安全侧默认**：默认 `挂起` 策略下一切裁决失败都回到人工主权，不自动放行。

## 验收标准（Given / When / Then）

- **AC1 · 互审正路径（确定性）**：Given mock 实例（AI_BASE_URL 注入）与
  `role='node:<llm节点id>'`、`to='挂起'` 的工作流，When POST /api/v1/run，Then SSE
  事件流含「互审裁决中」`log{lvl:'sys'}`（msg 含审官标识）与
  `approval:done{nodeId,approve:true}`，且**全程无 `approval:required`**；run 以
  `run:done{ok:true}` 收尾，审批节点 `node:done.out` 含审官信息；审计表新增行
  `mode='agent', verdict='allow'`。
- **AC2 · deny 分支与审计**：Given 同上但 mock 返回 deny JSON，Then
  `approval:done{approve:false}` 且审批节点 out 含「审批拒绝」；审计行
  `mode='agent', verdict='deny', reason` 为 mock 理由文本。
- **AC3 · 降级链**：Given mock 返回非 JSON 且 `to='自动拒绝'`，Then 不出现
  `approval:required`（不挂起）直接 `approval:done{approve:false}` + warn log +
  审计 `mode='agent-fallback'`；Given 审官 id 不存在且 `to='挂起'`，Then 出现
  `approval:required`（回退人工），When POST /api/v1/run/:id/approve
  `{nodeId,approve:true}`，Then run 继续至完成，审计 `mode='human'`。
- **AC4 · 人工路径零回归**：Given role 为普通文本（无 `node:` 前缀），When 走
  挂起审批 + approve 端点通过/拒绝，Then 事件序与现状逐字一致
  （approval:required → approval:done → out 文本同型），且新增审计行
  `mode='human'`；When 核对 `engine.ts` / `server.ts` approveHandler git diff，Then
  零改动。
- **AC5 · SSE 契约零漂移（机器证明）**：When 对 AC1-AC3 全事件流逐条
  `RunEventSchema.parse`，Then 全部通过；When 核对产品提交 git diff，Then
  `packages/shared/**` 零改动；`npm test` 全绿。
- **AC6 · 白名单与全量回归**：When 核对产品提交 git diff，Then 仅 REQ-0017-06
  白名单路径；`npm run gate` 8 场景全绿（纯回归面）+ `npm run smoke:server`
  全绿（既有 66 断言零回退 + V 组新增全过）。
- **AC7 · 保护力反演**：When（VERIFY 演练）临时摘除「node: 前缀分支」（或审计
  写入）重建后重跑对应 V 断言，Then 该断言 FAIL；还原重建复绿，`git status` 干净。
  证明 V 组非恒真。

## SPEC 要求（skipSpec=false）

BK-0017 为 M 项——不免 SPEC。SPEC 须含：受影响文件清单展开到函数/语句级
（approval handler 互审分支插入点、审计写入时序、store DDL 与 prepared statement、
V 组断言逐条）；裁决 prompt 精确模板（system 协议尾缀 + user 上下文字段与截断）；
JSON 提取算法（平衡块扫描 + 围栏剥离）与 zod schema 字面量；降级链判定表（六种
失败方式 × 三种 to 策略的行为矩阵）；mode 值域定稿；max 收紧值；审计写入与
`approval:done` emit 的先后次序（先落库后写网 doctrine 延伸）；mock 端点裁决三态的
路由依据（请求特征区分裁决调用与 G 组既有会话调用）；模块拆分判据（handlers.ts
超 400 行时拆 approval-review.ts）；回滚步骤（revert + DDL 幂等性说明——新表留存
对旧代码无害）。**硬前置判定**：SPEC 定案若得出「必须新增 SSE 事件类型或改 DEFS」
结论 → 立即中止并按触 UI 分类结论第 3、4 条转 pending-approval。

## 依赖与风险

- **依赖**：`npm run build:server`（冒烟 spawn 对象）；better-sqlite3 / express /
  ai / zod 既有依赖；0015 G 组 mock 基建（smoke-server.mjs 既有）。
- **风险 1 · 审官节点也在拓扑序中正常执行（双重执行观感）**：裁决子任务与审官
  节点自身的拓扑执行是两次独立调用，画布上互不干扰（子任务不发 node 事件）；
  SPEC 在模块头注显式声明该语义，防后续维护者误合并。
- **风险 2 · mock 端点复用歧义**：G 组（会话续聊）与 V 组（互审裁决）共用一个
  OpenAI 兼容 mock——按请求特征（如 user 消息含协议尾缀标记）分流三态响应，
  SPEC 固化路由依据，防断言串扰。
- **风险 3 · handlers.ts 行数**：互审分支 + 审计写入预估 +90 行 → ~350 行，仍
  <400；超限即拆 approval-review.ts（REQ-0017-06 已预留白名单）。
- **风险 4 · abort 透传**：裁决子任务 abortSignal 即 ctx.ac.signal，run 中止时
  generateText 抛 AbortError——不进降级链（中止≠裁决失败），沿 isAbort 既有语义
  透传（llm.ts:79 同判）；SPEC 固化。
- **风险 5 · 审计行与事件流的一致性**：审计直写 SQLite 而事件经 recorder 落
  run_events——两表无外键关联约束，回放时靠 run_id+node_id 对齐；审计写入失败
  不得阻断决议（catch + pino warn），SPEC 定稿容错口径。

---

## 选题过程存证

- **批复栏「approved：无」处置（规则①）**：与 BACKLOG 实况一致——七项批复已于
  0011 轮全部落 ready，四项相关项已 done（BK-0026/0025/9001 + BK-0016 会话 API）。
  现存批复 ready 项 BK-9002~9005（P0/L/触UI=是）**顺延**（本轮逐项复核：BK-9002/
  9003/9005 前置 BK-0021 proposed 未竟；BK-9004 前置 BK-0016 已 done 但 L 项拆分
  归次日治理日——10-25 周日，心跳抓取即夹带拆分违一次迭代只做一件事）。
- **user-request（规则②）**：面板仅 #9（AGENTS.md 漂移请用户处理）——POLICY 禁止区
  仅用户可改，且 BACKLOG 待批准区注记在案（用户已亲改在库，提交 21d94a3，待自行
  确认关单）→ 不建行（0011 轮先例）；无触 UI user-request，uiIssueNumbers 为空。
- **rejected（规则③）**：无处置。
- **残缺标记档案**（tools.ts:5,82 stub 如实降级）与**悬挂 run 探针**（161ce4ff
  running 1 条，智能客服助手）：均已知状态——前者 BK-0005 done + M07 断言守护 /
  BK-0008 ready 承载，后者 BK-0011 ready 承载；无新项，不重复立项。
- **覆盖差集 / 文档漂移 / dogfooding**：治理日产物（BACKLOG 既有证据行 BK-0023/
  BK-0024 等），心跳不重复采集。
- **选题（规则④）**：BK-0017——批复项顺延后最高优先 ready 队首（P1/M；BK-0016
  done 后 P1 ready 仅剩本项；非 doc、非触 UI）。次序参考：BK-0011（P2/S）→
  BK-0008（P2/M）。
- **skipSpec 判定**：M 项 → 不免 SPEC（skipSpec=false），SPEC 要求见专节。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE 全文 read；
  iterations/0014 PRD 头部 60 行 read（顺延先例）+ 0015 PRD 全文 read；`nodes.ts`
  :90-120 read（approval DEFS :101-106、paramDefaultsOf :115）；`events.ts` 全文
  read（approval:required/done :26-27、15 事件 :8-36、validateEvent :40-42）；
  `handlers.ts` :230-258 read（approval handler 全文、10min timer :247、
  approvalWaiters :248、approval:done :253）；`engine.ts` 全文 read 152 行
  （resolveApproval :43-48、P() :38、byId 入 args :97）；`server.ts` 全文 read
  247 行（approveHandler :139-145、v1-only 注册 :198-212、停机 :222-245）；
  `app.js` :2193-2222 read（approval:required 弹窗 :2197-2207、approval:done
  :2209-2211）；`server-sync.js` grep（approval 回放映射 :102-103）；`llm.ts`
  全文 read 122 行（getModel null :15-17、generateText :67/:81、abortSignal、
  zod :7）；`store.ts` :30-109 read（DDL 追加式 :58-97、SessionRow/MessageRow
  :44-53、prepared statements :100-109）；`types.ts` 全文 read
  （ApprovalDecision :37、HandlerArgs.byId :73）；wc -l：handlers 258 / store 351 /
  engine 152 / smoke-server 675；`git log -2 -- engine.ts` 实查（最后触达 1551994）；
  date 实查 2026-10-24 07:58。
