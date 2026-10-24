# SPEC · 迭代 0022 · BK-0021 批次 2 终轮技术规格（余 8 目录 + README 生成器 + 「内联残留=0」终态断言 + readme-consistency + BK-0023 随批）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 23:45
> 权威顺位：`CONSTITUTION.md` > `AGENTS.md` > WORKFLOW > POLICY > NDP v0.2
> （`docs/node-definition-protocol.md`）> 实施轮 SPEC
> （`docs/node-definition-protocol-migration-spec.md`，下称「迁移 SPEC」）> 本文件 > PRD。
> 授权链：issue#11 用户批复在案（授权面 = 迁移 SPEC 附录 A ①存储形式重组·内容零漂移
> + ③BK-0023 随批增量——③的落点在本轮）。**非修宪轮**：全程禁 `npm run gate:update`，
> golden 零接触（POLICY 禁止区）。
> 新架构决策：**无（needsAdr=false）**——同批次 1 口径（`iterations/0021/SPEC.md` 头注），
> 目录制/加载机制/两批拆分/README 生成均已由 NDP v0.2 + 迁移 SPEC + issue#11 批复链
> 定案；本文件是终轮的实施展开。实施级定稿裁决（README 生成器数据源 / 测试落位 /
> 批次 2 capabilities 取值等）见 §5/§6/§12，均属 NDP §12「minor 由 SPEC 评审」射程。

## 1. 范围与不变式（继承迁移 SPEC §1，批次 2 终轮边界）

**做**：迁移 SPEC §3.4 终段（余 8 目录 + README 生成器 + readme-consistency）+
§3.2 终态断言启用（「内联残留=0」+ D===R 扩 16）+ §5 九条全量验收 + §5.6 在线 E2E
五点位 + BK-0023 events.ts:32 一行注释。

**不做**（PRD「不做」清单逐条继承）：`apps/web`、`tools/pixel-gate/**`、`.github/**`、
根 package.json/lock 零改动；`nodes.baseline.json` 不更新（迁移前基线，实施落地后转
常驻防漂移基线）；既有四测试与批次 1 三测试（schema/synthesis/param-handler-guard）
零改动；`nodes.schema.ts` 原则上零改动（§11 风险 2 的例外口径）；BK-9002~9006 修宪链
不开工；`openspec/` 存量预警不清理（0021 OBS-002 在案）。

四不变式逐条生效（迁移 SPEC §1 原文继承，本会话复核基线资产在库：`nodes.baseline.json`
11521 字节、sha256 `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275`，
与迁移 SPEC §2 记载逐字一致）：

- **A 内容零漂移**：终轮完成后 `NODES` 运行时输出与基线逐字节等价（Buffer 级常驻
  比对已随批次 1 在库，`test/synthesis.test.mjs` ④；16 键全量）。
- **B 导出面逐字保留**：`nodes.ts` 对外仍且仅导出 `NODES / NODE_NAMES /
  paramDefaultsOf`；`src/index.ts` 零改动；`loadJsonDef/synthesize` 私有。
- **C 顺序即契约**：16 键声明序（trigger, userinput, llm, prompt, retrieval, websearch,
  http, code, notify, condition, loop, delay, merge, reply, setvar, approval）与
  `ports[]`/`params[]` 数组顺序逐字搬运（存量边按端口索引寻址，`engine.ts:74`）。
- **D 波及面**：新增文件仅 `packages/shared/**` 与 `tools/gen-node-readmes.mjs`
  （迁移 SPEC 不变式 D 原文既定位置）；根 package.json **不新增 npm script**——生成器
  以 `node tools/gen-node-readmes.mjs` 直呼（见 §5.6）。

## 2. 目标形态与模块边界（终轮完成时）

```
packages/shared/src/
  nodes.ts            聚合层（收敛终态）：16 静态 import + 加载期校验 + 反向合成
                      + 16 键全 synthesize 装配 + 派生层（NODE_NAMES/paramDefaultsOf）
  nodes.schema.ts     零改动（批次 1 产物；loadJsonDef 覆盖面自然扩至 16 键）
  nodes/
    README.md         新增（生成物）：节点总索引
    <type>/node.ts    16 目录全量（终轮 +8：prompt/websearch/notify/loop/merge/
                      reply/setvar/approval）
    <type>/README.md  16 份（生成物，终轮一次性全量生成）
  index.ts            零改动
  events.ts           +1 行注释（BK-0023，§7）
tools/
  gen-node-readmes.mjs  新增：README 生成器（唯一非 packages/shared 新增文件）
```

模块边界（批次 2 增量；tsc 强制 + 既有测试守护）：

| 文件 | 允许 | 禁止 |
| --- | --- | --- |
| `nodes/{prompt,websearch,notify,loop,merge,reply,setvar,approval}/node.ts` | 仅 `import type { NodeDefJson } from '../../nodes.schema.js'`（type-only，运行时零依赖） | 任何运行时 import、副作用、函数字面量（NDP §2.3） |
| `nodes.ts` | `types.js`、`nodes.schema.js`、16 × `./nodes/<type>/node.js` | 其他一切；除三导出外不得再导出 |
| `tools/gen-node-readmes.mjs` | 仅 Node 内建（`node:fs`/`node:path`/`node:url` + dynamic `import()`）；读 `packages/shared/dist/**` 与 readdir `src/nodes/` | import `apps/**` 任何代码；写 `src/nodes/` 以外任何路径；改 dist |
| `test/readme-consistency.test.mjs` | `../dist/nodes/<type>/node.js`（default export = NodeDefJson）+ `../dist/index.js`（键序）+ 读 `../src/nodes/**/*.md` + `node:child_process`（调生成器，见 §6.2） | 解析 TS 源文本 |
| `apps/**` | 只经 `@agentflow/shared` 包根（零改动，引用边界断言随 nodes-dirs 回归） | 直引 `nodes/<type>/node.js`（NDP §2.5） |

## 3. 8 目录 `node.ts` 数据规格（定界表，每份 ≤60 行）

通用规则（同批次 1）：`export default { protocol: 1, type: <目录名>, identity{5 字段
逐字取自现行内联 DEFS}, ports{带新 id}, params{id≡现行 k，label/widget/default/
min/max/step 逐字}, binding } satisfies NodeDefJson`。identity 与参数文案的机械转写
源 = `nodes.ts:107-155`（本会话 Read 亲核）——**不得顺手润色**，这是快照逐字节等价
的直接前提。下表只列新增/定标信息；端口 id 一次性定稿，一经发布即冻结（NDP §5.3，
`^[a-z][a-z0-9-]{2,31}$` + in-/out- 前缀 + 节点内 inputs+outputs 合计唯一；跨节点
同名允许，批次 1 先例 code/condition 同用 `in-input`）：

| 节点（现行内联行） | ports.id（label→id） | params（全部已实现，id 逐字=现行 k） | binding.capabilities（依据 = handler 实况） |
| --- | --- | --- | --- |
| prompt（nodes.ts:107-111） | 变量→`in-var`；提示词→`out-prompt` | tpl textarea（默认值含 `\n` 换行，同 code 已验形态） | `{data:true}`（render 纯模板渲染，handlers.ts:33-36） |
| websearch（:113-118） | 查询→`in-query`；结果→`out-results`（list 端口） | eng combo 4 项 [Bing,Google,博查,SearXNG] d'Bing'；max number d5 min1 max20 step1（**max=结果数量义**） | `{net:{mode:'guarded'}}`（出站全经 guard.ts 网关代发，search.ts:8-11 头注明示「本模块不含任何网络出口」） |
| notify（:121-126） | 内容→`in-content`；outputs 空 | ch combo 4 项 d'邮件'；to text d'support@team.com'（**to=接收人义**） | `{net:{mode:'guarded'}}`（Webhook 分支 guardedFetch，handlers.ts:127） |
| loop（:128-133） | 列表→`in-list`（list 输入端口）；元素→`out-item` | max number d10 min1 max100 step1（**max=迭代义**）；conc toggle d false | `{data:true}`（纯编排无 IO，handlers.ts:148-205） |
| merge（:135-139） | A→`in-a`；B→`in-b`（双 inputs）；合并→`out-merged` | mode combo 2 项 d'等待全部' | `{data:true}`（handlers.ts:213-223） |
| reply（:140-144） | 内容→`in-content`；outputs 空 | tpl textarea d'{{content}}' | `{data:true}`（handlers.ts:225-232） |
| setvar（:145-149） | 值→`in-value`；值→`out-value` | name text d'answer' | `{data:true}`（handlers.ts:234-238） |
| approval（:150-155） | 输入→`in-input`；结果→`out-result` | role text d'值班经理'；to combo 3 项 d'挂起'（**to=超时策略义**） | `{human:true, llm:true}`（挂起-恢复 handlers.ts:240-296；互审裁决 generateText approval-review.ts:17/78，可选路径如实声明） |

批次 2 形态核对（PRD「背景 5」逐条属实，本会话复核 `nodes.ts:107-155`）：

1. **8 键均无 caps、无 visibleIf、无 implemented:false、无 runtimeOverridable**——
   合成输出不含 caps 键（批次 1 落地的「14 键无 caps」负存在断言常驻守护）、
   无 `if` 编译键；僵尸参数全部在批次 1 侧（trigger.mode/cron/path +
   userinput.vtype/req，守卫测试精确断言在库）。
2. **同名异义键不改名**：`p.to`（http 超时已批 1 / notify 接收人 / approval 超时策略）
   与 `p.max`（llm tokens 已批 1 / websearch 结果数量 / loop 迭代）——id 逐字等于现行
   `k`（NDP §4.2 必踩点 2），守卫测试按 handler 归属天然区分（`param-handler-guard.
   test.mjs` 在库零改动，AC3 回归即证归属不变）。
3. **combo options 迁移期 value≡label**：逐项 `{value:X,label:X}`（NDP §4.3 等价性
   前提）；schema ④ 校验 `default ∈ options[].value` 对 8 键全部成立（Bing∈4 项、
   邮件∈4 项、等待全部∈2 项、挂起∈3 项）。
4. 端口 id 已人工核对满足 schema regex 与节点内唯一性（superRefine ⑥ 兜底）；
   `in-a`/`in-b`/`in-var` 等 4–9 字符 id 均在 3–32 区间。

## 4. 聚合层 `nodes.ts` 收敛设计（≤250 行，估 130–150；现 168）

1. **16 静态 import**：现有 8 行 import 块追加 8 行（prompt/websearch/notify/loop/
   merge/reply/setvar/approval，同款 `.js` 后缀 ESM 显式寻径）。
2. **NODES 字面量收敛**：16 键全部 `synthesize(loadJsonDef(xDef))`，**键序 = 现行
   声明序逐字不变**（不变式 C；TS 对象字面量重复键报 TS1117 防同键双定义）；
   删除 8 键内联字面量（`nodes.ts:107-111/:113-118/:121-126/:128-133/:135-139/
   :140-144/:145-149/:150-155`）。
3. **loadJsonDef/synthesize/synthesizeParam/compileVisibleIf 逐字保留**（批次 1 落地
   形态，`nodes.ts:27-101`）；校验覆盖面自然扩至 16 键（模块刼期 16 次 safeParse，
   开销可忽略——批次 1 SPEC §4.2 口径）。
4. **头注更新**：现「余 8 键暂内联，批次 2 迁移」改为终态口径（16 目录全量 +
   常驻快照守护 + README 生成器指针）；三导出与派生层（`nodes.ts:158-168`）零改动。
5. **不 `Object.freeze`**（app.js:2055 运行期写 `DEFS.llm.params[0].o` 是现状行为；
   可写性常驻断言随 synthesis.test 回归）。

## 5. README 生成器设计（`tools/gen-node-readmes.mjs`，≤200 行，估 160–190）

### 5.1 数据源与前置（本 SPEC 定稿，偏差记录见 §12-①）

- **从 `packages/shared/dist` 读取**：`await import(dist/nodes/<type>/node.js)`
  取 default export（NodeDefJson 纯数据），键序取自 `dist/index.js` 的
  `Object.keys(NODES)`（= 声明序，唯一顺序来源，免疫目录枚举顺序差异）。
- **前置命令**：`npm run build:shared`（先构建后生成；测试链 `npm test` 本就先建
  dist，与既有四测试 import `../dist/index.js` 同源同例）。
- 理由：零 TS 源文本解析（解析脆弱）、与运行时同源（dist 即 tsc 对 node.ts 的逐字
  编译产物）。stale 风险（改 node.ts 忘重建）由 readme-consistency 测试在
  `npm test` 链内拦截（该链先 build:shared）。

### 5.2 生成物（17 份，全部入库；每份约 40–60 行，文档产物不计源码 400 行上限）

**总索引 `src/nodes/README.md`**（NDP §3「类型 → 目录 → 一句话用途」）：
表格 16 行（键序），列 = `type | 目录 | identity.name | 一句话用途（description）`，
表头附生成器重跑命令与「生成物勿手改」警示。

**每节点 `src/nodes/<type>/README.md`**（NDP §8 五段结构）：

```markdown
# <identity.name>（`<type>`）

<identity.description>。        ← 生成

## 端口                          ← 生成（含 append-only 顺序号）
| # | 方向 | id | 名称 | 类型 |   （inputs 自 1 编号，随后 outputs 自 1 编号；
                                  行序=数组序；存在 any 端口时表下脚注：
                                  「any=透传通配（迁移保持现行类型，NDP §5.1）」）
## 参数                          ← 生成（含 implemented 状态）
| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
                                  （combo→选项 `a / b / c`；number→`[min–max] step`；
                                  状态=已实现 / **UI-only（implemented:false）**）
## 能力与护栏                    ← 生成：binding.capabilities 逐 kind 行 +
                                  KIND_GUARDRAILS[kind] 固定护栏文案（NDP §7.2 镜像：
                                  llm=温度/token 由参数约束、密钥只进环境变量；
                                  exec=sandboxed 子进程+超时；net=guarded 走 guard.ts；
                                  human=挂起-恢复语义；data=无 IO；mcp/skills=扩展预留）
## 现状备注                       ← MANUAL_NOTES[type]（人工文案，持有于生成器内）
```

单元格转义规则（生成与回比测试共用同一规则，§6.2）：值中换行以字面 `\n` 两字符
呈现；`|` 以 `\|` 转义。EOL 一律 LF、UTF-8 无 BOM、末尾恰一换行。

### 5.3 人工部分的持有处（本 SPEC 定稿，偏差记录见 §12-②）

NDP §8「人工只写能力与护栏引注与现状备注」——手写文案**单一持有于生成器内的
`MANUAL_NOTES` 常量表**（16 条，1–3 行/条），不手改生成物：手改会被重跑覆盖且
readme-consistency 红。现状备注事实锚点（生成器文案据此撰写，全部本会话核实）：

- trigger：mode/cron/path 三参数 UI-only（handler 零参签名，out 硬编码「手动触发」，
  handlers.ts:22-24）；userinput：vtype/req UI-only（只读 var/defv，handlers.ts:26-31）。
- llm：model options 运行期被 `/api/health` 的 provider.models 覆写（app.js:2055，
  runtimeOverridable:true；「UI 显示值===实际存值」不变量现状未完整履行，NDP §6.3
  实现缺陷单独立项）。
- code：子进程+超时（runUserCode）；JS 样例错配兜底（BUG-0012，handlers.ts:104-115）；
  sqlite/browser MCP 工具 stub 如实降级（tools.ts:5/:82，BK-0008 在案）。
- websearch：Bing/Google 未接真实 API——按回退链 博查→DuckDuckGo 执行并 warn
  （handlers.ts:71-72）；博查/SearXNG 严格路由，未配置/失败如实跳绝不静默换引擎
  （迭代 0005/BK-0007，handlers.ts:57-70）。
- notify：仅 Webhook 渠道实接（guardedFetch，handlers.ts:127）；邮件/短信/企业微信
  未接入真实发送（handlers.ts:132）。
- http：SSRF 守卫（guardedFetch，handlers.ts:91）；approval：人工挂起 10 分钟超时
  自动通过；智能体互审 role=`node:<id>`（迭代 0016/BK-0017，approval-review.ts），
  裁决失败按超时策略降级；审计落 store。
- loop：并发批大小固定 3（CONC，handlers.ts:194-195）、maxIter 引擎侧 clamp 1–100
  （handlers.ts:151）；delay：clamp 0.1–60s（handlers.ts:208）；merge：多入边取值
  语义=首条非 undefined（engine.ts:92-93 已知债务）；reply：终点节点，emit('output')
  + ctx.outputs（handlers.ts:229-230）；setvar/prompt/retrieval/condition：常规备注
  （retrieval=本地 TF-IDF 无出站；condition=cond 事件唯一发射点 engine.ts:128）。

### 5.4 CLI 契约与幂等

- 调用：`node tools/gen-node-readmes.mjs [--out <dir>]`——缺省写 `packages/shared/
  src/nodes/`；`--out` 写任意目标目录（供 §6.2 测试 temp 重生成与预览 diff）。
  **根 package.json 零改动（不变式 D），不新增 npm script**。
- 幂等：输出确定性（顺序唯一来自 NODES 键序、固定模板、LF、末尾单换行）；
  只写内容有变化的文件并打印逐文件摘要；同输入重跑输出逐字节相同。
- 行数预算贴线对策：MANUAL_NOTES 每条 ≤3 行精炼文案；若逼近 200 行，压缩模板
  空行与护栏表排版，不拆文件（迁移 SPEC §9 定 ≤200 单文件）。

## 6. 测试设计（2 件：1 改 1 增）

### 6.1 `test/nodes-dirs.test.mjs` 终态断言收敛（修改，仍 ≤100 行）

- **断言 3 翻转**：`residual` 由「恰为批次 2 八键」收敛为 **`[]`**（「内联残留=0」
  终态，迁移 SPEC §3.2 收尾口径）——先改此断言得红（8 键仍内联），8 目录全部落地
  后转绿（红→绿一次翻转，非逐键收敛）。
- **新增终态计数断言**：`D.size === 16`（D===R 随之双方 =16；显式计数防「迁移中
  态」被误判绿）。
- 断言 1（D===R + D ⊆ keys(NODES)）与断言 2（引用边界扫描）零改动回归。

### 6.2 `test/readme-consistency.test.mjs` 新增（本 SPEC 定稿落位独立文件，≤150 行；偏差记录见 §12-③）

三个 test（先红后绿：README 未生成时全红）：

1. **表格回比**（PRD/迁移 SPEC §3.4 字面口径）：16 类型逐个——import
   `../dist/nodes/<type>/node.js` 取 NodeDefJson，解析在库 README 的端口表（方向序/
   id/名称/类型）与参数表（序/id/名称/控件/默认值/选项与约束/状态列含 implemented
   标记）回比源数据（默认值按 §5.2 转义规则逆变换）；总索引含恰 16 行且序 =
   `Object.keys(NODES)`；`src/nodes/` 目录集 ↔ 16 份节点 README 一一对应（无缺无孤）。
2. **生成器确定性**：`child_process.spawnSync(process.execPath, ['tools/gen-node-
   readmes.mjs','--out',<os.tmpdir 临时目录>])`（execPath 免 PATH 依赖），对 17 份
   产物与在库文件逐字节比对——同时守护表格、能力护栏、现状备注（手写部分含内），
   即 PRD 风险表「生成器幂等重跑断言」的机器化；失败信息逐文件列首异路径。
3. **回归免疫自检**：断言生成器产物不含 CRLF 与 BOM（readFileSync 前 3 字节非
   EF BB BF、全文无 `\r`）。

预算估 120–150（转义/解析助手 ≤30 行 + 两个循环 + spawn 比对）；测试 import 全走
dist（node --test 环境 dist 必已构建，先例：既有四测试 + 批次 1 三测试）。

## 7. BK-0023 注释精确形态（events.ts 42→43 行）

`packages/shared/src/events.ts:32` 现行 `    ok: z.boolean(), stopped:
z.boolean().optional(),`——在其**上方插入恰一行注释**（形态定死，消除歧义）：

```ts
    /* ok = 本次运行未被中止（≠全部节点成功）；消费端 apps/web/src/server-sync.js:105-107 按「ok !== false && !ev.stopped」定级渲染 */
```

- 消费端语义本会话复核属实：`server-sync.js:105-107` run:done 分支
  `lvl: (ev.ok !== false && !ev.stopped) ? 'ok' : 'warn'`。
- **schema 零变化**：`ok: z.boolean(),` 等全部 schema 行逐字不动；diff 恰 `+1 行`
  （AC9 以 `git diff -- packages/shared/src/events.ts` 断言）；events-negative
  测试零改动全绿（AC4）佐证。

## 8. 受影响文件清单（= 产品提交白名单，AC9）

| # | 文件 | 动作 | 预算（行） |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/{prompt,websearch,notify,loop,merge,reply,setvar,approval}/node.ts` | 新增 ×8 | ≤60/个（迁移 SPEC §9；估 20–35） |
| 2 | `packages/shared/src/nodes.ts` | 收敛（+8 import、删 8 内联键、头注更新） | ≤250（估 130–150；现 168） |
| 3 | `tools/gen-node-readmes.mjs` | 新增 | ≤200（迁移 SPEC §9；估 160–190） |
| 4 | `packages/shared/src/nodes/README.md` | 新增（生成物入库） | 约 25–30 |
| 5 | `packages/shared/src/nodes/<type>/README.md` ×16 | 新增（生成物入库） | 每份约 40–60（文档产物不计源码上限） |
| 6 | `packages/shared/test/nodes-dirs.test.mjs` | 修改（断言 3 收敛 + 计数断言） | ≤100（现 60） |
| 7 | `packages/shared/test/readme-consistency.test.mjs` | 新增 | ≤150 |
| 8 | `packages/shared/src/events.ts` | +1 行注释（BK-0023） | 42→43，schema 行零改动 |

零改动白名单：`apps/**`、`tools/pixel-gate/**`、`.github/**`、根 package.json 与
lock、`packages/shared/src/index.ts`、`packages/shared/src/nodes.schema.ts`（§11
风险 2 例外口径：若批次 2 数据暴露 schema 误拒合法数据，属实施发现，逐条留档处置、
不得静默放宽，且任何改动须在本表追加并说明）、既有四测试（contract / defs-drift /
events-negative / handlers-coverage）、批次 1 三测试（schema / synthesis /
param-handler-guard——synthesis 快照断言内容不因批次 2 改）、
`packages/shared/test/nodes.baseline.json`。`docs/evolution/BACKLOG.md` 备注回写
（含 issue#11 勘误）随归档提交（机制件），不计产品提交。

新文件 EOL 一律 LF、UTF-8 无 BOM；README 生成器输出同款（§6.2-③ 常驻断言）。

## 9. 验收口径（命令 + AC↔证明映射 + E2E 点位）

**BUILD 每步验证**（红→绿收尾；0021 SPEC §10-① 勘误沿用：`npm test -w
@agentflow/server` 不存在，以 build:server 代）：

```
npm run build:shared && npm test -w @agentflow/shared && npm run build:server
```

**终轮收尾门禁**（BUILD 出提交前 + VERIFY 复跑，四条全绿）：

| # | 命令 | 证明 |
| --- | --- | --- |
| 1 | `npm run build` | shared+web 构建通过（8 新 node.ts 进 dist、README 为文档不进构建、web 打包零破） |
| 2 | `npm run gate` | 8 场景 diffPx=0（AC5；静态托管证明力边界如实——在线分支由 AC6 补证） |
| 3 | `npm test` | 根链全绿：既有 8 项 + 批次 1 四文件 + 批次 2 增量（终态断言 + readme-consistency）（AC1/AC2/AC3/AC4/AC8 前半/AC9 前半） |
| 4 | `npm run smoke:server` | 后端 E2E 零回退、exit 0（AC8 后半；V09 时点性假红沿 0018/0021 先例：产品提交落地后 CLOSE 复跑自愈，含 Z01-Z04 恢复确认） |

**手动 E2E 点位（AC6，在线态五点位，本轮不可替代）**：`npm start` 起后端 + 浏览器开
`http://localhost:3000`，逐点：① 启动日志出现「⚡ 执行后端已连接」（ENGINE.probe，
app.js:2044 起）；② 画布放 LLM 节点开属性面板，模型下拉被后端 `provider.models`
覆写（app.js:2055 真实执行）；③ 覆写后当前取值仍在 options 内；④ 控制台零
TypeError；⑤ trigger「触发方式」切「定时触发」→ Cron 行显、切回「手动触发」→ 隐
（`if` 编译产物行为落点 app.js:763）。REPORT 落证据（截图或 DOM 断言输出 + 指针；
Windows 本机参考级，如实标注——0021 REPORT 先例取证形态）。

**VERIFY 一次性快照再生产对照（AC1 REPORT 证据形态，迁移 SPEC §2 命令）**：
`npm run build:shared` 后 `node -e "import('./packages/shared/dist/index.js').then
(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > /tmp/baseline.
check.json`，与在库基线 `cmp` 输出空 + sha256 一致（`08ba1229…f275` / 11521 字节；
本 SPEC 会话已复核在库基线即此值）。

**AC↔证明映射**：AC1→门禁 3 中 synthesis 快照常驻断言 + 再生产对照；AC2→门禁 3
（synthesis 六行真值表回归）；AC3→门禁 3（守卫测试僵尸清单精确断言 + sum===33，
批次 2 零新僵尸/零接通）；AC4→`git diff --stat -- packages/shared/test/{contract,
defs-drift,events-negative,handlers-coverage}.test.mjs` 输出空 + 门禁 3；AC5→门禁
1+2；AC6→五点位在线 E2E；AC7→`git diff -- apps/web` 恒空 + synthesis 可写性常驻
断言；AC8→§5.8 八指针（app.js:2055/:193-197/:1866/:103/:178、engine.ts:128/:23-24、
handlers+llm 的 p.<key>）行为由 AC7 静态链 + AC3 守卫 + AC6 点位共证 + 门禁 3+4；
AC9→门禁 3（终态断言残留=0 + D.size===16 + readme-consistency 三 test）+ 生成器
幂等（`node tools/gen-node-readmes.mjs` 重跑后 `git diff --stat` 输出空）+
events.ts diff 恰 +1 行 + 产品提交恰一个且 `git show --numstat` = §8 白名单；
AC10→CLOSE 终局（协调者执行）：BK-0021/BK-0023 置 done、issue#11（gh 亲核 OPEN
实况，PRD 存证）关单 + 🤖 终轮说明评论附证据指针（AC1 cmp/sha256 + AC5 gate +
AC6 REPORT 路径）、BACKLOG/metrics「#11 已提前关单」旧记载勘误回写。

## 10. 实施序（红→绿，给 BUILD）

0. `npm run gate` 确认基线绿（存量差异不算自己头上）。
1. nodes-dirs 终态断言翻转 + 计数断言（**红**：8 键仍内联、目录 8≠16）。
2. 8 目录逐个迁移（每目录一步：新建 node.ts → nodes.ts 加 import + 该键换
   `synthesize(loadJsonDef(...))` → `npm run build:shared && npm test -w
   @agentflow/shared`，**synthesis 快照常驻比对每步必绿**（不变式 A 逐步成立）；
   schema 正例随 loadJsonDef 自动覆盖（§11 风险 2 的先跑正例即此步））。
3. 第 8 目录落地 → nodes-dirs 全绿（**残留=0 + D===R=16**）；nodes.ts 头注更新。
4. readme-consistency.test.mjs 落盘（**红**：README 未生成）。
5. gen-node-readmes.mjs 落盘 → `npm run build:shared` → `node tools/gen-node-
   readmes.mjs` → 17 份 README 入库 → 回比测试**绿**。
6. 生成器幂等自检：重跑一次 → `git diff --stat -- packages/shared/src/nodes
   tools/gen-node-readmes.mjs` 输出空。
7. BK-0023：events.ts +1 行注释（§7 形态）→ events-negative 回归绿。
8. 终轮收尾门禁四条（§9 表）全绿。
9. 恰一个产品提交（Conventional Commits，建议 `refactor(shared): BK-0021 批次2
   NDP 终轮——余8目录+README生成器+终态断言+在线E2E+BK-0023注释（内容零漂移）`），
   提交内容 = §8 白名单。

## 11. 风险与回滚（终轮特定；通则继承迁移 SPEC §8）

| 风险 | 对策（本 SPEC 落点） |
| --- | --- |
| README 手改/生成器 bug 漂移 | §6.2 双防线：表格回比 + temp 重生成逐字节比对（含手写 MANUAL_NOTES 部分）；生成物头部「勿手改」警示 |
| 批次 2 数据暴露 schema 误拒（空 outputs/双 inputs/list 端口） | 预判零缺口（本会话核 nodes.schema.ts：`inputs/outputs` 为无 min 长度数组、`net/human/data/llm` kind 均在 CapabilitiesJsonSchema 白名单）；若真拒属 nodes.schema.ts 微调——实施发现逐条留档（§8 例外口径），不静默放宽、不视为批次 1 缺陷回改 |
| 8 目录 identity/参数文案转写笔误（润色/漏键/错序） | §3 定界表 + 快照 Buffer 级比对首异字节提示 + defs-drift 33/33 零改动双保 |
| nodes.ts 键序错排（import 序误当声明序） | §4-2 键序定死 + 快照比对（键序漂移即字节异）+ nodes-dirs D ⊆ keys |
| events.ts 注释夹带（超注释面） | §7 形态定死一行；AC9 diff 恰 +1 行断言 |
| 生成器行数贴 200 上限 | §5.4 对策（文案精炼/模板压缩，不拆文件） |
| 在线 E2E 环境依赖 | VERIFY 阶段 test-manager 亲跑（0021 先例）；Windows 参考级如实标注 |
| smoke V09 时点性假红 | §9 门禁 4 口径：产品提交后 CLOSE 复跑自愈 |

回滚 = `git revert` 本迭代产品提交（唯一手段，禁 force/reset；两批次各自提交、
后批先 revert——迁移 SPEC §8）。纯存储形式重组 + 一行注释：无数据迁移（存量
workflow JSON/localStorage/SQLite 零涉及）、无依赖增减、无 env 变更。revert 后
nodes.ts 回到批次 1 形态（8 目录 + 8 内联），快照比对仍绿（基线本就从原状生成）；
17 份 README 与生成器留库无害（readme-consistency 将红——回滚场景下随产品提交
一并 revert 即不存在该态；若仅 revert 批次 2 提交，测试与生成物同在其内，一致回退）。

## 12. 与上游文档的偏差/定稿记录（SPEC 评审项，随迭代目录留档）

1. **生成器数据源 = dist**：迁移 SPEC §3.4 定了生成器职责与产物，未定数据源；
   本 SPEC 定稿 dist import（§5.1 理由）。NDP §3「README.md 由 node.ts 生成」的
   语义不受影响（dist 即 node.ts 的 tsc 逐字编译产物）。
2. **手写文案持有处 = 生成器内 MANUAL_NOTES 常量**：NDP §8「人工只写能力与护栏
   引注与现状备注」未定持有位置；直接手改生成物会破坏幂等与回比双防线，故单一
   持有于生成器（人工撰写、生成器持有、测试守护）。
3. **readme-consistency 落位 = 独立文件**：迁移 SPEC §3.4 / PRD 均留「独立或并入
   nodes-dirs，SPEC 定稿」——定独立（关注点分离：目录制加载机制 vs 文档一致性；
   两文件各自预算独立、失败诊断清晰）。
4. **批次 2 binding.capabilities 取值**：NDP §7.2 给 kind 语义表未逐节点定值；
   本 SPEC §3 按「handler 实况」定值（同批次 1 先例：http→net.guarded、code→
   exec.sandboxed）；approval 含 `llm:true` 系互审裁决路径如实声明
   （approval-review.ts:17/78 generateText）。capabilities 不进合成输出（仅协议
   声明），对不变式 A 零影响。
5. **总索引 README 生成者**：NDP §3 写「由聚合层生成」——迁移 SPEC §3.4 已定稿为
   `tools/gen-node-readmes.mjs` 生成（「聚合层」广义=shared 侧，避免运行时耦合），
   本 SPEC 沿用。
