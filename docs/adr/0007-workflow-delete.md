# ADR-0007 · 工作流删除能力（DELETE 端点 + 前端删除入口）

- 状态：**已批准（2026-10-21 用户批准：完整 / C1 / 两按钮确认①）· 已实施**
- 日期：2026-10-20
- 关联：CONSTITUTION.md 第 1 条（UI 不变式）、第 3 条（变更流程）、第 4 条（适用范围）；
  ADR-0005（SQLite 持久化 / API v1，实施记录明文「无 DELETE 端点故本阶段不做删除」）；
  ADR-0006（前端接入服务端持久化 · 方案 A，实施记录明文「删除本阶段不做（第 3 节能力缺口）」）
- 义务声明：**本文仅为规格提案，不构成实施许可。** 删除入口属 UI 变更（宪法第 3 条），
  批准权仅在用户本人；DELETE 端点属后端变更（宪法第 4 条，不触发门禁），但端点与入口
  互为存在前提，本 ADR 将二者作为**一个审批单元**提出，也可拆分批准（见第 10 节）。
  用户批复（如「批准 ADR-0007」）后，本文件状态行改为「已批准」，方可进入实施。

---

## 1. 动机

- ADR-0006 已实施后，「服务端」分组成为工作流的第二事实源，但只增不改不删：
  保存（upsert）、覆盖保存均可用，**误存 / 试验性保存的条目永久留在服务端列表里**，
  唯一清除手段是手工操作 SQLite 文件——对普通用户不可达。
- 运行历史同样只增不删：`runs` 与 `run_events` 两表持续增长（每次真实运行至少
  15+ 事件行），无任何前端入口可清理；本地历史有「清空历史」按钮，服务端历史
  连这个都没有（ADR-0006 4.2 明文「服务端数据源下不渲染」）。
- ADR-0005 决策表与 ADR-0006 第 3 节均已预留本能力缺口，删除是既定路线上的
  补齐，不是新增方向。

## 2. 现状坐标（代码事实，2026-10-20 核对）

| 关注点 | 位置 | 现状 |
| --- | --- | --- |
| 服务端工作流卡片 | `apps/web/src/legacy/app.js` `paintServerWfGroup`（L388–405） | `.wf-item[data-wf-id]`：标题行 + `更新于 …` 元信息行 + 单按钮行（仅 `data-wf-overwrite` 覆盖保存，`flex:1;height:24px` 内联） |
| 服务端历史卡片 | `app.js` `paintServerRuns`（L492–506） | `.run-item[data-run-id]` 单行 flex：`span.ri`（图标）+ 名称/时间列 + `span.rd`（计数）；整卡点击 = 展开/收起回放（`toggleRunReplay` L518） |
| 面板 click 委托 | `app.js` L529–546 | 卡内按钮须**先于**整卡分支判断（现状 `data-wf-overwrite` 先于 `.wf-item[data-wf-id]`，L537–538） |
| 弹窗组件 | `apps/web/src/app.css` L376–378；`skeleton.html` L125/133/154 | `.modal-mask`（默认 `display:none`，`.show` 才显示）+ 每弹窗独立 `.box`；三个静态弹窗：search / help / approve（审批） |
| 弹窗开合惯例 | `app.js` L1700–1702（help）、L2109/2116（approve）、L2179–2180（ESC 分支） | `classList.add/remove('show')`；点击遮罩空白关闭（mousedown + `e.target===e.currentTarget`）；ESC 逐弹窗关闭 |
| 破坏性操作确认先例 | `app.js` L1527（清空画布用原生 `confirm()`）；L545（清空本地历史**无确认直删**） | 仓库内两种语言并存；本提案按任务要求统一走 `.modal-mask` 弹窗确认 |
| 后端仓储 | `apps/server/src/store.ts` | 语句全部 `db.prepare` 收敛于 `initStore`（L92–116）；无任何 DELETE 语句；`run_events` 无外键，删 run 须手工级联 |
| 后端路由 | `apps/server/src/server.ts` L177–182 | 持久化端点仅注册 `/api/v1`（无旧别名）；404 形状 `{error:'… not found'}`（L125/L146/L165 同型） |
| golden 场景 | `tools/pixel-gate/gate.mjs` L60–65 | 4 场景（s0 初始 / s1 选节点 / s2 settings / s3 nodes）；**「工作流」「任务历史」面板不在任何场景中**；gate 静态托管无后端 + 每场景 `localStorage.clear()` → `ENGINE.online` 恒 false |
| 测试基建 | `package.json`；`packages/shared/test/contract.test.mjs` | `npm test` = shared 5 契约（节点/事件 schema 层），**无服务端端点自动化**；ADR-0005/0006 端点验证均为手工 curl / E2E |

**核对中发现的一处实现事实（如实上报，非本 ADR 范围）**：`#approve-modal .box`
在 `app.css` 中**没有任何样式规则**（只有 `#search-modal .box` L379 与
`#help-modal .box` L394 两个 id 作用域规则），审批弹窗的盒体实际依赖浏览器默认
样式 + 遮罩层呈现。本提案的确认弹窗**不依赖、也不修复**该问题（见 4.3 节设计），
该差异建议另行交 code-developer 评估是否为遗留缺陷。

## 3. 后端提案：DELETE 端点契约（宪法第 4 条，不触发门禁）

### 3.1 `DELETE /api/v1/workflows/:id`

| 项 | 规格 |
| --- | --- |
| 成功（行存在并删除） | `200` → `{"ok":true}`（与 `POST /api/run/:id/stop` 的 `{"ok":true}` 同型，`server.ts` L128） |
| id 不存在 | `404` → `{"error":"workflow not found"}`（与 `workflowGetHandler` L146 逐字同型） |
| 命名空间 | **仅 `/api/v1`**（沿 ADR-0005：持久化端点无旧别名） |
| 请求体 | 无 |

- store 层：`initStore` 语句表新增 `deleteWorkflow: db.prepare('DELETE FROM workflows WHERE id = ?')`；
  导出 `deleteWorkflow(id): boolean`，返回 `S.deleteWorkflow.run(id).changes > 0`
  （better-sqlite3 的 `changes` 即「是否真删了一行」，404 判据来自此处，不额外 SELECT）。
- 无级联：workflows 表无子表，单语句即可。

### 3.2 `DELETE /api/v1/runs/:id`（评估结论：建议顺带做，方案 C）

运行记录删除必须级联清理 `run_events`（无外键约束，须手工）：

```ts
txDeleteRun = db.transaction(runId => {
  S.deleteEvents.run(runId);   // DELETE FROM run_events WHERE run_id = ?
  S.deleteRun.run(runId);      // DELETE FROM runs WHERE id = ?
});
```

| 项 | 规格 |
| --- | --- |
| 成功 | `200` → `{"ok":true}`；`runs` 行与全部 `run_events` 行同一事务删除（原子） |
| id 不存在 | `404` → `{"error":"run not found"}` |
| 活动 run | `409` → `{"error":"run is active"}`（见下） |

**活动 run 守卫（409 而非 DB status 判断）**：判据用 `server.ts` 内存注册表
`runsById` 是否含该 id（L124/L195 同源），**不用** `runs.status === 'running'`。
理由：进程崩溃重启后 DB 会残留 `status='running'` 的僵尸行（无 recorder 在写），
这类行恰恰最需要可删；而真正活动的 run 若被删行，recorder 的后续
`insertEvent` 会持续为已删除的 run 写入孤儿事件行。守卫在前、删除在后，
`runsById[id]` 存在即 409，消息文案由前端转译为人话（见 4.2）。

### 3.3 「清空历史」在服务端模式下的语义（两个子选项，需用户点选）

现状：`#runs-clear` 仅在本地数据源渲染（`localRunsHtml` L479；服务端分支
L483 注释「无清空端点」不渲染）。若批准 runs 删除，给出两档：

- **C1（最小）**：只做单卡 `DELETE /api/v1/runs/:id`；服务端模式下**仍不渲染**
  「清空历史」按钮（清空 = 用户逐卡删，或暂不提供）。变更面最小，无批量端点。
- **C2（完整）**：另增批量端点 `DELETE /api/v1/runs`（无参数）→ 删除**全部非活动**
  run 及其事件（事务内逐 `txDeleteRun`，跳过 `runsById` 中的活动 id），
  返回 `200` → `{"ok":true,"deleted":<n>}`；前端「清空历史」按钮在服务端模式下
  也渲染，点击走**同一确认弹窗**（文案列出将删除的记录数），成功后 `refreshRuns()`。
  不采用「前端循环调单删」实现（N 次请求 + 部分失败态不可交代）。

推荐 **C1**（本 ADR 主体按 C1 撰写；C2 批准则按上述增量叠加，不另开 ADR）。

### 3.4 设计取舍

- **404（不存在）而非 204 幂等**：与既有 GET `:id` / stop / approve 的 404 语义
  一致；幂等 DELETE（永远 204）被否——它会掩盖「删错 id / 已被别人删」的信息。
- **200 + `{"ok":true}` 而非 204 空体**：与 stop/approve 应答形状同型，前端
  `apiJson` 统一按 JSON 解析（`server-sync.js` L16–20），无需为 204 开特例。
- 删除 workflows 不校验「是否有 tab 正打开它」：服务端无法知道前端 tab 状态，
  该一致性由前端删除成功回调处理（4.4 节）。
- 端点验证沿用 ADR-0005/0006 实践：**手工 curl + E2E 清单**（第 8 节），不新增
  自动化框架（服务端至今无测试基建，不在本 ADR 夹带）。

## 4. 前端提案（UI 变更核心）：删除入口与确认弹窗

原则与 ADR-0006 方案 A 完全一致：**全部复用既有组件类，零新增 CSS，
`skeleton.html` 零改动，golden 零重录**。新增视觉全部由既有类 + 内联 style 承载
（沿 L400 / L509 / L545 等大量内联惯例）。

### 4.1 工作流卡片：删除按钮

`paintServerWfGroup` 卡片按钮行（现状单按钮）改为两按钮，同组同高：

```html
<div style="display:flex;gap:6px;margin-top:8px">
  <button class="ibtn" data-wf-overwrite="<id>" style="flex:1;justify-content:center;height:24px"
          title="…（现状不变）">… 覆盖保存</button>
  <button class="ibtn" data-wf-del="<id>" style="justify-content:center;height:24px;padding:0 9px;
          border-color:#7a3d3d;color:#c66" title="从服务端删除此工作流（不可恢复，需确认）">
    {I('trash')} 删除</button>
</div>
```

- `I('trash')` 为既有图标（ctxmenu「清空当前画布」L1527 同款）。
- 危险色只用内联 `border-color:#7a3d3d`（`#approve-reject` 既有内联值，
  `skeleton.html` L159 逐字复用）+ 文本 `#c66`；**不新增 CSS 类**。
- 点击语义：弹确认弹窗（4.3）→ 确认后 `DELETE /api/v1/workflows/:id`。
- 不设 `running` 拦截：删除不触碰画布与执行状态（引擎用的是提交时的内存快照），
  与「保存类操作运行中禁写」（`cloudSaveCurrent` L408）语义不同，如实区分。

### 4.2 历史卡片：删除按钮（仅批准方案 C 时）

`paintServerRuns` 卡片行尾（`span.rd` 之后）追加图标按钮：

```html
<button class="ibtn" data-run-del="<id>" style="flex:none;height:24px;padding:0 7px"
        title="删除此运行记录（不可恢复，需确认）">{I('trash')}</button>
```

- `flex:none` 保证 `.rn` 的 `flex:1` 弹性列不被挤压（`.run-item` L135 行布局）。
- click 委托顺序：`[data-run-del]` **先于** `.run-item[data-run-id]`（整卡 = 展开
  回放），与 `data-wf-overwrite` 先于 `data-wf-id`（L537–538）同一防误触模式。
- 409（活动 run）→ toast「运行中的记录不可删除，等运行结束后再试」（warn）。

### 4.3 确认弹窗（禁止无确认直删）

**动态创建**一个 `class="modal-mask"` 的容器（JS `createElement` + 一次性挂载到
`document.body`，初始无 `show` 即 `display:none`——复用 `.modal-mask` 既有开关
语义，与三个静态弹窗同一呈现语言）：

```html
<div class="modal-mask" id="confirm-modal">
  <div class="box" style="margin-top:10vh;width:380px;background:var(--panel2);
       border:1px solid var(--border2);border-radius:14px;
       box-shadow:0 24px 80px rgba(0,0,0,.6);padding:22px 26px">
    <h2 style="font-size:15px;margin-bottom:12px">删除确认</h2>
    <div id="confirm-text" style="font-size:12px;color:var(--text2);line-height:1.7"></div>
    <div class="close-row" style="text-align:right;margin-top:16px">
      <button class="ibtn" id="confirm-cancel">取消</button>
      <button class="ibtn" id="confirm-ok" style="border-color:#7a3d3d;color:#c66">删除</button>
    </div>
  </div>
</div>
```

- `.box` 内联样式的每个值都取自 `#help-modal .box`（L394–395）/ `#help-modal h2`
  （L396）/ `#help-modal .close-row`（L402）/ `#approve-reject`（L159）的既有
  声明——**零新增 CSS，skeleton.html 零改动**（比静态加弹窗更保守；且不依赖
  2 节末发现的 `#approve-modal .box` 无规则问题）。
- 交互语言与既有弹窗逐条对齐：ESC 关闭（keydown 分支 L2179–2180 追加一条）、
  点击遮罩空白关闭（mousedown + `e.target===e.currentTarget`，L1702 同型）、
  「取消」/「删除」双按钮右对齐（approve 弹窗同型）。
- `confirmDialog({title, html, okText}) → Promise<boolean>` 单一助手函数，
  两处入口共用；**打开期间禁止重复开第二个**（复用单例，重开仅改文案）。

### 4.4 删除成功后的状态清理（数据层，不触发门禁）

- **工作流**：`refreshWorkflows()` 刷新列表 + toast「已删除『{name}』」（ok）；
  **防复活清理**——`tabs` 中凡 `wfId === 被删 id` 的标签页置 `t.wfId = undefined`
  并 `saveLocal()`。理由：不清理的话，该 tab 下次点「保存当前工作流到服务端」
  会带旧 `wfId` upsert，**以同一 id 复活刚删的工作流**（`cloudSaveCurrent`
  L412 的既定行为），与用户预期相悖。清理后行为 = 保存生成新 id 的新条目。
  被删条目对应的**已打开标签页内容不动**（本地内容与服务端条目是两份事实）。
- **运行记录**：`SVR.runEvents.delete(id)`（回放缓存）；若 `SVR.openRunId === id`
  则置 null（收起展开态）；`refreshRuns()` + toast（含工作流名）。
- `server-sync.js` 新增 `deleteWorkflowFromServer(id)` / `deleteRunFromServer(id)`
  （`apiJson(path, {method:'DELETE'})`，8s 超时、非 2xx 抛错沿用 L16–20 封装）。

### 4.5 离线行为（双击 dist / 后端未启动）

删除按钮只存在于服务端卡片 / 服务端 runs 列表内，而这两者只在 `ENGINE.online`
为 true 时渲染（`renderSideWorkflows` L375 分支 / `renderSideHistory` L482 分支）
——**离线天然无删除入口，无需额外判断**。确认弹窗亦不可能被触发。`file:` 协议
下 `probe` 直接 offline（L1811），行为确定。

## 5. golden 影响矩阵（像素对比证据）

gate 事实（`gate.mjs` L22–41 / L60–70）：静态托管无后端 → `ENGINE.online` 恒
false；4 场景均不点击 `workflows` / `history` rail 按钮；每场景 `localStorage.clear()`。

| 场景 | 步骤 | 覆盖区域 | 本提案 |
| --- | --- | --- | --- |
| s0-initial | 初始全景 | 全部（rail/画布/浮卡/工具条/小地图） | **diffPx=0**：rail/CSS/HTML 零改动；确认弹窗动态创建且无 `show`（`display:none` 不占像素） |
| s1-select-node | 选 `.node[data-id="3"]` | 全部 + 选中态 | **diffPx=0**（同上） |
| s2-settings | 点 rail `settings` | 全部 + 设置侧栏 | **diffPx=0**（`renderSideSettings` 不改） |
| s3-library | 点 rail `nodes` | 全部 + 节点库侧栏 | **diffPx=0**（`renderSideNodes` 不改） |

- DOM 不变量（L84–100）：不新增 CSS 变量（app.css 零改动）、不动场景流程中的
  画布与标签页 DOM、counts 不含侧栏条目 → **逐字段不变**。
- **如实注明**：卡片按钮行从单按钮变双按钮、历史卡片行尾多一个图标按钮，这些
  **既有布局内的变化**只在用户打开「工作流」/「任务历史」面板且后端在线时可见
  ——该区域不在任何 golden 场景中，故预期 diffPx=0、**不重录 golden**；实施 PR
  须附两面板在线态的截图（golden 外区域，沿 ADR-0006 第 6 节证据形态）。
- 若实施中 gate 意外 FAIL：说明渲染路径被意外触碰，属实现错误，回到本 ADR
  修订，**不得**以 `gate:update` 掩盖。

## 6. 变更面清单（文件 / 函数级）

| 文件 | 位置 | 变更 |
| --- | --- | --- |
| `apps/server/src/store.ts` | `initStore` 语句表（L92–116） | +`deleteWorkflow` / `deleteRun` / `deleteEvents` 三条 prepare 语句 + `txDeleteRun` 事务 |
| 同上 | 工作流区（L149 后） | +`deleteWorkflow(id): boolean` 导出 |
| 同上 | 运行历史区（L215 后） | +`deleteRun(id): boolean` 导出（事务级联删 events） |
| `apps/server/src/server.ts` | handler 区（L154 后 / L166 后） | +`workflowDeleteHandler`（404 同型）、+`runDeleteHandler`（含 `runsById` 活动 409 守卫）、（仅 C2）+`runsClearHandler` |
| 同上 | 路由注册（L177–182） | +`app.delete('/api/v1/workflows/:id', …)`、+`app.delete('/api/v1/runs/:id', …)`、（仅 C2）+`app.delete('/api/v1/runs', …)`（注册顺序：批量先于 `:id`） |
| `apps/web/src/server-sync.js` | API 区（L26 后） | +`deleteWorkflowFromServer(id)` / `deleteRunFromServer(id)` |
| `apps/web/src/legacy/app.js` | `paintServerWfGroup`（L395–403） | 按钮行 + `data-wf-del` 删除按钮（4.1） |
| 同上 | `paintServerRuns`（L497–505） | （仅 C）行尾 + `data-run-del` 按钮（4.2） |
| 同上 | click 委托（L529–546） | +两分支：`[data-wf-del]` 插在 `[data-wf-overwrite]` 之前、`[data-run-del]` 插在 `.run-item[data-run-id]` 之前（仅 C） |
| 同上 | 弹窗区（L1700 附近） | +`confirmDialog()` 助手（动态单例弹窗，4.3）+ 三处关闭监听（取消/确认/遮罩/ESC） |
| 同上 | keydown ESC 分支（L2179–2180） | +`#confirm-modal` 关闭分支 |
| 同上 | （仅 C2）`renderSideHistory` 服务端分支（L482–488） | 尾部渲染「清空历史」按钮（`#sv-runs-clear`，复用 `.ibtn` + L479 内联样式）→ 批量 DELETE + 确认弹窗 |
| `apps/web/src/app.css` | — | **零改动** |
| `apps/web/src/skeleton.html` | — | **零改动** |
| `tests/golden/ui/*` | — | **零改动（不重录）** |

## 7. 回滚方式

- **单提交收敛**（前后端 + 构建产物同一提交），`git revert <单提交>` 即完全恢复
  代码态；回滚后复跑 `npm run gate`（4 场景 diffPx=0）+ `npm test`（5/5）证明
  基线无损。
- **如实注明**：revert 只回滚代码，**不恢复已删除的数据行**——`workflows` /
  `runs` / `run_events` 中被删的行在 DB 文件里不可自动找回（备份 = 复制
  `data/agentflow.db`，ADR-0005 语义）。这是删除能力的固有属性，不是回滚缺陷。

## 8. 验收标准

### 8.1 自动化

1. 仓库根 `npm run build` 后 `npm run gate`：4 场景全部 `pass · diffPx=0`，
   无 DOM 不变量变化，输出**不含** `golden-created` / `golden-updated`。
2. `npm test`：既有 5 契约全过（后端改动不碰 shared）。

### 8.2 后端手工验收（`npm start` 后 curl）

正例：

- a. `PUT /api/v1/workflows` 存一条 → `DELETE /api/v1/workflows/:id` → `200 {"ok":true}`
  → `GET /api/v1/workflows` 列表不再含该 id；`GET /api/v1/workflows/:id` → 404。
- b.（仅 C）`GET /api/v1/runs/:id` 有事件回放 → `DELETE /api/v1/runs/:id` → 200
  → `GET /api/v1/runs/:id` → 404，且 DB 中 `run_events` 该 run_id 行数为 0
  （级联删除验证）。

反例：

- c. `DELETE /api/v1/workflows/not-exist` → `404 {"error":"workflow not found"}`。
- d. 运行中（SSE 未结束）`DELETE /api/v1/runs/<activeId>` → `409 {"error":"run is active"}`；
  运行结束后同请求 → 200。
- e. 旧别名探测：`DELETE /api/workflows/:id` → 404（Express 无该路由；证明 v1-only）。

### 8.3 前端手工验收（浏览器，后端在线）

正例：

- a. 「工作流」面板服务端卡片出现「删除」按钮（与「覆盖保存」同组同高）→ 点击
  → 弹确认弹窗（.modal-mask 遮罩 + 居中盒体）→ 点「删除」→ 卡片消失 + toast ok
  → **F5 后卡片不再出现**（SQLite 侧真删）。
- b. 删除一个曾被「打开」的工作流 → 其对应标签页内容仍在、可继续编辑；该标签页
  再点「保存当前工作流到服务端」→ 列表出现**新 id** 条目（防复活清理生效，
  `GET /api/v1/workflows` 交叉验证）。
- c.（仅 C）历史面板卡片行尾删除按钮 → 确认 → 卡片消失 → F5 不再出现；若删除的
  是当前展开回放的卡片，展开态同时收起。
- d. 确认弹窗按 ESC / 点击遮罩空白 / 点「取消」→ 弹窗关闭，**DevTools Network
  面板无 DELETE 请求发出**（确认机制真实拦截）。

反例：

- e. 双击 `apps/web/dist/index.html`（`file:` 协议）→ 两面板均无删除入口、
  无确认弹窗，控制台零报错。
- f. 删除请求期间停掉后端 → toast「删除失败（后端未连接？）」（warn），列表
  经 `refreshWorkflows()` 重拉后如实呈现（条目仍在）。
- g.（仅 C）对运行中的历史卡片点删除 → 409 → toast「运行中的记录不可删除…」，
  卡片保留。
- h. DevTools 检查新增元素：全部由既有类 + 内联样式渲染，document 样式表
  **无新增规则**；`skeleton.html` 无 diff。

## 9. 边界与如实声明（需用户知悉的选项点）

1. **删除不可恢复、无回收站**。本提案默认接受（本地工作流的事实源仍是
   localStorage + 标签页，服务端删除只影响服务端副本；数据另有 DB 文件备份途径）。
2. **确认强度二选一**（请用户点选，默认 ①）：
   - ① 两按钮确认弹窗（本提案正文规格）——与审批弹窗同级交互成本；
   - ② 强确认：弹窗内要求**手动输入工作流名称**后才点亮「删除」（GitHub 删库
     同型）。仅工作流删除适用（运行记录价值低，不值此成本）。实现仍可零新增
     CSS：input 用内联样式（`background:var(--panel3);border:1px solid
     var(--border2);border-radius:6px;padding:6px 10px;color:var(--text);
     font-size:12px;outline:none;width:100%`，全部既有 token 值）+ JS 比对
     输入 === 名称。防误删最强，但日常摩擦显著升高。
   - 软删除（deleted_at 标记 + 回收站 UI）被否：schema 变更 + 二期 UI，
     远超「补齐删除缺口」的动机。
3. 服务端删除**不做**「该工作流是否正被某活动 run 引用」校验：run 引用的是提交
   时刻的快照（内存），删服务端条目不影响进行中的执行——这是语义特性而非疏漏。
4. `#approve-modal .box` 无 CSS 规则的既有事实（第 2 节末）不在本 ADR 修复范围；
   若后续认定是缺陷，修复属独立 UI 变更，另走宪法第 3 条。

## 10. 决策请求

请用户本人批复。批准语义严格如下：

> **本 ADR 经用户批准后：预期零基线影响（`npm run gate` 4 场景持续 diffPx=0
> 即为合规证据），无需重录 golden；实施按第 6 节变更面 + 第 8 节验收执行。**

- 批复格式建议：「批准 ADR-0007 · C1 · 确认①」（或 C2 / 确认②）。
- 可拆分批准：仅后端端点（无 UI 入口，纯能力预埋）/ 仅工作流删除（不做 runs）。
- 未批准 / 部分批准请在本文批注范围，实施与验收按批注裁剪。
- **本文状态行为「提案」期间，任何提交不得包含第 6 节所列变更。**

---

## 11. 实施记录（2026-10-21）

**批复形态**：用户批准「完整 / C1 / 确认①」——workflows + runs 单卡删除均实施；
「清空历史」按钮按 C1 不上线（服务端模式下仍不渲染）；确认强度取两按钮弹窗。

按第 6 节变更面实施（全部落点与预案一致）：

| 文件 | 实际变更 |
| --- | --- |
| `apps/server/src/store.ts` | 语句表 +`deleteWorkflow`/`deleteRun`/`deleteEvents` 三条 prepare；+`txDeleteRun` 事务（先删 run_events 再删 runs 行，返回 changes>0 判存在）；导出 `deleteWorkflow(id): boolean` 与 `deleteRun(id): boolean` |
| `apps/server/src/server.ts` | +`workflowDeleteHandler`（404 同 `workflowGetHandler` 型）、+`runDeleteHandler`（`runsById` 活动 409 守卫在前、删除在后）；注册 `DELETE /api/v1/workflows/:id` 与 `DELETE /api/v1/runs/:id`（仅 v1） |
| `apps/web/src/server-sync.js` | +`deleteWorkflowFromServer(id)` / `deleteRunFromServer(id)`（`apiJson` DELETE 封装） |
| `apps/web/src/legacy/app.js` | `paintServerWfGroup` 按钮行 +`data-wf-del` 删除按钮；`paintServerRuns` 行尾 +`data-run-del` 图标按钮（`flex:none`）；click 委托 `[data-wf-del]` 先于 `[data-wf-overwrite]`、`[data-run-del]` 先于整卡回放；+`confirmDialog` 动态单例确认弹窗（盒体内联值取自 #help-modal .box/h2/.close-row 与 #approve-reject，零新增 CSS）；+`cloudDeleteWorkflow`（含防复活清理 + `saveLocal()`）与 `deleteRunCard`（回放缓存清理 + 展开态收起 + 409 文案转译）；keydown ESC 分支 +`#confirm-modal` 关闭 |
| `apps/web/src/app.css` | 本 ADR 范围内零改动（第 2 节末发现的 `#approve-modal .box` 缺失另行以 **ADR-0008** 修复） |
| `apps/web/src/skeleton.html`（现为 Skeleton.tsx） | 零改动 |
| `tests/golden/ui/*` | 零改动（不重录） |

**验收结论**（详见实施 PR 汇报）：`npm run gate` 4 场景 diffPx=0（两次复跑）、
`npm test` 5/5、curl 正反例（200/404/409/级联删 events）与 Playwright E2E
（取消路径零 DELETE、删除路径 200 + F5 不复活 + 列表总数 -1、活动 run 409、
离线 file: 无入口零报错）全部通过。

**与批准规格的唯一偏差说明**：工作流删除**不设 running 拦截**（按第 4.1 节原文
「不设 running 拦截……如实区分」实施——保存类操作运行中禁写，删除不触碰画布与
执行状态，语义本就不同；实施时收到的任务简报中有「running 拦截与其它云端操作
一致」一句，与本文 4.1 节冲突，按本文（用户批准的规格权威）执行）。
