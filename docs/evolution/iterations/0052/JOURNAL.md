# 迭代 0052 · JOURNAL — BK-0058 gate.mjs 头注场景数同步：6→16（BUILD）

> BUILD 轮产物（WORKFLOW.md §4 BUILD 契约）。code-developer 产出。
> 本轮隔离工作树 `.zcode/worktree/feat/0052-iter/`（分支 `feat/0052-iter`）。
> 时间 2026-10-26 15:00–15:06。S 项免 SPEC（PRD §4 受影响文件清单即实现依据）。

## 1. 开工前阅读（按派发指令）

- `.zcode/agents/code-developer.md`（职责与硬约束）、`CONSTITUTION.md`（第 1/2/3/5 条）、
  `AGENTS.md`（仓库地图与硬性约定）、`docs/evolution/WORKFLOW.md`（§4 BUILD 契约、
  §6 安全护栏）、`docs/evolution/iterations/0052/PRD.md`（S 项 skipSpec，受影响文件
  清单与验收口径内嵌 §4/§5）。

## 2. 立项证据锚点亲核（动手前复核 PRD §2 指针，全部只读）

1. **E1（滞后现状）**：`tools/pixel-gate/gate.mjs:4-6` 头注亲读——「· **6 个**
   golden 场景…」「s0~s3 离线静态态；s4/s5 在线态（ADR-0009，issue#7 批准）
   ——Playwright 路由拦截 fixture 供数…+ 时区钉死 UTC」，与 PRD 引文逐字一致。
2. **E2（SCENARIOS 实况，:348-378）**：数组亲读 + 机器复核（见 §4.3）——
   routes 字段恰 s4（WF_ROUTES，:353）/s5（RUN_ROUTES，:355）/s9（SESSION_ROUTES，
   :361）/s15（CAP_ROUTES，:375）四场景；`timezoneId:'UTC'` 仅 s4/s5 两处（:353/:355，
   与 :382 代码注释「仅 s4/s5 传 'UTC'」一致）；s6/s7=after 钩子（:357-358）；
   s8/s10/s11/s12/s14=seed（:359/:364-369/:372-374）；s13 仅 steps+ready+inv（:370-371，
   **无 seed/无 routes**——枚举行措辞按此避免把 s13 归入 seed 组）；溯源简注核实
   s9=迭代 0032（:197 块注释）、s15=迭代 0039（:290 块注释）。
3. **E3（实况锚点）**：`ls tests/golden/ui/*.invariants.json` → **16** 份
   （s0-initial…s15-caps-panel 连续无缺号）。
4. **授权链（E4）**：PRD §0 授权 = issue #13 用户批复（approved 在案），射程 =
   头注注释级场景数同步；非修宪轮、golden 零接触（本 JOURNAL §6 复证）。

## 3. 改动（REQ-0058-01/02，恰 1 文件、净 +2 行、全在头注注释区）

`tools/pixel-gate/gate.mjs:4-8`（原 :4-6 三行 → 五行；`git diff --stat` =
`5 insertions(+), 3 deletions(-)`，净 +2 ≤ PRD 非功能上限 4）：

```diff
- *  · 6 个 golden 场景，双重复核：像素 0 容差 diff + DOM 不变量
- *    s0~s3 离线静态态；s4/s5 在线态（ADR-0009，issue#7 批准）——Playwright
- *    路由拦截 fixture 供数（probe 的 /api/health + /api/v1 列表）+ 时区钉死 UTC
+ *  · 16 个 golden 场景，双重复核：像素 0 容差 diff + DOM 不变量
+ *    s0~s3 离线静态态；s4/s5/s9/s15 在线态——Playwright 路由拦截 fixture 供数
+ *    （probe 的 /api/health + /api/v1 列表），其中 s4/s5（ADR-0009，issue#7 批准）
+ *    时区钉死 UTC、s9/s15 溯源迭代 0032/0039；其余 s6~s8、s10~s14 为离线扩展场景
+ *    （日志面板 after 钩子 / seed 预置工作流 / 步进交互）
```

- **REQ-0058-01**：:4 词级替换 6→16，行内其余文字（「，双重复核：像素 0 容差
  diff + DOM 不变量」）逐字保留。
- **REQ-0058-02**：枚举行按 §2 E2 分组同步——① 在线态显式列 s4/s5/s9/s15
  （=routes 字段四场景逐一对应）；② ADR-0009 溯源括注保留且仅指涉 s4/s5 本身，
  s9/s15 按 PRD 授权加简注（迭代 0032/0039，块注释 :197/:290 亲核）；③ s0~s3
  离线静态态表述逐字保留；④ 其余并为一短语并增「步进交互」形——因 s13 实况
  无 seed/无 routes（:370-371），PRD 例句「日志面板钩子 / seed 预置工作流」
  不足以名实相符覆盖 s13，按 PRD §7 措辞风险条款（不虚构归类）以三形并列；
  ⑤ 「时区钉死 UTC」改写为「其中 s4/s5（…）时区钉死 UTC」——指涉不扩大，
  与 runScenario :382「仅 s4/s5 传 'UTC'」注释实况一致；⑥ :6 原「（probe 的
  /api/health + /api/v1 列表）」微调为四场景通用供数描述（四组路由均拦
  /api/health probe + 各自 /api/v1 端点：workflows/runs/sessions/capabilities）。
- **零改动面**：SCENARIOS 数组、runScenario、import 等一切可执行语句与
  :9-11 稳定性等待、npm run gate/gate:update 使用说明段逐字未动。

## 4. BUILD 期间自检（本人在工作树内实跑，命令+真实输出）

1. **语法零变化（AC1 前半）**：`node --check tools/pixel-gate/gate.mjs` →
   退出码 0（SYNTAX-OK）。注释级改动的行为面佐证。
2. **改动面机器证明（AC2 口径）**：
   - `git diff HEAD --stat -- tools/` → `1 file changed, 5 insertions(+),
     3 deletions(-)`，恰 gate.mjs 1 文件；
   - `git diff HEAD -- tools/pixel-gate/gate.mjs` → 唯一 hunk @@ -1,9 +1,11 @@，
     8 个变更行全部位于 `/* … */` 头注区且均含 ` * ` 注释前缀；含字面
     「16 个 golden 场景」；diff 中无任何可执行语句行。
3. **枚举一致性（AC3 口径，逐组机器核对）**：
   - `sed -n '/^const SCENARIOS = \[/,/^\];/p' | grep -c "id: 's"` → **16**
     = `ls tests/golden/ui/*.invariants.json | wc -l` → **16** = 头注「16 个」；
   - routes 携带者 grep 输出恰 s4-workflows-online / s5-history-online /
     s9-goal-panel-online / s15-caps-panel 四行，与头注「s4/s5/s9/s15 在线态」
     逐一对应；
   - timezoneId grep 输出仅 s4/s5 两行，头注 UTC 指涉（「其中 s4/s5（…）时区
     钉死 UTC」）未扩大；
   - 头注场景号全集 = {s0~s3, s4/s5/s9/s15, s6~s8, s10~s14} = s0~s15 恰满，
     无数组外号码。
4. **禁区白名单恒空（AC5 口径）**：`git diff HEAD -- apps packages tests
   .github 'package*.json'` → 输出恒空（FORBIDDEN-ZONES-EMPTY；含
   tests/golden——golden 零接触为批复射程的机器证明）。

## 5. 未跑项（归脚本统一门禁，如实声明）

- `npm run build` / `npm run gate` / `npm test` / `npm run smoke:server` 未由本人
  运行——派发指令明示完整门禁与 git 提交由脚本统一执行。本项改动为纯注释
  （node --check 已过），对 build/test/smoke 输入零因果；gate 面由脚本运行裁决，
  若现 s3-library 单场景红（diffPx≈21~23 形态），按 PRD AC1 预案处置（本机采样
  抖动在案 0037~0051，CI 权威，issue #12 待批复，不消费 gate:update）。
- **未运行 `npm run gate:update`、未接触 golden**（非修宪轮，宪法第 3 条；
  AC5 已机器证明 tests/ 零 diff）。

## 6. 边界确认

- 未触 UI、未扩大影响面：改动恰为 PRD §4 白名单唯一产品文件
  `tools/pixel-gate/gate.mjs`；零触碰清单（tests/golden/**、apps/**、packages/**、
  tests/**、.github/**、package*.json、docs/adr/**、tools/pixel-gate/ 其余文件）
  diff 恒空，无 blockedReason。
- POLICY 需批准区（tools/pixel-gate/ 改动）授权链闭环：issue #13 用户批复
  （PRD §0/E4），射程 = 注释级场景数同步，本改动未越射程（无一行可执行语句
  变化）。
- 不做范围（PRD §6）：未扩写头注其他段落（:9-11 逐字保留）；未动
  AGENTS.md:47 断言数（禁止区）；未动 BK-0040 与 #4/#5/#6 链；未为注释新增
  断言（§3 非功能既定，16 场景行为面已由 gate 自身逐场景 diffPx=0 + DOM 不变量
  机器守护）。

## 7. productFiles 申报（相对工作树根）

- `tools/pixel-gate/gate.mjs`（唯一产品面改动；STATE/JOURNAL 为过程件，
  由机制件提交承载，不入产品提交）。
