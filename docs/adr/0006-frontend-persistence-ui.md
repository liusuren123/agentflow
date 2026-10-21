# ADR-0006 · 前端接入服务端持久化（UI 变更提案）

- 状态：**提案（待用户本人批准）** · 未实施（2026-10-20）
- 关联：CONSTITUTION.md 第 1 条（UI 不变式）、第 3 条（变更流程）；ADR-0005（后端持久化契约与实施记录）
- 义务声明：本文是宪法第 3 条第 1 步（ADR：动机 / 影响面 / 像素对比证据）的载体。
  ADR-0005 决策第 5 点已明文「本 ADR 不构成许可」——同理，**本文仅为规格提案，
  不构成实施许可；UI 变更批准权仅在用户本人**。用户批复（如「批准 ADR-0006 方案 A」）
  后，本文件状态行改为「已批准」，方可进入实施。

---

## 1. 动机

ADR-0005 已落地服务端持久化（SQLite 三表 + `/api/v1` 读取端点，2026-10-20 实施完毕），
但前端（`apps/web`）至今零改动：

- 工作流仍只存 localStorage（`apps/web/src/legacy/app.js` L167 `LS_KEY='agentflow.v2'`
  单键整存，L1142 `saveLocal`）——换浏览器 / 清缓存即失，无跨设备能力；
- 运行历史同样只在 localStorage（L172 `runs` 数组，上限 50 条，仅
  `{name,time,dur,nodes,ok}` 摘要），**无事件回放**——服务端 `GET /api/v1/runs/:id`
  已能返回完整 SSE 事件序列，前端却无任何消费入口。

后端能力已就绪而前端不可见，等于持久化对用户不存在。本提案是首个走宪法第 3 条
完整流程的 UI 变更：目标是以**最小像素影响**把「服务端工作流」与「运行历史回放」
两个能力接入现有 UI。

## 2. 现状坐标（代码事实，2026-10-20 核对）

| 关注点 | 位置 | 现状 |
| --- | --- | --- |
| rail 图标列 | `apps/web/src/skeleton.html` L11–49 | 5 个 `data-stab` 按钮（history/nodes/workflows/templates/settings）+ 3 个功能按钮（menu/help/bp）；`.rail-btn` 高 40px（`app.css` L74） |
| 侧栏分发 | `app.js` L283–302 | `setRailTab` / `renderSidebar` + `SIDE_TITLES` 五键 |
| 「工作流」面板 | `app.js` L358–371 `renderSideWorkflows` | 「已打开 (n)」分组（`.wf-item[data-i]` 卡片）+「操作」分组（两个 `.ibtn`：新建空白 / 浏览模板） |
| 「任务历史」面板 | `app.js` L386–395 `renderSideHistory` | localStorage `runs` 渲染 `.run-item ok/stop` 卡片；空态 `.side-empty`；尾部 `.ibtn`「清空历史」 |
| 面板事件委托 | `app.js` L396–408 | 单一 `#side-body` click 委托，分支用 `closest()` 属性选择器（`.wf-item[data-i]` / `.wf-item[data-sample]` / `#wf-new` / `#wf-templates` / `#runs-clear`） |
| 引擎状态 | `app.js` L1808 `ENGINE = {online, info, runId, ac}` | `probe()`（L1810）fetch `/api/health`（2.5s 超时）；`file:` 协议直接 offline（L1811） |
| 真实执行 | `app.js` L1835–2028 `runReal` | POST `/api/run` + SSE 解析；`onEvent`（L1895–1987）把 15 种事件映射为画布副作用与 `addLog` 日志行 |
| 日志行样式 | `app.js` L1610–1618 `addLog`；`app.css` L324–330 `.logline` | `.logline {lvl}` + `.t`（时间列）+ `.m`（消息列）；lvl ∈ info/ok/warn/sys/err |
| 离线引擎状态先例 | `app.js` L430–435（设置面板） | `.side-empty` 内嵌引擎连接状态文案（在线绿字 / 离线灰字两分支） |
| golden 场景 | `tools/pixel-gate/gate.mjs` L60–65 | 仅 4 场景：s0 初始 / s1 选节点 / s2 设置侧栏（`settings`）/ s3 节点库侧栏（`nodes`）。**「工作流」与「任务历史」面板不在任何 golden 场景中** |
| gate 环境 | `gate.mjs` L22–41, L70 | 静态托管 `apps/web/dist`（无后端进程）+ 每场景 `localStorage.clear()` → gate 内 `ENGINE.online` 恒为 false |

## 3. 后端契约对齐（消费面，与实现逐一对齐）

ADR-0005 已实施端点（`apps/server/src/server.ts` L140–182，实现核对于 2026-10-20）：

| 端点 | 前端用途（本提案） | 载荷字段（实现实测） |
| --- | --- | --- |
| `GET /api/v1/workflows` | 「服务端」分组列表 | `{workflows:[{id,name,updated_at}]}`（**摘要不含节点/连线数**，`store.ts` L149–156） |
| `PUT /api/v1/workflows` | 「保存当前工作流到服务端」 | body `{id?, name, nodes, edges, inputs?}` → `{id, updated_at}`；`id` 缺省则服务端生成新 id（`server.ts` L152–153「路径 :id 优先，其次 body.id，均缺省则生成新 id」） |
| `PUT /api/v1/workflows/:id` | 卡片「覆盖保存」 | 同上，路径 id 优先 |
| `GET /api/v1/workflows/:id` | 卡片「打开」 | `{id,name,nodes,edges,inputs?,updated_at}`；未知 id → 404（`store.ts` L159–173） |
| `GET /api/v1/runs?limit=20` | 历史面板列表（limit 缺省 20，1–100） | `{runs:[{id,workflow_name,status,started_at,ended_ms,done,total}]}`；status ∈ running\|done\|error\|stopped；started_at 为 Unix 毫秒 |
| `GET /api/v1/runs/:id` | 卡片点击展开的事件回放 | `{run:{…同上行}, events:RunEvent[]}`；未知 id → 404；events 为 SSE 事件原样、seq 升序 |

**对任务简报的一处更正（冲突顺位：代码实现 > 文档）**：这 6 个持久化端点**只注册了
`/api/v1` 命名空间，不存在 `/api` 旧别名**（`server.ts` L176 注释「无旧别名，前端本
阶段不消费」；ADR-0005 实施记录同）。因此前端新代码**必须**调用 `/api/v1/*`，不存在
「走旧别名」的选项。既有 5 端点（health/models/run/stop/approve）的双路径注册不受
影响，`ENGINE.probe` 继续用 `/api/health`。

**能力缺口（如实注明）**：无 `DELETE /api/v1/workflows/:id` 端点 → 本提案的「删除」
操作**本阶段不做**（卡片不渲染删除入口）。后端补 DELETE 属后端变更（宪法第 4 条：
不触发门禁），补齐后删除按钮作为独立 UI 增量另行提案，不在本 ADR 中夹带。

## 4. 方案 A（推荐）· 零基线影响集成

原则：**不新增任何顶栏图标、rail 图标、弹窗与浮层**；云端能力全部集成进**现有**两个
侧栏面板的内容区，且只使用既有组件类（`.side-section-title` / `.wf-item` / `.run-item`
/ `.ibtn` / `.side-empty` / `.logline`），`app.css` 与 `skeleton.html` 零改动。

### 4.1 「工作流」面板（`renderSideWorkflows`）

现状结构（「已打开」分组 +「操作」分组）原样保留，在其后追加「服务端」分组：

```
<div class="side-section-title">已打开 (n)</div>        ← 现状不变（L360）
<div class="wf-item" data-i="…">…</div>                  ← 现状不变
<div class="side-section-title">操作</div>               ← 现状不变（L366）
<div style="…flex…gap:8px">两个 .ibtn</div>             ← 现状不变（L367-370）
<div class="side-section-title">服务端</div>             ← 新增分组标题（既有类）
<div style="padding:2px 12px 16px;display:flex;gap:8px"> ← 沿 L367 既有按钮行布局惯例
  <button class="ibtn" id="wf-cloud-save"
          style="flex:1;justify-content:center">{I(icon)} 保存当前工作流到服务端</button>
</div>
<div class="wf-item" data-wf-id="<id>">                  ← 服务端卡片 × m（既有类）
  <div class="wt">{I(icon)} {esc(name)}</div>
  <div class="wm">更新于 {本地时间} · 点击打开</div>
</div>
<div class="side-empty">…空态/离线态…</div>              ← 既有类
```

交互语义（全部走 L396–408 既有 click 委托，新增三个分支）：

- **保存当前工作流到服务端**（`#wf-cloud-save`）：`PUT /api/v1/workflows`，body 取当前
  激活标签页快照 `{id: tab.wfId（若有）, name: state.name, nodes: state.nodes,
  edges: state.edges, inputs: tab.wfInputs || {}}`；成功后把返回 `{id}` 写回
  `tabs[activeTab].wfId` 并 `saveLocal()`，刷新服务端列表，`toast('已保存到服务端','ok')`。
  `running` 时禁用（toast「运行中无法保存」——与 `switchTab` L211 的运行保护语义一致）。
- **打开**（整卡点击，`closest('.wf-item[data-wf-id]')`，与模板卡 `.wf-item[data-sample]`
  的整卡点击交互完全一致）：`GET /api/v1/workflows/:id` → 校验 `Array.isArray(nodes)`
  （沿 JSON 导入校验 L1594）→ 仿 `addTabFromSample`（L246–260）push 新标签页：nodes
  深拷贝（含 params 展开）、`nextId = max(id)+1`、`fitView()`；`tab.wfId = id`、
  `tab.wfInputs = inputs`。`running` 时禁止（toast「运行中无法切换工作流」）。
  卡片元信息行只显示更新时间——列表契约不含节点/连线数（见第 3 节），**不做逐卡
  详情 N+1 请求去补**。
- **覆盖保存**（卡内单个 `.ibtn`，沿既有卡片内按钮行惯例；按钮 `title` 全文说明语义）：
  `PUT /api/v1/workflows/:id`，body 为**当前激活标签页**内容（与「另存」相对：目标 id
  是所点的服务端条目，内容是当前标签页）。成功后刷新列表并 toast（含目标条目名）。
  已知语义边界（如实注明）：当前标签页可能与该服务端条目无关，覆盖即以当前内容替换
  ——按钮 title 与 toast 结果文案显式表达这一点，不引入确认弹窗（与「清空历史」按钮
  L407 的直接执行交互语言一致）。
- **删除**：本阶段不做（第 3 节能力缺口）。

### 4.2 「任务历史」面板（`renderSideHistory`）

- **数据源**：`ENGINE.online` 为 true 时拉取 `GET /api/v1/runs`（limit 缺省 20）；
  否则以及拉取失败（网络错误 / 非 2xx）时回退本地 `runs` 数组（**本地写入路径完全
  不动**：`runReal` finalize 与模拟执行照旧 `runs.unshift` + `saveLocal`，离线记录
  能力保留）。
- **卡片**：复用 `.run-item` 与字段呈现（`.rn` 名称 / `.rt` 时间 / `.rd` 计数），
  status → 既有类的映射：

  | status | class | 图标（既有 `I()` 集） | `.rd` 文案 |
  | --- | --- | --- | --- |
  | done | `.run-item.ok` | check | `{done}/{total} 节点<br>{(ended_ms/1000).toFixed(1)}s` |
  | stopped | `.run-item.stop` | square | 同上 |
  | error | `.run-item.stop` | square | 同上（`.rt` 追加「失败」字样区分） |
  | running | `.run-item.stop` | square | `.rt` 追加「进行中」 |

  说明：CSS 只有 `.ok`（绿）/`.stop`（琥珀）两态（`app.css` L135–141），error 与
  stopped 共用琥珀视觉、差异落在文本——**不为此新增 CSS 类**。`started_at`（Unix 毫秒）
  格式化为本地时间字符串呈现于 `.rt`（等宽小号，与现有 `.rt` 视觉一致）。
- **点击展开回放**（`closest('.run-item[data-run-id]')` 新分支）：`GET /api/v1/runs/:id`
  → 在该卡片**下方**插入只读时间线容器（同面板内展开，不改画布、不弹窗；再点收起；
  同一面板同时只展开一个）。容器为无类名的 `div` + 内联 `padding` 与既有 CSS 变量
  `var(--border)` 做分隔线（沿代码库大量内联 style 惯例，如 L367/L390/L431），内部
  逐行复用 `.logline` 结构（`<span class="t">` + `<span class="m">`）。
- **「清空历史」按钮**：仅本地数据源渲染（现状分支不动）；服务端数据源下不渲染
  ——服务端无清空端点，如实注明。

### 4.3 回放事件 → `.logline` 行映射

映射逐条对齐 `runReal.onEvent`（L1895–1987）中 `addLog` 的实时语义——回放就是把
实时日志行静态重放，不走任何画布副作用（不调用 `nodeEl`/`setNodeOut`/`classList`
/`measurePorts`）：

| 事件 | 渲染行 | lvl |
| --- | --- | --- |
| `run:accepted` | `run 已受理 · #<runId 前 8 位>` | info |
| `run:start` | `━━ 开始运行「name」 · N 个节点待执行 ━━` | sys |
| `run:progress` | **跳过**（实时亦不落日志） | — |
| `node:start` | `▶ {title} · {defName}` | info |
| `node:bypass` | `⏸ {title} · 已旁路，跳过执行` | warn |
| `node:delta` | **跳过**（实时仅驱动打字机，不落日志） | — |
| `node:done` | `✓ {title} · {out 摘要 44 字截断…}` | ok |
| `node:error` | `✗ {title} · {message}` | warn |
| `cond` | `↳ {title} · {expr} → {branch}` | sys |
| `log` | `{msg}` | `ev.lvl || info` |
| `output` | `◉ 最终输出：{摘要 100 字截断…}` | ok |
| `approval:required` | `⏳ {title} · 等待人工审批` | sys |
| `approval:done` | `👤 审批已{通过/拒绝}` | sys |
| `run:error` | `✗ 引擎错误：{message}` | warn |
| `run:done` | `● 运行完成/停止 · {done}/{total} · {ms}s` | ok / warn |

`.t` 列显示事件序号（`#00` 起，即 `run_events.seq`）：SSE 事件契约
（`packages/shared/src/events.ts` L8–36）**不含时间戳字段**，序号是回放中唯一诚实
的顺序标记，不虚构时间。

### 4.4 数据与状态层（非 UI，不触发门禁，此处仅界定范围）

- `tabs[]` 项新增可选字段 `wfId?: string`、`wfInputs?: object`（`snapshotTab` L199
  透传）；旧 localStorage 数据无此字段 → `undefined` 即纯本地工作流，向后兼容。
- 模块级新增：服务端工作流列表缓存、当前展开的 runId——均为内存态，不入
  localStorage。
- `runReal` finalize 已有的 `if(railTab==='history') renderSidebar()`（L1874）在服务端
  模式下自然触发一次列表重拉，无需新钩子。

### 4.5 离线行为（双击 dist / 后端未启动）

- `ENGINE.online === false` 时：「工作流」面板「服务端」分组主体渲染 `.side-empty`
  提示「后端未连接 · 启动 server 后可保存 / 加载工作流」（沿设置面板 L431–435 的
  引擎状态文案模式，灰字 `var(--text3)`）；**不发起任何网络请求**。
- 「任务历史」面板显示本地 `runs`（现状渲染分支原样）；模拟执行、模板、导入导出等
  其余功能全部不变。`file:` 协议下 `probe` 直接短路 offline（L1811），行为确定。

### 4.6 渲染时序约束（实现规约）

`renderSidebar` 是同步 `innerHTML` 渲染，服务端数据是异步的。规约：面板打开时先同步
渲染本地部分与「服务端」分组占位（`.side-empty`「加载中…」或离线提示），fetch 完成
后**仅更新该分组的容器节点**，不得整面板重绘（避免打断用户正在进行的点击/滚动）。

## 5. 方案 B（不推荐）· 新增独立侧栏入口

rail 新增 `data-stab="cloud"` 图标按钮（`skeleton.html` rail-group 内 +1 个 40px
按钮）+ 专属「云端」面板（`SIDE_TITLES` 加键、`renderSidebar` 加分支、新
`renderSideCloud` 函数）。

- 优点：导航语义清晰，「云端」能力有独立入口。
- 缺点一（违宪成本）：rail 图标列出现在**每一个**页面状态的可见区域 → 4 个 golden
  场景**全部**像素变化 → 必须走宪法第 3 条全流程（ADR + 批准 + 同一 PR 重录 golden
  + 前后对比截图）。
- 缺点二（设计成本）：新面板需从零设计视觉规格（布局 / 间距 / 空态），无法全部复用
  既有类——违反「复用既有视觉语言」的最小变更原则。
- 结论：**不推荐**。方案 A 已能在不触碰任何基线像素的前提下交付同等能力。

## 6. golden 影响矩阵（像素对比证据）

gate 定义（`gate.mjs` L60–65）：4 场景均不点击 `workflows` / `history` 两个 rail
按钮；且 gate 为静态托管无后端（L22–41）+ 每场景 `localStorage.clear()`（L70），
即使误开这两面板也只渲染离线分支（4.5 节，零网络依赖）。

| 场景 | 步骤 | 覆盖区域 | 方案 A | 方案 B |
| --- | --- | --- | --- | --- |
| s0-initial | 初始全景 | 全部（rail/画布/浮卡/工具条/小地图） | **diffPx=0**（rail、CSS、HTML 零改动；两面板内容不在渲染路径） | FAIL（rail 图标列 +1 按钮） |
| s1-select-node | 选 `.node[data-id="3"]` | 全部 + 选中态 | **diffPx=0** | FAIL（同上） |
| s2-settings | 点 rail `settings` | 全部 + 设置侧栏 | **diffPx=0**（`renderSideSettings` 不改） | FAIL（rail 变化即炸，与侧栏内容无关） |
| s3-library | 点 rail `nodes` | 全部 + 节点库侧栏 | **diffPx=0**（`renderSideNodes` 不改） | FAIL（同上） |

DOM 不变量（`gate.mjs` L84–100：view transform / 节点矩形 / `:root` CSS 变量表 /
counts{nodes,edges,widgets,ports,tabs} / bottomClosed）：方案 A 不新增 CSS 变量
（app.css 零改动）、不改变场景流程中的标签页数与画布 DOM → **逐字段不变**。
方案 B 的 rail 变化虽不在 counts 计数内，但像素比对必 FAIL。

**证据形态说明**：本提案阶段的证据是上述覆盖范围推演（基于 gate 场景定义与渲染
路径的代码事实）。实施 PR 须附：方案 A——「工作流」「任务历史」两面板新增内容的
截图（golden 外区域）+ `npm run gate` 完整输出；方案 B——4 场景前后对比截图
（宪法第 3 条第 3 步）。

## 7. 变更面清单（文件 / 函数级）

### 方案 A

| 文件 | 位置 | 变更 |
| --- | --- | --- |
| `apps/web/src/legacy/app.js` | `renderSideWorkflows`（L358–371） | 追加「服务端」分组渲染（同步占位 + 异步填充，见 4.6） |
| 同上 | `renderSideHistory`（L386–395） | 数据源切换（服务端优先 / 本地回退）+ 卡片 `data-run-id` + 展开回放容器 |
| 同上 | `#side-body` click 委托（L396–408） | 新增分支：`.wf-item[data-wf-id]`（打开）、`#wf-cloud-save`、卡内覆盖保存 `.ibtn`、`.run-item[data-run-id]`（展开/收起）。既有 closest 属性选择器互不冲突（`data-wf-id` 卡无 `data-i`/`data-sample`） |
| 同上 | 模块级状态（L167–172 附近） | 新增服务端列表缓存 / 展开 runId / API helper（`/api/v1` 封装）——纯新增 |
| 同上 | `snapshotTab`（L199）与 tab 对象 | 透传可选 `wfId` / `wfInputs` |
| `apps/web/src/app.css` | — | **零改动**（若实现中发现「必须加 CSS 才能做」，视为设计回炉，回到本 ADR 修订） |
| `apps/web/src/skeleton.html` | — | **零改动** |
| `tests/golden/ui/*` | — | **零改动（不重录）** |
| 后端 / shared | — | **零改动**（纯前端消费既有契约） |

### 方案 B（供对比）

`apps/web/src/skeleton.html`（rail +1 按钮）、`app.js`（`SIDE_TITLES` L292 /
`renderSidebar` L293 / 新 `renderSideCloud`）、`app.css`（新面板选择器——新增视觉
规格）、`tests/golden/ui/`（4 × png + 4 × invariants.json 重录，`npm run gate:update`）。

## 8. 回滚方式

两方案均要求**单提交收敛**（构建产物随提交）：

- 方案 A：`git revert <单提交>` 即完全恢复——app.js 单文件变更、无 golden / CSS /
  HTML / 后端残留。回滚后复跑 `npm run gate`，4 场景 diffPx=0 即证明基线无损。
- 方案 B：golden 重录必须与代码变更**同一提交**（宪法第 3 条「同一 PR」的落地），
  revert 时截图基线随代码一并回退，不产生「旧代码 + 新 golden」的错配态。

## 9. 验收标准

### 9.1 自动化（两方案通用）

1. 仓库根 `npm run build:web` 后 `npm run gate`：4 场景全部
   `✓ pass · diffPx=0` 且无 DOM 不变量变化。方案 A 另要求输出中**不出现**
   `golden-created` / `golden-updated`（证明未触碰基线）。
2. `npm test`：既有 5 项契约全过（后端零改动，防意外回归）。

### 9.2 手工验收（方案 A，后端 `npm start` 在线）

正例：

- a. 打开「工作流」面板出现「服务端」分组；点「保存当前工作流到服务端」→ toast ok
  → 列表新增卡片 → **F5 刷新后卡片仍在**（SQLite 持久）。
- b. 点服务端卡片 → 新标签页打开，节点 / 连线数与保存时一致，自动 fitView。
- c. 修改当前标签页 → 卡片「覆盖保存」→ F5 后重新打开，内容为覆盖后版本
  （updated_at 刷新）。
- d. 跑一次真实工作流（含审批节点更佳）→ 「任务历史」出现服务端记录（status 正确
  映射）→ 点卡片展开只读时间线：`run:accepted` 起、`run:done` 止，`node:delta` /
  `run:progress` 不出现 → 再点收起；全程画布节点状态类 / 输出区 / 连线**不被改变**。
- e. 停止后端并 F5：「服务端」分组显示「后端未连接」提示（无网络请求）；
  历史面板显示本地 runs；「运行」回退模拟执行。

反例：

- a. `running` 状态下点服务端卡片 / 覆盖保存 / 云保存 → toast 拦截，不切换不写入。
- b. 双击 `apps/web/dist/index.html`（`file:` 协议）→ 与现状离线行为一致，控制台无报错。
- c. 服务端记录对应的 run 详情 404（库被外部清理）→ 面板内单行提示或 `.side-empty`，
  不弹窗、不白屏。
- d. DevTools 检查两面板新增元素：全部由既有类渲染，document 样式表**无新增规则**。

### 9.3 手工验收（方案 B 追加）

`npm run gate:update` 重录 4 场景 + 4 组前后对比截图附于 PR 描述（宪法第 3 条第 3 步）。

## 10. 决策请求

请用户本人批复。批准语义严格如下：

> **本 ADR 经用户批准后：方案 A 无需重录 golden（零基线影响——`npm run gate`
> 4 场景持续 diffPx=0 即为合规证据）；方案 B 需在同一 PR 重录 golden 并附前后
> 对比截图。**

- 推荐批复：「批准 ADR-0006 方案 A」→ 状态行改为「已批准（方案 A）」，实施按
  第 4 / 7.1 / 9 节执行。
- 仅批准方案 B 时同理，实施须含 golden 重录。
- 未批准 / 部分批准（如「先做历史面板、不做工作流面板」）请在本文件批注范围，
  实施与验收按批注裁剪。
