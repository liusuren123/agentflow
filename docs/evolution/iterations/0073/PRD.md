# PRD · 迭代 0073 · BK-0018 跨 run 记忆工具组（memory.get/set/list）重试轮——MEM 套件断言面修复收口

> 产出角色：product-manager（PLAN 阶段）· 2026-10-31 06:25 初稿 · 06:39 R5
> escalate 裁决后复选定稿（§1.1 五轮冲突解除存证 + JOURNAL §1 留证）·
> 隔离工作树 feat/0073-iter
> 来源：BACKLOG **BK-0018**（capability / **触UI=否** / P2 / **S** / **ready**，
> BACKLOG.md:117）——迭代 0068 失败后的**重试轮**（0033/0057/0026 同径先例），
> 成果载体 = 留档分支 **feat/0068-iter 留档提交 d5ddb27**。
> 解阻批复链 **issue#17**（ADR-0024 附录 A：新增 env 语义 ×1 MEMORY_ENABLED +
> 跨 run 持久化隐私面知悉；用户 2026-10-30 评论「批准」，0068 轮 gh 亲核在案，
> BACKLOG.md:117 行备注载「#17 获用户本人评论『批准』——转 ready 入选并实装」）。
> **触UI=否——纯后端能力重试轮，非修宪轮**：批复射程=解除 POLICY 需批准面
>（env×1 + 隐私面知悉），**不构成重录轮——golden 零接触、全程禁 `npm run gate:update`**
>（宪法第 3 条；0069 BK-0020 / 0071 BK-0014 同判先例）。
> **skipSpec=true**：S 项（非 doc、非触 UI）免独立 SPEC——受影响文件清单内嵌本 PRD
> §7，验收口径内嵌 §6/§8（实施定界以 ADR-0024 与 iterations/0068/REPORT.md 为权威蓝图）。
> 回执口径：**sourceIssue=17**；**itemContinues=false**——issue#17 系单目的批复
> issue（正文仅 BK-0018 实施批准一事，无姊妹子项；0069 issue#15 / 0071 issue#16
> 单目的先例）——**done 时 CLOSE 回执 issue#17 关单；failed 则留开放待重试**
>（届时即「连续 2 次同项 failed」熔断，见 §9）。
> **reconstitutional=false（非修宪轮）**。

## 0. 结论与分类（先行）

- **建议：做**——本轮项 = BK-0018 重试轮。0068 产品面大面积 PASS（memory 三工具
  语义/开关门控/存储承载/结构执法/capabilities 零污染/env fail-fast 全部第一手
  E2E 验证符合 PRD/ADR 定界，iterations/0068/REPORT.md §一），判红集中于**验收
  断言套件自身 6 缺陷**（BUG-0068-01~06，REPORT §二）；R1 修复轮已修 BUG-01~05
  并随留档提交保全（REPORT §6-1 逐项销红复核），唯一未竟 = **BUG-0068-06**
  （REPORT §6-3：8 处冒烟标记词缺尾冒号 → token 域塌缩）。重试范围已由协调者
  翻回 ready 时收窄并记账在 BACKLOG.md:117（详 §5）。
- **触UI 分类结论：否**。改动面 = `apps/server/src/**`（自留档分支带入，预期逐字节
  零改动）+ `tests/smoke/**`（断言面）+ `docs/adr/0024` 补记（随分支带入）+
  `.env.example` 注释行（随分支带入）。零前端、零 packages/shared、零 golden、
  零新依赖、零新增出站类别。POLICY 自主区（后端能力演进 + 测试与回归基建）；
  MEMORY_ENABLED env 语义授权随 issue#17 批复在案（需批准面已闭环）。
- **非修宪轮**：全程禁 `gate:update`；gate 首跑若 s3-library diffPx=21~23 → 按
  issue#12 已知带宽口径复跑/CI 权威处置（0068 两轮实测该抖动与本迭代零因果，
  REPORT §6-4），绝不重录。
- **单迭代承载**：无批次编排（STATE.item 本轮置 done 后不续填）。

## 1. 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-31 06:13~06:25 核实）

1. **并行占用核查与本轮冲突解除存证（五轮全程，2026-10-31 06:13~06:39；要点另录
   JOURNAL §1 供工作流侧根治）**：
   - **R1（06:23）**：`.zcode/locks/items/` 亲核为空 → 选题后按 WORKFLOW §4 原子占位
     `mkdir .zcode/locks/items/BK-0018` 实建成功（目录 mtime 06:23）。
   - **R2（06:2x）**：脚本裁定「BK-0018 已被另一并行工作流占位，本轮不能做」→
     本 PM 按裁定返回空转、零写入零改锁。
   - **R3（06:27~06:33）**：重新派发未携带占位警告（既往占用轮派发均明示，
     0070/0071/0072 PRD「派发提示在案」可证）；本 PM 四路证据复核判定 R2 系
     **自建锁误判**（与 BACKLOG.md:86 所记 0068 残留锁误导 0069~0072 四轮禁选同型）——
     ① 锁 mtime 06:23 = R1 本人 mkdir 时间戳，无他路经手；
     ② `.zcode/worktree/feat/` 全列仅 0036/0057/0064（历史保留）/0068（失败轮
     留档保留，BACKLOG.md:117「工作树保留」在案）/0073（本轮）五个，无新并行工作树；
     ③ `git branch --list "feat/*"` 仅 +feat/0068-iter、+feat/0073-iter（`+`=被
     工作树检出），无新并行迭代分支；
     ④ 0068-iter 留档工作树 `git status --porcelain` 空、HEAD=d5ddb27、
     `find apps/server/src -newermt "2026-10-31 06:00"` 零命中——无任何在途改动痕迹。
     ListWorkflowRuns 本会话不可达（capability gap，如实记录），以文件系统证据兜底。
     据此重选 BK-0018（提交被接受）。
   - **R4（06:3x）**：脚本以同一措辞再次否决 → 本 PM 空转零写入，并在结果中呈报
     循环诊断（两轮「派发无警告→选中→否决」交替与全部文件证据相悖）。
   - **R5（本轮 06:39，escalate 裁决）**：本 PM 按纪律升级，协调者两路独立证据裁决：
     ① ListWorkflowRuns（running/pending）全账本恰一条 = 本运行 dwfrun-ede78ca8
     （0073）自身——**不存在任何并行在途工作流**；② 锁 mtime 06:23（2026-10-30T22:23Z）
     落在本运行窗口内 = R1 自建——claim-item 校验读到的「占位冲突」正是本运行自己
     写的锁（自撞误判；0063 三选题自撞同族，根治提交 2c5b612 未覆盖「子代理 shell
     写锁 + 脚本侧 claim-item 校验」路径）。**授权清除该锁并重选 BK-0018 继续**
     （留证义务见 JOURNAL §1）。本 PM 已 `rmdir .zcode/locks/items/BK-0018`（06:39
     亲核删除成功）；**依裁决指示不重建锁**——该锁即 claim-item 自撞根因，重建将
     复发循环，占位语义由脚本侧接管（WORKFLOW §4 默认占位步骤经协调者明示指令豁免）。
2. **ready 队列**：`grep -n "| ready |" docs/evolution/BACKLOG.md` → 全表**恰
   1 行**：BK-0018（BACKLOG.md:117）。非终态扫描 `grep -nE "\| (proposed|ready|
   doing|blocked|pending-approval) \|"` → 恰 2 行：BK-0064（:85，proposed）与
   BK-0018。规则④常规选题唯一候选即 BK-0018（P2/S，非 doc，无前置门槛——
   env 批复与 ADR-0024 蓝图均在案）。
3. **批复同步**：档案「**approved：无；rejected：无**」→ 规则①③零建行、零解锁、
   零 skipped 改写。issue 面板 #17/#16/#12 三项 needs-approval 开放态逐一裁定：
   - **#17**（BK-0018 名下）：批复已于 0068 轮消费记账（BACKLOG.md:117 行备注），
     本轮零新动作；本轮 done 后由脚本关单收口。
   - **#16**（BK-0014 名下）：批复 0069 轮消费、BK-0014 已于迭代 0071 终态 done
     （BACKLOG.md:113），issue#16 关单回执归脚本（itemContinues=false 单目的，
     MERGE.md §6 移交在案）——面板仍挂标签属脚本回执面观察项，非 PLAN 动作面。
   - **#12**（CI 像素门禁 s3 亚像素抖动 diffPx≈23）：未获批，属 golden/
     pixel-gate/CI 需批准射程，维持待批准不自主处理（0045~0050 连续同判先例）。
4. **侦察档案裁定**（派发档案携带）：残缺标记三项均非缺陷——
   `apps/server/package-lock.json:787` 系 integrity 哈希内 "XXX" 字符误报；
   `apps/server/src/tools.ts:5` 系 stub 设计说明（「"not implemented"，不伪造结果」）
   非标记；`tools.ts:138` browser stub 系 **ADR-0011 评估终态**（近期不实施、
   维持 stub 如实降级为默认终态）非缺陷不立项（0041~0051 连续八轮同判在案）。
   悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系治理日产物，心跳不重复
   采集。**无需启用侦察补题**（ready 非空）。
5. **近 3 迭代（0070/0071/0072）在档观察排查**（iterations/ 目录 PRD 亲读 +
   BACKLOG 终态行复核）：
   - 0070（BK-0048 修宪轮，done）：REPORT §8 六项如实声明均过程级，无遗留立项点；
   - 0071（BK-0014，done）：REPORT §7 OBS-001/OBS-002 两项 Minor 已由 BK-0065
     承接、迭代 0072 治理日批处理消化终态 done（BACKLOG.md:86）——闭口；
   - 0072（BK-0065，replenished）：PLAN 补题机制件轮，其 PRD §1.5 的 **BK-0064
     延后裁定本轮继续有效并就此兑现**——BK-0064（llm.ts execute 包装器异常可
     观测性）与 BK-0018 重试轮存在负例行为语义碰撞面（重试范围含「BUG-05 选项 A
     = MEM05 期望对齐实测现状」，BK-0064 恰改写该现状），故 BK-0064 维持
     proposed 不动，**归 BK-0018 收口后下一轮 PLAN 首选**（BACKLOG.md:85 行内
     依赖注同径）。
6. **BK-0064 不选独立理由**：proposed 非 ready，规则④只可选 ready；且上述碰撞
   分析（0072 PRD §1.2 全文论证在案）在 BK-0018 未收口前不解除。
7. **READY 唯一性结论**：BK-0018 为本轮唯一合法选择，与 ROADMAP 待办节 T5-M2
   收口路径一致（§3）。

## 2. 事实校正存证（如实记录）

BACKLOG.md:117 行记留档提交「d5ddb27 恰 15 路径」；本会话
`git show --stat --oneline d5ddb27` 亲核实为 **16 路径**（.env.example +1/
config.ts +6/llm.ts +9/memory/{store.ts +115,tools.ts +82}/server.ts +5/tools.ts +5/
ADR-0024 +16−?/BACKLOG.md ±/STATE.md ±/iterations/0068/{JOURNAL +219,PRD +253,
REPORT +332}/evidence/gate-first-run.log +56/mcp-stubs.mjs +19−?/smoke-server.mjs
+298−?，合计 +1409/−19）——以 git 实查为准，BACKLOG 记法系笔误级差异不改写
（BK-0053「不回改已定稿账面」先例，本 PRD 即更正载体）。

## 3. 背景与用户价值

- T5-M2「环境感知与数据真实化」四验收项中三项已收口：扩展可发现并注册
 （BK-0014·迭代 0071 done）/ retrieval 命中真实入库文档（BK-0019·迭代 0064 done）/
  节点失败按策略降级（BK-0020·迭代 0069 done）——**唯一未竟 = 「跨 run 记忆可
  读写」（BK-0018）**。本项收口即 T5-M2 里程碑 4/4 闭合（ROADMAP.md:161-165）。
- 用户价值：智能体在跨 run 场景（如每日定时任务、多次会话）下可持久化与召回
  键值记忆（memory_get/set/list），为 T5 长期记忆能力奠基；MEMORY_ENABLED
  默认关零行为，隐私面知悉与限幅面已经 ADR-0024 附录 A 用户批复（issue#17）。
- 重试轮不是新功能轮：产品语义 0068 已第一手验证达标（REPORT §一 AC1~AC7
  产品面 PASS、AC3 跨 run 读回直证），本轮交付物是**验收载体的正确性**与
  **全套件内执行证据**。

## 4. 重试范围（权威 = BACKLOG.md:117 重试注 + iterations/0068/REPORT.md §二/§5/§6-5）

1. **产品面与断言面自留档分支带入**（checkout/cherry-pick d5ddb27 的对应路径，
   预期逐字节零改动；§7 清单）：memory 两模块、四处接线（config/llm/server/tools）、
   .env.example 注释行、ADR-0024 §4.1 行为特征补记、mcp-stubs.mjs M02 白名单式
   改法（BUG-01 修复）、smoke-server.mjs MEM 套件骨架（含 R1 已修的 memReqOf/
   memToolsOf/MEM04 trunc=false/MEM05 对齐现实）。
2. **本轮唯一手改代码 = BUG-0068-06 修复**（REPORT §6-3 行号级方案）：改标记词
   不动正则——smoke-server.mjs 全部 `wfMem` 标记 `mem:smoke:${memTok}` 补尾冒号
   成 `mem:smoke:${memTok}:`（共 **8 处**：mem02×1、mem03×2、mem04×3、mem05×2；
   mem01 标记不含该域不受影响）。键结构 `mem:smoke:<tok>:alpha` 与直查前缀
   `mem:smoke:${memTok}:` 随即自洽，MEM03/04/05 语义照旧；mock 路由
   `memTokOf` 正则 `/mem:smoke:([a-z0-9]+):/`（smoke-server.mjs:285）零改动。
3. **0068 机制件归档带入**：iterations/0068/{PRD,JOURNAL,REPORT} +
   evidence/gate-first-run.log 随分支带回归档——0068 目录在主干/本工作树缺席
   （本会话 `ls docs/evolution/iterations` 亲核：0064~0067/0069~0072 在、0068 不在），
   0057 先例「重试轮须一并补全迭代目录机制件」同径，避免失败轮史证散佚。
4. **不做范围（out of scope）**：
   - 不改 `apps/server/src/llm.ts` execute 包装器异常语义（BK-0064 专属面——
     波及全工具族失败路径，超出本项申报面；0068 REPORT §二 BUG-05 选项 B
     否决理由继续有效）；
   - 不动 golden（零 gate:update、零 pixel-gate 改动、零 tests/golden 触碰）；
   - 不新增依赖/env/出站类别（MEMORY_ENABLED 授权已随 issue#17 在案，语义零变更）；
   - 不清共享库 `mem:smoke::alpha` 孤儿行（data/ gitignore 不入库；REPORT §6-3
     已裁定「token 域断言免疫、如实记录即可」）；
   - 不修 BACKLOG.md:117「15 路径」笔误（§2 本 PRD 即更正载体）。

## 5. 用户故事（重试验收视角）

- **US-R1**（质量保障者）：Given 0068 两轮冒烟红项均有行号级修复方案
  （REPORT §二/§6-3），When 重试轮带入断言面并实施 BUG-06 修复后全套件重跑，
  Then 冒烟全绿且 MEM03~07、Z01~04 首次取得套件内执行证据——0068 的
  「fail-fast 掩盖链」就此消除。
- **US-R2**（维护者）：Given 产品面已两轮第一手验证，When 重试轮以逐字节
  带入方式复用，Then 产品代码 diff = 0 申报可机器核验（AC-R4 禁区证明 +
  行数复核），不引入新风险面。
- **US-R3**（用户）：Given 记忆工具组为 T5-M2 最后验收点，When 本轮收口，
  Then T5-M2 四项全闭合、issue#17 关单，进化循环恢复「BK-0064 下一轮首选」
  的既定队列。

## 6. 验收标准（Given / When / Then，供 test-manager 转 REPORT）

> 基线口径：迭代号 0073、工作树 feat/0073-iter、基线门禁由脚本预检（0068 失败
> 轮后主干已含 0072 机制件，基线四绿以脚本预检为准）。

- **AC-R1 · 冒烟全绿（唯一未竟验收点的闭环）**
  Given 工作树含 §7 全部带入文件且 BUG-06 的 8 处标记词已补尾冒号；
  When 在工作树根实跑 `npm run smoke:server`；
  Then exit 0、**0 failed**，且 MEM01~MEM07 与 Z01~Z04 全部在套件内执行
  （输出含各 PASS 行——MEM03~07 与 Z 组系 0068 两轮均未取得套件内证据的
  首次补证面）；M02 白名单式断言 PASS（点前缀 12 键恰等 + plain key 恰
  memory_* 三条 + IMPL 5 服务器）。
- **AC-R2 · 产品行为复证（0068 REPORT §6-4 口径复跑）**
  Given 构建产物就绪；
  When 以独立端口三态走查（默认关 / MEMORY_ENABLED=1 / MEMORY_ENABLED=abc）；
  Then 默认关：启动日志零 memory 行、主库无 memory_entries 表、capabilities
  响应与开启态 `cmp` 逐字节 IDENTICAL-BYTES 且 grep memory 零命中；开启：日志
  恰一条 memory 就绪行；abc：spawn exit=1 且 fatal problems 含 MEMORY_ENABLED
  变量名（PTY 先例形态）。
- **AC-R3 · 结构执法复跑（0068 AC7 口径）**
  When `grep -n "memory_" apps/server/src/tools.ts` 与
  `grep -rn "memory" apps/server/src/{mcp/inject.ts,agent.ts,engine.ts,
  capabilities.ts,guard.ts,store.ts}`；
  Then 前者恰 TOOL_SPECS 三行命中、后者零命中（exit 1）。
- **AC-R4 · 禁区机器证明复跑（0068 AC9 口径）**
  When `git diff -- apps/web packages tests/golden .github package-lock.json
  package.json` 与 `git status --porcelain` 同域检查；
  Then 均 0 字节/空；全程零 `gate:update`、零 golden 接触；行数预算复核
  （store 115 / tools 82 等与 0068 JOURNAL §1 申报一致）。
- **AC-R5 · 门禁四件套**
  When 脚本门禁 `npm run build` + `npm run gate` + `npm test` 与工作树内冒烟；
  Then 全绿；gate 首跑若 s3-library diffPx=21~23 → 按 issue#12 已知带宽口径
  复跑取证双留档（DOM 不变量逐键全等 + 散点坐标同位），复跑/CI 权威为准，
  **绝不消费 gate:update**。
- **AC-R6 · 提交面与机制件**
  When 分支双提交核验；
  Then 产品提交 = §7 白名单（累积并集纪律，若修复轮新增改动只增不减）；
  机制件提交含 iterations/0073/{PRD,JOURNAL,REPORT} 与 iterations/0068 四件
  归档带入；BACKLOG/STATE 过程改动随机制件。

## 7. 受影响文件清单（skipSpec 内嵌，实施 SPEC 豁免口径）

**A. 自留档提交 d5ddb27 带入（预期逐字节零改动，9 路径）**：

| 路径 | 性质 | 依据 |
| --- | --- | --- |
| `apps/server/src/memory/store.ts` | 新增（+115） | ADR-0024 §4.2（同库第二连接、store.ts 零改动） |
| `apps/server/src/memory/tools.ts` | 新增（+82） | 三工具 spec/impl，plain key 不进前端清单 |
| `apps/server/src/config.ts` | +6（MEMORY_ENABLED 白名单+zod fail-fast+映射） | 0068 AC6 第一手实证 exit=1 |
| `apps/server/src/llm.ts` | +9（:46-49 env 门控合并注入点） | ADR-0024 §4.1（绝不入 tools.ts IMPL） |
| `apps/server/src/server.ts` | +5（initMemoryStore 接线 + 停机 closeMemoryStore） | 0068 AC1 开关两态实证 |
| `apps/server/src/tools.ts` | +5（TOOL_SPECS 三行） | 0068 AC7 grep 实证 |
| `apps/server/.env.example` | +1（MEMORY_ENABLED 注释行） | 0005/0059 模板同步先例 |
| `docs/adr/0024-memory-tools-crossrun.md` | +16−?（§4.1 行为特征补记，BUG-05 选项 A） | REPORT §6-1 已销红复核 |
| `tests/smoke/mcp-stubs.mjs` | +19−?（M02 白名单式改法，BUG-01） | REPORT §二 BUG-01 修复建议同型 |

**B. 本轮手改（唯一新代码改动，1 路径）**：

| 路径 | 改动 | 依据 |
| --- | --- | --- |
| `tests/smoke/smoke-server.mjs` | MEM 套件带入 + **8 处 `wfMem` 标记词补尾冒号**（mem02×1/mem03×2/mem04×3/mem05×2） | REPORT §6-3 行号级方案；正则 ：285 零改动 |

**C. 机制件（随机制件提交）**：`docs/evolution/iterations/0073/{PRD,JOURNAL,REPORT}`
+ `docs/evolution/iterations/0068/{PRD,JOURNAL,REPORT,evidence/gate-first-run.log}`
归档带入 + STATE/BACKLOG 过程态。

**验收命令口径**：`npm run build` / `npm run gate` / `npm test`（脚本门禁）+
`npm run smoke:server`（AC-R1 本轮核心）+ AC-R2 三态走查 + AC-R3/R4 机器证明。
**禁区**：apps/web、packages、tests/golden、.github、package*.json、tools/pixel-gate。

## 8. 非功能要求

- **安全**：MEMORY_ENABLED 默认 0 零行为逐位不变；值域 1/true/yes 或 0/false/no
  之外启动 fail-fast（config zod，PTY 先例形态）；跨 run 持久化隐私面知悉与
  限幅（模块常量承载不入 env）经 issue#17 用户批复在案。
- **性能**：memory 三工具走既有工具循环预算；存储为同库第二连接惰性单例
  （0068 实测零启动开销——默认关不建表不连接）。
- **兼容**：默认关态 capabilities 响应逐字节不变（AC-R2 cmp 实证）；前端
  MCP 勾选清单零触碰（memory 不进前端清单，ADR-0024 §5.6 + M02 白名单断言
  双重守护）。

## 9. 风险与熔断提示

- **熔断提示（硬性）**：本项已 1 败（迭代 0068）。本轮若再 failed 即触发
  「连续 2 次迭代 failed 于同一 BACKLOG 项」熔断（WORKFLOW §5.4）——置
  stuck 交用户裁决，不再自主重试。
- **风险 1 · 冒烟套件次生缺陷**：MEM03~07/Z 首次全套执行可能暴露新断言缺陷
  （0068 即因 fail-fast 层层掩盖）。缓解：修复方案以 REPORT 行号级证据为锚，
  修复轮 ≤2 且 productFiles 累积并集纪律；若产品代码确需改动（与「产品面预期
  零改动」申报冲突）→ 立即停手上交协调者裁定，不顺手扩面。
- **风险 2 · s3-library 门禁抖动**：issue#12 已知形态（diffPx≈23 亚像素噪声，
  rerun 即绿/CI 为权威），0068 两轮实测与本迭代零因果（AC9 禁区零 diff 互证）。
  处置按 AC-R5 口径，绝不 gate:update。
- **风险 3 · 并行路碰撞**：经 R5 escalate 裁决，本运行即唯一在途路
  （ListWorkflowRuns 全账本恰一条），无并行碰撞面；BK-0064 延后注继续有效——
  其 0072 PRD §1.2 的碰撞论证使 proposed 项自然回避（规则④双保险）。

## 10. ADR 与契约对照（实施蓝图指针）

- **ADR-0024**（docs/adr/0024-memory-tools-crossrun.md，主干在库——本会话
  `ls` 亲核）：§2 三工具命名与限幅、§4.1 注入通道（绝不入 tools.ts IMPL）与
  行为特征补记、§4.2 DDL 五列、§4.3 断言面、§5.6 前端清单零污染。
- **iterations/0068/REPORT.md**（feat/0068-iter 分支在库，本轮 `git show` 提取
  亲读全文 332 行）：§二 BUG-01~05 行号级方案、§6-3 BUG-06 八处标记词方案、
  §6-5 复验口径。
- **issue#17 批复**（2026-10-30，gh 亲核记录在 BACKLOG.md:117）：env 语义
  MEMORY_ENABLED + 隐私面知悉授权——本重试轮零新增请批面。
