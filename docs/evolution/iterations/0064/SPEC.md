# SPEC · 迭代 0064 · BK-0019 知识库管理管道后端实施规格（上传→切分→嵌入→入库 + kb 清单端点）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-28 13:50
> 上游：PRD = iterations/0064/PRD.md（PLAN 已落盘）；**定界权威 = ADR-0020**
> （docs/adr/0020-kb-pipeline-embedding-storage.md，§7 为 BACKLOG 回写权威字面量）。
> 本 SPEC 行使 ADR-0020 明文下放的终稿权：受影响文件清单终稿、DDL 终稿、
> 切分参数终值、端点出参字段终值、错误码字面量、smoke 断言 ID 编排、手动
> E2E 点位（ADR-0020 头注「不预写表结构终稿 DDL 与端点终稿代码块（终稿归
> BK-0019 实施 SPEC）」）。**零反转**：存储=案 c 纯表扫描、嵌入=L1 本地词法、
> 承载=案甲 kb 自有仓储、上传承载=express.text()，全部为 ADR-0020 推荐案，
> 四零（零新依赖/零新出站/零新 env/零 shared 契约）全落自主区 → **无需新 ADR、
> 无需批复**（ADR-0020 §8 明文结论）。
> 触UI=否（PRD §触UI 结论）：前端三文件 + server-sync.js + packages/shared
> 零改动；golden 零接触，全程禁 `npm run gate:update`。

## 0. 现状锚点（本 SPEC 会话逐项亲核）

| 锚点 | 位置（本会话 Read/wc 亲核） |
| --- | --- |
| demo kb 三库硬编码语料 | `apps/server/src/kb.ts:7-40`（KB 常量，12+8+6=26 条） |
| 切词纯函数 terms() | `apps/server/src/kb.ts:43-54`（拉丁词 + CJK 二字组） |
| 启动期 TF-IDF 索引构建 | `apps/server/src/kb.ts:56-78`（进程内 `Map<string, DocVec[]>`，kb.ts:58） |
| 余弦检索 retrieve() | `apps/server/src/kb.ts:81-96`（签名 `(kbName, query, topK=3, threshold=0.05)`） |
| kbNames() 前置钩子（现零消费） | `apps/server/src/kb.ts:98` |
| retrieval handler 消费点 | `apps/server/src/handlers.ts:40-53`（:44 调 `retrieve(p.kb \|\| '产品手册 v2.3', q, 20, 0.02)`，两级阈值 ×4 归一化；:7 import `./kb.js`） |
| kb.ts 全仓唯一消费方 = handlers.ts | 本会话 grep 亲核（`retrieve` 命中仅 handlers.ts:7/:44；`kbNames` 零调用方） |
| 主仓储 400 行贴线 | `apps/server/src/store.ts` wc=400（DDL :62-110；AGENTS.md 硬性约定 4 上限） |
| 同库第二连接先例 | `apps/server/src/pty/audit.ts:17-18`（ROOT/DB_FILE 派生）· :39-60（initPtyAuditStore：mkdir + busy_timeout=2000 + 幂等 DDL） |
| 只读供数端点样板 | `apps/server/src/capabilities.ts:56-64`（恒 200，无 4xx/5xx 路径） |
| 沙箱锚定 + safePath 机理 | `apps/server/src/tools.ts:16`（SANDBOX 模块级常量）· :18-22（resolve 归一后前缀校验） |
| v1-only 注册先例族 | `apps/server/src/server.ts:244-273`（capabilities :261、pty :268-273） |
| 全局 JSON body 中间件 | `apps/server/src/server.ts:75`（`express.json({ limit: '4mb' })`） |
| 启动期 init 先例 | `apps/server/src/server.ts:96`（initStore）· :105-112（pty 审计 init + 扫尾块）；停机 :308-309（closePtyAuditStore → closeStore） |
| DEFS combo 三固定名（冻结面） | `packages/shared/src/nodes/retrieval/node.ts:17-22` |
| sandbox 不入库 | `.gitignore`（`apps/server/sandbox/`、`data/`） |
| 依赖面既有 | `apps/server/package.json`：express ^5.0.0（text 内置中间件）· better-sqlite3 ^12.11.1（grep 亲核） |
| smoke 基线 | tests/smoke/smoke-server.mjs wc=2146；基线 **157 passed**（metrics 0057 行：151+PT01-06；0059 复核 157 零漂移）；lib.mjs 边界 = 仅 HTTP + 产物存在性、不 import 产品代码、不写 data/agentflow.db（lib.mjs:6-8） |
| smoke 断言 ID 已占用 | P/M/H/W/N/CAP/S/R/D/E/K/G/V/A/T/O/J/B/Z/C + PT 系（头注 :5 + 本会话 grep）；**KB 前缀未占用** |

## 1. 受影响文件清单（终稿）

### 1.1 新增（产品面，5 文件，各 ≤400 行）

| 文件 | 职责 | 行数预算 |
| --- | --- | --- |
| `apps/server/src/kb/embed.ts` | 嵌入段：`terms()` 自 kb.ts:43-54 **等距迁移** + TF-IDF 权重函数 `buildDocVecs()`（自 kb.ts:59-77 循环体机械提取为纯函数） | ~70 |
| `apps/server/src/kb/chunk.ts` | 切分段：`chunkText(raw, filename)` 纯函数 + 参数常量（§3.3） | ~90 |
| `apps/server/src/kb/store.ts` | 入库段：kb 自有仓储（同库第二连接，pty/audit.ts 先例）——DDL 终稿 + 事务 INSERT + 计数/取数（§3.4） | ~180（ADR-0020 §6 预算 150-200 内） |
| `apps/server/src/kb/seed.ts` | 三固定名语料播种：SEED_CORPUS 自 kb.ts:7-40 **逐字迁移** + 幂等 seedKbs()（§3.5） | ~110 |
| `apps/server/src/kb/routes.ts` | 端点承载：kbUploadHandler / kbListHandler / kbUploadErrorMapper + 校验序 + 落盘（§3.7） | ~140 |

### 1.2 修改（产品面，2 文件）

| 文件 | 改动 | 预算 |
| --- | --- | --- |
| `apps/server/src/kb.ts` | 索引源改造（§3.6）：KB 常量与 terms() 迁出；索引构建改启动期自 DB 重建（`initKbIndex()`）+ 单库重建（`rebuildKbIndex(name)`）+ 请求期懒构建兜底；`retrieve()` 签名与打分语义**逐字不变**；`kbNames()` 改自索引派生；新增索引元数据 `indexMeta`（清单端点数据源）。98 → ~100 行 | ≤400 ✓ |
| `apps/server/src/server.ts` | 接线（§3.8）：import 三行 + 启动 init 三行（initKbStore → seedKbs → initKbIndex，置于 pty 审计块 :105-112 之后）+ 停机 `closeKbStore()` 一行（:308 closePtyAuditStore 之后、:309 closeStore 之前）+ 路由注册两行（PTY 块 :273 之后）+ 文件头注补 kb 两端点一条。313 → ~325 行 | ≤400 ✓ |

### 1.3 修改（测试面，1 文件）

| 文件 | 改动 |
| --- | --- |
| `tests/smoke/smoke-server.mjs` | 新增 KB 组断言 **KB01-KB11**（§5）+ 本地 raw-text POST 辅助（lib.mjs 零改动）；插在 PT 组（:1929 段）之后、Z 组之前。**纯新增面**：tests 现状零 KB 断言（PRD 背景 2/ADR-0020 §4.4 亲核结论），无既有断言回退风险。 |

### 1.4 零改动禁区（AC7 机器证明面，git diff 恒空）

`packages/shared/**`（含 retrieval/node.ts:17-22 三固定名 options——DEFS 冻结面，动态化归 BK-0047 修宪轮）· `apps/web/**`（app.js / app.css / Skeleton.tsx / **server-sync.js**）· `tools/pixel-gate/**` · `.github/**` · 根与 `apps/server` 的 `package.json` / `package-lock.json`（零变化 = 零新依赖机器证明）· `apps/server/.env.example` · `apps/server/src/config.ts`（零新 env）· `apps/server/src/guard.ts`（零出站）· `apps/server/src/store.ts`（主仓储零改动，ADR-0020 §6 案甲钦定）· `apps/server/src/handlers.ts`（**预期零 diff**：:7 import 与 :44 调用形态均不变——kb.ts 原路径原签名保留；若实现被迫改动即 SPEC 偏差，须回 JOURNAL 记档并复核等价性设计）。

## 2. 模块边界与依赖图（无环证明）

```
server.ts ──▶ kb/routes.ts ──▶ kb/chunk.ts（纯函数，零 import）
    │         │      └───────▶ kb/store.ts（better-sqlite3 + logger）
    │         │      └───────▶ kb.ts（rebuildKbIndex 触发）
    │         └──────────────▶ logger
    ├─▶ kb/store.ts（initKbStore / closeKbStore）
    ├─▶ kb/seed.ts ──▶ kb/store.ts（insertDocument 复用）
    └─▶ kb.ts ──▶ kb/store.ts（listKbStats / listChunksByKb）
              └─▶ kb/embed.ts（terms / buildDocVecs / DocVec 类型，纯函数零 import）
handlers.ts ──▶ kb.ts（retrieve，import 路径 './kb.js' 不变）
```

- 依赖方向单向：routes → {chunk, store, kb}；kb → {store, embed}；seed → store。
  **无环**（routes 引 kb，kb 不引 routes；seed 不引 kb）。
- 领域正交（ADR-0020 §6 案甲）：kb 三表与 workflows/runs/sessions 无联合查询、
  无外键；与 store.ts 主仓储仅共享同一 DB 文件（第二连接，busy_timeout=2000
  兜底，pty/audit.ts:43 同款）。
- kb/seed.ts 直写 kb/store.ts，**不经上传 handler 校验**（seed 语料 src 含
  `§`/`·` 等字符，天然在上传白名单外——白名单只约束 HTTP 面，§3.7）。

## 3. 模块设计终稿

### 3.1 kb/embed.ts（嵌入段 · 等价性支柱一）

- `export function terms(text: unknown): string[]` —— 自 kb.ts:43-54 **逐字迁移**
  （函数体零改动：拉丁 `[a-z0-9]+` 小写化 + CJK `[\u4e00-\u9fa5]+` 二字组 + 单字
  保留分支）。
- `export type DocVec = { vec: Map<string, number>; norm: number; src: string; text: string }`
  （自 kb.ts:57 迁出）。
- `export function buildDocVecs(docs: { src: string; text: string }[]): DocVec[]` ——
  自 kb.ts:59-77 索引构建循环**机械提取**为纯函数：同一 KB 内先算 df（含词条的
  文档数）与 N（文档数），再逐文档
  `w = (1+Math.log(tf)) * Math.log(1 + N/(df.get(t)||1))`、
  `norm = Math.sqrt(Σw²) || 1`。**数值语义逐字保留**（含 `||1` 兜底与
  `Math.log` 形态）——等价性要求本函数对相同输入产生与现状逐位相同的 vec/norm。
- 文件头注标注迁移出处（kb.ts:43-54 / :56-78）与 ADR-0020 §4.3 定界。

### 3.2 kb/chunk.ts（切分段 · 参数终值）

常量终值（ADR-0020 §4.2 草案值转正）：

```ts
export const CHUNK_TARGET = 500;   // 目标块长（JS string.length，CJK 口径）
export const CHUNK_OVERLAP = 50;   // 相邻块重叠（硬切步幅 = 500-50 = 450）
```

`export function chunkText(raw: string, filename: string): { src: string; text: string }[]`
算法（确定性，无随机）：

1. 归一：去 BOM（`^\uFEFF`）→ CRLF/CR 归一为 `\n` → 整体 `trim()`。
2. 空（`''`）→ 返回 `[]`（调用方 400，不静默入库）。
3. 空行分段：`split(/\n[ \t]*\n+/)`；段内 `\n+` 折叠为单空格并 `trim`；纯空白段丢弃。
4. 贪心合并：逐段入当前块（以 `\n` 连接），若 `cur.length + 1 + p.length <= 500`
   则并入，否则冲刷 cur 开新块（段落边界优先，短段聚合逼近目标块长）。
5. 超长段硬切（单段 length > 500）：步幅 450 开窗 `[i, i+500)`；
   剩余 ≤ 500 且 > 50 → 末窗收尾切片；**剩余 ≤ 50 → 并入前一窗**（尾接，块长
   上浮至 ≤550 属目标软容差）。硬切邻窗重叠恰 50（= 500-450）。
6. 输出：`blocks.map((b, i) => ({ src: `${filename} §${i+1}`, text: b }))`
   ——src 沿用 kb.ts 语料 `§` 标注形态（kb.ts:9 等），seq 从 1 起。

边界例（smoke KB06 锚）：1200 字单段 → 窗 [0,500)/[450,950)/[900,1200) = **3 块**；
两段各 200 字 → 200+1+200=401 ≤ 500 → **1 块**。

### 3.3 kb/store.ts（入库段 · DDL 终稿 + 承载）

承载 = 案甲：`data/agentflow.db` 的**第二个** better-sqlite3 连接
（pty/audit.ts:39-60 直系同构：`fs.mkdirSync(data/, recursive)` →
`new Database(DB_FILE)` → `pragma busy_timeout = 2000` → 幂等 DDL）。
ROOT/DB_FILE 派生自 `dist/kb/store.js` 多退一层（audit.ts:17 同型）。
**store.ts 主仓储零改动**。

DDL 终稿（表名加 `kb_` 前缀域：与主仓储六表共存于同一物理库，域前缀使归属
唯一、零撞名——pty_audits 先例同型；ADR-0020 §2.3 草案名 documents/chunks 的
终稿化，字段集合与草案逐项对应）：

```sql
CREATE TABLE IF NOT EXISTS kbs(
  name TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS kb_documents(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kb_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kb_documents_kb ON kb_documents(kb_name);
CREATE TABLE IF NOT EXISTS kb_chunks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id INTEGER NOT NULL,
  seq INTEGER NOT NULL,
  src TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc ON kb_chunks(doc_id);
```

对外函数（SQL 收敛本模块，路由与索引只见函数）：

```ts
initKbStore(): void        // 开连接 + DDL（幂等；server.ts 启动期调用）
closeKbStore(): void       // 优雅停机关连接（server.ts 停机序调用）
insertDocument(kbName: string, filename: string, bytes: number,
               chunks: { src: string; text: string }[]): void
// 单事务：① kbs UPSERT（不存在 → INSERT created_at/updated_at=now；
//   存在 → 仅 updated_at=now）② 同 (kb_name, filename) 旧行替换：
//   先 DELETE 其 kb_chunks 行再 DELETE kb_documents 行 ③ INSERT 新
//   kb_documents 行 ④ 批量 INSERT kb_chunks（seq 自 1 递增）。
//   —— 替换语义 = 重复上传同 filename 以新换旧，计数不膨胀（幂等重跑锚）。
countKbChunks(kbName: string): number
listKbStats(): { name: string; docs: number; chunks: number; updated_at: number }[]
// kbs LEFT JOIN 聚合（docs=documents 计数、chunks=chunks 计数），
// ORDER BY name（BINARY = UTF-8 字节序 = 码点序）——确定性输出序。
listChunksByKb(kbName: string): { src: string; text: string }[]
// kb_documents JOIN kb_chunks，ORDER BY kb_documents.id, kb_chunks.seq
// —— 重建索引时保持声明序（等价性支柱，见 §4）。
```

### 3.4 kb/seed.ts（播种段 · 逐字迁移）

- `const SEED_CORPUS: Record<string, { src: string; text: string }[]>` —— 自
  kb.ts:7-40 **逐字迁移**（26 条语料字符串一字不改；头注标注出处与
  「既有工作流三固定名取值语义不变，ADR-0020 §4.4」）。
- `export function seedKbs(): void` —— 遍历 SEED_CORPUS 声明序：`kbs` 行已存在
  的库**整库跳过**（幂等：首启播种，重启零重复；用户向固定名库上传过文档时
  跳过同样成立——upload 只会在 seed 之后的进程生命期内发生，见 §3.6 时序）。
  未播种的库逐条 `insertDocument(name, entry.src, Buffer.byteLength(entry.text),
  [{ src: entry.src, text: entry.text }])` —— **一语料条目 = 一文档 = 一 chunk**，
  filename = 条目 src（如 `退货政策 §2.1`；seed 直写 store，不经 HTTP 白名单，§2）。

### 3.5 kb.ts 索引源改造（等价性支柱二）

| 面 | 现状 | 改造后 |
| --- | --- | --- |
| KB 常量（:7-40） | 模块内字面量 | 迁出（→ kb/seed.ts） |
| terms()（:43-54） | 模块内 | 迁出（→ kb/embed.ts），kb.ts `import { buildDocVecs } from './kb/embed.js'` |
| 索引构建（:56-78） | 模块加载期自 KB 常量构建 | `initKbIndex()`：`listKbStats()` 逐库 `buildDocVecs(listChunksByKb(name))` 填 `index: Map<string, DocVec[]>` + `indexMeta: Map<string, {docs,chunks,updated_at}>`（清单端点数据源，ADR-0020 §5「进程内索引派生只读」）；另导出 `rebuildKbIndex(name)`（入库后单库重建：重取 chunks + 刷新 meta 单键；chunk 计 0 → `index.delete(name)` 防御） |
| retrieve()（:81-96） | — | **逐字不动**（含 `index.get(kbName) \|\| index.get('产品手册 v2.3') \|\| []` 回退链、qVec 权重式、`.toFixed(4)`、排序与截断）——签名与打分语义不变，handlers.ts:44 零改动 |
| kbNames()（:98） | `Object.keys(KB)` | `[...index.keys()]`（自索引派生；序 = listKbStats 的 name 升序） |
| 懒构建兜底 | 无 | retrieve()/kbNames() 入口 `ensureIndex()`（`built` 标记，幂等）——防御 server.ts 显式 init 之外的导入路径（多实例冒烟各进程自洽）；server.ts 启动期显式调用仍为主路径（fail-fast） |

启动时序（server.ts，§3.8）：`initStore()`(:96) → `initPtyAuditStore()`(:108)
→ **`initKbStore()` → `seedKbs()` → `initKbIndex()`** → `app.listen`(:276)。
seed 先于一切 HTTP 面 ⇒ 同进程内 seed 与 upload 无竞态；跨重启幂等（§3.4）。

### 3.6 kb/routes.ts（端点承载 · 契约见 §4）

- 校验序（单请求内优先级，确定性）：**① express.text 字节闸（413）→ ② body
  形态（非 string → 415，§4.1 传输约定）→ ③ name 白名单（400）→ ④ filename
  缺失（400）/ 形态（400）/ 后缀白名单（415）→ ⑤ 空文档（400）→ ⑥ 切分零
  chunk（400）→ ⑦ 单 KB chunk 上限（413）→ ⑧ 落盘 + 入库事务（500）→
  ⑨ 索引重建（进程内，异常 500 如实）**。
- 白名单终值（ADR-0020 §4.1 草案转正）：
  - name：`/^[A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 _-]{0,63}$/`
  - filename：`/^[A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 ._-]{0,127}\.(txt|md|csv|json)$/i`
    （首字符禁 `.`，字符类无 `/``\` ⇒ 路径穿越形态在正则层即拒）
- 落盘锚定：`KB_ROOT = path.join(<apps/server 根>, 'sandbox', 'kb')`
  （tools.ts:16 SANDBOX 同型派生，自 dist/kb/routes.js 多退一层）；
  终点 `path.resolve(KB_ROOT, name, filename)` 后**前缀校验**
  `=== KB_ROOT || startsWith(KB_ROOT + path.sep)`（tools.ts:18-22 safePath 机理
  同构，越界 400）——正则白名单为第一闸、resolve 校验为第二闸（纵深防御）。
  `fs.mkdirSync(KB_ROOT/<name>, { recursive: true })` 后 `writeFile`（同名覆盖，
  与 DB 替换语义对齐）。写盘成功而入库失败时 best-effort `unlink` 回清理 +
  `logger.warn`（负例 4xx 族在任一写之前即拒，天然零残留——AC2）。
- chunk 上限终值：单 KB `countKbChunks(name) + 新 chunks 数 > 10000` → 413
  （ADR-0020 §4.1 草案 10⁴ 转正；INSERT 前 SELECT 计数判定）。
- `kbUploadErrorMapper`（4 参错误中间件，**随路由同栈注册**，server.ts 不加全局
  错误器）：`entity.too.large` → 413；`charset.unsupported` → 415；其余
  body 解析错 → 400；映射后统一 `{ error }` JSON 形态（细节进 logger）。

### 3.7 server.ts 接线（行级预算）

```ts
// import 区（pty 族 import 之后）：
import { kbListHandler, kbUploadHandler, kbUploadErrorMapper } from './kb/routes.js';
import { initKbStore, closeKbStore } from './kb/store.js';
import { seedKbs } from './kb/seed.js';
import { initKbIndex } from './kb.js';

// 启动期（initPtyAuditStore()/sweepStalePtySessions() 块 :105-112 之后）：
initKbStore();   // kb 三表 DDL（同库第二连接，pty/audit.ts 先例；store.ts 零改动）
seedKbs();       // 三固定名语料幂等播种（kb.ts 常量逐字迁移，ADR-0020 §4.4）
initKbIndex();   // 索引启动期自 DB 重建（ADR-0020 §4.4）

// 路由注册（PTY 五端点 :268-273 之后，沿 ADR-0005 v1-only 先例族）：
app.get('/api/v1/kb', kbListHandler);
app.post('/api/v1/kb/:name/documents',
  express.text({ limit: '5mb', type: 'text/*' }), kbUploadHandler, kbUploadErrorMapper);

// 停机（:308 closePtyAuditStore() 之后、:309 closeStore() 之前）：
closeKbStore();
```

另：文件头注端点清单补一条（GET /api/v1/kb · POST /api/v1/kb/:name/documents，
标注迭代 0064 / BK-0019 / ADR-0020）。净增 ~12 行，313 → ~325。

## 4. 端点契约终稿

### 4.1 POST /api/v1/kb/:name/documents（上传管道：上传→切分→嵌入→入库）

| 要素 | 契约 |
| --- | --- |
| 路径 | `/api/v1/kb/:name/documents`（v1-only，无 `/api/*` 旧别名——ADR-0005 先例） |
| :name | 目标知识库名（新建或既有），白名单见 §3.6 |
| 传输 | **body = 文件全文纯文本**；Content-Type 必须 `text/*`（推荐 `text/plain; charset=utf-8`），中间件 `express.text({ limit: '5mb', type: 'text/*' })`（Express 5 内置，零新依赖；**multipart 不采**——ADR-0020 §4.1 写死）。非 string body（`application/json` 被全局 json 中间件 :75 先行解析为对象；`x-www-form-urlencoded`/缺失不被 text 解析）→ **415** 传输形态错误（错误信息附「以 text/* 直传全文」指引）。**类型白名单按 filename 后缀而非 Content-Type**：四类文件一律文本直传 |
| query | `filename`（**必填**，终稿收紧：ADR-0020 草案「可选」未定义缺省语义，SPEC 定为必填——落盘文件名与 chunk src 均需其承载；缺失 → 400）。后缀 ∈ `.txt/.md/.csv/.json`（大小写不敏感），白名单外（.pdf/.docx 等）→ 415 |
| 限额 | 单文件 ≤ 5 MiB（字节口径，body-parser bytes 闸，413）；单 KB chunk 总量 ≤ 10000（413） |
| 成功 | **201** `{"ok":true,"kb":"<name>","filename":"<filename>","bytes":<Buffer.byteLength(body,'utf8')>,"chunks":<本次入库 chunk 数>}`（键集恰五键；{ok} 形态沿 stop/approve 应答族） |
| 错误族 | 400 / 413 / 415 / 500，响应一律 `{"error":"<中文可读信息>"}`（字面量总表 §4.3） |
| 副作用 | ① 原始文件落盘 `apps/server/sandbox/kb/<name>/<filename>`（gitignore 区，运行时创建）② DB 事务（kbs UPSERT + 同名文档替换 + chunks 批插）③ `rebuildKbIndex(name)` 进程内索引重建。全程本地 fs + SQLite，**零出站**（guard.ts 零涉）、语料不出进程（L1 本地嵌入） |

### 4.2 GET /api/v1/kb（清单端点 · BK-0047 供数源）

| 要素 | 契约 |
| --- | --- |
| 路径 | `/api/v1/kb`（v1-only；无 query 参数，全量只读） |
| 出参 | 恒 **200** `{"kbs":[{"name":string,"docs":number,"chunks":number,"updated_at":number}]}` —— 顶层恰一键 `kbs`；行恰四键；`name` 非空字符串、`docs`/`chunks` 非负整数、`updated_at` 正整数（epoch ms，KB 最近一次文档变更时间）；**行序 = name 码点升序**（确定性，跨重启稳定） |
| 数据源 | kb.ts `indexMeta`（进程内索引派生只读——ADR-0020 §5「恒 200，无 4xx/5xx 路径；索引构建失败为启动期 fail-fast 面不达端点」；capabilities.ts:54-55 样板同构，请求路径零 SQL） |
| 样板 | capabilities.ts 四同构（只读进程内状态 / 零出站 / v1-only / 字段与消费形态对齐——BK-0047 combo 消费 `name` 列） |

### 4.3 错误码字面量总表（中文，{ error } 形态）

| 码 | 触发 | 字面量 |
| --- | --- | --- |
| 400 | name 白名单外 | `知识库名非法：1-64 位，字母/数字/中文/空格/_/-，且以字母、数字或中文开头` |
| 400 | filename 缺失 | `缺少 filename 查询参数` |
| 400 | filename 形态非法 | `filename 非法：1-128 位加后缀，仅允许字母/数字/中文/空格/./_/-，禁止路径分隔符` |
| 400 | body 非文本形态 | （415 传输族，见下） |
| 400 | 空文档 / 零 chunk | `文档内容为空或无可切分文本` |
| 400 | 路径越界（resolve 校验） | `路径越界：只允许访问沙箱 kb 目录` |
| 413 | 超 5 MiB（字节闸/错误映射） | `文件超限：单文件上限 5 MiB` |
| 413 | 单 KB chunk 超 10000 | `知识库 chunk 总量超上限（10000）` |
| 415 | filename 后缀白名单外 | `不支持的文件类型：仅允许 .txt/.md/.csv/.json` |
| 415 | Content-Type 非 text/* | `上传必须以 text/* Content-Type 直传文件全文（application/json 会被全局 JSON 解析器消费）` |
| 415 | charset 不支持 | `不支持的字符集：仅支持 UTF-8` |
| 500 | 落盘/落库/重建异常 | `kb store failed`（细节进 logger 不进响应，workbench/routes.ts 风格） |

## 5. 等价性保障设计（AC4 零漂移硬边界的落地）

三支柱（任一断裂即等价性失守）：

1. **seed 一对一映射**：一语料条目 = 一文档 = 一 chunk（§3.4）⇒ 重建时 N（库内
   文档数）与 df（含词文档数）与现状 12/8/6 完全一致（现状每条目即一个
   tf-idf「文档」，kb.ts:59-67）。
2. **buildDocVecs 逐字移植**：权重式、`||1` 兜底、`Math.log` 形态零改动（§3.1）。
3. **排序确定性**：`listChunksByKb` ORDER BY doc id, seq = seed 声明序 =
   现状数组序（§3.3）⇒ DocVec 数组序一致 ⇒ `Array.prototype.sort`（Node ≥18
   稳定）平分时输出序一致 ⇒ retrieve() 逐字段（score/src/text）逐位一致。

**A/B 采集比对法（BUILD 义务，VERIFY 复核）**——改造前后同 query 电池输出 diff：

1. 改造前（工作树基线 = 主干代码）：`npm run build:server` 后运行采集脚本
   （node ESM 直调编译产物）：
   ```bash
   node --input-type=module -e "
   import { retrieve } from './apps/server/dist/kb.js';
   const KB = ['产品手册 v2.3','FAQ-售前','工单历史 2026'];
   const Q = ['退货政策 7 天','怎么退货','会员等级','优惠 券','退款多久到账','zzzqqq 无关词'];
   const out = {};
   for (const kb of KB) for (const q of Q) out[kb+'|'+q] = retrieve(kb, q, 20, 0.02);
   console.log(JSON.stringify(out, null, 1));" > /tmp/kb-before.json
   ```
   （6 查询 × 3 库 = 18 组，含命中与未命中；handler 同参形态 topK=20/threshold=0.02。）
2. 改造后：同脚本首行改调 `import { retrieve, initKbIndex } from './apps/server/dist/kb.js'; initKbIndex();`
   （新代码需显式建索引）→ `/tmp/kb-after.json`。
3. `diff` 两文件必须**零差异**；结果锚定字面量嵌入 smoke KB03（§6），JOURNAL
   记档采集方法与输出摘要。
4. 前置条件（如实声明）：比对时 data/agentflow.db 中三固定名库处于 seed 纯净态
   （无用户追加文档）——本机开发库常态；若已污染，先以 KB02 计数判定并记录。

## 6. smoke 扩断言（KB01-KB11 终稿编排）

前置：smoke 新增**本地** raw-text POST 辅助（smoke-server.mjs 内 fetch 直用，
`Content-Type: text/plain; charset=utf-8`，返回 `{status,json,text}`——
lib.mjs 零改动，其边界规则 :6-8 不破）。KB 组实例 = **主实例**（零模型依赖、
零出站、无 MCP env——CAP 组同条件），上传目标库名固定 `smoke-kb-*`
（替换语义保证跨轮重跑幂等：同 (kb,filename) 重传即整替，计数不膨胀；
残留可见于开发库/沙箱，属 gitignore 运行时区——零删除面系 ADR-0020 §8 射程
外，如实声明，见 §8 风险）。

| ID | 断言（check 名称要点） |
| --- | --- |
| KB01 | GET /api/v1/kb → 恒 200；顶层键集恰 `{kbs}`；每行恰四键 {name,docs,chunks,updated_at} 且类型/非空如 §4.2；两次调用 deepEqual（确定性）；行序 name 升序 |
| KB02 | seed 播种可见性：kbs 含三固定名，docs/chunks ≥ 12/8/6（**≥** 口径：容忍开发库用户追加；恰等时置 pristine 标记供 KB03 收紧） |
| KB03 | seed 检索等价回归·命中：三库各一固定查询（userinput→retrieval(kb,topk=3,th=0.1) 经 /api/v1/run），node 输出 hits 的 src/text 锚定；**pristine 时** score+src+text 与 §5 采集锚定字面量 deepEqual（零漂移机器锁），污染时降级 src 锚（JOURNAL 记档分支） |
| KB04 | seed 检索等价回归·未命中：`zzzqqq 无关词` 三库 hits 空、`vars.confidence=0`（node:done 输出含「命中 0 条」） |
| KB05 | 上传正例：POST `smoke-kb-main` filename=sample.md（两段中文正文）→ 201；出参恰五键 {ok,kb,filename,bytes,chunks}、chunks ≥1；随后 GET /api/v1/kb 含该库且 docs=1、chunks=出参值（清单与 DB 实况一致性经端点面核） |
| KB06 | 切分参数行为锚：①1200 字单段（无空行）上传 `smoke-kb-chunk` filename=long.txt → chunks===3；②两段各 200 字 filename=short.txt → chunks===1（§3.2 边界例行为锁定 500/450/50） |
| KB07 | 上传负例 415 族：filename=spec.pdf（text/plain 直传）→ 415；filename=spec.docx → 415；Content-Type=application/json → 415（传输形态）；响应均 {error} 形态 |
| KB08 | 上传负例 400 族：name 含 `/`、name=`..`、name 超长（65 字）、filename 缺失、filename=`../x.txt` 形态 → 各 400 {error}；随后清单零残留（无新库出现——端点可见零残留证明） |
| KB09 | 上传负例 413：`'x'.repeat(5*1024*1024+1024)` body（text/plain）→ 413 且 {error} 形态（错误映射器路径） |
| KB10 | 空文档 400：空 body 与纯空白 body（`"\n\n  \n"`）→ 400 {error}；清单零残留 |
| KB11 | 新语料可检索 + 替换语义：上传 `smoke-kb-main` filename=rag.md（含特征串「量子矩阵融霜冷却协议」）→ run 链 retrieval(kb='smoke-kb-main', th=0.05) 查特征串 → 命中 ≥1 且首条 src 形如 `rag.md §1`（AC5 src 指向上传 filename）；重传 rag.md 为不同特征串内容 → 201、清单 docs 不增（替换）、旧特征串不再命中、新特征串命中 |

预期总数：**157 + 11 = 168 passed**（BUILD 后实跑定准；VERIFY 门 = ≥157 存量
零回退 + KB01-KB11 全绿）。落盘/DB 行数直核（AC1 的 sandbox 文件与
documents/chunks 行数）不进 smoke（lib.mjs 边界），归 VERIFY 直查（auditsOf
只读直查先例，迭代 0016 SPEC §5.1）+ 手动 E2E M1。

## 7. 验收口径（VERIFY 执行清单）

命令（**工作树内**，feat/0064-iter，依序）：

1. `npm run build` → exit 0（build:shared + build:web；gate 前置）。
2. `npm run gate` → 既有 20 场景（s0~s19）全 pass、diffPx=0；本机 s3 抖动按
   issue#12 纪律：复跑为准、双留档、**绝不 gate:update**（非修宪轮，golden
   零接触；CI windows-latest 权威）。
3. `npm test` → **30/30**（含 build:shared+build:server 随跑；shared 零改动 ⇒
   契约面零漂移）。
4. `npm run smoke:server` → ≥157 存量全绿 + KB01-KB11 全绿（预期 168/0）。
5. AC7 零改动面机器证明：
   `git diff --exit-code -- packages/shared apps/web tools/pixel-gate .github package.json package-lock.json apps/server/package.json apps/server/package-lock.json apps/server/.env.example apps/server/src/config.ts apps/server/src/guard.ts apps/server/src/store.ts apps/server/src/handlers.ts`
   → 恒空（handlers.ts 预期零 diff 是等价性设计的机器验证点之一）。
6. A/B 等价比对（§5 流程）零差异。
7. 手动 E2E 点位 M1-M4（下）。
8. VERIFY 直查（AC1/AC2 的库侧证据）：只读 SQLite 计数与
   `apps/server/sandbox/kb/<name>/` 落盘文件字节核对（better-sqlite3 只读开，
   auditsOf 先例）。

手动 E2E 点位（AC8 终稿）：

- **M1 上传正例全链**：`npm start` 后
  `curl -s -X POST "http://localhost:3000/api/v1/kb/我的产品库/documents?filename=manual.md" -H "Content-Type: text/plain; charset=utf-8" --data-binary @docs/ai-sdk-7-功能汇总.md`
  → 201 且 chunks 计数可读；`apps/server/sandbox/kb/我的产品库/manual.md` 存在
  且与源文件字节一致（AC1 落盘可核）。
- **M2 清单出现**：`curl -s http://localhost:3000/api/v1/kb` → kbs 含「我的产品库」
  与三固定名，docs/chunks/updated_at 与实况一致（AC3）。
- **M3 检索命中入库片段**：UI 导入 kb 参数='我的产品库' 的 retrieval 工作流
  （DEFS combo 仍三固定名——下拉选不到新库**非缺陷**，BK-0047 修宪轮射程；
  经 workflow JSON 导入或 PUT /api/v1/workflows 写入后运行）→ 节点输出
  命中 ≥1 条、src 形如 `manual.md §N`（AC5/US-1 全链）。同场回归：kb='产品手册
  v2.3' 查「退货」输出与改造前一致（US-2 人工面）。
- **M4 负例抽查**：filename=spec.pdf → 415；name=`a/b` → 400；错误信息可读。

## 8. 风险与已知边界（如实声明）

1. **开发库污染耦合**：smoke KB 组上传与用户手动上传共享 data/agentflow.db 与
   sandbox/kb/；smoke 用 `smoke-kb-` 前缀隔离命名 + 替换语义保证重跑幂等，但
   条目会留存（零删除端点系 ADR-0020 §8 射程外，如需另立项）。KB02/KB03 的
   ≥ 口径与 pristine 分支即为该耦合的断言侧消解。
2. **chunk 上限（10000）不可冒烟**：构造 10⁴ chunk 需 ~4.5M 字符 body 且边界
   脆弱——AC2 负例不含此项（PRD 原文四负例无 chunk 上限）；上限作为防御面
   实现并源码可核，VERIFY 可选直调复核。
3. **尾窗并入的块长上浮**：硬切尾窗 ≤50 字时并入前窗，块长可达 ~550（目标
   500 软容差）——确定性优先，无检索语义影响（块长不参与打分）。
4. **Content-Type 边缘**：>4 MiB 的 `application/json` body 被全局 json 中间件
   （:75，limit 4mb）先拦，其 413 为 Express 默认 HTML 形态（kb 错误映射器
   只挂 kb 路由栈）——该形态本就属 415 传输错误族，AC2① 的 413 断言用
   text/plain 直传（走映射器，{error} 形态），不受影响。
5. **等价性比对前置**：§5 A/B 需 seed 纯净库；污染库时 KB03 降级锚定并在
   JOURNAL/REPORT 记档分支条件。
6. **反转护栏（过程验收 REQ-0019-G1 重申）**：实现中触任一——存储改案 a/b、
   嵌入改 L2/L3、multipart/pdf 解析依赖——**立即中止转 needs-approval**
   （沿 BK-0027→#10 先例），本迭代按回滚处理。本 SPEC 全文零反转。

## 9. 与上游文档的一致性声明

- 本 SPEC 未扩大 ADR-0020 §7 权威字面量任何边界；两处终稿化收紧/选择已在
  正文标注依据：filename 必填（§4.1，草案「可选」无缺省语义）、表名 kb_ 前缀
  （§3.3，域前缀防撞名，字段集合与 §2.3 草案逐项对应）。
- 触UI=否与 PRD 一致；零 gate:update 与非修宪轮定性一致。
- 无新架构决策（全部消费 ADR-0020 既有结论）→ 不新建 ADR 草案，
  needsAdr=false。
