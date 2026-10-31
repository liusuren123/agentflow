# PRD · 迭代 0075 · BK-0064 工具执行异常可观测性：llm.ts execute 包装器异常捕获 emit warn + 触发既有降级直生成轮（全工具族失败路径）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-31 · 隔离工作树 `feat/0075-iter`
> 来源：BACKLOG **BK-0064**（capability / **触UI=否** / P2 / **S** / ready，
> BACKLOG.md:85）——**0074 replenished 轮的承接实施轮**：迭代 0074 系 PLAN 补题
> 机制件轮（proposed→ready 晋升 + PRD 落盘，实施未发生），其 MERGE.md §6.1 移交
> 裁决明载「维持 ready 待后续心跳 BUILD（PRD §4 受影响文件清单 / §5 验收口径可
> 直接复用）」——本轮即该后续心跳，实施定界自 0074 PRD §4/§5 复用并按本轮现场
> 亲核刷新锚点（0072→BK-0065 同径先例）。
> 立项证据链不变：`iterations/0068/REPORT.md` §二 **BUG-0068-05**（Major，REPORT
> 修复选项 A 明文「另立 backlog 项」）+ 本轮代码现场亲核复核成立（§2）。
> **触UI=否——纯后端共享通道行为改写，非修宪轮**：零前端、零 packages/shared、
> 零 golden、零新依赖、零新增 env、零新增出站类别。POLICY 自主区（后端能力演进
> `apps/server/src/**` + 测试与回归基建 `tests/smoke/**` + 文档与实现同步 ADR 反写）。
> **全程禁 `npm run gate:update`**（宪法第 3 条；0069 BK-0020 / 0071 BK-0014 /
> 0073 BK-0018 同判先例）。
> **skipSpec=true**：S 项（非 doc、非触 UI）免独立 SPEC——受影响文件清单内嵌本 PRD
> §4，验收口径内嵌 §5。
> 回执口径：**sourceIssue 不设**（来源=T5 侦察立项链，非 issue 批复项；本轮档案
> approved 无，规则①零动作）；**itemContinues=false**（单件项、无姊妹子项、无批次
> 编排）；**reconstitutional=false**（非修宪轮，golden 零接触）。

## 0. 结论与分类（先行）

- **建议：做**（本轮项；outcome=selected 正常开工）。BK-0064 系 0068 轮 VERIFY
  第一手实证剥离立项（BUG-0068-05 Major），0068 REPORT §二修复选项 A 明文
  「另立 backlog 项——波及全部工具失败路径（llm.ts 共享通道），超出 BK-0018 申报面，
  不应在修复轮顺手做」；依赖前置已全部兑现——**BK-0018 已于迭代 0073 终态 done**
  （主干 smoke 203/0，iterations/0073/REPORT.md），BK-0064 行 0072 延后注「归
  BK-0018 收口后下一轮 PLAN 首选」的前提成立；迭代 0074 已完成晋升与 PRD 定界
  （replenished 收尾），本轮直接承接 BUILD——这是 0074 MERGE.md §6.1 移交裁决的
  指定路径，0072（BK-0065 维持 ready 待续）同径先例。
- **触UI 分类结论：否**。改动面 = `apps/server/src/llm.ts`（工具循环 execute 包装器
  + 降级触发）+ `tests/smoke/smoke-server.mjs`（MEM05 断言同批改写）+
  `docs/adr/0024-memory-tools-crossrun.md`（§4.1 BUG-0068-05 补记反写）。三处均不触
  视觉/DOM 结构/交互三层；`apps/web`、`packages/shared` 零触及——按宪法第 4 条
  不触发门禁红线，仍走常规 review。
- **非修宪轮**：全程禁 `npm run gate:update`；golden 零接触。gate 首跑若
  s3-library 出现 diffPx≈21~23 → 按 issue#12 在案口径复跑 + 双留档、以 CI 为权威，
  绝不重录（0068/0071/0072/0073/0074 连续同口径先例；0074 主干复测 21 场景首跑
  即绿，evidence/gate.log）。
- **单迭代承载**：无批次编排、无姊妹子项、无来源 issue。

## 1. 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-31 08:0x 核实）

1. **ready 队列亲核**：`awk -F'|' '/^\| BK-/ {print $8}' docs/evolution/BACKLOG.md
   | sort | uniq -c` 实跑输出 = **64 done / 1 ready / 6 skipped**；非终态过滤实跑
   恰 1 行——`BK-0064 状态=ready 类型=capability 触UI=否 优先=P2 大小=S 来源=T5`
   （BACKLOG.md:85）。ready 队列唯一项即本项，类型 capability 非 doc、可心跳
   入选；approved 项为零（见下）→ 规则①无 sourceIssue 可选，落规则②常规优先序。
2. **选题占位互斥核查**：`.zcode/locks/items/` `ls` 亲核**空**——无并行在途占用，
   无禁选项；派发提示未携带占位警告。BK-0064 本轮选为本轮项（占位 claim 归脚本
   BUILD 派发，0073 BK-0018 同机制）。
3. **批复档案**：approved 无 / rejected 无 → 规则①（批复解锁）零建行零解锁、
   规则③零 skipped 改写。issue 面板两项维持不动：
   - **#16**（BK-0014 扩展发现器 env 语义 ×2 + stdio 残余风险知悉，ADR-0023）：
     档案挂 needs-approval 标签，但 BACKLOG BK-0014 行（:113）已载用户
     2026-10-30T14:40:18Z 批复且 BK-0014 已于迭代 0071 终态 done（关单回执归
     脚本）——无既存门槛可解，零动作（面板标签滞后以 BACKLOG 终态注为权威）；
   - **#12**（CI 像素门禁 s3 亚像素抖动）：属 golden/pixel-gate/CI 需批准射程，
     未获批维持待批准，本轮不自主处理（0045~0074 连续同判先例）。
   二者均非 user-request，规则②零建行。
4. **侦察档案处置**（本会话复跑 `git grep -nE "not implemented|TODO|FIXME|XXX|HACK"
   -- apps packages` 实证，与派发档案一致）：残缺标记唯一实质项 =
   `apps/server/src/tools.ts:138` browser stub 返回 `{ error: 'not implemented',
   ... }`——系 ADR-0011 评估终态的**如实降级设计**（tools.ts:5 注释自证
   「"not implemented"，不伪造结果」），非缺陷不立项（0041~0074 连续同判在案）；
   `apps/server/package-lock.json:787` 系 integrity 哈希内 "XXX" 字符巧合误报
   （grep -c 实跑恰 1 处）非标记；悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/
   dogfooding 系治理日产物，心跳不重复采集。
5. **0074 移交承接**：`iterations/0074/MERGE.md` §6.1 明载「BK-0064 维持 ready
   待后续心跳 BUILD（PRD §4 受影响文件清单 / §5 验收口径可直接复用）」、§6.2
   「实施归后续心跳的 BUILD 轮」；metrics 0074 行 replenished 同口径。本 PRD =
   0074 PRD §3~§7 实施定界的承接转写（REQ 编号 0074→0075，锚点按本轮工作树
   现场亲核刷新，见 §2），内容语义零反转。

## 2. 背景与问题（证据现场复核，2026-10-31 本轮亲读）

**现状（改写前）**：llm 节点工具循环中，工具 impl 抛出的异常对用户**零可见**、
不触发任何降级通道：

- `apps/server/src/llm.ts:70-77`——execute 包装器内 `const res = await impl(a || {})`
  （:71）之后才执行 stub 判定与 pino 日志/🔧 emit（:72-75）；impl throw 时 :72-75
  全部跳过，异常直接离开包装器（本轮 Read 亲读复核，行号与 0074 PRD 一致）；
- AI SDK 7（ai@^7.0.0）平台行为：工具 execute 异常**不传播**至 `llm.ts:94-100`
  的 try/catch（该 catch 只接 generateText 自身传播异常，形态=「工具循环异常（…），
  降级为直接生成」warn + 无工具直生成轮 :97-99），而是把异常转为 **error
  tool-result 回灌模型**继续循环（0068 探针 S5 请求流实证：每 run 3 个携 tools
  工具轮）；
- 终态：3 轮预算耗尽（:82 `for(let round=1; round<=3; round++)`）→ `text=''` →
  run `ok:true` 收尾但 `out/value` 为**空串**——用户侧零错误提示、零 warn、零
  降级（0068 REPORT BUG-0068-05 现象段第一手实证：非法 key / value 超限两形态
  复现）；
- **系平台既有行为非 0068 引入**（既有任意工具 throw 同路径，此前冒烟从未测过
  throw 路径）；BK-0018 重试轮（迭代 0073）已把 MEM05 断言对齐到该现状（对齐
  现实属验收基建诚实化，非行为认可——本轮亲读 `tests/smoke/smoke-server.mjs:2622-2638`
  MEM05 块：断言「mock 请求增量恰 6（每 run 3 轮）+ 事件流零 🔧 工具调用行 + 零
  『工具循环异常』warn」，:2638 描述段自证「已按 BUG-0068-05 处置采 A 补记
  PRD/ADR 并另立 backlog 建议」）。

**问题本质**：错误被 SDK 静默化——模型能看到 error tool-result（有提示词经济性
损耗），运行日志与用户界面却零痕迹；「失败如实可见」是 AgentFlow 全链设计原则
（tools.ts:5 同精神），工具失败路径是其中唯一静默缺口。

## 3. 功能范围（改什么）

- **REQ-0075-01（execute 包装器异常捕获 + warn 可见）**：`llm.ts:70-77` execute
  包装器对 `impl(a)` 调用加异常捕获；捕获后 ① pino `ctx.log.warn` + `emit('log',
  { lvl:'warn', ... })` 各一行，msg 含**固定子串**（建议「工具执行异常」，实施定，
  须与 smoke 断言子串一致）+ 工具名 + 错误消息摘要（`preview` 形态沿 :75 先例）；
  ② 不得吞掉 `abort`（`ctx.ac.signal.aborted` 或 isAbort 时照旧 throw，:95 语义
  在降级路径同样保持）。stub 判定逻辑（:72）与正常路径 emit 形态逐字保留。
- **REQ-0075-02（触发既有降级直生成轮）**：捕获的工具异常须使该 run 走 `:94-100`
  既有「降级为直接生成」形态（无工具 `generateText` :97-99），使负例 run 不再
  以空文本静默收尾——用户获得模型直生成回复 + warn 日志。实现形态由 BUILD 定
  （技术约束见 §6）：AI SDK 7 会把包装器内重抛的异常转为 error tool-result 吞掉
  （0068 实证），**单纯重抛不可达降级**——须由包装器与循环层协作（如包装器
  返回结构化错误标记 + 循环检测后 break 出工具轮走降级，或等价机制），以实测
  现实为准。`ok:true` 安全核语义保持（降级直生成是既有正常收尾路径，负例不崩
  run 的 AC5 安全语义不变）。
- **REQ-0075-03（MEM05 断言同批改写 + ADR-0024 补记反写）**：
  - `tests/smoke/smoke-server.mjs` MEM05（:2622-2638）期望由「对齐静默现状」改写
    为「锚定新形态」：至少覆盖 warn 行可见（固定子串）+ 降级直生成轮发生 + run
    `ok:true` 不崩 + 负例零落库（token 域行数断言语义保持）+ 请求流新形态（请求数
    按实测现实对齐，须断言「不再是每 run 3 轮携 tools 循环」的降级特征）；头注
    MEM 描述段（:61-67）与 MEM 组节头注释（:2512 起）同步刷新。期望值以**新行为
    实测现实**为准（0068 选项 A「期望对齐实测现实」同方法，方向反转）。
  - `docs/adr/0024-memory-tools-crossrun.md` §4.1「【0068 VERIFY 修复轮
    BUG-0068-05 补记】」（:182-187，本轮亲读）反写：补注「迭代 0075（BK-0064）
    已改写——execute 异常现捕获 emit warn 并触发降级直生成轮，静默回灌不再是
    可观测终态」（措辞实施定；不删 0068 历史补记原文，追加反写注即可，ADR 历史
    不重写纪律）。
- **不做范围（out of scope）**：不动 `apps/server/src/memory/tools.ts`（负例校验
  逻辑仍 throw——它是负例来源，校验语义零变化）；不动 `tools.ts`（stub 判定与
  stub warn 语义不变）；不动 `mcp/**`（工具连接/发现/注入面零触及）；不新增
  env/依赖/出站类别/shared 事件；不动纯流式分支（:102-120，无工具路径零波及）；
  不做「工具重试」语义（那是 BK-0048/ADR-0022 引擎级 on-error 的既有面，勿混）；
  不动 :94-100 catch 的既有行为（generateText 传播异常路径原样保留）。

## 4. 受影响文件清单（S 项 skipSpec 内嵌 · productFiles 白名单）

| # | 文件 | 改动 | 预算 |
| --- | --- | --- | --- |
| 1 | `apps/server/src/llm.ts` | :70-77 execute 包装器 try/catch（warn emit + 降级触发协作标记）+ :82-93 循环层检测逻辑（形态 BUILD 定） | ±20 行内（现 139 行，仍 ≤400） |
| 2 | `tests/smoke/smoke-server.mjs` | MEM05 期望块（:2622-2638）改写为新形态锚定 + 头注 :61-67 与 :2512 起节头 MEM 描述段刷新 | ±25 行内 |
| 3 | `docs/adr/0024-memory-tools-crossrun.md` | §4.1 BUG-0068-05 补记（:182-187）后追加迭代 0075 反写注 | +2~4 行 |

机制件（不入 productFiles、随机制件提交）：`docs/evolution/iterations/0075/PRD.md`、
`docs/evolution/BACKLOG.md`（BK-0064 行 0075 选题注，本轮 PLAN 已写）、
`docs/evolution/STATE.md`（工作树过程态，不随分支合入主干）。

**验收命令口径**：`npm run build` + `npm run gate`（纯回归面，零 gate:update）+
`npm test` + `npm run smoke:server`（MEM05 新期望 + MEM01~MEM07/M02 既有零回退，
基线 203/0）；改动面机器证明见 §5 REQ-0075-05。

## 5. 验收标准（Given / When / Then）

- **REQ-0075-01（负例可观测——warn 可见）**
  - Given 工具 impl throw（MEM05 负例：memory set 非法 key / value 超限两形态，
    或等价负例工具）；When 该 run 执行；
  - Then run 日志含 **warn 级**工具执行异常行（pino lvl=warn + SSE log 事件
    lvl=warn 双路），msg 含固定子串 + 工具名 + 错误摘要；冒烟对该子串断言命中。
- **REQ-0075-02（降级直生成轮发生）**
  - Given 同上负例 run；When 工具循环遭遇捕获的工具异常后；
  - Then run 走既有降级直生成形态（无 tools 的 `generateText` 调用发生——请求流
    实证，非仅日志措辞）；run 以 `ok:true` 收尾**不崩**（安全核语义保持）；
    `out/value` 为降级轮模型直生成文本（不再必然为空串）；`node:delta` 事件按
    既有工具循环分支形态发出（:101）。
- **REQ-0075-03（abort 不吞）**
  - Given run 中止（`ctx.ac.signal` aborted）；When 工具调用被中断抛出 abort 形态
    异常；
  - Then 不降级、异常照旧向上传播（:95 既有语义在新增路径保持）；smoke 既有
    abort/停止面（V 组/停止透传 A04 等）零回退。
- **REQ-0075-04（正例零回归）**
  - Given 正常工具调用（stub 与真实 impl 两态）与 MEM01~MEM07/M02 全套件；
  - When MEM05 改写后全量 `npm run smoke:server`；
  - Then 既有断言零回退（stub warn 形态 :72-75、🔧 行、🧠 注入、capabilities
    零污染、env fail-fast 全部原样绿；基线 203/0 不回退）；MEM05 新期望全绿。
- **REQ-0075-05（改动面机器证明 + 门禁全绿）**
  - Given 本项白名单恰 §4 三文件；
  - When 实施完成后在工作树内实跑门禁；
  - Then ① 产品面 `git diff` 恰 §4 三文件；② 禁区
    `git diff -- packages/shared apps/web tools/pixel-gate tests/golden .github package.json package-lock.json`
    恒空（零 shared/零前端/零 pixel-gate/零 golden/零 CI/零依赖机器证明）；
    ③ `npm run build` ✓ + `npm run gate` 全绿（基线 21 场景 diffPx=0、**零
    gate:update**；s3-library 若现 diffPx≈21~23 本机采样抖动，按 issue#12 在案
    口径复跑 + 双留档，绝不重录）+ `npm test` 30/30 + `npm run smoke:server`
    全绿且 MEM05 新断言命中。
- **REQ-0075-06（ADR-0024 补记反写）**
  - Given §4.1 既有 0068 补记（:182-187）描述静默回灌现状；
  - When 本项实施后；
  - Then 补记处追加迭代 0075 反写注（0068 原文保留不删）；文中不再支持「静默
    回灌仍是现状」的误读。

## 6. 非功能要求与技术约束

- 零新增源文件、零 env、零依赖、零出站、零 shared 契约、零前端、零 golden；
  非修宪轮全程禁 `npm run gate:update`。
- **AI SDK 7 行为硬约束**（0068 探针 S5 + ADR-0024 §4.1 补记实证；本轮
  smoke-server.mjs:2622-2638 MEM05 注释同载）：execute 内 throw 的异常被 SDK
  转为 error tool-result 回灌、**不传播**到循环 try/catch——降级触发不能依赖
  「重抛后指望 catch 接住」，须包装器/循环层协作（标记位、返回结构化错误对象、
  或等价机制），BUILD 以最小侵入实现并留 JOURNAL 说明机制。
- 降级 warn 行子串须与 smoke 断言子串一字不差（两文件同批改，防漂移；MEM 套件
  标记词尾冒号纪律沿 BUG-0068-06 教训——新增标记词若入 token 域须带尾冒号）。
- 触UI 判定复核：llm.ts/smoke/ADR 均非渲染因果文件，`apps/web`/`packages/shared`
  零触及——按宪法第 4 条不触发门禁红线，仍走常规 review。
- 与在途并行轮零交集：本轮无并行工作流在途（占位锁亲核空）；BK-0018 链已收口
  （迭代 0073 done），本项为其后唯一负例行为改写者（BACKLOG 行依赖注兑现）。

## 7. 风险与移交

- **风险 1（降级语义边界）**：工具异常触发降级后，负例 run 的 out 从「空串」变
  「模型直生成文本」——对下游端口消费者是行为变化（正向改进，但 MEM05 与依赖
  空 out 形态的断言须同批对齐）；若 BUILD 实测发现请求流形态与 §5 预期不符
  （如 SDK 请求计数差异），以实测现实对齐断言并留 JOURNAL，不硬编推算值。
- **风险 2（warn 子串漂移）**：llm.ts 与 smoke-server.mjs 两处子串须一字不差，
  VERIFY 亲核两文件字面一致。
- **风险 3（锚点时点性）**：本 PRD 行号锚点为 2026-10-31 工作树现场值；若 BUILD
  前主干另有并轨致偏移，按「代码现状 > 本 PRD」顺位以实施时点实况转写并留
  JOURNAL（0027/0029 先例），语义零反转。
- **移交 SPEC**：免（skipSpec=true，§4/§5 即实施定界）。
- **移交 VERIFY**：逐条执行 §5 六条 GWT + MEM 套件全量 + 禁区机器证明 + 反演
  抽查（临时摘除包装器 catch → MEM05 复红 → 还原复绿，沿 0014/0026 反演先例）。
- **移交 CLOSE**：来源非 issue，无回执义务；issue#16/#12 维持待批准不动；
  BK-0064 终态记账归 CLOSE（本项 ready 状态即本项进行中；done 由 CLOSE 依
  VERIFY 结果回写主干）。
