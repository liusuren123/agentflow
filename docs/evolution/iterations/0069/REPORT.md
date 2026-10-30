# REPORT · 迭代 0069 · BK-0020 引擎级错误处理策略 on-error（重试 / 跳过 / 中止）· VERIFY

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-31 01:56 · 隔离工作树 `feat/0069-iter`（基点 cd44b21）
> 输入：`iterations/0069/PRD.md`（AC1~AC10，S 项 skipSpec——验收口径内嵌 PRD §8/§9）+
> `docs/adr/0022-engine-onerror-policy-env.md`（权威蓝图）+ `iterations/0069/JOURNAL.md`（BUILD 留痕，含 §4 对 VERIFY 的提示）。
> 验收环境：工作树内产品改动为**未提交工作区态**（分支双提交按 WORKFLOW §4 在 VERIFY 之后由协调者执行）。
> 门禁口径：`npm run build` / `npm run gate` / `npm test` 由脚本在工作树内运行且通过（派发指令明示，本轮未复跑——如实采信，
> 佐证：`apps/web/dist`（01:42）与 `apps/server/dist`（01:44）、`packages/shared/dist`（01:43）产物 mtime 均晚于末次源码改动（engine.ts 01:36），dist 为终态源码的最新编译）。
> `npm run smoke:server` **本轮实跑**（182/0，§3）；定向 E2E 8 场景**本轮实跑**（§2）。

## 0. 结论

**PASS（零产品缺陷 · 零修复轮）——AC1~AC10 全部通过（AC7 之一子项按其性质移交给提交时点复核，等价预证明已在案），可移交特性分支双提交与合并仲裁。**

- 三策略引擎实现与 ADR-0022 定界逐位吻合：skip 默认零漂移（未配置与现状逐位一致，OE01+实测 S1）、retry 指数退避（实测 100ms→200ms 递增 + 耗尽降级 skip 终态 + 第 3 次成功按成功收尾）、abort fail-fast（同级独立分支不再调度 + ok:false/stopped:false + 持久层 status='error'）；退避等待期 stop 实测 **3ms** 即时中断（30s 退避未到期）。
- SSE 契约零新增（零新事件零新字段）成立：events.ts 恰 1 注释行变更，V09 51 条事件逐条 RunEventSchema 校验 PASS。
- 禁区机器证明成立：`git diff HEAD -- apps/web tests/golden .github` 恒空；产品 diff stat 恰 §8 白名单；package*.json/lock 零变化；golden mtime 零新于源码 = **gate:update 消费 0 次**。
- 验证过程如实记录：①全量 smoke 在工作树内复跑会触发 V09 已知的时点性假红（0037 先例 + JOURNAL §4 预警），按 BUILD 同款单文件 stash 隔离后取得 182/0 全量绿，跑毕哈希校验字节级复原（§3）；②VERIFY 脚本首轮 3 个 FAIL 均系验证脚本自身字段名笔误（node:error 契约字段为 `message` 非 `msg`），修正后 8/8 PASS——非产品缺陷，留档以免误立项。

## 1. 验收标准逐条结论（PRD §9 AC1~AC10）

| AC | 结论 | 证据（本轮实跑，除注明「采信脚本」外） |
| --- | --- | --- |
| AC1 未配置零漂移（硬护栏） | **PASS** | ① 全量 `npm run smoke:server` 本轮实跑：`==== smoke:server：182 passed / 0 failed ====`，`SMOKE-EXIT=0`（168 基线零回退 + OE 组 8 + C 组清理 6，账目吻合 JOURNAL §4③）；主实例 ON_ERROR 三键已在 H 组空串钉空（真未配置前提）。② 含失败节点手动 E2E（`.zcode/tmp/verify-0069/e2e.mjs` S1，工作树 dist 起服）：`starts=[1,2]`（下游节点 3 无 node:start=失活）、`node:error` 恰 1 次（id=2）、`run:done{ok:true,stopped:false}`（ok 不反映失败）、`GET /api/v1/runs/:id status="done"`——与现状逐位一致。 |
| AC2 skip 显式等价 | **PASS** | E2E S2（`ON_ERROR=skip`）：断言集与 S1 同型全过（named 化零行为差）；smoke OE02 PASS（独立探针实例同判）。 |
| AC3 retry 正例 | **PASS** | E2E S3a（retry ×2 ×100ms + 计数 mock 连接销毁必失败）：**mock 命中恰 3**（=1+2 次尝试硬证据）、`log` warn 通报恰 2 条且**指数退避实测可见**（「第 2 次尝试将在 100ms 退避后执行」「第 3 次尝试将在 200ms 退避后执行」= delay×2^(n-1)）、`node:error` 恰 1 次且 message=`fetch failed（已重试 2 次）`（末次错误+尝试概要）、耗尽后按 skip 终态下游失活（starts=[1,2]）、`run:done{ok:true}` ok 语义不变、status="done"。S3b（第 3 次成功）：mock 命中恰 3、**零 node:error**、`node:done` 恰 [1,2,3]、节点 out=`200 · 9ms`（以末次成功尝试为准）、`run:done{ok:true}`。smoke OE03/OE04 PASS 同判。 |
| AC4 retry 可中止 | **PASS** | E2E S5（retry ×3 ×30000ms，等待「第 2 次尝试」通报确认已入退避窗 → POST `/api/v1/run/:id/stop`）：**stop→run:done 实测 elapsedMs=3**（30s 退避弃眠即时中断）、`run:done{ok:false,stopped:true}`（stopped 保持用户中止独占语义）、`node:error` message 含「已中止」（走既有中止级联）。smoke OE06 PASS（独立实例同判，断言 elapsed<7000）。无孤儿定时器（代码级）：`util.ts:58-61` abortableSleep 在 abort 时 `clearTimeout` + reject。 |
| AC5 abort fail-fast | **PASS** | E2E S4（`ON_ERROR=abort` + 同级独立分支工作流，guard 拦截 127.0.0.1:9 确定性失败）：starts=**[1,2]**（下游节点 3 与同级分支节点 4 全部不再调度）、`node:error` 恰 1 次（message 含「已拦截」）、`run:done{ok:false,stopped:false,done:2}`（fail-fast 收尾且 stopped 不被污染）、`GET /runs/:id status="error"`（store.ts:302 既有派生链路，本轮亲读 :302 原文在位）。smoke OE05 PASS 同判。stopped 独占语义（代码级）：abort 仅置独立标志位 `onErrorAborted`（engine.ts:82/:155），全程不调 `ac.abort`；stop 端点（server.ts:192-195）与优雅停机（server.ts:316-318）是 `ac.abort` 仅有的两处调用方。 |
| AC6 env 装载与 fail-fast | **PASS** | E2E S6a（非法值 ×3）：`ON_ERROR=boom` / `ON_ERROR_RETRIES=9` / `ON_ERROR_RETRY_DELAY_MS=abc` 各自**启动即退出 code=1**，报文指明变量名与约束（`ON_ERROR="boom"：Invalid enum value. Expected 'skip' | 'retry' | 'abort'`、`ON_ERROR_RETRIES="9"：必须在 0-5`、`ON_ERROR_RETRY_DELAY_MS="abc"：必须是整数`——config.ts:93-96 `logger.fatal`+`process.exit(1)` fail-fast 通道）。S6b（边界值）：`RETRIES=0+DELAY=0`（下端）与 `ON_ERROR=abort+RETRIES=5+DELAY=60000`（上端）双实例 health 200 ok:true。smoke OE07/OE08 PASS 同判。 |
| AC7 禁区机器证明 | **PASS**（1 子项移交提交时点） | ① `git diff HEAD -- apps/web tests/golden .github` 输出**恒空**（exit=0，本轮实跑）；② `git diff HEAD --stat` 全量恰 9 文件 = §8 白名单（产品 7：engine/config/types/server/.env.example/events.ts/smoke-server.mjs + 机制件：BACKLOG.md/STATE.md）+ 未跟踪 `docs/evolution/iterations/0069/`；package*.json / lock **零变化**（stat 中不存在）；③ events.ts 恰 **1 注释行**变更（diff 亲读，schema 字段行原样在上下文）；④ **gate:update 消费 0 次**：`find tests/golden -newer apps/server/src/engine.ts` 计 **0**（golden 目录零 mtime 变化）+ JOURNAL §0 声明；⑤ `git show --numstat <产品提交>`——**产品提交尚不存在**（按 WORKFLOW §4 分支双提交在 VERIFY 之后），本项属提交时点动作；等价预证明 = 上述 ②（工作区 diff stat = 白名单），移交协调者在产品提交落盘后按 §10 口径复核 numstat 恰白名单。 |
| AC8 回归面全绿 | **PASS** | `npm run build` + `npm run gate` + `npm test`：采信脚本工作树内全绿记录（派发指令明示 + STATE last_result「build exit0 + test 30/30」+ dist 产物 01:42-01:44 晚于末次源码改动佐证；本轮未复跑，如实声明）。`npm run smoke:server`：**本轮实跑 182/0 exit 0**（§3）。s3-library 本机抖动：本轮未发生（182 全绿一次通过，无复跑判定场景）。 |
| AC9 SSE 契约零新增 | **PASS** | `git diff HEAD -- packages/shared/src/events.ts` 恰 1 行且为注释（:32 ok 语义注释刷新 + 漂移坐标修正 :105-107→:295-297）；RunEventSchema 事件类型集合与字段**零变更**（diff 上下文中 schema 行原样）；shared 其余文件零 diff（stat 全量核对）。活体佐证：smoke V09 PASS（51 条真实事件逐条 `validateEvent` 通过）+ `npm test` 30/30（脚本运行，含 events 契约断言）。 |
| AC10 选题与 STATE 留痕 | **PASS** | STATE.md：iteration=**0069**、item=**BK-0020**、started=2026-10-31 00:42、repair_round=0；phase 的 PRD 快照（=PLAN）系 PLAN 落盘时点，WORKFLOW §3.1 规定工作树 STATE 承载过程态、由各阶段按契约推进（BUILD 侧已如实推进，0066 先例同判）——本轮按派发指令置 **phase=VERIFY** 并更新 last_result 指向本报告。BACKLOG 过程改动恰 2 行：`:112`（BK-0014 proposed→ready）与 `:118`（BK-0020 proposed→ready），与 PRD §0 规则①处置逐字对应（`git diff HEAD --unified=0` 恰 2 hunk 实测）。 |

## 2. 定向 E2E 明细（`.zcode/tmp/verify-0069/e2e.mjs`，工作树 `apps/server/dist` 起服，验毕实例全停）

复用 `tests/smoke/lib.mjs` 的 startServer/openSse/api 同款 harness（与套件同语义），8 场景一次性全绿：

```
PASS S1/AC1 未配置零漂移       starts=[1,2] errs=1(id=2,「已拦截」) ok:true stopped:false status:"done"
PASS S2/AC2 skip 显式等价       与 S1 同型全过
PASS S3a/AC3 retry 耗尽降级     hits=3 warns=2（100ms→200ms 指数退避可见） node:error="fetch failed（已重试 2 次）" starts=[1,2] ok:true status:"done"
PASS S3b/AC3 第 3 次成功       hitsΔ=3 零 node:error done=[1,2,3] out="200 · 9ms" ok:true
PASS S4/AC5 abort fail-fast    starts=[1,2]（同级节点 4 未调度） ok:false stopped:false done=2 status:"error"
PASS S5/AC4 退避期 stop 中断    stop 200 elapsedMs=3（30s 退避弃眠） stopped:true ok:false「已中止」
PASS S6a/AC6 非法值 fail-fast   boom/9/abc → code=1 + 变量名 + 约束 ×3
PASS S6b/AC6 边界值装载        0/0 与 abort+5/60000 双实例 health 200 ok:true
==== verify-0069 定向 E2E：8 passed / 0 failed ====
```

**首轮 3 FAIL 的如实记录（验证侧假红，非产品缺陷）**：S3a/S4/S5 首轮 FAIL 均系验证脚本把 `node:error` 事件的契约字段误读为 `msg`（`log` 事件字段）所致——RunEventSchema 定义 node:error 携 `message`（events.ts:25）；而首轮输出 detail 本身已显示产品行为正确（如 S4 的 `已拦截`/`ok:false`/`status:"error"` 全部在案）。修正字段名后复跑 8/8 全绿。留痕备查，防后续误立项。

## 3. 全量 smoke:server（本轮实跑 · 182/0 · 含 stash 隔离操作留痕）

- 命令与结果：`npm run smoke:server`（工作树根）→ 日志 `.zcode/tmp/verify-0069/smoke-run.log` → `PASS` 计 **182**、`FAIL` 计 **0**、`==== smoke:server：182 passed / 0 failed ====`、退出码 **0**。OE 组逐条 PASS：OE01（未配置零漂移）/ OE02（skip 等价）/ OE03（retry 耗尽：mock 恰 3 + warn 恰 2 + 概要 + 失活 + ok:true + status done）/ OE04（第 3 次成功）/ OE05（abort fail-fast + status='error'）/ OE06（30s 退避期 stop <7s 收束 + stopped:true）/ OE07（非法值 ×3 fail-fast）/ OE08（边界值双实例）——与 AC2~AC6 的 smoke 断言组一一对应。V09 PASS（51 条事件 RunEventSchema 逐条通过 + packages/shared 干净）。
- **V09 时点性假红处置（0037 先例 + JOURNAL §4 预警的同型复现，非产品缺陷）**：工作树内 events.ts 注释行未提交，`git status --porcelain -- packages/shared` 非空会令 V09 后半段 FAIL 并 fail-fast 阻断 OE 组（BUILD 首跑 97/1 实录）。本轮采与 BUILD 相同的隔离手段：`git stash push -m "verify-0069: …" -- packages/shared/src/events.ts`（仅此一文件）→ 跑套件 → `git stash pop` 复原；哈希校验 `ae084cb8f60c70d…`（stash 前）= `ae084cb8f60c70d…`（pop 后）**字节级一致**，`git status --porcelain` 恢复原 9 文件态。该注释行零运行时影响（不进编译产物语义），V09 的权威绿记录 = 脚本主干复测时点（届时树净）+ 本轮 stash 隔离跑。
- 备注：smoke PASS 行只打印断言名不打印 detail（lib.mjs Checker.pass 形态），OE06 的 elapsed 实测值在其断言 `elapsed<7000` 通过中隐含；精确值由本轮 S5 独立实测补齐（3ms）。

## 4. 指针抽样（PRD §10 口径 ≥5 组，本轮 12 组全命中）

| # | 锚点 | 断言 | 实测 |
| --- | --- | --- | --- |
| 1 | engine.ts:79-82 | 策略装载：onError=skip 默认 / retries 仅 retry 消费 / onErrorAborted 独立标志 | 命中（逐字） |
| 2 | engine.ts:88-110 | callHandlerWithRetry：尝试前 aborted 复查(:92) / 中止原样上抛(:96) / delay=min(base×2^(n-1),30000)(:99) / 通报先行于退避(:103) / abortableSleep(:104) / maxAttempts===1 原样上抛(:108) / 耗尽概要(:109) | 命中（逐行） |
| 3 | engine.ts:145-156 | catch 分派点：中止判定先行(:145-148)、skip 终态=既有序列 named 化(:152-154)、abort 置标志位(:155) | 命中（序列零搬移） |
| 4 | engine.ts:183/:198-200 | 主循环 onErrorAborted break（同级分支不再调度）/ ok=!stopped&&!onErrorAborted / 返回值含 ok | 命中（逐字） |
| 5 | config.ts:35/:88-90/:140-142 | 白名单 +3 / zod（enum + coerce.int.min/max 同 PTY 形态）/ 输出映射默认 skip/0/1000 | 命中（行号逐一） |
| 6 | config.ts:93-96 | fail-fast：logger.fatal + process.exit(1) | 命中 |
| 7 | server.ts:175 | outcome.ok 改消费引擎返回值 `ok: r.ok` | 命中（JOURNAL 勘误 :176→实锚 :175 成立） |
| 8 | server.ts:192-195/:316-318 | stopHandler `ctx.ac.abort()` / 优雅停机中止活动 run（5s 宽限） | 命中（ac.abort 仅这两处调用方） |
| 9 | events.ts:24/:32 | log 事件 lvl 含 'warn'（重试通报零新事件依据）/ :32 注释刷新 + 坐标修正 | 命中（:32 为唯一变更行） |
| 10 | events.ts:25 | node:error 契约字段 id/title/**message**（验证脚本字段名勘误依据） | 命中 |
| 11 | store.ts:302 | `status = ev.stopped ? 'stopped' : (ev.ok ? 'done' : 'error')`（abort→status='error' 既有链路） | 命中（原文逐字） |
| 12 | server-sync.js:297/:317 | 前端消费链既有承接零改动：`lvl: (ev.ok !== false && !ev.stopped) ? 'ok' : 'warn'` / `suffix: ' · 失败'` | 命中（apps/web 零 diff 的前提下链路自然成立） |

## 5. 非功能要求核验

- **行数上限（≤400，AGENTS.md 约定 4）**：本轮实测 `wc -l` = engine.ts **201** / config.ts **160** / types.ts **93** / server.ts **335**（改 1 行）——全部 ≤400。JOURNAL 的估算（types 96 / config 约 163）与实测有 ±3 行级出入，以实测为准，非缺陷。smoke-server.mjs 2633 行系存量测试编排文件的既有形态（本轮 +248），非「新增源文件」，沿 0064 KB 组先例。
- **未配置零漂移硬护栏**：实现级保证 = maxAttempts===1 时错误对象原样上抛（engine.ts:108）+ catch 分派在既有中止判定之后的既有序列 named 化（:143-154 零搬移）；实证 = S1/OE01 与现状逐位一致 + 全量 smoke 既有断言零回退（182/0 含 168 基线）。
- **修宪面零命中**：零 UI / 零 DEFS / 零依赖 / 零出站 / 零 golden——AC7 机器证明覆盖；`gate:update` 消费 0 次（golden mtime 证明）。**本轮非修宪轮**，issue#15 批复射程（env×3 + 两项知悉）未扩大。

## 6. 交互回归抽查（ask 要求项）

前端三层零接触的机器证明（`git diff HEAD -- apps/web` 恒空）+ 脚本 gate 全绿（21 场景 diffPx=0 纯回归，采信派发指令明示的脚本记录；本轮未复跑 gate，如实声明）构成交互回归面。抽查补充：前端消费链锚点（server-sync.js:297 warn 定级 / :317 「· 失败」卡面）本轮亲读在位且未被触碰——abort 策略 run:done ok:false 到达时由既有链路自然承接（AC5 的「前端卡 · 失败」预期由契约零新增 + 零前端 diff 结构性保证）。

## 7. 缺陷清单

**零产品缺陷**（BUG 清单为空，零修复轮）。验证过程两项如实留痕（均非产品缺陷）：① V09 时点性假红（机制已知，0037 先例，JOURNAL §4 已预警，本轮 stash 隔离处置 + 字节级复原）；② VERIFY 脚本首轮 3 个字段名笔误假红（§2，已修正复跑全绿）。

## 8. 移交注意（给协调者 / 合并仲裁员）

1. **产品提交时点复核 AC7 末子项**：产品提交落盘后按 PRD §10 执行 `git show --numstat <产品提交>`，应恰 §8 白名单 7 产品文件（机制件归第二提交）；本轮已给出等价预证明（工作区 diff stat = 白名单）。
2. **V09 的权威时点**：主干合并复测（树净）时 V09 恒绿；工作树内任何未提交 shared 改动的复跑都会复现该假红，勿据以立项（0037/JOURNAL §4 同判）。
3. **并行合并预期**：与在途 BK-0018 轮在 config.ts/server.ts 的交集为「双方各自新增」型插入冲突（PRD §7 预案），按合并契约分类解决（0034/0036 先例）。
