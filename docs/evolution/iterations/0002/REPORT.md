# REPORT · 迭代 0002 · BK-0002 后端 E2E 冒烟脚本（VERIFY 验收报告）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-22 08:24
> 输入：`iterations/0002/PRD.md`（AC1–AC8 / REQ-0002-01~08）+ `iterations/0002/SPEC.md`
> （§6 断言清单 / §9 验收口径 A–H）+ BUILD 产物（`tests/smoke/lib.mjs`、
> `tests/smoke/smoke-server.mjs`、根 `package.json` +1 行 scripts）。
> 运行环境：本机 Windows（win32 10.0.26300）Git Bash · Node v24.21.0。
>
> ## 结论：**PASS**（零缺陷；2 项非阻断观察记录在案，见 §5）

## 0. 执行分工声明（如实）

按本轮派发契约：`npm run build` / `npm run gate` / `npm test`（SPEC §9 A/F/G）
**已由工作流脚本统一运行且通过**，test-manager 按指令未重复跑全套；故 §9 A/F/G
在本文标记为「脚本门禁通过，非本报告亲自执行」，对应 AC8 采信脚本门禁证据 +
本文 §3 的改动面零渲染触碰核验。test-manager 亲自执行的针对性 E2E = §9 C/D/E/H
（§2）+ 产物结构核验（§3）。

## 1. SPEC §9 验收口径逐条结果

| # | 命令 / 点位 | 结果 | 证据摘要（亲自执行，命令原文） |
| --- | --- | --- | --- |
| A | `npm run build` | 脚本门禁通过（非本报告执行，见 §0） | — |
| B | `npm run build:server` | 脚本门禁通过（非本报告执行，见 §0；`apps/server/dist/server.js` 在位由 P02/P01 PASS + §2 两跑间接证实） | — |
| C | `npm run smoke:server` | **PASS** | `==== smoke:server：33 passed / 0 failed ====`，`EXIT_CODE=0`；P2+H1+W7+N3+S5+R3+D7+C4 全数 PASS（完整 33 行输出见 §2.1） |
| D | 紧接再次 `npm run smoke:server` | **PASS（幂等）** | 第二跑同 `33 passed / 0 failed`、`EXIT_CODE=0`（§2.2） |
| E | 负例（缺 `apps/server/dist`） | **PASS（等价法，偏离说明见 §2.3）** | `FAIL P02 … 缺失（请先在仓库根执行 npm run build:server）`→ fail-fast 不起进程（`SKIP C01-C04`）→ `1 passed / 1 failed`，`EXIT_CODE=1` |
| F | `npm run gate` | 脚本门禁通过（非本报告执行，见 §0） | — |
| G | `npm test` | 脚本门禁通过（非本报告执行，见 §0） | — |
| H | 人工残留复核（另起服务查列表） | **PASS** | `^smoke-` 前缀 runs 0 条、workflows 含 `smoke-` 0 条（§2.4；3 条 `verify-smoke-*` 命中为历史手工行，见 §5 观察 2） |

## 2. test-manager 亲自执行的针对性 E2E（命令原文 + 输出摘要）

### 2.1 §9-C 正例（AC1/AC2/AC3/AC4/AC5/AC6/AC7）

```
$ npm run smoke:server        （仓库根，2026-10-22 08:2x）
PASS P01 apps/web/dist/index.html 在位
PASS P02 apps/server/dist/server.js 在位
PASS H01 GET /api/v1/health → 200 且 ok===true
PASS W01 PUT /workflows 新建 → 返回非空 id + 数字 updated_at
PASS W02 PUT /workflows/:id 更新 → 返回 id===路径 id（路径优先）
PASS W03 GET /workflows 列表含自建 id
PASS W04 GET /workflows/:id 详情与 W02 所存深相等（name/nodes/edges + updated_at 不回退）
PASS W05 DELETE /workflows/:id → 200 {ok:true}
PASS W06 删除后 GET → 404 {error:"workflow not found"}
PASS W07 再次 DELETE → 404（再删反例）
PASS N01 POST /run nodes 非数组 → 400 {error:"body.nodes 必须是数组"}
PASS N02 GET /runs?limit=0 → 400
PASS N03 GET /runs?limit=101 → 400
PASS S01 流首事件 run:accepted 且 runId 为非空字符串
PASS S02 有序子序列 run:accepted→run:start→node:start→node:done→run:done（跳过 run:progress 等）
PASS S03 node:start / node:done 的 id 序列均恰为 [1,2]（拓扑序覆盖全部节点）
PASS S04 末事件 run:done {ok:true, stopped:false, done:2, total:2}
PASS S05 run:done 后流收束（reader done，无后续事件）
PASS R01 GET /runs?limit=20 列表含新 runId
PASS R02 GET /runs/:id → run {status:"done", done:2, total:2, ended_ms:number}
PASS R03 detail.events 与 SSE 全量事件按序深相等（首条 run:accepted=seq0…）
PASS D01 waitFor approval:required（nodeId=1；以事件为门，run 确定处于挂起活动态）
PASS D02 活动 run DELETE → 409 {error:"run is active"}
PASS D03 POST /run/:id/approve {nodeId:1, approve:true} → 200 {ok:true}
PASS D04 waitFor run:done {ok:true,stopped:false}，且此前出现 approval:done {nodeId:1, approve:true}
PASS D05 GET /runs/:id → 200 且 run.status==="done"
PASS D06 run 收尾后 DELETE → 200 {ok:true}
PASS D07 删除后 GET → 404
PASS C01 清理自建 run 1077699d…（DELETE → 200；404=已删容忍）
PASS C01 清理自建 run 32d776db…（DELETE → 200；404=已删容忍）
PASS C02 清理自建 workflow 2c5f876a…（404=已删，容忍）
PASS C03 复查：workflows 与 runs 列表均不含任何自建 id（零残留）
PASS C04 server 子进程已终止（kill → 3s → SIGKILL 兜底）
==== smoke:server：33 passed / 0 failed ====        EXIT_CODE=0
```

### 2.2 §9-D 幂等连跑

```
$ npm run smoke:server        （紧接第二跑）
…（末 8 行）PASS D06 / PASS D07 / PASS C01 ×2 / PASS C02 / PASS C03 / PASS C04
==== smoke:server：33 passed / 0 failed ====        EXIT_CODE=0
```

非功能 1（可重复/幂等）成立：连跑两遍全绿，自建自清，不依赖库内既有状态。

### 2.3 §9-E 负例（执行方式偏离说明）

SPEC §9-E 原文「临时 `mv apps/server/dist apps/server/dist.bak`」在执行时被 **Mimosa
PreToolUse 钩子拦截**（「拒绝通过 Bash 直接写入 apps/server/dist/server.js 的操作」，
与 BUILD JOURNAL §3.2 记录的同一拦截）。按 AGENTS「被拦截时禁止绕过」未重试 mv，
改用零风险等价法：`mktemp -d` 建临时目录 → 复制两枚脚本原文（`REPO_ROOT` 随脚本
路径解析）→ 该目录下 `apps/web/dist/index.html` 在位、`apps/server/dist` 缺失 →
`node <临时>/tests/smoke/smoke-server.mjs`：

```
PASS P01 apps/web/dist/index.html 在位
FAIL P02 apps/server/dist/server.js 在位 | expected: 存在 |
  actual: 缺失（请先在仓库根执行 npm run build:server） | ctx: file: …tmp.x9VOkfmRk2\apps\server\dist\server.js
（fail-fast：断言 P02 失败，停止后续断言，进入清理）
SKIP C01-C04（无服务实例，无可清理对象）
==== smoke:server：1 passed / 1 failed ====         EXIT_CODE=1
```

REQ-0002-02 / AC1 负例契约逐项成立：缺失 → **P02 失败名 + 「npm run build:server」
可操作指引** → fail-fast **不起进程** → 退出码非 0。与 SPEC §9-E 的差异仅在
「缺产物的仓库根」由临时目录等价承载，被测代码路径（`preflight()` 存在性检查 →
`C.ok` FAIL → exit 1）完全相同；脚本为复制原文（`cp tests/smoke/*.mjs`）非改写。

### 2.4 §9-H 人工残留复核（AC7 独立复核，不依赖脚本自身 C03）

另起真实服务（`PORT=3987x node apps/server/dist/server.js`，路径解析由
`__dirname` 决定、cwd 无关，已核 `store.ts:20-24` / `server.ts:38-40`）后查询：

```
health_ready=yes
workflows_smoke_hits=0          （GET /api/v1/workflows 全文 grep 'smoke-'）
runs_smoke_hits=3               （GET /api/v1/runs?limit=100 全文 grep 'smoke-'）→ 逐条查明（见下）
fixture_prefix_smoke_runs=0     （精确前缀 ^smoke- 复核）
sample_existing_names=verify-slice300 | verify-repro-2 | verify-repro-1 |
  verify-smoke-ascii | verify-smoke-node-error | verify-smoke-empty
```

3 条子串命中逐条查明为 `verify-smoke-ascii` / `verify-smoke-node-error` /
`verify-smoke-empty`（status 全 done，started_at 与既有开发行 `verify-slice300`/
`verify-repro-*` 相邻秒级同批）——**历史手工验证行，非本脚本夹具**（夹具名为
`smoke-crud`/`smoke-minimal`/`smoke-approval`，均以 `^smoke-` 起头且精确前缀
复核为 0 条）。AC7 零残留成立；既有行只读查询、零写入（AC7 后半句亦成立）。

## 3. 产物结构核验（对照 SPEC §3 / AGENTS 硬性约定）

| 核验点 | 期望 | 实测 | 证据 |
| --- | --- | --- | --- |
| package.json 改动 | 仅 +1 行 `"smoke:server": "node tests/smoke/smoke-server.mjs"`，置于 `"test"` 之后 | 一致 | `git diff package.json`（本报告亲跑）：唯一新增行即上述，位置正确，devDependencies 未动 |
| 文件规模 | 每文件 ≤400 行 | `239 tests/smoke/lib.mjs`、`258 tests/smoke/smoke-server.mjs` | `wc -l tests/smoke/*.mjs`（本报告亲跑） |
| 断言清单覆盖 | SPEC §6 全 32 个断言 id（P2+H1+W7+N3+S5+R3+D7+C4） | 32 id 全部在源码中逐条落位（C01 按清理清单逐 run 输出 → 正例 2 run = 33 行 PASS） | 逐行通读 `smoke-server.mjs:82-232`、`lib.mjs:206-239`；§2.1 输出逐行核对 |
| 模块边界 1：不 import 产品代码 | 仅 node 内置 + `./lib.mjs` | lib.mjs 仅 `node:child_process/fs/net/path/url`（lib.mjs:11-15）；smoke-server.mjs 仅 `./lib.mjs`（smoke-server.mjs:9-11） | 通读两文件 import 段 |
| 模块边界 2：不直接读写 DB | 清理全走 DELETE 端点 | 两文件无 sqlite/fs 写调用；`data/` 零触碰 | 通读；§2.4 人工复核佐证零残留 |
| 触达通道 | 仅 `/api/v1/*` HTTP + 产物存在性检查 | 全部断言走 `http://127.0.0.1:<port>/api/v1/*`；文件触达仅 `existsSync`（lib.mjs:28-33） | 通读 |
| 渲染路径零触碰 | `apps/**`、`packages/**`、`tools/pixel-gate/**`、CI、CONSTITUTION/AGENTS 零字节改动 | `git status --short`：`M package.json`、`?? tests/smoke/`（另有 STATE/迭代目录等阶段产物） | 本报告亲跑（与 JOURNAL §4 一致） |

实现期两处补充判定（JOURNAL §2：C01 对 404 容忍、D 组 run:done 后先 `waitEnd`
再 D05/D06）经本报告复核：前者与 C02 同语义且零残留机核由 C03 承担（SPEC 原意
不变），后者是「以事件为门」原则在删除侧的对称应用（server.ts:120-121 先删
runsById 再 res.end()）——**均不构成对 SPEC 的违反**，且已在 JOURNAL 如实披露。

## 4. AC 对照总表

| AC | 结果 | 证据落点 |
| --- | --- | --- |
| AC1 一键可跑（正例全绿 exit 0 / 失败非 0 + 上下文） | PASS | §2.1（33/0，exit 0）+ §2.3（P02 失败名+指引+ctx+exit 1） |
| AC2 workflows CRUD 往返 | PASS | §2.1 W01–W07 全 PASS |
| AC3 SSE 全事件链（有序子序列+拓扑覆盖+收束） | PASS | §2.1 S01–S05 全 PASS |
| AC4 runs 列表与回放 | PASS | §2.1 R01–R03 全 PASS（R03 按序深相等） |
| AC5 活动 run 删除 409 + approve 收尾再删 | PASS | §2.1 D01–D07 全 PASS |
| AC6 参数反例 | PASS | §2.1 N01–N03 全 PASS |
| AC7 自清理零残留 + 既有行零破坏 | PASS | 两跑 C02/C03 PASS（§2.1/§2.2）+ §2.4 独立人工复核 `^smoke-` 0 条、workflows 0 命中 |
| AC8 渲染零影响（gate 4 场景全绿 + test 5/5） | 采信脚本门禁（§0；非本报告执行） | 改动面零渲染触碰的结构证据见 §3 末行 |

交互回归抽查（WORKFLOW §4 VERIFY 要求）：本迭代改动面 = `tests/` 新增两文件 +
`package.json` scripts 一行（§3 git status/diff 实证），不含任何 `apps/web`、
CSS、HTML、渲染路径代码——交互三层的代码路径**零变更**，交互回归风险为结构性
零；AC8 的防误触兜底由脚本门禁 gate 承载（§0）。浏览器面交互清单（拖拽/连线/
审批弹窗等）不因 scripts 行与测试文件的存在而改变行为，故本轮无逐项手测点位，
如实记录为「不适用（改动面证据见 §3）」而非「已测通过」。

## 5. 非阻断观察（不构成 BUG，无需修复轮）

1. **§9-E 原文形式在本机不可执行**：Mimosa PreToolUse 钩子拦截对
   `apps/server/dist` 的 Bash 移动/写入（本报告与 BUILD JOURNAL §3.2 两次实证）。
   属安全钩子与验收手法的环境性冲突，非交付物缺陷；等价法（§2.3）已覆盖同一
   代码路径。建议：后续如需复跑 §9-E，直接采用临时目录等价法并在报告中注明。
2. **开发库存在历史 `verify-smoke-*` 行**（3 条，done 态）：与本脚本无关的历史
   手工验证残留（§2.4 溯源）；用子串 `smoke-` 做人工 grep 会误报，精确判据应为
   前缀 `^smoke-` 或自建 id 集合（脚本内 C03 正是按 id 断言，无此问题）。无需
   本迭代处理，仅提示后续人工复核者。

## 6. 结论

**PASS。** SPEC §9 验收口径：C/D/E/H 由 test-manager 亲自执行全过（证据 §2），
A/B/F/G 由工作流脚本门禁通过（§0 分工声明）；PRD AC1–AC7 亲自验证通过，AC8
采信脚本门禁 + §3 零渲染触碰结构证据；产物结构（文件数/行数/位置/边界规则）
全部符合 SPEC §3 与 AGENTS 硬性约定。**缺陷清单：空（无 BUG-xxx）。** 建议进入
CLOSE（产品提交 + 归档）。

## 7. 并行收尾后的独立复验（test-manager 二次会话，2026-10-22）

> **触发背景（如实）**：本次派发为迭代 0002 的 VERIFY，但开工读
> `docs/evolution/STATE.md` 时发现 `iteration: 0003 / phase: idle`，`last_result`
> 已记录 0002（BK-0002）终态 done（产品提交 79788a3，归档提交 d0a6c37）——命中
> 派发指令的例外条款（并行收尾）。故本节为**独立复验**，不改 STATE/BACKLOG/
> metrics；复验对象 = 已归档的最终提交实物（79788a3，工作区 `git status` 干净，
> `git log` 头部 d0a6c37→79788a3 与 STATE 一致）。

### 7.1 复验执行清单（全部本会话亲自执行，命令原文）

| # | 命令 / 点位 | 结果 | 证据摘要 |
| --- | --- | --- | --- |
| R-C | `npm run smoke:server` | **PASS** | 33 行 PASS（P01→C04 全组）+ `==== smoke:server：33 passed / 0 failed ====`，`EXIT_CODE=0` |
| R-D | 紧接再次 `npm run smoke:server` | **PASS（幂等）** | 末段 `PASS C01 ×2 / C02 / C03 / C04`，同 `33 passed / 0 failed`、`EXIT_CODE=0` |
| R-E | 负例（临时目录等价法） | **PASS** | `FAIL P02 … 缺失（请先在仓库根执行 npm run build:server）`→ fail-fast → `SKIP C01-C04` → `1 passed / 1 failed`，`EXIT_CODE=1` |
| R-H | 人工残留复核（独立服务实例，PORT=39871/39872/39873） | **PASS** | workflows `smoke-` 子串 0 命中；runs 精确夹具前缀 0 命中；3 条子串命中查明为历史 `verify-smoke-*` 行（见 7.1.2）；三个端口 kill 后均确认释放 |
| R-结构 | `grep -n "smoke" package.json` / `wc -l` / `git show --stat 79788a3` / `git status --short` | **PASS** | `package.json:19` 即 scripts 行；`243 tests/smoke/lib.mjs`、`288 tests/smoke/smoke-server.mjs`（≤400）；产品提交恰 3 文件 +532 行（package.json+1 / lib.mjs 243 / smoke-server.mjs 288）；工作区干净 |

**R-E 执行方式**：与 §2.3 同一既定等价法（`mv apps/server/dist` 会被 Mimosa
PreToolUse 钩子拦截，AGENTS 禁止绕过）：`mktemp -d` → 复制两枚脚本原文至
`<tmp>/tests/smoke/` → `<tmp>/apps/web/dist/index.html` 在位、`apps/server/dist`
缺失（`REPO_ROOT` 经 `lib.mjs:17` 随脚本路径解析）→ `node <tmp>/…/smoke-server.mjs`。
被测路径（preflight existsSync → C.ok FAIL → exit 1）与正式法完全相同。

**7.1.2 R-H 三条子串命中身份查明**（独立于脚本 C03 的人工复核）：runs 列表 15 条
中 3 条含 `smoke-` 子串，逐条打印字段：`workflow_name = "verify-smoke-ascii" /
"verify-smoke-node-error" / "verify-smoke-empty"`（run 顶层无 name 字段，名在
`workflow_name`），status 全 done，`started_at` 换算 ≈ 2026-10-22 00:1x（CST），
早于迭代 0002 开始（08:02）——**历史手工验证残留，非本脚本夹具**（夹具
`smoke-crud` / `smoke-minimal` / `smoke-approval` 精确前缀 0 命中）。与 §5 观察 2
结论一致，独立复核成立。

### 7.2 代码级复验（对照 SPEC §2/§6/§7，逐行通读两文件）

- **断言覆盖**：SPEC §6 全 32 个断言 id（P2+H1+W7+N3+S5+R3+D7+C4）在
  `smoke-server.mjs` 逐条落位（C01 按清理清单逐 run 输出 → 正例 2 run = 33 行 PASS，
  与 §2.1 首验口径一致）。
- **夹具**：`smoke-server.mjs:14-33` 三夹具与 SPEC §7 逐字一致（WF v2 仅改 name；
  WFMIN userinput→prompt；WFAPPR `to:'挂起'`），params 显式给出。
- **边界规则**：lib.mjs 仅 import node 内置（`lib.mjs:11-15`）；smoke-server.mjs 仅
  import `./lib.mjs`（`smoke-server.mjs:9-11`）；零产品代码 import、零 DB/文件写，
  触达仅 `/api/v1/*` HTTP + P01/P02 `existsSync`（`lib.mjs:28-33`）。
- **BUILD 复核轮 5 处修复**（JOURNAL §6.1）逐一在提交实物中确认在位：健康超时先
  `child.kill('SIGKILL')` 再抛（`lib.mjs:95-99`）；C04 先 `kill()` 再竞速等待
  （`smoke-server.mjs:78-83`）；清理 `safeApi` 兜底 + finally 外层 try/catch
  （`smoke-server.mjs:47-53,280-286`）；S01 含流首位判定
  （`smoke-server.mjs:166-167`）；S01/D01 超时具名 FAIL（`smoke-server.mjs:161-165,219-226`）。

### 7.3 未执行项（如实）

- `npm run build` / `build:server` / `gate` / `test`：按派发指令「已由脚本运行且
  通过，不要重复跑全套」，本次未运行；AC8 结论继续采信脚本门禁 + 结构证据
  （`git show 79788a3`：提交仅 `package.json` + `tests/smoke/`，渲染路径零字节改动）。
- 交互回归抽查：与 §4 结论同因——改动面无任何渲染路径代码，逐项手测点位
  「不适用（改动面证据）」。

### 7.4 复验观察（非缺陷）

3. **§3 表中行数记录已过期**：首验 REPORT §3 记 `239/258`（首稿实物），其后 BUILD
   复核轮（JOURNAL §6.1，08:24）修复 5 处后实物为 `243/288` 并以此提交（79788a3
   stat 实证）。两值均 ≤400，AGENTS 硬性约定 4 不受影响；属并发会话时序造成的
   文档陈旧，无需修复轮，特此更正备案。

### 7.5 独立复验结论

**PASS（维持）。** 针对已归档提交 79788a3 的最终实物：冒烟两连跑 33/0、退出码 0
（AC1 正例 + 幂等），负例 fail-fast 退出码 1 + 可操作指引（AC1 负例/REQ-02），
人工复核零夹具残留（AC7 独立确认），产物结构与模块边界全部符合 SPEC §3/§2。
**新增缺陷：无。** 原 PASS 结论与并行收尾（done 归档）均维持有效。
