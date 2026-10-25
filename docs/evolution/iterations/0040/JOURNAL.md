# JOURNAL · 迭代 0040 · BUILD 轮

> 执行角色：code-developer。输入：PRD.md（S 项免 SPEC，受影响文件清单 §5 内嵌）。
> 环境：工作树 `.zcode/worktree/feat/0040-iter`（分支 feat/0040-iter）；全程带工作树前缀读写。
> 时间：2026-10-26 02:51–02:58（PLAN 落盘 02:51 之后开工，02:58 BUILD 收口）。

## 实施落点（PRD §5 白名单全集）

1. **`apps/server/src/server.ts`**（REQ-0052-01，净改动 6 行：注释 +3、`WEB_DIR`
   常量 +1、两调用点改形 ±2）：
   - `WEB_DIR = path.join(ROOT, 'apps', 'web', 'dist')` 新常量；
     `WEB_INDEX = path.join(WEB_DIR, 'index.html')` 派生不变（终值仍
     `<repo>/apps/web/dist/index.html`，与改前逐字同值）。
   - `:57-60` 存在性检查 fatal 块**零改动**（日志文案、`process.exit(1)` 原样，AC4）。
   - 两调用点 `res.sendFile(WEB_INDEX)` → `res.sendFile('index.html', { root: WEB_DIR })`。
   - 注释块补 3 行说明形态变更动机（迭代 0040 / BK-0052 锚）。
2. **`tests/smoke/smoke-server.mjs`**（REQ-0052-03，纯插入 +19 行）：W07 后新增
   W08/W09 断言块——`GET /` 与 `GET /index.html` → 200、Content-Type 含
   text/html、响应体与 `apps/web/dist/index.html`（readFileSync 基准）逐字相等。
   该路由**首次获得机器护栏**。实现细节：`fetch` 直连（`api()` 不透出响应头，
   沿 chatSse 直连前例）；触达通道按本轮 PRD 明示扩至静态路由（非 /api/v1/*），
   lib.mjs 边界注释不动（lib.mjs 不在白名单，零 diff）。

## 因果反证（同版本依赖下新旧形态对照，win32 实跑）

临时脚本（系统临时目录，已删，不入库）以本仓 node_modules 的同版本
express/send 起 miniserver，同一 dist 文件两种实参形态各挂一路由：

```
/abs -> 404 text/html; charset=utf-8 | body 1178 chars   ← 旧形态（绝对路径实参）
/rel -> 200 text/html; charset=utf-8 | body 361257 chars ← 新形态（相对 + {root}）
NotFoundError: Not Found at send\index.js:861（旧形态 stack，与 PRD §2 根因一致）
```

即：缺陷真实存在于本机平台/依赖版本，本次修法精确消除之，非环境巧合。

## 自测（全部在工作树根实跑；完整门禁 build/gate/test 由脚本统一执行）

| 命令 | 结果 | 关键输出 |
| --- | --- | --- |
| `node --check tests/smoke/smoke-server.mjs` | ✅ | 语法通过 |
| `npm run build:server` | ✅ | tsc exit 0（`{root}` 形态类型正确） |
| 定向 E2E（临时脚本起 dist/server.js 实例） | ✅ | `GET / → 200 text/html; charset=utf-8 · body 361257 字符 · 与 dist 逐字相等=true`；`GET /index.html` 同；`/api/v1/health → 200 ok:true`（API 面零波及） |
| `npm run smoke:server` | ✅ | `==== smoke:server：128 passed / 0 failed ====`；W08/W09 逐条 PASS |

- **AC2 等价性（论证部分，非亲跑）**：改前 `WEB_INDEX = path.join(ROOT,…,'index.html')`
  与改后 `path.join(WEB_DIR,'index.html')` 逐字同值（join 结合律）；send 库
  `{root}` 形态下 `root + 相对路径` 的解析终点即同一绝对路径，Linux 侧无
  盘符冒号问题、行为不变。ubuntu contracts 权威面由 CI 承载（本轮未改任何
  CI 触达路径）。Windows 侧为亲跑实证（上表 E2E + 冒烟）。
- **AC5 白名单**：本轮产品 diff 仅 `server.ts` + `smoke-server.mjs` 两文件；
  apps/web / packages/shared / tools/pixel-gate / tests/golden / .github /
  package.json / package-lock.json 零触碰（`git status` 亲核，见下）。

## 遗留与边界

- 无遗留；PRD「不做范围」全守（未加 assets 路由、未动 index.html、零新依赖）。
- smoke 本轮新增恰 2 条断言（W08/W09），全量 128 passed / 0 failed；改前基线
  计数未单独实跑（本会话首跑即含新增断言），126 为 128−2 推算值，仅参考。
  AGENTS.md「现 84 断言」字样为存量陈旧描述（多轮未随更），本轮不改 AGENTS.md
  （不在白名单）。
