# SPEC · 迭代 0011 · BK-0026 golden 场景扩充实现：s4 工作流面板在线态 / s5 历史面板在线态

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 00:47
> 输入：`iterations/0011/PRD.md` + ADR-0009（`docs/adr/0009-golden-s4-s5-online-panels.md`）
> + 以下代码事实（本会话逐行只读核实，行号为当前 HEAD）：`tools/pixel-gate/gate.mjs`（147 行
> 全文）、`apps/web/src/legacy/app.js`（284-385 / 550-636 / 2036-2057 / 2414）、
> `apps/web/src/server-sync.js`（全文）、`apps/server/src/server.ts`（64-65/144-163/186-202）、
> `apps/server/src/store.ts`（29-38/101/116-118/163-169）、`apps/server/src/providers.ts`
>（92-101）、`apps/web/src/Skeleton.tsx:28-54`、`package.json:11-12`、
> `.github/workflows/ci.yml:21-22`、`tests/golden/ui/` 目录清单。
> **修宪轮声明**：本迭代经 needs-approval issue #7 用户批复（liusuren123 本人评论「批准」，
> 2026-10-23T15:48:48Z，PLAN 会话 gh 亲核，存证见 PRD §选题过程存证），宪法第 3 条
> 通道三要件之「用户本人批准」在案；ADR-0009 为本项架构决策载体（已存在，本轮补状态
> 标注，不新建 ADR）。

## 0. SPEC 对 ADR-0009 的一处必要补充（代码核实发现）

ADR-0009 §3 公共机制只列了 `**/api/v1/workflows` 与 `**/api/v1/runs**` 两条拦截路由。
**代码核实发现这不够**：在线态分支的总开关是 `ENGINE.online`，由启动探测
`fetch('/api/health')`（`app.js:2041`，注意是 `/api` 别名而非 `/api/v1`）决定；gate 的
静态服务无后端（`gate.mjs:32-41`），不拦截 `/api/health` 则 probe 落入 catch
（`app.js:2053`）→ `ENGINE.online=false` → `renderSideWorkflows`/`renderSideHistory`
渲染**离线分支**（`app.js:382-383`「后端未连接」/ `app.js:572` 本地列表），s4/s5 快照
到的将是错误的面板形态。

因此 s4/s5 的路由拦截 fixture 集为**三条**（ADR §2「per-scenario 路由拦截 fixture」
机制的自然组成；本 SPEC 如实补全，不扩大 ADR 批准面）：

| 路由 pattern | 消费方 | 作用 |
| --- | --- | --- |
| `**/api/health` | `ENGINE.probe`（app.js:2041，AbortSignal 2500ms） | 置 `ENGINE.online=true`，打开面板在线分支 |
| `**/api/v1/workflows` | `fetchWorkflowList`（server-sync.js:23） | s4 服务端分组列表 |
| `**/api/v1/runs**` | `fetchRunList(50)` → `/api/v1/runs?limit=50`（server-sync.js:32） | s5 服务端运行列表 |

s0~s3 不注册任何路由（每场景独立 `browser.newPage`，路由天然不跨场景泄漏），probe 照旧
失败 → 离线态 → 与既有基线完全一致。

## 1. 受影响文件清单（= REQ-0026-05 白名单，产品提交 git diff 的全部允许范围）

| 文件 | 改动性质 | 说明 |
| --- | --- | --- |
| `tools/pixel-gate/gate.mjs` | 修改 | SCENARIOS +2 项；新增 per-scenario 路由拦截 fixture 与 `timezoneId`；不变量采集器支持 per-scenario 增量字段；新增确定性就绪等待。存量 147 行，扩充后估 ≤ 240 行（远低于 400 行上限；gate.mjs 为存量文件，上限规则本就不适用于新文件判定） |
| `tests/golden/ui/s4-workflows-online.png` | 新增 | golden-created 通道首跑落盘 |
| `tests/golden/ui/s4-workflows-online.invariants.json` | 新增 | 同上 |
| `tests/golden/ui/s5-history-online.png` | 新增 | 同上 |
| `tests/golden/ui/s5-history-online.invariants.json` | 新增 | 同上 |
| `docs/adr/0009-golden-s4-s5-online-panels.md` | 修改（仅状态行） | 「草案 · 待用户批准（批准前零实现）」→「**已批准（issue#7 用户批复 2026-10-23T15:48:48Z，PLAN 0011 会话 gh 亲核）· 实现于迭代 0011**」（REQ-0026-04 原文；显著声明块同步改写为已批准口径） |

**零改动（VERIFY 按 AC4 机器核对）**：`apps/web/**`、`apps/server/**`、
`packages/shared/**`、`.github/**`、`tools/pixel-gate/` 其余文件、`tests/golden/ui/`
既有 8 文件（s0~s3 各 png+invariants.json，AC2 逐字节零变化）、`tests/smoke/**`、
`tests/canvas/**`、`CONSTITUTION.md`、`AGENTS.md`、CI 配置。

## 2. 模块边界

1. **只动测试基建，不动产品三层**：本迭代全部改动落在 `tools/pixel-gate/`（POLICY 需
   批准区，已获批）与 `tests/golden/ui/` 新增基线。被快照的在线态 UI 是 ADR-0006/0007
   已批准落地的现状（`app.js:375-408` 工作流服务端分组、`app.js:564-591` 历史在线
   列表），本迭代对其**只读快照**。
2. **对前端契约零侵入**：路由拦截只**供数**，不改 `server-sync.js` 的 fetch 语义
   （`/api/v1/workflows`、`/api/v1/runs?limit=N`、`/api/health` 均为前端既有调用面，
   本 SPEC §0 表逐一对应）；fixture 响应形状与后端真实实现对齐——
   `WorkflowSummary {id,name,updated_at}`（store.ts:38/163-169）、
   `RunRow {id,workflow_name,status,started_at,ended_ms,done,total}`（store.ts:29-37/
   116-118）、health `{ok,engine,node,provider}`（server.ts:64-65）。
3. **gate 既有结构不重构**：静态服务（gate.mjs:32-41）、场景循环（110-132）、双重复核
   （pixelmatch 0 容差 120-125 + 不变量 JSON 串比对 124）、golden-created 通道
   （114-117）、diff 落盘与清理（126-129/144-146）全部原样复用；s4/s5 以声明式字段
   挂进 SCENARIOS，不引入函数式重排。

## 3. s4 / s5 场景完整定义

### 3.1 SCENARIOS 数组扩充（gate.mjs:60-65 之后追加）

```js
{ id: 's4-workflows-online', routes: WF_ROUTES, timezoneId: 'UTC',
  steps: [clickRail('workflows')], ready: wfReady, inv: wfInv },
{ id: 's5-history-online',  routes: RUN_ROUTES, timezoneId: 'UTC',
  steps: [clickRail('history')],  ready: runReady, inv: runInv },
```

- s0~s3 四项**一个字节都不改**（无 routes/timezoneId/ready/inv 字段）。
- `runScenario`（gate.mjs:67）按序增强（向后兼容，无字段时行为与现状逐字节等价）：
  1. `browser.newPage({ viewport:{width:1600,height:900}, ...(sc.timezoneId ? { timezoneId: sc.timezoneId } : {}) })`——timezoneId 是 Playwright BrowserContext 合法选项，仅 s4/s5 传 `'UTC'`；s0~s3 调用形状不变（无时间渲染，不钉死，ADR-0009 §3）。
  2. goto **之前**：`for (const r of sc.routes || []) await page.route(r.pattern, r.handler);`（路由注册先于导航，且 page.route 在 reload 后持续生效——`runScenario` 的 localStorage.clear→reload 流程 gate.mjs:70-71 会二次触发 probe，同一路由继续供数）。
  3. steps 循环之后、normalize 之前：`if (sc.ready) await page.ready(page)`（见 §4 确定性等待）。
  4. 不变量采集：`const invariants = { ...(既有采集 gate.mjs:84-100 原样), ...(sc.inv ? await sc.inv(page) : {}) }`——**per-scenario 追加键**保证 s0~s3 的 JSON.stringify 键序与内容与既有 golden 完全一致（gate.mjs:124 是字符串全等比对，键序敏感；展开运算符保持既有键的插入序、新键仅出现在 s4/s5）。

### 3.2 路由与 fixture 字面量（固定值，任何环境字节一致）

**WF_ROUTES（s4）**：

```js
const HEALTH_FIXTURE = { ok: true, engine: 'agentflow-server', node: 'v20.11.0',
  provider: { configured: false, endpoint: null, models: [], note: 'gate fixture' } };
const WF_ROUTES = [
  { pattern: '**/api/health',
    handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/workflows',
    handler: route => route.fulfill({ json: { workflows: [
      { id: 'wf-alpha-001', name: 'Demo Alpha',    updated_at: 1767225600000 },
      { id: 'wf-beta-002',  name: '示例工作流乙',  updated_at: 1767312000000 },
      { id: 'wf-gamma-003', name: 'Runner Gamma',  updated_at: 1767398400000 },
    ] } }) },
];
```

**RUN_ROUTES（s5）**：

```js
const RUN_ROUTES = [
  { pattern: '**/api/health',
    handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/runs**',
    handler: route => route.fulfill({ json: { runs: [
      { id: 'run-done-001',  workflow_name: 'Demo Alpha',    status: 'done',
        started_at: 1767225600000, ended_ms: 812300, done: 4, total: 4 },
      { id: 'run-error-002', workflow_name: '示例工作流乙',  status: 'error',
        started_at: 1767312000000, ended_ms: 245000, done: 2, total: 5 },
      { id: 'run-live-003',  workflow_name: 'Runner Gamma',  status: 'running',
        started_at: 1767398400000, ended_ms: null,    done: 1, total: 3 },
    ] } }) },
];
```

fixture 设计依据（逐项对齐渲染代码）：

- **响应包形状**：`{workflows:[...]}` / `{runs:[...]}` 对齐 server.ts:144/160-163 的
  `res.json` 与 server-sync.js:23/32 的解包（`j.workflows` / `j.runs` 非数组时回退
  `[]`——fixture 给真数组，不测回退）。
- **时间戳取整点毫秒**：1767225600000 = 2026-01-01T00:00:00.000Z，+86400000 递增
  （1/2、1/3 整点）。`timezoneId:'UTC'` 下 `fmtTs`（server-sync.js:71-76，本地时区
  `getMonth/getDate/getHours/...`）确定性渲染 `1/1 00:00:00`、`1/2 00:00:00`、
  `1/3 00:00:00`——不钉死则 CI（windows-latest）与录基线环境渲染不同字符串，golden
  必抖动（ADR-0009 §3 原论证，本会话复核 fmtTs 实现属实）。
- **名称 ASCII + 固定中文样例**：`示例工作流乙` 覆盖中文字形渲染路径，字面量固定。
- **s5 三态刻意各一**（ADR §3）：done → `runCardMeta`（server-sync.js:124-131）
  `{cls:'ok', icon:'check', suffix:''}`；error → `{cls:'stop', icon:'square', suffix:' · 失败'}`；
  running → `{cls:'stop', icon:'square', suffix:' · 进行中'}`（僵尸行渲染是 ADR-0007
  §3.2 关注面）。时长列（app.js:582）：`812.3s` / `245.0s` / `…`（running ended_ms
  为 null）。进度列：`4/4` / `2/5` / `1/3` 节点。
- **HEALTH_FIXTURE 细节**：`models: []` 刻意为空——probe 的模型列表分支
  （app.js:2047-2052）会给 `DEFS.llm.params[0].o` 赋值并可能触发 `renderProps()`，
  空数组跳过该分支，消除一处非必要副作用；`node`/`note` 只进底部日志行
  （app.js:2046，normalize 已闭面板）与设置面板（s4/s5 不打开），不影响像素。
- **glob 边界**：`**/api/v1/workflows` 全串匹配，不含通配尾，不会误吞
  `/api/v1/workflows/:id`（本场景无该调用）；`**/api/v1/runs**` 覆盖
  `/api/v1/runs?limit=50`（ADR §3 原 pattern）。
- **无超时风险**：`route.fulfill` 即时应答；`server-sync.js:17` 的
  `AbortSignal.timeout(8000)` 与 probe 的 2500ms 均不会触发。

### 3.3 场景步骤时序（复用 gate 既有流程，gate.mjs:69-83）

newPage（含 timezoneId）→ **注册路由** → goto → `localStorage.clear` → reload →
`document.fonts.ready` → `waitForTimeout(1000)`（以上与 s0~s3 完全一致）→
`clickRail('workflows'|'history')`（gate.mjs:51-53 既有 helper，触发
`setRailTab` → `renderSidebar` → 在线分支渲染 + `refreshWorkflows/refreshRuns`
异步拉取，app.js:287-306/384/569）→ **ready 等待（§4）** → normalize（闭底板/
清 toasts/blur，gate.mjs:44-50）→ 稳定双帧截图（gate.mjs:77-83）→ 不变量采集
（+ per-scenario 增量）。

面板内容备注（确认渲染面完整、无未供数网络调用）：s4 面板含「已打开 (1)」本地分组
（localStorage.clear 后默认标签页，与 s0~s3 同源确定性）、「操作」按钮组、「服务端」
分组（`#wf-cloud-list` 3 卡）；s5 面板在线分支整体即 `#sv-runs-list` 3 卡
（app.js:565-570）。boot 期除 `/api/health` 外无其他 fetch（refresh* 仅随面板打开
触发，app.js:384/569）；若出现意外错误 toast，normalize 的 `#toasts` 清空兜底
（gate.mjs:47）。

### 3.4 不变量增量字段（per-scenario，s0~s3 零新增键）

**s4 `wfInv`**：

```js
sideOpen: document.getElementById('sidebar').classList.contains('open'),   // === true
sideTitle: document.getElementById('side-title').textContent,              // === '工作流'
serverWf: [...document.querySelectorAll('#wf-cloud-list .wf-item[data-wf-id]')]
  .map(c => c.dataset.wfId),                                               // === ['wf-alpha-001','wf-beta-002','wf-gamma-003']
```

**s5 `runInv`**：

```js
sideOpen: true（同上采集）,
sideTitle: '任务历史'（同上采集）,
serverRuns: [...document.querySelectorAll('#sv-runs-list .run-item[data-run-id]')]
  .map(c => `${c.dataset.runId}:${c.classList.contains('ok') ? 'ok' : 'stop'}`),
  // === ['run-done-001:ok','run-error-002:stop','run-live-003:stop']（三态 class 分布，runCardMeta 映射）
```

选择器依据：服务端工作流卡 `data-wf-id`（app.js:397）与服务端运行卡 `data-run-id`
（app.js:583）区别于本地 `.wf-item[data-i]`（app.js:366）与离线 `.run-item`（无该
属性，app.js:556），计数不混入本地条目。既有六键（view/zoom/nodes/cssVars/counts/
bottomClosed，gate.mjs:84-100）s4/s5 同样采集并参与比对（画布背景态在线/离线一致，
进一步锁死「面板外零漂移」）。

## 4. 确定性等待策略（REQ-0026-06 定稿）

**问题**：在线列表是异步渲染——`renderSidebar` 先画「加载中…」占位（app.js:381/579），
fetch 回调 `paintServerWfGroup`/`paintServerRuns`（app.js:389/575）到货后才替换为
卡片。既有「稳定双帧」等待（gate.mjs:77-83）理论上可能在占位态连取两帧一致（路由
即时 fulfill 使概率极低，但 GC/调度抖动下非零）——快照到占位符即产生**伪基线**。

**方案**：per-scenario **DOM 状态就绪条件**，插在 steps 之后、normalize 之前——

```js
const wfReady  = page => page.waitForFunction(
  () => document.querySelectorAll('#wf-cloud-list .wf-item[data-wf-id]').length === 3,
  { timeout: 10000, polling: 100 });
const runReady = page => page.waitForFunction(
  () => document.querySelectorAll('#sv-runs-list .run-item[data-run-id]').length === 3,
  { timeout: 10000, polling: 100 });
```

- 条件即「在线分支已渲染 **且** fetch 数据已落 DOM」（占位态 0 卡、离线分支无此容器，
  两种错误形态都被卡住），与定时无关，是状态量而非时延量。
- 超时 10s：远大于即时 fulfill 的实际耗时，仅作失败上界；超时抛错使该轮 gate 非零
  退出（红即 FAIL 信号，不落伪基线——golden-created 只在走完整个 runScenario 后触发，
  gate.mjs:111-117）。
- 就绪后照旧 normalize + 稳定双帧，消化任何残余重绘（如 probe 晚于开面板时
  app.js:2056 的面板重刷已在此前收敛）。
- 双保险复核：VERIFY 阶段人工核对落盘的 s4/s5 invariants.json 中
  `serverWf`/`serverRuns` 恰为 §3.4 字面量（若快照到占位符，此处必不符）。

## 5. golden 新增方案（修宪轮核心 · 重录范围与宪法第 3 条依据）

1. **性质**：本案是**新增** s4/s5 基线，**不是重录** s0~s3（ADR-0009 §5 明载；PRD
   非目标 2）。s0~s3 既有 8 文件在产品提交 diff 中逐字节零变化（AC2）。
2. **宪法第 3 条依据链**：① ADR：`docs/adr/0009-golden-s4-s5-online-panels.md`
   （动机/影响面/像素对比说明齐备；本 ADR 属「新增保护面」，无「前」像素，对比对象
   是保护缺失现状本身——ADR §5.3 原文）；② 用户本人批准：issue #7 评论「批准」
   （liusuren123，2026-10-23T15:48:48Z，无 🤖 前缀，PLAN 会话 gh 亲核，PRD 存证）；
   ③ 同一迭代内落基线：经 **golden-created 通道**（gate.mjs:114-117：基线文件不存在
   时首跑自动落盘并记 `golden-created` 状态）——这是新增场景的合法入口。
3. **`npm run gate:update` 的定位**：**不是本项入口**（ADR §5；REQ-0026-02）。仅当
   门禁失败且原因归本轮自身改动时，按修宪轮授权（WORKFLOW §4 修宪轮条款 + issue #7
   批复在案）应急执行**至多一次**，并在 JOURNAL 记录失败原因与执行依据；s0~s3 出现
   非零 diff 时**禁止**任何重录——那是既有基线漂移信号，立即中止另立 ADR（ADR §4
   风险对策；PRD 非目标 2）。
4. **落盘流程**：`npm run build` → 首次 `npm run gate`（预期 s0~s3 pass diffPx=0、
   s4/s5 `golden-created`）→ 第二次 `npm run gate`（预期 6 场景全 pass、0 diff，
   自一致性）→ 核对新增 4 文件在 `tests/golden/ui/`、s0~s3 8 文件不在 diff 中 →
   随产品提交入库。
5. **权威环境**：golden 以 CI（windows-latest + Playwright Chromium，宪法第 2 条）为
   权威；本机（本仓开发机亦为 Windows）结果供参考。timezoneId:'UTC' + 字面量
   fixture + DOM 就绪等待三重保障下，基线字节在任何环境一致；推送后 CI
   ui-constitution 6 场景绿 = 跨环境一致性的权威证明（AC6）。
6. **CI 影响**：`ci.yml:21-22` 的 `npm run build` + `npm run gate` 零改动自动拾取
   6 场景；`package.json:11-12` gate 脚本零变化；时长增量估 +20~40s（ADR §4）；
   无新 npm 依赖（page.route/timezoneId 为 Playwright 既有能力）。

## 6. 验收口径（VERIFY 逐条执行；命令全文即口径）

**自动门禁**：

1. `npm run build` → 构建成功（gate 前置，AGENTS.md）。
2. `npm run gate`（第一次）→ s0~s3 四行 `pass · diffPx=0`，s4/s5 两行 `golden-created`。
3. `npm run gate`（第二次）→ 六行全 `pass · diffPx=0`（AC1 自一致性）。
4. `npm test` → shared 契约测试 8/8 全绿（AC4；本项不触 shared，预期零影响）。

**手动 E2E 点位**：

5. AC2 基线冻结核对：`git status --porcelain` 全量列出改动文件，逐一对照 §1 白名单；
   `git diff --name-only -- tests/golden/ui/` 仅出现 4 个 s4/s5 新文件（新文件走
   untracked/add 后核对），s0~s3 8 文件不出现。
6. AC3 保护力反演：临时把 s4 fixture 的 `workflows` 置为 `[]` → `npm run gate` →
   s4 行 `FAIL`（像素 diff 与不变量 `serverWf: [] vs 3 项` 双红至少其一；diff 证据
   落 `tests/golden/diff/s4-workflows-online.*`）→ 还原 fixture → `npm run gate`
   → 6 场景复绿。反演属临时改动**不入场**，收尾时工作区回到白名单状态。
7. AC5 授权链核对：`grep -n "已批准" docs/adr/0009-golden-s4-s5-online-panels.md`
   命中状态行，含 `issue#7` 与 `2026-10-23T15:48:48Z`。
8. 基线内容 sanity：s4/s5 invariants.json 的 `serverWf`/`serverRuns` 与 §3.4 字面量
   逐项相等（§4 双保险）；肉眼复核 s4/s5 png：侧栏开、标题正确、3 卡在线态、无
   「加载中…」/「后端未连接」字样。
9. AC6 CI 盯守：推送后 GitHub Actions `ui-constitution`（windows-latest）6 场景绿；
   CI 红则以 CI 为权威排查（本机绿不算数，宪法第 2 条）。

**判定**：1-9 全过 = PASS；任一 FAIL 进修复循环（≤2 轮，WORKFLOW §4）。

## 7. 回滚方案（ADR-0009 §7）

- 首选 `git revert` 本次产品提交（WORKFLOW §6 护栏 6：revert 是唯一回滚手段）——
  提交内容 = §1 白名单六文件，revert 即完整恢复现状（SCENARIOS 回退 2 项 + s4/s5
  基线 4 文件消失 + ADR 状态行回草案）。
- 手工等价回退（仅述理，不作为执行手段）：删 SCENARIOS 两行 + 删 4 基线文件。
- 无数据/契约/产品代码影响，回滚零残留。

## 8. 实现注意事项（给 code-developer）

1. **s0~s3 不变量零漂移是硬约束**：增量键必须走 per-scenario `inv` 合并（§3.1.4），
   不得在公共采集器里无条件加键——gate.mjs:124 是 `JSON.stringify` 全等比对，多一个
   键 s0~s3 立即 FAIL。
2. **路由注册必须在 goto 之前**（§3.1.2）；probe 在 boot 即发（app.js:2414）。
3. `page.route` 的 handler 用 `route.fulfill({ json })`（自动设 content-type）；
   不要用 `contentType` 手拼。
4. 稳定双帧循环（gate.mjs:77-83）与 normalize（44-50）原样复用，勿动。
5. 新增代码集中在 gate.mjs 单文件内（fixture 常量 + ready/inv 函数 + SCENARIOS 两行
   + runScenario 四处增强），不新建文件、不拆模块——控制改动面即控制批准面。
6. 提交信息建议：`feat(gate): golden 场景扩充 s4/s5 在线态面板（ADR-0009 已批准，issue#7）`
   —— 一个提交只做这一件事（AGENTS.md 硬性约定 5）。

## 9. 与 PRD 需求条目对照（可追溯性）

| PRD | SPEC 落点 |
| --- | --- |
| REQ-0026-01 场景实现 | §3 全（含 §0 health 路由补充） |
| REQ-0026-02 golden-created 通道 / gate:update 定位 | §5.2-5.3 |
| REQ-0026-03 既有基线冻结 | §1 零改动清单 + §6.5 |
| REQ-0026-04 ADR 批复标注 | §1 表末行 + §6.7 |
| REQ-0026-05 改动面白名单 | §1（机器核对 §6.5） |
| REQ-0026-06 确定性等待 + 双环境自一致性 | §4 + §5.5 |
| AC1~AC6 | §6.1-6.9 逐条对应 |
