# SPEC · 迭代 0032 · BK-0034 goal 模式会话面板 UI（修宪轮，BK-9002 链终轮）

> 产出角色：协调者手动 SPEC（2026-10-25）。输入：PRD + ADR-0013 §4/§5/§6/§8
> + 本会话只读代码核实（app.js:1580 viewport dblclick 对节点内 return=主体手势
> 空闲；:2353 title dblclick 重命名须排除；:460 动态单例先例；:2237 getReader SSE
> 先例；server-sync.js 131 行 SVR/回调先例；app.css 543 行尾部纯插入位）。

## 1. 范围与护栏

- 修宪轮（issue#2 承继 + ADR-0013）；入口案 B（浮动面板，默认不可见）→ s0~s8
  零波及；唯一 golden 增量 = s9-goal-panel-online（golden-created，禁 gate:update）。
- SSE 恰消费 7 种（run:accepted/node:start/node:delta/node:done/log/run:error/
  run:done，ADR §5.2 语义逐条）；后端零改动预期；Skeleton.tsx 零改动。

## 2. 受影响文件清单（产品提交白名单；`git show --numstat` 核对基准）

| # | 文件 | 动作 | 说明 |
| --- | --- | --- | --- |
| 1 | `apps/web/src/server-sync.js` | 改（纯插入） | +sessions 数据面：fetchSessionList/fetchSessionDetail/createSession/stopSession 四函数 + `SVR.sessions/sessionsErr` 缓存 + `onSessionsArrive` 回调 + `refreshSessions()`（沿 wf/runs 先例，+~40 行） |
| 2 | `apps/web/src/legacy/app.js` | 改（纯插入） | 文件尾新增 goal 面板段：nodesLayer dblclick 监听分支（`.node` 主体且 `defOf(n).type==='agent'` 且目标非 `.ntitle`/input/textarea/.port → openGoalPanel）+ 面板动态创建（fixed 定位单例）+ SSE chat 消费（getReader，恰 7 事件）+ 恢复列表 + 停止控件（+~230 行） |
| 3 | `apps/web/src/app.css` | 改（纯插入） | `#goal-panel` 系新选择器（fixed 浮卡/会话流气泡/输入区/恢复列表/系统行；值取既有变量 --panel2/--border2/--text2/--accent，+~45 行） |
| 4 | `tools/pixel-gate/gate.mjs` | 改（纯插入） | SESSION_ROUTES fixture（GET list + GET :id 两路由 mock，沿 WF_ROUTES 先例）+ GOAL_WF_SEED 常量（复用 AGENT_WF_SEED 同构）+ s9-goal-panel-online 场景行（seed=同 s8 工作流 + steps=派发 agent 节点主体 dblclick 打开面板）（+~20 行） |
| 5 | `tests/golden/ui/s9-goal-panel-online.png` + `.invariants.json` | 新增 | golden-created 通道（禁 gate:update——s0~s8 预期零波及，无重录面） |
| 6 | `docs/adr/0013-agent-node-goal-session-panel.md` | 改 | 状态行回写链终：BK-0034 已消费（迭代 0032）· BK-9002 链闭合（沿 ADR-0009/0010/0012 先例） |

**禁区（零 diff 机器证明面）**：`Skeleton.tsx`、`apps/server/**`（sessions.ts/server.ts
零改动预期）、`packages/shared/**`、`package*.json`、`tests/golden/ui/` 除 #5 外全部、
既有 app.js/app.css/gate.mjs 行为零字节改动（纯插入判定 = diff 仅新增行）。

## 3. 实现设计

### 3.1 server-sync.js（#1）

```js
/* 会话（BK-0034）：列表/详情/新建/停止 —— 仅数据层，面板 DOM 归 app.js */
export const fetchSessionList = (limit = 20) => apiJson('/sessions?limit=' + limit).then(j => Array.isArray(j.sessions) ? j.sessions : []);
export const fetchSessionDetail = id => apiJson('/sessions/' + encodeURIComponent(id));
export const createSessionOnServer = (body) => apiJson('/sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
export const stopSessionOnServer = id => apiJson('/sessions/' + encodeURIComponent(id) + '/stop', { method:'POST' });
```
SVR 增 `sessions:null, sessionsErr:false`；回调 `onSessionsArrive` + `refreshSessions()`
（沿 refreshRuns 同型）。loadRunDetail 不涉。

### 3.2 app.js goal 面板段（#2，追加文件尾）

- **入口**：`nodesLayer.addEventListener('dblclick', …)` 新分支——`closest('.node')`
  且目标非 `closest('.ntitle')/.wdg input/textarea/.port` 且 `defOf(n)?.type==='agent'`
  → `openGoalPanel(n)`。既有 title 重命名分支（:2353 要求 `.ntitle`）与 viewport
  分支（:1580 节点内 return）零触碰。
- **面板 DOM**（动态单例 `#goal-panel`，首次打开挂 body）：头部（标题=节点标题 ·
  「历史会话」切换 · 关闭）、会话流容器（user 右/assistant 左气泡 + .gp-sys 系统行）、
  恢复列表子视图（SVR.sessions 渲染，点击恢复）、输入区（textarea + 发送 + 停止，
  活动 turn 时禁用输入/启用停止）。运行时绑定 `GOAL = { nodeId, sessionId, ac }`
  （内存态，不入 localStorage/undo）。
- **会话绑定**：打开时 GOAL.sessionId 已绑则直接回放（GET detail）；未绑则
  POST create（title=`节点标题`，model/sys=节点参数）→ 绑定。
- **SSE 消费**（sendGoalTurn）：POST `/:id/chat` `{text}` → getReader 解析
  `data: ` 行（:2237 同型）→ 恰 7 事件语义（ADR §5.2 表逐条）：accepted→状态
  「生成中」+输入禁用；node:start→assistant 占位；node:delta→全文覆盖；node:done→
  定稿+脚注+恢复；log→系统行；run:error→错误行+恢复；run:done→ok 收尾 /
  stopped=以末次 delta 固化+「已停止」标。409→「回复进行中」；stop 404→
  「当前无进行中回复」；detail 404→空态。
- **停止**：POST stop（服务端中止）；面板内不自行 AbortController 掐流（服务端
  run:done{stopped} 收尾语义为准，fetch 随流自然结束）。

### 3.3 app.css（#3）

`#goal-panel`（fixed 右下 360×520 卡，--panel2/--border2/14px 圆角，display:none→
`.show` 块）、`.gp-head/.gp-stream/.gp-msg.user/.gp-msg.assistant/.gp-sys/.gp-input/
.gp-list` 新选择器；值全取既有变量（沿 confirm-modal 内联值先例转正式选择器）。

### 3.4 gate.mjs（#4）

SESSION_ROUTES（GET `/api/v1/sessions`→固定 1 条含历史消息的会话摘要；GET
`/api/v1/sessions/sess-fix1`→{session,messages:[user,assistant]}，id/时间戳字面固定）；
s9 场景：`seed`=AGENT_WF_SEED 同款写入 + `steps`=[双击 agent 节点主体（page.evaluate
派发 dblclick 到 `.node[data-id="2"]`，绕开 .ntitle）]；不变量=公共六键。基线落盘走
golden-created。

## 4. 验收口径

1. `npm run build` 绿 → `npm run gate` **10 场景 diffPx=0**（s9 新增；s0~s8 零波及
   实测，意外红即中止）。
2. `npm test` 30/30；`npm run smoke:server` 全绿（G 组零回退；V09 时点性假红按
   先例提交后复跑自愈）；`npm run test:canvas` 15/0。
3. 手动 E2E 五点位（新建→流式→停止→恢复→续聊）：浏览器实跑；本机 .env 无
   provider key → 流式/停止两点位以 smoke G 组 + 代码路径核对佐证、如实标注
   （沿 0031 AC6-④ 口径）。
4. 纯插入判定：三文件 diff 仅新增行（`git diff --numstat` 删除行数=0 为判据；
   ADR 状态行置换除外）。
5. AC7 指针抽样 ≥5。

## 5. 回滚

VERIFY FAIL 达上限 → `git revert <产品提交>`（唯一手段）；s9 基线随提交删除，
s0~s8 不波及无需还原。
