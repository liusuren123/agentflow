# JOURNAL · 迭代 0023 · BK-0028 真 MCP client 传输层（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 00:56–01:06
> 输入：`iterations/0023/PRD.md` + `iterations/0023/SPEC.md` + ADR-0012（全文）。
> 授权链：issue#10 用户批复（授权面 = 附录 A ①新增 npm 依赖
> @modelcontextprotocol/client ^2.4）；**非修宪轮**：全程零接触 golden、
> 未运行 gate:update、`apps/web/**` / `tools/pixel-gate/**` /
> `packages/shared/**` / `.github/**` 零改动（下文 §5 diff 亲核为空）。
> 完整门禁（`npm run build` / `npm run gate` / 根 `npm test` /
> `npm run smoke:server`）与 git 提交由工作流脚本在 BUILD 之后统一执行——
> 本 JOURNAL 所载命令为 BUILD 自测链（`npm run build:server` +
> `npm run smoke:mcp` + 行数/grep/diff/EOL/进程卫生核查），非完整门禁
> （0021/0022 JOURNAL 同口径）。

## 1. 实施序（SPEC §3/§5/§6 定界逐项落地）

### 步 1 · 依赖引入（AC1，REQ-02）

- `npm view @modelcontextprotocol/client`（BUILD 会话亲核）：version=2.4.0
  =dist-tags.latest、engines.node=`>=20`、license=Apache-2.0、无
  peerDependencies——与 SPEC §2 复核一致（时效在 BUILD 时点再确认）。
- `npm install @modelcontextprotocol/client@^2.4 -w @agentflow/server`：
  **apps/server/package.json +1 行（npm 归一写为 `^2.4.0`，与 SPEC 字面
  `^2.4` 同区间）**、根 package-lock.json 机制性同步；`npm ls
  @modelcontextprotocol/client` → resolved 2.4.0、无 peer 违例输出。
  安装期间 npm 提示 esbuild@0.21.5 postinstall 不在 allowScripts——该包
  非 SDK 依赖树新增面（lock 既有），未批准未执行，无构建影响。
- 装后即对已装 SDK 的 dist 类型面逐项亲核（连接层正确性的落笔依据）：
  `Client.connect/listTools/callTool/close` 签名、`RequestOptions.timeout/
  signal`、`StreamableHTTPClientTransportOptions.fetch?: FetchLike`、
  `StdioServerParameters`（无任何命令解释器选项）、`transport.pid`、
  `SdkErrorCode.RequestTimeout='REQUEST_TIMEOUT'`——全部与 SPEC §2 V1-V12
  相符；运行时导出亦验（node -e import 亲核 SdkErrorCode/Client/
  StreamableHTTPClientTransport 均 callable）。

### 步 2 · 三模块（SPEC §3.1-3.3 / §4 边界）

| 文件 | 行数 | 预算 | 形态要点 |
| --- | --- | --- | --- |
| `apps/server/src/mcp/connection.ts` | 84 | ≤200 | McpConnection 五面 + callTool 可选第 4 参 signal（SPEC 扩展面）；BaseMcpConnection 持 SDK Client（CLIENT_INFO={AgentFlow,1.0.0} 静态常量，不读 package.json）；超时直传 SDK `RequestOptions.timeout`（默认 connect/listTools 10s、callTool 30s，SDK 60s 默认因恒显式传值不生效），不自制定时器；close 幂等 |
| `apps/server/src/mcp/http.ts` | 43 | ≤150 | 工厂 `createHttpMcpConnection(serverId, url, {fetch?, requestInit?})`；teardown 覆写 = terminateSession best-effort 吞错（405/网络错误容忍，V9）；**不 import guard.ts**（注入点是参数，BK-0030 以 `{fetch: mcpFetch}` 收口，本文件零改动） |
| `apps/server/src/mcp/stdio.ts` | 45 | ≤150 | 工厂 `createStdioMcpConnection(serverId, command, args?, {env?, cwd?, stderr?})`；argv 直传 SDK（API 面无命令解释器选项，V7）；close = 基类 client.close()（SDK SIGTERM→1s→SIGKILL 级联，源码亲核）；`get pid()` 测试探针面（MT09 数据源） |

实现期两处设计落点（SPEC 留白处的实现裁量，均有源码依据）：

1. **close 语义的「connect 尝试即置位」**：`connectAttempted` 在发起
   connect 时同步置位（而非成功后）——stdio 连接握手超时/失败时子进程
   已 spawn，close 必须仍走 teardown+client.close() 拆链，否则产生孤儿；
   从未发起 connect 的连接 close 为纯 no-op（SPEC「无抛 no-op」语义）。
2. **stdio.ts 注释措辞避开 `shell` 字样**：AC8/MT12 断言
   `/shell/` 三文件零命中，注释以「命令解释器」表述承载同一语义。

### 步 3 · 冒烟（AC3/4/5/8 载体，SPEC §5 落位定稿执行）

| 文件 | 行数 | 预算 | 角色 |
| --- | --- | --- | --- |
| `tests/smoke/fixtures/mock-stdio-server.mjs` | 65 | ≤150 | 可 spawn 的 stdio mock：stdin 逐行 JSON-RPC、单行回写 stdout、notification 不回写、未知 method→-32601、stdin 关闭自然退出；工具面 echo/add 即答、slow_echo 800ms、hang 3000ms |
| `tests/smoke/mcp-transport.mjs` | 311 | ≤400 | 独立入口（`npm run smoke:mcp`）：进程内 node:http mock（startMockModel 同法）+ MT01-12 断言 + fail-fast/finally 清理/SIGINT·SIGBREAK exit 130/汇总行；dist 前置缺失即全量 FAIL 并给「先 npm run build:server」（M01 先例） |
| 根 `package.json` | +1 | +1 | `"smoke:mcp": "node tests/smoke/mcp-transport.mjs"` |

实现期 SDK 行为发现（mock 设计的关键修正，源码亲核）：

- **`terminateSession` 首行 `if (!this._sessionId) return`**——无会话即
  短路、DELETE 根本不发。故 HTTP mock 的应答头携带
  `Mcp-Session-Id: mock-session-1`（initialize 起全部 JSON 应答），MT04
  的「mock 日志含 DELETE」才可判定（SPEC §5.2 消息样例的 DELETE→405
  形态即会话建立后形态）。
- **SDK `DEFAULT_VERSION_NEGOTIATION_MODE='legacy'`**——默认 connect 直走
  initialize 握手（无 server/discover 探针）；mock 的 liberal 路由
  （未知 method→-32601）仍保留为防御面。
- initialize 应答 echo 客户端 `params.protocolVersion`：SDK 校验返回值
  必须在其 legacy 支持集内，echo 客户端所发版本即恒通过（SPEC 设计成立）。

## 2. 自测记录（BUILD 会话亲跑，2026-10-25 01:0x）

| # | 命令 | 结果 |
| --- | --- | --- |
| 1 | `npm run build:server` | exit 0（两次：首版 + stdio.ts 注释修订后），dist/mcp/ 九产物（js/d.ts/map ×3） |
| 2 | `npm run smoke:mcp` | **MT01-12 全 PASS，`==== smoke:mcp：12 passed / 0 failed ====`，exit 0**（一次通过） |
| 3 | `wc -l`（五新文件） | 84/43/45/311/65，全部低于预算表（≤200/≤150/≤150/≤400/≤150） |
| 4 | `grep -in "shell" apps/server/src/mcp/*.ts` | 无命中（AC8；与 MT12 机器断言互证） |
| 5 | `git diff -- packages/shared apps/web tools/pixel-gate .github` | 空（零改动）；`git diff -- apps/server/src` 仅新增 mcp/ 三文件，既有 17 模块零改动 |
| 6 | EOL/BOM | od 字节级亲核：五新文件 LF（无 \r）、UTF-8 无 BOM（首 3 字节 2f2a20/23212f） |
| 7 | 进程卫生 | smoke 退出后 Win32_Process 逐条核命令行：无一条指向 mock 夹具/冒烟（现存 node 进程均为宿主环境自有 RSSHub/WorkBuddy/pnpm 等）；MT09 亦已断言子进程退出 |

未运行（归脚本统一执行，如实声明）：`npm run build`（根 shared+web）、
`npm run gate`、根 `npm test`、`npm run smoke:server`、git 提交。

## 3. 边界与安全自查

- mcp/ 三模块 import 面恰为 SPEC §4 白名单：connection.ts ←
  `@modelcontextprotocol/client`；http.ts ← `./connection.js` +
  `@modelcontextprotocol/client`；stdio.ts ← `./connection.js` +
  `@modelcontextprotocol/client/stdio`。**零 node:fs、零 guard/tools/
  config/llm/engine/sessions/server 引用**；反向亦零生产模块引用 mcp/
  （唯一消费者 = 冒烟）。零生产出站路径（Mimosa 约束的 localhost 拒绝
  不适用于本轮生产代码——其无任何请求 URL 面；测试代码对 127.0.0.1 mock
  直连为 PRD 非功能 2 明文许可形态）。
- 零 shared 契约、零 UI、零 golden 接触；未运行 gate:update。
- 超时/abort 如实向外抛（SdkError REQUEST_TIMEOUT / AbortError），冒烟
  MT06/07/10/11 断言拒绝路径而非伪造成功。

## 4. 偏差与豁免记录

- 无影响面扩大：产品改动恰为 SPEC §6 白名单 8 项（见 §5）；未触及
  PRD「不做」清单任何一项（registry/guard/collectTools/前端面板均未碰）。
- 字面偏差一处：package.json 依赖版本 npm 归一为 `^2.4.0`（SPEC/ADR 写
  `^2.4`，同 semver 区间，npm install 机制行为，非裁量）。

## 5. 产品提交白名单（= SPEC §6；脚本 add 口径）

```
apps/server/src/mcp/connection.ts        新增 84 行
apps/server/src/mcp/http.ts              新增 43 行
apps/server/src/mcp/stdio.ts             新增 45 行
apps/server/package.json                 +1 依赖行
package-lock.json                        npm 机制性同步
tests/smoke/mcp-transport.mjs            新增 311 行
tests/smoke/fixtures/mock-stdio-server.mjs 新增 65 行
package.json                             +1 script 行（smoke:mcp）
```

docs/evolution/** 与 docs/adr/**（SPEC 阶段已改的 ADR-0012 状态行）不属
本清单，归脚本/归档提交处置。
