# SPEC · 迭代 0016 · BK-0017 智能体互审协议（引擎侧）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 08:08
> 输入：`docs/evolution/iterations/0016/PRD.md`（PLAN 产物）+ 本会话对下列文件的只读核实。
> 冲突顺位：CONSTITUTION.md > 代码实现 > 本文档。本文所有 `path:line` 引用均本会话亲读。

## 0 · 硬前置判定（PRD「SPEC 要求」末条）

**结论：无需新增 SSE 事件类型、无需改 DEFS、无需触 UI——迭代按原计划进行。**

- 互审与降级全路径只取用既有 15 种事件中的 3 种：`log`（`events.ts:24`，lvl∈sys/warn）、
  `approval:done`（`events.ts:27`）、`approval:required`（`events.ts:26`，仅人工回退路径）。
  全部载荷字段不变；`RunEventSchema`（`events.ts:8-36`）零改动。
- `role` 为自由 text（`nodes.ts:104`），`node:<id>` 仅是取值约定；`to` 三值 combo
  （`nodes.ts:105`）不动。`packages/shared/**` 产品提交零字节改动（AC5 机器核对）。
- 前端语义安全已核实：`approval:required` 会弹人工审批模态框并阻塞等待
  （`apps/web/src/legacy/app.js:2197-2207`），故互审正路径绝不发它；`approval:done`
  仅移除 modal class + 记日志（`app.js:2209-2211`），未开窗时无害；回放映射同语义
  （`apps/web/src/server-sync.js:102-103`）。

## 1 · 受影响文件清单（函数/语句级）

| 文件 | 改动 | 现状 → 预算行数 |
| --- | --- | --- |
| `apps/server/src/approval-review.ts` | **新增**（≤400 行硬上限）：裁决子任务纯逻辑模块（详见 §4） | 0 → ≤160 |
| `apps/server/src/handlers.ts` | approval handler（:237-257）互审分支插入 + 四个决议点审计调用；其余 handler 零改动 | 258 → ≤310 |
| `apps/server/src/store.ts` | DDL 追加 `approval_audits` 表（`DDL` 常量 :59-97 末尾追加）；`S` 类型（:100-120）+ `insertApprovalAudit` prepared statement（:137-181 区段）；仓储函数 `recordApprovalAudit`（会话函数区 :312 后） | 351 → ≤385 |
| `tests/smoke/smoke-server.mjs` | ① mock 端点裁决路由扩展（`startMockModel` :76-108 内）；② V 组夹具 + 审计只读核对 helper + V01-V09 断言（G10 之后、main() 收尾前追加）；③ import 追加 `better-sqlite3`、`path`、`REPO_ROOT` | 675 → ≤880 |
| `apps/server/src/engine.ts` · `server.ts` | **零改动**（AC4 机器核对 git diff） | — |
| `apps/web/**` · `packages/shared/**` · `tools/pixel-gate/**` · `tests/golden/**` · `.github/**` | **零改动**（AC6 白名单机器核对） | — |

产品提交 git diff 白名单 = 上表前四行路径（与 PRD REQ-0017-06 一致，含其预授权的
`approval-review.ts`）。**SPEC 评审结论：拆出独立模块**（理由见 §3 模块边界——裁决
子任务的 prompt/解析/校验是自洽闭包，独立成文件使 handlers.ts 远离 400 行上限，
且不引入循环依赖：approval-review.ts → providers/util/types，handlers.ts →
approval-review/store，store.ts → logger，均为既有方向）。

## 2 · 现状锚点（改造对照基线，均本会话亲读）

- approval handler 现结构（`handlers.ts:237-257`）：`policy = p.to || '挂起'` 三分支；
  自动通过/自动拒绝立即短路（**不发任何事件**，out = `审批{通过|拒绝} · {role}`）；
  挂起分支 emit `approval:required`（:243，载荷 runId/nodeId/title/role/inputPreview，
  `preview(input,200)`）→ Promise 等待（10 分钟 timer 超时自动通过 :247；
  `approvalWaiters.set` :248；abort 监听 resolve 拒绝 :249）→ `approval:done`（:253）→
  返回 out（:256）。
- 人工决议链（零改动）：`ctx.resolveApproval` 由 engine 挂载（`engine.ts:43-48`），
  HTTP 入口 `approveHandler`（`server.ts:139-145`）。
- HandlerArgs 已含 `byId`（`types.ts:73`）、`ctx`（:77）；handler 内可用
  `runCtx.wf.name`。`paramDefaultsOf` 已在 handlers.ts 导入（:5）。
- LLM 调用先例：`getModel(p.model)` null 检查（`llm.ts:15-17`，互审不抛错走降级）；
  `generateText({ model, system, prompt, temperature, maxOutputTokens, abortSignal })`
  （`llm.ts:81`）；abort 透传判式 `isAbort(e) || ctx.ac.signal.aborted`（`llm.ts:79`）；
  zod 已在服务端在用（`llm.ts:7`，zod 3.25.76 本会话实查）。
- 冒烟基建：`startServer(port,{env})`（`lib.mjs:69`）；mock 实例
  `AI_BASE_URL/AI_API_KEY/AI_MODELS/AI_MODEL` 注入（`smoke-server.mjs:532-534`）；
  minimal 实例全密钥空串压制（:611-616）；mock 端点现只按 SSE 分块流式应答（:86-101）。
- **mock 路由依据（关键事实，本会话实查 provider dist）**：
  `@ai-sdk/openai-compatible` 的 `doStream`（streamText 走）请求体带 `stream:true`、
  期望 SSE；`doGenerate`（**generateText 走**）请求体**不带 stream 键**、期望
  `application/json` 的 `chat.completion` 应答（`node_modules/@ai-sdk/openai-compatible/
  dist/index.js:458-470` doGenerate → `createJsonResponseHandler`；:524 doStream →
  `stream:true`）。既有 G 组流量全部经 sessions streamText（`sessions.ts:18,:115`），
  故「非流式请求 = 裁决子任务」的路由判据是确定性且与 G 组零串扰。

## 3 · 模块边界

```
handlers.ts（approval handler）      事件面 + 决策编排：分支判定、降级矩阵、审计调用、人工路径（逐字保留）
  └─ approval-review.ts（新增）       裁决子任务纯逻辑：role 解析、prompt 组装、generateText、
                                     JSON 提取、zod 校验。不 import store、不 emit 任何事件
                                     （log 的 emit 权留在 handler——handlers 是唯一事件面）
store.ts                             DDL + insertApprovalAudit + recordApprovalAudit（内部容错）。
                                     不新增查询函数（审计查询端点是 PRD 非目标）
engine.ts / server.ts                零改动
```

模块头注必须显式声明（PRD 风险 1 语义）：**裁决子任务与审官节点自身的拓扑执行是两次
独立调用**——审官若未被 `bypass` 且在拓扑序中可达，会照常执行一次自己的 LLM 生成
（发自己的 node:start/delta/done），与裁决子任务互不影响；裁决子任务只发 `log`，
绝不发 node:* 事件。后续维护者不得合并两者。

## 4 · 技术方案

### 4.1 互审触发与审官解析（handlers.ts）

- 触发条件：`policy === '挂起'`（进入 else 分支后）**且** `parseAgentRole(p.role)` 命中
  `^node:(\d+)$`。插入点：挂起分支顶部、emit `approval:required`（:243）**之前**。
  role 不匹配前缀 → 人工路径语句**逐字保留**（仅按 §4.5 插入一行审计调用）。
- 审官解析：`byId.get(id)`；不存在（F1）或 `type !== 'llm'`（F2）→ warn log
  （msg 含固定子串「审官节点不可用」）→ 走 §4.4 降级链。F1/F2 在 handler 内判定
  （byId 在 HandlerArgs），不进 approval-review.ts。

### 4.2 裁决子任务（approval-review.ts）

- `parseAgentRole(role: unknown): number | null`——`/^node:(\d+)$/.exec(String(role||''))`
  命中返回数字 id，否则 null。
- 审官参数：`rp = { ...paramDefaultsOf('llm'), ...(reviewer.params || {}) }`
  （与 engine.ts:38 P() 同式；paramDefaultsOf 从 @agentflow/shared 导入）。
- 模型：`getModel(rp.model)`——null → F3（**不抛 HTTP 错**，走降级链，与 llm.ts:15-17
  抛错先例不同，这是互审的容错定位）。
- 生成参数：`temperature = Number(rp.temp ?? 0.7)`；**maxOutputTokens 定稿 =
  `Math.min(512, Math.max(64, Number(rp.max) || 256))`**（PRD 建议收紧 ≤512：裁决只需
  一行 JSON；审官自设 2048/32768 也被压到 512）。
- **system 精确模板**：`(rp.sys || '') + REVIEW_PROTOCOL_SYS`，其中协议尾缀为固定字面量：

  ```
  \n\n你是审批裁决审官。请对用户给出的审批请求做出裁决，仅输出一个 JSON 对象：{"verdict":"allow" 或 "deny","reason":"简短理由"}，不要输出任何其他文字。
  ```

- **user 精确模板**（`buildReviewUserPrompt`，单字符串、无模板变量引擎介入）：

  ```
  【审批裁决请求】
  工作流：{wfName}
  审批节点：{nodeTitle}（node {nodeId}）
  输入摘要：{inputPreview}
  请裁决是否放行以上请求。
  ```

  其中 `wfName = ctx.wf.name`、`nodeTitle = n.title || '人工审批'`、
  `inputPreview = preview(input, 200)`（与 approval:required 载荷同源同长）。
- 调用：`generateText({ model, system, prompt, temperature, maxOutputTokens,
  abortSignal: ctx.ac.signal })`。调用前由 handler emit `log{lvl:'sys'}`：
  msg = `⚖ 互审裁决中 · 审官 ${reviewer.title || 'LLM'}（node:${reviewer.id}）`
  （固定前缀「互审裁决中」，V 断言锚点）。**不发** node:start/node:delta/node:done/
  approval:required。
- **无额外超时**（与 llm.ts 既有 LLM 调用一致，仅 abortSignal）：挂死等价于普通 LLM
  节点挂死，由 stop 端点/优雅停机兜底——不为本迭代新增超时维度。
- 返回判别联合：`{ kind:'verdict', ok, reason } | { kind:'fail', why }`；
  `isAbort(e) || ctx.ac.signal.aborted` → **rethrow**（abort≠裁决失败，沿 llm.ts:79
  同判透传，不降级、不落审计——决议未产生）。

### 4.3 JSON 提取算法与 zod schema（字面量）

`extractBalancedJson(text: string): string | null`：

1. 剥离 markdown 围栏：`const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)`，
   命中取 `fence[1]`，否则用原文；
2. 从首个 `{` 起平衡扫描：字符串字面量内遇 `\` 跳下一字符、遇 `"` 翻转 inStr；
   字面量外 `{` 深度+1、`}` 深度−1，深度归零即返回该闭区间切片；无 `{` 或永不归零
   返回 null。

zod schema 字面量（zod 3 语法，仓库实装 3.25.76）：

```ts
const VerdictSchema = z.object({
  verdict: z.enum(['allow', 'deny']),
  reason: z.string().optional(),
}).strict();   // 多余键 / verdict 越值 / 自由文本一律拒收（safeParse 失败即 F6）
```

解析链：`extractBalancedJson` → null 则 F5（'输出不可解析为 JSON'）；`JSON.parse`
抛错同归 F5；`VerdictSchema.safeParse` 失败为 F6（'输出不符合裁决协议'）；成功映射
`verdict === 'allow' → ok=true`，`deny → ok=false`，reason 透传。

### 4.4 降级链判定表（六失败方式 × 三策略；F1-F6 同构，why 文案不同）

| 失败方式 | why（审计 reason 前缀 / warn 子串） | to=自动通过 | to=自动拒绝 | to=挂起 |
| --- | --- | --- | --- | --- |
| F1 审官节点不存在 | `审官节点不可用：node:{id} 不存在` | 降级→allow | 降级→deny | 回退人工全链路 |
| F2 审官非 LLM 节点 | `审官节点不可用：节点类型不是 LLM` | 降级→allow | 降级→deny | 回退人工全链路 |
| F3 模型未配置 | `模型未配置` | 降级→allow | 降级→deny | 回退人工全链路 |
| F4 调用异常（非 abort） | `模型调用失败：{preview(err,80)}` | 降级→allow | 降级→deny | 回退人工全链路 |
| F5 输出不可解析 | `输出不可解析为 JSON` | 降级→allow | 降级→deny | 回退人工全链路 |
| F6 zod 校验失败 | `输出不符合裁决协议` | 降级→allow | 降级→deny | 回退人工全链路 |
| abort（run 中止） | —（非失败） | 不降级：isAbort 透传，run 走中止语义；**无审计行**（决议未产生） | 同左 | 同左 |

- 「降级→allow/deny」行为：落审计（mode=`agent-fallback`，verdict=allow/deny，
  reason=`裁决失败：{why}`）→ emit `log{lvl:'warn'}`（msg =
  `⚖ 互审裁决失败（{why}），按超时策略「{policy}」降级`）→ emit
  `approval:done{nodeId, approve}`（**要发**——该节点经历过裁决尝试，前端关窗无害，
  PRD AC3 明确要求）→ out = `审批{通过|拒绝} · {p.role}（裁决失败降级：{preview(why,60)}）`。
- 「回退人工全链路」行为：emit `log{lvl:'warn'}`（msg =
  `⚖ 互审裁决失败（{why}），回退人工审批`）→ **既有挂起分支语句逐字执行**
  （approval:required → approvalWaiters → 10 分钟 timer → approval:done）。
  审计行只有最终人工决议一条（mode=`human`）——失败的裁决尝试不是决议，其痕迹在
  warn log（经 recorder 落 run_events）可回放。
- 纯策略短路（role 无前缀 + to∈{自动通过,自动拒绝}）：现状行为逐字保留（无事件、
  out 同型），仅追加审计行 mode=`auto`、reason=`超时策略「{policy}」`。

### 4.5 审计落库（store.ts + handlers.ts）

DDL（追加在 `DDL` 常量末尾，幂等）：

```sql
CREATE TABLE IF NOT EXISTS approval_audits(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  node_id INTEGER NOT NULL,
  reviewer TEXT NOT NULL,      -- 原样 role 参数文本（'node:2' / '值班经理' / 'node:99'）
  mode TEXT NOT NULL,          -- 'auto' | 'agent' | 'agent-fallback' | 'human'（值域定稿）
  verdict TEXT NOT NULL,       -- 'allow' | 'deny'
  reason TEXT,                 -- 可空：LLM 理由 / 裁决失败 why / 人工 comment / 策略名
  created_at INTEGER NOT NULL
);
```

**mode 值域定稿：`'auto' | 'agent' | 'agent-fallback' | 'human'`**（PRD 建议三值 +
SPEC 补 `'auto'`：纯策略短路也是一次决议，用户故事 3「每次审批决议都有不可抵赖的
一行」要求全覆盖；`'human'` 按口径含超时自动通过与中止（PRD REQ-0017-04「人工
（含超时/中止）」），reason 分别为 `等待超时(10分钟)，自动通过` / `运行已中止` /
approve 端点传入的 comment）。

仓储函数（单条 INSERT 先例，同 `insertEvent` :147 形态）：

```ts
export function recordApprovalAudit(runId: string, nodeId: number, reviewer: string,
  mode: 'auto' | 'agent' | 'agent-fallback' | 'human', verdict: 'allow' | 'deny',
  reason: string | null): void
```

**写入时序（「先落库后写网」doctrine 延伸，定稿）**：每个决议点——纯策略短路处、
人工等待 Promise resolve 之后、裁决 verdict 产生后、降级 allow/deny 判定后——均为
**决议产生 → recordApprovalAudit → emit（log/approval:done）→ return**。四个写入点
全部在 handlers.ts approval handler 内调用。

**容错口径（定稿）**：`recordApprovalAudit` **内部** try/catch + `logger.warn`
（镜像 openRunRecorder 的降级先例 `store.ts:283-286`：持久化失败不阻断执行流）——
审计写失败时决议照常 emit，代价是一行 pino warn；handler 侧无需再包 try/catch。

**一致性口径（PRD 风险 5）**：approval_audits 与 run_events 无外键（沿 ADR-0005 表间
正交惯例），回放对齐靠 `run_id + node_id`；审计行写入时点先于对应 approval:done 事件
落库，同 run 内时间自洽。

### 4.6 mock 端点裁决路由（smoke-server.mjs `startMockModel` 扩展）

路由依据（定稿，PRD 风险 2）：**请求体 `stream !== true`（即 generateText 裁决调用）
→ 非流式 JSON 应答**；`stream === true` → 既有分块延时流（G 组行为逐字保留）。
三态+1 选择器：裁决请求的最后一条 user 消息 content（含审批节点标题）按子串路由——

| content 含 | 应答 content（`chat.completion` JSON 的 message.content） |
| --- | --- |
| `互审驳回` | `{"verdict":"deny","reason":"mock 拒绝：内容不合规"}` |
| `互审坏输出` | `抱歉，我认为这个请求无法用 JSON 回答。`（非 JSON → F5） |
| `互审错形状` | `{"verdict":"maybe","reason":"不确定"}`（JSON 但 schema 不符 → F6） |
| 其余（默认，含 `互审放行`） | `{"verdict":"allow","reason":"mock 允许：符合规范"}` |

应答形态（标准非流式 chat.completion，provider `createJsonResponseHandler` 可解析）：

```json
{ "id":"chatcmpl-verdict", "object":"chat.completion", "created":1700000000,
  "model":"mock-model", "choices":[{"index":0,"message":{"role":"assistant","content":"<上表内容>"},"finish_reason":"stop"}],
  "usage":{"prompt_tokens":9,"completion_tokens":9,"total_tokens":18} }
```

`requests` 数组照旧在路由前 push（G06 计数断言 `>=3` 不受影响，V 组在其后运行）。

## 5 · 冒烟 V 组断言（V01-V09，追加于 G10 后；全部经 HTTP 触达 + §5.1 只读审计核对）

夹具（V01-V03/V07/V08 跑 **mock 实例**，V04/V05 跑**主实例**，V06 跑 **minimal 实例**；
审官 llm 节点一律 `bypass:true`——bypass 只跳过审官自身拓扑执行，不影响被引为审官，
使每个 V run 恰好一次裁决调用、零多余流式调用）：

```
V01  nodes:[{id:1,type:'approval',title:'互审放行',params:{role:'node:2',to:'挂起'}},
            {id:2,type:'llm',title:'审官A',bypass:true,params:{model:'MockChat',sys:'你是审官'}}]  edges:[]
V02  同 V01 但 title:'互审驳回'
V03  同 V01 但 title:'互审坏输出'，params.to='自动拒绝'
V04  nodes:[{id:1,type:'approval',params:{role:'node:99',to:'挂起'}}]  edges:[]（主实例）
V05  ① role:'普通审批人',to:'挂起'（人工对照）② role:'普通审批人',to:'自动拒绝'（纯策略）
V06  同 V01 形态但 title:'互审放行'，to:'自动拒绝'（minimal 实例，模型必未配置）
V07  同 V01 但 title:'互审错形状'，params.to='自动通过'
V08  nodes:[{id:1,type:'approval',title:'互审坏输出',params:{role:'node:2',to:'自动拒绝'}},
            {id:2,type:'prompt',title:'审官B',bypass:true,params:{tpl:'x'}}]（F2，零模型调用）
```

- **V01 · AC1 互审正路径**：run:done{ok:true,done:2,total:2}；有序子序列恰
  `run:accepted→run:start→node:start(1)→log(sys 互审裁决中)→approval:done{nodeId:1,
  approve:true}→node:done(1)→node:bypass(2)→run:done`（跳过 run:progress）；**全程无
  approval:required**；node:done(1).out 含「智能体裁决」与「审官A」；审计行
  `{node_id:1, reviewer:'node:2', mode:'agent', verdict:'allow', reason:'mock 允许：符合规范'}`。
- **V02 · AC2 deny**：approval:done{approve:false}；out 以「审批拒绝」开头；审计
  `mode='agent', verdict='deny', reason='mock 拒绝：内容不合规'`；无 approval:required。
- **V03 · AC3 前半 F5 降级**：无 approval:required；直接 approval:done{approve:false}；
  log(warn) 含「互审裁决失败」与「输出不可解析」；审计 `mode='agent-fallback',
  verdict='deny'`，reason 前缀「裁决失败：」。
- **V04 · AC3 后半 F1 回退人工**：log(warn) 含「审官节点不可用」；approval:required
  出现（nodeId=1, role='node:99'）；`POST /api/v1/run/:id/approve {nodeId:1,
  approve:true}` → 200 {ok:true} → run:done{ok:true}；恰一行审计 `mode='human',
  verdict='allow', reviewer='node:99'`。
- **V05 · AC4 人工零回归**：① 挂起+人工通过：事件序与 D 组同型
  （approval:required → approval:done → run:done ok），node:done.out 与现状同型
  （`审批通过 · 普通审批人`），审计 mode='human'；② 纯自动拒绝：**无**
  approval:required 且**无** approval:done（现状行为），out `审批拒绝 · 普通审批人`，
  审计 mode='auto'。
- **V06 · F3 模型未配置降级（minimal 实例，确定性——SPEC 对 PRD「主实例按
  configured 分支」的定稿改道**：主实例在带密钥开发机上会触真实模型调用，非确定且
  产生费用；minimal 实例空串压制使 F3 无条件确定，覆盖面等价**）**：无
  approval:required；approval:done{approve:false}；log(warn) 含「模型未配置」；
  审计 mode='agent-fallback', verdict='deny'。
- **V07 · F6 zod 拒收**：mock 返回合法 JSON 但 verdict='maybe' → 降级 allow
  （to='自动通过'）；审计 mode='agent-fallback', verdict='allow'，reason 含
  「输出不符合裁决协议」。
- **V08 · F2 非 LLM 审官**：log(warn) 含「审官节点不可用」；approval:done
  {approve:false}；审计 mode='agent-fallback', verdict='deny'。
- **V09 · AC5 契约零漂移**：V01-V04、V06 捕获的全部 SSE 事件逐条
  `validateEvent`（G10 同法）；`packages/shared/**` git diff 零改动。

### 5.1 审计核对机制（SPEC 定稿：SQLite 只读直查 + 边界例外论证）

lib.mjs 头注的 smoke 边界（迭代 0002 SPEC §2）含「不读写 data/agentflow.db」。
本迭代引入**窄口径例外**（写明在此，治理可见）：审计表无 HTTP 读面（查询端点是 PRD
明确非目标），忠实核对唯有直查；例外限定为——`smoke-server.mjs` 内 helper
`auditsOf(runId)`：`better-sqlite3` 以 **readonly:true** 打开 `data/agentflow.db`，
单表单 SELECT（`WHERE run_id=?`），`finally db.close()`，仅在对应 run `waitEnd`
收束后调用（better-sqlite3 同步写已落盘）。**零写入、零 lib.mjs 改动**（lib.mjs 不在
白名单）；better-sqlite3 自仓库根 node_modules 可解析（本会话
`node -e "require.resolve('better-sqlite3')"` 实查通过）。三实例共享同一 DB 文件为
0015 既有事实，V 断言按 run_id 过滤天然隔离。V 组 runId 全部 push `CLEAN.runIds`
（主实例 DELETE 即清共享库中的行；会话类无端点残留不适用于 V——V 不建会话）。

## 6 · 行数预算（硬上限：新增源文件 ≤400）

| 文件 | 现状 | 预算 | 余量 |
| --- | --- | --- | --- |
| approval-review.ts | 0 | ≤160 | 240 |
| handlers.ts | 258 | ≤310 | 90 |
| store.ts | 351 | ≤385 | 15 |
| smoke-server.mjs（非源文件，无 400 上限；PRD 预估 ≤760 为粗估，SPEC 精确预算如下） | 675 | ≤880（mock 路由 +25 / 夹具 +30 / helper +12 / V01-V09 +105 / import +3） | — |

## 7 · 验收口径（BUILD 自检 + VERIFY 执行）

1. `npm run build`（shared+web）全绿——gate 前置；
2. `npm run build:server` 全绿（冒烟 spawn 对象）；
3. `npm run gate` 8 场景全绿（纯回归面：前端零改动，预期与基线逐像素一致）；
4. `npm test` 全绿（shared 契约零漂移）；
5. `npm run smoke:server` 全绿：既有 66 断言零回退 + V01-V09 全过（合计 75）；
6. 产品提交 git diff 机器核对：仅 §1 白名单四路径；`packages/shared/**`、
   `apps/web/**`、`engine.ts`、`server.ts` 零改动；
7. 手动 E2E 点位（按需补充，非阻塞——V 组已提供确定性全覆盖）：
   a. 有密钥环境（`server/.env` 配 AI_BASE_URL+AI_API_KEY）：curl -N `POST /api/v1/run`
      提交 V01 形态工作流（role 填真实画布 llm 节点 id、不 bypass），观察 SSE 含
      「互审裁决中」sys log 与 approval:done、无 approval:required，run 走完；
      `sqlite3 data/agentflow.db "select * from approval_audits order by id desc limit 1"`
      见 mode='agent' 行（真实模型 verdict 值不预设，只验结构）。
   b. 浏览器打开 http://localhost:3000 跑含 approval 节点（role 普通文本）的既有
      工作流：审批弹窗行为与现状一致（AC4 交互面抽查）。

## 8 · AC7 反演步骤（VERIFY 演练，非产品提交内容）

1. 摘除实验：注释 handlers.ts 中 `parseAgentRole` 命中分支（或注释四处
   recordApprovalAudit 调用）→ `npm run build:server` → 跑 `npm run smoke:server` →
   对应 V 断言必须 FAIL（前者：V01 出现 approval:required 且无「互审裁决中」；
   后者：V01-V08 审计核对空结果）；
2. 还原重建复跑全绿；`git status` 干净（演练改动不得混入产品提交）。

## 9 · 回滚步骤

`git revert <产品提交>`（WORKFLOW §6 唯一回滚手段）。DDL 幂等性说明：已建库中的
`approval_audits` 表残留对旧代码无害（旧代码无任何引用），未来重落地时
`CREATE TABLE IF NOT EXISTS` 原样复用；无需数据迁移，无降级脚本。

## 10 · 风险与语义声明（实现与维护须知）

1. **双重执行语义**（PRD 风险 1）：见 §3 模块头注要求。冒烟夹具以 bypass 隔离，
   真实画布中审官不自 bypass 时会自我执行一次——这是引擎既有语义，非本迭代引入。
2. **abort 透传**（PRD 风险 4）：裁决子任务 abortSignal 即 ctx.ac.signal；中止时
   generateText 抛 AbortError → isAbort 透传 → node:error「已中止」→ run:done
   (stopped)。不降级、不落审计（决议未产生）。
3. **审计写失败**：内部 catch + pino warn，决议照常（§4.5）；测试不注入该故障
   （better-sqlite3 同步写无现实失败面）。
4. **裁决无超时**：与既有 LLM 节点一致（§4.2）；后续如需上限另立 backlog 项。
5. **mock 路由依赖 SDK 行为**：`stream` 标志判据基于 @ai-sdk/openai-compatible
   ^3.0.71 实装（§2 已核 dist）；升级该依赖时 V 组是回归哨兵。

## 11 · ADR 判定

**needsAdr=false。** 论证：本迭代未跨越任何新架构边界——表结构追加沿 ADR-0005
「新增表/列时在此追加」的既定扩展机制（0015 sessions/messages 两表先例未另立 ADR）；
裁决子任务复用 ADR-0004 的 AI SDK 通道与 llm.ts 既有调用形态；agent-as-reviewer 属
POLICY 自主区「后端能力演进（apps/server/src/**）」；零 UI、零契约、零新依赖、
零新 env、零新出站类别。若实现中发现必须越界（新事件/新依赖/触 UI），按 PRD 硬前置
判定中止并转 pending-approval。

## 12 · 对 PRD 的两处 SPEC 级定稿偏移（如实声明）

1. **V06 改道 minimal 实例**（PRD 原文「主实例按 models.configured 分支」）：
   理由与等价性见 §5 V06——主实例带密钥时 F3 无法确定构造，minimal 实例无条件确定，
   F3 覆盖面等价且免真实调用。
2. **mode 值域增补 `'auto'`**（PRD 建议三值）：纯策略短路也是决议，全留痕才满足
   用户故事 3；V05② 有对应断言。
