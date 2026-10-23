# JOURNAL · 迭代 0013 · BK-9001 底部日志面板按级别过滤（BUILD · 修宪轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 03:50 · **修复轮 1（BUG-0026）
> 追加于 04:14，见 §6**
> 输入：`PRD.md`（REQ-9001-01~06 / AC1~AC8）+ `SPEC.md`（§0 锚点 / §1 方案 / §2 白名单
> / §3-§5 逐字规格 / §7 验收口径）+ `docs/adr/0010-log-panel-level-filter.md`（SPEC
> 阶段落盘，状态=已获 issue#1 用户本人批复 2026-10-23T15:50:05Z——修宪轮授权在案，
> 本次 BUILD 属宪法第 3 条通道内的实现步）。实现严格按 SPEC §2 白名单六处落点，
> 未扩大影响面。完整门禁（`npm run build` + `npm run gate` 双跑含 s6/s7
> golden-created 落盘 + `npm test`）与 git 提交由脚本统一执行，BUILD 未自行运行。

## 1. 改动清单（4 个已改文件，与 SPEC §2 表一一对应；golden 4 文件待脚本门禁落盘）

| 文件 | 净改动（实得 git diff） | 改动内容（落点） |
| --- | --- | --- |
| `apps/web/src/Skeleton.tsx` | +7 行（`@@ -121,0 +122,7`，纯插入） | REQ-9001-01/SPEC §3 逐字：`#bp-head` 内 `执行日志` 文本后、`#log-clear` 前插入 `#log-filter` 包裹 + 5 chip 按钮（`全部[on]/sys/info/warn/ok`），默认「全部」静态携带 `on`；缩进按文件上下文（bp-head 子项 14 空格、chip 16 空格），DOM 属性与文本逐字同 SPEC §3 |
| `apps/web/src/app.css` | +11 行（`@@ -532,0 +533,11`，纯尾部追加） | REQ-9001-01/SPEC §4 逐字：1 空行 + 1 注释 + `#log-filter` 1 行 + `.chip` 2 行 + `:hover` 1 行 + `.on` 1 行 + 4 条 `#log-body[data-lvl]` 隐藏规则。**行数与 SPEC §4 代码块逐字一致=11**（SPEC §2 表与 ADR §2.2 记「12 行」系其自身枚举 1+1+1+2+1+1+4=11 的计数笔误，见 §2 偏差 2）；预算 ≤15 ✓ |
| `apps/web/src/legacy/app.js` | +7 行（`@@ -1792,0 +1793,7`，纯插入） | REQ-9001-02/SPEC §5.5 逐字：`#log-clear` 监听（:1792）后插入 `#log-filter` click 事件委托——`closest('.chip')` 命中才处理、chips 独占 `on`（`classList.toggle('on', c===chip)`）、「全部」`delete dataset.lvl`（属性缺省=无过滤）否则写入级别；绑定于 `#log-filter` 包裹层，不绑 document（PRD 风险 4）。`addLog`（:1838-1846）零改动 ✓ |
| `tools/pixel-gate/gate.mjs` | +47 行（3 hunk 全纯插入，`grep -Ec '^-[^-]|^-$'`=0） | SPEC §2 ③处：① `runInv` 块后追加 44 行 s6/s7 基建（§5.2 逐字：`logPanelAfter(openLvl)` 经 `#rail-bp` 真实 toggle 重开面板 + evaluate 直写 5 行固定字面量（sys/info/warn/ok/info，`.t` 恒 `00:00:00`）+ 可选真实 click chip；`logInv` 采 chips 词表+激活态/`filter`/逐行级别+可见性）；② `SCENARIOS` 尾部追加 s6/s7 两条件（含必要偏差 `steps: []`，见 §2 偏差 1）；③ `runScenario` 内 `await normalize(page);` 后插入 1 行 `if (sc.after) await sc.after(page);`（§5.1 时序论证：normalize 每场景收起面板，展开态快照只能在其后构造；s0~s5 无 `after` 字段=无操作）。既有场景条目与公共不变量采集器（:159-176 原文）零改动 ✓ |

产品净改动合计 +72/−0（Skeleton 7 + app.css 11 + app.js 7 + gate.mjs 47）。
白名单另两处：`tests/golden/ui/` s6/s7 共 4 基线文件由脚本首跑 `npm run gate` 经
golden-created 通道（`gate.mjs` 基线不存在时落盘）产生；`docs/adr/0010-*.md` 已在档
（SPEC 阶段产出，本次 BUILD 核对内容与实现一致：§3 DOM/CSS 全文与落盘改动逐字同）。

## 2. 与 SPEC 的偏差记录（2 处；1 实现级必要调整 + 1 计数笔误澄清，均无语义/断言口径变化）

1. **SCENARIOS s6/s7 条目补 `steps: []`（SPEC §5.3 条目字面无此字段）**：`runScenario`
   既有行 `for (const step of sc.steps) await step(page);` 对 `sc.steps` **无 `|| []`
   保护**（对照：`routes` 有 `|| []`、`ready`/`inv`/`timezoneId` 有条件守卫，唯
   `steps` 无），且既有全部条目均显式携带 `steps`（s0 即 `steps: []`）。若按 SPEC
   字面省略，`for...of undefined` 直接抛 `TypeError: undefined is not iterable`
   （本会话 `node -e "try{for(const x of undefined){}}catch(e){...}"` 实证输出在案），
   s6/s7 永远失败、golden 无法落盘。处置：条目补 `steps: []`——语义与 SPEC 意图
   完全一致（零步骤），不改既有行（改 :144 加守恒保护反而违反「既有行零删改」），
   白名单落点不变。s6/s7 其余字段（`after`/`inv`）逐字同 §5.3。
2. **app.css 追加行数实作 11 而非 SPEC §2/ADR §2.2 记载的 12**：SPEC §2 表自枚举
   「1 空行+1 注释+`#log-filter` 1+`.chip` 2+`:hover` 1+`.on` 1+4 隐藏」合计即为 11，
   其权威代码块 §4 亦恰 11 行；本实现与 §4 逐字一致（零第 12 行可追加）。PRD
   NFR-3 预算 ≤15 满足；AC6 白名单口径（路径+纯追加）不受影响。属 SPEC 计数
   笔误的如实澄清，非偏离设计。

## 3. 自检（BUILD 内执行；完整门禁 build/gate 双跑/test 由脚本统一执行，未自行运行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| JS 语法 | `node --check tools/pixel-gate/gate.mjs`；`node --check apps/web/src/legacy/app.js` | 双双通过（`GATE_SYNTAX_OK` / `APPJS_SYNTAX_OK`，退出码 0） |
| 纯插入零删改（AC6 前置） | `git diff -U0 -- <Skeleton.tsx app.css app.js>` 与 `-- <gate.mjs>` 各接 `grep -Ec '^-[^-]|^-$'` | 两轮均输出 **0**（无任何删除/修改行，全部为追加/插入 hunk）；hunk 落点：Skeleton `+122,7`、app.css `+533,11`、app.js `+1793,7`、gate.mjs `+119,50 / +172,8 / +192,7` |
| `steps:[]` 偏差必要性实证 | `node -e "try{for(const x of undefined){}}catch(e){console.log(...)}"` | 输出 `TypeError: undefined is not iterable`（§2 偏差 1 依据） |
| 改动面白名单（AC5/AC6 前置，只读 git） | `git status --short` + `git diff --stat` | 产品路径恰为白名单四处已改（Skeleton/app.css/app.js/gate.mjs，+72/−0）+ 白名单第五处 golden 4 文件待脚本落盘 + ADR-0010 已在档（??）；进化过程文件 `docs/evolution/STATE.md`（含 PLAN/SPEC 阶段既有未提交改动 + 本轮 phase/updated/last_result）与 `docs/evolution/iterations/0013/`（PRD/SPEC/本 JOURNAL）按仓库惯例不入产品提交。`packages/shared/**`、`apps/server/**`、`apps/web/src/server-sync.js`、`.github/**`、`tests/smoke/**`、`tests/canvas/**`、s0~s5 基线 12 文件零触及 |
| 规模预算（PRD NFR-3） | `git diff --stat` | app.css +11 ≤15 ✓；app.js +7 ≤30 ✓；gate.mjs +47 ≤60 ✓；零新增源文件 ✓ |

**未运行**（属脚本统一门禁序列，BUILD 按派发指令不自行执行）：`npm run build` /
`npm run gate`（首轮 s0~s5 pass + s6/s7 golden-created、次轮 8 场景 pass 的双跑）/
`npm test` / git 提交。**未运行**（VERIFY 职责，SPEC §7.3/§7.4）：AC3 手动 E2E
七点位、AC4 反演演练。**尝试未成**：esbuild transform 级 TSX 语法检查被 Mimosa
提交前钩子误判（带 `> /dev/null` 重定向的命令模式匹配为「经 shell 写源码」）拒绝
执行，未重试；Skeleton.tsx 改以 diff 逐字核对为证（插入块标签闭合完整、属性合法、
与 SPEC §3 逐字一致），权威编译检查由脚本 `npm run build` 门禁承载。

## 4. 脚本门禁预期与 VERIFY 断言基准

- **脚本执行序列**：`npm run build`（gate 前置，产出 apps/web/dist）→ 首跑
  `npm run gate`：预期 s0~s5 六场景 `pass · diffPx=0` 且无 DOM 不变量变化、
  s6/s7 两场景 `golden-created`（`tests/golden/ui/` 新增 4 文件：s6/s7 的
  `.png` + `.invariants.json`）→ 次跑 `npm run gate`：8 场景全 `pass · diffPx=0`
  → `npm test` 全绿。AC2 双跑口径；若 s0~s5 出现非零 diff 立即中止排查
  （基线漂移信号，PRD 非目标 5），不得借本项重录。
- **s6/s7 期望不变量**（SPEC §5.4 表，公共六键同 s0 但 `bottomClosed:false`）：
  - s6-log-panel：`chips=["all*","sys","info","warn","ok"]`、`filter="all"`、
    `lines=["+sys","+info","+warn","+ok","+info"]`；
  - s7-log-filter-warn：`chips=["all","sys","info","warn*","ok"]`、`filter="warn"`、
    `lines=["-sys","-info","+warn","-ok","-info"]`。
- **AC8**：推送后 ui-constitution（windows-latest）8 场景绿为权威；本机绿 ≠ 通过。

## 5. 触 UI 与授权链声明

- 触 UI = **是（PRD 结论一致）· 修宪轮**：本迭代改变宪法第 1 条三层（bp-head 新增
  chips 结构/视觉/交互），授权链=ADR-0010（`docs/adr/0010-log-panel-level-filter.md`，
  含像素规格全文与回滚）+ issue#1 用户 OWNER 本人批复（2026-10-23T15:50:05Z
  「批准」，PLAN 会话 gh 亲核在案，PRD §选题过程存证）——宪法第 3 条三要件齐备，
  BUILD 属批准范围内的实现步，非自主 UI 变更。
- golden 变更性质=**新增场景**（s6/s7 经 golden-created 通道），非重录既有基线；
  未运行也无需 `npm run gate:update`（SPEC §8；应急兜底条款仅在门禁失败且归因
  自身时由脚本单次使用）。
- 回滚路径（ADR §6/SPEC §9）：SCENARIOS 回退 2 条目（含基建块与 after 分发行）→
  删 s6/s7 4 基线文件 → `git revert` 产品提交 → build+gate 6 场景复绿。
- STATE.md 已按派发指令更新：`phase: SPEC → BUILD`，`updated: 2026-10-24 03:50`，
  last_result 换写 BUILD 结论（含本 JOURNAL 证据指针）。

## 6. 修复轮 1（BUG-0026 · 2026-10-24 04:14）

**触发**：VERIFY REPORT FAIL（`REPORT.md` §四 BUG-0026 · Major · s6/s7 新 golden
场景间歇像素抖动——本机 gate 4 跑 1 红：s7 `diffPx=829` 无不变量差异、复跑即绿）。

**机制（修复轮本会话亲读复核，锚点与 REPORT 取证一致）**：`#rail-bp` click 处理器
（`app.js:1790`）**同步**调用 `renderMinimap`；其视口矩形尺寸取绘制当刻
`viewport.getBoundingClientRect()`（`app.js:1095-1096`）并以
`ctx.strokeStyle='rgba(139,152,255,.7)'; ctx.strokeRect(...)`（`app.js:1103-1104`）
**一次性绘制固化**到 canvas。彼时面板 `max-height` 过渡（`.22s`，`app.css:317-318`）
尚在途中，viewport 高度随过渡变化 → 捕获相位差几像素即被固化；稳定双帧等待只能
等 DOM/截图静止，**无法回改已绘制 canvas**——SPEC §5.2「过渡被稳定双帧消化」的
确定性论证对一次性 canvas 绘制不成立（论证盲区，本节修订见下）。REPORT 隔离探针
10 次复刻 after-hook 时序得 canvas 哈希 2 种（9:1），机制坐实；829 差异像素全部
落于 minimap 区域且色值与视口矩形描边抗锯齿反解吻合。

**修复（产品代码零改动，按 REPORT §四 修复建议）**：

1. `tools/pixel-gate/gate.mjs` `logPanelAfter`：`#rail-bp` 点击**前置**
   `document.getElementById('bottompanel').style.transition = 'none'`（内联 style
   覆盖 `app.css` 过渡声明）→ 高度立即跳变，click 同步执行的 renderMinimap 必
   捕获终态 viewport 高度，canvas 确定性成立；同 hunk 内如实改写基建注释——原
   「面板 max-height 过渡 .22s 均被既有稳定双帧等待消化」一句替换为
   transition:none 禁用 + 盲区说明（BUG-0026 修复轮修订）。s6/s7 共用
   `logPanelAfter`，同机制同修。
2. **基线重置**：删除 s6/s7 共 4 基线文件（`tests/golden/ui/s6-log-panel.png/
   .invariants.json`、`s7-log-filter-warn.png/.invariants.json`——均为本迭代脚本
   首跑 golden-created 落盘的未跟踪文件，录制于抖动相位下）→ 脚本下轮 `npm run
   gate` 首跑经 golden-created 通道按确定性路径**重录**，次轮 8/8 复绿（同迭代
   修宪轮通道在案，无需 `gate:update`）。备选方案（改 app.js toggle 为
   transitionend 后重绘）触既有行、超白名单，不采（REPORT §四 同判）。

**修复自检（BUILD 内执行；门禁与提交仍由脚本统一执行，未自行运行）**：

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| JS 语法 | `node --check tools/pixel-gate/gate.mjs` | 通过（`GATE_SYNTAX_OK`，退出码 0） |
| 白名单口径保持 | `git diff -- tools/pixel-gate/gate.mjs \| grep -Ec '^-[^-]\|^-$'` | **0**（修复仅改动本迭代新增行，对 HEAD 仍纯插入零删行；Skeleton/app.css/app.js 未触碰，产品代码零改动达成） |
| 基线退场核对 | `ls tests/golden/ui/` | 恰 s0~s5 十二文件（s6/s7 4 文件已删，AC1 面零变化） |

**脚本门禁预期（修复后）**：`npm run build` → 首跑 `npm run gate`：s0~s5 六场景
`pass · diffPx=0` + s6/s7 `golden-created`（本次于 transition:none 确定性路径）→
次跑起 8/8 `pass`。VERIFY 复验口径按 REPORT §六：**连续 ≥5 轮全绿**（含一次反演）
+ AC1 基线核对。

**未运行**（脚本统一门禁序列）：`npm run build` / `npm run gate`（重录+多轮复验）/
`npm test` / git 提交。
