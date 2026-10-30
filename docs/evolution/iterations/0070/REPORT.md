# REPORT · 迭代 0070 · VERIFY（BK-0048 节点级 on-error 参数：NDP 新参数 + 属性面板 UI，修宪轮）

> 执行角色：test-manager（VERIFY 阶段）· 2026-10-31 · 工作树 `feat/0070-iter`
> 输入：`iterations/0070/PRD.md`（§9 Given/When/Then）+ `iterations/0070/SPEC.md`（§7 验收口径
> 含 §0 两处修正）+ `iterations/0070/JOURNAL.md`（§5/§6 留给 VERIFY 的提示）。
> 所有文件读写一律使用带 `.zcode/worktree/feat/0070-iter/` 前缀的完整路径（路径纪律 v3）。

## 0. 结论

**PASS——零产品缺陷、零修复轮。** PRD AC1~AC10 与 SPEC §7 逐条核验通过（AC8/AC9 含
如实声明的口径替代，见 §5）；手动 E2E 五点位 E1/E4/E5 实测通过、E2/E3 以 smoke 机器
断言同型承载（§4 如实声明）；golden 修宪重录「不多不少」执法全链核验通过。
BACKLOG/issue 回执中 issue#6 关单归 CLOSE 脚本（链终轮，itemContinues=false），不在
VERIFY 射程。

## 1. 验收执行环境与手段声明

- 环境：Windows 本机（win32 · Node v24.21.0，`/api/v1/health` 实证）、工作树
  `feat/0070-iter`（分支同名）、服务器 `PORT=3100 node apps/server/dist/server.js`
  （VERIFY 手动 E2E 期间自启，验收毕已停止）。
- 命令实跑项（本会话）：`npm run smoke:server`（196/0）、负清单 `git diff --stat`、
  变更集 `git status/diff --numstat`、golden 不变量 `node -e` 采样、Playwright 临时
  脚本 E2E（`$TEMP/verify0070-*.mjs`，验毕已删，未落仓库）。
- 引用脚本结论项（按派发指令「build/gate/test 已由脚本运行且通过，不要重复跑全套」）：
  `npm run build` / `npm run gate` / `npm test`。其物理痕迹经本会话交叉印证：
  ① `tests/golden/diff/` 目录被**全绿 gate 自清**（gate.mjs:709-711 全绿分支行为），
  目录 mtime **03:29:58**，晚于 golden 重录批（03:18:07）与 web dist 重建
  （apps/web/dist/index.html mtime 03:28:20）——即「重录后确认性 gate 复跑已发生且
  全绿」（JOURNAL §6.1 所记「复跑未发生」系其时点观察，后续脚本序列已补齐）；
  ② `packages/shared/dist/index.js` mtime 03:30:03（test 的 build:shared 步产物）。

## 2. 逐条验收（SPEC §7 / PRD §9 对照）

| AC | 口径 | 手段与结果 | 证据 |
| --- | --- | --- | --- |
| AC1 | 未设零漂移（硬护栏） | **PASS**。`npm run smoke:server` 本会话实跑 **196 passed / 0 failed**（exit 0）——既有断言全量零回退（隐式哨兵矩阵：既有用例工作流经 `P(n)` 注入哨兵默认重放，B1/B9）+ OEN01 显式哨兵 PASS（node:error 恰 1 次 id=2、下游节点 3 无 node:start、run:done ok:true/stopped:false、GET /runs/:id status="done"，与 OE01 同型）。「非波及 gate 场景」为空集（SPEC §0 修正 2），该子句由 AC5 的「重录后全量 diffPx=0 + 变更集恰枚举」承载 | smoke 汇总行原文 `==== smoke:server：196 passed / 0 failed ====`；OEN01 PASS 行原文（§3 引） |
| AC2 | 优先序三层矩阵 | **PASS**。①哨兵→env 承接：OEN02（mock 命中恰 3=1+2、log warn 恰 2、含「已重试 2 次」）PASS；②节点胜：OEN03（节点重试×1 压制 env=skip，恰 2=1+1）+ OEN06（节点中止覆盖 env=retry×2，恰 1 零重试=策略类型节点胜）PASS；③全未配置=内建缺省：OEN01+OE01 同型逐位一致 PASS | 三条 PASS 行原文见 §3 |
| AC3 | 节点 retry 正例 | **PASS**。OEN04 耗尽降级：mock 恰 3（1+2，DEFS 默认 onErrorRetries=2 注入——**env retries=0 未使节点 retry 退化，陷阱破解机器证明**）、warn 恰 2、node:error 恰 1 含「已重试 2 次」、starts=[1,2]（node:start 未重跑）、ok:true。第 N+1 次成功路径由既有 OE04（env 同构，本会话 PASS）+ OEN03 次数覆盖承载（SPEC §7 预定口径） | OEN04/OE04 PASS 行原文 |
| AC4 | 节点 abort | **PASS**。OEN05 全链：starts=[1,2]（下游 3 与同级分支 4 全部不再调度）、run:done{ok:false,stopped:false,done=2}、GET /runs/:id status="error"、stopped 恒用户中止独占。OEN06 补 env=retry 下节点中止零重试 | OEN05/OEN06 PASS 行原文 |
| AC5 | 面板呈现与像素面 | **PASS**。呈现面：面板/节点体新参数行实测（§4 E4-a/a2/a3、AC5-a）+ 截图 `iterations/0070/evidence-ac5-panel.png`、`evidence-e1-run-card.png`。像素面：重录后确认性 gate 复跑全绿（§1 痕迹 ①：diff/ 自清 = 21/21 pass · diffPx=0 的 gate.mjs 设计行为）+ golden 变更集**恰 42 文件**（`git status --porcelain tests/golden/ui` = 42 条 M、21 png + 21 invariants.json、零新增零删除——本会话亲核）+ 21 场景不变量「每节点 +2 widget」形态逐一亲核（§2.1） | §1 痕迹、§2.1 不变量采样表 |
| AC6 | 契约守护（基数修正 44→86） | **PASS**。`npm test` 30/30（BUILD 自测两次实跑 + 脚本门禁，本会话未重跑——引用，§5 声明 3）。三件 diff 本会话逐行亲读：defs-drift（`ON_ERROR_PARAMS` 常量 21 型展开、计数断言 44→86、测试名「86/86」、头注 0070/ADR-0025）；param-handler-guard（`ENGINE_WIDE_PARAMS=['onError','onErrorRetries']` 归属规则位于 condition 规则后/unattributed 兜底前、计数 86、注记「44+21×2=86，僵尸 8 不变→已实现 78」）；synthesis（EXPECTED_ORDER 10 型尾键各 +2）。负清单六测试文件零 diff（§2.2 机器证明）；baseline 重生成 +441 行；21 README 各 +2/-0 | 三件 diff 原文（本会话 `git diff` 实读）；负清单输出零行 |
| AC7 | 循环子节点 per-call | **PASS**。OEN07：loop 闭包子图内 http 节点 onError=重试×1 → mock 命中恰 2（1+1）、log warn 恰 1、node:error 恰 1 含「已重试 1 次」、**node:start 恰 1 次（重试不重跑）**、run:done ok:true | OEN07 PASS 行原文 |
| AC8 | 禁区机器证明 | **PASS（含口径声明）**。负清单 22 路径 `git diff --stat` 输出**零行 exit 0**（零新增 env / SSE 契约零变更 / 前端 apps/web/src 零改动 / 零新依赖 / gate 工具与宪法零改动）——本会话实跑。变更集 94 条逐类归类 = 48 产品（21 node.ts + 21 README + baseline + 契约测试三件 + engine.ts + smoke）+ 42 golden + 2 机制件 M（BACKLOG/STATE）+ 2 机制件 untracked（ADR-0025、iterations/0070/），与 SPEC §3 白名单**逐一对上、零清单外文件**。21 node.ts 追加内容归一化 md5 **21/21 逐字一致**（同一哈希 a4bbe6fd）。`gate:update` 恰一次：golden 42 文件 mtime 单批 03:18:07 + JOURNAL §6.1 mtime 重建（03:16 首跑 FAIL 集≡{s0..s20} → 03:18 重录 → 03:29 复跑自清）。**口径声明**：`git show --numstat <产品提交>` 不可执行——产品提交尚未落盘（落盘归脚本后续阶段），以工作区 diff 等价核对承载，白名单终检归产品提交落盘时执行 | 负清单命令输出；status 分类计数（2 ?? + 92 M）；md5 归一化 21/21 |
| AC9 | 回归面全绿 | **PASS（含口径声明）**。smoke 本会话实跑 **196/0**（V09 时点性假红按 JOURNAL §5-1/0018 OBS-001 处置：`git stash push -- packages/shared` → 复跑 196/0 → `git stash pop` 还原 → status 94 条与暂移前一致、stash 清空——非产品缺陷）。build/gate/test 引用脚本结论 + §1 物理痕迹交叉印证（按派发指令未重复实跑）。s3-library 抖动：本会话未跑 gate，无抖动观察需求；golden 权威在 CI（推送后盯 `ui-constitution`，归后续阶段） | stash 前后 status 94/94；smoke 汇总行 |
| AC10 | 回执与记账 | **PASS（VERIFY 侧）**。STATE phase 由 VERIFY 按契约改写（本次验收动作，见 §6）；BACKLOG.md:69 BK-0048 行状态 ready + 晋升注亲读：「2026-10-31 迭代 0070 PLAN 轮随链晋升 ready 并选为本轮项（晋升条件兑现：前置 BK-0020 已终态 done·迭代 0069 合并 65e8c98…）」；done 终态回写归 CLOSE；issue#6 关单回执归 CLOSE 脚本（链终轮，itemContinues=false） | BACKLOG 行提取原文（node 实读，避免终端乱码） |

### 2.1 golden 21 场景不变量采样（AC5 支撑，重录后 `tests/golden/ui/*.invariants.json` 全览实读）

全部 21 场景呈「每节点 +2 widget」枚举判据形态，零例外：kefu 8 节点系（s0/s1/s2/s3/
s4/s5/s6/s7/s13/s16/s17/s18）widgets **15→31**（s0 新旧对照亲读：HEAD 15 → 重录 31，
节点矩形同步增高，如节点 1 `167x52`→`167x82`）；seed 两节点系各 **+2**（s8/s9=8、
s10/s11/s12/s14/s19=7、s15=9、s20=8）。s0 其余公共不变量键零变化
（`JSON.stringify({...o.counts,widgets:c.counts.widgets})===JSON.stringify(c.counts)` 实跑 true）。
「不多不少」执法链：首跑 FAIL 集恰 {s0..s20}（JOURNAL §6.2-1：diff/ 产物 21 invariants
ls 亲核 + s0 diff invariants counts.widgets=31 与 SPEC §4.2 预测逐字命中）→ 重录恰 42
文件 → 复跑自清（§1）。

### 2.2 负清单禁区机器证明（AC8 命令原文）

```
git diff --stat -- apps/server/src/config.ts packages/shared/src/events.ts \
  apps/server/src/types.ts apps/server/src/server.ts apps/server/src/handlers.ts \
  apps/server/src/llm.ts apps/server/src/agent.ts apps/server/src/store.ts \
  apps/web/src packages/shared/src/nodes.ts packages/shared/src/nodes.schema.ts \
  packages/shared/test/{nodes-dirs,contract,schema,events-negative,handlers-coverage,readme-consistency}.test.mjs \
  tools/pixel-gate/gate.mjs tools/gen-node-readmes.mjs .env.example package.json \
  package-lock.json .github tests/canvas CONSTITUTION.md
→ 输出零行，exit 0
```

## 3. smoke OEN01-07 实跑输出（本会话 `npm run smoke:server` 原文摘录）

```
PASS OEN01 节点 onError=跟随全局（显式哨兵）：env 承接（未配置=内建 skip）——node:error 恰 1 次（id=2）、下游节点 3 无 node:start、run:done{ok:true,stopped:false}、GET /runs/:id status="done"（与 OE01 同型零漂移）
PASS OEN02 节点哨兵 + ON_ERROR=retry×2：env 策略与次数承接生效——mock 命中恰 3（1+2）、log warn 恰 2、node:error 恰 1 含「已重试 2 次」、耗尽按 skip 终态 run:done{ok:true}
PASS OEN03 节点 onError=重试×1 + env=skip：mock 命中恰 2（1+1，节点策略压制 env skip——节点胜）、log warn 恰 1、node:error 恰 1 含「已重试 1 次」、耗尽降级 run:done{ok:true}（退避取实例 DELAY 缺省 1000ms）
PASS OEN04 节点 onError=重试（次数缺省，env 三键钉空）：DEFS 默认 onErrorRetries=2 注入 → mock 命中恰 3（1+2）——env retries=0 未使节点 retry 退化（陷阱破解机器证明）、node:start 未重跑、log warn 恰 2、耗尽按 skip 终态 ok:true
PASS OEN05 节点 onError=中止：失败后下游节点 3 与同级分支节点 4 全部不再调度（starts=[1,2]）、run:done{ok:false,stopped:false,done=2}（fail-fast 且 stopped 恒用户中止独占）、GET /runs/:id status="error"
PASS OEN06 节点 onError=中止 + env=retry×2：mock 命中恰 1（零重试——节点策略类型覆盖 env 策略类型，env 次数不叠加）、fail-fast starts=[1,2]、run:done{ok:false,stopped:false}
PASS OEN07 loop 闭包子图内 http 节点 onError=重试×1：循环子节点经 sub() 逐 runNode 调用独立解析——mock 命中恰 2（1+1）、log warn 恰 1、node:error 恰 1 含「已重试 1 次」、node:start 恰 1 次（重试不重跑）、run:done{ok:true}
==== smoke:server：196 passed / 0 failed ====
```

断言总数 **196**（非 SPEC §5 名义 189）：189 = 182 既有 + OEN×7；余 7 条为 C01 清理组
（每自建 run 一条 DELETE 断言，随本轮新增 run 数浮动）——JOURNAL §2-2 申报口径兑现。

## 4. 手动 E2E 五点位（SPEC §6；Playwright 临时脚本实跑）

| 点位 | 结果 | 证据与说明 |
| --- | --- | --- |
| E1 节点级重试 | **PASS** | 双击画布添加 HTTP 节点（id=9）→ 面板设 URL=`https://e2e-nonexistent-0070.invalid/api`（DNS 必失败，公网域名不经 guard 私网拦截）、失败策略=重试、次数 1 → `#float-run` 运行 → 日志面板**恰 1 条** warn 通报原文：`⚠ [HTTP 请求] 第 2 次尝试将在 1000ms 退避后执行（前次失败：fetch failed）`（退避基值 env-only=1000ms 实证）；收尾后仍恰 1 条（第二次失败不再通报）；节点终态 `class="node st-error"`；运行卡按钮恢复「运行」。截图 `evidence-e1-run-card.png` |
| E2 节点级中止 | **以 OEN05 机器断言承载（如实声明：UI 全链未单独重跑）** | UI 面（combo 四值可切）已由 E4 实证；fail-fast 全链语义由 OEN05/OEN06 同引擎路径机器断言承载。PRD REQ-0070-08 三点位中 E1/E3 语义已实测 |
| E3 跟随全局 × env 承接 | **以 OEN02 机器断言承载（如实声明：UI 版未跑——需改 .env 重启服务器，根 package.json smoke 基建已含同型断言）** | OEN02：哨兵 + env retry×2 → mock 恰 3 + warn 恰 2（env 承接全量生效） |
| E4 面板↔节点体一致性 | **PASS（8/8 终判）** | 面板 combo 四选项恰 `['跟随全局','跳过','重试','中止']`、默认「跟随全局」、次数 number type min=0/max=5/step=1 默认 2（E4-a/a2/a3）；面板改「重试」→ 节点体 select 同步（E4-b）；面板改次数 4 → 节点体同步（E4-c）；节点体改「中止」→ localStorage 持久层实证 `tabs[0].nodes[2].params.onError='中止'`（E4-d2）→ 真取消选中（面板清空「未选中任何对象」，E4-d1）→ 重选后面板与节点体一致（中止/中止，E4-d3）；刷新后持久值一致（E4-e，初版会话）；终态还原（E4-f） |
| E5 交互回归抽查 | **PASS（10/12，2 项假红归因为断言口径错误，见下）** | drag-num 拖动步进：面板「重试次数」label 右拖 +60px → 值 clamp 到 max 5 并写回持久层（E5-1/1b，交互实现 app.js:2656-2672 `clamp(sv+round(d/6)*step,min,max)`）；combo 选择（selectOption）即 E4 各步；节点折叠：`.ncollapse` → class `collapsed` + 节点体新参数行不可见 → 展开恢复可见（E5-3a/3b——折叠节点不呈现新行实证）；删除节点 + 撤销重做全链：添加 8→9、Delete 9→8、Ctrl+Z 8→9、Ctrl+Y 9→8、持久层 8 节点（E5-4a~e） |

**E5-2 假红归因（非产品缺陷）**：两项断言预期「参数值修改可 Ctrl+Z 撤销」——源码亲读
证实参数 change 处理器（app.js:1144-1154 面板 / :1799-1809 节点体）**均不调用
pushUndo**，undo 栈（:1371）仅在结构操作入栈；参数值不在撤销管辖域是**既有全局语义**
（trigger mode、url 等一切参数同构），非本轮新参数特有（本轮前端零改动，负清单机器
证明佐证）。撤销重做在其管辖域（结构操作）E5-4 全链 PASS。VERIFY 断言设计错误，
不构成 BUG。

**E4-d 初版假红归因（非产品缺陷）**：首跑 FAIL 系脚本取消选中点击 (780,700) 落在底部
日志面板区（未取消选中 → 重选无变化 → 面板保留旧渲染）。修正为画布空白 (120,620)
后 E4-d1/d2/d3 三连 PASS；期间 localStorage 实证写回路径健康。E4 全链终判 8/8。

**E1-f 初版假红归因（非产品缺陷）**：读 runs API 时整条 kefu 主链（含真实 LLM 调用与
「转人工审批」approval 挂起，approval.to=挂起=永等）仍在运行（status=running，
done=0 持久化口径）——审批挂起非失败、不触发任何策略（ADR-0022 §2.4/B11 既有语义）。
经 `POST /api/v1/run/:id/stop`（200 {ok:true}）收尾：status='stopped'、done=7/total=9、
ended_ms 落盘——run 生命周期健康。skip 终态「ok 不反映失败」语义由 OEN01/OEN04 机器
断言承载（同型）。E1 会话添加的 http 节点未持久化到后续会话，清理复核：持久层 8 节点、
节点 3 params={}（纯 DEFS 默认态「跟随全局/2」）、无必失败 URL 残留——工作流零污染。

## 5. 锚点抽样（≥5 组，SPEC §7；坐标漂移以实现为准并注明）

| # | 锚点 | 实读结论 |
| --- | --- | --- |
| 1 | engine.ts:87-101 | 解析层块亲读：注释块 :87-91、`ON_ERROR_NODE_MAP` :92（中文值显式映射，JOURNAL 申报的 noUncheckedIndexedAccess TS 修正如实在案）、`clampRetries` :93、`resolveOnError` :94-101——优先序「节点参数（若设非哨兵）> env 全局默认 > 内建缺省 skip+0」、retries 仅 retry 语义消费，与 SPEC §2.2 逐点一致 |
| 2 | engine.ts:108-109/:147/:162/:177/:205/:220 | 宿主签名 `callHandlerWithRetry(handler,args,title,retries)` + `maxAttempts=1+retries`；runNode 解析点 `const oe=resolveOnError(p)`（:147，逐调用）；调用点传 `oe.retries`（:162）；abort 分派 `if(oe.strategy==='abort') onErrorAborted=true`（:177）；主循环 fail-fast `if(onErrorAborted) break`（:205）；`ok=!stopped&&!onErrorAborted`（:220）。delay 恒 env-only（:119）、通报先行（:123）、abortable sleep（:124）、零重试原样上抛（:128）逐字未动。全文 223 行 ≤400 |
| 3 | config.ts:35/:88-90/:140-142 | 三 env 白名单 / zod 值域 / 输出映射亲读坐标命中；文件零 diff（§2.2）——零新增 env 机器证明 |
| 4 | nodes/retrieval/node.ts + nodes.ts:150-154 | retrieval params 尾部双参数 diff 亲读（combo 四值 value≡label + number default 2/min 0/max 5/step 1，逐字 = SPEC §2.1）；`paramDefaultsOf`（:150-154）零 diff——哨兵默认注入零迁移机制在库 |
| 5 | smoke-server.mjs wfOeFail/oeMock/OEN 组 | `wfOeFail` 第 4 参 np（实坐标 :176-183，**漂移注明**：SPEC §1.5 写 :166-180，smoke 头注扩记后顺移，以实现为准）；`startOeMock` `/oen*` 恒失败路径（:471-476 附近）；OEN01-07 七组断言逐行亲读与 SPEC §5 矩阵逐行吻合（实坐标 :2619-2712）；主实例/skip 实例 `ALLOW_PRIVATE_NET:'1'` 追加与 JOURNAL §2-3 申报一致（oeSrvAbort 保持拦截语义供 OEN05，未波及既有断言） |

## 6. STATE 记账（本验收动作）

`docs/evolution/STATE.md`：`phase: BUILD → VERIFY`、`updated` 刷新为本验收时点；
`last_result` 保持 BUILD 结论不变（VERIFY 结论以本 REPORT 为准，CLOSE 记账归脚本）。

## 7. BUG 清单

**无。** 全部验收发现的三处「红」均归因为验收脚本自身的假红（§4 三条归因，均附
源码/持久层/时序证据），零产品缺陷、零修复轮（repair_round 维持 0）。

## 8. 如实声明与遗留

1. **AC8 numstat 口径**：产品提交尚未落盘（提交归脚本在 VERIFY 后执行），白名单核对
   以工作区 diff 等价承载（§2 AC8）；提交落盘时的 `git show --numstat` 终检 + 机制件
   提交归脚本/后续阶段。
2. **AC9 三项引用口径**：build/gate/test 未在本会话重复实跑（派发指令明示），引用
   脚本运行结论 + 磁盘痕迹交叉印证（§1）；smoke 为本会话实跑。golden 权威在 CI，
   推送后 `ui-constitution` 盯守归推送阶段。
3. **E2/E3 UI 版未单独重跑**（§4 表内声明）：语义由 OEN05/OEN02 机器断言同型承载；
   不构成验收缺口——SPEC §7 AC4/AC2 的验收手段本就指定 smoke 断言组实跑。
4. **VERIFY 期间产生的服务器侧遗留**：E1 运行的 run 记录（id 2b39c8ba…，status=
   stopped）持久于工作树 `data/`（不入库）；kefu 工作流定义零污染（§4 清理复核）。
5. **smoke V09 时点性假红**（JOURNAL §5-1）：产品提交落盘后自愈；本 VERIFY 以 stash
   法实跑 196/0 并完整还原（status 94 条一致），已按 0018 OBS-001 先例处置留痕。
6. gh 亲核未尝试（issue#6 关单归 CLOSE 脚本；网络 TLS timeout 先例见 PRD §0，在库
   记录为权威——本 VERIFY 无 issue 面操作职责）。

## 9. 证据清单

- smoke 汇总与 OEN 七条 PASS 原文：§3（本会话实跑输出）
- 负清单零 diff 命令原文：§2.2
- golden 42 文件构成 / 21 场景不变量采样 / s0 新旧对照：§1、§2.1
- 三件契约测试 diff、21 node.ts 归一化 md5 21/21：本会话 git diff 实读（§2 AC6/AC8）
- E2E 截图：`iterations/0070/evidence-ac5-panel.png`（面板新参数行呈现）、
  `evidence-e1-run-card.png`（节点级重试运行面）
- 首跑 FAIL 集恰枚举 / gate:update 恰一次 / 复跑自清时序：JOURNAL §6.1-§6.2（BUILD
  侧核验）+ 本 REPORT §1 mtime 交叉印证
