# PRD · 迭代 0038 · BK-0046 approval 审批人节点选择器 + BUG-0012 前端联动（修宪轮，BK-9006 短修宪穿插项）

> 产出角色：product-manager（PLAN 轮选题 + 晋升）。
> 选题来源：BACKLOG BK-0046（P0/S/ui-proposal/触UI=是，本轮由 proposed 晋升 ready 并选中；
> 来源列 = issue#6）。
> 授权链：issue#6「BK-9006 · 既有节点 UI 参数扩展杂项」用户批复 2026-10-24 在案
> （迭代 0021 PLAN 轮批复同步「#6 终获批复」，BACKLOG BK-9006 行与待批准区记录在案；
> 备注明载「批复承继 issue#6」）。本轮无需新一轮 needs-approval。
>
> **选题过程（规则④枯竭 + 晋升依据）**：本轮注入的并行占位禁选 = BK-0038 / BK-0040 /
> BK-0050，恰为 ready 队列（非 doc）全部 3 项 → 常规选题枯竭。余 proposed 项中：
> BK-0047 前置 BK-0019 未竟、BK-0048 前置 BK-0020 未竟、BK-0041/0042 前置 BK-0040
> （并行在途）、BK-0044/0045 待 PTY 依赖批复与前置、BK-0014/0018/0019/0020 各有需
> 批准面或前置未竟、BK-0051 为 doc（心跳不选）——唯一晋升条件已齐备的可穿插项 =
> BK-0046 与 BK-0049（ROADMAP 待办节 6 明载「BK-0046 … 与 BK-0049 … 可随时穿插晋升」）。
> 两者同为 P0/S、同无硬前置；按 ROADMAP 表序取 **BK-0046**（排位在前），且其并载
> BUG-0012 前端联动（已知 Major 缺陷的可见半面，后端兜底迭代 0014 已 done）用户价值
> 更高。PLAN 轮晋升先例：迭代 0030（BK-0036~0038）、0031（BK-0040）、0033（BK-0050）。
> 硬前置复核（本轮亲核）：BK-0017 done 成立——`apps/server/src/approval-review.ts:24-26`
> `role` 值 `^node:(\d+)$` 解析 + `apps/server/src/handlers.ts:290-306` 互审编排
> （审官须为 LLM 节点）均在库。

## 结论

**建议做（本迭代即做）**——三条理由：

1. **授权齐备**：issue#6 批复 2026-10-24 在案，BK-0046 备注明载批复承继；属
   CONSTITUTION 第 3 条变更但已获批准 → 走修宪通道（SPEC 轮补 ADR 草案 → 实现 →
   同迭代 golden 增量），**不需要新一轮 needs-approval**。
2. **前置齐备 + 影响面小**：后端语义 BK-0017（node:id 审官引用 + 审计）与 BK-0022
   （BUG-0012 后端兜底）均 done——本轮为**纯前端接线**：预期 `packages/shared/**`
   与 `apps/server/**` 全域零 diff，不触 DEFS、不触 SSE 契约、不触 baseline。
3. **补齐已批功能的可用半面**：互审协议后端已就位，但用户须手敲 `node:<id>` 才能启用
   （`role` 为 text widget，approval/node.ts:19）——拾取器把已批能力变成可发现的交互；
   BUG-0012 前端联动消除「切语言必语法错」的可见缺陷（后端仅兜底 + warn，面板仍展示
   错误样例）。

## 触UI 分类结论

**是（修宪轮）**。触交互层 + 视觉层（#props 属性面板参数行的交互与呈现）。宪法第 3 条
三要素：

| 要素 | 证据 / 落点 |
| --- | --- |
| ADR | BK-9006 链无既有 ADR → **SPEC 轮产出 ADR 草案**（`docs/adr/00NN-*.md`，编号按落盘时序——现行至 0016，并行路若先落盘则顺延；动机/影响面/像素对比证据方案/授权链 issue#6 承继） |
| 用户批复 | issue#6 用户批复 2026-10-24 在案（BACKLOG BK-9006 行 + 待批准区记录；本 PRD 顶部授权链） |
| golden 增量 | 新场景走 golden-created 通道（预期 s12 起，编号按落盘时序）；**既有 12 场景零波及为预期**，gate 全场景实测确认（REQ-0046-03） |

**波及控制（硬约束）**：

- 改动形态 = **纯插入优先**（app.js 新交互分支 / app.css 新选择器；既有行零删改）。
- **节点体 widget（`widgetHtml`，app.js:734-756）与画布像素零改动**——拾取器只落在
  #props 右侧面板（`renderProps`，app.js:914 / 参数行 :933-937 / 事件委托 :1002-1064），
  故 s0-initial 等既有场景预期零波及（复核：默认工作流 approval 节点 id=7，
  app.js:147；s1 选中 data-id="3" 非本节点，gate.mjs:239）。
- `Skeleton.tsx` 预期零改动（#props 为 legacy 动态渲染区）。
- **DEFS 零改动**：`role` 保持 `text` widget（`nodes.schema.ts:14` WIDGETS 冻结枚举
  零扩张、`nodes.baseline.json` 零变化、defs-drift/nodes-dirs 零联动）；确需任何
  shared 契约变更 → **中止转 needs-approval**（POLICY 需批准区）。
- SSE 零新增（前端消费既有事件，`events.ts` 零触碰）。

## 竞品对照

ComfyUI 无审批/互审节点形态，本项无直接对标；交互形态对齐两点既有基线：① ComfyUI
属性面板参数行的轻量内联控件风格（不引入新面板容器）；② 本仓 `.pvar` 可用变量 chip
「点击 → 光标处插入 token」先例（app.js:1046-1057）与 `showMenu` 轻量菜单
（app.js:1753）——拾取器沿用同族交互，不发明新交互范式。

## 事实校正（按代码事实转写，沿 0027/0029/0034 先例）

1. **BACKLOG 标题「属性面板 to 参数支持节点引用选取」中的 `to` 系笔误**——审批人
   参数实为 **`role`**（`packages/shared/src/nodes/approval/node.ts:19`，text widget，
   default `'值班经理'`）；`to` 是超时策略 combo（:20-25，自动通过/自动拒绝/挂起）。
   节点引用语义挂在 role：`approval-review.ts:24-26` `^node:(\d+)$`。本 PRD 与后续
   SPEC/ADR 一律按 `role` 转写（CLOSE 回写 BACKLOG 时同步勘误标题）。
2. BACKLOG 备注就位时（2026-10-25 治理日）无行号引用；本 PRD 全部行号经本工作树亲核。

## 需求（Given / When / Then）

### REQ-0046-01 · 审批人节点引用拾取器（#props 属性面板）

- **Given** approval 节点被单选，#props 面板以 `.prow` 文本输入框呈现 role 参数
  （app.js:937 默认分支）；启用 BK-0017 互审须手敲 `node:<id>`；画布节点清单为前端
  状态（`state.nodes`）。
- **When** 用户点击审批人参数行的节点拾取入口（纯前端交互件，形态归 SPEC；建议沿
  `.pvar` 插入先例 app.js:1046-1057 + `showMenu` app.js:1753 轻量菜单），
- **Then** 弹出画布节点清单（排除 approval 节点自身；可辨 LLM 节点——审官须为 LLM
  类型，handlers.ts:290-296 语义对齐），选中即把 `node:<id>` 写入 role 输入框
  （含已有值时的覆盖语义，SPEC 定）；手敲自由文本（人工审批路径）能力保持不变。
- **Given** role 已为 `node:<id>` 值，**When** 打开拾取器，**Then** 当前指向节点在
  清单中呈选中态（可辨现状，避免盲改）。

### REQ-0046-02 · BUG-0012 前端联动（code 节点 lang 切换默认样例联动）

- **Given** code 节点 `lang` combo（Python/JavaScript，code/node.ts:18-22）与 `code`
  textarea（:23-24，DEFS 默认为 Python 样例）；lang 切换后 code 不变 → 运行必语法错
  （后端兜底 BK-0022 已 done：handlers.ts:104-114 仅「lang=JavaScript 且 code 逐字等于
  DEFS 默认样例」时替换执行 + warn；前端半面未修——issue#6 追评在案，BK-0046 并载）。
- **When** 用户把 lang 从 Python 切到 JavaScript（或反向），且当前 code 值**逐字等于
  切换前语言的默认样例**（未被自定义），
- **Then** code 值自动替换为目标语言的等价样例；若 code 已被自定义（不等于任一语言
  默认样例）则**零改动**（绝不覆盖用户代码——与后端兜底「唯一组合命中」同口径）。
- **样例一致性硬约束**：Python 样例须取自 DEFS 运行时值（`paramDefaultsOf` 单一来源
  先例，handlers.ts:110——前端不复制 Python 字面量）；JS 等价样例须与 handlers.ts
  BK-0022 兜底样例**逐字一致**。默认落点 = JS 样例为前端字面量 + **源锁守护断言**
  （app.js 字面量 ↔ handlers.ts 字面量一致性，防两处漂移；载体归 SPEC，沿 M08-M11
  源锁断言先例）。备选落点 = shared 常量导出（非 DEFS 面），若 SPEC 改判须同步申报
  handlers.ts 引用改动并放宽对应禁区条目、以 baseline 重产 cmp 零差异为判据。
- **联动挂点**：lang 写入的两个入口（#props 面板 change 委托 app.js:1030-1036 与
  节点体 widget 变更路径）均须生效；统一挂点归 SPEC 定界。
- **交互提醒（可选增强，SPEC 定）**：发生替换时 toast 提示（语义沿后端 warn 文案
  「默认样例与所选语言不匹配，已替换为等价样例」）。

### REQ-0046-03 · golden 场景增量（确定性）

- **Given** gate 现 12 场景（gate.mjs:237-255，s0~s11），无场景选中 approval 节点，
  **When** 新增确定性场景（编号按落盘时序预期 s12 起，并行路占号则顺延——
  ADR-0015 §5 / 迭代 0034 先例）：
  - 场景 A「approval 属性面板 + 拾取器打开态」：选中默认工作流 approval 节点（id=7）
    → 打开拾取菜单 → 终态采集；
  - 场景 B「code lang 联动后态」：选中 code 节点 → lang 切 JavaScript → 等重渲染
    终态 → 采集（样例已替换）。
- **Then** 新基线经 golden-created 通道落盘（png + invariants）；s0~s11 **零波及
  gate 实测**（任一意外红 → FAIL 并中止排查，不以重录掩盖）；两场景基线**连续两次
  采集逐字节一致**（0013 BUG-0026 间歇抖动教训）；`gate:update` 预期使用次数 **0**
  （若确属预期受波及须留证且 ≤1 次）。

### REQ-0046-04 · 回归面（后端零改动）

- `npm run smoke:server` 既有全量（本工作树基线 118 passed，含 V01-V09 approval 互审
  链）零回退；若 REQ-0046-02 采用源锁断言载体在 tests/smoke，则 +1 断言并计数。
- `npm test` 30/30 零回退（shared 零改动预期）。
- `apps/server/**` 零 diff 为机器判据（默认落点方案下）。

## 非功能要求

1. **零新依赖 / 零新 env / 零出站类别**：`package.json` / `package-lock.json` 零 diff。
2. **零 shared 契约改动**：`events.ts`、`nodes/**`（DEFS）、`nodes.baseline.json`、
   `nodes.schema.ts` 零 diff（默认落点方案下 packages/shared 全域零 diff）。
3. **纯插入优先**：app.js 新分支 / 新委托子句、app.css 新选择器（现 597 行 → 预期
   +10~20）；既有行零删改；app.js 现 2740 行 → 预期 +60~90；无新增源文件预期
   （若有须 ≤400 行，AGENTS.md 硬性约定 4）。
4. **不做范围**：不做 kb 动态化（BK-0047）/ on-error 参数（BK-0048）/ MCP·skills
   清单动态化（BK-0049）/ 节点库智能体类目（BK-0050，并行在途）；不做节点体 widget
   拾取器（本轮限 #props 面板）；不动 role 互审后端语义（BK-0017 已 done）；不做任何
   DEFS/枚举扩张（越界即中止转 needs-approval）。

## 受影响文件清单（SPEC 消费；默认落点方案）

| 路径 | 动作 | 说明 |
| --- | --- | --- |
| `apps/web/src/legacy/app.js` | 改（纯插入） | 拾取器交互件 + 菜单渲染 + lang 联动挂点 + （可选）toast |
| `apps/web/src/app.css` | 改（纯插入） | 拾取入口/菜单新选择器 |
| `apps/web/src/Skeleton.tsx` | 预期零改动 | #props 为 legacy 动态渲染区 |
| `tools/pixel-gate/gate.mjs` | 改（纯插入） | +2 场景行（s12 起按落盘时序，占号顺延） |
| `tests/golden/ui/**` | 新增 | 新场景基线（png + invariants，golden-created 通道） |
| `tests/smoke/**` | 改（条件） | 仅 REQ-0046-02 源锁断言载体（SPEC 定具体文件） |
| `docs/adr/00NN-approval-role-picker-code-lang-sync.md` | 新增 | ADR 草案（SPEC 轮产出；编号按落盘时序，现行至 0016） |
| `docs/evolution/BACKLOG.md` | 改（CLOSE 回写） | BK-0046 终态 + 标题 to→role 勘误 |

**禁区（零 diff 机器判据，默认落点方案）**：`packages/shared/**`、`apps/server/**`、
`package.json`、`package-lock.json`、`CONSTITUTION.md`、`AGENTS.md`、
`.github/workflows/`、`tests/golden/`（既有基线零修改——仅新增）。

## 验收口径（AC）

- **AC1 gate**：`npm run gate` 全绿——2 新场景 golden-created 落盘；s0~s11 零波及
  实测；`gate:update` 次数 0（例外仅限确属预期受波及且留证，≤1）。
- **AC2 契约**：`npm test` 30/30 零回退（默认落点下 shared 零 diff 佐证）。
- **AC3 冒烟**：`npm run smoke:server` 118/0 零回退（V01-V09 互审链含在内；+源锁
  断言时按新计数）。
- **AC4 手动 E2E 五点位**：① 选中 approval 节点 → #props 审批人行出现拾取入口；
  ② 打开清单（LLM 节点可辨、自身排除）→ 选择 → role 填入 `node:<id>` 且现状选中态
  正确；③ 带 `node:<id>` 运行 → 互审链路回填（approval:required → 裁决 →
  approval:done，沿 V 组后端语义）；④ code 节点 lang 切 JavaScript → 样例替换
  （含节点体与 #props 两入口）、切回 Python 恢复、自定义 code 不被覆盖；⑤ 手敲
  自由文本 role → 人工审批路径行为不变。
- **AC5 白名单与禁区**：改动文件恰为上表清单（条件项按 SPEC 终稿）；禁区路径
  `git diff` 恒空；`package-lock.json` 零变化。
- **AC6 指针抽样**：≥5 组代码/ADR 指针逐条亲核零杜撰（行号按代码事实转写）。
- **AC7 确定性**：新场景基线连续两次采集逐字节一致；不能收敛 → FAIL，不得重录掩盖。
- **AC8 样例一致性**：JS 等价样例与 handlers.ts BK-0022 兜底样例逐字一致（源锁断言
  在库，或 SPEC 改判 shared 落点后以单一来源证）。

## 迭代编排与 issue 回执

- BK-0046 为 **BK-9006 五子项之一，非链终轮**（BK-0047/0048/0049 仍 proposed、
  BK-0050 并行在途）→ 本迭代 CLOSE **只发进度回执，不关 issue#6**（关单留五子项
  全部终了由末项 CLOSE 回执，BACKLOG BK-9006 行在案；沿 issue#10/11 与 0033/0034
  轮先例）。
- **不属批次化跨迭代条目**：BK-0046 为单迭代可完结的 S 项，本轮收口即置终态，
  `STATE.item` 不跨迭代续填。
- **触 UI 的 S 项不免 SPEC**（skipSpec=false）：SPEC 轮须交付受影响文件清单终稿 +
  ADR 草案（含像素对比证据方案）+ golden 场景方案与确定性论证。
