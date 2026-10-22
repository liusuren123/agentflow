# JOURNAL · 迭代 0002 · BK-0002 后端 E2E 冒烟脚本（BUILD 阶段记录）

> 产出角色：code-developer（BUILD）· 2026-10-22 08:18
> 输入：`iterations/0002/PRD.md`（REQ-0002-01~08 / AC1–AC8）+ `iterations/0002/SPEC.md`
> （§2 模块边界 / §3 受影响文件 / §5 生命周期 / §6 断言清单 / §7 夹具 / §8 输出契约）。
> 运行环境：本机 Windows（win32 10.0.26300）Git Bash · Node v24（SPEC §1 口径）。

## 0. 门禁分工声明

按本轮派发契约：`npm run build` / `npm run gate` / `npm test` 与 git 提交由工作流脚本在
BUILD 之后**统一执行**，BUILD 未自行运行（与迭代 0001 JOURNAL §0 同一分工）。因此：

- 本文证据 = BUILD 亲自执行的实现记录 + 冒烟自测（第 2、3 节，命令原文 + 输出摘要）；
- SPEC §9 A/B/F/G（build / build:server / gate / test）不在本文伪造，以脚本门禁与 VERIFY
  `REPORT.md` 落档为准；
- SPEC §9 E（临时 `mv apps/server/dist` 负例）属 VERIFY 点位；本机等价负例已用零风险
  方式自测（第 3.3 节），正式 E 仍由 VERIFY 执行。

本项改动面 = `tests/` 新增两文件 + 根 `package.json` 一行 scripts（SPEC §3），零产品源码
改动，不在任何渲染路径上（PRD 触 UI 结论：否）。

## 1. 实现记录（SPEC §3 受影响文件清单逐条落实）

| 文件 | 动作 | 行数（wc -l 实测） | 内容 |
| --- | --- | --- | --- |
| `package.json` | 修改（+1 行） | — | scripts 增 `"smoke:server": "node tests/smoke/smoke-server.mjs"`，置于 `"test"` 之后（SPEC §3 原文位置）；devDependencies 未动 |
| `tests/smoke/lib.mjs` | 新增 | 239 | 基础设施层：`preflight`（P01/P02 存在性）· `getFreePort`（listen(0)）· `startServer`（`process.execPath + shell:false` spawn + 环形日志末 200 行 + 250ms 健康轮询上限 20s + 子进程提前退出 fail-fast）· `api`（fetch JSON 封装，15s 超时）· `openSse`（`\n\n` 分帧 / `data: ` 行 / 注释行跳过——与 util.ts:14-22 写出格式互逆；事件累积 + 唤醒等待 + `waitEnd` 收束等待）· `waitFor` · `deepEqual` · `Checker`（ok/eq/deepEq/includes；`ok` 失败抛 `SmokeFailError` fail-fast，`check` 只记录不抛供 finally 用） |
| `tests/smoke/smoke-server.mjs` | 新增 | 258 | 编排层：夹具三件（WF / WFMIN / WFAPPR，字段与 SPEC §7 逐字一致，params 显式给出）· 步骤 P→H→W→N→S→R→D→C · SIGINT/SIGBREAK → 同一清理后 exit 130 · 杀进程 kill→3s→SIGKILL→1s · 汇总行 + 退出码契约 |

两文件均 ≤400 行（AGENTS 硬性约定 4；SPEC §2 边界规则 3 的拆分预案未触发）。

**边界规则自查（SPEC §2 硬性）**：① 触达被测系统仅两条通道——全部断言走
`http://127.0.0.1:<port>/api/v1/*` 公共 HTTP 契约，产物触达仅 P01/P02 existsSync；
两文件零 import 产品代码（含 `@agentflow/shared`）。② 不读写 `data/agentflow.db`，
清理全走 DELETE 端点。③ 无新依赖（node:child_process / node:fs / node:net / node:path /
node:url + 全局 fetch）。

## 2. 实现期两处补充判定（不改 SPEC 语义，逐条说明依据）

1. **C01 对 404 容忍（与 C02 同语义）**：SPEC C01 措辞「先试 DELETE；若 409 则 stop 后
   重删；删除结果如实输出」未列举可接受状态码。实测首跑暴露：D06 在正例路径已删除
   approval run（SPEC §6 D06 本身即「run 收尾后 DELETE → {ok:true}」），finally 对同一
   id 再 DELETE 必然 404——该 404 正是正例路径的期望终态，与 C02「已删则 404 容忍，
   不算失败」同语义。落点：C01 接受 200/404，409 走 stop+重删，其余状态记 FAIL；
   零残留的机器核对由 C03 承担（SPEC 原意不变）。
2. **D 组在 run:done 后先 `waitEnd` 再 D05/D06**：server.ts:120-121 先 `delete runsById`
   再 `res.end()`——客户端观察到流收束即保证 run 已不活动，消除 D06 DELETE 在
   「事件已见 / 注册表未删」窗口内的 409/200 竞态（PRD 风险 3「不猜时序、以事件为门」
   原则在删除侧的对称应用）。`ended2` 并入 D05 断言条件如实呈现。

另：SPEC 头注「27 条」与 §6 枚举数不一致已在并发 SPEC 会话修正为 32（STATE.md
last_result，08:12）；本实现按 §6 全枚举落地：P2+H1+W7+N3+S5+R3+D7+C4=32 个断言 id，
其中 C01 按清理清单逐 run 输出（正例路径 2 个 runId → 汇总 33 行 PASS）。

## 3. 自测证据（BUILD 亲自执行，命令原文 + 输出摘要）

前置：本机 `apps/web/dist/index.html` 与 `apps/server/dist/server.js` 均在位
（SPEC §1 已核实，本次 `ls` 复认），未运行 build。

### 3.1 正例 + 幂等连跑（SPEC §9 C/D 口径；AC1/AC7）

```console
$ npm run smoke:server        （第一跑）
PASS P01 … PASS D07 … PASS C01 ×2 … PASS C02 … PASS C03 … PASS C04
==== smoke:server：33 passed / 0 failed ====        EXIT=0

$ npm run smoke:server        （紧接第二跑，幂等/可重复）
==== smoke:server：33 passed / 0 failed ====        EXIT=0
```

两跑全绿：P2+H1+W7+N3+S5+R3+D7+C 组全数 PASS；C03 确认 workflows/runs 列表零自建残留
（开发库既有行未触碰——断言全程只针对自建 id）。首跑曾出现 `FAIL C01 … actual: 404`
（approval run 已被 D06 删除），即第 2 节判定 1 的由来；修正后两连跑全绿。

### 3.2 负例：preflight 缺产物 → 非 0 退出 + 可操作指引（REQ-0002-02 / AC1 负例）

原计划按 SPEC §9 E 临时 `mv apps/server/dist` 自测，被 Mimosa 提交前钩子拦截
（判定为经 Bash 写 dist 产物）；按「禁止绕过」未重试，改用零风险等价法：将两脚本
复制到临时目录运行（lib.mjs 的 REPO_ROOT 按自身路径解析，临时目录下无 dist）：

```console
$ mkdir -p "$TMPDIR/smoke-neg/tests/smoke" && cp tests/smoke/*.mjs …
$ node "$TMPDIR/smoke-neg/tests/smoke/smoke-server.mjs"
FAIL P01 apps/web/dist/index.html 在位 | expected: 存在 |
  actual: 缺失（请先在仓库根执行 npm run build） | ctx: file: …\smoke-neg\apps\web\dist\index.html
（fail-fast：断言 P01 失败，停止后续断言，进入清理）
SKIP C01-C04（无服务实例，无可清理对象）
==== smoke:server：0 passed / 1 failed ====         EXIT=1
```

负例契约成立：缺失 → 指引文案 + 不起进程 + exit 1。正式 §9 E（真 mv 产物）仍归 VERIFY。

### 3.3 未执行项（如实）

- `npm run build` / `npm run build:server` / `npm run gate` / `npm test`：按派发契约未运行，
  归工作流脚本门禁；本文全部断言基于现存 dist 产物验证。
- SPEC §9 H 人工复核点位（另起服务查 `smoke-` 前缀残留）：未执行；C03 已在脚本内机核，
  人工复核归 VERIFY。

## 4. 改动面终核（AC8 防误触前置自查）

`git status --short`（08:18 实测）：`M package.json`、`?? tests/smoke/`、
`M docs/evolution/STATE.md`、`?? docs/evolution/iterations/0002/`——与 SPEC §3 受影响文件
清单 + 阶段产物一致；`apps/**`、`packages/**`、`tools/pixel-gate/**`、CI 配置、
CONSTITUTION/AGENTS 零字节改动。gate 复跑归脚本门禁（SPEC §9-F）。

## 5. 未尽事项与移交

- 门禁 build/gate/test 与产品提交（`package.json` + `tests/smoke/`，Conventional Commits）：
  工作流脚本统一执行。
- VERIFY 按 SPEC §9 A–H 逐条验收（含正式负例 E 与人工复核 H）。
- STATE.md：phase 已置 `BUILD`（本次，08:18）；后续按契约由脚本推进 VERIFY/CLOSE。

---

## 6. BUILD 复核轮（并发会话交叉核实，2026-10-22 08:24）

> 产出角色：code-developer（BUILD 复核）· 与 §1-§5 首稿为不同会话（同 PRD/SPEC 的并发
> 首稿处理模式：独立复核 → 修正 → 采纳）。输入：首稿实现 + SPEC §2/§5-§8 逐条比对。

### 6.1 复核结论

首稿结构与断言面贴合 SPEC（§7 夹具逐字一致、32 断言 id 全落地、H01 已有命名 FAIL 模式），
但发现 **3 处缺陷 + 2 处断言强度不足**，已全部修复（修复后 lib.mjs 243 行 / smoke-server.mjs
288 行，仍 ≤400）：

| # | 位置 | 问题 | 修复 |
| --- | --- | --- | --- |
| 1 | `lib.mjs` startServer 健康超时分支 | 超时直接 throw，**未杀存活子进程**——违反 REQ-0002-02「成败皆然终止、释放端口」（首稿自测的负例只覆盖 preflight 缺失与子进程自退两路径，未覆盖「存活但不健康」） | throw 前补 `child.kill('SIGKILL')` |
| 2 | `smoke-server.mjs` C04 | 先空等 3s 才 SIGKILL、从未先 `kill()`——违背 SPEC §5.6 时序（kill → 3s → SIGKILL → 1s）且每跑白耗 3s | 调整为先 `kill()` 再竞速等待 |
| 3 | `smoke-server.mjs` doCleanup | 清理 api 无守卫：服务中途死亡时 `fetch` 抛出 → finally 抛出 → §8 汇总行永不打印 | `safeApi` 逐调用兜底记 0 + finally 外层 try/catch + `CLEAN` 入表 falsy id 防御（`id.slice` TypeError） |
| 4 | S01 | 只断言「出现 run:accepted」，未断言其为**流首**事件（SPEC 措辞「流首事件」） | 条件加 `sse.events[0]?.type === 'run:accepted'` |
| 5 | S01/D01 等待超时 | 超时表现为无名 `ERROR`（REQ-0002-08 要求输出失败断言名） | 与 H01 同模式：catch → 命名 `C.fail` + `SmokeFailError` fail-fast |

### 6.2 修复后自测证据（本会话亲自执行，命令原文）

```console
$ npm run smoke:server        （第一跑，修复后）
==== smoke:server：33 passed / 0 failed ====        EXIT=0
$ npm run smoke:server        （紧接第二跑，幂等）
==== smoke:server：33 passed / 0 failed ====        EXIT=0
```

- 两跑 P2+H1+W7+N3+S5+R3+D7+C 组全数 PASS（33 行与 §3.1 首稿口径一致）。
- 进程泄漏核对：跑前/跑后 `tasklist` node.exe PID 集合差集为**空**（无泄漏）。
- 行数核对：`wc -l` → lib.mjs 243 / smoke-server.mjs 288（≤400，AGENTS 硬性约定 4）。
- **缺陷 1 故障注入验证**（临时脚本置于仓库外临时目录，用后即删）：打桩
  `globalThis.fetch` 恒拒绝后调 `startServer(port, 1500)` → 输出
  `threw=true | msg=健康等待超时（1500ms） | elapsed=1560ms` +
  `OK: port closed — child was killed before throw`，EXIT=0——超时路径先杀子进程
  再抛错的行为得到实证（不打桩时该路径需真实故障才触达）。
- 缺陷 3 的兜底分支（服务死亡中清理）无安全注入手段，属代码级复核，未运行实证；
  缺陷 4/5 的正例分支已随两跑实证，超时分支属代码级复核。

### 6.3 未执行项（如实）

- `npm run build` / `npm run build:server` / `npm run gate` / `npm test`：按派发契约
  未运行，归工作流脚本门禁（与 §0 分工一致）。
- SPEC §9 E 负例：不重复 §3.2 的临时目录等价法（该证据已足以覆盖 preflight 负例
  契约；且 Mimosa 钩子拦截对 dist 的写操作，正式 mv 法留归 VERIFY）。
- STATE.md：`updated` 时间戳刷新至本复核轮（phase 仍为 BUILD，未变）。
