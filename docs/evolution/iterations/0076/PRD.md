# PRD · 迭代 0076 · BK-0066 workbench 安全面对抗审查与反演加固：collectGitInfo/collectDiff/collectTree 逐参数攻击面取证 + 注入/越界拒绝反演测试钉死 + 审计报告与最小加固（条件性）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-31 · 隔离工作树 `feat/0076-iter`
> 来源：BACKLOG **BK-0066**（debt / **触UI=否** / P2 / **S** / ready，BACKLOG.md:85）
> ——2026-10-31 W45 治理日新立项（规则④证据立项），本轮心跳即该项进入 ready 后的
> **首个可选项**（治理日 ready 队列唯一项，ROADMAP.md:228「ready 队列（治理日后）：
> BK-0066」明载）。
> **触UI=否——纯后端安全面审计 + 测试基建 + 文档留档，非修宪轮**：零前端、零
> packages/shared、零 golden、零新依赖、零新增 env、零新增出站类别。POLICY 自主区
> （测试与回归基建 `tests/**` + 后端能力演进 `apps/server/src/**` 条件加固 + 文档与
> 实现同步 `docs/` 审计报告）。**全程禁 `npm run gate:update`**（宪法第 3 条；
> 0069/0071/0073/0074/0075 连续同判先例）。
> **skipSpec=true**：S 项（非 doc、非触 UI）免独立 SPEC——受影响文件清单内嵌本 PRD
> §5，验收口径内嵌 §6。
> 回执口径：**sourceIssue 不设**（来源=W45 治理日 T3 立项链，非 issue 批复项；本轮
> 档案 approved 无，规则①零动作）；**itemContinues=false**（单件项、无姊妹子项、
> 无批次编排）；**reconstitutional=false**（非修宪轮，golden 零接触——禁止
> gate:update 与 golden 重录）。

## 0. 结论与分类（先行）

- **建议：做**（本轮项；outcome=selected 正常开工）。BK-0066 是 ready 队列唯一项
  （§1.1 亲核），立项证据三重：① Mimosa 提交/推送钩子自迭代 0055 起连续提示两项
  high——`apps/server/src/workbench/routes.ts:21` collectGitInfo 一跳可达
  command-injection、`routes.ts:76` collectTree 是 path-traversal 入口
  （`iterations/0057/MERGE.md:100-104` 留痕原文在库，§2.1 转录）；② 同 MERGE 节即
  建议「后续迭代立项审查」，W45 治理日抽查确认 ADR-0016 设计机制在位、判启发式
  误报可能性大但**须对抗取证闭口**（BACKLOG.md:85 行内明文「防盲目改码」）；
  ③ 治理日体检四绿（weekly/w45-*.log）证明基线可承载本轮。
- **触UI 分类结论：否**。预期改动面 = `tests/smoke/smoke-server.mjs`（B 组扩断言）+
  `docs/workbench-security-audit.md`（新增审计报告）+ 条件面
  `apps/server/src/workbench/*.ts`（仅取证发现真实缺口才最小加固，§3-④）。三面均
  不触视觉/DOM 结构/交互三层；`apps/web`、`packages/shared`、`tests/golden`、
  `tools/pixel-gate` 零触及——按宪法第 4 条不触发门禁红线，仍走常规 review。
  **对「是否影响渲染」存疑时按「影响」处理的条款不触发**：本项改动全部在后端与
  测试/文档，无任何渲染路径接触点。
- **非修宪轮**：全程禁 `npm run gate:update`；golden 零接触。gate 首跑若
  s3-library 出现 diffPx≈21~23 → 按 issue#12 在案口径复跑 + 双留档、以 CI 为权威，
  绝不重录（0068~0075 连续同口径先例）。
- **单迭代承载**：无批次编排、无姊妹子项、无来源 issue。取证若证实真实缺口且
  加固超出 workbench/ 白名单 → 立即中止转 pending-approval/blocked（WORKFLOW §4
  BUILD 中止条款），不在本轮扩面。

## 1. 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-31 10:32~10:45 核实）

1. **ready 队列亲核**：`grep -n "| ready |" docs/evolution/BACKLOG.md` 实跑输出恰
   1 行 = BK-0066（BACKLOG.md:85，debt/否/P2/S/ready/来源 T3）；状态计数复核
   `grep -o "| proposed |" → 0`、`doing/pending-approval/blocked → 均 0`——主池
   其余全终态（done/skipped/failed）。ready 唯一项即本项，类型 debt 非 doc、可心跳
   入选（doc 项治理日批处理规则不适用）。规则④常规优先序命中，无需转补题。
2. **选题占位互斥核查**：`ls .zcode/locks/items/` 实跑输出空（目录不存在或为空）
   ——无并行在途占用、无禁选项；派发提示未携带占位警告。BK-0066 本轮选为本轮项
   （原子占位 claim 归脚本 BUILD 派发，0073/0075 同机制；0068/0073 两起锁事故的
   根治待办在 ROADMAP.md:221-227 在案，归脚本侧排期，非本轮范围）。
3. **批复档案**：approved 无 / rejected 无 → 规则①（批复解锁）零建行零解锁、
   规则③零 skipped 改写。issue 面板两项维持不动（沿 0074 PRD §1.3 / 0075 PRD
   §1.3 连续同判先例）：
   - **#16**（BK-0014 扩展发现器 env 语义 ×2 + stdio 残余风险知悉，ADR-0023）：
     档案挂 needs-approval 标签，但 BK-0014 已于迭代 0071 终态 done（metrics.md
     0071 行 `item=BK-0014 result=done` 实查）且用户批复已消费（ROADMAP.md:169-171
     「#15/#16/#17 经用户本人评论批复后由 0069~0075 连续心跳收割」）——无既存门槛
     可解，零动作（面板标签滞后以 BACKLOG 终态为权威）；
   - **#12**（CI 像素门禁 s3 亚像素抖动）：属 golden/pixel-gate/CI 需批准射程，
     未获批维持待批准，本轮不自主处理（0045~0075 连续同判先例；处置口径已并入
     §0 非修宪轮条款作 gate 首跑预案）。
   二者均非 user-request，规则②零建行。
4. **侦察档案处置**（与派发档案一致，本会话零新采集义务）：
   - 残缺标记：`apps/server/src/tools.ts:138` browser stub 返回
     `{ error: 'not implemented', ... }` 系 ADR-0011 评估终态的**如实降级设计**
     （tools.ts:5 注释自证「"not implemented"，不伪造结果」），非缺陷不立项
     （0041~0075 连续同判在案）；`apps/server/package-lock.json:787` 系 integrity
     哈希内 "XXX" 字符巧合误报非标记；
   - 悬挂 run 探针 `[]` 空（零悬挂）；
   - 覆盖差集/文档漂移/dogfooding 系治理日（W45）产物，心跳不重复采集。
5. **BACKLOG 行勘误注（PM 级精化，非行改写）**：BK-0066 行备注「tests/smoke
   W 组扩断言或新组」中的「W 组」按 smoke 实况应为 **B 组**（workbench 端点组
   B01~B18，smoke-server.mjs:1742/1874/2039 三段组头实查；W 组系 workflows CRUD
   W01~W09，smoke-server.mjs:699-740，与 workbench 无涉）。本 PRD §4/§6 按 B 组
   口径定界；BACKLOG 行文字不改写（终态记账时 CLOSE 侧按惯例留痕即可）。

## 2. 背景与问题（证据现场复核，2026-10-31 本轮亲读工作树源码）

### 2.1 Mimosa 钩子两项 high 提示（留痕原文）

`iterations/0057/MERGE.md:100-104`（逐字）：

> **Mimosa 提交钩子提示（既有代码，非本轮 diff 引入，0055 轮已同源留痕）**：
> `apps/server/src/workbench/routes.ts:21` collectGitInfo 经 1 跳到达
> command-injection（high）；`routes.ts:76` collectTree 是 path-traversal
> 入口（high）。按钩子要求**明确告知用户**：属既有 workbench 代码（0056
> 合入），建议后续迭代立项审查。

该提示自 0055 轮起每次提交重复出现（0055/0069~0075 提交记录，BACKLOG.md:85 行内
证据链在案）——持续噪声须以**审计裁定**收敛：要么取证证实误报并文档化闭口，要么
发现真实缺口并最小加固。

### 2.2 设计机制现状（本轮逐 file:line 亲核，全部在位）

| 防线 | 锚点（本轮亲读） | 语义 |
| --- | --- | --- |
| E1 limit 整数门 | `routes.ts:17-20` | `Number.isInteger(n) && 1<=n<=100`，否则 400「limit 必须是 1-100 的整数」 |
| argv 数组零 shell | `git.ts:30` | `spawn('git', args, { cwd, stdio:[...] })`——args 数组形态、无 shell 选项，永不拼接命令行（git.ts:4-6 头注纪律 = ADR-0016 §3.4） |
| 只读命令白名单 | `git.ts:48/53/56` + `diff.ts:82` | rev-parse / status / log（E1）与 diff（E2）四命令；limit 经 `String(limit)` 仅作 argv 元素（git.ts:56） |
| 5s 超时强杀 | `git.ts:33,39` | setTimeout kill + killed 分支拒绝 |
| ref 字符白名单 | `diff.ts:26-27,48-50` | `REF_RE=/^[A-Za-z0-9._/@-]+$/` + REF_MAX=200 + 空串 400 + **`v.startsWith('-')` 选项注入拒绝** |
| path 防越界 | `diff.ts:34-37` / `tree.ts:41-44` | 双同构 `isWithinRoot`：`path.resolve(PROJECT_ROOT, input)` 归一后前缀比对，`../` 逃逸与绝对路径（win32 盘符/POSIX 根）同拒 |
| 锚定根常量 | `root.ts:17-18` | `PROJECT_ROOT` 模块级常量（模块加载即冻结，非进程 cwd；ADR-0016 §3.0） |
| tree 深度门 | `tree.ts:58-61` | depth 整数 1-6，否则 400「depth 必须是 1-6 的整数」 |
| tree 收敛面 | `tree.ts:34-35,112,140-142` | FOLD 四目录折叠占位 + ENTRIES_CAP=500 + `.git` 恒不入树 + 符号链接不追踪（lstat 判型，零环引用） |
| 校验/承载分离 | `routes.ts:35-58,65-85` | 三 handler 校验 400 直返 / not-repo·not-found 404 / 其余 500（细节进 logger 不进响应） |

**初判**：两条 high 提示的可达链均被上述机制截断——`routes.ts:21` 的
command-injection 依赖用户输入进入命令行字符串，而实际链路是
limit→整数门→`String(n)`→argv 元素→spawn 数组（无解释器）；`routes.ts:76` 的
path-traversal 入口被 `validateTreeQuery`→`isWithinRoot` 前缀校验 +
collectTree 内二次 resolve（tree.ts:78）+ 符号链接不追踪收口。**判误报可能性大**，
但按「防盲目改码、也防轻信」双纪律：以对抗取证矩阵 + 反演测试钉死闭口
（BACKLOG.md:85 立项目标原句）。

### 2.3 既有断言覆盖盘点（smoke-server.mjs B 组，本轮亲读）与增量面

已钉死（不重复建设）：B03 limit 负例 0/101/abc（:1782）；B04 非 git 目录探针 404
（:1841-1845）；B05 源扫描 {root,git,routes} /shell/i 零命中 + 超时形态 + 可写命令
零命中 + 三命令在场（:1856-1871）；B09 ref 负例 `-x`/`main;rm`/空串/`HEAD~1`/
deadbeef→两类 400 字面量（:1930 区段）；B10 diff path 越界 `../`/`../../`/`D:/`/
`/etc`（:1953 区段）；B12 源扫描扩 diff.ts（:1877-1878 组注 + `shell12===0`
断言）；B15 depth 负例 0/7/abc/2.5（:2121-2127）；B16 tree path 越界同四形态
（:2130-2143）；B17 404/折叠语义（:2145 区段）；B18 tree.ts 源扫描（spawn 零
命中 + fs 写面禁词 + .git/FOLD 字面量，:2160 区段）。

**增量面（本轮反演钉死的实际内容，六类）**：

1. **反斜杠逃逸形态**：`..\..\`（win32 分隔符变体）不在 B10/B16 负例表——
   `path.resolve` 在 win32 将 `\` 视分隔符，预期同拒 400，须钉死；
2. **换行/控制字符 ref**：`base=main%0Ax`（解码后含 `\n`，不在 REF_RE 字符类）
   预期 400——B09 未含此形态（换行注入是 command-injection 启发式的经典形态，
   恰对应 Mimosa 提示）；
3. **REF_MAX 边界**：200 字符通过 / 201 拒绝——边界值未断言；
4. **多值数组参数**：express 同名多值 query 为数组（`?path=a&path=b`、
   `?limit=1&limit=2`）——`typeof p !== 'string'`/`Number(array)` 两路语义预期
   400，未断言（tree.ts:53 / routes.ts:17 实现面）；
5. **E1 limit 语义取证**：`-1`、`2.5`、`' 20 '`（Number 宽松转换=20 放行）、
   `'1e2'`（=100 放行）等 Number() 语义边界——负例与「宽松放行属既有语义、
   文档化即可」的取证行须区分钉死 vs 记录；
6. **E2 path pathspec-magic 形态**：`:/x`、`:(top)` 等能通过 isWithinRoot
   （resolve 后落在根内）但携带 git pathspec 魔法语义——实测行为取证（预期
   git 报错或空结果、无越界读；是否值得新增 400 拒绝分支归审计裁定，不强预设）。

**源码锁增量**：B05/B12/B18 已扫 /shell/i 与命令写面，但未锁 **argv 装配形态**
本身——补「args 数组装配零模板字面量拼接、spawn 恒数组第二参」形态断言
（BK-0066 行「argv 零 shell 源码锁」落点）。

### 2.4 判定

两项 Mimosa high 提示预期均裁定误报（机制在位 + 既有断言已覆盖主干负例），本轮
价值 = ①把「看起来安全」升级为「矩阵取证 + 反演钉死的机器证明」；②补六类增量
形态与 argv 形态锁，使未来回归有哨兵；③审计报告闭口，消除每次提交的重复噪声
（或证实缺口并最小加固）。零契约、零依赖、零 env、零前端、零 golden。

## 3. 目标与范围（四段，BK-0066 行内定界逐条承接）

- **① 逐参数攻击面矩阵取证**：三端点 × 全部入参（E1 limit；E2 base/head/path/
  stat；E3 path/depth）逐格取证：恶意形态清单、进入路径（端点→校验→承载的
  file:line 链）、拦截点锚点、动态探针实测（状态码 + 响应字面量）、裁定
  （误报 / 加固）。Mimosa 两项 high 提示各有一个专门的端到端链路裁定段
  （§2.2 表为底稿，须以实测复核而非照抄）。
- **② 反演测试钉死**：§2.3 六类增量形态全部落 smoke 断言（B 组新增，编号顺延
  B19+；如实现轮判断新组更清晰亦可，断言 ID 不得与既有组冲突——PT 系
  BUG-0057-01 教训）+ argv 装配形态源码锁 + 关键校验点反演红绿双向（AC4）。
- **③ 审计报告**：`docs/workbench-security-audit.md` 落盘——矩阵表、Mimosa 提示
  逐条裁定、证据锚点 file:line、结论段、复测命令口径。
- **④ 条件性最小加固**：**仅当取证发现真实缺口才动码**；改动面白名单
  `apps/server/src/workbench/` 五文件内；加固不得改变既有契约字面量（出参键集、
  既有错误文案），新增拒绝分支（如 pathspec-magic 400）随审计报告裁定记录——
  响应字面量属端点承载面非 shared DEFS 契约（POLICY 自主区）；加固前后正常
  入参行为逐字段一致（AC6 行为一致性口径）。**若全误报：文档化结论即关账，
  零加固改动（加固非目标，防盲目改码）**。

### 非目标（out of scope）

- 不改 Mimosa 钩子及其规则（外部工具面，非本仓代码）；
- 不动 ADR-0016 端点契约定界（E1/E2/E3 出参键集与既有错误字面量）；
- 不新增 npm 依赖、env、出站网络类别、SSE/shared 契约；
- 不动前端三文件、golden、pixel-gate、CI；
- 不实现 browser MCP stub（tools.ts:138 系 ADR-0011 评估终态）；
- 不重构 workbench 模块结构（diff.ts isWithinRoot 与 tree.ts 私有同构实现的
  「不导出复用」决策是 0054 有意为之——避免扰动既有源扫描断言面，tree.ts:37-40
  注释明载，本轮不合并去重）。

## 4. 功能需求

- **REQ-0076-01 攻击面矩阵**：§3-① 的矩阵覆盖三端点七入参，每格有实测证据；
  矩阵中至少包含 §2.3 六类增量形态 + B 组既有形态回归类（引用断言 ID 即可，
  不重复建设）。
- **REQ-0076-02 增量负例断言**：§2.3 第 1~4 类（确定性预期 400）落断言；
  第 5 类区分「负例钉死」（-1/2.5）与「语义取证记录」（' 20 '/'1e2' 宽松放行，
  只记录不改动）；第 6 类（pathspec-magic）按实测取证落断言（若实测为良性语义
  则断言锁定该实测形态，若发现泄露面则转 §3-④ 裁定）。
- **REQ-0076-03 源码锁**：argv 装配形态断言（spawn 恒 `spawn('git', args)` 数组
  形态 + args 装配零模板字面量/零 `+` 拼接命令行）进 B 组源扫描段；反演可红。
- **REQ-0076-04 审计报告**：`docs/workbench-security-audit.md` 新增（§3-③ 内容
  五要素齐全；行数建议区间 150~300、硬性 ≤400 行——ADR-0014 389 行先例口径）。
- **REQ-0076-05 条件加固**：仅矩阵裁定出真实缺口时触发；触发时须在审计报告
  内含最小加固 diff 摘要与前后行为对照，且改动面不越 §5 白名单。

## 5. 受影响文件清单（skipSpec 内嵌——productFiles 白名单口径）

| 路径 | 动作 | 条件性 | 说明 |
| --- | --- | --- | --- |
| `tests/smoke/smoke-server.mjs` | 修改 | 必然 | B 组扩断言（B19+ 或新组）：六类增量负例 + argv 形态源码锁 + pathspec-magic 实测锁定；预期 +60~+150 行 |
| `docs/workbench-security-audit.md` | 新增 | 必然 | 审计报告（§3-③ 五要素；≤400 行） |
| `apps/server/src/workbench/git.ts` | 修改 | **条件** | 仅真实缺口时最小加固 |
| `apps/server/src/workbench/diff.ts` | 修改 | **条件** | 同上 |
| `apps/server/src/workbench/tree.ts` | 修改 | **条件** | 同上 |
| `apps/server/src/workbench/routes.ts` | 修改 | **条件** | 同上 |
| `apps/server/src/workbench/root.ts` | 修改 | **条件（预期零改动）** | 同上——锚定常量无入参面，预期不触发 |

机制件（productFiles 白名单外，随机制件提交）：`docs/evolution/iterations/0076/`、
`docs/evolution/STATE.md` 过程态、BACKLOG 过程改动（本轮 PLAN 零过程改动——ready
唯一项直接入选，无晋升/建行/改写）。

**禁区（零 diff 预期，提交级终判口径）**：`apps/web/**`、`packages/shared/**`、
`tests/golden/**`、`tools/pixel-gate/**`、`.github/**`、`package*.json`、
`docs/adr/**`（本轮不产出新 ADR——审计报告非架构决策，若取证颠覆 ADR-0016 定界
即中止转 needs-approval，不就地改 ADR）。

## 6. 验收标准（Given/When/Then）与验收命令口径

- **AC1 矩阵取证完整性**
  Given `docs/workbench-security-audit.md`，When 逐格核对矩阵，
  Then 三端点 × 七入参全覆盖；每格含恶意形态、进入路径 file:line、拦截点锚点、
  实测状态码与响应字面量、裁定；Mimosa 两项 high（routes.ts:21 / routes.ts:76）
  各有一个端到端链路裁定段，结论与实测一致（非照抄 §2.2 初判）。
- **AC2 增量负例钉死**
  Given smoke 主实例端点在跑，When 发送 §2.3 第 1~4 类形态
  （`..\..\`、`base=main%0Ax`、REF_MAX 200/201、`?path=a&path=b` 数组多值、
  `?limit=1&limit=2`），Then 各得契约内 400 与既有字面量一致，新增断言全绿；
  第 5 类负例（limit=-1 / 2.5）断言红绿钉死、语义取证行（' 20 '/'1e2'）记录于
  审计报告；第 6 类按实测落断言或转裁定，无未决项。
- **AC3 源码锁**
  Given workbench 源码，When 扩展源扫描跑通，Then argv 形态断言全绿；
  反演：临时把某 args 装配改为模板字面量拼接 → 扫描断言 FAIL → 逐字节还原 →
  复绿且 `git diff` 与反演前一致。
- **AC4 关键校验点反演红绿**
  Given 任一新钉断言守护的校验点（isWithinRoot / REF_RE / limit 整数门，
  任选其一即可），When 临时绕过（如恒 true / 放宽字符类），Then 对应断言 FAIL、
  smoke exit 1；还原后全绿、仓库零残留。
- **AC5 审计报告质量**
  Given 报告落盘，When 抽样核验，Then 锚点抽样 ≥8 组全部可开（file:line 命中）；
  结论段明确「两项 high 的最终裁定」；≤400 行；复测命令口径在文内可复制执行。
- **AC6 门禁与回归 + 行为一致性**
  Given 本轮改动面，When 在工作树根执行 `npm run build` + `npm run gate` +
  `npm test` + `npm run smoke:server`，Then build exit 0；gate 全绿 diffPx=0
  （W45 治理日体检口径 21 场景，weekly/w45-*.log；全程零 gate:update）；
  `npm test` 全绿；smoke 既有断言零回退 + 新增全过（W45 口径 203/0 基线，以当轮
  实跑为准）。**若发生条件加固**：加固前后各端点至少一组合法入参的响应逐字段
  一致（与演进前行为一致——工程演进类验收口径）。
- **AC7 改动面白名单**
  Given 产品提交，When `git show --numstat` 核对，Then 路径恰 §5 清单（必然面 +
  条件面）；§5 禁区清单零 diff；新增文件 ≤400 行；Conventional Commits 单一事项
  提交。

**验收命令口径**（工作树根执行，VERIFY 逐条留证据）：`npm run build` /
`npm run gate` / `npm test` / `npm run smoke:server`；反演类（AC3/AC4）以
篡改→红→逐字节还原→绿的闭环输出为证据。

## 7. 风险与预案

1. **pathspec-magic 实测行为不可预设**（AC2 第 6 类）：验收以「实测 + 文档化 +
   断言锁定实测形态」为准，不强预设 400；若实测暴露信息泄露（如 stderr 回显进
   响应——routes.ts:55/82 已证细节进 logger 不进响应，预期无）→ 归 §3-④ 裁定。
2. **Number() 宽松转换语义**（' 20 '/'1e2' 放行）：属既有语义，取证记录即可，
   不改动（改动即契约面变动，且无安全增益——上限 100 门仍在）。
3. **Mimosa 编辑钩子对安全措辞改动可能启发式拦截**（0020 先例）：warn 级放行
   继续；hard-block 按 0020 先例做对照实验存证并升级协调者裁决，禁止绕过钩子。
4. **B 组既有锚定不得扰动**：B07/B08 依赖固定提交对 ed2f8ed↔d880b62、B13~B18
   依赖主实例工作树形态——新增断言只增不改；既有断言一红即回查本轮改动。
5. **误报闭案的收敛标准**：若矩阵全误报，本轮产品面 = smoke 扩断言 + 审计报告
   两个文件；Mimosa 钩子提示是否消失不由本仓控制（钩子按自身规则扫描），验收
   只认审计报告的裁定与机器证明，不认「钩子不再提示」。
