# ADR-0022 · 引擎 on-error 策略（重试 / 跳过 / 中止）env 语义清单与失败路径改造定界草案

- 状态：**草案 · 待实施轮消费（BK-0020）+ 依赖与 env 请批面——附录 A**（双位标注，
  ADR-0014 先例；本项无授权 issue 承继——env 批面以附录 A 首开，获批前零实现）
- 日期：2026-10-29（BUILD 阶段产出，迭代 0066 / BK-0061，S 项 skipSpec——受影响
  文件清单与验收口径内嵌 PRD，无独立 SPEC）
- 关联：BACKLOG BK-0061（本 SPEC 先行轮，ready，BACKLOG.md:82）/ BK-0020（on-error
  引擎实现块，proposed，BACKLOG.md:117——§6 回写其定界）/ BK-0048（节点级 on-error
  参数 UI 修宪轮，proposed，issue#6 批复承继——§5 边界切割对象）/ BK-9006（拆分
  母项，skipped）/ ROADMAP T5-M2 环境感知与数据真实化（ROADMAP.md:161-165，验收
  「节点失败可按策略降级」:164；W44 待办节「T5-M2 SPEC 三连穿插」:210-211 第 2 位
  ——第 1 位 BK-0060 已于迭代 0059 终态 done，ADR-0020 为直系同构先例）/ ADR-0014
  （双位状态行 + 附录 A 五要素直系先例）/ ADR-0020（T5-M2 SPEC 先行版式先例）/
  ADR-0004（config zod fail-fast 装载）/ ADR-0005（runs 持久化与 status 派生）/
  POLICY.md 需批准区（新增环境变量语义）
- 版式对齐：ADR-0014 / ADR-0020

> **显著声明：本 ADR 为定界方案草案，不实施任何代码、不引入任何依赖、不新增
> 任何 env 语义、不改变任何运行时行为、零 golden 接触。全部策略语义 / env 清单 /
> 改造点位仅以文字方案存在——定界到契约级（策略矩阵 + env 表 + 改造点位 + 验收
> 口径），不预写终稿代码（终稿归 BK-0020 实施 SPEC——BK-0035/BK-0045 同款纪律）。
> 本方案定义新增环境变量语义三项（§3）——POLICY 需批准区射程命中，附录 A 持
> 五要素 needs-approval issue 草案，**获批前零实现**；SSE 事件契约零新增为硬护栏
> （§4.4），实施轮确需新事件 / 新字段即中止转 needs-approval。本文件状态行在实施
> 轮 CLOSE 时按 ADR-0010/0012 先例更新，全文不出现批准态措辞（始终为草案态标注）。**

## 1. 动机与现状证据

### 1.1 动机

BK-0020 注入的是**引擎级错误处理策略**：on-error（重试/跳过/中止）引擎实现。
T5-M2 语境（ROADMAP.md:161-165）：「节点失败可按策略降级」为 M2 四验收之一
（:164）。BK-0048（issue#6 修宪链末子项，BACKLOG.md:69）行内实施顺序约束
「BK-0020 引擎语义先行，参数扩展与引擎语义同批或其后」——本 ADR 即 BK-9006
链收官的两级解阻第一级（ROADMAP.md:215：BK-0048 待 BK-0020 实现块 = BK-0061
CLOSE + env 批复）。本 ADR 为其 SPEC 先行（BK-0061，W44 治理日拆分，PRD =
iterations/0066/PRD.md）。

### 1.2 现状失败语义白描（代码事实，本 BUILD 会话逐项亲核，零杜撰）

- **失败 catch 块（engine.ts:102-112）**：`try` 包裹 handler 调用（:97-101，
  `r = await (HANDLERS[n.type] || HANDLERS.__pass)!(ctx, args)`）；catch（:102）
  非中止错误依次：`scope.executed.add(id)`（:103，标记已执行）→ `prog.done++;
  progress()`（:104）→ `emit('node:error', {id,title,message})`（:109）→
  `ctx.log.warn(…, '节点执行失败')`（:110，pino 服务端日志，非 SSE log 事件）→
  **`return`（:111）**。
- **下游静默失活机理**：:111 的 return 跳过出边激活段（:116-118——成功路径
  `outEs(id).forEach(… scope.firedEdges.add(e.id))`，条件分支按 firePort 选通）；
  主循环对入边零命中的节点直接跳过（:140 `if(es.length && !es.some(e=>
  mainScope.firedEdges.has(e.id))) continue;`）→ 失败节点的下游子图不再调度，
  **同级独立分支继续执行**。
- **中止路径（engine.ts:105-108）**：`isAbort(e) || ac.signal.aborted`（isAbort
  判定 util.ts:24）→ `emit('node:error', …, '已中止')`（:106）→ `throw e`（:107）
  → 主循环 catch（:143-145）`stopped = ac.signal.aborted || isAbort(e)` 置真 →
  run:done(stopped) 收尾。中止级联三源：stop 端点（server.ts:192-198
  `ctx.ac.abort()`）、优雅停机（server.ts:316-318 遍历 runsById 逐 run abort；
  宽限上限 5s :319-327）、handler 内部 abort 透传（:107 throw）。
- **run 终态 ok 语义（engine.ts:152）**：`emit('run:done', { …, ok: !stopped,
  stopped, … })`——**节点失败不影响 run 终态 ok**（ok =「未被中止」）。grep 亲跑
  `grep -n "failed\|node:error\|run:done\|status" apps/server/src/engine.ts`：`node:error`
  仅 :106/:109、`run:done` 仅 :152、`failed`/`status` **零命中**——run 级失败状态
  在引擎内不存在，佐证「无降级路径」立项语。
- **消费面四层（ok / node:error 语义的既有契约锚点）**：
  1. 契约注释 packages/shared/src/events.ts:32：「ok = 本次运行未被中止（≠全部
     节点成功）」——注释溯源 `git log -S 'ok = 本次运行未被中止'` = c17866f
     （BK-0021 批次 2 NDP 终轮随批 BK-0023 注释，内容零漂移）。**注释内坐标
     「server-sync.js:105-107」已漂移**：该区间现为 SSE 帧解析循环收尾（:103-107
     亲读：帧切分 / JSON.parse / onFrame 回调 / `{t:'end'}`），注释所述行为实锚
     :295-297；坐标修正归 BK-0020 实施轮顺带（文档同步面），本 ADR 只记录不改。
  2. 前端日志定级 apps/web/src/server-sync.js:295-297：`case 'run:done'` →
     `lvl: (ev.ok !== false && !ev.stopped) ? 'ok' : 'warn'`。
  3. 节点终态 apps/web/src/legacy/app.js:2506-2513：`case 'node:error'` → 移除
     `st-running` 加 `st-error` + `setNodeOut('执行失败 · …')` + 日志行——
     **node:error = 节点终态失败态**（§4.3 论证依据）；termview 追加错误行
     （app.js:2109-2116，`.node-term-err`）。
  4. 持久层 status 派生 apps/server/src/store.ts:302：`const status = ev.stopped ?
     'stopped' : (ev.ok ? 'done' : 'error')`——**run 级 'error' 状态链路已存在**，
     仅 run:done(ok:false) 触发；引擎正常路径 ok 恒 `!stopped` 故不可达，唯一
     现达路径是 server.ts:176-181（executeWorkflow 抛基建异常 → run:error +
     run:done(ok:false,stopped:false)）。前端 run 卡已备 'error' 呈现
     （server-sync.js:317 runCardMeta `case 'error'` → `· 失败`）。
- **结论**：现状 = 隐式「跳过（下游失活形态）+ 零重试」，无策略名、无重试、
  无 run 级失败反映；`node:error` 仅 :106/:109 两处 emit 即失败可见性的全部。

## 2. 三策略语义定界（REQ-0061-02）

策略矩阵（T = 终态策略；草案值，终稿归实施 SPEC）：

| 策略 | 尝试 | 失败节点终态 | 下游 | run 收尾 | run:done ok |
| --- | --- | --- | --- | --- | --- |
| skip（跳过） | 0 | executed + node:error | 失活（案 a） | 照常收尾 | 不变（§4.4） |
| retry（重试） | N（env） | 耗尽后按 skip 终态 | 同 skip | 照常收尾 | 不变 |
| abort（中止） | 0 | executed + node:error | 全部不再调度 | fail-fast 收尾 | **false（仅此策略）** |

### 2.1 skip · 两案对照（PRD 钦定必答）

- **案 a · 下游失活（推荐）**：= 现状终态语义的 named 化（§1.2 白描逐位保留：
  executed + node:error + 不激活出边 + 同级独立分支继续）。风险零新增；既有
  工作流在显式配置 `ON_ERROR=skip` 后行为与未配置逐位一致。
- **案 b · 沿默认出边放行（否决）**：失败节点伪造 firePort=0 激活默认出边，
  下游以 undefined / 残缺输入继续执行——错误被掩盖并向下游传播（数据污染面），
  与「失败可观测、可降级」的立项目的相反；且「默认出边」在多出边非条件节点上
  无既定语义（firePort 仅条件分支产出，engine.ts:117）。作为否决案留档，不作
  演进承诺。

### 2.2 retry · 重试

- 语义：handler 抛错且非中止 → 按 `ON_ERROR_RETRIES` 次数重试，间隔指数退避
  （`ON_ERROR_RETRY_DELAY_MS × 2^(n-1)`，单次上限 30000ms 草案封顶）；**任一次
  成功即按成功路径收尾**（结果 / tokens / ms 以末次成功尝试为准）；次数耗尽 →
  进入 skip 终态（案 a）。重试与 abort 组合（耗尽即中止 run）不在本定界射程
  （演进缝：实施 SPEC 可评估枚举扩值，需另批——env 值域变更同属请批面）。
- 宿主与 abort 响应见 §4.2（重试期间 stop / 停机须即时中断，写死）。
- **如实声明（残余风险）**：LLM / agent 流式节点的失败尝试可能已发出 `node:delta`
  （llm.ts:89/:101/:103、agent.ts:98），重试将从头再流 → 前端呈现面存在 delta
  叠加的观感风险。缓解方向（实施 SPEC 裁量）：以 `log` 事件通报「第 n 次尝试」
  使叠加可解释；**不以新增清零事件解决**（确需新增即中止转 needs-approval）。
  该风险入附录 A 知悉项。

### 2.3 abort · run 级 fail-fast

- 语义：节点失败（重试不适用或耗尽前即定）→ **停止调度全部后续节点**（含同级
  独立分支）→ run:done 收尾 `ok:false, stopped:false` → 持久层派生
  status='error'（store.ts:302 既有链路）→ 前端卡「· 失败」（server-sync.js:317）。
- **与既有中止级联的边界切割（写死）**：不调用 `ctx.ac.abort()`——abort 语义 =
  用户主动停 + 停机级联（§1.3），混用会污染 `stopped` 字段语义与
  status='stopped' 判定（store.ts:302 先判 stopped）。改为引擎内**独立 run 级
  标志位**（如 `onErrorAborted`），主循环 :137 同位置一并检查；run:done 的
  `stopped` 恒保持「用户/停机中止」独占语义。ok 语义扩展仅此策略生效，见 §4.4。

### 2.4 循环子节点与审批边界

- 循环节点的子执行经 `sub` 递归 runNode（engine.ts:100）——策略按**每次
  runNode 调用独立解析**（循环体内节点与主图节点同权），父 handler 对子失败的
  聚合语义不因策略改变（子失败仍按 skip 失活 / abort 上抛的既有路径）。
- 审批等待（approval:required）非失败，不触发任何策略；审批拒绝路径维持现状。

## 3. env 语义清单（REQ-0061-03 · 附录 A 请批面）

**定案 = 新增 env 语义三项**（POLICY 需批准区「新增环境变量语义」射程命中，
附录 A 五要素在案）。命名沿 config.ts 既有扁平大写风格（无前缀，PTY_* 同族）：

| 变量 | 值域（草案） | 默认 | zod 形态（先例指针） | 语义 |
| --- | --- | --- | --- | --- |
| `ON_ERROR` | `skip` / `retry` / `abort` | `skip` | `z.enum(['skip','retry','abort']).optional()`（值域枚举；复杂解析面沿 MCP superRefine 先例 config.ts:69-74） | 全局缺省终态策略（§2） |
| `ON_ERROR_RETRIES` | 整数 0–5 | 0 | `z.coerce.number().int().min(0).max(5)`（PTY_MAX_SESSIONS 同款 config.ts:82） | 重试次数上限（仅 retry 消费；0 = 退化 skip） |
| `ON_ERROR_RETRY_DELAY_MS` | 整数 0–60000 | 1000 | `z.coerce.number().int().min(0).max(60000)`（PTY_IDLE_TIMEOUT_MS 同款 config.ts:80） | 退避基值（×2^(n-1)，单次封顶 30000ms 草案值） |

- 装载面：config.ts 白名单数组（:29-35）三行 + EnvSchema（:52-83）三字段 +
  输出映射（:125-131 形态）三键（`onError: env.ON_ERROR ?? 'skip'` 等）；fail-fast
  通道复用（:85-88）。无交叉校验需求（单变量值域自洽；PTY 式双变量交叉
  config.ts:118-124 先例不适用）。
- **未配置兜底（零强制漂移，写死）**：三 env 全未配置 = 引擎行为与现状逐位一致
  （默认 `skip` + 0 重试 ≡ §1.2 白描的隐式现状；实现上未配置即不进入重试/中止
  新路径）。
- **零 env 备选案（显式论证，否决）**：以 run 级缺省策略**常量**承载（无 env）——
  否决理由：① 行为变更无配置主权（默认策略写死即对全部既有工作流强制生效，
  违背「未配置 = 现状」兜底）；② 与 BK-0048 节点覆盖组合缺「全局默认」层——
  节点参数只能覆盖一个不存在的全局值，跨工作流运维开关失位；③ BACKLOG BK-0020
  行内既定「引擎级 env 承载」（BACKLOG.md:117）。常量形态不废弃：它正是 env 未
  配置时的内建缺省实现形态（env 化演进缝已内含）。

## 4. 引擎失败路径改造定界（REQ-0061-04）

### 4.1 catch 分支扩展点

engine.ts:102-112 catch 块内：中止判定（:105-108）**位置与语义不动**（中止优先
级最高，重试/策略不截获中止）；其后插入策略分派点（读 P(n) 无关——策略自
config 全局缺省 + 未来节点参数解析，§5 优先序）；skip 终态 = 既有 :103-111 序列
named 化（代码路径不搬移，零行为差）。

### 4.2 重试宿主与 abort 响应（写死）

- 宿主 = runNode `try` 内、**仅包裹 handler 调用**（:101）的循环——重试即重调
  `HANDLERS[n.type](ctx, args)`（args 重建，入参快照 :94-95 不变）；**不重跑**
  bypass / node:start（:87-93 一次性语义保留；重试过程以 `log` 事件通报，
  events.ts:24 既有 `log` 契约 lvl:'warn'，零新事件类型）。
- abort 响应（写死）：退避等待必须是 **abortable sleep**（`ac.signal` 竞速，
  signal 触发即弃眠）+ 每次尝试前复查 `ac.signal.aborted`——任一命中立即转入
  既有中止分支（:105-108），**stop 端点（server.ts:192-198）与优雅停机
  （server.ts:316-318）在重试等待期内即时中断，不等待退避到期**；停机宽限 5s
  （server.ts:319-327）不因重试被拖穿。

### 4.3 node:error 事件序列 · 仅终态一次（二选一定案）

**定案 = 仅终态一次**。论证：前端 node:error = 节点终态失败态（app.js:2506-2513
置 `st-error` + barDone；termview :2109-2116 追加错误行）——每次尝试 emit 将令
节点在 st-error/st-running 间抖动、错误行与日志重复 N 次、termview 错误块累积；
终态一次 + 过程走 `log` 事件（§4.2）兼顾可观测与语义纯度。`node:error` 的
`message` 承载末次错误 + 尝试次数概要（如「…（已重试 2 次）」——字段复用，
零新字段）。

### 4.4 run:done ok 语义 · 分策略二态（评估定案）

- **未配置 / skip / retry：ok 语义零变化**（`ok = !stopped`，engine.ts:152 原样）
  ——events.ts:32 注释、server-sync.js:295-297、store.ts:302 消费面全部无感。
- **abort 策略（显式配置才生效）：`ok = !stopped && !onErrorAborted`**——ok 从
  「未被中止」扩展为「未被中止且未因节点失败中止」；既有消费链路自然承接：
  status='error'（store.ts:302 既有）→ 卡「· 失败」（server-sync.js:317 既有）、
  日志定级 warn（:295-297 既有）。**SSE 契约零新增硬护栏**：无新事件、无新字段
  （ok/stopped 均既有 boolean）；events.ts:32 注释随实施轮刷新措辞（注释属文档
  同步面，非契约字段变更）；**实施轮若发现确需新增事件 / 字段，立即中止转
  needs-approval**（不得以契约改动迁就实现）。
- 配套（引擎返回值，apps/server 内部面）：executeWorkflow 返回类型（engine.ts:34/
  :153）增 ok 字段，server.ts:175 `outcome.ok = !r.stopped` 改为消费引擎返回值
  （否则 abort 收尾的服务端 outcome 日志与 SSE run:done 自相矛盾）——types.ts/
  server.ts 各一处小改，自主区。

### 4.5 影响文件清单与预算（实施轮口径）

| 文件 | 现状行数（wc 亲核） | 改造点 |
| --- | --- | --- |
| apps/server/src/engine.ts | 154 | §4.1 catch 分派 + §4.2 重试循环 + §2.3 标志位 + 返回值 |
| apps/server/src/config.ts | 149 | §3 白名单 + schema + 输出映射 |
| apps/server/src/types.ts | （RunCtx 所在） | 返回类型 + 策略配置透传 |
| apps/server/src/server.ts | 335 | :175 一行（outcome.ok 消费返回值） |
| tests/smoke（断言扩充） | — | 三策略正负例 + 耗尽降级 + fail-fast + 未配置零漂移 |

全部 ≤400 行/文件上限内（AGENTS.md 硬性约定 4）；零前端文件、零 shared 文件。

## 5. 与 BK-0048 的边界切割（REQ-0061-05）

**策略解析优先序（写死）**：`节点参数（若设）> env 全局默认（若设）> 内建缺省
（skip + 0 重试 + 1000ms）`——节点粒度意图最具体故最高；env 为跨工作流运维
缺省；内建缺省恒兜底且 ≡ 现状行为。

| 方案 | 判定 | 理由 |
| --- | --- | --- |
| 参数 > env > 内建（推荐） | **采纳** | 配置分层常规序；BK-0048 的价值主张即节点级覆盖；env 缺省仍可全局铺底 |
| env > 参数（否决） | 否决 | 节点级意图被全局值遮蔽，BK-0048 形同虚设；运维改 env 即静默改写已编排工作流行为 |
| 仅 env 无参数（否决） | 否决 | 等于砍掉 issue#6 链末子项 BK-0048，链路断裂 |
| 仅参数无 env（否决） | 否决 | BK-0020 立项语即「引擎级 env 承载」（BACKLOG.md:117）；跨工作流缺省失位 |

**BK-0048 参数面零预写（写死）**：节点参数名 / 取值枚举形态 / 属性面板行形态 /
NDP 目录定义扩展一概不在本 ADR 射程（NDP 前置 BK-0021 已 done，扩展按
src/nodes/<type>/node.ts 目录定义——BACKLOG.md:69 行内已载）——归 BK-0048
修宪轮 SPEC（issue#6 批复承继）。本 ADR 只锁优先序，为参数覆盖预留缝而不预写
任何 DEFS 终稿。

## 6. BK-0020 定界回写索引（权威字面量）

以下代码块 = BACKLOG BK-0020 行**备注列的权威回写字面量**（BUILD 已逐字粘贴
回写，其余列含状态 proposed 逐字不动；回写随归档提交入库；VERIFY 以本节为
VERBATIM 比对基准——BK-0027 VERBATIM-OK 标准）。晋升条件：BK-0061 CLOSE 且
附录 A needs-approval 获批（新增 env 语义三项在请批清单）；获批后由 PLAN 轮
晋升 ready。BK-0048 边界切割正文见 §5（参数面零预写，优先序已锁）。

```text
触UI=否——后端能力项（BK-9006→BK-0048 边界切割写死：节点粒度 on-error 参数=NDP 新参数（DEFS 扩展）+ 属性面板 UI 触 UI 归 BK-0048 修宪轮消费 issue#6 批复承继，实施顺序约束=BK-0020 引擎语义先行；本实现轮 packages/shared 零改动、SSE 事件契约零新增（node:error/run:done/log 既有三事件承载，零新事件类型零新字段，确需新增即中止转 needs-approval）；策略优先序写死=节点参数（若设）> env 全局默认（若设）> 内建缺省（skip+0 重试+1000ms，未配置=现状行为逐位不变）——ADR-0022 §5 即权威，BK-0048 参数面（参数名/面板形态）ADR-0022 零预写归其修宪轮 SPEC）：受影响文件=apps/server/src/engine.ts 失败路径改造（catch 分支扩展点 :102-112 中止判定不动其后插入策略分派；重试宿主=runNode try 内仅包 handler 调用的循环 + abortable sleep 竞速 ac.signal——stop/优雅停机在重试等待期内即时中断（server.ts:192-198/:316-318 级联复用）；skip=现状失活形态 named 化（engine.ts:102-112 既有序列零搬移）；abort=run 级 fail-fast 独立标志位（不复用 ac.abort 污染 stopped 语义），ADR-0022 §2/§4.1-4.2）+ apps/server/src/config.ts 三 env 白名单（ON_ERROR ∈ skip/retry/abort 默认 skip；ON_ERROR_RETRIES 整数 0-5 默认 0；ON_ERROR_RETRY_DELAY_MS 整数 0-60000 默认 1000 指数退避单次封顶 30000ms——zod 形态沿 PTY 先例 config.ts:80-82，ADR-0022 §3 表）+ apps/server/src/types.ts 引擎返回值增 ok 字段 + apps/server/src/server.ts:175 一行（outcome.ok 改消费引擎返回值）+ run:done ok 语义扩展仅 abort 策略生效（ok=未被中止且未因节点失败中止；默认路径零变化；events.ts:32 注释随实施轮刷新=文档同步面、另刷其内已漂移坐标 server-sync.js:105-107→实锚 :295-297；store.ts:302 status='error' 与 server-sync.js:317 卡片链路既有零改动自然承接——ADR-0022 §2.3/§4.4）+ smoke 扩断言（三策略正负例 + 重试耗尽降级 + abort fail-fast + 未配置零漂移）；node:error 仅终态一次（每次尝试经既有 log 事件 lvl warn 通报；message 承载末次错误+尝试次数概要，字段复用——app.js:2506-2513 st-error 终态语义不变，ADR-0022 §4.3）；LLM/agent 流式节点重试 delta 叠加风险如实声明（llm.ts:89/:101/:103、agent.ts:98——残余风险知悉项，附录 A 知悉面）；零 shared 契约字段变更、零前端文件、零新依赖、零出站、零 golden；验收命令口径=npm run build + npm run gate（纯回归面）+ npm test + npm run smoke:server 扩断言 + 手动 E2E（失败节点三策略降级点位）；依赖关系=前置 BK-0061（SPEC 先行轮，ADR-0022）；实施序=BK-0061 CLOSE 后单迭代承载；晋升条件=BK-0061 CLOSE 且附录 A needs-approval 获批（新增 env 语义三项=POLICY 需批准区，沿 BK-0027→#10 先例）；**2026-10-26 W44 治理日拆分**：SPEC 先行项 BK-0061 已立，迭代 0066 产出 ADR-0022 草案（本行定界自其 §6 权威字面量回写）
```

## 7. 附录 A · needs-approval issue 草案（字面量，脚本逐字取用）

**标题**：

```
[needs-approval] BK-0020 引擎 on-error 策略实施：请批新增 env 语义 ×3 + run:done ok 语义扩展知悉（ADR-0022）
```

**正文**：

```
按 POLICY.md 需批准区「新增环境变量语义」，引擎 on-error 策略（重试/跳过/中止）
实施（BK-0020）需先经您批复以下承载。定界方案全文见 ADR-0022 草案
（docs/adr/0022-engine-onerror-policy-env.md，迭代 0066 / BK-0061 SPEC 先行产出）。
获批前零实现。

请批清单：

① 新增环境变量语义三项（config.ts zod fail-fast 白名单）：
   - ON_ERROR：全局缺省终态策略，枚举 skip/retry/abort，默认 skip（= 现状行为
     逐位不变：失败节点下游失活、run 照常收尾）；
   - ON_ERROR_RETRIES：重试次数上限，整数 0-5，默认 0（仅 retry 策略消费）；
   - ON_ERROR_RETRY_DELAY_MS：退避基值，整数 0-60000，默认 1000（指数退避
     ×2^(n-1)，单次封顶 30000ms 草案值）。
   三 env 全未配置 = 引擎行为与现状逐位一致（零强制漂移）。

② run:done ok 语义扩展知悉（仅显式配置 ON_ERROR=abort 时生效）：ok 从「未被
   中止」扩展为「未被中止且未因节点失败中止」——持久层 status='error' 与前端
   「· 失败」卡片为既有链路自然承接，SSE 事件契约零新增（无新事件无新字段）；
   events.ts:32 注释随实施轮刷新（文档同步面）。

③ 残余风险知悉（如实声明）：LLM/agent 流式节点重试时，失败尝试已发出的
   node:delta 与重试流存在前端叠加观感（缓解=log 事件通报尝试次数使叠加可
   解释；不以新增清零事件解决——SSE 零新增硬护栏）。

④ 实施顺序：BK-0020（引擎实现块，本 issue 批准即解除其晋升的 env 门槛，前置
   BK-0061 CLOSE）→ BK-0048（节点级 on-error 参数 UI 修宪轮，issue#6 链末子项，
   待 BK-0020 CLOSE；策略优先序已锁 ADR-0022 §5：节点参数 > env 全局默认 >
   内建缺省）。

⑤ 证据链接：ADR-0022 草案（docs/adr/0022-engine-onerror-policy-env.md）· PRD
   （docs/evolution/iterations/0066/PRD.md）· 代码现状（engine.ts:102-112 失败
   catch / :152 run:done ok / server.ts:316-318 停机级联 / store.ts:302 status
   派生 / config.ts:29-35 env 白名单）· BACKLOG 定界（BK-0020 行，迭代 0066
   回写）。

您在本 issue 评论「批准」即视为同时授权 ① env 承载并知悉 ②③（BK-0020 转 ready
门槛解除）；评论「驳回」则 BK-0020 维持 proposed，ADR-0022 归档为未采纳方案。
```

## 8. 不做范围与验证口径（REQ-0061-07）

- **不做范围（本 ADR 轮）**：不实现 on-error 本体（归 BK-0020）；不改
  engine.ts / config.ts / events.ts / handlers.ts / server.ts / types.ts 任何代码；
  不触 BK-0048 UI 面（参数面零预写，§5）；零 shared 契约、零新依赖、零出站、
  零 golden、全程禁 gate:update；不修正 events.ts:32 注释漂移坐标（只记录，
  随 BK-0020 实施轮）；不改 BK-0063 ADR-0017 撞号现状（归治理日 doc 批处理）；
  retry×abort 组合枚举、案 b 默认出边放行均为否决/演进缝，不在实施射程。
- **验证口径（机器证明）**：`git diff HEAD -- apps packages tools tests .github
  package*.json` 恒空（零产品代码）；产品提交 `git show --numstat` 恰 1 路径
  （本 ADR）；锚点抽样 ≥5 组全命中（§1.2 清单：engine.ts:102-112 / :152 /
  events.ts:32 / server-sync.js:295-297 / config.ts:29-35 等，均本 BUILD 会话
  亲核）；`npm run build` + `npm run gate`（纯回归 21 场景）+ `npm test` +
  `npm run smoke:server` 全绿归脚本统一执行。
