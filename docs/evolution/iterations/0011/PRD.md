# PRD · 迭代 0011 · BK-0026 golden 场景扩充实现：s4 工作流面板在线态 / s5 历史面板在线态（ADR-0009 · 修宪轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 00:35
> 来源：BACKLOG BK-0026（**本轮新立**，P0 / test / M / ready / 触UI=否，来源 issue#7；
> 本 PRD 落盘同时写入 BACKLOG 主池——批复同步说明见 §选题过程存证）。
> 主题归属：ROADMAP T2·质量基建 · 里程碑 M3 **实现阶段**（`docs/evolution/ROADMAP.md:49-54`
> 明载「实现阶段（golden 基线扩充与 tools/pixel-gate/ 改动）待用户批准后另行立项」——
> 用户批复已到，本项即该立项）。
> 选题依据：心跳档案 issue 面板批复栏为「approved：无」，但 PLAN 会话以 gh api 亲核
> （2026-10-24 00:2x 本会话执行）发现用户 OWNER 本人已于 2026-10-23T15:48:25Z~
> 15:50:05Z 对 **#8→#7→#5→#4→#3→#2→#1 七项 needs-approval issue 逐条评论「批准」**
> （无 🤖 前缀、其后无撤销/驳回、七 issue 全部仍 OPEN）——档案快照滞后于实况。按
> WORKFLOW.md §4 选题优先序 ①（用户 issue 批复产生的 ready 项＝修宪轮，最高优先，
> 优先于常规 ready 队首 BK-0022）以实况为准：七项批复全部落 BACKLOG ready P0
> （新增 BK-0025[#8]、BK-0026[#7]，BK-9001~9005[#1~#5] 入主池）。
> **七项批复内本轮取 BK-0026 的排序论证**：(a) 唯一已备妥完整技术方案的批复项——
> ADR-0009 草案（2026-10-23 治理日产出，BK-0010 承载，状态 done 的提案部分）已把
> 场景步骤/路由 fixture/时区钉死/不变量增量/回滚方案定稿，无需补设计即可进 SPEC；
> (b) 其余批复项的**共性前置**——#1~#5 五项 UI 修宪轮的改动面（工作流面板/历史面板/
> 会话区/日志面板）正需要 s4/s5 在线态基线在场做对照，否则每个 UI 轮都要自建基线
> （多事项迭代违反「一次迭代只做一件事」）；先收紧门禁再动 UI，保护面最大、返工最小；
> (c) 尺寸 M 且**零产品代码接触**，风险在七项中最小（BK-0025[#8 CI 断言] 亦小但独立
> 无解锁效应，顺延下轮；BK-9001~9005 均触 UI 且多项 L 级有未竟前置——BK-0016 会话
> API、BK-0021 NDP 均未完成，急选即夹带拆分，归后续轮次/治理日排序）。
> 与最近 3 次迭代零重叠：0007=纯 docs/evolution/ 补题轮（零实现）、0008=docs/ 新文档、
> 0009=apps/server/src + tests/smoke——本轮改动面 tools/pixel-gate/gate.mjs +
> tests/golden/ui/ 新增基线 + docs/adr/0009 状态行，与三者路径互斥；0007 补题轮已
> 对照全史确认无任何迭代触碰过 pixel-gate 场景定义与 golden 基线内容（golden 2026-10
> 定稿永不重录——本项是**新增** s4/s5 基线，不是重录 s0~s3，ADR-0009 §5 明载）。

## 结论

**建议做（本迭代即做）**：一句话理由——宪法第 2 条的执行手段目前只保护 4 个离线静态
场景（`gate.mjs:60-65`），ADR-0006/0007 落地的两块**已批准**在线态 UI（工作流面板
服务端分组、任务历史在线列表）处于保护盲区：任何回归破坏在线面板渲染，gate 不会红。
用户已批复 issue#7，ADR-0009 方案齐备，本迭代把门禁保护面 4→6 场景，是「收紧而非
放松」的修宪轮，并为刚批复的五项 UI 工作建立对照基座。

## 触 UI 分类结论

**否。** 论证（逐层对照宪法第 1 条三层）：

1. **零渲染路径改动**：`apps/web/**` 零字节改动（ADR-0009 影响面表明载「零改动——
   在线态 UI 已存在且已批准」）；被快照的工作流/历史面板在线态是既有已批准 UI 的
   现状，本项只**新增对现状的快照**，不改视觉/DOM 结构/交互任何一层。
2. **但落入 POLICY 需批准区**：「golden 基线重录与 `tools/pixel-gate/` 改动」两行
   均命中——这正是 needs-approval issue #7 的批准对象。用户 OWNER 本人批复在案
   （2026-10-23T15:48:48Z，gh 亲核），宪法第 3 条通道三要件之一（用户本人批准）
   满足；本 PRD 落盘同步补 ADR-0009 状态标注（AC5），授权链闭环。**属修宪轮**
   （reconstitutional=true）：正常路径经 golden-created 通道新增基线
   （`gate.mjs:114-117`；ADR-0009 §5「原则上无需 gate:update」），gate:update 仅
   作为门禁失败且原因归本轮自身时的一次性应急授权。
3. **防误触兜底**：验收要求 s0~s3 既有基线**逐字节零变化**（AC2）+ 六场景双跑全绿
   （AC1）——既有保护面不受任何削弱是硬验收。

## 背景（含代码事实源，2026-10-24 00:09-00:35 本会话只读核实）

1. **门禁现状**：SCENARIOS 仅 s0-initial / s1-select-node / s2-settings / s3-library
   四项（`tools/pixel-gate/gate.mjs:60-65`），全部为离线静态托管态（极简静态服务
   `gate.mjs:32-41`，无后端）；双重复核 = 像素 0 容差 pixelmatch（`gate.mjs:120-125`）
   + DOM 不变量 JSON 比对（`gate.mjs:84-100`）；**golden-created 通道**：基线文件
   不存在时首跑自动落盘并记 status golden-created（`gate.mjs:114-117`）——新增场景
   的合法入口，无需 --update。
2. **保护盲区（ADR-0009 §1）**：ADR-0006/0007 落地的「工作流」面板服务端分组
   （列表/保存/删除）与「任务历史」面板在线优先列表 + 回放，不在任何 golden 场景内。
3. **ADR-0009 草案完备（本会话全文复读核实，`docs/adr/0009-golden-s4-s5-online-panels.md`）**：
   - **s4-workflows-online**：注册路由 `**/api/v1/workflows` → fixture 3 条固定摘要
     （{id, name, updated_at}）；goto → localStorage.clear → reload → fonts.ready →
     稳定等待（复用 `gate.mjs:69-83` 既有流程）；clickRail('workflows')（与 s2/s3
     同型）；不变量增量字段：`#sidebar.open`、`#side-title`==='工作流'、服务端分组
     容器存在且卡片数 === 3。
   - **s5-history-online**：路由 `**/api/v1/runs**` → fixture 3 条 RunRow（done/
     error/running 三态各一，固定字面量；running 刻意纳入——僵尸行渲染正是
     ADR-0007 §3.2 关注面，当前 data/agentflow.db 实存 1 条 running 悬挂记录即活例，
     心跳档案探针 161ce4ff）；clickRail('history')；不变量增量：`#side-title`===
     '任务历史'、卡片数 === 3、三态 class 分布（runCardMeta 映射）。
   - **公共机制**：路由须 goto 之前注册；fetch 带 AbortSignal.timeout(8000)
     （`server-sync.js:17` 本会话复核），拦截即时 fulfill 无超时风险；**时区钉死
     `timezoneId:'UTC'`**（fmtTs 本地时区格式化 `server-sync.js:70-76`，不钉死则
     CI 与录基线环境渲染不同字符串 golden 必抖动；s0~s3 无时间渲染，参数不动）；
     fixture 字面量固定（ASCII+固定中文样例、整点毫秒时间戳）。
   - **回滚**（ADR §7）：SCENARIOS 回退两行 + 删 s4/s5 基线 4 文件即完全恢复现状。
4. **修宪授权链**：needs-approval issue #7（2026-10-23 治理日开，BK-0010 承载）→
   用户 OWNER 本人评论「批准」（2026-10-23T15:48:48Z，`gh api issues/comments` 亲核，
   无 🤖 前缀——批复仅认用户本人，即本案情形）。
5. **规模与 CI 影响**：gate.mjs 现 147 行（本会话 `wc -l` 实测），扩充后远低于新增
   源文件 400 行上限；CI ui-constitution 场景 +2 估 +20~40s（ADR §4），无新 npm
   依赖、无 workflow 配置改动（根 `package.json:11-12` gate 脚本零变化，场景自动
   被 `npm run gate` 拾取）。

## 目标

1. **实现**：按 ADR-0009 §3 定稿实现 s4/s5 两场景（路由 fixture + timezoneId +
   不变量增量字段）。
2. **落基线**：经 golden-created 通道新增 s4/s5 基线（各 png + invariants.json
   共 4 文件），s0~s3 既有基线逐字节不动。
3. **授权闭环**：ADR-0009 状态标注已获用户批复（issue#7 + 时间戳）。
4. **证明**：六场景双跑自一致性 + 反演演练（破坏供数 → s4/s5 红 → 还原复绿）。

## 非目标（out of scope）

- **不改产品代码**：`apps/web/**`、`apps/server/**`、`packages/shared/**` 零改动；
  在线态 UI 已存在且已获批，本项只快照不实现。
- **不重录 s0~s3**：若扩充过程中 s0~s3 出现非零 diff，立即中止排查——那是既有基线
  漂移信号，须另立 ADR 说明，不得借本项重录（ADR-0009 §4 风险对策原文）。
- **不做 s5 回放展开**（点击卡片二次 fetch + 展开 DOM——ADR §3 明示后续扩展候选，
  首批不并入，控制批准面与抖动风险）。
- **不动 CI 配置**：`.github/**` 零改动。
- **不处理其余六项批复**：BK-0025 / BK-9001~9005 已入池 ready P0，逐轮消化；
  L 项拆分排序归后续轮次/治理日。
- 不更新 ROADMAP / metrics 状态（CLOSE 职责；本 PRD 随附的 BACKLOG 批复落行除外）。

## 用户故事

1. 作为用户（宪法主权者），我批复了 #7，期望门禁保护面按 ADR-0009 如实收紧到在线
   面板，且我定稿的 4 个静态场景像素一分不动。
2. 作为 test-manager，未来任何改动破坏工作流/历史面板在线渲染时，我需要 gate 直接
   变红，而不是靠人眼发现。
3. 作为 code-developer（后续 #1~#5 UI 修宪轮的执行者），我需要 s4/s5 在线态基线在场，
   使我的 UI 改动有像素对照面，而不是先自建基线再改。
4. 作为协调者，我需要修宪授权链完整在档（issue#7 批复评论 + ADR 状态行 + 迭代目录
   产物），全程可审计。

## 需求条目

- **REQ-0026-01 · 场景实现**：按 ADR-0009 §3 实现 s4-workflows-online 与
  s5-history-online——per-scenario 路由拦截 fixture（goto 前注册）、
  `browser.newPage({ timezoneId:'UTC' })`（仅 s4/s5 新增参数，s0~s3 不动）、不变量
  采集器增量字段（s4：`#sidebar.open`/`#side-title`/服务端分组卡片数；s5：
  `#side-title`/卡片数/三态 class 分布）。fixture 为固定字面量。
- **REQ-0026-02 · 基线新增通道**：s4/s5 基线经 golden-created 通道首跑落盘
  （`gate.mjs:114-117`）；**gate:update 不是本项入口**（ADR §5）；仅在门禁失败且
  原因归本轮自身改动时按修宪轮授权应急一次。
- **REQ-0026-03 · 既有基线冻结**：s0~s3 的 4 png + 4 invariants.json 在产品提交
  diff 中逐字节零变化（AC2 机器核对）。
- **REQ-0026-04 · ADR 批复标注**：`docs/adr/0009` 状态行由「草案 · 待用户批准
  （批准前零实现）」改为「已批准（issue#7 用户批复 2026-10-23T15:48:48Z，PLAN 0011
  会话 gh 亲核）· 实现于迭代 0011」，显著声明按已批准通道改写。
- **REQ-0026-05 · 改动面白名单**：产品提交 git diff 仅允许——`tools/pixel-gate/
  gate.mjs`、`tests/golden/ui/` 下 s4/s5 **新增** 4 文件、`docs/adr/0009-*.md`
  状态行；其余任何路径零改动（AC4 机器核对）。
- **REQ-0026-06 · 防抖动设计细化（SPEC 职责）**：时区钉死、fixture 字面量、稳定
  双帧等待复用（`gate.mjs:76-83`）之上，SPEC 须给出在线态渲染完成的确定性等待策略
  （异步 fetch 晚于首帧的风险）与 windows-latest（CI 权威）+ 本机双环境自一致性
  验证步骤。

## 非功能要求

1. **确定性优先**：场景重放在任何环境字节一致（timezoneId / 字面量 fixture / 双帧
   稳定三重保障）。
2. **时长可控**：CI 增量估 +20~40s；SCENARIOS 结构不引入每场景进程/浏览器开销。
3. **可审计**：修宪链三件套在档（issue 批复评论 / ADR 状态行 / PRD-SPEC-REPORT）。
4. 规模上限不适用新文件（gate.mjs 为存量 147 行文件，扩充后仍远低于上限）。

## 验收标准（Given / When / Then）

- **AC1 · 六场景自一致性**：Given gate.mjs 已扩充 s4/s5 且 `npm run build` 完成，
  When 首次运行 `npm run gate`，Then s0~s3 pass diffPx=0 且 s4/s5 报 golden-created；
  When 第二次运行 `npm run gate`，Then 6 场景全 pass、0 diff（ADR-0009 §5.2/§6.1）。
- **AC2 · 既有基线零漂移**：When 核对产品提交 git diff，Then `tests/golden/ui/` 下
  s0~s3 的 8 个既有文件零改动，仅新增 s4/s5 共 4 个基线文件。
- **AC3 · 保护力反演**：When（VERIFY 反演演练）临时把 s4 fixture 置空（0 条工作流）
  重跑 gate，Then s4 FAIL（像素 diff 或不变量卡片数不符）；还原 fixture 后复绿
  （ADR-0009 §6.2）。
- **AC4 · 产品代码与契约零变化**：When 核对 git diff，Then `apps/web/**`、
  `apps/server/**`、`packages/shared/**`、`.github/**` 零改动；`npm test` 全绿
  （ADR-0009 §6.3）。
- **AC5 · ADR 批复标注在档**：Then `docs/adr/0009` 状态行含「已批准（issue#7）」
  与批复时间戳，issue #7 链接在档。
- **AC6 · CI 权威盯守**：推送后 ui-constitution（windows-latest）6 场景绿；若 CI
  红，以 CI 为权威排查修复，不得以本机绿自判通过（宪法第 2 条；AGENTS.md 已知陷阱）。

## 依赖与风险

- **依赖**：`npm run build`（gate 前置）；Playwright 既有版本（无新依赖）。
- **风险 1 · 在线态时序抖动**（异步 fetch 渲染晚于稳定帧）→ REQ-0026-06 确定性等待
  策略，SPEC 定稿。
- **风险 2 · CI 与本机渲染差异** → golden 权威在 CI；本机仅参考（AGENTS.md 已知
  陷阱原文）；AC6 盯守。
- **风险 3 · s0~s3 意外漂移** → 立即中止 + 另立 ADR（非目标 2）；gate:update 应急
  仅限本轮自身原因，且仅一次。
- **风险 4 · 心跳档案批复快照滞后（流程性风险）**：本轮已按实况处理并全程存证；
  建议脚本侧复查批复采集逻辑（仅记录，超出本迭代范围，不在本项实现）。
- **风险 5 · 其余六项批复积压**：已全部落 ready P0；BK-0025 独立小项下轮可取；
  BK-9002~9005（L）按 BK-0013 拆分先例于治理日或 SPEC 先行拆分，防止心跳直接
  抓取 L 项。

## SPEC 要求（skipSpec=false）

WORKFLOW §4 BUILD 修宪轮条款「SPEC 须含 golden 重录（本案：新增）方案」为硬要求，
本项不免 SPEC。SPEC 须含：受影响文件清单（REQ-0026-05 白名单）、s4/s5 完整步骤与
fixture 字面量、确定性等待策略（REQ-0026-06）、双环境自一致性验证、回滚步骤
（ADR-0009 §7）。

---

## 选题过程存证（含档案差异说明）

- **批复同步（本轮核心事实）**：心跳档案 issue 面板批复栏为「approved：无」；PLAN
  会话执行 `gh api repos/liusuren123/agentflow/issues/comments?per_page=100`（两次，
  2026-10-24 00:2x）亲核：用户 OWNER 本人（liusuren123，is_bot=false）于
  2026-10-23T15:48:25Z~15:50:05Z 依 #8→#7→#5→#4→#3→#2→#1 顺序逐条评论「批准」，
  评论无 🤖 前缀、其后无任何撤销/驳回评论、七 issue 全部 OPEN（`gh issue list
  --state all` 亲核）。按 WORKFLOW §4 选题优先序 ① 与用户主权原则（批复仅认用户
  本人评论——即本案情形），**以实况为准**：七项批复全部落 BACKLOG ready P0 行
  （新增 BK-0025[#8]、BK-0026[#7]；BK-9001~9005[#1~#5] 自待批准区迁移入主池）；
  **#6（BK-9006 参数扩展杂项）未获批**，维持 needs-approval，不建行。
- **排序取 BK-0026 的论证**见头部选题依据 (a)(b)(c)；BK-0022（P1/S 常规队首，
  STATE 上轮 last_result 属意项）因批复项插队顺延，仍为常规轮首选，行未动。
- **#9（user-request）评估——不建行**：非用户方向提案，正文为 🤖 前缀循环通知
  （2026-10-23 治理日开给用户的亲改请求；AGENTS.md 属 POLICY 禁止区仅用户可改）；
  用户已于 2026-10-23T15:47:41Z 评论承诺亲改；本会话核实**三处漂移已全部修复在
  现行 AGENTS.md**（`AGENTS.md:28` docs/evolution/ 仓库地图、`:30`
  frontend-module-boundaries.md、`:48-49` smoke:server/test:canvas 两命令行；最近
  触达提交 21d94a3，2026-10-24），issue 待用户自行确认关闭。禁止区工作不入执行池。
- **残缺标记档案**：grep 命中仅 `tools.ts:5,82` stub 如实降级（BK-0005 已 done 且
  有 M07 断言守护 / BK-0008 ready 待真实接入）——已知状态，无新项。
- **悬挂 run 探针**：1 条 running（161ce4ff 智能客服助手，含 approval/notify 节点）
  ——BK-0011（ready）承载，证据已在案，无新项。
- **rejected**：无——无 ③ 类处置。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE 全文 read；
  iterations/0007/0008/0009 PRD read；ADR-0009 全文 read；`gate.mjs` 1-130 read +
  `wc -l`=147；`package.json:11-12,19-20` grep；`server-sync.js:15-19/70-77/122-132`
  read；AGENTS.md 修复三处 grep；git log AGENTS.md；gh api comments ×2 + gh issue
  list ×1 + gh issue view #9 ×1。
