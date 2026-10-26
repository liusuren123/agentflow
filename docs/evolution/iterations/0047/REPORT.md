# 迭代 0047 · 验收报告 — BK-0056 server.ts 头注路由清单同步

> VERIFY 轮产物（WORKFLOW.md §4 VERIFY 契约）。验收环境：隔离工作树
> `.zcode/worktree/feat/0047-iter/`（分支 `feat/0047-iter`，基点 HEAD=c6c0311，
> 本会话 `git status` 亲核：产品改动未提交，`M apps/server/src/server.ts`）。
> S 项免 SPEC：验收口径 = PRD.md §5（AC1–AC5）+ §3（REQ 锚点）+ §4（零触碰清单）。
> Node v24.21.0 / win32 / Git Bash；会话时间 2026-10-26 09:5x–10:12。

## 结论：**PASS**（零 BUG；1 条环境侧观察 OBS-0047-01，非产品缺陷）

改动 = `apps/server/src/server.ts` 头注注释区纯改动（sessions 五端点行纯插入
+ v1-only 括注词级补全），产品面 diff 恰 1 文件 3+/1-，全部位于 `/* … */`
注释块内（新文件行 13/14/18，均在 :1-22 区间），零代码行变化、零运行时因果；
PRD 两 REQ 锚点全部命中；后端回归面（smoke 133/0 ×2 次实跑、G01–G10 全 PASS）
与活体抽查全绿。派发指令明示 build/gate/test 已由脚本在工作树内跑过并通过，
本会话按指令未复跑全套（下文逐项如实标注实跑/采纳）。

## AC 逐条核验（命令 + 输出摘要均为本会话在工作树内实跑）

### AC1（正路径：构建 + 契约测试）— 通过（采纳脚本结果 + 间接证据，本会话未复跑）

- 派发指令明示：build/gate/test 已由脚本在工作树内运行且通过，VERIFY 不重复
  全套（如实记录：此三项非本会话实跑）。
- 间接证据（本会话实查）：`grep -n "持久会话五端点" apps/server/dist/server.js`
  → 命中 `14: *    · POST …/chat（SSE 续聊）· POST …/stop（停止）→ 持久会话五端点
  （迭代 0015 / BK-0016）`——dist 携带新注释，证明脚本在源码改动**之后**执行过
  build（tsc 默认保留注释，PRD §7 预测成立）；且 dist:38 `import {
  capabilitiesHandler } …`、dist:240 `app.get('/api/v1/capabilities',
  capabilitiesHandler)` 注册齐全，tsc 产物完整。
- dist 可运行性由本会话两次活体启动证实（见「针对性 E2E」），等价覆盖
  「tsc 对 server.ts 无错」的可运行维度。

### AC2（改动面机器证明）— 通过

实跑 `git diff HEAD --stat -- apps/`：

```
 apps/server/src/server.ts | 4 +++-
 1 file changed, 3 insertions(+), 1 deletion(-)
```

实跑 `git diff HEAD -- apps/`：唯一 hunk `@@ -10,10 +10,12 @@`，逐行核对——

- 新文件行 13–14 纯插入 sessions 端点族行（落位 DELETE 行后、capabilities 行前，
  与实注册顺序 :222→:224-228→:230 一致）；行 18 为 v1-only 括注词级替换；
  **全部改动行均为 ` * ` 注释行**，注释块 `/* … */` 跨 :1-25，改动行 13/14/18
  均在 AC2 要求的 :1-22 区间内。
- REQ-0056-01 锚点：diff 含字面 `/api/v1/sessions`（+行两处）；五端点语义齐
  （创建/列表/详情/chat SSE 续聊/stop 停止，明示「五端点」）；含溯源
  「迭代 0015 / BK-0016」。
- REQ-0056-02 锚点：+行含 `workflows/runs/sessions/capabilities 为新端点，仅 v1
  命名空间`——sessions 与 capabilities 并列补全命中。
- 行级 3+/1- = 4 ≤ 4 ✓；尾句「前端本阶段仍用旧路径。」逐字保留（PRD §6
  不做范围未越界）。
- 注释与实况一致性（本会话亲读 server.ts:223-230）：五端点注册
  POST/GET/GET:id/POST chat/POST stop 与头注新行逐键对应，无虚列。

### AC3（门禁红预案）— 未触发（预案备而未用）

gate 由脚本首跑即绿（派发指令明示，非本会话实跑），s3 抖动预案判定条件
「首跑仅 s3 红」未成立。零因果佐证（本会话实跑）：
`grep -rn "持久会话五端点\|workflows/runs/sessions/capabilities" apps/web
tools/pixel-gate` → 零命中（exit=1）——渲染路径对 server.ts 注释零引用，
注释改动对 gate 无因果通路。

### AC4（回归面）— 通过

- `npm run smoke:server`（本会话在工作树内实跑 **2 次**）：
  - 第 1 次：`==== smoke:server：133 passed / 0 failed ====`
  - 第 2 次（过滤 G 组留证）：G01–G10 逐条 PASS（sessions 五端点行为面：
    创建 201/列表倒序+limit 校验/详情 404 容错/无活动 turn stop 404/chat
    SSE 事件序/续聊上下文/停止收尾/并发 409/错误路径/RunEventSchema 校验），
    总计 `==== smoke:server：133 passed / 0 failed ====`
  - = 0045/0046 基线 133/0，零回退；G 组原样通过即「注释对 server 运行时
    零因果」的行为面证明。
- build/gate/npm test：派发指令明示已由脚本跑过并通过（非本会话实跑，如实标注）。

### AC5（禁区白名单）— 通过

实跑 `git diff HEAD -- packages apps/web tools/pixel-gate tests .github
package*.json` → **输出 0 行（恒空）**；实跑 `git diff HEAD --stat -- apps/`
→ 仅 `apps/server/src/server.ts` 1 文件。零触碰清单（PRD §4：shared/web/
pixel-gate/golden/smoke/.github/package*.json/ADR/server.ts 以外源文件）
全部未被触及。

## 针对性 E2E 与交互回归抽查（test-manager 职责，本会话实跑）

**UI 交互回归清单**（拖拽/缩放/连线等）：本轮不适用——AC5 机器证明 `apps/web`
零 diff + AC3 grep 证明渲染路径对新注释零引用，产品改动无前端足迹，UI 交互
回归为空集（如实记录：未执行 UI 交互清单，因无可回归对象）。

**后端活体抽查**（交互回归在后端平面的等价物）：

1. 首次抽查（默认端口 3000，`node apps/server/dist/server.js`）：health 与
   sessions 列表 JSON 正常，但 `/api/v1/capabilities` 返回 Express 默认 404
   （`Cannot GET /api/v1/capabilities`）→ 触发排查，见 OBS-0047-01。
2. 干净复测（`PORT=3999 node dist/server.js`，工作树 dist + 工作树
   `data/agentflow.db`，boot log 亲核）：
   - `GET :3999/api/v1/health` → `{"ok":true,"engine":"agentflow-server",…}`
   - `GET :3999/api/v1/sessions?limit=2` → sessions JSON（含本会话 smoke
     刚建的 fixture）
   - `GET :3999/api/v1/capabilities` → 能力清单 JSON（mcp.builtin filesystem
     工具族等）——**首次 404 确证为陈旧进程碰撞，非产品缺陷**
   - `GET :3999/api/capabilities`（旧别名）→ **HTTP 404**——头注补全词
     「sessions/capabilities … 仅 v1 命名空间」的活体佐证
   - v1-only 静态复核：`grep -n "'/api/sessions\|'/api/capabilities"
     apps/server/src/server.ts` → 零命中（exit=1），源内无旧别名注册
   - 抽查后 server 进程已终止（taskkill 成功回执）

## REQ 锚点核对汇总

| REQ | PRD 锚点 | 证据 | 判定 |
| --- | --- | --- | --- |
| REQ-0056-01 | 清单区字面 `/api/v1/sessions` + 五端点语义 + BK-0016/迭代 0015 溯源 | server.ts:13-14（本会话 Read + diff +行） | ✅ |
| REQ-0056-02 | v1-only 括注 sessions/capabilities 并列 | server.ts:18（diff 词级替换） | ✅ |
| 非功能 | 恰 1 文件、≤4 行级、tsc 成功、运行零变化 | diff --stat 3+/1-；dist:14 注释同步；smoke 133/0 ×2 | ✅ |

## 观察与缺陷清单

- **BUG：无。**
- **OBS-0047-01（环境侧，非产品缺陷，无需本轮动作）**：本机端口 3000 被
  陈旧进程 **pid 26324**（`node dist/server.js`，创建于 2026-10-26 01:14:07，
  PowerShell Get-CimInstance 亲核）长期占用——其 dist 早于迭代 0039
  （capabilities 落地），故对 `/api/v1/capabilities` 404 而对 sessions 正常。
  Windows 下 SO_REUSEADDR 允许双进程绑定同端口，致首次抽查的 curl 被路由到
  陈旧进程。影响：仅干扰本地手工验证，不影响 CI/门禁/产品。建议：该进程
  非本迭代产物、来源在并行会话射程内，测试经理不越权处置（kill 属破坏性
  操作且进程非本轮所启）；留待用户或下一会话酌情清理。
- OBS-0047-02（无需后续动作）：PRD §6 已留档的头注:18 尾句「前端本阶段仍用
  旧路径」语义半真问题维持不动（legacy 主链确仍用旧路径，本轮抽查亦见
  worktree 内旧别名路由正常服务），措辞重写归治理日，本轮零接触。

## 本会话实跑命令清单（均在工作树 `.zcode/worktree/feat/0047-iter/` 内）

1. `git status --short` / `git log --oneline -5` / `git branch --show-current`
2. `git diff HEAD --stat -- apps/`
3. `git diff HEAD -- apps/`
4. `git diff HEAD -- packages apps/web tools/pixel-gate tests .github package*.json`
5. `grep -n "'/api/sessions\|'/api/capabilities" apps/server/src/server.ts`（0 命中）
6. `grep -rn "持久会话五端点\|workflows/runs/sessions/capabilities" apps/web tools/pixel-gate`（0 命中）
7. `grep -n "持久会话五端点" apps/server/dist/server.js`（命中 :14）
8. `npm run smoke:server`（×2，均 133 passed / 0 failed；第 2 次过滤出 G01–G10 全 PASS）
9. `node apps/server/dist/server.js`（:3000 抽查，触发 OBS-0047-01 排查）
10. `PORT=3999 node dist/server.js` + curl health/sessions/capabilities//api/capabilities（干净复测全过，进程已终止）
11. `netstat -ano | grep ":3000"` / `Get-CimInstance Win32_Process -Filter 'ProcessId=26324'`（陈旧进程取证）
