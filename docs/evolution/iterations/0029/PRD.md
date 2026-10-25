# PRD · 迭代 0029 · BK-0035 BK-9003 拆分 SPEC 先行：呈现三件套节点参数与端口定界 + 分批修宪 ADR 草案

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 13:13
> 来源：BACKLOG BK-0035（capability / 触UI=否 / **P0 / S / ready** / 来源 issue#3，
> BACKLOG.md:48）。2026-10-25 周度治理（W43 第四次）由 BK-9003[L→skipped] 拆分
> 落地的四项 SPEC 先行项之三；父项批复承继——issue#3 用户批复
> 2026-10-23T15:49:32Z 在案（BK-9003 行备注，BACKLOG.md:74），修宪实施授权
> 覆盖子项链（shared DEFS 新增 + golden 增量），本项为纯文档轮零实现。
> 定界权威：BACKLOG BK-0035 行内口径 + ROADMAP 待办节实施序列（ROADMAP.md:186
> 「SPEC 四连先行：BK-0032 → BK-0043 → BK-0035 → BK-0039……本序列为 PLAN 指导、
> 先例在案，优先于主池表序」；BK-9003 链序 ROADMAP.md:191）。
> 先例：BK-0031（迭代 0018，S 项免 SPEC、PRD 内嵌定界的直系先例）、BK-0027
> （迭代 0017，ADR 草案 + 子项定界回写 VERBATIM）、BK-0032（迭代 0027，ADR-0013
> 草案 + schema 纪律自检 + golden 双通道预案）、BK-0043（迭代 0028，ADR-0014 草案）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9003 链
> SPEC 先行段；差异化主轴「画布编排 × 深度智能体工作台」，ROADMAP.md:124-130/156-168）。
> 批次编排：无——单项单迭代（S 级纯文档轮，skipSpec=true，本 PRD §7 内嵌定界即
> SPEC 替代）。issue#3 名下姊妹子项 BK-0036（网页展示）/BK-0037（终端只读流）/
> BK-0038（JSON 画布，链终轮）均未竟：本轮 done 仅发进度回执、不关 issue#3
> （关单留 BK-0038 终轮 CLOSE，BK-0035/BK-0038 行内明载；itemContinues=true）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 13:08~13:13 核实）

- **跨迭代续选**：无——BK-0021 批次链已于 0022 终轮收口、BK-0028/0029/0030 已于
  0023/0024/0025 相继 done、BK-0008 已于 0026 done、BK-0032 已于 0027 done、
  BK-0043 已于 0028 done（STATE.md:13 last_result：ADR-0014 落盘 + 定界回写
  VERBATIM ×2，产品提交 f78f983）——本轮从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作。issue 面板
  #2~#6 虽 open 且标签仍 needs-approval，但其批复均已在此前 PLAN 轮消化入行
  （#2~#5 于 2026-10-23 批复、#6 于迭代 0021 轮批复；L 项拆分 BK-0032~0050 完成，
  BACKLOG.md:34-39 治理日记注）——无新增 ready 义务、无 skipped 改写、无建行。
  下一预期新批项 = BK-0043 SPEC 产出的 PTY 依赖/出站清单（ADR-0014 附录 A）：
  档案面板尚无该 issue（仅 #2~#6），STATE.md:13 明载开 issue 归协调者/脚本
  （沿 BK-0027→#10 先例）——非 PLAN 轮动作，本轮零处理，如实记档。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 五项且批复均已承继在
  案，无 user-request 条目；无建行、无 uiIssueNumbers）。
- ③ **rejected**：无 → 无 skipped 改写。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - ready 非 doc 四项全貌（BACKLOG 主池亲核，行号本会话 grep 核实）：BK-0033
    （:46，P0/M，issue#2 agent 节点修宪轮）、BK-0034（:47，P0/M，issue#4 无——
    issue#2 goal 会话面板修宪轮）、BK-0035（:48，P0/S，issue#3 呈现三件套 SPEC
    先行）、BK-0039（:52，P0/S，issue#4 工作台 SPEC 先行）；BK-0051（:64，
    P1/S，doc，proposed）——类型 doc 心跳不选（WORKFLOW §4），且状态非 ready，
    双重不入选。
  - **本轮无晋升义务**：BK-0036~0038 晋升条件 = BK-0035 CLOSE 后（未 CLOSE，
    维持 proposed）；BK-0044 转 ready 门槛余一 = ADR-0014 附录 A needs-approval
    issue 获用户批复（issue 未开，见 ①）；BK-0040~0042 晋升条件 = BK-0039 CLOSE
    后。均零回写。
  - **→ 选 BK-0035**：四项均 P0、均 S/M（「优先 S/M」口径全满足）、前置 BK-0021
    （NDP）均 done，同级并列以 ROADMAP 待办节实施序列定序（序列优先于主池表序，
    ROADMAP.md:186）——**BK-0035 为 SPEC 四连先行第三位**（0032 于迭代 0027、
    0043 于迭代 0028 相继兑现，本位即 0035；0039 第四位顺延下轮）。BK-0033/0034
    系实现段，序列在 SPEC 四连之后（ROADMAP.md:187-189「BK-9002 链实现段 0033 →
    0034 排在 0035/0039 之后」——BK-0033 行备注同载），本轮不选。BK-0035 亦系
    「用户 issue 批复产生的 ready 项」（优先序①语义，来源 issue#3 直连）。
- **侦察档案核对**：残缺标记 `tools.ts:5/:138` 为 stub 如实降级设计面（:138 为
  未注册外部工具兜底 stub——迭代 0025 inject 设计；0027/0028 PRD 同判），非新
  立项对象；`package-lock.json:787` 为 base64 哈希偶合非标记；悬挂 run 探针 `[]`
  = BK-0011 启动扫尾预期表现（迭代 0019 done）——无补题需求。覆盖差集/文档漂移/
  dogfooding 已由治理日承载（BK-0051 在库，下个治理日消化）。
- 与最近 3 次迭代重叠面：0026（tools.ts/mcp-stubs.mjs）、0027（ADR-0013 落盘）、
  0028（ADR-0014 落盘）——本项纯文档轮零代码，对三次迭代产物零触碰（仅文档
  **引用**其结论：ADR-0013 的 DEFS 草案/schema 自检/golden 双通道三板斧为
  ADR-0015 的直系样板；BK-0033 行的 baseline 重产与守卫测试联动口径被三节点
  分批编排逐批复用）。

## 结论

**建议做**：一句话理由——ROADMAP 治理日钦定 SPEC 四连先行第三位（前两位已相继
兑现，序列连贯）；纯文档轮零代码零依赖边际成本最低；BK-0021（NDP 目录制）与
ADR-0013（DEFS 草案 + schema 纪律自检 + golden 双通道预案）两块样板齐备，三节点
的参数/端口/呈现行为定界有据可依；呈现型 sink「无引擎副作用」的形态使 SPEC 重点
收敛在 DEFS 形态与画布渲染面两处，评估面小。BK-9003 链三实现项（BK-0036~0038）
的修宪授权、分批编排与 golden 预案就位后，链上实施轮即可按序晋升。非修宪轮、
全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证：

1. 本迭代唯一产品路径为 `docs/adr/0015-*.md` 纯新增（编号按落盘时序——本会话
   `ls docs/adr` 亲核现行至 0014）。`apps/**`、`packages/**`、`tools/**`、
   `tests/**`、`.github/**`、golden 基线、package.json/lock 零接触——视觉 /
   DOM 结构 / 交互三层无涉，**全程禁 `npm run gate:update`**（POLICY 禁止区）。
2. ADR **草案内容**虽为未来三个呈现节点（BK-0036/0037/0038，均触UI=是修宪轮）
   定界，但 ADR 本身是文档（CONSTITUTION 第 4 条「不适用」面；POLICY 自主区
   「文档与实现同步」）。三实现项的修宪授权 = issue#3 批复承继
   （2026-10-23T15:49:32Z，BK-9003 行在案）+ 本 ADR——授权链与 BK-0033/0034
   消费 ADR-0013 的结构完全同构；本 PRD 仅产出定界方案，不预支任何 DEFS 落盘、
   前端改动与 golden 重录。
3. 零需批准面增量：呈现型 sink 无新依赖、无新 env、无新出站类别（网页展示若涉
   iframe 为客户端呈现面，服务端出站抓取属既有 http 节点职责——ADR 必答项将此
   边界写死）；SSE 消费沿既有 15 种事件内取用（BK-0016 护栏先例），确需新增
   事件类型即中止转 needs-approval（预埋护栏，本评估结论为无需新增）。

## 背景（代码事实，本会话 2026-10-25 13:08~13:13 只读核实）

1. **issue#3 与拆分链**：呈现三件套节点（网页展示 / 终端只读流 / JSON 画布）。
   治理日拆分：BK-0035（SPEC 先行，本项）→ BK-0036（网页展示，批次 1）→
   BK-0037（终端只读流，批次 2）→ BK-0038（JSON 画布，批次 3，链终轮回执关单
   #3，BACKLOG.md:49-51）。三节点为呈现型 sink（无引擎副作用），SPEC 重点在
   DEFS 形态与画布渲染面（BACKLOG.md:48 行内既定口径）。
2. **NDP 终态形态（前置 BK-0021 done）**：`packages/shared/src/nodes/` 16 目录
   全量（本会话 ls 亲核：approval/code/condition/delay/http/llm/loop/merge/
   notify/prompt/reply/retrieval/setvar/trigger/userinput/websearch）+ README.md
   总索引；`nodes.ts` 142 行聚合层（16 import + loadJsonDef schema 校验
   nodes.ts:29-33 + 反向合成，零内联定义）——新节点一律新增 `src/nodes/<type>/
   {node.ts,README.md}` 目录 + nodes.ts 一 import 一键（「先迁移后扩展」兑现，
   ROADMAP.md:162-164）。
3. **schema 枚举冻结（DEFS 定界的硬约束）**：`nodes.schema.ts:13-15` 三枚举——
   PORT_TYPES 五种（any/text/list/object/number）、WIDGETS 五种（text/textarea/
   number/combo/toggle）、CATEGORIES 七种（input/chat/knowledge/tools/logic/
   output/human）；`:18-19` 端口 id 正则 `^[a-z][a-z0-9-]{2,31}$`；`:50-57`
   widget×default 类型互斥矩阵。三节点 DEFS 必须在冻结枚举内组合——这是
   「最小需批准面」定界的关键：类别复用既有 `output`（零新增 CSS 变量与类目，
   BK-0033 归 chat 类目同款两段口径，BACKLOG.md:46 行内先例）。
4. **sink 节点同构样板**：`nodes/reply/node.ts`（本会话全读）——ports outputs
   空数组（终点节点，与 notify 同构）、inputs 单 `in-content` type any、
   binding `{ handler:'reply', capabilities:{ data:true } }`、params 单 textarea。
   三呈现节点与 reply 同为 output 类目 sink，DEFS 骨架可循此同构（端口/参数
   细节归 ADR 草案定界）。
5. **呈现承载样板（后端 sink handler）**：`handlers.ts:225-232` reply handler
   ——`render(p.tpl)` → `ctx.outputs.push` + `emit('output', {text})` + 返回
   `out` 摘要文本；`engine.ts:26-27` HANDLERS = BASIC_HANDLERS 展开、`:99`
   `HANDLERS[n.type] || HANDLERS.__pass` 分发（__pass 仅为兜底，真实呈现语义
   须各节点落 handler——ADR 定界新 handler 键）。
6. **画布渲染面现状（呈现能力的差距证据）**：节点体输出区现状为纯文本短摘要
   ——`app.js:897` 运行数据输出 160 字截断（`slice(0,160)`）、`:1210` setNodeOut
   单行文本；`app.js:36-42` PTYPES 五端口类型（连线类型色）、`:46-54` CATS 七
   类目（output 类目既有 `--cat-output`）、`:54+` ICON_PATHS 图标注册表——
   网页展示（iframe 呈现）/ 终端只读流（流式文本追加）/ JSON 画布（结构化
   呈现）均超出该文本能力，即三节点「前端三文件 + gate 场景增量」修宪面的
   事实依据；`:765` port-row 渲染证明新端口行可由 DEFS 通用渲染链自动承载。
7. **与 BK-9005 PTY 链的边界（防混淆必答项）**：终端只读流节点是**只读呈现**
   sink（消费既有 run/会话事件流，无用户输入面、零新依赖零进程），与 BK-0045
   交互式 PTY 终端节点（用户与 agent 共享 shell 会话，node-pty 类新依赖另批，
   ADR-0014 附录 A 待批复）是两个物种——ADR 须写死此切割，杜绝实施轮误引
   PTY 依赖与依赖面请批。
8. **golden 增量预案样板**：`gate.mjs:177-186` 现八场景 s0~s7（本会话 grep 亲核
   场景表）；ADR-0013 §6（:209-223）已预定 s8-agent-node（BK-0033）与
   s9-goal-panel-online（BK-0034）；实施序列 0033/0034 先于 0036~0038
   （ROADMAP.md:187-191），呈现链新场景**预期 s10+（编号按落盘时序定）**；
   双通道口径 = 新场景 golden-created 落盘 + 受波及既有场景修宪轮重录（gate
   实测确认零波及则免）——ADR-0013 §6 直系样板，含路由 fixture 先例
   （WF_ROUTES/RUN_ROUTES gate.mjs:181-184，SESSION_ROUTES 为 BK-0034 预案）。
9. **baseline 与守卫测试联动口径（BK-0033 行既定，逐批复用）**：每落一节点 =
   `packages/shared/test/nodes.baseline.json` 重产一键（16→17→18→19，分批逐键）
   + nodes-dirs 目录计数断言（D===17/18/19）+ defs-drift +1 + README 生成器
   与 readme-consistency 回比（tools/gen-node-readmes.mjs 产物面）。
10. **ADR 体系现状**：`docs/adr/` 现行 0001~0014（ls 亲核）；ADR-0013（297 行）
    为「草案 · 待实施轮消费」+ 授权链 issue#2 承继 + schema 自检 + golden 双
    通道的完整样板；本项 ADR 编号 **0015**。
11. **工作区干净**（`git status --porcelain` 输出空，本会话亲跑）；HEAD = 6c87c85
    （迭代 0028 归档提交）。

## 目标与范围

**做（本迭代产品提交面 = docs/adr/0015-*.md 单文件纯新增）**：

1. **ADR-0015 草案落盘**（≤400 行硬性，建议 260±60 对齐 ADR-0013 体量），七要素
   成节（骨架详见 §7 内嵌定界）：① 动机与现状证据；② 三节点 DEFS 定界草案
   （枚举冻结内组合 + 选项与推荐 + schema 纪律合规自检）；③ 呈现承载定界（sink
   handler 形态，无出站无新依赖）；④ 画布渲染面定界（三形态方案 + 前端三文件
   影响面 + PTY 边界切割）；⑤ 分批修宪编排（一节点一迭代一 ADR 增补）；
   ⑥ golden 增量预案（双通道 + 场景编号按落盘时序）；⑦ BK-0036~0038 定界回写
   索引。
2. **BK-0036/0037/0038 定界回写**：BACKLOG 三行备注按 ADR 定界节更新（引用
   ADR-0015 编号与节号，VERBATIM 一致；回写随归档提交入库，与 0011~0028 同
   机制——BK-0027/0032/0043 先例）。

**不做（out of scope）**：

- 零代码、零依赖、零 env、零出站、零 UI、零 golden 接触（纯文档轮；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空为机器证明）。
- 不实现任何 DEFS 落盘 / handler / 前端渲染代码（实施归 BK-0036~0038 修宪轮）；
- 不新增 shared 目录或改 nodes.ts / nodes.baseline.json（baseline 重产归各实施
  轮）；ADR 不预写 DEFS 终稿代码块（草案级草图，BK-0045 行同款纪律——终稿归
  实施 SPEC）；
- 不开 needs-approval issue（三实现项修宪授权 = issue#3 批复承继已闭合，无
  依赖面请批诉求；结论若反转为「需新增 SSE 事件/依赖」即中止转待批准——护栏
  预埋，非本轮预期）；
- BK-0039（SPEC 四连第四位）与 BK-0033/0034（BK-9002 链实现段）不在本轮——
  一次迭代一件事；`npm run gate:update` / golden 任何接触（POLICY 禁止区）。

## 受影响文件清单（= 产品提交白名单；S 项免 SPEC，本清单即定稿口径）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `docs/adr/0015-*.md`（命名语义：呈现三件套节点分批修宪方案——网页展示/终端只读流/JSON 画布） | 纯新增 | ~260（≤400，AGENTS.md 硬性约定 4；对齐 ADR-0013 体量 297 行） |

机制件（随归档提交，不属产品白名单）：`docs/evolution/BACKLOG.md`（BK-0035 置
done + BK-0036/0037/0038 定界回写）、`docs/evolution/STATE.md`、
`docs/evolution/metrics.md`、`iterations/0029/` 三件（S 项免 SPEC，PRD/JOURNAL/
REPORT）。

零改动白名单：`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、
根/子包 `package.json` 与 `package-lock.json`、`README.md`（BK-0051 漂移归治理日）。

## 验收标准（Given/When/Then）

- **AC1 · ADR 落盘与要素完备**：Given 工作区干净、docs/adr 现行至 0014，When
  产品提交落盘，Then `docs/adr/0015-*.md` 恰一文件纯新增、行数 ≤400，含七要素
  （动机/三节点 DEFS 定界/呈现承载/画布渲染面/分批修宪编排/golden 增量预案/
  子项定界回写索引）且每要素成节可索引；标题与状态标注含「草案」字样，状态行
  语义 =「草案 · 待实施轮消费」（ADR-0013 同款——零依赖面故无 0014 式「待用户
  批准」位）；授权链引用：issue#3 批复 2026-10-23T15:49:32Z 承继（三实施修宪
  轮消费）。
- **AC2 · DEFS 定界锚点真实可核**：Given ADR DEFS 定界节，When 按引用逐条对照
  代码锚点（nodes.schema.ts:13-15 三枚举冻结、:18-19 端口 id 正则、reply/
  node.ts sink 同构、CATS output 类目 app.js:46-54、PTYPES app.js:36-42、
  ICON_PATHS app.js:54+、engine.ts:26-27/:99 HANDLERS 分发、handlers.ts:225-232
  reply 承载样板），Then 与代码逐一相符、无一杜撰；三节点定界均显式声明在冻结
  枚举内组合（类别落 output、端口/widget 从五种枚举取用），schema 纪律合规
  自检表成节（ADR-0013 §2.3 样板，供实施轮 baseline 重产依据）。
- **AC3 · 分批编排与 golden 预案成文**：Given ADR ⑤/⑥ 节，When 读编排与预案，
  Then 一节点一迭代一 ADR 增补口径（0036 → 0037 → 0038）齐备，每批受影响面
  四件套（NDP 定义 + 呈现承载 + 前端三文件 + gate 场景增量）与 baseline 逐批
  重产键数（16→17→18→19）+ 守卫测试联动清单（nodes-dirs D 计数/defs-drift/
  readme-consistency）逐批列明；golden 双通道口径（新场景 golden-created +
  受波及既有场景修宪轮重录、零波及须 gate 实测确认）与「场景编号按落盘时序
  （预期 s10+，s8/s9 已由 ADR-0013 预定）」明示；网页展示的安全面（iframe
  sandbox 属性与服务端零出站边界——抓取归既有 http 节点）与终端只读流 ×
  BK-0045 PTY 的边界切割成文。
- **AC4 · 定界回写 VERBATIM 一致**：When 核对 BACKLOG BK-0036/0037/0038 行备注
  与 ADR 定界节，Then 三行受影响文件清单/验收命令口径/实施序/晋升条件与 ADR
  字面一致（BK-0027 VERBATIM-OK 标准；BK-0038 链终轮回执 issue#3 关单口径
  保留）；回写随归档提交（产品提交仍恰 1 路径）。
- **AC5 · 白名单与零代码机器证明**：When `git show --numstat <产品提交>` 与
  `git diff` 核对，Then 产品提交恰 `docs/adr/0015-*.md` 一路径纯新增（+N/−0）；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空；`package-lock.json` 零变化（零依赖证明）。
- **AC6 · 纯回归面全绿**：When `npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server` 执行，Then 全部 exit 0——gate 8 场景 diffPx=0、契约
  测试全绿、smoke 95 passed / 0 failed（现基线，metrics 0026/0027/0028 行；
  本轮零代码理论零漂移，任何红即环境异常回滚不硬闯；smoke V09 时点性假红沿
  0018/0021/0022 先例：提交后复跑自愈）。
- **AC7 · 指针抽样可开**：When 从 ADR 引用的代码/文件/issue 指针抽样 ≥5 条逐一
  打开，Then 全部命中无误（建议抽样：nodes.schema.ts:12-24、nodes/reply/
  node.ts 全文、app.js:36-54、app.js:897、gate.mjs:177-186、ADR-0013 §6、
  BK-0036/BK-0037/BK-0038/BK-9003 BACKLOG 行、issue#3 链任五以上）。

## 非功能要求

1. 行数预算：ADR ≤400 行（唯一新增文件，符合 AGENTS.md 硬性约定 4；建议
   260±60）。
2. 零新依赖 / 零新 env / 零新出站类别 / 零 shared 契约 / 零 UI 接触 / 零
   golden 接触（POLICY 自主区「文档与实现同步」；lock 零变化为机器证明）。
3. ADR 双位标注纪律：「草案 · 待实施轮消费」状态位 + 编号顺位（0015）与
   ADR-0013 样板一致；不写「已批准」字样（issue#3 批复承继的是修宪实施授权，
   ADR 自身状态行更新留实施轮 CLOSE——0013 先例）。
4. EOL 纪律：新文件 LF、无 BOM。
5. 回滚 = `git revert` 单提交（纯文档，无迁移面）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| ADR 越界预支实现（写成三节点 DEFS 终稿代码堆砌或前端伪代码） | 定界粒度锚定 ADR-0013 §2.1 草案级（方案选项+利弊+推荐+文件清单+验收口径）+「ADR 不预写 DEFS 终稿代码块」纪律（BK-0045 行同款）；BUILD 期零代码边界由 AC5 机器证明 |
| 三节点定界溢出冻结枚举（新端口类型/新 widget/新类目） | AC2 硬性声明枚举内组合（类别落 output、五种端口/widget 取用）；确需溢出即触需批准面扩大——中止转 needs-approval，不写入草案推荐案 |
| 网页展示 iframe 安全面遗漏（任意 URL 嵌载/服务端出站越界） | AC3 必答项：iframe sandbox 属性方案 + 「服务端零出站、抓取归既有 http 节点」边界写死（guard 面 status quo） |
| 终端只读流与 BK-0045 PTY 节点边界混淆（误引 node-pty/依赖面请批） | AC3 边界切割成文：只读呈现、无用户输入面、零依赖零进程；引用 ADR-0014 附录 A 为 PTY 专属面 |
| golden 场景编号预设冲突（BK-0046/0049 等穿插项也加场景） | 「编号按落盘时序（预期 s10+）」纪律（ADR-0014 对 ADR 编号同款），不锁死具体号 |
| 定界回写与 ADR 漂移（两处口径不一） | AC4 VERBATIM 一致（BK-0027 VERBATIM-OK 先例）；回写随归档提交前由 VERIFY 逐字比对 |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022/0024 先例） | 沿先例口径：提交后 CLOSE 复跑自愈，VERIFY 记实得值判据 0 failed |

## 需求清单（REQ-0035-xx）

- REQ-0035-01：ADR-0015 草案落盘（七要素 + 草案双标注 + 授权链引用，AC1）。
- REQ-0035-02：三节点 DEFS 定界草案（枚举冻结内组合 + 选项与推荐 + schema
  纪律合规自检，锚点逐条可核，AC2）。
- REQ-0035-03：分批修宪编排 + golden 增量预案 + 安全/边界必答项（iframe 面、
  PTY 切割，AC3）。
- REQ-0035-04：BK-0036/0037/0038 三行 BACKLOG 定界回写 VERBATIM（AC4）。
- REQ-0035-05：边界不变式——产品提交恰 docs/adr/0015-*.md 一路径、零代码零
  依赖零 shared 零 UI 零 golden（AC5）；全程禁 gate:update。
- REQ-0035-06：纯回归面全绿 + 指针抽样（AC6/AC7）；产品提交恰一个
  （Conventional Commits，如 `docs(adr): BK-0035 呈现三件套节点分批修宪 ADR
  草案 + 子项定界`）。

## §7 · SPEC 内嵌定界（S 项免独立 SPEC，skipSpec=true——BK-0031 先例）

> 本节即 SPEC 替代物：BUILD/VERIFY 以本节 + 上文清单/AC 为准；与 CONSTITUTION /
> 代码现状冲突时以 CONSTITUTION > 代码现状 > 本 PRD 为顺位。

**ADR-0015 章节骨架与行数预算分配（建议，总 ~260 行 ≤400）**：

| 节 | 内容 | 行数 |
| --- | --- | --- |
| 头部 + 状态行 + 授权链 | 「草案 · 待实施轮消费」+ issue#3 承继 2026-10-23T15:49:32Z + 零依赖声明 | ~10 |
| §1 动机与现状证据 | issue#3 链上下文 + 差异化定位 + sink 形态证据（reply 同构/160 字截断差距） | ~25 |
| §2 三节点 DEFS 定界草案 | 每节点一小节：type/identity（name/cat=output/icon/keywords/desc）/ports/params/binding 草图 + 选项与推荐；末附 schema 纪律合规自检表（ADR-0013 §2.3 样板） | ~90 |
| §3 呈现承载定界 | sink handler 形态（无出站无新依赖、emit('output') 语义沿 reply、engine HANDLERS 新键、__pass 仅为兜底非呈现语义） | ~30 |
| §4 画布渲染面定界 | 三形态方案要点（iframe sandbox / 流式追加 / JSON 结构化）+ 前端三文件影响面 + PTY 边界切割（×BK-0045）+ SSE 消费护栏（15 种内取用） | ~45 |
| §5 分批修宪编排 | 一节点一迭代一 ADR 增补：0036 → 0037 → 0038；每批四件套 + baseline 16→17→18→19 + 守卫联动清单 | ~25 |
| §6 golden 增量预案 | 双通道口径 + 场景形态草图 + 编号按落盘时序（预期 s10+）+ 路由 fixture 需求评估（静态呈现预期无新路由） | ~20 |
| §7 BK-0036~0038 定界回写索引 | 三行回写字面模板（供 VERIFY VERBATIM 比对）+ 晋升条件（BK-0035 CLOSE 后由 PLAN 轮晋升）+ BK-0038 链终轮回执 issue#3 关单 | ~15 |

**DEFS 草案制式约束（§2 逐节点必答）**：type 命名（小写英文，建议 webshow/
termview/jsoncanvas 或近义——终名 ADR 定）；ports 输入 1~2 个（in-ctx 类，type
any 或 object）+ 输出空数组（sink 同构 reply）；params 从五种 widget 枚举组合
（每节点 ≤3 项，含 default）；binding.handler 新键 + capabilities.data=true；
identity.category 固定 'output'；icon 优先 ICON_PATHS 既有键（新增 path 属前端
三文件修宪面，ADR 记为各批可选增量）。

**验收命令口径（BUILD/VERIFY 执行面）**：`npm run build` + `npm run gate`
（8 场景 diffPx=0 纯回归）+ `npm test`（契约测试全绿）+ `npm run smoke:server`
（95 passed / 0 failed 基线零漂移）+ AC7 指针抽样 ≥5 条；产品提交白名单恰
`docs/adr/0015-*.md` 一路径，提交信息 Conventional Commits 单提交。
