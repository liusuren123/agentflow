# SPEC · 迭代 0037 · BK-0050 节点库「智能体」类目（agent 节点独立分组 + 类目色，修宪轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-26 00:45（工作树
> `.zcode/worktree/feat/0037-iter`，分支 `feat/0037-iter`）。
> 输入：`iterations/0037/PRD.md`（2026-10-26 00:30）+ 本会话全量代码亲核（§0）。
> 授权链（承 PRD 亲核，不重开）：issue#6 owner 批复 2026-10-24T08:38:51Z +
> ADR-0013 §2.4（类目色两段口径）/§6:223（golden 预案行）+ **本轮新落盘
> ADR-0017**（BK-0050 专属三要素载体，见 §1.3 裁示）。
> 先例：迭代 0013（修宪轮 gate:update 恰一次 + 连续两轮稳定）、迭代 0031
> （修宪轮 SPEC 结构与 golden 方案格式）、迭代 0018（baseline 差异定位法）。

## 0. 本会话代码核实记录（2026-10-26 00:33~00:45，只读）

PRD「现状证据」节全部锚点复核命中，并**新核实出 3 处 PRD 清单外必改点与
2 处事实勘误**（详见 §2）：

- `apps/web/src/legacy/app.js:47-55`（CATS 七键：input/chat/knowledge/tools/
  logic/output/human）；`:130-132`（catColor 七键映射，缺省回退 `'#666'`）；
  `:323-337`（节点库 paint：`Object.entries(CATS)` 序 = 分组渲染序、
  `d.cat===cat` 过滤 :325、空组跳过 :327、搜索串含 `cfg.name` 分组名 :326）；
  `:762`（节点标题栏 `--nc` ← catColor）；`:940-941`（属性面板 picon 边色 +
  `CATS[def.cat].name`）；`:1110`（小地图节点填充 ← catColor，未选中
  globalAlpha .65）；`:1699-1705`（搜索面板 sicon/stag ← catColor/CATS）。
- `apps/web/src/app.css:19-20`（`:root` 七个 `--cat-*`：input #4f8cff / chat
  #a06bff / knowledge #22c55e / tools #f59e0b / logic #22d3ee / output #f472b6 /
  human #f87171）；`:316`（#minimap-wrap right:14 bottom:58）；`:552-555`
  （#goal-panel fixed right:18 bottom:76 360×520 z-index:60）。
- `packages/shared/src/nodes.schema.ts:15`（CATEGORIES 七值 as const）+ `:92`
  （`category: z.enum(CATEGORIES)`）；**`packages/shared/src/types.ts:23`
  （`NodeCategory` 七值字面量联合——PRD 清单外）**；`nodes/agent/node.ts:10`
  （`category: 'chat'`）；`nodes.ts:106`（`cat: def.identity.category`——types.ts
  不扩即 tsc 红）；`nodes.ts:117-137`（NODES **19 键**：trigger…approval）。
- **`packages/shared/test/contract.test.mjs:14`（`['input','chat',…,'human']
  .includes(def.cat)` 硬编码白名单——PRD 清单外；不改则 npm test 必红
  「agent cat 非法」）**；`nodes-dirs.test.mjs:5`（断言 **D===19**，非 PRD 写的
  17）；`defs-drift.test.mjs:16`（agent 只断言 model/sys/maxSteps 默认值，无
  category 断言）；`synthesis.test.mjs:60-74`（baseline Buffer 级常驻比对，:72
  指向迁移 SPEC §2 再生命令）；`schema.test.mjs:14/:28/:45`（自有 fixture
  delay/trigger/llm，不涉 agent）。
- `packages/shared/test/nodes.baseline.json`：**19 键**亲读，`agent.cat='chat'`；
  全表 cat 分布：input×2 / chat×3（llm、agent、prompt）/ knowledge×2 / tools×3 /
  logic×4 / output×4 / human×1。
- `tools/gen-node-readmes.mjs:117`（`types.length !== 19` 硬断言——本轮不加
  节点类型，不触发）；`nodes/agent/README.md` 亲读：标题/描述/端口/参数/能力/
  现状备注六节，**无 category 行**。
- `apps/server/src/` grep `category` 零命中；`tests/smoke/smoke-server.mjs`
  grep `.cat` 零命中（A 组 A01-A05 为 agent handler 执行断言，走 mock LLM，
  不读 category）。
- `tools/pixel-gate/gate.mjs:237-257`（12 场景 s0~s11）；`:260`（视口 1600×900）；
  `:296`（**cssVars 不变量：`document.styleSheets[0]` 全部 `--*` 变量——公共
  六键之一，每场景都采**）；`:321-326`（gate:update / golden-created 落盘通道）；
  `:331-338`（invDiff 或 diffPx>0 即 FAIL + diff 产物落 `tests/golden/diff/`）；
  `:351-353`（全绿时自动清空 diff 目录）。
- golden 基线亲读（node 脚本实跑）：`s0-initial.invariants.json` 的 cssVars 含
  `--cat-input…--cat-human` 七键（`:root` 变量表确在不变量采集面内）；
  `s8-agent-node` / `s9-goal-panel-online` 的 nodes 矩形同为
  `["1:149,407,300x94","2:519,327,300x280"]`（agent 节点占 x 519-819、y 327-607）。
- `docs/node-definition-protocol.md:121`（identity.category 行罗列七类目——
  需文档同步，PRD 清单外）；README grep `--cat`/类目色 零命中（视觉规格表现为
  一行概述指向 git 历史，无类目色表——README 零改动）。
- 全仓 `'human'` 枚举残留扫描：类目语义的硬编码恰 5 处（nodes.schema.ts:15 /
  types.ts:23 / contract.test.mjs:14 / app.js CATS+catColor 两处）+ app.css
  `:root` 变量；其余命中（approval 审计 mode、KIND_ORDER 能力序等）均非类目面。
- 工作树状态亲跑：分支 `feat/0037-iter`，`git status --porcelain` 仅
  `M docs/evolution/STATE.md` + `?? docs/evolution/iterations/0037/`（机制件，
> 无产品代码改动）。

## 1. 范围与护栏裁示

### 1.1 触 UI = 是，修宪轮（承 PRD 结论）

改动横跨宪法三层：视觉层（节点库新分组 + agent 节点标题栏/小地图类目色）、
结构层（app.css `:root` 新 CSS 变量——**cssVars 是宪法第 2 条明列的 DOM 不变量
「:root CSS 变量表」**）、数据层（shared DEFS category 枚举 + agent 归属值）。
授权链闭合：issue#6 批复在案（PRD 亲核）+ ADR-0013 §2.4/§6:223 预案 +
本轮 ADR-0017（§1.3）+ 本迭代内 golden 重录（§6）——宪法第 3 条三要素齐备。

### 1.2 零接触面（硬边界，任一被突破即中止）

- **SSE 契约零接触**：`packages/shared/src/events.ts` 零 diff（机器证明归
  BUILD）；确需新增事件类型即中止转 needs-approval（BK-0016 先例护栏）。
- **gate.mjs 零改动**：本轮**无新场景**（s3/s8/s9 既有），比对逻辑与场景表
  逐字不动——比迭代 0031 更窄（0031 尚需 +s8 场景行）。
- **后端零改动**：`apps/server/**` 零 diff（grep 亲核零消费 category）。
- **agent 节点 DEFS 其余字段零触碰**：ports/params/binding/icon/keywords 与
  node.ts 其余行逐字不动（category 一词替换为唯一非纯插入点）。
- **不做范围**承 PRD：不迁移其他节点类目、不动 goal 面板、不做 BK-0046~0049、
  零新依赖 / 零新 env / 零新出站 / 零新 SSE 事件。

### 1.3 ADR 处置：新建 ADR-0017（与迭代 0031「零新 ADR」先例的差异说明）

迭代 0031 免新 ADR 的前提是 **ADR-0013 §8 明载 BK-0033/0034 实施定界**（其
SPEC §1 原文：「全部架构决策已由 ADR-0013 承载」）。BK-0050 相反：ADR-0013
§9 明文「不在本 ADR 射程」，§2.4/§6:223 仅一行预案（无影响面清单、无像素证据
方案）。宪法第 3 条要素①要求「先提交 ADR，说明动机、影响面、像素对比证据」
——故本轮在 `docs/adr/0017-node-library-agent-category.md` 落盘 BK-0050 专属
ADR，状态标注**「已获用户 issue #6 批复」**（批复时点 2026-10-24T08:38:51Z，
owner 评论亲核在案；不重开 needs-approval——PRD 优先序①结论维持）。ADR 随
机制件提交入库；其 §6 golden 重录范围按本 SPEC §6 定稿（含 PRD 未预见的全
场景 invariants 波及，ADR 如实记录）。

## 2. PRD 勘误（SPEC 阶段修正，BUILD/VERIFY 以本节为准）

| # | PRD 原文 | 实测事实（证据） | 处置 |
| --- | --- | --- | --- |
| 1 | 受影响文件清单 6 行，无 types.ts | **`types.ts:23` `NodeCategory` 七值字面量联合是 tsc 硬依赖**：nodes.ts:106 `cat: def.identity.category`，枚举扩而类型不扩 → `npm run build:shared` 红 | 清单 +1（§3 #2）。属既有批准面（shared DEFS 枚举扩展）的实现完整性补正，非扩面 |
| 2 | 同上，无 contract.test.mjs | **contract.test.mjs:14 硬编码七值 cat 白名单**：`NODES.agent.cat='agent'` 后 `npm test` 必红「agent cat 非法」 | 清单 +1（§3 #4）。测试联动面，非扩面 |
| 3 | 「baseline 快照 17 键在库」「其余 16 键逐字节不变」「nodes-dirs 断言 D===17」 | **19 键 / 其余 18 键 / D===19**（nodes.ts:117-137、synthesis.test.mjs:60「19 键全量」、nodes-dirs.test.mjs:5、baseline 亲读；PRD 数字沿自迭代 0031 时代，0033 webshow/0034 termview 各 +1） | 验收口径按 19/18 改写（§5/§8） |
| 4 | REQ-0050-03 ③「s9 是否受波及以实测为准」 | **几何定稿：必波及**。agent 节点矩形 519,327,300×280（s8/s9 golden invariants 亲读），goal 面板占 x 1222-1582、y 304-824（app.css:552 + 视口 1600×900 gate.mjs:260）——零交叠，agent 节点标题栏完全入镜 | s9 列入必重录集（§6） |
| 5 | REQ-0050-03 ④「s0~s2/s4~s7/s10/s11 预期零波及——任一红即中止排查」 | **像素零波及成立，但不变量必波及**：cssVars（gate.mjs:296）是每场景公共不变量，`:root` 新增 `--cat-agent` → 12 场景 invariants.json 全部变化（s0 golden 亲读 cssVars 含全部 `--cat-*`）。该 9 场景将以 `diffPx=0 · DOM不变量变化` 形态 FAIL | 预期红模式表改写（§6.2）；「中止排查」触发条件收窄为 **diffPx>0**（不变量差异属预期） |

勘误 1/2 不改变 PRD 定界（影响面仍封闭于 shared DEFS 枚举 + 前端纯插入 +
golden 重录），按 WORKFLOW §4 SPEC 职责在规格层修正，不需回退 PLAN。

## 3. 受影响文件清单终稿（BUILD productFiles 白名单基准；`git show --numstat` 核对）

| # | 文件 | 改动字面量 | 性质 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes.schema.ts` | `:15` CATEGORIES 数组 `'chat',` 后插 `'agent',` | 枚举扩一键（需批准面，issue#6 承继） |
| 2 | `packages/shared/src/types.ts` | `:23` NodeCategory `'chat'` 后插 `\| 'agent'` | 同上（**PRD 清单外**，§2 勘误 1） |
| 3 | `packages/shared/src/nodes/agent/node.ts` | `:10` `category: 'chat'` → `category: 'agent'`（一词） | DEFS 值变更（需批准面，同上） |
| 4 | `packages/shared/test/contract.test.mjs` | `:14` 白名单数组 `'chat',` 后插 `'agent',` | 测试联动（**PRD 清单外**，§2 勘误 2） |
| 5 | `packages/shared/test/nodes.baseline.json` | 再生产（§5 命令；恰 agent 块 1 行 cat 值变更） | 快照联动 |
| 6 | `apps/web/src/legacy/app.js` | `:49` chat 行后插 `  agent:     { name:'智能体',   c:'var(--cat-agent)' },`；`:131` 映射 `chat:'--cat-chat',` 后插 `agent:'--cat-agent',` | 纯插入×2 |
| 7 | `apps/web/src/app.css` | `:19` `--cat-chat:#a06bff;` 后插 ` --cat-agent:#14b8a6;` | 纯插入×1 |
| 8 | `docs/node-definition-protocol.md` | `:121` 类目枚举串 `input/chat/…/human` → `input/chat/agent/knowledge/…/human` | 文档同步（自主区；防协议文档漂移，**PRD 清单外**） |
| 9 | `tests/golden/ui/s3-library.*`、`s8-agent-node.*`、`s9-goal-panel-online.*` | png + invariants.json 重录（像素实质变化） | golden 重录（修宪轮 gate:update，§6） |
| 10 | `tests/golden/ui/{s0,s1,s2,s4,s5,s6,s7,s10,s11}.*` | 仅 invariants.json（cssVars +1 键；png 预期逐字节不变） | 同上（§2 勘误 5） |

**预期零改动（机器证明归 BUILD）**：`Skeleton.tsx`（库内容为 renderSideNodes
动态渲染，骨架无分组 DOM）、`events.ts`、`nodes.ts`（聚合层零内联，cat 自动
流过 synthesize）、`gate.mjs`、`apps/server/**`、`tests/smoke/**`、
`tools/gen-node-readmes.mjs`（:117 断言 19 键不触发）、各节点 README（§7.6）、
`README.md`、`package.json`/lock、`.github/**`。
若 BUILD 发现上表之外必改点：**中止并按 WORKFLOW §4 BUILD 条款处置**（触 UI
即转 pending-approval；纯实现完整性问题回报 SPEC 修订），不静默扩面。

## 4. 设计定稿

### 4.1 类目键与插入位（五处一致：全部 chat 之后）

`CATEGORIES`（nodes.schema.ts:15）、`NodeCategory`（types.ts:23）、CATS
（app.js:49）、catColor 映射（app.js:131）、`--cat-agent`（app.css:19）五处
插入位统一取 **chat 之后**。依据：`Object.entries(CATS)` 键序 = 节点库分组
渲染序（app.js:323）——「智能体」紧邻其原归属组「对话」，语义连续；五处同位
降低实现与审读成本。终态分组序：输入 / 对话 / **智能体** / 知识 / 工具 / 逻辑 /
输出 / 人工。

### 4.2 类目色值定稿：`--cat-agent:#14b8a6`

- 依据①（PRD 建议承接）：PRD REQ-0050-02 建议「teal 系，如 #14b8a6；避开
  #22c55e 绿 / #22d3ee 青」——本 SPEC 定稿采纳该建议值。
- 依据②（色板族一致性）：既有七色中五色为 Tailwind 标准色板（#22c55e
  green-500 / #f59e0b amber-500 / #22d3ee cyan-400 / #f472b6 pink-400 /
  #f87171 red-400）；#14b8a6 = teal-500，同族入列，与 #4f8cff/#a06bff 两个
  自定值并存不冲突。
- 依据③（区分度）：色相 173°——与绿（142°）差 31°、与青（187°）差 14° 但
  亮度显著更低（teal L≈40% 对 cyan L≈53%）且明显偏绿相；与蓝（217°）紫
  （258°）琥珀（38°）粉（330°）红（≈4°）五色色相距均 ≥44°。暗底（--bg
  #171718）上三个消费面（节点标题栏 `--nc` app.js:762、库分组点+条目左条
  app.js:330/334、小地图填充 app.js:1110）均可辨。
- 消费链单点定义：CATS.agent.c = `var(--cat-agent)` → catColor('agent') 读
  `--cat-agent`——**若 §3 #6/#7 任一遗漏，agent 节点标题栏/分组点静默回退
  灰 #666（app.js:132 缺省）**，VERIFY §8 E2E ③ 专查此回归。

### 4.3 数据流转（零新代码路径）

agent/node.ts `category:'agent'` → nodes.schema zod 校验（枚举已扩）→
synthesize（nodes.ts:106）→ `NODES.agent.cat='agent'` → 前端 DEFS（app.js:134
`NODES` 单一事实源）→ 节点库 `d.cat===cat` 命中新分组（app.js:325）→ catColor/
CATS 渲染。后端 NODE_NAMES/paramDefaultsOf 不读 cat（亲核），零影响。搜索行为
自动获得：分组名 `cfg.name` 参与搜索串（app.js:326），「智能体」可搜，零额外
代码。

## 5. baseline 再生产方案

命令（`docs/node-definition-protocol-migration-spec.md` §2 :36 原文，两步）：

```bash
npm run build:shared
node -e "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > packages/shared/test/nodes.baseline.json
```

- **执行环境注意**：在 Git Bash 执行（node stdout 为 LF，`.gitattributes` 对
  该文件 `text eol=lf` 归一）；**禁用 PowerShell `>`**（UTF-16 重编码会毁快照，
  synthesis Buffer 级比对立刻红）。
- **预期 diff**（核对法沿迭代 0018 差异定位先例）：`git diff -- packages/
  shared/test/nodes.baseline.json` 恰 **1 hunk / 1 行**——agent 块内
  `"cat": "chat"` → `"cat": "agent"`（llm/prompt 块的相同字面不受影响：JSON
  键序=插入序、缩进 2 空格均不变）；**其余 18 键逐字节不变**。
- 转绿判据：`npm test`（root，含 build:shared/build:server 前置）全绿，其中
  synthesis.test.mjs:60 快照常驻比对通过。

## 6. golden 重录方案（修宪轮必答；宪法第 3 条依据与范围）

### 6.1 依据（宪法第 3 条三要素，逐条在案）

1. **ADR**：ADR-0017（本轮落盘，动机/影响面/像素对比证据三要素齐备）+
   ADR-0013 §2.4/§6:223 源头预案。
2. **用户批准**：issue#6 owner「批准」2026-10-24T08:38:51Z（PRD 亲核；本 ADR
   状态行引用）。
3. **同迭代重录 + 前后对比**：§6.3 流程内完成；前后对比证据 = gate:update 前
   实跑自动落盘的 `tests/golden/diff/{s3,s8,s9}.diff.png` + `.current.png` +
   `.invariants.json`（gate.mjs:333-336）。

### 6.2 预期红模式表（gate:update 前的一次 `npm run gate` 实跑必须逐格吻合）

| 场景 | diffPx | invDiff | 波及源 |
| --- | --- | --- | --- |
| s3-library | **>0** | 是 | 节点库分组重组：对话组 -1 条目行；新「智能体」组 +分组头（点色/计数 cnt=1）+1 条目行（app.js:323-337 数据驱动） |
| s8-agent-node | **>0** | 是 | agent 节点标题栏 `--nc` 紫 #a06bff → teal #14b8a6（app.js:762）+ 小地图节点填充（app.js:1110） |
| s9-goal-panel-online | **>0** | 是 | 画布 agent 节点标题栏（几何定稿：节点 519-819×327-607 与面板 1222-1582×304-824 零交叠，§2 勘误 4）；小地图大部被面板覆盖、残余露边同源变色 |
| s0/s1/s2/s4~s7/s10/s11（9 场景） | **=0** | **是** | 公共不变量 cssVars +1 键 `--cat-agent:#14b8a6`（gate.mjs:296 采 `:root` 全部 `--*`；宪法第 2 条「:root CSS 变量表」面） |

**判定硬边界**：实跑形态与上表任一格不符（尤其 9 场景出现 diffPx>0、或
s3/s8/s9 出现 diffPx=0）→ **中止排查、不得 gate:update**——那是非预期波及或
实现缺陷，重录即掩盖。s8/s9 的 nodes 矩形/counts 不变量预期不变（category
只改色不改布局：300×280 矩形、counts 2/1/4/5/1 维持——BUILD 可用 golden
invariants 亲读值预检）。

### 6.3 流程（gate:update 恰一次 + 连续两轮稳定，迭代 0013 先例）

1. 实现完成 → `npm run build` → baseline 再生（§5）→ `npm test` 全绿。
2. `npm run gate` 实跑 → 对照 §6.2 逐格判定；**复制 `tests/golden/diff/` 全部
   产物到 `docs/evolution/iterations/0037/gate-diff-pre-update/`**（该目录在
   gate 全绿时会被 gate.mjs:351-353 自动清空，故必须先拷贝；作为宪法第 3 条
   「前后对比」证据随机制件提交入库，JOURNAL 记录路径）。
3. `npm run gate:update` **恰一次**（无场景参数，一次调用全量重录 12 场景
   png+invariants；授权链见 §6.1）。git diff 预期：3 份 png（s3/s8/s9）实质
   变化 + 12 份 invariants.json（cssVars 插入 `--cat-agent`）+ 9 份 png 零
   变化（git status 不出现）。
4. `npm run gate` 连续两轮 12 场景全 pass diffPx=0（第一轮消化重录自证，第二
   确认确定性）。golden 权威仍在 CI（windows-latest）：推送后盯
   `ui-constitution` required check。
5. **回滚预案**：重录后任一轮意外红且排查无果 → `git checkout -- tests/
   golden/ui/` 恢复基线 + 回滚产品改动（工作树整体丢弃，主干零影响，v3 隔离
   模型天然兜底）；禁止二次 gate:update 掩盖。

## 7. 契约测试联动核验面（逐文件预期，VERIFY 复跑基准）

| 测试 | 预期 | 依据 |
| --- | --- | --- |
| contract.test.mjs | 全绿（:14 白名单已扩；:10 19 键计数不变） | §3 #4 |
| nodes-dirs.test.mjs | 全绿（D===19 不变——零新目录） | 亲读 :5 |
| defs-drift.test.mjs | 全绿（40 默认值零变化——category 非参数） | 亲读 :16 |
| synthesis.test.mjs | 全绿（caps 序/params 序/19 键快照——baseline 已再生） | §5 |
| schema.test.mjs | 全绿（自有 fixture 不涉 agent） | 亲读 :14/:28/:45 |
| readme-consistency / param-handler-guard / handlers-coverage / events-negative | 全绿（README 无 category 行；handler/params/事件面零变化） | §0 亲核 |
| `npm run smoke:server` | 零回退（A 组 A01-A05 handler 断言不读 category；smoke grep .cat 零命中） | §0 亲核 |
| `node tools/gen-node-readmes.mjs` | 输出 agent README「无变化」（模板六节无 category；:117 断言 19 键不触发）——实跑为准，输出异常即停 | §0 亲读 |

## 8. 验收口径（BUILD 自测 = VERIFY 复跑；PRD REQ-0050-01~04 映射）

1. `npm run build` exit 0（build:shared tsc 过 = types.ts 扩枚举自证）。
2. baseline 再生后 `npm test` 全绿（§5 预期 diff 恰 1 行；18 键逐字节不变）。
3. `npm run gate` 按 §6.2 预期红模式吻合 → `npm run gate:update` 恰一次 →
   **连续两轮** `npm run gate` 12 场景全 pass diffPx=0。
4. `npm run smoke:server` 零回退（PRD REQ-0050-04 附加项）。
5. `node tools/gen-node-readmes.mjs` agent README 无变化（实跑输出为准）。
6. **手动 E2E 五点位**（PRD REQ-0050-02 ①~⑤，`npm start` 后浏览器实走）：
   ① 节点库出现「智能体」分组，恰含「通用智能体」一条、计数徽标 cnt=1；
   ② 「对话」分组条目集回到 agent 入列前形态（llm「LLM 对话」+ prompt 两行，
     不含通用智能体）；
   ③ 画布拖入 agent 节点，标题栏类目条色 = `#14b8a6` 实值（DevTools 取
     `--cat-agent` 计算值；非 #666 回退）；
   ④ 节点库搜索「智能体」命中「通用智能体」条目（分组名参与搜索 app.js:326）；
   ⑤ 既有七分组（输入/对话/知识/工具/逻辑/输出/人工）渲染与计数零变化。
7. 机器证明（CLOSE 核对）：`git show --numstat <产品提交>` 恰 §3 十行清单
   （9 路径 + golden 目录）；`git diff -- apps/server events.ts gate.mjs
   Skeleton.tsx nodes.ts` 恒空。

## 9. 模块边界（沿 ADR-0006 / docs/frontend-module-boundaries.md）

- **packages/shared**：唯一事实源——枚举（schema）+ 类型（types）+ 值
  （agent/node.ts）+ 快照（baseline）四处同步，一处不齐即 tsc/test 红（设计
  意图：漂移即拦）。
- **app.js（legacy 命令式模块）**：仅两处纯插入（CATS/catColor），零逻辑改动；
  渲染链既有（DEFS×CATS 通用渲染）。
- **server-sync.js / Skeleton.tsx / apps/server**：零改动（category 不进任何
  数据面）。
- **gate.mjs**：零改动（§1.2）。

## 10. 风险与对策

| 风险 | 对策 |
| --- | --- |
| catColor/CATS/CSS 变量三处漏一处 → agent 色静默回退 #666 | §8 E2E ③ 专项；catColor 缺省回退是既有行为不会报错，只能靠点位与像素把关 |
| gate:update 前未保存 diff 产物即被全绿清空（gate.mjs:351-353） | §6.3-2 强制先拷贝到 iterations/0037/gate-diff-pre-update/ |
| Windows 下 baseline 再生走 PowerShell 重编码 | §5 执行环境注意（Git Bash only） |
| 9 场景 invDiff 被误读为意外波及而中止 | §6.2 表 + §2 勘误 5 已把预期形态写死；VERIFY 判定以本表为准 |
| CI 与本机像素环境差异 | golden 以 CI 为权威（宪法第 2 条）；推送后盯 ui-constitution |
| 姊妹链并行（BK-0038/BK-0040 被他路占用）合并冲突 | 本轮改动文件与其无交集（他们动 JSON 画布/右栏容器）；合并仲裁按 WORKFLOW §4 MERGE 既有规则 |

## 11. 回滚方案

工作树整体丢弃（v3 隔离模型）：`git worktree` 内任何未提交状态直接弃置，
主干零影响；分支已提交则 `git revert`（WORKFLOW §6.6 唯一合法回滚手段）。
golden 一旦误录：`git checkout -- tests/golden/ui/` 即恢复（基线在版本库）。
