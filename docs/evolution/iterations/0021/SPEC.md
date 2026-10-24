# SPEC · 迭代 0021 · BK-0021 批次 1 技术规格（NDP 目录制迁移：schema + 加载 + 合成 + 8 目录 + 常驻快照 + 守卫测试）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 20:40
> 权威顺位：`CONSTITUTION.md` > `AGENTS.md` > WORKFLOW > POLICY > NDP v0.2
> （`docs/node-definition-protocol.md`）> 实施轮 SPEC
> （`docs/node-definition-protocol-migration-spec.md`，下称「迁移 SPEC」）> 本文件 > PRD。
> 授权链：issue#11 用户批复在案（PRD 头部；授权面 = 迁移 SPEC 附录 A ①存储形式重组·
> 内容零漂移；③BK-0023 随批增量留批次 2 终轮，本轮零触碰）。**非修宪轮**：全程禁
> `npm run gate:update`，golden 零接触。
> 新架构决策：**无**（needsAdr=false）——目录制/加载机制/两批拆分均已由 NDP v0.2
> （用户会话批准）+ 迁移 SPEC + issue#11 批复链定案；本文件是批次 1 的实施展开，
> 不引入新选型。与上游文档的四处偏差勘误见 §10。

## 1. 范围与不变式（继承迁移 SPEC §1，批次 1 边界）

**做**：迁移 SPEC §3 步一~步四的批次 1 段 + §5 验收子集 1/2/3/4/5/7/8 + §6 守卫测试。
**不做**（批次 2 / 终轮）：余 8 目录、README 生成器与 16 份 README、「内联残留=0」
终态断言、§5.6 在线态 E2E 五点位、BK-0023 events.ts:32 注释、issue#11 回执。

四不变式逐条生效（迁移 SPEC §1 原文继承）：

- **A 内容零漂移**：批次 1 完成后 `NODES` 运行时输出与 `packages/shared/test/
  nodes.baseline.json`（11521 字节，sha256 `08ba1229…f275`，`.gitattributes` 钉死 LF）
  逐字节等价——**对 16 键全量生效**（含未迁移 8 键）。
- **B 导出面逐字保留**：`nodes.ts` 对外仍且仅导出 `NODES / NODE_NAMES /
  paramDefaultsOf`；`src/index.ts` **零改动**（公共 API 面不变，见 §2）。
- **C 顺序即契约**：16 键序、`ports[]`/`params[]` 数组顺序逐字搬运（存量边按端口
  索引寻址，`engine.ts:74`）。
- **D 波及面**：`apps/**`、`tools/**`（含 pixel-gate）、`.github/**`、根 package.json
  与 lock 零改动；新增文件仅 `packages/shared/**`（清单见 §7）。

## 2. 目标形态与模块边界（批次 1 完成时）

```
packages/shared/src/
  nodes.ts            聚合层（改造）：加载期校验 + 反向合成 + 8 目录装配 + 余 8 键内联
                      + 派生层（NODE_NAMES / paramDefaultsOf，:109-119 逻辑不动）
  nodes.schema.ts     新增：NDP zod schema（.strict() + superRefine）+ NodeDefJson 类型
  nodes/
    trigger/node.ts   新增 ×8（delay/trigger/llm/userinput/code/retrieval/condition/http）
    ...               纯数据模块：export default {…} satisfies NodeDefJson
  index.ts            零改动（仍只 export types/nodes/events 三模块）
```

各文件边界（import 规则，tsc 强制 + 测试守护）：

| 文件 | 允许 import | 禁止 |
| --- | --- | --- |
| `nodes.schema.ts` | 仅 `zod`（shared 既有依赖 ^3.24.0，实装 3.25.76，零新增） | import 任何节点数据 / types.js / zod 以外的一切 |
| `nodes/<type>/node.ts` | 仅 `import type { NodeDefJson } from '../nodes.schema.js'`（type-only，运行时零依赖） | 任何运行时 import、副作用、函数字面量（NDP §2.3） |
| `nodes.ts` | `types.js`（NodeDef 类型）、`nodes.schema.js`、8 × `./nodes/<type>/node.js` | 其他一切；除三导出外不得再导出（synthesize/loadJsonDef 一律私有） |
| `apps/**` | 只经 `@agentflow/shared` 包根（exports map 仅 `"."`，子路径机械不可达） | 直接 import `nodes/<type>/node.js` 或 `nodes.schema.js`（NDP §2.5，测试断言见 §6.2） |

**index.ts 不动的设计裁决**：`NodeDefSchema` 不从包根 re-export——schema 测试与
node.ts 均以内部相对路径消费（测试走 `../dist/nodes.schema.js`）。理由：公共导出面
零漂移的最强形式（invariant B 不止约束 nodes.ts，也约束包 API 面）；zod 已在
events.ts:6 进入依赖图，schema 不经包根暴露不损失任何能力。tsc 构建事实
（`packages/shared/tsconfig.json`：rootDir=src、outDir=dist、include=src）保证
`dist/nodes/<type>/node.js` 与 `dist/nodes.schema.js` 随构建产出，运行时
ESM 显式 `.js` 后缀寻径与既有 `index.ts` → `'./types.js'` 同款。

## 3. `nodes.schema.ts` 技术设计（≤300 行，估 220–260）

zod v3（`.strictObject` / `discriminatedUnion` / `superRefine`），形状按 NDP §4
字段总表：

- **枚举冻结**：`PortType = ['any','text','list','object','number']`（NDP §5.1 五种）；
  `Widget = ['text','textarea','number','combo','toggle']`（§6.1 五种）；
  `Category = ['input','chat','knowledge','tools','logic','output','human']`。
- **对象形状**（一律 `.strictObject`，未知键报错并指明路径——NDP §6.5 规则 ⑤，
  典型事故 `keywords` 拼成 `keyword`）：
  - `PortJson { id, label, type }`：id 满足前缀规则（inputs `/^in-/`、outputs
    `/^out-/`，字符集 `[a-z][a-z0-9-]`、总长 ≤32，NDP §5.3）；
  - `OptionJson { value: string≥1, label: string≥1 }`；
  - `ParamJson`：按 `widget` discriminatedUnion——`text`/`textarea`/`toggle`/
    `number`/`combo` 五支，公共字段 `id/label` + 各自 `default` 类型（string/
    string/boolean/number/string），可选 `min/max/step`（number 支）、`options`
    （combo 支，≥1）、`visibleIf { param, equals }`、`implemented?: boolean`、
    `runtimeOverridable?: boolean`（NDP §4.1）；
  - `NodeDefJson`：`protocol?: int（default 1）`、`type: string`、`identity
    { name, category, icon, keywords, description, appearance?(预留 z.unknown()),
    status?(enum active|proposed|deprecated，预留) }`、`ports { inputs[], outputs[] }`、
    `params[]`、`edgeRules?（预留 z.unknown()）`、`binding { handler: string,
    requiresApproval?(预留), capabilities（strictObject，值 = boolean | strictObject
    二选一，NDP §7.2「取消裸字符串枚举」） }`。
- **superRefine 六规则**（NDP §6.5 五条全量 + 增补一条，增补依据见 §10-④）：
  ① `params[].id` 节点内唯一；② `visibleIf.param` 指向同节点存在参数 id；
  ③ `binding.handler` 非空串；④ combo `default ∈ options[].value`；number 提供
  min/max/step 时 `min ≤ default ≤ max` 且 `step > 0`；⑤ `.strict()` 全体（结构性，
  非 refine 体）；⑥ **端口 id 节点内唯一**（inputs+outputs 合计，NDP §5.3
  「节点内唯一」Critical 条款的 schema 落点）。
- **导出**：`NodeDefSchema` + `export type NodeDefJson = z.infer<typeof NodeDefSchema>`
  （可另导出 Port/Option/Param 子类型供 node.ts 书写提示；不导出任何运行时函数
  除 schema 本体）。
- **预留字段裁决**（NDP §4.1 统一裁决）：`appearance / status / edgeRules /
  requiresApproval` 以可选 + 不定义内形（z.unknown）进 schema；**聚合层批次 1
  忽略其值**——忽略本身是内容零漂移的一部分。`identity.status` 的「非 proposed
  不收集」过滤在 status 首次被使用（T4/agent 时代）前不启用。

## 4. 聚合层 `nodes.ts` 技术设计（≤250 行，估 160–200）

改造后结构（自上而下）：

1. **8 静态 import**：`import delayDef from './nodes/delay/node.js'` 等 ×8（.js
   后缀，ESM 显式）。
2. **加载期校验** `loadJsonDef(raw: unknown): NodeDefJson`：`NodeDefSchema.
   safeParse(raw)`，失败即 `throw`（错误信息含节点 type 与 zod issue 路径）——
   NDP §3「加载期校验每个节点定义」。模块初始化期执行、每进程一次、8 次解析，
   开销可忽略；zod 已在包依赖图内（§2）。**只校验 8 个已迁移目录定义**；余 8
   内联键为旧形状，批次 1 不对其跑 NodeDefSchema（批次 2 迁移后自然全覆盖）。
3. **反向合成** `synthesize(def: NodeDefJson): NodeDef`（迁移 SPEC §3.3 + NDP
   §4.2 两个必踩点）。字段映射与**输出键插入序定死**（键序由基线逐字节等价倒逼，
   本会话对基线实测：16 节点键序 = `name,cat,icon,desc,inputs,outputs,params,kw`，
   唯 llm/code 两键在 icon 与 desc 之间插 `caps`）：

   | 新（NodeDefJson） | 旧（NodeDef 输出） | 输出键序约束 |
   | --- | --- | --- |
   | `identity.name/category/icon/description/keywords` | `name/cat/icon/desc/kw` | 按左序列 |
   | `binding.capabilities.mcp` 真值 且/或 `.skills` 真值 | `caps`：固定序 `['mcp','skill']` 先 mcp 后 skill，按存在过滤；两者皆无 → **整键省略**（14 节点无 caps 的复现条件） | 紧跟 `icon` 后、`desc` 前 |
   | `ports.inputs[].label/type`（id 丢弃） | `inputs[].n/.t` | 数组序逐字搬运 |
   | `ports.outputs[].label/type` | `outputs[].n/.t` | 同上 |
   | `params[].id/label/widget` | `k/l/t` | 前三键恒序 |
   | `params[].options[].label`（value≡label 迁移期） | `o`（label 序列） | combo：`k,l,t,o,d` |
   | `params[].default` | `d` | text/textarea/toggle：`k,l,t,d` |
   | `params[].min/max/step` | 同名，**各自仅提供时输出** | number：`k,l,t,d,min,max,step` |
   | `visibleIf {param,equals}` | `if: p => p[param] === equals`（编译产物） | 尾键（`…,d,if`；不可序列化，键序对快照不可观测，按现行源码形态放置） |
   | `implemented / runtimeOverridable / protocol / type / edgeRules / binding / identity.status·appearance` | **不进输出** | — |

   **关键澄清（实现最易翻车点）**：`implemented: false` 被静默丢弃的是**标注字段**，
   不是参数本身——trigger 的 mode/cron/path 与 userinput 的 vtype/req 四参数
   （trigger.mode 亦标）原样保留在 `NODES` 输出中。依据：NDP §6.4「`params[]`
   键集零漂移」+ 既有 `defs-drift.test.mjs:13-14` 期望表（trigger 三键、userinput
   四键）零改动必须全绿；若误删参数，33/33 断言与快照比对同时红。
4. **NODES 装配**：对象字面量 16 键按现行声明序（trigger, userinput, llm, prompt,
   retrieval, websearch, http, code, notify, condition, loop, delay, merge, reply,
   setvar, approval）——8 键 = `synthesize(loadJsonDef(xDef))`，8 键 = 现行内联
   字面量逐字保留（prompt/websearch/notify/loop/merge/reply/setvar/approval，
   即 `nodes.ts:33-37/:45-50/:64-69/:75-80/:86-90/:91-95/:96-100/:101-106`）。
   TS 对象字面量重复键报 TS1117，天然防「同键双定义」。
5. **派生层不动**：`NODE_NAMES` / `paramDefaultsOf`（现行 `nodes.ts:109-119`）
   逻辑逐字保留。

## 5. 8 目录 `node.ts` 数据规格（每份 ≤60 行）

通用规则：`export default { protocol: 1, type: <目录名>, identity{5 字段逐字取自
现行 DEFS}, ports{带新 id}, params{id≡现行 k，label/widget/default/min/max/step
逐字取自现行 DEFS}, binding } satisfies NodeDefJson`。identity 与参数文案为
`nodes.ts:10-106` 的机械转写，下表只列**新增/标注信息**（端口 id 一次性定稿，
一经发布即冻结，NDP §5.3；capabilities 依据 = handler 实况，非 mcp/skills 类
kind 不进合成输出、仅作协议声明）：

| 节点（现行行） | ports.id（label→id） | params 标注（默认 = 机械转写） | binding.capabilities（依据） |
| --- | --- | --- | --- |
| trigger（:10-16，模板 T2） | out→`out-start` | mode `implemented:false`；cron `visibleIf{mode,'定时触发'}+implemented:false`；path `visibleIf{mode,'Webhook'}+implemented:false` | `{}`（handler 零 IO，handlers.ts:22-24） |
| userinput（:17-24） | out 值→`out-value` | vtype、req `implemented:false`（handler 只读 var/defv，handlers.ts:26-31） | `{data:true}` |
| llm（:25-32，模板 T3） | in 提示词→`in-prompt`、in 上下文→`in-ctx`、out 回复→`out-reply` | model `runtimeOverridable:true`（app.js:2055 覆写）；temp/max min·max·step 逐字 | `{llm:true, mcp:{toolSelection:'user'}, skills:true}`（T3 字面） |
| retrieval（:38-44） | in 查询→`in-query`、out 片段→`out-hits`（list 端口） | — | `{data:true}`（本地 TF-IDF，无出站） |
| http（:51-57） | in 请求体→`in-body`、out 响应→`out-response`（object 端口） | to（超时义）min1 max120 step1 | `{net:{mode:'guarded'}}`（guardedFetch+SSRF，handlers.ts:91） |
| code（:58-63） | in 输入→`in-input`、out 结果→`out-result` | code 默认值含 `\n` 换行（textarea） | `{exec:{mode:'sandboxed'}, mcp:{toolSelection:'user'}}`（子进程+超时，AGENTS 硬性约定 3；mcp 为 caps:['mcp'] 复现条件，nodes.ts:58） |
| condition（:70-74） | in 输入→`in-input`、out 真→`out-true`、out 假→`out-false`（双 outputs） | expr（engine.ts:128 耦合，id 逐字 `expr`） | `{data:true}`（纯表达式求值） |
| delay（:81-85，模板 T1） | in→`in-any`、out→`out-any` | s min1 max60 step1 | `{data:true}`（T1 字面） |

端口 id 已按 `^[a-z][a-z0-9-]{2,32}$` + in/out 前缀 + 节点内（inputs+outputs
合计）唯一校验通过（人工核对 + superRefine ⑥ 兜底）；跨节点同名（code 与
condition 同用 `in-input`）为 §5.3 明示允许。

## 6. 四个测试文件设计（`packages/shared/test/`，node --test，零新依赖）

### 6.1 `schema.test.mjs`（≤150 行）

- import：`import { NodeDefSchema } from '../dist/nodes.schema.js'`（**不经包根**，§2）。
- 正例 3：NDP §9 T1（delay 最小骨架）/ T2（trigger：visibleIf×2 + implemented×3 +
  空 inputs）/ T3（llm：combo 6 options + runtimeOverridable + number min/max/step +
  双 inputs）形状的最小可用 fixture，断言 `safeParse` 成功。
- 负例 6 类（PRD 定死）：①未知键（`keyword` 拼错典型）②combo default ∉ options
  值域 ③number default 越界（>max）④params[].id 重复 ⑤visibleIf.param 悬挂
  ⑥toggle default 非 boolean。每类断言 `safeParse` 失败且 issue 含可定位路径。
- 可选加验（预算内）：端口 id 前缀违例 / 端口 id 节点内重复（superRefine ⑥）。

### 6.2 `nodes-dirs.test.mjs`（≤100 行）

读 `src/nodes.ts` 源文本（先例 contract.test.mjs:66-68 读源）+ `readdir` 
`src/nodes/`（仅目录）：

1. **D===R**：源文本 `from './nodes/<dir>/node.js'` 提取集 D ≡ 目录名集 R
   （无漏 import / 无孤儿目录）；
2. **D ⊆ keys(NODES)**：import 的目录必是注册表键；
3. **批次 1 边界形态**：`keys(NODES) \ D`（内联残留集）恰等于批次 2 八键
   `['prompt','websearch','notify','loop','merge','reply','setvar','approval']`
   ——AC9 的机器化（批次 2 收尾把本断言收敛为「残留=0」，迁移 SPEC §3.2 终态）；
4. **引用边界**（NDP §2.5）：扫 `apps/web/src` + `apps/server/src` 全部源文本，
   断言不出现 `@agentflow/shared/dist/nodes/` 或 `nodes/<dir>/node` 直引模式
   （exports map 已机械挡包外子路径，本断言挡源码层模式回流）。

### 6.3 `synthesis.test.mjs`（≤180 行，含快照常驻比对）

1. **caps 序**：`deepEqual(NODES.llm.caps, ['mcp','skill'])` +
   `deepEqual(NODES.code.caps, ['mcp'])` + 其余 14 键 `'caps' in def === false`
   （无 caps 键的负存在断言）；
2. **if 六行真值表**（迁移 SPEC §5.2 表逐行）：`cron.if`/`path.if` ×
   {默认值, equals 值, 其他值}，且 `typeof … === 'function'`（AC2）；
3. **8 已迁移键 params[] 序**（不变式 C 的直接断言，与 defs-drift 的 .sort() 互补）：
   对 8 键逐节点 `deepEqual(NODES[t].params.map(p=>p.k), […现行声明序数组])`；
4. **快照常驻比对**（AC1，迁移 SPEC §5.1 推荐形态原文实现）：
   ```js
   const baseline = readFileSync(new URL('./nodes.baseline.json', import.meta.url)); // Buffer
   const actual = Buffer.from(JSON.stringify(NODES, null, 2) + '\n', 'utf8');
   assert.ok(actual.equals(baseline), /* 首异字节偏移 + 重生成指引 */);
   ```
   从 `../dist/index.js` import（与既有四测试同源）；覆盖 16 键全量；
5. **可写性常驻断言**（AC6）：`NODES.llm.params[0].o = ['x']` 赋值不抛 → 还原
   原值；并断言 `!Object.isFrozen(NODES) && !Object.isFrozen(NODES.llm)`
   （守护 app.js:2055 运行期覆写现状）。

### 6.4 `param-handler-guard.test.mjs`（≤200 行，迁移 SPEC §6 算法）

- **提取**：读 `apps/server/src/{handlers,llm}.ts` + `engine.ts` 源文本；逐行剥
  `//.*$` 后以 `/\bp\.([A-Za-z_]\w*)/g` 提取。
- **归属**：handlers.ts 按最近前导 `async <name>(` 方法项归属（箭头函数
  `async (`/`async ():` 无名不匹配，闭包内 `p.` 归属宿主 handler）；llm.ts 全文件
  归 `llm`；engine.ts 仅含 `n.type === 'condition'` 守卫的行归 `condition`
  （全文件唯一 `p.` 引用即 engine.ts:128，本会话 grep 实核）。
- **正向**：每个 (owner,key) ∈ `NODES[owner].params[].k`——改名即红（NDP §4.2
  必踩点 2）。owner 无任何提取键（如 trigger）合法，不产生正向项。
- **反向（精确断言）**：「NODES 有而无引用」键集合恰等于
  `[['trigger',['mode','cron','path']],['userinput',['vtype','req']]]`——新僵尸
  出现或旧僵尸被接通都红。
- **不硬编码**行数/处数/键数（NDP 记载 34 行/37 处/23 键会漂移）。
- **设计已验证**（本 SPEC 会话模拟实跑，node -e，2026-10-24）：按上述算法对
  现行三源文件提取——正向违例 **0**；僵尸清单**逐字相等**
  `[["trigger",["mode","cron","path"]],["userinput",["vtype","req"]]]`；
  总定义参数 33 / (owner,key) 引用 28 / 去重键 23，与 NDP §4.2/§6.4 三数一致；
  handler 归属 15 owner（trigger 零引用）。算法可行性非推测。

## 7. 受影响文件清单（= 产品提交白名单，AC9）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `packages/shared/src/nodes.schema.ts` | 新增 | ≤300（估 220–260） |
| `packages/shared/src/nodes.ts` | 改造为聚合层（8 import + 校验 + 合成 + 16 键装配；余 8 键暂内联） | ≤250（估 160–200） |
| `packages/shared/src/nodes/{delay,trigger,llm,userinput,code,retrieval,condition,http}/node.ts` | 新增 ×8 | ≤60/个 |
| `packages/shared/test/schema.test.mjs` | 新增 | ≤150 |
| `packages/shared/test/nodes-dirs.test.mjs` | 新增 | ≤100 |
| `packages/shared/test/synthesis.test.mjs`（含快照常驻比对 + 可写性断言） | 新增 | ≤180 |
| `packages/shared/test/param-handler-guard.test.mjs` | 新增 | ≤200 |

零改动白名单：`apps/**`、`tools/**`（含 pixel-gate）、`.github/**`、根
package.json 与 lock、`packages/shared/src/index.ts` 与 `events.ts`（BK-0023 留
终轮）、既有四测试文件（contract / defs-drift / events-negative /
handlers-coverage）、`packages/shared/test/nodes.baseline.json`（迁移前基线全程
不更新）。`docs/evolution/BACKLOG.md` 备注回写随归档提交（机制件），不计产品提交。

新文件 EOL 一律 LF、UTF-8 无 BOM；快照比对 Buffer 级 IO 免疫检出 EOL 事故
（叠加 `.gitattributes` 双保险）。

## 8. 验收口径（命令 + AC 映射 + E2E 点位）

**逐步验证命令**（每步红→绿收尾；注：上游迁移 SPEC 写的 `npm test -w
@agentflow/server` 在本仓不存在——apps/server/package.json 仅 build/start 两脚本，
本会话实核；以 `npm run build:server`（类型断链即红）+ 既有四测试所在包代替，
详见 §10-①）：

```
npm run build:shared && npm test -w @agentflow/shared && npm run build:server
```

**批次收尾门禁**（BUILD 出提交前 + VERIFY 复跑，四条全绿）：

| # | 命令 | 证明 |
| --- | --- | --- |
| 1 | `npm run build` | shared+web 构建通过（node.ts/schema 进 dist、web 打包零破） |
| 2 | `npm run gate` | 8 场景 diffPx=0（AC5；静态托管证明力边界如实——app.js:2055 在线分支留批次 2 §5.6 补证） |
| 3 | `npm test` | 根链 build:shared→build:server→shared 测试：既有 8 项 + 新增 4 文件全绿（AC4/AC8 前半） |
| 4 | `npm run smoke:server` | 后端 E2E 零回退、exit 0（AC8 后半；89 断言口径含 C01 动态浮动行） |

**手动 E2E 点位（批次 1 口径）**：① `npm run smoke:server` 全程通过（上表 4，脚
本化后端 E2E，为批次 1 唯一在线态执行面）；② VERIFY 一次性快照再生产对照：
`npm run build:shared` 后按迁移 SPEC §2 命令生成临时文件，`cmp` 与基线输出为空 +
sha256 一致（AC1 的 REPORT 证据形态）。NDP §10.6 五点位在线人工 E2E（⚡连接日志 /
LLM 模型下拉覆写 / 取值在 options 内 / 控制台零 TypeError / trigger cron 显隐）
**整体延后至批次 2 收尾**（PRD 不做清单明示；本轮以 AC6 apps 零 diff + 导出面
不变 + AC3 守卫的静态保证替代）。

**AC↔证明映射**：AC1→门禁 3 中 synthesis 快照断言 + 手动点位 ②；AC2→synthesis
②；AC3→guard 测试 + 门禁 3（33 计数由快照与 defs-drift 双保）；AC4→`git diff
--stat -- packages/shared/test/{contract,defs-drift,events-negative,handlers-coverage}.test.mjs`
输出空 + 门禁 3；AC5→门禁 1+2；AC6→`git diff -- apps/web` 为空 + synthesis ⑤；
AC7→AC6 静态保证 + §5.8 八指针逐条复核记录（现行指针 app.js:2055/:193-197/:334/
:763/:1866/:103/:178、engine.ts:128/:23-24，本会话 sed 逐行实核在位）；AC8→门禁
3+4；AC9→nodes-dirs 断言 3 + 提交内容 = §7 白名单（`git show --numstat` 复核）。

## 9. 风险与回滚（批次 1 特定，通则继承迁移 SPEC §8）

| 风险 | 对策（本 SPEC 落点） |
| --- | --- |
| 合成键序/形状偏差（caps 位置、min/max/step 丢失、options label 序） | §4 键序表定死 + AC1 Buffer 级比对（首异字节提示） |
| `implemented:false` 误删参数（击穿 33/33 与快照） | §4 关键澄清框 + defs-drift 零改动全绿即红 |
| `if` 编译语义漂移（快照不可见） | AC2 六行真值表；在线落点 app.js:763 留批次 2 |
| 误加 `Object.freeze` 破坏 app.js:2055 覆写 | synthesis ⑤ 可写性常驻断言 |
| 源文本提取器脆弱（模板串/注释假阳性） | §6.4 算法经本会话模拟实跑验证（正向 0 违例、僵尸清单逐字相等）；提取失败即测试红，不静默 |
| 批次边界失控（多迁/漏迁） | nodes-dirs 断言 3（残留集恰为批次 2 八键） |

回滚 = `git revert` 本迭代产品提交（唯一手段，禁 force/reset）；纯存储形式重组、
无数据迁移/依赖增减/env 变更；快照与常驻比对 revert 后仍绿（基线本就从原状生成）。

## 10. 与上游文档的偏差记录（SPEC 评审项，随迭代目录留档）

1. **`npm test -w @agentflow/server` 不存在**（迁移 SPEC §3 各步验证命令 /
   PRD「做」4 沿用）：apps/server/package.json scripts 仅 `build`/`start`（本会话
   实核）。替代：`npm run build:server`（tsc 类型断链即红）+ 根 `npm test` 链已含
   build:server。实质等价（server 侧无可跑测试脚本，类型检查 + 冒烟是其验证面）。
2. **快照比对落位**：迁移 SPEC §3.3 允许 synthesis.test.mjs 或独立
   nodes-snapshot.test.mjs 二选一；本 SPEC 定死前者（PRD 文件表口径，白名单不扩）。
3. **caps 断言扩展**：迁移 SPEC §3.3 仅示例 `NODES.llm.caps`；本 SPEC 增加 code
   `['mcp']` 与 14 键无 caps 负存在断言（批次 1 已含全部两个有 caps 节点）。
4. **superRefine 增第 ⑥ 条**（端口 id 节点内唯一）：NDP §6.5 清单五条之外，依据
   NDP §5.3 Critical 条款；不拒任何现行合法数据（§5 端口 id 表已人工核对唯一）。
5. **`identity.status` 过滤不启用**：NDP §4.1 状态行有「只收集非 proposed」表述，
   但同表将 status 标「预留·未启用」且统一裁决「聚合层 v0.1 必须忽略其值」——
   本 SPEC 按统一裁决执行（忽略），批次 1 无 proposed 节点，两读法行为等价。

---

**给 BUILD 的实施序**（迁移 SPEC §3 四步的批次 1 化）：schema.test.mjs 红 →
nodes.schema.ts 绿 → nodes-dirs.test.mjs 红 → delay/trigger 两目录 + 聚合层起步
绿 → synthesis.test.mjs 红（合成缺失即红）→ 合成函数绿 → 余 6 目录逐个迁移
（每目录一步，测试保持绿）→ guard 测试落盘绿 → §8 批次收尾门禁四条 → 恰一个
产品提交（Conventional Commits，如 `refactor(shared): BK-0021 批次1 NDP 目建制迁移——8 目录+schema+聚合层合成+常驻快照+守卫测试（内容零漂移）`）。
