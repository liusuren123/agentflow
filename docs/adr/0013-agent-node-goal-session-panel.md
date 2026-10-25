# ADR-0013 · 通用智能体节点（agent）与 goal 模式会话面板修宪方案

- 状态：**已获用户 issue#2 批复（2026-10-23T15:49:39Z 承继）· BK-0033 实施轮
  已消费（迭代 0031）· BK-0034 待实施（链终轮）——原文其余按草案态保留至链终**
- 日期：2026-10-25（SPEC 阶段产出，迭代 0027 / BK-0032）
- 关联：BACKLOG BK-0032（本 SPEC 先行轮）/ BK-0033（agent 节点修宪轮，proposed）/
  BK-0034（goal 会话面板修宪轮，链终轮，proposed）/ BK-0015（agent loop 预算承载，
  §7 联合评估）/ BK-0050（节点库独立「智能体」类目，不在本 ADR 射程）/ BK-0016
  （sessions 五端点，done）/ BK-0021（NDP 目录制，done）；ROADMAP T5-M3 智能体
  工作台 UI（差异化主轴）；POLICY.md 需批准区（shared 契约 / UI 三层 / golden）
- 版式对齐：ADR-0009 / ADR-0012

> **显著声明：本 ADR 为修宪方案草案，不实施任何代码、不引入任何依赖、不改变任何
> 运行时行为、不接触任何 golden 基线。全部 DEFS / 前端 / golden 改动仅以文字方案
> 存在，实施归 BK-0033 / BK-0034 修宪轮（授权链 = issue#2 批复承继 + 本 ADR）；
> issue#2 承继的是修宪实施授权——本文件状态行在实施轮 CLOSE 时按 ADR-0010/0012
> 先例更新，全文不出现批准态措辞（始终为草案态标注）。**

## 1. 动机与现状证据

T5 的差异化定位是「画布编排 × 深度智能体工作台」空白带（ROADMAP.md:126-128 竞品
对照结论）：DAG 编排赛道（n8n / Dify / Langflow；Flowise 已于 2026-08 EOL）与
agent 工作台赛道（Claude Code / Cursor / Devin）在交叉处无占位者；画布现有节点止于
单轮 LLM 调用，无「目标自主推进 + 工具循环 + 持久会话」的智能体持续形态。issue#2
（BK-9002，用户批复 2026-10-23T15:49:39Z；2026-10-25 治理日拆分后由 BK-0033/0034
承继授权）即用户对这条空白带的直接注入：通用智能体节点 + goal 模式会话面板。

地基证据三条（均 done，BUILD 会话逐项亲核）：

- **sessions 五端点（BK-0016，迭代 0015）**：`apps/server/src/sessions.ts` 176 行，
  `server.ts:215-219` 五路由（POST / GET `/api/v1/sessions`、GET `/:id`、POST
  `/:id/chat`、POST `/:id/stop`）；会话级 SSE 由 sessionChatHandler 步①-⑬ 全序
  承载，头注 :8-9 明载「turn 流式复用现有 15 种 SSE 事件承载……零新增契约」。
- **NDP 目录制终态（BK-0021，迭代 0021/0022）**：`packages/shared/src/nodes/` 16
  目录 + `nodes.ts` 142 行聚合层（三导出不变）；agent 节点将按
  `src/nodes/agent/node.ts` 目录制定义——「先迁移后扩展」兑现（ROADMAP.md:163-164）。
- **SSE 事件契约稳定**：`packages/shared/src/events.ts:8-37` RunEventSchema 恰 15
  个 z.literal；BK-0016 曾在其中取用 7 种零新增，为本方案消费映射（§5）的直接先例。

## 2. agent 节点 DEFS 方案（含类目色两段口径）

### 2.1 基线与定稿草案

基线 = NDP §9 T4 前瞻草案（`docs/node-definition-protocol.md:535-575`，协议承载力
示例；:531 明载「未获批准前不落地」）。定稿草案（BK-0033 实施轮落
`packages/shared/src/nodes/agent/node.ts`，`satisfies NodeDefJson` 数据模块形态）：

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

### 2.2 与 T4 基线的差异裁决表

| # | T4 基线 | 定稿草案 | 理由 |
| --- | --- | --- | --- |
| 1 | model options 仅 2 项（GLM-4.7/DeepSeek-V4） | 对齐 llm 节点 6 项（`nodes/llm/node.ts:22-28`）+ `runtimeOverridable: true` | 模型接入面是 providers 既有事实（/api/health 运行期覆写同 llm 先例）；双源不一致即漂移 |
| 2 | capabilities 含 `exec:{mode:'sandboxed'}` + `net:{mode:'guarded'}` | 收敛为 `llm/mcp/skills/agent` 四键 | NDP §7.3「协议不虚构行为」+ llm 节点先例（同样经 MCP 工具间接 exec/net，仅声明 llm/mcp/skills 三键，`nodes/llm/node.ts:39`）——工具级 exec/net 护栏由工具层承载（tools/guard），节点不重复声明 |
| 3 | binding 含 `requiresApproval: 'on-sensitive-tool'` | 不进首发定义 | 该字段预留·未启用（nodes.schema.ts:107 注释）；写了未实现的门控即「说了但没做」；BK-9005（PTY）/BK-0017 消费时再启用 |
| 4 | identity 含 `status: 'proposed'` | 省略（active 为缺省语义） | status 预留·未启用且聚合层忽略；BK-0033 落地即显式入列（nodes.ts import + NODES 键），标 proposed 名实不符 |
| 5 | keywords 5 词（agent 智能体 goal 会话 自主） | +`loop 预算` 两词 | 节点库搜索命中面（app.js:325 kw 参与搜索）；maxSteps 是差异化参数 |

### 2.3 schema 纪律合规自检（IMPLEMENT 轮 nodes.baseline.json 重产的依据）

- 端口 id `^[a-z][a-z0-9-]{2,31}$` + in-/out- 前缀 + 节点内唯一（nodes.schema.ts:18-26 / :152-165）：in-goal / in-ctx / out-result / out-session ✓；类型 text / any / object 均在五枚举内（:13-15）✓。
- 参数 widget×default 契约矩阵（:50-58）：combo default 'GLM-4.7' 在 options 值域 ✓；textarea default string ✓；number default 32 ∈ [1,256] 且 step 1>0 ✓；params id 节点内唯一（model / sys / maxSteps）✓；无 visibleIf（T4 同）✓。
- capabilities strictObject 键集 ⊆ 十 kind（llm / mcp / skills / agent 均在 :72-83）✓；`agent` 扩展 kind + `sessionMode` 占位为 NDP §7.3 预留位本尊（:392），启用伴随新节点即走修宪通道——BK-0033 即该通道（issue#2 承继），协议零改动。
- caps 合成（nodes.ts:97-99）：mcp+skills → caps=['mcp','skill']，前端节点库 mini-tag 通用渲染（app.js:334）✓；`agent` kind 不进 caps（合成层只映射 mcp / skill 两键），前端 caps 渲染面零新增。

### 2.4 类目色两段口径（BACKLOG BK-0032 行既定）

本轮 agent 节点归入既有 **chat** 类目：节点库分组与标题栏类目色用
`--cat-chat:#a06bff`（app.css:19-20），零新增 CSS 变量；独立「智能体」类目（CATS
新键 + `--cat-agent` 变量）归 BK-0050（issue#6 承继，不在本 ADR 射程，§9）。节点库
chat 分组自动新增「通用智能体」条目行（DEFS×CATS 通用渲染 app.js:322-336）——数据
驱动的像素变化，s3 重录属 BK-0033 修宪面（§6）。

## 3. handler 边界（会话/预算承载）

- **落点**：新增 `apps/server/src/agent.ts`（agent handler，预算 ≤200 行/文件，
  AGENTS.md 硬性约定 4）+ `engine.ts:26-27` HANDLERS 注册一行；不并入 handlers.ts
  （298 行近半满，独立模块沿 llm.ts 拆分先例）。
- **预算循环**：`maxSteps` 参数（DEFS 本尊）驱动 `for(let step=1; step<=maxSteps;
  step++)` 工具循环——形态对齐 llm.ts:70 现行 round≤3 循环（generateText +
  res.response.messages 续接，llm.ts:71-81 先例），预算语义 = 步数上限；token 逐轮
  累加仅作报告（node:done.tokens / ✓ 摘要，llm.ts:113 同型），v1 不设 token 硬顶
  （如实标注，不虚构预算）。
- **工具会话**：复用 `buildToolSession(n.mcp, ctx.ac.signal)`（mcp/inject.ts，
  BK-0030 产物）三分支语义原样（内置 / 外部动态 / stub 降级）；中止信号透传 run 级
  ctx.ac（llm.ts:39 同型）。
- **会话承载**：每 agent 节点首次执行绑定一个持久会话（store.ts createSession /
  appendMessage 复用，BK-0016 产物；title=节点标题，model / sys=节点参数），
  `out-session` 端口输出 `{ sessionId }` 对象（goal 面板恢复入口的数据锚）；节点执行
  回合的 user 消息 = in-goal 端口值（上下文 in-ctx 拼入，llm.ts:21-32 同型），turn 内
  流式增量沿 node:delta（引擎既有通道）。**不新增 SSE 事件、不新增 API 端点**
  （护栏见 §5.3）。
- **与 llm.ts 关系**：llm 节点 round≤3 循环**维持现状不动**（BK-0015 联合评估结论
  §7）；可选的后端重构（把 llm.ts 工具循环抽为共享 helper 供 agent.ts 复用）属自主区
  纯重构，BK-0033 实施轮量力而行、不作为验收项。

## 4. goal 面板方案与入口选型

### 4.1 三案对比与推荐

| 入口案 | 形态 | 既有 golden 波及 | 评估 |
| --- | --- | --- | --- |
| A · 左侧 rail 新按钮 + 侧栏新页签（data-stab，Skeleton.tsx:23-55 现有 rail 区） | 常驻入口，历史/节点库/工作流同款 | **全部 8 场景** rail 区像素变化 → 修宪轮全量重录 | 入口最显式；但波及面最大，且「goal 会话」叙事上从属 agent 节点而非全局 |
| **B · agent 节点点开浮动面板（推荐）** | 浮动会话面板（会话流/输入区/停止控件），先例：浮动运行卡 + 审批弹窗 `.modal-mask`（app.js:469 同款动态创建） | **零波及**（面板默认不可见；仅新增场景） | 像素波及最小；「画布编排 × 工作台」叙事闭环（节点即工作台入口）；NDP T4 描述「可点开进入流式会话面板」（:541）同向 |
| C · 顶栏标签页 | 顶栏区改造 | 全部 8 场景顶栏区变化 | 顶栏标签页是工作流页签（宪法冻结语义最强），否决 |

推荐 B：BK-0034 实施面 = 纯新增（面板容器动态创建 + 新 CSS 选择器纯插入），既有
s0~s8 全部零波及（VERIFY gate 实测确认）；A / C 案的全量重录代价作为 B 案论据记录
于本 ADR——实施期若 B 案被否决，按本矩阵重算影响面（§6 BK-0050 行同走修宪重录通道）。

### 4.2 面板组成与模块边界承载

面板组成四件：会话流（user / assistant 气泡 + 系统行）、输入区（textarea + 发送）、
停止控件（活动 turn 时可用）、恢复列表（历史会话选择，面板头部子视图）。模块边界
（ADR-0006）：

- **数据层**：`apps/web/src/server-sync.js` +sessions 数据面（fetchSessionList /
  fetchSessionDetail / createSession / stopSession 四函数 + `SVR.sessions` 缓存 +
  `onSessionsArrive` 回调，沿 :45-48 wfArrive/runsArrive 先例；仅 /api/v1、不操作
  面板 DOM、AbortSignal.timeout(8000) 同款）——预计 +60~80 行。
- **流式与渲染**：SSE 流式消费（POST chat fetch + getReader 解析）在 `app.js`
  （沿 run SSE 先例 :2237-2242——流式端点非持久化列表面，同为 app.js 作用域，
  边界文档 :134 注记）+ 面板 DOM 动态创建/渲染。

## 5. goal 面板消费映射（五端点 / 7 事件）与护栏

### 5.1 端点 → 面板行为（逐条对照 server.ts:215-219）

| 端点（server.ts 锚点） | 面板行为 |
| --- | --- |
| `POST /api/v1/sessions`（:215；sessions.ts:39-42） | 新建会话：agent 节点首次打开面板且无绑定会话时创建（title=节点标题 / model=节点 model 参数 / sys=节点 sys 参数）→ 201 SessionRow（store.ts:48-56 六字段） |
| `GET /api/v1/sessions?limit=`（:216；sessions.ts:44-48） | 恢复列表：面板「历史会话」子视图拉取（updated_at 倒序；limit 1-100 校验 400 语义——面板固定默认 20，不触发） |
| `GET /api/v1/sessions/:id`（:217；sessions.ts:50-54） | 恢复：回读 `{session, messages}`（messages seq 升序）全量回放会话流气泡；404 → 面板空态提示 |
| `POST /api/v1/sessions/:id/chat`（:218；sessions.ts:69-164） | 续聊：body.text 非空字符串（400 语义）；SSE 流式 turn 步①-⑬，事件映射见 §5.2；409（turn 活动中）→ 面板按「回复进行中」提示（正常流面板输入区禁用不触发，兜底语义） |
| `POST /api/v1/sessions/:id/stop`（:219；sessions.ts:58-63） | 停止：中止活动 turn；404（无活动 turn）→ 面板按「当前无进行中回复」提示（不区分会话不存在与无活动，sessions.ts:56-57 注释语义） |

### 5.2 事件 → 呈现语义（面板恰消费 7 种；逐条对照 events.ts:8-37 与 sessions.ts 发射点）

前提事实：sessionChatHandler 实发 7 种（sessions.ts:8-9 头注 + 步⑤-⑬ 代码：
run:accepted :91、node:start :114、node:delta :126/:130、node:done :144、log
:106/:146、run:error :107/:155、run:done :95-97）。

| 事件（载荷锚点） | 面板呈现语义 |
| --- | --- |
| `run:accepted`（runId=turnId，:91） | turn 边界开启：状态置「生成中」、输入区禁用（不渲染日志行——面板非日志域） |
| `node:start`（id 恒 0 / title=会话标题，:114） | assistant 气泡占位（会话合成节点，SESSION_NODE_ID=0 信封内恒 0，sessions.ts:28） |
| `node:delta`（id 0 / text=**累积全文**，:126/:130） | assistant 气泡打字机增量（全文覆盖式渲染；服务端已 60ms 节流，DELTA_EMIT_MS :31） |
| `node:done`（out=全文 / tokens? / ms，:144） | assistant 气泡定稿 + tokens/耗时脚注；输入区恢复 |
| `log`（lvl sys/ok/warn，:106/:146） | 面板内系统行（实发清单：⚠ 模型未配置 / 🔧 无 / ✓ 会话回复——仅 :106/:146 两处字面） |
| `run:error`（message，:107/:155） | 错误行 + 输入区恢复（assistant 不落库，服务端语义如实呈现） |
| `run:done`（ok/stopped/done/total/ms/outputs，:95-97） | turn 终态：ok=true 正常收尾；**stopped=true → 「已停止」标记且服务端不发 node:done（:134-137 停止路径），面板须以最后一次 node:delta 的累积全文固化气泡（部分文本已落库）**；ok=false 非 stopped → 错误收尾 |

其余 8 种事件（run:start / run:progress / node:bypass / node:error / cond / output /
approval:required / approval:done，events.ts:10-27）**turn 流不发射、面板不消费**
（turn 流语义不涉工作流级进度 / 条件 / 审批事件）；在此如实列明，与 BK-0016 先例
同口径。

### 5.3 SSE 事件护栏（BK-0016 先例口径）

> **SSE 事件护栏**：goal 面板对会话 turn 流的消费在既有 15 种 SSE 事件内取用
> （本面板恰消费其中 7 种，与 sessionChatHandler 实发集合一致）；实施中确需
> 新增事件类型即触 POLICY 需批准区（packages/shared 契约变更），**立即中止转
> needs-approval issue，不得自主新增**（沿 BK-0016 行内护栏先例，BACKLOG.md:93）。

## 6. 像素对比证据方案（golden s8+ 预案，双通道）

宪法第 3 条要素——像素对比证据以双通道获取（0011/0013 先例）：**新增场景走
golden-created 通道**（基线 png 不存在即落盘并记 `golden-created` 状态，
gate.mjs:247-253）；**受波及既有场景经修宪轮 gate:update 重录**（迭代 0013 先例）。
本 ADR 只列场景名 / 触发条件 / fixture 依赖 / 波及清单，不写 gate.mjs 代码（实施轮
SPEC 定）。

| 轮次 | 场景 | 触发条件 | fixture 依赖 | 通道 |
| --- | --- | --- | --- | --- |
| BK-0033 | `s8-agent-node`（新场景） | 画布加载含 agent 节点的工作流（localStorage 预置或等效注入，实施轮 SPEC 定），agent 节点静态渲染态（chat 类目色标题栏 + sparkles 图标 + model/sys/maxSteps widget 行） | 无新增路由（静态画布） | golden-created |
| BK-0033 | `s3-library`（受波及重录） | 节点库 chat 分组自动新增「通用智能体」条目行（DEFS×CATS 通用渲染 app.js:322-336，非代码改动而是数据驱动像素变化） | 既有 | gate:update（修宪轮） |
| BK-0033 | s0/s1/s2/s4~s7 | 理论零波及（无 rail/面板/默认工作流变化；sparkles 图标（app.js:77）与 chat 类目色均既有常量）——gate 全场景实测确认，任一意外红即中止排查 | 既有 | 预期零波及 |
| BK-0034 | `s9-goal-panel-online`（新场景） | agent 节点点开浮动会话面板在线态（含历史消息气泡 + 输入区 + 停止控件渲染） | **SESSION_ROUTES** 五端点 mock（沿 WF_ROUTES/RUN_ROUTES 先例 gate.mjs:181-184；SSE turn 流 mock 按需） | golden-created |
| BK-0034 | s0~s8 | 入口案 B（浮动面板）下零波及（面板默认不可见）——gate 实测确认；若实施期改采 A/C 案则按 §4.1 矩阵全量重录（本 ADR 已记录该权衡） | 既有 | 预期零波及 |
| （未来）BK-0050 | 节点库面板场景 | 独立「智能体」类目入 CATS（app.js:46-54）+ `--cat-agent` CSS 变量（app.css:19-20 区） | 既有 | 修宪轮重录（issue#6 承继，不在本 ADR 射程） |

## 7. BK-0015 联合评估：agent loop 预算承载（最小需批准面）

1. **现状锚点**：`apps/server/src/llm.ts:70` `for(let round=1; round<=3; round++)`
   定长工具循环（126 行文件）；prepareStep/stopWhen 零新依赖（BK-0015 行内既有认定；
   SDK 面复核为实施轮 SPEC 义务，沿 ADR-0012「实施轮必须复核时效」先例）。
2. **三选一利弊**（BK-0015 行内既列三案）：

   | 方案 | 利 | 弊 | 需批准面 |
   | --- | --- | --- | --- |
   | a · 新 env（如 AGENT_MAX_ROUNDS） | 零 UI | 全局单值、无工作流粒度；语义弱 | 新增环境变量语义（POLICY 需批准区）——issue#2 批复不覆盖 |
   | b · 新节点参数（DEFS） | 工作流/节点粒度预算，叙事最正 | 对 **llm 节点** = DEFS 变更+触 UI，且 issue#2 批复面是「通用智能体节点+goal 面板」（BK-9002 行），**不覆盖 llm 节点参数扩展**——须另开 needs-approval（沿 BK-0043「父项批复不自动覆盖依赖面」口径）；对 **agent 节点** = 新节点自带 maxSteps 参数，已被 BK-0033 修宪授权（issue#2 承继）覆盖 | agent 路径零额外请批；llm 路径须另开 |
   | c · 引擎常量 | 零请批 | 无预算语义（不可调），等于现状——不满足 T5-M1 验收点「LLM 节点具备停止条件与预算控制」（ROADMAP.md:138） | 无（但目标未达成） |

3. **最小需批准面结论**：**agent 节点路径零额外请批面**——预算承载 = agent 节点
   `maxSteps` DEFS 参数（§2.1），随 BK-0033 修宪轮落地，授权链 = issue#2 批复承继
   （2026-10-23T15:49:39Z）+ 本 ADR；**llm 节点 round≤3 维持现状不动**（BK-0033
   不同时触碰 llm 节点参数面）。BK-0015 的「停止条件与预算控制」验收由 agent 节点
   承载达成（agent 节点即 LLM 调用节点的预算化 loop 形态）；ROADMAP T5-M1 验收点
   措辞的此重解读在本文显式记录，状态行回写留治理日 PM。若未来确需 llm 节点级
   预算，届时按 b 案另开 needs-approval（issue#2 不自动覆盖）。
4. **请批清单**：**无（零请批面）**——本结论不产生任何新 needs-approval 义务；
   BK-0033/0034 修宪授权链闭合于 issue#2 承继。附条件条款：若 BK-0033 实施期决定
   扩展 llm 节点参数（超出本结论范围），须立即中止转 needs-approval，不得沿用
   issue#2 承继。

## 8. BK-0033 / BK-0034 实施定界（影响面索引）

定界四要素（受影响文件 / 验收口径 / 依赖关系 / 需批准面）的**权威字面量** = 迭代
0027 SPEC §8.1~§8.2（含 BACKLOG 三行回写字面量，VERIFY VERBATIM 比对基准）；本节
为压缩索引（行级细节差异以 SPEC 为准）：

- **BK-0033（agent 节点修宪轮）**：受影响文件 = `packages/shared/src/nodes/agent/
  {node.ts,README.md}` 新增（node.ts ~45 行按 §2.1 草图；README 由
  tools/gen-node-readmes.mjs 生成）+ `nodes.ts` 聚合层 +1 import +1 键（→~145 行）+
  `nodes.baseline.json` 重产（16→17 键，经批准通道）+ 守卫/契约测试联动（nodes-dirs
  D===17、defs-drift +1）+ `apps/server/src/agent.ts` 新增（≤200 行：maxSteps 预算
  循环 + 会话绑定 + buildToolSession 复用）+ `engine.ts` HANDLERS +1 + 前端三文件
  预期零改动（DEFS 通用渲染链，gate 实测确认，若需改动纯插入优先）+ gate.mjs +s8
  场景行 + golden s8 新基线（golden-created）与 s3 重录（修宪轮 gate:update）。
  验收口径 = npm run build + npm run gate（重录/增量后全绿）+ npm test（shared 契约 +
  守卫/快照 17 目录）+ npm run smoke:server（agent handler 断言组新增 + 既有 95
  零回退）+ 手动 E2E 四点位（节点库出现 / 拖入画布 / 连线 / 运行）。依赖关系 = 前置
  BK-0032（本 ADR）。需批准面 = 修宪轮整体（shared DEFS 新增 + golden 重录），授权链
  issue#2 批复承继 + 本 ADR；类目色两段口径见 §2.4；转 ready 条件 = BK-0032 CLOSE
  后由 PLAN 轮晋升。
- **BK-0034（goal 会话面板修宪轮——BK-9002 链终轮）**：受影响文件 = 前端为主——
  `apps/web/src/legacy/app.js` 浮动会话面板（推荐入口案 B：容器 / 会话流 / 输入区 /
  停止控件 / 恢复列表 + SSE 流式消费沿 :2237 先例；纯插入优先）+ `app.css` 面板样式
  新增选择器（纯插入）+ `server-sync.js` +sessions 数据面（§4.2 四函数 + 缓存 +
  回调，ADR-0006 边界）+ `Skeleton.tsx` 预期零改动（动态创建，若需挂载点纯插入并
  重录 s0）+ gate.mjs +SESSION_ROUTES fixture（五端点 mock，WF_ROUTES/RUN_ROUTES
  先例）与 s9 场景行 + golden s9 新基线（golden-created）；后端承载 = sessions.ts
  既有五端点为准（BK-0016 done 零改动预期，若 SPEC 需补端点列入清单另行定界）。
  验收口径 = npm run build + npm run gate（s9 增量后全绿、既有场景零波及实测）+
  npm test + smoke:server G 组零回退 + 手动 E2E 五点位（新建会话 → 流式输出 → 停止
  → 恢复 → 续聊）。依赖关系 = 前置 BK-0032；推荐实施序 BK-0033 → BK-0034（入口 =
  agent 节点点开，节点先入列；「面板不依赖节点入列亦可独立验收」自由度保留为回退
  路径）。需批准面 = 修宪轮整体（前端三层新增 + golden 增量），授权链同上；SSE 事件
  护栏见 §5.3；**本链终轮——CLOSE 时回执 issue#2 关单**（沿 issue#10/11 终轮先例，
  中间子项不回执）。

## 9. 影响面与不做范围

- **本轮（BK-0032）零代码 / 零依赖 / 零 shared 契约 / 零 env / 零出站 / 零 UI /
  零 golden**：本文件纯新增 + BACKLOG 三行定界回写（随归档提交）；`apps/**`、
  `packages/**`、`tools/**`、`tests/**`、`.github/**`、package.json / lock 零改动
  （机器证明 = 对上述路径 `git diff` 恒空）。
- BK-0033 / BK-0034 是修宪实施轮（UI 三层 + golden 面），按 §8 消费本 ADR；链晋升
  ready 前不实施。
- BK-0050 节点库独立「智能体」类目、BK-0035~0039（SPEC 四连先行后三位）、BK-0019/
  0020 后端语义项均不在本 ADR 射程（见各自 BACKLOG 行）；BK-0015 结论（§7）仅记录
  不实施——待 BK-0033 CLOSE 后随批关账。
