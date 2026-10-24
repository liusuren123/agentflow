# SPEC · 迭代 0024 · BK-0029 外部 MCP server 注册与工具清单发现

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 01:29
> 输入：`iterations/0024/PRD.md`（全文 read）+ ADR-0012（全文 read，278 行）+ 代码现状
> （本会话 2026-10-25 只读核实，见 §1）。
> 定界权威：PRD「目标与范围」= ADR-0012 §7 案 A + §8 BK-0029 段；本文与 ADR 冲突以
> ADR 为准，与 PRD 冲突以 PRD 为准。
> 结论先行：**REQ-0024-01 三项悬置全部定稿（§2），`needsAdr=false`**（无新架构决策：
> env 案 A / registry 定界 / 冲突拒绝 / loaders 预留均已定案于 ADR-0012 §7/§8/§9 +
> issue#10 批复链；本文仅落实施细节，PRD SPEC 衔接说明同判）。

## 1. 代码现状基线（本会话 2026-10-25 只读核实）

| 事实 | 证据 |
| --- | --- |
| BK-0028 产物三文件在库：connection.ts 84 行（五面接口 + BaseMcpConnection，超时 connect/listTools 10s、callTool 30s 直传 SDK 不自制定时器；close 幂等，`connectAttempted` 发起即置位——握手失败也拆链防 stdio 孤儿，connection.ts:46/:57-60/:77-83） | Read 亲核 |
| http.ts 43 行：`createHttpMcpConnection(serverId, url, opts?)` 工厂，`HttpMcpOptions{fetch?, requestInit?}` 注入面为 BK-0030 预留（http.ts:18-21/:41-43）；teardown 吞 405/网络错（http.ts:36-38） | Read 亲核 |
| stdio.ts 45 行：`createStdioMcpConnection(serverId, command, args?, opts?)` 工厂，argv 直传零命令解释器；**注释明示「『白名单来源 = 注册表本身』的 env 语义面归 BK-0029（registry.ts）」**（stdio.ts:9-10）；`get pid` 测试探针（stdio.ts:37-40，非接口承诺） | Read 亲核 |
| config.ts 109 行：rawEnv 白名单 13 key（config.ts:28-32）+ EnvSchema 13 项（config.ts:49-63）；空串归一为未配置（config.ts:33-34）；fail-fast = `logger.fatal({problems}) + process.exit(1)`（config.ts:65-68）；交叉校验先例 AI_MODEL×AI_MODELS（config.ts:81-88）；URL zod 先例 `z.string().trim().url()`（config.ts:50/:58） | Read 亲核 |
| **server.ts:30 `import { config } from './config.js'`**——config 校验在服务启动链最前端（模块加载即执行 loadConfig，config.ts:109）；这是 AC2「服务启动即 fatal」的既有通道，**server.ts 零改动即可让非法 env 在启动时炸** | grep 亲核（server.ts:30/:45） |
| 内置五 id 锚点：tools.ts IMPL 键 = filesystem（tools.ts:27）/ fetch（:44）/ sqlite（:59）/ browser（:60）/ web-search（:61）；前端 MCP_SERVERS 硬编码清单零接触 | Read 亲核 |
| 冒烟基建：mcp-transport.mjs 311 行（MT01-MT12，fail-fast 运行器 + dist 前置自检 + SIGINT/SIGBREAK 清理先例）；fixtures/mock-stdio-server.mjs 65 行（stdin 关闭即自然退出，:65；工具面 echo/add 与 HTTP mock 逐字同，:16-19）；根 package.json:21 `smoke:mcp` script | Read 亲核 |
| lib.mjs 工具面：`startServer(port, opts)` 的 `opts.env` 子进程 env 覆盖表（lib.mjs:69-76，显式传值优先于 server/.env）；子进程提前退出 → 抛错附 `e.logTail`（lib.mjs:84-87）——**fail-fast 冒烟可直接复用此形态**；`Checker/SmokeFailError/getFreePort/deepEqual/sleep` 均可 import | Read 亲核 |
| Z01-Z04 独立实例先例：spawn 专用端口实例断言退出路径与日志子串（smoke-server.mjs:856-916，迭代 0019） | Read 亲核 |
| logger：pino JSON 单行到 stdout，无 transport 定制（logger.ts:10-20）——子进程捕获 stdout 即可断言 warn 固定子串（中文 UTF-8 原样输出） | Read 亲核 |
| 授权链：新增环境变量语义属 POLICY 需批准区（POLICY.md:25）→ issue#10 用户批复在案（PRD 选题存证：0023 轮 gh 亲核 state=OPEN +「批准」评论；请批清单第 ③ 项字面承载 MCP_HTTP_SERVERS/MCP_STDIO_SERVERS 两 env）；非修宪轮，全程禁 gate:update | POLICY.md + ADR-0012 附录 A 亲核 |

## 2. REQ-0024-01 三项定稿（SPEC 落笔前置义务，PRD 风险 1/2 对策）

### 2.1 env 形态枚举表 + 非法值清单 + 解析规则（风险 1）

**语法（两 env 共同骨架）**：

```
MCP_HTTP_SERVERS  = 条目 { "," 条目 }*
MCP_STDIO_SERVERS = 条目 { "," 条目 }*
HTTP 条目          = name "=" URL
stdio 条目         = name "=" command { 空白 参数 }*
name              = [A-Za-z0-9_-]+          （覆盖内置 web-search 连字符形态）
URL               = http://… 或 https://… 绝对 URL
```

**解析规则（从窄、不猜测，逐条定序）**：

1. 整值 trim；trim 后为空 = 未配置（沿 config.ts「空字符串一律视为未配置」语义，
   config.ts:6/:33-34——`""` 与 `"  "` 等价，均不进校验）。
2. 逗号分割条目（`,` 是唯一条目分隔符）；每条目 trim。
3. 首个 `=` 分割 name / 值；值内后续 `=` 归值（URL query、stdio 参数不受影响）。
4. HTTP：值即 URL 整串，须为合法绝对 URL 且协议 ∈ {http, https}（zod `.url()` 判
   合法性 + 协议白名单显式判，比 SEARXNG_URL 先例（config.ts:58）再窄一步——
   registry 出站只承诺这两种协议）。
5. stdio：值按空白 `/\s+/` 分割 argv：argv[0] = command（非空）、余为 args（可为空
   数组）。空格/引号/逗号表达力边界 = ADR §7 案 A 既定取舍（复杂命令用包装脚本
   绕行）；args 含逗号会被第 2 步先切——凑巧成合法双条目时按字面解析结果执行
   （注册主权在运维，ADR §6.1），不成条目则落入 E1 fail-fast。

**非法值枚举表（E1-E9，全部 fail-fast，退出码 1）**：

| # | 形态 | 示例 | 判定 |
| --- | --- | --- | --- |
| E1 | 条目无 `=` | `foobar` | fail-fast |
| E2 | name 空 | `=https://h/mcp` | fail-fast |
| E3 | name 含非法字符（非 `[A-Za-z0-9_-]`） | `a.b=url`、`a b=cmd` | fail-fast |
| E4 | 值空 | `name=` / `name=   ` | fail-fast |
| E5 | 空条目（含尾逗号/连续逗号） | `a=url,` / `a=cmd,,b=cmd2` | fail-fast（空段不忽略、不猜测） |
| E6 | URL 非法或协议非 http/https | `name=notaurl` / `name=ftp://x` | fail-fast（仅 MCP_HTTP_SERVERS） |
| E7 | stdio command 缺失 | `name=  `（同 E4 的 stdio 面） | fail-fast（仅 MCP_STDIO_SERVERS） |
| E8 | 同 env 内 name 重复 | `a=url1,a=url2` | fail-fast（歧义不猜测） |
| E9 | 跨 env name 重复 | HTTP 有 `a` 且 STDIO 也有 `a` | fail-fast（config 交叉校验，沿 AI_MODEL×AI_MODELS 先例 config.ts:81-88） |

E1-E8 在**字段内校验**（zod superRefine 逐 issue，problems 指明变量名 + 条目序号 +
原因）；E9 在 **loadConfig 交叉校验段**（两 env 各自合法但同名冲突时 fail）。

**合法正例**（冒烟断言面）：
`MCP_HTTP_SERVERS="searxng=https://gw.internal/mcp, echo-http=http://127.0.0.1:9/mcp"` →
2 条 HTTP 注册；`MCP_STDIO_SERVERS="sql=npx --yes @modelcontextprotocol/server-sqlite"`
→ 1 条 stdio 注册（command=`npx`，args 2 项）。

### 2.2 冲突 warn 固定子串字面量（AC3）

```
外部 MCP 注册名与内置 id 冲突
```

- 载体：`logger.warn({ serverId, kind }, '外部 MCP 注册名与内置 id 冲突，已拒绝该注册（内置 id 保留给画布内置 server）')`
  ——固定子串=前 14 字（`外部 MCP 注册名与内置 id 冲突`），后续逗号分句供人读，
  冒烟只断言固定子串 + serverId 字段。
- 语义边界（与 fail-fast 不混淆，PRD 做 3）：格式错（E1-E9）= fatal 退出 1；语义
  冲突（name ∈ 内置五 id）= **warn + 拒绝该条 + 进程继续**，其余合法注册不受影响。

### 2.3 发现缓存生命周期口径（风险 2）

**进程级 tools/list 快照缓存，发现即关，v1 无失效 API**：

- 缓存条目 = `Map<serverId, McpToolInfo[]>`（快照，非连接）。
- `discoverTools(serverId)` 未命中 → 建连 → connect → listTools → **close()（finally
  必达，立即拆链）** → 存快照 → 返回；命中 → 直接回快照（零连接零出站，PRD 做 4
  「命中免重连」）。stdio 无孤儿面由「发现即关 + connection.ts connectAttempted
  语义」双保险承接（§1 第一行证据）。
- 失效口径：v1 不提供失效/TTL API——进程生命周期即缓存生命周期，server 端清单变更
  本进程内不可见，运维手段 = 重启进程（注释写明，防过度设计，PRD 风险 5 同源）。
  BK-0030 消费侧若需 per-run 失效再扩展（ADR §6.1「随 run 惰性连接」的连接复用
  语义由 BK-0030 定义，本项只交付清单快照缓存）。
- 未知 serverId：`throw new Error('未注册的 MCP server: <id>')`（如实报错不伪造，
  沿 tools.ts:4-5 原则）。

## 3. 技术方案

### 3.1 `apps/server/src/mcp/registry.ts`（新增 · ≤200 行，ADR §8 预算）

```ts
import { createHttpMcpConnection } from './http.js';
import { createStdioMcpConnection } from './stdio.js';
import type { McpConnection, McpToolInfo } from './connection.js';
import { logger } from '../logger.js';

/* ---- 注册表条目（plain data：传输构造参数的载体） ---- */
export interface HttpServerEntry  { kind: 'http';  serverId: string; url: string }
export interface StdioServerEntry  { kind: 'stdio'; serverId: string; command: string; args: string[] }
export type McpServerEntry = HttpServerEntry | StdioServerEntry;

/* ---- 纯解析（零 IO；config.ts zod 复用 + 冒烟直测同一实现，零漂移） ---- */
export function parseHttpServersSpec(spec: string):  { entries: HttpServerEntry[];  problems: string[] }
export function parseStdioServersSpec(spec: string): { entries: StdioServerEntry[]; problems: string[] }

/* ---- 内置五 id（字面常量；来源锚 tools.ts IMPL 键 + ADR §6.3；冒烟 MR09 防漂移） ---- */
export const BUILTIN_MCP_IDS: readonly string[] = ['filesystem','fetch','sqlite','browser','web-search'];

/* ---- BK-0014 loaders 扩展点（ADR §9）：仅函数签名 + v1 唯一成员，不设抽象基类/注册机制 ---- */
export interface McpRegistrySources { mcpHttpServers?: string; mcpStdioServers?: string }
export type McpServersLoader = () => McpRegistrySources;
export const envLoader: McpServersLoader = /* 读 process.env 两 key，空串归一（config.ts:33-34 同语义） */;

/* ---- 注册表构建（语义层：冲突拒绝 warn+skip；格式合法性由 config zod 前置保证） ---- */
export interface BuildRegistryOptions { warn?: (fields: { serverId: string; kind: string }, msg: string) => void }  /* 缺省 logger.warn */
export function buildMcpRegistry(sources: McpRegistrySources, opts?: BuildRegistryOptions): McpRegistry

export class McpRegistry {
  readonly entries: readonly McpServerEntry[];
  has(serverId: string): boolean;
  discoverTools(serverId: string): Promise<McpToolInfo[]>;   /* §2.3 口径 */
  /* 测试探针面（非接口承诺，生产代码不得依赖；stdio.ts get pid 同型先例） */
  discoveryCount(serverId: string): number;                  /* 建连尝试次数（缓存命中断言） */
  stdioPidOf(serverId: string): number | null | undefined;   /* 最近一次 stdio 发现的子进程 pid（close 前记录；孤儿断言沿 MT09 探针形态） */
}
```

- **建连分发**：`discoverTools` 按 entry.kind 构造连接（http → `createHttpMcpConnection
  (serverId, url)`；stdio → `createStdioMcpConnection(serverId, command, args)`），
  `try { await conn.connect(); return await conn.listTools(); } finally { await conn.close(); }`
  ——超时继承 BK-0028 默认（10s），不自制定时器（PRD 非功能 3）；connect/listTools
  失败原样向外抛（如实报错），快照不缓存失败结果。
- **冲突拒绝实现**：buildMcpRegistry 逐条目判 `BUILTIN_MCP_IDS.includes(serverId)`
  → 命中即 warn（§2.2 字面量）+ 跳过；不进 entries。
- **防御性**：parse 出 problems 非空（理论不可达——config 已前置校验；冒烟直调除外）
  时 buildMcpRegistry 直接 throw problems（不静默吞）。
- **行数预估**：~160-190 行（含注释），预算 ≤200 达标。

### 3.2 `apps/server/src/config.ts` 扩展（109 → ≤130 行，ADR §8 预算）

1. rawEnv 白名单数组（config.ts:28-32）追加 `'MCP_HTTP_SERVERS', 'MCP_STDIO_SERVERS'`。
2. EnvSchema 追加两项（E1-E8 字段内校验）：

```ts
import { parseHttpServersSpec, parseStdioServersSpec } from './mcp/registry.js';
/* …… */
MCP_HTTP_SERVERS: z.string().superRefine((v, ctx) => {
  const { problems } = parseHttpServersSpec(v);
  for (const p of problems) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p });
}).optional(),
MCP_STDIO_SERVERS: z.string().superRefine((v, ctx) => {
  const { problems } = parseStdioServersSpec(v);
  for (const p of problems) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p });
}).optional(),
```

   problems 消息形如 `条目 2：name 缺失（无 "="）`——config 既有 fail 输出
   `MCP_HTTP_SERVERS="…"：条目 2：name 缺失…`（config.ts:74-77 拼装先例），AC2
   「指明变量名与原因」由既有 problems 通道直接满足。
3. loadConfig 交叉校验段（config.ts:81-88 之后）追加 E9：两 env 均提供时解析出的
   name 集合交集非空 → `problems.push(...)` → `fail(problems)`。
4. 返回对象**不新增字段**（两原始串不入 AppConfig——registry 消费方（冒烟/BK-0030）
   走 envLoader 自取，config 只承担「非法值挡在启动时」的校验职责；避免 config 返回
   面与 registry 数据结构耦合）。

- **依赖方向（单向，无环）**：`config.ts → mcp/registry.ts → {mcp/http.ts,
  mcp/stdio.ts, logger.ts} → SDK`。registry **不** import config.js（沿 0023 SPEC
  §4 边界：mcp/ 模块不 import config）；config 也不被 mcp/ 反向引用。registry 顶层
  import http/stdio 工厂使 config 启动链传递加载 SDK——BK-0028 已引入该依赖，
  无新增安装面；registry 解析函数纯字符串处理，无 zod schema 互传（v3/v4 双实例
  陷阱不触发，ADR §4 口径延续）。

### 3.3 基线不变式（AC1）

两 env 均未配置：parse 不触发（undefined 短路）、交叉校验跳过、config 返回对象
字段零变化、registry 空（envLoader 返回空 sources → buildMcpRegistry 得 0 条目）
——**全系统行为与现状逐字节一致**；既有 smoke:server / smoke:mcp / npm test 全绿
即为回归证据，另有 MR11 空注册表基线断言。

## 4. 模块边界（边界不变式，AC5/AC7）

```
apps/server/src/mcp/registry.ts   import：./http.js、./stdio.js、./connection.js（类型）、
                                   ../logger.js —— 仅此四项
apps/server/src/config.ts         新增 import：./mcp/registry.js（仅 parse 两纯函数）
```

- **registry 禁止 import**：`../config.js`（数据经参数传入，防环）、`../tools.js`、
  `../guard.js`、`../llm.js`、`../server.js`、`node:fs`、`node:child_process`
  （spawn 面只有 createStdioMcpConnection 内部的 SDK 直 spawn；registry 零生产
  出站路径——PRD 非功能 2，真实 endpoint 收口归 BK-0030）。
- **零生产消费方**：任何既有生产模块（llm/tools/engine/handlers/server/sessions/
  store/guard 等）**不 import** `./mcp/registry.js`——本轮 registry 的唯一消费者
  是 `tests/smoke/mcp-registry.mjs`（经 dist）与 config.ts 的两纯函数引用。
- **mcp/ 既有三文件零改动**；connection/http/stdio 仅被 import 消费（AC5 的
  `git diff` 机器核对对象）。
- **零 shared 契约、零 UI**：`packages/shared/**`、`apps/web/**`、
  `tools/pixel-gate/**`、`.github/**`、`tests/golden/**` 零接触（ADR §9；前端
  MCP_SERVERS 清单动态化归 BK-9006 修宪，不为本轮前提）。
- **env 语义面恰两项**：不新增第三种 env、不引入配置文件面（B/C 案归 BK-0014，
  ADR §7 既定取舍，PRD 非功能 4）。

## 5. 冒烟设计（AC2/AC3/AC4 的验收载体 · REQ-0024-03）

### 5.1 落位（SPEC 定稿，PRD 留白点）

| 文件 | 动作 | 预算 | 角色 |
| --- | --- | --- | --- |
| `tests/smoke/mcp-registry.mjs` | 新增 | ≤400 | 独立冒烟入口（`npm run smoke:mcp:registry`；**不并入** mcp-transport.mjs——被测对象不同（registry+config vs 传输层），并入须改 MT12 源扫描面违其零改动白名单；**不并入** smoke-server.mjs——规避 V09 时点性假红面 + spawn 子进程独立清理（PRD 风险 4；mcp-transport.mjs 独立文件先例） |
| 根 `package.json` | +1 行 | +1 | `"smoke:mcp:registry": "node tests/smoke/mcp-registry.mjs"` |

结构：复用 lib.mjs 的 `Checker/SmokeFailError/getFreePort/deepEqual/sleep` +
`startServer(port, { env })` 的 boom/logTail 形态（§1 证据：lib.mjs:69-87）；
fail-fast 运行器 + finally 清理 + SIGINT/SIGBREAK exit 130（mcp-transport.mjs
头注同款）；汇总 `==== smoke:mcp:registry：X passed / Y failed ====`，退出码
failed===0?0:1。前置自检：`dist/mcp/{connection,http,stdio,registry}.js` +
`dist/server.js` + `dist/tools.js` 在位，缺失即全量 FAIL 并给「先
npm run build:server」指引（mcp-transport.mjs:141-148 / M01 先例，不静默跳过）。

### 5.2 mock 面（复用 BK-0028 fixtures 的接线图，PRD 做 6）

- **stdio**：直接复用 `tests/smoke/fixtures/mock-stdio-server.mjs`（零改动）——
  registry 条目 `mock-stdio = <process.execPath> <fixtureAbsPath>`；工具面
  echo/add 与断言 EXPECT_TOOLS 同 mcp-transport.mjs:98-101（逐字）。
- **HTTP**：文件内自带精简进程内 mock（node:http，startMockModel/startMockHttpMcp
  同法，SPEC 注释标注同源）——只需 `initialize`（echo protocolVersion + 会话头）/
  `tools/list`（echo/add）两路由 + 逐请求计数（缓存命中的「initialize 请求数不增」
  双保险断言源），无 tools/call/延迟路由；~40 行。
- **冲突 warn 默认路（MR06）**：spawn `node --input-type=module -e`（pathToFileURL
  import dist/mcp/registry.js → buildMcpRegistry 带冲突源 → console.log 完成标记），
  捕获 stdout 断言 pino warn 行含固定子串、退出码 0（AC3「进程不退出」）。

### 5.3 断言清单（MR 组 · 11 条）

| ID | 断言（expected） | 对应 AC |
| --- | --- | --- |
| MR01 | 前置：dist 六产物在位（mcp 四 js + server.js + tools.js） | 前置 |
| MR02 | fail-fast 端到端（HTTP）：`startServer(port, { env: { MCP_HTTP_SERVERS: 'no-equal-sign' } })` → 子进程提前退出 code=1，logTail 含 `MCP_HTTP_SERVERS` 与「环境变量配置错误」 | AC2 |
| MR03 | fail-fast 端到端（stdio + E8）：`MCP_STDIO_SERVERS='a=node x,a=node y'` → code=1，logTail 含 `MCP_STDIO_SERVERS` 与重复 name 原因 | AC2 |
| MR04 | 形态枚举全覆盖（进程内直测 parse 两纯函数，import dist/mcp/registry.js）：E1-E8 逐形态 problems 非空且含期望关键词；合法正例（§2.1 两例）entries 结构精确 deepEqual（kind/serverId/url/command/args） | REQ-01 |
| MR05 | 冲突拒绝（注入路）：`buildMcpRegistry({ mcpStdioServers: 'sqlite=node a,good=node b' }, { warn: collector })` → entries 恰 1 条（good）、sqlite 不在；collector 消息含固定子串 + fields.serverId='sqlite'；进程继续（无异常） | AC3 |
| MR06 | 冲突拒绝（默认 logger 路）：spawn 独立 node -e 带 `fetch=http://…` 冲突源 → stdout 含 pino warn 固定子串「外部 MCP 注册名与内置 id 冲突」、退出码 0 | AC3 |
| MR07 | HTTP 发现 + 缓存：registry（HTTP 条目 → 进程内 mock）discoverTools('mock-http') → 与 EXPECT_TOOLS deepEqual；再次 discoverTools → 结果 deepEqual + discoveryCount===1 + mock initialize 请求数仍 1（命中免重连） | AC4 |
| MR08 | stdio 发现 + 缓存 + 无孤儿：stdio 条目 discoverTools → EXPECT_TOOLS deepEqual + discoveryCount===1；`stdioPidOf` 取 pid → close 后 process.kill(pid,0) 轮询（50ms×40 上限 2s）至进程退出（沿 MT09 探针形态，assertNoOrphan 同法） | AC4 |
| MR09 | 内置清单防漂移：import dist/tools.js 的 `IMPL` 键集排序 deepEqual registry 导出 `BUILTIN_MCP_IDS` 排序（五 id 单一事实源机器锚） | AC3 |
| MR10 | 源扫描（AC7 机器化）：readFileSync `src/mcp/registry.ts` + `src/config.ts`，`/shell/` 零命中（与 MT12 互证；MT12 自身维持三文件面零改动） | AC7 |
| MR11 | 空注册表基线：envLoader（两 env 未设）→ buildMcpRegistry 0 条目、has() 恒 false；discoverTools('any') → reject 含「未注册的 MCP server」（AC1 空注册表零副价的直接断言） | AC1 |

## 6. 受影响文件清单（= 产品提交白名单 · SPEC 定稿，PRD 表定稿确认）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `apps/server/src/mcp/registry.ts` | 新增 | ≤200（ADR §8） |
| `apps/server/src/config.ts` | +2 env key + 2 zod 项 + E9 交叉校验 + 1 import | 109 → ≤130（ADR §8） |
| `tests/smoke/mcp-registry.mjs` | 新增 | ≤400 |
| 根 `package.json` | +1 script 行 `smoke:mcp:registry` | +1 |

零改动白名单（AC5/AC6 机器核对对象）：`apps/server/src/mcp/` 既有三文件
（connection/http/stdio——仅被 import）、`apps/server/src/` 其余全部既有模块
（tools/llm/guard/engine/handlers/server/sessions/store/search/code/kb/expr/
providers/logger/types/util/approval-review）、`apps/server/package.json` 与
`package-lock.json`（零新依赖——SDK 已由 BK-0028 引入）、`tests/smoke/` 既有
全部文件（smoke-server.mjs / mcp-transport.mjs / mcp-stubs.mjs / lib.mjs /
shutdown-sigterm.mjs / fixtures/mock-stdio-server.mjs）、`packages/shared/**`、
`apps/web/**`、`tools/pixel-gate/**`、`.github/**`、`tests/golden/**`、
`tests/canvas/**`。

## 7. 验收口径（命令 + 手动 E2E 点位）

命令组（BUILD 完成标准 = 以下全绿；每条注明核对面）：

| # | 命令 | 全绿判据 | 对应 AC |
| --- | --- | --- | --- |
| A | `npm run build` | exit 0（shared+web 不受影响） | AC6 |
| B | `npm run build:server` | exit 0（registry.ts 编译过，config→registry 依赖方向成立） | AC1 |
| C | `npm run gate` | 8 场景 diffPx=0（UI 零接触的反证；非修宪轮禁 gate:update） | AC6 |
| D | `npm test` | shared 契约测试 exit 0（零 DEFS 漂移） | AC6 |
| E | `npm run smoke:server` | 既有全部组零回退、exit 0（两 env 未配置时行为逐字节一致的回归证据） | AC1/AC6 |
| F | `npm run smoke:mcp` | MT01-MT12 既有组零回退、exit 0 | AC6 |
| G | `npm run smoke:mcp:registry` | MR01-MR11 全 passed、exit 0 | AC2/AC3/AC4/AC7 |

手动 E2E 点位（VERIFY 阶段逐条执行并贴证据，REPORT 载体）：

1. `wc -l apps/server/src/mcp/registry.ts apps/server/src/config.ts
   tests/smoke/mcp-registry.mjs` → 逐文件 ≤ 预算表（AC1/§6）。
2. `git diff -- apps/server/src`（产品提交后 `git show --stat`）→ 改动恰为新增
   registry.ts + config.ts 两 env 项；mcp/ 既有三文件与 llm/tools/guard/engine/
   handlers/server 等零改动；`git diff -- packages/shared apps/web tools/pixel-gate
   .github` 恒空（AC5）。
3. `grep -n "shell" apps/server/src/mcp/registry.ts apps/server/src/config.ts` →
   无命中（AC7 手工复核，与 MR10 互证）。
4. 真 env 冒烟抽验（可选加分项，不阻塞）：本机 shell 设
   `MCP_STDIO_SERVERS='demo=node <fixture 绝对路径>'` 启动 `npm start` → 服务正常
   起（冲突拒绝不炸）→ 停止；再设非法值 `MCP_HTTP_SERVERS='bad'` 启动 → fatal
   退出 1（MR02/03 已机器覆盖，此项为人工体感复核）。
5. 产品提交恰一个（Conventional Commits，建议 `feat(server): BK-0029 外部 MCP
   server 注册表与工具发现——env 白名单解析 + 冲突拒绝 + 发现缓存`），
   `git show --stat` 路径 ⊆ §6 白名单（AC6）。
6. 新文件 EOL 检查：LF、UTF-8 无 BOM（PRD 非功能 7）。
7. 冒烟后进程卫生：MR08 孤儿断言全绿 + `tasklist | findstr node`（win32）人工抽查
   无异常残留 node。

## 8. 回滚口径（PRD 非功能 6）

纯新增（1 TS 新文件 + 1 冒烟 + config.ts 两 env 项 + 1 script 行），无数据迁移、
无契约改动、无依赖变化——`git revert <产品提交>` 即完全回退；冒烟子进程经
MR08 探针面与 finally 收口不残留。

## 9. 架构决策处置（needsAdr=false）

- **无新架构决策**：env 方案 A（ADR §7，issue#10 请批清单 ③ 字面授权）、registry
  定界与 ≤200 行预算（ADR §8）、冲突拒绝口径（ADR §6.3）、loaders 预留（ADR §9）
  均已定案；本文 §2 三项定稿均属 PRD REQ-0024-01 明文委托 SPEC 落笔的实施细节
  （解析规则/warn 字面量/缓存口径），不构成改选或新决策面。
- **一处登记性说明**：ADR §6.3 原文「config zod 校验拒绝 + 启动 warn」——本文落
  地为「格式错（E1-E9）= config zod fatal；语义冲突 = registry 层 warn + 拒绝该条，
  进程不退出」。这与 PRD 做 3 的定界（「不与 fail-fast 混淆——格式错是 fatal、
  语义冲突是 warn+拒绝该条」）逐字一致、且是 ADR 文字的忠实细化（ADR 未展开两级
  边界，PRD 已按 AC3 展开），不构成冲突，无需 ADR 修订；VERIFY 若对此有异议按
  「PRD/ADR 为准」顺位处置。
