# JOURNAL · 迭代 0014 · BK-0022 BUG-0012 修复：code 节点 lang 默认码错配后端兜底（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 05:05
> 输入：`PRD.md`（REQ-0022-01~05 / AC1~AC5；S 项免 SPEC——受影响文件清单与验收口径
> 内嵌 PRD §S 项免 SPEC 节，skipSpec=true）。实现严格按白名单两处落点（REQ-0022-04），
> 未扩大影响面；零 UI / 零 DEFS / 零新依赖 / 零出站请求。完整门禁（build / gate /
> test / smoke）与 git 提交由脚本统一执行，BUILD 未自行运行。
> STATE.md 已按派发指令更新：`phase: PLAN → BUILD`，`updated: 2026-10-24 05:05`。

## 1. 改动清单（恰 PRD §S 项免 SPEC 表两处，git diff 实查）

| 文件 | 净改动 | 改动内容（落点） |
| --- | --- | --- |
| `apps/server/src/handlers.ts` | +14（+15/−1；244→258 行 ≤400） | REQ-0022-01：① 新增 import `paramDefaultsOf`（`handlers.ts:5`，`@agentflow/shared`，engine.ts:12 同源先例）；② code handler（:97-119，兜底块 :100-112）：`runUserCode` 调用前窄口径检测——`p.lang === 'JavaScript' && (p.code\|\|'') === paramDefaultsOf('code').code`（:107-109；默认样例取自 shared 单一来源，**无本地字面量复制**）→ 命中则替换为执行层常量 JS 等价样例 `'// 处理输入后返回\nresult = input\nreturn result'`（:110，非 DEFS 复制——DEFS 无 JS 样例）+ `emit('log', { lvl:'warn', msg:'code 节点默认样例与所选语言不匹配，已替换为等价样例执行（lang=JavaScript，编辑代码框可覆盖）' })`（:111）；③ `runUserCode` 调用行 `p.code \|\| ''` → `src` 原位改写（:113，即 −1/+1 那行）。不命中（lang≠JavaScript 或 code≠默认样例逐字）零 emit、零替换、透传原值 |
| `tests/smoke/smoke-server.mjs` | +40（+41/−1；346→386 行 ≤400） | REQ-0022-02：① 文件头步骤编排注释 `…D→C` → `…D→E→K→C`（:5，纯注释：补记 0005 遗漏的 E + 本轮 K）；② 夹具区 wfEng 后新增 `wfCode(params, name)` 工厂（:45-52，单 code 节点；旁注明示 K01/K03 刻意不给 code——缺陷本体即默认合并路径，**勿补 code 参数**，PRD 风险 2 防"修复"夹具）；③ 断言主体 E 组后、main 收口前新增 K 组 K01-K03（:326-363，挂接位按 PRD「W/D/E 组之后、C 组清理前」）：K01=AC1 正路径（params 仅 `{lang:'JavaScript'}`：run:done ok:true + 零 node:error + out 以「执行成功」起头 + log 含告知子串）；K02=AC3 对照①（自定义 JS 码 `result = "smoke-" + String(input)`：同强断言但 log 不含告知子串）；K03=AC3 对照②（params 仅 `{lang:'Python'}`：code 合并即默认样例逐字，恒不触发兜底）。`runCode` helper（:330-337）镜像 E 组 `runEng` 既有模式（openSse → waitFor accepted → CLEAN 收录 → waitFor done → 事件收集） |

告知文案定稿（PRD REQ-0022-01「BUILD 定稿字面量并同步冒烟断言」）：采纳 PRD 建议子串
原样为核心——`默认样例与所选语言不匹配，已替换为等价样例执行`，msg 全文为其前后缀
扩展；冒烟 `CODE_NOTE`（`smoke-server.mjs:329`）断言按 includes 子串，同一提交内闭环。
emit 级别定稿 `warn`（PRD 风险 3 允许 warn|info，取「提示潜在用户操作误区」；断言按
子串不按级别，级别不进契约）。

## 2. 与 PRD 的偏差记录（0 处实现偏差；3 处 BUILD 职责内定纪录实）

1. **告知文案与级别定稿**（§1 已述）：无偏差，属 PRD 明文交由 BUILD 定稿项。
2. **K03 夹具形态取「params 仅 lang:'Python'」**：PRD AC3 半支二措辞为「lang=Python
   （默认）任意码」——取 code 经默认合并（=默认样例逐字）而非自定义 Python 码：
   该形态恰为「错配触发串逐字 + lang=Python」的边界组合（替换条件第一支即败），
   比"任意自定义码"更强的不误伤证明；且无需在测试里引入第二份 Python 样例字面量。
3. **K02/K03 强断言 node:done 的运行时依赖**：K03 需本机 python 运行时（code.ts:12
   win32 取 `python`）——实测在位（Python 3.14.7）；CI 不跑 `smoke:server`
   （ci.yml:46 仅 `smoke:shutdown`，ci.yml:19-46 全步骤实查），无环境漂移面；已在
   K03 断言 ctx 如实标注「依赖本机 python 运行时」。

## 3. 自检（BUILD 内执行；完整门禁 build/gate/test/smoke 与 git 提交由脚本统一执行，未自行运行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| JS 语法（smoke） | `node --check tests/smoke/smoke-server.mjs` | 通过（`SMOKE_SYNTAX_OK`，退出码 0） |
| 改动面白名单（AC5/REQ-0022-04 前置，只读 git） | `git status --short` + `git diff --stat` | 产品改动恰 `apps/server/src/handlers.ts`（+15/−1）+ `tests/smoke/smoke-server.mjs`（+41/−1）两处；`docs/evolution/STATE.md`（PLAN 阶段既有改动 + 本轮 phase/updated）与 `docs/evolution/iterations/0014/`（PRD/本 JOURNAL）为进化过程文件，按 0013 先例不入产品提交；`packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、`.github/**` 零触及 |
| 规模预算（PRD NFR-2） | 同上 + `wc -l` | handlers.ts 净增 14 ≤25 ✓（258 ≤400）；smoke-server.mjs 净增 40 ≤40 ✓（386 ≤400）；零新增文件/依赖/env |
| python 运行时（K03 前置） | `python --version` | Python 3.14.7（本机在位） |
| handlers.ts 类型安全（未运行编译门禁） | 人工核对：`types.ts:64` `p: Record<string, any>`（`p.code \|\| ''` 为 any，比较/赋值合法）；`paramDefaultsOf('code').code` 为 `Record<string, unknown>` 索引 → `as string` 断言合法；`emit` 原已在 code handler 解构（原文 :96）；import 与 `engine.ts:12` 同源同形 | 推演结论：无类型错误路径；**权威编译检查由脚本 `npm run build:server` 门禁承载**（本轮按派发指令不自行运行） |

**未运行**（属脚本统一门禁序列，BUILD 按派发指令不自行执行）：`npm run build` /
`npm run build:server` / `npm run gate` / `npm test` / `npm run smoke:server` / git 提交。
**未运行**（VERIFY 职责，PRD AC2）：反演演练（摘除兜底 → 重建 → K01 必红 → 还原复绿）。

## 4. 脚本门禁预期与 VERIFY 断言基准

- **脚本执行序列预期**：`npm run build:server`（tsc 无错：新 import + 窄口径块编译
  通过）→ `npm run smoke:server`：既有断言零回退 + 新增 K01-K03 三条通过
  （汇总行 `0 failed`、退出码 0）→ `npm test` 全绿 → `npm run build` + `npm run gate`
  8 场景（s0~s7）全 `pass · diffPx=0`（纯回归面：本轮 `apps/web/**` 零触及，若现
  非零 diff 即基线漂移信号，与本轮无关，立即中止排查）。
- **K01 期望事件链**（供 VERIFY 对照）：单 code 节点 `params={lang:'JavaScript'}` →
  engine `P(n)` 合并 `p={lang:'JavaScript', code:'# 处理输入后返回\nresult = input\nreturn result'}`
  （`nodes.ts:61-62` + `engine.ts:38`）→ handler 命中 → `runUserCode('JavaScript',
  JS 等价样例)` → wrapper（`code.ts:16`）body 为合法 JS，input=null（无入边，
  stdin JSON `input:null`）→ 显式 `return result` 得 null → stdout
  `__AF_RESULT__null` → resolve(null) → `out='执行成功 · Xms · 返回 object'`
  （tdesc：`typeof null==='object'`，handlers.ts:118 口径）→ node:done + warn 告知 log。
- **K02**：自定义码 `result="smoke-null"`（`String(null)`）→ 返回 `'smoke-null'` →
  out「…返回 string」，零告知零替换。**K03**：lang='Python' 走 Python wrapper
  （`code.ts:32-44`），默认样例缩进进 `__af_main` 为合法 Python → 返回 None →
  out「执行成功 · … 返回 object」，零告知零替换。
- **AC2 反演口径建议**（VERIFY 演练）：临时将 handlers.ts 兜底块还原为直传
  `p.code || ''`（或仅摘除替换与 emit 两行）→ `npm run build:server` → 重跑
  smoke：**K01 必红**（code 节点 node:error：JavaScript 退出码非 0——Python 样例
  首行 `#` 在 JS 函数体语法下 SyntaxError，`code.ts:61` 拒绝路径）而 K02/K03 仍绿
  → 还原重建复绿；演练后 `git status` 干净。K01 现红条件正是 BUG-0012 缺陷路径，
  非恒真断言。
- **AC4**：`git diff -- packages/shared` 为空 + `npm test` 全绿（契约四文件零改动）。
- **AC5**：`git diff` 白名单核对（恰 REQ-0022-04 两文件）+ gate 8 场景 + smoke 全绿。

## 5. 触 UI 与授权链声明

- 触 UI = **否（与 PRD 结论一致，非修宪轮）**：改动面仅
  `apps/server/src/handlers.ts` + `tests/smoke/smoke-server.mjs`；
  `apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、`packages/shared/**`
  零字节改动（`git status` 实查）——视觉 / DOM 结构 / 交互三层与 golden 基线均
  不接触，gate 为纯回归面。
- POLICY 校验：bug 修复（不触 UI、不改 shared 契约）+ 测试基建 = 自主区，无需
  needs-approval issue。
- 未运行也无需 `npm run gate:update`；前端联动修复（切 lang 时代码框样例联动）归
  issue #6（BK-9006 追加条目），本轮零接触。
- 回滚路径：`git revert` 产品提交即回到直传 `p.code` 现状（无状态迁移、无基线变更、
  无 schema 变更）。
