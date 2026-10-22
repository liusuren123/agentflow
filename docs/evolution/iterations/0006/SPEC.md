# SPEC · 迭代 0006 · BK-0004 portCache 失效场景回归测试（技术规格）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 17:14
> 输入：本目录 PRD.md（REQ-0004-01~06、AC1~AC7）+ 代码只读核实与实测（本会话）。
> 本文所有代码行号均于 2026-10-22 本会话只读核实（app.js 全量分段阅读 / app.css /
> Skeleton.tsx / nodes.ts / gate.mjs / smoke 两文件 / 根 package.json / ci.yml）。
> 冲突顺位遵守 spec-designer 职责约定：CONSTITUTION.md > 代码实现 > 其他文档。
> 架构决策：**无需 ADR**（needsAdr=false）。理由：本项零产品代码改动、零 UI 三层触碰、
> 零依赖新增、零 CI 配置变更（PRD「触 UI 分类结论：否」§逐层论证成立，本会话独立复核
> 无新发现）；测试基建的文件布局与脚本命名属 SPEC 级决策（见 §1 D1/D2），无架构选型。

## 0. 事实基线（本 SPEC 会话实测/实读，全部可复现）

| # | 事实 | 核实方式（本会话） |
| --- | --- | --- |
| F1 | `portCache`（Map，`app.js:185`）缓存各端口**相对节点原点**的世界坐标偏移；`measurePorts()` 清缓存后经 `getBoundingClientRect` 重测并 `/view.scale` 折算（`app.js:792-804`）；`portCenter()` = `n.x/n.y + 缓存偏移`，**缓存缺失时回退猜测值 `{x:n.x+150, y:n.y+20}`**（`app.js:805-809`）；连线 `d` 全部由 portCenter 派生（`edgeD` `app.js:825`；`renderEdges` `app.js:845-854`；`updateEdgesOf` `app.js:856-868`） | 读 app.js 对应段 |
| F2 | `d` 属性格式恒为 `M x1 y1 C cx1 cy1, cx2 cy2, x2 y2`（`bezier` 模板字符串 `app.js:810-813` 直写，无浏览器重序列化）；起点 = 前两个数，终点 = 末两个数；`#edges` 是 `<svg>`（`Skeleton.tsx:73`），其 `getScreenCTM()` 给出世界系→屏幕系的精确仿射映射（含 `#world` transform `translate+scale`，`app.js:687`） | 读源码确认模板与 SVG 结构 |
| F3 | **布局级高度变化源**（真正移动端口的，CSS 实据）：①`.node-progress` 默认 `display:none`，`st-running` 时 `display:block`，`height:3px;margin-top:-1px` → 净 **+2px 布局位移**，节点头之下全部端口下移（`app.css:217-218`）；②`.node.collapsed .node-widgets{display:none}` → out 端口上移整个 widget 块（≈100px，`app.css:223`）；③`.wdg-raw textarea{resize:vertical;min-height:46px}`（`app.css:237-238`）手工改高 → out 端口下移；④`.node-out` 在 `st-done` 才 `display:block` 且位于 out 端口**之下**（`app.css:259-261` + `makeNodeEl` 结构 `app.js:766-774`）→ 其填充**不移动端口**；⑤`anim-in` 动画仅 `opacity`（`app.css:483-484`），不改几何 | grep+读 app.css 对应行；makeNodeEl 结构逐行读 |
| F4 | **陷阱配对调用点与失效模式**（回归锁定面）：`runSingleNode` 开始（st-running +2px 后测，`app.js:1202`）与结束（st-running 移除 −2px 后测，`app.js:1214`）；`rerenderNode`（`app.js:1078`，折叠钮 `app.js:1663` 走此路径）；textarea mouseup（`app.js:1666-1670`）；拖拽移动中只 `updateEdgesOf`（`app.js:1473`，**不重测**——纯平移下相对偏移不变，位移改的是 `n.x/n.y`），松手 `measurePorts`（`app.js:1508`）；`addNode` 同步 `measurePorts`（`app.js:1272`）+ 220ms 后重测（`app.js:1271`）。丢掉任一**端口移动类**配对 → 连线端点偏差 = 对应布局位移量，无任何报错 | 读 app.js 对应段并逐条推演失效模式（见 §4.2 锁定表） |
| F5 | UI 触发路径全部可事件构造（无 Playwright actionability 依赖）：选中节点 = 节点上 `mousedown` + body `mouseup`（gate 先例 `gate.mjs:54-58`）；单节点执行 = 选中后 `#ntb-exec` 原生 click（`app.js:1642` → `runSingleNode`，固定时长无随机数：`RUN_META` `app.js:1859-1876`）；折叠 = `.ncollapse` 原生 click（`app.js:1659-1664`）；拖拽 = `.ntitle` 上 `mousedown` + window `mousemove`×N + window `mouseup`（`app.js:1395-1509`，`.ntitle` 不在排除选择器 `input,select,textarea,button,.ncollapse` 内，`app.js:1419`）；新增节点+自动连线 = 端口 `mousedown` → window `mousemove` → 空白处 `mouseup` 弹搜索框（`app.js:1536-1537` 带 `pendingLinkCtx`）→ 点击 `.s-item[data-type]` → `confirmSearch` 内 `addNode`+`addEdge`（`app.js:1707-1731`） | 读对应事件监听段 |
| F6 | 种子通道：`loadLocal()` 读 `localStorage['agentflow.v2']` 的 `{tabs:[{name,nodes,edges,nextId,view}],activeTab,runs,settings}`（`app.js:1374-1388`），启动时应用（`app.js:2400-2413`）；`settings` 经 `Object.assign` 合并（`app.js:1382`），**`autosave:false` 可完全关闭回写**（`saveLocal` 守卫 `app.js:1365-1366`，根除 gate 式 clear+reload 与 350ms 防抖回写的竞态）；`view` 种子 `{x:60,y:40,scale:1}` 直接生效 | 读持久化段 |
| F7 | 离线确定性：静态服务无后端 → `ENGINE.probe` 对 `/api/health` 得 404 → `ENGINE.online=false`（`app.js:2038-2053`），一切执行走 `runSimulated`/`runSingleNode` 纯客户端路径；`runSingleNode` 时长 = `RUN_META.dur / settings.speed`（固定值，`app.js:1203-1204`）；typeOk = `a===b \|\| a==='any' \|\| b==='any'`（`app.js:43`）：userinput.out(text)→llm.in(text) ✓、text→reply.in(any) ✓ | 读 ENGINE/probe 与 RUN_META 段 |
| F8 | 构建产物形态：`apps/web/dist/` 是**单文件 `index.html`**（337KB，资源全部内联，本会话 ls+head 实查）→ 静态服务只需托管一个文件；Playwright ^1.50.0 已在根 devDependencies（`package.json:25`）；`tests/` 现仅 golden/ + smoke/ 两目录；同类参照行数：gate.mjs 147 行、smoke 245/342 行（wc -l 实查） | ls/head/wc -l |
| F9 | `.node.selected` 仅 `border-color`+`box-shadow`+`outline`（`app.js` 选中态，CSS `app.css:196-197`），均不占布局 → 选中不改端口几何（golden s1 场景像素级证明同源）；端口元素选择器可用 `.node[data-id] .port.in/out[data-p]`（`makeNodeEl` `app.js:764-765`） | 读 CSS 与 makeNodeEl |
| F10 | 基线现状：工作区 `docs/evolution` 外干净（git status 快照）；`npm test` 口径 8 项（STATE.md:13）；CI 仅 build+gate 与 npm test，smoke 与新脚本均不接入（ci.yml 本会话 grep 无 smoke 引用，护栏 3 禁改 CI） | git status / PRD 背景 7 转引并复核 ci.yml |

## 1. 方案总览（6 项决策）

| 决策 | 内容 | 理由 / 被否候选 |
| --- | --- | --- |
| D1 | 文件布局：`tests/canvas/` 新目录两文件——`lib.mjs`（基建：前置校验/静态服务/端口/Checker/种子/浏览器引导，约 150 行）+ `geometry.mjs`（入口：5 场景与汇总，约 230 行）；根 `package.json` scripts 新增一行 `"test:canvas": "node tests/canvas/geometry.mjs"` | tests/ 第三个测试家族（PRD 目标 2）；一基建一场景与 smoke 两文件同构（F8）；两文件均远低于 400 行上限。被否：单文件——预计 380 行贴上限且基建/场景耦合；被否：`tests/canvas/` 每场景一文件——5 个 <60 行碎文件，违反「优先砍实现冗余不砍场景」的规模纪律（PRD 非功能 4） |
| D2 | 脚本命名 `test:canvas`（PRD 候选二选一） | 与 `smoke:server` 同构（动词:对象）；`regression:canvas` 被否——`test` 前缀更短且语义覆盖（它就是测试） |
| D3 | 端点贴合断言实现：**读 `vis` path 的 `d` 属性**（正则 `-?[\d.]+` 提取 8 数，首二=起点、末二=终点，F2）→ `document.getElementById('edges').getScreenCTM()` + `createSVGPoint().matrixTransform()` 把世界系端点**交给浏览器自身**换算屏幕坐标 → 与两端 `.port` 元素 `getBoundingClientRect()` 中心比欧氏距离 | 不手工复算 `#world` transform 矩阵（被否：自算 matrix 需处理 transform-origin/嵌套，getScreenCTM 就是浏览器画这条 path 用的同一个矩阵，零假设零重复）；不截图比对（那是 gate 的像素领域，PRD 非目标） |
| D4 | 容差 **TOL=1.0px**（两端各自断言） | 论证（REQ-0004-01）：贴合链路两端同帧读同一布局——port rect（小数）→ 偏移 ÷scale → `+n.x/n.y` → `d` 全精度浮点直写 → CTM 精确仿射，**全程无舍入点**，理论偏差 ~1e-9px；1px 覆盖浏览器内部变换舍入的余量。已知最小真实失效 = C1 的 2px（F3①，纯 CSS 定值，无字体参与）→ 1px 容差下确定红。放宽规则：仅当 CI 出现**系统性**（每场景同向）偏差且写明机器实测证据时放宽至 ≤2px（PRD 风险 2），禁止为单场景凑绿放宽 |
| D5 | 场景集 **5 个**（PRD 下限 4 + 建议⑤，REQ-0004-02）：C1 单节点执行（输出填充+进度条位移）/ C2 折叠+展开 / C3 textarea 手工改高 mouseup / C4 拖拽位移 ≥50px / C5 连线拖拽释放空白→搜索弹窗新建节点自动连线。每场景**独立新开页+重新播种**（gate 场景隔离同款） | 三族全覆盖（高度族 C1/C2/C3、位移族 C4、动画/新增族 C5）；C5 把「新增节点+自动连线」做成真实 UI 复合路径（PRD 背景 6），并锁死 portCache **回退猜测值**失效模式（F1，视觉上最刺眼的脱节）。被否：C5 改走双击空白开搜索框——少覆盖 pendingLinkCtx/addEdge 路径 |
| D6 | 运行形态：独立 node 脚本（非 node:test），console 逐场景命名输出 + 末尾 `X passed / Y failed` 汇总 + 退出码 0/1；前置校验失败 = 含「先 `npm run build:web`」指引的报错 + 退出码 1（**绝不静默跳过**，AC3） | gate/smoke 同款形态；不进 `npm test` 链（Playwright 浏览器型，与 smoke:server 同定位为本地/VERIFY 工具，F10）；被否：接入 node:test——需起 HTTP 服务+浏览器，与 contracts 纯数据面测试混跑徒增耦合 |

## 2. 受影响文件清单（改动面全闭包，别无其他）

| # | 文件 | 动作 | 行为影响 |
| --- | --- | --- | --- |
| 1 | `tests/canvas/lib.mjs` | 新增（约 150 行，§4.1） | 纯测试基建 |
| 2 | `tests/canvas/geometry.mjs` | 新增（约 230 行，§4.2-4.4） | 纯测试入口 |
| 3 | `package.json`（根） | 修改 **1 行**：scripts 增 `"test:canvas": "node tests/canvas/geometry.mjs"`（置于 `smoke:server` 行后） | 构建配置；`gate`/`test`/`smoke:server`/`build*`/`start`/`dev:*` 全部不动 |

**不触碰清单**（= PRD REQ-0004-05 白名单的补集，护栏重申）：`apps/**`、`packages/**`、
`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、`.github/**`、
`CONSTITUTION.md`、`AGENTS.md`、`docs/evolution/WORKFLOW.md`。产品提交的 git diff
**只允许出现上表 3 项**（AC6 机器核对：`git diff --name-only` 逐路径比对）。

## 3. 模块边界

1. **触达被测系统的通道仅四条**（lib.mjs 头注释固化）：①HTTP 静态托管 `apps/web/dist/index.html`
   （读构建产物，模式同 `gate.mjs:32-41` 但**独立实现**，REQ-0004-04）；②DOM 只读观测
   （`getAttribute('d')` / `getBoundingClientRect` / `getScreenCTM` / classList/计数查询）；
   ③`localStorage` 播种（F6 通道）；④合成 UI 事件（MouseEvent/click/input，F5 路径）。
   不注入脚本改产品状态、不调用任何产品 JS 函数（全部经由真实事件监听器）。
2. **不 import**：`tools/pixel-gate/**`、`tests/smoke/**`、`apps/**`、`packages/**` 的任何
   模块（借鉴模式逐字重实现，PRD 背景 5 / 风险 5）；零新增 npm 依赖（F8）。
3. **不写文件系统**：无 diff 图、无快照产物；失败信息以文本输出实测偏差值与节点/连线 id
   （PRD 非功能 2），避免污染工作区（F10 干净基线）。
4. **进程边界**：单进程内 http 服务 + Playwright Chromium；端口默认 `listen(0)` 系统分配，
   env `CANVAS_PORT` 可注入固定值（PRD 非功能 3，先例 GATE_PORT `gate.mjs:20`）；
   服务与浏览器在 finally 中关闭（Ctrl-C/失败也不留孤儿进程）。
5. **确定性地板**：种子 settings 固化 `autosave:false`（根除回写竞态，F6）、`flowAnim:false`、
   `speed:1`、`snap:false`；全程 scale=1（世界系换算经 CTM 本可支持任意缩放，缩放场景留
   后续扩展项，不进本迭代）；动画类等待取固定 300ms ≥ PRD 的 260ms 下限（REQ-0004-02⑤）。

## 4. 详细设计

### 4.1 `lib.mjs` — 基建（约 150 行）

模块清单（全部导出，机制不含业务断言）：

| 部分 | 设计要点 |
| --- | --- |
| 常量 | `ROOT`（`path.resolve(dirname(fileURLToPath(import.meta.url)),'..','..')`，gate.mjs:17 同款 Windows 安全路径）；`TOL = 1.0`；`EDGE_SEL(id)` = `#edges g.edge[data-id="${id}"]` |
| `preflight()` | 检查 `apps/web/dist/index.html` 存在（F8 单文件产物）；缺失 → console.error `apps/web/dist 不存在——先在仓库根执行 npm run build:web（或完整 npm run build）后再跑本测试` + `process.exit(1)`（AC3，绝不静默） |
| `startServer()` | `http.createServer` 只服务 `/ → dist/index.html`（404 其余，使 `ENGINE.probe` 走 404→离线分支，F7）；`PORT = Number(process.env.CANVAS_PORT) \|\| 0`，listen 后回填实际端口；返回 `{server, port, url}` |
| `Checker` | smoke 同款：`ok(name)`/`fail(name, detail)` 计数，`summary()` 打印 `X passed / Y failed`，`exitCode()`；失败信息必须含实测值（贴合断言附 `startDev/endDev` 与 edge/node id） |
| `SEED` | §4.3 定稿字面量（唯一事实源，geometry.mjs 引用不复制） |
| `bootPage(browser, port)` | 每场景独立引导：`newPage({viewport:{width:1600,height:900}})` → `goto(url, domcontentloaded)` → `evaluate` 写 `localStorage.setItem('agentflow.v2', JSON.stringify(SEED))` → `reload` → `evaluate(document.fonts.ready)` → `waitForTimeout(800)`（字体/入场稳定，gate.mjs:70-73 同款纪律） |
| `fit(page, {edgeSel, fromSel, toSel})` | 核心断言（D3）。`page.evaluate` 内：取 `vis.getAttribute('d')` 正则提数 → `getScreenCTM` 映射首/末点 → 与 `.port` rect 中心算 `startDev/endDev` → 返回数值；Checker 外侧断言 `≤ TOL` |

`fit` 的 evaluate 主体（BUILD 照此实现，~25 行）：

```js
const vis = document.querySelector(edgeSel + ' .vis');
assert.ok(vis, `连线不存在：${edgeSel}`);
const nums = (vis.getAttribute('d').match(/-?[\d.]+/g) || []).map(Number);
assert.ok(nums.length >= 4, `d 属性解析失败：${d}`);
const svg = document.getElementById('edges');
const ctm = svg.getScreenCTM();
const map = (x, y) => { const p = svg.createSVGPoint(); p.x = x; p.y = y;
  const q = p.matrixTransform(ctm); return [q.x, q.y]; };
const s = map(nums[0], nums[1]), e = map(nums[nums.length-2], nums[nums.length-1]);
const c = sel => { const el = document.querySelector(sel);
  const r = el.getBoundingClientRect(); return [r.left + r.width/2, r.top + r.height/2]; };
const p = c(fromSel), q = c(toSel);
return { startDev: Math.hypot(s[0]-p[0], s[1]-p[1]), endDev: Math.hypot(e[0]-q[0], e[1]-q[1]) };
```

### 4.2 场景与陷阱锁定表（REQ-0004-02/03 的核心映射）

每场景固定骨架：前置断言（非空虚设防）→ 操作（真实事件路径）→ 稳定等待 →
`fit` 断言（两端各 ≤ TOL）。**前置不成立即该场景判红**（REQ-0004-03）。

| 场景 | 操作（F5 路径） | 前置断言 | 锁定的配对调用点 | 若该配对丢失的预期偏差（≥TOL 即红） |
| --- | --- | --- | --- | --- |
| **C1 单节点执行** | 选中 A（mousedown+mouseup，gate s1 手法）→ `#ntb-exec` click → 轮询 `.node[data-id="1"].st-done` 且 `.node-out` 非空（上限 3s）→ +60ms | A offsetHeight 增长（node-out 显示，F3④）；node-out 文本非空 | `runSingleNode` 起止配对 `app.js:1202/1214` | 结束配对丢：缓存停在 st-running 态，端口实际已回移 2px（F3① 定值）→ startDev=2px |
| **C2 折叠/展开** | A 的 `.ncollapse` 原生 click（折叠）→ 断言 → 再 click（展开）→ 断言（C2a/C2b 两个子项） | C2a：h(折叠) < h(原)−40（widget 块 ≈100px，F3②）；C2b：h(展开) > h(折叠)+40 | `rerenderNode` 内 `measurePorts+updateEdgesOf` `app.js:1078`（折叠钮 `app.js:1663` 走此路径） | ≈ widget 块高度（约百px 量级） |
| **C3 textarea 改高** | B 的 `.wdg-raw textarea[data-k="sys"]` 设 `style.height = 现高+60px` → 其上 dispatch `mouseup`（bubbles，触发 `app.js:1666-1670`）→ +50ms | B offsetHeight 增长 60±2px | textarea mouseup 配对 `app.js:1669` | 60px（改高量直传 out 端口，F3③） |
| **C4 拖拽位移** | A `.ntitle` mousedown → window `mousemove`×3 步至 (+80,+50) → window `mouseup` → +50ms | A 位移向量长度 ≥50px（实动 94px，REQ-0004-02④） | 拖拽移动中 `updateEdgesOf` `app.js:1473`（`n.x/n.y` 更新后的即时重绘；松手 `app.js:1508` 只重测不重绘——纯平移下缓存本就有效，见 F4） | 位移量（94px；mouseup 后无任何重绘兜底） |
| **C5 新增节点自动连线** | A `.port.out[data-p="0"]` mousedown → window `mousemove` 至视口内空白点（按 viewport rect+种子 view 计算的世界 (880,340)，B 右侧空区）→ 该点 `mouseup` → 等 `#search-modal.show` → `#search-input` 置「直接回复」+ dispatch input → click `.s-item[data-type="reply"]` → 固定等 300ms（REQ-0004-02⑤ 下限 260ms） | 节点数 2→3；`#edges g.edge` 数 1→2；新节点 `.node[data-id="3"]` 存在（种子 nextId=3） | `addNode` 同步 `measurePorts` `app.js:1272`——新连线 `edgeD` 立即读新节点缓存，缓存缺失则 portCenter 落入**回退猜测值**（F1）；同时覆盖 addEdge→edgeSvg→portCenter 全链 | 回退猜测 {x:+150,y:+20} vs 实际 in 端口偏移（x≈10px）→ ≈140px |

锁定表即 AC4 反演演练的对照清单：VERIFY 对每个场景临时移除其锁定列的调用点 →
重建 web（`npm run build:web`）→ `npm run test:canvas` 对应场景必须红 → 还原 → 复绿。
（C5 反演取 `app.js:1272`；`app.js:1271` 的 220ms 重测为防御性冗余、黑盒几何不可分辨
——见 §7 偏差声明。）

### 4.3 种子工作流（定稿字面量，REQ-0004-02）

```js
export const SEED = {
  tabs: [{
    name: 'portCache 回归种子',
    nodes: [
      { id: 1, type: 'userinput', x: 120, y: 140, title: 'A·用户输入' },   // 4 widget 药丸（折叠敏感）+ out: text
      { id: 2, type: 'llm',      x: 520, y: 140, title: 'B·LLM' },        // in[0]: text（typeOk ✓）+ sys textarea（C3 标的）
    ],
    edges: [{ id: 100, fn: 1, fp: 0, tn: 2, tp: 0 }],
    nextId: 3,                    // C5 新节点将得 id=3（确定性）
    view: { x: 60, y: 40, scale: 1 },
  }],
  activeTab: 0,
  runs: [],
  settings: { grid: false, flowAnim: false, speed: 1, autosave: false, snap: false },
};
```

- 类型链合法性：`userinput.out(text) → llm.in[0](text)`（F7 typeOk）；C5 的
  `A.out(text) → reply.in[0](any)` ✓。
- params 不给值 → `paramsOf` 用 DEFS 默认值（`app.js:193-197`），与产品出厂一致。
- `autosave:false` 的竞态根除论证见 F6/边界 5。
- C5 新边选择器：`[...document.querySelectorAll('#edges g.edge')].find(g => g.dataset.id !== '100')`
  （新边 id 为 `Date.now()+random`，`app.js:1299`，不可预测故按排除法取）。

### 4.4 `geometry.mjs` — 入口（约 230 行）

```
main():
  preflight()                        // 缺 dist → 指引 + exit 1（AC3）
  { server, port } = startServer()
  browser = chromium.launch()
  try:
    for sc of [C1, C2, C3, C4, C5]:  // 每场景：bootPage 独立页（§4.1）→ §4.2 骨架
      await sc({ browser, port, chk })   // 内部全部 try/catch：异常=该场景 fail(detail)，不中断其余场景
  finally: browser.close(); server.close()
  chk.summary()                      // 逐项已实时输出；末行 `X passed / Y failed`
  process.exit(chk.exitCode())
```

- 每场景开头 `chk.ok('C1 · 单节点执行后连线端点贴合（startDev=0.00, endDev=0.00）')`
  式命名输出（PRD 非功能 2；实测值嵌入通过信息，失败信息另附节点/连线 id）。
- 预计 5 场景输出 ~12 个命名断言（C1×1 fit+2 前置、C2×2 fit+2 前置、C3×1+1、C4×1+1、
  C5×1+3），总运行 ≈15s（5×引导 1.2s + 场景操作/等待）。

## 5. 验收口径（BUILD 自检 / VERIFY 逐条执行）

**命令序列（仓库根，顺序执行）**：

| # | 命令 | 通过标准 | 对应 |
| --- | --- | --- | --- |
| 1 | `npm run build` | exit 0（shared→web；gate 与 test:canvas 的共同前置） | AC1/AC6 前置 |
| 2 | `npm run test:canvas`（新脚本） | 全场景通过、`X passed / 0 failed`、exit 0；输出含 5 场景命名与实测偏差值；**并如实记录现状首跑结果**（AC7：全过=「未发现存量失配」；任一红=按 REQ-0004-06 记 BUG，不改产品代码） | AC1/AC2/AC7 |
| 3 | `npm test` | exit 0，8 项全 pass（口径 STATE.md:13，链未被触碰） | AC5 |
| 4 | `npm run gate` | 4 场景全绿、diffPx=0 | AC6 |
| 5 | `npm run smoke:server`（推荐） | 39 断言全过、exit 0 | AC5 |
| 6 | 反演演练（AC4，每场景至少抽 2 个）：临时移除 `app.js:1214` 的 `measurePorts();` → `npm run build:web` → #2 中 C1 红；同理 `app.js:1078`→C2 红、`app.js:1669`→C3 红、`app.js:1473` 的 `updateEdgesOf`→C4 红、`app.js:1272`→C5 红 → **全部还原源码** → 重建 → #2 复绿 | 红且偏差值与 §4.2 预期同量级 → 绿 | AC4 |
| 7 | 空转设防演练（AC2 可选）：临时把 C3 的改高语句改为空操作 → #2 中 C3 前置断言红（而非假绿）→ 还原复绿 | 前置红 → 绿 | AC2 |
| 8 | dist 缺失防御（AC3）：临时移走/改名 `apps/web/dist` → `npm run test:canvas` → 报错含「先 … build:web」指引、exit 1（不静默跳过）→ 还原 | fail 且信息含构建指引 | AC3 |
| 9 | 改动面核对（AC6/REQ-0004-05）：`git diff --name-only`（相对产品提交基线）仅 `tests/canvas/lib.mjs`、`tests/canvas/geometry.mjs`、`package.json` 三项 | 逐路径比对白名单 | AC6 |

> 演练 6-8 临时制造红灯与临时源码改动，VERIFY 执行后必须还原并复跑 #2/#4 复绿；
> 演练不进入产品提交（最终 diff 仅 §2 三项）。#6 重建 web 后 #4 gate 必须复跑一次
> （临时改动的 app.js 若残留将立即被像素门禁抓红，双保险）。

**手动 E2E 点位**（tests 之外的浏览器实操抽查，VERIFY 执行）：

- **P1 · 回归用例人肉复算**：`npm start` → 打开 http://localhost:3000 → 手工复现 C2
  （折叠任一节点）与 C4（拖动节点）→ 肉眼确认连线端点跟随端口中心，无脱节
  （与测试断言同一现象的目视佐证）。
- **P2 · 脚本产物零污染**：跑完 #2 后 `git status` 干净（tests/canvas 不落任何产物文件，
  边界 3）；重复跑两次 #2 结果一致（确定性地板，PRD 非功能 1）。
- **P3 · 离线性**：断开后端（仅 `npm run dev:web` 场景或直接对 dist 静态服务）复跑 #2
  依旧全绿（证明无 `/api/*` 隐式依赖，F7）。

## 6. 风险与回退

| 风险 | 概率 | 缓解 / 回退 |
| --- | --- | --- |
| Playwright locator/actionability 超时（PRD 风险 1，三次实踩先例 metrics.md:9-11） | 已规避 | 全场景合成事件直发（D5/F5），零 locator 点击/拖拽 API |
| getScreenCTM 在极旧 Playwright/无头差异下行为不一致 | 低 | Playwright ^1.50.0 为 gate 同款已验证环境（F8）；若 VERIFY 遇 null 返回（未渲染），报错信息含 edgeSel 可定位；仍不可用则回退 D3 被否方案（自算 computed transform matrix）并回 PLAN 重签 |
| 现状 dist 上任一场景首跑红（暴露存量失配，PRD 风险 3） | 低-中 | 按 REQ-0004-06/AC7 处置：**不修产品代码**（连线几何属渲染路径，宪法第 5 条「存疑按影响处理」），VERIFY 记 BUG-xxx + §4.2 预期偏差值对照 + 手工截图证据，item 处置转协调者裁定；如实发现不判实现为过 |
| C1 的 2px 失效信号被未来 CSS 改动压缩到 ≤1px（progress 条改 overlay 等） | 低 | 该 CSS 属宪法冻结对象（app.css 逐字保留），未经 ADR 不会变；若经批准变更，本测试随之更新属同 PR 义务 |
| 字体加载时序导致端口位移晚于 measure | 已规避 | 每场景引导固定 `document.fonts.ready` + 800ms 稳定等待（§4.1，gate 同款）；场景内操作→断言同帧无字体变化窗口 |
| 端口占用冲突（PRD 非功能 3） | 已规避 | 默认 `listen(0)` 系统分配空闲口；`CANVAS_PORT` env 可注入 |
| 规模膨胀超 400 行/文件（PRD 风险 4） | 低 | §4.1/4.4 预估 150/230 行，余量 ~40%；若实做超限先砍实现冗余（合并引导/断言样板），仍超则回 PLAN 收窄场景数（去掉 C5，保留 PRD 下限 4 场景），不夹带进 BUILD |

## 7. 与 PRD 的偏差声明

1. **场景⑤的锁定点重定义**（唯一的实质偏差）：PRD 建议⑤为「新增节点入场动画（等待
   ≥260ms 后断言，`app.js:1271`）」。本 SPEC 实测推演（F3⑤/F4）：`anim-in` 仅 opacity、
   不改几何，且 `app.js:1271` 的 220ms 重测对当时**尚无连线**的新节点是防御性冗余——
   单独移除它黑盒几何不可分辨（同步测量 `app.js:1272` 已给出正确缓存）。故 C5 改为
   「连线拖拽释放→搜索弹窗新建→自动连线」，锁定的调用点为 `app.js:1272`（缓存缺失→
   回退猜测值的失效模式，F1），并把 300ms 等待（≥260ms）一并覆盖动画稳定窗口。
   场景数仍 5 ≥ PRD 下限 4，三族覆盖不变；AC4 的反演点位随之以 §4.2 锁定表为准。
2. REQ-0004-04 脚本命名二选一定为 `test:canvas`（D2）；服务托管实现按 PRD 明令
   「借鉴 gate.mjs:32-41 但独立实现、不 import tools/pixel-gate」执行（§3 边界 2）。
3. 其余 REQ-0004-01/02/03/05/06 与 AC1-AC7 照单承接；容差论证与放宽规则见 D4
   （满足 REQ-0004-01「SPEC 定稿并论证」义务）。
