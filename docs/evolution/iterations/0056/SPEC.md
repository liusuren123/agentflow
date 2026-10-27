# SPEC · 迭代 0056 · BK-0042 工作台·项目目录树页（后端 E3 tree 端点 + UI，修宪轮，BK-9004 链终轮）

> 产物角色：spec-designer（SPEC 轮）· 2026-10-28 · 工作树 feat/0056-iter
> 消费方：code-developer（BUILD）→ test-manager（VERIFY）
> 上游：PRD `docs/evolution/iterations/0056/PRD.md`（PLAN 轮产出）；权威定界 =
> **ADR-0016 §7 第三代码块**（本 SPEC §1 逐字消费，终稿以 ADR-0016 为准）
> 授权链 = **issue#4 用户批复承继（2026-10-23T15:49:17Z，BACKLOG BK-9004 行在案）
> + ADR-0016（§2.2 tree 页签 / §3.3 E3 契约 / §4 防越界 / §5 编排 / §6 golden 预案）**
> ——修宪轮（触UI=是），**S 项但触 UI，skipSpec=false**（PRD §0 括号条件裁定）。
> 回执口径：sourceIssue=4，itemContinues=false（BK-9004 链终轮，CLOSE 回执关单）。

## 0. 代码锚点现值（本会话在工作树内逐项亲核；沿 0036/0054「行号按代码事实转写」先例）

| 锚点 | 现值（本 SPEC 会话实读） |
| --- | --- |
| workbench 模块 | `wc -l` 亲核：root.ts 18 / git.ts 84 / diff.ts 158 / routes.ts 56 行；E1/E2 已落地，E3 空缺 |
| 项目根锚定 | `root.ts:17-18` PROJECT_ROOT 模块级常量（dist/workbench 上溯四级 = 仓库根；:10-16 差级根因注记）——E3 fs 遍历锚定**直接复用零新增** |
| 端点注册 | `server.ts:257-260` E1/E2 v1-only 注册（ADR-0005 先例「新端点仅 v1 无旧别名」）；头注 :17-19（git）/ :20-23（diff）为 workbench 既有头注行——E3 落地补注 |
| 入参校验先例 | `routes.ts:14-18` E1 limit 同步段 400 直返（`Number(req.query.limit ?? 20)` 非整数/越界即 400，server.ts:173 同款）；`routes.ts:33-43` E2 validate→400 直返 + 异步段 404/500 映射 |
| 防越界先例 | `diff.ts:34-37` isWithinRoot（`path.resolve(PROJECT_ROOT, input)` 归一后 `resolved === PROJECT_ROOT \|\| resolved.startsWith(PROJECT_ROOT + path.sep)` 前缀比对）——E3 同构复用（锚定根 = 项目根） |
| tree 页签占位 | `app.js:2972` `mk('tree','目录',true)`（disabled + `title="后续批次提供"`）；wbSwitch（:3001-3016）仅 git/diff 两分支 + title 三元（:3007）；wb-refresh 按页派发（:2986-2991）仅 diff/else-git 两路 |
| 页签条样式 | `app.css:627-634` wb 家族；**:634 `.wb-tab:disabled{opacity:.4;cursor:default}`**——tree 解禁后该按钮 opacity .4→1、title 属性移除；:636-637（wb-page-git）/ :665-666（wb-page-diff）为视图切换对新选择器先例 |
| 数据面先例 | `server-sync.js:44-57` fetchWorkbenchGit/Diff + `:98-101` SVR.wbGit/wbDiff(+Err) + `:106-113` 回调注册 + `:137-146` refresh 双函数 |
| gate 基线 | `gate.mjs:440-474` SCENARIOS **18 场景 s0~s17**（头注 :4 计数亲核）；`WB_ROUTES`（:362-382）现含 E1/E2 两 mock；s16（:470-471）= wbOpen+wbReady（git 页在线态）、s17（:472-473）= wbDiffOpen 三步（git 页就绪后再点 diff 页签，:419-423 时序竞争排除注记）；golden 双基线 18×2 件亲核（`tests/golden/ui/` ls） |
| smoke 基线 | `smoke-server.mjs` 头注 :32-40 B01-B05（E1·0036）+ B06-B12（E2·0054）序列；B12 源扫描块止于 :1748；基线 **145/0**（PRD §1 亲核） |
| Skeleton | `Skeleton.tsx:137` `<aside id="rightbar"><div id="props"></div></aside>`——#props 唯一住户，动态创建案下预期零改动 |
| 文件规模 | `wc -l` 亲核：app.js 3110 / app.css 684 / server-sync.js 218 / Skeleton.tsx 189 / server.ts 306 / smoke 1841 / gate.mjs 571 |

## 1. 范围与护栏

- **权威定界 = ADR-0016 §7 第三代码块**（BK-0042 行，与 BACKLOG 备注逐字一致；
  AC0 由 test-manager VERBATIM 比对）。本 SPEC 将其按 §0 基建现状具体化为可实施
  终稿；凡 ADR-0016 已定界处（端点路径/入参/出参/错误码/防越界机理/编排/golden
  双通道）本 SPEC 零漂移，凡 ADR-0016 §3.3 明文「清单终值实施 SPEC 定」的裁量项
  （折叠清单、条目上限、symlink 处置、承载文件落点、B 组编排、gate fixture 形态）
  由本 SPEC §3 定案——**均不构成新 ADR 需求**（needsAdr=false：全部消费既有 ADR
  授权，无新架构选型；ADR-0016 状态行的实施纪要增补见 §3.9）。
- **修宪权限口径（PRD §0）**：golden 增量 = 新场景 golden-created + **s16/s17
  双采受波及重录**；gate:update 消费仅限 s16/s17 两处（§6 全序列）；golden 权威在
  CI（windows-latest），推送后盯 `ui-constitution`（AC8）。
- **不做范围（PRD §3，逐条承接）**：文件内容预览（只入树不入内容）；树内任何写
  操作；`.git` 目录内部浏览（恒不入树）；文件监听刷新（fs.watch/轮询/SSE）；权限
  与所有权元数据；新 env（WORKBENCH_ROOT 类一律禁止，ADR-0016 §3.0 写死）；新 npm
  依赖；packages/shared 契约（workbench 为面板数据源非节点/SSE 面）；远程仓库出站。
- **中止条件（PRD §8，WORKFLOW §4 BUILD 铁律）**：实现中若确需订阅 run 事件 /
  新增 SSE 事件类型 / 新增 env 语义 / 出站网络目标 / fs 写面（写/删/rename/chmod），
  立即中止转 needs-approval——父项批复不自动覆盖（ADR-0016 §2.4/§3.0/§4 写死）。
- **段外零改动机器口径**：app.js 改动仅限 workbench 模块段（:2951-3108）内；app.css
  仅 :685 文件尾纯插入（:623-684 既有行零改动，含 :634 `.wb-tab:disabled` 声明
  **零改动**——全启用后自然无命中对象，声明本身保留）；gate.mjs 仅 WB_ROUTES/
  SCENARIOS 数组内追加 + 头注计数行；smoke 仅 B12 块后插入 B13-B18 + 头注 B 组段。
  AC7 四零机器证明（`git diff` 对 Skeleton.tsx / packages/shared/** /
  package*.json / apps/server/src/config.ts / apps/server/src/guard.ts 恒空）。

## 2. 受影响文件清单（产品提交白名单；`git ls-tree`/`git show --numstat` 核对基准）

| # | 文件 | 动作 | 要点 | 规模预算 |
| --- | --- | --- | --- | --- |
| 1 | `apps/server/src/workbench/tree.ts` | **新增** | E3 承载：validateTreeQuery + isWithinRoot（同构私有）+ collectTree（fs 遍历/排除/折叠/上限/symlink） | ≤ 200 行（上限 400） |
| 2 | `apps/server/src/workbench/routes.ts` | 扩展 | workbenchTreeHandler 导出（同步 400 + 异步 404/500 映射，E2 形态同构）+ 头注 E3 行 | +~25 行 |
| 3 | `apps/server/src/server.ts` | +2~3 行 | import workbenchTreeHandler + v1-only 注册（:260 邻域）+ 头注 :23 后补 tree 注记行 | +3 行 |
| 4 | `apps/web/src/server-sync.js` | 扩展 | fetchWorkbenchTree / SVR.wbTree+wbTreeErr / onWorkbenchTreeArrive / refreshWorkbenchTree（ADR-0006 边界：仅数据层零 DOM） | +~20 行 |
| 5 | `apps/web/src/legacy/app.js` | 纯插入 | workbench 段 tree 分支：`mk('tree','目录',false)` 解禁 + wbSwitch tree case + wbRenderTree + 行级下钻/收起交互 + wb-refresh 派发扩 tree | +~90 行 |
| 6 | `apps/web/src/app.css` | 纯插入 | wb-tree 家族选择器（:685 文件尾；:623-684 既有行零改动） | +~18 行 |
| 7 | `tools/pixel-gate/gate.mjs` | 场景增量 | WB_ROUTES 扩 E3 mock + SCENARIOS 追加 s18 + 头注 :4 计数 18→19 + :5-9 枚举/溯源行（#13 授权先例注释级口径，SPEC 复核合规——§3.7.3） | +~40 行 |
| 8 | `tests/smoke/smoke-server.mjs` | 扩断言 | B13-B18 六条（B12 块 :1748 后纯插入）+ 头注 :32-40 B 组段序列同步（BK-0057 纪律） | +~130 行 |
| 9 | `tests/golden/ui/s18-*.png + .invariants.json` | **新增** | 新场景双基线（golden-created 通道，零 gate:update） | 2 件 |
| 10 | `tests/golden/ui/s16-workbench-git-online.{png,invariants.json}` | **重录** | 受波及修宪轮重录（gate:update 恰一次，§6） | 2 件 |
| 11 | `tests/golden/ui/s17-workbench-diff-online.{png,invariants.json}` | **重录** | 受波及修宪轮重录（gate:update 恰一次，§6） | 2 件 |
| 12 | `docs/adr/0016-workbench-right-panel-git-diff-tree.md` | 增补 | BUILD 轮：§7 第三代码块尾追加实施纪要（§3.9）；CLOSE 轮：状态行链终收口（REQ-0042-05，ADR-0010/0012 先例）——**机制件提交面**（PRD §7） | +~10 行 |
| — | **零改动承诺** | — | Skeleton.tsx / packages/shared/** / package*.json / apps/server/src/config.ts / apps/server/src/guard.ts / .env.example / workbench/{root,git,diff}.ts（E3 零 git：tree.ts 不 import git.js；root.ts 复用零改；diff.ts 零改——isWithinRoot 同构私有实现见 §3.1.1 裁决） | 0 |

> #9-#11 与 #12 分属两个提交（WORKFLOW §4 分支提交：① 产品提交 = #1-#11 的
> productFiles 白名单【**跨修复轮累积并集，不可覆盖**】；② 机制件提交 = 迭代目录
> 产物 + BACKLOG 过程改动 + ADR-0016 增补）。

## 3. 实现设计

### 3.1 后端 E3 承载：新增 `apps/server/src/workbench/tree.ts`（#1）

#### 3.1.1 落点与职责裁定

- **独立 `tree.ts`**（PRD REQ-0042-01「独立 tree.ts 或并入既有文件 SPEC 定」的
  裁决）：沿 diff.ts「一端点一承载文件」先例（158 行），routes.ts 现 56 行不宜
  膨胀；tree.ts 承载 = validateTreeQuery（入参校验）+ isWithinRoot（防越界）+
  collectTree（遍历与组装）+ 错误类。
- **isWithinRoot 同构私有实现，不从 diff.ts 导出**：该函数 4 行、diff.ts:34-37
  为模块私有；将其导出会迫使 diff.ts 为 E3 改动（扰动 B12 对 diff.ts 的既有源
  扫描断言面），违背「一次迭代只做一件事」。tree.ts 内同构实现 + 注释互指
  （`diff.ts:34 同构`）。**已知代价如实记档**：同构函数两处并存（E2/E3 各一），
  若第三端点出现再议共享——当前两处的重复成本低于跨界改动的扰动面。
- **E3 零 git**（ADR-0016 §3.3 承载差异面）：tree.ts **不 import git.js、零
  spawn、零子进程**（B18 源扫描断言 `'spawn'` 零命中）；fs 调用面仅
  `readdir`/`lstat`（`node:fs/promises`，只读不变式——B18 禁词扫描背书）。
- **锚定**：`import { PROJECT_ROOT } from './root.js'` 直接复用（root.ts 零改动）。

#### 3.1.2 入参校验（validateTreeQuery；ADR-0016 §3.3 入参 + §4 防越界）

```ts
export interface TreeQuery { pathInput?: string; depth: number }
export class WorkbenchTreeInputError extends Error {}      // 400 面（message 即响应字面量）
export class WorkbenchTreeError extends Error {            // 404/500 面
  constructor(public readonly kind: 'not-found' | 'failed', message: string) { super(message); }
}
```

- `path`：`undefined` 或 `''` → 根（pathInput 缺省）；在而非字符串（express 同名
  多值参数为数组）或 `!isWithinRoot(p)` → `throw WorkbenchTreeInputError('path 越界')`
  （B10/B16 同款字面量；resolve 归一后前缀比对，`../` 逃逸与绝对路径注入
  （win32 盘符 `D:/`、POSIX 根 `/etc`）同样被拒——越界即拒，不做修复式放行）。
- `depth`：`Number(query.depth ?? 2)`；`!Number.isInteger(n) || n < 1 || n > 6` →
  `throw WorkbenchTreeInputError('depth 必须是 1-6 的整数')`（E1 limit 字面量
  风格 `routes.ts:17` 同款；`'abc'`→NaN、`'2.5'`→非整数、`0`/`7`→越界均 400）。
- 校验通过后传给 fs 的仍是**归一前原始语义**：`path.resolve(PROJECT_ROOT,
  pathInput ?? '.')`（resolve 自带归一，无需另行清洗）。

#### 3.1.3 遍历算法定案（本 SPEC 关键裁决；全部落在 ADR-0016 §3.3「实施 SPEC 定」授权内）

**排除与折叠（清单终值）**：

- **EXCLUDE = `'.git'`**：恒不入树——任何层级、任何形态（目录/文件）均不出现在
  children 中（ADR-0016 §3.3「.git 恒不入树」字面）。
- **FOLD = `['node_modules', 'dist', 'data', '.zcode']`**（**按目录名匹配、任何
  层级生效**）：折叠为占位行 = `{ name, type:'dir', children: [] }`——**children
  键在场且恒空数组**，内容在任何情况下不入响应（含显式 `path` 下钻：`path=
  node_modules` 或其内部路径 → 返回该子树 root 占位，children 恒 `[]`）。
  - 终值依据：ADR-0016 §3.3 列名 `node_modules` / `dist` / `data` / 构建产物目录
    四类 + PRD 契约级义务「`.zcode` 工作树目录须一并评估——含完整依赖副本，
    不折叠即爆树」（`.zcode` 属「构建产物/工作副本目录」类的本仓实例；`dist`
    名字规则覆盖 apps/server/dist 与 apps/web/dist 两处构建产物）。按名字匹配
    同时防御嵌套形态（packages/*/node_modules 类）。
- **占位行与真空目录统一形态**：`children: []`（已取、空）——与「未取」
  （children 键缺席 = depth 耗尽，可下钻）严格二态区分，前端据此零歧义分级
  （§3.5）；折叠目录与真空目录同形是**有意的语义统一**（「无内容可展开」），
  前端渲染为置灰占位行（AC3「折叠占位分级形态」）。

**遍历（collectTree）**：

```ts
export async function collectTree(q: TreeQuery, rootAbs: string = PROJECT_ROOT): Promise<TreeResult>
```

1. `resolved = path.resolve(rootAbs, q.pathInput ?? '.')`；`rel =
   path.relative(rootAbs, resolved)`（win32 分隔符 → 出参转 POSIX `'/'`，`''` 表根）。
2. `lstat(resolved)`：ENOENT 或非目录 → `throw WorkbenchTreeError('not-found',
   'path 不存在或不是目录')`（404 面单字面量，两态共用——「子路径不存在」与
   「存在但为文件」对下钻语义等价）；其他 lstat 异常 → `'failed'`（500 面）。
3. **折叠根短路**：`rel !== ''` 且 `rel` 首段 ∈ FOLD → 直接返回
   `{ root: { name: basename(resolved), path: posix(rel), children: [] }, truncated: false }`
   （折叠目录子树恒占位，§3.1.3 折叠规则）。
4. 递归 `walk(dirAbs, level)`（level 1..depth，**depth 界值 1-6 即递归深度上限**
   ——防深递归，PRD §4）：
   - `readdir(dirAbs)` → 逐条 `lstat`（**不 follow 符号链接**：lstat 判型，
     symlink 一律呈 `{ name, type:'file', size: lstat.size }`——链接文件本体；
     **契约级义务满足：零 follow = 零环引用/零无限递归**；已知限制如实标注：
     symlink 目标不揭示、dir 型 symlink 呈 file 形态降级）；
   - 名 === `'.git'` → skip（EXCLUDE）；单条目 lstat **ENOENT（readdir 后被并发
     删除的竞态）→ 跳过该条目**（不置 truncated、不 500——文件系统竞态是常态，
     不击穿整树；已知限制如实标注）；其他单条目异常 → `'failed'` 500 兜底；
   - 目录：名 ∈ FOLD → 占位行 `{ name, type:'dir', children: [] }`（不递归）；
     否则 `level < depth` → `{ name, type:'dir', children: await walk(...) }`；
     `level === depth` → `{ name, type:'dir' }`（**children 键缺席 = 未取/可下钻
     标记**）；
   - 文件 → `{ name, type:'file', size: lstat.size }`（字节；**file 恒带 size、
     dir 恒无 size 键**——最简可测二值约定）；
   - 排序：**同层 dir 先序、同类名按码点序**（`a.name < b.name`，不依赖 locale
     ——跨环境确定性；PRD §6「目录先序」IDE 惯例）。
5. **条目上限 ENTRIES_CAP = 500**（E2 FILES_CAP=500 同风格；PRD REQ-0042-01
   「条目数上限截断 + truncated 标记（终值 SPEC 定）」）：**全局计数器**（响应内
   全部 children 数组条目总数，含占位行），达到上限即停止列入（该层剩余兄弟
   丢弃、更深层级不再递归）+ `truncated = true`；`truncated` 语义严格 =
   「遍历因上限提前终止」（false ⟺ 完整遍历）。防大仓爆响应 + 不静默吞
   （US-2 双义务）。

#### 3.1.4 出参契约与错误码（ADR-0016 §3.3 逐字对齐 + 实施定形）

```jsonc
// GET /api/v1/workbench/tree            （无参：根 + depth 默认 2）
// GET /api/v1/workbench/tree?path=apps/server&depth=4
{
  "root": {
    "name": "server",                    // path.basename(解析根)；不锁字面量（工作树/主干/CI 目录名异）
    "path": "apps/server",               // 相对 PROJECT_ROOT 的 POSIX 前缀；根请求为 ""
    "children": [
      { "name": "src", "type": "dir" },              // children 缺席 = depth 耗尽（可下钻）
      { "name": "dist", "type": "dir", "children": [] },  // 折叠占位（恒空）
      { "name": "package.json", "type": "file", "size": 1234 }
    ]
  },
  "truncated": false
}
```

| 错误 | 条件 | 响应字面量 |
| --- | --- | --- |
| 400 | path 非字符串/越界（`../`、win32 盘符、POSIX 根注入） | `{ "error": "path 越界" }` |
| 400 | depth 非整数/越界（0、7、abc、2.5） | `{ "error": "depth 必须是 1-6 的整数" }` |
| 404 | 子路径不存在 / 存在但为文件 | `{ "error": "path 不存在或不是目录" }` |
| 500 | 遍历异常（lstat/readdir 未预期异常） | `{ "error": "tree traversal failed" }` |

> 500 字面量为 E3 自有（E1/E2 为 `'git command failed'`——E3 零 git 故不复用）；
> 映射形态沿 E1/E2 同款（细节进 logger 不进响应）。

### 3.2 routes.ts 扩 workbenchTreeHandler（#2；E2 handler 形态同构）

- 头注补 E3 行（BK-0056 活清单纪律，沿 :2-3 E1/E2 注记先例）。
- handler 结构 = `workbenchDiffHandler`（routes.ts:33-56）同构三段：
  ① 同步段 `validateTreeQuery(req.query)` → `WorkbenchTreeInputError` → 400
  `{error: e.message}`；② 异步段 `collectTree(q).then(json)`；③ 错误映射
  `WorkbenchTreeError && kind==='not-found'` → 404 字面量；其余 `logger.warn` +
  500 `'tree traversal failed'`。

### 3.3 server.ts 注册（#3）

- `import { workbenchTreeHandler } from './workbench/routes.js'`（:57 邻域并入
  既有 import 或新起一行）。
- `app.get('/api/v1/workbench/tree', workbenchTreeHandler);`（**:260 diff 行后、
  :261 PTY 段前**插入，v1-only 沿 ADR-0005 先例，无 /api/* 别名）。
- 头注 :23（diff 行）后补 tree 注记行（BK-0056 纪律）：`· GET
  /api/v1/workbench/tree → 工作台目录树页数据源（path 子前缀 + depth 界值；
  Node fs 只读遍历（readdir/lstat，零 git 子进程），.git 排除 + 生成目录折叠占位
  + 条目上限 truncated；400 path 越界或 depth 非法 / 404 子路径不存在 / 500 遍历
  异常，零出站零 env，ADR-0016 §3.3，迭代 0056 / BK-0042）`。

### 3.4 server-sync.js 数据面（#4；ADR-0006 边界：仅数据层零 DOM，E2 五件同构）

```js
/* 工作台（BK-0042 / 迭代 0056）：目录树（E3，ADR-0016 §3.3）——仅数据层零 DOM；
   path/depth 经 URLSearchParams 编码；空串省略 = 端点缺省语义（根 + depth 2）；
   400/404/500 走非 2xx 抛错 → 面板错误态 */
export const fetchWorkbenchTree = (q = {}) => {
  const p = new URLSearchParams();
  if(q.path) p.set('path', q.path);
  if(q.depth) p.set('depth', String(q.depth));
  const s = p.toString();
  return apiJson('/workbench/tree' + (s ? '?' + s : ''));
};
```

- SVR 增 `wbTree: null`（E3 出参 | null）/ `wbTreeErr: false`（:100-101 邻域）；
  `onWorkbenchTreeArrive(fn)` 回调注册（:113 邻域）；`refreshWorkbenchTree(q)`
  （:146 邻域，fetch→SVR→回调，E2 :142-146 同构）。
- **行级下钻 fetch 直接调 `fetchWorkbenchTree`**（§3.5）——不占 SVR.wbTree 缓存
  （SVR 缓存仅承载「当前根树」渲染/刷新语义，与 ADR-0006「fetch 封装」边界一致）。

### 3.5 app.js workbench 段 tree 分支（#5；:2951-3108 段内纯插入，段外零改动）

- **解禁**：`app.js:2972` `mk('tree','目录',true)` → `mk('tree','目录',false)`
  （disabled 与 `title="后续批次提供"` 一并消失——s16/s17 像素受波及唯一源，
  §6）；四页签全部启用，容器基建收官。
- **wbSwitch 扩 tree case**（:3001-3016）：
  `bar.classList.toggle('wb-page-tree', page === 'tree')`（:3004-3005 邻域）；
  title 三元（:3007）扩 `page === 'tree' ? '项目目录'`；新增分支
  `else if(page === 'tree'){ await refreshWorkbenchTree(); wbRenderTree(); }`
  （**on-open fetch：打开/切至 tree 页即取**，git/diff 同款，ADR-0016 §2.4）。
- **wb-refresh 按页派发扩 tree**（:2986-2991）：
  `if(WB.page === 'tree'){ await refreshWorkbenchTree(); wbRenderTree(); }`
  （重取**当前根树**并整树重渲——展开态重置为响应内嵌层级，诚实刷新语义）。
- **wbRenderTree()**（wbRenderDiff 后新增）：
  - 错误态：`SVR.wbTreeErr || !SVR.wbTree` → `.wb-empty`「目录树拉取失败 · 点击
    刷新重试」（:3067-3069 同款）；
  - `truncated` 顶提示行：`d.truncated` → `.wb-empty`「目录条目已截断 · 可下钻
    子目录收窄范围」（:3080 同款形态）；
  - 树行渲染 `rows(children, level, prefix)`：每行 `div.wb-tree-row` + 类型类 +
    `data-tp`（该行相对路径 = `prefix + name`，POSIX 拼接）+ `data-lv` +
    **内联 `style="padding-left:${12 + level * 14}px"`**（缩进单位 14px；内联动态
    值不触 cssVars 不变量——`:root` 自定义属性表零新增，app.css :625 既有承诺）；
  - **三形态分级**（AC3「目录/文件/折叠占位分级形态」，判据 = §3.1.3 契约二态）：
    ① `type:'dir'` 且 children 键**缺席** → `.wb-tree-dir`（可下钻：
    `I('chev-right')` 前缀 + `cursor:pointer`，点击行级 fetch 下钻）；
    ② `type:'dir'` 且 `children` 非空 → 递归渲染子行（level+1，行前缀
    `I('chev-down')`）——首层响应内嵌层级的既有展开态；
    ③ `type:'dir'` 且 `children === []` → `.wb-tree-fold`（置灰占位行，无 chev、
    无点击——**折叠占位不展开**，AC6；与真空目录统一「无内容」语义）；
    ④ `type:'file'` → `.wb-tree-file`（无 chev；size 不展示——右栏 264px 宽度
    约束下的克制形态，PRD §3 out of scope「内容预览」同理不扩）。
  - **行级下钻交互（零全量预取，US-1/ADR-0016 §2.2「逐次带 path 前缀请求」）**：
    点击 ① 形态行 → `fetchWorkbenchTree({ path: row.dataset.tp })`（行级，不经
    SVR 缓存）→ 成功：在该行后插入子行（`rows(sub.root.children, lv+1,
    tp+'/')`）+ 行内 chev 换 `chev-down` + `.open`；失败：该行后插一行
    `.wb-empty`「子目录拉取失败」（不静默吞，沿 §3.1.3 竞态跳过同款诚实原则）。
    点击 `.open` 行（chev-down）→ 移除其后随更高 `data-lv` 相邻行（收起）+
    chev 复位（收起后再展开 = 重新 fetch 最新状态，零子树缓存）。
  - **图标只用既有 ICON_PATHS 键**（`chev-right`/`chev-down`，app.js:95-96）——
    ICON_PATHS 表（:62-104）为原单文件逐字提取冻结面，**零新增键**。
- **零新增运行时态对象**：tree 页无输入控件（diff 页 WBD 先例不适用）——chev
  展开态由 DOM 自承载（`.open` 类 + 子行在场），当前根树由 SVR.wbTree 承载。

### 3.6 app.css（#6；:685 文件尾纯插入，~18 行；:623-684 既有行零改动）

```css
/* ===== 右栏工作台 · 目录树页（BK-0042 / 迭代 0056 修宪轮 · ADR-0016 §2.2）=====
   纯插入（:623-684 既有行零改动，含 :634 .wb-tab:disabled 声明保留——全启用后
   自然无命中对象）；值全取既有变量与既有字面量，零新增自定义属性。 */
#rightbar.wb-page-tree #props{display:none}          /* 互斥视图切换（:636/:665 同型新选择器） */
#rightbar.wb-page-tree #workbench{display:flex}
.wb-tree-row{display:flex;align-items:center;gap:5px;height:20px;min-width:0}
.wb-tree-row .ic{width:12px;height:12px;flex:none;color:var(--text3)}
.wb-tree-name{font-family:var(--mono);font-size:10.5px;min-width:0;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}        /* 排版沿 .wb-path（:657-658） */
.wb-tree-dir{cursor:pointer}
.wb-tree-dir .wb-tree-name{color:var(--text2)}
.wb-tree-dir:hover .wb-tree-name{color:var(--text)}  /* 交互色沿 .wb-tab（:632-633） */
.wb-tree-file .wb-tree-name{color:var(--text3)}
.wb-tree-fold .wb-tree-name{color:var(--text3)}      /* 折叠占位/空目录统一置灰 */
```

（像素初值即 golden 落盘定稿值——修宪授权面内，ADR-0016 §2.2「缩进树」形态
授权；BUILD 不得在落盘后二次微调。）

### 3.7 gate.mjs 场景增量（#7）+ golden 落盘（#9/#10/#11）

#### 3.7.1 WB_ROUTES 扩 E3 mock（:362-382 数组内纯追加第三项，既有两项零改动）

```js
{ pattern: '**/api/v1/workbench/tree**',
  handler: route => route.fulfill({ json: {
    root: { name: 'demo-repo', path: '', children: [
      { name: 'apps', type: 'dir', children: [
          { name: 'server', type: 'dir' },                /* 孙层可下钻形态（children 缺席） */
          { name: 'web', type: 'dir', children: [] } ] }, /* 孙层空目录 → 占位形态 */
      { name: 'docs', type: 'dir' },                      /* 子层可下钻形态（depth 耗尽） */
      { name: 'node_modules', type: 'dir', children: [] },/* 折叠占位形态 */
      { name: 'package.json', type: 'file', size: 4096 },
      { name: '示例文档.md', type: 'file', size: 2048 },
    ] },
    truncated: false } }) },
```

- **fixture 即契约消费面**：mock 出参逐字符合 §3.1.4 契约；固定字面量（ASCII +
  固定中文文件名样例，ADR-0009 §3 字形安全口径）；树页零时间渲染，无需整点
  毫秒（s16/s17 的 ts fixture 是 fmtTs 消费面，E3 无此面）。
- **三 dir 形态刻意各一**（可下钻/占位/已展开）——AC3 分级形态的全采集面。
- **s16/s17 零请求零渲染因果**：两场景不点 tree 页签 → E3 路由零命中（0054
  :417 注记同型）；mock 追加对 s16/s17 像素**零影响**——s16/s17 受波及唯一源
  是页签条 tree 按钮 disabled 态变化（§6）。

#### 3.7.2 新场景 s18（预期号；落盘时序仲裁不锁死，ADR-0015 §5 / WORKFLOW §4）

```js
/* ---------- s18 工作台目录树在线态场景基建（ADR-0016 §6/§2.2 · 迭代 0056 / BK-0042 修宪轮） ----------
   三步真实交互沿 s17（wbDiffOpen :419-423 同型）：空画布 contextmenu → 点
   「工作台」（wbOpen('git')，E1 mock 供数，先等 wbReady——git 数据落 DOM 后再点
   tree 页签，排除 git fetch 晚于 tree fetch 完成时 wbRenderGit 后写覆盖
   .wb-scroll 的时序竞争，保末态确定性）→ 点 tree 页签（真实 click 委托 →
   wbSwitch('tree') → E3 fetch → mock 供数）。 */
const wbTreeOpen = async page => {
  await wbOpen(page);
  await wbReady(page);
  await page.evaluate(() => document.querySelector('#wb-tabs .wb-tab[data-wb="tree"]').click());
};
/* 就绪探针（状态量非时延量，wbReady 先例）：树行 7 行全落 DOM（apps/docs/
   node_modules/package.json/示例文档.md + server/web 孙层行）；超时红即 FAIL */
const wbTreeReady = page => page.waitForFunction(
  () => document.querySelectorAll('#workbench .wb-tree-row').length === 7,
  undefined, { timeout: 10000, polling: 100 });
/* per-scenario 不变量（公共六键后 spread）：页签集（tree 激活无禁用标记）+
   #props 视图态 + 三形态分计 + 折叠行名单 + 可下钻行名单 */
const wbTreeInv = page => page.evaluate(() => ({
  wbTabs: [...document.querySelectorAll('#wb-tabs .wb-tab')]
    .map(b => b.dataset.wb + (b.classList.contains('on') ? '*' : '') + (b.disabled ? '!' : '')),
  propsShown: getComputedStyle(document.getElementById('props')).display !== 'none',
  treeCounts: document.querySelectorAll('#workbench .wb-tree-dir').length + 'd/'
    + document.querySelectorAll('#workbench .wb-tree-fold').length + 'f/'
    + document.querySelectorAll('#workbench .wb-tree-file').length + 'w',
  foldNames: [...document.querySelectorAll('#workbench .wb-tree-fold .wb-tree-name')].map(n => n.textContent),
  drillNames: [...document.querySelectorAll('#workbench .wb-tree-dir:not(.open) .wb-tree-name')].map(n => n.textContent),
}));
```

- SCENARIOS 追加：`{ id: 's18-workbench-tree-online', routes: WB_ROUTES,
  timezoneId: 'UTC', steps: [wbTreeOpen], ready: wbTreeReady, inv: wbTreeInv }`
  （timezoneId UTC 沿 s16/s17 家族口径——树页零时间渲染，传值无害且一致）。
- 预期不变量值（VERIFY 比对基准）：`wbTabs = ['props','git','diff','tree*']`、
  `propsShown = false`、`treeCounts = '3d/2f/2w'`（apps 展开 dir/docs 可下钻
  dir/server 可下钻 dir→3d；web 占位/node_modules 占位→2f；package.json/
  示例文档.md→2w）、`foldNames = ['web','node_modules']`、
  `drillNames = ['apps','docs','server']`（apps 为已展开 dir——按 §3.5 ② 形态
  其行类 `.wb-tree-dir` 且带子行；`:not(.open)` 取值以 BUILD 实现的类形态为准，
  VERIFY 按实跑对齐）。
- **golden-created 通道**：基线 png 不存在即落盘并记 golden-created（gate.mjs:538-542
  既有机制），**零 gate:update**。

#### 3.7.3 头注计数同步（:4「18 个」→「19 个」+ :5 在线态枚举 + :8-9 溯源行）

- `:4` 场景计数 18→19；`:5` 在线态枚举加 s18；`:8-9` 邻域追加「s18 溯源迭代
  0056（WB_ROUTES E3 mock + UTC，目录树页，BK-0042）」。
- **SPEC 复核结论（PRD §7「#13 授权先例口径，SPEC 复核」）**：注释级计数同步
  沿 0054 轮 #13 授权先例（BK-0058 同款）；gate.mjs 本体改动（WB_ROUTES/SCENARIOS
  追加）属修宪轮四件套第④面（ADR-0016 §5 明文「gate 场景增量」），非 §6.3
  护栏的「顺手修改」——合规。

### 3.8 smoke B 组扩展 B13-B18（#8；B12 块 :1748 后纯插入六条，B01-B12 零触碰）

| # | 断言面（PRD REQ-0042-03 / AC1/AC2 承接） |
| --- | --- |
| B13 | **E3 默认契约**（主实例）：GET /api/v1/workbench/tree → 200 键集恰 `{root,truncated}`；`root.name` 非空（**不锁字面量**——工作树/主干/CI 目录名异）、`root.path === ''`、children 数组；递归校验每项：name 非空、`type ∈ {dir,file}`、dir 无 size 键、file 带 size 非负整数；**`.git` 递归零出现**；**FOLD 四名占位**（递归找到 node_modules/dist/data/.zcode 目录 → `children` 恒 `[]`）；**同层目录先序**（root.children 内全部 dir 下标 < 全部 file 下标）；truncated 为 boolean；**全树条目递归计数 ≤ 500**（「不爆响应」性质断言，不依赖仓库规模触发截断） |
| B14 | **path 前缀下钻**：`?path=apps/server` → 200 `root.name==='server'`、`root.path==='apps/server'`、children 含 `src`（dir）；`&depth=1` → children 内任一 dir **无 children 键**（depth 耗尽形态）；`?path=apps/server&depth=4` → 200 形状合法且树内出现 ≥3 层嵌套（如 workbench 目录在 src 子层且带 children）——深度语义机器判据 |
| B15 | **depth 界值反例**：`?depth=0 / 7 / abc / 2.5` → 各 400 `{error:"depth 必须是 1-6 的整数"}` |
| B16 | **防越界矩阵**（B10 同款双形态）：`?path=../ / ../../ / D:%2F（win32 盘符）/ %2Fetc（POSIX 根）` → 各 400 `{error:"path 越界"}` |
| B17 | **404 与折叠语义**：`?path=no-such-dir-xyz` → 404 `{error:"path 不存在或不是目录"}`；`?path=package.json`（存在但为文件）→ 404 同字面量；**`?path=node_modules`（折叠目录显式下钻）→ 200 `children===[]` 恒空**（折叠语义机器证明，§3.1.3） |
| B18 | **纪律源扫描**（B05/B12 同型，E3 差异面）：tree.ts + routes.ts（扩后复扫）+ root.ts（复扫）：`/shell/i` 零命中（含注释——**BUILD 注意：tree.ts 注释措辞禁 shell 字样**）；tree.ts `'spawn'` 零命中（E3 零 git 子进程承载差异面）；`'readdir'` 与 `'lstat'` 在场（fs 承载本体）；**fs 写面禁词零命中**（`writeFile/appendFile/unlink/rename/mkdir/chmod/chown/truncate/rm` 词表——E1/E2 的可写命令 regex 是 git argv 面，E3 换 fs API 面词表）；`'.git'` 排除与 FOLD 四名字面量在场（`'node_modules'`/`'dist'`/`'data'`/`'.zcode'`） |

- **500 遍历异常断言承载**（PRD AC2「win32 不可移植伪造」）：不做 HTTP 级测试
  （无法可移植伪造 lstat/readdir 异常），由 B18 源扫描同构形态背书
  （WorkbenchTreeError('failed') → 500 映射字面量在场）——B04/B11 已知限制
  同款如实标注。
- **编排头注 :32-40 B 组段序列同步**（BK-0057 纪律）：追加一行「B13-B18（迭代
  0056 / BK-0042）扩 E3 tree 端点（ADR-0016 §3.3）：默认契约（含 .git 排除/
  FOLD 占位/先序/条目上限性质断言）/ path 前缀与 depth 语义 / depth 界值 400 /
  防越界矩阵双形态 / 404 与折叠恒空 / tree.ts 纪律源扫描（零 spawn + fs 只读
  白名单）」。
- **新总数口径**：145 + 6 = **151/0 预期**（VERIFY 实测为准；MERGE 收口写定值
  ——PRD AC5「新总数口径由 SPEC 定并写入 MERGE 收口」）。

> **定形偏差记档（0054「探针实例」同款先例形态）**：PRD REQ-0042-03 预想「404
> 子路径不存在（探针实例，B04 形态）」——SPEC 裁定 **E3 不设专用探针实例**：
> ①E1/E2 探针的存在意义是「非 git 目录 + spawn cwd=真仓库 → 误锚 process.cwd()
> 得 200 恰好击穿」的锚定双向证明；E3 零 git 探测、404 面是「子路径不存在」，
> 主实例直接可测（B17）；②E3 锚定证明由 B13 合成（root.path==='' + children 含
> 'apps'/'docs' 仓库根标志目录——锚错任何一级即缺失）；③临时目录探针的
> PROJECT_ROOT（模块常量）与 cwd 同为临时目录，锚定来源不可区分，证明力为零。
> 差异如实记档，供 VERIFY 复核。

### 3.9 ADR-0016 增补（#12；机制件提交面）

- **BUILD 轮**：§7 第三代码块（BK-0042 行）尾追加实施纪要（0036/0054 同款
  「> 实施纪要（BK-0042 · 迭代 0056 BUILD 轮，2026-10-28）」形态）：落地面清单
  （tree.ts/routes.ts/server.ts/server-sync 四件 + app.js/app.css 前端两件 +
  gate s18 + s16/s17 重录 + smoke B13-B18）+ 定形偏差记档（若有）+ 四零机器
  证明结论。
- **CLOSE 轮**（REQ-0042-05）：状态行（:3-7）按 ADR-0010/0012 先例链终收口
  ——「BK-0042 目录树修宪轮——链终轮——待实施」改为已消费纪要 + 链终回执
  issue#4 关单口径；§5 尾句「BK-0042 链终轮 CLOSE 时回执 issue#4 关单」兑现注记。

## 4. 模块边界

| 模块 | 本轮动作 | 边界约束 |
| --- | --- | --- |
| `apps/server/src/workbench/tree.ts`（新） | E3 承载 | 仅 fs 只读（readdir/lstat）+ PROJECT_ROOT 复用；**零 git**（不 import git.js/runGit）；错误类自有（不碰 E1/E2 类） |
| workbench 既有四文件 | root.ts/git.ts/diff.ts **零改动**；routes.ts 扩 handler；root.ts 锚定复用零新增 | E1/E2 语义零变化（B01-B12 既有断言零回退）；diff.ts 不为 E3 导出 isWithinRoot（§3.1.1 裁决） |
| `server.ts` | +import +1 注册行 + 头注 1 行 | 注册序 :260 邻域（workbench 族内聚）；其余路由零触碰 |
| `server-sync.js` | workbench 数据面段内扩展五件 | ADR-0006 边界：fetch 封装/缓存/回调/刷新，**不操作面板 DOM**；渲染时序归 app.js |
| `app.js` | workbench 段（:2951-3108）内纯插入 tree 分支 | 段外零改动；#props 零触碰（B 案核心承诺，renderProps/事件委托/滚动恢复/焦点归属全部不动）；图标只用既有 ICON_PATHS 键（表 :62-104 冻结面零新增）；类名一律 wb-tree- 前缀（不触 .wtab/.wdg/.port/.node 计数面与 `--` 自定义属性面，gate counts/cssVars 不变量） |
| `app.css` | :685 文件尾纯插入 wb-tree 家族 | :623-684 既有行零改动（含 :634 `.wb-tab:disabled` 声明保留）；零新增自定义属性（cssVars 不变量）；值全取既有 var 与字面量 |
| `Skeleton.tsx` | **零改动** | 动态创建案（ADR-0016 §2.5）：#wb-tabs/#workbench 懒创建（wbEnsure），:137 #props 唯一住户不受扰，s0 不受波及 |
| `packages/shared` | **零触碰** | workbench 为面板数据源非节点/SSE 面（sessions 先例）；契约测试零涉 |
| `gate.mjs` | WB_ROUTES/SCENARIOS 数组内追加 + 头注 | 既有 18 场景定义零改动；E3 mock 对 s16/s17 零请求因果（§3.7.1） |
| `smoke-server.mjs` | B12 块后纯插入 B13-B18 + 头注 | 既有组（P→…→B12 及 Z/C 后续）零触碰；fail-fast 编序不变 |
| `tests/golden/ui/` | s18 新增 + s16/s17 重录 | 其余 16 场景双基线**逐字节零漂移**（§6 步骤 e 机器核验） |
| config.ts / guard.ts / package*.json / .env.example | **零改动**（AC7 四零） | 零新 env 语义 / 零出站 / 零新依赖（lock 零变化） |

## 5. 验收口径（PRD AC0-AC8 可执行化；BUILD/VERIFY 全部在本工作树内执行）

**命令序**：`npm run build` → `npm run gate`（§6 修宪序列）→ `npm test` →
`npm run smoke:server` → 手动 E2E（七点位）。基线：gate 18 场景 s0~s17 全绿 /
npm test 30/30 / smoke 145/0（PRD §5）。

| AC | 可执行判据 |
| --- | --- |
| AC0 | test-manager 逐字比对 ADR-0016 §7 第三代码块 ↔ BACKLOG BK-0042 行备注（VERBATIM）；授权链三元组（issue#4 时间戳 + ADR-0016 + ready）在 PRD/SPEC 一致引用 |
| AC1 | B13/B14/B15（契约/下钻/depth 界值）；AC1 的「node_modules/dist/data 呈占位行形态」以 B13 FOLD 四名占位断言承载 |
| AC2 | B16（防越界双形态 400）/ B17（404 + 折叠恒空）/ B18（500 源扫描背书 + 零 spawn + fs 只读白名单） |
| AC3 | s18 场景（三形态分级采集）+ 手动 E2E 点位 1-7；#props 零触碰由 s0~s15 零波及（§6 步骤 a 实测）+ 点位 7 人工复核承载 |
| AC4 | §6 golden 序列全绿 + 步骤 e 变更集恰 6 文件；s3 抖动形态按 rerun/CI 权威处置（**不得以此消费 gate:update**，0037~0052 纪律） |
| AC5 | build exit 0；npm test 30/30；smoke = 145 基线零回退 + B13-B18 全绿 = **151/0**（预期值，VERIFY 实测为准并写入 MERGE 收口） |
| AC6 | 手动 E2E 七点位（下表） |
| AC7 | `git diff --stat` 对 Skeleton.tsx / packages/shared/ / package.json / package-lock.json / apps/server/src/config.ts / apps/server/src/guard.ts 恒空；lock 零变化 |
| AC8 | 推送后 CI `ui-constitution` 19 场景全绿（含 s16/s17 重录后基线）；红则 rerun 一次，仍红报 issue #12 / 用户（WORKFLOW §6 护栏）——未到时点不判过不判挂（0012 先例） |

**手动 E2E 七点位（AC6 细化；数据面 = 真实仓库数据（npm start 即真后端真仓库），
如实标注）**：

1. `npm start` → http://localhost:3000 → 空画布右键 → 「工作台 · 仓库信息」→
   工作台打开（git 页，BK-0040 入口零变化）。
2. 点「目录」页签 → 页签激活（on 态）、顶栏标题「项目目录」、根级缩进树呈现
   （apps/docs/tests/tools 等目录行 + package.json 等文件行）；node_modules/
   dist/data/.zcode 呈**置灰占位行**（无箭头、点击无展开）。
3. 点 apps 目录行（▸）→ 展开子行（server/web，缩进一级）、箭头转 ▾。
4. 再点 apps（▾）→ 收起；点 node_modules 占位行 → **不展开**（占位不可下钻）。
5. 逐级下钻 apps/web/src（DevTools Network 核每次点击恰一条
   `GET /api/v1/workbench/tree?path=apps/web/src`——零全量预取）。
6. 点「刷新」→ 根树重取重渲（truncated 顶行在超限树时出现——真实仓库默认
   depth=2 预期不触发，以 B13 性质断言为准）。
7. 切回「属性」页签 → #props 恢复显示且选中节点属性正常；切「仓库」/「变更」→
   git/diff 页行为零回退；新开页面（工作台未打开）→ 右栏默认态无 #wb-tabs
   （懒创建，s0 几何前提）。

## 6. golden 重录方案与宪法第 3 条依据（修宪轮必含节）

**依据链**：宪法（CONSTITUTION.md）第 3 条——确需变更 UI 时：① 提交 ADR
（动机/影响面/像素对比证据）；② 取得**用户本人批准**；③ 同一 PR 中重录 golden
并附前后对比。本迭代三要件齐备：**ADR-0016**（§2.2 tree 页签信息架构 / §3.3
E3 契约 / §6 golden 双通道预案——「新增场景走 golden-created 通道；受波及既有
场景经修宪轮 gate:update 重录」，迭代 0013 先例）；**用户批准 = issue#4 批复
承继**（2026-10-23T15:49:17Z，BACKLOG BK-9004 行在案，BK-9004 链拆分后由
BK-0042 承继）；**同迭代重录** = 本工作树 feat/0056-iter 分支内完成（v3 工作树
模型下「同一 PR」的等价物 = 同一特性分支双提交）。

**重录范围（恰两处既有场景 + 一处新增）**：

| 场景 | 通道 | 波及源 |
| --- | --- | --- |
| s16-workbench-git-online | **gate:update 重录恰一次** | 页签条 tree 按钮 disabled→enabled：像素（app.css:634 opacity .4→1、title 属性移除）+ DOM 不变量（wbInv.wbTabs `tree!`→`tree`）双变化；0054 轮 s16 同因（diff 页签解禁）重录恰一次先例 |
| s17-workbench-diff-online | **gate:update 重录恰一次** | 同上（两场景工作台打开态均渲染四枚页签）；s17 系 0054 新落盘场景，本轮是其首次受后续批次波及 |
| s18-workbench-tree-online（预期号，落盘时序裁决） | **golden-created**（基线不存在即落盘，零 gate:update） | 新场景：tree 页在线态（§3.7.2） |
| s0~s15 | **零波及（实测确认，不重录）** | 懒创建：工作台未打开前 `#wb-tabs`/`#workbench` 均 display:none（app.css:627/:635）；#props 零触碰；s0 骨架零涉（Skeleton 零改动） |

**操作序列（gate:update 全量重录的精确收敛——gate.mjs:538 UPDATE 模式重写全部
场景，须以 git 恢复收敛到恰两处）**：

1. **首跑 gate**：`npm run gate` → 预期 FAIL 恰 `{s16, s17}`（diffPx>0 且
   wbTabs 不变量变化）、s18 golden-created、其余 16 场景 pass。若 FAIL 集超出
   （如 s3-library 出现 diffPx≈23 形态——issue #12 在案本机采样抖动，0037~0052
   多轮先例）→ rerun 处置，**不得以此消费 gate:update**；非抖动的意外波及 →
   中止排查（PRD §1「任一意外红即中止排查」）。
2. **修宪重录**：`npm run gate:update`（宪法第 3 条通道，issue#4 批复在案；
   WORKFLOW §4「修宪轮脚本在 gate 失败时允许执行一次」）→ 全量重录落盘。
3. **收敛恢复**：`git status --porcelain tests/golden/ui/` 列出变更文件；凡非
   `{s16×2, s17×2, s18×2}` 的变更（gate:update 重写产物与库内基线的本机抖动
   差异——golden 权威在 CI windows-latest，本机 Windows 差异仅参考，AGENTS.md
   已知陷阱）一律 `git checkout --` 恢复库内基线。
4. **复跑核验**：`npm run gate` → 19 场景全绿（s16/s17 对重录基线零差、s18
   pass、其余对既有基线零差）。
5. **机器核验口径（VERIFY/MERGE 采证）**：`git status --porcelain
   tests/golden/ui/` 变更集**恰 6 文件**——s16 双基线（M×2）+ s17 双基线
   （M×2）+ s18 双基线（新增 A×2）；这是「gate:update 消费仅限 s16/s17 两处 +
   s18 新增」的机器证明。
6. **前后对比证据**：步骤 1 首跑 FAIL 时 gate.mjs 自动落
   `tests/golden/diff/{s16,s17}.{diff.png,current.png,invariants.json}`
   （:550-553 既有机制）= 重录前形态；重录后基线 = 新 golden——MERGE 证据留档
   时并列呈现（宪法第 3 条「附前后对比」义务）。
7. **CI 盯守（AC8）**：s16/s17 重录基线为本机产物，推送后 CI `ui-constitution`
   为权威复核；红则 rerun 一次，仍红按 issue #12 / 用户上报（不放宽门禁、不为
   变绿二次重录——WORKFLOW §6.9）。

## 7. 回滚

- BUILD/VERIFY 阶段任何不可收敛红：工作树整体丢弃（feat/0056-iter 分支不合并），
  主干零影响（v3 隔离模型，WORKFLOW §4「本迭代按回滚处理」）。
- 合并后发现问题：`git revert` 合并提交（唯一回滚手段，WORKFLOW §6.6——禁止
  force/reset）；golden 恢复随 revert 自动还原（基线文件在提交内）。
- 修复循环 ≤ 2 轮（VERIFY FAIL → BUILD 修 → VERIFY）；超限回滚。
