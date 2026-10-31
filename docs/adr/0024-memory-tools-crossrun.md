# ADR-0024 · 跨 run 记忆工具组（memory.get/set/list）实施定界草案

- 状态：**已批准 · 已实施（BK-0018，迭代 0068 承载）**——唯一请批面（§3 env 语义
  一项 + §7 隐私知悉款）经用户本人在 issue#17 评论「批准」（2026-10-30T14:40:05Z，
  🤖 回执同日在案）；实现定界由迭代 0068 BUILD 轮按 §4 消费（S 项免 SPEC，
  PRD=iterations/0068/PRD.md 以本 ADR §4.3/§4.4 为底稿实测刷新）。
  （历史：**草案 · 待用户批准（env 请批面——附录 A）/ 待实现轮消费（BK-0018）**，
  双位标注 ADR-0014 先例；本 ADR 为治理日批处理直接产出、非迭代 SPEC 轮——
  先例 ADR-0011（BK-0009 承载，2026-10-24 W43 治理日批处理落盘）；本项无授权
  issue 承继——env 批面以附录 A 首开，获批前零实现——该门槛已于 2026-10-30 兑现）
- 日期：2026-10-29（治理日批处理产出）
- 关联：BACKLOG BK-0018（实现块，proposed，BACKLOG.md:115——本 ADR 即其定界
  先行物）/ ROADMAP T5-M2 环境感知与数据真实化（ROADMAP.md:161-165，验收
  「跨 run 记忆可读写」:163）/ BK-9006（清单动态化母项，skipped，BACKLOG.md:97
  ——BK-0018 行内「清单扩展触 UI 归 BK-9006」的切割对象，§5.6）/ BK-0044
  （store.ts 400 行贴线事实注在案，BACKLOG.md:65——§4.2 承载评估输入）/
  BK-0047 + BK-0019（kb 供数链，done——§5.4 不冲突论证对象）/ ADR-0011
  （治理日批处理产出先例）/ ADR-0014（双位状态行 + 附录 A 五要素先例）/
  ADR-0020（同库第二连接案甲先例，§6）/ ADR-0022（PTY 家族 env zod 形态 +
  附录 A 制式直系样板）/ ADR-0023（家族版式；其 §9.3 已明文与 BK-0018 互斥
  ——§5.3 反向承诺对象）/ ADR-0012（env 注册表语义，§5.1 互斥）/
  POLICY.md 需批准区「新增环境变量语义」（POLICY.md:25）
- 版式对齐：ADR-0022 / ADR-0023

> **显著声明：本 ADR 为定界方案草案，不实施任何代码、不引入任何依赖、不新增
> 任何 env 语义、不改变任何运行时行为、零 golden 接触。唯一请批面 = 新增环境
> 变量语义一项（MEMORY_ENABLED，§3）——POLICY 需批准区射程命中，附录 A 持
> 五要素 needs-approval issue 草案，**获批前 BK-0018 零实现**。零前端文件 /
> 零 packages/shared / 零 SSE 契约变更 / 零新 npm 依赖 / 零新增出站类别为硬
> 护栏（§6），实现轮任一反转即中止转 needs-approval（§8）。全部工具签名 /
> 限幅值 / 表结构仅以文字方案存在，不预写终稿代码块（DDL/签名为定界草案，
> 终稿归 BK-0018 实施轮）。**

## 1. 动机与现状证据

### 1.1 动机

BK-0018（BACKLOG.md:115，proposed，P2/S，来源 T5）注入的是**跨 run 记忆工具组**：
memory.get/set/list 以内建工具实装。T5-M2 语境（ROADMAP.md:161-165）：「跨 run
记忆可读写」为 M2 四验收之一（:163）；M2 四项实现块「均含需批准面」（:164-165）
——本 ADR 即 BK-0018 的需批准面定界（env 语义），兼该行内两处硬约束的落点
裁定：①「env 开关启用时 llm handler 额外注入（不进前端 MCP_SERVERS 勾选清单
……清单扩展触 UI 归 BK-9006）」→ §4.1 注入点与 IMPL 豁免；②「存储用现有
SQLite」× store.ts 恰 400 行贴线（BK-0044 备注在案）→ §4.2 承载评估。

### 1.2 现状锚点（本治理日会话逐一 Read 亲核，零杜撰；行号为当前主干实锚）

1. **BK-0018 行原文**（BACKLOG.md:115）：「跨 run 记忆工具组：memory.get/set/list
   以内建工具实装 | capability | 否 | P2 | S | proposed | T5 | env 开关启用时
   llm handler 额外注入（不进前端 MCP_SERVERS 勾选清单——app.js:103 硬编码，
   清单扩展触 UI 归 BK-9006）；存储用现有 SQLite；实现轮 env 语义 needs-approval」。
   **行内坐标勘误**：前端 MCP_SERVERS 离线回退集实锚 app.js:111-124（注释
   :111-112 明示「离线回退集（在线时经 /api/v1/capabilities 刷新为后端供数，
   ADR-0018 / BK-0049；字面量逐字保留）」、声明 :113）；app.js:103 现为
   ICON_PATHS 的 info 图标行——坐标漂移仅记录不回改（ADR-0022 §1.2 对
   events.ts:32 注释漂移的同款处置，修正归 BK-0018 实施轮文档同步面顺带）。
2. **工具层现状（tools.ts，176 行）**：TOOL_SPECS 十二条点前缀键（tools.ts:145-158）；
   IMPL 五组实装 + browser null（tools.ts:58-129）；stub 工厂 STUB_MARK 如实降级
   （tools.ts:133-143）；collectTools 仅按节点 mcp 选择展开、未命中即 stub
   （tools.ts:164-175）。sqlite 沙箱工具先例（BK-0008）：专用库 mcp-sqlite.db 与
   主库物理隔离（tools.ts:25-43 头注 + SQLITE_DB :33）、SQL token 黑名单
   （tools.ts:36-37/:44-49）、**限幅以模块常量承载非 env**（MAX_ROWS=100 /
   MAX_CELL=512，tools.ts:34-35——§3 否决限幅 env 族的同族先例）。
3. **注入点（llm.ts，127 行）**：唯一会话构建 = llm.ts:39
   `const sess = await buildToolSession(n.mcp, ctx.ac.signal)`（迭代 0025 /
   BK-0030）；impls → zTools 消费链 :43-66（TOOL_SPECS 查表 :50；安全名清洗
   :56 `name.replace(/[^\w]/g,'_')`——纯 \w 名恒等变换）；工具循环 vs 纯流式
   以 `toolImpls.size` 分派（:43 vs :90）——**memory 注入将令全部 llm 节点进入
   工具循环分支**（generateText 至多 3 轮 :70-81；node:delta 一次性 :89；打字机
   逐 token :90-108 不再），与「勾选任一 MCP 工具」节点的既有形态一致（§7 知悉项）。
4. **agent 节点第二消费点（agent.ts，119 行）**：agent.ts:52 同构
   buildToolSession——BK-0018 行字面限定「llm handler 额外注入」，**agent 不在
   本定界射程**（§6；扩展为演进缝）。
5. **会话三分支（mcp/inject.ts，124 行）**：buildToolSession 内置直取 / 外部动态
   / 降级 stub 三分支（inject.ts:93-124）；结构执法「绝不覆写非 stub」
   （inject.ts:118）——memory 注入**不借道本层**（§4.1，env 门禁结构要求）。
6. **env 家族先例（config.ts，149 行）**：rawEnv 白名单数组 :29-35；TRUTHY/FALSY
   词形 :40-41；PTY_ENABLED zod refine :79、输出映射 ptyEnabled :128、fail-fast
   通道 :85-88——MEMORY_ENABLED 同款形态（§3）。
7. **存储承载先例**：pty/audit.ts（100 行，同主库第二 better-sqlite3 连接：ROOT
   派生 :17、DB_FILE :18、busy_timeout=2000 :43、init/close :39-68、容错写入
   :77-89）；kb/store.ts（133 行，直系同构：头注 :1-8、DDL 单语句 prepare 数组
   :28-51、conn 懒自启 :72-75）；ADR-0020 §6 案甲即此形态。**store.ts 恰 400 行
   （:1-400 亲读），BK-0044 备注在案**。
8. **能力清单派生面（capabilities.ts，64 行）**：builtin = BUILTIN_MCP_IDS 五 id ×
   TOOL_SPECS 键 `${id}.` 前缀过滤（capabilities.ts:43-52）——memory 三工具以
   **无点前缀 plain key** 进 TOOL_SPECS 时前缀派生天然零命中 → capabilities 响应
   逐字节不变，CAP01-CAP05 冒烟零回退为既有机器证明（§4.1）。
9. **作用域锚点（types.ts / engine.ts）**：RunCtx.wf 仅 { name, nodes, edges }
   （types.ts:50）——**workflow 稳定 id（store.ts workflows.id，randomUUID）不在
   run 上下文**，可得者仅显示名（engine.ts:69 `emit('run:start', { name: wf.name …})`）；
   即按 workflow 分域技术上可行（注入点 llmHandler 持 ctx），但唯一可用键 = 可变
   显示名（§2.3 论证输入）。
10. **smoke 组号**：main() 编排已用标记 = P M H W N CAP S R D E K G V A T O J B
    PT KB Z C（smoke-server.mjs 头注 :5-6 + main :469 起逐组亲核；M 组在
    mcp-stubs.mjs M01-M17）——**MEM 组未占用**，新断言组取 MEM01 起（多字母组
    CAP/PT/KB 先例）。
11. **工具名约束**：AGENTS.md 已知陷阱「工具名 `^\w+$`」；下划线形态与内置五组
    工具命名一致（read_file / write_file / list_directory，tools.ts:60/:64/:70）。

## 2. 语义定界（三工具签名 / 作用域 / 限幅草案）

### 2.1 命名定案

`memory_get` / `memory_set` / `memory_list`（plain key，无点前缀）。依据：
AGENTS.md `^\w+$` 约束天然满足；下划线形态与内置工具族一致（§1.2-11）；BK-0018
行「memory.get/set/list」的点号记法系行文记法——点号经 llm.ts:56 安全名清洗本就
归一为下划线，实装键名以本节为准。plain key 同时是 capabilities 派生零命中的
结构前提（§1.2-8）。

### 2.2 签名与载荷（草案，终稿归实施轮）

| 工具 | 入参 | 返回 | 失败语义 |
| --- | --- | --- | --- |
| `memory_set` | `{ key: string, value: string }` | `{ ok: true, key, bytes, updated_at }`（bytes = UTF-8 字节） | key 不匹配字符集/超长 → throw；value 超 4096 字节 → throw（**不截断**——存储事实截断即伪造）；条目满且为新 key → throw；同 key 重复 set = 覆盖更新（updated_at 刷新、created_at 保留首写）；空串 value 合法（不赋予删除语义） |
| `memory_get` | `{ key: string }` | 命中 `{ key, found: true, value, bytes, updated_at }`；未命中 `{ key, found: false }` | 未命中不 throw（模型可据此初始化）；仅 key 非法 → throw |
| `memory_list` | `{ prefix?: string, limit?: integer, offset?: integer }` | `{ entries: [{ key, bytes, updated_at }], total, truncated }` | prefix 空缺 = 全量；limit 1-100 默认 50；offset ≥0 默认 0；entries 按 key 字典序（BINARY 码点序，kb/store.ts:113-115 确定性输出序先例）；truncated = offset+limit < total |

三工具经既有 log 事件承载观测（llm.ts:62-63 工具调用日志），SSE 契约零新增。

### 2.3 作用域：全局 key-value + list 前缀过滤（推荐定案）

| 案 | 判定 | 理由 |
| --- | --- | --- |
| 全局 KV + 前缀过滤（推荐） | **采纳** | ① T5-M2 价值即「跨 run 记忆可读写」（ROADMAP.md:163）——含跨工作流交接（A 工作流写、B 工作流读），分域即砍掉主价值；② 按 workflow 分域唯一可用锚 = RunCtx.wf.name 可变显示名（types.ts:50；稳定 id 不在 run 上下文，§1.2-9）——改名即孤儿记忆，锚点不稳；③ 自愿命名空间经 key 前缀即可达成（如 `wf-退货:`），list prefix 原生支撑，服务端零分域语义；④ 无隔离的隐私面如实入附录 A 知悉（§7），不以文档措辞伪装成已隔离 |
| 按 workflow 分域（否决） | 否决 | 锚点不稳（显示名可变）+ 跨工作流交接价值归零 + 服务端隐式前缀拼接反增语义面。作为演进缝留档：若未来 RunCtx 携带稳定 workflow id，可按本表重议（需另开定界） |

### 2.4 限幅草案值表（均可实施轮调整；调整不触请批面——常量非 env，tools.ts:34-35 先例）

| 项 | 草案值 | 依据 |
| --- | --- | --- |
| key 字符集 | `/^[A-Za-z0-9][A-Za-z0-9._:\-/]{0,127}$/`（1-128 字符，字母数字起头） | registry.ts:37 NAME_RE `/^[A-Za-z0-9_-]+$/` 同族从窄；扩展 `. : /` 供自愿命名空间；拒空白/控制字符防日志与 list 呈现面混乱 |
| value 上限 | 4096 UTF-8 字节（Buffer.byteLength 口径） | llm.ts:32 contextText 6000 字符注入量级同族；「单条记忆 = 一段可注入上下文」定位——文档语料存储归 kb 链（§5.4），不越界 |
| 条目上限 | 1000 条（全局）；满载时新 key 拒绝、覆写既有 key 不受限 | MAX_ROWS=100 量级族的 KV 放宽版；1000 × 4KiB ≤ 4MiB 增长上界；无删除工具下的诚实终态 = 报错指引覆写 |
| list 分页 | limit 1-100 默认 50 + offset | tools.ts MAX_ROWS=100 同款上限形态 |
| TTL / 过期 | 无（v1 不做，§6） | — |

## 3. env 语义（唯一请批面 · 附录 A）

**定案 = 新增 env 语义一项**（POLICY 需批准区「新增环境变量语义」POLICY.md:25
射程命中，附录 A 持五要素字面量）：

| 变量 | 值域 | 默认 | zod 形态 | 语义 |
| --- | --- | --- | --- | --- |
| `MEMORY_ENABLED` | TRUTHY/FALSY 词形（1/true/yes · 0/false/no） | 未配置 = 0（关） | `z.string().refine(v => TRUTHY.test(v) || FALSY.test(v), { message: '只接受 1/true/yes 或 0/false/no' }).optional()`（PTY_ENABLED 同款，config.ts:79 + :40-41） | 跨 run 记忆工具组总开关：=1 时 llm handler 工具会话额外注入 memory 三工具（§4.1）；=0/未配置 = 不建表、不连接、不注入——现状逐位不变 |

- 装载面三处：白名单数组一行（config.ts:29-35 域）+ EnvSchema 一字段（:52-83 域）
  + 输出映射一键（`memoryEnabled: !!env.MEMORY_ENABLED && TRUTHY.test(env.MEMORY_ENABLED)`，
  :128 ptyEnabled 同款）；fail-fast 通道复用（:85-88）。无交叉校验需求（单布尔
  自洽；PTY 式双变量交叉 config.ts:118-124 先例不适用）。
- **否决多 env 族（显式论证）**：限幅族（value 上限/条目上限/分页）以模块常量
  承载不入 env——① POLICY 请批面最小化（每项 env 语义即一次批准负担）；
  ② PTY 四 env 源于会话运行时运维调参需求，memory v1 为定形 KV 存储无常调参数；
  ③ tools.ts 限幅常量先例在案（:34-35，从未 env 化）。常量调整不触请批面；
  若未来运维确需调参再按 POLICY 开 needs-approval。
- **未配置兜底（零强制漂移，写死）**：MEMORY_ENABLED 未配置/0 = llm 工具循环、
  capabilities、SSE、SQLite 主仓储全部现状逐位。

## 4. 实现定界（BK-0018 实施轮口径）

### 4.1 注入点与 IMPL 豁免（本 ADR 核心定界）

- **唯一注入点 = llm.ts:39 之后**（sess 取得后、:43 `toolImpls.size` 消费前）：
  env 门控合并一行——`if (config.memoryEnabled) 注入函数(sess.impls)`（memory
  模块导出三 ToolImpl 与 merge 函数；普通 Map set，零魔法）。zTools 构建循环
  （llm.ts:43-66）零改动自动承接：TOOL_SPECS 查表 :50 命中新增三条 plain-key
  条目（供 desc/zod shape）；安全名清洗 :56 对纯 \w 名恒等；stub 计数 :48 不计入
  （memory 实装非 stub）；工具调用观测沿既有 log 事件（:62-63）。
- **memory 三工具绝不注册进 tools.ts IMPL（结构执法，写死）**：IMPL 唯一消费 =
  collectTools（tools.ts:164-175），仅看节点 mcp 选择，而 n.mcp 来自 POST /api/run
  请求体（types.ts:26 WFNode.mcp 宽松透传）——若入 IMPL，任意 run body 携
  `mcp:{memory:[…]}` 即可**绕过 env 门禁**激活工具，BK-0018 行「env 开关启用时……
  额外注入」被架空。故 tools.ts 唯一触点 = TOOL_SPECS 追加三条 plain-key；
  IMPL / collectTools / stubOf / mcp/inject.ts 全部零改动。
- plain key → capabilities.ts:43-52 前缀派生零命中 → GET /api/v1/capabilities
  响应逐字节不变（CAP01-CAP05 既有断言即零回退机器证明，§1.2-8）。
- 行为特征声明（如实）：MEMORY_ENABLED=1 时**全部** llm 节点经 :43 非零判定进入
  工具循环分支（generateText 三轮、node:delta 一次性 :89）——纯流式打字机
  （:90-108）不再，与勾选任一 MCP 工具的节点既有形态一致；✓ 摘要行（:110-113
  capSummaryServer 仅数 n.mcp）不含 memory——注入时补一条 `log` sys 行（如
  「🧠 跨 run 记忆 ×3 已注入」）作可观测锚，措辞归实施轮（log 既有契约，零新增）。
  **【0068 VERIFY 修复轮 BUG-0068-05 补记】工具 execute 异常语义：AI SDK 7
  （ai@^7.0.0）将异常转为 error tool-result 回灌模型继续循环，不传播至 llm.ts
  catch 降级通道（探针 S5 请求流实证）——本 ADR §2.2「失败语义如实 throw」的
  throw 发生在实现体（memory/tools.ts），经框架封装后以 tool-result 形态对
  模型可见，但对运行日志不可见（零 🔧/warn 行）；该可观测性缺口系平台既有
  语义非本定界引入，留 backlog 另议，不在本定界射程内修正。**
  **【0075 反写注 · BK-0064 已落地】上述静默回灌缺口已由迭代 0075 改写：llm.ts
  execute 包装器现捕获 impl 异常（abort 除外），pino + SSE 双路 emit warn
  「工具执行异常」并触发既有降级直生成轮（无工具 generateText）——静默回灌不再
  是可观测终态（smoke MEM05 同批改写锚定新形态）；0068 补记原文保留作历史，
  「留 backlog 另议」所指即 BK-0064，现已收口。**

### 4.2 存储承载（BK-0044 贴线必答，两案对照）

| 案 | 判定 | 理由 |
| --- | --- | --- |
| **案甲 · 自有仓储模块（推荐）** | **采纳** | 新增 `apps/server/src/memory/store.ts`：同主库 data/agentflow.db 的**第二个 better-sqlite3 连接**（pty/audit.ts:1-9/:17-18/:39-68 与 kb/store.ts:1-8/:54-75 两直系先例；ADR-0020 §6 案甲原文）——WAL 同库 + busy_timeout=2000 兜底跨进程并发（冒烟多探针同库）+ DDL 单语句 prepare 数组 + init/close 生命周期接线（server.ts:125 initKbStore 之后 init；:330 closeKbStore 之后、:331 closeStore 之前 close——「停机先关副仓储」时序先例同型）；表 `memory_entries`（key TEXT PRIMARY KEY / value TEXT NOT NULL / bytes INTEGER NOT NULL / created_at INTEGER NOT NULL / updated_at INTEGER NOT NULL；DDL 终稿归实施轮）；SQL 收敛本模块，**store.ts 主仓储零改动** |
| 案乙 · 扩展 store.ts（否决） | 否决 | store.ts 恰 400 行贴线（§1.2-7），任何扩表必超 AGENTS.md 硬性约定 4 上限 → 须先立「store.ts 拆分」独立 refactor 迭代（前置 +1 迭代 + 主仓储全量回归面重验）——ADR-0020 §6 案乙同款否决理由；拆分归独立 debt 项，不与 BK-0018 绑定 |

### 4.3 受影响文件清单与行数预算

| 文件 | 现状行数（本会话亲读） | 改动 | 预算 |
| --- | --- | --- | --- |
| apps/server/src/memory/store.ts | 新增 | 案甲仓储（DDL/get/set/list/init/close） | ≤160 |
| apps/server/src/memory/tools.ts | 新增 | 三 ToolImpl + merge 注入函数 + 限幅常量 | ≤120 |
| apps/server/src/tools.ts | 176 | TOOL_SPECS 追加三条 plain-key（唯一触点） | ≤180 |
| apps/server/src/llm.ts | 127 | :39 后 env 门控注入 + log 通报 + import config/memory | ≤135 |
| apps/server/src/config.ts | 149 | §3 三处（白名单/schema/输出映射） | ≤155 |
| apps/server/src/server.ts | 335（ADR-0022 §4.5 wc 在案；本会话锚点 :69/:103/:115/:125/:329-331 亲核） | init/close 接线各一行 | ≤340 |
| apps/server/.env.example | 26 | MEMORY_ENABLED 注释一行（PTY_ENABLED :21 同款） | ≤28 |
| tests/smoke/smoke-server.mjs | 2400 行级（Z04 至 :2362 亲核） | MEM 组扩充（§4.4） | 上限内 |

全部 ≤400 行/文件上限内（AGENTS.md 硬性约定 4）。零前端文件、零 packages/shared、
零 inject.ts / agent.ts / engine.ts / capabilities.ts / guard.ts / store.ts。

### 4.4 smoke 扩断言清单（MEM 组草案，编号 MEM01 起不撞既有组号 §1.2-10）

- MEM01 · 默认关：主实例（无 MEMORY_ENABLED）llm 节点工具面零 memory——mock
  端点请求体 tools 键集不含 memory_*（G 组 mock 实例先例：进程内 OpenAI 兼容
  端点可查请求体，A02 sqlite 真工具两步循环同通道）；
- MEM02 · 开启注入：MEMORY_ENABLED=1 专用实例 → 请求体 tools 恰含
  memory_get/memory_set/memory_list 三键；
- MEM03 · 跨 run 持久化：run1 模型调 memory_set → run2 memory_get 返回同值；
  SQLite 直查 memory_entries 行数对账（V 组 auditsOf 只读直查共享库先例，
  smoke-server.mjs 头注 :15）；
- MEM04 · list 语义：前缀过滤 + limit 截断 + truncated 标记 + 字典序；
- MEM05 · 负例：key 非法字符 / value 超限如实 throw（工具结果 error 路径，run
  不崩——llm.ts:82-84 工具循环异常降级既有）；
- MEM06 · 零污染：GET /api/v1/capabilities builtin 仍五条 deepEqual
  （CAP_EXPECTED_BUILTIN 字面量复用，smoke-server.mjs:173 起）；
- MEM07 · env fail-fast：MEMORY_ENABLED=abc 启动终止退出码 1（PTY env fail-fast
  形态先例，tests/smoke/pty-sessions.mjs PY 组 ×5，BK-0044 备注在案）。

## 5. 与既有面互斥边界

1. **ADR-0012（env 注册表语义）**：MCP_HTTP_SERVERS / MCP_STDIO_SERVERS 的语法
   （E1-E8）、E9 跨 env 交叉校验（config.ts:109-117）、内置冲突拒绝语义零改动；
   memory 不进注册表、不进 buildMcpRegistry（mcp/ 目录零改动）——§4.1 IMPL
   豁免即不借道注册表的结构保证。
2. **ADR-0022（ON_ERROR 三键）**：MEMORY_ENABLED 与 ON_ERROR /
   ON_ERROR_RETRIES / ON_ERROR_RETRY_DELAY_MS 命名域不相交、消费点不相交
   （engine 失败路径 vs llm.ts:39 注入点）；config.ts 扩展互不干扰。
3. **ADR-0023（两键命名域）**：MEMORY_ENABLED 与 MCP_DISCOVERY_SOURCES /
   MCP_DISCOVERY_ALLOW 互斥；且 ADR-0023 §9.3 已明文「skills/rules 不落任何跨
   会话存储、不提供写忆/忆取工具面」——本 ADR 反向承诺：memory 不借道
   discovery/registry 注入，两者无共享承载。
4. **BK-0047 / BK-0019（kb 供数链）**：kb = 只读语料检索（kb_ 前缀三表，
   retrieval 节点参数消费）；memory = 模型主动读写 KV（memory_entries 单表，
   工具调用消费）——表域隔离、零联合查询、消费通道不同（节点参数 vs 工具
   循环），互不供数互不依赖。
5. **tools.ts 沙箱 sqlite 工具**：物理隔离两库（mcp-sqlite.db 专用库 tools.ts:33
   vs 主库 agentflow.db）；沙箱 SQL_DENY 黑名单拒 ATTACH（tools.ts:36）→ 沙箱
   会话不可跨库触达 memory_entries；memory 亦不走沙箱通道（主库第二连接直取）。
6. **前端清单与 BK-9006**：memory 不进前端 MCP_SERVERS 勾选清单（app.js:111-124
   离线回退集零涉及）且不进 /api/v1/capabilities 在线供数（§4.1 派生零命中）；
   未来若要 UI 呈现 memory 状态（清单/面板）= 触 UI 走修宪通道，属 BK-9006
   母项射程外新议题，本 ADR 零预写。

## 6. 不做范围与验证口径

- **不做范围（本 ADR 轮 + BK-0018 实现轮硬护栏）**：零前端文件（apps/web/**
  零 diff）；零 packages/shared 改动（DEFS / SSE 事件契约零涉及）；零 SSE 新
  事件新字段（工具调用沿既有 log 事件，llm.ts:63）；零新 npm 依赖（
  better-sqlite3 已在）；零新增出站类别（纯进程内 SQLite，零网络面）；零 golden
  触及（全程禁 gate:update）。不改 IMPL / collectTools / stubOf / inject.ts /
  agent.ts / engine.ts / capabilities.ts / guard.ts / store.ts。agent 节点不注入
  （BK-0018 行字面 = llm handler；agent.ts:52 扩展为演进缝，若实施另评估）。
  不做 TTL/过期、不做 delete 工具、不做按 workflow 隔离、不做加密落库（演进缝
  留档，§2.4/§2.3）。不预写终稿代码块。本 ADR 轮仅新增本文件 +（归协调者）
  附录 A issue 开立。
- **验证口径**：
  - 本草案轮（机器证明）：`git diff HEAD -- apps packages tools tests .github
    package*.json` 恒空；锚点抽样 ≥5 组全命中（§1.2 清单：llm.ts:39/:43/:56、
    tools.ts:145-158/:164-175、config.ts:29-35/:79、capabilities.ts:43-52、
    pty/audit.ts:17-18、kb/store.ts:54-61、BACKLOG.md:115、ROADMAP.md:163 等，
    均本会话 Read 亲核）；`npm run build` + `npm run gate`（纯回归面）+
    `npm test` + `npm run smoke:server` 全绿（归脚本统一执行）。
  - BK-0018 实现轮：四命令全绿 + MEM 组扩断言（§4.4）+ 手动 E2E（开关两态
    点位走查 + memory_entries sqlite 直查）+ gate 场景 diffPx=0 零回退。

## 7. 附录 A · needs-approval issue 草案（字面量，脚本逐字取用）

**标题**：

```
[needs-approval] BK-0018 跨 run 记忆工具组实施：请批新增 env 语义 ×1（MEMORY_ENABLED）+ 跨 run 持久化隐私面知悉（ADR-0024）
```

**正文**：

```
按 POLICY.md 需批准区「新增环境变量语义」，跨 run 记忆工具组（BK-0018：
memory.get/set/list 以内建工具实装）实施需先经您批复以下承载。定界方案全文见
ADR-0024 草案（docs/adr/0024-memory-tools-crossrun.md，2026-10-29 治理日批处理
产出，先例 ADR-0011）。获批前 BK-0018 零实现。

请批清单：

① 新增环境变量语义一项（config.ts zod fail-fast 白名单）：
   - MEMORY_ENABLED：跨 run 记忆工具组总开关，值域 1/true/yes、0/false/no
     （PTY_ENABLED 同款词形），默认未配置 = 0 = 关；
   - =0/未配置：不建表、不连接、不注入任何工具——全部现状逐位不变（零强制
     漂移）；
   - =1：llm 节点工具会话额外注入 memory_get/memory_set/memory_list 三个内建
     工具（纯进程内 SQLite，存储于现有 data/agentflow.db；不进前端
     MCP_SERVERS 勾选清单、不进 /api/v1/capabilities——清单扩展触 UI 归
     BK-9006 链）。

② 残余风险知悉（缓解非消除，如实声明）：
   - 跨 run 持久化隐私面：MEMORY_ENABLED=1 时，任意 LLM 节点的模型可经工具
     读取其他 run / 其他工作流写入的全部记忆（全局 key-value、无按工作流
     隔离）——隔离缺失是本定界的显式取舍（按 workflow 分域唯一可用锚为可变
     显示名，ADR-0024 §2.3 否决案论证在案）；请仅在接受该面时启用开关；
   - 记忆明文落库 data/agentflow.db（gitignore 不入库，与 runs/sessions 同库
     同安全等级）；v1 无删除工具、无 TTL，仅覆写更新（条目上限 1000，超限
     如实报错）；
   - 行为特征：开启后全部 llm 节点进入工具循环形态（generateText，node:delta
     一次性输出）——与勾选任一 MCP 工具的既有形态一致，纯流式打字机不再。

③ 实施顺序：本 issue 批复 = BK-0018 晋升的 env 门槛解除（另无其他前置）→
   PLAN 轮按 ADR-0024 §4 定界实施（新增 apps/server/src/memory/ 两模块 +
   config.ts 一 env + llm.ts 注入 + smoke MEM 组扩断言）；实现轮若需新依赖 /
   新出站类别 / 触 UI / shared 或 SSE 契约变更，立即中止并按 ADR-0024 §8
   反转预案补开 needs-approval，获批前零实现。

④ 证据链接：ADR-0024 草案（docs/adr/0024-memory-tools-crossrun.md）· BACKLOG
   BK-0018 行（BACKLOG.md:115）· ROADMAP T5-M2（ROADMAP.md:161-165，验收
   「跨 run 记忆可读写」:163）· 代码现状（llm.ts:39 注入点 · tools.ts:145-158
   TOOL_SPECS 与 :164-175 collectTools · config.ts:29-35 白名单与 :79 PTY 先例 ·
   capabilities.ts:43-52 派生面 · pty/audit.ts 与 kb/store.ts 第二连接先例 ·
   store.ts 恰 400 行贴线）。

批复语义：评论「批准」= 授权 ① env 语义并知悉 ② 三项风险，BK-0018 转入可实施
（PLAN 轮选题即可承载）；评论「驳回」= BK-0018 维持 proposed，ADR-0024 归档为
未采纳方案。批复只认用户本人评论（POLICY 禁止区）。
```

## 8. 反转预案（实现轮护栏，不预支）

实现轮出现下列任一，立即中止实现并按附录 A 五要素补开 needs-approval，获批前
零实现：

1. 需要新 npm 依赖（better-sqlite3 之外的任何存储/加密/队列/向量库）；
2. 需要新增出站类别或任何网络面（远程记忆存储等——本定界为纯进程内 SQLite，
   远程化即另一项目另立定界）；
3. 需要触任何前端文件（memory 的清单/面板呈现，触 UI 硬边界）；
4. 需要新增 SSE 事件/字段，或 packages/shared 任何改动；
5. 需要超出 MEMORY_ENABLED 的新 env 语义（限幅调参 env 化、按 workflow 隔离
   开关等）；
6. 需要改 IMPL 注册表面（§4.1 结构执法被实现现实推翻——如只有经 mcp 勾选
   通道才可工作）；
7. store.ts 拆分被外部要求先行（承载落点变更 → 回本 ADR §4.2 重议）。
