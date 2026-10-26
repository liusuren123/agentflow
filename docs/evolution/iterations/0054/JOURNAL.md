# 迭代 0054 · JOURNAL — BUILD 轮过程记录

> 产出角色：code-developer（BUILD 轮，2026-10-27 01:14-01:4x）。输入：PRD §3/§7 +
> SPEC §2/§3（受影响文件清单与实现设计）。工作树 feat/0054-iter（HEAD=d880b62 起步）。
> **完整门禁（build/gate/test + s16 golden 重录 + smoke）与 git 提交由脚本统一执行**——
> 本 JOURNAL 所列自测均为 BUILD 侧编译/语法/功能级自检，不替代 VERIFY 与脚本门禁。

## 1. 落地文件清单（与 SPEC §2 表逐项对应 + 1 项批准扩面）

| # | 文件 | 动作 | 实况 |
| --- | --- | --- | --- |
| 1 | `apps/server/src/workbench/diff.ts` | 新增 | 158 行（BUILD 154 + 修复轮 2 增 4）：validateDiffQuery（ref 白名单/REF_MAX 200/path resolve 防越界/stat 界值）+ collectDiff（rev-parse 探测 → argv 装配 → runGit）+ parsePatch（`(?=^diff --git )` 零宽切块；path 四优先级 `+++ b/`→`--- a/`→`rename to`→块首行 `diff --git a/… b/` 兜底（BUG-0054-01，§7）；status A/D/R/M 扩展头语义；adds/dels 计 ± 行排除 +++;；PATCH_CHAR_CAP 20000 逐文件截断 + FILES_CAP 500 条截断，双截断共用顶标记 truncated）+ parseNumstat（`adds	dels	path` 逐行；status/patch 置空串不伪造）+ WorkbenchDiffInputError/WorkbenchDiffRevisionError 两类 |
| 2 | `apps/server/src/workbench/git.ts` | 改（1 词 + 注释 2 行） | :24 `function runGit` → `export function runGit`（导出复用，E1 语义零变化；SPEC §3.1.1） |
| 3 | `apps/server/src/workbench/routes.ts` | 扩 | workbenchDiffHandler：同步段 validateDiffQuery（400 直返，字面量 = 'base 或 head ref 非法'/'path 越界'/'stat 必须是 0/1/true/false'）→ collectDiff；异步 not-repo 404（'not a git repository'，E1 字面量一致）/ WorkbenchDiffRevisionError 400（'base 或 head ref 不存在或不可解析'）/ 其余 logger.warn + 500（'git command failed'）；头注补 E2 行 |
| 4 | `apps/server/src/server.ts` | 纯插入 | :49 后并列 import 行 + :236 注册行（v1-only，无 /api/* 别名）+ 头注 :17-19 区补 diff 端点 3 行（BK-0056 活清单纪律） |
| 5 | `apps/web/src/server-sync.js` | 纯插入 | fetchWorkbenchDiff（URLSearchParams 编码，空串省略 = 缺省语义）+ SVR.wbDiff/wbDiffErr + wbDiffArrive/onWorkbenchDiffArrive + refreshWorkbenchDiff（wbGit 四件同型第五件；零 DOM，ADR-0006） |
| 6 | `apps/web/src/legacy/app.js` | 段内扩 + 段外 1 行 import | 详见 §2 |
| 7 | `apps/web/src/app.css` | 纯插入 | :660 文件尾 +24 行：`#rightbar.wb-page-diff` 视图切换对 + .wb-diff-bar/.wb-ref/.wb-diff-file(.on)/.wb-diff-st(.wa/.wd/.wr/.wm 状态色取 --ok/--err/--cat-logic/--warn)/.wb-diff-path/.wb-diff-nums/.wb-diff-pre；零新增自定义属性；:623-660 既有行零改动 |
| 8 | `tools/pixel-gate/gate.mjs` | 增量 | WB_ROUTES 纯追加 E2 mock 路由（SPEC §3.7.1 fixture 逐字）+ wbDiffOpen/wbDiffReady/wbDiffInv（§3.7.2）+ s17 场景行 + 头注 17→18 与枚举行加 s17（§3.7.3 授权射程内） |
| 9 | `tests/golden/ui/s17-workbench-diff-online.png` + `.invariants.json` | 新增 ×2 | golden-created 通道（gate 首跑落盘，脚本执行；零 gate:update） |
| 10 | `tests/golden/ui/s16-workbench-git-online.png` + `.invariants.json` | 重录 ×2 | 修宪轮 gate:update 恰一次（脚本执行；波及源 = diff 页签解禁致 disabled 态 opacity .4→1 + 不变量 wbTabs `diff!`→`diff`） |
| 11 | `tests/smoke/smoke-server.mjs` | 纯插入 | B05 块后插 B06-B12 七断言（固定提交对 ed2f8ed↔d880b62 锚）+ 头注 blurb 增补 B06-B12 段（编排序 :5 不变）；+169/−0 |
| 12 | `docs/adr/0016-*.md` | 增补 | 状态行 BK-0041 置「实施轮已消费（迭代 0054）」+ §7 第二代码块尾实施纪要（含 --numstat 定形偏差记档，SPEC §3.1.3） |
| **13** | **`apps/server/src/workbench/root.ts`** | **改（1 行实质 + 注释）** | **【SPEC §2 禁区偏差·经批准扩面】见 §3**：上溯 `'..','..','..'` → 4 个（PROJECT_ROOT 锚到仓库根） |

**productFiles 申报 = 上表 #1~#13 相对工作树根路径（含 golden 双文件；golden 由脚本
gate 运行落盘后入库）。**

## 2. app.js 落点明细（SPEC §3.5 对照 + 3 处已披露偏差）

- **段外唯一 1 行**：`:9` 后新增 `import { refreshWorkbenchDiff } from '../server-sync.js';`
  ——SPEC §3.5 未列 import；沿 0036 先例（JOURNAL 记「import +1 行（refreshWorkbenchGit）」，
  既有行零删改）。机器核对：`git diff -U0` 全部 hunk 落在 :9/:10 import 插入与
  :2950-3038 workbench 段内，段外既有行零改动。
- **段内 3 处行级扩改**（SPEC §3.5-1/2/3）：①`mk('diff','变更',true→false)` 解禁
  （tree 保持 true）；②wbSwitch 设 `$('.wb-title').textContent`（props='属性'/
  git='仓库信息'/diff='变更对比'，初值 '仓库信息' 保留）；③`.wb-refresh` 处理器按
  `WB.page` 派发（diff → refreshWorkbenchDiff(wbdQuery())+wbRenderDiff()；git →
  既有两行原样）。
- **段内 2 处纯插入**（SPEC §3.5-4/5）：wbSwitch 扩 `wb-page-diff` toggle + diff
  else-if 分支（on-open fetch）；wbRenderGit 尾后插 WBD/wbdQuery/wbRenderDiff
  （错误态/空态/截断提示行 + .wb-diff-bar 三输入 + .wb-sec「文件」+ .wb-diff-file 行
  + .wb-sec「补丁」+ .wb-diff-pre 等宽原文；input 回写 WBD、Enter 同径刷新、文件行
  click 仅重渲补丁区；类名全 wb-diff-/wb-ref 前缀，不触计数面与 -- 自定义属性面）。
- **已披露偏差①**：模块头注 4 行更新（「本批仅 git 页落地，diff/tree 为禁用占位」
  在解禁后为假话——改为 git/diff 已落地、tree 占位 BK-0042）。段内注释级、零行为
  影响，SPEC §3.5 枚举外， honesty 优先并在此留痕。
- **已披露偏差②（gate 侧）**：`wbDiffOpen` 在 wbOpen 与点 diff 页签之间插入
  `await wbReady(page)`——排除「git fetch 晚于 diff fetch 完成时 wbRenderGit 后写
  覆盖 .wb-scroll」的时序竞争（wbOpen 的 Node 侧 evaluate 不等待浏览器侧 async
  链完成）。SPEC §3.7.2 三步路径不变，仅加就绪门；防的是伪 FAIL，不改变任何被测
  行为。s16（无此步）不受影响。

## 3. 【重点】root.ts 禁区偏差声明与缺陷证据链（经主代理批准，2026-10-27）

**批准口径**：修复面 = 上溯改 4 级（1 行实质）+ 头注注释同步更正（写明「dist 上溯
两级系 tools.ts 位于 dist 根的口径，workbench 模块深一级须 4 级」根因）；禁止其他
顺手改动；不动 ADR-0016 §3.2 命令字面；不引入 /shell/i 字样（B05 源扫描约束）；
diff.ts 不私设第二锚定常量。全部遵守。

- **①禁区偏差声明**：SPEC §2 禁区明文「`apps/server/src/workbench/root.ts`
  （PROJECT_ROOT 复用零改动）」、AC6 要求其 git diff 恒空——该禁区建立在「既有
  PROJECT_ROOT 正确」的前提上（SPEC §0 锚点表「PROJECT_ROOT :14-15 …在案」、§1
  「`workbench/root.ts:14` 既有常量，本项复用零新增」）。实测前提不成立：该常量
  锚错一级。属**前提失效**，非违约放水；本偏差经 escalate 取得主代理批准后执行，
  productFiles 以累积并集口径并入 #13。
- **②缺陷证据链（本会话实跑）**：
  1. `node` 加载 dist/workbench/root.js 打印 `PROJECT_ROOT`：**修复前 =
     `D:\…\agent-workflow\.zcode\worktree\feat\0054-iter\apps`**（错锚；正确值 =
     工作树根，修复后实跑确认）；
  2. pathspec 字节对照：`git -c core.quotepath=off diff --no-color ed2f8ed d880b62
     -- docs` 以真根为 cwd 出 3029 字节；经 runGit（cwd=错锚 apps/）出 **0 字节**
     ——pathspec 相对 cwd 解析为 `apps/docs`，静默空结果，B07 `path=docs → 1 条`
     必红；
  3. 掩盖机理：git 以 cwd 向上搜 `.git`，`apps/` 仍在仓库内 → rev-parse 探测通过、
     status/log/porcelain 输出与 cwd 无关 → E1 全绿掩盖错锚；越界 400 反例
     （`../`、`D:/`、`/etc`）在错锚下恰好仍 400（resolve 后非 apps/ 内），B10
     无法暴露。
- **③溯源归属**：缺陷引入于**迭代 0036（BK-0040）**——root.ts 注释「server.ts:44
  为 dist 平铺两级，本模块深一层故三级」计数错误（server.ts 实为 dist 上溯 3 级到
  根；workbench 再深一级须 4 级），其 B04 探针宣称的「off-by-one 双向拦截」只能区分
  「仓库内 vs 仓库外」，无法区分 3↔4 级之差（apps/ 与真根同为仓库内）——记为
  **0036 验收盲区**。本轮修复同时为 BK-0042（tree 页，E3 遍历锚定）排雷。
- **修复后复测（本会话）**：PROJECT_ROOT = 工作树根 ✓；`path=docs` → 1 条
  `docs/evolution/STATE.md`、`path=.zcode` → 1 条 ✓；固定对默认/stat 双模式逐文件
  (M,21,7)/(M,2,2) ✓；E1 collectGitInfo 正常（branch/changes/commits 亲跑）✓；
  B04 形态推演：tmp 探针 dist/workbench 4 级上溯 = tmp（无 .git）→ 404 保持 ✓。

## 4. BUILD 侧自测记录（如实：跑了什么、没跑什么）

已跑（工作树内，2026-10-27 01:14-01:4x）：
- `npm run build:server` ×2（root.ts 修复前后各一）：tsc exit 0，零诊断。
- 语法：`node --check tools/pixel-gate/gate.mjs` / `node --check
  tests/smoke/smoke-server.mjs` OK；app.js/server-sync.js 经 esbuild
  transformSync（loader js, esm）解析 OK（Mimosa 钩子禁止 bash 触碰源码路径的
  cp/mv，改用只读解析）。
- 功能（node 直调 dist/workbench/diff.js，真实 git 只读）：固定对默认模式
  files=2、`.zcode/workflows/evolution-iteration.dwf.ts`=(M,21,7)、
  `docs/evolution/STATE.md`=(M,2,2)、truncated=false；stat 模式 files=2、
  status/patch 全空串、adds/dels 与默认模式逐文件相等；path=docs/.zcode 各 1 条
  （root.ts 修复后）；无参 HEAD↔工作区多文件全 M、键集恰 {files,truncated}；
  400 反例九例字面量逐一命中；deadbeef → WorkbenchDiffRevisionError（400 面）。
- 源扫描约束：workbench 四文件 /shell/i 零命中（grep exit 1）；diff.ts+routes.ts
  可写命令单引号字面量零命中（grep exit 1）；diff.ts 含 'diff'/'--no-color'/
  '--numstat'/'./git.js'（B12 预演）。
- 四零机器证明：Skeleton.tsx / packages/shared / package*.json / config.ts /
  guard.ts / .env.example `git diff --stat` 空 ✓。
- numstat：app.css +24/−0、smoke-server.mjs +169/−0（纯插入 ✓）；gate.mjs
  43/−3（删除行 = 头注 :4-8 计数与枚举行，§3.7.3 申报内例外）；app.js +77/−6
  （删除行 = 段内注释 4 + mk 解禁 1 + 刷新派发 1）。

未跑（归脚本/VERIFY）：`npm run build`（shared+web）、`npm run gate` 全量、
`npm run gate:update`（s16 重录恰一次）、`npm test`、`npm run smoke:server`、
手动 E2E 七点位、git 提交。

## 5. VERIFY 提示（含主代理批准的独立复核要求）

1. root.ts 修复须独立复核，不得只采信本 JOURNAL：从 dist 实跑打印 PROJECT_ROOT
   确认锚到仓库根；带 pathspec 的 diff 复现「修复前 0 字节 / 修复后非空」对照；
   B01~B07 全绿且 gate 既有场景零波及实测（纯后端改动，s0~s15 diffPx=0 预期）。
2. SPEC §5 AC0-AC8 逐条；AC2 分步口径（BUILD 后首跑 = s17 golden-created + 恰
   s16 红；gate:update 后 18/18；`git status tests/golden/ui/` 仅 s16 两改 + s17
   两新）；s3 抖动按 issue #12 rerun 口径，绝不消费 gate:update。
3. AC6 的 app.js 段外核对：唯一段外 diff = :9/:10 import 插入行（§2 已披露，
   0036 先例）；root.ts 偏差以本 JOURNAL §3 + 主代理批准为准（2026-10-27
   escalate 答复在案）。
4. smoke 预期新总数 **145 passed / 0 failed**（138 + B06-B12 七条；MERGE 收口
   记入）。

## 6. 修复轮（2026-10-27 01:5x，验收/门禁问题修复）

> 背景：脚本在工作树执行门禁序列后派发修复轮。本轮**未运行任何门禁/未提交**
> （按派发指令）；诊断全部基于工作树产物取证（文件 mtime / git status / git
> diff / sha256 / 内容比对），取证命令与结论逐条列下。另如实声明：本会话无法
> 读取工作流运行日志（ListWorkflowRuns 不可达），`.mimosa/hook-state/…actor_5_1`
   两个状态文件 `reportedFindings: []` 无发现清单——本轮问题判定来自产物证据
> 而非派发附件中的 BUG 列表（派发文本未附清单）。

**脚本门禁序列还原（产物取证）**：①gate 首跑（diff/ 落 s16 三件失败产物，
   t≈01:50:55；s17 基线首落 golden-created）；②`npm run gate:update` 恰一次
   （ui/ 全部基线重写，s16 t≈01:51:38、s17 t≈01:51:40）；③产物中无后续复跑
   痕迹（diff/ 未被清空、ui/ 无更新 mtime）——18/18 复跑归脚本后续执行。

**发现的问题与修复**：
- **P1 · golden 机器证明被 CRLF 幻影 M 击穿（AC2 口径）**：gate:update 按机制
  重写**全部**场景基线（gate.mjs 比对循环 `if (UPDATE || !existsSync(gPng))`
  对 --update 无场景过滤——「恰一次仅限 s16」是意图级口径，机制级是全量重写）。
  writeFileSync 输出 LF，而 win32 autocrlf 检出为 CRLF → eol 往返不稳定 →
  `git status` 将 **s0~s15 全部 16 个 .invariants.json 标记为 M**（内容归一后
  零变化：`git diff` 对 s0 零 hunk、`git diff --stat -- tests/golden/ui/` 仅
  s16 两行），直接违反 SPEC §6⑤/AC2「`git status tests/golden/ui/` = 仅 s16
  两文件 modified + s17 两文件新增，其余 32 文件零字节漂移」的机器证明。
  **修复**：`git checkout --` 恢复 s0~s15 十六个未触碰基线为 HEAD 字节（内容
  等价、零损失）；修复后实查 `git status --short -- tests/golden/ui/` =
  恰 `M s16-workbench-git-online.invariants.json` + `M s16-workbench-git-online.png`
  + `?? s17-…×2`——AC2 证明形态复原。后续无再 gate:update 计划，普通 gate
  运行只比对不写盘，修复持久。
- **核验通过项（无需修复，留证）**：s16 不变量内容差异恰一行 `"diff!"`→
  `"diff"`（SPEC §6 预判兑现）；png Bin 86429→86436；s17 基线与 SPEC §3.7.2
  逐键吻合（wbTabs `["props","git","diff*","tree!"]` / propsShown:false /
  diffCounts:"2f" / patchHead 前 24 字符 fixture 确定 / cssVars 31 键与
  counts 零新增）；**确定性证明**：gate 首跑的 s16 失败产物
  `tests/golden/diff/s16-…current.png` 与重录后基线 `tests/golden/ui/s16-….png`
  sha256 逐字节一致（21c9fbf8…，cmp 零差异）→ 重录捕获的正是确定性末态，
  脚本 18/18 复跑预期全绿；diff/ 残留为 gitignored 瞬态（全绿时 gate 自清，
  gate.mjs BUG-002 清理分支），保留作首跑证据。
- **工作树终态核对**：`git status --short` 全表 = 产品面（8 改 + diff.ts 新增
  + s16×2 改 + s17×2 新，与 §1 productFiles 申报一致）+ 机制件（BACKLOG.md /
  STATE.md / iterations/0054/，不进产品提交）；`tests/golden/diff` 经
  `git check-ignore` 确认忽略。

**本轮未做（如实）**：未跑 build/gate/test/smoke（门禁归脚本）；未提交；
  STATE.md 维持 phase=BUILD（无 VERIFY REPORT.md 在案，repair_round 计数归
  协调者；本轮修复对象为脚本门禁阶段暴露的基线卫生问题，非 VERIFY FAIL 回流）。

## 7. 修复轮 2（2026-10-27 02:4x，BUG-0054-01 · VERIFY FAIL 回流）

> 输入：VERIFY 派发清单（唯一 Major）：E2 默认模式（HEAD↔工作区）下二进制
> 文件变更块 path 为空串，击穿 smoke B06「path 非空」断言；fail-fast 连带
> B07~B12 未执行，smoke 终态 133/1（预期 145/0）；定位 diff.ts parsePatch
> path 三优先级（`+++ b/` → `--- a/` → `rename to`）对 Binary files 块全部
> miss。其余验收面全过（AC0 VERBATIM/AC1/AC2 后端 25 断言/AC3/AC6 六点位/
> AC4 golden 产物/AC7 四零/root.ts 扩面复核，派发清单在案）；STATE.md 已由
> 协调者置 phase=VERIFY。

**根因**：二进制变更块形态 = 块首 `diff --git a/x b/x` + `index …` +
`Binary files a/x and b/x differ`——无 `+++ b/`、无 `--- a/`、无 `rename to`，
三优先级全 miss → path 落空串。SPEC §3.1.3 的 path 提取清单本身未覆盖二进制块
（「二进制块 … 如实呈现不特判」只处理了 adds/dels 与 patch，漏了 path）——
属 SPEC 设计缺口在实现面的暴露，非实现偏离 SPEC。

**修复（diff.ts parsePatch，+4 行含注释）**：补第四优先级兜底
`if(p === '') p = pick(/^diff --git a\/(.+) b\//)`——块首行为所有块（含二进制）
的公共结构；仅当前三级全 miss 才走兜底，文本块 path 提取路径零变化。零 UI/
零 golden/零前端改动（浏览器空路径行为该 BUG 的下游症状，后端修复即消）。

**复现与验证（本会话实跑，node 直调 dist + 真实 git 只读）**：
- 修复前（旧 dist）：`collectDiff({})` 中二进制块 = `{"path":"","status":"M",
  "adds":0,"dels":0,"patch":"diff --git a/tests/golden/ui/s16-workbench-git-online.png …
  Binary files … differ"}`、空 path 文件数 = 1——与派发清单实录逐字一致
  （触发源 = 本迭代 s16 golden 重录自身制造的二进制变更，VERIFY 判「自咬」形态）。
- 修复后（`npm run build:server` 重编，tsc exit 0）：二进制块 =
  `["tests/golden/ui/s16-workbench-git-online.png","M",0,0]`；空 path 文件数 = 0、
  14 文件全部 path 非空；B06 全形状绿（键集 {files,truncated}、五键、
  /^[MADR]$/、adds/dels 非负整数、truncated boolean）。
- 回归电池：B07 固定对 (M,21,7)/(M,2,2) + truncated=false + docs/.zcode 前缀
  各恰 1 条；B08 stat 模式逐文件相等且 status/patch 全空串；B09 九例 400 字面量
  + deadbeef→WorkbenchDiffRevisionError；B10 四例 path 越界 400；文本块 path
  仍走 `+++ b/` 优先级（抽查 ADR-0016 行 (M,6,3) 正确）。
- 约束复扫：diff.ts 158 行 ≤400；/shell/i 零命中；可写命令单引号字面量零命中；
  'diff'/'--no-color'/'--numstat'/'./git.js' 四标记在场（B12 预演全绿）。

**本轮未做（如实）**：未跑 `npm run smoke:server` 全量（门禁归脚本——派发清单
  要求修复轮全量重跑至 145/0，由脚本门禁阶段执行；本轮以 dist 直调功能电池
  覆盖 B06 靶点与 B07~B10/B12 契约形状，B11 探针实例未重跑——其形态自 BUILD
  轮以来未动）；未提交；STATE.md 未触碰（phase=VERIFY 归协调者，repair_round
  计数同）。productFiles 清单不变（累积并集，本轮零清单变更——仅改既有申报内
  的 diff.ts）。
