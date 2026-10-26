# 迭代 0052 · REPORT — BK-0058 gate.mjs 头注场景数同步：6→16（VERIFY）

> VERIFY 轮产物（WORKFLOW.md §4 VERIFY 契约）。test-manager 产出。
> 验收环境：隔离工作树 `.zcode/worktree/feat/0052-iter/`（分支 `feat/0052-iter`），
> Windows / Node v24.21.0 / 时间 2026-10-26 15:08–15:16。全部命令在工作树内执行。
>
> ## 结论：**PASS（5/5 验收标准全过，交互回归抽查 15/15，缺陷清单空）**

## 0. 验收对象与口径

- PRD：`docs/evolution/iterations/0052/PRD.md`（S 项 skipSpec，验收口径内嵌 §5
  AC1~AC5）；BUILD 申报：`docs/evolution/iterations/0052/JOURNAL.md`。
- 改动：`tools/pixel-gate/gate.mjs:4-8` 头注注释区（净 +2 行），POLICY 需批准区
  授权链 = issue #13 用户批复（PRD §0）。
- 派发指令明示：build/gate/test 已由脚本在工作树内运行且通过，VERIFY 不重复跑
  全套；本人按此口径执行——四件套归属如实记账（§4/§5），针对性 E2E（交互回归
  抽查）由本人实跑（§6）。

## 1. AC1 正路径（门禁行为零变化）— **PASS**

| 项 | 结果 | 证据 |
| --- | --- | --- |
| `node --check tools/pixel-gate/gate.mjs` | **本人实跑，退出码 0（SYNTAX-OK）** | 命令与输出见附录 A.1 |
| `npm run gate` 16 场景全 pass diffPx=0 | **脚本运行通过（派发指令明示），本人未复跑** | 旁证三重（本人实查）：① `tests/golden/diff/` 目录 **0 文件**——gate.mjs:456-460 仅在 numDiff>0 或不变量不等时落 diff 工件，空目录=最近一次运行全 pass；② `apps/web/dist/index.html`（单文件 vite 内联构建）mtime **2026-10-26 15:06:06**，与 STATE.md updated 15:06 及 BUILD 窗口（15:00–15:06）吻合=构建产物新鲜；③ 本人交互抽查基线六不变量与 golden s0 **逐字节全等**（§6 T1–T5），独立证明当前 dist 渲染与 golden 一致 |
| s3-library 本机采样抖动预案 | **未触发** | diff 目录空=本轮无任何场景红，不存在「仅 s3 红」形态；全程未运行 `npm run gate:update`（git 对 tests/ 零 diff，AC5 机器证明） |

## 2. AC2 改动面机器证明 — **PASS**

命令：`git diff HEAD -- tools/`、`git diff HEAD --numstat -- tools/`（附录 A.2）。

- **恰 1 文件**：`tools/pixel-gate/gate.mjs`（numstat `5  3`）；
- **净 ±≤4 行**：5 insertions − 3 deletions = **净 +2 ≤ 4**（PRD §3「净增删」口径，
  JOURNAL §3 同口径）；
- **全部改动行位于 `/* … */` 头注区且均含 ` * ` 注释前缀**：唯一 hunk
  `@@ -1,9 +1,11 @@`，8 个变更行逐行核过（−3/+5 全部以 ` * ` 开头，见附录 A.2 diff 全文）；
- **含字面「16 个 golden 场景」**：+行 `*  · 16 个 golden 场景，双重复核：像素 0 容差 diff + DOM 不变量`；
- **diff 中无任何可执行语句行**：SCENARIOS 数组、runScenario、import、:9-11 稳定性
  等待与 npm run gate / gate:update 使用说明段均为 context 行零触碰。

## 3. AC3 枚举一致性（名实相符）— **PASS**

逐组机器核对（命令与输出见附录 A.3）：

| 核对项 | 头注（:4-8）实文 | SCENARIOS 数组/golden 实况 | 判定 |
| --- | --- | --- | --- |
| 场景总数 | 「16 个 golden 场景」 | 数组 `id: 's…'` 计数 **16** = `ls tests/golden/ui/*.invariants.json \| wc -l` = **16**（s0-initial…s15-caps-panel 连续无缺号） | ✓ 16=16=16 |
| 在线态清单 | 「s4/s5/s9/s15 在线态——Playwright 路由拦截 fixture 供数」 | `routes:` 字段恰四行：s4-workflows-online（WF_ROUTES）/ s5-history-online（RUN_ROUTES）/ s9-goal-panel-online（SESSION_ROUTES）/ s15-caps-panel（CAP_ROUTES） | ✓ 逐一对应 |
| UTC 指涉不扩大 | 「其中 s4/s5（ADR-0009，issue#7 批准）时区钉死 UTC」 | `timezoneId: 'UTC'` 全文件仅 :355（s4）/:357（s5）两处，与 runScenario :384 代码注释「仅 s4/s5 传 'UTC'」一致 | ✓ ⊆{s4,s5} |
| 溯源简注 | 「s9/s15 溯源迭代 0032/0039」 | 块注释 :198「s9 …（ADR-0013 §6 · 迭代 0032…）」、:290「s15 …（ADR-0018 · 迭代 0039…）」 | ✓ 属实 |
| 离线静态态 | 「s0~s3 离线静态态」逐字保留 | s0~s3 仅 steps 字段、无 routes/seed | ✓ |
| 其余场景归类 | 「其余 s6~s8、s10~s14 为离线扩展场景（日志面板 after 钩子 / seed 预置工作流 / 步进交互）」 | s6/s7=after 钩子（:359-360）；s8/s10/s11/s12/s14=seed（:361-376）；s13 仅 steps+ready+inv（:372-373，无 seed/无 routes）→「步进交互」形覆盖 s13，未虚构归类 | ✓ 名实相符 |
| 无虚构场景号 | 头注号码全集 = s0~s3 ∪ {s4,s5,s9,s15} ∪ s6~s8 ∪ s10~s14 = **s0~s15 恰满** | 数组 id 排序 = s0 s1 s2 … s15（16 个，无缺无余） | ✓ |

REQ 字面复核：REQ-0058-01 :4 行内「，双重复核：像素 0 容差 diff + DOM 不变量」
逐字保留（附录 A.2 diff −/+ 行对照）；REQ-0058-02 六项约束（在线态四场景/ADR
括注仅指涉 s4/s5/s9-s15 简注/s0~s3 保留/其余并短语/UTC 不扩大/:6 微调与代码注释
实况一致）逐项满足。

## 4. AC4 回归面 — **PASS（四件套按 PRD 口径归属记账）**

- `npm run build` / `npm run gate` / `npm test`：**脚本在工作树内运行且通过**
  （派发指令明示；本人未复跑全套——旁证见 §1：dist 新鲜 mtime、diff 目录空、
  六不变量 golden 全等）。`npm test` 30/30 以脚本运行结果为准记录，本人未复跑。
- `npm run smoke:server` 133/0：PRD §5 验收命令口径明文「主干复测四件套，归合并
  复测执行」→ 本项归 MERGE 阶段主干复测实跑裁决，VERIFY 不重复（本人未跑，非遗漏）。
- 零因果论证（本人口径）：改动全为注释行（AC2 diff 逐行证明）+ `node --check`
  过（§1）+ 禁区零 diff（§5）→ 对 build/test/smoke 的输入零因果；gate 面由
  脚本运行 + §1 三重旁证覆盖。

## 5. AC5 禁区白名单终判 — **PASS**

命令：`git diff HEAD -- apps packages tests .github 'package*.json' | wc -l` →
**0**；`git diff HEAD -- docs/adr/ | wc -l` → **0**；`git diff HEAD --name-only
-- tools/` → 恰 `tools/pixel-gate/gate.mjs` 1 文件（附录 A.4）。**含
tests/golden——golden 零接触为批复射程的机器证明**；全程未运行
`npm run gate:update`。

## 6. 交互回归抽查（本人实跑，针对性 E2E）— **15/15 PASS**

方法：临时 Playwright 脚本（服务 `apps/web/dist` 于 :4273、1600×900 视口、离线
模式与 gate 同形态：localStorage.clear → reload → fonts.ready；六不变量采集器
逐字取自 gate.mjs:411-429；**脚本跑完即删，不入库**）。首轮 2 处测试设计误差
（滚轮取点落在 minimap 覆盖区 app.css:316；console 分类未豁免离线探针 404）修正
后终跑，输出全绿、退出码 0（附录 A.5）：

| # | 抽查项 | 判定锚 | 结果 |
| --- | --- | --- | --- |
| T1–T5 | 初始基线六不变量（view/zoom/nodes/counts/cssVars） | 与 golden `s0-initial.invariants.json` 逐字节比对 | PASS（view=`translate(16.7143px, 159.879px) scale(0.557143)`、zoom=56%、counts=`{nodes:8,edges:7,widgets:15,ports:15,tabs:1}` 全等） |
| T6–T7 | 节点库开（rail nodes） | `#sidebar.open` + 节点矩形清单 == golden s3（+311px 平移） | PASS |
| T8–T9 | 节点库关（再点同 rail） | sidebar 关 + 节点矩形回 == golden s0 | PASS |
| T10 | 节点选中 | `.node[data-id="3"]` 得 `.selected` 类（app.js:780/:1318） | PASS |
| T11–T12 | 滚轮门控（选中节点数字框上滚轮） | `#world` transform 不变 + 数值步进 3→4（app.js:1651-1667 门控路径） | PASS |
| T13–T14 | 空白画布滚轮缩放 | 56%/0.557143 → 50%/0.501429（zoomAt 0.9 因子，app.js:720/:1669） | PASS |
| T15 | 控制台/页面错误 | pageerror=0、console error=0（另 4 个预期离线探针 404：`/api/health`、`/api/v1/capabilities`——离线模式 ENGINE.probe 行为，gate 极简静态服同形态 404，非缺陷） | PASS |

首轮差异记录（测试侧设计误差，非产品缺陷，已修正后复跑全绿）：① 滚轮取点
(1500,800) 落在 `#minimap-wrap`（app.css:316 `right:14px;bottom:58px`）覆盖区，
非空白画布；② console 404 未按离线探针豁免分类。

## 7. 缺陷清单

**空（0 BUG）。** 无 OBS 观察项：本轮本机未出现 s3 采样抖动形态（diff 目录空），
无环境侧异常需留档。

## 8. 结论

- AC1~AC5 全过（§1–§5），交互回归抽查 15/15（§6），零缺陷（§7）。
- 授权链合规：改动全量位于 issue #13 批复射程（头注注释级场景数同步）内；非修宪
  轮全程未触 golden、未运行 gate:update（AC5 机器证明）。
- 建议进入 MERGE：特性分支双提交 → 合并仲裁 → 主干端到端复测（四件套 +
  smoke:server 133/0 于主干实跑，按 PRD §5 口径）；done 后由脚本回执关单
  issue #13（itemContinues=false）。

## 附录 A · 命令与输出（本人实跑，工作树内）

### A.1 AC1a 语法检查

```
$ node --check tools/pixel-gate/gate.mjs
SYNTAX-OK exit=0          # 无输出即通过；echo $? = 0
```

### A.2 AC2 diff 机器证明

```
$ git diff HEAD --numstat -- tools/
5	3	tools/pixel-gate/gate.mjs
$ git diff HEAD -- tools/          # 唯一 hunk @@ -1,9 +1,11 @@，全文：
- *  · 6 个 golden 场景，双重复核：像素 0 容差 diff + DOM 不变量
- *    s0~s3 离线静态态；s4/s5 在线态（ADR-0009，issue#7 批准）——Playwright
- *    路由拦截 fixture 供数（probe 的 /api/health + /api/v1 列表）+ 时区钉死 UTC
+ *  · 16 个 golden 场景，双重复核：像素 0 容差 diff + DOM 不变量
+ *    s0~s3 离线静态态；s4/s5/s9/s15 在线态——Playwright 路由拦截 fixture 供数
+ *    （probe 的 /api/health + /api/v1 列表），其中 s4/s5（ADR-0009，issue#7 批准）
+ *    时区钉死 UTC、s9/s15 溯源迭代 0032/0039；其余 s6~s8、s10~s14 为离线扩展场景
+ *    （日志面板 after 钩子 / seed 预置工作流 / 步进交互）
```

### A.3 AC3 枚举一致性

```
$ sed -n '/^const SCENARIOS = \[/,/^\];/p' tools/pixel-gate/gate.mjs | grep -c "id: 's"
16
$ ls tests/golden/ui/*.invariants.json | wc -l
16
$ sed -n '/^const SCENARIOS = \[/,/^\];/p' tools/pixel-gate/gate.mjs | grep "routes:"
  { id: 's4-workflows-online', routes: WF_ROUTES, timezoneId: 'UTC',
  { id: 's5-history-online',  routes: RUN_ROUTES, timezoneId: 'UTC',
  { id: 's9-goal-panel-online', routes: SESSION_ROUTES,
  { id: 's15-caps-panel', routes: CAP_ROUTES, ...
$ grep -n "timezoneId: 'UTC'" tools/pixel-gate/gate.mjs
355:  { id: 's4-workflows-online', routes: WF_ROUTES, timezoneId: 'UTC',
357:  { id: 's5-history-online',  routes: RUN_ROUTES, timezoneId: 'UTC',
$ sed -n '198p;290p' tools/pixel-gate/gate.mjs   # 溯源块注释
/* ---------- s9 goal 会话面板在线态场景基建（ADR-0013 §6 · 迭代 0032 / BK-0034） ----------
/* ---------- s15 能力配置面板在线态场景基建（ADR-0018 · 迭代 0039 / BK-0049 修宪轮） ----------
$ sed -n '/^const SCENARIOS = \[/,/^\];/p' tools/pixel-gate/gate.mjs | grep -o "id: 's[0-9]*" | sed "s/id: '//" | sort
s0 s1 s10 s11 s12 s13 s14 s15 s2 s3 s4 s5 s6 s7 s8 s9   # = s0~s15 恰满 16
```

### A.4 AC5 禁区白名单

```
$ git diff HEAD -- apps packages tests .github 'package*.json' | wc -l
0
$ git diff HEAD -- docs/adr/ | wc -l
0
$ git diff HEAD --name-only -- tools/ | wc -l && git diff HEAD --name-only -- tools/
1
tools/pixel-gate/gate.mjs
```

### A.5 交互回归抽查（临时脚本 zz-spotcheck-verify0052.mjs，跑后已删）

```
$ node zz-spotcheck-verify0052.mjs ; echo EXIT=$?
PASS | baseline-view | translate(16.7143px, 159.879px) scale(0.557143) vs …（全等）
PASS | baseline-zoom | 56% vs 56%
PASS | baseline-nodes
PASS | baseline-counts | {"nodes":8,"edges":7,"widgets":15,"ports":15,"tabs":1}
PASS | baseline-cssVars
PASS | library-open-sidebar
PASS | library-open-nodes==golden-s3
PASS | library-close-sidebar
PASS | library-close-nodes==golden-s0
PASS | node-select-class
PASS | wheel-gated-view-unchanged | transform 前后不变
PASS | wheel-gated-num-stepped | 3 → 4
PASS | wheel-canvas-zoom-changed | 56%/0.557143 → 50%/0.501429
PASS | wheel-canvas-zoom-out
PASS | console-page-errors-zero | 0 errors（另 4 个预期离线探针 404: /api/health, /api/v1/capabilities）
SUMMARY: 15 PASS, 0 FAIL, 0 SKIP
EXIT=0
```
