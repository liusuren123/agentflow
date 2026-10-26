# 迭代 0052 · PRD — BK-0058 gate.mjs 头注场景数同步：6→16（issue#13 批复解阻）

> PLAN 轮产物（WORKFLOW.md §4 PLAN 契约 v2/v3）。S 项免独立 SPEC：受影响文件清单与
> 验收口径内嵌于本 PRD（§4/§5），返回 skipSpec=true。本轮隔离工作树
> `.zcode/worktree/feat/0052-iter/`（分支 `feat/0052-iter`），产物全部落在工作树内。
> 选题时间 2026-10-26 14:47–14:54。

## 0. 结论与分类（先行）

- **建议：做**（本轮项）。规则① issue 批复解阻项：needs-approval issue **#13**
  （【待批准】BK-0058 · gate.mjs 头注场景数同步 6→16，POLICY 需批准区
  tools/pixel-gate/ 注释级改动）本轮档案批复 **approved**，BK-0058（BACKLOG.md:71，
  pending-approval）转 ready 并按 WORKFLOW §4 优先序①选为本轮项。同族先例
  BK-0055（0046 源码头注计数）/ BK-0056（0047 头注路由清单）/ BK-0057（0050 冒烟
  编排串）连续同径 done——本项载体是宪法门禁执行器自身的头注，属同一「静态载体
  滞后实况」族，但**改动面位于 tools/pixel-gate/（POLICY 需批准区明文射程）**，
  前两轮 PLAN（0050/0051）均从严不自主实现、留档开 issue，本轮获用户批复后解阻。
- **触UI 分类结论：否**。仅改 `tools/pixel-gate/gate.mjs` 头注 `/* … */` 注释区的
  场景数计数字面与枚举行（本会话亲读 :1-10）。gate.mjs 是**门禁执行器**而非渲染
  路径——被测产物（apps/web/dist）零接触，无像素/DOM/CSS/交互因果；注释行零行为
  变化（`node --check` 与 gate 全场景复跑双佐证，AC1）。
- **授权链（POLICY 需批准面闭环）**：POLICY 需批准区明文「golden 基线重录与
  `tools/pixel-gate/` 改动」——本项改动落 tools/pixel-gate/，**授权 = issue #13
  用户批复（本轮档案 approved: #13 在案）**，批复射程 = 头注注释级场景数同步
  （issue 标题与 BK-0058 行备注均限定「注释级改动」）。
- **非修宪轮**：触UI=否、非 ui-proposal、golden 零接触（tests/golden/** 列入
  零触碰清单，AC5 机器证明）——**全程禁 `npm run gate:update`**；批复只解除
  POLICY 需批准面，不构成重录轮（派发规则①明文）。reconstitutional=false。
- **单轮项**：issue #13 名下无姊妹子项（单目的 issue：注释级改动），无批次编排；
  done 时由脚本回执关单 #13（itemContinues=false）。

## 1. 背景与选题过程（批复同步存证）

选题前置亲核（本会话实跑/实读，均在隔离工作树 feat/0052-iter 内）：

1. **规则①（issue 批复项，本轮命中）**：档案「approved：#13；rejected：无」——
   BK-0058（BACKLOG.md:71）行在库且备注明载「needs-approval issue #13 已开
   （2026-10-26 协调者心跳）」→ **不重复建行**，解除转 ready 门槛（状态
   pending-approval → ready，备注追加「issue#13 获批解阻」字样），并按优先序①
   选为本轮项（返回 sourceIssue=13）。
2. **规则③（rejected）**：无 → 零 skipped 改写。
3. **规则②（user-request 收录）**：档案无 user-request 新项；#12/#6/#5/#4 均
   needs-approval 无新批复——#12（CI 像素门禁 s3 抖动）仍属 golden/CI 需批准射程
   待批复（0045~0051 同判，本项与 #12 互不代位：#13 是注释同步批复，不构成 #12
   抖动处置方案的批复）；#4/#5/#6 修宪授权链已承继消费（对应子项各有前置未竟：
   #4→BK-0041/0042 前置 BK-0040 在途；#5→BK-0044/0045 阻塞于 ADR-0014 附录 A
   依赖批复；#6→BK-0047/0048 硬前置 BK-0019/0020 仍 proposed）。
4. **规则④（ready 常规选题）**：`grep -n "| ready |" docs/evolution/BACKLOG.md`
   全表唯一 BK-0040（BACKLOG.md:53）且被并行工作流占位**本轮禁选**（派发提示
   在案；`.zcode/locks/items/` 本会话亲核仅 BK-0040 一目）。常规队列枯竭，但
   规则①优先序在前，BK-0058 解阻即本轮项，无需补题。
5. **侦察档案**：残缺标记唯一实质项 = browser stub（tools.ts:138）ADR-0011 评估
   终态非缺陷不立项（0041/0045~0051 同判在案）；悬挂 run 探针 `[]` 空；治理日
   产物心跳不重复采集。
6. **近 3 迭代（0047/0050/0051，工作树 iterations 目录最新三个）在档观察复览**：
   全部闭口或已有归属——0047 OBS-0047-01（本机 :3000 陈旧进程，环境侧）、
   0050 s3 抖动（issue #12 在案待批复）与 BK-0058（issue #13 已开，**本轮由批复
   解阻消化**）、0051 两条环境/运维侧观察非缺陷。→ 在档残留中唯一有承载通道的
   待办即 BK-0058，与本轮批复解阻互为印证。

## 2. 立项证据（可验证指针）

| # | 指针 | 现值 | 实况 | 滞后源 |
| --- | --- | --- | --- | --- |
| E1 | `tools/pixel-gate/gate.mjs:4` 头注（本会话 sed 亲读） | 「· **6 个 golden 场景**，双重复核：像素 0 容差 diff + DOM 不变量」 | **16 个** golden 场景全绿多轮在案（E3） | s8（0031）/s9（0032）/s10（0033）/s11（0034）/s12（0035）/s13·s14（0038）/s15（0039）陆续落盘后 :4 计数从未回写 |
| E2 | `tools/pixel-gate/gate.mjs:5-6` 头注枚举行 | 「s0~s3 离线静态态；**s4/s5 在线态**（ADR-0009，issue#7 批准）——Playwright 路由拦截 fixture 供数…+ 时区钉死 UTC」 | SCENARIOS 数组（:348-381 本会话亲读）：在线态（routes 字段）= **s4/s5/s9/s15** 四场景（s4=WF_ROUTES/s5=RUN_ROUTES/s9=SESSION_ROUTES/s15=CAP_ROUTES；timezoneId:'UTC' 仅 s4/s5）；s6/s7=after 钩子（日志面板，0013）；s8/s10~s14=seed 预置工作流（0031/0033~0035/0038） | 同 E1；s9（0032）/s15（0039）复用路由拦截形态后枚举行未扩 |
| E3 | `tests/golden/ui/`（本会话 ls 亲跑） | — | `*.invariants.json` 恰 **16** 份：s0-initial … s15-caps-panel（s0~s15 连续无缺号）；0040/0041/0045/0046/0047/0050/0051 各迭代 evidence/gate.log 均 16 行 pass（metrics 各行在案） | （实况锚点） |
| E4 | BACKLOG BK-0058 行（BACKLOG.md:71）+ issue #13 | pending-approval，备注「POLICY 需批准区明文『tools/pixel-gate/ 改动』——纯头注注释零行为变化亦不例外（从严口径），本循环不自主实现…获批前零实现」 | 本轮档案批复 approved: #13 | 治理闭环：0050 侦察留档 → 协调者开 #13 → 用户批复 → 本轮解阻（本表即闭环证据链） |

**「活清单」佐证（排除刻意省略）**：头注 :8-9 明载「npm run gate → 校验（CI
required check）/ npm run gate:update → 重录 golden（宪法第 3 条…）」——头注是
gate.mjs 的使用说明与阅读地图，场景数与枚举是其核心信息；s4/s5 落地（0011，
ADR-0009）时该行曾随迭代维护，后续 7 个场景落盘均未回写，与 BK-0056（server.ts
头注路由清单）、BK-0057（smoke 编排串）同型「历次只加自家、漏补汇总行」漂移。

## 3. 需求（REQ）

- **REQ-0058-01（必做，计数同步）**：`gate.mjs:4` 词级替换「6 个 golden 场景」→
  「**16 个 golden 场景**」，行内其余文字（「，双重复核：像素 0 容差 diff +
  DOM 不变量」）逐字保留。
- **REQ-0058-02（必做，枚举行同步）**：`gate.mjs:5` 场景分组枚举行按 SCENARIOS
  数组实况同步（§2 E2 分组为唯一依据）：在线态（路由拦截 fixture）= s4/s5/s9/s15
  ——其中 s4/s5 溯源括注（ADR-0009，issue#7 批准）保留指涉 s4/s5 本身，s9/s15
  可加简注（迭代 0032/0039 或不注，BUILD 定稿）；s0~s3 离线静态态表述保留；
  s6~s8、s10~s14 的 seed/after 形态可并为一短语（如「其余为离线扩展场景（日志
  面板钩子 / seed 预置工作流）」）。约束：**与数组逐组一致、不虚构场景号、
  时区钉死 UTC 仅指涉 s4/s5 的表述不得扩大**；:6 行「路由拦截 fixture 供数
  （probe 的 /api/health + /api/v1 列表）+ 时区钉死 UTC」如因枚举行改写需微调
  指涉范围，以「与代码注释实况（runScenario 内『仅 s4/s5 传 UTC』『路由拦截须
  在 goto 之前注册』）一致」为准。
- **非功能**：全部改动位于 `/* … */` 头注注释区（:1-10 块内）；净增删 ≤4 行
  （词级替换 + 枚举行同步，BK-0056「3 行注释」同量级）；SCENARIOS 数组与一切
  可执行语句**零改动**（AC2 机器证明）；EOL/编码随文件现状（LF）；不为注释新增
  断言——16 场景行为面已由 gate 自身逐场景 diffPx=0 + DOM 不变量机器守护，注释
  无断言锚（BK-0055/0056/0057 同口径）。

## 4. 受影响文件清单（S 项免 SPEC 内嵌）

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `tools/pixel-gate/gate.mjs` | :4 计数词级替换 + :5（必要时 :6）枚举行同步，全在头注注释区，净 ±≤4 行 | 唯一产品面改动；REQ-0058-01/02 字面 |
| `docs/evolution/iterations/0052/` | 机制件（PRD/JOURNAL/REPORT，随机制件提交） | — |

**零触碰清单（验收硬边界）**：`tests/golden/**`（**golden 零接触——批复射程不含
重录，禁 gate:update**）、`apps/**`、`packages/**`、`tests/**`（smoke/canvas/
contract 一律不动）、`.github/**`、`package*.json`、`docs/adr/**`、
`tools/pixel-gate/` 内除 gate.mjs 外的一切文件（`git diff HEAD -- tools/` 恰
gate.mjs 1 文件）。

## 5. 验收标准（Given / When / Then）

- **AC1 正路径（门禁行为零变化）**：Given 工作树基线绿，When 改动落地后运行
  `node --check tools/pixel-gate/gate.mjs` 与 `npm run gate`，Then 语法检查通过
  且 **16 场景全 pass diffPx=0**（=0050/0051 基线；若首跑仅 s3-library 红
  diffPx≈21~23，按 0037~0051 已归档本机采样抖动预案处置：复核 DOM 不变量逐键
  全等后以复跑/CI 权威裁决，**不消费 gate:update**——本项对渲染路径零因果且
  #12 在案待批复）。
- **AC2 改动面机器证明**：When `git diff HEAD -- tools/` 与 `git diff HEAD --
  tools/pixel-gate/gate.mjs`，Then 恰 1 文件、全部改动行位于 `/* … */` 头注区
  （diff 行均含注释前缀 ` * ` 形态）、净 ±≤4 行、含字面「16 个 golden 场景」；
  diff 中不出现任何可执行语句行（SCENARIOS 数组、runScenario、import 等零触碰）。
- **AC3 枚举一致性（名实相符）**：When 将改后头注枚举行与 SCENARIOS 数组
  （:348-381）逐组比对，Then：在线态清单 = {s4, s5, s9, s15} 与 routes 字段
  四场景逐一对应；场景总数 16 = 数组长度 = golden 基线文件数（`ls
  tests/golden/ui/*.invariants.json \| wc -l`）；头注不出现数组中不存在的场景
  号，「时区钉死 UTC」指涉不超出 s4/s5。
- **AC4 回归面**：`npm run build` + `npm test` 30/30 + `npm run smoke:server`
  133/0（=0050/0051 基线零回退）；gate 面同 AC1。
- **AC5 禁区白名单终判**：When `git diff HEAD -- apps packages tests .github
  'package*.json'`，Then 恒空（**含 tests/golden——golden 零接触为批复射程的
  机器证明**）。

**验收命令口径**：`npm run build` + `npm run gate` + `npm test` +
`npm run smoke:server`（主干复测四件套，归合并复测执行）；另加 `node --check
tools/pixel-gate/gate.mjs`（AC1）。

## 6. 不做范围

- 不动 gate.mjs 任何可执行语句（SCENARIOS/runScenario/fixture/断言逻辑零改动）；
  不扩写头注其他段落（npm run gate / gate:update 使用说明 :8-9 逐字保留）。
- **不重录 golden、不运行 gate:update**（批复 = 注释级同步授权，非修宪轮；
  s3 抖动处置归 issue #12 待批复，本项不代位）。
- 不动 CI 配置（.github/workflows，#12 射程待批复）；不动 BK-0040（并行占用）与
  #4/#5/#6 各链子项（前置未竟）。
- 不动 AGENTS.md:47 断言数漂移（POLICY 禁止区）、BK-0051 与边界文档行数表
  （doc 类治理日批处理）、ROADMAP 状态行（治理日 PM 回写件）。
- 不为注释新增断言/护栏（§3 非功能既定）；不回改 0050 及此前已定稿的
  PRD/REPORT 文本（双层记录惯例）。

## 7. 风险

- 唯一可预见风险 = AC1 所列本机 s3 采样抖动（环境侧，0037 五次采样 0/23/0/21/0、
  0039~0041/0045~0047/0050 多轮同形态在案，CI 权威，issue #12 在案）——预案已备，
  本项零渲染因果（改的是门禁器注释而非被测产物）。
- 措辞风险（REQ-0058-02 枚举行）：以 §2 E2 分组表为唯一依据、AC3 名实相符机器
  核对兜底，杜绝为求工整而虚构归类（如把 s9/s15 写成时区钉死场景）。
- POLICY 边界风险：本项是进化循环**首次**触碰 tools/pixel-gate/——授权仅限
  issue #13 批复的注释级同步；BUILD 期若发现需改可执行语句或 golden 文件，
  立即中止转 blocked/pending-approval（WORKFLOW §4 BUILD 中止条款），不扩权。

## 8. 溯源与优先级

- 来源主题：T2·质量基建（BACKLOG BK-0058 来源列 T2；ROADMAP.md:36——golden
  门禁族）；派生链 = 0050 PLAN 轮侦察留档（候选 B）→ 协调者开 issue #13 →
  **用户批复（本轮档案 approved）** → 本轮规则①解阻入选；同族先例 BK-0055/
  0056/0057 连续同径 done（本项因 POLICY 需批准区射程多等一轮批复，机制闭环
  即 POLICY 设计意图）。
- 优先级 P2 / 大小 S / 类型 debt / 触UI 否（沿用建行时定级；批复解阻不改级）。
- **sourceIssue=13**（来源列 T2，系 issue#13 获批解阻——BACKLOG 备注已载「issue#13
  获批解阻」字样）；issue #13 名下无未竟姊妹子项 → **itemContinues=false**（done
  时脚本回执关单 #13）；**reconstitutional=false**（纯注释、golden 零接触、非
  修宪轮、禁 gate:update）；S 项 skipSpec=true。
