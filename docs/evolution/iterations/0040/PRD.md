# PRD · 迭代 0040 · BK-0052 Windows 静态托管修复（sendFile 绝对路径 → {root} 相对形态）

> 选题存证 2026-10-26 02:51（PLAN 轮，product-manager，工作树 feat/0040-iter）。
> **S 项（类型 debt、触UI=否、非 doc）→ 免独立 SPEC**（WORKFLOW §4 PLAN 契约）：本文件
> 内嵌受影响文件清单（§5）与验收口径（§6），skipSpec=true。

## 1. 本轮选题过程（审计链）

1. **批复同步**：本轮档案 approved：无 / rejected：无 → 选题优先序 ① 空。
2. **ready 队列亲核**（`awk -F'|'` 逐行抽取状态列，本工作树 BACKLOG.md）：全池 58 行中
   状态=ready 者仅 **BK-0040**（P0/M，issue#4 修宪轮）1 项；派发提示明示其被并行工作流
   占位「本轮严禁选择」（亲核 `.zcode/locks/items/` 恰为 BK-0040/BK-0049 两占位目录，
   与提示一致）→ 优先序 ② 枯竭（BK-0049 本为 proposed 且同在禁选清单）。
3. **侦察档案无可选候选**：残缺标记三处——tools.ts:5 系「not implemented，不伪造结果」
   政策注释、tools.ts:138 系 stub 工厂既有设计面（BK-0005 done 显式化 + ADR-0011 维持
   browser stub 终态），均非缺陷；package-lock.json:787 系 integrity 哈希中 base64 的
   "XXX" 假阳性；悬挂 run 探针 `[]` 零命中；issue 面板 #4/#5/#6/#12 全为 needs-approval
   无一获批（CI/golden/pixel-gate 均需批准区，批复前零动作）。
4. **转治理日产物证据行补题**（规则④唯一合法通道）：BK-0046 行尾既有观察在案——
   「存量观察（非本轮引入，REPORT §4.1）：Windows 下 server.ts:61 sendFile 绝对路径
   404，建议后续立 Minor 项」。据此建 **BK-0052**（ready）并选为本轮项；同轮以
   metrics 0035 行「测试名静态字面漂移两处…留治理日」观察建 **BK-0053**（proposed，
   本轮不选，一次迭代只做一件事）。
5. **新 ID 撞号核验**：`.zcode/worktree/feat/` 下 0033~0039 全部工作树 BACKLOG 亲扫，
   最大既有 ID = BK-0051 → BK-0052/0053 未被任何并行路占用。

## 2. 问题定义（证据链）

- **症状**：本机 Windows 下后端静态托管 `GET /` 与 `GET /index.html` 返回 404
  （iterations/0038/REPORT.md §4 观察 1：最小复现 `sendFile(absPath)` → 404、
  `sendFile(rel, {root})` → 200；该轮 E2E 被迫以「本地静态 + /api 反代」同源拓扑绕开）。
- **根因**：server.ts:43-44 `ROOT` 为 resolve 后的绝对路径，:56 `WEB_INDEX` 经 path.join
  同为绝对；:61/:62 直接 `res.sendFile(WEB_INDEX)`——send 库对 Windows 绝对路径处理
  抛 NotFoundError。Linux 路径形态不受影响。
- **覆盖缺口**：smoke 只打 /api 系路由（server.ts:205-217），ui-constitution job
  （.github/workflows/ci.yml:12，windows-latest）由 pixel-gate 自托管 dist
  （gate.mjs:28，不经 apps/server），contracts job 为 ubuntu-latest——该路由在任何平台
  均无机器护栏，Windows 404 仅本地 `npm start` 可观察，而本仓主力平台即 win32。
- **影响面**：Windows 本地 `npm start` 后首页直接 404（API/SSE 等既有功能不受影响）。

## 3. 需求（REQ）

- **REQ-0052-01**：server.ts:61/:62 静态托管调用改相对路径 + `{ root: <apps/web/dist> }`
  形态；`WEB_INDEX` 存在性检查（server.ts:57-60 fatal 快速失败）语义原样保留。
- **REQ-0052-02**：行为等价承诺——Linux/CI 侧同请求维持 200、响应体不变；Windows 侧
  由 404 修复为 200，响应体即 `apps/web/dist/index.html` 构建产物原样。
- **REQ-0052-03**：smoke 补 GET / 与 /index.html → 200（text/html）断言（该路由首次
  获得机器护栏；编号沿 W 组惯例由实施轮定，若新增测试基建成本超 S 项预算可降级为
  PRD 手动 E2E 点位并在 JOURNAL 如实记载）。

**不做范围（out of scope）**：不加静态 assets 路由、不重构静态托管层、不改
index.html 内容、不触 apps/web 与 packages/shared 任何文件、不新增依赖/env。

## 4. 触UI 分类结论

**触UI = 否**。改动仅服务端路由 handler 的路径传参形态，托管对象仍是
`apps/web/dist/index.html` 构建产物（字节不变）；不触 UI 三层（视觉/DOM/交互）任何
一层。POLICY.md 自主区（「bug 修复（不触 UI、不改 shared 契约）」）。**本轮非修宪轮：
禁 `npm run gate:update`、禁 golden 重录**。

## 5. 受影响文件清单（S 项内嵌 SPEC）

| 路径 | 改动 |
| --- | --- |
| `apps/server/src/server.ts` | :61-62 两调用点绝对路径实参 → 相对路径 + `{ root: apps/web/dist }`（含必要的 root 常量派生；预期净 diff ≤6 行；:57-60 存在性检查零改动） |
| `tests/smoke/smoke-server.mjs` | 可选：+2 断言 GET /、/index.html → 200 且 Content-Type 含 text/html（REQ-0052-03） |

以上为全集——`apps/web/**`、`packages/shared/**`、`tools/pixel-gate/**`、
`tests/golden/**`、`.github/**`、`package.json`、package-lock.json 必须零 diff
（零触 UI / 零依赖的机器证明口径）。

## 6. 验收标准（Given / When / Then）

- **AC1（Windows 正路径修复）**：Given 本机（win32）web dist 构建在位，When 启动服务端
  （`npm start` 或 `npm run dev:server`）后请求 `GET /` 与 `GET /index.html`，Then 两路由
  均返回 200、Content-Type 含 text/html、响应体为 dist/index.html 原样（不再 404）。
- **AC2（等价性）**：Given 任意平台同请求，When 修复前后对比，Then 托管产物路径解析
  终点不变（同一 `apps/web/dist/index.html`）；Linux 形态行为零变化（CI contracts
  ubuntu 权威，本地以路径解析等价论证承载，如实区分亲跑与论证）。
- **AC3（回归面全绿）**：When `npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server`，Then 全绿零回退（本轮零触 apps/web/packages/shared →
  gate 为纯回归面，预期 15 场景 diffPx=0）。
- **AC4（产物缺失防护不变）**：Given web dist 缺失，When 服务端启动，Then 仍按既有
  existsSync fatal 快速失败、日志文案不变（server.ts:57-60 行为保持）。
- **AC5（改动面白名单机器证明）**：When `git diff HEAD -- apps/web packages/shared
  tools/pixel-gate tests/golden .github package.json package-lock.json`，Then 输出恒空；
  产品提交路径 ⊆ { server.ts, smoke-server.mjs }。

## 7. 风险与回退

- send 库 `{root}` 形态要求 root 存在（AC4 检查保留即满足）；若实施中发现该形态仍有
  平台陷阱，替代方案 `express.static(WEB_DIR)` 同覆盖面——属实现细节，归 BUILD 轮定夺，
  PRD 不预写解法。
- 单点小修、无状态迁移；回退即 `git revert` 产品提交，无数据面影响。

## 8. 编排结论

单轮即终轮（itemContinues=false）。BK-0053（proposed）留后续心跳 S 项轮或治理日消化，
不随本轮。来源非 issue（T3 主题存量缺陷），无 issue 回执义务。
