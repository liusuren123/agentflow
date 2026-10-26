# SPEC · 迭代 0054 · BK-0041 工作台·diff 审查 compare 页（后端 E2 diff 端点 + UI，修宪轮，BK-9004 链批次 2）

> 产出角色：spec-designer（SPEC 轮，2026-10-27 00:54）。输入：`iterations/0054/PRD.md`
> （PLAN 产物）+ ADR-0016（定界权威：§2.2 diff 页签 / §3.2 E2 契约 / §3.4 git 子进程
> 纪律 / §4 安全面 / §5 编排 / §6 golden 预案 / §7 第二代码块 = BK-0041 权威字面量）
> + 本会话只读代码核实（§0 锚点表，全部指针本会话实读，工作树 HEAD=d880b62）。
> 权威顺位：CONSTITUTION > AGENTS > WORKFLOW > POLICY > ADR-0016 > PRD > 本 SPEC。
> **基线口径**：gate 17 场景 s0~s16 全绿 / npm test 30/30 / smoke 138/0（PRD §1/§5
> PLAN 轮亲核在案；本 SPEC 轮未重跑——BUILD 开工前须按 AGENTS「改动前 gate 确认
> 基线绿」标准动作在**本工作树**重测并留档，任一红即中止排查后再开工）。
> **ADR 处置：零新 ADR（needsAdr=false）**——本迭代全部架构决策已由 ADR-0016 承载
> （迭代 0030 落盘，授权链 = issue#4 用户批复承继 2026-10-23T15:49:17Z + 本 ADR），
> 本 SPEC 仅消费之；落地级设计（diff.ts 文件切分 / stat 模式承载与出参形态 /
> DOM 终稿 / fixture 与 smoke 断言组织）均在 ADR-0016「终稿归实施 SPEC」授权面内
> （§2.2/§3.2/§6），沿迭代 0036 SPEC ADR 处置先例（needsAdr=false）。唯一值得
> 显著标注的定形偏差 = stat 模式以 `--numstat` 落地（§3.1.3，ADR-0016 §3.2 正文
> `[--stat]` 为契约级示意 flag，出参形态明文「归 SPEC」；差异、理由与不变式保持
> 论证见该节，并写入 ADR-0016 实施纪要供 VERIFY/用户复核）。ADR-0016 的**实施轮
> 增补**（状态行 BK-0041 消费标注 + §7 第二代码块尾追加实施纪要，ADR-0016 §5
> 条款）是 BUILD 产品提交的兑现义务（§2 表 #12）。

## 0. 代码锚点现值（本会话逐项亲核；沿迭代 0027/0036「行号按代码事实转写」先例）

| 锚点 | 记值来源 | 本轮亲核现值 | 判定 |
| --- | --- | --- | --- |
| app.js workbench 模块段 | PRD §1（:2950 起） | :2950-3037（注释块 :2950-2959 起至 wbRenderGit 尾 :3037） | 在案 |
| app.js diff 页签占位 | PRD §1（`mk('diff','变更',true)`） | :2965-2966 mk 定义 + **:2970** `mk('diff','变更',true)`；tree 同款占位 | 在案 |
| app.js wbEnsure topbar | — | :2978-2983（`.wb-title`「仓库信息」字面量 :2980；`.wb-refresh` :2981） | 在案 |
| app.js refresh 处理器 | — | :2984-2986（固定 `refreshWorkbenchGit()+wbRenderGit()`，未按页派发） | 在案（本轮扩） |
| app.js wbOpen / wbSwitch | PRD §1 | wbOpen :2990-2994（缺省 'git'）；wbSwitch :2996-3005（`wb-page-git` toggle :2999；git 分支 :3001-3004） | 在案 |
| app.js 空画布右键入口 | 0036 SPEC §3.4 | :1711 `{ic:'git-branch',t:'工作台 · 仓库信息',f:()=>wbOpen('git')}` | 本轮**零改动** |
| app.css wb 家族 | PRD §1（:624-634） | :623-660；**:634** `.wb-tab:disabled{opacity:.4;cursor:default}`；:636-637 `wb-page-git` 视图切换对 | 在案 |
| server.ts 头注/注册 | PRD §7（:17/:236） | 头注 workbench 行 :17-19；import :49；注册 **:236**（:235 注释行） | 在案 |
| workbench 模块三文件 | PRD §1 | root.ts 15 行（PROJECT_ROOT :14-15）/ git.ts 82 行（runGit :24-41 **未导出**；WorkbenchGitError :16-20 已导出；rev-parse 探针形态 :46-49）/ routes.ts 26 行 | 在案（runGit 本轮导出） |
| server-sync.js 数据面 | PRD §1 | fetchWorkbenchGit :44；SVR.wbGit/wbGitErr :85-86；wbGitArrive :91；onWorkbenchGitArrive :96；refreshWorkbenchGit :120-124 | 在案 |
| gate.mjs | PRD §1/§7 | 头注 :4「17 个 golden 场景」+ :5-8 枚举；WB_ROUTES :361-373；wbOpen :374-384；wbReady :387-390；wbInv :393-400；SCENARIOS :402-434；s16 行 :432-433 | 在案 |
| smoke B 组 | PRD §1/§7 | 头注 B 组 blurb :32-36；B 组 :1449-1579（B01 :1456 / B04 探针 :1496-1562 / B05 源扫描 :1563-1579，文件清单恰 root/git/routes 三文件） | 在案 |
| s16 基线不变量 | — | `wbTabs:["props","git*","diff!","tree!"]`（本轮亲读 invariants.json）——**diff 解禁后 `diff!`→`diff`，png+不变量双受波及**（§6 重录依据） | 在案 |
| `wb-diff` 前缀占用 | — | `grep -rn "wb-diff\|wbDiff" apps/web/src` 零命中（本会话实跑，exit 1） | 无碰撞 |
| smoke 固定提交对 | — | `d880b62^` == `ed2f8ed`（本会话 `git rev-parse` 亲核）；`git diff --no-color --numstat ed2f8ed d880b62` = 恰 2 行 `21 7 .zcode/...dwf.ts` + `2 2 docs/evolution/STATE.md`（非二进制、无改名、历史不可变 → 确定性断言基） | 在案 |

## 1. 范围与护栏

- **修宪轮**（宪法第 3 条通道）：授权链 = ADR-0016 + issue#4 用户批复承继
  （2026-10-23T15:49:17Z，PRD §0 引 BACKLOG BK-9004 行在案）+ 同迭代 golden 增量
  （§6：s17 新增 golden-created + **s16 受波及恰一次 gate:update 重录**）。触碰面
  = UI 三层增量：视觉（diff 页签由禁用态转可用态 + diff 页渲染态）、结构（diff 页
  DOM 动态创建 + app.css 新选择器纯插入）、交互（页签切换扩 diff 分支 / on-open
  fetch / ref 对与路径过滤输入 / 页内刷新派发 / 文件行选中）。
- **四零（机器证明，PRD §4）**：零新依赖（package.json / package-lock.json diff
  恒空）、零 env（`apps/server/src/config.ts` diff 恒空；无 WORKBENCH_ROOT 类，
  ADR-0016 §3.0 写死）、零 shared 契约（`packages/shared/**` diff 恒空；E2 为面板
  数据源非节点/SSE 面，sessions/E1 先例）、零出站（E2 全本地 git 子进程，
  `guard.ts` diff 恒空——guard 面零涉）。
- **#props 面冻结（B 案核心承诺延续）**：renderProps / 三事件委托 / 滚动恢复 /
  refreshPropsIfIdle 既有行零改动（0036 SPEC §1 同款清单）；`Skeleton.tsx` 零改动
  （动态创建案延续，ADR-0016 §2.5——diff 页内容全部在 `#workbench .wb-scroll`
  动态渲染，无静态骨架挂载）。
- **「纯插入」的精确口径（本 SPEC 裁定，PRD §3 语）**：BK-0041 权威字面量言
  「app.js 纯插入 + app.css 新增选择器纯插入」——其中 app.js 含 `mk('diff','变更',
  false)` 解禁（PRD REQ-0041-02 明文），该改动本身即对 :2970 一行的字面修改，
  故「纯插入」的机器核对口径定为：**workbench 模块段（:2950-3037）之外零 diff**
  （含 :1711 右键入口行零改动——diff 页经页签切换到达，不新增菜单项）；段内允许
  行级扩改（§3.5 逐处列明：解禁 / 标题动态化 / 刷新派发 / wbSwitch 扩分支 /
  wbRenderDiff 纯插入）。app.css / smoke-server.mjs / gate.mjs 的既有行仍按
  「删除行=0」严口径（gate 头注计数行除外，§3.7.3）。git.ts 的 runGit 导出为
  后端源码非 UI 面，不受此口径约束。
- **只读白名单不变式（写死，ADR-0016 §3.4）**：E2 仅增 `git diff` 承载 + 复用
  rev-parse 探针；一切可写命令（add/commit/push/pull/checkout/reset/clean/merge/
  rebase/stash）一律排除——B12 源扫描机器断言（§3.8）。
- **中止转 needs-approval 条款**（任一命中即中止本迭代，PRD §8）：确需订阅 run
  事件 / 新增 SSE 事件类型 / 新增 env 语义 / 端点出站 / git 可写命令接入 /
  diff 选项透传面扩大（`-w`/`--ignore-*` 等用户级透传，PRD out-of-scope）。
- 不做范围：tree 页签（BK-0042 射程，**禁用占位态像素零变化**）；diff 内跳转
  编辑或 stage/commit 写操作；远程仓库出站；UI 层 stat 开关（stat 为 API 级能力，
  前端不暴露开关——PRD REQ-0041-02 页内容清单无此项，§3.5）；轮询/SSE 刷新。

## 2. 受影响文件清单（产品提交白名单；`git ls-tree`/`git show --numstat` 核对基准）

| # | 文件 | 动作 | 行级说明与预算 |
| --- | --- | --- | --- |
| 1 | `apps/server/src/workbench/diff.ts` | 新增 | ~170 行：E2 承载——校验 + collectDiff 双模式解析 + 截断（§3.1；≤400 行红线裕量充足） |
| 2 | `apps/server/src/workbench/git.ts` | 改（1 词） | :24 `function runGit` → `export function runGit`（复用执行器；E1 语义零变化，§3.1.1） |
| 3 | `apps/server/src/workbench/routes.ts` | 改（扩） | +~45 行（26→~70）：workbenchDiffHandler（§3.2） |
| 4 | `apps/server/src/server.ts` | 改（纯插入） | +2 行可执行（import 扩项/并列行 + :236 后注册行）+ 头注 :17-19 区补 diff 端点 1 行（BK-0056 同型活清单纪律，0036 先例即此形态） |
| 5 | `apps/web/src/server-sync.js` | 改（纯插入） | +~15 行：fetchWorkbenchDiff / SVR.wbDiff+wbDiffErr / wbDiffArrive+onWorkbenchDiffArrive / refreshWorkbenchDiff（§3.4） |
| 6 | `apps/web/src/legacy/app.js` | 改（段内扩） | +~90 行纯插入 + 段内 3 处行级扩改（:2970 解禁 / :2980 标题动态化 / :2984-2986 刷新派发）；**段外零 diff**（§1 口径，§3.5） |
| 7 | `apps/web/src/app.css` | 改（纯插入） | +~35 行：`wb-page-diff` 视图切换对 + wb-diff 家族选择器，:660 文件尾追加（:623-660 既有行零改动，§3.6） |
| 8 | `tools/pixel-gate/gate.mjs` | 改（增量） | +~35 行：WB_ROUTES 扩 E2 mock 路由 + wbDiffOpen/wbDiffReady/wbDiffInv + s17 场景行（纯插入）+ 头注 :4 计数 17→18 与 :5-8 枚举行同步（§3.7；85067b6 先例） |
| 9 | `tests/golden/ui/s17-workbench-diff-online.png` + `.invariants.json` | 新增 ×2 | golden-created 通道落盘（§6；零 gate:update） |
| 10 | `tests/golden/ui/s16-workbench-git-online.png` + `.invariants.json` | 重录 ×2 | 修宪轮 `npm run gate:update` **恰一次**（§6；预判依据 PRD §1 + §0 s16 基线 `diff!` 亲读） |
| 11 | `tests/smoke/smoke-server.mjs` | 改（纯插入 + 头注 blurb 增补） | +~120 行：B06-B12 七条断言（§3.8）+ 头注 :32-36 B 组 blurb 增补 B06-B12 描述（BK-0057 纪律：编排序 :5 不变——B 组已在列，组内扩断言不动组序） |
| 12 | `docs/adr/0016-workbench-right-panel-git-diff-tree.md` | 改 | 状态行 BK-0041 消费标注 + §7 第二代码块尾实施纪要一行（ADR-0016 §5 增补义务；草案态措辞不变；纪要含 §3.1.3 `--numstat` 定形记录） |

**禁区（零 diff 机器证明面）**：`Skeleton.tsx`、`packages/shared/**`、
`package*.json`、`apps/server/src/config.ts`、`apps/server/src/guard.ts`、
`apps/server/src/workbench/root.ts`（PROJECT_ROOT 复用零改动）、`.env.example`、
`tests/golden/ui/` 除 #9/#10 外全部（既有 32 文件零触碰）、gate.mjs 既有场景行与
既有 fixture（WB_ROUTES 数组内纯追加一项）、app.js workbench 段外全部、app.css
:623-660 既有行、smoke B01-B05 既有断言（B 组新断言纯插入于 B05 块后）、
`CONSTITUTION.md`/`AGENTS.md`/`.github/**`。

## 3. 实现设计

### 3.1 后端 E2 承载：新增 diff.ts（#1）+ git.ts 导出 runGit（#2）

#### 3.1.1 执行器复用（零复制）

`git.ts:24` runGit（argv 数组 spawn / 5s setTimeout 强杀 / cwd=PROJECT_ROOT /
`WorkbenchGitError{kind:'not-repo'|'failed'}`）已承载 ADR-0016 §3.4 全部纪律，
E2 **复用不复制**：唯一改动 = :24 加 `export` 关键词（WorkbenchGitError :16 已
导出）。rev-parse 仓库探测同 E1 形态（git.ts:46-49 同款调用，非零 → not-repo →
404）。已知外观小节（如实标注，不改）：超时错误消息打印 `git ${args[0]}`，E2
argv[0] 为 `'-c'`，消息呈「git -c 超时（5s）」——语义无损，logger 面细节不进响应。

#### 3.1.2 入参校验（PRD REQ-0041-01 / ADR-0016 §3.2 §4）

```ts
const REF_RE = /^[A-Za-z0-9._/@-]+$/;          // ADR-0016 §3.2 白名单字面
const REF_MAX = 200;                            // 界值上限（对齐 E1 limit 界值风格）
const PATCH_CHAR_CAP = 20000;                   // 逐文件 patch 截断上限（PRD §4 终值裁定）
const FILES_CAP = 500;                          // files 条目上限（防大 diff 爆响应）
```

- **ref（base/head）**：参数**缺省**（undefined）→ base 取 `'HEAD'`、head 取
  工作区形态（不传）；参数**在但为空串**（`?base=`）→ 400（PRD AC2 空串反例）；
  有值 → 须 `REF_RE.test(v)` 且不以 `-` 开头且长度 ≤ REF_MAX，否则 400
  `{ error:'base 或 head ref 非法' }`。**已知限制（如实标注，不扩白名单）**：
  `HEAD~1` / `HEAD^` / `@{-1}` 等含 `~^{}{}` 的 rev 语法被白名单拒绝（ADR-0016
  §3.2 字面写死，扩白名单 = 契约变更需新授权，不在本轮射程）——用户以分支名 /
  tag / 完整 sha / `HEAD` 使用。
- **path（子路径前缀）**：缺省/空串 → 不过滤；有值 → `path.resolve(PROJECT_ROOT,
  v)` 后校验 `p === PROJECT_ROOT || p.startsWith(PROJECT_ROOT + path.sep)`，
  否则 400 `{ error:'path 越界' }`（tools.ts:18-22 safePath 机理同构、锚定根 =
  PROJECT_ROOT；resolve 归一使绝对路径注入（`D:\…`/`/etc`）与 `../` 逃逸同样
  被拒——绝对路径 resolve 后即其自身，非根内即 400）。**校验通过后传给 git 的
  仍是原始输入串**（作 argv 单元素 pathspec，相对 cwd=PROJECT_ROOT 解析；校验
  仅作门禁——pathspec 通配符（`*`）在根内语义仍只读可见，无越界面，如实标注）。
- **stat**：值 `'1'`/`'true'`（大小写不敏感）→ 统计模式；`'0'`/`'false'`/缺省 →
  默认模式；**其他值 → 400 `{ error:'stat 必须是 0/1/true/false' }`**（严格化
  对齐 E1 limit 的显式反例风格）。

#### 3.1.3 命令装配与双模式解析（stat 模式定形 = 本 SPEC 关键裁决）

**argv 装配（单命令，全 argv 元素零拼接）**：

```ts
const args = ['-c', 'core.quotepath=off', 'diff', '--no-color'];
if (stat) args.push('--numstat');          // 统计模式（见下裁定）
args.push(base);                            // 恒在（缺省 'HEAD'）
if (head !== undefined) args.push(head);    // 显式 ref 对形态
if (pathInput !== undefined) args.push('--', pathInput);
```

- `-c core.quotepath=off` 前缀与 E1 完全同款（git.ts:51）：子命令仍为 `diff`，
  白名单语义不变；防非 ASCII 路径八进制转义致解析错位（本仓 docs/ 含中文名文件）。
- **head 缺省 = base↔工作区形态**（`git diff --no-color <base>`），双 ref 即
  base↔head——ADR-0016 §3.2 原文语义。

**stat 模式以 `--numstat` 落地（本 SPEC 定形，PRD 明文授权「stat 模式出参形态归
SPEC」；与 ADR-0016 §3.2 正文 `[--stat]` 示意 flag 的差异如实记录）**：

- 理由①（数据保真）：`--stat` 人读格式的 ` path | N +++++----` 不分离 adds/dels
  且图形列宽截断，无法填出 §3.2 出参五键中的精确 `adds/dels`——用 `--stat` 只能
  伪造或置空；`--numstat` 每行 `adds\tdels\tpath` 机器可读、精确分离（本会话对
  固定对实跑验证：`21 7 .zcode/...` / `2 2 docs/...`）。
- 理由②（「仅统计」本意）：`--numstat` 输出体量最小（无 patch 正文），恰是
  「仅统计快速总览」（PRD US-2）的本意。
- 理由③（不变式保持）：BK-0041 权威字面量（ADR-0016 §7 第二代码块）言
  「git 白名单 **git diff --no-color 一命令**」——子命令仍 `diff`、零可写、零
  shell、5s 强杀，ADR-0016 §3.4 全部不变式保持；§3.2 正文 `[--stat]` 系契约级
  统计模式示意（方括号 = 可选），出参形态明文归 SPEC（PRD REQ-0041-01 同）。
- **处置**：按 SPEC 授权定形为 `--numstat`，差异记入 ADR-0016 实施纪要（#12，
  BUILD 义务）供 VERIFY 与用户复核；如需回退为字面 `--stat`（牺牲 adds/dels
  保真），属实现层回退非新架构决策。

**默认（patch）模式解析**——按 `/^diff --git /` 边界切块，每块：

- **status**：块内扩展头含 `new file mode` → `'A'`；`deleted file mode` →
  `'D'`；`rename from`/`rename to` → `'R'`（path 取 rename to 值）；否则 `'M'`。
- **path**：优先 `+++ b/<path>` 剥前缀；`+++ /dev/null`（删除文件）取 `--- a/
  <path>`；纯改名零内容块取 `rename to` 值。已知限制（如实标注）：git 对含特殊
  字符路径的 C 引号形态（`"..."`）原样透传不剥引号——本仓常规路径不受影响
  （quotepath=off 已消八进制转义面）。
- **adds/dels**：块内以 `+` 开头行数（排除 `+++`）／以 `-` 开头行数（排除
  `---`）。二进制块（`Binary files … differ`）无 +/- 行 → adds/dels 自然为 0，
  patch 携带块原文（含 Binary 提示行）——如实呈现不特判。
- **patch**：块原文（含 diff --git/index/@@ 头），逐文件截断 `PATCH_CHAR_CAP`
  字符；截断即置顶标记 `truncated=true`。**截断无内联标记**（ADR-0016 §3.2 出参
  为顶单标记形态，不加每文件标志位 = 契约不扩）。
- **files 截断**：块数 > `FILES_CAP` 即丢弃余块并 `truncated=true`（响应防爆，
  PRD §4；被丢弃事实由 truncated 顶标记承载）。

**stat 模式解析**：逐行 `adds\tdels\tpath` → `{ path, status:'', adds, dels,
patch:'' }`（`--numstat` 不携带状态位，status 如实置空串不伪造 'M'；二进制行
`-\t-\t` → adds/dels 归 0；path 为 numstat 原样输出）。出参骨架与默认模式一致
（§3.2 契约五键 + truncated），前端不消费 stat 模式（§1 不做范围），API 级能力
由 B08 机器守护。

**出参类型（diff.ts 导出）**：

```ts
export interface DiffFile { path: string; status: string; adds: number; dels: number; patch: string }
export interface DiffResult { files: DiffFile[]; truncated: boolean }
```

**错误归类（WorkbenchGitError 复用 + 一类新增判定）**：rev-parse 非零 →
`not-repo`；`git diff` 退出非零且 stderr 匹配 `/unknown revision|bad revision|
ambiguous argument/i` → ref 不可解析（routes 映射 400 `{ error:'base 或 head
ref 不存在或不可解析' }`——ADR-0016 §3.2「400 ref 非法」对**语义非法 ref** 的
覆盖读法，用户手误 ref 得 4xx 而非 5xx）；其余非零/超时/error 事件 → `failed`
→ 500。探测在前、diff 在后，各一次 runGit 调用。

### 3.2 routes.ts 扩 workbenchDiffHandler（#3）

同步段：query 解构 base/head/path/stat → §3.1.2 校验（非法即 400 直返，字面量
见各条）→ `collectDiff({...}).then(…)`；异步段错误映射：`not-repo` → 404
`{ error:'not a git repository' }`（E1 字面量一致）；ref 不可解析 → 400（上节
字面量）；其余 → `logger.warn` + 500 `{ error:'git command failed' }`（E1 同款：
细节进 logger 不进响应）。零 shared 契约。

### 3.3 server.ts 注册（#4）

:49 import 扩 `workbenchDiffHandler`（或并列新 import 行，等价，BUILD 定）；
:236 后插入：

```ts
app.get('/api/v1/workbench/diff', workbenchDiffHandler);
```

v1-only（无 `/api/*` 别名，ADR-0005 / E1 先例）；头注 :17-19 区 workbench 行
增补 diff 端点描述（注释级，BK-0056 活清单纪律——0036 落地 E1 时即此形态）。

### 3.4 server-sync.js 数据面（#5，ADR-0006 边界：仅数据层零 DOM）

```js
export const fetchWorkbenchDiff = (q = {}) => {
  const p = new URLSearchParams();
  if (q.base) p.set('base', q.base);
  if (q.head) p.set('head', q.head);
  if (q.path) p.set('path', q.path);
  if (q.stat) p.set('stat', '1');
  const s = p.toString();
  return apiJson('/workbench/diff' + (s ? '?' + s : ''));
};
export async function refreshWorkbenchDiff(q){
  try{ SVR.wbDiff = await fetchWorkbenchDiff(q); SVR.wbDiffErr = false; }
  catch(_){ SVR.wbDiffErr = true; }
  wbDiffArrive && wbDiffArrive();
}
```

SVR 增 `wbDiff:null, wbDiffErr:false`；`wbDiffArrive` + `onWorkbenchDiffArrive(fn)`
（wbGit 四件同型第五件）。URLSearchParams 负责查询串编码（ref/path 含 `/`·`.`
安全传递）；404/400/500 走 apiJson 非 2xx 抛错 → wbDiffErr=true → 面板错误态。
mapEvent/replayLines/events 面零接触。

### 3.5 app.js workbench 段 diff 分支（#6；段外零改动 = §1 机器口径）

**段内 3 处行级扩改 + 2 处纯插入**：

1. **:2970 解禁**：`mk('diff','变更',true)` → `mk('diff','变更',false)`（tree
   保持 `true`——BK-0042 射程，禁用态像素零变化）。解禁后 `.wb-tab:disabled`
   （app.css:634）不再命中该按钮 → opacity .4→1 = **s16 受波及的唯一像素源**
   （§6 预判闭环）。
2. **:2980 标题动态化**：模板字面量 `<span class="wb-title">仓库信息</span>`
   保留为初值，页态由 wbSwitch 分支设 `$('.wb-title').textContent`（git 页
   `'仓库信息'` / diff 页 `'变更对比'` / props 页 `'属性'`）——首开即 wbSwitch，
   无中间态可见。
3. **:2984-2986 刷新派发**：共享 `.wb-refresh` 处理器改按 `WB.page` 派发：
   diff 页 → `refreshWorkbenchDiff(wbdQuery()) + wbRenderDiff()`；其余（git）
   → 既有两行原样。该按钮即 diff 页「页内手动刷新 / 应用 ref 对」控件（ADR-0016
   §2.4；ref 对应用也走它——不新增第二按钮，右栏 264px 宽度约束下的克制形态）。
4. **wbSwitch 扩分支（:2999 后插 1 行 + :3004 后插 else-if 块）**：
   `bar.classList.toggle('wb-page-diff', page === 'diff')`；`if(page==='git'){…}
   else if(page === 'diff'){ await refreshWorkbenchDiff(wbdQuery()); wbRenderDiff(); }`
   ——**on-open fetch**：打开/切至 diff 页即取（PRD REQ-0041-02；零轮询零 SSE）。
5. **diff 渲染纯插入（wbRenderGit 尾 :3037 后）**：

   - 运行时态 `const WBD = { base:'', head:'', path:'', sel:0 }`（内存态，不入
     localStorage/undo，WB/GOAL_BIND 先例）；`wbdQuery()` = 读 WBD 组 {base,
     head, path}（空串省略 = 端点缺省语义）。
   - `wbRenderDiff()`：`SVR.wbDiffErr || !SVR.wbDiff` → `.wb-empty` 错误态
     （「diff 拉取失败 · 点击刷新重试」）；`files` 空 → `.wb-empty`「无变更
     （选定范围工作区干净）」；`truncated` → 顶部 `.wb-empty` 截断提示行
     （ADR-0016 §4「展示侧截断提示」复核结论 = 需要，此即落点）。结构：
     `#workbench .wb-scroll` 内 = `.wb-diff-bar`（base/head/path 三个
     `.wb-ref` 文本输入，placeholder `'HEAD'`/`'工作区'`/`'路径过滤'`，value
     回填 WBD）+ `.wb-sec`「文件」+ `.wb-diff-file` 行（`.wb-diff-st` 状态码 +
     `.wb-diff-path` + `.wb-diff-nums` 呈 `+adds/-dels`）+ `.wb-sec`「补丁」+
     `.wb-diff-pre`（选中文件 patch 等宽原文，`white-space:pre-wrap`）。
   - 事件（每次渲染后挂新元素自身，不触 #props 三委托）：输入 `input` 事件 →
     写回 WBD（重渲染不丢值——WBD 是唯一事实源）；`keydown` Enter → 触发与
     `.wb-refresh` 同径刷新；文件行 click → `WBD.sel = idx` + 仅重渲补丁区。
   - **命名禁令（gate 公共六键硬约束，0036 SPEC 同款）**：新类名一律 `wb-diff-`/
     `wb-ref` 前缀（§0 亲核零碰撞）；不复用 `.wtab/.wdg/.port/.node`（counts
     计数面）；零新增 `--` 自定义属性（cssVars 键集不变量）；零新字体（等宽
     呈现用既有 `--mono`）。

### 3.6 app.css（#7，:660 文件尾纯插入，~35 行）

```css
/* ===== 右栏工作台 · diff 审查页（BK-0041 / 迭代 0054 修宪轮 · ADR-0016 §2.2）===== */
#rightbar.wb-page-diff #props{display:none}          /* 视图切换对（:636-637 同型新选择器） */
#rightbar.wb-page-diff #workbench{display:flex}
.wb-diff-bar{display:flex;gap:6px;padding:0 0 10px}   /* ref 对选择行：三输入并排 */
.wb-ref{flex:1;min-width:0;height:22px;background:var(--panel2);border:1px solid var(--border2);
  border-radius:5px;color:var(--text);font-size:11px;padding:0 7px}   /* 输入面取值沿 .lib-search input 规格（:100-102） */
.wb-ref:focus{border-color:var(--accent);outline:none}
.wb-diff-file{display:flex;align-items:baseline;gap:8px;padding:3px 6px;border-radius:5px;
  cursor:pointer;font-size:11px}                      /* 文件行；.on 激活 */
.wb-diff-file.on{background:var(--panel3)}
.wb-diff-st{font-family:var(--mono);width:14px;flex:none}
.wb-diff-path{color:var(--text2);min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;font-family:var(--mono);font-size:10.5px}   /* 排版沿 .wb-path（:657-658） */
.wb-diff-nums{margin-left:auto;flex:none;font-family:var(--mono);font-size:10px;color:var(--text3)}
.wb-diff-pre{margin:0;padding:8px 10px;background:rgba(0,0,0,.45);border-left:2px solid #60a5fa;
  border-radius:5px;font-family:var(--mono);font-size:11px;line-height:1.5;color:#c7d6ee;
  white-space:pre-wrap;word-break:break-all;user-select:text}    /* 等宽补丁块，取值沿 .node-jtree（:609-611） */
```

（上表为关键取值锚点；`.wb-diff-st` 状态色（A 绿/D 红/R 青/M 琥珀，取
`--ok/--err/--cat-logic/--warn` 既有变量）等细节 BUILD 按 §3.5 DOM 终稿补全，
均新选择器、:623-660 既有行零改动、零新增自定义属性。）

### 3.7 gate.mjs 场景增量（#8）+ golden 落盘（#9/#10）

#### 3.7.1 WB_ROUTES 扩 E2 mock（数组内纯追加一项，既有两项零改动）

```js
{ pattern: '**/api/v1/workbench/diff**',
  handler: route => route.fulfill({ json: {
    files: [
      { path: 'apps/web/src/app.css', status: 'M', adds: 12, dels: 3,
        patch: 'diff --git a/apps/web/src/app.css b/apps/web/src/app.css\n@@ -660,3 +660,8 @@\n+/* wb-diff */\n+.wb-diff-bar{display:flex}\n+.wb-ref{height:22px}\n+/* 新增选择器纯插入 */\n context' },
      { path: 'notes/draft.md', status: 'A', adds: 5, dels: 0,
        patch: 'diff --git a/notes/draft.md b/notes/draft.md\nnew file mode 100644\n@@ -0,0 +1,5 @@\n+# 草稿\n+第二行\n+第三行\n+第四行\n+第五行' } ],
    truncated: false } }) },
```

固定字面量（ASCII + 固定中文样例，字形安全口径；diff 页无时间渲染，无需整点
毫秒）。s16 不切 diff 页 → 该路由对 s16 零请求零渲染因果（页签条像素变化唯一
源仍是 §3.5-1 解禁）。

#### 3.7.2 新场景 s17（预期号；落盘时序仲裁不锁死）

- `wbDiffOpen = async page => { await wbOpen(page); await page.evaluate(() =>
  document.querySelector('#wb-tabs .wb-tab[data-wb="diff"]').click()); }`
  ——真实交互路径三步：空画布 contextmenu → 点「工作台」（wbOpen('git')，E1
  fetch → E1 mock 供数）→ 点 diff 页签（真实 click 委托 → wbSwitch('diff') →
  E2 fetch → E2 mock 供数）。
- `wbDiffReady` 探针（状态量非时延量，wbReady 先例）：
  `document.querySelectorAll('#workbench .wb-diff-file').length === 2 &&
   !!document.querySelector('#workbench .wb-diff-pre')`，10s 超时红即 FAIL 不落
  伪基线。
- `wbDiffInv`（per-scenario 不变量）：`wbTabs`（预期 `['props','git','diff*',
  'tree!']`——git 非激活、diff 激活、tree 仍禁用）、`propsShown`（false）、
  `diffCounts`（`'2f'` 文件行数）、`patchHead`（`.wb-diff-pre` textContent
  前 24 字符，fixture 确定性）。
- 场景行：`{ id: 's17-workbench-diff-online', routes: WB_ROUTES,
  timezoneId: 'UTC', steps: [wbDiffOpen], ready: wbDiffReady, inv: wbDiffInv }`
  ——timezoneId 沿 s16 家族口径（本场景无时间渲染，取族一致性）；无 seed。
- 编号 = 预期 s17（主干现最大号 s16，§0 亲核）；多路并行按落盘时序裁决
  （ADR-0015 §5 / WORKFLOW §4：先落盘者保留号、后落者取下一号，改动仅编号
  字面量与文件名、像素零变化，改名非重录）。

#### 3.7.3 头注计数同步（:4「17 个」→「18 个」+ :5-8 枚举行加 s17）

**授权射程论证（PRD §7 遗留问题的 SPEC 裁定）**：POLICY 需批准区明文
「golden 基线重录与 `tools/pixel-gate/` 改动」——本迭代**已持修宪授权**：issue#4
批复承继 + ADR-0016 §5 四件套第④项明文「gate 场景增量」、§6 明文「WB_ROUTES
fixture … 归各实施 SPEC」，gate.mjs 的功能增量（fixture + 场景行）在授权面内；
头注计数同步是同一文件同一提交的伴生活清单注记——**先例 = 0036 合并 85067b6
在 issue#4 修宪授权下同款同步 16→17**（本会话 git log --first-parent 亲核：
gate.mjs 修改链 70d4ab6「16 个」→ 85067b6「17 个」）。BK-0058（issue#13）先例
针对的是**无功能增量伴生的独立注释修正**（彼时 gate.mjs 无任何其他改动）；本轮
不属该形态，不再另开 needs-approval。VERIFY 若对此认定从严，按本节论证复核，
不得以「跳过头注同步」规避（活清单漂移 = BK-0056/0058 同型债务回潮）。

### 3.8 smoke B 组扩展 B06-B12（#11，B05 块后纯插入七条；B01-B05 零触碰）

主实例 = 本工作树真 git 仓库；**确定性锚 = 固定提交对 `ed2f8ed`↔`d880b62`**
（本会话亲核：父子相邻、历史不可变、diff 恰 2 文件 `21 7 .zcode/workflows/
evolution-iteration.dwf.ts` + `2 2 docs/evolution/STATE.md`、非二进制无改名；
**必须用字面 sha**——HEAD~1 形态在 BUILD 提交后漂移，且 `~` 被 ref 白名单拒绝
（§3.1.2 已知限制））。

| ID | 断言 | 口径 |
| --- | --- | --- |
| B06 | E2 默认契约（无参 = HEAD↔工作区） | GET `/api/v1/workbench/diff` → 200；键集恰 `{files,truncated}`；files 每项键集恰五键 `{path,status,adds,dels,patch}`，status `/^[MADR]$/`，adds/dels 非负整数，patch/truncated 布尔与字符串类型正确；**files 条数不定不断言**（主实例工作区脏度随轮次变化，CI 干净检出时 files 可为空——只锁形状不锁数量，如实口径） |
| B07 | 显式 ref 对 + path 前缀（固定对） | `?base=ed2f8ed&head=d880b62` → 200 且 **files.length===2**、两 path 集合 === {`.zcode/workflows/evolution-iteration.dwf.ts`, `docs/evolution/STATE.md`}、两项 status==='M'、adds/dels 分别 (21,7)/(2,2)、truncated===false；`&path=docs` → files.length===1 且 path 以 `docs/` 开头（前缀过滤生效）；`?path=.zcode` 同型 1 条 |
| B08 | stat 模式（`--numstat` 定形面） | 同固定对 `&stat=1` → 200；files.length===2（与 B07 默认模式**跨模式计数一致**——numstat 行数 === patch 块数的机器互证）；每项五键、`patch===''`、`status===''`、adds/dels 与 B07 逐文件相等；`stat=abc` → 400 `{error:'stat 必须是 0/1/true/false'}` |
| B09 | ref 白名单 400 反例 | `base=-x`（`-` 开头）/ `base=main;rm`（白名单外字符）/ `base=`（空串在而缺省不在）/ `head=HEAD~1`（`~` 不在白名单，已知限制的正反例承载）→ 各 400 `{error:'base 或 head ref 非法'}`；`base= nosuchref`（合法形状但不可解析，固定对外的假 sha 如 `deadbeef`）→ 400 `{error:'base 或 head ref 不存在或不可解析'}`（§3.1.3 语义归类） |
| B10 | path 越界 400 | `path=../`（逃逸）/ `path=../../` / 绝对路径注入（win32 形态 `D:/` 前缀 + POSIX 形态 `/etc`，resolve 后非根内同拒）→ 各 400 `{error:'path 越界'}` |
| B11 | 404 无仓库（探针实例复用形态） | B04 同型自建自清理探针实例（mkdtemp 非 git 目录 + 双 dist 复制 + node_modules junction + spawn cwd=REPO_ROOT；代码骨架复制 B04 块，**不修改 B04**）→ health 200 后 GET `/api/v1/workbench/diff` → 404 `{error:'not a git repository'}`（E2 rev-parse 探测面；误锚 process.cwd() 会得 200 恰好击穿——与 B01/B04 同款双向证明的 diff 侧延伸） |
| B12 | 纪律源扫描 diff.ts（B05 同型） | readFileSync `src/workbench/diff.ts`：/shell/i 零命中（含注释）；可写命令单引号 argv 字面量零命中（B05 同 regex）；`'diff'`/`'--no-color'`/`'--numstat'` 三词在场（白名单承载本体）；`'./git.js'` import 在场（runGit 复用非复制）；另复扫 routes.ts（扩后）可写命令零命中 |

超时 500 / git ENOENT **不做 HTTP 级测试**（win32 无法可移植伪造慢 git/缺二进制
——B04 已知限制同款如实标注），由 B12 源扫描 + runGit 复用（B05 已断言
setTimeout/kill 形态在 git.ts）背书。基线 138（PRD §5 在案）→ B 组后 **145
passed / 0 failed**（新总数口径，AC5 要求写入 MERGE 收口）。头注 :32-36 B 组
blurb 增补 B06-B12 一句（注释级）；编排序 :5 不变（B 已在列）。

## 4. 模块边界

```
app.js workbench 模块段（唯一 DOM 面：#wb-tabs 状态 / #workbench diff 分支 /
  wbRenderDiff；段外零改动；#props 面零接触）
  │ 消费（import）
  ▼
server-sync.js workbench 数据面（fetchWorkbenchDiff/SVR.wbDiff/
  onWorkbenchDiffArrive/refreshWorkbenchDiff —— 仅数据层零 DOM，ADR-0006）
  │ HTTP GET /api/v1/workbench/diff（v1-only，无 /api/* 别名，ADR-0005 先例）
  ▼
apps/server/src/workbench/routes.ts（E2 handler：入参校验/错误码映射/logger）
  │ 调用
  ▼
apps/server/src/workbench/diff.ts（collectDiff：ref/path/stat 校验 + 双模式解析
  + 截断；rev-parse 探测复用）
  │ runGit（git.ts 导出，唯一执行器：argv 数组 + 5s 强杀 + cwd=PROJECT_ROOT）
  ▼
git 子进程（rev-parse / diff 两命令，只读白名单，可写命令一律排除）
```

**禁止越界面**：workbench 不进 `packages/shared`（零节点/SSE 契约）；不触
events.ts/store.ts/engine.ts/handlers.ts/guard.ts/config.ts/root.ts；server-sync
新函数不操作任何面板 DOM；app.js 不触 #props 既有面与 workbench 段外任何行；
gate.mjs 既有场景行与 WB_ROUTES 既有两项零改动（纯追加）；smoke B01-B05 零
改动（B06-B12 纯插入）；app.css :623-660 既有行零改动。

## 5. 验收口径（PRD AC0-AC8 可执行化；BUILD/VERIFY 全部在本工作树内执行）

0. **AC0 定界消费核验**：ADR-0016 §7 第二代码块与 BACKLOG BK-0041 行备注逐字
   一致（本 SPEC 转述见 PRD §3 权威定界节，VERIFY 以 ADR 文件为 VERBATIM 基准）；
   授权链三元组（issue#4 批复承继 2026-10-23T15:49:17Z + ADR-0016 + BK-0041
   ready）在 PRD/SPEC/ADR 状态行一致。
1. **AC1 build**：`npm run build` exit 0（shared + web；后端编译由 smoke/test
   前置 build:server 覆盖）。
2. **AC2 gate**：`npm run gate` **18 场景全绿**（s0~s16 既有 17 + s17 新增）。
   分步口径（§6 流程）：BUILD 后首跑预期 = s17 golden-created 落盘 + **恰 s16
   红**（页签条解禁波及，diffPx>0 预期内）+ s0~s15 diffPx=0 逐场景实测留档；
   gate:update 后复跑 18/18 全绿且 `git status tests/golden/ui/` 仅 s16 两文件
   被改 + s17 两文件新增（其余 32 文件零字节漂移 = 「重录仅此一处」机器证明）。
   **s3 抖动形态**（issue #12，diffPx≈23）出现时按 rerun/CI 权威口径处置，
   绝不以此消费 gate:update（PRD AC4 / 0037~0052 一贯纪律）。
3. **AC3 test**：`npm test` 30/30 零回退（纯回归面）。
4. **AC4 smoke**：`npm run smoke:server` **145 passed / 0 failed**（138 基线零
   回退 + B06-B12；新总数 145 写入 MERGE 收口）。
5. **AC5 手动 E2E 七点位**（`npm start` → http://localhost:3000，浏览器实走 +
   error 钩子零捕获；数据 = 本仓真实数据，如实标注 BUILD/VERIFY 时工作区含
   未提交改动这一事实）：
   ① 右键空画布 → 「工作台 · 仓库信息」→ git 页正常（0036 回归入口）；页签条
     「变更」不再置灰、「目录」仍置灰（title「后续批次提供」仍在）；
   ② 点「变更」→ ref 对行三输入（base/head/path 均 placeholder 态）+ 文件列表
     （HEAD↔工作区 = 本工作树真实未提交变更）+ 首文件等宽补丁自动呈现；与
     本机 `git diff --no-color` 输出抽查一致（首文件 ±行数与 patch 首 hunk）；
   ③ base 填 `ed2f8ed`、head 填 `d880b62` → 点刷新 → 列表切为该提交 diff
     （2 文件）；path 填 `docs` → 再刷新 → 过滤为 1 文件；
   ④ 点另一文件行 → 补丁区切换至该文件（.on 激活态随行）；
   ⑤ 点刷新 → DevTools Network 见二次 `/api/v1/workbench/diff` 请求（查询串
     随 WBD 变化）；输入框 Enter 同径触发；
   ⑥ 切「属性」→ #props 恢复显示、选中节点参数编辑/回显/焦点保持与打开前一致
     （#props 零触碰承诺回归）；切「仓库」→ git 页重取正常；再切「变更」→
     WBD 态保持（base/head/path 回填）；
   ⑦ 截断提示（可选点位，如实标注）：truncated 提示行的渲染已由 s17 fixture
     语义与 B06-B08 契约承载；手动点位如未构造 >20,000 字符 patch 的安全场景
     （改 cap 需临时构建，不做），VERIFY 如实记「fixture/契约面覆盖，手动未
     构造」即可，不判 FAIL。
6. **AC6 机器证明四零 + 边界**：`git diff` 对 Skeleton.tsx / packages/shared/**
   / package*.json / apps/server/src/config.ts / apps/server/src/guard.ts /
   apps/server/src/workbench/root.ts / .env.example 恒空；app.js 核对 =
   workbench 段（:2950-3037 基线行号区间对应内容）外零改动（§1 口径，段内
   仅 §3.5 列明的 3 处扩改 + 纯插入）；app.css/gate.mjs/smoke-server.mjs
   `git diff --numstat` 删除行=0（gate 头注计数行与 smoke 头注 blurb 的注释级
   增改除外，#8/#11 申报内）；productFiles 白名单 = §2 表 #1~#12 累积并集
   （WORKFLOW §4 修复轮不覆盖纪律）。
7. **AC7/AC8**：四零即 AC6 前半；CI 盯守 = 推送后 `ui-constitution` 18 场景
   （含 s16 重录后基线）全绿，红则 rerun 一次仍红报 issue #12 / 用户（未到
   时点不判过不判挂，0012 先例）。

## 6. golden 重录方案与宪法第 3 条依据（修宪轮必含节）

- **重录范围 = 恰一处：s16-workbench-git-online（.png + .invariants.json 双
  文件）**。依据：s16 场景工作台打开态页签条渲染全部四枚页签（gate.mjs:432
  steps=[wbOpen]），`mk('diff','变更',true→false)` 解禁后该按钮脱离 disabled
  态（app.css:634 opacity .4→1），s16 像素必然受波及；且 s16 基线不变量
  `wbTabs` 含 `"diff!"`（本会话亲读 invariants.json）→ 重录后变为 `"diff"`，
  png 与不变量双文件同步。**s0~s15 零波及**：懒创建未打开前 `#wb-tabs`/
  `#workbench` display:none（app.css:627/:635），diff 页内容全部在打开后动态
  渲染；Skeleton.tsx 零改动 → 静态骨架零变化——BUILD 后 gate 实测确认（AC2
  逐场景留档）。
- **执行流程（时序硬约束）**：
  ① `npm run build`；② `npm run gate` 首跑——预期恰两个事件：s17
  golden-created 落盘（gate.mjs 既有机制，基线 png 不存在即写盘）+ s16 红
  （预期内波及）；**若同时出现 s3 diffPx≈23 抖动（issue #12），rerun 直至
  红 set 恰为 {s16}**——严禁在 s3 红 时执行 gate:update（会把抖动像素写进
  基线，污染且违宪）；③ `npm run gate:update` **恰一次**；④ `npm run gate`
  复跑 18/18 全绿；⑤ 机器证明：`git status tests/golden/ui/` = 仅 s16 两文件
  modified + s17 两文件 untracked/new，其余 32 既有文件零字节变化（`git diff
  --stat tests/golden/ui/` 仅 s16 两行）——即「重录仅此一处、其余逐字节零
  漂移」的可审计证明（PRD AC4）；⑥ s16 重录前后 png 对比截图留档（VERIFY/
  MERGE 证据面）。
- **宪法第 3 条三要素对应**：① ADR 在案 = ADR-0016（§6 双通道预案明文「受
  波及既有场景经修宪轮 gate:update 重录」+ §7 BK-0041 授权链字面量；迭代
  0013 先例为该通道的首次行使，本轮为 ADR-0016 链内首例）；② 用户本人批准 =
  issue#4 owner 批复承继 2026-10-23T15:49:17Z（BK-9004 → BK-0039→0040→0041
  链条承继，PRD §0 引 BACKLOG 在案）；③ 同迭代 golden 增量 = s17 新增（
  golden-created，非重录零 gate:update）+ s16 重录（恰一次 gate:update），
  四文件随产品提交入库并附前后对比（⑥）。
- **例外与禁区**：s3 抖动（issue #12）不得消费 gate:update（上文②）；s0~s15
  若出现预期外红 = 立即中止排查（懒创建几何前提被击穿 = 实现偏离 §3.5，禁止
  重录掩盖，PRD REQ-0041-04 / WORKFLOW §6 护栏 9）。
- **0f5726c 教训吸收**：0036 合流时 s16 基线曾因跨基线（--cat-agent 缺项）首跑
  红——本轮 s16 重录发生在主干 d880b62 后裔工作树（基线含全部现行不变量键），
  重录产物自动携带现行 cssVars/counts 全集，无跨基线漂移；合并时若与并行路
  场景号撞号（s17 被占），按 ADR-0015 §5 落盘时序裁决改号（改名非重录，像素
  零变化）。
- **权威与 CI**：golden 以 CI（windows-latest + Playwright Chromium）为权威
  （宪法第 2 条）；本机重录推送后以 `ui-constitution` required check 复验，
  红即按 AC8 处置。确定性纪律 = fixture 固定字面量 + wbDiffReady 状态量探针 +
  稳定双帧等待 + timezoneId UTC（s4/s5/s9/s16 在线场景同款先例已证可行）。

## 7. 回滚

VERIFY FAIL 达修复上限（≤2 轮）→ `git revert <产品提交>`（唯一手段，禁
force/reset）：s17 基线随提交删除、s16 基线随 revert 恢复重录前字节（revert
对 #10 双文件生效）、diff.ts/注册/前端分支整体回退、B06-B12 随 smoke 文件回退；
ADR-0016 增补（#12）随产品提交同 revert。或按 WORKFLOW §4 迭代回滚语义整体
丢弃工作树（主干零影响）。回滚后 BK-0041 状态回 `ready`，issue#4 不回执
（链未终）。
