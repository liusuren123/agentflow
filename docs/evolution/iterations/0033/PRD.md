# PRD · 迭代 0033 · BK-0036 呈现三件套·网页展示节点（webshow）：NDP 定义 + 呈现承载 + 画布 iframe 安全呈现（修宪轮 · 批次 1）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 18:52（工作树
> `.zcode/worktree/feat/0033-iter`，分支 `feat/0033-iter`）
> 来源：BACKLOG BK-0036（ui-proposal / 触UI=是 / **P0 / M / ready** / 来源 issue#3，
> BACKLOG.md:49）。2026-10-25 治理日（W43 第四次）由 BK-9003[L→skipped] 拆分的
> 实现段**批次 1**；迭代 0030 PLAN 轮晋升 ready（前置 BK-0035 SPEC 先行已于迭代
> 0029 终态 done，晋升条件兑现——iterations/0029/REPORT.md 明载）。
> 授权链：issue#3 用户批复承继（2026-10-23T15:49:32Z；BACKLOG BK-9003 行 :74
> 在案；本会话 `gh issue view 3 --comments` 亲核 owner（association: owner）评论
> 「批准」在案，issue 仍 OPEN 且标签 needs-approval——批复只认用户本人评论，符合
> POLICY.md 禁止区第 5 条）+ ADR-0015（迭代 0029 落盘，260 行）——**修宪通道三要素
> 齐备**（ADR 先行 + 用户批准 + 同迭代 golden 增量/重录，宪法第 3 条）。
> 定界权威：ADR-0015（§2.1 DEFS 字段级草图 / §2.4 schema 纪律自检九条 / §3 呈现
> 承载定界 / §4.1 iframe 安全呈现三写死 / §4.4 PTY 边界切割 / §4.5 SSE 消费护栏 /
> §5 分批修宪编排 / §6 golden 双通道预案 / §7 BK-0036 定界权威字面量）+ BACKLOG
> BK-0036 行（ADR §7 权威字面量逐字回写）+ ROADMAP 待办节实施序列
> （ROADMAP.md:190-192「BK-9003 链：BK-0036 网页展示 → BK-0037 终端只读流 →
> BK-0038 JSON 画布（一节点一修宪迭代，0038 链终轮回执 #3）」——序列为 PLAN
> 指导、优先于主池表序，ROADMAP.md:184-186）。
> 先例：迭代 0013（BK-9001，修宪轮 golden-created + gate:update 重录双通道直系
> 先例）、迭代 0018/0021/0022（BK-0031/BK-0021，nodes.baseline.json 快照再生产 +
> nodes-dirs/defs-drift/readme-consistency 守卫联动机制）、迭代 0031/0032
> （BK-0033/BK-0034，BK-9002 链两轮修宪实现：agent 节点入列 + goal 面板，含
> 「节点先入列 → 面板后落地」的实施序论证）、迭代 0026/0029（smoke 断言组扩充实态
> / 纯文档轮零代码机器证明）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9003 链
> 实现段批次 1；差异化主轴「画布编排 × 深度智能体工作台」，ROADMAP.md:124-130/
> 156-168）。
> 批次编排：单项单迭代（M 级，**需独立 SPEC，skipSpec=false**）。issue#3 名下
> 姊妹子项 BK-0037（终端只读流）/BK-0038（JSON 画布，链终轮）未竟：本轮 done
> 仅发**进度回执、不关 issue#3**（关单留 BK-0038 终轮 CLOSE，沿 issue#2 链终
> 先例 iterations/0032/REPORT.md）→ **itemContinues=true**。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 18:50~18:52 核实）

- **跨迭代续选**：无——BK-9002 链（BK-0032 SPEC → BK-0033 节点 → BK-0034 面板）
  已于迭代 0027/0031/0032 相继终态 done，issue#2 已链终关单（iterations/0032/
  REPORT.md + 本会话 `gh issue list --state all` 亲核 issue#2 = CLOSED）；SPEC 四连
  （0032/0043/0035/0039）已收官。本轮从零选题，进入实现段。
- ① **批复同步**：心跳档案「approved：无；rejected：无」→ 本轮**零动作**（无新
  批准可消费、无 rejected 待改写 skipped、无「来源=issue#N」缺行需建 ready 行）。
  档案 issue 面板 #3~#6 虽仍 OPEN 且标签 needs-approval，但其批复均已在历次
  PLAN 轮承继入行（#2~#5 于 2026-10-23、#6 于 2026-10-24 批复——BACKLOG
  BK-9002~9006 行在案）；本会话 `gh issue view 3 --comments` 亲核 owner 评论
  「批准」+「🤖 已收到批准：进入实施通道」两段在案。**下一个预期新批项 = ADR-0014
  附录 A 的 PTY 依赖/出站清单**（issue 尚未开，开 issue 归协调者/脚本，沿
  BK-0027→#10 先例）——非 PLAN 轮动作，本轮零处理（如实记档，0029/0030/0031 PRD
  同判）。
- ② **user-request**：无（档案面板仅 needs-approval 四项；无 user-request 条目）
  → 无建行、无 uiIssueNumbers。
- ③ **rejected**：无 → 无 skipped 改写。
- ④ **常规选题（本轮入选路径 = 优先序①「用户 issue 批复产生的 ready 项」）**：
  ready 队列逐项处置（BACKLOG 主池亲核，状态列 ready 者恰 4 项）：
  - **BK-0036**（:49，P0/M，issue#3，呈现三件套·网页展示修宪轮）——**本轮入选**；
  - BK-0037（:50，P0/M，issue#3，终端只读流）——同链批次 2，ADR-0015 §5 序在
    0036 之后；
  - BK-0038（:51，P0/M，issue#3，JSON 画布）——同链批次 3，**链终轮**；
  - BK-0040（:53，P0/M，issue#4，右栏容器+git 修宪轮）——ROADMAP 实施序列排位在
    BK-9003 链之后（ROADMAP.md:193-194）。
  - 四项全 P0/M——「优先 S/M」口径不区分，故以 **ROADMAP 待办节实施序列定序**
    （序列优先于主池表序，ROADMAP.md:184-186）：SPEC 四连与 BK-9002 链均已收官，
    序列第 3 位 = **BK-9003 链实现段批次 1 = BK-0036**。亦系「已获批 issue 的
    ready 项」（来源 issue#3 直连，授权链闭合）。
  - **PLAN 轮晋升义务（本轮一并处置，先例沿 0028/0030/0031 轮）**：BK-0050
    晋升条件「前置 BK-0033 CLOSE 后随链晋升」已随迭代 0031 终态 done 兑现
    （iterations/0031/REPORT.md 明载 agent 节点已入列）→ 本轮将 BK-0050
    proposed → ready 回写 BACKLOG（回写随归档提交入库）。BK-0046 / BK-0049 的
    晋升条件为「按 ROADMAP 修宪链排期即晋升（短修宪穿插项）」（非硬前置门控，
    ROADMAP.md:198-201 明载「可随时穿插」）——本轮不插队，维持 proposed 零回写。
    **维持 proposed 的其余各项**：BK-0041/0042（前置 BK-0040 未 CLOSE）、
    BK-0044（转 ready 门槛余一 = ADR-0014 附录 A needs-approval 获批，issue 未开）、
    BK-0047（前置 BK-0019 proposed）、BK-0048（前置 BK-0020 proposed）、
    BK-0051（P1/S，doc，proposed——doc 项心跳不选，WORKFLOW §4）。
- **侦察档案核对（ready 队列非空，本轮不触发补题；逐条留证）**：
  - `apps/server/src/tools.ts:5`（模块头「not implemented」注释）与 `:138`
    （未注册外部工具兜底 stub 工厂）——browser MCP 工具的**如实降级设计面**
    （ADR-0011 评估终态 = 近期不实施、维持 stub；BK-0009 done），非新立项对象
    （0027~0032 各轮 PRD 同判）；
  - `apps/server/package-lock.json:787` —— base64 哈希串偶合「XXX」，非标记；
  - 悬挂 run 探针 `[]` —— BK-0011 启动扫尾（迭代 0019 done）预期表现，无悬挂
    残留可立项；
  - 覆盖差集 / 文档漂移 / dogfooding 由治理日承载（BK-0051 在库，下个治理日批
    处理消化）——心跳不重复采集。
- 与最近 3 次迭代重叠面：0031（BK-0033 agent 节点入列）、0032（BK-0034 goal
  面板）为 BK-9002 链两轮修宪实现；0030（BK-0039）为纯文档轮。三者的迭代产物
  本轮**零触碰**（BK-0034/BK-9003/BK-9004 等行维持不动，本轮仅 BK-0050 状态列
  晋升 + BK-0036 备注追加实施轮次记）。

## 结论

**建议做（本迭代即做）**：一句话理由——BK-9003 链（呈现三件套）是 T5 差异化定位
「画布编排 × 深度智能体工作台」的**呈现层**（现有节点体输出区只有纯文本短摘要，
app.js:897 截断 160 字 / app.js:1897 单行 textContent 写入），ADR-0015 已把三节点
的 DEFS / 承载 / 安全面 / golden 预案全部定界完毕、授权链闭合，且前置 BK-0035 /
BK-0021（NDP 目录制）/ 0026 均已 done——「零悬念可开工」状态；按 ADR-0015 §5
「一节点一迭代」，本轮取批次 1（webshow）。

## 触 UI 分类结论

**是——修宪轮（reconstitutional=true）。** 论证（三要素齐备，宪法第 3 条）：

1. **shared DEFS 新增即触 UI**（POLICY 需批准区「shared DEFS 变更」+「golden 基线
   重录」双命中）：webshow 节点入列 → 节点库 **output 分组自动新增一行条目**
   （DEFS×CATS 通用渲染 app.js:329-336——本会话亲核为数据驱动渲染，非代码改动，
   但属**数据驱动的像素变化**）→ s3-library 基线变化须修宪重录；新场景
   s10-webshow-node 基线落盘。授权链 = issue#3 用户批复承继（2026-10-23T15:49:32Z，
   本会话 gh 亲核 owner 评论「批准」在案）+ ADR-0015 §2/§6/§7——宪法第 3 条
   通道在案。
2. **前端确需改动（与 BK-0033 的「前端零改动」不同）**：ADR-0015 §4.1 明确
   「节点体输出区按 DEFS 分支渲染 `<iframe>`（新选择器纯插入）」——本轮
   **app.js / app.css 预期有改动**（iframe 安全呈现），Skeleton.tsx 预期零改动
   （节点体动态渲染，无新静态骨架；若需挂载点则纯插入并重录 s0——ADR-0015 §4 预案）。
   改动纪律 = **纯插入优先**（新选择器 + 新分支，不改既有行）。
3. **golden 双通道**（ADR-0015 §6 + 迭代 0013 BK-9001 直系先例）：s10 新场景走
   golden-created（基线 png 不存在即落盘，gate.mjs 通道见 :247-253 区间同款）；
   s3-library 受波及走**修宪轮 gate:update 重录**（WORKFLOW §4 BUILD 修宪轮条款
   「脚本在 gate 失败时允许执行一次 npm run gate:update」——issue#3 批复在案）；
   s0/s1/s2/s4~s9 预期零波及（无 rail/顶栏/默认工作流/面板变化；icon `globe` 与
   类目色 `--cat-output` 均既有常量，本会话亲核 app.js:64 / app.css:20）——
   gate 全场景实测确认，任一意外红即中止排查，**不许顺手重录**。

## 背景（代码事实，本会话 2026-10-25 18:50~18:52 只读核实）

1. **DEFS 草图（ADR-0015 §2.1 字段级草图，终稿代码块归实施 SPEC）**：type=`webshow`
   / identity：name 网页展示 · category `output` · icon `globe`（复用 ICON_PATHS
   既有键 app.js:64；`globe` 现由 websearch 占用——packages/shared/src/nodes/
   websearch/node.ts:10，**同键复用不新增**，ADR §2.1 已载同款口径）· keywords
   「webshow 网页 展示 预览 iframe 呈现」· desc「将上游网址以内嵌安全视图呈现
   （终点节点）」/ ports.inputs `[{ id:'in-url', label:'网址', type:'any' }]`（双输入
   备选案已否决）/ ports.outputs `[]`（sink 同构 reply）/ params `url`
   （text，default `''`，静态兜址·输入端口值优先）+ `sandbox`（toggle，default
   `true`）/ binding `{ handler:'webshow', capabilities:{ data:true } }`。
2. **schema 纪律自检（ADR-0015 §2.4，本会话复核约束在案）**：端口 id 须匹配
   `^[a-z][a-z0-9-]{2,31}$`（nodes.schema.ts:18-21）——`in-url` 合规；端口类型 ∈
   五枚举（:13 `any` ∈ ✓）；params widget×default 矩阵（:50-58）——text default `''`
   （string）✓、toggle default `true`（boolean）✓；capabilities strictObject 键集 ⊆
   十 kind（:72-83）——仅 `data` ✓；category ∈ 七枚举（:15）——`output` ✓；**零新
   端口类型 / 零新 widget / 零新类目 / 零新增 CSS 变量**。
3. **聚合层与快照现状（与 ADR-0015 §2.4/§5 记载的计数有 1 的偏差，按代码事实
   转写，沿迭代 0027/0029 行号笔误转写先例）**：`packages/shared/src/nodes.ts`
   现 **144 行**、17 个节点 import（:19-35）+ **17 键** NODES（亲核
   `grep -cE "^  [a-z]+: synthesize"` = 17）；`nodes.baseline.json` 现 **17 键**
   （node -e 亲数：trigger…approval，含 iteration 0031 落地的 agent）→
   **本轮再生产 = 18 键**（ADR-0015 §2.4/§5 写的「16→17」系 agent 节点入列前的
   旧数；实施轮的 ADR 增补按代码事实校正）。三导出（NODES / NODE_NAMES /
   paramDefaultsOf）不变。
4. **守卫/契约测试联动（BACKLOG BK-0036 行既定）**：nodes-dirs 目录计数
   D===17→**18**；defs-drift 默认值断言 +1（webshow：url `''` / sandbox `true`）；
   readme-consistency（README 由 `tools/gen-node-readmes.mjs` 生成，文件在库）；
   handlers-coverage（随 engine HANDLERS +webshow 键自动满足）。
5. **呈现承载落点（ADR-0015 §3）**：`apps/server/src/handlers.ts` 现 **298 行**，
   BASIC_HANDLERS（:17）新增 `webshow` 键——形态沿 reply 同构（:225-232：
   消费输入 → `ctx.outputs!.push` → `emit('output',{text})` → 返回 `out` 摘要），
   增量 ≈ +12~15 行 → ≈310~313 ≤400（AGENTS.md 硬性约定 4）；**engine.ts 零改动**
  （:26-29 `{...BASIC_HANDLERS}` 自动展开注册）。webshow 语义：输入为 http(s)
   URL → 校验通过原样透传呈现（outputs 收 URL，out 摘要「已呈现网页 · <url>」）；
   非 URL / 空输入 → warn + 占位降级，**不伪造结果**（对齐
   `tools.ts:138` stub 如实降级纪律）。**服务端零出站**（不抓取、不代理、不转存；
   抓取是既有 http 节点职责，出站走 guard.ts 既有纪律——`handlers.ts:91`
   `guardedFetch` 先例，webshow **不得**调用它）。
6. **前端渲染面现状（ADR-0015 §4.1 的现实约束）**：节点体输出容器 = `.node-out`
   （app.js:775 建节点时随 `el.innerHTML` 一并生成），写入函数 `setNodeOut`
   （app.js:1897）用 `textContent` 写单行文本——**iframe 不能塞进 textContent**，
   故 webshow 需在节点体输出区引入新的呈现容器/分支（纯插入新选择器 + 新分支），
   既有 `setNodeOut` 文本路径对其他节点零变化。节点库 output 分组渲染 =
   app.js:329-336（DEFS×CATS 数据驱动）。
7. **golden 面现状**：`tools/pixel-gate/gate.mjs` 现 **10 场景 s0~s9**（:219-234
   SCENARIOS 表亲核；s8/s9 分别由迭代 0031/0032 落地）；`tests/golden/ui/` 现
   s0~s9 共 10 组 png + invariants。**新场景按落盘时序 = s10**（ADR-0015 §6
   「场景编号按落盘时序（预期 s10+），不锁死具体号」）。
8. **smoke 基线**：`tests/smoke/smoke-server.mjs` 现 **1129 行**，基线
   **104 passed / 0 failed**（metrics 迭代 0031/0032 两行一致；iteration 0026~0030
   为 95/0，A 组 +82 行后为 104/0）。本轮新增 webshow 断言组（URL 校验 / 降级
   路径）+ 既有 104 零回退。
9. **工作区状态**：工作树 `git status --short` 仅 `M docs/evolution/STATE.md`
   （机制件，PLAN 前的开工标记）；HEAD = `84ee8ec`；`docs/adr/` 现行至 0016
   （ls 亲核）。

## 目标与范围

**做（本迭代产品提交面 = 受影响文件清单；M 级——SPEC 由 spec-designer 终稿细化，
本清单为 ADR-0015 §5/§7 + BACKLOG BK-0036 行既定口径）**：

| # | 文件 | 动作 | 预算（行） |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/webshow/node.ts` | 新增（`satisfies NodeDefJson` 纯数据模块） | ~30（ADR §2.1 草图为纲） |
| 2 | `packages/shared/src/nodes/webshow/README.md` | 新增（生成器产出） | 生成 |
| 3 | `packages/shared/src/nodes.ts` | +1 import +1 键 | 144 → ~147 |
| 4 | `packages/shared/test/nodes.baseline.json` | 再生产（17→**18** 键，经批准通道） | 快照 |
| 5 | `packages/shared/test/`（nodes-dirs / defs-drift / readme-consistency 联动） | 小改 | SPEC 定 |
| 6 | `apps/server/src/handlers.ts` | BASIC_HANDLERS +webshow 键（URL 校验 / 降级） | 298 → ~310~313 |
| 7 | `apps/server/src/engine.ts` | **零改动**（:26-29 自动展开注册） | 0 |
| 8 | `apps/web/src/legacy/app.js` | 节点体输出区 iframe 安全呈现分支（纯插入） | SPEC 定 |
| 9 | `apps/web/src/app.css` | 新增选择器（纯插入） | SPEC 定 |
| 10 | `apps/web/src/Skeleton.tsx` | **预期零改动**（动态创建；若需挂载点则纯插入 + s0 重录） | 0 |
| 11 | `tests/smoke/smoke-server.mjs` | webshow 断言组新增（URL 校验 / 降级路径） | SPEC 定 |
| 12 | `tools/pixel-gate/gate.mjs` + `tests/golden/ui/` | +s10 场景行 + s10 golden-created 基线 + s3 重录 | SPEC 定 |
| 13 | `docs/adr/0015-presentation-triplet-nodes.md` | **实施轮增补**（状态行 + §7 BK-0036 实施纪要 + §2.4/§5 计数按代码事实校正 17→18） | 机制件 |

**不做（out of scope）**：

- BK-0037（终端只读流）/ BK-0038（JSON 画布，链终轮）/ BK-0040~0042 等其他链
  实现项（一次迭代一件事；ADR-0015 §5 一节点一迭代）。
- **服务端抓取网页 / 代理 / 转存 / 预渲染**——呈现是纯数据变换；抓取归既有 http
  节点（出站走 guard.ts，status quo 零变化，ADR-0015 §4.1「服务端零出站边界」）。
- **用户输入面 / 交互式终端 / node-pty / PTY 会话**——ADR-0015 §4.4 边界切割写死
  （PTY 专属面归 BK-0045 / ADR-0014 附录 A 另批）；实施期若确需用户输入或进程面
  即越出 issue#3 承继授权 → **立即中止转 needs-approval**。
- **新增 SSE 事件类型**（`events.ts` 15 种内取用；本节点用既有 `output` 事件
  （events.ts:33）→ events.ts 零 diff 为机器证明）；确需新增即中止转
  needs-approval（ADR-0015 §4.5 护栏，BK-0016 先例）。
- 新增 npm 依赖 / 新 env 语义 / 新出站类别 / 新 API 端点（lock 与 config 零变化
  为机器证明）。
- 新端口类型 / 新 widget / 新类目 / 新 CSS 变量（ADR-0015 §2.4 冻结枚举内组合，
  零溢出）；`height` 类呈现尺寸参数（ADR §2.1 记为实施 SPEC 可选项，默认不做）。
- `allow-scripts + allow-same-origin` 组合的 iframe sandbox 放宽（ADR-0015 §4.1
  明令禁止——该组合等价于无 sandbox）。

## 验收标准（Given/When/Then）

- **AC1 · DEFS 入列与契约全绿**：Given `nodes.baseline.json` 现 **17 键**、NODES
  17 目录、守卫/契约测试现状绿，When `nodes/webshow/node.ts` 按 ADR-0015 §2.1
  落盘 + `nodes.ts` +1 import +1 键 + baseline 再生产 + 守卫/契约联动更新，
  Then `npm test` 全绿（nodes-dirs **D===18**、defs-drift 含 webshow 两参数默认值
  （url `''` / sandbox `true`）、readme-consistency、handlers-coverage ⊇ NODES）；
  `node -e` 亲数 baseline **18 键含 webshow**、快照 diff 恰 +1 键。
- **AC2 · 呈现承载语义（URL 校验 / 如实降级）**：Given 含 webshow 节点的工作流
  （触发 → webshow，smoke mock 形态 SPEC 定），When 输入为 http(s) URL 运行至
  完成，Then ① outputs 汇入该 URL、out 摘要形如「已呈现网页 · <url>」、emit
  `output` 事件（既有事件类型，零新增）；② 输入为非 http(s)（如 `javascript:` /
  `data:` / 非法串）或空 → **warn + 占位降级，不伪造结果**，run 不崩；
  ③ **服务端零出站**（`grep` 确认 webshow handler 无 `guardedFetch` / `fetch` /
  `http` 出站调用；`guard.ts` 零 diff）。`npm run smoke:server` webshow 断言组
  新增全绿 + 既有 **104 零回退**。
- **AC3 · 画布 iframe 安全呈现**：Given 画布含 webshow 节点，When 运行产出 http(s)
  URL，Then 节点体输出区以 `<iframe>` 呈现该 URL 且带 `sandbox` 属性（默认最严：
  禁脚本 / 禁同源 / 禁表单 / 禁弹窗）；参数 `sandbox=false` 时移除该属性（用户
  显式选择，责任翻转）；非 http(s) 协议在**前端侧**同样拒绝呈现并显示占位
  （双保险，ADR-0015 §4.1「前端校验 + handler 侧双保险」）；既有节点的
  `setNodeOut` 文本路径行为零变化（其他节点输出区像素零变化）。
- **AC4 · 修宪 golden 双通道**：Given gate 现 10 场景 s0~s9 全绿基线，When
  gate.mjs +s10 场景行（触发形态沿 ADR-0015 §6 与 s8 先例：画布加载含 webshow
  节点的最小工作流 fixture，SPEC 定），Then 首跑 s10 **golden-created** 落盘、
  二跑 11 场景全绿 diffPx=0；s3-library 因 output 分组自动新增「网页展示」条目经
  **修宪轮 gate:update 一次通道**重录后全绿（授权链在案）；s0/s1/s2/s4~s9 逐字节
  零漂移（意外红即中止排查，不许顺手重录）。
- **AC5 · 白名单与零依赖/零契约机器证明**：When `git show --numstat <产品提交>`
  核对，Then 改动恰在受影响文件清单（表 1~12）内；`package-lock.json` 零变化
  （零依赖）；`packages/shared/src/events.ts` 零 diff（零新增 SSE 事件）；
  `apps/server/src/engine.ts` 零 diff（自动注册）；`apps/server/src/guard.ts` 零
  diff（零出站类别）。
- **AC6 · 手动 E2E 四点位**（BACKLOG BK-0036 行既定）：① 节点库 **输出** 分组
  出现「网页展示」条目（globe 图标）；② 拖入画布（output 类目色标题栏 +
  in-url 入端口 + url/sandbox 两个 widget 行 + 端口/输出区渲染）；③ 连线
  （in-url ← 上游 any 出）；④ 运行（节点体输出区 iframe 呈现上游网址；非 http(s)
  输入如实降级提示）。全程零 console error。
- **AC7 · 指针抽样可开**：When 从本 PRD / ADR-0015 引用的代码指针抽样 ≥5 条逐一
  打开（建议：`packages/shared/src/nodes.ts:19-35`/NODES 17 键、
  `packages/shared/test/nodes.baseline.json` 17 键、`packages/shared/src/nodes/reply/node.ts`
  sink 样板、`packages/shared/src/nodes.schema.ts:13/:15/:18-21/:50-58/:72-83`、
  `apps/server/src/handlers.ts:17/:225-232/:91`、`apps/web/src/legacy/app.js:64/:329-336/:775/:1897`、
  `apps/web/src/app.css:20`、`tools/pixel-gate/gate.mjs:219-234`、
  ADR-0015 §2.1/§3/§4.1/§5/§6/§7、BACKLOG BK-0036/BK-9003 行、issue#3 链任
  五以上），Then 全部命中无误。

## 非功能要求

1. 新增源文件 ≤400 行（AGENTS.md 硬性约定 4）：`webshow/node.ts` ~30、
   `handlers.ts` ≤400（增量后 ~310~313）；改动文件增量按上表预算。
2. 零新依赖 / 零新 env / 零新出站类别 / 零新增 SSE 事件 / 零新增 API 端点 /
   零新端口类型 / 零新 widget / 零新类目（lock、config、events.ts、engine.ts、
   guard.ts 零 diff 为机器证明）。
3. **安全面（ADR-0015 §4.1 三写死，本项最高优先）**：服务端零出站；iframe
   `sandbox` 默认最严；协议白名单仅 http(s)（前端 + handler 双保险）；
   **禁止 `allow-scripts + allow-same-origin` 组合**；`sandbox=false` 属用户显式
   选择（责任翻转，界面须可见该状态）。
4. EOL 纪律：新文件 LF、无 BOM。
5. 产品提交恰一个（Conventional Commits，如 `feat(node): BK-0036 网页展示节点
   （webshow NDP 定义 + 呈现承载 + 画布 iframe 安全呈现，修宪轮）`）；修宪轮
   golden 变更与产品代码同迭代落地（宪法第 3 条三要素）。
6. 回滚 = `git revert` 单提交（含 s10 基线与 s3 重录回退）。
7. `npm run gate:update` 仅限 s3-library 重录一次通道（修宪轮条款）；其余场景禁改
   基线，禁为变绿而放宽门禁（WORKFLOW §6 护栏 2/9）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| s3 重录通道被泛化（顺手重录其他场景） | AC4 硬边界：仅 s3-library 走 gate:update 一次；s0/s1/s2/s4~s9 意外红 = 中止排查（ADR-0015 §6 预期零波及论据：globe 图标 app.js:64 与 --cat-output app.css:20 均既有常量，本会话亲核） |
| iframe 呈现引入 XSS / 沙箱逃逸面 | ADR-0015 §4.1 三写死（sandbox 默认最严 + http(s) 白名单 + 服务端零出站）+ AC3 双保险断言；禁 `allow-scripts + allow-same-origin`；协议校验前后端各一次 |
| 节点体输出区改造波及既有节点像素（`.node-out` 通用容器） | AC4 既有场景零漂移实测 + 纯插入纪律（新选择器/新分支不动既有行）；改动若触及 `setNodeOut` 文本路径即需 SPEC 说明并由 gate 全场景兜底 |
| baseline 重产漂移（18 键外意外差异） | 快照再生产机制（0018/0021/0022）：cmp 对照 diff 恰 +1 键为判据；ADR-0015 §2.4 schema 纪律自检九条前置 |
| ADR-0015 §2.4/§5 的「16→17」计数过期（agent 节点已入列） | 按代码事实转写为 17→18（沿 0027/0029 行号/计数笔误转写先例）；ADR 增补在实施轮随状态行一并校正 |
| 实施滑向「服务端抓取网页」或「引入 PTY / 用户输入面」 | AC2 服务端零出站机器证明（grep 无 guardedFetch/fetch）+ ADR-0015 §4.4 边界切割 + 护栏中止条款——立即中止转 needs-approval |
| smoke V09 时点性假红（产品提交前 git 半边必红） | 沿 0018/0021/0022/0031 先例：提交后复跑自愈，VERIFY 记实得值判据 0 failed |
| 节点库 output 分组行数变化导致 s3 基线漂移超预期（现 2 行 → 3 行） | AC4 明确 s3 属**预期受波及**场景（数据驱动渲染 app.js:329-336；output 类目现仅 reply / setvar 两节点——packages/shared/src/nodes/reply/node.ts:10 与 setvar/node.ts:9 本会话亲核 → webshow 后 3 行），修宪轮重录一次即闭环；不视为意外红 |

## 需求清单（REQ-0033-xx）

- REQ-0033-01：webshow NDP 定义落盘（`node.ts` ~30 行 + README 生成 + `nodes.ts`
  聚合 +1 键 + baseline 再生产 18 键 + 守卫/契约联动，AC1）。
- REQ-0033-02：webshow 呈现承载落盘（`handlers.ts` BASIC_HANDLERS 新键：URL 校验
  通过透传呈现 / 非 http(s) 与空输入 warn + 如实降级；engine 零改动；服务端零
  出站，AC2）。
- REQ-0033-03：画布 iframe 安全呈现（`app.js` 节点体输出区新分支 + `app.css`
  新选择器，纯插入；sandbox 默认最严 + http(s) 白名单 + 前端双保险，AC3）。
- REQ-0033-04：smoke webshow 断言组（URL 校验 / 降级路径 + 既有 104 零回退，
  AC2）。
- REQ-0033-05：修宪 golden 双通道（s10-webshow-node golden-created + s3-library
  gate:update 重录一次 + 其余场景零漂移实测，AC4）。
- REQ-0033-06：边界不变式——零依赖 / 零新增 SSE 事件 / 零新增端点 / 零新类目 /
  零新 widget / engine·guard·events.ts 零 diff（AC5）。
- REQ-0033-07：手动 E2E 四点位 + 指针抽样 ≥5 条（AC6/AC7）；产品提交恰一个
  （Conventional Commits）；ADR-0015 实施轮增补（状态行 + §7 实施纪要 + 计数校正）。

## SPEC 派发要点（M 项需独立 SPEC，skipSpec=false）

spec-designer 依本 PRD + ADR-0015 产出 `iterations/0033/SPEC.md`，必含：

1. 受影响文件清单终稿（表 1~12 逐文件行级改动说明 + 行数预算分配），含
   `webshow/node.ts` 终稿 DEFS 代码块（ADR-0015 §2.1 草图 → 终稿，纪律同
   ADR-0013 §2.1）。
2. **golden 重录方案**（WORKFLOW §4 BUILD 修宪轮条款必答）：s10 场景触发形态
   （localStorage 预置含 webshow 节点的最小工作流 fixture，沿 s8/s9 的 `seed`
   钩子先例）、s3-library 重录步骤与「gate 失败时脚本执行一次 gate:update」
   通道声明、其余场景零波及实测口径与「意外红即中止」判据。
3. **节点体输出区呈现分支设计**（ADR-0015 §4.1 落地）：iframe 挂载点（`.node-out`
   同级新容器 vs 容器内分支，二选一论证）、sandbox 属性写法与 `sandbox=false`
   移除路径、协议白名单前端校验位置、既有 `setNodeOut` 文本路径零变化的证明口径、
   折叠/展开与端口测量（`measurePorts()+updateEdgesOf()`，AGENTS.md 已知陷阱）的
   交互影响面。
4. **handler 语义伪码**（URL 校验函数形态与降级分支、warn 消息字面量、`emit('output')`
   与 `ctx.outputs.push` 序、out 摘要文案）与「服务端零出站」的机器证明口径
   （grep 断言清单）。
5. smoke 断言组设计（webshow 组编号续接现有组序；mock 形态沿 G/A 组先例）与
   回滚方案（git revert 含 s10 基线 + s3 重录回退）。
