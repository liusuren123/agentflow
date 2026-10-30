# REPORT · 迭代 0068 · BK-0018 跨 run 记忆工具组实装（memory_get/set/list + MEMORY_ENABLED）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-30（本会话隔离工作树
> `.zcode/worktree/feat/0068-iter/` 内执行，全部命令在该树 cwd 实跑）
> 输入：PRD（iterations/0068/PRD.md §7 AC1~AC9）+ JOURNAL §3/§4/§5 + ADR-0024
> §2/§4/§6 验证口径。输入材料本身给出的口径：build/gate/test 已由脚本在本工作树
> 运行且通过（派发指令原文），故未复跑；针对性 E2E 由本 VERIFY 轮执行。
>
> **轮次记录**：第一轮 VERIFY=FAIL（BUG-0068-01~05，见 §一~§五）→ BUILD R1 修复轮
> （JOURNAL §7，产品代码零改动、断言与文档修复）→ **R1 复验=FAIL（新发现
> BUG-0068-06，见 §六）**。修复轮已耗 1/2，R2 为最后修复轮。

## 结论：**FAIL（回 BUILD 修复轮，repair_round 0→1 由协调者记账）**

产品功能面（memory 三工具语义、开关门控、存储承载、结构执法、capabilities 零污染、
env fail-fast）经第一手 E2E 逐项验证**全部符合 PRD/ADR 定界**；FAIL 由验收载体侧
缺陷构成：**1 条既有冒烟断言回退（BUG-01）+ 3 条本轮新增冒烟断言自身缺陷
（BUG-02/03/04，首跑即红——JOURNAL §5 如实声明 BUILD 仅做 tsc/node --check，
门禁四命令归脚本且脚本只跑了 build/gate/test 三项，MEM 组从未被任何人执行过）**
+ 1 条 AC5 语义落差需 PM 裁定（BUG-05）。冒烟套件 fail-fast 于 MEM01 中止，
MEM02~07 与既有 Z 组（Z01~04）本轮**未在套件内执行**（下文逐项给出替代证据）。

## 一、AC 逐条验收（PRD §7 Given/When/Then）

### AC1 默认关零漂移 —— **产品面 PASS；套件断言 MEM01 自身缺陷（BUG-02）**

- **主库无新表（最强形态，fresh DB 直证）**：VERIFY 轮起跑时工作树 `data/` 不存在
  （`ls data/` 报 No such file）。`PORT=4101 node apps/server/dist/server.js`
  （无 MEMORY_ENABLED）启动后 `better-sqlite3` 只读直查
  `sqlite_master`：11 表全为存量（approval_audits/kb_*/messages/pty_audits/
  run_events/runs/sessions/sqlite_sequence/workflows），**`memory_entries` 不在场**
  （`memory_entries present: false`）；启动日志仅 SQLite/pty/kb 三条就绪行、
  **零 memory 行**。随后 `MEMORY_ENABLED=1 PORT=4102` 启动：日志出现
  `memory 跨 run 记忆存储已就绪`，直查 `memory_entries` 在场且列型恰为
  `key:TEXT/value:TEXT/bytes:INTEGER/created_at:INTEGER/updated_at:INTEGER`
  （ADR-0024 §4.2 DDL 逐列吻合）、0 行。**server.ts 门控接线（不建表不连接）
  得到开关两态第一手实证**。
- **capabilities 逐字节不变**：默认关实例响应存档后，开启实例（:4102）响应
  `cmp` 比对 → `IDENTICAL-BYTES`；默认关响应全文 `grep -c memory` = **0**；
  builtin 恰五服务（filesystem/fetch/sqlite/browser/web-search）。
- **run 请求体零 tools 键**：独立探针（复刻 MEM01 环境，见「三、探针」）S1 捕获
  实际请求：`hasTools:false、toolsNames:[]、roles:"system,user"`、事件流无 🧠、
  run:done ok:true、token 域零写入——产品行为恰为 AC1 要求。
- **套件内 MEM01 红为断言缺陷**：smoke-server.mjs:2451 过滤器取
  `messages[0].content`，而实测请求 `messages[0]` 为 **system 消息**
  （providers 默认系统提示词「你是智能客服助手…」，探针 `roles:"system,user"`
  实证），标记词在 user 消息 → `reqFound:false` 误红 → **BUG-02**。
  MEM01 其余子条件（ok:true/toolKeys 空/无 🧠/tokRows 0）本轮套件内全真。

### AC2 开启注入恰三键 —— **产品面 PASS；套件断言 MEM02 线格式缺陷（BUG-03，未在套件内执行）**

探针 S2（MEMORY_ENABLED=1 实例）捕获请求：
`toolsIsArray:true, toolsNames:["memory_get","memory_list","memory_set"]`（恰三、
零多余键）；事件流含 `sys:🧠 跨 run 记忆 ×3 已注入（MEMORY_ENABLED=1）`。
**AI SDK 7（ai@^7.0.0 + @ai-sdk/openai-compatible@^3.0.71）线上 tools 为数组**，
而 smoke-server.mjs:2452/2481-2483 的键集读取带 `!Array.isArray(req.tools)` 守卫
→ 数组形态恒得 `[]` → MEM02 若执行必红 → **BUG-03**（MEM01 同款行亦受波及）。
注入点/门控在源码层核对：llm.ts:46-49（sess 取得后、:52 `toolImpls.size` 分派前
env 门控 merge）+ llm.ts:63 `/数量|count/i` 数值参数派生（JOURNAL 决策 1 的
`count` 定稿依据在源码证实）。

### AC3 跨 run 持久化 —— **产品面 PASS（套件内未执行，fail-fast）**

探针 S3：run1（`p03 写入`，mock 令模型调 `memory_set`）→ run2（`p03 读取`，
不同工作流名）终文本 `读回:跨run记忆值`（同值读回）；直查
`memory_entries` 恰 1 行：`value:"跨run记忆值"`、`bytes:15`（UTF-8 口径相符）、
`created_at≤updated_at`。套件内 MEM03 因 MEM01 fail-fast 未执行。

### AC4 list 语义 —— **产品面 PASS；套件断言 MEM04 期望字面量与 ADR 公式矛盾（BUG-04，未在套件内执行）**

探针 S4（种子=alpha+l1 同域 + zz<tok>other 域外，与 MEM04 同构）：
- page1 `probe:smoke:<tok>:alpha|trunc=true`（offset0+limit1=1 < total2 ✓）；
- page2 `probe:smoke:<tok>:l1|trunc=**false**`——按 ADR-0024 §2.2 公式
  `truncated = offset+limit < total`（1+1=2 < 2 = false），**产品实现公式正确**；
  而 smoke-server.mjs:2510 期望字面量第二页写死 `trunc=true`，与 ADR 自身公式
  矛盾 → 若执行必红 → **BUG-04**；
- page3 空 + `trunc=false` ✓；域外键被 prefix 过滤（直查域内恰 2 行、域外恰 1 行、
  key BINARY 升序）✓。

### AC5 负例不崩 run —— **部分满足：安全核（不崩/零落库/不截断）PASS；「降级既有形态」未发生（BUG-05，需 PM 裁定）**

探针 S5（非法 key `bad key!` / value 4097 字节各一 run）：
- 两 run `run:done ok:true` —— **不崩** ✓；
- 直查 `bad key!` 与 `<tok>:big` 均 0 行 —— **如实 throw 不截断、零落库** ✓；
- **但**请求流为 3 个全部携 tools 的工具轮（`roles:"system,user(,assistant,tool)*3"`），
  无降级轮、无 `warn:工具循环异常`、无 `🔧 工具调用` 行、node out 为空串——
  **AI SDK 7 将工具 execute 异常转为 tool-result 回灌模型**（未传播至
  llm.ts:91-97 的 catch），3 轮预算耗尽后空文本收尾。PRD AC5 明文期望
  「llm 工具循环异常降级既有形态（llm.ts:82-84 通道）」**未兑现**，且错误对
  用户侧零可见（违反 US-3 可观测精神）。详见 BUG-05。

### AC6 env fail-fast —— **PASS（第一手直证；套件内 MEM07 未执行）**

`MEMORY_ENABLED=abc PORT=4103 node apps/server/dist/server.js` → **exit=1**，
fatal 日志：`"problems":["MEMORY_ENABLED=\"abc\"：只接受 1/true/yes 或 0/false/no"]`、
`"msg":"环境变量配置错误，启动终止（详见 problems，逐项修正后重试）"`——变量名与
合法词形俱全（PTY 先例形态）。config.ts:85-88（+3 行白名单 :36、schema :84-88、
映射 :134）diff 逐处核对与 PRD REQ-0068-01 一致。

### AC7 结构执法 —— **PASS（机器证明）**

- `grep -n "memory_" apps/server/src/tools.ts` → 恰 3 命中，全部位于 TOOL_SPECS
  （tools.ts:160-162），IMPL/collectTools/stubOf 域零命中；
- `grep -rn "memory" apps/server/src/{mcp/inject.ts,agent.ts,engine.ts,capabilities.ts,guard.ts,store.ts}`
  → **零命中**（exit 1）；
- capabilities.ts:44-52 派生面源读证实：builtin = `TOOL_SPECS` 键按 `${id}.`
  前缀过滤，plain key `memory_*` 无点前缀 → 结构性零命中（与 AC1 字节比对互证）。

### AC8 回归面全绿 —— **FAIL（本轮唯一未达 AC）**

- `npm run build` / `npm run gate` / `npm test`：**脚本已在工作树内运行且通过**
  （派发指令口径；本轮按指令未复跑。旁证：apps/server/dist 全量产物含
  dist/memory/{store,tools}.js 在场、apps/web/dist 在场、tests/golden/diff/ 目录为空）。
  gate.mjs 场景含真实交互驱动（rail click/dblclick/contextmenu/change，gate.mjs:60-66/
  230/406-411/442 等）+ 像素 0 容差 + DOM 不变量——前端回归主证仍以该次脚本运行为准。
- `npm run smoke:server`：**本 VERIFY 轮实跑两次（首跑 + 复跑取全量日志），结果一致：
  `162 passed / 2 failed`（exit 1）**。红项 = M02（BUG-01）+ MEM01（BUG-02）；
  fail-fast 于 MEM01 中止 → MEM02~07、Z01~04 未执行。
  基线对照：0067 主干复测 `168 passed / 0 failed`（iterations/0067/MERGE.md:34）；
  本轮 M02 红即**既有断言回退 1 条**（BUG-01）。总数漂移说明：C01 清理断言按 run
  数逐条计数，MEM02~07/Z 跳过使本轮 run 数减少，总数（164）与「168+7」不直接可比。
- 未验证面如实声明：**Z01~04（悬挂 run 启动扫尾，既有组）本轮套件内未执行**，
  本轮无该组回归证据（改动默认关零漂移 + 手动 E2E 默认关启动/停机正常为旁证，
  不构成该组断言证据）。

### AC9 禁区机器证明 —— **PASS**

`git diff -- apps/web packages tests/golden .github package-lock.json package.json`
→ **0 字节**；`git status --porcelain` 同域 → 空。全程未运行 gate:update、
零 golden 接触（工作树 git log 停留在主干 HEAD 1898113，产品改动未提交，
VERIFY 先于分支双提交，符合 WORKFLOW §4 时序）。行数预算复核：115/82/180/135/
155/340/26/2663 与 JOURNAL §1 申报逐文件一致，全部 ≤ PRD §6 预算。

## 二、BUG 清单（编号 BUG-0068-NN，交 BUILD 修复轮）

### BUG-0068-01 · Major · 既有冒烟断言回退：M02 冻结基线未随 TOOL_SPECS 扩容更新
- **现象**：`npm run smoke:server` M02 红：expected TOOL_SPECS 12 键 / actual 15 键
  （+memory_get/memory_list/memory_set），IMPL 五服务器不变。
- **定位**：tests/smoke/mcp-stubs.mjs:52-60（`FROZEN` 基线 :26-40 恰 12 条点前缀键，
  `wantSpec` 精确全等）。根因：ADR-0024 §4.3 与 PRD §6 受影响文件清单均只列
  smoke-server.mjs，**遗漏 mcp-stubs.mjs**——TOOL_SPECS 合法扩容必然撞 M02 冻结面。
- **修复建议**：M02 改为「12 条点前缀键恰等（前端 MCP_SERVERS 冻结面语义不变）+
  plain key 显式白名单恰 `memory_*` 三条」；描述与 ctx 同步。白名单式改法可保住
  「前端清单冻结」的原断言意图（memory 本就不进前端清单，ADR-0024 §5.6）。

### BUG-0068-02 · Major · 新断言缺陷：MEM01 请求过滤器取 messages[0]（实为 system 消息）
- **现象**：套件 MEM01 `reqFound:false` 红（其余子条件全真）；探针实测请求
  `roles:"system,user"`，`messages[0]` 为 providers 默认系统提示词，标记词在 user 消息。
- **定位**：tests/smoke/smoke-server.mjs:2451（`r?.messages?.[0]?.content`）。
- **修复建议**：改按「最后一条 user 消息」或全消息扫描匹配标记词（与既有路由
  :246 `lastUser` 同款口径）。

### BUG-0068-03 · Major · 新断言缺陷：tools 键集读取假设 object，AI SDK 7 线上格式为数组
- **现象**：探针实测 `toolsIsArray:true`；smoke 键集读取 `!Array.isArray` 守卫 →
  恒 `[]` → MEM02（:2481-2483 判定）与 MEM01（:2452）若执行必红。
- **定位**：tests/smoke/smoke-server.mjs:2452、2481-2483（`Object.keys(req.tools)` 路径）。
- **修复建议**：`Array.isArray(req.tools)` 时取 `tools.map(t=>t.function?.name??t?.name)`
  排序后 deepEqual（探针已用该口径拿到恰三键，可照抄）。

### BUG-0068-04 · Minor · 新断言缺陷：MEM04 第二页 truncated 期望与 ADR-0024 §2.2 公式矛盾
- **现象**：产品返回 page2 `l1|trunc=false`（公式 offset1+limit1=2 < total2 = false，
  正确）；smoke-server.mjs:2510 期望字面量第二页 `trunc=true` → 必红。
- **定位**：tests/smoke/smoke-server.mjs:2510（page12 字面量）。
- **修复建议**：第二页期望改 `trunc=false`（第三页 empty|false 不变）。

### BUG-0068-05 · Major · 语义落差（需 PM 裁定修复方向）：负例错误不可见、不触发降级通道
- **现象**：非法 key / value 超限 run 均 ok:true 收尾但 **out 为空串**：无
  `warn:工具循环异常`、无 🔧 行、无降级直生成轮（请求流=3 个携 tools 工具轮）。
  AI SDK 7 不将工具 execute 异常传播至 llm.ts:91-97 catch，而是转为 tool-result
  回灌模型 → 3 轮预算耗尽 → 空文本。PRD AC5 / ADR §4.4 MEM05 明文期望的
  「llm.ts:82-84 工具循环异常降级既有形态」未兑现，错误对用户零可见。
- **定位**：apps/server/src/llm.ts:67-74（execute 包装器仅在 impl 正常返回时 emit）、
  :76-97（try/catch 只接 generateText 传播异常）；平台行为=ai@^7.0.0 工具错误语义，
  **非本迭代引入**（既有任意工具 throw 同路径，此前冒烟从未测过 throw 路径）。
- **修复选项**：
  - **A（建议，修复轮采）**：smoke MEM05 期望改为实测现实形态（ok:true + 零落库 +
    预算耗尽空文本形态），PRD/ADR-0024 §4.1 行为特征补记「工具执行异常由 SDK
    回灌模型、不触发降级通道、用户侧不可见」；另立 backlog 项
    「工具执行异常可观测性（execute 包装 warn + 降级）」——该改动波及**全部**工具
    的失败路径（llm.ts 共享通道），超出 BK-0018 申报面，不应在修复轮顺手做。
  - B（不推荐本轮）：在修复轮改 llm.ts execute 包装加 warn+降级——满足 PRD 字面
    但影响面扩至全工具族，按 WORKFLOW §4 属「扩大影响面」，须走中止/批复流程。

## 三、VERIFY 轮第一手验证执行清单（全部命令在本工作树 cwd 实跑）

1. **手动 E2E 开关两态走查**：`PORT=4101`（关）→ health 200 / capabilities 存档 /
   直查 11 存量表无 memory_entries / 启动日志无 memory 行；`MEMORY_ENABLED=1
   PORT=4102`（开）→ capabilities `cmp` **IDENTICAL-BYTES** / memory 就绪日志 1 条 /
   memory_entries 建表且 DDL 五列恰合；`MEMORY_ENABLED=abc PORT=4103` → **exit=1**
   + fatal 含变量名与「只接受 1/true/yes 或 0/false/no」。
2. **`npm run smoke:server` ×2**：`162 passed / 2 failed`（M02+MEM01；fail-fast 于
   MEM01）。既有组 P/M(除 M02)/H/W/N/CAP/S/R/D/E/K/G/V/A/T/O/J/B/PT/KB 全绿
   （PASS 行实证）；红项与跳过集见 AC8。
3. **独立探针**（临时脚本 `.verify-tmp/mem-probe.mjs`，复刻 MEM01~05 最小环境、
   逐请求捕获、独立断言 14 项：13 PASS / 1 FAIL——该 FAIL 即 BUG-04 的套件期望
   缺陷，产品侧公式正确）：S1 默认关四条件真；S2 恰三键+🧠；S3 跨 run 读回+直查
   对账；S4 分页/字典序/域过滤+直查；S5 不崩/零落库/请求流形态（BUG-05 实证）。
4. **交互回归抽查（UI）**：ZCode 内嵌浏览器 webview 本机不可用
   （`browser guest not attached`×3，如实记录）→ 改用本仓 Playwright@1.64.1
   （与 gate 同依赖）驱动真实 UI（服务 ：4104，`GET / → 200 text/html`）：
   - DOM 骨架：`#viewport`/`#world`/`#nodes-layer`/`.node`×8/`:root --bg:#171718`/
     world transform ✓；
   - rail 页签 nodes/workflows/history/settings 点击后面板呈现 ✓×4；
   - 画布双击 → `#search-modal.show` + 14 类节点列表 → 选 LLM → `.node` 8→9 ✓；
   - 新 LLM 节点属性面板 MCP 开关 `data-sid` **恰五内建**（filesystem/fetch/sqlite/
     browser/web-search）且面板文本 **零 memory**（AC1 前端面第一手实证）✓；
   - 节点拖拽 left/top 位移（40,330→130,390）✓；滚轮缩放 world transform 变化 ✓；
     Ctrl+Z 撤销回 8 ✓；截图留证（探针目录已随清理删除，形态描述与本段记录为准）。
   - 抽查覆盖面对照 test-manager 交互清单：页签/加节点/拖拽/缩放/撤销 命中；
     框选/连线/快捷键全集/审批弹窗/导入导出/多标签未逐一手驾——其回归主证为
     脚本 gate 运行（全场景像素 0 容差 + DOM 不变量 + 交互驱动）与本轮
     apps/web 零 diff（AC9），本抽查为增量抽样而非全量替代。
5. **机器自检**：AC7 双 grep、AC9 双证明、八文件 `wc -l` 预算复核、
   config.ts/capabilities.ts/server.ts/llm.ts 改动逐处源读（TRUTHY/FALSY :40-41、
   白名单/schema/映射三处、`if (config.memoryEnabled) initMemoryStore()` :130-132、
   `closeMemoryStore()` :335、注入点 llm.ts:46-49、capSummaryServer :119-134 不含 memory）。

## 四、如实声明（未跑/不可证/环境注记）

- build/gate/test 未复跑（派发指令明示脚本已跑绿；上列旁证非替代证据）。
- MEM02~07、Z01~04 未在套件内执行（fail-fast）；MEM02~06/07 的产品面已由探针/
  手动 E2E 等价覆盖并逐条注明；**Z01~04 本轮零回归证据**（修复轮全套重跑时补证）。
- 本机环境注记：shell 全局带 DeepSeek 密钥（health 显示 provider configured）——
  探针/手动 E2E 均以 AI_BASE_URL 显式注入 mock 端点，模型流量零外泄
  （smoke mockSrv 同款钉值口径，JOURNAL §4-3 风险意识在案）。
- 探针在共享 data/agentflow.db 留有 `probe:smoke:<tok>:`/`mem:smoke:<tok>:` 命名域
  行与 run/workflow 记录（token 进程内生成、跨轮幂等，与 MEM 组断言口径兼容，
  不影响修复轮重跑；data/ gitignore 不入库）。
- `iterations/0068/` 目录现仅 PRD/JOURNAL/REPORT 三件；SPEC 豁免（skipSpec=true）
  与 PRD 声明一致。

## 五、处置建议（交协调者）

1. VERIFY=FAIL → 回 BUILD 修复轮（≤2 轮）：修 BUG-01~04（纯测试文件三处 +
   mcp-stubs.mjs 基线一处）+ BUG-05 采选项 A（MEM05 期望对齐现实 + PRD/ADR 行为
   特征补记 + 可观测性另立 backlog 项）。修复轮 productFiles 白名单需**累积并集**
   增补 `tests/smoke/mcp-stubs.mjs`（BUG-01 教训：白名单外的既有测试文件也是
   TOOL_SPECS 扩容的必要同步面）。
2. 修复轮完成后 VERIFY 复验口径：`npm run smoke:server` 全绿（本轮 162+2 红项
   清零、MEM02~07/Z01~04 实跑补证）+ AC7/AC9 机器证明复跑 + capabilities 字节
   比对复跑；build/gate/test 由脚本照常门禁。
3. STATE.md phase 已按派发指令置 VERIFY；repair_round 留待协调者按本 REPORT
   记账（本 agent 不越权改数）。

## 六、R1 修复轮复验（2026-10-31，本会话在隔离工作树内实跑）

> 输入：JOURNAL §7（R1 处置申报：BUG-01~05 全修、产品代码零改动、productFiles
> 累积并集至 10 文件）+ JOURNAL §8（gate s3 抖动处置）+ PRD/ADR BUG-05 补记。
> 本轮为修复后复验：只复跑受修复影响的检查 + 全部机器证明 + 抽查
> （build/gate/test 按派发指令不复跑，脚本口径已过）。

### 6-1 R1 五项修复的逐项复核

| BUG | 修复内容（JOURNAL §7） | 复验证据 | 判定 |
| --- | --- | --- | --- |
| BUG-01（M02 冻结基线） | mcp-stubs.mjs M02 改「点前缀 12 键恰等 + plain key 白名单恰三条 + IMPL 5 服务器」 | `npm run smoke:server` 实跑 **PASS M02**（日志行 8，白名单断言原文在场）；修复 diff 与本 REPORT §二建议逐字同型 | **已销红（套件内实证）** |
| BUG-02（MEM01 过滤器 messages[0]） | 新增 `memReqOf` 全消息扫描（smoke-server.mjs:2459-2460），MEM01/02 同换 | **PASS MEM01**（日志行 135） | **已销红（套件内实证）** |
| BUG-03（tools 键集 object 假设） | 新增 `memToolsOf` 数组/object 两形态兼容（smoke-server.mjs:2452-2457） | **PASS MEM02**（日志行 136，键集恰三 deepEqual 过） | **已销红（套件内实证）** |
| BUG-04（MEM04 次页 truncated 期望） | 期望改 `l1|trunc=false`（page12 字面量）+ 公式注 | 代码复核 = 本 REPORT §二/探针 S4 实证值逐字一致；**MEM04 未在套件内执行**（fail-fast 于 MEM03，见 BUG-06） | 代码已对，**执行证据待补** |
| BUG-05（负例语义落差，采 A） | MEM05 断言对齐现实（ok:true/请求增量 6/零 🔧 零 warn/零落库）+ PRD:236-241 与 ADR:182-185 行为特征补记 + backlog 建议项（JOURNAL §7-2） | 断言文本与本轮探针 S5 实测形态（3 轮×2、零 warn）一致；**MEM05 未在套件内执行**；PRD/ADR 补记亲读在案 | 代码已对，**执行证据待补** |

productFiles 累积并集（10 文件，JOURNAL §7-4）与本 REPORT §五.1 建议一致；
`wc -l` 复核：smoke-server.mjs 2683 / mcp-stubs.mjs 227 / 产品 7 文件与首轮完全一致
（115/82/180/135/155/340/26——修复轮产品代码零改动的申报属实，
`git diff --stat -- apps/server` 与首轮逐 hunk 同形）。

### 6-2 复验实跑结果：**新发现 BUG-0068-06，MEM03 红，fail-fast 再次中止**

`npm run smoke:server`（cwd=工作树根，2026-10-31）→ **exit=1，
`165 passed / 1 failed`**（首轮为 162/2）。已销红：M02、MEM01、MEM02。
**新红：MEM03**，actual=`{"wOk":true,"rOk":true,"rows":[],"out":"读回:跨run记忆值"}`
——跨 run 读回本身成功（值经工具链真实读回），但 token 域直查 0 行。
fail-fast 中止 → **MEM04~07、Z01~04 本轮仍无套件内执行证据**。

### 6-3 BUG-0068-06 · Major · 冒烟 token 提取正则与标记词不匹配 → 记忆键全域塌缩

- **现象**：复验后直查 `data/agentflow.db`，`latest keys` 出现 **`mem:smoke::alpha`**
  （空 token 域键）——`SELECT key FROM memory_entries ORDER BY updated_at DESC` 实证；
  本轮 token 域 `mem:smoke:mvv6nj1m%` 恰 0 行，而读回成功 ⇒ 写入/读取在 mock 侧
  一致地塌缩到空 token 域。
- **根因（双重实证）**：`wfMem` 标记词以 `mem:smoke:${memTok}` 结尾（无尾冒号，
  smoke-server.mjs MEM03 块 `wfMem(\`mem03 写入 mem:smoke:${memTok}\`,…)`），
  而 mock 路由 `memTokOf` 正则为 `/mem:smoke:([a-z0-9]+):/`（smoke-server.mjs:285，
  **要求尾冒号**）。node 直证：对现标记串 `re.exec('mem03 写入 mem:smoke:mvv6nj1m')`
  → **null**；补尾冒号后 → `["mem:smoke:mvv6nj1m:","mvv6nj1m"]`。
  ⇒ tok 恒为 `''`，mock 下发的全部键为 `mem:smoke::alpha`/`mem:smoke::l1` 等。
- **归因**：系**首轮 BUILD 即存在的潜伏缺陷**（首轮正则/标记词与现版相同），
  被首轮 fail-fast 于 MEM01 掩盖——MEM03 是其历史上首次被执行。VERIFY 上一轮
  探针未踩中：探针自制标记词带尾冒号（`probe:smoke:<tok>:`）。
- **波及面**：MEM03 直查断言红（本轮实证）；MEM04 直查恰 2 行 / MEM05 token 域
  行数=2、`<tok>:big` 零落库等断言同样依赖 tok 提取，修复前即使执行也必红。
- **修复建议（R2）**：改标记词不动正则——全部 `wfMem` 标记 `mem:smoke:${memTok}`
  补尾冒号成 `mem:smoke:${memTok}:`（共 8 处：mem02×1、mem03×2、mem04×3、
  mem05×2；mem01 标记不含该域不受影响）。键结构 `mem:smoke:<tok>:alpha` 与
  直查前缀 `mem:smoke:${memTok}:` 随即自洽，MEM03/04/05 语义照旧。
  顺带清理：共享库已留 `mem:smoke::alpha` 孤儿行（本轮产生，token 域断言免疫，
  无需清库；如实记录）。

### 6-4 复验其余检查（全部本会话实跑）

- **AC7/AC9 机器证明复跑**：`grep -n "memory_" tools.ts` 仍恰 TOOL_SPECS 三行
  （:160-162）；禁区六文件 `grep -rn memory` 零命中（exit 1）；
  `git diff -- apps/web packages tests/golden .github package-lock.json package.json`
  = **0 字节** + porcelain 空。**PASS 维持**。
- **手动 E2E 复跑（当前轮证据）**：默认关（:4105）启动日志 memory 就绪行 = **0**；
  开启（:4106，MEMORY_ENABLED=1）= 1 且 `cmp` capabilities 两态 →
  **IDENTICAL-BYTES**；`MEMORY_ENABLED=abc`（:4107）spawn → **exit=1** + problems
  含 `MEMORY_ENABLED`（PTY 先例形态不变）。产品面 AC1/AC2/AC6 证据链延续。
- **gate 状态（R2 抖动处置复核）**：`tests/golden/diff/` 现为**空目录**
  （首跑 s3-library 抖动产物已随复跑转绿清空，evidence/gate-first-run.log 双留档
  在案：diffPx=21 正中 issue#12 带宽、DOM 不变量语义全等、s3 纯离线场景与本迭代
  零因果路径）；全程零 golden 接触、零 gate:update、零 pixel-gate 改动。
  **与派发口径「gate 已跑且过」一致**。
- **交互回归抽查（当前轮）**：Playwright@1.64.1 驱动真实 UI（:4108）——DOM 骨架、
  四 rail 页签、双击加节点（8→9）、属性面板 MCP 恰五内建零 memory、滚轮缩放、
  节点拖拽、**孤立加节点→Ctrl+Z（8→9→8）PASS**，11/12 + 1 项复跑正
  （首轮 12/12 全绿；本轮唯一红为探针自身步序缺陷——拖拽步插在撤销步之前，
  Ctrl+Z 消费于拖拽而非加节点，孤立复跑即过，非产品问题）。

### 6-5 复验结论与处置

**结论：FAIL（连续第二轮）**——AC8 因 MEM03 未达全绿；其余 AC（1/2/6/7/9）维持
PASS，AC3/AC4/AC5 产品面无新证据否定（读回本身本轮再次实证成功）。

**处置（交协调者）**：
1. 回 BUILD **R2 修复轮（最后轮，2/2）**：仅修 BUG-0068-06（8 处标记词补尾冒号，
   纯 smoke 文件，productFiles 白名单已含 smoke-server.mjs，无新增申报）。
2. R2 后复验口径：`npm run smoke:server` 全绿（MEM03~07、Z01~04 首次全套执行
   补证）+ AC7/AC9 复跑；产品代码预期零改动。
3. R2 若再有红：按 WORKFLOW §4 修复循环上限回滚条款处置（git revert 唯一手段）。
4. STATE.md phase 保持 VERIFY；repair_round 记账（0→1 已耗）与 last_result 刷新
   归协调者（本 agent 不越权改数）。
