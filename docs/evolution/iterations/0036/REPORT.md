# REPORT · 迭代 0036 · BK-0040 工作台右栏容器 + git 信息页（VERIFY 轮）

> 产出角色：test-manager（VERIFY 轮，2026-10-26）。输入：PRD 验收标准（AC1-AC6 /
> REQ-0040-01~09）+ SPEC §5 验收口径。全程在隔离工作树
> `.zcode/worktree/feat/0036-iter`（分支 feat/0036-iter，HEAD `915e131`）内执行。
> 验收环境：Windows 10 26300 · Node v24.21.0 · 工作树内 node_modules。

## 结论：**PASS**（零缺陷；1 项环境限制如实记录，非产品缺陷）

| AC | 口径 | 结论 | 本轮实跑证据 |
| --- | --- | --- | --- |
| AC1 | `npm run build` 全绿 | **通过（脚本跑）** | 派发指令明示脚本已跑且过；旁证：`apps/web/dist/index.html`（367786B 单文件产物，01:14）与 `apps/server/dist/workbench/{root,git,routes}.js` 编译产物均在盘（本轮 ls 实查）。测试经理未复跑（按派发指令不重复全套） |
| AC2 | gate 13 场景全绿 + 既有 12 场景 diffPx=0 + 零 gate:update | **通过（脚本跑 + 本轮旁证加固）** | 脚本 gate 已跑且过（派发指令明示）。本轮实查：s12 两基线文件在盘（png 1600×900 86429B + invariants.json，其值与 SPEC §3.6 预期逐字一致：wbTabs `['props','git*','diff!','tree!']` / propsShown false / wbBranch 'main' / wbCounts '2c/2g'）；`tests/golden/diff/` 空（无残留差异图）；**cssVars 键集与 s0 逐键一致**（本轮 node 比对输出 KEYSET-IDENTICAL，零新增自定义属性）；既有 12 场景零波及的机器证明 = app.js/app.css/gate.mjs 删除列全 0（见 AC6）——既有内容零字节改动 + 懒创建（打开前零新增可见 DOM，浏览器实测 INITIAL 断言在案），几何上不可能波及既有场景像素 |
| AC3 | `npm test` 30/30 零回退 | **通过（脚本跑）** | 脚本已跑且过（派发指令明示）；本轮加固：`packages/shared` diff 为空（AC6 实查）⇒ 契约测试为纯回归面 |
| AC4 | smoke 扩断言全绿（118 基线 + E1 组） | **通过（本轮实跑）** | `npm run smoke:server` → **`==== smoke:server：123 passed / 0 failed ====`**（B01-B05 全 PASS，含 B04 探针实例「临时非 git 目录 + spawn cwd=仓库根 → 404 not a git repository」锚定双向证明；118 基线零回退） |
| AC5 | 手动 E2E 五点位全过 + error 零捕获 | **通过（本轮实跑）** | 浏览器实走五点位全过，`window.__afErrs` 全程 `[]`（明细见 §2） |
| AC6 | 机器证明四零 | **通过（本轮实跑）** | 明细见 §1 |

## 1. AC6 机器证明（本轮 git diff 实查，2026-10-26）

- **四零**：`git diff HEAD --stat -- package.json package-lock.json
  apps/server/src/config.ts packages/shared apps/web/src/Skeleton.tsx` → **输出为空**
  （零新依赖 / 零 env / 零 shared / Skeleton.tsx 零改动）。
- **纯插入**：`git diff HEAD --numstat` 删除列全 0——server.ts 3/0 · app.css 39/0 ·
  app.js 91/0 · server-sync.js 12/0 · gate.mjs 50/0 · smoke-server.mjs 134/0
  （ADR-0016 6/3 为白名单 #11 允许的状态行 rewrap + blockquote 追加；STATE.md 6/6
  为过程文件）。
- **#props 面专查**：app.js 删除行数 0（`git diff -U0 | grep -c '^-'` = 1，仅
  `--- a/` 文件头行；numstat 91/0 为权威）。锚点逐项复核在场且逐字未动
  （工作树行号较 HEAD +1/+2 位移 = 纯插入自然结果）：renderProps :915（HEAD :914）·
  `$('#props').addEventListener('change'/'click'/'input')` :1003/:1039/:1067 ·
  滚动恢复对 :1027-1028 · refreshPropsIfIdle :2215。
- **B05 式纪律源扫描（本轮亲跑 grep）**：workbench 三文件 `/shell/i` **0 命中**
  （含注释）；可写命令单引号 argv 字面量
  `'(add|commit|push|pull|checkout|reset|clean|merge|rebase|stash)'` **0 命中**
  （exit=1）；`setTimeout(` 与 `.kill()` 在场；rev-parse/status/log 三词在场。
- **golden 目录**：`git status` 恰 2 条 untracked（s12 png + invariants.json），
  既有 24 基线文件零触碰。

## 2. AC5 手动 E2E 五点位（浏览器实走；通道见 §4 环境注记）

服务：工作树后端 `:3000`（health 200）+ 工作树 dist 经 vite preview `:4173`
（`/api` 代理 → :3000，页面与 E1 均实测 200）。交互路径全部走 app 真实委托
（mousedown/mouseup 选节点、viewport contextmenu、`#ctxmenu .mi` click、
`#wb-tabs` click 委托、`nodesLayer` dblclick——与 gate.mjs wbOpen 同款）。

- **① 打开右栏**：默认态断言 `#wb-tabs`/`#workbench` 均不存在、#rightbar 子节点
  恰 `["props"]`、#props display:block（懒创建零新增可见 DOM）；空画布右键菜单
  出现且含新项「工作台 · 仓库信息」（位于「适应视图」后，既有菜单项全保留）；
  点击后页签条出现：`['props','git*','diff!','tree!']`（git 激活、diff/tree 禁用
  且 title=「后续批次提供」），#rightbar class=`wb-on wb-page-git`，子序
  `[wb-tabs, props, workbench]`，#props display:none / #workbench display:flex，
  概要卡 + 提交列表 + 变更行全呈现。**通过**。
- **② 内容与 git 事实一致**：页面 branch=`feat/0036-iter`（== `git status
  --porcelain=v1 --branch` 首行）；head=`915e131`（== `git log -1 %h`）；首条提交
  「915e131 liusuren123 … chore(evolution): merge-arbiter 职责文件去除…」逐字
  一致；变更 12 个文件 == porcelain 12 条；首行「M apps/server/src/server.ts」；
  提交 20 条 == 默认 limit=20。**通过**。
- **③ 页内刷新**：`.wb-refresh` 点击 → fetch 计数 2→3（新请求发出且完成）、内容
  重渲染（branch/12 变更/20 提交保持）。**通过**。
- **④ 切回属性页**：点「属性」页签 → #rightbar class 回落 `wb-on`、#props
  display:block、#workbench display:none；**#props innerHTML 与打开前基线逐字节
  相等**（`propsHtmlIdenticalToBase=true`，renderProps 语义零变化的最强证据）；
  参数编辑语义正常：`#prop-title` input/change → 值变更且节点标题实时同步
  「知识库检索·E2E」（三事件委托路径工作，已还原）；再切回仓库页互斥切换与数据
  正常。**通过**。
- **⑤ goal 面板协同（BK-0034 共存定界）**：经节点库（空画布双击真实路径）添加
  「通用智能体」节点后双击 → #goal-panel `.show`（z-index 60）与右栏工作台
  （z-index 30）同开共存，几何上 goal（x=902..1262）叠于右栏（x=1016..1280）
  之上；选中智能体节点切属性页后，在 goal 输入框打字（真实 input 路径 + 焦点
  在 goal textarea）→ **#props innerHTML 逐字节不变**、props 保持可见、goal
  面板保持打开——互不抢占。视觉证据：整页截图（goal 面板叠于 git 页工作台上方，
  两面板内容完整，无错误弹窗）。**通过**。
- **error 钩子终检**：`window.__afErrs`（error + unhandledrejection）全程 `[]`。
  **通过**。

## 3. E1 端点直连验证（本轮 curl 实跑，后端 :3000）

- `GET /api/v1/workbench/git` → 200，键集恰 `{branch,head,changes,commits}`；
  branch/head/首条提交/12 条变更与 `git status` / `git log` 本机输出逐项一致。
- `?limit=1` → commits 恰 1 条；`?limit=3` → 3 条（新→旧有序）。
- `?limit=0` / `?limit=101` / `?limit=abc` → 各 400 且
  `{"error":"limit 必须是 1-100 的整数"}`（字面量精确）。
- `GET /api/workbench/git`（旧别名）→ **404**：v1-only 注册证实（ADR-0005 先例）。
- 白名单与超时纪律：B01-B05 源扫描 + B04 探针实例双证（§AC4/§1）；git 超时与
  ENOENT 不做 HTTP 级测试为 SPEC §3.7 如实标注项（win32 不可移植伪造），由 B05
  源扫描背书——本轮复核认可该口径。

## 4. 发现与注记（如实记录，均不构成 FAIL）

1. **ENV-001（环境限制，非产品缺陷）**：工作树形态下 `npm start` 的 `GET /`
   返回 404（NotFoundError，send 库）。**根因实证（最小复现）**：express
   `res.sendFile` 默认 dotfiles 策略对含点目录段的绝对路径（工作树位于
   `.zcode/` 下）判 404——同一 express + 同一路径，默认策略 404、
   `{dotfiles:'allow'}` → 200（359948B 页面正常吐出）。server.ts 静态托管面
   本轮零改动（diff 仅 +3 行端点注册），主干 checkout 路径无点段不受影响。
   本验收改经 vite preview（同一份工作树 dist + `/api` 代理）完成浏览器 E2E，
   覆盖面不受损。建议（不属本轮范围，供后续立项评估）：机制手册注明该限制，
   或产品侧为 sendFile 显式 `dotfiles:'allow'`（另开 backlog 项）。
2. **过程注记（验收脚本自致，非产品行为）**：git 页 fetch 计数起始为 2，系本
   验收一次失败重试（waitForFunction API 不存在报错前菜单项 click 已执行）导致
   同一入口点击两次；产品路径单次打开单次请求（代码审阅 wbOpen→wbSwitch 单调用）。
3. **过程注记**：Playwright locator 动作性 click 对 `.wb-refresh` 超时；DOM 可达
   性诊断正常（elementFromPoint 中心点命中即按钮本体、ctxmenu 已关、按钮 59×22
   在视口内），疑似页面周期性重绘未过 stability 检查。改走 evaluate 真实 DOM
   click（触发同一监听器）完成验证。非产品缺陷。
4. **AC1/AC2/AC3 为脚本侧已跑**（派发指令明示通过），本轮按 VERIFY 职责做了
   targeted E2E（AC4 smoke 全量 + AC5 浏览器五点位 + E1 直连）与 AC6 机器证明，
   未复跑全套 build/gate/test——此为如实标注项，非证据缺口（AC2/AC3 旁证见表）。

## 5. REQ 对照总表

| REQ | 结论 | 关键证据 |
| --- | --- | --- |
| 0040-01 后端模块 + 根锚定 + 零 env | ✅ | root.ts 模块级常量（代码审阅）；B01（锚少一级即 404 红）+ B04（cwd 误用即 200 红）双向机器证明；config.ts diff 空 |
| 0040-02 E1 端点契约 | ✅ | §3 直连全项 + smoke B01-B03 + v1-only 别名 404 + 零 shared |
| 0040-03 git 子进程纪律 | ✅ | §1 源扫描四项 + smoke B05 + 白名单三命令写死 |
| 0040-04 右栏容器 + 页签 + git 页 | ✅ | 代码审阅（B 案懒创建、#props 面零触碰纯插入）+ 浏览器 ①④ 实测 |
| 0040-05 数据消费与刷新 | ✅ | on-open fetch（打开即取）+ ③ 刷新重取（计数 2→3）；零轮询零 SSE（events.ts 零 diff；server-sync 仅数据面 +12 行） |
| 0040-06 会话面板协同实测 | ✅ | ⑤ 共存实测（z60>z30、打字互不打断）与 SPEC §3.4 定界一致 |
| 0040-07 gate 增量 + golden 双通道 | ✅ | AC2 行（s12 产物 + 键集一致 + 零 gate:update + 零波及机器证明） |
| 0040-08 smoke 扩断言 | ✅ | 123 passed / 0 failed（本轮实跑） |
| 0040-09 手动 E2E 五点位 | ✅ | §2 全过 + error 零捕获 |

## 6. 建议

- 无阻塞项。ENV-001 的 sendFile dotfiles 处置可由 PM 评估是否立项（S 项，
  主干不受影响，仅影响 `.zcode/worktree` 形态的 `npm start` 手动走查通道）。
