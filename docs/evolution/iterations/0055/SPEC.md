# 迭代 0055 · SPEC — BK-0044 PTY 会话后端运行时：pty 模块 + /api/v1/pty 端点族 + pty_audits + 三闸门生命周期

> 产物角色：spec-designer（SPEC 轮）· 2026-10-27 · 工作树 feat/0055-iter
> 输入：`iterations/0055/PRD.md`（M 项不免 SPEC）+ ADR-0014（权威定界，§7 BK-0044 块）
> + 迭代 0028 SPEC §8.4 + BACKLOG BK-0044 行 + 工作树代码亲核（本文全部 :行号锚点
> 为本 SPEC 会话在工作树内实读）。
> 消费方：code-developer（BUILD）→ test-manager（VERIFY）。

## 1. 输入、授权链与 npm 时效复核（PRD AC0 / ADR-0014 §5.6 义务兑现）

授权链（PRD §0 转述，本 SPEC 不复述其论证）：issue#14 用户批复（依赖 node-pty
^1.1.0 + env×4 + 残余风险知悉）+ ADR-0014（安全世界设计，草案态，实施轮消费）
+ BK-0043 done（迭代 0028）。**非修宪轮：golden 零接触、全程禁 `npm run
gate:update`、apps/web 与 packages/shared 零改动。**

**npm 时效复核（本 SPEC 会话亲跑，2026-10-27）**——ADR-0014 §5.6 快照逐项复验：

| 事实 | ADR-0014 §5.6 快照（2026-10-25） | 本 SPEC 复核（`npm view` 亲跑） | 结论 |
| --- | --- | --- | --- |
| node-pty 版本 | 1.1.0 | `version = '1.1.0'` | 一致 |
| 许可 | MIT | `license = 'MIT'` | 一致 |
| 运行依赖 | 单依赖 node-addon-api ^7.1.0 | `dependencies = { 'node-addon-api': '^7.1.0' }` | 一致，零新增 |
| install 面 | `node scripts/prebuild.js \|\| node-gyp rebuild` | `scripts.install` 逐字一致 | 一致 |
| engines | 无 | `npm view node-pty engines` 空输出（无 engines 声明） | 一致 |
| @xterm/xterm（BK-0045 消费，本轮不入） | 6.0.0 / MIT / 零依赖 | `version='6.0.0'` / `license='MIT'` / dependencies 空 | 一致 |

**结论：零偏航**——版本、依赖树、install 面、engines 全部与附录 A 批复射程内的
调研快照一致，无需中止上报；`@xterm/xterm` 复核一并记录（本轮零消费，授权留
BK-0045）。

## 2. 架构定案总览（全部「SPEC 定」项的定案与依据）

| # | 决策点（PRD/ADR 措辞） | 定案 | 依据/理由 |
| --- | --- | --- | --- |
| D1 | pty_audits 承载落点（store.ts 扩表 vs pty 模块自有仓储） | **pty 模块自有仓储 `apps/server/src/pty/audit.ts`**：同一主库文件 `data/agentflow.db` 的第二个 better-sqlite3 连接（WAL）；**store.ts 零改动** | store.ts 恰 400 行贴线（本会话 `wc -l` 亲核），扩表必同步拆分重构，违背「一次迭代只做一件事」；ADR-0014 §3.2-a 明示两案由实施 SPEC 定；SQL 出 store.ts 先例 = tools.ts 沙箱 sqlite（tools.ts:33/:41）；同进程 better-sqlite3 同步语义 + Node 单线程 ⇒ 双连接零交错竞争，audit 连接设 `busy_timeout=2000` 兜底 |
| D2 | PTY_ENABLED=0 拒绝码（须与 404 可区分） | **503** `{"error":"PTY 会话功能未启用（PTY_ENABLED=0）"}`（仅 create 端点判 flag） | ADR §4.1「503 语义——功能未启用」；list 不判 flag（禁用时活动集恒空，如实 200 空）；stream/write/stop 禁用态因无活动会话恒 404，天然可区分 |
| D3 | 会话数达上限拒绝码（429/409） | **429** `{"error":"PTY 并发会话数已达上限（PTY_MAX_SESSIONS=N）"}` | 409 保留给 agent 注入并发守卫（ADR §4.2 + sessions.ts:77 409 先例），两语义不混用 |
| D4 | origin='agent' 防伪造机制 | **通道分离**：HTTP write 端点仅接受 `origin='user'`，收到 `'agent'` → **403** + 审计 `kind='write-blocked'`（origin 如实记 'agent'）；agent 身份唯一入口 = pty 模块内部导出 API `agentWrite()`（服务端权威填写，零 HTTP 暴露） | ADR §3.1-a「agent 路径由服务端会话工具注入，前端不可伪造」；403 =「值合法但本通道无权」精确语义（400 已用于缺省/非法词形）；本轮 agent 消费方未接线（tools.ts 注册面 out of scope），内部 API 即 BK-0045/未来接线的消费面 |
| D5 | 环形缓冲/单帧/写入/摘要限幅数值 | RING_CAPACITY_BYTES=262144（256KiB/会话）/ FRAME_MAX_BYTES=32768（32KiB，超长 chunk 拆多帧按序发）/ WRITE_MAX_BYTES=16384（超限 400）/ SUMMARY_MAX_CHARS=256 / CLOSE_WAIT_MS=2000 / AGENT_ECHO_MS=500 | ADR §2.4 只定「存在」原则归 SPEC 定数值；量级对齐 tools.ts:34-35 限幅族与 read_file 200KiB 先例；最坏内存 = 16 会话 × 256KiB = 4MiB |
| D6 | PTY_IDLE_TIMEOUT_MS 下限 | **min 1000（1s）**，默认 600000 不变 | PRD AC5（=1000 必须有效）与 AC7（=500 必须拒绝）共同钉死边界；ADR §5.5 与 PRD REQ-0044-06 均为「如 ≥60000」**例示**措辞（数值归 SPEC）；60s 下限将使 AC5 法定超时测试慢 60×。**本项为对例示值的显式偏离，已在此显著标注**——默认值与语义不动，仅护栏数值定案，判定在附录 A 批准射程内（「下限护栏」语义本身已获批） |
| D7 | 冒烟载体 | **独立 `tests/smoke/pty-sessions.mjs`（P 组，≤400 行）+ 根 script `smoke:pty`**，不并入 smoke-server.mjs | PTY 组需专用探针实例（PTY_ENABLED=1 + 小数值超时 env 覆盖，lib.mjs:69 `startServer(port,{env})` 支持注入，Z 组探针实例先例 smoke-server.mjs:1750-1759）；smoke-server.mjs 已 1841 行（亲核）；独立文件使 145 断言基线零回退成为结构性保证（不触碰既有文件）；BK-0057 编排头注序列不受影响（独立入口） |
| D8 | 启动扫尾机制 | **审计对账式**：启动时对「有 create 行、无终局行（close/timeout）」的 session_id 逐个补 `kind='close', reason='sweep-stale', origin='system'` 行；**孤儿进程检测/击杀 v1 不实现，如实声明** | ADR §4.3-②「如按审计表开放记录打 stopped 标记 + 孤儿进程检测」为示例菜单；跨重启按记录 PID 击杀存在 PID 复用错杀风险（不制造伪安全，ADR §3.3-b 同款逻辑）；无孤儿主保障 = 优雅停机 kill+wait 双确认 + AC6 探针；崩溃场景孤儿为已声明残余（ADR §2.2 诚实面同口径）。create 行仍记录 pid 供 forensics 与探针机器锚点 |
| D9 | pty 模块内文件拆分 | 四文件：`session.ts`（生命周期/注册表/闸门/缓冲/内部 API）+ `routes.ts`（五端点+SSE+校验）+ `audit.ts`（DDL+语句+扫尾查询）+ `danger.ts`（危险模式清单，纯函数） | PRD §7「模块内拆分 SPEC 定」；单文件混合四关注点会逼近 400 行墙；danger.ts 独立使 AC4「源扫描证明命中处无拒绝分支」可机器核对 |

## 3. 模块规格 · `apps/server/src/pty/session.ts`（会话运行时）

### 3.1 会话对象与注册表

- 判活唯一源 = 模块级内存注册表 `ptyById: Record<string, PtySession>`（sessions.ts:36
  `sessionsById` 同构；ADR §4.3「DB/审计表只作事后审计不作判活源」——BK-0011 教训）。
- `PtySession` 状态字段：`sessionId`、`spawnAttempted: boolean`、`closed: boolean`
  （双标志，connection.ts:46-47 同构）、`createdAt`、`lastActivityAt`、`ring: Buffer`
  （环形缓冲，容量 RING_CAPACITY_BYTES，超容丢最旧）、`subscribers: Set<Response>`
  （SSE 扇出）、`agentInFlight: boolean`（agent 注入单飞守卫）、`proc`（node-pty
  句柄，spawn 失败时为 null）、`idleTimer` / `maxTimer` 句柄。
- **进程模型 = ADR §2.1 案 a**：create 时惰性 spawn 一个 PTY 子进程；会话关闭即进程
  收尾（kill + wait 双确认）。shell 选型：win32 → `process.env.COMSPEC ?? 'cmd.exe'`；
  POSIX → `process.env.SHELL ?? '/bin/sh'`；args `[]`；name `'af-pty-' +
  sessionId.slice(0,8)`；cols/rows 80×24（resize 端点不在本轮五端点面）；env 继承
  `process.env`（shell 需要 PATH 等；不注入额外变量）。
- **cwd 锚定**：`apps/server/sandbox/pty/<sessionId>/`，create 时惰性 `mkdirSync(
  {recursive:true})`。SANDBOX 根的路径解析式与 tools.ts:16 逐字同型（`dist/` →
  包根 `sandbox`），**不 import tools.ts 私有常量**（tools.ts 零改动，见 §9）；代码
  注释标注来源与「与 mcp-sqlite.db 异目录互不覆盖」（ADR §2.2）。
- **如实定级声明（必须落入代码头注）**：safePath 强制越界拒绝在 PTY 形态不可移植
  （shell 可 cd）——本模块安全强度 = 「初始 cwd 锚定 + 全量审计 + PTY_ENABLED 默认关」
  三层缓解，**不是** tools.ts safePath 同等强度；头注与日志不得宣称强制边界。

### 3.2 状态机与三闸门（ADR §4.1 六迁移，闭式实现）

```
[不存在] ──create(PTY_ENABLED=1 且 会话数<PTY_MAX_SESSIONS)──▶ active
active ──idle 超时(PTY_IDLE_TIMEOUT_MS 无输入输出)──▶ closed   (kind='timeout', reason='idle')
active ──最大时长(createdAt+PTY_MAX_SESSION_MS 硬顶)──▶ closed (kind='timeout', reason='max-duration')
active ──显式停止(POST stop)──▶ closed                        (kind='close',  reason='stop')
active ──优雅停机(abortActivePtySessions)──▶ closed            (kind='close',  reason='shutdown')
active ──PTY 子进程自然退出(onExit)──▶ closed                  (kind='close',  reason='exit')
closed = 终态，close 幂等
```

- idle 计时：`setTimeout(idleTimeoutMs)`；**每次有效写入（user/agent 任一通道）与
  每次 PTY onData 输出 chunk 均刷新**（重置计时器）。max 计时：create 时一次性
  `setTimeout(now + maxSessionMs - createdAt)`，不刷新。
- **close(session, reason) 唯一收尾出口**（六迁移共用）：①`closed` 已置位 → no-op
  （幂等，双触发无双 kill）；②置 `closed` → clearTimeout 双计时器 → ③`proc.kill()`
  （自然退出路径 proc 已死，kill no-op）→ ④等 `onExit` 事件至多 CLOSE_WAIT_MS
  （超时记 pino warn，kill 已发出视为收尾，不伪造退出码——exit 帧 code 可为 null）
  → ⑤向全部 subscribers 广播 `{t:'exit', code, reason}` 帧后 `res.end()` →
  ⑥审计行 → ⑦`delete ptyById[id]`。spawn 失败（catch 于 create 内）也走本出口
  （`spawnAttempted` 已置位、`closed` 未置位路径），防半开态。
- **run 正交**（sessions.ts:3 先例）：PTY 会话生命周期不随 run 绑定；`agentWrite`
  的 `signal` 中止只断本次注入调用（ADR §4.2），不断会话。

### 3.3 输出管道

- `proc.onData(chunk)`：追加环形缓冲（超容丢最旧）→ 按 FRAME_MAX_BYTES 拆帧 →
  向全部 subscribers 顺序写 `{t:'data', data}` 帧 → 刷新 idle 计时 → pino debug。
- 写入（user HTTP 与 agent 内部同径）：`proc.write(data)`（node-pty 写入天然串行，
  无需额外锁——ADR §4.2「BK-0044 实施 SPEC 复核」就此项复核成立：单线程事件循环 +
  同步 write 调用，无 interleaving 窗口，sessions.ts:66-77 同款论证）。

### 3.4 内部会话 API（服务端权威面，零 HTTP 暴露）

```ts
/** agent 注入唯一入口（origin='agent' 由本函数权威填写，外部不可伪造）。
 *  流程：会话判活（404 语义）→ agentInFlight 守卫（占用中 → 409 语义）→
 *  危险模式扫描（warn 帧广播 + 审计 danger 位，不拦截）→ proc.write →
 *  等待输出回显窗口 AGENT_ECHO_MS（收集窗口内 data，供 agent 观察 command 回声；
 *  signal abort 即时中断等待并返回已收集部分——级联只断本次调用不断会话）→
 *  清 agentInFlight → 返回 { echo, danger }。审计 kind='write', origin='agent'。 */
export function agentWrite(sessionId: string, data: string, opts?: { signal?: AbortSignal }):
  Promise<{ ok: true; echo: string; danger: boolean } | { ok: false; status: 404 | 409 | 400 }>
```

- 409 可测性：AGENT_ECHO_MS 窗口即真实 in-flight 区间，并发第二发必落守卫
  （AC3/PY4）；回显收集对 BK-0045 的 agent 工具接线是必需原语（观察命令输出），
  非 speculative（PRD 不做范围明示「本项只承载端点族与内部会话 API」——本 API 即
  该内部会话 API 的定案形态）。
- 其余导出：`createPtySession()`、`stopPtySession(id)`（幂等）、`listPtySessions()`、
  `ptyStreamAttach(id)`（routes 消费）、`abortActivePtySessions(): number` 与
  `activePtyCount(): number`（server.ts 停机链消费，sessions.ts:167-176 同型）、
  `sweepStalePtySessions()`（启动扫尾，server.ts 启动期调用，返回 `{count, ids}`——
  sweepDanglingRuns store.ts:340 同型）。

## 4. 端点契约 · `apps/server/src/pty/routes.ts`（五端点，v1-only）

沿 sessions 注册先例（server.ts:232-237）：仅注册 `/api/v1`，无旧别名。

### 4.1 `POST /api/v1/pty/sessions` → 201

- 前置：`config.ptyEnabled === false` → **503**（D2）；`activePtyCount() >=
  PTY_MAX_SESSIONS` → **429**（D3）。
- 行为：mkdir 会话目录 → spawn PTY → 注册表置入 → 审计 `kind='create',
  origin='system', pid=<proc.pid>` → `201 {"sessionId":"<uuid>"}`。
- spawn 失败（如 shell 缺失）：走 close 收尾（§3.2），应答 **500**
  `{"error":"PTY 会话创建失败：<原因>"}`，不留半开态。

### 4.2 `GET /api/v1/pty/sessions` → 200

- `{"sessions":[{"id","createdAt","lastActivityAt"}]}`（内存注册表快照，创建时间
  倒序）；禁用态恒 `{"sessions":[]}`（D2）。

### 4.3 `GET /api/v1/pty/sessions/:id/stream` → 200 SSE

- 判活：`ptyById` 无此 id（含已 closed 被删）→ **404 JSON**（不半开 SSE）。
- 建流：六头 SSE（sessions chat handler sessions.ts:82-88 同型）+ `ping` 注释保活
  15000ms → 首帧 `{t:'ready', sessionId, replayBytes}` → 环形缓冲按序回放
  `{t:'data'}` 帧 → 并入 subscribers 实时接收。多订阅者允许（扇出）。
- 会话关闭：收 `{t:'exit', code, reason}` 终帧后 `res.end()`；客户端断连仅自清
  subscriber（会话不受影响——turn 正交同语义）。

**SSE 私有帧格式（零 shared 契约，ADR §3.4 定稿；帧集 v1）**：

| 帧 | 载荷 | 时机 |
| --- | --- | --- |
| `{t:'ready', sessionId, replayBytes}` | 建流首帧，标记回放起点 | 流建立 |
| `{t:'data', data:string}` | 输出 chunk（回放与实时同型） | PTY 输出 |
| `{t:'warn', msg, origin}` | 危险模式警示（不拦截） | 命中清单 |
| `{t:'exit', code:number\|null, reason:'stop'\|'idle'\|'max-duration'\|'exit'\|'shutdown'}` | 终帧 | 会话关闭 |

序列化复用 `util.ts` `sseWriteEvent`/`sseWriteComment`（U+2028/2029 转义纵深防御
不重造）。**护栏**：实施中确需把上述帧类型加入 `RunEventSchema`（packages/shared）
即触 POLICY 需批准区，立即中止转 needs-approval（ADR §3.4、PRD §8）。

### 4.4 `POST /api/v1/pty/sessions/:id/write` → 200

- body：`{"data": string, "origin": 'user'}`。
- 校验序（全部先于任何 PTY 副作用）：判活 404 → `data` 非空 string 且
  `Buffer.byteLength(data) <= WRITE_MAX_BYTES`（16384）否则 **400** → `origin`
  缺省或非 `'user'`/`'agent'` 词形 → **400** → `origin === 'agent'` → **403**
  `{"error":"origin=agent 仅允许服务端内部通道"}` + 审计 `kind='write-blocked',
  origin='agent'`（D4 防伪造反例，AC3）。
- 通过后：危险模式扫描（§5 danger.ts；命中 → 广播 `{t:'warn'}` 帧 + 审计
  `danger=1`，**不拦截**）→ `proc.write(data)` → 刷新 idle → 审计 `kind='write',
  origin='user', summary=<前256字符>` → `200 {"ok":true, "danger":boolean}`。

### 4.5 `POST /api/v1/pty/sessions/:id/stop` → 200

- 判活：无活动 → **404**（sessions.ts:56-63 先例语义：不区分「不存在」与「已关闭」）。
- 行为：`close(reason='stop')` → `200 {"ok":true}`；重复 stop → 404（幂等由
  注册表删除自然成立）。未知 `:id` 的 write/stop/stream 一律 404（AC1）。

## 5. 审计仓储 · `pty/audit.ts` 与危险清单 · `pty/danger.ts`

### 5.1 pty_audits DDL（同库第二连接，D1）

```sql
CREATE TABLE IF NOT EXISTS pty_audits(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  origin TEXT NOT NULL,            -- 'user' | 'agent' | 'system'（ADR §3.2-a 值域）
  kind TEXT NOT NULL,              -- 'create' | 'write' | 'write-blocked' | 'close' | 'timeout'
  summary TEXT NOT NULL,           -- 摘要限幅 ≤SUMMARY_MAX_CHARS(256)，截断加 '…'
  reason TEXT,                     -- 可空细因：close→stop|shutdown|exit|sweep-stale；timeout→idle|max-duration
  danger INTEGER NOT NULL DEFAULT 0,  -- 危险模式命中标记位（REQ-0044-03）
  pid INTEGER,                     -- 仅 create 行：PTY 子进程 pid（探针/forensics 锚点）
  created_at INTEGER NOT NULL
);
```

- 字段族沿 approval_audits（store.ts:100-109：自增主键 + 可空 reason + created_at
  形态）；kind 前四值 = ADR §3.2-a 字面值域，`'write-blocked'` 为 SPEC 增补值
  （AC3 要求防伪造拦截留痕且「审计如实记录实际 origin」）。
- 连接生命周期：`initPtyAuditStore()`（server.ts 启动期、initStore 邻域调用）开
  连接 + `busy_timeout=2000` + DDL；`closePtyAuditStore()`（shutdown 链、
  closeStore 之前调用——时序保证停机 close 审计行先落库）。
- 写入容错：内部 catch + pino warn（recordApprovalAudit store.ts:385-393 同型），
  审计失败不阻断会话行为，如实记错。
- 查询面：`listOpenPtySessionIds()`（有 create 无终局行）供启动扫尾；冒烟直查
  （auditsOf 只读直查共享 SQLite 先例，smoke-server.mjs:15 V 组）。

### 5.2 危险模式固定清单（`pty/danger.ts`，只读不拦，ADR §3.3-a）

```ts
export const DANGER_PATTERNS: readonly RegExp[] = [
  /\brm\s+[^&|;]*?-[a-z]*r[a-z]*f/i,          // rm -rf 族
  /\bmkfs(\.\w+)?\b/i,                        // 格式化
  /\b(shutdown|reboot|halt|poweroff)\b/i,     // 关机/重启族
  /\bdd\s+[^&|;]*of=\/dev\/(sd|nvme|disk)/i,  // 裸写块设备
  /\bformat\s+[a-z]:/i,                       // Windows format 盘符
];
export function scanDangerous(data: string): string | null;  // 命中返回首个模式描述，否则 null
```

- **无任何拒绝分支**：命中仅产生 warn 帧 + pino warn + 审计 danger 位；AC4 源扫描
  断言 = danger.ts 及其调用处不存在「拒绝写入」路径（拦截清单/白名单 = ADR §3.3
  b/c 否决案，不得夹带）。
- 清单为固定字面量族（v1 不做配置化——配置面扩大属新决策，不在本轮授权内）。

## 6. 接线改动 · server.ts / config.ts / 依赖 / env 模板

### 6.1 `apps/server/src/server.ts`（+~15 行）

1. import 区 +pty 导入（routes 五 handler + session 的 abort/count/sweep/init/close）。
2. **启动序列**：`initStore()`（server.ts:83）之后 `initPtyAuditStore()` +
   `sweepStalePtySessions()`（sweepDanglingRuns server.ts:87 邻域同型，count>0 时
   logger.warn「启动扫尾：遗留开放 PTY 会话记录已标记 closed」）。
3. **路由注册**（v1-only 区 server.ts:229-243 邻域）+5 行：POST/GET
   `/api/v1/pty/sessions`、GET `…/:id/stream`、POST `…/:id/write`、POST
   `…/:id/stop`。
4. **头注活清单补行**（BK-0056 纪律）：端点注释块（server.ts:13-23 邻域）加一行
   pty 五端点与迭代号/BK 号（沿 workbench 行 server.ts:17-23 体例）。
5. **停机链**（server.ts:253-276）：`abortActiveSessions()`（:259）之后加
   `abortActivePtySessions()`（同批）；宽限轮询条件（:266/:269）与剩余计数
   （:270）并入 `activePtyCount()`；`closeStore()`（:274）之前加
   `closePtyAuditStore()`。

### 6.2 `apps/server/src/config.ts`（+4 key，~20 行）

- 白名单数组（config.ts:29-34）追加：`'PTY_ENABLED', 'PTY_IDLE_TIMEOUT_MS',
  'PTY_MAX_SESSION_MS', 'PTY_MAX_SESSIONS'`。
- EnvSchema（config.ts:51-74）追加：
  - `PTY_ENABLED`: `z.string().refine(TRUTHY/FALSY)`（ALLOW_PRIVATE_NET :58 同款）`.optional()`
  - `PTY_IDLE_TIMEOUT_MS`: `z.coerce.number().int().min(1000, '必须 ≥1000ms（防误配亚秒级）').optional()`（D6）
  - `PTY_MAX_SESSION_MS`: `z.coerce.number().int().min(1000).optional()`
  - `PTY_MAX_SESSIONS`: `z.coerce.number().int().min(1).max(16).optional()`
- **交叉校验**（loadConfig 内，E9 先例 config.ts:100-108 邻域）：两超时均配置且
  `PTY_MAX_SESSION_MS < PTY_IDLE_TIMEOUT_MS` → fail-fast，problems 指明两变量名与
  原因（「最大时长须 ≥ idle 超时」）。
- 返回体 flat 四键（:109-125 邻域）：`ptyEnabled: boolean`（默认 false）、
  `ptyIdleTimeoutMs: number`（默认 600000）、`ptyMaxSessionMs: number`（默认
  3600000）、`ptyMaxSessions: number`（默认 4）。
- 非法值 → 既有 fail 通道（config.ts:76-79）：`logger.fatal` + `process.exit(1)`，
  problems 指明变量名（AC7；MCP_HTTP_SERVERS superRefine :68-73 同型输出）。

### 6.3 依赖接入（REQ-0044-07）

- `apps/server/package.json` dependencies + `"node-pty": "^1.1.0"`（§1 复核一致）。
- 根 `package.json` allowScripts（:34-36）+ `"node-pty@1.1.0": true`（better-sqlite3
  同款纪律，ADR §5.2）；scripts + `"smoke:pty": "node tests/smoke/pty-sessions.mjs"`。
- `package-lock.json` 随 install 机械变化（+node-pty + node-addon-api 传递依赖；
  ADR §5.3 已声明 lock 变化——机械产物，如实入提交，非影响面扩大）。
- **native 面实测义务（BUILD）**：工作树内 `npm install` →（若被拦）`npm
  install-scripts approve node-pty` → `npm run build:server`，prebuild 命中即零编译、
  未命中回退源码编译（需 VS Build Tools；被墙按 PLAYWRIGHT_DOWNLOAD_HOST 镜像同域
  处置，AGENTS 已知陷阱）。**工作树注意（PRD §8）**：本轮为 v3 工作树模型首个
  native 依赖轮——node_modules 顶层链接主仓库，install/approve/rebuild 须在工作树
  内完成并验证 dist 可跑；链接形态阻碍安装时如实上报协调者，不得转为主干安装。

### 6.4 `apps/server/.env.example`（REQ-0044-09，PRD 增补项）

「── 可选 ──」段（:15-21）追加四条纯注释行（BK-0059 先例，零运行时行为）：

```
# PTY_ENABLED=0             # PTY 会话功能总开关（默认 0 关；启用主权在运维，ADR-0014）
# PTY_IDLE_TIMEOUT_MS=600000    # PTY 会话 idle 超时（ms，下限 1000）
# PTY_MAX_SESSION_MS=3600000    # PTY 会话时长硬顶（ms，须 ≥ idle 超时）
# PTY_MAX_SESSIONS=4        # PTY 并发会话数上限（1-16）
```

## 7. 冒烟断言组 · `tests/smoke/pty-sessions.mjs`（P 组，载体=D7）

独立文件 + `npm run smoke:pty` 入口；探针实例 = `startServer(port, {env})`
（lib.mjs:69-73）；内部 API 直连 = import `apps/server/dist/pty/*.js`
（mcp-transport.mjs dist 直连先例，:8-10）；审计直查 = better-sqlite3 只读开主库
（V 组 auditsOf 先例）。**编排：fail-fast + finally 清理 + 汇总行
`==== smoke:pty：X passed / Y failed ====`（smoke-server.mjs 体例）**。

| 组 | 断言（给定/当/则要点） | 实例 |
| --- | --- | --- |
| PY0 | dist/pty/*.js 在位（缺失 FAIL 并给补建命令） | — |
| PY1 | 默认 env：create → 503 + error 文案含「未启用」；list → 200 空集；主库 pty_audits 零行 | 主实例 |
| PY2 | PTY_ENABLED=1：create → 201 {sessionId}；`sandbox/pty/<id>/` 目录在；审计 create 行（origin=system、pid 数值在）；list 含 id | 探针 A |
| PY3 | stream 建流收 ready 帧；write user `echo hi\r` → 200 → data 帧含 'hi'（顺序回放）；审计 write 行 origin=user；`agentWrite` 直连 → {ok,echo 含回声} + 审计 origin=agent | 探针 A |
| PY4 | write origin 缺省/`'bob'` → 400；HTTP origin='agent' → 403 + 审计 write-blocked 行（origin=agent 如实）；并发 agentWrite ×2 → 第二发 ok:false status=409；data >16KiB → 400 | 探针 A |
| PY5 | write `rm -rf ./x` → 200 {danger:true}；warn 帧到达；审计行 danger=1；**透传不拦截**（后续输出帧仍推进） | 探针 A |
| PY6 | stop → 200；流收 exit 帧（reason='stop'）；再 stop → 404；未知 id 三端点 → 404；pid 探针：create 行 pid 已消亡（win32 tasklist/Win32_Process、POSIX ps） | 探针 A |
| PY7 | IDLE=1000：静置 ~1.5s → list 空 + 审计 kind='timeout' reason='idle' + exit 帧 reason='idle' | 探针 B |
| PY8 | IDLE=60000 MAX=2000 + 每 400ms keep-alive 写 → ~2s 关闭 kind='timeout' reason='max-duration'（max 先于 idle 兑现） | 探针 B |
| PY9 | MAX_SESSIONS=1：首会话 create 201 → 第二 create → 429 | 探针 C |
| PY10 | env fail-fast ×5：IDLE=500 / SESSIONS=0 / SESSIONS=17 / ENABLED=maybe / MAX=1000<IDLE=2000 → 各自 spawn 启动 exit≠0 + stderr fatal 含变量名 | 快速失败 spawn |
| PY11 | 停机演练：win32 = dist 直连对活动会话调 `abortActivePtySessions()` → close 行 reason='shutdown' + exit 帧广播（**模块级演练，如实标注**）；SIGTERM 真路径归 smoke:shutdown（CI ubuntu 权威，0012/0016 先例） | 探针 A |
| PY12 | 全组收尾：主库全部 create 行 pid 均已消亡（无孤儿，BK-0028 Win32_Process 探针先例） | — |

- **断言计数口径**：既有 `npm run smoke:server` **145/0 零回退**（独立文件结构性
  保证）+ P 组新增断言数以 VERIFY 实跑为准（预估 30-40），新总数写入 MERGE 收口
  （PRD REQ-0044-08）。

## 8. 手动 E2E 点位（AC9 兑现，七点位；真实/演练如实标注）

| # | 点位 | 步骤与预期 | 形态 |
| --- | --- | --- | --- |
| M1 | 未启用拒绝 | 默认 env 启动 → `curl -X POST :3000/api/v1/pty/sessions` → 503；任务管理器零新增 shell | 真实 |
| M2 | 创建与锚定 | PTY_ENABLED=1 启动 → create 201 → `apps/server/sandbox/pty/<id>/` 存在 → list 含 id | 真实 |
| M3 | 用户写入流回放 | `curl -N :3000/api/v1/pty/sessions/<id>/stream`（观察 ready/data 帧）→ 另终端 write `{data:"echo hi\n",origin:"user"}` → 流按序回放含 'hi' → sqlite 直查 pty_audits write 行 | 真实 |
| M4 | 防伪造反例 | write origin='agent' → 403；pty_audits 出现 write-blocked 行（origin='agent'） | 真实 |
| M5 | 危险警示不拦截 | write `rm -rf ./tmp-x` → 200 + 流收 warn 帧 + 审计 danger=1；命令透传（输出照常） | 真实 |
| M6 | 显式停止与幂等 | stop → 流 exit 帧（reason='stop'）→ 复 stop 404 → 任务管理器该 pid 消失 | 真实 |
| M7 | 超时与停机级联 | IDLE=1000 实例静置 → 自动 closed（审计 timeout/idle）；活动会话下 Ctrl+C（SIGINT）→ 停机日志含 PTY 收尾 + 无孤儿 shell；SIGTERM 权威归 CI（smoke:shutdown，win32 自动 SKIP） | 超时=真实；停机=win32 SIGINT 真实观察 + CI 权威补背书 |

## 9. 受影响文件清单（AC0 VERBATIM 对照载体）

| 文件 | 动作 | 行数预算 | BACKLOG BK-0044 行对照 |
| --- | --- | --- | --- |
| `apps/server/src/pty/session.ts` | 新增 | ≤400（估 ~260） | ✔「session.ts 会话管理+注册表判活+三闸门超时」 |
| `apps/server/src/pty/routes.ts` | 新增 | ≤400（估 ~220） | ✔「routes.ts 端点族五端点…流走端点私有事件面零 shared 契约」 |
| `apps/server/src/pty/audit.ts` | 新增 | ≤400（估 ~140） | ✔「audit 仓储」（承载落点本行括注「实施 SPEC 定」→ D1 定案 pty 自有） |
| `apps/server/src/pty/danger.ts` | 新增 | ≤400（估 ~40） | ✔「模块内拆分 SPEC 定」授权内 |
| `apps/server/src/server.ts` | +~15 行 | — | ✔「路由注册与停机出口并入（abortActivePtySessions 同批 + 启动扫尾沿 BK-0011 形态）」+头注行（BK-0056） |
| `apps/server/src/config.ts` | +~20 行 | — | ✔「+4 env 白名单与 zod」+交叉校验（E9 先例） |
| `apps/server/package.json` | +1 依赖 | — | ✔「apps/server/package.json +1 依赖」node-pty ^1.1.0 |
| `package.json`（根） | +2 行 | — | ✔「package.json allowScripts +node-pty」+smoke:pty script 行 |
| `package-lock.json` | 机械变化 | — | install 机械产物（ADR §5.3 声明在案；如实入提交，非影响面扩大） |
| `apps/server/.env.example` | +4 注释行 | — | ✔ REQ-0044-09（**PRD 增补项**，ADR §7 索引外显式标注，不计漂移） |
| `tests/smoke/pty-sessions.mjs` | 新增 | ≤400（估 ~380） | ✔「tests/smoke pty 断言组」（载体=独立文件，D7） |
| `docs/adr/0014-pty-terminal-security-world.md` | 状态行（CLOSE 时） | — | REQ-0044-10：本轮代码轮不动，CLOSE 时按 ADR-0010/0012 先例收口 + §5.6 时效复核纪要回写（本 SPEC §1 记录供回写） |
| **零改动承诺（恒空面）** | — | — | `store.ts`（D1 定案不落此——BACKLOG 行「承载落点实施 SPEC 定」括注兑现）· `apps/web/**` · `packages/shared/**` · `tools/pixel-gate/**` · `tests/golden/**` · `.github/**` · `guard.ts` · `tools.ts` · `tests/smoke/smoke-server.mjs`（D7 独立载体） |

> AC0 对账说明：BACKLOG BK-0044 行受影响文件字面与本表逐项对照一致；两处 SPEC
> 定案行使（audit 落点=pty 自有、冒烟载体=独立文件）均由行内既有括注
> （「承载落点实施 SPEC 定」）与 PRD §7 表（「仅当扩表落此」「载体 SPEC 定」）授权，
> 不构成漂移；REQ-0044-09 增补按 PRD 显式标注处理。

## 10. 验收口径（BUILD/VERIFY 统一命令面）

> 基线（迭代 0054 收口）：gate **18 场景 s0~s17**（本会话亲数
> `tests/golden/ui/*.invariants.json` = 18 确认）/ npm test **30/30** /
> smoke:server **145/0**。

1. `npm run build`（含 build:shared+build:web 前置链；native 面 = §6.3 工作树内
   install/approve/rebuild 实测）→ exit 0。
2. `npm run gate` → 18 场景 diffPx=0（纯后端零波及实测；若现 s3-library
   diffPx≈23 本机采样抖动形态（issue#12 在案，0037~0054 先例），按 rerun/CI 权威
   口径处置，**不得消费 gate:update**）。
3. `npm test` → 30/30（shared 契约零新增 = PTY 帧不进 RunEventSchema 的机器证明）。
4. `npm run smoke:server` → 145/0 零回退。
5. `npm run smoke:pty` → P 组全绿（新断言数实跑记录，MERGE 收口写总数）。
6. 手动 E2E：§8 M1~M7 逐点位（真实/演练如实标注进 REPORT）。
7. **零改动机器证明**：`git diff` 对 apps/web/**、packages/shared/**、
   tools/pixel-gate/**、tests/golden/**、.github/**、guard.ts、store.ts、tools.ts
   恒空；全程 `gate:update` 零消费（AC8）。
8. CI 盯守（AC10，推送后义务）：contracts job 含 node-pty native 安装编译面首次
   接入实测；ui-constitution 18 场景全绿（零 golden 接触，预期零变化；红则按
   WORKFLOW §6 处置）。

**中止条件（PRD §8 铁律，逐字有效）**：确需 PTY 事件进 RunEventSchema / 新增
node-pty 与 @xterm 之外依赖 / 新增出站网络目标 / store 拆分波及既有表行为——
立即中止转 needs-approval/上报。SPEC 补充中止面：危险清单演化出拦截/白名单分支；
agent 注入需要 HTTP 通道直达（破坏 D4 防伪造模型）。

## 11. 不做范围（PRD §3 字面复述，实施不得越界）

BK-0045 全部（终端节点 UI / @xterm/xterm 接入 / DEFS 终端节点 / gate 场景增量）；
PTY 事件进 RunEventSchema；命令拦截清单或白名单模式；池化/复用/共享单 shell；
agent 侧 MCP 工具接线（tools.ts 注册面）；guard.ts 改动；新增出站网络目标；
跨平台特判（node-pty 已抹平）；pty_audits 查询端点（本轮无 HTTP 查询面，直查仅
冒烟/运维）；会话目录自动清理（用户资产，策略另议）。

## 12. 架构决策判定（needsAdr）

**本轮无需新 ADR**：全部架构决策（D1~D9）均为 ADR-0014 / PRD 明文委托给
「BK-0044 实施 SPEC」的定案项，且 npm 时效复核零偏航（§1）——授权链（issue#14 +
ADR-0014 + BK-0043 done）完整覆盖依赖/env/残余风险面。ADR-0014 状态行收口属 CLOSE
时点义务（REQ-0044-10），非本轮产物。
