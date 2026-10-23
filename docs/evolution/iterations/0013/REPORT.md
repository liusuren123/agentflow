# REPORT · 迭代 0013 · BK-9001 底部日志面板按级别过滤（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 04:10 首轮 / 04:22 修复轮复验 · 本机 win32 10.0.26300 + Playwright Chromium
> 输入：`PRD.md` AC1~AC8 + `SPEC.md` §7 验收口径 + 交互回归清单（test-manager 职责 2）。
> 派发指令豁免：build/gate/test 全套已由脚本运行且通过，VERIFY 不重复全套；针对性 E2E 与
> 反演演练（SPEC §7.3/§7.4，PRD 明列为 VERIFY 职责）由本报告亲测。

## 结论

> **终局（修复轮复验后更新，2026-10-24 04:22）：PASS——BUG-0026 已修复并经本机 6 轮
> gate 全绿 + 反演重做 + canvas 确定性探针 10/10 单一哈希三重确认，证据见 §七。
> §一~§六为首轮 VERIFY 记录（FAIL·BUG-0026），按审计链原样保留。**

**首轮判定：FAIL（1 个 Major BUG：BUG-0026）——建议进修复轮（repair_round ≤2）。**

- **产品功能面全部实测达标**：chips DOM/布局/视觉（AC1/AC6/AC7 机器核对 + E2E 断言）、
  过滤交互全语义（AC3 二十六项断言零失败，含真实模拟 run 四级行与「未来行同规则」）、
  保护力反演（AC4 破坏 A 实测红→字节级还原→复绿）、契约/后端零变化（AC5 diff 面）。
- **判 FAIL 的唯一原因**：新 golden 场景 s6/s7 自身存在**间歇性像素抖动**（BUG-0026，
  本机 gate 亲跑 4 轮 1 红：s7 diffPx=829 无不变量差异、复跑即绿）——AC2「次轮 8 场景
  全 pass 0 diff」的确定性要求被实测打破；不修则 CI `ui-constitution`（required check）
  有间歇红风险（AC8 无法自我了断）。缺陷已定位到 `tools/pixel-gate/gate.mjs` 新增的
  s6/s7 场景基建（本迭代白名单第 4 处），**产品代码（Skeleton/app.css/app.js）无需改动**，
  修复面极小（详见 BUG 清单修复建议）。

## 一、验收标准逐条（PRD AC1~AC8）

| AC | 判定 | 证据（本会话亲测，命令与输出摘录） |
| --- | --- | --- |
| AC1 既有基线零漂移 | **PASS** | `git status --porcelain`：`tests/golden/ui/` 下仅 `?? s6/s7` 共 4 新文件，s0~s5 十二文件零 `M`；`ls tests/golden/ui/` 共 16 文件（12 旧 + 4 新） |
| AC2 八场景自一致性 | **FAIL（BUG-0026）** | 脚本侧（按派发指令记）：首轮 golden-created 落盘（s6/s7 文件 mtime 2026-10-24 03:50:50/52，即脚本首跑时刻；`tests/golden/diff/` 空=次轮全绿自动清理，gate.mjs:269-271）+ 次轮 8/8 绿。我亲跑 4 轮 `npm run gate`：**3 绿 1 红**（第 1 轮 s7 `FAIL · diffPx=829`，无 DOM 不变量差异；复跑及再复跑 2 轮均 8/8 `pass · diffPx=0`）。红的机制坐实见 BUG-0026——非产品漂移，但破坏场景确定性 |
| AC3 过滤交互 E2E | **PASS** | 临时 Playwright 脚本（静态托管 `apps/web/dist`，镜像 gate 服务形态）26 项断言全过，详见 §二；四级行来自**真实模拟 run**（选中 node4 → `#ntb-bypass` 旁路 → `#float-run`，产出 sys×3/info×5/warn×1/ok×6） |
| AC4 保护力反演 | **PASS** | SPEC §7.4 破坏 A：注释 `app.js` `else $('#log-body').dataset.lvl = lvl;` → `npm run build`（661ms ✓）→ `npm run gate`：s0~s6 全 `pass · diffPx=0`、**s7 `FAIL · diffPx=3242 · DOM不变量变化`、exit 1** → Edit 精确还原（`git hash-object` 前后同为 `c55b2dd0a15aae9e710581dc5faa45258ddc415e`，字节级）→ rebuild（667ms ✓）→ gate 8/8 复绿。新基线非恒真得证；s0~s5 在破坏态下依旧全绿，反证既有保护面未受新代码影响 |
| AC5 契约与后端零变化 | **PASS（diff 面）** | `git status --porcelain` 全量：改动仅 4 产品文件 + `STATE.md`（过程文件，按 0011/0012 惯例不入产品提交，`git show --stat e3bf60b/592be6e` 在案）+ 3 处未跟踪产物（ADR/迭代目录/s6s7 基线）；`packages/shared/**`、`apps/server/**`、`.github/**`、`server-sync.js` 零触及。`npm test` 未复跑（按派发指令；脚本已绿，且 shared 零改动无从漂移） |
| AC6 白名单与机械移植 | **PASS** | `git diff -U0` 逐文件：Skeleton `@@ -121,0 +122,7` / app.css `@@ -532,0 +533,11` / app.js `@@ -1792,0 +1793,7` / gate.mjs 3 hunk 全 `+`（+47）——**全部纯插入零删改**；gate.mjs 既有 s0~s5 SCENARIOS 条目与公共不变量采集器原文核对未动（after 分发行插在 `normalize` 之后，s0~s5 无 `after` 字段=无操作）；NFR-3 预算达标（app.css 11≤15 / app.js 7≤30 / gate.mjs 47≤60 / 零新源文件）。BUILD 偏差 `steps:[]` 必要性核实成立（`gate.mjs:190` `for..of sc.steps` 无 `\|\|[]` 守卫，既有条目均显式携带） |
| AC7 ADR 与授权链 | **PASS** | `docs/adr/0010-log-panel-level-filter.md`：动机（§1）/影响面（§2 白名单六处+三层触点+零削弱论证）/像素规格全文（§3 与实装 diff 逐字一致）/证据方式（§5，含反演承诺）/回滚（§6）；批复标注在档（头部状态行「已获用户批复 issue #1 · 2026-10-23T15:50:05Z 用户本人」+ §关联 issue 链接） |
| AC8 CI 权威盯守 | **未到时点** | 未推送（FAIL 不推）；BUG-0026 即 CI 间歇红的风险源，修复后再推送盯守 |

## 二、AC3 E2E 明细（SPEC §7.3 七点位 + REQ-9001-02 全语义）

前置：临时脚本 `verify-0013-e2e*.tmp.mjs`（已删除，不落源码），`http://127.0.0.1` 静态托管
dist，Playwright Chromium 1600×900，与 gate 同口径 boot（clear localStorage → reload →
fonts.ready → 等待）。

| # | 断言 | 结果 |
| --- | --- | --- |
| A1-A4 | boot：面板展开 / chips=5 词表与文本 `[全部,sys,info,warn,ok]` 且「全部」独占激活 / 无 `data-lvl` 属性 / 欢迎行 1 条 | PASS |
| A5-A7 | 选中 node4 → `#ntb-bypass` 可用 → `#float-run` 真实模拟 run 完成，四级行各 ≥1（实测 sys3/info5/warn1/ok6） | PASS |
| A8×4 | 依次点 warn/sys/ok/info：`data-lvl` 正确写入、对应 chip 独占 `on`、**仅该级行可见**（getComputedStyle display 逐行断言，作用于真实 addLog 行） | PASS |
| A9 | 点「全部」：属性删除（getAttribute=null）、全行恢复、all chip 激活 | PASS |
| A10 | 清空守恒：行清 0、`data-lvl=warn` 与 warn 激活态保留（`#log-clear` 的 `innerHTML=''` 不触属性） | PASS |
| A11/A12 | `#bp-close` 收起 / `#rail-bp` 展开：面板态翻转、过滤态全程保留 | PASS |
| C3 | reload 重置：面板回展开、属性清除、chips 重置 `["all*","sys","info","warn","ok"]` | PASS |
| C4 | **未来行同规则**：warn 过滤激活中二次真实 run（旁路仍在），新增 14 行恰 1 条 warn 可见、13 条非 warn 全隐藏（addLog 零改动由 CSS 属性选择器即时生效的实测证明） | PASS（数据达标；断言式中我的辅助探针 `.bypassed` 类名假设错误，与产品判据无关） |
| 布局 | `#bp-head` 子序 `[ldot, 执行日志, log-filter, log-clear, bp-close]`；chip 高 22px（SPEC §4）；ibtn 组贴内容盒右缘（close.r=1322=head 内容盒右缘；边框盒 1336 差 14px 系既有 `padding:7px 14px`，app.css:320 未动） | PASS |

## 三、交互回归抽查（test-manager 职责 2 清单）

已实测 **PASS**：节点拖拽（位移 718,561→746,580）· 撤销/重做 + 快捷键（Ctrl+Z 复位 /
Ctrl+Y 复移，app.js:2282-2283 路径）· 画布平移（空拖 transform 变化）· 框选（Ctrl+拖拽
selected=5；app.js:1445 语义）· 连线（按端口类型标签选兼容对 1:任意→2:任意，edge 7→8 后
撤销复原）· 滚轮缩放（56%→62%）· **滚轮门控数字步进**（选中节点数字框上滚轮 0.7→0.8 且
zoom 不变 62%→62%）· 节点库侧栏（open + 标题「节点库」+ 16 项）· 多工作流标签（新建
1→2 + 切回 active=0）。

未抽查（如实记录）：审批弹窗、导入导出、收藏——本迭代 diff 纯插入未触其代码路径
（AC6 机器证据），静态形态由 s0~s5 像素基线守护；本轮未逐一实测。

## 四、BUG 清单

### BUG-0026 · Major · s6/s7 新 golden 场景间歇像素抖动（minimap 视口矩形过渡相位固化）

- **现象**：本机 `npm run gate` 4 跑 1 红——`s7-log-filter-warn FAIL · diffPx=829`（无
  DOM 不变量差异），s0~s6 全绿；复跑即绿（3/3 绿）。基线录制于脚本首跑（03:50:52），
  脚本次轮曾对它全绿——红为间歇性。
- **取证**：829 个差异像素全部位于 x1130-1305 / y508-597（minimap 区域，`#minimap-wrap`
  `right:14px;bottom:58px`，app.css:312）；差异色 `rgb(77,83,135)` 与
  `rgba(139,152,255,.48)` 半覆盖抗锯齿像素反解精确吻合（r=139a+20(1-a) 解 a=.4787，
  g/b 同解）——即 renderMinimap 视口矩形描边（`app.js:1100-1104`，
  `strokeStyle='rgba(139,152,255,.7)'`）。矩形尺寸取自绘制当刻
  `viewport.getBoundingClientRect()`（`app.js:1099-1101`）。
- **机制**：`#rail-bp` 点击（`app.js:1790`）同步调用 renderMinimap；彼时面板 max-height
  过渡（.22s）尚在途中，viewport 高度随过渡变化，evaluate 调度抖动使捕获相位差几像素，
  并被 canvas **一次性绘制固化**；稳定双帧等待（`gate.mjs:197-203`）只能等动画停止，
  无法回改已绘制 canvas——SPEC §5.2 确定性论证的盲区（其「过渡被稳定双帧消化」的前提
  对一次性 canvas 绘制不成立）。
- **机制坐实（隔离探针）**：10 次复刻 after-hook 时序（normalize 收起 → rail-bp 点击 →
  注入 → chip 点击 → 等 600ms → canvas 像素哈希）→ **2 种哈希**：`f1d72d48`×9 /
  `e7dc4fb0`×1（均 196×128）。
- **影响**：s6 与 s7 同机制（都经 rail-bp 展开）；CI `ui-constitution`（required）
  间歇红风险（本机观察 ~1/4-1/10），将随机阻塞合并；AC2 确定性要求被打破。
- **修复建议（最小面，供修复轮）**：`gate.mjs` `logPanelAfter` 在点击 `#rail-bp` 之前
  `page.evaluate` 置 `document.getElementById('bottompanel').style.transition='none'`
  （高度立即跳变 → renderMinimap 必捕获终态，确定性成立）；随后删除 s6/s7 共 4 基线
  文件 → gate 首跑经 golden-created 通道重录 → 次轮 8/8 复绿（同迭代修宪轮通道在案，
  无需 `gate:update`）。**s6/s7 必须同修**。备选（不推荐）：改 app.js toggle 为
  transitionend 后重绘——触既有行，超出白名单。

### 观察项（非 BUG，如实记录）

1. **reload 后无欢迎日志行**：`app.js:2407` `fresh=!loadLocal()`，reload 时 localStorage
   已有保存态 → `:2423` `addLog('欢迎使用…')` 不执行——既有 boot 语义，本迭代零触碰
   （diff 纯插入）；AC3 的 reload 判定项（全部激活/属性清除/面板展开）不受影响。
2. **E2E 初测 3 处误报的口径修正**（均为测试口径，非产品缺陷，修正后全绿）：框选需
   Ctrl/选择模式（app.js:1445，裸拖=平移）；连线需类型兼容且非精确重复的端口对
   （app.js:1292-1297）；ibtn 右缘对齐目标是内容盒（padding 既有）。

## 五、方法与环境披露

- 本机 win32（CI 权威口径见宪法第 2 条，本机结果仅参考；BUG-0026 的机制与修盘建议
  在 CI 同样成立——Chromium 过渡调度抖动非本机特有）。
- 亲测命令：`git status/diff/show/hash-object`、`node`（不变量比对/像素取证/哈希探针）、
  `npm run build`×2、`npm run gate`×5（1 破坏态 + 4 还原态）、临时 Playwright 脚本×5。
- 未亲测（如实）：`npm test`（派发指令豁免，脚本已绿）；CI 推送盯守（未到时点）。
- 临时脚本与裁剪图均已删除；`tests/golden/diff/` 经最后全绿轮自动清空（0 文件）；
  `app.js` 字节级还原（blob hash 前后一致）；工作区回到验证前状态（`git status` 仅
  迭代产品改动 + 过程文件）。

## 六、处置建议（首轮）

FAIL → 修复轮（repair_round 1）：单点修 BUG-0026（gate.mjs s6/s7 基建确定性 + s6/s7
4 基线 golden-created 重录），产品代码零改动；修复后 VERIFY 复验口径 = gate 连续 ≥5 轮
全绿（含一次反演）+ AC1 基线核对。若修复轮选择回滚整个迭代，按 ADR-0010 §6 步骤执行。

## 七、修复轮复验（VERIFY round 2 · 2026-10-24 04:17-04:22 · 终局 PASS）

**修复轮事实识别**（本轮到达时先核对再复验）：

- `tools/pixel-gate/gate.mjs`（mtime 04:14:17，diff 由 +47 增至 +57）：`logPanelAfter`
  在点击 `#rail-bp` 的同一 evaluate 内**先置**
  `document.getElementById('bottompanel').style.transition='none'`（内联样式覆盖
  app.css 过渡声明），点击后高度立即跳变 → renderMinimap 必捕获终态。注释明标
  「BUG-0026 修复轮修订」，并如实记入原 §5.2 论证的盲区。与 §四修复建议方案 1 一致。
- s6/s7 基线经 golden-created 重录（mtime 04:15:58 / 04:16:00，首轮基线为 03:50:50/52）。
- **产品三文件字节未动**：app.js blob hash 仍 `c55b2dd0a15aae9e710581dc5faa45258ddc415e`；
  Skeleton/app.css diff 行数仍 +7/+11（git diff --stat 总量 77→87 全部来自 gate.mjs+10）。
- STATE.md 未被修复轮更新（仍为本报告首轮 04:10 记录）——本轮复验一并补正。

**复验执行**（全部本 ask 亲测；§一~§五中对产品文件的结论因字节未变而对当前树继续有效，
E2E/回归抽查本轮未重跑、如实沿用首轮亲测记录）：

| 复验项 | 命令/方法 | 结果 |
| --- | --- | --- |
| 重录基线内容核对 | node 比对 `tests/golden/ui/s6·s7.invariants.json` vs SPEC §5.4 | s6 `chips=["all*","sys","info","warn","ok"] filter=all lines=["+sys","+info","+warn","+ok","+info"]`、s7 `chips=[...,"warn*"] filter=warn lines=["-sys","-info","+warn","-ok","-info"]`、双场景 `bottomClosed=false`，公共五键（view/zoom/nodes/cssVars/counts）与 s0 全 EQUAL——逐字符合 SPEC §5.4 |
| AC1 维持 | `git status --porcelain tests/golden/ui/` | 仍仅 `??` s6/s7 4 文件，s0~s5 十二文件零触碰 |
| gate 连续 5 轮（04:17:46-04:19:19） | `npm run gate` ×5 | **5/5 轮 8/8 场景 `pass · diffPx=0`，exit 0**（修复前同口径 4 跑 1 红） |
| 反演重做（AC4） | 注释 app.js `dataset.lvl` 写入行 → `npm run build`（681ms）→ `npm run gate` | **s7 `FAIL · diffPx=3242 · DOM不变量变化`**（与首轮反演同值——修复未削弱保护力、基线仍非恒真）；s6 绿（无 chip 点击，符合设计）→ Edit 还原（hash 复核 `c55b2dd0` 字节级）→ rebuild（643ms）→ gate 8/8 复绿（累计第 6 轮全绿） |
| canvas 确定性探针 | 复刻修复版时序（禁过渡→rail-bp→注入→chip→600ms→canvas 像素哈希）×10 | **单一哈希 `f1d72d48` ×10**（修复前同探针 2 种哈希 9:1 分裂）——机制层面闭环 |
| 清理核对 | `ls tests/golden/diff/`、临时脚本删除 | diff 目录 0 残留（全绿自动清理）；探针脚本已删；工作区回到修复后产品态 |

**AC2 终局判定：PASS**——首轮口径的破坏已消除：修复后脚本重录（golden-created）+ 本轮
6 轮 gate 全绿（5 连跑 + 反演还原后 1 轮）+ 探针确定性三重证据。AC8 仍未到时点（未推送），
沿 0012 先例不判过不判挂：推送后由脚本盯 CI `ui-constitution`（windows-latest）8 场景，
若 CI 仅 s6/s7 红按 SPEC §7.6 分级处置。

**终局结论：PASS（零未决 BUG）**。BUG-0026 已修复（修复面=gate.mjs 场景基建 10 行 +
s6/s7 基线重录，产品代码零改动，未扩大白名单——gate.mjs 本就在 REQ-9001-06 白名单第 4 处，
基线重录走 golden-created 通道）。可进 CLOSE。
