# PRD · 迭代 0069 · BK-0020 引擎级错误处理策略：on-error（重试 / 跳过 / 中止）引擎实现

> 产出角色：product-manager（PLAN 阶段）· 2026-10-31 00:58 · 工作树 feat/0069-iter
> 来源：BACKLOG **BK-0020**（capability / **触UI=否** / P2 / **S** / proposed→本轮转
> ready，BACKLOG.md:118），批复链 **issue#15**（ADR-0022 附录 A：env 语义 ×3 +
> run:done ok 语义扩展知悉 + 流式 delta 叠加残余风险知悉）。
> **S 项且非 doc、非触 UI——SPEC 豁免适用（WORKFLOW §4「S 项（非 doc、非触 UI）
> 可免独立 SPEC」），skipSpec=true**：受影响文件清单与验收口径内嵌本 PRD §8/§9，
> 实施定界以 **ADR-0022（迭代 0066 / BK-0061 SPEC 先行产出）为权威蓝图**。
> 回执口径：**sourceIssue=15**；**itemContinues=false**——issue#15 系单目的批复
> issue（正文仅 BK-0020 实施批准一事，无姊妹子项；BK-0048 名下在 issue#6，
> 0052 issue#13 单目的先例）。
> **reconstitutional=false（非修宪轮）**：触UI=否纯后端承载，批复射程=解除 POLICY
> 需批准面（env×3 + 两项知悉），**不构成重录轮**——golden 零接触、全程禁
> gate:update（宪法第 3 条）。

## 0. 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-31 00:42~00:58 核实）

- **并行占用核查（只读）**：派发档案明示 BK-0018 已被其他并行工作流占位**严禁选择**；
  `.zcode/locks/items/` 本会话 `ls` 亲核恰 `BK-0018` 一个条目（exit=0）——两候选
  BK-0014/BK-0020 均无在途占用。BK-0018 行（BACKLOG.md:116，ready）本轮零触碰
  （其重试轮归占位方，feat/0068-iter d5ddb27 成果载体在案，metrics.md:65 行）。
- **① 批复同步**：档案「approved：#16,#15；rejected：无」。**gh 亲核复核**（本轮
  实跑 `gh issue view 15/16`，首轮 GraphQL EOF 一次、重试成功）：
  - issue#15 OPEN，标题「[needs-approval] BK-0020 引擎 on-error 策略实施：请批
    新增 env 语义 ×3 + run:done ok 语义扩展知悉（ADR-0022）」，用户 liusuren123
    （本仓库 git user 本人）2026-10-30T14:40:53Z 评论「批准」，🤖 回执在案；
  - issue#16 OPEN，标题「[needs-approval] BK-0014 扩展发现器实施：请批新增 env
    语义 ×2（扫描源开关 + 激活白名单）+ stdio 子进程残余风险知悉（ADR-0023）」，
    用户 2026-10-30T14:40:18Z 评论「批准」。
  - **规则①处置（两行均既有行、来源=T5 非 issue#N——按 0052 BK-0058「既有行
    不重复建行仅解除转 ready 门槛」先例，不建重复行）**：
    - **BK-0020（BACKLOG.md:118）proposed→ready**：转 ready 双门槛齐备 = 前置
      BK-0061 CLOSE（迭代 0066 终态 done，ADR-0022 草案就位、§6 权威字面量已
      回写本行）+ 附录 A needs-approval 获批（issue#15，上述 gh 亲核）；
    - **BK-0014（BACKLOG.md:112）proposed→ready**：双门槛齐备 = 前置 BK-0062
      CLOSE（迭代 0067 终态 done，ADR-0023 §7 回写在案）+ issue#16 获批。
      本轮不选，列 ready 队列次位、下轮心跳候选首选（ tie-break 见下）。
- **② user-request**：档案 issue 面板五项（#17/#16/#15/#12/#6）均 needs-approval，
  无 user-request 条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 零 skipped 改写。
- **④ 常规选题**：ready 队列选题时点 `grep -n "| ready |" BACKLOG.md` 亲核仅
  BK-0018（L116，被占禁选）→ 规则①批复项晋升后，本轮候选 = **BK-0020（S）vs
  BK-0014（M）** 两项（同属 issue 批复 ready，同 P2）。**入选 BK-0020，tie-break
  三重依据**：
  1. **S 优先于 M**（WORKFLOW §4「优先 S/M」；0056 PLAN「同 P0 下 S 优先于 M」、
     0066 PLAN「同优先级下 M 大于 S 不选」同径先例）；
  2. **ROADMAP 待办节链序**（ROADMAP.md:214-215）：BK-0048（BK-9006 链末子项）
     待「BK-0020 实现块 = BK-0061 CLOSE + env 批复」——两半条件本轮全部兑现，
     BK-0020 即 **BK-9006 链收官 + issue#6 关单路径的当前解阻项**；BK-0014 无
     下游依赖项，解阻价值单一；
  3. **T5-M2 实施序延续 SPEC 三连序**：BK-0060(BK-0019)→0064 done→BK-0047 0065
     done；按 BK-0061(BK-0020)→BK-0062(BK-0014) 消化序，本项即序列下一位。
- **侦察档案消费（均不构成候选，无补题必要——批复项已就位）**：残缺标记 grep
  唯二命中——apps/server/package-lock.json:787 系 integrity 串内 XXX 假阳性；
  apps/server/src/tools.ts:138「not implemented」系 browser stub 工厂显式如实降级
  （ADR-0011 评估终态），0041/0045/0046/0047/0050/0051/0059/0064 连续同判不立项。
  悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系治理日产物，心跳不重复采集。
- **近 3 迭代亲读**：iterations/0065（BK-0047 修宪轮 done）/ 0066（BK-0061 纯
  文档轮 done，ADR-0022）/ 0067（BK-0062 纯文档轮 done，ADR-0023）目录与 PRD/
  REPORT 亲读；0068 无迭代目录（失败留档分支 feat/0068-iter，metrics.md:65 行
  + 主干提交 cd44b21 记账在案）。

## 1. 结论

**建议做（本轮入选，S 级后端实现轮，自主区 + 已获批需批准面）**——理由一句话：
BK-0020 是 issue#15 批复在案的 ready 项、T5-M2 四验收「节点失败可按策略降级」
（ROADMAP.md:164）的实现块，且为 BK-0048（issue#6 修宪链末子项）与 BK-9006 收官
的唯一当前解阻项；ADR-0022 蓝图已定稿到契约级，S 级单迭代可承载。

## 2. 现状与证据（本会话逐项亲核，零杜撰；ADR-0022 §1.2 为全量白描）

- `apps/server/src/engine.ts:102-112` catch 块（本轮 sed 亲读）：非中止错误依次
  `scope.executed.add(id)` → `prog.done++` → `emit('node:error', …)` →
  `ctx.log.warn(…, '节点执行失败')` → **`return`（:111）**——失败节点出边不激活、
  下游子图静默失活，同级独立分支继续；中止（`isAbort(e) || ac.signal.aborted`，
  :105-108）emit「已中止」后 throw 沿既有级联。
- `engine.ts:152`：`emit('run:done', { …, ok: !stopped, stopped, … })`——节点失败
  不影响 run 终态 ok；`engine.ts:153` / `:34`：`executeWorkflow` 返回值
  `{ ms, done, outputs, stopped }` **无 ok 字段**（abort 策略需返回值扩展，§8）。
- `apps/server/src/config.ts:29-35` env 白名单数组（PTY 四项 :33-34 在列，本轮
  sed 亲读）+ `:79-83` PTY zod 形态先例（`z.coerce.number().int().min/max` 同款）。
- `apps/server/src/server.ts:174-177`：`outcome = { ms: r.ms, ok: !r.stopped,
  stopped: r.stopped }`（本轮 sed 亲读——**实锚 :176**，ADR-0022 §4.4 写 :175
  系 ±1 行漂移，实施按代码事实转写）。
- `packages/shared/src/events.ts:32` 注释「ok = 本次运行未被中止（≠全部节点成功）；
  消费端 server-sync.js:105-107 …」（本轮 sed 亲读）；**注释内坐标已漂移**——ok
  定级消费实锚 `apps/web/src/server-sync.js:295-297`（本轮 sed 亲读：
  `lvl: (ev.ok !== false && !ev.stopped) ? 'ok' : 'warn'`）；坐标修正随实施轮
  （文档同步面，ADR-0022 §1.2 消费面 1 明载）。
- `apps/server/src/store.ts:302`：`const status = ev.stopped ? 'stopped' :
  (ev.ok ? 'done' : 'error')`——run 级 'error' 派生链路已存在，仅待 ok:false 到达。
- `apps/server/src/types.ts:48` RunCtx（本轮 grep 亲核）；`events.ts:24` 既有
  `log` 事件 `lvl:'warn'` 契约（本轮 grep 亲核）——重试过程通报零新事件。
- `apps/server/.env.example` 25 行（本轮 cat 亲读），PTY 段 :21-24——新 env 同轮
  补模板行沿 0005/0055 先例（BK-0059 即 0024 漏补模板的漂移教训）。
- tests/ 全域 `grep -rn "ON_ERROR"` 零命中（本轮亲跑）——零存量污染。

## 3. 用户故事与价值

- **US-1（编排者/维护者）**：作为 AgentFlow 使用者，我希望工作流中节点失败时按
  可配置策略（重试/跳过/中止）降级——瞬时故障可自愈（retry）、失败可观测可降级
  （skip named 化）、关键失败快速终止（abort 且 run 如实报失败），而不是现状的
  「下游静默失活 + run 仍报 ok」。
- **US-2（循环自身）**：作为进化循环，我希望 BK-0020 本轮落地，使 BK-0048
  （节点级 on-error 参数 UI 修宪轮，issue#6 链末子项）与 BK-9006 链收官、issue#6
  关单路径就此解阻（ROADMAP.md:214-215）。

## 4. 功能范围（实施定界以 ADR-0022 为权威；本节为 PRD 级索引）

- **REQ-0069-01 三策略引擎实现**（ADR-0022 §2/§4.1-4.3）：
  - **skip（默认，= 现状 named 化）**：案 a 下游失活形态逐位保留（executed +
    node:error 终态一次 + 不激活出边 + 同级独立分支继续）；catch 分支扩展点置于
    中止判定之后，既有 :103-111 序列零搬移零行为差。
  - **retry**：重试宿主 = runNode try 内仅包裹 handler 调用（engine.ts:101）的
    循环，args 重建、入参快照不变；不重跑 bypass/node:start（一次性语义保留）；
    指数退避 `ON_ERROR_RETRY_DELAY_MS × 2^(n-1)` 单次封顶 30000ms；任一次成功即
    按成功路径收尾（结果/tokens/ms 以末次成功尝试为准）；耗尽 → skip 终态。
  - **abort**：run 级 fail-fast **独立标志位**（如 onErrorAborted），主循环同位置
    一并检查；**不调用 ac.abort**（stopped 语义保持「用户/停机中止」独占）；
    失败后停止调度全部后续节点，run:done 收尾 ok:false / stopped:false。
  - **abortable sleep 硬护栏**：退避等待以 ac.signal 竞速 + 每次尝试前复查
    aborted——stop 端点（server.ts:192-198）与优雅停机（server.ts:316-318）在
    重试等待期内即时中断，停机宽限 5s 不被拖穿。
- **REQ-0069-02 env 三项装载**（ADR-0022 §3，issue#15 ① 授权）：config.ts 白名单
  三行 + EnvSchema 三字段 + 输出映射三键——`ON_ERROR`（枚举 skip/retry/abort，
  默认 skip）/ `ON_ERROR_RETRIES`（整数 0-5，默认 0）/ `ON_ERROR_RETRY_DELAY_MS`
  （整数 0-60000，默认 1000）；zod 形态沿 PTY 先例（config.ts:79-83）；fail-fast
  通道复用；**三 env 全未配置 = 引擎行为与现状逐位一致（零强制漂移，写死）**。
- **REQ-0069-03 事件序列**（ADR-0022 §4.3）：`node:error` **仅终态一次**；重试过程
  以既有 `log` 事件 lvl:'warn' 通报「第 n 次尝试」；终态 message 承载末次错误 +
  尝试次数概要（字段复用零新字段；app.js:2506-2513 st-error 终态语义不变）。
- **REQ-0069-04 run:done ok 语义扩展**（ADR-0022 §4.4，issue#15 ② 知悉在案）：
  仅 abort 策略生效 `ok = !stopped && !onErrorAborted`；未配置/skip/retry 路径
  ok 语义零变化；引擎返回值增 ok 字段（engine.ts:34/:153 + types.ts 透传）+
  server.ts:176 改消费返回值（服务端 outcome 与 SSE 不再自相矛盾）；**SSE 契约
  零新增硬护栏**——无新事件无新字段（ok/stopped 均既有 boolean），实施中确需
  新增即**立即中止转 needs-approval**（不得以契约改动迁就实现）；events.ts:32
  注释随实施轮刷新（含漂移坐标 server-sync.js:105-107→实锚 :295-297 修正，
  文档同步面非契约变更）。
- **REQ-0069-05 策略解析优先序**（ADR-0022 §5 写死）：本实现轮承载「env 全局默认
  > 内建缺省」两层（节点参数层尚不存在）；**BK-0048 参数面（参数名/取值枚举/
  面板形态/NDP 扩展）零预写**——归其修宪轮 SPEC（issue#6 批复承继）。
- **REQ-0069-06 ADR-0022 状态行更新**：实施轮 CLOSE 按 ADR-0010/0012 先例更新
  头部状态行（草案→实施轮消费记录 + issue#15 授权链标注），机制件随归档。
- **REQ-0069-07 smoke 扩断言**：三策略正负例 + 重试耗尽降级 + abort fail-fast
  （含同级独立分支不再调度）+ 未配置零漂移 + 重试等待期 stop 即时中断 + env
  fail-fast 非法值形态；断言组 ID 避让既有组（0057 撞号教训，新增组用未占用
  前缀）。
- **REQ-0069-08 .env.example 模板行**：可选段按 PTY 段版式补三行模板注释
  （全部 `#` 前缀零生效配置、值域注 + ADR-0022/BK-0020 溯源指针），沿 0005/0055
  先例（BK-0059 漂移教训）。

### 不做范围（out of scope）

- 不触 BK-0048 UI 面（参数/DEFS/属性面板零预写零实现）；
- SSE 契约零新增（零新事件零新字段）；零前端文件改动（apps/web/** 零 diff）；
  packages/shared 仅 events.ts 注释行（零契约字段变更）；
- 零新 npm 依赖、零新增出站类别、零 golden 接触、全程禁 gate:update；
- retry×abort 组合枚举、案 b 默认出边放行——否决/演进缝不在射程（ADR-0022 §2.1/§2.2）；
- 不改 handlers.ts / store.ts / server-sync.js / app.js（消费面既有链路自然承接，
  ADR-0022 §2.3/§4.4）。

## 5. 非功能要求

- 全部新增/改动源文件 ≤400 行（AGENTS.md 硬性约定 4；engine.ts 现 154 /
  config.ts 149 / types.ts 81 / server.ts 335，本轮 wc 亲核——均余量充足）。
- **未配置零漂移**为硬护栏：不设三 env 时全量 smoke 既有断言零回退。
- 修宪面零命中：零 UI / 零 DEFS / 零依赖 / 零出站——POLICY 需批准射程仅 env 语义
  一项且已由 issue#15 批复解除，批复之外零扩大。

## 6. 触UI 分类结论（必答）

**触UI=否——自主区（纯后端承载轮），非修宪轮，reconstitutional=false。**

- 改动面全在 apps/server/src/** + tests/smoke + apps/server/.env.example +
  packages/shared 注释行；apps/web（视觉/DOM/CSS 三层）、节点 DEFS、
  golden 基线、tools/pixel-gate、CI 配置零接触。
- 前端消费面（server-sync.js:295-297 日志定级 / app.js:2506-2513 st-error 终态 /
  store.ts:302 status='error' / server-sync.js:317 runCardMeta「· 失败」）全部为
  **既有链路自然承接，零改动**（ADR-0022 §1.2 消费面四层亲核）。
- gate 为纯回归面（21 场景 diffPx=0 预期）；**全程禁 gate:update**（宪法第 3 条；
  POLICY 禁止区——本轮非修宪轮，issue#15 批复不构成重录授权）。

## 7. 依赖与后续

- **前置（均已兑现）**：BK-0061 CLOSE（迭代 0066 done，ADR-0022 蓝图就位）+
  附录 A issue#15 获批（2026-10-30T14:40:53Z，gh 亲核）——晋升 ready 双门槛齐备。
- **后续解阻**：BK-0048（BACKLOG.md:69，issue#6 修宪链末子项）前置 =「BK-0020
  引擎语义先行」+ issue#6 批复承继——本项 CLOSE 后其引擎侧前置全清，BK-9006 链
  收官与 issue#6 关单路径就此打通（ROADMAP.md:214-215）。
- **并行路知会**：他路在途 BK-0018 重试轮（memory 工具组，config.ts/server.ts/
  llm.ts 有交集）——两轮对 config.ts/server.ts 均为插入型改动，预期「双方各自
  新增」型冲突按合并契约分类解决（0034 先例）；本项不因并行而改道。

## 8. 受影响文件清单（skipSpec 内嵌，S 项免独立 SPEC）

| 文件 | 动作 | 要点（ADR-0022 权威节） |
| --- | --- | --- |
| `apps/server/src/engine.ts`（154 行） | 改造 | catch 策略分派（§4.1）/ 重试循环 + abortable sleep（§4.2）/ onErrorAborted 标志位（§2.3）/ 返回值增 ok（§4.4） |
| `apps/server/src/config.ts`（149 行） | 改造 | +3 env 白名单 + EnvSchema + 输出映射（§3 表） |
| `apps/server/src/types.ts`（81 行） | 改造 | 返回类型 ok 字段 + 策略配置透传（如实施需要；§4.5） |
| `apps/server/src/server.ts`（335 行） | 一行 | :176 outcome.ok 改消费引擎返回值（§4.4；ADR 写 :175 系 ±1 漂移按代码事实） |
| `packages/shared/src/events.ts` | 注释 | :32 注释刷新 + 漂移坐标修正（文档同步面，零契约字段变更；§4.4） |
| `apps/server/.env.example`（25 行） | 模板 | 可选段 +3 行 `#` 模板注释（REQ-0069-08，0005/0055 先例） |
| `tests/smoke/*` | 扩断言 | REQ-0069-07 断言组（新组 ID 避让既有组） |
| `docs/adr/0022-engine-onerror-policy-env.md` | 机制件 | 状态行更新（REQ-0069-06，随归档） |
| `docs/evolution/iterations/0069/{PRD,JOURNAL,REPORT}.md` + BACKLOG 回写 | 机制件 | 随归档 |

白名单外（apps/web/**、packages/shared 契约字段、tools/pixel-gate、tests/golden、
.github、package*.json）**零改动**——AC 以 `git diff` 恒空为机器证明。

## 9. 验收标准（Given / When / Then）

- **AC1 未配置零漂移（硬护栏）**：Given 不设置 ON_ERROR/ON_ERROR_RETRIES/
  ON_ERROR_RETRY_DELAY_MS；When 跑全量 `npm run smoke:server` + 一个含失败节点的
  手动 E2E；Then 既有断言零回退（168/0 基线），失败节点行为与现状逐位一致
  （下游失活、node:error 终态一次、run:done ok 不反映失败）。
- **AC2 skip 显式等价**：Given `ON_ERROR=skip`；When 复跑 AC1 场景；Then 与未
  配置逐位一致（named 化零行为差，ADR-0022 §2.1 案 a）。
- **AC3 retry 正例**：Given `ON_ERROR=retry`、`ON_ERROR_RETRIES=2`、小退避基值
  + mock 必失败 handler；When 运行；Then 恰 3 次尝试、过程 `log` warn 通报恰 2
  次、`node:error` 终态恰 1 次且 message 含尝试概要、耗尽后按 skip 终态下游失活、
  run:done ok 语义不变；Given 第 3 次成功的 mock；Then 按成功路径收尾且结果以
  末次成功尝试为准。
- **AC4 retry 可中止**：Given retry 退避等待期内；When 调 stop 端点（或触发优雅
  停机）；Then run 即时中断（不等退避到期），stopped 语义不被污染，无孤儿定时器。
- **AC5 abort fail-fast**：Given `ON_ERROR=abort` + 含失败节点与同级独立分支的
  工作流；When 运行；Then 失败后全部后续节点（含同级分支）不再调度、run:done
  `ok:false, stopped:false`、持久层 status='error'（store.ts:302 既有链路）、
  前端卡「· 失败」既有承接；`stopped` 恒保持用户/停机中止独占语义。
- **AC6 env 装载与 fail-fast**：Given 非法值（如 `ON_ERROR=boom`、
  `ON_ERROR_RETRIES=9`、`ON_ERROR_RETRY_DELAY_MS=abc`）；When 启动 server；
  Then zod fail-fast 退出非 0 且报文指明变量名与约束（PTY 先例形态）；边界值
  0/5、0/60000 通过。
- **AC7 禁区机器证明**：Given 产品提交落盘；When `git diff HEAD -- apps/web
  tests/golden .github` 与 `git show --numstat <产品提交>`；Then apps/web/ 零
  diff、golden 零 diff、lock 零变化（零新依赖）、提交恰 §8 白名单路径；
  events.ts 仅注释行变更（`npm test` 30/30 含契约断言零改动通过）；**全程
  gate:update 消费次数 = 0**。
- **AC8 回归面全绿**：Given 工作树内改动完成；When `npm run build` +
  `npm run gate` + `npm test` + `npm run smoke:server`；Then 四项全绿（gate 21
  场景 diffPx=0 纯回归；s3-library 本机抖动按 issue#12 纪律处置——复跑判定、
  双留档、绝不 gate:update、golden 权威在 CI）。
- **AC9 SSE 契约零新增**：Given 实施；When 比对 RunEventSchema；Then 零新事件
  类型零新字段（ok/stopped 既有 boolean 复用）；若实施中发现确需新增——按
  ADR-0022 §4.4 硬护栏**立即中止转 needs-approval**，不得以契约改动迁就实现。
- **AC10 选题与 STATE 留痕**：Given 本 PRD；When 核对 STATE.md；Then
  phase=PLAN、item=BK-0020、updated 为本轮时间（CLOSE 侧按契约推进，本 PRD 不
  越权改写）。

## 10. 验收命令口径

`npm run build` + `npm run gate`（纯回归面）+ `npm test` + `npm run smoke:server`
全绿；机器证明：`git show --numstat <产品提交>`（恰 §8 白名单）+
`git diff HEAD -- apps/web tests/golden .github`（恒空）+ AC3~AC6 定向 E2E /
smoke 断言组实跑 + 指针抽样 ≥5 组（engine.ts:102-112/:152、config.ts:29-35/:79-83、
server.ts:174-177、events.ts:24/:32、store.ts:302——均本轮亲核坐标）。

## 11. 风险与如实声明

- **流式 delta 叠加残余风险（issue#15 ③ 知悉在案）**：LLM/agent 流式节点重试时，
  失败尝试已发出的 node:delta 与重试流存在前端叠加观感；缓解 = log 事件通报尝试
  次数使叠加可解释；不以新增清零事件解决（SSE 零新增硬护栏）。
- **run:done ok 语义扩展（issue#15 ② 知悉在案）**：仅 abort 策略生效；既有消费
  链路（status='error'/卡「· 失败」/warn 定级）自然承接，前端零改动。
- **并行合并风险**：与在途 BK-0018 轮在 config.ts/server.ts 交集为插入型改动，
  预期「双方各自新增」型冲突按合并契约分类解决（0034/0036 先例）。
- smoke 基线口径：主干现基线 168/0（metrics.md:62-65 亲读；0068 的 MEM 组在
  feat/0068-iter 未并入主干，不计入本轮基线）。
