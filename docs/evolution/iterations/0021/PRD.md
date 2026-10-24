# PRD · 迭代 0021 · BK-0021 NDP 节点定义目录制迁移 · 批次 1（schema + 加载机制 + 聚合层合成 + 8 目录 + 常驻快照比对 + 守卫测试）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 20:27
> 来源：BACKLOG BK-0021（P1 / refactor / L / ready / 触UI=否，来源 T5；实施授权链 =
> needs-approval issue#11 用户批复，2026-10-24 心跳档案批复同步「approved：#11」）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 协议前置「先迁移后扩展，不得跳过」
> （`ROADMAP.md:148-155`）——BK-0021 落地解阻 BK-9002/9003/9005 三个已批修宪项与
> BK-9006 参数扩展子项的 DEFS 前置。
> 实施轮 SPEC（已在库，随迭代 0018 / BK-0031 落盘）：`docs/node-definition-protocol-migration-spec.md`
> （342 行，全文 read）。冲突顺位：本 PRD 与 SPEC 冲突以 SPEC 为准，SPEC 与 NDP v0.2
> 冲突以 NDP 为准（SPEC 头部既定顺位）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 20:1x~20:2x 核实）：
> ① **批复项**——档案「approved：#11,#10,#6,#5,#4,#3,#2；rejected：无」逐项处置：
> #11 → BK-0021 解除转 ready 门槛（行内备注明载「转 ready 唯一条件 = issue#11 获
> 用户批复」，BACKLOG.md BK-0021 行）；#10 → BK-0028~0030 解除转 ready 门槛（0029/
> 0030 依赖序不变，前置未竟不入选）；#6 → BK-9006 建行入主池 ready P0（此前未批复
> 不建行，BACKLOG 待批准区记录在案）；#2~#5 批复早已在库（BK-9002~9005 ready 原状）
> 零新动作；rejected 无 → 无 skipped 改写。**批复链内选题权衡**（三条链并开，按
> 杠杆 × 就绪度）：BK-9006（P0/L）为杂项集合、无 ADR 无拆分，治理日明示「拆分排序
> 待下个治理日」（ROADMAP.md:154-155），心跳抓取即夹带拆分、违「一次迭代一件事」
> → 顺延；BK-0028（P1/M）ADR-0012 定界齐备可开工，但 BK-0021 就绪度与杠杆均更高
> （SPEC 342 行 + 等价基线快照 11521 字节均已入库，等价性由 Buffer 级字节比对机器
> 守护；且为 BK-9002/9003/9005 + BK-9006 参数子项的共同前置）——ROADMAP 治理日
> PLAN 指导（`ROADMAP.md:166-169`）明示「任一 needs-approval 获批（#6 / BK-0021
> 实施轮 issue / BK-0013 依赖 issue）则该链优先于常规选题」→ **选 BK-0021（#11 链，
> sourceIssue=11）**。
> ② user-request：无（档案面板仅 needs-approval 七项，无 user-request 条目，无建行、
> 无 uiIssueNumbers）。③ rejected：无。④ 常规选题不触发（①已有入选项）。
> 侦察档案核对：残缺标记三处均既有事实（apps/server/src/tools.ts:5/:82 为 BK-0005
> 落地的 stub 如实降级设计，非缺陷）；悬挂 run 探针输出 `[]`（BK-0011 启动扫尾已
> 落地的预期表现，迭代 0019 done）；治理日三类证据本轮不重复采集（档案约定）——
> 无补题需求。
> 与最近 3 次迭代重叠面：0018=快照资产+SPEC（docs+test 资产，零 src 改动）、
> 0019=store/server/smoke、0020=blocked 零产品残留——本轮改动面 `packages/shared/src/**`
> （nodes.ts 聚合层改造 + 新增 nodes.schema.ts 与 src/nodes/ 目录）+ `packages/shared/test/**`
> 新增测试，对三迭代代码触点零重叠。

## 结论

**建议做（本迭代即做批次 1）**：一句话理由——issue#11 用户批复已到位（一次授权
「packages/shared DEFS 重组（内容零漂移）+ BK-0023 随批增量」，SPEC 附录 A），
实施轮 SPEC 与等价基线快照全部就位；批次 1（覆盖全部结构变体的 8 目录 + zod
加载校验 + 聚合层反向合成 + 常驻快照比对 + 参数↔handler 守卫测试）是整条 T5-M3
修宪链的共同前置，等价性由「Buffer 级逐字节比对 + 既有四测试零改动 + gate 8 场景
diffPx=0」三重机器证明守护，非修宪轮、全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面限 `packages/shared/src/**`（nodes.ts 聚合层改造 + 新增 src/nodes.schema.ts
   与 src/nodes/<type>/node.ts ×8）与 `packages/shared/test/**`（新增测试文件）；
   SPEC 不变式 D（`docs/node-definition-protocol-migration-spec.md:27-29`）：
   `apps/**`、`tools/pixel-gate/**`、`.github/**`、根 package.json 零改动——
   视觉 / DOM 结构 / 交互三层与 golden 基线零接触，**全程禁 `npm run gate:update`**
   （SPEC §1「获批后仍非修宪轮」条款；POLICY 禁止区）。
2. POLICY 授权链：packages/shared DEFS 变更属需批准区——issue#11 用户批复在案
   （授权面 = SPEC 附录 A ①存储形式重组·内容零漂移 + ③BK-0023 随批增量 events.ts:32
   一行注释；③的落点在批次 2 终轮随批关账，本轮零触碰）。批复只解除需批准面，
   不构成修宪轮。
3. DEFS 运行时输出等价性由不变式 A（逐字节）+ B（导出面 NODES/NODE_NAMES/
   paramDefaultsOf 逐字保留）+ C（16 键序与 ports/params 数组顺序逐字搬运）机器
   守护；快照证明力边界（`if` 函数不可序列化等五条）SPEC §7 如实标注，行为等价
   由六行探针真值表守卫（AC2）。

## 背景（代码事实，本会话 2026-10-24 只读核实）

1. **现行注册表**：`packages/shared/src/nodes.ts` 全文 119 行（wc -l 实查）——16
   节点内联定义于 `:10-106`，派生层 NODE_NAMES/paramDefaultsOf 于 `:109-119`；
   函数值字段仅 trigger 的 cron/path 两处 `if`（`nodes.ts:14-15`）。`src/` 下现无
   nodes/ 子目录（ls 实查：events/index/nodes/types 四文件）。
2. **等价基线快照在库**：`packages/shared/test/nodes.baseline.json` 11521 字节
   （ls -la 实查，2026-10-24 17:51 落盘；sha256 08ba1229…f275，根 .gitattributes
   钉死 LF）——迁移前基线，实施全程不更新（SPEC §2）。
3. **实施轮 SPEC 在库**：`docs/node-definition-protocol-migration-spec.md` 342 行
   （全文 read）——四步方案（§3：schema 先行 → 加载机制+试点 2 目录 → 聚合层
   反向合成 → 全量 16 目录两批+README 生成）、两批 8+8 拆分表（§4）、九条验收
   机器可执行化（§5）、守卫测试设计（§6）、回滚（§8）、行数预算（§9）。§4 末
   明示编排口径「批次编排（一批一迭代 vs 单迭代两提交）由协调者按 WORKFLOW『一次
   迭代一件事』派发，**推荐两迭代**（各自产品提交 + VERIFY 记录）」——本 PRD 据
   此把 BK-0021 拆为批次 1（本迭代）+ 批次 2（后续迭代），BACKLOG 项至批次 2 终轮
   CLOSE 方置 done 并回执 issue#11。
4. **BK-0023 随批标的核实**：`packages/shared/src/events.ts:32` `ok: z.boolean()`
   无语义注释（全文 42 行 read；语义「未被中止而非全部成功」，消费端
   server-sync.js:105-107 已按此实现）——授权已在案（#11 附录 A ③），落点在
   批次 2 终轮随批关账，本轮零触碰（避免批次 1 提交夹带第二件事）。
5. **批次 1 节点覆盖全部结构变体**（SPEC §4 拆分表）：delay（最小骨架）、trigger
   （visibleIf×2、僵尸参数×3、空 inputs）、llm（caps 双能力序、runtimeOverridable、
   number min/max/step、双 inputs、text 端口）、userinput（toggle、boolean 默认值、
   僵尸参数×2）、code（caps 单能力、textarea 换行默认值）、retrieval（list 端口、
   combo kb）、condition（双 outputs、engine.ts:128 p.expr 耦合）、http（object
   端口、跨节点同名键 p.to）；批次 2 八节点（prompt/websearch/notify/loop/merge/
   reply/setvar/approval）均与批次 1 已验形态同构。
6. **竞品对照**（product-manager 职责）：ComfyUI 的节点定义即 `NODE_CLASS_MAPPINGS`
   注册表 + 每节点 Python 包目录，目录制是生态可学习性的基石；NDP 迁移向该形态
   对齐（协议文件 §1「方便查看与学习」用户原话），本批为其等价实施段（论述先例
   iterations/0018/PRD.md 背景 9）。

## 目标与范围（批次 1 精确边界）

**做**（= SPEC §3 步一~步四的批次 1 段 + §5 验收子集 1/2/3/4/5/7/8 + §6 守卫测试）：

1. 新增 `packages/shared/src/nodes.schema.ts`（zod `.strict()` + superRefine 五规则
   ——参数 id 节点内唯一 / visibleIf.param 指向存在参数 / binding.handler 非空串 /
   combo·number 约束 / 拒未知键；SPEC §3.1）+ 测试 `test/schema.test.mjs`（正例 3
   模板 + 负例 6 类拒绝）。
2. 新增 `src/nodes/{delay,trigger}/node.ts` 试点（纯数据模块 `export default {…}
   satisfies NodeDefJson`，SPEC §3.2）+ 加载机制测试 `test/nodes-dirs.test.mjs`
   （读 nodes.ts 源文本提取 import 集 D 与 readdir 集 R，断言 D===R 且
   D⊆Object.keys(NODES)；「内联残留键=0」终态断言本轮不启用——批次 2 收尾启用）。
3. 聚合层反向合成函数落地（SPEC §3.3 两个必踩点：caps 固定 `['mcp','skill']` 先
   mcp 后 skill、`params[].id` 逐字等于现行 `k`；`visibleIf` 编译为 `if`；
   `implemented:false` 静默丢弃；protocol/type/edgeRules/binding/runtimeOverridable
   不进输出）+ 测试 `test/synthesis.test.mjs`（caps 序断言 + if 六行探针 + 试点
   键集与默认值零漂移）。
4. 批次 1 其余 6 目录迁移：`src/nodes/{llm,userinput,code,retrieval,condition,http}/
   node.ts`（SPEC §3.4 批次 1 段）；每步收尾跑 `npm test -w @agentflow/shared &&
   npm test -w @agentflow/server`。
5. **常驻快照比对测试落盘**（SPEC §5.1 推荐形态：Buffer.equals 级比对 dist 导出
   NODES 序列化 vs nodes.baseline.json，零文本模式读写，含首异字节偏移提示；落位
   synthesis.test.mjs 或独立 nodes-snapshot.test.mjs）。
6. **守卫测试** `test/param-handler-guard.test.mjs`（SPEC §6：读 handlers/llm/
   engine 源文本静态提取 `p.<key>` + 行归属 + 正向 ∈ 断言 + 反向僵尸清单精确断言
   `[['trigger',['mode','cron','path']],['userinput',['vtype','req']]]`；不硬编码
   行数/处数）。

**不做（out of scope，批次 2 / 终轮范围）**：

- 批次 2 八目录迁移与「内联残留=0」终态断言启用；
- README 生成器 `tools/gen-node-readmes.mjs` 与 16 份目录 README（SPEC §3.4 终态段）；
- SPEC §5.6 在线态人工 E2E 五点位与九条全量验收（批次 2 收尾）；
- BK-0023 events.ts:32 注释（随批关账落点 = 终轮 CLOSE，SPEC §10）；
- issue#11 回执关单（BK-0021 终轮 done 时由脚本执行）；
- `apps/**` 一字节不改（SPEC 不变式 D；app.js:2055 运行期覆写路径的在线证明留
  批次 2 E2E 点位 ②）。

## 受影响文件清单（SPEC §9 预算表批次 1 子集）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `packages/shared/src/nodes.schema.ts` | 新增 | ≤300（估 220-260） |
| `packages/shared/src/nodes.ts` | 改造为聚合层（8 目录静态 import + 合成函数 + 三导出；余 8 键暂内联） | ≤250（估 160-200） |
| `packages/shared/src/nodes/{delay,trigger,llm,userinput,code,retrieval,condition,http}/node.ts` | 新增 ×8 | ≤60/个 |
| `packages/shared/test/schema.test.mjs` | 新增 | ≤150 |
| `packages/shared/test/nodes-dirs.test.mjs` | 新增 | ≤100 |
| `packages/shared/test/synthesis.test.mjs`（含快照常驻比对） | 新增 | ≤180 |
| `packages/shared/test/param-handler-guard.test.mjs` | 新增 | ≤200 |
| `docs/evolution/BACKLOG.md` | 备注回写 | 随归档提交（机制件） |

零改动白名单：`apps/**`、`tools/**`（含 pixel-gate）、`.github/**`、根 package.json
与 lock、`packages/shared/test/` 既有四测试文件（contract / defs-drift /
events-negative / handlers-coverage）、`packages/shared/test/nodes.baseline.json`
（迁移前基线全程不更新）、`packages/shared/src/events.ts`（BK-0023 留终轮）。

## 验收标准（Given/When/Then；批次 1 口径 = SPEC §5 验收 1/2/3/4/5/7/8 + 回归）

- **AC1 · 快照逐字节比对（SPEC §5.1 验收 1）**：Given 批次 1 落地后 NODES 由
  「8 目录合成 + 8 键内联」混合供出，When `npm run build:shared` 后运行常驻快照
  比对测试（Buffer.equals：`Buffer.from(JSON.stringify(NODES,null,2)+'\n')` vs
  baseline 文件 Buffer），Then 断言通过且覆盖 16 键全量（不变式 A 对整表生效，
  含未迁移 8 键）；VERIFY 期另做一次性再生产 `cmp` 对照（SPEC §2 命令，REPORT
  证据形态）。
- **AC2 · if 行为探针（SPEC §5.2 验收 2）**：Given trigger 目录化完成（visibleIf
  编译为 if），When 执行六行真值表探针（cron.if 与 path.if × {默认值, equals 值,
  其他值}），Then 六行布尔逐一与迁移前语义（`nodes.ts:14-15`）相等，且
  `typeof NODES.trigger.params.find(p=>p.k==='cron').if === 'function'`。
- **AC3 · 两数分开 + 守卫测试（SPEC §5.3 验收 3 + §6）**：Given
  `param-handler-guard.test.mjs` 落盘，When 运行双向断言，Then 正向全过（提取键
  ∈ `NODES[owner].params[].k`）且反向「有而无引用」键集合恰等于期望僵尸清单
  `[['trigger',['mode','cron','path']],['userinput',['vtype','req']]]`；且
  `sum(Object.values(NODES).map(d=>d.params.length)) === 33`（33 已定义 / 28 已
  实现两数分开成立）。
- **AC4 · 既有契约测试零改动全绿（SPEC §5.4 验收 4）**：When `git diff --stat --
  packages/shared/test/contract.test.mjs packages/shared/test/defs-drift.test.mjs
  packages/shared/test/events-negative.test.mjs packages/shared/test/handlers-coverage.test.mjs`，
  Then 输出为空且四文件全绿（新增测试文件不在此列）。
- **AC5 · gate（SPEC §5.5 验收 5）**：When `npm run build && npm run gate`，Then
  8 场景 diffPx=0（证明力边界如实：静态托管证明；`app.js:2055` 在线分支留批次 2
  §5.6 E2E 补证，本轮以 AC6 零 diff 静态保证）。
- **AC6 · 波及面与可写性（SPEC §5.7 验收 7）**：When 批次 1 全程 `git diff --
  apps/web`，Then 输出为空；且聚合层导出对象**未** `Object.freeze`——常驻断言向
  dist 导入对象 `NODES.llm.params[0].o` 赋值不抛（写后还原），守护 `app.js:2055`
  运行期覆写现状行为。
- **AC7 · 散落点核对（SPEC §5.8 验收 8）**：批次 1 收尾逐条复核八处现行指针
  （`app.js:2055`/`:193-197`/`:1866`/`:103`/`:178`、`engine.ts:128`/`:23-24`、
  handlers.ts+llm.ts 的 `p.<key>` 23 键）行为不变——本轮以「apps 零 diff + 导出
  面不变 + AC3 守卫」静态保证，在线点位留批次 2。
- **AC8 · 回归零回退**：`npm test`（既有 8 项 + 新增测试全绿，根 test 链
  build:shared→build:server→node --test）与 `npm run smoke:server`（89 断言口径，
  含 C01 动态浮动行；AGENTS.md「84 断言」系滞后记载、迭代 0019 OBS 在案留治理日
  修正）零回退、exit 0。
- **AC9 · 批次边界不变式**：批次 1 完成时恰 8 目录（nodes-dirs.test.mjs 的 D===R
  断言绿），nodes.ts 聚合层余 8 键内联；「内联残留=0」终态断言不启用（SPEC §3.2）；
  全部改动恰一个产品提交（Conventional Commits），提交内容 = 上表受影响文件清单，
  白名单外路径零出现。

## 非功能要求

1. 新增源文件 ≤400 行（AGENTS.md 硬性约定 4；SPEC §9 逐文件预算如上表）。
2. 全程禁 `npm run gate:update` / golden 零接触（非修宪轮；POLICY 禁止区）。
3. 回滚预案 = `git revert` 本迭代产品提交（SPEC §8：纯存储形式重组，无数据迁移、
   无依赖增减、无 env 变更；快照与 .gitattributes 留库无害，revert 后常驻比对
   若已入库仍绿——基线本就从原状生成）。
4. EOL 纪律：新文件一律 LF；快照比对测试用 Buffer 级 IO（免疫检出 EOL 事故，
   SPEC §5.1 推荐理由 ②）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 合成函数形状偏差（caps 序、options label 序、min/max/step 丢失、键序漂移） | 常驻快照 Buffer 级比对（首异字节提示）+ 批次 1 全形态覆盖（llm 含全部变体，SPEC §4 表） |
| `if` 编译语义漂移（快照不可见，SPEC §7 边界 1） | AC2 六行真值表探针；唯一消费点 `app.js:763` 留批次 2 E2E 点位 ⑤ |
| 聚合层误加 `Object.freeze` 破坏 `app.js:2055` 覆写现状 | AC6 常驻可写性断言（SPEC §5.7 明示） |
| 新增测试引入脆弱性（网络/子进程/时序） | 全部为纯静态/内存断言；`node --test` 对 test/ 内 .json 不拾取已实验证明（0018 PRD 背景 3） |
| 两批跨迭代的状态语义（BACKLOG 项跨迭代 doing） | 本 PRD 明示编排：批次 1 轮 CLOSE 时 BK-0021 保持 doing、STATE.item 续填；批次 2 轮 CLOSE 方置 done + 回执 #11 + 随批关账 BK-0023（SPEC §10 衔接条款） |

## 需求清单（REQ-0021-xx）

- REQ-0021-01：按「目标与范围·做」清单落地批次 1 全部文件（SPEC §3 步一~四批次 1 段）。
- REQ-0021-02：常驻快照比对测试落盘并全绿（AC1）。
- REQ-0021-03：守卫测试 param-handler-guard 落盘并全绿（AC3）。
- REQ-0021-04：产品提交恰一个，白名单 = 受影响文件清单表（AC9）；BACKLOG 备注回写
  随归档提交（机制件，与 0011~0020 同机制）。
- REQ-0021-05：VERIFY 按 AC1~AC9 逐条执行并落 REPORT（证据：命令输出摘要 + gate
  场景结果 + 反演演练）。
