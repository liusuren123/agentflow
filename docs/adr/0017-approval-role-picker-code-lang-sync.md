# ADR-0017 · approval 审批人节点引用拾取器 + code 节点 lang 切换样例联动修宪方案

- 状态：**已获用户 issue#6 批复（2026-10-24 批复在案，BK-9006 链 · BK-0046 备注明载
  「批复承继 issue#6」）· 本文件为该批复的 SPEC 轮草案载体——按 ADR-0013 先例全文
  保留草案态措辞（实施授权已在案，无需新一轮 needs-approval）**
- 日期：2026-10-26（SPEC 阶段产出，迭代 0038 / BK-0046，工作树 feat/0038-iter）
- 关联：BACKLOG BK-0046（本迭代 · P0/S/ui-proposal，来源 issue#6）/ BK-9006（既有节点
  UI 参数扩展杂项，issue#6 批复母项）/ BUG-0012（code lang 错配缺陷，前端半面）/
  BK-0017（node:id 互审语义，done · 迭代 0016）/ BK-0022（BUG-0012 后端兜底，done ·
  迭代 0014）；POLICY.md 需批准区（UI 三层 / golden）
- 版式对齐：ADR-0013 / ADR-0015

> **显著声明：本 ADR 为修宪方案，触 UI 三层中的交互层与视觉层（#props 属性面板参数行
> 的交互与呈现）。授权链 = issue#6 用户批复（2026-10-24，BK-9006「既有节点 UI 参数
> 扩展杂项」）承继 + 本 ADR。实施归迭代 0038 修宪轮（BK-0046）；实施时 BUILD 轮按
> 宪法第 3 条在同一迭代内完成 golden 增量。本 ADR 不实施任何代码。**

## 1. 动机与现状证据

issue#6（BK-9006，用户批复 2026-10-24）授权对既有节点做 UI 参数扩展杂项；BK-0046
为其中「approval 审批人节点引用选取」子项并并载 BUG-0012 前端联动（issue#6 追评
在案）。两条动机各有代码级现状证据（本 SPEC 会话于工作树逐项亲核）：

- **互审能力不可发现**：后端 BK-0017 已落地 `role=node:<id>` 审官指派——
  `apps/server/src/approval-review.ts:25-28` `parseAgentRole` 以 `^node:(\d+)$`
  解析，`apps/server/src/handlers.ts:288-318` 指派画布 LLM 节点为审官（非 LLM 审官
  判定不可用，:295-296）。但前端 `role` 是普通 text widget
  （`packages/shared/src/nodes/approval/node.ts:19`，default `'值班经理'`）——用户
  须手敲 `node:<id>` 才能启用已批能力，且无从得知 id 与「须为 LLM 节点」约束。
- **切语言必语法错的可见缺陷**：code 节点 `lang` combo（Python/JavaScript，
  `packages/shared/src/nodes/code/node.ts:18-22`）切换只写 lang 不动 code
  （app.js 两条 change 委托直写 params）；DEFS 默认 code 为 Python 样例
  （:23-24），lang=JavaScript + Python 样例组合由 JS wrapper 执行即 SyntaxError。
  后端兜底 BK-0022 已 done（handlers.ts:100-115：仅「lang=JavaScript 且 code 逐字
  等于 DEFS 默认样例」时替换执行 + warn），但前端半面未修——面板仍展示错误样例，
  用户在运行前看不到问题。

## 2. 交互方案（REQ-0046-01 · 审批人节点引用拾取器）

落在 **#props 右侧属性面板**（renderProps，app.js:914-964），不触节点体 widget
（widgetHtml，app.js:734-756）与画布像素。三件套（细化归实施 SPEC §3.1）：

1. **拾取入口**：approval 节点被单选时，在审批人参数行（text 默认分支，app.js:937
   渲染）的输入框下方注入一枚轻量按钮「从画布选择审官节点」。仅 approval 节点出现，
   其余 text 参数与其余节点零波及。
2. **节点清单菜单**：复用既有 `showMenu` 轻量菜单（app.js:1753-1773）与 `#ctxmenu`
   容器——不引入新面板容器、不发明新交互范式（对齐 `.pvar` 变量 chip「点击 → 插入」
   先例 app.js:1046-1057 的交互族）。清单 = 画布全部节点排除 approval 自身；LLM 节点
   为可选项（右侧 `mk` 槽标「LLM」），非 LLM 节点置灰不可选（点击 toast 提示
   「仅 LLM 节点可担任互审审官」，与 handlers.ts:295-296 非 LLM 审官不可用语义对齐）；
   画布无 LLM 节点时菜单顶部呈提示行。`role` 已为 `node:<id>` 时，当前指向节点在
   清单中带 ✓ 标记（可辨现状，避免盲改）。
3. **写回语义**：选中即整体覆盖 role 输入框为 `node:<id>`，经既有 change 委托
   （app.js:1002-1037）落 `n.params.role` 并重渲染节点体——与 `.pvar` 插入的
   `dispatchEvent(change)` 同型（app.js:1055）。手敲自由文本（人工审批路径）能力
   保持不变。

## 3. 联动方案（REQ-0046-02 · BUG-0012 前端半面）

lang 切换时，若当前 code 值**逐字等于切换前语言的默认样例**（未被自定义），自动替换
为目标语言等价样例；已被自定义（不等于任一语言默认样例）则零改动——与后端兜底
「唯一组合命中、绝不覆盖用户代码」同口径（handlers.ts:106-109 注释语义）。要点：

- **单一来源**：Python 样例取 DEFS 运行时值（前端 `DEFS.code.params` 读默认值，
  不复制字面量——对齐 handlers.ts:110 `paramDefaultsOf` 先例）；JS 等价样例为前端
  字面量，**须与 handlers.ts:113 兜底字面量逐字一致**，一致性由源锁断言守护
  （smoke K04，锁 app.js ↔ handlers.ts 两处字面量，沿 M08-M11 源锁先例
  tests/smoke/mcp-stubs.mjs:205-217）。
- **双入口挂点**：#props 面板 change 委托（app.js:1030-1036）与节点体 widget 变更
  路径（app.js:1673-1682）两处写入均生效，统一收敛到单一联动函数。
- **替换提醒**：发生替换时 toast 提示，文案沿后端 warn 语义
  「默认样例与所选语言不匹配，已替换为等价样例」。

## 4. 影响面与波及控制

| 面 | 内容 | 控制手段 |
| --- | --- | --- |
| 改动文件 | `apps/web/src/legacy/app.js`（纯插入，现 2740 行 → 预期 +60~90）、`apps/web/src/app.css`（纯插入新选择器，现 597 行 → 预期 +10~20）、`tools/pixel-gate/gate.mjs`（纯插入 +2 场景）、`tests/golden/ui/**`（仅新增两场景基线）、`tests/smoke/smoke-server.mjs`（纯插入 K04 源锁断言） | 既有行零删改；新增源文件 0 |
| 契约面 | `packages/shared/**` 与 `apps/server/**` 全域零 diff（默认落点方案）；`role` 保持 text widget（WIDGETS 冻结枚举 nodes.schema.ts:14 零扩张）；SSE 零新增 | 禁区 `git diff` 恒空为机器判据；越界即中止转 needs-approval |
| 既有 golden | s0~s11 十二场景零波及：拾取按钮仅在 approval 节点被单选时进入 #props（s0 无选中、s1 选中 id=3 非本节点、s8-s11 的 seed/步骤不含 approval 单选）；lang 联动仅在 code 节点 lang 变更时触发（无既有场景触此路径） | gate 全场景实测；任一意外红 → FAIL 中止排查，不以重录掩盖 |
| 依赖面 | 零新依赖 / 零新 env / 零出站类别 | `package.json` / `package-lock.json` 零 diff |

**宪法第 3 条三要素**：

| 要素 | 落点 |
| --- | --- |
| ① ADR | 本文件（BK-9006 链无既有 ADR，本 ADR 为该链首个 UI 参数扩展载体） |
| ② 用户本人批准 | issue#6 用户批复 2026-10-24 在案（BACKLOG BK-9006 行 + 待批准区记录；BK-0046 备注明载批复承继） |
| ③ 像素对比证据 | 见 §5 证据方案（实施轮产出） |

## 5. golden 增量预案（双通道）与像素对比证据方案

沿 ADR-0015 §6 双通道口径，本轮形态为**零重录 + 两新增**：

- **新增场景走 golden-created 通道**（gate.mjs:321-325：基线 png 不存在即落盘并记
  golden-created 状态，非 `gate:update` 通道）：
  - 场景 A「approval 属性面板 + 拾取器打开态」：默认工作流（fresh boot = kefu 模板，
    含 approval id=7，app.js:147/2498-2508）→ 单选 id=7 → 打开拾取菜单 → 终态采集；
  - 场景 B「code lang 联动后态」：seed 触发器→code 双节点工作流（沿 s10/s11 seed
    先例 gate.mjs:232-235）→ 单选 code 节点 → #props 切 lang=JavaScript → 等重渲染
    终态 → 采集（样例已替换为 JS 等价样例）。
  - 场景编号按落盘时序（预期 s12/s13；并行路占号则顺延，ADR-0015 §5 先例：改名非
    重录、像素内容零变化）。
- **既有 s0~s11 零重录**：`gate:update` 预期使用次数 **0**（例外仅限确属预期受波及
  且留证，≤1 次）。
- **像素对比证据**：① 实施前基线 = 工作树基线门禁 12 场景全绿记录；② 实施后 =
  gate 全场景输出（s0~s11 pass 零 diffPx + s12/s13 golden-created）；③ 手动前后对比
  = #props approval 参数行与 code 参数行在改动前后的截图（BUILD/VERIFY 轮采集，
  点位见实施 SPEC §6）；④ 确定性 = 新基线连续两次采集逐字节一致（BUG-0026 间歇
  抖动教训，迭代 0013）。

## 6. 验收口径（摘要，细化归实施 SPEC §5）

`npm run build` + `npm run gate`（全绿：2 新场景 golden-created 落盘 + s0~s11 零波及
实测 + gate:update 次数 0）+ `npm test`（零回退，基线 30/30）+ `npm run smoke:server`
（零回退，基线 118 passed + K04 源锁新增 → 119）+ 手动 E2E 五点位（拾取入口出现 /
清单选择与现状选中态 / node:id 运行互审链路回填 / lang 双入口联动与自定义不覆盖 /
手敲自由文本人工路径不变）。

## 7. BACKLOG 定界（本 ADR 授权的精确边界）

- **做**：BK-0046 全部（REQ-0046-01 拾取器 + REQ-0046-02 前端联动 + REQ-0046-03
  golden 两场景增量 + REQ-0046-04 回归面）；CLOSE 回写 BACKLOG 时同步勘误标题
  「属性面板 to 参数」→「属性面板 role 参数」（to 系笔误，PRD 事实校正 1）。
- **不做**（PRD 非功能要求 4 逐条）：kb 动态化（BK-0047）/ on-error 参数（BK-0048）/
  MCP·skills 清单动态化（BK-0049）/ 节点库智能体类目（BK-0050，并行在途）；节点体
  widget 拾取器（本轮限 #props 面板）；role 互审后端语义（BK-0017 已 done）；任何
  DEFS/枚举扩张（越界即中止转 needs-approval）。
- **issue 回执**：BK-0046 为 BK-9006 五子项之一非链终轮 → CLOSE 只发进度回执不关
  issue#6（沿 issue#10/11 与 0033/0034 轮先例）。
