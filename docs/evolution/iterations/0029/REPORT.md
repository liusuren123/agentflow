# REPORT · 迭代 0029 · BK-0035 呈现三件套节点分批修宪 ADR 草案 SPEC 先行（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 13:42
> 输入：`PRD.md` AC1~AC7（S 项 skipSpec——验收口径内嵌 PRD §7）+ `JOURNAL.md`
> 移交说明（含 §3.1 行号偏移 / §3.2 行数预算两处偏差提请裁定）。
> 环境：Windows（win32 10.0.26300）· Node v24.21.0 · HEAD = 6c87c85 ·
> 工作区含本迭代未提交产物（产品提交按工作流机制归脚本统一执行——
> `.zcode/workflows/evolution-iteration.dwf.ts` VERIFY 先于产品提交时点）。

## 0 · 总结论

**PASS（7/7 AC 全过，零缺陷，无需修复轮）。** 纯文档轮兑现：产品面恰
`docs/adr/0015-presentation-triplet-nodes.md` 一文件纯新增（**260 行** ≤400、
恰在 PRD 建议区间 260±60；UTF-8 无 BOM 纯 LF），七要素成节可索引、草案双位
标注 + 授权链 issue#3 批复 2026-10-23T15:49:32Z（gh api 亲核用户本人评论时间
戳逐字一致）；DEFS/承载/渲染/编排/预案 20+ 代码锚点与代码逐一相符**无一杜撰**
（含 JOURNAL §3.1 六处行号偏移按代码事实的 ADR 转写复核）；BACKLOG
BK-0036/0037/0038 三行备注与 ADR §7 三段权威字面量**逐字全等（VERBATIM OK ×3，
node 脚本 trim 后全等亲跑，长度 1284/1354/1222）**，状态列 proposed 不动、
BK-0035/BK-9003 行零触碰；`apps/packages/tools/tests/.github/package*.json`
禁区 diff 恒 0 字节（零代码/零依赖机器证明）。针对性 E2E：smoke:server 亲跑
**95 passed / 0 failed**（基线零漂移、V09 时点性假红未出现）+ test:canvas
**15 passed / 0 failed** + 浏览器交互回归抽查通过（节点库 7 类目/16 节点与
0027/0028 先例一致且 live 佐证 ADR §6「output 分组两行」、画布缩放
100%→120% 正常）。BUG 清单：空。

例外说明（派发指令预见的并行收尾情形未发生）：STATE.md `iteration` 仍为
0029（phase: BUILD→VERIFY 本轮按派发指令改写），本报告按常规 VERIFY 路径产出。

## 1 · AC 逐条结论与证据

### AC1 · ADR 落盘与七要素完备 — PASS

命令与输出（本会话亲跑）：

- `ls docs/adr/` → 0001~0015 共 15 文件，0015 前恰一新文件
  `0015-presentation-triplet-nodes.md`（编号顺延成立；`git status --porcelain`
  产品面 untracked 恰此一路径）；
- `wc -l` → **260 行** ≤400（AGENTS.md 硬性约定 4 达成；恰在 PRD §7 建议区间
  260±60）；§7 行数预算低估（PRD 预估 ~15 行、实际约 70 行）系 VERBATIM 字面量
  不可压缩，JOURNAL §3.2 已如实记载，硬判据不受影响（裁定见本报告 §3）；
- `grep -n "^## "` → 七要素全部成节可索引：§1 动机与现状证据（:22，①）·
  §2 三节点 DEFS 定界草案（:54，含 §2.1 webshow / §2.2 termview /
  §2.3 jsoncanvas 字段级草图表 + §2.4 schema 纪律合规自检九条，②）·
  §3 呈现承载定界（:118，③）· §4 画布渲染面定界（:144，含 §4.1 iframe 安全 /
  §4.2 等宽流式 / §4.3 结构化树 / §4.4 PTY 切割 / §4.5 SSE 护栏，④）·
  §5 分批修宪编排（:195，⑤）· §6 golden 增量预案（:211，⑥）· §7
  BK-0036~0038 定界回写索引（:231，⑦）+ §8 影响面与不做范围（:250，
  ADR-0013 §9 同款收尾节）；
- 状态行 `:3` =「**草案 · 待实施轮消费**（BK-0036 网页展示修宪轮 / BK-0037
  终端只读流修宪轮 / BK-0038 JSON 画布修宪轮——链终轮）；授权链 = issue#3
  用户批复承继（2026-10-23T15:49:32Z，见 BACKLOG BK-9003 行）」——零依赖面故
  无 0014 式「待用户批准」位，与 PRD AC1 口径逐字相符；标题 `:1` 含「草案」
  二字；
- `grep -c "已批准"` → **0**（非功能要求 3 兑现，全文无批准态措辞）；
- EOL/BOM：首三字节 `23 20 41`（`# A`，无 BOM，od 亲核）；`tr -cd '\r' | wc -c`
  → **0**（纯 LF，非功能要求 4）。

### AC2 · DEFS 定界锚点真实可核 — PASS（20+ 锚点逐一亲核，无一杜撰）

按 ADR §1/§2/§3 引用逐条 Read/grep/sed 亲核：

| 锚点 | 核对结果 |
| --- | --- |
| `nodes.schema.ts:13-15` 三枚举冻结 | 精确命中：PORT_TYPES 五（any/text/list/object/number）、WIDGETS 五（text/textarea/number/combo/toggle）、CATEGORIES 七（含 output）——ADR §2「冻结枚举内组合、零溢出」成立 |
| `nodes.schema.ts:18-21` PortIdSchema `^[a-z][a-z0-9-]{2,31}$` | 精确命中（ADR §2.4 引用 :18-21 正确；PRD 所写 :18-19 系行段偏移，见 §3） |
| `nodes.schema.ts:50-58` widget×default 判别联合 / `:72-83` capabilities 恰十 kind / `:115-122` params id 唯一 / `:136-146` combo 值域与 number min-max-step / `:152-165` 端口唯一 + in-/out- 前缀 | 全命中（§2.4 自检表九条逐条有据） |
| `nodes/reply/node.ts` 全文 21 行 | 逐字相符：outputs 空数组、`in-content` type any、binding `{handler:'reply', capabilities:{data:true}}`、单 textarea 参数——sink 同构样板成立 |
| `nodes.ts` 142 行（wc 亲核） | imports :19-34 恰 16、loadJsonDef :37-47、synthesize :93-111、**caps 合成 :97-99 仅映射 mcp/skill 两键（capabilities.data 不进 caps——§2.4 论据成立）**、NODES 16 键 :113-130、paramDefaultsOf :138-142 |
| `handlers.ts`（298 行，wc 亲核） | `:225-232` reply handler：render → `ctx.outputs!.push` + `emit('output',{text})` + out 摘要——承载样板逐字相符；§3「298 → 约 330-340 行 ≤400」基数正确 |
| `engine.ts`（152 行） | `:26-29` `HANDLERS = {...BASIC_HANDLERS, llm}`（入 BASIC_HANDLERS 即自动注册、engine 零改动成立）、`:99` `HANDLERS[n.type] \|\| HANDLERS.__pass`（兜底语义成立） |
| `app.js:36-42` PTYPES 五类型 / `:43` typeOk / `:46-54` CATS 七类目（output :52 → `--cat-output`） | 精确命中（零新增 CSS 变量与类目论据成立） |
| `app.js:57-99` ICON_PATHS / `:100` I() 按键查表 | globe :63、code :65、box-select :84 三键行号精确命中；16 节点 icon 占用 grep 亲核：globe→websearch、code→代码执行、box-select **无节点占用**、reply→直接回复、tag→setvar——§2.1/§2.2/§2.3 图标复用案与 §6「output 分组现占用 setvar/reply 两行」全部属实（后者另经浏览器 live 复核，见 §2） |
| `app.js:763` widget 行 / `:764-765` port-row / `:774` `.node-out` 唯一输出容器 / `:778-784` capsChips | 全命中（DEFS 通用渲染链与 caps 零新增论据成立） |
| `app.js:897` `slice(0,160)` / `:1896` setNodeOut textContent 单行 / `:1866`+`:1203` RUN_META | 全命中（160 字截断呈现差距 = 修宪面事实依据成立） |
| `events.ts:8-37` 恰 15 个 z.literal | 亲数 15 种（run:accepted/start/progress、node:start/bypass/delta/done/error、cond、log、output、approval:required/done、run:error/done）——§4.5「15 种内取用」护栏域成立 |

- 三节点定界显式声明在冻结枚举内组合：§2 篇首（:57-62）明文「全部字段在
  冻结枚举内组合（nodes.schema.ts:13-15），零溢出」+ 类目固定 output + 端口
  均 any + widget 用 text/toggle/number（均 ∈ 五枚举；combo 未用但保留枚举内
  取用口径）；number 参数（lines 200∈[20,2000] step 20、expand 2∈[0,6] step 1）
  与 schema `:138-146` 约束相容；
- schema 纪律合规自检表成节：§2.4（:97-116）九条，ADR-0013 §2.3 样板制式，
  含 baseline 重产联动键（16→17→18→19）。

### AC3 · 分批编排与 golden 预案成文 — PASS

- **编排**（§5 :195-209）：一节点一迭代一 ADR 增补口径（BK-0036 → BK-0037 →
  BK-0038，与 ROADMAP.md:186-191「SPEC 四连先行 + BK-9003 链序列」亲核一致）
  成文；每批受影响面**四件套表**（① NDP 定义 + ② 呈现承载 + ③ 前端三文件 +
  ④ gate 场景增量）逐批列明；baseline **16→17→18→19** 与守卫联动清单
  （nodes-dirs D===17/18/19、defs-drift +1、readme-consistency）逐批在表；
- **golden 双通道**（§6 :211-229）：golden-created 通道（`gate.mjs:247-253`
  亲核：`UPDATE \|\| !existsSync(gPng)` 落盘并记 golden-created）+ 受波及既有
  场景修宪轮 gate:update 重录（ADR-0013 §6 :209-223 直系样板亲读，s8-agent-node
  / s9-goal-panel-online 预定在案）；「**场景编号按落盘时序（预期 s10+）**、
  BK-0046/0049 穿插项可能占号、不锁死」明示；s3-library 每批必然受波及
  （output 分组数据驱动 +1）+ s0/s1/s2/s4~s7 预期零波及须 **gate 全场景实测
  确认**（任一意外红即中止排查）；路由 fixture 评估（静态呈现预期无新路由、
  termview 在线场景沿 RUN_ROUTES `gate.mjs:181-184` 先例——亲核 s4/s5 行）；
- **iframe 安全面**（§4.1 :151-162）：sandbox 属性方案写死（默认空值最严、
  params.sandbox=false 责任翻转、禁止 allow-scripts+allow-same-origin 组合）+
  协议白名单仅 http(s): + **服务端零出站边界写死**（不抓取/不代理/不转存，
  内容获取归既有 http 节点、出站走 guard.ts status quo）；
- **PTY 边界切割**（§4.4 :177-186）：termview = 只读呈现 sink（无用户输入面、
  零新依赖/零子进程/零新端点/零 shared 契约变更）；BK-0045 PTY 归 ADR-0014
  附录 A 专属面；实施护栏（严禁引入 node-pty、越出授权即中止转
  needs-approval）成文。

### AC4 · 定界回写 VERBATIM 一致 — PASS

- node 比对脚本（临时脚本 `.tmp-verify-ac4.mjs`，验后已删）提取 ADR §7 三段
  ```text 权威字面量与 BACKLOG 三行第 9 列（备注列）`trim()` 后全等：
  **`BK-0036: VERBATIM OK / BK-0037: VERBATIM OK / BK-0038: VERBATIM OK`**
  （长度 1284/1354/1222，与 JOURNAL §4 记录一致）；exit 0；
- 其余列不动（split('\|') 字段校验亲跑）：三行均 `type=ui-proposal ui=是
  pri=P0 size=M status=proposed source=issue#3`；
- `git diff --stat docs/evolution/BACKLOG.md` → **恰 3 行替换（+3/−3）**且
  diff 内 `-|` 行首仅 BK-0036/BK-0037/BK-0038——BK-0035（ready）/BK-9003
  （skipped）与其余行**零触碰**（状态流转归脚本/CLOSE）；
- BK-0038 链终轮回执 issue#3 关单口径在 ADR §7 第三段字面量内保留
  （「本链终轮——CLOSE 时回执 issue#3 关单（沿 issue#10/11 终轮先例）」）；
  回写随归档提交入库（产品提交仍恰 1 路径，见 AC5）。

### AC5 · 白名单与零代码机器证明 — PASS（工作区级；提交级归 CLOSE）

- `git status --porcelain` → 恰 4 条：`?? docs/adr/0015-*.md`（产品件
  untracked）+ `M docs/evolution/BACKLOG.md` + `M docs/evolution/STATE.md`
  （机制件）+ `?? docs/evolution/iterations/0029/`（机制件目录）——白名单外
  路径零出现；
- `git diff -- apps packages tools tests .github package.json package-lock.json
  | wc -c` → **0 字节**（禁区恒空，PRD「不做」面机器证明）；
- `git diff --stat package-lock.json package.json | wc -c` → **0 字节**
  （lock 零变化 = 零依赖）；
- **产品提交尚未落盘**（HEAD = 6c87c85）：`git show --numstat <产品提交>`
  提交级终判沿 0018/0021/0022/0028 先例归 **CLOSE 于产品提交落盘后复核**
  （工作流机制：git 操作由脚本统一执行，VERIFY 先于提交时点——
  `.zcode/workflows/evolution-iteration.dwf.ts` 提交步骤在 tester.ask 之后）；
  工作区级前置证明如上全过。

### AC6 · 纯回归面全绿 — PASS

- **build / gate / test**：工作流脚本统一执行并通过（派发指令明载「已由脚本
  运行且通过，不要重复跑全套」——本 REPORT 不代报、不复跑；gate 8 场景
  diffPx=0 与契约测试全绿采信脚本侧结论，0028 REPORT 同款先例）；
- **smoke:server**（派发指令未担保项，VERIFY 按 test-manager 后端验证职责
  针对性补跑）：`npm run smoke:server` → **`==== smoke:server：95 passed /
  0 failed ====`**，exit 0——与 metrics 0026/0027/0028 行基线 95/0 完全一致
  零漂移；本轮零代码理论零漂移成立，**V09 时点性假红未出现**（V09 =
  smoke-server.mjs:838-852 的「git packages/shared 零改动」时点性检查，本轮
  packages/shared 未触碰故直绿；判据 0 failed 达成）。

### AC7 · 指针抽样可开 — PASS（实际 9 组 25+ 指针，远超下限 ≥5）

PRD 建议抽样池全数核验（详见 §1 AC2 表 + 以下补充）：

1~8. §1 AC2 表列代码锚点八组（nodes.schema.ts / reply/node.ts / nodes.ts /
handlers.ts / engine.ts / app.js 六段 / events.ts / gate.mjs）全命中——
含 PRD 所写 `gate.mjs:177-186` 实际为 `:176-187`（SCENARIOS 恰 8 场景
s0~s7、s4/s5 WF_ROUTES/RUN_ROUTES :181-182）行段射程内命中；
9. **BACKLOG 四行**：BK-0035（:48，ready）/ BK-0036（:49）/ BK-0037（:50）/
   BK-0038（:51）/ BK-9003（:74，skipped，批复承继 2026-10-23T15:49:32Z
   拆分口径在案）亲读；
10. **issue#3 链**：`gh issue view 3` → number=3、state=**OPEN**（符合「关单
    留 BK-0038 链终轮」编排）、标题「【待批准】BK-9003 · 呈现三件套节点：
    网页展示 / 终端只读流 / JSON 画布」匹配；`gh api .../issues/3/comments`
    → 用户本人（liusuren123）批复评论「批准」created_at =
    **2026-10-23T15:49:32Z**——与 ADR :5 / BACKLOG BK-9003 行所引时间戳
    **逐字一致**（授权链闭合）；
11. **ADR-0013 §6**（:209-223）：golden 双通道 + s8-agent-node（BK-0033）/
    s9-goal-panel-online（BK-0034）预定 + SESSION_ROUTES 预案——ADR-0015 §6
    「s8/s9 已预定」「双通道直系样板」引用属实；
12. **ROADMAP.md:184-191**：「SPEC 四连先行：BK-0032 → BK-0043 → BK-0035 →
    BK-0039」+「BK-9003 链：BK-0036 → BK-0037 → BK-0038（一节点一修宪迭代，
    0038 链终轮回执 #3）」逐字在位——PRD 定界权威与 ADR §5 编排依据成立。

## 2 · 针对性 E2E 与交互回归抽查（test-manager 职责；纯文档轮运行时零影响证明）

- **后端启动**：`npm start`（后台）→ 构建链全过、服务器就绪；
  `curl /api/v1/health` → `{"ok":true,"engine":"agentflow-server","node":
  "v24.21.0","provider":{…已连接 DeepSeek…}}` HTTP 200；
- **页面加载**（IAB 浏览器）：title「AgentFlow · 智能体工作流原型」；
  DOM 不变量在位（evaluate id 清单亲核）：`#viewport`/`#rail`/`#sidebar`/
  `#side-body`/`#tabsbar`/`#floatbar`/`#canvas-stats`/`#log-body` 八 id 全
  present；`.node`=4 画布节点、`.port`=9；底部日志「⚡ 执行后后端已连接 ·
  Vercel AI SDK 7 · Node v24.21.0 · 已连接 DeepSeek（OpenAI 兼容端点）」；
- **节点库清单**（导航 nodes 按钮触发侧栏）：**`.lib-node`=16 / `.lib-cat`=7**
  ——七类目（输入 2/对话 2/知识 2/工具 3/逻辑 4/输出 2/人工 1）16 节点逐一
  列出（触发器/用户输入/LLM 对话/提示词模板/知识库检索/网页搜索/HTTP 请求/
  代码执行/消息通知/条件分支/循环/延时等待/合并/直接回复/变量赋值/人工审批），
  **无 webshow/termview/jsoncanvas 条目**（BK-0036~0038 未实施，纯文档轮符合
  预期）——与迭代 0027/0028 VERIFY 先例一致，节点库清单不变；**输出分组恰
  「直接回复 + 变量赋值」两行——ADR §6「output 分组现占用 setvar/reply 两行」
  live 佐证**（与 §1 AC2 代码 grep 双重印证）；
- **画布缩放交互**：点击右下工具条「＋」→ `#canvas-stats`
  「节点 4 · 连线 0 · 100%」→「节点 4 · 连线 0 · **120%**」（命令式画布
  响应正常）；
- **离线画布几何**：`npm run test:canvas` → **15 passed / 0 failed**
  （portCache 连线端点贴合 C4/C5 全绿）；
- 附注一（非缺陷）：`window.toast === undefined` 系 app.js:10
  `bootLegacyApp()` 闭包内模块级函数的**既有设计**（toast 定义于闭包内、
  未挂 window），非本轮回归（apps/** 禁区 diff 0 字节）；
- 附注二（环境观察，非缺陷）：本会话 IAB 的 Playwright locator click 与
  CUA 坐标点击均未触发页面事件（actionability 等待超时；0028 先例坐标点击
  成功，系会话差异），交互触发改用页面上下文 DOM `click()`——与 app.js:293
  `addEventListener('click')` 同一事件路径，点击效果经 DOM 状态变化验证；
- E2E 后清理：服务器进程（node.exe PID 15176）已终止、端口 3000 已释放
  （探针 HTTP 000 = connection refused）、临时比对脚本已删除、浏览器 tab
  保留（不属仓库状态）。

## 3 · BUILD 移交事项裁定（JOURNAL §3.1/§3.2 偏差）

- **§3.1 PRD 背景节六处锚点行号偏移——认可（事实性修正非技术结论改写）。**
  本会话逐处亲核代码：nodes.schema.ts「:50-57 矩阵」→ 实际 **:50-58**；
  「:18-19 正则」→ 实际 **:18-21**；app.js「:54+ ICON_PATHS」→ 实际
  **:57-99**（globe :63/code :65/box-select :84 三键精确）；「app.js:1210
  setNodeOut」→ 实际定义 **:1896**（:1203 为 RUN_META 消费点、:1213 为调用
  点）；gate.mjs「:177-186」→ 实际 **:176-187**；nodes.ts「:29-33
  loadJsonDef」→ 实际 **:37-47**。ADR 全部按代码事实转写**正确**（若照抄
  PRD 行号反而构成 AC2 杜撰）；沿迭代 0027/0028 JOURNAL §3.1 先例；PRD AC7
  判据「行段射程内命中」两种引用均成立。
- **§3.2 ADR §7 行数预算低估（~15 行 → 实际约 70 行）——认可。** 三段
  VERBATIM 权威字面量本身 1284/1354/1222 字符（AC4 逐字比对基准，不可压缩，
  BUILD 处置正确）；全文 260 行 ≤400 硬上限且恰在 260±60 建议区间，AC1 硬
  判据不受影响。

## 4 · 缺陷清单

**空。** 观察项两条（OBS，非缺陷，记档）：

- **OBS-001**：PRD 背景节存在六处锚点行号偏移（见 §3.1），BUILD 已按代码
  事实转写并记 JOURNAL §3.1，VERIFY 逐条裁定认可。ADR-0015 已按实际行号
  落盘；后续实施轮（BK-0036~0038）消费本 ADR 时行号可直接引用。
- **OBS-002**：本会话 IAB 浏览器的 locator/坐标点击通道未生效（§2 附注二），
  系验证环境差异，与产品代码无关（apps/** 禁区 0 字节 + gate 脚本侧全绿）；
  下轮 VERIFY 如需浏览器交互抽查，可先试 DOM click 通道。
- 另记（非观察项）：AC5 提交级 `git show --numstat` 证明因产品提交时点在
  VERIFY 之后（工作流机制）归 CLOSE 复核——与 0018/0021/0022/0028 先例
  同款既定流程，非本轮缺口。

## 5 · 移交 CLOSE

- **BK-0035 置 done**；产品提交恰 `docs/adr/0015-presentation-triplet-
  nodes.md` 一路径（+260/−0）预期——CLOSE 于提交后 `git show --numstat`
  复核（AC5 终判）+ 禁区 diff 复跑；
- **issue#3 仅发进度回执不关单**（关单留 BK-0038 链终轮，PRD 批次编排与
  ADR §7 字面量在案，itemContinues=true）；BK-0036/BK-0037/BK-0038 状态
  全程 proposed 不动，晋升条件 = BK-0035 CLOSE 后由 PLAN 轮晋升（三项同批
  可晋升，实施序仍 0036 → 0037 → 0038，ADR-0015 §5/§7）；
- metrics 行追加建议：结果 done / gate 8 场景（脚本侧）/ test 契约（脚本侧）/
  smoke 95/0（VERIFY 亲跑）/ 行数差 +260（ADR 单文件）/ bug 0；
- STATE.md 已按派发指令更新：phase=VERIFY（本报告落盘即 VERIFY 产物）。
