# 迭代 0046 · PRD — BK-0055 源码注释计数同步（handlers.ts「基础 16 种」→ 实况 18 种）

> PLAN 轮产物（WORKFLOW.md §4 PLAN 契约 v2/v3）。S 项免独立 SPEC：受影响文件清单与
> 验收口径内嵌于本 PRD（§4/§5），返回 skipSpec=true。

## 0. 结论与分类（先行）

- **建议：做**（本轮项）。ready 队列枯竭下的规则④证据补题，同径先例 BK-0052（0040）/
  BK-0053（0041）/ BK-0054（0045）连续三轮 done；本项与 BK-0053/0054 同性质（静态
  字面与实况同步），仅位置由测试文件换至源码头注。S 级零风险。
- **触UI 分类结论：否**。仅改 `apps/server/src/handlers.ts:2` 一行注释的计数字面与
  指注，零行为、零 shared 契约、零 golden、零 gate、零依赖、零 env。POLICY 自主区
  （「文档与实现同步」+ 后端 `apps/server/src/**` 自主演进射程）。
- **非修宪轮**：全程禁 `npm run gate:update`，golden 零接触；S 项 skipSpec。
- **单轮项**：无批次编排，无姊妹子项。

## 1. 背景与选题过程（枯竭判定存证）

选题前置亲核（本会话实跑/实读，均在隔离工作树 feat/0046-iter 内）：

1. **ready 队列**：`grep -n "| ready |" docs/evolution/BACKLOG.md` 全表唯一
   BK-0040（BACKLOG.md:53）——已被并行工作流占位，派发提示明令本轮禁选。
2. **批复档案**：approved 无 / rejected 无 → 规则①③零动作。
3. **issue 面板**：#12/#6/#5/#4 均 needs-approval 无新批复——#12（CI 像素门禁 s3
   抖动）属 golden/pixel-gate 需批准射程，维持待批准不自主处理（0045 PLAN 同判）；
   #4/#5/#6 修宪授权链已承继消费（BACKLOG 各行在案），issue 开放待各链终轮关单，
   本轮零动作。
4. **侦察档案**：残缺标记唯一实质项 = browser stub（tools.ts:138），ADR-0011 评估
   终态非缺陷不立项（0041/0045 PLAN 同判在案）；tools.ts:5「"not implemented"，
   不伪造结果」系 stub 设计说明非缺陷；package-lock.json:787 系 integrity 哈希内
   "XXX" 字符误报非标记；悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系
   治理日产物，心跳不重复采集。
5. **近 3 迭代（0040/0041/0045）在档观察复览**：全部闭口——0045 REPORT OBS-0045-01
   明示「无需后续动作」；0041 REPORT OBS-01/OBS-02 已由 BK-0054（迭代 0045）消化；
   0040 的 Windows sendFile 观察已由 BK-0052 承接闭口（done）。→ 在档残留清零，
   本轮转 PM 自主侦察（只读 grep/亲数/blame）。
6. **自主侦察结果**：源码注释计数字面全仓扫描，唯一实质漂移 = handlers.ts:2
   「基础 16 种」（证据见 §2）；同族排障另两处「15 种 SSE 事件」亲数恰符无漂移。

**先例链**（为什么心跳可补题且可选）：BK-0053/BK-0054 均为「留治理日」标签项经
心跳补题入选并 done（BK-0053 行备注明示「『留治理日』标签不阻心跳入选」）；本项
证据形态与之同构（文件:行 + 亲数输出 + 滞后源 BACKLOG 行在案），位置在源码注释
属 debt 类（BK-0053/0054 为 test 类），心跳同样可选。

## 2. 立项证据（可验证指针）

| # | 指针 | 现值 | 实况 | 滞后源 |
| --- | --- | --- | --- | --- |
| E1 | `apps/server/src/handlers.ts:2` 头注 | 「节点处理器（基础 **16** 种；LLM 见 llm.ts）」 | BASIC_HANDLERS 实有 **19 键 = 18 种节点 handler + `__pass` 内部直通**（20 种节点 − llm（llm.ts）− agent（agent.ts）= 18） | 0033 webshow / 0034 termview / 0035 jsoncanvas 三轮呈现节点并入 BASIC_HANDLERS（BK-0036/0037/0038 落地）均未回写头注 |
| E2 | 同行指注 | 「LLM 见 llm.ts」 | agent 类 LLM 节点已独立于 `apps/server/src/agent.ts`（BK-0033 落地），指注未覆盖 | 0031 agent 节点落地未回写 |

逐项取证（本会话亲跑）：

- **亲数命令**：`grep -nE "^  (async )?[a-zA-Z_]+\(" apps/server/src/handlers.ts`
  → 输出恰 19 行（__pass / trigger / userinput / prompt / retrieval / websearch /
  http / code / notify / condition / loop / delay / merge / reply / termview /
  setvar / webshow / jsoncanvas / approval），其中 `__pass` 为 `input ?? null`
  直通非节点 handler → 节点 handler 18 种。
- **节点总数自洽**：20 种节点（nodes.baseline.json，BK-0054 轮亲点 20 键）= 18
  （handlers.ts）+ 1（llm.ts）+ 1（agent.ts）。
- **git blame**：`git blame -L 2,2 apps/server/src/handlers.ts` → `8c860d35
  2026-10-21`（ADR-0004 TS 化拆分期写入，此后未动）——写作时点为 16 种节点时代。
- **同族排障（亲跑）**：`packages/shared/src/events.ts:3` 与
  `apps/server/src/sessions.ts:7` 的「15 种 SSE 事件」——`grep -cE "z\.literal\('"`
  events.ts 输出 15，恰符无漂移；README.md 与 docs/frontend-module-boundaries.md
  无「16 种」残留（README 既有漂移归 BK-0051 doc 项，治理日批处理）。
- **禁止区对照（不立项）**：AGENTS.md:14「16 种节点 handler」与 :48「现 84 断言」
  同族漂移，但 AGENTS.md 属 POLICY 禁止区（用户亲自修改），本轮不立项不代改，
  如实留档（处置建议归用户/治理日提请，沿 #9 先例口径）。

## 3. 需求（REQ）

- **REQ-0055-01（必做）**：`apps/server/src/handlers.ts:2` 计数字面「基础 16 种」
  →「基础 18 种」，与亲数实况一致（18 种节点 handler；`__pass` 直通不计入「种」）。
- **REQ-0055-02（同行内完善，建议采纳）**：同一行的指注由「LLM 见 llm.ts」补全为
  覆盖 agent 节点（如「LLM/agent 见 llm.ts · agent.ts」或等义表述），消除 agent
  落地后的导航缺口。终稿措辞 BUILD 定，PRD 锚点 = 计数字面 18 + 指注含 agent.ts
  路径名；两 REQ 同属 :2 一行，同性质（注释准确性）一并清账非夹带（BK-0024/
  BK-0054 先例）。
- **非功能**：全产品面 diff 恰 1 文件 1 行；tsc 构建成功且运行行为零变化（注释行
  不参与执行；tsc 默认保留注释 → dist/handlers.js 同步携带新注释，无运行影响）。

## 4. 受影响文件清单（S 项免 SPEC 内嵌）

| 文件 | 改动 |
| --- | --- |
| `apps/server/src/handlers.ts` | :2 单行注释：计数字面 16→18；指注补 agent.ts（REQ-0055-02） |
| `docs/evolution/iterations/0046/` | 机制件（PRD/JOURNAL/REPORT，随机制件提交） |

**零触碰清单**（验收硬边界）：`packages/shared/**`（含 test 与 baseline）、
`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、
`.github/**`、`package*.json`、`docs/adr/**`、`apps/server/src/` 内 handlers.ts
以外的一切文件。

**不为注释新增断言/护栏**：handlers 覆盖面已由既有 handlers-coverage 契约测试
（HANDLERS⊇NODES）机器守护，注释不参与任何断言锚——新增计数断言属过度工程，
明确不做。

## 5. 验收标准（Given / When / Then）

- **AC1（正路径）**：Given 工作树基线绿，When `npm run build`（含 build:shared +
  build:server）与 `npm test`，Then 构建成功 + 30/30 全绿（与 0041/0045 基线一致，
  零增量断言）；`node --check` / tsc 对 handlers.ts 无错。
- **AC2（改动面机器证明）**：When `git diff HEAD -- apps/`（产品面），Then 恰
  1 文件 1 行（handlers.ts:2）；diff 行内含字面「18」且指注含 agent.ts（REQ-0055-02
  采纳时）；计数与本 PRD §2 亲数输出（19 键 = 18 + __pass）一致。
- **AC3（门禁红预案——先例形态）**：Given 0037~0045 已归档的本机 s3-library
  采样抖动（diffPx≈21~23、rerun 即绿、CI 权威，五轮+先例在案），When 合并后
  gate 首跑仅 s3 红，Then 按预案处置：不消费 `gate:update`，复核 DOM 不变量
  逐键全等后以复跑/CI 权威裁决（注释改动对渲染路径零因果，grep 可证
  apps/web 与 tools/pixel-gate 对 handlers.ts 注释零引用）。
- **AC4（回归面）**：`npm run build` / `npm run gate`（除 AC3 预案形态外全绿）/
  `npm test` 30/30 / `npm run smoke:server` 133/0（=0041/0045 基线，零回退；
  注释对 server 运行时零因果）。
- **AC5（禁区白名单）**：When `git diff HEAD -- packages apps/web
  tools/pixel-gate tests .github 'package*.json'`，Then 恒空；且
  `git diff HEAD --stat -- apps/` 输出仅 handlers.ts 1 行级。

**验收命令口径**：`npm run build` + `npm run gate` + `npm test` +
`npm run smoke:server`（主干复测四件套，归合并复测执行）。

## 6. 不做范围

- 不动 AGENTS.md:14/:48（POLICY 禁止区，用户亲改；漂移已在本 PRD §2 如实留档）。
- 不动 BK-0051（README 漂移，doc 项归治理日批处理）。
- 不动 issue #12（CI 像素门禁抖动，needs-approval 待用户批复，golden/pixel-gate
  需批准射程）。
- 不做任何 BK-0040 链或 BK-9004/BK-9005 链子项（占位/批复门未解）。
- 不为注释计数新增断言（§4 既定）。
- 不回改 0045 及此前已定稿的 PRD/REPORT 文本（双层记录惯例）。

## 7. 风险

- 唯一可预见风险 = AC3 所列本机 s3 采样抖动（环境侧，六轮先例在案：0037 五次
  采样 0/23/0/21/0、0039~0041 与 0045 首跑红复跑绿），预案已备，零产品因果路径。
- tsc 默认保留注释 → dist/handlers.js 注释同步变化，属预期产物差异；gate 自托管
  web dist、smoke 只打 API 面，均对 server dist 注释零敏感（AC4 回归面覆盖）。
