# REPORT · 迭代 0034 · BK-0037 终端只读流节点 termview（VERIFY 轮）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25（工作树 feat/0034-iter 内）。
> 输入：`iterations/0034/PRD.md`（Given/When/Then + AC1-AC8）+ `iterations/0034/SPEC.md`（§6 golden 程序 / §9 验收口径）
> + `iterations/0034/JOURNAL.md`（BUILD 申报 + §5 修复轮申报）。全部命令均在隔离工作树 `.zcode/worktree/feat/0034-iter` 内执行。

## 最终结论（修复轮 1 复验后）：**PASS**

- 首轮 VERIFY = FAIL（BUG-001 Critical + BUG-002 Minor，原始报告全文保留于 §1-§5，审计轨迹完整）。
- BUILD 修复轮 1（JOURNAL §5）处置两 BUG 后，本会话按首轮 REPORT §6 裁定的最小复验集**逐项亲跑复验，全部通过**（见 §7）：
  - gate 11 场景亲跑全绿 diffPx=0（修复未破坏静态零波及）；`npm test` 30/30；
    smoke 副本 109/0（T01-T03 PASS）；
  - **AC4-③⑤ 在线流式 E2E 一手复验通过**：mock OpenAI 兼容端点 250 行分 5 段（段间隔 300ms）+
    seed 工作流 trigger→llm→termview(lines=20) 在线运行——呈现区出现、▌ 中间帧捕获（50ms 密轮询）、
    done 去光标定稿、`lines=20` 裁旧实证（250 行 → 末 20 行 L231~L250）、autoscroll=true 滚到底
    （scrollTop 171 = scrollHeight 331 − clientHeight 160）、autoscroll=false 全程 scrollTop=0；
  - BUG-002 校正亲核：ADR-0015 实施纪要已改为事实表述（「s3-library 实测零波及免重录…gate:update 实际 0 次」）。
- 纯插入判据保持：对迭代基底 `git diff --numstat` = app.js **+56/−0**（BUILD 39 + 修复轮 17）·
  app.css **+7/−0** · gate.mjs **+11/−0**；dist 修复后重建（mtime 21:30 晚于 app.js 21:24）。

---

## 0. 修复轮 1 复验记录（本会话亲跑，2026-10-25）

| 复验项 | 命令/手段 | 结果 |
| --- | --- | --- |
| 修复 diff 亲读 | `git diff apps/web/src/legacy/app.js` | termConsume delta 分支改写为按 `state.edges` 转发至下游 `type==='termview'` 且未旁路节点（发射节点自身为 termview 时并入，覆盖模拟直喂）；done/error 保留 ev.id 自有语义；仅动本轮自插块，零引擎改动 |
| dist 新鲜度 | mtime 对比 + 内容抽查 | dist/index.html 21:30:51 晚于 app.js 21:24:56（脚本已重建）；含 termview 文案 |
| BUG-002 校正 | `git diff docs/adr/0015-...md` | 纪要已按 VERIFY 实测改写（s3 零波及免重录 + 机理 + gate:update 实际 0 次）✓ |
| gate | `npm run gate` | 11 场景全 pass · diffPx=0，「宪法门禁：通过 ✓」 |
| 契约 | `npm test` | tests 30 · pass 30 · fail 0 |
| 冒烟 | `node tests/.verify-tmp/smoke-server.mjs`（豁免 V09 shared-clean 子断言的一次性副本，跑毕即删） | `109 passed / 0 failed`，T01-T03 PASS |
| 纯插入 | `git diff --numstat` 三敏感文件 | app.js 56/0 · app.css 7/0 · gate.mjs 11/0 |
| AC4-③ 在线流式 | 浏览器实跑（mock 端点 250 行×5 段×300ms + `AI_BASE_URL` 注入后端 + seed trigger→llm→termview） | 终态：`.node-term` 存在、`endsCursor:false`（去光标）、`node st-done`、等宽字体 + `white-space:pre-wrap` + `overflow-y:auto`、`.node-out`=「已呈现流 · 6391 字」 |
| AC4-⑤ lines 裁旧 | 同上（termview `params:{lines:20}`） | 250 行输入 → `lineCount:20`，首行 `L231`、末行 `L250`（恰末 20 行） |
| AC4-⑤ autoscroll 开 | 同上（default true） | `scrollTop:171 === scrollHeight:331 − clientHeight:160`（滚到底） |
| AC4-⑤ autoscroll 关 | 第二轮 seed `params:{lines:20,autoscroll:false}` | **delta 中间帧捕获**（▌ 在、20 行、running 中）；终态与全程 `scrollTop:0`（可滚而不滚） |

**复验后 BUG 台账**：BUG-001 已修复（本表 E2E 一手证据）；BUG-002 已校正（diff 亲读）；无新增缺陷。

---

## 1. 首轮 VERIFY 结论（2026-10-25，留档）：**FAIL**（1 Critical + 1 Minor）

- **BUG-001（Critical）**：在线真实运行路径上，termview 节点体的等宽只读流呈现区**永不出现**——上游 `node:delta` 事件 id 归属发射节点（llm），`termConsume` 按 `ev.id` 匹配节点且 `n.type!=='termview'` 即丢弃，而 termview 自身 handler 不发射 delta，`node:done` 分支对不存在的区惰性零操作。PRD REQ-0037-03 的核心验收语义（AC4-③）不成立，termview 在在线路径退化为「与 reply 等价的 sink 摘要节点」。
- **BUG-002（Minor，文档失实）**：`docs/adr/0015-presentation-triplet-nodes.md` 实施纪要声称「s3-library 修宪轮重录恰一次」，实测 s3-library 基线**从未被重录、也无需重录**（新增节点库行渲染在 gate 视口之外，diffPx=0）。gate:update 实际次数 = 0（≤1 合规），但纪要陈述与现实不符，违反「全程可审计」。

不触宪：s10 golden-created + 全场景 diffPx=0 双轮亲跑确认，静态态零波及合规；本 FAIL 为产品需求语义缺陷，非门禁违例。修复轮上限内（repair_round 可 0→1）交 BUILD 修复。

---

## 1. 验收口径逐项裁定（SPEC §9 / PRD AC）

### AC1 gate —— **通过（附预测偏差说明）**

- 本会话**两轮独立亲跑** `npm run gate`（纯比对模式）：
  第一轮 `11 场景全 pass · diffPx=0`、第二轮同（输出逐场景 `✓ s0-initial pass · diffPx=0` … `✓ s10-termview-node pass · diffPx=0`，「宪法门禁：通过 ✓」）。
- **s0/s1/s2/s4~s9 零波及实测成立**；`git status --porcelain tests/golden/ui/` 恰 `?? s10-termview-node.png` + `?? s10-termview-node.invariants.json` 两文件新增，s3-library 基线字节零变更（mtime 仍为工作树 checkout 时刻，`git diff --numstat` 无该文件）。
- **SPEC §6.2「恰 s3 一红 → 恰一次 gate:update」的程序未按预测发生**：s3 实测 diffPx=0。机理见 §3.1——SPEC「s3 必然像素变化」预测失准（未计视口裁剪），实际无需重录。`gate:update` 本轮次数 = 0 ≤ 1，合规；但 ADR 纪要按预测而非事实书写 → BUG-002。
- s10 不变量亲核：`tests/golden/ui/s10-termview-node.invariants.json` counts = `nodes:2, edges:1, widgets:3, ports:2`，与 SPEC §6.1 预期逐字一致；termview 节点矩形 `300x116`（两行 widget 高度）。

### AC2 契约 —— **通过**

- 本会话亲跑 `npm test` → `ℹ tests 30 · ℹ pass 30 · ℹ fail 0`。
- 联动计数抽核（亲读 diff）：`contract.test.mjs` 18 键、`nodes-dirs.test.mjs` D.size===18、`defs-drift.test.mjs` +`termview:{lines:200,autoscroll:true}` 行且自检 38、`param-handler-guard.test.mjs` +`['termview',['lines','autoscroll']]` 且 total===38、`readme-consistency.test.mjs` 18 类型/18 行/19 份、`gen-node-readmes.mjs` MANUAL_NOTES +termview 与两处计数 18——与 SPEC §5 全表逐项一致。

### AC3 冒烟 —— **通过（V09 环境断言按预提交口径豁免，如实申报）**

- 预提交工作树上 `packages/shared` 必然脏（未提交改动恰为本迭代申报内容），V09 的 `git status --porcelain -- packages/shared` 环境子断言必然红（其设计意图为拦截**未申报**的 DEFS 漂移；本迭代 shared 改动 7 文件已逐项核对全部落在 SPEC §7 白名单内）。
- 处置与 BUILD 同口径：生成一次性副本 `tests/.verify-tmp/smoke-server.mjs`（仅将 V09 `C.ok(... && sharedDirty === '',` 中该子条件豁免，RunEventSchema 全量校验逻辑零触碰），跑后即删。亲跑两次：**`==== smoke:server：109 passed / 0 failed ====`**（基线 104 + T 组 3 + 新增 run 的 C01 清理 2，与 BUILD 自测计数一致）。
- **T 组全 PASS**（复跑抓取）：
  - `PASS T01 userinput→prompt→termview：termview node:done.out ===「已呈现流 · 14 字」…output 事件恰 1 条且 text=全文；run:done.outputs 含全文`
  - `PASS T02 trigger→termview 直连（__trigger 对象输入）：node:done.out ===「已呈现流 · 0 字」`
  - `PASS T03 …mock 模型请求数零增量（零出站零进程零新依赖的运行时佐证）`
- 服务端语义（REQ-0037-02）由此全部实证：全文汇入 ctx.outputs / emit('output') / out 摘要 / 空输入如实降级 / 零出站。**提交后全量 smoke（含 V09 原断言）归脚本与合并复测阶段复跑**。

### AC4 手动 E2E 五点位 —— **③ FAIL（BUG-001）；①② 通过；④ 平凡成立；⑤ 环境不可达**

执行方式：本地 mock OpenAI 兼容流式端点（127.0.0.1:8401，250 行分 5 段推送的确定性文本）+ `AI_BASE_URL/AI_API_KEY/AI_MODEL` 注入后端，浏览器实跑。

- **① 通过**：点击 rail「节点库」→ `#sidebar` 312px 展开；亲测 `.lib-cat[data-cat="output"]` 计数徽标 = **3**（2→3），条目序 = `["直接回复","终端只读流","变量赋值"]`（termview 键位在 reply 之后，与 SPEC §2 一致）；行元素 `.lib-node[data-type="termview"]` 名称「终端只读流」、描述「将上游文本流以等宽终端样式只读呈现（终点…」。
- **② 通过**：节点库行拖入画布成功（单击/拖拽两路径均验证），节点体含 `.wdg` 两行——「缓冲行数」（`input[type=number]` spinner ✓ number widget）+「自动滚动」（checkbox ✓ toggle widget）；单入端口 `.port.in` title=「数据流 · 类型：任意」✓；`.node-term` 不存在（惰性挂载 ✓）；`node:delta/done/error` 均未发生时静态态与 s10 golden 一致。
- **③ FAIL**：llm→termview 连线成功（状态栏「节点 5 · 连线 1」）→ 点击运行（在线 SSE 真实流式）→ 运行完成（日志：`▶ 终端只读流 termview #6` → `● 呈现输出 L001 mock-stream-line-1 …` → `✓ 终端只读流 · 已呈现流 · 6391 字` → `● 运行完成 · 5/5 个节点执行`）。**DOM 实测：termview 节点 `.node-term` 不存在**（`termExists:false`），仅 `.node-out`=「已呈现流 · 6391 字」摘要；同页 llm 节点 `llmHasTerm:false`（守卫本身工作正常）。→ BUG-001，详见 §2。
- **④ 平凡成立**：「呈现区无输入面」在呈现区不出现的前提下对在线路径平凡成立；代码审阅确认 `.node-term` 为纯 `div.textContent`（`app.js` termEl/termConsume，无 input/textarea/contenteditable，`user-select:text` 仅可选择）；AC5 grep 对 termview 新增代码 `contenteditable/<input/stdin/textarea` 零命中。「点击零新增网络请求」同理（无可交互面可发起）。
- **⑤ 环境不可达（如实标注）**：`lines` 裁旧（>200 行首行消失）与 `autoscroll` 开关需要「到达 termview 呈现区的流式 delta」——在线路径被 BUG-001 阻断；模拟路径的 RUN_META 固定 3 行文案不触发裁旧，且本机浏览器环境无法将模拟动画推进到 termview 节点（见 §4）。`slice(-N)` 裁旧与 `autoscroll!==false` 才滚动的逻辑以代码审阅佐证（`app.js` termConsume delta 分支），无黑盒执行证据。**修复 BUG-001 后须补验 ③⑤。**

### AC5 白名单与禁区 —— **通过**

- 禁区 `git diff --name-only -- package.json package-lock.json apps/server/src/{engine,guard,server,llm,agent,store}.ts packages/shared/src/{events.ts,nodes.schema.ts} apps/web/src/Skeleton.tsx packages/shared/test/synthesis.test.mjs .github/` → **空输出（零触）**。
- 纯插入判据：`git diff --numstat` = app.js **39/0** · app.css **7/0** · gate.mjs **11/0**（删除行全 0），与 JOURNAL 申报一致；handlers.ts 7/0（纯插入 8 行，SPEC §3 逐字一致）；nodes.ts 4/2（头注计数置换 + import + 键，081b32d 先例形态）。
- `grep -rn "node-pty" apps packages tools`（含注释）**恰 1 命中** = `packages/shared/src/nodes/termview/node.ts:6` 护栏注释「严禁 node-pty/PTY——BK-0045 专属面」——SPEC §2 逐字代码块要求 vs AC5 grep 零命中的字面冲突，按 JOURNAL §3.1 申报的意图判据裁定：**非注释代码零命中 + package.json/lock 零 diff + 无子进程/端点 → 无 PTY 依赖/用法成立，通过**。
- 产品文件清单与 SPEC §7 白名单逐项核对一致（20 项中 #17 s10 golden 已落盘、#18 s3 无需重录即合规、其余 18 项 diff 全部亲读）。

### AC6 指针抽样 —— **通过（7 组亲核，行号按当前工作树转写）**

| # | 指针 | 亲核结果 |
| --- | --- | --- |
| 1 | SPEC §3：handlers.ts reply「ctx.outputs!.push + emit('output') + out 摘要」 | ✅ 亲读 :225-232，termview :234-239 与之同构逐字一致 |
| 2 | SPEC §4.1：llm.ts delta=累积全文 acc、60ms 节流、收尾补发 | ✅ 亲读纯流式分支（`acc += d`、`nowT-lastEmit>60`、循环后补发）——BUG-001 根因锚点之一（delta id=发射节点） |
| 3 | PRD REQ-0037-03：util.ts toStr 对 `__trigger` → '' | ✅ 亲读 toStr 实现；T02 实证吻合 |
| 4 | SPEC §6.1：gate 视口（gate.mjs） | ✅ 亲读 `newPage({ viewport: { width: 1600, height: 900 }`（:249 附近）——s3 零波及裁定的关键量 |
| 5 | SPEC §4.2：app.css `.node-out` 既有三规则零改动 | ✅ 亲读 :259-261（display:none / `.st-done` 才显示 / max-height:66px + 绿字 #9fe0c0）——llm 节点绿字块为其既有摘要行为，与 termview 容器严格分离；`.node-term` 新选择器在文件尾纯插入 |
| 6 | PRD 非功能 2：events.ts 15 种事件零新增 | ✅ 亲读 RunEventSchema discriminatedUnion 顶部（:8 起）；`events.ts` 零 diff（禁区核对）；SPEC 锚 :10-11 为 BUILD 前行号、现文件有 3 行内偏移（如实记录，实质成立） |
| 7 | SPEC §4.1：onEvent 钩子插在 onEvent 与 switch 之间 | ✅ 亲读 diff：`const onEvent = ev=>{` 后纯插入 3 行（注释 2 + termConsume 调用 1），既有 case 零触碰 |

### AC7 确定性 —— **通过**

- 基线落盘后本会话**连续两轮** `npm run gate`：11 场景两次独立采集均 diffPx=0（无中间任何 golden 写入：两轮之间仅浏览器 E2E 与只读操作）。

### AC8 并行冲突申报 —— **确认（沿 JOURNAL §3.4）**

与并行路 BK-0036 的产品文件交集共 15 项（`nodes.ts` / `nodes.baseline.json` / contract / nodes-dirs / defs-drift / param-handler-guard / readme-consistency 五测试 / `nodes/README.md` / `gen-node-readmes.mjs` / `handlers.ts` / `app.js` / `app.css` / `gate.mjs` / `smoke-server.mjs` / s3-library golden），交合并仲裁员按 WORKFLOW §6 护栏 9 处置（产品代码冲突不得自行择一）；场景号撞号时 s10-termview-node 由后落地方机械改名顺延。本分支计数口径 = 本工作树合并前事实（17→18）。

---

## 2. BUG 清单

### BUG-001（Critical）· 在线运行路径 termview 呈现区永不出现

- **复现步骤**（本会话实测，Node v24.21.0 / win32 / 在线模式 / mock OpenAI 兼容端点）：
  1. 后端配置流式 provider，画布放置 llm 节点与 termview 节点并连线（out→in-stream）；
  2. 点击运行 → SSE 真实流式执行，日志确认 `✓ 终端只读流 · 已呈现流 · 6391 字`、`运行完成 5/5`；
  3. 检查 termview 节点 DOM：`.node-term` 不存在，仅 `.node-out`「已呈现流 · 6391 字」。
- **预期**（PRD REQ-0037-03）：上游 delta 期间节点体内出现等宽只读滚动区（▌光标、覆盖式更新），node:done 定稿去光标。
- **实际**：全程无呈现区。
- **根因定位**（三因合拢，均亲读）：
  1. `apps/server/src/llm.ts` 纯流式分支 `emit('node:delta', { id: n.id, text: acc })`——**id 是发射节点（llm）自身**；
  2. `apps/web/src/legacy/app.js` `termConsume = ev => { const n = nodeById(ev.id); if(!n || n.type!=='termview') return; ... }`——上游 delta 全部被 type 守卫丢弃；
  3. `apps/server/src/handlers.ts` termview handler 仅 `emit('output')`，无自身 delta 通道；`node:done`（ev.id=termview）到达时 done 分支 `querySelector('.node-term')` 为 null → 零操作。
  即：**termConsume 的 delta/done 两分支在真实运行中存在互斥的可达性缺口**——delta 永不属于 termview，done 时区永不曾建。
- **初步修复建议**（交 code-developer，零引擎改动方向）：前端 `termConsume` 对 delta 事件按**边关系**转发——ev.id 节点的下游节点中存在 type==='termview' 者投递（`state.edges.some(e=>e.fn===ev.id && nodeById(e.tn)?.type==='termview')`），或等价地建立「流式源→呈现 sink」映射；done 分支同步按该映射去光标。另一方向（收敛需求语义：呈现面仅模拟态/或 sink 承载改为转发 delta）属 PRD/SPEC 语义变更，需 PM/用户裁决。
- **波及**：AC4-③ FAIL、AC4-⑤ 不可验证、REQ-0037-03 主语义失效；不触宪法（gate 零波及）；smoke T 组（服务端语义）不受影响。
- **定级依据**：核心需求语义（「上游流式节点运行→节点体内呈现」）在唯一真实路径上不成立。

### BUG-002（Minor）· ADR-0015 实施纪要与 golden 事实不符

- `docs/adr/0015-presentation-triplet-nodes.md` 实施纪要（本迭代写入）称「s3-library 修宪轮重录恰一次」；实测 s3 基线零变更（mtime、numstat、两轮 gate diffPx=0 三重证据），SPEC §6.2 预测的「必然像素变化」未发生（新增行 y=1116~1177 在 gate 视口 1600×900 之外，列表无内部滚动、被页面裁剪——AC4-① DOM 几何实测）。
- 影响：可审计性（陈述失实），不影响产品语义与门禁合规（gate:update 实际 0 次 ≤ 1）。
- 建议：BUILD 修复轮将纪要改为事实表述（如「s3 实测零波及（新增条目位于采集视口外），无需重录」）。

### 观察项（非缺陷，沿用既有申报）

- `synthesis.test.mjs` 测试标题「17 键」文案陈旧（SPEC §5.7 裁定该文件零改动；实测 30/30 绿，基线比对为 18 键逐字节等价）。
- `handlers.ts` 头注「基础 16 种」陈旧（SPEC §3 明示保留，零删改纪律优先）。
- `handlers.ts` 现约 305 行 ≤400（AGENTS 硬性约定 4）✓；`nodes/termview/node.ts` 24 行 ≤60 ✓。

---

## 3. s3-library 零波及机理裁定（回应 PRD/SPEC 预测偏差）

节点库「输出」分组新增的 termview 行实测几何：`y=1116~1177`（视口高 900、gate 视口同 1600×900）；`#lib-list` 无内部滚动（`scrollHeight===clientHeight`），行被页面 overflow 裁剪在视口外；其后条目整体下移但本就在视口外 → **新增行对 s3 截图像素零贡献**。故 s3 diffPx=0 是真实视觉事实，非波及遗漏；节点库渲染链本身工作正常（AC4-① 分组计数 2→3 实证）。SPEC §6.2「必然像素变化」未考虑视口裁剪，属预测失准；相应「恰一次重录」程序未触发即合规。

## 4. 验收环境限制声明（非产品缺陷）

本机浏览器自动化环境存在三重限制，均与被测产品无关，但影响黑盒覆盖面，如实申报：

1. **CSS transition 冻结**：页面 `getAnimations()` 显示 CSSTransition `running` 而 `currentTime:0` 恒定（侧栏 max-width .24s 永不推进）——需 `animation.finish()` 手工推到终态方可继续操作；
2. **浏览器输入管线不可靠**：cua 坐标输入与 Playwright locator click 对部分 tab 时序失效（palette 添加节点最终以页面内合成 MouseEvent 序列完成，app 逻辑本身正常——AC4-② 添加/连线均实证）；
3. **定时器强节流**：页面 `setTimeout(100ms)` 实测 ~599ms；`cancellableSleep` 的 60ms 嵌套步进链命中 intensive throttling（钳至分钟级）导致**模拟执行动画无法在本环境推进到 termview 节点**（卡死 >3 分钟于第 2/3 节点；真实点击手势可短暂解节流但不持续）。

由此：AC4-⑤ 与「模拟路径 termConsume 呈现」无法在本环境黑盒执行，已改以代码审阅 + 服务端 smoke T 组 + 在线路径实证（含 BUG-001 反向证据）覆盖，并在 BUG-001 修复后**须补验**。

## 5. 交互回归抽查（test-manager 职责清单抽样）

| 项 | 结果 | 证据 |
| --- | --- | --- |
| 节点库展开/分组渲染 | ✅ | rail 点击开栏 312px；output 分组 3 行渲染（AC4-①） |
| 节点库→画布添加节点 | ✅ | palette 拖入/单击添加两路径（AC4-②，合成事件驱动；原生拖拽逻辑代码路径同） |
| 画布连线（端口拖线） | ✅ | llm.out→termview.in 拖线成功，状态栏「连线 1→8」两次实证 |
| Del 键删除节点 | ✅ | 双落点误加的节点经 Del 删除（节点计数 6→5） |
| 画布缩放/平移状态栏 | ✅ | 「节点 N · 连线 M · 56%/100%」实时反映（截图） |
| 在线运行 SSE 全链 | ✅ | 5/5 节点执行完成、output 日志行、run 收尾（AC4-③ 场景） |
| number widget（lines） | ✅ | `input[type=number]` 渲染 default 200（AC4-②；步进行为既有 widget 机制未改） |
| toggle widget（autoscroll） | ✅ | checkbox 渲染 default true（AC4-②） |
| 模拟运行动画 | ⛔ 环境不可达 | §4 限制 3（非产品缺陷；模拟路径代码 diff 已审） |
| 导入导出/撤销重做/审批弹窗 | 未抽查 | 与本迭代改动面无交集（纯插入不改既有交互路径），gate 11 场景全绿背书 |

---

## 6. 首轮 VERIFY 裁定（留档）

- **迭代 0034 首轮 VERIFY = FAIL**，BUG-001（Critical）+ BUG-002（Minor）交 BUILD 修复轮（repair_round ≤ 2）。
- 修复后最小复验集：① `npm run build` + `npm run gate`（11 场景零波及不得破坏）；② `npm test` 30/30；③ 在线流式 E2E 重跑 AC4-③（呈现区出现/▌光标/覆盖更新/done 定稿）与 AC4-⑤（lines 裁旧 + autoscroll）；④ `node tests/smoke/smoke-server.mjs` 全量（提交后 V09 原断言须绿）。
- 无宪法违规：无 golden 重录发生（gate:update 0 次）、无禁区触碰、无越权 UI 变更（修宪授权链 issue#3 + ADR-0015 在案，PRD/SPEC 复核一致）。

> 证据可溯：本文所有命令输出与 DOM 读数均为本会话在工作树内亲跑/亲读；浏览器截图与 DOM 检查在 mock 流式端点 + 本地后端环境执行，页面加载地址与后端端口见 §4 环境说明（验收用无点段运行副本承载服务，工作树与主干 git 状态零污染，临时资源已全部清理）。

## 7. 修复轮 1 复验补充说明

- 复验的浏览器 E2E 沿 §4 同款验收环境（无点段运行副本 + mock 流式端点），工作流以 `localStorage 'agentflow.v2'` seed 预置（gate.mjs TERMVIEW_WF_SEED 同款手法）绕开本环境输入管线限制；被测面聚焦「在线运行 → 呈现区行为」（修复仅涉运行期事件路径，交互面在首轮已回归且修复未触碰）。
- AC4-④（只读性）结论沿用首轮：`.node-term` 为纯 div.textContent（修复 diff 亲读确认无输入面元素），节点体仅有 lines/autoscroll 两参数 widget；「点击零新增网络请求」在呈现区为纯前端 textContent 更新下成立（无任何 fetch/XHR 路径）。
- 时序正确性核（修复 diff 亲读）：引擎拓扑序上游 llm done 后 termview 才执行 → termview 自身 done（ev.id=termview）到达时呈现区已由上游 delta 转发创建 → 去光标生效；多路上游汇入同一 termview 时后到 delta 覆盖（引擎串行语义）。
- 合并申报补充确认（沿 JOURNAL §5.3）：本分支对 merge-base 84ee8ec 纯插入保持；与并行路 BK-0036 的产品文件交集按 AC8 清单交仲裁员。
