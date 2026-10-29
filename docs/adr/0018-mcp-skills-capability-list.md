# ADR-0018 · MCP·skills 能力清单动态化（app.js 硬编码改后端供数，修宪轮）

- 状态：**草案 · 待实施轮消费（BK-0049 修宪轮，迭代 0039）；授权链 = 已获用户
  issue#6 批复承继（owner 评论「批准」2026-10-24T08:38:51Z，iterations/0037/PRD.md:10-11
  当轮 gh 亲核留档 + BACKLOG.md:77 BK-9006 行批复承继明载——不重开 needs-approval）**
- 日期：2026-10-26（迭代 0039 SPEC 阶段产出）
- 关联：CONSTITUTION 第 1 条（UI 三层冻结）/第 3 条（修宪通道）；POLICY.md 需批准区
  （UI 三层 / golden / 新端点）；BACKLOG BK-0049（ui-proposal / 触UI=是 / P0 / S /
  ready / issue#6，BACKLOG.md:62）· BK-9006（母项，关单留五子项终了）· BK-0029
  （env 注册表，done）/BK-0030（工具注入链，done，本 ADR 不动其产物）；ADR-0006
  （server-sync 数据与状态层边界——供数链的数据面落点）；ADR-0009（gate 路由
  fixture 供数先例）；ADR-0013 §5.3（SSE 契约零新增纪律）；ADR-0015 §5（golden
  场景号按落盘时序）；ADR-0019（issue#6 批复承继 + 草案/实施两态措辞口径的
  直系先例；原号 ADR-0017，BK-0063 撞号消解改 0019）；ROADMAP T5-M3 智能体工作台 UI（ROADMAP.md:198-201 实施序列第 6 条）；
  迭代 0039 SPEC（影响面与验收的权威细化）
- 版式对齐：ADR-0016 / ADR-0019

> **显著声明：本 ADR 为已获 issue#6 批复承继的修宪决策草案，不实施任何代码。
> 全部后端 / 前端供数链 / golden 改动归迭代 0039（BK-0049）实施轮消费；实施
> 前本 ADR 维持草案态（全文不使用「已批准」终态措辞，BK-0032/0035 先例口径）。**

## 1. 动机

T5 主轴「画布编排 × 深度智能体工作台」要求能力注册链前后端贯通。BK-0029 落地后
外部 MCP server 已可经 `MCP_HTTP_SERVERS`/`MCP_STDIO_SERVERS` 注册并被 LLM/agent
节点在 run 会话期调用（BK-0030 注入链 done），但前端属性面板「能力配置」勾选清单
仍是 `apps/web/src/legacy/app.js:105-116` 硬编码的五条「原型模拟数据」（:104 注释
自认）——**用户在面板看不到、也勾不了自己注册的外部服务，能力注册链在前端断头**；
BACKLOG BK-0049 行验收原文即「注册表条目出现在勾选清单」。

同时存在双源漂移面：前端 MCP_SERVERS 的 id/工具名是 `apps/server/src/mcp/registry.ts:31`
BUILTIN_MCP_IDS 与 `apps/server/src/tools.ts:145-158` TOOL_SPECS 的手工平行副本，
工具描述各写一套（前端「读取文件」vs 后端「读取沙箱目录内的文本文件」）且无守卫；
SKILL_LIST 五条（app.js:117-123）在后端零对应物。后端供数后 id/工具名/描述一处
定义（TOOL_SPECS 派生），前端退化为离线回退字面量。

## 2. 决策

1. **后端新增只读清单端点** `GET /api/v1/capabilities`（仅 v1 命名空间，沿
   ADR-0005/0015 新端点无旧别名先例；server.ts:214-219 sessions 注册序之后）：
   出参 = builtin MCP 服务清单（id/name/desc + tools[{n,d}]，**派生自
   BUILTIN_MCP_IDS × TOOL_SPECS——id/工具名/描述单一事实源收口**）+ 外部注册
   条目（serverId/kind，来自 buildMcpRegistry 注册条目；无 env 时空数组）+
   skills 清单（后端常量，五条字面量自 app.js:117-123 **逐字迁移**）。
   只读进程内状态、零出站、零新依赖、零新 env、零 SSE 事件（events.ts 零改动）。
   契约细节（字段/示例载荷/错误码）以迭代 0039 SPEC §4 为权威细化。
2. **前端供数链动态化 + 离线回退**：MCP_SERVERS/SKILL_LIST 由 const 常量改为
   let 模块级状态（**初值 = 现字面量回退集，逐字保留**）；server-sync.js 增清单
   数据面（fetch + 缓存 + 到达回调，ADR-0006 边界内扩展，不操作面板 DOM）；
   app.js 启动 fire-and-forget 拉取，失败静默保持回退集；到达后仅重渲染属性
   面板与节点徽章。**渲染模板（capsHtml/capsChips）与勾选处理器逻辑零改动**，
   端点字段名与回退集逐字对齐、下游零适配。
3. **外部注册条目 v1 形态 = 服务级行（tools 空数组）**：清单端点不做 per-request
   tools/list 发现（出站发现仍归 BK-0029/0030 既有 run 会话链路）；勾选行为如实
   沿用既有代码路径（选中落 `n.mcp[serverId]=[]` 空数组、摘要/徽章不计、重渲染
   后勾选态不保持——v1 已知降级，SPEC 如实标注；通配选择语义属后续立项，本 ADR
   不承诺）。
4. **golden 增量走 golden-created 新场景通道**（新场景 s13 属性面板 caps 勾选
   清单，带清单端点路由 fixture 供数，ADR-0009 fixture 先例）：既有 13 场景
   （s0~s12）**预期零波及、不重录**——离线回退集 = 现字面量（含 app.js:785
   徽章分母 `MCP_SERVERS.length`，kefu 默认工作流 node 4 徽章「MCP 1/5」在
   s0/s1 像素在案）+ gate 静态服务对 `/api/v1/capabilities` 必 404 → 回退
   保持。任一既有场景意外波及：先归因排查，确认属本变更有意渲染差异后才允许
   按修宪授权重录恰一次（`npm run gate:update`，BK-0050 先例 §6.3-2 前后 diff
   证据口径）；场景号按落盘时序（ADR-0015 §5）。

## 3. 影响面

| 文件 | 改动 | 性质 |
| --- | --- | --- |
| `docs/adr/0018-mcp-skills-capability-list.md`（本文件） | 新增草案 | 修宪要件 |
| `apps/server/src/capabilities.ts` | 新建清单端点模块（≤200 行） | 自主区（后端只读能力） |
| `apps/server/src/server.ts` | +1 行 v1 路由注册 + 头注释 | 自主区 |
| `apps/web/src/server-sync.js` | +清单数据面（fetch/缓存/回调/归一化） | ADR-0006 边界内 |
| `apps/web/src/legacy/app.js` | MCP_SERVERS/SKILL_LIST const→let（字面量不动）+ 启动接线 + 到达回调重渲染 | **修宪面（宪法冻结区供数链换源）** |
| `tools/pixel-gate/gate.mjs` | +CAP_ROUTES fixture + s13 场景行（纯插入） | golden 增量 |
| `tests/golden/ui/s13-caps-panel.*` | golden-created 双文件 | 新基线（非重录） |
| `tests/smoke/smoke-server.mjs` | +CAP 断言组 | 测试扩充 |

**预期零改动**：`packages/shared/**`（含 events.ts/nodes.*/baseline——DEFS caps
声明形态不变）、`apps/web/src/Skeleton.tsx`、`apps/web/src/app.css`（无新选择器）、
`apps/server/src/mcp/`（registry/inject 零改动——清单端点以第二注册表实例派生，
conflict warn 已由 inject.ts 单例发出故静默防双报）、`tools/gen-node-readmes.mjs`。

## 4. 宪法第 1 条三层回写（本变更对各冻结层的处置结论）

| 层 | 处置 | 保证 |
| --- | --- | --- |
| 视觉层 | 离线（无后端/端点不可达）逐像素不变；在线供数到达后清单内容随后端数据变化（外部条目出现、工具描述收口为 TOOL_SPECS 文案）——这是获批变更的本体 | 回退集 = 现字面量（app.js:105-123 逐字保留）；gate 既有 13 场景零波及实测（SPEC §6） |
| 结构层 | DOM 结构/类名/CSS 零变化 | capsHtml/capsChips 模板与 app.css/Skeleton.tsx 零 diff；cssVars 不变量零新增键 |
| 交互层 | 勾选/展开/持久化语义零变化 | change 处理器（app.js:1003-1030）与 expand 处理器（:1039-1045）逻辑零改动；外部条目 v1 降级如实标注（§2.3） |

## 5. 像素对比证据获取方式

- **新场景**：s13-caps-panel 经 golden-created 通道落盘（png + invariants.json
  双文件），采集「属性面板能力配置区 + 画布徽章」在线供数形态；路由 fixture
  供数含 1 条外部条目使 `.cap-server` 计数 = 6 ≠ 回退集 5，构成供数链到达的
  确定性判据（同 s4 wfReady 以 `data-wf-id` 判数据到达的口径）。
- **既有场景**：13 场景 gate 实测 diffPx=0 / invDiff=false 即零波及证据；意外
  波及的归因与（仅在确认有意差异时的）重录前后 diff 截图沿 BK-0050 先例
  §6.3-2 留档义务。
- golden 权威仍在 CI（windows-latest + Playwright Chromium，CONSTITUTION 第 2 条）；
  推送后须盯 `ui-constitution` required check。

## 6. 回退语义（等价迁移口径）

端点不可达 / 非 2xx / 响应形态非法 / 超时（8s，沿 server-sync apiJson 既有
口径）任一命中 → 前端保持回退集（= 现字面量），无 toast、无日志面板行、无
面板重渲染——**保证无后端时画布与面板行为与现状逐像素一致**（既有 golden
零波及的前提）。skills 的 env 注册表 / 上传管理不在本 ADR 射程（新 env 语义
属 POLICY 需批准面，out of scope）。
