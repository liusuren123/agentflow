# SPEC · 迭代 0002 · BK-0002 后端 E2E 冒烟脚本（技术规格）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 08:07
> 输入：`docs/evolution/iterations/0002/PRD.md`（PLAN 产物）+ 代码只读核实（核实时间
> 2026-10-22 08:0x，所有行号当日实测）。冲突顺位：CONSTITUTION > 代码实现 > 文档。
> 结论先行：**纯 Node ESM 冒烟脚本 + 根 package.json 一行 scripts；零新依赖；不改任何
> 产品源码；无需 ADR**（理由见 §11）。

## 1. 方案总览

新增 `tests/smoke/` 冒烟脚本，对**真实 server 子进程**（spawn `apps/server/dist/server.js`）
经公共 HTTP 契约 `/api/v1/*` 执行 32 条命名断言/清理检查（§6：P2+H1+W7+N3+S5+R3+D7+C4），
覆盖 PRD 全部 REQ/AC：

- 技术形态：Node ≥18 原生 ESM（本机 v24.21.0 实测；fetch 流式读体承载 SSE，零依赖）。
- 一键入口：根 `package.json` scripts 增一行 `smoke:server`（§3）。
- 自编排生命周期：前置校验 → 空闲端口 → 起子进程 → 健康等待 → 断言 → finally 自清 → 杀进程（§5）。
- 失败语义：fail-fast——任一断言失败即打印上下文与服务器日志尾，进入 finally 清理，退出码非 0（§8）。

PRD 事实源逐条复核结果（本节为 SPEC 断言依据，行号当日实测）：

| PRD 事实 | 核实 |
| --- | --- |
| 路由注册全景（workflows/runs 仅 v1） | ✅ `apps/server/src/server.ts:185-202` |
| run body.nodes 非数组 400 | ✅ server.ts:74（文案 `body.nodes 必须是数组`） |
| PUT upsert id 优先级：路径 :id > body.id > 生成 | ✅ server.ts:156，`store.ts:148-161` 返回 `{id, updated_at}` |
| workflows 列表为 updated_at 倒序摘要 / 详情缺失 404 | ✅ server.ts:144-151，store.ts:101,163-187 |
| runs limit 非 1-100 整数 400（文案 `limit 必须是 1-100 的整数`） | ✅ server.ts:160-164 |
| runs 详情 `{run, events}`；事件 seq ASC 回放 | ✅ server.ts:165-169，store.ts:121 |
| 活动 run DELETE 409 `{error:'run is active'}`；不存在 404；成功 `{ok:true}` | ✅ server.ts:176-183（判据是内存 runsById，非 DB status） |
| 事件链 run:accepted(seq=0) → run:start → node:start → node:done → run:done | ✅ server.ts:88-93、engine.ts:67,91,127,150 |
| **PRD 未展开的补充事实：run:progress 事件穿插其间**（engine.ts:66,113，每节点完成后一条） | 故 AC3 断言必须是**有序子序列**而非精确序列（PRD REQ-0002-04 措辞一致） |
| approval 挂起窗口 10 分钟（超时自动通过） | ✅ handlers.ts:205-221（超时 handlers.ts:215）；`approval:required`（211-212）/`approval:done`（221）事件在案 |
| approve 端点 `{nodeId, approve}` → `{ok}` | ✅ server.ts:135-141 + engine.ts:44-48 |
| stop 端点 `{ok:true}` / run 不活动 404 | ✅ server.ts:126-132 |
| 启动缺 `apps/web/dist/index.html` fatal 退出 | ✅ server.ts:52-56 |
| PORT env 覆盖默认 3000 | ✅ config.ts:55,89；**.env 不覆盖已有环境变量**（config.ts:17-24）→ 脚本传入的 child env PORT 优先级正确 |
| DB 固定路径无 env | ✅ store.ts:23-24（`data/agentflow.db`，WAL；.gitignore:17 已忽略 data/） |
| SSE 帧格式 `data: <json>\n\n`、保活 `: ping` 注释不落库 | ✅ util.ts:14-22、server.ts:94 |
| 根/服务 package.json 均无 smoke 条目 | ✅ `grep -n "smoke" package.json apps/server/package.json` → 0 匹配（exit=1，本机实测） |
| `apps/web/dist/index.html` 与 `apps/server/dist/server.js` 当前在位 | ✅ ls 实测 |

## 2. 模块边界

```
tests/smoke/
  lib.mjs            基础设施层（~120-150 行）
  smoke-server.mjs   编排层（~250-300 行，含夹具与 27 条断言）
```

- **lib.mjs**（只提供机制，不含业务断言）：
  `preflight()` 文件在位校验 · `getFreePort()`（net listen(0) 取端口后关闭）·
  `startServer(port)`（spawn + pino 日志环形缓冲 + 健康轮询 + 子进程 exit fail-fast）·
  `api(base, method, path, body)`（fetch JSON 封装，AbortSignal.timeout(15s)）·
  `openSse(base, body)`（POST /run 流式消费：按 `\n\n` 分帧、取 `data: ` 行 JSON.parse、
  跳过 `:` 注释行——与 util.ts:14-22 帧格式互逆；事件推入累积数组并唤醒等待者）·
  `waitFor(predicate, timeoutMs)` · 断言工具（`ok/eq/deepEq/includes` + PASS/FAIL 计数）。
- **smoke-server.mjs**：夹具常量（§7）、步骤编排 P→H→W→N→S→R→D→C（§6）、
  SIGINT/SIGBREAK 处理、汇总输出与退出码（§8）。
- **边界规则（硬性）**：
  1. 触达被测系统只允许两条通道：公共 HTTP 契约 `/api/v1/*` + 构建产物文件存在性检查。
     **不 import 任何产品代码**（含 `@agentflow/shared`——事件 schema 级校验属 BK-0003
     契约测试职责，且避免 shared 构建耦合；本脚本做结构化字段断言即可承载 PRD 全部 AC）。
  2. **不直接读写 `data/agentflow.db`**：清理一律复用 DELETE 端点（REQ-0002-08）。
  3. 两文件各 ≤400 行（AGENTS 硬性约定 4）；若 smoke-server.mjs 逼近上限，将 §7 夹具
     拆出为 `tests/smoke/fixtures.mjs`（本 SPEC 预留的第三边界，其余结构不变）。

## 3. 受影响文件清单

| 文件 | 动作 | 内容 |
| --- | --- | --- |
| `package.json` | 修改（+1 行） | scripts 增 `"smoke:server": "node tests/smoke/smoke-server.mjs"`（置于 `"test"` 之后；devDependencies 不动） |
| `tests/smoke/lib.mjs` | 新增 | §2 定义的基础设施层 |
| `tests/smoke/smoke-server.mjs` | 新增 | §2 定义的编排层 |

**明确不动（零字节改动）**：`apps/web/**`、`apps/server/**`、`packages/shared/**`、
`tools/pixel-gate/**`、CI 配置、`CONSTITUTION.md`、`AGENTS.md`、`.gitignore`。
PRD 非目标「不为 store 增加 DB 路径 env」在 SPEC 层面同样成立——脚本靠自建自清消化固定路径。

## 4. 触 UI 分类（承 PRD 结论）

**否。** 宪法第 4 条明列「测试、构建配置」为门禁不适用项；本项不在任何渲染路径上。
验收仍保留 `npm run gate` 全绿作防误触兜底（§9-F，AC8）。

## 5. 服务生命周期编排（REQ-0002-02）

1. **preflight**：`apps/web/dist/index.html` 与 `apps/server/dist/server.js` 存在性
   （P01/P02）。缺失 → 打印「先在仓库根执行 `npm run build` 与 `npm run build:server`」
   （对应 server.ts:52-56 的 fatal 语义前置兜底），exit 1，不起进程。
2. **空闲端口**：`net.createServer().listen(0)` 取端口 → close → 备用。
   TOCTOU 残余风险（close 与 spawn 间被抢占）：子进程 EADDRINUSE 退出 → 健康等待
   fail-fast 呈现日志尾；接受不重试（冒烟快，重跑代价低于复杂度）。
3. **spawn**：`spawn(process.execPath, [<dist/server.js 绝对路径>], { cwd: <apps/server>,
   env: { ...process.env, PORT: String(port) }, shell: false })`。
   - `process.execPath` + `shell:false`：Windows 不经 cmd 包装，kill 直达 node 进程（风险 4）。
   - cwd=apps/server 与 `npm start -w @agentflow/server` 同构；路径解析实际由模块
     `__dirname` 决定（server.ts:39-40、config.ts:14），cwd 仅求同构稳健。
   - stdout/stderr pipe 并持续排水入环形缓冲（末 200 行），避免缓冲填满阻塞子进程；
     仅在 FAIL 时打印（可诊断性，非功能 2）。
4. **健康等待**：轮询 `GET /api/v1/health`（250ms 间隔，上限 20s），200 且 `ok===true`
   即就绪（H01，server.ts:64-66）。期间子进程 exit → 立即失败并打印日志尾。
5. **断言**：§6 顺序执行；普通请求 15s 超时；SSE 等待点见 §6 各组时限。
6. **finally（成败皆然）**：C01-C03 清理 → 杀子进程：`child.kill()` → 3s 内未见 exit
   则 `child.kill('SIGKILL')` → 再等 1s。Windows 上等效 TerminateProcess；优雅停机
   （SIGINT/SIGTERM 同径）断言不在本项范围（PRD 非目标，weekly/43 §四 O4）。
   父脚本自身监听 SIGINT/SIGBREAK：触发同一 finally 后 exit 130（Ctrl+C 不泄漏进程/端口）。

## 6. 断言清单（32 条 = P2+H1+W7+N3+S5+R3+D7+C4；承 REQ-0002-03~08 / AC2-AC7）

> 命名 `组号+序号`；「期望」列为断言的机器可核对内容；行号为事实源。
> 失败语义见 §8。请求基地址 `http://127.0.0.1:<port>`，全部走 `/api/v1` 正式命名空间。

**P · 前置（REQ-02）**
- P01 `apps/web/dist/index.html` 存在。
- P02 `apps/server/dist/server.js` 存在。

**H · 健康（REQ-02）**
- H01 `GET /api/v1/health` → 200，`json.ok === true`（server.ts:64-66）。

**W · workflows CRUD 往返（REQ-03 / AC2；夹具见 §7-WF）**
- W01 `PUT /api/v1/workflows`（WF CRUD 夹具，不带 id）→ 200，返回 `id`（非空字符串）
  与 `updated_at`（数字）（server.ts:152-157 + store.ts:148-161）；记录 `wfId` 入清理清单。
- W02 `PUT /api/v1/workflows/:wfId`（name 改 `smoke-crud-v2`）→ 200，返回 `id === wfId`
  （路径 id 优先，server.ts:156）。
- W03 `GET /api/v1/workflows` → 200，列表项含 `wfId`（server.ts:144-146）。
- W04 `GET /api/v1/workflows/:wfId` → 200，`{name, nodes, edges}` 与 W02 所发 body
  深相等、`id === wfId`、`updated_at ≥ W02 返回值`（store.ts:173-187）。
- W05 `DELETE /api/v1/workflows/:wfId` → 200 `{ok:true}`（server.ts:172-175）。
- W06 `GET /api/v1/workflows/:wfId` → 404 `{error:'workflow not found'}`（server.ts:147-151）。
- W07 再次 `DELETE /api/v1/workflows/:wfId` → 404（再删反例）。

**N · 参数反例（REQ-07 / AC6）**
- N01 `POST /api/v1/run` body `{ name:'x', nodes: {} }` → 400
  `{error:'body.nodes 必须是数组'}`（server.ts:74）。
- N02 `GET /api/v1/runs?limit=0` → 400（server.ts:161-162）。
- N03 `GET /api/v1/runs?limit=101` → 400（同上）。
- 注：`PUT /api/v1/workflows` 的 nodes 400（server.ts:154）为同型守卫，PRD REQ 未列，
  本 SPEC 不扩面（BK-0003 契约测试的地盘）。

**S · SSE 全事件链（REQ-04 / AC3；夹具 §7-WFMIN，userinput→prompt）**
- S01 流首事件 `run:accepted`，`runId` 为非空字符串（server.ts:93）；记录 `runId` 入清理清单。
- S02 有序子序列断言：事件流按序包含 `run:accepted → run:start → node:start →
  node:done → run:done`（跳过 `run:progress`/其余事件；engine.ts:67,91,127,150）。
- S03 `node:start` 与 `node:done` 的 `id` 序列均恰为 `[1, 2]`（拓扑序覆盖全部节点；
  engine.ts:51-61,134-139；node:start 载荷 server 侧 engine.ts:91）。
- S04 末事件 `run:done`：`ok===true && stopped===false && done===2 && total===2`
  （engine.ts:150）。
- S05 `run:done` 后流收束：reader 正常 done、无后续事件（server.ts:121 `res.end()`）。

**R · runs 列表与回放（REQ-05 / AC4；承 S 阶段 runId）**
- R01 `GET /api/v1/runs?limit=20` → 200，列表含 `runId`（server.ts:160-164）。
- R02 `GET /api/v1/runs/:runId` → 200，`run.status==='done' && run.done===2 &&
  run.total===2 && typeof run.ended_ms==='number'`（store.ts:116-120,131-137 patch 语义）。
- R03 `detail.events` 与 SSE 全量收集事件**按序深相等**（条数相等 + 逐条 deep-equal）。
  数组序即 seq 升序（store.ts:121 `ORDER BY seq ASC`）且首条为 `run:accepted`
  （seq=0，server.ts:88-93「先落库后写网」同源）——即 AC4「自 seq=0 严格升序且与
  SSE 一致」的可执行化。

**D · 活动 run 删除 409 + approve 收尾（REQ-06 / AC5；夹具 §7-WFAPPR）**
- D01 SSE 消费与 409 断言**并发**进行：`waitFor(ev.type==='approval:required')`，
  上限 20s（handlers.ts:211-212）。见到该事件即 run 确定处于挂起活动态
  （PRD 风险 3 的实现级答案：不靠猜时序，以事件为门）。记录 `approvalRunId`。
- D02 `DELETE /api/v1/runs/:approvalRunId` → **409** `{error:'run is active'}`
  （server.ts:180；活动判据为内存 runsById，server.ts:47,104）。
- D03 `POST /api/v1/run/:approvalRunId/approve` body `{nodeId:1, approve:true}`
  → 200 `{ok:true}`（server.ts:135-141 + engine.ts:44-48）。
- D04 `waitFor(run:done)`（上限 30s）：`ok===true && stopped===false`，且此前出现
  `approval:done {nodeId:1, approve:true}`（handlers.ts:221）。
- D05 `GET /api/v1/runs/:approvalRunId` → 200，`run.status==='done'`（store.ts:211-215）。
- D06 `DELETE /api/v1/runs/:approvalRunId` → 200 `{ok:true}`（server.ts:181-182）。
- D07 `GET /api/v1/runs/:approvalRunId` → 404。

**C · 自清理与零残留（REQ-08 / AC7；finally 内，尽力而为 + 如实报告）**
- C01 对清理清单中每个 runId：先试 DELETE；若 409（仍活动，仅失败路径会发生）则
  `POST /api/v1/run/:id/stop`（server.ts:126-132）待 1s 再 DELETE。删除结果如实输出。
- C02 对清理清单中每个 workflowId 执行 DELETE（已删则 404 容忍，不算失败）。
- C03 复查：`GET /api/v1/workflows` 与 `GET /api/v1/runs?limit=100` 均不含任何自建 id。
- C04 子进程终止确认（exit 事件到达或 kill 兜底成功）。
- 注：断言全程只读写自建 id，既有行零读写破坏（AC7）；进程被硬杀的极端残留由
  BK-0011 互补治理（PRD 风险 1 口径）。

## 7. 测试夹具（精确到字段）

WFNode/WFEdge 形状遵 `packages/shared/src/types.ts:41-59`（id/type/x/y/title/params；
边 id/fn/fp/tn/tp）。**params 显式给出、不依赖 DEFS 默认值**——夹具自包含，默认值
守护属 BK-0003。

**WF（W 组 CRUD 载荷，v2 版仅改 name）**
```json
{ "name": "smoke-crud",
  "nodes": [ { "id": 1, "type": "userinput", "x": 100, "y": 100,
               "params": { "var": "question", "defv": "冒烟" } } ],
  "edges": [] }
```

**WFMIN（S/R 组；确定性最小链：无 LLM、无出站、无审批）**
```json
{ "name": "smoke-minimal",
  "nodes": [
    { "id": 1, "type": "userinput", "x": 100, "y": 100,
      "params": { "var": "question", "defv": "冒烟测试问题" } },
    { "id": 2, "type": "prompt", "x": 320, "y": 100,
      "params": { "tpl": "问题：{{question}}" } } ],
  "edges": [ { "id": 1, "fn": 1, "fp": 0, "tn": 2, "tp": 0 } ],
  "inputs": { "question": "冒烟测试问题" } }
```
预期事件流（供 S02 参考，含穿插的 progress）：`run:accepted, run:start(total=2),
node:start(1), run:progress, node:done(1), node:start(2), run:progress, node:done(2),
run:done(ok)`。

**WFAPPR（D 组；单 approval 节点，挂起策略）**
```json
{ "name": "smoke-approval",
  "nodes": [ { "id": 1, "type": "approval", "x": 100, "y": 100,
               "params": { "role": "冒烟测试", "to": "挂起" } } ],
  "edges": [], "inputs": {} }
```
（无入边节点在引擎主循环直接执行，engine.ts:137-138；`to:'挂起'` 触发真实等待，
handlers.ts:210-218。）

## 8. 输出与退出码契约（REQ-08 / AC1）

- 每条断言一行：`PASS <id> <名称>` 或
  `FAIL <id> <名称> | expected: <…> | actual: <…> | ctx: <METHOD url → status + 请求/响应体摘要>`；
  无静默 pass（非功能 2）。
- fail-fast：首个 FAIL 后停止后续断言，打印服务器日志环形缓冲尾（末 200 行），进入
  finally 清理，最终汇总 `==== smoke:server：X passed / Y failed ====`，退出码
  `Y===0 ? 0 : 1`。preflight 失败（P01/P02）与起进程/健康失败同样非 0。
- 正常路径：C 组后杀子进程、打印汇总、exit 0。

## 9. 验收口径（VERIFY 逐条执行；承 PRD AC1/AC8 + 阶段契约）

前置：仓库根。命令均原文执行，证据贴 REPORT。

| # | 命令 / 点位 | 期望 |
| --- | --- | --- |
| A | `npm run build` | 退出 0（shared+web 产物新鲜；smoke 的 web 前置 + gate 前置） |
| B | `npm run build:server` | 退出 0（tsc；smoke 的 server 前置） |
| C | `npm run smoke:server` | 全部断言 PASS、汇总 0 failed、退出码 0（AC1 正例） |
| D | 紧接再次 `npm run smoke:server` | 同 C（可重复/幂等，非功能 1） |
| E | 负例：临时 `mv apps/server/dist apps/server/dist.bak` → `npm run smoke:server` → 恢复目录 | 退出码非 0，输出含 P02 失败名与「npm run build:server」指引（REQ-02/AC1 负例） |
| F | `npm run gate` | 4 场景全绿、diffPx=0（AC8 防误触兜底；基线以 CI 为权威） |
| G | `npm test` | shared 契约测试 5/5 通过（AC8） |
| H | 手动抽查（可选）：另开终端对冒烟所用端口失效后的 `GET /api/v1/runs?limit=100`（需另起服务）确认无 `smoke-` 前缀残留 | C03 已在脚本内断言，此项为人工复核点位 |

## 10. 风险与缓解（承 PRD §依赖与风险，SPEC 层细化）

| 风险 | 缓解（本 SPEC 落点） |
| --- | --- |
| 写真实开发库 data/agentflow.db（store.ts:23-24） | 只操作自建 id；finally C01-C03 自清复查；与开发机并行服务共存无害（SQLite WAL 多进程安全，冒烟选独立端口） |
| 端口占用 / TOCTOU | §5.2 空闲端口 + EADDRINUSE 时健康阶段 fail-fast 呈现日志 |
| approval 窗口内 run 意外提前结束（PRD 风险 3） | D01 以 `approval:required` 事件为门再发 DELETE，不猜时序；窗口本身 10 分钟（handlers.ts:215）远超断言耗时 |
| Windows 子进程清理（PRD 风险 4） | `process.execPath + shell:false` 直达 node；kill→SIGKILL 兜底；SIGINT/SIGBREAK 进 finally；不做优雅停机断言（非目标） |
| 断言与实现漂移 | §1 事实表行号锚定 + §6 期望值全部来自代码实读，VERIFY 时按行号复核 |

## 11. 架构决策记录判定

**无需 ADR（needsAdr=false）。** 理由：① 无产品代码、契约、模块结构变更——新增物
全部在 `tests/`（宪法第 4 条明列不适用项）；② 「纯 Node 脚本 vs 引入测试框架」的
选型已被 PRD 非目标「不引入任何新依赖」锁定，属需求约束而非架构选型；③ 无触 UI、
无 golden/门禁/CI 改动。docs/adr/ 现有 0001-0008 连续编号，本迭代不新增。

## 12. BUILD 注意事项

- 新文件两枚均 ≤400 行（§2 边界规则 3 含拆分预案）。
- 产品提交：仅 `package.json` + `tests/smoke/`（Conventional Commits，一次迭代一个
  提交）；提交前 §9 A-G 全绿，gate 证据入提交说明。
- 不修改 `CONSTITUTION.md`、`AGENTS.md`、`tools/pixel-gate/`、CI 配置（WORKFLOW §6.3）。

---

> **SPEC 交叉核实注记**（spec-designer，2026-10-22 08:11）：本 SPEC 首稿由并发 SPEC 会话
> 落盘（08:07）；本会话独立完成同任务分析（另起一稿设计为 18 断言/两文件方案，与首稿
> 结论一致：落点 `tests/smoke/` 两枚 .mjs、零新依赖、不改产品源码、`PORT` env 注入、
> 有序子序列断言、needsAdr=false）后，逐项复核首稿全部代码引用——`server.ts:47,52-56,`
> `74,88-93,94,104,121,126-132,135-141,144-157,160-169,172-183,185-202`、`engine.ts:`
> `44-48,51-61,66-67,91,112-113,127,134-139,150`、`handlers.ts:205-221`、`store.ts:`
> `23-24,101,109-121,131-137,148-161,163-187`、`config.ts:17-24,55,89`、`util.ts:14-22`、
> `events.ts:8-36`、`types.ts:41-59`、根/server package.json scripts、`.gitignore:17`
> （`data/`）——全部与源码一致，采纳为迭代 0002 正式 SPEC。修正一处首稿笔误：§1/§6
> 断言计数「27 条」与 §6 枚举实数不符，已改为 32 条（P2+H1+W7+N3+S5+R3+D7+C4）。
> 补充一处实现提示供 BUILD 参考（不改变规格）：runs 回放载荷不含 seq 字段
> （`store.ts:121` 仅 `SELECT json ... ORDER BY seq ASC`），R03 的「seq 升序」判据因此
> 以「首条 run:accepted + 与 SSE 流按序深相等」传递性承载，首稿 R03 措辞已是此意。
