# REPORT · 迭代 0014 · BK-0022 BUG-0012 修复：code 节点 lang 切 JavaScript 后默认码错配的后端兜底

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 05:16
> 输入：`iterations/0014/PRD.md`（S 项免 SPEC，验收口径内嵌 PRD）。
> 环境：本机 Windows（win32 10.0.26300）· Node v24.21.0 · Git Bash · 后端 dist 为
> 本轮 `npm run build:server` 现场构建产物。
> 说明：`npm run build` / `npm run gate`（8 场景）/ `npm test` 已由本轮工作流脚本在
> BUILD 门禁运行且通过（派发指令明示，VERIFY 不重复全套）；test-manager 本轮执行
> 的检查以「本轮执行」标注，脚本代跑的以「脚本运行结果」标注，二者不混计。

## 结论

**PASS（零未决 BUG）**。PRD 五条验收标准（AC1~AC5）全部通过；REQ-0022-01~05 逐条
落实；反演演练证明 AC1 非恒真且锁定的正是 BUG-0012 缺陷路径；交互回归抽查（后端
health/models + SSE 三路径事件序）无异常。1 个 Minor 观察项（OBS-001，非 AC、
不构成缺陷）：smoke-server.mjs 增量 41 行，超 PRD 非功能要求 2 的「≤ 40 行」1 行。

## 一、AC 逐条验收（含证据）

### AC1 · 兜底生效 — PASS

- 命令（本轮执行）：`npm run build:server && npm run smoke:server` →
  `==== smoke:server：56 passed / 0 failed ====`。
- **K01 PASS**：`code 节点 lang=JavaScript 不带 code：run:done {ok:true}、无
  node:error、out「执行成功」类文案、log 含兜底告知子串`（夹具
  `tests/smoke/smoke-server.mjs` K 组，params 仅 `{lang:'JavaScript'}` 刻意不给
  code，走 DEFS 默认合并路径）。
- 交互层复证（本轮执行，PORT=3999 真实服务器）：`POST /api/v1/run` SSE 事件序
  全录——`run:accepted → run:start → node:start → log(lvl=warn, msg="code 节点
  默认样例与所选语言不匹配，已替换为等价样例执行（lang=JavaScript，编辑代码框
  可覆盖）") → run:progress → node:done(out="执行成功 · 55ms · 返回 object") →
  run:done(ok:true)`，全程无 `node:error`。告知子串与 PRD 建议稳定子串一致
  （「默认样例与所选语言不匹配，已替换为等价样例执行」，`handlers.ts:111`）。

### AC2 · 保护力反演 — PASS（演练闭环，git status 零残留）

1. **摘除**：Edit 工具把 `handlers.ts:100-113` 兜底段临时还原为直传
   `runUserCode(p.lang || 'Python', p.code || '', ...)`（演练前 sha256 基线
   `40da85fc…ddf77ddaa`）。
2. **重建**：`npm run build:server` 通过（tsc 无错）。
3. **重跑**（本轮执行）：`npm run smoke:server` → `==== smoke:server：51
   passed / 1 failed ====`；唯一 FAIL 正是 K01——`actual: {"ok":true,
   "errCount":1,"out":"","logs":[]}`；server 日志侧复现缺陷路径：`node:error
   "JavaScript 退出码 1：…SyntaxError 栈…"`（`code.ts:61` 退出码拒绝路径，
   BUG-0012 本体）。K02/K03 仍 PASS（不误伤断言与兜底无关，符合预期）。
4. **还原**：Edit 写回原兜底段 → sha256 复核 = `40da85fc…ddf77ddaa`（与演练前
   逐字一致）→ `npm run build:server` → `npm run smoke:server` 复绿
   `==== smoke:server：56 passed / 0 failed ====`（K01/K02/K03 全 PASS）。
5. **零残留**：演练后 `git status --porcelain` 与演练前逐项一致（M handlers.ts /
   M STATE.md / M smoke-server.mjs / ?? iterations/0014/）。
- 口径备注（如实记录）：`run:done` 的 `ok` 语义为 `!stopped`
  （`apps/server/src/engine.ts:150`），节点失败不翻转该位——故反演时 K01 的
  `done.ok` 仍为 true；K01 断言以 `errCount/out/logs` 为判别字段，正确区分了
  成败两条路径。PRD AC2 中「run 失败」的准确实现即「code 节点 node:error +
  out 无执行成功文案」（已按实际行为记录，非缺陷）。

### AC3 · 不误伤 — PASS

- **K02 PASS**：`lang='JavaScript'` + 自定义码 `result = "smoke-" +
  String(input)` → run:done {ok:true}、无 node:error、out「执行成功」、**log 无
  兜底告知子串**（零替换零告知）。
- **K03 PASS**：`lang='Python'` 不带 code（code=默认样例逐字）→ out「执行成功」
  （默认样例按 Python 原样执行）、**log 无兜底告知**。
- 交互层复证（本轮执行）：A）`{lang:'Python'}` 默认路径 → 无告知 log、
  `node:done out="执行成功 · 320ms"`；B）自定义 JS 码
  `result = {echo:String(input), by:'js'}` → 无告知 log、
  `out="执行成功 · 248ms · 返回 对象(2 字段)"`（自定义码原样执行、结果语义正确）。

### AC4 · 契约与 DEFS 零漂移 — PASS

- 本轮执行 `git diff -- packages/shared/`：**输出为空**（零改动）。
- 工作区改动面（本轮执行 `git diff --name-only`）：仅
  `apps/server/src/handlers.ts`、`tests/smoke/smoke-server.mjs`（产品代码）；
  另 `docs/evolution/STATE.md`（协调者流程文件）与新增
  `docs/evolution/iterations/0014/`（迭代产物目录）不属产品提交射程。
- `npm test`（shared 契约四文件 contract / defs-drift / events-negative /
  handlers-coverage）：**脚本运行结果=通过**（BUILD 门禁，非本轮重复执行）。

### AC5 · 白名单与全量回归 — PASS

- 白名单机器核对（本轮执行 `git diff --name-only` + `git diff --numstat`）：
  产品代码改动恰为 REQ-0022-04 白名单两文件（handlers.ts +15/−1、
  smoke-server.mjs +41/−1），无第三路径。
- `npm run gate` 8 场景（s0~s7，`gate.mjs:177-186`）：**脚本运行结果=全绿**
  （BUILD 门禁；本迭代零前端改动，gate 为纯回归面，非本轮重复执行）。
- `npm run smoke:server`：本轮执行 **56 passed / 0 failed**（迭代 0013 口径 53
  条既有断言零回退 + K01~K03 新增 3 条全过）。

## 二、REQ 逐条核对

| REQ | 结论 | 证据 |
| --- | --- | --- |
| 0022-01 错配检测与兜底替换 | 落实 | `handlers.ts:107-112`：`paramDefaultsOf('code').code` 取默认样例（shared 单一来源，`packages/shared/src/nodes.ts:115` 既有导出，**无本地复制 Python 样例字面量**）；窄匹配 `p.lang==='JavaScript' && src===pySample`（逐字相等，无正则/启发式）；JS 等价样例 `'// 处理输入后返回\nresult = input\nreturn result'` 与 PRD 字面一致（执行层常量，DEFS 无 JS 样例）；`emit('log',{lvl:'warn',msg:含固定子串})`（`handlers.ts:111`）；不命中路径 `src=p.code||''` 与原 `p.code||''` 直传**逐字等价**（零行为变化） |
| 0022-02 冒烟断言 | 落实 | `smoke-server.mjs` K 组（K01~K03）挂接既有 E 组（`smoke-server.mjs:283`，迭代 0005 产物）之后、C 组清理前；夹具工厂注释明示「刻意不给 code…勿补 code」（豁免 :14 夹具约定，防后续维护误修复） |
| 0022-03 契约与 DEFS 零变化 | 落实 | shared diff 为空（本轮执行）；npm test 脚本运行通过 |
| 0022-04 白名单 | 落实 | 见 AC5；numstat +15/−1 与 +41/−1 |
| 0022-05 gate 8 场景 | 落实 | 脚本运行结果全绿（s0~s7） |

## 三、非功能要求核对

1. 窄口径确定性 ✓：判定仅依赖两个字符串 `===`（shared 默认样例 × 合并后
   p.code），无正则、无启发式、无语言探测（`handlers.ts:109`）。
2. 规模：handlers.ts +15/−1 ≤ 25 ✓；smoke-server.mjs **+41/−1，超「≤40 行」
   1 行** → OBS-001（见下）。两文件总量 258 / 386 行，均低于 400 上限 ✓。
3. 零新增依赖 / 零新增 env / 零出站请求 ✓：diff 内唯一新 import 为
   `paramDefaultsOf`（既有包 `@agentflow/shared` 内既有导出）；无新 npm 包、
   无 `process.env` 新增、无网络调用（纯内存字符串操作）。
4. 可审计 ✓：BUG-0012 证据链闭环——BACKLOG BK-0022 备注（dogfooding 发现）→
   PRD 背景五环（本报告逐环复核属实：DEFS 默认 `nodes.ts:58-63`、前端直写
   `app.js:1029-1035`、引擎合并 `engine.ts:38`、handler 直传与 JS wrapper
   `code.ts:13-31,61`）→ 本 REPORT 反演记录（§一 AC2）。

## 四、交互回归抽查（本轮执行；零 UI 改动，聚焦后端 API/SSE 契约）

- `GET /api/v1/health` → `{"ok":true,"engine":"agentflow-server","node":
  "v24.21.0","provider":{…DeepSeek…}}` ✓。
- `GET /api/v1/models` → `configured:true` + 2 模型（DeepSeek-V4/R2）✓。
- `POST /api/v1/run` 三路径 SSE（事件名/顺序/终止条件逐条核对，事件流全录见
  §一 AC1/AC3）：错配兜底路径 7 事件序完整收束于 `run:done`、warn 告知在
  `node:start` 后 `node:done` 前；两条对照路径无告知 log、正常收束。契约
  （事件名与有序子序列）与 `packages/shared` SSE 契约一致（S02/S03 既有断言
  亦在本轮冒烟中全绿）。
- 验证服务器（PORT=3999）已停止、临时夹具文件已删除（零残留）。

## 五、观察项（非 BUG）

- **OBS-001 · Minor**：`tests/smoke/smoke-server.mjs` 增量 41 行
  （`git diff --numstat`：41/1），超 PRD 非功能要求 2 的「≤ 40 行」1 行；
  超出部分为注释与空行（断言主体三组各带 expected/actual/ctx 三元组），可读性
  合理，不构成缺陷，CLOSE 无需处理（如需口径从严可由 PM 在后续 PRD 模板中
  按注释行/净行数细分）。
- 夹具约定豁免的防回归护栏已内建（夹具旁注释「勿补 code」+ K01 断言名即缺陷
  语境），满足 PRD 风险 2。

## 六、与最近迭代重叠面回归确认

- 0012 的 SIGTERM 优雅停机断言、0013 的 gate s6/s7 均不在本轮改动射程
  （handlers.ts 上次触碰 0009、smoke-server.mjs 上次触碰 0012 的
  shutdown-sigterm.mjs 为不同文件）；本轮冒烟 56 断言全绿即含 0012 遗留的
  contracts/SIGTERM 面（CI 侧），gate 8 场景脚本全绿即含 0013 s6/s7 面。

## 七、验收命令清单（本轮 test-manager 实际执行）

```
git status --porcelain / git diff --stat / --numstat / --name-only / -- packages/shared/
npm run build:server              # ×3（AC1 前置 / 反演重建 / 还原重建）
npm run smoke:server              # ×4（AC1/AC3 全量、反演×2、还原复绿）
sha256sum apps/server/src/handlers.ts   # 演练前后各一，逐字一致
node dist/server.js (PORT=3999) + curl /api/v1/health /api/v1/models /api/v1/run ×3 路径
```
