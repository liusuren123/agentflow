# 迭代 0056 · JOURNAL — BUILD 轮过程记录

> 产出角色：code-developer（BUILD 轮，2026-10-28 01:5x-02:3x）。输入：PRD §3/§7 +
> SPEC §2/§3（受影响文件清单与实现设计）。工作树 feat/0056-iter（HEAD 起步 = 主干
> ae6e3dc 的工作树检出）。**完整门禁（build/gate/test + golden 序列 + smoke 全量）
> 与 git 提交由脚本统一执行**——本 JOURNAL 所列自测均为 BUILD 侧编译/语法/功能级
> 自检，不替代 VERIFY 与脚本门禁。

## 1. 落地文件清单（与 SPEC §2 表逐项对应）

| # | 文件 | 动作 | 实况 |
| --- | --- | --- | --- |
| 1 | `apps/server/src/workbench/tree.ts` | 新增 | **151 行**（预算 ≤200）：validateTreeQuery（path resolve 归一前缀防越界（isWithinRoot 同构私有实现，不从 diff.ts 导出——§3.1.1 裁决）；depth `Number(q ?? 2)` 非整数/1-6 外 400）+ collectTree（lstat 锚定根判型（ENOENT/非目录两态共用 404 字面量）→ 折叠根短路（rel 首段 ∈ FOLD → 恒占位）→ walk 递归 level 1..depth（readdir 逐条 lstat、链接零追踪呈 file 形态取本体 size、'.git' 恒排除、readdir→lstat ENOENT 竞态跳过不击穿整树、FOLD=node_modules/dist/data/.zcode 占位 children 恒 []、level==depth 时 children 键缺席 = 可下钻、ENTRIES_CAP=500 全局计数截断 + truncated、同层 dir 先序码点序））+ WorkbenchTreeInputError/WorkbenchTreeError 两类 |
| 2 | `apps/server/src/workbench/routes.ts` | 扩 | workbenchTreeHandler：同步段 validateTreeQuery（400 直返，字面量 = 'path 越界'/'depth 必须是 1-6 的整数'）→ collectTree；异步 not-found 404（'path 不存在或不是目录'）/ 其余 logger.warn + 500（**'tree traversal failed'——E3 自有字面量，零 git 故不复用 E1/E2 的 'git command failed'**）；头注补 E3 行（+30/−1） |
| 3 | `apps/server/src/server.ts` | 纯插入 | import 行 +1 + v1-only 注册（diff 行后、PTY 段前）+ 头注 diff 块后补 tree 注记 5 行（SPEC §3.3 逐字）；numstat +7/−0（SPEC「+2~3 行」预算指 import/注册；头注注记系 BK-0056 纪律单独要求面） |
| 4 | `apps/web/src/server-sync.js` | 纯插入 | fetchWorkbenchTree（URLSearchParams 编码，空串省略 = 缺省语义；SPEC §3.4 逐字）+ SVR.wbTree/wbTreeErr + wbTreeArrive/onWorkbenchTreeArrive + refreshWorkbenchTree（wbGit/wbDiff 同型第五/六件；零 DOM，ADR-0006）；+20/−0 |
| 5 | `apps/web/src/legacy/app.js` | 段内扩 + 段外 1 行 import | 详见 §2；+97/−10（删除行 = 模块头注 4 + mk 解禁 1 + 刷新派发注释 2 + title 三元 1 + wbSwitch 结构行 2，全部段内） |
| 6 | `apps/web/src/app.css` | 纯插入 | :685 文件尾 +15 行：`#rightbar.wb-page-tree` 视图切换对 + .wb-tree-row(.ic)/.wb-tree-name/.wb-tree-dir(:hover)/.wb-tree-file/.wb-tree-fold（SPEC §3.6 逐字）；零新增自定义属性；:623-684 既有行零改动（含 :634 `.wb-tab:disabled` 声明保留——全启用后自然无命中对象） |
| 7 | `tools/pixel-gate/gate.mjs` | 增量 | WB_ROUTES 纯追加 E3 mock 路由（SPEC §3.7.1 fixture 逐字，三 dir 形态刻意各一）+ wbTreeOpen/wbTreeReady/wbTreeInv（§3.7.2）+ s18 场景行 + 头注 18→19 与在线态枚举加 s18 与溯源行（§3.7.3 授权射程内；+52/−3，删除行 = 头注计数/枚举 3 行） |
| 8 | `tests/smoke/smoke-server.mjs` | 纯插入 | B12 块后插 B13-B18 六断言 + 头注 blurb 增补 B13-B18 段（BK-0057 纪律；编排序 :5 不变）；+142/−0 |
| 9 | `tests/golden/ui/s18-workbench-tree-online.{png,invariants.json}` | 新增 ×2 | golden-created 通道（gate 首跑落盘，**脚本执行**；零 gate:update） |
| 10 | `tests/golden/ui/s16-workbench-git-online.{png,invariants.json}` | 重录 ×2 | 修宪轮 gate:update 恰一次（**脚本执行**；波及源 = tree 按钮解禁致 disabled 态 opacity .4→1 + title 移除 + 不变量 wbTabs `tree!`→`tree`） |
| 11 | `tests/golden/ui/s17-workbench-diff-online.{png,invariants.json}` | 重录 ×2 | 同上（s17 首次受后续批次波及） |
| 12 | `docs/adr/0016-*.md` | 增补 | §7 第三代码块尾追加实施纪要（**机制件提交面**，随分支机制件提交；状态行链终收口归 CLOSE 轮 REQ-0042-05） |

**productFiles 申报 = 上表 #1~#11 相对工作树根路径（含 golden 六文件；s18 两件由脚本
gate 首跑落盘、s16/s17 四件由脚本 gate:update 重录后入库）。#12 不进产品提交
（SPEC §2 注：#9-#11 与 #12 分属产品/机制件两提交）。**

## 2. app.js 落点明细（SPEC §3.5 对照）

- **段外唯一 1 行**：`:10` 后新增 `import { refreshWorkbenchTree, fetchWorkbenchTree }
  from '../server-sync.js';`——SPEC §3.5 未列 import；沿 0036/0054 先例（JOURNAL 各记
  「import +1 行」），既有行零删改。机器核对：`git diff -U0` 全部 hunk 落在 :11 import
  插入与 :2957-3123 workbench 段内，段外既有行零改动。
- **段内行级扩改 4 处**：①`mk('tree','目录',true→false)` 解禁（disabled 与
  `title="后续批次提供"` 一并消失——s16/s17 受波及唯一源）；②wbSwitch 扩
  `wb-page-tree` toggle + title 三元扩 `page === 'tree' ? '项目目录'` + tree
  else-if 分支（on-open fetch：`await refreshWorkbenchTree(); wbRenderTree();`）；
  ③`.wb-refresh` 处理器按 `WB.page` 派发扩 tree（重取当前根树整树重渲，展开态重置
  = 诚实刷新语义）；④模块头注与 diff 段注释如实更新（「tree 为禁用占位」在解禁后
  为假话——0054 已披露偏差①同款 honesty 优先）。
- **段内纯插入 2 处**：①wbEnsure 内 `.wb-scroll` click 事件委托一行（行级下钻的
  绑定机制选择：容器常驻一次注册，覆盖重渲与新插入子行——SPEC §3.5 规定「点击 ①
  形态行 → fetchWorkbenchTree」未规定绑定形态，委托为段内实现选择，零段外侵入）；
  ②wbRenderDiff 尾后插 wbTreeRows/wbTreeChev/wbTreeDrill/wbRenderTree（错误态
  `.wb-empty`「目录树拉取失败 · 点击刷新重试」；truncated 顶提示行；三形态分级
  （children 键缺席 = chev-right 可下钻 / 非空 = chev-down + `.open` + 子行随响应
  内嵌渲染 / `[]` = 置灰占位无 chev 无点击；file 无 chev）；行级下钻
  `fetchWorkbenchTree({ path: row.dataset.tp })` 行级直调不占 SVR.wbTree 缓存，成功
  后插子行 + chev 换向，失败插 `.wb-empty`「子目录拉取失败」不静默吞（重试前清理旧
  失败行）；收起 = 移除后随更高 data-lv 相邻行 + chev 复位（收起后再展开 = 重新
  fetch，零子树缓存）；缩进内联 `padding-left:${12 + level * 14}px` 不触 cssVars；
  图标只用既有 chev-right/chev-down 键，ICON_PATHS 零新增）。

## 3. 实现裁决与偏差记档（全部注释级/实现级，无扩面）

1. **`drillNames` 实测值**：SPEC §3.7.2 预期 `['apps','docs','server']` 但自带「:not(.open)
   取值以 BUILD 实现的类形态为准，VERIFY 按实跑对齐」注记——本实现给「已展开 dir 行」
   `.open` 类（与收起交互的状态语义一致），故 s18 不变量 `drillNames` 实测 = 文档序
   `['server','docs']`（apps 被 `:not(.open)` 排除）；`treeCounts = '3d/2f/2w'`、
   `foldNames = ['web','node_modules']`、`wbTabs`/`propsShown` 与 SPEC 预期一致。
2. **B18 fs 写面禁词词表形态**：SPEC 词表（writeFile/…/truncate/rm）若按字面子串扫描
   会误命中 E3 出参字段名 `truncated`——B18 实现为**调用形态**正则
   `/\b(writeFile|appendFile|unlink|rename|mkdir|chmod|chown|truncate|rm)\s*\(/g`
   （fs 写 API 只可能以调用形态出现，保义且零误报；E1/E2 的可写命令 regex 是 git
   argv 单引号面，两族词表不同源）。B05/B12 既有断言零触碰。
3. **tree.ts 注释措辞**：全程规避 'shell'/'spawn' 字样（B18 含注释扫描约束）——
   「零子进程」表述替代；fs 写面词零出现（含注释）。
4. **折叠内不存在子路径 404**：SPEC §3.1.3 步 2（lstat 锚定根判型）先于步 3（折叠根
   短路）——`?path=node_modules/nope` → 404 而非占位。实现严格按步序；电池已按此
   断言（`?path=node_modules` 与其**存在**内部路径 → 恒占位）。
5. **B13 的 `data` 折叠行依赖主实例 initStore**：工作树根 `data/` 由 smoke 主实例
   启动时创建（store.ts ROOT=dist 推导）；BUILD 电池（无 server 直调 dist）上下文
   中 data 缺席，如实记档并以 node_modules/.zcode 亲核 + smoke 期 data 断言承载。

## 4. BUILD 侧自测记录（如实：跑了什么、没跑什么）

已跑（工作树内，2026-10-28）：
- `npm run build:server`：tsc exit 0，零诊断。
- `npm run build`（shared + web）：Vite 构建成功（index.html 373.69 kB，exit 0）。
- 语法：`node --check tools/pixel-gate/gate.mjs` / `node --check
  tests/smoke/smoke-server.mjs` / `node --check apps/web/src/legacy/app.js` /
  `node --check apps/web/src/server-sync.js` 全 OK。
- **功能电池（node 直调 dist/workbench/tree.js，47 检全绿，exit 0）**：真仓库只读面
  ——B13 键集恰 {root,truncated}/root.name='0056-iter'（不锁字面量亲证）/root.path=''
  /children 含 apps+docs/.git 零出现/递归形状（dir 无 size、file size 非负整数）/
  FOLD 占位恒空（node_modules/.zcode 根级 + dist 经 apps/server 子树亲核）/同层
  dir 先序/total=46 ≤ 500/truncated boolean；B14 path=apps/server（name/path/含
  src）/depth=1 非折叠 dir 无 children 键/depth=4 workbench 带子层（children n=5）；
  B15 depth 0/7/abc/2.5 → 400 字面量逐一命中 + 缺省=2；B16 ../、../../、D:/、/etc
  → 'path 越界' 400 + path 数组（express 多值）→ 400；B17 不存在/文件两态 → 404
  同字面量、path=node_modules → 200 children=[] 恒空、path=.zcode/tools → 折叠下级
  短路恒空；锚定 PROJECT_ROOT=本工作树根亲证。合成树面（OS tmp 自建自清理）——
  .git 排除/dist/node_modules 折叠/depth2 嵌套（inner.txt size=20 + sub2 可下钻）/
  空目录=children:[] 占位/junction 链接零追踪呈 file 形态/dir 先序 + 码点序/
  depth1 耗尽/折叠根短路（pathInput=dist）/折叠下级存在路径短路/折叠内不存在路径
  404/**ENTRIES_CAP：600 文件目录 → 恰 500 条 + truncated=true**。
- 源扫描约束（B18 预演）：tree.ts+routes.ts+root.ts /shell/i 零命中；tree.ts
  'spawn' 零命中；fs 写面调用形态零命中；'readdir'/'lstat'/'.git'/FOLD 四名单引号
  字面量在场。
- 四零机器证明：Skeleton.tsx / packages/shared / package.json / package-lock.json /
  apps/server/src/config.ts / apps/server/src/guard.ts / .env.example
  `git diff --stat` 空 ✓。
- numstat：app.css +15/−0、server-sync.js +20/−0、smoke +142/−0（纯插入 ✓）；
  gate.mjs +52/−3（删除 = 头注 :4-8 计数/枚举 3 行，§3.7.3 申报内例外）；
  app.js +97/−10（删除全部段内，§2 列明）；routes.ts +30/−1（头注行扩）；
  server.ts +7/−0。

未跑（归脚本/VERIFY）：`npm run gate` 全量（预期首跑恰 s16/s17 红 + s18
golden-created，s3 抖动按 issue #12 rerun 口径）、`npm run gate:update`（s16/s17
重录恰一次 + 非六文件集 git checkout 收敛）、`npm run gate` 复跑 19/19、`npm test`、
`npm run smoke:server` 全量（预期 151/0）、手动 E2E 七点位、git 提交。

## 5. VERIFY 提示

1. SPEC §5 AC0-AC8 逐条；AC4 分步口径：BUILD 后首跑 = s18 golden-created + 恰
   {s16, s17} FAIL（diffPx>0 + wbTabs 不变量 `tree!`→`tree`）；gate:update 后
   `git status --porcelain tests/golden/ui/` 变更集**恰 6 文件**（s16×2 M + s17×2 M
   + s18×2 A；0054 P1 教训：gate:update 全量重写的 CRLF 幻影 M 需 git checkout
   收敛，归脚本）；其余 16 场景 diffPx=0 实测；s3 抖动按 rerun/CI 权威处置，
   **不得以此消费 gate:update**。
2. s18 不变量预期（本实现类形态）：`wbTabs = ['props','git','diff','tree*']`、
   `propsShown=false`、`treeCounts='3d/2f/2w'`、`foldNames=['web','node_modules']`、
   **`drillNames=['server','docs']`**（§3.1 偏差记档，SPEC 明文按实跑对齐）。
3. smoke 预期新总数 **151 passed / 0 failed**（145 + B13-B18 六条；MERGE 收口记入）；
   B13 的 data 折叠行依赖主实例 initStore 创建工作树根 data/（§3.5 记档）。
4. AC6 手动 E2E 点位 5：DevTools Network 核每次目录行点击恰一条
   `GET /api/v1/workbench/tree?path=<行路径>`（零全量预取）。

## 6. 修复轮（2026-10-28 01:0x，脚本门禁阶段 golden 收敛问题）

> 输入：修复派发（未附 BUG 清单）——按 0054 修复轮 1 同款纪律，问题判定全部基于
> 工作树产物取证（文件 mtime / git status / git diff / sha256 / diff/ 目录残留），
> 非门禁日志直读。本轮**未运行任何门禁/未提交**（按派发指令）。

**脚本门禁序列还原（产物取证）**：①gate 首跑 01:04——`tests/golden/diff/` 落
   {s16, s17, s3-library} 三场景失败产物（current.png + diff.png + invariants.json，
   mtime 01:04 亲核）；s16/s17 = SPEC §6 预判的受波及重录面（tree 按钮解禁），s3 =
   issue #12 在案本机采样抖动形态（0037~0052 多轮先例）；s18 同跑 golden-created；
   其余 s0~s15 对既有基线 pass（diff/ 无其产物 = diffPx=0 且不变量零差的实测）。
   ②`gate:update` 恰一次 01:05——ui/ 全部基线重写（s0~s18 .invariants.json mtime
   01:05 + s16/s17/s18/s3 png 重写）。③产物中无 01:05 后的复跑痕迹（diff/ 未被
   清空、无更新 mtime）——脚本停在 golden 变更集收敛检查：实得 25 文件（23 M +
   2 A），远超 SPEC §6⑤「恰 6 文件」机器证明口径。

**发现的问题与修复（0054 §6 P1 同型复发，根治属 gate.mjs/工作流侧——本轮按 SPEC
§6 步 3 收敛）**：
- **P1 · gate:update 全量重写致 golden 变更集不收敛**：17 个多余变更 = ①s0~s15
  十六个 .invariants.json 的 **CRLF 幻影 M**（`git diff --stat` 零 hunk 亲核——
  gate.mjs writeFileSync 输出 LF、win32 autocrlf 检出 CRLF，内容归一后零变化，
  0054 P1 同因同形）；②`s3-library.png` **真字节变化**（Bin 119528→119520，8 字节）
  ——gate:update 把 01:04 抖动渲染重写进了基线。**修复**：`git checkout --` 显式
  17 文件清单（十六个 invariants + s3 两件）恢复 HEAD 字节——s3 依 SPEC §6/AC4
  与 issue #12 纪律**不得以抖动消费重录基线**（golden 权威在 CI）。修复后
  `git status --porcelain tests/golden/ui/` = 恰 s16×2 M + s17×2 M + s18×2 A——
  AC4「恰 6 文件」机器证明形态复原。

**核验通过项（无需修复，留证）**：
- s16/s17 重录基线的不变量差异**恰一行** `"tree!"` → `"tree"`（git diff 亲核，
  两场景同形）——波及源唯一性预判（SPEC §6 表）兑现，无其他键漂移。
- **确定性证明（0054 §6 同款）**：gate 首跑失败产物与重录基线 sha256 逐字节一致
  ——s16 `ff62e4fa…`、s17 `0715f590…`（diff/current.png 01:04 ↔ ui/*.png 01:05）
  → 重录捕获的是确定性末态，脚本复跑 19/19 预期全绿（s3 抖动除外，见下）。
- **s18 首个真浏览器证据**：golden 落盘的 invariants 与本 JOURNAL §5.2 预测逐键
  吻合——wbTabs `['props','git','diff','tree*']` / propsShown:false /
  treeCounts `'3d/2f/2w'` / foldNames `['web','node_modules']` /
  **drillNames `['server','docs']`**（§3.1 偏差记档按实跑兑现）/ cssVars 33 键
  零新增 / counts（nodes 8, edges 7, widgets 15, ports 15, tabs 1）与既有场景
  同源——wb-tree 前缀类名零触计数面与自定义属性面的实现承诺经浏览器实测背书。

**本轮未做（如实）**：未跑 build/gate/gate:update/test/smoke（门禁归脚本；s3 本机
   抖动形态复跑仍可能红——按 issue #12 rerun/CI 权威口径处置，**不得以此消费
   gate:update**，0037~0052 一贯纪律）；未提交；STATE.md 未触碰（phase=BUILD 与
   repair_round 计数归协调者）。工作树无 data/ 目录（佐证 smoke 主实例尚未在本
   工作树运行——B13-B18 未经全量冒烟，归脚本后续）。productFiles 清单不变
   （累积并集口径，本轮零清单变更——修复对象 golden 六文件均已在申报内）。

