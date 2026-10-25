# BUILD 日志 · 迭代 0036 · BK-0040 工作台右栏容器 + git 信息页（修宪轮）

> 产出角色：code-developer（BUILD 轮，2026-10-26）。输入：PRD + SPEC（同目录）。
> 全程在隔离工作树 `.zcode/worktree/feat/0036-iter`（分支 feat/0036-iter）内进行。

## 1. 开工前锚点复核（沿 SPEC §0 表逐项）

| 锚点 | SPEC 记值 | BUILD 亲核 | 判定 |
| --- | --- | --- | --- |
| Skeleton.tsx:137 右栏 | :137 | :137 `<aside id="rightbar"><div id="props"></div></aside>` | 一致 |
| app.js renderProps | :914 | :914 | 一致 |
| app.js 三事件委托 | :1002/:1038/:1066 | 一致（change/click/input） | 一致 |
| app.js 滚动恢复 | :1026-1027 | 一致 | 一致 |
| refreshPropsIfIdle | :2213-2216 | 一致 | 一致 |
| app.css #rightbar/#props | :337-339 | 一致（:337-338 / :339） | 一致 |
| server.ts v1 注册族 | :205-219 | 一致（workflows :205-213、sessions :215-219） | 一致 |
| code.ts spawn 纪律 | :7/:50/:53 | 一致（实测文件位于 apps/server/src/code.ts 平铺布局，非 AGENTS.md 仓库地图所述 handlers/ 子目录——按代码事实落位，SPEC §4 模块边界图同） | 一致 |
| tools.ts SANDBOX | :16 | 一致 | 一致 |
| gate.mjs SCENARIOS | s0~s11 | 一致（:237-257） | 一致 |
| `wb-` 前缀 / `#workbench` / `#wb-tabs` 全仓碰撞 | 零 | grep apps/web/src 零命中；app.js 对 #rightbar 现有引用为零（prepend/appendChild 不触 #props） | 一致 |

## 2. 落地清单（SPEC §2 白名单逐项，路径相对工作树根）

1. **`apps/server/src/workbench/root.ts`（新增 15 行）**：`PROJECT_ROOT` 模块级
   常量（dist/workbench 上溯三级 = 仓库根；server.ts:44 平铺两级、本模块深一层
   故三级——SPEC §3.1 消歧落实）；零 env。
2. **`apps/server/src/workbench/git.ts`（新增 82 行）**：`runGit` 执行器
   （argv 数组、不启用命令解释器、`setTimeout(` 5s + `.kill()`——code.ts:53 同构；
   error/超时 reject，非零退出码交调用方归类）+ `WorkbenchGitError`
   （kind: not-repo | failed）+ `collectGitInfo`（rev-parse 探测 → status
   `-c core.quotepath=off --porcelain=v1 --branch` → log `\x1f` 分隔；branch 截断
   `...`/首空格（detached→'HEAD'）；changes 前两字符状态码 + ` -> ` rename 拆分；
   commits ts=秒×1000）+ GitChange/GitCommit/GitInfo 类型导出。只读白名单恰
   rev-parse/status/log 三命令，可写命令零出现（B05 源扫描机器断言）。
3. **`apps/server/src/workbench/routes.ts`（新增 26 行）**：`workbenchGitHandler`
   ——limit 校验 400（server.ts:173 同款字面量）/ not-repo 404
   （'not a git repository'）/ 其余 500（'git command failed'，细节进 logger）。
4. **`apps/server/src/server.ts`（+3 行纯插入）**：sessions import 块后 +1 import；
   sessions stop 注册行后 +注释 +1 注册行（v1-only，无 /api/* 别名）。
5. **`apps/web/src/server-sync.js`（+12 行纯插入）**：`fetchWorkbenchGit` +
   SVR `wbGit/wbGitErr` 两键 + `wbGitArrive/onWorkbenchGitArrive` +
   `refreshWorkbenchGit`（四件，wf/runs/sessions 同型；零 DOM、events.ts 零接触）。
6. **`apps/web/src/legacy/app.js`（+91 行纯插入，既有行零删改）**：
   - import +1 行（refreshWorkbenchGit）；
   - 空画布 ctxmenu :1613（适应视图）后 +1 菜单项
     `{ic:'git-branch',t:'工作台 · 仓库信息',f:()=>wbOpen('git')}`（图标 'git-branch'
     现成键 app.js:68）；
   - 文件尾（goal 模块段后、bootLegacyApp 闭合 `}` 前）workbench 模块段：
     `WB` 页态 + `wbEnsure`（懒创建 #wb-tabs 四页签——props/git/diff/tree，
     diff/tree disabled 占位 + 「后续批次提供」title；#workbench 空壳 +
     .wb-topbar/.wb-refresh/.wb-scroll；#rightbar prepend/append，不触 #props）+
     `wbOpen`（wb-on + 切 git）+ `wbSwitch`（props ⇄ git 互斥视图切换，仅
     #rightbar 类名；git 页 on-open fetch）+ `wbRenderGit`（错误空态 / 概要卡
     （分支/HEAD 短 sha/变更计数）/ .wb-commit 列表（short sha + author +
     fmtTs(ts) + subject）/ .wb-change 列表（两位状态码 + path，rename 呈
     from → path）/ 工作区干净空态）。#props 三委托/滚动恢复/renderProps/
     refreshPropsIfIdle 零触碰。
7. **`apps/web/src/app.css`（+39 行纯插入，文件尾）**：`#wb-tabs`/`.wb-tab`/
   `#workbench`/`.wb-topbar`/`.wb-scroll`/`.wb-summary`/`.wb-kv`/`.wb-sec`/
   `.wb-commit`/`.wb-c1`/`.wb-c2`/`.wb-sha`/`.wb-change`/`.wb-st`/`.wb-path`/
   `.wb-empty` 等 wb- 前缀新选择器；未打开前 #wb-tabs/#workbench 均
   display:none；视图切换 `#rightbar.wb-page-git #props{display:none}`（新选择器，
   #props 既有规则零改动）；零新增 `--` 自定义属性（值全取既有变量/既有字面量）；
   零动画（wb 面无 transition/animation，稳定双帧确定性）。
8. **`tools/pixel-gate/gate.mjs`（+50 行纯插入）**：`WB_ROUTES` fixture（health +
   workbench/git 尾通配，固定字面量 + 整点毫秒 ts）+ `wbOpen`（真实交互两步：
   #viewport contextmenu → 按「工作台」文本 click .mi）+ `wbReady` 状态量探针
   （2 提交 + 2 变更行，10s 超时红即 FAIL）+ `wbInv`（wbTabs/propsShown/wbBranch/
   wbCounts）+ SCENARIOS 尾 s12-workbench-git-online 行（timezoneId UTC）。
   既有场景行与既有 fixture 零改动。
9. **`tests/golden/ui/s12-workbench-git-online.png` + `.invariants.json`**：
   golden-created 通道（BUILD 自测 gate 首跑落盘，见 §3；基线文件随产品提交入库）。
10. **`tests/smoke/smoke-server.mjs`（+134 行纯插入）**：B 组 B01（E1 正常契约，
    键集恰四键 + 各字段形状）B02（limit=1/3）B03（limit=0/101/abc → 400 字面量）
    B04（专用探针实例：mkdtemp 非git 目录 + cpSync 两 dist + node_modules junction +
    spawn cwd=REPO_ROOT → 404 not a git repository；自建自清理 finally kill+rmSync）
    B05（纪律源扫描：三文件 /shell/i 零命中 + setTimeout(/.kill() 在场 + 可写命令
    单引号 argv 零命中 + 三命令在场）。插入位置 = O 组后、Z 组前；既有断言零改动。
11. **`docs/adr/0016-…md`（改，草案态措辞不变）**：状态行加「BK-0040 实施轮已消费
    （迭代 0036 BUILD…）」标注；§7 首代码块闭合围栏后追加单行 blockquote 实施纪要
    （0034/ADR-0015 §7 先例形态——**代码块本体字节不动**，保 VERBATIM 比对基准）。

## 3. BUILD 自测（工作树内实跑；完整门禁由脚本统一复跑）

- `node --check tools/pixel-gate/gate.mjs` → 通过；`node --check
  tests/smoke/smoke-server.mjs` → 通过；`node --check apps/web/src/server-sync.js`
  → 通过。
- `npm run build`（shared+web）→ 通过（vite 68 modules，717ms）；`npm run
  build:server`（tsc）→ 0 error（dist/workbench/{root,git,routes}.js 产出）。
- `npm run gate` → **13 场景全绿**：既有 s0~s11 逐场景 diffPx=0（零波及实测），
  s12 首跑 golden-created 落盘；**二跑复验 s12 diffPx=0**（确定性成立）；
  s12 不变量实测 = wbTabs `['props','git*','diff!','tree!']` / propsShown
  false / wbBranch 'main' / wbCounts '2c/2g'，cssVars 键集与既有场景一致
  （零新增自定义属性）。零 gate:update。
- `npm test` → 30/30（0 fail）。
- `npm run smoke:server` → **123 passed / 0 failed**（首轮 B04 红 ×2 经 §5-B04
  修复后全绿；B01-B05 + Z01-Z04 全过，118 基线零回退）。
- （以上为 BUILD 工作树内实跑；完整门禁由脚本统一复跑为准。）

## 4. 四零与纯插入机器证明（git diff 实查，2026-10-26）

- 零新依赖：`git diff HEAD --stat -- package.json package-lock.json` 恒空。
- 零 env：`apps/server/src/config.ts` 零 diff。
- 零 shared：`packages/shared` 零 diff；`Skeleton.tsx` 零 diff。
- golden 目录：仅 s12 两新文件（`git status tests/golden/ui/` 恰 2 条 untracked）。
- 纯插入（`git diff HEAD --numstat` 删除列全 0）：server.ts 3/0 · app.css
  39/0 · app.js 91/0 · server-sync.js 12/0 · gate.mjs 50/0 · smoke-server.mjs
  134/0。#props 面专查：app.js 删除列 0 ⇒ renderProps/三委托/滚动恢复/
  refreshPropsIfIdle 既有行零字节改动。
- ADR-0016：6/3（状态行 rewrap + §7 首块闭合围栏后 blockquote 追加；§7 三个
  ```text 代码块本体字节不动——git diff hunk 中该块整段为 context 行，VERBATIM
  比对基准保持）。

## 5. 决策与偏差记录

- **入口定界**按 SPEC §3.4 裁决执行（懒创建 + 首开后常驻 + 空画布右键菜单首开），
  无偏差；BK-0034 协同定界 = 共存（z-index 60 > 30 既有次序，无新机制），SPEC 已载。
- **B04 探针实例两处实发缺陷与修复**（BUILD 自测轮发现，产品代码零涉及——
  均为测试自身形态问题）：
  1. 首跑红：探针进程 `ERR_MODULE_NOT_FOUND 'express'`。根因一：只复制了
     `apps/server/dist`，Node ESM 裸包解析以**最近 package.json** 为作用域
     基点，缺失时模块上下文漂移到用户目录（实测警告指向
     `C:\Users\…\package.json`）→ 修复 = 随行复制 `apps/server/package.json`。
  2. 二跑仍红：工作树形态下 `REPO_ROOT/node_modules` 是**挂满悬挂 junction
     的壳**（逐包 junction 指向不存在的 `node_modules/node_modules/*`；实测
     `require.resolve('express')` 穿透到主仓 `D:\...\agent-workflow\node_modules`
     ——工作树物理嵌套于主仓内，主实例本就沿同一路径解析，118 基线先例在案）
     → 修复 = junction 目标改为「自 REPO_ROOT 向上第一个真含 express 的
     node_modules」（CI 主干 checkout 首跳即命中自身 node_modules，双形态可移植）。
     SPEC §3.7-B04「node_modules 指向 REPO_ROOT/node_modules（依赖全提升）」的
     事实前提在工作树形态下不成立，按代码事实转写（沿 0027 先例）。
- **已知限制如实标注**（git.ts 注释 + smoke B 组头注）：零提交仓库 log 退出码 128 →
  500（不伪造空数据）；git 超时/ENOENT 不做 HTTP 级测试（win32 不可移植伪造），
  由 B05 源扫描背书。
- 无扩大影响面；无未批准 UI 触及（全部 UI 变更均在 ADR-0016 + issue#4 批复面内）。
