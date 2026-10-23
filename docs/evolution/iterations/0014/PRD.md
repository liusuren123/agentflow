# PRD · 迭代 0014 · BK-0022 BUG-0012 修复：code 节点 lang 切 JavaScript 后默认码错配的后端兜底

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 04:58
> 来源：BACKLOG BK-0022（P1 / debt / S / ready / 触UI=否，来源主题 T3；2026-10-23
> 治理日立项——dogfooding 实跑发现的 BUG-0012 Major 缺陷）。
> 主题归属：ROADMAP T3·后端执行能力（`ROADMAP.md:84-86` 补充条目明载「后端兜底方案
> （POLICY 自主区），P1/S/ready，证据链见 BACKLOG 备注」）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 04:4x~04:58 核实）：
> ① **批复项无新动作且现存批复项全部顺延**——档案「approved：无」与 BACKLOG 实况一致
> （#1~#5/#7/#8 七项批复已于 0011 轮全部落 ready，其中 BK-0026/BK-0025/BK-9001 已于
> 0011/0012/0013 相继 done 归档）；余下批复项 BK-9002~9005（P0）**均为 L 级且前置未竟**
> ——BK-9002/9004 前置 BK-0016（会话 API，ready 未做）、BK-9003/9005 前置 BK-0021
> （NDP 迁移，proposed 且 POLICY 从严需先开 needs-approval），ROADMAP T5-M3 明载
> 「先迁移后扩展，不得跳过」、各 BACKLOG 行备注「L 项先拆分再实现」；心跳直接抓取
> 即夹带拆分、违反「一次迭代只做一件事」（0011 PRD 头部 (c) 论证在案）→ 顺延，
> 拆分排序归治理日。② user-request #9 **不建行**（见 §选题过程存证）。③ rejected 无。
> ④ **常规选题取 BK-0022**——批复项顺延后的最高优先 ready 队首（P1/S，非 doc，
> 非触 UI）：同优先级内 S 优于 M（BK-0016/BK-0017 均 P1/M），且 ROADMAP 待办
> （2026-10-23 治理日）与 STATE 0013 轮 last_result 均将 BK-0022 列为非修宪 ready
> 表首。与最近 3 次迭代重叠面核对：0013=apps/web 三文件 + gate.mjs + tests/golden
> s6/s7 + docs/adr（零重叠）；0012=tests/smoke/shutdown-sigterm.mjs 新增 + ci.yml +
> package.json（零重叠——本轮 smoke 改的是 smoke-server.mjs，不同文件）；0011=
> tools/pixel-gate + tests/golden s4/s5 + docs/adr（零重叠）。handlers.ts 上次触碰
> 为迭代 0009（llm/tools stub 显式化），本轮 code handler 改动与其正交。

## 结论

**建议做（本迭代即做）**：一句话理由——用户在画布上把 code 节点语言下拉切到
「JavaScript」（前端仅写 `n.params.lang`，代码框不动，`app.js:1029-1035`），代码框
从未编辑时引擎按 DEFS 默认合并出 `lang=JavaScript` + **Python 样例码**组合
（`engine.ts:38` + `nodes.ts:61-62`），JS wrapper 把样例首行 `#` 注释按函数体语法
执行即 SyntaxError（`code.ts:13-31`），退出码非 0 → 整个 run 必失败（`code.ts:61`）
——这是 dogfooding 实跑发现的 Major 缺陷（BUG-0012）：零代码改动的默认操作序列
（只切一次语言下拉）必然产生必挂的工作流。本迭代在后端 handler 层做窄口径兜底
替换（POLICY 自主区 bug 修复），零 UI / 零 DEFS / 零新依赖，S 尺寸一轮可完。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为 `apps/server/src/handlers.ts`（code handler 执行前的错配检测与替换 +
   log emit）与 `tests/smoke/smoke-server.mjs`（冒烟断言）；`apps/web/**`、
   `tools/pixel-gate/**`、`tests/golden/**`、`packages/shared/**` 零字节改动——
   视觉 / DOM 结构 / 交互三层与 golden 基线均不接触，`npm run gate` 8 场景为
   纯回归面（AC5）。
2. POLICY 校验：bug 修复（不触 UI、不改 shared 契约）＋测试基建——自主区，
   无需 needs-approval issue。
3. **DEFS 不动**：`lang`/`code` 参数定义、默认值、选项表零变化（`nodes.ts:58-63`
   逐字保留）；兜底是**运行时执行层**行为，不进注册表。前端联动修复（切语言时
   代码框联动换样例）触交互层，已由 2026-10-23 治理日追评并入 issue #6（BK-9006
   追加条目），本迭代明确不做。

## 背景（代码事实源，2026-10-24 04:4x~04:58 本会话只读核实）

1. **缺陷链五环（逐环亲读在案）**：
   - **DEFS 默认值**：code 节点 `lang` combo `['Python','JavaScript']` 默认
     `'Python'`；`code` textarea 默认 Python 样例
     `'# 处理输入后返回\nresult = input\nreturn result'`（`packages/shared/src/
     nodes.ts:61-62`）。
   - **前端无联动**：属性面板 change 处理器对任意参数键直写 `n.params[k]`
     （`apps/web/src/legacy/app.js:1029-1035`）——切 `lang` 只写 lang，`code` 保持
     未设置（用户从未打开/编辑代码框）。
   - **引擎默认合并**：`P(n) = { ...paramsDefaults(n.type), ...(n.params||{}) }`
     （`apps/server/src/engine.ts:38`；`paramsDefaults` 来自 shared 单一事实源
     `paramDefaultsOf`，`engine.ts:12,24`）→ 合并结果 `lang='JavaScript'` +
     `code=Python 样例`。
   - **handler 直传**：`runUserCode(p.lang || 'Python', p.code || '', ...)`
     （`apps/server/src/handlers.ts:99`）。
   - **JS wrapper 语法炸点**：`lang==='JavaScript'` 分支把用户码原样嵌入函数体
     （`apps/server/src/code.ts:13-31`，:16 body 拼接、:26-28 函数体包裹）；Python
     样例首行 `#` 在 JS 中非注释即非法 token → SyntaxError → 子进程退出码非 0 →
     `reject`（`code.ts:61`）→ 整个 run 失败。
2. **可行兜底点**：handler 已具备 `emit`（`handlers.ts:96` 解构 `{ p, input, vars,
   emit }`，:100/:115 既有 `emit('log',...)` 先例）；DEFS 默认样例可经
   `paramDefaultsOf('code')` 取得（`engine.ts:12,24` 同源 import 先例），**不得在
   handlers.ts 复制第二份样例字面量**（AGENTS.md 硬性约定 2：唯一来源 shared）。
   JS 等价样例为 `'// 处理输入后返回\nresult = input\nreturn result'`（与 Python
   样例语义一致：处理输入后返回；wrapper :25 已声明 `let result;`、:16 显式
   return 优先生效，语义闭合）。
3. **反向组合不存在**：DEFS 只有一个默认样例（Python 串）——「lang=Python +
   JS 码」不可能经默认合并产生；用户手输的任何码（含逐字手打 Python 样例 +
   lang=JavaScript 的极端情形）一律**不猜测语言**（BK-0022 行备注口径），只做
   「逐字等于默认样例」的窄匹配，误伤面 = 用户刻意手打了与默认样例逐字相同的串
   且同时错配语言，该情形兜底替换后行为仍为「执行成功」，可接受。
4. **gate 现状口径更正**：BACKLOG BK-0022 行备注写「gate 4 场景全绿」系 2026-10-23
   立项时口径；迭代 0011 扩 s4/s5、0013 扩 s6/s7 后现为 **8 场景**
   （`tools/pixel-gate/gate.mjs:177-186` 本会话实查 s0~s7），本 PRD 验收以 8 场景
   为准。
5. **冒烟挂接点**：`tests/smoke/smoke-server.mjs`（346 行）既有 SSE run 基座
   （`openSse` + `waitFor` 事件等待 + `Checker` 分组断言，:172-208）；夹具区约定
   「params 显式给出，不依赖 DEFS 默认值」（:14）——**本项断言刻意破例**：缺陷
   本体正是「不显式给 code 时默认值合并错配」，新夹具必须只给 `lang` 不给 `code`
   （PRD 显式豁免该约定，防止后续维护者"修复"夹具）。
6. **竞品对照**（product-manager.md 职责 2）：ComfyUI 无代码执行节点对应物
   （其自定义节点走 Python 扩展安装路径）；n8n「Code」节点切换语言时代码框
   模板**联动切换**——那正是前端联动方案（issue #6 追加条目，触 UI 待批准）。
   本项后端兜底刻意偏离该形态：不改冻结 UI 的前提下先消除「必挂」后果，联动
   体验留给修宪轮。

## 目标

1. **兜底替换**：code handler 执行前检测「lang 与 DEFS 默认样例语言错配且 code
   逐字等于默认样例」→ 替换为对应语言等价样例并 emit log 告知（固定可断言子串）。
2. **窄口径**：任何其他组合（用户自定义码、lang=Python、码非默认样例字面量）
   行为与现状逐字一致，零替换零告知。
3. **证明**：冒烟新增断言锁定正路径（替换后执行成功）+ 反演（摘除兜底 → 复现
   必挂）双向；契约测试与 gate 零变化回归。

## 非目标（out of scope）

- **不做前端联动**（切 lang 时代码框样例联动替换）：触交互层，归 issue #6
  （BK-9006 追加条目，2026-10-23 治理日已追评），批准前零实现。
- **不改 DEFS**：`packages/shared/src/nodes.ts` 零改动（含 per-lang 默认值方案——
  该方案触需批准区 + 契约断言改写，BK-0022 行备注已否决）。
- **不做语言猜测 / 码内容启发式解析**：只做逐字等于默认样例的匹配
  （「不猜测用户代码语言」立项口径）。
- **不动 wrapper 执行协议**（`code.ts` 零改动）：子进程 + 5s 超时 + stdin/stdout
  协议原样；兜底发生在 handler 层，wrapper 收到的已是合法码。
- **不处理离线模拟器同款错配**（前端单节点执行模拟路径）：归 issue #6 追加条目。
- **不做反向替换**（lang=Python + JS 码）：默认合并不可能产生（背景 3）。
- 不更新 ROADMAP / metrics 状态（CLOSE 职责）。

## 用户故事

1. 作为工作流作者，我在 code 节点上把语言切到 JavaScript（还没写任何代码），
   点击运行，我期望得到与 Python 默认样例等价的「执行成功」，而不是一条
   SyntaxError 把整个 run 打挂。
2. 作为工作流作者，我写了自定义 JavaScript 代码时，系统不得擅自改动或替换我的
   代码（哪怕它碰巧长得像默认样例以外的任何东西）。
3. 作为 test-manager，未来任何改动破坏这条兜底路径（回归回必挂）时，我需要
   `npm run smoke:server` 直接红，而不是重新 dogfooding 才发现。
4. 作为宪法主权者，我期望本轮零 UI/零 DEFS/零 golden 接触——前端联动这种
   「正确」方案留给待批准的 issue #6，本轮只做不触宪的后端修复。

## 需求条目

- **REQ-0022-01 · 错配检测与兜底替换（handlers.ts code handler）**：执行
  `runUserCode` 前检测：`p.lang === 'JavaScript'` 且 `p.code` **逐字等于** DEFS
  code 默认样例（Python 串，经 `paramDefaultsOf`（`@agentflow/shared`，
  `engine.ts:12,24` 同源）取得，禁止本地复制字面量）→ 将传入 `runUserCode` 的码
  替换为 JS 等价样例 `'// 处理输入后返回\nresult = input\nreturn result'`
  （此串为本轮新增执行层常量，非 DEFS 复制——DEFS 无 JS 样例），并
  `emit('log', { lvl:'warn'|'info', msg: <含固定子串的替换告知> })`——告知文案
  须含稳定可断言子串（建议「默认样例与所选语言不匹配，已替换为等价样例执行」，
  BUILD 定稿字面量并同步冒烟断言）。不命中条件时**零行为变化**（不 emit、
  不替换、透传原值）。
- **REQ-0022-02 · 冒烟断言（smoke-server.mjs）**：新增夹具 `WF code 节点
  { type:'code', params:{ lang:'JavaScript' } }`（**刻意不给 code**，豁免
  :14 夹具约定，PRD 背景已论证）→ `POST /api/v1/run` SSE 执行 → 断言：① run
  正常完成（`run:done` 到达、code 节点 `node:done` 而非 error）；② 事件流含
  REQ-0022-01 告知 log 子串；③ 该节点 `out` 为执行成功类文案。挂接位沿既有
  分组惯例（W/D/E 组之后、C 组清理前，SPEC 免除——按 BUILD 现场最小侵入挂接）。
- **REQ-0022-03 · 契约与 DEFS 零变化**：`packages/shared/**`（含
  `packages/shared/test/` 契约四文件 contract / defs-drift / events-negative /
  handlers-coverage）零改动；`npm test` 全绿。
- **REQ-0022-04 · 改动面白名单**：产品提交 git diff 仅允许——
  `apps/server/src/handlers.ts`、`tests/smoke/smoke-server.mjs` 两处；其余任何
  路径零改动（AC5 机器核对）。
- **REQ-0022-05 · 回归口径（8 场景）**：`npm run gate` 8 场景（s0~s7，
  `gate.mjs:177-186`）全绿——BACKLOG 行备注「4 场景」为立项时旧口径，以本条为准。

## 非功能要求

1. **窄口径确定性**：判定只依赖两个字符串的逐字相等（shared 单一来源默认样例 ×
   合并后 p.code），无正则、无启发式、无语言探测。
2. **规模**：handlers.ts 增量 ≤ 25 行（检测 + 常量 + emit）；smoke-server.mjs
   增量 ≤ 40 行（夹具 + 断言）；两文件现 244 / 346 行，增量后远低于 400 行上限。
3. **零新增依赖 / 零新增 env / 零出站请求**（替换逻辑纯内存字符串操作）。
4. **可审计**：BUG-0012 证据链（BACKLOG BK-0022 备注 + 本 PRD 背景五环 +
   REPORT 反演记录）构成闭环。

## 验收标准（Given / When / Then）

- **AC1 · 兜底生效**：Given 已构建后端（`npm run build:server` 前置含 shared），
  code 节点 `params = { lang:'JavaScript' }`（code 未设置，走 DEFS 默认），When
  经 `POST /api/v1/run` SSE 执行，Then run 正常完成——`run:done` 到达且 code
  节点为 `node:done`（无 error 事件），SSE 事件流含替换告知 log 固定子串，
  节点 `out` 为「执行成功」类文案（`handlers.ts:104` 口径）。
- **AC2 · 保护力反演**：When（VERIFY 演练）临时摘除兜底替换逻辑（还原为直传
  `p.code`）重建后重跑 AC1 夹具，Then run 失败——code 节点 error（JS 退出码非 0，
  `code.ts:61` 路径）；还原兜底重建后复绿。证明 AC1 非恒真且锁定的正是 BUG-0012
  缺陷路径；演练后 `git status` 干净。
- **AC3 · 不误伤**：Given code 节点 `lang='JavaScript'` 且 `code` 为用户自定义
  串（≠ DEFS 默认样例字面量），When 执行，Then 零替换、无告知 log、执行行为与
  现状一致（自定义 JS 码本就正常执行）；Given `lang='Python'`（默认）任意码，
  When 执行，Then 零替换零告知（默认路径回归）。
- **AC4 · 契约与 DEFS 零漂移**：When 核对产品提交 git diff，Then
  `packages/shared/**` 零改动（DEFS 与契约测试四文件均在射程内一并核）；
  `npm test` 全绿。
- **AC5 · 白名单与全量回归**：When 核对产品提交 git diff，Then 仅
  REQ-0022-04 白名单两文件；`npm run gate` 8 场景全绿（s0~s7）+
  `npm run smoke:server` 全绿（既有断言零回退 + AC1/AC3 新断言通过）。

## S 项免 SPEC：内嵌受影响文件清单与验收口径（skipSpec=true）

BK-0022 为 S 项（非 doc、非触 UI），按 WORKFLOW §4 免独立 SPEC，受影响文件清单
与验收口径以本 PRD 为准：

| 文件 | 动作 | 内容 |
| --- | --- | --- |
| `apps/server/src/handlers.ts` | 修改（code handler，:96-105 区段） | REQ-0022-01：错配检测（`paramDefaultsOf` 取默认样例逐字比对）+ JS 等价样例替换 + 告知 log emit；增量 ≤ 25 行 |
| `tests/smoke/smoke-server.mjs` | 修改（夹具区 + 断言主体挂接） | REQ-0022-02：`lang:'JavaScript'` 不带 code 夹具 + SSE 断言（run 完成 / 告知子串 / out 文案）+ AC3 不误伤对照；增量 ≤ 40 行 |

验收命令口径：AC1/AC3 = `npm run build:server && npm run smoke:server`（新断言
全过、既有 50+ 断言零回退）；AC2 = 反演演练（摘除兜底 → `npm run build:server`
→ 重跑冒烟 AC1 夹具断言 FAIL → 还原重建复绿，演练后 `git status` 干净）；
AC4 = `git diff` 核对 packages/shared 零改动 + `npm test` 全绿；AC5 =
`git diff` 白名单核对 + `npm run build && npm run gate`（8 场景）+
`npm run smoke:server` 全绿。

## 依赖与风险

- **依赖**：`npm run build:server`（冒烟 spawn 对象）；shared 现有导出
  `paramDefaultsOf`（`engine.ts:12` 先例，无新导出）。零新 npm 依赖。
- **风险 1 · 告知文案与断言子串漂移**：BUILD 定稿字面量须同步冒烟断言（同一
  提交内闭环）；PRD 建议子串仅作锚点。
- **风险 2 · 夹具豁免被后续维护"修复"**：新夹具不给 code 刻意违反 :14 约定——
  夹具旁须注释标明「BUG-0012 缺陷本体即默认值合并路径，勿补 code 参数」。
- **风险 3 · emit 级别选择**：warn（提示潜在用户操作误区）或 info（正常兜底）
  皆可，BUILD 定稿；不影响断言（冒烟按子串不按级别断言，级别不进契约）。
- **风险 4 · 极端误伤**（用户手打串与默认样例逐字相同 + 语言错配）：兜底后行为
  为执行成功，与用户意图（大概率就是想要样例）一致，可接受（背景 3 已论证）。

---

## 选题过程存证

- **批复栏「approved：无」处置（规则①）**：与 BACKLOG 实况一致——七项批复
  （#1~#5/#7/#8）已于 0011 轮全部落 ready 且其中三项（BK-0026/BK-0025/BK-9001）
  已 done 归档；**本轮无新批复需落行**。现存批复 ready 项 BK-9002~9005（P0/L）
  全部顺延：前置未竟（BK-0016 ready 未做、BK-0021 proposed 且需先开
  needs-approval）+ 「L 项先拆分再实现」+「一次迭代只做一件事」，拆分排序归
  治理日（0011 PRD 头部 (c) 与风险 5 论证在案，本轮沿用）。
- **user-request #9——不建行（规则②例外，沿 0011/0012/0013 三轮先例）**：#9 系
  循环以 🤖 前缀开的**通知 issue**（请用户亲改 AGENTS.md——POLICY 禁止区仅用户
  可改，判定顺序「先查禁止区」）；三处修复用户已亲改在库（本会话经系统注入的
  现行 AGENTS.md 核对：仓库地图 `docs/evolution/` 行与
  `docs/frontend-module-boundaries.md` 行、常用命令表 `smoke:server`/
  `test:canvas` 两行均在位），issue 待用户自行确认关闭。禁止区工作无执行主体，
  建 proposed 行不成案。
- **rejected：无（规则③）**——无处置。
- **残缺标记档案**（`tools.ts:5,82` stub 如实降级）与**悬挂 run 探针**
  （161ce4ff running 1 条，智能客服助手）：均已知状态——前者 BK-0005 done +
  M07 断言守护 / BK-0008 ready 承载，后者 BK-0011 ready 承载；无新项，不重复立项。
- **选题（规则④）**：BK-0022（批复项顺延后最高优先 ready 队首：P1/S、非 doc、
  非触 UI；ROADMAP 待办与 STATE 0013 last_result 均列其表首）。次序参考：
  BK-0016/BK-0017（P1/M，BK-0016 为两项 P0 修宪前置，建议下轮优先评估）→
  BK-0011（P2/S）→ BK-0008（P2/M）。
- **skipSpec 判定**：S 项 + 非 doc + 非触 UI + 非修宪轮 → 免独立 SPEC，本 PRD
  内嵌清单与口径（见 §S 项免 SPEC 节）。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE 全文
  read；iterations/0011/0012/0013 PRD 全文 read（0010 无目录，git 历史在案）；
  `packages/shared/src/nodes.ts:50-79` read（code DEFS :58-63）；`app.js:1022-1041`
  read（change 直写 params）；`engine.ts:12,24,28-47` read（默认合并 :38）；
  `handlers.ts:1-30,85-119` read（code handler :96-105、emit 先例 :100/:115）；
  `code.ts` 全文 read（JS wrapper :13-31、退出码拒绝 :61）；`gate.mjs:177-186`
  grep（8 场景在案）；`smoke-server.mjs:14-133` read（夹具约定 :14、SSE 基座
  :172-208）；`package.json:10-24` read（脚本表）；契约四文件 ls
  （packages/shared/test/）；wc -l：smoke-server.mjs 346 / handlers.ts 244。
