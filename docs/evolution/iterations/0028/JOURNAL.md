# JOURNAL · 迭代 0028 · BK-0043 PTY 交互终端「安全世界设计」ADR 草案 SPEC 先行（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 12:39
> 输入：`PRD.md`（REQ-0043-01~06 / AC1~AC7；触UI=否、纯文档轮、skipSpec=false）+
> `SPEC.md`（§0 needsAdr=false——本项产品即 ADR 草案，BUILD 按 SPEC §3~§8 转写
> 落盘，无自主设计决策空间；§1 受影响文件清单；§2.1 角色分工与「矛盾即中止」
> 义务 + §2.2 锚点清单；§8.3 附录 A 五要素字面量；§8.4 定界与 BACKLOG 回写权威
> 字面量；§9 验收口径）。
> 本轮零代码 / 零依赖 / 零 env / 零出站 / 零 shared 契约 / 零 UI / 零 golden：
> 未对 `apps/**`、`packages/**`、`tests/**`、`tools/**`、`.github/**`、根/子包
> package.json / package-lock.json 执行任何写操作（全程只读核实代码锚点）。
> 完整门禁（build / gate / test / smoke:server）与 git 提交由脚本统一执行，BUILD
> 未自行运行。STATE.md 已按派发指令更新：`phase: SPEC → BUILD`、
> `updated: 2026-10-25 12:39`。

## 1. 改动清单（产品提交面 = AC5 白名单一路径；STATE/JOURNAL 为机制件）

| 文件 | 净改动 | 改动内容 |
| --- | --- | --- |
| `docs/adr/0014-pty-terminal-security-world.md` | **纯新增 389 行**（≤400 硬性上限达成；UTF-8 无 BOM、纯 LF，`file`/`od`/CR 计数亲核） | 按 SPEC §3~§8 逐节转写：头部状态块（:3 状态行字面 = SPEC §3 规定文本，含「草案 · 待用户批准（依赖与 env 请批面——附录 A）/ 待实施轮消费」双位标注 + 授权链 issue#5 承继 2026-10-23T15:49:06Z + 「依赖面须另批、父项批复不自动覆盖」）+ 显著声明 → §1 动机与现状证据（issue#5 链 + 立项语兑现 + 差异化空白带 + 安全素材地基四条 + PTY 零承载 grep 证明）→ §2 进程模型与沙箱边界（拓扑三案表 / cwd 锚定与如实定级 / AGENTS 硬性约定 3 同等强度对照表三行三档评级 / 资源限额面）→ §3 共享会话权限审计（双写方标识 / 审计留痕 / 危险命令三矩阵 + 推荐组合 + §3.4 端点族与流格式定稿）→ §4 生命周期（文字状态机六迁移 / run 正交与注入级联 / close 幂等·孤儿防护·启动扫尾）→ §5 依赖与出站五面（选型三案+一不存在 / native 构建对照 better-sqlite3 教训 / CI 影响 / 出站零新类别结论 / env 承载四项 + @xterm/xterm 评估 / 调研记录五条快照 + §5.7 请批结论）→ §6 附录 A issue 草案字面量（SPEC §8.3 逐字转写）→ §7 BK-0044/BK-0045 实施定界压缩索引（权威字面量指回 SPEC §8.4）+ 不做范围 |
| `docs/evolution/BACKLOG.md` | 2 行备注列原地替换（随归档提交；本轮工作区 diff 含 PLAN 轮既有 2 行晋升改写） | BK-0044（:57）/ BK-0045（:58）两行备注列替换为 SPEC §8.4 字面量**逐字粘贴**（node 脚本回读比对 VERBATIM OK ×2）；其余列（含状态 `proposed`）逐字未动（split('\|') 字段校验 + 状态列核验）；BK-0043 状态流转归脚本/CLOSE 未碰、BK-9005（:76）逐字不动 |

## 2. SPEC 蓝图 vs 代码现状复核（BUILD 义务，SPEC §2.1「矛盾即中止」）

复核方法：SPEC §2.2 锚点清单 + ADR 转写所引全部指针本会话 Read / grep / wc /
ls 逐一亲核。**结论：技术结论与代码现状无矛盾，无需中止；发现 2 处 SPEC 内部
引用不一致（行号偏移 / 节号互指），均以等价机制处置并记 §3。**

命中的指针（超出 AC7 下限 ≥5 条，全部命中）：

- `code.ts`（69 行 wc -l）：`:50` `spawn(cmd, argv, {stdio:['pipe','pipe','pipe']})`、
  `:53` `setTimeout(..., 5000)` 超时 kill、`:60` 超时语义「`${lang} 执行超时
  （5s），已终止`」——三锚点精确命中；
- `tools.ts`（175 行）：`:16` SANDBOX 常量、`:19-20` safePath 越界拒绝「路径
  越界：只允许访问沙箱目录」（`:20` throw 行）、`:23` ensureSandbox、`:33`
  SQLITE_DB 派生锚定、`:34-35` MAX_ROWS/MAX_CELL 限幅族；
- `guard.ts`（109 行）：`:33-56` assertPublicUrl（`:37` ALLOW_PRIVATE 逃生）、
  `:59-62` guardedFetch、`:71` bochaWebSearch / `:81` ddgHtmlSearch / `:93`
  searxngSearch、`:107-109` mcpFetch——五出口齐验；
- `mcp/connection.ts`（84 行）：`:22-31` McpConnection 五面接口（callTool 含
  可选 signal）、`:35-36` CONNECT 10s / CALL 30s、`:46-47`
  connectAttempted/closed 双标志、`:77-83` close 幂等可重入；
- `config.ts`（129 行）：`:29-34` rawEnv 白名单恰 15 key（`:33`
  MCP_HTTP_SERVERS/MCP_STDIO_SERVERS）、`:39-40` TRUTHY/FALSY、`:51-74`
  EnvSchema zod、`:76-79` fail 通道退出码 1、`:100-108` E9 跨 env 交叉校验；
- `sessions.ts`（176 行）：`:3` 头注「会话 = 与 run 正交的第一等资产」、
  `:7-9`「复用现有 15 种 SSE 事件承载……零新增契约」、`:12-13`「活动判活
  只用内存注册表——进程崩溃后 DB 残留不可信，BK-0011 教训」、`:34-36`
  sessionsById、`:56-63` sessionStopHandler（404 不区分）、`:77` 409 守卫、
  `:167-176` abortActiveSessions / activeSessionCount；
- `server.ts`（254 行）：`:215-219` sessions 五路由（`:214` 注释「仅注册
  v1」）、`:229-252` shutdown 链、`:235` abortActiveSessions 同批并入、
  `:241` deadline 5s（宽限）、`:242-243` 轮询不代删、`:250` closeStore——
  **:241/:250 与 SPEC §2.2 所写 :243/:249 有 1-2 行偏移**，见 §3.1；
- `engine.ts`：`:33` `const { wf, emit, ac } = ctx;`（ctx.ac 解构）；
- `store.ts`（400 行 wc -l，恰贴 AGENTS.md 硬性约定 4 阈值）：`:100-109`
  approval_audits DDL（reviewer/mode/verdict/reason 字段族）、`:199-201`
  insertApprovalAudit prepared statement；
- 根 `package.json:34-35`：allowScripts `"better-sqlite3@12.11.1": true`；
- `gate.mjs`：`grep -c "id: 's"` = 8（SCENARIOS 恰 8 项 s0~s7）；
- **PTY 零承载**：`grep -rni "node-pty|\bpty\b" apps/server/src package.json
  apps/server/package.json` → exit 1 零命中（BUILD 会话亲跑，ADR §1 引用）；
- `docs/adr/` ls 亲核现行 0001~0013 → 0014 编号顺延成立；ADR-0012（283 行）
  §6.1 残余风险声明 + 附录 A 五要素样板、ADR-0013（297 行）头部状态块体例
  （对齐对象）；
- `BACKLOG.md`：BK-0043（:56）/BK-0044（:57）/BK-0045（:58）/BK-9005（:76，
  批复承继 2026-10-23T15:49:06Z）四行亲读，拆分口径与授权链在案。

## 3. 实现期偏差记录

### 3.1 SPEC §2.2/§6.3 server.ts 停机链两处行号偏移（按代码事实转写）

SPEC §2.2 写「:243 5s 宽限 deadline …… :249 closeStore」，§6.3 写「5s 宽限
（:243）」；本会话亲核 server.ts 实际为 `:241` `const deadline = Date.now() +
5000;`、`:250` `closeStore()`（:242-243 为轮询体）。属行段内偏移（PRD AC7
判据「file:line 或行段射程内命中」仍成立），技术结论零矛盾。处置：ADR §1/§4.3
按代码事实转写为「:241-243 5s 宽限轮询」「:250 closeStore」（沿迭代 0027
JOURNAL §3.1「按代码事实转写」先例——若照抄 SPEC 行号，VERIFY AC2/AC7 逐条
对照代码反而判 ADR 杜撰）。

### 3.2 SPEC §8.4 BK-0045 字面量「ADR-0014 §6 定稿」与 §3 章节骨架内部不一致（互指说明处置）

SPEC §3 章节骨架表定 ADR §6 = 附录 A（流格式定稿归「ADR §3 尾部」承载，
SPEC §8.2 自述「ADR §3 尾部/§7 引用」）；而 SPEC §8.4 BK-0045 权威回写字面量
内嵌「SSE 契约护栏=……（ADR-0014 §6 定稿）」。两处节号互斥。处置（沿迭代
0025 SPEC 内部不一致等价机制处置先例）：① BACKLOG 回写**逐字照抄 §8.4**
（权威字面量单一载体，AC4 与 §8.4 逐字比对是硬验收，不做任何改写）；② ADR
流格式定稿按 §3 骨架落位 **§3.4**；③ ADR §7 SSE 护栏段补一句互指说明
（「BACKLOG 行内『ADR-0014 §6 定稿』为迭代 0028 SPEC §8.4 字面量既定表述，
所指即该定稿内容」）。§8.5 判据「四要素逐项语义相等」不涉该节号（受影响
文件/验收口径/依赖关系/晋升条件四要素与节号无关）。提请 VERIFY 裁定。

### 3.3 其余零偏差

ADR 七要素、§2.3 对照表三行三档评级、§3 三矩阵与推荐组合、§4 状态机六迁移、
§5 五面与调研记录五条（**照录 SPEC §7.6 的 2026-10-25 快照，不更新为转写日
新值**——SPEC §11 风险 7 明定）、§6 附录 A 字面量（SPEC §8.3 逐字转写）、
BACKLOG 两行回写（§8.4 逐字）均无改动。标题按 PRD AC1「标题与状态标注含
『草案』字样」补「草案」二字（ADR-0012/0013 先例标题无草案字样，但 PRD AC1
明文要求，补齐使 PRD/SPEC 两口径同时满足）。

## 4. 自测与边界核验（文件级；门禁四命令归脚本）

- `wc -l docs/adr/0014-pty-terminal-security-world.md` → **389**（≤400 ✓；
  超出 SPEC §1 建议区间 280±60 上限 340 的说明：附录 A 字面量逐字转写本身
  ≈55 行（SPEC §8.3 给 §6 的预算仅 34 行系低估）+ §2.3 对照表/§3 矩阵为 SPEC
  定稿内容不可压缩；AC1 硬性判据 ≤400 达成，PRD 非功能要求 1 同判）；
- `grep -n "草案 · 待用户批准"` → :3 状态行命中，含双位标注 + 授权链
  2026-10-23T15:49:06Z +「依赖面须另批、父项批复不自动覆盖」字面（AC1）；
  标题含「草案」；全文无「已批准」字样（非功能要求 3：`grep -c "已批准"` = 0）；
- EOL/BOM：`file` = UTF-8 text 无 BOM 标记、首三字节 `# A`（od 亲核）、
  CR 计数 0（纯 LF，非功能要求 4）；
- BACKLOG 回写 VERBATIM：node 脚本提取 SPEC §8.4 两段字面量与 BACKLOG 两行
  备注 `trim()` 后全等 → `VERBATIM: OK ×2`；两行状态列仍 `proposed`
  （split('\|') 校验）；BK-9005 行未触碰；
- 产品白名单外零改动：`git status --porcelain` 仅 `docs/adr/0014-*.md`
  新增 + `docs/evolution/{BACKLOG,STATE}.md` 修改 + `iterations/0028/`
  未跟踪（PLAN/SPEC/BUILD 机制件），`apps/**`、`packages/**`、`tools/**`、
  `tests/**`、`.github/**`、package.json / package-lock.json 零出现
  （零依赖引入 = lock 零变化的机器前置证明，AC5 终判归 VERIFY 于提交后执行）；
- 未运行（归脚本统一执行，本 JOURNAL 不代报）：`npm run build` / `npm run
  gate` / `npm test` / `npm run smoke:server`；`npm run gate:update` 全程
  禁止（非修宪轮，POLICY 禁止区）——未运行、未接触 golden 任何字节。

## 5. 移交说明

- VERIFY 按 SPEC §9 执行：AC1（文件/行数/七要素/草案双标注）、AC2（对照表
  逐条对照 §2 锚点清单 + 5s 超时外推三闸门结论在位）、AC3（五面齐备 + 调研
  记录含复核时效义务 + 请批结论四项分列 + 附录 A 五要素）、AC4（两行
  VERBATIM——本 JOURNAL §4 已载 node 全等比对，VERIFY 复跑；ADR §7 与 §8.4
  语义相等 + BK-9005 行不动 + BK-0033/0034 晋升为 PLAN 轮预期存量差异）、
  AC5（产品提交恰一路径 +N/−0 + 禁区 diff 恒空 + lock 零变化）、AC6（门禁
  四命令，脚本侧）、AC7（指针抽样 ≥5——§2 清单可作抽样池；建议含
  server.ts :241/:250 实际行号，见 §3.1）、手动 E2E 点位（非阻塞）。
- §3.1/§3.2 两处偏差提请 VERIFY 裁定（均属事实性修正 / 等价机制处置，非
  技术结论改写；若判不认可，回退方案 = ADR 恢复 SPEC 原行号/删互指句各一行
  级改动，不影响其余内容）。
- CLOSE 注意：BK-0043 置 done；issue#5 仅发进度回执**不关单**（关单留 BK-0045
  链终轮）；BK-0044/0045 状态全程 proposed 不动，转 ready 唯一入口 = 附录 A
  needs-approval issue 获用户批复（开 issue 归脚本/协调者持 ADR 附录 A 字面量
  执行，沿 BK-0027→#10 先例）；npm 事实时效复核义务在 BK-0044 实施 SPEC。
