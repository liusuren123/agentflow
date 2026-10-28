# SPEC · 迭代 0065 · BK-0047 retrieval kb 参数动态化：combo 选项由后端 kb 清单端点供数（修宪轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-28
> 输入：`docs/evolution/iterations/0065/PRD.md`（PLAN 阶段产物，skipSpec=false）；
> 本 SPEC 全部行号引用经工作树 `feat/0065-iter` 亲读核实（核实命令见各节标注）。
> 直系同构先例：迭代 0039 / BK-0049 caps 动态化（ADR-0018 + iterations/0039/SPEC.md §6）。
> 配套 ADR：**ADR-0021**（`docs/adr/0021-retrieval-kb-combo-server-fed-options.md`，
> 已获用户 issue#6 批复承继，草案态随本 SPEC 落盘）。

## 0. 结论速览（对 PRD 待裁项的终裁）

| PRD 待裁项 | 终裁 | 一句话依据 |
| --- | --- | --- |
| shared 面处置（REQ-0065-04） | **零 shared 改动案** | 渲染层换选项来源即可，DEFS `o` 本身就是回退集（nodes.ts:73 合成输出），`nodes.baseline.json` 字节不变 |
| 供数链实现形态 | caps 同构四件套（fetch 形态校验 / SVR 缓存 / refresh / arrive 回调） | server-sync.js:116-197 先例逐段同型 |
| 刷新时机 | init 一次 + 选中恰 1 个 retrieval 节点时 fire-and-forget | PRD 非功能「随属性面板打开时机，不引入轮询」；US-1（页面开着时上传新库亦可见） |
| golden 新场景 | **s20-retrieval-kb-online**（golden-created 通道，非 gate:update） | gate.mjs:632-635 `!existsSync` 即写盘；0039 s13→s15 同径 |
| 既有 20 场景波及 | **预期零重录**（逐场景核对见 §4.2；实测口径在案） | 闭合态 select 不呈现选项列表 + 离线/未 mock 场景回退集逐字保留 |
| smoke 新增断言 | **零新增** | KB01-KB11（smoke-server.mjs:2095 起）已承载端点契约与 seed 一致性；供数链剩余面纯前端呈现，归 golden + 手动 E2E |

## 1. 现状与证据链（本会话工作树内逐项亲读）

1. **combo 三固定名写死**：`packages/shared/src/nodes/retrieval/node.ts:17-22`——kb 参数
   `widget:'combo'`，options 三固定名 + `default:'产品手册 v2.3'`。
2. **shared 合成层**：`packages/shared/src/nodes.ts:70-73`——combo 合成输出
   `{ k, l, t:'combo', o: options.map(op=>op.label), d }`；`o` 是 label 字符串数组
   （本节点 label===value）。**前端消费面拿到的回退集 = DEFS 合成结果本身**。
3. **前端两个 combo 渲染点**（唯一消费点，全库 grep 亲核）：
   - `apps/web/src/legacy/app.js:764-766`（`widgetHtml`，节点内嵌 widget 行 select）；
   - `apps/web/src/legacy/app.js:959`（`renderProps` 单节点分支，属性面板 select）。
   两处均为 `p.o.map(o=>…)` + `${o===v?'selected':''}` 按值匹配选中。
4. **供数端点已在主干**：`apps/server/src/server.ts:292` 注册
   `GET /api/v1/kb → kbListHandler`；`apps/server/src/kb/routes.ts:31-33` 恒 200 只读，
   出参 `{ kbs: kbStats() }`；`apps/server/src/kb.ts:54-56` 进程内 indexMeta 派生；
   `apps/server/src/kb/store.ts:114-121` `listKbStats` `ORDER BY k.name`（UTF-8 码点
   升序，**确定性输出序**）。
5. **caps 直系先例**：`apps/server/src/capabilities.ts`（端点）+
   `apps/web/src/server-sync.js:116-141`（`capShapeOf`/`fetchCapabilities`）+
   `:153-154`（`SVR.caps/capsErr`）+ `:171`（`onCapsArrive`）+ `:193-197`（`refreshCaps`
   fire-and-forget 失败静默）+ `apps/web/src/legacy/app.js:647-663`（到达回调：回退集
   → 供数替换、rerenderNode + renderProps 保 scrollTop）+ `app.js:2727`（init 消费）。
6. **select 尺寸与选项列表解耦**：`apps/web/src/app.css:230`（`.wdg select … width:100%`）、
   `:363`（`.prow select … width:100%`）——select 宽度恒等于容器宽，**不随 option 文本
   变化**；闭合态只渲染 selected option 文本。
7. **Skeleton / app.css 零涉**：`apps/web/src/Skeleton.tsx` grep 无 combo/kb 命中
   （属性面板初始为「未选中」空态）；app.css 本轮零改动。
8. **契约守卫锁定面**：`packages/shared/test/nodes.baseline.json:265-269` 锁定 kb
   options 三固定名与 default——零 shared 案下该文件字节不变，守卫（nodes-dirs /
   defs-drift / synthesis）零期望表同步。
9. **gate 现状**：20 场景 s0~s19（gate.mjs:529-568）；golden 目录 20×2 文件亲列；
   场景基建先例（路由 fixture / SEED / ready 探针 / per-scenario inv）= s15-caps-panel
   （gate.mjs:300-352）与 s19-terminal-panel-online（:488-527）。
10. **smoke 现状**：KB01-KB11（tests/smoke/smoke-server.mjs:2095 起）——KB01 清单契约
    （恒 200 / 顶层恰一键 `{kbs}` / 每行恰四键 / 行序 name 码点升序，:2137-2153）、
    KB02 seed 三固定名可见（:2156-2166）、KB03/KB04 检索等价零漂移锚（:2169-2198）、
    KB05-KB11 上传管道。基线 168 断言（metrics 0061/0064 行在案）。

## 2. 技术方案

### 2.1 数据面（apps/web/src/server-sync.js，caps 同构增量）

新增四件套 + 形态校验（逐段对照 caps 先例行号，同型实现）：

```js
/* 契约形态校验（capShapeOf :120-140 同构）：GET /api/v1/kb → { kbs:[{name,docs,chunks,updated_at}] }
 * 按契约全字段校验（数组 + 四键类型），非法抛错 → refreshKbs 捕获 → 回退集保持 */
function kbShapeOf(j){ … }                       // 校验后原样归一化 { kbs:[…] }（前端消费面只取 name，但结构全量缓存，为链末项 BK-0048 与未来管理 face 留全形）
export const fetchKbList = () => apiJson('/kb').then(kbShapeOf);
/* SVR 增两键：*/  kbs: null,      // {kbs:[…]} | null：null=尚未成功拉取过 → 回退集
                   kbsErr: false,  // 最近一次清单拉取失败（静默降级，无 toast/日志行，capsErr 同口径）
let kbsArrive = null;
export function onKbsArrive(fn){ kbsArrive = fn; }
export async function refreshKbs(){               // refreshCaps :193-197 同型：失败静默，SVR.kbs 保持 null
  try{ SVR.kbs = await fetchKbList(); SVR.kbsErr = false; }
  catch(_){ SVR.kbsErr = true; }
  kbsArrive && kbsArrive();
}
```

边界（ADR-0006 / ADR 4.4 不变式）：只做 fetch 封装 + 缓存 + 回调，**零 DOM 操作**；
仅 `/api/v1` 命名空间（apiJson 复用，8s 超时同口径）。

### 2.2 消费面（apps/web/src/legacy/app.js，四处增量 + 两渲染点换源）

1. **import 增补**（:8 同段）：`refreshKbs, onKbsArrive` 自 `../server-sync.js`。
2. **到达回调**（onCapsArrive :651-663 同型，紧随其后注册）：
   - `if(!SVR.kbs) return;`（失败/未到达 no-op，回退集不动——ADR-0018 §6 同口径）；
   - 重绘面 = `state.nodes.forEach(n=>{ if(n.type==='retrieval') rerenderNode(n); })`
     （rerenderNode app.js:1177 自带 measurePorts + updateEdgesOf，AGENTS portCache
     陷阱内建解；caps 先例 :655 同款）；
   - `sel.nodes.size===1` 且选中节点为 retrieval 时：`renderProps()` + scrollTop 保持
     （caps 先例 :656-662 与 :1119-1121 双先例同款）。
3. **init 消费**（:2727 `refreshCaps()` 旁）：`refreshKbs();   /* fire-and-forget，失败静默保持回退集 */`。
4. **选中时机刷新**（`renderProps` 单节点分支 :954-956 内）：`n.type==='retrieval'`
   时调 `refreshKbs()`（fire-and-forget；renderProps 在每次选中变化/相关编辑后调用，
   用户操作驱动、非轮询——PRD 非功能口径）。离线场景该请求静默失败（apiJson 抛错
   → kbsErr），渲染与现状逐字一致。
5. **选项来源换源（唯一渲染逻辑改动，两个点）**：新增纯函数

   ```js
   /* kb combo 在线供数（BK-0047 / ADR-0021）：SVR.kbs 到达即整表替换选项，
    * null（离线/失败/未到达）= DEFS 回退集（p.o 原样，零拷贝零漂移）。
    * 仅 (retrieval, kb) 命中；其余 combo 恒 p.o。 */
   const comboOptionsOf = (node, p) =>
     (node.type==='retrieval' && p.k==='kb' && SVR.kbs) ? SVR.kbs.kbs.map(x=>x.name) : p.o;
   ```

   - `widgetHtml` :765-766 与 `renderProps` :959 的 `p.o.map(...)` 改为
     `comboOptionsOf(node, p).map(...)`（模板字面量、DOM 结构、selected 按值匹配
     逻辑逐字不变，仅选项数组来源可替换）。

### 2.3 行为裁决（正例 / 反例 / 边缘，可验证口径）

| # | 口径 | 判定 |
| --- | --- | --- |
| B1 | 在线态选项集合 = `GET /api/v1/kb` 的 `kbs[].name` 集合，序 = 服务端返回序（`ORDER BY name` UTF-8 码点升序，store.ts:114-121 确定性） | 正例：seed 三固定名 + 已上传新库均在列 |
| B2 | 回退态（SVR.kbs===null：离线 / 请求失败 / 尚未到达）选项 = DEFS `p.o` 逐字 | 正例：三固定名、DEFS 声明序，与现状字节一致 |
| B3 | **序不对称如实声明**：在线态码点序（FAQ-售前 < 产品手册 v2.3 < 工单历史 2026）≠ DEFS 声明序——仅影响展开的下拉项排列；闭合态 selected 按值匹配（`o===v`），选中显示文本不随序变化 | 记录进 ADR-0021 §4 三层回写表 |
| B4 | 当前值不在选项集（如导入外部库名的工作流）：无匹配 → `selectedIndex=-1` 闭合显示空白——**既有行为，非本项引入，不做值补全**（保持渲染分支零新增） | 反例口径：选项集不追加当前值 |
| B5 | 到达时序：选中 retrieval 而清单未到达 → 先渲染回退集 → 到达回调重绘（scrollTop 保持）——窗口期像素形态 = 回退集，非空白态 | AC2 的时序子情形 |
| B6 | 检索语义零涉：handlers retrieval 链、kb.ts 索引/打分、topk/th、DEFS 默认值零改动；combo 只是「选项从哪来」，「选中后怎么检索」不动 | PRD 不做范围承继 |

### 2.4 模块边界（不越界清单）

- **ADR-0006 边界**：kb 数据面落 server-sync.js（数据与状态层），app.js 消费渲染；
  server-sync 零面板 DOM 操作。
- **ADR-0003 单一事实源**：`packages/shared` 零改动——回退集即 DEFS 合成 `o`，
  不在 app.js 复制字面量（比 caps 先例的「回退集逐字保留」更强的形态：DEFS 本身
  就是回退集的单一来源，`nodes.ts:73` 输出即回退集）。
- **ADR-0020 边界**：kb 管道（chunk/embed/store/seed/routes 五模块）零改动——
  供数源 `kbListHandler` 已在案，前端只做只读消费。
- **交互语义零改动**：select 的 change 委托写回 `n.params` 路径（app.js :1124 起
  `data-k` 分支）不动——新选项写回的值与服务端清单同名，检索链按名取库不变。

## 3. 受影响文件清单（productFiles 白名单终稿）

| # | 文件 | 改动 | 类型 |
| --- | --- | --- | --- |
| 1 | `apps/web/src/server-sync.js` | §2.1 四件套 + kbShapeOf + SVR 两键 | 产品 |
| 2 | `apps/web/src/legacy/app.js` | §2.2 import / init / 到达回调 / 选中刷新 / comboOptionsOf + 两渲染点换源 | 产品 |
| 3 | `tools/pixel-gate/gate.mjs` | §6.3 s20 场景基建（KB_FIXTURE / KB_ROUTES / KB_WF_SEED / kbReady / kbInv / SCENARIOS 增行） | 产品 |
| 4 | `tests/golden/ui/s20-retrieval-kb-online.png` + `.invariants.json` | gate 首跑 golden-created 自动落盘（**非手工、非 gate:update**） | 产品（生成物） |
| 5 | `docs/adr/0021-retrieval-kb-combo-server-fed-options.md` | 本轮新建（机制件） | 机制 |
| 6 | `docs/evolution/iterations/0065/{SPEC,JOURNAL,REPORT}.md`、BACKLOG 过程改动 | 迭代产物（机制件） | 机制 |

**零改动声明（负清单，VERIFY 机器证明口径见 §7 AC9）**：
`packages/shared/**`（终裁 §0）、`apps/web/src/Skeleton.tsx`、`apps/web/src/app.css`、
`apps/server/**`（供数端点已在主干）、`apps/web/src/index.html`、`tools/pixel-gate/`
除 gate.mjs 场景增补外的一切（比对逻辑 / normalize / 公共不变量六键零改动）。

**文件规模**：server-sync.js 现 285 行 / app.js 现 3334 行，增量预计 <60 行 / <40 行；
无新增源文件（400 行上限无涉）。

## 4. golden 方案（修宪轮要件）

### 4.1 宪法第 3 条依据与授权链

- **WORKFLOW §6 护栏 2 / §4 BUILD 修宪轮条款**：`gate:update` 仅允许出现在已获
  用户批准的修宪迭代内。本迭代授权链 = **issue#6 用户批复承继（2026-10-24T08:38:51Z
  在案，PRD 头部 + BACKLOG BK-9006 行承继口径）**；ADR-0021 标注同款（ADR-0017 /
  ADR-0018 草案态措辞先例：全文不使用「已批准」终态措辞）。
- **PRD REQ-0065-05 口径**：主通道 = 新场景 golden-created 落盘（gate.mjs:632-635
  `!existsSync` 即写盘并标 `golden-created`——这不是对既有基线的重录）；既有 20
  场景预期**零重录**（§4.2）。`npm run gate:update` 仅作 §4.4 应急通道（条件触发，
  默认不消费）。

### 4.2 既有 20 场景零波及（逐场景核对表）

判据三件（全部工作树亲核）：① 场景是否含 retrieval 节点呈现面（SEED / 默认 kefu
工作流）；② 场景路由是否 mock `/api/v1/kb`（未 mock → 请求落 gate 静态 server →
非 JSON → apiJson 抛错 → SVR.kbs 保持 null → 回退集 → 渲染与现状逐字一致）；
③ 闭合态 select 不呈现选项列表，宽度 `width:100%` 固定（app.css:230/:363），
selected 按值匹配不变（B3）→ 选项列表变化在闭合态**零像素投影**。

| 场景 | retrieval 呈现面 | kb mock | 判定 |
| --- | --- | --- | --- |
| s0-initial / s1-select-node | 有（默认 kefu 工作流，节点 3 = retrieval，app.js:151；s1 选中它 → 面板 kb combo） | 无（离线） | 回退集逐字保留 → 零波及 |
| s2-settings / s3-library / s6/s7 日志 | 无 | 无 | 零波及 |
| s4/s5（在线面板） | 背景画布含 retrieval widget 行（kefu） | 无（只 mock workflows/runs） | 同 ② → 零波及 |
| s8/s9（AGENT seed）、s10/s11、s12、s13、s14、s15（CAPS seed） | 无（gate.mjs 全文 grep `retrieval` 零命中——各 SEED 均不含 retrieval 节点） | s9/s15 有各自 mock，无 kb | 零波及 |
| s16/s17/s18（工作台） | 背景画布含 retrieval widget 行（kefu） | 无（WB_ROUTES 无 kb） | 同 ② → 零波及 |
| s19（TERM seed） | 无 | 无 kb | 零波及 |

**实测口径（VERIFY 强制）**：BUILD 后 `npm run gate` 必须输出 s0~s19 全 pass
（diffPx=0 + DOM 不变量全等）——「零波及」由实测背书，非仅论证；任一既有场景红
→ 按 §4.4 归因分流，**不得静默重录**。

### 4.3 新场景 s20-retrieval-kb-online（golden-created 通道，caps s15 同构）

- **KB_FIXTURE**（与 GET /api/v1/kb 契约逐键一致，HEALTH_FIXTURE gate.mjs:74-75 同段族）：
  `kbs` 四行——seed 三固定名（docs/chunks/updated_at 取固定整值，updated_at 用
  2026-01-01 UTC 整点毫秒配合 `timezoneId:'UTC'`，字形安全口径 ASCII+固定中文）
  + **`kb-gate-ext`**（fixture 独有名，caps external `caps-ext` 先例同型：
  「供数链到达」的确定性判据——回退集三固定名 ⊄ 判据，多出的第 4 项即到达证明）。
- **KB_ROUTES**：`**/api/health`（HEALTH_FIXTURE）+ `**/api/v1/kb`（KB_FIXTURE），
  注册序沿 SESSION_ROUTES 注记纪律（gate.mjs:207）。
- **KB_WF_SEED**（CAPS_WF_SEED :336-340 同型）：trigger→retrieval 两节点，
  retrieval `params:{ kb:'kb-gate-ext' }`——**seed 值刻意取 fixture 独有名**：
  回退集渲染期该值无匹配（B4：selectedIndex=-1 显示空白）→ 到达后重绘 → selected
  命中显示「kb-gate-ext」→ **闭合态像素直接呈现「服务端清单可供新库被选中」**
  （caps s15 徽章计数 6 同理：fixture 超出回退集的部分必须能被像素看见）。
- **步骤**：`seed`（localStorage 预置）→ `selectNode('.node[data-id="2"]')`。
- **kbReady 探针**（状态量非时延量，capsReady :341-344 同型）：
  `#props select[data-k="kb"]` 的 option 数 === 4 **且** 选中值 === 'kb-gate-ext'
  **且** 节点 widget 行 select 选中值 === 'kb-gate-ext'（面板 + 画布双落 DOM）；
  超时红即 FAIL，不落伪基线。
- **kbInv**（公共六键后 spread，s20 唯一新增键组；JSON.stringify 键序敏感纪律同前）：
  `kbOptions`（面板 option 全文本清单，序 = fixture 序）、`kbSelected`（面板选中值）、
  `nodeKbSelected`（widget 行选中值）。
- **落盘**：BUILD 阶段 gate 首跑自动 golden-created（png + invariants 双文件），
  复跑 pass（diffPx=0）。

### 4.4 应急重录通道（条件触发，默认不消费）

仅当 **①** s0~s19 任一场景意外波及，**且** ② 归因排查确认波及源自本变更**有意**的
视觉变化（实现错误只会导致不该变的场景变红，而那是 BUG 不是意图）——两条同时
成立时，才允许按 issue#6 修宪授权执行**恰一次** `npm run gate:update`，且必须：
变更集收敛恰枚举（0056 P1 教训：重录后 `git status` golden 目录新增/变更文件必须
恰等于波及枚举，超枚举文件一律 `git checkout --` 恢复 HEAD 字节）+ 留前后 diff
证据（iterations/0065/ 留档）。①不满足② → 修 BUG 回到绿，禁止重录掩盖。MERGE
后主干复测如 gate 红，同样按本条分流，不得为变绿而重录。

### 4.5 s3 抖动纪律（PRD 护栏承继）

s3-library 本机亚像素抖动（diffPx 21~23、DOM 不变量逐键全等）按 issue#12 口径
处置——**不消费 gate:update 重录抖动**，CI（windows-latest）为 golden 权威。

## 5. 手动 E2E 点位（AC8 展 开，VERIFY 逐项走查并留证据）

| # | 点位 | 步骤 | 期望 |
| --- | --- | --- | --- |
| E1 | 在线供数一致 | `npm start` → 浏览器打开 :3000 → 选中 kefu 示例「知识库检索」节点 | 面板 kb combo 与节点 widget select 的选项集合 = `curl /api/v1/kb` 的 name 集合（含 seed 三固定名） |
| E2 | 新库可选可检索 | 上传一个新库（如 `curl -X POST --data-binary @doc.md "localhost:3000/api/v1/kb/e2e-新库/documents?filename=doc.md"`）→ 不刷新页面重新选中 retrieval → 选中新库 → 接一个 LLM/输出运行 | 下拉含新库；retrieval `node:done` 命中新库入库片段（AC4） |
| E3 | 离线回退 | 停后端 → 刷新页面 → 选中 retrieval | combo 呈现三固定名，无空白态、无报错弹窗（AC2） |
| E4 | 既有值保真 | kb=『产品手册 v2.3』的工作流在线/离线各打开一次 | 选中态显示不变；运行命中与 BK-0019 后基线一致（AC3） |
| E5 | 交互回归抽查 | 属性面板选值写回 → 节点 widget 同步；切换标签页/撤销重做后 combo 选中态 | 与既有行为一致（test-manager 交互回归清单内） |

## 7. 验收口径（VERIFY 逐条执行；命令在仓库根/工作树根执行）

- **AC1 供数正例**（PRD AC1）：手动 E2E E1 + s20 场景 golden 基线双承载。
- **AC2 离线回退**（PRD AC2）：手动 E2E E3；gate s0/s1（离线态）diffPx=0 即回退集
  逐字保留的机器证明。
- **AC3 检索零漂移**（PRD AC3）：`npm run smoke:server` 全绿（KB03/KB04 等价锚
  在案），E4 走查。
- **AC4 新库可选可检索**（PRD AC4）：手动 E2E E2。
- **AC5 契约守卫**：`npm test` 30/30 全绿——零 shared 案下 nodes.baseline.json
  字节不变（nodes-dirs / defs-drift / synthesis 守卫零期望表变更，git diff 机器证明）。
- **AC6 门禁（修宪轮双通道）**：`npm run build` → `npm run gate` 全绿——s0~s19
  全 pass（零波及实测）+ s20 首跑 golden-created、复跑 pass；如有 §4.4 应急重录，
  变更集恰枚举 + 留痕。
- **AC7 冒烟零回退**：`npm run smoke:server` 基线 168/0 零回退（本项零新增断言，
  §0 终裁依据：KB01-KB11 已承载端点与 seed 面，供数链剩余面纯前端呈现）。
- **AC8 手动 E2E**：§5 点位逐项走查留证据。
- **AC9 改动面白名单**：§3 白名单外路径 `git diff --name-only` 恒空（机器证明）；
  golden 变更文件恰 = s20 双文件（± §4.4 应急枚举）。

**BUILD 实施序建议**（供 code-developer， SPEC 不约束内部步骤粒度）：
① server-sync.js 数据面 → ② app.js 消费面（先回退路径：不启后端跑 gate，
s0~s19 必须已零波及——回退语义先行验证）→ ③ gate.mjs s20 场景 →
`npm run build` → `npm run gate`（s20 golden-created）→ `npm test` →
`npm run smoke:server`。

## 8. 反转护栏（过程护栏，承继 PRD G1）

实现中若需 ①新增 npm 依赖 ②新增出站网络目标类别 ③新增环境变量语义——立即中止
转 needs-approval issue（POLICY 需批准区；issue#6 修宪批复不自动覆盖依赖/出站/env
面，BK-0043→#14 先例）。本 SPEC 方案自证零涉：前端 fetch 走既有同源 `/api/v1`
（apiJson 复用），不触 guard 出站面；零新依赖；零新 env。

## 9. 风险与回退

| 风险 | 缓解 |
| --- | --- |
| 既有场景意外波及（论证漏项） | §4.2 实测口径强制 + §4.4 归因分流；回退语义先行验证（BUILD 序②） |
| 到达时序竞争（s20 伪稳定帧） | kbReady 状态量探针 + normalize 前等待 + 稳定双帧（gate.mjs:584-596 既有机制） |
| fixture 时区/字形不确定性 | updated_at 整点毫秒 + `timezoneId:'UTC'` + ASCII+固定中文字形安全口径（WF_ROUTES :76-77 先例） |
| 需求不可解 / 触及 UI 外层 | WORKFLOW §4 BUILD 中止条款：item 转 pending-approval/blocked，迭代回滚（工作树丢弃，主干零影响） |
