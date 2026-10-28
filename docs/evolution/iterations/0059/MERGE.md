# 迭代 0059 · MERGE — 合并仲裁记录（BK-0060 KB 管道嵌入存储选型 SPEC 先行）

> 产物角色：merge-arbiter · 2026-10-28 · 主干 main · 消费方：CLOSE 记账
> 输入：feat/0059-iter（b90f56f）· 迭代目录 docs/evolution/iterations/0059/（PRD/JOURNAL/REPORT 随分支合入，本 MERGE.md 与 evidence/ 由合并轮在主干新建）
> 本轮重录轮：**否**（纯文档轮，golden 零波及；合并轮**未执行** gate:update）

## 1. 合并结果

| 项 | 值 |
| --- | --- |
| 合并方式 | `git merge --no-ff feat/0059-iter`（主干工作区干净：`git status` nothing to commit） |
| 分叉状态 | merge-base `0327566` = 主干 HEAD，**零分叉**，纯快进载荷（与 0055/0057 同型） |
| 合并提交 | **`dab1278`**（全值 `dab1278fe23cf23680a88801cff865882e14dd70`，双亲 0327566 + b90f56f）`merge(evolution): 合并迭代 0059 BK-0060 BK-0019 拆分 SPEC 先行：KB 管道后端嵌入存储选型（SQLite 向量扩展 vs 独立库 vs 纯表扫描）+ 上传/切分/嵌入/入库管道与 kb 清单端点定界 + ADR 草案` |
| 冲突文件 | **无**（分支为 main HEAD 直接后代，合并面零冲突；STATE.md / metrics.md 分支侧零改动，未进冲突面） |

**分支形态**（两提交，产品/机制件分离干净）：

| 提交 | 性质 | 内容 |
| --- | --- | --- |
| `acd3973` 产品提交 | docs(adr) 单路径 | `docs/adr/0020-kb-pipeline-embedding-storage.md` **+288/−0** |
| `b90f56f` 机制件提交 | docs(evolution) | BACKLOG.md BK-0019 行定界回写（+1/−1，ADR §7 权威字面量）+ iterations/0059/{PRD 298 / JOURNAL 208 / REPORT 195} |

**OBS-001 后验（REPORT 建议的机械复核，本合并轮已做）**：`git show --numstat acd3973` =
恰 `docs/adr/0020-kb-pipeline-embedding-storage.md` 一路径 **+288/−0**——与 VERIFY 预期
逐字一致，产品提交面闭环。**零产品代码**：合并 diff 不含 apps/ packages/ tools/ tests/
任何路径（纯文档轮，5 文件 +990/−1）；无 npm 依赖变化、无 golden 变化、无 env 变化。

**验收输入**：REPORT.md 存在且结论 **PASS · 零 BUG**（AC1~AC7 全过 + 交互回归抽查过，
18 组锚点指针亲核无一杜撰；smoke 157/0 与 0057 基线零漂移）。

## 2. 主干端到端复测（全部本会话实跑，日志在 evidence/）

| # | 命令 | 退出码 | 结果 | 日志 |
| --- | --- | --- | --- | --- |
| R1 | `npm run build` | **0** | shared tsc + web vite ✓（72 模块，dist/index.html 717.58 kB，built in 1.01s） | `evidence/build.log` |
| R2 | `npm run gate` | **0**（复跑） | **首跑单场景抖动，复跑全绿**：首跑仅 s3-library 红（diffPx=21），其余 19 场景 pass 且**全部 20 场景 DOM 不变量逐键全过**（无任何 `DOM不变量变化` 标记，输出格式见 gate.mjs:658）——逐项命中 issue #12 已知抖动口径（仅单场景像素红 + 不变量全过 + diffPx 在 21~23 区间）→ 按口径复跑一次并双留档，**复跑 20/20 场景 pass、diffPx 全 0、「宪法门禁：通过 ✓」**，以复跑为准判过；`tests/golden/diff/` 零残留；主干未重录 golden（本轮非重录轮） | `evidence/gate.log`（复跑）+ `evidence/gate-first-run.log`（首跑） |
| R3 | `npm test` | **0** | 契约测试 **30/30**（节点注册表 21 种、DEFS 默认值 44/44、NODES 快照常驻比对 21 键全量、D===R 目录集一致、README 生成器幂等回比、HANDLERS ⊇ NODES） | `evidence/test.log` |
| R4 | `npm run smoke:server` | **0** | 后端 E2E **157 passed / 0 failed**（M02-M17 工具面 / W-N-CAP 路由与清单 / S-R-D 流程与审批 / G 会话 / V 互审 / A 智能体 / T-O-J 呈现节点 / B 工作台 / PT 终端 / Z 崩溃恢复 / C 清理零残留；与 0057 基线 157/0 零漂移） | `evidence/smoke.log` |

复测环境：win32 / Git Bash / Node v24.21.0，主干 main @ dab1278（合并提交后即时执行）。

## 3. 证据清单（docs/evolution/iterations/0059/evidence/）

| 文件 | 内容 |
| --- | --- |
| `build.log` | build 全绿（R1 定档，exit 0） |
| `gate-first-run.log` | gate 首跑：仅 s3-library 红 diffPx=21、不变量全过（issue #12 抖动形态，R2 复跑依据） |
| `gate.log` | gate 复跑 20/20 全绿 diffPx=0（R2 定档，exit 0） |
| `test.log` | 契约测试 30/30（R3 定档，exit 0） |
| `smoke.log` | 后端 E2E 157/0（R4 定档，exit 0） |
| `01-initial.png` ~ `04-library.png` + `manifest.json` | `node .zcode/tools/wt.mjs evidence apps/web/dist <本目录>` 采集的 4 张确定性截图（1600×900、渲染节点 19、逐张 sha256：01-initial 76884 B / 02-node-selected 91689 B / 03-settings 94615 B / 04-library 118752 B；manifest capturedAt 2026-10-27T23:59:26Z） |

## 4. 遗留与后续

- **CLOSE 记账口径**（依 REPORT「CLOSE 就绪核」，终态由协调者在合并锁内落）：
  BK-0060 置 done（来源 T5 无 issue → 无回执义务）；BK-0019 维持 proposed、晋升条件就位
  （BK-0060 CLOSE 且推荐案零反转 → 无批复等待项，ADR-0020 §8 明文）；BK-0047 维持
  proposed 待链晋升。metrics 行建议：result=done / gate=20 场景（首跑抖动按 issue #12
  口径以复跑为准）/ test=30/30 / smoke=157/0 / 行数差=+288 / bug=0。
- 合并提交与证据产物均未推送（仲裁员不 push；CI `ui-constitution` 推送后以 CI 为权威）。
- 选题占位 `.zcode/locks/items/BK-0060` 随 CLOSE 释放（本轮持有方）。

## 5. 结论

合并零冲突（分支为 main HEAD 直接后代，merge-base=0327566）；产品提交面经 numstat
后验恰一 ADR 文件 +288/−0（OBS-001 闭环）；主干四项复测全绿——build exit 0 / gate
复跑 20 场景 diffPx 全 0（首跑 s3-library diffPx=21 系 issue #12 已知抖动，按口径双留档
以复跑为准）/ test 30/30 / smoke 157/0；证据齐备（5 日志 + 4 截图 + manifest）。迭代
0059 成果已完整并入主干：合并提交 `dab1278`。
