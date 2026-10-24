# SPEC · 迭代 0026 · BK-0008 sqlite MCP 工具真实接入（重试轮：query/execute 落地 better-sqlite3，DB 锚定沙箱专用文件）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 03:12
> 输入：`docs/evolution/iterations/0026/PRD.md`（REQ-0026-01…05 / AC1…AC7 逐条对齐）。
> 定界基线：迭代 0020 存档 SPEC（`docs/evolution/iterations/0020/SPEC.md`）——PRD 明载
> 「重试即拿即用」，本 SPEC 对其逐节复核后按当前 HEAD（8768b2c）刷新锚点定稿。
> 冲突顺位：CONSTITUTION.md > 代码实现 > 0020 SPEC 存档 > 本文档。
> 事实核对（本会话 2026-10-25 03:08~03:12，全部只读）：PRD 全部代码指针逐条复核一致；
> §2.1 基线表为本会话 Read/grep 亲核的当前行号；安装版本 `ai@7.0.146` /
> `better-sqlite3@12.11.1`（node_modules package.json 亲核）与 0020 探针环境一致，
> 0020 SPEC §2.2 十二探针与 §2.3 ai@7 异常语义**直接复引有效**（见 §2.2/§2.3）。
> **ADR 判定：无需 ADR（needsAdr=false）**——同 0020 SPEC 判据复核仍成立：全部改动为
> 既有架构模式内的实现补全（IMPL 表挂真实现 = 0009 前既有设计；沙箱锚定 = tools.ts:14-15
> 既有 doctrine；better-sqlite3 用法 = store.ts:21 既有先例），零新依赖、零新 env、
> 零出站类别、零 shared 契约、零 UI 接触，POLICY 自主区双条命中（后端能力演进 +
> 测试基建）。无架构选型面（WORKFLOW §4「涉及架构选型的写入 ADR」不触发）。

---

## 1. 范围与结论摘要

把 `IMPL['sqlite']` 从 `null`（`tools.ts:59`）翻转为 `{ query, execute }` 真实现：
**DB 锚定 `apps/server/sandbox/mcp-sqlite.db`**（路径仅由 `SANDBOX` 常量派生，
源码零主库/用户路径字面量），进程内 better-sqlite3 惰性单例连接；**拒绝面** = 全文
token 扫描黑名单 `attach|detach|pragma|vacuum` + `load_extension(` 调用面，命中即
**throw** 如实错误（消息含「沙箱」语义）；query 返回 `{ rows, truncated }`
（≤100 行、单元格 ≤512 字符文本化），execute 返回 `{ changes, lastInsertRowid }`
（多语句支持，`total_changes()` 差值计数）。同步摘除 TOOL_SPECS 两行「（未实现）」
前缀（改写为含「沙箱数据库」限定语的真实语义），并把
`tests/smoke/mcp-stubs.mjs` 冻结基准与 M03-M06 期望口径联动更新（sqlite 组
impl:false→true、未实现 5→3、已实现 7→9），新增 **M12-M17** 真实行为断言组
（离线直驱往返/限幅/越界拒绝/计数/副产自清）。产品提交恰两路径
（`apps/server/src/tools.ts` + `tests/smoke/mcp-stubs.mjs`）；llm.ts 零改动
（stub/真实路由动态自动生效），smoke-server.mjs 零改动（M 组挂接点 :300-302 早已在位）。

**重试轮特有前置（REQ-0026-01，BUILD 开工第一步）**：以最小 `exec` 命名调用形态
探针 Edit 验证 Mimosa `warn` 档位确实生效（PLAN 侧只读探针 `echo $MIMOSA_HOOK_BLOCK` /
`echo $MIMOSA_GIT_GATE_MODE` 输出均 `warn`，已由 PRD 存证）；仍被 hard-block →
立即停止、零产品残留、escalate（沿 0020 JOURNAL §3.5-§3.6 裁决纪律：不硬闯、
不换写入通道、不别名混淆）。

## 2. 代码与行为事实基线（当前 HEAD 8768b2c，本会话逐项亲核）

### 2.1 代码事实（行号 = 当前 HEAD；与 0020 SPEC 的漂移以「→」标注）

| 事实 | 证据（本会话 Read/grep） |
| --- | --- |
| tools.ts 现状 **119 行**（0020 基线 117 + BK-0030 三分支撑注释 2 行，:104-107） | 本会话 `wc -l` 亲核 |
| IMPL sqlite/browser = null | `tools.ts:59-60`（:59 sqlite 带「未实现：如实告知模型」注释） |
| stub 载荷 `{error:'not implemented', note:'工具 s.n 未接入真实实现'}` | `tools.ts:82`；STUB_MARK 链 `:80-87` |
| TOOL_SPECS sqlite 两行带「（未实现）」前缀 | `tools.ts:97-98` |
| 沙箱锚定 SANDBOX + safePath throw 先例（消息「路径越界：只允许访问沙箱目录」） | `tools.ts:14-15`、`tools.ts:17-21`（throw 在 :19） |
| ensureSandbox | `tools.ts:22` |
| 限幅先例：read_file 200\*1024 / fetch excerpt 4000 | `tools.ts:30`、`tools.ts:48` |
| collectTools 两臂内核：`tools.ts:105-116 → :108-119`（IMPL 命中臂 :114 / else 落 stub 臂 **:115**；PRD 引「:112 else」为内层 for 行，实际 else 在 :115） | `tools.ts:108-119` |
| llm.ts 锚点 **因 0025 BK-0030 全部漂移，本表为现行值**：buildToolSession `:39-40`；stubCount `:48`；desc 直达模型 `:50`；schema→zod `:53-55`；`await impl()` `:59`；bound 200/60 `:61`；pino 路由 `:62`；SSE 🔧 行 `:63`；generateText `:71`；🤖 预告 `:74`；续接 `:76`；catch 降级 `:82-88`；✓ 摘要（N 未接入）`:111` | `llm.ts` 本会话 Read |
| M08-M11 源锁正则对当前 llm.ts **全部命中**（M08↔:63、M09↔:62、M10↔:61、M11↔:111） | `mcp-stubs.mjs:124-129` 正则 × llm.ts 逐条对照 |
| mcp-stubs.mjs 现状 **133 行**，0020 SPEC §4.1「现文」列与当前文件**逐字一致**（:2/:5/:6/:23-26/:30/:34-35/:62-63/:69-70/:85-87/:96-98/:100-108 全锚点本会话 Read 亲核） | `tests/smoke/mcp-stubs.mjs` |
| M 组挂接点（P 组后、H 组起服务前） | `smoke-server.mjs:30`（import）、`:300-302`（调用） |
| better-sqlite3 既有依赖 | `apps/server/package.json:16`（`^12.11.1`）、`:22`（`@types/better-sqlite3 ^9.6.0`）（0020 记 :15/:21 → 现漂移至 :16/:22）、根 `package.json:34-35`（allowScripts） |
| store.ts 同库先例（import / 主库 data/agentflow.db） | `store.ts:21`、`:29-31`（ROOT/DATA_DIR/DB_FILE） |
| 会话层第三臂：buildToolSession 内置臂 = collectTools（inject.ts:98）；结构执法「绝不覆写非 stub」（inject.ts:118 `if (!isStubImpl(...)) continue`）——**sqlite 翻真后外部注册表同名工具不可覆写内置实现，既有语义自动生效** | `mcp/inject.ts:89-120`、`tools.ts:104-107` 注释 |
| 前端注册表 sqlite 条目（宪法冻结面，零接触）早已广告 query/execute | `app.js:103-114`（sqlite 条目 :108-109） |
| sandbox 目录 gitignored | `.gitignore:16` |
| 冒烟基线 89 passed / 0 failed（M 组含 M01-M11 11 条） | metrics 0023/0024/0025 三行（PRD 背景 2 引，本会话未重跑冒烟——基线值采信 PRD 存证） |
| 工作区状态 | `git status --porcelain` = `M docs/evolution/STATE.md` + `?? docs/evolution/iterations/0026/`（恰 PLAN 阶段产物，与 PRD 背景 6「工作区干净」时点结论相容——该结论取自 PLAN 会话落盘前） |

### 2.2 better-sqlite3 行为实证（**复引 0020 SPEC §2.2 十二探针**，结论直接有效）

0020 临时脚本于 OS temp 实跑（win32 + Node v24.21.0，依赖解析自根 node_modules）。
本会话亲核安装版本仍为 `better-sqlite3@12.11.1`（node_modules/better-sqlite3/
package.json:3）——**探针环境与当前完全一致，十二条结论原样复引**，要点：

- #1/#2/#3：ATTACH 绝对/相对路径、注释引导+小写变体均可执行 → 必须黑名单 + 全文扫描；
- #4：`VACUUM INTO` 免 ATTACH 任意路径写出且目标文件被创建 → 必须黑名单；
- #5：`load_extension` 默认 throw「not authorized」→ 黑名单双保险 + 统一沙箱语义错误；
- #6：writefile/readfile 未编入库内，运行时天然拒绝（如实透传即可）；
- #7：prepare 天然限单语句（多语句/空串原生 throw）；
- #8：`stmt.reader` CREATE=false / SELECT=true → query 的 reader 门依据；
- #9：exec 多语句前后 `total_changes()` 差值 = 实际变更行数（计数方案成立）；
- #10：`SELECT last_insert_rowid()` 返回 JS number；
- #11：非字符串值文本化必要；>2^53 整数经默认 number 转换有精度损失（§8.3 边界）；
- #12：`PRAGMA temp_store_directory` 可设不报错（文件级向量）→ 全 PRAGMA 拒绝依据。

### 2.3 安装版 ai@7.0.146 工具异常语义（**复引 0020 SPEC §2.3**，源码级核实仍有效）

本会话亲核 `node_modules/ai/package.json:3` 版本仍为 `7.0.146`，0020 源码级结论原样
复引：`executeToolCall` catch 工具 execute 的异常并转为 `tool-error` 输出对象，不向上
抛（0020 核实点 `node_modules/ai/dist/index.js:3244-3253`）；消息续接时以
`errorMode:"text"` 序列化为模型可见的错误文本 tool-result。即：**工具 impl throw ≠
generateText 失败**——llm.ts 工具循环继续（续接点现为 `llm.ts:76`），模型读到错误
文本后可自我纠正，`llm.ts:82-88` 降级分支不触发。

### 2.4 重试前置与环境基线（REQ-0026-01）

- 只读半段：`MIMOSA_HOOK_BLOCK` / `MIMOSA_GIT_GATE_MODE` 输出均 `warn`
  （PLAN 会话探针，PRD 选题存证节在案；决策全文见 BACKLOG.md BK-0008 行内备注）。
- 写探针半段：BUILD 开工第一步以**最小 exec 命名调用形态**探针 Edit 验证钩子放行/
  仅 warn，结果记 JOURNAL；仍 hard-block → 停止 + 零产品残留 + escalate。
- 本 SPEC 不假设写探针结果；若实测与 warn 档位语义不符，升级回协调者处置，不静默偏离。

## 3. 技术方案定案（REQ-0026-02；三段式设计复用 0020 SPEC §3，锚点已刷新）

### 3.1 DB 锚定与连接生命周期

- **文件名**：`mcp-sqlite.db`（沙箱专用，自描述：MCP sqlite 服务器的库）。派生：
  `const SQLITE_DB = path.join(SANDBOX, 'mcp-sqlite.db');` —— **路径仅引用 SANDBOX
  常量（tools.ts:15），源码零主库/用户路径字面量**（AC2 grep 级核对标的）。与主库
  `data/agentflow.db`（store.ts:31，不同根推导）物理隔离。
- **连接策略**：模块级惰性单例——首次 sqlite 工具调用时 `await ensureSandbox()`
  （tools.ts:22 既有）后 `new Database(SQLITE_DB)`（文件不存在自动创建），句柄缓存到
  进程退出。不采用每次调用开关（PRD 非功能 1 明示避免）。
- **生命周期边界（如实声明）**：不注册优雅停机关闭钩子（server.ts 不在白名单，
  store.ts 的 closeStore 先例不可复制）——默认 DELETE journal 模式下每事务提交即清理
  journal，无 WAL 常驻 sidecar；进程被杀时 SQLite 崩溃恢复语义兜底，最坏丢最后未提交
  事务，**不伪造**。不设任何启动 PRAGMA（零魔法；模型侧 PRAGMA 全拒见 §3.2）。

### 3.2 SQL 越界防护黑名单

**精确清单（大小写不敏感，全文扫描）**：

| 拒绝面 | 匹配 | 依据（实证 #） |
| --- | --- | --- |
| `ATTACH` / `DETACH` | `/\b(attach\|detach)\b/`（词边界 token） | #1/#2/#3：任意文件读写逃逸向量 |
| `VACUUM`（含 `VACUUM INTO`） | 并入 `/\b(attach\|detach\|pragma\|vacuum)\b/i` | #4：免 ATTACH 任意路径写出向量；连 plain VACUUM 一并拒（过近似，沙箱库无需回收） |
| `PRAGMA`（**全量**，含文件级） | 同上 | #12：temp_store_directory 可设目录=文件级向量 |
| 扩展加载 | `/\bload_extension\s*\(/i`（调用语法） | #5：默认已「not authorized」，黑名单为双保险 + 统一沙箱语义错误 |

- **匹配实现**：对**原始 SQL 全文**做两个正则测试（`SQL_DENY =
  /\b(attach|detach|pragma|vacuum)\b/i`、`SQL_DENY_FN = /\bload_extension\s*\(/i`），
  任一命中即 throw。全文扫描（而非仅首关键词）理由：① execute 走 `db.exec` 支持
  多语句，第二条语句的 ATTACH 必须拦（无解析器前提下唯一可靠做法）；② 实证 #3
  注释引导/小写变体天然覆盖；③ 词边界 `\b` 保证 `vacuum_log`/`attachment` 等连写词
  不误伤（M15-g 反例断言钉住该语义）。
- **PRAGMA 全量拒绝的定界论证**：文件级 PRAGMA 实际枚举——`temp_store_directory`
  （实证 #12 可设）是唯一可指定外部路径的 stock PRAGMA；其余（journal_mode 等）只作用
  于主库及其 sidecar（均在沙箱内）。备选方案「仅枚举拒 temp_store_directory」被否：
  无 SQL 解析器时「PRAGMA 名 + 参数是否路径」的识别脆弱、且对未来新增 PRAGMA 无防御；
  全拒是 PRD 授权的从严选项，能力损失为零——schema 自省走
  `SELECT … FROM sqlite_master`（M17 即用此形态），沙箱小库场景无 PRAGMA 刚需。放开面
  （如需 table_info）留后续提案。
- **错误消息（含「沙箱」，对齐 safePath 风格 tools.ts:19）**：
  `SQL 越界：ATTACH/DETACH/PRAGMA/VACUUM/扩展加载被拒（sqlite 工具仅允许操作沙箱专用数据库）`
- **已知误伤面（从严方向，如实声明）**：字符串字面量/注释中含独立词 attach/vacuum
  等会被误拒（如 `VALUES('please attach')`）——错误如实、模型可改写重试；连写词不
  误伤。残余不完备性（黑名单遗漏未知向量）为 PRD 风险声明边界，沙箱锚定是第二道兜底。

### 3.3 query/execute 契约：载荷精确形状与限幅常量

常量：`MAX_ROWS = 100`、`MAX_CELL = 512`（同族先例：fetch excerpt 4000 `tools.ts:48`、
read_file 200\*1024 `tools.ts:30`；100 行 × 512 字符上界约 50KB，远低于 read_file
家族上限，SSE/上下文安全）。

**query**（单语句，返回行集）：

```
入参校验 → assertSql（§3.2 黑名单 + 空串/非字符串检查）
stmt = getDb().prepare(sql)        // better-sqlite3：多语句/语法错原生 throw，如实透传
if (!stmt.reader) throw new Error('sqlite.query 仅支持返回行集的语句；写入或建表请用 sqlite.execute')
iterate() 逐行收集，达 MAX_ROWS 置 truncated=true 并停止（不整表物化，防巨结果撑爆内存）
返回 { rows: Row[], truncated: boolean }
  Row = { [列名]: 单元格 }；单元格文本化：null/undefined→null；string→超 512 截断加'…'；
  number/bigint→String(v)；Buffer→utf8 文本化（二进制有损，§8.3 声明）后同截断规则；
  '…' 截断标记对齐 util.ts preview 先例（tools.ts 不 import util，字面量同等语义）
```

**execute**（单/多语句，写入与结构类；SELECT 行集被丢弃——desc 已声明）：

```
入参校验 → assertSql（同上）
before = SELECT total_changes(); db.exec(sql); after = SELECT total_changes()
返回 { changes: after - before, lastInsertRowid: SELECT last_insert_rowid() }
  changes = 本次调用实际变更行数（多语句累计，实证 #9）；无变更语句（CREATE/DROP）= 0
  lastInsertRowid = 本连接最近一次成功 INSERT 的 rowid（无插入史为 0；JS number，实证 #10）
```

**入参错误（PRD REQ 层「SQL 为空/非字符串 → 如实错误」）**：
`typeof sql !== 'string' || !sql.trim()` → throw
`sqlite 工具参数错误：sql 必须为非空字符串`。

### 3.4 错误呈现形态定案：**throw**（含 llm.ts 相容性论证，锚点按当前 HEAD）

- **定案：throw**（对齐 safePath 先例 tools.ts:19；PRD 字面「抛如实错误」）。
- **与 llm.ts 现有降级语义的相容性**（复引 §2.3 ai@7 语义 + 当前行号）：
  1. 离线直驱（M12-M17）：throw 即清晰可断言的拒绝（AC1/AC2 形态）；
  2. llm.ts 工具循环：ai@7.0.146 把 execute 异常 catch 为 `tool-error` 并以错误文本
     tool-result 续接消息（不 reject generateText）——模型读到「SQL 越界…沙箱…」文本
     后可在下一轮自我纠正，`llm.ts:82-88` 降级分支不触发，工具循环不夭折；
  3. 先例一致：filesystem 三工具的 safePath 违规今日即走同一路径（throw → SDK catch →
     模型可见），sqlite 拒绝与既有真实工具的异常语义完全同构；
  4. 否决 `{error}` 载荷方案：a) 与 stub 载荷（`tools.ts:82`）形态撞车，模糊「未接入」
     与「已接入但被拒」的日志语义边界；b) `llm.ts:62-63` 会把非 stub 实现的返回按
     真实路径记 info/sys 日志——被拒调用以「正常返回」观测，违背「一眼分辨」精神；
     c) PRD 字面即「抛」。
- **观测边界（如实声明，不改 llm.ts）**：throw 发生在 `llm.ts:59 await impl()` 处，
  其后的 🔧 工具调用日志行（:62-63）不会出现——被拒调用在 SSE 面板只见到 🤖 预告行
  （:74）；错误文本进模型侧 tool-result，不进 SSE 日志。此为 safePath 先例既有行为，
  本轮沿用不扩（llm.ts 零改动 = AC5 白名单约束）。

### 3.5 TOOL_SPECS 摘标记——两行目标字面量

```ts
'sqlite.query':   { desc:'在沙箱数据库执行 SELECT 查询并返回行集（上限 100 行；仅限沙箱数据库，不能访问其他数据库文件）', schema:{ sql:'SQL 语句' } },
'sqlite.execute': { desc:'在沙箱数据库执行写入或结构 SQL（CREATE/INSERT/UPDATE/DELETE 等，多语句以 ; 分隔；仅限沙箱数据库）', schema:{ sql:'SQL 语句' } },
```

含「沙箱数据库」限定语（PRD 防误判任意库）；schema 形态不变（llm.ts:53-54 对 value 型
schema 键生成 `z.string().optional()`，兼容确认——`sql` 键不匹配 `/数量|count/i`）。
其余 10 行（含 browser 三行前缀）逐字不动。`IMPL` 表 `'sqlite': null` 行（tools.ts:59）
替换为下节实现，行内注释同步删「未实现：如实告知模型」。

### 3.6 tools.ts 目标代码骨架（BUILD 实现锚点；等价微调允许，黑名单正则/常量值/错误消息须保持）

```ts
import Database from 'better-sqlite3';                      // 既有依赖（store.ts:21 先例）
const SQLITE_DB = path.join(SANDBOX, 'mcp-sqlite.db');
const MAX_ROWS = 100, MAX_CELL = 512;
const SQL_DENY = /\b(attach|detach|pragma|vacuum)\b/i;
const SQL_DENY_FN = /\bload_extension\s*\(/i;
let sdb: Database.Database | null = null;                   // 惰性单例（进程生命周期）
async function getDb(): Promise<Database.Database> {
  if (!sdb) { await ensureSandbox(); sdb = new Database(SQLITE_DB); }
  return sdb;
}
function assertSql(raw: unknown): string { /* §3.2/§3.3：空串/非字符串 + 黑名单，throw */ }
function cellOf(v: unknown): unknown { /* §3.3 文本化与 512+'…' 截断 */ }
/* IMPL['sqlite'] 置换为：
   query:  async ({ sql }) => { …prepare→reader 门→iterate 限幅→{rows,truncated} }
   execute: async ({ sql }) => { …total_changes 差值→{changes,lastInsertRowid} }  */
```

规模预算（PRD 非功能 1）：tools.ts **119 → 预计 ~167 行（≤190）**（0020 预算 ~165
+ 当前基线差 2 行注释）。

### 3.7 SQL 组装纪律（安全约束落点，产品与测试分述）

- **产品代码零 SQL 拼装**：query/execute 把模型传入的 `sql` 字符串**原样**交给
  better-sqlite3 的 prepare/exec，代码不组装、不插值、不 format；内部辅助语句
  （`SELECT total_changes()`、`SELECT last_insert_rowid()`）为编译期字符串字面量；
  黑名单为纯正则测试（只读校验），非 SQL 构造。工具契约的本质是「模型提交 SQL 语句
  本身」——参数绑定不适用于语句体，安全缓解 = 沙箱锚定专用库（§3.1）+ 越界黑名单
  （§3.2）+ 行/单元格限幅（§3.3），此为 PRD 定界的安全模型，如实声明。
- **测试代码**：M12-M17 的建表/插入/查询语句一律纯字面量 SQL；仅 M15 越界探针需把
  测试自建的绝对路径嵌入 SQL 文本以构造攻击面——这些语句在 assertSql 处即被拒
  （黑名单先于执行，探针语句**从不真正执行**），且路径为测试进程自建常量而非外部
  输入，属「预期被拒」的反面用例，不构成生产查询模式。

## 4. mcp-stubs.mjs 口径更新与 M12-M17 断言明细（REQ-0026-03）

### 4.1 既有断言与注释联动清单（漏改即红——M07 防漂移设计意图）

**「现文」列已对当前 133 行文件逐字复核一致（§2.1），下表行号与 0020 SPEC 相同、
全部有效**：

| 位置 | 现文 | 改为 |
| --- | --- | --- |
| `mcp-stubs.mjs:2` | 「离线断言组（M01-M11）」 | 「离线断言组（M01-M17）」 |
| `:5` | 「不依赖模型密钥/外网/sqlite/browser 环境」 | 「不依赖模型密钥/外网/browser 环境；sqlite 组经 better-sqlite3 进程内直驱沙箱专用库（迭代 0026 起为真实行为断言，仅触 gitignored 沙箱目录）」 |
| `:6` | 「行为断言（M02-M07）直连 …dist/tools.js」 | 「行为断言（M02-M07、M12-M17）直连 …dist/tools.js」 |
| `:23-26` 注释块 | 「BK-0008 真实接入 sqlite 时 …须随摘标记同步更新」 | 刷新为已接入实况：「sqlite 已于迭代 0026 真实接入（M12-M17 行为断言在案）；未来任何 stub↔real 翻转仍须三处同步（IMPL/前缀/断言口径）」 |
| `:30` FROZEN | `{ server:'sqlite', …, impl: false }` | `impl: true` |
| `:62` M03 消息 | 「五未实现项 …（sqlite.query/execute/browser…）」 | 「三未实现项 …（browser.navigate/click/screenshot）」 |
| `:63` M03 期望 | `'5/5 含前缀'` | `'3/3 含前缀'` |
| `:69` M04 消息 | 「七已实现项 …」 | 「九已实现项 …（含 sqlite.query/execute）」 |
| `:70` M04 期望 | `'7/7 无前缀'` | `'9/9 无前缀'` |
| `:85` M05 消息 | 「五未实现项 …」 | 「三未实现项 …」 |
| `:86` M05 期望 | `'5/5 如实载荷'` | `'3/3 如实载荷'` |
| `:87` M05 ctx | `collectTools({sqlite:[…],browser:[…]}) 离线直调` | `collectTools({browser:[navigate,click,screenshot]}) 离线直调` |
| `:96` M06 消息 | 「七已实现项 …（filesystem/fetch/web-search 全组）」 | 「九已实现项 …（filesystem/fetch/sqlite/web-search 全组；sqlite 仅类型面，行为面归 M12-M17）」 |
| `:97` M06 期望 | `'7/7 真实函数'` | `'9/9 真实函数'` |
| `:98` M06 ctx | `collectTools({filesystem,fetch,web-search})` | `collectTools({filesystem,fetch,sqlite,web-search})` |
| `:100` M07 注释 | 「BK-0008 摘除路径守护：真接入→强制摘标记删 stub」 | 「已执行轮（0026 sqlite 翻真）；断言语义不变：任一组三向漂移即红」 |

UNIMPL/IMPLD 由 FROZEN 自动派生（`:34-35`），M02 键集（12 键/5 服务器）、M07 三向
（5 组）、M08-M11 源锁（llm.ts 零改动，正则对当前 llm.ts 全命中——§2.1 亲核）均
**零改动**。M06 的「不直调」旧边界对 sqlite 放开（进程内本地库、只触 gitignored
沙箱，直调即设计用途）——M06 自身仍只做类型面检查（filesystem/fetch/web-search
依旧不直调），行为面全部收敛到 M12-M17 并在文件头如实声明边界。

### 4.2 新增 M12-M17（离线直驱真实行为断言；全部经 collectTools 通道）

前置夹具（M12 段首执行）：`rmSync` 越界探针文件（卫生预清，防历史残留误红）→
`execute('DROP TABLE IF EXISTS mcp_smoke_t')`（幂等）→ 快照
`existsSync(REPO_ROOT/data/agentflow.db')`（`REPO_ROOT` 常量 :18 既有）。测试表
`mcp_smoke_t(id INTEGER PRIMARY KEY, name TEXT)`，全程唯一、结束即清。

| ID | 断言（判据全部离线、确定性） | 对应 |
| --- | --- | --- |
| M12 | execute 多语句（建表+2 插入）成功：载荷 deepEqual `{changes:2, lastInsertRowid:2}`（新表 rowid 自 1 起，确定性）；返回不含 `not implemented` | AC1 |
| M13 | query 往返：`SELECT id,name FROM mcp_smoke_t ORDER BY id` → deepEqual `{rows:[{id:'1',name:'alice'},{id:'2',name:'bob'}], truncated:false}`（整数列文本化实证 #11 钉住） | AC1 |
| M14 | 限幅：CTE 一句插入 105 行（execute `changes:105`，顺带验计数）→ query 全表 `rows.length===100 && truncated===true`；另插 600 字符行 → query 单元格 === `'x'.repeat(512)+'…'` | AC1（限幅内） |
| M15 | 越界拒绝矩阵（6 拒绝探针逐条 throw 且消息含「沙箱」、绝不返回成功载荷 + 1 反例护栏）：a. execute ATTACH 仓库根绝对路径探针；b. query ATTACH `'data/agentflow.db'`（主库）；c. execute 注释引导+小写 attach（实证 #3 变体）；d. execute `VACUUM INTO` 沙箱外绝对路径；e. query `PRAGMA temp_store_directory='<临时目录>'`（文件级，实证 #12）；f. query `SELECT load_extension('x')`（黑名单函数面）；g. **反例护栏**：execute `INSERT … VALUES('vacuum_log 备忘')` 成功（词边界语义——连写词不误伤，防黑名单误扩） | AC2 |
| M16 | 计数如实：`UPDATE … WHERE id=1` → `changes:1`；`UPDATE … WHERE id=99999` → `changes:0`；`DELETE … WHERE name='n7'` → `changes:1`（WHERE 定命，与执行序无关） | AC1/AC3 |
| M17 | 副产与自清：① 两个越界探针文件（仓库根 escape/vacuum 路径）不存在（真实副产断言，AC2「沙箱外无新建文件」）；② `data/agentflow.db` 存在性与段首快照一致（离线轮不得创建/触碰主库；CI fresh clone 预期 false）；③ `DROP TABLE mcp_smoke_t` 后 `SELECT count(*) FROM sqlite_master WHERE type='table' AND name LIKE 'mcp_smoke%'` → `{rows:[{c:'0'}]}`（表级自清完成）；④ `rmSync` 探针（卫生兜底，成败皆清） | AC2 |

**沙箱测试文件策略定案**：表级自清（DROP + sqlite_master 验证）+ 探针预清/后清；
`apps/server/sandbox/mcp-sqlite.db` 文件本身持久存在——它是工具自有部署产物（任何
启用 sqlite 工具的环境都会生成），已被 `.gitignore:16` 覆盖，不视为测试污染。
Windows 路径写入 SQL 字符串时统一 `/` 正斜杠（实证 #1 同款，规避转义歧义）。断言数
净增 6（M12-M17）→ 冒烟预期 **95 passed / 0 failed**（= 现基线 89 + 6；C 组动态行
口径沿 0009 SPEC §6.2 备注，VERIFY 记实得值、判据 0 failed）。

## 5. 受影响文件清单（产品提交白名单，AC5/REQ-0026-05 机器核对）

| 文件 | 改动 | 预算 |
| --- | --- | --- |
| `apps/server/src/tools.ts` | §3.1-3.7：IMPL.sqlite 真实现 + TOOL_SPECS 两行 desc 摘标记 + 黑名单/限幅/单例基建 | 119 → ~167 行（≤190） |
| `tests/smoke/mcp-stubs.mjs` | §4.1 联动清单逐处更新 + §4.2 M12-M17 新增 | 133 → ~240 行（≤260） |
| 其余一切路径（`apps/web/**`、`packages/shared/**`、`apps/server/src/` 其余模块（含 llm.ts / mcp/\* / store.ts / server.ts）、`tests/smoke/smoke-server.mjs` 及其余既有测试、`tools/**`、`.github/**`、根/子包 `package.json`/`package-lock.json`、`README.md`、`CONSTITUTION.md`、`AGENTS.md`） | **零改动**（llm.ts 零变化 = 路由动态证明；lock 零变化 = 零依赖证明；smoke-server.mjs 零变化 = 挂接点早已在位） | — |

核对命令（VERIFY）：`git show --numstat <产品提交>` 输出恰上表两行；
`git diff <base>..<产品提交> -- apps/web packages/shared apps/server/src/llm.ts
tests/smoke/smoke-server.mjs tools .github package.json package-lock.json` 输出为空。
迭代目录产物与 STATE/BACKLOG/metrics 回写走归档提交（0011~0025 同机制）。

## 6. 模块边界

```
tools.ts（本轮唯一源码触点）
  唯一持有 IMPL/TOOL_SPECS/collectTools/stub 工厂 + sqlite 真实现与黑名单；
  DB 句柄私有于模块（惰性单例），不导出、不经参数外泄；
  路径派生仅 SANDBOX 常量（AC2 grep 面）；不做日志（无 emit/pino 通道，结构性如此）；
  SQL 零拼装（§3.7）——模型传入语句原样透传 prepare/exec，辅助语句为字面量。
llm.ts（零改动，锚点按当前 HEAD）
  工具调用唯一观测出口（:62-63）与 ✓ 摘要（:111）；对 stub 的认知仅经 isStubImpl
  （:48/:60）；sqlite 翻真后自动走 info/sys 路径、stubCount 自动剔除——M08-M11
  源锁原样绿（§2.1 亲核正则全命中）。工具 impl throw 在 :59 处被 ai@7 catch 为
  模型可见 tool-error（§2.3/§3.4），降级分支（:82-88）不触发。
mcp/inject.ts（零改动）
  buildToolSession 三臂的会话层：:98 collectTools 为内置臂来源；:118 结构执法
  「绝不覆写非 stub」——sqlite 翻真后，外部注册表同名 serverId 的发现工具不再能
  覆写内置 sqlite.query/execute（既有语义自动生效，本轮零改动零验证面扩张）。
store.ts（零接触，白名单排除）
  主库 data/agentflow.db 专属；与沙箱工具库不同根（:29-31 vs SANDBOX 推导）、
  不同句柄、不同进程语义互不可见（跨进程同文件仅理论上可能，见 §8.4）。
shared（零接触）
  DEFS/SSE 契约不动；TOOL_SPECS desc 是后端传模型的工具描述（llm.ts:50/:58），
  非 UI 文案。
前端 app.js MCP_SERVERS（零接触，宪法冻结面）
  sqlite 条目（app.js:108-109）早已广告 query/execute——服务器名/工具名/面板文案
  一字不动，翻真对前端零感知。
tests/smoke/mcp-stubs.mjs
  只依赖 dist/tools.js（行为）+ src/llm.ts（源锁）；M12-M17 仅触 gitignored 沙箱
  目录与仓库根探针文件（自清），不 import llm/providers/store（无 env 副作用）。
```

## 7. 明确不改清单

- `apps/server/src/llm.ts`：零字节（AC5 白名单排除；路由/计数/日志全动态，翻真自动生效）。
- `apps/server/src/mcp/inject.ts` 及 mcp/ 其余模块：零字节（§6 边界自动生效）。
- `tests/smoke/smoke-server.mjs`：零字节（挂接点 :300-302 既有）。
- `packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、
  `.github/**`、根/子包 `package.json`/`package-lock.json`、`README.md`：零字节。
- browser 三工具：维持 stub 如实降级（ADR-0011 结论 = 近期不实施），M03/M05 口径
  更新后恰为其独立守护面。
- 不做 SQL 解析器/白名单方言校验；不提供任何指定 DB 路径的参数；不 ATTACH/复制/
  读写主库；不新增 env/依赖/出站类别。
- `npm run gate:update` / golden 任何接触：**禁止**（非修宪轮；POLICY 禁止区）。
- AGENTS.md「现 84 断言」口径漂移（0019 OBS 已知存量）留治理日文档批处理，本轮不夹带。
- ROADMAP/metrics/BACKLOG 状态流转归 CLOSE。

## 8. 风险与已知边界（如实声明，不虚称已解）

1. **Mimosa 钩子仍拦 exec 形态**（0020 阻塞事由，warn 档位未生效场景）：BUILD 开工
   第一步写探针（REQ-0026-01/AC7）；仍 hard-block → 立即停止、零产品残留、escalate
   （沿 0020 §3.5-§3.6 裁决纪律），不硬闯、不换写入通道、不别名混淆。
2. **同步执行阻塞事件循环**：better-sqlite3 同步 API，巨笛卡尔积可阻塞 loop，无
   语句级超时原语。缓解：query 侧 iterate+100 行早停（不整表物化）、单元格 512 截断、
   PRAGMA 全拒压缩可达面；worker 线程隔离超 M 尺寸——沿 BK-0011「双实例」先例明示
   边界照案不测。
3. **整数精度**：better-sqlite3 默认把 INTEGER 转 JS number，>2^53 静默损失精度
   （实证 #11：9007199254740993 → …992）；文本化如实呈现**转换后**值（非伪造，
   边界声明）。需要精确大整数属深度防御增强，留后续提案。
4. **跨进程同文件**：冒烟测试进程与 server 子进程理论上可同时持有 mcp-sqlite.db
   句柄（标准 SQLite 文件锁语义；冒烟链路实际无并发写——M 组在 server 起动前完成
   且测试进程此后不再写）。部署侧双实例同库场景沿 store.ts 会话先例（语句级锁保证
   原子），不额外设 busy_timeout（零 PRAGMA 原则），锁冲突时 SQLite 错误如实透传。
5. **连接不显式关闭**：无停机钩子（server.ts 不在白名单）；默认 journal 模式进程
   退出即一致，被杀时崩溃恢复兜底（§3.1）。未来若 server.ts 增统一工具库关闭钩子，
   属新迭代议题。
6. **SSE 观测边界**：被拒调用无 🔧 日志行（§3.4），用户侧可感知性弱于模型侧——
   safePath 先例既有行为，本轮不扩。
7. **期望计数硬编码漂移**：§4.1 联动清单逐处列明，漏改即 M03-M07 红（防漂移即设计
   意图）；VERIFY 逐条对照（AC5）。
8. **黑名单不完备**：无 SQL 解析器，枚举面 = 实证四向量（ATTACH/DETACH/VACUUM 含
   INTO 及全量/PRAGMA 全量/load_extension 调用面）；writefile/readfile 未编入库内
   （实证 #6 运行时天然拒绝，如实透传）。沙箱锚定为第二道兜底（漏网落点仍限沙箱库
   文件的既有内容）。残余风险明示，不做完备性虚称。

## 9. 验收口径（命令门禁 + 手动 E2E 点位 + 反演）

### 9.1 命令门禁（BUILD 后逐条；VERIFY 按 PRD AC6 先例可引用工作流脚本统一门禁结论）

| 命令（仓库根） | 通过判据 | 对应 |
| --- | --- | --- |
| `npm run build` | shared+web 构建成功（gate 前置；本轮零前端改动） | AC6 |
| `npm run build:server` | TS 编译成功（§3 类型面 + M 组 dist 前置） | AC1/AC3 |
| `npm run gate` | 8 场景（s0-s7）全绿 diffPx=0——纯回归面机器证据（非修宪轮，禁 gate:update） | AC6 |
| `npm test` | 契约测试全绿（shared 零接触） | AC6 |
| `npm run smoke:server` | **0 failed**，预期 95 passed（89+6；C 组动态行记实得值）；M01-M11 口径更新后全绿（M03 3/3、M04 9/9、M05 3/3、M06 9/9、M07 5 组三向、M08-M11 源锁原样）+ M12-M17 全过 + C/R/D/G/V/K/Z 零回退 | AC3/AC6 |
| `git show --numstat <产品提交>` | 恰 §5 两路径（白名单 + 零依赖机器证明） | AC5 |
| AC7 指针抽样 | 从 PRD/SPEC 引用指针抽样 ≥5 条逐一打开比对（本 SPEC 亲核建议组：tools.ts:59/:97-98、mcp-stubs.mjs:30/:100-108、store.ts:21、app.js:103-114 任五） | AC7 |

### 9.2 手动 E2E 点位（需 `apps/server/.env` 配任一模型密钥；模型行为有不确定性，
判据只看已发生事件，必要时调整提示词重试——0009 SPEC E2E 同款口径）

1. **E2E-1 · 真实往返**：建 userinput → llm 工作流，LLM 节点 mcp 勾选
   `sqlite.query`+`sqlite.execute`，提示词引导「建一张表、插入两行、再查回来汇报」。
   判据：🔧 `sqlite.execute`/`sqlite.query` 行为 **sys 色**（非 warn、无「未接入」）；
   最终回答反映库内真实数据；✓ 摘要 `· MCP 1 服务/2 工具` **无**「（N 未接入）」分项。
2. **E2E-2 · 越界拒绝与自愈**：同上工作流，提示词诱导「ATTACH data/agentflow.db
   查询工作流表」。判据：被拒调用不产生 🔧 行（观测边界 §3.4）但 run 不失败、工具
   循环继续（模型收到错误文本后改写 SQL 或如实说明被拒——两态皆可接受，判据是 run
   完成且无 not implemented 成功载荷）；结束后 `apps/server/sandbox/` 内仅
   `mcp-sqlite.db` 及其建表产物，仓库根/`data/` 无探针残留。
3. **E2E-3 · 混合勾选摘要**：LLM 节点勾 sqlite 两工具 + browser 三工具 → ✓ 行含
   `· MCP 2 服务/5 工具（3 未接入）`（stubCount 仅计 browser）。
4. **E2E-4 · 主库隔离回归**：E2E-1/2 之后 `GET /api/v1/workflows` 列表正常返回
   （store.ts 主库未受沙箱工具活动影响）。

### 9.3 反演演练（AC4，VERIFY 执行，本地工作区做、不入产品提交）

1. **红**：临时把 `IMPL.sqlite` 改回 `null`（一行）→ `npm run build:server` →
   `npm run smoke:server` → M12-M17 全 FAIL（工具回落 stub 载荷 `{error:'not
   implemented'…}`，deepEqual/throw 断言双红）且 exit 1（输出重定向落盘取 `$?`，
   0019 REPORT 已踩「管道吞退出码」坑，沿用其纠正口径）；
2. **绿**：逐字还原 → 复跑 → 95/0、exit 0；
3. **零残留**：`git diff` 与反演前逐字节相同、`git status` 仅白名单两路径 + STATE +
   iterations/0026/。

## 10. 回滚步骤

`git revert <产品提交>`（WORKFLOW §6 唯一回滚手段）。回滚后：IMPL.sqlite 回 null、
desc 回前缀、FROZEN/M 口径回 5/7 旧值、M12-M17 移除——M07 三向自愈断言保证三处同步
回退（漏一处即红，回滚质量可被冒烟直接验证）。沙箱内 `mcp-sqlite.db` 残留文件为
gitignored 运行产物，不影响回滚正确性（如需彻底清理手工删除即可，无数据迁移、
无降级脚本）。
