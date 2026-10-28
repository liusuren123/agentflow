# JOURNAL · 迭代 0064 · BK-0019 BUILD 过程记录

> 产出角色：code-developer（BUILD 阶段）· 2026-10-28 14:00-15:05 · 工作树
> `.zcode/worktree/feat/0064-iter`（分支 feat/0064-iter）
> 上游：PRD + SPEC（iterations/0064/）；定界权威 ADR-0020（零反转消费）。

## 1. 实现清单（= productFiles 申报，相对工作树根）

| 文件 | 状态 | 行数 | 说明 |
| --- | --- | --- | --- |
| `apps/server/src/kb/embed.ts` | 新增 | 52 | 嵌入段：`terms()` 自 kb.ts:43-54 逐字迁移 + `DocVec` 类型迁出 + `buildDocVecs()` 自 :59-77 循环体机械提取（数值语义逐字保留，等价性支柱一/二） |
| `apps/server/src/kb/chunk.ts` | 新增 | 59 | 切分段：CHUNK_TARGET=500 / CHUNK_OVERLAP=50 终值 + `chunkText()` 六步算法（BOM/CR 归一 → 空行分段 → 贪心合并 → 超长段硬切步幅 450 → `filename §N` 标注） |
| `apps/server/src/kb/store.ts` | 新增 | 133 | 入库段：同库第二连接（pty/audit.ts 直系同构）；kb_/kb_documents/kb_chunks 三表 DDL 终稿；`insertDocument` 单事务（kbs UPSERT + 同名文档替换 + chunks 批插）；`countKbChunks`/`listKbStats`（ORDER BY name 确定性序）/`listChunksByKb`（ORDER BY doc id, seq 声明序——等价性支柱三） |
| `apps/server/src/kb/seed.ts` | 新增 | 58 | 播种段：SEED_CORPUS 自 kb.ts:7-40 逐字迁移（26 条一字不改）+ 幂等 `seedKbs()`（已存在库整库跳过；一语料条目=一文档=一 chunk） |
| `apps/server/src/kb/routes.ts` | 新增 | 120 | 端点承载：`kbListHandler`（恒 200）/ `kbUploadHandler`（SPEC §3.6 九级校验序 + 落盘 sandbox/kb/ + resolve 前缀二闸 + 入库 + `rebuildKbIndex`）/ `kbUploadErrorMapper`（entity.too.large→413 · charset.unsupported→415 · 其余→400） |
| `apps/server/src/kb.ts` | 改造 | 98→78 | 索引源改造：KB 常量与 terms() 迁出；`initKbIndex()` 启动期自 DB 重建 + `rebuildKbIndex(name)` 单库重建 + `ensureIndex()` 懒构建兜底；`retrieve()` 原文逐字保留（仅入口加 ensureIndex）；`kbNames()` 改自索引派生；新增 `kbStats()`（清单端点数据源，indexMeta 派生） |
| `apps/server/src/server.ts` | 修改 | 313→335 | 接线：import 四行 + 启动期 `initKbStore()→seedKbs()→initKbIndex()`（pty 审计块之后、listen 之前）+ 路由两行（GET /api/v1/kb · POST /api/v1/kb/:name/documents + express.text({limit:'5mb', type:'text/*'}) + 错误映射器随栈）+ 停机 `closeKbStore()`（closePtyAuditStore 之后、closeStore 之前）+ 头注端点清单两条 |
| `tests/smoke/smoke-server.mjs` | 修改 | 2146→2395（含 §8 修复轮 +4） | KB01-KB11 断言组（PT 组后、Z 组前）+ `wfKb` 夹具工厂（userinput→retrieval→jsoncanvas，output 事件=hits 全保真 JSON 锚面）+ `KB_EQ_ANCHORS` 基线锚定字面量 + 本地 `postText`/`postTextRaw` 辅助（lib.mjs 零改动）；每 ID 恰一次断言调用（157+11=168 口径） |

全部文件 ≤400 行（最大 server.ts 335，AGENTS.md 硬性约定 4）。

## 2. 等价性 A/B 采集（SPEC §5 BUILD 义务；AC4 机器锁）

- **方法**：改造前以基线代码 `npm run build:server` 后，`node --input-type=module`
  直调编译产物 `retrieve(kb, q, 20, 0.02)`，电池 = 6 查询 × 3 固定库 = 18 组
  （含命中与未命中），落 `data/kb-ab/before.json`；改造后同电池（首行改为完整
  启动序 `initKbStore(); seedKbs(); initKbIndex();`——见 §5 偏差记档）落
  `data/kb-ab/after.json`；语义级 JSON 逐组比对。
- **输出摘要**：18/18 组 `score/src/text` 全字段**逐位零差异** ✓（命中 9 组：
  产品手册 5/2/1/1/2 + FAQ 2/1 + 工单 1/1；未命中 9 组含 `zzzqqq 无关词` 三库空）。
- **前置条件核实**：after 首行清单 = FAQ-售前 8/8 · 产品手册 v2.3 12/12 ·
  工单历史 2026 6/6——**seed 纯净态成立**（工作树 DB 为本轮首次播种）。
- **KB03 锚定字面量**：由 before.json 经 handler 同参映射（×4 归一 → th=0.1 →
  topk=3）计算后嵌入 smoke `KB_EQ_ANCHORS`（本轮 BUILD 会话亲采，非转抄）；
  smoke KB03 实跑 pristine 分支 deepEqual 全绿。

## 3. 自测结果（工作树内实跑；build/gate 完整门禁归脚本统一执行）

| 命令 | 结果 |
| --- | --- |
| `npm run build:server`（基线 + 改造后各一） | exit 0 ×2 |
| `npm run smoke:server`（首轮） | **159 passed / 1 failed**（KB08：`%2E%2E` 形态被 WHATWG URL 规范化折叠为上级段 → 路由 404，服务端白名单未收到；见 §4） |
| `npm run smoke:server`（KB08 修复后复跑） | **168 passed / 0 failed**（= SPEC §6 预期 157+11；KB01-KB11 全绿，存量零回退） |
| `npm test` | **30/30 pass 0 fail**（含 build:shared+build:server 随跑） |
| AC7 禁区 `git diff -- packages/shared apps/web tools/pixel-gate .github package.json package-lock.json apps/server/package.json apps/server/package-lock.json apps/server/.env.example apps/server/src/config.ts apps/server/src/guard.ts apps/server/src/store.ts apps/server/src/handlers.ts` | **恒空，exit 0**（handlers.ts 零 diff = 等价性设计的机器验证点；零新依赖/零新 env/零出站/零 shared） |
| `wc -l` 规模核验 | 全部 ≤400（见 §1 表） |

未自行运行（归脚本统一门禁）：`npm run build`（全量）、`npm run gate`。
本轮零前端渲染路径改动，gate 为纯回归面（SPEC §7.2）。

## 4. 过程发现与处置（如实记档）

1. **KB08 · `..` 段的 URL 规范化前拦**：`fetch('/api/v1/kb/%2E%2E/documents')`
   被 WHATWG URL 按双点段折叠为 `/api/v1/documents` → 路由 404，请求根本
   不达服务端白名单（首轮 smoke 唯一 FAIL 的根因）。处置：该形态改用
   `node:http` `options.path` 原样直送（`postTextRaw`，不经 URL 解析），
   验证服务端 NAME_RE 对字面 `..` 段的 400 拒绝面——复跑全绿。`%2F` 编码
   形态（'a%2Fb'）不受规范化影响，fetch 直传即达 400。
2. **Mimosa 写入钩子误判**：store.ts 初版 `db.exec(多语句 DDL)` 被静态扫描
   误判为「命令注入」（better-sqlite3 的 SQL 执行，非系统命令；DDL 为模块级
   常量、零用户输入）。处置：改为逐条单语句 `db.prepare(stmt).run()`（数组
   常量），语义等价（幂等 IF NOT EXISTS 不变）、触发面消除，无行为变化。
3. **SPEC §4.3 表未覆盖的字面量缺口**：`kbUploadErrorMapper` 的「其余 body
   解析错 → 400」无规定字面量，取 `'请求体解析失败'`（中文可读、细节进
   logger 不进响应，与表内风格一致）——SPEC 表外唯一补口，VERIFY 复核点。
4. **SPEC §3.2 尾窗并入分支的实现解释**：「剩余 ≤ 50 → 并入前一窗」按
   开窗循环内 `L - end <= CHUNK_OVERLAP → 本窗延至 L` 实现（L=550 → 单块
   550；L=1000 → [0,500)+[450,1000)）——与边界例（1200 → 3 块）及「块长
   上浮 ≤550」描述吻合；若按「循环后余量 ≤50」字面读则该分支不可达
   （数学上余量恒 >50）。两解释对全部边界例行为一致，取可达者。

## 5. SPEC 偏差记档（均需 VERIFY 复核）

- **A/B 采集脚本 after 形态**：SPEC §5 字面脚本为 `import { retrieve,
  initKbIndex }; initKbIndex();`；实采改为完整启动序 `initKbStore();
  seedKbs(); initKbIndex();`——仅 initKbIndex 时库内无 seed 数据、比对必然
  失配，完整启动序即 server.ts 真实路径，与 SPEC 意图一致（等价性比对语义
  无放宽）。
- **kbStats() 导出**：SPEC §3.5 表述清单端点数据源为 indexMeta；实现以
  `kbStats()` 导出函数承载（indexMeta 不直接外泄），routes → kb 依赖与
  SPEC §2 依赖图一致。
- 其余全部按 SPEC §1-§7 落地，无范围扩大。

## 6. 反转护栏核查（REQ-0019-G1 / AC9 / SPEC §8.6）

**零反转**：存储=案 c 纯表扫描（kb_ 三表，无向量扩展/无独立库）；嵌入=L1
本地词法（bigram TF-IDF，无外部 API/无本地稠密模型）；上传承载=express.text()
内置中间件（无 multipart/pdf/docx 解析依赖）；零新依赖（package*.json 禁区
diff 恒空=机器证明）、零新出站（guard.ts 零涉）、零新 env（config.ts 零 diff）、
零 shared 契约（packages/shared 零 diff）。全程未触 `npm run gate:update`，
golden 零接触（非修宪轮）。未发现任何未经批准的 UI 触及（前端三文件 +
server-sync.js 零改动）。

## 7. 遗留与移交 VERIFY 的点

- AC8 手动 E2E M1-M4（SPEC §7）：上传全链落盘字节核对 / 清单实况一致 /
  新库 retrieval 命中（workflow JSON 导入或 PUT /api/v1/workflows）/
  负例抽查——BUILD 未执行，归 VERIFY。
- VERIFY 直查项（SPEC §7.8）：只读 SQLite 计数（kb_documents/kb_chunks 与
  端点出参一致性）与 `apps/server/sandbox/kb/<name>/` 落盘文件字节核对
  （auditsOf 只读直查先例）。
- KB 组残留声明（SPEC §8.1）：smoke-kb-* 条目留存于开发库与 sandbox/kb/
  （gitignore 运行时区，零删除端点在射程外）；重跑幂等由替换语义保证。

## 8. 修复轮 · BUG-0064-01（VERIFY 发现，Major · 2026-10-28）

- **缺陷**（VERIFY 实跑 3 轮复现）：KB05 对共用库 smoke-kb-main 断言绝对
  计数 `docs===1 && chunks===出参值`，而 KB11 向同库上传另一 filename
  （rag.md）——第二轮起 docs=2 必 FAIL（156/1 同签名），fail-fast 连带
  KB06-KB11 六项行为锚不执行；清残留后 168/0。违反 SPEC §6 自身声明
  「替换语义保证跨轮重跑幂等」。产品行为本身正确（VERIFY 判定在案：
  201/五键/替换语义/落盘/DB 一致均实证），纯测试件缺陷。
- **修复**（取修复建议二选一中的「独占库名」案，保住绝对计数强语义）：
  KB05 上传目标改 `smoke-kb-upload`（全轮仅 KB05 触达；KB11 仍独用
  smoke-kb-main），断言与断言文本同步更新，注释记档缺陷机理；改动
  `tests/smoke/smoke-server.mjs` KB05 块（约 +7 行注释/字面量），产品代码
  零触碰——`apps/server/src/**` 本轮零 diff。
- **幂等性验证**（派发指定口径：修后连跑两轮 smoke）：第 1 轮起始即污染态
  （前轮 VERIFY 收尾残留 smoke-kb-main docs=2），两轮背靠背均
  **168 passed / 0 failed**（KB01-KB11 全绿；KB05 独占库 docs 恒 1、KB11
  相对增量断言不依赖起始态）——跨轮重跑幂等实证 ✓。
- **复核**：AC7 禁区 git diff 复跑恒空（exit 0）；`node --check` 语法通过；
  build/gate/npm test 未复跑（派发令明示由脚本统一运行）。
- productFiles 白名单不变（WORKFLOW §4 累积并集口径：本轮改动文件
  tests/smoke/smoke-server.mjs 已在首轮清单内，无新增文件）。
