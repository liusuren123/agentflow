# 迭代 0047 · BUILD 日志 — BK-0056 server.ts 头注路由清单同步

> BUILD 轮产物（WORKFLOW.md §4 BUILD 契约）。S 项 skipSpec：按 PRD §4 内嵌受影响
> 文件清单与 §5 验收口径实现。工作树：`.zcode/worktree/feat/0047-iter/`（分支
> `feat/0047-iter`）。

## 改动内容（产品面恰 1 文件 3+/1-）

`apps/server/src/server.ts` 头注路由清单区（REQ-0056-01，纯插入 2 行；落位 DELETE
条目之后、capabilities 条目之前——与实注册顺序 DELETE → sessions → capabilities
一致）：

```diff
+ *  · POST /api/v1/sessions（创建）· GET /api/v1/sessions[/:id]（列表/详情）
+ *    · POST …/chat（SSE 续聊）· POST …/stop（停止）→ 持久会话五端点（迭代 0015 / BK-0016）
```

v1-only 括注（REQ-0056-02，采纳，词级替换 1 行）：

```diff
- *  （workflows/runs 为新端点，仅 v1 命名空间）；前端本阶段仍用旧路径。
+ *  （workflows/runs/sessions/capabilities 为新端点，仅 v1 命名空间）；前端本阶段仍用旧路径。
```

- PRD 锚点核对：清单区出现字面 `/api/v1/sessions`；覆盖五端点语义（创建 / 列表 /
  详情 / chat SSE 续聊 / stop 停止，并明示「五端点」）；含「迭代 0015 / BK-0016」溯源。
- 尾句「前端本阶段仍用旧路径。」逐字保留（PRD §6 不做范围）。

## 实现前亲验（BUILD 会话实读，改动前行号）

- 路由实况复核：Read `apps/server/src/server.ts:215-234` → 五端点注册在案
  （:222 `POST /api/v1/sessions`、:223 `GET /api/v1/sessions`、:224
  `GET /api/v1/sessions/:id`、:225 `POST …/chat`、:226 `POST …/stop`，行注
  「迭代 0015 / BK-0016 会话端点：仅注册 v1」）+ capabilities（:228，行注
  「迭代 0039 / BK-0049 … 仅注册 v1」），与 PRD §2 E1/E2 逐键一致。
- 术语对齐：sessions.ts:2 头注「持久会话与流式会话 API（迭代 0015 / BK-0016）」；
  措辞「持久会话」「SSE 续聊」「停止」沿用 PRD §2 与 sessions.ts 既有表述。
- 结论：改动全位于 `/* … */` 头注注释区，不参与执行；tsc 默认保留注释 →
  dist/server.js 注释同步携带属预期（PRD §7 / BK-0055 同判），运行行为零变化。

## 改动面机器证明（BUILD 会话实跑，工作树内）

- `git diff HEAD --stat -- apps/` → `apps/server/src/server.ts | 4 +++-`
  （1 file changed, 3 insertions(+), 1 deletion(-)）——恰 1 文件、行级 ≤4（AC2）。
- `git diff HEAD -- apps/`：唯一 hunk `@@ -10,10 +10,12 @@` 全部落在头注注释区；
  `+` 行含字面 `/api/v1/sessions` 与 `workflows/runs/sessions/capabilities`
  并列补全词（REQ-0056-01/02 锚点均命中，grep -c 各 1 行）。
- 零触碰白名单：`git diff HEAD -- packages apps/web tools/pixel-gate tests .github
  'package*.json'` → 输出 0 行（恒空，PRD AC5 口径）。

## 门禁与提交（按本轮派发约定不自行执行）

- `npm run build` / `npm run gate` / `npm test` / `npm run smoke:server` 与
  git 提交由脚本在本阶段之后统一执行；BUILD 会话未运行（如实记录）。
- AC3 预案（本机 s3 采样抖动）未触发判定条件——本阶段未跑 gate，留归脚本/复测轮
  （注释改动对渲染路径零因果，PRD §7）。

## 不做范围确认

- 未动括注尾句「前端本阶段仍用旧路径」（PRD §6：语义半真非硬漂移，留治理日酌定）。
- 未动 tools.ts:3 / store.ts / sessions.ts / capabilities.ts / engine.ts /
  llm.ts / agent.ts 头注（PRD §6 既定，本轮侦察均无漂移）。
- 未动 AGENTS.md（禁止区）、未动 README（BK-0051 归治理日）、未动 issue #12、
  未为头注清单新增断言（PRD §4：sessions 行为面已由 smoke G 组、capabilities
  由 CAP 组机器守护）。
- 未发现触 UI 或需扩大影响面事项：产品面改动严格落在 PRD §4 清单内，无需 blocked。
