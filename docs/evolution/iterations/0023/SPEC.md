# SPEC · 迭代 0023 · BK-0028 真 MCP client 传输层（stdio / Streamable HTTP）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 00:52
> 输入：`iterations/0023/PRD.md`（全文 read）+ ADR-0012（全文 read）+ 代码现状（本会话只读核实）。
> 定界权威：PRD「目标与范围」= ADR-0012 §8 BK-0028 段；本文与 ADR 冲突以 ADR 为准，
> 与 PRD 冲突以 PRD 为准（PRD 已声明对 ADR 的从属关系）。
> 结论先行：**SDK 时效复核全部通过（§2），ADR-0012 选型维持，`needsAdr=false`**
> （无新架构决策；ADR §4 悬置的「v2 fetch 注入点」以实测存在收口，回退案不启用）。

## 1. 代码现状基线（本会话 2026-10-25 只读核实）

| 事实 | 证据 |
| --- | --- |
| `apps/server/src/` 现有 17 个 .ts，无 mcp/ 目录 | `ls` 亲核（approval-review/code/config/engine/expr/guard/handlers/kb/llm/logger/providers/search/server/sessions/store/tools/types/util） |
| apps/server 依赖七项、无 MCP SDK；`"type":"module"` 在 :5；zod floor `^3.24.0` 在 :18 | `apps/server/package.json:11-19` Read 亲核 |
| tsconfig `module/moduleResolution: NodeNext`、outDir dist、rootDir src | `apps/server/tsconfig.json:4-7` Read 亲核 |
| 超时先例：fetch 15s / download 20s（tools.ts:46,:51）、bocha 15s / ddg 12s / searxng 12s（guard.ts:77,:85,:99） | Read 亲核 |
| `guardedFetch(rawUrl: unknown, opts: RequestInit = {}): Promise<Response>`（guard.ts:59-62） | Read 亲核（§3.2 注入面兼容性依据） |
| 冒烟基建先例：进程内 node:http mock（smoke-server.mjs:88-139 startMockModel）；独立冒烟文件先例（mcp-stubs.mjs 133 行 / shutdown-sigterm.mjs 185 行）；lib.mjs 导出 Checker 等（smoke-server.mjs:26-29 引用面） | Read 亲核；`wc -l` 亲核（lib 245 / mcp-stubs 133 / shutdown 185 / smoke-server 947） |
| 代码节点子进程+超时先例：spawn argv 数组、5s 定时 kill | `apps/server/src/code.ts:50-53` Read 亲核 |
| 工作区干净（仅存量 STATE.md 与本迭代目录变更） | `git status --porcelain` 本会话亲核输出仅 ` M docs/evolution/STATE.md` + `?? docs/evolution/iterations/0023/` |

## 2. SDK 时效复核记录（REQ-0023-01 · 2026-10-25 00:44~00:52 本会话执行）

方法：`npm view @modelcontextprotocol/client`（registry 元数据）+ `npm pack
@modelcontextprotocol/client@2.4.0` / `@modelcontextprotocol/core@2.4.0` 拉 tarball
至临时目录逐项读 dist 类型声明与运行时 schema（临时目录已清理；期间曾因 shell cwd
重置执行过一次 `npm install --no-save`，已 `git status` 复核工作区未受污染——
package-lock 无 diff、repo node_modules 无 @modelcontextprotocol）。

| # | ADR-0012 论断 | 复核结果（2026-10-25） | 判定 |
| --- | --- | --- | --- |
| V1 | `^2.4` 为当前主线版本 | `npm view`：version=2.4.0=dist-tags.latest，registry 最后修改 2026-10-23T18:21Z | ✅ 维持 |
| V2 | node ≥20 / Apache-2.0 / 无 peerDependencies | engines.node=`>=20`；license=Apache-2.0；peerDependencies 缺省（无） | ✅ 维持 |
| V3 | 直接依赖恰 7 项 | zod ^4.2.0 / jose ^6.1.3 / cross-spawn ^7.0.5 / eventsource ^3.0.2 / pkce-challenge ^5.0.0 / eventsource-parser ^3.0.8 / @modelcontextprotocol/core 2.4.0（pin 精确版） | ✅ 逐项一致 |
| V4 | ESM-only | tarball package.json `"type":"module"`（实际双产物 .mjs+.cjs，ESM 消费面成立，比 ADR 论断更宽） | ✅ 维持 |
| V5 | **v2 `StreamableHTTPClientTransport` 自定义 fetch 注入点（ADR §4 明示未决）** | **实存**：`StreamableHTTPClientTransportOptions` 含 `fetch?: FetchLike`（文档注释 "Custom fetch implementation used for all network requests"）与 `requestInit?: RequestInit`（tarball dist/index.d.mts:2268-2417；构造签名 `constructor(url: URL, opts?: StreamableHTTPClientTransportOptions)` 在 :2418） | ✅ **收口：注入点存在，回退案（guardedFetch 直包 / 降级 v1）不启用** |
| V6 | FetchLike 与 guardedFetch 兼容（BK-0030 前向） | `FetchLike = (url: string \| URL, init?: RequestInit) => Promise<Response>`（dist/index-BCNZS4Ap.d.mts:1649）；guardedFetch 参数 `(rawUrl: unknown, opts: RequestInit = {})` 结构可赋值（参数逆变：unknown ⊇ string\|URL） | ✅ BK-0030 可直接注入 |
| V7 | stdio 直 spawn（argv 数组、无 shell 拼接） | `StdioClientTransport` 构造参数 `StdioServerParameters = { command: string; args?: string[]; env?; stderr?; cwd?; maxBufferSize? }`（dist/stdio.d.mts:8-52，构造 :62）——**API 面不存在任何 shell 选项**；另实得 `get pid(): number \| null`（:96-100）可为孤儿断言所用 | ✅ 维持（+pid 增益） |
| V8 | connect() 内含 initialize 握手 | `connect(transport, options?: ConnectOptions): Promise<void`，文档注释 "performs the MCP initialization handshake"（dist/client-BTIWJvaF.d.mts:703） | ✅ 维持 |
| V9 | terminateSession 拆链 | `terminateSession(): Promise<void>`（dist/index.d.mts:2512，DELETE 请求；文档注明 server 可 405 拒绝） | ✅ 维持（405 容忍进 §3.4 语义） |
| V10 | 超时/abort 机制 | `RequestOptions`：`signal?: AbortSignal`（中止→AbortError）、`timeout?: number`（超时→`SdkError` code `REQUEST_TIMEOUT`）、`maxTotalTimeout`；`ConnectOptions`/`CacheableRequestOptions`/`CallToolRequestOptions` 均扩展自 RequestOptions（connect/listTools/callTool 三面全支持）；SDK 默认 `DEFAULT_REQUEST_TIMEOUT_MSEC = 60000`（dist/index-BCNZS4Ap.d.mts:1815）——本层恒显式传 timeout，SDK 默认不生效 | ✅ **SDK 原生支持，包装层直传不自制定时器** |
| V11 | Tool 形状（冒烟断言面） | core@2.4.0 `ToolSchema`：`name: string`（必填，BaseMetadataSchema）、`description?: string`、`inputSchema: { type:"object"; properties?; required? }`、`outputSchema?`、`annotations?`（core dist/schemas-DscsoNZN.mjs 亲核） | ✅ 断言面 = name/description/inputSchema |
| V12 | 导出子路径 | exports map 实有 `.`（Client、StreamableHTTPClientTransport、SSEClientTransport、FetchLike、SdkError/SdkErrorCode 等）与 `./stdio`（StdioClientTransport、StdioServerParameters、getDefaultEnvironment） | ✅ NodeNext 下 `@modelcontextprotocol/client/stdio` 子路径导入可用 |

**复核结论**：ADR-0012 §4 选型（案 A · client 拆分包 ^2.4）与 §8 模块划分全部成立，
无需升级回协调者处置；唯一悬置项（V5）以「注入点存在」正向收口。

## 3. 技术方案

### 3.1 `apps/server/src/mcp/connection.ts`（新增 · ≤200 行）

统一连接抽象 = 接口 + 基类封装：

```ts
import type { Client, Transport } from '@modelcontextprotocol/client';

export interface McpToolInfo { name: string; desc: string; inputSchema: Record<string, unknown> }

export interface McpConnection {
  readonly serverId: string;
  connect(timeoutMs?: number): Promise<void>;                                   // SDK connect() 内含 initialize 握手
  listTools(timeoutMs?: number): Promise<McpToolInfo[]>;                        // { name, desc, inputSchema }（V11 断言面）
  callTool(name: string, args: Record<string, unknown>, timeoutMs?: number, signal?: AbortSignal): Promise<unknown>;
  close(): Promise<void>;
}
```

- **与 ADR §3 草图的关系**：五面字面一致；唯一扩展 = `callTool` 增可选第 4 参
  `signal`（AC5「callTool 进行中 abort」的承载面；SDK RequestOptions.signal 原生
  支持，V10）。前三个参数签名与草图逐字兼容，属可选参扩展而非改面。
- **默认超时常量**（模块内 const，不导出）：`CONNECT_TIMEOUT_MS = 10_000`
  （connect 与 listTools 共用，ADR §6.1）、`CALL_TIMEOUT_MS = 30_000`。实现 =
  把 `timeout: timeoutMs ?? 默认值` 直传 SDK（V10），**不自制
  AbortSignal.timeout 合成**——SDK 原生 `RequestOptions.timeout` 超时抛
  `SdkError(code=REQUEST_TIMEOUT)`，如实向外抛出不伪造结果（沿 tools.ts:4-5
  原则）。SDK 自身 60s 默认（V10）因恒显式传值而不生效。
- **callTool 返回值**：SDK `CallToolResult`（`{ content, isError?, … }`）**原样
  透传**（返回类型 unknown）；content 解包语义归 BK-0030 动态 impl 决定，本层
  不做取值面承诺。
- **基类 `BaseMcpConnection`**：持有 `serverId` 与 SDK `Client` 实例
  （`clientInfo = { name: 'AgentFlow', version: '1.0.0' }` 模块常量——静态身份
  标识，刻意不读 package.json 版本以免引入文件读取面；冒烟 MT01 断言
  clientInfo.name 透传）。子类经构造注入 `Transport`；protected 空默认
  `teardown(): Promise<void>` 钩子供 HTTP 覆写（§3.2）。
- **close 语义（幂等可重入，非功能 3）**：首次 close = `await teardown()` →
  `await client.close()`；此后任何 close() 直接 resolve 不抛错；未 connect 过的
  连接 close 同样为无抛 no-op。
- **行数预估**：~130-160 行（含注释），预算 ≤200 达标。

### 3.2 `apps/server/src/mcp/http.ts`（新增 · ≤150 行）

```ts
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { FetchLike } from '@modelcontextprotocol/client';

export interface HttpMcpOptions {
  fetch?: FetchLike;          // BK-0030 将注入 guard 的 mcpFetch；本轮生产默认 undefined（SDK 全局 fetch）
  requestInit?: RequestInit;  // 透传 SDK（如自定义 headers）
}
export function createHttpMcpConnection(serverId: string, url: string | URL, opts?: HttpMcpOptions): McpConnection;
```

- **fetch 注入设计（BK-0030 前向兼容的承载面，V5/V6）**：构造
  `new StreamableHTTPClientTransport(new URL(url), { fetch: opts?.fetch,
  requestInit: opts?.requestInit })`。**本轮不 import guard.ts**——注入点是
  参数而非硬编码，BK-0030 落地 `mcpFetch` 时以 `createHttpMcpConnection(id,
  url, { fetch: mcpFetch })` 完成收口，本文件零改动（开闭）。冒烟 MT05 以计数
  wrapper 证明注入点真实生效。
- **teardown 覆写** = best-effort `transport.terminateSession()`（try/catch
  吞错——协议允许 server 405 拒绝，V9；网络错误同忍），随后基类执行
  `client.close()`。terminateSession 失败不阻断 close。
- **行数预估**：~70-90 行，预算 ≤150 达标。

### 3.3 `apps/server/src/mcp/stdio.ts`（新增 · ≤150 行）

```ts
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';   // NodeNext 子路径（V12）

export interface StdioMcpOptions {
  env?: Record<string, string>;   // 不传 → SDK getDefaultEnvironment()（安全子集，stdio.d.mts 导出）
  cwd?: string;
  stderr?: 'inherit' | 'pipe' | 'ignore';
}
export function createStdioMcpConnection(serverId: string, command: string, args?: string[], opts?: StdioMcpOptions): McpConnection;
```

- **argv 直传、零 shell**：构造 `new StdioClientTransport({ command, args: args
  ?? [], env?, cwd?, stderr? })`——SDK API 面无 shell 选项（V7），本文件亦不出现
  任何 shell 形态字样（AC8 由冒烟 MT12 源扫描机器断言）。
- **本轮不读 env、不接配置**：command/args 为调用方（本轮=冒烟测试）传入的
  字面量；「白名单来源 = 注册表本身」的 env 语义面归 BK-0029（PRD 不做清单 1）。
- **进程生命周期**：close = 基类 `client.close()`（SDK 负责结束子进程），
  本文件不加自定义 kill 逻辑；run 级生命周期绑定归 BK-0029/0030 消费侧。
- **测试探针面**：具体类在 McpConnection 最小面之外增 `get pid(): number |
  null`（透传 SDK transport.pid，V7）——冒烟 MT09 孤儿断言的数据源；非接口
  承诺，生产代码不得依赖。
- **行数预估**：~60-80 行，预算 ≤150 达标。

### 3.4 依赖引入（AC1）

- `apps/server/package.json` dependencies 增一行
  `"@modelcontextprotocol/client": "^2.4"`（保持字典序插入）；`npm install`
  机制性同步根 `package-lock.json`。zod 嵌套共存（本仓 3.25.76 / SDK 内部
  ^4.2.0）无 peer 违例（V2/V3，ADR §4 已核口径不变）。
- 回滚面：纯新增，`git revert` 单提交即净（非功能 5）。

## 4. 模块边界（边界不变式，AC6）

```
apps/server/src/mcp/
  connection.ts   仅 import：@modelcontextprotocol/client（Client 类型/SDK 调用）
  http.ts         仅 import：connection.js、@modelcontextprotocol/client
  stdio.ts        仅 import：connection.js、@modelcontextprotocol/client/stdio
```

- **禁止 import**：`../guard.js`、`../tools.js`、`../config.js`、`../llm.js`、
  `../engine.js`、`../sessions.js`、`../server.js`、`node:fs`（无文件面）——
  本轮 mcp/ 模块**零生产出站路径、零生产调用路径**（PRD 非功能 2：任何真实
  endpoint 连接待 BK-0029/0030 一律经 guard 收口，本轮不存在）。
- **反向也禁止**：任何既有生产模块 import `./mcp/*`——mcp/ 的唯一消费者是
  `tests/smoke/mcp-transport.mjs`（经 `apps/server/dist/mcp/*.js`，mcp-stubs.mjs
  的 dist 直连先例）与冒烟对 SDK 的直连 import（`SdkErrorCode` 断言用，
  workspace hoisting 下根级可解析——smoke-server.mjs:24 直引 better-sqlite3
  同法先例）。
- **零 shared 契约**：不改 `packages/shared/**`；无 DEFS/SSE 增量（ADR §9）。

## 5. 冒烟设计（AC3/AC4/AC5/AC8 的验收载体）

### 5.1 落位（SPEC 定稿，PRD 留白点）

| 文件 | 动作 | 预算 | 角色 |
| --- | --- | --- | --- |
| `tests/smoke/mcp-transport.mjs` | 新增 | ≤400 | 独立冒烟入口（`npm run smoke:mcp`；shutdown-sigterm.mjs 独立文件先例；**不并入 smoke-server.mjs**——规避 V09 时点性假红面 + 子进程管理独立清理） |
| `tests/smoke/fixtures/mock-stdio-server.mjs` | 新增 | ≤150 | 可 spawn 的 stdio mock server（PRD 白名单「落位 SPEC 定」的定稿：独立 fixture，比单文件自 spawn 子模式可读可审计） |
| 根 `package.json` | +1 行 | +1 | `"smoke:mcp": "node tests/smoke/mcp-transport.mjs"` |

结构：复用 `lib.mjs` 的 `Checker`（smoke-server.mjs:27 同源）；自带进程内 mock
HTTP server 与 mock 子进程的启停清理（finally 收口，SIGINT/SIGBREAK 退出码 130
对齐 smoke-server.mjs 头注口径）；汇总行 `==== smoke:mcp：X passed / Y failed
====`，退出码 failed===0?0:1。前置：脚本自检 `apps/server/dist/mcp/*.js` 在位，
缺失即 FAIL 并给「先 npm run build:server」可操作报错（mcp-stubs.mjs M01 先例，
不静默跳过）。

### 5.2 mock HTTP MCP endpoint（进程内 node:http，startMockModel 同法）

- 单 POST 端点（任意路径），逐请求记录 `{ method, url, body }` 供断言；
  DELETE → 405（terminateSession 容忍路径的确定性来源，V9）。
- JSON-RPC 路由（liberal server：忽略未知头；未知 method → JSON-RPC error
  -32601，防 SDK 未来加 discover 探针时挂死）：
  - `initialize` → 200 + result：**echo 客户端 `params.protocolVersion`**（版本
    无关握手，SDK 版本演进免疫）+ `capabilities:{tools:{}}` + `serverInfo:{name:
    'mock-http-mcp',version:'1.0.0'}`；
  - `notifications/initialized` → 202 空体；
  - `tools/list` → 200 + `tools` 两项：`echo`（description『回显输入』，
    inputSchema `{type:'object',properties:{text:{type:'string'}},required:['text']}`）
    与 `add`（`{a:number,b:number}`）；
  - `tools/call` → 按 `params.name` 路由：`echo` → 即答
    `{content:[{type:'text',text:JSON.stringify({echo:args.text})}],isError:false}`；
    `add` → `{content:[{type:'text',text:String(args.a+args.b)}]}`；
    `slow_echo` → **800ms 延迟后**应答（超时断言的延迟源）；
    `hang` → **3000ms 延迟后**应答（abort 断言的悬挂源；客户端已中止时写失败容忍）。
- 消息样例（请求 → 应答，行首为方向）：

```
→ POST {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"…","capabilities":{},"clientInfo":{"name":"AgentFlow","version":"1.0.0"}}}
← 200  {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"…","capabilities":{"tools":{}},"serverInfo":{"name":"mock-http-mcp","version":"1.0.0"}}}
→ POST {"jsonrpc":"2.0","method":"notifications/initialized"}
← 202（空体）
→ POST {"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
← 200  {"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"echo","description":"回显输入","inputSchema":{"type":"object","properties":{"text":{"type":"string"}},"required":["text"]}},…]}}
→ POST {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"echo","arguments":{"text":"hi"}}}
← 200  {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"{\"echo\":\"hi\"}"}],"isError":false}}
→ DELETE（terminateSession）
← 405
```

### 5.3 mock stdio MCP server（`fixtures/mock-stdio-server.mjs`，node 子进程）

- 帧协议：stdin 逐行读（newline-delimited JSON-RPC），每请求回写**单行** JSON
  到 stdout；notification（notifications/initialized）不回写；未知 method →
  单行 error -32601；stdin 关闭即进程自然退出。
- 工具面与延迟语义与 HTTP mock **逐字相同**（echo/add/slow_echo/hang 同参同
  应答形状）——双传输同链断言的可比性由共享工具面保证。
- spawn 形态（冒烟内）：`createStdioMcpConnection('mock-stdio', process.execPath,
  [fixtureAbsPath])`——用 node 自身跨平台（PRD 风险表对策），不引入 npx/第三方
  命令。
- 帧样例：

```
→ {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"…","capabilities":{},"clientInfo":{"name":"AgentFlow","version":"1.0.0"}}}
← {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"…","capabilities":{"tools":{}},"serverInfo":{"name":"mock-stdio-mcp","version":"1.0.0"}}}
→ {"jsonrpc":"2.0","method":"notifications/initialized"}
（无回写）
→ {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"add","arguments":{"a":2,"b":3}}}
← {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"5"}],"isError":false}}
```

### 5.4 断言清单（MT 组 · 12 条）

| ID | 断言（expected） | 对应 AC |
| --- | --- | --- |
| MT01 | HTTP connect 成功；mock 请求日志含 initialize 且 `clientInfo.name==='AgentFlow'` | AC3 |
| MT02 | HTTP listTools 返回恰 2 项，name/desc/inputSchema 与 mock 定义 deepEqual | AC3 |
| MT03 | HTTP callTool：echo → `{"echo":"hi"}`；add(2,3) → `"5"`（content[0].text 逐字） | AC3 |
| MT04 | HTTP close：mock 日志含 DELETE（terminateSession 已发）；405 下 close 仍成功；**二次 close 不抛**（幂等） | AC2/AC3 |
| MT05 | HTTP fetch 注入面：以计数 wrapper 构造，initialize+listTools+callTool 全链后 wrapper 调用数 ≥3（注入点真实生效，BK-0030 前向依据） | REQ-01 |
| MT06 | HTTP 超时：slow_echo + `timeoutMs=100` → 拒绝；错误为 `SdkError` code `REQUEST_TIMEOUT`（import SdkErrorCode 断言）或消息含 timeout；实测耗时 <1s | AC5 |
| MT07 | HTTP abort：hang + AbortController 100ms 后 abort → 拒绝（AbortError 或消息含 abort/cancel）；随后 close() 成功无泄漏 | AC5 |
| MT08 | stdio 四步全链 connect→listTools→callTool(echo/add)→成功，断言形状同 MT02/MT03 | AC4 |
| MT09 | stdio close 后无孤儿：close 前记 `conn.pid`，close 后 `process.kill(pid,0)` 轮询（50ms×40 上限 2s）至抛出（进程已退出） | AC4 |
| MT10 | stdio 超时：slow_echo + `timeoutMs=100` → 及时拒绝（同 MT06 判据） | AC5 |
| MT11 | stdio abort：hang + abort → 拒绝；close 成功 | AC5 |
| MT12 | spawn 安全源扫描：readFileSync 三个 `src/mcp/*.ts`，`/shell/` 零命中（AC8 的机器化；VERIFY 复以 grep 复核） | AC8 |

超时/abort 测试**恒用小值覆写**（100ms），不实等 10s/30s 默认值（PRD 背景 3）。

## 6. 受影响文件清单（= 产品提交白名单 · SPEC 定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `apps/server/src/mcp/connection.ts` | 新增 | ≤200（ADR §8） |
| `apps/server/src/mcp/http.ts` | 新增 | ≤150（ADR §8） |
| `apps/server/src/mcp/stdio.ts` | 新增 | ≤150（ADR §8） |
| `apps/server/package.json` | +1 依赖行 | +1 |
| `package-lock.json`（根） | npm install 机制性同步 | 随依赖 |
| `tests/smoke/mcp-transport.mjs` | 新增 | ≤400 |
| `tests/smoke/fixtures/mock-stdio-server.mjs` | 新增 | ≤150（SPEC 新定，见 §5.1） |
| `package.json`（根） | +1 script 行 `smoke:mcp` | +1 |

零改动白名单（AC6 机器核对对象）：`apps/server/src/` 既有 17 模块、
`packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`.github/**`、
`tests/golden/**`、既有测试文件（smoke-server.mjs / mcp-stubs.mjs / lib.mjs /
shutdown-sigterm.mjs / tests/canvas/** 均零改动）。

## 7. 验收口径（命令 + 手动 E2E 点位）

命令组（BUILD 完成标准 = 以下全绿；每条注明核对面）：

| # | 命令 | 全绿判据 | 对应 AC |
| --- | --- | --- | --- |
| A | `npm run build` | exit 0（shared+web 不受影响） | AC6 |
| B | `npm run build:server` | exit 0（新 TS 编译过，NodeNext 子路径导入成立） | AC1 |
| C | `npm run gate` | 8 场景 diffPx=0（UI 零接触的反证） | AC6 |
| D | `npm test` | shared 契约测试 exit 0（零 DEFS 漂移） | AC7 |
| E | `npm run smoke:server` | 既有全部组零回退、exit 0（mcp-stubs M 组 M01 会因 dist 变多一个 mcp/ 子目录而仍绿——M01 只查 dist/tools.js 在位，不受影响） | AC7 |
| F | `npm run smoke:mcp` | MT01-MT12 全 passed、exit 0 | AC3/4/5/8 |

手动 E2E 点位（VERIFY 阶段逐条执行并贴证据，REPORT 载体）：

1. `npm ls @modelcontextprotocol/client`（apps/server 下）→ resolved 2.4.0、
   无 peer 违例输出（AC1）。
2. `wc -l apps/server/src/mcp/*.ts tests/smoke/mcp-transport.mjs
   tests/smoke/fixtures/mock-stdio-server.mjs` → 逐文件 ≤ 预算表（AC2/§6）。
3. `git diff -- apps/server/src`（产品提交后 `git show --stat`）→ 改动恰为
   新增 mcp/ 三文件，既有模块零改动；`git diff -- packages/shared apps/web
   tools/pixel-gate .github` 恒空（AC6）。
4. `grep -n "shell" apps/server/src/mcp/*.ts` → 无命中（AC8 手工复核，与 MT12
   互证）。
5. 产品提交恰一个（Conventional Commits，建议
   `feat(server): BK-0028 真 MCP client 传输层——统一 McpConnection + Streamable HTTP/stdio 双传输 + 冒烟`），
   `git show --stat` 路径 ⊆ §6 白名单（AC7）。
6. 新文件 EOL 检查：LF、UTF-8 无 BOM（非功能 6）。
7. 冒烟后进程卫生：`tasklist | findstr node`（win32）/ CI 无僵尸 node（MT09 的
   人工抽查面）。

## 8. 回滚口径（非功能 5）

纯新增（3 TS + 2 冒烟 + 2 处单行 + lock 机制同步），无数据迁移、无 env 变更、
无契约改动、无生产调用路径——`git revert <产品提交>` 即完全回退，无需任何
手工清理（冒烟子进程经 MT09 面与 finally 收口，不残留）。

## 9. 架构决策处置（needsAdr=false）

- **无新架构决策**：选型定案于 ADR-0012 + issue#10 批复链（PRD 结论），本轮
  SPEC 的时效复核（§2）全部正向维持原选型——含 §4 悬置项以「注入点存在」
  收口，属 ADR 预留的「以复核结论为准」既定路径，不构成改选。
- **ADR-0012 状态同步（本会话已完成，登记性质修订非新 ADR）**：① 状态行由
  「草案 · 待用户批准……批准前零实现」更新为「已批准（issue #10 用户批复，
  2026-10-24；证据链见 iterations/0023/PRD.md 选题存证——PLAN 轮 gh 亲核）·
  BK-0028 实施中（迭代 0023）」——批复在案后原文状态行已失实，按 spec-designer
  「文档与事实不一致先核对再修文档」义务更正；② §4 guard 注入点段附
  【SPEC 复核 2026-10-25】括注（V5 结论指针至本文 §2）。
