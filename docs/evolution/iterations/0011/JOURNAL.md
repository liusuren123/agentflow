# JOURNAL · 迭代 0011 · BK-0026 golden 场景扩充实现：s4 工作流面板在线态 / s5 历史面板在线态（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 01:18
> 输入：`PRD.md`（REQ-0026-01~06 / AC1~AC6）+ `SPEC.md`（§0 health 路由补充 / §3 场景
> 定义 / §4 确定性等待 / §5 golden 新增方案 / §8 实现注意事项）。实现严格按 SPEC §1
> 白名单落点，未扩大影响面、未触及任何产品渲染路径（`apps/web/**`、`apps/server/**`、
> `packages/shared/**`、`.github/**` 零改动，`git status --porcelain` 为证）。
> **完整门禁（build / gate 两跑落 s4/s5 基线 / test）与 git 提交由脚本统一执行，
> BUILD 未自行运行**——因此本迭代 4 个新增基线文件（s4/s5 png+invariants.json）
> 在本阶段尚未落盘，将随脚本首跑 `npm run gate` 经 golden-created 通道产生。

## 1. 改动清单（与 SPEC §1 一一对应）

| 文件 | 改动 | 内容 |
| --- | --- | --- |
| `tools/pixel-gate/gate.mjs` | 修改，147 → 225 行（SPEC 预估 ≤240 ✓，远低于 400 上限） | ① 头注 4→6 场景说明；② s4/s5 场景基建块：`HEALTH_FIXTURE` + `WF_ROUTES` + `RUN_ROUTES`（三路由/场景，fixture 字面量逐字符照抄 SPEC §3.2）+ `wfReady`/`runReady`（waitForFunction 卡片数=3）+ `wfInv`/`runInv`（SPEC §3.4 三键）；③ SCENARIOS 追加 s4/s5 两行（s0~s3 四行零字节改动）；④ `runScenario` 四处增强：newPage 条件并入 `timezoneId`、goto 前 `for (const r of sc.routes || [])` 注册路由、steps 后 `if (sc.ready) await sc.ready(page)`、不变量改「公共六键 page.evaluate 原样展开 + per-scenario inv 展开」合并 |
| `docs/adr/0009-golden-s4-s5-online-panels.md` | 修改（仅 2 处） | REQ-0026-04 原文：状态行「草案 · 待用户批准（批准前零实现）」→「已批准（issue#7 用户批复 2026-10-23T15:48:48Z，PLAN 0011 会话 gh 亲核）· 实现于迭代 0011」；显著声明块改已批准口径（golden-created 通道新增、s0~s3 冻结、gate:update 非入口）。§1~§8 正文零改动 |
| `tests/golden/ui/` s4/s5 4 文件 | **待脚本产生** | golden-created 通道（gate.mjs:192-196 既有逻辑）：基线不存在时首跑自动落盘记 `golden-created`；本阶段不预写、不手造 |
| `docs/evolution/STATE.md` | phase SPEC → BUILD | 阶段契约更新（last_result 同步 BUILD 结论） |

产品代码/CI/既有基线零触及：`git status --porcelain` 输出恰为
`M docs/adr/0009-*` / `M docs/evolution/BACKLOG.md`（PLAN 阶段落盘，非本轮）/
`M docs/evolution/STATE.md` / `M tools/pixel-gate/gate.mjs` /
`?? docs/evolution/iterations/0011/`——`apps/web|server/**`、`packages/shared/**`、
`.github/**`、`tests/golden/ui/` 既有 8 文件均不在其中（AC2/AC4 前置满足）。

## 2. SPEC 事实核验（实现前逐条复核，2026-10-24 01:0x 本会话）

- probe 走 `/api` 旧别名 `fetch('/api/health')`（`apps/web/src/legacy/app.js:2041`，
  AbortSignal 2500ms）→ `ENGINE.online=true`（:2044），启动早期打开的面板由 :2056
  重刷——SPEC §0 三路由结论成立，`**/api/health` 拦截必须存在，否则快照到离线分支。
- `provider.models` 非空时 `DEFS.llm.params[0].o` 被写并可能 `renderProps()`
  （app.js:2047-2052）——HEALTH_FIXTURE `models: []` 跳过该分支，消除副作用；
  probe 的 `addLog`（app.js:2046）只写 `#log-body`（本会话读 addLog 实现 :1838-1847
  确认无面板外可见副作用），normalize 已闭底板，无像素影响。
- 服务端工作流卡 `.wf-item[data-wf-id]`（app.js:397，paintServerWfGroup）与运行卡
  `.run-item[data-run-id]`（app.js:583，paintServerRuns）选择器属实；本地条目
  `.wf-item[data-i]`（:366）与离线 `.run-item`（:556，无 data-run-id）不会混入计数。
- 响应形状：`{workflows:[...]}` / `{runs:[...]}`（server.ts:145/163 res.json；
  server-sync.js:23/32 解包），`WorkflowSummary{id,name,updated_at}`（store.ts:38）、
  `RunRow{id,workflow_name,status,started_at,ended_ms,done,total}`（store.ts:29-37）、
  health `{ok,engine,node,provider}`（server.ts:64-65）——fixture 字段与真实实现对齐。
- `fmtTs` 本地时区格式化（server-sync.js:71-76）与 `runCardMeta` 三态映射
  （server-sync.js:124-131：done→ok / error→stop / running→stop）属实；
  1767225600000=2026-01-01T00:00:00.000Z，UTC 下渲染 `1/1 00:00:00` 确定性成立。
- boot 除 probe 外无 fetch（app.js:2414 IIFE；refresh* 仅随面板打开触发
  app.js:384/569）——s0~s3 不注册路由，probe 照旧 404→离线态，与既有基线一致。

## 3. 与 SPEC 的偏差记录（2 处，均为实现级修正，零语义偏差）

1. **`waitForFunction` 调用签名**：SPEC §4 代码块写作
   `page.waitForFunction(fn, { timeout, polling })`。核实本仓 Playwright 1.64.1
   类型签名 `waitForFunction(pageFunction[, arg, options])`
   （node_modules/playwright-core/types/types.d.ts:663/702；client 实现按位置参数
   取 `arg2`、仅第三参数进 options）——按 SPEC 写法 options 会被当 `arg` 传入而
   丢弃（超时退回默认、polling 退回 raf）。落地为三参形式
   `page.waitForFunction(fn, undefined, { timeout: 10000, polling: 100 })`，
   语义与 SPEC 意图（10s 上界 + 100ms 轮询）一致。
2. **fixture 常量排版**：SPEC §3.2 的对象字面量按本仓既有紧凑风格微调换行对齐
   （多字段 RunRow 每行一条记录），键名、值、顺序逐字符一致，无任何数据差异。

## 4. 自检（BUILD 内执行；完整门禁 build/gate/test 由脚本统一执行，未自行运行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| gate.mjs 语法 | `node --check tools/pixel-gate/gate.mjs` | `syntax OK`，225 行 |
| glob 字面量入注安全 | 编辑中曾把 runs 路由 glob 写进块注释，`*/` 序列提前闭合注释导致 `node --check` 报 `Unexpected identifier`（:119）——最小重现定位后改写注释措辞，复查 `grep '\*\*'` 全部命中均在字符串字面量或行尾注释终结符 | 过（见 §5 教训） |
| s0~s3 等价性走查 | 逐行比对 `git diff tools/pixel-gate/gate.mjs` | s0~s3 场景行零改动；runScenario 四处增强在无 routes/timezoneId/ready/inv 字段时路径与原实现逐字节等价（`newPage({viewport})` 同形状、空循环、条件跳过、`{...(公共六键), ...({})}` 键序不变）——既有 8 基线不受影响的代码级论证 |
| ADR 批复标注（AC5 目标） | `grep -n "已批准\|issue#7\|2026-10-23T15:48:48Z" docs/adr/0009-*.md` | :3 状态行三要素齐（已批准 + issue#7 + 时间戳）；:11-13 显著声明已批准口径 |
| 改动面白名单（AC4 前置） | `git status --porcelain` + `git diff --stat` | 产品路径恰为 SPEC §1 的 gate.mjs + ADR-0009；`apps/**`、`packages/**`、`.github/**`、`tests/golden/ui/` 既有文件零触及 |
| Playwright 能力面 | `page.route`/`timezoneId`/`route.fulfill({json})` 均为既有 1.64.1 能力（coreBundle.js 内建），无新依赖 | 过；`package.json` 零改动 |

## 5. 过程教训（记入本 JOURNAL，供后续轮次引用）

- **glob pattern 严禁原样写入 `/* */` 块注释**：`**/api/v1/runs**` 中的 `*/` 字符
  序列会提前终结块注释，其后代码全部裸奔、报错位置远离病灶（报在 :119 模板串，
  病灶在 :82 注释）。定位手段：最小重现排除法（同构造独立文件 syntax OK → 病灶
  必在注释/字符串）。
- SPEC 代码块是设计意图的载体，非可直接粘贴的最终代码：调用签名（本次
  waitForFunction）与排版需按实际依赖版本与仓内风格落地，偏差如实记录于 §3。

## 6. 交接给脚本/VERIFY 的执行清单（SPEC §6 口径，BUILD 未执行）

1. `npm run build` → 首跑 `npm run gate`（预期 s0~s3 `pass diffPx=0`、s4/s5
   `golden-created` 落 4 基线文件）→ 二跑 `npm run gate`（预期 6 场景全
   `pass diffPx=0`）→ `npm test`（8/8）。
2. 落盘后核对 s4/s5 invariants.json：`serverWf` ===
   `['wf-alpha-001','wf-beta-002','wf-gamma-003']`、`serverRuns` ===
   `['run-done-001:ok','run-error-002:stop','run-live-003:stop']`（SPEC §4 双保险）。
3. AC3 反演（VERIFY）：临时置空 s4 fixture workflows → gate → s4 FAIL → 还原复绿；
   反演改动不入产品提交。
4. 产品提交建议（SPEC §8.6）：`feat(gate): golden 场景扩充 s4/s5 在线态面板（ADR-0009 已批准，issue#7）`。
5. 推送后盯 CI ui-constitution（windows-latest）6 场景（AC6，golden 权威在 CI）。
