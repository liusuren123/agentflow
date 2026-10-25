# SPEC · 迭代 0033 · BK-0036 呈现三件套·网页展示节点（webshow）：NDP 定义 + 呈现承载 + 画布 iframe 安全呈现（修宪轮 · 批次 1）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 19:40（工作树 `.zcode/worktree/feat/0033-iter`，分支 `feat/0033-iter`）
> 输入：`iterations/0033/PRD.md`（PLAN 产物）+ ADR-0015（定界权威）+ 本会话只读代码核实（§0）。
> 权威顺位：CONSTITUTION > AGENTS > WORKFLOW > POLICY > ADR-0015 > PRD > 本 SPEC。
> 修宪授权链（宪法第 3 条三要素齐备）：**issue#3 用户批复承继（2026-10-23T15:49:32Z，
> BACKLOG BK-9003 行在案，PRD 选题存证节 gh 亲核记录）+ ADR-0015（§2.1 DEFS 草案 /
> §3 承载定界 / §4.1 iframe 安全三写死 / §5 分批编排 / §6 golden 双通道）+ 本迭代内
> golden 增量（s10）与重录（s3）**。
> ADR 处置：**零新 ADR（needsAdr=false）**——本迭代全部架构决策已由 ADR-0015 承载
> （迭代 0029 落盘），本 SPEC 仅消费之；本 SPEC 的落地级设计（呈现容器选型 / URL 解析序 /
> referrerpolicy 收紧 / NODES 键位）均在 ADR-0015 §3/§4.1 授权面内，属实现决策不构成新
> 架构决策。ADR-0015 的**实施轮增补**（状态行 + §7 BK-0036 实施纪要 + §2.4/§5 计数
> 校正 16→17→**18** 按代码事实）是 BUILD 产品提交的兑现义务（§2 表 #19，沿
> ADR-0013 显著声明自定协议 + 迭代 0031 先例）。

## 0. 本会话代码核实记录（2026-10-25 18:55~19:35，工作树内只读）

PRD 背景节锚点逐条复核**全部命中**，关键实测（命令与输出摘录）：

- `node -e "const b=require('./packages/shared/test/nodes.baseline.json');…"` →
  **17 键**：`trigger,userinput,llm,agent,prompt,retrieval,websearch,http,code,notify,
  condition,loop,delay,merge,reply,setvar,approval`；`ls packages/shared/src/nodes/` →
  17 目录 + 总索引 README.md（无孤儿）；
  `node -e` 数 `Object.values(m.NODES).reduce((n,d)=>n+d.params.length,0)` → **36**。
- `packages/shared/src/nodes.ts`（144 行）：import 集 :19-35（17 个）、NODES 键表
  :114-132（17 键声明序与 baseline 一致）、三导出 :114/:135/:140、caps 合成 :98-100
  （只映射 mcp/skill，`data` 不进 caps）、头注 :4-6「17 目录全量」。
- `packages/shared/src/nodes/reply/node.ts`（21 行）sink 样板：outputs `[]`、单入
  `in-content` type any、`binding { handler:'reply', capabilities:{ data:true } }`。
- `packages/shared/src/nodes.schema.ts`：PORT_TYPES 五枚举 :13、CATEGORIES 七枚举 :15
  （`output` ∈）、PortIdSchema :18-21（`in-url` 合规）、widget×default 矩阵 :50-58
  （text↔string / toggle↔boolean）、capabilities 十 kind :72-83（`data` ∈）、
  superRefine 端口前缀/唯一 :152-165。
- `apps/server/src/handlers.ts`（298 行）：BASIC_HANDLERS :17、reply sink :225-232、
  `guardedFetch` import :9 与 http 出站 :91 / notify Webhook :126-131（webshow **不得**
  触碰的对照面）、`preview`/`strInput` 已 import :11。`apps/server/src/engine.ts`
  :27-31 HANDLERS = `{...BASIC_HANDLERS, llm, agent}` → **webshow 键入
  BASIC_HANDLERS 即自动注册，engine.ts 零改动**。
- `apps/web/src/legacy/app.js`（2650 行）：CATS :47（output :53）、ICON_PATHS `globe`
  :64（websearch 同键占用，`I()` :101 按键查表无唯一性约束）、`DEFS = NODES` :134、
  `paramsOf` :194-198、节点库 DEFS×CATS 数据驱动渲染 :323-338、`makeNodeEl` :757-777
  （`.node-out` 于 :775 随 innerHTML 生成、节点体输出区唯一容器）、`rerenderNode`
  :1075-1080、`RUN_META` :1867-1884（17 键，缺省回退 `{dur:600,out:()=>'完成'}`
  :1204/:1962）、`setNodeOut` :1897（textContent 单行写）、SSE onEvent：node:done
  case :2163-2178（setNodeOut :2166 → barDone :2167 → measurePorts :2168）、
  node:delta :2158-2161 / node:error :2180-2188 / output :2193-2197、`lastRunData`
  写入 :2176（inputs[].val = engine preview 140 截断）、LS_KEY :171（`agentflow.v2`）。
- `apps/web/src/app.css`（586 行）：`:root` :2-28（`--cat-output:#f472b6` :20、无
  iframe 相干既有选择器）、`.node-out` :259-261（`display:none` + `.st-done` 显示、
  `max-height:66px`）、折叠仅隐 widgets :223（node-out 不受折叠影响）。
- `apps/web/src/Skeleton.tsx`：无 node-out/iframe 相干静态节点（grep 亲核）→ 零改动。
- `tools/pixel-gate/gate.mjs`（332 行）：SCENARIOS :219-235（**10 场景 s0~s9**）、
  golden-created 通道 :299-304（`!existsSync(gPng)` 即落盘并记 `golden-created`）、
  s8 seed 先例 :230-231 + AGENT_WF_SEED :183-186、`tests/golden/ui/` 现 s0~s9 共 20 文件。
- `tests/smoke/smoke-server.mjs`（1129 行）：断言组字母占用亲核 =
  P/M/H/W/N/S/R/D/E/K/G/V/A/Z/C；组落点 A 组止于 :1036、Z 组起于 :1038；
  Checker（lib.mjs:219-239）与 `openSse(base, wf)` 用法沿 A 组 :893-898。
- **PRD 未列、本 SPEC 新核实的硬依赖三处**（不改则 AC1 不可达，§2 增补依据）：
  ① `tools/gen-node-readmes.mjs:115` `types.length !== 17` 硬断言 throw（README 再生产
  必然失败）；② `packages/shared/test/param-handler-guard.test.mjs:135` 总数 `===36`
  断言（+2 参数即红）；③ `packages/shared/test/{contract,synthesis}.test.mjs` 的
  17 键具名断言（:10-11 / :15-23 / :56）。**webshow handler 落在 handlers.ts →
  param-handler-guard 提取器（:37-50 按 `async <name>(` 归属）自动覆盖，无需新提取器**
  （agent.ts 当年需自建提取器的差异在于独立文件）。
- 工作区状态：`git status --short` = `M docs/evolution/BACKLOG.md`（BK-0050 晋升，
  PLAN 机制件）+ `M docs/evolution/STATE.md`（过程态）+ `?? docs/evolution/iterations/0033/`；
  HEAD = `84ee8ec`；产品代码零未提交改动。

## 1. 范围与护栏裁示

- **触 UI = 是，修宪轮**（PRD 分类结论）：shared DEFS 新增 webshow → 节点库 output
  分组自动新增「网页展示」条目（app.js:323-338 数据驱动，output 组现 reply/setvar
  两行 → 3 行）→ s3-library 修宪重录 + s10 新场景（§7）。前端改动**收敛于呈现分支**
  （app.js 呈现函数 + app.css 新选择器，均纯插入）；Skeleton.tsx 零改动。
- **gate.mjs 修改合法性**：WORKFLOW §6.3「不修改 tools/pixel-gate/」在修宪轮让位于
  宪法第 3 条通道——直系先例迭代 0011 e3bf60b / 0013 9bcb3bd / 0031（s8）均在已批准
  ADR 下增场景（PRD 表 #12 + ADR-0015 §6 在案）。**改动形态硬边界：仅「WEBSHOW_WF_SEED
  常量 + s10 场景行」纯插入；既有 s0~s9 场景定义与比对逻辑（0 容差 pixelmatch、不变量
  采集、golden-created 判定）逐字节零改动**。
- **safety 三写死（本项最高优先，ADR-0015 §4.1）**：① iframe `sandbox` 默认最严
  （空值属性：禁脚本/禁同源/禁表单/禁弹窗），`sandbox=false` 移除属性（用户显式选择，
  界面可见）；② 协议白名单仅 http(s)，前端 + handler **双保险各自独立校验**（信任
  边界两侧，不共享实现——前端的校验不因服务端校验存在而省略）；③ **服务端零出站**：
  不抓取、不代理、不转存，webshow handler 无任何 fetch/guardedFetch 调用；**禁止
  `allow-scripts + allow-same-origin` 组合**（本设计用空值 sandbox 或整体移除，天然
  不可能出现该组合——若实施中出现任何 allow-* 分化即越出授权面，中止转 needs-approval）。
- **SSE 护栏（ADR-0015 §4.5）**：仅消费既有 `output` / `log` 事件 + 引擎既发的
  node:* / run:*；`packages/shared/src/events.ts` 零 diff 为机器证明；确需新增事件类型
  即中止转 needs-approval（BK-0016 先例）。
- **零新依赖 / 零新 env / 零新端点 / 零新端口类型 / 零新 widget / 零新类目 / 零新
  CSS 变量**：package-lock.json、config、nodes.schema.ts、events.ts、engine.ts、
  guard.ts 零 diff（AC5 机器证明）；`height` 呈现尺寸参数不做（PRD out of scope，
  呈现高度由 CSS 容器定）。
- **PTV/PTY 与用户输入面零涉**（ADR-0015 §4.4 边界切割）：webshow 无输入交互、无
  进程面；实施期若确需即越出 issue#3 承继授权，立即中止转 needs-approval。

## 2. 受影响文件清单终稿（AC5 白名单；`git show --numstat <产品提交>` 核对基准）

PRD 表 1~13 的落定细化 + **四处增补**（增补依据 = §0 新核实的硬依赖，沿迭代 0031
SPEC §2「必然前置」先例：①生成器硬断言不改则 README 再生产 throw，是 PRD 表 #2
「README 生成器产出」的必然前置；②③具名计数断言不改则 `npm test` 必红，属 PRD 表 #5
「守卫/契约测试联动 · SPEC 定」授权范围；④总索引 README 再生成是生成器幂等产出的
一部分，readme-consistency 要求索引行集 ≡ NODES 键集）：

| # | 文件 | 动作 | 行级说明与预算 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/webshow/node.ts` | 新增 | ~24 行，§3 终稿全文（ADR-0015 §2.1 草案定稿 + 头注） |
| 2 | `packages/shared/src/nodes/webshow/README.md` | 新增 | 生成器产出（`node tools/gen-node-readmes.mjs`） |
| 3 | `packages/shared/src/nodes/README.md` | 改（再生成） | 总索引：+webshow 行（setvar 后）、行序随 NODES、「17 种节点」文案 → 18（#11 生成器改后重跑） |
| 4 | `packages/shared/src/nodes.ts` | 改 | +1 import（webshowDef，:34 setvarDef 后）+1 键（webshow，:130 setvar 键后）+ 头注 :4-6「17 目录」→「18 目录」并补 webshow 枚举；144 → ~147 行 |
| 5 | `packages/shared/test/nodes.baseline.json` | 再生产 | 17→**18 键**（§6.1 命令；diff 恰 +1 键 webshow、键位 setvar 后为判据） |
| 6 | `tools/gen-node-readmes.mjs` | 改 | 三处：:105 总索引模板「17 种节点定义」→「18 种」/ :115 硬断言 `!== 17` → `!== 18` / MANUAL_NOTES（:42-59）+webshow 条目（§6.3 字面）；+3~4 行 |
| 7 | `packages/shared/test/nodes-dirs.test.mjs` | 改 | :31 `D.size===17`→`18` + :5 注释「D.size===17」同步 |
| 8 | `packages/shared/test/defs-drift.test.mjs` | 改 | EXPECTED_DEFAULTS +webshow 两参数（:28 setvar 行后，§6.2 字面量）；① 计数 36→38 + 头注（:3-4/:11）「17 种 × 36」→「18 种 × 38」 |
| 9 | `packages/shared/test/contract.test.mjs` | 改 | :10-11 标题「17 种节点」/`length===17` → 18 |
| 10 | `packages/shared/test/synthesis.test.mjs` | 改 | caps 用例跳过集 +webshow（capabilities.data 不进 caps → 无 caps 键）、「其余 15 键」→16、标题同步；EXPECTED_ORDER +`webshow:['url','sandbox']`（标题 9→10）；快照用例标题「17 键」→18（比对本体动态零改） |
| 11 | `packages/shared/test/readme-consistency.test.mjs` | 改 | :5 注释、:63/:66/:80 文案「17」→「18」、:87 标题「18 份」→「19 份」（比对本体动态零改） |
| 12 | `apps/server/src/handlers.ts` | 改 | BASIC_HANDLERS +`webshow` 键（setvar 后 reply 邻位，§4 伪码）；298 → ~313~318 ≤400 |
| 13 | `apps/web/src/legacy/app.js` | 改 | 纯插入：`WS_HTTP_S` 常量 + `webshowUrlOf` + `setNodeWebshow`（§5）+ node:done case 1 行（:2166 setNodeOut 后）+ RUN_META webshow 行 1 条（:1884 前）；2650 → ~2682 |
| 14 | `apps/web/src/app.css` | 改 | +4 行纯插入（:261 `.node.st-done .node-out` 之后，§5.4 三个新选择器） |
| 15 | `tests/smoke/smoke-server.mjs` | 改 | O 组 O01~O05（落位 :1036 A 组后、:1038 Z 组前）+ wfShow 夹具工厂（:73 wfCode 后）+ 头注 O 组行；+~95 行 → ~1224 |
| 16 | `tools/pixel-gate/gate.mjs` | 改 | WEBSHOW_WF_SEED 常量（AGENT_WF_SEED 邻位）+ s10 场景行（:234 s9 后、:235 `];` 前）；纯插入 ~7 行 |
| 17 | `tests/golden/ui/s10-webshow-node.png` + `.invariants.json` | 新增 | golden-created 通道（§7.2） |
| 18 | `tests/golden/ui/s3-library.png`（`.invariants.json` 预期字节不变） | 重录 | 修宪轮 gate:update **恰一次**通道（§7.3） |
| 19 | `docs/adr/0015-presentation-triplet-nodes.md` | 改 | 实施轮增补：头部状态行（§8.7 字面）+ §7 追加 BK-0036 实施纪要 + §2.4/§5 计数按代码事实校正（baseline 16→17 旧数 → 本轮实为 **17→18**） |

**零 diff 机器证明面（禁区）**：`apps/web/src/Skeleton.tsx`、`apps/web/src/server-sync.js`、
`apps/server/src/{engine.ts,guard.ts,llm.ts,agent.ts,server.ts,store.ts,sessions.ts,
tools.ts,config 相关}`、`packages/shared/src/{events.ts,nodes.schema.ts,types.ts,
index.ts}` 与 `packages/shared/src/nodes/` 除 `webshow/` 外全部目录、`package.json`、
`package-lock.json`、`.github/**`、`tests/canvas/**`、`tests/golden/ui/` 除 #17/#18
外全部文件。

## 3. webshow NDP 定义终稿（#1，`satisfies NodeDefJson` 纯数据模块）

ADR-0015 §2.1 草案 → 终稿全文（BUILD 逐字落盘，头注字段名与草案一致；**`satisfies`
收口、模块只 import `nodes.schema.js` 类型**，沿 reply/setvar 样板）：

```ts
/* webshow — 网页展示（NDP 纯数据模块）
 * 迭代 0033 / BK-0036 修宪轮落盘（issue#3 承继 2026-10-23T15:49:32Z + ADR-0015 §2.1）。
 * sink 同构 reply：outputs 空数组（终点节点）；capabilities.data = emit('output') +
 * ctx.outputs 汇入运行产物、服务端零出站（不抓取/不代理/不转存——内容获取归既有
 * http 节点，handlers.ts webshow）；icon globe 复用 ICON_PATHS 既有键（app.js:64，
 * 与 websearch 同键——I() 按键查表无唯一性约束）。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'webshow',
  identity: { name: '网页展示', category: 'output', icon: 'globe',
    keywords: 'webshow 网页 展示 预览 iframe 呈现',
    description: '将上游网址以内嵌安全视图呈现（终点节点）。' },
  ports: {
    inputs: [{ id: 'in-url', label: '网址', type: 'any' }],
    outputs: [],
  },
  params: [
    { id: 'url', label: '兜底网址', widget: 'text', default: '' },
    { id: 'sandbox', label: '沙箱隔离', widget: 'toggle', default: true },
  ],
  binding: { handler: 'webshow', capabilities: { data: true } },
} satisfies NodeDefJson;
```

**schema 纪律自检（ADR-0015 §2.4 九条，本会话逐条复核成立）**：端口 id `in-url` 匹配
`^[a-z][a-z0-9-]{2,31}$`（nodes.schema.ts:18-21）且节点内唯一、in- 前缀合规
（:152-159）；outputs 空数组无 out- 义务（reply/notify 同构先例）；端口类型 `any` ∈
五枚举（:13）；params id 节点内唯一（:115-122）；widget×default 矩阵——text default
`''`（string）✓、toggle default `true`（boolean）✓（:50-58）；无 visibleIf；无
combo/number 约束面（:134-148 不触发）；capabilities 仅 `data:true` ⊆ 十 kind
（:72-83）✓；category `output` ∈ 七枚举（:15）✓；**零新端口类型 / 零新 widget /
零新类目 / 零新 CSS 变量 / 零新能力 kind**。

**键位决策 D1**：NODES 键序 webshow 紧随 setvar（output 类目块尾、approval 之前；
import 与键表同位插入）。影响链一次性再生产：baseline 键序（18 键 = …,reply,**setvar,
webshow**,approval）、节点库 output 组条目序（直接回复 → 变量赋值 → 网页展示，
app.js:324 按 Object.entries 序过滤保序）、README 总索引行序。批次 2/3（termview /
jsoncanvas）同位续排保持 output 组连续。caps 合成：`data` 不进 caps（nodes.ts:98-100）
→ webshow **无 caps 键** → 节点库条目无 mini-tag、能力 chip 渲染面零新增。

## 4. webshow 呈现承载设计（#12；PRD 派发要点 4）

### 4.1 handler 伪码（reply 同构 sink；落位 setvar 键后）

```
async webshow(ctx, { p, input, emit }): Promise<NodeResult> {
  /* 协议白名单 http(s)：与前端 app.js WS_HTTP_S 同字面量双保险（ADR-0015 §4.1；
     两端独立校验，注释不出现 p.<键> 字样——param-handler-guard 提取器纪律）。
     零出站：不 fetch、不 guardedFetch、不转存——本节点仅校验并透传 URL 字符串。 */
  const cand = [strInput(input, ''), String(p.url ?? '')]   // 输入端口值优先，params 兜底
    .map(s => s.trim())
    .find(s => /^https?:\/\/\S+$/i.test(s));
  if (!cand) {                                              // 降级分支：warn + 占位，不伪造
    emit('log', { lvl: 'warn',
      msg: 'webshow：输入与静态兜底均无有效 http(s) 网址，已占位降级呈现（不伪造结果）' });
    return { value: '', out: '未呈现 · 无有效网址（占位降级）' };   // outputs 不汇入
  }
  ctx.outputs!.push(cand);                                  // reply 同构：run 产物汇入
  emit('output', { text: cand });                           // 既有事件类型，零新增
  return { value: cand, out: `已呈现网页 · ${preview(cand, 80)}` };
}
```

### 4.2 语义裁决（SPEC 显式决策，JOURNAL 记录）

- **校验正则** `/^https?:\/\/\S+$/i`（trim 后全串匹配）：拒绝 `javascript:` /
  `data:` / 空串 / 含空白串 / 相对路径；`http://` 与 `https://` 均放行。不采用
  `new URL()` 解析（对 `\S` 已足够拦截危险 scheme，且避免对畸形串抛异常的分支膨胀）。
  **前端 app.js 侧独立定义同字面量 `WS_HTTP_S`**（§5）——双保险是两道独立闸门，
  不做共享导出（避免为一条正则扩大 shared 契约面）。
- **降级不伪造**：无效/空输入 → `outputs` **不**汇入、不 emit output 事件、节点正常
  完成（不 throw——run 不崩，run:done ok:true）；out 摘要明示「未呈现 · 占位降级」。
  对齐 tools.ts stub 如实降级纪律（ADR-0015 §3、PRD AC2②）。
- **零出站机器证明口径（AC2③ / VERIFY 执行）**：① `grep -nE "fetch|guardedFetch|
  AbortSignal|http\." <handlers.ts 中 webshow 函数体>` → 0 命中；②
  `git diff -- apps/server/src/guard.ts` 恒空；③ handlers.ts import 区（:1-15）零
  diff（不新增任何 import）。
- **触发对象入参形态**：上游为 trigger 时 input = `{__trigger:true,…}` 对象，
  `strInput` 对其返回 `''`（util.ts:30）→ 静态兜底 `url` 参数生效（O02 断言承载）；
  上游为 userinput 文本时输入端口值生效（O01）。服务端不感知前端 iframe 渲染——
  handler 的全部职责 = 校验 + 透传字符串 + 事件。
- **行预算**：伪码落地 + 头注 ≈ 17~20 行；298 → ~315~318 ≤400（AGENTS.md 硬性约定 4）。
  不设拆分预案（远低于阈值，ADR-0015 §3 的 present.ts 回退案不启用）。

## 5. 前端画布呈现分支设计（#13/#14；PRD 派发要点 3）

### 5.1 挂载点论证：`.node-out` 容器内分支（二选一定稿）

- **定稿 = 容器内分支**：`.node-out` 是节点体输出区唯一容器（makeNodeEl :775 为每
  节点生成），其显示已由 `.node.st-done .node-out{display:block}`（app.css:261）与
  run 完成态联动——iframe 在 node:done 后出现，复用该门控**零新增状态类**；webshow
  的呈现写在 `.node-out` **内部**（innerHTML 覆写），`.node-out` 自身的布局语义
  （margin/背景/左边条）原样承托，像素面收敛为「容器内部内容变化」。
- **否决同级新容器案**：需在 makeNodeEl 增节点类型分支插入兄弟元素 + 自建显示门控
  （重复 st-done 逻辑）+ 改变节点高度结构，波及面更大且与「输出区」语义重叠。
- **既有文本路径零变化的证明口径**：`setNodeOut`（:1897）**逐字节零改动**；webshow
  不改写它，而是新增 `setNodeWebshow` 在 node:done 分支**之后覆写**同一容器（§5.2）；
  其他 17 种节点的所有 setNodeOut 调用点（:1214/:1967/:1988/:2003/:2005/:2153/:2160/
  :2166/:2183）行为不变 → AC3「其他节点输出区像素零变化」+ AC4 gate 全场景零漂移实测
  双重兜底。

### 5.2 纯插入改动清单（app.js，四处）

1. **常量 + 两个新函数**（落位 `setNodeOut`（:1897）邻位之后）：

```js
const WS_HTTP_S = /^https?:\/\/\S+$/i;   /* http(s) 白名单——与 handlers.ts webshow 同字面量双保险 */
function webshowUrlOf(n){
  /* 呈现源解析（镜像 handler 序）：① 最近真实运行 in-url 到达值（lastRunData 预览，
   * engine preview 140 截断——>140 字 URL 截断后不过正则即诚实回落，不伪造）；
   * ② params.url 静态兜底；③ 均无效返回 ''（占位降级）。 */
  const inVal = lastRunData.get(n.id)?.inputs?.[0]?.val;
  if (typeof inVal === 'string' && WS_HTTP_S.test(inVal)) return inVal;
  const u = String(paramsOf(n).url ?? '').trim();
  return WS_HTTP_S.test(u) ? u : '';
}
function setNodeWebshow(id){
  const n = nodeById(id), el = nodeEl(id); if(!n || !el) return;
  const out = el.querySelector('.node-out'); if(!out) return;
  const url = webshowUrlOf(n);
  out.classList.add('ws-on');
  out.textContent = '';
  if(url){
    const f = document.createElement('iframe');
    f.className = 'ws-frame';
    f.src = url;
    f.title = '网页呈现';
    f.referrerPolicy = 'no-referrer';                 /* ADR-0015 §4.1「CSP/嵌入策略收紧」评估项落地 */
    if(paramsOf(n).sandbox !== false) f.setAttribute('sandbox', '');   /* 空值最严；false=用户显式关闭（责任翻转） */
    out.appendChild(f);
  } else {
    const ph = document.createElement('div');
    ph.className = 'ws-placeholder';
    ph.textContent = '无有效网址 · 占位呈现';
    out.appendChild(ph);
  }
}
```

2. **node:done case 插入 1 行**（:2166 `setNodeOut(...)` 之后、`barDone(el)` 之前）：
   `if(nodeById(ev.id)?.type==='webshow') setNodeWebshow(ev.id);`
   —— 落点在 `measurePorts()+updateEdgesOf([id])`（:2168）**之前**，iframe 撑高的
   布局变化被同 case 既有的端口重测消化（AGENTS.md 已知陷阱条款）；摘要文本先写后
   被覆写属设计行为（摘要仍可从底部日志 ◉ 行与属性面板「运行数据」读取）。
3. **RUN_META 插入 1 行**（:1884 approval 行后，demo 模拟运行的诚实摘要）：
   `webshow:  {dur:500,  out:n=>{ const u=String(paramsOf(n).url||''); return WS_HTTP_S.test(u)?'已呈现网页 · '+u:'未呈现 · 无有效网址（占位降级）'; }},`
   （仅影响离线模拟运行文案；gate 全场景无运行步骤 → 像素零波及。）
4. **`WS_HTTP_S` 常量提升**：RUN_META 行与 webshowUrlOf 共用，常量定义须在两者之前
   （建议与 §5.2-1 同块置顶于 setNodeOut 邻位，RUN_META :1867 在其后，作用域成立）。

### 5.3 sandbox 属性写法与协议拒绝（ADR-0015 §4.1 写死的落地）

- 默认（params.sandbox===true，含缺省）：`setAttribute('sandbox','')` ——空值属性 =
  最严（禁脚本/禁同源/禁表单/禁弹窗/禁顶层导航）；**全代码不出现任何 `allow-*` 令牌**
  （grep `allow-` 于新增行 = 0 命中为 VERIFY 断言，结构上排除
  `allow-scripts+allow-same-origin` 组合）。
- params.sandbox===false：**不设置** sandbox 属性（整体移除语义，非逐项放权）——
  用户显式关闭，责任翻转；参数面板 toggle 状态即「界面可见该状态」（PRD 非功能 3）。
- 非 http(s)：`webshowUrlOf` 返回 `''` → 占位分支（前端侧独立拒绝，与 handler 双保险）；
  iframe 元素**不创建**，`src` 永不接收非白名单值。
- 交互边界确认（本会话亲核零波及）：节点折叠仅隐 `.node-widgets`（app.css:223），
  node-out 不受影响；双击 goal 面板入口有 `n.type!=='agent'` 守卫（:2495）不误触；
  webshow 无 visibleIf 参数 → 参数变更不触发 rerenderNode（:1680）→ 呈现只在
  node:done 刷新（改参数后需重跑生效，与「运行产出后呈现」语义一致）。

### 5.4 app.css 纯插入（:261 之后，4 行）

```css
/* webshow 网页呈现（迭代 0033 / BK-0036 修宪轮：新增选择器纯插入，不改既有行） */
.node-out.ws-on{max-height:220px}
.node-out .ws-frame{display:block;width:100%;height:200px;border:1px solid var(--border2);border-radius:4px;background:#fff}
.node-out .ws-placeholder{font-size:11px;color:var(--text3);padding:2px 0}
```

选择器仅命中 webshow 呈现态（`ws-on`/`ws-frame`/`ws-placeholder` 为全新类名，JS
侧唯一写入点 §5.2）→ 既有 17 种节点与全部既有场景零匹配零漂移；`max-height:220px`
仅放大容器上限（内容自适应），不改任何既有声明。

## 6. 守卫/契约测试联动（#4~#11 逐文件；PRD 表 #5「SPEC 定」）

1. **baseline 再生产（#5）**：仓库根 `npm run build:shared && node -e
   "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > packages/shared/test/nodes.baseline.json`
   （NDP 迁移 SPEC §2 固化命令，docs/node-definition-protocol-migration-spec.md:36；
   `.gitattributes` 已钉 LF）。判据：`node -e` 亲数 **18 键含 webshow**、diff 恰 +1 键、
   键位 = setvar 后 approval 前（D1）。
2. **defs-drift（#8）**：EXPECTED_DEFAULTS 增行（BUILD 逐字抄录禁手打），插 :28
   setvar 行后：`webshow:     { url: '', sandbox: true },`；① 断言 36→38；头注
   「36/36」→「38/38」、:11「17 种节点 × 36 参数」→「18 种节点 × 38 参数」。
3. **contract（#9）**：:10 标题「17 种节点」→「18 种节点」、:11 `length` 17→18；
   字段齐全循环、端口类型循环动态零改（自动覆盖 webshow）。
4. **synthesis（#10）**：caps 用例 :15 标题「其余 15 键」→「其余 16 键」、:20 跳过集
   +`|| type === 'webshow'`（断言 webshow 无 caps 键——`data` 不进 caps 的回归锚）；
   EXPECTED_ORDER（:41-51）+`webshow: ['url', 'sandbox'],`、:40 标题「9 已迁移键」→
   「10 已迁移键」；快照用例 :56 标题「17 键全量」→「18 键全量」（比对本体动态）。
5. **param-handler-guard（零改动，自动满足——与 agent.ts 先例的差异点）**：webshow
   handler 在 handlers.ts 内，提取器按 `async webshow(` 归属（:42-43），`p.url` /
   `p.sandbox` 引用 ∈ NODES.webshow.params[].k ✓；反向僵尸清单——两参数均被引用 →
   **零新僵尸**，EXPECTED_ZOMBIES 不动；:135 总数断言 36→**38**（本条必改，见 §0）。
   实现纪律：webshow handler 注释（含块注释）**不得出现 `p.<标识符>` 字样**（提取器
   只剥 `//` 行注释，块注释内容会被计入引用，沿 0031 SPEC §5.4 纪律）。
6. **nodes-dirs（#7）**：:31 `D.size` 17→18；:5 注释同步。D===R 与 D⊆keys 本体动态零改。
7. **readme-consistency（#11）**：:5 注释、:63 标题、:66 消息、:80 标题「17」→「18」；
   :87 标题「18 份」→「19 份」（比对本体 TYPES 自 NODES 派生零改）。
8. **handlers-coverage（零改动自动满足）**：webshow 经 BASIC_HANDLERS→engine 展开
   注册后 HANDLERS ⊇ NODES；额外键仍仅 `__pass`（:31 校验不受影响）。
9. **README 生成链（#2/#3/#6）**：先 `npm run build:shared`，后
   `node tools/gen-node-readmes.mjs`；产物 = webshow/README.md 新增 + 总索引再生成
   （其余 17 份字节不变——生成器幂等只写变化文件，`git status` 核对恰两路径）。生成器
   改动字面：:105 「17 种节点定义」→「18 种节点定义」；:115 `!== 17` → `!== 18`；
   MANUAL_NOTES 增条目（插 setvar 行后）：
   `webshow: 'sink 呈现节点：http(s) 白名单校验透传 + 占位降级（不伪造结果）；服务端零出站——不抓取/不代理/不转存，抓取归 http 节点；iframe 沙箱呈现在前端（sandbox 默认最严）。',`

## 7. golden 重录方案（修宪轮必答；PRD 派发要点 2 / WORKFLOW §4 BUILD 修宪轮条款）

### 7.1 s10-webshow-node 场景定义（gate.mjs #16，纯插入）

- **常量**（AGENT_WF_SEED :186 邻位后插入，沿 s8 形态）：

```js
/* ---------- s10 网页展示节点场景基建（ADR-0015 §6 · 迭代 0033 / BK-0036 修宪轮） ----------
   触发形态 = localStorage 预置含 webshow 节点的最小工作流（LS_KEY='agentflow.v2'，
   app.js loadLocal 消费）；离线静态态（无路由拦截）；采集面 = output 类目色标题栏 +
   globe 图标 + in-url 端口 + 兜底网址/沙箱隔离 widget 行 + 一条连线；不变量 = 公共六键。 */
const WEBSHOW_WF_SEED = JSON.stringify({ tabs: [{ name: '网页展示示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'webshow', x: 410, y: 250, title: '网页展示' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });
```

- **场景行**（:234 s9 条目后、:235 `];` 前插入）：
  `{ id: 's10-webshow-node', steps: [], seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), WEBSHOW_WF_SEED) },`
- **确定性**：seed 后 boot 走 loadLocal 分支（无 fitView/欢迎日志）；节点渲染全为
  DEFS 数据驱动静态形态（**无运行步骤、无 iframe**——s10 采集的是节点底盘：标题栏/
  端口/widget 行/连线，与 ADR-0015 §6「静态呈现态」一致）；复用既有 fonts.ready +
  稳定双帧等待；不变量 = 公共六键（无 per-scenario 增量键，JSON.stringify 键序稳定
  硬约束不受影响）。**禁用 gate:update 落 s10**（golden-created 通道专属）。

### 7.2 s10 落盘通道：golden-created

基线 png 不存在 → 首跑自动落盘并记 `golden-created`（gate.mjs:299-304 既有通道，
s4/s5/s8/s9 先例）。若 s10 首跑异常（非 golden-created 的 FAIL）→ **中止排查**，
禁止以任何方式手工落盘。

### 7.3 s3-library 重录：修宪轮 gate:update 恰一次通道

- 依据：宪法第 3 条（issue#3 承继 + ADR-0015 §6 表列 + 同迭代重录，三要素在案）；
  WORKFLOW §4「脚本在 gate 失败时允许执行一次 npm run gate:update」。**仅限 s3**。
- 预期波及面（唯一）：output 分组条目 2→3 行（直接回复/变量赋值/网页展示）+ 组计数
  徽标 2→3——数据驱动像素变化（app.js:323-338），PRD 风险表已定性「不视为意外红」。
- **步骤序（BUILD 门禁时序）**：
  ① `npm run build`；
  ② `npm run gate`——预期：**s3 FAIL**（像素 diff）、**s10 golden-created**、其余
  8 场景（s0/s1/s2/s4~s9）pass；差异图 `tests/golden/diff/s3-library.*` 留存为
  前后对比证据指针（记 JOURNAL，宪法第 3 条「附前后对比」义务的兑现物）；
  ③ 执行**恰一次** `npm run gate:update`（全场景重录机制下，未波及场景因确定性渲染
  产出字节相同内容 → git 零 diff，0031 先例）；
  ④ 复跑 `npm run gate`——**11 场景全绿 diffPx=0**；
  ⑤ `git status --short -- tests/golden/ui/` 核对：**恰 3 路径**变化 =
  `s10-webshow-node.png`（新增）/ `s10-webshow-node.invariants.json`（新增）/
  `s3-library.png`（修改）；s3 的 invariants 预期**字节不变**（其六键均不依赖库内容，
  0031 同判）；其余 17 文件零 diff = 零波及机器证明。
- **意外红判据**：②步中 s0/s1/s2/s4~s9 任一 FAIL = 意外波及 → **中止排查，禁止顺手
  重录**（预期零波及论据：globe 图标 app.js:64 与 `--cat-output` app.css:20 均既有
  常量，本会话亲核；新 CSS 选择器仅命中运行态 webshow 节点，gate 场景无运行步骤）。
- golden 权威在 CI（windows-latest + Playwright Chromium）：本地重录随产品提交推送，
  盯 `ui-constitution` required check，红即修（宪法第 2 条）。

## 8. smoke O 组断言设计（#15；PRD 派发要点 5）

**组序**：字母 O 未占用（现役 P/M/H/W/N/S/R/D/E/K/G/V/A/Z/C，本会话普查亲核）——
**O 组（output 呈现节点组）编号 O01~O05**，落位 :1036（A 组止）与 :1038（Z 组起）
之间；**实例** = 主实例 srv（webshow 无模型依赖、零出站，不需要 mock 实例——与
G/V/A 组的 mockSrv 差异点）；**基线** = 既有 104 断言零回退 + 新增 5（预期 109，
以实得值记 REPORT）；**夹具纪律** = params 显式给出（沿 §夹具约定）。

**夹具工厂**（:73 wfCode 后插入）：

```js
/* O 组夹具工厂（迭代 0033 / BK-0036）：userinput(defv) → webshow(url 兜底) */
const wfShow = (defv, url) => ({
  name: 'smoke-webshow',
  nodes: [
    { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'url', defv } },
    { id: 2, type: 'webshow',   x: 320, y: 100, params: { url } },
  ],
  edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
});
```

| # | 夹具 | 断言要点 |
| --- | --- | --- |
| O01 URL 透传 | `wfShow('https://example.com/agentflow', '')` | run:done{ok:true}；webshow node:done(id=2).out === `已呈现网页 · https://example.com/agentflow`；存在 `output` 事件且 text === 该 URL；run:done.outputs 含该 URL |
| O02 静态兜底 | trigger(1)→webshow(2, params.url='https://example.com/static-fallback')（独立夹具常量） | input 为 trigger 对象（strInput 归空）→ params.url 生效：out === `已呈现网页 · https://example.com/static-fallback`；outputs 含该 URL；run:done{ok:true} |
| O03 非 http(s) 降级 | `wfShow('javascript:alert(1)', '')` | log warn 含「webshow」与「占位降级」；out === `未呈现 · 无有效网址（占位降级）`；**无** `output` 事件；run:done.outputs 深等 `[]`；run:done{ok:true}（不崩） |
| O04 空输入降级 | `wfShow('', '')` | 同 O03 判据（warn + 占位 + 零 outputs + ok:true） |
| O05 契约零新增 | — | O01/O03/O04 捕获的全部事件逐条 `validateEvent` 通过（webshow 仅取用既有 15 种，events.ts 零 diff 联证——A05 同型） |

SSE 消费沿 aRun 同型（`openSse(srv.base, wf)` + waitFor run:done + waitEnd）；O 组
前置失败沿 C.fail + SmokeFailError fail-fast 先例（G05/A04 同款）。

## 9. 验收口径（BUILD 自测 = VERIFY 复跑；PRD AC1~AC7 映射）

1. **AC1 · DEFS 入列与契约全绿**：`npm test`（根链 = build:shared + build:server +
   shared 契约测试）全绿——nodes-dirs **D===18** / defs-drift **38 参数**含 webshow
   （url `''` / sandbox `true`）/ contract **18** / synthesis（webshow 序 + 无 caps）/
   param-handler-guard 38 + 零新僵尸 / readme-consistency 19 份 / handlers-coverage
   ⊇；`node -e` 亲数 baseline **18 键含 webshow**、快照 diff 恰 +1 键（键位 D1）。
2. **AC2 · 呈现承载语义**：`npm run smoke:server` O01~O05 全绿 + 既有 **104 零回退**
   （汇总行实得值记 REPORT；产品提交前 V09 式 `git status packages/shared` 时点性假红
   沿 0018/0021/0022/0031 先例，提交后复跑自愈，VERIFY 以提交后实得值为判据）；
   §4.2 零出站三证明（grep / guard.ts 零 diff / import 区零 diff）全过。
3. **AC3 · 画布 iframe 安全呈现**：代码级断言（VERIFY 执行）——① `setNodeOut` 函数体
   零 diff；② 新增行 grep 无 `allow-` 令牌、无 `innerHTML =` 拼接 URL（iframe src 走
   属性赋值，非字符串拼 HTML）；③ `sandbox` 属性写法符合 §5.3（空值 or 不设置，无
   中间态）；④ 前端 `WS_HTTP_S` 与 handler 正则字面量一致。行为级由 AC6④ 手动承载。
4. **AC4 · 修宪 golden 双通道**：§7.3 步骤序①~⑤全过（11 场景 diffPx=0；golden 区
   恰 3 路径变化；意外红即中止）。
5. **AC5 · 白名单与零依赖/零契约机器证明**：`git show --numstat <产品提交>` 恰 §2 表
   #1~#19；`package-lock.json` / `packages/shared/src/events.ts` /
   `apps/server/src/engine.ts` / `apps/server/src/guard.ts` /
   `apps/web/src/Skeleton.tsx` 零 diff。
6. **AC6 · 手动 E2E 四点位**（浏览器 + `npm run dev:server`；iframe 呈现建议用
   `https://example.com`）：
   ① 节点库**输出**分组出现「网页展示」条目（globe 图标，组计数 2→3，无 mini-tag）；
   ② 拖入画布：`--cat-output` 粉色标题栏 + in-url 入端口（any 色）+ 兜底网址/沙箱隔离
   两 widget 行 + 节点库/搜索面板可搜「webshow」；
   ③ 连线：in-url ← 上游 any/text 出端口（typeOk 兼容高亮正常）；
   ④ 运行：节点体输出区出现 iframe 呈现上游网址，DevTools 查证 `sandbox=""` 属性在
   （默认）与移除（sandbox=false 时）；非 http(s) 输入 → 占位「无有效网址 · 占位呈现」；
   底部日志 ◉ 最终输出行与属性面板「运行数据」含 out 摘要；全程零 console error。
7. **AC7 · 指针抽样 ≥5 条**：PRD AC7 所列 13 组任五以上可开（VERIFY 执行；本 SPEC §0
   已全量预核一遍，全部命中）。
8. **BUILD 前置**：动工前 `npm run build && npm run gate && npm test` 确认工作树基线绿
   （存量差异不算自己头上；工作树 node_modules 的 `@agentflow/*` 指向工作树自身）。
9. **产品提交恰一个**（Conventional Commits）：建议
   `feat(node): BK-0036 网页展示节点（webshow NDP 定义 + 呈现承载 + 画布 iframe 安全呈现，修宪轮）`
   ，含 §2 全部 19 项路径（golden 增量/重录与 ADR-0015 增补同迭代落地——宪法第 3 条
   三要素）。机制件提交（迭代目录产物 + BACKLOG 过程改动）随 WORKFLOW §4 分支提交
   约定由脚本执行。
10. **EOL 纪律**：新文件（node.ts / README.md / s10 基线由工具产出）LF、无 BOM；
    改动文件保持既有行尾策略。
11. **ADR-0015 状态行回写字面（#19，BUILD 产品提交内）**：
    「状态：**已获用户 issue#3 批复（2026-10-23T15:49:32Z 承继）· BK-0036 实施轮已消费
    （迭代 0033）· BK-0037 / BK-0038 待实施（链终轮）——原文其余按草案态保留至链终**」
    （沿 ADR-0009/0010/0013 实施轮先例 + ADR-0015 显著声明自定协议）；§7 追加
    BK-0036 实施纪要（提交哈希 / gate 实测 / baseline 实数 18）；§2.4/§5 的
    「16→17」旧计数按代码事实校正为「17→18」（沿 0027/0029 笔误转写先例，PRD 风险表
    既定）。

## 10. 模块边界（PRD 派发要点 1 必答）

- **packages/shared**：webshow/node.ts 纯数据模块（只 import nodes.schema.js 类型）；
  nodes.ts 聚合层仅 +1 import +1 键 + 头注计数，**三导出面（NODES / NODE_NAMES /
  paramDefaultsOf）不变**（不变式 B）；events.ts / nodes.schema.ts / types.ts /
  index.ts / 既有 17 节点目录零触碰。
- **apps/server**：handlers.ts 仅 +webshow 键（BASIC_HANDLERS 表内，reply 邻位），
  消费既有 import（strInput/preview），**零新 import**；engine.ts 零改动
  （:27-31 展开自动注册）；guard.ts / llm.ts / agent.ts / server.ts / store.ts 零
  触碰；webshow handler 无出站、无子进程、无文件系统、无新端点。
- **apps/web**：app.js 四处纯插入（常量/两函数/node:done 一行/RUN_META 一行）+
  app.css 一个纯插入块；Skeleton.tsx / server-sync.js 零触碰；`setNodeOut` 文本路径
  与其余 17 种节点渲染链逐字节零变化；iframe 只在 node:done 呈现（无参数联动重渲染、
  无新交互手势、无新面板）。
- **tools**：gen-node-readmes.mjs 三处计数/文案 + MANUAL_NOTES 一条；pixel-gate/gate.mjs
  仅 WEBSHOW_WF_SEED + s10 行两处纯插入，比对逻辑零触碰。
- **tests**：shared 契约五文件具名计数/文案落定（比对本体动态零改）；smoke 增 O 组；
  golden 区恰 s10 新增 + s3 重录；tests/canvas 零触碰。

## 11. 回滚方案（PRD 非功能 6 / 派发要点 5）

VERIFY FAIL 达上限（修复 ≤2 轮后仍红）→ `git revert <产品提交>` 单提交回滚（唯一
手段，禁 force/reset）：一并回退 s10 两基线（随提交删除）、s3 重录（随提交还原 17 键
时代像素）、baseline 18→17、守卫计数、ADR-0015 状态行与增补段。复跑
`npm run build && npm run gate && npm test` 确认回到迭代前基线（10 场景全绿）。
BACKLOG item 由脚本置 failed。**实施中越界即弃**（触及 PRD out of scope：服务端抓取 /
PTY / 新 SSE 事件 / sandbox 组合放权）→ 不走 revert 而按 WORKFLOW §4 工作树整体丢弃，
主干零影响。

## 12. 风险与对策（PRD 风险表全继承，实施级增补）

| 风险 | 对策 |
| --- | --- |
| s3 重录通道被泛化（顺手重录其他场景） | §7.3 ⑤机器核对（golden 区恰 3 路径）+ 意外红中止条款 + gate:update 全场景重录下未波及场景字节等价（确定性渲染），git diff 天然暴露任何泛化 |
| gate:update 全场景重录引入非预期字节漂移（s4/s5 fixture 时钟类） | ⑤ `git status` 恰 3 路径判据兜底；任一多出路径 = 中止排查，禁止「多录的也留着」 |
| iframe 呈现引入 XSS / 沙箱逃逸面 | §1 三写死 + AC3 代码级断言（无 allow- 令牌、src 走属性赋值、双保险正则）+ 外站内容由浏览器 sandbox 隔离；`referrerpolicy=no-referrer` 收紧来源泄露 |
| 外站 X-Frame-Options / CSP 拒绝内嵌 | 属外部站点行为非本节点缺陷（iframe 显示拒绝页即如实呈现）；服务端代理/抓取属零出站红线**不做**；E2E 用 `https://example.com`（允许内嵌）验证正向路径 |
| lastRunData 预览 140 字截断致超长 URL 前端解析失败 | 如实降级设计：截断串不过正则 → 回落 params.url → 均无则占位（§5.2 注释明示边界）；服务端 outputs/out 摘要路径不受影响（O01 断言） |
| node-out 高度变化破坏端口几何（AGENTS.md 陷阱） | §5.2-2 插入点在 measurePorts/updateEdgesOf 之前 + node:done case 既有重测调用消化；s10 无运行态不受影响；tests/canvas 回归抽查（VERIFY 自主） |
| baseline/README 再生产漂移（18 键外意外差异） | §6.1 diff 恰 +1 键判据 + 生成器幂等只写变化文件（`git status` 核对恰两路径）+ §2.4 schema 纪律自检前置 |
| param-handler-guard 块注释 `p.` 误报 | §6.5 注释纪律（handler 注释不出现 `p.<标识符>` 字样） |
| ADR-0015 旧计数「16→17」误导实施 | §2 表 #19 + §9-11 明示按代码事实校正 17→18；BUILD 以 baseline 实数为准 |
| smoke 提交前假红（V09 检查 packages/shared 干净，本轮 shared 有改动） | 沿 0018/0021/0022/0031 先例：产品提交后复跑自愈；VERIFY 记实得值判据 0 failed |
| 降级语义被误实现为 throw（run 崩） | O03/O04 断言 run:done{ok:true} + outputs 深等 [] 直接锚定「不崩 + 零汇入」 |

## 13. 本 SPEC 与 PRD 的差异声明（如实记录，无冲突隐瞒）

1. **受影响文件清单增补四处**（#3/#6/#9/#10 中 contract、synthesis、param-handler-guard
   总数断言、gen-node-readmes.mjs）：PRD 表 1~13 未具名，但为 AC1 的必然前置（§0
   实测：不改必红/必 throw）；沿迭代 0031 SPEC §2 增补先例，授权依据 = PRD 表 #5
   「守卫/契约测试联动 · SPEC 定」+ #2 必然前置。AC5 白名单以本 SPEC §2 终稿为准
   （PRD AC5「表 1~12 内」按其自己「SPEC 定」条款由本表落定）。
2. **handlers.ts 行数预算**：PRD 估 ~310~313，本 SPEC 按 §4 伪码实估 ~313~318（含
   头注与空行）——均在 ≤400 约束内，非冲突。
3. **smoke 新增断言数**：PRD 未定数，本 SPEC 定为 5（O01~O05），预期 109/0（实得记
   REPORT）。
4. 其余 PRD 目标/范围/验收标准**全量承继**，无放宽、无扩大。
