# PRD · 迭代 0070 · BK-0048 节点级 on-error 参数：NDP 新参数（重试/跳过/中止）+ 属性面板 UI（修宪轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-31 02:25 · 工作树 feat/0070-iter
> 来源：BACKLOG **BK-0048**（ui-proposal / **触UI=是** / P0 / S / proposed→**本轮随链晋升
> ready**，BACKLOG.md:69），批复链 **issue#6**（BK-9006 拆分母项批复承继
> 2026-10-24T08:38:51Z，BK-0047/0049 行 gh 留档先例）。
> **触UI=是——修宪轮：S 项 SPEC 豁免不适用**（WORKFLOW §4「S 项（非 doc、非触 UI）」
> 反面；0065 BK-0047 同判先例），**skipSpec=false，独立 SPEC 必做**。
> 回执口径：**sourceIssue=6**；**itemContinues=false**——本项为单迭代承载且系
> **BK-9006 链末子项（链终轮）**：链内姊妹四子项 BK-0046/0047/0049/0050 均终态 done、
> 无未竟姊妹子项，done 时 CLOSE 回执 **issue#6 关单**（BACKLOG.md:98 关单留末项 CLOSE
> 的既定口径兑现）。
> **reconstitutional=true（修宪轮）**：波及 golden 场景（属性面板渲染面）重录走
> `gate:update` 通道，授权链=issue#6 批复承继（0037/0038/0039/0065 四轮同链修宪消费
> 先例）；**golden 变更集须收敛恰 SPEC 枚举**（0056 全量重录超枚举违约教训在案）。
> 实施蓝图：**ADR-0022 §5 优先序写死**（节点参数 > env 全局默认 > 内建缺省）+
> 本 PRD §8 决策空间——参数面（参数名/取值枚举/面板形态/受影响节点集合）归本修宪轮
> SPEC 定稿（ADR-0022 §5「BK-0048 参数面零预写」纪律在本轮兑现）。

## 0. 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-31 02:15~02:25 核实）

- **并行占用核查**：派发档案明示 **BK-0018 已被其他并行工作流占位、严禁选择**；
  `.zcode/locks/items/` 本会话 `ls` 亲核恰 `BK-0018` 一个条目——其余项无在途占用。
  BK-0018（BACKLOG.md:116，ready）本轮零触碰（其重试轮归占位方，成果载体
  feat/0068-iter d5ddb27 在案）。
- **① 批复同步**：档案「**approved：无；rejected：无**」→ 零新批复动作（#16/#15/#17
  的批复已分别于 0069/0068 轮消费并记账在案）。issue 面板 #17/#16/#12/#6 四项均
  needs-approval 开放态——与「批复在案、issue 保持开放至链终轮/处置」的既定形态一致
  （#6 系 BK-9006 链终关单口径、#12 系 CI 抖动处置待批、#16/#17 批复已承继消费）。
- **② user-request**：面板无 user-request 条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 零 skipped 改写。
- **④ 常规选题**：ready 队列选题时点 `grep -n "| ready |" BACKLOG.md` 亲核恰两项——
  BK-0014（P2/M，BACKLOG.md:112）与 BK-0018（P2/S，BACKLOG.md:116，**被占禁选**）。
  常规 ready 队列实质仅 BK-0014。但 **BK-0048 晋升条件本轮兑现**：前置 BK-0020 已终态
  done（迭代 0069 合并 65e8c98），其行尾亲读明载「**解阻 BK-0048**（前置 BK-0020
  落地、晋升条件兑现归下轮 PLAN 轮晋升，BK-9006 链内仅余本项、issue#6 关单留其链终轮
  CLOSE）」——**本轮即该「下轮 PLAN 轮」**。按 0065 BK-0047「P0 修宪链项随链晋升并
  入选」先例晋升 ready 并入选。**tie-break（vs BK-0014）三重依据**：
  1. **优先级 P0 > P2**（BACKLOG 头部排序规则「优先级 P0 > P1 > P2」）；
  2. **S 优先于 M**（WORKFLOW §4「优先 S/M」；0069 tie-break 第 1 条同款先例）；
  3. **链收官价值**：BK-0048 = BK-9006 链唯一未竟子项，其 CLOSE 即回执 issue#6 关单
     （该 issue 自 2026-10-24 批复开放至今）；ROADMAP.md:214-215 新实施序列第 5 条
     明载「BK-9006 收官：…BK-0048（待 BK-0020 实现块 = BK-0061 CLOSE + env 批复）→
     末项 CLOSE 回执 issue#6 关单」——两个括号条件均已兑现（BK-0061 迭代 0066 done、
     env 批复 issue#15 2026-10-30T14:40:53Z）；0069 轮 tie-break 第 2 条已预认此链序
     （「BK-0048 待 BK-0020 实现块解阻 BK-9006 收官/issue#6 关单路径」）。
  - BK-0014 行尾「列 ready 队列次位，下轮心跳候选首选」（0069 PLAN 所注）系其时
    ready 队列内的相对序——当时 BK-0048 尚未解阻；本轮 BK-0048 解阻后按优先序与链序
    入选，**BK-0014 保持 ready、列下轮心跳候选首选**，零改写其行。
- **侦察档案消费（均不构成候选，无补题必要）**：残缺标记 grep 唯二命中——
  apps/server/package-lock.json:787 系 integrity 串内 `XXX` 假阳性；
  apps/server/src/tools.ts:138「not implemented」系 browser stub 工厂显式如实降级
  （ADR-0011 评估终态），0041/0045/0046/0047/0050/0051/0059/0064/0069 连续同判
  不立项。悬挂 run 探针 `[]` 空。覆盖差集/文档漂移/dogfooding 系治理日产物，心跳
  不重复采集。
- **近 3 迭代亲读**：iterations/0066（BK-0061 纯文档轮 done，ADR-0022 落盘）/
  0067（BK-0062 纯文档轮 done，ADR-0023 落盘）/ 0069（BK-0020 done，REPORT「PASS
  零产品缺陷零修复轮」）目录亲读；0068 无迭代目录（失败留档分支 feat/0068-iter，
  metrics 行 + 主干提交记账在案）。
- **gh 亲核如实声明**：本轮两跑 `gh issue view 6` 均 TLS handshake timeout（网络
  不可达，0069 轮「首轮 EOF 重试成功」形态本轮未复现）——issue#6 批复承继以**在库
  记录为权威**：BACKLOG.md:98「批复承继 issue#6（2026-10-24 心跳档案批复同步在案）」
  + BACKLOG.md:136-138「#6 终获批复 → BK-9006 建行入主池 ready P0」+ BK-0047/0049
  行时间戳 2026-10-24T08:38:51Z gh 留档先例；本轮档案 issue 面板 #6 OPEN[needs-approval]
  与「链终轮关单前保持开放」的预期形态一致。若 SPEC/BUILD 轮发现实况与在库记录矛盾，
  立即中止上报，不扩权。

## 1. 结论

**建议做（本轮入选，S 级修宪轮，授权链在案）**——理由一句话：BK-0048 是 issue#6
修宪链（BK-9006）的收官子项——引擎侧三策略已于迭代 0069 落地，ADR-0022 §5 已把
「节点参数 > env 全局默认 > 内建缺省」优先序写死并为节点参数预留解析缝；本轮把失败
策略从「全局 env」提升到「节点编排粒度」，CLOSE 即 BK-9006 链闭合、issue#6 关单。

## 2. 现状与证据（本会话逐项亲核，零杜撰）

- **引擎策略机制（BK-0020 落地形态，工作树亲读）**：`apps/server/src/engine.ts:79`
  `config.onError` 读取（executeWorkflow 级**一次**）/:82 `onErrorAborted` 标志位
  （不调 ac.abort，stopped 恒用户中止独占）/:89 `maxAttempts = 1 + onErrorRetries`
  /:99 指数退避 `×2^(n-1)` 单次封顶 30000ms /:155 abort 置位 /:183 fail-fast
  `break`（全部后续节点不再调度）/:198 `ok = !stopped && !onErrorAborted`。
  **节点级参数须下沉到 runNode 逐调用解析**（ADR-0022 §2.4：循环子节点与主图节点
  同权、按每次 runNode 调用独立解析）——引擎机制**零新增**（重试循环/abortable
  sleep/标志位全复用，仅解析层增加「节点参数」来源）。
- **env 装载面**：`apps/server/src/config.ts:35` 白名单三键 / :88-90 zod 形态 /
  :140-142 输出映射——**本轮零新增 env**（节点参数承载=DEFS，非 env；config.ts
  预期零 diff，AC8 机器证明）。
- **smoke OE 组在库**：`tests/smoke/smoke-server.mjs:240-243` 四实例探针声明 /
  :544「ON_ERROR 三键空串同径钉空（防开发者 env 泄入）」——节点级覆盖矩阵断言可沿
  OE 组实例形态扩组（新组 ID 避让既有组，0057 撞号教训）。
- **NDP 形态**：`packages/shared/src/nodes/retrieval/node.ts` 亲读——params 数组
  combo widget（options/default）形态即参数扩展样板；`nodes.ts` 聚合层头注亲读：
  **21 目录全量零内联**（NDP 纯数据模块，迭代 0057 terminal 入列后终态）；
  `packages/shared/test/nodes.baseline.json` 本轮 `node -e` 亲数 **21 键**；契约
  守护=nodes-dirs / defs-drift（期望表 42 参数形态）/ readme-consistency（nodes.ts
  头注载）——DEFS 扩展的联动面即此四件 + 参数计数断言收口。
- **属性面板渲染链**：DEFS 通用渲染（BK-0033 行先例「前端三文件预期零改动（DEFS
  通用渲染链）」）——combo 参数行预期零/极小前端改动；若需条件显隐（重试次数行仅
  重试语义时呈现）则 app.js 纯插入（0038 role-pick 先例形态，修宪轮授权内）。
- **优先序权威**：ADR-0022 §5 表——「参数 > env > 内建」采纳；「env>参数」「仅 env
  无参数」「仅参数无 env」三案已否决留档（后两案分别砍掉 BK-0048/BK-0020，链路
  断裂）；「BK-0048 参数面零预写（写死）」——本轮 SPEC 即该预写的合法落点。
- **修宪先例链（同 issue#6 授权）**：BK-0050（0037，12 场景重录+收口）/ BK-0046
  （0038，s12/s13 golden-created+撞号改号）/ BK-0049（0039，s13→s15 改号+首跑红
  留档）/ BK-0047（0065，s20 golden-created+缺陷态重录恰一次）——同链四轮修宪通道
  消费先例齐备，场景号按落盘时序裁决（ADR-0015 §5 先例三连）。
- **关键语义陷阱（PRD 亮明，SPEC 必答）**：ADR-0022 §3 明载「ON_ERROR_RETRIES 0 =
  退化 skip」且 env 默认 0——**若节点级 retry 参数不带次数承载，env 未配置（默认
  0）时节点 retry 即退化为 skip，参数形同虚设**。SPEC 须定节点级次数承载（方案
  对比见 §8-2），这是本项产品价值成立的前提条件。

## 3. 用户故事与价值

- **US-1（编排者）**：作为 AgentFlow 使用者，我希望给易失败的节点（http/code）单独
  设「重试」、给关键节点设「中止」、其余节点跟随全局缺省——**编排粒度**的失败策略，
  而不是对整个部署一刀切的 env。
- **US-2（进化循环自身）**：BK-9006 链收官、issue#6 关单；T5-M2 验收「节点失败可按
  策略降级」（ROADMAP.md:164）从引擎级（0069）补全到编排粒度，主题 M2 就此四验收
  全达成（BK-0014 记忆/发现器两项亦在 M2 清单，见 §7 后续）。

## 4. 功能范围（定界方向；参数面终稿归 SPEC，ADR-0022 §5 纪律）

- **REQ-0070-01 NDP 参数扩展**（受影响节点集合 SPEC 定）：PRD 推荐**全 21 类统一
  扩展**——引擎策略语义对所有 handler 生效（任一 handler 均可 throw），统一扩展
  避免「部分节点有策略、部分没有」的编排不对称；若 SPEC 论证收窄（如呈现型 sink
  无失败抛出路径），须给出逐类理由并以 handler 失败路径证据支撑。
- **REQ-0070-02 参数形态**：推荐 combo「失败策略」四值 = **跟随全局**（哨兵值承载
  「若设」语义的否定态，默认）/ 跳过 / 重试 / 中止 + 「重试次数」number（仅重试
  语义生效；值域对齐 env 0-5 或节点级独立值域、显隐形态，SPEC 定）——**必须解决
  §2 末条陷阱**；退避基值维持 env-only（推荐，节点级退避属过度细粒度，留演进缝
  注记）。
- **REQ-0070-03 引擎节点级解析**：runNode 内逐调用解析，优先序按 ADR-0022 §5 写死
  三层（节点参数（若设）> config 全局默认 > 内建缺省 skip+0+1000ms）；循环子节点
  per-call（§2.4）；机制全部复用 BK-0020 既有实现（重试循环/abortable sleep/
  onErrorAborted/node:error 终态一次/log 通报）零新增；**零新增 env**（config.ts
  零 diff 预期）。
- **REQ-0070-04 契约联动**：nodes.baseline.json 重产（经批准通道）+ nodes-dirs /
  defs-drift 期望表（新参数默认值入表）/ readme-consistency 联动 + 参数计数断言
  收口（42→42+N）+ 节点 README 生成器重跑（tools/gen-node-readmes.mjs 幂等）。
- **REQ-0070-05 属性面板呈现**：DEFS 通用渲染链优先零改动；条件显隐或特殊交互需要
  app.js 纯插入时逐处列清单（宪法冻结面——修宪轮授权内，纯插入优先，0038 先例）。
- **REQ-0070-06 gate 场景增量与修宪重录**：受波及场景（属性面板可见面——预期含
  s13/s14/s20 等参数面板呈现场景，**以 gate 实测为准**）修宪轮重录恰一次；如需专拍
  参数行交互则新增 golden-created 场景（编号按落盘时序，撞号按 ADR-0015 §5 裁决）；
  **golden 变更集收敛恰 SPEC 枚举，不多不少**（0056 教训）。
- **REQ-0070-07 smoke 扩断言**（节点级覆盖矩阵，新组 ID 避让既有组）：节点 retry
  覆盖 env 缺省 / 节点中止 fail-fast / 节点跟随全局→env 承接 / 全哨兵零漂移 /
  循环子节点 per-call。
- **REQ-0070-08 手动 E2E 点位**：属性面板设置策略→运行→观察降级行为（重试通报/
  中止失败卡）三点位，SPEC 细化。

### 不做范围（out of scope）

- 零新增 env 语义（config.ts 预期零 diff）；零 SSE 契约变更（既有
  node:error/run:done/log 事件承载——实施中确需新事件/新字段**立即中止转
  needs-approval**，ADR-0022 §4.4 硬护栏延续）；
- retry×abort 组合枚举、案 b 默认出边放行——否决/演进缝不在射程（ADR-0022
  §2.1/§2.2）；节点级退避基值不入本轮（演进缝）；
- 不动 BK-0018 面（memory 工具组，他路占位在途）与 BK-0064 面（工具 execute 异常
  可观测性，已独立立项 BACKLOG.md:85）——llm.ts 工具注入/异常路径零涉足；
- 不改 handlers.ts / store.ts / server-sync.js 消费链路（既有承接，ADR-0022 §1.2
  四层消费面亲核在案）。

## 5. 非功能要求

- 全部新增/改动源文件 ≤400 行（AGENTS.md 硬性约定 4）。
- **未设零漂移为硬护栏**：全部节点保持默认哨兵时，引擎行为与 0069 终态逐位一致，
  全量 smoke 既有断言（182/0 基线）零回退。
- 修宪射程=shared DEFS 扩展 + 属性面板参数行 + 波及 golden 重录，批复外零扩大
  （issue#6 批复射程=BK-9006「既有节点 UI 参数扩展杂项」之「on-error 参数」条目，
  BACKLOG.md:98 亲读）。

## 6. 触UI 分类结论（必答）

**触UI=是——修宪轮（宪法第 3 条通道，授权链 issue#6 批复承继 2026-10-24T08:38:51Z
在案），reconstitutional=true。**

- **结构层**：shared DEFS 参数扩展（POLICY 需批准区「packages/shared DEFS 变更」
  射程——由 issue#6 批复覆盖，BK-9006 拆分母项行亲读载明「on-error 参数」条目）。
- **视觉/交互层**：属性面板新增参数行 + combo 交互；受波及 golden 场景（参数面板
  呈现面）按 SPEC 枚举重录——`gate:update` 通道在授权链内（0037/0038/0039/0065
  四轮同链先例），**golden 变更集收敛恰枚举**；非波及场景零波及须 gate 实测证明。
- CI `ui-constitution` 推送后盯守（golden 权威在 CI）；s3-library 本机抖动按
  issue#12 纪律处置（复跑判定、双留档、不消费抖动重录）。

## 7. 依赖与后续

- **前置（均已兑现）**：BK-0020 终态 done（迭代 0069 合并 65e8c98，引擎三策略在
  主干存活本轮亲核）+ NDP 前置 BK-0021 done（21 目录全量，参数按
  src/nodes/<type>/node.ts 目录定义扩展）+ 授权链 issue#6 在案。
- **后续**：本项 CLOSE = **issue#6 关单回执**（BK-9006 链收官，脚本执行）；
  BK-0014 保持 ready、列下轮心跳候选首选；BK-0064 已独立立项不受波及。
- **并行路知会**：他路在途 BK-0018 重试轮（memory/{store,tools}.ts + llm/config/
  server/tools 接线 + MEM 套件）——与本轮产品面交集预期**仅 tests/smoke 插入型**
  （MEM 修复 vs 本轮新组；engine.ts/shared DEFS 零交集），预期「双方各自新增」型
  冲突按合并契约分类解决（0034 先例）；本项不因并行而改道。

## 8. SPEC 必答决策清单（PRD 给方向，SPEC 定稿；「零预写」纪律的合法落点）

1. **受影响节点集合**：全 21 类统一（推荐）vs 收窄子集（须逐类 handler 失败路径
   证据）；
2. **参数面**：参数名（建议 `onError` 系）/取值枚举/「跟随全局」哨兵形态/重试次数
   承载——**必须解决「env 默认 0 退化 skip 使节点 retry 虚设」陷阱**（推荐节点级
   number 参数仅重试语义生效；独立参数 vs 隐含下限的方案对比表必答）；
3. **面板形态**：无条件双行 vs 条件显隐（显隐需 app.js 纯插入清单逐处列明）；
4. **golden 变更集枚举**：波及场景清单 gate 实测定 + 新场景需求评估 + 重录恰一次；
5. **productFiles 白名单**：shared nodes/*.ts + nodes.ts + baseline + 契约测试 +
   engine.ts 解析层 + 前端三文件（若涉）+ smoke + gate.mjs；
6. **未设零漂移机器证明口径**：全哨兵 smoke 断言组 + gate 非波及场景零波及实测。

## 9. 验收标准（Given / When / Then）

- **AC1 未设零漂移（硬护栏）**：Given 全部节点保持默认哨兵且三 env 不配置；When
  全量 `npm run smoke:server` + `npm run gate`；Then 既有断言零回退（182/0 基线）、
  失败节点行为与 0069 终态逐位一致（下游失活、node:error 终态一次、ok 不反映失败）、
  非波及 gate 场景 diffPx=0。
- **AC2 优先序三层矩阵**：Given ①节点=跟随全局+env=retry ②节点=retry+env=skip
  ③全未配置；When 分别运行含失败节点的工作流；Then ①按 env retry 生效、②按节点
  retry 生效（**节点胜**）、③内建缺省 skip 与现状逐位一致（ADR-0022 §5）。
- **AC3 节点 retry 正例**：Given 节点设 retry+N（env 未配置）；When mock 必失败
  handler；Then 恰 N+1 次尝试、`log` warn 通报恰 N 次、`node:error` 终态恰 1 次且
  message 含尝试概要、耗尽后按 skip 终态下游失活、run:done ok 语义不变；Given
  第 N+1 次成功的 mock；Then 按成功路径收尾且结果以末次成功尝试为准。
- **AC4 节点 abort**：Given 节点设中止；When 运行含失败节点与同级独立分支的工作流；
  Then 失败后全部后续节点（含同级分支）不再调度、run:done `ok:false, stopped:false`、
  持久层 status='error'、`stopped` 恒保持用户/停机中止独占语义。
- **AC5 面板呈现与像素面**：Given 打开受影响节点属性面板；Then 参数行呈现、策略
  四值可切、默认「跟随全局」；gate 波及场景按 SPEC 枚举重录后**全量场景 diffPx=0**
  、DOM 不变量与基线一致；golden 变更集恰枚举（不多不少）。
- **AC6 契约守护**：Given DEFS 扩展落盘；When `npm test`；Then baseline 比对
  （重产后）全绿、defs-drift 期望表含新参数默认值、nodes-dirs/readme-consistency
  全绿、参数计数断言收口（42→42+N）。
- **AC7 循环子节点 per-call**：Given loop 体内节点自带策略参数；When 运行；Then
  策略按每次 runNode 调用独立解析生效（ADR-0022 §2.4）。
- **AC8 禁区机器证明**：Given 产品提交落盘；When `git show --numstat <产品提交>`
  + `git diff HEAD -- apps/server/src/config.ts packages/shared/src/events.ts`；
  Then 提交恰 SPEC 白名单路径、config.ts 零 diff（零新增 env）、events.ts schema
  行零变化（SSE 契约零变更）、lock 零变化（零新依赖）；**gate:update 消费恰 SPEC
  枚举的重录次数（修宪轮授权内）**。
- **AC9 回归面全绿**：Given 工作树内改动完成；When `npm run build` + `npm run gate`
  + `npm test` + `npm run smoke:server`；Then 四项全绿（s3-library 本机抖动按
  issue#12 纪律：复跑判定、双留档、绝不以抖动消费重录、golden 权威在 CI）。
- **AC10 回执与记账**：Given 本轮 SELECTED；When 核对 STATE.md 与 BACKLOG；Then
  STATE phase=PLAN / item=BK-0048 / updated 本轮时间；BACKLOG BK-0048 行本轮晋升注
  在案（done 终态回写归 CLOSE）；issue#6 关单回执归 CLOSE 脚本（链终轮，
  itemContinues=false）。

## 10. 验收命令口径

`npm run build` + `npm run gate`（重录后全绿 + 非波及场景零波及实测）+ `npm test` +
`npm run smoke:server`（扩断言零回退）+ AC2~AC4/AC7 定向 E2E / smoke 断言组实跑 +
机器证明（`git show --numstat` 恰白名单 + 禁区 diff 恒空）+ 指针抽样 ≥5 组
（engine.ts:79-99/:155/:183/:198、config.ts:35/:88-90/:140-142、
nodes/retrieval/node.ts params、nodes.ts 头注 21 目录、smoke-server.mjs:240-243——
均本轮亲核坐标）。

## 11. 风险与如实声明

- **golden 波及面宽度未知数**：属性面板可见的场景集合以 gate 实测为准；变更集收敛
  由 SPEC 枚举执法（0056 教训在案）；波及面超预期时如实上报，不超授权扩录。
- **gh 亲核未跑成（网络 TLS timeout ×2）**：issue#6 批复承继以在库记录为权威
  （§0 明载指针）；若后续轮发现实况矛盾立即中止上报。
- **并行合并风险**：与在途 BK-0018 轮在 tests/smoke 交集为插入型改动，按合并契约
  分类解决（0034 先例）；engine.ts/shared DEFS 零交集。
- **s3-library 本机抖动（issue#12 待批）**：复跑判定、双留档、golden 权威在 CI，
  不以抖动消费修宪重录次数。
- 修复循环 ≤2（WORKFLOW §4）；实现中发现需新 SSE 事件/新 env/影响面扩大——立即
  中止转 needs-approval，不得以契约改动迁就实现。
