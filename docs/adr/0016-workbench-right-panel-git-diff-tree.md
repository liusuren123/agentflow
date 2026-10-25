# ADR-0016 · 会话面板右侧工作台分批修宪方案草案（右栏容器与 git 信息 / diff 审查 / 目录树三页签）

- 状态：**草案 · 待实施轮消费（BK-0040 右栏容器+git 修宪轮 / BK-0041 diff 审查修宪轮 /
  BK-0042 目录树修宪轮——链终轮）；授权链 = issue#4 用户批复承继
  （2026-10-23T15:49:17Z，见 BACKLOG BK-9004 行）**
- 日期：2026-10-25（BUILD 阶段产出，迭代 0030 / BK-0039，S 项 skipSpec——PRD §7 内嵌定界）
- 关联：BACKLOG BK-0039（本 SPEC 先行轮，done 归档于迭代 0030 CLOSE）/ BK-0040 /
  BK-0041 / BK-0042（三修宪实施轮，proposed）/ BK-9004（skipped，拆分母项）/
  BK-0016（sessions 五端点，done——端点契约与错误码样板）/ BK-0034（goal 会话面板，
  ready——入口协同对照物，§2.3）/ ADR-0015（一容器三批次分批修宪 + golden 双通道
  直系样板）/ ADR-0013（s8/s9 场景预定 + golden 双通道样板）/ ADR-0005（新端点
  v1-only 先例）/ ADR-0006（server-sync 数据接入边界）；ROADMAP T5-M3 智能体工作台
  UI（BK-9004 链，#4 序位）；POLICY.md 需批准区（UI 三层 / golden / env 语义）
- 版式对齐：ADR-0013 / ADR-0014 / ADR-0015

> **显著声明：本 ADR 为修宪方案草案，不实施任何代码、不引入任何依赖、不新增任何
> env 或出站类别、不改变任何运行时行为、不接触任何 golden 基线。全部容器 / 页签 /
> 端点改动仅以定界方案存在——定界到契约级（信息架构选项与推荐 / 端点路径·方法·
> 入参·出参·错误码 / 安全机理），不预写实现代码块与 DOM 终稿（终稿归各实施轮 SPEC，
> ADR-0015「不预写 DEFS 终稿」同款纪律）。实施归 BK-0040 / BK-0041 / BK-0042 修宪轮
> （授权链 = issue#4 批复承继 + 本 ADR）；本链零新依赖、零新 env、零新出站类别
> （本地只读：git 子进程 + 目录树遍历，§3/§4 论证），故无 ADR-0014 式「待用户批准」
> 位。本文件状态行在各实施轮 CLOSE 时按 ADR-0010/0012 先例更新，全文不出现批准态
> 措辞（始终为草案态标注）。**

## 1. 动机与现状证据

issue#4（BK-9004，用户批复 2026-10-23T15:49:17Z；2026-10-25 治理日拆分后由
BK-0039→0040→0041→0042 承继授权）注入的是**会话面板右侧工作台**：git 信息 /
diff 审查 compare / 项目目录树三页签。在 T5 差异化定位「画布编排 × 深度智能体
工作台」（ROADMAP.md:126-128）中，右栏工作台与 BK-0034 goal 会话面板同列 M3
工作台 UI 的支柱面：会话产出（代码/文档改动）需要在工作台内被直接看见——仓库
状态、变更对比与项目结构。

现状证据四条（本 BUILD 会话逐项亲核）：

- **右栏容器现状（宪法冻结面的事实依据）**：`Skeleton.tsx:136-137` 右侧属性面板
  `<aside id="rightbar"><div id="props"></div></aside>`——#props 是 #rightbar 的
  唯一住户；`app.css:23`（`--props-w:264px`）/`:333`（#rightbar 布局）/`:335`
  （#props 滚动容器）为两容器全部布局规则；`app.js` 对 #props 的全部操作面 =
  `:914` renderProps 渲染入口 + `:1001/:1037/:1065` change/click/input 三事件
  委托 + `:1025-1026` 滚动恢复 + `:2128` focus 归属判断（refreshPropsIfIdle
  不打断用户输入）。工作台容器（页签切换/共存形态）的任何 DOM 增删即触结构层与
  交互层——三批次修宪面的事实依据（§2 必答项①）。
- **workbench 能力差距（零现状）**：`apps/server/src` 全树 grep
  `workbench|WORKBENCH|PROJECT_ROOT` 零命中（本会话亲核）——后端无任何 git /
  diff / tree 端点，前端无工作台容器；`config.ts`（129 行）无项目根概念。
- **端点契约样板（BK-0016 地基）**：`server.ts:205-219` v1-only 路由族注册序——
  workflows/runs 七端点（:205-213，ADR-0005 立例「新端点仅注册 v1、无旧别名」）
  与 sessions 五端点（:215-219，BK-0016 立例）即 workbench 端点族的注册面样板；
  错误码风格对齐 sessions（`sessions.ts:46` 400 / `:52` 404 / `:77` 409，
  `{ error:'…' }` 形态）；`:197-203` /api/* 旧别名 base 不承接新端点
  （v1-only 先例，ADR-0005）。
- **子进程与防越界纪律先例（承载机理样板）**：`code.ts:7` spawn import、`:50`
  argv 数组形态（零 shell 拼接）、`:53` setTimeout 5s 超时 kill——git 调用同款
  纪律（§3.4 必答项②）；`tools.ts:16` SANDBOX 常量模块级锚定 + `:18-22` safePath
  （resolve 后前缀校验，越界 throw「路径越界：只允许访问沙箱目录」）——tree 端点
  项目根锚定与防 `../` 越界同构机理（§4 必答项③，锚定根不同：项目根而非 sandbox）。

## 2. 右栏容器信息架构定界（必答项①）

定界粒度 = 信息架构级（方案选项 + 利弊 + 推荐 + 影响面定性；**不预写 DOM 终稿与
页签伪代码**——终稿归各实施轮 SPEC）。三页签 = git 信息 / diff 审查 / 目录树
（issue#4 原文口径），数据源一律为 §3 workbench 端点——**不硬依赖 BK-0034 会话**
（工作台展示的是项目状态而非会话内容，PRD 背景 §8 口径；入口协同见 §2.3）。

### 2.1 属性面板共存方案（三选一）

| 方案 | 形态 | 利 | 弊 |
| --- | --- | --- | --- |
| A · 页签并入 #props | #props 顶部加页签条，属性面板成为「属性/git/diff/tree」四页签之一 | 零新容器；右栏视觉宽度恒定 | renderProps 与三事件委托（app.js:914/:1001/:1037/:1065）需整体重构，滚动恢复（:1025-1026）与焦点保持（:2128）逻辑全部复杂化；属性面板 DOM 结构大改 = 修宪面最大化 |
| B · 独立容器切换 | #rightbar 内 #props 旁新增兄弟容器（如 #workbench），右栏顶部件切换显示，二容器互斥 | **#props 零触碰**（属性面板渲染/事件/焦点面冻结保持）；app.js 新模块纯插入 + app.css 新选择器纯插入（宪法第 4 条机械移植纪律的增面延伸，ADR-0015 §4 同款） | 右栏顶部件（页签条/开关）本身是新 DOM；#rightbar 布局规则需扩展（app.css:333 声明面） |
| C · 会话面板联动开关 | 工作台入口挂 BK-0034 会话面板，会话进行中展开右栏 | 情境化入口直觉（会话 → 工作台） | 硬耦合 BK-0034（ready 未实施、内部结构未定）；入口单一（无会话则无工作台）；与「工作台数据源非会话」定位矛盾 |

**推荐 = B**：#props 零触碰把修宪面收敛到「新增容器 + 新增顶部件」纯插入面；
A 的重构波及属性面板全部既有交互语义（风险最大的修宪形态）；C 记为**入口增强
可选项**而非容器方案（§2.3）。

### 2.2 三页签结构（信息架构级）

| 页签 | 名称草案 | 数据源（§3） | 主内容形态（卡片/列表级，非 DOM） |
| --- | --- | --- | --- |
| git | 仓库 | E1 git 信息 | 概要卡片：当前分支 / HEAD 短 sha / 变更计数；最近提交列表（sha/author/subject）与变更文件行（porcelain 状态码 + path） |
| diff | 变更 | E2 diff 审查 | ref 对选择行（默认 HEAD ↔ 工作区）+ 文件列表（状态/±行数）+ 选中文件对比视图（补丁文本等宽呈现，截断由端参控） |
| tree | 目录 | E3 目录树 | 缩进树（目录/文件/折叠占位行），默认深度展开，点击展开下钻（逐次带 path 前缀请求 E3） |

页签 id / 类名 / DOM 终稿归 BK-0040 实施 SPEC（本 ADR 不预写）；三页签数据面
全部经 server-sync.js 扩展消费（ADR-0006 边界：fetch 封装 + 缓存 + 回放映射，
不操作面板 DOM——workbench 数据面同款落点）。

### 2.3 入口交互与 BK-0034 协同

- **入口（推荐案）**：右栏顶部件常驻页签条（§2.1 B 案载体）——默认「属性」页 =
  现状零变化；点 git/diff/tree 切至工作台对应页，再点回属性。备选：顶栏标签页区
  入口 / 会话面板联动入口（C 案，BK-0034 落地后作为第二入口实测协同——非硬依赖）。
- **BK-0034 协同**：实施序上 BK-0033/0034 先于本链（ROADMAP.md:189-190 BK-9002
  链 → :193-194 BK-9004 链）；BK-0040 实施 SPEC 须实测两形态（浮动会话面板 vs
  右栏工作台）的互斥/共存行为并定界（层级/z-index/焦点归属沿 app.js:2128
  focus 判定机理扩展）。

### 2.4 数据消费与刷新语义

打开页签即取（on-open fetch）+ 页内手动刷新控件；**不引入轮询 / 不新增 SSE
消费**——workbench 数据是项目状态而非 run 流（零 run 事件接触；若实施轮确需
订阅 run 事件或新增事件类型即触 shared 契约面，中止转 needs-approval，
BK-0016 先例口径）。

### 2.5 前端三文件影响面定性（每批相同结构）

- `app.js`：workbench 模块新增（容器动态创建 + 页签切换 + 三页签渲染/数据消费）
  ——**动态创建优先**（沿 BK-0034「动态创建，Skeleton 预期零改动」先例口径）：
  s0 基线零波及，工作台打开态进新场景；静态骨架化（Skeleton.tsx 挂载点）为回退
  案——若实施轮选此案则 s0 必然受波及、修宪轮重录，实施 SPEC 定夺。
- `app.css`：#workbench 及页签/列表/树选择器纯插入（#rightbar/#props 既有声明
  零改动）。
- `Skeleton.tsx`：动态创建案下预期零改动。

## 3. workbench 只读端点契约定界（必答项②）

落点 = `apps/server/src/workbench/` 新模块（BACKLOG BK-0040 行内既定：只读、限
项目根，自主区面，可同迭代先行段）；server.ts 注册沿 v1-only 先例
（`/api/v1/workbench/*`，无 /api/* 别名——ADR-0005 / server.ts:197-203 口径）；
**零 shared 契约**（workbench 为面板数据源非节点/SSE 面，同 sessions 五端点不进
packages/shared 先例）；**零出站**（全部本地：git 子进程 + Node fs）。

| 端点 | 方法 | 承载 | 错误码 |
| --- | --- | --- | --- |
| E1 /api/v1/workbench/git | GET | git 子进程（§3.4 白名单三命令） | 404 / 500 |
| E2 /api/v1/workbench/diff | GET | git 子进程（git diff 一命令） | 400 / 404 / 500 |
| E3 /api/v1/workbench/tree | GET | Node fs 遍历（非 git） | 400 / 404 / 500 |

### 3.0 项目根锚定（必答项 · 零 env 推荐案）

- **推荐案：模块级常量锚定（SANDBOX 同构）**——沿 `tools.ts:16` 机理
  （import.meta.url 一次性 resolve，模块加载即冻结，不随运行时 cwd 漂移），层级
  自 dist 产物上溯两级（`apps/server/dist` → `apps/server` → 仓库根）。利：
  确定性（与启动方式无关）、与既有沙箱锚定同构同风格。弊：锚定层级硬编码
  （dist 布局变化需同步——影响面 = 该常量一行）。
- **process.cwd() 案（评估后否决）**：本会话实测 `npm start -w @agentflow/server`
  形态下进程 cwd = `apps/server`（workspace 脚本以 workspace 目录为 cwd，本机
  亲测输出 `…\agent-workflow\apps\server`）而非仓库根——「cwd 即项目根」的假设
  在本仓启动拓扑下不成立（tree 页会错锚为 apps/server 子树）；仅当以仓库根为
  cwd 直接 `node apps/server/dist/server.js` 时成立。故不采。
- **零 env 护栏（写死）**：本链不新增任何环境变量语义（无 WORKBENCH_ROOT 类
  覆盖项）；实施轮若评估反转（确需 env 覆盖锚定根），即触 POLICY 需批准区
  「新增环境变量语义」——立即中止转 needs-approval（沿 ADR-0014 附录 A 先例，
  父项批复不自动覆盖 env 面），不得写入实施。

### 3.1 E1 git 信息：GET /api/v1/workbench/git

- 入参：query `limit`（可选，最近提交条数，默认 20、1-100——对齐 server.ts:173
  limit 校验风格）。
- git 命令白名单（逐条，全部只读）：`git rev-parse --is-inside-work-tree`（仓库
  探测）；`git status --porcelain=v1 --branch`（分支 + 变更行）；`git log -n
  <limit> --format=<固定格式串>`（最近提交：sha / 短 sha / author / 时间戳 /
  subject）。
- 出参（契约级字段清单）：`{ branch, head, changes:[{ status, path, from? }],
  commits:[{ sha, short, author, ts, subject }] }`。
- 错误码：404 项目根非 git 仓库（rev-parse 非零，`{ error:'not a git repository' }`）；
  500 git 超时 / 退出码异常。

### 3.2 E2 diff 审查：GET /api/v1/workbench/diff

- 入参：query `base` / `head`（ref 对；缺省默认 base=HEAD、head=工作区）；
  `path`（可选子路径前缀，过 §4 防越界校验）；`stat`（可选，仅统计模式）。
- ref 安全面（写死）：ref 仅作 argv 单元素传递（零 shell 拼接，§3.4 纪律）+
  字符白名单校验（`^[A-Za-z0-9._/@-]+$` 且不以 `-` 开头——拒绝选项注入与空串），
  非法即 400。
- git 命令白名单：`git diff --no-color [--stat] <base> [<head>] [-- <path>]`
  （head 缺省即 base ↔ 工作区形态）。
- 出参：`{ files:[{ path, status, adds, dels, patch }], truncated }`（patch 截断
  上限实施 SPEC 定）。
- 错误码：400 ref 非法 / path 越界；404 无仓库；500 超时。

### 3.3 E3 目录树：GET /api/v1/workbench/tree

- 入参：query `path`（可选子目录前缀，默认根；过 §4 防越界校验）；`depth`
  （可选，默认 2、1-6）。
- 承载：Node fs 遍历（非 git 命令）；忽略/折叠规则（契约级）：`.git` 恒不入树；
  `node_modules` / `dist` / `data` / 构建产物目录折叠为占位行（清单终值实施
  SPEC 定）；条目数上限截断 + `truncated` 标记（防大仓爆响应）。
- 出参：`{ root:{ name, path, children:[{ name, type:'dir'|'file', size?,
  children? }] }, truncated }`。
- 错误码：400 path 越界；404 子路径不存在；500 遍历异常。

### 3.4 git 子进程承载纪律（E1/E2 共同，code.ts 同构）

- **argv 数组形态、零 shell**：`spawn('git', [args], …)`（code.ts:50 同构）——
  一切外部输入（ref / path / limit）只作 argv 元素，永不拼接命令行字符串。
- **超时强杀**：5s setTimeout kill（code.ts:53 同构数值），超时即 500。
- **只读命令白名单不变式（写死）**：白名单 = §3.1/§3.2 逐条列明的 rev-parse /
  status / log / diff 四命令；**一切可写命令（add / commit / push / pull /
  checkout / reset / clean / merge / rebase / stash 等）一律排除**——workbench
  对仓库零写入、零副作用（只读工作台定位）。
- 工作目录：git 子进程 cwd 显式设为项目根常量（§3.0），不依赖进程 cwd。

## 4. 路径防越界与安全面（必答项③）

- **safePath 机理同构转写（锚定根 = 项目根）**：`path.resolve(ROOT, input)` 后
  校验 `p === ROOT || p.startsWith(ROOT + path.sep)`，否则 400（tools.ts:18-22
  同款机理——resolve 归一再前缀比对，防 `../` 逃逸与绝对路径注入；`:19` 的首段
  斜杠剥离仅 sandbox 前置转换需要，workbench 不移植该步——越界即拒，不做修复式
  放行）。
- **只读不变式**：三端点全 GET、零写操作（git 白名单 §3.4 + fs 仅 readdir/
  stat）；对仓库与工作区零副作用。
- **零出站声明（写死）**：workbench 端点零网络请求——guard.ts 面无涉（status
  quo 零变化）；git 为系统既有命令、fs 为 Node 内置——**零新依赖**（lock 零变化
  为机器证明）。
- **零 env 声明（写死）**：§3.0 推荐案零 env；反转即中止转 needs-approval。
- **secrets 面**：git 输出（log/status/diff）为仓库本地内容，与本地 `git diff`
  同可见性，不新增凭据类暴露面；diff patch 含敏感内容属仓库自身内容范畴，实施
  SPEC 复核是否需展示侧截断提示。

## 5. 分批修宪编排（一页签一迭代，ADR-0015 §5 同构改写）

实施序 **BK-0040（右栏容器 + git 信息页，批次 1——容器为本链共享基建先行）→
BK-0041（diff 审查页，批次 2）→ BK-0042（目录树页，批次 3，链终轮）**（BACKLOG
拆分既定 + ROADMAP.md:193-194 链序）；一页签一迭代，每批 = 一个修宪轮（授权链 =
issue#4 批复承继 + 本 ADR）+ 本 ADR 一次增补（状态行按 ADR-0010/0012 先例更新 +
§7 对应行追加实施纪要）。每批受影响面**四件套**：

| 批 | ① 前端三文件 | ② 后端 workbench 端点 | ③ smoke 扩断言 | ④ gate 场景增量 |
| --- | --- | --- | --- | --- |
| 0040 容器+git | 容器 + 页签条 + git 页（§2） | workbench 模块 + E1（§3.1）+ server.ts 注册 | E1 契约 / 404 / limit 校验 | 右栏在线态新场景 + 既有场景实测 |
| 0041 diff | diff 页签 + 对比视图（复用容器） | E2（§3.2） | E2 契约 / ref 校验 / 400 | diff 页在线态场景增量 |
| 0042 tree | 目录树页签（复用容器） | E3（§3.3） | E3 契约 / 防越界矩阵 | tree 页在线态场景增量 |

与 ADR-0015 §5 的同构/差异注记：同构 = 一页签（节点）一迭代 + 四件套结构 +
链终轮回执关单；差异 = **不涉 shared DEFS**（工作台是面板面非节点面——无
nodes.baseline.json 重产、无 nodes-dirs / defs-drift / readme-consistency 联动），
受影响面为「前端三文件 + 后端 workbench 端点 + smoke 扩断言 + gate 场景增量」
（BACKLOG :53-55 行内口径）。BK-0042 链终轮 CLOSE 时回执 issue#4 关单（中间
子项不回执，沿 issue#10/11 终轮先例）。

## 6. golden 增量预案（双通道，ADR-0015 §6 直系样板）

双通道口径：**新增场景走 golden-created 通道**（基线 png 不存在即落盘并记
golden-created，gate.mjs 既有机制）；**受波及既有场景经修宪轮 gate:update 重录**
（迭代 0013 先例）。本 ADR 只列场景形态与波及面，不写 gate.mjs 代码（各实施
SPEC 定）。

- **每批一个右栏在线态新场景**：工作台打开 + 该页签激活的渲染态（git 概要卡片 /
  diff 对比视图 / 缩进树）。**场景编号按落盘时序**——s8/s9 已由 ADR-0013 §6
  预定（BK-0033/0034），s10+ 预期由呈现三件套链（ADR-0015 §6）与本链按实际
  落盘序交错占号，不锁死具体号（ADR-0014/0015 同款纪律）。
- **既有场景波及面预期**：s0~s2 / s4~s7 预期零波及（动态创建案下 s0 不动，
  §2.5）——gate 全场景实测确认，任一意外红即中止排查；若实施轮选静态骨架化
  回退案，s0 受波及修宪轮重录。
- **WB_ROUTES 路由 fixture 需求评估**：右栏在线态场景需 mock workbench 三端点
  （E1/E2/E3）——右栏打开即 fetch，无 mock 则页签内容呈错误/空态不定，像素不可
  复现；预期需要 `WB_ROUTES` 类 fixture（WF_ROUTES/RUN_ROUTES 先例，
  gate.mjs:181-184），形态与确定性等待（ready 探针）归各实施 SPEC。

## 7. BK-0040~0042 定界回写索引（权威字面量）

以下三个代码块 = BACKLOG 对应行**备注列的权威回写字面量**（BUILD 已逐字粘贴
回写，其余列含状态 proposed 逐字不动；回写随归档提交入库；VERIFY 以本节为
VERBATIM 比对基准——BK-0027 VERBATIM-OK 标准）。晋升条件：BK-0039 CLOSE 后
晋升（BK-0040 先行）；BK-0041/BK-0042 = 前置 CLOSE 后随链晋升；BK-0042 链终轮
CLOSE 时回执 issue#4 关单。

```text
触UI=是——修宪轮（授权链 = issue#4 批复承继 2026-10-23T15:49:17Z + ADR-0016（§2 容器信息架构/§3.1 E1 契约/§3.4 git 子进程纪律/§4 安全面/§5 编排/§6 golden 预案），定界字面一致——ADR-0016 §7 本行即权威字面量）：受影响文件=前端三文件（右栏容器（B 案独立容器切换：#props 旁新增兄弟容器 + 右栏顶部件页签条，#props 零触碰，ADR-0016 §2.1）+ git 信息页签（概要卡片/提交列表/变更行，ADR-0016 §2.2），容器为本链共享基建；app.js workbench 模块动态创建纯插入 + app.css 新增选择器纯插入 + Skeleton.tsx 预期零改动（动态创建案；回退案静态骨架化则 s0 修宪轮重录，ADR-0016 §2.5））+ 后端承载 apps/server/src/workbench/ 新模块（E1 GET /api/v1/workbench/git：limit 入参/branch+head+changes+commits 出参/git 白名单 rev-parse+status+log 三命令/404 无仓库/500 超时，ADR-0016 §3.1；git 子进程 argv 数组零 shell + 5s 超时 kill + 只读命令白名单（可写命令一律排除），ADR-0016 §3.4；项目根=模块级常量锚定（SANDBOX 同构、dist 上溯两级），零 env，ADR-0016 §3.0；自主区面，可同迭代先行段）+ server.ts v1-only 注册（沿 :205-219 先例）+ server-sync.js workbench 数据面（ADR-0006 边界）+ smoke 扩断言（E1 契约/404/limit 校验）+ gate 场景增量（右栏在线态新场景 golden-created + 既有场景零波及 gate 实测确认，场景编号按落盘时序，ADR-0016 §6）；验收命令口径=npm run build + npm run gate（增量后全绿、既有场景零波及实测）+ npm test + npm run smoke:server 扩断言 + 手动 E2E（打开右栏/切页签/呈现 git 信息点位，实施 SPEC 定）；依赖关系=前置 BK-0039（done，迭代 0030 ADR-0016 落盘），且须先于 0041/0042（容器先行）；实施序=BK-0040 → BK-0041 → BK-0042（一页签一迭代，ADR-0016 §5）；晋升条件=BK-0039 CLOSE 后晋升
```

```text
触UI=是——修宪轮（授权链 = issue#4 批复承继 2026-10-23T15:49:17Z + ADR-0016（§2.2 diff 页签/§3.2 E2 契约/§3.4 git 子进程纪律/§4 安全面/§5 编排/§6 golden 预案），定界字面一致——ADR-0016 §7 本行即权威字面量）：受影响文件=前端三文件（diff 审查页签：ref 对选择行 + 文件列表（状态/±行数）+ 选中文件对比视图（补丁等宽呈现），ADR-0016 §2.2；复用 BK-0040 容器与页签基建；app.js 纯插入 + app.css 新增选择器纯插入 + Skeleton.tsx 预期零改动）+ 后端承载 workbench 模块 E2 端点（GET /api/v1/workbench/diff：base/head ref 对（缺省 HEAD↔工作区）+ path 子前缀 + stat 可选入参/ref 字符白名单校验拒选项注入/files+truncated 出参/git 白名单 git diff --no-color 一命令/400 ref 非法或 path 越界/404 无仓库/500 超时，ADR-0016 §3.2）+ smoke 扩断言（E2 契约/ref 校验/400 路径）+ gate 场景增量（diff 页在线态新场景 golden-created + 既有场景零波及 gate 实测确认，场景编号按落盘时序，ADR-0016 §6）；验收命令口径=npm run build + npm run gate（增量后全绿、既有场景零波及实测）+ npm test + npm run smoke:server 扩断言 + 手动 E2E（diff 呈现点位，实施 SPEC 定）；依赖关系=前置 BK-0039 done + BK-0040（容器）；实施序=BK-0040 → BK-0041 → BK-0042；晋升条件=两者 CLOSE 后随链晋升
```

```text
触UI=是——修宪轮（授权链 = issue#4 批复承继 2026-10-23T15:49:17Z + ADR-0016（§2.2 tree 页签/§3.3 E3 契约/§4 防越界（safePath 机理同构、锚定根=项目根）/§5 编排/§6 golden 预案），定界字面一致——ADR-0016 §7 本行即权威字面量）：受影响文件=前端三文件（目录树页签：缩进树/折叠占位/逐级下钻（带 path 前缀请求），ADR-0016 §2.2；复用 BK-0040 容器与页签基建；app.js 纯插入 + app.css 新增选择器纯插入 + Skeleton.tsx 预期零改动）+ 后端承载 workbench 模块 E3 端点（GET /api/v1/workbench/tree：path 子前缀（默认根）+ depth 入参/Node fs 遍历非 git/.git 恒不入树 + node_modules/dist/data 折叠占位 + 条目上限 truncated/children 树形出参/400 path 越界（resolve 后前缀校验，tools.ts safePath 机理同构、锚定根=项目根，ADR-0016 §4）/404 子路径不存在/500 遍历异常，ADR-0016 §3.3）+ smoke 扩断言（E3 契约/防越界矩阵含 ../ 与绝对路径注入）+ gate 场景增量（tree 页在线态新场景 golden-created + 既有场景零波及 gate 实测确认，场景编号按落盘时序，ADR-0016 §6）；验收命令口径=npm run build + npm run gate（增量后全绿、既有场景零波及实测）+ npm test + npm run smoke:server 扩断言 + 手动 E2E（树呈现/展开点位，实施 SPEC 定）；依赖关系=前置 BK-0039 done + BK-0040；实施序=BK-0040 → BK-0041 → BK-0042；晋升条件=两者 CLOSE 后随链晋升；**本链终轮**——CLOSE 时回执 issue#4 关单（沿 issue#10/11 终轮先例，中间子项不回执）
```

## 8. 影响面与不做范围

- **本轮（BK-0039）零代码 / 零依赖 / 零 env / 零出站 / 零 shared 契约 / 零 UI /
  零 golden**：本文件纯新增 + BACKLOG 三行定界回写（随归档提交）；`apps/**`、
  `packages/**`、`tools/**`、`tests/**`、`.github/**`、package.json / lock 零
  改动（机器证明 = 对上述路径 git diff 恒空；lock 零变化 = 零依赖）。
- BK-0040 / BK-0041 / BK-0042 是修宪实施轮（前端三文件 + workbench 端点 +
  smoke + gate 场景增量面），按 §5/§6/§7 消费本 ADR；链晋升 ready 前不实施。
- BK-0033/0034（BK-9002 链实现段）、BK-0036~0038（呈现链，ADR-0015 射程）/
  BK-0045（PTY，ADR-0014 射程）均不在本 ADR 射程；「新增 env 语义
  （WORKBENCH_ROOT 类）」「git 可写命令接入」「workbench 端点出站（远程仓库
  fetch 类）」任何溢出只读本地边界的提案不在本 ADR 推荐案内（若实施轮确需，
  按需批准面另开 needs-approval）。
