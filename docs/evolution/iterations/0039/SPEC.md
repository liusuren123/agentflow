# SPEC · 迭代 0039 · BK-0049 MCP·skills 清单动态化（app.js 硬编码 MCP_SERVERS/SKILL_LIST 改后端供数，修宪轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-26（工作树
> `.zcode/worktree/feat/0039-iter`，分支 `feat/0039-iter`）。
> 输入：`iterations/0039/PRD.md`（PLAN 阶段产物）+ 本会话全量代码亲核（§0）。
> 授权链（承 PRD 亲核，不重开）：issue#6 owner 批复承继
> 2026-10-24T08:38:51Z（iterations/0037/PRD.md:10-11 gh 亲核留档 + BACKLOG.md:77
> 批复承继明载）+ **本轮新落盘 ADR-0018 草案**（BK-0049 专属修宪三要素载体，
> `docs/adr/0018-mcp-skills-capability-list.md`，待实施轮消费）。
> 先例：迭代 0037（BK-0050，issue#6 短修宪穿插项直系先例——ADR 草案态措辞/
> gate:update 应急通道口径）、迭代 0011/0031（golden-created 新场景 + 路由
> fixture 先例）、迭代 0032（BK-0034，server-sync 数据面扩展边界）、迭代 0024
> （BK-0029，BUILTIN_MCP_IDS 与冒烟口径）。

## 0. 本会话代码核实记录（2026-10-26，只读，工作树内）

PRD「现状证据」节全部锚点复核命中，并新核实 4 处对方案有实质影响的细节（§2
清单外必改点为零——PRD 清单成立，无需扩面）：

- **前端硬编码区**：`apps/web/src/legacy/app.js:104-123`——:104 注释「能力注册表：
  MCP 服务器 / Skill（原型模拟数据）」；:105-116 `const MCP_SERVERS` 五条
  （filesystem/fetch/sqlite/browser/web-search，各带 `tools:[{n,d}]`）；
  :117-123 `const SKILL_LIST` 五条（ppt-builder/doc-writer/data-analyst/coder/
  translator）。两常量在 `bootLegacyApp()` 函数作用域内（:11）。
- **消费点恰 6 处**（与 PRD 一致）：:785（capsChips 徽章分母
  `MCP ${c.servers}/${MCP_SERVERS.length}`）、:976/:986-987（capsHtml MCP 服务
  行与工具子清单渲染）、:993（技能行渲染）、:1011-1013（change 处理器
  `MCP_SERVERS.find` + `sv.tools.map(t=>t.n)`）。另 :967 `mcpExpanded`（UI 态）、
  :1039-1045 expand 点击处理器（不引用两常量，零改动）。
- **徽章分母已在线上像素中**（新核实①，零波及论证关键）：SAMPLES.kefu 默认
  工作流（app.js:140-155）node 4 = llm 节点带 `mcp:{'web-search':['search']},
  skills:['doc-writer']`（:144-145）→ fresh boot（:2611-2618）与 s0/s1 golden
  中 node 4 徽章「MCP 1/5 · 工具 1」「技能 1」**今已渲染**（capsChips :780-787，
  依赖 `MCP_SERVERS.length`）——离线回退集必须逐字保留分母 5。
- **caps 节点类型**（新核实②）：`packages/shared/test/nodes.baseline.json` 亲读，
  caps 键恰 3 类节点——llm `["mcp","skill"]`、agent `["mcp","skill"]`、code
  `["mcp"]`（nodes.ts:99-109 由 `binding.capabilities` 合成；llm/node.ts:39、
  agent/node.ts:40-44、code/node.ts:27）。s13 场景选 llm 节点即可覆盖 mcp+skill
  双区。
- **后端地基**：`mcp/registry.ts:31` BUILTIN_MCP_IDS 五 id 与前端逐字一致；
  :105-108 envLoader；:116-132 buildMcpRegistry（内置 id 冲突 warn+拒条
  :124-130）。**`mcp/inject.ts:37` 持模块级单例 registry 但未导出**（新核实③）——
  清单端点需**第二实例**派生（PRD「mcp/ 零改动」约束下的必然解，§4.3）。
  `tools.ts:145-158` TOOL_SPECS 13 工具（含 browser 三条「（未实现）」前缀）；
  server.ts:196-219 路由全集无清单端点（PRD 判断成立）。
- **数据面先例**：`server-sync.js` 全文 147 行亲读——SVR 缓存（:44-53）、
  arrive 回调（:56-59）、refresh 系列（:61-75）、apiJson 8s 超时（:16-20）、
  仅 /api/v1（:11）。`ENGINE.probe` 的模型列表到达后条件重渲染（app.js:2245-2253）
  与 `#props` scrollTop 保持（:1027-1028）是到达回调的直系先例；arrive 注册点
  先例 :637-638；`rerenderNode`（:1076-1081）自带 `measurePorts()+updateEdgesOf()`
  （AGENTS.md portCache 陷阱的内建解）。
- **gate 机制**：`gate.mjs:36-42` 静态服务仅回磁盘文件 → `/api/v1/capabilities`
  必 404（既有场景回退保持的结构性保证）；:251-273 恰 13 场景 s0~s12；
  :275-326 runScenario（routes 先于 goto :280、seed :284、ready :291、inv 展开序
  :304-323）；:337-341 **golden-created 通道**（`!existsSync` 即写盘，非
  gate:update）；golden 目录亲列：13 场景 × 2 文件，无 s13。
- **smoke 结构**：`smoke-server.mjs` 断言 ID 亲枚举——已用组字母 A/C/D/E/G/H/J/
  K/N/O/P/M/R/S/T/V/W/Z（M 组在 mcp-stubs.mjs，MR 前缀两字母先例在库）→ 新组
  取 **CAP**（CAP01~CAP05）；主实例 env 注入先例（H 组 :357 `startServer(port,
  {env})`）、第二实例先例（G05 mock / Z 组）。
- **ADR 编号**：docs/adr/ 现存 0001~0017 → 本轮草案 **0018**（PRD 受影响文件
  清单占位 `00NN` 落定为 0018）。
- BACKLOG.md:62 BK-0049 行亲读（状态 ready + 2026-10-26 晋升注记；受影响文件
  口径与验收命令口径原文与 PRD 引文一致）。

## 1. 范围与护栏裁示

### 1.1 触 UI = 是，修宪轮（承 PRD 结论）

改动触及宪法第 1 条视觉层（在线态属性面板 caps 勾选清单与节点徽章的内容数据源
变化——`app.js:104-123` 硬编码区属宪法冻结面，BACKLOG BK-0049 行定界原文）。
授权链闭合：issue#6 批复承继（PRD 亲核）+ **ADR-0018 草案（本轮落盘）** + 本迭代
内 golden 增量（§6）——宪法第 3 条三要素齐备。结构层（DOM/CSS）与交互层（处理器
逻辑）零改动（ADR-0018 §4 三层回写表）。

### 1.2 零接触面（硬边界，任一被突破即按 WORKFLOW §4 BUILD 中止条款处理）

- **SSE 契约零接触**：`packages/shared/src/events.ts` 零 diff；零新增事件类型。
- **shared DEFS 零触及**：`packages/shared/**` 全部零 diff（含 nodes.*、baseline、
  契约测试）→ `npm test` 零漂移预期。
- **渲染模板与处理器零改动**：capsHtml（:968-1001）、capsChips（:780-787）、
  `#props` change 处理器（:1003-1030）的 DOM 结构/类名/文案模板与**处理器逻辑**
  均不动；改动仅是两常量的供数链。
- **app.css / Skeleton.tsx 零 diff**（无新选择器、无骨架变化）。
- **mcp/ 目录零改动**：registry.ts / inject.ts / http.ts / stdio.ts / connection.ts
  零 diff。
- **后端零出站新增、零新依赖、零新 env**：清单端点只读进程内状态；skills 不做
  env 注册表（POLICY 需批准面，out of scope）。
- **gate 既有场景零重录**：s0~s12 基线不动（§6.2）；`npm run gate:update` 仅在
  §6.4 应急条件成立时允许恰一次。

## 2. 受影响文件清单（产品提交 productFiles 申报口径）

| # | 文件 | 改动 | 性质 | 预估规模 |
| --- | --- | --- | --- | --- |
| 1 | `apps/server/src/capabilities.ts` | **新建**：清单端点模块（handler + skills/服务级描述常量 + 派生函数，≤200 行，AGENTS ≤400 上限内） | 自主区 | ~80 行 |
| 2 | `apps/server/src/server.ts` | +import 1 行 + `app.get('/api/v1/capabilities', capabilitiesHandler)` 1 行（sessions 块后，v1-only）+ 头注释路由清单 +1 行 | 自主区 | +3 行 |
| 3 | `apps/web/src/server-sync.js` | +`fetchCapabilities`/`capShapeOf`（归一化+防御校验）+ `SVR.caps/capsErr` 两键 + `onCapsArrive` + `refreshCaps`（ADR-0006 数据面三件套） | 自主区（数据层） | +35 行（147→~182） |
| 4 | `apps/web/src/legacy/app.js` | :104-123 两常量 `const`→`let`（**字面量逐字不动**，注释更新为回退集口径）+ import 增补 + init() 尾 `refreshCaps()` 一行 + `onCapsArrive` 注册块（赋值 + 选择性重渲染，§5.3） | **修宪面** | ~+20/−4 行 |
| 5 | `tools/pixel-gate/gate.mjs` | +CAP_FIXTURE/CAP_ROUTES + CAPS_WF_SEED + capsReady/capsInv + SCENARIOS 表 s13 行（**纯插入**，既有行零改动） | golden 增量 | +45 行 |
| 6 | `tests/golden/ui/s13-caps-panel.png` + `.invariants.json` | golden-created 通道落盘（gate 首跑自动写盘，BUILD 阶段产出） | 新基线 | 双文件 |
| 7 | `tests/smoke/smoke-server.mjs` | +CAP 组断言 CAP01~CAP05（§7）+ 头注释编排行更新 | 测试扩充 | +60 行 |

机制件（**不入 productFiles**，第二提交）：`docs/adr/0018-*.md`、
`docs/evolution/iterations/0039/{PRD,SPEC,JOURNAL,REPORT}.md`、BACKLOG 过程改动、
STATE.md 过程态。

**与 PRD 清单的差异**：无新增必改点；PRD 占位 `docs/adr/00NN-*` 落定为 0018、
「清单端点模块」落定为 `apps/server/src/capabilities.ts`、新场景落定为
`s13-caps-panel`——均为命名落定，非扩面。

## 3. 模块边界（docs/frontend-module-boundaries.md / ADR-0006 口径）

- **server-sync.js（数据与状态层）**：本扩展严格沿既有三件套形态——fetch 封装
  （复用 apiJson，8s 超时同口径）→ SVR 内存缓存（`SVR.caps`）→ arrive 回调
  （app.js 注册，容器不在时回调自 no-op）。新增的 `capShapeOf` 归一化是**纯数据
  变换**（端点 JSON → 前端消费形态 + 防御校验），零面板 DOM 操作——ADR-0006 4.4
  边界内。模块头注释「本模块只承载数据与状态层」不变。
- **app.js（画布/交互）**：只新增「供数到达 → 重渲染」接线（与 ENGINE.probe 模型
  列表刷新 :2245-2253 同型）；MCP_SERVERS/SKILL_LIST 仍由本模块持有（let 状态），
  渲染模板与处理器零改动。直连 `/api/health` 的既有例外（boundaries §3「与
  server-sync 的仅 /api/v1 分属两个作用域」）不受影响——caps 走 server-sync。
- **apps/server（后端）**：新模块 capabilities.ts 只读依赖既有导出
  （BUILTIN_MCP_IDS/TOOL_SPECS/buildMcpRegistry/envLoader），不反向修改它们；
  server.ts 仅注册路由。Express RequestHandler 类型沿 sessions.ts 先例。
- **单一事实源流向**：builtin id/工具名/工具描述 ← TOOL_SPECS（tools.ts:145-158）
  唯一派生源；服务级描述五条 + skills 五条 ← capabilities.ts 迁移常量（自 app.js
  逐字迁移后的**新家**）；前端字面量降级为离线回退集（与后端常量逐字一致，smoke
  CAP01/02 锁死）。

## 4. 后端设计（REQ-0049-01）

### 4.1 端点契约

```
GET /api/v1/capabilities          （仅 v1；无旧别名、无路径参数、无查询参数）
→ 200 application/json，恒成功（只读派生，无 4xx/5xx 路径；env 非法在启动期
  已被 config.ts zod fail-fast，注册冲突已在 buildMcpRegistry 拒条——到达本
  handler 的进程状态必然合法）
```

出参形态（字段名与前端消费形态逐字对齐——`sv.tools[].n/.d`、`sk.id/.name/.desc`
下游零适配）：

```json
{
  "mcp": {
    "builtin": [
      { "id": "filesystem", "name": "filesystem", "desc": "本地文件读写",
        "tools": [
          { "n": "read_file",     "d": "读取沙箱目录内的文本文件" },
          { "n": "write_file",    "d": "将文本写入沙箱目录内的文件" },
          { "n": "list_directory","d": "列出沙箱目录的内容" } ] },
      { "id": "fetch", "name": "fetch", "desc": "网页抓取",
        "tools": [ { "n": "fetch", "d": "抓取一个 http(s) URL，返回正文摘录" },
                   { "n": "download", "d": "下载 URL 资源保存到沙箱目录" } ] },
      { "id": "sqlite", "name": "sqlite", "desc": "数据库查询",
        "tools": [ { "n": "query", "d": "在沙箱数据库执行 SELECT 查询并返回行集（上限 100 行；仅限沙箱数据库，不能访问其他数据库文件）" },
                   { "n": "execute", "d": "在沙箱数据库执行写入或结构 SQL（CREATE/INSERT/UPDATE/DELETE 等，多语句以 ; 分隔；仅限沙箱数据库）" } ] },
      { "id": "browser", "name": "browser", "desc": "浏览器自动化",
        "tools": [ { "n": "navigate", "d": "（未实现）打开页面" },
                   { "n": "click", "d": "（未实现）点击元素" },
                   { "n": "screenshot", "d": "（未实现）截屏" } ] },
      { "id": "web-search", "name": "web-search", "desc": "联网搜索",
        "tools": [ { "n": "search", "d": "联网搜索，返回标题/链接/摘要" },
                   { "n": "news", "d": "检索某话题的最新新闻" } ] }
    ],
    "external": [
      { "serverId": "caps-ext", "kind": "http" }
    ]
  },
  "skills": [
    { "id": "ppt-builder",  "name": "PPT 生成器", "desc": "根据大纲生成演示文稿" },
    { "id": "doc-writer",   "name": "文档撰写",   "desc": "长文写作与润色" },
    { "id": "data-analyst", "name": "数据分析",   "desc": "表格解读与图表建议" },
    { "id": "coder",        "name": "编程助手",   "desc": "代码生成与审查" },
    { "id": "translator",   "name": "多语言翻译", "desc": "中英日韩互译" }
  ]
}
```

（`external` 示例为配了 env 时的形态；未配置 = `[]`。上例 builtin/skills 即
CAP01/02 断言的期望字面量——工具名/描述自 TOOL_SPECS:145-158 逐条誊取，服务级
描述自 app.js:105-116 誊取，skills 自 app.js:117-123 誊取。）

### 4.2 派生规则（单一事实源收口）

- `builtin` 序 = `BUILTIN_MCP_IDS`（registry.ts:31）声明序：filesystem, fetch,
  sqlite, browser, web-search；`name === id`；`desc` ← capabilities.ts 常量
  `BUILTIN_SERVER_DESC`（五条，自 app.js:105-116 迁移）。
- 每服务 `tools` = `Object.entries(TOOL_SPECS)` 中键前缀 `${id}.` 的条目按**声明
  序**过滤，`n` = 去前缀键名、`d` = `ToolSpec.desc`。本会话已核对五服务的工具
  相对序与前端回退集一致（filesystem read/write/list；fetch fetch/download；
  sqlite query/execute；browser navigate/click/screenshot；web-search search/news）
  ——smoke CAP01 deepEqual 锁死。
- `external` = 注册表 `entries` 映射 `{serverId, kind}`（'http'|'stdio'）；
  **零出站**（不做 tools/list 发现——那是 BK-0030 run 会话链路；端点只读注册
  状态，BK-0049 不做范围明载）。
- `skills` = capabilities.ts 常量 `SKILLS`（五条逐字迁移）。

### 4.3 第二注册表实例（inject.ts 单例未导出的解法）

```ts
const registry = buildMcpRegistry(envLoader(), { warn: () => {} });
```

- **为什么**：inject.ts:37 单例未导出且 PRD 钦定 `mcp/` 零改动 → capabilities.ts
  自建同源实例（同一 `envLoader()`，env 在进程内只读，两实例数据必然一致）。
- **warn 静默的理由**：内置 id 冲突 warn 已由 inject.ts 单例在启动时发出（ADR-0012
  §6.3 时序），第二实例重复 warn 只会产生双份日志噪音——传 no-op 收集器，日志
  语义不变（冲突条目两侧行为一致：均拒条）。
- 零 IO：`buildMcpRegistry` 纯解析（registry.ts:116-132），实例化不出站。

### 4.4 server.ts 注册位点

sessions 路由块（:214-219）之后追加，注释口径沿既有行：

```ts
/* 迭代 0039 / BK-0049 能力清单端点：仅注册 v1（沿 ADR-0005：新端点无旧别名） */
app.get('/api/v1/capabilities', capabilitiesHandler);
```

## 5. 前端设计（REQ-0049-02）

### 5.1 server-sync.js 数据面（+~35 行）

```js
/* 能力清单（BK-0049 / ADR-0018）：GET /api/v1/capabilities → 归一化 servers/skills
 * 数据层三件套：fetch（apiJson 8s 超时）→ SVR.caps 缓存 → onCapsArrive 回调。
 * capShapeOf 防御校验：形态非法抛错 → refreshCaps 捕获 → 回退集保持（app.js 持有）。 */
export const fetchCapabilities = () => apiJson('/capabilities').then(capShapeOf);
export function onCapsArrive(fn){ capsArrive = fn; }
export async function refreshCaps(){
  try{ SVR.caps = await fetchCapabilities(); SVR.capsErr = false; }
  catch(_){ SVR.capsErr = true; }
  capsArrive && capsArrive();
}
```

- `SVR` 增两键：`caps: null`（归一化 `{servers, skills}` | null=未成功拉取过）、
  `capsErr: false`。
- `capShapeOf(j)` 归一化规则（纯数据变换，零 DOM）：
  - `j.mcp.builtin[]` → 原样透传（逐条校验 string id/name/desc + tools[] 每项
    `{n,d}` 皆 string，违者 throw）；
  - `j.mcp.external[]` → `{ id: serverId, name: serverId, desc: '外部注册（'+kind+'）',
    tools: [] }`（校验 serverId/kind 为 string）——**tools 空数组 = v1 服务级行**
    （ADR-0018 §2.3；desc 前缀使在线态可辨别来源，文案固定无时间戳，确定性）；
  - `j.skills[]` → 原样透传（逐条校验 id/name/desc 皆 string）；
  - 顶层非对象/三数组任一缺失或非数组 → throw。
- 外部条目 desc 文案定为「外部注册（http）」/「外部注册（stdio）」——仅数据
  字段值，不触模板。

### 5.2 app.js 供数链（修宪面最小 diff）

1. :105 `const MCP_SERVERS = [...]` → `let MCP_SERVERS = [...]`；:117
   `const SKILL_LIST = [...]` → `let SKILL_LIST = [...]`。**数组字面量与其内
   每一个字符串逐字不动**（离线回退集）；:104 注释改注「离线回退集（在线时经
   /api/v1/capabilities 刷新，ADR-0018）」类口径。
2. import 增补（并入 :4-7 既有两条 import 语句之一即可）：`refreshCaps`,
   `onCapsArrive`（`SVR` 已在导入列表）。
3. init()（:2595-2626）尾部 `ENGINE.probe();` 之后追加一行
   `refreshCaps();   /* 能力清单：fire-and-forget，失败静默保持回退集（ADR-0018 §6） */`
   ——**不 gate 在 ENGINE.online 上**（probe 本身异步；离线时 apiJson 抛错即回退，
   与 s0~s12 回退保持的结构性保证一致）。
4. arrive 注册（:637-638 `onWorkflowsArrive/onRunsArrive` 之后同型追加）：

```js
/* 能力清单到达（BK-0049 / ADR-0018）：回退集 → 后端供数；失败（SVR.caps=null）
   静默保持回退集。重渲染面 = ① caps 节点徽章（rerenderNode 自带 measurePorts+
   updateEdgesOf，AGENTS portCache 陷阱内建解）；② 属性面板（选中恰 1 个 caps
   节点时，scrollTop 保持沿 :1027-1028 先例）。 */
onCapsArrive(()=>{
  if(!SVR.caps) return;
  MCP_SERVERS = SVR.caps.servers;
  SKILL_LIST  = SVR.caps.skills;
  state.nodes.forEach(n=>{ if((defOf(n).caps||[]).length) rerenderNode(n); });
  if(sel.nodes.size===1){
    const n = nodeById([...sel.nodes][0]);
    if(n && (defOf(n).caps||[]).length){
      const st = $('#props').scrollTop;
      renderProps(); $('#props').scrollTop = st;
    }
  }
});
```

5. **消费点零改动**：:785 分母引用、:976/:986-987/:993 渲染、:1011-1013 处理器
   逻辑全部原样（let 重绑定后引用解析到新数组；字段名逐字对齐 → 下游零适配）。

### 5.3 行为矩阵（验收对照用）

| 场景 | MCP_SERVERS/SKILL_LIST | 面板/徽章 |
| --- | --- | --- |
| 无后端（gate 静态服 / dev 仅前端） | 回退集（五+五） | 与现状逐像素一致 |
| 后端在、端点 404/超时/形态非法 | 回退集（refreshCaps catch；SVR.caps 保持 null） | 同上；无 toast/无日志行/无重渲染 |
| 后端在、无 env | 后端供数（builtin 五 + external [] + skills 五） | id/工具名/描述 = TOOL_SPECS 派生值（描述文案与回退集差异是**双源收口的预期结果**，PRD REQ-0049-02 Then ③） |
| 后端在、env 注册外部 server | builtin 五 + 外部条目（服务级行，tools 空） | 外部条目出现在勾选清单（BK-0049 行验收原文）；勾选落 `n.mcp[sid]=[]`——**v1 已知降级**：摘要/徽章不计空数组（capSummary :127）、重渲染后勾选态不保持（:981 `sel.length?'checked':''`）；通配/发现式选择属后续立项，本迭代不承诺 |

### 5.4 持久化兼容

`n.mcp`/`n.skills` 读写路径（saveLocal/loadLocal/undo）零改动；外部条目勾选落
`n.mcp['caps-ext']=[]` 与既有「mcp-tool 全取消即删键」（:1020）语义兼容，空数组
在 capSummary/capsChips 均不计——存量工作流 JSON 读写不受供数链影响（PRD
REQ-0049-02 Then ⑤）。

## 6. golden 方案（修宪轮要件：重录方案与宪法第 3 条依据）

### 6.1 依据与总则

- **宪法第 3 条**：ADR（ADR-0018 草案，本轮落盘）+ 用户批准（issue#6 批复承继
  2026-10-24T08:38:51Z，在案）+ 同一迭代内 golden 增量——三要素齐备。
- **WORKFLOW §6 护栏 2 / §4 BUILD 修宪轮条款**：`gate:update` 仅允许出现在已获
  用户批准的 ADR 迭代内，且脚本在 gate 失败时允许执行**恰一次**。
- **PRD REQ-0049-03 口径**（对 BACKLOG 行「基线重录」措辞的 PLAN 轮精化）：
  主通道 = **新场景 golden-created 落盘**（gate.mjs:337-341，`!existsSync` 即
  写盘并标 `golden-created`——这不是对既有基线的重录）；既有 13 场景**零重录**。
- golden 权威在 CI（windows-latest），本机差异仅参考；推送后盯 `ui-constitution`。
- 场景号按落盘时序（ADR-0015 §5）：本轮独占 s13；若并行路抢先落盘 s13，本路
  改用下一号（仅编号字面量与文件名变化，像素内容零变化，属改名非重录）。

### 6.2 既有 13 场景零波及（结构性论证 + 实测口径）

三条结构性保证（§0 亲核证据）：

1. **回退集 = 现字面量**：离线/失败时 MCP_SERVERS/SKILL_LIST 不变——含 :785
   徽章分母（kefu node 4「MCP 1/5」今在 s0/s1 像素中，回退保证分母恒 5）。
2. **gate 静态服必 404**：gate.mjs:36-42 仅回磁盘文件，`/api/v1/capabilities`
   不存在 → apiJson 抛错 → `SVR.caps=null` → arrive 回调 `return`，零重渲染。
   s4/s5/s9 虽有路由 fixture（health/列表在线态），但 capabilities 无 fixture
   → 真实网络打到静态服 → 404 → 同样回退保持。
3. **模板零改动**：capsHtml/capsChips 字节不变，数据未变则渲染逐像素不变。

**实测口径**：`npm run gate` 全量 14 场景——s0~s12 必须 `pass, diffPx=0, invDiff
=false`；任一红即**中止排查**（回退语义或模板被破坏的信号），不重录掩盖
（PRD REQ-0049-03 Then ②）。

### 6.3 新场景 s13-caps-panel（golden-created 通道）

```js
/* ---------- s13 能力配置面板在线态场景基建（ADR-0018 · 迭代 0039 / BK-0049 修宪轮） ----------
   触发形态 = localStorage 预置 trigger→llm 最小工作流（llm 带 caps [mcp,skill]，
   预选 web-search:['search'] + skills:['doc-writer'] → 画布徽章与面板选中态均在采集面）；
   在线态 = CAP_ROUTES 路由 fixture（health + capabilities）供数；fixture external
   含 1 条 caps-ext → .cap-server 计数 6 ≠ 回退集 5，即供数链到达的确定性判据
   （同 s4 wfReady 以 data-wf-id 判到达的口径）；徽章分母 6 同理入 .node-caps。 */
const CAP_FIXTURE = { mcp:{ builtin:[ /* §4.1 builtin 期望字面量原样 */ ],
                            external:[ { serverId:'caps-ext', kind:'http' } ] },
                      skills:[ /* §4.1 skills 五条原样 */ ] };
const CAP_ROUTES = [
  { pattern: '**/api/health',           handler: route => route.fulfill({ json: HEALTH_FIXTURE }) },
  { pattern: '**/api/v1/capabilities',  handler: route => route.fulfill({ json: CAP_FIXTURE }) },
];
const CAPS_WF_SEED = JSON.stringify({ tabs: [{ name: '能力配置示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'llm',     x: 410, y: 250, title: 'LLM 节点',
    mcp: { 'web-search': ['search'] }, skills: ['doc-writer'] },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });
const capsReady = page => page.waitForFunction(
  () => document.querySelectorAll('#props .cap-server[data-sid]').length === 6
     && !!document.querySelector('#props .cap-server[data-sid="caps-ext"]'),
  undefined, { timeout: 10000, polling: 100 });
const capsInv = page => page.evaluate(() => ({
  capServers: [...document.querySelectorAll('#props .cap-server[data-sid]')]
    .map(s => s.dataset.sid + (s.classList.contains('on') ? '*' : '')),
  capSkills: [...document.querySelectorAll('#props .cap-skill')]
    .map(s => s.dataset.sid + (s.classList.contains('on') ? '*' : '')),
  capsSum: document.querySelector('#props .caps-sum')?.textContent ?? null,
  nodeCaps: document.querySelector('.node[data-id="2"] .node-caps')?.textContent ?? null,
}));
/* SCENARIOS 表纯插入一行：*/
{ id: 's13-caps-panel', routes: CAP_ROUTES,
  seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), CAPS_WF_SEED),
  steps: [selectNode('.node[data-id="2"]')], ready: capsReady, inv: capsInv },
```

- **确定性论证**：fixture 全固定字面量（沿 WF_ROUTES 口径，无时间戳/无随机）；
  selectNode 走 s1 同款真实 mousedown/mouseup 路径 → renderProps 渲染 llm 参数
  widget（DEFS 默认值确定）+ caps 区；到达重渲染经 scrollTop 保持（§5.2-4），
  props 滚动位置确定；normalize 收底部面板 + 清 toasts + blur（gate.mjs:46-52）；
  health fixture 使 boot 走在线分支——「执行后端已连接」日志行入 #log-body 但
  面板已收起，像素不可见（s4/s5/s9 同款先例）；ENGINE.probe 模型列表空数组跳过
  renderProps 分支（HEALTH_FIXTURE 刻意留空，gate.mjs:63-69 原注释口径）。
- **invariants 断言定稿**（PRD REQ-0049-03 Then ③「关键计数」落定）：公共六键 +
  capsInv 四键——`capServers` 期望 `['filesystem','fetch','sqlite','browser',
  'web-search','caps-ext']`（序 = builtin 序 + external 尾接；'on' 标记仅
  web-search）、`capSkills` 期望五 id（doc-writer 带 `*`）、`capsSum` 期望
  `'已启用 1 个 MCP 服务 · 1 个工具 · 1 个技能'`、`nodeCaps` 期望含
  `'MCP 1/6 · 工具 1'`（分母 6 = 供数链动态化的画布侧铁证）。SVG 图标无文本
  节点，textContent 拼接确定。
- **落盘**：BUILD 阶段 gate 首跑自动 golden-created（png+invariants 双文件）；
  VERIFY 复跑必须 `pass, diffPx=0`（首跑落盘后即为基线）。

### 6.4 应急重录通道（条件触发，默认不消费）

仅当：① s0~s12 任一场景意外波及，且 ② 归因排查确认波及源自本变更**有意**的
离线渲染差异（本轮不存在此意图——离线回退语义保证逐像素一致，理论上仅当回退
实现错误时才波及，而那是 BUG 不是意图）——两条同时成立时，才允许按 issue#6
修宪授权执行**恰一次** `npm run gate:update`，且必须留前后 diff 证据（迭代
0037 §6.3-2 先例：current.png/diff.png/invariants 前置拷贝到迭代目录）。只满足
①不满足② → 修 BUG 回到绿，禁止重录掩盖。MERGE 后主干复测如 gate 红，同样按
此口径处置，不得为变绿放宽门禁。

## 7. smoke 断言组（REQ-0049-01 Then ①②，CAP01~CAP05）

挂接位点：smoke-server.mjs 主流程 W 组前后皆可（无状态依赖；建议 N 组之后、
S 组 SSE 之前，纯 HTTP 断言不掺流式时序）。组字母 CAP（两字母先例 = mcp-stubs
MR 组）；主实例零模型依赖零出站（同 O 组型态），外部态用第二实例。

| ID | 实例 | 断言 |
| --- | --- | --- |
| CAP01 | 主实例（无 MCP env） | GET `/api/v1/capabilities` → 200；`mcp.builtin` 与 §4.1 期望字面量**全字段 deepEqual**（id/name/desc/tools 的 n/d 逐字——「无 env 时行为 = 现前端字面量等价」的 id/工具名迁移保真 + 描述收口双锁） |
| CAP02 | 主实例 | `skills` 与 §4.1 五条**全字段 deepEqual**（app.js:117-123 逐字迁移保真）；`mcp.external` deepEqual `[]` |
| CAP03 | 主实例 | 响应顶层键恰 `['mcp','skills']`（无多余键，契约面锁定）；两次调用 deepEqual（无状态确定性） |
| CAP04 | 主实例 | POST `/api/v1/capabilities` → 404（仅 GET 注册，只读面证明；沿 Express 未注册方法路径 404 语义） |
| CAP05 | 第二实例（env `MCP_HTTP_SERVERS='caps-ext=http://127.0.0.1:9,filesystem=http://127.0.0.1:9'`，URL 指向永不拨打的 discard 端口） | `mcp.external` 恰 `[{serverId:'caps-ext',kind:'http'}]`——冲突条 filesystem 被拒（复用 registry 拒条，builtin 五条不受污染仍 deepEqual §4.1）；端点调用**零出站、进程不崩**（注册 URL 不可达也不影响——端点不做发现）；skills 仍五条 |

第二实例沿 Z 组/G05 先例（getFreePort + startServer env 注入 + 用毕清理）；带
`X-` 无关 env 不注入。冒烟汇总行从 125 起增 5（REPORT 以实跑数为准）。

## 8. 验收口径（PRD REQ-0049-04 对应；全部在工作树内实跑）

| # | 命令/点位 | 通过标准 |
| --- | --- | --- |
| 1 | `npm run build` | exit 0（shared+web+server 全链编译；capabilities.ts 经 build:server 覆盖） |
| 2 | `npm run gate` | **14 场景全 pass**：s0~s12 diffPx=0 + invDiff=false（零波及实测）；s13 首跑 golden-created、复跑 pass |
| 3 | `npm test` | 全绿（shared 零触及 → 30/30 零漂移预期） |
| 4 | `npm run smoke:server` | 零回退 + CAP01~CAP05 新断言组全过（125→130+，以实跑为准） |
| 5 | 手动 E2E ① 回退 | 仅 `npm run dev:web`（无后端，/api 代理不可达）：属性面板选中 llm 节点 → caps 区渲染五+五与现状一致；画布徽章「MCP 1/5」；控制台无未处理拒绝 |
| 6 | 手动 E2E ② 外部条目 | `npm start` 且 `MCP_HTTP_SERVERS='caps-ext=http://127.0.0.1:9'`：面板 MCP 组出现「caps-ext 外部注册（http）」行；展开为空工具区；勾选后 `n.mcp.caps-ext=[]` 落 localStorage（v1 降级形态如实核验，ADR-0018 §2.3） |
| 7 | 手动 E2E ③ 双源收口 | 有后端无 env：面板 builtin 五条的 id/工具名/描述与 `apps/server/src/tools.ts:145-158` TOOL_SPECS 逐字一致（DevTools 对照；描述文案与离线回退集的差异 = 预期收口结果） |
| 8 | 手动 E2E ④ skills | 有后端：技能五条与迁移字面量逐字一致（id/name/desc） |
| 9 | 手动 E2E ⑤ 持久化 | 勾选 web-search.search + doc-writer → 刷新页面 → 勾选态、徽章、caps-sum 恢复；取消全部勾选后 `n.mcp` 键删除（:1020 语义不回退） |

证据留档口径沿迭代 0035/0037（MERGE 后主干复测四项 + evidence/ 日志与图像）。
BUILD 中止条款：实现中发现触及 §1.2 零接触面或需扩大 §2 清单 → 立即中止，item
转 `pending-approval`/`blocked`，本迭代按回滚处理。

## 9. 实施顺序（BUILD 轮参考）

1. 后端先行段（自主区）：capabilities.ts + server.ts 注册 → `npm run build:server`
   → 手 curl 验出参 → smoke CAP01~CAP05 → `npm run smoke:server` 零回退。
2. 前端供数链（修宪面）：server-sync.js 数据面 → app.js const→let + 接线 →
   `npm run build` → `npm run gate`（此刻 s0~s12 必须已零波及——回退语义先行验证）。
3. golden 增量：gate.mjs s13 场景 + fixture → `npm run gate` 首跑 golden-created
   → 复跑确认 pass → `npm test`。
4. 手动 E2E ①~⑤ → 双提交（产品 §2 清单 / 机制件 ADR+迭代目录）。

每步以 `npm run gate` 全绿收口（AGENTS 工作流约定）；提交信息 Conventional
Commits，一次迭代一个产品提交。
