# PRD · 迭代 0028 · BK-0043 BK-9005 拆分安全方案 SPEC 先行：PTY 交互终端「安全世界设计」ADR 草案

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 12:15
> 来源：BACKLOG BK-0043（capability / 触UI=否 / **P0 / M / ready** / 来源 issue#5，
> BACKLOG.md:56）。2026-10-25 周度治理（W43 第四次）由 BK-9005[L→skipped] 拆分
> 落地的四项 SPEC 先行项之二；父项批复承继——issue#5 用户批复
> 2026-10-23T15:49:06Z 在案（BK-9005 行备注，BACKLOG.md:76），但**批复不自动
> 覆盖依赖面**：node-pty 类新依赖与出站类别若定为需要，须另开 needs-approval
> issue（沿 BK-0027→#10 先例，BK-0043 行内明载）。
> 定界权威：BACKLOG BK-0043 行内口径 + ROADMAP 待办节实施序列（ROADMAP.md:184-190
> 「SPEC 四连先行：BK-0032 → BK-0043 → BK-0035 → BK-0039（0043 提前系因 BK-9005
> 链含外部依赖审批门控，其 SPEC 与依赖 needs-approval issue 尽早开出，等待期可
> 与后续 SPEC 并行）……本序列为 PLAN 指导、先例在案，优先于主池表序」）。
> 先例：BK-0027（迭代 0017，ADR-0012 草案 + 附录 A 请批 issue 五要素）、BK-0032
> （迭代 0027，ADR-0013 草案 + 子项定界回写 VERBATIM）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9005 链
> SPEC 先行段；差异化主轴「画布编排 × 深度智能体工作台」，ROADMAP.md:124-130/156-168）。
> 批次编排：无——单项单迭代（M 级纯文档轮）。issue#5 名下姊妹子项 BK-0044
> （PTY 后端运行时）/BK-0045（终端节点 UI，链终轮）均未竟：本轮 done 仅发进度
> 回执、不关 issue#5（关单留 BK-0045 终轮 CLOSE，BK-0043/0045 行内明载；itemContinues=true）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 12:10~12:15 核实）

- **跨迭代续选**：无——BK-0021 批次链已于 0022 终轮收口、BK-0028/0029/0030 已于
  0023/0024/0025 相继 done、BK-0008 已于 0026 done、BK-0032 已于 0027 done
  （STATE.md:13 last_result：ADR-0013 落盘 + 定界回写 VERBATIM ×3，产品提交
  ef54320）——本轮从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作。issue 面板
  #2~#6 虽 open，但其批复均已在此前 PLAN 轮消化入行（#2~#5 于 2026-10-23 批复、
  #6 于迭代 0021 轮批复；2026-10-25 治理日完成 L 项拆分 BK-0032~0050，四 SPEC
  先行项 ready，BACKLOG.md:34-39 治理日记注）——无新增 ready 义务、无 skipped
  改写、无建行。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 五项且均已批复承继在
  案，无 user-request 条目；无建行、无 uiIssueNumbers）。
- ③ **rejected**：无 → 无 skipped 改写。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - ready 非 doc 三项全貌（BACKLOG 主池亲核）：BK-0043（P0/M，issue#5 PTY 安全
    方案 SPEC 先行）、BK-0035（P0/S，issue#3 呈现三件套 SPEC 先行）、BK-0039
    （P0/S，issue#4 工作台 SPEC 先行）；BK-0051（P1/S，doc，proposed）——类型
    doc 心跳不选（WORKFLOW §4），且状态非 ready，双重不入选。
  - **BK-0033/BK-0034 晋升（本轮 PLAN 轮义务）**：两行晋升条件「BK-0032 CLOSE
    后由心跳 PLAN 轮晋升 ready」已随迭代 0027 终态 done 兑现（STATE.md:13
    last_result 明载「BK-0033/0034 晋升条件就此满足（由心跳 PLAN 轮晋升
    ready）」）→ 本轮将两行 proposed → ready 回写 BACKLOG。但按 ROADMAP 实施序列
    （SPEC 四连先行先于 BK-9002 链实现段，ROADMAP.md:186-190），两实现项排位在
    0035/0039 之后，本轮不选。
  - **→ 选 BK-0043**：三项均 P0、均 S/M（「优先 S/M」口径全满足）、均无未竟前置
    （BK-0021 NDP done 地基就位），同级并列以 ROADMAP 待办节实施序列定序——
    **BK-0043 为 SPEC 四连先行第二位**（治理日明载提前理由：BK-9005 链含外部
    依赖审批门控，SPEC 与依赖 needs-approval issue 尽早开出，用户批复等待期可与
    后续 SPEC 并行；ROADMAP.md:205-209 亦明载「下一个预期新批项 = BK-0043 SPEC
    产出的 PTY 依赖/出站清单（若需）」）。亦系「用户 issue 批复产生的 ready 项」
    （优先序①语义，来源 issue#5 直连）。
- **侦察档案核对**：残缺标记 `tools.ts:5/:138` 为 BK-0005/0008 落地的 stub 如实
  降级设计面（:138 为未注册外部工具兜底 stub——迭代 0025 inject 设计，0027 PRD
  同判），非新立项对象；`package-lock.json:787` 为 base64 哈希偶合非标记；悬挂
  run 探针 `[]` = BK-0011 启动扫尾预期表现（迭代 0019 done）——无补题需求。
  覆盖差集/文档漂移/dogfooding 已由治理日承载（BK-0051 在库，下个治理日消化）。
- 与最近 3 次迭代重叠面：0025/0026/0027 改动面在 apps/server/src/{guard,llm,
  tools,mcp/}、config.ts 与 docs/adr/0013——本项纯文档轮零代码，对三次迭代产物
  零触碰（仅文档**引用**其结论：BK-0028/0030 连接生命周期与 guard 出站收口为
  ADR-0014 的安全设计先例素材）。

## 结论

**建议做**：一句话理由——ROADMAP 治理日钦定 SPEC 四连先行第二位且提前理由明确
（PTY 链含外部依赖审批门控，安全方案与请批清单越早开出、用户批复等待期越能与
后续 SPEC 并行，缩短整链关键路径）；纯文档轮零代码零依赖边际成本最低；BK-0021
（NDP）前置已 done、BK-0028/0030 生命周期与 guard 先例、code.ts 子进程+超时、
tools.ts 沙箱锚定等安全素材齐备，评估有据可依。「安全世界设计先行」是 BK-9005
立项语的原文承诺（BACKLOG.md:76），本轮即其兑现。非修宪轮、全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证：

1. 本迭代唯一产品路径为 `docs/adr/0014-*.md` 纯新增（编号按落盘时序——本会话
   `ls docs/adr` 亲核现行至 0013）。`apps/**`、`packages/**`、`tools/**`、
   `tests/**`、`.github/**`、golden 基线、package.json/lock 零接触——视觉 /
   DOM 结构 / 交互三层无涉，**全程禁 `npm run gate:update`**（POLICY 禁止区）。
2. ADR **草案内容**虽为未来 PTY 终端节点（BK-0045，触UI=是修宪轮）与后端运行时
   （BK-0044，触UI=否但含需批准面）定界，但 ADR 本身是文档（CONSTITUTION 第 4 条
   「不适用」面；POLICY 自主区「文档与实现同步」）。BK-0045 的修宪授权 = issue#5
   批复承继（2026-10-23T15:49:06Z）+ 本 ADR；BK-0044 的依赖面授权须**另开**
   needs-approval issue 获批（父项批复不自动覆盖，行内既定口径）——本 PRD 仅
   产出评估与请批清单草案，不预支任何依赖安装与代码实现。
3. 护栏预埋：若 ADR 评估结论需要 node-pty 类新依赖或新出站类别，ADR 附录 A 给出
   issue 草案五要素，开 issue 与批复归脚本/用户（沿 BK-0027→#10 先例：批复前
   BK-0044 不转 ready）；若评估为零请批面，须明示依据。两种结论都不改变本轮
   「零依赖零代码」边界。

## 背景（代码事实，本会话 2026-10-25 12:10~12:15 只读核实）

1. **issue#5 与拆分链**：交互式 PTY 终端节点（用户与 agent 共享 shell 会话）。
   治理日拆分：BK-0043（安全方案 SPEC 先行，本项）→ BK-0044（后端运行时：会话
   管理 + /api/v1 pty 端点流式/写入 + 生命周期约束，proposed，前置=BK-0043 CLOSE
   且依赖 issue 获批）→ BK-0045（终端节点 UI 修宪轮，链终轮回执关单 #5，
   BACKLOG.md:57-58）。用户共享会话 = 双写方（用户键入 + agent 注入）是本链
   区别于既有单向工具面的核心安全议题。
2. **子进程+超时纪律先例（AGENTS.md 硬性约定 3 同等强度基准）**：
   `apps/server/src/code.ts:50` `spawn(cmd, argv, {stdio:['pipe','pipe','pipe']})`
   子进程承载代码节点；`:53` `setTimeout(...5000)` 超时 kill、`:60` 超时错误
   语义「执行超时（5s），已终止」——PTY 会话是「长驻交互式」形态，须评估该纪律
   （一次性 5s 硬超时）对长会话的外推方案（idle 超时 / 最大会话时长 / 显式停止）。
3. **沙箱锚定先例**：`apps/server/src/tools.ts:16` SANDBOX 常量锚定
   `apps/server/sandbox/`；`:19-20` 路径越界拒绝（「只允许访问沙箱目录」）；
   `:23` ensureSandbox 惰性建目录；`:26` 起 mcp-sqlite.db DB 锚定沙箱专用文件
   （迭代 0026）——PTY 会话工作目录锚定策略（cwd 是否限沙箱）为 ADR 必答项。
4. **出站收口先例**：`apps/server/src/guard.ts` 现五出口——`:59` guardedFetch
   （私网拦截/ALLOW_PRIVATE_NET 逃生/协议白名单）、`:71/:81/:93` 博查/DuckDuckGo/
   SearXNG 搜索网关、`:107` mcpFetch（MCP Streamable HTTP 类别，迭代 0025）——
   PTY 进程内网络访问不经 guard.ts（子进程内任意命令），是「新出站类别评估」的
   事实基点，ADR 须直面并给出风险处置选项。
5. **连接生命周期先例（BK-0028/0030）**：`apps/server/src/mcp/connection.ts:25-30`
   五面接口（connect/listTools/callTool(+signal)/close + timeoutMs 参数化）；
   `:46-47` connectAttempted/closed 标志（握手失败也拆链防 stdio 孤儿、close
   幂等）；inject.ts per-call 连接 finally close + abort 级联（迭代 0025）——
   PTY 会话生命周期（run 中止时会话存续？close 幂等？孤儿防护）沿此先例评估。
6. **会话与停机中止级联先例（BK-0016）**：`apps/server/src/sessions.ts` 176 行
   五端点 + `server.ts:38-39` abortActiveSessions/activeSessionCount 停机出口
   （优雅停机并入会话中止）；sessions 路由 `server.ts:215-217`（v1-only 先例）——
   BK-0044 的 /api/v1 pty 端点形态与停机级联语义可类比对齐。
7. **env 语义需批准先例**：`apps/server/src/config.ts:33` env 白名单现含
   MCP_HTTP_SERVERS/MCP_STDIO_SERVERS（迭代 0024，新 env 语义经 issue#10 批准）——
   PTY 若需 env 承载（如会话上限/超时档位）同属需批准面，ADR 请批清单须含此评估。
8. **PTY 现状零承载**：本会话 `grep -rn "node-pty|pty" apps/server/src/
   package.json apps/server/package.json` 零命中——仓内无任何 PTY 依赖与模块；
   node-pty 为 native module，构建/重编译纪律可对照 better-sqlite3 教训
   （AGENTS.md 已知陷阱：Node 大版本升级需重装编译 + allowScripts 审批）。
9. **ADR 体系现状**：`docs/adr/` 现行 0001~0013（ls 亲核）；ADR-0012（283 行）
   为「草案 · 待用户批准」+ 附录 A needs-approval issue 五要素样板（依赖/出站/
   env 请批直系先例）；本项 ADR 编号 **0014**。
10. **工作区干净**（`git status --porcelain` 输出空，本会话亲跑）；HEAD = 51b2ad8
    （迭代 0027 归档提交）。

## 目标与范围

**做（本迭代产品提交面 = docs/adr/0014-*.md 单文件纯新增）**：

1. **ADR-0014 草案落盘**（≤400 行，建议 280±60 区间对齐 ADR-0012 体量）：
   - ① **动机**：issue#5 链上下文 + 「安全世界设计先行」立项语兑现 + 差异化定位
     （深度智能体工作台空白带，T5 竞品对照结论在案）；
   - ② **PTY 会话进程模型与沙箱边界**：进程拓扑（每会话一子进程 vs 池化）、
     工作目录锚定方案（对齐 tools.ts:16 沙箱纪律或论证例外）、资源限额面、
     与 AGENTS.md 硬性约定 3（guard 出站/文件限沙箱/子进程+超时）逐条的同等
     强度对照表——交互式长会话形态下的外推结论；
   - ③ **用户与 agent 共享会话的权限/审计面**：双写方标识（用户键入 vs agent
     注入的溯源）、审计留痕方案（沿 store.ts approval_audits 审计先例）、
     危险命令面处置策略选项（仅警示/拦截清单/白名单模式）及推荐；
   - ④ **超时/生命周期/中止级联**：idle 超时、最大会话时长、显式停止语义、
     run 中止与会话存续关系、close 幂等与孤儿防护（沿 connection.ts:46-47 与
     sessions abortActiveSessions 先例）；
   - ⑤ **node-pty 类新依赖与出站类别评估**：依赖选型利弊（node-pty 及替代）、
     native 构建/CI 影响（对照 better-sqlite3 教训与 allowScripts 纪律）、
     PTY 子进程内网络访问不径走 guard.ts 的事实与风险处置、env 承载需求评估
     （对照 config.ts 白名单纪律）；
   - ⑥ **附录 A · 请批清单（若有）**：结论为「有需批准面」时给出 needs-approval
     issue 草案五要素（沿 ADR-0012 附录 A / BK-0027→#10 先例，父项 issue#5 批复
     不自动覆盖）；结论为「零请批面」时明示依据；
   - ⑦ **BK-0044/BK-0045 定界**：两子项受影响文件清单、验收命令口径、实施序
     （0044 待依赖批复后晋升、0045 修宪轮待 0044 CLOSE）。
2. **BK-0044/BK-0045 定界回写**：BACKLOG 两行备注按 ADR 定界节更新（引用
   ADR-0014 编号与节号，VERBATIM 一致；回写随归档提交入库，与 0011~0027 同机制
   ——BK-0027/BK-0032 先例）。

**不做（out of scope）**：

- 零代码、零依赖、零 env、零出站、零 UI、零 golden 接触（纯文档轮；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空为机器证明）。
- 不实现任何 PTY 会话/端点/节点代码（实施归 BK-0044/0045）；不安装 node-pty；
  不开 needs-approval issue（开 issue 归脚本持 ADR 附录 A 字面量执行，沿
  BK-0027→#10 先例）；不改 shared 契约。
- BK-0035/BK-0039（SPEC 四连先行后两位）与 BK-0033/0034（BK-9002 链实现段）
  不在本轮——一次迭代一件事。
- `npm run gate:update` / golden 任何接触（POLICY 禁止区）。

## 受影响文件清单（= 产品提交白名单；SPEC 阶段定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `docs/adr/0014-*.md`（命名 SPEC 定，语义：PTY 交互终端安全世界设计） | 纯新增 | ~280（≤400，AGENTS.md 硬性约定 4；对齐 ADR-0012 体量） |

机制件（随归档提交，不属产品白名单）：`docs/evolution/BACKLOG.md`（BK-0043 置
done + BK-0044/0045 定界回写 + BK-0033/0034 晋升 ready 回写）、
`docs/evolution/STATE.md`、`docs/evolution/metrics.md`、`iterations/0028/` 四件。

零改动白名单：`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、
根/子包 `package.json` 与 `package-lock.json`、`README.md`（BK-0051 漂移归治理日）。

## 验收标准（Given/When/Then）

- **AC1 · ADR 落盘与要素完备**：Given 工作区干净、docs/adr 现行至 0013，When
  产品提交落盘，Then `docs/adr/0014-*.md` 恰一文件纯新增、行数 ≤400，含七要素
  （动机/进程模型与沙箱边界/共享会话权限与审计/超时与生命周期/依赖与出站评估/
  请批清单或零请批结论/子项定界）且每要素成节可索引；标题与状态标注含「草案」
  字样；授权链引用：issue#5 批复 2026-10-23T15:49:06Z 承继（BK-0045 修宪轮消费）
  且明示「依赖面须另批、父项批复不自动覆盖」。
- **AC2 · 安全设计锚点真实可核**：Given ADR 安全设计各节，When 按引用逐条对照
  代码锚点（code.ts:50/:53 子进程+超时、tools.ts:16-23 沙箱锚定与越界拒绝、
  guard.ts:59/:107 出站收口、connection.ts:25-30/:46-47 生命周期、config.ts:33
  env 白名单、sessions abortActiveSessions 停机级联），Then 与代码逐一相符、
  无一杜撰；「AGENTS.md 硬性约定 3 同等强度对照」逐条有落点（含 code 节点 5s
  一次性超时向长会话外推的明确结论）。
- **AC3 · 依赖评估与请批结论成文**：Given ADR ⑤/⑥ 节，When 读评估结论，Then
  node-pty 类选型利弊、native 构建/CI 影响（含 better-sqlite3 教训对照）、
  PTY 子进程网络访问风险处置、env 承载评估四项齐备；结论二选一且自洽——
  有请批面：附录 A 含 issue 草案五要素（标题/背景/请批面清单/授权范围边界/
  批复语义）；零请批面：明示依据。两种结论均不改变本轮零依赖边界。
- **AC4 · 定界回写 VERBATIM 一致**：When 核对 BACKLOG BK-0044/BK-0045 行备注与
  ADR 定界节，Then 两行受影响文件清单/验收命令口径/实施序与 ADR 字面一致
  （BK-0027 VERBATIM-OK 标准）；回写随归档提交（产品提交仍恰 1 路径）。
- **AC5 · 白名单与零代码机器证明**：When `git show --numstat <产品提交>` 与
  `git diff` 核对，Then 产品提交恰 `docs/adr/0014-*.md` 一路径纯新增（+N/−0）；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空；`package-lock.json` 零变化（零依赖证明）。
- **AC6 · 纯回归面全绿**：When `npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server` 执行，Then 全部 exit 0——gate 8 场景 diffPx=0、契约
  测试全绿、smoke 95 passed / 0 failed（现基线，metrics 0026/0027 行；本轮零
  代码理论零漂移，任何红即环境异常回滚不硬闯）。
- **AC7 · 指针抽样可开**：When 从 ADR 引用的代码/文件/issue 指针抽样 ≥5 条逐一
  打开，Then 全部命中无误（建议抽样：code.ts:50-53、tools.ts:16-26、
  guard.ts:59-107、mcp/connection.ts:25-47、config.ts:33、BK-0044/BK-0045/
  BK-9005 BACKLOG 行、issue#5 链任五以上）。

## 非功能要求

1. 行数预算：ADR ≤400 行（唯一新增文件，符合 AGENTS.md 硬性约定 4）。
2. 零新依赖 / 零新 env / 零新出站类别 / 零 shared 契约 / 零 UI 接触 / 零 golden
   接触（POLICY 自主区「文档与实现同步」；lock 零变化为机器证明）。
3. ADR 双位标注纪律：「草案 · 待用户批准（依赖面）/ 待实施轮消费」状态位 +
   编号顺位（0014）与 ADR-0012 样板一致；不写「已批准」字样（issue#5 批复承继
   的是修宪实施授权，依赖面授权另批；ADR 自身状态行更新留实施轮 CLOSE——
   0010/0012 先例）。
4. EOL 纪律：新文件 LF、无 BOM。
5. 回滚 = `git revert` 单提交（纯文档，无迁移面）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| ADR 越界预支实现（写成 PTY 模块伪代码堆砌） | 定界粒度锚定 BK-0027/BK-0032 先例：方案选项+利弊+推荐+文件清单+验收口径，不写产品代码；SPEC 阶段逐节审 |
| 把「依赖面须另批」弱化为「父项批复已覆盖」 | AC1 硬性双标注；BK-0043/BK-0044 行内口径字面引用（父项批复不自动覆盖）；附录 A 五要素独立成节 |
| 安全设计脱离既有纪律自创新口径 | AC2 同等强度对照表锚定 AGENTS.md 硬性约定 3 + 四处代码先例，逐条对照可核 |
| 依赖评估遗漏 native 构建/CI 面（node-pty 装不上） | AC3 强制含 better-sqlite3 教训对照（allowScripts + 重编译纪律）；选型节必须给 Windows/CI 可行性判断依据 |
| 定界回写与 ADR 漂移（两处口径不一） | AC4 VERBATIM 一致（BK-0027 VERBATIM-OK 先例）；回写随归档提交前由 VERIFY 逐字比对 |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022/0024 先例） | 沿先例口径：提交后 CLOSE 复跑自愈，VERIFY 记实得值判据 0 failed |

## 需求清单（REQ-0043-xx）

- REQ-0043-01：ADR-0014 草案落盘（七要素 + 草案双标注 + 授权链引用含依赖面
  另批声明，AC1）。
- REQ-0043-02：安全世界设计正文（进程模型/沙箱边界同等强度对照/共享会话权限
  审计/超时生命周期中止级联，锚点逐条可核，AC2）。
- REQ-0043-03：依赖与出站评估 + 请批结论（附录 A 五要素或零请批面明示依据，AC3）。
- REQ-0043-04：BK-0044/BK-0045 两行 BACKLOG 定界回写 VERBATIM（AC4）。
- REQ-0043-05：边界不变式——产品提交恰 docs/adr/0014-*.md 一路径、零代码零
  依赖零 shared 零 UI 零 golden（AC5）；全程禁 gate:update。
- REQ-0043-06：纯回归面全绿 + 指针抽样（AC6/AC7）；产品提交恰一个
  （Conventional Commits，如 `docs(adr): BK-0043 PTY 终端安全世界设计 ADR 草案
  + 子项定界`）。

## SPEC 阶段衔接说明

BK-0043 为 M 项，**不免 SPEC（skipSpec=false）**。SPEC 以本 PRD 七要素框架展开：
① ADR 章节骨架与行数预算分配（各要素节建议行数区间）；② 同等强度对照表的制式
（AGENTS.md 硬性约定 3 三条款 × PTY 形态外推结论两栏）；③ 共享会话权限/审计方案
的选项矩阵制式（标识/留痕/危险命令处置各给选项+利弊+推荐）；④ 生命周期事件的
状态机草图表述边界（只列状态与迁移，不写代码）；⑤ 依赖评估模板（选型/native
构建/CI/出站/env 五面）；⑥ 附录 A 五要素字面模板（供脚本开 issue 直接取用，
ADR-0012 附录 A 先例）；⑦ 定界回写字面模板（BACKLOG 行备注增量段，供 VERIFY
VERBATIM 比对）。新架构决策：无（needsAdr=false——本项产品即 ADR 草案本身，
不再叠 ADR；SPEC/实施冲突时以 CONSTITUTION > 代码现状 > 本 PRD 为顺位）。
