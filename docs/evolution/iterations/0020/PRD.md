# PRD · 迭代 0020 · BK-0008 sqlite MCP 工具真实接入

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 19:35
> 来源：BACKLOG BK-0008（P2 / capability / M / ready / 触UI=否，来源 T3；
> 2026-10-23 治理日晋升 ready，`BACKLOG.md:51`）。
> 主题归属：ROADMAP T3·后端执行能力 · 里程碑 M2「sqlite MCP 工具沙箱接入」
> （`ROADMAP.md:77-82`，状态「进行中——BK-0008 待心跳选题」——本迭代即关账轮）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 19:15~19:35 核实）：
> ① **批复项无新动作且现存批复项全部顺延**——档案「approved：无」与实况一致：
> 本轮面板 #10/#11 均 open 未批复，BK-0028~0030（转 ready 唯一条件=issue#10 获批）
> 与 BK-0021/0023（唯一条件=issue#11 获批）维持 proposed 零实现；余下批复 ready 项
> BK-9002~9005（P0/L/触UI=是）顺延论证本轮逐项复核仍成立（0016~0019 PRD 先例）：
> BK-9002/9003/9005 前置 BK-0021（NDP）实施轮未批（先行项 BK-0031 已 done、
> issue#11 open）；BK-9004 前置 BK-0016 已 done 但 L 项拆分排序归 10-25 周日
> 治理日（`ROADMAP.md:154-155`），心跳抓取即夹带拆分违「一次迭代只做一件事」
> → 顺延。② **user-request 无**——本轮档案 issue 面板七项（#2~#6、#10、#11）
> 全为 needs-approval，无 user-request 条目——无建行、无 uiIssueNumbers；#6 open
> 未批复维持待批准区不建行、不催办、不代批。③ **rejected 无**。④ **常规选题取
> BK-0008**——治理日解阻链明示心跳选题序列尾项「0020→BK-0008」（`weekly/43.md:315`
> §四.5、`ROADMAP.md:166-169`；0018 PRD 选题节亦逐字引用「0019→BK-0011 →
> **0020→BK-0008**」），前三个顺位 BK-0027/BK-0031/BK-0011 已于迭代 0017/0018/0019
> 相继 done；批复项顺延后非 doc ready 池**恰一项** BK-0008（P2/M/capability/
> 触UI=否；doc ready 池为 0，无跳过争议）。与最近 3 次迭代重叠面核对：0017=纯
> docs（ADR-0012，零重叠）；0018=shared test 资产 + docs + .gitattributes（零重叠）；
> 0019=store.ts/server.ts/smoke-server.mjs Z 组——本轮改动面为 **tools.ts +
> mcp-stubs.mjs 两文件**，对三迭代全部代码触点零重叠（M 组挂接点
> smoke-server.mjs:300-302 早已在位，本轮不动 smoke-server.mjs）。

## 结论

**建议做（本迭代即做）**：一句话理由——前端 MCP 注册表早已向用户广告 sqlite
服务器及其 query/execute 两工具（`app.js:108`），后端却是 `IMPL['sqlite'] = null`
挂 stub 如实返回「not implemented」（`tools.ts:59` + `:81-87`）：模型每次勾选
调用都撞墙。better-sqlite3 本就是 server 既有依赖（`apps/server/package.json:15`
+ `@types` :21 + 根 `package.json:31-33` allowScripts，`store.ts:21` 在用），进程内
零出站、零新增 env/依赖——把 sqlite.query/sqlite.execute 落成真实现、DB 锚定
沙箱专用文件，是 POLICY 自主区内一次纯后端能力补全，且同步兑现 BK-0005 留下的
断言守护路径（mcp-stubs.mjs M07 三向自愈「真接入→强制摘标记删 stub」，
`mcp-stubs.mjs:26` 注释即为本轮写的设计遗嘱）。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为 `apps/server/src/tools.ts`（IMPL.sqlite null→真实现 + TOOL_SPECS
   两行 desc 摘「（未实现）」前缀）与 `tests/smoke/mcp-stubs.mjs`（FROZEN 冻结
   基准 sqlite 分类翻转 + 新增真实行为断言组）；`apps/web/**`、
   `packages/shared/**`、`tools/pixel-gate/**`、`tests/golden/**`、`.github/**`、
   根/子包 `package.json`/`package-lock.json` 零字节改动——视觉 / DOM 结构 /
   交互三层与 golden 基线均不接触，`npm run gate` 8 场景为纯回归面（AC6）。
2. **前端注册表零接触**：app.js:103-117 的 MCP_SERVERS 注册表（宪法冻结面，
   mcp-stubs.mjs:23 明载）本就含 sqlite 条目（`app.js:108`）——服务器名/工具名/
   面板文案一字不动，仅后端从 stub 翻转为真实现；用户在节点上勾选 sqlite 的
   交互路径与视觉呈现完全不变。
3. POLICY 校验：后端能力演进（`apps/server/src/**`，不新增 npm 依赖——
   better-sqlite3 既有；零出站——进程内 SQLite；零新增 env）+ 测试与回归基建
   （mcp-stubs 断言扩充与口径更新）——**自主区**（BACKLOG BK-0008 行内治理日
   已判定，本轮逐条复核成立）。
4. **DEFS / SSE 契约零涉及**：不改 `packages/shared/**`；TOOL_SPECS desc 是
   后端传给模型的工具描述（`llm.ts:54` tool({ description: spec.desc })），
   非 UI 文案、非 shared 契约；llm.ts 的 stub/真实双路路由本就动态判
   isStubImpl（`llm.ts:46,56-59`），sqlite 翻真后自动走 info/sys 路径、
   stubCount 自动少计（`:107` 摘要「（N 未接入）」随之收敛）——llm.ts 零改动，
   M08-M11 源锁（锁 llm.ts 路由字符串）原样保持。

## 背景（代码事实源，2026-10-24 19:15~19:35 本会话只读核实）

1. **stub 现状与摘标记路径**：`IMPL: Record<string, Record<string, ToolImpl> | null>`
   中 `'sqlite': null`（`tools.ts:59`），collectTools 对 null 组或缺失函数一律挂
   `stubOf(server, n)`（`tools.ts:105-116`，:112 分支）——返回
   `{error:'not implemented', note:'工具 sqlite.query 未接入真实实现'}`（:82）。
   TOOL_SPECS 中 `sqlite.query`/`sqlite.execute` desc 以「（未实现）」开头
   （`tools.ts:97-98`）。M07 三向配对自愈断言（IMPL null ⟺ desc 全组前缀 ⟺
   collectTools 全组 stub，`mcp-stubs.mjs:100-112`）与 FROZEN 冻结基准
   （:27-33，sqlite `impl:false`）共同守护「摘标记必须三处同步」——mcp-stubs.mjs:26
   注释明载「BK-0008 真实接入 sqlite 时 M03/M05/M06 的冻结分类须随摘标记同步更新
   （有意防无声漂移）」，weekly/43.md:315 亦附注「BK-0008 须同步更新 mcp-stubs.mjs
   M07 断言口径 stub→real」。**本迭代就是该遗嘱的执行轮。**
2. **依赖与基建在位**：better-sqlite3 ^12.11.1 为 apps/server 既有 dependency
   （`apps/server/package.json:15`），@types/better-sqlite3 ^9.6.0 既有 devDependency
   （:21），根 package.json allowScripts 已放行该精确版本（`package.json:31-33`）；
   store.ts 同库同 API 先例在库（`store.ts:21` import Database from
   'better-sqlite3'）。Node 大版本升级需重装编译的陷阱已在 AGENTS.md「已知陷阱」
   在案——本轮零版本变化，不触发。
3. **沙箱锚点与安全先例**：tools.ts 全部文件操作锚定 `SANDBOX = apps/server/
   sandbox`（编译产物回溯推导，`tools.ts:14-15`），safePath 以 resolve+前缀校验
   拒绝穿越（:17-21，消息「路径越界：只允许访问沙箱目录」）；文件头注释
   （:3-5）立约「文件操作全部限制在 server/sandbox/ 目录内……未实现的工具如实
   返回 not implemented，不伪造结果」。`apps/server/sandbox/` 已被
   .gitignore:16 覆盖——沙箱 DB 文件天然不入库。主库 `data/agentflow.db` 是
   store.ts 专属（ROOT 推导 `store.ts:28-31`），与沙箱锚点不同根。
4. **载荷限幅先例**：read_file 截 200*1024（`tools.ts:30`）、fetch excerpt 截
   4000（:48）——sqlite 行集返回须设同族上限，防巨结果打爆 SSE/上下文。
5. **测试基座**：mcp-stubs.mjs 为纯离线直驱 dist/tools.js 的断言组（头部
   :5-8 声明边界：不经 HTTP、不起服务、不依赖密钥/外网），由 smoke-server.mjs
   在 P 组后挂接（`smoke-server.mjs:30` import、:300-302 调用），M 组失败计入
   汇总不 fail-fast。M06 对已实现组「不直调避免触沙箱/网络」（:89-98）——但
   sqlite 是进程内本地库、只触沙箱文件，**直调恰是其设计用途**，新增真实行为
   断言组沿用 M 组离线直驱形态合法合规（覆盖边界在文件头如实声明）。smoke
   断言计数为动态汇总（0019 REPORT 已注 C01 浮动行先例），期望计数字符串
   （'5/5 含前缀' 等）硬编码在 mcp-stubs.mjs 内，随 FROZEN 联动更新即可，
   smoke-server.mjs 零改动。
6. **M08-M11 源锁不受影响**：四锁锁的是 llm.ts 的路由语义行（stub?warn:sys /
   stub?warn:info / 200:60 / 摘要分项，`mcp-stubs.mjs:124-129`），本轮 llm.ts
   零改动，四锁原样绿。
7. **竞品对照**（product-manager.md 职责 2）：ComfyUI 生态的 MCP/工具节点、
   n8n 的 SQLite 节点均为「连接本地 DB 文件、SQL 进、行出」的进程内形态；
   AgentFlow 差异化约束在于宪法沙箱——工具可达的 DB 必须锚定 sandbox 专用文件
   而非用户任意路径，这与 filesystem 三工具的 safePath 立约同源，是对齐竞品
   功能面下的从严偏离（安全优先）。

## 目标

1. **真实现**：`IMPL.sqlite = { query, execute }` 落地——query 执行返回行集的
   SQL（SELECT 类），execute 执行写入/结构类 SQL（CREATE/INSERT/UPDATE/DELETE
   等）；DB 文件锚定 `apps/server/sandbox/` 内专用文件（SPEC 定名），与
   `data/agentflow.db` 严格隔离。
2. **安全如约**：SQL 层越界防护——ATTACH/DETACH（任意文件读写逃逸向量）拒绝；
   扩展加载不启用（better-sqlite3 默认关，SPEC 验证成文）；PRAGMA 等文件级
   原语的处置由 SPEC 枚举定界（默认从严拒绝面）。错误如实呈现（对齐 safePath
   throw 先例或 {error} 载荷，SPEC 定案），绝不伪造成功。
3. **摘标记三处同步**：IMPL 翻真 + TOOL_SPECS 两行 desc 摘前缀 + mcp-stubs.mjs
   FROZEN/M 组期望口径更新（5 未实现→3、7 已实现→9），并新增 sqlite 真实
   行为断言组（离线直驱往返 + 越界拒绝）。
4. **关账 T3-M2**：ROADMAP T3-M2「sqlite MCP 工具沙箱接入」验收点「工具返回
   不再含 not implemented；sandbox 外路径被拒；gate 全绿」全部达成。

## 非目标（out of scope）

- **不触主库**：不读写、不 ATTACH、不复制 `data/agentflow.db`（store.ts 专属）；
  不提供任何指定任意 DB 路径的参数。
- **不新增依赖/env/出站**：零 npm 新依赖（better-sqlite3 既有）、零新环境变量、
  零出站网络；package.json 与 lock 零变化（AC5 机器证明）。
- **不触前端与 shared**：app.js MCP_SERVERS 注册表、节点参数面板、DEFS/SSE
  契约零改动；不动态化工具清单（前端硬编码清单的动态化归 BK-9006/#6 待批准）。
- **不实现 browser 工具**：browser 三工具维持 stub 如实降级（ADR-0011 评估
  结论=近期不实施）；本迭代只翻 sqlite 一个服务器组。
- **不做 SQL 方言校验器/白名单解析器**：拒绝面用最小黑名单（ATTACH/DETACH/
   扩展/文件级 PRAGMA）+ 沙箱锚定兜底，不做完整 SQL 解析（M 尺寸边界）；
   深度防御增强留后续提案。
- **不改 llm.ts**：stub/真实路由动态已有，零改动即自动生效。
- **不更新 ROADMAP / metrics / BACKLOG 状态**（CLOSE 职责）。

## 用户故事

1. 作为工作流作者，我在 LLM 节点勾选 sqlite 服务器后，模型应当能真的建表、
   写数据、查回来——而不是每次调用都收到「未接入真实实现」然后模型绕路编造。
2. 作为模型（工具消费者），工具描述不应再自称「（未实现）」——desc 是我决定
   是否调用、如何传参的依据，虚假降级标记会误导我的工具选择。
3. 作为部署运维者/安全审查者，LLM 驱动的 SQL 只能落在沙箱专用 DB 文件里；
   试图 ATTACH 主库或沙箱外路径必须被拒且如实报错——数据隔离是硬边界。
4. 作为 test-manager，「stub→real 翻转必须三处同步、漏一处即红」这条防漂移
   链要有机器断言（M 组更新 + 新行为组），并能反演证明断言真的在守护。

## 需求条目

- **REQ-0008-01 · IMPL.sqlite 真实现（`apps/server/src/tools.ts` 改）**：
  `'sqlite': null` → `{ query: async ({sql}) => …, execute: async ({sql}) => … }`。
  契约：query 返回 `{ rows: [...] }`（行数与单元格文本设上限，对齐背景 4 限幅
  先例；单元格非字符串值以文本化呈现）；execute 返回变更信息（如
  `{ changes, lastInsertRowid? }`，形态 SPEC 定）；SQL 为空/非字符串 → 如实
  错误。连接与 DB 文件策略（单例句柄 vs 按调用开关、文件名、首访建库）由
  SPEC 定案，硬约束：路径由 SANDBOX 常量（tools.ts:15）派生，源码中不得出现
  任何主库路径或用户可控路径。
- **REQ-0008-02 · SQL 越界防护（同文件）**：以最小黑名单拒绝跨文件原语——
  语句含 ATTACH/DETACH（不区分大小写、容忍前后空白与注释引导）即抛如实错误
  （对齐 safePath 消息风格，含「沙箱」字样）；不调用 better-sqlite3 的
  allowLoadExtension；文件级 PRAGMA（可影响外部文件者）从严拒绝，清单 SPEC
  枚举成文。防逃逸的目标文件面至少覆盖：绝对/相对沙箱外路径、`data/` 主库。
- **REQ-0008-03 · TOOL_SPECS 摘标记（同文件）**：`sqlite.query` /
  `sqlite.execute` 两行 desc 去除「（未实现）」前缀，改为真实语义描述
  （含「沙箱数据库」限定语，防模型误以为可触任意库）；schema 保持
  `{ sql: 'SQL 语句' }` 形态。其余 10 行 TOOL_SPECS 与 browser 三行前缀
  零改动。
- **REQ-0008-04 · mcp-stubs.mjs 口径更新与行为断言（`tests/smoke/mcp-stubs.mjs`
  改）**：
  - FROZEN 基准：sqlite 组 `impl: false → true`（:30），文件头注释与 :26 处
    「BK-0008 待接入」口径同步刷新为已接入实况；
  - 既有断言期望联动：M03 未实现项 5→3（仅 browser）、M04 已实现项 7→9、
    M05 stub 载荷组仅 browser 3/3、M06 真实函数组 9/9（sqlite 直查不直调的
    旧边界按背景 5 论证放开）、M07 三向自愈保持 5/5 组（sqlite 组自动因
    IMPL 非 null ⟺ 无前缀 ⟺ 非 stub 而成立）；
  - 新增 sqlite 真实行为断言（沿 M 组离线直驱形态，编号续 M12 起，SPEC 定细）：
    ① execute 建表+插入 → query 查回行集 deepEqual；② ATTACH 沙箱外路径/
    主库路径被拒（错误含沙箱语义、不伪造成功）；③ execute 变更计数如实；
    ④ 沙箱外无文件副产（断言范围限沙箱目录内新建）。测试产生的沙箱 DB
    文件落在 gitignored 目录（.gitignore:16），测试自建自清或用独立文件名
    避免污染（SPEC 定）。
- **REQ-0008-05 · 产品提交白名单**：恰两路径——`apps/server/src/tools.ts`（改）、
  `tests/smoke/mcp-stubs.mjs`（改）；其余任何路径零改动（AC5 机器核对，含
  package-lock.json 零变化 = 零依赖证明、llm.ts 零变化 = 路由动态证明）；
  BACKLOG/STATE/metrics 回写随归档提交（0011~0019 同机制）。

## 非功能要求

1. **性能**：better-sqlite3 为同步 API——单条语句在沙箱小库上执行耗时可忽略；
   事件循环阻塞风险见风险 2（如实声明 + SPEC 缓解，不虚称已解）。连接策略避免
   每次工具调用重开文件句柄（SPEC 定单例或惰性缓存）。
2. **安全**：零出站、零新 env、零新依赖；SQL 文本仅传入 better-sqlite3
   prepare/exec（参数化不适用于整语句工具形态，注入面=模型自身，落点为沙箱
   专用库，爆炸半径受锚定约束）；拒绝面黑名单大小写不敏感。
3. **可核查性**：本 PRD 引用的一切代码指针（file:line）真实可开（AC7 抽样
   ≥5 条逐一比对；本 PRD 背景节指针为本会话亲核基线）。
4. **规模**：tools.ts 基线 117 行，预算改后 ≤ 190 行（远低于 400 硬限）；
   mcp-stubs.mjs 基线 133 行，预算改后 ≤ 260 行（测试文件先例不设 400 硬限，
   从严自律）。
5. **POLICY 合规形态**：全程自主区；不触 UI / 不触 shared / 不触 golden /
   不触 golden 工具链。

## 验收标准（Given / When / Then）

- **AC1 · 真实往返（离线直驱）**：Given 已执行 `npm run build:server` 且
  dist/tools.js 在位，When 测试经 collectTools({sqlite:['query','execute']})
  直调（M 组同款离线通道），Then execute 建表+插入返回成功且变更计数>0，
  query SELECT 查回恰所插行（deepEqual），载荷在限幅内；返回不含
  `not implemented` 字样。
- **AC2 · 沙箱锚定与越界拒绝**：When 直调 query/execute 提交 ATTACH 语句
  （目标分别为沙箱外绝对路径与 `data/agentflow.db`）及文件级 PRAGMA 黑名单项，
  Then 每次均被拒（错误消息含沙箱限定语义）、不返回伪造成功载荷、沙箱外
  无新建文件；且 tools.ts 源码中 sqlite 实现的路径派生仅引用 SANDBOX 常量
  （VERIFY grep 级核对，无主库/用户路径字面量）。
- **AC3 · 冒烟全量**：When 执行 `npm run smoke:server`，Then 全部断言通过
  0 failed——M01-M11 既有断言经口径更新后全绿（M03 3/3、M04 9/9、M05 3/3、
  M06 9/9、M07 5/5 组、M08-M11 源锁原样）+ M12 起新行为组全过 + 其余各组
  （C/R/D/G/V/K/Z）零回退。
- **AC4 · 反演红绿双向**：Given 临时把 IMPL.sqlite 回退为 null（一行改动），
  When 复跑冒烟，Then 新 sqlite 行为断言 FAIL（工具回落 stub 载荷）且 exit 1
  → 逐字还原后复跑复绿、`git status` 零残留。
- **AC5 · 白名单与零依赖机器证明**：When 对产品提交执行 `git show --numstat`
  与 `git diff` 核对，Then 仅 REQ-0008-05 两路径；`apps/web/**`、
  `packages/shared/**`、`apps/server/src/llm.ts`、`tools/**`、`.github/**`、
  根/子包 `package.json`/`package-lock.json` 零改动。
- **AC6 · 回归面**：`npm run build` + `npm run gate`（8 场景）+ `npm test` +
  `npm run smoke:server` 全绿——本轮零 apps/web/packages/shared 触及，gate
  为纯回归面，按工作流脚本统一门禁执行口径采信（先例 0012/0014/0016/0017/
  0018/0019：VERIFY 不必复跑全套，REPORT 引用门禁结论）。
- **AC7 · 指针可核查**：When（VERIFY 执行）从本 PRD 引用的代码指针中抽样
  ≥5 条逐一打开比对，Then 全部与代码现状一致；发现任一指针失效即 FAIL 并列
  BUG。

## SPEC 移交要点（M 项不免 SPEC，skipSpec=false）

BK-0008 为 M 项——按 WORKFLOW §4 需独立 SPEC（`iterations/0020/SPEC.md`），
本节为移交清单：① 沙箱 DB 文件名与连接/生命周期策略；② 拒绝面黑名单精确
清单（ATTACH/DETACH/扩展加载/文件级 PRAGMA 枚举）与匹配实现（大小写/注释
引导的边界处置）；③ query/execute 返回载荷精确形状与限幅常量；④ 错误呈现
形态定案（throw 对齐 safePath 先例 vs {error} 载荷——须与 llm.ts 现有降级
语义 llm.ts:78-84 相容性论证）；⑤ M12+ 断言明细与沙箱测试文件自清方案；
⑥ 受影响文件清单与验收命令（npm run gate / npm test / npm run smoke:server /
反演步骤）。SPEC 不得扩权：任何超出 REQ-0008-01~05 的改动面变更回 PLAN 重议。

## 依赖与风险

- **依赖**：零新依赖、零 env、零出站；仅需既有 `npm run build:server` 产物链
  与 mcp-stubs 挂接基座（smoke-server.mjs:300-302 在位）。
- **风险 1 · SQL 黑名单不完备**：SQLite 文件级原语不止 ATTACH（如部分
  PRAGMA 可指定路径）。处置：SPEC 枚举成文 + AC2 覆盖最高危向量；沙箱锚定
  是第二道兜底（即便漏网，落点仍限沙箱目录与专用库文件，主库由 AC2 的
  grep 级核对+行为断言双护）。残余风险如实声明，不做完备性虚称。
- **风险 2 · 同步执行阻塞事件循环**：better-sqlite3 无语句级超时原语，一条
  巨笛卡尔积可阻塞 loop。处置：沙箱库量级小 + 工具载荷限幅 + PRAGMA 从严
  拒绝面降低可达性；worker 线程隔离超 M 尺寸，如实记为已知边界（沿 BK-0011
  「双实例」先例：明示边界照案不测）。
- **风险 3 · 期望计数硬编码漂移**：M03-M06 期望字符串与 FROZEN 必须联动，
  漏改即红（这正是 M07 防漂移设计意图，AC3 兜底）。处置：REQ-0008-04 列明
  每处联动点；VERIFY 逐条对照。
- **风险 4 · 与主库写通道混淆**：工具 DB 与 agentflow.db 必须物理隔离。
  处置：AC2 行为断言（ATTACH 主库被拒）+ 源码 grep（无主库路径）双护；
  store.ts 零接触（白名单排除）。
- **风险 5 · 测试污染沙箱**：M12+ 断言在沙箱建 DB 文件。处置：.gitignore:16
  已覆盖不入库；SPEC 定自清或专用文件名（REQ-0008-04）。

---

## 选题过程存证

- **批复栏「approved：无」处置（规则①）**：与实况一致——#10/#11 open 未批复
  （BK-0028~0030、BK-0021/0023 转 ready 条件未满足，维持 proposed 零实现）；
  现存批复 ready 项 BK-9002~9005（P0/L/触UI=是）**顺延**（0016~0019 先例，
  本轮逐项复核）：BK-9002/9003/9005 前置 BK-0021 实施轮未批（BK-0031 先行已
  done、issue#11 open）；BK-9004 前置已满足但 L 项拆分排序归 10-25 周日治理日
  （`ROADMAP.md:154-155`），心跳抓取即夹带拆分违「一次迭代只做一件事」。
- **user-request（规则②）**：本轮档案 issue 面板七项（#2~#6、#10、#11）全为
  needs-approval，**无 user-request 条目**——无建行、无 uiIssueNumbers。#6 open
  未批复：维持待批准区不建行、不催办、不代批。
- **rejected（规则③）**：无处置。
- **残缺标记档案**：`tools.ts:5`（注释doctrine）与 `tools.ts:82`（stub 工厂）
  为 BK-0005 done 的设计产物，其 sqlite 分支即本项 BK-0008 承载摘除——无新项；
  `package-lock.json:787` 的「XXX」命中为 base64 integrity 哈希内子串
  （…g1XXXevb5dJI7…），非残缺标记，不立项。
- **悬挂 run 探针**：`[]`——与迭代 0019 BK-0011 启动扫尾落地后的预期一致
  （161ce4ff 已收敛 stopped，iterations/0019/REPORT.md AC1），无新项。
- **覆盖差集 / 文档漂移 / dogfooding**：治理日产物（weekly/ 与 BACKLOG 既有
  证据行），心跳不重复采集。已知漂移存量（AGENTS.md「现 84 断言」口径、0019
  BUG-0001 PRD 行号笔误）留 10-25 治理日批处理，不在本轮夹带。
- **选题（规则④）**：BK-0008——治理日解阻链明示尾项「0020→BK-0008」
  （`weekly/43.md:315`、`ROADMAP.md:166-169`；0018 PRD 选题节逐字引用），
  前三顺位已于 0017/0018/0019 done；批复项顺延后非 doc ready 池恰一项
  {BK-0008（P2/M）}；doc ready 池为 0，无跳过争议。
- **skipSpec 判定**：M 项 → 不免 SPEC（skipSpec=false），SPEC 移交要点见专节。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE /
  POLICY / WORKFLOW / CONSTITUTION / .zcode/agents/product-manager.md 全文
  read；iterations/0019/PRD.md 全文 read + 0018/0017 PRD 选题节 read（近 3
  迭代重叠面据此核对）；weekly/43.md §四.4-四.5 read（:305-316 sed 实取）；
  `apps/server/src/tools.ts` 全文 read 117 行（SANDBOX :14-15、safePath :17-21、
  IMPL :26-73、sqlite null :59、STUB_MARK :80-87、TOOL_SPECS :89-102、
  collectTools :105-116）；`apps/server/src/llm.ts` 全文 read 123 行
  （collectTools :38、stubCount :46、路由 :56-59、降级 :78-84、摘要 :107）；
  `tests/smoke/mcp-stubs.mjs` 全文 read 133 行（FROZEN :27-33、M02-M07、
  M08-M11 源锁 :120-132、BK-0008 遗嘱注释 :26）；`tests/smoke/lib.mjs`:1-20
  read（边界规则 :6-7）；`smoke-server.mjs` grep（挂接 :30/:300-302）；
  `app.js` grep（sqlite 注册表 :108）；`store.ts`:1-45 read（better-sqlite3
  import :21、ROOT/DB_FILE :28-31）；`apps/server/package.json` 全文 read
  （better-sqlite3 :15、@types :21）；根 `package.json` 全文 read（allowScripts
  :31-33）；`.gitignore` 全文 read（sandbox :16）+ `git check-ignore -v
  apps/server/sandbox/x.db` 实跑命中 + `git status --porcelain` 干净；
  `date` 实查 2026-10-24 19:27。
