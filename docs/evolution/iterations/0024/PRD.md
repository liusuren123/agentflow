# PRD · 迭代 0024 · BK-0029 外部 MCP server 注册与工具清单发现

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 01:22
> 来源：BACKLOG BK-0029（capability / 触UI=否 / P2 / M / **ready** / 来源 T5）；转
> ready 门槛已由 issue#10 用户批复解除（2026-10-24 迭代 0021 PLAN 轮批复同步，
> BACKLOG.md BK-0029 行备注明载「issue#10 已获用户批复——门槛解除转 ready」）；
> 前置 BK-0028 已于迭代 0023 终态 done（STATE.md:13 last_result + metrics 0023 行）。
> 定界权威：ADR-0012（`docs/adr/0012-mcp-client-transport.md` 278 行本会话全文
> read；§7 env 方案 A + §8 registry.ts 草图 + BK-0029 定界字面量）；与 BACKLOG
> 行标题有出入处以 ADR 为准（行内既定口径）。冲突顺位：本 PRD 与 ADR-0012 定界
> 冲突以 ADR 为准。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M1 runtime 承重墙（BK-0013 拆分
> 子项 (b)，实施顺序第二环：BK-0028 → **BK-0029** → BK-0030，ADR-0012 §8）。
> 批次编排：无——单项单迭代（M 级）；issue#10 名下姊妹子项 BK-0030 仍未竟，
> 本迭代 done 仅发进度回执、不关 issue#10（关单留终子项 CLOSE，沿 0023 轮口径）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 01:15~01:22 核实）

- **跨迭代续选**：无——BK-0021 批次链已于迭代 0022 终轮收口；BK-0028 单项已于
  迭代 0023 done（STATE.md:9 item 已置 `-`，last_result 明载）——本轮从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作（#10/#6/#11
  的批复均已于迭代 0021 PLAN 轮消化，BACKLOG 各行备注明载门槛解除在案；#2~#5
  批复更早已在库）。**issue#10 授权实况**：0023 轮已 gh 亲核（state=OPEN、用户
  「批准」评论在案，metrics 0023 行备注「授权覆盖 BK-0029/0030 持续消费中，关单
  留终子项 CLOSE」）；本项需批准面「新增环境变量语义两项」为该 issue 请批清单
  第 ③ 项字面承载（「另 MCP_HTTP_SERVERS="name=url"。均入 config.ts zod
  fail-fast 校验」，ADR-0012 附录 A）。rejected 无 → 无 skipped 改写。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 七项，无 user-request
  条目；无建行、无 uiIssueNumbers）。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - **P0 修宪项 BK-9002~9006（全 L）顺延**：行内备注均为「L 项先拆分再实现
    （BK-0013 先例）」「拆分排序待治理日」，BK-9006 更明示「心跳不夹带拆分」
    （BACKLOG.md:47-51）；0021/0023 两轮 PRD 选题存证已按同据顺延——心跳抓取
    任一项即夹带 L 项拆分、违「一次迭代一件事」。NDP 前置虽已解阻（迭代 0022），
    拆分排序仍未做，本轮沿用先例。
  - **BK-0030（P2/M）前置未竟不入选**：依赖 BK-0028+**0029**（BACKLOG 行内
    依赖序，ADR §8 实施顺序第三环），BK-0029 本轮才做。
  - **BK-0008（P2/M）排序在后**：与 BK-0029 同为 P2/M 但主池表序在后；且重试
    带 Mimosa 新档位只读探针前置义务（行内备注），BK-0029 无任何前置义务。
  - **→ 选 BK-0029（P2 / M / ready / 前置 BK-0028 已满足）**：ADR-0012 §8
    实施顺序第二环；BK-0030 唯一前置缺口即本项——做完即解阻修宪链外最后一个
    runtime 子项，杠杆最高；「优先 S/M」口径满足（M）；0023 PRD 存证预告实施
    链「BK-0028 → BK-0029 → BK-0030」（`iterations/0023/PRD.md:12`），本轮按
    序归位。
- **侦察档案核对**：残缺标记三处均既有事实（`apps/server/src/tools.ts:5/:82`
  为 BK-0005 落地的 stub 如实降级设计——sqlite 真实化归 BK-0008、外部注册归
  本项、生产接线归 BK-0030；lock 文件内串为 base64 哈希偶合非标记）；悬挂 run
  探针输出 `[]`（BK-0011 启动扫尾已落地的预期表现，迭代 0019 done）——无补题
  需求。
- 与最近 3 次迭代重叠面：0023=`apps/server/src/mcp/`（BK-0028 传输层，本项直接
  消费方）、0022/0021=packages/shared（NDP 迁移已收口）——本项在 mcp/ 目录内
  **新增** registry.ts 并扩 config.ts，与三次迭代代码触点无冲突（BK-0028 产物
  三文件零改动预期；connection/http/stdio 仅被 import 消费）。

## 结论

**建议做**：一句话理由——BK-0028 传输层（统一 McpConnection 双传输 + 冒烟基建）
已于迭代 0023 落地，本项把「可被连接的 server」从零变为「env 注册表声明的任意
server」并交付 tools/list 发现缓存，是 BK-0030（工具注入 LLM 节点）的唯一前置；
issue#10 批复已授权 env 语义两项（请批清单第 ③ 项字面），ADR-0012 §7/§8 定界
齐备（registry.ts ≤200 行 + config.ts +2 env zod）；改动面限 apps/server 后端
两文件 + 冒烟，风险由「fail-fast/冲突拒绝/发现断言三组冒烟 + 既有组零回退」
守护；非修宪轮、全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面限 `apps/server/src/mcp/registry.ts`（新增）+ `apps/server/src/config.ts`
   （+2 env 校验）+ `tests/smoke/**`（冒烟，落位 SPEC 定）+ 根 `package.json`
   （仅当独立冒烟 script 需一行，可选）。`apps/web`、`tools/pixel-gate/**`、
   `.github/**`、`packages/shared/**`、golden 基线零接触——视觉 / DOM 结构 /
   交互三层无涉，**全程禁 `npm run gate:update`**（POLICY 禁止区）。
2. POLICY 授权链：新增环境变量语义两项（MCP_HTTP_SERVERS / MCP_STDIO_SERVERS）
   属需批准区——issue#10 批复请批清单第 ③ 项字面覆盖（ADR-0012 附录 A）。
   **批复只解除需批准面，纯后端实现不构成修宪轮**（WORKFLOW v2 口径；同
   BK-0021/0025/0028 先例）。
3. 零 shared 契约：注册表与发现是后端运行时概念，不是画布节点类型，无 DEFS /
   SSE 事件增量（ADR §9）；前端 MCP_SERVERS 硬编码清单（app.js:103-114）零
   接触——外部清单进面板归 BK-9006（触 UI，独立修宪，不为本轮前提）。

## 背景（代码事实，本会话 2026-10-25 01:15 只读核实）

1. **BK-0028 产物在库可直接消费**：`apps/server/src/mcp/` 三文件亲读——
   connection.ts 84 行（McpConnection 五面接口 + BaseMcpConnection，超时
   connect/listTools 10s、callTool 30s，close 幂等）；http.ts 43 行
   （`createHttpMcpConnection(serverId, url, opts?)` 工厂，fetch?/requestInit?
   注入面为 BK-0030 预留）；stdio.ts 45 行
   （`createStdioMcpConnection(serverId, command, args?, opts?)` 工厂，argv
   直传、**不读 env 不接配置**——注释明示「『白名单来源 = 注册表本身』的 env
   语义面归 BK-0029（registry.ts）」，即本项）。registry 是这两个工厂的
   **首个生产消费者**。
2. **config.ts 现状**（109 行亲读）：rawEnv key 白名单 13 项（`:28-32`）+ 
   EnvSchema z.object 13 项（`:49-63`）；「配了但非法」fail-fast 退出码 1
   （`:65-68`）。「全部可选——未配置任何密钥合法」语义为本项基线：两个新 env
   未配置 = 空注册表 = 现状行为零变化。zod 校验先例：SEARXNG_URL 的
   `z.string().trim().url()`（`:58`）可直接参照 MCP_HTTP_SERVERS 的 URL 项。
3. **内置五 id 冲突锚点**：`tools.ts` IMPL 映射五 id 亲核——filesystem（`:27`）/
   fetch / sqlite（`:59`）/ browser（`:60`）/ web-search（`:61`）；ADR §6.3
   定「外部注册名不得与内置五 id 冲突——拒绝 + 启动 warn」（内置 id 是前端
   清单与 DEFS 勾选语义锚点，外部同名引入不可分辨双源）。
4. **冒烟基建可复用**：tests/smoke/mcp-transport.mjs（311 行，MT01-MT12）+
   fixtures/mock-stdio-server.mjs（65 行）+ 根 package.json:21 `smoke:mcp`
   script（BK-0028 产物，本会话 grep 亲核）——HTTP 进程内 mock 与 stdio 子进程
   mock 双形态可直接为「发现结果可断言」供料；fail-fast 断言先例 = smoke 内
   起独立实例验证退出路径（Z01-Z04 崩溃重启组同法，迭代 0019）。
5. **env 表达力既定取舍**（ADR §7 案 A，已获批）：值为「命令+参数，空格分隔」，
   复杂 args（含空格/引号）表达力弱——登记复杂命令用包装脚本绕行，不为此扩
   配置面；B/C 案（配置文件/双源）留给 BK-0014 loaders 时代。
6. **工作区干净**（`git status --porcelain` 输出空，亲核 2026-10-25 01:15）；
   HEAD = ea9e7c2（ADR-0012 状态行补收提交）。

## 目标与范围（= ADR-0012 §7/§8 BK-0029 段 + BACKLOG 行定界）

**做**：

1. **env 注册表解析**：新增 `apps/server/src/mcp/registry.ts`（≤200 行，ADR §8）
   ——解析 `MCP_HTTP_SERVERS="name1=https://host/mcp,name2=…"` 与
   `MCP_STDIO_SERVERS="name1=命令 参数…,name2=…"`（ADR §7 案 A 字面格式）；
   两 env 均可选，未配置 = 空注册表；解析后产出带传输类型的注册表结构
   （HTTP → createHttpMcpConnection / stdio → createStdioMcpConnection 的
   构造参数）。
2. **zod fail-fast**：`config.ts` +2 key（rawEnv 白名单 + EnvSchema 两项）；
   非法值形态（name 缺失 / URL 非法 / 值空段等）启动即 fatal 退出码 1（沿
   `:65-68` fail 先例；格式细节 SPEC 定稿）。
3. **内置五 id 冲突拒绝**：注册名 ∈ {filesystem, fetch, sqlite, browser,
   web-search} → 拒绝该注册 + logger.warn（ADR §6.3；warn 固定子串供冒烟
   断言）；不与 fail-fast 混淆——格式错是 fatal、语义冲突是 warn+拒绝该条。
4. **tools/list 发现缓存**：registry 提供按 serverId 建连 + listTools 的发现
   入口（消费 BK-0028 三文件），发现结果缓存（缓存生命周期与失效口径 SPEC
   定稿：进程级 vs per-run）；缓存键含 serverId，命中免重连。
5. **BK-0014 loaders 扩展点**：registry 的注册源以 loader 形态组织（v1 loader
   = env 解析器），接口预留 .mcp.json / ~/.agents 扫描 loader（ADR §9 衔接
   预留；仅结构预留，不实现任何新 loader）。
6. **冒烟（验收载体）**：三组断言——① 非法 env 值 → 启动 fail-fast（退出码
   1 + problems 指明变量名）；② 注册名冲突内置 id → 拒绝 + warn 固定子串；
   ③ 发现结果可断言：对 mock MCP server（复用 mcp-transport.mjs 的 HTTP 进程
   内 mock + mock-stdio-server.mjs 双形态）经 registry 建连 → tools/list，
   断言工具 name/desc/inputSchema 与 mock 定义一致 + 缓存命中行为；关闭后
   无孤儿进程（沿 MT09 探针形态）。落位 SPEC 定（独立文件或并入既有）。

**不做（out of scope，归后续子项或禁区）**：

- guard.ts mcpFetch 网关函数、collectTools 三分支动态层、llm.ts:38 注入点
  接线（**BK-0030**）——本项 registry 的**发现缓存无任何生产消费方**（不改
  llm.ts / tools.ts / engine.ts / handlers.ts / server.ts 任何既有模块，
  唯一消费者是冒烟测试）；http.ts 生产默认仍 SDK 全局 fetch（BK-0028 落地
  形态），guard 收口随 BK-0030 mcpFetch 注入。
- 前端外部工具清单动态化（触 UI，BK-9006 / issue#6 已批复但拆分待治理日）。
- .mcp.json / ~/.agents 注册源（**BK-0014**；本项仅留 loader 结构扩展点）。
- `packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`.github/**`
  任何改动；`npm run gate:update` / golden 任何接触（非修宪轮；POLICY 禁止区）。

## 受影响文件清单（= 产品提交白名单；SPEC 阶段定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `apps/server/src/mcp/registry.ts` | 新增 | ≤200（ADR §8） |
| `apps/server/src/config.ts` | +2 env key + 2 zod 项 | 109 → ≤130（ADR §8） |
| `tests/smoke/mcp-registry.mjs`（暂名；并入 mcp-transport.mjs 亦为备选，落位 SPEC 定） | 新增 | ≤400 |
| 根 `package.json` | 仅当独立冒烟需一行 script（如 `smoke:mcp:registry`）；并入方案则零改动 | +1（可选） |

零改动白名单：`apps/server/src/mcp/` 既有三文件（connection/http/stdio——仅被
import 消费）、`apps/server/src/` 其余全部既有模块（tools/llm/guard/engine/
handlers/server/sessions/store/search/code 等）、`apps/server/package.json` 与
`package-lock.json`（零新依赖——BK-0028 已引入 SDK）、`packages/shared/**`、
`apps/web/**`、`tools/pixel-gate/**`、`.github/**`、`tests/golden/**`、既有
测试文件（smoke-transport.mjs 若不选并入方案则零改动）。

## 验收标准（Given/When/Then）

- **AC1 · config 扩展与基线不变式**：Given config.ts 现 13 env key（`:28-32`
  亲核），When BUILD 增 MCP_HTTP_SERVERS / MCP_STDIO_SERVERS 两 key + 两 zod
  项，Then `npm run build:server` exit 0；**两 env 均未配置时全系统行为与现状
  逐字节一致**（空注册表零副作用；smoke:server 既有组零回退即为证据）；config.ts
  ≤130 行。
- **AC2 · 非法值 fail-fast**：Given 任一新 env 配了非法值（name 缺失 / URL
  非法 / 值空段等，SPEC 枚举形态表），When 服务启动，Then fatal 日志指明变量
  名与原因、退出码 1（沿 config.ts:65-68 先例；smoke 独立实例断言）。
- **AC3 · 内置 id 冲突拒绝**：Given MCP_HTTP_SERVERS 或 MCP_STDIO_SERVERS 中
  注册名与内置五 id 之一同名（如 `sqlite=…`），When 加载注册表，Then 该注册被
  拒绝（不出现在注册表）、logger.warn 含固定子串（SPEC 定稿字面量，供冒烟
  断言）、其余合法注册不受影响、进程不退出。
- **AC4 · 注册表构造与发现**：Given mock MCP server 双形态（HTTP 进程内 +
  stdio 子进程，复用 BK-0028 fixtures），When 经 registry 按 serverId 建连 →
  listTools，Then 返回工具 name/desc/inputSchema 与 mock 定义一致；再次发现
  命中缓存（免重连断言，口径 SPEC 定）；close 后 stdio 无孤儿子进程。
- **AC5 · registry 边界不变式**：When 全程 `git diff -- apps/server/src`，
  Then 改动恰为新增 registry.ts + config.ts 两 env 项——mcp/ 既有三文件、
  llm.ts / tools.ts / guard.ts / engine.ts / handlers.ts / server.ts 等零
  改动（发现缓存无生产消费方）；`git diff -- packages/shared apps/web` 恒空。
- **AC6 · 回归与提交不变式**：When `npm test` + 冒烟执行（smoke:server 既有
  组零回退 + smoke:mcp 既有组零回退 + 本项新增三组全绿 exit 0），Then 全绿；
  `npm run gate` 8 场景 diffPx=0（纯后端回归面）；产品提交恰一个（Conventional
  Commits，如 `feat(server): BK-0029 外部 MCP server 注册表与工具发现——env
  白名单解析 + 冲突拒绝 + 发现缓存`），提交内容 = 上表白名单，白名单外路径
  零出现。
- **AC7 · env 语义安全核验（评审级）**：Given ADR §6.1「白名单来源 = 注册表
  本身——可被 spawn 的命令只有 env 注册表中登记过的 command+args」，When
  `grep -n "shell" apps/server/src/mcp/registry.ts`，Then 无 `shell:true` 命中
  （registry 只把解析出的 argv 传给 createStdioMcpConnection，无任何命令
  拼接/解释形态）。

## 非功能要求

1. 新增源文件 ≤400 行（AGENTS.md 硬性约定 4；registry.ts 预算 ≤200 / ADR §8）。
2. **出站纪律（本轮形态）**：registry 零生产出站路径（发现缓存无生产消费方，
  唯一消费者是冒烟）；真实 endpoint 出站收口（guard mcpFetch）归 BK-0030——
   冒烟对 localhost mock 的直连仅存在于测试代码，不进生产模块。
3. 超时如实报错不伪造结果（沿 tools.ts:4-5 原则；连接/发现超时继承
   BK-0028 默认 10s，registry 不自制定时器）；close 幂等（继承基类）。
4. **env 语义面恰两项**：不新增第三种 env；不引入配置文件面（B/C 案归
   BK-0014 时代，ADR §7 既定取舍）。
5. 全程禁 `npm run gate:update` / golden 零接触（POLICY 禁止区）。
6. 回滚 = `git revert` 单提交（纯新增文件 + 两 env 项，无数据迁移 / 契约
   改动 / 依赖变化）。
7. EOL 纪律：新文件一律 LF、UTF-8 无 BOM。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| env 格式解析边界（空格分隔 args 的歧义、逗号分隔多 server 与 args 内逗号冲突） | SPEC 定稿「形态枚举表 + 非法值清单」（REQ-0024-01）：解析规则从窄（首 `=` 分割 name/值、逗号分割条目、值内空格分割 argv），歧义形态一律 fail-fast 不猜测；复杂命令走包装脚本的运维绕行已在 ADR §7 记载 |
| 发现缓存生命周期歧义（进程级 vs per-run：server 端工具清单变更何时可见） | SPEC 定稿单一口径并写入 registry 注释；v1 建议进程级 + close 后失效重连（与 BK-0030「run 惰性连接」衔接由该轮消费侧定义，本项不做 per-run 绑定） |
| fail-fast 冒烟需独立进程实例（不能污染主 smoke 实例 env） | Z01-Z04 先例（迭代 0019）：独立端口/env 子实例断言退出码与日志子串 |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022 先例） | 推荐独立冒烟文件（不涉 V09）；若 SPEC 选并入 smoke-server.mjs 则沿先例口径：提交后 CLOSE 复跑自愈 |
| Mimosa 钩子误报（0020 先例：exec 命名形态启发式；用户已降 warn） | 本轮无 better-sqlite3 / exec 调用面（纯 env 解析 + SDK 消费）；若仍被拦按 0020 先例对照实验 + 如实上报，不硬闯 |
| loaders 扩展点过度设计（BK-0014 未开工先抽象） | 仅结构预留（loader 函数签名 + v1 env loader 实现为唯一成员），不写抽象基类/注册机制；ADR §9 口径「连接层与注入层不改」 |

## 需求清单（REQ-0024-xx）

- REQ-0024-01：SPEC 落笔前定稿「env 形态枚举表 + 非法值清单 + 解析规则」与
  「冲突 warn 固定子串字面量」「缓存生命周期口径」三项（风险 1/2 对策），
  结论写入 SPEC。
- REQ-0024-02：落地「做」1~5（registry.ts + config.ts 扩展 + 冲突拒绝 +
  发现缓存 + loaders 结构预留），行数预算达标（AC1/AC5）。
- REQ-0024-03：冒烟三组断言（fail-fast / 冲突拒绝 / 发现与缓存），落位 SPEC
  定稿（AC2/AC3/AC4）。
- REQ-0024-04：边界不变式——零生产消费方、零 shared、零 UI、零新依赖
  （AC5/AC6/AC7）；gate / test / 全部冒烟全绿。
- REQ-0024-05：产品提交恰一个（Conventional Commits），白名单 = 受影响文件
  清单；BACKLOG 备注回写随归档提交（机制件，与 0011~0023 同机制）；issue#10
  进度回执（🤖 前缀、不关单——BK-0030 未竟）。

## SPEC 阶段衔接说明

BK-0029 为 M 项，**不免 SPEC（skipSpec=false）**。SPEC 须含：env 解析规则与
非法值枚举表（REQ-0024-01）；registry 数据结构定稿（注册条目 / 传输类型 /
构造参数 / 缓存条目四形态）；冲突拒绝与 warn 字面量；缓存生命周期口径与
失效语义；冒烟落位与断言清单（复用 BK-0028 fixtures 的接线图）；行数预算表；
回滚口径。新架构决策：无（needsAdr=false——env 方案 A 与 registry 定界已
定案于 ADR-0012 §7/§8 + issue#10 批复链，SPEC 仅落细节；若 SPEC 复核发现
ADR 定界不可实施，升级回协调者处置，不静默偏离）。
