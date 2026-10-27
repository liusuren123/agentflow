# 迭代 0056 · PRD — BK-0042 工作台·项目目录树页（后端 E3 tree 端点 + UI，修宪轮，批次 3）——BK-9004 链终轮

> 产物角色：product-manager（PLAN 轮）· 2026-10-28 00:12 · 工作树 feat/0056-iter
> 消费方：spec-designer（修宪轮涉 golden 重录方案——**S 项但触 UI，不免 SPEC**，
> WORKFLOW §4「S 项（非 doc、非触 UI）可免」的括号条件不满足，skipSpec=false）
> → code-developer → test-manager
> 迭代号 0056（主干迭代目录亲核至 0055；STATE iteration=0056）

## 0. 结论

- **建议做，且为本轮项（outcome=selected）**：BACKLOG 唯一 P0 ready 项（本会话 grep
  全表亲核），BK-9004 链终轮，容器与两页签基建已随 BK-0040（迭代 0036，合并
  85067b6）/ BK-0041（迭代 0054，产品提交 7231e40）并入主干——本项是右栏工作台
  三页签的收官动作，价值/成本比最高的收口轮。
- **触UI 分类结论：触UI=是，修宪轮**（类型 ui-proposal）。授权链闭合在案，**本
  PRD 不构成新的 UI 承诺面，只消费既有批准**：issue#4 用户批复承继
  （2026-10-23T15:49:17Z，见 BACKLOG BK-9004 行）+ ADR-0016（§2.2 tree 页签 /
  §3.3 E3 契约 / §4 防越界 / §5 编排 / §6 golden 预案；**§7 第三代码块即本项
  权威定界字面量**）。BACKLOG BK-0042 行状态 ready（迭代 0054 CLOSE 后协调者
  晋升回写在案），选题合规（WORKFLOW §4 优先序②：最高优先 ready 项，非 doc；
  占位锁空亲核，§9）。
- **修宪权限口径**：golden 增量 = 新场景 golden-created + **s16/s17 双采受波及
  重录**（§5 AC4，ADR-0016 §6 双通道；gate:update 消费仅限 s16/s17 两处，见
  §8 预案）。
- **回执口径**：sourceIssue=4；**itemContinues=false**——BK-9004 链四子项中
  BK-0039/0040/0041 全 done，本项为**链终轮**，CLOSE 时回执 issue#4 关单（沿
  issue#10/11/#2/#3 终轮先例）；ADR-0016 状态行同步链终收口（REQ-0042-05）。

## 1. 背景与现状证据

BK-9004（会话面板右侧工作台：git 信息 / diff 审查 / 项目目录树）拆分为
BK-0039（SPEC，done·迭代 0030·ADR-0016 落盘）→ BK-0040（容器+git 页，done·
迭代 0036）→ BK-0041（diff 页，done·迭代 0054）→ **BK-0042（本项，tree 页，
链终轮）**。批次基建现状（本 PLAN 会话在工作树 feat/0056-iter 内逐项亲核）：

| 基建 | 现状指针 |
| --- | --- |
| workbench 模块 | `wc -l` 亲核：root.ts 18 / git.ts 84 / diff.ts 158 / routes.ts 56 行；E1/E2 已落地，E3 空缺 |
| 项目根锚定 | `workbench/root.ts:17-18` PROJECT_ROOT 模块级常量（上溯四级；迭代 0054 修正注 :12-15）——E3 fs 遍历锚定**直接复用零新增** |
| 端点注册先例 | `server.ts:257-260` E1/E2 v1-only 注册（ADR-0005 先例）；头注 :17/:20 已有 workbench 行——E3 落地补注（BK-0056 活清单纪律） |
| 入参校验先例 | `routes.ts:33-43` validateDiffQuery 同步段 400 直返 + WorkbenchDiffInputError 消费形态——E3 validateTreeQuery 同构 |
| 防越界先例 | `diff.ts:31-36` path 防越界（resolve 归一后前缀比对，tools.ts:18-22 机理同构、锚定根=项目根）——E3 唯一直接以用户输入 path 作 fs 访问坐标的端点，同构复用 |
| tree 页签现状 | `app.js:2972` `mk('tree','目录',true)` —— **disabled 占位**（`title="后续批次提供"`）；`wbSwitch`（:3001-3013）仅 git/diff 两分支；`.wb-refresh` 按页派发（:2988-2993）待扩 tree 分支——本项即兑现该占位 |
| 数据面先例 | `server-sync.js:44/:49` fetchWorkbenchGit/Diff + `:98-101` SVR.wbGit/wbDiff + `:106-113` onWorkbenchGit/DiffArrive + `:138-145` refresh——E3 六件同构扩 |
| 样式面 | `app.css:627-634` wb 家族；**:634 `.wb-tab:disabled{opacity:.4}`** —— 启用 tree 页签后该按钮脱离 disabled 态（opacity .4→1、title 移除） |
| gate 基线 | **18 场景 s0~s17**（头注 :4 计数亲核）；s16（:470）/s17（:472）共用 WB_ROUTES（:362）fixture——**两在线态场景页签条均渲染四枚页签** |
| smoke 基线 | B01~B05（E1·迭代 0036）+ B06~B12（E2·迭代 0054，头注 :33-40 亲核）；基线 **145/0** |

**关键波及预判（本 PLAN 会话推演，§5 AC4 消费）**：s16/s17 两场景工作台打开态
渲染全部四枚页签——启用 tree 页签（去 disabled）即改变该按钮渲染态 → **s16 与
s17 像素双双受波及**，走 ADR-0016 §6 双通道之「受波及既有场景经修宪轮
gate:update 重录」（0054 轮 s16 同因重录恰一次先例；s17 系 0054 新落盘场景，
本轮是其首次受后续批次波及）；其余 s0~s15 预期零波及（懒创建未打开前
`#wb-tabs` display:none——app.css:627；#props 零触碰承诺不变），gate 实测确认。
**新场景编号按落盘时序**（当前主干最大号 s17 → 预期 s18+，多路并行按实际落盘
序裁决，ADR-0015 §5 先例，不锁死）。

## 2. 用户故事

- **US-1**：作为智能体会话的使用者，我在 agent 改完代码后，想在右栏工作台
  「目录」页直接浏览项目结构（目录/文件/折叠占位行），点击目录逐级下钻——
  不离开画布即可知道 agent 动了哪些模块、项目长什么样。
- **US-2**：作为代码审阅者，大型生成目录（node_modules/dist/data）应折叠为
  占位行不刷屏；条目超限如实截断提示（truncated），不静默吞也不爆响应。

## 3. 功能范围（REQ-0042-xx）

权威定界 = ADR-0016 §7 第三代码块（BACKLOG BK-0042 行备注逐字一致，本 PRD
转述并按基建现状具体化；**SPEC 终稿以 ADR-0016 为准**）。

- [ ] **REQ-0042-01 后端 E3 端点 `GET /api/v1/workbench/tree`**（workbench 模块
  内新增 tree 承载——独立 `tree.ts` 或并入既有文件 SPEC 定；`routes.ts` 出
  导出、`server.ts` v1-only 注册沿 :257-260 先例）：
  - 入参：`path`（可选子目录前缀，默认根；过 §4 防越界校验）；`depth`
    （可选，默认 2、1-6——limit 界值校验沿 `server.ts:173` 风格 / routes.ts:16
    同款形态）。
  - 承载（ADR-0016 §3.3）：**Node fs 遍历（非 git 命令）——E3 与 E1/E2 的
    承载差异面**；`.git` 恒不入树；`node_modules` / `dist` / `data` / 构建产物
    目录折叠为占位行（**折叠清单终值实施 SPEC 定**，契约级义务：`.zcode`
    工作树目录须一并评估——含完整依赖副本，不折叠即爆树）；条目数上限截断 +
    `truncated` 标记（防大仓爆响应，终值 SPEC 定）。
  - 出参：`{ root:{ name, path, children:[{ name, type:'dir'|'file', size?,
    children? }] }, truncated }`。
  - 错误码：400 path 越界；404 子路径不存在；500 遍历异常（routes.ts E1/E2
    同款映射形态）。
- [ ] **REQ-0042-02 前端目录树页签**（复用 BK-0040 容器与页签基建）：
  - 解除 tree 页签禁用（`mk('tree','目录',false)`）——四页签全部启用，容器
    基建收官（此后 `.wb-tab:disabled`（app.css:634）无命中对象，**声明本身
    零改动**）。
  - 页内容（ADR-0016 §2.2）：缩进树（目录/文件/折叠占位行），默认深度展开，
    点击目录展开下钻（**逐次带 path 前缀请求 E3**——on-open fetch + 逐级按需
    取数，零全量预取）。
  - 刷新语义（ADR-0016 §2.4）：打开/切至 tree 页即取 + 页内手动刷新控件按页
    派发扩 tree 分支；**零轮询、零新增 SSE 消费**（确需订阅 run 事件或新增
    事件类型即触 shared 契约面，中止转 needs-approval——BK-0016 先例口径）。
  - `app.js` 纯插入（workbench 模块段扩 tree 分支：wbSwitch case +
    wbRenderTree + 折叠占位/下钻交互 + wb-refresh 派发）+ `app.css` 新选择器
    纯插入（wb-tree 家族，:627-634 既有声明零改动）+ **Skeleton.tsx 预期零
    改动**（动态创建案，s0 不受波及）。
  - `server-sync.js` workbench tree 数据面（fetchWorkbenchTree + SVR.wbTree
    缓存 + onWorkbenchTreeArrive + refreshWorkbenchTree，ADR-0006 边界：不操作
    面板 DOM）。
- [ ] **REQ-0042-03 smoke 扩断言**：E3 契约（出参字段/root.name/children 形状/
  depth 界值）、path 前缀下钻形态、**防越界矩阵（`../` 与绝对路径注入——
  win32 盘符与 POSIX 根双形态，diff.ts:32 同款口径）400**、404 子路径不存在
  （探针实例，B04 形态）、折叠占位（node_modules/dist/data 不展开为占位行）
  与 truncated、E3 承载纪律源扫描（**fs 仅 readdir/stat 族只读、零 git
  spawn**——与 E1/E2 纪律扫描的差异面）；B 组扩展归 SPEC；编排头注 :33-40
  序列同步（BK-0057 纪律）。
- [ ] **REQ-0042-04 gate 场景增量**：tree 页在线态新场景（golden-created
  通道；`WB_ROUTES` 扩 E3 mock——右栏打开切 tree 页即 fetch，无 mock 则树内容
  不定像素不可复现，ADR-0016 §6；fixture 确定性树形态与 ready 探针归 SPEC；
  s16 不切 tree 页 → E3 路由对 s16 零请求零渲染因果，0054 :417 注记同型）+
  **s16/s17 双采受波及修宪轮重录** + 其余场景零波及 gate 实测确认。
- [ ] **REQ-0042-05 ADR-0016 状态行收口（链终）**：CLOSE 时状态行按
  ADR-0010/0012 先例更新 + §7 第三代码块尾追加实施纪要；链终轮回执 issue#4
  关单。

**不做范围（out of scope）**：文件内容预览（点文件看内容——只入树不入内容）；
树内任何写操作（新建/重命名/删除/暂存）；`.git` 目录内部浏览（恒不入树）；
文件监听刷新（fs.watch / 轮询 / SSE）；Windows 权限与所有权元数据入出参；新
env（WORKBENCH_ROOT 类一律禁止，ADR-0016 §3.0 写死）；新 npm 依赖；
packages/shared 契约（workbench 为面板数据源非节点/SSE 面）；远程仓库出站。

## 4. 非功能要求（安全/性能，ADR-0016 §3.3/§4 转述）

- **路径防越界（本项安全主面）**：`path.resolve(PROJECT_ROOT, input)` 后校验
  `p === ROOT || p.startsWith(ROOT + path.sep)`，否则 400（tools.ts:18-22 /
  diff.ts:31-36 机理同构；越界即拒，不做修复式放行）——E3 是 workbench 三
  端点中唯一直接以用户输入 path 作 **fs 访问坐标**的端点（E1 零 path 入参、
  E2 path 仅作 git pathspec），防越界审查强度相应最高。
- **只读不变式**：fs 仅 readdir/stat 族（零写零删零 rename）；E3 **零 git
  子进程**（承载差异面：无 spawn、无超时强杀需求；遍历异常 500 兜底）。
- **四零声明（机器证明口径）**：零出站（guard.ts 面零涉）、零新依赖（lock 零
  变化）、零新 env 语义（config.ts 零触碰）、零 shared 契约（packages/shared
  零触碰）。
- **性能**：条目数上限 + truncated（终值 SPEC 定）；depth 界值 1-6 防深递归；
  symbolic link 处置（follow 与否）归 SPEC——契约级要求：**不产生无限递归/
  环引用崩溃**。
- **secrets 面**：目录树为仓库本地结构与文件名（与本地 ls 同可见性），不新增
  凭据暴露面；node_modules/data 等折叠本身缩小噪声面。

## 5. 验收标准（Given/When/Then）

> 逐条供 test-manager 转验收用例；命令口径 = `npm run build` + `npm run gate`
> + `npm test` + `npm run smoke:server`（基线：gate 18 场景 s0~s17 全绿 /
> npm test 30/30 / smoke 145/0）+ 手动 E2E。

- **AC0 定界消费核验**：Given ADR-0016 §7 第三代码块与 BACKLOG BK-0042 行
  备注，When 逐字比对，Then VERBATIM 一致（消费定界不漂移）；授权链三元组
  （issue#4 批复承继时间戳 + ADR-0016 + 行状态 ready）在 PRD/SPEC 一致引用。
- **AC1 E3 正路径契约**：Given 仓库根为真 git 仓库，When `GET
  /api/v1/workbench/tree`（无参），Then 200 且出参 `{root:{name,path,
  children},truncated}`——children 每项含 `{name,type:'dir'|'file',size?,
  children?}`；`.git` 不出现在任何层级；node_modules/dist/data 呈占位行形态
  （SPEC 定案形态）；When 带 `path=apps/server` 与 `depth=4`，Then 下钻子树
  且深度符合；When `depth` 越界（0/7/abc），Then 各 400。
- **AC2 防越界与错误码**：When `path` 含 `../` 越界、绝对路径注入（win32
  盘符与 POSIX 根双形态），Then 各 400 `{error}`（sessions 风格）；When
  `path` 指向不存在子路径，Then 404；When 遍历异常（源扫描同构形态背书，
  win32 不可移植伪造），Then 500 语义有断言承载；源扫描：E3 承载零 git
  spawn、fs 调用面仅 readdir/stat 族。
- **AC3 前端交互**：Given 工作台已打开（空画布右键菜单入口沿 BK-0040），
  When 点「目录」页签，Then 页签激活、on-open 取数、缩进树渲染（目录/文件/
  折叠占位分级形态）；When 点目录行，Then 逐级下钻（带 path 前缀请求）展开；
  When 点刷新，Then 重取重渲；When 切回「属性」/「仓库」/「变更」页签，
  Then #props 与 git/diff 页行为零回退（#props 零触碰承诺 + 既有交互回归
  抽查通过）；When 工作台未打开，Then `#wb-tabs`/`#workbench` display:none
  （s0~s15 零波及几何前提不变）。
- **AC4 golden 双通道**：Given 修宪授权在案，When gate 全量跑，Then 新场景
  （tree 页在线态，编号按落盘时序预期 s18+）经 golden-created 落盘；
  **s16 与 s17 恰各一次 gate:update 重录**（页签条 tree 按钮 disabled 态
  变化，§1 预判兑现；重录仅此两处，重录前后其余场景逐字节零漂移）；其余
  既有场景 diffPx=0 实测；**若 s3-library 出现 diffPx≈23 形态**（issue #12
  在案本机采样抖动，0037~0052 多轮先例），按 rerun/CI 权威口径处置，**不得
  以此消费 gate:update**。
- **AC5 回归面**：`npm run build` exit 0；`npm test` 30/30；`npm run
  smoke:server` = 145 基线零回退 + E3 断言组新增全绿（新总数口径由 SPEC 定
  并写入 MERGE 收口）。
- **AC6 手动 E2E 点位**：打开右栏 → 切「目录」页签 → 根级树呈现 → 点目录
  下钻展开 → 折叠占位行不展开（node_modules 类）→ 手动刷新 → 切回属性页
  （SPEC 细化五~七点位，mock 或真实仓库数据均可，如实标注）。
- **AC7 四零机器证明**：`git diff` 对 Skeleton.tsx / packages/shared/** /
  package*.json / apps/server/src/config.ts / apps/server/src/guard.ts 恒空；
  lock 零变化。
- **AC8 CI 盯守（推送后义务，未到时点不判过不判挂，沿 0012 先例）**：CI
  `ui-constitution` 18→19 场景（含 s16/s17 重录后基线）全绿；红则按
  WORKFLOW §6 护栏处置（rerun 一次仍红报 issue #12 / 用户）。

## 6. 竞品对照（宪法第 1 条语境下的产品定位）

ComfyUI（基准竞品）**无工作台/目录树对应物**——本项属 T5 差异化定位「画布
编排 × 深度智能体工作台」的空白带（ADR-0016 §1、ROADMAP T5 序），系刻意超越
而非对齐。树呈现形态对齐通用 IDE 文件树惯例（缩进层级/目录先序/生成物折叠
占位），逐级下钻对齐 lazy-loading 文件树通用形态（按需取数不全量预取），
不发明私有树语义；交互语汇（页签切换/手动刷新）沿用 BK-0040 已冻结进基线的
容器语汇，零新交互范式。

## 7. 受影响文件清单与验收命令口径（SPEC 输入；触 UI 修宪轮，skipSpec=false）

| 文件 | 动作 | 要点 |
| --- | --- | --- |
| `apps/server/src/workbench/tree.ts`（新增，落点 SPEC 定） | 新增 | E3 承载：path 防越界 / fs 遍历 / .git 排除 / 折叠占位 / 条目上限；≤400 行（现 routes.ts 56 行有裕量） |
| `apps/server/src/workbench/routes.ts` | 扩展 | E3 handler 导出（validateTreeQuery 同步 400 + collectTree 异步 + 404/500 映射，E2 形态同构） |
| `apps/server/src/server.ts` | +1~2 行 | v1-only 注册（:260 邻域）+ 头注 :20 workbench 行补 tree 注记（BK-0056 纪律） |
| `apps/web/src/legacy/app.js` | 纯插入 | workbench 模块段 tree 分支（`mk('tree','目录',false)` 解禁 + wbSwitch case + wbRenderTree + 下钻交互 + wb-refresh 按页派发扩 tree） |
| `apps/web/src/app.css` | 纯插入 | wb-tree 家族选择器（:627-634 既有声明零改动；:634 `.wb-tab:disabled` 声明保留——全启用后自然无命中对象） |
| `apps/web/src/server-sync.js` | 扩展 | fetchWorkbenchTree / SVR.wbTree / onWorkbenchTreeArrive / refreshWorkbenchTree（ADR-0006 边界） |
| `tests/smoke/smoke-server.mjs` | 扩断言 | E3 契约/防越界矩阵/404/折叠与截断/纪律源扫描；编排头注 :33-40 序列同步（BK-0057 纪律） |
| `tools/pixel-gate/gate.mjs` | 场景增量 | WB_ROUTES 扩 E3 mock + 新场景行 + s16/s17 重录后基线核对；头注场景计数 18→19 同步（BK-0058 同款注释级，#13 授权先例口径，SPEC 复核） |
| `tests/golden/ui/` | 新增+重录 | 新场景双基线（golden-created）+ s16/s17 双基线重录（gate:update 恰两处各一次） |
| `docs/adr/0016-*.md` | 状态行增补 | §7 第三代码块尾追加实施纪要 + 状态行链终收口（ADR-0010/0012 先例，§5 编排约定） |
| **零改动承诺** | — | Skeleton.tsx / packages/shared/** / package*.json / config.ts / guard.ts / .env.example |

验收命令（BUILD/VERIFY 口径）：`npm run build` → `npm run gate`（新场景
created + s16/s17 重录后全绿、其余零波及实测）→ `npm test` → `npm run
smoke:server`（145+E3 组）→ 手动 E2E（AC6 点位）。

## 8. 编排、预案与回执口径

- **链终轮**：BK-9004 链四子项收官（BK-0039 SPEC·0030 → BK-0040 容器+git·
  0036 → BK-0041 diff·0054 → BK-0042 tree·本轮）。本轮 done 时**回执 issue#4
  关单**（itemContinues=false，沿 issue#10/11/#2/#3 终轮先例）；ADR-0016 状态
  行同步链终收口（REQ-0042-05）。
- **修宪轮 gate:update 预算**：恰两处、仅限 s16/s17 受波及重录（§1 预判）；
  新场景走 golden-created 通道（gate.mjs 既有机制，零 gate:update）；s3 抖动
  形态（issue #12）按 rerun/CI 权威处置，禁止消费 gate:update 修复抖动
  （0037~0052 一贯纪律）。
- **中止条件**（WORKFLOW §4 BUILD 铁律）：实现中若确需订阅 run 事件 / 新增
  SSE 事件类型 / 新增 env 语义 / 出站网络目标 / fs 写面，立即中止转
  needs-approval（父项批复不自动覆盖，ADR-0016 §2.4/§3.0/§4 写死）。
- **ready 队列后续（本轮随链晋升）**：BK-0045 已随本轮 PLAN 轮晋升 ready
  （P0/M，BK-9005 链终轮——BK-0044 行尾「归下轮 PLAN 轮随链晋升」承接兑现，
  BACKLOG 过程改动随分支机制件提交）——下轮心跳候选首序；BK-0060（P1/S）/
  BK-0061（P2/S）/ BK-0062（P2/M）随其后。本轮不选 BK-0045 的理由：同 P0
  下 S 优先于 M（WORKFLOW §4「优先 S/M」）+ ROADMAP 待办节链序（BK-9004 链续
  序位 2 先于 BK-9005 链序位 4）+ BK-0042 行「下轮心跳首选」明示在案。
- **metrics 行**：CLOSE 时由协调者按 0054 行同构口径追加（gate 19 场景/smoke
  新总数/±行数/bug 数/CI 盯守结论）。

## 9. 选题过程存证（PLAN 轮合规记录）

- **批复同步（规则①）**：本轮档案 approved：无、rejected：无 → 零批复动作
  （issue#14 已于迭代 0055 消化——BK-0044 done、BK-0045 依赖授权随批在案）；
  user-request 新项无（面板 #14/#12/#6/#5/#4 均 needs-approval 且 BACKLOG 均
  有承载行，非新收录）→ 规则②③零动作。
- **常规选题（规则④）**：ready 队列亲核 grep 全表 = **BK-0042（P0/S/ready，
  issue#4 链终轮，「ready 队列唯一 P0，下轮心跳首选」——迭代 0054 CLOSE 回写
  在案）**/ BK-0060（P1/S）/ BK-0061（P2/S）/ BK-0062（P2/M）；doc 类仅
  BK-0063（proposed，心跳不选）——BK-0042 唯一 P0 且链终轮，入选。
- **BK-0045 晋升（随链）**：BK-0044 行尾「**BK-0045 晋升条件就此兑现**
  （BK-0043 done + BK-0044 done，@xterm/xterm 授权随 #14 在案），归下轮 PLAN
  轮随链晋升」——本轮即「下轮 PLAN 轮」，承接执行 proposed→ready（工作树内
  BACKLOG 过程改动）；不入选理由见 §8。
- **占位互斥**：`ls .zcode/locks/items/` = 空目录（2026-10-28 00:11 亲核），
  无他路占位；派发指令未注入任何已占项提示，与亲核互证。
- **侦察档案消费**：残缺标记唯一实质项 browser stub（tools.ts:138）系
  ADR-0011 评估终态不立项（0041/0045/0046/0047/0050/0051/0055 多轮同判在案）；
  悬挂 run 探针 `[]` 空；治理日产物不重复采集——均不构成本轮候选，无补题。
- **基建亲核**：§1 表全部指针本会话在工作树内实读/实跑（wc/grep/sed 亲核，
  工作树 feat/0056-iter）。
