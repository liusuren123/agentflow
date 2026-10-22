# REPORT · 迭代 0006 · BK-0004 portCache 失效场景回归测试（VERIFY 验收报告）

> 产出角色：test-manager（VERIFY 阶段）· 首轮 2026-10-22 17:48 / **修复轮 1 复验 2026-10-22 18:06（最终结论见 §9）**
> 输入：`PRD.md`（AC1~AC7）+ `SPEC.md`（§5 验收口径 9 行 + 手动 E2E 点位 P1-P3）+ `JOURNAL.md`（含 §6 修复轮 1 记录）。
> 环境：本机 Windows（AI-WorkStation）· Node v24.21.0（`/api/v1/health` 实测回显）· Playwright Chromium。
> golden 权威基线在 CI（windows-latest）；本机 gate 结果按宪法第 2 条仅作参考级证据（两轮本机均 4 场景全绿 diffPx=0）。
> 门禁分工：`npm run build` / `npm test` 已由工作流脚本统一执行且通过（协调者指令声明，VERIFY 未复跑全套）；
> gate 因 SPEC §5 #6 注「演练重建 web 后必须复跑一次」由 VERIFY 自跑（两轮各一次）；smoke:server（SPEC #5 推荐项）由 VERIFY 自跑（两轮各一次）。

## 0. 最终结论（修复轮 1 复验后）

**PASS**（详见 §9 复验记录）。首轮 VERIFY 判 **FAIL（BUG-0001 ×1，Major）**：C5 反演不敏感——
单移除 `app.js:1272` 后 C5 不红。BUILD 修复轮 1 按 §4 修复建议落点（仅改 `tests/canvas/`：
lib.fit 增 `excludeIds` 单往返定位新边 + C5 双时点断言，JOURNAL §6），VERIFY 复验：
**B5 反演现红（早期时点 endDev=141.38px）、现状首跑 15/0 复绿、B1-B4 反演回归全部复命中、
AC1/AC2/AC3/AC5/AC6/AC7 全过、P1/P2/P3 复验通过**——SPEC §5 #6 全行满足，BUG-0001 关闭。

**AC7 现状结论（两轮一致，如实记录）**：未修改的现状 dist 上首跑（修复前 14/0、修复后 15/0），
全部 startDev/endDev=0.00px——**未发现存量失配**（REQ-0004-06 预案未触发，无产品侧 BUG）。

## 1. 执行总览（全部命令于仓库根、本 VERIFY 会话实跑）

| # | SPEC §5 行 | 命令 | 结果 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | #1 前置构建 | `npm run build` | 脚本已执行、通过（指令声明）；VERIFY 后续演练用 `npm run build:web` 重建 7 次（见 §3） | 前置成立 |
| 2 | #2 现状首跑 | `npm run test:canvas` | `14 passed / 0 failed`，exit 0；5 场景 14 断言逐条命名，全部 `startDev=0.00px, endDev=0.00px` | ✅ AC1/AC7 |
| 3 | #2 确定性（P2） | 再跑一次 `npm run test:canvas` | 仍 `14 passed / 0 failed`，exit 0，结果一致；跑后 `git status --porcelain` 无新增条目（零产物污染） | ✅ |
| 4 | #8 dist 缺失防御 | `mv apps/web/dist apps/web/dist.tmpbak` → `npm run test:canvas` → 还原 | 输出 `[test:canvas] apps/web/dist 不存在——先在仓库根执行 npm run build:web（或完整 npm run build）后再跑本测试`，**exit 1**（不静默） | ✅ AC3 |
| 5 | #7 空转设防 | 临时把 geometry.mjs:100 的改高语句改为空操作（`ta.style.height = ta.offsetHeight + 'px'`）→ 跑 → 还原 | `✗ C3 前置 · 节点B高度增长 60±2px · h0=284px, h1=285px, Δ=1px`，`12 passed / 1 failed`，exit 1——前置红而非假绿；还原后语法检查过 | ✅ AC2 |
| 6 | #6 反演演练 ×5 | 见 §3 明细（每点：改 app.js → `npm run build:web` → `npm run test:canvas` → `git checkout` 还原） | B1/B2/B3/B4 红、偏差与 SPEC §4.2 预测逐条吻合；**B5（1272）未红 → BUG-0001**；B5b 对照实验红 | ⚠️ AC4 部分 |
| 7 | #2/#4 复绿+复跑 | 还原后 `npm run build:web`（干净源）→ `npm run test:canvas` → `npm run gate` | `14 passed / 0 failed` exit 0；gate 4 场景 `s0-initial/s1-select-node/s2-settings/s3-library` 全 `pass · diffPx=0`，「宪法门禁：通过 ✓」exit 0（演练零残留双保险） | ✅ AC6 |
| 8 | #5 smoke | `npm run smoke:server` | `==== smoke:server：39 passed / 0 failed ====`，exit 0 | ✅ AC5 |
| 9 | #9 改动面核对 | `git status --porcelain`（全仓 + 受保护路径分查） | tracked 改动仅 `package.json`（scripts +1 行 `test:canvas`，grep 计数恰 1）与 `docs/evolution/STATE.md`（协调产物）；untracked 为 `tests/canvas/` 与 `docs/evolution/iterations/0006/`；`apps/`、`packages/`、`tools/`、`tests/golden/`、`tests/smoke/`、`.github/` **零改动**（空输出） | ✅ AC6/REQ-0004-05 |
| 10 | #3 npm test | —— | 脚本已执行且通过（指令声明，8 项口径 STATE.md:13）；VERIFY 按指令不重复跑全套 | ✅（脚本证据） |

## 2. PRD 验收标准逐条判定

| AC | 判定 | 证据摘要 |
| --- | --- | --- |
| AC1 端点贴合不变量 | ✅ | 5 场景 fit 断言全过且逐条命名（C1/C2a/C2b/C3/C4/C5），全部偏差 0.00px ≤ TOL=1px（§1 行 2）；坐标换算按 SPEC D3（`d` 正则提数 → `getScreenCTM` → port rect 中心，lib.mjs:115-136） |
| AC2 非空虚设防 | ✅ | 各场景前置断言全过并带前后值（如 C1 高度增长、C4 位移向量 ≥50px）；空操作反演 → 前置红 `Δ=1px`（§1 行 5），不产生假绿 |
| AC3 一键与前置校验 | ✅ | 正常 exit 0（§1 行 2）；dist 缺失 → exit 1 + 构建指引（§1 行 4），不静默跳过 |
| AC4 陷阱敏感性 | ⚠️ **部分 FAIL** | B1(1214)→C1 红 2.00px、B2(1078)→C2a 红 112.50px、B3(1669)→C3 红 60.25px、B4(1473 updateEdgesOf)→C4 红 94.34px，全部与 SPEC §4.2 预期同量级；**B5(1272)→C5 未红** → BUG-0001（§3/§4）。PRD 正文举例的两点（1078/1214）均命中；SPEC §4.2 锁定表指定的第 5 点未命中 |
| AC5 既有防护零回退 | ✅ | `npm run smoke:server` 39/0 exit 0（§1 行 8，本会话实跑）；`npm test` 脚本已跑通过（指令声明，未复跑） |
| AC6 渲染零影响与白名单 | ✅ | gate 复跑 4 场景 diffPx=0（§1 行 7，演练后本会话实跑）；git 改动面 = `package.json` 1 行 + `tests/canvas/`（136+204 行，均 ≤400）+ 迭代目录/STATE（协调产物），受保护路径零改动（§1 行 9） |
| AC7 现状结论如实 | ✅ | 现状首跑 14/0、偏差全 0.00px——「未发现存量失配」；REQ-0004-06 未触发 |

## 3. AC4 反演演练明细（SPEC §5 #6；每点独立：改 → `npm run build:web` → `npm run test:canvas` → `git checkout -- apps/web/src/legacy/app.js` 还原）

| 演练 | 移除点 | SPEC §4.2 预期 | 实测 | 判定 |
| --- | --- | --- | --- | --- |
| B1 | `app.js:1214` runSingleNode 结束 `measurePorts();` | startDev=2px（st-running 进度条 2px 回移后缓存停旧态） | `✗ C1 · startDev=2.00px, endDev=0.00px`，13/1，exit 1 | ✅ 精确命中 |
| B2 | `app.js:1078` rerenderNode `measurePorts();` | ≈widget 块高度（约百px 量级） | `✗ C2a · startDev=112.50px, endDev=0.00px`，13/1，exit 1（C2b 绿：展开态回到与 boot 同源缓存一致的位置，stale 缓存恰好重新匹配——单折叠操作必被 C2a 抓获，锁定性不受影响，见 §5 观察 2） | ✅ 同量级 |
| B3 | `app.js:1669` textarea mouseup `measurePorts();` | 60px（改高量直传 widgets 之下的 out 端口） | `✗ C3 · startDev=60.25px, endDev=0.00px`（edge 200，FROM=B.out），13/1，exit 1——与 BUILD JOURNAL §4 单点抽查值逐字一致，独立复现 | ✅ 精确命中 |
| B4 | `app.js:1473` 拖拽移动中 `updateEdgesOf(...)` | 位移量（94px；松手 1508 只重测不重绘，无兜底） | `✗ C4 · startDev=94.34px, endDev=0.00px`（= hypot(80,50) 位移向量精确值），13/1，exit 1 | ✅ 精确命中 |
| B5 | `app.js:1272` addNode 同步 `measurePorts();` | ≈140px（回退猜测值 vs 实际 in 端口偏移） | **`✓ C5 · startDev=0.00px, endDev=0.00px`，14 passed / 0 failed，exit 0——未红** | ❌ **BUG-0001** |
| B5b（对照表征，非 SPEC 行） | `app.js:1271`+`1272` 两处 `measurePorts` 同时移除（保留全部 `updateEdgesOf`） | ——（表征 C5 是否虚设） | `✗ C5 · startDev=0.00px, endDev=141.38px`（新边 id=1792662232497，TO 端落入 portCenter 回退猜测值 `app.js:805-809`），13/1，exit 1 | ✅ 场景非虚设、量级=SPEC 预测 |

全部演练后：受保护路径 `git status --porcelain` 空 → 干净源重建 → test:canvas 复绿 14/0 → gate 4 场景 diffPx=0（§1 行 7）。源码零残留。

## 4. BUG-0001（唯一缺陷）

- **编号/级别**：BUG-0001 · **Major**（测试资产对指定锁定点失敏感；非产品缺陷——现状 dist 无存量失配）。
- **现象**：临时移除 `app.js:1272`（addNode 同步 `measurePorts()`）并重建 web 后，`npm run test:canvas`
  的 C5 场景仍绿（`14 passed / 0 failed`，偏差 0.00px）；SPEC §5 #6 验收行「`app.js:1272`→C5 红」未满足，
  SPEC §4.2 C5 行锁定的调用点未被测试实际锁住。
- **复现步骤**：① 删除 app.js:1272 行首的 `measurePorts(); `（保留 `renderMinimap(); updateStats();`）；
  ② `npm run build:web`；③ `npm run test:canvas` → 观察 C5 仍 ✓、汇总 14/0、exit 0；④ 还原。
- **根因（源码级，本会话核实）**：新边在 `confirmSearch→addEdge`（app.js:1719）同步创建时读
  portCenter，缓存缺失落入回退猜测值；但 `app.js:1271` 的 220ms 定时器会 `measurePorts()`（全量重测，
  app.js:792-804）+ `updateEdgesOf([n.id])`（重绘触及该节点的边，app.js:856-859），**在 C5 的
  300ms 断言（geometry.mjs:162，PRD REQ-0004-02⑤ 的 ≥260ms 地板）之前把误差自愈**。
  即：单移除 1272 的失效窗口仅 0-220ms，晚于 260ms 的黑盒断言结构性看不见。SPEC §7 偏差声明 1
  论证了「移除 1271 不可分辨」，但漏掉了对称命题「移除 1272 会被 1271 掩盖」。
- **影响面**：未来重构若**只**丢掉 1272（保留 1271 定时器），测试不报警——用户可见后果为新增节点
  自动连线后 ≤220ms 的瞬时端点错位（≈140px，入场动画期间），随后自愈。其余 4 个锁定点（1214/1078/
  1669/1473）均已被证明红得出来；1271+1272 联合丢失亦红（B5b）。
- **修复建议（BUILD 修复轮，仅改 `tests/canvas/geometry.mjs`，产品代码零触碰）**：C5 在点击
  `.s-item` 后**立即**（新边一出现即断言，如 `waitForFunction` 等 `#edges g.edge` 数量 2→3 后直接
  `fit`，Playwright 往返耗时 ms 级 ≪ 220ms 自愈窗）增加一次早期贴合断言，再保留既有 300ms 稳定断言；
  现状源码下两个时点均绿、1272 反演下早期时点必红（回退猜测 141px 量级）。修复后 VERIFY 复跑
  B5 反演应红、现状首跑应复绿。
- **处置**：按 WORKFLOW §4 进 BUILD 修复轮 1（上限 2）；若协调者评估「1272 单点敏感性」拟改口径
  （如锁定点改判为 1271+1272 联合），属 SPEC 变更，须回 PM/SPEC 重签，本 REPORT 不代裁。

## 5. 观察与备注（不构成缺陷）

1. `npm test`（AC5）：按协调者指令采信脚本执行结果，VERIFY 未复跑；本会话实跑的 gate 与
   smoke:server 均为第一手证据。
2. B2 演练中 C2b（展开）绿、C2a（折叠）红：展开后的实际几何与 boot 时的缓存恰好一致（stale 缓存
   重新匹配），属该失效模式的对称性使然；折叠操作必被 C2a 抓获，C2 锁定点判定不受影响。
3. BUILD 对 SPEC §4.3 种子的偏差（追加节点 C + 边 200 使 C3 反演敏感）经 B3 独立复现验证成立
   （60.25px 红），偏差论证（JOURNAL §2）与本 VERIFY 实测一致。
4. P1 期间后台 `npm start` 进程在脚本结束后自行退出（exit 0，日志含完整启动记录：SQLite 就绪、
   :3000 监听）；验收数据均在服务在线期间采集（health 200 + 页面加载 + `/api/health`×2 命中）。

## 6. 手动 E2E 点位（SPEC §5 末节，VERIFY 执行）

- **P1 回归用例人肉复算 ✅**：`npm start`（构建+后端 :3000）→ Playwright 打开
  `http://localhost:3000/`（同源种子播种）→ 复现 C2（点击 A 折叠钮）与 C4（.ntitle 拖拽 +80,+50）→
  截图 3 张（Windows 临时目录，仓库零污染，脚本用后即删）+ 同帧数值复算：**C2 后
  startDev=0.00px/endDev=0.00px；C4 后 startDev=0.00px/endDev=0.00px**；图像分析复核
  p1-1-collapsed.png：A 呈折叠态、A→B 与 B→C 两边端点均「anchored exactly at the port center
  with no visible gap or offset」；p1-2-dragged.png：A 明显下移偏右（B/C 不动），连线跟随
  （同帧数值 0.00px 为机器证据）。真实后端在线模式下（ENGINE.probe 命中 /api/health×2）与
  离线 test:canvas 结论一致。
- **P2 脚本产物零污染 ✅**：§1 行 3——两次运行后 `git status --porcelain` 与运行前完全一致，
  tests/canvas 不落任何产物；重复运行结果逐字一致（确定性地板成立）。
- **P3 离线性 ✅**：test:canvas 自建静态服务仅托管 `/ → dist/index.html`、其余一律 404
  （lib.mjs:40-43）——`ENGINE.probe` 对 `/api/health` 得 404 → `ENGINE.online=false` 走纯客户端路径；
  两次全绿运行均在「无后端」条件下完成，无任何 `/api/*` 隐式依赖。P1 在线模式另证两路径行为一致。

## 7. 交互回归抽查

本次迭代零产品代码改动（AC6 白名单机器核对），交互语义无变化源；针对画布连线相关交互做如下抽查：
拖拽（C4+P1）、折叠/展开（C2+P1）、textarea 改高（C3）、单节点执行（C1）、端口拖线→搜索弹窗→新增节点
自动连线（C5）、节点选中与执行按钮（C1 前置路径）——全部经真实事件路径驱动且几何贴合 0.00px。
其余清单项（缩放/框选/滚轮门控/快捷键/审批弹窗/撤销重做/导入导出/多标签/节点库）无改动面，
以 gate 4 场景（含 s1 点选、s3 节点库）diffPx=0 与 `npm test`（脚本）通过作回归依据。

## 8. 验收结论（首轮 VERIFY · 2026-10-22 17:48 · 已被 §9 复验取代）

| 项 | 值 |
| --- | --- |
| 结论 | **FAIL**（唯一缺陷 BUG-0001，Major） |
| 通过项 | AC1/AC2/AC3/AC5/AC6/AC7 + SPEC §5 行 1-5、7-9 + P1/P2/P3 |
| 未过项 | SPEC §5 #6 之 C5 锁定点反演（AC4 第 5/5 点）：`app.js:1272`→C5 未红 |
| 现状 dist | 未发现存量失配（首跑 14/0，偏差全 0.00px） |
| 修复轮建议 | BUILD 修复轮 1：仅 `tests/canvas/geometry.mjs` C5 增加早期（<220ms）贴合断言；修复后复验 B5 红 + 现状复绿 + gate 复跑 |
| 证据留存 | 本文件 §1-§7 所引命令输出均在本 VERIFY 会话实跑产生；截图 3 张存于本机临时目录 `%LOCALAPPDATA%\Temp\agentflow-verify-0006\`（不入库） |

## 9. 修复轮 1 复验（BUILD 修复后 · 2026-10-22 18:06 · 最终结论）

**修复核对**（读 JOURNAL §6 + 修复后源码，2026-10-22 17:52 落盘）：改动仅 `tests/canvas/`
两文件——`lib.mjs` 136→147 行（`fit` 增 `excludeIds` 参数：页内单次 evaluate 往返完成新边
发现+测量，lib.mjs:115-127）、`geometry.mjs` 204→216 行（C5 双时点断言：早期时点
`<220ms 自愈窗` geometry.mjs:171-174 + 既有 300ms 稳定时点 geometry.mjs:190-191；创建类
前置后置于早期断言，存在性由 fit 抛错保证、无假绿路径）。两文件均 ≤400 行，`node --check` 过；
产品代码零触碰（git status `apps/**` 等受保护路径两轮均零改动）。

**复验执行**（全部命令本会话实跑，仓库根）：

| # | 检查 | 命令 | 结果 |
| --- | --- | --- | --- |
| R1 | 现状首跑（AC1/AC7） | `npm run test:canvas` | **15 passed / 0 failed**，exit 0（断言数 14→15：C5 双时点）；C5 早期+300ms 两时点均 `startDev=0.00px, endDev=0.00px`——仍未发现存量失配 |
| R2 | 确定性（P2） | 再跑 `npm run test:canvas` | 仍 `15 passed / 0 failed`，exit 0；跑后 `git status --porcelain` 无新增（零污染） |
| R3 | dist 缺失防御（AC3） | `mv apps/web/dist apps/web/dist.tmpbak` → 跑 → 还原 | 同款指引报错、**exit 1** |
| R4 | 空转设防（AC2） | C3 改高语句临时改空操作 → 跑 → 还原 | `✗ C3 前置 · … Δ=1px`，`13 passed / 1 failed`，exit 1（前置红非假绿）；还原后 `node --check` 过 |
| R5 | **B5 反演（BUG-0001 核心复验）** | 仅移除 `app.js:1272` 的 `measurePorts();`（1271 定时器原样保留）→ `npm run build:web` → `npm run test:canvas` → `git checkout` 还原 | **`✗ C5 · …（早期时点 <220ms 自愈窗）（startDev=0.00px, endDev=141.38px）`**，14/1 failed，exit 1——**SPEC §5 #6「1272→C5 红」现已满足**；300ms 时点绿（自愈路径本体，预期行为）；偏差与首轮 B5b 实测及 SPEC §4.2 预测（≈140px）一致 |
| R6 | B1 反演回归 | 移除 `app.js:1214` → 同上流程 | `✗ C1 · startDev=2.00px, endDev=0.00px`，14/1，exit 1 ✅ |
| R7 | B2 反演回归 | 移除 `app.js:1078` → 同上 | `✗ C2a · startDev=112.50px`（C2b 绿，同首轮分析），14/1，exit 1 ✅ |
| R8 | B3 反演回归 | 移除 `app.js:1669` → 同上 | `✗ C3 · startDev=60.25px, endDev=0.00px`（edge 200），14/1，exit 1 ✅ |
| R9 | B4 反演回归 | 移除 `app.js:1473` 的 `updateEdgesOf` → 同上 | `✗ C4 · startDev=94.34px, endDev=0.00px`，14/1，exit 1 ✅ |
| R10 | 复绿 + gate | 受保护路径 status 空 → `npm run build:web`（干净源）→ `npm run test:canvas` → `npm run gate` | `15 passed / 0 failed` exit 0；gate 4 场景全 `pass · diffPx=0`、「宪法门禁：通过 ✓」exit 0（演练零残留） |
| R11 | smoke:server（AC5） | `npm run smoke:server` | `==== smoke:server：39 passed / 0 failed ====`，exit 0 |
| R12 | P1 手动 E2E | `npm start`（后台，health 200）→ Playwright 开 `http://localhost:3000/`（同源种子）复现 C2/C4 → 截图 | **C2 后 0.00px/0.00px；C4 后 0.00px/0.00px**；在线模式 `/api/health`×2 命中；图像分析复核 p1r2-1-collapsed.png（A 无 widget 行、两边端点「no gap, no offset」精确锚定端口圆点）与 p1r2-2-dragged.png（A 明显下移偏右、A→B 边起点「no gap, no offset」锚定输出端口）；截图 3 张续存 `%LOCALAPPDATA%\Temp\agentflow-verify-0006\p1r2-*.png`（不入库，临时脚本跑完即删） |
| R13 | 改动面终核（AC6） | `git status --porcelain`（全仓 + 受保护路径分查） | tracked：`package.json`（`test:canvas` 恰 1 行）+ `docs/evolution/STATE.md`（协调产物）；untracked：`tests/canvas/`、`docs/evolution/iterations/0006/`；`apps/`、`packages/`、`tools/`、`tests/golden/`、`tests/smoke/`、`.github/` **零改动** |

**AC 逐条终判**：AC1 ✅（15 断言全过、双时点覆盖）· AC2 ✅（R4）· AC3 ✅（R3）·
**AC4 ✅（R5-R9：5/5 锁定点反演全红、偏差值与 SPEC §4.2 预测逐条同量级）** ·
AC5 ✅（R11 + 脚本已跑 npm test）· AC6 ✅（R10 gate + R13 白名单）· AC7 ✅（R1 现状 15/0）。
P2 ✅（R2）· P3 ✅（test:canvas 全程离线静态服务、`/api/*` 一律 404，两轮全绿同证）。

| 项 | 值 |
| --- | --- |
| **最终结论** | **PASS**（BUG-0001 已修复并经独立反演复验关闭；无遗留缺陷） |
| 处置建议 | 按 WORKFLOW §4 VERIFY─PASS→CLOSE：归档提交（BACKLOG BK-0004 置 done、metrics 追加、iteration→0007、phase=idle）；PRD 尾注提醒——ready 队列已归零，下次心跳 PLAN 须转「补题」或由治理日补充 |

