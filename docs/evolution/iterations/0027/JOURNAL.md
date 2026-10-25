# JOURNAL · 迭代 0027 · BK-0032 agent 节点与 goal 会话面板 ADR 草案 SPEC 先行（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 11:52
> 输入：`PRD.md`（REQ-0032-01~05 / AC1~AC7；触UI=否、纯文档轮、skipSpec=false）+
> `SPEC.md`（§0 needsAdr=false——本项产品即 ADR 草案，BUILD 按 SPEC §3~§8 转写
> 落盘，无自主设计决策空间；§1 受影响文件两路径；§2.1 角色分工与「矛盾即中止」
> 义务；§8.1/§8.2 定界与回写权威字面量；§9 验收口径）。
> 本轮零代码 / 零依赖 / 零契约 / 零 UI / 零 golden：未触碰 `apps/**`、
> `packages/**`、`tests/**`、`tools/**`、`.github/**`、package.json /
> package-lock.json 任何字节（全程只读核实代码锚点）。
> 完整门禁（build / gate / test / smoke:server）与 git 提交由脚本统一执行，BUILD
> 未自行运行。STATE.md 已按派发指令更新：`phase: SPEC → BUILD`、
> `updated: 2026-10-25 11:52`（沿 0017 先例仅动 phase/updated 两字段）。

## 1. 改动清单（产品提交面 = AC5 白名单一路径；STATE/JOURNAL 为机制文件）

| 文件 | 净改动 | 改动内容 |
| --- | --- | --- |
| `docs/adr/0013-agent-node-goal-session-panel.md` | **纯新增 297 行**（≤400，PRD「~280（≤400）」与 SPEC §3「~286」预算达成——297 ∈ 280±60 区间；UTF-8 无 BOM、LF，`file`/`od`/CR 计数亲核） | 按 SPEC §3~§8 逐节转写：头部状态块（:3 状态行字面 = SPEC §3 规定文本，含「草案 · 待实施轮消费」+ 授权链 issue#2 承继 2026-10-23T15:49:39Z）+ 显著声明 → §1 动机与现状证据（差异化空白带 + issue#2 链 + 地基证据三条）→ §2 agent 节点 DEFS 方案（T4 基线 + 定稿草案代码块逐字转写 SPEC §4.1 + 差异裁决五表 + schema 纪律自检 + 类目色两段口径）→ §3 handler 边界（落点/预算循环/工具会话/会话承载/与 llm.ts 关系）→ §4 goal 面板入口三案对比（推荐 B 浮动面板）+ 模块边界承载 → §5 消费映射（端点五表 + 事件七表 + 8 种不消费列明 + §5.3 护栏字面量）→ §6 golden s8/s9 双通道预案表 → §7 BK-0015 联合评估（四段：锚点/三选一表/最小面结论/零请批面声明）→ §8 BK-0033/0034 定界压缩索引（权威字面量指回 SPEC §8.1~§8.2）→ §9 影响面与不做范围 |
| `docs/evolution/BACKLOG.md` | 3 行备注列原地替换（`git diff --stat` 亲核 3 insertions / 3 deletions，表结构零变化） | BK-0033（:46）/ BK-0034（:47）/ BK-0015（:92）三行备注列替换为 SPEC §8.2 字面量**逐字节粘贴**（node 脚本从 SPEC.md :404/:410/:416 原文提取后写入，回读比对 VERBATIM=true ×3）；其余列（含状态 `proposed`）逐字未动（split('\|') 11 cells 校验 + id/status 字段核验）；BK-0032（:45）状态流转归脚本/CLOSE 未碰、BK-9002（:73）逐字不动 |

## 2. SPEC 蓝图 vs 代码现状复核（BUILD 义务，SPEC §2.1「矛盾即中止」）

复核方法：SPEC §2.2 锚点清单 + ADR 转写所引全部指针本会话 Read/grep/sed 逐一亲核。
**结论：技术结论与代码现状无矛盾，无需中止；发现 1 处 SPEC 论据栏计数笔误，按
代码事实转写并在此记偏差（见 §3.1）。**

命中的指针（超出 AC7 下限 ≥5 条，全部 file:line 精确命中）：

- `server.ts:215-219` 会话五路由恰五行（POST/GET /api/v1/sessions、GET /:id、
  POST /:id/chat、POST /:id/stop）；`:214` 注释「仅注册 v1」；
- `events.ts:8-37` RunEventSchema 恰 15 个 z.literal（run:accepted/start/progress/
  error/done、node:start/bypass/delta/done/error、cond、log、output、
  approval:required/done），`:32` ok 语义注释（BK-0023 产物）在位；
- `llm.ts:70` `for(let round=1; round<=3; round++){`；文件 126 行（wc -l）；
  `:71-81` generateText + res.response.messages 续接形态；
- `sessions.ts` 全文 176 行（wc -l）：`:8-9` 头注「复用现有 15 种 SSE 事件承载
  ……零新增契约」；发射点 run:accepted :91、run:done :95-97（finish 闭包）、log warn
  :106、run:error :107、node:start :114、node:delta :126/:130（节流/补发末次）、
  停止路径 :134-137（不发 node:done、部分保留落库）、node:done :144、log ok :146、
  run:error :155；常量 SESSION_NODE_ID=0 :28、DELTA_EMIT_MS=60 :31、HISTORY_LIMIT=20
  :27；五 handler 落位 :39-42/:44-48/:50-54/:58-63/:69-164（400/404/409 语义与
  SPEC §5.2 表逐条相符）；
- `store.ts:48-56` SessionRow 六字段 + MessageRow 对外形状；
- `gate.mjs:176-187` SCENARIOS 恰 8 项 s0~s7、WF_ROUTES/RUN_ROUTES fixture :181-184；
  **golden-created 通道 :247-253**（`if (UPDATE || !existsSync(gPng))` 落盘并记
  status）——SPEC §6 对 PRD 所引 :192-196 的勘正经亲核成立，ADR §6 采用核实值；
- `packages/shared/src/nodes/` 16 目录 + README（ls 亲核）；`nodes.ts` 142 行；
  `nodes.schema.ts` 174 行：:13-15 端口五/widget 五/分类七枚举、:18-26 端口 id 正则、
  :50-58 widget×default 矩阵、:72-83 CapabilitiesJsonSchema 十 kind（agent 在列）、
  :107 requiresApproval「预留·未启用」、:111 起 superRefine；
- `nodes/llm/node.ts:22-28` model options 恰 6 项 + `:29` runtimeOverridable、
  `:39` capabilities 三键（llm/mcp/skills）——见 §3.1 偏差记录；
- `app.js`：CATS 七类目 :46-54、sparkles 图标 :77、MCP_SERVERS/SKILL_LIST :102-121、
  capSummary :123-127、`DEFS = NODES` :133、defOf :192、节点库 DEFS×CATS 通用渲染
  :322-336（kw 搜索 ~:325、caps mini-tag ~:334）、`:469` 浮动弹窗动态创建先例、
  `:1264` 节点体 def 取用、run SSE fetch+getReader :2237-2242；
- `app.css:19-20` `--cat-chat:#a06bff` 等七类目色变量；
- `server-sync.js` 131 行（wc -l）：:45-48 wfArrive/runsArrive 按需回调先例；
  `Skeleton.tsx:23-55` rail 区 data-stab 按钮；
- `handlers.ts:17` BASIC_HANDLERS + `engine.ts:26-27` HANDLERS 聚合注册
  （`...BASIC_HANDLERS` 展开）；
- `docs/node-definition-protocol.md`：§9 T4 前瞻草案 :529-576（:531「未获批准前
  不落地」、:535-575 代码块、:541「可点开进入流式会话面板」描述行）、§7.3
  capabilities 预留位 :390-394（agent sessionMode「BK-9002 批准后启用」）；
- ROADMAP：:126-128 差异化定位、:138 T5-M1 验收点、:149-150 BK-0015 联合评估建议、
  :156-168 M3 与拆分回写、:163-164「先迁移后扩展」、:184-190 SPEC 四连先行实施
  序列（BK-0032 首位）与 BK-9002 链推荐序（0033 → 0034）；
- BACKLOG：BK-0032（:45）/BK-0033（:46）/BK-0034（:47）/BK-0050（:63）/
  BK-9002（:73）/BK-0015（:92）六行亲读（拆分口径、批复承继时间戳、终轮回执
  编排在案，ADR §1/§7/§8 与其一致）；
- `docs/adr/` 现行恰 0001~0012（ls 亲核）→ 0013 编号顺延成立；ADR-0012 283 行
  双位标注样板（头部体例对齐对象）。

## 3. 实现期偏差记录

### 3.1 SPEC §4.2 差异裁决表第 2 行「仅声明四键」计数笔误（按代码事实转写）

SPEC §4.2 第 2 行理由栏原文「llm 节点先例（同样经 MCP 工具间接 exec/net，仅声明
四键 `nodes/llm/node.ts:39`）」——本会话亲核 `nodes/llm/node.ts:39` 实际声明
**三键** `capabilities: { llm: true, mcp: { toolSelection: 'user' }, skills: true }`；
「四键」是 **agent 节点定稿草案**的键数（llm/mcp/skills/agent，SPEC §4.1 同款），
SPEC 该栏把两者计数混写。技术结论（agent capabilities 收敛为四键、不声明 exec/net、
护栏由工具层承载）与代码现状**无矛盾**。处置：ADR §2.2 第 2 行按事实转写为
「llm 节点先例（……仅声明 llm/mcp/skills 三键，`nodes/llm/node.ts:39`）」，设计
决策零改动——此为转写准确性修正而非设计变更（若逐字照抄 SPEC 原文，VERIFY 的
AC7 指针核对反而会判 ADR 与代码不符）。ADR 状态草案、BK-0033 回写字面量
（SPEC §8.2 权威载体，不含该计数表述）均不受影响。

### 3.2 其余零偏差

ADR 六要素、DEFS 代码块（SPEC §4.1 逐字）、§5.3 护栏字面量、§7 结论四段、
BACKLOG 三行回写（§8.2 逐字节）均无改动；SPEC §6 对 PRD :192-196 的 golden-created
通道行号勘正（→ gate.mjs:247-253）经亲核成立，ADR 直接采用核实值（不属偏差）。

## 4. 自测与边界核验（文件级；门禁四命令归脚本）

- `wc -l docs/adr/0013-agent-node-goal-session-panel.md` → **297**（≤400 ✓）；
- `grep -n "草案"` → :3 状态行命中且含「待实施轮消费」；授权链时间戳
  2026-10-23T15:49:39Z 在位（AC1 要素）；全文无「已批准」字样（非功能要求 3：
  `grep -c "已批准"` = 0）；
- EOL/BOM：`file` = UTF-8 text（无 BOM 标记）、首三字节 `# A`（od 亲核）、
  CR 计数 0（纯 LF，非功能要求 4）；
- BACKLOG 回写 VERBATIM：node 比对三行备注 `trim()` 后与 SPEC :404/:410/:416
  原文全等 → `VERBATIM=true ×3`；三行状态列仍 `proposed`、id 列正确、每行 11
  cells（表结构未变）；BK-0032/BK-9002 行前缀未动（AC4 前置）；
- `git diff --stat -- docs/evolution/BACKLOG.md` → 3 insertions / 3 deletions
  （恰三行原地替换，无表结构变化）；
- 产品白名单外零改动：本轮全程未对 `apps/**`、`packages/**`、`tools/**`、
  `tests/**`、`.github/**`、根/子包 package.json / package-lock.json 执行任何写
  操作（`git status --porcelain` 仅 docs/adr 新增 + docs/evolution 三文件改动，
  交付脚本复核）；
- 未运行（归脚本统一执行，本 JOURNAL 不代报）：`npm run build` / `npm run gate` /
  `npm test` / `npm run smoke:server`；`npm run gate:update` 全程禁止（非修宪轮，
  POLICY 禁止区）——未运行、未接触 golden 任何字节。

## 5. 移交说明

- VERIFY 按 SPEC §9 执行：AC1（文件/行数/六要素/草案标注）、AC2（消费映射逐条
  对照 server.ts:215-219 与 events.ts:8-37 + 7 事件发射点）、AC3（§7 四段与双面
  声明）、AC4（三行 VERBATIM——本 JOURNAL §1 已载 node 全等比对，VERIFY 复跑）、
  AC5（产品提交恰一路径纯新增 + 禁区 diff 恒空）、AC6（门禁四命令，脚本侧）、
  AC7（指针抽样 ≥5——§2 清单可作抽样池）、手动 E2E 点位（非阻塞）。
- 3.1 偏差提请 VERIFY 裁定：按 SPEC §2.1 BUILD 无改写技术结论之权，本偏差属
  论据计数的事实性修正（代码亲核在案），若判不认可，回退方案 = 恢复 SPEC 原文
  措辞并在 ADR 附勘误注（一行改动，不影响其余 296 行）。
- CLOSE 注意：BK-0032 置 done；issue#2 仅发进度回执**不关单**（关单留 BK-0034
  链终轮）；BK-0015 行备注已按评估结论刷新但状态 proposed 不动（待 BK-0033
  CLOSE 后随批关账）。
