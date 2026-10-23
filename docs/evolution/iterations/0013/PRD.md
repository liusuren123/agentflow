# PRD · 迭代 0013 · BK-9001 底部日志面板按级别过滤（issue#1 批复项 · 修宪轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 03:30
> 来源：BACKLOG BK-9001（P0 / ui-proposal / M / ready / 触UI=是，来源 issue#1；
> 2026-10-24 迭代 0011 PLAN 轮落行，批复时间戳在案）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · 里程碑 M3 第一项（`ROADMAP.md:133-140`
> 顺序：#1 日志过滤 → #2~#5；BK-0021 NDP 前置仅约束**新节点**类项 #2/#3/#5，
> 本项不含新节点，无 NDP 前置）。
> 选题依据：WORKFLOW §4 优先序 ①——issue#1 为用户批复项（OWNER 本人评论「批准」
> 2026-10-23T15:50:05Z；本会话 gh api 亲核复确认，无 🤖 前缀、其后无撤销）。
> **批复项内本轮取 BK-9001 的排序论证**：(a) 唯一 M 级批复项——BK-9002~9005 均为
> L 级且各有未竟前置（BK-0016 会话 API、BK-0021 NDP 均未完成），按「L 项先拆分再
> 实现」（BACKLOG 各行备注）与「一次迭代只做一件事」不宜由心跳直接抓取；(b) STATE
> 0012 轮 last_result 明示「下次心跳队首 BK-9001 修宪轮」；(c) 风险面有利——本项
> 新 UI（过滤 chips）位于 `#bp-head`，而**全部既有 golden 场景中面板均被 normalize
> 收起**（`gate.mjs:46-52`，`#bottompanel.closed{max-height:0;overflow:hidden}`，
> `app.css:317-319`）→ 既有 s0~s5 基线设计上零像素影响，修宪影响面收敛为
> 「新增场景快照」，是五项 UI 批复中唯一可在不动任何既有基线的前提下落地的项。
> 与最近 3 次迭代重叠面核对：0012=tests/smoke + CI + package.json（零重叠）；
> 0009=apps/server/src + tests/smoke（零重叠）；0011=tools/pixel-gate + tests/golden +
> docs/adr——**共享 gate.mjs 文件触点但改动正交**（0011 追加 s4/s5 与路由基建，
> 本项追加 s6/s7，SCENARIOS 数组互不相交，s0~s5 基线文件互不相交）。

## 结论

**建议做（本迭代即做）**：一句话理由——一次 run 产生数十行 info/sys 流水行，异常
（warn 级）被滚动淹没且面板仅保留最近 300 行（`app.js:1844`），事后排查全靠肉眼；
用户已批复 issue#1，本迭代在底部日志面板头部加级别过滤 chips（全部 · sys · info ·
warn · ok），是最小修宪面（既有 golden 零影响 + 新增场景快照）的查看层降噪能力。

## 触 UI 分类结论

**是——修宪轮（reconstitutional=true）。** 论证（逐层对照宪法第 1 条三层）：

1. **结构层**：`#bp-head`（`Skeleton.tsx:120-124`）新增过滤 chip 按钮元素；`app.css`
   （结构层保护对象）尾部**追加** chips 激活态与过滤隐藏规则——既有选择器与声明
   逐字不动，但文件内容变化即触宪。
2. **视觉层**：面板展开态的 `#bp-head` 区域像素渲染变化（新增可见控件）；chips 的
   激活/非激活两态均进入新 golden 快照。
3. **交互层**：新增「单击 chip 切换过滤级别」交互语义（宪法第 1 条第 3 层「现有
   全部交互语义」之外的新交互）。
4. **授权链闭环**：POLICY 需批准区「任何 UI 三层改动」——issue#1 用户 OWNER 本人
   批复在案（2026-10-23T15:50:05Z，本会话 gh 亲核）；修宪通道：ADR 入 `docs/adr/`
   （编号 0010，标注已获 issue#1 批复）→ 实现 → 同迭代经 **golden-created 通道新增**
   s6/s7 基线（`gate.mjs:192-196`，沿 0011 先例，gate:update 不是预期入口——
   WORKFLOW §4 BUILD 修宪轮应急条款仅作门禁失败且归因自身时的一次性兜底）。
5. **既有保护面零削弱**：s0~s5 全场景 normalize 收起面板（`gate.mjs:48` +
   `overflow:hidden`）→ 新 chips 在既有快照中不可见；AC1 机器核对 12 个既有基线
   文件逐字节零变化。

## 背景（代码事实源，2026-10-24 03:0x~03:30 本会话只读核实）

1. **面板 DOM 与交互现状**：`#bottompanel` > `#bp-head`（`.ldot` + 标题「执行日志」
   + `#log-clear`「清空」+ `#bp-close`「收起」）+ `#log-body`（`Skeleton.tsx:119-126`）；
   收起 = `.closed` 类（`max-height:0;border-top-color:transparent`，`app.css:319`）；
   展开入口 `#rail-bp`（左侧图标栏 `rail-btn`，无 data-stab，`Skeleton.tsx:50`）
   toggle、`#bp-close` 只收（`app.js:1790-1791`）。
2. **日志行与级别词表**：`addLog(msg, lvl='info')` 生成
   `<div class="logline ${lvl}"><span class="t">${now()}</span><span class="m">…</span></div>`
   追加进 `#log-body`，上限 300 行、自动滚底（`app.js:1838-1846`）。**实发级别四级**：
   `sys / info / warn / ok`——前端调用遍布 `app.js`（如 :1920 sys、:2012 warn、
   :2016 ok、默认 info）；服务端 SSE `log` 事件 `lvl` 同四级（`llm.ts:59,70,80,109`、
   `engine.ts:62`、`handlers.ts:45,58,68,71,100,115,157,173`）；回放映射同四级
   （`server-sync.js:87-107`）。**CSS 有第五级 `err` 但全仓零发射源**（本会话
   grep `'err'` 字面量于 app.js 与 apps/server/src 均 0 命中；错误行一律映射 warn：
   `server-sync.js:95,104`、`app.js:2178,2207`）——`app.css:330` `.logline.err` 为
   死规则，本项不动它。
3. **issue 措辞与实词表的调和**：issue#1 标题写「info/warn/error」；本仓错误语义
   实际由 warn 级承载（背景 2 证据），无 error 级发射。过滤词表取**实发四级原词**
   sys/info/warn/ok +「全部」——不造无数据的 err chip（恒空过滤是负 UX）；未来若有
   emitter 启用 err 级，chip 扩充另行修宪。
4. **golden 现状**：6 场景 s0~s5（`gate.mjs:122-131`），12 基线文件；normalize 在
   **每场景快照前**给 `#bottompanel` 加 `.closed`（`gate.mjs:46-52`）——面板 UI
   （含 `#bp-head`）在既有全部快照中不可见。公共不变量六键 + `bottomClosed`
   （`gate.mjs:159-176`）不含 bp-head 内部结构；`cssVars` 只采 `--` 前缀属性
   （`gate.mjs:167`），追加非 :root 规则不影响。
5. **golden-created 通道**：基线不存在时首跑落盘并记 golden-created
   （`gate.mjs:192-196`）——新增场景的合法入口（0011 s4/s5 先例）。
6. **竞品对照**（product-manager.md 职责 2）：ComfyUI 新前端控制台具备按日志级别
   过滤查看的能力（降噪意图的基准）；AgentFlow 底部日志面板为定稿自有设计（原单
   文件时代产物）。本项对齐其「按级别降噪」的**产品意图**，交互取**最小单选模型**
   （chips：默认「全部」，单击某级别只看该级）——刻意不逐像素复刻 ComfyUI 控制台
   （面板布局不同源），理由：修宪面最小化、状态机最简、golden 断言性最强；多选
   过滤/正则搜索留后续修宪（非目标）。

## 目标

1. **过滤 chips**：`#bp-head` 新增 5 个 chip（全部 · sys · info · warn · ok），
   默认「全部」激活；单击切换过滤级别，立即作用于既有行与未来行。
2. **行为守恒**：清空/收起/展开/300 行上限/自动滚动/级别词表全部原样。
3. **修宪三件套**：ADR-0010（动机/影响面/像素证据方式/批复时间戳）→ 实现 →
   同迭代新增 s6/s7 golden 基线；既有 s0~s5 十二文件逐字节零变化。
4. **证明**：8 场景双跑自一致性 + 反演演练（破坏过滤实现 → 新场景红 → 还原复绿）。

## 非目标（out of scope）

- **不做多选过滤 / 正则 / 关键字搜索 / 时间范围过滤**——单选 chips 是本项全部
   交互面；扩展另行修宪立项。
- **不启用 `err` 级、不删 `.logline.err` 死规则、不改任何日志发射源的级别取值**
   （`apps/server/**` 零改动）。
- **不动 SSE 契约**：`packages/shared/**` 零改动（过滤是纯前端查看层，`lvl` 字段
   契约已够用）。
- **不做过滤状态持久化**：不写 localStorage/后端；reload 重置为「全部」。
- **不动既有基线**：s0~s5 若出现非零 diff 立即中止排查（基线漂移信号，另立 ADR），
   不得借本项重录。
- **不做会话面板/其他 T5-M3 项**（BK-9002~9005 各有前置，逐轮消化）；不处理
   BK-0011 悬挂 run 等无关 ready 项。
- 不更新 ROADMAP / metrics 状态（CLOSE 职责）。

## 用户故事

1. 作为工作流作者，长跑 run 结束后我想只看 warn 行快速定位异常，而不是在数十行
   流水里肉眼翻找（300 行上限还可能已把早期行挤掉）。
2. 作为宪法主权者，我批复了 #1，期望改动严格限于日志面板查看层，我定稿的 6 个
   golden 场景像素一分不动，新 UI 进入新的机器保护面。
3. 作为 test-manager，未来任何改动破坏过滤 chips 的视觉或行为时，我需要 s6/s7
   直接红，而不是靠人眼发现。
4. 作为 code-developer（后续 BK-9002~9005 修宪轮执行者），我需要本项建立
   「新增 UI → ADR → golden-created 新场景」的完整先例参照。

## 需求条目

- **REQ-9001-01 · 过滤 chips（DOM）**：`#bp-head` 内、标题与 `.ldot` 之后、
  `#log-clear` 之前（`margin-left:auto` 的 ibtn 组保持靠右不动），新增 5 个 chip
  按钮：全部 / sys / info / warn / ok。默认「全部」携带激活态类。视觉沿既有
  bp-head 控件语言（高 22px、字号 11px 同 `.ibtn` 口径；激活态用既有色 token）——
  精确像素规格 SPEC 定稿并全文入 ADR-0010。
- **REQ-9001-02 · 过滤语义（交互层）**：单击 chip 单选切换：激活某级别 → `#log-body`
  仅该级别行可见（既有行 + addLog 未来行同规则）；点「全部」→ 恢复全部。「清空」
  只清行不清过滤态；收起/展开（`#rail-bp`/`#bp-close`）过滤态保留；reload 重置为
  「全部」。推荐实现形态（SPEC 可等价替代）：过滤状态挂 `#log-body` 的
  `data-lvl` 属性，CSS 追加四条隐藏规则（`#log-body[data-lvl="L"] .logline:not(.L)
  {display:none}`），chips 仅切换属性与自身激活类——`addLog` 函数零改动。
- **REQ-9001-03 · 既有行为零变化**：`#log-clear`、`#bp-close`、`#rail-bp` 语义、
  300 行上限、自动滚底、logline 行结构（`.t`/`.m` span 与级别 class）原样；
  `app.css` / `Skeleton.tsx` / `app.js` 既有行零改动（diff 仅允许追加/插入新行，
  AC6 机器核对）。
- **REQ-9001-04 · golden 扩充（修宪核心）**：新增两场景经 golden-created 通道落盘：
  - **s6-log-panel**：click `#rail-bp` 展开面板 → 注入确定性级别样例行（sys/info/
    warn/ok 各 ≥1，固定字面量，规避 `now()` 时间戳抖动；注入途径 SPEC 定稿，
    如 evaluate 直写固定 markup）→ 快照「全部」默认态（5 chips + 全级别行可见）。
  - **s7-log-filter-warn**：同上注入 → click「warn」chip → 快照过滤激活态
    （warn chip 激活 + 仅 warn 行可见）。
  - 不变量增量（s6/s7 专属键，公共六键原样、s0~s5 零新增键）：`bottomClosed:false`、
    chips 计数与激活态、`#log-body` 可见行数与级别分布。
  - 时区/字面量确定性沿 ADR-0009 口径（若走 addLog 途径须 `timezoneId:'UTC'`）。
- **REQ-9001-05 · ADR-0010**：`docs/adr/0010-log-panel-level-filter.md` 新增：动机
  （本 PRD 背景）、影响面（REQ-9001-06 白名单 + 三层触点清单）、像素对比证据获取
  方式（s6/s7 golden-created 基线 + 面板展开态前后截图）、批复标注（issue#1 ·
  2026-10-23T15:50:05Z 用户本人）、回滚步骤。
- **REQ-9001-06 · 改动面白名单**：产品提交 git diff 仅允许——
  `apps/web/src/Skeleton.tsx`（bp-head 内新增 chips）、`apps/web/src/app.css`
  （尾部追加）、`apps/web/src/legacy/app.js`（chips 事件与过滤状态），
  `tools/pixel-gate/gate.mjs`（追加 s6/s7 及确定性注入 helper；既有场景步骤与
  公共不变量采集器零改动）、`tests/golden/ui/` 下 s6/s7 **新增** 4 文件、
  `docs/adr/0010-*.md` 新增。其余任何路径零改动（AC6 机器核对）。

## 非功能要求

1. **确定性**：s6/s7 注入行固定字面量（无 `now()` 时间戳）；重放任意环境字节一致。
2. **时长可控**：gate 6→8 场景，CI 增量估 +20~40s（沿 ADR-0009 §4 口径）。
3. **规模**：零新增源文件（全部改存量）；`app.css` 追加 ≤15 行、`app.js` 增量
   ≤30 行、`gate.mjs` 增量 ≤60 行（SPEC 定稿精确数）。
4. **可审计**：修宪三件套在档（issue#1 批复评论 / ADR-0010 状态行 / PRD-SPEC-REPORT）。

## 验收标准（Given / When / Then）

- **AC1 · 既有基线零漂移**：When 核对产品提交 git diff，Then `tests/golden/ui/`
  下 s0~s5 的 12 个既有文件零改动，仅新增 s6/s7 共 4 个基线文件。
- **AC2 · 八场景自一致性**：Given gate.mjs 已扩充且 `npm run build` 完成，When 首次
  运行 `npm run gate`，Then s0~s5 pass diffPx=0 且 s6/s7 报 golden-created；When
  第二次运行，Then 8 场景全 pass、0 diff。
- **AC3 · 过滤交互 E2E**：Given 面板展开且 `#log-body` 含 sys/info/warn/ok 行各 ≥1，
  When 依次执行——点「warn」→ 仅 warn 行可见；点「sys」→ 仅 sys 行可见；点「全部」
  → 全部恢复；点「清空」→ 行清空且过滤态不变；`#bp-close` 收起再 `#rail-bp` 展开
  → 过滤态保留；reload → 重置为「全部」。Then 每步行为与 REQ-9001-02 逐条相符。
- **AC4 · 保护力反演**：When（VERIFY 演练）临时破坏过滤实现（如摘除 `data-lvl`
  属性写入或删一条隐藏规则）重跑 gate，Then s7（或 s6，视破坏点）FAIL；还原后
  8 场景复绿。证明新基线非恒真。
- **AC5 · 契约与后端零变化**：When 核对 git diff，Then `packages/shared/**`、
  `apps/server/**`、`.github/**` 零改动；`npm test` 全绿（契约零漂移机器证据）。
- **AC6 · 白名单与机械移植口径**：When 核对 git diff，Then 仅 REQ-9001-06 白名单
  六处；其中 `app.css`/`Skeleton.tsx`/`app.js` 的既有行零改动（追加/插入行之外
  无删改）。
- **AC7 · ADR 与授权链在档**：Then `docs/adr/0010` 含动机/影响面/像素证据方式/
  回滚，及「已获 issue#1 批复（2026-10-23T15:50:05Z）」标注；issue#1 链接在档。
- **AC8 · CI 权威盯守**：推送后 ui-constitution（windows-latest）8 场景绿；若 CI
  红以 CI 为权威排查，不得以本机绿自判通过（宪法第 2 条）。

## 依赖与风险

- **依赖**：`npm run build`（gate 前置）；Playwright 既有版本；零新 npm 依赖。
- **风险 1 · golden 抖动**（注入行时间戳/字体渲染）→ REQ-9001-04 固定字面量 +
  稳定双帧等待复用（`gate.mjs:149-156`）；CI 权威口径（AC8）。
- **风险 2 · 面板展开改变画布区高度引入快照耦合**：`#bottompanel` 为 `flex:none`
  定高 224px，展开只压缩 viewport 剩余空间、不改变 world transform 与节点坐标
  （`app.css:317`；不变量 view/nodes 键可交叉验证）——s6/s7 基线自包含，不回写
  s0~s5。
- **风险 3 · CSS 追加误伤既有渲染**：新增选择器仅以新增 chip 类与 `#log-body
  [data-lvl]` 为靶，不触碰既有选择器匹配集；AC1/AC2 机器核对兜底。
- **风险 4 · 交互层回归**：chips 事件若误绑 document 级监听可能影响既有快捷键
  → SPEC 限定绑定于 bp-head 内 chips；AC3 收起/展开/清空步骤守护既有交互。
- **风险 5 · gate:mjs 共享触点**（与 0011 同文件）：SCENARIOS 纯追加 + 公共采集器
  不动，s4/s5 基线文件零改动由 AC1 机器核对。

## SPEC 要求（skipSpec=false）

BK-9001 为 M 项且属修宪轮——WORKFLOW §4 BUILD 修宪轮条款「SPEC 须含 golden 重录
（本案：新增）方案」为硬要求，不免 SPEC。SPEC 须含：受影响文件清单（REQ-9001-06
白名单展开到函数/规则级）、chips 精确 DOM 与 CSS 规格（选择器与声明全文，同步
ADR-0010）、s6/s7 完整步骤与注入字面量、确定性策略（时间戳规避/时区/稳定帧）、
双环境（windows-latest CI + 本机）自一致性验证、回滚步骤（SCENARIOS 回退 + 删 4
基线 + revert 产品提交）。

---

## 选题过程存证

- **批复栏「approved：无」gh 亲核实况**（本会话 2026-10-24 03:2x 执行）：
  - `gh issue list --state all`：#7/#8 已 CLOSED（迭代 0011/0012 完成关单），
    #1~#6、#9 OPEN——与 BACKLOG 待批准区注记一致。
  - `gh api issues/1/comments`：用户 OWNER 本人（liusuren123）评论「批准」
    （2026-10-23T15:50:05Z，无 🤖 前缀）——与 BK-9001 行备注时间戳一致；非新批复
    （0011 轮已同步落行），规则①无新行动作。
  - `gh api issues/6/comments`：仅一条 🤖 前缀循环补充评论（2026-10-23 治理日
    BUG-0012 追评），无用户批复——#6 维持待批准，不建行。
  - **结论：档案「approved：无」= 无新批复，与 BACKLOG 实况一致，规则①③无动作。**
- **user-request #9——不建行**（沿 0011/0012 先例，POLICY 判定顺序「先查禁止区」）：
  #9 系循环以 🤖 前缀开的**通知 issue**（请用户亲改 AGENTS.md——禁止区仅用户可改）；
  用户本人 2026-10-23T15:47:41Z 评论承诺亲改（`gh api issues/9/comments` 本会话
  亲核）；三处修复在现行 AGENTS.md 在位（本会话经系统注入现行版核对：仓库地图
  `docs/evolution/` 行、`frontend-module-boundaries.md` 行、常用命令表
  `smoke:server`/`test:canvas` 两行）。issue 待用户自行确认关闭；禁止区工作不
  入执行池，建 proposed 行无执行主体。
- **残缺标记档案**（`tools.ts:5,82` stub 如实降级）与**悬挂 run 探针**
  （161ce4ff running 1 条）：均已知状态——前者 BK-0005 done + M07 断言守护 /
  BK-0008 ready 承载，后者 BK-0011 ready 承载；无新项，不重复立项。
- **选题**：BK-9001（批复项优先 + 唯一 M 级批复项；排序论证见头部 (a)(b)(c)）。
  常规 ready 队列（BK-0022/0016/0017/0011/0008）因批复项优先（WORKFLOW §4 优先序
  ①）顺延，行未动；BK-9002~9005（L 级 + 前置未竟）按行内备注先拆分再实现，
  拆分排序归治理日。
- **skipSpec 判定**：M 项 + 修宪轮（SPEC 含 golden 方案为硬要求）→ 不免 SPEC。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE 全文 read；
  iterations/0009/0011/0012 PRD 全文 read（0010 无目录——已放弃，git log c381d1d
  在案）；`Skeleton.tsx:108-137` read（bp-head/rail-bp/结构）；`app.js:1790-1791`
  （面板开关）、`:1838-1846`（addLog）、lvl 调用面 grep；`app.css:315-330` read
  （面板与级别规则全文）；`server-sync.js:79-117` read（回放映射）；`llm.ts`/
  `engine.ts`/`handlers.ts` lvl 发射点 grep；`gate.mjs:28-196` read（normalize/
  场景/不变量/golden-created 通道）；`docs/adr/` ls（下一编号 0010）；
  `tests/golden/ui/` ls（12 基线文件）；gh issue list ×1 + gh api comments ×3
  （#1/#6/#9）。
