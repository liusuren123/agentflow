# REPORT · 迭代 0040 · BK-0052 Windows 静态托管修复（VERIFY）

> 执行角色：test-manager。输入：`iterations/0040/PRD.md`（S 项，验收口径内嵌 §6）。
> 环境：工作树 `.zcode/worktree/feat/0040-iter`（分支 feat/0040-iter），win32（AI-WorkStation），
> Node v24.21.0。验收时间：2026-10-26 03:00–03:10。
> **结论：PASS（AC1–AC5 全部通过，交互回归抽查通过，零新增缺陷）。**

## 0. 验收范围与方法

本迭代改动仅两个文件（`apps/server/src/server.ts` sendFile 实参改「相对 + `{root}`」形态、
`tests/smoke/smoke-server.mjs` 新增 W08/W09 护栏），零触 UI 三层。验收 = PRD §6 五条
Given/When/Then 逐条亲跑 + 冒烟全量亲跑 + 浏览器交互抽查。`npm run build` / `npm run gate` /
`npm test` 已由编排脚本在工作树内亲跑通过（派发指令明示「不重复跑全套」，本报告如实标注为
脚本侧证据，非本报告亲跑项；旁证见 §3）。

## 1. 验收标准逐条结果

### AC1（Windows 正路径修复）— ✅ PASS（win32 亲跑）

方法：工作树内 `PORT=3990 node apps/server/dist/server.js` 起服务（后台实例，启动日志
`AgentFlow server 启动 → http://localhost:3990`、SQLite WAL 就绪），node 脚本 fetch 两路由并
与 `apps/web/dist/index.html`（369,265 字节）做 Buffer 逐字节比对：

```
[AC1] GET /           -> 200 | text/html; charset=utf-8 | bytes 369265 | byteEqual(dist 369265): true
[AC1] GET /index.html -> 200 | text/html; charset=utf-8 | bytes 369265 | byteEqual(dist 369265): true
[sanity] /api/v1/health -> 200 {"ok":true,"engine":"agentflow-server","node":"v24.21.0",...}
```

修复前该两路由在本机为 404（PRD §2 / iterations/0038 REPORT §4 观察 1 存证；BUILD JOURNAL
同版本依赖 miniserver A/B：`/abs -> 404` vs `/rel -> 200`）。**不再 404，响应体为构建产物原样。**
API 面（health）零波及。

### AC2（等价性）— ✅ PASS（win32 亲跑 + Linux 侧论证，按 PRD 口径如实区分）

- **亲跑（win32）**：node 一行对照新旧两式路径表达式——
  `path.join(ROOT,'apps','web','dist','index.html')`（改前）与
  `path.join(path.join(ROOT,'apps','web','dist'),'index.html')`（改后）严格相等
  （`old-form == new-form : true`，终值 `…\.zcode\worktree\feat\0040-iter\apps\web\dist\index.html`）。
  托管终点逐字不变。
- **论证（非亲跑）**：send 库 `{root}` 形态解析为 `root + '/' + 相对路径`，终点即上述同一绝对
  路径；Linux 无盘符冒号问题，改前可用 → 改后同路径可用，行为零变化。ubuntu 权威面由 CI
  contracts job 承载——**本轮分支尚未推送，CI 尚未跑**（如实标注：合并推送后以 CI 为准）。
- 编译产物核验：`apps/server/dist/server.js` 已含新形态（grep 命中
  `const WEB_DIR = path.join(ROOT, 'apps', 'web', 'dist')` 与两处
  `res.sendFile('index.html', { root: WEB_DIR })`），E2E 亲跑的即新代码。

### AC3（回归面全绿）— ✅ PASS（smoke 亲跑；build/gate/test 为脚本侧证据）

- **亲跑**：`npm run smoke:server`（工作树根，两遍）→ `==== smoke:server：128 passed / 0 failed ====`
  第二遍定向提取新增护栏：
  ```
  PASS W08 GET / → 200、Content-Type 含 text/html、响应体与 apps/web/dist/index.html 逐字相等
  PASS W09 GET /index.html → 200、Content-Type 含 text/html、响应体与 apps/web/dist/index.html 逐字相等
  ```
  该静态路由**首次获得机器护栏**（REQ-0052-03 达成，未走降级路径）。
- **脚本侧（本报告未重复，依派发指令）**：`npm run build` / `npm run gate` / `npm test` 已由
  编排脚本在工作树内运行且通过。旁证：`tests/golden/ui` 基线目录 mtime 2026-10-26 02:46（基线
  未被重录，本轮非修宪轮），`tests/golden/diff/` 不存在（绿轮无 diff 产物）。
- 存量观察（非本轮引入，不计失败）：AGENTS.md「smoke 现 84 断言」为陈旧描述，JOURNAL 已留痕
  （AGENTS.md 不在本轮白名单）。

### AC4（产物缺失防护不变）— ✅ PASS（win32 亲跑）

方法：暂移 `apps/web/dist/index.html`（mv → `.tmp0040`）→ `PORT=3991 node server.js`
（cwd=apps/server/dist）→ 观察启动行为 → **立即恢复**。实测输出：

```
{"level":60,...,"webIndex":"…\\feat\\0040-iter\\apps\\web\\dist\\index.html","msg":"缺少前端构建产物：请先在仓库根执行  npm run build:web"}
exit=1
```

- 进程以 **exit=1** 快速失败（`timeout 12` 兜底未触发，证明是主动 fatal 而非挂起）。
- 日志文案与 `server.ts:62` 逐字一致；git diff 显示该 fatal 块（:57-60 段）为**纯上下文行零改动**。
- 恢复后核验：`index.html` 369,265 字节（与暂移前一致），`git status apps/web/` 空。

### AC5（改动面白名单机器证明）— ✅ PASS（亲跑）

`git diff HEAD -- apps/web packages/shared tools/pixel-gate tests/golden .github package.json package-lock.json`
→ **输出恒空**（exit 0，无任何 diff 行）。全量 diff stat：

```
 apps/server/src/server.ts    | 12 ++++++++----
 docs/evolution/BACKLOG.md    |  2 ++      ← 机制件（PLAN 过程改动，非产品）
 docs/evolution/STATE.md      | 12 ++++----   ← 机制件（本验收将再推进 phase）
 tests/smoke/smoke-server.mjs | 17 +++++++++
```

产品路径 ⊆ { server.ts, smoke-server.mjs } ✓（PRD §5 白名单全集吻合；server.ts 净 +4 行，
在「预期 ≤6 行」内，其中 3 行为注释）。dist/ 与 data/ 均为构建/运行产物，不入库。

## 2. 交互回归抽查（浏览器，同源 http://127.0.0.1:3990/）

背景：本修复的直接用户价值即「Windows 本机 `npm start` 后浏览器打开首页可用」。用 ZCode
内置浏览器打开托管页（改前该地址 404）：

- **页面加载**：title `AgentFlow · 智能体工作流原型`；ARIA 快照完整呈现顶栏/图标导航/节点库
  侧栏/8 节点画布/浮动运行卡/日志面板/属性面板——非错误页。
- **DOM 不变量**（evaluate 亲测）：`#viewport`=1、`.node`=8（与状态栏「节点 8 · 连线 7」一致）、
  `.port`=15、`.wdg`=15、工作流标签 1 枚、工具条按钮 8 枚。
- **缩放**：点击「＋」→ 缩放标签 55% → 66%（handler 生效）。
- **节点库开关**：点击导航「节点库」→ 面板内容（全部节点/收藏·3、分类列表）出现。
- **多工作流标签**：点击「新建空白工作流」→ 标签栏新增「未命名工作流」。
- **同源后端连通**：日志面板落款「⚡ 执行后端已连接 · Vercel AI SDK 7 · Node v24.21.0」。
- 截图视觉复核（图像分析）：完整编辑器 UI、两枚工作流标签、节点库展开、无破损/错误页。

**环境备注（非缺陷）**：内置浏览器的 Playwright/CUA 指针注入点击在本画布应用上超时（连
`force:true` 亦然；`elementFromPoint` 证明按钮未被遮挡），改用合成 `btn.click()` 派发验证——
事件监听路径与真实点击一致，全部交互生效。判定为自动化层命中测试怪癖而非产品缺陷：本轮
apps/web 零 diff（AC5）+ 脚本侧 gate 0 容差全绿（像素权威），UI 行为未变。不立 BUG。

## 3. 缺陷清单

无新增缺陷（BUG-xxx：零条）。

## 4. 结论

**PASS。** AC1–AC5 逐条通过（AC1/AC4/AC5/smoke/交互为亲跑实证，AC2 win32 亲跑 + Linux 论证
按 PRD 口径如实分列，CI ubuntu 权威面留待推送后）；存量 Minor 观察闭口兑现（BK-0052 目标
达成）。建议进入 MERGE。
