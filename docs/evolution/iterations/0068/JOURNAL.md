# JOURNAL · 迭代 0068 · BK-0018 跨 run 记忆工具组实装（memory_get/set/list 内建工具 + MEMORY_ENABLED 开关）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-30 23:40
> 输入：`iterations/0068/PRD.md`（skipSpec=true——受影响文件清单与验收口径内嵌
> PRD §6/§7，以 ADR-0024 §4.3/§4.4 为底稿）+ `docs/adr/0024-memory-tools-crossrun.md`
> （实现定界权威）。issue#17 批复在案（2026-10-30T14:40:05Z 用户本人评论「批准」），
> env 语义请批面解除；reconstitutional=false（非修宪轮）：零 golden 接触、
> 全程未运行 gate:update、未触碰 apps/web / packages/shared。
> 全部改动发生在隔离工作树 `feat/0068-iter` 内，主干零触碰。
> 门禁四命令（build/gate/test/smoke）与 git 提交归脚本统一执行，本 agent 未自行运行；
> 自测仅做 `npx tsc -p apps/server --noEmit`（类型自查，exit 0）与
> `node --check tests/smoke/smoke-server.mjs`（语法自查，通过）。

## 1. 交付物清单（productFiles 白名单申报，跨修复轮累积并集）

| 文件 | 动作 | 行数（实测） | 预算 | 说明 |
| --- | --- | --- | --- | --- |
| `apps/server/src/memory/store.ts` | 新增 | 115 | ≤160 | 案甲仓储：同主库第二 better-sqlite3 连接（kb/store.ts:16/54-75 直系同构）；DDL 单语句 prepare 数组（memory_entries：key PK/value/bytes/created_at/updated_at）；memoryGet（未命中 found:false 不 throw）/memoryUpsert（ON CONFLICT 覆盖刷 updated_at、created_at 保留首写）/countMemoryEntries/memoryList（LIKE 前缀转义 + ORDER BY key（BINARY 码点序）+ LIMIT/OFFSET + truncated=offset+limit<total）；init/close 生命周期（server.ts 门控调用；懒自启 conn() 兜底同 kb/store.ts:72-75） |
| `apps/server/src/memory/tools.ts` | 新增 | 82 | ≤120 | 三 ToolImpl（getImpl/setImpl/listImpl）+ mergeMemoryTools（普通 Map set，返回注入数）+ 限幅常量（KEY_RE `/^[A-Za-z0-9][A-Za-z0-9._:\-/]{0,127}$/`、value 4096 UTF-8 字节、条目 1000、count 1-100 默认 50）——限幅不入 env（ADR §3 否决多 env 族，tools.ts:34-35 先例）；失败语义如实 throw 不截断（set 超限/满载新 key、key 非法、count/offset 非法）；头注承接隐私知悉款（issue#17） |
| `apps/server/src/tools.ts` | 改 | 175→180 | ≤180 | 唯一触点：TOOL_SPECS 追加 memory_get/memory_set/memory_list 三条 plain-key（模型可见 desc/zod shape 供数）；IMPL/collectTools/stubOf 零改动（结构执法，ADR §4.1） |
| `apps/server/src/llm.ts` | 改 | 126→135 | ≤135 | :40 `const toolImpls = sess.impls;` 之后、:52 `if(toolImpls.size)` 分派之前 env 门控注入：`if (config.memoryEnabled) { mergeMemoryTools(toolImpls); emit('log', sys '🧠 跨 run 记忆 ×3 已注入（MEMORY_ENABLED=1）') }`；import config + memory/tools |
| `apps/server/src/config.ts` | 改 | 149→155 | ≤155 | 白名单数组 +1（`'MEMORY_ENABLED'`）、EnvSchema +1（`z.string().refine(TRUTHY/FALSY)` PTY_ENABLED:79 同款，注释承接 ADR §3）、输出映射 +1（`memoryEnabled: !!env.MEMORY_ENABLED && TRUTHY.test(...)` ptyEnabled:128 同款）；fail-fast 通道复用（:85-88 零改动） |
| `apps/server/src/server.ts` | 改 | 335→340 | ≤340 | import memory/store；initKbStore/initKbIndex 之后 `if (config.memoryEnabled) initMemoryStore();`（门控建表——US-2 默认关不建表不连接）；shutdown 内 closeKbStore 之后、closeStore 之前 `closeMemoryStore();`（未启用零操作，「停机先关副仓储」时序先例同型） |
| `apps/server/.env.example` | 改 | 25→26 | ≤28 | MEMORY_ENABLED 注释一行（PTY_ENABLED :21 同款形态；含全局 KV 无隔离与明文落库知悉） |
| `tests/smoke/smoke-server.mjs` | 改 | 2395→2683 | 上限内 | MEM01~MEM07 七断言（§3）+ mock 端点 MEM 标记词路由（A02 tool_call 同通道）+ memoryRowsOf/memoryTableExists 只读直查助手（auditsOf 同款窄口径）+ memSrv 探针实例（清理清单同批）+ mockSrv env 钉 `MEMORY_ENABLED:''`（空串=未配置语义，防开发者 .env 泄入）；R1 修复轮再修 MEM01/02/04/05 与 mock 路由（§7） |
| `tests/smoke/mcp-stubs.mjs` | 改 | 219→227 | 上限内 | R1 修复轮（BUG-0068-01，首轮清单漏列项）：M02 冻结基线扩容口径——TOOL_SPECS 点前缀 12 键恰等 + plain key 白名单恰三条（ADR-0024 §2.1，无点前缀=capabilities 派生零命中与 IMPL 豁免的结构前提）+ IMPL 5 服务器不变 |
| `docs/adr/0024-memory-tools-crossrun.md` | 改 | 状态行 | — | 头部状态行「草案 · 待用户批准」→「已批准 · 已实施」（批准时间戳 2026-10-30T14:40:05Z 可引）——PRD 提交编排指派的实现轮文档同步面 |

机制件（不入 productFiles）：`docs/evolution/STATE.md`（phase=BUILD）+
`docs/evolution/iterations/0068/JOURNAL.md`（本文件）+ `docs/evolution/BACKLOG.md`
BK-0018 行（坐标勘误兑现 + BUILD 事实注追加——ADR §1.2-1 将 :103→:111-124 修正
指派给实施轮文档同步面）。

## 2. 定界符合性（ADR-0024 逐条）

- **§4.1 注入点与 IMPL 豁免**：唯一注入通道 = llm.ts:40 后 env 门控 merge；
  `grep -n "memory_" apps/server/src/tools.ts` 仅命中 TOOL_SPECS 三条与头注
  （IMPL/collectTools/stubOf 零命中，自检输出见 §5）；mcp/inject.ts / agent.ts /
  engine.ts / capabilities.ts / store.ts（主仓储）零 diff。
- **§4.1 capabilities 零污染**：三工具 plain key（无点前缀），
  capabilities.ts:48-49 `key.startsWith(`${id}.`)` 前缀派生零命中——MEM06 以
  CAP_EXPECTED_BUILTIN 字面量在默认关与开启双实例 deepEqual 机器证明。
- **§4.2 案甲承载**：memory/store.ts 第二连接（ROOT 派生 + busy_timeout=2000 +
  DDL prepare 数组）；store.ts 主仓储零改动（400 贴线）。
- **§2.2 失败语义**：set 超限 throw 不截断、满载新 key throw 指引覆写、
  get 未命中 found:false 不 throw、list 分页 truncated=offset+limit<total、
  空串 value 合法；同 key 重复 set 覆盖更新（ON CONFLICT 不触 created_at）。
- **§2.3 全局 KV**：无用户/工作流隔离如实声明（store.ts/tools.ts 头注 +
  .env.example 注释），不伪装成已隔离。
- **REQ-0068-06 可观测**：注入 sys log 行「🧠 跨 run 记忆 ×3 已注入
  （MEMORY_ENABLED=1）」；工具调用沿既有 log 事件（llm.ts:69-70 零改动）；
  ✓ 摘要 capSummaryServer 零改动（不含 memory，MEM02 断言覆盖 🧠 行为）。

## 3. MEM 组扩断言（ADR §4.4 全清单落地）

| 断言 | 实例 | 判据 |
| --- | --- | --- |
| MEM01 默认关零漂移 | mockSrv（`MEMORY_ENABLED:''` 钉未配置） | 单 llm run ok；mock 请求体无 tools 键（更无 memory_*）；无 🧠 log；token 命名域 `mem:smoke:<tok>:` 零写入；表存在态只记录不判（共享库跨轮残留属环境态——「不建表」由 server.ts 门控接线承载 + MEM02 建表正证） |
| MEM02 开启注入恰三键 | memSrv（MEMORY_ENABLED=1，MCP 两 env 空串钉值防泄漏） | 请求体 tools 键集排序 deepEqual `[memory_get,memory_list,memory_set]`；🧠 sys log 在事件流；node:delta 恰 1（工具循环形态，ADR §4.1 行为特征锚定）；启动后 memory_entries 表在库 |
| MEM03 跨 run 持久化 | memSrv 两 run（不同工作流名） | run1 memory_set → run2 memory_get 读回同值（out 含「读回:跨run记忆值」，mock 从 tool 结果消息提取 value）；SQLite 直查恰 1 行且 key/value/bytes(UTF-8)/created_at/updated_at 对账 |
| MEM04 list 语义 | memSrv 三 run | count=1 + offset 0/1/2 三页：前两页字典序 alpha→l1 且 truncated=true、第三页空且 truncated=false（终文本逐字对账）；域外键被 prefix 过滤；直查恰 2 行 BINARY 升序 |
| MEM05 负例不崩 run | memSrv 两 run | 【R1 已按 BUG-0068-05 对齐 AI SDK 7 现实，见 §7】非法 key / value 4097 字节各一 run——execute 异常被 AI SDK 7 转为 error tool-result 回灌模型（不传播至 llm.ts catch），3 轮预算耗尽收束：run:done 均 ok:true（不崩）、mock 请求增量恰 6（每 run 3 轮）、零 🔧 行零「工具循环异常」warn、token 域零落库（不截断不写入）——AC5 安全核满足，可观测性缺口另立 backlog |
| MEM06 capabilities 零污染 | mockSrv + memSrv | 双实例 mcp.builtin 与 CAP_EXPECTED_BUILTIN deepEqual；memSrv external [] |
| MEM07 env fail-fast | spawn dist/server.js（MEMORY_ENABLED=abc） | 退出码恰 1 + 输出含 MEMORY_ENABLED 与「只接受 1/true/yes 或 0/false/no」（PTY env fail-fast 先例形态） |

mock 路由设计要点：MEM 标记词与互审/智能体路由正交（不含关键词）；负例分支按
请求体有无 `tools` 区分工具轮与降级轮（降级轮给终文本使 run 收尾可断言）；
token = `Date.now().toString(36)` 进程内生成 → 键命名域跨轮隔离（upsert 覆盖
不膨胀，共享库残留免疫）。

## 4. 实现决策与偏差记录（零杜撰，供 VERIFY 对照）

1. **memory_list 分页上限参数名定稿 `count`（ADR §2.2 草案名 `limit`）**：
   llm.ts:60-61 zod shape 机械派生以 `/数量|count/i` 识别数值参数
   （`limit` 键会被降为 z.string()——模型发数值即校验失败）；
   `web-search.search count:'结果数量，默认5'`（tools.ts:151）为同族先例。
   语义逐字保留（1-100 默认 50、offset ≥0 默认 0、truncated 判据不变），
   仅承载名随派生规则定稿——ADR §2.2 表自标注「草案，终稿归实施轮」。
   `offset` 保留原名（字符串型，impl 内 toInt 容忍字符串/数值两形态）。
2. **MEM01「主库无新表」的环境态处理**：data/agentflow.db 为全实例共享
   （store.ts ROOT 派生，lib.mjs startServer 不隔离 DB），且 smoke 此前轮次
   的开启实例已建表——表缺席断言在本机非幂等。改为：token 命名域零写入
   （行为级、跨轮幂等）+ 表存在态记录在 actual；「不建表」的结构保证 =
   server.ts `if (config.memoryEnabled) initMemoryStore()` 门控 + DDL 仅在
   init 执行 + MEM02 建表正证。如 VERIFY 需更强证明，可沿 B04 临时目录实例
   方案加断言（未采，避免 worktree 形态 junction 复杂度）。
3. **mockSrv 钉 `MEMORY_ENABLED:''`**：config 空串归一为未配置（G09 压制先例），
   且 .env 不覆盖已有环境变量（config.ts:22）——钉空串即强制「未配置」语义，
   防开发者 apps/server/.env 携 MEMORY_ENABLED=1 泄入导致 G05 流式正则与
   MEM01 双红（pty-sessions.mjs ENV_ON 同款风险意识）。
4. **store.ts WAL 未显式设置**：WAL 为库文件持久属性（主仓储 initStore 已设），
   第二连接沿 pty/audit.ts:39-60 / kb/store.ts:54-61 先例仅设 busy_timeout=2000。
5. **注入行文位置**：`emit('log', sys 🧠)` 在 handler 内、工具循环分支之前——
   事件流上位于 node:start 之后、首个 🔧/🤖 之前（MEM02 以 lvl==='sys' +
   🧠 子串判定，与 V01 互审 sys 行同型）。

## 5. 自检记录（本 agent 实跑；门禁四命令未运行——归脚本）

- `npx tsc -p apps/server --noEmit` → exit 0（零类型错误）。
- `node --check tests/smoke/smoke-server.mjs` → 通过。
- `wc -l` 八文件行数实测（见 §1 表）全部 ≤ PRD §6 预算。
- 禁区 grep（结构执法 AC7 自查）：
  - `grep -n "memory_" apps/server/src/tools.ts` → 仅 TOOL_SPECS 三条 + 头注
    （IMPL 域零命中）；
  - `grep -rn "memory" apps/server/src/mcp/inject.ts apps/server/src/agent.ts
    apps/server/src/engine.ts apps/server/src/capabilities.ts` → 零命中；
  - `git diff --stat HEAD -- apps/web packages tests/golden .github package-lock.json`
    → 恒空（AC9，输出见 §5 自检附录）。
- **未运行**（如实声明）：`npm run build` / `npm run gate` / `npm test` /
  `npm run smoke:server` ——按派发契约归脚本统一执行；gate 首跑若 s3 出现
  issue#12 已知亚像素抖动（diffPx≈21~23），按 PRD 风险 4 双留档复跑口径处置，
  绝不 gate:update。

## 6. 触UI 与影响面声明

触UI=否零反转：apps/web/**、packages/shared/**、tests/golden/**、.github/**、
package*.json 零 diff（§5 机器自查）；SSE 契约零新增（工具调用沿既有 log 事件）；
零新依赖（better-sqlite3 已在）；零新增出站类别（纯进程内 SQLite）；
agent 节点不注入（agent.ts 零 diff，BK-0018 行字面限定 llm handler）。
实现全程未触发 ADR-0024 §8 反转预案任何一条，无需补开 needs-approval。

## 7. R1 修复轮（VERIFY FAIL → 修复，2026-10-31）

> 输入：VERIFY 五项发现（BUG-0068-01~05，全部为冒烟断言面缺陷 + 一项平台语义
> 落差，产品代码 memory/store.ts / memory/tools.ts / llm.ts / config.ts /
> server.ts / tools.ts **零改动**——修复轮只动断言与文档）。处置与自测归本
> agent；门禁复跑与 git 提交仍归脚本。

### 7-1 逐项处置

- **BUG-0068-01（M02 冻结基线未随 TOOL_SPECS 扩容更新）**：根因=ADR-0024 §4.3
  与 PRD §6 受影响清单均漏列 tests/smoke/mcp-stubs.mjs（M02 期望 TOOL_SPECS
  恰 12 键，实 15）。修复=mcp-stubs.mjs M02 改「点前缀 12 键恰等 + plain key
  白名单恰三条（memory_get/list/set）+ IMPL 5 服务器不变」——按 `k.includes('.')`
  切分两白名单（filter 保持 sort 序），白名单外任何漂移仍即红；头注同步。
  **productFiles 累积并集新增 `tests/smoke/mcp-stubs.mjs`**（0034 教训口径）。
- **BUG-0068-02（MEM01 请求过滤器取 messages[0]）**：messages[0] 为 providers
  默认 system 提示词，标记词在 user 消息 → reqFound:false 误红。修复=新增
  `memReqOf(requests, from, marker)` 全消息扫描助手，MEM01/MEM02 两处查找同换
  （smoke-server.mjs）。
- **BUG-0068-03（MEM01/02 tools 键集读取假设 object）**：AI SDK 7（ai@^7.0.0）
  OpenAI 兼容线上形态 tools 为数组 `[{type:'function',function:{name,…}}]`
  （探针 toolsIsArray:true、toolsNames 恰三）→ 原 object-only 读取恒得 []。
  修复=新增 `memToolsOf(req)` 两形态兼容（数组取 `t.function.name`，object 取
  键集）；伴随加固 mock 路由 `hasTools` 判定（空数组 truthy 陷阱——降级轮若
  发 `tools:[]` 不再误判为有工具面）。
- **BUG-0068-04（MEM04 次页 truncated 期望笔误）**：offset1+limit1=2 !< total2
  ⇒ false，产品实现公式正确（探针 S4 实证 page2 `l1|trunc=false`），断言期望
  由 true 改 false，行内补公式注。
- **BUG-0068-05（负例错误不可见且不触发降级——采 A 处置）**：探针 S5 实证
  AI SDK 7 把工具 execute 异常转为 error tool-result 回灌模型继续循环，未传播
  至 llm.ts:91-97 catch——3 轮预算耗尽、run ok:true、零 🔧 零 warn。处置：
  ① MEM05 断言对齐现实（安全核 ok:true/请求增量 6/零 🔧 零降级 warn/token 域
  零落库，负例错误对模型可见、对运行日志不可见如实锚定）；② PRD 风险段新增
  第 6 条补记 + ADR-0024 §4.1 行为特征声明补记（机制件 + 产品文档各一处）；
  ③ 可观测性缺口**不在修复轮改 llm.ts 共享错误路径**（波及全工具族=扩大影响
  面），另立 backlog 建议（文案见 7-2，归 PM/CLOSE 落行）。

### 7-2 backlog 建议项（供 PM 评估立项，本 agent 不代建行）

> 建议标题：工具 execute 异常运行日志不可见（AI SDK 7 tool-result 封装吞错误面）
> 类型 test/debt · 触UI=否 · 来源=迭代 0068 VERIFY BUG-0068-05 + VERIFY 探针
> S5 请求流实证（负例 run 零 🔧 零 warn，错误仅以 error tool-result 形态对模型
> 可见，llm.ts:91-97 降级通道对 execute 异常恒不触发）。证据锚：smoke-server.mjs
> MEM05（对齐现实版）· mcp/inject.ts 无错误包装层 · llm.ts:64-71（🔧 emit 位于
> impl await 之后）。候选落点（须另开定界，不在 0068 射程）：llm.ts execute
> 回调内 try/catch 捕获后 warn+重抛（单点、不改共享路径语义）或 AI SDK onError
> 钩子。修复轮依派发指令明确不采（波及面控制），留 PM 裁定。

### 7-3 R1 自检（本 agent 实跑；门禁归脚本）

- `node --check tests/smoke/smoke-server.mjs` → 通过。
- `node --check tests/smoke/mcp-stubs.mjs` → 通过。
- `npx tsc -p apps/server --noEmit` → exit 0（产品代码零改动，复核无漂移）。
- R1 后禁区自查（AC9）：`git diff --stat HEAD -- apps/web packages tests/golden
  .github package-lock.json` → 恒空。
- **未运行**（归脚本）：npm run build / gate / test / smoke:server 全量复跑。

### 7-4 R1 productFiles 申报（累积并集，§1 表为准）

上轮 9 文件 + `tests/smoke/mcp-stubs.mjs` = **10 文件**（smoke-server.mjs 与
docs/adr/0024 本轮再改，仍在清单内；PRD/JOURNAL/BACKLOG/STATE 为机制件）。

## 8. R2 门禁首跑 s3 抖动处置（2026-10-31，根本规范核查结论 = 非违宪、系已知噪声）

> 门禁首跑（脚本执行 `npm run gate`）1 个场景违宪：s3-library。按 PRD 风险 4
> 既定口径处置（双留档 + 复跑为准，绝不 gate:update）。产品代码与 golden 基线、
> tools/pixel-gate **零触碰**。

证据链（全部本 agent 实跑，详见 `evidence/gate-first-run.log` 留档）：

1. **唯一 FAIL 场景 = s3-library**：`ls tests/golden/diff/` 仅
   s3-library.{current,diff}.png + s3-library.invariants.json 三文件（s0~s6 其余
   场景无差异产物；ask 转述的场景输出头部截断，以 diff 目录实证为准）。
2. **DOM 不变量语义逐位全等**：`node -e` 对基线
   `tests/golden/ui/s3-library.invariants.json` 与实测
   `tests/golden/diff/s3-library.invariants.json` 做 JSON.parse + stringify 全等
   判定 → `semantically equal: true`（字节差 1485/1429 纯系基线 CRLF vs gate
   落盘 LF 的报告文件行尾差异；gate 自身比较为
   `JSON.stringify(goldenInv) !== JSON.stringify(cur.invariants)` 语义口径，
   gate.mjs:683）→ invDiff=false，FAIL 纯由像素 diff（gate.mjs:687-690）。
3. **像素差异量级 = diffPx 21**：node + pngjs 统计 diff.png 红色差异像素
   （r>200 && g<100 && b<100）→ `red-diff-px: 21, rows-hit: 18`（1600×900）——
   正中 issue#12 已知本机亚像素渲染噪声带宽 ≈21~23（PRD 风险 4 原文；先例
   0050 JOURNAL:121「s3-library 亚像素渲染噪声（diffPx≈23，rerun 即绿）」；
   BK-0042 行「s3-library.png 抖动字节变化……s3 依 issue#12 纪律不消费抖动
   重录、golden 权威在 CI」）。
4. **因果面为零**：s3-library 系纯离线场景（gate.mjs:577
   `{ id: 's3-library', steps: [clickRail('nodes')] }`——无 routes、无后端端点
   依赖）；本迭代 apps/web/**、packages/shared/** 零 diff（AC9 机器证明），
   MEMORY_ENABLED 默认关零行为（MEM01 机器证明）——后端改动对该场景无任何
   因果路径；间歇性本机噪声先例在案（0051「s3 抖动形态未出现」vs 0054/0056
   「s3 抖动同型复发」）。

处置：① 双留档——`iterations/0068/evidence/gate-first-run.log`（0038 先例
同型）+ 本节；② 不重录 golden、不运行 gate:update（issue#12 属 golden/CI 需
批准射程，未经用户批准零动作）；③ 复跑为准归脚本（先例「rerun 即绿」；若
复跑仍命中，按 0054 §6 P1 同型口径在合并复测阶段以 CI 运行环境为权威）。
本迭代至 R2 累计**零 golden 接触、零 gate:update、零 pixel-gate 改动**。
