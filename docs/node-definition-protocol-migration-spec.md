# BK-0021 实施轮 SPEC · NDP 节点定义目录制迁移（16 节点 → `src/nodes/<type>/`）

> 状态：**SPEC · 待 needs-approval issue 获批后进入实施（BK-0021），批准前零实现。**
> （needs-approval issue 已开 **#11**，正文见附录 A；草案在库 ≠ 开 issue ≠ 获批——三段分清。）
> 上游依据：NDP v0.2 `docs/node-definition-protocol.md`（§10 迁移四步与九条验收
> `:597-620`）· PRD `docs/evolution/iterations/0018/PRD.md`（BK-0031 三件先行产物
> 之二）· 等价基线快照已入库 `packages/shared/test/nodes.baseline.json`
> （11521 字节 = JSON 体 11520 + 末尾单换行；sha256
> `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275`；
> 根 `.gitattributes` 单行规则钉死检出/入库均 LF）。
> 权威顺位：CONSTITUTION > AGENTS > WORKFLOW > POLICY > NDP > 本 SPEC；
> 本 SPEC 与 NDP 冲突处以 NDP 为准。
> 产出角色：迭代 0018 BUILD（code-developer，BK-0031 REQ-0031-03/04）· 2026-10-24。

## 1. 范围与不变式

- **触 UI = 否**，但改动落 `packages/shared` 即入 POLICY 需批准区「shared DEFS 变更」
  射程（`docs/evolution/POLICY.md:23`）——依 NDP §10 验收 9 从严条款，先开
  needs-approval issue 附等价性证据（附录 A），获批后实施；获批后仍**非修宪轮**：
  UI 三层零接触、golden 零重录、全程禁 `npm run gate:update`。
- **不变式 A（内容零漂移）**：任一步/任一批完成后，`NODES` 运行时输出与基线快照
  逐字节等价（§5.1 常驻比对，两批之间也必须成立——迁移只是「存储形式重组」）。
- **不变式 B（导出面逐字保留）**：`nodes.ts` 聚合层对外仍且仅导出
  `NODES / NODE_NAMES / paramDefaultsOf`，签名与键结构不变（NDP §3）。
- **不变式 C（顺序即契约）**：16 键序、`ports[]` / `params[]` 数组顺序逐字搬运，
  零 append / 零删除 / 零重排（存量边按端口索引寻址，`engine.ts:74`）。
- **不变式 D（波及面）**：`apps/**`、`tools/pixel-gate/**`、`.github/**`、根
  `package.json` 零改动；新增文件仅 `packages/shared/**` 与 README 生成器
  `tools/gen-node-readmes.mjs`（位置为推荐值，实施轮 SPEC 评审可定稿调整）。

## 2. 基线快照：生成命令、字节规范与比对方法（已入库资产的使用说明）

- **生成命令（仓库根执行，本 SPEC 固化）**：
  ```sh
  npm run build:shared
  node -e "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > packages/shared/test/nodes.baseline.json
  ```
- **字节规范**：UTF-8 无 BOM；LF 行尾（全文件无 CR）；末尾恰一个换行；总长
  11521 字节（JSON 体 11520 + 1）；16 键、键序 = `nodes.ts:10-106` DEFS 声明序
  （trigger, userinput, llm, prompt, retrieval, websearch, http, code, notify,
  condition, loop, delay, merge, reply, setvar, approval）；无 `"if"` 键
  （`JSON.stringify` 丢弃函数值——证明力边界见 §7）。
- **EOL 钉死**：`.gitattributes` 仅一行
  `packages/shared/test/nodes.baseline.json text eol=lf`——本仓
  `core.autocrlf=true`，无此规则则重检出即 CRLF 化，逐字节比对必假红。
- **再生产比对（一次性命令，验收记录形态）**：生成到临时文件后
  `cmp <基线> <临时>` 须输出空 + sha256 一致（迭代 0018 BUILD 期已做，证据见
  `iterations/0018/JOURNAL.md`；BK-0021 实施轮 REPORT 复做一次）。
- **更新时机**：BK-0021 实施全程**不更新**（它是「迁移前基线」）；实施落地后转为
  常驻防漂移基线，此后任何经批准的 DEFS 变更须在同一提交内重生成快照并在
  ADR/issue 引用（否则常驻比对测试红 = 拦截未批漂移，设计行为）。

## 3. 四步实施方案（每步：文件面 / 契约测试红→绿 / 验证命令）

> 总原则（NDP §10）：契约测试**分步新增**——先加一条会失败的断言，再改代码；
> 每步收尾跑 `npm test -w @agentflow/shared && npm test -w @agentflow/server`。

### 3.1 步一 · schema 先行

- **文件面**：新增 `packages/shared/src/nodes.schema.ts`（zod `.strict()` +
  §6.5 superRefine 清单全量：①`params[].id` 节点内唯一 ②`visibleIf.param`
  指向存在参数 ③`binding.handler` 非空串 ④combo/number 约束（§6.1 矩阵：
  `default ∈ options[].value`；`min ≤ default ≤ max` 且 `step > 0`）
  ⑤一律 `.strict()` 拒未知键）；导出 `NodeDefJson` 类型 + `NodeDefSchema`。
  现有四测试文件零改动。
- **红→绿**：先写 `packages/shared/test/schema.test.mjs`——正例用 NDP §9 T1/T2/T3
  模板（delay/trigger/llm 形状）断言可解析；负例断言六类拒绝：未知键（含
  `keyword` 拼错典型）、combo 默认值 ∉ options、number 默认值越 [min,max]、
  参数 id 重复、visibleIf.param 悬挂、toggle 默认值非 boolean。schema 未落盘时
  import 失败即红；实现后绿。
- **验证命令**：`npm test -w @agentflow/shared`（新增 1 文件，既有 8 项全绿）。

### 3.2 步二 · 加载机制 + 试点 2 目录

- **文件面**：新增 `src/nodes/delay/node.ts`、`src/nodes/trigger/node.ts`
  （纯数据模块 `export default {…} satisfies NodeDefJson`，形状按 NDP §9 T1/T2）；
  `src/nodes.ts` 聚合层改造起步：静态 import 2 目录 + 其余 14 键暂保持内联定义。
- **红→绿**：先写 `packages/shared/test/nodes-dirs.test.mjs`——读
  `src/nodes.ts` 源文本（先例：`contract.test.mjs:66-68` 读 app.js 源），提取
  `./nodes/<dir>/node.js` import 集合 D 与 `nodes/` 目录 readdir 集合 R，断言
  `D === R`（无漏 import / 无孤儿目录）且 `D ⊆ Object.keys(NODES)`；终态追加
  断言「内联残留键 = 0」（§3.4 批次 2 收尾时启用，聚合层无多余导出）。试点未
  落盘时 R 为空 / D 为空交集断言即红。
- **验证命令**：`npm test -w @agentflow/shared && npm test -w @agentflow/server`。

### 3.3 步三 · 聚合层反向合成（NDP §4.2 两个必踩点）

- **文件面**：`src/nodes.ts` 聚合层内实现合成函数（新形状 → 现行旧键结构）：
  `identity.{name,category,icon,description,keywords}` → `name/cat/icon/desc/kw`；
  `ports` → `inputs[].n/.t`、`outputs[].n/.t`；`params[].{id,label,widget,
  options,default,min,max,step}` → `k/l/t/o/d/min/max/step`；`visibleIf` 编译为
  `if: p => p[visibleIf.param] === visibleIf.equals`；`capabilities` 合成 `caps`
  **固定 `['mcp','skill']` 先 mcp 后 skill、`skills`→`'skill'` 单数**
  （禁止按 `Object.keys` 枚举序合成；`app.js:334` 按数组序渲染能力 chip）；
  `implemented:false` 标注静默丢弃；`protocol/type/edgeRules/binding/
  runtimeOverridable` 不进输出；`options[].label` 序列输出为现行 `o`（迁移期
  value ≡ label，逐字节等价前提）。
- **红→绿**：先写 `packages/shared/test/synthesis.test.mjs`——①
  `assert.deepEqual(NODES.llm.caps, ['mcp','skill'])`；② trigger 两 `if` 探针
  真值表（§5.2 六行）；③ 试点 2 键 `params[].k` 键集与默认值零漂移；④
  **快照常驻比对**（§5.1 推荐形态）落位于本测试文件或独立
  `nodes-snapshot.test.mjs`——合成未实现时输出形状错即红，实现后全绿且此后
  永续防漂移。
- **验证命令**：`npm test -w @agentflow/shared && npm test -w @agentflow/server`。

### 3.4 步四 · 全量 16 目录 + README 生成（两批拆分见 §4）

- **文件面**：批次 1 迁移其余 6 目录（llm/userinput/code/retrieval/condition/
  http）→ 批次 1 验收；批次 2 迁移 8 目录（§4 表）→ 终态；新增
  `tools/gen-node-readmes.mjs`（生成器，NDP §8：端口/参数两表由 node.ts 生成，
  人工只写「能力与护栏」引注与「现状备注」）+ 生成物 `src/nodes/README.md`
  总索引 + 16 份 `src/nodes/<type>/README.md`（生成物入库；README 表与源数据
  一致性以契约测试断言——解析 README 表回比 node.ts）。
- **红→绿**：`nodes-dirs.test.mjs` 内联残留断言随批次推进收敛至 0（红→绿两轮）；
  新增 `readme-consistency` 断言先红（README 未生成）后绿。
- **验证命令**：每批收尾 `npm test -w @agentflow/shared && npm test -w
  apps/server && npm run build && npm run gate`（gate 见 §5.5 证明力边界）。

## 4. L 项两批拆分表（16 节点 → 8+8）

| 批次 | 节点（8+8） | 批内必验形态（批次 1 覆盖全部结构变体，批次 2 为同构重复） |
| --- | --- | --- |
| 批次 1 | **delay**（NDP 试点 T1 最小骨架）、**trigger**（试点 T2：`visibleIf`×2、僵尸参数×3、空 inputs）、**llm**（caps 双能力序、`runtimeOverridable`、number min/max/step、双 inputs、text 端口）、**userinput**（toggle、boolean 默认值、僵尸参数×2、空 inputs）、**code**（caps 单能力、textarea 含换行默认值）、**retrieval**（list 端口、combo kb）、**condition**（双 outputs、`engine.ts:128` p.expr 耦合）、**http**（object 端口、跨节点同名键 `p.to`·超时义） | 合成函数全形态 + 快照比对 + 探针真值表 + gate |
| 批次 2 | prompt、websearch（`p.max` 同名异义·结果数量义）、notify（空 outputs、`p.to`·接收人义）、loop（toggle conc、list 输入端口、`p.max`·迭代义）、merge（双 inputs）、reply（空 outputs）、setvar、approval（`p.to`·超时策略义） | 空输出数组/同名键余义/list 输入端口——均与批次 1 已验形态同构 |

**批间验收口径**：两批各自收尾均跑 §5 验收清单可执行子集（1/2/3/4/5/7/8 逐条
+ 快照常驻比对必绿）；批次 2 收尾跑九条全量 + 在线 E2E（§5.6）+ README 一致性。
每批结束 NODES 输出都与同一基线逐字节相等（不变式 A 贯穿两批）。批次编排
（一批一迭代 vs 单迭代两提交）由协调者按 WORKFLOW「一次迭代一件事」派发，
**推荐两迭代**（各自产品提交 + VERIFY 记录）。

## 5. 九条验收的机器可执行化

### 5.1 验收 1 · 快照比对的执行形态——**推荐常驻契约测试**

- **执行形态（推荐）**：新增常驻测试（落点 §3.3），核心形态：
  ```js
  import { readFileSync } from 'node:fs';
  import { NODES } from '../dist/index.js';
  const baseline = readFileSync(new URL('./nodes.baseline.json', import.meta.url)); // Buffer，零文本模式
  const actual = Buffer.from(JSON.stringify(NODES, null, 2) + '\n', 'utf8');
  assert.ok(actual.equals(baseline), /* 首异字节偏移 + 重生成指引 */);
  ```
- **推荐理由**：①永续防漂移——每次 `npm test`/CI 比对，捕获 BK-0021 之后任何
  未批 DEFS 漂移；②Buffer↔Buffer 字节级比较，不经文本模式读写，免疫编辑器/
  检出 EOL 事故（叠加 `.gitattributes` 双保险）；③与 golden 同款「CI 权威」口径
  （windows-latest 每 push 复跑）。一次性 `cmp` 命令保留为 REPORT 证据形态，
  不作唯一防线。
- **覆盖面**：现行契约测试零断言区全补——`desc / kw / caps 值 / min·max·step /
  端口内容 / options 文案`（`contract.test.mjs:12-19` 对 name/icon 仅 truthy）。

### 5.2 验收 2 · `if` 行为探针（三组入参真值表，迁移前语义 = `nodes.ts:14-15`）

| 参数 | 探针入参 | 期望 |
| --- | --- | --- |
| `trigger.cron.if`（`p.mode === '定时触发'`） | `{mode:'手动触发'}`（默认值） | `false` |
| 同上 | `{mode:'定时触发'}`（equals 值） | `true` |
| 同上 | `{mode:'Webhook'}`（其他值） | `false` |
| `trigger.path.if`（`p.mode === 'Webhook'`） | `{mode:'手动触发'}`（默认值） | `false` |
| 同上 | `{mode:'Webhook'}`（equals 值） | `true` |
| 同上 | `{mode:'定时触发'}`（其他值） | `false` |

断言形态：`typeof NODES.trigger.params.find(p=>p.k==='cron').if === 'function'`
且六行探针逐一布尔相等；唯一消费点 `app.js:763`（widgets filter）纳入 §5.6
E2E 点位 ⑤。

### 5.3 验收 3 · 两数分开

- **33 个已定义参数**：键集与默认值逐字节等价——由快照比对（§5.1）+
  `defs-drift.test.mjs`（33/33 字面量表）双保险；断言
  `sum(Object.values(NODES).map(d=>d.params.length)) === 33`。
- **28 个已实现参数**：= 33 − 5 僵尸（trigger.mode/cron/path、
  userinput.vtype/req，NDP §6.4）；由守卫测试（§6）反向清单精确断言（新僵尸
  出现或旧僵尸被接通都会红，提示更新清单与 NDP §6.4）。

### 5.4 验收 4 · 既有契约测试零改动全绿

`git diff --stat -- packages/shared/test/contract.test.mjs
packages/shared/test/defs-drift.test.mjs packages/shared/test/events-negative.test.mjs
packages/shared/test/handlers-coverage.test.mjs` 输出为空，且四个文件全绿
（新增测试文件不在此列——「零改动」限定既有四件）。

### 5.5 验收 5 · gate 与证明力边界

`npm run build && npm run gate` 8 场景 diffPx=0。**边界如实标注**：gate 为纯静态
托管（无 `/api` 代理），只证静态态渲染一致；`app.js:2055` 运行期覆写路径 gate
测不到——由 §5.6 E2E 补证。

### 5.6 验收 6 · 在线态人工 E2E 点位（不可替代，五点）

`npm start` 起后端后：①启动日志出现「⚡ 执行后端已连接」（`ENGINE.probe`，
`app.js:2044` 起）；②画布放置 LLM 节点开属性面板，模型下拉被后端
`provider.models` 覆写（`app.js:2055` 路径真实执行）；③当前取值仍在 options
内（不变式「UI 显示值 === 实际存值」现状口径）；④控制台零 TypeError；
⑤trigger 节点「触发方式」切「定时触发」→ Cron 行显、切回「手动触发」→ 隐
（`if` 编译产物行为落点，`app.js:763`）。

### 5.7 验收 7 · `app.js:2055` 三重耦合逐字不动

迁移全程 `git diff -- apps/web` 为空（apps 零改动是最强形式）；聚合层导出对象
**不得 `Object.freeze`**——`app.js:2055` 运行期写 `DEFS.llm.params[0].o` 是现状
行为，以测试断言可写性（向 dist 导入对象的该字段赋值不抛、还原）。

### 5.8 验收 8 · NDP §11.1 散落点核对表（现行指针，2026-10-24 复核）

| # | 位置（现行行号） | 核对口径 |
| --- | --- | --- |
| 1 | `app.js:2055` 运行期写 `DEFS.llm.params[0].o` | 三重耦合逐字不动（NDP 记 :2048，+7 漂移，此处为现行值） |
| 2 | `app.js:193-197` `paramsOf()` | 不改写（`paramDefaultsOf` 第二份实现；改造触 UI 另立） |
| 3 | `app.js:1866` 起 `RUN_META` 16 键表 | 键集不因迁移失效（NDP 记 :1859-1876，+7 漂移） |
| 4 | `app.js:103` `MCP_SERVERS` | 与 caps 无契约关联，现状保留 |
| 5 | `app.js:178` 收藏夹硬编码 `['llm','retrieval','condition']` | localStorage 键 `agentflow.v2`（`:170`）零涉及 |
| 6 | `engine.ts:128` `n.type==='condition'` + `p.expr` | cond 事件唯一发射点，行为不变 |
| 7 | `engine.ts:23-24` `DEFS_META = NODE_NAMES` | 自注「meta.name 恒 undefined」保留，行为零变化 |
| 8 | `handlers.ts` + `llm.ts` `p.<key>`（NDP 记 34 行/37 处/23 键） | 守卫测试（§6）落地守护 |

### 5.9 验收 9 · POLICY 从严条款

实施轮先开 needs-approval issue（附录 A 字面量，脚本开启），批复前零实现；
等价性证据（快照 diff 为空 + gate diffPx=0 + E2E 记录）附于 issue 评论/PR 描述
后合入。

## 6. 守卫测试设计（参数键名 ↔ handler 引用一致性，POLICY 自主区）

- **落盘**：`packages/shared/test/param-handler-guard.test.mjs`（跨包读源码先例：
  `contract.test.mjs:66` 读 `apps/web` 源）。
- **静态提取法**：读 `apps/server/src/{handlers,llm}.ts` 与 `engine.ts` 源文本，
  逐行剥离 `//` 行内注释后以 `/\bp\.([a-zA-Z_]\w*)/g` 提取；**行归属**：
  `handlers.ts` 内按最近前导 handler 定义（`async <name>(` / `<name>:` 键）归属
  节点类型，`llm.ts` 全文件归属 `llm`，`engine.ts:128` 行（同行有
  `n.type === 'condition'` 守卫）归属 `condition`。
- **正向断言**：每个提取键 ∈ `NODES[owner].params[].k`（`params[].id` 逐字等于
  现行 `k`，NDP §4.2 必踩点 2——改名即此处红）。
- **反向 warn 清单（精确断言）**：`NODES` 有而无 handler 引用的键集合 ===
  期望僵尸清单 `[['trigger',['mode','cron','path']],['userinput',['vtype','req']]]`
  ——新僵尸出现或既有僵尸被接通都红，提示同步 NDP §6.4 与本清单。
- **不硬编码行数/处数**（NDP 记载的 34 行/37 处会随代码演化漂移），只断言键集合
  与归属；跨节点同名异义键（`p.to` ×3 义 / `p.max` ×3 义）按 handler 归属天然
  区分，测试对「同名键多节点引用」不报警。

## 7. 快照证明力边界声明（如实口径，不得宣称超出）

1. **`if` 函数不可序列化**：快照无 `"if"` 键（`JSON.stringify` 丢弃函数值）——
   行为等价由 §5.2 探针真值表守卫，快照对此零证明力。
2. **派生层不在快照内**：`NODE_NAMES` / `paramDefaultsOf`（`nodes.ts:110-119`）
   不属 `NODES` 序列化——由既有测试守卫（`contract.test.mjs:18,28-36` +
   `defs-drift.test.mjs` 33/33）。
3. **运行期突变不覆盖**：快照比对的是 dist 新导入对象；`app.js:2055` 运行期
   覆写后的对象不在射程——由 §5.6 E2E 点位 ②③ 守卫。
4. **结构 ≠ 语义**：快照证键序/键集/值逐字节等价；「同名异义键改坏」类语义事故
   由 §6 守卫测试与 review 兜底。
5. **资产 ≠ 防护**：在 BK-0021 实施轮把常驻比对测试落盘前，快照只是资产、
   不拦截任何东西（协议不虚构行为原则）。

## 8. 回滚步骤

- 迁移是纯 `packages/shared` 存储形式重组：**无数据迁移**（存量 workflow JSON /
  localStorage / SQLite `store.ts:149` 起不透明存档零涉及——端口仍按索引寻址，
  无 schema 版本钩子）、无依赖增减、无 env 变更。
- 回滚唯一手段 = `git revert` 实施轮产品提交（WORKFLOW §6.6，禁 force/reset）；
  多批次时按提交逐个 revert（后批先 revert）。
- 快照与 `.gitattributes` 留库无害：revert 后 `nodes.ts` 恢复单文件原状，快照
   比对（若常驻测试已入库）仍绿——基线本就从原状生成；两资产继续服务未来的
   DEFS 防漂移。
- 回滚后验证：`npm test`（8 项 + 实施轮新增测试若保留则全绿）+ `npm run gate`。

## 9. 行数预算与 ≤400 行拆分预判

| 文件 | 预算（行） | 预判 |
| --- | --- | --- |
| `src/nodes.schema.ts` | ≤300 | 估 220–260（zod + superRefine 五规则） |
| `src/nodes.ts`（聚合层） | ≤250 | 估 160–200（16 静态 import + 合成函数 + 三导出）；**不触及 400**，NDP §3 预留的 `nodes/index.ts` 转发拆分预案**不启用**（若实施中超预算再拆，导出面不变） |
| `src/nodes/<type>/node.ts` | ≤60/个 | 最长 `llm` 估 45 |
| `test/schema.test.mjs` | ≤150 | 正例 3 + 负例 6 |
| `test/nodes-dirs.test.mjs` | ≤100 | 源文本扫描 + readdir 比对 |
| `test/synthesis.test.mjs`（含快照比对） | ≤180 | caps/探针/键集/字节比对 |
| `test/param-handler-guard.test.mjs` | ≤200 | 提取器 + 归属表 + 双向断言 |
| `tools/gen-node-readmes.mjs` | ≤200 | 表格生成器；生成物 README（16×约 40–60 行）为文档产物不计源码上限 |

现行 `nodes.ts` 119 行退役方式：DEFS 段 `:10-106` 分载 16 目录；派生层
`:109-119` 留聚合层。

## 10. 与进化工作流的衔接

BK-0021 状态机：本文档落盘时维持 `proposed`；**转 ready 唯一条件 = 附录 A issue
获用户批复**。实施轮 VERIFY 以本 SPEC §5 逐条验收，REPORT 引用统一门禁结论；
CLOSE 时随批关账 BK-0023（附录 A ③）。本 SPEC 是 NDP v0.2 的实施展开，
如二者有出入以 NDP 为准并回改本 SPEC（minor 级，SPEC 评审即可）。

---

## 附录 A · needs-approval issue 草案（字面量，脚本逐字取用）

**标题**：

```
[needs-approval] BK-0021 NDP 节点定义目录制迁移实施请批：packages/shared DEFS 重组（内容零漂移）+ BK-0023 随批增量
```

**正文**：

```
按 POLICY.md 需批准区「packages/shared DEFS 变更」，BK-0021（NDP 节点定义目录制
迁移）的实施需先经您批复。方案全文见实施轮 SPEC（docs/node-definition-
protocol-migration-spec.md，随迭代 0018 落盘）；NDP 协议 v0.2 全文见
docs/node-definition-protocol.md。批准前零实现。

请批清单：

① 请批面：packages/shared DEFS 存储形式重组——nodes.ts 单文件（119 行，16 节点
   挤一处）拆为 src/nodes/<type>/{node.ts,README.md} ×16 + nodes.schema.ts
   （zod 加载期校验）+ 聚合层反向合成；NODES/NODE_NAMES/paramDefaultsOf 导出
   面逐字保留，运行时输出与迁移前逐字节等价（内容零漂移）；UI 三层零接触、
   golden 零重录（非修宪轮）。

② 等价性证据方案（NDP §10 验收 9 逐条）：
   - 快照逐字节比对：迁移前全量基线已入库 packages/shared/test/nodes.baseline.json
     （11521 字节，sha256 08ba1229…f275，根 .gitattributes 钉死 LF——Windows
     检出不再 CRLF 化）；实施以常驻契约测试 Buffer 级比对，diff 必须为空；
   - gate diffPx=0：8 场景全绿（证明力边界如实标注：静态托管，在线分支另证）；
   - 在线态 E2E 记录：LLM 模型下拉被后端清单覆写 + trigger cron/path 随 mode
     显隐 + 控制台零 TypeError（SPEC §5.6 五点位）。

③ 随批增量（BK-0023）：events.ts:32 run:done.ok 字段补一行语义注释——
   「ok=未被中止而非全部成功」（消费端 server-sync.js:105-107 已按此实现，
   注释级改动、SSE schema 零变化）。批准本 issue 即一次授权；BK-0021 实施轮
   CLOSE 时随批关账（BACKLOG BK-0023 行口径）。除此之外零 shared 契约文件触碰。

④ 实施拆分预告：两批 8+8（批次 1：delay/trigger/llm/userinput/code/retrieval/
   condition/http——覆盖全部结构形态；批次 2：prompt/websearch/notify/loop/
   merge/reply/setvar/approval），各自独立验收九条（SPEC §4/§5）。

⑤ 证据链接：NDP v0.2（docs/node-definition-protocol.md，§10 验收 :597-620）·
   实施轮 SPEC（docs/node-definition-protocol-migration-spec.md）· PRD
   （docs/evolution/iterations/0018/PRD.md）· 现状（packages/shared/src/
   nodes.ts:9-119 单文件 16 节点；contract.test.mjs:12-19 对 name/icon 仅
   truthy 断言——快照即为此缺口而设）。

您在本 issue 评论「批准」即授权 ①+③（BK-0021 转 ready 进入实施，BK-0023 随批
关账时点在其备注已定）；评论「驳回」则 BK-0021 维持 proposed，本 SPEC 与快照
归档为未采纳方案（快照资产留库无害，继续服务未来 DEFS 防漂移）。
```
