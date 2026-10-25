# 节点定义规范（Node Definition Protocol · NDP v0.2）

> 状态：**草案 v0.2**（2026-10-23）。v0.1 经外部评审 53 条标注（4 Critical / 30+ Major
> / Minor / Suggestion / QA 事实），全部裁决吸收；评审记录留档于
> `docs/node-definition-protocol-review-notes.md`。实现未开始，承载项 BK-0021。
> 权威顺位：`CONSTITUTION.md` > `AGENTS.md` > `docs/evolution/WORKFLOW.md` >
> `docs/evolution/POLICY.md` > 本文件。本规范描述**目标形态**；现行实现
> （`packages/shared/src/nodes.ts` 单文件，119 行：DEFS 段 `:9-107` +
> `NODE_NAMES`/`paramDefaultsOf` `:109-119`）在 BK-0021 迁移完成前仍是唯一生效事实源。

## 1. 目的与范围

1. **为什么**：现行 16 种节点定义挤在 `nodes.ts` 单文件里，字段语义靠惯例、连线
   规则藏在 `app.js` 代码中、能力接入（handler/caps）无契约表述。T5「智能体运行时
   与工作台」将带来一批新节点（BK-9002~9006），需要先有协议再谈扩展。
2. **目录制的动机**：每节点一目录（`node.ts` + `README.md`），查看一个节点只读
   一个目录，学习成本最低（用户原话「方便查看与学习」）。
3. **宪法兼容性**（重要）：
   - 迁移现有 16 节点 = **存储形式重组、内容零漂移**——聚合层导出与契约测试
     保持全绿，UI 三层零感知；
   - **新增节点类型 / 新参数 / 参数选项变更仍触 UI，一律走 `needs-approval`
     issue 修宪通道**（POLICY.md 需批准区），本规范不构成豁免；
   - 本规范的任何字段**不得改变现行默认值、端口名、端口顺序、参数语义**——
     协议只做正式化与扩展预留（端口顺序为何是契约，见 §5.3/§5.4）。

## 2. 设计原则

1. **单一事实源**：节点定义仍唯一定居于 `packages/shared`，前端与后端均从聚合层
   派生。**现状承认**：历史上节点知识散落 8 处（前端 `app.js` 4 处 + 后端 4 处，
   完整核对表见 §11.1），仅 `NODES` 键集有契约测试保护；迁移期逐一核对（§11），
   长期收敛到聚合层单一出口。
2. **声明式优先**：能用数据表达的绝不写成代码——条件显式化（`visibleIf` DSL）、
   连线规则数据化（`edgeRules`）、能力约束表化。节点数据可被 zod 校验、可序列化、
   可 diff。
3. **前后端共享**：定义文件是**纯数据模块**——无 import、无函数字面量、无副作用，
   web 与 server 消费同一份。
4. **协议版本化**：每个节点定义声明 `"protocol": 1`（整数只记 major；minor 由
   schema 向后兼容地解释，不单设字段）。**兼容性判定主体是 SPEC 评审或 ADR**，
   schema 校验器只机械执行形状规则——形状不变而语义剧变的变更（如收窄 `category`
   取值集合）由评审裁决，不由校验器。
5. **引用边界**：`nodes/<type>/node.ts` **只允许被 `packages/shared/src/` 内的聚合
   层引用**；禁止 `apps/web`、`apps/server` 或包外任何文件直接 import 单个节点
   定义。以契约测试扫描引用路径守护（目录制下定义散在 16 处，放开引用即架空
   单一事实源）。

## 3. 目录布局（目标形态）

```
packages/shared/src/
  nodes.ts                  # 聚合层：导出 NODES / NODE_NAMES / paramDefaultsOf，
                           # 签名与键结构不变（迁移后内部改为静态 import 收集 nodes/ 目录）
  nodes.schema.ts           # 协议 zod schema：加载期校验每个节点定义（.strict()）
  nodes/
    README.md               # 节点总索引：类型 → 目录 → 一句话用途（由聚合层生成）
    trigger/
      node.ts               # 纯数据模块：export default { ... }（见 §4）
      README.md             # 该节点说明文档（由 node.ts 生成，§8）
    llm/
      node.ts
      README.md
    ...                     # 每节点一目录，目录名 = type 键
```

**加载机制（定死，不留实现轮）**：每目录 `node.ts` 数据模块 + 聚合层**显式静态
import**。理由（裁决记录）：

- 备选 A「构建期 `fs.readdir` 扫描」硬阻塞：`packages/shared` 只导出 `dist`
  （`package.json` `files:["dist"]`、`exports` 仅 `"."`），`build` 仅 `tsc`，JSON
  类资产不会被复制，`npm test` / `npm start` 直接崩；
- 备选 B「`node.json` + `resolveJsonModule`」：需改 `tsconfig.base.json`（未开
  该选项）牵动 web / server 两个 workspace，**且 tsc 从不复制 `.json` 到
  `dist`**——import 断言在运行时仍要求 dist 内存在该文件，须另加构建复制步骤
  （评审记录 §7#6 中「无需额外复制脚本」的表述经核实有误）；
- 采用「`node.ts` 数据模块」：tsc 原生编译输出、零复制、零 tsconfig 变更、带类型
  提示（`satisfies NodeDefJson`）——「目录内只允许数据」不因文件后缀改变。

配套护栏：契约测试断言「`nodes/` 目录数 = `NODES` 键数」防漏 import；评估聚合层
是否触及 AGENTS.md 400 行上限（触及则拆 `nodes/index.ts` 转发，导出面不变）。

## 4. 节点定义格式

以下为字段形状**示意（节选）**——`llm` 完整定义（2 输入端口 + 4 参数）见 §9-T3：

```ts
export default {
  protocol: 1,
  type: 'llm',
  identity: {
    name: 'LLM 对话',
    category: 'chat',
    icon: 'bot',
    keywords: 'llm gpt 大模型 对话 chat glm 生成',
    description: '调用大语言模型生成回复，可注入提示词与上下文。',
  },
  ports: {
    inputs:  [{ id: 'in-prompt', label: '提示词', type: 'text' }],
    outputs: [{ id: 'out-reply', label: '回复', type: 'text' }],
  },
  params: [
    { id: 'model', label: '模型', widget: 'combo',
      options: [{ value: 'GLM-4.7', label: 'GLM-4.7' }, /* … */],
      default: 'GLM-4.7' },
    { id: 'temp', label: '温度', widget: 'number',
      default: 0.7, min: 0, max: 2, step: 0.1 },
  ],
  edgeRules: { inherits: 'default' },   // 可省略，缺省即 default
  binding: {
    handler: 'llm',
    capabilities: { llm: true, mcp: { toolSelection: 'user' }, skills: true },
  },
} satisfies NodeDefJson;
```

### 4.1 字段总表

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `protocol` | — | int | 协议 major 版本，当前 1；**可省略**（schema 兜底为 1） |
| `type` | ✓ | string | 节点类型键（=目录名，现行 DEFS 对象键） |
| `identity.name` | ✓ | string | 显示名（现 `name`） |
| `identity.category` | ✓ | string | 分类（现 `cat`）：input/chat/agent/knowledge/tools/logic/output/human |
| `identity.icon` | ✓ | string | 图标键（现 `icon`，lucide 名） |
| `identity.keywords` | ✓ | string | 搜索关键词（现 `kw`，空格分隔） |
| `identity.description` | ✓ | string | 一句话描述（现 `desc`） |
| `identity.appearance` | — | object | 预留·未启用：标题栏色等外观覆盖（启用即触 UI 走修宪） |
| `identity.status` | — | enum | 预留·未启用：`active`（缺省）/ `proposed` / `deprecated`；聚合层只收集非 `proposed` 节点（T4 前瞻模板使用） |
| `ports.inputs[].id/label/type` | ✓ | — | 稳定 ID（§5.3 规则）/ 显示名（现 `n`）/ 端口类型（§5.1） |
| `ports.outputs[].id/label/type` | ✓ | — | 同上 |
| `params[].id/label/widget/default` | ✓ | — | 现 `k/l/t/d`；**`id` 是原键改名，非新增**（§4.2） |
| `params[].options` | combo 必填 | {value,label}[] | 现 `o`（§4.3） |
| `params[].min/max/step` | — | number | **保持可选**（与 `types.ts:16-21` 一致，不收紧）；提供时须满足 §6.1 矩阵 |
| `params[].visibleIf` | — | object | 条件显隐 DSL（§6.2） |
| `params[].implemented` | — | boolean | 缺省 `true`；`false` = UI-only 参数（后端未接入，§6.4） |
| `params[].runtimeOverridable` | — | boolean | 预留·未启用：combo 选项可在运行期被替换（§6.3） |
| `edgeRules` | — | object | 连线规则继承与覆盖（§5.5）；**可省略**（缺省 default） |
| `binding.handler` | ✓ | string | HANDLERS 键（§7.1） |
| `binding.requiresApproval` | — | string | 预留·未启用：审批门控策略（§7.3；门控 ≠ 能力类别，故在 binding 顶层） |
| `binding.capabilities` | ✓ | object | 能力声明（§7.2）；允许空对象（无 IO 的纯标记节点） |

**预留位统一裁决**：所有「预留·未启用」字段一律以 `.optional()` 写进 schema，
字段总表如上标注；**聚合层 v0.1 迁移必须忽略其值**——忽略本身即「内容零漂移」
的一部分。

### 4.2 新旧字段映射（双向）

**正向（现行 DEFS → node.ts）**，迁移时逐项转写：

| 旧（`nodes.ts` DEFS） | 新（`node.ts`） |
| --- | --- |
| 对象键 `trigger` | `type` + 目录名 |
| `name / cat / icon / desc / kw` | `identity.name / category / icon / description / keywords` |
| `caps: ['mcp','skill']` | `binding.capabilities.mcp / .skills` |
| `inputs[].n / .t` | `ports.inputs[].label / .type`（**新增**稳定 `id`） |
| `outputs[].n / .t` | `ports.outputs[].label / .type`（**新增**稳定 `id`） |
| `params[].k / l / t / o / d` | `params[].id / label / widget / options / default` |
| `params[].min / max / step` | 同名（可选语义不变） |
| `if: p => p.mode === '定时触发'` | `visibleIf: { param: 'mode', equals: '定时触发' }` |
| `params[].kw`（`types.ts` 已声明，全仓未使用） | **不纳入 v0.1 schema**；未来启用按 minor 处理 |

**反向合成（聚合层义务）——实现轮必读，两个必踩点**：

1. `capabilities.skills`（复数）必须合成为 `caps` 数组里的 `'skill'`（**单数**，
   `app.js:989` 判定 `includes('skill')`），且 `caps` 固定输出 `['mcp','skill']`
   **先 mcp 后 skill**（`app.js:334` 按数组顺序渲染能力 chip，顺序错即像素门禁红）。
   **禁止按 `Object.keys(capabilities)` 枚举顺序合成**；契约测试补
   `assert.deepEqual(NODES.llm.caps, ['mcp','skill'])`。
2. **`params[].id` 必须逐字等于现行 `k`**——它是原键改名，不是新增自由命名字段。
   后端硬编码引用 `p.<key>` 共 34 行 / 37 处 / 23 个键（`handlers.ts` 29 行 32 处、
   `llm.ts:15/34/35/36`、`engine.ts:128`），改名即运行时静默全线失效而契约测试全绿。
   已知**跨节点同名异义键**：`p.to`（http=超时秒数 / notify=接收人 / approval=超时
   策略）、`p.max`（websearch / loop / llm 三义）——改名必须全仓同步，**禁止按节点
   逐个「优化命名」**。

聚合层对外导出的 `NODES` 在 §11.1 的 8 处消费点全部改造完毕之前，**逐字保留现行
键结构**（`name/cat/icon/desc/kw/caps/inputs[].n.t/outputs[].n.t/params[].k.l.t.o.
d.min.max.step.if`）；改造这些消费点属触 UI，走修宪通道，不计入 BK-0021 零漂移
范围。已知直接消费旧键的位点：`app.js:195`（`p.k/p.d`）、`:739`（`p.o.map`）、
`:744`（`p.min/max/step`）、`:763`（`p.if(ps)`）、`:2048`（`DEFS.llm.params[0].o`）。

### 4.3 `options` 值形状：value / label 分离（本轮裁决：v0.2 即做）

combo 选项由 `string[]`（value==label）升级为 `{value, label}[]`：

- `default` 与 `visibleIf.equals` 引用 **value**；聚合层导出现行 `o` 时输出
  **label 序列**；
- **迁移期等价性约束：所有既有 combo 的 `value ≡ label`（逐字相等）**——这是
  `options` 输出与 `default` 输出做到逐字节等价的前提；未来改文案只动 `label`；
- 动机（裁决记录）：现行 `o: string[]` 使中文显示文案成为逻辑判据（`visibleIf.
  equals:"定时触发"`、`engine.ts:55` 比较 `'博查'`），改文案会同时破坏显隐逻辑与
  默认值断言，且中文已进入持久化数据——16 目录落地后再分离要逐个返工。

## 5. 端口与连线校验协议

### 5.1 端口类型系统

声明层现行全集**五种**（`types.ts:7` `PortType`、`app.js:36-42` `PTYPES`、
`contract.test.mjs:25` 白名单三处一致）：`any`（通配）、`text`、`list`、`object`、
`number`（有配色定义，当前无节点使用）。NDP v0.2 冻结为**五种**；启用既有
`number` 不算新增类型，但按「新增端口」处理（append-only，§5.3）。未来新增类型
（`image` / `json` 等）属协议 minor + SPEC 评审。

类型卫生引导：现行 31 个端口项中约 20 个为 `any`，约束力有限。**新增节点优先
使用具体类型**；`any` 仅限确实无法归类的透传场景，且须在该节点 README 端口表
说明理由。

### 5.2 现行连线闸门（现状正式化）

依据 `app.js:43`（`typeOk`）与 `addEdge`（`app.js:1292-1317`，校验段 `:1294-1297`），
现行画布连线共**七道闸**，其中五条定为 default 规则集，两条为运行时门控：

1. **方向**（default）：仅允许 输出端口 → 输入端口。注意 enforcement 落点在
   **调用点** `app.js:1530-1531`（拖线交互归一化 out/in），不在 `addEdge` 内；
   `addEdge` 另有 3 个调用点（`:1532` / `:1719` / `:1722` 自动连线），新增调用点
   若不继承该判定即可绕过方向校验——迁移不得移动此判定；
2. **不自连**（default）：`from 节点 ≠ to 节点`；
3. **端口存在性**（default）：输出/输入端口索引有效（`:1295-1296`，越界**静默
   拒绝**）；
4. **类型兼容**（default）：`t_src === t_dst` 或任一方为 `any`；
5. **去重**（default）：完全相同 `(fn, fp, tn, tp)` 的边拒绝重复创建；
6. **多入边**（现状，记录但不背书）：同一输入端口允许多条入边，**取值语义在
   引擎**：`engine.ts:92-93` 取第一条非 undefined 的上游值、其余丢弃（`[已知债务]
   多入边取值语义未定义，引擎当前取首条；修正属引擎行为变更（POLICY 自主区），
   不属本协议 major——本协议仅记录存盘与校验口径**）；
7. **运行中禁连**（运行时门控，不入 default 规则集）：`app.js:1401`。

另：建边**无环检测**，环只在执行期告警（`app.js:1919`、`engine.ts:62`）。若未来
引入 `edgeRules.overrides.cycle`，属新增交互限制，触 UI 走修宪通道。

edge 数据结构维持现状 `{ id, fn, fp, tn, tp }`（端口按**数组索引**寻址：
`app.js:1295`、`engine.ts:74`）。拖线时兼容端口高亮（`.compat`）与 toast 反馈属
交互层实现，本规范只约束判定数据。

### 5.3 端口顺序与稳定 id（存盘契约，Critical）

**端口数组 append-only**：已存盘的边只含端口索引（`fp`/`tp`），索引由
`ports[]` 数组顺序决定，且存量数据（localStorage `agentflow.v2` 与
`store.ts:149-183` 的不透明 JSON）**无版本号、无 schema 校验、无迁移钩子**——
中间插入端口 = 存量边**静默错位**；删除端口 = 引擎越界回退 `src.value`
（`engine.ts:74`），行为静默改变。因此：

- 端口数组**只允许 append 到末尾**；插入 / 重排 / 删除 = 协议 major + ADR +
  迁移脚本（旧索引 → 稳定 id → 新索引重映射；无法映射的边**显式报「连线失效」，
  禁止静默丢弃**）；
- **`params[]` 数组顺序同为契约**（= 属性面板 widget 渲染顺序，`app.js:763/930`），
  同规则 append-only；
- 稳定 `id` 规则：**节点内唯一**（跨 inputs / outputs 合计唯一，不同节点可同名）；
  字符集 `^[a-z][a-z0-9-]{2,32}$`；`in-` / `out-` 前缀强制；一经发布即冻结，
  rename 等同删除 + 新增（major）。

### 5.4 工作流文档版本化（裁决：单独立项）

为工作流文档引入 `schemaVersion` 属**新增数据契约**（POLICY 需批准区），**不夹带
在 BK-0021 内**，另行立项。v0.2 只版本化节点定义（`protocol` 字段），不版本化
工作流文档——二者生命周期不同步，特此明示。

### 5.5 `edgeRules`：继承与覆盖

```ts
edgeRules: { inherits: 'default' }   // 可省略，缺省即 default
```

预留覆盖位（未启用）：`{ overrides: { multiInbound: false } }`——如未来 PTY 终端
节点要求输入端口独占。**本预留位是全部预留位中唯一会改变交互行为者**（拒绝第二
条入边），启用须完整走宪法第 3 条（ADR + 用户批准 + 同迭代重录 golden），**不得
与 schema 新增字段混在同一变更内**；且方向规则的 enforcement 在调用点
（`app.js:1530-1531`），覆盖生效的实现落点据此确定。

## 6. 参数规范

### 6.1 widget × default 契约矩阵

现行全集五种 widget 冻结：`text | textarea | number | combo | toggle`。**协议
不得比现行 `types.ts:16-21` 更松**：

| widget | default 类型 | 附加约束 |
| --- | --- | --- |
| `text` / `textarea` | `string` | — |
| `combo` | `string` | `options.length ≥ 1` 且 `default ∈ options[].value` |
| `number` | `number` | 提供 min/max/step 时：`min ≤ default ≤ max` 且 `step > 0` |
| `toggle` | `boolean` | — |

扩展预留（未启用；启用即触 UI 走修宪，与 BK-9006 对齐）：`model`、`node-ref`
（取值形状待 BK-0017 SPEC 定义）、`path`、`json`。**新增 widget 必须同步定义
取值形状，否则不得进 schema。**

### 6.2 `visibleIf` DSL（条件显式）

```ts
visibleIf: { param: 'mode', equals: '定时触发' }
```

- v0.2 仅支持单条件 `{ param, equals }`；`notEquals` / 组合（`all: []`）预留；
- `param` 必须指向**同一节点**的既有参数 id（schema `superRefine` 校验）；
- `equals` 语义为 `===`，比较**引用 value**（§4.3），且比较前先与参数默认值
  合并（`app.js:193-197` `paramsOf` / `engine.ts:38` 的既有兜底语义）；
- 聚合层将 DSL **编译**为现行 `if(p => ...)` 函数挂上 `NODES[type].params[]`——
  `if` 是编译产物、不属于节点数据模块，故不违反 §2.3。等价性口径是**行为等价**
  （编译产物是函数对象，「逐字等价」不可验证）：对每个 `visibleIf` 以
  `{默认值}` / `{equals 值}` / `{其他值}` 三组入参断言布尔结果，与迁移前逐一对
  比。`if` 的唯一消费点是 `app.js:763`（现状零测试覆盖），该落点须纳入验收。

### 6.3 `runtimeOverridable`（文档侧先行，实现侧单独立项）

现行事实：`llm.model` 的 `options` 在运行期被 `/api/health` 返回的
`provider.models` 覆写（`app.js:2048`，启动序列 `:2414` 主动探测）。协议裁决：

1. 标注 `runtimeOverridable: true` 的 combo，schema **加载期**仍按
   `default ∈ options[].value` 校验，但**不保证**运行期替换后仍成立；
2. **覆盖方义务**：替换 options 的一方必须同步校正取值，维持不变量
   「UI 显示值 === 实际存值」；现行实现未履行（`app.js:2051` 仅重渲染不修正
   `n.params.model`）——属**实现缺陷**，修正单独立项走需批准区（触 UI），**不在
   BK-0021 内修**（否则「零漂移」被击穿）；
3. 不变量可断言形态：`options.includes(当前值) || 已校正为 options[0]`。

### 6.4 参数实现状态（`implemented`，v0.2 新增）

实测现行 33 个已定义参数中 **5 个无任何代码读取**（僵尸参数）：`trigger.mode /
cron / path`、`userinput.vtype / req`——`handlers.ts:18-20` 的 `trigger` 签名
`async trigger(ctx)` **不取参数对象**，`out` 硬编码「手动触发」；`userinput` 只读
`p.var / p.defv`。处置：

- **协议不虚构行为**（原则由能力维度扩域到参数维度）：已声明但未接入实现的参数
  必须标 `implemented: false`，**不得以「必填字段 + visibleIf」的形式呈现为已实现
  功能**；
- 迁移**不得**删除或改造这 5 个参数（触 UI，走修宪通道），只标 `implemented:
  false` + README「现状备注」注明「UI-only，后端未接入」；
- `implemented: false` 由聚合层**静默丢弃**（不进 `NODES` 输出——`params[]` 键集
  零漂移），仅供目录内可读性与未来治理决策使用。

### 6.5 schema 层完整性约束（`superRefine` 清单）

1. `params[].id` 节点内唯一；
2. `visibleIf.param` 指向存在的参数 id；
3. `binding.handler` 非空字符串；
4. combo / number 约束（§6.1 矩阵）；
5. **schema 一律 `.strict()`**——未知键报错并指明路径（zod v3 默认 strip 会把
   `keywords` 拼成 `keyword` 静默丢弃，这是 16 份手写数据下最高频事故）。

## 7. 能力接入协议（Capability Binding）

### 7.1 handler 绑定

`binding.handler` 声明该节点在 server 侧的实现锚点——**`HANDLERS` 定义于
`apps/server/src/engine.ts:26`**（= `handlers.ts:13` 的 `BASIC_HANDLERS` +
`llm.ts` 的 `llmHandler`）；`handlers.ts` 里只有 `BASIC_HANDLERS`，实现文件位置
（handlers.ts / llm.ts）是实现细节、不进协议。既有契约**三条**
（`handlers-coverage.test.mjs:25/28/31`，全部保留）：

1. HANDLERS 键集 ⊇ NODES 键集（缺绑定 = 定义不完整，契约测试红）；
2. 每个 HANDLERS 键必须是函数；
3. 额外键只允许 `__pass`（engine 内部回退专用）——**先加 handler 后加节点
   （如 T4 的 `agent`）会让测试直接变红，这是设计行为，不要误判为测试错误而
   放宽**。

### 7.2 能力类别与强制护栏

核心 kind（有护栏义务）：

| kind | 含义 | 强制护栏 | enforcement | 依据 |
| --- | --- | --- | --- | --- |
| `llm` | 大模型调用 | 温度/token 上限由参数约束；密钥只进环境变量 | 契约测试（参数矩阵）+ review | AGENTS.md 已知陷阱 |
| `exec` | 命令 / 代码执行 | `{mode:'sandboxed'}`：必须子进程 + 超时；文件操作限沙箱根 | review（反向扫描为后续增强，见下） | AGENTS.md 硬性约定 3 |
| `net` | 网络请求（出站） | `{mode:'guarded'}`：出站必须走 `guard.ts`（SSRF） | review（同上） | AGENTS.md 硬性约定 3 |
| `fs` | 文件读写 | 限沙箱根（协议常量 `apps/server/sandbox/`），路径穿越防护 | review（同上） | AGENTS.md 硬性约定 3 |
| `human` | 人工 / 他审介入 | 挂起-恢复语义（approval + `/run/:id/approve`） | review | 本协议首次成文 |
| `data` | 纯数据变换 | 无 IO | 契约测试（无 IO 断言） | 本协议首次成文 |

扩展 kind（预留·未启用）：`mcp` / `skills`（现状 `caps` 的正式化，§7.3）、
`agent`（BK-9002）、`ingress`（入站触发，与出站 `net` 区分——Webhook 模式的
trigger 未来若实装属此 kind，护栏：路径白名单 + 签名校验）。

**值形态统一**：`boolean`（如 `llm: true`）或 `{mode, ...}`（如
`exec: {mode:'sandboxed'}`）二选一，**取消裸字符串枚举**；schema `.strict()` +
未知 kind 拒绝。`requiresApproval` 是门控策略而非能力类别，位于 `binding` 顶层。

enforcement 诚实声明：schema 验的是声明形状，**验不出 handler 是否真调
`guard.ts`**。「反向扫描契约测试」（扫源码 `fetch(` / `child_process` / `fs`
与能力声明比对）方向正确，但 `guard.ts` / `tools.ts` 自身即这些符号的合法消费者，
直接扫必误报，需白名单机制——**列为 BK-0021 后续增强，首批 enforcement = 表中
所列（review + 局部契约）**。

工具级 stub（sqlite / browser，`tools.ts` 的 null 实现）是 **MCP 工具层**状态
（BK-0008/0009），不是节点能力——节点 `capabilities` 不表达工具级 stub 状态，
此类现状写入各节点 README「现状备注」。

### 7.3 能力扩展位（预留·未启用，T5 消费）

```ts
capabilities: {
  mcp:   { toolSelection: 'user' },            // 'user'（现状勾选注入）| 'auto'（BK-0013 预留）
  skills: true,
  agent: { sessionMode: 'goal' },              // BK-9002 批准后启用
}
// binding.requiresApproval: 'on-sensitive-tool'   // BK-0017 / BK-9005 消费
```

**单一语义单一事实源**（裁决判据）：**用户可调 → `params`；引擎策略 / 不可调
约束 → `capabilities`**。同一语义不得两处定义（v0.1 草案曾让 `maxSteps` 同时
出现在 capabilities=128 与 params=32，v0.2 已修正：capabilities 只留
`sessionMode`，`maxSteps` 留 params）；确需两处时须声明优先级（params 覆盖
capabilities）。

**以上扩展位仅是协议占位**：启用任何一项若伴随新节点/新参数/新交互，仍走
`needs-approval` 修宪通道；纯引擎行为（如 `auto` 注入）按 POLICY 对应区域处理。
**原则总纲：协议不虚构行为**——`capabilities` 与 `params` 两个维度同受约束
（§6.4、§7.2 stub 条）。

## 8. 每节点 `README.md`（由 node.ts 生成，禁止手写漂移）

「端口」「参数」两表由 `node.ts` **生成**，契约测试断言与源数据一致（手写即
新造一份副本，违反 §2.1）。人工可写的部分是「能力与护栏」引注与「现状备注」：

```markdown
# <identity.name>（`<type>`）

一句话用途（= identity.description）。           ← 生成

## 端口                                          ← 生成（含 append-only 顺序号）
## 参数                                          ← 生成（含 implemented 状态）
## 能力与护栏                                    ← 生成骨架 + 人工引注 §7.2 条目
## 现状备注                                      ← 人工维护
（例：本节点 3 个参数 UI-only 后端未接入（implemented:false）；
  sqlite 工具未接入如实降级——见 iterations/0009/REPORT.md）
```

## 9. 典型模板（四例）

### T1 · 纯数据节点（最小骨架：`delay`）

```ts
export default {
  protocol: 1,
  type: 'delay',
  identity: { name: '延时等待', category: 'logic', icon: 'timer',
    keywords: 'delay wait sleep 等待 延时',
    description: '等待指定时间后继续执行。' },
  ports: {
    inputs:  [{ id: 'in-any',  label: '输入', type: 'any' }],
    outputs: [{ id: 'out-any', label: '输出', type: 'any' }],
  },
  params: [
    { id: 's', label: '等待 (秒)', widget: 'number',
      default: 2, min: 1, max: 60, step: 1 },
  ],
  binding: { handler: 'delay', capabilities: { data: true } },
} satisfies NodeDefJson;
```

要点：无能力复杂度、直通端口（any→any）、单 number 参数——新节点从这骨架起步。

### T2 · 条件参数输入节点（`trigger`）——含僵尸参数如实标注

```ts
export default {
  protocol: 1,
  type: 'trigger',
  identity: { name: '触发器', category: 'input', icon: 'zap',
    keywords: 'trigger start 开始 入口 启动',
    description: '工作流执行入口，支持手动 / 定时 / Webhook 触发。' },
  ports: {
    inputs: [],
    outputs: [{ id: 'out-start', label: '开始', type: 'any' }],
  },
  params: [
    { id: 'mode', label: '触发方式', widget: 'combo',
      options: [
        { value: '手动触发', label: '手动触发' },
        { value: '定时触发', label: '定时触发' },
        { value: 'Webhook',  label: 'Webhook' },
      ], default: '手动触发', implemented: false },
    { id: 'cron', label: 'Cron 表达式', widget: 'text', default: '0 9 * * 1-5',
      visibleIf: { param: 'mode', equals: '定时触发' }, implemented: false },
    { id: 'path', label: 'Webhook 路径', widget: 'text', default: '/api/run',
      visibleIf: { param: 'mode', equals: 'Webhook' }, implemented: false },
  ],
  binding: { handler: 'trigger', capabilities: {} },
} satisfies NodeDefJson;
```

要点：空输入端口（入口节点）；三个参数均为 UI-only（后端未接入，handler 不读
参数、输出硬编码「手动触发」）——`implemented: false` 如实标注，聚合层静默丢弃
该标注；`capabilities: {}`（handler 无任何 IO；Webhook **入站**触发若未来实装属
扩展 kind `ingress`，非出站 `net`）。

### T3 · 能力绑定节点（最典型：`llm`）

```ts
export default {
  protocol: 1,
  type: 'llm',
  identity: { name: 'LLM 对话', category: 'chat', icon: 'bot',
    keywords: 'llm gpt 大模型 对话 chat glm 生成',
    description: '调用大语言模型生成回复，可注入提示词与上下文。' },
  ports: {
    inputs: [
      { id: 'in-prompt', label: '提示词', type: 'text' },
      { id: 'in-ctx',    label: '上下文', type: 'any' },
    ],
    outputs: [{ id: 'out-reply', label: '回复', type: 'text' }],
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
      default: '你是智能客服助手，回答需准确、简洁、友好。' },
    { id: 'temp', label: '温度', widget: 'number',
      default: 0.7, min: 0, max: 2, step: 0.1 },
    { id: 'max', label: '最大 Tokens', widget: 'number',
      default: 2048, min: 64, max: 32768, step: 64 },
  ],
  binding: {
    handler: 'llm',
    capabilities: { llm: true, mcp: { toolSelection: 'user' }, skills: true },
  },
} satisfies NodeDefJson;
```

要点：多输入端口（text + any）、五类控件齐备（缺 toggle，见 T2 同理）、
`runtimeOverridable` 标注 model（`app.js:2048` 运行期覆写）——**大多数能力节点
照此模板写**。

### T4 · 前瞻草案（`agent`，goal 模式）——仅为协议承载力示例

> ⚠️ 本模板对应 BK-9002（needs-approval issue #2），**未获批准前不落地**。
> `identity.status: 'proposed'` 使其不进聚合层收集（§4.1）；`node-ref` widget
> 的取值形状待 BK-0017 SPEC 定义，本模板不展示（避免「说了但没做」的示例）。

```ts
export default {
  protocol: 1,
  type: 'agent',
  identity: { name: '通用智能体', category: 'chat', icon: 'sparkles',
    keywords: 'agent 智能体 goal 会话 自主',
    description: 'goal 模式智能体：自主循环 + 持久会话，可点开进入流式会话面板。',
    status: 'proposed' },
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
      options: [{ value: 'GLM-4.7', label: 'GLM-4.7' },
                { value: 'DeepSeek-V4', label: 'DeepSeek-V4' }],
      default: 'GLM-4.7' },
    { id: 'sys', label: '系统提示词', widget: 'textarea',
      default: '你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。' },
    { id: 'maxSteps', label: '最大步数', widget: 'number',
      default: 32, min: 1, max: 256, step: 1 },
  ],
  binding: {
    handler: 'agent',
    requiresApproval: 'on-sensitive-tool',
    capabilities: {
      llm: true,
      mcp: { toolSelection: 'user' },
      skills: true,
      exec: { mode: 'sandboxed' },
      net: { mode: 'guarded' },
      agent: { sessionMode: 'goal' },
    },
  },
} satisfies NodeDefJson;
```

## 10. 迁移路线（BK-0021）

**四步落地，每步跑 `npm test -w packages/shared` + `npm test -w apps/server`；
契约测试分步新增（先加一条会失败的断言，再改代码）：**

1. **schema 先行**：`nodes.schema.ts`（zod `.strict()` + §6.5 `superRefine`
   清单全量）；
2. **加载机制**：每目录 `node.ts` 数据模块 + 聚合层显式静态 import；契约测试
   断言「目录数 = NODES 键数」；
3. **聚合层反向合成**：caps 顺序与单复数（§4.2）、`if` 编译（§6.2）、`kw` /
   `min·max·step` 处置；导出面逐字保留；
4. **试点 2 节点（`delay` + `trigger`，覆盖 T1/T2 形态）→ 全量 16 节点 + 各目录
   生成 README**。

**守卫测试（与 BK-0021 同批落地，POLICY 自主区）**：参数键名 ↔ handler 引用
一致性——静态提取 `apps/server/src/{handlers,llm}.ts` 与 `engine.ts` 中所有
`p.<key>`，按所在 handler 归属节点类型，断言键存在于 `NODES[type].params[].k`；
反向对「注册表有、无 handler 引用」的键 warn（僵尸参数显形）。

**验收标准**：

1. **全量结构快照**：迁移前生成 `JSON.stringify(NODES, null, 2)`（键序原样、
   不排序）入库，迁移后逐字节比对——覆盖 `desc / kw / caps 值 / min·max·step /
   端口内容` 等现行契约测试未断言的字段（现行 `contract.test.mjs:12-19` 对
   `name/icon` 仅 truthy，`icon` 拼错也绿）；
2. **`if` 行为探针**：每个 `visibleIf` 三组入参与迁移前布尔一致（§6.2）；
3. **两数分开**：**33 个已定义参数**（键集与默认值逐字节等价）+ **28 个已实现
   参数**（键名与 handler 引用集合一致，守卫测试）；「33」是结构信号不是质量
   信号，未来清理僵尸参数改「已实现数」不动「总数」；
4. **契约测试全绿**（四个文件：`packages/shared/test/` 的 `contract.test.mjs` /
   `defs-drift.test.mjs` / `events-negative.test.mjs` / `handlers-coverage.
   test.mjs`，零改动通过）；
5. **`npm run gate` 全绿**——证明力边界如实标注：gate 是纯静态托管（无 `/api`
   代理），只证明静态态渲染一致，**对依赖后端的分支无证明力**；
6. **在线态人工 E2E（不可替代）**：`npm start` 起后端 → 打开 LLM 节点属性面板
   → 确认模型下拉被后端清单覆写（`app.js:2048` 路径真实执行）、当前取值仍在
   options 内、控制台无 TypeError；
7. **`app.js:2048` 三重耦合逐字不动**：`DEFS.llm.params[0].o` 的 type 字面量 +
   数组下标 + 旧键名；聚合层导出对象**不得 `Object.freeze`**（该字段运行期可写
   是现状行为）；
8. **§11 散落点核对表**逐项勾验（收藏夹硬编码、RUN_META 等不因迁移失效）；
9. **POLICY 从严条款**：实现轮先开 `needs-approval` issue 附等价性证据（快照
   diff 为空 + gate diffPx=0 + 在线 E2E 记录）请求确认后合入。

## 11. 节点生命周期（新增章节）

### 11.1 节点知识散落核对表（8 处，迁移与变更必查）

| 侧 | 位置 | 内容 | 危险点 | 守护现状 |
| --- | --- | --- | --- | --- |
| 前端 | `app.js:2048` | 运行期写 `DEFS.llm.params[0].o` | type 键+下标+旧键三重耦合 | 无（gate 测不到，§10.6） |
| 前端 | `app.js:193-197` | `paramsOf()` | `paramDefaultsOf` 的第二份实现 | 无（迁移期不改写；改造触 UI 另立） |
| 前端 | `app.js:1859-1876` | `RUN_META`（16 键模拟执行表） | `\|\|{dur:600,...}` 静默回退 | 无 |
| 前端 | `app.js:103-114` | `MCP_SERVERS` | 与 DEFS `caps` 无契约关联 | 无 |
| 前端 | `app.js:178` | 收藏夹硬编码 `['llm','retrieval','condition']` | 写 localStorage | 无 |
| 后端 | `engine.ts:128` | `n.type==='condition'` + `p.expr` | cond 事件唯一发射点 | 无 |
| 后端 | `engine.ts:23-24` | `DEFS_META = NODE_NAMES` | `:21-22` 自注 `meta.name` 恒 undefined | 无 |
| 后端 | `handlers.ts` + `llm.ts` | 34 行 / 37 处 `p.<key>` / 23 键 | 改名静默失效 | 守卫测试随 BK-0021 补上 |

### 11.2 变更核对流程

- **新增节点**：目录 + node.ts → schema 校验 → handler 绑定（契约 ① 红→绿）→
  修宪通道（新节点触 UI）→ README 生成 → §11.1 表核对；
- **重命名 type / 参数键**：全仓同步（§4.2 反向合成第二点），§11.1 逐项核对；
- **删除端口 / 参数**：major + ADR + 迁移脚本（§5.3）；
- **弃用**：`identity.status: 'deprecated'` + README 注记；物理移除另走 major。

## 12. 与进化工作流的关系

- 本规范承载项：BK-0021（refactor，触UI=否）；**BK-0021 是 BK-9002~9006 的协议
  前置**（已在 ROADMAP T5-M3 登记）；
- §7.3 扩展位消费方：BK-0013/0015/0016/0017（引擎行为）与 BK-9002~9006（UI
  修宪通道）；
- 本文件修订：minor（新增可选字段/模板）由 SPEC 评审即可；major（字段语义、
  连线规则、端口顺序）需 ADR + 用户批准。
