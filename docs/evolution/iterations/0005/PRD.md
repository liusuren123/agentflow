# PRD · 迭代 0005 · BK-0007 websearch 引擎参数生效化：eng 参数路由（博查/SearXNG），未接入引擎如实降级

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 15:24
> 来源：BACKLOG BK-0007（P1 / capability / M / ready / 触UI=否，`docs/evolution/BACKLOG.md:15`）；
> 主题归属 ROADMAP T3-M1（后端执行能力 · websearch 引擎参数生效化，`docs/evolution/ROADMAP.md:74-77`）。
> 选题依据：ready 队列现存 2 项——BK-0007（P1/M/capability）与 BK-0004（P2/S/test）
> （`BACKLOG.md:15-16`，其余为 proposed/blocked/done）；按 BACKLOG 头注「同优先级按表中
> 顺序」取最高优先级 P1 表首 BK-0007；无 L 项需拆分（M 大小在选题规则偏好内）。
> 与最近 3 次迭代零重叠：0002=T2-M2 冒烟脚本（test）、0003=T2-M1 契约测试（test）、
> 0004=T4-M2 README 同步（doc）；本项为 T3 后端能力，改动面 `apps/server` 与
> `tests/smoke`，主题互斥。BK-0007 备注的 VERIFY 前置「依赖 BK-0002」已满足
> （BK-0002 done，`BACKLOG.md:12`）。

## 结论

**建议做（本迭代即做）**：一句话理由——websearch 节点参数 `eng` 在 UI 组合框里已提供
四个引擎选项（`packages/shared/src/nodes.ts:48`），但后端完全忽略它（
`apps/server/src/handlers.ts:51` 调 `webSearch(q, max)` 不传引擎），用户显式选择
「博查」或「SearXNG」被静默丢弃、实际永远走固定回退链——这是「UI 承诺了后端不兑现」
的能力缺口；生效化属纯后端路由改造（ROADMAP T3 硬边界内：只改 handler/search/guard/
config，零 DEFS、零前端），且以「未接入/未配置引擎如实降级」为语义红线，M 大小
单迭代可完整交付并直接关账 ROADMAP T3-M1。

## 触 UI 分类结论

**否。** 论证（逐层对照宪法第 1 条三层）：

1. **视觉/DOM/交互三层零接触**：`apps/web` 与 `packages/shared` 零改动。eng 组合框
   及其选项 `['Bing','Google','博查','SearXNG']` 早已存在于 DEFS 并渲染于属性面板
   （`nodes.ts:48`，2026-10 定稿产物，golden 场景内已冻结）——本项只让后端开始
   兑现既有选项，不动任何选项、默认值（`d:'Bing'`）与 DEFS 呈现性字段。
2. **运行态数据文本 ≠ UI 结构**：本项会改变 websearch 节点运行后的 `out` 摘要与
   `log` 事件文案（SSE 载荷内容）。这些是运行时数据（node:done.out / log.msg），
   经既有 SSE→legacy 渲染管道原样展示，渲染路径本身零改动；golden 4 场景均为静态
   定稿态，不含运行中的 websearch 节点输出，像素比对不受影响。同类先例：handlers
   的 out/log 文案在 ADR-0004 TS 化后从未被视作 UI 冻结对象。
3. **防误触兜底**：验收仍要求 `npm run gate` 4 场景全绿 + `npm test` 全绿（AC6），
   机器证明渲染零影响。

## 背景（含代码事实源，2026-10-22 本会话只读核实）

1. **eng 被忽略的现状**：websearch handler 取 `p.eng` 所在的完整参数对象但只消费
   `max`——`const res = await webSearch(q, Number(p.max)||5)`（`handlers.ts:51`）；
   `webSearch` 签名仅有 `(query, count)`（`apps/server/src/search.ts:14`），内部固定
   回退链：BOCHA（`process.env.BOCHA_API_KEY` 直读，`search.ts:19`）→ DuckDuckGo HTML
   （`search.ts:32-54`）→ 返回 `null`（调用方降级为「搜索不可用 · 已跳过」，
   `handlers.ts:52-55`）。返回时 `engine` 字段标实际服务引擎（'博查'/'DuckDuckGo'），
   out 摘要已含该名（`handlers.ts:58`）。
2. **参数装配链**：engine 以共享注册表默认值与节点 params 合并装袋
   （`apps/server/src/engine.ts:38` `P(n)`），故 handler 内 `p.eng` 恒有值（默认
   'Bing'，`nodes.ts:48`）。**不需改 DEFS 即可拿到全部四个选项值。**
3. **config 现状**：env 白名单 + zod 启动校验在 `apps/server/src/config.ts`——
   已知变量清单 `config.ts:28-32`、`EnvSchema` `config.ts:49-62`（URL 校验先例：
   `AI_BASE_URL` 用 `.trim().url()`，`config.ts:50`）、空串视为未配置
   （`config.ts:26-35`）、「未配置任何密钥合法、配了非法 fail-fast」（文件头注
   `config.ts:4-6`）。`BOCHA_API_KEY` 已在白名单与 schema（`config.ts:30,57`），
   产物字段 `bochaApiKey`（`config.ts:96`）——但 search.ts:19 直读 process.env 而非
   config 产物（现状事实，是否统一归 SPEC）。
4. **出站守卫现状**：搜索的两个外部 API 出口集中在 guard.ts 固定主机网关
   （`bochaWebSearch` `guard.ts:71-79`、`ddgHtmlSearch` `guard.ts:81-86`），目标主机
   为编译期常量；search.ts 文件头注明「本模块不含任何网络出口」的设计约定
   （`search.ts:5-7`）。SearXNG 的目标主机来自 env（运维者配置、非工作流用户可控），
   与编译期常量威胁模型不同——SPEC 须为 SearXNG 设计出站通道（仍经
   `assertPublicUrl`，`guard.ts:33`）；自托管 SearXNG 常在内网/本机，既定逃生通道是
   `ALLOW_PRIVATE_NET`（guard.ts:5-6 头注、`config.ts:90`）。
5. **SEARXNG 全仓零存在**：`grep -rn "SEARXNG" apps/server/src apps/server/.env.example`
   0 匹配（本会话实查）——`SEARXNG_URL` 为全新可选 env。`.env.example` 有 BOCHA
   注释行先例（`apps/server/.env.example:16`）。
6. **MCP web-search 工具共用 webSearch**（`apps/server/src/tools.ts:61-72`）：工具
   返回值已如实携带 `engine` 名（`tools.ts:65,70`），但工具 schema 无 engine 参数
   （`tools.ts:83-84`）——本项不为其加参（见非目标）。
7. **冒烟基座现状（VERIFY 依赖）**：`npm run smoke:server` 一键在位（BK-0002 done，
   `BACKLOG.md:12`）；`tests/smoke/smoke-server.mjs` 288 行 + `lib.mjs` 243 行（本会话
   `wc -l` 实查），已有 SSE 流事件收集与逐条断言模式（如 approval 流，
   `smoke-server.mjs:224-237`）；**现无任何 websearch/engine 断言**（grep 两文件
   engine/eng/websearch 0 匹配，本会话实查）。新增断言须守单文件 ≤400 行约定
   （AGENTS 硬性约定 4；smoke-server.mjs 已 288 行，扩容空间有限，SPEC 可能需拆分）。
8. **ROADMAP T3-M1 验收口径**（`ROADMAP.md:74-77`）：eng=博查 走 BOCHA_API_KEY；
   eng=SearXNG 走新增可选 env `SEARXNG_URL`（config zod 校验、缺省合法）；
   Bing/Google 未接入时 out 摘要与日志如实标注；验收 = 冒烟断言 engine 随 eng 切换
   + gate 4 场景全绿（零前端改动）。
9. **README 红线交接**：迭代 0004 AC4 明令 README 不得肯定性记述 eng 路由（当时未
   落地，`docs/evolution/iterations/0004/PRD.md` AC4①）。本项落地后该红线自然解除，
   但 README 补记**不在本项范围**（见非目标），留给治理日另行小项，避免本迭代夹带。

## 目标

1. 关账 ROADMAP T3-M1：websearch 节点的 `eng` 参数在后端真实生效——显式选引擎被
   严格路由，未接入/未配置引擎如实降级且文案可区分、可断言。
2. 消除「UI 已承诺、后端不兑现」的能力缺口：用户在属性面板选择「博查/SearXNG」后，
   后端行为与选择一致；选择「Bing/Google」（后端未接入）时得到如实的回退说明而非
   静默忽略。
3. 为后续 T3 项（BK-0008 sqlite 接入等）沉淀「新增可选 env + zod 校验 + 守卫出站 +
   冒烟断言」的完整先例链。

## 非目标（out of scope）

- **不改 `packages/shared` 任何文件**（DEFS 是宪法保护对象，ROADMAP T3 硬边界，
  `ROADMAP.md:66-68`）；迭代 0003 的 DEFS 漂移防护测试全绿即为机器证据（AC7）。
- 不改 `apps/web` 任何文件；不触 `tools/pixel-gate/`、CI 配置与 golden 基线
  （WORKFLOW §6 护栏 2/3）；不运行 `npm run gate:update`。
- **不为 MCP web-search 工具增加 engine 参数**（背景 6）：工具 schema 与行为零变化，
  仍走回退链并如实携带 engine 名——加参属 LLM 工具契约扩面，另行立项评估。
- 不接入 Bing/Google 真实 API（无密钥体系，ROADMAP 明示「未接入时如实标注」）；
  不做引擎结果合并/重排/缓存等增强。
- 不更新 README（背景 9：留治理日小项）；不改 `docs/ai-sdk-7-功能汇总.md`。
- 不为 search.ts 直读 env 与 config 产物的风格差异做统一重构（背景 3；SPEC 可顺手
  统一到 config 产物，但不得改变行为语义）。

## 用户故事

1. 作为工作流搭建者，我在 websearch 节点选择「博查」，系统就用博查 API 执行搜索；
   我选「SearXNG」（配了自托管实例），系统就查我的实例——选择即事实。
2. 作为工作流搭建者，我选了后端未接入的引擎（Bing/Google）或未配置密钥的引擎时，
   在节点输出与日志里看到**为什么**没有按我的选择执行、实际用了什么/为何跳过，
   而不是被静默换成别的引擎。
3. 作为运维者，我用 `SEARXNG_URL` 指向自托管实例即可启用 SearXNG 引擎；不配置时
   服务照常启动（缺省合法），配错值时启动期 fail-fast 并指名变量（与既有 env 一致）。
4. 作为 test-manager，我需要按 eng 值可区分的路由证据（冒烟断言），使 T3-M1 的
   「engine 随 eng 切换」验收可复现、不依赖外部网络成败。

## 需求条目

- **REQ-0007-01 · eng 路由语义定档**（本 PRD 的核心产品决策）：
  - `eng='博查'` → **严格路由**至博查 API；`BOCHA_API_KEY` 未配置 → 不静默换引擎，
    节点以「搜索不可用」收尾（维持现有跳过语义：其余流程继续，`handlers.ts:54`），
    且 log/out 指明「eng=博查 但未配置 BOCHA_API_KEY」。
  - `eng='SearXNG'` → **严格路由**至 `SEARXNG_URL` 指向的实例；env 未配置 → 同上
    如实跳过并指明「未配置 SEARXNG_URL」；配置了但实例不可达/返回异常 → 如实跳过
    并指明原因（不回退其他引擎、不伪造结果）。
  - `eng='Bing'|'Google'`（后端未接入）→ **维持现有回退链不变**（BOCHA 已配置则
    博查 → DuckDuckGo → null，`search.ts:19-57` 现状），但新增 log warn 如实标注
    「引擎 X 未接入，已按回退链执行」；out 摘要沿用现状携带实际服务引擎名
    （`handlers.ts:58`）。Bing 是 DEFS 默认值，此路径 = 现状行为 + 标注，**存量
    工作流零行为回归**。
  - `eng` 为非法/未知值（combo 之外的存量脏数据）→ 与未接入同路径（回退链 + warn
    标注实际收到的值）。
  - 设计依据：显式选引擎 = 明确用户意图，静默换引擎违背「不伪造结果」红线；默认值
    Bing 走回退链 = 兼容存量（默认节点在配了 BOCHA key 的环境行为完全不变）。
- **REQ-0007-02 · SEARXNG_URL 配置接入**：config.ts 白名单（`config.ts:28-32`）与
  EnvSchema（`config.ts:49-62`）新增可选 `SEARXNG_URL`——`.trim().url()` 校验
  （先例 `AI_BASE_URL`，`config.ts:50`）；缺省/空串合法（语义同 `config.ts:26-35`）；
  配了但非法 URL → 启动期 fail-fast 指名变量（`config.ts:64-67` 机制）。产物字段
  （如 `searxngUrl`）供 handler/search 消费。`.env.example` 补一行注释（先例
  `.env.example:16`）。
- **REQ-0007-03 · SearXNG 出站走守卫**：SearXNG 请求不得绕过 guard（AGENTS 硬性
  约定 3「出站请求必须走 guard.ts」）。通道形态（guard 内新增网关函数 / 复用
  `guardedFetch`）归 SPEC；默认拦截私网目标，自托管内网实例经既有
  `ALLOW_PRIVATE_NET=1` 通道放行（`guard.ts:5-6`）。SearXNG 查询协议（`format=json`
  等参数、结果字段映射到 `{title,url,snippet}`）归 SPEC 定稿并写入 SPEC 验收点。
- **REQ-0007-04 · 如实降级文案可断言**：每个路由分支的降级/标注文案（log.msg 与
  out）必须**包含 eng 的值与所缺配置的变量名**（如「未配置 BOCHA_API_KEY」「未配置
  SEARXNG_URL」「引擎 Bing 未接入」），使冒烟可用子串断言区分分支；具体措辞 SPEC
  定稿，但四分支文案互斥可判。禁止出现「搜索成功」类伪装性表述。
- **REQ-0007-05 · 冒烟断言扩展（VERIFY 承载）**：在 `tests/smoke` 内以真实进程断言
  engine 随 eng 切换（ROADMAP T3-M1 验收口径），**确定性、不依赖外网成败**——
  在受控 env（未配置 BOCHA_API_KEY/SEARXNG_URL，SPEC 须确保冒烟子进程 env 显式
  覆盖，防开发者本机 `.env` 泄入）下至少三条：①eng=博查 → log/out 含
  「BOCHA_API_KEY」缺失语义且无 DDG 结果；②eng=SearXNG → 含「SEARXNG_URL」缺失
  语义；③eng=Bing → 含「未接入」标注（该标注在回退链尝试前发出，与网络成败无关）。
  正路径（真实博查/SearXNG 调用）不入冒烟（外部依赖不可复现），列手动 E2E 可选
  点位。新增断言逐条命名；既有 33 断言零回退；单文件 ≤400 行（现状 288，SPEC 评估
  拆分，背景 7）。
- **REQ-0007-06 · 契约与前端零漂移**：`packages/shared` 与 `apps/web` 的 git diff
  为空即为本需求的机器判据（AC6/AC7 引用）。

## 非功能要求

1. **可复现**：冒烟新增断言在任何网络环境（含完全离线）结果一致——只锁定路由证据
   文案，不锁定外部引擎返回内容。
2. **零前端影响**：`apps/web` 零改动；产品提交前 `npm run gate` 4 场景全绿 +
   `npm test` 全绿（迭代 0003 后为 node --test 8 项）。
3. **安全**：新增出站只经 guard 通道；查询词只进请求参数/请求体（沿 search.ts 头注
   约定，`search.ts:5-7`）；SearXNG URL 是运维 env 而非工作流用户输入。
4. **兼容**：存量工作流（eng 默认 'Bing'）行为不变（REQ-0007-01 第三分支）；未配置
   任何新 env 的部署启动行为不变。
5. **规模**：改动预计集中在 `search.ts`（58 行）+ `handlers.ts` websearch 段 +
   `config.ts`/`guard.ts`/`.env.example` 小增量 + 冒烟断言；新增文件 ≤400 行。

## 验收标准（Given / When / Then）

- **AC1 · eng=博查 严格路由**：Given 服务未配置 `BOCHA_API_KEY`，When 经
  `/api/v1/run` 执行含 `eng='博查'` websearch 节点的工作流，Then 节点以「搜索不可用」
  跳过收尾（run 不失败、其余流程继续），SSE log/out 文案含 eng 值与
  「BOCHA_API_KEY」缺失语义，且不出现 DuckDuckGo 结果；Given 已配置 key（手动 E2E
  可选点位），When 同节点执行，Then 返回结果且 engine='博查'。
- **AC2 · eng=SearXNG 严格路由**：Given 服务未配置 `SEARXNG_URL`，When 执行含
  `eng='SearXNG'` 节点的工作流，Then 如实跳过且文案含「SEARXNG_URL」缺失语义；
  Given 配置了指向可达实例的 `SEARXNG_URL`（手动 E2E 可选点位），Then 返回结果且
  engine='SearXNG'；Given 配置了但实例不可达，Then 如实跳过并指明原因（不回退、
  不伪造）。
- **AC3 · eng=Bing/Google 回退链保持 + 如实标注**：Given 存量默认工作流
  （eng='Bing'），When 执行，Then 行为与现状一致（BOCHA 已配置走博查、否则 DDG、
  均不可得则跳过——三条收尾形态与改造前逐一对照），且 SSE log 出现「未接入」标注
  （该标注先于回退链尝试发出，网络无关）；out 摘要在有结果时含实际引擎名（现状
  语义保持）。
- **AC4 · SEARXNG_URL 配置校验**：Given 只设 `SEARXNG_URL=not-a-url`，When 启动
  server，Then fail-fast 且报错指名 `SEARXNG_URL`（zod url 校验）；When 未设置或
  设为空串，Then 启动正常（缺省合法）；其余既有 env 校验行为零变化。
- **AC5 · 冒烟断言 engine 随 eng 切换**：Given 冒烟以受控 env 启动真实 server 进程
  （未配置两引擎 env），When 执行 `npm run smoke:server`，Then 新增 ≥3 条 eng 路由
  断言（博查缺失/SearXNG 缺失/Bing 未接入标注）逐条通过、与既有 33 断言合并全过、
  退出码 0；When 人为破坏任一路由分支（反演演练，VERIFY 可选），Then 对应断言红。
- **AC6 · 渲染零影响**：Given 本迭代产品面改动仅在 `apps/server` + `tests/smoke` +
  `apps/server/.env.example`，When 产品提交前运行 `npm run gate` 与 `npm test`，
  Then gate 4 场景全绿（diffPx=0）、test 全绿（8 项）；`git diff` 证明
  `apps/web` 与 `packages/shared` 零改动。
- **AC7 · 契约零漂移**：Given 迭代 0003 的 DEFS 防护测试在库（默认值 33/33 等），
  When 运行 `npm test`，Then 全绿——eng 组合框选项与默认值 'Bing' 未被触碰的机器
  证据。

## 依赖与风险

- **依赖**：BK-0002 冒烟基座（done，背景 7）；手动 E2E 正路径需自备 BOCHA key /
  可达 SearXNG 实例（可选，不阻断 VERIFY 判定）。
- **风险 1 · 冒烟 env 泄漏**：开发者本机 `apps/server/.env` 若含 BOCHA_API_KEY，
  会改变「eng=博查 缺失」分支的走向 → REQ-0007-05 已要求冒烟子进程 env 显式受控
  （SPEC 落实现；lib.mjs 起进程处为改动点）。
- **风险 2 · SearXNG 实例异构**：JSON 输出需实例侧开启 `format=json`，字段布局随
  版本有差 → SPEC 定查询协议与解析容错；不可达/异常一律走如实跳过（REQ-0007-01），
  不影响主流程。
- **风险 3 · out/log 文案变化被误判为 UI 变更**：触 UI 结论已按三层逐层论证（运行态
  数据文本非 UI 结构，golden 不含运行态 websearch 输出）；若 VERIFY 或评审对此
  存疑，按宪法第 5 条「存疑按影响处理」升级协调者裁定，实现前零成本。
- **风险 4 · SPEC 重构 handlers/search 边界**（如路由判定纯函数化进 search.ts）：
  允许，行为语义以本 PRD REQ-0007-01 为唯一口径；文件规模约束（≤400 行）随行。
- **风险 5 · smoke-server.mjs 行数余量**（288/400）:断言扩容可能触顶 → SPEC 评估
  拆场景文件（node --test 不涉，冒烟是独立脚本，拆分自由度在 lib 复用）。

---

> 选题过程存证：本 PRD 由独立 PLAN 会话产出。ready 队列核对（`BACKLOG.md:15-16`）：
> BK-0007（P1/M/capability）为 P1 表首 → 选中；BK-0004（P2/S）顺位其后留作后续候选。
> 无 L 项需拆分。与最近 3 次迭代（0002=T2-M2、0003=T2-M1、0004=T4-M2）及 0001
> （T1 盘点 blocked）主题、承载项、改动面零重叠。代码与文档引用均于 2026-10-22
> 15:24 本会话只读核实（handlers.ts / search.ts / guard.ts / config.ts / engine.ts /
> tools.ts / nodes.ts(websearch 段) / .env.example / tests/smoke 两文件 wc+grep /
> BACKLOG / ROADMAP / metrics / 0002-0004 三迭代 PRD）。
