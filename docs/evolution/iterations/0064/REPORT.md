# REPORT · 迭代 0064 · BK-0019 知识库管理管道后端 · VERIFY 验收报告

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-28 · 工作树
> `.zcode/worktree/feat/0064-iter`（分支 feat/0064-iter，所有命令均在该目录执行）
> 上游：PRD 验收标准 AC1-AC9 + SPEC §7 验收口径 + §5 等价性设计 + §6 smoke 编排。

## 结论

**PASS（修复轮 1 复验通过，2026-10-28 二次 VERIFY）**

- **产品代码（服务端管道行为）九项验收实质全部通过**：上传正例/负例、清单端点、
  seed 等价性（独立 A/B 18 组逐位零差异）、新语料可检索、零改动面机器证明、
  手动 E2E M1-M4、反转护栏——证据见下文逐条。
- 首轮 VERIFY（2026-10-28 16:10）曾判 **FAIL×1**：BUG-0064-01（smoke KB05
  断言重跑不幂等，Major）。BUILD 修复轮采纳建议①（KB05 改独占库名
  `smoke-kb-upload`，纯测试件改动、产品代码零触碰——行数 52/59/133/58/120/78/335
  与首轮逐一相同复核在案）。**二次 VERIFY 独立复验**：污染态起始（DB 实况
  `smoke-kb-main docs=2` 恰为原缺陷触发条件）背靠背两轮
  `npm run smoke:server` 均 **168 passed / 0 failed**；AC7 禁区 diff 复跑恒空
  （exit 0）；终态直查 `smoke-kb-upload` 两轮重传后仍恰 docs=1（替换语义 →
  绝对计数断言跨轮恒真）。幂等性恢复，SPEC §6 声明兑现——缺陷关闭，复验
  证据全记录见文末「修复轮复验（VERIFY-2）」。

## 环境与方法

- Node v24.21.0（health 输出在案）· win32 · Git Bash · 工作树内实跑。
- build / gate / npm test 由脚本统一在工作树内运行且通过（派发令在案，VERIFY
  未重复执行全套，下文相关项标注「脚本运行」）；**smoke:server 与全部针对性
  E2E 由 VERIFY 本会话实跑**。
- 基线对照物：`git show main:apps/server/src/kb.ts`（md5
  `3891f856da144d1fc7f07bdbce568784`，转译用副本字节一致）。

## 逐条验收结果（AC1-AC9）

### AC1 上传正例 — PASS

- **M1 实跑**（node fetch，等价 SPEC curl 契约）：`POST /api/v1/kb/我的产品库
  /documents?filename=manual.md`（body=`docs/ai-sdk-7-功能汇总.md` 全文，
  text/plain; charset=utf-8）→ **201** `{"ok":true,"kb":"我的产品库",
  "filename":"manual.md","bytes":13836,"chunks":32}`（恰五键）。
- 落盘核对：`apps/server/sandbox/kb/我的产品库/manual.md` 与源文件
  **13836B 逐字节一致**（Buffer.compare=0）。
- DB 一致性：清单出参「我的产品库 1/32」与只读 SQLite 直查**逐行全等**
  （§7.8 面，见 AC3）。
- smoke 佐证：KB05 干净态全绿（201/五键/清单一致）。

### AC2 上传负例 — PASS

- smoke 干净态实跑：KB07（.pdf/.docx/application-json → **415×3**）、KB08
  （name 含 `/`、name=`..`（http 原样直送形态）、name 65 字、filename 缺失、
  `../x.txt` 形态 → **400×5** + 清单零残留）、KB09（5MiB+1KiB → **413**，
  错误映射器路径）、KB10（空 body/纯空白 → **400×2** 同字面量 + 零残留）全绿。
- M4 抽查：filename=spec.pdf → 415「不支持的文件类型：仅允许 .txt/.md/.csv/.json」；
  name=a/b → 400「知识库名非法：…」（字面量与 SPEC §4.3 总表逐字一致）。
- 边界如实声明：单 KB chunk 上限 413 不在 smoke（SPEC §8.2 既定边界）；实现面
  routes.ts:71-74（INSERT 前 SELECT 计数）+ KB_CHUNK_LIMIT=10000 源码读核在案。

### AC3 kb 清单端点 — PASS

- KB01（干净态实跑绿）：恒 200、顶层恰一键 `{kbs}`、每行恰四键且类型/非空
  如契约、两次调用 deepEqual、行序 name 码点升序。
- M2 实跑：kbs 含三固定名（8/8、12/12、6/6）+ 新库「我的产品库 1/32」。
- **§7.8 VERIFY 直查**：只读 SQLite（`kbs`/`kb_documents`/`kb_chunks` 聚合）
  与 `GET /api/v1/kb` 出参**逐行 JSON 全等**（含 updated_at）。

### AC4 seed 等价性回归（零漂移硬边界）— PASS（VERIFY 独立复核，非转抄 JOURNAL）

- **逐字迁移机械比对**（process substitution diff，对照 main 基线）：
  ① seed 语料（main kb.ts:8-39 vs seed.ts:11-42）**diff=0 逐字一致**；
  ② terms()（main :43-54 vs embed.ts:14-25）仅 `export` 关键字差异，函数体一致；
  ③ retrieve()（main :82-96 vs kb.ts:62-76）**diff=0**（kb.ts:61 仅新增
  `ensureIndex()` 入口行，打分语义逐字不变）；④ buildDocVecs 数值行
  （df/N/idf/w/norm/`||1` 兜底/`Math.log` 形态）与原索引构建循环逐行一致。
- **A/B 电池独立重采**：main 基线 `git show` → `.mts`（md5 与源一致）→ 仓内
  tsc 转译 ESM → `retrieve(kb,q,20,0.02)`；电池 6 查询 × 3 库 = 18 组（含命中
  与未命中）。改造后 = 工作树 dist 完整启动序（initKbStore→seedKbs→initKbIndex）。
  **diff = 18/18 组 score/src/text 逐位零差异**（命中 9 / 未命中 9；样例
  「产品手册 v2.3|退货政策 7 天」首条 `{score:0.1253,src:退货政策 §2.1,…}`）。
- 前置条件核实：三固定名恰 12/12 · 8/8 · 6/6 = seed 纯净态（DB 直查在案）。
- smoke 佐证：KB03 pristine 分支对 KB_EQ_ANCHORS deepEqual 全绿、KB04 未命中
  三库空 + confidence=0（干净态实跑）。

### AC5 新语料可检索 — PASS

- **M3 实跑**（POST /api/v1/run，userinput→retrieval(kb=我的产品库,th=0.05)→
  jsoncanvas，SSE 事件流消费同 lib.mjs 机理）：查询「框架绑定 独立包」→
  run ok=true、**hits=3、首条 score=0.99 · src=`manual.md §2`**（src 指向
  上传 filename，AC5/US-1 全链成立）。
- `kbNames()`/清单含新库名：电池脚本 stderr 实证
  `kbNames=["FAQ-售前","smoke-kb-chunk","smoke-kb-main","产品手册 v2.3","工单历史 2026"]`。
- smoke KB11（rag.md 上传→命中≥1 首 src=`rag.md §1`→重传替换：201、docs 不增、
  旧特征串零命中、新特征串命中）干净态全绿。

### AC6 门禁回归面 — FAIL（唯一不满足项，缺陷见 BUG-0064-01）

| 命令 | 结果 | 执行方 |
| --- | --- | --- |
| `npm run build` | exit 0 | 脚本（派发令：已通过；VERIFY 未复跑） |
| `npm run gate` | 既有 20 场景全 pass | 脚本（派发令：已通过；本轮零前端改动，纯回归面；零 gate:update） |
| `npm test` | 30/30 | 脚本（派发令：已通过；shared 零 diff=契约面零漂移机器证明之一） |
| `npm run smoke:server` | **污染态 ×2：156/1（KB05 FAIL）；干净态：168/0** | **VERIFY 实跑 ×3** |

- 三轮 smoke 时间序：①BUILD 已跑过一轮（工作树 DB 留下 smoke-kb-main=
  {sample.md, rag.md}）→ ②VERIFY 第 1 轮 **156 passed/1 failed**（KB05；
  fail-fast 使 KB06-KB11 未执行）→ ③第 2 轮同签名复现 → ④仅清除
  smoke-kb-* 残留（SPEC §8.1 声明的可弃运行时残留；删除范围严格限定
  `kb_name LIKE 'smoke-kb-%'` 的三表行 + sandbox/kb/smoke-kb-* 目录，
  删计量 chunks=6/docs=4/kbs=2 在案）→ **168 passed / 0 failed**（=157
  存量零回退 + KB01-KB11 全绿，与 SPEC §6 预期一致）。
- 存量 157 断言组三轮均零回退（fail-fast 轮亦然）。

### AC7 零改动面机器证明 — PASS

- VERIFY 实跑 SPEC §7.5 原样命令：
  `git diff --exit-code -- packages/shared apps/web tools/pixel-gate .github package.json package-lock.json apps/server/package.json apps/server/package-lock.json apps/server/.env.example apps/server/src/config.ts apps/server/src/guard.ts apps/server/src/store.ts apps/server/src/handlers.ts`
  → **exit 0 恒空**。零 DEFS、零前端、零新依赖、零新 env、零出站、
  handlers.ts 零 diff（等价性设计机器验证点）、store.ts 主仓储零改动。
- `git status --porcelain`：改动恰为 kb.ts / server.ts / smoke-server.mjs /
  STATE.md（过程件）+ 未跟踪 apps/server/src/kb/ 与 iterations/0064/——无清单外文件。

### AC8 手动 E2E 点位 M1-M4 — PASS

- **M1**：201 + chunks=32；落盘 13836B 逐字节一致（见 AC1）。
- **M2**：清单含「我的产品库」与三固定名，计数与 DB 实况一致（见 AC3）。
- **M3**：新库命中 `manual.md §2`（score 0.99）；同场回归 kb='产品手册 v2.3'
  查「退货」→ hits=2，srcs=[退货政策 §2.1, 退货政策 §2.5]（与基线语料命中面
  一致；RETRIEVAL 参数同参形态已由 AC4 电池在 retrieve() 层逐位锁定）。
  承载方式说明：经 `POST /api/v1/run` 内联 workflow（与 SPEC §6 自身 smoke
  编码同一条 run 引擎消费路径，等价于「workflow JSON 导入后运行」）；
  DEFS combo 仍三固定名、下拉选不到新库**非缺陷**（BK-0047 修宪轮射程，PRD 在案）。
- **M4**：pdf→415 / a%2Fb→400，错误信息中文可读（见 AC2）。
- 服务拉起方式与 smoke 同构（`node apps/server/dist/server.js` + 独立端口 +
  空 BOCHA_API_KEY/SEARXNG_URL）；health 200 在案。KB 链全程零模型调用、零出站。

### AC9 反转护栏（过程验收）— PASS

- 机器证明（AC7 面）：package*.json 零 diff = 零新依赖（无 multipart/pdf 解析）；
  guard.ts 零 diff + 代码读核零 import = 零出站；config.ts 零 diff = 零新 env；
  packages/shared 零 diff = 零契约。
- 代码读核：存储=案 c 纯表扫描（kb/ 三表，无向量扩展/独立库）；嵌入=L1 本地
  bigram TF-IDF（无外部 API/稠密模型）；承载=案甲同库第二连接（store.ts 主仓储
  零改动）。全程零 gate:update、golden 零接触、前端三文件+server-sync.js 零改动。
  **零反转成立**，与 JOURNAL §6 一致。

## 交互回归抽查

本轮触UI=否：`apps/web/**` 零 diff（AC7 机器证明）→ 交互三层（视觉/DOM/交互）
未被触及是**构造性事实**；UI 回归面由 gate 既有 20 场景（像素 0 容差 + DOM 不变量，
脚本运行全绿）承载。后端交互语义由 VERIFY 实跑覆盖：SSE 事件流（run 链
node:start/done、output、run:done 的 ok/vars.confidence 均与契约一致）、审批/
停机面沿用存量断言组（三轮零回退）。未执行画布级人工交互（无前端改动面，gate
为权威）。

## 缺陷清单

### BUG-0064-01 · Major · smoke KB05 断言重跑不幂等（违反 SPEC §6 自身声明）——**已修复，复验关闭（VERIFY-2）**

- **复现步骤**（本工作树，Node v24.21.0）：①`npm run smoke:server` 任意跑一轮
  （留 smoke-kb-main={sample.md, rag.md} 残留）→ ②再跑一轮。
- **预期**：KB01-KB11 全绿（SPEC §6「上传目标库名固定 smoke-kb-*
  （**替换语义保证跨轮重跑幂等**：同 (kb,filename) 重传即整替，计数不膨胀）」）。
- **实际**：第 2 轮起 KB05 FAIL——上传本身正确（201
  `{"ok":true,…,"bytes":241,"chunks":1}`），但清单
  `smoke-kb-main docs=2, chunks=2`（rag.md 残留 + 新 sample.md），断言
  `row.docs === 1 && row.chunks === up.json.chunks` 不成立；**fail-fast 连带
  KB06-KB11 六项行为锚（切分参数/415·400·413/空文档/替换语义）全部不再执行**，
  汇总 156 passed / 1 failed（两轮同签名复现）。
- **根因**：KB05 与 KB11 共用库 `smoke-kb-main` 但断言**绝对计数**——该断言仅
  在「库首次不存在」时为真。替换语义本身工作正常（同 filename 不膨胀，
  kb_documents 直查实证 docs 恰=两个 filename）；是**断言设计与 SPEC §6 幂等
  声明冲突**，非产品行为缺陷。
- **影响**：CI/全新 checkout 首跑绿（data/ 不入库）；但任何带 KB 残留的本地
  复跑必红 1 项并掩盖 KB06-KB11——MERGE 后主干每次 smoke 首跑过、复跑必挂，
  干扰后续迭代基线判定与周度治理全量回归。
- **定位**：`tests/smoke/smoke-server.mjs` KB05 块（`row.docs === 1` 断言行）。
- **修复建议**（任一，1-2 行，属 productFiles 内测试件改动）：
  ① KB05 改用独占库名（如 `smoke-kb-up`，上传固定 sample.md → 替换语义保证
  跨轮恒 docs=1/chunks=1）；或 ② 断言改相对增量（上传后 chunks = 上传前
  chunks + 出参 chunks）。修后须连跑两轮 smoke 证幂等。

## JOURNAL 移交点复核（VERIFY 逐项）

| 移交点 | 复核结论 |
| --- | --- |
| §4.3 「请求体解析失败」表外字面量 | 接受——SPEC §4.3 该行未定字面量，补口中文可读、细节进 logger 不进响应，与表内风格一致 |
| §4.4 硬切尾窗并入分支解释 | 接受——直调实证：550→1 块(550)、1000→[500,550] 两块、1200→[500,500,300] 三块、200+200→1 块(401)、空/纯空白→0 chunk、BOM+CR 归一正常；与 SPEC §3.2 全部边界例吻合，块长上浮 ≤550 如声明 |
| §5 A/B 采集脚本 after 形态偏差（完整启动序） | 接受——仅 initKbIndex 时无数据可比对必失配；VERIFY 独立电池同用完整启动序，18 组零差异独立证实等价性 |
| §5 kbStats() 导出替代 indexMeta 直接外泄 | 接受——依赖方向 routes→kb 与 SPEC §2 依赖图一致；kbNames/kbStats 均自索引派生（ADR-0020 §5 口径） |

## AC6 复核（修复轮后，VERIFY-2 判定面）

首轮 FAIL 判定基于「污染态复跑 156/1」。修复后 VERIFY-2 实跑：**污染态起始
（smoke-kb-main docs=2 恰为原触发条件）背靠背两轮 `npm run smoke:server`
均 168 passed / 0 failed**——AC6「smoke ≥ 基线 157 存量零回退 + KB01-KB11
全绿」在可复现口径下成立，改判 **PASS**。build/gate/npm test 维持脚本运行
通过口径（派发令在案；修复仅触测试件，不影响其有效性）。AC6 首轮证据保留
于下文缺陷条目作历史记录。

## 修复轮复验（VERIFY-2 · 2026-10-28 · 本会话实跑）

1. **修复内容核验**（Read `tests/smoke/smoke-server.mjs:2201-2222`）：KB05
   上传目标 `smoke-kb-main` → `smoke-kb-upload`（独占库，全轮仅 KB05 触达），
   断言/断言文本/注释同步更新并记档缺陷机理；KB11 仍用 smoke-kb-main 的
   相对增量断言（不依赖起始态）。与我首轮 REPORT 修复建议①一致。
2. **产品代码零触碰复核**：`wc -l` 全部与首轮验收逐一相同（embed 52 /
   chunk 59 / store 133 / seed 58 / routes 120 / kb.ts 78 / server.ts 335）；
   kb.ts `ensureIndex` 计数（7）与 server.ts `initKbStore();`（:125）位置
   抽查一致——修复仅落 `tests/smoke/smoke-server.mjs`。
3. **AC7 禁区 diff 复跑**（原样命令）：**exit 0 恒空**。
4. **幂等性判定实验**（我首轮 REPORT 指定的修复验收口径「修后连跑两轮」）：
   起始 DB 实况（只读直查）= 污染态
   `[smoke-kb-chunk 2, smoke-kb-main 2, smoke-kb-upload 1, 我的产品库 1]`
   ——`smoke-kb-main docs=2` 正是原缺陷触发条件；两轮背靠背
   `npm run smoke:server` → **第 1 轮 168/0、第 2 轮 168/0**（grep 摘要输出
   在案，零 FAIL 行）。
5. **终态直查**（只读 SQLite）：`smoke-kb-upload` 两轮重传 sample.md 后仍恰
   **docs=1**（同 filename 替换语义 → 绝对计数断言跨轮恒真）；smoke-kb-main
   docs=2（rag.md + 历史残留 sample.md 行，KB11 相对断言不受影响）；
   smoke-kb-chunk docs=2（long/short）——全部符合幂等设计。
6. **结论**：BUG-0064-01 关闭；AC6 由 FAIL 改判 PASS；九项 AC 全绿，
   迭代验收 **PASS**（repair_round=1，未超 WORKFLOW §4 上限 2）。

## 其它如实声明

- **win32 优雅停机**：M 收尾用 SIGTERM 杀子进程在 win32 为硬杀（exit=null），
  非优雅停机路径证据——与 AGENTS.md 既有平台限制一致（smoke:shutdown 本机
  SKIP、CI Linux 权威）；`closeKbStore()` 停机序以代码读核为证
  （server.ts:327-330：closePtyAuditStore → closeKbStore → closeStore，PTY
  审计同型位置）。
- **KB 组残留**：本轮 VERIFY 的 smoke 与 E2E 再次留下 smoke-kb-*/我的产品库
  条目于工作树 dev DB 与 sandbox/kb/（gitignore 运行时区，SPEC §8.1 声明射程
  外，零删除端点）；E2E 素材「我的产品库/manual.md」为 M1 契约点位所需。
- **A/B 工件**：VERIFY 独立采集件在 `data/kb-ab-verify/`（before/after JSON +
  基线 .mts 与转译产物，均 gitignore 区）。

## 验证命令台账（VERIFY 实跑）

首轮（VERIFY-1）：
1. `git diff --exit-code -- <SPEC §7.5 禁区清单>` → exit 0。
2. `diff <(git show main:apps/server/src/kb.ts | sed …) <(sed … seed.ts/embed.ts/kb.ts)` ×3 → 语料 0 差异 / terms 仅 export / retrieve 0 差异。
3. `npx tsc --module NodeNext --target es2022 … kb-orig.mts` + 18 组电池 ×2（基线/dist）→ diff 零差异。
4. `npm run smoke:server` ×3 → 156/1、156/1、168/0。
5. M1-M4 E2E 脚本（端口 3900，node fetch + SSE）：201/415/400/清单/检索命中/落盘字节全证据在案。
6. 只读 SQLite 直查（readonly:true better-sqlite3）×2：残留成分定位 + 端点出参全等。
7. chunkText 边界直调 7 例（含 BOM/CR 归一）。

修复轮（VERIFY-2）：
8. `git diff --exit-code -- <同上禁区清单>` 复跑 → exit 0。
9. `npm run smoke:server` 背靠背 ×2（污染态起始 smoke-kb-main docs=2）→ 168/0、168/0。
10. 只读 SQLite 直查（修复后终态）：smoke-kb-upload docs=1（幂等锚）等三库。

—— test-manager · 2026-10-28（VERIFY-1 16:10 FAIL×1 · VERIFY-2 复验 PASS）
