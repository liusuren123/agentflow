# PRD · 迭代 0023 · BK-0028 真 MCP client 传输层实现：stdio / Streamable HTTP 连接外部 MCP server

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 00:43
> 来源：BACKLOG BK-0028（capability / 触UI=否 / P1 / M / **ready** / 来源 T5）；转
> ready 门槛已由 issue#10 用户批复解除（2026-10-24 迭代 0021 PLAN 轮批复同步，
> BACKLOG.md BK-0028 行备注；本会话 gh 亲核复核见下存证）。
> 定界权威：ADR-0012（`docs/adr/0012-mcp-client-transport.md`，278 行全文 read）；
> 与 BACKLOG BK-0028 行标题有出入处以 ADR 为准（行内既定口径）。冲突顺位：本
> PRD 与 ADR-0012 定界冲突以 ADR 为准；ADR「调研时点」的时效复核义务由本轮
> SPEC 承接（REQ-0023-01）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M1 runtime 承重墙（BK-0013 拆分
> 子项 (a)，实施顺序首环：BK-0028 → BK-0029 → BK-0030，ADR-0012 §8）。
> 批次编排：无——单项单迭代（M 级）；「两传输都做、统一 McpConnection 抽象、
> Streamable HTTP 先行 + stdio 同项」为 ADR §3 既定结论，不拆批、不跨迭代续填。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 00:39~00:43 核实）

- **跨迭代续选**：无——BK-0021 批次链已于迭代 0022 终轮收口（`STATE.md:9` 注释
  明载 item 置 `-`；metrics 0022 行同口径），本轮无续填义务、从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作（#10/#6/#11
  的批复均已于迭代 0021 PLAN 轮消化，BACKLOG 各行备注明载门槛解除在案；#2~#5
  批复更早已在库）。**#10 批复实况本会话 gh 亲核**（2026-10-25 00:39）：
  `gh issue view 10` → state=OPEN、label=needs-approval、用户 liusuren123 评论
  「批准」在案 + 🤖 回执评论（进入实施通道）——授权链真实有效；issue 保持 OPEN
  是正确形态：其覆盖 BK-0028~0030 **三子项**且三行来源列均为 T5（非 issue#N），
  单项完成不关单，三子项全部终态后由脚本/治理日统一回执关单（本轮不关、不评论）。
  rejected 无 → 无 skipped 改写。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 七项，无 user-request
  条目；无建行、无 uiIssueNumbers）。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - **P0 修宪项 BK-9002~9006（全 L）顺延**：行内备注均为「L 项先拆分再实现
    （BK-0013 先例）」或「拆分排序待治理日」，BK-9006 更明示「心跳不夹带拆分」
    （BACKLOG.md:47-51）；0021 PRD 选题权衡已按同据将 BK-9006 顺延
    （`iterations/0021/PRD.md` 选题存证）。NDP 前置（BK-9002/9003/9005）虽已随
    迭代 0022 收口解阻，但拆分排序未做，心跳抓取任一项即夹带 L 项拆分、违
    「一次迭代一件事」。
  - **BK-0029 / BK-0030（P2/M）前置未竟不入选**：分别依赖 BK-0028 /
    BK-0028+0029（BACKLOG 行内依赖序，0021 PLAN 轮维持）。
  - **BK-0008（P2/M）排序在后**：P2 < P1，且重试带前置义务（Mimosa 新档位
    只读探针确认，行内备注）。
  - **→ 选 BK-0028（P1 / M / ready / 无前置可开工）**：BACKLOG 行备注明载
    「无前置可开工」；0022 PRD 存证预告「终轮 CLOSE 后回归常规优先序」时以
    BK-0028 为首要可开工项（`iterations/0022/PRD.md:28-30`）；0021 PRD 选题
    权衡亦认定「BK-0028（P1/M）ADR-0012 定界齐备可开工」（同文件 ：27-29），
    当时因 BK-0021 杠杆更高让位——该杠杆项已收口（done，迭代 0022），本轮
    按序归位。「优先 S/M」口径满足（M）。
- **侦察档案核对**：残缺标记三处均既有事实（`apps/server/src/tools.ts:5/:82`
  为 BK-0005 落地的 stub 如实降级设计——sqlite 真实化归 BK-0008、外部连接归
  本项之后的 BK-0029/0030；lock 文件内串为 base64 哈希偶合非标记）；悬挂 run
  探针输出 `[]`（BK-0011 启动扫尾已落地的预期表现，迭代 0019 done）——无补题
  需求。
- 与最近 3 次迭代重叠面：0022/0021=packages/shared（NDP 迁移，已收口）、
  0020=blocked 零产品残留——本轮改动面 `apps/server/src/mcp/`（全新目录）+
  apps/server/package.json/lock + tests/smoke，对三次迭代代码触点零重叠。

## 结论

**建议做**：一句话理由——issue#10 用户批复（本会话 gh 亲核）已授权「新增 npm
依赖 @modelcontextprotocol/client」，ADR-0012 定界齐备（统一 McpConnection 抽象
+ 双传输同项 + 行数预算 + 验收口径 + 实施顺序），BK-0029/0030 均以本项为前置
——传输层是 T5-M1 承重墙剩余段的第一块砖；改动面为全新目录且零生产接线，
风险由「mock 双传输全链冒烟 + 超时/abort 断言 + 既有组零回退」三链守护；
非修宪轮、全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面限 `apps/server/src/mcp/`（新增目录三文件）+ `apps/server/package.json`
   与 `package-lock.json`（+1 依赖及锁）+ `tests/smoke/**`（新增冒烟，落位 SPEC
   定）+ 根 `package.json`（仅当独立冒烟脚本需要一行 script，可选）。`apps/web`、
   `tools/pixel-gate/**`、`.github/**`、`packages/shared/**`、golden 基线零接触
   ——视觉 / DOM 结构 / 交互三层无涉，**全程禁 `npm run gate:update`**（POLICY
   禁止区）。
2. POLICY 授权链：新增 npm 依赖属需批准区——issue#10 批复请批清单第 ① 项字面
   覆盖（`@modelcontextprotocol/client ^2.4`，ADR-0012 附录 A；用户评论「批准」
   即同时授权 ①~③ 承载）。**批复只解除需批准面，纯后端实现不构成修宪轮**
   （WORKFLOW v2 口径；同 BK-0021/0025 先例）。
3. 零 shared 契约：外部 server 不是画布节点类型，无 DEFS / SSE 事件增量
   （ADR §9）；`n.mcp` 引用外部 id 的取值语义扩展不涉 schema 字段变化（且其
   接线在 BK-0030，本轮不碰）。

## 背景（代码事实，本会话 2026-10-25 00:39 只读核实）

1. **不存在任何外部 MCP 连接代码**：`ls apps/server/src/` 无 mcp/ 目录（亲核，
   18 个既有 .ts 全列）；后端 `IMPL` 五内置伪 server（`apps/server/src/tools.ts:26-73`：
   filesystem/fetch/web-search 真实、sqlite `:59` 与 browser `:60` 为 null stub）；
   `collectTools`（`tools.ts:105-116`）两分支「IMPL 命中→内置 impl / 否则→stub」，
   三分支动态层归 BK-0030。前端清单硬编码（`app.js:103-114`，动态化触 UI 归
   BK-9006 / issue#6，不为本轮前提）。
2. **依赖现状**：`apps/server/package.json` dependencies 七项（`:11-19`），无任何
   MCP SDK；`"type":"module"` 在 `:5`（0017 REPORT OBS-001 指针勘误：实在 :5 非
   :4，本会话 Read 亲核）；ESM-only 依赖先例 ai@7 + @ai-sdk/openai-compatible 已
   在同链运行（ADR-0004）；zod floor ^3.24.0（`:18`）——SDK 自带 zod ^4 嵌套
   共存无双实例陷阱（ADR §4 兼容性核验）。
3. **超时先例量级**：fetch 15s（`tools.ts:46`）/ download 20s（`tools.ts:51`）/
   bocha 15s / searxng 12s（guard.ts:77,:85,:99）——ADR §6.1 定 MCP connect/
   listTools 10s、callTool 30s（MCP 工具更重故放宽），接口 timeoutMs 参数化、
   冒烟以小值覆写证明超时逻辑（不必实等 10s/30s）。
4. **冒烟基建先例**：进程内 OpenAI 兼容 mock 端点（smoke-server.mjs G 组，迭代
   0015）；代码节点子进程 + 超时先例（code.ts，AGENTS.md 硬性约定 3）；独立冒烟
   文件先例 mcp-stubs.mjs（133 行，BK-0005）。smoke-server.mjs 现 947 行（wc -l
   亲核）——MCP 传输冒烟含双 mock + 子进程管理，建议独立文件，落位 SPEC 定稿。
5. **工作区干净**（`git status --porcelain` 输出空，亲核 2026-10-25 00:39）；
   HEAD = 332f7fc（归档迭代 0022）。

## 目标与范围（= ADR-0012 §8 BK-0028 段 + BACKLOG 行定界）

**做**：

1. **统一连接抽象**：新增 `apps/server/src/mcp/connection.ts`——`McpConnection`
   接口（serverId / connect / listTools / callTool / close 五面 + timeoutMs
   参数化，ADR §3 草图字面）+ SDK Client 封装 + 超时/abort 合成；≤200 行。
2. **Streamable HTTP 传输**：新增 `apps/server/src/mcp/http.ts`——
   StreamableHTTPClientTransport 构造（**自定义 fetch 注入面**，为 BK-0030
   mcpFetch 网关预留前向兼容；注入点存在性 SPEC 复核，REQ-0023-01）、
   terminateSession 拆链；≤150 行。
3. **stdio 传输**：新增 `apps/server/src/mcp/stdio.ts`——StdioClientTransport
   构造（argv 直 spawn、禁 shell:true）、close 级联子进程结束；≤150 行。
   「白名单来源 = 注册表本身」的 env 语义面归 BK-0029：本轮 stdio 构造收命令
   字面量参数（由调用方/测试传入），不读 env、不接配置。
4. **依赖引入**：`apps/server/package.json` +1 `@modelcontextprotocol/client
   ^2.4`（+ package-lock.json 同步）；SPEC 复核版本时效后落笔（ADR 调研时点
   2026-10-24，协议与 SDK 演进快）。
5. **冒烟（验收载体）**：双传输全链断言——HTTP 进程内 node:http mock MCP
   endpoint + stdio node 子进程 mock（stdin/stdout newline-delimited JSON-RPC），
   各跑 initialize(connect) → tools/list → tools/call → close 四步；超时
   （小值 timeoutMs 覆写）与 abort（callTool 进行中中止）如实报错不伪造结果；
   stdio close 后无孤儿子进程断言。

**不做（out of scope，归后续子项或禁区）**：

- env 注册表解析（MCP_HTTP_SERVERS / MCP_STDIO_SERVERS）与 zod fail-fast、内置
  五 id 冲突拒绝、tools/list 发现缓存（**BK-0029**：registry.ts + config.ts）。
- guard.ts mcpFetch 网关函数、collectTools 三分支动态层、llm.ts:38 注入点接线
  （**BK-0030**）——本轮 mcp/ 模块**零生产调用路径**（不改 handler/engine/
  tools/llm/server/sessions/store 任何既有模块），唯一消费者是冒烟测试。
- 外部工具清单进前端面板（触 UI，BK-9006 / issue#6 已批复但拆分待治理日）。
- `packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`.github/**`
  任何改动。
- `npm run gate:update` / golden 任何接触（非修宪轮；POLICY 禁止区）。

## 受影响文件清单（= 产品提交白名单；SPEC 阶段定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `apps/server/src/mcp/connection.ts` | 新增 | ≤200（ADR §8） |
| `apps/server/src/mcp/http.ts` | 新增 | ≤150（ADR §8） |
| `apps/server/src/mcp/stdio.ts` | 新增 | ≤150（ADR §8） |
| `apps/server/package.json` | +1 依赖行 | +1 |
| `apps/server/package-lock.json` | npm install 机制性同步 | 随依赖 |
| `tests/smoke/mcp-transport.mjs`（暂名；落位 SPEC 定，并入 smoke-server.mjs 亦为备选） | 新增 | ≤400 |
| 根 `package.json` | 仅当独立冒烟需一行 script（如 `smoke:mcp`） | +1（可选） |

零改动白名单：`apps/server/src/` 全部既有模块（tools/llm/guard/config/engine/
handlers/server/sessions/store/search/code 等 18 文件）、`packages/shared/**`、
`apps/web/**`、`tools/pixel-gate/**`、`.github/**`、`tests/golden/**`、既有
测试文件（smoke-server.mjs 若不选并入方案则零改动）。

## 验收标准（Given/When/Then）

- **AC1 · 依赖引入与构建链**：Given apps/server 现无任何 MCP SDK 依赖
  （package.json:11-19 亲核），When SPEC 复核版本时效后 BUILD 增
  `@modelcontextprotocol/client ^2.4` 并 `npm install`（lock 同步），Then
  `npm run build:server` exit 0，且依赖树无 peer 违例（SDK 无 peerDependencies；
   zod 双实例嵌套共存为 ADR §4 已核口径）。
- **AC2 · McpConnection 统一抽象**：Given 新增 mcp/connection.ts，When 实现
  `McpConnection`（serverId / connect / listTools / callTool / close + timeoutMs
  参数化，默认 connect/listTools 10s、callTool 30s），Then 接口面与 ADR-0012
  §3 草图一致，三新文件行数 ≤200/≤150/≤150。
- **AC3 · Streamable HTTP 全链（先行传输）**：Given 进程内 node:http mock MCP
  endpoint（冒烟内起，G 组 OpenAI 兼容 mock 同法），When 经 http.ts 构造的
  McpConnection 执行 connect → listTools → callTool → close，Then 四步全部
  成功且断言工具 name/desc/inputSchema 与 mock 定义一致。
- **AC4 · stdio 全链（同项第二传输）**：Given mock stdio MCP server（node 子
  进程，stdin/stdout newline-delimited JSON-RPC），When 经 stdio.ts 构造的
  McpConnection 执行同一四步链，Then 全部成功；close 后子进程退出、无孤儿
  （进程存活探针断言）。
- **AC5 · 超时与 abort**：Given mock 提供延迟应答（连接/发现与工具调用两级），
  When 以小值 timeoutMs 调用、以及在 callTool 进行中 abort，Then 两者均如实
  报错拒绝（不伪造结果，沿 tools.ts:4-5 原则），abort 后连接可 close 且无泄漏。
- **AC6 · 零生产接线（边界不变式）**：When 全程 `git diff -- apps/server/src`，
  Then 改动恰为新增 mcp/ 三文件——llm.ts / tools.ts / guard.ts / config.ts /
  engine.ts / handlers.ts / server.ts 等既有模块零改动；`git diff --
  packages/shared apps/web` 恒空；`npm run gate` 8 场景 diffPx=0。
- **AC7 · 回归与提交不变式**：When `npm test` 与冒烟执行（smoke:server 既有组
  零回退 + 本项新增传输组全绿 exit 0；V09 时点性假红沿 0018/0021/0022 先例口径
  ——独立文件方案不涉 V09），Then 全绿；产品提交恰一个（Conventional Commits，
  如 `feat(server): BK-0028 真 MCP client 传输层——统一 McpConnection +
  Streamable HTTP/stdio 双传输 + 冒烟`），提交内容 = 上表白名单，白名单外
  路径零出现。
- **AC8 · spawn 安全核验（评审级）**：Given ADR §6.1「SDK StdioClientTransport
  直 spawn（argv 数组，无 shell 拼接）」，When `grep -n "shell" apps/server/src/mcp/*.ts`，
  Then 无 `shell:true`（或任何 shell 拼接形态）命中。

## 非功能要求

1. 新增源文件 ≤400 行（AGENTS.md 硬性约定 4；三模块行数预算见上表 / ADR §8）。
2. **出站纪律（本轮形态）**：mcp/ 模块零生产出站路径；任何真实 endpoint 连接
   （BK-0029/0030 时代）必须经 guard 收口——仅 http/https、请求前校验 host、
   私网/回环/保留地址默认拒绝（assertPublicUrl）、内网 MCP 走 ALLOW_PRIVATE_NET=1
   逃生（ADR §6.2）。本轮冒烟对 localhost mock 的直连仅存在于测试代码，不进
   生产模块。
3. 超时如实报错不伪造结果（沿 tools.ts:4-5 原则）；close 幂等可重入。
4. 全程禁 `npm run gate:update` / golden 零接触（POLICY 禁止区）。
5. 回滚 = `git revert` 单提交（纯新增文件 + 依赖行，无数据迁移 / env 变更 /
   契约改动）。
6. EOL 纪律：新文件一律 LF、UTF-8 无 BOM。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| SDK 时效漂移（ADR 调研 2026-10-24，协议 12 个月三改） | REQ-0023-01：SPEC 落笔时逐项复验版本号与 API 面（ADR「调研时点」注记的既定义务） |
| v2 transport 无自定义 fetch 注入点（ADR §4 明示未决） | SPEC 复核；缺失则按 ADR 回退案（复用 guardedFetch 直接包装出站 / 降级 v1）并留档结论 |
| stdio 子进程平台行为差异（本机 win32 + CI Linux） | mock 子进程用 node 自身（跨平台）；close 无孤儿断言双平台跑；CI 权威 |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022 先例） | 推荐独立冒烟文件（不涉 V09）；若 SPEC 选并入 smoke-server.mjs 则沿先例口径：提交后 CLOSE 复跑自愈 |
| Mimosa 钩子误报（0020 BK-0008 先例：exec 命名形态启发式误报） | 本轮无 better-sqlite3 / exec 调用面；若仍被拦按 0020 先例对照实验 + 如实上报，不硬闯（用户已将两门降 warn，setx 在案） |
| 新依赖供应链面（SDK 直接依赖 7 项） | 锁定 ^2.4 区间 + lock 精确锁定；Mimosa 提交前扫描如常过，被拦按建议处理不绕过 |

## 需求清单（REQ-0023-xx）

- REQ-0023-01：SPEC 时效复核——`@modelcontextprotocol/client` 版本号与 v2
  `StreamableHTTPClientTransport` 自定义 fetch 注入点逐项复验，结论（含回退案
  决策）写入 SPEC；若复核推翻 ADR-0012 选型结论，升级回协调者处置，不静默偏离。
- REQ-0023-02：落地「做」1~4（三模块 + 依赖），接口面与 ADR §3 草图一致、行数
  预算达标（AC1/AC2）。
- REQ-0023-03：冒烟双传输全链 + 超时/abort + 孤儿进程断言（AC3/AC4/AC5），落位
  SPEC 定稿（推荐独立文件）。
- REQ-0023-04：边界不变式——零生产接线、零 shared、零 UI（AC6/AC8）；gate /
  test / 冒烟全绿（AC7）。
- REQ-0023-05：产品提交恰一个（Conventional Commits），白名单 = 受影响文件
  清单；BACKLOG 备注回写随归档提交（机制件，与 0011~0022 同机制）。

## SPEC 阶段衔接说明

BK-0028 为 M 项，**不免 SPEC（skipSpec=false）**。SPEC 须含：SDK 复核记录
（REQ-0023-01）；McpConnection 接口定稿（timeoutMs 默认值与 abort/close 语义）；
fetch 注入设计（BK-0030 前向兼容）；双 mock 设计（HTTP 进程内端点形态 + stdio
子进程 JSON-RPC 帧协议与消息样例）；冒烟落位与断言清单；行数预算表；回滚口径。
新架构决策：无（needsAdr=false——选型已定案于 ADR-0012 + issue#10 批复链，
SPEC 仅复验时效与落细节）。
