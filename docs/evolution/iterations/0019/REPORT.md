# REPORT · 迭代 0019 · BK-0011 悬挂 run 启动终结标记 · VERIFY

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 19:10。
> 输入：`PRD.md`（AC1~AC7 / REQ-0011-01~04，S 项 skipSpec 内嵌验收口径）+
> `JOURNAL.md`（BUILD 自检与 §2 修复前证据）。
> 门禁分工：build / gate / test 由脚本统一执行且通过（派发指令载明；PRD AC6
> 明文按 0012/0014/0016/0017/0018 先例采信，VERIFY 不复跑全套）。本阶段亲跑：
> `npm run smoke:server` ×3 轮（AC3 全量 / AC4 反演红 / AC4 复绿）、独立实例
> E2E ×2（AC1 终态 API 断言 + AC2 干净库静默）、better-sqlite3 只读探针 ×4
> （修复前采样 / AC1 后验 / AC2 前后快照）、AC4 源码临时摘除→逐字还原→diff
> 零残留、AC5 numstat/禁止路径核对、AC7 指针抽样 7 条、交互回归抽查（历史
> 面板数据链路）。
> 环境：Windows 10（win32）· Node v24.21.0 · 仓库根执行。

## 总结论

**PASS —— 产品缺陷 0；1 个 Minor BUG（BUG-0001：PRD 指针 `lib.mjs:12-13`
行号笔误，内容真实存在于 `lib.mjs:6-7`，纯文档级、零代码影响、不阻塞，建议
治理日顺手修正）；PRD 风险 1（双实例共用 DB 误标）按声明的已知边界确认在案
不测。**

核心特性链路全绿：**崩溃 → 重启 → 悬挂 run 收敛 `stopped`，零伪造事件、
零虚构时长**。开发库真实悬挂 run `161ce4ff…`（修复前本阶段亲采：running /
done=0 / total=8 / 22 事件 / 止于 approval:required，与 JOURNAL §2 逐字段
一致）经 Z02 重启实例扫尾收敛，独立实例 `GET /api/v1/runs/161ce4ff…` →
200 `{status:'stopped', ended_ms:null, done:0, total:8, events:22, 末事件
approval:required}`，事件行数前后不变（无合成终结事件）。冒烟全量
**89 passed / 0 failed**（exit 0）。反演红绿双向成立：摘除扫尾 →
**FAIL Z03（actual `status:"running"`、扫尾日志=false）+ exit 1**；逐字还原
→ **89/0 + exit 0**；`git diff` 与反演前逐字节相同（零残留）。干净库重启
幂等静默（health 200、无「启动扫尾」warn、by_status 前后不变）。工作区改动
恰白名单三路径 + STATE/迭代目录机制件，禁止路径 diff 0 行、lock 零变化。

## 验收矩阵（逐 AC）

| AC | 判定 | 证据（本阶段亲跑/亲读） |
| --- | --- | --- |
| AC1 真实悬挂 run 收敛 | **PASS** | **修复前采样（本阶段 19:0x，smoke 首跑前亲采，better-sqlite3 readonly）**：`161ce4ff-0b87-40f2-ad4f-aba461975fdc` = `{status:"running", started_at:1792570720608, ended_ms:null, done:0, total:8}`，`run_events` 22 行 / last_seq=21 / 末事件 `approval:required`（nodeId=7「转人工审批」）——与 JOURNAL §2 BUILD 采样逐字段一致（时序说明：PRD 预期 VERIFY 在 BUILD 前采样，实际 BUILD 已先行，本阶段恰在脚本门禁首跑 smoke 之前完成等效采样，`running_count=1` 证明当时扫尾尚未触发过）。**When**：`npm run smoke:server`（Z02 重启实例即触发，见 AC3）→ **后验探针**：`{status:"stopped", ended_ms:null, done:0, total:8}`。**Then（经 API 断言，独立 dist 实例 /tmp/verify0019/ac1ac2.mjs 亲跑）**：`GET /api/v1/runs/161ce4ff…` → **200** `{run:{status:'stopped', ended_ms:null, done:0, total:8}, events:22 条, last_event_type:'approval:required'}`；事件行数前后 **22===22**（`COUNT(*)` + `MAX(seq)` 前后均为 22/21）——**无合成终结事件、ended_ms/done/total 零回填**（「不伪造历史」双证） |
| AC2 幂等与零命中静默 | **PASS** | Given（冒烟全量跑完后探针）：`by_status = {done:22, stopped:4}`（running 0 行；161ce4ff 收敛使 stopped 3→4，Z 组自建 run 已被 Z04 DELETE）。When（独立实例再启动，同 ac1ac2.mjs）：`/api/v1/health` → **200 `{ok:true, engine:'agentflow-server'}`**。Then：子进程全量 stdout/stderr `includes('启动扫尾')` = **false**（warn 行过滤亦为空）——零命中静默不打；`by_status_after = {done:22, stopped:4}` 与重启前**逐项相同**——既有 runs 行状态不被触碰；实例 SIGKILL 收场无残留 |
| AC3 冒烟全量 | **PASS** | `npm run smoke:server` 亲跑 → `==== smoke:server：89 passed / 0 failed ====`、**exit 0**。Z 组恰 4 条新增断言（diff 亲数：Z01~Z04 各 1 个 `C.ok`）全 PASS：Z01（挂起态 GET 200 `{status:'running', ended_ms:null}` + events 采样 N≥1）、Z02（`kill('SIGKILL')` → exitPromise 到达 + 同端口重启 health 200）、Z03（`status:'stopped'` + ended_ms:null + done/total 保持击杀前值 + events 仍恰 N 条 + ringLog 含「启动扫尾」）、Z04（DELETE 200 无 409 + GET 404）。既有断言 0 failed = 零回退（输出亲见 R02 `status:'done'`、D02 活动 DELETE 409、D06/G01-G10/V01-V09/K/E/C01-C04 全 PASS；计数口径：89 = 85 既有动态断言（C01 逐自建 run 计数随运行浮动）+ Z 组 4，满足「既有全绿 + Z ≥4」；89 ≥ AGENTS.md 84 口径，差额为 C01 动态行） |
| AC4 反演红绿双向 | **PASS** | **红**：Edit 临时注释 server.ts 扫尾调用块（`const swept = sweepDanglingRuns(); if…warn` 4 行）→ `npm run build:server` → `npm run smoke:server > log; echo $?` → **REAL_EXIT=1**，`FAIL Z03 … actual: 200 {"status":"running",…} events=4 扫尾日志=false`（汇总 87 passed / 1 failed；较复绿轮 −2 = Z03 转 FAIL + Z04 fail-fast 未达，自洽）——恰为 PRD 预期「Z03 断言 FAIL（status 仍 running）且 exit 1」。**绿**：逐字还原（Edit 逆操作）→ `build:server` → 复跑 → **89 passed / 0 failed、REAL_EXIT=0**。**零残留**：`git diff HEAD -- apps/server/src/server.ts` 还原后与反演前快照（/tmp/verify0019/server.diff.before）`diff` 输出空（SERVER_TS_DIFF_IDENTICAL）；`git status --short` 仍恰 4M+1??（白名单三路径 + STATE.md + iterations/0019/），无任何新增改动。注：首跑反演时曾因管道 `tail` 吞掉退出码误报 EXIT=0，已用重定向落盘 + `$?` 直取复跑纠正（REAL_EXIT=1 为准） |
| AC5 白名单与零依赖机器证明 | **PASS**（提交前态等价核对，见口径说明） | `git diff HEAD --numstat`：**恰三路径** `8 1 apps/server/src/server.ts`、`15 0 apps/server/src/store.ts`、`69 2 tests/smoke/smoke-server.mjs`（与 JOURNAL §1 声称一致）；`git status --porcelain` 全量恰 5 条 = 三白名单 + `M docs/evolution/STATE.md`（phase 回写，机制件）+ `?? docs/evolution/iterations/0019/`（迭代产物目录）；禁止路径 `git diff HEAD --stat -- package.json package-lock.json apps/web packages/shared tools .github` → **0 行输出**（lock 零变化 = 零依赖机器证明；apps/web/packages/shared 零字节 = 宪法面零接触）。dist 旁证：`apps/server/dist/server.js` 19:08（反演还原后重建）、`apps/web/dist/index.html` 18:59。**时点说明**：产品提交在本 VERIFY 窗口尚未由脚本执行，`git show --numstat` 无对象可查——以 HEAD 为基底的 `git diff HEAD --numstat` 为当前最强等价证据；产品提交落地后由 CLOSE 以 `git show --numstat` 复核（与 0018 先例同口径） |
| AC6 回归面 | **PASS**（脚本门禁采信口径） | `npm run build` + `npm run gate`（8 场景）+ `npm test`：脚本统一执行且通过（派发指令载明；PRD AC6 明文按 0012/0014/0016/0017/0018 先例引用门禁结论、不复跑全套）——本迭代零 apps/web/packages/shared 触及（AC5 机器证明），gate 为纯回归面。本阶段另亲跑的补充回归：`npm run smoke:server` 三轮（89/0、87/1 反演红、89/0 复绿）；AC4 期间两次 `npm run build:server` 均 exit 0（TS 编译无回归） |
| AC7 指针可核查 | **PASS**（抽样 7 条 ≥ 下限 5：6 条精确命中，1 条行号笔误列 BUG-0001，无一条内容虚构） | 逐条亲开亲比：① `store.ts:33`（现文件，改动区之前不漂移）→ `export type RunStatus = 'running' \| 'done' \| 'error' \| 'stopped';` **精确**；② `store.ts:159-160`（HEAD 基线 `git show`）→ `insertRun: db.prepare(` `` `INSERT INTO runs(…) VALUES(?, ?, ?, 'running', ?)` `` **精确**（现文件同语句漂至 :162-163，+3 = S 声明 2 行 + txSweep 声明 1 行均插在其前，自洽）；③ `lib.mjs:63` → `process.execPath + shell:false：Windows 不经 cmd 包装，kill 直达 node 进程；` **精确**；④ `smoke-server.mjs:43`（HEAD 基线）→ `const WFAPPR = {` **精确**（现文件 :47，+4 = Z 组头部说明块，自洽）；⑤ `app.js:581` → `const meta = runCardMeta(r.status);` **精确**；⑥ `server-sync.js:123-129` → runCardMeta status→样式映射全块，`default:` 分支注释 `/* stopped */` **精确**（「error/stopped 共用琥珀，差异落文本」注释在 :123 亲证）；⑦ `lib.mjs:12-13` → 实为两行 import（fs/net），PRD 所述「边界规则」原文在 **`lib.mjs:6-7`**（亲读：`边界规则（SPEC §2 硬性）：触达被测系统仅两条通道——/api/v1/* HTTP 契约 / 与构建产物存在性检查；不 import 任何产品代码；不读写 data/agentflow.db`）——**内容真实存在、行号偏移 5 行**，判 BUG-0001（Minor 文档笔误）而非「指针失效」：AC7 意图（非功能 3「指针真实可开」/防虚构证据）在此达成——引用对象存在且本阶段已从行为面独立证实（Z 组断言全程经 /api/v1，lib.mjs 全文 130 行内无任何 DB 访问） |

## 交互回归抽查（与改动相关的链路）

1. **历史面板数据链路（用户故事 1 的端到端数据面）**：独立实例
   `GET /api/v1/runs` → 200，列表中 `161ce4ff…` 以
   `{workflow_name:'智能客服助手', status:'stopped', started_at:1792570720608,
   ended_ms:null, done:0, total:8}` 如实呈现——该接口正是前端
   `server-sync.js` → `app.js runCardMeta(r.status)`（:581 亲证）的消费源，
   `stopped` 落 default 分支（琥珀 stop 样式，`server-sync.js:129` 亲证），
   前端零新值接触。历史卡片不再永远「运行中」骗用户去看断流回放。
2. **回放断流如实**：`GET /runs/161ce4ff…` events 末事件仍为
   `approval:required`（真实历史末梢），无合成 `run:done/run:error` 追加。
3. **浏览器级全交互清单（拖拽/缩放/框选/连线/滚轮门控/数字步进/快捷键/
   审批弹窗/撤销重做/导入导出/多标签/节点库收藏）不触发的理由**：本迭代
   `apps/web/**` 与 `packages/shared/**` 零字节改动（AC5 机器证明），交互
   语义与渲染面无触发路径；宪法级回归由脚本 gate 8 场景（像素 0 容差 +
   DOM 不变量）全绿覆盖（AC6 采信）。故抽查聚焦本特性直连链路（上 1-2 项），
   范围如实声明。

## BUG 清单

| 编号 | 级别 | 摘要 | 证据 | 处置建议 |
| --- | --- | --- | --- | --- |
| BUG-0001 | Minor（文档） | PRD 两处引用「lib.mjs:12-13 边界规则」行号笔误：该行号实为 import 语句，边界规则原文在 `lib.mjs:6-7`。引用对象真实存在、语义正确，零代码影响 | 本 REPORT AC7 ⑦；`sed -n '1,14p' tests/smoke/lib.mjs` 亲读（6-7 行原文 vs 12-13 行 import） | PRD 为已定稿阶段产物，不回改；治理日文档漂移批处理顺手修正（BACKLOG 备注或 weekly 记录即可），不阻塞本迭代 |

## 已知边界与口径说明

1. **AC5 时点**：产品提交由脚本/CLOSE 执行，VERIFY 窗口内尚不存在——
   `git show --numstat` 留待 CLOSE 复核，本报告以 `git diff HEAD --numstat`
   （同一基底）为等价机器证据（0018 REPORT 同款时点说明先例）。
2. **AC6 采信**：build/gate/test 的「通过」来自派发指令对脚本门禁的载明
   （PRD AC6 明文先例口径），非本阶段复跑；本阶段亲跑补充为 smoke ×3 与
   build:server ×2（均绿）。gate 8 场景逐项像素数未在本阶段复现，采信依据
   与边界如实声明。
3. **AC1 时序**：PRD 预期「VERIFY 在 BUILD 前采样」，实际 BUILD 先行；本阶段
   恰在脚本门禁首跑 smoke 之前完成等效修复前采样（探针 `running_count=1` 为
   证），修复前证据链完整（PRD 背景 5 → JOURNAL §2 → 本 REPORT AC1 三点一致）。
4. **PRD 风险 1（双实例共用 DB 误标先启实例活动 run）**：PRD 声明为已知边界
   不解决（单实例基线），VERIFY 照案不测；本轮实测三实例（主/Z/手动）均串行
   存活交叠时段短，未观察到越权误标（Z03/AC2 断言间接覆盖单实例语义）。
5. **AC3 断言计数**：89 = 85 既有 + Z 组 4；既有计数较 AGENTS.md「84」口径
   多 1 源自 C01 逐自建 run 的动态断言行（随运行浮动），非断言丢失——
   0 failed 为零回退硬证据。

## 结论

BK-0011 三项需求（REQ-0011-01 扫尾函数 / 02 启动接线 / 03 冒烟 Z 组）与
白名单约束（REQ-0011-04）全部按 S 项内嵌验收口径验证通过；唯一缺陷为
PRD 文档行号笔误（BUG-0001，Minor，不阻塞）。建议 CLOSE 按 PASS 归档。

—— test-manager · 2026-10-24 19:10
