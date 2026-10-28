# PRD · 迭代 0064 · BK-0019 知识库管理管道后端：上传→切分→嵌入→入库 + kb 清单端点（ADR-0020 推荐案实现轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-28 13:40
> 来源：BACKLOG BK-0019（capability / 触UI=否 / **P1 / M / ready** / 来源 T5，
> BACKLOG.md:116）。2026-10-28 协调者晋升 ready 并提级 P2→P1（晋升条件兑现：
> 前置 BK-0060 已于迭代 0059 终态 done·ADR-0020 落盘 + 实施按推荐案零反转——
> 无批复等待项；提级理由=「功能优先」语境下 ready 队列唯一功能实现项 +
> 落地即解除 BK-0047 修宪链「至少 kb 清单端点承载段落地」实施顺序约束）。
> **定界权威：ADR-0020 §7（BACKLOG BK-0019 行备注列的权威回写字面量，迭代
> 0059 BUILD 逐字粘贴 + VERIFY VERBATIM 比对过）——本 PRD 一切范围口径以该节
> 为准，本 PRD 不另创边界。**
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M2 环境感知与数据真实化
> （ROADMAP.md:161-165——「retrieval 命中真实入库文档」为 M2 四验收之一，
> 本轮即 M2 首个实现块；BK-0060 SPEC 轮已开工过 M2）。
> 批次编排：无——单项单迭代（M 级：管道四段 + kb 清单端点 + seed 同轮落地，
> ADR-0020 §7 实施序钦定「单迭代承载」）。**M 项不免 SPEC（skipSpec=false）**，
> 受影响文件清单终稿与 DDL 终稿归实施 SPEC（ADR-0020 §0 显著声明「不预写表
> 结构终稿 DDL 与端点终稿代码块」）。
> 回执口径：来源 T5 无 issue → 无回执义务（sourceIssue 无、itemContinues=false）；
> BK-0047（issue#6 子项）晋升条件随本轮 CLOSE 兑现，其关单留 BK-9006 末项。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-28 13:36~13:40 核实）

- **跨迭代续选**：无——0056（BK-0042 done·BK-9004 链终）/0059（BK-0060 done）
  已终态归档；0057+0061（BK-0045 两连败熔断，等用户裁决，工作树 feat/0061-iter
  成果保全）；0063 系并行占位空转轮（无迭代目录）；0060/0062 无迭代目录（基线
  门禁 CI 权威豁免修复轮，commit fd06eea 归档说明）。
- **BK-0045 占位禁选**（派发提示「已被其他并行工作流占位，本轮严禁选择」）：
  双重禁选成立——①并行占位在案；②该项已同项两连败熔断（0057+0061，BACKLOG
  BK-0045 行尾「心跳禁选、等用户裁决」），即使无占位亦不可选。
- **① 批复同步**：档案「approved：无；rejected：无」→ 本轮零动作（无建行、
  无转 ready 门槛解除、无 skipped 改写）。issue 面板四项均 needs-approval 无
  新批复：#14（PTY 依赖批复已消费，关单留 BK-0045 链终轮，BK-0044 行在案）、
  #12（CI 像素门禁 s3 亚像素抖动处置——golden/CI 需批准射程，0045~0059 同判
  不自主处理）、#6/#5（修宪授权链已承继消费中，关单留各链终轮）。
- **② user-request**：档案无 user-request 条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 无 skipped 改写。
- **④ 常规选题（本轮入选路径）**：ready 队列逐项处置（本会话通读 BACKLOG 全表
  亲核，ready 恰三项）——
  - BK-0045（BACKLOG.md:66，P0/M，issue#5）——状态列实为 **failed** 非.ready，
    且占位禁选 + 熔断（见上），双重排除；
  - **BK-0019（:116，P1/M，T5）——✅ 入选**：ready 队列唯一 P1、最高优先
    （余 BK-0061/BK-0062 均 P2 且为 SPEC 文档轮）；类型 capability 非 doc
    （doc 项本轮本就仅 BK-0063 proposed 不在射程）；占位锁亲核
    （`.zcode/locks/items/` 不存在，无任何在途占位，本轮仅派发提示的 BK-0045
    禁选约束）；非修宪轮、无批复依赖（ADR-0020 §8 明文四零全落自主区）；
  - BK-0061（:82，P2/S，T5）——不选（P2 低于 BK-0019，且 SPEC 文档轮可让位
    功能实现项）；
  - BK-0062（:83，P2/M，T5）——不选（同上）。
- **侦察档案消费**：残缺标记唯一实质项 browser stub（tools.ts:138）系
  ADR-0011 评估终态，0041/0045/0046/0047/0050/0051/0059 连续同判不立项；
  悬挂 run 探针 [] 空；治理日产物心跳不重复采集。均不构成候选，无补题。

## 结论

**建议做（本轮入选，P1）**——理由一句话：BK-0060 的 ADR-0020 蓝图已把本项
定界到契约级且推荐案零批复等待，BK-0019 是 ready 队列唯一功能实现项与最高
优先项，落地即同时兑现 T5-M2 验收点「retrieval 命中真实入库文档」与 BK-0047
修宪链的数据源前置。

## 触UI 分类结论（必答）

**触UI=否——纯后端承载项，非修宪轮。**

- `packages/shared` **零改动**：retrieval 节点 kb 参数 combo 三固定名 options
  （产品手册 v2.3 / FAQ-售前 / 工单历史 2026，`packages/shared/src/nodes/
  retrieval/node.ts:17-22` 本会话亲核）原样保留——DEFS 冻结面；combo options
  动态化（属性面板 widget 行数据源）触 UI 结构层，归 **BK-0047 修宪轮**消费
  issue#6 批复承继（ADR-0020 §5 边界切割写死，本会话复认）。
- 前端三文件（app.js / app.css / Skeleton.tsx）零改动；server-sync.js 本轮
  亦零改动（BK-0047 换源时才经数据面消费）。
- golden 零接触：全程禁 `npm run gate:update`；reconstitutional=false——
  本项不是任何获批 issue 解阻的 UI/golden 变更轮，gate 仅作纯回归面。

## 背景与现状证据（本会话逐项亲核，非转抄）

1. **demo kb 三点写死**：shared 侧 `retrieval/node.ts:17-22` combo options 三
   固定名 + default；服务端 `apps/server/src/kb.ts` 98 行（wc 亲核）内
   `KB` 常量三库硬编码语料（:7-40，头注 :1-5 自证「三个知识库与前端下拉
   一致」）；消费点 `handlers.ts:40-53` retrieval handler（两级阈值 ×4
   归一化，本会话亲读）。
2. **计算面真实、语料面固定**（需求依据的事实区分）：kb.ts `terms()` bigram
   切词（:43-54，拉丁词 + CJK 二字组）、启动期 TF-IDF 索引（:56-78）、余弦
   检索 `retrieve()`（:81-96）为确定性真实实现——缺口在语料面：不可上传、
   不可管理、三库固定。本项注入的正是这缺口。
3. **kbNames() 前置钩子零消费**：kb.ts:98 `export function kbNames()` 本会话
   确认仅 `Object.keys(KB)` 派生——kb 清单端点的数据源出口已预留待接。
4. **存储承载先例**：store.ts 恰 400 行贴线（wc 亲核，AGENTS.md 硬性约定 4
   上限）→ ADR-0020 §6 案甲「kb 自有仓储 = 同库第二连接」为钦定承载
   （`pty/audit.ts:1-20` 直系先例本会话亲读：WAL 同库、busy_timeout=2000、
   store.ts 主仓储零改动）；kb 表与主仓储领域正交（无联合查询、无外键）。
5. **端点与上传承载样板**：`capabilities.ts` 64 行（wc 亲核）只读供数端点
   为 kb 清单端点直系样板（ADR-0018·迭代 0039）；`server.ts:75`
   `app.use(express.json({ limit: '4mb' }))` 本会话亲读——express.text()
   同族内置中间件即上传承载零依赖路径；server.ts 现无任何 kb 路由
   （grep 亲核零命中）→ 两端点均纯新增面。
6. **落盘锚定先例**：`tools.ts:16` SANDBOX 模块级常量锚定 + `:18-22`
   safePath resolve 归一前缀校验（本会话亲读）——上传落盘
   `apps/server/sandbox/kb/<name>/` 复用同机理。

## 目标与范围

一句话目标：把 retrieval 的语料面从「三固定 demo 库」升级为「可上传管理的
真实 KB」，同时既有工作流检索行为零漂移，且零新依赖 / 零新出站 / 零新 env /
零 shared 契约（ADR-0020 §8 四零结论）。

### 功能需求（REQ-0019-xx；范围=ADR-0020 §7 权威字面量，此处条目化）

- [ ] **REQ-0019-01 kb 模块目录**：新增 `apps/server/src/kb/`（pty/、
      workbench/、mcp/ 目录化先例），各文件 ≤400 行（AGENTS.md 硬性约定 4）。
- [ ] **REQ-0019-02 上传管道端点**：`POST /api/v1/kb/:name/documents`
      （v1-only，ADR-0005 先例）——express.text() 内置中间件承载 raw body
      **零新依赖**（multipart 系新依赖不采，写死）；name 字符白名单 +
      filename 后缀白名单（.txt/.md/.csv/.json，非白名单 415）；落盘锚定
      `apps/server/sandbox/kb/<name>/`（SANDBOX 常量派生 + safePath 机理
      同构）；单文件 ≤5 MiB（413）+ 单 KB chunk 上限草案值（防进程内索引
      爆内存）；400/413/415/500 错误码族（ADR-0020 §4.1）。
- [ ] **REQ-0019-03 kb 清单端点**：`GET /api/v1/kb` 恒 200 只读供数
      （capabilities.ts 样板同构，ADR-0020 §5——BK-0047 的供数源；出参
      `{ kbs: [{ name, docs, chunks, updated_at }] }` 契约级，字段终值归
      实施 SPEC）。
- [ ] **REQ-0019-04 切分段**：`kb/chunk.ts` 段落边界优先（空行分段）+
      目标块长 ~500 字符 + 相邻块重叠 ~50 字符草案 + 超长段落硬切；空文档/
      零 chunk 400 如实拒绝不静默（ADR-0020 §4.2；参数终值归实施 SPEC）。
- [ ] **REQ-0019-05 嵌入段**：`kb/embed.ts` 推荐案 L1 本地词法嵌入 =
      bigram TF-IDF，`terms()` 自 kb.ts:43-54 **等距迁移**（拉丁词 + CJK
      二字组切词纯函数逐字保留），TF-IDF 权重在索引构建期计算（ADR-0020
      §3/§4.3）。
- [ ] **REQ-0019-06 入库段**：`kb/store.ts` kb 自有仓储——同库
      data/agentflow.db 第二 better-sqlite3 连接（pty/audit.ts 先例），
      store.ts 主仓储**零改动**；表草案 kbs/documents/chunks 契约级字段
      清单（终稿 DDL 归实施 SPEC，ADR-0020 §2.3）；入库事务 INSERT +
      入库后触发该 KB 索引重建（ADR-0020 §6 案甲 + §4.4）。
- [ ] **REQ-0019-07 seed 播种**：`kb/seed.ts` 三固定名语料播种——kb.ts
      :7-40 KB 常量**逐字迁移**（既有工作流三固定名取值语义不变，
      ADR-0020 §4.4）。
- [ ] **REQ-0019-08 kb.ts 索引源改造**：KB 常量迁出；索引构建（:56-78）
      改为启动期自 DB 读 chunk 重建；`retrieve()`（:81-96）**签名与打分
      语义不变**、handlers.ts:40-53 零改动预期；`kbNames()`（:98 现零消费）
      改自索引派生（ADR-0020 §4.4）。
- [ ] **REQ-0019-09 server.ts 接线**：v1-only 路由注册两行 +
      express.text() 中间件一行（沿 :244-273 先例族，ADR-0020 §4.1）。
- [ ] **REQ-0019-10 smoke 扩断言**：kb 清单契约 / 上传管道四段正负例
      （413/415/400）/ seed 后三固定名检索回归等价断言（tests 现状零 KB
      断言，纯新增面无既有断言回退风险，ADR-0020 §4.4 亲核结论）。

### 不做范围（out of scope，护栏）

- **反转项一触即止**（ADR-0020 §8 反转预案，过程护栏 REQ-0019-G1）：实现中
  任何一项——①存储改采案 a（sqlite-vec 类向量扩展）/案 b（独立向量库）；
  ②嵌入改采 L3 外部 embedding API（新出站）/L2 本地稠密模型（新依赖+权重
  分发）；③上传需 multipart 解析或 pdf/docx 解析依赖——**立即中止实现转
  needs-approval issue**（沿 BK-0027→#10 先例），获批前零实现。
- BK-0047 前端换源（combo options 动态化 + server-sync 数据面）——修宪轮
  独立项，本轮零前端文件。
- KB 管理 face 超出上传管道的部分（删除文档 / 删除知识库 / 重建索引端点）
  ——不在本定界射程（ADR-0020 §8；如需由实施 SPEC 评审增补仍限自主区面）。
- BK-0061 / BK-0062（T5-M2 SPEC 三连后两位）不在本轮。
- 增量索引优化（草案为整库重建）归实施轮评估，不预设。

### 用户故事

- US-1（工作流作者）：我想把产品文档 txt/md 上传到知识库，让 retrieval 节点
  检索到真实入库片段，而不是只有三条 demo 语料——上传 → 清单出现 → 检索命中。
- US-2（既有工作流用户）：我已经用「产品手册 v2.3」搭了工作流——seed 播种后
  同查询检索结果与现状逐位一致，我的工作流零漂移、零迁移成本。
- US-3（BK-0047 前端消费方·下轮）：retrieval 属性面板的 kb 下拉要动态化——
  本轮落地的 GET /api/v1/kb 即其数据源，端点契约以 BK-0047 消费形态对齐
  （capabilities 先例四同构）。

## 非功能要求

- **安全**（ADR-0020 §4.1 五必答全数落位）：落盘锚定 sandbox/kb/ 内
  （AGENTS.md 硬性约定 3「文件工具只在 apps/server/sandbox/ 内」）；
  name/filename 白名单校验防注入（name 入盘路径段）；safePath resolve
  归一前缀校验同构复用，越界 400；单文件 5 MiB + chunk 总量上限双层限额；
  **零出站**（上传处理全程本地 fs + SQLite，guard.ts 零涉）；上传语料不出
  进程（L1 本地嵌入，无 L3 全文外送面——ADR-0020 §3 否决理由承继）。
- **性能**：索引为启动期一次性重建 + 入库后按 KB 重建（草案）；查询成本
  O(全库 chunk 数 × 平均词条数) 线性扫描——ADR-0020 §2.4 代价如实声明，
  本产品量级（10²~10⁴ chunk）毫秒级，不引入过早优化；chunk 上限防进程内
  索引爆内存。
- **等价性（最高优先验收面）**：seed 后三固定名检索输出与现状逐位一致
  （terms() 等距迁移 + retrieve() 语义不变是等价性的两根支柱）；既有
  smoke G 组等既有断言零回退。
- **文件规模**：新增源文件各 ≤400 行（AGENTS.md 硬性约定 4；ADR-0020 §6
  预算 kb/store.ts ~150-200 行）。

## 验收标准（Given/When/Then；VERIFY 逐条执行）

- **AC1 上传正例**：Given 服务已启动且 KB 仓储已 seed，When 以合法 name +
  filename=xx.md 的纯文本 body POST /api/v1/kb/:name/documents（≤5 MiB），
  Then 响应 2xx 且出参含 chunk 计数，且 `apps/server/sandbox/kb/<name>/`
  落盘原始文件可核、DB documents/chunks 行数与出参一致。
- **AC2 上传负例**：When 分别以 ①超 5 MiB body ②filename=xx.pdf（白名单外）
  ③name 含非法字符 / 路径越界形态 ④空文档（零 chunk）请求，Then 依次
  413 / 415 / 400 / 400，响应 `{ error: … }` 形态，且 DB 与落盘零残留。
- **AC3 kb 清单端点**：Given seed 三固定名 + ≥1 个上传新库，When GET
  /api/v1/kb，Then 恒 200，kbs 数组含全部库名与 docs/chunks/updated_at
  计数，且与 DB 实况一致（无 4xx/5xx 路径——索引派生只读，capabilities
  同构）。
- **AC4 seed 等价性回归（零漂移硬边界）**：Given 改造前后同版本服务，When
  对三固定名各跑同一组查询（含命中与未命中），Then retrieve() 输出
  （score/src/text 逐字段）与改造前逐位一致；既有 smoke 断言组全绿零回退。
- **AC5 新语料可检索**：Given 已上传新文档入库，When 对其内容构造查询经
  retrieval 链（handler 层面或端点层面），Then 命中入库片段（src 指向
  上传 filename），kbNames() / 清单端点均含新库名。
- **AC6 门禁回归面**：When 工作树内跑 `npm run build` + `npm run gate` +
  `npm test` + `npm run smoke:server`（扩断言后），Then build exit 0、
  gate 既有 20 场景（s0~s19，本会话 `ls tests/golden/ui/*.invariants.json`
  亲数）零波及全 pass、npm test 30/30、smoke ≥ 基线 157 且新增 KB 断言组
  全绿；零 gate:update（本机 s3 抖动按 issue#12 纪律处置，CI 权威）。
- **AC7 零改动面机器证明**：When `git diff` 检查禁区（packages/shared /
  apps/web / tools/pixel-gate / .github / package*.json / lock），Then 恒空
  ——零 DEFS、零前端、零新依赖、零新 env（config.ts）、零出站（guard.ts
  零涉）的机器证明。
- **AC8 手动 E2E 点位（SPEC 轮定稿）**：上传文档 → kb 清单出现 → retrieval
  命中入库片段全链点位（ADR-0020 §7 验收口径钦定；点位细化归实施 SPEC）。
- **AC9 反转护栏（过程验收）**：BUILD 全程未触 ADR-0020 §8 任一反转项；
  若触即按护栏中止转 needs-approval，本迭代按回滚处理（JOURNAL 留痕）。

## 依赖关系与实施序

- 前置：BK-0060（SPEC 先行轮，ADR-0020）——已 done（迭代 0059，产品提交
  acd3973，BACKLOG BK-0060 行在案）。无其他前置；无批复等待项。
- 实施序：单迭代承载（ADR-0020 §7 钦定：管道四段 + kb 清单端点 + seed 同轮
  落地）；**M 项 → SPEC 轮跟随**（skipSpec=false）：受影响文件清单终稿、
  DDL 终稿、切分参数终值、端点出参字段终值、smoke 断言 ID 编排、手动 E2E
  点位均归实施 SPEC（沿 ADR-0020「终稿归实施 SPEC」纪律）。
- 验收命令口径：`npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server`（扩断言）+ 手动 E2E（AC8）。
- 解阻下游：kb 清单端点段落地即满足 BK-0047 行内「至少其 kb 清单端点承载段
  落地」实施顺序约束 → BK-0047 归后续 PLAN 轮随链晋升（issue#6 链，修宪轮）。

## 状态与回执

- 来源 T5 无 issue → 无回执义务；itemContinues=false（无姊妹子项挂本轮）。
- BK-0045（占位禁选项）状态不变：failed + 熔断等用户裁决，本轮零触碰。
- STATE：item=BK-0019、phase=PLAN（随本 PRD 落盘）。
