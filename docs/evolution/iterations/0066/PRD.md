# PRD · 迭代 0066 · BK-0061 BK-0020 拆分 SPEC 先行：引擎 on-error 策略（重试/跳过/中止）env 语义清单与引擎失败路径改造定界 + ADR 草案

> 产出角色：product-manager（PLAN 阶段）· 2026-10-29 10:45
> 来源：BACKLOG BK-0061（capability / **触UI=否** / **P2 / S / ready** / 来源 T5，
> BACKLOG.md:82）。无批复链（档案 approved/rejected 均无）、无前置（行内明文
> 「晋升条件=无前置（ready 可选）」）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M2 环境感知与数据真实化（
> ROADMAP.md:161-165 四项之一 BK-0020 的 SPEC 先行拆分；W44 治理日拆分立项，
> 待办节 3「T5-M2 SPEC 三连穿插：BK-0060 → BK-0061 → BK-0062」——本轮即
> 序列第 2 位，BK-0060 已于迭代 0059 终态 done）。
> 批次编排：无——单项单迭代（S 级纯文档轮）。**S 项且非 doc、非触 UI——
> SPEC 豁免适用（WORKFLOW §4「S 项（非 doc、非触 UI）可免独立 SPEC」），
> skipSpec=true**：受影响文件清单与验收口径内嵌本 PRD §6/§7。
> 回执口径：来源 T5 无 issue → **sourceIssue 无、itemContinues=false**（实现块
> 是独立 BACKLOG 项 BK-0020，非同 ID 批次续填；BK-0020 晋升条件=本项 CLOSE
> 且（若定新 env 语义）needs-approval 获批——归后续 PLAN 轮处置）。
> **reconstitutional=false（非修宪轮）**：纯文档轮零 golden 接触、全程禁
> gate:update（宪法第 3 条；POLICY 需批准射程零命中——零 UI/零 shared/
> 零依赖/零 env 实现/零出站）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-29 10:37~10:45 核实）

- **跨迭代续选**：无——近 3 迭代均已归档（工作树 `iterations/` 列目录亲核：
  0061 BK-0045 终态 done·BK-9005 链闭合（用户授权 A 案收口）/ 0064 BK-0019
  done / 0065 BK-0047 done·合并 3133857 零冲突；metrics.md:55-62 亲读至
  0064 行，0065 记账归主干 CLOSE 侧）。
- **占位互斥核查（只读）**：`.zcode/locks/items/` 本会话 `ls` 亲核为空
  （exit=0、无条目）→ 两候选均无在途占用。占位目录的获取归工作流脚本
  （本轮派发未授权写主干 `.zcode/`，按「不碰主干目录」纪律仅核查不代建）。
- **① 批复同步**：档案「approved：无；rejected：无」→ 本轮零动作（无建行、
  无转 ready 门槛解除、无 skipped 改写）。issue 面板空（档案「issue 面板」
  空列表亲读）。
- **② user-request**：档案无 user-request 条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 无 skipped 改写。
- **④ 常规选题（本轮入选路径）**：ready 队列本会话 `grep -n "| ready |"
  docs/evolution/BACKLOG.md` 亲核**恰两项**——
  - **BK-0061（BACKLOG.md:82，P2/S，capability，T5）——✅ 入选**：与
    BK-0062 同 P2，S 优先于 M（规则④「优先 S/M」+ 同优先级按表序 BK-0061
    在前）；ROADMAP 待办节序列「BK-0060 → **BK-0061** → BK-0062」恰指向
    本项（BK-0060 已于 0059 消化）；类型 capability 非 doc（doc 项本轮
    跳过规则不适用；全表 doc 状态项仅 BK-0063 proposed，不在射程）；
    无前置、无失败史、无熔断记录。
  - BK-0062（:83，P2/M，capability，T5）——不选：同优先级下 M 大于 S；
    且 ROADMAP 序列钦定 BK-0061 先行（BK-0020 先于 BK-0014 解阻其修宪
    链下游 BK-0048）。
- **侦察档案消费（均不构成候选，无补题）**：残缺标记 grep 唯二命中——
  apps/server/package-lock.json:787 系 integrity 串内 XXX 假阳性；
  apps/server/src/tools.ts:138「not implemented」系 browser stub 工厂显式
  如实降级（ADR-0011 评估终态），0041/0045/0046/0047/0050/0051/0059/0064
  连续同判不立项。悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系
  治理日产物，心跳不重复采集。
- **NOT-selected 项零触碰**：BK-0062 状态与备注本轮不改写。

## 结论

**建议做（本轮入选，S 级纯文档轮，自主区）**——理由一句话：T5-M2 引擎
on-error 语义是 BK-0048（issue#6 修宪链末子项）的硬前置，而 env 语义清单
涉及 POLICY 需批准区「新增环境变量语义」，批复等待期长宜 SPEC 先行开路
（BK-0043→#14 同构先例）；ready 队列两项同为 P2，S 项成本最低且为 ROADMAP
待办节钦定序列位。

## 现状与证据（本会话亲核，ADR 背景节须按此转写）

- **现状失败语义（代码事实，逐行亲读 apps/server/src/engine.ts）**：
  - `engine.ts:102-112` catch 块——非中止错误：`scope.executed.add(id)` →
    `prog.done++` → `emit('node:error', {id,title,message})` →
    `ctx.log.warn(…, '节点执行失败')` → **`return`**（不激活任何出边 →
    失败节点的下游子图静默失活，同级独立分支继续执行）；中止
    （`isAbort(e) || ac.signal.aborted`）：`emit('node:error', …, '已中止')`
    后 `throw e`（沿既有中止级联）。
  - `engine.ts:152` `run:done` 携 `ok: !stopped, stopped`——**节点失败不
    影响 run 终态 ok**（ok 语义=「未被中止」，与 events.ts:32 注释、
    BK-0023 随批注释口径一致；前端消费面 server-sync.js:105-107 同语义）。
  - 即现状**无重试、无跳过策略分支、无节点级/引擎级中止策略**——BACKLOG
    BK-0020 行「现状任一节点失败整个 run 即挂」的表述在代码事实层面更
    精确为「失败节点下游静默失活 + run 照常收尾且 ok 不反映失败」。PRD
    指令：ADR 背景节按上述代码事实转写（沿 0027/0029 先例「锚点按代码
    事实转写、勿照抄 PRD/BACKLOG 旧行号」，不构成对 BACKLOG 行的改写义务）。
- **失败路径锚点**：`grep -n "failed\|node:error\|run:done\|status"
  apps/server/src/engine.ts` 亲跑——`node:error` 仅 :106/:109 两处、
  `run:done` 仅 :152 一处，engine.ts 内零 `failed` 字面（run 级失败状态
  不存在，佐证「无降级路径」立项语）。
- **边界切割锚点（BK-0048，BACKLOG.md:69 亲读）**：节点粒度 on-error
  参数=NDP 新参数（DEFS 扩展）=触 UI 修宪轮（issue#6 批复承继），实施
  顺序约束「BK-0020 引擎语义先行，参数扩展与引擎语义同批或其后」——
  本项 ADR 必须写死 env 全局默认 vs 节点参数覆盖的优先序，为 BK-0048
  预留参数覆盖缝而不预写任何 DEFS 终稿。
- **ADR 编号**：工作树 `ls docs/adr/` 亲核——现行落盘最大号 **0021**
  （0021-retrieval-kb-combo-server-fed-options，迭代 0065）；0017 双份
  撞号系 BK-0063 在案事实（主干工作区另有未提交机制件改名 0017→0019
  痕迹，属 WORKFLOW §4「机制件并行存在、合并时分类解决」范畴，与本项
  产品面零交集）。本项 ADR 编号取 **0022**；若与他路并行落盘撞号，按
  ADR-0015 §5 golden 场景号「落盘时序裁决」先例处置（改名非重写）。
- **row 行号刷新义务（CLOSE 侧）**：BACKLOG BK-0061 行证据指针
  「engine.ts:102-109」实核 catch 块跨 :102-112（:102 `}catch(e){` 起、
  :112 `}` 止）；定界回写时按实核坐标转写（机制件回写，随 CLOSE 归档）。

## 用户故事与价值

- **US-1（编排者/维护者）**：作为 AgentFlow 的使用者，我希望工作流中某个
  节点失败时可以按可配置策略（重试/跳过/中止）降级，而不是失败节点下游
  静默失活且 run 仍报 ok——这样长工作流的瞬时故障可自愈、可观测。
- **US-2（循环自身）**：作为进化循环，我希望 on-error 的 env 语义清单先经
  SPEC 定稿并持附录开 needs-approval，使 BK-0020 实现块与 BK-0048（issue#6
  链末子项）的解阻路径清晰、批复一次到位。
- 本轮交付物是 **ADR 草案**（蓝图），不是 on-error 本体——实现归 BK-0020。

## 功能范围（ADR-0022 草案必须覆盖的定界要素）

- **REQ-0061-01 失败现状白描**：按「现状与证据」节代码事实转写三策略的
  改造基线（catch 分支、出边激活点、run:done ok 语义、events.ts:32 与
  server-sync.js:105-107 消费面指针），标注零杜撰。
- **REQ-0061-02 三策略语义定界**：重试（次数/间隔退避草案值，env 承载）、
  跳过（失败节点下游失活 vs 沿默认出边放行两案的语义与风险对照）、中止
  （run 级 fail-fast 语义，与既有 abort 中止级联/停机级联的边界切割）。
- **REQ-0061-03 env 语义清单**：候选 env 变量名、默认值、zod 校验形态
  （config.ts 既有白名单 + superRefine 先例指针）；**若定任何新 env 语义
  即属 POLICY 需批准区**——须产出附录 A needs-approval issue 草案（五要素
  自包含，沿 BK-0027→#10、BK-0043→#14 先例），获批前实现块零实现；若
  方案可零 env 达成（如仅 run 级缺省策略常量），须显式论证并保留 env 化
  演进缝。
- **REQ-0061-04 引擎失败路径改造定界**：engine.ts catch 分支扩展点、
  重试循环的宿主位置与 abort 响应（重试期间 stop/停机须即时中断）、
  node:error 事件序列（每次尝试 vs 仅终态一次，二选一并论证）、run:done
  ok 语义是否随策略变化（若变，须评估 events.ts 注释与前端消费面——
  SSE 事件契约零新增为硬护栏，确需新增即中止转 needs-approval）。
- **REQ-0061-05 与 BK-0048 的边界切割**：env 全局默认 vs 节点参数覆盖的
  优先序写死（推荐序+否决案对照表）；BK-0048 参数面（NDP/属性面板）本
  ADR 零预写。
- **REQ-0061-06 实施块定界回写**：BK-0020 行备注列回写「权威字面量」节
  （ADR-0022 §N 即权威；VERBATIM 口径沿 BK-0035/0039 先例），晋升条件
  复述（BK-0061 CLOSE 且（若定新 env）needs-approval 获批）；BK-0048 行
  零触碰（其约束原文已足够）。
- **REQ-0061-07 不做范围（out of scope）**：不实现 on-error 本体（归
  BK-0020）；不改 engine.ts/config.ts/events.ts/handlers.ts 任何代码；
  不触 BK-0048 UI 面；零 shared 契约、零新依赖、零出站、零 golden；
  不改 BK-0063 撞号现状（归治理日 doc 批处理）。

## 非功能要求

- ADR-0022 草案 ≤400 行（BK-0032 297 / BK-0035 260 / BK-0039 286 / BK-0043
  389 / BK-0020 288 先例区间），UTF-8 无 BOM、LF；头部状态行=
  「草案 · 待实施轮消费（BK-0020）」+（若含附录 A 请批面）「依赖与 env
  请批面——附录 A」双位标注（ADR-0014 先例），全文「已批准」计数 0。
- 20+ 代码锚点全部亲核可开（VERIFY 指针抽样 ≥5 条抽查口径）。
- 零产品代码：apps/ packages/ tools/ tests/ .github/ package*.json diff
  恒空（AC 机器证明，BK-0027/0032/0035/0039 AC4 白名单先例）。

## 触UI 分类结论（必答）

**触UI=否——自主区（纯文档轮，宪法第 3 条不触发）。**

- 改动面仅 `docs/adr/` 新增 + `docs/evolution/BACKLOG.md` 回写，均为文档
  与机制件；apps/web（视觉/DOM/CSS 三层）、packages/shared（契约）、
  golden 基线、tools/pixel-gate、CI 配置零接触。
- golden 影响：零——新场景零、既有场景零波及、**全程禁 gate:update**
  （POLICY 禁止区：未获批准迭代内零重录；本轮亦无任何重录必要面）。
- engine 运行时行为本轮零变化（纯文档轮零代码），gate 为纯回归面。

## 受影响文件清单（skipSpec 内嵌，S 项免独立 SPEC）

| 文件 | 动作 | 预算 |
| --- | --- | --- |
| `docs/adr/0022-engine-onerror-policy-env.md`（名以 SPEC 落盘定稿为准，编号 0022） | 新增 | ≤400 行 |
| `docs/evolution/iterations/0066/{PRD,JOURNAL,REPORT}.md` | 机制件 | 随归档 |
| `docs/evolution/BACKLOG.md` BK-0061 行（终态备注）+ BK-0020 行（REQ-0061-06 定界回写） | 机制件回写 | VERBATIM 口径 |

白名单外（apps/ packages/ tools/ tests/ .github/ package*.json）**零改动**
——AC 以 `git diff` 恒空为机器证明。

## 验收标准（Given / When / Then）

- **AC1 纯文档轮机器证明**：Given 本迭代产品提交落盘；When 在工作树执行
  `git diff HEAD -- apps packages tools tests .github package*.json`；
  Then 输出恒空（零代码/零依赖/零 UI/零 golden 四零）。
- **AC2 ADR 六要素成节**：Given docs/adr/0022 草案落盘；When 通读全文；
  Then §动机与现状证据（REQ-0061-01，含 engine.ts:102-112/:152 亲核锚点）
  / §三策略语义定界（REQ-0061-02）/ §env 语义清单或零 env 论证（REQ-0061-03）
  / §引擎失败路径改造定界（REQ-0061-04）/ §BK-0048 边界切割（REQ-0061-05）
  / §权威回写字面量节（REQ-0061-06）六节齐备，头部状态行合规、「已批准」
  计数 0，≤400 行。
- **AC3 需批准面判定自洽**：Given REQ-0061-03 结论；When 核对 POLICY 需
  批准区；Then 若定新 env/依赖 → 附录 A needs-approval issue 草案五要素
  自包含在案且「获批前零实现」字面命中；若零 env 方案 → 论证节显式在案
  （两条路径恰好其一，不得含糊）。
- **AC4 回写 VERBATIM**：Given BK-0020 行定界回写；When 程序化比对回写
  文本与 ADR 权威字面量节；Then trim 后全等，BK-0061 行终态备注与
  BK-0048 行零意外触碰（`git diff` 行级核对）。
- **AC5 回归面全绿**：Given 工作树基线；When `npm run build` + `npm run
  gate` + `npm test` + `npm run smoke:server`；Then 四项全绿（gate 21 场景
  diffPx=0 纯回归、smoke 168/0 基线零回退；s3 本机抖动按 issue#12 纪律
  处置，绝不 gate:update）。
- **AC6 指针抽样**：Given ADR 全文锚点；When VERIFY 抽样 ≥5 组（含
  engine.ts:102-112、:152、events.ts:32、server-sync.js:105-107、
  config.ts 白名单区）；Then 全部命中零杜撰。
- **AC7 选题与 STATE 留痕**：Given 本 PRD；When 核对 STATE.md；Then
  phase=PLAN、item=BK-0061、updated 为本轮时间（CLOSE 侧按契约推进，
  本 PRD 不越权改写）。

## 验收命令口径

`npm run build` + `npm run gate`（纯回归面）+ `npm test` +
`npm run smoke:server` 全绿；机器证明命令：`git show --numstat <产品提交>`
（恰 1 产品路径 ADR）+ `git diff HEAD -- apps packages tools tests .github
package*.json`（恒空）+ ADR 指针抽样 ≥5。

## 依赖与后续

- 前置：无（BK-0021 NDP 迁移、BK-0060 SPEC 先行均已 done——本项与 ADR-0020
  无耦合：KB 管道与 on-error 分属 T5-M2 两条独立语义线）。
- 后续解阻：BK-0020（实现块）晋升条件=本项 CLOSE 且（若定新 env）附录
  needs-approval 获批；BK-0048（issue#6 链末子项）前置=BK-0020 落地——
  本项即 BK-9006 链收官的两级解阻第一级。
