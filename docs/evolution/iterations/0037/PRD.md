# PRD · 迭代 0037 · BK-0050 节点库「智能体」类目：agent 节点独立分组 + 类目色（修宪轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-26 00:30（工作树
> `.zcode/worktree/feat/0037-iter`，分支 `feat/0037-iter`）。
> 选题来源：BACKLOG BK-0050（ui-proposal / 触UI=是 / **P0 / S / ready** / 来源
> `issue#6`，BACKLOG.md:63）。BK-9006 五子项之一（短修宪穿插项）；2026-10-25
> 迭代 0033 PLAN 轮晋升 ready（晋升条件「BK-0033 CLOSE 后随链晋升」已随迭代
> 0031 终态 done 兑现——iterations/0031/REPORT.md 明载 agent 节点已入列）。
> 授权链（本轮亲核）：`gh issue view 6` → state=OPEN（关单留五子项全部终了，
> 沿 issue#2~#5 链先例）+ owner `liusuren123`（association=OWNER）评论「批准」
> `createdAt 2026-10-24T08:38:51Z` 在案（与 BACKLOG 迭代 0021 PLAN 轮批复同步
> 记载一致）+ ADR-0013 §2.4 类目色两段口径（「独立『智能体』类目（CATS 新键 +
> `--cat-agent` 变量）归 BK-0050，issue#6 承继」）+ ADR-0013 §6:223 golden
> 预案行（「节点库面板场景……修宪轮重录（issue#6 承继，不在本 ADR 射程）」）
> ——修宪通道三要素齐备（宪法第 3 条），不需要新一轮 needs-approval。
> 定界权威：ADR-0013 §2.4 + §6:223 + BACKLOG BK-0050 行 / BK-0033 行（类目色
> 两段口径）+ ROADMAP 待办节实施序列（ROADMAP.md:191「BK-0050 节点库智能体
> 类目随 0033 落地后可插入」——插入条件已兑现）。
> 先例：迭代 0013（BK-9001，修宪轮 gate:update 重录通道直系先例）、迭代 0031
> （BK-0033，agent 节点入列 + s3 修宪轮 gate:update 恰一次重录 + s8
> golden-created；baseline 17 键重产与契约测试联动）、迭代 0022（生成器幂等
> 重跑口径）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9006
> 杂项链；差异化主轴「画布编排 × 深度智能体工作台」，ROADMAP.md:124-130）。
> 批次编排：单项单迭代（S 级但**触UI=是 → 需独立 SPEC，skipSpec=false**——
> WORKFLOW §4 免 SPEC 条件为「非 doc、非触 UI」）。issue#6 名下姊妹子项
> BK-0046/0047/0048/0049 仍 proposed 未竟 → 本轮 done 仅发**进度回执、不关
> issue#6**（BK-9006 行明载「关单留五子项全部终了由末项 CLOSE 回执」）
> → **itemContinues=true**。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-26 00:25~00:30 核实）

- **优先序①（本轮档案 approved/rejected）**：approved 无、rejected 无 → 零
  批复同步动作、零 skipped 改写。
- **优先序②（ready 队列逐项处置）**：本会话逐行核对工作树 BACKLOG 主池，现
  ready 非 doc 项恰 3 个：
  - **BK-0038**（P0/M，issue#3 链终轮）——**禁选**（派发注入并行占用提示：
    已被其他并行工作流占位）；
  - **BK-0040**（P0/M，issue#4 链批次 1）——**禁选**（同上）；
  - **BK-0050**（P0/S，issue#6）——可选，前置 BK-0033 已 done（迭代 0031）。
  另 BK-0051 为 doc 类型 proposed——心跳不选（WORKFLOW §4）。
- **优先序③（无补题需求）**：ready 未枯竭，不触发侦察补题。
- **结论**：唯一合法可选 ready 项 = **BK-0050**；且与 ROADMAP 待办节「短修宪
  穿插项排期，随 0033 落地后可插入」的序列指导一致（BK-9003/BK-9004 两链
  实现段本轮均被并行占用，穿插项恰补空档）。

## 结论

**建议做（本迭代即做）**——三条理由：

1. **授权与前置齐备**：issue#6 用户批复在案（本轮 gh 亲核，见头部）；承载
   前置 BK-0033 done——agent 节点已在库（现归 chat 组，ADR-0013 §2.4 两段
   口径第一段），「空类目无意义」的依赖已解（BACKLOG BK-0050 行）。
2. **差异化叙事补全**：T5 定位「画布编排 × 深度智能体工作台」，节点库是用户
   感知能力地图的第一入口——通用智能体混在「对话」组弱化差异化主张；独立
   「智能体」分组让能力地图与叙事对齐（issue#6 原文五要点之一）。
3. **影响面窄而封闭**：纯呈现性重组——1 个 DEFS 字段值变更（category）+ 1 个
   枚举键 + 前端两处纯插入（CATS/catColor 映射）+ 1 个 CSS 变量；后端零消费
   category（本会话 grep `apps/server/src/` 零命中）、零端口/参数/binding/
   SSE 事件变化、零新依赖、零新 env。

**归属 CONSTITUTION 第 3 条变更需求，且已获用户批准 → 走修宪通道**（ADR 要素
在案（ADR-0013 §2.4/§6:223 预案）+ 批复在案 + 本迭代受波及基线重录）。

## 触UI 分类结论

**是（修宪轮）**。宪法第 3 条三要素：

| 要素 | 证据 |
| --- | --- |
| ADR 在案 | ADR-0013 §2.4（类目色两段口径：第二段即本项，「CATS 新键 + `--cat-agent` 变量」）+ §6:223（BK-0050 golden 预案行：节点库面板场景修宪轮重录，issue#6 承继） |
| 用户批复在案 | issue#6 owner 评论「批准」2026-10-24T08:38:51Z（本会话 gh 亲核，association=OWNER） |
| golden 重录 | 本轮无新场景；受波及既有场景 s3-library / s8-agent-node（+s9 如实测波及）经修宪轮 `npm run gate:update` **恰一次**重录（先例：迭代 0013 s6/s7、迭代 0031 s3） |

**波及控制（硬约束）**：

- 改动形态 = **纯插入优先**（app.js CATS/catColor 两处各加一行、app.css
  `:root` 加一变量；唯一非插入点是 agent/node.ts 的 category 字段值替换
  `'chat'`→`'agent'` 一词）。
- **预期零波及场景** s0/s1/s2/s4~s7/s10/s11（无节点库帧、无 agent 节点）与
  Skeleton.tsx / events.ts / nodes.ts / gate.mjs / apps/server——gate 全场景
  实测确认，任一意外红即**中止排查、不重录掩盖**。
- **SSE 契约零接触**（events.ts 零改动）；确需新增事件类型即中止转
  needs-approval（BK-0016 先例护栏）。
- **搜索行为自动获得**：paint() 以 `cfg.name` 参与搜索（app.js:325），
  「智能体」分组名自动可搜，零额外代码。

## 现状证据（本会话亲核，2026-10-26）

- 类目地图硬编码于 `apps/web/src/legacy/app.js:47-55`（CATS 七键：input/
  chat/knowledge/tools/logic/output/human），分组渲染按 `d.cat===cat` 过滤
  （app.js:324），空组直接跳过（app.js:327）——**仅加 CATS 键而不改 DEFS
  category 则智能体组恒空**，故 DEFS 变更不可省略。
- 类目色读取映射 `app.js:131-132`（`{input:'--cat-input',…}[t]`，缺省
  `'#666'`）——**必须同步加 agent 键**，否则 agent 节点标题栏类目色静默
  回退灰 #666。
- CSS 变量 `apps/web/src/app.css:19-20`（`--cat-input:#4f8cff` 等 7 个）。
- schema 冻结枚举 `packages/shared/src/nodes.schema.ts:15`（CATEGORIES 七值
  as const）+ `:92`（`category: z.enum(CATEGORIES)`）——新增类目键必须扩
  枚举，属 POLICY 需批准区「shared DEFS 变更」，由 issue#6 修宪授权承继覆盖。
- agent 节点定义 `packages/shared/src/nodes/agent/node.ts:10`
  （`category: 'chat'`，icon sparkles；其余字段本轮零触碰）。
- 契约测试断言面：defs-drift 只断言默认值（本会话 grep 无 category 断言）；
  nodes-dirs 断言 D===17（目录数不变，预期零回退）；schema.test 用自有
  fixture（delay/trigger/llm），不依赖 agent category。
- agent README 为生成物（`tools/gen-node-readmes.mjs`），本会话亲核其内容
  不含 category 行（标题/描述/端口/参数/能力四节）——重跑生成器预期零变化，
  实跑为准。
- 后端零消费：`grep -rn "category" apps/server/src/` 零命中。

## 需求（Given / When / Then）

### REQ-0050-01 · shared DEFS：类目枚举扩展 + agent 节点归属变更

- **Given** CATEGORIES 七值（nodes.schema.ts:15）冻结枚举；agent 节点
  `identity.category='chat'`（nodes/agent/node.ts:10）；baseline 快照 17 键
  在库。
- **When** CATEGORIES 数组 +`'agent'` 键（插入位建议 chat 之后，SPEC 定稿）；
  agent node.ts category 一词改 `'agent'`；`nodes.baseline.json` 按既定流程
  再生产。
- **Then** ① `npm test`（shared）全绿——schema 校验通过（'agent' 为合法
  枚举值）、nodes-dirs D===17 不变、defs-drift/readme-consistency/
  param-handler-guard 零回退；② 再生产后 baseline 恰 agent 键 category 值
  变化、其余 16 键逐字节不变（cmp/ sha256 差异定位法沿迭代 0018 先例）；
  ③ agent 节点其余 DEFS 字段（ports/params/binding/icon/keywords）零变化。

### REQ-0050-02 · 前端类目地图 + 类目色变量（纯插入）

- **Given** CATS 七键硬编码（app.js:47-55，宪法冻结面）；catColor 映射
  （app.js:131-132）；`:root` 七个 `--cat-*`（app.css:19-20）。
- **When** CATS +`agent:{name:'智能体',c:'var(--cat-agent)'}`（插入位与
  chat 相邻，SPEC 定稿）；catColor 映射 +`agent:'--cat-agent'`；
  app.css `:root` +`--cat-agent:<色值>`（色值 SPEC 定稿——建议与既有七色
  色相区分度足够的 teal 系，如 #14b8a6；避开 #22c55e 绿 / #22d3ee 青）。
- **Then** 手动 E2E：① 节点库出现「智能体」分组，恰含「通用智能体」一条、
  计数徽标 cnt=1；② chat 分组条目集回到 agent 入列前形态（不含通用智能体）；
  ③ 画布上 agent 节点标题栏类目条色 = `--cat-agent` 实值（非 #666 回退）；
  ④ 节点库搜索「智能体」可命中该条目（cfg.name 参与搜索，app.js:325）；
  ⑤ 既有七分组渲染零变化。

### REQ-0050-03 · golden 受波及重录（修宪轮 gate:update 恰一次）

- **Given** gate 12 场景在库（s0~s11，gate.mjs:237-252）；s3-library 含节点
  库全分组帧；s8-agent-node 与 s9-goal-panel-online 的画布 seed 均为
  AGENT_WF_SEED（gate.mjs:183/:245-249，含 agent 节点）。
- **When** REQ-0050-01/02 落地后跑全场景 gate。
- **Then** ① s3-library 必然红（分组重组）→ 重录；② s8-agent-node 必然红
  （agent 节点标题栏类目色 chat 紫→agent 色）→ 重录；③ s9-goal-panel-online
  是否受波及取决于背景画布 agent 节点是否入镜——**以实测为准**，红即属预期
  波及、一并重录；④ s0~s2/s4~s7/s10/s11 预期零波及——任一红即中止排查；
  ⑤ 重录仅经 `npm run gate:update` **恰一次**（修宪轮通道，授权链在案），
  重录后连续跑 gate 全场景 diffPx=0 两轮确认稳定（迭代 0013 先例）。

### REQ-0050-04 · 回归面与联动核验

- **Given** smoke 现 118 断言（含 A 组 agent 断言，迭代 0031/0034 后基线）；
  gen-node-readmes 生成器幂等口径在库（迭代 0022）。
- **When** 实施完成、基线重录后。
- **Then** ① `npm run build` exit 0；② `npm run gate` 12 场景全 pass
  diffPx=0；③ `npm test` 全绿；④ `npm run smoke:server` 零回退（A 组零
  回退；V09 时点性假红先例形态除外，产品提交后自愈）；⑤ 生成器重跑 agent
  README 预期零变化（亲核模板不含 category；实跑输出为准）；⑥ 手动 E2E
  五点位（REQ-0050-02 ①~⑤）。

## 受影响文件清单（SPEC 基准）

| 文件 | 改动 | 性质 |
| --- | --- | --- |
| `packages/shared/src/nodes.schema.ts` | CATEGORIES +`'agent'`（:15 区） | 枚举扩一键（需批准面，issue#6 承继） |
| `packages/shared/src/nodes/agent/node.ts` | category `'chat'`→`'agent'`（:10 一词） | DEFS 值变更（需批准面，同上） |
| `packages/shared/test/nodes.baseline.json` | 再生产（agent 键 category 值） | 快照联动 |
| `apps/web/src/legacy/app.js` | CATS +1 键（:47-55 区）+ catColor 映射 +1（:131-132） | 纯插入×2 |
| `apps/web/src/app.css` | `:root` +`--cat-agent`（:19-20 区） | 纯插入×1 |
| `tests/golden/ui/s3-library/*`、`s8-agent-node/*`（+`s9-goal-panel-online/*` 如实测波及） | 修宪轮重录 | golden 增量（gate:update 恰一次） |

**预期零改动**：Skeleton.tsx / events.ts / nodes.ts 聚合层 / gate.mjs /
`apps/server/**` / `tests/smoke/**`（若 SPEC 评审发现清单外必改点，按
WORKFLOW §4 BUILD 中止条款处理，不静默扩面）。

## 不做范围（out of scope）

- 不动 agent 节点 DEFS 其余字段与 goal 面板（BK-0033/0034 已 done）。
- 不迁移其他节点类目、不新增节点类型。
- 不做 BK-0046~0049（approval 审批人选择器 / kb 动态化 / on-error 参数 /
  MCP·skills 清单动态化）——各自独立子项，等各自前置。
- 不引入新 npm 依赖、新 env、新出站类别、新 SSE 事件。

## 验收命令口径

`npm run build` + `npm run gate`（重录后 12 场景 diffPx=0，连续两轮稳定）+
`npm test` + `npm run smoke:server`（零回退）+ 手动 E2E 五点位（REQ-0050-02）。
证据留档口径沿迭代 0033/0034（MERGE 后主干复测 + evidence/）。
