# SPEC · 迭代 0003 · BK-0003 契约测试补齐：DEFS 漂移防护（技术规格）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 11:47
> 输入：本目录 PRD.md（需求条目 REQ-0003-01~04、验收 AC1~AC6）+ 代码只读核实与实测（本会话）。
> 架构决策：**无需 ADR**（needsAdr=false）。理由：本项不存在架构选型——唯一产品源码触点
> 是 PRD 已预授权的候选机制（`engine.ts` 零行为导出，PRD REQ-0003-03）；根 test 链串联属
> 构建配置调整（宪法第 4 条「不适用」清单）；不触 UI 三层，不动 DEFS 被保护对象。

## 0. 事实基线（本 SPEC 会话实测，全部可复现）

| # | 事实 | 核实方式（本会话） |
| --- | --- | --- |
| F1 | 16 节点 × 33 参数默认值全表与 `packages/shared/src/nodes.ts:9-107` 一致（逐值见 §4.1 期望表） | `node -e` import `packages/shared/dist/index.js` 逐项打印，TOTAL=33 |
| F2 | 后端 handler 键集 = `BASIC_HANDLERS`（`apps/server/src/handlers.ts:13`，15 节点键）+ engine 注入 `llm`（`apps/server/src/engine.ts:26-29`）+ `__pass`，⊇ NODES 16 键成立，额外键仅 `__pass` | `node -e` 同时 import 两个 dist 与 shared dist 做集合比对，`superset? true extra: __pass` |
| F3 | `import('apps/server/dist/engine.js')` 在无密钥环境成功且无副作用：`config.ts` 全部环境变量可选（`apps/server/src/config.ts:5-7`），kb/tools/expr/code/util 均无 import 期副作用（顶层仅常量与函数定义） | `node -e` 动态 import 成功；逐文件 head 核查顶层语句 |
| F4 | `engine.js` 当前**未导出** `HANDLERS`（模块唯一导出为 `executeWorkflow`，engine.ts:32） | 同上实测 `m.HANDLERS === undefined` |
| F5 | 基线 `npm test`（= `build:shared && npm test -w @agentflow/shared`）全绿：tests 5 / pass 5 / fail 0 | 本会话根目录实跑，输出计数 |
| F6 | CI `contracts` job（ubuntu-latest）= `npm ci` + `npm test`（`.github/workflows/ci.yml:33-42`）→ 根 test 链变更自动生效于 CI，**无需改 CI 配置** | 读 ci.yml 全文 |
| F7 | `node --test`（cwd=packages/shared）递归发现 `test/*.test.mjs`；既有 `contract.test.mjs` 即此机制发现 | F5 实跑即证（其位于 `packages/shared/test/`） |
| F8 | §4.2 的 12 条事件反例**全部**被当前 `RunEventSchema` 拒绝；正例对照（`iteration:null`、`lvl` 缺省）放行 | `node -e` 逐条 `validateEvent` 实测：rejected 12/12，positive controls pass |

## 1. 方案总览（5 项决策）

| 决策 | 内容 | 理由 / 被否候选 |
| --- | --- | --- |
| D1 | REQ-0003-03 机制：`engine.ts:26` 既有 `const HANDLERS` 前加 `export` 关键字，测试动态 import `apps/server/dist/engine.js` 读取**真实组装产物**的键集 | PRD 候选①原样采用：触点最小（一词）、测试零组装（约束③）。被否：测试自行 import handlers/llm 两 dist 组装——违反约束③（把 engine.ts:26-29 的知识复制进测试，制造新漂移面）；被否：新建 handler-table.ts 中间模块——引入新文件与改 import 拓扑，比一词导出侵入大，无额外收益 |
| D2 | 构建前置（PRD REQ-0003-03 约束②）：**选「test 链先行构建」**——根 `scripts.test` 改为 `build:shared → build:server → test`；测试内再做 existsSync 防御性检查作为第二道保险（直接 `npm test -w @agentflow/shared` 裸跑时给出可操作报错，**绝不静默跳过**） | 链式先行构建根除「陈旧 dist 假绿」（断言打到旧产物）；CI 自动继承（F6）。被否：仅靠测试内报错——dist 存在但陈旧时仍可能假绿。顺序理由：server 的 tsc 经 node_modules 符号链接解析 `@agentflow/shared` 的 types（指向 dist），故 shared 必须先建 |
| D3 | 文件布局：`contract.test.mjs` **原样不动**（AC5 由构造保证）；新增 3 个文件与 REQ-0003-01/02/03 一一对应（发现机制见 F7） | 一文件一 REQ，VERIFY 计数与 AC 映射直读；三文件均 ≤120 行（远低于 400 行上限）。被否：全部塞进 contract.test.mjs——单文件膨胀且「既有 5 测试语义不变」要靠 review 而非构造保证 |
| D4 | 事件反例定稿 **12 条**（PRD 下限 8），四类失败形态各 ≥1，覆盖 12 个事件族（PRD 下限 6），清单已逐条实测被拒（F8） | 超配到 12 是因为成本为零（表驱动）且每族一条可防「只护住 run:* 族」的偏科；正例回放留在 contract.test.mjs 不动 |
| D5 | 断言形态：**字面量期望表**（不派生）+ 每节点键集 deepEqual（双向抓增删改）+ 逐参数 `assert.equal`（失败信息含 `type.k`）+ 全表计数 33 自检 | PRD REQ-0003-01 明令禁止从 NODES 派生；键集断言补上 deepEqual 值断言抓不到的「新增/删除参数」形态；计数自检防期望表自身被误删行 |

## 2. 受影响文件清单（改动面全闭包，别无其他）

| # | 文件 | 动作 | 行为影响 |
| --- | --- | --- | --- |
| 1 | `apps/server/src/engine.ts` | 修改 **1 行**：第 26 行 `const HANDLERS` → `export const HANDLERS`（类型注解与表内容逐字不动） | **零行为**：仅新增模块导出；`executeWorkflow` 及 fallback 逻辑（engine.ts:99）不变 |
| 2 | `packages/shared/test/defs-drift.test.mjs` | 新增（约 90 行，REQ-0003-01，§4.1） | 纯测试 |
| 3 | `packages/shared/test/events-negative.test.mjs` | 新增（约 100 行，REQ-0003-02，§4.2） | 纯测试 |
| 4 | `packages/shared/test/handlers-coverage.test.mjs` | 新增（约 80 行，REQ-0003-03，§4.3） | 纯测试 |
| 5 | `package.json`（根） | 修改 **1 行**：`scripts.test`（§4.5） | 构建配置；`gate`/`smoke:server`/`build*`/`start`/`dev:*` 全部不动 |

**不触碰清单**（护栏重申）：`packages/shared/src/nodes.ts` / `events.ts`（DEFS 是被保护对象）、
`packages/shared/test/contract.test.mjs`（既有 5 测试原样）、`apps/web/**`、
`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、`.github/workflows/ci.yml`
（test 链变更经 F6 自动生效，改 CI 反而越权）、`CONSTITUTION.md`、`AGENTS.md`。

## 3. 模块边界

1. **defs-drift / events-negative**：只 `import '../dist/index.js'`（与 contract.test.mjs:8 同源同深度）；期望值/坏样本全部为**文件内字面量**，不 import 产品源码、不从 NODES 派生任何期望。
2. **handlers-coverage**：唯一跨包触点 = 动态 `import(new URL('../../../apps/server/dist/engine.js', import.meta.url).href)`——只读**构建产物**（与既有 legacy 断言的 `new URL('../../../apps/web/...', import.meta.url)` 同一相对深度手法，contract.test.mjs:66）；不 import engine 源码、不复刻 handler 组装（REQ-0003-03 约束③）、不起服务进程、不读写 `data/`。
3. **engine.ts**：触点仅 `export` 关键字。不为测试加任何新常量、新函数、新参数（如「键集快照」派生量也不加——导出本体即最简）。
4. **根 package.json**：仅 `scripts.test` 一行；不动其他 script 与依赖声明。
5. **测试运行边界**：所有新测试均在 `node --test` 进程内完成（cwd=packages/shared），无网络、无子进程、无 fs 写入；Windows 兼容路径一律经 `import.meta.url`（PRD 非功能 4）。

## 4. 详细设计

### 4.1 `defs-drift.test.mjs`（REQ-0003-01 · 默认值 33/33 全量断言）

文件头注释（非功能 3 的落点）：

```
期望值表源自 2026-10 定稿 DEFS（packages/shared/src/nodes.ts），宪法保护对象。
本测试变红 = 出现未经 ADR 的契约变更——先走宪法第 3 条流程，再改本表。
```

字面量期望表（**本会话 node 实测快照，F1**；BUILD 逐字抄录，禁手打重写防笔误——建议从本节复制）：

```js
const EXPECTED_DEFAULTS = {
  trigger:    { mode: '手动触发', cron: '0 9 * * 1-5', path: '/api/run' },
  userinput:  { var: 'question', vtype: '文本', req: true, defv: '如何申请退货?' },
  llm:        { model: 'GLM-4.7', sys: '你是智能客服助手，回答需准确、简洁、友好。', temp: 0.7, max: 2048 },
  prompt:     { tpl: '你是一名金牌客服。请结合以下资料回答用户问题：\n{{context}}\n\n用户问题：{{question}}' },
  retrieval:  { kb: '产品手册 v2.3', topk: 3, th: 0.5 },
  websearch:  { eng: 'Bing', max: 5 },
  http:       { m: 'GET', url: 'https://api.example.com/v1/orders', to: 30 },
  code:       { lang: 'Python', code: '# 处理输入后返回\nresult = input\nreturn result' },
  notify:     { ch: '邮件', to: 'support@team.com' },
  condition:  { expr: 'confidence > 0.7' },
  loop:       { max: 10, conc: false },
  delay:      { s: 2 },
  merge:      { mode: '等待全部' },
  reply:      { tpl: '{{content}}' },
  setvar:     { name: 'answer' },
  approval:   { role: '值班经理', to: '挂起' },
};
```

断言序列（一个 `test()` 内四步，逐层设防）：

1. **全表计数自检**：`assert.equal(Object.values(EXPECTED_DEFAULTS).reduce((n,e)=>n+Object.keys(e).length,0), 33, '期望表参数总数应为 33——表自身被误改')`（D5，防期望表丢行后「抽样假绿」）。
2. **节点键集对表**：`assert.deepEqual(Object.keys(NODES).sort(), Object.keys(EXPECTED_DEFAULTS).sort(), ...)`——新增/删除第 17 种节点必须红。
3. **逐节点键集 deepEqual**：`assert.deepEqual(Object.keys(paramDefaultsOf(type)).sort(), Object.keys(EXPECTED_DEFAULTS[type]).sort(), \`\${type} 参数键集漂移：DEFS=[\${实际}] vs 2026-10 定稿=[\${期望}]\`)`——抓参数新增/删除/改名。
4. **逐参数值断言**：`assert.equal(paramDefaultsOf(type)[k], EXPECTED_DEFAULTS[type][k], \`\${type}.\${k} 默认值漂移（未经 ADR 的 DEFS 变更？）\`)`——满足「失败信息含 type 与 k」（AC1）。

`paramDefaultsOf('__unknown__')` 返回 `{}` 的断言已在 contract.test.mjs:35 存在，本文件不重复。
导入来源：`import { NODES, paramDefaultsOf } from '../dist/index.js';` + `node:test` + `node:assert/strict`（与既有文件同口径，零新依赖）。

### 4.2 `events-negative.test.mjs`（REQ-0003-02 · 事件反例 12 条）

表驱动，每条 `{ id, shape, family, why, ev }`；**12 条全部本会话实测被当前 schema 拒绝（F8），BUILD 照抄零惊喜**：

| id | shape（失败形态） | family（事件族） | 坏样本 `ev`（完整字面量） | why（违反的契约点） |
| --- | --- | --- | --- | --- |
| N01 | 必填缺失 | run:accepted | `{ type:'run:accepted' }` | 缺 runId（events.ts:9） |
| N02 | 必填缺失 | approval:required | `{ type:'approval:required', nodeId:7, title:'转人工审批', role:'值班经理', inputPreview:'预览' }` | 缺 runId（events.ts:26） |
| N03 | 必填缺失 | cond | `{ type:'cond', id:5, title:'置信度判断' }` | 缺 branch（events.ts:23） |
| T01 | 类型错误 | node:delta | `{ type:'node:delta', id:4, text:99 }` | text 非串（events.ts:14） |
| T02 | 类型错误 | run:progress | `{ type:'run:progress', done:3, total:'8', elapsed:1200 }` | total 非数（events.ts:11） |
| T03 | 类型错误 | approval:done | `{ type:'approval:done', nodeId:7, approve:'yes' }` | approve 非布尔（events.ts:27） |
| T04 | 类型错误 | run:done | `{ type:'run:done', ms:1, done:1, total:1, ok:'true' }` | ok 非布尔（events.ts:32） |
| T05 | 类型错误 | output | `{ type:'output', text:null }` | text 为 null——`z.string()` 拒 null（events.ts:25） |
| T06 | 类型错误 | node:bypass | `{ type:'node:bypass', id:'7', title:'转人工审批' }` | id 非数（events.ts:13） |
| E01 | 非法枚举 | log | `{ type:'log', msg:'x', lvl:'bad' }` | lvl 超出 `['info','sys','ok','warn']`（events.ts:24） |
| L01 | 可空性违规 | node:start | `{ type:'node:start', id:4, title:'LLM 生成回复' }` | iteration 为必填可空字段（`z.number().nullable()`，events.ts:12）——只放行 null 不放行缺失；对照组：显式 `iteration:null` 放行（F8 已验） |
| L02 | 可空性违规 | node:done | `{ type:'node:done', id:4, title:'LLM', out:null, firePort:null, iteration:'x' }` | 可空字段传非数非 null 的串（events.ts:19） |

断言序列（一个 `test()`）：

1. `assert.equal(BAD.length, 12)`；
2. **形态覆盖自检**（AC2 机器可查）：四类 shape（必填缺失/类型错误/非法枚举/可空性违规）各自 `filter(...).length >= 1`，且 `new Set(BAD.map(b=>b.family)).size >= 6`；
3. 逐条 `assert.throws(() => validateEvent(b.ev), undefined, \`\${b.id} 未被拒绝：\${b.why}\`)`。

既有 15 正例回放与 2 条旧反例（contract.test.mjs:38-61）原样保留不动（AC5）。

### 4.3 `handlers-coverage.test.mjs`（REQ-0003-03 · HANDLERS ⊇ NODES）

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { NODES } from '../dist/index.js';

const ENGINE_URL = new URL('../../../apps/server/dist/engine.js', import.meta.url);

test('后端 HANDLERS 键集 ⊇ NODES 键集（新增节点缺 handler = 红，堵 engine 静默 __pass 假成功）', async () => {
  /* D2 第二道保险：裸跑（未走根 test 链）时给出可操作报错，绝不静默跳过 */
  if (!existsSync(ENGINE_URL))
    assert.fail('apps/server/dist/engine.js 不存在——先在仓库根执行 npm run build:server（或完整 npm test）后再跑本测试');
  const { HANDLERS } = await import(ENGINE_URL.href);
  assert.ok(HANDLERS, 'engine.js 未导出 HANDLERS（engine.ts:26 应为 export const HANDLERS）');
  const keys = Object.keys(HANDLERS);
  const nodeKeys = Object.keys(NODES);
  /* ① 缺失键 = 红（engine.ts:99 会对缺失键静默回退 __pass 假成功） */
  const missing = nodeKeys.filter(k => !keys.includes(k));
  assert.deepEqual(missing, [], `以下节点类型缺后端 handler（将静默 __pass 假成功）：${missing.join(', ')}`);
  /* ② 每个节点键必须是可调用 handler（防键在而值为非函数的形似神不似） */
  for (const k of nodeKeys) assert.equal(typeof HANDLERS[k], 'function', `${k} 的 handler 不是函数`);
  /* ③ 额外键只允许 __pass（engine 内部回退专用，engine.ts:99）；出现其他额外键 = 表被污染，红 */
  const extra = keys.filter(k => !nodeKeys.includes(k));
  assert.ok(extra.every(k => k === '__pass'), `handler 表存在节点注册表与 __pass 之外的额外键：${extra.join(', ')}`);
});
```

设计要点：断言①对齐 AC3 主断言与反演口径（从 `nodeKeys` 临时剔除一键 → `missing` 非空 → 红）；
断言③用 ⊆ 而非精确等于——PRD 口径是「`__pass` 作为额外键**允许**存在」，未来若合法移除
`__pass` 回退机制不应被本测试误伤（该机制本身的运行时正确性由 smoke:server 域覆盖，不在此重复）。

### 4.4 `engine.ts` 零行为导出（D1）

`apps/server/src/engine.ts:26` 唯一改动（加一词，行内容其余逐字不动）：

```ts
export const HANDLERS: Record<string, (ctx: RunCtx, args: HandlerArgs) => Promise<NodeResult>> = {
```

- tsc（`module: NodeNext`，apps/server/tsconfig.json）在 `dist/engine.js` 产出对应 `export`；
  运行时语义零变化——模块求值顺序、表内容、`executeWorkflow` 全部不变。
- 行为零变化的证明义务由验收口径 #3/#4 承担（gate + smoke 复跑，AC6）。

### 4.5 根 `package.json` test 链（D2）

```json
"test": "npm run build:shared && npm run build:server && npm test -w @agentflow/shared"
```

- 顺序不可换：server 的 tsc 需先有 shared dist（types 经 node_modules 符号链接指向 dist）。
- CI 影响：`contracts` job 多一步 tsc 构建（ubuntu 兼容，`build:server` 仅 tsc，无原生编译、
  无 Playwright 依赖）；`ui-constitution` job 不跑 `npm test`，零影响（F6）。
- 代价评估：本地 `npm test` 增加一次 server tsc（秒级），换取「绝不断言到陈旧 dist」。

## 5. 验收口径（BUILD 自检 / VERIFY 逐条执行）

**命令序列（仓库根，顺序执行）**：

| # | 命令 | 通过标准 | 对应 |
| --- | --- | --- | --- |
| 1 | `npm run build` | exit 0（shared→web 构建完整；gate 前置） | AC6 前置 |
| 2 | `npm test`（新链：build:shared → build:server → node --test） | exit 0，`fail 0`；旧 5 测试全 pass（AC5）+ 新 3 文件全 pass；输出含新测试名与 pass 计数 | AC1/AC2/AC4/AC5 |
| 3 | `npm run gate` | 4 场景全绿、diffPx=0 | AC6 |
| 4 | `npm run smoke:server` | 33 断言全过、exit 0（engine 被导出性触及，必跑） | AC6 |
| 5 | 反演演练 a（AC1）：临时把 §4.1 期望表任一值改错 → `npm test` 红，失败信息含 `type.k` → 还原后复绿 | 红且信息可定位 → 绿 | AC1 |
| 6 | 反演演练 b（AC3）：临时在 handlers-coverage 断言输入中移除一个 nodeKey → 红（missing 非空）→ 还原复绿 | 同上 | AC3 |
| 7 | 反演演练 c（AC2）：临时把任一坏样本改成合法事件（如 N01 补上 `runId:'x'`）→ `assert.throws` 红（未抛）→ 还原复绿 | 同上 | AC2 |
| 8 | 裸跑防御（AC4）：`npm test -w @agentflow/shared`（在 dist/engine.js 缺失时，如 clean 后）→ handlers-coverage 以含「先构建」指引的报错**失败**（非 skip） | fail 且信息含 build:server | AC4 |

> 反演演练 5-7 与裸跑 8 会临时制造红灯，VERIFY 执行后必须还原并复跑 #2 复绿；
> 演练不得进入产品提交（工作区最终 diff 仅 §2 五文件）。

**手动 E2E 点位**（零行为变化的运行时抽查，验收 #3/#4 之外的第三重证据）：

- **P1 · 启动与渲染**：`npm start` → 打开 http://localhost:3000，默认工作流画布正常渲染
  （节点库 16 种、连线、面板布局与平日一致——像素级等价已由 gate 证明，此处目测抽查）。
- **P2 · 端到端事件链**：点击运行，日志面板事件流完整推进 `run:start → node:* → run:done`；
  已配密钥环境 LLM 节点有流式输出；未配密钥环境允许 LLM 节点 `node:error`，但流程必须收束
  `run:done` 且无「节点假装成功」迹象（证明 engine 导出改动零行为）。
- **P3 · 默认值人眼对照**（可选）：画布上任一 LLM 节点属性面板显示 model=GLM-4.7、temp=0.7，
  与 §4.1 期望表一致。

## 6. 风险与回退

| 风险 | 概率 | 缓解 / 回退 |
| --- | --- | --- |
| 期望表 33 项抄写笔误（PRD 风险 2） | 低 | SPEC §4.1 表为本会话机器实测快照（F1），BUILD **复制**而非手打；首跑 #2 即自纠错；VERIFY 抽 3 项与 nodes.ts 原文比对 |
| zod 语义与反例预期不符 | 已消除 | 12 条反例已全部实测被拒、正例对照放行（F8），BUILD 照抄零惊喜 |
| CI contracts job 因新增 build:server 变红（如 ubuntu tsc 差异） | 低 | `build:server` 纯 tsc 无原生依赖；若变红按 CI 日志修 tsconfig 层面问题（属构建配置常规 review 域），不得回退删测试 |
| `import engine.js` 在特定环境因传递依赖（ai/pino）加载失败 | 低 | 本机已实测成功（F3/F4 会话内 import 无错）；若 VERIFY 环境失败，按 PRD 风险 1 处理：HANDLERS 防护降范围另立项（①+② 仍独立成立），需回 PLAN 重签 |
| 演练后忘还原导致工作区脏 | 低 | §5 已要求演练后复跑 #2 复绿；产品提交前 `git status` 核对 diff 仅 §2 五文件 |

## 7. 与 PRD 的偏差声明

无。REQ-0003-01/02/04 照单实现；REQ-0003-03 约束②的二选一本 SPEC 选定「test 链先行构建」
（D2）并按约束要求写入验收命令（§5 #2）；约束③经 D1（导入真实组装产物）满足。
