# 节点定义规范（Node Definition Protocol · NDP v0.1）

> 状态：**草案 v0.1**（2026-10-23 用户会话提出并批准输出；实现未开始，承载项 BK-0021）。
> 目标：像 AI SDK 7 的 `tool()` / provider 协议那样，给 AgentFlow 节点一个明确的
> 声明式定义规范——UI 外观、端口与连线校验、参数、能力接入、目录制存盘。
> 权威顺位：`CONSTITUTION.md` > `AGENTS.md` > 本文件。本规范描述**目标形态**；
> 现行实现（`packages/shared/src/nodes.ts` 单文件 DEFS）在 BK-0021 迁移完成前仍是
> 唯一生效事实源。

## 1. 目的与范围

1. **为什么**：现行 16 种节点定义挤在 `nodes.ts` 单文件（107 行）里，字段语义靠
   惯例、连线规则藏在 `app.js` 代码中、能力接入（handler/caps）无契约表述。T5
   「智能体运行时与工作台」将带来一批新节点（BK-9002~9006），需要先有协议再谈扩展。
2. **目录制的动机**：每节点一目录（`node.json` + `README.md`），查看一个节点只读
   一个目录，学习成本最低（用户原话「方便查看与学习」）。
3. **宪法兼容性**（重要）：
   - 迁移现有 16 节点 = **存储形式重组、内容零漂移**——聚合层导出与契约测试
     （16 节点 / 33 参数 / SSE 事件）保持全绿，UI 三层零感知；
   - **新增节点类型 / 新参数 / 参数选项变更仍触 UI，一律走 `needs-approval`
     issue 修宪通道**（POLICY.md 需批准区），本规范不构成豁免；
   - 本规范的任何字段**不得改变现行默认值、端口名、参数语义**——协议只做
     正式化与扩展预留。

## 2. 设计原则

1. **单一事实源不变**：节点定义仍唯一定居于 `packages/shared`；前端节点库/属性
   面板与后端 `DEFS_META`/`paramsDefaults` 均从聚合层派生，禁止任何一侧手工复制。
2. **声明式优先**：能用数据表达的绝不写成代码——条件显式化（`visibleIf` DSL）、
   连线规则数据化（`edgeRules`）、能力约束表化。`node.json` 必须可被 zod 校验、
   可序列化、可 diff。
3. **前后端共享**：定义文件不含环境依赖（无 import、无函数字面量），web 与
   server 消费同一份。
4. **协议版本化**：每个 `node.json` 声明 `"protocol": 1`；不兼容变更升 major，
   新增可选字段升 minor（由 `nodes.schema.ts` 校验器解释）。

## 3. 目录布局（目标形态）

```
packages/shared/src/
  nodes.ts                  # 聚合层：导出 NODES / NODE_NAMES / paramDefaultsOf，
                           # 签名与键结构不变（迁移后内部改为收集 nodes/ 目录）
  nodes.schema.ts           # 协议 zod schema：加载期校验每个 node.json
  nodes/
    README.md               # 节点总索引：类型 → 目录 → 一句话用途（本规范的运行时副本指针）
    trigger/
      node.json             # 声明式定义（§4）
      README.md             # 该节点说明文档（§8 模板）
    llm/
      node.json
      README.md
    ...                     # 每节点一目录，目录名 = type 键
```

- 目录名即 `type`（现行对象键：`trigger` / `llm` / …），迁移期保持 16 目录与
  现有键一一对应。
- `node.json` 由每目录的加载入口（迁移实现定：构建期聚合脚本或 `with { type:
  "json" }` import）汇入聚合层；**禁止在目录内写 TS 逻辑**，动态行为全部归
  server 侧 handler。

## 4. `node.json` 字段规范

以 `llm` 为例（完整模板见 §9-T3）：

```json
{
  "protocol": 1,
  "type": "llm",
  "identity": {
    "name": "LLM 对话",
    "category": "chat",
    "icon": "bot",
    "keywords": "llm gpt 大模型 对话 chat glm 生成",
    "description": "调用大语言模型生成回复，可注入提示词与上下文。"
  },
  "ports": {
    "inputs":  [{ "id": "in-prompt", "label": "提示词", "type": "text" }],
    "outputs": [{ "id": "out-reply", "label": "回复", "type": "text" }]
  },
  "params": [
    { "id": "model", "label": "模型", "widget": "combo",
      "options": ["GLM-4.7", "GLM-4.7-Air"], "default": "GLM-4.7" },
    { "id": "temp", "label": "温度", "widget": "number",
      "default": 0.7, "min": 0, "max": 2, "step": 0.1 }
  ],
  "edgeRules": { "inherits": "default" },
  "binding": {
    "handler": "llm",
    "capabilities": { "llm": true, "mcp": { "toolSelection": "user" }, "skills": true }
  }
}
```

### 4.1 字段总表

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `protocol` | ✓ | int | 协议版本，当前 1 |
| `type` | ✓ | string | 节点类型键（=目录名，现行 DEFS 对象键） |
| `identity.name` | ✓ | string | 显示名（现 `name`） |
| `identity.category` | ✓ | string | 分类（现 `cat`）：input/chat/knowledge/tools/logic/output/human |
| `identity.icon` | ✓ | string | 图标键（现 `icon`，lucide 名） |
| `identity.keywords` | ✓ | string | 搜索关键词（现 `kw`，空格分隔） |
| `identity.description` | ✓ | string | 一句话描述（现 `desc`） |
| `identity.appearance` | — | object | 预留：标题栏色等外观覆盖（默认按 category 分类色；**启用即触 UI 走修宪**） |
| `ports.inputs[].id/label/type` | ✓ | — | 稳定 ID / 显示名（现 `n`）/ 端口类型（§5） |
| `ports.outputs[].id/label/type` | ✓ | — | 同上 |
| `params[].id/label/widget/default` | ✓ | — | 现 `k/l/t/d`（§6） |
| `params[].options` | combo 必填 | string[] | 现 `o` |
| `params[].min/max/step` | number 必填 | number | 数值约束 |
| `params[].visibleIf` | — | object | 条件显隐 DSL，替代现行函数式 `if`（§6.2） |
| `edgeRules` | ✓ | object | 连线规则继承与覆盖（§5.3） |
| `binding.handler` | ✓ | string | server HANDLERS 键（§7.1） |
| `binding.capabilities` | ✓ | object | 能力声明与护栏标记（§7.2） |

### 4.2 新旧字段映射（聚合层负责，消费方零改动）

| 旧（`nodes.ts` DEFS） | 新（`node.json`） |
| --- | --- |
| 对象键 `trigger` | `type` + 目录名 |
| `name / cat / icon / desc / kw` | `identity.name / category / icon / description / keywords` |
| `caps: ['mcp','skill']` | `binding.capabilities.mcp / .skills` |
| `inputs[].n / .t` | `ports.inputs[].label / .type`（新增稳定 `id`） |
| `params[].k / l / t / o / d` | `params[].id / label / widget / options / default` |
| `params[].min / max / step` | 同名 |
| `if: p => p.mode === '定时触发'` | `visibleIf: { "param": "mode", "equals": "定时触发" }` |

## 5. 端口与连线校验协议

### 5.1 端口类型系统

现行全集四种，NDP v0.1 冻结为：`any`（通配）、`text`、`list`、`object`。
新增类型属协议 minor 升级 + SPEC 评审（如未来 `image` / `json`）。

### 5.2 默认连线规则（现状正式化）

依据 `apps/web/src/legacy/app.js:43`（`typeOk`）与 `app.js:1292-1301`（`addEdge`），
现行画布连线校验共五条，NDP 将其定为 **default 规则集**：

1. **方向**：仅允许 输出端口 → 输入端口（同向拒绝）；
2. **不自连**：`from 节点 ≠ to 节点`；
3. **类型兼容**：`t_src === t_dst`，或任一方为 `any`；
4. **去重**：完全相同 `(fn, fp, tn, tp)` 的边拒绝重复创建；
5. **多入边**：同一输入端口**允许**多条入边（现状行为；引擎侧取值语义由
   handlers 定义，本规范不改变）。

edge 数据结构维持现状 `{ id, fn, fp, tn, tp }`；迁移期聚合层建立
**端口稳定 id → 端口索引** 映射（`node.json` 内按数组顺序），画布与存盘格式
零变化。拖线时的兼容端口高亮（`.compat`）与 toast 反馈属交互层实现，本规范
只约束判定数据。

### 5.3 `edgeRules`：继承与覆盖

```json
"edgeRules": { "inherits": "default" }
```

预留覆盖位（v0.1 不实现，仅占位语义）：`"overrides": { "multiInbound": false }`
——如未来 PTY 终端节点要求输入端口独占、或审查类节点禁止 `any` 通配，在此声明，
画布校验器读取后生效。**任何覆盖生效即改变交互行为，触 UI 走修宪通道。**

## 6. 参数规范

### 6.1 widget 枚举

现行全集五种：`text | textarea | number | combo | toggle`（NDP v0.1 冻结）。
扩展预留（新增即触 UI 走修宪，与 BK-9006 对齐）：`model`（模型选择器）、
`node-ref`（节点引用选择器，BK-0017 审批人 UI 尾巴）、`path`（沙箱文件选择）、
`json`（结构化编辑）。

### 6.2 `visibleIf` DSL（条件显式）

现行 `trigger` 节点有两个函数式条件参数（`cron` 当 `mode==='定时触发'`、
`path` 当 `mode==='Webhook'`）。NDP 以声明式替代（可校验、可序列化）：

```json
"visibleIf": { "param": "mode", "equals": "定时触发" }
```

- v0.1 仅支持单条件 `{ param, equals }`；`notEquals` / 组合（`all: []`）为
  minor 预留；
- `param` 必须指向**同一节点**的既有参数 id，schema 校验；
- 聚合层将 DSL 编译为现行 `if(p => ...)` 函数供前端消费——**行为逐字等价**。

### 6.3 完整性约束

每参数必有 `id / label / widget / default`；`combo` 必有 `options` 且
`default ∈ options`；`number` 必有 `min / max / step` 且 `min ≤ default ≤ max`。
以上由 `nodes.schema.ts` 在加载期强制。

## 7. 能力接入协议（Capability Binding）

### 7.1 handler 绑定

`binding.handler` 声明该节点在 server 侧的实现锚点（`apps/server/src/handlers.ts`
的 HANDLERS 键）。契约（将现有测试正式化）：**HANDLERS 键集 ⊇ NODES 键集**——
缺绑定的 `node.json` 在契约测试即失败，杜绝「定义了但没实现」的悬空节点。

### 7.2 能力类别与强制护栏

节点在 `binding.capabilities` 里声明能力，每类能力附带**不可豁免的护栏**（与
AGENTS.md 硬性约定 3 对齐，server 实现侧强制）：

| kind | 含义 | 强制护栏 |
| --- | --- | --- |
| `llm` | 大模型调用 | 温度/token 上限由参数约束；密钥只进环境变量 |
| `exec` | 命令 / 代码执行 | 必须子进程 + 超时；文件操作限 `apps/server/sandbox/` |
| `net` | 网络请求 | 出站必须走 `guard.ts`（SSRF 防护） |
| `fs` | 文件读写 | 限沙箱目录，路径穿越防护 |
| `human` | 人工 / 他审介入 | 挂起-恢复语义（approval + `/run/:id/approve`） |
| `data` | 纯数据变换 | 无 IO |

现行为 `null` 的伪实现（sqlite/browser stub）仍按「如实降级」原则声明类别并在
README 标注未接入——协议不虚构能力。

### 7.3 能力扩展位（v0.1 预留，T5 消费）

```json
"capabilities": {
  "mcp":   { "toolSelection": "user" },
  "agent": { "sessionMode": "goal", "maxSteps": 128 },
  "requiresApproval": "on-sensitive-tool"
}
```

- `mcp.toolSelection`：`user`（用户勾选注入，现状）| `auto`（BK-0013 后端
  配置驱动自动注入，预留）；
- `agent`：通用智能体节点（BK-9002 批准后启用）的会话模式声明；
- `requiresApproval`：敏感操作触发审批的门控声明（BK-0017 智能体互审 /
  BK-9005 PTY 终端消费）。

**以上扩展位仅是协议占位**：启用任何一项若伴随新节点/新参数/新交互，仍走
`needs-approval` 修宪通道；纯引擎行为（如 `auto` 注入）按 POLICY 对应区域处理。

## 8. 每节点 `README.md` 模板

```markdown
# <identity.name>（`<type>`）

一句话用途（= identity.description）。

## 端口
| 方向 | ID | 名称 | 类型 |
| --- | --- | --- | --- |
| in  | in-prompt | 提示词 | text |

## 参数
| ID | 名称 | 控件 | 默认值 | 约束 / 显隐 |

## 能力与护栏
- binding.handler：…
- capabilities：…（对应 §7.2 护栏条目）

## 现状备注
（如：sqlite 工具未接入，如实降级——引用 REPORT/迭代号）
```

## 9. 典型模板（四例）

### T1 · 纯数据节点（最小骨架：`delay`）

```json
{
  "protocol": 1,
  "type": "delay",
  "identity": { "name": "延时等待", "category": "logic", "icon": "timer",
    "keywords": "delay wait sleep 等待 延时",
    "description": "等待指定时间后继续执行。" },
  "ports": {
    "inputs":  [{ "id": "in-any",  "label": "输入", "type": "any" }],
    "outputs": [{ "id": "out-any", "label": "输出", "type": "any" }]
  },
  "params": [
    { "id": "s", "label": "等待 (秒)", "widget": "number",
      "default": 2, "min": 1, "max": 60, "step": 1 }
  ],
  "edgeRules": { "inherits": "default" },
  "binding": { "handler": "delay", "capabilities": { "data": true } }
}
```

要点：无能力绑定复杂度、直通端口（any→any）、单 number 参数——新节点从这个
骨架起步。

### T2 · 条件参数输入节点（`trigger`）

```json
{
  "protocol": 1,
  "type": "trigger",
  "identity": { "name": "触发器", "category": "input", "icon": "zap",
    "keywords": "trigger start 开始 入口 启动",
    "description": "工作流执行入口，支持手动 / 定时 / Webhook 触发。" },
  "ports": {
    "inputs": [],
    "outputs": [{ "id": "out-start", "label": "开始", "type": "any" }]
  },
  "params": [
    { "id": "mode", "label": "触发方式", "widget": "combo",
      "options": ["手动触发", "定时触发", "Webhook"], "default": "手动触发" },
    { "id": "cron", "label": "Cron 表达式", "widget": "text",
      "default": "0 9 * * 1-5",
      "visibleIf": { "param": "mode", "equals": "定时触发" } },
    { "id": "path", "label": "Webhook 路径", "widget": "text",
      "default": "/api/run",
      "visibleIf": { "param": "mode", "equals": "Webhook" } }
  ],
  "edgeRules": { "inherits": "default" },
  "binding": { "handler": "trigger", "capabilities": { "net": true } }
}
```

要点：空输入端口（入口节点）、`visibleIf` DSL 两处、聚合层编译为现行
`if(p => ...)` 函数逐字等价。

### T3 · 能力绑定节点（最典型：`llm`）

```json
{
  "protocol": 1,
  "type": "llm",
  "identity": { "name": "LLM 对话", "category": "chat", "icon": "bot",
    "keywords": "llm gpt 大模型 对话 chat glm 生成",
    "description": "调用大语言模型生成回复，可注入提示词与上下文。" },
  "ports": {
    "inputs": [
      { "id": "in-prompt", "label": "提示词", "type": "text" },
      { "id": "in-ctx",    "label": "上下文", "type": "any" }
    ],
    "outputs": [{ "id": "out-reply", "label": "回复", "type": "text" }]
  },
  "params": [
    { "id": "model", "label": "模型", "widget": "combo",
      "options": ["GLM-4.7", "GLM-4.7-Air", "GLM-4.6-Flash", "DeepSeek-V4", "GPT-5", "Claude Sonnet 4.5"],
      "default": "GLM-4.7" },
    { "id": "sys", "label": "系统提示词", "widget": "textarea",
      "default": "你是智能客服助手，回答需准确、简洁、友好。" },
    { "id": "temp", "label": "温度", "widget": "number",
      "default": 0.7, "min": 0, "max": 2, "step": 0.1 },
    { "id": "max", "label": "最大 Tokens", "widget": "number",
      "default": 2048, "min": 64, "max": 32768, "step": 64 }
  ],
  "edgeRules": { "inherits": "default" },
  "binding": {
    "handler": "llm",
    "capabilities": { "llm": true, "mcp": { "toolSelection": "user" }, "skills": true }
  }
}
```

要点：多输入端口（text + any）、五类参数控件齐全、`mcp`/`skills` 能力声明
（现状 `caps` 的正式化）——**大多数能力节点照此模板写**。

### T4 · 前瞻草案（`agent`，goal 模式）——仅为协议承载力示例

> ⚠️ 本模板对应 BK-9002（needs-approval issue #2），**未获批准前不落地**。
> 展示协议如何承载 T5 新节点：新 widget（`node-ref`）、能力扩展位、
> 审批门控声明。

```json
{
  "protocol": 1,
  "type": "agent",
  "identity": { "name": "通用智能体", "category": "chat", "icon": "sparkles",
    "keywords": "agent 智能体 goal 会话 自主",
    "description": "goal 模式智能体：自主循环 + 持久会话，可点开进入流式会话面板。" },
  "ports": {
    "inputs":  [
      { "id": "in-goal", "label": "目标", "type": "text" },
      { "id": "in-ctx",  "label": "上下文", "type": "any" }
    ],
    "outputs": [
      { "id": "out-result", "label": "结果", "type": "text" },
      { "id": "out-session", "label": "会话引用", "type": "object" }
    ]
  },
  "params": [
    { "id": "model", "label": "模型", "widget": "combo",
      "options": ["GLM-4.7", "DeepSeek-V4"], "default": "GLM-4.7" },
    { "id": "sys", "label": "系统提示词", "widget": "textarea",
      "default": "你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。" },
    { "id": "maxSteps", "label": "最大步数", "widget": "number",
      "default": 32, "min": 1, "max": 256, "step": 1 }
  ],
  "edgeRules": { "inherits": "default" },
  "binding": {
    "handler": "agent",
    "capabilities": {
      "llm": true,
      "mcp": { "toolSelection": "user" },
      "skills": true,
      "agent": { "sessionMode": "goal" },
      "exec": "sandboxed",
      "net": "guarded",
      "requiresApproval": "on-sensitive-tool"
    }
  }
}
```

## 10. 迁移路线（BK-0021 概要）

1. `nodes.schema.ts`（zod 校验器）+ 聚合层改造，`nodes.ts` 导出签名不变；
2. 试点 2 个节点（`delay` + `trigger`，覆盖 T1/T2 形态）目录化，契约测试绿；
3. 全量 16 节点目录化 + 各目录 README.md；
4. 验收：契约测试全绿（16 节点 / 33 参数 / 事件契约零改动）+
   `paramDefaultsOf` 输出快照与迁移前逐字节等价 + `npm run gate` 全绿
   （前端零感知）；
5. **POLICY 从严条款**：`packages/shared` DEFS 变更属需批准区——即便内容
   零漂移，实现轮先开 `needs-approval` issue 附等价性证据（快照 diff 为空）
   请求确认后合入。

## 11. 与进化工作流的关系

- 本规范承载项：BK-0021（refactor，触UI=否）；
- §7.3 扩展位消费方：BK-0013/0015/0016/0017（引擎行为）与 BK-9002~9006
  （UI 修宪通道）；
- 本文件修订：minor（新增可选字段/模板）由 SPEC 阶段评审即可；major（字段
  语义变更、连线规则变更）需 ADR + 用户批准。
