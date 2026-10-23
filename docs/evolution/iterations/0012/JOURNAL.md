# JOURNAL · 迭代 0012 · BK-0025 CI 补 SIGTERM 优雅停机断言（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 02:15
> 输入：`PRD.md`（REQ-0025-01~06 / AC1~AC6；S 项免 SPEC，受影响文件清单内嵌 PRD
> §S 项免 SPEC 节）。实现严格按该清单落点，未扩大影响面、未触及 UI（`apps/web/**`、
> `packages/shared/**`、`apps/server/src/**`、`tools/pixel-gate/**`、`tests/golden/**`
> 零字节改动，git status 为证）。完整门禁（build/gate/test/smoke:server）与 git 提交
> 由脚本统一执行，BUILD 未自行运行。

## 1. 改动清单（3 文件，与 PRD §S 项免 SPEC 表一一对应）

| 文件 | 净改动（实得 git diff） | 改动内容 |
| --- | --- | --- |
| `tests/smoke/shutdown-sigterm.mjs` | 新增 185 行（≤400 ✓，预估 ~100 略超——注释密度沿 smoke 先例） | REQ-0025-01/02/06：win32 首行 SKIP（原因 + 权威路径说明 + exit 0）；P01/P02 前置（缺产物 FAIL + 可操作报错，不静默跳过，先例 mcp-stubs M01）；H01 spawn `process.execPath` + `shell:false` + env 注入 `PORT=3901`（`config.ts:17-24` .env 不覆盖已有键）+ `/api/v1/health` 轮询就绪（250ms 间隔 / 10s 上限 / 提前退出即 FAIL 附输出尾）；T01-T04 断言（`C.check` 全记录不 fail-fast）：T01 stdout 先后「优雅停机开始」（`signal==='SIGTERM'`）与「优雅停机完成」、T02 close 事件 code===0、T03 net.connect 探针 ECONNREFUSED、T04 无「强制退出」warn；`process.kill(child.pid,'SIGTERM')` 按 PRD 字面；以 close 事件 + 端口探针为门不猜时序 sleep；硬超时 30s（SIGKILL + exit 1）；finally 进程卫生（SIGTERM→3s→SIGKILL，沿 smoke-server C04 时序）；复用 `./lib.mjs` 的 `Checker/SmokeFailError/sleep`（mcp-stubs 同先例，lib.mjs 零改动） |
| `package.json` | +1 行（PRD 预估一致） | REQ-0025-03：`"smoke:shutdown": "node tests/smoke/shutdown-sigterm.mjs"`，紧随 `smoke:server` 行（先例 `package.json:19`） |
| `.github/workflows/ci.yml` | +5 行（3 注释 + 2 step；PRD 预估 +2 step——step 数恰 2） | REQ-0025-04：contracts job `npm test` 后追加两 step：`npm run build && npm run build:server` + `npm run smoke:shutdown`。**第一步内容与 PRD 示例文本有偏差（见 §2 偏差 1）**；ui-constitution job 零改动 |

产品净改动合计 +191/−0（新脚本 185 + package.json 1 + ci.yml 5）。

## 2. 与 PRD 的偏差记录（1 处，实现级必要调整，无断言口径变化）

1. **CI build step 为 `npm run build && npm run build:server`（PRD 示例文本仅
   `npm run build:server`）**：PRD §背景 4 断言可行性只核了 PORT 注入
   （config.ts:90）与日志流，漏了 server 启动硬依赖——`apps/server/src/server.ts:52-56`
   对 `apps/web/dist/index.html` 做 `existsSync` 检查，缺失即 `logger.fatal` +
   `process.exit(1)`（本会话 Read 核实）。CI contracts job 既有序列
   `npm ci + npm test`（`package.json:18`：test 仅 build:shared+build:server）
   **不产出 apps/web/dist**——若按 PRD 字面只加 build:server，spawn 的 server
   会在 listen 前 fatal 退出，断言恒 FAIL。处置：同一步内补 `npm run build`
   （shared+web），step 数仍恰 2（REQ-0025-05「+2 step」字面保持），影响文件
   仍只 ci.yml 一处，断言三要素口径零变化（属 PRD §依赖与风险 预期的
   「BUILD 实测调整、断言口径不变」类实现级修正，先例 0009 JOURNAL §2）。
   代价：contracts job 增一次 vite 构建（约 +20~40s，PRD 风险 4 的量级评估
   由「可忽略」修正为「秒级到数十秒级」，不触及 required check）。

## 3. 自检（BUILD 内执行；完整门禁 build/gate/test/smoke:server 由脚本统一执行，未自行运行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 脚本语法 | `node --check tests/smoke/shutdown-sigterm.mjs` | `SYNTAX_OK`（退出码 0） |
| **AC3 本机实跑（win32 SKIP 路径）** | `npm run smoke:shutdown` | 输出 3 行：`SKIP smoke:shutdown：Windows 跨进程信号模拟限制——SIGTERM 经 TerminateProcess 投递` / `process.on("SIGTERM") 停机 handler 不触发（周报 W43 观察 O4）…` / `权威断言路径：CI ubuntu-latest…`；`EXIT_CODE=0`。无任何断言 PASS 伪造输出 ✓ |
| **PRD 风险 1 实测（pino 输出流）** | spawn `node --input-type=module -e "await import(dist/logger.js)"` 逐流捕获（logger 打「优雅停机开始/强制退出/优雅停机完成」三行） | `STDOUT_BYTES=380 STDERR_BYTES=0`——pino（`logger.ts:10` 无 destination）确认写 **stdout**，PRD 按默认记载成立，脚本读 stdout 管道正确无需调整；同时验证 JSON 单行 `msg` 中文不转义、`signal`/`activeRuns` 字段在「优雅停机开始」行、按行 `JSON.parse` 方案 PARSE_OK（T01/T04 解析路径实测可行） |
| 改动面白名单（AC5 前置核对，只读 git） | `git status --porcelain` + `git diff --stat` | 产品路径恰为白名单三处：`tests/smoke/shutdown-sigterm.mjs`（??）、`package.json`（+1）、`.github/workflows/ci.yml`（+5）；另有进化过程文件 `docs/evolution/STATE.md`（PLAN 阶段既有未提交改动 + 本轮 phase/updated 两行）与 `docs/evolution/iterations/0012/`（PRD+本 JOURNAL，归档提交物料）——按仓库惯例不入产品提交。`apps/web/**`、`packages/shared/**`、`apps/server/src/**`、`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/{lib,smoke-server,mcp-stubs}.mjs` 零触及 |
| 行数规模 | `wc -l tests/smoke/shutdown-sigterm.mjs` | 185 ≤ 400 ✓ |

**未运行**（本机 Windows 无法运行权威路径，AC1/AC2 的 PASS/FAIL 路径以 AC4 CI
ubuntu-latest 为权威——O4 原设计意图，PRD §S 项免 SPEC 验收命令口径同）：
`npm run smoke:shutdown` 的 T01-T04 断言路径；AC2 反演演练（注释
`server.ts:233` 重建重跑）。**未运行**（属脚本统一门禁序列）：`npm run build` /
`npm run gate` / `npm test` / `npm run smoke:server` / git 提交。

## 4. 断言口径（VERIFY 引用）

- 断言 id：**P01 / P02 / H01 / T01 / T02 / T03 / T04**（7 条；P/H 用 `C.ok`/`C.fail`
  fail-fast，T01-T04 用 `C.check` 全记录）；汇总行
  `==== smoke:shutdown：X passed / Y failed ====`，退出码 `failed===0 ? 0 : 1`。
- AC1（CI 权威 PASS）：H01+T01+T02+T03（+T04 附带）全 PASS，exit 0。
- AC2（反演非恒真）：临时注释 `server.ts:233` SIGTERM 注册 → 重建 → 重跑——
  子进程被默认 SIGTERM 终止（无 handler）：无停机日志（T01 FAIL）、close 事件
  signal='SIGTERM' code=null（T02 FAIL）至少一项触发，exit ≠ 0。本机 Windows
  不可演练（PRD 风险 2）：VERIFY 可采等价反演（篡改脚本预期日志串 → 自 FAIL），
  在 REPORT 如实记载反演方式。
- AC3（win32 SKIP）：本 JOURNAL §3 已本机实测通过。
- AC4（CI 生效）：推送后 contracts job 含 build+build:server+smoke:shutdown
  并绿（CI 权威）。
- 残余环境风险（供 VERIFY/CI 观察）：contracts job 的 `npm ci` 需成功编译
  better-sqlite3 原生模块（server 启动即 import store）——npm 默认执行 install
  脚本 + better-sqlite3 v12 对 linux-x64/node22 有 prebuilt（prebuild-install），
  判定可满足；若 CI 实测失败，失败面在环境而非断言，另立 BUG 项处理（沿 PRD
  非目标「不顺手修」）。

## 5. 触 UI 与影响面声明

- 触 UI = **否**，与 PRD 结论一致：全部改动为新增测试脚本 + package.json 脚本行 +
  CI workflow step；`apps/web/**` 与 `packages/shared/**` 零字节改动，SSE 事件
  契约零接触，`npm run gate` 预期零影响（AC5 回归由脚本门禁证明）。
- 非修宪轮：无 UI/golden 变更，未运行也未需要 `npm run gate:update`。
- 授权链：CI 变更（POLICY 需批准区）由 issue#8 用户 OWNER 本人批复承载
  （2026-10-23T15:48:25Z，PRD §背景 5 在档）。
- STATE.md 已按派发指令更新：`phase: PLAN → BUILD`，`updated: 2026-10-24 02:12`。
