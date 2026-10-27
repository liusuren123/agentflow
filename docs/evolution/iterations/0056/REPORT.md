# 迭代 0056 · REPORT — BK-0042 工作台·项目目录树页（E3 tree 端点 + UI，修宪轮，BK-9004 链终轮）

> 产物角色：test-manager（VERIFY 轮，2026-10-28）· 工作树 feat/0056-iter
> 输入：PRD §5 AC0-AC8 + SPEC §5 验收口径 · 结论：**PASS（0 BUG）**
> 执行环境：win32 · Node v24.21.0 · 本机 Windows（golden 权威在 CI，AGENTS 已知陷阱）

## 0. 总结论

| 项 | 结论 |
| --- | --- |
| 验收判定 | **PASS** —— AC0-AC7 全过，AC8 未到时点（见 §9），BUG 清单为空 |
| 我方实跑 | smoke:server **151/0 ×2 次**（可重复）· npm test **30/30** · 针对性 HTTP E2E **32/32** · 手动 E2E 七点位（真实后端 + 浏览器 + 截图）· 纪律源扫描 13 项全过 · AC7 四零 git diff 恒空 |
| 脚本实跑（VERIFY 派发指令在案，未重复执行） | `npm run build` exit 0 · `npm run gate` 19 场景全绿（含修宪序列：首跑恰 {s16,s17} 红 + s18 golden-created → gate:update 恰一次 → 收敛恰 6 文件 → 复跑全绿）· `npm test` 30/30 |
| 新 smoke 总数 | **151 passed / 0 failed**（145 基线 + B13-B18 六条，两次实跑一致；MERGE 收口写定值 151） |

## 1. AC0 定界消费核验 —— PASS

程序化逐字比对（node 脚本，CRLF 归一，2026-10-28 实跑）：

- ADR-0016 §7 第三代码块（`docs/adr/0016-workbench-right-panel-git-diff-tree.md:277`，943 字）
  == BACKLOG BK-0042 行备注（`docs/evolution/BACKLOG.md:63`，1153 字）**逐字前缀** ✓；
  尾部 210 字为「2026-10-27 迭代 0054 CLOSE 后协调者晋升 ready」过程注记，非定界面。
- 授权链三元组：issue#4 批复承继时间戳 `2026-10-23T15:49:17Z` 在 PRD/SPEC/BACKLOG 三处一致
  在案 ✓；ADR-0016 引用一致 ✓；BACKLOG BK-0042 行状态列 = `ready`（P0/S/ui-proposal/issue#4）✓。
- ADR-0016 §7 第三代码块尾已有 BK-0042 实施纪要（:280，BUILD 轮增补，含两处定形偏差记档）。

## 2. AC1 E3 正路径契约 —— PASS

**代码审查**（`apps/server/src/workbench/tree.ts`，150 行 ≤400）：
isWithinRoot resolve 归一前缀比对（:41-44）· validateTreeQuery path/depth 校验（:49-64）·
collectTree lstat 锚定判型 + 折叠根短路 + walk 递归（:75-99）· walk：'.git' 排除/ENOENT 竞态
跳过/FOLD 占位恒 []/depth 耗尽 children 缺席/dir 先序码点排序/ENTRIES_CAP=500 全局截断
（:101-150）。`routes.ts:65-85` workbenchTreeHandler 三段同构（400 直返 → 404 → logger.warn +
500）；`server.ts:266-267` v1-only 注册（diff 行后、PTY 段前）+ 头注注记。

**HTTP E2E**（工作树真实后端 :3456，32 断言脚本 0 失败；数据 = 真仓库）：

- 无参 → 200，键集恰 `{root,truncated}`，root.name='0056-iter'（不锁字面量）、root.path=''、
  truncated=false、根 children 含 apps/docs；
- 递归形状：dir 无 size 键 / file size 非负整数 / FOLD 四名 children 恒 `[]`（node_modules、
  .zcode、data 根级亲核 + dist 经 apps/server 子树）；
- `.git` 递归零出现；全树 47 条 ≤500；同层 dir 先序（根层 lastDirIdx=10 < firstFileIdx=11）；
- `?path=apps/server&depth=4` → root.name='server'、root.path='apps/server'、children 含 src、
  src 子层 workbench 目录带 children=5（≥3 层嵌套）；`&depth=1` → 非折叠 dir 全部无 children 键；
- depth 越界 `0/7/abc/2.5` → 各 400 `{error:"depth 必须是 1-6 的整数"}`。

**smoke**：B13/B14/B15 逐条 PASS（151/0 内）。

## 3. AC2 防越界与错误码 —— PASS

**HTTP E2E**（同上脚本）：

- 防越界矩阵：`../`、`../../`、`D:/`、`/etc`、`D:\`（%5C）、`%2Fetc` → **各 400
  `{error:"path 越界"}`**；express 多值 path（`?path=a&path=b` 数组形态）→ 400 同字面量；
- 404 两态：`?path=no-such-dir-xyz` 与 `?path=package.json`（存在但为文件）→ 同字面量
  `"path 不存在或不是目录"`；
- 折叠语义：`?path=node_modules` → 200 children===[] 恒空 + truncated=false；
  `?path=.zcode/tools`（折叠下级存在路径）→ 200 恒空；`?path=node_modules/nope`（折叠内不
  存在）→ 404（lstat 判型先于折叠短路，tree.ts:81-95 步序兑现）；
- 500 遍历异常：win32 不可移植伪造（SPEC §3.8 记档），以源扫描背书——`routes.ts` 500 字面量
  `'tree traversal failed'` 在场（E3 自有，零 git 故不复用 'git command failed'）。

**纪律源扫描**（独立复跑 B18 面，13 项全 PASS）：tree.ts+routes.ts+root.ts `/shell/i` 零命中
（含注释）；tree.ts `'spawn'` 零命中、不 import git.js/runGit；`'readdir'`/`'lstat'` 在场；
fs 写面调用形态（`\b(writeFile|appendFile|unlink|rename|mkdir|chmod|chown|truncate|rm)\s*\(`）
零命中；`'.git'` 排除与 FOLD 四名字面量在场。**smoke**：B16/B17/B18 逐条 PASS。

## 4. AC3 前端交互 —— PASS

**s18 golden 不变量**（`tests/golden/ui/s18-workbench-tree-online.invariants.json`，逐键比对）：
`wbTabs=['props','git','diff','tree*']`、`propsShown=false`、`treeCounts='3d/2f/2w'`、
`foldNames=['web','node_modules']`、`drillNames=['server','docs']`（SPEC §3.7.2 自带「:not(.open)
以 BUILD 实现的类形态为准，VERIFY 按实跑对齐」注记——apps 行内嵌展开带 `.open` 被排除，
JOURNAL §3.1 + ADR-0016 实施纪要 ② 双记档）；cssVars 33 键零新增；counts（8/7/15/15/1）与
既有场景同源——wb-tree 前缀类名零触计数面与自定义属性面，浏览器实测背书。

**手动 E2E（七点位，见 §6）** + 截图视觉证据（右栏 clip）：三形态分级可视区分确认——目录行
带 chevron、文件行无箭头、折叠占位行（node_modules/data/.zcode/dist）置灰无箭头；标题
「项目目录」；缩进逐级 +14px；刷新按钮在场。#props 互斥（tree 激活时 display:none）与恢复
（切回属性页内容原样）均实测。

## 5. AC4 golden 双通道 —— PASS（工作树范围）

机器核验（VERIFY 实跑 git 命令）：

1. `git status --porcelain tests/golden/ui/` 变更集**恰 6 文件**：s16 双基线 M×2 + s17 双基线
   M×2 + s18 双基线新增 ×2 ——「gate:update 消费仅限 s16/s17 两处 + s18 新增」的机器证明形态
   复原（其余 16 场景对 HEAD 逐字节零漂移 = 未出现在变更集）；
2. s16/s17 不变量差异**恰一行**：git diff 实查两文件各 `-  "tree!"` / `+  "tree"`
   （4 变更行 = 2 文件 × ±1），波及源唯一性（tree 按钮解禁）兑现，无其他键漂移；
3. s3-library **不在**变更集（JOURNAL §6 P1 修复把 gate:update 误写入的抖动字节 checkout 回
   HEAD）——issue #12 抖动未消费重录通道，0037~0052 纪律保持；
4. gate.mjs：头注「19 个 golden 场景」+ 在线态枚举含 s18 + 溯源行「s18 溯源迭代 0056
   （WB_ROUTES E3 mock + UTC，目录树页，BK-0042）」（:4-9）；E3 mock 路由 :388-399 与 SPEC
   §3.7.1 fixture 逐字一致（三 dir 形态刻意各一 + s16/s17 零请求因果注记）；wbTreeOpen/
   Ready/Inv + s18 场景行 :464-476/:521-522；`grep -cE "^\s*\{ id: 's[0-9]+"` = **19** ✓；
5. 末次 gate 全绿旁证：`tests/golden/diff/` 为空目录（gate 每跑清空、仅写失败产物；脚本终跑
   01:10 后无失败残留）。**给 MERGE 的提示**：SPEC §6 步 6 的「重录前 diff/ 图像」已随后续
   gate 跑清理——前后对比以 JOURNAL §6 sha256 记录（s16 ff62e4fa…/s17 0715f590…，重录基线
   与首跑失败产物逐字节一致 = 确定性末态证明）+ git 历史（重录前基线在 HEAD）承载，非本报告
   缺陷。

## 6. AC6 手动 E2E 七点位 —— PASS（数据面 = 真实仓库，npm start 同源真后端）

环境：工作树后端（PORT=3456 注入，apps/server/dist + 真仓库；:3000 被旧主干预留进程占用
未动）。浏览器：ZCode IAB（1600×900）。交互注入形态如实标注：页签/树行点击 = evaluate 派发
原生 `.click()`（与 gate.mjs s18 场景 SPEC §3.7.2 同款形态）；空画布右键 = #viewport 派发
contextmenu MouseEvent（画布命令式模块）；CUA 坐标注入在 IAB 未达页面（已诊断弃用）。网络
核对 = performance resource entries（与 DevTools Network 等效的机器证据）。

| # | 点位 | 结果 | 关键证据 |
| --- | --- | --- | --- |
| 1 | 右键菜单「工作台 · 仓库信息」打开 | PASS | #wb-tabs/#workbench 在场，git 页激活，分支 feat/0056-iter/HEAD ae6e3dc（**锚定工作树仓库正确**），页签 `props/git*/diff/tree`（tree 无 `!` 无 title） |
| 2 | 点「目录」页签 | PASS | tree* 激活；on-open 恰 1 条 `(root)` fetch；47 行（与 curl total=47 一致）；折叠占位 .zcode/data/node_modules；标题「项目目录」；#props display:none；无截断横幅；截图视觉确认三形态分级 |
| 3 | 点 apps 行展开 | PASS | apps 首开即内嵌展开态（depth2 响应内嵌子行）；点击 = 收起（47→45，server/web 两行移除）；再点 = 重新 fetch `?path=apps` 展开（+16 行，含 apps/server 内嵌展开、dist 折叠占位） |
| 4 | 收起 + 点折叠占位行 | PASS | apps 收起移除后随更高 data-lv 行；node_modules 占位行点击 → **零新 fetch、零展开** |
| 5 | 逐级下钻 apps/web/src | PASS | fetch 序列恰 `(root)→?path=apps→?path=apps/web→?path=apps/web/src`，**每次点击恰一条、带 path 前缀、零全量预取**；src 展开呈 app.css/Skeleton.tsx 等行（68 行态） |
| 6 | 点「刷新」 | PASS | 恰 1 条新 `(root)` fetch；整树重渲（68→47 行）；下钻插入行清除；apps 回内嵌展开态（诚实刷新语义） |
| 7 | 切回属性/仓库/变更 + 新页懒创建 | PASS | 属性页 #props 恢复显示且内容原样（属性/未选中任何对象…）；git 页分支信息正常；diff 页「变更对比」文件列表正常；新开页面 #wb-tabs/#workbench 不在场（懒创建，s0 几何前提） |

中途一次 evaluate TypeError（apps/web 行点击后 src 行 null）经查为**交互语义非缺陷**：apps/web
在 `?path=apps` 响应中已内嵌展开，首次点击执行收起（移除含 src 的 6 行），与 SPEC §3.5 ②
形态一致；重取序列后行为全符合预期。

## 7. AC5 回归面 —— PASS

- `npm run smoke:server`：**151 passed / 0 failed**（本人实跑 **两次**，exit=0，可重复；
  B13-B18 六条逐条 PASS，B01-B12 既有组零回退，日志 `$TEMP/smoke0056-full.log`）；
- `npm test`：**30/30 pass 0 fail**（本人实跑，608ms）；
- `npm run build` exit 0：脚本工作树内实跑通过（VERIFY 派发指令明示不重复全套；BUILD JOURNAL
  §4 另有 tsc/Vite 零诊断记录）；
- 新总数口径：**151/0**（145 + 6），MERGE 收口写定值。

## 8. AC7 四零机器证明 —— PASS（VERIFY 实跑）

`git diff --stat -- apps/web/src/Skeleton.tsx packages/shared package.json package-lock.json
apps/server/src/config.ts apps/server/src/guard.ts .env.example` 输出**恒空**；
`git status --porcelain package.json package-lock.json` 空（lock 零变化 = 零新依赖）。

## 9. AC8 CI 盯守 —— 未到时点（不判过不判挂）

分支未推送，CI `ui-constitution`（19 场景，含 s16/s17 重录后基线）尚未运行——按 PRD AC8
「未到时点不判过不判挂」（0012 先例）。义务在 MERGE/推送后：CI 全绿方可收口；红则 rerun
一次，仍红报 issue #12 / 用户，不得二次重录（WORKFLOW §6）。

## 10. 偏差与观察（全部非阻塞，记档供 MERGE/CLOSE）

1. **drillNames 实测 `['server','docs']`** ≠ SPEC §3.7.2 行文 `['apps','docs','server']`——
   SPEC 自带「以 BUILD 实现的类形态为准，VERIFY 按实跑对齐」注记，golden 与实跑一致，
   JOURNAL §3.1 + ADR-0016 实施纪要 ② 双记档。无需动作。
2. **B18 fs 写面禁词为调用形态词表**（规避 `truncated` 字段子串误报）——保义零误报，
   JOURNAL §3.2 + ADR 实施纪要 ① 记档。B05/B12 既有断言零触碰（151/0 内验证）。
3. **E3 不设专用探针实例**（PRD REQ-0042-03 预想 B04 形态）——SPEC §3.8 定形偏差记档
   （404 面主实例直测 + B13 锚定合成证明），理由充分，VERIFY 认可。
4. tree.ts 行数：本人 `split('\n')` 计 150（JOURNAL 记 151，尾行换行差），均 ≤400 上限。
5. 工作树根 `data/` 由 smoke 主实例 initStore 创建（不入库面，AGENTS 约定 data/ 不入库），
   B13 的 data 折叠行断言在 smoke 语境下由主实例创建后满足（151/0 实证）。
6. 验收期间 :3000 端口被一旧服务占用（无 E3 端点、非本工作树产物、未动）；本验收后端以
   PORT=3456 隔离启动，验收完毕已停止。

## 11. BUG 清单

无（0 Blocker / 0 Critical / 0 Major / 0 Minor）。

## 12. 结论

**VERIFY PASS**。BK-0042 实现与 PRD 验收标准、SPEC 验收口径逐条吻合；修宪 golden 双通道
消费合规（gate:update 恰两处各一次 + s18 golden-created，机器证明在案）；四零承诺与 E3
承载纪律（零 git 子进程、fs 只读白名单）实测背书。建议进入 MERGE（合并后主干复测 + AC8
CI 盯守为收口前置）。
