# PRD · 迭代 0036 · BK-0040 工作台右栏容器 + git 信息页——BK-9004 右栏工作台链 · 批次 1（修宪轮）

> 产出角色：product-manager（PLAN 轮）。
> 选题来源：BACKLOG BK-0040（P0/M/ui-proposal/触UI=是/**ready**，来源列 = issue#4）。
> 定界权威：ADR-0016（§2 容器信息架构/§3.0 项目根锚定/§3.1 E1 契约/§3.4 git 子进程
> 纪律/§4 安全面/§5 分批编排/§6 golden 预案/§7 BK-0040 权威字面量）——ADR-0016 §7
> 第一代码块即本行备注的权威字面量，本 PRD 与其定界字面一致。
> 授权链复核（本轮亲跑）：`gh issue view 4 --json state,comments` → owner `liusuren123`
> 评论「批准」`createdAt 2026-10-23T15:49:17Z`，issue state=OPEN（与 BACKLOG BK-9004
> 行及 ADR-0016 头部授权链逐字一致；关单留链终轮 BK-0042，沿 issue#10/11 先例）。
> **选题过程（规则①/④ + 并行占位互斥）**：本轮 ready 队列（非 doc）= BK-0038
> （P0/M，issue#3）/ BK-0040（P0/M，issue#4）/ BK-0050（P0/S，issue#6）。
> ① BK-0038 已被另一并行工作流占位（派发提示明示禁选），BK-9003 链本轮不可推进。
> ② BK-0050（S）与 BK-0040（M）之抉择：**并行冲突面最小化优先于尺寸偏好**——
> BK-0050 改动面 = app.js 硬编码分类区（.lib-cat）+ s3-library 场景**基线重录**
> （BK-0050 行备注明载）；并行路 BK-0038 的定界同样含「s3-library 受波及修宪轮
> 重录」（BK-0038 行备注明载）——两路同时重录**同一 golden 场景**，合并时两侧
> 基线互不含对方条目，属真·重录内容冲突（0033/0034 先例可仲裁的是「各自新增
> 不同场景」，不覆盖本形态）；golden 为像素权威，机械并存不可行。BK-0040 与
> BK-0038 的重叠面 = app.js/app.css（各自纯插入段）/ gate.mjs（各自新增场景行与
> fixture）/ golden 目录（各自新增场景文件）——全为「双方各自新增」并存型，
> 0033/0034 双路合流先例（MERGE.md：5 文件 7 处冲突全并存型 + 场景号按落盘时序）
> 直接可循。
> ③ 链推进价值：BK-0040 是 BK-9004 链首项、右栏容器为 BK-0041/BK-0042 共享基建
> （解阻两项，ROADMAP 待办节序列 4 容器先行）；BK-0050 为独立穿插项（序列 6
> 「可穿插」，解阻零项，其行备注亦载「BK-9003 链实现段优先」——该链本轮被占，
> 不构成对 BK-0050 的催促）。**结论：选 BK-0040**。

## 结论

**建议做（本迭代即做）**——三条理由：

1. **链序与授权**：右栏工作台是 T5-M3「画布编排 × 深度智能体工作台」差异化定位
   的支柱面（会话产出须在工作台内被直接看见——仓库状态/变更对比/项目结构，
   ADR-0016 §1）；本轮为链批次 1（容器 + git 信息页，一页签一迭代，ADR-0016 §5），
   授权链 issue#4 已获用户批复（本轮 gh 亲核 2026-10-23T15:49:17Z），ADR-0016
   §2/§3.1/§3.4 已给出定界到契约级的方案。
2. **前置齐备**：BK-0039（SPEC 先行轮）已于迭代 0030 终态 done（ADR-0016 落盘）；
   后端地基 BK-0016 sessions 五端点（错误码样板）、ADR-0005 v1-only 注册先例均
   在库；本轮亲核 `apps/server/src` 全树 `workbench|WORKBENCH|PROJECT_ROOT`
   零命中（grep exit=1）——零现状即零迁移包袱。
3. **需批准面外风险为零**：本链零新依赖（git 系统命令 + Node 内置 fs）、零新 env
   （§3.0 写死）、零出站（全本地只读）、零 shared 契约（面板数据源非节点/SSE 面）；
   唯一需批准面 = UI 三层（已由 issue#4 批复 + ADR-0016 承继，走修宪通道）。

**归属 CONSTITUTION 第 3 条变更需求，但已获用户批准 → 走修宪通道**（ADR 在案 +
批复在案 + 同迭代 golden 增量），**不需要新一轮 needs-approval**。

## 触UI 分类结论

**是（修宪轮）**。宪法第 3 条三要素齐备：

| 要素 | 证据 |
| --- | --- |
| ADR 在案 | `docs/adr/0016-workbench-right-panel-git-diff-tree.md`（§2 容器 B 案 / §3.1 E1 契约 / §3.4 纪律 / §5 编排 / §6 golden 双通道 / §7 权威字面量） |
| 用户批复在案 | issue#4 owner 评论「批准」2026-10-23T15:49:17Z（本轮 gh 亲跑复核） |
| golden 增量 | 右栏在线态新场景走 golden-created 通道；既有 12 场景（s0~s11）预期零波及——gate 全场景实测确认（见 REQ-0040-07） |

**波及控制（硬约束）**：

- 改动形态 = **纯插入优先**：app.js workbench 模块动态创建新段 + app.css 新选择器
  （沿 BK-0034「动态创建，Skeleton 预期零改动」先例）；既有行零删改。
- **#props 零触碰**（B 案核心承诺，ADR-0016 §2.1）：属性面板渲染入口
  （`renderProps`，app.js:914 本轮亲核）、三事件委托、滚动恢复、焦点归属逻辑
  全部冻结保持；#rightbar 布局声明面（app.css `--props-w`/`#rightbar` 区）允许
  **扩展**（页签条/容器切换所需），形态归实施 SPEC。
- `Skeleton.tsx` 预期零改动（动态创建案）；若 SPEC 选静态骨架化回退案则 s0 受
  波及、修宪轮内允许一次 `npm run gate:update` 重录（ADR-0016 §2.5）——**仅此
  情形**，此外 gate:update 禁用。
- **零 shared 契约**（workbench 不进 packages/shared，sessions 先例）；零 run 事件
  接触、零 SSE 消费（ADR-0016 §2.4 写死）；确需新增事件类型 → **中止转
  needs-approval**（BK-0016 先例口径）。
- **零 env 护栏（写死）**：不新增任何环境变量语义（无 WORKBENCH_ROOT 类覆盖项）；
  实施轮若评估反转 → 中止转 needs-approval（POLICY 需批准区，父项批复不自动
  覆盖 env 面，ADR-0016 §3.0）。

## 需求（Given / When / Then）

### REQ-0040-01 · 后端 workbench 模块与项目根锚定（零 env）

- **Given** `apps/server/src` 全树 workbench 零命中（本轮亲核 `grep -rln workbench`
  exit=1）、`config.ts` 无项目根概念、`tools.ts:15` SANDBOX 模块级常量锚定先例
  （`import.meta.url` 一次性 resolve，模块加载即冻结），**When** 新增
  `apps/server/src/workbench/` 模块并以**模块级常量**锚定项目根（dist 产物上溯
  两级：`apps/server/dist` → `apps/server` → 仓库根，ADR-0016 §3.0 推荐案），
  **Then** 锚定与启动形态无关（`npm start -w` 形态下进程 cwd=apps/server 亦正锚
  仓库根——ADR-0016 §3.0 本机实测已否决 cwd 案）；**零新增 env**；模块文件切分
  （端点承载/根锚定/git 执行器）与各文件 ≤400 行（AGENTS.md 硬性约定 4）归 SPEC。
- git 子进程 `cwd` 显式设为该常量，不依赖进程 cwd（ADR-0016 §3.4）。

### REQ-0040-02 · E1 git 信息端点（GET /api/v1/workbench/git）

- **Given** `server.ts:205-219` v1-only 路由族注册序（workflows 七端点 + sessions
  五端点即注册面样板，本轮亲核 :205 起 workflows、:215 起 sessions）与 sessions
  错误码风格（`{ error:'…' }`），**When** 实现 E1 端点并注册（v1-only，无
  `/api/*` 别名，ADR-0005 先例；沿 :215-219 段尾追加），**Then**：
  - 入参：query `limit`（可选，最近提交条数，默认 20、1-100——对齐 server.ts
    limit 校验风格，ADR-0016 §3.1）；越界/非法 → 400。
  - 出参：`{ branch, head, changes:[{ status, path, from? }], commits:[{ sha,
    short, author, ts, subject }] }`（契约级字段清单，ADR-0016 §3.1）。
  - 错误码：404 项目根非 git 仓库（rev-parse 非零，`{ error:'not a git
    repository' }`）；500 git 超时/退出码异常。
  - **零 shared 契约**：workbench 端点不进 packages/shared（sessions 先例）。

### REQ-0040-03 · git 子进程安全纪律（code.ts 同构）

- **Given** `code.ts:7` spawn import、`:50` argv 数组形态（零 shell 拼接）、`:53`
  setTimeout 5s 超时 kill 先例（本轮亲核三锚点行号未漂移），**When** git 调用
  采用同款纪律：`spawn('git', [args], …)`、一切外部输入（limit）只作 argv 元素、
  5s setTimeout kill，**Then**：
  - 源码 `/shell/` 拼接零命中（可断言，BK-0028 MT 先例）；超时即 500。
  - **只读命令白名单不变式（写死，ADR-0016 §3.4）**：白名单 = rev-parse /
    status / log 三命令（E1 承载，逐条见 REQ-0040-02）；一切可写命令（add /
    commit / push / pull / checkout / reset / clean / merge / rebase / stash 等）
    一律排除——workbench 对仓库**零写入、零副作用**。
  - 出站请求：**零**（git 为本地子进程非网络请求；guard.ts 面零涉）。

### REQ-0040-04 · 前端右栏容器（B 案）+ 页签条 + git 信息页

- **Given** `Skeleton.tsx:137` `<aside id="rightbar"><div id="props"></div></aside>`
  （#props 是 #rightbar 唯一住户，本轮亲核）、`app.js:914` renderProps 渲染入口
  （本轮亲核行号未漂移），**When** 按 ADR-0016 §2.1 **B 案独立容器切换**实现：
  #props 旁新增兄弟容器（如 `#workbench`）+ 右栏顶部件页签条（默认「属性」页 =
  现状零变化；git/diff/tree 三页签位呈现，diff/tree 为禁用/占位态归后续批次，
  SPEC 定形态）、workbench 模块**动态创建**（app.js 纯插入新段 + app.css 新
  选择器纯插入），**Then**：
  - **#props 及其渲染/事件委托/滚动恢复/焦点保持面零触碰**（B 案核心承诺）；
    `Skeleton.tsx` 零改动（动态创建案）；切回属性页后 renderProps 语义与现状
    逐字一致。
  - git 信息页内容形态（ADR-0016 §2.2 卡片/列表级）：概要卡片（当前分支 /
    HEAD 短 sha / 变更计数）+ 最近提交列表（sha/author/subject）+ 变更文件行
    （porcelain 状态码 + path）；页签 id/类名/DOM 终稿归实施 SPEC（ADR 不预写）。
  - app.js 现况 2740 行 / app.css 597 行（本轮 `wc -l` 亲核）——插入段沿 BK-0034
    「app.js +224 纯插入」先例，既有行零删改。

### REQ-0040-05 · 数据消费与刷新语义（零轮询零 SSE）

- **Given** ADR-0016 §2.4 写死「打开页签即取（on-open fetch）+ 页内手动刷新；
  不引入轮询/不新增 SSE 消费」，**When** `server-sync.js`（现 147 行，本轮亲核）
  扩展 workbench 数据面：fetch 封装 + 缓存 + 回调（ADR-0006 边界：数据接入层
  不操作面板 DOM；BK-0034 +17−1 四函数先例形态），**Then** 前端打开 git 页签
  即取 E1、刷新控件重取；**零 run 事件接触**；`events.ts` 零改动；确需订阅
  run 事件或新增事件类型 → **中止转 needs-approval**。

### REQ-0040-06 · BK-0034 会话面板协同实测

- **Given** ADR-0016 §2.3 要求 BK-0040 实施 SPEC 实测浮动会话面板（BK-0034 已
  done，迭代 0032）与右栏工作台的互斥/共存行为（层级/z-index/焦点归属沿
  focus 判定机理扩展），**When** SPEC 轮实测两形态并定界，**Then** 定界结论
  （互斥或共存，择一并说明理由）写入实施 SPEC；无硬依赖（工作台数据源为项目
  状态非会话内容）。

### REQ-0040-07 · gate 场景增量与 golden 双通道

- **Given** gate 现况 **12 场景 s0~s11**（`gate.mjs:238-255` 本轮亲核：s0~s5 基础/
  在线态、s6/s7 日志面板、s8-agent-node、s9-goal-panel-online、s10-webshow-node、
  s11-termview-node）与 WF_ROUTES/RUN_ROUTES/SESSION_ROUTES 三 fixture 先例，
  **When** 新增右栏在线态场景（工作台打开 + git 页签激活的渲染态）与
  `WB_ROUTES` 类 fixture（E1 mock + 确定性等待 ready 探针——右栏打开即 fetch，
  无 mock 则内容呈错误/空态不定、像素不可复现，ADR-0016 §6），**Then**：
  - 新场景走 **golden-created 通道**落盘（基线 png 不存在即落盘并记
    golden-created，gate.mjs 既有机制）；**场景编号按落盘时序**，预期 s12+，
    与并行 BK-0038 路交错占号不锁死（ADR-0015 §5 落盘时序裁决先例：先落盘者
    保留号、后落者取下一号，ADR-0016 §6 同款纪律）。
  - **既有 s0~s11 零波及**——gate 全场景实测 diffPx=0，任一意外红即中止排查
    （不重录掩盖）；仅当 SPEC 选静态骨架化回退案时 s0 修宪轮重录（一次）。
  - gate.mjs 既有场景行与既有 fixture 零改动（纯插入新场景行 + 新 fixture）。

### REQ-0040-08 · smoke 扩断言（E1 契约组）

- **Given** `npm run smoke:server` 现况基线 **118 passed / 0 failed**（迭代 0034
  主干复测口径，metrics.md 0034 行），**When** 扩 E1 断言组：正常契约（六字段
  出参形态：branch/head/changes/commits）/ 404 无仓库路径（rev-parse 非零）/
  limit 校验（400 路径）/ git 白名单与超时纪律断言（源码级 /shell/ 零命中可沿
  MT 先例），**Then** 既有 118 断言零回退 + 新组全绿；测试实例与断言形态沿
  smoke 既有组结构（独立断言块，SPEC 定细节）。

### REQ-0040-09 · 手动 E2E 点位

- Given 本地起服务（后端 + web 构建产物），When 浏览器走查五点位：① 打开右栏
  页签条出现、默认属性页与现状零变化（选中节点渲染属性）；② 切 git 页签呈现
  概要卡片/提交列表/变更行（真实本仓 git 数据）；③ 页内刷新控件重取生效；
  ④ 切回属性页 renderProps 语义不变；⑤ 浮动会话面板（agent 节点双击入口）与
  右栏工作台共存行为符合 SPEC 定界（REQ-0040-06），Then 五点位全过、页面
  error 钩子零捕获（沿 0022 在线 E2E 口径）。

## 非功能要求

1. **安全面（硬性）**：git 子进程 argv 数组零 shell + 5s 超时 kill + 只读白名单
   （REQ-0040-03）；零出站（guard 面零涉，天然满足 Mimosa「服务端请求 URL 仅
   http/https + host 校验」约束——本轮无任何网络请求）；路径防越界机理本轮
   无涉（E1 无路径入参，tree 面归 BK-0042）。
2. **零新依赖**：package.json / package-lock.json 零变化（机器证明 = git diff
   恒空）；git 为系统命令、Node fs 内置。
3. **零 env**（REQ-0040-01）；**零 shared 契约**（REQ-0040-02/05）。
4. **文件规模**：新增源文件 ≤400 行；server.ts（254 行）仅追加注册行；
   server-sync.js（147 行）小扩；app.js/app.css 为存量冻结面纯插入。

## 不做范围（out of scope）

- **BK-0041 diff 审查页 / BK-0042 目录树页**：批次 2/3（含 E2/E3 端点与
  safePath 防越界面）——本轮 workbench 模块仅承载 E1；页签条可为 diff/tree
  预留占位但不得实现其内容。
- **轮询 / SSE 消费 / run 事件订阅**（ADR-0016 §2.4 写死）。
- **env 覆盖项**（WORKBENCH_ROOT 类，§3.0 写死零 env）；**git 可写命令**与
  **workbench 端点出站**（远程仓库 fetch 类）——溢出只读本地边界即另开
  needs-approval（ADR-0016 §8）。
- **节点/DEFS 面**：工作台是面板面非节点面（ADR-0016 §5 差异注记）——零
  nodes.baseline.json 重产、零 nodes-dirs/defs-drift/readme-consistency 联动、
  零 handler 注册。
- **BK-0050 节点库智能体类目**（本轮不选，理由见头部选题过程②）与并行路
  BK-0038 的 jsoncanvas 面（他路成果，本链零接触）。

## 验收标准（AC 汇总；细则已嵌 REQ 的 Given/When/Then）

| AC | 内容 | 口径 |
| --- | --- | --- |
| AC1 | `npm run build` 全绿 | 工作树内门禁 |
| AC2 | `npm run gate` 增量后全绿 | 新场景 golden-created 落盘 + **既有 12 场景（s0~s11）diffPx=0 实测**（零 gate:update，除非静态骨架化回退案的 s0 一次重录） |
| AC3 | `npm test` 零回退 | 契约测试 30/30 基线（0034 后口径）——本轮零 shared 触及为纯回归面 |
| AC4 | `npm run smoke:server` 扩断言全绿 | 118 基线零回退 + E1 组（契约/404/limit/纪律） |
| AC5 | 手动 E2E 五点位（REQ-0040-09） | 全过 + error 零捕获 |
| AC6 | 机器证明四零 | 零新依赖（lock diff 空）/ 零 env（config.ts 无新 key）/ 零 shared（packages/shared diff 空）/ #props 面零触碰（renderProps 及事件委托 diff 空） |

## 依赖与并行协同（本轮特定）

- **前置**：BK-0039 done（迭代 0030，ADR-0016 在库）——已满足；BK-0016/BK-0034
  为样板与协同对照物（均 done）。
- **后续解阻**：BK-0041 / BK-0042（复用本轮容器与页签基建，ADR-0016 §5）。
- **与并行路 BK-0038 的冲突预判（移交 merge 仲裁参考）**：重叠文件 = app.js /
  app.css / gate.mjs / tests/smoke（BK-0038 触 handlers 而本链触 server.ts——
  互斥）/ golden 目录。全部预计为「双方各自新增/各自插入」并存型冲突；golden
  新场景各占各号（按落盘时序，先落盘保留号）；gate 既有场景行双方零改动。
  0033/0034 合流先例（iterations/0034/MERGE.md）直接可循。
- **issue 回执口径**：BK-0040 来源 = issue#4；本迭代 done 后**仅发进度回执不
  关单**（链未竟：BK-0041/0042 在途），关单留 BK-0042 链终轮 CLOSE（沿
  issue#2/3 链先例）。

## SPEC 移交要点（M 项不免 SPEC）

1. workbench 模块文件切分（根锚定常量 / git 执行器 / E1 handler / 路由注册）
   与各文件行数预算；DOM 终稿（页签 id/类名/容器结构）与 app.css 选择器命名
   （#rightbar 布局扩展形态：页签条高度、#props/#workbench 切换机制）。
2. `WB_ROUTES` fixture 形态与 ready 探针（SESSION_ROUTES/s9 先例）。
3. BK-0034 协同实测方案（REQ-0040-06）与手动 E2E 五点位细化。
4. smoke E1 断言组结构（实例组织、无仓库 404 路径的测试形态——如临时非 git
   目录探针，SPEC 定）。
5. ADR-0016 行号锚点的 0031~0034 后漂移校正义务（本 PRD 已亲核的现值：
   Skeleton.tsx:137 / app.js:914 renderProps / server.ts:205-219 / code.ts:
   7,50,53 / tools.ts SANDBOX 区:15-21 / app.js 滚动恢复 :1027——SPEC 引用
   前逐一复核，沿 0027「行号偏移按代码事实转写」先例）。
