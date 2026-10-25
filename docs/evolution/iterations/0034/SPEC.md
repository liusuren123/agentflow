# SPEC · 迭代 0034 · BK-0037 终端只读流节点 termview（NDP 定义 + sink 承载 + 等宽只读流呈现，修宪轮·BK-9003 链批次 2）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25（工作树 feat/0034-iter 内）
> 输入：`iterations/0034/PRD.md`（PLAN 产物）+ ADR-0015（定界权威：§2.2 DEFS / §3 承载 /
> §4.2 渲染 / §4.4 PTY 切割 / §5 编排 / §6 golden / §7 权威字面量）+ 本会话只读代码核实与
> 基线实测（§0）。权威顺位：CONSTITUTION > AGENTS > WORKFLOW > POLICY > ADR-0015 > PRD > 本 SPEC。
> 修宪授权链（宪法第 3 条三要素齐备）：**issue#3 用户批复承继（本会话 gh 亲跑
> `gh issue view 3 --json number,title,state,comments`：owner `liusuren123` 评论「批准」
> `createdAt 2026-10-23T15:49:32Z`、issue state=OPEN——与 PRD 授权链复核逐字一致）
> + ADR-0015（§7 termview 行即权威字面量）+ 本迭代内 golden 增量/重录（§6 方案）**。
> **ADR 处置：零新 ADR（needsAdr=false）**——本迭代全部架构决策已由 ADR-0015 承载
> （迭代 0029 落盘），本 SPEC 仅消费之；「已获用户 issue#3 批复」标注落在 ADR-0015
> 头部状态行的本轮回写（归 BUILD 产品提交，见 §8）——直系先例：BK-0033 产品提交
> 081b32d 即含 `docs/adr/0013` 状态行置换（本会话 `git show --stat 081b32d` 亲核），
> 且 ADR-0015 显著声明自定「状态行在各实施轮 CLOSE 时按 ADR-0010/0012 先例更新」。

## 0. 本会话代码核实与基线实测记录（2026-10-25，工作树内只读 + 亲跑）

### 0.1 基线门禁（本会话在工作树 `.zcode/worktree/feat/0034-iter` 内亲跑）

| 命令 | 结果 |
| --- | --- |
| `npm test` | `ℹ tests 30 · ℹ pass 30 · ℹ fail 0`（契约测试 30 项全绿） |
| `npm run build` | vite 66 modules transformed，`dist/index.html 351.31 kB`，构建成功 |
| `npm run gate` | **10 场景全 pass · diffPx=0**（s0~s9），「宪法门禁：通过 ✓」 |
| `npm run smoke:server` | `==== smoke:server：104 passed / 0 failed ====` |
| `git status --porcelain` | 仅 `M docs/evolution/STATE.md` + `?? docs/evolution/iterations/0034/`（机制件过程态，v3 合规，无产品改动） |

### 0.2 代码锚点（本会话逐一亲核，行号均为工作树现状）

- `packages/shared/src/nodes.ts`：144 行（**PRD 写 142 行——BK-0033 头注更新后的漂移，
  无实质影响，本 SPEC 按 144 转写**）；imports :19-35；NODES 17 键 :114-132（reply :129）。
- `packages/shared/src/nodes/reply/node.ts`：21 行，sink 同构样板全文在案（outputs `[]` /
  单入 in-content any / `binding:{handler:'reply',capabilities:{data:true}}`）。
- `packages/shared/src/nodes.schema.ts`：PORT_TYPES 5 枚举 :13 / WIDGETS 5 :14 /
  CATEGORIES 7 :15（PRD 冻结枚举纪律成立）；端口 id 正则 :18-21；widget×default 矩阵
  :50-58；number 约束（default∈[min,max]、step>0）:138-147。
- `apps/server/src/handlers.ts`：298 行；reply handler :225-232（`ctx.outputs!.push` +
  `emit('output',{text})` + out 摘要，PRD 锚点精确命中）；`async setvar` :234。
- `apps/server/src/engine.ts`：`HANDLERS = { ...BASIC_HANDLERS, llm, agent }` :27-30
  ——新 handler 键入 BASIC_HANDLERS 即自动注册，engine 零改动。
- `apps/server/src/llm.ts`：node:delta 三发射点 :89/:101/:103——**delta.text = 累积全文 acc**
  （流式 :101 节流 60ms、收尾 :103 补发），覆盖式消费语义的代码依据；agent.ts:98 同型。
- `apps/server/src/util.ts`：`toStr` :26-34（null/undefined→''、`__trigger` 对象→''、
  object→JSON 串）、`preview` :36——空输入如实降级路径。
- `packages/shared/src/events.ts`：15 种事件（node:delta `{id,text}` :10-11）——本节点
  消费 `node:delta/node:done/node:error/output`，零新增。
- `apps/web/src/legacy/app.js`：2650 行。`'code'` 图标 :66 / `I()` :101；`const DEFS = NODES`
  :134；`paramsOf` :194-198（默认∪覆盖）；节点库 DEFS×CATS 数据驱动渲染 :322-336；
  widget 行/端口行数据驱动 :764-766；`<div class="node-out"></div>` 模板 :775；
  RUN_META :1867-1884（16 条目、approval :1883、**无 termview**，fallback
  `{dur:600,out:()=>'完成'}` :1204/:1962）；`setNodeOut` :1897；runWorkflow 在线/模拟分支
  :1910-1914；模拟落定 `setNodeOut(id, outText)` :2005；SSE 消费 `onEvent` :2133 起——
  `node:delta` case :2158-2161（累积文本整段覆盖 + 160 字截断 + `▌`）、`node:done`
  :2163-2176（st-done + setNodeOut(out) + measurePorts/updateEdgesOf :2169-2170）、
  `node:error` :2180-2189。
- `apps/web/src/app.css`：586 行；`.node-out` 三规则 :259-261（display:none →
  `.st-done` 才显示、max-height:66px、单行摘要语义）；`--mono` :26；`.node` 宽 300px :192。
- `apps/web/src/Skeleton.tsx`：无节点体动态内容（`#float-run` :86 等纯静态壳）——termview
  呈现面无静态骨架需求，预期零改动。
- `tools/pixel-gate/gate.mjs`：场景表 :219-235（s0~s9）；s8 形态 = `AGENT_WF_SEED`
  :183-186（localStorage 预置 + clear→seed→reload 时序 :244-247）+ steps 空 + 公共六键
  不变量；s9 形态 = SESSION_ROUTES :195-212 + goalReady :215-217；golden-created 通道
  :299-303（`!existsSync(gPng)` 即落盘记 golden-created）；`--update` 重录全部场景
  （:299 `UPDATE || !existsSync(gPng)`）。
- `tests/smoke/smoke-server.mjs`：1129 行；A 组 trigger→agent→reply 全链断言先例 :905-935
  （openSse + waitFor + node:done.inputs 出参锚）；mock 模型实例 :78-80/:621-624；
  汇总行 :1128。
- `tools/gen-node-readmes.mjs`：MANUAL_NOTES :42-59（缺条目则现状备注渲染 `undefined`
  ——0031 SPEC 对 agent 同款踩点）；总索引「17 种」:105；硬断言 `types.length !== 17`
  :115；nodeReadme 五段结构 :71-97（能力表按 KIND_ORDER :35-40 渲染，`data` 护栏文案
  「无 IO（纯数据变换）」已在案，termview 零新增 kind）。
- 契约测试计数锚（全部需 17→18 / 36→38 联动，PRD 清单遗漏四处、§5 全表补齐）：
  `contract.test.mjs:10-11`（17 种）；`nodes-dirs.test.mjs:31`（D.size===17）；
  `defs-drift.test.mjs`（期望表 :17-35、自检 36 :38-41、消息 :44）；
  `param-handler-guard.test.mjs`（EXPECTED_ZOMBIES :92-95、total===36 :170-173）；
  `readme-consistency.test.mjs:62-66/:79/:87`（17 类型 / 17 行 / 18 份）；
  `synthesis.test.mjs:12-19`（caps 豁免循环 llm/agent/code——18−3=15 恰与既有文案
  「其余 15 键」一致，零改动）。
- 基线重产命令权威：`docs/node-definition-protocol-migration-spec.md:36`（node -e 直读
  dist 重定向 `packages/shared/test/nodes.baseline.json`）。
- 修宪轮直系先例（本会话 git 亲核）：`git show --stat 081b32d`（BK-0033：节点新增全套
  ——shared DEFS/handler/守卫计数/生成器/s3 重录/s8 新建/smoke 扩断言，20 文件）；49d54de
  （BK-0034 前端面板增量）；9bcb3bd（迭代 0013 修宪轮 s6/s7 golden-created）。

## 1. 范围与护栏裁示

- **触 UI = 是，修宪轮**（PRD 触UI 结论成立）：shared DEFS 新增 termview → 节点库
  output 分组自动 +1 条目（app.js:322-336 数据驱动）→ s3-library 像素必然变化 + s10
  新场景（§6）。
- **PTY 边界切割（ADR-0015 §4.4 写死，越界即中止）**：termview 是只读呈现 sink——
  无输入框、无 stdin、无用户写入面、零子进程、零新端点、零新依赖；**严禁** node-pty /
  PTY 会话（BK-0045 / ADR-0014 附录 A 专属）。实施中出现任何用户输入面/进程面需求 →
  立即中止转 needs-approval。
- **SSE 消费护栏（ADR-0015 §4.5）**：恰消费既有 15 种内的 `node:delta / node:done /
  node:error / output`（后端 handler 侧 emit('output')；前端 term 区消费前三者）。
  `events.ts` 零 diff 为机器判据；确需新增事件类型 → 中止转 needs-approval。
- **纯插入纪律**：`app.js` / `app.css` / `gate.mjs` 三文件改动 = 仅新增行
  （`git diff --numstat` 删除行数 = 0 为判据）；`nodes.ts` 头注计数置换为允许的
  注释行置换（§2，081b32d 先例）；`handlers.ts` 头注不动（§3）。`Skeleton.tsx`
  预期零改动（呈现区动态挂载，沿 0032 goal 面板「动态单例」先例）。
- **gate.mjs 修改合法性**：WORKFLOW §6.3「不修改 tools/pixel-gate/」在修宪轮让位于
  宪法第 3 条通道（0031 SPEC 同款裁示；先例 9bcb3bd / 081b32d 均在已批准 ADR 下改
  gate.mjs）。本轮 gate.mjs 仅**数据插入**（seed 常量 + 场景行），判定逻辑零触碰。

## 2. DEFS 终稿 · `packages/shared/src/nodes/termview/node.ts`（新增，≤30 行）

ADR-0015 §7 授权「终稿代码块归实施 SPEC」——以下即终稿，BUILD 逐字落盘
（字段与 ADR-0015 §2.2 草案 + PRD REQ-0037-01 字面一致；纯数据模块
`satisfies NodeDefJson`，零运行时代码，NDP §3）：

```ts
/* termview — 终端只读流（NDP 纯数据模块）
 * ADR-0015 §2.2 定稿（迭代 0034 / BK-0037 修宪轮）。呈现型 sink：与 reply 同构——
 * outputs 空数组（终点节点）、单入 in-stream type any、capabilities.data =
 * emit('output') + ctx.outputs 汇入运行产物、无出站 IO（handlers.ts termview）。
 * 命名刻意避开 terminal/pty 语义词（ADR-0015 §4.4 PTY 边界切割：只读呈现，
 * 无用户输入面，严禁 node-pty/PTY——BK-0045 专属面归 ADR-0014 附录 A）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'termview',
  identity: { name: '终端只读流', category: 'output', icon: 'code',
    keywords: 'termview 终端 只读 流式 呈现 输出',
    description: '将上游文本流以等宽终端样式只读呈现（终点节点）' },
  ports: {
    inputs: [{ id: 'in-stream', label: '数据流', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'lines', label: '缓冲行数', widget: 'number', default: 200, min: 20, max: 2000, step: 20 },
    { id: 'autoscroll', label: '自动滚动', widget: 'toggle', default: true },
  ],
  binding: { handler: 'termview', capabilities: { data: true } },
} satisfies NodeDefJson;
```

纪律自检（对 nodes.schema.ts 亲核口径）：端口类型 any ∈ 5 枚举 ✓；widget number/toggle ∈
5 枚举 ✓；category output ∈ 7 枚举（复用 `--cat-output`，零新类目零新 CSS 变量）✓；
`in-stream` 合正则 `^[a-z][a-z0-9-]{2,31}$` + in- 前缀 + 节点内唯一 ✓；number
default 200 ∈ [20,2000]、step 20>0 ✓；toggle default boolean ✓；params id 节点内唯一 ✓；
capabilities 仅 `data` ⊆ 十 kind ✓（**无 exec/net/fs**）；无 visibleIf；description 按父子
节点通例不带句尾句号（reply 带句号属其个体字面，本节点从 ADR-0015 §2.2 原文）。

**NODES 键位**：`termview` 键插在 `reply` 之后（nodes.ts:129 后一行 + import :33 后一行
——output 类目 sink 聚拢；键位决定 s3-library output 分组内条目序，本轮 s3 重录即固化）。
`packages/shared/src/nodes.ts` 头注「17 目录」→「18 目录」注释行置换（沿 BK-0033
commit 081b32d 先例，属允许的注释置换，不计入三敏感文件的纯插入判据）。

## 3. 呈现承载 · `apps/server/src/handlers.ts`（+termview 键，约 8 行）

reply 同构 sink（ADR-0015 §3），插在 `async reply`（:225-232）与 `async setvar`（:234）
之间——纯插入：

```ts
  async termview(ctx, { input, emit }): Promise<NodeResult> {
    const text = toStr(input);
    ctx.outputs!.push(text);
    emit('output', { text });
    return { value: text, out: `已呈现流 · ${text.length} 字` };
  },
```

- `toStr`（util.ts:26-34）承载空输入如实降级：null/undefined/`__trigger` 对象 → ''，
  out = 「已呈现流 · 0 字」，不伪造内容（PRD AC3 降级路径）。
- **handler 不引用 `p.lines` / `p.autoscroll`**——两参数是前端呈现面参数，服务端语义
  零参与；由此产生的僵尸参数登记见 §5（param-handler-guard EXPECTED_ZOMBIES +1 行）。
- 零出站零进程零文件零新依赖零新 env（PRD 非功能 1/3；`guard.ts` / `engine.ts` 零 diff
  机器判据）。`handlers.ts` 头注「基础 16 种」注释**不改**（零删改纪律优先于注释新鲜度，
  如实记录为已知陈旧注释）。

## 4. 前端呈现面（app.js 纯插入 ≈40 行 + app.css 纯插入 ≈8 行）

### 4.1 app.js 四处纯插入（既有行零删改）

1. **辅助函数段**（追加在 `setNodeOut`（:1897）附近段尾，两函数均新行；呈现态
   以 DOM textContent 即时状态承载，不新增 Map/存储）：

```js
/* ===== termview（BK-0037）：等宽只读流呈现区（ADR-0015 §4.2） =====
 * 惰性挂载：首个 node:delta/node:error 才创建（s0~s9 静态态零波及的前提）；
 * 只读——纯 div + textContent，无 input/stdin/写入面（PTY 切割护栏）。 */
const termEl = id => {
  const el = nodeEl(id); if(!el) return null;
  let t = el.querySelector('.node-term');
  if(!t){
    t = document.createElement('div'); t.className = 'node-term';
    el.insertBefore(t, el.querySelector('.node-out'));   /* .node-out(:775) 恒存在 */
    measurePorts(); updateEdgesOf([id]);                 /* 高度变化 → portCache 刷新（已知陷阱条款） */
  }
  return t;
};
const termConsume = ev => {
  const n = nodeById(ev.id); if(!n || n.type!=='termview') return;
  if(ev.type==='node:delta'){
    const t = termEl(ev.id); if(!t) return;
    const N = Math.max(1, Number(paramsOf(n).lines)||200);
    const kept = String(ev.text||'').split('\n').slice(-N).join('\n');   /* 超限裁旧 */
    t.textContent = kept + '▌';
    if(paramsOf(n).autoscroll !== false) t.scrollTop = t.scrollHeight;   /* 自动滚动 */
    measurePorts(); updateEdgesOf([ev.id]);
  }else if(ev.type==='node:done'){
    const box = nodeEl(ev.id)?.querySelector('.node-term'); if(!box) return;
    if(box.textContent.endsWith('▌')) box.textContent = box.textContent.slice(0,-1);  /* 定稿去光标 */
  }else if(ev.type==='node:error'){
    const t = termEl(ev.id); if(!t) return;
    const err = document.createElement('div'); err.className = 'node-term-err';
    err.textContent = '✗ ' + String(ev.message||'').slice(0,200);
    t.appendChild(err);
    if(paramsOf(n).autoscroll !== false) t.scrollTop = t.scrollHeight;
    measurePorts(); updateEdgesOf([ev.id]);
  }
};
```

   （BUILD 落盘语义以本条文字为准：done 分支 = 区已存在则去光标定稿、不存在则零操作
   ——非流式上游无 delta 即无呈现区，如实不伪造流式语义。）

2. **onEvent 前置钩子**（插在 `const onEvent = ev=>{`（:2133）与 `switch(ev.type){`
   （:2134）之间，新行不改既有行）：

```js
    /* termview 消费钩子（BK-0037）：delta/done/error 三事件旁路进呈现区；
       既有 case 语义零触碰——.node-out 摘要行为保持原样（容器纪律） */
    if(ev.type==='node:delta'||ev.type==='node:done'||ev.type==='node:error') termConsume(ev);
```

3. **RUN_META 一行**（插在 approval 行 :1883 之后）：

```js
  termview:  {dur:700,  out:()=>'[agentflow] stream ready\n▍ 等宽只读流演示 · 逐行追加\n▍ 本文本为离线模拟文案'},
```

4. **runSimulated 两行**（插在落定 `setNodeOut(id, outText);`（:2005）之前）——
   模拟执行与真实运行共用同一条 termConsume 代码路径（PRD REQ-0037-03 语义一致要求）：

```js
    if(n.type==='termview'){ termConsume({id,type:'node:delta',text:outText}); termConsume({id,type:'node:done'}); }
```

### 4.2 app.css 新选择器（追加文件尾，纯插入）

```css
/* ================= 终端只读流（termview · ADR-0015 §4.2 · 迭代 0034） ================= */
.node-term{display:block;margin:4px 8px 8px;padding:6px 8px;background:rgba(0,0,0,.45);border-left:2px solid #34d399;
  font-family:var(--mono);font-size:11px;line-height:1.45;color:#9fe0c0;white-space:pre-wrap;word-break:break-all;
  max-height:160px;overflow-y:auto;user-select:text}
.node.collapsed .node-term{display:none}
.node-term-err{color:var(--err)}
```

- 值取既有家族（.node-out :259-261 同款底色/边框/字号/文字色系 + `--mono` :26 +
  `--err`）；`white-space:pre-wrap` 属 ADR-0015 §4.2「white-space:pre 类语义」
  （保留换行 + 折行防横向滚动条 → 像素确定性）；max-height 160px + overflow-y:auto
  承载 `lines` 裁旧与滚动；`user-select:text` 是选择不是输入（只读性不受影响）。
- `.node-out` 既有三规则（:259-261）零改动——摘要语义与呈现区容器严格分离（容器纪律）。

### 4.3 只读性与确定性

- 呈现区无任何 input/textarea/contenteditable（grep 断言见 §9 AC5）；点击不出现可编辑
  控件、不发起任何网络请求（AC4-④）。
- delta = 累积全文覆盖（llm.ts:89/:101/:103 代码依据 + 既有消费点 app.js:2160 同语义），
  非追加，避免重复累积（PRD REQ-0037-03 增量语义）；`lines` 裁旧按最终文本行数切片；
  `autoscroll=false` 不动 scrollTop（滚动位置确定）。

## 5. 契约与守卫联动（计数全表——含 PRD 清单遗漏的四处）

NDP 落地联动四件套沿 BK-0033 commit 081b32d 全套先例（该提交实际触碰下表全部文件）：

| # | 文件 | 改动 | 依据锚点 |
| --- | --- | --- | --- |
| 5.1 | `packages/shared/test/nodes.baseline.json` | 重产（17→18 键，经批准通道） | NDP 迁移 SPEC §2 命令（`docs/node-definition-protocol-migration-spec.md:36`）；synthesis 快照比对（synthesis.test.mjs:56+） |
| 5.2 | `packages/shared/test/contract.test.mjs` | :10-11 `17 种/17` → `18 种/18` | 本会话亲核原文 |
| 5.3 | `packages/shared/test/nodes-dirs.test.mjs` | :31 `D.size===17`→`===18`（+头注 :5 计数） | 同上 |
| 5.4 | `packages/shared/test/defs-drift.test.mjs` | EXPECTED_DEFAULTS 增 `termview: { lines: 200, autoscroll: true }` 行（reply 行后）；自检 36→38（:38-41）；消息 17 种→18 种（:44） | :17-35/:38-41/:44 |
| 5.5 | `packages/shared/test/param-handler-guard.test.mjs` | EXPECTED_ZOMBIES 增 `['termview', ['lines','autoscroll']]`（:92-95）；total 36→38（:170-173，含消息）；refCount 断言 `total−zombie = 31` **数值不变**（38−7=36−5，两侧同 +2）；提取器零改动（handler 在 handlers.ts，`async termview(` 归属规则自动生效） | :41-54/:92-95/:170-173 |
| 5.6 | `packages/shared/test/readme-consistency.test.mjs` | 计数文案 17 类型→18（:62-66）、总索引 17 行→18（:79）、18 份→19 份（:87）——断言逻辑 TYPES 驱动零改动 | :62-87 |
| 5.7 | `packages/shared/test/synthesis.test.mjs` | **零改动**（caps 豁免循环 llm/agent/code → 18−3=15 恰与既有「其余 15 键」文案一致；EXPECTED_ORDER 不含 termview；基线文件本身即 5.1 重产物） | :12-19/:56+ |
| 5.8 | `tools/gen-node-readmes.mjs` | `!== 17`→`!== 18`（:115）；「17 种」→「18 种」（:105）；MANUAL_NOTES 增 termview 条目（缺省则现状备注渲染 `undefined`——0031 对 agent 同款踩点），建议文案：「只读呈现 sink：emit('output') + ctx.outputs 汇入（handlers.ts termview）；lines/autoscroll 为前端呈现参数（服务端零参与，僵尸登记在案）；无用户输入面（PTY 切割，ADR-0015 §4.4）。」 | :42-59/:105/:115 |
| 5.9 | `packages/shared/src/nodes/README.md` + `packages/shared/src/nodes/termview/README.md` | 由生成器产出（`npm run build:shared && node tools/gen-node-readmes.mjs`），**勿手写**；总索引 +1 行 | 生成器幂等机制 |

`nodes-dirs` 的 D===R 与「引用边界」断言、`handlers-coverage`（HANDLERS⊇NODES）随
handler 键入列自动满足，零改动。`schema.test.mjs` / `events-negative.test.mjs` 零改动。

## 6. golden 重录方案（修宪轮必答项）

**宪法第 3 条依据**：issue#3 用户本人批复「批准」（2026-10-23T15:49:32Z，本会话 gh 亲核
在案）+ ADR-0015（§6 golden 双通道预案 + §7 权威字面量）——宪法第 3 条「ADR + 用户本人
批准」两要素齐备，同迭代重录合法（WORKFLOW §4 修宪轮通道；`npm run gate:update` 本轮
允许恰一次，超一次即违规）。

### 6.1 新场景：s10-termview-node（golden-created 通道，禁用 update 的场景面）

- 形态沿 s8-agent-node 预案（gate.mjs:183-186/:230-231）：**静态呈现态**，无 routes、
  无 ready 钩子、不变量 = 公共六键（PRD REQ-0037-05 明示优先静态场景；在线流式场景
  需 RUN_ROUTES 类 fixture 且流式时序不可收敛——迭代 0013 BUG-0026 教训，**不采用**）。
- gate.mjs 纯插入（判定逻辑零触碰）：

```js
/* ---------- s10 终端只读流节点场景基建（ADR-0015 §6 · 迭代 0034 / BK-0037 修宪轮） ----------
   采集面 = output 类目色标题栏 + code 图标（既有键复用）+ lines/autoscroll 两 widget 行
   + in-stream 单入端口 + trigger→termview 一条连线；呈现区为惰性挂载（首个 delta 才创建）
   → 静态态不出现 → 场景与 s8 同构确定。 */
const TERMVIEW_WF_SEED = JSON.stringify({ tabs: [{ name: '终端只读流示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'termview', x: 410, y: 250, title: '终端只读流' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });
```

  场景表插入行（s9 行 :232-234 之后）：

```js
  { id: 's10-termview-node', steps: [],
    seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), TERMVIEW_WF_SEED) },
```

- 预期不变量（落盘后核对，计数法沿 s8 golden 实测口径 s8=widgets4/ports5）：nodes=2、
  edges=1、widgets=**3**（trigger mode 1 行——cron/path visibleIf 默认隐藏 +
  termview lines/autoscroll 2 行）、ports=**2**（trigger 单出 + termview 单入）、
  view/zoom 沿 seed 字面。
- **场景编号占号协调**：ADR-0015 §6「编号按落盘时序（预期 s10+）」——并行路 BK-0036
  （webshow）同样预期 s10。本轮在本工作树落盘 `s10-termview-node`；合并时若与 BK-0036
  场景号/文件名冲突，由**后落地分支**按合并后事实顺延重命名（gate.mjs 场景行 + golden
  文件名机械改名，§10 申报交仲裁员；不构成产品语义择一）。

### 6.2 受波及既有场景：仅 s3-library（修宪轮重录）

- 波及机理：节点库 output 分组条目 +1（output 类目现状 = reply/setvar 两行
  ——approval 属 human 类目（`approval/node.ts:11`），ADR-0015 §6「setvar/reply 两行」
  与代码一致 → +termview 后分组计数 2→3，数据驱动渲染 app.js:322-336）——像素必然
  变化，ADR-0015 §6 预案在案。
- s0/s1/s2/s4~s9 **预期零波及**（无 rail/顶栏/默认工作流/面板变化；term 呈现区惰性挂载
  不进任何静态态；图标 `code` 与类目色均为既有常量，cssVars 键集零新增）。
- **执行程序（AC1 口径）**：
  1. 工作树内 `npm run build` → `npm run gate`：**预期恰 s3 一红 + s10 记 golden-created**；
     s0/s1/s2/s4~s9 必须全 pass——任一意外红 = FAIL，中止排查，不得重录掩盖。
  2. 仅 s3 红 → 执行恰一次 `npm run gate:update`（宪法第 3 条通道，脚本修宪轮护栏内）；
     `--update` 会重写全部场景（gate.mjs:299），但零波及场景产物逐字节相同 → git status
     仅 s3 两个文件变更 + s10 两个文件新增（BK-0033 先例 commit 081b32d 同款证据形态）。
  3. 复跑 `npm run gate` 全绿（11 场景）。
- **AC7 确定性双采**：基线落盘后再连续两轮 `npm run gate`，11 场景 diffPx=0（两次独立
  采集与基线逐字节一致）；不能收敛 → FAIL 中止，不得以重录掩盖。

## 7. 受影响文件清单（BUILD 产品提交白名单；`git show --numstat` 核对基准）

| # | 文件 | 动作 | 说明 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/termview/node.ts` | 新增 | §2 终稿代码块（≤30 行） |
| 2 | `packages/shared/src/nodes/termview/README.md` | 新增（生成器产出） | §5.9 |
| 3 | `packages/shared/src/nodes/README.md` | 改（生成器重跑） | 总索引 +1 行 + 「17 种」→「18 种」 |
| 4 | `packages/shared/src/nodes.ts` | 改（+1 import +1 键 + 头注计数置换） | §2 键位：reply 之后 |
| 5 | `packages/shared/src/nodes.schema.ts` | 零改动 | 冻结枚举内组合（§2 自检） |
| 6 | `tools/gen-node-readmes.mjs` | 改（+MANUAL_NOTES 一条 + 两处计数） | §5.8 |
| 7 | `packages/shared/test/nodes.baseline.json` | 改（重产） | §5.1（经批准通道） |
| 8 | `packages/shared/test/contract.test.mjs` | 改（17→18） | §5.2 |
| 9 | `packages/shared/test/nodes-dirs.test.mjs` | 改（D.size 18） | §5.3 |
| 10 | `packages/shared/test/defs-drift.test.mjs` | 改（+termview 行，36→38） | §5.4 |
| 11 | `packages/shared/test/param-handler-guard.test.mjs` | 改（+termview 僵尸行，total 38） | §5.5 |
| 12 | `packages/shared/test/readme-consistency.test.mjs` | 改（计数文案 18/19） | §5.6 |
| 13 | `apps/server/src/handlers.ts` | 改（+termview handler ≈8 行，纯插入） | §3 |
| 14 | `apps/web/src/legacy/app.js` | 改（纯插入四处 ≈40 行） | §4.1 |
| 15 | `apps/web/src/app.css` | 改（纯插入 ≈8 行） | §4.2 |
| 16 | `tools/pixel-gate/gate.mjs` | 改（纯插入：seed 常量 + 场景行） | §6.1 |
| 17 | `tests/golden/ui/s10-termview-node.png` + `.invariants.json` | 新增 | golden-created（§6.1） |
| 18 | `tests/golden/ui/s3-library.png` + `.invariants.json` | 改（修宪轮重录） | §6.2 |
| 19 | `tests/smoke/smoke-server.mjs` | 改（+termview 断言组 ≈3 条） | §9 AC3 |
| 20 | `docs/adr/0015-presentation-triplet-nodes.md` | 改（状态行 + §7 termview 行尾实施纪要） | §8（随产品提交，081b32d 先例） |

**禁区（零 diff 机器判据）**：`package.json` / `package-lock.json`（零依赖）、
`apps/server/src/engine.ts`（自动注册零改动）、`apps/server/src/guard.ts`、
`packages/shared/src/events.ts`（零新增 SSE）、`apps/web/src/Skeleton.tsx`、
`apps/server/src/server.ts` / `llm.ts` / `agent.ts` / `store.ts`、
`packages/shared/src/nodes.schema.ts`、`CONSTITUTION.md`、`AGENTS.md`、`.github/**`、
`tests/golden/ui/` 除 #17/#18 外全部文件、`synthesis.test.mjs`（§5.7）。
grep 断言禁区补充：全库源码 `node-pty` 零命中；termview 相关新增代码
`contenteditable` / `<input` / `stdin` 零命中。

**机制件（不入产品白名单）**：`docs/evolution/STATE.md`（过程态）、
`docs/evolution/iterations/0034/*`（PRD/SPEC/JOURNAL/REPORT）、
`docs/evolution/BACKLOG.md`（BK-0037 终态回写归 CLOSE）。

## 8. ADR-0015 回写（归 BUILD 产品提交）

- 状态行：按 ADR-0013 消费回写先例（081b32d/49d54de 两 commit 均含 docs/adr/0013 置换）
  更新为「已获用户 issue#3 批复（2026-10-23T15:49:32Z 承继）· BK-0037 实施轮已消费
  （迭代 0034）· BK-0036/0038 待实施」口径（保留草案态措辞纪律：除批复承继事实外
  不新增批准态措辞）。
- §7 termview 权威字面量代码块尾追加一行实施纪要：迭代号、本 SPEC 路径、s10 落盘编号、
  守卫联动计数（18 键 / 38 参数 / 僵尸 +2）。
- `docs/evolution/BACKLOG.md` BK-0037 行终态回写归 CLOSE（PRD 受影响清单该行同口径）。

## 9. 验收口径（AC；命令均在工作树 `.zcode/worktree/feat/0034-iter` 内执行）

- **AC1 gate**：`npm run build` 绿 → `npm run gate` 按 §6.2 程序走（恰 s3 一红 +
  s10 golden-created → 恰一次 `gate:update` → 11 场景全绿）；s0/s1/s2/s4~s9 零波及
  实测（`git status` 仅 s3 变更 + s10 新增为字节级佐证）；本轮 gate:update 次数 = 1。
- **AC2 契约**：`npm test` 全绿（基线 30 项零回退 + 本轮计数联动项按 §5 全表通过；
  基线实证 = 本会话亲跑 `npm test` → 30 pass / 0 fail）。
- **AC3 冒烟**：`npm run smoke:server` 全绿（基线 104 断言零回退——本会话亲跑
  `104 passed / 0 failed`；新增 termview 断言组建议 T01-T03：① prompt→termview 全文
  路径：termview `node:done.out === '已呈现流 · N 字'`（N=prompt 渲染定长文本）+
  `output` 事件 text=全文 + `run:done.outputs` 含全文；② trigger→termview 直连空输入
  降级：`out === '已呈现流 · 0 字'`（util toStr 对 `__trigger` 返回 '' 的代码依据
  util.ts:30）；③ mock 模型请求数零增量 = 零出站佐证。沿 A 组 openSse/waitFor 先例
  smoke-server.mjs:905-935）。
- **AC4 手动 E2E 五点位**（浏览器实跑 `npm start`；本机无 provider key 时 ③ 的流式
  中段以 smoke T01 + llm.ts delta 代码路径核对佐证并如实标注，沿 0031/0032 口径）：
  ① 节点库「输出」分组出现「终端只读流」（分组计数 2→3）；② 拖入画布：节点体出现
  缓冲行数/自动滚动两 widget 行与「数据流」入端口；③ 与 llm 连线真实运行：呈现区随
  node:delta 覆盖更新（含 `▌` 光标）、node:done 去光标定稿、node:out 摘要行照常；
  ④ 只读性：点击呈现区无可编辑控件、DevTools Network 面板零新增请求；⑤ lines 裁旧
  （>200 行时首行消失）与 autoscroll 关闭（滚动位置不动）可见。
- **AC5 白名单与禁区**：改动文件恰为 §7 清单；禁区路径 `git diff` 恒空；
  `package-lock.json` 零变化；`grep -rn "node-pty" apps packages tools` 零命中；
  app.js/app.css/gate.mjs 三文件 `git diff --numstat` 删除行数 = 0。
- **AC6 指针抽样**：≥5 组代码/ADR 指针逐条亲核零杜撰（行号按 §0.2 本会话亲核值）。
- **AC7 确定性**：§6.2 程序末尾连续两轮 `npm run gate` 11 场景 diffPx=0。
- **AC8 并行冲突申报**：BUILD/VERIFY 按实记录与 BK-0036 的产品文件交集并写入
  JOURNAL/REPORT（清单见 §10），交仲裁员处置。

## 10. 与并行路 BK-0036 的产品文件交集申报（PRD 事实校正 §2 落地）

两分支均改：`nodes.ts`（不同键：webshow vs termview）、`nodes.baseline.json`（17 键
叠加各自的 +1 → 两分支基线各含对方没有的键）、contract/nodes-dirs/defs-drift/
param-handler-guard/readme-consistency 五测试计数、`gen-node-readmes.mjs`、
`nodes/README.md` 总索引、`app.js` / `app.css` / `gate.mjs` / `smoke-server.mjs`、
s3-library golden、handlers.ts。按 WORKFLOW §6 护栏 9：**产品代码冲突不得自行择一**，
如实报告交用户裁决；机械可并形（keys/baseline/计数在两节点先后落地后的合并事实收敛）
由后落地分支按合并后基线重产与重跑门禁校正（PRD 同款口径）。场景号 s10 撞号按 §6.1
顺延重命名。

## 11. 回滚

VERIFY FAIL 达修复上限（2 轮）→ `git revert <产品提交>`（唯一手段）；s10 golden 两文件
随 revert 删除，s3 由 revert 恢复重录前基线；工作树整体丢弃时主干零影响（v3 隔离保证）。
