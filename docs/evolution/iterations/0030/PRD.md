# PRD · 迭代 0030 · BK-0039 BK-9004 拆分 SPEC 先行：会话面板右侧工作台（git 信息 / diff 审查 / 目录树）容器与三页签定界 + 分批修宪 ADR 草案

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 13:54
> 来源：BACKLOG BK-0039（capability / 触UI=否 / **P0 / S / ready** / 来源 issue#4，
> BACKLOG.md:52）。2026-10-25 周度治理（W43 第四次）由 BK-9004[L→skipped] 拆分
> 落地的四项 SPEC 先行项之四（末位）；父项批复承继——issue#4 用户批复
> 2026-10-23T15:49:17Z 在案（BK-9004 行备注，BACKLOG.md:75），修宪实施授权
> 覆盖子项链（右栏容器与三页签 UI + golden 增量），本项为纯文档轮零实现。
> 定界权威：BACKLOG BK-0039 行内口径 + ROADMAP 待办节实施序列（ROADMAP.md:186
> 「SPEC 四连先行：BK-0032 → BK-0043 → BK-0035 → BK-0039……本序列为 PLAN 指导、
> 先例在案，优先于主池表序」；BK-9004 链序 ROADMAP.md:193）。
> 先例：BK-0031（迭代 0018，S 项免 SPEC、PRD 内嵌定界的直系先例）、BK-0027
> （迭代 0017，ADR 草案 + 子项定界回写 VERBATIM）、BK-0032（迭代 0027，ADR-0013）、
> BK-0043（迭代 0028，ADR-0014，含需批准面预埋样板）、BK-0035（迭代 0029，
> ADR-0015，分批修宪编排 + golden 双通道预案的直系样板——本项同为一容器三批次
> 形态）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9004 链
> SPEC 先行段；差异化主轴「画布编排 × 深度智能体工作台」，ROADMAP.md:124-130/
> 156-168）。
> 批次编排：无——单项单迭代（S 级纯文档轮，skipSpec=true，本 PRD §7 内嵌定界即
> SPEC 替代）。issue#4 名下姊妹子项 BK-0040（右栏容器+git）/BK-0041（diff 审查）/
> BK-0042（目录树，链终轮）均未竟：本轮 done 仅发进度回执、不关 issue#4
> （关单留 BK-0042 终轮 CLOSE，BK-0039/BK-0042 行内明载；itemContinues=true）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 13:50~13:54 核实）

- **跨迭代续选**：无——BK-0021 批次链已于 0022 终轮收口、BK-0028/0029/0030 已于
  0023/0024/0025 相继 done、BK-0008 已于 0026 done、BK-0032 已于 0027 done、
  BK-0043 已于 0028 done、BK-0035 已于 0029 done（STATE.md:13 last_result：
  ADR-0015 落盘 + 定界回写 VERBATIM ×3，产品提交 421773b；归档提交 aec5eb1，
  `git log --oneline -3` 本会话亲核）——本轮从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作。issue 面板
  #2~#6 虽 open 且标签仍 needs-approval，但其批复均已在此前 PLAN 轮消化入行
  （#2~#5 于 2026-10-23 批复、#6 于迭代 0021 轮批复；L 项拆分 BK-0032~0050 完成，
  BACKLOG.md:34-39 治理日记注）——无新增 ready 义务、无 skipped 改写、无建行。
  下一预期新批项 = BK-0043 SPEC 产出的 PTY 依赖/出站清单（ADR-0014 附录 A）：
  档案面板尚无该 issue（仅 #2~#6），STATE.md:13/BACKLOG 待批准区记注（:123-124）
  明载开 issue 归协调者/脚本（沿 BK-0027→#10 先例）——非 PLAN 轮动作，本轮零
  处理，如实记档。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 五项且批复均已承继在
  案，无 user-request 条目；无建行、无 uiIssueNumbers）。
- ③ **rejected**：无 → 无 skipped 改写。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - ready 非 doc 队列全貌（BACKLOG 主池亲核，行号本会话 grep 核实）：**本轮
    晋升后**六项——BK-0033（:46，P0/M，issue#2 agent 节点修宪轮）、BK-0034
    （:47，P0/M，issue#2 goal 会话面板修宪轮）、BK-0036/0037/0038（:49-51，
    P0/M×3，issue#3 呈现三件套修宪轮，本轮晋升见下）、BK-0039（:52，P0/S，
    issue#4 工作台 SPEC 先行）；BK-0051（:64，P1/S，doc，proposed）——类型 doc
    心跳不选（WORKFLOW §4），且状态非 ready，双重不入选。
  - **本轮 PLAN 轮晋升义务（BK-0036/0037/0038，沿 0028 轮 BK-0033/0034 先例）**：
    三行晋升条件「BK-0035 CLOSE 后由 PLAN 轮晋升 ready」已随迭代 0029 终态 done
    兑现（STATE.md:13 last_result 明载「BK-0036/0037/0038 晋升条件就此满足（由
    心跳 PLAN 轮晋升 ready，实施序 0036→0037→0038）」）→ 本轮将三行 proposed →
    ready 回写 BACKLOG（回写随归档提交入库，与 0028 轮同机制）。但按 ROADMAP
    实施序列（SPEC 四连先行先于各链实现段，ROADMAP.md:186-195），三实现项排位
    在 0039 之后，本轮不选。
  - **其余零回写**：BK-0040~0042 晋升条件 = BK-0039 CLOSE 后（未 CLOSE，维持
    proposed）；BK-0044 转 ready 门槛余一 = ADR-0014 附录 A needs-approval
    issue 获用户批复（issue 未开，见 ①）；BK-0046~0050 维持各自晋升条件不动。
  - **→ 选 BK-0039**：ready 队列同级并列（全 P0）以「优先 S/M」与 ROADMAP 待办
    节实施序列双口径定序——BK-0039 为唯一 S 级（S 优先口径直取），且系 **SPEC
    四连先行第四位（收官）**（0032/0043/0035 已于迭代 0027/0028/0029 相继兑现；
    迭代 0029 PRD 明载「0039 第四位顺延下轮」，PRD.md:52-53）。BK-0033/0034/
    0036~0038 系实现段修宪轮，序列在 SPEC 四连之后（ROADMAP.md:187-193「随后
    按各链推进」）——SPEC 四连收官后实现段即启（下轮预期 BK-0033，BK-9002 链
    为差异化主轴优先，ROADMAP.md:188）。BK-0039 亦系「用户 issue 批复产生的
    ready 项」（优先序①语义，来源 issue#4 直连）。
- **侦察档案核对**：残缺标记 `tools.ts:5/:138` 为 stub 如实降级设计面（:138 为
  未注册外部工具兜底 stub——迭代 0025 inject 设计；0027/0028/0029 PRD 同判），
  非新立项对象；`package-lock.json:787` 为 base64 哈希偶合非标记；悬挂 run 探针
  `[]` = BK-0011 启动扫尾预期表现（迭代 0019 done）——无补题需求。覆盖差集/
  文档漂移/dogfooding 已由治理日承载（BK-0051 在库，下个治理日消化）。
- 与最近 3 次迭代重叠面：0027（ADR-0013 落盘）、0028（ADR-0014 落盘）、0029
  （ADR-0015 落盘）——本项纯文档轮零代码，对三次迭代产物零触碰（仅文档**引用**
  其结论：ADR-0015 §5 分批修宪编排 + §6 golden 双通道预案为一容器三批次形态的
  直系样板；ADR-0014 附录 A 为「需批准面预埋」样板——若本链 ADR 评估出新增 env
  语义即循此转 needs-approval）。

## 结论

**建议做**：一句话理由——ROADMAP 治理日钦定 SPEC 四连先行第四位（收官位，前
三位已相继兑现，迭代 0029 PRD 明载顺延本轮）；纯文档轮零代码零依赖边际成本
最低；BK-0016（sessions 五端点）后端地基与 ADR-0015（一容器三批次分批修宪 +
golden 双通道预案）样板齐备，右栏容器信息架构与 workbench 只读端点契约的定界
有据可依；SPEC 四连收官后 T5-M3 实现段（BK-0033 起）即可全力推进。非修宪轮、
全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证：

1. 本迭代唯一产品路径为 `docs/adr/0016-*.md` 纯新增（编号按落盘时序——本会话
   `ls docs/adr` 亲核现行至 0015）。`apps/**`、`packages/**`、`tools/**`、
   `tests/**`、`.github/**`、golden 基线、package.json/lock 零接触——视觉 /
   DOM 结构 / 交互三层无涉，**全程禁 `npm run gate:update`**（POLICY 禁止区）。
2. ADR **草案内容**虽为未来右栏工作台（BK-0040/0041/0042，均触UI=是修宪轮）
   定界，但 ADR 本身是文档（CONSTITUTION 第 4 条「不适用」面；POLICY 自主区
   「文档与实现同步」）。三实现项的修宪授权 = issue#4 批复承继
   （2026-10-23T15:49:17Z，BK-9004 行在案）+ 本 ADR——授权链与 BK-0033/0034
   消费 ADR-0013、BK-0036~0038 消费 ADR-0015 的结构完全同构；本 PRD 仅产出
   定界方案，不预支任何前端改动、端点实现与 golden 重录。
3. 零需批准面增量（评估结论，护栏预埋）：workbench 端点为本地只读（git 子进程
   argv 形态 + 目录树遍历），零出站网络（guard 面无涉）、零新依赖；项目根锚定
   **推荐零 env 方案**（process.cwd() 服务进程工作目录即项目根，ADR 必答项写死
   该默认与利弊）——若 ADR 评估结论反转为需新增环境变量语义（如 WORKBENCH_ROOT
   覆盖），即触 POLICY 需批准区「新增环境变量语义」，中止转 needs-approval
   （沿 ADR-0014 附录 A 先例，父项批复不自动覆盖 env 面），不写入草案推荐案。

## 背景（代码事实，本会话 2026-10-25 13:50~13:54 只读核实）

1. **issue#4 与拆分链**：会话面板右侧工作台（git 信息 / diff 审查 compare /
   项目目录树）。治理日拆分：BK-0039（SPEC 先行，本项）→ BK-0040（右栏容器 +
   git 信息页，批次 1，容器为本链共享基建）→ BK-0041（diff 审查，批次 2）→
   BK-0042（目录树，批次 3，链终轮回执关单 #4，BACKLOG.md:53-55）。后端承载
   在 BACKLOG 行内既定为自主区面（「apps/server/src/workbench 端点（只读、限
   项目根，自主区面，可同迭代先行段）」，:53；tree 端点「防越界对齐 sandbox
   纪律」，:55）。
2. **右栏现状（容器的宪法冻结面证据）**：`Skeleton.tsx:136-137` 右侧属性面板
   ——`<aside id="rightbar"><div id="props"></div></aside>`（NodePropertiesPanel）；
   `app.js:914` `const box = $('#props')` 渲染入口、`:1001/:1037/:1065` 三事件
   委托（change/click/input）、`:2128` focus 归属判断——`#rightbar` 为既有唯一
   右栏容器，属性面板为其唯一住户。工作台容器（页签切换/共存形态）的任何 DOM
   增删即触结构层与交互层，即三批次修宪面的事实依据；ADR 必答项① = 容器信息
   架构（属性面板与工作台三页签的共存方案：页签并入 / 独立容器 / 会话面板联动
   开关——选项利弊与推荐）。
3. **后端端点契约样板（BK-0016 地基）**：BK-0039 行明载前置 BK-0016（持久会话
   API）已 done（BACKLOG.md:93）；`server.ts:215-219` sessions 五端点注册序
   （POST/GET/GET/POST/POST）与 `:205-213` workflows/runs 路由族为 workbench
   端点族（预期 /api/v1/workbench/* 形态：git 信息 / diff / tree，只读 GET 为主）
   的注册面样板；`:198-202` /api/* 别名 base 不承接新端点（v1-only 先例，
   ADR-0005）。
4. **git 命令承载纪律（子进程先例）**：`code.ts:7` `import { spawn } from
   'node:child_process'`、`:50` spawn argv 数组形态、`:53` setTimeout 5s 超时
   kill——workbench git 信息/diff 端点的 git 调用须同款纪律（argv 数组零 shell
   拼接 + 超时 + 退出码白名单），ADR 必答项② = git 数据获取方案（子进程 git
   porcelain/porcelain=v1 输出 vs 直读 .git 内部格式——推荐子进程，只读命令
   白名单逐条列明）。
5. **路径防越界纪律（tree 端点对齐面）**：`tools.ts:16` SANDBOX 常量锚定 +
   `:18-20` safePath（resolve 后前缀校验，越界 throw「路径越界：只允许访问沙箱
   目录」）——tree 端点的项目根锚定与防 `../` 越界须同构（锚定根不同：workbench
   为项目根而非 sandbox，但校验机理同款，ADR 必答项③）；`config.ts` 现无
   PROJECT_ROOT/工作台根概念（grep 亲核零命中），锚定默认 = process.cwd()，
   零 env。
6. **golden 增量预案样板**：`gate.mjs:177-186` 现八场景 s0~s7（本会话 grep 亲核
   场景表）；ADR-0013 §6 预定 s8-agent-node（BK-0033）与 s9-goal-panel-online
   （BK-0034）；ADR-0015 §6 预期呈现链 s10+（按落盘时序）；本链右栏在线态新
   场景**编号同样按落盘时序定**（不锁死具体号，与 0033/0036 等实现项交错落盘
   时以实际序为准）；双通道口径 = 新场景 golden-created 落盘 + 受波及既有场景
   修宪轮重录（gate 实测确认零波及则免）——ADR-0015 §6 直系样板，含路由
   fixture 先例（WF_ROUTES/RUN_ROUTES gate.mjs:181-184，workbench 端点 mock
   需求评估归 ADR：右栏在线态场景预期需 WB_ROUTES 类 fixture）。
7. **分批修宪编排样板（直系）**：ADR-0015 §5「一节点一迭代一 ADR 增补」（0036
   →0037→0038，每批四件套 + baseline/守卫联动）——本链同构改写为「一页签一
   迭代」（0040 容器+git → 0041 diff → 0042 tree），差异点：**不涉 shared
   DEFS**（工作台是面板面非节点面，无 nodes.baseline.json 重产与 nodes-dirs/
   defs-drift 联动），受影响面以前端三文件 + 后端 workbench 端点 + smoke 扩
   断言 + gate 场景增量为四件套（BACKLOG :53-55 行内口径）。
8. **会话面板联动语义（信息架构关联面）**：issue#4 原文「会话面板右侧工作台」
   ——会话面板为 BK-9002 链 BK-0034（goal 模式会话面板，ready 未实施）产物；
   本链容器不硬依赖 BK-0034（工作台三页签数据源为 workbench 端点而非会话），
   但入口交互（何时打开右栏工作台）与 BK-0034 面板的布局协同须在 ADR 信息
   架构节定界（实施序上 BK-0033/0034 先于本链，ROADMAP.md:188-193，届时实测
   协同）。
9. **ADR 体系现状**：`docs/adr/` 现行 0001~0015（ls 亲核）；ADR-0015（260 行）
   为「草案 · 待实施轮消费」+ 分批修宪编排 + golden 双通道预案的直系样板；
   本项 ADR 编号 **0016**。
10. **工作区干净**（`git status --porcelain` 输出空，本会话亲跑）；HEAD = aec5eb1
    （迭代 0029 归档提交）。

## 目标与范围

**做（本迭代产品提交面 = docs/adr/0016-*.md 单文件纯新增）**：

1. **ADR-0016 草案落盘**（≤400 行硬性，建议 260±60 对齐 ADR-0013/0015 体量），
   七要素成节（骨架详见 §7 内嵌定界）：① 动机与现状证据；② 右栏容器信息架构
   定界（属性面板共存方案 + 三页签结构 + 入口交互）；③ workbench 只读端点契约
   定界（git 信息/diff/tree 三端点族 + git 子进程承载纪律 + 项目根锚定）；④
   路径防越界与安全面（safePath 同构校验 + 只读白名单 + 零出站声明）；⑤ 分批
   修宪编排（一页签一迭代）；⑥ golden 增量预案（双通道 + 场景编号按落盘时序 +
   WB_ROUTES fixture 需求评估）；⑦ BK-0040~0042 定界回写索引。
2. **BK-0040/0041/0042 定界回写**：BACKLOG 三行备注按 ADR 定界节更新（引用
   ADR-0016 编号与节号，VERBATIM 一致；回写随归档提交入库，与 0011~0029 同
   机制——BK-0027/0032/0035/0043 先例）。

**不做（out of scope）**：

- 零代码、零依赖、零 env、零出站、零 UI、零 golden 接触（纯文档轮；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空为机器证明）。
- 不实现任何 workbench 端点 / 右栏容器 DOM / 页签渲染（实施归 BK-0040~0042
  修宪轮）；不预写端点实现代码块（ADR 定界到契约级：路径/方法/入参/出参/
  错误码，实现归各批 SPEC——ADR-0015「不预写 DEFS 终稿」同款纪律）。
- 不新增 env 语义：项目根锚定推荐案 = process.cwd() 零 env；若评估需 env 覆盖
  即中止转 needs-approval（护栏预埋，非本轮预期）。
- 不开 needs-approval issue（三实现项修宪授权 = issue#4 批复承继已闭合；本链
  零依赖零出站，无 ADR-0014 式依赖面请批诉求）。
- BK-0033/0034/0036~0038（各链实现段）不在本轮——一次迭代一件事；SPEC 四连
  收官后下轮按 ROADMAP 序进入实现段（预期 BK-0033）；`npm run gate:update` /
  golden 任何接触（POLICY 禁止区）。

## 受影响文件清单（= 产品提交白名单；S 项免 SPEC，本清单即定稿口径）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `docs/adr/0016-*.md`（命名语义：会话面板右侧工作台分批修宪方案——右栏容器与 git/diff/tree 三页签） | 纯新增 | ~260（≤400，AGENTS.md 硬性约定 4；对齐 ADR-0013/0015 体量 297/260 行） |

机制件（随归档提交，不属产品白名单）：`docs/evolution/BACKLOG.md`（BK-0039 置
done + BK-0040/0041/0042 定界回写 + 本轮 PLAN 轮 BK-0036/0037/0038 晋升 ready
存量回写）、`docs/evolution/STATE.md`、`docs/evolution/metrics.md`、
`iterations/0030/` 三件（S 项免 SPEC，PRD/JOURNAL/REPORT）。

零改动白名单：`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、
根/子包 `package.json` 与 `package-lock.json`、`README.md`（BK-0051 漂移归治理日）。

## 验收标准（Given/When/Then）

- **AC1 · ADR 落盘与要素完备**：Given 工作区干净、docs/adr 现行至 0015，When
  产品提交落盘，Then `docs/adr/0016-*.md` 恰一文件纯新增、行数 ≤400，含七要素
  （动机/容器信息架构/端点契约/安全面/分批修宪编排/golden 增量预案/子项定界
  回写索引）且每要素成节可索引；标题与状态标注含「草案」字样，状态行语义 =
  「草案 · 待实施轮消费」（ADR-0013/0015 同款——零依赖面故无 0014 式「待用户
  批准」位）；授权链引用：issue#4 批复 2026-10-23T15:49:17Z 承继（三实施修宪
  轮消费）。
- **AC2 · 定界锚点真实可核**：Given ADR 各定界节，When 按引用逐条对照代码锚点
  （Skeleton.tsx:136-137 #rightbar/#props、app.js:914/:1001/:1037/:1065/:2128
  props 面板事件面、server.ts:205-219 v1 路由族注册面、code.ts:7/:50/:53 子进程
  +超时纪律、tools.ts:16/:18-20 SANDBOX+safePath 防越界机理、config.ts 零
  PROJECT_ROOT 现状、gate.mjs:177-186 八场景表），Then 与代码逐一相符、无一
  杜撰；容器信息架构节显式覆盖属性面板共存方案（选项+利弊+推荐），端点契约节
  显式声明零出站与零 env 推荐案。
- **AC3 · 分批编排与 golden 预案成文**：Given ADR ⑤/⑥ 节，When 读编排与预案，
  Then 一页签一迭代口径（0040 容器+git → 0041 diff → 0042 tree，容器批次先行
  且为共享基建）齐备，每批受影响面四件套（前端三文件 + 后端 workbench 端点 +
  smoke 扩断言 + gate 场景增量）逐批列明，链终轮（BK-0042）回执 issue#4 关单
  口径在列；golden 双通道口径（新场景 golden-created + 受波及既有场景修宪轮
  重录、零波及须 gate 实测确认）与「场景编号按落盘时序（s8/s9 已由 ADR-0013
  预定、s10+ 预期由呈现链与本链按实际落盘序交错）」明示；WB_ROUTES 类路由
  fixture 需求评估成文（右栏在线态场景）。
- **AC4 · 定界回写 VERBATIM 一致**：When 核对 BACKLOG BK-0040/0041/0042 行备注
  与 ADR 定界节，Then 三行受影响文件清单/验收命令口径/实施序/晋升条件与 ADR
  字面一致（BK-0027 VERBATIM-OK 标准；BK-0042 链终轮回执 issue#4 关单口径
  保留）；回写随归档提交（产品提交仍恰 1 路径）。
- **AC5 · 白名单与零代码机器证明**：When `git show --numstat <产品提交>` 与
  `git diff` 核对，Then 产品提交恰 `docs/adr/0016-*.md` 一路径纯新增（+N/−0）；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空；`package-lock.json` 零变化（零依赖证明）。
- **AC6 · 纯回归面全绿**：When `npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server` 执行，Then 全部 exit 0——gate 8 场景 diffPx=0、契约
  测试全绿、smoke 95 passed / 0 failed（现基线，metrics 0026~0029 行；本轮零
  代码理论零漂移，任何红即环境异常回滚不硬闯；smoke V09 时点性假红沿
  0018/0021/0022 先例：提交后复跑自愈）。
- **AC7 · 指针抽样可开**：When 从 ADR 引用的代码/文件/issue 指针抽样 ≥5 条逐一
  打开，Then 全部命中无误（建议抽样：Skeleton.tsx:136-137、app.js:914、
  server.ts:215-219、code.ts:50-53、tools.ts:16-20、gate.mjs:177-186、
  ADR-0015 §5/§6、BK-0040/BK-0041/BK-0042/BK-9004 BACKLOG 行、issue#4 链任五
  以上）。

## 非功能要求

1. 行数预算：ADR ≤400 行（唯一新增文件，符合 AGENTS.md 硬性约定 4；建议
   260±60）。
2. 零新依赖 / 零新 env / 零新出站类别 / 零 shared 契约 / 零 UI 接触 / 零
   golden 接触（POLICY 自主区「文档与实现同步」；lock 零变化为机器证明）。
3. ADR 双位标注纪律：「草案 · 待实施轮消费」状态位 + 编号顺位（0016）与
   ADR-0013/0015 样板一致；不写「已批准」字样（issue#4 批复承继的是修宪实施
   授权，ADR 自身状态行更新留实施轮 CLOSE——0013/0015 先例）。
4. EOL 纪律：新文件 LF、无 BOM。
5. 回滚 = `git revert` 单提交（纯文档，无迁移面）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 容器信息架构越界预支实现（写成 DOM 结构终稿或页签伪代码） | 定界粒度锚定 ADR-0015 §4 画布渲染面同级（方案选项+利弊+推荐+文件清单+验收口径）；「不预写实现代码块」纪律入 ADR 头部；BUILD 期零代码边界由 AC5 机器证明 |
| 项目根锚定滑向 env 方案（触需批准面） | AC2 硬性声明零 env 推荐案（process.cwd() + 利弊）；评估若反转即中止转 needs-approval（ADR-0014 附录 A 先例），不写入草案推荐案 |
| git 子进程承载遗漏安全纪律（shell 拼接/无超时/可写命令混入） | AC2 必答项：code.ts:50 argv 数组零 shell + :53 超时同构 + 只读命令白名单逐条列明（status/log/diff/ls-files 级），可写命令（add/commit/push 类）一律排除 |
| tree 端点防越界遗漏（`../` 逃逸项目根） | AC2 必答项：tools.ts:18-20 safePath 机理同构转写（锚定根换项目根、resolve 后前缀校验），BK-0042 行内「防越界对齐 sandbox 纪律」口径兑现 |
| 与 BK-0034 会话面板布局协同未定界（两右栏面板冲突） | 背景 §8 已记：容器不硬依赖 BK-0034 但入口交互协同须入信息架构节（选项+推荐）；实施序 0033/0034 先于本链（ROADMAP.md:188-193），届时实测 |
| golden 场景编号预设冲突（BK-0033/0036 等实现项也加场景） | 「编号按落盘时序」纪律（ADR-0014 对 ADR 编号、ADR-0015 对场景编号同款），不锁死具体号 |
| 定界回写与 ADR 漂移（两处口径不一） | AC4 VERBATIM 一致（BK-0027 VERBATIM-OK 先例）；回写随归档提交前由 VERIFY 逐字比对 |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022/0024 先例） | 沿先例口径：提交后 CLOSE 复跑自愈，VERIFY 记实得值判据 0 failed |

## 需求清单（REQ-0039-xx）

- REQ-0039-01：ADR-0016 草案落盘（七要素 + 草案双标注 + 授权链引用，AC1）。
- REQ-0039-02：右栏容器信息架构 + workbench 端点契约 + 安全面定界（锚点逐条
  可核、零出站零 env 推荐案、git 子进程纪律、safePath 同构，AC2）。
- REQ-0039-03：分批修宪编排 + golden 增量预案 + WB_ROUTES fixture 需求评估
  （AC3）。
- REQ-0039-04：BK-0040/0041/0042 三行 BACKLOG 定界回写 VERBATIM（AC4）。
- REQ-0039-05：边界不变式——产品提交恰 docs/adr/0016-*.md 一路径、零代码零
  依赖零 shared 零 UI 零 golden（AC5）；全程禁 gate:update。
- REQ-0039-06：纯回归面全绿 + 指针抽样（AC6/AC7）；产品提交恰一个
  （Conventional Commits，如 `docs(adr): BK-0039 工作台右栏分批修宪 ADR 草案 +
  子项定界`）。

## §7 · SPEC 内嵌定界（S 项免独立 SPEC，skipSpec=true——BK-0031/0035 先例）

> 本节即 SPEC 替代物：BUILD/VERIFY 以本节 + 上文清单/AC 为准；与 CONSTITUTION /
> 代码现状冲突时以 CONSTITUTION > 代码现状 > 本 PRD 为顺位。

**ADR-0016 章节骨架与行数预算分配（建议，总 ~260 行 ≤400）**：

| 节 | 内容 | 行数 |
| --- | --- | --- |
| 头部 + 状态行 + 授权链 | 「草案 · 待实施轮消费」+ issue#4 承继 2026-10-23T15:49:17Z + 零依赖零出站零 env 声明 | ~10 |
| §1 动机与现状证据 | issue#4 链上下文 + 差异化定位 + 右栏现状证据（#rightbar/#props 唯一住户、workbench 能力差距） | ~25 |
| §2 右栏容器信息架构定界 | 属性面板共存方案（页签并入/独立容器/会话面板联动，选项+利弊+推荐）+ 三页签结构（git/diff/tree）+ 入口交互 + 前端三文件影响面定性 | ~55 |
| §3 workbench 只读端点契约定界 | 三端点族（git 信息/diff/tree：路径/方法/入参/出参/错误码）+ git 子进程承载纪律（argv 零 shell + 超时 + 只读命令白名单）+ 项目根锚定（process.cwd() 推荐案） | ~70 |
| §4 路径防越界与安全面 | safePath 机理同构（锚定根=项目根）+ 只读不变式 + 零出站声明（guard 面无涉）+ 零 env 声明（护栏：反转即转 needs-approval） | ~30 |
| §5 分批修宪编排 | 一页签一迭代：0040 容器+git（共享基建先行）→ 0041 diff → 0042 tree（链终轮回执 #4）；每批四件套（前端三文件+后端端点+smoke+gate 场景）；与 ADR-0015 §5 的同构/差异（无 DEFS/baseline 联动）注记 | ~30 |
| §6 golden 增量预案 | 双通道口径 + 右栏在线态场景形态草图 + 编号按落盘时序（s8/s9 已预定、s10+ 交错）+ WB_ROUTES 类 fixture 需求评估 | ~20 |
| §7 BK-0040~0042 定界回写索引 | 三行回写字面模板（供 VERIFY VERBATIM 比对）+ 晋升条件（BK-0039 CLOSE 后由 PLAN 轮晋升）+ BK-0042 链终轮回执 issue#4 关单 | ~15 |

**端点契约制式约束（§3 逐端点必答）**：路径（预期 `/api/v1/workbench/*`
形态，v1-only）；方法（只读 GET 为主，diff 可带 query）；入参（tree 带 path
前缀/diff 带 ref 对，均须防越界校验）；出参（JSON 契约级字段清单，不写实现）；
错误码（400 越界/404 无 git 仓库/500 git 超时，对齐 sessions 五端点错误码
风格）；git 白名单（status/log/diff/ls-files 级只读命令逐条列明，排除一切可写
命令）。

**验收命令口径（BUILD/VERIFY 执行面）**：`npm run build` + `npm run gate`
（8 场景 diffPx=0 纯回归）+ `npm test`（契约测试全绿）+ `npm run smoke:server`
（95 passed / 0 failed 基线零漂移）+ AC7 指针抽样 ≥5 条；产品提交白名单恰
`docs/adr/0016-*.md` 一路径，提交信息 Conventional Commits 单提交。
