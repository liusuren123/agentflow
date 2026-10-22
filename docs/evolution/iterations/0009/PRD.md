# PRD · 迭代 0009 · BK-0005 MCP 工具能力核对：sqlite/browser 未实现项的如实降级文案与日志一致性

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 21:15
> 来源：BACKLOG BK-0005（P2 / debt / S / ready / 触UI=否，`docs/evolution/BACKLOG.md:20`）；
> 主题归属 ROADMAP T3·后端执行能力（`docs/evolution/ROADMAP.md:62-72`，T3 现状基线明载
> 「sqlite/browser 如实降级 not implemented」）。非里程碑关账项——T3-M1 已由迭代 0005
> 关账（BK-0007）；本项是 **T3-M2（BK-0008 sqlite 真实接入）的前置钥匙**（BK-0005 备注
> 明示「在 BK-0008 之前执行」，BK-0008 备注明示「BK-0002/0005 完成后转 ready」——前者
> 已 done）。
> 选题依据：ready 队列现存 3 项——BK-0005 / BK-0010 / BK-0011（均 P2 / S）
> （`BACKLOG.md:20,23-24` 全表核对，2026-10-22 21:10 本会话实查；其余为 done×7 /
> blocked×1 / proposed×2 / 待批准区×1）。无 P0/P1 ready 项；同优先级按表中顺序
> （`BACKLOG.md:4`）→ **BK-0005 为最高顺位 ready**；S 大小正合选题规则偏好（优先 S/M，
> 无 L 项需拆分）；且解锁效应唯一（BK-0010/0011 无下游依赖）。
> 与最近 3 次迭代零重叠：0006=tests/canvas + package.json 一行（portCache 回归）、
> 0007=纯 docs/evolution/ 补题轮（零实现）、0008=docs/ 新文档（BK-0012）——本项核对与
> 修复对象为 `apps/server/src/tools.ts` / `llm.ts` 运行态文本，与三者路径互斥；
> 0007 补题轮已对照全史确认**无任何迭代触碰过 tools.ts**（迭代 0005 明确 MCP 工具
> schema 零变化，`iterations/0007/PRD.md:49`）。

## 结论

**建议做（本迭代即做）**：一句话理由——「不伪造结果」是本仓 MCP 工具链的立身原则
（`tools.ts:4-5` 头注 + `README.md:58` 对外承诺「未实现者如实告知模型」），但该承诺
今天**没有任何自动化断言锁定**，且我在 PLAN 阶段只读预审已发现 3 处候选疑点（背景 4：
stub 调用日志级别与既有「未接入」先例不一致、✓ 摘要行把 stub 计入工具数且不区分、
60 字符 preview 会截断 browser.* 工具的如实 note 尾部）。本项把「如实降级」从口头原则
升级为：逐触点审计矩阵 + 不一致修复 + 自愈性回归断言，并为 BK-0008（sqlite 真实接入）
提供干净的基线——届时 `（未实现）` 标记与 stub 的摘除路径正是本项断言守护的对象。

## 触 UI 分类结论

**否。** 论证（逐层对照宪法第 1 条三层）：

1. **改动对象全部是后端运行态文本**：候选改动点为 `tools.ts` 的 TOOL_SPECS desc 与
   stub 返回 note、`llm.ts` 的 SSE log 载荷（`msg`/`lvl` 字段**取值**）与 pino 日志级别、
   摘要行文本——均为运行时数据内容，非 UI 结构。先例：迭代 0005 修改 `handlers.ts`
   运行态日志文案（`引擎「${eng}」未接入…`，`handlers.ts:68`）已被判定「运行态数据
   文本 ≠ UI 结构」（`iterations/0005/PRD.md` 触 UI 分类结论第 2 条；0007 PRD:32-33
   同口径援引）。`lvl:'warn'` 是既有合法取值（`handlers.ts:68` 在用），改的是数据
   路由而非渲染结构。
2. **SSE 契约零变化**：不改事件名、不新增/删除/改名字段，只改既有字段内的文本内容与
   取值——契约（`packages/shared` SSE 事件名/形状）不动，契约测试（`npm test` 8 项）
   必须保持全绿即为机器证据。
3. **前端零改动是硬约束而非假设**：前端 MCP 注册表 `MCP_SERVERS`（`app.js:103-114`）
   与设置面板渲染（`app.js:974-997`）对 sqlite/browser **无「未实现」标注**——这是
   冻结现状，「如实告知」职责只能归后端承担（REQ-0005-03 明令禁止以此为由改前端；
   若 SPEC/实现发现必须改前端才能达成一致性，立即中止转待批准区流程）。
4. **防误触兜底**：验收要求 `npm run gate` 4 场景全绿（AC4）——零渲染路径接触的
   机器证据。

## 背景（含代码事实源，2026-10-22 21:10-21:15 本会话只读核实）

1. **未实现工具清单（核对对象，两项均核实未接入，范围不缩减）**：sqlite（query /
   execute）与 browser（navigate / click / screenshot）共 **5 个工具**——`IMPL` 表
   `'sqlite': null /* 未实现：如实告知模型 */`、`'browser': null`（`tools.ts:59-60`）；
   TOOL_SPECS 五条 desc 带「（未实现）」前缀（`tools.ts:85-89`）；已实现的
   filesystem/fetch/web-search 共 7 工具无该前缀（`tools.ts:78-84`）。
2. **如实降级的四个触点（审计矩阵的列定义）**：
   - **模型可见 desc**：`collectTools` 展开后由 `llm.ts:45-53` 装配，desc 直传
     `tool({ description: spec.desc … })`（`llm.ts:53`）——「（未实现）」前缀会如实
     到达模型；
   - **模型可见 stub 结果**：`collectTools` 对 null 组/未知工具统一挂 stub
     `async ()=>({ error:'not implemented', note:'工具 ${server}.${n} 未接入真实实现' })`
     （`tools.ts:100`）——模型调用后拿到如实载荷；
   - **用户可见 SSE 日志行**：execute 回调 `emit('log', { lvl:'sys', msg:'🔧 工具调用
     ${name}(${preview(a,40)}) → ${preview(res,60)}' })`（`llm.ts:56`）——stub 调用与
     成功调用同格式、同 `sys` 级别；
   - **运维可见 pino 日志**：`ctx.log.info({ tool, args, result }, '工具调用')`
     （`llm.ts:55`）——stub 调用与成功调用同为 info 级。
3. **「如实降级」的仓内先例（一致性比对基准）**：websearch 引擎未接入时
   `lvl:'warn'` + 文案「引擎「${eng}」未接入 AgentFlow 后端，已按回退链…」
   （`handlers.ts:67-68`）；通知渠道未接入时 `lvl:'info'` + out 文案「(渠道未接入，
   已记录)」（`handlers.ts:115-116`）。
4. **PLAN 阶段只读预审发现的 3 处候选疑点（供 BUILD 审计实判，PM 不预判结论）**：
   - 疑点 A · 日志级别不一致：stub 工具调用在 SSE 与 pino 两路均为普通级别（`sys` /
     `info`，`llm.ts:55-56`），与 websearch「未接入」先例的 `warn`（`handlers.ts:68`）
     口径不齐——用户在日志面板看到的是与成功调用无异的蓝色工具调用行；
   - 疑点 B · ✓ 摘要行不区分 stub：`✓ ${n.title} · 生成 N tokens · MCP X 服务/Y 工具`
     （`llm.ts:103-105`，`capSummaryServer` 把全部勾选工具计入，`llm.ts:114-118`）——
     5 个工具里 2 个是 stub 时摘要仍报「5 工具」，无未接入提示；
   - 疑点 C · preview 截断吞尾：`preview(res,60)`（`llm.ts:56`；规则 `util.ts:36`
     `s.length > n ? s.slice(0,n)+'…' : s`）——本会话逐字符核算：sqlite.query 的 stub
     载荷恰 60 字符不截断，browser.navigate 载荷 64 字符 > 60 → 日志行尾部被截为
     「…未接入真实实…」，如实 note 尾部丢失。
5. **前端注册表现状（冻结，只读不动的边界事实）**：`MCP_SERVERS` 五服务器齐列
   （`app.js:103-114`），sqlite/browser 工具描述无未实现标注（`app.js:108-111`）；
   设置面板按注册表渲染勾选（`app.js:974-997`）；节点能力 chip「MCP c.servers/5 ·
   工具 c.tools」（`app.js:783`）同为前端冻结面。**后端是如实体感的唯一出口。**
6. **README 对外承诺（文档一致性核对点）**：`README.md:58`「MCP 工具 | filesystem
   （沙箱）/ fetch / web-search；未实现者如实告知模型」——本项审计即验证该承诺在
   四触点全部成立。
7. **测试基建现状**：`npm test` = node --test 8 项（shared 契约，迭代 0003 口径）；
   `npm run smoke:server` = 39 断言（迭代 0005 口径）；`tests/` 现有 golden/ + smoke/
   + canvas/ 三族。`collectTools` 与 `TOOL_SPECS` 均自 `tools.ts` 导出
   （`tools.ts:77,93`），可离线单测直断言（不依赖真实模型密钥）。
8. **防打转通道**：产品提交目标在 `apps/server/src`（运行态文本）+ `tests/`（新增
   断言），均在 `docs/evolution/` 之外（过滤器放行侧，先例迭代 0005 产品提交 a5b284f
   同通道）；REQ-0005-06 保证产品路径非空，BK-0001 空提交情形不适用。

## 目标

1. **审计**：5 个未实现工具 × 4 个触点 = 20 格审计矩阵逐格结论（一致 / 不一致+
   证据），比对基准 = 仓内「如实降级」先例（背景 3）与不伪造结果原则。
2. **修复**：判「不一致」的格在 `apps/server` 运行态文本内修复（背景 4 三疑点为
   首批候选），修复后前后行为可对照。
3. **锁定**：自愈性回归断言——未实现项必有「（未实现）」desc + stub 如实载荷；
   已实现项必无该标记（未来 BK-0008 真实接入 sqlite 时，忘摘标记/忘删 stub 即红，
   断言自动守护接入路径）。
4. **解锁 BK-0008**：核对完成后其转 ready 的前置条件（「BK-0002/0005 完成后转
   ready」）满足后半个。

## 非目标（out of scope）

- **不改前端任何字节**：`apps/web/**` 零改动（含 `app.js` MCP_SERVERS、设置面板、
  能力 chip——REQ-0005-03 白名单机器核对）；「给前端加未实现标注」属触 UI，只能走
  待批准区，本项不做也不夹带。
- **不实现 sqlite/browser 真实接入**：那是 BK-0008（M 大小，另行立项）；不改
  `IMPL` 表的 null 结构。
- **不改 SSE 契约**：`packages/shared/**` 零改动；事件名与字段结构不动，只改既有
  字段内文本/取值。
- 不改 `tools/pixel-gate/**`、`tests/golden/**`、CI 配置（WORKFLOW §6 护栏 3）；
  不运行 `npm run gate:update`。
- 不重写已实现工具（filesystem/fetch/web-search）的任何行为——它们的 desc/schema/
  日志仅在「已实现项不得含（未实现）标记」断言中被读取。
- 不更新 ROADMAP / BACKLOG / metrics 状态（CLOSE 职责）。

## 用户故事

1. 作为工作流作者，我在日志面板看到模型调用了 sqlite.query 时，能一眼从日志级别与
   文案分辨「这是未接入的工具如实回告」还是「真实执行」——不必逐行读 JSON 猜。
2. 作为模型（LLM），我拿到的工具 desc 与调用结果始终如实标注未实现状态，不会把
   stub 载荷误读为业务数据而继续编造后续步骤。
3. 作为 test-manager，我需要「如实降级」有自动化断言：任何人未来接入真实实现却
   忘摘「（未实现）」标记、或新增未实现工具忘加标记时，测试红。
4. 作为协调者，我需要 BK-0008 的前置条件在此关账，sqlite 真实接入可以在干净、
   有断言守护的基线上开工。

## 需求条目

- **REQ-0005-01 · 审计矩阵（首要交付物）**：对 sqlite.query / sqlite.execute /
  browser.navigate / browser.click / browser.screenshot 五工具 × 四触点（模型 desc /
  模型 stub 结果 / SSE 日志行 / pino 日志）逐格核对，产出 20 格矩阵（每格：结论 +
  `路径:行` 证据指针），比对基准为背景 3 先例与 `tools.ts:4-5` 不伪造原则。矩阵落
  SPEC（形态）与 REPORT（终论）；背景 4 三疑点为首批待实判项，不预设结论。
- **REQ-0005-02 · 不一致修复边界**：仅允许改 `apps/server/src` 内运行态文本与日志
  取值——TOOL_SPECS desc 文案、stub 返回 note、`llm.ts` 的 log `msg`/`lvl` 取值、
  pino 级别、✓ 摘要行文本、preview 截断长度参数。`lvl` 只准取既有合法值（`sys`/
  `info`/`warn`/`ok` 等 `handlers.ts`/`llm.ts` 在用集合），不得发明新级别值（防前端
  渲染分支踩空）。修复项每条附「修复前行为记录 → 修复后断言」对照（AC2）。
- **REQ-0005-03 · 契约与前端零变化（硬约束）**：`packages/shared/**` 与
  `apps/web/**` 零改动；SSE 事件名与字段结构零变化（既有契约测试全绿即机器证据）。
- **REQ-0005-04 · 自愈性回归断言**：新增自动化断言（落点 node:test 新文件或 smoke
  扩展，SPEC 定稿；离线可跑、不依赖模型密钥）：① `collectTools` 对 sqlite/browser
  五工具各返回 stub，调用之得到含 `error:'not implemented'`（或 SPEC 定稿的等价如
  实判据）的载荷；② TOOL_SPECS 中五未实现项 desc 均含「（未实现）」，七已实现项
  均不含——两个方向都断言（防忘加也防忘摘）；③ 断言逐条命名、失败信息含工具名。
- **REQ-0005-05 · README 一致性（条件项）**：若审计终论改变了对外的能力表述口径
  （如摘要行行为变化影响 `README.md:58` 描述），则 README 同步一行级修订；无口径
  变化则不动（避免为改而改）。
- **REQ-0005-06 · 改动面白名单与防打转**：产品提交 git diff 仅允许——
  `apps/server/src` 运行态文本改动 + `tests/` 新增断言 + （条件项）`README.md`
  一行级修订；其余任何路径零改动（AC5 机器核对）。产品路径必非空（测试新增是
  无条件交付物，BK-0001 空提交情形不适用）。

## 非功能要求

1. **如实优先于美观**：所有修复以「如实」为准绳——宁可日志难看也不得美化成类似
   成功的形态；文案与仓内先例（`handlers.ts:68,116`）措辞风格对齐。
2. **确定性**：新增断言离线可跑（直连 `apps/server/dist` 构建产物或等价方式，
   SPEC 定稿），不依赖外网、不依赖模型密钥、不依赖真实 sqlite/browser 环境。
3. **规模**：新增测试文件 ≤400 行（`AGENTS.md` 硬性约定 4）；`tools.ts`/`llm.ts`
   为存量文件不受新增上限约束，但本项对它们的净改动应保持文本级（预计 ≤40 行）。
4. **可审计**：审计矩阵每格挂指针；修复项前后对照；REPORT 终论含「发现 X 处 /
   修复 Y 处 / 维持 Z 处」计数，口径与 ROADMAP.md:5-7「禁止以看起来一致作为判定
   依据」同源。

## 验收标准（Given / When / Then）

- **AC1 · 审计矩阵完整**：Given 本 PRD 已落盘，When BUILD/SPEC 完成核对，Then
  SPEC 与 REPORT 含 5 工具 × 4 触点共 20 格矩阵，每格有「一致 / 不一致」结论与
  `路径:行` 证据指针，背景 4 三疑点（A/B/C）各有明确实判结论。
- **AC2 · 修复对照可断言**：对每个判「不一致」并修复的格，When 运行对应断言或
  复现步骤，Then 修复后行为与 SPEC 记载的「修复前行为」形成可区分的对照（如
  疑点 A：stub 调用的 SSE 日志 lvl 与成功调用可区分；疑点 C：browser.* 的如实
  note 在日志行不再被截断丢失关键信息——具体判据以 SPEC 定稿为准）。
- **AC3 · 自愈断言双向生效**：When 运行新增断言，Then 全部通过且逐条命名；当
  （VERIFY 反演演练）临时给某未实现项摘掉「（未实现）」标记、或给某已实现项加上
  该标记、或把 stub 换成返回伪造成功载荷，Then 对应断言红；演练后还原复绿。
- **AC4 · 既有防护零回退**：When 产品提交前运行 `npm run gate` + `npm test` +
  （推荐）`npm run smoke:server`，Then gate 4 场景全绿 diffPx=0、test 全绿
  （node --test 8 项 + 新增项）、smoke 39 断言全绿（口径 `STATE.md:13`）。
- **AC5 · 改动面白名单**：When 产品提交前核对 git diff，Then 产品路径仅
  REQ-0005-06 白名单（apps/server/src 文本级 + tests/ 新增 + 条件性 README 一行）；
  `apps/web/**`、`packages/shared/**`、`tools/pixel-gate/**`、`tests/golden/**`、
  `.github/**`、`CONSTITUTION.md`、`AGENTS.md` 零改动。
- **AC6 · 如实终论**：Then REPORT 明确记载审计计数（发现/修复/维持）与三疑点
  实判；若全触点判一致（零修复），如实记录并交付断言 + 矩阵，**不得为凑改动虚构
  不一致**（REQ-0005-06 测试新增仍保证产品提交非空）。

## 依赖与风险

- **依赖**：`apps/server` 构建链在位（`npm run build:server`，断言直连 dist 的
  可行性 SPEC 定稿）；无外网、无密钥、无前端构建依赖（gate 为既有门禁）。
- **风险 1 · 范围滑向「顺手实现 sqlite」**：非目标明令禁止；AC5 白名单机器核对
  `IMPL` 表结构不变（SPEC 记载 diff 边界），发现即红。
- **风险 2 · 修复被误判触 UI**：改动全部为运行态文本/既有取值（触 UI 分类结论
  1-2）；若 VERIFY 发现任何渲染差异（gate 红）立即按 WORKFLOW §4 BUILD 中止条款
  处置——本项设计上零渲染路径接触，gate 全绿是硬验收。
- **风险 3 · lvl 取值踩空前端渲染分支**：REQ-0005-02 限定只用既有合法值集合；
  SPEC 复核 `app.js` 日志渲染对所用值的分支覆盖（读前端是允许的，改才禁止）。
- **风险 4 · 断言依赖构建产物时机**：若直连 dist，需在 test 链前置 build:server
  （先例：迭代 0003 根 test 链改 build:shared→build:server→test，`metrics.md:9`）；
  SPEC 沿用既有链，不另造机制。
- **风险 5 · 预审疑点实判为「非缺陷」**：PM 预审不预设结论（REQ-0005-01）；三疑点
  若全被判维持现状，须在矩阵给出论据（如「sys 级别是有意设计，论据 X」），AC6
  如实记录即可，迭代仍以断言交付物成立。
- **风险 6 · BK-0008 晋升误读**：本项 done 仅满足其前置之一（BK-0002 已满足），
  晋升与否归 CLOSE/治理流程，本 PRD 不代批。

---

> 选题过程存证：本 PRD 由独立 PLAN 会话产出。ready 队列核对（`BACKLOG.md:20,23-24`，
> 2026-10-22 21:10 实查）：ready 共 3 项（BK-0005/0010/0011，均 P2/S）→ 无更高优先级
> ready、同优先级按表中顺序取 BK-0005；无 L 项需拆分；触UI=否 → outcome=selected。
> 与最近 3 次迭代（0006=T2 tests/canvas、0007=补题轮零实现、0008=T1-M2 docs/ 新文档）
> 承载项与改动面零重叠。代码与文档引用均于 2026-10-22 21:10-21:15 本会话只读核实
> （tools.ts 全文 read、llm.ts 全文 read、util.ts:36 preview 规则 grep、handlers.ts
> 未接入文案段 grep、app.js MCP_SERVERS 与设置面板段 read、README.md:58 grep、
> shared mcp/caps 定义 grep、BACKLOG / ROADMAP / metrics / STATE / 0006-0008 三迭代
> PRD；疑点 C 的字符数为本会话对 preview 规则的逐字符核算，供审计实判）。
