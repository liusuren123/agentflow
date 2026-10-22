# PRD · 迭代 0007 · 补题轮：ready 队列枯竭下的 BACKLOG 补充（无实现、无产品提交）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 18:20
> 本轮性质：**补题轮（outcome=replenished）**。选题依据（`docs/evolution/BACKLOG.md:11-21`
> 全表核对，2026-10-22 18:18 本会话实查）：ready 队列**归零**——BK-0002/0003/0006/0007/0004
> 五项 done、BK-0001 blocked、BK-0005/0008/0009/0010/0011 五项 proposed、BK-9001 在
> 待批准区 pending-approval。迭代 0006 收尾时协调者与 test-manager 已双向预警此情形
> （`docs/evolution/STATE.md:13`「ready 队列已归零，下次心跳 PLAN 须转补题」；
> `iterations/0006/REPORT.md` §9 处置建议同句）。按 WORKFLOW.md §4 PLAN 契约
> （`docs/evolution/WORKFLOW.md:78-79`「若 ready 队列枯竭，则本迭代改为『补题』
> （产出新 proposed/ready 项后直接 CLOSE）」）执行：本轮只补题、不实现、不出产品提交，
> 无 SPEC/BUILD/VERIFY 阶段。

## 结论

**本轮为补题轮（不做实现）**：一句话理由——ready 队列已枯竭而 ROADMAP 仍有未承载的
里程碑（T1-M2，`docs/evolution/ROADMAP.md:29-37`，其验收口径已于迭代 0001 细化、
明示「待后续选题」`ROADMAP.md:106-108`）与 5 项 proposed 池中前置条件可判定的项；
按「用户价值 × 实现成本」补充 **1 项新增 + 3 项晋升 ready**，使下次心跳可正常选题，
并保证每项与 done/blocked 历史零重复（防重复对照见下节）。

## 触 UI 分类结论

**本轮全部 4 个产出项均为「触UI=否」**，逐项论证（宪法第 1 条三层对照）：

1. **BK-0012（新增，T1-M2 边界文档）**：纯文档项，产品提交目标为 `docs/` 下新文档——
   宪法第 4 条明确「文档」在门禁不适用清单（`CONSTITUTION.md:47`）；四模块边界说明
   只**描述**现状，不改 `apps/web` 任何字节；验收仍要求 gate 4 场景全绿兜底
   （ROADMAP T1-M2 验收②本身就是这条）。
2. **BK-0005（晋升，MCP 工具能力核对）**：核对对象为 `apps/server/src/tools.ts` 的
   降级文案与日志一致性（后端 debt）；若实现阶段产生改动，改动面限 `apps/server`
   运行态文本（SSE/log 载荷内容），非 UI 结构——先例：迭代 0005 已论证「运行态数据
   文本 ≠ UI 结构」（`iterations/0005/PRD.md` 触 UI 分类结论第 2 条）。
3. **BK-0010（晋升，golden 场景扩充提案 ADR 草案）**：产出仅两件——ADR 草案文本 +
   BACKLOG 待批准区新条目。**不触碰** `tests/golden/**` 与 `tools/pixel-gate/**`
   （WORKFLOW §6 护栏 2/3）；其提案的实现（s4/s5 基线重录）属宪法第 3 条流程，
   只能经用户批准后另行立项——本项恰是把该提案**送入**用户主权接口的机制内动作。
4. **BK-0011（晋升，悬挂 run 启动终结标记）**：纯后端启动逻辑（`apps/server`
   store/server），状态值沿用现有枚举（`store.ts:26` RunStatus），不新增契约字段、
   不触前端（BACKLOG 备注原句「若 SPEC 评审发现触 UI 则转待批准区」继续有效）。

**待批准区本轮零进出**：仅维持 BK-9001 原状（pending-approval，不催办、不代批）。

## 防重复对照（done × 6 / blocked × 1 历史）

| 产出项 | 对照历史 | 差异点（新项/晋升理由与历史不重合的证据） |
| --- | --- | --- |
| BK-0012 新增 | BK-0001（T1 盘点，blocked） | 同属 T1 主题但产物本质不同：BK-0001 是核对性盘点，产出只落 `docs/evolution/ROADMAP.md` → 被防打转校验判产品提交为空（`BACKLOG.md:11` 备注；过滤器只放行 `docs/evolution/` 之外路径，`.zcode/workflows/evolution-iteration.dwf.ts:241` 本会话实查）。BK-0012 的产品提交目标是 `docs/` 下**新文档**（`docs/evolution/` 之外），与 BK-0006（README.md，done，`metrics.md:10`）同一已验证通道，不复发空提交。与 BK-0006 的内容面互斥：README 是门面能力记述（T4-M2），本项是四模块架构边界说明（T1-M2），文件与读者均不同 |
| BK-0005 晋升 | 0002/0003/0004/0005/0006（done） | 全部 done 迭代的改动面为 tests/、README、`apps/server`（handlers/search/guard/config）、`packages/shared` 测试——**无任何迭代触碰过 `tools.ts`**（迭代 0005 明确 MCP 工具 schema 零变化，`iterations/0005/PRD.md` 非目标第 3 条）；本项核对对象 `tools.ts:59-60`（`'sqlite':null,'browser':null`）、`:85-89`（工具表「（未实现）」标注）、`:100`（stub 返回 not implemented）均为本会话 grep 实查现状，与历史零重叠 |
| BK-0010 晋升 | 同上 | golden 相关仅宪法第 3 条流程可动，历史迭代零触碰（护栏 2/3 生效中）；提案前提本会话核实成立——gate 现仅 s0-s3 四场景（`tools/pixel-gate/gate.mjs:61-64`，无 s4/s5 在线态基线），T2-M3 承载项（`ROADMAP.md:56-60`）至今无迭代承载 |
| BK-0011 晋升 | 同上 + BK-0002 冒烟 | 语义空位本会话核实：服务启动无悬挂 run 收尾逻辑（`server.ts` 全文 grep "running" 仅 `:179` 注释提及僵尸行；`store.ts` 无启动扫尾），runs 插入即 `'running'`（`store.ts:106`）、进程崩溃即永久悬挂；与 BK-0002 冒烟断言的 409（**内存注册表判活**，非 DB status）正交——冒烟锁删除守卫，本项锁启动收敛。来源：周报 W43 体检 O1（`docs/evolution/weekly/43.md:73`，库中实存 1 条悬挂记录） |

## 补题产出清单（本轮交付物 = BACKLOG 状态变更本身）

1. **BK-0012 · legacy 模块与 React 骨架职责边界文档化**（新增；P1 / doc / S / ready /
   来源 T1）：T1-M2 唯一承载项，补齐 ROADMAP 最后一个无承载项的里程碑。范围与验收
   采用 ROADMAP.md:33-37 已细化口径：① `docs/` 下新文档覆盖四模块——`Skeleton.tsx`
   静态骨架等价 JSX 唯一源、`src/legacy/app.js` 画布/交互命令式（逐字提取 +
   bootLegacyApp）、`src/server-sync.js` /api/v1 接入且不操作面板 DOM、`app.css`
   逐字冻结；② 合入后 gate 4 场景全绿。产品级 Given/When/Then 草案（供下次 PLAN
   轮定稿）：
   - AC-A · 四模块覆盖与可追溯：Given 四模块现状（行数与职责以 `iterations/0001/
     JOURNAL.md` §4 盘点为基线，BUILD 时只读复核），When 边界文档合入 `docs/`，
     Then 每模块的职责边界、禁止事项（server-sync 不操作面板 DOM、app.css 逐字
     冻结、Skeleton 不含运行态逻辑）与互操作边界（legacy 消费 `@agentflow/shared`）
     逐条在文档中出现，且每条可追溯至源文件头注或 ADR-0002，无凭空陈述。
   - AC-B · 渲染零影响：When 文档合入后运行 `npm run gate` 与 `npm test`，Then
     gate 4 场景全绿（diffPx=0）、test 全绿（8 项）——文档零渲染路径接触的机器证据。
   - AC-C · 改动面白名单：When 产品提交，Then git diff 仅含 `docs/` 新文档一个
     产品路径（迭代目录产物不计），`apps/**`、`packages/**`、`tools/**` 零改动。
2. **BK-0005 · MCP 工具能力核对 → ready**（P2 / debt / S）：T3 前置项（BK-0008
   备注明示「BK-0002/0005 完成后转 ready」，BK-0002 已 done）。晋升依据：核对范围
   两项均在（sqlite/browser 均未真实接入，`tools.ts:59-60` 本会话实查，范围不缩减）；
   且它是 ready 队列中唯一能解锁 BK-0008 的钥匙。
3. **BK-0010 · golden 场景扩充提案 ADR 草案 → ready**（P2 / doc / S）：T2-M3 承载项；
   产出为 ADR 草案 + 待批准区条目（实现层永不自主动）。晋升依据：提案前提成立
   （gate.mjs:61-64 四场景现状核实）、S 大小、且其产出去向（待批准区）恰丰富
   用户主权接口——当前待批准区仅 BK-9001 一项，过于单薄。
4. **BK-0011 · 悬挂 run 启动终结标记 → ready**（P2 / capability / S）：周报 W43
   体检 O1 立项；语义空位核实成立（见防重复对照表），S 大小平价。

**未晋升（维持 proposed）及理由**：BK-0008（sqlite 真实接入）——晋升门槛「BK-0005
完成」未满足，且 M 大小应在 BK-0005 核对结论出来后再排；BK-0009（browser 可行性
评估 ADR）——M 大小 doc 项，ready 已补 4 项足够撑到下个治理日，留治理日按 metrics
趋势再定（避免一次填满导致优先级失真）。

## 非目标（out of scope）

- **本轮零实现、零产品提交**：不改任何源码、测试、golden、CI；不运行
  `npm run gate:update`（WORKFLOW §6 护栏 2）。本轮产物仅 `docs/evolution/` 内三个
  文件（PRD + BACKLOG + STATE），归档提交由协调者 close 指令完成。
- 不改 `ROADMAP.md`：其「待办（治理周维护）」节（`ROADMAP.md:104-111`）按职责归
  周度治理更新。顺带观察（记录给治理日，本项不动）：该节「ready 队列补至 6 项」
  句已过时（那 6 项中 5 done/1 blocked）；T2-M1/M2 状态行是否需刷新同由治理日核定。
- 不为任何触 UI 候选松动通道：BK-9001 维持 pending-approval；BK-0010 的产出虽然
  会**新增**一条待批准区条目，但其本体（写草案）不触 UI。
- 不在本轮预定下次选题：下次心跳 PLAN 按「最高优先级 ready」自行选取（按当前
  优先级分布，P1 唯一 ready 项为 BK-0012，属预期但非本轮决定）。

## 用户故事

1. 作为协调者（心跳脚本），我需要在 ready 枯竭时拿到一批可直接选题的项，使进化
   循环不在 PLAN 空转。
2. 作为仓库所有者，我需要补题过程可审计：每项注明与 done/blocked 历史的差异点，
   防止同一件事被反复立项。
3. 作为用户（宪法主权方），我需要待批准区持续获得真实候选（BK-0010 的 s4/s5
   提案），且确信本轮没有任何自主 UI 实现混入。

## 验收标准（Given / When / Then，本轮文件级判据，CLOSE 时核对）

- **AC1 · 新增项落位**：Given 本 PRD 已落盘，When 检查 `docs/evolution/BACKLOG.md`
  主池，Then 存在 BK-0012 行——类型 doc、触UI=否、优先 P1、大小 S、状态 ready、
  来源 T1，且备注含与 BK-0001 的差异点（防打转通道：`docs/` 之下非
  `docs/evolution/`）与验收锚点（ROADMAP T1-M2 细化口径）。
- **AC2 · 晋升项状态**：When 检查主池 BK-0005 / BK-0010 / BK-0011 三行，Then 状态
  均为 ready 且各自备注追加晋升依据（tools.ts 现状 / gate 四场景现状 / 启动收尾
  空位核实）；BK-0008 与 BK-0009 状态仍为 proposed（晋升门槛未满足/治理日再议）。
- **AC3 · 待批准区不变式**：When 检查待批准区，Then 仅 BK-9001 一行且状态
  pending-approval；本轮无任何触 UI 项被置 ready（4 个产出项触UI 列全为「否」）。
- **AC4 · STATE 一致性**：When 检查 `docs/evolution/STATE.md`，Then iteration=0007、
  phase=PLAN、item=-（补题轮无所选 ID）、started 与 updated 均为本轮时间（本 PRD
  头注时间戳一致量级）、repair_round=0。
- **AC5 · 零越界改动**：When 于归档前检查 `git status`，Then 本轮全部改动位于
  `docs/evolution/` 之内（PRD/BACKLOG/STATE），任何 `docs/evolution/` 之外路径
  零变更——补题轮无产品提交的机器判据（防打转过滤器同款口径，
  `evolution-iteration.dwf.ts:241`）。
- **AC6 · 可选题性**：When 下次心跳 PLAN 读取 BACKLOG，Then ready 项共 4 个
  （BK-0012/0005/0010/0011），全部为 S 大小、触UI=否、验收口径有 ROADMAP 里程碑
  或代码/周报事实源锚点——满足「一次迭代只做一件事」的可交付判据。

## 依赖与风险

- **依赖**：无构建/运行时依赖（本轮零实现）；BK-0012 的下次实现依赖
  `iterations/0001/JOURNAL.md` §4 盘点数据仍与现状一致（BUILD 时复核行数即可）。
- **风险 1 · BK-0012 重蹈 BK-0001 空提交**：已在防重复对照中预检排除（产品提交
  目标在 `docs/` 下、过滤器之外）；若 SPEC 阶段把改动面挪回 `docs/evolution/` 内
  即违例，VERIFY 按 AC-C 白名单核对。
- **风险 2 · 补题轮被判「无进展」**：WORKFLOW §4 明文补题轮「直接 CLOSE」，
  metrics 将以结果列=replenished 记账（脚本 close 指令原文，
  `evolution-iteration.dwf.ts:138` 本会话实查），非空转。
- **风险 3 · BK-0010 草案被误读为实现许可**：其备注维持「实现触 golden 与
  pixel-gate，须用户批准（宪法第 3 条）后另行立项」原文；待批准区新增条目状态
  pending-approval，心跳永不触碰。

---

> 选题过程存证：本 PRD 由独立 PLAN 会话产出。ready 队列核对（`BACKLOG.md:11-21`，
> 2026-10-22 18:18 实查）：0 项 ready → 按 WORKFLOW §4 转补题轮。防重复对照覆盖
> done×6（BK-0002/0003/0006/0007/0004 + 0001 盘点部分）与 blocked×1（BK-0001）。
> 代码与文档引用均于 2026-10-22 18:18-18:20 本会话只读核实（BACKLOG / ROADMAP /
> metrics / STATE / weekly/43.md / 0004-0006 三迭代 PRD / tools.ts grep+wc /
> store.ts grep / server.ts grep / gate.mjs 场景段 / evolution-iteration.dwf.ts
> 防打转过滤行 / docs 与 docs/adr 目录 ls——确认边界文档尚不存在、ADR 编号止于 0008）。
