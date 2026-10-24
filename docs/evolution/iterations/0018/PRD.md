# PRD · 迭代 0018 · BK-0031 BK-0021 先行：NDP 迁移前等价基线快照 + 实施轮 SPEC + needs-approval issue 草案

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 17:46
> 来源：BACKLOG BK-0031（P1 / refactor / S / ready / 触UI=否，来源 T5；2026-10-24
> 第三次周度治理为解阻 BK-0021（NDP 目录制迁移）而立的先行项，`BACKLOG.md:36`）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · 里程碑 M3「智能体工作台 UI」的
> 协议前置链头——BK-0031 → 用户批准 issue → BK-0021 实施轮修宪 → BK-9003/9005/
> 9002 依 NDP 定义新节点（`ROADMAP.md:145-155,166-169`）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 17:3x~17:46 核实）：
> ① **批复项无新动作且现存批复项全部顺延**——档案「approved：无」与 BACKLOG 实况
> 一致（七项批复已于 0011 轮落 ready，其中 BK-0026/0025/9001 已 done）。余下批复
> ready 项 BK-9002~9005（P0/L/触UI=是）顺延论证本轮复核仍成立（0016/0017 PRD
> 先例）：BK-9002/9003/9005 前置 BK-0021（NDP）未竟——其先行项 BK-0031 正是本轮
> 所选；BK-9004 前置 BK-0016 已 done 但为 L 项且「拆分排序待下个治理日」
> （`ROADMAP.md:154-155`，10-25 周日）——心跳抓取即夹带拆分、违反「一次迭代
> 只做一件事」→ 顺延。② **user-request 无**——本轮档案 issue 面板仅含
> needs-approval 五项（#2~#6），无 user-request 条目，无建行、无 uiIssueNumbers；
> #6 open 未批复维持待批准区不建行、不催办、不代批。③ rejected 无。④ **常规
> 选题取 BK-0031**——治理日解阻链明示心跳选题第二顺位「0017→BK-0027 →
> **0018→BK-0031** → 0019→BK-0011 → 0020→BK-0008」（`weekly/43.md:316`、
> `ROADMAP.md:166-169`）；BK-0027 已于迭代 0017 done，BK-0031 为批复项顺延后
> 非 doc ready 队首（P1/S，类型 refactor 非 doc、非触 UI；主池表序在 ready 项中
> 居首 `BACKLOG.md:36`）。与最近 3 次迭代重叠面核对：0017=纯 docs（ADR-0012）、
> 0016=approval-review/handlers/store/smoke、0015=sessions/store/server/smoke——
> 本轮改动面为**新增快照资产 + 新增 docs SPEC + 根 .gitattributes + BACKLOG
> 备注**，对三迭代全部代码触点零重叠。

## 结论

**建议做（本迭代即做）**：一句话理由——T5-M3 工作台 UI 四项（BK-9002~9005）
全部被 BK-0021（NDP 节点定义目录制迁移）阻塞，而 BK-0021 被 POLICY 从严条款
钉死「实现轮先开 needs-approval issue 附等价性证据」（`docs/node-definition-
protocol.md:619-620` §10 验收 9），等价性证据的第一块承重墙就是**迁移前全量
结构快照**（§10 验收 1：`JSON.stringify(NODES, null, 2)` 键序原样入库，迁移后
逐字节比对——现行契约测试对 `desc/kw/caps 值/min·max·step/端口内容` 零断言，
`contract.test.mjs:12-19` 对 name/icon 仅 truthy）。本迭代把快照资产、实施轮
SPEC、needs-approval issue 草案三件先行产物一次落齐：零 `packages/shared/src`
源码改动、零依赖、零 UI，解阻 BK-9002~9005 全线修宪链。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为 `packages/shared/test/nodes.baseline.json`（**新增**快照资产，非
   源码、非测试逻辑）、`docs/node-definition-protocol-migration-spec.md`
   （**新增**文档）、`.gitattributes`（**新增**根文件，仅一条 EOL 钉死规则）、
   `docs/evolution/BACKLOG.md`（BK-0021 行备注指针回写）；`packages/shared/src/**`、
   `apps/**`、`tools/**`、`.github/**`、`package.json`/lock 零字节改动——
   视觉 / DOM 结构 / 交互三层与 golden 基线均不接触。
2. POLICY 校验：测试与回归基建（快照资产）+ 文档产出 + 侦察与立项（BACKLOG
   维护）——**自主区**（BACKLOG BK-0031 行内治理日已判定「自主区」，快照零
   packages/shared 源码改动）。SPEC/issue 草案规划的「未来 packages/shared DEFS
   重组」全部只以**文字方案**存在：BK-0021 维持 proposed，转 ready 唯一条件 =
   issue 获用户批复；本迭代不动 `nodes.ts` 一行代码。
3. **DEFS / SSE 契约零涉及**：快照是 `NODES` 的派生序列化产物（只读快照），
   不改 `NODES` 本身；`events.ts` 的 BK-0023 注释仅作为 issue「随批增量」请批
   面**成文**，本迭代零触碰（shared 契约文件属 POLICY 需批准区）。

## 背景（代码事实源，2026-10-24 17:3x~17:46 本会话只读核实）

1. **现行注册表形态**：`packages/shared/src/nodes.ts` 全文 119 行 read——
   `NODES` 导出于 `:9`，16 节点按 `trigger, userinput, llm, prompt, retrieval,
   websearch, http, code, notify, condition, loop, delay, merge, reply, setvar,
   approval` 键序声明（`:10-106`）；`NODE_NAMES` `:110-112` 与 `paramDefaultsOf`
   `:115-119` 为派生层。**函数值字段仅两处**：`trigger.params` 的 `cron`/`path`
   携 `if: p => …`（`nodes.ts:14-15`）。
2. **快照序列化语义（本会话对 dist 亲跑验证）**：`node -e "import('./packages/
   shared/dist/index.js')…JSON.stringify(m.NODES,null,2)"` 输出——16 键、键序
   与 DEFS 声明序一致、11520 字节、中文原样不转义、**`"if"` 键不出现**（JS
   序列化丢弃函数值）。即：快照天然覆盖全部可枚举数据字段，两个 `if` 函数由
   NDP §10 验收 2 的「行为探针」（三组入参布尔比对）单独守卫——快照的证明力
   边界须在 SPEC 如实标注，不得宣称覆盖 `if`。
3. **`node --test` 对 test/ 内 .json 的安全性（本会话临时目录实验）**：Node
   v24.21.0、`test/` 目录放 `baseline.json` + 一个最小 `.test.mjs`，`node --test`
   结果 `tests 1 / pass 1 / fail 0`——`.json` 不被测试运行器拾取。故快照放
   `packages/shared/test/nodes.baseline.json` 不影响 `npm test`（根 test 链 =
   build:shared → build:server → `npm test -w @agentflow/shared` = `node --test`，
   `package.json:18` + `packages/shared/package.json:15` 实查）。
4. **逐字节比对的 EOL 陷阱（本会话实查）**：本仓 `git config core.autocrlf`
   返回 `true`，且仓库无 `.gitattributes`（根目录 ls 实查无该文件）——文本
   文件在 Windows 检出时会被转 CRLF，快照若不钉死 EOL，「迁移后逐字节比对」
   在重检出后必然假红。方案：新增根 `.gitattributes` 一行
   `packages/shared/test/nodes.baseline.json text eol=lf`（仅此一条，检出与
   入库均 LF；生成命令直接写 LF + 末尾单个换行）。
5. **BK-0023 随批增量标的**：`packages/shared/src/events.ts:32` `ok: z.boolean()`
   无语义注释（本会话 read `:20-43` 核实；events.ts 全文 42 行）——语义为
   「未被中止而非全部成功」，消费端 `server-sync.js:105-107` 已按此实现
   （BK-0023 行内既有证据，治理日处置：并入本项产出的 issue 作随批增量，
   `BACKLOG.md:66`）。**本迭代零触碰 events.ts**。
6. **BK-0021 约束集（NDP v0.2 全文 read）**：§10 迁移四步（schema 先行 →
   加载机制（node.ts 数据模块 + 聚合层静态 import，定死不留实现轮）→ 聚合层
   反向合成（caps 先 mcp 后 skill、`if` 编译、`params[].id` 逐字等于现行 `k`）
   → 试点 delay+trigger 两节点 → 全量 16 + 各目录生成 README）；验收九条
   （`:597-620`）；L 项拆两批（8+8 节点，BK-0021 行内建议）；守卫测试（参数
   键名 ↔ handler 引用一致性，`handlers.ts`+`llm.ts`+`engine.ts` 34 行/37 处/
   23 键）与 BK-0021 同批落地（POLICY 自主区）。
7. **ADR/SPEC 序列现状**：`docs/adr/` 现 0001~0012（ls 实查）；`docs/` 根已有
   `node-definition-protocol.md` 与 `node-definition-protocol-review-notes.md`，
   实施轮 SPEC 落 `docs/node-definition-protocol-migration-spec.md` 同族命名。
8. **issue 草案先例**：迭代 0017 的 ADR-0012 附录 A 承载 needs-approval issue
   字面量、由脚本持字面量开启（`iterations/0017/PRD.md` REQ-0027-03 + STATE
   last_result「issue 待脚本开启」）；周报 §6.5 预告同款机制「BK-0031 落地后
   将开 BK-0021 实施轮 needs-approval issue（NDP 目录制迁移 + BK-0023 随批
   增量）」（`weekly/43.md:289-291`）。治理 PM 会话草稿仅存会话与周报摘要，
   **正文字面量以本迭代产物为权威**（草案在库前不算「已成」——如实口径）。
9. **竞品对照**（product-manager.md 职责 2）：ComfyUI 的节点定义即
   `NODE_CLASS_MAPPINGS` 注册表 + 每节点 Python 包目录，目录制与「每节点一
   目录」是 ComfyUI 生态可学习性的基石；AgentFlow 的 NDP 迁移向该形态对齐
   （协议文件 §1「方便查看与学习」用户原话），本项是其在宪法约束下的等价
   迁移前置。

## 目标

1. **基线快照入库**：`packages/shared/test/nodes.baseline.json`——从构建产物
   dist 派生的 `JSON.stringify(NODES, null, 2)` 全量快照，键序原样、LF 钉死，
   作为 BK-0021 实施轮「逐字节比对」的权威对照资产（NDP §10 验收 1 前置）。
2. **实施轮 SPEC 定稿**：`docs/node-definition-protocol-migration-spec.md`——
   按 NDP §10 四步展开的实施方案，含九条验收的机器可执行化、两批拆分、守卫
   测试设计、快照比对方法（含 EOL 钉死与证明力边界）、回滚步骤。
3. **needs-approval issue 草案成文**：BK-0021 实施轮请批 issue 的标题与正文
   字面量（含 BK-0023 随批增量段），自包含、可被脚本逐字取用。
4. **BACKLOG 指针回写**：BK-0021 行备注补三件产物路径，审批链可追溯。

## 非目标（out of scope）

- **零 `packages/shared/src/**` 改动**：不动 `nodes.ts` / `events.ts` / `types.ts` /
  `index.ts` 一行——BK-0023 的 events.ts:32 注释**只在 issue 里成文请批**，
  获批前零触碰（shared 契约文件属 POLICY 需批准区）。
- **不实施任何 NDP 迁移步骤**：不建 `nodes/` 目录、不写 `nodes.schema.ts`、
  不做聚合层改造、不新增任何契约测试断言（快照比对测试属 BK-0021 实施轮
  SPEC 的设计内容，本迭代只设计不落地）。
- **不动 BK-0021/BK-0023 状态**：BK-0021 维持 proposed；转 ready 唯一条件 =
  issue 获用户批复。BK-0023 维持 proposed（随批关账时点在其备注已定）。
- **不代开 issue、不代批**：草案只产出文本；开 issue 由脚本，批复只认用户
  本人（POLICY 禁止区）。
- **不更新 ROADMAP / metrics 状态**（CLOSE 职责）；**不改 BK-9002~9005 行**
  （修宪链排序归治理日）。

## 用户故事

1. 作为宪法主权者，BK-0021 改动 `packages/shared`（DEFS 射程）必须先向我请批，
   且请批 issue 要附等价性证据方案——快照资产就是「零漂移」承诺的第一份
   可验证抵押物（迁移后逐字节 diff 为空）。
2. 作为 spec-designer / code-developer，BK-0021 实施轮开工前要有定死的四步
   方案、两批拆分、守卫测试设计与回滚步骤——不在实施轮里边做边设计。
3. 作为 test-manager，「逐字节比对」必须机器可执行且不受 Windows 检出 EOL
   干扰——快照的生成命令、字节规范（UTF-8 无 BOM、LF、末尾单换行）与
   `.gitattributes` 钉死要在 SPEC 里一次定死，不接受「肉眼看起来一样」。
4. 作为工作流作者（T5 终端用户），我要的呈现三件套 / 智能体节点 / PTY 终端
   （BK-9002~9005，均已获批）不要再被协议前置无限阻塞——本轮把 BK-0021 的
   请批 issue 送到我手机上（GitHub Issues），我批一次，整条修宪链就动起来。

## 需求条目

- **REQ-0031-01 · 基线快照入库（`packages/shared/test/nodes.baseline.json`，
  新增）**：生成命令（SPEC 固化、BUILD 从仓库根执行）——
  `npm run build:shared` 后
  `node -e "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > packages/shared/test/nodes.baseline.json`。
  字节规范：UTF-8 无 BOM、LF 行尾、末尾恰一个换行、11520 字节（不含末尾
  换行，本会话亲跑定长——若 BUILD 期 dist 与本基线源一致则字节级相等，如
  不等 BUILD 须停下核查而非强写）。文件头不得加注释（JSON 无注释语法，方法
  说明全部放 SPEC）。
- **REQ-0031-02 · EOL 钉死（`.gitattributes`，新增）**：根目录新增，内容仅
  一行 `packages/shared/test/nodes.baseline.json text eol=lf`（不加任何其他
  规则，避免牵动存量文件的检出形态）。
- **REQ-0031-03 · 实施轮 SPEC 定稿（`docs/node-definition-protocol-migration-
  spec.md`，新增）**：至少含——(a) 四步实施方案逐步展开（每步的文件面、
  契约测试红→绿次序、验证命令）；(b) 九条验收的机器可执行化（尤其验收 1：
  快照比对的执行形态——一次性命令还是常驻契约测试，给出推荐与理由；验收
  2：`if` 行为探针的三组入参清单；验收 6：在线态 E2E 点位）；(c) L 项两批
  拆分表（16 节点 → 8+8，批间验收口径）；(d) 守卫测试设计（`p.<key>` 静态
  提取法、僵尸参数 warn 清单）；(e) 快照证明力边界声明（`if` 函数不可序列化
  → 探针守卫；`NODE_NAMES`/`paramDefaultsOf` 派生层不在快照内 → 由既有契约
  测试守卫）；(f) 回滚步骤（迁移为纯 shared 重构，revert 即回滚）；(g) 行数
  预算与 ≤400 行约束下的文件拆分预判（聚合层若超限拆 `nodes/index.ts` 转发，
  NDP §3 已预留）。文档头标注「SPEC · 待 needs-approval issue 获批后进入
  实施（BK-0021），批准前零实现」。
- **REQ-0031-04 · needs-approval issue 草案（SPEC 文档附录 A 承载）**：标题
  含「BK-0021 NDP 节点定义目录制迁移」与请批关键词；正文自包含五要素——
  ① 请批面（packages/shared DEFS 重组射程 + POLICY「shared DEFS 变更」需批准
  区条款引用）；② 等价性证据方案（快照逐字节比对 + gate diffPx=0 + 在线 E2E
  记录，NDP §10 验收 9 逐条）；③ 随批增量段（BK-0023：events.ts:32 `ok`
  语义注释一句话，批准该 issue 即一次授权，BK-0021 实施轮 CLOSE 时随批关账，
  `BACKLOG.md:66` 口径）；④ 实施轮拆分预告（两批 8+8，各自独立验收）；
  ⑤ 证据链接（NDP 规范 / 本 SPEC / 本 PRD / nodes.ts 现状指针）。文本可被
  脚本逐字取用（ADR-0012 附录 A 同款机制）。
- **REQ-0031-05 · BACKLOG 指针回写 + 改动面白名单**：BK-0021 行备注追加三件
  产物路径（快照 / SPEC / issue 草案附录）；产品提交 git diff 仅允许四路径：
  `packages/shared/test/nodes.baseline.json`（新增）、`.gitattributes`（新增）、
  `docs/node-definition-protocol-migration-spec.md`（新增）、
  `docs/evolution/BACKLOG.md`（BK-0021 备注追加）；其余任何路径零改动
  （AC5 机器核对，含 package-lock.json 零变化 = 零依赖证明）。

## 非功能要求

1. **零源码铁律**：`packages/shared/src/**`、`apps/**`、`tools/**`、
   `.github/**`、根 `package.json` 零改动（AC5 白名单机器核对）。
2. **快照确定性**：生成命令对同一 dist 输出逐字节确定（JSON.stringify 键序
   = 对象插入序 = nodes.ts 声明序，本会话亲跑验证）；BUILD 须先
   `npm run build:shared` 确保 dist 与 src 同步，再生成。
3. **可核查性**：SPEC 与 issue 草案引用的一切代码指针（file:line）真实可开
   （AC6 抽样 ≥5 条逐一比对；本 PRD 背景节指针为本会话亲核基线）。
4. **POLICY 合规形态**：BK-0021/BK-0023 维持 proposed（AC4 断言状态未变）；
   issue 草案 ≠ 开 issue ≠ 获批，三段分清。
5. **规模**：SPEC ≤ 400 行（对齐仓库文件规模惯例）；BACKLOG 回写增量 ≤ 10 行。

## 验收标准（Given / When / Then）

- **AC1 · 快照正确性与可再生产**：Given 仓库根执行 `npm run build:shared`，
  When 以 REQ-0031-01 命令重新生成快照到临时文件并 `cmp`（或逐字节 diff）
  入库的 `packages/shared/test/nodes.baseline.json`，Then 两者逐字节相等
  （UTF-8 无 BOM / LF / 末尾单换行 / 11520+N 字节）；且 JSON.parse 后键数=16、
  键序与 `nodes.ts:9-106` DEFS 声明序一致、无 `"if"` 键。
- **AC2 · 测试链零扰动**：Given `packages/shared/test/` 新增 `.json` 文件，
  When 执行 `npm test`（根 test 链，含 build:shared → build:server →
  `node --test -w @agentflow/shared`），Then 8 项测试全绿、无因快照文件引入
  的失败（本会话 Node v24.21.0 实验已证 `.json` 不被拾取，BUILD 期以真实
  test 链复核）。
- **AC3 · SPEC 要素齐备**：When 读 `docs/node-definition-protocol-migration-spec.md`
  全文，Then REQ-0031-03 (a)~(g) 七要素逐一在案且有实质内容——四步每步有
  文件面与验证命令；验收 1 的比对执行形态有明确推荐；两批拆分表覆盖 16 节点
  无遗漏无重复；快照证明力边界（`if` 除外 / 派生层除外）如实声明；文档头
  草案状态标注在位。
- **AC4 · issue 草案完整可用且状态不变式**：When 读 SPEC 附录 A 与回写后的
  BACKLOG，Then issue 草案标题 + 正文五要素（请批面 / 等价证据方案 / BK-0023
  随批增量 / 拆分预告 / 证据链接）齐备自包含；BACKLOG 中 **BK-0021 与 BK-0023
  状态列仍为 proposed**；BK-0021 行备注含三件产物路径。
- **AC5 · 白名单与零实现机器证明**：When 对产品提交执行 `git show --numstat`
  与 `git diff` 核对，Then 仅 REQ-0031-05 白名单四路径；全库无 `packages/
  shared/src/**`、`apps/**`、`tools/**`、`.github/**`、`package.json`/
  `package-lock.json` 任何改动（零依赖引入、零 shared 源码改动的机器证明）。
- **AC6 · 指针可核查**：When（VERIFY 执行）从 SPEC 与 issue 草案引用的代码
  指针中抽样 ≥5 条逐一打开比对，Then 全部与代码现状一致；发现任一指针失效
  即 FAIL 并列 BUG。
- **AC7 · 回归面**：`npm run build` + `npm run gate`（8 场景）+ `npm test` +
  `npm run smoke:server` 全绿——零源码改动的纯回归面，按工作流脚本统一门禁
  执行口径采信（先例 0012/0014/0016/0017：VERIFY 不必复跑全套，REPORT 引用
  门禁结论）。

## S 项免 SPEC 内嵌（skipSpec=true）

BK-0031 为 S 项（非 doc、非触 UI）——按 WORKFLOW §4 免独立 SPEC，受影响文件
清单与验收口径即本 PRD REQ-0031-05 与 AC1~AC7，BUILD 逐条执行、VERIFY 逐条
验收。注意区分：本迭代**产出**一份面向 BK-0021 实施轮的 SPEC 文档（产品
交付物，REQ-0031-03），与本迭代自身免 SPEC（跳过 SPEC 阶段）是两回事。

### 受影响文件清单（产品提交白名单，恰四路径）

| 路径 | 动作 | 内容 |
| --- | --- | --- |
| `packages/shared/test/nodes.baseline.json` | 新增 | NODES 全量快照（REQ-0031-01） |
| `.gitattributes` | 新增 | 仅一行 EOL 钉死规则（REQ-0031-02） |
| `docs/node-definition-protocol-migration-spec.md` | 新增 | BK-0021 实施轮 SPEC + 附录 A issue 草案（REQ-0031-03/04） |
| `docs/evolution/BACKLOG.md` | 追加 | BK-0021 行备注三产物路径（REQ-0031-05） |

### 验收口径速查（VERIFY 逐条执行）

AC1 快照再生产逐字节相等 → AC2 `npm test` 全绿（快照文件零扰动）→ AC3 SPEC
七要素 → AC4 issue 五要素 + 状态不变式 → AC5 `git show --numstat` 白名单 +
lock 零变化 → AC6 指针抽样 ≥5 → AC7 回归面（脚本门禁口径）。

## 依赖与风险

- **依赖**：零代码依赖；快照生成只需既有 `npm run build:shared`（tsc）。
- **风险 1 · 快照字节漂移（EOL/BOM）**：`core.autocrlf=true` + 无 .gitattributes
  的现状下，未钉死的文本文件重检出即 CRLF 化——REQ-0031-02 以最窄 .gitattributes
  规则钉死；AC1 的再生产比对在 BUILD 期当场做，不留给实施轮。
- **风险 2 · dist 与 src 不同步**：dist 是派生产物，若构建链未先跑、dist 陈旧，
  快照可能取到旧 DEFS——REQ-0031-01 把 `npm run build:shared` 定为生成前置，
  AC1 的 11520 字节定长是第二道哨（字节不符即停）。
- **风险 3 · 快照被误当守卫**：快照本身不拦截任何东西——在 BK-0021 实施轮
  把比对跑起来之前它只是资产；SPEC 须写明比对执行形态（推荐常驻契约测试，
  实施轮落定），避免「快照入库 = 已防护」的错觉（协议不虚构行为原则）。
- **风险 4 · 草案被误当批准**：SPEC 头部草案状态标注 + BK-0021/BK-0023 维持
  proposed（AC4 断言）+ issue 未开前不进入任何实施——POLICY 需批准区合规
  三重保险（同 0017 先例）。
- **风险 5 · 纯文档+资产产品提交误判**：本迭代产品提交含 shared test 资产
  与根 .gitattributes（docs/ 之外有改动），v2 机制下无 0001 轮判空问题
  （BK-0001 备注在案）。

---

## 选题过程存证

- **批复栏「approved：无」处置（规则①）**：与 BACKLOG 实况一致——七项批复
  已于 0011 轮落 ready，已完成者 BK-0026/0025/9001 相继 done。现存批复 ready
  项 BK-9002~9005（P0/L/触UI=是）**顺延**（0016/0017 PRD 先例，本轮逐项
  复核）：BK-9002/9003/9005 前置 BK-0021（NDP）未竟——本轮所选 BK-0031 正是
  其先行解阻项，做它 = 推进修宪链而非绕开；BK-9004 前置 BK-0016 已 done 但
  L 项拆分排序归 10-25 周日治理日（`ROADMAP.md:154-155`），心跳抓取即夹带
  拆分违「一次迭代只做一件事」。
- **user-request（规则②）**：本轮档案 issue 面板仅含 needs-approval 五项
  （#2~#6），**无 user-request 条目**——无建行、无 uiIssueNumbers。#6 open
  未批复：维持待批准区不建行、不催办、不代批。
- **rejected（规则③）**：无处置。
- **残缺标记档案**（tools.ts:5/:82 stub 如实降级）与**悬挂 run 探针**
  （161ce4ff running 1 条，智能客服助手，started 2026-10-20 无新增）：均已知
  状态——前者 BK-0005 done + M07 断言守护 / BK-0008 ready 承载，后者 BK-0011
  ready 承载（周报 W43 观察 O1 口径未变，治理日已刷新证据指针 store.ts
  :160/:183）；无新项，不重复立项。
- **覆盖差集 / 文档漂移 / dogfooding**：治理日产物（weekly/ 与 BACKLOG 既有
  证据行），心跳不重复采集。
- **选题（规则④）**：BK-0031——治理日解阻链明示第二顺位「0018→BK-0031」
  （`weekly/43.md:316`、`ROADMAP.md:166-169`，第一顺位 BK-0027 已于迭代 0017
  done）；批复项顺延后非 doc ready 队首（P1/S；类型 refactor 非 doc、非触
  UI）。次序参考：BK-0011（P2/S）→ BK-0008（P2/M）。doc 类型项本轮 ready 池
  为 0，无跳过争议。
- **skipSpec 判定**：S 项（非 doc、非触 UI）→ 免独立 SPEC（skipSpec=true），
  受影响文件清单与验收口径内嵌于本 PRD（见专节）。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE /
  POLICY / WORKFLOW / CONSTITUTION / .zcode/agents/product-manager.md 全文
  read；weekly/43.md 全文 read；iterations/0017/PRD.md 全文 read（近 3 迭代
  另经 0017 PRD 头部引用链 + metrics 0015/0016 行核对选题先例与重叠面）；
  `docs/node-definition-protocol.md` 全文 read（§10 验收九条 :597-620、快照
  验收 1 :599）；`packages/shared/src/nodes.ts` 全文 read 119 行（NODES :9、
  if 函数 :14-15）；`packages/shared/src/events.ts:20-43` read（ok 字段 :32
  无注释）；根 `package.json` 与 `packages/shared/package.json` 全文 read
  （test 链 :18、node --test :15）；`ls docs/`、`ls packages/shared/{src,
  test,dist}`；快照干跑：`node -e "import('./packages/shared/dist/index.js')
  …"`（16 键 / 键序一致 / 无 if 键 / 11520 字节）；`node --test` 拾取实验
  （临时目录，v24.21.0，tests 1/pass 1/fail 0——.json 不拾取）；
  `git config core.autocrlf` → true；根目录 ls 无 .gitattributes；`date`
  实查 2026-10-24 17:46。
