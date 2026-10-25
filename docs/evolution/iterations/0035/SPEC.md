# SPEC · 迭代 0035 · BK-0038 JSON 画布节点 jsoncanvas（NDP 定义 + sink 承载 + 结构化树呈现，修宪轮·BK-9003 链批次 3·链终轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25（工作树 feat/0035-iter 内）
> 输入：`iterations/0035/PRD.md`（PLAN 产物）+ ADR-0015（定界权威：§2.3 DEFS / §3 承载 /
> §4.3 渲染 / §4.5 SSE 护栏 / §5 编排 / §6 golden / §7 jsoncanvas 行即权威字面量）+
> 本会话只读代码核实与基线实测（§0）。权威顺位：CONSTITUTION > AGENTS > WORKFLOW >
> POLICY > ADR-0015 > PRD > 本 SPEC。
> 修宪授权链（宪法第 3 条三要素齐备）：**issue#3 用户批复承继（PRD 轮 gh 亲跑复核在案：
> owner `liusuren123` 评论「批准」`createdAt 2026-10-23T15:49:32Z`、issue state=OPEN；
> 本会话复用该复核结论，未重复消耗 gh 配额——PRD §头部「授权链复核（本轮亲跑）」）
> + ADR-0015（头部状态行已载「已获用户 issue#3 批复（2026-10-23T15:49:32Z 承继）」，
> §7 jsoncanvas 行为权威字面量）+ 本迭代内 golden 增量/受限重录（§5 方案）**。
> **ADR 处置：零新 ADR（needsAdr=false）**——本迭代全部架构决策已由 ADR-0015 承载
> （迭代 0029 落盘），本 SPEC 仅消费之；golden 场景形态 ADR-0015 §6 明文委托
> （「本 ADR 只列场景形态与波及面，不写 gate.mjs 代码（各实施 SPEC 定）」）；「已获用户
> issue#3 批复」标注已在 ADR-0015 头部状态行在案，本轮回写按 PRD 受影响清单落在
> BUILD 产品提交（§8）——直系先例：0034 SPEC 头部同款裁示（同链批次 2，
> `iterations/0034/SPEC.md` 头部「零新 ADR」段），本链已两轮（0033/0034）验证该处置。

## 0. 本会话代码核实与基线实测记录（2026-10-25，工作树内只读 + 亲跑）

### 0.1 基线门禁（本会话在 `.zcode/worktree/feat/0035-iter` 内逐项亲跑）

| 命令 | 结果 |
| --- | --- |
| `npm run build` | vite 构建成功，`dist/index.html 355.12 kB`，`✓ built in 819ms` |
| `npm test` | `ℹ tests 30 · ℹ pass 30 · ℹ fail 0`（契约测试 30 项全绿） |
| `npm run gate` | **12 场景全 pass · diffPx=0**（s0~s11），「宪法门禁：通过 ✓」 |
| `npm run smoke:server` | `==== smoke:server：118 passed / 0 failed ====` |
| `git status --porcelain` | 仅 `M docs/evolution/STATE.md` + `?? docs/evolution/iterations/0035/`（机制件过程态，v3 合规，无产品改动） |

PRD 全部基数亲核命中：baseline 19 键（`node -e` 亲点）、`nodes-dirs` D===19（:31）、
defs-drift 40 参数（:39）、gate 12 场景 s0~s11（gate.mjs :237-257）、smoke 118 断言、
handlers.ts 324 行。

### 0.2 代码锚点（本会话逐一亲核，行号均为工作树现状）

- `packages/shared/src/nodes.ts`：150 行；imports :20-38（webshow :37、approval :38）；
  NODES 19 键 :117-137（reply :132、termview :133、setvar :134、webshow :135、
  approval :136）；头注「19 目录全量」:5。
- `packages/shared/src/nodes.schema.ts`：PORT_TYPES 5 枚举 :13 / WIDGETS 5 :14 /
  CATEGORIES 7 :15（PRD 冻结枚举纪律成立）；端口 id 正则 :17-19；number 约束
  （default∈[min,max]、min≤max、step>0）:137-149——`expand` 2∈[0,6]、step 1>0 合法。
- `packages/shared/src/nodes/{reply,termview,webshow}/node.ts`：三份 sink 同构样板全文
  在案（outputs `[]` / 单入 type any / `binding:{handler:...,capabilities:{data:true}}`）。
- output 类目现成员（`grep -l "category: 'output'"` 亲跑）：setvar / reply / termview /
  webshow 恰 4 行——+jsoncanvas 后 5 行，恰兑现 ADR-0015 §6「逐批 +1 至 5 行」终值。
- `apps/server/src/handlers.ts`：324 行；reply :225-232；termview :234-239；setvar
  :241-245；webshow 注释+handler :247-264；approval :266 起——新键插 webshow 与
  approval 之间（输出类 sink 聚拢）；头注「基础 16 种」:2 沿 0034 裁示不改（零删改
  纪律优先于注释新鲜度，如实记录为已知陈旧注释）。
- `apps/server/src/engine.ts`：`HANDLERS = { ...BASIC_HANDLERS, llm, agent }` :27-31
  ——新 handler 键入 BASIC_HANDLERS 即自动注册，engine 零改动；node:done emit :129
  （`inputs` 预览 `preview(inVals[i],140)` :120-128——140 截断代码依据）；
  **主循环顺序执行** `for(const id of topo){ ... await runNode(...) }` :136-142
  ——同一时刻至多一个节点在途，output 事件按「最近 node:start 的 jsoncanvas」归属的
  确定性依据（§4.1）；`__pass` 分发兜底 :101。
- `apps/server/src/util.ts`：`toStr` :26-34（null/undefined→''、`__trigger` 对象→''、
  object→JSON 串 catch→String）——空输入/触发哨兵如实降级路径。
- `packages/shared/src/events.ts`：15 种事件；`output` :25（`{type,text}`——**无节点
  id 字段**，归属语义必须前端自建，§4.1）；node:done :15-21。本节点消费
  `node:start / node:done / output`（前端）+ emit `output`（后端），零新增。
- `apps/web/src/legacy/app.js`：2740 行。`'box-select'` 图标 :85（PRD 写 :84——微漂移，
  本 SPEC 按 :85 转写；现行仅节点工具箱 affordance「框选全部」:1612 取用，无节点占用，
  复用无冲突）；`nodeById` :192 / `paramsOf` :194；节点模板 `<div class="node-out">` :775；
  `measurePorts` :793 / `updateEdgesOf` :857；`#float-run` 点击→runWorkflow :1778
  （按钮本体 Skeleton.tsx:86）；RUN_META :1867-1886（20 条目：webshow :1883、approval
  :1884、termview :1885；**无 jsoncanvas**，fallback `{dur:600,out:()=>'完成'}` :2047）；
  `nodeEl` :1898 / `setNodeOut` :1899；WS_HTTP_S :1901 / `webshowUrlOf` :1902-1909 /
  `setNodeWebshow` :1911-1931；`termEl` :1943-1952 / `termConsume` :1953-1990（惰性
  挂载 + 事件旁路直系先例）；runSimulated 落定段 `termConsume(...)` :2090 /
  `setNodeOut(id,outText)` :2091；模拟 dur 抖动 `dur*(0.85+Math.random()*0.3)` :2079
  （只影响时长不影响终态 DOM，§5.1 确定性论证）；`onEvent` :2219 / termConsume 预钩子
  :2222 / `node:done` case :2252（webshow 分派 :2256）/ `output` case :2283。
- `apps/web/src/app.css`：597 行；`.node-term` 家族文件尾（0034 插入）、`.node-out`
  既有规则在案——本节点新选择器追加文件尾纯插入。
- `apps/web/src/Skeleton.tsx`：189 行，`#float-run` :86 纯静态壳——呈现面无静态骨架
  需求，预期零改动。
- `tools/pixel-gate/gate.mjs`：场景表 :237-257（s0~s11 恰 12）；s10/s11 行 :253-256
  （PRD 写 :253-255——行界微漂移，内容一致）；s8/s10/s11 同构 seed 形态 :183-186 /
  :192-195 / :232-235（localStorage 预置 + steps 空）；`normalize` :46-52（闭底部面板 +
  清 toasts）；执行时序 goto→clear→seed→reload→fonts→1s→steps→ready→normalize→after
  →稳定双帧 :265-285（**steps 先于 normalize**——s12 点击运行后 toast/日志由
  normalize 收拾，§5.1）；golden-created 通道 :321-325（`UPDATE || !existsSync(gPng)`）；
  `--update` 重录全部场景。
- `tests/smoke/smoke-server.mjs`：1331 行；T 组（termview）:1051-1108、O 组（webshow）
  :1111 起、其后 Z 组、C 组清理在 finally :280；`tRun`/`openSse`/`mockModel.requests`
  先例齐备。0034 实发教训在案：**组块必须整块连续插入**（a89bf60 修复 T 组块插入位置）。
- `tools/gen-node-readmes.mjs`：136 行；MANUAL_NOTES :42-62（termview :57、webshow :59
  已有条目，**无 jsoncanvas**——缺条目则现状备注渲染 `undefined`，0031/0034 同款踩点）；
  总索引「19 种」:107；硬断言 `types.length !== 19` :117。
- `packages/shared/test/nodes.baseline.json`：19 键亲点（trigger…approval，键序=声明序）；
  重产命令权威 `docs/node-definition-protocol-migration-spec.md` §2（`npm run
  build:shared` + `node -e` 直读 dist 重定向）。
- 契约测试计数锚（全部需 19→20 / 40→42 联动；PRD 清单遗漏三处、§6 全表补齐）：
  `contract.test.mjs:10-11`（19 种 / `Object.keys(NODES).length===19`）；
  `readme-consistency.test.mjs`（TYPES = `Object.keys(NODES)` :27 数据驱动零改动，
  计数串 :63「19 类型」/:66 消息/:80「恰 19 行」/:87「19 份」+ 头注 :6「18 份」陈旧串）；
  `synthesis.test.mjs`（caps 豁免循环 llm/agent/code——jsoncanvas 无 caps 进泛型循环，
  **零必需改动**；标题「其余 16 键」计数串将陈旧为 17，如实记录）；
  `param-handler-guard.test.mjs`（EXPECTED_ZOMBIES :91-96、total===40 :141、注释
  :138-139「总数 38+2=40，僵尸 6+2=8 → 已实现 32」）。
- `defs-drift.test.mjs` 既有瑕疵两处（本会话亲核，**本轮不动、如实记录**）：①
  `termview` 行重复出现 :28/:31（对象字面量重复键，后者覆盖、值相同，reduce 计数与
  deepEqual 均不受影响）；② 测试名「38/38」:35 与键集消息「18 种」:47 为 0033/0034
  两轮未对齐的陈旧串（断言本体用变量，恒真绿）。
- 修宪轮直系先例（0034 SPEC §0.2 已 git 亲核，本轮复用）：081b32d（BK-0033 全套）/ 
  9bcb3bd（0013 s6/s7 golden-created）/ a89bf60（smoke 组块插入位置修复）。

## 1. 范围与护栏裁示

- **触 UI = 是，修宪轮（链终轮）**（PRD 触UI 结论成立）：shared DEFS 新增 jsoncanvas →
  节点库 output 分组自动 +1 条目（app.js 数据驱动）→ s3-library 像素波及实测裁定
  （预期零波及，§5.2）+ s12 新场景（§5.1）。
- **SSE 消费护栏（ADR-0015 §4.5）**：恰消费既有 15 种内的 `node:start / node:done /
  output`（前端消费；后端 emit `output`）。`events.ts` 零 diff 为机器判据；确需新增
  事件类型 → 中止转 needs-approval。
- **呈现型 sink 禁区（PRD 非功能 3）**：零进程、零出站、零新端点、零用户输入面——
  呈现区无 input/textarea/contenteditable/stdin；严禁 node-pty / PTY 会话（BK-0045 /
  ADR-0014 专属）。实施中出现任何用户输入面/进程面/网络面需求 → 立即中止转
  needs-approval。
- **纯插入纪律**：`app.js` / `app.css` / `gate.mjs` 三文件改动 = 仅新增行
  （`git diff --numstat` 删除行数 = 0 为判据）；`nodes.ts` 头注计数置换为允许的注释行
  置换（§2，081b32d 先例）；`handlers.ts` 头注不动（§3）。`Skeleton.tsx` 预期零改动。
- **gate.mjs 修改合法性**：WORKFLOW §6.3「不修改 tools/pixel-gate/」在修宪轮让位于
  宪法第 3 条通道（0034 SPEC 同款裁示；先例 9bcb3bd / 081b32d）。本轮 gate.mjs 仅
  **数据插入**（seed 常量 + 就绪钩子 + 场景行），判定逻辑零触碰。
- **呈现数据源语义裁示（对 ADR-0015 §4.3「node:done.out 或 output 事件文本」的落
  地）**：两通道均被消费，分工如下——① **output 事件 = 真实运行的权威全文通道**：
  jsoncanvas handler 把上游**值**完整序列化后 emit('output')（node:done.out 只是「已
  呈现 JSON · N 项」摘要，上游多数节点的 out 亦为摘要如 http「200 OK · 412ms」，
  解析摘要成树是伪语义）；output 事件无 id（events.ts:25），归属 = 最近 node:start
  的 jsoncanvas 节点（引擎顺序执行 engine.ts:136-142 保证同一时刻至多一个 jsoncanvas
  在途；node:done 即清归属）——与 termview BUG-001「事件→节点归属」纪律同款。②
  **node:done.out = 兜底通道**：仅在呈现树为空时消费（模拟执行路径 / 无 output 事件
  路径 / 真实运行降级路径），树已有内容时 done 只清归属不覆盖（防止自身摘要冲掉
  output 全文渲染的树）。上游 node:done.out 不按边转发（termview delta 转发模式在
  此无收益：真实运行全部经本节点 handler 的 output 通道收敛，见 §4.1 注释）。

## 2. DEFS 终稿 · `packages/shared/src/nodes/jsoncanvas/node.ts`（新增，≤30 行）

ADR-0015 §7 授权「终稿代码块归实施 SPEC」——以下即终稿，BUILD 逐字落盘（字段与
ADR-0015 §2.3 草案 + PRD REQ-0038-01 字面一致；纯数据模块 `satisfies NodeDefJson`，
零运行时代码，NDP §3）：

```ts
/* jsoncanvas — JSON 画布（NDP 纯数据模块）
 * ADR-0015 §2.3 定稿（迭代 0035 / BK-0038 修宪轮·BK-9003 链终轮）。呈现型 sink：
 * 与 reply 同构——outputs 空数组（终点节点）、单入 in-data type any、
 * capabilities.data = emit('output') + ctx.outputs 汇入运行产物、无出站 IO
 * （handlers.ts jsoncanvas）。object 严型案已否决（ADR-0015 §2.3）：any 入口
 * 不挑食，非 JSON 输入由前端 JSON.parse 失败如实降级原文呈现（不伪造树）。
 * 零进程零出站零用户输入面（呈现型 sink；PTY 面归 BK-0045 / ADR-0014）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'jsoncanvas',
  identity: { name: 'JSON 画布', category: 'output', icon: 'box-select',
    keywords: 'jsoncanvas json 画布 结构化 树 呈现',
    description: '将上游 JSON 数据以结构化树呈现（终点节点）' },
  ports: {
    inputs: [{ id: 'in-data', label: '数据', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'expand', label: '展开层级', widget: 'number', default: 2, min: 0, max: 6, step: 1 },
    { id: 'fmt', label: '格式化缩进', widget: 'toggle', default: true },
  ],
  binding: { handler: 'jsoncanvas', capabilities: { data: true } },
} satisfies NodeDefJson;
```

纪律自检（对 nodes.schema.ts 本会话亲核口径）：端口类型 any ∈ 5 枚举 ✓；widget
number/toggle ∈ 5 枚举 ✓；category output ∈ 7 枚举（复用 `--cat-output`，零新类目零
新 CSS 变量）✓；`in-data` 合正则 `^[a-z][a-z0-9-]{2,31}$` + in- 前缀 + 节点内唯一 ✓；
number default 2∈[0,6]、min≤max、step 1>0（:137-149）✓；toggle default boolean ✓；
params id 节点内唯一 ✓；capabilities 仅 `data` ⊆ 十 kind ✓（**无 exec/net/fs**）；
无 visibleIf；description 无句尾句号（沿 ADR-0015 §2.3 原文，webshow 带句号属其
个体字面）。

**NODES 键位**：`jsoncanvas` 键插在 `webshow` 之后、`approval` 之前（nodes.ts import
:37 后 +1 行、键 :135 后 +1 行——输出类 sink 聚拢先例的顺位延伸；键位决定 s3-library
output 分组内条目序与 EXPECTED_ZOMBIES 声明序，§6.5）。`packages/shared/src/nodes.ts`
头注「19 目录全量」:5 →「20 目录全量」+ 目录清单行 :6-8 补 `jsoncanvas`——注释行置换
（沿 BK-0033 commit 081b32d 先例，属允许的注释置换，不计入三敏感文件纯插入判据）。

## 3. 呈现承载 · `apps/server/src/handlers.ts`（+jsoncanvas 键，约 24 行）

reply/webshow 同构 sink，插在 webshow（:264 闭合）与 approval（:266）之间——纯插入：

```ts
  /* jsoncanvas（迭代 0035 / BK-0038 修宪轮·链终轮）：呈现型 sink，reply/webshow 同构。
     语义（ADR-0015 §3）：对象/数组直 JSON.stringify；字符串原样（是否 JSON 交前端
     parse 裁定）；空输入与 __trigger 哨兵如实空呈现（toStr 同款语义，util.ts:26-34）；
     序列化失败 warn + 原文降级（不伪造结果）。零出站零进程零文件零新依赖零新 env。 */
  async jsoncanvas(ctx, { input, emit }): Promise<NodeResult> {
    const raw: unknown = input;
    let text = '', degraded = false;
    if (raw == null || (typeof raw === 'object' && (raw as { __trigger?: unknown }).__trigger)) {
      /* 空输入 / 触发哨兵 → 空串如实呈现（termview T02 空降级同款纪律） */
    } else if (typeof raw === 'string') {
      text = raw;                                          /* 字符串原样（ADR-0015 §3） */
    } else {
      try { text = JSON.stringify(raw) ?? ''; }            /* 对象/数组直序列化 */
      catch { text = toStr(raw); degraded = true; }        /* 序列化失败：warn + 原文降级 */
    }
    let items = 0, parsed = false;
    if (text !== '') {
      try {
        const v: unknown = JSON.parse(text);               /* 字符串输入本身是 JSON 亦按结构计数 */
        parsed = true;
        items = (v !== null && typeof v === 'object')
          ? (Array.isArray(v) ? v.length : Object.keys(v as Record<string, unknown>).length)
          : 1;
      } catch { parsed = false; items = 1; }               /* 非 JSON 文本按原文一条计 */
    }
    ctx.outputs!.push(text);                               /* reply 同构：run 产物汇入 */
    emit('output', { text });                              /* 既有事件类型，零新增 */
    if (degraded) emit('log', { lvl: 'warn',
      msg: 'jsoncanvas：输入无法序列化，已按原文降级呈现（不伪造结果）' });
    const out = degraded
      ? `已呈现原文（序列化失败降级） · ${text.length} 字`
      : parsed ? `已呈现 JSON · ${items} 项`
      : text === '' ? '已呈现 JSON · 0 项'
      : `已呈现原文 · ${text.length} 字（非 JSON，前端原文降级）`;
    return { value: text, out };
  },
```

- **摘要语义**（PRD REQ-0038-02「已呈现 JSON · N 项」的精化）：N = 顶层项数
  （对象键数 / 数组长度；标量 1；空 0）；非 JSON 字符串摘要转「已呈现原文 · N 字」
  ——「已呈现 JSON」字样只用于确为 JSON 的呈现（如实汇报纪律：对 prose 输入宣称
  「已呈现 JSON」是伪造）。
- **降级面三分**：① 空输入/`__trigger` → 0 项空呈现（T02 先例）；② 非 JSON 字符串 →
  原文透传（前端 parse 降级呈现，AC4-④）；③ 序列化抛错（循环引用/BigInt 等不可序列
  化值）→ warn + `toStr` 原文降级。③ 为纵深防御分支：引擎节点间值经结构化克隆
  （code 节点子进程 IPC）传递，JSON 不安全值实际不可达工作流输入——**不可达性如实
  记录，不以伪造输入做 smoke 断言**（§9 AC3 裁示）。
- **handler 不引用 `p.expand` / `p.fmt`**——两参数是前端呈现面参数，服务端语义零参与；
  僵尸参数登记见 §6.5。
- `handlers.ts` 头注「基础 16 种」:2 **不改**（零删改纪律优先于注释新鲜度，0034 同款
  如实记录）；`:24` 落盘后 324 → 约 348 行 ≤400（AGENTS.md 硬性约定 4）。

## 4. 前端呈现面（app.js 纯插入 ≈75 行 + app.css 纯插入 ≈16 行）

### 4.1 app.js 五处纯插入（既有行零删改）

1. **呈现模块块**（整块插在 `termConsume` 结束 `};`（:1990）之后、
   `async function runWorkflow(){`（:1992）之前；约 70 行）：

```js
/* ===== jsoncanvas（BK-0038）：结构化树呈现区（ADR-0015 §4.3 · 迭代 0035） =====
 * 惰性挂载：首个携带数据的消费事件才创建（s0~s11 静态态零波及前提，沿 termEl 先例）；
 * 只读——纯 div + textContent，无 input/写入面；上游 JSON 不可信，全部内容一律
 * textContent 注入、零 innerHTML（XSS 结构性排除，webshow sandbox 同级安全必答项）。 */
const jcFoldClick = ev => {
  const f = ev.target.closest('.jc-fold'); if(!f) return;
  const row = f.parentElement;
  row.classList.toggle('jc-closed');
  f.textContent = row.classList.contains('jc-closed') ? '▸' : '▾';
};
const jtreeEl = id => {
  const el = nodeEl(id); if(!el) return null;
  let t = el.querySelector('.node-jtree');
  if(!t){
    t = document.createElement('div'); t.className = 'node-jtree';
    t.addEventListener('click', jcFoldClick);           /* 委托在容器：重渲染不丢监听 */
    el.insertBefore(t, el.querySelector('.node-out'));  /* .node-out(:775) 恒存在 */
    measurePorts(); updateEdgesOf([id]);                /* 高度变化 → portCache 刷新（已知陷阱条款） */
  }
  return t;
};
const jcBuild = (val, depth, expand, fmt) => {
  const box = document.createElement('div'); box.className = 'jc-val';
  if(val === null || typeof val !== 'object'){
    const s = document.createElement('span'); s.className = 'jc-prim';
    s.textContent = fmt ? String(val) : (JSON.stringify(val) ?? 'null');
    box.appendChild(s); return box;
  }
  const kids = document.createElement('div'); kids.className = 'jc-kids';
  const entries = Array.isArray(val) ? val.map((v,i)=>[i,v]) : Object.entries(val);
  for(const [k,v] of entries){
    const row = document.createElement('div'); row.className = 'jc-row';
    const key = document.createElement('span'); key.className = 'jc-key';
    key.textContent = Array.isArray(val) ? '['+k+']' : k+':';
    row.appendChild(key);
    if(v !== null && typeof v === 'object'){
      const open = depth + 2 <= expand;                 /* 子层号 ≤ expand 才默认展开（expand=0 全折叠） */
      if(!open) row.classList.add('jc-closed');
      const fold = document.createElement('span'); fold.className = 'jc-fold';
      fold.textContent = open ? '▾' : '▸';
      row.appendChild(fold);
      const n = Array.isArray(v) ? v.length : Object.keys(v).length;
      const badge = document.createElement('span'); badge.className = 'jc-badge';
      badge.textContent = Array.isArray(v) ? 'Array('+n+')' : '{'+n+'}';
      row.appendChild(badge);
      row.appendChild(jcBuild(v, depth + 1, expand, fmt));
    } else {
      const s = document.createElement('span'); s.className = 'jc-prim';
      s.textContent = fmt ? (typeof v === 'string' ? '"'+v+'"' : String(v)) : JSON.stringify(v);
      row.appendChild(s);
    }
    kids.appendChild(row);
  }
  box.appendChild(kids);
  return box;
};
const jcRender = (id, text) => {
  const n = nodeById(id); if(!n || n.bypass) return;
  const t = jtreeEl(id); if(!t) return;
  t.innerHTML = '';                                     /* 重渲染语义：最新文本为权威 */
  let val;
  try { val = JSON.parse(String(text ?? '')); }
  catch {                                               /* parse 失败如实降级原文 + warn（不伪造树） */
    const fb = document.createElement('div'); fb.className = 'node-jtree-fallback';
    fb.textContent = String(text ?? '');
    const w = document.createElement('div'); w.className = 'node-jtree-warn';
    w.textContent = '注意：非 JSON 文本 · 已按原文降级呈现';
    t.appendChild(fb); t.appendChild(w);
    measurePorts(); updateEdgesOf([id]);
    return;
  }
  const ex = Number(paramsOf(n).expand);
  const expand = Number.isFinite(ex) ? Math.min(6, Math.max(0, Math.round(ex))) : 2;
  if(paramsOf(n).fmt !== false){
    t.appendChild(jcBuild(val, 0, expand, true));
  } else {                                              /* fmt=false：紧凑原文（无缩进单段） */
    const fb = document.createElement('div'); fb.className = 'node-jtree-fallback';
    let compact = '';
    try { compact = JSON.stringify(val) ?? String(val); } catch { compact = String(val); }
    fb.textContent = compact;
    t.appendChild(fb);
  }
  measurePorts(); updateEdgesOf([id]);
};
let jcPending = null;  /* output 事件归属 = 最近 node:start 的 jsoncanvas 节点
  （events.ts:25 output 无 id；引擎顺序执行 engine.ts:136-142 保证唯一在途） */
const jsonConsume = ev => {
  if(ev.type === 'node:start'){
    const n = nodeById(ev.id);
    jcPending = (n && n.type === 'jsoncanvas') ? ev.id : null;
    return;
  }
  if(ev.type === 'output'){
    if(jcPending != null) jcRender(jcPending, ev.text);  /* 真实运行权威全文通道（§1 裁示） */
    return;
  }
  /* node:done：本节点 done → 清归属 + 树空时以 out 兜底（模拟执行/降级路径）；
     上游 done → 零操作（真实运行树数据源 = 本节点 handler 的 output 全文，非上游摘要） */
  const n = nodeById(ev.id);
  if(!n || n.type !== 'jsoncanvas') return;
  jcPending = null;
  const t = nodeEl(ev.id)?.querySelector('.node-jtree');
  if(!t || !t.firstChild) jcRender(ev.id, ev.out);
};
```

   降级 warn 文案用「注意：」而非 ⚠ emoji（gate.mjs:128-131 s6/s7 字形安全纪律：
   规避 emoji 跨环境字形差异；▾/▸ 为几何字形与 s10/s11 已用块字形 ▌/▍ 同族，golden
   权威在 CI，§5.3）。展开层级语义：expand=N 表示可见至第 N 层（根条目为第 1 层），
   N=0 全折叠（只余顶层 badge），默认 2 = 根条目 + 其分支子层展开。

2. **onEvent 预钩子**（插在 termConsume 钩子行（:2222）之后，新行不改既有行）：

```js
    /* jsoncanvas 消费钩子（BK-0038）：start 归属 / output 全文 / done 兜底三旁路；
       既有 case 语义零触碰——.node-out 摘要行为保持原样（容器纪律） */
    if(ev.type==='node:start'||ev.type==='node:done'||ev.type==='output') jsonConsume(ev);
```

3. **RUN_META 一行**（插在 termview 行（:1885）之后、收尾 `};`（:1886）之前）：

```js
  jsoncanvas: {dur:800,  out:()=>'{"工作流":"AgentFlow","版本":2,"特性":["结构化树","可折叠"],"配置":{"主题":"dark","展开层级":2}}'},
```

   模拟文案 = 固定 JSON 字面量（ASCII+CJK 字形安全口径，值恒定 → 树渲染确定）。

4. **runSimulated 一行**（插在 `if(n.type==='termview'){...}`（:2090）之后、
   `setNodeOut(id, outText);`（:2091）之前）——模拟执行与真实运行共用同一条
   jsonConsume 代码路径（PRD REQ-0038-03 语义一致要求；done 兜底分支恰为此路径服务）：

```js
    if(n.type==='jsoncanvas'){ jsonConsume({id, type:'node:done', out: outText}); }
```

5. **零 case 体改动**：本节点消费全部走预钩子旁路（与 termview 同款），不像 webshow
   需在 `node:done` case 体内插入分派行（:2256 先例）——既有 case 体本轮零触碰。

### 4.2 app.css 新选择器（追加文件尾，纯插入，≈16 行）

```css
/* ================= JSON 画布结构化树（jsoncanvas · ADR-0015 §4.3 · 迭代 0035） ================= */
.node-jtree{display:block;margin:4px 8px 8px;padding:6px 8px;background:rgba(0,0,0,.45);border-left:2px solid #60a5fa;
  font-family:var(--mono);font-size:11px;line-height:1.5;color:#c7d6ee;white-space:pre-wrap;word-break:break-all;
  max-height:170px;overflow-y:auto;user-select:text}
.node.collapsed .node-jtree{display:none}
.node-jtree .jc-kids{padding-left:12px;border-left:1px dotted rgba(255,255,255,.10)}
.node-jtree .jc-row{display:block}
.node-jtree .jc-key{color:#93c5fd}
.node-jtree .jc-prim{color:#e5edf8}
.node-jtree .jc-fold{cursor:pointer;color:#7f9cc4;padding-right:4px;user-select:none}
.node-jtree .jc-badge{color:var(--text3);font-size:9px;padding-left:4px}
.node-jtree .jc-closed > .jc-val{display:none}
.node-jtree-fallback{color:#e5edf8;white-space:pre-wrap}
.node-jtree-warn{color:var(--warn);margin-top:4px;font-size:10px}
```

- 值取既有家族（.node-term 同款底色/边框/字号/等宽/滚动/选择语义，0034 先例；
  `--mono`/`--warn`/`--text3` 既有变量）；蓝色系 #60a5fa/#93c5fd/#c7d6ee/#e5edf8/
  #7f9cc4 区分终端绿（字面量非 CSS 变量——**:root 变量表零新增**，cssVars 不变量
  键集不变）；max-height 170px + overflow-y:auto 承载长树滚动；`.jc-closed >
  .jc-val{display:none}` 承载折叠；`.node.collapsed .node-jtree{display:none}` 与
  term 同款。
- `.node-out` 既有规则零改动——摘要语义与呈现区容器严格分离（容器纪律，PRD
  REQ-0038-03）。

### 4.3 只读性与确定性

- 呈现区无任何 input/textarea/contenteditable（grep 断言见 §9 AC5，按 jsoncanvas
  块定界）；点击仅触发展开/折叠呈现态切换，不发起任何网络请求（AC4-④）。
- 确定性三锚：① 惰性挂载 + 静态场景零创建（静态基线零波及的前提）；② 折叠初态 =
  expand 钳位值（Number 钳 [0,6]，非有限数回落 2）；③ 重渲染整体重建（innerHTML=''）
  无增量残留——同输入两次渲染 DOM 逐字节同构。

## 5. golden 重录方案（修宪轮必答项）

**宪法第 3 条依据**：issue#3 用户本人批复「批准」（2026-10-23T15:49:32Z，PRD 轮 gh
亲核在案）+ ADR-0015（§6 golden 双通道预案 + §7 jsoncanvas 权威字面量，头部状态行
已载批复承继）——宪法第 3 条「ADR + 用户本人批准」两要素齐备，同迭代 golden 增量/
受限重录合法（WORKFLOW §4 修宪轮通道；`npm run gate:update` 本轮**允许至多一次**，
仅限 s3-library 实测红时，超一次即违规）。

### 5.1 新场景：s12-jsoncanvas-node（golden-created 通道 + 动态呈现终态）

- **形态裁示**：与 s10/s11 的纯静态态不同，s12 为**静态 seed + 模拟运行 + 树终态
  采集**——PRD REQ-0038-05 硬性要求「固定 fixture 供给固定 JSON 文本 … 必须等待
  『树渲染完成』终态再采集（不得采到中间帧）；折叠状态须为确定性值（expand 默认
  层级）」。本节点呈现区是本轮修宪的实质增量面，纯静态形态（树不渲染）将使 golden
  对呈现面零覆盖，故 s12 必须渲染树。ADR-0015 §6 明文把场景形态委托实施 SPEC 定夺
  （「各实施 SPEC 定工作流注入方式」），本裁示在授权面内。
- **确定性论证**（REQ-0038-05 逐条回应）：① 数据源 = RUN_META 固定 JSON 字面量
  （§4.1-3），零 provider / 零外网 / 零随机内容；② gate 离线模式 probe 失败 →
  ENGINE.online=false → runWorkflow 走 runSimulated（app.js:1995-1999），无后端依赖；
  ③ 模拟时长抖动 `dur*(0.85+Math.random()*0.3)`（:2079）只影响耗时，终态 DOM（树 +
  st-done + 摘要）与时长无关；④ `ready` 钩子等 `body.running` 退场且树行数达标才进
  normalize → 不得采到中间帧；⑤ 折叠初态 = expand=2 钳位确定值；⑥ toast/日志/进度条
  由 normalize（:46-52 清 toasts + 闭面板）与稳定双帧消化——时序依据：steps 先于
  normalize 执行（gate.mjs:272-276）。
- gate.mjs 纯插入（判定逻辑零触碰），两组新行：

```js
/* ---------- s12 JSON 画布节点场景基建（ADR-0015 §6 · 迭代 0035 / BK-0038 修宪轮） ----------
   seed 同 s8/s10/s11 形态（localStorage 预置最小工作流）；steps 点击 #float-run 走
   runSimulated（gate 静态托管 probe 失败 → 离线分支）；ready 等待运行退场且树渲染
   达标（4 顶层行）——PRD REQ-0038-05「树渲染完成终态」的机器判据。 */
const JSONCANVAS_WF_SEED = JSON.stringify({ tabs: [{ name: 'JSON 画布示例', nodes: [
  { id: 1, type: 'trigger',   x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'jsoncanvas', x: 410, y: 250, title: 'JSON 画布' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });
const jcRunClick = page => page.evaluate(() => document.getElementById('float-run').click());
const jcReady = page => page.waitForFunction(
  () => !document.body.classList.contains('running')
     && document.querySelectorAll('.node-jtree .jc-row').length >= 4,
  undefined, { timeout: 10000, polling: 100 });
```

   场景表插入行（s11 行 :255-256 之后）：

```js
  { id: 's12-jsoncanvas-node', steps: [jcRunClick], ready: jcReady,
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), JSONCANVAS_WF_SEED) },
```

- 预期不变量（落盘后核对；计数法沿 s8/s10/s11 口径）：nodes=2、edges=1、
  widgets=**3**（trigger mode 1 行 + expand number 1 行 + fmt toggle 1 行）、ports=**2**
  （trigger 单出 + jsoncanvas 单入）、view/zoom 沿 seed 字面、cssVars 键集与既有基线
  全等（零新变量）；`nodes` 矩形含树区高度（RUN_META 固定文案 → 高度确定）。
- **场景编号按落盘时序**：s0~s11 已占用，本轮预期 **s12**（不锁死，若并行穿插项先落
  则顺延——ADR-0015 §6 同款纪律；PRD REQ-0038-05 同口径）。

### 5.2 受波及既有场景：仅 s3-library（预期零波及，实测裁定）

- 波及机理：节点库 output 分组条目 4→5 行（setvar/reply/termview/webshow + jsoncanvas，
  §0.2 亲核现成员）——数据驱动渲染。**零波及论据（须实测，不得推定）**：0033/0034
  两轮同位置新增条目实测 diffPx=0（新增行落在 1600×900 视口折叠线下且 #lib-list 无
  内部滚动，ADR-0015 §7.1 先例）；本轮新增「JSON 画布」条目落位同区。
- s0/s1/s2/s4~s11 **预期零波及**：呈现区惰性挂载（§4.1），任何静态场景/在线面板场景
  不创建 `.node-jtree`（s9 的 goal 面板、s4/s5 的列表面板均无 jsoncanvas 节点在途）；
  图标 `box-select` 与类目色均既有常量；cssVars 键集零新增；gate.mjs 判定逻辑零触碰。
- **执行程序（AC1 口径）**：
  1. 工作树内 `npm run build` → `npm run gate`：**预期 12 场景全 pass + s12 记
     golden-created**；s3-library 若恰一红 → 修宪轮内执行**恰一次** `npm run gate:update`
     （`--update` 重写全部场景但零波及场景产物逐字节相同 → `git status` 仅 s3 两个
     文件变更 + s12 两个文件新增，081b32d 证据形态）；**任一 s0/s1/s2/s4~s11 红或
     s3 之外多红 = FAIL，中止排查，不得重录掩盖**。
  2. s12 首轮 gate 若不稳（场景超时/两帧不收敛）→ **FAIL 中止**，按迭代 0013
     BUG-0026 教训排查时序，不得以重录掩盖。
- **AC7 确定性双采**：基线落盘后连续两轮 `npm run gate`，13 场景 diffPx=0（两次独立
  采集与基线逐字节一致）；不能收敛 → FAIL 中止。
- **gate:update 次数上限 = 1**（修宪轮护栏；0033/0034 实际消费 0 次，本轮预期同样
  0 次）。

## 6. 契约与守卫联动（计数全表——含 PRD 清单遗漏的三处）

NDP 落地联动沿 BK-0033 commit 081b32d 全套先例（该提交实际触碰下表全部文件）：

| # | 文件 | 改动 | 依据锚点（本会话亲核） |
| --- | --- | --- | --- |
| 6.1 | `packages/shared/test/nodes.baseline.json` | 重产（19→20 键，经批准通道） | 重产命令 `docs/node-definition-protocol-migration-spec.md` §2（`npm run build:shared` + `node -e` 直读 dist 重定向）；synthesis 快照 Buffer 级比对随重产通过 |
| 6.2 | `packages/shared/test/contract.test.mjs` | :10「19 种节点」→「20 种节点」、:11 `===19`→`===20` | :10-11 亲核原文 |
| 6.3 | `packages/shared/test/nodes-dirs.test.mjs` | :31 `D.size===19`→`===20`（+头注 :5 「D.size===19」字样→20） | :31/:5 |
| 6.4 | `packages/shared/test/defs-drift.test.mjs` | EXPECTED_DEFAULTS 增 `jsoncanvas: { expand: 2, fmt: true }` 行（插 :30 webshow 行后，与 nodes.ts 键位一致）；自检 40→**42**（:39）；头注 :2「40/40」→「42/42」、:10-11 注释「19 种节点 × 40 参数」→「20 种 × 42」 | :12-33/:37-41；既有 dup termview :28/:31 与陈旧串 :35/:47 **不动**（§0.2 如实记录） |
| 6.5 | `packages/shared/test/param-handler-guard.test.mjs` | EXPECTED_ZOMBIES 增 `['jsoncanvas', ['expand','fmt']]`（插 :95 webshow 行后——NODES 声明序 jsoncanvas 在 webshow 后，deepEqual 序敏感）；:141 total 40→**42**；注释 :138-139 追加「+0035(jsoncanvas)：总数 40+2=42，僵尸 8+2=10 → 已实现 32 不变」 | :91-96/:138-148；refCount 断言 `total−zombie = 32` **数值不变**（42−10=40−8） |
| 6.6 | `packages/shared/test/readme-consistency.test.mjs` | 计数串 :63「19 类型」→20、:66 消息、:80「恰 19 行」→20、:87「19 份」→20；头注 :6 陈旧「18 份」顺带对齐 20 | :6/:63/:66/:80/:87；TYPES=Object.keys(NODES) :27 数据驱动零改动 |
| 6.7 | `packages/shared/test/synthesis.test.mjs` | **零改动**（caps 豁免循环 llm/agent/code；jsoncanvas 无 caps 走泛型循环自然覆盖；EXPECTED_ORDER 不含 jsoncanvas；基线文件即 6.1 重产物）。标题「其余 16 键」/循环消息「16 节点」将陈旧为 17——如实记录不动 | :12-30 |
| 6.8 | `tools/gen-node-readmes.mjs` | `!== 19`→`!== 20`（:117）；「19 种」→「20 种」（:107）；MANUAL_NOTES 增 jsoncanvas 条目（缺省渲染 `undefined`——0031/0034 同款踩点），建议文案：「sink 呈现节点：输入序列化 emit('output') + ctx.outputs 汇入（handlers.ts jsoncanvas）；字符串原样/空输入 0 项/非 JSON 原文降级，不伪造 JSON；expand/fmt 为前端呈现参数（服务端零参与，僵尸登记在案）；零出站零用户输入面。」 | :42-62/:107/:117 |
| 6.9 | `packages/shared/src/nodes/README.md` + `packages/shared/src/nodes/jsoncanvas/README.md` | 由生成器产出（`npm run build:shared && node tools/gen-node-readmes.mjs`），**勿手写**；总索引 +1 行 | 生成器幂等机制 |

`nodes-dirs` 的 D===R 与引用边界断言、`handlers-coverage`（HANDLERS⊇NODES）随
handler 键入列自动满足，零改动。`schema.test.mjs` / `events-negative.test.mjs` 零改动。

## 7. 受影响文件清单（BUILD 产品提交白名单；`git show --numstat` 核对基准）

| # | 文件 | 动作 | 说明 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/jsoncanvas/node.ts` | 新增 | §2 终稿代码块（≤30 行） |
| 2 | `packages/shared/src/nodes/jsoncanvas/README.md` | 新增（生成器产出） | §6.9 |
| 3 | `packages/shared/src/nodes/README.md` | 改（生成器重跑） | 总索引 +1 行 + 「19 种」→「20 种」 |
| 4 | `packages/shared/src/nodes.ts` | 改（+1 import +1 键 + 头注计数置换） | §2 键位：webshow 之后 approval 之前 |
| 5 | `tools/gen-node-readmes.mjs` | 改（+MANUAL_NOTES 一条 + 两处计数） | §6.8 |
| 6 | `packages/shared/test/nodes.baseline.json` | 改（重产） | §6.1（经批准通道） |
| 7 | `packages/shared/test/contract.test.mjs` | 改（19→20） | §6.2 |
| 8 | `packages/shared/test/nodes-dirs.test.mjs` | 改（D.size 20） | §6.3 |
| 9 | `packages/shared/test/defs-drift.test.mjs` | 改（+jsoncanvas 行，42） | §6.4 |
| 10 | `packages/shared/test/param-handler-guard.test.mjs` | 改（+jsoncanvas 僵尸行，total 42） | §6.5 |
| 11 | `packages/shared/test/readme-consistency.test.mjs` | 改（计数串 20） | §6.6 |
| 12 | `apps/server/src/handlers.ts` | 改（+jsoncanvas handler ≈24 行，纯插入） | §3 |
| 13 | `apps/web/src/legacy/app.js` | 改（纯插入五处 ≈75 行） | §4.1 |
| 14 | `apps/web/src/app.css` | 改（纯插入 ≈16 行） | §4.2 |
| 15 | `tools/pixel-gate/gate.mjs` | 改（纯插入：seed 常量 + jcRunClick/jcReady + 场景行） | §5.1 |
| 16 | `tests/golden/ui/s12-jsoncanvas-node.png` + `.invariants.json` | 新增 | golden-created（§5.1） |
| 17 | `tests/golden/ui/s3-library.png` + `.invariants.json` | 改（**仅当** §5.2 实测红时修宪轮重录；预期不在集内） | §5.2 |
| 18 | `tests/smoke/smoke-server.mjs` | 改（+J 组断言组 ≈4 条） | §9 AC3 |
| 19 | `docs/adr/0015-presentation-triplet-nodes.md` | 改（状态行 + §7.2 链终实施纪要） | §8（随产品提交，081b32d 先例） |

（PRD 受影响清单遗漏 `contract.test.mjs` / `gen-node-readmes.mjs` / `nodes/README.md`
三处联动文件、`synthesis.test.mjs` 零改动裁定——本表按 0034 §5/§7 全表口径补齐，
PRD REQ-0038-06「SPEC 轮复核」授权在案。）

**禁区（零 diff 机器判据）**：`package.json` / `package-lock.json`（零依赖）、
`apps/server/src/engine.ts`（自动注册零改动）、`apps/server/src/guard.ts`、
`packages/shared/src/events.ts`（零新增 SSE）、`apps/web/src/Skeleton.tsx`、
`apps/server/src/server.ts` / `llm.ts` / `agent.ts` / `store.ts` / `util.ts`、
`packages/shared/src/nodes.schema.ts`、`CONSTITUTION.md`、`AGENTS.md`、`.github/**`、
`tests/golden/ui/` 除 #16/#17 外全部文件、`synthesis.test.mjs`（§6.7）。
grep 断言禁区补充：全库源码 `node-pty` 零命中；jsoncanvas 相关新增代码
`contenteditable` / `<input` / `stdin` 零命中。

**机制件（不入产品白名单）**：`docs/evolution/STATE.md`（过程态）、
`docs/evolution/iterations/0035/*`（PRD/SPEC/JOURNAL/REPORT）、
`docs/evolution/BACKLOG.md`（BK-0038 终态回写归 CLOSE；issue#3 关单归 CLOSE）。

## 8. ADR-0015 回写（归 BUILD 产品提交）

- 状态行：按 081b32d/49d54de 消费回写先例更新为「…BK-0037 实施轮已消费（迭代 0034）·
  **BK-0038 实施轮已消费（迭代 0035）· 链闭合**」口径（保留草案态措辞纪律：除批复
  承继事实外不新增批准态措辞；「已获用户 issue#3 批复」标注保留在状态行原文位置）。
- §7 jsoncanvas 权威字面量代码块尾追加一行实施纪要（§7.2 前例形态）：迭代号、本
  SPEC 路径、s12 落盘编号、golden 双通道实测结论（s3 零波及与否、gate:update 消费
  次数）、守卫联动计数（20 键 / 42 参数 / 僵尸 +2）。
- `docs/evolution/BACKLOG.md` BK-0038 行终态回写归 CLOSE；issue#3 🤖 终轮回执关单归
  CLOSE（PRD 迭代编排节同口径）。

## 9. 验收口径（AC；命令均在工作树 `.zcode/worktree/feat/0035-iter` 内执行）

- **AC0 基线**：本会话亲跑四项全绿（§0.1 表：build ✓ / test 30 / gate 12 场景
  diffPx=0 / smoke 118）——BUILD 起点已验，存量差异为零。
- **AC1 gate**：`npm run build` 绿 → `npm run gate` 按 §5.2 程序走（预期 12 场景全
  pass + s12 golden-created；恰 s3 一红时 `gate:update` 恰一次 → 13 场景全绿）；
  s0/s1/s2/s4~s11 零波及实测（`git status` 仅 s12 新增 [+s3 变更] 为字节级佐证）；
  本轮 gate:update 次数 ≤1。
- **AC2 契约**：`npm test` 全绿（基线 30 项零回退 + §6 全表计数联动通过；基线实证 =
  本会话亲跑 30 pass / 0 fail）。
- **AC3 冒烟**：`npm run smoke:server` 全绿（基线 118 断言零回退——本会话亲跑；新增
  **J 组 J01-J04**，整块连续插在 O 组之后、下一组注释之前（a89bf60 插入位置教训），
  沿 T 组 tRun/mock 先例 :1051-1108）：① J01 userinput→prompt（tpl=固定
  `{"a":1,"b":2}`）→jsoncanvas：`node:done.out === '已呈现 JSON · 2 项'` + output 事件
  恰 1 条 text=该 JSON + `run:done.outputs` 含该 JSON；② J02 userinput（defv=''）→
  jsoncanvas 空输入：`out === '已呈现 JSON · 0 项'`（不伪造内容）；③ J03 prompt
  tpl=`hello`（非 JSON 字符串）：`out === '已呈现原文 · 5 字（非 JSON，前端原文降级）'`
  + output text=`hello`（字符串原样通道）；④ J04 零出站佐证：J01-J03 全链路 mock
  模型请求数零增量。**裁示**：PRD AC3「序列化或解析失败降级路径」交付为 ②③ 两条
  smoke 可达降级面 + ③ 的前端 parse 降级由 AC4-④ 手动点位覆盖；handler 序列化抛错
  分支为纵深防御、引擎输入面不可达（§3），不以伪造输入凑断言（如实降级纪律）。
- **AC4 手动 E2E 五点位**（浏览器实跑 `npm start`，对齐 PRD）：
  ① 节点库「输出」分组出现「JSON 画布」（分组计数 4→5）；② 拖入画布：节点体出现
  展开层级/格式化缩进两 widget 行与「数据」入端口；③ 与上游连线运行：节点体出现
  结构化树、expand 层级折叠正确（改值后重跑生效）、fmt 切换树视图/紧凑原文可见；
  ④ 非 JSON 输入（如 prompt 输出 prose）降级原文呈现 + 「注意：非 JSON 文本」warn 行
  （不伪造树）、DevTools Network 面板零新增请求；⑤ 呈现区无任何输入面（点击仅折叠
  切换，无可编辑控件）。
- **AC5 白名单与禁区**：改动文件恰为 §7 清单（17 号预期不在集内）；禁区路径
  `git diff` 恒空；`package-lock.json` 零变化；`grep -rn "node-pty" apps packages tools`
  零命中；app.js/app.css/gate.mjs 三文件 `git diff --numstat` 删除行数 = 0。
- **AC6 指针抽样**：≥5 组代码/ADR 指针逐条亲核零杜撰（行号按 §0.2 本会话亲核值；
  PRD 三处行号漂移已转写：`box-select` :85（PRD :84）、webshow handler :247-264
  （PRD :247-251）、gate s10/s11 行 :253-256（PRD :253-255））。
- **AC7 确定性**：§5.2 程序末尾连续两轮 `npm run gate` 13 场景 diffPx=0；s12 呈现
  内容（RUN_META 固定字面量 + expand 钳位折叠初态）同输入同帧。
- **AC8 并行冲突申报**：PRD 亲核本轮无并行路（locks 空、worktree 仅本路）；若
  BUILD/VERIFY 期间出现并行路，须如实记录产品文件交集（`nodes.ts` /
  `nodes.baseline.json` / contract/nodes-dirs/defs-drift/param-handler-guard/
  readme-consistency 五测试 / `gen-node-readmes.mjs` / `nodes/README.md` / `app.js` /
  `app.css` / `gate.mjs` / `smoke-server.mjs` / `handlers.ts`），交仲裁员按「产品代码
  冲突不得自行择一」处置；若他路节点先合入主干，本分支计数按合并后事实校正（迭代
  0034 集成收口先例）；场景号 s12 撞号按 §5.1 顺延重命名。

## 10. 与并行路的申报边界

本轮 PLAN 亲核无并行在途路；若 BUILD 期间他路入列新节点（同构四件套），两分支在
`nodes.ts`（不同键）/ `nodes.baseline.json`（各含对方没有的键）/ 五测试计数 /
`nodes/README.md` / `handlers.ts` / `app.js`（RUN_META 相邻行）/ `gate.mjs`（场景表
相邻行）/ `smoke-server.mjs`（组块相邻）必然交叠——机械可并形（键序按合并后声明序
重排、计数按实跑值重产）由后落地分支校正；语义冲突（同键/同场景号）不得自行择一，
如实报告交用户裁决（WORKFLOW §4 MERGE 条款）。

## 11. 回滚

VERIFY FAIL 达修复上限（2 轮）→ `git revert <产品提交>`（唯一手段）；s12 golden 两
文件随 revert 删除，s3（若经 gate:update 重录）由 revert 恢复重录前基线；工作树整体
丢弃时主干零影响（v3 隔离保证）。
