# PRD · 迭代 0034 · BK-0037 终端只读流节点（termview）——BK-9003 呈现三件套链 · 批次 2（修宪轮）

> 产出角色：product-manager（PLAN 轮重选，BK-0036 已被并行工作流占位故跳过）。
> 选题来源：BACKLOG BK-0037（P0/M/ui-proposal/触UI=是/ready，来源列 = issue#3）。
> 定界权威：ADR-0015 §2.2（DEFS 定界）/§3（呈现承载）/§4.2（等宽流式追加）/
> §4.4（PTY 边界切割）/§4.5（SSE 消费护栏）/§5（分批修宪编排）/§6（golden 双通道预案）/
> §7（BK-0037 权威字面量）。
> 授权链复核（本轮亲跑）：`gh issue view 3 --json comments` → owner `liusuren123`
> 评论「批准」`createdAt 2026-10-23T15:49:32Z`，issue state=OPEN（关单留链终轮
> BK-0038，沿 issue#10/11 先例）。
> **重选依据（规则④）**：本轮 ready 队列（非 doc）= BK-0036 / BK-0037 / BK-0038
> （P0/M，issue#3）+ BK-0040（P0/M，issue#4）。BK-0036 已被另一并行工作流占位（禁选）；
> BK-0038 备注载明「依赖 BK-0036/0037 之后（链终收口）」→ 前置未竟，本轮不可选；
> 余 BK-0037（表序在 BK-0038 之前，链序 ADR-0015 §5 = 0036→0037→0038 亦在其前）
> 与 BK-0040（issue#4 链，独立于本链）。同优先级 P0/M 按 BACKLOG 表序 → **选 BK-0037**。
> 其硬前置 BK-0035 已 done（迭代 0029）；备注「建议随 BK-0036 后（复用其节点脚手架
> 先例）」为**非硬性**建议（ADR-0015 §5「0037 建议（非硬性）随 0036 后实施」）。

## 结论

**建议做（本迭代即做）**——三条理由：

1. **链序与授权**：呈现三件套是 T5-M3「画布编排 × 智能体工作台」差异化主轴的呈现层；
   本轮为链批次 2（ADR-0015 §5 一节点一迭代一 ADR 增补），授权链 issue#3 已获用户
   批复（本轮 gh 亲核 2026-10-23T15:49:32Z），ADR-0015 §2.2/§4.2/§4.4 已给出定界。
2. **前置齐备**：NDP 目录制前置 BK-0021 done（`packages/shared/src/nodes/` 现 17 目录
   终态）；DEFS 字段全部落在 `nodes.schema.ts` 冻结枚举内（PORT_TYPES 5 / WIDGETS 5 /
   CATEGORIES 7），**零新端口类型、零新 widget、零新类目**。
3. **零需批准面外风险**：呈现承载是纯数据变换 + 事件转发（reply 同构 sink）——**零出站、
   零新依赖、零新 env、零 shared SSE 事件新增**；且与 PTY 面严格切割（§4.4 护栏）。

**归属 CONSTITUTION 第 3 条变更需求，但已获用户批准 → 走修宪通道**（ADR 在案 +
批复在案 + 同迭代 golden 增量），**不需要新一轮 needs-approval**。

## 触UI 分类结论

**是（修宪轮）**。宪法第 3 条三要素齐备：

| 要素 | 证据 |
| --- | --- |
| ADR 在案 | `docs/adr/0015-presentation-triplet-nodes.md`（§2.2 DEFS / §3 承载 / §4.2 渲染 / §4.4 PTY 切割 / §5 编排 / §6 golden / §7 权威字面量） |
| 用户批复在案 | issue#3 owner 评论「批准」2026-10-23T15:49:32Z（本轮 gh 亲跑复核） |
| golden 增量 | 新场景走 golden-created 通道；受波及既有场景仅 s3-library 一个，修宪轮内允许一次 `npm run gate:update` 重录 |

**波及控制（硬约束）**：

- 改动形态 = **纯插入优先**（app.js 新分支 + app.css 新选择器；既有行零删改）。
- 既有场景 s0/s1/s2/s4~s9 **预期零波及**——gate 全场景实测，任一意外红即中止排查
  （不重录掩盖）。
- `Skeleton.tsx` 预期零改动；`events.ts` 零新增（既有 15 种内取用）；确需新增事件类型
  → **中止转 needs-approval**（POLICY 需批准区）。
- **PTY 边界切割（ADR-0015 §4.4 写死）**：本节点是**只读呈现 sink**——无输入框、
  无 stdin、无用户写入面、零子进程、零新端点、零新依赖；**严禁**引入 node-pty / PTY
  会话（该面归 BK-0045 / ADR-0014 专属）。若实施中确需用户输入或进程面 → 立即
  中止转 needs-approval。

## 需求（Given / When / Then）

### REQ-0037-01 · 节点定义与入列（NDP 目录制）

- **Given** `packages/shared/src/nodes/` 当前 17 目录终态、`nodes.ts` 142 行聚合层为
  纯 import + 反向合成（零内联定义），**When** 新增 `src/nodes/termview/{node.ts,
  README.md}` 目录并在聚合层加「一 import + 一键」，**Then** `NODES` 键集 17→18，
  节点库与后端 `DEFS_META`/`paramDefaultsOf` 自动派生，**零手写副本**；`node.ts` 为
  纯数据模块（`satisfies NodeDefJson`），不得引入运行时代码。
- **DEFS 定界**（ADR-0015 §2.2 权威字面量）：
  - `type: 'termview'`；`identity.name` = 终端只读流；`category: 'output'`（复用既有
    `--cat-output`，零新增类目 / 零新增 CSS 变量）；`icon: 'code'`（`ICON_PATHS` 既有
    键，`app.js:58` 查表 / `app.js:101` `I()` 取用；现由 `code` 节点占用，**复用无
    唯一性约束**——ADR §2.2 明确「新增 `terminal` 键列为可选增量」，本轮**不新增**）；
    `keywords` = 「termview 终端 只读 流式 呈现 输出」；`description` = 「将上游文本
    流以等宽终端样式只读呈现（终点节点）」。
  - `ports.inputs` = 单入 `{ id: 'in-stream', label: '数据流', type: 'any' }`（接上游
    流式节点，如 llm）；`ports.outputs` = `[]`（sink 同构 reply）。
  - `params` = `lines`（number，default `200`，min `20`，max `2000`，step `20`，缓冲行数
    上限·超出裁旧）+ `autoscroll`（toggle，default `true`，自动滚动）。两项均在
    widget 枚举内，number 约束矩阵合法（`nodes.schema.ts:138-146`）。
  - `binding` = `{ handler: 'termview', capabilities: { data: true } }`；
    **无 exec / net / fs 等任何能力键**——零进程零出站。
  - 冻结枚举纪律（`packages/shared/src/nodes.schema.ts:13-15` 亲核：PORT_TYPES 5 /
    WIDGETS 5 / CATEGORIES 7 现状成立）：端口类型 ∈ 5 枚举 ✓、widget ∈ 5 枚举 ✓、
    端口 id 满足 `^[a-z][a-z0-9-]{2,31}$` ✓（`in-stream`）、params id 节点内唯一 ✓、
    `capabilities` 键 ⊆ 十 kind ✓（仅 `data`）、**零新类目零新端口类型零新 widget**。

### REQ-0037-02 · 呈现承载（后端 sink handler）

- **Given** `apps/server/src/handlers.ts` 的 `BASIC_HANDLERS`（`reply` 于 `:225-232`
  形态为「消费输入 → `ctx.outputs!.push` → `emit('output',{text})` → 返回 `out` 摘要」），
  **When** 新增 `termview` handler 键（与 `reply` 同构），**Then**
  `engine.ts` 的 `HANDLERS = { ...BASIC_HANDLERS, llm, agent }`（`:26-29`）自动注册，
  **engine.ts 零改动**；`handlers-coverage`（HANDLERS⊇NODES）契约断言自动满足。
- **语义**：上游全文（input）汇入 `ctx.outputs` + `emit('output', { text })`，
  `out` 摘要「已呈现流 · N 字」；**流式增量零引擎改动**——`node:delta` 由上游流式节点
  经引擎既有通道发射，前端按节点 id 关联消费（REQ-0037-03）。
- **零出站**：handler 不发起任何网络/进程/文件操作；无新依赖、无新 env。

### REQ-0037-03 · 画布节点呈现（等宽只读流区）

- **Given** 画布上放置一个 termview 节点，**When** 上游流式节点（如 llm）运行并产生
  `node:delta` 增量，**Then** 节点体内出现**等宽多行只读滚动区**（`white-space:pre`
  语义）追加/覆盖式呈现文本；`node:done` 定稿、`node:error` 呈现错误行。
- **增量语义**：llm 的 `node:delta` 为**累积文本**（既有 `app.js:2159-2161` 消费点可证：
  delta 文本直接整段写入并附 `▌` 光标），故本区对 delta 采用**覆盖式更新**（非追加），
  避免重复累积；最终以 `node:done` 的全文定稿。
- **参数行为**：`lines` 控缓冲行数上限（超出裁旧）；`autoscroll` 控是否自动滚动到底。
- **只读性（硬约束）**：呈现区**无输入框、无 stdin、无任何用户写入面**。
- **容器纪律**：既有 `.node-out` 容器为 `display:none` 且仅在 `.node.st-done` 时显示
  （`apps/web/src/app.css:259-261`），`setNodeOut`（`app.js:1897`）以 `textContent`
  单行写入且 `node:delta` 处**截断至 160 字**（`app.js:2160`）——**不得改写其既有
  语义**；本区须使用**独立的新容器**（如 `.node-term`）+ **新选择器**，`app.css`
  改动形态为纯插入。
- **模拟执行面**：既有 `RUN_META` 表（`app.js:1867-1884`）无 `termview` 条目，单节点
  模拟执行回落到 `{dur:600,out:()=>'完成'}`；本轮**纯插入**一条 termview 模拟文案
  （等宽流文本），使模拟执行与真实运行语义一致（既有行零改动）。

### REQ-0037-04 · 节点库与通用渲染链

- **Given** 前端节点库按 `CATS` 分组渲染（`app.js:329-333`）、端口行与 widget 行均
  数据驱动（`app.js:765-766`、`:764`），**When** DEFS 新增 termview，**Then** 节点库
  「输出」分组自动新增「终端只读流」条目行、节点体自动渲染 `lines`（number widget）
  与 `autoscroll`（toggle widget）两行 widget 及一条 `in-stream` 入端口行——**零前端
  改动即自动承载**；本轮前端改动只发生在 REQ-0037-03 的流式呈现面。
- s3-library 场景因此**必然像素变化**（output 分组 +1 行）→ 属预期受波及，修宪轮内
  重录（一次）。

### REQ-0037-05 · 确定性要求（golden 可复现）

- **Given** golden 像素门禁要求同输入两次采集逐字节一致，**When** 呈现区内容由 SSE
  增量驱动，**Then** 基线必须收敛到**确定性终态**：
  - 场景须以固定 fixture 供给固定文本的 `node:delta` / `node:done` 序列（沿 s9
    `SESSION_ROUTES` + `goalReady` 就绪等待先例，`tools/pixel-gate/gate.mjs:196-217`），
    **禁止**依赖真实 provider / 外网 / 随机时序；
  - 必须等待「终态就绪」再采集（不得采到中间帧）；`autoscroll` 默认 true 时滚动位置
    须为确定性值；
  - 若流式增量无法收敛为确定终态 → **FAIL 并中止**，不得以重录掩盖（迭代 0013
    BUG-0026 间歇像素抖动教训在案）。
  - 路由 fixture 需求评估（ADR-0015 §6）：若采用在线流式场景 → 需 `RUN_ROUTES` 类
    fixture（`gate.mjs:181-184` 先例）；**优先**采用静态呈现态场景（沿 s8 预案形态），
    具体取舍归 SPEC。

### REQ-0037-06 · 契约与守卫联动

- `packages/shared/test/nodes.baseline.json` 重产（**17→18 键**，经批准通道），
  `nodes-dirs.test.mjs` 断言 `D.size` 17→**18**，`defs-drift.test.mjs` 期望表加
  `termview` 行且参数总数 36→**38**（`lines` + `autoscroll`），`readme-consistency`
  （README 由 `tools/gen-node-readmes.mjs` 生成并回比）随新目录走既有机制。

## 非功能要求

1. **零依赖零 env 零出站类别**：不得新增 npm 依赖、新增环境变量语义、新增出站目标
   类别（`package.json` / `package-lock.json` 零 diff 为机器判据）。
2. **SSE 零新增**：`packages/shared/src/events.ts` 既有 15 种事件内取用（本节点消费
   `node:delta` / `node:done` / `node:error`，可选 `output`）；确需新增事件类型 → 中止
   转 needs-approval。
3. **PTY 零依赖零进程零端点零用户输入面**（ADR-0015 §4.4 护栏，越界即中止）。
4. **文件规模**：`handlers.ts` 现 298 行，新增 termview handler 约 10-15 行 → 约
   310-315 行 ≤400（AGENTS.md 硬性约定 4）；`nodes/termview/node.ts` ≤60 行；
   `README.md` 由生成器产出。
5. **纯插入优先**：`app.js` / `app.css` 改动均为新分支 / 新选择器，既有行零删改；
   `Skeleton.tsx` 预期零改动。
6. **不做范围**：不做用户输入 / stdin / PTY 会话（归 BK-0045）；不做 termview 的
   节点库新类目（归 BK-0050）；不做 JSON 树呈现（BK-0038）；不做任何 DEFS 枚举外
   扩张（新增端口类型/widget/类目即触需批准面）。

## 受影响文件清单（SPEC 消费；与 ADR-0015 §7 BK-0037 行同款边界）

| 路径 | 动作 | 说明 |
| --- | --- | --- |
| `packages/shared/src/nodes/termview/node.ts` | 新增 | DEFS 纯数据模块（§2.2 定稿，终稿代码块归 SPEC） |
| `packages/shared/src/nodes/termview/README.md` | 新增 | 由 `tools/gen-node-readmes.mjs` 生成（既有机制，勿手写） |
| `packages/shared/src/nodes.ts` | 改（+1 import +1 键） | 聚合层，零内联定义 |
| `packages/shared/test/nodes.baseline.json` | 改（+1 键） | 17→18 键，经批准通道重产 |
| `packages/shared/test/nodes-dirs.test.mjs` | 改 | `D.size` 17→18 |
| `packages/shared/test/defs-drift.test.mjs` | 改 | 期望表 +termview，参数计数 36→38 |
| `apps/server/src/handlers.ts` | 改（+termview 键） | BASIC_HANDLERS 新增，reply 同构 sink；engine.ts 零改动 |
| `apps/web/src/legacy/app.js` | 改（纯插入） | 等宽流式呈现区 + delta/done/error 分支 + `RUN_META` 一行 |
| `apps/web/src/app.css` | 改（纯插入） | 新选择器（`.node-out` 既有语义零改动） |
| `apps/web/src/Skeleton.tsx` | 预期零改动 | 若需挂载点须 SPEC 说明并重录 s0 |
| `tools/pixel-gate/gate.mjs` | 改（纯插入） | 新场景（编号按落盘时序，预期 s10+；BK-0036 并行占号时顺延）+ s3-library 受波及重录 |
| `tests/golden/ui/**` | 新增/重录 | 新场景基线（png + invariants）；s3-library 重录 |
| `tests/smoke/smoke-server.mjs` | 改（+断言组） | 全文汇入 / out 摘要 / 无出站 |
| `docs/adr/0015-presentation-triplet-nodes.md` | 改（状态行 + §7 实施纪要） | 按 ADR-0010/0012 先例增补 |
| `docs/evolution/BACKLOG.md` | 改（CLOSE 回写） | BK-0037 行终态 + 备注 |

**禁区（零 diff 机器判据）**：`package.json` / `package-lock.json`（零依赖）、
`apps/server/src/engine.ts`（自动注册零改动）、`apps/server/src/guard.ts`、
`packages/shared/src/events.ts`（零新增 SSE）、`CONSTITUTION.md`、`AGENTS.md`、
`.github/workflows/`。

## 事实校正与并行协调（按代码事实转写，沿 0027/0029 先例）

1. **节点计数口径**：ADR-0015 与 BACKLOG BK-0037 备注写于 agent 节点落地之前，其
   「17→18 / D===18」字面量在本工作树**恰好成立**（当前 17 键含 `agent`，迭代 0031
   落地）——本轮沿用，无需校正；`defs-drift` 现为 17 种节点 × 36 参数
   （`packages/shared/test/defs-drift.test.mjs:15,35`），加 termview 两参数 → **38**。
2. **与并行路 BK-0036 的计数叠加风险（须仲裁员协调）**：BK-0036（另一并行工作流在途）
   同链批次 1，落地后主干基线将由 17→18；本轮 termview 若也按 17→18 施工，两分支的
   `nodes.ts` / `nodes.baseline.json` / 守卫断言会指向**不同键集**，属产品代码冲突——
   依 WORKFLOW §6 护栏 9，**仲裁员不得自行择一**，须如实报告交用户裁决，或按合并
   先后次序由后落地分支按合并后事实校正计数（SPEC 须把该校正写入验收口径）。
   本 PRD 不因此改选他项：规则④的表序/链序仍指向 BK-0037。

## 验收口径（AC）

- **AC1 gate**：`npm run gate` 全绿——新场景走 golden-created 通道落盘，s3-library
  受波及修宪轮重录（**本轮 gate:update 次数 ≤1**，仅 s3-library），s0/s1/s2/s4~s9
  **零波及实测**（任一意外红 → FAIL 并中止排查）。
- **AC2 契约**：`npm test` 全绿（既有 30 项零回退 + nodes-dirs/defs-drift/baseline/
  readme-consistency 联动项按本轮口径通过）。
- **AC3 冒烟**：`npm run smoke:server` 全绿（既有 104 断言零回退 + termview 断言组：
  上游全文汇入 `ctx.outputs` / `emit('output')` / `out` 摘要「已呈现流 · N 字」/
  空输入如实降级 / 零出站零新依赖）。
- **AC4 手动 E2E 五点位**：① 节点库「输出」分组出现「终端只读流」；② 拖入画布后出现
  `lines` / `autoscroll` 两行 widget 与 `in-stream` 入端口；③ 与 llm 节点连线运行，
  节点体出现等宽滚动区且随 `node:delta` 逐次更新、`node:done` 定稿；④ 呈现区**无任何
  输入面**（鼠标点击不出现可编辑控件）、DevTools 零额外网络请求；⑤ `lines` 超限裁旧
  与 `autoscroll` 开关行为可见。
- **AC5 白名单与禁区**：改动文件恰为上表清单；禁区路径 `git diff` 恒空；
  `package-lock.json` 零变化（零依赖）；源码中 **node-pty / PTY / stdin 输入面零命中**
  （grep 断言）。
- **AC6 指针抽样**：≥5 组代码/ADR 指针逐条亲核零杜撰（行号按代码事实转写）。
- **AC7 确定性**：新场景基线**连续两次采集逐字节一致**（防止把流式时序抖动固化成
  基线——迭代 0013 BUG-0026 教训在案）；不能收敛为确定终态 → FAIL，不得重录掩盖。
- **AC8 并行冲突申报**：BUILD/VERIFY 须如实记录与并行路 BK-0036 的产品文件交集
  （`nodes.ts` / `nodes.baseline.json` / `nodes-dirs` / `defs-drift` / `app.js` /
  `app.css` / `gate.mjs` / `smoke-server.mjs`），交仲裁员按「产品代码冲突不得自行
  择一」处置。

## 迭代编排与 issue 回执

- 本轮为 **BK-9003 链批次 2**，**非链终轮** → 迭代 CLOSE 时**只发进度回执，不关
  issue#3**；关单留链终轮 **BK-0038**（沿 issue#10/11 终轮先例）。相应地
  `STATE.item` 保持 `BK-0037`（批次未到终轮不置 done）。
- 后续：BK-0038（jsoncanvas，批次 3，链终轮）。
