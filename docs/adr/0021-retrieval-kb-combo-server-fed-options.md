# ADR-0021 · retrieval kb 参数 combo 选项动态化（DEFS 写死三固定名改后端 kb 清单供数，修宪轮）

- 状态：**草案 · 待实施轮消费（BK-0047 修宪轮，迭代 0065）；授权链 = 已获用户
  issue#6 批复承继（owner 评论「批准」2026-10-24T08:38:51Z，BACKLOG.md BK-9006 行
  批复承继明载 + BK-0049 行 gh 留档批复时间戳先例沿 BK-0050 同径——不重开
  needs-approval）。issue#6 修宪批复射程已含本子项「combo 选项由后端 kb 清单
  端点供数」（BK-9006 拆分子项定界），授权面成立。**
- 日期：2026-10-28（迭代 0065 SPEC 阶段产出）
- 关联：CONSTITUTION 第 1 条（UI 三层冻结）/ 第 2 条（像素门禁与 golden 权威）/
  第 3 条（修宪通道）；POLICY.md 需批准区（UI 三层 / golden / shared DEFS）；BACKLOG
  BK-0047（ui-proposal / 触UI=是 / P0 / S / ready / issue#6，BACKLOG.md:68）·
  BK-9006（母项，关单留五子项终了）· BK-0019（kb 管道，done / 迭代 0064，本 ADR
  供数端点即其产物）· BK-0048（on-error 参数，链末项，不在本轮）；ADR-0003（shared
  单一事实源）· ADR-0006（server-sync 数据与状态层边界）· ADR-0009（gate 路由
  fixture 供数先例）· ADR-0015 §5（golden 场景号按落盘时序）· **ADR-0018（caps
  能力清单动态化——本 ADR 的直系同构先例，四点同构：只读清单端点 → 前端换源 →
  server-sync 数据面 → 新 golden 场景）** · ADR-0020（kb 管道，§5 清单端点契约）；
  ROADMAP T5-M3 工作台 UI 系列（ROADMAP.md:166-169，BK-9006 待办节 5）；迭代 0065
  SPEC（影响面与验收的权威细化）
- 版式对齐：ADR-0016 / ADR-0017 / ADR-0018

> **显著声明：本 ADR 为已获 issue#6 批复承继的修宪决策草案，不实施任何代码。
> 全部前端供数链 / golden 增量归迭代 0065（BK-0047）实施轮消费；实施前本 ADR
> 维持草案态（全文不使用「已批准」终态措辞，BK-0032/0035 先例口径）。**

## 1. 动机

BK-0019（迭代 0064）已把 kb 真实清单端点送上主干——`GET /api/v1/kb` 恒 200 只读
（apps/server/src/server.ts:292 注册，kb/routes.ts:31-33 承载，进程内索引派生 +
`ORDER BY name` 确定性码点序，store.ts:114-121），seed 已把三固定名播种为真实在库
KB。但 retrieval 节点的 kb 参数 combo 仍由 shared DEFS 写死三固定名渲染
（packages/shared/src/nodes/retrieval/node.ts:17-22）：**用户经上传管道
（POST /api/v1/kb/:name/documents）入库的新知识库，在属性面板永远看不到、选不到
——供数链在前端最后一环断头**。三固定名已从「demo 失真」转为「真实子集」，但
「真实全集」对前端不可见的缺口仍在。BACKLOG BK-0047 行验收原文即「combo 选项由
后端 kb 清单端点供数」。

## 2. 决策

1. **零 shared 改动案**（REQ-0065-04 优先案采纳）：DEFS 三固定名 options 原样保留
   为**离线回退集**；运行时在线态由前端渲染层把选项来源替换为 `GET /api/v1/kb`
   清单。DEFS 的合成输出 `o`（nodes.ts:73）本身就是回退集的单一事实源——不在
   app.js 复制字面量，比 ADR-0018 的「回退集逐字保留」更强形态（caps 的回退集是
   app.js 常量迁移产物；kb 的回退集天然就是 DEFS）。
2. **供数链形态 = ADR-0018 四件套同构**：server-sync.js 新增 `kbShapeOf`（契约形态
   校验）/`fetchKbList`/`SVR.kbs+kbsErr`/`refreshKbs`/`onKbsArrive`（只供数据零
   DOM，ADR-0006 边界不变）；app.js 新增到达回调（回退集→供数替换 + rerenderNode
   + renderProps 保 scrollTop）与 init / 选中 retrieval 两处 fire-and-forget 刷新
   时机（不引入轮询）。
3. **选项序裁决**：在线态 = 服务端返回序（`ORDER BY name` UTF-8 码点升序，确定性）；
   回退态 = DEFS 声明序。两序不同（FAQ-售前 < 产品手册 v2.3 < 工单历史 2026）如实
   声明，仅影响展开的下拉项排列，不影响闭合态 selected 按值匹配。
4. **值语义零改动**：不做「当前值不在清单则追加」——无匹配即 `selectedIndex=-1`
   闭合显示空白是既有行为（导入外部库名工作流的现状），保持渲染分支零新增。
5. **golden 双通道**：新场景 **s20-retrieval-kb-online** 走 golden-created 通道
   （gate.mjs `!existsSync` 即写盘，非重录）；既有 20 场景预期零波及（SPEC §4.2
   逐场景核对 + gate 实测背书）；`npm run gate:update` 仅作条件触发的应急通道
   （恰一次、恰枚举、留痕——SPEC §4.4）。

## 3. 影响面

- **前端（全部改动落点）**：`apps/web/src/server-sync.js`（数据面四件套增量）、
  `apps/web/src/legacy/app.js`（import / init / 到达回调 / 选中刷新 / 两渲染点
  widgetHtml:764-766 与 renderProps:959 换源 `comboOptionsOf`）。
- **gate**：`tools/pixel-gate/gate.mjs` 增 s20 场景基建（KB_FIXTURE / KB_ROUTES /
  KB_WF_SEED / kbReady / kbInv）+ golden 目录 s20 双文件（golden-created 落盘）。
- **零涉面（负清单）**：`packages/shared/**` 零改动（nodes.baseline.json:265-269
  字节不变）；`apps/web/src/Skeleton.tsx` / `app.css` 零改动；`apps/server/**`
  零改动（供数端点 BK-0019 已在主干）；检索语义面（handlers retrieval 链 / kb.ts
  索引打分 / topk/th / DEFS 默认值）零改动。
- **零新依赖 / 零新出站 / 零新 env**：前端 fetch 走既有同源 `/api/v1`（apiJson
  复用），不触 guard 出站面（issue#6 批复不自动覆盖依赖/出站/env 面，反转护栏
  PRD G1 在案）。

## 4. 宪法第 1 条三层回写（本变更对各冻结层的处置结论）

| 层 | 处置 | 说明 |
| --- | --- | --- |
| 视觉层 | **在线态有界变更（本次修宪对象）**：展开的下拉选项集合与顺序随服务端清单变化；闭合态像素零变化（selected 按值匹配 + select `width:100%` 固定，app.css:230/:363）。回退态像素与现状逐字一致 | s20 golden 基线固化在线态形态；s0~s19 零波及实测固化回退态 |
| 结构层 | 零变更：select 元素与 option 子元素的模板字面量、id/class 命名、层级逐字不变——option 文本/条数是内容而非结构（gate 公共六键 counts.widgets 口径不变） | DOM 不变量全等 |
| 交互层 | 零变更：select 点开/选择/change 委托写回 `n.params`（data-k 分支）语义不动；新选项写回值与服务端清单同名，检索链按名取库不变 | E5 交互回归抽查 |

## 5. 像素对比证据获取方式

- **回退态零漂移**：`npm run gate` s0~s19 全 pass（diffPx=0 + DOM 不变量全等）
  ——「与现状 1:1」由 0 容差门禁机器背书（尤其 s1-select-node：默认 kefu 工作流
  retrieval 节点属性面板离线呈现，最敏感对照面）。
- **在线态新形态**：s20 golden-created 基线（seed 值刻意取 fixture 独有名
  `kb-gate-ext`，闭合态 selected 显示该名 = 「服务端清单可供新库被选中」的像素级
  证明；per-scenario inv 固化 option 全清单 DOM 断言）。
- **golden 权威**：CI（windows-latest + Playwright Chromium）；本机差异仅参考；
  推送后盯 `ui-constitution` required check。

## 6. 回退语义（等价迁移口径）

任何时刻 `SVR.kbs === null`（离线 / 请求失败 / 未到达），渲染即回到 DEFS 回退集
= 与本变更前**逐字节一致**的形态——回退路径不是降级近似而是精确复原。变更整体
回滚 = revert 前端两文件 + gate.mjs 场景增补与 s20 golden 双文件，主干零残留。
