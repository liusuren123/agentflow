# PRD · 迭代 0022 · BK-0021 NDP 节点定义目录制迁移 · 批次 2 终轮（余 8 目录 + README 生成器 + 「内联残留=0」终态断言 + 在线 E2E 五点位 + BK-0023 随批关账）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 23:36
> 来源：BACKLOG BK-0021（P1 / refactor / L / **doing** / 触UI=否，来源 T5；实施授权链 =
> needs-approval issue#11 用户批复，2026-10-24 迭代 0021 PLAN 轮批复同步在案）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 协议前置「先迁移后扩展，不得跳过」
> （`ROADMAP.md:148-155`）——终轮落地后解阻 BK-9002/9003/9005 修宪链与 BK-9006
> 参数扩展子项的 DEFS 前置。
> 实施轮 SPEC（在库，全文 read）：`docs/node-definition-protocol-migration-spec.md`
> （下称「迁移 SPEC」，342 行）；批次 1 先例：`iterations/0021/{PRD,SPEC,REPORT}.md`。
> 冲突顺位：本 PRD 与 SPEC 冲突以 SPEC 为准，SPEC 与 NDP v0.2 冲突以 NDP 为准。
>
> ## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 23:2x~23:3x 核实）
>
> - **跨迭代批次续选优先**（本轮选题的直接依据，非新选题）：BK-0021 批次 1 于迭代
>   0021 CLOSE 时**保持 doing、STATE.item 续填 BK-0021**——编排三处留档一致：
>   `STATE.md:9` 注释「跨迭代批次续填（迭代 0021 批次 1 已 CLOSE、批次 2 待续做…）」、
>   `iterations/0021/PRD.md:215`（风险表末行「批次 2 轮 CLOSE 方置 done + 回执 #11 +
>   随批关账 BK-0023」）、`iterations/0021/REPORT.md` §六②；BACKLOG BK-0021 行备注
>   「批次 2（余 8 目录 + README 生成器 + 「内联残留=0」终态断言 + §5.6 在线 E2E
>   五点位 + BK-0023 随批关账 + 本项置 done）**留下一迭代直接续选本项**」；metrics
>   0021 行同口径。本轮即「下一迭代」，按既定编排续选，itemContinues 链到终轮收口。
> - ① **批复同步**：档案「approved：无；rejected：无」→ 零动作（#11/#10/#6 的批复
>   已于迭代 0021 PLAN 轮全部消化——BACKLOG BK-0021/BK-0028~0030/BK-9006 各行备注
>   明载门槛解除在案；#2~#5 批复更早已在库）。rejected 无 → 无 skipped 改写。
> - ② **user-request**：无（档案 issue 面板仅 needs-approval 七项，无 user-request
>   条目；无建行、无 uiIssueNumbers）。
> - ④ **常规 ready 选题不触发**：批次续选已定本轮项；ready 队列现状（BK-0028 P1/M
>   可开工、BK-0008 P2/M 待重试、BK-9002~9006 修宪项待解阻拆分）不受影响，终轮
>   CLOSE 后回归常规优先序。
> - **侦察档案核对**：残缺标记三处均既有事实（`apps/server/src/tools.ts:5/:82` 为
>   BK-0005 落地的 stub 如实降级设计，非缺陷）；悬挂 run 探针输出 `[]`（BK-0011
>   启动扫尾已落地的预期表现，迭代 0019 done）——无补题需求。
> - **issue#11 实况勘误（本会话 gh 亲核 2026-10-24 23:36）**：`gh issue view 11` 返回
>   `"state":"OPEN"`——与 BACKLOG BK-0021 行 / metrics 0021 行「已被脚本通用 CLOSE
>   模板提前关单（13:25:05Z）」记载**不符**，以实况为准：终轮 CLOSE 按标准
>   sourceIssue 流程**关单 + 🤖 回执**（而非仅补评论）；该勘误随归档提交回写
>   BACKLOG/metrics 由脚本处置。
> - 与最近 3 次迭代重叠面：0021=同项批次 1（packages/shared/src+test，**设计如此
>   的续做**）；0019=store/server/smoke；0020=blocked 零产品残留——本轮改动面
>   `packages/shared/**` + `tools/gen-node-readmes.mjs`，对 0019/0020 代码触点零重叠。

## 结论

**建议做（本迭代即做批次 2 终轮）**：一句话理由——issue#11 用户批复授权面（SPEC
附录 A ①存储形式重组·内容零漂移 + ③BK-0023 随批增量）尚未用尽，批次 1 已落地
schema/加载机制/反向合成/8 目录/常驻快照/守卫测试（提交 e880511，VERIFY PASS），
终轮只余同构重复的 8 目录迁移 + README 生成器 + 终态断言 + 在线 E2E 补证 +
BK-0023 一行注释；等价性由「Buffer 级逐字节比对（16 键全量）+ 既有四测试零改动 +
gate 8 场景 diffPx=0 + §5.6 在线五点位」机器+人工双链守护，非修宪轮、全程禁
gate:update；终轮 CLOSE 置 done 并解阻整条 T5-M3 修宪链。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面限 `packages/shared/**` 与 `tools/gen-node-readmes.mjs`（迁移 SPEC 不变式 D
   原文：`docs/node-definition-protocol-migration-spec.md:27-29`「新增文件仅
   packages/shared/** 与 README 生成器」）；`apps/web`、`tools/pixel-gate/**`、
   `.github/**`、根 package.json 零改动——视觉 / DOM 结构 / 交互三层与 golden
   基线零接触，**全程禁 `npm run gate:update`**（POLICY 禁止区）。
2. POLICY 授权链：packages/shared DEFS 变更属需批准区——issue#11 用户批复在案，
   授权面 = SPEC 附录 A ①（存储形式重组）+ ③（BK-0023 events.ts:32 **一行语义
   注释**、SSE schema 零变化）。两项都在已批射程内；批复只解除需批准面，不构成
   修宪轮（WORKFLOW v2 口径：纯后端/等价重组织批复项一律 reconstitutional=false）。
3. README 生成器与 16 份 README 是**新增文档产物**，不进任何构建/渲染路径
   （`packages/shared` exports map 仅 `"."`，apps 只经包根消费）；`events.ts` 改动
   为纯注释行，zod schema 字节零变化（events-negative 测试零改动全绿佐证）。

## 背景（代码事实，本会话 2026-10-24 23:2x~23:3x 只读核实）

1. **批次 1 已落地在库**（产品提交 e880511，VERIFY PASS 零 BUG）：`ls
   packages/shared/src/nodes/` 恰 8 目录（code/condition/delay/http/llm/retrieval/
   trigger/userinput），各目录**仅 node.ts、无 README**（ls 亲核）；`nodes.ts` 168
   行——8 静态 import（`:17-24`）+ 余 8 键内联（prompt `:107` / websearch `:113` /
   notify `:121` / loop `:128` / merge `:135` / reply `:140` / setvar `:145` /
   approval `:150`，Read 亲核），与批次 1 落地的 nodes-dirs 断言 3「内联残留集恰为
   批次 2 八键」一致；快照常驻比对、守卫测试等 18 项新增测试随 26/26 绿在库。
2. **BK-0023 标的在**：`packages/shared/src/events.ts:32` `ok: z.boolean()` 无语义
   注释（`:28-36` Read 亲核；语义「ok=未被中止而非全部成功」，消费端
   `server-sync.js:105-107` 已按此实现）——授权 = issue#11 附录 A ③，落点本轮。
3. **README 生成器未落盘**：`ls tools/` 仅 pixel-gate；16 份 README ×0。NDP §8 定
   端口/参数两表由 node.ts 生成、人工只写「能力与护栏」引注与「现状备注」。
4. **工作区干净**（`git status --porcelain` 输出空，亲核）；0021 REPORT OBS-002
   所记 `openspec/` 骨架已随 e880511 误入提交（+32，该 REPORT 预警在案）——本轮
   白名单外路径零出现（AC9），不做清理不扩大影响面（留治理日）。
5. **批次 2 八节点形态全部与批次 1 已验形态同构**（迁移 SPEC §4 表 + nodes.ts
   `:107-155` 亲核）：prompt（textarea 含 `\n` 换行默认值，同 code 已验）、websearch
   （combo + number min/max/step）、notify（**空 outputs** + combo + text）、loop
   （**list 输入端口** + number + toggle conc）、merge（**双 inputs** A/B）、reply
   （空 outputs + textarea）、setvar（text）、approval（combo 超时策略 + text）；
   8 键均无 caps（批次 1 落地的「14 键无 caps」负存在断言常驻守护）。同名异义键
   `p.to`（notify 接收人义/approval 超时策略义）与 `p.max`（websearch 结果数量义/
   loop 迭代义）按守卫测试 handler 归属天然区分，迁移不改变归属。
6. **竞品对照**（product-manager 职责）：ComfyUI 每节点目录自带文档（节点 docstring
   / frontend 扩展文档），目录制 + README 是生态可学习性的基石；NDP 迁移向该形态
   对齐（协议 §1「方便查看与学习」用户原话），README 生成器为该对齐的收口段。

## 目标与范围（批次 2 终轮精确边界）

**做**（= 迁移 SPEC §3.4 终段 + §5 九条全量 + §5.6 在线 E2E + §3.2 终态断言启用
+ BK-0023 随批关账）：

1. **余 8 目录迁移**：新增 `packages/shared/src/nodes/{prompt,websearch,notify,loop,
   merge,reply,setvar,approval}/node.ts`（纯数据模块 `export default {…} satisfies
   NodeDefJson`，identity/params 文案与默认值逐字取自现行内联 DEFS，端口 id 按
   NDP §5.3 命名规则一次性定稿；SPEC 阶段出 8 目录端口 id/参数标注/binding 定界表）。
2. **聚合层收敛**：`nodes.ts` 16 静态 import、删余 8 键内联；对外仍且仅导出
   `NODES / NODE_NAMES / paramDefaultsOf`（不变式 B），16 键序与 ports/params 数组
   顺序逐字（不变式 C），行数预算 ≤250（现 168，收敛后应缩短）。
3. **「内联残留=0」终态断言启用**（`test/nodes-dirs.test.mjs`，SPEC §3.2 收尾口径）：
   断言 3 由「残留集恰为批次 2 八键」收敛为「残留=0」；D===R 扩至 16 目录。
4. **README 生成器与生成物**：新增 `tools/gen-node-readmes.mjs`（≤200 行，读
   node.ts 生成端口/参数两表）；生成物入库——`src/nodes/README.md` 总索引 + 16 份
   `src/nodes/<type>/README.md`（每份约 40–60 行，文档产物不计源码 400 行上限；
   生成器幂等：重跑 diff 零漂移）。
5. **readme-consistency 契约测试**（SPEC §3.4：解析 README 表回比 node.ts 源数据；
   先红——README 未生成——后绿；落位独立文件或并入 nodes-dirs，SPEC 定稿）。
6. **§5.6 在线态人工 E2E 五点位**（批次 1 明示延后、本轮不可替代补齐）：`npm start`
   后 ①启动日志「⚡ 执行后端已连接」（`app.js:2044` 起）；②LLM 节点属性面板模型
   下拉被后端 `provider.models` 覆写（`app.js:2055` 真实执行）；③覆写后取值仍在
   options 内；④控制台零 TypeError；⑤trigger「触发方式」切「定时触发」→ Cron 行
   显、切回「手动触发」→ 隐（`if` 编译产物行为落点，`app.js:763`）。
7. **BK-0023 随批关账**：`events.ts:32` 补一行语义注释——`ok` 语义为「未被中止而非
   全部成功」（消费端 server-sync.js:105-107 已按此实现）；注释级改动、SSE schema
   零变化；BACKLOG BK-0023 行随终轮 CLOSE 置 done。
8. **CLOSE 终局**：BK-0021 置 done（跨迭代 doing 至本轮收口）；issue#11 **现为
   OPEN（gh 亲核 23:36，与 BACKLOG「已提前关单」记载不符、以实况为准）**——按
   标准 sourceIssue 流程关单 + 🤖 终轮说明评论附等价性证据指针。

**不做（out of scope）**：

- 任何 `apps/web`、`tools/pixel-gate/**`、`.github/**`、根 package.json/lock 改动
  （不变式 D；AC7 `git diff -- apps/web` 恒空）。
- `packages/shared/test/nodes.baseline.json` 更新（迁移前基线，实施全程不更新——
  迁移 SPEC §2「更新时机」条款；实施落地后它转为常驻防漂移基线）。
- `packages/shared/src/nodes.schema.ts` 行为改动（批次 1 产物，本轮原则上零改动；
  若批次 2 数据暴露 schema 误拒合法数据，属实施发现，SPEC 阶段逐条留档处置，
  不得静默放宽）。
- 既有四测试（contract / defs-drift / events-negative / handlers-coverage）任何改动。
- `npm run gate:update` / golden 任何接触（非修宪轮；POLICY 禁止区）。
- BK-9002~9006 修宪链开工（终轮后解阻，按各自拆分排序另行立项，本轮不夹带）。
- `openspec/` 误入提交的清理（0021 OBS-002 在案，留治理日）。

## 受影响文件清单（= 产品提交白名单；SPEC 阶段细化定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `packages/shared/src/nodes/{prompt,websearch,notify,loop,merge,reply,setvar,approval}/node.ts` | 新增 ×8 | ≤60/个（迁移 SPEC §9） |
| `packages/shared/src/nodes.ts` | 16 import 收敛 + 删内联 8 键 + 三导出 | ≤250（现 168 → 收敛） |
| `tools/gen-node-readmes.mjs` | 新增 | ≤200（迁移 SPEC §9） |
| `packages/shared/src/nodes/README.md` + `src/nodes/<type>/README.md` ×16 | 新增（生成物入库） | 每份约 40–60 行（文档产物不计源码上限） |
| `packages/shared/test/nodes-dirs.test.mjs` | 修改（终态断言收敛「残留=0」+ D===R 扩 16） | ≤100（批次 1 现 60 行） |
| readme-consistency 断言 | 新增（独立文件或并入 nodes-dirs，SPEC 定稿） | SPEC 定稿，≤150 |
| `packages/shared/src/events.ts` | +1 行注释（BK-0023） | 42→43 行，schema 字节零变化 |
| `docs/evolution/BACKLOG.md` | 备注回写（含 issue#11 勘误） | 随归档提交（机制件） |

零改动白名单：`apps/**`、`tools/pixel-gate/**`、`.github/**`、根 package.json 与
lock、`packages/shared/src/index.ts`、`packages/shared/src/nodes.schema.ts`（见
「不做」第 3 条例外口径）、既有四测试文件、`packages/shared/test/nodes.baseline.json`、
批次 1 其余三测试（schema/synthesis/param-handler-guard——synthesis 快照断言内容
不因批次 2 改）。

## 验收标准（Given/When/Then；批次 2 终轮口径 = SPEC §5 九条全量 + README 一致性 + 终态）

- **AC1 · 快照逐字节比对（SPEC §5.1 验收 1，不变式 A）**：Given 批次 2 后 NODES 由
  16 目录全量合成供出，When `npm run build:shared` 后常驻快照比对测试（Buffer.equals，
  16 键全量）绿、且 VERIFY 一次性再生产 `cmp` 对照（SPEC §2 命令），Then cmp 输出空
  + 双侧 sha256 `08ba1229…f275` / 11521 字节一致。
- **AC2 · if 行为探针（SPEC §5.2 验收 2，回归）**：When shared 测试运行，Then trigger
  cron/path 六行真值表探针仍绿且 `typeof if === 'function'`（批次 1 产物回归）。
- **AC3 · 两数分开 + 守卫（SPEC §5.3 验收 3 + §6，回归+终态）**：When 守卫测试运行，
  Then 正向零违例、僵尸清单精确断言仍为 `[['trigger',['mode','cron','path']],
  ['userinput',['vtype','req']]]`（批次 2 迁移不产生新僵尸、不接通旧僵尸——
  websearch.max / notify.to / loop.max / approval.to 等同名异义键 handler 归属不变）、
  `sum(params.length) === 33`。
- **AC4 · 既有契约测试零改动全绿（SPEC §5.4 验收 4）**：When `git diff --stat --
  packages/shared/test/{contract,defs-drift,events-negative,handlers-coverage}.test.mjs`，
  Then 输出为空且四文件全绿。
- **AC5 · gate（SPEC §5.5 验收 5）**：When `npm run build && npm run gate`，Then 8 场景
  diffPx=0（证明力边界如实：静态托管；在线分支由 AC6 补证）。
- **AC6 · 在线态人工 E2E 五点位（SPEC §5.6 验收 6，本轮不可替代）**：Given `npm
  start` 起后端 + 浏览器开 localhost:3000，When 逐点位执行（⚡连接日志 / LLM 模型
  下拉覆写 / 取值在 options 内 / 控制台零 TypeError / trigger cron 显隐），Then 五
  点位逐一通过，REPORT 落证据（截图或 DOM 断言输出 + 指针）。
- **AC7 · 波及面与可写性（SPEC §5.7 验收 7）**：When 全程 `git diff -- apps/web`，
  Then 恒空；且聚合层导出对象未 freeze（批次 1 可写性常驻断言随测试绿回归）。
- **AC8 · 散落点核对 + 回归零回退（SPEC §5.8 验收 8）**：八处现行指针（`app.js:2055/
  :193-197/:1866/:103/:178`、`engine.ts:128/:23-24`、handlers+llm 的 `p.<key>`）行为
  不变——以 AC7 静态链 + AC3 守卫 + AC6 在线点位共同证明；`npm test` 全绿（26 项
  + 批次 2 增量）+ `npm run smoke:server` 全绿 exit 0（V09 时点性假红沿 0018/0021
  先例：产品提交落地后 CLOSE 复跑确认自愈，含 Z01-Z04 恢复执行）。
- **AC9 · 终态与提交不变式**：「内联残留=0」终态断言启用且绿（D===R=16）；readme-
  consistency 测试绿（README 表 ⇄ node.ts 回比一致）+ 生成器幂等（重跑 diff 零漂移）；
  BK-0023 改动恰 events.ts +1 行注释、`git diff` 证 schema 零变化；产品提交恰一个
  （Conventional Commits，如 `refactor(shared): BK-0021 批次2 NDP 终轮——余8目录+
  README生成器+终态断言+在线E2E+BK-0023注释（内容零漂移）`），提交内容 = 上表白名单，
  白名单外路径零出现。
- **AC10 · 终轮回执与关账（SPEC §5.9/§10 衔接）**：CLOSE 时 BK-0021 置 done、
  BK-0023 置 done（备注随批关账口径）；脚本对 issue#11（**OPEN 实况**，本 PRD 存证
  gh 亲核 2026-10-24 23:36）执行关单 + 🤖 终轮说明评论，附等价性证据指针（AC1
  cmp/sha256 + AC5 gate + AC6 五点位 REPORT 路径）；BACKLOG/metrics 中「#11 已提前
  关单」旧记载的勘误一并回写。

## 非功能要求

1. 新增源文件 ≤400 行（AGENTS.md 硬性约定 4；逐文件预算见上表与迁移 SPEC §9）。
2. 全程禁 `npm run gate:update` / golden 零接触（非修宪轮；POLICY 禁止区）。
3. 回滚 = `git revert` 本迭代产品提交（迁移 SPEC §8：两批各自提交、后批先 revert；
   纯存储形式重组 + 一行注释，无数据迁移/依赖增减/env 变更）。
4. EOL 纪律：新文件一律 LF、UTF-8 无 BOM；README 生成器输出 LF。
5. README 生成物与 node.ts 的一致性由常驻测试守护（不是一次性核对）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| README 生成器与源数据漂移（手改 README / 生成器 bug） | readme-consistency 回比测试常驻 + 生成器幂等重跑断言（AC9） |
| 批次 2 数据暴露 schema 误拒（superRefine 对空 outputs/双 inputs/list 端口等形态） | 实施序先跑 schema.test 正例；若真缺口属 nodes.schema.ts 微调，SPEC 阶段逐条留档（不静默放宽、不视为批次 1 缺陷回改） |
| events.ts 注释夹带（超出注释面） | AC9 断言 diff 恰 +1 行注释；events-negative 测试零改动全绿（AC4）佐证 schema 零变化 |
| smoke V09 时点性假红（产品提交前 git 半边必红，0021 OBS-001 先例） | AC8 口径：产品提交后 CLOSE 复跑自愈；Z01-Z04 恢复执行纳入复跑确认 |
| 在线 E2E 五点位环境依赖（需浏览器 + 后端） | VERIFY 阶段 test-manager 亲跑（0021 REPORT 已有先例取证形态）；Windows 本机参考级 + 指针记录，如实标注 |
| issue#11 状态记载与实况不符（BACKLOG 记已关、实况 OPEN） | AC10 以 gh 实况为准执行标准关单 + 🤖 回执；勘误回写 BACKLOG/metrics |
| openspec/ 误入 e880511 的存量预警（0021 OBS-002） | 本轮 AC9 白名单外零出现即不受影响；清理留治理日不夹带 |

## 需求清单（REQ-0022-xx）

- REQ-0022-01：按「目标与范围·做」1–5 落地批次 2 全部文件（迁移 SPEC §3.4 终段 +
  §3.2 终态断言 + readme-consistency）。
- REQ-0022-02：BK-0023 events.ts:32 语义注释恰一行落地（schema 零变化）。
- REQ-0022-03：产品提交恰一个，白名单 = 受影响文件清单表（AC9）；BACKLOG 备注回写
  （含 issue#11 勘误）随归档提交（机制件，与 0011~0021 同机制）。
- REQ-0022-04：VERIFY 按 AC1~AC9 逐条执行并落 REPORT（证据：命令输出摘要 + gate
  场景结果 + §5.6 五点位在线 E2E 取证）。
- REQ-0022-05：CLOSE 终局——BK-0021/BK-0023 置 done、issue#11 关单 + 🤖 终轮说明
  （AC10）；STATE.item 置 `-`（终轮收口，不再续填）。

## SPEC 阶段衔接说明

BK-0021 为 L 项，**不免 SPEC（skipSpec=false）**。迭代 0022 SPEC 以迁移 SPEC §3.4/
§4/§5.6 为基准展开批次 2 细节：8 目录端口 id / 参数标注 / binding.capabilities
定界表（对齐批次 1 SPEC §5 形态）、README 生成器设计（表格式样 + 幂等口径 +
readme-consistency 落位）、聚合层收敛后行数预算、实施序（红→绿）。新架构决策：
无（needsAdr=false——全部定案于 NDP v0.2 + 迁移 SPEC + issue#11 批复链，同批次 1
口径）。
