# SPEC · 迭代 0020 · BK-0008 sqlite MCP 工具真实接入（query/execute 落地 better-sqlite3，DB 锚定沙箱专用文件）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 19:45
> 输入：`docs/evolution/iterations/0020/PRD.md`（逐条对齐 REQ-0008-01…05 / AC1…AC7 与
> 「SPEC 移交要点」①~⑥）。冲突顺位：CONSTITUTION.md > 代码实现 > 本文档。
> 事实核对（本会话 2026-10-24 19:35~19:45）：PRD 全部代码指针复核一致；另做两组
> **本会话实证**——⑴ better-sqlite3 越界向量/默认值核验脚本（临时脚本于 OS temp 目录
> 实跑，输出见 §2.2，不入库）；⑵ 安装版 `ai@7.0.146` 工具 execute 异常语义源码级核实
> （`node_modules/ai/dist/index.js`，见 §3.4）。
> **ADR 判定：无需 ADR（needsAdr=false）**——沿用 0009 SPEC 先例的同款判据：全部改动
> 为既有架构模式内的实现补全（IMPL 表挂真实现 = 0009 前既有设计；沙箱锚定 = tools.ts
> 头注释 :3-5 既有 doctrine；better-sqlite3 用法 = store.ts 既有先例），零新依赖、零新
> env、零出站类别、零 shared 契约、零 UI 接触，POLICY 自主区双条命中（后端能力演进 +
> 测试基建）。无架构选型面（WORKFLOW §4「涉及架构选型的写入 ADR」不触发）。

---

## 1. 范围与结论摘要

把 `IMPL['sqlite']` 从 `null`（`tools.ts:59`）翻转为 `{ query, execute }` 真实现：
**DB 锚定 `apps/server/sandbox/mcp-sqlite.db`**（仅由 `SANDBOX` 常量派生），进程内
better-sqlite3 惰性单例连接；**拒绝面** = 全文 token 扫描黑名单
`attach|detach|pragma|vacuum` + `load_extension(` 调用面，命中即 **throw** 如实错误
（含「沙箱」语义）；query 返回 `{ rows, truncated }`（≤100 行、单元格 ≤512 字符文本化），
execute 返回 `{ changes, lastInsertRowid }`（多语句支持，`total_changes()` 差值计数）。
同步摘除 TOOL_SPECS 两行「（未实现）」前缀（改写为含「沙箱数据库」限定语的真实语义），
并把 `tests/smoke/mcp-stubs.mjs` 冻结基准与 M03-M06 期望口径联动更新（sqlite 组
impl:false→true、未实现 5→3、已实现 7→9），新增 **M12-M17** 真实行为断言组（离线直驱
往返/限幅/越界拒绝/计数/副产自清）。产品提交恰两路径（`apps/server/src/tools.ts` +
`tests/smoke/mcp-stubs.mjs`）；llm.ts 零改动（stub/真实路由动态自动生效），
smoke-server.mjs 零改动（M 组挂接点 :300-302 早已在位）。

## 2. 代码与行为事实基线（本会话逐项核实）

### 2.1 代码事实（与 PRD 背景节逐条复核一致）

| 事实 | 证据（本会话 Read） |
| --- | --- |
| IMPL sqlite/browser = null；stub 分支挂 stubOf | `tools.ts:59-60`、`tools.ts:105-116`（:112 else 分支） |
| stub 载荷 `{error:'not implemented', note:'工具 s.n 未接入真实实现'}` | `tools.ts:82` |
| TOOL_SPECS sqlite 两行带「（未实现）」前缀 | `tools.ts:97-98` |
| 沙箱锚定 SANDBOX + safePath throw 先例（消息「路径越界：只允许访问沙箱目录」） | `tools.ts:14-15`、`tools.ts:17-21` |
| 限幅先例：read_file 200\*1024 / fetch excerpt 4000 | `tools.ts:30`、`tools.ts:48` |
| llm.ts 工具路由：desc 直达模型 / stubCount / 双路日志 / 摘要分项 / 异常降级 | `llm.ts:47,54`、`llm.ts:46`、`llm.ts:56-59`、`llm.ts:107`、`llm.ts:78-84` |
| M 组基座：FROZEN（sqlite impl:false）+ M01-M11 + 源锁 | `mcp-stubs.mjs:27-33`（:30 sqlite 行）、`:37-132` |
| M 组挂接点（P 组后、H 组前） | `smoke-server.mjs:30`（import）、`:300-302`（调用） |
| M06 现边界「不直调避免触沙箱/网络」 | `mcp-stubs.mjs:89-98` |
| BK-0008 遗嘱注释（摘标记须三处同步） | `mcp-stubs.mjs:23-26` |
| better-sqlite3 既有依赖（server dep ^12.11.1 + @types ^9.6.0 + 根 allowScripts） | `apps/server/package.json:15,21`、根 `package.json:31-33` |
| store.ts 同库先例（import / Database.Database 类型 / ROOT 推导主库 data/agentflow.db） | `store.ts:21`、`:112`、`:28-31` |
| 前端注册表 sqlite 条目（宪法冻结面，零接触） | `app.js:103-114`（sqlite :108） |
| sandbox 目录 gitignored | `.gitignore:16` |
| T3-M2 里程碑与本项 ready 状态 | `ROADMAP.md:77-82`、`BACKLOG.md:51` |
| 冒烟基线 89/0（含 M01-M11 11 条）；gate 8 场景 s0-s7 | `STATE.md:13`、0019 REPORT AC3；`tools/pixel-gate/gate.mjs:176-244` |

### 2.2 better-sqlite3 行为实证（本会话临时脚本于 OS temp 实跑，win32 + Node v24.21.0，
依赖解析自根 node_modules 工作区提升；结论为黑名单与载荷设计的直接依据）

| # | 探针 | 结果 | SPEC 含义 |
| --- | --- | --- | --- |
| 1 | `ATTACH DATABASE '<temp绝对路径>' AS esc1`（memory 库上 exec） | **OK（挂载成功）** | ATTACH 是真实逃逸向量，必须黑名单 |
| 2 | `ATTACH 'data/agentflow.db'`（相对路径） | throw「unable to open database」（temp CWD 无 data/ 目录；CWD=仓库根时即命中主库） | 相对路径按进程 CWD 解析；主库向量靠**先拦**而非靠 SQLite 报错 |
| 3 | `/* lead */ attach database 'x1.db' as y1`（注释引导+小写） | **OK** | 仅匹配首关键词的方案会漏拦 → 采用**全文 token 扫描** |
| 4 | `VACUUM INTO '<temp绝对路径>'` | **OK 且目标文件被创建** | VACUUM INTO 是免 ATTACH 的任意文件写出向量，必须黑名单 |
| 5 | `SELECT load_extension('x')` | throw「not authorized」 | 扩展加载默认关（PRD 目标 2「SPEC 验证成文」落实）；仍加黑名单双保险 |
| 6 | `SELECT writefile(...)` / `readfile(...)` | throw「no such function」 | fileio 扩展未编入库内，运行时天然拒绝（如实透传即可） |
| 7 | `prepare('')` / 多语句 / `prepare('ATTACH…')` | 分别 throw「contains no statements」/「more than one statement」/ **可 prepare** | query 走 prepare 天然限单语句；多语句经 query 的原生错如实透传 |
| 8 | `stmt.reader`：CREATE=false / SELECT=true / `PRAGMA table_list`=true / INSERT=false | 如左 | query 用 reader 门分类；PRAGMA 虽为 reader 但先被黑名单拦 |
| 9 | exec 多语句（2 INSERT + 1 UPDATE）前后 `total_changes()` 差值 | **3** | execute 的 changes 计数方案成立 |
| 10 | `SELECT last_insert_rowid()` | `{ r: 2 }`（JS number） | lastInsertRowid 以 SQL 读回，形态确定 |
| 11 | 行值类型：`SELECT 1, 1.5, x'41', NULL, 'txt', 9007199254740993` | `{i:1, f:1.5, b:Buffer, n:null, s:'txt', big:9007199254740992}` | 非字符串值文本化必要；>2^53 整数经默认 number 转换有精度损失（§8 已知边界） |
| 12 | `PRAGMA temp_store_directory = '<目录>'` | **OK（可设，不报错）** | 文件级 PRAGMA 向量实在；是全 PRAGMA 拒绝决策的直接依据 |

### 2.3 安装版 ai@7.0.146 工具异常语义（源码级核实，§3.4 错误形态定案的依据）

- `executeToolCall` **catch** 工具 execute 的异常并转为 `tool-error` 输出对象，**不向上
  抛**（`node_modules/ai/dist/index.js:3244-3253`）；
- 该 `tool-error` 在消息续接时以 `errorMode:"text"` 序列化为模型可见的错误文本
  tool-result（`index.js:5481-5490` + `createToolModelOutput` `index.js:1870-1880`
  → `{type:'error-text', value:getErrorMessage(error)}`）；
- 即：**工具 impl throw ≠ generateText 失败**——llm.ts 工具循环继续（`llm.ts:72`
  续接含错误 tool-result 的 messages），模型读到错误文本后可自我纠正，
  `llm.ts:78-84` 降级分支不触发。

## 3. 技术方案定案（REQ-0008-01/02/03 + 移交要点 ①②③④）

### 3.1 DB 锚定与连接生命周期（移交要点 ①）

- **文件名**：`mcp-sqlite.db`（沙箱专用，自描述：MCP sqlite 服务器的库）。
  派生：`const SQLITE_DB = path.join(SANDBOX, 'mcp-sqlite.db');` —— **路径仅引用
  SANDBOX 常量（tools.ts:15），源码零主库/用户路径字面量**（AC2 grep 级核对标的）。
  与主库 `data/agentflow.db`（store.ts:31，不同根推导）物理隔离。
- **连接策略**：模块级惰性单例——首次 sqlite 工具调用时 `await ensureSandbox()`
  （tools.ts:22 既有）后 `new Database(SQLITE_DB)`（文件不存在自动创建），句柄缓存到
  进程退出。不采用每次调用开关（PRD 非功能 1 明示避免）。
- **生命周期边界（如实声明）**：不注册优雅停机关闭钩子（server.ts 不在白名单，
  store.ts 的 closeStore 先例不可复制）——默认 DELETE journal 模式下每事务提交即清理
  journal，无 WAL 常驻 sidecar；进程被杀时 SQLite 崩溃恢复语义兜底，最坏丢最后未提交
  事务，**不伪造**。不设任何启动 PRAGMA（零魔法；模型侧 PRAGMA 全拒见 §3.2）。

### 3.2 SQL 越界防护黑名单（REQ-0008-02 / 移交要点 ②）

**精确清单（大小写不敏感，全文扫描）**：

| 拒绝面 | 匹配 | 依据（实证 #） |
| --- | --- | --- |
| `ATTACH` / `DETACH` | `/\b(attach\|detach)\b/`（词边界 token） | #1/#2/#3：任意文件读写逃逸向量 |
| `VACUUM`（含 `VACUUM INTO`） | 同上并入 `/\b(attach\|detach\|pragma\|vacuum)\b/i` | #4：免 ATTACH 任意路径写出向量；连 plain VACUUM 一并拒（过近似，沙箱库无需回收） |
| `PRAGMA`（**全量**，含文件级） | 同上 | #12：temp_store_directory 可设目录=文件级向量；见下方「全拒论证」 |
| 扩展加载 | `/\bload_extension\s*\(/`（调用语法） | #5：默认已「not authorized」，黑名单为双保险 + 统一沙箱语义错误 |

- **匹配实现**：对**原始 SQL 全文**做两个正则测试（`SQL_DENY = /\b(attach|detach|pragma|vacuum)\b/i`、
  `SQL_DENY_FN = /\bload_extension\s*\(/i`），任一命中即 throw。全文扫描（而非仅首
  关键词）的理由：① execute 走 `db.exec` 支持多语句，第二条语句的 ATTACH 必须拦
  （无解析器前提下唯一可靠做法）；② 实证 #3 注释引导/小写变体天然覆盖；③ 词边界
  `\b` 保证 `vacuum_log`/`attachment` 等连写词不误伤（M15-g 反例断言钉住该语义）。
- **PRAGMA 全量拒绝的定界论证（PRD 目标 2「由 SPEC 枚举定界，默认从严拒绝面」）**：
  文件级 PRAGMA 实际枚举——`temp_store_directory`（可指定目录，实证 #12 可设）是唯一
  可指定外部路径的 stock PRAGMA；其余（journal_mode 等）只作用于主库及其 sidecar
  （均在沙箱内）。备选方案「仅枚举拒 temp_store_directory」被否：无 SQL 解析器时
  「PRAGMA 名 + 参数是否路径」的识别脆弱、且对未来新增 PRAGMA 无防御；全拒是 PRD
  授权的从严选项，能力损失为零——schema 自省走 `SELECT … FROM sqlite_master`
  （M17 即用此形态），沙箱小库场景无 PRAGMA 刚需。放开面（如需 table_info）留后续
  提案（对齐 PRD 非目标「深度防御增强留后续提案」通道）。
- **错误消息（含「沙箱」，对齐 safePath 风格 tools.ts:19）**：
  `SQL 越界：ATTACH/DETACH/PRAGMA/VACUUM/扩展加载被拒（sqlite 工具仅允许操作沙箱专用数据库）`
- **已知误伤面（从严方向，如实声明）**：字符串字面量/注释中含独立词 attach/vacuum 等
  会被误拒（如 `VALUES('please attach')`）——错误如实、模型可改写重试；连写词不误伤。
  残余不完备性（黑名单遗漏未知向量）为 PRD 风险 1 已声明边界，沙箱锚定是第二道兜底。

### 3.3 query/execute 契约：载荷精确形状与限幅常量（REQ-0008-01 / 移交要点 ③）

常量：`MAX_ROWS = 100`、`MAX_CELL = 512`（同族先例：fetch excerpt 4000 `tools.ts:48`、
read_file 200\*1024 `tools.ts:30`；100 行 × 512 字符上界约 50KB，远低于 read_file 家族
上限，SSE/上下文安全）。

**query**（单语句，返回行集）：

```
入参校验 → assertSql（§3.2 黑名单 + 空串/非字符串检查）
stmt = getDb().prepare(sql)        // better-sqlite3：多语句/语法错原生 throw，如实透传
if (!stmt.reader) throw new Error('sqlite.query 仅支持返回行集的语句；写入或建表请用 sqlite.execute')
iterate() 逐行收集，达 MAX_ROWS 置 truncated=true 并停止（不整表物化，防巨结果撑爆内存）
返回 { rows: Row[], truncated: boolean }
  Row = { [列名]: 单元格 }；单元格文本化：null/undefined→null；string→超 512 截断加'…'；
  number/bigint→String(v)；Buffer→utf8 文本化（二进制有损，§8 声明）后同截断规则；
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

**入参错误（REQ-0008-01「SQL 为空/非字符串 → 如实错误」）**：
`typeof sql !== 'string' || !sql.trim()` → throw
`sqlite 工具参数错误：sql 必须为非空字符串`。

### 3.4 错误呈现形态定案：**throw**（移交要点 ④，含 llm.ts 相容性论证）

- **定案：throw（对齐 safePath 先例 tools.ts:19；PRD REQ-0008-02 字面「抛如实错误」）**。
- **与 llm.ts 现有降级语义（llm.ts:78-84）的相容性论证（安装版源码级，§2.3）**：
  1. 离线直驱（M12-M17）：throw 即清晰可断言的拒绝（AC1/AC2 形态）。
  2. llm.ts 工具循环：ai@7.0.146 把 execute 异常 catch 为 `tool-error` 并以错误文本
     tool-result 续接消息（不 reject generateText）——**模型读到「SQL 越界…沙箱…」
     文本后可在下一轮自我纠正**，`llm.ts:78-84` 降级分支不触发，工具循环不夭折；
  3. 先例一致：filesystem 三工具的 safePath 违规今日即走同一路径（throw → SDK catch →
     模型可见），sqlite 拒绝与既有真实工具的异常语义完全同构；
  4. 否决 `{error}` 载荷方案的理由：a) 与 stub 载荷（`{error:'not implemented'}`，
     tools.ts:82）形态撞车，模糊「未接入」与「已接入但被拒」的日志语义边界；
     b) llm.ts:56-59 会把非 stub 实现的返回按真实路径记 info/sys 日志——被拒调用以
     「正常返回」观测，违背「一眼分辨」精神；c) PRD 字面即「抛」。
- **观测边界（如实声明，不改 llm.ts）**：throw 发生在 `llm.ts:55 await impl()` 处，
  其后的 🔧 工具调用日志行（:58-59）不会出现——被拒调用在 SSE 面板只见到 🤖 预告行
  （:70）；错误文本进模型侧 tool-result，不进 SSE 日志。此为 safePath 先例既有行为，
  本轮沿用不扩（llm.ts 零改动 = AC5 白名单约束）。

### 3.5 TOOL_SPECS 摘标记（REQ-0008-03）——两行目标字面量

```ts
'sqlite.query':   { desc:'在沙箱数据库执行 SELECT 查询并返回行集（上限 100 行；仅限沙箱数据库，不能访问其他数据库文件）', schema:{ sql:'SQL 语句' } },
'sqlite.execute': { desc:'在沙箱数据库执行写入或结构 SQL（CREATE/INSERT/UPDATE/DELETE 等，多语句以 ; 分隔；仅限沙箱数据库）', schema:{ sql:'SQL 语句' } },
```

含「沙箱数据库」限定语（PRD 防误判任意库）；schema 形态不变（llm.ts:50 对 value 型
schema 键生成 `z.string().optional()`，兼容确认）。其余 10 行（含 browser 三行前缀）
逐字不动。`IMPL` 表 `'sqlite': null` 行（tools.ts:59）替换为下节实现，注释同步删
「未实现：如实告知模型」。

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

规模预算（PRD 非功能 4）：tools.ts 117 → 预计 ~165 行（≤190 ✓）。

## 4. mcp-stubs.mjs 口径更新与 M12-M17 断言明细（REQ-0008-04 / 移交要点 ⑤）

### 4.1 既有断言与注释联动清单（漏改即红——M07 防漂移设计意图，PRD 风险 3）

| 位置 | 现文 | 改为 |
| --- | --- | --- |
| `mcp-stubs.mjs:2` | 「离线断言组（M01-M11）」 | 「离线断言组（M01-M17）」 |
| `:5` | 「不依赖模型密钥/外网/sqlite/browser 环境」 | 「不依赖模型密钥/外网/browser 环境；sqlite 组经 better-sqlite3 进程内直驱沙箱专用库（迭代 0020 起为真实行为断言，仅触 gitignored 沙箱目录）」 |
| `:6` | 「行为断言（M02-M07）直连 …dist/tools.js」 | 「行为断言（M02-M07、M12-M17）直连 …dist/tools.js」 |
| `:23-26` 注释块 | 「BK-0008 真实接入 sqlite 时 …须随摘标记同步更新」 | 刷新为已接入实况：「sqlite 已于迭代 0020 真实接入（M12-M17 行为断言在案）；未来任何 stub↔real 翻转仍须三处同步（IMPL/前缀/断言口径）」 |
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
| `:100` M07 注释 | 「BK-0008 摘除路径守护：真接入→强制摘标记删 stub」 | 「已执行轮（0020 sqlite 翻真）；断言语义不变：任一组三向漂移即红」 |

UNIMPL/IMPLD 由 FROZEN 自动派生（`:34-35`），M02 键集（12 键/5 服务器）、M07 三向
（5 组）、M08-M11 源锁（llm.ts 零改动）均**零改动**。M06 的「不直调」旧边界按 PRD
背景 5 论证对 sqlite 放开（进程内本地库、只触 gitignored 沙箱，直调即设计用途）——
M06 自身仍只做类型面检查（filesystem/fetch/web-search 依旧不直调），行为面全部收敛到
M12-M17 并在文件头如实声明边界。

### 4.2 新增 M12-M17（离线直驱真实行为断言；全部经 collectTools 通道）

前置夹具（M12 段首执行）：`rmSync` 越界探针文件（卫生预清，防历史残留误红）→
`execute('DROP TABLE IF EXISTS mcp_smoke_t')`（幂等）→ 快照
`existsSync(REPO_ROOT/data/agentflow.db')`。测试表 `mcp_smoke_t(id INTEGER PRIMARY KEY,
name TEXT)`，全程唯一、结束即清。

| ID | 断言（判据全部离线、确定性） | 对应 |
| --- | --- | --- |
| M12 | execute 多语句（建表+2 插入）成功：载荷 deepEqual `{changes:2, lastInsertRowid:2}`（新表 rowid 自 1 起，确定性）；返回不含 `not implemented` | AC1 |
| M13 | query 往返：`SELECT id,name FROM mcp_smoke_t ORDER BY id` → deepEqual `{rows:[{id:'1',name:'alice'},{id:'2',name:'bob'}], truncated:false}`（整数列文本化实证钉住） | AC1 |
| M14 | 限幅：CTE 一句插入 105 行（execute `changes:105`，顺带验计数）→ query 全表 `rows.length===100 && truncated===true`；另插 600 字符行 → query 单元格 === `'x'.repeat(512)+'…'` | AC1（限幅内） |
| M15 | 越界拒绝矩阵（7 探针逐条 throw 且消息含「沙箱」、绝不返回成功载荷）：a. execute ATTACH 仓库根绝对路径探针；b. query ATTACH `'data/agentflow.db'`（主库）；c. execute 注释引导+小写 attach（实证 #3 变体）；d. execute `VACUUM INTO` 沙箱外绝对路径；e. query `PRAGMA temp_store_directory='<临时目录>'`（文件级，实证 #12）；f. query `SELECT load_extension('x')`（黑名单函数面）；g. **反例护栏**：execute `INSERT … VALUES('vacuum_log 备忘')` 成功（词边界语义——连写词不误伤，防黑名单误扩） | AC2 |
| M16 | 计数如实：`UPDATE … WHERE id=1` → `changes:1`；`UPDATE … WHERE id=99999` → `changes:0`；`DELETE … WHERE name='n7'` → `changes:1`（WHERE 定命，与执行序无关） | AC1/AC3 |
| M17 | 副产与自清：① 两个越界探针文件（仓库根 escape/vacuum 路径）不存在（真实副产断言，AC2「沙箱外无新建文件」）；② `data/agentflow.db` 存在性与段首快照一致（离线轮不得创建/触碰主库；CI fresh clone 预期 false）；③ `DROP TABLE mcp_smoke_t` 后 `SELECT count(*) FROM sqlite_master WHERE type='table' AND name LIKE 'mcp_smoke%'` → `{rows:[{c:'0'}]}`（表级自清完成）；④ `rmSync` 探针（卫生兜底，成败皆清） | AC2/PRD 风险 5 |

**沙箱测试文件策略定案（REQ-0008-04 末项，SPEC 定）**：表级自清（DROP + sqlite_master
验证）+ 探针预清/后清；`apps/server/sandbox/mcp-sqlite.db` 文件本身持久存在——它是
工具自有部署产物（任何启用 sqlite 工具的环境都会生成），已被 `.gitignore:16` 覆盖，
不视为测试污染。Windows 路径写入 SQL 字符串时统一 `/` 正斜杠（实证 #1 同款，规避
转义歧义）。断言数净增 6（M12-M17）→ 冒烟预期 `95 passed / 0 failed`（= 0019 基线
89 + 6；C 组动态行口径沿 0009 SPEC §6.2 备注，VERIFY 记实得值、判据 0 failed）。

## 5. 受影响文件清单（产品提交白名单，AC5/REQ-0008-05 机器核对）

| 文件 | 改动 | 预算 |
| --- | --- | --- |
| `apps/server/src/tools.ts` | §3.1-3.6：IMPL.sqlite 真实现 + TOOL_SPECS 两行 desc 摘标记 + 黑名单/限幅/单例基建 | 117 → ~165 行（≤190） |
| `tests/smoke/mcp-stubs.mjs` | §4.1 联动清单逐处更新 + §4.2 M12-M17 新增 | 133 → ~240 行（≤260） |
| 其余一切路径（`apps/web/**`、`packages/shared/**`、`apps/server/src/llm.ts`、`tests/smoke/smoke-server.mjs`、`tools/**`、`.github/**`、根/子包 `package.json`/`package-lock.json`、`README.md`、`CONSTITUTION.md`、`AGENTS.md`） | **零改动**（llm.ts 零变化=路由动态证明；lock 零变化=零依赖证明；smoke-server.mjs 零变化=挂接点早已在位） | — |

核对命令（VERIFY）：`git show --numstat <产品提交>` 输出恰上表两行；
`git diff <base>..<产品提交> -- apps/web packages/shared apps/server/src/llm.ts tests/smoke/smoke-server.mjs tools .github package.json package-lock.json` 输出为空。
迭代目录产物与 STATE/BACKLOG/metrics 回写走归档提交（0011~0019 同机制）。

## 6. 模块边界

```
tools.ts（本轮唯一源码触点）
  唯一持有 IMPL/TOOL_SPECS/collectTools/stub 工厂 + sqlite 真实现与黑名单；
  DB 句柄私有于模块（惰性单例），不导出、不经参数外泄；
  路径派生仅 SANDBOX 常量（AC2 grep 面）；不做日志（无 emit/pino 通道，结构性如此）。
llm.ts（零改动）
  工具调用唯一观测出口（:56-59）与 ✓ 摘要（:107）；对 stub 的认知仅经 isStubImpl；
  sqlite 翻真后自动走 info/sys 路径、stubCount 自动剔除——M08-M11 源锁原样绿。
store.ts（零接触，白名单排除）
  主库 data/agentflow.db 专属；与沙箱工具库不同根、不同句柄、不同进程语义互不可见
  （跨进程同文件仅理论上可能，见 §8 边界 4）。
shared（零接触）
  DEFS/SSE 契约不动；TOOL_SPECS desc 是后端传模型的工具描述（llm.ts:54），非 UI 文案。
前端 app.js MCP_SERVERS（零接触，宪法冻结面）
  sqlite 条目（app.js:108）早已广告 query/execute——服务器名/工具名/面板文案一字不动。
tests/smoke/mcp-stubs.mjs
  只依赖 dist/tools.js（行为）+ src/llm.ts（源锁）；M12-M17 仅触 gitignored 沙箱目录
  与仓库根探针文件（自清），不 import llm/providers/store（无 env 副作用）。
```

## 7. 明确不改清单

- `apps/server/src/llm.ts`：零字节（AC5 白名单排除；路由/计数/日志全动态，翻真自动生效）。
- `tests/smoke/smoke-server.mjs`：零字节（挂接点 :300-302 既有）。
- `packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、
  `.github/**`、根/子包 `package.json`/`package-lock.json`、`README.md`：零字节。
- browser 三工具：维持 stub 如实降级（ADR-0011 结论=近期不实施），M03/M05 口径更新后
  恰为其独立守护面。
- 不做 SQL 解析器/白名单方言校验（PRD 非目标）；不提供任何指定 DB 路径的参数；
  不 ATTACH/复制/读写主库；不新增 env/依赖/出站。
- ROADMAP/metrics/BACKLOG 状态流转归 CLOSE；AGENTS.md「现 84 断言」口径漂移为已知存量
  （PRD 选题存证在案），留 10-25 治理日，本轮不夹带。

## 8. 风险与已知边界（如实声明，不虚称已解）

1. **黑名单不完备**（PRD 风险 1）：无 SQL 解析器，枚举面=实证四向量（ATTACH/DETACH/
   VACUUM INTO 及全 VACUUM/PRAGMA 全量/load_extension 调用）；writefile/readfile 未编入
   库内（实证 #6 运行时天然拒绝，如实透传）。沙箱锚定为第二道兜底（漏网落点仍限
   沙箱库文件的既有内容）。残余风险明示，不做完备性虚称。
2. **同步执行阻塞事件循环**（PRD 风险 2）：better-sqlite3 同步 API，巨笛卡尔积可阻塞
   loop，无语句级超时原语。缓解：query 侧 iterate+100 行早停（不整表物化）、单元格
   512 截断、PRAGMA 全拒压缩可达面；worker 线程隔离超 M 尺寸——沿 BK-0011「双实例」
   先例明示边界照案不测。
3. **整数精度**：better-sqlite3 默认把 INTEGER 转 JS number，>2^53 静默损失精度
   （实证 #11：9007199254740993 → …992）；文本化如实呈现**转换后**值（非伪造，
   边界声明）。需要精确大整数属深度防御增强，留后续提案。
4. **跨进程同文件**：冒烟测试进程与 server 子进程理论上可同时持有 mcp-sqlite.db 句柄
   （标准 SQLite 文件锁语义；冒烟链路实际无并发写——M 组在 server 起动前完成且测试
   进程此后不再写）。部署侧双实例同库场景沿 store.ts 会话先例（语句级锁保证原子），
   不额外设 busy_timeout（零 PRAGMA 原则），锁冲突时 SQLite 错误如实透传。
5. **连接不显式关闭**：无停机钩子（server.ts 不在白名单）；默认 journal 模式进程退出
   即一致，被杀时崩溃恢复兜底（§3.1）。未来若 server.ts 增统一工具库关闭钩子，属
   新迭代议题。
6. **SSE 观测边界**：被拒调用无 🔧 日志行（§3.4），用户侧可感知性弱于模型侧——
   safePath 先例既有行为，本轮不扩。
7. **期望计数硬编码漂移**（PRD 风险 3）：§4.1 联动清单逐处列明，漏改即 M03-M07 红
   （防漂移设计意图）；VERIFY 逐条对照。

## 9. 验收口径（命令门禁 + 手动 E2E 点位 + 反演）

### 9.1 命令门禁（BUILD 后逐条；VERIFY 按 PRD AC6 先例可引用工作流脚本统一门禁结论）

| 命令（仓库根） | 通过判据 | 对应 |
| --- | --- | --- |
| `npm run build` | shared+web 构建成功（gate 前置；本轮零前端改动） | AC6 |
| `npm run build:server` | TS 编译成功（§3 类型面 + M 组 dist 前置） | AC1/AC3 |
| `npm run gate` | 8 场景（s0-s7）全绿 diffPx=0——纯回归面机器证据 | AC6 |
| `npm test` | 契约测试全绿（shared 零接触） | AC6 |
| `npm run smoke:server` | **0 failed**，预期 95 passed（89+6；C 组动态行记实得值）；M01-M11 口径更新后全绿（M03 3/3、M04 9/9、M05 3/3、M06 9/9、M07 5/5 组、M08-M11 源锁原样）+ M12-M17 全过 + C/R/D/G/V/K/Z 零回退 | AC3 |
| `git show --numstat <产品提交>` | 恰 §5 两路径（白名单+零依赖机器证明） | AC5 |
| AC7 指针抽样 | 从 PRD/SPEC 引用指针抽样 ≥5 条逐一打开比对（建议：tools.ts:59/:97-98、mcp-stubs.mjs:30/:100-112、store.ts:31、app.js:108 任五） | AC7 |

### 9.2 手动 E2E 点位（需 `apps/server/.env` 配任一模型密钥；模型行为有不确定性，
判据只看已发生事件，必要时调整提示词重试——0009 SPEC E2E 同款口径）

1. **E2E-1 · 真实往返**：建 userinput → llm 工作流，LLM 节点 mcp 勾选
   `sqlite.query`+`sqlite.execute`，提示词引导「建一张表、插入两行、再查回来汇报」。
   判据：🔧 `sqlite.execute`/`sqlite.query` 行为 **sys 色**（非 warn、无「未接入」）；
   最终回答反映库内真实数据；✓ 摘要 `· MCP 1 服务/2 工具` **无**「（N 未接入）」分项。
2. **E2E-2 · 越界拒绝与自愈**：同上工作流，提示词诱导「ATTACH data/agentflow.db 查询
   工作流表」。判据：被拒调用不产生 🔧 行（观测边界 §3.4）但 run 不失败、工具循环
   继续（模型收到错误文本后改写 SQL 或如实说明被拒——两态皆可接受，判据是 run 完成且
   无 not implemented 成功载荷）；结束后 `apps/server/sandbox/` 内仅 `mcp-sqlite.db`
   及其建表产物，仓库根/`data/` 无探针残留。
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
   iterations/0020/。

## 10. 回滚步骤

`git revert <产品提交>`（WORKFLOW §6 唯一回滚手段）。回滚后：IMPL.sqlite 回 null、
desc 回前缀、FROZEN/M 口径回 5/7 旧值、M12-M17 移除——M07 三向自愈断言保证三处
同步回退（漏一处即红，回滚质量可被冒烟直接验证）。沙箱内 `mcp-sqlite.db` 残留文件
为 gitignored 运行产物，不影响回滚正确性（如需彻底清理手工删除即可，无数据迁移、
无降级脚本）。
