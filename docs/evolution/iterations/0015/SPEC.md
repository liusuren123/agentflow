# SPEC · 迭代 0015 · BK-0016 持久会话与流式会话 API（技术规格）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 06:38
> 输入：`iterations/0015/PRD.md`（PLAN 产物）；代码事实源均为本会话只读核实（引用带 文件:行）。
> 权威顺位：`CONSTITUTION.md` > 代码实现 > 本文件（spec-designer 输出规范）。

## 0 · 硬前置判定（PRD「SPEC 要求」末条，先于一切）

**结论：现有 15 种 SSE 事件足以承载会话流，零新增事件类型 → 不触发转 pending-approval，迭代继续。**

证明见 §2 逐事件字段表：会话 turn 四条终态路径（正常 / 停止 / 降级 / 异常）所需的全部
事件（`run:accepted` / `node:start` / `node:delta` / `node:done` / `log` / `run:error` /
`run:done`，共 7 种）均在 `packages/shared/src/events.ts:8-36` 既有 vocabulary 内，且每个
字段（含 schema 必填的 `node:start.iteration`、`node:done.firePort/iteration`——PRD 背景 4
简写未展开、本 SPEC §2.2 补齐）均落在既有 schema 射程内。「复用 15 种」指**在 15 种
vocabulary 内取用 7 种**，非 15 种全用（`run:start`/`run:progress`/`node:bypass`/
`node:error`/`cond`/`output`/`approval:*` 共 8 种会话不发出）。

**needsAdr 判定：否。** 本设计是 ADR-0004（TS 运行时）/ ADR-0005（SQLite + /api/v1）与
既有代码先例（`runsById` 内存判活、`stopHandler` abort 语义、幂等 DDL 追加）的直接组合，
无新跨面权衡、不触 POLICY 需批准区任何条目（零 UI / 零 shared 契约 / 零新依赖 / 零新 env
/ 零新出站类别），决策记录随本 SPEC 与代码头注沉淀即可，无需新 ADR 草案。

## 1 · 设计总览与模块边界

```
apps/server/src/store.ts      追加：sessions/messages 两表 DDL + 5 个仓储函数（SQL 仍全收敛于此）
apps/server/src/sessions.ts   新增：会话路由 handler ×5 + 会话 turn 编排（SSE 信封 + streamText + 中止）
                              + sessionsById 注册表 + shutdown 协作出口
apps/server/src/server.ts     追加：import + 5 行路由注册（仅 v1）+ shutdown ②/③ 两处扩展
tests/smoke/smoke-server.mjs  追加：G 组断言（G01-G10）+ 进程内 mock 模型端点 + 第三 minimal 实例
```

模块边界（沿 `docs/frontend-module-boundaries.md` 与 store.ts:4-5 头注 doctrine）：

- **store.ts**：唯一 SQL 出口。会话表结构与 runs 表同层，但**完全正交**——sessions/messages
  与 runs/run_events 无任何外键、无联合查询；`appendMessage` 不触碰 run_events。
- **sessions.ts**：不 import engine/handlers（会话不执行画布工作流，PRD 非目标第 5 条）；
  模型调用直调 AI SDK `streamText`（经 `providers.ts` 既有通道，llm.ts 本身零改动——其
  handler 与节点 id/ports 语义绑定，PRD 背景 3 已论证）；SSE 帧写出复用 `util.ts` 的
  `sseWriteEvent/sseWriteComment` 单一出口。
- **server.ts**：只做注册与停机协作，不含会话业务逻辑（行数预算见 §7）。
- **头注硬声明**（PRD 风险 4）：sessions.ts 头注必须写明「turn 事件不入 run_events——
  run_events 是 run 的回放资产，会话的持久资产是 messages 表」，防后续维护者顺手补齐。

## 2 · SSE 契约零漂移（硬前置的逐条证明 + 事件序字段表）

### 2.1 事件序（四条终态路径）

记 `t0` = turn 开始（chat handler 通过 404/409 校验后取 `Date.now()`），`acc` = 流式累积
文本，`turnId = crypto.randomUUID()`，`TITLE = session.title`（建会话落库值，默认
`'新会话'`），`ms = Date.now() - t0`。

| 路径 | 事件序（→ 为顺序，×N 为多条） |
| --- | --- |
| **正常** | `run:accepted` → `node:start` → `node:delta`×N → `node:done` → `log(ok)` → 【assistant 全文落库】→ `run:done{ok:true}` |
| **停止**（stop/shutdown abort） | `run:accepted` → `node:start` → `node:delta`×N（节流态） → 【acc 非空时落库】→ `run:done{stopped:true, ok:false}` |
| **降级**（getModel 返回 null） | `run:accepted` → `log(warn)` → `run:error` → 【不落 assistant】→ `run:done{ok:false}` |
| **异常**（流中非 abort 错误） | `run:accepted` → `node:start` → `node:delta`×N? → `run:error` → 【不落 assistant】→ `run:done{ok:false}` |

- `node:delta` 累积语义与节流与 llm.ts:94-99 逐字同型：`acc += chunk`，距上次 emit >60ms
  才发（每次发**累积全文** `text: acc`），循环退出后补发末次（正常路径；停止/异常路径
  以节流态最后一帧为末帧，与 run 中止时 engine 跳过 `node:done` 的语义对称——
  engine.ts:127 仅成功路径发 node:done）。
- `: ping` 保活注释帧每 15s（server.ts:94 同型），非事件、不参与校验。
- **先落库后写网 doctrine 延伸至终态事件**（PRD REQ-0016-02 ⑥）：正常路径 assistant
  全文、停止路径已累积文本，均在发出 `run:done` **之前**落库（§3.2 步骤表标注）。

### 2.2 逐事件字段表（对照 events.ts schema；✱ = schema 必填但 PRD 背景 4 简写未展开、本表补齐）

| 事件 | 载荷（TypeScript 形状） | schema 依据 | 值规则 |
| --- | --- | --- | --- |
| `run:accepted` | `{ type:'run:accepted', runId: turnId }` | events.ts:9 | runId=turnId（非 session id）；非空 string |
| `node:start` | `{ type:'node:start', id: 0, title: TITLE, iteration: null }` | events.ts:12 | ✱ `iteration` 必填（nullable）——engine.ts:91 恒发，会话恒 `null`；`defName` 可选、不发 |
| `node:delta` | `{ type:'node:delta', id: 0, text: acc }` | events.ts:14 | text 为**累积全文**（llm.ts:97 同型），非增量 |
| `node:done` | `{ type:'node:done', id: 0, title: TITLE, out: 全文, ms, tokens?, firePort: null, iteration: null }` | events.ts:15-21 | ✱ `firePort`/`iteration` 必填（nullable），恒 `null`；`out`=**全文不截断**（PRD REQ-0016-02 ⑥ 明定；注意与 llm 节点 160 字摘要 llm.ts:114 不同，勿照抄）；`tokens` 取 usage（取不到则省略）；`ms`=turn 耗时 |
| `log` | `{ type:'log', lvl:'ok'\|'warn', msg }` | events.ts:24 | lvl ∈ enum；正常路径 `msg = "✓ 会话回复 · 生成 ${tokens ?? '?'} tokens · ${s.toFixed(1)}s"`（llm.ts:109 同型）；降级路径见 §3.2 ⑤ |
| `run:error` | `{ type:'run:error', message }` | events.ts:28 | 降级：`模型服务未配置（${providerInfo().note}）`（llm.ts:17 同文案语义）；异常：原始错误 message（runHandler catch server.ts:113 同型） |
| `run:done` | `{ type:'run:done', ms, done, total, ok, stopped?, outputs? }` | events.ts:29-35 | **total 恒 1**（一个合成节点），**done = 1 当且仅当发出过 node:done**（即仅正常路径为 1，其余路径 0）；`stopped` 仅停止路径发 `true`（其余省略或 false，沿 engine.ts:150 恒发风格——SPEC 定为恒发布尔，取值见路径表 §2.3）；`outputs`：正常 `[全文]`、停止 `[acc]`（acc 空则 `[]`）、降级/异常 `[]`；`vars` 不发 |

### 2.3 四路径 run:done 终值表（冒烟断言的精确期望）

| 路径 | ms | done | total | ok | stopped | outputs |
| --- | --- | --- | --- | --- | --- | --- |
| 正常 | ms | 1 | 1 | true | false | `[全文]` |
| 停止 | ms | 0 | 1 | false | true | `[acc]`（空→`[]`） |
| 降级 | ms | 0 | 1 | false | false | `[]` |
| 异常 | ms | 0 | 1 | false | false | `[]` |

## 3 · 受影响文件清单（函数/语句级）

### 3.1 `apps/server/src/store.ts`（255 行 → 预算 ≤360）

1. **头注表结构清单追加两行**（store.ts:9-12 段内）：
   `sessions(id, title, model, sys, created_at, updated_at)`、
   `messages(session_id, seq, role, text, created_at, PRIMARY KEY(session_id, seq))`。
2. **DDL 追加**（`const DDL` store.ts:44-66 内，幂等 `CREATE TABLE IF NOT EXISTS`，与既有
   三表同式）：

   ```sql
   CREATE TABLE IF NOT EXISTS sessions(
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     model TEXT,
     sys TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   );
   CREATE TABLE IF NOT EXISTS messages(
     session_id TEXT NOT NULL,
     seq INTEGER NOT NULL,
     role TEXT NOT NULL,          -- 'user' | 'assistant'
     text TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     PRIMARY KEY(session_id, seq)
   );
   ```

3. **导出类型**：`export interface SessionRow { id: string; title: string; model: string | null; sys: string | null; created_at: number; updated_at: number }`；
   `export interface MessageRow { seq: number; role: 'user' | 'assistant'; text: string; created_at: number }`。
4. **prepared statements 追加**（`S` 对象 store.ts:69-82 类型声明 + initStore 内 store.ts:97-124）：
   - `insertSession: INSERT INTO sessions(id, title, model, sys, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)`
   - `listSessionsStmt: SELECT id, title, model, sys, created_at, updated_at FROM sessions ORDER BY updated_at DESC LIMIT ?`
   - `getSessionStmt: SELECT … FROM sessions WHERE id = ?`
   - `listMessages: SELECT seq, role, text, created_at FROM messages WHERE session_id = ? ORDER BY seq ASC`
   - `listRecentMessages: SELECT seq, role, text FROM messages WHERE session_id = ? ORDER BY seq DESC LIMIT ?`（送模历史截断取数）
   - `insertMessage: INSERT INTO messages(session_id, seq, role, text, created_at) VALUES(?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM messages WHERE session_id = ?), ?, ?, ?)`
     —— seq 由**单语句内子查询**自增（跨进程原子：双实例共用同一 DB 文件时语句级锁保证
     不重号；better-sqlite3 同步执行，进程内无交错窗口）
   - `touchSession: UPDATE sessions SET updated_at = ? WHERE id = ?`
5. **事务追加**（沿 txFirst/txEvent/txDeleteRun 三事务先例 store.ts:127-143）：
   `txAppendMessage = db.transaction((sessionId, role, text) => { insertMessage.run(...); touchSession.run(Date.now(), sessionId); })`
   —— 消息行与 sessions.updated_at 同步更新原子成立（PRD REQ-0016-01）。
6. **仓储函数追加**（全部同步、SQL 不出本模块）：
   - `createSession(doc: { title?: string; model?: string; sys?: string }): SessionRow`
     —— id=`crypto.randomUUID()`，title 缺省 `'新会话'`，model/sys 非 string 一律 null；
     created_at=updated_at=Date.now()；insert 后回读返回 SessionRow。
   - `listSessions(limit: number): SessionRow[]`
   - `getSession(id: string): SessionRow | null`
   - `getSessionDetail(id: string): { session: SessionRow; messages: MessageRow[] } | null`
     —— 复用 getSession + listMessages（messages 按 seq 升序）。
   - `appendMessage(sessionId: string, role: 'user' | 'assistant', text: string): void`
     —— txAppendMessage 包裹；本迭代无删除端点，sessionId 必存在（chat handler 已先
     getSession 判 404），无需 changes 判据。
7. **既有函数零改动**（workflows/runs 全部原样）。

### 3.2 `apps/server/src/sessions.ts`（新增，预算 ≤300 行；AGENTS.md 硬性约定 4 上限 400）

模块结构（自上而下）：

```ts
/* 头注：会话 = 与 run 正交的第一等资产；turn 事件不入 run_events（持久资产是
   messages 表）；模型调用经 providers 既有通道（不经 guard——与节点出站分立） */
imports: RequestHandler(express), crypto, streamText + ModelMessage(ai),
         getModel/providerInfo(providers.js), isAbort/sseWriteEvent/sseWriteComment(util.js),
         store 五函数, logger

/* 常量 */
const HISTORY_LIMIT = 20;        // 送模历史截断（PRD 需求 ⑤ 建议值，SPEC 定案 20；DB 全量不截断）
const SESSION_NODE_ID = 0;       // 合成节点 id（信封内恒 0）
const SESSION_TEMP = 0.7;        // 与 llm.ts:35 默认同值；本轮无 API 覆盖面
const SESSION_MAX_TOKENS = 2048; // 与 llm.ts:36 默认同值
const DELTA_EMIT_MS = 60;        // node:delta 节流（llm.ts:97 同值）
const PING_MS = 15000;           // 保活（server.ts:94 同值）

/* 会话活动 turn 注册表：sessionId → { ac }（与 runsById 同构；无 DB status 字段——
   进程崩溃后 DB 残留不可信，判活只认内存，server.ts:178-180 注释同教训） */
const sessionsById: Record<string, { ac: AbortController }> = Object.create(null);
```

**五个 handler（Express RequestHandler 形状，由 server.ts 注册；server.ts 不含会话逻辑）：**

1. `sessionsCreateHandler`：body `{ title?, model?, sys? }` 宽松解析（沿
   workflowsPutHandler server.ts:152-157 先例，不做 400 分支）→ `createSession` →
   **201** + SessionRow JSON。
2. `sessionsListHandler`：`limit` 校验与 runsListHandler server.ts:160-164 逐字同型
   （`Number(req.query.limit ?? 20)`，非整数或 ∉[1,100] → 400
   `{ error:'limit 必须是 1-100 的整数' }`）→ 200 `{ sessions: listSessions(n) }`。
3. `sessionDetailHandler`：`getSessionDetail(id)` null → 404
   `{ error:'session not found' }`；否则 200 `{ session, messages }`（messages 不含
   session_id 冗余列）。
4. `sessionStopHandler`：`const t = sessionsById[id]`；miss → 404
   `{ error:'session turn not found' }`（stopHandler server.ts:128 同语义：不区分
   「会话不存在」与「无活动 turn」）；hit → `t.ac.abort()` → 200 `{ ok:true }`。
5. `sessionChatHandler`（核心，步骤表——序号即实现顺序）：

| 步 | 动作 | 依据 |
| --- | --- | --- |
| ① | body.text 非 string 或 trim 空 → 400 `{ error:'body.text 必须是非空字符串' }`（先于存在性校验，沿 runHandler 先验 body 后验资源 server.ts:74 次序） | SPEC 补全（PRD 未明定，与 N01 同族；G 组断言） |
| ② | `const s = getSession(id)`；null → 404 `{ error:'session not found' }` | REQ-0016-02 ① |
| ③ | `if(sessionsById[id])` → 409 `{ error:'session turn is active' }`（server.ts:180 同型） | REQ-0016-02 ① |
| ④ | **同步闭合**：`const ac = new AbortController(); sessionsById[id] = { ac }`——①②③④ 之间零 await（better-sqlite3 同步），check-then-set 无 interleaving 窗口 | §5 竞态 |
| ⑤ | SSE 头（server.ts:76-82 六个头逐字同型）→ `send({type:'run:accepted', runId:turnId})` → 启动 ping interval | REQ-0016-02 ③⑦ |
| ⑥ | `appendMessage(id, 'user', text)` —— user 消息**先落库**（此时未写任何 node 事件） | REQ-0016-02 ② |
| ⑦ | `const model = getModel(s.model ?? undefined)`；null → **降级路径**：`log{lvl:'warn', msg:'⚠ 模型服务未配置，本轮回复终止'}` → `run:error{message:'模型服务未配置（'+providerInfo().note+'）'}` → `run:done`（§2.3 降级行）→ finally；assistant 不落库 | REQ-0016-02 ⑤；llm.ts:16-17 同文案 |
| ⑧ | 取历史：`listRecentMessages(id, HISTORY_LIMIT)`（seq DESC 取 20 → **反序**为 ASC）→ `ModelMessage[] = rows.map(r => ({ role: r.role, content: r.text }))`——**⑥已落库，历史天然含本轮 user 消息于末位，不再重复追加**。连续同 role（上轮降级/异常未落 assistant 所致）按原序送模，不合并——OpenAI 兼容端点通用接受，mock 与主流端点实测口径 | REQ-0016-02 ④；§4 端点表 |
| ⑨ | `send node:start`（§2.2 字段）→ `streamText({ model, system: s.sys \|\| undefined, messages, temperature: SESSION_TEMP, maxOutputTokens: SESSION_MAX_TOKENS, abortSignal: ac.signal, onError({error}){ lastErr = error } })`（system 独立参数——AI SDK 7 规约，llm.ts:64 注释同陷阱）→ `for await (d of result.textStream)`：`acc += d`，>60ms 节流 emit `node:delta`（llm.ts:94-99 同型） | REQ-0016-02 ⑥ |
| ⑩ | 循环正常退出：补发末次 `node:delta`；`text = acc`；`!text && lastErr` → 抛 `模型调用失败：…`；`!text` → 抛 `模型返回为空`（llm.ts:100-103 同型）→ 进入异常路径 | SPEC 定案 |
| ⑪ | 正常收尾：tokens 取 `await result.usage`（失败省略）→ `node:done`（§2.2：out=全文不截断）→ `log(ok)` → **`appendMessage(id,'assistant',text)` 先落库** → `run:done`（§2.3 正常行） | REQ-0016-02 ⑥ |
| ⑫ | catch(e)：`isAbort(e) \|\| ac.signal.aborted` → **停止路径**：acc 非空时 `appendMessage(id,'assistant',acc)` → `run:done`（§2.3 停止行）；否则 → **异常路径**：`run:error{message}` + `run:done`（§2.3 异常行） | REQ-0016-03；util.ts:24 isAbort |
| ⑬ | finally：`clearInterval(ping); delete sessionsById[id]; try{ res.end() }catch{}` —— 与 runHandler finally server.ts:117-122 逐字同型 | §5 竞态 |

   客户端断连语义：**不监听 req close**，turn 照常执行落库（runHandler 同语义；
   `sseWriteEvent` 内 try/catch 吞写失败 util.ts:17）——SPEC 定案并写入头注。

**shutdown 协作出口**（供 server.ts 调用，注册表不出模块）：
- `abortActiveSessions(): number` —— 遍历 `sessionsById` 逐个 `ac.abort()`（try/catch
  容忍已结束），返回数量；
- `activeSessionCount(): number` —— `Object.keys(sessionsById).length`。

### 3.3 `apps/server/src/server.ts`（233 行 → 预算 ≤260；diff 共三处）

1. **import 追加**（server.ts:33-36 import 块末）：
   `import { sessionsCreateHandler, sessionsListHandler, sessionDetailHandler, sessionChatHandler, sessionStopHandler, abortActiveSessions, activeSessionCount } from './sessions.js';`
2. **路由注册追加**（ADR-0007 删除端点段 server.ts:201-202 之后，仅 v1、无旧别名——
   ADR-0005 新端点先例 server.ts:193-202）：

   ```ts
   /* 迭代 0015 / BK-0016 会话端点：仅注册 v1（沿 ADR-0005：新端点无旧别名） */
   app.post('/api/v1/sessions', sessionsCreateHandler);
   app.get('/api/v1/sessions', sessionsListHandler);
   app.get('/api/v1/sessions/:id', sessionDetailHandler);
   app.post('/api/v1/sessions/:id/chat', sessionChatHandler);
   app.post('/api/v1/sessions/:id/stop', sessionStopHandler);
   ```

   （集合路由先于 `:id` 路由注册，路径互斥无冲突。）
3. **shutdown 扩展**（server.ts:212-231，两处）：
   - ② 中止段（server.ts:218-220）之后追加一行 `const sessionsAborted = abortActiveSessions();`
     （与 run 同批中止，触发各 turn 的停止路径 → 部分文本落库 → run:done(stopped) →
     finally 自清注册表）；'优雅停机开始' 日志行（server.ts:216）字段扩为
     `{ signal, activeRuns: active.length, activeSessions: sessionsAborted }`。
   - 宽限轮询条件（server.ts:222）由 `Object.keys(runsById).length` 扩为
     `Object.keys(runsById).length + activeSessionCount()`（同一 5s deadline 内收敛，
     REQ-0016-05）；未收敛 warn 行（server.ts:225-227）同法并入会话计数。

### 3.4 `tests/smoke/smoke-server.mjs`（386 行 → 预算 ≤690；SPEC 精确预算说明见 §7）

1. **断言 ID：G 组（G01-G10）**。PRD REQ-0016-06 写作 S01-S06，但 S01-S05 已被迭代 0002
   的「SSE 全事件链」占用（smoke-server.mjs:179-216 实查）——ID 唯一性是冒烟可审计性
   前提，**SPEC 定案改用 G 组编号**，映射见 §6 表。
2. **chatSse 本地 helper**（新增于 smoke-server.mjs 内，约 42 行）：lib.mjs 的
   `openSse` 硬编码 `/api/v1/run`（lib.mjs:127），会话需 POST `/api/v1/sessions/:id/chat`；
   **lib.mjs 不在 REQ-0016-07 白名单、零改动**（AC6 机器核对保白名单成立），故帧解析
   （`\n\n` 分帧 / `data: ` 前缀 / 注释行跳过）+ waitFor/waitEnd 逻辑以本地函数复制
   （语义与 lib.mjs:126-189 互逆一致）。
3. **mock 模型端点契约**（PRD「SPEC 要求」点名项；node:http 内联 ~48 行）：
   - 监听 `getFreePort()` 于 127.0.0.1；接受任何以 `chat/completions` 结尾的 POST 路径
     （`@ai-sdk/openai-compatible` 向 `${AI_BASE_URL}/chat/completions` 发流式请求）。
   - **分块与延时（确定性核心）**：`MOCK_FULL = '你好，我是会话冒烟助手。'` 拆
     `['你好，', '我是会话', '冒烟助手。']` 三块，块间延时 **400ms**（总流出 ≥800ms，
     为 G07 停止窗与 G08 并发窗留确定性时序；首块无延时——chat 发出后 ~即时可达）。
   - **响应格式**：OpenAI 兼容 SSE——逐块
     `data: {"id":"chatcmpl-mock","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":CHUNK},"finish_reason":null}]}\n\n`
     → 末块 `finish_reason:"stop"` → `data: [DONE]\n\n`；`Content-Type: text/event-stream`。
   - **请求记录**：每请求 body JSON 解析后压入数组（G06 断言第二轮请求 messages 含第一轮
     user/assistant 历史）。
   - **中止容忍**：客户端断开（stop abort）后 write 抛错 try/catch 吞掉；不 keep-alive。
4. **实例矩阵（三实例）**——startServer env 后置覆盖机制 lib.mjs:69-76 + config 空串归一
   config.ts:33-34（0005 SPEC §6.1 已验证手法）：

   | 实例 | env 注入 | configured（providers.ts:92-99） | 用途 |
   | --- | --- | --- | --- |
   | 主实例（既有 srv） | 既有 H 组 `{BOCHA_API_KEY:'',SEARXNG_URL:''}` | 宿主密钥决定 | G01-G03、G04：CRUD/404/limit 反例/stop 404，**零模型调用**（宿主密钥存在也不触网） |
   | mock 实例（新） | `{ AI_BASE_URL:mockUrl, AI_API_KEY:'smoke-mock-key', AI_MODELS:'MockChat:mock-model', AI_MODEL:'mock-model' }` | true（显式分支 providers.ts:36） | G05-G08：流式/续聊历史/停止/409 |
   | minimal 实例（新，SPEC 定案，见下） | `{ AI_BASE_URL:'', AI_API_KEY:'', AI_MODELS:'', AI_MODEL:'', AI_PROVIDER_NAME:'', DEEPSEEK_API_KEY:'', ZHIPU_API_KEY:'', OPENAI_API_KEY:'', MOONSHOT_API_KEY:'' }` | **false（确定）** | G09：降级路径 |

   **第三 minimal 实例定案（PRD 风险 3 授权 SPEC 定）**：**加**。理由：PRD S02 的主实例
   分支断言在宿主有密钥时永远走不到降级支，AC7 反演对降级路径不可演练；minimal 实例使
   降级路径**无条件确定**（全密钥空串压制 → resolveConfig 双分支皆不命中
   providers.ts:36,52-59 → configured=false）。**对 PRD 的两处定案调整**（均在风险 3
   预授权范围内）：①主实例不再发起任何 chat（原 S02 职责一分为二：降级→G09 minimal
   实例；正常→G05 mock 实例）——避免宿主真实密钥下冒烟触发真实模型调用（慢、费用、
   非确定）；②AI_MODELS/AI_MODEL 必须显式覆盖（宿主 .env 若配 AI_MODELS，与注入的
   AI_MODEL 交叉校验 config.ts:82-88 会 fail-fast 杀死 mock 实例——显式覆盖双键闭合）。
5. **残留纪律**（PRD 风险 1 固化）：会话无删除端点（PRD 非目标），G 组**一律按自身创建
   id 做存在性断言，不做全局计数**；会话行在本机 data/agentflow.db 累积（不入库、无
   契约面影响）；C 组零残留断言范围**不变**（仍只覆盖 workflows/runs）——会话不在其列，
   C 组代码零改动。mock/minimal 两子进程并入 doCleanup 的 kill 收尾（沿 C04 模式
   smoke-server.mjs:97-102，~10 行）。
6. **契约校验（AC5）**：G10 在 smoke-server.mjs 顶部
   `import { validateEvent } from '@agentflow/shared'`（workspace 根 node_modules 解析，
   package.json main `./dist/index.js`；`npm test` 前置 build:shared 已保证 dist 在位），
   对 G05 与 G07 捕获的全事件流**逐条 parse**，任一抛错即 FAIL。**边界例外声明**：
   lib.mjs 头注「不 import 任何产品代码」（lib.mjs:6-7）是迭代 0002 对**被测系统触达
   通道**的黑盒约束；shared 此处仅作**校验器**使用（events.ts:4 自述「用于测试与联调
   校验」），被测系统仍只经 HTTP 触达——本 SPEC 认定不构成实质背离，如实记录在案。

### 3.5 明确零改动清单

`apps/web/**`、`packages/shared/**`、`apps/server/src/{llm,engine,handlers,providers,config,util,types,guard,logger}.ts`、
`tests/smoke/lib.mjs`、`tests/smoke/mcp-stubs.mjs`、`tests/smoke/shutdown-sigterm.mjs`、
`tools/pixel-gate/**`、`tests/golden/**`、`.github/**`、根 `package.json`（AC6 白名单
机器核对口径 = 产品提交 git diff 仅 §3.1-3.4 四处）。

## 4 · 端点契约（五个，仅 /api/v1）

| # | 方法+路径 | 请求 | 成功应答 | 错误应答 |
| --- | --- | --- | --- | --- |
| 1 | `POST /api/v1/sessions` | `{title?, model?, sys?}`（宽松） | **201** SessionRow：`{"id":"uuid","title":"测试","model":null,"sys":null,"created_at":174…,"updated_at":174…}` | — |
| 2 | `GET /api/v1/sessions?limit=` | limit 1-100 默认 20 | 200 `{"sessions":[SessionRow…]}`（updated_at 倒序） | 400 `{"error":"limit 必须是 1-100 的整数"}` |
| 3 | `GET /api/v1/sessions/:id` | — | 200 `{"session":{…},"messages":[{"seq":1,"role":"user","text":"你好","created_at":…}]}`（seq 升序） | 404 `{"error":"session not found"}` |
| 4 | `POST /api/v1/sessions/:id/chat` | `{"text":"你好"}` | 200 SSE 流（§2.1 事件序） | 400 `{"error":"body.text 必须是非空字符串"}`；404 `{"error":"session not found"}`；409 `{"error":"session turn is active"}`（校验次序 400→404→409） |
| 5 | `POST /api/v1/sessions/:id/stop` | — | 200 `{"ok":true}` | 404 `{"error":"session turn not found"}` |

SSE 响应头与 `/api/v1/run` 逐字同型六头（server.ts:76-82）。示例事件流（正常路径）：

```
data: {"type":"run:accepted","runId":"0f1c…"}
data: {"type":"node:start","id":0,"title":"测试","iteration":null}
data: {"type":"node:delta","id":0,"text":"你好，"}
data: {"type":"node:delta","id":0,"text":"你好，我是会话冒烟助手。"}
data: {"type":"node:done","id":0,"title":"测试","out":"你好，我是会话冒烟助手。","ms":845,"tokens":18,"firePort":null,"iteration":null}
data: {"type":"log","lvl":"ok","msg":"✓ 会话回复 · 生成 18 tokens · 0.8s"}
data: {"type":"run:done","ms":846,"done":1,"total":1,"ok":true,"stopped":false,"outputs":["你好，我是会话冒烟助手。"]}
```

## 5 · 并发与竞态时序（PRD「SPEC 要求」点名项）

1. **409 守卫闭合**：chat handler 步骤①-④（400/404/409 校验 + 注册表写入）全部同步、
   零 await（better-sqlite3 同步 API），Node 单线程下 check-then-set 无窗口；首个 await
   出现在步骤⑨ streamText。SSE 头（步骤⑤）在注册表写入**之后**——409/404/400 走
   普通 JSON 应答，绝不半开 SSE。
2. **stop 与 turn 自然结束竞态**（PRD 风险 2）两分支皆合法：
   - stop 先到：注册表 hit → `ac.abort()` → for-await 抛 AbortError → §3.2 步⑫ 停止
     路径（isAbort util.ts:24 识别）→ acc 落库 → run:done(stopped)。
   - turn 恰已结束：finally（步⑬）先 `delete sessionsById[id]` 再 `res.end()`——
     stop 见注册表 miss → 404（与 stopHandler 对已结束 run 的 404 同语义，不算错误）。
     若 stop 在 finally 前一瞬 hit 但流已收尾：abort 对已完成的 streamText 是 no-op，
     turn 按正常路径收尾（ok:true），stop 应答仍 200——两应答均为合法终态。
3. **finally 删除语义**：`delete sessionsById[id]` 是注册表唯一出口（409 判据、stop 判据、
   activeSessionCount 三方共用）；置入唯一入口是 chat 步④。shutdown abort 后各 turn 经
   自身 finally 收敛——shutdown 只轮询不代删。
4. **shutdown 收尾顺序**（server.ts 扩展后）：① server.close 停新请求 → ② runs abort
   循环 + `abortActiveSessions()`（同批）→ ③ 宽限轮询 `runsById + activeSessionCount()`
   双清（5s deadline，100ms 间隔）→ ④ 未收敛 warn → ⑤ closeStore（WAL checkpoint）→
   ⑥ exit 0。会话停止路径的 acc 落库发生在 ②→③ 之间，store 关闭前完成——停机不产生
   孤儿消息（PRD 背景 2 对 server.ts:211-231 的扩展要求）。

## 6 · 冒烟断言清单（G 组；PRD S01-S06 → G01-G10 映射）

| ID | PRD 溯源 | 实例 | 断言（Then） |
| --- | --- | --- | --- |
| G01 | S01 前半 | 主 | POST /sessions `{title:'测试'}` → 201；id 非空 string、title==='测试'、model/sys===null、created_at/updated_at 为 number |
| G02 | S01 | 主 | GET /sessions → 200 列表含 G01 id；`limit=0` 与 `limit=101` → 400 `limit 必须是 1-100 的整数`（N02/N03 同型） |
| G03 | S01 后半 | 主 | GET /sessions/:id → 200 `{session.id===id, messages:[]}`；GET 不存在 id → 404 `session not found` |
| G04 | S03 | 主 | POST /sessions/:id/stop（无活动 turn）→ 404 `session turn not found`；**主实例全程零模型调用** |
| G05 | S04 | mock | chat `{text:'你好'}` → 事件序恰为 §2.1 正常行（run:accepted → node:start{id:0,iteration:null} → node:delta×≥1 且**末次 text===MOCK_FULL** → node:done{out===MOCK_FULL, firePort:null, iteration:null} → log{lvl:'ok'} → run:done{ok:true,done:1,total:1,outputs:[MOCK_FULL]}）→ 流收束；随后 GET :id → messages 恰 2 条 `[user '你好', assistant MOCK_FULL]`、seq 严格递增（1,2） |
| G06 | AC2 第三 When | mock | 第二轮 chat `{text:'再问'}` 完成后：mock 记录的**第二轮请求体** messages 含第一轮 user/assistant 历史且末位为 `{role:'user',content:'再问'}`；GET :id → messages 恰 4 条 |
| G07 | S05 | mock | 新会话 chat → waitFor 首个 node:delta（已累积 ≥1 块）→ POST stop → 200 {ok:true} → waitFor run:done{stopped:true, ok:false, done:0, total:1} → GET :id → assistant 消息非空且为 MOCK_FULL 的**前缀**（确定性：三块 ×400ms 流出未完即停） |
| G08 | S06 | mock | 会话 chat 流出中（waitFor node:delta）→ 同 session 二次 chat → 409 `session turn is active`；chat 不存在 session → 404 `session not found`；收尾：对活动会话 stop 清场 |
| G09 | S02（定案调整，§3.4-4） | minimal | chat → 事件序 `run:accepted → log{lvl:'warn'} → run:error → run:done{ok:false,done:0,total:1}` → GET :id → messages **恰 1 条 user**（assistant 不落库） |
| G10 | AC5 | —（离线） | G05 与 G07 捕获的全部事件逐条 `validateEvent(ev)` 通过（计数===流内事件数）；核对产品提交 `git diff` `packages/shared/**` 零改动（VERIFY 执行） |

**G 组非恒真证明（AC7 反演，VERIFY 演练）**：①临时注释 sessions.ts 正常路径的
`appendMessage('assistant',…)`（§3.2 步⑪）→ `npm run build:server && npm run
smoke:server` → G05「messages 恰 2 条」FAIL；②同样摘除停止路径落库（步⑫）→ G07
assistant 前缀断言 FAIL；还原 → 重建 → 复绿；`git status` 干净。两处各演练一轮。

## 7 · 行数预算（SPEC 精确口径；PRD 非功能 3 明示「SPEC 给精确预算」）

| 文件 | 现状（wc -l 本会话实查） | SPEC 预算 | 增量构成 |
| --- | --- | --- | --- |
| store.ts | 255 | **≤360** | DDL 14 + 语句 7 处 ~18 + 类型 8 + 函数 5 个 ~55 + 事务 6 + 头注 2 |
| sessions.ts | 0（新增） | **≤300**（硬上限 400 内自律） | 头注/导入 ~25 + 常量/注册表 ~14 + 五 handler（chat 为主 ~110，其余 ~45）+ shutdown 出口 ~10 + 组装/收尾辅助 ~20 |
| server.ts | 233 | **≤260** | import 2 + 注册 6（含注释）+ shutdown 5 |
| smoke-server.mjs | 386 | **≤690** | mock 端点 ~48 + chatSse ~42 + G01-G10 ~180 + 三实例 env/启动/kill ~30 + 头注更新 ~4 |

> 与 PRD 预估的差异：smoke-server.mjs PRD 粗估 ≤470，本 SPEC 定 **≤690**——差异来自
> PRD 未计入的 chatSse 本地 helper（lib.mjs 不可动的白名单约束所致，§3.4-2）与第三
> minimal 实例（§3.4-4）。测试编排文件非 AGENTS.md 硬性约定 4 的「新增源文件 ≤400」
> 对象（PRD 非功能 3 同口径）。其余三文件均在 PRD 预估内。

## 8 · 验收口径（BUILD 完成标准 = VERIFY 执行清单）

| 命令/点位 | 预期 | 对应 AC |
| --- | --- | --- |
| `npm run build`（shared+web） | 成功，零警告增量 | AC6 前置 |
| `npm run build:server` | tsc 成功（sessions.ts 新文件编译） | AC6 前置 |
| `npm run gate` | 8 场景全绿（纯回归面：零 UI 接触，本迭代不触碰 golden） | AC6 |
| `npm test`（shared 契约） | 全绿；`packages/shared/**` 零改动 | AC5 |
| `npm run smoke:server` | 既有 56 断言零回退（STATE 0014 基线）+ G01-G10 全过 | AC1-AC5 |
| `git diff` 白名单核对 | 产品提交仅 §3.1-3.4 四文件 | AC6 |
| 手动 E2E ① | `npm start` 后 curl `POST /api/v1/sessions`/`GET /api/v1/sessions`/`GET :id`（§4 表逐项走查，含 404/400） | AC1 |
| 手动 E2E ② | 配置真实密钥（server/.env）：`curl -N POST /api/v1/sessions/:id/chat` 可见流式 `node:delta` 增长；流中另一终端 `POST …/stop` → 流以 `run:done{"stopped":true,…}` 收尾；`GET :id` 见部分文本落库 | AC3 |
| 手动 E2E ③ | 活动 chat 流中 Ctrl+C 服务端 → 日志出现 `activeSessions` 计数与会话 abort、宽限期内退出码 0、`GET :id`（重启后）已累积文本在库 | REQ-0016-05 |
| AC7 反演 | §6 末段两轮红绿演练 + `git status` 干净 | AC7 |

## 9 · 回滚步骤（WORKFLOW §4 FAIL 上限路径）

1. `git revert <产品提交>`（唯一回滚手段，禁 force/reset）——四文件整体回退，smoke
   G 组随 tests 同提交一并 revert，既有 56 断言不受影响。
2. **DDL 幂等性说明**：data/agentflow.db 中已建的 `sessions`/`messages` 两表在回滚后
   留存——旧版 store.ts 的 DDL 不含两表也不读写它们，孤儿表零行为影响；`data/` 不入库
   （.gitignore 既有），必要时人工删除 data/agentflow.db 即全新库。两表下次随重新实现
   的 DDL `IF NOT EXISTS` 幂等复用。
3. 回滚后 `npm run build && npm run build:server && npm run smoke:server` 复绿确认。

## 10 · 风险定案与边界备忘

- **风险 1（双实例共享 SQLite）**：G 组按自建 id 断言（§3.4-5）；seq 单语句子查询自增
  跨进程原子（§3.1-4）；WAL 单写者串行化短事务，冒烟量级无锁竞争面。
- **风险 2（stop 竞态）**：§5-2 两分支定案，G07 只断言 stop 窗内确定性形态（三块延时
  400ms 保证）。
- **风险 3（宿主密钥）**：第三 minimal 实例定案加入（§3.4-4），主实例零模型调用。
- **风险 4（消息/run_events 混淆）**：sessions.ts 头注硬声明（§1）+ store.ts 两表零关联。
- **风险 5（server.ts 预算）**：handler 全部内聚 sessions.ts，server.ts 仅 +13 行
  （§7），无需 PRD 备选方案（handler 内联）——已按「server.ts 只留注册行」收敛。
- **会话行累积**：冒烟每次运行新增 ~6 会话行于本机 DB，无清理通道（删除端点为 PRD
  非目标）；可接受（不入库、无契约面），BK-9002 消费侧再议分页/清理。
