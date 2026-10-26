# 迭代 0054 · PRD — BK-0041 工作台·diff 审查 compare 页（后端 E2 diff 端点 + UI，修宪轮，批次 2）

> 产物角色：product-manager（PLAN 轮）· 2026-10-27 00:40 · 工作树 feat/0054-iter
> 消费方：spec-designer（M 项，不免 SPEC）→ code-developer → test-manager
> 迭代号 0054（主干迭代目录亲核至 0052，0053 系并行路分配号非本路射程）

## 0. 结论

- **建议做，且为本轮项（outcome=selected）**：BACKLOG 唯一 P0 ready 项，BK-9004 链
  批次 2，容器基建已随 BK-0040（迭代 0036，合并 85067b6，2026-10-27 归档 ed2f8ed）
  并入主干——本项是当前价值/成本比最高的动作。
- **触UI 分类结论：触UI=是，修宪轮**（类型 ui-proposal）。授权链闭合在案，**本 PRD
  不构成新的 UI 承诺面，只消费既有批准**：issue#4 用户批复承继
  （2026-10-23T15:49:17Z，见 BACKLOG BK-9004 行）+ ADR-0016（§2.2 diff 页签 /
  §3.2 E2 契约 / §3.4 git 子进程纪律 / §4 安全面 / §5 编排 / §6 golden 预案）。
  BACKLOG BK-0041 行状态 ready（迭代 0036 CLOSE 回写晋升），选题合规
  （WORKFLOW §4 优先序②：最高优先 ready 项，非 doc；占位锁空亲核
  `ls .zcode/locks/items/` = 空目录，无并行占位）。
- **修宪权限口径**：golden 增量 = 新场景 golden-created + **s16 受波及重录**（§5 AC4，
  ADR-0016 §6 双通道；gate:update 消费仅限 s16 一处，见 §8 预案）。
- 回执口径：sourceIssue=4；**itemContinues=true**——issue#4 名下 BK-0042（批次 3，
  链终轮）未竟，本轮 done 只发进度回执不关单（沿 issue#10/11 先例）。

## 1. 背景与现状证据

BK-9004（会话面板右侧工作台：git 信息 / diff 审查 / 目录树）拆分为
BK-0039（SPEC，done）→ BK-0040（容器+git 页，done）→ **BK-0041（diff 页，本项）**
→ BK-0042（tree 页，链终轮）。批次 1 基建现状（本 PLAN 会话逐项亲核，工作树
HEAD=d880b62 含 0036 合并）：

| 基建 | 现状指针 |
| --- | --- |
| 后端模块 | `apps/server/src/workbench/{root,git,routes}.ts`（15/82/26 行）；`root.ts:14 PROJECT_ROOT` 模块级常量锚定（dist 上溯，零 env） |
| 路由注册 | `server.ts:236` `app.get('/api/v1/workbench/git', …)`（v1-only，ADR-0005 先例）；头注 :17 已注记 workbench |
| 前端容器 | `app.js:2950` 起 workbench 模块段：`wbEnsure()` 懒创建 `#wb-tabs` 四页签 + `#workbench`（.wb-topbar/.wb-scroll）；`wbSwitch(page)` 以 `#rightbar` 类名切换；`WB={page:'props'}` 运行时页态 |
| **diff 页签现状** | `app.js` `mk('diff','变更',true)` —— **disabled 占位**（`title="后续批次提供"`），tree 同款；本项即兑现该占位 |
| 样式面 | `app.css:624-634` wb 家族；**:634 `.wb-tab:disabled{opacity:.4}`** —— 启用 diff 页签后该按钮脱离 disabled 态（opacity .4→1） |
| 数据面 | `server-sync.js:44 fetchWorkbenchGit` + `:85-86 SVR.wbGit/wbGitErr` + `:121-123 refreshWorkbenchGit`（on-open fetch + 手动刷新，零轮询零 SSE） |
| smoke 基线 | B01~B05（`smoke-server.mjs:1449` 起；B04 探针实例证明 PROJECT_ROOT 锚定双向正确）；基线 **138/0** |
| gate 基线 | **17 场景 s0~s16**；`s16-workbench-git-online`（`gate.mjs:432`，`WB_ROUTES:361` fixture，steps=[wbOpen]）—— 工作台打开态、页签条可见 |

**关键波及预判（本 PLAN 会话推演，§5 AC4 消费）**：s16 场景工作台打开、页签条
渲染全部四枚页签——启用 diff 页签（去 disabled）即改变该按钮渲染态 → **s16 像素
必然受波及**，走 ADR-0016 §6 双通道之「受波及既有场景经修宪轮 gate:update 重录」
（迭代 0013 先例）；其余 s0~s15 预期零波及（懒创建未打开前 `#wb-tabs` display:none
——app.css:627；#props 零触碰承诺不变），gate 实测确认。**新场景编号按落盘时序**
（当前主干最大号 s16 → 预期 s17+，多路并行时按实际落盘序裁决，ADR-0015 §5 先例，
不锁死）。

## 2. 用户故事

- **US-1**：作为智能体会话的使用者，我在 agent 改完代码后，想在右栏工作台「变更」
  页直接看到 HEAD↔工作区的文件级变更（状态/±行数）与选中文件的补丁内容——不离开
  画布即可审阅 agent 的产出改动。
- **US-2**：作为代码审阅者，我想选择 base/head ref 对（对比两次提交）并按路径前缀
  过滤，聚焦我关心的目录；也想只看统计（stat 模式）快速总览。

## 3. 功能范围（REQ-0041-xx）

权威定界 = ADR-0016 §7 第二代码块（BACKLOG BK-0041 行备注逐字一致，本 PRD 转述
并按基建现状具体化；SPEC 终稿以 ADR-0016 为准）。

- [ ] **REQ-0041-01 后端 E2 端点 `GET /api/v1/workbench/diff`**（workbench 模块内
  新增 diff 承载——独立 `diff.ts` 或并入既有文件，SPEC 定；`routes.ts` 出导出、
  `server.ts` v1-only 注册沿 :236 先例）：
  - 入参：`base` / `head`（ref 对；缺省默认 base=HEAD、head=工作区）；`path`
    （可选子路径前缀，过 §4 防越界校验）；`stat`（可选，仅统计模式）。
  - ref 安全面（写死，ADR-0016 §3.2）：ref 仅作 argv 单元素（零 shell 拼接）+
    字符白名单 `^[A-Za-z0-9._/@-]+$` 且不以 `-` 开头（拒选项注入与空串），非法 400。
  - git 白名单（一命令）：`git diff --no-color [--stat] <base> [<head>] [-- <path>]`
    （head 缺省即 base↔工作区形态）。
  - 出参：`{ files:[{ path, status, adds, dels, patch }], truncated }`
    （patch 截断上限与 stat 模式出参形态归 SPEC）。
  - 错误码：400 ref 非法 / path 越界；404 无仓库（沿 E1 rev-parse 探测）；500 超时。
- [ ] **REQ-0041-02 前端 diff 审查页签**（复用 BK-0040 容器与页签基建）：
  - 解除 diff 页签禁用（`mk('diff','变更',false)`）；**tree 页签保持 disabled 占位**
    （BK-0042 射程，禁用态像素不变）。
  - 页内容（ADR-0016 §2.2）：ref 对选择行（默认 HEAD↔工作区）+ 文件列表
    （状态/±行数）+ 选中文件对比视图（补丁文本等宽呈现，截断由端参控）。
  - 刷新语义（ADR-0016 §2.4）：打开/切至 diff 页即取（on-open fetch）+ 页内手动
    刷新控件；**零轮询、零新增 SSE 消费**（确需订阅 run 事件或新增事件类型即触
    shared 契约面，中止转 needs-approval——BK-0016 先例口径）。
  - `app.js` 纯插入（workbench 模块段内扩 diff 分支）+ `app.css` 新选择器纯插入
    （wb-diff 家族，:624-634 既有声明零改动）+ **Skeleton.tsx 预期零改动**
    （动态创建案，s0 不受波及）。
  - `server-sync.js` workbench diff 数据面（`fetchWorkbenchDiff` + `SVR.wbDiff`
    缓存 + 到达回调，ADR-0006 边界：不操作面板 DOM）。
- [ ] **REQ-0041-03 smoke 扩断言**：E2 契约（出参字段/缺省 ref 对形态/stat 模式）、
  ref 白名单 400 反例（`-` 开头 / 非法字符 / 空串）、path 越界 400（`../` 与绝对
  路径注入）、404 无仓库（B04 探针实例复用形态）；B 组扩展或新组归 SPEC。
- [ ] **REQ-0041-04 gate 场景增量**：diff 页在线态新场景（golden-created 通道；
  `WB_ROUTES` 扩 E2 mock——右栏打开切 diff 页即 fetch，无 mock 则内容不定像素不可
  复现，ADR-0016 §6；fixture 形态与 ready 探针归 SPEC）+ **s16 受波及修宪轮重录**
  + 其余 16 场景零波及 gate 实测确认。

**不做范围（out of scope）**：tree 页签（BK-0042 批次 3）；`--stat` 之外的 diff
选项透传（`-w`/`--ignore-*` 等）；diff 内跳转编辑或 stage/commit 任何写操作；
远程仓库出站（fetch/pull 类）；新 env（WORKBENCH_ROOT 类一律禁止，§4）；新 npm
依赖；packages/shared 契约（workbench 为面板数据源非节点/SSE 面）；轮询/SSE 刷新。

## 4. 非功能要求（安全/性能，ADR-0016 §3.4/§4 转述）

- **git 子进程纪律**（code.ts 同构）：argv 数组形态零 shell；5s setTimeout 超时
  强杀（超时 500）；只读白名单不变式（本项仅 `git diff` 一命令；一切可写命令
  一律排除）；子进程 cwd 显式 = PROJECT_ROOT（`workbench/root.ts:14` 既有常量，
  本项复用零新增）。
- **路径防越界**（tools.ts safePath 机理同构、锚定根=项目根）：`path.resolve(ROOT,
  input)` 后前缀校验，越界即 400（不做修复式放行）。
- **四零声明（机器证明口径）**：零出站（guard.ts 面零涉）、零新依赖（lock 零变化）、
  零新 env 语义（config.ts 零触碰）、零 shared 契约（packages/shared 零触碰）。
- **性能**：patch 逐文件截断上限 + `truncated` 标记（防大 diff 爆响应，终值 SPEC
  定）；入参界值校验对齐 E1 limit 风格。
- **secrets 面**（ADR-0016 §4）：diff patch 为仓库本地内容（与本地 `git diff` 同
  可见性），不新增凭据暴露面；展示侧截断提示归 SPEC 复核。

## 5. 验收标准（Given/When/Then）

> 逐条供 test-manager 转验收用例；命令口径 = `npm run build` + `npm run gate` +
> `npm test` + `npm run smoke:server`（基线：gate 17 场景 s0~s16 全绿 / npm test
> 30/30 / smoke 138/0）+ 手动 E2E。

- **AC0 定界消费核验**：Given ADR-0016 §7 第二代码块与 BACKLOG BK-0041 行备注，
  When 逐字比对，Then VERBATIM 一致（消费定界不漂移）；授权链三元组
  （issue#4 批复承继时间戳 + ADR-0016 + 行状态 ready）在 PRD/SPEC 一致引用。
- **AC1 E2 正路径契约**：Given 仓库处于有变更状态，When `GET /api/v1/workbench/diff`
  （无参），Then 200 且出参 `{files:[…],truncated}` —— 缺省形态 = HEAD↔工作区，
  files 含 path/status/adds/dels/patch 五键；带 `base`/`head` ref 对、`path` 前缀、
  `stat=1` 时各形态符合 ADR-0016 §3.2。
- **AC2 安全面**：When ref 以 `-` 开头 / 含白名单外字符 / 空串、`path` 含 `../`
  越界或绝对路径注入，Then 各 400（`{error}` 形态沿 sessions 风格）；When 项目根
  非 git 仓库（探针实例），Then 404；When git 挂起超 5s（源扫描同构形态背书，
  win32 不可移植伪造），Then 500 语义有断言承载；源扫描：spawn argv 数组零 shell
  拼接、超时强杀形态、白名单外命令零出现（B05/MT12 先例）。
- **AC3 前端交互**：Given 工作台已打开（右键菜单入口沿 BK-0040），When 点「变更」
  页签，Then 页签切换激活、on-open 取数、渲染 ref 对选择行 + 文件列表 + 选中文件
  等宽补丁视图；When 点刷新，Then 重取重渲；When 切回「属性」/「仓库」页签，
  Then #props 渲染与 git 页行为零回退（#props 零触碰承诺 + 既有 props 交互回归
  抽查通过）；When 工作台未打开，Then `#wb-tabs`/`#workbench` display:none
  （s0~s15 零波及几何前提不变）。
- **AC4 golden 双通道**：Given 修宪授权在案，When gate 全量跑，Then 新场景
  （diff 页在线态，编号按落盘时序）经 golden-created 落盘；**s16 恰一次 gate:update
  重录**（页签条 disabled 态变化，§1 预判兑现；重录仅此一处，重录前后其余场景
  逐字节零漂移）；s0~s15 + s16 之外的既有场景 diffPx=0 实测；**若 s3-library 出现
  diffPx≈23 形态**（issue #12 在案本机采样抖动，0037~0052 多轮先例），按
  rerun/CI 权威口径处置，**不得以此消费 gate:update**。
- **AC5 回归面**：`npm run build` exit 0；`npm test` 30/30；`npm run smoke:server`
  = 138 基线零回退 + E2 断言组新增全绿（新总数口径由 SPEC 定并写入 MERGE 收口）。
- **AC6 手动 E2E 点位**：打开右栏 → 切「变更」页签 → 默认 HEAD↔工作区 diff 呈现 →
  选文件看补丁对比 → 切 ref 对再取 → 手动刷新 → 切回属性页（SPEC 细化五~七点位，
  mock 或真实仓库数据均可，如实标注）。
- **AC7 四零机器证明**：`git diff` 对 Skeleton.tsx / packages/shared/** /
  package*.json / apps/server/src/config.ts / apps/server/src/guard.ts 恒空；
  lock 零变化。
- **AC8 CI 盯守（推送后义务，未到时点不判过不判挂，沿 0012 先例）**：CI
  `ui-constitution` 17→18 场景（含 s16 重录后基线）全绿；红则按 WORKFLOW §6 护栏
  处置（rerun 一次仍红报 issue #12 / 用户）。

## 6. 竞品对照（宪法第 1 条语境下的产品定位）

ComfyUI（基准竞品）**无工作台/diff 审查对应物**——本项属 T5 差异化定位
「画布编排 × 深度智能体工作台」的空白带（ADR-0016 §1、ROADMAP T5 序），系刻意
超越而非对齐。补丁呈现形态对齐通用 diff 工具惯例（`git diff --no-color` 原文等宽
呈现、状态/±行数统计行），不发明私有 diff 语法；交互语义（页签切换/手动刷新）
沿用 BK-0040 已冻结进基线的容器语汇，零新交互范式。

## 7. 受影响文件清单与验收命令口径（SPEC 输入；M 项不免 SPEC，skipSpec=false）

| 文件 | 动作 | 要点 |
| --- | --- | --- |
| `apps/server/src/workbench/diff.ts`（新增，落点 SPEC 定）或并入 git.ts/routes.ts | 新增/扩展 | E2 承载：ref 白名单/path 防越界/git diff 一命令/截断；单文件 ≤400 行红线（现 routes.ts 26 行有裕量） |
| `apps/server/src/server.ts` | +1~2 行 | v1-only 注册（:236 邻域）+ 头注 :17 workbench 行补 diff 注记（BK-0056 同型活清单纪律） |
| `apps/web/src/legacy/app.js` | 纯插入 | workbench 模块段 diff 分支 + `mk('diff','变更',false)` 解禁 + wbSwitch 扩分支 |
| `apps/web/src/app.css` | 纯插入 | wb-diff 家族选择器（:624-634 既有声明零改动） |
| `apps/web/src/server-sync.js` | 扩展 | fetchWorkbenchDiff / SVR.wbDiff / refreshWorkbenchDiff（ADR-0006 边界） |
| `tests/smoke/smoke-server.mjs` | 扩断言 | E2 契约/400 反例/404/纪律源扫描；编排头注 :5 序列同步（BK-0057 纪律） |
| `tools/pixel-gate/gate.mjs` | 场景增量 | WB_ROUTES 扩 E2 mock + 新场景行 + s16 重录后基线核对；头注场景计数 17→18 同步（BK-0058 授权射程内，tools/pixel-gate 改动已随 issue#4 修宪链+gate 头注惯例在案——SPEC 复核是否触发需批准射程：**头注计数同步属 BK-0058 同款注释级**，若认定需批准射程，沿 #13 先例先核授权，不得自主越权） |
| `tests/golden/ui/` | 新增+重录 | 新场景双基线（golden-created）+ s16 双基线重录（gate:update 恰一次） |
| `docs/adr/0016-*.md` | 状态行增补 | §7 第二代码块尾追加实施纪要（ADR-0010/0012 先例，§5 编排约定） |
| **零改动承诺** | — | Skeleton.tsx / packages/shared/** / package*.json / config.ts / guard.ts / .env.example |

验收命令（BUILD/VERIFY 口径）：`npm run build` → `npm run gate`（新场景 created +
s16 重录后全绿、其余零波及实测）→ `npm test` → `npm run smoke:server`（138+E2 组）
→ 手动 E2E（AC6 点位）。

## 8. 编排、预案与回执口径

- **非链终轮**：BK-0042（批次 3，链终轮）待本项 CLOSE 后晋升（ADR-0016 §5）。
  本轮 done 时 issue#4 仅进度回执（itemContinues=true），关单留 BK-0042 链终轮
  CLOSE（沿 issue#10/11 先例）。
- **修宪轮 gate:update 预算**：恰一次、仅限 s16 受波及重录（§1 预判）；新场景走
  golden-created 通道（gate.mjs 既有机制，零 gate:update）；s3 抖动形态（issue #12）
  按 rerun/CI 权威处置，禁止消费 gate:update 修复抖动（0037~0052 一贯纪律）。
- **中止条件**（WORKFLOW §4 BUILD 铁律）：实现中若确需订阅 run 事件 / 新增 SSE
  事件类型 / 新增 env 语义 / 出站网络目标，立即中止转 needs-approval（父项批复不
  自动覆盖，ADR-0016 §2.4/§3.0 写死）。
- **metrics 行**：CLOSE 时由协调者按 0036 行同构口径追加（gate 18 场景/smoke 新
  总数/±行数/bug 数）。

## 9. 选题过程存证（PLAN 轮合规记录）

- 枯竭判定不适用（非补题轮）：ready 队列亲核 grep 全表 = BK-0041（P0/M）/
  BK-0060（P1/S）/BK-0061（P2/S）/BK-0062（P2/M）四项，BK-0041 唯一 P0 且备注明示
  「当前 ready 队列最高优先项，下一轮心跳首选」（迭代 0036 CLOSE 回写）；doc 类
  仅 BK-0063（proposed，心跳不选）。
- 批复同步：本轮档案 approved/rejected 均无、issue 面板空、user-request 无新项
  → 规则①③零动作；规则④常规选题命中 BK-0041。
- 占位互斥：`ls .zcode/locks/items/` 亲核 = 空目录（2026-10-27 00:39），无他路
  占位；派发指令未注入任何已占项提示，与亲核互证。
- 侦察档案消费：残缺标记唯一实质项 browser stub（tools.ts:138）系 ADR-0011 评估
  终态（0041/0045/0046/0047 同判在案）；悬挂 run 探针 `[]` 空；治理日产物不重复
  采集——均不构成本轮候选，无补题。
- 基建亲核清单见 §1 表（工作树 HEAD=d880b62，全部指针本会话实读）。
