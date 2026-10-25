# PRD · 迭代 0035 · BK-0038 JSON 画布节点（jsoncanvas）——BK-9003 呈现三件套链 · 批次 3（修宪轮·链终轮）

> 产出角色：product-manager（PLAN 轮）。
> 选题来源：BACKLOG BK-0038（P0/M/ui-proposal/触UI=是/ready，来源列 = issue#3）。
> 定界权威：ADR-0015 §2.3（DEFS 定界）/§3（呈现承载）/§4.3（结构化树渲染）/
> §4.5（SSE 消费护栏）/§5（分批修宪编排）/§6（golden 双通道预案）/
> §7 BK-0038 权威字面量（ADR-0015:260）。
> 授权链复核（本轮亲跑）：`gh issue view 3 --json state,comments` → state=OPEN，
> owner `liusuren123` 评论「批准」`createdAt 2026-10-23T15:49:32Z`；批次进度回执
> 0029（BK-0035 SPEC）/0033（BK-0036 webshow）/0034（BK-0037 termview）均在案。
> 关单留本链终轮（即本轮）CLOSE，沿 issue#10/11 终轮先例。
> 选题占位互斥核查（本轮亲跑）：`ls .zcode/locks/items` 为空、`git worktree list`
> 仅主干 + 本路 feat/0035-iter → 无并行路占项，无重选需求。

## 选题依据（规则④）

档案 approved：无；rejected：无；user-request 新增：无；issue 面板 #3~#6 均
needs-approval 且批复早已在库（#3 于 2026-10-23T15:49:32Z，本轮 gh 亲核）→ 走常规
选题。当前 ready 队列（非 doc）恰三项：

| 项 | 优先/大小 | 链 | 前置 | 裁定 |
| --- | --- | --- | --- | --- |
| **BK-0038** | P0/M | BK-9003 链批次 3（链终轮） | BK-0035 done（迭代 0029）+ BK-0036 done（迭代 0033）+ BK-0037 done（迭代 0034）——**全部满足** | **入选** |
| BK-0040 | P0/M | BK-9004 链批次 1 | BK-0039 done——满足 | 不选（链序在 BK-9003 链之后，ROADMAP 待办节实施序列 3 先于 4） |
| BK-0050 | P0/S | BK-9006 穿插项 | BK-0033 done——满足 | 不选（ROADMAP 序列列第 6 位「可穿插」，非优先于链序） |

ROADMAP 待办节「新实施序列（PLAN 选题指导、先例在案，优先于主池表序）」BK-9003 链 =
0036 → 0037 → **0038**，前两批已落地（s10-webshow-node / s11-termview-node 基线在库，
gate 现 12 场景），本项为该链收口——**选 BK-0038**。同优先级下它先于 BK-0040（链序
3 < 4）；「优先 S/M」两项同为 M，不构成区分。

## 结论

**建议做（本迭代即做）**——三条理由：

1. **链序与授权**：本项是呈现三件套链（T5-M3 差异化主轴呈现层）的最后一批，授权链
   issue#3 批复承继 + ADR-0015 §2.3/§3/§4.3 定界齐备（本轮 gh 亲核批复在案）。
2. **前置齐备**：NDP 目录制前置 BK-0021 done（工作树内 `packages/shared/src/nodes/`
   现 19 目录终态，本轮 `ls` 亲核）；同链 webshow/termview 已落地，节点脚手架先例
   （NDP 目录 + BASIC_HANDLERS 键 + 前端纯插入 + gate 场景增量四件套）两轮验证成熟。
3. **零需批准面外风险**：呈现型 sink——零出站、零新依赖、零新 env、零新端点、零
   shared SSE 事件新增（events.ts 零 diff 为机器判据）；DEFS 全部字段在冻结枚举内
   组合（PORT_TYPES 5 / WIDGETS 5 / CATEGORIES 7），零溢出。

**归属 CONSTITUTION 第 3 条变更需求，已获用户批准 → 走修宪通道**（ADR 在案 + 批复
在案 + 同迭代 golden 增量），不需要新一轮 needs-approval。

## 触UI 分类结论

**是（修宪轮）**。宪法第 3 条三要素齐备：

| 要素 | 证据 |
| --- | --- |
| ADR 在案 | `docs/adr/0015-presentation-triplet-nodes.md`（§2.3 DEFS / §3 承载 / §4.3 渲染 / §4.5 SSE 护栏 / §5 编排 / §6 golden / §7 BK-0038 权威字面量） |
| 用户批复在案 | issue#3 owner 评论「批准」2026-10-23T15:49:32Z（本轮 gh 亲跑复核，state=OPEN） |
| golden 增量 | 新场景走 golden-created 通道；若 s3-library 实测受波及，修宪轮内允许一次 `npm run gate:update` 重录（先例：0033/0034 两轮 s3 实测零波及、gate:update 实际 0 次消费） |

**波及控制（硬约束）**：

- 改动形态 = **纯插入优先**（app.js 新分支 + app.css 新选择器；既有行零删改）。
- 既有场景 s0/s1/s2/s4~s11 **预期零波及**——gate 全场景实测，任一意外红即中止排查
  （不重录掩盖）；s3-library 按 0033/0034 实测先例预期零波及（新增库行落在 900px
  视口折叠线下），仍须本轮 gate 实测确认，不得凭先例推定。
- `Skeleton.tsx` 预期零改动；`events.ts` 零新增（既有 15 种内取用）；确需新增事件
  类型 → **中止转 needs-approval**（POLICY 需批准区）。
- **非 JSON 输入如实降级**：呈现树构建（前端 JSON.parse）失败时降级为原文等宽呈现 +
  warn，**不伪造树**（对齐「未接入能力如实降级」纪律）；handler 侧序列化失败同样
  warn + 原文降级。
- PTY 边界切割（ADR-0015 §4.4）与本节点无涉但护栏同样适用：零子进程、零新端点、
  零用户输入面。

## 需求（Given / When / Then）

### REQ-0038-01 · 节点定义与入列（NDP 目录制）

- **Given** `packages/shared/src/nodes/` 当前 19 目录终态、`nodes.ts` 聚合层为纯
  import + 反向合成（零内联定义），**When** 新增 `src/nodes/jsoncanvas/{node.ts,
  README.md}` 目录并在聚合层加「一 import + 一键」，**Then** `NODES` 键集 19→20，
  节点库与后端 `DEFS_META`/`paramDefaultsOf` 自动派生，**零手写副本**；`node.ts` 为
  纯数据模块（`satisfies NodeDefJson`），不得引入运行时代码。
- **DEFS 定界**（ADR-0015 §2.3 权威字面量）：
  - `type: 'jsoncanvas'`；`identity.name` = JSON 画布；`category: 'output'`（复用
    既有 `--cat-output`，零新增类目 / 零新增 CSS 变量）；`icon: 'box-select'`
    （`ICON_PATHS` 既有键，`app.js:85` 本轮亲核；现行仅工具栏 affordance
    「框选全部」`app.js:1612` 取用，**无任何节点占用**——复用无冲突）；`keywords`
    = 「jsoncanvas json 画布 结构化 树 呈现」；`description` = 「将上游 JSON 数据
    以结构化树呈现（终点节点）」。
  - `ports.inputs` = 单入 `{ id: 'in-data', label: '数据', type: 'any' }`（**object
    严型案已否决**——typeOk 下 object 入口拒接上游 text 输出，呈现型 sink 不挑食，
    非 JSON 输入由如实降级承载）；`ports.outputs` = `[]`（sink 同构 reply）。
  - `params` = `expand`（number，default `2`，min `0`，max `6`，step `1`，默认展开
    层级）+ `fmt`（toggle，default `true`，格式化缩进·false 紧凑原文）。两项均在
    widget 枚举内，number 约束矩阵合法（2 ∈ [0,6]、step 1>0）。
  - `binding` = `{ handler: 'jsoncanvas', capabilities: { data: true } }`；**无
    exec / net / fs 等任何能力键**——零进程零出站。
  - 冻结枚举纪律：端口类型 ∈ 5 枚举 ✓、widget ∈ 5 枚举 ✓、端口 id
    `^[a-z][a-z0-9-]{2,31}$` ✓（`in-data`）、params id 节点内唯一 ✓、
    `capabilities` 键 ⊆ 十 kind ✓（仅 `data`）、**零新类目零新端口类型零新 widget**。

### REQ-0038-02 · 呈现承载（后端 sink handler）

- **Given** `apps/server/src/handlers.ts` 的 `BASIC_HANDLERS`（`:17` 本轮亲核；
  `reply` 于 `:225`、`termview` 于 `:234`、`webshow` 于 `:247-251` 为同构先例：
  消费输入 → `ctx.outputs!.push` → `emit('output',{text})` → 返回 `out` 摘要），
  **When** 新增 `jsoncanvas` handler 键（与 reply 同构），**Then** `engine.ts` 的
  `HANDLERS = { ...BASIC_HANDLERS, ... }`（`:27-28` 本轮亲核）自动注册，
  **engine.ts 零改动**；`handlers-coverage`（HANDLERS⊇NODES）契约断言自动满足。
- **语义**（ADR-0015 §3）：输入对象/数组直 `JSON.stringify` 序列化（字符串原样），
  全文汇入 `ctx.outputs` + `emit('output', { text })`，`out` 摘要「已呈现 JSON ·
  N 项」；序列化失败 warn + 原文降级（不伪造结果）。
- **零出站**：handler 不发起任何网络/进程/文件操作；无新依赖、无新 env。
- **容量**：`handlers.ts` 现 324 行（本轮 `wc -l` 亲核），新增 jsoncanvas handler
  约 10-15 行 → 约 335-340 行 ≤400（AGENTS.md 硬性约定 4）。

### REQ-0038-03 · 画布节点呈现（结构化树/折叠呈现）

- **Given** 画布上放置一个 jsoncanvas 节点，**When** 上游节点运行产生
  `node:done`（out 文本）或 `output` 事件文本，**Then** 节点体输出区出现**缩进树 /
  可折叠结构化视图**（新容器 + 新选择器纯插入）；数据源文本 `JSON.parse` 成功即按
  `expand`（默认展开层级）与 `fmt`（缩进格式化 / 紧凑）渲染；**parse 失败如实降级**
  为原文等宽呈现 + warn（不伪造树）。
- **容器纪律**：既有 `.node-out` 容器与 `setNodeOut` 的既有语义（单行文本摘要）
  **不得改写**；本区须使用**独立的新容器** + **新选择器**，`app.css` 改动形态为
  纯插入（0033/0034 先例：`.node-term` 等独立容器，既有容器语义零触碰）。
- **只读性**：呈现区无输入框、无任何用户写入面（呈现型 sink，非 PTY）。
- **模拟执行面**：`RUN_META` 表无 `jsoncanvas` 条目，单节点模拟执行回落默认文案；
  本轮**纯插入**一条 jsoncanvas 模拟文案（结构化树语义一致），既有行零改动。

### REQ-0038-04 · 节点库与通用渲染链

- **Given** 前端节点库按 CATS 分组渲染、端口行与 widget 行均数据驱动（ADR-0015 §1
  通用渲染链论证），**When** DEFS 新增 jsoncanvas，**Then** 节点库「输出」分组自动
  新增「JSON 画布」条目行、节点体自动渲染 `expand`（number widget）与 `fmt`
  （toggle widget）两行 widget 及一条 `in-data` 入端口行——**零前端改动即自动承载**；
  本轮前端改动只发生在 REQ-0038-03 的结构化呈现面。
- s3-library 场景按 0033/0034 实测先例**预期零波及**（新增行落在 gate 视口折叠线
  以下）——仍须 gate 实测确认，不得凭先例推定；若实测红 → 修宪轮内重录（≤1 次）。

### REQ-0038-05 · 确定性要求（golden 可复现）

- **Given** golden 像素门禁要求同输入两次采集逐字节一致，**When** 呈现内容驱动
  自 SSE 事件，**Then** 基线必须收敛到**确定性终态**：
  - 新场景采用**静态呈现态**形态（沿 s10-webshow-node / s11-termview-node 先例，
    gate.mjs `:253-255` 本轮亲核 12 场景现状）：固定 fixture 供给固定 JSON 文本的
    `node:done`/`output` 序列，**禁止**依赖真实 provider / 外网 / 随机时序；
  - 必须等待「树渲染完成」终态再采集（不得采到中间帧）；折叠状态须为确定性值
    （`expand` 默认层级）；
  - 若呈现无法收敛为确定终态 → **FAIL 并中止**，不得以重录掩盖（迭代 0013
    BUG-0026 间歇像素抖动教训在案）。
  - **场景编号按落盘时序**：s8/s9/s10/s11 已占用，本轮新场景预期 **s12**（不锁死，
    若并行穿插项先落则顺延——ADR-0015 §6 同款纪律）。

### REQ-0038-06 · 契约与守卫联动

- `packages/shared/test/nodes.baseline.json` 重产（**19→20 键**，经批准通道），
  `nodes-dirs.test.mjs` 断言 `D.size` 19→**20**（`:31` 本轮亲核现行 19），
  `defs-drift.test.mjs` 期望表加 `jsoncanvas` 行且参数总数 40→**42**（`expand` +
  `fmt`；`:39-40` 本轮亲核现行 40），`readme-consistency`（README 由
  `tools/gen-node-readmes.mjs` 生成并回比）随新目录走既有机制；
  `param-handler-guard` 的 EXPECTED_ZOMBIES 按 `expand`/`fmt` 消费面实测裁定
  （0033 先例：`sandbox` 前端消费 → 僵尸口径；两参数均在 ADR-0015 §4.3 定界为
  前端呈现参数，预期 +1 组僵尸条目，以代码事实为准）。

## 非功能要求

1. **零依赖零 env 零出站类别**：不得新增 npm 依赖、新增环境变量语义、新增出站目标
   类别（`package.json` / `package-lock.json` 零 diff 为机器判据）。
2. **SSE 零新增**：`packages/shared/src/events.ts` 既有 15 种事件内取用（本节点消费
   `node:done` / `node:error`，可选 `output` / `node:start`）；确需新增事件类型 →
   中止转 needs-approval。
3. **零进程零端点零用户输入面**（呈现型 sink；PTY 面归 BK-0045 / ADR-0014，严禁
   引入 node-pty / PTY 会话）。
4. **文件规模**：`handlers.ts` 324 → 约 335-340 行 ≤400；`nodes/jsoncanvas/node.ts`
   ≤60 行；`README.md` 由生成器产出。
5. **纯插入优先**：`app.js` / `app.css` 改动均为新分支 / 新选择器，既有行零删改；
   `Skeleton.tsx` 预期零改动。
6. **不做范围**：不做用户输入 / PTY 会话（归 BK-0045）；不做节点库新类目（归
   BK-0050）；不做 JSON 编辑面（本节点只读呈现）；不做任何 DEFS 枚举外扩张
   （新增端口类型/widget/类目即触需批准面）。

## 受影响文件清单（SPEC 消费；与 ADR-0015 §7 BK-0038 行同款边界）

| 路径 | 动作 | 说明 |
| --- | --- | --- |
| `packages/shared/src/nodes/jsoncanvas/node.ts` | 新增 | DEFS 纯数据模块（§2.3 定稿，终稿代码块归 SPEC） |
| `packages/shared/src/nodes/jsoncanvas/README.md` | 新增 | 由 `tools/gen-node-readmes.mjs` 生成（既有机制，勿手写） |
| `packages/shared/src/nodes.ts` | 改（+1 import +1 键） | 聚合层，零内联定义 |
| `packages/shared/test/nodes.baseline.json` | 改（+1 键） | 19→20 键，经批准通道重产 |
| `packages/shared/test/nodes-dirs.test.mjs` | 改 | `D.size` 19→20 |
| `packages/shared/test/defs-drift.test.mjs` | 改 | 期望表 +jsoncanvas，参数计数 40→42 |
| `apps/server/src/handlers.ts` | 改（+jsoncanvas 键） | BASIC_HANDLERS 新增，reply 同构 sink；engine.ts 零改动 |
| `apps/web/src/legacy/app.js` | 改（纯插入） | 结构化树呈现区 + parse 降级分支 + `RUN_META` 一行 |
| `apps/web/src/app.css` | 改（纯插入） | 新选择器（`.node-out` 既有语义零改动） |
| `apps/web/src/Skeleton.tsx` | 预期零改动 | 若需挂载点须 SPEC 说明并重录 s0 |
| `tools/pixel-gate/gate.mjs` | 改（纯插入） | 新场景（预期 s12，按落盘时序）+ s3-library 实测裁定（预期零波及免重录） |
| `tests/golden/ui/**` | 新增（预期） | 新场景基线（png + invariants）；仅在 s3 实测红时修宪轮重录 |
| `tests/smoke/smoke-server.mjs` | 改（+断言组） | 对象/数组序列化汇入 / 字符串原样 / 降级路径 / 零出站 |
| `docs/adr/0015-presentation-triplet-nodes.md` | 改（状态行 + §7 实施纪要） | 按 ADR-0010/0012 先例增补（链终轮：状态行补「BK-0038 实施轮已消费 · 链闭合」） |
| `docs/evolution/BACKLOG.md` | 改（CLOSE 回写） | BK-0038 行终态 + 备注 |

**禁区（零 diff 机器判据）**：`package.json` / `package-lock.json`（零依赖）、
`apps/server/src/engine.ts`（自动注册零改动）、`apps/server/src/guard.ts`、
`packages/shared/src/events.ts`（零新增 SSE）、`CONSTITUTION.md`、`AGENTS.md`、
`.github/workflows/`。

## 事实校正（按代码事实转写，沿 0027/0029/0034 先例）

ADR-0015 与 BACKLOG BK-0038 行写于 agent/webshow/termview 入列之前，其「18→19 /
D===19 / 预期 s10+」字面量系旧基线；本工作树现状（本轮逐项亲核）= **19 目录 /
baseline 19 键 / defs-drift 40 参数 / gate 12 场景（s0~s11）**。本轮口径按现状转写：
baseline **19→20**、`D.size` **19→20**、参数 **40→42**、新场景预期 **s12**。守卫
联动与 smoke 断言基数（现 118）均以工作树内实跑值为准，SPEC 轮复核。

## 验收口径（AC）

- **AC1 gate**：`npm run gate` 全绿——新场景走 golden-created 通道落盘（预期 s12）；
  s3-library 实测裁定（预期零波及；若红 → 修宪轮 gate:update 重录，**本轮
  gate:update 次数 ≤1** 且仅限 s3-library）；s0/s1/s2/s4~s11 **零波及实测**
  （任一意外红 → FAIL 并中止排查）。
- **AC2 契约**：`npm test` 全绿（既有 30 项零回退 + nodes-dirs D===20 / defs-drift
  42 参数 / baseline 20 键 / readme-consistency / param-handler-guard 联动项按本轮
  口径通过）。
- **AC3 冒烟**：`npm run smoke:server` 全绿（既有 118 断言零回退 + jsoncanvas 断言
  组：对象/数组序列化汇入 `ctx.outputs` / `emit('output')` / `out` 摘要「已呈现
  JSON · N 项」/ 字符串原样 / 序列化或解析失败降级路径 / 零出站零新依赖）。
- **AC4 手动 E2E 五点位**：① 节点库「输出」分组出现「JSON 画布」；② 拖入画布后
  出现 `expand` / `fmt` 两行 widget 与 `in-data` 入端口；③ 与上游节点连线运行，
  节点体出现结构化树呈现且按 `expand` 层级折叠、`fmt` 切换缩进/紧凑可见；④ 非
  JSON 输入时降级原文呈现 + warn（不伪造树）、DevTools 零额外网络请求；⑤ 呈现区
  无任何输入面。
- **AC5 白名单与禁区**：改动文件恰为上表清单；禁区路径 `git diff` 恒空；
  `package-lock.json` 零变化（零依赖）；源码中 node-pty / PTY / stdin 输入面零命中
  （grep 断言）。
- **AC6 指针抽样**：≥5 组代码/ADR 指针逐条亲核零杜撰（行号按代码事实转写）。
- **AC7 确定性**：新场景基线**连续两次采集逐字节一致**（迭代 0013 BUG-0026 教训
  在案）；不能收敛为确定终态 → FAIL，不得重录掩盖。
- **AC8 并行冲突申报**：本轮核查时无并行路在途（locks 空、worktree 仅本路）；若
  BUILD/VERIFY 期间出现并行路，须如实记录产品文件交集（`nodes.ts` /
  `nodes.baseline.json` / 守卫测试 / `app.js` / `app.css` / `gate.mjs` /
  `smoke-server.mjs`），交仲裁员按「产品代码冲突不得自行择一」处置；若他路节点先
  合入主干，本分支计数按合并后事实校正（迭代 0034 集成收口先例）。

## 迭代编排与 issue 回执

- 本轮为 **BK-9003 链批次 3 · 链终轮**（BK-0035 done / BK-0036 done / BK-0037
  done，本项为该 issue 名下最后一个未竟子项）→ 迭代 CLOSE 时回执 **issue#3 关单**
  （🤖 终轮回执，附链收口说明，沿 issue#10/11 终轮先例）；`itemContinues=false`。
- 后续接续（ROADMAP 序列）：BK-9004 链批次 1（BK-0040 右栏容器+git）→ 0041 →
  0042；BK-0050 等短修宪穿插项按排期晋升。
