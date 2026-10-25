# REPORT · 迭代 0028 · BK-0043 PTY 交互终端「安全世界设计」ADR 草案 SPEC 先行（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 13:00 前后
> 输入：`PRD.md` AC1~AC7 + `SPEC.md` §9 验收口径 + `JOURNAL.md` 移交说明
> （含 §3.1/§3.2 两处偏差提请裁定）。
> 环境：Windows（AI-WorkStation）· Node v24.21.0 · HEAD = 51b2ad8 ·
> 工作区含本迭代未提交产物（产品提交按工作流机制归脚本统一执行）。

## 0 · 总结论

**PASS（7/7 AC 全过，零缺陷，无需修复轮）。** 纯文档轮兑现：产品面恰
`docs/adr/0014-pty-terminal-security-world.md` 一文件纯新增（389 行 ≤400，
UTF-8 无 BOM 纯 LF），七要素成节、草案双位标注 + 授权链 + 依赖面另批声明
字面齐备；BACKLOG BK-0044/BK-0045 两行备注与 SPEC §8.4 权威字面量
**逐字全等（VERBATIM OK ×2，node 脚本 trim 后全等亲跑）**，状态列 proposed
不动、BK-9005 行零触碰；`apps/packages/tools/tests/.github/package*.json`
禁区 diff 恒 0 字节、lock 中 "pty" 计数 0（零代码/零依赖机器证明）。安全
设计 20+ 锚点与代码逐一相符无一杜撰（含 JOURNAL §3.1 行号偏移按代码事实
的 ADR 转写复核）；npm registry 五条调研事实本会话亲查全部命中。针对性
E2E：smoke:server 亲跑 **95 passed / 0 failed**（基线零漂移）+ 浏览器交互
回归抽查通过（节点库 16 节点/7 类目与 0027 先例一致、画布缩放正常）。
BUG 清单：空。

例外说明（派发指令预见的并行收尾情形未发生）：STATE.md `iteration` 仍为
0028（phase: BUILD），本报告按常规 VERIFY 路径产出，STATE 已由本轮按派发
指令改 phase=VERIFY。

## 1 · AC 逐条结论与证据

### AC1 · ADR 落盘与七要素完备 — PASS

命令与输出（本会话亲跑）：

- `ls docs/adr/0014-*.md` → 恰一文件 `0014-pty-terminal-security-world.md`
  （docs/adr/ 现行 0001~0013 + 本文件，编号顺延成立）；
- `wc -l` → **389 行** ≤400（AGENTS.md 硬性约定 4 达成；超出 SPEC §1 建议
  区间 280±60 上限 340 的原因 JOURNAL §4 已如实记载——附录 A 字面量逐字
  转写 ≈55 行系 SPEC §8.3 对 §6 预算 34 行的低估，AC1 硬性判据 ≤400 满足）；
- `grep -n "草案 · 待用户批准"` → `:3` 状态行命中，含「待用户批准（依赖与
  env 请批面——附录 A）/ 待实施轮消费」**双位标注**；`:6`「依赖面须另批、
  父项批复不自动覆盖」字面命中；`grep -n "2026-10-23T15:49:06Z"` →
  :5/:27/:284/:368 四处（授权链引用在案）；标题 :1 含「草案」二字；
- `grep -c "已批准"` → **0**（非功能要求 3 兑现，全文无批准态措辞）；
- EOL/BOM：`od -c` 首行字节 `# A D R - 0 0 1 4`（无 BOM）；`tr -cd '\r'
  | wc -c` → **0**（纯 LF）；`file` = UTF-8 text；
- 七要素成节可索引（`grep -n "^## "` 亲核）：§1 动机与现状证据（:25，①）·
  §2 进程模型与沙箱边界（:55，含 §2.1 拓扑三案 / §2.2 cwd 锚定与如实定级 /
  §2.3 同等强度对照表 / §2.4 资源限额，②）· §3 共享会话权限/审计面（:103，
  含三矩阵 §3.1~§3.3 + 推荐组合 + §3.4 端点族与流格式定稿，③）· §4 超时/
  生命周期/中止级联（:155，§4.1 文字状态机 / §4.2 run 正交 / §4.3 close
  幂等·孤儿防护，④）· §5 依赖与出站评估（:206，§5.1~§5.5 五面 + §5.6 调研
  记录 + §5.7 请批结论，⑤）· §6 附录 A 请批 issue 草案（:287，⑥）· §7
  BK-0044/BK-0045 实施定界（:344，⑦）+ 尾部不做范围收口。

### AC2 · 安全设计锚点真实可核 — PASS（20+ 锚点逐一亲核，无一杜撰）

按 ADR §1/§2.3 对照表引用逐条 Read/grep/sed 亲核：

| 锚点 | 核对结果 |
| --- | --- |
| `code.ts:50` spawn 三管道 / `:53` setTimeout(…,5000) 超时 kill / `:60`「执行超时（5s），已终止」 | 三锚点精确命中（code.ts 69 行） |
| `tools.ts:16` SANDBOX 锚定 / `:19-20`「路径越界：只允许访问沙箱目录」/ `:23` ensureSandbox / `:33` SQLITE_DB 派生 / `:34-35` MAX_ROWS/MAX_CELL | 全命中（175 行） |
| `guard.ts:33-56` assertPublicUrl（`:37` ALLOW_PRIVATE 逃生 + DNS 解析核验）/ `:59-62` guardedFetch / `:71` bocha / `:81` ddg / `:93` searxng / `:107-109` mcpFetch | **五出口齐验**（109 行） |
| `mcp/connection.ts:22-31` 五面接口（callTool 含可选 signal）/ `:35-36` 10s/30s / `:46-47` connectAttempted+closed 双标志 / `:77-83` close 幂等可重入 | 全命中（84 行） |
| `config.ts:29-34` rawEnv 白名单恰 15 key（`:33` 两 MCP env）/ `:39-40` TRUTHY/FALSY / `:51-74` zod / `:76-79` fail exit 1 / `:100-108` E9 交叉校验 | 全命中（129 行；E9 行段差异见 OBS-002） |
| `sessions.ts:3`「会话 = 与 run 正交的第一等资产」/ `:7-9` 复用 15 种事件 / `:12-13` 内存判活 BK-0011 教训 / `:34-36` sessionsById / `:56-63` stop 404 不区分 / `:77` 409 守卫 / `:167-176` abortActiveSessions | 全命中（176 行） |
| `server.ts:214-219` sessions 五路由 v1-only / `:229-252` shutdown 链 / `:235` 会话同批中止 / `:241` deadline 5s / `:242-243` 轮询不代删 / `:250` closeStore | 全命中（254 行） |
| `engine.ts:33` `const { wf, emit, ac } = ctx;` | 精确命中 |
| `store.ts:100-109` approval_audits DDL（reviewer/mode/verdict/reason 字段族） | 命中（文件恰 400 行贴线） |
| 根 `package.json:34-35` allowScripts `"better-sqlite3@12.11.1": true` | 命中 |
| PTY 零承载 `grep -rniE "node-pty|pty"` | exit 1 零命中（BRE 原式与 `-E` 交替式双跑均零；lock 与 apps/server/package.json 同零） |

- **对照表三条款强度评级逐条在位**（ADR §2.3 :87-91）：条款 1 guard 出站
  → 如实降级+声明；条款 2 文件限沙箱 → 如实降级+声明；条款 3 子进程+超时 →
  子进程=**同等强度**、超时=**同等强度·形态外推**；
- **code 节点 5s 一次性超时向长会话外推的明确结论在位**（§2.3 条款 3）：
  三闸门 = idle 超时（PTY_IDLE_TIMEOUT_MS）+ 最大会话时长硬顶
  （PTY_MAX_SESSION_MS）+ 显式停止（用户/停机），数值 env 承载，且如实标注
  「提案值而非既有先例外推」+ 量级论证（guard 12-20s/connection 10s/30s/
  code 5s/sessions 无硬顶参照系）——PRD AC2「含明确结论」兑现。

### AC3 · 依赖评估与请批结论成文 — PASS

- **五面齐备**（§5.1~§5.5）：选型（node-pty ^1.1.0 推荐 + @homebridge fork
  备选 + 手写绑定否决 + @lydell/pty 不存在，三案一不存在）· native 构建
  （allowScripts 纪律 + Node 大版本重编 + prebuild 被墙镜像先例，better-sqlite3
  教训对照）· CI 影响（windows-latest better-sqlite3 同链已证 + 首次接入
  实测义务 + lock 变化预告）· 出站类别（**零新类别结论 + 残余风险声明分列
  不混同**）· env 承载（四项 PTY_* 表 + 校验口径 + 常量内嵌否决理由）+
  前端 @xterm/xterm ^6.0.0 补充评估（旧名 xterm 弃用）；
- **调研记录表**（§5.6）五条含来源与「BK-0044 实施 SPEC 必须复核时效」义务
  + 「不作转写日更新」快照声明；
- **请批结论 = 有需批准面**（§5.7）四项分列（依赖两项/env 四项/残余风险
  两处/实施顺序）；**附录 A 五要素齐备**（§6）：标题 / 背景（正文首段含
  授权边界） / 请批面清单①~⑤ / 授权范围边界（「父项批复承继的是修宪实施
  授权，不自动覆盖本清单」）/ 批复语义（「批准」=授权①~③+确认④（BK-0044
  转 ready）；「驳回」=维持 proposed、ADR 归档未采纳）；
- **零依赖边界机器证明**：`grep -c "pty" package-lock.json` → **0**；
- **npm registry 事实复核**（本会话亲查 registry.npmjs.org，2026-10-25，
  与 SPEC 调研同日）：node-pty latest=1.1.0 / MIT / deps 恰
  `{"node-addon-api":"^7.1.0"}` / install=`node scripts/prebuild.js ||
  node-gyp rebuild` **逐字一致**；@homebridge 0.14.1 / engines
  `>=20.0.0 <27.0.0` / 两依赖一致；@lydell/pty → **HTTP 404**；@xterm/xterm
  6.0.0 / MIT / deps undefined（零依赖）；xterm 5.3.0 弃用消息
  "This package is now deprecated. Move to @xterm/xterm instead."
  **逐字一致**——ADR §5.6 五条事实全部命中，零杜撰。

### AC4 · 定界回写 VERBATIM 一致 — PASS

- node 比对脚本（临时脚本 `.tmp-verify-ac4.mjs`，验后已删）提取 SPEC §8.4
  两段权威字面量与 BACKLOG 两行第 9 列（备注列）`trim()` 后全等：
  **`BK-0044: VERBATIM OK` / `BK-0045: VERBATIM OK`**；
- 其余列不动：`id=BK-0044 status=proposed source=issue#5` /
  `id=BK-0045 status=proposed source=issue#5`（split('\|') 字段校验）；
- ADR §7 与 SPEC §8.4 **语义相等**（§8.5 判据）：ADR §7 :346-348 互指句
  「权威字面量单一载体 = SPEC.md §8.4 …… ADR §7 定界与迭代 0028 SPEC §8.4
  字面一致，四要素逐项语义相等」在位；两子项**受影响文件/验收口径/依赖
  关系/晋升条件**四要素逐项核对语义相等（BK-0044 :350-366 / BK-0045
  :367-384）；
- `git diff --stat docs/evolution/BACKLOG.md` → **恰 4 行替换（+4/−4）**：
  BK-0033/BK-0034（PLAN 轮晋升 ready 预期存量差异）+ BK-0044/BK-0045（本轮
  回写）；**BK-9005 行不在 diff 中 = 逐字不动**。

### AC5 · 白名单与零代码机器证明 — PASS（工作区级；提交级归 CLOSE）

- `git status --porcelain` → 恰 4 条：`?? docs/adr/0014-*.md`（产品件
  untracked）+ `M docs/evolution/BACKLOG.md` + `M docs/evolution/STATE.md`
  （机制件）+ `?? docs/evolution/iterations/0028/`（机制件目录）——白名单
  外路径零出现；
- `git diff -- apps packages tools tests .github package.json
  package-lock.json | wc -c` → **0 字节**（禁区恒空）；
- `grep -c "pty" package-lock.json` → 0（零依赖引入 = lock 零变化）；
- **产品提交尚未落盘**（HEAD = 51b2ad8）：`git show --numstat <产品提交>`
  提交级终判按 JOURNAL §4 既定口径与 0018/0021/0022 先例归 **CLOSE 于归档
  提交后复核**（工作流机制：git 操作由脚本统一执行，VERIFY 先于提交时点）；
  工作区级前置证明如上全过。

### AC6 · 纯回归面全绿 — PASS

- **build / gate / test**：工作流脚本统一执行并通过（派发指令明载「已由
  脚本运行且通过，不要重复跑全套」；SPEC §9 总门禁条款「VERIFY 不必复跑
  全套，REPORT 引用门禁结论」——0012/0014/0016/0017/0019/0023~0027 先例）；
- **smoke:server**（派发指令未担保项，VERIFY 按 test-manager 后端验证职责
  针对性补跑）：`npm run smoke:server` → **`==== smoke:server：95 passed /
  0 failed ====`**，exit 0——与 metrics 0026/0027 行基线 95/0 完全一致零
  漂移；本轮零代码理论零漂移成立，且 V09 时点性假红未出现（判据 0 failed
  达成）。

### AC7 · 指针抽样可开 — PASS（实际 16 组 30+ 指针，远超下限 ≥5）

SPEC §9 建议抽样池全数核验（详见 §1 AC2 表 + 以下补充）：

1~10. §1 AC2 表列代码锚点十组（code/tools/guard/connection/config/sessions/
server/engine/store/package.json）全命中；
11. BACKLOG 四行：BK-0043（:56）/BK-0044（:57）/BK-0045（:58）/BK-9005
（:76，批复承继 2026-10-23T15:49:06Z + 「新依赖/出站类别须另开
needs-approval……父项批复不自动覆盖」拆分口径在案）；
12. **issue#5 链**：`gh issue view 5` → number=5、state=**OPEN**（符合
「关单留 BK-0045 终轮」编排）、标题「【待批准】BK-9005 · 交互式 PTY 终端
节点（用户与 agent 共享 shell 会话）」匹配；
13. ADR-0012：§6.1（:130-147）「子进程网络行为不可控（残余风险声明）」
先例内容核实（ADR-0014 所引「stdio 同型」口径属实）、附录 A（:237）、
283 行；
14. ADR-0013：297 行（头部状态块体例对齐对象，SPEC §2.2 所载行数一致）；
15. ROADMAP.md:184-190「SPEC 四连先行：BK-0032 → BK-0043 → BK-0035 →
BK-0039（0043 提前系因 BK-9005 链含外部依赖审批门控……）」+ :205-209
「下一个预期新批项 = BK-0043 SPEC 产出的 PTY 依赖/出站清单（若需）」逐字
在位；
16. npm registry 五条事实（见 AC3）。

## 2 · 针对性 E2E（test-manager 职责；纯文档轮运行时零影响证明）

- **后端启动**：`npm start`（后台）→ 构建链全过（shared tsc + web vite
  65 modules + server tsc）→ 服务器就绪日志「SQLite 存储就绪（WAL）」
  「AgentFlow server 启动 → http://localhost:3000」；
  `curl /api/v1/health` → `{"ok":true,"engine":"agentflow-server","node":
  "v24.21.0","provider":{…已连接 DeepSeek…}}` HTTP 200；
- **页面加载**（IAB 浏览器）：title「AgentFlow · 智能体工作流原型」；
  DOM 不变量在位：`#viewport`/`#rail`/`#sidebar`/`#side-body`/`#tabsbar`/
  `#floatbar`（evaluate id 清单亲核）；`.node`=4 画布节点；toast 函数在位；
  底部日志「⚡ 执行后端已连接 · Vercel AI SDK 7 · Node v24.21.0 · 已连接
  DeepSeek（OpenAI 兼容端点）」；
- **节点库清单**（导航 `data-stab="nodes"` 按钮坐标点击展开）：
  **`.lib-node`=16 / `.lib-cat`=7**——16 节点逐一列出（触发器/用户输入/
  LLM 对话/提示词模板/知识库检索/网页搜索/HTTP 请求/代码执行/消息通知/
  条件分支/循环/延时等待/合并/直接回复/变量赋值/人工审批），**无 agent
  条目**（BK-0033 未实施，符合预期）——与迭代 0027 VERIFY 先例
  .lib-node=16/.lib-cat=7 一致，**节点库清单不变**；
- **画布缩放交互**：点击右下工具条「＋」→ `#canvas-stats`
  「节点 4 · 连线 0 · 100%」→「节点 4 · 连线 0 · **120%**」（命令式画布
  响应正常）；
- 附注（非缺陷）：初始态 `#side-title` 文本「节点库」为 `Skeleton.tsx:63`
  静态骨架初始值（`railTab=null` 时 `#side-body` 空、`renderSidebar()` 未
  执行，app.js:298 `if(!railTab) return;`）——点击导航按钮后正常渲染，
  系既有设计行为；
- E2E 后清理：服务器进程（PID 38108）已终止、端口 3000 已释放（探针
  HTTP 000）、临时比对脚本已删除、浏览器 tab 保留（不属仓库状态）。

## 3 · BUILD 移交事项裁定（JOURNAL §3.1/§3.2 偏差）

- **§3.1 server.ts 停机链行号偏移——认可（事实性修正非技术结论改写）。**
  本会话亲核代码：`:241 const deadline = Date.now() + 5000;`、`:242-243`
  轮询体、`:250 closeStore()`——SPEC §2.2/§6.3 所写 `:243/:249` 确系行号
  偏移；ADR §1/§4.3 按代码事实转写为「:241-243 5s 宽限轮询」「:250
  closeStore」**正确**（若照抄 SPEC 行号反而构成 AC2 杜撰）。沿迭代 0027
  JOURNAL §3.1「按代码事实转写」先例；PRD AC7 判据「file:line 或行段
  射程内命中」两种引用均成立。
- **§3.2 SPEC §8.4「ADR-0014 §6 定稿」节号与 §3 章节骨架互斥——认可
  （等价机制处置；根因系 SPEC 自身内部不一致，非 BUILD 缺陷）。** 核实：
  SPEC §3 骨架表定 ADR §6 = 附录 A（:150-151「§6 附录 A · 请批清单五要素
  字面量」）而流格式归「ADR §3 尾部」承载，SPEC §8.2 亦自述「ADR §3
  尾部/§7 引用」；但 SPEC §8.4 BK-0045 权威字面量内嵌「（ADR-0014 §6
  定稿）」。BUILD 三步处置全部落地：① BACKLOG 逐字照抄 §8.4（AC4 VERBATIM
  OK 亲证）；② ADR 流格式定稿落 §3.4（:137，与 §3 骨架一致）；③ ADR §7
  补互指句（:376-378「BACKLOG 行内『ADR-0014 §6 定稿』为迭代 0028 SPEC
  §8.4 字面量既定表述，所指即该定稿内容」）。§8.5 判据「四要素逐项语义
  相等」不涉节号——VERBATIM 语义不受影响。ADR-0014 §6 实为附录 A，读者
  经互指句可无损定位。

## 4 · 缺陷清单

**空。** 观察项两条（OBS，非缺陷，记档）：

- **OBS-001**：SPEC 存在两处内部不一致（§2.2/§6.3 server.ts 行号偏移 +
  §3 骨架与 §8.4 节号互斥），BUILD 均按「代码事实/等价机制」处置并记
  JOURNAL §3，经 VERIFY §3 逐条裁定认可。SPEC 已随归档提交定稿，不改写；
  若 BK-0044 实施 SPEC 复用本 SPEC 素材，注意以 ADR 转写后行号为准。
- **OBS-002**：E9 交叉校验行段引用差异——ADR §5.5 写「config.ts:100-108」
  （含 :100 注释行），SPEC §7.5 写「:101-108」（纯代码体）。代码实测
  :100 为注释、:101-108 为代码体，两种引用均在射程内语义等价（AC7 判据
  满足），非杜撰。
- 另记（非观察项）：AC5 提交级 `git show --numstat` 证明因产品提交时点
  在 VERIFY 之后（工作流机制）归 CLOSE 复核——与 0018/0021/0022 先例
  同款既定流程，非本轮缺口。

## 5 · 移交 CLOSE

- **BK-0043 置 done**；产品提交恰 `docs/adr/0014-pty-terminal-security-
  world.md` 一路径（+389/−0）预期——CLOSE 于提交后 `git show --numstat`
  复核（AC5 终判）+ 禁区 diff 复跑；
- **issue#5 仅发进度回执不关单**（关单留 BK-0045 链终轮，PRD 批次编排
  在案）；BK-0044/BK-0045 状态全程 proposed 不动；
- **持 ADR-0014 §6 附录 A 字面量开 needs-approval issue**（沿 BK-0027→#10
  先例；脚本无该步骤时由协调者补开）——请批四项：node-pty ^1.1.0 +
  @xterm/xterm ^6.0.0 两依赖 / PTY_* 四 env / 残余风险知悉 / 实施顺序；
  获批前 BK-0044 不转 ready；
- metrics 行追加建议：结果 done / gate 8 场景（脚本侧）/ test 契约（脚本
  侧）/ smoke 95/0（VERIFY 亲跑）/ 行数差 +389（ADR 单文件）/ bug 0；
- STATE.md 已按派发指令更新：phase=VERIFY（本报告落盘即 VERIFY 产物）。
