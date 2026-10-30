# SPEC · 迭代 0070 · BK-0048 节点级 on-error 参数：NDP 新参数（重试/跳过/中止）+ 属性面板 UI（修宪轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-31 · 工作树 `feat/0070-iter`
> 输入：`docs/evolution/iterations/0070/PRD.md`（PLAN 阶段产物，skipSpec=false，
> reconstitutional=true，sourceIssue=6 / itemContinues=false）。
> 本 SPEC 全部行号引用经本工作树亲读核实（核实动作见各节标注）；golden 不变量数字、
> smoke 组前缀、npm scripts 均为本会话命令实跑值。
> 配套 ADR：**ADR-0025**（`docs/adr/0025-node-onerror-param-ui.md`，已获用户 issue#6
> 批复承继——2026-10-24T08:38:51Z，草案态随本 SPEC 落盘）。
> 直系先例：ADR-0022（引擎策略语义与优先序权威，迭代 0069 已实施）/ 迭代 0065
> BK-0047 修宪轮 SPEC 版式 / 0037·0038·0039·0065 四轮同链 golden 消费先例。

## 0. 结论速览（对 PRD §8 六待裁项的终裁）

| PRD §8 待裁项 | 终裁 | 一句话依据 |
| --- | --- | --- |
| ① 受影响节点集合 | **全 21 类统一扩展** | 引擎策略分派在 runNode catch（engine.ts:142-157），对所有 handler 的 throw 生效；收窄=编排不对称（PRD 推荐，采纳） |
| ② 参数面 | `onError` combo 四值（value≡label 中文）+ `onErrorRetries` number（0-5，默认 **2**）；次数由**节点独立参数**承载 | 陷阱破解：节点 retry 次数默认 2>0，env `ON_ERROR_RETRIES=0` 不再使之退化（方案对比表 §2.1-B） |
| ③ 面板形态 | **无条件双行（零 app.js 改动）**；visibleIf 条件显隐**否决** | 两条 change 路径均不刷新 visibleIf **源**参数（app.js:1806 只查被改参数自身的 `if`；:1152 面板路径不重渲染面板）——条件显隐会半残于两处（§1.4-3 证据） |
| ④ golden 变更集枚举 | **全 21 场景（s0~s20）恰枚举、恰一次 `gate:update` 重录；零新增场景** | 新参数行经 makeNodeEl（app.js:811，**无类型过滤**）进入**每个节点体** → 一切有可见节点的场景像素+DOM 不变量全变（§4.2 逐场景判据；s0 实测 8 节点/15 widgets → 预期 31） |
| ⑤ productFiles 白名单 | §3 清单（shared 21 node.ts + 4 契约测试 + baseline + 21 README + engine.ts + smoke + golden 42 文件） | 逐一亲读核实，含 PRD 未列的 **param-handler-guard / synthesis** 两个必改契约测试（§2.5） |
| ⑥ 未设零漂移机器证明 | 三层：**既有 182 smoke 断言全量零回退**（哨兵默认经 `paramDefaultsOf` 注入即隐式矩阵）+ **OEN01 显式哨兵断言** + **重录后 gate 全量 diffPx=0** | 哨兵默认 = DEFS 默认值 → `P(n)` 合并注入每节点 → 既有用例全部在哨兵路径下重放 |

**对 PRD 的两处如实修正（不改变射程，VERIFY 按本 SPEC 执行）**：

1. **参数计数基数**：PRD 写「42→42+N」，实际在库基数为 **44**（0057 terminal +2 后
   终态；`defs-drift.test.mjs:41/:144` 与 `param-handler-guard.test.mjs:144` 三处
   `44` 字面量亲读）→ 本轮 **44→44+42=86**（21 类 × 2 参数）。
2. **golden 波及面**：PRD 预期「属性面板可见面——含 s13/s14/s20 等」；亲读证据表明
   参数行同时进入**画布节点体**（app.js:811 无类型过滤，s0 golden 不变量实测
   `widgets:15 / 8 节点`）→ 波及面 = **全部 21 场景，非波及集合为空集**。PRD AC1 的
   「非波及 gate 场景 diffPx=0」子句在终裁下以「重录后全量场景 diffPx=0 + 变更集恰
   枚举（§4.3）」承载；波及面宽度仍在 issue#6 批复射程内（BK-9006「既有节点 UI 参数
   扩展杂项」之「on-error 参数」条目，BACKLOG.md:98 亲读），不构成超授权扩录，但
   BUILD/VERIFY 必须按 §4.3 的「不多不少」执法流程留痕。

## 1. 现状与证据链（本会话工作树内逐项亲读/实跑）

### 1.1 引擎策略机制（BK-0020 落地形态，节点级解析的接入点）

- `apps/server/src/engine.ts:43` `P(n) = { ...paramDefaultsOf(n.type), ...(n.params||{}) }`
  ——DEFS 默认值与工作流存量参数在此合并；**老工作流（无 onError 键）自动获得哨兵默认**
  → 零迁移。
- `engine.ts:76-82`：run 级一次读取 `config.onError` / `onErrorRetries`（仅 retry 消费）
  / `onErrorRetryDelayMs` + `onErrorAborted` 独立标志位。**节点级解析须下沉 runNode
  逐调用**（ADR-0022 §2.4 循环子节点同权）。
- `engine.ts:88-110` `callHandlerWithRetry`：重试宿主仅包裹 handler 调用，`maxAttempts
  = 1 + onErrorRetries`（:89 闭包读 run 级值——本轮改为**入参传入**），指数退避
  `×2^(n-1)` 封顶 30000ms（:99/:104，delay 恒 env-only），通报先行（:103 `log` warn
  零新事件），零重试路径错误原样上抛（:108）。
- `engine.ts:141` 调用点 / `:142-157` catch：中止判定（:145）→ `node:error` 终态一次
  （:153）→ `if(onErrorStrategy === 'abort') onErrorAborted = true`（:155，本轮改按
  **逐节点解析结果**置位）。
- `engine.ts:183` 主循环 fail-fast `break` / `:198` `ok = !stopped && !onErrorAborted`
  / `:200` 返回值含 ok——机制全部复用，**零新增引擎机制**。
- `engine.ts` 现全文 **201 行**（`grep -c ""` 实测），解析层增量 ~25 行后仍 ≪400 上限。
- 机制面零涉足（预期零 diff，AC 禁区）：`config.ts`（:35/:84-90/:140-142 三 env 已在
  库，本轮零新增）、`events.ts:29-35`（run:done schema，:32 注释 0069 已刷新）、
  `server.ts:173-184`（outcome.ok 已消费引擎返回值）、`types.ts`、`handlers.ts`。

### 1.2 NDP 注册表形态（DEFS 扩展的样板与联动面）

- 样板：`packages/shared/src/nodes/retrieval/node.ts:16-25` params 数组（combo
  options/default、number min/max/step）。
- 合成层：`nodes.ts:68-98` `synthesizeParam`——combo 输出 `{k,l,t:'combo',o:labels,d:value}`、
  number 输出 `{k,l,t:'number',d,min?,max?,step?}`（键序即基线键序）；`:150-154`
  `paramDefaultsOf` 遍历 params 取 `p.k→p.d`。**聚合层 `nodes.ts` 本体零改动**（21
  import 不变，nodes-dirs D===R 全绿）。
- schema：`nodes.schema.ts:50-58` ParamJson 五 widget 判别联合——combo options
  `value/label` 无相等约束（:29-32），number 支 min/max/step（:53-54），`:134-147`
  superRefine ④ 校验 combo default ∈ options[].value、number default ∈ [min,max]。
  **schema 零改动**（新参数全部落在既有形态内）。
- visibleIf 编译：`nodes.ts:64-66` → 合成参数尾键 `if`（函数）——本轮**不使用**
  （§2.1-C 否决案）。

### 1.3 前端渲染链（零改动声明的证据）

- `apps/web/src/legacy/app.js:3` `import { NODES } from '@agentflow/shared'`——DEFS
  经 shared 单一来源自动到达前端，**零拷贝**。
- **节点体 widget 行**：`app.js:811` `makeNodeEl` 内
  `(def.params||[]).filter(p=>!p.if||p.if(ps)).map(p=>widgetHtml(node,p))` →
  `:819` `<div class="node-widgets">`——**无节点类型过滤，全部参数进节点体**；
  `:785-787` combo 渲染 `${comboOptionsOf(node,p).map(o=>`<option ${o===val?'selected':''}>…`
  （`val = paramsOf(node)[p.k]`，:782）——**按 label 逐字匹配选中值** →
  **combo 必须 value≡label**（否则选中态丢失，schema 注释「迁移期 value≡label」即此
  消费面约束，`nodes.schema.ts:28`）。
- **属性面板行**：`app.js:979-984` `renderProps` 同 filter + 同 combo 匹配形态。
- **combo 选项来源**：`app.js:779-780` `comboOptionsOf` 仅 (retrieval,kb) 被服务端
  供数替换，**其余 combo 恒 `p.o`**——新参数零涉足。
- **写回路径**（既有，零改动）：面板 `#props` change（:1146-1153，`n.params[k]=…` →
  `rerenderNode(n)`）/ 节点体 `nodesLayer` change（:1798-1808，`n.params[k]=…`，
  `:1806` 仅当被改参数**自身**带 `if` 才 rerender）。number 输入写回 `Number(value)`
  （:1149-1150/:1803）→ 引擎收到 number 类型。
- **visibleIf 源参数不刷新的证据（§2.1-C 否决依据）**：① 节点体路径 `:1806`
  `some(p=>p.if&&p.k===k)`——被改参数是 visibleIf **源**（如 onError，自身无 if）时
  条件为假 → 不 rerender；② 面板路径 `:1152` 只 `rerenderNode(n)`，**不调
  renderProps** → 面板行集不刷新。既有 trigger mode→cron/path 同构地存在此半残
  （其 `implemented:false` 属 UI-only 故未见消费投诉）——新参数是**真实现参数**，
  不能带病上车。

### 1.4 契约守护面（DEFS 扩展的联动清单，本轮四改一重生成）

| 守护 | 亲读坐标 | 本轮联动 |
| --- | --- | --- |
| defs-drift.test.mjs | :12-34 期望表（21 型全参数）；:39-43 计数护栏 `44` + 测试名「44/44」字面量（BK-0053 注记：护栏值变更时名字面量须随改）；:53-59 键集断言；:62-64 值断言 | 期望表 21 型各 +2 键；`44`→`86` ×2 处；测试名随改 |
| param-handler-guard.test.mjs | :74-85 `extractEngine`（engine.ts 仅 `n.type==='condition'` 行归 condition，**其余 p. 引用落 unattributed 即红**）；:91-97 EXPECTED_ZOMBIES；:143-151 total=44 / refCount=total−zombie | **必改**：engine.ts 新增 `p.onError`/`p.onErrorRetries` 引用须新增「engine-wide 跨节点参数」归属规则（§2.5）；`44`→`86` |
| synthesis.test.mjs | :25-51 EXPECTED_ORDER（10 型 params 声明序逐字断言）；:68-79 快照 Buffer 比对 + 失败信息指向 NDP §2 重生成命令 | EXPECTED_ORDER 10 型尾追加两键；基线重生成 |
| nodes.baseline.json | NDP 迁移 spec §2（docs/node-definition-protocol-migration-spec.md:36）：`node -e "import('./packages/shared/dist/index.js')…" > packages/shared/test/nodes.baseline.json`；`.gitattributes` 钉 LF | **经批准 DEFS 变更须同提交内重生成**（synthesis 失败信息原文要求） |
| readme-consistency.test.mjs | :36-44 paramRow（combo 列 = options label 之 `/` 连接；`implemented:false` 才标 UI-only）+ 生成器 tmp 重生成比对 | **测试文件零改动**；21 份 README 由生成器重跑刷新（`node tools/gen-node-readmes.mjs`，前置 build:shared，幂等） |
| nodes-dirs / contract / schema / events-negative / handlers-coverage | nodes-dirs :16-33 D===R=21；contract :11-35 抽样；schema 用独立 fixture；handlers-coverage 只比 HANDLERS⊇NODES 键集 | 五件**零改动** |

### 1.5 gate 场景与 golden 现状（重录方案的实测基座）

- `tools/pixel-gate/gate.mjs:573-615` SCENARIOS 恰 **21 场景**（s0~s20）；`:30`
  `--update` 开关；`:679-682` UPDATE 态**全量写盘**（png + invariants 双文件）；
  `:644-665` 公共六键不变量（含 `counts.widgets` 与节点矩形清单——新参数行直接命中
  这两键）；`:685-696` pixelmatch threshold 0 + invariants JSON.stringify 全等。
- golden 不变量实测（`node -e` 亲读 `tests/golden/ui/*.invariants.json`）：s0/s1/s2/
  s3/s6/s16 六例均 `nodes: 8, counts.widgets: 15`（默认 kefu 示例工作流 8 节点）。
- 场景逐一含可见节点（s2/s3/s4/s5 面板后为同一 kefu 画布；s6/s7 底部面板上方画布；
  s16-18 工作台旁画布；s8-s12/s14/s15/s19/s20 seed 两节点；s9/s13 在默认画布上操作）。
- `package.json` scripts 实读：`gate` / `gate:update` / `build` / `test` /
  `smoke:server`——命令口径与 PRD §10 一致。
- smoke 组前缀实跑 `grep` 在库：`A B CAP D G H O OE PT S Z`（+KB/J/M 等两字组）——
  本轮新组取 **OEN**（on-error node）零撞号。
- smoke 基线 **182/0**（0069 归档提交 0922d25 父提交 65e8c98 提交说明亲读
  「smoke 182/0」）；`tests/smoke/smoke-server.mjs` 现 2633 行；OE 组基建
  （:166-180 `wfOeFail` 夹具工厂 / :240-246 六探针实例 + oeMock 计数 mock /
  `oeRun` SSE 助手 / :544-546 主实例三 env 钉空 / :2429 起 OE01-OE08）全数在库可复用。

## 2. 技术方案

### 2.1 DEFS 参数面（21 × node.ts 尾部追加，逐字统一）

每个 `packages/shared/src/nodes/<type>/node.ts` 的 `params` 数组**尾部**追加两条
（追加尾 = 声明序稳定、基线 diff 可预期；`satisfies NodeDefSchema` 加载期校验兜笔误）：

```ts
{ id: 'onError', label: '失败策略', widget: 'combo',
  options: [
    { value: '跟随全局', label: '跟随全局' },
    { value: '跳过',     label: '跳过' },
    { value: '重试',     label: '重试' },
    { value: '中止',     label: '中止' },
  ], default: '跟随全局' },
{ id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
```

- **A · value≡label（中文即值）**：前端选中匹配按 label 逐字比对（app.js:787/:981，
  §1.3）→ 值语义只能经 label 承载；引擎侧以显式映射表消化中文值（§2.2），**零
  app.js 改动**、零 schema 放宽。「跟随全局」= 「若设」语义的否定态哨兵（PRD
  REQ-0070-02 推荐，采纳）。
- **B · 重试次数承载（PRD §8-2 强制对比表）**：

  | 方案 | 语义 | 判定 |
  | --- | --- | --- |
  | **独立 number 参数**（采纳） | 节点 retry 时次数恒取 `onErrorRetries`（默认 **2**，仅 retry 语义消费）；env 次数仅在「跟随全局」承接路径消费 | 节点 retry 永不被 env=0 退化（陷阱破解）；编排者可逐节点定次数；与 env 值域 0-5 对齐，缺省即有效 |
  | 隐含下限（否决） | 节点 retry 时 `max(env 值, 1)` | 次数不可编排（想 3 次须改全局 env，反向污染其他节点）；「节点胜」优先序在次数维失效；env 未配置时隐含 1 无处声明 |

  默认 2 的依据：>0（陷阱前提）、≈「一次失败后补一次」的最小有效编排、5 上限内留
  调节空间；min:0 保留「显式关闭重试」的表达（显式 0 = 用户意图，与缺省 2 可区分）。
- **C · 无条件双行（visibleIf 否决）**：PRD §8-3 两案对比——条件显隐依赖
  visibleIf **源参数变化触发重渲染**，而两条 change 路径均不提供（§1.3 证据
  app.js:1806/:1152）；补齐它需改两处宪法冻结交互面且行为波及既有 trigger 面板。
  无条件双行零前端改动、UI 恒一致、引擎侧 retry 次数仅 retry 语义消费（engine.ts:80
  同款守卫形态），中性参数行的呈现与既有先例（approval.to 等）一致。
- **D · 值域**：0-5 对齐 env `ON_ERROR_RETRIES`（config.ts:89）；step 1。退避基值
  **恒 env-only**（PRD REQ-0070-02 推荐，节点级退避不入——演进缝注记 ADR-0025）。
- **E · 非法/垃圾值防御**：引擎映射仅认精确 `'跳过'/'重试'/'中止'`，其余（含导入
  工作流的手改值）一律走哨兵路径承接 env/内建缺省——fail-safe，不 fail-fast
  （工作流 JSON 无 zod 装载面，防御在解析点钳制，§2.2）。

### 2.2 引擎解析层（apps/server/src/engine.ts，机制零新增）

1. **解析函数**（runNode 内或其闭包，策略/次数两出参；「env 两层」沿用既有
   `engine.ts:79-81` run 级常量）：

   ```ts
   /* 节点级 on-error 解析（BK-0048 / ADR-0025 · ADR-0022 §5 优先序写死）：
    * 节点参数（若设，非哨兵）> env 全局默认 > 内建缺省 skip+0。哨兵/非法值 → env 承接；
    * 重试次数仅 retry 语义消费：节点 retry 取节点参数（默认 2，陷阱破解——env=0
    * 不使之退化），env 承接取 env 次数；退避基值恒 env-only。 */
   const ON_ERROR_NODE_MAP = { '跳过': 'skip', '重试': 'retry', '中止': 'abort' } as const;
   const clampRetries = (v: unknown) => Math.max(0, Math.min(5, Math.trunc(Number(v) || 0)));
   function resolveOnError(p: Record<string, unknown>): { strategy: 'skip'|'retry'|'abort'; retries: number } {
     const nodeStrategy = (ON_ERROR_NODE_MAP as Record<string, 'skip'|'retry'|'abort'>|undefined)[String(p.onError ?? '')];
     const strategy = nodeStrategy ?? onErrorStrategy;
     const retries = strategy !== 'retry' ? 0
       : nodeStrategy ? clampRetries(p.onErrorRetries)
       : onErrorRetries;
     return { strategy, retries };
   }
   ```

2. **重试宿主签名**：`callHandlerWithRetry(handler, args, title, retries)`——`retries`
   由调用点（runNode :141 前）解析传入；delay/退避/通报/中止竞速逻辑**逐字不动**
   （:99/:103/:104）。`maxAttempts = 1 + retries`（:89 改读入参）。
3. **abort 分派**：catch 内 `:155` 改 `if(res.strategy === 'abort') onErrorAborted
   = true;`（res = resolveOnError(p) 于 runNode 前段解析一次）——标志位/主循环
   fail-fast/ok 语义零改动（:82/:183/:198）。
4. **循环子节点 per-call**：解析发生在 runNode 每次调用内，loop handler 经
   `sub(cid,…)`（handlers.ts:187）递归即逐迭代逐节点独立解析（ADR-0022 §2.4）——
   引擎与 loop handler 双零改动。
5. **零漂移核**：全哨兵 + env 未配置 ⇒ strategy=skip、retries=0 ⇒ `maxAttempts=1`
   ⇒ 零重试路径错误原样上抛（:108 既有）⇒ catch 序列与现状逐位一致。

### 2.3 行为裁决（正例 / 反例 / 边缘）

| # | 口径 | 判定 |
| --- | --- | --- |
| B1 | 全部节点哨兵（默认/显式）+ env 三键未配置 | 与 0069 终态逐位一致（下游失活、node:error 恰 1、ok 不反映失败）——AC1 |
| B2 | 节点哨兵 + env=retry×N | env retry 生效（承接路径）——AC2 ① |
| B3 | 节点=重试 + env=skip（或未配置） | 节点 retry 生效，次数=节点参数默认 2 或显式值——AC2 ② / AC3 |
| B4 | 节点=重试 + env=retry×N | **节点胜**（策略与次数均取节点），env 次数不叠加——AC2 ② 延伸（OEN06 断言） |
| B5 | 节点=中止（env 任意） | run 级 fail-fast：失败后全部后续节点（含同级分支）不再调度，`ok:false, stopped:false`，持久层 status='error'；`stopped` 恒用户/停机中止独占——AC4 |
| B6 | 节点=跳过（显式）+ env=retry | 节点 skip 胜，零重试（策略维度节点覆盖 env） |
| B7 | 导入工作流带垃圾 onError 值（如 `"foo"`） | 走哨兵路径承接 env/内建（fail-safe），不抛错不中断 |
| B8 | 导入工作流 onErrorRetries 为非数/越界 | `clampRetries` 钳入 [0,5]；`Number(v)||0` 兜 NaN→0 |
| B9 | 老工作流（无两键） | `P(n)` 注入默认 → 哨兵 → B1 |
| B10 | 重试期间 stop / 优雅停机 | abortable sleep 竞速 ac.signal 即时中断（:104 既有零改动）——OE06 既有断言回归承载 |
| B11 | 审批挂起（approval:required） | 非失败，不触发任何策略（ADR-0022 §2.4 延续） |
| B12 | LLM/agent 流式节点节点级重试 | delta 叠加观感风险沿 0069 已声明缓解（log warn 通报），零新增风险面 |

### 2.4 模块边界（不越界清单）

- **ADR-0003 / AGENTS 硬性约定 2**：参数唯一来源 = packages/shared DEFS；前端经
  import 消费，后端经 `paramDefaultsOf` 消费，两侧零拷贝（契约测试抓漂移）。
- **前端零改动**：app.js / Skeleton.tsx / app.css / server-sync.js 四文件
  `git diff` 恒空——新行由 DEFS 通用渲染链（§1.3）自然承载。
- **引擎内聚**：解析层全部落 engine.ts 单文件；config/events/types/server/handlers/
  llm/agent/store 零涉足（AC8 机器证明）。SSE 契约零新增（既有
  node:error/run:done/log 三事件承载；确需新事件/字段立即中止转 needs-approval，
  ADR-0022 §4.4 硬护栏延续）。
- **零新增 env**（config.ts 零 diff）、零新依赖（package*.json 零 diff）、零出站。
- BK-0018（memory，他路占位）与 BK-0064 面零涉足；smoke 新增为**纯插入 OEN 组**
  （与 MEM 修复轮预期「双方各自新增」型冲突，按合并契约分类解决——PRD §7 知会承继）。

### 2.5 param-handler-guard 提取器扩展（本轮唯一测试逻辑改动）

现状：engine.ts 仅 `n.type === 'condition'` 守卫行的 `p.` 引用归 condition，其余落
`unattributed` 即红（param-handler-guard.test.mjs:74-85/:110-114）。新解析行的
`p.onError`/`p.onErrorRetries` 属**跨节点引擎参数**，不属于任何单一 handler——按
该测试「无法归属的引用 = 红（不静默）」的自身纪律，**如实扩展归属规则**：

```js
/* engine-wide 跨节点参数（BK-0048 / ADR-0025）：全 21 类统一声明、engine.ts 统一
 * 消费——行内 p. 引用全属该键集时归属全部节点类型（正向=逐类型存在性断言；
 * 反向=自然豁免僵尸清单）；混入其他键仍落 unattributed（不静默）。 */
const ENGINE_WIDE_PARAMS = ['onError', 'onErrorRetries'];
// extractEngine 内，condition 规则之后：
else if (keys.length && keys.every(k => ENGINE_WIDE_PARAMS.includes(k)))
  for (const type of Object.keys(NODES)) addRefs(refs, type, keys);
```

正向断言（:116-124 原样复用）由此获得「21 类全部带齐两参数」的**逐类型机器证明**
（漏改任一 node.ts 即红）——即 REQ-0070-01 全 21 类统一的执法点。反向僵尸计算
（:127-137）自然豁免（每类型 refs 已含两键），EXPECTED_ZOMBIES 零改动。
`:144` 计数护栏 `44`→`86`，`:139-142` 注记续写一行（44+21×2=86，僵尸 8 不变）。

## 3. 受影响文件清单（productFiles 白名单终稿）

| # | 文件 | 改动 | 类型 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/{trigger,userinput,llm,agent,prompt,retrieval,websearch,http,code,notify,terminal,condition,loop,delay,merge,reply,termview,setvar,webshow,jsoncanvas,approval}/node.ts` ×21 | params 尾部追加 §2.1 两参数（逐字统一） | 产品 |
| 2 | `packages/shared/test/nodes.baseline.json` | NDP §2 命令重生成（build:shared 后） | 产品（生成物） |
| 3 | `packages/shared/src/nodes/*/README.md` ×21 | `node tools/gen-node-readmes.mjs` 重跑刷新参数表 | 产品（生成物） |
| 4 | `packages/shared/test/defs-drift.test.mjs` | 期望表 +2×21 键、计数 44→86 ×2、测试名「44/44→86/86」 | 产品 |
| 5 | `packages/shared/test/param-handler-guard.test.mjs` | §2.5 ENGINE_WIDE 规则 + 计数 44→86 + 注记 | 产品 |
| 6 | `packages/shared/test/synthesis.test.mjs` | EXPECTED_ORDER 10 型尾追加两键 | 产品 |
| 7 | `apps/server/src/engine.ts` | §2.2 解析层 + 宿主签名 + abort 分派（~25 行） | 产品 |
| 8 | `tests/smoke/smoke-server.mjs` | OEN 组纯插入（§5，~120 行）+ 探针声明区注记 | 产品 |
| 9 | `tests/golden/ui/s{0..20}-*.png` + 同名 `.invariants.json` ×42 | `npm run gate:update` 恰一次全量重录（§4.3） | 产品（生成物，修宪通道） |
| 10 | `docs/adr/0025-node-onerror-param-ui.md` | 本轮新建（机制件） | 机制 |
| 11 | `docs/evolution/iterations/0070/{SPEC,JOURNAL,REPORT}.md`、BACKLOG 过程改动、evidence/ | 迭代产物（机制件） | 机制 |

**零改动负清单（VERIFY `git diff` 恒空机器证明）**：`apps/server/src/config.ts`、
`events.ts`（packages/shared/src/events.ts）、`types.ts`、`server.ts`、`handlers.ts`、
`llm.ts`、`agent.ts`、`store.ts`、`apps/web/src/**`（app.js/Skeleton.tsx/app.css/
server-sync.js）、`packages/shared/src/nodes.ts`、`nodes.schema.ts`、
`nodes-dirs.test.mjs`、`contract.test.mjs`、`schema.test.mjs`、
`events-negative.test.mjs`、`handlers-coverage.test.mjs`、
`readme-consistency.test.mjs`、`tools/pixel-gate/gate.mjs`、
`tools/gen-node-readmes.mjs`、`.env.example`、`package*.json`、CI 配置、
`CONSTITUTION.md`、`tests/canvas/**`、`packages/shared/src/nodes/*/README.md` 以外
的 docs（NDP spec §2 数字快照系迁移期历史记录，本轮不强制回写；BUILD 如顺手更新
须在 JOURNAL 记一行）。

**文件规模**：engine.ts 201→~230 行；21 × node.ts 各 +~8 行；smoke 2633→~2760 行
（既有文件不受「新增源文件 ≤400 行」约束——本轮**零新增源文件**）；契约测试各
+10~30 行。

## 4. golden 方案（修宪轮要件）

### 4.1 宪法第 3 条依据与授权链

- 授权链 = **issue#6 用户批复承继（2026-10-24T08:38:51Z 在库留档）**：BK-9006
  「既有节点 UI 参数扩展杂项」之「on-error 参数」条目（BACKLOG.md:69/:98 亲读）；
  同链修宪消费先例四轮（0037 BK-0050 / 0038 BK-0046 / 0039 BK-0049 / 0065
  BK-0047），golden 场景号落盘时序裁决先例（ADR-0015 §5）三连在案。
- 通道：WORKFLOW §4 BUILD 修宪轮条款——脚本在 gate 失败时允许执行**恰一次**
  `npm run gate:update`；golden 权威仍在 CI（windows-latest），推送后盯
  `ui-constitution` required check。AGENTS.md「golden 永不重录」在本通道内被
  宪法第 3 条流程合法取代（0037-0065 同判）。
- ADR-0025 承载三要素（动机 / 影响面 / 像素对比证据）与本节重录方案，标注
  「已获用户 issue#6 批复」。

### 4.2 波及面枚举（SPEC 终稿，VERIFY 按「不多不少」执法）

**枚举 = 全部 21 场景（s0~s20），零新增场景。** 判据（全场景通用）：新参数行经
`makeNodeEl`（app.js:811 无类型过滤）进入**每个非折叠节点的节点体**（+1 combo 行
恒显 +1 number 行恒显；visibleIf 不用故无显隐面）→ 每节点 `counts.widgets` +2、
节点矩形增高 → 像素 + DOM 不变量双变。属性面板可见的场景（s1/s13/s14/s15/s20）
面板行集同步 +2。逐场景呈现面核对表：

| 场景 | 画布呈现面 | 判定依据 |
| --- | --- | --- |
| s0-initial / s1-select-node | 默认 kefu 工作流 8 节点（s1 另开属性面板） | golden 不变量实测 8 节点 / widgets 15 → 预期 31；s1 面板 +2 行 |
| s2-settings / s3-library / s4-workflows-online / s5-history-online | 同一 kefu 画布居后（面板另侧） | 节点体 +2 行 ×8 |
| s6-log-panel / s7-log-filter-warn | kefu 画布（底部面板上方） | 同上 |
| s8-agent-node（AGENT seed） | trigger+agent 两节点 | 各 +2 行 |
| s9-goal-panel-online | AGENT seed + goal 面板 | 同 s8 |
| s10-webshow / s11-termview / s12-jsoncanvas | 各 seed trigger+X 两节点 | 同 s8 |
| s13-approval-role-picker | kefu 画布 #7 审批节点选中 + 面板 | 面板/节点体双 +2，role-pick 按钮位移随重录 |
| s14-code-lang-sync | CODE seed 两节点 + 面板 | 同上（`select[data-k="lang"]` 探针不受新行影响） |
| s15-caps-panel | CAPS seed（trigger+llm）+ 面板 | 同上（cap-server 计数探针不受影响） |
| s16/s17/s18-workbench | kefu 画布 + 工作台面板 | 节点体 +2 行 ×8 |
| s19-terminal-panel-online | TERM seed + 终端面板 | 同 s8（`input[data-k="session"]` 探针不受影响） |
| s20-retrieval-kb-online | KB seed + 面板 | 同上（`select[data-k="kb"]`/kbOptions 探针不受影响） |

**执法口径（VERIFY 强制）**：BUILD 落盘后先跑 `npm run gate` 记录实测 FAIL 集——
必须**恰等于**本枚举（21/21，不多不少）。实测出现枚举外场景红 → 归因排查：实现
错误即修 BUG 回绿，禁止以重录掩盖（0056 P1 教训：变更集收敛恰枚举）；实测出现
「零波及」场景（理论上不可能——每场景均有节点）→ 如实上报、重录集收窄至实测集并
在 JOURNAL 留痕。重录后 `git status tests/golden/` 必须恰 42 文件修改、零新增零
删除；`tests/golden/diff/` 复跑全绿后被 gate 自清（gate.mjs:708-711）。

### 4.3 重录流程（BUILD 序，恰一次）

```
npm run build                       # shared + web（新 DEFS 进 dist）
npm run gate                        # 首跑：实测 FAIL 集合 ≡ {s0..s20}（记录 21 组 diffPx + 不变量差）
npm run gate:update                 # 恰一次全量重录（issue#6 通道，ADR-0025 在案）
npm run gate                        # 复跑：21/21 pass · diffPx=0（s3-library 抖动按 §4.4）
git status tests/golden/            # 恰 42 文件（21 png + 21 invariants.json）
```

前后对比证据（21 组 diff png + 重录前后不变量）随 VERIFY 留档
`iterations/0070/evidence/`；「请人工确认符合宪法第 3 条流程」的 gate:update 输出
原文贴入 JOURNAL。

### 4.4 s3-library 抖动纪律（issue#12 承继）

重录后复跑若 s3-library 出现亚像素抖动（diffPx 小值、DOM 不变量逐键全等）：复跑
判定、双留档、**绝不以抖动消费第二次 gate:update**；golden 权威在 CI，以
`ui-constitution` 结论为准。

## 5. smoke 扩断言方案（OEN 组，纯插入；新组 ID 避让既有组实测零撞号）

复用既有探针实例拓扑（`oeSrvSkip` / `oeSrvRetry`(ON_ERROR=retry×2×50ms+oeMock) /
`oeSrvAbort` / 主实例三 env 钉空）+ `wfOeFail` 夹具工厂扩展 `params` 入参
（:166-180，node#2 http 增 `onError`/`onErrorRetries` 键）——**零新增探针实例、零
新增 mock**。断言矩阵（每行一条 `C.ok`，命名沿 OE 组双行 fail 形态）：

| # | 实例 | 夹具（node#2 params） | 断言要点 | 对应 |
| --- | --- | --- | --- | --- |
| OEN01 | 主实例（env 钉空） | `{onError:'跟随全局'}` | 与 OE01 同型：node:error 恰 1、下游 3 无 node:start、run:done ok:true、status='done' | AC1 显式哨兵 |
| OEN02 | oeSrvRetry（env retry×2） | `{onError:'跟随全局'}` | mock 命中恰 3（env ×2 承接）+ log warn 恰 2 + 耗尽降级 | AC2 ① |
| OEN03 | oeSrvSkip（env skip） | `{onError:'重试', onErrorRetries:1}` | mock 命中恰 2（1+1）——env skip 未压制节点策略（**节点胜**；退避取该实例 DELAY 缺省 1000ms，用例 +1s 可接受） | AC2 ② |
| OEN04 | 主实例（env 全未配置） | `{onError:'重试'}`（次数缺省 → 默认 2 注入） | mock 命中恰 3（1+2）——**env retries=0 未使节点 retry 退化**（陷阱破解机器证明） | AC3 |
| OEN05 | oeSrvAbort | `{onError:'中止'}` + sibling | fail-fast：starts 不含 3/4、run:done ok:false/stopped:false、status='error' | AC4 |
| OEN06 | oeSrvRetry（env retry×2） | `{onError:'中止'}` + sibling | mock 命中恰 1（零重试）+ fail-fast——**节点策略类型覆盖 env 策略类型** | AC2 ② 延伸/B4 |
| OEN07 | 主实例 | loop 夹具：userinput → loop → http 失败节点 `{onError:'重试', onErrorRetries:1}`（loop 闭包子图） | mock 命中恰 2——循环子节点经 sub() 逐 runNode 调用独立解析（handlers.ts:187 → engine 解析点） | AC7 |

预期断言总数 182 → **189**（OEN01-OEN07 各一条复合 C.ok，BUILD 如需拆分复合断言
为多条须在 JOURNAL 申报终值；REPORT 记录实跑 passed/failed 原文）。既有 182 条
零回退即「全哨兵隐式矩阵」证明（所有既有用例的工作流经 `P(n)` 注入哨兵默认后
全量重放，B1/B9）。

## 6. 手动 E2E 点位（PRD REQ-0070-08 展开，VERIFY 逐项走查留证据）

| # | 点位 | 步骤 | 期望 |
| --- | --- | --- | --- |
| E1 | 节点级重试 | `npm start` → 选中 kefu 示例 http 节点 → 失败策略=重试、次数 1 → URL 改为必失败地址 → 运行 | 日志面板恰 1 条「第 2 次尝试将在 …退避后执行」warn 通报 → 节点终态失败、下游失活、运行卡正常收尾（ok 不反映失败） |
| E2 | 节点级中止 | 同工作流另一 http 节点设中止 + 同级独立分支 → 运行 | 失败后同级分支节点不再调度；运行卡「· 失败」；刷新后 run 列表 status=error |
| E3 | 跟随全局 × env 承接 | `server/.env` 配 `ON_ERROR=retry`、`ON_ERROR_RETRIES=1`、`ON_ERROR_RETRY_DELAY_MS=50` 重启 → 节点保持「跟随全局」→ 运行 | env 重试生效（恰 1 条通报）；改回哨兵外值（重试）→ 节点次数生效且与 env 无关 |
| E4 | 面板 ↔ 节点体一致性 | 面板改失败策略 → 节点体 select 同步（rerenderNode :1152）；节点体改值 → 重选该节点后面板一致 | 双向一致；刷新页面后持久值一致（saveLocal） |
| E5 | 交互回归抽查 | 数字拖动步进（drag-num）、combo 展开、撤销重做、节点折叠/展开、删除节点 | 新行不破坏既有交互（test-manager 交互回归清单内）；折叠节点不呈现新行 |

## 7. 验收口径（VERIFY 逐条执行；命令在**工作树根**执行）

- **AC1 未设零漂移（硬护栏，PRD AC1 修正口径）**：`npm run smoke:server` 既有
  182 条零回退（隐式哨兵矩阵）+ OEN01 显式哨兵断言绿；「非波及 gate 场景」集合
  为空集（§0 修正 2）——该子句由 AC5 的「重录后全量 diffPx=0 + 变更集恰枚举」承载。
- **AC2 优先序三层矩阵（PRD AC2）**：OEN02（哨兵→env 承接）/ OEN03+OEN06（节点
  胜，含策略类型覆盖）/ OEN01+B1（全未配置=内建缺省逐位一致）三向齐备。
- **AC3 节点 retry 正例（PRD AC3）**：OEN04 耗尽降级（恰 3 尝试、warn 恰 2、
  node:error 恰 1 含「已重试 2 次」、下游失活、ok 语义不变）；第 N+1 次成功路径由
  既有 OE04（env 同构）回归承载 + OEN03 次数覆盖。
- **AC4 节点 abort（PRD AC4）**：OEN05 全链（fail-fast 同级分支不再调度 /
  ok:false,stopped:false / status='error' / stopped 语义独占）。
- **AC5 面板呈现与像素面（PRD AC5）**：手动 E2E E1/E2/E4 + §4.3 重录后
  `npm run gate` 21/21 pass · diffPx=0 · DOM 不变量全等 · golden 变更集恰 42 文件。
- **AC6 契约守护（PRD AC6，基数修正 44→86）**：`npm test` 全绿——baseline 重生成
  后逐字节等价（synthesis）、defs-drift 86/86、param-handler-guard（含 §2.5 逐类型
  存在性断言=全 21 类统一执法）、nodes-dirs / readme-consistency / contract /
  schema / handlers-coverage 全绿且文件零 diff。
- **AC7 循环子节点 per-call（PRD AC7）**：OEN07。
- **AC8 禁区机器证明（PRD AC8）**：产品提交落盘后
  `git show --numstat <产品提交>` 恰 §3 白名单路径；
  `git diff HEAD -- apps/server/src/config.ts packages/shared/src/events.ts
  apps/web/src apps/server/src/types.ts apps/server/src/server.ts
  apps/server/src/handlers.ts package.json package-lock.json` 恒空（零新增 env /
  SSE 契约零变更 / 前端零改动 / 零新依赖）；`gate:update` 消费恰一次（JOURNAL
  留痕）。
- **AC9 回归面全绿（PRD AC9）**：`npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server` 四项全绿（s3-library 抖动按 §4.4）。
- **AC10 回执与记账（PRD AC10）**：STATE phase/item 指针核对；BACKLOG 终态回写归
  CLOSE；issue#6 关单回执归 CLOSE 脚本（链终轮，itemContinues=false）。
- **锚点抽样 ≥5 组（PRD §10）**：VERIFY REPORT 至少亲核并引用 engine.ts:76-82/
  :88-110/:155/:183/:198、config.ts:35/:88-90/:140-142、
  nodes/retrieval/node.ts params、nodes.ts:150-154、smoke-server.mjs:166-180/:240-246
  ——均本 SPEC §1 亲读坐标，VERIFY 复核实现后坐标如有漂移以实现为准并注明。

**BUILD 实施序建议**（不约束内部粒度）：① 21 × node.ts 参数追加 →
`npm run build:shared` → baseline 重生成（NDP §2 命令）+ README 重跑 →
② 契约测试三件改表（defs-drift / param-handler-guard / synthesis）→ `npm test` 绿
→ ③ engine.ts 解析层 → `npm run build:server` + `npm run smoke:server`（先验既有
182 零回退）→ ④ OEN 组插入 → smoke 189 全绿 → ⑤ `npm run build` → gate 首跑
（FAIL 集合 ≡ 枚举核对）→ `gate:update` 恰一次 → gate 复跑全绿 + git status 核对
→ ⑥ 手动 E2E。

## 8. 反转护栏（过程护栏，承继 PRD §11）

实现中若需 ①新增 SSE 事件/字段 ②新增 env 语义 ③新增依赖 ④golden 变更集超出
§4.2 枚举 ⑤app.js/前端文件出现 diff——**立即中止转 needs-approval**（POLICY 需
批准区；issue#6 修宪批复不自动覆盖契约/env/依赖面，BK-0043→#14 先例）。本 SPEC
方案自证零涉：SSE 零新增（§2.4）、零新 env（§3 负清单）、前端零改动（§1.3）、
波及面恰枚举（§4.2）。修复循环 ≤2（WORKFLOW §4）；超限按回滚处理（工作树丢弃，
主干零影响）。

## 9. 风险与回退

| 风险 | 缓解 |
| --- | --- |
| 波及面实测与枚举不符（枚举外场景红） | §4.2 执法口径：归因分流，实现错误修 BUG 回绿，禁止重录掩盖；真超枚举波及 → 中止上报不超授权扩录 |
| s3-library 本机亚像素抖动 | §4.4 issue#12 纪律：复跑判定、双留档、CI 权威 |
| combo value≡label 中文值入引擎（非常规形态） | 显式映射表 + fail-safe 哨兵兜底（§2.2/B7）；形态受前端选中匹配约束（§1.3 证据链），ADR-0025 §否决案留档 |
| 旧工作流/手改 JSON 垃圾值 | B7/B8 fail-safe + 钳制 |
| LLM/agent 流式重试 delta 叠加 | 0069 已声明缓解（log 通报），零新增风险面（B12） |
| param-handler-guard 提取器扩展引入误归属 | 规则限定「行内 p. 键全属 ENGINE_WIDE_PARAMS」；混入其他键仍落 unattributed 即红（§2.5）；npm test 实跑验证 |
| 并行路 BK-0018 轮 tests/smoke 交集 | 纯插入 OEN 组 vs MEM 组，双方各自新增型冲突按合并契约分类解决（0034 先例）；engine.ts/shared DEFS 零交集（PRD §7 知会承继） |
| 需求不可解 / 触及冻结面 | WORKFLOW §4 BUILD 中止条款：item 转 pending-approval/blocked，迭代回滚 |
