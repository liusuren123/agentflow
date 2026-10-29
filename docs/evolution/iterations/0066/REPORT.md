# REPORT · 迭代 0066 · BK-0061（BK-0020 拆分 SPEC 先行：引擎 on-error 策略 env 语义清单与失败路径改造定界 + ADR 草案，纯文档轮）· VERIFY

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-29
> 输入：`iterations/0066/PRD.md`（AC1~AC7，S 项 skipSpec——验收口径内嵌 PRD）+ `docs/adr/0022-engine-onerror-policy-env.md`（BUILD 产品面唯一产物）+ `iterations/0066/JOURNAL.md`（BUILD 自检留痕）。
> 验收环境：隔离工作树 `feat/0066-iter`（分支同名，基点 2f85347）。**门禁四件套（build/gate/test/smoke）按派发指令未重复执行**，采信脚本在工作树内的全绿记录（BUILD 侧 JOURNAL §5 同口径声明「归脚本统一执行」）；本轮 VERIFY = 机器证明 + 指针抽样 20 组 + 定向 E2E（工作树构建产物 `apps/server/dist` 起服 :3166）。

## 0. 结论

**PASS（零缺陷 · 零修复轮）——AC1~AC7 全部通过，可移交特性分支双提交与合并仲裁。**

- 纯文档轮机器证明成立：产品面恰 1 新增 ADR（315 行），`apps/ packages/ tools/ tests/ .github/ package*.json` diff 恒空；BACKLOG 恰 1 行回写（BK-0020 :117）且 VERBATIM 程序化比对全等。
- ADR-0022 六要素成节、需批准面判定自洽（定案=新增 env 三项 → 附录 A 五要素 needs-approval 草案，「获批前零实现」三处在案）、头部状态行合规（草案态双位标注、「已批准」计数 0）。
- 指针抽样 20 组全部命中零杜撰（超 PRD ≥5 组口径）；JOURNAL 声明的两处勘误/溯源断言（server-sync.js 坐标漂移 :105-107→实锚 :295-297、注释溯源 c17866f）经独立复核成立。
- 定向 E2E 实测现状失败语义与 ADR §1.2 白描逐位一致（失败节点 node:error + 下游静默失活 + run:done ok=true 不反映失败），中止级联（`已中止` → stopped:true）现状保持——引擎运行时行为零漂移的活体佐证。

## 1. 验收标准逐条结论（PRD AC1~AC7）

| AC | 结论 | 证据（本轮实跑，均在工作树内/工作树起的服务上） |
| --- | --- | --- |
| AC1 纯文档轮机器证明 | **PASS** | `git diff HEAD -- apps packages tools tests .github package*.json` 输出**恒空**（exit=0）。`git status --porcelain` 全程恰 4 项、全在 PRD 白名单内：`M docs/evolution/BACKLOG.md`、`M docs/evolution/STATE.md`（过程态）、`?? docs/adr/0022-engine-onerror-policy-env.md`、`?? docs/evolution/iterations/0066/`——零代码/零依赖/零 UI/零 golden 四零成立（golden 目录零接触）。E2E 启停前后 status 逐字一致，验证过程零 git 残留。 |
| AC2 ADR 六要素成节 | **PASS** | 六节齐备：§1 动机与现状证据(:27)/§2 三策略语义定界(:85)/§3 env 语义清单(:138)/§4 引擎失败路径改造定界(:163)/§5 BK-0048 边界切割(:221)/§6 权威回写字面量(:240)（`grep -n "^## "` 实测）。头部状态行(:3-4)=「**草案 · 待实施轮消费（BK-0020）+ 依赖与 env 请批面——附录 A**」双位标注合规。`wc -l`=**315 ≤400**；`grep -c 已批准`=**0**（exit=1 无命中）；BOM 检查 `head -c 3`=23 20 41（即 `# A`，无 BOM）；CR 计数=**0**（纯 LF）。 |
| AC3 需批准面判定自洽 | **PASS** | 定案=**新增 env 三项**（ON_ERROR / ON_ERROR_RETRIES / ON_ERROR_RETRY_DELAY_MS，§3 表）→ 走附录 A 路径：§7 五要素 ①env 请批清单 ②ok 语义扩展知悉 ③delta 残余风险知悉 ④实施顺序 ⑤证据链接+批复语义尾注，自包含在案；「获批前零实现」字面 3 处命中（:4/:23/:266）。POLICY 交叉核对：`POLICY.md:25` 需批准区「新增环境变量语义」确实在列——判定自洽。零 env 备选案在 §3(:156-161) 显式否决留档（行为无配置主权/BK-0048 组合缺全局层/违 BACKLOG:117 既定 env 承载），两分支处置明确、定案路径恰好其一。 |
| AC4 回写 VERBATIM | **PASS** | node 脚本程序化比对：BK-0020 行备注列（第 9 列/共 9 列）trim 后与 ADR §6 fenced text **全等（TRIM-EQUAL: true，两侧均 1837 字符）**；备注列零 `\|`（表格安全）。`git diff HEAD --unified=0 -- docs/evolution/BACKLOG.md` 恰 **1 hunk（@@ -117 +117 @@）**= BK-0020 行；BK-0061(:82)/BK-0048(:69) 行不在 diff 中（实读两行内容在案，零意外触碰）。 |
| AC5 回归面全绿 | **PASS（采信脚本记录 + 本轮独立佐证；四件套未重复执行）** | 按派发指令，`npm run build`+`npm run gate`+`npm test`+`npm run smoke:server` 由脚本在工作树内执行且通过（采信；本轮未复跑，如实声明）。本轮独立佐证：① AC1 零产品 diff ⇒ 回归面与基线逐字节相同；② `apps/web/dist/index.html` 在树（脚本 gate 产物）；③ 工作树 `apps/server/dist` 构建产物起服 :3166 实测 health/models/失败 run/中止 run 四点全过（§3）——运行时行为与基线零漂移的活体复核。gate:update 全程零消费。 |
| AC6 指针抽样 | **PASS（20 组全命中零杜撰）** | PRD 钦定 5 点全中（engine.ts:102-112、:152、events.ts:32、server-sync.js 漂移点+实锚、config.ts 白名单区）+ 15 组扩展抽样，明细见 §2；含 JOURNAL 断言复验（`grep -rni retry apps/server/src` 空、`git log -S 'ok = 本次运行未被中止'`=c17866f）。 |
| AC7 选题与 STATE 留痕 | **PASS** | STATE.md：iteration=**0066**、item=**BK-0061**、started=2026-10-29 10:37、updated=2026-10-29 11:12（本轮时间）、repair_round=0。phase 语义：PRD 的「phase=PLAN」是其落盘时点的快照，WORKFLOW §3.1 规定工作树 STATE 承载过程态、由各阶段 agent 按契约推进（PLAN→BUILD→VERIFY），PRD 明文「本 PRD 不越权改写」——过程态推进本身即契约行为。本轮按派发指令已置 **phase=VERIFY** 并更新 last_result 指向本报告。 |

## 2. 指针抽样明细（AC6 · 20 组，全部本轮亲读/亲跑命中）

| # | 锚点 | ADR 断言 | 实测 |
| --- | --- | --- | --- |
| 1 | engine.ts:102-112 | catch 块序列：:103 executed.add / :104 done++ / :105-108 中止分支（:106 emit「已中止」/:107 throw）/ :109 node:error / :110 log.warn「节点执行失败」/ :111 return | **逐行命中**（全文 154 行亲读） |
| 2 | engine.ts:152 | `run:done` 携 `ok: !stopped, stopped` | **命中**（原文逐字） |
| 3 | engine.ts 零 failed/status | `node:error` 仅 :106/:109、`run:done` 仅 :152 | **命中**：`grep -n "failed\|status" engine.ts` exit=1 零命中；node:error/run:done 计数与位置一致 |
| 4 | engine.ts:116-118 / :140 | 出边激活 firedEdges / 入边零命中 `continue`（下游失活机理） | **命中**（:118 `outEs(id).forEach(...firedEdges.add)`、:140 原文逐字） |
| 5 | engine.ts:87-93/:94-95/:100/:101/:34/:153 | bypass 段 / 入参快照 / sub 递归 / handler 调用 / 返回类型无 ok 字段 | **命中**（§4.4「返回值增 ok」为改造点而非现状，表述准确） |
| 6 | events.ts:32 | 注释「ok = 本次运行未被中止（≠全部节点成功）」且内嵌坐标 server-sync.js:105-107 | **命中**（原文逐字）；`git log -S 'ok = 本次运行未被中止'`=**c17866f**（JOURNAL 溯源断言成立） |
| 7 | server-sync.js:103-107 | 漂移判定：该区间现为 SSE 帧解析循环收尾（JSON.parse/onFrame/`{t:'end'}`） | **命中**（:103 parse、:104 onFrame、:107 end 帧）——ADR 坐标漂移勘误属实 |
| 8 | server-sync.js:295-297 | run:done 定级 `lvl: (ev.ok !== false && !ev.stopped) ? 'ok' : 'warn'` | **命中**（实锚正确） |
| 9 | server-sync.js:317 | runCardMeta `'error' → ' · 失败'` | **命中** |
| 10 | app.js:2506-2513 | node:error → 移除 st-running 加 st-error + setNodeOut「执行失败 · …」 | **命中**（:2508 classList、:2509 setNodeOut、:2510 barDone） |
| 11 | app.js:2109-2116 | termview 追加 `.node-term-err` 错误行 | **命中**（:2111 className、:2113 appendChild） |
| 12 | llm.ts:89/:101/:103 | 流式节点 delta 发射点（重试叠加风险依据） | **三处全中**（:89 非流式终帧、:101 循环节流 emit、:103 收尾 emit） |
| 13 | agent.ts:98 | agent delta 发射点 | **命中** |
| 14 | util.ts:24 | isAbort 判定 | **命中** |
| 15 | config.ts:29-35 | env 白名单数组 | **命中**（:29 `for(const key of [` 起、:35 止，现 19 键无 ON_ERROR 系——佐证「新增」定性） |
| 16 | config.ts:52-83/:69-74/:80-82/:85-88 | EnvSchema / MCP superRefine 先例 / PTY 数值先例 / fail-fast | **全部命中**（ADR 拟用 zod 形态与 :80/:82 先例同款，引用准确） |
| 17 | config.ts:125-131 | 输出映射形态（`env.X ?? default`） | **命中** |
| 18 | store.ts:302 | `status = ev.stopped ? 'stopped' : (ev.ok ? 'done' : 'error')` | **命中**（原文逐字；「先判 stopped」与「error 链路已存在仅 ok:false 触发」均成立） |
| 19 | server.ts:175 / :176-181 / :192-198 | outcome.ok=!r.stopped / catch→run:error+run:done(ok:false) / stopHandler `ctx.ac.abort()` | **全部命中**（行号逐一吻合） |
| 20 | server.ts:316-318 / :319-327；ROADMAP:161-165/:210-211/:214-215；BACKLOG:69/:82/:117 | 停机 abort 循环与 5s 宽限 / M2 四项+「节点失败可按策略降级」(:164) / SPEC 三连第 2 位 / BK-0048 待 BK-0020 / 三行定位 | **全部命中**（ROADMAP 经 Read 工具复核，:164 验收语原文在案） |

附加复验：`grep -rni retry apps/server/src` **输出空（exit=1）**——「零 retry 现状」成立。

## 3. 定向 E2E（工作树构建产物 · :3166 · 验毕已停）

启动：`PORT=3166 node apps/server/dist/server.js`（工作树 dist，node_modules/@agentflow/* 三符号链接经查全部指向工作树自身，隔离有效）。`GET /api/v1/health` → `{"ok":true,"engine":"agentflow-server",...}`；`GET /api/v1/models` → DeepSeek 端点已配置；SQLite 落工作树 `data/`（.gitignore:17）。

- **E2E-1 失败路径（ADR §1.2 现状白描的活体复核）**：`userinput → code(throw new Error("boom-0066")) → prompt` 三节点两边。实测 SSE 事件流：
  `run:accepted → run:start → node:start(1) → node:done(1) → node:start(2) → node:error(2, "…Error: boom-0066…") → run:done{ok:true, stopped:false, done:2, total:3}`。
  判定：失败节点发 node:error 且**不发 node:done**；**下游节点 3 零调度**（静默失活）；**run:done ok=true 不反映节点失败**——与 ADR §1.2「隐式跳过（下游失活形态）+ ok=未被中止」逐位一致。
- **E2E-2 中止级联（ADR 声明「不动」的 engine.ts:105-108 分支）**：`userinput → delay(30s)`，节点 2 开始后 `POST /api/v1/run/:id/stop` → HTTP 200 `{"ok":true}` → `node:error(2, message="已中止") → run:done{ok:false, stopped:true}`——stop 端点→ac.abort→中止分支→stopped 收尾的既有级联现状保持。
- **交互回归抽查口径（如实声明）**：本轮零前端 diff（AC1 机器证明），UI 三层交互回归由「零接触 + 脚本 gate 全绿（采信）」承载，本轮未以浏览器复跑交互清单；抽查落在**引擎/SSE 交互面**（run 事件序、失败路径、stop 级联）——恰为本迭代 ADR 的论述对象，与其定界直接相关。

## 4. 与 JOURNAL 声明的交叉核对

- **坐标漂移勘误独立复核成立**：events.ts:32 注释内嵌「server-sync.js:105-107」经实读确已漂移（该区间现为帧解析循环收尾），注释所述行为实锚 :295-297——ADR §1.2「只记录不改、修正归 BK-0020 实施轮」的处置符合 PRD「锚点按代码事实转写、勿照抄旧行号」纪律。
- JOURNAL §5 自检表 6 项全部复验一致：wc 315 / 已批准 0 / 无 BOM 无 CR / VERBATIM trim 全等 true / AC1 恒空 / 改动面恰白名单。
- 附录 A issue 的实际开立归协调者/脚本（gh 授权面），§7 字面量已自包含备好——本轮不代开（POLICY 禁止区：不代用户批复；开 issue 属脚本回执面）。

## 5. 环境与残留声明

- VERIFY 自建 :3166 实例共 2 次启停（失败路径 / 中止级联），验毕均已停（taskkill PID 51012、62504，末次 curl 确认不可达）。
- 工作树 `data/`（gitignored）新增 2 条测试 run 记录（verify-0066-failpath / verify-0066-stop）——不入库、无主干影响。
- `git status --porcelain` 验后与验前逐字一致（BACKLOG/STATE 修改 + ADR/0066 目录 untracked 恰 4 项），E2E 零 git 残留；临时验证脚本在系统临时目录，不落源码树。

## 6. 移交

**VERIFY 终态 PASS，零 BUG、零修复轮 → 移交特性分支双提交（产品提交应恰 1 路径 `docs/adr/0022-engine-onerror-policy-env.md`，`git show --numstat` 可机器复核）与合并仲裁。**

提请注意（均非本轮缺陷）：

1. **合并面**：工作树分支基点 2f85347，落后主干一提交（137043f 已将 approval 拾取器 ADR 0017→0019 改名）。经 `git ls-tree main docs/adr/` 实查：主干现有编号 0001~0021 **无 0022，本 ADR 编号零冲突**；但主干 `docs/evolution/BACKLOG.md` 的 137043f 改动与本轮回写（:117）将呈机制件冲突，且 ADR 目录存在 0017/0019 改名分叉——归合并仲裁员按 WORKFLOW §4「机制件冲突按类解决」处置。
2. **后续解阻链**：BK-0020 晋升条件=BK-0061 CLOSE 且附录 A needs-approval 获批（新增 env 三项在请批清单）——issue 开立与批复流转归协调者/脚本；获批前实现块零实现（ADR §7 批复语义尾注已载明「驳回则归档为未采纳方案」）。
3. CI `ui-constitution` 为 required check：推送后按惯例盯守（golden 权威在 CI；本轮 golden 零接触）。
