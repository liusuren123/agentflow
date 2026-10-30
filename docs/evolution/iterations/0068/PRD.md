# PRD · 迭代 0068 · BK-0018 跨 run 记忆工具组实装（memory_get/set/list 内建工具 + MEMORY_ENABLED 开关）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-30 22:56
> 来源：BACKLOG BK-0018（capability / **触UI=否** / P2 / S / **ready〔本轮批复同步转〕** /
> 来源 T5，BACKLOG.md:115）。实现定界权威 = **ADR-0024**（docs/adr/0024-memory-tools-crossrun.md，
> 338 行，2026-10-29 治理日批处理产出）——本 PRD 全部功能语义以 ADR-0024 为准转写，不重开定界。
> 主题归属：ROADMAP T5 · 智能体运行时与工作台 · **M2 环境感知与数据真实化**
> （ROADMAP.md:161-165 四项之一，验收「跨 run 记忆可读写」:163）。M2 现状：
> BK-0019 done（迭代 0064）、BK-0061/BK-0062 SPEC 先行 done（迭代 0066/0067）——
> 本项是 M2 首个进入实现块的迭代。
> 批次编排：无——单项单迭代（S 级实现轮）。
> **S 项且非 doc、非触 UI——SPEC 豁免适用（WORKFLOW §4「S 项（非 doc、非触 UI）
> 可免独立 SPEC」），skipSpec=true**：受影响文件清单与验收口径内嵌本 PRD §6/§7
> （以 ADR-0024 §4.3/§4.4 为底稿 + 本轮工作树实测刷新）。
> 回执口径：**sourceIssue=17、itemContinues=false**——#17 系单目的 issue
> （BK-0018 实施批面：env 语义 ×1 + 隐私知悉，ADR-0024 附录 A），BK-0018 为单一
> S 项无姊妹子项；done 时脚本回执关单（BK-0058/#13 单目的先例同径）。
> **reconstitutional=false（非修宪轮）**：触UI=否，零前端文件、零 packages/shared、
> 零 golden 接触；issue#17 批复只解除 POLICY「新增环境变量语义」需批准面（含隐私
> 知悉款），**不构成重录轮——全程禁 gate:update**（规则①：纯后端批复项一律
> reconstitutional=false）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-30 22:48~22:56 核实）

- **跨迭代续选**：无——近 3 迭代均已终态归档（工作树 `iterations/` 列目录亲核：
  0065 BK-0047 done·修宪轮合并 3133857 / 0066 BK-0061 done·纯文档轮 ADR-0022 /
  0067 BK-0062 done·纯文档轮 ADR-0023；REPORT.md 0066/0067 头部结论 PASS 亲读）。
- **占位互斥核查（只读）**：`.zcode/locks/items/` 本会话 `ls` 亲核为空 → 无在途
  占用（本轮派发未注入已占项提示，与亲核一致）。占位目录获取归工作流脚本
  （「不碰主干目录」纪律——仅核查不代建）。
- **① 批复同步（本轮入选路径）**：档案「approved：#17；rejected：无」。gh 亲核
  `gh issue view 17`：state=OPEN、labels=[needs-approval]、标题
  「[needs-approval] BK-0018 跨 run 记忆工具组实施：请批新增 env 语义 ×1
  （MEMORY_ENABLED）+ 跨 run 持久化隐私面知悉（ADR-0024）」；评论实况 =
  **liusuren123 2026-10-30T14:40:05Z「批准」**（批复仅认用户本人，🤖 回执
  2026-10-30T14:49:29Z 在案）。BK-0018 行备注明载「转可实施门槛余一 = #17 获批」
  → 按 BK-0044/#14（迭代 0055）与 BK-0058/#13（迭代 0052）先例：**既有行不重复
  建行，仅解除转 ready 门槛**（状态列 proposed→ready 已回写本工作树 BACKLOG）。
- **② user-request**：issue 面板五项（#17/#16/#15/#12/#6）均系 needs-approval，
  无 user-request 新项 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 无 skipped 改写。
- **④ 常规选题**：ready 队列本会话 `grep -nE "\| ready \|" docs/evolution/BACKLOG.md`
  亲核——批复同步前**零行 ready**（59 处「ready」命中全在备注文字）；批复同步后
  唯一 ready 项即 BK-0018。同型受阻项对照（均不构成候选）：
  - BK-0014（:111，P2/M）：晋升条件=BK-0062 CLOSE（✅ 已兑现）+ 附录 A
    needs-approval 获批——issue **#16 未批复**（面板亲核无「批准」），维持 proposed；
  - BK-0020（:117，P2/S）：晋升条件=BK-0061 CLOSE（✅ 已兑现）+ 附录 A 获批——
    issue **#15 未批复**，维持 proposed；
  - BK-0048（:69，P0/S）：触UI=是，前置 BK-0020 proposed → 随链受阻；
  - doc 类 BK-0063 已 done（治理日批处理消化）；无 doc 类 ready 阻选情形。
  BK-0018 同时命中选题优先序①（「用户 issue 批复产生的 ready 项」）与唯一可选项，
  证据链闭合。
- **侦察档案消费（均不构成候选，无补题）**：残缺标记 grep 唯二实质命中——
  apps/server/package-lock.json:787 系 integrity 串内 XXX 假阳性；
  apps/server/src/tools.ts:138「not implemented」系 browser stub 工厂显式如实降级
  （ADR-0011 评估终态），0041~0067 连续多轮同判不立项。悬挂 run 探针 `[]` 空。
  覆盖差集/文档漂移/dogfooding 系治理日产物，心跳不重复采集。
- **未批项零触碰**：#16/#15/#12/#6 状态与对应 BACKLOG 行本轮不改写（#12 属
  golden/pixel-gate/CI 需批准射程，0045~0052 同判；#6 修宪授权由子项链承继消费中，
  关单留 BK-9006 链末项）。

## 结论

**建议做（本轮入选，S 级后端实现轮，已获批面内自主区）**——理由一句话：T5-M2
四验收中「跨 run 记忆可读写」是唯一已集齐全部前置的实现块（ADR-0024 定界在库 +
issue#17 批复在案），MEMORY_ENABLED=0/未配置时现状逐位不变的零强制漂移设计使
回归面收敛，S 级成本即换 M2 第二个验收点达成。

## 触UI 分类结论

**触UI=否（POLICY 自主区 + issue#17 已批 env 面）**，逐面判定：

1. 零前端文件（apps/web/** 零 diff）——memory 不进前端 MCP_SERVERS 勾选清单
   （app.js:111-124 离线回退集零涉及），ADR-0024 §4.1/§5.6 写死；
2. 零 packages/shared 改动——DEFS / SSE 事件契约零涉及，工具调用观测沿既有
   log 事件（llm.ts:62-63），ADR-0024 §6 硬护栏；
3. 零 golden 接触——渲染路径零波及，gate 应为纯回归面全绿；**全程禁
   gate:update**（非修宪轮，宪法第 3 条无授权场景）；
4. memory 三工具以 plain key 进 TOOL_SPECS → capabilities.ts:43-52 前缀派生
   零命中 → GET /api/v1/capabilities 响应逐字节不变（CAP01-CAP05 既有断言即
   零回退机器证明）——**不产生任何 UI 可见变化**。

实现中发现触及 UI 或需扩大影响面（如需新 SSE 事件/新字段）：立即中止转
needs-approval，本迭代按回滚处理（WORKFLOW §4 BUILD 中止条款）。

## 现状与证据（本会话工作树 feat/0068-iter 内亲核，零杜撰）

- **注入点**：`apps/server/src/llm.ts:39` `const sess = await buildToolSession(n.mcp,
  ctx.ac.signal)`（sed -n '38,44p' 亲读）；:43 `if(toolImpls.size)` 工具循环分派；
  llm.ts 全文 **126 行**（ADR-0024 §4.3 记 127，微漂 1 行，以实测为准）。
- **工具层**：tools.ts **175 行**（ADR 记 176，微漂）；`TOOL_SPECS` :145 起
  （grep 亲跑）；IMPL / stub 工具工厂 :58-143（tools.ts:138「not implemented」
  系 browser stub 显式降级文案，与本项无关）。
- **env 家族先例**：config.ts **149 行**；白名单数组 :29-35、TRUTHY/FALSY :40-41、
  `PTY_ENABLED: z.string().refine(...)` :79（sed -n '78,90p' 亲读）——MEMORY_ENABLED
  同款形态。
- **存储承载先例与接线时序**：server.ts **335 行**；`initPtyAuditStore()` :115、
  `initKbStore()` :125、停机 `closePtyAuditStore()` :329 → `closeKbStore()` :330 →
  `closeStore()` :331（grep 亲跑）——memory 自有仓储 init/close 按同型时序插入。
- **模板**：apps/server/.env.example **25 行**（ADR 记 26，微漂）；PTY_ENABLED
  注释行 :21（grep 亲跑）——MEMORY_ENABLED 注释同款形态。
- **定界先行物**：docs/adr/0024-memory-tools-crossrun.md 338 行在库（wc -l 亲跑），
  §2 语义定界（签名/载荷/作用域/限幅）、§3 env 语义、§4 实现定界（注入点与 IMPL
  豁免/存储案甲/文件清单/smoke 清单）、§5 互斥边界、§6 不做范围、§8 反转预案。

## 用户故事与功能范围（ADR-0024 权威定界转写）

- **US-1（跨 run 记忆）**：作为工作流作者，我希望 LLM 节点在开启记忆开关后能把
  中间结论写入记忆并在**后续任何 run**（含不同工作流）读回，使多轮任务可断点续作。
- **US-2（运维主权）**：作为部署运维者，我希望记忆功能默认完全关闭（不建表、不
  连接、不注入），只有我显式配置 `MEMORY_ENABLED=1` 才启用——现状行为逐位不变。
- **US-3（可观测）**：作为调试者，我希望记忆工具的每次调用经既有日志通道可见
  （✓ 摘要与 log 事件），且注入发生时有明确 sys 行锚点。

功能范围（REQ 编号，终稿签名以 ADR-0024 §2.2 表为准）：

- **REQ-0068-01** `MEMORY_ENABLED` env 开关：TRUTHY/FALSY 词形（1/true/yes ·
  0/false/no），未配置=关；装载面三处（config.ts 白名单一行 + EnvSchema 一字段
  zod refine + 输出映射一键 `memoryEnabled`）+ fail-fast（非法值启动终止退出码 1）；
  `.env.example` 注释一行（PTY_ENABLED :21 同款）。
- **REQ-0068-02** 三工具 `memory_get` / `memory_set` / `memory_list`（plain key，
  满足 `^\w+$`）：签名/载荷/失败语义按 ADR-0024 §2.2 表（memory_set 超限 throw
  不截断、memory_get 未命中返回 found:false 不 throw、memory_list 前缀过滤 +
  limit 1-100 默认 50 + offset + 字典序 + truncated）。
- **REQ-0068-03** 作用域=全局 KV + list 前缀过滤（ADR-0024 §2.3 推荐定案；按
  workflow 分域案已否决留档）；限幅常量（key 字符集正则 / value 4096 字节 /
  条目 1000 / 分页）以模块常量承载**不入 env**（ADR-0024 §2.4/§3 否决多 env 族）。
- **REQ-0068-04** 存储承载=**案甲自有仓储** `apps/server/src/memory/store.ts`：
  同主库 data/agentflow.db 第二个 better-sqlite3 连接（pty/audit.ts、kb/store.ts
  两直系先例；WAL + busy_timeout=2000 + DDL 单语句 prepare 数组 + 容错写入）；
  表 `memory_entries`（key PK/value/bytes/created_at/updated_at，DDL 终稿归实现）；
  **store.ts 主仓储零改动**（400 行贴线规避，ADR-0024 §4.2 案乙否决在案）。
- **REQ-0068-05** 注入通道=**唯一注入点 llm.ts:39 之后 env 门控合并**（普通 Map
  set，零魔法）；**结构执法：memory 三工具绝不注册进 tools.ts IMPL**——IMPL/
  collectTools/stubOf/mcp/inject.ts 零改动（防止任意 run 请求体携 `mcp:{memory:…}`
  绕过 env 门禁，ADR-0024 §4.1）；tools.ts 唯一触点=TOOL_SPECS 追加三条 plain-key。
- **REQ-0068-06** 注入可观测：MEMORY_ENABLED=1 注入时补一条 `log` sys 行
  （如「🧠 跨 run 记忆 ×3 已注入」，措辞归实现轮；log 既有契约零新增）；工具
  调用沿既有 log 事件承载；✓ 摘要行（capSummaryServer 仅数 n.mcp）不含 memory。
- **REQ-0068-07** smoke 扩断言 MEM01~MEM07（组号空闲，ADR-0024 §4.4 全清单）：
  默认关零 memory / 开启恰三键 / 跨 run 持久化 + SQLite 直查对账 / list 语义 /
  负例 throw 不崩 run / capabilities 零污染 deepEqual / env fail-fast 退出码 1。

## 非功能要求

- **安全与隐私（issue#17 知悉款兑现，如实呈现在代码注释与 .env.example 注释）**：
  全局 KV 无用户/工作流隔离——任意 run 的模型可读写全部条目；value 上限 4096 字节
  限制单条泄露面；存储落主库 data/agentflow.db（本机文件，随既有数据面同等保护，
  不入 git）。不伪装成已隔离（ADR-0024 §2.3 ④）。
- **性能**：限幅常量（条目 1000 × 4KiB ≤ 4MiB 增长上界）；查询走 PRIMARY KEY 与
  BINARY 码点序；无 TTL/过期（v1 不做）。
- **兼容性**：MEMORY_ENABLED 未配置/0 = llm 工具循环、capabilities、SSE、SQLite
  主仓储全部现状逐位（零强制漂移，ADR-0024 §3 写死）。
- **行数纪律**：新增源文件 ≤400 行（AGENTS.md 硬性约定 4），预算见 §6。

## 受影响文件清单与行数预算（skipSpec 内嵌；ADR-0024 §4.3 + 本轮实测刷新）

| 文件 | 实测现状行数（本轮亲核） | 改动 | 预算 |
| --- | --- | --- | --- |
| apps/server/src/memory/store.ts | 新增 | 案甲仓储（DDL/get/set/list/init/close） | ≤160 |
| apps/server/src/memory/tools.ts | 新增 | 三 ToolImpl + merge 注入函数 + 限幅常量 | ≤120 |
| apps/server/src/tools.ts | 175 | TOOL_SPECS 追加三条 plain-key（唯一触点） | ≤180 |
| apps/server/src/llm.ts | 126 | :39 后 env 门控注入 + log 通报 + import config/memory | ≤135 |
| apps/server/src/config.ts | 149 | 白名单/schema/输出映射三处（REQ-0068-01） | ≤155 |
| apps/server/src/server.ts | 335 | init/close 接线各一行（initKbStore :125 后 init；:330 closeKbStore 后、:331 closeStore 前 close） | ≤340 |
| apps/server/.env.example | 25 | MEMORY_ENABLED 注释一行（PTY_ENABLED :21 同款） | ≤28 |
| tests/smoke/smoke-server.mjs | 2400 行级 | MEM01~MEM07 扩断言 | 上限内 |

**零改动面（机器证明口径）**：apps/web/**、packages/shared/**、mcp/inject.ts、
agent.ts、engine.ts、capabilities.ts、guard.ts、store.ts（主仓储）、tests/golden/**、
.github/**、package*.json（零新依赖）。productFiles 白名单以实现轮 JOURNAL 申报
为准，跨修复轮累积并集不可覆盖（0034 教训）。

## 验收标准（Given/When/Then，AC 编号供 test-manager 转用例）

- **AC1（默认关零漂移｜MEM01）** Given 主实例未配置 MEMORY_ENABLED 且库中无
  memory_entries 表；When 起 server 并对含 llm 节点的工作流发起 run（mock 模型
  端点可查请求体）；Then 请求体 tools 键集不含任何 `memory_*`、GET
  /api/v1/capabilities builtin 仍恰五条 deepEqual（MEM06 同证）、SQLite 主库无
  新表、既有 smoke 全组零回退。
- **AC2（开启注入恰三键｜MEM02）** Given 专用实例以 MEMORY_ENABLED=1 启动；
  When 对 llm 节点 run；Then mock 端点请求体 tools 恰含 memory_get/memory_set/
  memory_list 三键，且注入 sys log 行出现在 run 事件流。
- **AC3（跨 run 持久化｜MEM03）** Given MEMORY_ENABLED=1；When run1 中模型调用
  memory_set(key,value) 后结束 run，再发起 run2 调用 memory_get(key)；Then run2
  返回同值，SQLite 直查 memory_entries 行数与键值对账一致（V 组 auditsOf 只读
  直查共享库先例）。
- **AC4（list 语义｜MEM04）** Given 库中 ≥3 条不同前缀条目；When memory_list 带
  prefix / limit=2；Then 返回条目按 key 字典序、truncated 标记如实、offset 翻页
  正确。
- **AC5（负例不崩 run｜MEM05）** Given MEMORY_ENABLED=1；When 模型调用非法 key
  （含空白/超长）或 value 超 4096 字节；Then 工具结果走 error 路径（如实 throw
  不截断），run 不崩、llm 工具循环异常降级既有形态（llm.ts:82-84 通道）。
- **AC6（env fail-fast｜MEM07）** Given MEMORY_ENABLED=abc；When 启动 server；
  Then 进程以退出码 1 终止、fatal 日志指明变量名与合法词形（PTY env fail-fast
  先例形态）。
- **AC7（结构执法）** Given 实现完成；When grep apps/server/src；Then memory 三
  工具名不出现在 tools.ts IMPL / mcp/inject.ts / agent.ts（ADR-0024 §4.1 豁免面），
  tools.ts 对三工具唯一触点为 TOOL_SPECS；任意 run 请求体携 `mcp:{memory:[…]}` 的
  行为与现状一致（未命中即 stub，env 关闭时为「不识别」路径）。
- **AC8（回归面全绿）** Given 实现完成；When 在工作树内跑 `npm run build` +
  `npm run gate` + `npm test` + `npm run smoke:server`；Then 四项全绿（gate 纯
  回归面 diffPx=0、golden 零接触零 gate:update；smoke 既有 168 断言零回退 +
  MEM 组新增；s3 若现 issue#12 已知本机抖动形态按既定口径处置，绝不消费
  gate:update）。
- **AC9（禁区机器证明）** Given 实现完成；When `git diff -- apps/web packages
  tests/golden .github package-lock.json`；Then 输出恒空（零前端/零 shared/零
  golden/零 CI/零依赖）。

## 不做范围（硬护栏，ADR-0024 §5/§6）

- agent 节点**不注入** memory（BK-0018 行字面限定「llm handler 额外注入」；
  agent.ts:52 同构点为演进缝，扩展须另开定界）。
- 无 TTL/过期、无删除工具（1000 条满载诚实报错指引覆写）、无按 workflow 分域
  （否决案留档）、无限幅 env 族。
- 不进 env 注册表（MCP_HTTP_SERVERS/MCP_STDIO_SERVERS 语法与 E9 交叉校验零改动，
  ADR-0023 两键命名域互斥）、不借道 discovery/registry 注入。
- 不与 kb 链（BK-0047/BK-0019）联合——表域隔离、零联合查询。
- 零前端 UI 呈现 memory 状态（未来若要做=触 UI 修宪通道，本 ADR 零预写）。
- store.ts 主仓储零改动（拆分归独立 debt 项，不与本项绑定）。

## 风险与如实声明（ADR-0024 §4.1 行为特征 / §7 知悉款，实现轮注释与模板须承接）

1. **行为特征**：MEMORY_ENABLED=1 时**全部** llm 节点经 llm.ts:43 非零判定进入
   工具循环分支（generateText 至多 3 轮、node:delta 一次性），纯流式打字机不再
   ——与勾选任一 MCP 工具的节点既有形态一致，非缺陷；实现轮与 VERIFY 须按此
   口径预期，不得当回归缺陷误报。
2. **隐私面**：全局 KV 无隔离——任意 run 模型可读写全部条目（issue#17 批复知悉
   款；缓解=限幅 + 部署面单租户假设，非消除）。
3. **LLM 流式节点重试 delta 叠加风险**：本项无重试语义不涉；但若实现中引入任何
   工具循环轮次重试，须先对照 ADR-0022 §4.3 的 delta 叠加声明评估（越界即中止）。
4. **gate 首跑 s3 抖动**：issue#12 已知本机亚像素渲染噪声（diffPx≈21~23）可能
   首跑命中——按既定口径双留档 gate-first-run.log、复跑为准，绝不 gate:update。
5. **A02 先例复用**：MEM01/02 经 G 组 mock 端点查请求体（A02 sqlite 真工具两步
   循环同通道），mock 端点须承接 tools 键集断言（既有能力，零新契约）。
6. **【0068 VERIFY 修复轮 BUG-0068-05 补记·行为特征】**：AI SDK 7（ai@^7.0.0）
   把工具 execute 异常转为 error tool-result 回灌模型继续循环，**不传播**至
   llm.ts 工具循环 catch 降级通道（VERIFY 探针 S5 请求流实证：负例 run 3 轮
   预算耗尽自然收束、run:done ok:true、零 🔧 行零「工具循环异常」warn）——
   AC5 的「llm 工具循环异常降级既有形态」半句按平台既有语义修正为「异常以
   tool-result 形态对模型可见」；安全核（不崩 / 零落库 / 不截断）不受影响。
   负例错误对运行日志不可见的可观测性缺口另立 backlog（不并入本迭代——修
   llm.ts 共享错误路径波及全工具族=扩大影响面）。AC5 判据以修复轮 MEM05
   断言（smoke-server.mjs 对齐现实版）为准。

## 提交编排与护栏

- 产品提交（productFiles 白名单=§6 八路径 + ADR-0024 状态行增补若需）+ 机制件
  提交（iterations/0068/ 四产物 + BACKLOG 过程改动）；Conventional Commits。
- 全程禁 gate:update；golden 零接触；触 UI/扩影响面即中止转 needs-approval。
- issue#17 回执：done 关单（🤖 评论，sourceIssue=17）；实现轮完成时 ADR-0024
  头部「草案 · 待用户批准」状态行的批准态转写归实现轮文档同步面（批复时间戳
  2026-10-30T14:40:05Z 在案可引）。
