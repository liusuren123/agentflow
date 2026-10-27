# 迭代 0055 · REPORT — BK-0044 PTY 会话后端运行时（VERIFY 验收报告）

> 产物角色：test-manager（VERIFY 轮）· 2026-10-27 23:44 · 工作树 feat/0055-iter
> 输入：PRD §5 AC0~AC10 + SPEC §10 验收口径；消费方：合并仲裁（MERGE）。
> 环境：本机 Windows 11 10.0.26300 · Node v24.21.0 · Git Bash（win32 本地证据，
> CI（windows-latest/ubuntu）为权威——凡 win32 不可达路径均如实标注，见 §4）。

## 0. 结论

**PASS（零 BUG）**。AC0~AC9 全部通过（AC10 CI 盯守属推送后义务，未到时点，
按 0012 先例不判过不判挂，见 §3 表）。新冒烟 `npm run smoke:pty` 本会话实跑
**57/0**，`npm run smoke:server` 实跑 **145/0 零回退**；五端点手动 E2E（curl +
SQLite 审计直查）逐点位实证；零触面机器证明（git diff + untracked）成立。
win32 信号形态限制（SIGINT/SIGTERM 不可跨进程送达原生 node）导致停机级联的
真实信号路径在本机不可观察——按 PRD AC6 自身口径（win32 模块级演练背书 +
CI ubuntu 权威）以 PY11 模块级演练实跑全绿 + 接线代码核验收口，如实标注于 §4。

## 1. 验收命令实跑记录（本 VERIFY 会话亲跑）

| # | 命令（工作树根执行） | 真实结果 | 证据要点 |
| --- | --- | --- | --- |
| V1 | `npm run smoke:pty` | **`==== smoke:pty：57 passed / 0 failed ====`** exit 0 | PY0~PY12 十三组全绿（输出含 PY11b~PY11f 停机演练、PY12「本轮 create 6 例 0 孤儿」）；stderr 的 `conpty_console_list_agent` AttachConsole 报错为 node-pty 已知辅助子进程噪声（JOURNAL §2 在案），不影响断言与收尸 |
| V2 | `npm run smoke:server` | **`==== smoke:server：145 passed / 0 failed ====`** exit 0 | 145 基线零回退（C01~C04 收尾断言全绿） |
| V3 | `git diff main --stat -- <零触面>` + `git status --porcelain -- <零触面>` | 两条均**零输出** | apps/web/** · packages/shared/** · tools/pixel-gate/** · tests/golden/** · .github/** · guard.ts · store.ts · tools.ts · tests/smoke/smoke-server.mjs：tracked 零 diff、untracked 零文件；全部 untracked 仅 `apps/server/src/pty/`、`docs/evolution/iterations/0055/`、`tests/smoke/pty-sessions.mjs`（SPEC §9 清单内） |
| V4 | `wc -l` 新文件 | session.ts **304** / routes.ts **97** / audit.ts **100** / danger.ts **23** / pty-sessions.mjs **355** | 全部 ≤400 行（AGENTS 硬性约定 4） |
| V5 | `grep -rni pty packages/shared/src` | 仅存量注释 4 处（jsoncanvas/termview，V3 已证零 diff） | PTY 帧零 shared 契约（不进 RunEventSchema）机器证明 |
| V6 | `npm view node-pty version license dependencies` 等 | `1.1.0` / `MIT` / `{node-addon-api ^7.1.0}` / `node scripts/prebuild.js \|\| node-gyp rebuild`；`@xterm/xterm` `6.0.0`/MIT/零依赖 | 与 SPEC §1 时效复核表逐项一致（AC0） |
| V7 | `grep -rn "scanDangerous\|DANGER_PATTERNS" apps/server/src/pty/` | 仅 danger.ts（定义）+ session.ts:26/:218（唯一调用点） | AC4 源扫描，详见 §3 AC4 行 |

**未在本会话复跑（按派发指令由脚本统一执行且通过，如实归属）**：`npm run build`
（含 node-pty native 面）/ `npm run gate`（18 场景 s0~s17）/ `npm test`（30/30）。
BUILD 自测记录另见 JOURNAL §4（build:server exit 0 / smoke:pty 57/0 ×2 /
smoke:server 145/0 / npm test 30/30）。

## 2. 手动 E2E 实证（AC9 · M1~M7 · curl + SQLite 直查，全部真实 HTTP）

> 实例矩阵：默认 env（:3951）/ PTY_ENABLED=1 长闸门（:3952）/ IDLE=1000 探针
> （:3953）/ IDLE=600000 停机观察（:3954）。审计直查 = better-sqlite3 只读开
> `data/agentflow.db` 查 `pty_audits`（SPEC §7 直查先例同款）。

| 点位 | 实测结果（关键输出摘录） |
| --- | --- |
| M1 未启用拒绝【真实】 | 默认 env：`POST /api/v1/pty/sessions` → **503** `{"error":"PTY 会话功能未启用（PTY_ENABLED=0）"}`；list → **200** `{"sessions":[]}`；PowerShell `Get-CimInstance Win32_Process` 查该服务器 pid **零 cmd.exe 子进程**（注：首轮用 wmic 查询，本机 wmic 缺失结论不安全，已用 PowerShell 重查补证） |
| M2 创建与锚定【真实】 | `PTY_ENABLED=1`：create → **201** `{"sessionId":"e4ae1432-…"}`；`apps/server/sandbox/pty/<id>/` 目录 `DIR-EXISTS`；list 含该 id（`createdAt/lastActivityAt` 字段齐） |
| M3 用户写入流回放【真实】 | `curl -N …/stream` 首帧 `{"t":"ready","sessionId":"…","replayBytes":352}` + cmd 横幅回放帧；write `{data:"echo hi\n",origin:"user"}` → **200** `{"ok":true,"danger":false}`；流内 data 帧回显 `"data":"echo hi"`；审计行 `origin=user, kind=write, summary="echo hi\n"` |
| M4 防伪造反例【真实】 | HTTP `origin:"agent"` → **403** `{"error":"origin=agent 仅允许服务端内部通道"}` + 审计 `kind='write-blocked', origin='agent'`（如实记录实际 origin）；origin 缺省 → **400**；origin `"bob"` → **400** |
| M5 危险警示不拦截【真实】 | write `echo rm -rf ./tmp-x` → **200** `{"ok":true,"danger":true}`；流收 warn 帧 `{"t":"warn","msg":"危险命令警示（不拦截）：rm -rf 递归强删族","origin":"user"}`；审计该行 `danger=1`；命令透传（流内回显 `rm -rf ./tmp-x`，输出照常推进） |
| M6 显式停止与幂等【真实】 | stop → **200**；流收终帧 `{"t":"exit","code":-1073741510,"reason":"stop"}`；复 stop → **404**；未知 id write/stop/stream → **404/404/404**；create 行 pid 55188 → tasklist **已收尸**（kill+wait 双确认）；`POST /api/pty/sessions`（无 v1 别名）→ **404**（v1-only 成立） |
| M7a idle 超时【真实】 | IDLE=1000 探针：create 201 → 静置 3s → list 收敛 `{"sessions":[]}`；审计 `[create, {kind:'timeout',reason:'idle'}]`；流 exit 帧 `reason:'idle'`；pty 子进程 41604 **已收尸** |
| M7b 停机级联【win32 如实标注】 | 见 §4：真实信号路径本机不可送达；模块级演练 PY11 全绿 + 接线代码核验收口；硬杀（taskkill 树杀）观察亦**零孤儿**（ConPTY 随父消亡） |
| 附·启动扫尾现场实拍【真实】 | 二号实例启动日志：`启动扫尾：遗留开放 PTY 会话记录已标记 closed {count:1, ids:["b7e1a871…"]}`——D8 审计对账式扫尾的跨进程现场证据（该记录对应一号实例仍在途会话，行为与 JOURNAL §3.6 语义注记一致） |

AC2（未启用/上限）与 AC3（双源/409）、AC5（三闸门/幂等）、AC7（env fail-fast ×5）
由 V1 冒烟覆盖：PY1（503+零审计行）/ PY9（满员 **429** `PTY_MAX_SESSIONS=1` 探针）/
PY4（origin 反例 400×2、HTTP agent 403、并发 agentWrite 第二发 **409**、>16KiB **400**）/
PY7（idle）/ PY8（max 硬顶先于续命 idle）/ PY10（IDLE=500、SESSIONS=0/17、
ENABLED=maybe、MAX<IDLE 交叉校验 → 各自 exit≠0 且输出指明变量名）——本会话实跑全绿。

## 3. AC 逐条判定

| AC | 判定 | 证据 |
| --- | --- | --- |
| AC0 授权与定界核验 | **PASS** | BACKLOG BK-0044 行（BACKLOG.md:65）受影响文件字面与 SPEC §9 表逐项对照一致：session/routes/audit/danger 四文件、server.ts 接线、config.ts +4、双 package.json、tests/smoke 断言组全覆盖；两处 SPEC 定案行使（audit 落点=pty 自有仓储、冒烟载体=独立文件）由行内括注「承载落点实施 SPEC 定」与 PRD §7「载体 SPEC 定」授权，store.ts 不落为该括注兑现（store.ts 零 diff = V3 机器证明）；REQ-0044-09（.env.example +4 注释行）按 PRD 显式增补标注处理（实测 .env.example 可选段含四条 PTY 注释行，纯 # 注释零运行时行为）；SPEC §1 含 npm 时效复核记录且本会话 V6 复验一致 |
| AC1 五端点契约 | **PASS** | §2 M2/M3/M6 全链（201+目录+审计 create 行 origin=system pid 在、list、write 200、SSE 按序回放含 hi、stop→exit 帧→审计 close、复 stop 404、未知 404×3）+ PY2/PY3/PY6 |
| AC2 未启用与上限 | **PASS** | M1（503 与 404 语义可区分：禁用态 list 恒空、无活动会话恒 404）+ PY1（含「拒绝路径零审计行」）+ PY9（429 定案码 + 上限文案）；零 PTY 子进程产生 = M1 零子进程补证 + routes.ts:23-29 前置判定先于任何 PTY 副作用（代码序核验） |
| AC3 双源与防伪造 | **PASS** | M4（403 + write-blocked 审计如实记 origin=agent）+ PY3f/PY3g（agentWrite 直连 ok+echo 含回声+审计 origin=agent）+ PY4e（并发第二发 409——AGENT_ECHO_MS 窗口即真实 in-flight 区间）+ PY4/PY4b（缺省/非法 400）；agent 身份唯一入口 = session.ts:232 `agentWrite`（服务端权威填写，零 HTTP 暴露，routes.ts:80-85 外部通道拒收） |
| AC4 危险命令仅警示 | **PASS** | M5 实测（200 danger:true + warn 帧 + danger=1 审计 + 透传回显）+ V7 源扫描：scanDangerous 唯一调用点 session.ts:218（writeWithScan）——命中仅 broadcast warn 帧 + log.warn + 审计位，随后 `proc.write(data)` 无条件执行（session.ts:223，本会话 Read 核验）；danger.ts 零 reject/deny/throw 关键词；routes.ts 403 分支仅针对 origin==='agent'，与危险扫描无关——不存在「因危险清单拒绝写入」分支 |
| AC5 三闸门与状态机 | **PASS** | M7a（idle 真实触发：timeout/idle 审计 + exit 帧 + 子进程收尸）+ PY7/PY8（idle 与 max-duration 各自兑现，max 先于被续命 idle）+ PY6c/M6（close 幂等：复 stop 404）+ 代码核验：closePtySession 六迁移唯一出口、`closed` 置位后 no-op（session.ts:113-114）、onExit 第六迁移（session.ts:147-152）、spawn 失败走收尾防半开（session.ts:175-177） |
| AC6 停机级联与孤儿 | **PASS（win32 口径，如实标注）** | 模块级演练 PY11b~PY11f 全绿（abortActivePtySessions ≥1 → exit 帧广播 reason='shutdown' → 审计 close/shutdown 行 → activePtyCount 收敛 0）；接线核验：server.ts 停机链 abortActivePtySessions 与 abortActiveSessions 同批、宽限轮询并入 activePtyCount、closePtyAuditStore 先于 closeStore（git diff 亲读）；孤儿面：本会话 smoke PY12「本轮 create 6 例 0 孤儿」+ 手动全部会话 pid 收尸亲证 + 终扫 31 create 行 0 存活；真实信号路径 win32 不可达（§4），SIGTERM 权威归 CI smoke:shutdown（0012/0016 先例） |
| AC7 env 校验 | **PASS** | PY10 ×5 实跑（各 exit≠0 + 输出指明变量名：PTY_IDLE_TIMEOUT_MS=500 / PTY_MAX_SESSIONS=0 与 17 / PTY_ENABLED=maybe / MAX=1000<IDLE=2000 交叉校验）；zod 细节核验 config.ts diff（min 1000 / 1-16 / TRUTHY·FALSY / 交叉校验 fail 指明两变量名） |
| AC8 回归面与零接触 | **PASS** | V3 机器证明（零触面 diff+untracked 恒空）；V1/V2（145 零回退 + P 组新增 57 全绿）；gate 18 场景 / npm test 30/30 / build 由脚本统一执行通过（派发指令，未复跑）；全程 gate:update 零消费（golden 面 diff 恒空为结果性证明） |
| AC9 手动 E2E | **PASS** | §2 全表（M1~M7a 真实；M7b 超时真实、停机 win32 如实标注） |
| AC10 CI 盯守 | **未到时点·不判** | 分支未推送（VERIFY 阶段）；推送后义务：contracts job（node-pty native 首次接入实测）+ ui-constitution 18 场景（零 golden 接触预期零变化）。沿 0012 先例不判过不判挂 |

## 4. win32 限制如实标注（M7b）与环境备注

1. **真实停机信号不可送达（环境限制，非缺陷）**：MSYS `kill -INT <winpid>` 报
   `No such process`（不认原生 pid）；工具 TaskStop 为硬杀进程树（实测：服务器
   退出、端口释放，但**无**优雅停机日志、**无** close(shutdown) 审计行——未走
   shutdown 链）。win32 下无法向独立控制台的原生 node 进程注入 CTRL_C_EVENT。
   处置 = PRD AC6 自身口径：模块级演练（PY11，实跑全绿）+ 接线代码核验 +
   CI ubuntu smoke:shutdown 权威。**附带正面观察**：硬杀场景下 pty 子进程随
   ConPTY 消亡（pid 45176 实测已死）——即使不走优雅链亦无孤儿。
2. **BUILD 期历史孤儿清理（非本轮代码缺陷）**：终扫发现 1 例存活 cmd.exe
   （pid 41552，审计 create 15:19:29Z ↔ JOURNAL §3.4 记录的**修复前**首轮
   smoke SIGKILL 竞态孤儿；close(sweep-stale) 为次轮探针启动扫尾补记）。
   终版代码（killServer 修复后）BUILD 复跑 ×2 与本会话 V1 的 PY12 均零孤儿；
   该残留系历史进程而非代码行为，已 `taskkill //F` 清理（复扫 31 行 0 存活）。
   同时印证 D8 设计声明：sweep 只做记录对账、不击杀（防 PID 复用错杀）。
3. **进程管理备注**：Git Bash `kill $!`（MSYS pid）杀不死原生 node（本轮两个
   测试服务器因此残留，已 taskkill 清理）；期间 libuv SO_REUSEADDR 允许两进程
   同绑 :3952——已通过换端口消除歧义，后续证据均对单一实例采集。
4. **Mimosa 钩子拦截 ×3（过程备注，非产品缺陷）**：`node dist/server.js` 的
   Bash 后台启动与对源码路径的 `sed -n` 只读查看被「绕过 Write/Edit」启发式
   误拦；均已按其建议改用 run_in_background / Read 工具完成，未绕过。
5. **SPEC 偏差复核（JOURNAL §5 申报，VERIFY 裁定认可）**：PY8 env 对取
   IDLE=1500/MAX=2000——SPEC §7 字面组（IDLE=60000>MAX=2000）恰为 §6.2 交叉
   校验必须 fail-fast 的非法对（自相矛盾），修正后断言语义不变（max 硬顶先于
   被续命 idle），冒烟文件注释已显式标注；killServer/waitForAsync 为实现级
   修正非偏差。其余 D1~D9 逐项落地无偏航：未触 tools.ts 注册面、未进
   RunEventSchema（V5 机器证明）、guard.ts 零改动（V3）、无 node-pty 之外
   新依赖（package-lock diff 仅 +node-pty/+node-addon-api）、无出站网络新增。

## 5. 缺陷清单

**零 BUG**（无 Blocker/Critical/Major/Minor）。§4 五条均为环境限制或过程备注，
无一条构成对交付代码的缺陷判定。
