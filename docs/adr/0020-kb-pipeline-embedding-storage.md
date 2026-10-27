# ADR-0020 · 知识库管理管道后端定界方案草案（嵌入存储选型 + 上传/切分/嵌入/入库管道 + kb 清单端点）

- 状态：**草案 · 待实施轮消费（BK-0019——实现轮）**
- 日期：2026-10-28（BUILD 阶段产出，迭代 0059 / BK-0060，S 项 skipSpec——PRD §7 内嵌定界）
- 关联：BACKLOG BK-0060（本 SPEC 先行轮，done 归档于迭代 0059 CLOSE）/ BK-0019
  （KB 管道实现块，proposed——本 ADR §7 回写其定界）/ BK-0047（retrieval kb
  参数动态化修宪子项，proposed，issue#6 批复承继——§5/§7 边界切割对象）/
  BK-9006（拆分母项，skipped）/ ROADMAP T5-M2 环境感知与数据真实化（:161-165，
  待办节实施序列 3「T5-M2 SPEC 三连」:210-211）/ ADR-0014（§6 附录 A 请批草案
  五要素样板——§8 反转预案形态参照）/ ADR-0015（草案级纪律 + §7 回写字面量
  制式直系样板）/ ADR-0016（端点契约草案样板 + §3.0 模块级常量锚定纪律）/
  ADR-0018（capabilities 供数端点样板——§5 直系样板）/ ADR-0005（v1-only 新
  端点 + SQLite 持久化先例）/ ADR-0006（server-sync 数据面边界）/ POLICY.md
  需批准区（新依赖 / 新出站 / 新 env / shared 契约）
- 版式对齐：ADR-0015 / ADR-0016

> **显著声明：本 ADR 为定界方案草案，不实施任何代码、不引入任何依赖、不新增
> 任何 env / 出站类别 / shared 契约变更 / golden 接触，不改变任何运行时行为。
> 全部表结构 / 端点 / 管道 / 上传承载仅以定界方案存在——定界到契约级（选型
> 选项 + 利弊 + 推荐 / 承载文件清单 / 入参·出参·错误码 / 验收口径），不预写
> 表结构终稿 DDL 与端点终稿代码块（终稿归 BK-0019 实施 SPEC——BK-0035/BK-0045
> 「终稿归实施 SPEC」同款纪律）。推荐案（§2 案 c 纯表扫描 + §3 L1 本地词法
> 嵌入）零新依赖 / 零新出站 / 零新 env / 零 shared 契约，四零全落 POLICY 自主
> 区 → 无需批复（§8 明文结论），故状态行无 ADR-0014 式「待用户批准」位；实施
> 轮任何反转（§2 案 a/b 存储 / §3 L2/L3 嵌入 / 新增解析依赖）即触需批准区，
> 中止转 needs-approval（§8 反转预案）。本文件状态行在实施轮 CLOSE 时按
> ADR-0010/0012 先例更新，全文不出现批准态措辞（始终为草案态标注）。**

## 1. 动机与现状证据

BK-0019 注入的是**知识库管理管道后端**：上传 → 切分 → 嵌入 → 入库，retrieval
检索真实化。T5-M2 语境（ROADMAP.md:161-165）：「retrieval 命中真实入库文档」
为 M2 四验收之一。本 ADR 为其 SPEC 先行（BK-0060，W44 治理日拆分，PRD =
iterations/0059/PRD.md）。

现状证据五条（本 BUILD 会话逐项亲核）：

- **demo kb 三点写死**：`packages/shared/src/nodes/retrieval/node.ts:17-22` kb
  参数 combo 三固定名 options（产品手册 v2.3 / FAQ-售前 / 工单历史 2026）+
  default（NDP 迁移后现状锚点；BK-0019 行内旧锚点 nodes.ts:41 系迭代 0021/0022
  迁移前坐标，§7 回写时刷新）；`apps/server/src/kb.ts:7-40` KB 常量三库硬编码
  语料（12+8+6=26 条；:1-5 文件头注自证「三个知识库与前端下拉一致」）；
  `apps/server/src/handlers.ts:40-53` retrieval handler（两级阈值 ×4 归一化）。
- **检索计算面已真实、语料面固定（事实区分，需求依据）**：kb.ts:43-54 bigram
  切词（拉丁词 + CJK 二字组）、:56-78 启动期 TF-IDF 索引构建（进程内 Map，
  确定性零随机）、:81-96 余弦检索——计算链为真实实现（头注 :4 自证「确定性
  真实计算（非随机模拟）」）；缺口在语料面：不可上传、不可管理、三库固定。
- **kbNames() 前置钩子零消费**：kb.ts:98 `export function kbNames()` 本会话
  grep 全仓（apps/packages/tests/tools）仅定义与 dist 产物命中、零调用方——
  kb 清单端点的数据源出口已预留待接。
- **存储承载先例**：store.ts 恰 400 行贴线（wc 亲核，AGENTS.md 硬性约定 4
  上限）——KB 加表须评估先拆分（BK-0060 行内 SPEC 注意）；
  pty/audit.ts:1-60 为「同库第二连接自有仓储」直系先例（pty_audits，迭代
  0055 / BK-0044 SPEC D1：WAL 同库、busy_timeout 兜底、store.ts 零改动）。
- **端点与上传承载样板**：capabilities.ts（64 行，wc 亲核）GET
  /api/v1/capabilities 只读供数端点（迭代 0039 / ADR-0018，server.ts:261
  v1-only 注册）——kb 清单端点直系样板；server.ts:244-273 v1-only 注册先例族
  （ADR-0005「新端点仅注册 v1、无旧别名」）；server.ts:75
  `express.json({ limit: '4mb' })` 全局 body 中间件——express.text() 同族
  内置中间件即上传承载的零依赖路径。

## 2. 嵌入存储选型三案（必答项① · 每案五要素）

三案 = BK-0060 行内钦定评估对象（SQLite 向量扩展 vs 独立库 vs 纯表扫描）。
判定基准：本产品语料规模（现状 26 条；上传管道接入后的现实量级 10²~10⁴
chunk——草案级估算，实施轮以实测为准）与 POLICY 需批准面最小化。

### 2.1 案 a · SQLite 向量扩展（vec0 虚拟表 KNN 形态，如 sqlite-vec）

- 数据模型：kbs/documents/chunks 三表（同案 c）+ vec0 虚拟表（chunk_id ↔
  embedding BLOB 稠密向量）；语料统计（df/N）仍在进程内。
- 读写路径：写 = 入库事务 INSERT chunk 行 + 虚拟表 upsert；读 = KNN 查询
  （embedding MATCH + ORDER BY distance LIMIT k）下推到扩展。
- 依赖清单：sqlite-vec ^0.1（草案区间，确切包名/版本实施轮核准）——npm
  新增 native/WASM 扩展承载，主连接需 load_extension 加载。
- 需批准面：新增 npm 依赖（POLICY 需批准区）一项。
- 迁移回滚：chunk 文本在母表、向量可重算——回滚 = 移除扩展加载 + DROP 虚拟
  表 + DROP 三表，单提交 revert。

### 2.2 案 b · 独立向量库（外服务型 Qdrant/Milvus 或嵌入式索引库型）

- 数据模型：collection/索引（稠密向量 + payload）；SQLite 仅存文本与元数据。
- 读写路径：写 = 客户端 SDK upsert；读 = SDK search（KNN）。
- 依赖清单：外服务型 = npm 客户端 SDK 一项（如 @qdrant/js-client-rest ^1.x）
  + 服务进程本体（运维面）；嵌入式 = 索引库一项（如 hnswlib-node ^3.x）——
  确切包名/版本实施轮核准。
- 需批准面：外服务型 = 新增 npm 依赖 + 新增出站网络目标类别**双面**；嵌入式
  = 新增 npm 依赖单面。
- 迁移回滚：外服务型 = collection 删除 + 服务卸载；嵌入式 = 索引文件删除 +
  DROP 表；单提交 revert。

### 2.3 案 c · 纯表扫描（SQLite 表 + 进程内计算）——推荐案

- 数据模型：kb 自有仓储三表草案（契约级字段清单，终稿 DDL 归实施 SPEC）：
  kbs(name 唯一, created_at, updated_at) / documents(id, kb_name, filename,
  bytes, created_at) / chunks(id, doc_id, seq, src, text, created_at)——文本
  为持久主体，**不落向量列**（向量/权重为派生态，启动期与入库后自文本重建，
  kb.ts:56-78 同构）。
- 读写路径：写 = 入库事务 INSERT（documents + chunks 批量）；读 = 启动期全量
  读入进程内索引（Map 形态，kb.ts:58 同构）+ 查询期进程内余弦（kb.ts:81-96
  等距复用）——SQLite 只作持久层，查询路径零 SQL 聚合、零向量运算下推。
- 依赖清单：**零**（better-sqlite3 ^12.11.1 与 Node 内置 fs/path 均树内既有，
  apps/server/package.json 亲核）。
- 需批准面：**零**（apps/server/src/** 自主区；无新依赖/出站/env/shared）。
- 迁移回滚：DROP kb 三表 + 删 sandbox/kb/ 上传目录；单提交 revert（纯后端
  无迁移面外溢）。

### 2.4 推荐 = 案 c；否决理由（案 a / 案 b）

- **否决案 a**：① 收益前提缺失——KNN 加速只在稠密语义向量 + 10⁵ 量级 chunk
  才实质化，本产品量级（10²~10⁴）下进程内扫描为毫秒级（kb.ts 现状计算量级的
  外推，草案级估算）；② native/WASM 扩展分发风险（win32 prebuilt 可得性 /
  墙内下载 / Node 大版本重编——AGENTS.md 已知陷阱族，better-sqlite3 同款
  纪律将加倍）；③ load_extension 为新运行时能力面——沙箱工具侧已将其列为
  明示拒绝面（tools.ts:37 SQL_DENY_FN），主连接启用即新增安全审面；④ 其唯一
  需批准面（新依赖）在推荐案中可完全避免。
- **否决案 b**：① 运维面最重（外服务型需第二服务进程的启停/监控/安全）；②
  外服务型双需批准面（新依赖 + 新出站——guard.ts 须学新出站类别）；③ 与本
  产品「单 SQLite 文件、零外部服务」的本地优先形态冲突（ADR-0005 持久化
  选型语境）；④ 同 a-①，量级不达。
- **案 c 代价如实声明**：查询成本 O(全库 chunk 数 × 平均词条数) 线性扫描；
  若未来语料增长逾 10⁵ 或引入稠密语义嵌入，案 a/b 届时按 §8 反转预案重开
  （与嵌入面联合请批，避免半截选型）。

## 3. 嵌入实现选型与出站结论（必答项②）

「嵌入」在本管道 = chunk 文本 → 检索向量的向量化步骤，与 §2 存储正交组合
（BK-0060 行内钦定两维评估）。三路：

| 路线 | 承载 | 出站 | 依赖 | 需批准面 | 语义能力 |
| --- | --- | --- | --- | --- | --- |
| L1 本地词法嵌入（推荐） | bigram TF-IDF（terms() 自 kb.ts:43-54 等距迁移） | 零 | 零 | 零 | 词面匹配（同现状检索语义） |
| L2 本地稠密模型 | transformers.js / onnxruntime-node 类本地推理 | 零 | 新 npm 依赖 + 模型权重分发 | 新依赖一项 | 语义近邻 |
| L3 外部 embedding API | OpenAI 兼容 /embeddings 端点（ai@7 树内既有 embed/embedMany 面，docs/ai-sdk-7-功能汇总.md:37/:79） | **新增出站类别** | 零新增 npm 面预期（接入形态实施轮核准） | 新出站一项 | 语义近邻 |

**推荐 = L1**，与 §2 案 c 组合为统一推荐案：**纯表扫描 + 本地词法嵌入**——
全链零新依赖、零新出站、零新 env、零 shared 契约；检索语义与现状逐位一致
（retrieve() 打分与 handlers.ts:40-53 两级阈值逻辑零改动，既有工作流行为零
漂移）。否决理由：L2 的依赖与权重分发成本（native 推理库 + 模型文件获取
渠道）在「语料面真实化」这一本迭代缺口上属纯增负担；L3 触新出站类别
（POLICY 需批准区；PRD 背景第 5 点钦定分类——embedding 为区别于既有 LLM
chat 的 API 面），且将上传语料全文送出进程（secrets 面扩大）。L2/L3 均作为
**语义升级路径**保留：待语料面真实化落地、真实检索质量反馈确证词法匹配
不足时，按 §8 反转预案请批重开（与 §2 案 a/b 联合评估）。

## 4. 上传 / 切分 / 嵌入 / 入库管道定界（必答项③）

承载落点 = `apps/server/src/kb/` 新模块目录（pty/、workbench/、mcp/ 目录化
先例）；四段各承载文件草案 + 验收口径草案，**终稿代码归实施 SPEC**。

### 4.1 上传段（kb/routes.ts + server.ts 接线）

- 端点契约（契约级）：**POST /api/v1/kb/:name/documents**（v1-only，ADR-0005
  先例）；:name = 目标知识库名（新建或既有），字符白名单草案
  `^[A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 _-]{0,63}$`（name 入盘
  路径段——防注入第一闸，终值实施 SPEC 定）；请求体 = 文件全文纯文本，
  **express.text() 内置中间件承载**（server.ts:75 express.json 同族；Express
  内置零新依赖）；query filename（可选，后缀白名单校验）。
- **multipart 不采（写死）**：Express 无内置 multipart 解析，multer/busboy
  系 = 新 npm 依赖 → 需批准；类型白名单限纯文本族（下）与 raw body 天然
  适配，零依赖路线闭合。实施轮若确需 multipart（浏览器文件选择器直传场景）
  即触需批准区，中止转 needs-approval。
- **上传承载面安全必答**：
  - 落盘锚定：`apps/server/sandbox/kb/<name>/`——SANDBOX 既有常量派生子
    目录（tools.ts:16 模块级常量锚定 + ADR-0016 §3.0 纪律同构；AGENTS.md
    硬性约定 3「文件工具只在 apps/server/sandbox/ 内」）；原始文件留存备
    再切分，chunk 文本另入 SQLite（§4.4）；safePath 机理（tools.ts:18-22
    resolve 归一后前缀校验）同构复用，越界即 400。
  - 大小限额：单文件 ≤ 5 MiB 草案值（express.text({ limit }) 承载，
    server.ts:75 '4mb' 同族）；单 KB chunk 总量上限草案 10⁴（防进程内索引
    爆内存）；终值实施 SPEC 定。
  - 类型白名单：.txt / .md / .csv / .json 四后缀（Content-Type 对齐
    text/plain · text/markdown · text/csv · application/json，charset=UTF-8）；
    非白名单 415；二进制格式（pdf/docx 等）不在射程——解析 = 新依赖 →
    需批准（反转护栏同 multipart）。
  - 零出站结论：上传处理全程本地 fs + SQLite，guard.ts 零涉、零网络请求。
- 错误码：400 name/filename 非法或路径越界 / 413 超限额 / 415 非白名单类型 /
  500 落盘或落库异常（`{ error:'…' }` 形态，sessions/workbench 错误码风格）。
- 验收口径草案：上传 txt/md → 2xx + 出参含 chunk 计数；超限 / 错型 / 越界名
  各一负例；上传后 sandbox/kb/<name>/ 落盘可核。

### 4.2 切分段（kb/chunk.ts）

- 策略草案：段落边界优先（空行分段）+ 目标块长 ~500 字符（CJK 口径）+ 相邻
  块重叠 ~50 字符；超长段落硬切；切分参数终值归实施 SPEC。
- 边界：空文档 / 零 chunk → 400 如实拒绝（不静默入库空库）；chunk src 字段
  沿用 kb.ts 语料形态（filename + 块序标注）。
- 验收口径草案：样例文本切块数与边界断言；空文本 400。

### 4.3 嵌入段（kb/embed.ts）

- 推荐案承载 = L1 词法向量化：terms() 自 kb.ts:43-54 等距迁移（拉丁词 + CJK
  二字组切词纯函数），TF-IDF 权重在索引构建期计算（:56-78 同构）——嵌入段
  落地形态 = 切词函数复用 + 权重计算挂点，无独立模型加载。
- 验收口径草案：同文本切词/权重结果与 kb.ts 现状逐位一致（等价性断言）。

### 4.4 入库段（kb/store.ts）与检索面改造（kb.ts）

- 入库 = documents/chunks 事务 INSERT（§2.3 数据模型）+ 入库后触发该 KB
  索引重建（草案为整库重建，增量优化归实施轮评估）。
- kb.ts 改造定界：KB 常量（:7-40）迁出为 seed（三固定名语料**逐字迁移**播种
  ——BK-0019 行内「映射表承接三个固定名」语义的落地形态，既有工作流三固定
  名取值语义不变）；索引构建（:56-78）改为启动期自 DB 读 chunk 重建；
  retrieve()（:81-96）签名与打分语义不变；kbNames()（:98，现零消费）改自
  索引派生——kb 清单端点数据源就位。
- 验收口径草案：seed 后三固定名检索输出与现状逐位一致（同查询回归断言）；
  上传新库后清单与检索均可见新条目；tests 现状零 KB 断言（本会话 grep 亲核
  零命中）——smoke 扩断言为纯新增面，无既有断言回退风险。

## 5. kb 清单端点契约草案（必答项④）

**GET /api/v1/kb**（v1-only，ADR-0005 先例；无 /api/* 旧别名）——BK-0047
（retrieval kb 参数动态化修宪子项）的供数源，capabilities 端点直系同构。

| 要素 | 契约草案 |
| --- | --- |
| 路径 | GET /api/v1/kb |
| 入参 | 无（零 query 参数——清单为全量只读） |
| 出参 | `{ kbs: [{ name, docs, chunks, updated_at }] }`（字段终值归实施 SPEC；BK-0047 combo 消费 name 列表） |
| 错误码 | 恒 200（capabilities.ts:54-55 同构——进程内索引派生只读供数，无 4xx/5xx 路径；索引构建失败为启动期 fail-fast 面，不达端点） |
| 样板指针 | capabilities.ts（迭代 0039 / BK-0049 / ADR-0018：只读进程内状态、零出站、v1-only、字段名与前端消费形态对齐四同构） |

**BK-0047 消费映射与边界切割（写死）**：前端 combo options 换源消费本端点
（caps 勾选清单换源同构，经 server-sync.js 数据面扩展——ADR-0006 边界）；
该换源触 UI 结构层（属性面板 widget 行数据源）→ 归 **BK-0047 修宪轮**（授权
链 issue#6 批复承继，BACKLOG BK-0047 行）——**BK-0019 实现轮 packages/shared
零改动**，node.ts:17-22 三固定名 options 原样保留（DEFS 冻结面）。本端点在
BK-0019 轮先行落地即满足 BK-0047 行内「至少其 kb 清单端点承载段落地」实施
顺序约束；上传端点（§4.1）为管道私有面，BK-0047 零消费。

## 6. 存储承载与 store.ts 拆分评估（必答项⑤）

两案（BK-0060 行内 SPEC 注意「KB 加表方案须评估先拆分」）：

- **案甲 · kb 自有仓储（推荐）**：apps/server/src/kb/store.ts 自建
  better-sqlite3 第二连接指向同库 data/agentflow.db（pty/audit.ts:1-60 直系
  先例——WAL 同库、busy_timeout=2000 兜底跨进程并发、DDL 收敛自有模块、
  store.ts 主仓储零改动）；KB 表与 workflows/runs/sessions 领域正交（无联合
  查询、无外键），领域边界与 pty_audits（同库第二连接）及 mcp-sqlite.db
  （tools.ts:33 沙箱专用库）两先例同构。行数预算：kb/store.ts ~150-200 行
  （DDL + INSERT 事务 + 清单/全量 chunk 取数 + 索引重建钩子）。
- **案乙 · store.ts 扩表先拆分**：KB 三表并入 store.ts DDL（:62-110）+
  prepare 族 + 取数函数——store.ts 已 400 行贴线（wc 亲核），必超 AGENTS.md
  硬性约定 4 上限 → 须先立「store.ts 拆分」独立 refactor 迭代（一次迭代
  只做一件事；BK-0019 前置 +1 迭代 + 主仓储全量回归面重验）。
- **推荐 = 甲**，否决乙理由：前置迭代成本与主仓储回归面远超「同库第二连接」
  既有成熟先例；领域正交性使并库无联合查询收益；store.ts 拆分另立 debt 项
  （未来主仓储自身需扩表时再议，不与 KB 链绑定）。

## 7. BK-0019 定界回写索引（权威字面量）+ BK-0047 边界切割

以下代码块 = BACKLOG BK-0019 行**备注列的权威回写字面量**（BUILD 已逐字粘贴
回写，其余列含状态 proposed 逐字不动；回写随归档提交入库；VERIFY 以本节为
VERBATIM 比对基准——BK-0027 VERBATIM-OK 标准）。晋升条件：BK-0060 CLOSE 后
由 PLAN 轮晋升 ready（推荐案零反转则无批复等待项）；BK-0047 待 BK-0019
CLOSE 后随链晋升（issue#6 链，关单留 BK-9006 末项）。BK-0047 边界切割正文见
§5（DEFS combo options 动态化归 BK-0047 修宪轮，本链零 shared 改动）。

```text
触UI=否——后端能力项（BK-9006→BK-0047 边界切割写死：retrieval kb 参数 combo options 动态化触 UI（结构层——属性面板 widget 行数据源）归 BK-0047 修宪轮消费 issue#6 批复承继；本实现轮 packages/shared 零改动，三固定名 options 原样保留（nodes/retrieval/node.ts:17-22，NDP 现状锚点——行内旧锚点 nodes.ts:41 系 NDP 迁移前坐标，本次刷新）；语料真实化以 DB 播种承接三固定名（seed 自 kb.ts:7-40 常量逐字迁移，既有工作流取值语义不变），定界字面一致——ADR-0020 §7 本行即权威字面量）：受影响文件=apps/server/src/kb/ 新模块目录（routes.ts 上传管道端点（POST /api/v1/kb/:name/documents：express.text() 内置中间件承载 raw body 零新依赖——multipart 系新依赖不采；name 字符白名单 + filename 后缀白名单；落盘锚定 apps/server/sandbox/kb/<name>/（SANDBOX 常量派生 + safePath 机理同构）；单文件 ≤5 MiB + 单 KB chunk 上限草案值；类型白名单 txt/md/csv/json 非 415；400/413/415/500 错误码，ADR-0020 §4.1）+ GET /api/v1/kb 清单端点（恒 200 只读供数，capabilities.ts 样板同构，ADR-0020 §5）+ chunk.ts 切分（段落边界 + 目标块长/重叠参数草案，ADR-0020 §4.2）+ embed.ts 嵌入（推荐案 L1 本地词法嵌入=bigram TF-IDF，terms() 自 kb.ts:43-54 等距迁移，ADR-0020 §3/§4.3）+ store.ts kb 自有仓储（同库 data/agentflow.db 第二连接，pty/audit.ts 先例，store.ts 主仓储零改动，ADR-0020 §6 案甲；表草案 kbs/documents/chunks 契约级字段清单，终稿 DDL 归实施 SPEC，ADR-0020 §2.3）+ seed.ts 三固定名语料播种（kb.ts 常量逐字迁移，ADR-0020 §4.4）；各文件 ≤400 行）+ apps/server/src/kb.ts 索引源改造（KB 常量迁出；启动期/入库后自 DB 重建索引；retrieve() 签名与打分语义不变、handlers.ts:40-53 零改动预期；kbNames()（:98 现零消费）改自索引派生，ADR-0020 §4.4）+ apps/server/src/server.ts v1-only 路由注册两行 + express.text() 中间件一行（沿 :244-273 先例族，ADR-0020 §4.1）+ smoke 扩断言（kb 清单契约 / 上传管道四段正负例（413/415/400）/ seed 后三固定名检索回归等价断言；tests 现状零 KB 断言为纯新增面）；零 shared 契约、零前端文件、零新依赖、零新 env、零出站（guard.ts 零涉；ADR-0020 §8 无需批复结论——推荐案=纯表扫描 + 本地词法嵌入四零全落自主区）；验收命令口径=npm run build + npm run gate（纯回归面全绿、既有 20 场景零波及实测）+ npm test + npm run smoke:server 扩断言 + 手动 E2E（上传文档→kb 清单出现→retrieval 命中入库片段点位，实施 SPEC 定）；依赖关系=前置 BK-0060（SPEC 先行轮，ADR-0020）；实施序=BK-0060 CLOSE 后单迭代承载（M 级：管道四段 + kb 清单端点 + seed 同轮落地；kb 清单端点段落地即满足 BK-0047 行内「至少其 kb 清单端点承载段落地」实施顺序约束）；晋升条件=BK-0060 CLOSE 且（若实施轮反转采 ADR-0020 §2 案 a/b 存储、§3 L2/L3 嵌入或新增 multipart/pdf 解析依赖）对应 needs-approval 获批（沿 BK-0027→#10 先例，父项批复不自动覆盖依赖/出站面；推荐案零反转则无批复等待项）
```

## 8. 依赖 / 出站请批结论（附录 A 反转预案）

- **无需批复（明文结论）**：推荐案（§2 案 c 纯表扫描 + §3 L1 本地词法嵌入）
  依赖清单 = **零**（better-sqlite3 ^12.11.1 / express ^5.0.0（express.text
  内置中间件）/ Node 内置 fs·path 均树内既有，apps/server/package.json 亲核）；
  出站 = **零**（guard.ts 零涉）；env = **零**（config.ts 零改动）；shared
  契约 = **零**（packages/shared 零改动）。四零全落 POLICY 自主区 → BK-0019
  实现块晋升条件 = BK-0060 CLOSE（**无依赖批复等待项**），无需开
  needs-approval issue，本 ADR 无 ADR-0014 式附录 A 请批草案。
- **反转预案（护栏，不预支）**：实施轮任何一项反转——① 存储改采 §2 案 a
  （sqlite-vec 类向量扩展）或案 b（独立向量库/嵌入式索引库）；② 嵌入改采
  §3 L3 外部 embedding API（新出站类别）；③ 改采 §3 L2 本地稠密模型（新
  依赖 + 权重分发）；④ 上传需 multipart 解析依赖或 pdf/docx 解析依赖——
  任一即触 POLICY 需批准区，**立即中止实现并开 needs-approval issue**（草案
  形态沿 ADR-0014 §6 附录 A 五要素：标题 / 请批清单（包名·版本·许可·分发
  形态）/ 实施顺序 / 批复语义 / 证据链接；开 issue 归协调者/脚本，沿
  BK-0027→#10 先例），获批前 BK-0019 零实现；存储与嵌入反转须联合评估（§2
  与 §3 正交组合，避免半截选型）。
- **不做范围（本 ADR 轮）**：零代码 / 零依赖 / 零 env / 零出站 / 零 shared /
  零 UI / 零 golden——本文件纯新增 + BK-0019 行回写（随归档提交）；apps/**、
  packages/**、tools/**、tests/**、.github/**、package.json / lock 零改动
  （机器证明 = 上述路径 git diff 恒空；lock 零变化 = 零依赖）。不实现任何
  端点 / 表 / 管道 / 上传承载；不预写表结构终稿 DDL 与端点终稿代码块；KB
  管理 face 超出上传管道的部分（删除文档 / 删除知识库 / 重建索引端点）不在
  本定界射程（如需由实施 SPEC 评审增补，仍限自主区面）；BK-0061/BK-0062
  （T5-M2 SPEC 三连后两位）不在本轮。
