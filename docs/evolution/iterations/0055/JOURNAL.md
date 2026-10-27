# 迭代 0055 · JOURNAL — BUILD 轮过程记录

> 产物角色：code-developer（BUILD 轮）· 2026-10-27 23:23 · 工作树 feat/0055-iter
> 输入：PRD.md + SPEC.md + ADR-0014 §7 定界；输出：产品代码 + 本记录。

## 1. 实现清单（与 SPEC §9 受影响文件清单一一对应）

| 文件 | 动作 | 行数 | 说明 |
| --- | --- | --- | --- |
| `apps/server/src/pty/session.ts` | 新增 | 304 | 会话运行时：ptyById 注册表判活 / spawn 惰性 + 失败走收尾防半开 / 三闸门（idle 刷新 + max 硬顶）/ close 六迁移唯一出口幂等（kill→wait≤2s→exit 帧广播→审计→删注册表）/ 环形缓冲 256KiB 丢最旧 / 拆帧 32KiB / agentWrite（单飞守卫 + 500ms 回显窗口 + signal 级联只断本次调用）/ abortActivePtySessions + activePtyCount + sweepStalePtySessions |
| `apps/server/src/pty/routes.ts` | 新增 | 97 | 五端点：create 201/503/429/500（前置判定先于 PTY 副作用）、list、stream（六头 SSE + ready 帧 + 环形回放 + 订阅/断连自清 + 建流间隙已关闭补 exit 帧）、write（判活404→data400→origin400→agent403+write-blocked 审计）、stop（404 无活动语义） |
| `apps/server/src/pty/audit.ts` | 新增 | 100 | SPEC D1 定案：同库第二 better-sqlite3 连接（busy_timeout=2000 + DDL）；DDL 字段族沿 approval_audits 先例；写入容错 pino warn；listOpenPtySessionIds 供启动扫尾 |
| `apps/server/src/pty/danger.ts` | 新增 | 23 | 五模式固定清单 + scanDangerous 纯函数；无任何拒绝分支（AC4 源扫描：danger.ts 及调用处 session.ts:218 仅产生 warn 帧与审计位） |
| `apps/server/src/server.ts` | 修改 | +21 | 头注活清单补 pty 五端点行（BK-0056）/ import / initPtyAuditStore+sweep 启动序列（sweepDanglingRuns 邻域）/ 五路由 v1-only 注册（workbench diff 邻域）/ 停机链 abortActivePtySessions 同批 + 宽限计数并入 activePtyCount + closePtyAuditStore 先于 closeStore |
| `apps/server/src/config.ts` | 修改 | +21 | 白名单+4 key / zod（IDLE min 1000=SPEC D6 / SESSIONS 1-16 / ENABLED TRUTHY-FALSY）/ 交叉校验 MAX≥IDLE fail-fast / 返回体 flat 四键（默认 600000/3600000/4/false） |
| `apps/server/package.json` | 修改 | +1 | dependencies +node-pty ^1.1.0 |
| `package.json`（根） | 修改 | +2 | allowScripts +node-pty@1.1.0:true；scripts +smoke:pty |
| `package-lock.json` | 机械变化 | — | +node-pty 1.1.0 +node-addon-api 7.1.1（^7.1.0 射程内）；diff 亲核仅此两包新增 |
| `apps/server/.env.example` | 修改 | +4 | 可选段四条纯注释行（REQ-0044-09，BK-0059 先例） |
| `tests/smoke/pty-sessions.mjs` | 新增 | 355 | PY0-PY12 十三组 57 断言；独立入口（SPEC D7），smoke-server.mjs 零触碰 |

零改动承诺面机器核验：`git diff --stat -- apps/web packages/shared tools/pixel-gate
tests/golden .github apps/server/src/guard.ts apps/server/src/store.ts
apps/server/src/tools.ts tests/smoke/smoke-server.mjs` 输出 0 行（恒空成立）。

## 2. node-pty native 面实测（PRD §8 工作树首个 native 依赖轮义务）

- SPEC §1 时效复核再确认（本 BUILD 会话亲读 node_modules/node-pty/package.json）：
  version 1.1.0 / types ./typings/node-pty.d.ts（自带 spawn/IPty 类型）/
  dependencies {node-addon-api ^7.1.0} / install `node scripts/prebuild.js || node-gyp rebuild`
  ——与附录 A 批复射程逐项一致，零偏航。
- **prebuild 命中零编译**：工作树内 `npm install` 224 包 23s 完成（无 node-gyp 编译）；
  spawn→write→输出回显→kill→onExit 全链亲测可用（ConPTY）。
- 已知噪声（非缺陷）：win32 下 kill 时 node-pty 的 conpty_console_list_agent 子进程
  可能报 AttachConsole failed 后崩溃——独立辅助子进程，主进程不受影响，exit 事件正常
  送达（本会话实测；PY6e/PY12 pid 收尸断言全绿佐证）。

## 3. 过程事件与处置（如实记录）

1. **工作树 node_modules 断链修复**：prepare 期建立的顶层 junction 全部指向不存在的
   `node_modules/node_modules/<pkg>`（176 个断链，@agentflow 自链正常）。Node/tsc
   解析经祖先链回退主仓仍可用（基线门禁因此未暴露），但 `npm install` 以
   ENOTDIR 拒绝（npm 需在被断链占位的路径 mkdir）。处置：删除 176 个断链（保留
   @agentflow 工作树自链），npm install 在**工作树内**完成完整安装（224 包）——
   未触碰主仓库，隔离不变，反而使工作树依赖自洽。node_modules 不入库，无产品影响。
2. **tsc 一处类型错**：PtySession.subscribers 初始化 `[]` → `new Set()`（TS2740），
   当场修复后 build:server exit 0。
3. **SPEC PY8 内部矛盾修正**：SPEC §7 PY8 字面 env（IDLE=60000 > MAX=2000）恰为
   §6.2/AC7/PY10e 规定必须 fail-fast 的交叉校验反例（首轮实跑探针 C 启动即 exit 1
   证实）。改取最近合法对 **IDLE=1500 / MAX=2000**（keep-alive 400ms 仍充分续命
   idle），断言语义不变（max 硬顶先于被续命的 idle 兑现）；已在冒烟文件注释中
   显式标注供 VERIFY 复核。
4. **killServer 异步谓词假通过缺陷（冒烟自抓）**：lib.mjs `waitFor` 是同步谓词，
   首轮把 async 谓词传入——Promise 恒 truthy 即刻通过 → SIGKILL 抢在 close 收尾
   （kill+wait ≤2s）之前 → PY9 探针 D 会话无终局审计行 + cmd.exe 孤儿（PY12 抓到
   1 例）。修复：本文件内 `waitForAsync` 显式异步轮询，killServer 等注册表清空后
   才准 SIGKILL；复跑两轮 PY12 全绿（本轮 create 6 例 0 孤儿）。
5. **Mimosa 钩子裁定**：audit.ts:44 `db.exec(DDL)` 被标记「命令注入·高危」——经核
   为误报：该语句为静态 CREATE TABLE 字面量（无插值无用户输入），与 store.ts:60-110
   既有 DDL 逐字同型（多轮评审先例）；写入面 `insertStmt.run` 全参数化。选「保持
   原写法」，本条留痕供复审。
6. **启动扫尾与在途会话的语义注记**：探针实例启动时 sweep 会把**冒烟进程内仍在途**
   的直连会话开放记录标记 sweep-stale（记录级对账，SPEC D8 设计内行为：不击杀、
   防PID复用错杀）；该会话随后仍被 PY11 abort 正常收尾（close shutdown 行在案）。
   行为正确、如实记录。

## 4. 自测记录（命令 + 真实结果）

| 命令（工作树根执行） | 结果 |
| --- | --- |
| `npm run build:server` | exit 0（dist/pty 四文件 + server.js 产出） |
| `npm run smoke:pty` | **57/0 全绿**；复跑第二轮 **57/0**（稳定性） |
| `npm run smoke:server` | **145/0**（基线零回退，结构性不触碰 + 实测双证） |
| `npm test` | **30/30**（shared 契约零新增 = PTY 帧不进 RunEventSchema 机器证明之一） |
| `node --check tests/smoke/pty-sessions.mjs` | 通过 |

完整门禁（`npm run build` / `npm run gate` 18 场景 / git 提交）由脚本在 BUILD 之后
统一执行（派发指令明示）；本轮 apps/web 零 diff，gate 预期零波及。全程
`gate:update` 零消费。

## 5. SPEC 偏差汇总（供 VERIFY 对照）

- PY8 env 数值对（§3 条 3，语义不变，已在代码注释标注）。
- 冒烟 killServer/waitForAsync 为实现级修正（SPEC 未规定实现细节，非偏差）。
- 其余按 SPEC D1-D9 定案逐项落地，无扩大影响面：未触 tools.ts 注册面、未进
  RunEventSchema、guard.ts 零改动、无新依赖（node-pty 之外）、无出站网络新增。
