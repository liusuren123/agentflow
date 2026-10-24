# SPEC · 迭代 0025 · BK-0030 MCP 工具会话注入与 guard 出站类别扩展

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 02:22
> 输入：`iterations/0025/PRD.md`（本目录）+ ADR-0012（定界权威，284 行全文在库）
> + 本会话代码/测试亲读（引用处逐条标注 path:line）。
> 定界顺位：CONSTITUTION.md > ADR-0012 > PRD > 本 SPEC；本 SPEC 与 PRD 的
> 三处偏差见 §12（均有 PRD 自身条款授权，非静默偏离）。
> 触 UI 结论：**否（非修宪轮）**——改动面限 `apps/server/src/**` + `tests/smoke/**`
> + 根 `package.json` 一行；`apps/web` / `tools/pixel-gate` / `packages/shared` /
> `tests/golden` / `.github` 零接触，全程禁 `npm run gate:update`。
> needsAdr：**false**（出站网关与三分支共存已定案于 ADR-0012 §6.2/§6.3 + issue#10
> 批复链；本 SPEC 仅落细节。§12 偏差均为 PRD 授权范围内的落位定稿，不构成新架构决策）。

## 1. 现状事实（本会话 2026-10-25 亲读亲跑）

1. **collectTools 全消费点**（`grep -rn "collectTools" apps/ tests/ packages/`
   实跑，dist 产物与 .mimosa 基线副本除外）：生产唯一 = `llm.ts:9`（import）+
   `llm.ts:38`（调用，位于 async handler 内）；测试 = `tests/smoke/mcp-stubs.mjs:75/:92/:105`
   （M05/M06/M07 **同步直调并消费 Map**——M05 断言冻结于迭代 0009 BK-0005 载荷字面）。
   → 改 async 旧签名必破 M05-M07；本 SPEC 选「保留旧签名 + 会话层组合」（§3.2）。
2. **registry 发现路径无 fetch 注入**：`registry.ts:156-158` `discoverTools` 建连
   `createHttpMcpConnection(entry.serverId, entry.url)` **不带 opts**——走 SDK 全局
   fetch。生产 `createHttpMcpConnection` 调用点当前仅此一处（grep 实跑）。若注入层
   直接消费 discoverTools，**发现路径绕过 guard**，违反 PRD AC2「生产路径 MCP HTTP
   连接一律以 `{ fetch: mcpFetch }` 注入构造」与 ADR-0012 §6.2「每个 MCP endpoint
   URL 经 assertPublicUrl 后请求」→ 必须补注入缝（§3.3，偏差 D1）。
3. **BK-0028/0029 产物可开闭消费**：`http.ts:18-21` `HttpMcpOptions.fetch?: FetchLike`
   注入面在位（`http.ts:8-11` 注释明示 BK-0030 收口路径，本文件零改动）；
   `connection.ts:29` `callTool` 第 4 参 `signal?: AbortSignal` 已为 run 中止级联
   预留；`registry.ts:114-130` `buildMcpRegistry(sources, opts?)` 已有 `warn` 注入
   先例（MR05 直用），追加可选字段后向兼容（`mcp-registry.mjs:207/:220/:237/:254/:301`
   五处调用形态亲核）。
4. **guard 现状**：`guardedFetch`（guard.ts:59-62）收口内核；`assertPublicUrl`
   （:33-56）仅 http/https + 私网/回环/链路本地/CGNAT/保留段默认拦截 + DNS 核验，
   拦截错误含固定子串「已拦截」（:40/:43/:49），`ALLOW_PRIVATE_NET=1` 逃生（:37）。
5. **llm.ts 注入点**：`llm.ts:38` 同步调用；spec 消费 `TOOL_SPECS[name] || {desc:name,
   schema:{}}`（:47，外部工具无 spec 时盲调）；zod shape 组装 :48-51；abort 通道
   `ctx.ac.signal` 在位（:67/:79/:91；engine.ts:33 ctx.ac AbortController；
   server.ts:137-140 stop 端点 → ctx.ac.abort()）。
6. **行数基线**（wc -l 实测）：llm.ts=122 / tools.ts=116 / guard.ts=100 /
   registry.ts=179 / config.ts=129 / connection.ts=84 / http.ts=43 / stdio.ts=45。
7. **冒烟基建**：mcp-transport.mjs（MT01-MT12，进程内 HTTP mock `startMockHttpMcp`
   :63-95 + `assertNoOrphan` pid 轮询 :116-125 + MT05 fetch 注入计数先例 :186-197）；
   mcp-registry.mjs（MR01-MR11）；fixtures/mock-stdio-server.mjs（65 行，echo/add/
   slow_echo/hang，stdin 关闭即退出）；smoke-server.mjs G 组 OpenAI 兼容 mock 模型
   （:88-139 `startMockModel`，mock 实例 env 配方 :590-592：`AI_BASE_URL +
   AI_API_KEY:'smoke-mock-key' + AI_MODELS:'MockChat:mock-model' + AI_MODEL:'mock-model'`）；
   lib.mjs 导出面：Checker / SmokeFailError / deepEqual / getFreePort / sleep /
   waitFor / api / startServer（opts.env 显式空串可压制本机 .env 泄入，lib.mjs:62-68）。
8. **V09 时点性**：smoke-server.mjs:838-852 V09 断言 `git status --porcelain --
   packages/shared` 为空——本迭代不触 packages/shared，且新增冒烟为独立文件，
   不涉 V09（PRD 风险表口径沿用）。

## 2. 总体架构（三分支解析表 = ADR-0012 §6.3 字面）

工具装配链由「collectTools 两分支内核（零行为改动）+ inject.ts 会话层外部臂」
组合实现三分支，解析表如下（`n.mcp` 的每个 `(server, tool)` 项）：

| 分支 | 判定 | impl 来源 | spec 来源 |
| --- | --- | --- | --- |
| ① 内置 | `IMPL[server][tool]` 为函数 | `collectTools` 内置臂（**逐字节不变**） | `TOOL_SPECS`（现状） |
| ② 外部 | ① 未命中 ∧ `registry.has(server)` ∧ 发现成功 ∧ tool ∈ 发现清单 | inject.ts 动态 impl（覆写 stub） | 发现快照桥接（§4.2） |
| ③ stub | 其余一切（未注册 / 清单未命中 / 发现失败） | `collectTools` stub 臂（**逐字节不变**） | `{desc:name, schema:{}}` 现状回退 |

结构执法：inject.ts **只覆写 map 中 `isStubImpl===true` 的条目**（§3.2）——即使
注册表不变量（内置 id 冲突拒绝，registry.ts:123-127）被破坏，内置 impl 也绝不会被
外部动态 impl 替换。ADR §6.3 首句「外部 server 的发现结果并入 collectTools **之上**
的动态层，不替换 IMPL 语义」字面承载即此；§8 模块表自注为「草图」，落位以本节为准。

## 3. 模块设计

### 3.1 guard.ts：mcpFetch 网关（ADR-0012 §6.2 签名草图字面）

在 `searxngSearch`（guard.ts:93-100）之后追加：

```ts
/* MCP Streamable HTTP 出站网关（迭代 0025 / BK-0030 · ADR-0012 §6.2）：
 * 目标主机来自运维 env 注册表（MCP_HTTP_SERVERS），经 assertPublicUrl 动态
 * 校验后请求——与 searxngSearch 动态主机网关同层集中出口；作为 SDK transport
 * 的 fetch 注入（http.ts HttpMcpOptions.fetch，BK-0028 预留注入面）。
 * init.signal 由连接层注入（callTool 30s 硬顶在 connection.ts）。 */
export async function mcpFetch(rawUrl: unknown, init: RequestInit = {}): Promise<Response> {
  return guardedFetch(rawUrl, init);
}
```

- **薄包装铁律（AC7）**：无独立 fetch 调用、无绕过面、不自设定时器/重试。
- 签名可赋值 SDK `FetchLike`（MT05 计数 wrapper `(u, i) => fetch(u, i)` 同型先例，
  参数逆变为 `unknown` 接受一切实参）。

### 3.2 新文件 `apps/server/src/mcp/inject.ts`（注入层，≤200 行）

```ts
import { z } from 'zod';
import { mcpFetch } from '../guard.js';
import { collectTools, isStubImpl } from '../tools.js';
import type { ToolImpl } from '../tools.js';
import { createHttpMcpConnection } from './http.js';
import { createStdioMcpConnection } from './stdio.js';
import { buildMcpRegistry, envLoader } from './registry.js';
import type { McpRegistry, McpServerEntry } from './registry.js';
import { logger } from '../logger.js';

export interface ExternalToolSpec { desc: string; shape: Record<string, any> }  // shape 值 = zod 类型
export interface ToolSession {
  impls: Map<string, ToolImpl>;       // 全部选中工具（内置/外部动态/降级 stub）
  extSpecs: Map<string, ExternalToolSpec>;   // 仅分支②工具（模型可见 desc/shape）
}

/* 全局注册表单例（§12 偏差 D2：模块级即建 = ADR §6.3「启动 warn」时序；
 * 两 env 未配置 → 空解析零 IO 零 warn，PRD「零副作用」等价成立；
 * httpFetch 注入缝见 §3.3——生产 HTTP 发现连接全量经 mcpFetch） */
const registry: McpRegistry = buildMcpRegistry(envLoader(), { httpFetch: mcpFetch });

export interface BuildSessionOptions {
  warn?: (fields: { serverId: string; kind: string; error: string }, msg: string) => void;
}

export async function buildToolSession(
  mcpSel: Record<string, unknown> | undefined | null,
  signal?: AbortSignal,
  opts?: BuildSessionOptions,
): Promise<ToolSession>
```

`buildToolSession` 算法（伪码）：

```
impls ← collectTools(mcpSel)                    // 分支①③内核，零改动复用（tools.ts:105-116）
extSpecs ← 空 Map
warn ← opts?.warn ?? logger.warn
for (server, names) of Object.entries(mcpSel || {}):
  if (!Array.isArray(names) || names.length === 0) continue        // 空选零发现（capSummaryServer 同口径）
  if (!registry.has(server)) continue                              // 分支③留 stub
  try: tools ← await registry.discoverTools(server)                // 进程级快照缓存复用（registry.ts:150-168）
  catch (e):
    warn({serverId, kind, error:String(e?.message ?? e)}, DISCOVER_FAIL_WARN)   // §4.4 字面量
    continue                                                      // 分支③留 stub（不伪造不静默）
  manifest ← Map(tools.map(t => [t.name, t]))
  for name of names:
    info ← manifest.get(name)
    if (!info) continue                                           // 清单未命中 → 分支③留 stub（不 warn，调用时 stub note 如实）
    key ← `${server}.${name}`
    if (!isStubImpl(impls.get(key))) continue                     // 结构执法：绝不覆写非 stub（§2）
    impls.set(key, dynamicImpl(entryOf(server), name, signal))    // 分支②
    extSpecs.set(key, bridgeSpec(info))                           // §4.2
return { impls, extSpecs }
```

- `entryOf(server)`：`registry.entries.find(e => e.serverId === server)`（公开
  readonly 面，registry.ts:134；**不加** `get()` 访问器，注册表零语义增量）。
- 导出面恰四项：`buildToolSession` / `ToolSession` / `ExternalToolSpec` /
  `BuildSessionOptions`（+内部使用 `registry` 常量不导出——测试经行为断言，不触单例）。

**动态 impl（分支②，per-call 生命周期 = §4.3 定稿）**：

```ts
function dynamicImpl(entry: McpServerEntry, toolName: string, signal?: AbortSignal): ToolImpl {
  return async (args) => {
    const conn = entry.kind === 'http'
      ? createHttpMcpConnection(entry.serverId, entry.url, { fetch: mcpFetch })   // AC2：HTTP 一律注入
      : createStdioMcpConnection(entry.serverId, entry.command, entry.args);      // stdio 无出站面
    try {
      await conn.connect();                                                       // 10s 默认（connection.ts:35）
      return await conn.callTool(toolName, args ?? {}, undefined, signal);        // 30s 默认 + abort 透传（:29/:36）
    } finally {
      await conn.close();        // 幂等（connection.ts:77-83）；registry.ts:165-167 同型先例
    }
  };
}
```

**CallToolResult 原样透传（connection.ts:28 归 BK-0030 的解包语义，本 SPEC 定稿）**：
v1 不解包——`callTool` 返回的 SDK `CallToolResult`（`{content:[…], isError}`）原样
作为工具结果交还 AI SDK / 模型 / 日志。理由：零解释面（多 content 部分、非 text
部分、isError 语义不做猜测）；冒烟可对 `content[0].text` 精确断言；解包/聚合留待
真实使用反馈（如需，后续独立小项）。

### 3.3 registry.ts：httpFetch 注入缝（偏差 D1，仅此一处增量）

`BuildRegistryOptions` 追加可选字段 + `McpRegistry` 构造存储 + `discoverTools`
HTTP 分支注入（全部默认 `undefined` = 现行为逐字节不变）：

```ts
import type { FetchLike } from '@modelcontextprotocol/client';
export interface BuildRegistryOptions {
  warn?: (fields: { serverId: string; kind: string }, msg: string) => void;
  httpFetch?: FetchLike;   /* BK-0030：HTTP 发现连接的 fetch 注入（默认 SDK 全局 fetch，MR 兼容） */
}
// McpRegistry: private readonly httpFetch?: FetchLike（构造传入）
// discoverTools :157 改为：
? createHttpMcpConnection(entry.serverId, entry.url, this.httpFetch ? { fetch: this.httpFetch } : undefined)
```

E1-E9（config.ts:68-73/:100-108）与发现缓存语义（快照/失败不缓存/发现即关）
零触碰；MR01-MR11 五处 `buildMcpRegistry` 调用不带 httpFetch → 路径不变。

### 3.4 tools.ts：注释级三分支指针（行为面零改动）

`collectTools`（tools.ts:105）上方加 ≤5 行注释：三分支解析表指针（指向
mcp/inject.ts 会话层：内置臂/外部动态覆写臂/stub 臂）。**IMPL / TOOL_SPECS /
stubOf / collectTools 函数体一行不改**——AC1「内置分支 git diff 零变化」以
「除注释外零 diff」的最强形态成立（§12 偏差 D3）。

### 3.5 llm.ts 接线 diff 形态（122 → ≤140）

```diff
-import { collectTools, isStubImpl, TOOL_SPECS } from './tools.js';
+import { isStubImpl, TOOL_SPECS } from './tools.js';
+import { buildToolSession } from './mcp/inject.js';
 ...
-  const toolImpls = collectTools(n.mcp);
+  const sess = await buildToolSession(n.mcp, ctx.ac.signal);   // :38 异步接线（PRD 做3）
+  const toolImpls = sess.impls;
 ...
   for(const [name, impl] of toolImpls){
     if(isStubImpl(impl)) stubCount++;
-    const spec = TOOL_SPECS[name] || { desc: name, schema: {} as Record<string, string> };
+    const ext = sess.extSpecs.get(name);                        // 分支②：发现快照桥接 spec
+    const spec = TOOL_SPECS[name] || { desc: ext?.desc ?? name, schema: {} as Record<string, string> };
     const shape: Record<string, any> = {};
-    for(const [k, d] of Object.entries(spec.schema || {})){
+    if(ext) Object.assign(shape, ext.shape);
+    else for(const [k, d] of Object.entries(spec.schema || {})){
       shape[k] = /数量|count/i.test(k) ? z.number().optional().describe(String(d)) : z.string().optional().describe(String(d));
     }
```

- M08-M11 源锁行（llm.ts:56-61 execute 回调、:107 摘要）零触碰（mcp-stubs.mjs:124-132）。
- 纯流式分支（toolImpls.size===0）零触碰；空注册表时 session ≡ 现状
  （collectTools 输出 + 空 extSpecs + 零发现）。
- 净增约 +4~6 行。

### 3.6 run 中止级联链（AC4）

```
server.ts stop 端点 / 会话停机（server.ts:137-140/:235-239）
  → ctx.ac.abort()
  → llm.ts generateText abortSignal（:67）与动态 impl 闭包捕获的同一 signal
  → connection.callTool 第 4 参（connection.ts:71-73，SDK 原生 AbortError）
  → 拒绝 → finally conn.close() → stdio 子进程级联退出（SDK 负责）
```

- 无 run 级连接池 → 无需 run 结束钩子；每次调用连接生命周期 = 调用期间（§4.3）。
- 中止窗注记：会话构建期的发现连接（discoverTools）不带 signal，中止最迟由
  10s 连接超时兜底收口，随后 generateText 因 abortSignal 即时拒绝——有界延迟，
  如实不伪造；不为 v1 扩 registry signal 面（范围纪律）。

## 4. REQ-0025-01 四项定稿（+两项补充定稿）

### 4.1 ① 注入层落位 = 新文件 `apps/server/src/mcp/inject.ts`（不并入 tools.ts）

理由：tools.ts 行为面零改动（AC1 最强证据 + M05-M07 冻结面零触碰）；依赖单向
`inject → tools`（`import type` 擦除，无环）；行数预算独立（§9）。

### 4.2 ② 外部工具 spec 桥接映射表（inputSchema JSON Schema → zod shape，规则从窄）

输入 = 发现快照 `McpToolInfo.inputSchema`（connection.ts:62-69）；输出 =
`ExternalToolSpec { desc, shape }`，`desc = info.desc || info.name`（空串归一后
回退名）。

| inputSchema 形态 | 桥接结果 |
| --- | --- |
| 非对象 / 无 `properties` | `shape = {}`（盲调，与 TOOL_SPECS 未命中现状一致） |
| `properties[k].type === 'string'` | `z.string()` + required 判定 |
| `properties[k].type ∈ {'number','integer'}` | `z.number()` + required 判定 |
| `properties[k].type === 'boolean'` | `z.boolean()` + required 判定 |
| 其余（type 缺失 / array / object / oneOf…） | `z.string().optional()`（**降级：忽略 required**——防 AI SDK 按 shape 校验参数时硬失败） |
| `k ∈ required[]`（required 为数组时） | 基本类型不加 `.optional()`；否则 `.optional()` |
| `required` 非数组 | 忽略（全部 optional） |
| description | 一律 `.describe(String(properties[k].description ?? k))` |

不引入 JSON-Schema 全量解析器（PRD 风险表口径）；映射表逐行入冒烟断言（MI02）。

### 4.3 ③ 外部连接生命周期 = 一次性 per-call

每次工具调用独立 `connect → callTool → close`（§3.2 dynamicImpl）。理由：
code.ts 一次性子进程先例；ADR §6.1「不做常驻进程池」；中止级联由 finally 自动
满足（无需 run 级缓存 + 级联 close 断言义务）；发现成本已由 registry 进程级
快照缓存摊薄（BK-0029）。权衡声明：同 run 多次调用重复握手（HTTP 无会话复用 /
stdio 重复 spawn，约百 ms 级）；有状态 MCP server 需 run 级会话的场景留待真实
使用反馈（届时独立小项 + PRD 风险表要求的级联 close 断言）。该口径写入
inject.ts 头注释。

### 4.4 ④ 发现失败降级口径（stub 化 + warn 字面量）

- **impl**：保留 collectTools 已落的 stub（stubOf 通用载荷逐字，不另造载荷形态）
  ——分支③语义同型（BK-0005）；不伪造、不静默吞。
- **warn 字面量**（固定子串锚 = 前 22 字，沿 registry.ts:33 CONFLICT_WARN 先例）：

```ts
const DISCOVER_FAIL_WARN = '外部 MCP server 工具发现失败，已降级为 stub';
// logger.warn({ serverId, kind, error: String(e?.message ?? e) }, DISCOVER_FAIL_WARN)
```

- 失败不缓存（registry 语义），下次会话构建如实重试（最迟 10s 连接超时延迟，
  如实可观察）；清单未命中不单独 warn（stub note + 调用时 llm.ts warn 通道如实）。
- 观测面：pino logger（服务端日志）+ 模型实际调用降级工具时的既有 stub warn
  通道（llm.ts:58-59）——不新增 SSE 事件（零 shared 契约）。

### 4.5 ⑤ CallToolResult 原样透传（见 §3.2）；⑥ 单例模块级即建（见 §3.2，偏差 D2）。

## 5. 冒烟设计：`tests/smoke/mcp-inject.mjs`（MI01-MI12，≤400 行）+ fixture 探针

**形态**：独立脚本（不触 smoke-server.mjs，规避 V09 时点面；根 package.json
+1 行 `"smoke:mcp:inject": "node tests/smoke/mcp-inject.mjs"`）。进程内直连
`apps/server/dist/**`（mcp-stubs/mcp-transport 先例）+ 自我子进程模式（拦截组）。
被测产物前置检查沿用 M01/MT 先例（缺失 → 全量 FAIL + 「先 npm run build:server」，
不静默跳过）。fail-fast + finally 清理 + `==== smoke:mcp:inject：X passed / Y failed ====`
+ 退出码（mcp-transport.mjs:284-311 同型）。

**环境矩阵**：主进程 env（dist import 前设置，lib.mjs:62-68 空串压制本机 .env
泄入口径）：`ALLOW_PRIVATE_NET=1` + `AI_BASE_URL=<进程内 mock 模型>` +
`AI_API_KEY=smoke-mock-key` + `AI_MODELS='MockChat:mock-model'` +
`AI_MODEL=mock-model`（G 组配方，smoke-server.mjs:590-592）+
`MCP_HTTP_SERVERS='mockhttp=http://127.0.0.1:<P1>/mcp,deadhttp=http://127.0.0.1:<P2>/mcp'`
（P2 = 无监听死端口）+ `MCP_STDIO_SERVERS='mockstdio=node <FIXTURE> --pid-file <PIDFILE>'`
（PIDFILE 路径含空白字符 → 起始即 actionable FAIL，ADR §7 env 表达力边界）。

**进程内 mock 基建**（均在本文件内，lib.mjs 只复用不修改）：
- mock MCP HTTP endpoint（mcp-transport `startMockHttpMcp` 精简同型）：工具面
  扩展为 `echo`(text:string required) / `add`(a,b:number required) /
  `opt_flag`(flag:boolean optional) / `weird`(cfg: 无 type → 降级面) / `hang`(3s)，
  DELETE→405、逐请求记录；
- mock 模型（OpenAI 兼容，G 组同型）：generateText 非 stream 请求；裁决路由——
  首轮（messages 无 tool 结果）回 `tool_calls`（按请求 tools 定义点名外部工具），
  次轮回固定终文（含工具结果标记）；逐请求记录 body（tools 定义/参数/结果可断言）；
- `llmHandler` 直驱器：手工构造 `RunCtx{runId, wf, inputs, ac, emit, log:{info(){},warn(){}}}`
  + `HandlerArgs{n, p, input, inVals, vars, emit, …}`（types.ts:48-79 形状；
  llm.ts 实际消费面 = n/p/input/inVals/vars/emit/ctx）。

| # | 断言（全部亲跑判据） | AC |
| --- | --- | --- |
| MI01 | dist 前置在位（dist/mcp/inject.js + dist/llm.js + dist/guard.js + dist/mcp/registry.js） | — |
| MI02 | HTTP E2E·spec 桥接达模型：mock 模型首轮请求 body.tools 含 `mockhttp_echo`（description='回显输入'；parameters：text→string+required、a/b→number+required、opt_flag→boolean 非 required、weird→string 非 required）——§4.2 映射表逐行断言 | AC3 |
| MI03 | HTTP E2E·真实调用：mock MCP 请求日志含 `tools/call echo {text:'hi'}`；模型次轮请求含工具结果 `{"echo":"hi"}`（CallToolResult 原样透传的 text 面）；节点终值 = mock 终文；emit 收集含「🔧 工具调用 mockhttp.echo(」日志行 | AC3 |
| MI04 | stdio E2E：同型断言经 `mockstdio` 子进程（echo/add 结果与 mock 定义一致 + spec 达模型） | AC3 |
| MI05 | 三分支边界：`{filesystem:[read_file], mockhttp:[echo,not_in_manifest], nosuch:[ghost]}` → `filesystem.read_file === IMPL.filesystem.read_file`（**引用相等**，内置零语义改动最强证据）；`mockhttp.echo` 非 stub 且直调返回 mock 结果；`mockhttp.not_in_manifest` / `nosuch.ghost` 均 `isStubImpl===true` | AC5/AC1 |
| MI06 | 发现失败降级：`deadhttp:['echo']` → stub 化（isStubImpl）+ 注入 warn collector 收到 `{serverId:'deadhttp', kind:'http'}` + msg 含「工具发现失败，已降级为 stub」+ error 含连接拒绝字样（不静默吞） | AC5/REQ-01④ |
| MI07 | 空注册面零发现：`{filesystem:[read_file], nosuch:[x]}` session → extSpecs 空 + `impls` 与 `collectTools` 同选逐项引用相等 + `registry.discoveryCount` 对 mockhttp/deadhttp 均为 0 | AC1 |
| MI08 | run 中止级联（AC4 全链）：stdio `hang` 工具调用中 `ctx.ac.abort()` → handler 以 abort 型错误拒绝（isAbortErr，MT07 判据）；PIDFILE 轮询得 per-call 子进程 pid → `process.kill(pid,0)` 轮询至退出（assertNoOrphan 同型）；发现阶段 pid 同样无孤儿；mock 模型恰 1 次请求（未入次轮） | AC4 |
| MI09 | 中止级联后基线复跑：同进程再次 buildToolSession（mockhttp 缓存命中零重连）+ 完整 handler 正常收束（中止不污染后续 run） | AC4 |
| MI10 | 子进程拦截（`node mcp-inject.mjs --child-guard`，env `ALLOW_PRIVATE_NET=''` + 子进程自起 mock MCP 后 import dist）：session 构建 warn 含「已拦截」+「已降级为 stub」；mock MCP 收到 **0** 请求（未出站证明）；impl stub 化 | AC2 |
| MI11 | 子进程直调 mcpFetch：`ftp://` → 「仅允许 http(s) 协议」；`http://127.0.0.1:<mockport>/` → 「已拦截」（AC2 非 http(s)/回环面；主进程 ALLOW_PRIVATE_NET=1 的 MI02-MI04 全通即「=1 放行」证据，交叉引用） | AC2 |
| MI12 | 源扫描（MT12 同型）：`src/mcp/{connection,http,stdio,registry,inject}.ts` 五文件正则 `/(?<![\w.$])fetch\s*\(/` 零命中（无绕过注入面裸出站；`fetch: mcpFetch` / `opts?.fetch` 属性形态不误报） | AC2/AC7 |

行数预算：头注 20 + mock 基建 120 + 直驱器/探针助手 60 + 断言块 150 + 子进程分支
35 + 运行器/清理 25 ≈ 410 → 实现顺序上先砍 MI09（并入 MI08 尾注）再并 MI02/MI03
为单 E2E 双断言，压回 ≤400；lib.mjs（Checker/waitFor/getFreePort/sleep/deepEqual）
强制复用零拷贝。

**fixture 增量**（`tests/smoke/fixtures/mock-stdio-server.mjs` 65 → ≤80 行）：
argv `--pid-file <path>` 门控探针——启动即 `writeFileSync(path, String(process.pid))`
（尽力而为吞错）；未传该参 = 行为零变化（MT08-MT11/MR08 零回退）。

## 6. 受影响文件清单（定稿 = 产品提交白名单）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `apps/server/src/guard.ts` | +mcpFetch 网关（§3.1） | 100 → ≤130（ADR §8） |
| `apps/server/src/mcp/inject.ts` | **新增**（§3.2：单例 + 会话构建 + 动态 impl + spec 桥接 + 降级） | ≤200（ADR §8） |
| `apps/server/src/mcp/registry.ts` | +httpFetch 可选注入缝（§3.3，**仅此**；E1-E9/缓存语义零触碰） | 179 → ≤200（ADR §8） |
| `apps/server/src/llm.ts` | :38 异步接线 + extSpecs 消费（§3.5） | 122 → ≤140（ADR §8） |
| `apps/server/src/tools.ts` | 仅注释级三分支指针（§3.4；行为面零 diff） | 116（不变） |
| `tests/smoke/mcp-inject.mjs` | **新增**（MI01-MI12，§5） | ≤400 |
| `tests/smoke/fixtures/mock-stdio-server.mjs` | +--pid-file 探针参（§5，默认零变化） | 65 → ≤80 |
| `package.json`（根） | +`smoke:mcp:inject` script | +1 |

**零改动白名单**（产品提交中零出现）：`mcp/connection.ts`、`mcp/http.ts`、
`mcp/stdio.ts`（注入面开闭，BK-0028 定稿）、`config.ts`（E1-E9 语义不变）、
`apps/server/src/` 其余全部（engine/handlers/server/sessions/store/search/code/
providers/util/logger）、`apps/server/package.json` + `package-lock.json`（**零新
依赖**——SDK 已随 BK-0028 引入）、`packages/shared/**`、`apps/web/**`、
`tools/pixel-gate/**`、`.github/**`、`tests/golden/**`、`tests/canvas/**`、
`tests/smoke/lib.mjs` 与既有五冒烟文件（smoke-server/mcp-transport/mcp-registry/
mcp-stubs/shutdown-sigterm）。

## 7. 模块边界

```
guard.ts        mcpFetch（唯一出站网关内核薄包装；不 import mcp/*）
mcp/inject.ts   会话装配（import：guard.mcpFetch / tools.collectTools+isStubImpl /
                mcp/http+mcp/stdio 构造 / mcp/registry build+envLoader / logger / zod）
mcp/registry.ts 注册表（+httpFetch 透传缝；import 不变）
mcp/connection|http|stdio  传输层（零改动）
tools.ts        内置 IMPL + stub 内核（行为零改动；注释指针）
llm.ts          节点 handler（:38 await buildToolSession；spec 消费）
依赖方向：llm → inject → {tools, guard, mcp/*}；tools 不 import inject（无环；
inject 对 tools 的 type import 编译期擦除）
```

观测纪律：tools/inject 无 emit 通道，运行态单一出口仍归 llm.ts（tools.ts:77-79
口径延续）；inject 的 pino warn 沿 registry.ts logger 先例。出站纪律：MCP HTTP
生产出站唯一通道 = guard.mcpFetch，两个构造点（registry 发现 / inject per-call）
全量注入；stdio 无出站面（子进程网络残余风险按 ADR §6.1 声明，注册主权在运维 env）。

## 8. 验收口径（VERIFY 逐条执行）

**命令组**（仓库根，顺序执行）：

1. `npm run build` —— shared+web 构建成功（gate 前置）。
2. `npm run build:server` —— tsc 零错误（注入层类型面）。
3. `npm run gate` —— 8 场景 diffPx=0（纯后端回归面；本机参考、CI 权威）。
4. `npm test` —— shared 契约测试全绿（零 shared 改动 → 零回退）。
5. `npm run smoke:server` —— 既有全组零回退（AC1 证据；V09 面不涉）。
6. `npm run smoke:mcp` —— MT01-MT12 全绿（注入面开闭零破坏）。
7. `npm run smoke:mcp:registry` —— MR01-MR11 全绿（httpFetch 缝后向兼容证明）。
8. `npm run smoke:mcp:inject` —— MI01-MI12 全绿 exit 0（本项新增）。

**git 核对**（产品提交后）：

- `git diff --stat HEAD~1` 路径集 ⊆ §6 白名单；
- `git diff HEAD~1 -- packages/shared apps/web tools/pixel-gate .github tests/golden` 输出为空（AC6）；
- `git diff HEAD~1 -- apps/server/src/tools.ts` 仅注释行（AC1）；
- `grep -rn "createHttpMcpConnection" apps/server/src` → 恰三处（http.ts 定义 /
  registry.ts 注入缝 / inject.ts 动态 impl）；`grep -rn "fetch(" apps/server/src/mcp`
  裸调用零命中（AC7 注入面唯一性）。

**手动 E2E 点位**（win32 本机，Git Bash 语法；截图/日志贴 VERIFY REPORT）：

1. **空注册表基线**：不配 MCP env，`npm start` → http://localhost:3000 画布跑既有
   LLM 工作流（勾选内置工具）——行为/日志/✓ 摘要与现状一致（AC1 人感面）。
2. **外部 stdio 工具真实调用**：`MCP_STDIO_SERVERS="demo=node tests/smoke/fixtures/mock-stdio-server.mjs" npm start`
   → 经 `POST /api/v1/run`（`n.mcp={"demo":["echo"]}`，提示词诱导「请调用 demo.echo
   回显"你好"」）→ 底部日志面板出现「🔧 工具调用 demo.echo(…) → …{"echo":…}」，
   ✓ 摘要 MCP 计数含 demo（AC3 人感面）。
3. **私网拦截人证**：`MCP_HTTP_SERVERS="bad=http://127.0.0.1:9/mcp" npm start` →
   引用 bad 的 LLM 节点运行 → 服务端日志含「已拦截」+「已降级为 stub」warn、模型
   收到 stub note；再以 `ALLOW_PRIVATE_NET=1` 同配置重启 → 放行（连接拒绝如实
   报错，非拦截字样）（AC2 人感面）。
4. **gate 视觉回归**：`npm run gate` 本机全绿（宪法第 5 条义务）。

## 9. 行数预算表（AGENTS.md 硬性约定 4 + ADR §8）

| 文件 | 现行 | 预算 | 余量 |
| --- | --- | --- | --- |
| guard.ts | 100 | ≤130 | +30 |
| mcp/inject.ts | 0（新） | ≤200 | — |
| mcp/registry.ts | 179 | ≤200 | +21 |
| llm.ts | 122 | ≤140 | +18 |
| tools.ts | 116 | 116（不变） | 0（注释互换） |
| tests/smoke/mcp-inject.mjs | 0（新） | ≤400 | — |
| fixtures/mock-stdio-server.mjs | 65 | ≤80 | +15 |

## 10. 回滚口径

`git revert` 单产品提交即全量回滚（纯后端注入层 + 网关函数 + 测试；无数据迁移 /
契约改动 / 依赖变化 / env 语义变化——两 MCP env 语义 BK-0029 已在库）。

## 11. 风险与既知权衡

| 风险/权衡 | 处置 |
| --- | --- |
| AI SDK 按 zod shape 校验外部工具参数 → 未知类型硬失败 | §4.2 降级行（unknown → `z.string().optional()` 忽略 required）规避；MI02 断言 |
| per-call 重复握手开销（HTTP 无会话复用 / stdio 重复 spawn） | v1 接受（§4.3 权衡声明）；快照缓存已摊薄发现成本 |
| 发现失败不缓存 → server 宕机时每次会话构建 10s 延迟 | 如实重试（BK-0029 语义零触碰）；warn 可观察；失败缓存留后续小项 |
| 会话构建期发现不带 signal（中止窗 ≤10s） | §3.6 注记；有界兜底，不为 v1 扩 registry 面 |
| PIDFILE 路径含空白（ADR §7 env 表达力边界） | MI05 前置 actionable FAIL（提示换无空白临时目录） |
| mock 模型 tool_calls 编排（OpenAI 兼容格式） | G 组先例 + 请求日志断言；首轮点名/次轮收束固定路由 |
| Mimosa 钩子 | 本轮无 better-sqlite3/exec 新调用面；被拦按 0020 先例对照实验如实上报 |
| 冒烟 400 行挤压 | §5 砍序（MI09 → MI02/03 合并）；lib.mjs 强制复用 |

## 12. 与 PRD/ADR 的偏差记录（均非静默；needsAdr=false 依据）

| # | 偏差 | 依据 |
| --- | --- | --- |
| D1 | registry.ts 追加 httpFetch 注入缝（PRD 零改动白名单 + 受影响文件表均未列） | PRD 三条不可同时成立：「做3 消费 discoverTools 快照」+「registry 零改动」+ AC2「生产路径 MCP HTTP 连接一律注入」——registry.ts:157 现状无注入即绕过 guard（§1.2 亲证）。PRD 不做清单括号已预留「单例工厂小增量，以不触 E1-E9 语义为界」通道，且文件表白注「SPEC 阶段定稿」；本缝为该授权内最小增量（默认路径逐字节不变，MR 五调用点亲核兼容） |
| D2 | 单例模块级即建（PRD 做4 字面「惰性单例」） | PRD 冲突顺位条款：与 ADR 冲突以 ADR 为准——ADR §6.3「config zod 校验拒绝 + **启动 warn**」要求冲突 warn 在启动期可见；惰性构建会推迟到首次会话构建。无 env 时空解析零 IO 零 warn，PRD「零副作用」 rationale 等价成立 |
| D3 | tools.ts 行为面零改动（PRD 表预期 116→≤150 三分支改动落 tools.ts） | ADR §6.3 首句「并入 collectTools **之上**的动态层」+ §8 自注「草图」+ PRD 做4「落位 SPEC 定稿」；零行为改动使 AC1「内置分支 git diff 零变化」以最强形态成立，M05-M07 冻结面零触碰；三分支解析表以 §2 组合语义 + §3.4 注释指针完整承载 |

## 13. BUILD 阶段执行序（供 code-developer）

1. `npm run gate` 基线绿（WORKFLOW §4 BUILD 前置）。
2. §3.1 guard.mcpFetch → §3.3 registry 缝 → §3.2 inject.ts → §3.4 tools 注释 →
   §3.5 llm 接线（顺序即依赖序）。
3. `npm run build:server` + `npm test` → §5 冒烟（fixture 探针 → mcp-inject.mjs）
   → package.json script。
4. 全量验收 §8 命令组 1-8 → 产品提交恰一个（Conventional Commits，建议
   `feat(server): BK-0030 MCP 工具会话注入与 guard 出站收口——collectTools 三分支 + mcpFetch 网关 + run 级联`）。
5. 实现中若发现本 SPEC 不可实施（含 §12 偏差被证伪）：立即中止上报协调者，
   不静默偏离（PRD SPEC 衔接说明口径）。
