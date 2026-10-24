# ADR-0012 · 真 MCP client 传输选型与依赖方案（stdio / Streamable HTTP）

- 状态：**已批准（issue #10 用户「批准」批复，2026-10-24；证据链见
  `docs/evolution/iterations/0023/PRD.md` 选题存证——PLAN 轮 gh 亲核）·
  BK-0028 实施中（迭代 0023）；BK-0029/0030 ready 待序**
- 日期：2026-10-24（SPEC 阶段产出，迭代 0017 / BK-0027）
- 关联：BACKLOG BK-0027（本 SPEC 先行轮）/ BK-0028~0030（三实施子项，proposed）/
  BK-0013（skipped，拆分母项）/ BK-0014（扩展发现器，下游）/ BK-9006（issue #6，
  前端清单动态化，触 UI 待批复）；ROADMAP T5-M1「runtime 承重墙」；
  POLICY.md 需批准区「新增 npm 依赖、新增出站网络目标类别、新增环境变量语义」
- 调研时点：2026-10-24（联网调研，来源清单见 §5；**实施轮 SPEC 必须复核时效**——
  MCP 协议与 SDK 演进快，本文结论以调研日为有效期起点，BK-0028 实施 SPEC 落笔时
  逐项复验版本号与 API 面）
- 版式对齐：ADR-0009 / ADR-0011

> **显著声明：本 ADR 为技术选型草案，不实施任何代码、不引入任何依赖、不改变任何
> 运行时行为。全部「新增 npm 依赖 / 新增出站类别 / 新增 env 语义」仅以文字方案
> 存在；三子项 BK-0028~0030 维持 proposed，转 ready 的唯一条件 = 对应
> needs-approval issue 获用户本人批复。**

## 1. 动机与现状证据

T5 主题的差异化定位是「画布编排 × 深度智能体工作台」，而当前画布上的「MCP 服务器」
是五个**内置伪 server**：

- 后端 `IMPL` 为写死映射（`apps/server/src/tools.ts:26-73`）：filesystem / fetch /
  web-search 有内置实现；sqlite（`tools.ts:59`）与 browser（`tools.ts:60`）为
  `null`，由 `stubOf`（`tools.ts:81-85`）如实降级 "not implemented"。**不存在任何
  外部 MCP server 连接代码**（无 stdio spawn、无 MCP HTTP client）。
- 前端 `MCP_SERVERS` 五项写死（`apps/web/src/legacy/app.js:103-114`，`:102` 注释
  自认「原型模拟数据」）；节点属性面板的能力勾选清单即由此渲染（动态化触 UI，
  归 BK-9006 / issue #6，本 ADR 与实施轮均不以此为前提）。
- 工具装配链：`collectTools(mcpSel)` 把节点勾选展开为 `{server.tool: impl}`
  （`tools.ts:104-116`——IMPL 没有的工具落 stub）；消费点在 `llm.ts:9`（import）
  与 `llm.ts:38`（调用，位于 async handler 内——外部工具发现的异步化无结构性障碍）。

竞品对照（PRD 背景 8 转录）：ComfyUI 无 MCP 概念；n8n / Langflow / Dify 均已提供
MCP 节点或触发器（以远程 HTTP 集成为主）；Claude Code / Cursor 等 agent 工作台把
MCP 作为工具生态一等公民（项目级 .mcp.json / 全局注册，以本地 stdio 进程为主）。
真 MCP client 是不做重生态共建的前提下接入存量工具生态（数以千计 MCP server）的
唯一桥梁。

## 2. 传输选型对比矩阵

评估口径：每维度以「本仓既有约束与先例」为参照系打分（实现面=需新写的代码形态；
安全面=需收口的风险入口；集成复杂度=与 16 节点引擎既有装配链/生命周期的咬合量）。

| 维度 | stdio（本地子进程） | Streamable HTTP（远程端点） |
| --- | --- | --- |
| 1 · 适用场景与生态 | 本地进程生态：`npx`/命令行 MCP server（Claude Code .mcp.json 同款）；存量最大的工具分发形态 | 远程服务生态：团队自建网关（如 SearXNG MCP）、云托管 MCP 服务；n8n/Dify 类集成场景 |
| 2 · 依赖与实现面 | SDK 子路径 `@modelcontextprotocol/client/stdio`（StdioClientTransport）；本仓新增代码≈传输构造+进程生命周期管理 | SDK 主入口（Client + StreamableHTTPClientTransport）；本仓新增代码≈传输构造+guard fetch 注入 |
| 3 · 安全面 | **最重**：在服务器 spawn 外部命令——命令注册白名单 + 超时 + 生命周期强约束（须对齐 AGENTS.md 硬性约定 3「代码节点必须子进程+超时」同等强度，先例 `code.ts:50-53`）；子进程自身网络行为不可控（风险声明见 §6.3） | 向用户配置的 URL 发 HTTP POST——SSRF 面，经 `guard.ts` 网关收口（先例 `searxngSearch` 动态主机网关 `guard.ts:93-100`）；内网 server 走 `ALLOW_PRIVATE_NET=1` 逃生（guard.ts:39-40 既有口径） |
| 4 · 运维与配置面 | 每个 server 一条命令注册（env 白名单形态，§7）；进程随 run 启停，无常驻运维 | 每个 server 一个 endpoint URL（env 注册表）；无进程管理，运维最轻 |
| 5 · 与 16 节点引擎集成复杂度 | 高一档：子进程生命周期绑定 run（中止级联 kill）、Windows/CI 进程行为多一层；可测性=冒烟 spawn node 子进程 mock（有 code.ts 先例） | 低一档：无进程面；可测性=进程内 node:http mock MCP endpoint（与 smoke 既有 OpenAI 兼容 mock 同法，`tests/smoke/smoke-server.mjs` G 组先例） |
| 6 · 协议演进暴露度 | 新line-delimited JSON-RPC over stdin/stdout，帧格式稳定（2026-07-28 修订：自定义字节流传输 SHOULD 复用 stdio 帧） | 12 个月三改：HTTP+SSE（2024-11-05，已废弃）→ Streamable HTTP（2025-03-26，引入会话头/GET 流）→ 2026-07-28（去 GET 流、去协议级会话、必备元数据头 MCP-Protocol-Version/Mcp-Method/Mcp-Name、x-mcp-header 参数镜像 + Base64 sentinel 编码、MRTR）——演进负担必须由 SDK 承担，不可自担 |

## 3. 传输结论：两者都做，统一抽象承载，Streamable HTTP 先行

1. **两者都做**，且都在 BK-0028（传输层）单项内落地：用户故事的两类场景（本地
   mcp-server-sqlite / 团队 SearXNG 网关）分别依赖两种传输；只做其一即自我设限
   工具生态。统一抽象下第二传输的增量小（见下），不构成拆两项的理由。
2. **统一抽象**——`McpConnection` 连接层接口（模块草图见 §8）：

   ```ts
   interface McpConnection {
     readonly serverId: string;
     connect(timeoutMs?: number): Promise<void>;    // SDK connect() 内含 initialize 握手
     listTools(timeoutMs?: number): Promise<McpToolInfo[]>;  // { name, desc, inputSchema }
     callTool(name: string, args: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
     close(): Promise<void>;   // HTTP：transport.terminateSession() + client.close()；
                               // stdio：client.close()（SDK 负责结束子进程）
   }
   ```

   两种传输只是 `McpConnection` 的两个构造分支（`http.ts` / `stdio.ts`）；上层
   （registry / 注入层）对传输类型无感知。
3. **验收次序 Streamable HTTP 先行，stdio 紧随同项**：① guard 网关收口有直接先例
   （searxngSearch），安全评审路径最短；② 可测性最优（进程内 mock，零子进程
   不可控面）；③ 团队网关场景（用户故事 1 后半）先通。stdio 安全面更重，在统一
   抽象已落地后作为第二传输追加，其 spawn 白名单约束按 §6.1 独立验收。

## 4. 依赖选型

候选三案对比（协议面清单 = 客户端须实现/随附的能力：initialize 握手 / capabilities
协商 / tools/list / tools/call / notifications / 协议版本协商与向后兼容回退 /
2026-07-28 起 Streamable HTTP 的元数据头镜像与 Base64 sentinel 编码 / SSE 响应解析）：

| 候选 | 要点 | 评估 |
| --- | --- | --- |
| A · 官方 SDK v2 拆分包 `@modelcontextprotocol/client` ^2.4 | Apache-2.0 · ESM-only（type:module）· node ≥20 · 无 peerDependencies · 直接依赖 7 项（zod ^4.2.0、jose、cross-spawn、eventsource、eventsource-parser、pkce-challenge、@modelcontextprotocol/core） | **推荐**。client-only 面（不拖 server 侧件）；v2 为当前主线（2026-07-27 发布）；依赖树小且全为运行必需 |
| B · 官方 SDK v1 `@modelcontextprotocol/sdk` ^1.32 | MIT · ESM · node ≥18 · peerDependencies **zod ^3.25 ‖ ^4.0（required）** · 直接依赖 17 项（express ^5.2.1、hono、cors、express-rate-limit、ajv、raw-body、@hono/node-server 等，多为 server 侧传输件） | 不推荐：① v1 进入维护尾巴（官方 README：v2 发布后至少 6 个月 bug fix/安全更新 → 约 2027-01-27 止）；② client 场景全数拖入 server 侧依赖；③ peer 区间与本项目 `apps/server` zod floor `^3.24.0`（安装 3.25.76）不合——锁 3.24.x 装机即 peer 违例，须抬 floor |
| C · 手写最小 JSON-RPC client | 零新依赖；实现 initialize/tools/list/tools/call 约 200~300 行 | 拒绝：协议 12 个月三改（§2 维度 6），版本演进负担全部自担；向后兼容回退矩阵（initialize 时代 ↔ 现代版本探测）与 header 镜像规则的边界 case 量远超表面协议面；SDK 体积成本（7 个传递依赖）相对可接受 |

兼容性核验（本仓构建链，2026-10-24 实查）：

- **ESM + tsc**：`apps/server` 已是 `"type":"module"`（package.json:4）且 tsconfig
  `module/moduleResolution: NodeNext`（tsconfig.json:4-5）；既有 ESM-only 依赖
  `ai@7`（安装 7.0.146）+ `@ai-sdk/openai-compatible` 已在同链运行（ADR-0004）——
  ESM-only SDK 无新增构建风险。SDK README 注记「TypeScript ≥6.0 需 tsconfig
  `types:["node"]`」对本案 typescript ^5.9.3（apps/server devDeps）不触发，TS 大版本
  升级时复核。
- **Node 版本**：node ≥20 要求——本机 dev node v24.21.0（实查）、Docker 运行时
  node:22（ADR-0011 §2 引 README），均满足。
- **zod 双实例**：案 A 的 zod ^4.2.0 为 SDK 直接依赖（非 peer），与本仓 zod 3.25.76
  嵌套共存；本仓 zod 3 schema 只进 AI SDK `tool()`（`llm.ts:54`），SDK 的 zod 4
  只在其内部解析协议消息——无 schema 互传面，双实例陷阱不触发。若未来需把 SDK
  返回对象喂给本仓 zod 3 API，实施轮再评估。
- **guard 收口注入点**：v1.x 传输构造支持 `{ fetch, requestInit }` 选项（SDK 源码
  src/client/streamableHttp.ts + issue #495 在案）；v2 文档 connect 页未展示构造
  选项面——**实施轮 SPEC 必须复核 v2 `StreamableHTTPClientTransport` 的自定义
  fetch 注入点**；若缺失，回退方案 = 复用 `guardedFetch` 直接包装出站（放弃
  transport 级注入）或降级选 v1（接受其依赖树代价），以复核结论为准。
  【SPEC 复核 2026-10-25（迭代 0023 SPEC）：v2.4.0 实有 `fetch?: FetchLike`
  注入点（tarball dist/index.d.mts 类型亲核），回退案不启用；详见
  `docs/evolution/iterations/0023/SPEC.md` §2-V5/V6。】

## 5. 调研记录（日期与来源，2026-10-24 查询）

| 事实 | 来源 |
| --- | --- |
| v1 `@modelcontextprotocol/sdk` 1.32.2：MIT / ESM / node≥18 / peer zod ^3.25‖^4.0 / 直接依赖 17 项清单 | registry.npmjs.org/@modelcontextprotocol/sdk/latest |
| v2 `@modelcontextprotocol/client` 2.4.0：Apache-2.0 / ESM / node≥20 / 无 peer / 依赖 7 项 / exports 子路径（`.`、`./stdio`、`./ext/skills`、`./validators/ajv`、`./validators/cf-worker`、`./_shims`） | registry.npmjs.org/@modelcontextprotocol/client/latest + unpkg.com/@modelcontextprotocol/client@latest/package.json |
| v2 发布 2026-07-27；v1 维护窗口 ≥6 个月；拆分包定位（client/server 分装、中间件薄适配） | github.com/modelcontextprotocol/typescript-sdk（README） |
| 协议 2026-07-28 修订：Streamable HTTP 去 GET 流/去会话/MRTR/必备元数据头/x-mcp-header 镜像与 Base64 sentinel；HTTP+SSE（2024-11-05）废弃；initialize 时代向后兼容回退 | modelcontextprotocol.io/specification/2026-07-28/basic/transports |
| v2 用法：`Client`+`StreamableHTTPClientTransport` 主入口、`StdioClientTransport` 子路径 `./stdio`、connect() 内含握手、`terminateSession()`、老 server 用 SSEClientTransport 回退 | ts.sdk.modelcontextprotocol.io/v2/clients/connect |
| v1 传输构造 `{ fetch, requestInit }` 选项（guard 注入点先例） | SDK 源码 src/client/streamableHttp.ts + github.com/modelcontextprotocol/typescript-sdk/issues/495 |

## 6. 安全边界

### 6.1 stdio：spawn 白名单 + 超时 + 生命周期（对齐 AGENTS.md 硬性约定 3 同等强度）

- **白名单来源 = 注册表本身**：可被 spawn 的命令**只有** env 注册表（§7 案 A 的
  `MCP_STDIO_SERVERS`）中登记过的 `command + args`；工作流/模型侧无法注入任意
  命令——勾选面只暴露注册过的 server。注册主权在运维（env 控制），等价于白名单
  声明。**禁任意 shell**：SDK StdioClientTransport 直 spawn（argv 数组，无 shell
  拼接）；实施轮核验不引入 `shell:true`。
- **超时**：连接/发现（connect / tools/list）10s、工具调用（tools/call）30s 硬顶
  （量级对齐既有出站动作：fetch 15s / download 20s / bocha 15s / searxng 12s，
  `tools.ts:46,:51` 与 `guard.ts:77,:85,:99`；MCP 工具普遍更重故放宽至 30s）；
  超时如实报错，不伪造结果（沿 `tools.ts:4-5` 原则）。
- **生命周期绑定 run**：子进程随 run 惰性连接、run 结束/中止时 `close()` 级联
  （先例：`sessions.ts` abortActiveSessions 停机出口、`llm.ts` ctx.ac.signal 透传）；
  不做常驻进程池（v1 简化；对照 `code.ts` 一次性子进程先例）。优雅停机 5s 宽限内
  （server.ts 停机链）强制 close。
- **子进程网络行为不可控（残余风险声明）**：外部 MCP server 进程自身的出站网络
  不经本仓 guard——这是 stdio 形态的固有属性（与 Claude Code .mcp.json 同级风险），
  缓解 = 注册主权在运维 + 本 ADR 显式声明。安全审计者按此口径评审。

### 6.2 Streamable HTTP：guard.ts 网关模式收口（对齐 searxngSearch 先例）

- **目标主机来自运维 env（非常量）**——与 SearXNG 动态主机网关同型
  （`guard.ts:88-100`）：每个 MCP endpoint URL 经 `assertPublicUrl`（`guard.ts:33-56`：
  私网/回环/链路本地/CGNAT 默认拦截 + DNS 解析核验）后请求；**内网 MCP server 走
  `ALLOW_PRIVATE_NET=1` 逃生**（guard.ts:39-40 既有口径，与本地 Ollama/SearXNG
  同一运维故事）。
- **网关函数草图（函数签名级）**：

  ```ts
  /* guard.ts 追加（BK-0030）—— MCP Streamable HTTP 出站网关：
   * 复用 guardedFetch（guard.ts:59-62）作收口内核，语义命名薄包装用于
   * 出站类别审计与将来策略区分；作为 SDK transport 的 fetch 注入（§4 注入点）。 */
  export async function mcpFetch(rawUrl: unknown, init: RequestInit = {}): Promise<Response> {
    return guardedFetch(rawUrl, init);   // assertPublicUrl + fetch；init.signal 由连接层注入 30s 硬顶
  }
  ```

- 用户查询只进入请求体（JSON-RPC params），URL 主机不可被工作流/模型侧引导——
  与固定主机网关的安全论述（guard.ts:64-68 注释）同口径的动态版。

### 6.3 与内置五 IMPL 的共存口径 + 命名冲突

- **内置五项保留为 built-in 层，零语义改动**：`IMPL`（tools.ts:26-73）与 stub 降级
  链原样保留（sqlite 真实化另有 BK-0008 承载，与本项正交）。外部 server 的发现
  结果并入 `collectTools` 之上的**动态层**，不替换 IMPL 语义：
  `collectTools`（tools.ts:104-116）由「IMPL 命中 → 内置 impl；否则 → stub」两分支
  扩为三分支「IMPL 命中 → 内置 impl；server 命中外部注册表 → 连接层动态 impl；
  否则 → stub（现状语义）」（归 BK-0030 实施）。
- **命名冲突拒绝**：外部 server 注册名不得与内置五 id（filesystem / fetch /
  sqlite / browser / web-search）冲突——config zod 校验拒绝 + 启动 warn。理由：
  内置 id 是前端清单（app.js:103-114）与 DEFS 勾选语义的锚点，外部同名将引入
  不可分辨的双源。
- **外部工具进画布的呈现归 BK-9006（触 UI，issue #6 未批复）**：实施轮不以此为
  前提。工作流经 API/导入 JSON 在 `n.mcp` 中引用外部 server id 即可生效；前端面板
  暂不显示外部清单（`capSummary` app.js:123-127 只计数不辨来源，现状兼容——
  BK-0030 实施轮核实渲染面无回归）。

## 7. env 语义方案选项（stdio 白名单承载，均属需批准面）

| 方案 | 形态 | 评估 |
| --- | --- | --- |
| **A · env 白名单注册表（推荐）** | `MCP_HTTP_SERVERS="name1=https://host/mcp,name2=…"`；`MCP_STDIO_SERVERS="name1=npx --yes @modelcontextprotocol/server-sqlite --db-path …,name2=…"`（值为命令+参数，空格分隔） | 与 config.ts 全 env 风格一致（config.ts:28-35 现有 13 变量）；零新文件面；运维故事同 SEARXNG_URL；zod fail-fast（config.ts:49-63 先例）。缺点：复杂 args（含空格/引号）表达力弱——登记复杂命令时用包装脚本绕行 |
| B · 配置文件注册表 | `apps/server/mcp.config.json`（不入库 + `.example` 模板，.env 同款处理） | args 结构化（数组）；但新增文件面、加载顺序与沙箱外读文件先例需另议 |
| C · 两者并存（env 优先） | A + B 双源 | 灵活但双源冲突校验复杂，v1 无必要 |

**推荐 A 起步**：最小需批准面（恰两项新 env）；B/C 留给 BK-0014（扩展发现器）时代
随「注册源 loaders」扩展点一并评估（§8 预留）。转 ready 前提 = issue 获批（附录 A
请批清单第 ③ 项）。

## 8. 三子项定界索引 + 模块划分草图

定界四要素（受影响文件/验收口径/依赖关系/需批准面）的**权威字面量**见
`docs/evolution/iterations/0017/SPEC.md` §7 的 BACKLOG 回写模板（REQ-0027-02 载体）；
本节为模块划分草图（新增文件名建议 + ≤400 行约束拆分预判）：

```
apps/server/src/mcp/            （BK-0028~0030 新增目录）
  connection.ts   ≤200 行   McpConnection 接口（§3）+ SDK Client 封装 + 超时/abort 合成
  http.ts         ≤150 行   Streamable HTTP 传输构造（mcpFetch 注入、terminateSession 拆链）
  stdio.ts        ≤150 行   stdio 传输构造（注册表白名单读取、run 级生命周期）
  registry.ts     ≤200 行   env 注册表解析（loaders 扩展点预留 BK-0014）+ 内置名冲突
                            校验 + tools/list 发现缓存
guard.ts          100 → ≤130 行   +mcpFetch 网关函数（BK-0030）
tools.ts          116 → ≤150 行   collectTools 三分支动态层（BK-0030）
llm.ts            122 → ≤140 行   :38 注入点异步接线（BK-0030）
config.ts         109 → ≤130 行   +MCP_HTTP_SERVERS/MCP_STDIO_SERVERS zod（BK-0029）
apps/server/package.json        +1 依赖 @modelcontextprotocol/client（BK-0028）
```

实施顺序：**BK-0028（传输层：HTTP 先行 + stdio 同项）→ BK-0029（注册与工具发现）
→ BK-0030（会话注入与 guard 出站类别扩展）**；BK-0030 的 guard 函数与注入点可同
BK-0029 并行开发，验收在后两者产物之上。

## 9. 影响面与不做范围

- **零 UI 声明**：本 ADR 及三子项实施轮均不改 `apps/web/**` 与 `tools/pixel-gate/**`；
  外部工具清单进前端面板 = BK-9006（issue #6 未批复，独立修宪）。
- **零 shared 契约**：不改 `packages/shared/**`——外部 server 不是画布节点类型，
  无 DEFS/SSE 事件增量；`n.mcp` 取值语义扩展（引用外部 id）不涉 schema 字段变化。
- **BK-0014 衔接预留**：registry.ts 留「注册源 loaders」扩展点（v1 loader = env；
  BK-0014 增 .mcp.json / ~/.agents 扫描 loader），连接层与注入层不改。
- **BK-0008 正交**：内置 sqlite 真实化（better-sqlite3 进程内）与外部
  mcp-server-sqlite 接入共存——后者注册名不得叫 `sqlite`（§6.3 冲突拒绝）。
- **本 SPEC 先行轮（迭代 0017）零代码零依赖**：本文件与 BACKLOG 定界回写为全部
  产物；`apps/**`、`packages/**`、`tests/**`、`tools/**`、`.github/**`、
  package.json / package-lock.json 零改动（AC4 机器核对）。

## 附录 A · needs-approval issue 草案（字面量，脚本逐字取用）

**标题**：

```
[needs-approval] BK-0028~0030 真实 MCP client 实施：请批新增依赖 + 出站类别扩展 + env 语义（ADR-0012）
```

**正文**：

```
按 POLICY.md 需批准区，真 MCP client 实施（BK-0028 传输层 / BK-0029 注册与工具发现 /
BK-0030 会话注入与 guard 出站类别扩展）需先经您批复以下承载。方案全文见 ADR-0012 草案
（docs/adr/0012-mcp-client-transport.md，2026-10-24 调研）。批准前零实现。

请批清单：

① 新增 npm 依赖：@modelcontextprotocol/client ^2.4（官方 TS SDK v2 client 拆分包，
   Apache-2.0，ESM-only，node≥20，直接依赖 7 项，无 peer 冲突；否决 v1
   @modelcontextprotocol/sdk——维护窗口约止于 2027-01、依赖树拖入 express/hono 等
   17 项、peer zod ^3.25‖^4 与本仓 zod floor ^3.24.0 不合；否决手写最小 client——
   协议 12 个月三改，版本演进负担不可自担。论证见 ADR §4）。

② 出站类别扩展 + 安全方案：新增「MCP Streamable HTTP POST（用户配置 endpoint）」
   出站类别，经 guard.ts 网关函数收口——assertPublicUrl 私网/回环默认拦截
   （guard.ts:33-56），内网 MCP server 走 ALLOW_PRIVATE_NET=1 逃生（与 SearXNG
   同口径，guard.ts:88-100 先例）；超时：连接/发现 10s、工具调用 30s 硬顶。

③ stdio spawn 的 env 语义面：MCP_STDIO_SERVERS="name=命令 参数"注册表——只有
   登记过的命令可被 spawn（白名单即注册表，无 shell 拼接），子进程随 run 启停、
   run 中止级联关闭；另 MCP_HTTP_SERVERS="name=url"。均入 config.ts zod fail-fast
   校验。残余风险：外部 server 子进程自身网络行为不经本仓 guard（stdio 形态固有，
   与 Claude Code .mcp.json 同级），注册主权在运维 env（ADR §6.1）。

④ 三子项实施顺序：BK-0028（传输层，Streamable HTTP 先行 + stdio 同项，统一
   McpConnection 抽象）→ BK-0029（env 注册表 + 工具发现）→ BK-0030（collectTools
   动态层注入 + guard 网关；可与 0029 并行开发、验收在后）。外部工具清单进前端
   面板不在此请批范围（触 UI，归 issue #6 / BK-9006 独立修宪）。

⑤ 证据链接：ADR-0012 草案（docs/adr/0012-mcp-client-transport.md）·
   PRD（docs/evolution/iterations/0017/PRD.md）· 代码现状（tools.ts:26-73 IMPL
   内置伪 MCP / app.js:103-114 前端硬编码清单）· BACKLOG 定界（BK-0028~0030 行内
   备注，迭代 0017 回写）。

您在本 issue 评论「批准」即视为同时授权 ①~③ 项承载（BK-0028~0030 转 ready）；
评论「驳回」则三子项维持 proposed，ADR-0012 归档为未采纳方案。
```
