# SPEC · 迭代 0027 · BK-0032 agent 节点与 goal 会话面板 ADR 草案 SPEC 先行（纯文档轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 11:33
> 输入：`docs/evolution/iterations/0027/PRD.md`（PLAN 产物）+ 本会话只读核实。
> 冲突顺位：CONSTITUTION.md > 代码实现 > 本 PRD > 本文档。本文引用的 `path:line`
> 均本会话亲读（锚点清单见 §2.2）。
> **本迭代零代码 / 零依赖 / 零契约 / 零 UI / 零 golden**：BUILD 阶段仅按本 SPEC
> 蓝图落 ADR-0013 草案 + BACKLOG 三行定界回写。
> 先例：BK-0027（迭代 0017，`iterations/0017/SPEC.md`——SPEC 先行纯文档轮同款
> 分工与 VERBATIM 验收标准）。

## 0 · 定位与硬前置判定

- **纯文档轮**：产品提交 = `docs/adr/0013-agent-node-goal-session-panel.md`
  纯新增（命名本 SPEC §3 定）+ BACKLOG 三行备注定界回写（归档提交面）；其余
  一切路径零字节改动（AC5 白名单机器核对，含 package-lock.json 零变化 = 零依赖
  引入证明）。非修宪轮，**全程禁 `npm run gate:update` / golden 任何接触**
  （POLICY 禁止区）。
- **POLICY 校验**：文档与实现同步（ADR 记述）+ 侦察与立项（BACKLOG 维护）均属
  自主区（POLICY.md:15/17）。ADR 草案内容虽描述未来 UI 修宪方案（agent 节点
  DEFS+类目色、goal 面板），但 ADR 本身是文档（CONSTITUTION 第 4 条「不适用」
  面）；实施授权链 = issue#2 批复承继（2026-10-23T15:49:39Z，BK-9002 行备注
  BACKLOG.md:73）+ ADR-0013，归 BK-0033/0034 修宪轮消费，本 PRD/本 SPEC 不预支
  任何 UI 改动。
- **ADR 判定：needsAdr=false**（PRD「SPEC 阶段衔接说明」既定口径，PRD.md:247）：
  本项产品即 ADR 草案本身，不再叠 ADR——ADR-0013 由 BUILD 阶段按本 SPEC
  §3~§8 蓝图落盘（本阶段不新建 `docs/adr/` 文件）。与 BK-0027 先例（0017
  SPEC 阶段直接落盘 ADR-0012）的分工差异以本 PRD 显式口径为准：本 SPEC 承载
  全部设计定稿内容（DEFS 草图 / 消费映射 / 评估结论 / 定界字面量），BUILD
  转写为 ADR 正文，无自主设计决策空间。
- **skipSpec=false**（M 项，PRD.md:239），本 SPEC 即其载体。

## 1 · 受影响文件清单（本迭代全部改动面）

| 文件 | 改动 | 预算（行） |
| --- | --- | --- |
| `docs/adr/0013-agent-node-goal-session-panel.md` | **新增**（BUILD 按本 SPEC §3~§8 转写落盘） | ~280（区间 280±60；上限 400，AGENTS.md 硬性约定 4；对齐 ADR-0012 体量 283 行） |
| `docs/evolution/BACKLOG.md` | BK-0033 / BK-0034 两行**备注列替换** + BK-0015 行**备注列替换**（均按本 SPEC §8 模板字面量）；表结构不变（零新行、状态列不动——BK-0033/0034 维持 proposed、BK-0015 维持 proposed）；BK-0032 状态流转归 CLOSE | 3 行原地替换（增量 ≤30 行口径） |
| 其余一切路径（`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、根/子包 `package.json` 与 `package-lock.json`、`CONSTITUTION.md`、`AGENTS.md`、`README.md`、`docs/evolution/ROADMAP.md`、`docs/evolution/metrics.md`、golden 基线 `tests/golden/**`） | **零改动**（AC5 机器核对） | — |

机制件（随归档提交，不属产品白名单，与 0011~0026 同机制）：`docs/evolution/STATE.md`、
`docs/evolution/metrics.md`、`iterations/0027/` 四件。

## 2 · 模块边界

### 2.1 角色分工

```
spec-designer（本阶段）    产出本 SPEC（设计蓝图全量定稿）；不碰任何代码与
                           CONSTITUTION 正文；不新建 docs/adr/ 文件（needsAdr=false）
code-developer（BUILD）    按本 SPEC §3~§8 逐节转写 ADR-0013（无自主设计决策空间——
                           若发现蓝图与代码现状矛盾：中止并上报，不得自行改写技术
                           结论）+ 执行 §8 BACKLOG 三行回写（模板字面量逐字粘贴）+ 提交
test-manager（VERIFY）     按 §9 AC1~AC7 逐条执行；AC4 VERBATIM 三行比对；AC7 指针
                           抽样 ≥5 条
协调者（CLOSE）            BK-0032 置 done；issue#2 仅发进度回执不关单（关单留
                           BK-0034 链终轮，PRD 批次编排在案）
```

### 2.2 ADR 与代码冲突顺位 + 本会话亲核锚点清单（BUILD/VERIFY 复核起点）

以代码实现为准（spec-designer 职责约定）。本 SPEC 撰写时全部指针亲读：

- `apps/server/src/sessions.ts` 全文 176 行（wc -l 亲核）：五 handler + 步①-⑬
  全序 + abortActiveSessions 停机出口；头注 :8-9 明载「复用现有 15 种 SSE 事件
  承载（run:accepted / node:start / node:delta / node:done / log / run:error /
  run:done），零新增契约」。
- `apps/server/src/server.ts:215-219`：会话五路由恰五行（POST/GET `/api/v1/sessions`、
  GET `/api/v1/sessions/:id`、POST `/api/v1/sessions/:id/chat`、POST
  `/api/v1/sessions/:id/stop`）；:214 注释「仅注册 v1（沿 ADR-0005：新端点无旧别名）」。
- `packages/shared/src/events.ts:8-37`：RunEventSchema 15 个 z.literal（run:accepted/
  start/progress/error/done、node:start/bypass/delta/done/error、cond、log、output、
  approval:required/done——:26/:27/:28 计 15 种）。
- `apps/server/src/llm.ts:70`：`for(let round=1; round<=3; round++){` 定长工具循环
  （126 行文件 wc -l 亲核）；:44 注释「最多 3 轮；失败自动降级为无工具调用」。
- `tools/pixel-gate/gate.mjs:176-187`：SCENARIOS 恰 8 项 s0~s7（:177-186 八行）；
  :181-184 WF_ROUTES/RUN_ROUTES 在线路由 fixture 先例。
- `packages/shared/src/nodes/` 16 目录（ls 亲核）+ `nodes.ts` 142 行聚合层（三导出
  不变 :113-142）+ `nodes.schema.ts` 174 行（端口五种/ widget 五种 / 分类七种枚举
  冻结 :13-15；superRefine 六规则 :111-166）。
- `apps/web/src/legacy/app.js` 2426 行（wc -l 亲核）：:46-54 CATS 七类目、:77
  sparkles 图标已在 ICON_PATHS、:102-121 MCP_SERVERS/SKILL_LIST 硬编码区、:133
  `const DEFS = NODES`（@agentflow/shared 单一事实源）、:192 defOf、:322-336 节点库
  DEFS×CATS 通用渲染、:1264 节点体 def 取用、:2237-2242 run SSE fetch+getReader
  消费先例。
- `apps/web/src/app.css:19-20`：`--cat-chat:#a06bff` 等七类目色 CSS 变量。
- `apps/web/src/server-sync.js` 131 行（wc -l 亲核）：/api/v1 数据与状态层、
  不操作面板 DOM、按需刷新回调（:45-48 wfArrive/runsArrive 先例）；
  `docs/frontend-module-boundaries.md:101-119` 边界规则。
- `apps/server/src/handlers.ts:17` BASIC_HANDLERS + `engine.ts:26-27` HANDLERS
  聚合注册（`...BASIC_HANDLERS` 展开）。
- `docs/node-definition-protocol.md:529-576`：NDP §9 T4「前瞻草案（agent，goal
  模式）」——协议承载力示例，本 SPEC §4 的基线；:531 明载「未获批准前不落地」。
- `docs/evolution/BACKLOG.md`：BK-0032（:45）/BK-0033（:46）/BK-0034（:47）/
  BK-0015（:92）/BK-0050（:63）行；`docs/evolution/ROADMAP.md:184-190` 实施序列、
  :126-128 差异化定位、:149-150 BK-0015 联合评估建议。
- `docs/adr/` 现行 0001~0012（ls 亲核）——ADR-0013 编号顺延成立；ADR-0012
  （283 行）为「草案 · 待用户批准」双位标注与章节体例样板。
- `apps/server/src/store.ts:48-56`：SessionRow（id/title/model/sys/created_at/
  updated_at）与 MessageRow（seq/role/text/created_at）对外形状。

## 3 · ADR-0013 章节骨架与行数预算分配（PRD 衔接说明 ①载体）

文件名：`docs/adr/0013-agent-node-goal-session-panel.md`（kebab-case，沿
ADR-0012 命名式；语义 = agent 节点 + goal 模式会话面板修宪方案，PRD 受影响
文件清单列明「命名 SPEC 定」）。头部状态块沿 ADR-0012 样板，状态行字面：

```
- 状态：**草案 · 待实施轮消费（BK-0033 agent 节点修宪轮 / BK-0034 goal 会话
  面板修宪轮——链终轮）；授权链 = issue#2 用户批复承继（2026-10-23T15:49:39Z，
  见 BACKLOG BK-9002 行）**
```

不写「已批准」字样（PRD 非功能要求 3：issue#2 批复承继的是修宪实施授权，ADR
自身在实施轮 CLOSE 时按 0010/0012 先例更新状态行）。显著声明块（沿 ADR-0012
体例）：本 ADR 为修宪方案草案，不实施任何代码、不改变任何运行时行为；全部
DEFS/前端/ golden 改动仅以文字方案存在，实施归 BK-0033/0034 修宪轮。

| ADR 章节 | 承载的 PRD 六要素 | 内容来源（本 SPEC） | 行数预算 |
| --- | --- | --- | --- |
| 头部状态块 + 显著声明 | 草案标注 + 授权链引用 | 本节上文 | 16 |
| §1 动机与现状证据 | ① | §3.1（下文） | 24 |
| §2 agent 节点 DEFS 方案（含类目色两段口径） | ④ | §4 | 48 |
| §3 handler 边界（会话/预算承载） | ④ | §4.4 | 28 |
| §4 goal 面板方案与入口选型 | ②（影响面前半） | §5.1 | 40 |
| §5 消费映射（两栏制式两表）+ 护栏 | ⑤ | §5.2~§5.4 | 38 |
| §6 像素对比证据方案（golden s8+ 预案，双通道） | ③ | §6 | 26 |
| §7 BK-0015 联合评估专节 | ②（BK-0015 段） | §7 | 30 |
| §8 BK-0033/0034 定界（影响面索引） | ⑥ | §8.1（字面量） | 22 |
| §9 影响面与不做范围 | ② 收口 | §3.2（下文） | 14 |
| **合计** | | | **~286 ≤400** ✓ |

- **§3.1 动机要素（ADR §1 内容）**：差异化定位——「画布编排 × 深度智能体工作台」
  空白带（ROADMAP.md:126-128 竞品对照结论：DAG 编排赛道与 agent 工作台赛道之间
  无占位者）+ issue#2 用户链上下文（通用智能体节点 + goal 模式会话面板）+ 地基
  证据三条（BK-0016 sessions 五端点 done / BK-0021 NDP 目录制 done / 15 种 SSE
  事件契约稳定——本 SPEC §2.2 锚点）。
- **§3.2 不做范围要素（ADR §9 内容）**：本轮（BK-0032）零代码零依赖零 shared
  契约零 env 零出站零 UI 零 golden；BK-0033/0034 才是修宪实施轮；BK-0050 节点库
  独立「智能体」类目、BK-0035~0039（SPEC 四连先行后三位）、BK-0019/0020 后端
  语义项均不在本 ADR 射程（引用各自 BACKLOG 行）。

## 4 · agent 节点 DEFS 草图最小完备集（PRD 衔接说明 ②载体；ADR §2/§3 蓝图）

### 4.1 基线与定稿草案

基线 = NDP §9 T4 前瞻草案（`docs/node-definition-protocol.md:535-575`，协议
承载力示例）。定稿草案（BK-0033 实施轮落 `packages/shared/src/nodes/agent/node.ts`，
`satisfies NodeDefJson`）：

```ts
export default {
  protocol: 1,
  type: 'agent',
  identity: { name: '通用智能体', category: 'chat', icon: 'sparkles',
    keywords: 'agent 智能体 goal 会话 自主 loop 预算',
    description: 'goal 模式智能体：自主工具循环 + 持久会话，可点开进入流式会话面板。' },
  ports: {
    inputs: [
      { id: 'in-goal', label: '目标', type: 'text' },
      { id: 'in-ctx',  label: '上下文', type: 'any' },
    ],
    outputs: [
      { id: 'out-result',  label: '结果', type: 'text' },
      { id: 'out-session', label: '会话引用', type: 'object' },
    ],
  },
  params: [
    { id: 'model', label: '模型', widget: 'combo',
      options: [
        { value: 'GLM-4.7', label: 'GLM-4.7' },
        { value: 'GLM-4.7-Air', label: 'GLM-4.7-Air' },
        { value: 'GLM-4.6-Flash', label: 'GLM-4.6-Flash' },
        { value: 'DeepSeek-V4', label: 'DeepSeek-V4' },
        { value: 'GPT-5', label: 'GPT-5' },
        { value: 'Claude Sonnet 4.5', label: 'Claude Sonnet 4.5' },
      ], default: 'GLM-4.7', runtimeOverridable: true },
    { id: 'sys', label: '系统提示词', widget: 'textarea',
      default: '你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。' },
    { id: 'maxSteps', label: '最大步数', widget: 'number',
      default: 32, min: 1, max: 256, step: 1 },
  ],
  binding: {
    handler: 'agent',
    capabilities: {
      llm: true,
      mcp: { toolSelection: 'user' },
      skills: true,
      agent: { sessionMode: 'goal' },
    },
  },
} satisfies NodeDefJson;
```

### 4.2 与 T4 基线的差异裁决表（ADR §2 必载，逐条给理由）

| # | T4 基线 | 定稿草案 | 理由 |
| --- | --- | --- | --- |
| 1 | model options 仅 2 项（GLM-4.7/DeepSeek-V4） | 对齐 llm 节点 6 项（`nodes/llm/node.ts:22-28`）+ `runtimeOverridable: true` | 模型接入面是 providers 既有事实（/api/health 运行期覆写同 llm 先例）；双源不一致即漂移 |
| 2 | capabilities 含 `exec:{mode:'sandboxed'}` + `net:{mode:'guarded'}` | 收敛为 `llm/mcp/skills/agent` 四键 | NDP §7.3「协议不虚构行为」+ llm 节点先例（同样经 MCP 工具间接 exec/net，仅声明四键 `nodes/llm/node.ts:39`）——工具级 exec/net 护栏由工具层承载（tools/guard），节点不重复声明 |
| 3 | binding 含 `requiresApproval: 'on-sensitive-tool'` | 不进首发定义 | 该字段预留·未启用（nodes.schema.ts:107 注释）；写了未实现的门控即「说了但没做」；BK-9005（PTY）/BK-0017 消费时再启用 |
| 4 | identity 含 `status: 'proposed'` | 省略（active 为缺省语义） | status 预留·未启用且聚合层忽略；BK-0033 落地即显式入列（nodes.ts import + NODES 键），标 proposed 名实不符 |
| 5 | keywords 5 词 | +`loop 预算` 两词 | 节点库搜索命中面（app.js:325 kw 参与搜索）；maxSteps 是差异化参数 |

### 4.3 schema 纪律合规自检表（ADR §2 附；IMPLEMENT 轮 nodes.baseline.json 重产的依据）

- 端口 id `^[a-z][a-z0-9-]{2,31}$` + in-/out- 前缀 + 节点内唯一（nodes.schema.ts:18-26/:152-165）：in-goal/in-ctx/out-result/out-session ✓；类型 text/any/object 均在五枚举内 ✓。
- 参数 widget×default 契约矩阵（:50-58）：combo default 'GLM-4.7' 在 options 值域 ✓；textarea default string ✓；number default 32 ∈ [1,256] step 1>0 ✓。
- params id 节点内唯一（model/sys/maxSteps）✓；无 visibleIf（T4 同）✓。
- capabilities strictObject 键集 ⊆ 十 kind（llm/mcp/skills/agent 均在 :72-83）✓；
  `agent` 扩展 kind + `sessionMode` 占位为 NDP §7.3 预留位本尊（:392），启用伴随
  新节点即走修宪通道——BK-0033 即该通道（issue#2 承继），协议零改动。
- caps 合成（nodes.ts:97-99）：mcp+skills → caps=['mcp','skill']，前端节点库
  mini-tag 通用渲染（app.js:334）✓；`agent` kind 不进 caps（合成层只映射 mcp/skill
  两键），前端 caps 渲染面零新增。

### 4.4 handler 边界（ADR §3 内容；会话/预算承载）

- **落点**：新增 `apps/server/src/agent.ts`（agent handler，预算 ≤200 行/文件，
  AGENTS.md 硬性约定 4）+ `engine.ts:26-27` HANDLERS 注册一行；不并入 handlers.ts
  （298 行近半满，独立模块沿 llm.ts 拆分先例）。
- **预算循环**：`maxSteps` 参数（DEFS 本尊）驱动 `for(let step=1; step<=maxSteps;
  step++)` 工具循环——形态对齐 llm.ts:70 现行 round≤3 循环（generateText +
  res.response.messages 续接，llm.ts:71-81 先例），预算语义 = 步数上限；token
  逐轮累加仅作报告（node:done.tokens / ✓ 摘要，llm.ts:113 同型），v1 不设 token
  硬顶（如实标注，不虚构预算）。
- **工具会话**：复用 `buildToolSession(n.mcp, ctx.ac.signal)`（mcp/inject.ts，
  BK-0030 产物）三分支语义原样（内置/外部动态/stub 降级）；中止信号透传 run 级
  ctx.ac（llm.ts:39 同型）。
- **会话承载**：每 agent 节点首次执行绑定一个持久会话（store.ts createSession /
  appendMessage 复用，BK-0016 产物；title=节点标题，model/sys=节点参数），
  `out-session` 端口输出 `{ sessionId }` 对象（goal 面板恢复入口的数据锚）；
  节点执行回合的 user 消息 = in-goal 端口值（上下文 in-ctx 拼入，llm.ts:21-32
  同型），turn 内流式增量沿 node:delta（引擎既有通道）。**不新增 SSE 事件、
  不新增 API 端点**（护栏见 §5.4）。
- **与 llm.ts 关系**：llm 节点 round≤3 循环**维持现状不动**（BK-0015 联合评估
  结论 §7）；可选的后端重构（把 llm.ts 工具循环抽为共享 helper 供 agent.ts 复用）
  属自主区纯重构，BK-0033 实施轮量力而行、不作为验收项。

## 5 · goal 面板消费映射（PRD 衔接说明 ③载体；ADR §4/§5 蓝图）

### 5.1 入口选型（ADR §4 内容——三案对比 + 推荐 + 像素波及矩阵）

| 入口案 | 形态 | 既有 golden 波及 | 评估 |
| --- | --- | --- | --- |
| A · 左侧 rail 新按钮 + 侧栏新页签（data-stab，Skeleton.tsx:23-55 现有 rail 区） | 常驻入口，历史/节点库/工作流同款 | **全部 8 场景** rail 区像素变化 → 修宪轮全量重录 | 入口最显式；但波及面最大、且「goal 会话」叙事上从属 agent 节点而非全局 |
| **B · agent 节点点开浮动面板（推荐）** | 浮动会话面板（会话流/输入区/停止控件），先例：浮动运行卡 + 审批弹窗 `.modal-mask`（app.js:469 同款动态创建） | **零波及**（面板默认不可见；仅新增场景） | 像素波及最小；「画布编排 × 工作台」叙事闭环（节点即工作台入口）；NDP T4 描述「可点开进入流式会话面板」（:541）同向 |
| C · 顶栏标签页 | 顶栏区改造 | 全部 8 场景顶栏区变化 | 顶栏标签页是工作流页签（宪法冻结语义最强），否决 |

推荐 B：BK-0034 实施面 = 纯新增（面板容器动态创建 + 新 CSS 选择器纯插入），
既有 s0~s8 全部零波及（VERIFY gate 实测确认）；A/C 案的全量重录代价作为 B 案
论据写入 ADR。面板组成四件：会话流（user/assistant 气泡 + 系统行）、输入区
（textarea + 发送）、停止控件（活动 turn 时可用）、恢复列表（历史会话选择，
面板头部子视图）。

### 5.2 端点 → 面板行为（两栏制式第一表；ADR §5 载体，逐条对照 server.ts:215-219）

| 端点（server.ts 锚点） | 面板行为 |
| --- | --- |
| `POST /api/v1/sessions`（:215；sessions.ts:39-42） | 新建会话：agent 节点首次打开面板且无绑定会话时创建（title=节点标题 / model=节点 model 参数 / sys=节点 sys 参数）→ 201 SessionRow（store.ts:48-55 六字段） |
| `GET /api/v1/sessions?limit=`（:216；sessions.ts:44-48） | 恢复列表：面板「历史会话」子视图拉取（updated_at 倒序；limit 1-100 校验 400 语义——面板固定 20，不触发） |
| `GET /api/v1/sessions/:id`（:217；sessions.ts:50-54） | 恢复：回读 `{session, messages}`（messages seq 升序）全量回放会话流气泡；404 → 面板空态提示 |
| `POST /api/v1/sessions/:id/chat`（:218；sessions.ts:69-164） | 续聊：body.text 非空字符串（400 语义）；SSE 流式 turn 步①-⑬，事件映射见 §5.3；409（turn 活动中）→ 面板按「回复进行中」提示（正常流面板输入区禁用不触发，兜底语义） |
| `POST /api/v1/sessions/:id/stop`（:219；sessions.ts:58-63） | 停止：中止活动 turn；404（无活动 turn）→ 面板按「当前无进行中回复」提示（不区分会话不存在与无活动，sessions.ts:56-57 注释语义） |

### 5.3 事件 → 呈现语义（两栏制式第二表；ADR §5 载体）

**前提事实**：sessionChatHandler 实发 7 种（sessions.ts:8-9 头注 + 步⑤-⑬ 代码：
run:accepted :91、node:start :114、node:delta :126/:130、node:done :144、log
:106/:146、run:error :107/:155、run:done :95）。面板消费恰这 7 种；其余 8 种
（run:start / run:progress / node:bypass / node:error / cond / output /
approval:required / approval:done，events.ts:10-27）**turn 流不发射、面板不
消费**——ADR 表内如实列明「不消费 + 理由（turn 流语义不涉）」，与 BK-0016
先例同口径。

| 事件（载荷锚点） | 面板呈现语义 |
| --- | --- |
| `run:accepted`（runId=turnId，sessions.ts:91） | turn 边界开启：状态置「生成中」、输入区禁用（不渲染日志行——面板非日志域） |
| `node:start`（id 恒 0 / title=会话标题，:114） | assistant 气泡占位（会话合成节点，SESSION_NODE_ID=0 信封内恒 0） |
| `node:delta`（id 0 / text=**累积全文**，:126/:130） | assistant 气泡打字机增量（全文覆盖式渲染；服务端已 60ms 节流，DELTA_EMIT_MS :31） |
| `node:done`（out=全文 / tokens? / ms，:144） | assistant 气泡定稿 + tokens/耗时脚注；输入区恢复 |
| `log`（lvl sys/ok/warn，:106/:146） | 面板内系统行（实发清单：⚠ 模型未配置 / 🔧 无 / ✓ 会话回复——仅 :106/:146 两处字面） |
| `run:error`（message，:107/:155） | 错误行 + 输入区恢复（assistant 不落库，服务端语义如实呈现） |
| `run:done`（ok/stopped/done/total/ms/outputs，:95-97） | turn 终态：ok=true 正常收尾；**stopped=true → 「已停止」标记且服务端不发 node:done（:134-137 停止路径），面板须以最后一次 node:delta 的累积全文固化气泡（部分文本已落库）**；ok=false 非 stopped → 错误收尾 |

### 5.4 护栏声明（ADR §5 尾部字面量，BK-0016 先例口径）

> **SSE 事件护栏**：goal 面板对会话 turn 流的消费在既有 15 种 SSE 事件内取用
> （本面板恰消费其中 7 种，与 sessionChatHandler 实发集合一致）；实施中确需
> 新增事件类型即触 POLICY 需批准区（packages/shared 契约变更），**立即中止转
> needs-approval issue，不得自主新增**（沿 BK-0016 行内护栏先例，BACKLOG.md:93）。

### 5.5 模块边界承载（ADR §4 尾部；BK-0034 影响面的文件级依据）

- **数据层**：`apps/web/src/server-sync.js` +sessions 数据面（fetchSessionList /
  fetchSessionDetail / createSession / stopSession 四函数 + `SVR.sessions` 缓存 +
  `onSessionsArrive` 回调，沿 :23-48 既有形态与 ADR-0006 边界：仅 /api/v1、
  不操作面板 DOM、AbortSignal.timeout(8000) 同款）——预计 +60~80 行。
- **流式与渲染**：SSE 流式消费（POST chat fetch + getReader 解析）在
  `app.js`（沿 run SSE 先例 :2237-2242——流式端点非持久化列表面，同为 app.js
  作用域，边界文档 :134 注记）+ 面板 DOM 动态创建/渲染。

## 6 · golden s8+ 场景清单预案（PRD 衔接说明 ④载体；ADR §6 蓝图）

**表述边界（PRD ④ 明确）**：ADR 只列场景名、触发条件、fixture 依赖与受波及
清单，**不写 gate.mjs 代码**（实施轮 SPEC 定）。双通道口径（0011/0013 先例）：
新增场景走 **golden-created 通道**（gate.mjs:247-253 本会话亲核——基线 png
不存在即落盘并记 `golden-created` 状态；PRD 所引 :192-196 为路由拦截段，
实际通道机制在 :247-253，ADR 采用本核实值）；受波及既有场景经修宪轮
**gate:update 重录**（迭代 0013 先例）。

| 轮次 | 场景 | 触发条件 | fixture 依赖 | 通道 |
| --- | --- | --- | --- | --- |
| BK-0033 | `s8-agent-node`（新场景） | 画布加载含 agent 节点的工作流（localStorage 预置或等效注入，实施轮 SPEC 定），agent 节点静态渲染态（chat 类目色标题栏 + sparkles 图标 + model/sys/maxSteps widget 行） | 无新增路由（静态画布） | golden-created |
| BK-0033 | `s3-library`（受波及重录） | 节点库 chat 分组自动新增「通用智能体」条目行（DEFS×CATS 通用渲染 app.js:322-336，非代码改动而是数据驱动像素变化） | 既有 | gate:update（修宪轮） |
| BK-0033 | s0/s1/s2/s4~s7 | 理论零波及（无 rail/面板/默认工作流变化；sparkles 图标与 chat 类目色均既有常量）——**gate 全场景实测确认**，任一意外红即中止排查 | 既有 | 预期零波及 |
| BK-0034 | `s9-goal-panel-online`（新场景） | agent 节点点开浮动会话面板在线态（含历史消息气泡 + 输入区 + 停止控件渲染） | **SESSION_ROUTES** 五端点 mock（沿 WF_ROUTES/RUN_ROUTES 先例 gate.mjs:181-184；SSE turn 流 mock 按需） | golden-created |
| BK-0034 | s0~s8 | 入口案 B（浮动面板）下零波及（面板默认不可见）——gate 实测确认；若实施期改采 A/C 案则按 §5.1 矩阵全量重录（ADR 已记录该权衡） | 既有 | 预期零波及 |
| （未来）BK-0050 | 节点库面板场景 | 独立「智能体」类目入 CATS（app.js:46-54）+ `--cat-agent` CSS 变量（app.css:19-20 区）| 既有 | 修宪轮重录（issue#6 承继，不在本 ADR 射程） |

## 7 · BK-0015 联合评估论证模板与结论（PRD 衔接说明 ⑤载体；ADR §7 蓝图）

**论证模板四段**（现状锚点 → 三选一逐一利弊 → 最小需批准面结论 → 请批清单/零
请批面声明）——结论本 SPEC 定稿，BUILD 原样转写：

1. **现状锚点**：`apps/server/src/llm.ts:70` `for(let round=1; round<=3;
   round++)` 定长工具循环（本会话亲核；BK-0015 行内锚点 llm.ts:66-77 成立）；
   prepareStep/stopWhen 零新依赖（BK-0015 行内既有认定，本轮不复核 SDK 面——
   实施轮 SPEC 复核义务沿 ADR-0012「实施轮必须复核时效」先例）。
2. **三选一利弊**（BK-0015 行内既列三案）：

   | 方案 | 利 | 弊 | 需批准面 |
   | --- | --- | --- | --- |
   | a · 新 env（如 AGENT_MAX_ROUNDS） | 零 UI | 全局单值、无工作流粒度；语义弱 | 新增环境变量语义（POLICY 需批准区）——issue#2 批复不覆盖 |
   | b · 新节点参数（DEFS） | 工作流/节点粒度预算，叙事最正 | 对 **llm 节点** = DEFS 变更+触 UI，且 issue#2 批复面是「通用智能体节点+goal 面板」（BK-9002 行），**不覆盖 llm 节点参数扩展**——须另开 needs-approval（沿 BK-0043「父项批复不自动覆盖依赖面」口径）；对 **agent 节点** = 新节点自带 maxSteps 参数，已被 BK-0033 修宪授权（issue#2 承继）覆盖 | agent 路径零额外请批；llm 路径须另开 |
   | c · 引擎常量 | 零请批 | 无预算语义（不可调），等于现状——不满足 T5-M1 验收点「LLM 节点具备停止条件与预算控制」（ROADMAP.md:138） | 无（但目标未达成） |

3. **最小需批准面结论**：**agent 节点路径零额外请批面**——预算承载 =
   agent 节点 `maxSteps` DEFS 参数（本 SPEC §4.1），随 BK-0033 修宪轮落地，
   授权链 = issue#2 批复承继（2026-10-23T15:49:39Z）+ ADR-0013；**llm 节点
   round≤3 维持现状不动**（BK-0033 不同时触碰 llm 节点参数面）。BK-0015 的
   「停止条件与预算控制」验收由 agent 节点承载达成（agent 节点即 LLM 调用
   节点的预算化 loop 形态）；ROADMAP T5-M1 验收点措辞的此重解读在 ADR 显式
   记录，状态行回写留治理日 PM。若未来确需 llm 节点级预算，届时按 b 案另开
   needs-approval（issue#2 不自动覆盖）。
4. **请批清单**：**无（零请批面）**——本结论不产生任何新 needs-approval
   义务；BK-0033/0034 修宪授权链闭合于 issue#2 承继。ADR 附条件条款：若
   BK-0033 实施期决定扩展 llm 节点参数（超出本结论范围），须立即中止转
   needs-approval，不得沿用 issue#2 承继。

## 8 · BK-0033/0034 定界与 BACKLOG 回写字面模板（PRD 衔接说明 ⑥载体）

### 8.1 定界节字面量（ADR-0013 §8 载体，BUILD 逐字转写；权威字面量单一载体=本节）

**BK-0033（agent 节点修宪轮）四要素**：

> 受影响文件 = `packages/shared/src/nodes/agent/{node.ts,README.md}` 新增
> （NDP 目录制 BK-0021 终态形态；node.ts ~45 行按 SPEC 草图 §4.1，README 由
> tools/gen-node-readmes.mjs 生成）+ `packages/shared/src/nodes.ts` 聚合层
> +1 import +1 NODES 键（142→~145 行）+ `packages/shared/test/nodes.baseline.json`
> 重产（16→17 键，经批准通道=issue#2 承继）+ 守卫/契约测试联动（nodes-dirs
> D===16→17、defs-drift 默认值断言 +1、readme-consistency/handlers-coverage
> 自动覆盖）+ `apps/server/src/agent.ts` 新增（agent handler ≤200 行：
> maxSteps 预算循环 + 会话绑定 + buildToolSession 复用）+ `engine.ts:26-27`
> HANDLERS +1 注册 + 前端三文件预期零改动（DEFS 通用渲染链 app.js:133/:192/
> :322-336/:1264；sparkles 图标 :77 与 chat 类目 :46-54 均既有常量——gate 实测
> 确认，若需改动纯插入优先）+ `tools/pixel-gate/gate.mjs` +s8 场景行 +
> `tests/golden/ui/` s8 新基线（golden-created 通道）与 s3 重录基线（修宪轮
> gate:update，迭代 0013 先例）。验收口径 = npm run build + npm run gate
> （重录/增量后全绿）+ npm test（shared 契约 + 守卫/快照 17 目录）+
> npm run smoke:server（agent handler 断言组新增 + 既有 95 断言零回退）+
> 手动 E2E 四点位（节点库出现 / 拖入画布 / 连线 / 运行）。依赖关系 = 前置
> BK-0032（本 ADR）。需批准面 = 修宪轮整体（shared DEFS 新增 + golden 重录）
> 授权链 issue#2 批复承继 + ADR-0013；转 ready 条件 = BK-0032 CLOSE 后由
> PLAN 轮晋升（BACKLOG 行内既定）。

**BK-0034（goal 会话面板修宪轮——BK-9002 链终轮）四要素**：

> 受影响文件 = 前端为主：`apps/web/src/legacy/app.js` 浮动会话面板（容器/会话流/
> 输入区/停止控件/恢复列表 + agent 节点开面板交互 + SSE 流式消费沿 :2237 先例；
> 纯插入优先）+ `apps/web/src/app.css` 面板样式新增选择器（纯插入，~+40~80 行）+
> `apps/web/src/server-sync.js` +sessions 数据面（§5.5 四函数 + 缓存 + 回调，
> ~+60~80 行；ADR-0006 模块边界）+ `apps/web/src/Skeleton.tsx` 预期零改动
> （浮动面板动态创建，浮动运行卡/审批弹窗先例；若需静态挂载点则纯插入并重录
> s0，ADR 定）+ `tools/pixel-gate/gate.mjs` +SESSION_ROUTES fixture 与 s9 场景行 +
> `tests/golden/ui/` s9 新基线（golden-created 通道）；后端承载 = sessions.ts
> 既有五端点为准（BK-0016 done 零改动预期，若 SPEC 需补端点列入清单另行定界）。
> 验收口径 = npm run build + npm run gate（s9 增量后全绿、既有场景零波及实测）+
> npm test + npm run smoke:server G 组零回退 + 手动 E2E 五点位（新建会话 →
> 流式输出 → 停止 → 恢复 → 续聊）。依赖关系 = 前置 BK-0032（本 ADR）；推荐序
> BK-0033 → BK-0034（入口 = agent 节点点开，节点先入列；「面板不依赖节点入列
> 亦可独立验收」自由度保留为回退路径——0033 滑期时 0034 可临时以 API 直连驱动
> 面板独立验收，正式入口仍待 0033）。需批准面 = 修宪轮整体（前端三层新增 +
> golden 增量）授权链 issue#2 批复承继 + ADR-0013；SSE 事件护栏 = 15 种内取用
> （恰 7 种），确需新增即中止转 needs-approval（BK-0016 先例字面）；转 ready
> 条件 = BK-0032 CLOSE 后随链晋升。**本链终轮——CLOSE 时回执 issue#2 关单**
> （沿 issue#10/11 终轮先例）。

### 8.2 BACKLOG 三行回写字面量（BUILD 逐字粘贴；仅替换备注列，其余列含状态 proposed 逐字不动）

**BK-0033 行备注 →**（保留行内关键既有口径 + ADR 定界引用；VERBATIM 比对基准）：

```
触UI=是——修宪轮（ADR → 实现 → 同迭代重录/增量 golden，宪法第 3 条；授权链 = issue#2 批复承继 2026-10-23T15:49:39Z + ADR-0013，ADR §8 定界与迭代 0027 SPEC §8 字面一致）：受影响文件=packages/shared/src/nodes/agent/{node.ts,README.md} 新增（NDP 目录制；node.ts ~45 行按 SPEC §4.1 草图：type=agent/类目 chat/图标 sparkles/端口 in-goal+in-ctx+out-result+out-session/参数 model(6 项对齐 llm)+sys+maxSteps(默认 32)/capabilities llm+mcp+skills+agent(sessionMode:goal)）+ nodes.ts 聚合层 +1 import +1 键（→~145 行）+ nodes.baseline.json 重产（16→17 键，经批准通道）+ 守卫/契约测试联动（nodes-dirs D===17、defs-drift +1）+ apps/server/src/agent.ts 新增（≤200 行：maxSteps 预算循环+会话绑定+buildToolSession 复用）+ engine.ts HANDLERS +1 + 前端三文件预期零改动（DEFS 通用渲染链，sparkles/chat 类目色均既有常量；gate 实测确认，若需改动纯插入优先）+ gate.mjs +s8 场景行 + golden s8 新基线（golden-created）与 s3 重录（修宪轮 gate:update，0013 先例）；验收口径=npm run build + npm run gate（重录/增量后全绿）+ npm test + smoke:server（agent 断言组新增 + 既有 95 零回退）+ 手动 E2E 四点位（节点库出现/拖入画布/连线/运行）；依赖关系=前置 BK-0032；类目色两段口径=本轮归既有 chat 类目（--cat-chat #a06bff，零新增 CSS 变量），独立「智能体」类目归 BK-0050；晋升条件=BK-0032 CLOSE 后由心跳 PLAN 轮/补题轮晋升 ready
```

**BK-0034 行备注 →**：

```
触UI=是——修宪轮（授权链 = issue#2 批复承继 2026-10-23T15:49:39Z + ADR-0013，ADR §8 定界与迭代 0027 SPEC §8 字面一致）：受影响文件=前端为主——app.js 浮动会话面板（推荐入口案 B：agent 节点点开浮动面板，容器/会话流/输入区/停止控件/恢复列表 + SSE 流式消费沿 :2237 run SSE 先例；纯插入优先）+ app.css 面板样式新增选择器（纯插入）+ server-sync.js +sessions 数据面（四函数+SVR.sessions 缓存+onSessionsArrive 回调，ADR-0006 边界）+ Skeleton.tsx 预期零改动（动态创建，若需挂载点纯插入并重录 s0）+ gate.mjs +SESSION_ROUTES fixture（五端点 mock，WF_ROUTES/RUN_ROUTES 先例）与 s9 场景行 + golden s9 新基线（golden-created）；后端承载=sessions.ts 既有五端点为准（BK-0016 done 零改动预期，若 SPEC 需补端点列入清单）；SSE 事件护栏沿用 BK-0016：15 种内取用（本面板恰 7 种，与 sessionChatHandler 实发一致），确需新增即中止转 needs-approval；验收口径=npm run build + npm run gate（s9 增量后全绿、既有场景零波及实测）+ npm test + smoke:server G 组零回退 + 手动 E2E 五点位（新建会话→流式输出→停止→恢复→续聊）；依赖关系=前置 BK-0032；实施序=BK-0033 → BK-0034（入口=agent 节点点开，节点先入列；面板不依赖节点入列亦可独立验收的自由度保留为回退路径，ADR §8 定夺）；晋升条件=BK-0032 CLOSE 后随链晋升；**本链终轮**——CLOSE 时回执 issue#2 关单（沿 issue#10/11 终轮先例，中间子项不回执）
```

**BK-0015 行备注 →**（评估结论刷新；状态列 proposed 不动）：

```
llm.ts:70 现为定长 round≤3 工具循环（治理日复核锚点成立）；**2026-10-25 BK-0032 联合评估结论（ADR-0013 §7 / 迭代 0027 SPEC §7）**：最小需批准面=agent 节点路径零额外请批（预算承载=agent 节点 maxSteps DEFS 参数，随 BK-0033 修宪轮落地，issue#2 批复承继+ADR-0013 授权链闭合）；llm 节点 round≤3 维持现状不动（issue#2 批复不覆盖 llm 节点参数面，若未来需 llm 节点级预算按 b 案另开 needs-approval）；「停止条件与预算控制」验收由 agent 节点承载达成（T5-M1 验收点措辞重解读记录在 ADR，ROADMAP 状态行回写留治理日）；实施承载=BK-0033（agent handler 预算循环），本项不再独立立项实现，待 BK-0033 CLOSE 后随批关账
```

**BK-0032 行**：状态流转（ready→doing→done）归脚本/CLOSE，BUILD 不碰；
BK-9002 行（skipped 留指向）逐字不动。

### 8.3 回写规则

BUILD 逐字粘贴 §8.2 三段字面量到对应行备注列（`|` 分隔最后单元格整列替换）；
VERIFY 按 AC4 与 ADR-0013 §8 定界节做三方比对（BACKLOG 行 ↔ ADR §8 ↔ 本
SPEC §8.1——三者关键内容一致，BACKLOG 行与 ADR §8 以「ADR §8 定界与迭代
0027 SPEC §8 字面一致」互指 + 四要素逐项语义相等为 VERBATIM-OK 判据；本
SPEC §8.1 为权威字面量单一载体，ADR §8 由其压缩转写，行内细节差异（如行号
级指针）以本 SPEC 为准——BK-0027 VERBATIM-OK 先例同构）。

## 9 · 验收口径（AC1~AC7 逐条执行命令与核对方法）

**总门禁（AC6，工作流脚本统一执行——先例 0012/0014/0016/0017/0019/0023~0026：
VERIFY 不必复跑全套，REPORT 引用门禁结论）**：

```
npm run build        # shared + web 构建
npm run gate         # 8 场景 0 容差像素比对（纯回归面——前端零改动，预期 diffPx=0）
npm test             # build:shared + build:server + shared 契约测试（现基线 30/30，metrics 0022 行）
npm run smoke:server # 后端冒烟（现基线 95 passed / 0 failed，metrics 0026 行）
```

零代码改动轮四命令全绿即证基线未受扰动；任何红即环境异常回滚不硬闯。smoke
V09 时点性假红先例（产品提交前 git 半边必红，0018/0021/0022/0024）：提交后
CLOSE 复跑自愈，VERIFY 记实得值判据 = 0 failed。

- **AC1 · ADR 落盘与六要素完备**：`ls docs/adr/0013-*.md` 恰一文件；
  `wc -l docs/adr/0013-agent-node-goal-session-panel.md` ≤400；
  `grep -n "草案" docs/adr/0013-*.md` 状态行命中且含「待实施轮消费」+
  授权链（issue#2 批复承继 2026-10-23T15:49:39Z）；逐节核对 §1~§9 对照
  PRD 六要素（动机/影响面/像素对比证据方案/agent 节点 DEFS+类目色方案/goal
  面板消费映射/BK-0033+0034 定界）每要素成节可索引。
- **AC2 · 消费映射与护栏真实可核**：按 ADR §5 映射表逐条对照
  `server.ts:215-219`（五端点名）与 `events.ts:8-37`（15 事件名）——逐一
  相符、无一杜撰；7 种消费事件与 sessions.ts 实发清单（:8-9 头注 + :91/:106/
  :107/:114/:126/:130/:144/:146/:155/:95 七类发射点）一致；护栏声明含「15 种内
  取用，确需新增即中止转 needs-approval」字面（BK-0016 先例口径）。
- **AC3 · BK-0015 联合评估成文**：ADR §7 含四段（llm.ts:70 锚点 / 三选一
  利弊表 / 最小需批准面结论 / 请批清单）；结论含「agent 节点路径零额外请批」
  与「llm 节点维持现状 + 若扩展须另开 needs-approval（issue#2 不覆盖）」双面
  声明。
- **AC4 · 定界回写 VERBATIM 一致**：读 BACKLOG BK-0033/BK-0034/BK-0015 三行
  备注与本 SPEC §8.2 字面量逐字比对（BK-0027 VERBATIM-OK 先例标准）；ADR §8
  定界节与 §8.1 语义相等（§8.3 判据）；`grep -n "| proposed |"
  docs/evolution/BACKLOG.md` BK-0033/BK-0034/BK-0015 三行状态仍在；BK-9002
  行逐字不动（`git diff <base> -- docs/evolution/BACKLOG.md` 核对）。
- **AC5 · 白名单与零代码机器证明**：`git show --numstat <产品提交>` 输出恰
  `docs/adr/0013-agent-node-goal-session-panel.md`（+N/−0 纯新增）一行；
  `git diff <base>..<产品提交> -- apps packages tools tests .github
  package.json package-lock.json` 输出为空（零依赖引入 = lock 零变化）。
- **AC7 · 指针抽样可开**：从 ADR 引用的代码/文件/issue 指针抽样 ≥5 条逐一
  打开比对（建议抽样：`server.ts:215-219`、`events.ts:8-37`、`llm.ts:70`、
  `gate.mjs:176-187`、`nodes/` 16 目录或 `nodes/llm/node.ts`、`sessions.ts:8-9`、
  BACKLOG BK-0016/BK-0021/BK-9002 行、issue#2 链任五以上）；file:line 或行段
  射程内命中；任一失效即 FAIL 列 BUG。
- **手动 E2E 点位（纯文档轮，非阻塞）**：`npm start`（或等效）→ 浏览器打开
  http://localhost:3000 确认应用可起、画布正常加载、节点库 16 节点清单不变
  （证明文档轮对运行时零影响）；门禁四命令已覆盖其余回归面。

## 10 · 回滚步骤

`git revert <产品提交>`（WORKFLOW §6 唯一回滚手段）。纯文档提交无运行时影响：
ADR-0013 移除、BACKLOG 三行备注回到拆分时文案；BK-0033/0034/0015 状态全程
proposed 不受回滚影响；无数据迁移、无降级脚本。issue#2 无回执义务（本轮仅
进度回执，关单留 BK-0034 终轮），回滚后由协调者留言说明（脚本动作）。

## 11 · 风险与声明

1. **ADR 越界预支实现**（PRD 风险 1）：本 SPEC 已把定界粒度锚定 BK-0027 先例
   （方案草图 + 文件清单 + 验收口径，DEFS 代码块是 `satisfies NodeDefJson`
   数据模块形态非产品代码——与 NDP §9 模板同级）；BUILD 转写时禁止扩写实施
   伪代码；VERIFY AC1 逐节审。
2. **BK-0015 评估越权定案**（PRD 风险 2）：AC3 硬性区分「评估结论」与「请批
   清单」；issue#2 批复覆盖面以 issue 正文为准（BK-0043 行内口径字面引用）；
   §7 结论仅记录不实施，BK-0015 行备注明载「待 BK-0033 CLOSE 后随批关账」。
3. **消费映射杜撰端点/事件**（PRD 风险 3）：§5.2/§5.3 全部条目对照本会话亲核
   锚点（§2.2 清单）；AC2 逐条复核兜底。
4. **定界回写与 ADR 漂移**（PRD 风险 4）：§8.3 三方 VERBATIM 判据 + 权威字面量
   单一载体（本 SPEC §8.1/§8.2）；VERIFY 逐字比对。
5. **入口案 B 的设计前置**（本 SPEC 新增风险）：推荐案 B（浮动面板）是 ADR 的
   设计结论而非已批准事实——ADR 状态为草案，用户在 BK-0034 实施前可否决；
   若改采 A/C 案，§6 波及矩阵已预载全量重录代价，BK-0034 实施 SPEC 按 ADR
   终案重算影响面。
6. **前端三文件零改动预判的不确定性**（本 SPEC 新增风险）：BK-0033 前端零
   diff 是基于 DEFS 通用渲染链的推断（app.js:133/:192/:322-336/:1264 亲核），
   gate s3 必红（数据驱动像素变化）属预期修宪面；但若实测出现意外红场景
   （超出 §6 预案），BK-0033 实施轮 SPEC 须先解释每一处波及再动 golden，
   不得盲录。
7. **smoke V09 时点性假红**（PRD 风险 6）：沿先例口径——提交后 CLOSE 复跑
   自愈，VERIFY 记实得值判据 0 failed。
