# PRD · 迭代 0039 · BK-0049 MCP·skills 清单动态化：app.js 硬编码 MCP_SERVERS/SKILL_LIST 改后端供数（修宪轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-26 01:53（工作树
> `.zcode/worktree/feat/0039-iter`，分支 `feat/0039-iter`）。
> 选题来源：BACKLOG BK-0049（ui-proposal / 触UI=是 / **P0 / S / ready** /
> 来源 `issue#6`，BACKLOG.md:62）。BK-9006 五子项之一（短修宪穿插项）；
> 本轮由 PLAN 轮晋升 ready 并入选（晋升依据与亲核证据见「选题过程存证」）。
> 授权链（书面在案，本轮未另跑 gh，引既有留档）：issue#6 owner
> `liusuren123` 评论「批准」`2026-10-24T08:38:51Z`（iterations/0037/PRD.md:10-11
> 当轮 gh 亲核留档；与 BACKLOG 待批准区 2026-10-24 迭代 0021 批复同步记载
> 一致）+ BK-9006 行「批复承继 issue#6，关单留五子项全部终了由末项 CLOSE
> 回执」（BACKLOG.md:77）+ BK-0049 行自带定界（「app.js:102-121 硬编码区
> ……为宪法冻结面，改动即修宪」）。**修宪通道 ADR 要素尚无专案**（BK-0050
> 先例有 ADR-0013 §2.4 预案在先，本项无）→ 本轮为 SPEC 轮布置 **ADR 草案
> 产出义务**（见 REQ-0049-00），实施轮持 ADR + issue#6 承继进入实现。
> 定界权威：BACKLOG BK-0049 行（受影响文件清单口径与验收命令口径原文）+
> ROADMAP 待办节实施序列第 6 条（ROADMAP.md:198-201「BK-0049 MCP·skills
> 清单动态化（注册表 BK-0029 done，无硬前置）可随时穿插晋升」）。
> 先例：迭代 0037（BK-0050，issue#6 短修宪穿插项直系先例——晋升/授权链/
> itemContinues 口径）、迭代 0032（BK-0034，server-sync 数据面扩展 + SSE/端点
> 消费边界）、迭代 0024（BK-0029，env 注册表 BUILTIN_MCP_IDS 与冒烟口径）、
> 迭代 0011/0031（golden 新场景 golden-created 通道 + 路由 fixture 先例）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9006
> 杂项链；「画布编排 × 深度智能体工作台」差异化主轴，ROADMAP.md:124-130）。
> 批次编排：单项单迭代（S 级但**触UI=是 → 需独立 SPEC，skipSpec=false**——
> WORKFLOW §4 免 SPEC 条件为「非 doc、非触 UI」）。issue#6 名下姊妹子项
> BK-0046（并行工作流在途）/BK-0047（待 BK-0019）/BK-0048（待 BK-0020）
> 未竟 → 本轮 done 仅发**进度回执、不关 issue#6**（BK-9006 行明载关单留
> 五子项全部终了）→ **itemContinues=true**。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-26 01:47~01:53 核实）

- **优先序①（本轮档案 approved/rejected）**：approved 无、rejected 无 → 零
  批复同步动作、零 skipped 改写（issue 面板 #6/#5/#4 均系已批复在案的
  needs-approval 存量，无新批复、无驳回）。
- **优先序②（ready 队列逐项处置）**：本会话 `grep -n "| ready |"` 亲跑，
  工作树 BACKLOG 主池 ready 项恰 1 个：**BK-0040**（BACKLOG.md:53）——
  **禁选**（派发注入并行占用提示）；doc 项 BK-0051（:64，proposed）心跳
  不选。→ 本侧 ready 队列实际枯竭。
- **优先序③（排期晋升，非侦察新建）**：枯竭处置不触「无证据不立项」红线
  ——本项**非新立项**，是既有 proposed 项的既载晋升条件兑现（BK-0049 行：
  「晋升条件=按修宪链排期即晋升（短修宪穿插项）」）。排期条件逐条核对：
  BK-9002 链 done（0032）、BK-9003 链 done（0035）、BK-0050 done（0037）；
  BK-9004 链批次 1（BK-0040）与 BK-0046 被并行工作流占位（派发提示在案）；
  BK-9005 链阻塞于 ADR-0014 附录 A 依赖批复（未开/未批）；BK-0047/0048 有
  硬前置（BK-0019/BK-0020 proposed）。→ **BK-0049 为唯一可选短修宪穿插项**，
  与 ROADMAP.md:198-201 序列指导一致（0037 同款决策路径：穿插项恰补并行
  占用空档）。
- **结论**：晋升 BK-0049 → ready 并选为本轮项（BACKLOG.md:62 状态列已改，
  晋升注记附备注尾）。

## 结论

**建议做（本迭代即做）**——三条理由：

1. **真实价值缺口（用户可感知）**：BK-0029 落地后，外部 MCP server 可经
   `MCP_HTTP_SERVERS`/`MCP_STDIO_SERVERS` 注册并被 LLM/agent 节点调用
   （BK-0030 注入链 done），但前端勾选清单仍是 app.js:105-116 硬编码五条
   「原型模拟数据」（:104 注释自认）——**用户在属性面板看不到、也勾不了
   自己注册的外部服务**，能力注册链在前端断头。动态化后注册表条目直接
   出现在勾选清单（BK-0049 行验收原文）。
2. **单一事实源收口（消除既有漂移面）**：前端 MCP_SERVERS 五条的
   id/工具名是 tools.ts IMPL 与 registry.ts:31 BUILTIN_MCP_IDS 的**手工
   平行副本**，工具描述亦与 TOOL_SPECS（tools.ts:145-158）各写一套
   （前端「读取文件」vs 后端「读取沙箱目录内的文本文件」）——双源漂移
   无守卫；SKILL_LIST 五条（app.js:117-123）在后端**零对应物**（skills
   仅作为提示词字符串消费，llm.ts:34-35 / agent.ts:40-41）。后端供数后
   id/工具名/描述一处定义。
3. **影响面窄、授权齐备**：issue#6 批复承继在案（BK-0050 先例同链已消费
   两次）；改动=后端一个只读端点（自主区）+ 前端数据源替换（渲染模板
   零改动，纯数据换源）+ 一条新 golden 场景；零新依赖、零新 env、零新
   SSE 事件、零 shared DEFS 触及。

**归属 CONSTITUTION 第 3 条变更需求，且已获用户批准 → 走修宪通道**（issue#6
批复承继 + 本迭代 SPEC 轮补 ADR 草案 + golden 新场景增量）。

## 触UI 分类结论

**是（修宪轮）**。宪法第 3 条三要素：

| 要素 | 证据/安排 |
| --- | --- |
| ADR 在案 | **尚无专案 → SPEC 轮产出义务（REQ-0049-00）**：动机（注册链前端断头 + 双源漂移）/影响面（本 PRD 受影响文件清单）/像素对比证据获取方式（新场景 golden-created + 既有 13 场景零波及 gate 实测，路由 fixture 先例 WF_ROUTES/SESSION_ROUTES） |
| 用户批复在案 | issue#6 owner 评论「批准」2026-10-24T08:38:51Z（iterations/0037/PRD.md:10-11 gh 亲核留档；BACKLOG.md:77 批复承继明载） |
| golden 增量 | **新场景 golden-created 通道**（属性面板 caps 勾选清单场景，带清单端点路由 fixture）；既有 13 场景（gate.mjs:251-272）**预期零波及**——无任何既有场景渲染 caps 区（默认工作流 node 3 为 prompt 无 caps，app.js:160-163；s8/s10/s11/s12 seed 节点均无 mcp/skills 配置，capsChips 空串短路 app.js:782）。gate:update 预期零消费；若既有场景意外波及，逐一归因后按修宪授权重录（须留前后 diff 证据，BK-0050 先例 §6.3-2） |

**波及控制（硬约束）**：

- **渲染模板零改动**：capsHtml（app.js:968-1001）、capsChips（:780-787）、
  change 处理器（:1003-1019）的 DOM 结构/类名/文案模板不动；改动仅是
  `MCP_SERVERS`/`SKILL_LIST` 两个常量的**供数链**（常量 → 模块级状态 +
  端点刷新）。
- **离线回退 = 现字面量**：端点不可达/未配置时清单回落到当前五+五字面量
  （等价迁移口径），保证无后端时画布与面板行为与现状逐像素一致——这是
  既有场景零波及的前提，gate 实测确认。
- **SSE 契约零接触**（events.ts 零改动）；**shared DEFS 零触及**（节点
  caps 声明形态不变）；确需新增事件类型或 DEFS 字段即中止转 needs-approval。
- **后端零出站新增**：清单端点只读既有进程内状态（BUILTIN_MCP_IDS ×
  TOOL_SPECS + buildMcpRegistry 注册条目 + skills 常量）；**不做** per-request
  tools/list 发现（出站发现仍是 run 会话期行为，BK-0030 既有链路不动）。

## 现状证据（本会话亲核，2026-10-26）

- 前端硬编码：`apps/web/src/legacy/app.js:104` 注释「能力注册表：MCP 服务器
  / Skill（原型模拟数据）」；:105-116 MCP_SERVERS 五条（filesystem/fetch/
  sqlite/browser/web-search，各带 tools[{n,d}]）；:117-123 SKILL_LIST 五条
  （ppt-builder/doc-writer/data-analyst/coder/translator）。
- 消费点（本会话 grep 亲跑，恰 6 处）：:785（capsChips 徽章
  `MCP ${c.servers}/${MCP_SERVERS.length}`）、:976/:986-987（面板 MCP 服务与
  工具勾选渲染）、:993（面板技能勾选渲染）、:1011-1013（勾选变更处理器
  find+tools 映射）。
- 后端地基：`apps/server/src/mcp/registry.ts:31` BUILTIN_MCP_IDS 五 id 与
  前端逐字一致（含冲突拒绝护栏）；`apps/server/src/tools.ts:145-158`
  TOOL_SPECS 按(serverId,name)键持有真实 desc/schema；`apps/server/src/config.ts:33`
  env 白名单两键在库（MCP_HTTP_SERVERS/MCP_STDIO_SERVERS）。
- **无供数端点**：`apps/server/src/server.ts:198-219` 路由全集
  （health/models/run/stop/approve/workflows/runs/sessions）无任何清单端点。
- gate：13 场景 s0~s12（`tools/pixel-gate/gate.mjs:251-272`），无一渲染
  属性面板 caps 区；路由 fixture 先例 WF_ROUTES/RUN_ROUTES/SESSION_ROUTES
  （gate.mjs:77-93/:203+）。
- smoke 基线：125 passed / 0 failed（迭代 0037 后）；契约 30/30。

## 需求（Given / When / Then）

### REQ-0049-00 · SPEC 轮 ADR 草案（修宪通道要件）

- **Given** 本项触UI=是且无既有专案 ADR（对照 BK-0050 有 ADR-0013 §2.4
  预案）；授权链 = issue#6 批复承继（BACKLOG.md:77）。
- **When** SPEC 阶段产出 ADR 草案（编号按落盘时序）：动机/影响面/像素对比
  证据获取方式（新场景 golden-created + 既有场景零波及 gate 实测口径）/
  端点契约定界（路径、出参形态、错误码）/回退语义/golden 场景与 fixture
  预案/三段权威回写。
- **Then** ADR 头部状态行「草案 · 待实施轮消费」+ 授权链 issue#6 承继
  2026-10-24T08:38:51Z；全文零「已批准」态措辞（BK-0032/0035 先例口径）。

### REQ-0049-01 · 后端清单端点（自主区，可同迭代先行段）

- **Given** BUILTIN_MCP_IDS（registry.ts:31）、TOOL_SPECS（tools.ts:145-158）、
  buildMcpRegistry 注册条目（env 白名单解析）均在库；server.ts v1 路由注册
  先例（:205-219）。
- **When** 新增只读端点（路径命名 SPEC 定稿，建议 `GET /api/v1/capabilities`）：
  出参含 builtin MCP 服务清单（id/name/desc + tools[{n,d}]，派生自
  BUILTIN_MCP_IDS × TOOL_SPECS——id/工具名/描述单一事实源收口）+ 外部注册
  条目（serverId/kind，来自 buildMcpRegistry，无 env 时为空数组）+ skills
  清单（v1 = 后端常量，五条字面量自 app.js:117-123 **逐字迁移**）；v1-only
  注册沿 sessions 先例。
- **Then** ① 端点响应形态与字段有 smoke 断言（含「空 env → builtin-only +
  skills 全量」与「外部条目出现」两态）；② 无 env 时行为 = 现前端字面量
  等价（id/工具名逐字比对断言，杜绝迁移笔误）；③ 零出站、零新依赖、零新
  env（skills 不做 env 注册表——那会触 POLICY 需批准面，out of scope）；
  ④ `npm run build:server` exit 0 + smoke 零回退。

### REQ-0049-02 · 前端供数链动态化 + 离线回退（修宪面）

- **Given** MCP_SERVERS/SKILL_LIST 为模块常量（app.js:105-123，宪法冻结面）；
  server-sync.js 为 /api/v1 数据接入层（ADR-0006 边界：fetch 封装+缓存+回调，
  不操作面板 DOM）；capsHtml/capsChips/变更处理器为消费方。
- **When** MCP_SERVERS/SKILL_LIST 改为模块级状态（初值 = 现字面量回退集）；
  server-sync.js 增清单数据面函数（fetch + 缓存 + 到达回调）；app.js 启动时
  经其拉取刷新（fire-and-forget，失败静默保持回退集），到达后重渲染属性
  面板/节点徽章；渲染模板与处理器逻辑零改动（sv.tools/t.n/t.d/sk.id/sk.name/
  sk.desc 字段名与回退集逐字对齐，下游零适配）。
- **Then** 手动 E2E：① 无后端/端点 404 时面板与节点徽章渲染同现状（回退
  五+五）；② 有后端且 env 注册了外部 server（如 mock）时，勾选清单出现该
  条目、可勾选展开（外部条目工具子清单 v1 形态 SPEC 定——建议无 tools 细目
  时仅服务级勾选）；③ builtin 五条的 id/工具名/描述与后端 TOOL_SPECS 派生
  值一致（双源收口验证）；④ skills 五条与迁移字面量逐字一致；⑤ 既有勾选
  持久化（n.mcp/n.skills）读写不受供数链影响。

### REQ-0049-03 · golden 新场景（golden-created 通道）

- **Given** 13 场景在库，无 caps 渲染帧；路由 fixture 与新场景先例在库
  （s4/s5/s9、SESSION_ROUTES）。
- **When** SPEC 定稿新场景（建议 s13-caps-panel：seed 含 llm 节点 + 选中 +
  清单端点路由 fixture 供数）+ gate.mjs 场景行与 fixture 纯插入。
- **Then** ① 新场景经 **golden-created** 通道落盘（png+invariants 双文件），
  gate:update **不使用**；② 既有 13 场景 diffPx=0 零波及（gate 实测，任一
  红即中止排查——波及即说明回退语义或模板被破坏，不重录掩盖）；③ 新场景
  invariants 含 caps 勾选清单关键计数（SPEC 定具体断言）。

### REQ-0049-04 · 回归面与联动核验

- **Given** smoke 125 / 契约 30 / gate 13 基线（迭代 0037 后）。
- **When** 实施完成。
- **Then** ① `npm run build` exit 0；② `npm run gate` 14 场景全 pass
  diffPx=0（13 既有 + 1 新增）；③ `npm test` 全绿（shared 零触及 → 零漂移
  预期）；④ `npm run smoke:server` 零回退 + 新端点断言组（REQ-0049-01）；
  ⑤ 手动 E2E 五点位（REQ-0049-02 ①~⑤）。

## 受影响文件清单（SPEC 基准）

| 文件 | 改动 | 性质 |
| --- | --- | --- |
| `docs/adr/00NN-mcp-skills-capability-list.md` | 新增 ADR 草案 | 修宪要件（REQ-0049-00） |
| `apps/server/src/` 清单端点模块（新文件，≤200 行）+ `server.ts` v1 路由注册 | 新增只读端点 | 自主区（后端能力演进） |
| `apps/web/src/server-sync.js` | +清单数据面函数（fetch+缓存+回调） | ADR-0006 边界内扩展 |
| `apps/web/src/legacy/app.js` | MCP_SERVERS/SKILL_LIST 常量→模块级状态+回退集（:105-123 区）+ 启动刷新接线（消费点 :785/:976/:993/:1011 零改动） | 修宪面（宪法冻结区供数链换源） |
| `tools/pixel-gate/gate.mjs` | +CAP_ROUTES fixture + 新场景行（纯插入） | golden 增量 |
| `tests/golden/ui/s13-*/` | golden-created 双文件 | 新基线（非重录） |
| `tests/smoke/smoke-server.mjs` | +清单端点断言组 | 测试扩充 |

**预期零改动**：`packages/shared/**`（含 events.ts/nodes.*/baseline）、
`apps/web/src/Skeleton.tsx`、`apps/web/src/app.css`（无新选择器——渲染模板
零改动的前提）、`apps/server/src/mcp/`（registry/inject 零改动）、
`tools/gen-node-readmes.mjs`。SPEC 评审发现清单外必改点按 WORKFLOW §4 BUILD
中止条款处理，不静默扩面。

## 不做范围（out of scope）

- 不做 skills 的 env 注册表/上传管理（新 env 语义 = POLICY 需批准面，v1 仅
  常量迁移）。
- 不做清单端点的外部 server tools/list 实时发现（出站与缓存归 BK-0029/0030
  既有 run 会话链路；端点只读进程内注册状态）。
- 不做 BK-0047（kb 动态化，待 BK-0019）/BK-0048（on-error 参数，待 BK-0020）/
  BK-0046（并行占用中）。
- 不动节点 caps DEFS 声明（mcp/skills 键形态）、不新增 SSE 事件、不新增
  npm 依赖、不动 app.css 与 Skeleton.tsx。

## 验收命令口径

`npm run build` + `npm run gate`（14 场景 diffPx=0：13 既有零波及实测 + 1 新增
golden-created）+ `npm test` + `npm run smoke:server`（零回退 + 新端点断言组）
+ 手动 E2E 五点位（REQ-0049-02，含 mock 外部注册条目出现的正路径与端点不可达
回退路径）。证据留档口径沿迭代 0035/0037（MERGE 后主干复测 + evidence/）。
