# PRD · 迭代 0027 · BK-0032 BK-9002 拆分 SPEC 先行：通用智能体节点（agent）NDP 定义与 goal 模式会话面板的 ADR 草案 + 子项实施定界

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 11:19
> 来源：BACKLOG BK-0032（capability / 触UI=否 / **P0 / M / ready** / 来源 issue#2，
> BACKLOG.md:45）。2026-10-25 周度治理（W43 第四次）由 BK-9002[L→skipped] 拆分
> 落地的四项 SPEC 先行项之首；父项批复承继——issue#2 用户批复
> 2026-10-23T15:49:39Z 在案（BK-9002 行备注，BACKLOG.md:73），子项修宪轮
> （BK-0033/0034）沿用该授权，本项为其产出定界文档的先行轮。
> 定界权威：BACKLOG BK-0032 行内口径 + ROADMAP 待办节实施序列（ROADMAP.md:184-190
> 「SPEC 四连先行：BK-0032 → BK-0043 → BK-0035 → BK-0039…本序列为 PLAN 指导、
> 先例在案，优先于主池表序」）。先例：BK-0027（迭代 0017，BK-0013 拆分 SPEC 先行，
> 纯文档轮 ADR 草案 + 三子项定界回写 + VERBATIM 一致性验收）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9002 链
> SPEC 先行段，差异化主轴「画布编排 × 深度智能体工作台」，ROADMAP.md:124-130/156-168）。
> 批次编排：无——单项单迭代（M 级纯文档轮）。issue#2 名下姊妹子项 BK-0033
> （agent 节点修宪轮）/BK-0034（goal 面板修宪轮，链终轮）均未竟：本轮 done 仅发
> 进度回执、不关 issue#2（关单留 BK-0034 终轮 CLOSE，BK-0032/BK-9002 行备注明载
> 「中间子项不回执关单」；itemContinues=true）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 11:10~11:19 核实）

- **跨迭代续选**：无——BK-0021 批次链已于 0022 终轮收口、BK-0028/0029/0030 已于
  0023/0024/0025 相继 done、BK-0008 已于 0026 done（STATE.md:13 last_result +
  metrics 0023~0026 行）；0027 上一心跳为空转收尾（ready 仅余 L 级项待治理日拆分，
  68a8358 提交在案）——治理日拆分已解此渴，本轮从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作。issue 面板
  #2~#6 虽 open，但其批复均已在此前 PLAN 轮消化入行（#2~#5 于 2026-10-23 批复、
  #6 于迭代 0021 轮批复；2026-10-25 治理日完成 L 项拆分 BK-0032~0050，四 SPEC
  先行项 ready，BACKLOG.md:34-39 治理日记注 + 待批准区 :120-124）——无新增
  ready 义务、无 skipped 改写、无建行。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 五项且均已批复承继在
  案，无 user-request 条目；无建行、无 uiIssueNumbers）。
- ③ **rejected**：无 → 无 skipped 改写。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - ready 非 doc 四项全貌（BACKLOG 主池亲核）：BK-0032（P0/M，issue#2 SPEC
    先行）、BK-0043（P0/M，issue#5 PTY 安全方案 SPEC 先行）、BK-0035（P0/S，
    issue#3 呈现三件套 SPEC 先行）、BK-0039（P0/S，issue#4 工作台 SPEC 先行）；
    BK-0051（P1/S，doc，proposed）——类型 doc 心跳不选（WORKFLOW §4），且状态
    非 ready，双重不入选。
  - 四项均 P0、均 S/M（「优先 S/M」口径全满足）、均无前置（各自行内明载：
    BK-0016 sessions API done、BK-0021 NDP done 地基就位）——同级并列时以
    ROADMAP 待办节实施序列定序：**BK-0032 为 SPEC 四连先行首位**（治理日明载
    理由：BK-9002 链为差异化主轴且其 SPEC 牵动 BK-0015 联合评估，最优先解出）。
  - **→ 选 BK-0032**：亦是「用户 issue 批复产生的 ready 项」（优先序①语义，
    来源 issue#2 直连）。
- **侦察档案核对**：残缺标记 `tools.ts:5/:138` 为 BK-0005/0008 落地的 stub 如实
  降级设计面（sqlite 已翻真，:138 为未注册外部工具的兜底 stub——迭代 0025 inject
  设计），非新立项对象；`package-lock.json:787` 为 base64 哈希偶合非标记；悬挂
  run 探针 `[]` = BK-0011 启动扫尾预期表现（迭代 0019 done）——无补题需求。
  覆盖差集/文档漂移/dogfooding 已由治理日承载（BK-0051 在库，下个治理日消化）。
- 与最近 3 次迭代重叠面：0024/0025/0026 全部改动面在 apps/server/src/mcp/、
  tools.ts、config.ts、guard.ts、llm.ts（注入接线）与 tests/smoke——本项纯文档轮
  零代码，对三次迭代产物零触碰（仅文档引用其结论：ADR-0012 链、BK-0028~0030
  地基为 agent 节点工具生态的既有面）。

## 结论

**建议做**：一句话理由——ROADMAP 治理日钦定 SPEC 四连先行首位（差异化主轴
BK-9002 链的定界文档），纯文档轮零代码零依赖边际成本最低；BK-0016（sessions
五端点）与 BK-0021（NDP 目录制）两大前置均 done，地基齐备；定界产出直接解阻
BK-0033/0034 两个修宪实现轮并顺带完成 BK-0015 agent loop 预算承载的最小需批准
面评估（避免双 SPEC 重复设计，治理日建议在案）。非修宪轮、全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证：

1. 本迭代唯一产品路径为 `docs/adr/0013-*.md` 纯新增（编号按落盘时序——本会话
   `ls docs/adr` 亲核现行至 0012；BK-0027 行内既定口径）。`apps/**`、
   `packages/**`、`tools/**`、`tests/**`、`.github/**`、golden 基线、
   package.json/lock 零接触——视觉 / DOM 结构 / 交互三层无涉，**全程禁
   `npm run gate:update`**（POLICY 禁止区）。
2. ADR **草案内容**虽描述未来的 UI 修宪方案（agent 节点 DEFS+类目色、goal 面板），
   但 ADR 本身是文档（CONSTITUTION 第 4 条「不适用」面；POLICY 自主区「文档与
   实现同步」）。实施轮（BK-0033/0034）才是修宪轮，其授权链 = issue#2 批复承继
   （2026-10-23T15:49:39Z 在案）+ 该 ADR——本 PRD 仅产出定界，不预支任何 UI 改动。
3. 护栏预埋：ADR 中 goal 面板事件消费映射须声明「在既有 15 种 SSE 事件内取用，
   确需新增即中止转 needs-approval」（沿 BK-0016 行内护栏先例，本会话
   events.ts:8-39 亲核 15 种在案）。

## 背景（代码事实，本会话 2026-10-25 11:10~11:19 只读核实）

1. **sessions 五端点地基（BK-0016 done，迭代 0015）**：`apps/server/src/sessions.ts`
   176 行；路由五条 `server.ts:215-219`（POST/GET /api/v1/sessions、GET
   /:id、POST /:id/chat、POST /:id/stop——grep 亲核）；会话级 SSE 由
   sessionChatHandler 流式承载（步①-⑬ 全序，DESC 20 条历史反序组装）。BK-0032
   行内口径「goal 面板对五端点与既有 15 种 SSE 事件的消费映射」即以此为锚。
2. **SSE 事件契约 15 种**：`packages/shared/src/events.ts:8-39`
   RunEventSchema z.discriminatedUnion 15 个 z.literal type（run:accepted/start/
   progress/error/done、node:start/bypass/delta/done/error、cond、log、output、
   approval:required/done——grep 亲核）。BK-0016 曾在 15 种内取用 7 种零新增，
   为本项消费映射的直接先例。
3. **NDP 目录制终态（BK-0021 done，迭代 0021/0022）**：`packages/shared/src/nodes/`
   16 目录 + README（ls 亲核：approval/code/condition/delay/http/llm/loop/merge/
   notify/prompt/reply/retrieval/setvar/trigger/userinput/websearch）；
   `nodes.ts` 142 行聚合层（三导出不变）；守卫/快照测试四件在库
   （nodes.baseline.json sha256 08ba1229…f275，等价性铁证）。agent 节点将按
   `src/nodes/agent/node.ts` 目录制定义——「先迁移后扩展」兑现（ROADMAP:163-164）。
4. **agent loop 现状锚点（BK-0015 联合评估对象）**：`apps/server/src/llm.ts:70`
   `for(let round=1; round<=3; round++)` 定长工具循环（grep 亲核，126 行文件）。
   BK-0015 行内备注明载预算承载三选一均触需批准区（新 env=环境变量语义；新节点
   参数=DEFS+触 UI；引擎常量=无预算意义），治理日建议「与 BK-0032 SPEC 联合评估
   最小需批准面，避免双 SPEC 重复设计」（BACKLOG.md:92 + ROADMAP:149-150）。
5. **golden 场景现状**：`tools/pixel-gate/gate.mjs:176-185` SCENARIOS 恰 8 项
   s0~s7（sed 亲核）。BK-9001 链先例：新场景走 golden-created 通道（gate.mjs:192-196
   先例，迭代 0011）、受波及既有场景修宪轮 gate:update 重录（迭代 0013 先例）。
   ADR 的「golden 场景增量预案 s8+」以此为基。
6. **类目色宪法面**：节点分类色标题栏属宪法第 1 条视觉层（CONSTITUTION.md:12-15）；
   agent 节点入列即触节点库呈现（独立「智能体」类目归 BK-0050，BACKLOG.md:63）。
   ADR 须给出类目色方案（视觉规格源自 ComfyUI 实机逐像素采样口径，README 视觉规格表）。
7. **ADR 体系现状**：`docs/adr/` 现行 0001~0012（ls 亲核）；ADR-0012（283 行）为
   BK-0027 先例同款「草案 · 待用户批准」双位标注样板；本项 ADR 编号 **0013**。
8. **工作区干净**（`git status --porcelain` 输出空，本会话亲跑）；HEAD = f16663d
   （周度治理 W43 四次归档提交）。

## 目标与范围

**做（本迭代产品提交面 = docs/adr/0013-*.md 单文件纯新增）**：

1. **ADR-0013 草案落盘**（≤400 行，建议 280±60 区间对齐 ADR-0012 体量），六要素：
   - ① **动机**：差异化定位（画布编排 × 深度智能体工作台空白带，T5 治理日竞品
     对照结论在案）+ 用户 issue#2 链上下文；
   - ② **影响面**：BK-0033 段（agent 节点：shared NDP 目录 + 注册表 + 后端
     handler + 前端三文件）与 BK-0034 段（goal 面板：前端三文件为主 + sessions
     消费）分链列明受影响文件清单（沿各 BACKLOG 行既有口径细化）；
   - ③ **像素对比证据的获取方式**（宪法第 3 条要素）：golden 场景增量预案 s8+
     ——agent 节点入画布新场景 / goal 面板在线态新场景走 golden-created 通道，
     受波及既有 s0~s7 场景修宪轮 gate:update 重录（0011/0013 先例双通道口径）；
   - ④ **agent 节点 DEFS+类目色方案**：NDP 目录 src/nodes/agent/{node.ts,
     README.md} 定义草图（节点名/参数/默认值/端口/关键词——DEFS 形态对齐 16 既有
     节点 nodes.schema.ts 纪律）+ 类目色取值方案（节点库暂归既有类目、独立类目归
     BK-0050 的两段口径，BACKLOG.md:46 既定）+ 会话/预算承载的 handler 边界；
   - ⑤ **goal 面板消费映射**：对 /api/v1/sessions 五端点（server.ts:215-219）
     与既有 15 种 SSE 事件（events.ts:8-39）的逐端点/逐事件消费映射表 + 护栏
     声明（15 种内取用，新增即中止转 needs-approval）；
   - ⑥ **BK-0033/0034 定界**：两子项各自受影响文件清单、验收命令口径、实施序
     （0033 与 0034 可分批修宪，先后由本 ADR 定夺——面板不依赖节点入列亦可独立
     验收，BK-0034 行内既留此自由度）。
2. **BK-0015 联合评估专节**：agent loop 预算承载（llm.ts:70 现状）三选一方案的
   最小需批准面结论；若结论含需批准面（新 env / 新 DEFS 参数），列明须另开
   needs-approval 的清单与请批话术要点（沿 BK-0043 行内「父项批复不自动覆盖
   依赖面」口径）——issue#2 批复不自动覆盖该面。
3. **BK-0033/0034 定界回写**：BACKLOG 两行备注按 ADR 定界节更新（引用 ADR-0013
   编号与节号，VERBATIM 一致；回写随归档提交入库，与 0011~0026 同机制——
   BK-0027 先例「三行备注与 SPEC §7 模板字节级一致回写」）。

**不做（out of scope）**：

- 零代码、零依赖、零 shared 契约、零 env、零出站、零 UI、零 golden 接触
  （纯文档轮；`git diff -- apps packages tools tests .github package.json
  package-lock.json` 恒空为机器证明）。
- 不实现 agent 节点/goal 面板的任何一行产品代码（实施归 BK-0033/0034 修宪轮）；
  不开新 needs-approval issue（本项自身无新增请批面；BK-0015 评估若产出请批
  清单，仅记录于 ADR，开 issue 留其实施立项时按先例执行）。
- BK-0043/BK-0035/BK-0039（SPEC 四连先行的后三位）不在本轮——一次迭代一件事；
  BK-0050 节点库类目、BK-0019/0020 后端语义项均不在本轮。
- `npm run gate:update` / golden 任何接触（POLICY 禁止区）。

## 受影响文件清单（= 产品提交白名单；SPEC 阶段定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `docs/adr/0013-*.md`（命名 SPEC 定，语义：agent 节点 + goal 模式会话面板修宪方案） | 纯新增 | ~280（≤400，AGENTS.md 硬性约定 4；对齐 ADR-0012 体量） |

机制件（随归档提交，不属产品白名单）：`docs/evolution/BACKLOG.md`（BK-0032 置
done + BK-0033/0034 定界回写 + BK-0015 备注按评估结论刷新）、
`docs/evolution/STATE.md`、`docs/evolution/metrics.md`、`iterations/0027/` 四件。

零改动白名单：`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、
根/子包 `package.json` 与 `package-lock.json`、`README.md`（BK-0051 漂移归治理日）。

## 验收标准（Given/When/Then）

- **AC1 · ADR 落盘与六要素完备**：Given 工作区干净、docs/adr 现行至 0012，When
  产品提交落盘，Then `docs/adr/0013-*.md` 恰一文件纯新增、行数 ≤400，含六要素
  （动机/影响面/像素对比证据方案/agent 节点 DEFS+类目色方案/goal 面板消费映射/
  BK-0033+0034 定界）且每要素成节可索引；标题与状态标注含「草案」字样（实施
  授权链引用：issue#2 批复 2026-10-23T15:49:39Z 承继，留 BK-0033/0034 消费）。
- **AC2 · 消费映射与护栏真实可核**：Given ADR 消费映射节，When 按映射表逐条
  对照 `server.ts:215-219`（五端点）与 `events.ts:8-39`（15 事件），Then 端点/
  事件名与代码逐一相符、无一杜撰；节内含「15 种内取用，确需新增即中止转
  needs-approval」护栏声明（BK-0016 先例口径字面在）。
- **AC3 · BK-0015 联合评估成文**：Given ADR 专节，When 读评估结论，Then 覆盖
  llm.ts:70 定长 round≤3 现状、三选一承载方案（env/DEFS 参数/引擎常量）逐一
  利弊、最小需批准面明示；含需批准面时附「须另开 needs-approval」清单（沿
  BK-0043 口径：issue#2 批复不自动覆盖），不含时明示「零请批面」及依据。
- **AC4 · 定界回写 VERBATIM 一致**：When 核对 BACKLOG BK-0033/BK-0034 行备注与
  ADR 定界节，Then 两行受影响文件清单/验收命令口径/实施序与 ADR 字面一致
  （BK-0027 先例 VERBATIM-OK 标准）；BK-0015 行备注按评估结论刷新；回写随归档
  提交（产品提交仍恰 1 路径）。
- **AC5 · 白名单与零代码机器证明**：When `git show --numstat <产品提交>` 与
  `git diff` 核对，Then 产品提交恰 `docs/adr/0013-*.md` 一路径纯新增（+N/−0）；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空；`package-lock.json` 零变化（零依赖证明）。
- **AC6 · 纯回归面全绿**：When `npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server` 执行，Then 全部 exit 0——gate 8 场景 diffPx=0、契约
  测试全绿、smoke 95 passed / 0 failed（现基线，metrics 0026 行；本轮零代码
  理论零漂移，任何红即环境异常回滚不硬闯）。
- **AC7 · 指针抽样可开**：When 从 ADR 引用的代码/文件/issue 指针抽样 ≥5 条逐一
  打开，Then 全部命中无误（建议抽样：server.ts:215-219、events.ts:8-39、
  llm.ts:70、gate.mjs:176-185、nodes.ts 聚合层或 nodes/ 16 目录、BK-0016/
  BK-0021 BACKLOG 行、issue#2 链任五以上）。

## 非功能要求

1. 行数预算：ADR ≤400 行（唯一新增文件，符合 AGENTS.md 硬性约定 4）。
2. 零新依赖 / 零新 env / 零出站类别 / 零 shared 契约 / 零 UI 接触 / 零 golden
   接触（POLICY 自主区「文档与实现同步」；lock 零变化为机器证明）。
3. ADR 双位标注纪律：「草案 · 待实施轮消费」状态位 + 编号顺位（0013）与
   ADR-0012 样板一致；不写「已批准」字样（issue#2 批复承继的是修宪实施授权，
   ADR 自身在实施轮 CLOSE 时按先例更新状态行——0010/0012 先例）。
4. EOL 纪律：新文件 LF、无 BOM。
5. 回滚 = `git revert` 单提交（纯文档，无迁移面）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| ADR 越界预支实现（草案写成实施细节伪代码堆砌） | 定界粒度锚定 BK-0027 先例：方案草图 + 文件清单 + 验收口径，不写产品代码；SPEC 阶段逐节审 |
| BK-0015 联合评估越权定案（把需批准面写成已授权） | AC3 硬性区分「评估结论」与「请批清单」；issue#2 批复覆盖面以 issue 正文为准（BK-0043 行内口径字面引用）；评估仅记录不实施 |
| 消费映射杜撰端点/事件（未对照代码） | AC2 逐条对照本会话亲核锚点（server.ts:215-219 / events.ts:8-39）；VERIFY 指针抽样兜底 |
| 定界回写与 ADR 漂移（两处口径不一） | AC4 VERBATIM 一致（BK-0027 VERBATIM-OK 先例）；回写随归档提交前由 VERIFY 逐字比对 |
| agent 节点 DEFS 方案与 16 既有节点 schema 纪律不符 | ADR 引用 nodes.schema.ts 纪律 + BK-0021 守卫测试联动口径（nodes.baseline.json 重产走批准通道，BK-0033 行内既定） |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022/0024 先例） | 沿先例口径：提交后 CLOSE 复跑自愈，VERIFY 记实得值判据 0 failed |

## 需求清单（REQ-0032-xx）

- REQ-0032-01：ADR-0013 草案落盘（六要素 + 草案标注 + 授权链引用，AC1/AC2/AC3）。
- REQ-0032-02：BK-0015 联合评估专节（最小需批准面结论 + 请批清单如有，AC3）。
- REQ-0032-03：BK-0033/BK-0034/BK-0015 三行 BACKLOG 定界回写 VERBATIM（AC4）。
- REQ-0032-04：边界不变式——产品提交恰 docs/adr/0013-*.md 一路径、零代码零
  依赖零 shared 零 UI 零 golden（AC5）；全程禁 gate:update。
- REQ-0032-05：纯回归面全绿 + 指针抽样（AC6/AC7）；产品提交恰一个
  （Conventional Commits，如 `docs(adr): BK-0032 agent 节点与 goal 会话面板
  修宪方案 ADR 草案 + 子项定界`）。

## SPEC 阶段衔接说明

BK-0032 为 M 项，**不免 SPEC（skipSpec=false）**。SPEC 以本 PRD 六要素框架展开：
① ADR 章节骨架与行数预算分配（各要素节建议行数区间）；② agent 节点 DEFS 草图
的最小完备集（参数/端口/默认值形态，对齐 nodes.schema.ts zod 纪律）；③ 消费
映射表的两栏制式（端点→面板行为 / 事件→呈现语义）；④ golden s8+ 场景清单
预案的表述边界（只列场景名与触发条件，不写 gate.mjs 代码）；⑤ BK-0015 评估的
论证模板（现状锚点→三选一→最小面结论）；⑥ 定界回写的字面模板（BACKLOG 行
备注增量段，供 VERIFY VERBATIM 比对）。新架构决策：无（needsAdr=false——本项
产品即 ADR 草案本身，不再叠 ADR；SPEC/实施冲突时以 CONSTITUTION > 代码现状 >
本 PRD 为顺位）。
