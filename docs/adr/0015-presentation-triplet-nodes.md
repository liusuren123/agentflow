# ADR-0015 · 呈现三件套节点分批修宪方案草案（网页展示 / 终端只读流 / JSON 画布）

- 状态：**已获用户 issue#3 批复（2026-10-23T15:49:32Z 承继）· BK-0036 实施轮已消费
  （迭代 0033）· BK-0037 实施轮已消费（迭代 0034）· BK-0038 实施轮已消费（迭代 0035）
  · 链闭合——原文其余按草案态保留；授权链 = issue#3 用户批复承继
  （2026-10-23T15:49:32Z，见 BACKLOG BK-9003 行）**
- 日期：2026-10-25（BUILD 阶段产出，迭代 0029 / BK-0035，S 项 skipSpec——PRD §7 内嵌定界）
- 关联：BACKLOG BK-0035（本 SPEC 先行轮，done 归档于迭代 0029 CLOSE）/ BK-0036 /
  BK-0037 / BK-0038（三修宪实施轮，proposed）/ BK-9003（skipped，拆分母项）/
  BK-0021（NDP 目录制，done）/ BK-0045 · ADR-0014（PTY 边界切割对照物，§4.4）/
  ADR-0013（DEFS 定界 + schema 纪律自检 + golden 双通道三板斧直系样板）；
  ROADMAP T5-M3 智能体工作台 UI（呈现三件套，#3 序位）；POLICY.md 需批准区
  （shared 契约 / UI 三层 / golden）
- 版式对齐：ADR-0013 / ADR-0014

> **显著声明：本 ADR 为修宪方案草案，不实施任何代码、不引入任何依赖、不新增任何
> env 或出站类别、不改变任何运行时行为、不接触任何 golden 基线。全部 DEFS / 前端 /
> golden 改动仅以文字方案存在，实施归 BK-0036 / BK-0037 / BK-0038 修宪轮（授权链 =
> issue#3 批复承继 + 本 ADR）；本链零新依赖零新 env 零新出站类别（呈现型 sink，
> §3/§4 论证），故无 ADR-0014 式「待用户批准」位。本文件状态行在各实施轮 CLOSE 时
> 按 ADR-0010/0012 先例更新，全文不出现批准态措辞（始终为草案态标注）。**

## 1. 动机与现状证据

issue#3（BK-9003，用户批复 2026-10-23T15:49:32Z；2026-10-25 治理日拆分后由
BK-0035→0036→0037→0038 承继授权）注入的是**呈现三件套节点**：网页展示 / 终端只读流
/ JSON 画布。在 T5 差异化定位「画布编排 × 深度智能体工作台」（ROADMAP.md:126-128）
中，三节点是工作台的**呈现层**：上游节点的产物（URL / 流式文本 / 结构化数据）目前
只能以纯文本短摘要存在，无法在画布上得到富呈现。

现状证据四条（本 BUILD 会话逐项亲核）：

- **sink 同构样板**：`packages/shared/src/nodes/reply/node.ts`（21 行）——outputs
  空数组（终点节点，与 notify 同构）、inputs 单 `in-content` type any、binding
  `{ handler:'reply', capabilities:{ data:true } }`、params 单 textarea；承载样板
  `apps/server/src/handlers.ts:225-232`（render → `ctx.outputs!.push` +
  `emit('output',{text})` + `out` 摘要文本）。三呈现节点与 reply 同为 output 类目
  sink，DEFS 骨架循此同构。
- **呈现能力差距（修宪面的事实依据）**：节点体输出区现状为纯文本短摘要——
  `app.js:897` 属性面板运行数据输出 `slice(0,160)` 截断、`app.js:1896` setNodeOut
  以 `textContent` 单行写入 `.node-out`（节点体唯一输出容器，`app.js:774`）、
  `app.js:1866/:1203` RUN_META 逐类型单行文案。iframe 内嵌网页 / 等宽流式滚动 /
  JSON 结构化树三形态均超出该文本能力，即三节点「前端三文件 + gate 场景增量」
  修宪面的由来。
- **DEFS 通用渲染链（零改动自动承载面）**：端口行 `app.js:764-765`（port-row 由
  `def.inputs/outputs` 逐端口渲染）与 widget 行 `app.js:763`（`def.params` 逐参数
  widgetHtml）均数据驱动——新端口/新参数行**零前端改动**即自动渲染；节点库 output
  分组条目（DEFS×CATS 通用渲染）同理自动新增。修宪面收敛在**节点体输出区的三形态
  呈现**与 s3-library 数据驱动像素变化（§4/§6）。
- **NDP 目录制终态（前置 BK-0021 done）**：`packages/shared/src/nodes/` 16 目录 +
  `nodes.ts` 142 行聚合层（imports :19-34、loadJsonDef :37-47、synthesize :93-111、
  NODES 16 键 :113-130）——新节点一律新增 `src/nodes/<type>/{node.ts,README.md}`
  目录 + nodes.ts 一 import 一键（「先迁移后扩展」兑现，ROADMAP.md:162-164）。

## 2. 三节点 DEFS 定界草案

定界粒度 = 字段级草图（ADR-0013 §2.1 草案级；**不预写 DEFS 终稿代码块**——终稿归
各实施轮 SPEC，BK-0045 行同款纪律）。三节点共同骨架（sink 同构 reply）：类目固定
`output`（复用 `--cat-output` 既有类目色，app.js:52——零新增 CSS 变量与类目，
BK-0033 归 chat 类目同款两段口径）、outputs 空数组、binding handler 新键 +
`capabilities:{ data:true }`、params ≤3 项且全部取自五种 widget 枚举。**全部字段在
冻结枚举内组合（nodes.schema.ts:13-15），零溢出**（溢出即触需批准面扩大，本 ADR
不设任何溢出推荐案）。

### 2.1 网页展示（webshow，批次 1 / BK-0036）

| 字段 | 草案 | 说明 |
| --- | --- | --- |
| type | `webshow` | 小写英文；终名以本 ADR 为准 |
| identity | name 网页展示 · category output · icon `globe` · keywords「webshow 网页 展示 预览 iframe 呈现」· desc「将上游网址以内嵌安全视图呈现（终点节点）」 | icon 复用 ICON_PATHS 既有键（app.js:63，与 websearch 同键——`I()` 按键查表 app.js:100，无唯一性约束） |
| ports.inputs | `[{ id:'in-url', label:'网址', type:'any' }]` | type any = 连接面最宽（typeOk app.js:43），上游任意输出可接；**双输入备选案（in-url text + in-ctx any）已否决**：呈现型 sink 无双源语义，参数 `url` 已承载静态兜底 |
| ports.outputs | `[]` | sink 同构 reply |
| params | `url`（text，default `''`，静态兜址·输入端口值优先）+ `sandbox`（toggle，default `true`，iframe sandbox 属性开关） | 两项均在 widget 枚举内；第 3 项备选 `height`（number）**不推荐首发**——呈现高度由 CSS 容器定，避免参数面膨胀，记为实施 SPEC 可选项 |
| binding | `{ handler:'webshow', capabilities:{ data:true } } | handler 新键；data=true 同 reply（emit('output') + outputs 汇入，无出站 IO） |

### 2.2 终端只读流（termview，批次 2 / BK-0037）

| 字段 | 草案 | 说明 |
| --- | --- | --- |
| type | `termview` | 终端**只读**呈现，命名刻意避开 terminal/pty 语义词（§4.4 切割） |
| identity | name 终端只读流 · category output · icon `code` · keywords「termview 终端 只读 流式 呈现 输出」 · desc「将上游文本流以等宽终端样式只读呈现（终点节点）」 | icon 复用 `code` 既有键（app.js:65，与代码执行同键）；新增 `terminal` 键列为可选增量（§4 备选） |
| ports.inputs | `[{ id:'in-stream', label:'数据流', type:'any' }]` | 接上游流式节点（如 llm）；流式增量由引擎既有 node:delta 通道承载（§3） |
| ports.outputs | `[]` | sink 同构 reply |
| params | `lines`（number，default 200，min 20，max 2000，step 20，缓冲行数上限·超出裁旧）+ `autoscroll`（toggle，default `true`，自动滚动） | 两项均在枚举内、契约矩阵合法（§2.4） |
| binding | `{ handler:'termview', capabilities:{ data:true } } | 同 reply；**无 exec/net/fs 等任何能力键**——零进程零出站（§4.4） |

### 2.3 JSON 画布（jsoncanvas，批次 3 / BK-0038，链终轮）

| 字段 | 草案 | 说明 |
| --- | --- | --- |
| type | `jsoncanvas` | 结构化呈现画布 |
| identity | name JSON 画布 · category output · icon `box-select` · keywords「jsoncanvas json 画布 结构化 树 呈现」· desc「将上游 JSON 数据以结构化树呈现（终点节点）」 | `box-select` 为 ICON_PATHS 既有键且**现行无节点占用**（app.js:84，纯 UI affordance 键）；新增 `braces` 键列为可选增量 |
| ports.inputs | `[{ id:'in-data', label:'数据', type:'any' }]` | **object 严型案已否决**：typeOk（app.js:43）下 object 入口拒接上游 text 输出，呈现型 sink 不挑食——非 JSON 输入由 handler 如实降级（§3），对齐「未接入能力如实降级」纪律 |
| ports.outputs | `[]` | sink 同构 reply |
| params | `expand`（number，default 2，min 0，max 6，step 1，默认展开层级）+ `fmt`（toggle，default `true`，格式化缩进·false 紧凑原文） | 两项均在枚举内 |
| binding | `{ handler:'jsoncanvas', capabilities:{ data:true } } | 同 reply |

### 2.4 schema 纪律合规自检（各实施轮 nodes.baseline.json 重产的依据）

- 端口 id `^[a-z][a-z0-9-]{2,31}$` + in-/out- 前缀 + 节点内唯一（nodes.schema.ts:18-21 /
  :152-165）：in-url / in-stream / in-data 均小写开头、长度合规、节点内唯一 ✓；
  outputs 空数组无 out- 义务（reply/notify 同构先例）✓。
- 端口类型 ∈ PORT_TYPES 五枚举（:13）：三节点均 any ✓；**零新端口类型**。
- 参数 widget×default 契约矩阵（:50-58）：text default ''（string）✓；toggle
  default true（boolean）✓；number lines 200 ∈ [20,2000] 且 step 20>0、expand
  2 ∈ [0,6] 且 step 1>0（:138-146 约束）✓；params id 节点内唯一（:115-122）✓；
  无 visibleIf（三节点首发均无条件参数）✓；**combo 未用**——如实施轮需要选项参数
  （如呈现模式）仍须在枚举内取用且 default ∈ options 值域（:136-137）。
- capabilities strictObject 键集 ⊆ 十 kind（:72-83）：仅 `data:true`，与 reply 同键 ✓。
- identity.category ∈ CATEGORIES 七枚举（:15）：固定 output ✓；**零新类目零新
  CSS 变量**（app.js:46-54 CATS 与 app.css 类目色区零改动）。
- caps 合成（nodes.ts:97-99）：capabilities.data **不进 caps**（合成层只映射
  mcp/skill 两键）→ 前端能力 chip 渲染面零新增（app.js:778-784）✓。
- baseline 联动：每节点落地 = `packages/shared/test/nodes.baseline.json` 重产一键
  +1（16→17→18→19，分批逐键，经批准通道）+ nodes-dirs 目录计数断言（D===17/18/19）
  + defs-drift +1 + README 生成器（tools/gen-node-readmes.mjs）与
  readme-consistency 回比——BK-0033 行既定口径逐批复用（BACKLOG.md:46）。
  **实施轮计数校正（迭代 0033 BUILD 按代码事实转写）**：本节与 §5 表所记「16→17」
  系 agent 节点入列（迭代 0031）前的旧数——BK-0036 实施时 baseline 实为 **17→18**
  （17 键 → 18 键，nodes-dirs D 17→18、defs-drift 36→38 参数）；BK-0037/0038 批次
  相应为 18→19、19→20，沿 0027/0029 行号笔误转写先例。

## 3. 呈现承载定界（sink handler）

- **落点与注册**：三个 handler 新键（webshow/termview/jsoncanvas）进
  `apps/server/src/handlers.ts` 的 BASIC_HANDLERS，经 `engine.ts:26-29`
  `{...BASIC_HANDLERS}` 展开自动入 HANDLERS——**engine.ts 零改动**；`__pass` 仅为
  分发兜底（engine.ts:99），不承载呈现语义，三节点必须各自落真实 handler。
- **形态沿 reply 同构**（handlers.ts:225-232）：消费输入 → `ctx.outputs.push` 汇入
  run 产物 → `emit('output',{text})` → 返回 `out` 摘要文本。**无出站请求、无新
  依赖、无新 env**（呈现是纯数据变换 + 事件转发；服务端**零抓取**——网页内容的
  获取是既有 http 节点职责，出站一律走 guard.ts 既有纪律，status quo）。
- **逐节点语义**：
  - webshow：输入为 http(s) URL → 校验通过原样透传呈现（outputs 收 URL，out 摘要
    「已呈现网页 · <url>」）；非 URL / 空输入 → warn + 占位降级（前端呈现「无有效
    网址」，不伪造结果）。
  - termview：上游全文（input）汇入 outputs + out 摘要「已呈现流 · N 字」；
    **流式增量零引擎改动**——node:delta 由上游流式节点（如 llm）经引擎既有通道
    发射，前端按节点 id 关联消费（§4.2）。
  - jsoncanvas：输入 JSON.stringify（对象/数组直序列化；字符串原样）汇入 outputs +
    out 摘要「已呈现 JSON · N 项」；序列化失败 warn + 原文降级。
- **handlers.ts 容量**：三 handler 合计约 30-40 行，298 → 约 330-340 行 ≤400 达标
  （AGENTS.md 硬性约定 4），推荐**并入 handlers.ts**（reply/notify sink 就近聚合
  先例）；回退案 = 新增 `apps/server/src/present.ts` 模块（沿 agent.ts 拆分论证，
  ADR-0013 §3 同款），若实施轮行数吃紧由实施 SPEC 定夺——两案均在授权面内。
- **契约测试联动**：handlers-coverage（HANDLERS⊇NODES，BK-0003 产物）随三键入列
  自动满足；smoke:server 各批扩断言（URL 校验/降级、全文汇入、序列化/降级路径）。

## 4. 画布渲染面定界（前端三文件 × 三形态）

前端三文件 = `apps/web/src/legacy/app.js` + `apps/web/src/app.css` +
`apps/web/src/Skeleton.tsx`；Skeleton 预期零改动（节点体动态渲染，无新静态骨架；
若需挂载点纯插入并重录 s0）。三形态均为**纯插入优先**（新选择器/新分支，不改既有
行——宪法第 4 条机械移植纪律的增面延伸）：

### 4.1 网页展示：iframe 安全呈现（安全面必答项）

- 呈现形态：节点体输出区按 DEFS 分支渲染 `<iframe>`（新选择器纯插入）；src = 输入
  端口值（优先）或 params.url。
- **iframe sandbox 属性方案（写死）**：默认 `sandbox`（空值最严：禁脚本 / 禁同源 /
  禁表单 / 禁弹窗）；params.sandbox=false 时移除属性（用户显式选择，责任翻转）。
  禁止 `allow-scripts + allow-same-origin` 组合（该组合等价于无 sandbox）。
- **协议白名单（写死）**：仅 `http(s):`；拒绝 `javascript:` / `data:` / 其他协议
  （前端校验 + §3 handler 侧双保险）。
- **服务端零出站边界（写死）**：本节点服务端不抓取、不代理、不转存网页内容——
  内容获取是既有 http 节点职责（出站走 guard.ts SSRF 守卫，status quo 零变化）；
  webshow 仅呈现 URL。CSP/外源嵌入策略的进一步收紧记为实施 SPEC 评估项。

### 4.2 终端只读流：等宽流式追加

- 呈现形态：节点体输出区渲染等宽多行滚动区（新选择器纯插入，`white-space:pre`
  类语义）；消费 node:delta（按节点 id 关联，追加/覆盖由上游语义定——llm 节点
  delta 为累积文本）+ node:done 定稿 + node:error 错误行；params.lines 裁旧、
  params.autoscroll 控滚动。**只读**：无输入框、无 stdin、无任何用户写入面。

### 4.3 JSON 画布：结构化树呈现

- 呈现形态：节点体输出区渲染缩进树/可折叠视图（新选择器纯插入）；数据源 =
  node:done.out 或 output 事件文本 → JSON.parse；parse 失败**如实降级**为原文
  等宽呈现 + warn（不伪造树）。params.expand 控默认展开层级、params.fmt 控缩进。

### 4.4 PTY 边界切割（×BK-0045，防混淆必答项）

终端只读流（termview）与 BK-0045 交互式 PTY 终端节点是**两个物种**，边界写死：

- termview = **只读呈现 sink**：消费既有 run 事件流（15 种内取用，§4.5），无用户
  输入面、零新依赖、零子进程、零新端点、零 shared 契约变更。
- BK-0045 PTY = 用户与 agent **共享 shell 会话**（node-pty 新依赖另批、
  ADR-0014 附录 A needs-approval 待批复）——专属面归 ADR-0014，与本链无涉。
- **实施护栏**：termview 实施轮严禁引入 node-pty/PTY 会话/用户输入通道；若实施
  期发现确需用户输入或进程面，即越出 issue#3 承继授权——立即中止转 needs-approval。

### 4.5 SSE 消费护栏（BK-0016 先例口径）

> 三节点的呈现消费在既有 15 种 SSE 事件内取用（events.ts:8-37；本链预期恰消费
> node:start / node:delta / node:done / node:error / output / log 若干种）；实施中
> 确需新增事件类型即触 POLICY 需批准区（packages/shared 契约变更），**立即中止转
> needs-approval issue，不得自主新增**（本 ADR 评估结论 = 无需新增）。

## 5. 分批修宪编排（一节点一迭代一 ADR 增补）

实施序 **BK-0036（webshow）→ BK-0037（termview）→ BK-0038（jsoncanvas，链终轮）**
（BACKLOG 拆分既定 + ROADMAP 待办节 BK-9003 链序列）；一节点一迭代，每批 = 一个
修宪轮（授权链 = issue#3 批复承继 + 本 ADR）+ 本 ADR 一次增补（状态行按
ADR-0010/0012 先例更新 + §7 对应行追加实施纪要）。每批受影响面**四件套**：

| 批 | ① NDP 定义 | ② 呈现承载 | ③ 前端三文件 | ④ gate 场景增量 | baseline/守卫 |
| --- | --- | --- | --- | --- | --- |
| 0036 webshow | nodes/webshow/{node.ts,README.md} + nodes.ts 一 import 一键 | handlers.ts webshow 键（URL 校验/降级） | iframe 安全呈现（§4.1） | 新场景 + s3 重录 | baseline 17→18；D===18；defs-drift +1；readme-consistency |
| 0037 termview | nodes/termview/{node.ts,README.md} + 同上 | termview 键（全文汇入；流式走既有 delta） | 等宽流式呈现（§4.2） | 新场景 + s3 重录 | baseline 18→19；D===19；defs-drift +1；readme-consistency |
| 0038 jsoncanvas | nodes/jsoncanvas/{node.ts,README.md} + 同上 | jsoncanvas 键（序列化/降级） | 结构化树呈现（§4.3） | 新场景 + s3 重录 | baseline 19→20；D===20；defs-drift +1；readme-consistency |

0037 建议（非硬性）随 0036 后实施以复用节点脚手架先例；0038 链终轮 CLOSE 时回执
issue#3 关单（中间子项不回执，沿 issue#10/11 终轮先例）。

## 6. golden 增量预案（双通道）

双通道口径 = ADR-0013 §6 直系样板：**新增场景走 golden-created 通道**（基线 png
不存在即落盘并记 golden-created 状态，gate.mjs:247-253）；**受波及既有场景经修宪轮
gate:update 重录**（迭代 0013 先例）。本 ADR 只列场景形态与波及面，不写 gate.mjs
代码（各实施 SPEC 定）。

- **每批一个新场景**（静态呈现态）：画布含该节点的工作流渲染态——output 类目色
  标题栏 + 复用键图标 + params widget 行 + 端口行（DEFS 通用渲染链自动承载）；
  webshow/termview/jsoncanvas 三场景形态同构、触发条件按节点差异化（实施 SPEC 定
  工作流注入方式，沿 s8-agent-node 预案形态，ADR-0013 §6）。**场景编号按落盘时序
  （预期 s10+）**——s8/s9 已由 ADR-0013 §6 预定（BK-0033/0034），BK-0046/0049 等
  穿插修宪项可能占号，不锁死具体号（ADR-0014 对 ADR 编号同款纪律）。
- **s3-library 每批必然受波及**：节点库 output 分组自动新增条目行（output 分组
  现占用 setvar/reply 两行 → 逐批 +1 至 5 行）——数据驱动像素变化，修宪轮重录。
- **s0/s1/s2/s4~s7 预期零波及**：无 rail/顶栏/默认工作流/面板变化，图标与类目色
  均既有常量——gate 全场景实测确认，任一意外红即中止排查。
- **路由 fixture 评估**：静态呈现场景无新增路由（沿 s8 预案）；termview 若需在线
  流式呈现场景 → RUN_ROUTES 先例（gate.mjs:181-184）评估，实施 SPEC 定夺。

## 7. BK-0036~0038 定界回写索引（权威字面量）

以下三个代码块 = BACKLOG 对应行**备注列的权威回写字面量**（BUILD 已逐字粘贴回写，
其余列含状态 proposed 逐字不动；回写随归档提交入库；VERIFY 以本节为 VERBATIM 比对
基准——BK-0027 VERBATIM-OK 标准）。晋升条件：BK-0035 CLOSE 后由 PLAN 轮晋升 ready
（三项同批可晋升，实施序仍按 §5）；BK-0038 链终轮 CLOSE 时回执 issue#3 关单。

```text
触UI=是——修宪轮（授权链 = issue#3 批复承继 2026-10-23T15:49:32Z + ADR-0015（§2.1 DEFS/§3 承载/§4.1 渲染与 iframe 安全面/§5 编排/§6 golden 预案），定界字面一致——ADR-0015 §7 本行即权威字面量）：受影响文件=packages/shared/src/nodes/webshow/{node.ts,README.md} 新增（NDP 目录制；node.ts 按 ADR-0015 §2.1 草案定稿：type=webshow/类目 output/icon globe（ICON_PATHS 既有键复用）/单入 in-url type any/输出空数组（sink 同构 reply）/params url(text,default '')+sandbox(toggle,default true)/binding handler=webshow + capabilities.data=true；终稿代码块归实施 SPEC，ADR 不预写）+ nodes.ts 聚合层 +1 import +1 键 + nodes.baseline.json 重产（16→17 键，经批准通道）+ 守卫/契约测试联动（nodes-dirs D===17、defs-drift +1、readme-consistency、handlers-coverage 随 handler 键自动满足）+ apps/server/src/handlers.ts 呈现承载（webshow handler 新键入 BASIC_HANDLERS，reply 同构 sink：URL 校验通过透传呈现、非 http(s) warn 如实降级；engine HANDLERS 展开（engine.ts:26-29）自动注册零改动）+ 前端三文件（app.js iframe 安全呈现（sandbox 属性 + 仅 http(s) 协议白名单 + 服务端零出站——抓取归既有 http 节点，ADR-0015 §4.1）+ app.css 新增选择器纯插入 + Skeleton.tsx 预期零改动）+ gate 场景增量（新场景 golden-created + s3-library 受波及修宪轮重录；场景编号按落盘时序，预期 s10+）；验收命令口径=npm run build + npm run gate（增量/重录后全绿、既有场景零波及实测）+ npm test + npm run smoke:server 扩断言（URL 校验/降级路径）+ 手动 E2E（节点库出现/拖入/连线/上游网址呈现点位，实施 SPEC 定）；依赖关系=前置 BK-0035（done，迭代 0029 ADR-0015 落盘）；实施序=BK-0036 → BK-0037 → BK-0038（一节点一迭代一 ADR 增补，ADR-0015 §5）；晋升条件=BK-0035 CLOSE 后由 PLAN 轮晋升 ready
```

```text
触UI=是——修宪轮（授权链 = issue#3 批复承继 2026-10-23T15:49:32Z + ADR-0015（§2.2 DEFS/§3 承载/§4.2 渲染与 SSE 流式消费/§4.4 PTY 边界切割/§5 编排/§6 golden 预案），定界字面一致——ADR-0015 §7 本行即权威字面量）：受影响文件=packages/shared/src/nodes/termview/{node.ts,README.md} 新增（node.ts 按 ADR-0015 §2.2 草案定稿：type=termview/类目 output/icon code（ICON_PATHS 既有键复用）/单入 in-stream type any/输出空数组（sink 同构 reply）/params lines(number,default 200,min 20,max 2000,step 20)+autoscroll(toggle,default true)/binding handler=termview + capabilities.data=true；终稿代码块归实施 SPEC）+ nodes.ts 聚合层 +1 import +1 键 + nodes.baseline.json 重产（17→18 键，经批准通道）+ 守卫/契约测试联动（nodes-dirs D===18、defs-drift +1、readme-consistency、handlers-coverage 随 handler 键自动满足）+ 呈现承载（termview handler 新键入 BASIC_HANDLERS，reply 同构 sink：上游全文 ctx.outputs 汇入 + out 摘要；流式增量由引擎既有 node:delta 通道承载零引擎改动）+ 前端三文件（app.js 等宽多行只读滚动呈现区（消费 node:delta/node:done，ADR-0015 §4.2）+ app.css 新增选择器纯插入 + Skeleton.tsx 预期零改动）；PTY 边界切割（ADR-0015 §4.4 写死）=只读呈现、无用户输入面、零新依赖零进程零端点，严禁引入 node-pty/PTY 会话（BK-0045 专属面归 ADR-0014 附录 A）；SSE 消费护栏=既有 15 种事件内取用，确需新增事件类型即中止转 needs-approval（BK-0016 先例）；gate 场景增量（新场景 golden-created + s3-library 受波及修宪轮重录；场景编号按落盘时序，预期 s10+）；验收命令口径=npm run build + npm run gate（增量/重录后全绿、既有场景零波及实测）+ npm test + npm run smoke:server 扩断言（全文汇入/摘要路径）+ 手动 E2E（流式呈现点位，实施 SPEC 定）；依赖关系=前置 BK-0035 done，建议随 BK-0036 后（复用其节点脚手架先例）；实施序=BK-0036 → BK-0037 → BK-0038；晋升条件=BK-0035 CLOSE 后随链晋升
```

> 实施纪要（BK-0037 · 迭代 0034；修复轮按 VERIFY 实测校正 BUG-002）：上方代码块已由
> 实施轮 SPEC 终稿消费（`docs/evolution/iterations/0034/SPEC.md` §2，字面一致）；golden
> 新场景落盘 `s10-termview-node`（golden-created 通道）；s3-library 实测**零波及免重录**
> ——节点库新增行（y≈1116–1177）落在 gate 视口 1600×900 之外且 #lib-list 无内部滚动，
> 两轮 gate s3 diffPx=0、基线零变更，gate:update 实际 **0 次**（≤1 合规）；守卫联动
> 计数 = 18 键 / 38 参数 / 僵尸 +2（param-handler-guard EXPECTED_ZOMBIES 增
> termview[lines,autoscroll]，服务端零参与前端呈现参数）。

```text
触UI=是——修宪轮（授权链 = issue#3 批复承继 2026-10-23T15:49:32Z + ADR-0015（§2.3 DEFS/§3 承载/§4.3 渲染/§5 编排/§6 golden 预案），定界字面一致——ADR-0015 §7 本行即权威字面量）：受影响文件=packages/shared/src/nodes/jsoncanvas/{node.ts,README.md} 新增（node.ts 按 ADR-0015 §2.3 草案定稿：type=jsoncanvas/类目 output/icon box-select（ICON_PATHS 既有键复用）/单入 in-data type any/输出空数组（sink 同构 reply）/params expand(number,default 2,min 0,max 6,step 1)+fmt(toggle,default true)/binding handler=jsoncanvas + capabilities.data=true；终稿代码块归实施 SPEC）+ nodes.ts 聚合层 +1 import +1 键 + nodes.baseline.json 重产（18→19 键，经批准通道）+ 守卫/契约测试联动（nodes-dirs D===19、defs-drift +1、readme-consistency、handlers-coverage 随 handler 键自动满足）+ 呈现承载（jsoncanvas handler 新键入 BASIC_HANDLERS，reply 同构 sink：输入 JSON 序列化 ctx.outputs 汇入 + out 摘要，非 JSON 输入 warn 如实降级原文呈现）+ 前端三文件（app.js 结构化树/折叠呈现（JSON.parse 失败如实降级原文，ADR-0015 §4.3）+ app.css 新增选择器纯插入 + Skeleton.tsx 预期零改动）+ gate 场景增量（新场景 golden-created + s3-library 受波及修宪轮重录；场景编号按落盘时序，预期 s10+）；验收命令口径=npm run build + npm run gate（增量/重录后全绿、既有场景零波及实测）+ npm test + npm run smoke:server 扩断言（序列化/降级路径）+ 手动 E2E（结构化数据呈现点位，实施 SPEC 定）；依赖关系=前置 BK-0035 done + BK-0036/0037 之后（链终收口）；实施序=BK-0036 → BK-0037 → BK-0038；晋升条件=BK-0035 CLOSE 后随链晋升；**本链终轮**——CLOSE 时回执 issue#3 关单（沿 issue#10/11 终轮先例，中间子项不回执）
```

> 实施纪要（BK-0038 · 迭代 0035，链终轮）：上方代码块已由实施轮 SPEC 终稿消费
> （`docs/evolution/iterations/0035/SPEC.md` §2，字面一致）；golden 新场景落盘
> `s12-jsoncanvas-node`（golden-created 通道，模拟运行 + 树渲染终态采集形态，§6
> 委托实施 SPEC 定）；s3-library 实测**零波及免重录**——节点库新增「JSON 画布」
> 条目落位 1600×900 视口折叠线下且 #lib-list 无内部滚动，gate s3 diffPx=0、基线
> 零变更；gate:update 实际 **0 次**（≤1 合规，三批链 0033/0034/0035 均未消费）；
> 守卫联动计数 = 20 键 / 42 参数 / 僵尸 +2（param-handler-guard EXPECTED_ZOMBIES 增
> jsoncanvas[expand,fmt]，服务端零参与前端呈现参数）。

### 7.1 BK-0036 实施纪要（迭代 0033 BUILD 轮增补，2026-10-25）

- **落地面**：`packages/shared/src/nodes/webshow/{node.ts,README.md}` 新增 + `nodes.ts`
  聚合 18 键（webshow 位于 setvar 后、approval 前）+ `nodes.baseline.json` 再生产
  **17→18 键**（快照 diff 恰 +1 键）+ 守卫/契约五文件计数联动（nodes-dirs D===18 /
  defs-drift 38 参数 / contract 18 / synthesis 序断言 +caps 回归锚 /
  readme-consistency 19 份）+ `param-handler-guard` 总数 38 且 **EXPECTED_ZOMBIES
  增 ['webshow',['sandbox']]**（sandbox 消费面在前端，服务端 handler 无语义——
  NDP §6.4 UI-only 僵尸口径；SPEC §6.5「两参数均被引用」与其自身 §4.1 伪码矛盾，
  BUILD 按机制语义落盘）+ `handlers.ts` webshow 键（reply 同构 sink：http(s) 白名单
  双保险正则 + 占位降级不伪造 + 服务端零出站）+ `app.js` 四处纯插入（WS_HTTP_S /
  webshowUrlOf / setNodeWebshow / node:done 一行 / RUN_META 一行）+ `app.css` 三
  新选择器纯插入 + smoke O 组 O01~O05 + gate s10 场景。
- **golden 双通道实测**：s10-webshow-node 走 golden-created 落盘；**s3-library 实测
  diffPx=0 零漂移、未走 gate:update 重录**——节点库面板在 900px 视口内只渲染到
  「逻辑」分组，输出分组（含新增「网页展示」条目与计数徽标）位于折叠线以下，新增
  条目不产生任何可见像素（SPEC §7.3 预期 s3 FAIL 的前提不成立；gate 全绿 →
  修宪轮「gate 失败时重录一次」通道前置不成立，通道未消费，比预期更保守）；
  其余 9 场景零漂移实测 diffPx=0；s10 基线落盘后经 webshowUrlOf 传参修复重建
  复测仍 diffPx=0（修复仅涉运行分支，静态渲染零变化），详见 iterations/0033/JOURNAL.md。
- **零溢出确认**：零新依赖 / 零新 env / 零新端点 / 零新增 SSE 事件（events.ts 零
  diff）/ 零新端口类型 / 零新 widget / 零新类目 / engine.ts·guard.ts·Skeleton.tsx
  零 diff；`sandbox` 属性仅空值或整体移除，全代码无 `allow-*` 令牌（§4.1 禁组合
  结构性排除）。

## 8. 影响面与不做范围

- **本轮（BK-0035）零代码 / 零依赖 / 零 env / 零出站 / 零 shared 契约 / 零 UI /
  零 golden**：本文件纯新增 + BACKLOG 三行定界回写（随归档提交）；`apps/**`、
  `packages/**`、`tools/**`、`tests/**`、`.github/**`、package.json / lock 零改动
  （机器证明 = 对上述路径 `git diff` 恒空；lock 零变化 = 零依赖）。
- BK-0036 / BK-0037 / BK-0038 是修宪实施轮（shared DEFS 新增 + 前端三文件 +
  golden 增量/重录面），按 §5/§6/§7 消费本 ADR；链晋升 ready 前不实施。
- BK-0039（SPEC 四连第四位）、BK-0033/0034（BK-9002 链实现段）、BK-0045（PTY，
  ADR-0014 射程）均不在本 ADR 射程；「新增端口类型/widget/类目」溢出冻结枚举的
  任何提案不在本 ADR 推荐案内（若实施轮确需，按需批准面另开 needs-approval）。
