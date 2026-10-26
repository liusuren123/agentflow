# SPEC · 迭代 0036 · BK-0040 工作台右栏容器 + git 信息页（修宪轮，BK-9004 链批次 1）

> 产出角色：spec-designer（SPEC 轮，2026-10-26）。输入：`iterations/0036/PRD.md`
> （PLAN 产物）+ ADR-0016（定界权威：§2 容器信息架构 / §3.0 锚定 / §3.1 E1 契约 /
> §3.4 git 纪律 / §4 安全面 / §5 编排 / §6 golden 预案 / §7 权威字面量）+ 本会话
> 只读代码核实（§0 锚点表，含 ADR 行号漂移校正）。
> 权威顺位：CONSTITUTION > AGENTS > WORKFLOW > POLICY > ADR-0016 > PRD > 本 SPEC。
> **基线亲测（本会话、本工作树、改动前）**：`npm run gate` 12 场景全绿 diffPx=0
> （s0~s11）；`npm test` 30/30；`npm run smoke:server` 118 passed / 0 failed。
> **ADR 处置：零新 ADR（needsAdr=false）**——本迭代全部架构决策已由 ADR-0016
> 承载（迭代 0030 落盘，授权链 issue#4 批复承继 2026-10-23T15:49:17Z），本 SPEC
> 仅消费之；落地级设计（模块文件切分 / DOM 终稿 / 入口懒创建形态 / fixture 与
> smoke 断言组织）均在 ADR-0016「终稿归实施 SPEC」授权面内（§2.2/§3.0/§6），
> 属实现决策不构成新架构决策（沿迭代 0033 SPEC ADR 处置先例）。ADR-0016 的
> **实施轮增补**（状态行 BK-0040 消费标注 + §7 首代码块尾追加实施纪要，
> ADR-0016 §5 条款）是 BUILD 产品提交的兑现义务（§2 表 #11，沿 0033 先例）。

## 0. 代码锚点现值（ADR-0016 漂移校正；沿迭代 0027「行号偏移按代码事实转写」先例）

| 锚点 | ADR-0016 记值 | 本轮亲核现值 | 判定 |
| --- | --- | --- | --- |
| Skeleton.tsx 右栏 | :136-137 | :137 `<aside id="rightbar"><div id="props"></div></aside>` | 无漂移 |
| app.js renderProps | :914 | :914 | 无漂移 |
| app.js #props 三事件委托 | :1001/:1037/:1065 | **:1002/:1038/:1066**（change/click/input） | +1 漂移 |
| app.js 滚动恢复 | :1025-1026 | **:1026-1027** | +1 漂移 |
| app.js 焦点归属（refreshPropsIfIdle） | :2128 | **:2213**（函数），焦点判定 :2215 | +85 漂移 |
| app.css --props-w / #rightbar / #props | :23 / :333 / :335 | :23（`--props-w:264px`）/ **:337-338 / :339** | 后两处 +4 漂移 |
| server.ts v1-only 注册族 | :205-219 | :205-219（workflows :205-213、sessions :215-219） | 无漂移 |
| code.ts spawn 纪律 | :7 / :50 / :53 | :7（import）/ :50（argv 数组）/ :53（5s setTimeout kill） | 无漂移 |
| tools.ts SANDBOX / safePath | :16 / :18-22 | :16 / :18-22（区段 :15-21 成立，:15 为注释） | 无漂移 |
| gate.mjs 场景表 | （s0~s11） | SCENARIOS :237-257；golden-created 机制 :321-325；公共六键 :289-305 | 在案 |

## 1. 范围与护栏

- **修宪轮**（宪法第 3 条通道）：授权链 = ADR-0016 + issue#4 用户批复承继
  （2026-10-23T15:49:17Z，PRD 轮 gh 亲核）+ 同迭代 golden 增量（§6）。触碰面
  = UI 三层**纯新增**：视觉（右栏页签条 + git 页渲染态）、结构（`#wb-tabs`/
  `#workbench` 新节点 + app.css 新选择器 + 空画布右键菜单新项）、交互（页签
  切换 / on-open fetch / 页内刷新控件）。
- **四零（机器证明）**：零新依赖（package.json / package-lock.json diff 恒空）、
  零 env（`apps/server/src/config.ts` diff 恒空；无 WORKBENCH_ROOT 类覆盖项，
  ADR-0016 §3.0 写死）、零 shared 契约（`packages/shared/**` diff 恒空；workbench
  为面板数据源非节点/SSE 面，sessions 先例）、零出站（E1 全本地 git 子进程 +
  Node 内置，guard.ts 面零涉）。
- **#props 面冻结（B 案核心承诺）**：renderProps（:914）、change/click/input
  三事件委托（:1002/:1038/:1066）、滚动恢复（:1026-1027）、refreshPropsIfIdle
  （:2213-2216）**既有行零字节改动**；`Skeleton.tsx` 零改动（动态创建案，
  ADR-0016 §2.5）。#rightbar 布局声明面按 PRD 允许**扩展**（本 SPEC 落地为
  纯追加新选择器，:337-339 既有规则零改动）。
- **中止转 needs-approval 条款**（任一命中即中止本迭代）：确需订阅 run 事件 /
  新增 SSE 事件类型 / 新增 env 语义 / 静态骨架化（Skeleton.tsx 挂载）/ 端点出站 /
  git 可写命令接入（ADR-0016 §8；PRD REQ-0040-05 同款）。
- 不做范围：BK-0041 diff 页 / BK-0042 tree 页内容（页签位仅禁用占位）、轮询、
  nodes/DEFS 面（零 nodes.baseline.json 重产、零 handler 注册）。

## 2. 受影响文件清单（产品提交白名单；`git show --numstat` 核对基准）

| # | 文件 | 动作 | 行级说明与预算 |
| --- | --- | --- | --- |
| 1 | `apps/server/src/workbench/root.ts` | 新增 | ~15 行：PROJECT_ROOT 模块级常量（§3.1） |
| 2 | `apps/server/src/workbench/git.ts` | 新增 | ~120 行：git 执行器 + 三命令 + collectGitInfo 解析（§3.1） |
| 3 | `apps/server/src/workbench/routes.ts` | 新增 | ~55 行：E1 handler（§3.1） |
| 4 | `apps/server/src/server.ts` | 改（纯插入） | +3 行：import（:40 sessions import 块后）+ 注册段（:219 后，§3.2） |
| 5 | `apps/web/src/server-sync.js` | 改（纯插入） | +~16 行：workbench git 数据面四函数 + SVR 两键 + 回调（§3.3） |
| 6 | `apps/web/src/legacy/app.js` | 改（纯插入） | +~135 行：空画布 ctxmenu 1 行（:1613 后）+ 文件尾 workbench 模块段（§3.4） |
| 7 | `apps/web/src/app.css` | 改（纯插入） | +~55 行：`#wb-tabs`/`#workbench`/`.wb-*` 新选择器，文件尾追加（§3.5） |
| 8 | `tools/pixel-gate/gate.mjs` | 改（纯插入） | +~40 行：WB_ROUTES fixture + wbOpen/wbReady/wbInv + s12 场景行（§3.6） |
| 9 | `tests/golden/ui/s12-workbench-git-online.png` + `.invariants.json` | 新增 ×2 | golden-created 通道落盘（§6；禁 gate:update） |
| 10 | `tests/smoke/smoke-server.mjs` | 改（纯插入） | +~95 行：B 组 B01-B05（§3.7） |
| 11 | `docs/adr/0016-workbench-right-panel-git-diff-tree.md` | 改 | 状态行 BK-0040 消费标注 + §7 首代码块尾实施纪要一行（ADR-0016 §5 增补义务；草案态措辞不变） |

**禁区（零 diff 机器证明面）**：`Skeleton.tsx`、`packages/shared/**`、
`package*.json`、`apps/server/src/config.ts`、`tests/golden/ui/` 除 #9 外全部
（既有 24 文件零触碰）、gate.mjs 既有场景行与既有 fixture、app.js/app.css/
smoke-server.mjs 既有行（纯插入判定 = `git diff --numstat` 各文件删除行数=0，
#11 ADR 增补除外）、`CONSTITUTION.md`/`AGENTS.md`/`.github/**`/`tools/pixel-gate/`
除 #8 增量外。

## 3. 实现设计

### 3.1 后端 workbench 模块（#1~#3，新增三文件，各 ≤400 行）

**root.ts（根锚定，SANDBOX 同构）**：

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* 编译产物 apps/server/dist/workbench/root.js → 上溯三级 = 仓库根
   （dist/workbench → dist → apps/server → 仓库根；server.ts:44 为 dist 平铺
   两级，本模块深一层故三级——off-by-one 即锚错为 apps/server，B01/B04 双向拦截）*/
export const PROJECT_ROOT =
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
```

锚定与启动形态无关（模块加载即冻结，tools.ts:16 同构）；**零 env**。ADR-0016
§3.0「dist 产物上溯两级」指 dist→server→root 的层级跳跃；本模块位于 dist 的
一级子目录，故代码为**三个** `'..'`——SPEC 特此消歧。

**git.ts（git 执行器 + E1 数据组装）**：

- `runGit(args: string[], cwd: string = PROJECT_ROOT): Promise<{ code, out, err }>`
  ——`spawn('git', args, { cwd, stdio:['pipe','pipe','pipe'] })`，argv 数组形态
  零命令拼接（code.ts:50 同构，**不传 spawn 的 shell 选项**——默认即 false，
  显式写出 `shell:false` 反而击穿 B05 源扫描的 /shell/ 零命中不变量，注释中
  该词亦不得出现，写「命令解释器」）；`setTimeout(…, 5000)` 超时 `child.kill()`
  （code.ts:53 同构数值）；error 事件 / 非零退出码 / 超时均以 `WorkbenchGitError`
  抛出（kind: `'not-repo' | 'failed'`）。
- **只读白名单三命令（写死，ADR-0016 §3.4）**，全部 argv 直传：
  1. `['rev-parse', '--is-inside-work-tree']` —— 仓库探测（非零 → not-repo）；
  2. `['-c', 'core.quotepath=off', 'status', '--porcelain=v1', '--branch']` ——
     子命令仍为 status（白名单语义不变，`-c` 仅为输出编码配置，防中文路径
     八进制转义——本仓 docs/ 含中文名文件，本轮实测 `-c` 形态可用）；
  3. `['log', '-n', String(limit), '--format=%H%x1f%h%x1f%an%x1f%at%x1f%s']` ——
     limit 只作 argv 元素（上游已校验整数 1-100，零注入面）。
  可写命令（add/commit/push/pull/checkout/reset/clean/merge/rebase/stash）一律
  排除——B05 源扫描机器断言。
- `collectGitInfo(limit: number, cwd: string = PROJECT_ROOT)`（cwd 参数为纯函数
  参数、非 env/config 注入，默认即锚定根；出参组装）：
  - **branch**：status 首行 `## <branch>...` → 剥 `## `，截断于 `...` 或首个
    空格（本轮实测 `## feat/0036-iter` 无 tracking 段；detached `## HEAD (no
    branch)` → `'HEAD'`）。
  - **head**：log 首条 `short`（40 位 %H 与 7+ 位 %h 本轮实测见
    `915e131393aed…^_915e131^_liusuren123^_1792943058^_…`，`\x1f` 分隔）。
  - **changes**：`## ` 行之后逐行——status=前两字符（`' M'`/`'??'`/`'R '` 等
    原样两位）；余部含 ` -> ` 时拆 `from`（前段）/`path`（后段），否则整段为
    path（本轮实测 ` M docs/evolution/STATE.md` / `?? docs/evolution/iterations/0036/`）。
  - **commits**：逐行按 `\x1f` 拆 `[sha, short, author, atSecs, subject]`，
    **ts = 秒 × 1000**（对齐全仓毫秒惯例，server-sync fmtTs 直接可渲染）。
  - **已知限制（如实标注）**：rev-parse 通过但 log 非零（无提交新仓库，log
    exit 128）→ 一并归 `'failed'` → 500——工作台在零提交仓库呈错误态，属
    本批已知限制，不伪造空数据。
- 类型：`interface GitChange { status: string; path: string; from?: string }`、
  `interface GitCommit { sha: string; short: string; author: string; ts: number;
  subject: string }`、出参 `{ branch: string; head: string; changes: GitChange[];
  commits: GitCommit[] }`，git.ts 导出。

**routes.ts（E1 端点承载）**：

```ts
export const workbenchGitHandler: RequestHandler = (req, res) => {
  const n = Number(req.query.limit ?? 20);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    res.status(400).json({ error: 'limit 必须是 1-100 的整数' }); return;   // server.ts:173 同款
  }
  collectGitInfo(n).then(
    info => res.json(info),
    err => {
      if (err instanceof WorkbenchGitError && err.kind === 'not-repo') {
        res.status(404).json({ error: 'not a git repository' }); return;    // ADR-0016 §3.1 字面量
      }
      logger.warn({ err: String((err as Error).message || err) }, 'workbench git 端点失败');
      res.status(500).json({ error: 'git command failed' });               // 超时/退出码异常同码
    });
};
```

错误码契约：400 limit 非法（`{error:'limit 必须是 1-100 的整数'}`）／404 非
git 仓库（`{error:'not a git repository'}`）／500 超时或退出码异常
（`{error:'git command failed'}`，细节进 logger 不进响应）。**零 shared 契约**
（不进 packages/shared）。

### 3.2 server.ts 注册（#4）

:40 sessions import 块后插入 `import { workbenchGitHandler } from
'./workbench/routes.js';`；:219（sessions stop 注册行）后插入：

```ts
/* 迭代 0036 / BK-0040 workbench 端点：仅注册 v1（沿 ADR-0005：新端点无旧别名） */
app.get('/api/v1/workbench/git', workbenchGitHandler);
```

### 3.3 server-sync.js 数据面（#5，ADR-0006 边界：仅数据层零 DOM）

```js
/* 工作台（BK-0040）：git 信息 —— 仅数据层，面板 DOM 归 app.js */
export const fetchWorkbenchGit = (limit = 20) => apiJson('/workbench/git?limit=' + limit);
export async function refreshWorkbenchGit(limit = 20){
  try{ SVR.wbGit = await fetchWorkbenchGit(limit); SVR.wbGitErr = false; }
  catch(_){ SVR.wbGitErr = true; }
  wbGitArrive && wbGitArrive();
}
```

SVR 增 `wbGit:null, wbGitErr:false` 两键；`onWorkbenchGitArrive(fn)` 回调注册
（wf/runs/sessions 同型四件）。404/500 走 apiJson 非 2xx 抛错 → wbGitErr=true →
面板错误态。`events.ts` 面零接触、回放映射（mapEvent/replayLines）零接触。

### 3.4 app.js：入口定界裁决 + workbench 模块段（#6）

**入口定界裁决（本 SPEC 关键决策，解决 ADR-0016 §2.3 与 §6 的内部张力）**：
ADR-0016 §2.3 推荐入口「常驻页签条」与其 §2.5/§6「s0 零波及」**几何不相容**——
#rightbar 为纵向 flex（app.css:337-338），#props `flex:1`（:339），任何常驻可见
页签条必占高度、使 #props 内容整体下移，s0~s11 全场景右栏像素必变，PRD AC2
「既有 12 场景 diffPx=0、零 gate:update」不可达；§2.3 另两备选同样否决（顶栏
标签页区入口=常驻可见；会话面板联动入口改 #goal-panel 头部 → 波及 s9 像素）。
**裁决：懒创建 + 首开后常驻 + 首开入口 = 空画布右键菜单项**——

- 页签条与 #workbench 由 workbench 模块**首次打开时动态创建**（goalEnsure
  先例，app.js:2527-2555）；未打开前零新增可见 DOM（默认态像素=基线）；
  打开后页签条常驻至页面重载（保留 ADR §2.3「git/diff/tree 切页、点回属性」
  切换 UX；「常驻」语义自首开时点起算）。
- **首开入口**：空画布右键菜单（app.js:1608 数组）在 :1613（适应视图）后
  纯插入 1 行：
  `{ic:'git-branch',t:'工作台 · 仓库信息',f:()=>wbOpen('git')},`
  ——图标 `'git-branch'` 现成（app.js:68）；既有菜单项与三个菜单分支零改动；
  s0~s11 场景 steps 无 contextmenu 交互（仅 selectNode/clickRail/goalOpen/
  logPanel 类）→ 零波及。此为 ADR §2.3 推荐案的**零波及等价变形**（保留页签
  条切换本体，仅「常驻可见」改「首开后常驻」），属 §2.2/§2.5 已授权面内的
  实现形态，不构成新架构决策；备选「常驻 + 重录 12 场景」违反 PRD AC2 硬
  约束，否决。

**workbench 模块段（文件尾追加，goal 面板段之后、bootLegacyApp 闭合 `}` 之前）**：

- 运行时状态 `const WB = { seen:false }`（内存态，不入 localStorage/undo，
  GOAL_BIND 先例）。
- `wbEnsure()`：幂等创建 `#wb-tabs`（四按钮 `.wb-tab[data-wb]`：props「属性」/
  git「仓库」/ diff「变更」/ tree「目录」，diff/tree `disabled` 占位 + title
  「后续批次提供」）→ `$('#rightbar').prepend(tabStrip)`；`#workbench`（空壳）
  → `$('#rightbar').appendChild(wb)`。**#rightbar 现有 app.js 引用为零**
  （本轮亲核 grep），prepend/append 不触 #props。
- `wbOpen(page)`：wbEnsure + `#rightbar` 加 `wb-on` + `wbSwitch('git')`。
- `wbSwitch(page)`：page='props' → 移除 `wb-page-git`（#props 恢复显示，
  renderProps 语义零变化）；page='git' → 加 `wb-page-git` + `.wb-tab` 激活态
  （`.on` 约定）+ `await refreshWorkbenchGit()` 后 `wbRenderGit()`（**on-open
  fetch**，REQ-0040-05；零轮询零 SSE）。
- `wbRenderGit()`：SVR.wbGitErr → 错误空态（`.wb-empty`「git 信息拉取失败 ·
  点击刷新重试」）；否则渲染概要（branch / head 短 sha / changes 计数）、
  `.wb-commit` 列表（short sha mono + author + subject + `fmtTs(ts)`）、
  `.wb-change` 列表（两位状态码 + path；rename 呈 `from → path`）；changes
  空 →「无变更文件（工作区干净）」。
- 刷新控件：`.wb-refresh` click → `refreshWorkbenchGit()` + `wbRenderGit()`。
- 页签 click 委托挂 `#wb-tabs`（新元素自身，不触 #props 三委托）。

**命名禁令（gate 公共六键硬约束）**：workbench 类名/节点**不得复用** `.wtab`/
`.wdg`/`.port`/`.node`（counts 计数面 gate.mjs:297-303，误用即全场景不变量红）；
**不得新增 `--` 自定义属性**（cssVars 采集首个样式表全部自定义属性
gate.mjs:296，新增即全场景键集变化——取值一律复用 `--panel/--panel2/--border/
--border2/--text/--text2/--text3/--accent/--mono` 或字面量）；`wb-` 前缀本轮
亲核全仓零碰撞（app.css/app.js grep 0 命中）；新文本沿用既有字体栈（零新字体）。

**BK-0034 协同定界（REQ-0040-06）：共存，非互斥**——依据代码事实：#goal-panel
`position:fixed; z-index:60`（app.css:552-554）浮于 #rightbar `z-index:30`
（app.css:337）之上；两者 DOM 无嵌套（body 直接子节点 vs #main 子节点），
焦点互不抢占（refreshPropsIfIdle :2215 仅判 #props 内焦点，goal textarea 与
#workbench 均不涉；git 页无文本输入面）。理由：工作台数据源为项目状态、会话
面板为会话内容，正交并存正是「边对话边看仓库状态」的工作台价值；层级已有
既定次序无需新机制。浏览器实测归手动 E2E ⑤（PRD 已分配）；组合态不进 golden
（两异步 fixture 叠加的稳定性风险大于收益，s9/s12 各自独立覆盖）。

### 3.5 app.css（#7，文件尾纯插入，~55 行）

```css
/* ===== 右栏工作台（BK-0040 / 迭代 0036 修宪轮 · ADR-0016 §2 B 案）=====
   懒创建：未打开前 #wb-tabs/#workbench 均 display:none（s0~s11 零波及）；
   值全取既有变量，零新增自定义属性（gate cssVars 不变量）。 */
#wb-tabs{display:none;flex:none;align-items:center;gap:2px;height:30px;padding:0 8px;
  border-bottom:1px solid var(--border2)}
#rightbar.wb-on #wb-tabs{display:flex}
.wb-tab{height:22px;padding:0 9px;font-size:11px;color:var(--text2);background:transparent;
  border:none;border-radius:5px;cursor:pointer}
.wb-tab:hover{color:var(--text)}
.wb-tab.on{color:var(--text);background:var(--panel3)}
.wb-tab:disabled{opacity:.4;cursor:default}
#workbench{display:none;flex-direction:column;flex:1;min-height:0}
#rightbar.wb-page-git #props{display:none}          /* 互斥视图切换（新选择器，不改 #props 既有规则） */
#rightbar.wb-page-git #workbench{display:flex}
.wb-topbar{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;flex:none;
  border-bottom:1px solid var(--border2)}
/* .wb-refresh 复用 .ibtn 通用样式（新增选择器仅补布局位）；.wb-scroll 滚动容器、
   .wb-summary 概要卡、.wb-kv 键值行、.wb-sec 分节标题、.wb-commit/.wb-change
   列表行、.wb-st 状态码（mono + 两字符宽）、.wb-sha mono 短 sha、.wb-empty
   空态/错误态——取值细节沿 #props 既有排版规格（11px/10px 层级、--mono、
   var(--border2) 分隔线），BUILD 落地时以 §3.4 DOM 终稿为准 */
```

（上表为形态与关键取值锚点；`.wb-scroll{flex:1;overflow-y:auto;padding:12px}`、
`.wb-kv`/`.wb-sec`/`.wb-commit`/`.wb-change`/`.wb-empty` 等列表排版选择器由
BUILD 按 #props 区既有规格补全，均 `wb-` 前缀新选择器、零改既有行。）

### 3.6 gate.mjs 场景增量（#8）+ golden 落盘（#9）

- **WB_ROUTES fixture**（WF/RUN/SESSION_ROUTES 先例，固定字面量 + 整点毫秒 +
  ASCII/CJK 混排字形安全口径）：

```js
const WB_ROUTES = [
  { pattern: '**/api/health', handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/workbench/git**', handler: route => route.fulfill({ json: {
    branch: 'main', head: 'a1b2c3d',
    changes: [ { status: ' M', path: 'apps/web/src/app.css' },
               { status: '??', path: 'notes/draft.md' } ],
    commits: [ { sha: '1111111111111111111111111111111111111111', short: '1111111',
                 author: 'AgentFlow', ts: 1767225600000, subject: 'fix: 修复画布缩放手势' },
               { sha: '2222222222222222222222222222222222222222', short: '2222222',
                 author: '示例用户', ts: 1767312000000, subject: 'feat: 新增节点库过滤' } ] } }) },
];
```

尾通配 `**` 覆盖 `?limit=20` 查询串（RUN_ROUTES 先例注记）；ts 为 2026-01-01/
02 UTC 整点毫秒，配合 `timezoneId:'UTC'` 使 fmtTs 确定性渲染 `1/1 00:00:00`。

- **wbOpen（真实交互路径两步）**：① `page.evaluate` 向 `#viewport` 派发
  `contextmenu` MouseEvent（target=viewport → 无 .node/g.edge → 空画布菜单分支）；
  ② `page.evaluate` 按 `textContent.includes('工作台')` 定位 `#ctxmenu .mi` 并
  `.click()`（走 :1768 真实委托 → item.f() → wbOpen('git')）。
- **wbReady 探针**（状态量非时延量，wfReady 先例）：
  `document.querySelectorAll('#workbench .wb-commit').length === 2 &&
   document.querySelectorAll('#workbench .wb-change').length === 2`，10s 超时
  红即 FAIL 不落伪基线。
- **wbInv（per-scenario 不变量，公共六键后 spread）**：`wbTabs`（`data-wb` +
  激活 `*` + 禁用 `!`，预期 `['props','git*','diff!','tree!']`）、`propsShown`
 （`#props` computed display，预期 false）、`wbBranch`（预期 `'main'`）、
  `wbCounts`（`'2c/2g'` 提交/变更行数）。
- **场景行**（SCENARIOS 尾追加）：
  `{ id: 's12-workbench-git-online', routes: WB_ROUTES, timezoneId: 'UTC',
     steps: [wbOpen], ready: wbReady, inv: wbInv }`
  无 seed（工作台入口与画布内容无关）；normalize/稳定双帧走既有机制。
- golden 落盘 = golden-created 通道（gate.mjs:321-325：基线 png 不存在即写盘
  并记 golden-created），详见 §6。

### 3.7 smoke B 组（#10，B01-B05，独立断言块沿既有组结构）

插入位置：O 组之后（主实例存活窗口内）；B04 实例自建自清理（挂 cleanup）；
B05 纯源扫描无实例依赖。**B 组字母本轮亲核未占用**（既有 A/C/D/E/G/H/K/N/O/
R/S/T/V/W/Z）。

| ID | 断言 | 口径 |
| --- | --- | --- |
| B01 | E1 正常契约（主实例） | GET `/api/v1/workbench/git` → 200；键集恰 `{branch,head,changes,commits}`；branch 非空串；head `/^[0-9a-f]{7,40}$/`；changes 每项 `{status:2 字符,path:string,from?:string}`；commits 1..20 条、每项 `{sha:40hex,short:7-40hex,author:非空,ts:正整数(毫秒),subject:string}`。**锚定下界证明**：锚少一级（apps/server 无 .git）→ 404 → B01 红 |
| B02 | limit 有效值 | `?limit=1` → commits.length===1；`?limit=3` → 1..3 |
| B03 | limit 非法值 | `?limit=0` / `?limit=101` / `?limit=abc` → 各 400 且 `error==='limit 必须是 1-100 的整数'` |
| B04 | 404 无仓库 + cwd 无关（专用探针实例） | `mkdtemp` 建临时非 git 目录：递归复制 `apps/server/dist` → `<tmp>/apps/server/dist`、`apps/web/dist` → `<tmp>/apps/web/dist`（server.ts:56-60 启动校验需 index.html）、`node_modules` 以 junction/symlink 指向 REPO_ROOT/node_modules（依赖全提升至根、@agentflow/* 指向工作树自身，本轮亲核）；`spawn(process.execPath, [<tmp>/apps/server/dist/server.js], { cwd: REPO_ROOT, env: 主实例同款空串密钥压制 + PORT })` → health 200 后 GET `/api/v1/workbench/git` → **404 + `{error:'not a git repository'}`**。**判别力**：cwd=REPO_ROOT 是真 git 仓库——若实现误用 process.cwd()（ADR-0016 §3.0 否决案）则 rev-parse 成功 → 200 → B04 红，恰好击穿；与 B01 合成锚定精确性双向机器证明。清理：kill + `rm -rf <tmp>`（finally） |
| B05 | 纪律源扫描（MT12 先例） | readFileSync `src/workbench/{root,git,routes}.ts`：/shell/i **零命中**（含注释——注释写「命令解释器」；推论：spawn 不得显式传 shell 选项）；git.ts 含 `setTimeout(` 与 `.kill()`（5s 超时强杀形态在场）；`/'(add\|commit\|push\|pull\|checkout\|reset\|clean\|merge\|rebase\|stash)'/` 单引号 argv 字面量**零命中**（TS 单引号约定下字段名 `commits` 与中文注释不误伤）；`rev-parse`/`status`/`log` 三词在场（白名单承载本体） |

基线 118（本轮亲测）→ B 组后 **123 passed / 0 failed**。断言形态沿 C.ok +
{expected, actual, ctx}；超时 500 与 ENOENT 路径**不做 HTTP 级测试**（win32 无法
可移植地伪造慢 git/缺 git 二进制），由 B05 源扫描 + code.ts:53 同构形态背书，
如实标注。

## 4. 模块边界

```
app.js workbench 模块段（唯一 DOM 面：#wb-tabs/#workbench/ctxmenu 项）
  │ 消费（import）
  ▼
server-sync.js workbench 数据面（fetchWorkbenchGit/SVR.wbGit/onWorkbenchGitArrive/
  refreshWorkbenchGit —— 仅数据层，不操作面板 DOM，ADR-0006）
  │ HTTP GET /api/v1/workbench/git（v1-only，无 /api/* 别名，ADR-0005 先例）
  ▼
apps/server/src/workbench/routes.ts（E1 handler：limit 校验/错误码映射/logger）
  │ 调用
  ▼
apps/server/src/workbench/git.ts（runGit 执行器 + collectGitInfo 解析）
  │ cwd=PROJECT_ROOT（root.ts 模块级常量）
  ▼
git 子进程（rev-parse / status / log 三命令，argv 数组 + 5s 超时 + 只读白名单）
```

**禁止越界面**：workbench 不进 `packages/shared`（零节点/SSE 契约）；不触
`events.ts`/回放映射/store.ts/engine.ts/handlers.ts；不触 `guard.ts`（零出站）；
server-sync 新增函数不操作任何面板 DOM；app.js 模块段不触 #props 既有面
（renderProps/三委托/滚动恢复/refreshPropsIfIdle）；gate.mjs/smoke 既有场景行、
既有断言零改动（纯插入）。

## 5. 验收口径（PRD AC1-AC6 可执行化；全部在工作树内执行）

1. **AC1** `npm run build` 全绿（shared + web；后端编译由 smoke/test 前置
   `build:server` 覆盖，`npm start` 形态不作为门禁）。
2. **AC2** `npm run gate`：**13 场景全绿**——s12 首跑 golden-created 落盘，
   二跑起 diffPx=0；**既有 12 场景（s0~s11）diffPx=0 逐场景实测**（本轮改动前
   基线 12/12 绿已在案；任一意外红即中止排查，不得重录掩盖，PRD REQ-0040-07）。
   全程**零 `npm run gate:update`**（§6）。
3. **AC3** `npm test` 30/30 零回退（本轮纯回归面，改动前基线 30/30 已在案）。
4. **AC4** `npm run smoke:server` **123 passed / 0 failed**（118 基线零回退 +
   B01-B05；基线 118/0 本轮亲测在案）。
5. **AC5** 手动 E2E 五点位（`npm start` → http://localhost:3000，浏览器实走 +
   error 钩子零捕获，沿 0022 在线 E2E 口径）：
   ① 右键空画布 → 菜单现「工作台 · 仓库信息」（git-branch 图标）→ 点击 →
     右栏顶部页签条出现（属性/仓库/变更/目录；仓库激活、变更/目录禁用），
     git 页呈概要卡 + 提交列表 + 变更行（本仓真实数据，branch 与
     `git status` 输出一致）；打开前默认态与基线零差异；
   ② 概要/提交/变更内容与 `git log`/`git status` 本机输出抽查一致
     （branch + 最新一条 subject）；
   ③ `.wb-refresh` 点击重取生效（DevTools Network 二次请求可见，或制造一个
     变更后刷新见计数变化）；
   ④ 点「属性」页签切回 → #props 恢复显示、选中节点参数编辑/回显语义与
     打开前逐字一致；再切回仓库页正常；
   ⑤ 双击 agent 节点开 goal 面板，与右栏工作台同开 → goal 面板浮于右栏之上、
     两者各自交互不互斥；goal 输入框打字时属性面板不被打断（§3.4 协同定界）。
6. **AC6 机器证明四零**：`git diff --stat` 证 package*.json / config.ts /
   packages/shared / Skeleton.tsx 恒空；`git diff --numstat` 证 app.js/app.css/
   gate.mjs/smoke-server.mjs 删除行=0（纯插入）；`git diff -U0 -- apps/web/src/
   legacy/app.js | grep -c '^-'` 为零且 renderProps/三委托/滚动恢复/
   refreshPropsIfIdle 区无修改行（#props 面专查）。

## 6. golden 方案与宪法第 3 条依据

- **重录范围 = 零重录**：既有 12 场景（s0~s11，24 个基线文件）**零触碰零重录**
  （改动前基线 12/12 diffPx=0 本轮亲测在案；BUILD 后全场景复测，任一红即中止
  排查）。**不运行 `npm run gate:update`**。
- **增量通道 = golden-created**：唯一新增 `s12-workbench-git-online`
  （.png + .invariants.json），经 gate.mjs:321-325 既有机制落盘（基线 png 不
  存在 → 写盘并记 golden-created），随后零容差比对；基线文件随产品提交入库。
- **宪法第 3 条三要素对应**：① ADR 在案 = ADR-0016（§6 golden 双通道预案：
  新增场景走 golden-created、受波及既有场景经修宪轮 gate:update 重录——本轮
  只启用前者；§2 B 案容器定界）；② 用户本人批准 = issue#4 owner 评论「批准」
  2026-10-23T15:49:17Z（PRD 轮 gh 亲核，授权链 BK-0039→BK-0040 承继）；③ 同
  迭代 golden 增量 = s12 基线 2 文件随产品提交入库（新增非重录）。
- **例外通道（本轮不启用）**：仅当实施选静态骨架化回退案（Skeleton.tsx 挂载
  容器）时 s0 受波及、修宪轮允许一次 gate:update 重录 s0（ADR-0016 §2.5）——
  本 SPEC §3.4 选动态创建案（Skeleton.tsx 零改动），该通道关闭。
- **场景号时序仲裁**：s12 为预期号；与并行路交错落盘时按 ADR-0015 §5 落盘
  时序裁决（先落盘者保留号、后落者取下一号，改动仅编号字面量与文件名、像素
  内容零变化，属改名非重录）。并行 BK-0038 路为既有 s3 重录面（其 PRD 定界），
  与本轮新增 s12 无同文件冲突；gate 既有场景行双方零改动（PRD 依赖节）。
- **权威与 CI**：golden 以 CI（windows-latest + Playwright Chromium）为权威
  （宪法第 2 条）；本机落盘的 s12 推送后以 `ui-constitution` required check
  复验，红即修。确定性纪律 = fixture 固定字面量 + `timezoneId:'UTC'` +
  wbReady 状态量探针 + 稳定双帧等待（s4/s5/s9 在线场景同款先例已证可行）。

## 7. 回滚

VERIFY FAIL 达修复上限 → `git revert <产品提交>`（唯一手段，禁 force/reset）；
s12 基线随提交删除；既有 12 场景未触碰无需还原；或按 WORKFLOW §4 迭代回滚
语义整体丢弃工作树（主干零影响）。ADR-0016 增补（#11）随产品提交同 revert。
