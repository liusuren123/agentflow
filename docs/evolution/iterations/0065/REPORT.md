# REPORT · 迭代 0065 · BK-0047 retrieval kb 参数动态化（修宪轮）· VERIFY

> 产出角色：test-manager（VERIFY 阶段）· 首轮 2026-10-28 · 修复轮复验 2026-10-29
> 输入：`iterations/0065/PRD.md`（AC1~AC9）+ `iterations/0065/SPEC.md`（§5 点位 / §7 验收口径）+ JOURNAL.md（含 §7 修复轮留痕）。
> 验收环境：隔离工作树 `feat/0065-iter`；工作树后端自建并运行于 **:3100**（`PORT=3100 node apps/server/dist/server.js`；:3000 被一个**陈旧旧版** AgentFlow 进程占用——`/api/v1/kb` 404、早于 BK-0019——两轮均未触碰，验毕原样保留）。
> 门禁四件套（build/gate/test/smoke）两轮均按派发指令**未重复执行**，采信脚本在工作树内的全绿记录 + JOURNAL 自测记录；VERIFY 为针对性 E2E + 机器证明 + 交互回归抽查。

## 0. 结论（修复轮复验后终态）

**PASS（repair_round 1 后全绿）——BUG-0065-01 已修复并经复验闭环，其余验收面维持通过。**

- 首轮（2026-10-28）判 **FAIL**：1 个 Critical 缺陷 BUG-0065-01（在线态选中 retrieval 节点触发 renderProps⇄refreshKbs⇄onKbsArrive 自反馈死循环，实测 315 次 `GET /api/v1/kb`/3s），原文保留于本文件 §1~§6（历史留档）。
- 修复（BUILD repair_round 1，JOURNAL §7）：`refreshKbs` 重写为「仅变更到达」——`kbShapeOf` 归一化（键序固定）后 `JSON.stringify` 内容比对，成功且内容有变（含 null→首达）才发 `kbsArrive`；失败静默不回调（`apps/web/src/server-sync.js` 修复轮 +10 行净增，app.js/gate.mjs 零改动，numstat 实测 app.js 26/3、gate.mjs 50/3 与首轮一致）。环分析：到达→重绘→再拉取→内容相等→不回调，环在 2 次拉取内必终止。
- 复验（2026-10-29，本轮实跑）：**13/13 在线复验点全过 + 离线回退 4/5（B4 系已知断言误报）**——请求计数 315→**1**（对照节点 0、数据未变重选 1）；原作废三点 T3/T4/T5 全部补验通过（T4 按 §R4 既有撤销语义口径修正后判定）；抽查 T1/T2/T6c/B1 与首轮结论一致零回退。详见 §7。
- golden：s20 png 经脚本 gate:update 重录一次（61754→61707 B，缺陷态光栅→修复版稳态；**invariants 逐键全等**，本轮亲读比对）。定性：s20 系本轮 golden-created 新建场景，重录 = 新基线随缺陷修复落定，非对既有 20 场景基线的重录；issue#6 修宪授权链内消费、JOURNAL §7.3 留痕、复跑 4/4 pass diffPx=0。s0~s19 零波及维持（png 字节一致）。
- 修复不改变稳态渲染形态：s20 invariants 全等 + 复验各点渲染正常佐证；`gate:update` 全程仅此一次消费。

## 1. 缺陷清单

### BUG-0065-01 · 在线态选中 retrieval 节点触发 renderProps⇄refreshKbs 自反馈死循环 · **Critical**

- **环境**：win32 / Node v24.21.0 / 工作树 `feat/0065-iter` 构建产物（:3100）/ Chromium（Playwright 1.64.1 headless，与门禁同款引擎）。在线/离线均测。
- **复现步骤**：启动后端 → 浏览器打开页面 → 单击选中任意 retrieval 节点（如默认 kefu 示例「知识库检索」）→ 观察网络面板。
- **预期**（PRD 非功能）：「combo 刷新随属性面板打开时机，**不引入轮询**」——选中后至多一次清单拉取与一次重绘。
- **实际**：选中期间每秒约百次 `GET /api/v1/kb` + 全面板重建，直至取消选中或后端不可达才停止。
- **证据（本轮实跑）**：
  - 请求计数对照（同一页面、各 3 秒窗口）：选中 **prompt 节点 0 次** → 选中 **retrieval 节点 315 次**（脚本 `verify0065-loop.cjs`，Playwright `page.on('request')` 计数）。
  - 离线对照（file:// 加载、后端不可达）：选中 retrieval 后 3 秒 **0 次**失败请求（B5）——与代码路径推断一致（拉取失败 → `SVR.kbs` 保持 null → 到达回调早退，环断裂；**该环仅在在线态成立**）。
  - 交互实际不可用佐证：对 `#props select[data-k="kb"]` 执行原生 selectOption 连续 3 轮全部竞态失败（元素在被选中后即被高频替换），T4（撤销/重做）、T5（标签页切换）两点读数被同源噪声污染、判无效。
- **代码路径定位（本轮亲读 diff）**：
  - `apps/web/src/legacy/app.js` renderProps 单节点分支新增 `if(n.type==='retrieval') refreshKbs();`（SPEC §2.2-4「选中时机刷新」）；
  - `apps/web/src/legacy/app.js` onKbsArrive 到达回调内 `renderProps()`（选中恰 1 个 retrieval 时，SPEC §2.2-2）；
  - `apps/web/src/server-sync.js` `refreshKbs()` 在成功/失败后**无条件**发 `kbsArrive()`（SPEC §2.1）。
  - 三者合成环：`renderProps → refreshKbs → fetch 成功 → kbsArrive → renderProps → …`（`if(!SVR.kbs) return` 只防「未到达」，不防「已到达后的重复到达」）。
  - **SPEC 即携带此缺陷**：caps 直系先例（迭代 0039）中 `refreshCaps()` 只在 init 调用、**不在 renderProps 内**，故同构四件套在 caps 上无环；本项把刷新点移入 renderProps 才成环。修复设计权归 SPEC/BUILD，VERIFY 不预设方案（候选方向：到达回调按「选项集合实际变化」判重后再重绘 / 拉取在途去重 / 刷新点移出 renderProps）。
- **严重级别理由**：Critical——在线态（产品主形态）下本特性的核心用户故事 US-1「下拉里直接能看到并**选到**它」的选择动作被破坏；且属无界资源消耗（网络+CPU）。不判 Blocker：离线回退、检索执行、既有值保真均正常，数据无损坏。
- **修复后复验清单（VERIFY 复跑口径）**：① 请求计数对照（retrieval 选中 3 秒 ≤ 2 次、数据不变时重选亦不重复重绘风暴）；② T3 写回同步、T4 撤销/重做、T5 标签页切换三点重测；③ T1/T2/T6c/B1 抽查不回退；④ `npm run gate` 21 场景全绿（s20 像素应零变化——该修复不动稳态渲染形态）。

### （非缺陷）测试过程记录两则

- **T6d「命中 0 条」非缺陷**：查询词 `退货政策` 单词 + `th:0` 触发 `apps/server/src/handlers.ts:47` 既有怪癖 `(Number(p.th)||0.5)`——0 为 falsy 被兜底成 0.5。用 KB03 同款查询 `退货政策 7 天` + th=0.1 服务端命中 3 条（SSE 原始流实采）、GUI 命中 3 条（T6d2）。`handlers.ts` 本轮零 diff（AC9 机器证明），系存量语义，建议另立 backlog 观察项、不在本轮修复。
- **B4「modal 存在」系断言误报**：`.modal-mask` 为 Skeleton 常驻隐藏容器，离线（file://）与在线（含早于本轮的陈旧 :3000 实测）均为 `display:none`——非报错弹窗，E3 实质通过。

## 2. 验收标准逐条结论（PRD AC1~AC9）

| AC | 结论 | 证据（本轮实跑，均在工作树/工作树起的服务上） |
| --- | --- | --- |
| AC1 供数正例 | **PASS** | E1：工作树后端 ：3100，`curl /api/v1/kb` 返回 7 库；浏览器选中 kefu retrieval（data-id=3）→ 面板 combo 选项 === 服务端清单（逐项 deep 相等）、节点 widget select 同（T1a/T1b，`t1_online_supply.png`）。动态面：`POST /api/v1/kb/e2e-verify-224125/documents`（201）后**不刷新页面**仅重选节点，combo 即含新库且仍与最新服务端清单 deep 相等（T2b/T2c，`t2_options_with_new_kb.png`）。s20 golden 基线双承载（fixture 独有名 `kb-gate-ext` 选中态）。 |
| AC2 离线回退 | **PASS** | E3：后端不可达（file:// 加载 dist = fetch 必败语义）+ 刷新 → 选中 retrieval → 面板与节点 widget 选项均为 DEFS 三固定名**声明序** `["产品手册 v2.3","FAQ-售前","工单历史 2026"]`，选中态=默认值无空白，无报错弹窗无 toast（B1~B4，`b_offline_fallback.png`；B4 误报已定性见 §1）。 |
| AC3 检索零漂移 | **PASS（承继 + GUI 抽查）** | smoke 168/0（KB03/KB04 等价锚）系 BUILD 自测 + 脚本门禁记录，**本轮未重复执行**（按派发指令）；GUI 抽查：`kb=产品手册 v2.3` + KB03 同款查询实跑命中 3 条·最高 0.5（T6d2，`t6d2_run_seedkb_fixed.png`），选中态显示保真（T1c）。 |
| AC4 新库可选可检索 | **PASS** | E2：上传 `e2e-verify-224125`（201，1 chunk）→ GUI 预置 userinput→retrieval→jsoncanvas 工作流（localStorage 预置=环境准备，运行本身真实）→ combo 选中新库（面板+画布双落）→ 点击 ▶ 运行 → 「命中 1 条片段 · 最高相似度 0.99」，结果输出面板可见片段原文含 `ZK-MARKER-0065-KB` 标记（T6c，`t6c_run_newkb_with_query.png`）；服务端 SSE run 同库同查询，流内含标记原文（T6e）。该库仅 1 chunk，命中必来自新库。 |
| AC5 契约守卫 | **PASS（未重复执行，机器佐证零涉）** | `npm test` 30/30 由脚本执行（采信）；零 shared 案由本轮机器证明背书：`git diff --name-only` / `git ls-files --others --exclude-standard` 显示 `packages/shared/**` 零改动（§3）。 |
| AC6 门禁（修宪轮双通道） | **PASS（采信脚本记录 + 变更集机器复核）** | build ✓ / gate 21 场景全绿（s0~s19 diffPx=0 零波及实测 + s20 golden-created + 复跑 diffPx=0）由脚本与 JOURNAL §2 双记录在案，本轮未重复执行；本轮复核：golden 目录变更**恰** s20 双文件（`git ls-files --others` 其余 golden 零涉）、gate.mjs 场景基建与 SPEC §4.3 逐项一致、**gate:update 零消费**、s20 `!existsSync` 首跑落盘通道成立。 |
| AC7 冒烟零回退 | **PASS（采信记录，未重复执行）** | smoke 168/0（JOURNAL §2 #5 + 脚本记录）；本项零新增断言与 SPEC §0 终裁一致。 |
| AC8 手动 E2E | **部分 PASS / 部分作废** | E1 ✓（T1）、E2 ✓（T2+T6c/T6e）、E3 ✓（B1~B4）、E4 ✓（T1c+T6d2）；**E5 作废待复验**（写回同步/撤销重做/标签页切换被 BUG-0065-01 高频重建污染——T3 三连竞态失败、T4/T5 读数无效）。 |
| AC9 改动面白名单 | **PASS（机器证明）** | `git diff --name-only` = `apps/web/src/legacy/app.js`、`apps/web/src/server-sync.js`、`tools/pixel-gate/gate.mjs` + 机制件（BACKLOG/STATE）；untracked = ADR-0021、iterations/0065/ 产物、golden s20 双文件。负清单（`packages/shared/**`/`Skeleton.tsx`/`app.css`/`apps/server/**`/`index.html`/gate 比对逻辑）零涉。golden 变更恰 = s20 双文件（0056 P1 教训口径达成）。 |

## 3. 实现与方案符合性抽查（亲读 diff）

- `apps/web/src/server-sync.js`：kbShapeOf 契约全字段校验 / fetchKbList 走 apiJson('/kb')（V1 前缀，8s 超时同口径）/ SVR.kbs+kbsErr / onKbsArrive / refreshKbs 失败静默——与 SPEC §2.1 逐段一致；零 DOM 操作（ADR-0006 边界保持）。
- `apps/web/src/legacy/app.js`：import / init `refreshKbs()` / onKbsArrive（rerenderNode 自带 measurePorts+updateEdgesOf；renderProps 保 scrollTop）/ comboOptionsOf 纯函数（仅 (retrieval, kb) 命中换源，回退态=DEFS 合成 `o` 原样）/ 两渲染点仅换选项数组来源、模板字面量与 selected 按值匹配逐字未动——与 SPEC §2.2 一致；**唯一超出项即 BUG-0065-01 的环**（SPEC 自身携带，非 BUILD 偏离 SPEC）。
- `tools/pixel-gate/gate.mjs`：KB_FIXTURE 四行码点升序（F < k < 产 < 工）与 `kb/store.ts listKbStats` 的 `ORDER BY name` 语义一致；KB_ROUTES 两 pattern 无重叠；KB_WF_SEED seed 值刻意取 fixture 独有名（B4 口径）；kbReady 状态量探针（option 数=4 ∧ 面板/widget 双选中）；kbInv 三键 spread——与 SPEC §4.3 一致。
- golden `s20-retrieval-kb-online.invariants.json`：kbOptions 四项 fixture 序、kbSelected=nodeKbSelected='kb-gate-ext'，公共六键齐全；png 目检面板+画布双落 `kb-gate-ext`、其余版面与既有形态一致。
- ADR-0021：在库、草案态措辞（无「已批准」终态字样）、授权链 issue#6 承继在案、§4 三层回写表含 B3 序不对称声明——符合 SPEC §4.1。

## 4. 证据清单

- **截图（`iterations/0065/verify-shots/`，均已目检）**：`t1_online_supply.png`（E1 双面供数）、`t2_options_with_new_kb.png`（新库入列）、`t3_writeback_sync.png`（作废点留档）、`t4_undo_redo.png`（作废点留档）、`t5_tab_switch.png`（作废点留档）、`t6c_run_newkb_with_query.png`（AC4 命中+标记原文+运行完成 toast）、`t6d_run_seedkb_with_query.png`（th=0 怪癖现场，非缺陷）、`t6d2_run_seedkb_fixed.png`（E4 修正后命中 3 条）、`b_offline_fallback.png`（E3 回退态）。
- **机器读数（同目录 JSON）**：`stage-a-results.json`（T1/T2/T3/T4/T5/T6a/T6b + console 零 error/pageerror）、`stage-a3-results.json`（T6c/T6d/T6e）、`stage-b-results.json`（B1~B5）。
- **关键命令与输出摘录**：
  - `git diff --name-only` + `git ls-files --others --exclude-standard` + `git diff --numstat`（AC9：产品三文件 +26/−3、+28/−1、+50/−3）。
  - 请求计数：`3s with prompt-node selected: 0 kb requests` / `3s with retrieval-node selected: 315 kb requests`（BUG-0065-01 定量证据）。
  - `curl http://localhost:3100/api/v1/kb` → 6~7 库清单（seed 三固定名在列）；`POST /api/v1/kb/e2e-verify-224125/documents?filename=doc.md` → 201 `{ok:true,...,chunks:1}`。
  - SSE 原始流（curl -N POST /api/v1/run，kb=产品手册 v2.3、q=退货政策 7 天）：`命中 3 条片段 · 最高相似度 0.45`，output 事件含 退货政策 §2.1/§2.3 全文。
- **临时验证脚本**（不落源码树，系统临时目录）：`verify0065-stage-a.cjs` / `verify0065-loop.cjs` / `verify0065-runs.cjs` / `verify0065-api2.cjs` / `verify0065-e4.cjs` / `verify0065-offline2.cjs` / `verify0065-modal.cjs`。浏览器级自动化用本仓 Playwright 1.64.1（ZCode 内嵌浏览器面板在本环境无法附加 guest，三次重试失败后按 test-manager 职责定义走「临时脚本补充验证」通道，引擎与门禁同为 Playwright Chromium，交互均为真实鼠标/键盘/原生 select 动作，读 DOM 仅只读）。

## 5. 环境与数据残留声明

- 工作树 `data/agentflow.db`（gitignored）新增测试库：`e2e-verify-kb`、`e2e-verify-224125`（各 1 chunk）及此前冒烟残留 `smoke-kb-*`——不入库，无主干影响；如需洁净复测可删库重播 seed。
- :3000 陈旧 AgentFlow 进程（早于 BK-0019 的旧 dist，`/api/v1/kb` 404）非本轮产物、未触碰；建议用户择机重启，避免误连旧后端造成「新库不可见」假象。
- 本轮起停的后端仅限 VERIFY 自建 :3100 实例，验毕已停。

## 6. 移交

- ~~回 BUILD（repair_round 1）：修 BUG-0065-01~~ → **已执行并复验通过（见 §7），移交 MERGE**：VERIFY 终态 PASS，可进入特性分支双提交与合并仲裁；CI `ui-constitution` 推送后盯守（golden 权威在 CI）。
- 首轮通过点证据（§2~§5 + verify-shots/）对修复轮继续有效处已在 §7 逐点抽查背书。

## 7. 修复轮复验（2026-10-29，REPORT §1 复验清单执行留档）

**环境与前置核验**：工作树 `apps/web/dist/index.html` 重建于 2026-10-29 00:00:18 > 修复源码 23:33:45（bundle 含 kbShapeOf，修复确在被测产物内）；工作树后端重启于 :3100（清单 9 库、重启后码点序正确）；陈旧 :3000 未动。脚本 `verify0065-r2.cjs`（真实鼠标/键盘/原生 select 交互 + 只读 DOM 断言），console/pageerror 全程 **0 条**。

### 7.1 复验结果明细（在线 13 点 + 离线 5 点）

| # | 复验点 | 判定 | 实测 |
| --- | --- | --- | --- |
| R1a | 对照：prompt 节点选中 3s kb 请求数 | **PASS** | 0 |
| R1b | **BUG-0065-01 复验：retrieval 选中 3s kb 请求数 ≤2**（首轮 315） | **PASS** | **1** |
| R1c | 数据未变重选 retrieval 3s 请求数 ≤1（无重绘风暴） | **PASS** | 1 |
| R2 | T1 抽查：面板+画布 combo 选项=服务端清单（9 库 deep 相等） | **PASS** | 逐项全等 |
| R3a/b | T2 抽查：上传 `r2-verify-001416`（201）→不刷新重选→combo 含新库且=最新清单 | **PASS** | 10 库全等含新库 |
| R3c | **T3 写回同步（首轮作废点）**：面板选值→节点 widget 同步 | **PASS** | panel=node=r2-verify-001416，selectOption 首试即成功（首轮 3 连竞态失败不再现） |
| R4a/b | **T4 撤销/重做（首轮作废点）**：撤销/重做后 combo 选中态无损坏、与 params 呈现一致 | **PASS（语义口径修正，见 7.2）** | undo/redo 后重选中：panel=node=r2-verify-001416，无空白无错乱 |
| R4c | T4 对照：非 kb 参数（topk）undo 亦清空面板选中 | **PASS** | panel-cleared=true（清空系既有全局撤销行为） |
| R5 | **T5 标签页切换（首轮作废点）**：新建标签页并切回后 combo 选中态保持 | **PASS** | tabs=2，panel=node=r2-verify-001416 |
| R6 | T6c 抽查：GUI 运行新库命中（seed userinput→retrieval→jsoncanvas，真实运行） | **PASS** | 命中 1 条·0.99，输出面板可见 `ZK-MARKER-R2-r2-verify-001416` 片段原文（`r2_t6c_run_newkb.png`） |
| R7 | T6d2 抽查：既有库检索命中不回退（E4） | **PASS** | kb=产品手册 v2.3 + KB03 同款查询 → 命中 3 条·0.5 |
| B1~B5 | 离线回退复测（修复后停服 + file:// 加载） | **PASS**（B4 同首轮 = 已定性断言误报） | DEFS 三固定名声明序、选中态默认值、无弹窗无 toast（`.modal-mask` 系 Skeleton 常驻隐藏容器）、离线 3s kb 失败请求 **0**（修复的失败分支不回调，符合设计） |

证据：`verify-shots/r2-online-results.json`（13 点全量读数）、`r2_t3_writeback_sync.png` / `r2_t4_undo_redo.png` / `r2_t5_tab_switch.png` / `r2_t6c_run_newkb.png`（均已目检）、Stage B 复用 `verify0065-offline2.cjs` 输出。

### 7.2 T4 判定的语义口径修正（如实声明）

首轮把 T4 期望写为「undo 应把 kb 参数回退到旧值」。亲读代码定性：`apps/web/src/legacy/app.js:1118-1146` change 委托直接写 `n.params[k]` **无 pushUndo()**（`:1123` 的 pushUndo 仅属 caps 勾选框分支），即**普通参数编辑（combo/number/text）本就不进撤销历史**——撤销只回退结构类操作（addNode/删除/连线/拖动/旁路/标题等，grep pushUndo 全部 12 处调用点逐一定位）且恒 `clearSel()`（app.js:1385-1387，解释「undo 后属性面板清空」）。R4c 对照证实非 kb 参数同样如此。故 T4 的正确验收口径 = 「撤销/重做后 combo 选中态与既有撤销语义一致：不损坏、不空白、与 params 渲染一致」——R4a/R4b 实测满足，判 PASS。此系**测试预期修正**，非对产品的放宽；参数编辑不可撤销系存量设计缺口，建议另立 backlog 观察项（与本轮改动面无关——本迭代 diff 未触碰写回/历史路径，SPEC §2.4 交互语义零改动成立）。

### 7.3 golden s20 重录定性与其余记录

- **s20 gate:update 消费定性**：s20 系本轮 golden-created **新建场景**；其首跑基线落在缺陷态构建的光栅上，修复后由脚本 gate:update 重录一次（61754→61707 B）。本轮亲读重录后双文件：invariants 与首轮**逐键全等**（kbOptions 四项 fixture 码点序、kbSelected=nodeKbSelected='kb-gate-ext'、公共六键一致）；png 目检为干净稳态（面板+画布双 `kb-gate-ext`）。定性为**新建基线随缺陷修复落定**，不属于对既有 20 场景 golden 的重录；issue#6 修宪授权链内消费、JOURNAL §7.3 留痕、复跑 4/4 pass diffPx=0、s0~s19 png 字节一致零波及。合宪性成立。
- **s3 间歇抖动**：JOURNAL §7.3 记录修复轮 gate 出现一次 s3-library 亚像素抖动（issue#12 已知口径，DOM 不变量逐键全等，CI 权威）；本轮两轮 E2E 未涉及 s3 场景，按 issue#12 纪律不消费重录。
- **JOURNAL 笔误记录**：JOURNAL §7.5 表格「app.js +29/−3（不变）」与 git numstat 实测 `26 3` 不符（首轮 JOURNAL §5 亦为 +26/−3）——纯文档笔误，不影响 productFiles 白名单与提交内容，提请 CLOSE 归档时顺手勘误。
- **数据残留**：工作树 `data/`（gitignored）新增复验库 `r2-verify-*` 与首轮 `e2e-verify-*`；不入库无主干影响。

### 7.4 AC 终态对照（修复轮后）

| AC | 首轮 | 复验后终态 |
| --- | --- | --- |
| AC1 供数正例 | PASS | **PASS**（R2/R3b 抽查一致） |
| AC2 离线回退 | PASS | **PASS**（B1~B4 复测一致） |
| AC3 检索零漂移 | PASS | **PASS**（R7 抽查 + smoke 记录采信） |
| AC4 新库可选可检索 | PASS | **PASS**（R3b/R6 复验） |
| AC5 契约守卫 | PASS | **PASS**（零 shared 案：两轮 `git diff --name-only` 均无 `packages/shared/**`） |
| AC6 门禁 | PASS | **PASS**（脚本 gate 4/4 复跑 diffPx=0 + s20 重录定性 §7.3 + s0~s19 零波及维持） |
| AC7 冒烟零回退 | PASS | **PASS**（采信脚本记录；本项零新增断言） |
| AC8 手动 E2E | 部分作废 | **PASS**（E1/E2/E3/E4 首轮过 + 复验抽查；E5 三点本轮补验通过） |
| AC9 改动面白名单 | PASS | **PASS**（修复轮 diff 仍恰 3 产品文件：server-sync.js 38/1、app.js 26/3、gate.mjs 50/3 + 机制件 + golden s20 双文件） |
