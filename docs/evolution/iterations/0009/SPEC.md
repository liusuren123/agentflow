# SPEC · 迭代 0009 · BK-0005 MCP 工具能力核对：sqlite/browser 未实现项的如实降级文案与日志一致性

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 21:30
> 输入：`docs/evolution/iterations/0009/PRD.md`（逐条对齐 REQ-0005-01…06 / AC1…AC6）。
> 代码事实核对时间：2026-10-22 21:10-21:30 本会话只读核实 + `node -e` 实算（§2）+
> `npm test` 亲跑基线 8/8 绿（见 §9）。冲突顺位：CONSTITUTION.md > 代码实现 > 文档；
> 本文与 PRD 的两处事实差异已在 §2.3 如实标注（PRD 自身声明「供审计实判，不预设结论」）。
> **ADR 判定：无需 ADR**——修复全部为后端运行态文本/日志取值（PRD 触 UI 结论=否，
> 本 SPEC §8 复核成立），无架构选型、无契约变更、无 UI 接触（WORKFLOW §4 SPEC 条款
> 「涉及架构选型的写入 ADR」不触发）。

---

## 1. 范围与结论摘要

对 5 个未实现工具（sqlite.query / sqlite.execute / browser.navigate / browser.click /
browser.screenshot）× 4 个触点（模型 desc / 模型 stub 结果 / SSE 日志行 / pino 日志）
共 20 格审计矩阵：**触点 1、2 全绿（现状即如实，零改动）**；**触点 3、4 全部判不一致
（修复）**；另疑点 B（✓ 摘要行）判不一致（修复）。修复集中在 `apps/server/src` 两文件
的文本级改动（F1-F4，预计净 +17/−4 行）＋ `tests/smoke/` 新增 M01-M11 断言组。
`packages/shared/**` 与 `apps/web/**` 零改动（SSE 契约 lvl 枚举 `info/sys/ok/warn`
不动，前端零接触）；README.md 判定**不触发**条件修订（§5）。

## 2. 代码事实基线（本会话逐项核实）

### 2.1 未实现工具与如实降级现状

| 事实 | 证据（本会话 Read/grep） |
| --- | --- |
| IMPL 表 sqlite/browser = null | `apps/server/src/tools.ts:59-60` |
| TOOL_SPECS 5 未实现项 desc 带「（未实现）」前缀 | `apps/server/src/tools.ts:85-89` |
| 已实现 7 工具（filesystem×3 / fetch×2 / web-search×2）无前缀 | `apps/server/src/tools.ts:78-84` |
| stub 分支：null 组/未知工具统一挂 `async ()=>({ error:'not implemented', note:'工具 ${server}.${n} 未接入真实实现' })` | `apps/server/src/tools.ts:100`（循环体 97-101） |
| desc 装配直达模型：`tool({ description: spec.desc … })` | `apps/server/src/llm.ts:53`（装配 45-52） |
| 工具调用双路日志（唯一咽喉点：execute 回调） | pino `ctx.log.info(…,'工具调用')` `llm.ts:55`；SSE `emit('log',{lvl:'sys',msg:'🔧 工具调用 …'})` `llm.ts:56` |
| ✓ 摘要行把勾选工具全数计入，不区分 stub | `apps/server/src/llm.ts:103-105` + `capSummaryServer` `llm.ts:114-118` |
| preview 规则：`s.length > n ? s.slice(0,n)+'…' : s` | `apps/server/src/util.ts:36` |
| 「未接入」日志先例：`lvl:'warn'`（websearch 引擎） | `apps/server/src/handlers.ts:68` |
| 「未接入」日志先例：`lvl:'info'`（通知渠道，有明示文案） | `apps/server/src/handlers.ts:115-116` |
| SSE log 事件 lvl 合法值 = `['info','sys','ok','warn']` | `packages/shared/src/events.ts:24`（z.enum） |
| 前端 lvl 渲染 = CSS class 直挂，无分支踩空面 | `apps/web/src/legacy/app.js:1838-1845,2184`；`.logline.warn/.sys` 均有样式 `apps/web/src/app.css:327-329` |
| 前端注册表五服务器 12 工具、无未实现标注（冻结现状） | `apps/web/src/legacy/app.js:103-114`；设置面板 `974-997`；能力 chip `783` |
| README 对外承诺「未实现者如实告知模型」 | `README.md:58` |
| TOOL_SPECS/collectTools 仅有 llm.ts 一个消费者 | 全仓 grep（src+tests），shared 测试零引用 |

### 2.2 疑点 C 的截断事实（`node -e` 逐字符实算，2026-10-22 21:2x 本会话）

对 5 个 stub 载荷按 `util.ts:36` 规则实算 `JSON.stringify` 长度与 `preview(res,60)` 结果：

| 工具 | 载荷长度 | preview(60) 截断 | 丢失内容 |
| --- | --- | --- | --- |
| sqlite.query | 60 | 否 | — |
| sqlite.execute | 62 | 是 | 仅收尾 `"}`（2 字符，语义无损） |
| browser.click | 61 | 是 | 仅收尾 `}`（1 字符，语义无损） |
| browser.navigate | 64 | 是 | `实现"}`（4 字符，**「未接入真实实现」语义尾部受损**） |
| browser.screenshot | 66 | 是 | `真实实现"}`（6 字符，**同上**） |

### 2.3 与 PRD 的两处事实差异（如实标注）

1. **PRD 疑点 C 范围低估**：PRD 背景 4 仅列 browser.* 截断；实算为 **4/5 截断**
   （sqlite.execute 与 browser.click 亦超 60，只是丢失内容为收尾引号/花括号）。
   修复判据不受影响（见 F3），但矩阵与 REPORT 计数按 4/5 记载。
2. **PRD 疑点 A 援引的 `lvl` 合法集合**（REQ-0005-02「sys/info/warn/ok 等在用集合」）
   的权威来源是 **shared 契约枚举** `events.ts:24`（恰为 info/sys/ok/warn 四值；
   CSS 另有 `.err` 类但契约未含 err，不得使用）——本 SPEC 以契约为准收紧表述。

## 3. 审计矩阵（5 工具 × 4 触点 = 20 格；AC1 的 SPEC 形态 + 本阶段结论）

判据基准：`tools.ts:4-5` 不伪造原则；先例 `handlers.ts:68`（未接入=warn+明示文案）、
`handlers.ts:115-116`（未接入=info+明示文案——注意其差异：通知渠道有独立 out 文案
承载明示，工具调用无此冗余通道，故工具调用采纳 warn 先例）。

| 工具 | 触点1 模型 desc | 触点2 模型 stub 结果 | 触点3 SSE 日志行 | 触点4 pino 日志 |
| --- | --- | --- | --- | --- |
| sqlite.query | 一致（`tools.ts:85` 前缀直达模型，`llm.ts:53`） | 一致（`tools.ts:100` 如实载荷） | **不一致**（lvl='sys' 与成功无异 `llm.ts:56`） | **不一致**（info 级 `llm.ts:55`） |
| sqlite.execute | 一致（`tools.ts:86`） | 一致（`tools.ts:100`） | **不一致**（同上 + preview 60 截断收尾 `"}`，§2.2） | **不一致**（同触点4 行） |
| browser.navigate | 一致（`tools.ts:87`） | 一致（`tools.ts:100`） | **不一致**（同上 + 截断丢失「实现」语义尾部，§2.2） | **不一致**（同上） |
| browser.click | 一致（`tools.ts:88`） | 一致（`tools.ts:100`） | **不一致**（同上 + 截断收尾 `}`，§2.2） | **不一致**（同上） |
| browser.screenshot | 一致（`tools.ts:89`） | 一致（`tools.ts:100`） | **不一致**（同上 + 截断丢失「真实实现」尾部，§2.2） | **不一致**（同上） |

**疑点实判（PM 预审不预设结论，本节为 SPEC 阶段实判，BUILD/VERIFY 复核）：**

- **疑点 A（日志级别不一致）：成立 → 修复 F2**。stub 调用与真实调用在 SSE（sys）与
  pino（info）两路不可区分，违背「一眼分辨」（用户故事 1）；「未接入」先例为 warn
  （`handlers.ts:68`）。
- **疑点 B（✓ 摘要不区分 stub）：成立 → 修复 F4**。`capSummaryServer`（`llm.ts:114-118`）
  把 stub 计入「Y 工具」且无任何未接入提示，属于 PRD 非功能 1「美化成类似成功的形态」。
- **疑点 C（preview 截断吞尾）：成立且范围修正（4/5，§2.3-1）→ 修复 F3**。

**REPORT 要求（AC6）**：以修复后状态重录本矩阵终论 + 计数「发现 10 格不一致
（触点3×5 + 触点4×5）/ 修复 F1-F4 / 维持 10 格（触点1×5 + 触点2×5）」，另记疑点
A/B/C 实判结论；不得为凑改动虚构不一致（本 SPEC 判定均有实算/代码指针，无虚构）。

## 4. 修复规格（F1-F4；全部限 `apps/server/src` 运行态文本与日志取值）

> 原则：如实优先于美观（PRD 非功能 1）；格式稳定优先（只改级别/边界/追加分项，
> 不重排既有行结构）；`lvl` 只取契约枚举值（`events.ts:24`）。下列「目标形态」为
> BUILD 的实现锚点（等价微调允许，语义与锁点字符串须保持，见 §6 M08-M11）。

### F1 · tools.ts：stub 工厂显式化 + STUB_MARK 标记（载荷文本逐字保留）

- 新增导出（置于 `ToolSpec` 接口 `tools.ts:75` 附近）：
  ```ts
  /* ---------- 如实降级 stub（迭代 0009 · BK-0005）----------
   * 载荷逐字保留原文；STUB_MARK 供 llm.ts 区分日志级别与摘要——
   * tools.ts 无 emit/pino 通道，运行态观测一律归 llm.ts 单一出口。 */
  export const STUB_MARK = '__stub';
  export function stubOf(server: string, name: string): ToolImpl {
    const f: ToolImpl = async () => ({ error: 'not implemented', note: `工具 ${server}.${name} 未接入真实实现` });
    (f as any)[STUB_MARK] = true;
    return f;
  }
  export const isStubImpl = (f: unknown): boolean =>
    typeof f === 'function' && (f as any)[STUB_MARK] === true;
  ```
- `collectTools` stub 分支（`tools.ts:100`）改为 `else out.set(`${server}.${n}`, stubOf(server, n));`
- **不变**：stub 载荷两字段文本、IMPL null 结构（`tools.ts:59-60`）、TOOL_SPECS 全部
  desc（审计判一致的触点 1/2 零改动）。

### F2 · llm.ts：stub 调用的 SSE lvl 与 pino 级别路由（疑点 A）

execute 回调（现 `llm.ts:53-58`）目标形态：

```ts
zTools[safe] = tool({ description: spec.desc, inputSchema: z.object(shape), execute: async (a: any)=>{
  const res = await impl(a || {});
  const stub = isStubImpl(impl);   /* 未接入工具如实降级（tools.ts STUB_MARK） */
  const bound = stub ? 200 : 60;   /* F3：stub 载荷 ≤66 字符，200 保证如实 note 不被截断 */
  ctx.log[stub ? 'warn' : 'info']({ tool: name, stub, args: preview(a, 40), result: preview(res, bound) }, '工具调用');
  emit('log', { lvl: stub ? 'warn' : 'sys', msg:`🔧 工具调用 ${name}(${preview(a,40)}) → ${preview(res,bound)}` });
  return res;
}});
```

- import 行改为 `import { collectTools, isStubImpl, TOOL_SPECS } from './tools.js';`
- pino 载荷新增布尔字段 `stub`（运维自解释 warn 来源；结构化日志运行态取值，非 SSE 契约）。
- msg 文本不变（修复 C 后「未接入真实实现」全文可见 + warn 色，已满足「一眼分辨」，
  不额外加前缀，保格式稳定）。
- **明确不动**：`llm.ts:67`（🤖 模型请求调用工具——执行前预告，stub/真实同义，改之反而
  混淆两个事件）；`llm.ts:77`（工具循环异常 warn）；`llm.ts:105` lvl='ok'。

### F3 · preview 截断边界：stub 调用 60 → 200（疑点 C，SSE 与 pino 双路）

已并入 F2 代码（`bound`）。真实调用维持 60 不变（真实结果可能巨大，preview 存在即为此，
只放宽 stub 路径——其载荷有界（≤66）且语义关键）。

### F4 · ✓ 摘要行：stub 分项计数（疑点 B）

- `llm.ts:39` 一带：`let text = '', tokens = 0, stubCount = 0;`
- 工具循环（`llm.ts:45` 起）内累计：`if(isStubImpl(impl)) stubCount++;`
- 摘要行（现 `llm.ts:104`）目标形态：
  ```ts
  const cap = capSummaryServer(n);
  const mcpTxt = cap.servers ? ` · MCP ${cap.servers} 服务/${cap.tools} 工具${stubCount ? `（${stubCount} 未接入）` : ''}` : '';
  const capsTxt = mcpTxt + (cap.skills ? ` · 技能 ${cap.skills}` : '');
  ```
- 语义：stubCount 覆盖 null 组工具与未知工具名（`collectTools` 对两者都挂 stub，
  `tools.ts:100`），与「未接入」语义一致；无 stub 选中时摘要行逐字节同现状。

### 规模预算（PRD 非功能 3）

tools.ts 约 +10/−1；llm.ts 约 +7/−3；合计净 +17/−4 ≪ 40 行文本级上限；均为存量文件
（不受新增 400 行约束）；新增唯一源文件为测试 `tests/smoke/mcp-stubs.mjs`（§6，≤400）。

## 5. 明确不改清单（含 README 条件项判定）

- **TOOL_SPECS desc / stub 载荷文本**：触点 1/2 判一致（§3），零改动（AC6「维持」侧）。
- **README.md:58：不触发修订**（REQ-0005-05 条件不成立）。理由：该行承诺「filesystem/
  fetch/web-search 已实现；未实现者如实告知模型」——修复 F1-F4 只是把既有承诺在日志
  观感上做得更可分辨，能力口径（哪些实现/哪些如实降级）零变化。SPEC 依 REQ-0005-05
  「无口径变化则不动（避免为改而改）」判定；产品提交 diff 不得出现 README.md。
- `apps/web/**`、`packages/shared/**`、`tools/pixel-gate/**`、`tests/golden/**`、
  `.github/**`、`CONSTITUTION.md`、`AGENTS.md`、根 `package.json`：零改动
  （REQ-0005-03/06；**新断言不新增 npm script**，落点既有 `smoke:server` 入口，§6）。

## 6. 回归断言设计（REQ-0005-04 / AC3；落点=既有 smoke 入口扩展）

### 6.1 载体与链路

- **新文件** `tests/smoke/mcp-stubs.mjs`：导出 `runMcpChecks(C)`（C = smoke 的 Checker），
  纯离线模块级断言（不经 HTTP、不起服务、不依赖模型密钥/外网/sqlite/browser 环境）。
- **既有文件** `tests/smoke/smoke-server.mjs`：+1 import、+1 调用（约 3-4 行），插在
  **P 组 preflight 之后、H 组起服务之前**（P 已验证 dist 在位；M 组失败计入汇总但不
  fail-fast，不影响后续组）。
- 导入路径：`await import('../../apps/server/dist/tools.js')`（从 `tests/smoke/` 相对）；
  先例=`packages/shared/test/handlers-coverage.test.mjs:22-26`（同构 dist 直连 + 缺产物
  可操作报错的第二道保险，绝不静默跳过）。源锁组 `readFileSync` 读 `apps/server/src/llm.ts`。
- 运行链：`npm run smoke:server`（根 script 既有；P01/P02 已要求先 `npm run build` +
  `npm run build:server`，与 §9 验收命令一致，不另造机制——PRD 风险 4 的处置）。

### 6.2 断言清单（M01-M11；逐条命名、失败信息含工具名）

| ID | 断言（全部离线） | 反演命中（AC3） |
| --- | --- | --- |
| M01 | `apps/server/dist/tools.js` 在位；缺失即 FAIL 并给出「先 `npm run build:server`」可操作报错 | — |
| M02 | TOOL_SPECS 键集恰为冻结 12 键（filesystem.read_file/write_file/list_directory、fetch.fetch/download、web-search.search/news、sqlite.query/execute、browser.navigate/click/screenshot；基准=前端注册表 `app.js:103-114`，宪法冻结面）；IMPL 键集恰为 5 服务器 | 键漂移即红 |
| M03 | 五未实现项 desc 均 `startsWith('（未实现）')`（逐工具命名） | 摘标记→红 |
| M04 | 七已实现项 desc 均不含「（未实现）」（逐工具命名） | 加标记→红 |
| M05 | `collectTools({sqlite:['query','execute'],browser:['navigate','click','screenshot']})` 五项：`isStubImpl===true` 且调用之 deepEqual `{error:'not implemented', note:'工具 <server>.<name> 未接入真实实现'}`（逐工具） | stub 换伪造成功载荷→红（缺 error 字段） |
| M06 | `collectTools({filesystem:[…3],fetch:[…2],'web-search':[…2]})` 七项：typeof function 且 `isStubImpl===false` | 已实现项误挂 stub→红 |
| M07 | 三向配对自愈（逐服务器组）：`IMPL[srv]===null ⟺ 该组全部 TOOL_SPECS desc 含前缀 ⟺ collectTools 挂 stub；IMPL[srv]≠null ⟺ 全无前缀且非 stub`（**BK-0008 摘除路径守护**：届时 sqlite 真接入→本断言强制摘标记删 stub） | 任一向漂移→红 |
| M08 | 源锁 `llm.ts`：`/lvl:\s*stub\s*\?\s*'warn'\s*:\s*'sys'/` 命中 | 级别路由被撤→红 |
| M09 | 源锁 `llm.ts`：`/ctx\.log\[stub\s*\?\s*'warn'\s*:\s*'info'\]/` 命中 | 同上（pino 路） |
| M10 | 源锁 `llm.ts`：`/const\s+bound\s*=\s*stub\s*\?\s*200\s*:\s*60/` 命中 | 截断边界回退→红 |
| M11 | 源锁 `llm.ts`：`/stubCount\s*\?\s*`（\$\{stubCount\}\s*未接入）`\s*:\s*''/` 命中 | 摘要分项被撤→红 |

- **覆盖边界如实声明**：触点 1/2（desc/stub 载荷）有运行时行为断言（M02-M07）；触点 3/4
  的**取值路由**由源锁（M08-M11）+ §9 手动 E2E 覆盖——llmHandler 需真实模型密钥才进
  工具循环（`llm.ts:15-18` getModel 门槛），离线不可驱动，此边界不得虚报为「已自动化」。
- 汇总口径：既有 39 断言（`STATE.md:13` 口径）+ M 组 11 项 → 标准跑法预期
  `==== smoke:server：50 passed / 0 failed ====`（C 组清理断言数随自建 run 数动态，
  VERIFY 以 0 failed 为准并记录实得值）。
- 反演演练（AC3，VERIFY 执行）：临时①摘某未实现项前缀→M03 红；②给某已实现项加前缀
  →M04 红；③把某 stub 换成 `async ()=>({ok:true})`→M05 红；④删 M08 任一锁点行→M08 红；
  演练后还原复绿（全部在本地工作区做，不入产品提交）。

## 7. 受影响文件清单（产品提交白名单，AC5 机器核对）

| 文件 | 改动 | 性质 |
| --- | --- | --- |
| `apps/server/src/tools.ts` | F1：stubOf/isStubImpl/STUB_MARK 导出 + stub 分支改挂工厂（净约 +10/−1） | 运行态文本/标记 |
| `apps/server/src/llm.ts` | F2/F3/F4：stub 路由、bound、stubCount、摘要分项（净约 +7/−3） | 运行态日志取值 |
| `tests/smoke/mcp-stubs.mjs` | **新增** M01-M11（≤400 行） | 测试 |
| `tests/smoke/smoke-server.mjs` | +import +调用（约 +3/−1） | 测试挂接 |

核对命令（VERIFY）：`git show --name-only <产品提交>` 输出 ⊆ 上表四路径且不含
`README.md`（§5 判定）；`git diff <base>..<产品提交> -- apps/server/src` 净行数
符合 §4 预算量级（文本级）。迭代目录产物（本 SPEC/PRD/JOURNAL/REPORT 与 STATE/
BACKLOG/metrics）走归档提交，不计入产品提交（WORKFLOW §4 CLOSE 口径）。

## 8. 模块边界

- **tools.ts**：唯一持有 IMPL/TOOL_SPECS/collectTools/stub 工厂与 stub 判定
  （`isStubImpl`）；**不做任何日志**（无 emit/pino 通道，结构性如此，F1 注释明示）。
- **llm.ts**：工具调用的**唯一观测出口**——SSE（emit）与 pino（ctx.log）全在 execute
  回调咽喉点（`llm.ts:53-58`）与 ✓ 摘要行；对 stub 的认知只经 `isStubImpl` 问询，
  不自持 IMPL 知识。
- **shared events.ts:24**：lvl 取值的唯一合法域（info/sys/ok/warn），本迭代零改动，
  修复只用枚举内既有值。
- **前端 app.js/app.css**：冻结面。lvl→CSS class 直挂无 switch（`app.js:1841`），
  `warn`/`sys` 均有既有样式（`app.css:328-329`），PRD 风险 3 就此闭合（读前端允许、
  改禁止——本 SPEC 只读引用）。
- **tests/smoke**：M 组只依赖 dist/tools.js（行为）与 src/llm.ts（源锁），不 import
  llm/providers（避免 env 副作用与密钥依赖）。

## 9. 验收口径（命令 + 手动 E2E 点位）

### 9.1 命令门禁（BUILD 后逐条执行，VERIFY 复核）

| 命令（仓库根） | 通过判据 | 对应 |
| --- | --- | --- |
| `npm run build` | shared+web 构建成功（gate 前置） | AC4/ask 口径 |
| `npm run build:server` | TS 编译成功（F1/F2 类型无误 + M 组 dist 前置） | PRD 依赖 |
| `npm run gate` | 4 场景全绿 diffPx=0（零渲染路径接触的机器证据） | AC4 |
| `npm test` | 8/8 绿（本会话基线亲跑 8/8：`✔ … ℹ tests 8 / pass 8 / fail 0`；契约零变化的机器证据） | AC4/REQ-0005-03 |
| `npm run smoke:server` | 0 failed（预期 50 passed：39+M11；含 M01-M11 全绿） | AC3/AC4 |
| `git show --name-only <产品提交>` | ⊆ §7 白名单四路径 | AC5 |

### 9.2 手动 E2E 点位（需 `apps/server/.env` 配任一模型密钥；离线断言不可替代的部分）

1. **E2E-1 · stub 调用日志行可分辨**：建 userinput → llm 工作流，LLM 节点 mcp 勾选
   `sqlite.query` + `filesystem.read_file`，系统提示词引导模型「先读文件再查数据库」；
   跑通后日志面板：sqlite.query 行为 **warn 色（橙）**且尾部
   `…未接入真实实现"}` 全文可见（不再 `…未接入真实…` 截断）；filesystem.read_file 行
   仍 sys 色同旧。模型是否调用有不确定性——必要时调整提示词重试（判据只看已发生行的
   级别与尾部，不依赖固定调用次数）。
2. **E2E-2 · ✓ 摘要分项**：同一 run 的 ✓ 行含 `· MCP 2 服务/2 工具（1 未接入） ·`；
   另跑一个只勾 filesystem 三工具的 LLM 节点 → ✓ 行无「未接入」分项（逐字节同旧格式）。
3. **E2E-3 · pino 双级**：server 控制台 JSON：stub 调用 `"level":40`（warn）且
   `"stub":true`；真实调用 `"level":30`（info）无 stub 字段。
4. **E2E-4 · 无 MCP 回归**：不勾任何 MCP 的 LLM 节点跑通，摘要行与日志行为与基线一致。
5. **E2E-5 · 前端冻结目检（可选确认项）**：设置面板 MCP 五服务器/12 工具渲染如常
   （零前端 diff 的人眼复核，非判定必需——gate 已机器证明）。

### 9.3 VERIFY 附加（AC3 反演演练）

按 §6.2 反演列做红绿双向演练（4 种篡改各自对应断言红、还原复绿），证据贴 REPORT。

## 10. 风险与边界情况

1. **llm.ts:67 误改风险**：模型请求调用预告行与执行日志行是两个事件，BUILD 不得把
   F2 路由套用到 67 行（§4 已明示「不动」清单）。
2. **未知工具名**：勾选注册表外工具名（如手改 workflow JSON）→ collectTools 挂 stub
   → warn 路由 + 计入 stubCount（`tools.ts:100` else 分支天然覆盖，如实）。
3. **源锁脆弱性**：M08-M11 锁的是语义行而非全文件哈希；未来重构 llm.ts（仓内原则是
   逐字保留，重构概率低）需同步更新锁点——这是自愈断言的有意代价（防无声回退）。
4. **smoke 汇总数动态**：C 组断言数随自建 run 数浮动，REPORT 记实得值、判据 0 failed。
5. **触 UI 误判兜底**：任何 gate 场景红 → 按 WORKFLOW §4 BUILD 中止条款处置（本 SPEC
   设计上零渲染路径接触，风险为残余项）。
