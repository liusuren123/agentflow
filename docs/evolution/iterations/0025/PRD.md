# PRD · 迭代 0025 · BK-0030 MCP 工具会话注入与 guard 出站类别扩展

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 02:04
> 来源：BACKLOG BK-0030（capability / 触UI=否 / P2 / M / **ready** / 来源 T5）；转
> ready 门槛已由 issue#10 用户批复解除（2026-10-24 迭代 0021 PLAN 轮批复同步，
> BACKLOG.md BK-0030 行备注明载「issue#10 已获用户批复——门槛解除转 ready」；
> 0023 轮 gh 亲核 state=OPEN、用户「批准」评论在案）。前置 BK-0028（迭代 0023
> done）/ BK-0029（迭代 0024 done）均已满足（STATE.md:13 last_result + metrics
> 0023/0024 行）。
> 定界权威：ADR-0012（`docs/adr/0012-mcp-client-transport.md` 284 行本会话全文
> read；§6.2 mcpFetch 网关签名草图 + §6.3 三分支共存口径 + §8 模块划分草图与
> 行数预算）；与 BACKLOG 行标题有出入处以 ADR 为准（行内既定口径）。冲突顺位：
> 本 PRD 与 ADR-0012 定界冲突以 ADR 为准。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M1 runtime 承重墙（BK-0013 拆分
> 子项 (c)，实施顺序终环：BK-0028 → BK-0029 → **BK-0030**，ADR-0012 §8）。
> 批次编排：无——单项单迭代（M 级）。issue#10 名下姊妹子项 BK-0028/0029 均
> done，本项为**终子项**：本轮 done 即全链收口，CLOSE 按标准 sourceIssue 流程
> 回执关单 issue#10（🤖 前缀终轮说明，脚本执行；沿 0023/0024 轮「关单留终子项
> CLOSE」口径兑现）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 02:00~02:04 核实）

- **跨迭代续选**：无——BK-0021 批次链已于迭代 0022 终轮收口、BK-0028 于 0023
  done、BK-0029 于 0024 done（STATE.md:9 item 已置 `-`，last_result 明载）——
  本轮从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作（#10/#6/#11
  的批复均已于迭代 0021 PLAN 轮消化，BACKLOG 各行备注明载门槛解除在案；#2~#5
  批复更早已在库）。**issue#10 授权实况**：0023 轮 gh 亲核在案（state=OPEN、
  用户「批准」评论），授权覆盖 BK-0028~0030 三子项持续消费（metrics 0023/0024
  行备注同口径）；本项需批准面「新增出站类别 MCP Streamable HTTP」为该 issue
  请批清单第 ② 项字面承载（ADR-0012 附录 A ②）。rejected 无 → 无 skipped 改写。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 七项，无 user-request
  条目；无建行、无 uiIssueNumbers）。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - **P0 修宪项 BK-9002~9006（全 L）顺延**：行内备注均为「L 项先拆分再实现
    （BK-0013 先例）」或「拆分排序待治理日」，BK-9006 更明示「心跳不夹带拆分」
    （BACKLOG.md:47-51）；0021/0023/0024 三轮 PRD 选题存证已按同据顺延——心跳
    抓取任一项即夹带 L 项拆分、违「一次迭代一件事」。NDP 前置虽已解阻（迭代
    0022），拆分排序仍未做，本轮沿用先例。
  - **→ 选 BK-0030（P2 / M / ready / 前置 BK-0028+0029 均满足）**：P2/M 两项
    （BK-0030/BK-0008）中表序在前（BACKLOG.md:42 vs :59）；无任何前置义务
    （BK-0008 重试带 Mimosa 新档位只读探针前置义务，行内备注）；杠杆最高——
    ADR-0012 §8 实施顺序终环，做完即 T5-M1「外部 MCP server 工具可发现可调用
    （guard 约束内）」验收点全线达成 + issue#10 三子项全链收口关单。
    「优先 S/M」口径满足（M）；0024 PRD 存证明载「BK-0030 前置 BK-0028+0029
    就此满足」（BACKLOG.md:41 BK-0029 行尾注），本轮按序归位。
- **侦察档案核对**：残缺标记三处均既有事实（`apps/server/src/tools.ts:5/:82`
  为 BK-0005 落地的 stub 如实降级设计——本项落地后外部注册工具不再落 stub，
  sqlite/browser stub 语义保留归 BK-0008；lock 文件内串为 base64 哈希偶合非
  标记）；悬挂 run 探针输出 `[]`（BK-0011 启动扫尾已落地的预期表现，迭代 0019
  done）——无补题需求。
- 与最近 3 次迭代重叠面：0024=`apps/server/src/mcp/registry.ts`+`config.ts`
  （BK-0029，本项消费方——registry 语义零改动，仅被注入层 import）、0023=
  `apps/server/src/mcp/` 三文件（BK-0028 传输层，本项消费方——http.ts fetch
  注入面零改动开闭接入）、0022=packages/shared（已收口）——本项改动面
  guard.ts/tools.ts/llm.ts + 注入层新文件（落位 SPEC 定），对三次迭代代码触点
  零冲突（既有产物仅被 import 消费，E1-E9/MT/MR 断言面零触碰）。

## 结论

**建议做**：一句话理由——BK-0028 传输层与 BK-0029 注册表均已落地（本会话代码
亲核），「外部工具被 LLM 节点真实调用」只差最后一环：collectTools 动态分支 +
llm.ts:38 异步接线 + guard mcpFetch 出站收口；issue#10 批复已授权出站类别扩展
（请批清单第 ② 项字面），ADR-0012 §6.2/§6.3/§8 定界齐备（网关签名草图 + 三分支
共存口径 + 行数预算）；做完即 T5-M1 承重墙 BK-0013 链全线收口并关单 issue#10；
非修宪轮、全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面限 `apps/server/src/guard.ts`（+mcpFetch 网关函数）+
   `apps/server/src/tools.ts`（collectTools 三分支）+ `apps/server/src/llm.ts`
   （:38 注入点异步接线）+ 注入层落位（新文件如 `apps/server/src/mcp/inject.ts`
   或并入 tools.ts，SPEC 定稿）+ `tests/smoke/**`（新增冒烟，落位 SPEC 定）+
   根 `package.json`（仅当独立冒烟 script 需一行，可选）。`apps/web`、
   `tools/pixel-gate/**`、`.github/**`、`packages/shared/**`、golden 基线零接触
   ——视觉 / DOM 结构 / 交互三层无涉，**全程禁 `npm run gate:update`**（POLICY
   禁止区）。
2. POLICY 授权链：新增出站网络目标类别（MCP Streamable HTTP POST）属需批准区
   ——issue#10 批复请批清单第 ② 项字面覆盖（ADR-0012 附录 A ②：经 guard.ts
   网关函数收口、assertPublicUrl 私网/回环默认拦截、ALLOW_PRIVATE_NET=1 逃生、
   超时 10s/30s）。**批复只解除需批准面，纯后端实现不构成修宪轮**（WORKFLOW
   v2 口径；同 BK-0021/0025/0028/0029 先例）。
3. 零 shared 契约：外部工具注入是后端装配链概念，不是画布节点类型，无 DEFS /
   SSE 事件增量（ADR §9）；`n.mcp` 引用外部 server id 属取值语义扩展，不涉
   schema 字段变化（llm.ts:38 消费的 `n.mcp` 形态不变）。前端 MCP_SERVERS
   硬编码清单（app.js:103-117）零接触——外部清单进面板归 BK-9006（触 UI，
   独立修宪，不为本轮前提）；`capSummaryServer`（llm.ts:118-122）只计数不辨
   来源，现状渲染面兼容（ADR §6.3 同口径）。

## 背景（代码事实，本会话 2026-10-25 02:00 只读核实）

1. **BK-0028/0029 产物在库可直接消费**：`apps/server/src/mcp/` 四文件亲读——
   connection.ts 84 行（McpConnection 五面接口；`callTool` 第 4 参可选
   `signal?: AbortSignal`（connection.ts:29）已为 run 中止级联预留）；http.ts
   43 行（`createHttpMcpConnection(serverId, url, opts?)`，`HttpMcpOptions.fetch?:
   FetchLike` 注入面注释明示「BK-0030 落地 guard mcpFetch 后以
   createHttpMcpConnection(id, url, { fetch: mcpFetch }) 完成收口，本文件零改动
   （开闭）」——http.ts:8-11）；stdio.ts 45 行（argv 直传；`get pid` 探针面）；
   registry.ts 179 行（`McpRegistry.discoverTools` 进程级快照缓存（registry.ts:
   150-168，发现即关 finally 必达 close）；`envLoader` 读两 env（:104-107）；
   `buildMcpRegistry` 冲突拒绝（:114-130）；`has(serverId)` 注册查询面（:145））。
2. **guard.ts 现状**（100 行亲读）：`assertPublicUrl`（:33-56——仅 http/https、
   私网/回环/链路本地/CGNAT/保留段默认拦截 + DNS 解析核验，ALLOW_PRIVATE_NET=1
   逃生 ：37）；`guardedFetch`（:59-62）为收口内核；`searxngSearch` 动态主机
   网关先例（:93-100）。mcpFetch = guardedFetch 的语义命名薄包装（ADR §6.2
   函数签名草图字面：`export async function mcpFetch(rawUrl: unknown, init:
   RequestInit = {}): Promise<Response> { return guardedFetch(rawUrl, init); }`）。
   本仓安全约束（Mimosa 前置约束同口径）：服务端请求 URL 仅 http/https、发前
   校验 host 并拒绝 localhost/环回/私网/保留地址——guard 现纪律已逐项满足，
   mcpFetch 复用内核即继承。
3. **tools.ts 装配链现状**（116 行亲读）：`IMPL` 五内置 id（:26-73，sqlite/
   browser 为 null）；`collectTools(mcpSel)` 同步两分支「IMPL 命中→内置 impl /
   否则→stub」（:105-116）；`TOOL_SPECS` 静态描述表（:89-102）；`stubOf`/
   `isStubImpl` STUB_MARK 链（:80-87）。三分支扩展点即 ：110-113。
4. **llm.ts:38 注入点现状**（123 行亲读）：`const toolImpls = collectTools(n.mcp)`
   位于 async handler 内（llm.ts:38）——外部注册表查询/spec 组装的异步化无
   结构性障碍（ADR §1 同结论）；工具循环 zod shape 组装（:47-51，`TOOL_SPECS
   [name] || {desc: name, schema:{}}` fallback——外部工具无 spec 时模型盲调，
   本项须以 discoverTools 快照补 spec）；abort 通道 `ctx.ac.signal` 在位
   （:67/:79/:91，engine.ts:33 ctx.ac AbortController）。
5. **config 语义**（config.ts 129 行亲读）：两 MCP env 已入 rawEnv 白名单 +
   EnvSchema superRefine（E1-E8）+ E9 跨变量交叉校验；**返回对象 keys=10 零
   MCP 字段**（loadConfig 返回段亲核）——注入层构建注册表走 `envLoader`（直读
   process.env）+ `buildMcpRegistry`，不扩 config 返回面；两 env 未配置 = 空注册
   表 = 现状行为零变化。
6. **冒烟基建可复用**：mcp-transport.mjs 311 行（MT01-MT12，HTTP 进程内 mock +
   stdio 子进程 mock 双形态 + pid 孤儿探针 MT09）+ mcp-registry.mjs 340 行
   （MR01-MR11，注册/冲突/发现缓存）+ fixtures/mock-stdio-server.mjs；OpenAI
   兼容 mock 端点先例（smoke-server.mjs G 组，迭代 0015——「LLM 节点经 n.mcp
   真实调用外部工具」的模型侧供源）；根 package.json:19-22 四 smoke script。
7. **工作区干净**（`git status --porcelain` 输出空，亲核 2026-10-25 02:00）；
   HEAD = a3b5695（归档迭代 0024）。

## 目标与范围（= ADR-0012 §6.2/§6.3/§8 BK-0030 段 + BACKLOG 行定界）

**做**：

1. **guard mcpFetch 网关**：`guard.ts` 追加 `mcpFetch`（复用 `guardedFetch`
   内核，语义命名薄包装，ADR §6.2 签名草图字面；出站类别「MCP Streamable HTTP
   POST」经此唯一通道收口）；100 → ≤130 行（ADR §8 预算）。http.ts **零改动**
   （fetch 注入面 BK-0028 已预留，v2.4.0 `fetch?: FetchLike` 已实核，ADR §4
   SPEC 复核注记）。
2. **collectTools 三分支动态层**（tools.ts，116 → ≤150 行，ADR §8 预算）：
   「IMPL 命中 → 内置 impl（**语义零改动**）；server 命中外部注册表 → 连接层
   动态 impl；否则 → stub（现状语义保留）」（ADR §6.3 字面）。外部动态 impl
   惰性建连（HTTP 一律 `fetch: mcpFetch` 注入）→ `callTool` → close；超时继承
   BK-0028 默认（connect/listTools 10s、callTool 30s），不自制定时器。
3. **llm.ts:38 注入点异步接线**（122 → ≤140 行，ADR §8 预算）：collectTools
   调用点异步化（外部 spec 需消费 discoverTools 快照：desc/inputSchema 桥接为
   工具描述与 zod shape，规则从窄——基本类型映射、未知类型降级，SPEC 定稿
   REQ-0025-01）；外部工具发现失败时的如实降级（stub + warn，不伪造），SPEC
   定稿口径。
4. **注入层落位**：全局注册表惰性单例（envLoader → buildMcpRegistry，两 env
   未配置 = 空注册表零副作用）+ 动态 impl + spec 桥接的承载模块——新文件
   （如 `apps/server/src/mcp/inject.ts` ≤200 行）或并入 tools.ts，**落位 SPEC
   定稿**（行数预算达标为先决）。
5. **run 生命周期绑定**（ADR §6.1）：外部连接随工具调用惰性建立；run 中止
   （ctx.ac.signal）透传 callTool（connection.ts:29 可选 signal 面直用）；run
   结束/中止后无残留连接与 stdio 孤儿子进程。生命周期口径（一次性 per-call
   vs run 级缓存+级联 close）SPEC 定稿单一口径（v1 建议一次性 per-call，对照
   code.ts 一次性子进程先例，无常驻池——ADR §6.1「不做常驻进程池」）。
6. **冒烟（验收载体，落位 SPEC 定）**：四组断言——① mock 链路 E2E：mock 外部
   server（HTTP 进程内 + stdio 子进程双形态，复用 BK-0028/0029 fixtures）+ 模型
   侧 OpenAI 兼容 mock（G 组先例），LLM 节点经 `n.mcp` 引用外部工具被真实调用、
   结果与 mock 定义一致；② guard 拦截：私网/回环 endpoint 连接被拦（固定子串
   「已拦截」，无需真实 server）+ ALLOW_PRIVATE_NET=1 逃生放行；③ run 中止级联：
   中止后无孤儿子进程（pid 探针沿 MT09）+ 连接关闭断言；④ 三分支边界：内置/
   外部/stub 混合勾选各走各分支（isStubImpl 摘要口径不变）。

**不做（out of scope，归后续子项或禁区）**：

- registry.ts 解析/冲突拒绝/发现缓存语义改动（BK-0029 产物 E1-E9 语义零变化，
  仅被注入层 import 消费；若 SPEC 定稿需单例工厂小增量，以不触 E1-E9 语义为界）。
- 内置五 IMPL 任何语义改动（sqlite 真实化归 BK-0008；内置工具行为逐字保留）。
- 前端外部工具清单动态化 / 节点属性面板呈现（触 UI，BK-9006 / issue#6 已批复
  但拆分待治理日，不为本轮前提）。
- .mcp.json / ~/.agents 注册源（BK-0014）；常驻进程池/连接池（ADR §6.1 v1
  简化明确不做）。
- `packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`.github/**`
  任何改动；`npm run gate:update` / golden 任何接触（非修宪轮；POLICY 禁止区）。

## 受影响文件清单（= 产品提交白名单候选；SPEC 阶段定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `apps/server/src/guard.ts` | +mcpFetch 网关函数 | 100 → ≤130（ADR §8） |
| `apps/server/src/tools.ts` | collectTools 三分支 + 注入层引用 | 116 → ≤150（ADR §8） |
| `apps/server/src/llm.ts` | :38 注入点异步接线 + spec 桥接消费 | 122 → ≤140（ADR §8） |
| `apps/server/src/mcp/inject.ts`（暂名；并入 tools.ts 亦为备选，落位 SPEC 定） | 新增（注册表单例 + 动态 impl + spec 桥接） | ≤200 |
| `tests/smoke/mcp-inject.mjs`（暂名；落位 SPEC 定） | 新增（四组断言） | ≤400 |
| 根 `package.json` | 仅当独立冒烟需一行 script（如 `smoke:mcp:inject`） | +1（可选） |

零改动白名单：`apps/server/src/mcp/` 既有四文件（connection/http/stdio/
registry——仅被 import 消费，注入面开闭接入）、`apps/server/src/config.ts`
（E1-E9 语义不变）、`apps/server/src/` 其余全部既有模块（engine/handlers/
server/sessions/store/search/code/providers 等）、`apps/server/package.json`
与 `package-lock.json`（零新依赖——SDK 已随 BK-0028 引入）、`packages/shared/**`、
`apps/web/**`、`tools/pixel-gate/**`、`.github/**`、`tests/golden/**`、既有
测试文件（smoke-transport/mcp-registry 若不扩断言则零改动）。

## 验收标准（Given/When/Then）

- **AC1 · 基线不变式**：Given 两 MCP env 均未配置（空注册表），When BUILD 后
  启动服务并跑既有冒烟，Then 全系统行为与现状一致（smoke:server 既有组零回退
  即为证据）；tools.ts 内置五 IMPL 语义零改动（内置分支 git diff 零变化核对）。
- **AC2 · guard 收口与私网拦截**：Given 生产路径 MCP HTTP 连接一律以
  `{ fetch: mcpFetch }` 注入构造，When 对私网/回环/非 http(s) endpoint 的外部
  server 发起连接，Then 请求被 assertPublicUrl 拦截（错误含固定子串「已拦截」、
  未出站）；ALLOW_PRIVATE_NET=1 时放行（逃生口径不变）。When `grep -n "fetch("
  apps/server/src/mcp/` 生产模块，Then 无绕过注入面的裸出站（stdio 无出站面）。
- **AC3 · 外部工具注入与调用（mock 链路 E2E）**：Given 注册表声明 mock 外部
  server（HTTP/stdio 双形态）且模型侧为 OpenAI 兼容 mock，When LLM 节点
  `n.mcp` 引用其工具并进入工具循环，Then 模型可见工具 spec（desc/schema 源自
  tools/list 发现快照）且调用真实发生、结果与 mock 定义一致、工具调用日志如实
  （沿 llm.ts 工具调用 log 形态）。
- **AC4 · run 中止级联**：Given stdio 外部 server 工具调用已建连，When run
  中止（ctx.ac.abort），Then 调用中止（signal 透传）且连接 close、无孤儿子
  进程（pid 探针沿 MT09 形态）；run 正常结束后同样零残留连接。
- **AC5 · 三分支边界**：Given `n.mcp` 同时引用内置工具、外部注册工具、未注册
  工具名三形态，When collectTools 展开，Then 内置走 IMPL（零语义改动）、外部
  走动态 impl、未注册落 stub（现状语义保留，isStubImpl 摘要口径不变）。
- **AC6 · 回归与提交不变式**：When `npm test` + 冒烟执行（smoke:server +
  smoke:mcp + smoke:mcp:registry 既有组零回退 + 本项新增四组全绿 exit 0），
  Then 全绿；`npm run gate` 8 场景 diffPx=0（纯后端回归面）；产品提交恰一个
  （Conventional Commits，如 `feat(server): BK-0030 MCP 工具会话注入与 guard
  出站收口——collectTools 三分支 + mcpFetch 网关 + run 级联`），提交内容 =
  上表白名单，白名单外路径零出现；`git diff -- packages/shared apps/web
  tools/pixel-gate .github` 恒空。
- **AC7 · 出站类别审计（评审级）**：Given ADR §6.2「每个 MCP endpoint URL 经
  assertPublicUrl 后请求」为出站类别唯一口径，When 核对 mcpFetch 实现，Then
  为 guardedFetch 薄包装（无独立 fetch 调用、无绕过面）；MCP HTTP 生产出站
  无第二通道（注入面唯一性核对）。

## 非功能要求

1. 新增源文件 ≤400 行（AGENTS.md 硬性约定 4；guard ≤130 / tools ≤150 /
   llm ≤140 / inject ≤200，ADR §8）。
2. **出站纪律（本轮核心）**：MCP Streamable HTTP 生产出站唯一通道 = guard.ts
   mcpFetch（assertPublicUrl：仅 http/https、私网/回环/链路本地/CGNAT/保留段
   默认拦截 + DNS 核验；ALLOW_PRIVATE_NET=1 逃生）；stdio 子进程残余风险按
   ADR §6.1 显式声明（子进程自身网络不经本仓 guard，注册主权在运维 env）——
   冒烟对 localhost mock 的直连仅存在于测试代码（注入 mock fetch 或测试进程
   ALLOW_PRIVATE_NET=1），不进生产模块。
3. 超时继承 BK-0028 默认（connect/listTools 10s、callTool 30s）不自制定时器；
   超时/失败如实报错不伪造结果（沿 tools.ts:4-5 原则）；close 幂等（继承基类）。
4. 全程禁 `npm run gate:update` / golden 零接触（POLICY 禁止区）。
5. 回滚 = `git revert` 单提交（纯后端注入层 + 网关函数，无数据迁移 / 契约
   改动 / 依赖变化）。
6. EOL 纪律：新文件一律 LF、UTF-8 无 BOM。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| collectTools 同步→异步的波及面（旧签名其它消费点？） | SPEC 先 `grep -rn "collectTools" apps/ tests/` 枚举全消费点（本会话已知生产唯一 = llm.ts:38）；改 async 或新增异步变体保留旧签名，SPEC 定稿；冒烟消费点同步更新 |
| 外部工具 spec 桥接（inputSchema JSON Schema → zod shape）类型面宽 | 规则从窄：string/number/boolean 基本类型映射 + required/optional 区分，未知/复杂类型降级（optional string 或 stub 化），SPEC 定稿映射表并入冒烟断言；不引入 JSON-Schema 全量解析器 |
| 发现缓存消费时机与失败降级（server 不可达时工具面如何呈现） | SPEC 定稿单一口径：发现失败 → 该 server 工具如实 stub 化 + warn（不伪造、不静默吞）；与 BK-0005 stub 如实降级语义同型 |
| 生命周期口径歧义（一次性 per-call vs run 级缓存） | SPEC 定稿单一口径写入注入层注释；v1 建议一次性 per-call（code.ts 先例、无常驻池、级联自动满足）；若选 run 级缓存则中止级联 close 必须有断言（AC4） |
| LLM mock 链路 E2E 的模型侧编排（工具调用回合） | G 组 OpenAI 兼容 mock 先例（迭代 0015）：mock 模型首轮返回 toolCalls、工具真实执行后次轮收束；stdio 双形态沿 MT 组 fixtures |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022/0024 先例） | 推荐独立冒烟文件（不涉 V09）；若 SPEC 选并入 smoke-server.mjs 则沿先例口径：提交后 CLOSE 复跑自愈 |
| Mimosa 钩子误报（0020 先例） | 本轮无 better-sqlite3/exec 调用面（SDK 消费 + guard 薄包装）；若仍被拦按 0020 先例对照实验 + 如实上报，不硬闯 |

## 需求清单（REQ-0025-xx）

- REQ-0025-01：SPEC 落笔前定稿四项——① 注入层落位（新文件 vs 并入 tools.ts）
  与行数预算表；② 外部工具 spec 桥接映射表（inputSchema→zod shape + 降级
  规则）；③ 外部连接生命周期口径（一次性 per-call vs run 级缓存+级联）；
  ④ 发现失败降级口径（stub 化 + warn 字面量）——结论写入 SPEC。
- REQ-0025-02：落地「做」1~5（mcpFetch + 三分支 + 异步接线 + 注入层 + run
  生命周期），行数预算达标（AC1/AC2/AC5）。
- REQ-0025-03：冒烟四组断言（mock E2E / 私网拦截 / 中止级联 / 三分支边界），
  落位 SPEC 定稿（AC3/AC4/AC5）。
- REQ-0025-04：边界不变式——registry E1-E9 语义零变化、内置五 IMPL 语义零
  改动、零 shared、零 UI、零新依赖（AC1/AC6/AC7）；gate / test / 全部冒烟
  全绿。
- REQ-0025-05：产品提交恰一个（Conventional Commits），白名单 = 受影响文件
  清单；BACKLOG 备注回写随归档提交（机制件，与 0011~0024 同机制）；issue#10
  **终子项关单回执**（🤖 前缀、附三子项链证据指针，脚本执行——本项 done 即
  BK-0028~0030 全链收口）。

## SPEC 阶段衔接说明

BK-0030 为 M 项，**不免 SPEC（skipSpec=false）**。SPEC 须含：REQ-0025-01 四项
定稿；注入层模块结构（单例工厂 / 动态 impl 闭包 / spec 桥接函数签名）；
mcpFetch 落位与 http.ts 开闭接入图（零改动证明）；llm.ts 接线 diff 形态
（异步化方案与旧签名处置）；冒烟落位与断言清单（复用 BK-0028/0029 fixtures
+ G 组模型 mock 的接线图）；行数预算表；回滚口径。新架构决策：无
（needsAdr=false——出站网关与三分支共存已定案于 ADR-0012 §6.2/§6.3 + issue#10
批复链，SPEC 仅落细节；若 SPEC 复核发现 ADR 定界不可实施，升级回协调者处置，
不静默偏离）。
