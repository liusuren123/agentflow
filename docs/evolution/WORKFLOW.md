# AgentFlow 进化工作流（Evolution Loop）

> 本文件定义基于文件产物的多智能体协作机制与定时执行方式，目标是引导软件在现有框架
> （apps/web React + apps/server TS + packages/shared）上长期、小步、可审计地进化。
> 权威顺位：`CONSTITUTION.md` > `AGENTS.md` > 本文件。修改本文件视同修改协作契约，
> 重要变更应附 ADR。

## 1. 目的与原则

1. **文件即接口**：一切协调状态与阶段产物都是仓库内文件。任何一次定时唤起都是全新上下文，
   只凭文件即可续跑；会话记忆、聊天上下文一律不算数。
2. **单一状态源**：`docs/evolution/STATE.md` 是唯一的循环状态；其他文件不得复述其结论。
3. **宪法优先**：UI 三层（视觉/DOM 结构/交互）冻结。凡触及 UI 的进化项一律隔离进
   「待批准区」，绝不自主实现；唯一通道是 ADR + 用户本人批准（宪法第 3 条）。
4. **小步进化**：一次迭代只做一件事；完成标准是 `npm run gate` 全绿 + 测试通过，
   否则回滚。不做夹带，不做顺手优化。
5. **全程可审计**：每次迭代一个目录（`iterations/NNNN/`）+ 一个常规提交；
   度量与周报沉淀在 `metrics.md` 与 `weekly/`。

## 2. 角色与阶段产物

| 阶段 | 执行者（subagent_type） | 输入 | 产物 |
| --- | --- | --- | --- |
| 协调 | 协调者（定时任务唤起的主会话） | STATE.md + 本文件 | 派发指令、护栏执法、归档；不亲自写业务代码 |
| PLAN | `product-manager` | ROADMAP、BACKLOG、metrics、近 3 次迭代 | `iterations/NNNN/PRD.md` |
| SPEC | `spec-designer` | PRD | `iterations/NNNN/SPEC.md`（架构决策另提 `docs/adr/` 草案） |
| BUILD | `code-developer` | PRD + SPEC | 代码改动 + 常规提交 + `iterations/NNNN/JOURNAL.md` |
| VERIFY | `test-manager` | PRD 验收标准 + SPEC 验收点 | `iterations/NNNN/REPORT.md`（PASS / FAIL+BUG 清单） |
| CLOSE | 协调者 | REPORT + JOURNAL | 更新 STATE / BACKLOG / metrics，生成待批准摘要 |

> 派发时协调者必须在指令中给出：迭代号、迭代目录路径、当阶段产物的落盘路径、
> 以及「先读 CONSTITUTION.md 与 AGENTS.md」的义务提示（子智能体定义见 `.zcode/agents/`）。

## 3. 文件契约

```
docs/evolution/
  WORKFLOW.md     本协议
  STATE.md        循环状态（唯一事实源，见 §3.1）
  ROADMAP.md      长期路线图（主题 → 里程碑，PM 维护）
  BACKLOG.md      排序项池 + 待批准区（PM 维护，见 §3.2）
  metrics.md      跨迭代度量表
  iterations/NNNN/PRD.md · SPEC.md · REPORT.md · JOURNAL.md
  weekly/<ISO周号>.md   周度治理报告
```

### 3.1 STATE.md 字段

| 字段 | 含义 |
| --- | --- |
| `iteration` | 当前/下一个迭代号（4 位零填充；CLOSE 时 +1） |
| `phase` | `idle / PLAN / SPEC / BUILD / VERIFY / CLOSE / stuck` |
| `item` | 处理中的 BACKLOG 项 ID（idle 时为 `-`） |
| `started` / `updated` | 本次迭代开始时间 / 最近更新时间 |
| `repair_round` | VERIFY 失败回到 BUILD 的修复轮次（上限 2） |
| `last_result` | 最近一个阶段的一句话结论（含证据指针，如 REPORT 路径） |

### 3.2 BACKLOG.md 项格式

```
| ID | 标题 | 类型 | 触UI | 优先 | 大小 | 状态 | 来源 | 备注 |
```

- 类型：`capability / refactor / debt / test / doc / ui-proposal`
- 状态：`proposed / ready / doing / blocked / pending-approval / done / failed / skipped`
- **选题规则：只可选取 `ready` 状态项**；`ui-proposal` 或任何「触UI=是」的项只能进入
  文件末尾的「待批准区」，经用户批准 + ADR 成立后方可转 `ready`。

## 4. 迭代状态机与阶段契约

```
idle → PLAN → SPEC → BUILD → VERIFY ─PASS→ CLOSE → idle
                                  └FAIL→ BUILD（修复，≤2 轮）
                                  └仍FAIL→ 回滚（git revert 本次迭代提交）→ item=failed → CLOSE
```

- **PLAN**：选题（跳过一切非 ready 项）；若 ready 队列枯竭，则本迭代改为「补题」
  （产出新 proposed/ready 项后直接 CLOSE）。PRD 必含分类结论（触UI 与否）与
  Given/When/Then 验收标准。发现触 UI → 该项转待批准区并附 ADR 草案骨架，另选题。
- **SPEC**：技术方案必须列出**受影响文件清单**与验收命令（`npm run gate` / `npm test` /
  手动 E2E 点位）；涉及架构选型的写入 ADR 草案（标注「待用户批准」）。
- **BUILD**：先跑 `npm run gate` 确认基线绿（存量差异不算自己头上）→ 按 SPEC 实现 →
  `npm run gate` + `npm test` 全绿 → 产品提交（Conventional Commits；一次迭代只做一件事、
  只出一个产品提交）。新增源文件 ≤ 400 行。实现中发现触及 UI 或需扩大影响面：立即中止，
  item 转 `pending-approval`/`blocked`，本迭代按回滚处理。
- **VERIFY**：逐条执行 PRD 验收标准 + 回归抽查（交互回归清单见 test-manager 定义）；
  REPORT 必须含证据（gate 场景结果、命令输出摘要）。FAIL 时给出 BUG-xxx 清单。
- **CLOSE**：PASS → 归档（BACKLOG 置 done、metrics 追加一行、iteration+1、phase=idle），
  随后做归档提交 `chore(evolution): 归档迭代 NNNN`（纳入迭代目录产物与 STATE/BACKLOG/
  metrics 变更），保证工作区回到干净；
  FAIL 已达上限 → revert 提交、item=failed、失败要点写入 BACKLOG 备注；刷新
  BACKLOG 待批准区摘要供用户决策。

## 5. 定时执行机制

两条自动化（由用户确认后以 CronCreate 启用；唤起词以本节为权威版本）：

### 5.1 进化心跳 `evo-heartbeat`（周一至周六 09:00，cron `0 9 * * 1-6`）

```
你是 AgentFlow 进化工作流的协调者。按顺序读取 CONSTITUTION.md、AGENTS.md、
docs/evolution/WORKFLOW.md、docs/evolution/STATE.md，然后严格按 WORKFLOW.md 执行一次「进化心跳」：
1) 安全预检：STATE.md 可解析、npm run gate 基线绿；git 工作区须干净——唯一例外是
   phase != idle 且脏文件仅限当前迭代目录与 docs/evolution/ 状态文件（上次中途中断的
   产物），此时直接续跑。其余不满足则不做任何改动，将 phase 置 stuck 并在 last_result
   写明原因后结束。
2) 若 phase != idle：按 STATE.phase 续跑当前阶段。
3) 否则从 docs/evolution/BACKLOG.md 选取最高优先级 ready 项，开启 STATE.iteration 所指迭代，
   依 PLAN→SPEC→BUILD→VERIFY→CLOSE 逐阶段派发 .zcode/agents/ 对应子智能体
   （派发指令中给出迭代目录与相关文件路径，并提示其先读宪法与 AGENTS.md）。
4) 铁律：触 UI 的项只能转入待批准区；绝不自主实现 UI 变更；绝不运行 npm run gate:update；
   绝不强制推送；一次迭代至多一个产品提交 + 一个归档提交。与 CONSTITUTION.md 冲突时以宪法为准。
```

### 5.2 周度治理 `evo-governance`（周日 09:00，cron `0 9 * * 0`）

```
你是 AgentFlow 进化工作流的协调者，执行「周度治理」（治理日不写业务代码）。读取
CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md、STATE.md、BACKLOG.md、ROADMAP.md、metrics.md：
1) 派发 product-manager：结合 metrics 与近周迭代重排 BACKLOG、更新 ROADMAP 里程碑、
   补充枯竭的 ready 项（触 UI 项仍入待批准区）。
2) 派发 test-manager：全量回归（npm run gate + npm test + 后端冒烟），产出体检结论。
3) 汇总周报 docs/evolution/weekly/<ISO周号>.md：本周迭代结果、指标趋势、待批准清单、
   风险与建议；STATE 为 stuck 或连续 failed 的项在周报显著标注，等待用户决策。
```

### 5.3 续跑与熔断

- 每次唤起先读 STATE：`phase != idle` 即从该阶段续跑（阶段产物已落盘，续跑安全）。
- 熔断条件（任一即本次不动代码，置 `stuck` 并写明原因）：工作区不干净；gate 基线红；
  连续 2 次迭代 failed 于同一 BACKLOG 项；子智能体报告需求不可解。

## 6. 安全护栏（硬性）

1. 触 UI（视觉/DOM 结构/交互三层）= 只进待批准区，绝不自主实现（宪法第 3 条）。
2. `npm run gate:update` / golden 重录：仅允许出现在已获用户批准的 ADR 迭代内。
3. 不修改 `CONSTITUTION.md`、`AGENTS.md`、`tools/pixel-gate/`、CI 配置；进化机制自身
   （本文件）的修订需在治理周报中提出并征得用户同意。
4. 密钥不入库（`.env` 模板除外）；出站请求走 guard；文件工具限沙箱；代码节点子进程
   + 超时（细则见 AGENTS.md 硬性约定）。
5. 推送仅在远端已配置且 gate 全绿时进行；CI `ui-constitution` 红则先修。
6. 修复循环 ≤ 2 轮，超限回滚；`git revert` 是唯一的回滚手段，禁止 force/reset。

## 7. 长期进化引导

- 主题方向维护在 `ROADMAP.md`（当前四主题：移植收尾与骨架一致性 / 质量基建 /
  后端执行能力 / 文档与治理），心跳只从 ROADMAP 派生的 BACKLOG 项中取活。
- 每迭代向 `metrics.md` 追加一行（结果、gate、测试、行数差、bug 数），治理周报
  汇总趋势，PM 依趋势调主题权重——形成「度量 → 决策 → 迭代」的长期闭环。
- 待批准区是用户的主权接口：用户在文件中批复（或对话中确认）即进入修宪通道
  （ADR → 批准 → 实现 → 同 PR 重录 golden）。
