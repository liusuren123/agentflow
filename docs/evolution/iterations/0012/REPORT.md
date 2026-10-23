# REPORT · 迭代 0012 · BK-0025 CI 补 SIGTERM 优雅停机断言（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 02:21
> 输入：`PRD.md` AC1~AC6（S 项，验收口径内嵌 PRD）+ `JOURNAL.md` §4 断言口径。
> 环境：Windows 10.0.26300（win32）· Node v24.21.0 · Git Bash · 仓库根。
> 前置声明：`npm run build` / `npm run gate`（6 场景）/ `npm test` 由工作流脚本统一
> 运行且通过（派发指令明示，本轮不重复）；VERIFY 实跑的针对性 E2E 为
> `npm run smoke:shutdown`（AC3 + 反演）、`npm run smoke:server`、`npm run test:canvas`。

> **结论：PASS**（AC2/AC3/AC5/AC6 本会话实跑全过；AC1 的 PASS 路径与 AC4 的
> 「CI 绿」属 CI 权威路径，**未到执行时点，不判过、不判挂**——产品提交与推送
> 在 VERIFY 之后由脚本执行，沿 0011 REPORT AC6 先例口径）。BUG 清单：空。

## 验收结论总表

| # | 验收项 | 结论 | 证据（本会话实跑/实读，详见对应节） |
| --- | --- | --- | --- |
| AC1 | 停机断言通过（CI 权威路径） | **未到执行时点**（本机 win32 前置不满足；权威=CI ubuntu-latest，未推送） | 结构性证据链完整（§AC1）；H01/T03/T04 于反演实跑中 PASS；T01/T02 PASS 分支只能由真实优雅停机产生 |
| AC2 | 断言保护力反演（非恒真） | **PASS**（等价反演，方式如实记载） | 临时副本（唯一篡改=win32 guard→`if(false)`）实跑：T01 FAIL（无停机日志）+ T02 FAIL（code=1）→ `EXIT_CODE=1`；还原复绿 exit 0、git 零残留 |
| AC3 | Windows 如实降级 | **PASS** | `npm run smoke:shutdown` → SKIP 3 行（含原因+权威路径）+ `EXIT_CODE=0`，无伪造断言输出 |
| AC4 | CI 生效 | **挂接 PASS / CI 绿未到执行时点** | `ci.yml:45-46` contracts job 两 step 在位（实读 diff）；ui-constitution job 零改动；本地 ahead 36、`gh run list` 无新 run（改动未推送） |
| AC5 | 改动面与回归 | **PASS** | git diff 产品路径恰白名单三处（+191/−0）；gate/test=脚本门禁已绿（不重复）；`smoke:server` **50/50**、`test:canvas` **15/15**（本会话实跑） |
| AC6 | 授权链在档 | **PASS** | PRD §背景 5 在档；`gh issue view 8` 亲核：liusuren123「批准」2026-10-23T15:48:25Z（无 🤖 前缀） |

## AC1 · 停机断言通过（CI 权威路径）— 未到执行时点（结构性证据完整）

PRD AC1 的 Given 为「非 Windows 环境」——本机 `win32` 前置即不满足（SKIP 分支
`shutdown-sigterm.mjs:43-48`），PASS 路径权威在 CI ubuntu-latest（PRD §S 项免 SPEC
验收命令口径、JOURNAL §3 同）。当前产品提交未发生（§AC4），CI 无运行记录。

VERIFY 完成的**结构性核实**（证明 PASS 路径的每个环节在位、口径正确）：

1. **断言实现与停机实现逐项对应**（本会话 Read 核实）：
   `server.ts:216` `logger.info({signal, activeRuns}, '优雅停机开始')` ↔ T01
   （`shutdown-sigterm.mjs:140-146` 匹配 msg + `signal==='SIGTERM'`）；
   `server.ts:228` `'优雅停机完成'` ↔ T01 完成行序；`server.ts:230` `process.exit(0)`
   ↔ T02（`close` 事件 code===0，:147-149）；`server.ts:217` `server.close()` ↔ T03
   （net.connect 探针 ECONNREFUSED，:150-153）；`server.ts:226` 强制退出 warn ↔ T04
   （:154-157）。
2. **日志流口径**：`logger.ts:10` pino 无 destination → 默认 stdout（实读）；JOURNAL
   §3 BUILD 实测 `STDOUT_BYTES=380 / STDERR_BYTES=0` 且 `signal`/`activeRuns` 字段、
   中文 msg 不转义、逐行 `JSON.parse` 可行——脚本读 stdout 管道正确。
3. **运行时旁证**：本会话反演演练（§AC2）中 H01（`/api/v1/health` 200 就绪）、
   T03（端口释放）、T04（无强制退出）三条断言在真实 spawn 的 server 上 **PASS**——
   起进程、健康探针、探针工具链均为实测可用；T01/T02 的 FAIL 分支亦实测有效。
   T01/T02 的 PASS 分支只能由「handler 触发 + 日志出现 + exit(0)」的真实优雅停机
   产生（断言为字面量匹配，无恒真路径——AC2 反演已证）。
4. **CI spawn 前置**：`ci.yml:45` `npm run build && npm run build:server` 产出
   `apps/web/dist/index.html`（server 启动硬依赖，`server.ts:52-56` 实读：缺失即
   fatal exit 1）与 `apps/server/dist/server.js`——JOURNAL §2 偏差 1 的必要性经
   本会话核实成立。

**移交**：推送后以 CI contracts job 的 `npm run smoke:shutdown` step 输出
（`==== smoke:shutdown：7 passed / 0 failed ====`）为 AC1 权威判据。

## AC2 · 断言保护力反演 — PASS（等价反演，方式如实记载）

PRD 风险 2 明载：AC2 字面演练（注释 `server.ts:233` → 重建 → 非 Windows 重跑）本机
不可行，授权等价反演。本轮采用的方式与理由：

- **方式**：临时副本 `tests/smoke/.verify-tmp-shutdown.mjs` = 原脚本 sed 复制，
  **唯一篡改**为 win32 SKIP 守卫 `if (process.platform==='win32')` → `if (false)`
  （往返 diff 复核 `TAMPER_ISOLATED` 确认无第二篡改点），其余逐字。本机实跑真实
  T 组断言（非注释 `server.ts:233`，零源码接触、无需重建）。
- **同构性论证**：Windows TerminateProcess 投递 SIGTERM 与「注释 `server.ts:233`
  注册」的因果效果一致——停机 handler 均不执行、子进程均被默认终止；这正是
  AC2 Then 所述「子进程被默认 SIGTERM 终止、无停机日志、退出码非 0 至少一项触发
  失败」的场景。
- **实跑输出**（`node tests/smoke/.verify-tmp-shutdown.mjs`）：

  ```
  PASS P01 / PASS P02 / PASS H01（PORT=3901 就绪）
  FAIL T01 … actual: 开始=-1（signal=undefined）完成=-1；stdout 共 2 条 JSON 行
  FAIL T02 … expected: code=0 | actual: code=1 signal=null
  PASS T03 / PASS T04
  ==== smoke:shutdown：5 passed / 2 failed ====
  EXIT_CODE=1
  ```

  T01（无停机日志）+ T02（code=1≠0）双触发 → `EXIT_CODE=1`：**断言非恒真得证**，
  且同时实况复现周报 W43 观察 O4（Windows 信号模拟限制），证实 SKIP 分支存在
  理由真实、非伪造通过。
- **还原复绿**：副本删除后重跑原版 `npm run smoke:shutdown` → `RERUN_EXIT=0`
  （SKIP 基线不变）；演练前后 `git status --porcelain` 快照 diff 为空
  （`WORKTREE_UNCHANGED`，无演练残留、未触碰任何源码）。

不采「篡改预期日志串」变体的原因：本机无停机日志基线，篡改串与不篡改在该环境
无区分度；上述「停机不发生 → 双断言 FAIL」是更强的非恒真证明。

## AC3 · Windows 如实降级 — PASS

`npm run smoke:shutdown`（本会话实跑）：

```
SKIP smoke:shutdown：Windows 跨进程信号模拟限制——SIGTERM 经 TerminateProcess 投递，
process.on("SIGTERM") 停机 handler 不触发（周报 W43 观察 O4），停机三要素本机不可断言。
权威断言路径：CI ubuntu-latest（.github/workflows/ci.yml contracts job 的 npm run smoke:shutdown）。
EXIT_CODE=0
```

含原因（信号模拟限制）+ 权威路径说明，exit 0；**无任何断言 PASS 伪造输出**
（REQ-0025-02「不静默、不伪造」双满足）。顺带证明 `./lib.mjs`
（Checker/SmokeFailError/sleep）import 链可用。

## AC4 · CI 生效 — 挂接 PASS / CI 绿未到执行时点

- **挂接核对**（实读 `git diff .github/workflows/ci.yml` + ci.yml 全文）：
  contracts job（ubuntu-latest，`ci.yml:32-46`）在 `npm test` 后追加两 step
  `npm run build && npm run build:server`（:45）+ `npm run smoke:shutdown`（:46），
  含 3 行注释；ui-constitution job（:11-30）**零改动**（diff 无该 job hunk）。
  第一 step 与 PRD 示例文本（仅 `build:server`）的偏差已经 JOURNAL §2 偏差 1
  记载且经本会话核实必要（server.ts:52-56 硬依赖），step 数恰 2、断言口径零变化。
- **CI 绿**：`git status -sb` → `## main...origin/main [ahead 36]`；`gh run list
  --workflow ci` 最近 run 停在 2026-10-21（早于本迭代）——产品提交与推送在 VERIFY
  之后由脚本执行，**AC4 的「推送后 contracts job 绿」未到执行时点，不判过、不判挂**
  （沿 0011 REPORT AC6 先例）。

**移交**：推送后脚本须确认 contracts job 绿（含 smoke:shutdown step）；若红，
以 CI 日志为权威排查（JOURNAL §4 已列 better-sqlite3 原生模块编译为唯一环境风险项）。

## AC5 · 改动面与回归 — PASS

- **白名单机器核对**（实跑 `git status --porcelain` + `git diff`）：产品路径恰三处
  ——`tests/smoke/shutdown-sigterm.mjs`（新增 185 行 ≤400）、`package.json`（恰 +1 行
  `smoke:shutdown`，紧随 smoke:server 先例）、`.github/workflows/ci.yml`（+5 行=3
  注释+2 step，全落 contracts job）。`apps/web/**`、`packages/shared/**`、
  `apps/server/src/**`、`tools/pixel-gate/**`、`tests/golden/**`、
  `tests/smoke/{lib,smoke-server,mcp-stubs}.mjs` 零触及。工作区另有的
  `docs/evolution/STATE.md` 与 `docs/evolution/iterations/0012/` 为进化过程文件，
  按仓库惯例（0011 归档提交先例）不入产品提交。
- **回归证明**：`npm run gate` 6 场景（s0~s5）+ `npm test` 由工作流脚本统一运行
  且通过（派发指令明示，本轮不重复执行）；本轮 VERIFY 补跑的针对性 E2E：
  - `npm run smoke:server` → **`==== smoke:server：50 passed / 0 failed ====`，
    `SMOKE_SERVER_EXIT=0`**（SSE 事件流、审批、workflows/runs 持久化端点、
    进程卫生 C04 全过——本迭代零后端源码改动的回归证明）。
  - `npm run test:canvas` → **`15 passed / 0 failed`，`CANVAS_EXIT=0`**
    （画布 portCache 几何交互离线回归抽查）。

## AC6 · 授权链在档 — PASS

- PRD §背景 5（PRD.md:67-69）引用 issue#8 与批复时间戳在档 ✓（本会话 Read）。
- `gh issue view 8` 亲核：`liusuren123`（用户 OWNER）于 `2026-10-23T15:48:25Z` 评论
  「批准」，无 🤖 前缀——与 PRD 记载逐字一致。无 ADR 需求成立（非宪法类变更）。

## 交互回归抽查（test-manager 职责清单节选）

本迭代触 UI=否（`apps/web/**` 零字节改动），前端交互面回归由以下证据覆盖：
gate 6 场景全绿（脚本门禁，含 DOM 不变量与像素 0 容差）+ `test:canvas` 15/15
（本会话实跑：拖拽后端口贴合、自动连线端点贴合等几何不变量）。后端行为面：
`smoke:server` 50/50（本会话实跑）+ AC2 反演中 H01/T03/T04 对真实 server 实跑通过。
无新增 BUG。

## 缺陷清单

无（BUG-000）。遗留观察项（非缺陷，移交脚本/CLOSE）：
1. 推送后盯 CI contracts job（AC1 权威判据 + AC4 CI 绿）；
2. JOURNAL §4 已记载的 better-sqlite3 CI 编译环境风险，若触发按 PRD 非目标
   「另立 BUG 项处理，不顺手修」。
