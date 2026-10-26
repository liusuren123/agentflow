# 迭代 0047 · PRD — BK-0056 server.ts 头注路由清单同步（补 /api/v1/sessions 五端点行）

> PLAN 轮产物（WORKFLOW.md §4 PLAN 契约 v2/v3）。S 项免独立 SPEC：受影响文件清单与
> 验收口径内嵌于本 PRD（§4/§5），返回 skipSpec=true。

## 0. 结论与分类（先行）

- **建议：做**（本轮项）。ready 队列枯竭下的规则④证据补题，同径先例 BK-0052（0040）/
  BK-0053（0041）/ BK-0054（0045）/ BK-0055（0046）连续四轮 done；本项与 BK-0055
  同性质（源码头注静态字面与实况同步）且同文件族（apps/server/src 头注），仅漂移
  形态由计数字面换为清单缺行。S 级零风险。
- **触UI 分类结论：否**。仅改 `apps/server/src/server.ts:3-16` 头注注释区的路由
  清单（纯插入 sessions 端点族行）与 v1-only 括注（词级补全），零行为、零 shared
  契约、零 golden、零 gate、零依赖、零 env。POLICY 自主区（「文档与实现同步」+
  后端 `apps/server/src/**` 自主演进射程；BK-0055 同判先例）。
- **非修宪轮**：全程禁 `npm run gate:update`，golden 零接触；S 项 skipSpec。
- **单轮项**：无批次编排，无姊妹子项。

## 1. 背景与选题过程（枯竭判定存证）

选题前置亲核（本会话实跑/实读，均在隔离工作树 feat/0047-iter 内）：

1. **ready 队列**：`grep -n "| ready |" docs/evolution/BACKLOG.md` 全表唯一
   BK-0040（BACKLOG.md:53）——已被并行工作流占位，派发提示明令本轮禁选。
2. **批复档案**：approved 无 / rejected 无 → 规则①③零动作。
3. **issue 面板**：#12/#6/#5/#4 均 needs-approval 无新批复——#12（CI 像素门禁 s3
   抖动）属 golden/pixel-gate/CI 需批准射程，维持待批准不自主处理（0045/0046
   PLAN 同判）；#4/#5/#6 修宪授权链已承继消费（BACKLOG 各行在案），issue 开放
   待各链终轮关单，本轮零动作；无 user-request 新项 → 规则②零动作。
4. **侦察档案**：残缺标记唯一实质项 = browser stub（tools.ts:138），ADR-0011 评估
   终态非缺陷不立项（0041/0045/0046 PLAN 同判在案）；tools.ts:5 系 stub 设计说明
   非缺陷；package-lock.json:787 系 integrity 哈希内 "XXX" 字符误报非标记；
   悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系治理日产物，心跳不
   重复采集。
5. **近 3 迭代（0041/0045/0046）在档观察复览**：全部闭口——0046 REPORT 遗留观察
   明示「无需后续动作」（AGENTS.md 漂移属禁止区留档）；0045 REPORT OBS-0045-01
   明示「无需后续动作」；0041 REPORT OBS-01/OBS-02 已由 BK-0054（迭代 0045）
   消化。→ 在档残留清零，本轮转 PM 自主侦察（只读 grep/亲读/blame）。
6. **自主侦察结果**（0046 同法：源码头注静态字面全仓扫描，本会话亲跑）：逐文件
   核 engine.ts / llm.ts / agent.ts / tools.ts / server.ts / store.ts /
   sessions.ts 头注——唯一实质漂移 = server.ts 头注路由清单独缺 sessions 五
   端点族 + 同头注 v1-only 括注漏列（证据见 §2）；store.ts 表清单已含
   sessions/messages/approval_audits（0015/0016 当轮即回写）无漂移；
   tools.ts:3「与前端 MCP_SERVERS 注册表一一对应」锚点变量 `MCP_SERVERS` 仍存
   于 app.js:107（0039 换源保留离线回退集初始值并接受 `SVR.caps.servers`
   刷新，app.js:647 亲核），指称成立非漂移。

**先例链**（为什么心跳可补题且可选）：BK-0055（迭代 0046 done）即 PM 自主侦察
发现的源码头注计数漂移，证据形态与本项同构（文件:行 + 亲读/亲跑输出 + 滞后源
BACKLOG 行在案 + git 取证），位置同在 apps/server/src 头注属 debt 类，心跳可选。

## 2. 立项证据（可验证指针）

| # | 指针 | 现值 | 实况 | 滞后源 |
| --- | --- | --- | --- | --- |
| E1 | `apps/server/src/server.ts:3-14` 头注端点枚举区 | 列出 `/`、health、models、run×3、workflows GET/PUT、runs×2、DELETE×2、capabilities 共 12 端点族，**零 sessions 条目**（本会话亲跑：`awk 'NR>=3 && NR<=16' apps/server/src/server.ts \| grep -c sessions` → **0**） | server.ts:222-226 实注册五端点：POST /api/v1/sessions（create）、GET /api/v1/sessions（list）、GET /api/v1/sessions/:id（detail）、POST /api/v1/sessions/:id/chat（SSE 续聊）、POST /api/v1/sessions/:id/stop（停止）——sessionsCreate/List/Detail/Chat/Stop 五 handler（:40-42 import 亲核） | 迭代 0015（BK-0016 done，提交 7239afb）落地 v1-only 路由×5 未回写头注 |
| E2 | `apps/server/src/server.ts:15-16` v1-only 括注 | 「（workflows/runs 为新端点，仅 v1 命名空间）」 | sessions（:222-226）与 capabilities（:228，迭代 0039/BK-0049）同为仅 v1 新端点——本会话亲跑 `grep -n "'/api/sessions\|'/api/capabilities" apps/server/src/server.ts` → 0 命中（无 /api/* 别名注册），v1-only 判定成立 | 0015/0039 两轮增补 v1-only 端点均未同步括注枚举 |

逐项取证补充（本会话亲跑）：

- **头注系「活清单」佐证（排除「刻意省略」解释）**：`git log -S
  "api/v1/capabilities → 能力清单" -- apps/server/src/server.ts` → `aa131d0
  2026-10-26`（迭代 0039）——头注路由清单在 0039 仍被维护增补 capabilities 行，
  而早于它落地的 sessions 族（0015，2026-10-24）始终缺席，属遗漏非设计。
- **对照组（同仓库同性质处置正确）**：store.ts:14-19 表清单含
  sessions/messages（标注「迭代 0015 / BK-0016」）与 approval_audits（「迭代
  0016 / BK-0017」）——0015/0016 当轮即回写，反证 server.ts 头注缺行是孤例。
- **sessions 端点语义与消费方**：sessions.ts:2-10 头注（「持久会话与流式会话 API
  （迭代 0015 / BK-0016）」）与 BACKLOG BK-0016 行在案；前端消费 = goal 会话面板
  （迭代 0032，app.js:2854 `fetch('/api/v1/sessions/' + … + '/chat')` 亲核）与
  server-sync.js 数据面（V1 基址，:11 亲核）。
- **边界语义澄清（不立项部分）**：头注:16 尾句「前端本阶段仍用旧路径」半真半旧
  ——legacy 主链确仍用旧路径（app.js:2339 `/api/health`、:2360 `/api/run/:id/stop`、
  :2525 approve、:2535 `/api/run` 亲核），但 goal 面板已用 v1（:2854）。该句属
  语义模糊非硬漂移（旧路径确实仍在用），措辞重写超出「与实况同步」射程，本项
  不动（§6）。

## 3. 需求（REQ）

- **REQ-0056-01（必做）**：`apps/server/src/server.ts` 头注路由清单区（:3-14）
  纯插入 sessions 端点族行（1~2 行，建议形态含五端点与迭代指针，如
  「GET/POST /api/v1/sessions[/:id] · POST …/chat（SSE）· POST …/stop → 持久会话
  五端点（迭代 0015 / BK-0016）」；终稿措辞归 BUILD，PRD 锚点 = 清单区出现
  字面 `/api/v1/sessions` 且覆盖五端点语义 + 含 BK-0016 或迭代 0016 溯源）。
  插入位置建议：DELETE 行（:11-12）之后或 capabilities 行（:13-14）之后，
  纯插入零删改既有行。
- **REQ-0056-02（同头注同性质，建议采纳）**：v1-only 括注（:16）「workflows/runs
  为新端点」补全为覆盖 sessions/capabilities（如「workflows/runs/sessions/
  capabilities 为新端点，仅 v1 命名空间」，词级替换，可证性 = §2 E2 的
  grep-无别名输出）。两 REQ 同头注同性质（注释准确性）一并清账非夹带
  （BK-0024/0054/0055 先例）。
- **非功能**：全产品面 diff 恰 1 文件（server.ts）行级 1~4 行内；tsc 构建成功且
  运行行为零变化（注释行不参与执行；tsc 默认保留注释 → dist/server.js 同步
  携带新注释，无运行影响，BK-0055 同判）。

## 4. 受影响文件清单（S 项免 SPEC 内嵌）

| 文件 | 改动 |
| --- | --- |
| `apps/server/src/server.ts` | 头注区纯改动：:3-14 清单区插入 sessions 端点族行（REQ-0056-01，纯插入）；:16 括注词级补全 sessions/capabilities（REQ-0056-02，采纳时） |
| `docs/evolution/iterations/0047/` | 机制件（PRD/JOURNAL/REPORT，随机制件提交） |

**零触碰清单**（验收硬边界）：`packages/shared/**`（含 test 与 baseline）、
`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、
`.github/**`、`package*.json`、`docs/adr/**`、`apps/server/src/` 内 server.ts
以外的一切文件（含 sessions.ts / store.ts / capabilities.ts / tools.ts 头注）。

**不为注释新增断言/护栏**：sessions 五端点行为面已由 smoke G 组（G01-G10，
迭代 0015 建立）机器守护、capabilities 由 CAP 组（CAP01-CAP05，迭代 0039）守护，
路由注册与注释的对应属文档准确性、无断言锚——新增清单断言属过度工程，明确不做
（BK-0055 同款边界）。

## 5. 验收标准（Given / When / Then）

- **AC1（正路径）**：Given 工作树基线绿，When `npm run build`（含 build:shared +
  build:server）与 `npm test`，Then 构建成功 + 30/30 全绿（与 0045/0046 基线
  一致，零增量断言）；tsc 对 server.ts 无错。
- **AC2（改动面机器证明）**：When `git diff HEAD -- apps/`（产品面），Then 恰
  1 文件（server.ts）；改动全位于头注注释区（:1-22 区间），diff 含字面
  `/api/v1/sessions`（REQ-0056-01），REQ-0056-02 采纳时 diff 另含 v1-only
  括注的补全词（sessions 与 capabilities 并列）；除注释行外零代码行变化
  （`git diff --stat` 行数 ≤4 行级）。
- **AC3（门禁红预案——先例形态）**：Given 0037~0046 已归档的本机 s3-library
  采样抖动（diffPx≈21~23、rerun 即绿、CI 权威，七轮+先例在案，issue #12 已开
  待批复），When 合并后 gate 首跑仅 s3 红，Then 按预案处置：不消费
  `gate:update`，复核 DOM 不变量逐键全等后以复跑/CI 权威裁决（注释改动对渲染
  路径零因果，grep 可证 apps/web 与 tools/pixel-gate 对 server.ts 注释零引用）。
- **AC4（回归面）**：`npm run build` / `npm run gate`（除 AC3 预案形态外全绿）/
  `npm test` 30/30 / `npm run smoke:server` 133/0（=0045/0046 基线，零回退；
  注释对 server 运行时零因果，G 组 sessions 断言原样通过）。
- **AC5（禁区白名单）**：When `git diff HEAD -- packages apps/web
  tools/pixel-gate tests .github 'package*.json'`，Then 恒空；且
  `git diff HEAD --stat -- apps/` 输出仅 server.ts 1 文件。

**验收命令口径**：`npm run build` + `npm run gate` + `npm test` +
`npm run smoke:server`（主干复测四件套，归合并复测执行）。

## 6. 不做范围

- 不动头注:16 尾句「前端本阶段仍用旧路径」（语义半真非硬漂移：legacy 主链
  app.js:2339/:2360/:2525/:2535 旧路径确仍在用；措辞重写超出同步射程，留治理日
  酌定）。
- 不动 tools.ts:3（「与前端 MCP_SERVERS 注册表一一对应」——锚点变量 app.js:107
  仍存，0039 换源保留，指称成立）。
- 不动 store.ts / sessions.ts / capabilities.ts / engine.ts / llm.ts / agent.ts
  头注（本轮侦察均无漂移，§1-6/§2 取证在案）。
- 不动 AGENTS.md:14/:48（POLICY 禁止区，用户亲改；0046 PRD §2 已留档）。
- 不动 BK-0051（README 漂移，doc 项归治理日批处理）。
- 不动 issue #12（CI 像素门禁抖动，needs-approval 待用户批复，golden/pixel-gate
  /CI 需批准射程）。
- 不做任何 BK-0040 链或 BK-9004/BK-9005/BK-9006 链子项（占位/前置/批复门未解：
  BK-0041/0042 待 BK-0040、BK-0044 待附录 A 批复、BK-0045 待 BK-0044、
  BK-0047 待 BK-0019、BK-0048 待 BK-0020）。
- 不为头注清单新增断言（§4 既定）。
- 不回改 0046 及此前已定稿的 PRD/REPORT 文本（双层记录惯例）。

## 7. 风险

- 唯一可预见风险 = AC3 所列本机 s3 采样抖动（环境侧，七轮先例在案：0037 五次
  采样 0/23/0/21/0、0039~0041/0045/0046 首跑红复跑绿），预案已备，零产品因果
  路径。
- tsc 默认保留注释 → dist/server.js 注释同步变化，属预期产物差异；gate 自托管
  web dist、smoke 打 API 面对 server dist 注释零敏感（AC4 回归面覆盖，
  BK-0055 同判）。
