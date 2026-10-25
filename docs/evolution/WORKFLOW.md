# AgentFlow 进化工作流（Evolution Loop）

> 本文件定义基于文件产物的多智能体协作机制与定时执行方式，目标是引导软件在现有框架
> （apps/web React + apps/server TS + packages/shared）上长期、小步、可审计地进化。
> 权威顺位：`CONSTITUTION.md` > `AGENTS.md` > 本文件。修改本文件视同修改协作契约，
> 重要变更应附 ADR。
>
> **v2（2026-10-22，经用户会话批准）**：用户界面迁移 GitHub Issues（方向注入 /
> 批复 / 回执）；侦察制补题（无证据不立项）；空转合法；S 项免独立 SPEC；doc 项
> 归治理日批处理；权限边界独立成 `POLICY.md`。旧「BACKLOG 待批准区表」迁移
> issue（label `needs-approval`）。
>
> **v3（2026-10-25，经用户会话明示批准）**：迭代执行改为**特性分支 + 隔离工作树**
> 模型——每轮迭代在 `feat/NNNN-<slug>` 分支与 `.zcode/worktree/feat/NNNN-<slug>/`
> 工作树中进行（实现、规格、验收全在工作树内，主干保持干净），完成后由专职
> **合并仲裁员**合回主干，并在主干上完成端到端复测与日志/图像证据留档。
> 用户可同时开多路工作流而互不干扰：迭代号原子分配防撞号，主干合并与最终记账
> 由排他锁串行化。

## 1. 目的与原则

1. **文件即接口**：一切协调状态与阶段产物都是仓库内文件。任何一次定时唤起都是全新上下文，
   只凭文件即可续跑；会话记忆、聊天上下文一律不算数。
2. **单一状态源**：`docs/evolution/STATE.md` 是唯一的循环状态；其他文件不得复述其结论。
3. **宪法优先**：UI 三层（视觉/DOM 结构/交互）冻结。凡触及 UI 的进化项一律隔离进
   「待批准区」，绝不自主实现；唯一通道是 ADR + 用户本人批准（宪法第 3 条）。
4. **小步进化**：一次迭代只做一件事；完成标准是 `npm run gate` 全绿 + 测试通过，
   否则回滚。不做夹带，不做顺手优化。
5. **全程可审计**：每次迭代一个目录（`iterations/NNNN/`）+ 两个分支内提交
   （产品提交 + 机制件提交）+ 一个主干合并提交；度量与周报沉淀在 `metrics.md`
   与 `weekly/`。
6. **隔离优先（v3）**：迭代期间一切改动发生在**专属工作树**内，主干工作区保持
   干净——这是多路工作流并行不冲突的前提。主干只在「合并 + 复测 + 最终记账」
   阶段被触碰，且该阶段由排他锁串行化。
7. **Issue 即用户界面**：方向注入（用户随时开 issue，label `user-request`）与
   批复（在 `needs-approval` issue 评论「批准 / 驳回」）经 GitHub Issues，手机
   可达；仓库文件仍是执行状态的唯一事实源，issue 是通知与主权界面而非状态机。
8. **空转合法**：无带证据的可做项时，心跳做完基线体检即收尾，不立项凑数、
   不为跑而跑；「本轮什么都没做」是合格结果。

## 2. 角色与阶段产物

| 阶段 | 执行者（subagent_type） | 输入 | 产物 |
| --- | --- | --- | --- |
| 协调 | 协调者（定时任务唤起的主会话） | STATE.md + 本文件 | 派发指令、护栏执法、归档；不亲自写业务代码 |
| PLAN | `product-manager` | issue 面板 + 侦察档案、ROADMAP、BACKLOG、metrics、近 3 次迭代 | `iterations/NNNN/PRD.md`（工作树内） |
| SPEC | `spec-designer` | PRD | `iterations/NNNN/SPEC.md`（架构决策另提 `docs/adr/` 草案） |
| BUILD | `code-developer` | PRD + SPEC | 代码改动 + `iterations/NNNN/JOURNAL.md`（工作树内） |
| VERIFY | `test-manager` | PRD 验收标准 + SPEC 验收点 | `iterations/NNNN/REPORT.md`（PASS / FAIL+BUG 清单） |
| MERGE | `merge-arbiter` | 特性分支 + 主干 | 合并提交、冲突分类解决、`iterations/NNNN/MERGE.md`、主干复测结论 |
| CLOSE | 协调者 | REPORT + MERGE | 主干侧更新 STATE / BACKLOG / metrics，issue 回执关单 |

> 派发时协调者必须在指令中给出：迭代号、迭代目录路径、当阶段产物的落盘路径、
> 以及「先读 CONSTITUTION.md 与 AGENTS.md」的义务提示（子智能体定义见 `.zcode/agents/`）。
>
> **路径纪律（v3，硬性）**：subagent 的文件工具（Read/Write/Edit）基准目录是
> **工作区根**，不是工作树。工作树阶段的派发（PLAN / SPEC / BUILD / VERIFY）
> **必须给带工作树前缀的完整路径**（形如
> `.zcode/worktree/feat/<分支>/docs/evolution/iterations/NNNN/PRD.md`）；
> 裸相对路径会落到主干，隔离即失效——这是 v3 最易踩的坑。
> 主干阶段的派发（MERGE / CLOSE）用主干相对路径。

## 3. 文件契约

```
docs/evolution/
  WORKFLOW.md     本协议
  STATE.md        循环状态（唯一事实源，见 §3.1）
  ROADMAP.md      长期路线图（主题 → 里程碑，PM 维护）
  BACKLOG.md      排序项池（PM 维护，见 §3.2）
  POLICY.md       决策权限表（自主区 / 需批准区 / 禁止区；用户直接编辑即生效）
  metrics.md      跨迭代度量表
  iterations/NNNN/PRD.md · SPEC.md · REPORT.md · JOURNAL.md · MERGE.md
  iterations/NNNN/evidence/   合并后主干复测证据（日志 .log + 图像 .png + manifest.json）
  weekly/<ISO周号>.md   周度治理报告
```

**工作树与分支（v3，本机不入库）**：

```
.zcode/worktree/feat/NNNN-<slug>/    本轮迭代的隔离工作树（git worktree）
  分支 feat/NNNN-<slug>（迭代号原子分配，见 §4 预检）
.zcode/locks/merge.lock              主干合并排他锁（合并 + 最终记账期间持有）
.zcode/tools/wt.mjs                  工作树生命周期辅助器（分配/准备/执行/清理/加锁）
.zcode/tools/evidence.mjs            图像证据采集器（确定性截图 + manifest）
.zcode/agents/merge-arbiter.md       合并仲裁员职责定义
```

> 工作树内 `node_modules` 顶层依赖链接到主仓库，但 `@agentflow/*` 必须指向
> **工作树自身**（否则工作树编译的是主干源码，隔离失效）。

### 3.1 STATE.md 字段

| 字段 | 含义 |
| --- | --- |
| `iteration` | 下一个可分配的迭代号（4 位零填充；CLOSE 时 +1）。v3 中它由**原子分配器**与分支占用共同决定，撞号会自动顺延 |
| `phase` | `idle / PLAN / SPEC / BUILD / VERIFY / CLOSE / stuck`（工作树内的过程态；主干上的该字段在最终记账时收尾为 `idle`） |
| `item` | 处理中的 BACKLOG 项 ID（idle 时为 `-`） |
| `started` / `updated` | 本次迭代开始时间 / 最近更新时间 |
| `repair_round` | VERIFY 失败回到 BUILD 的修复轮次（上限 2） |
| `last_result` | 最近一个阶段的一句话结论（含证据指针，如 REPORT / MERGE 路径） |

> **记账位置（v3）**：`STATE.md` / `BACKLOG.md` / `metrics.md` 的**最终记账在主干侧、
> 合并复测之后、合并锁内**统一完成——终态取决于主干复测结果，合并前无法确定。
> 工作树内的同名文件只承载过程态（phase 推进），不随分支合入主干。

### 3.2 BACKLOG.md 项格式

```
| ID | 标题 | 类型 | 触UI | 优先 | 大小 | 状态 | 来源 | 备注 |
```

- 类型：`capability / refactor / debt / test / doc / ui-proposal`
- 状态：`proposed / ready / doing / blocked / pending-approval / done / failed / skipped`
- **选题规则：只可选取 `ready` 状态项**；`ui-proposal` 或任何「触UI=是」的项由脚本
  开 `needs-approval` issue（v2 起待批准区在 GitHub Issues，不在本文件）。
- 来源列可填 `issue#N`（user-request 收录或批复转 ready 的项）：完成或失败由脚本
  回执对应 issue（done 关单 / failed 留开放）。

## 4. 迭代状态机与阶段契约

```
（主干）预检 → 分配迭代号+建工作树 → 工作树基线门禁
   ↓                                    ↓
   └────────── 工作树内 ────────────────┘
   PLAN → SPEC → BUILD ⇄ VERIFY（修复 ≤2 轮）→ 特性分支提交
                                                    ↓
                              （主干，加合并锁）MERGE：合并 + 冲突仲裁
                                                    ↓
                                    主干复测（build/gate/test/smoke）+ 证据留档
                                                    ↓
                                    CLOSE：最终记账（STATE/BACKLOG/metrics）+ issue 回执
                                                    ↓
                                        工作树与分支清理 → idle
```

- **预检（v3 口径）**：① 主干**不得有未提交的产品代码改动**（机制件允许并行存在，
  合并时分类解决）；② metrics 连败熔断（连续 3 次 failed → 本轮不动代码）；
  ③ **迭代号原子分配**——扫描主干已有迭代目录 ∪ 既有 `feat/*` 分支 ∪ 在途 worktree
  分支取最大号 +1，且 git ref 创建本身原子 → 用户同时开多路工作流不撞号；
  ④ 建立工作树并准备依赖；⑤ **基线门禁在工作树内跑**（build/gate/test），
  基线红 = 本轮起点已坏，不开工。
  注：v2 的「主干工作区必须完全干净」「`phase != idle` 即拒绝开工」两条在 v3 取消
  ——前者会阻塞并行路，后者已由迭代号分配与合并锁取代。
- **PLAN**：选题优先序：① 用户 issue 批复产生的 ready 项（修宪轮）→ ② BACKLOG
  最高优先 ready 项（优先 S/M；**doc 类型项心跳不选**——攒治理日批量处理）→
  ③ 侦察补题。PRD 必含分类结论（触UI 与否）与 Given/When/Then 验收标准；S 项
  （非 doc、非触 UI）可免独立 SPEC（PRD 内嵌受影响文件清单与验收口径，标 skipSpec）。
  发现触 UI → 该项置 `pending-approval`，由脚本开 `needs-approval` issue。
  PLAN 产出的 PRD 与 BACKLOG 过程改动写在**工作树内**。
- **侦察（ready 枯竭时）**：脚本先廉价采集证据档案（代码残缺标记 / 悬挂 run 探针 /
  issue 面板；治理日补充覆盖差集、文档漂移、dogfooding），PM 仅可依证据立项——
  每个新项注明证据指针（文件:行 / 探针输出 / issue 链接），**无证据不立项**；
  仍无候选则本轮**空转收尾**：仅更新主干 STATE 一行（last_result/updated），无迭代
  目录、无 metrics 行、无提交、不派后续 subagent，工作树直接清理。
- **SPEC**：技术方案必须列出**受影响文件清单**与验收命令（`npm run gate` / `npm test` /
  手动 E2E 点位）；涉及架构选型的写入 ADR 草案（标注「待用户批准」）。
- **BUILD**：在工作树内按 SPEC 实现 → **工作树内** `npm run build` + `npm run gate` +
  `npm test` 全绿 → 产品提交（Conventional Commits；一次迭代只做一件事）。
  新增源文件 ≤ 400 行。实现中发现触及 UI 或需扩大影响面：立即中止，
  item 转 `pending-approval`/`blocked`，本迭代按回滚处理（工作树整体丢弃，主干零影响）。
  修宪轮（用户已 issue 批准的 UI/golden 变更）：SPEC 须含 golden 重录方案；脚本在
  gate 失败时允许执行一次 `npm run gate:update`（宪法第 3 条通道，issue 批复在案）；
  golden 权威仍在 CI，推送后须盯 `ui-constitution`。
- **VERIFY**：逐条执行 PRD 验收标准 + 回归抽查（交互回归清单见 test-manager 定义）；
  REPORT 必须含证据（gate 场景结果、命令输出摘要）。FAIL 时给出 BUG-xxx 清单。
- **分支提交（v3）**：两个提交——① 产品提交（只含 BUILD 申报的 `productFiles`
  白名单，外部工具骨架等清单外文件不得混入）；② 机制件提交（迭代目录产物
  PRD/SPEC/JOURNAL/REPORT + BACKLOG 过程改动 + ADR 草案）。
- **MERGE（合并仲裁，v3 新增阶段）**：持**合并排他锁**，在主干执行
  `git merge --no-ff <分支>`。冲突**按类解决**（职责见 `.zcode/agents/merge-arbiter.md`）：
  `STATE.md` 以主干为基线推进；`metrics.md` 两侧行都保留；`BACKLOG.md` 同 ID 取语义
  更靠后的状态、异 ID 两侧都保留；**产品代码冲突不得自行择一**，如实报告交用户裁决。
  解决后必须自检：冲突标记零残留 + 两侧实质内容都在（机械 `checkout --ours/--theirs`
  会整段覆盖另一侧、丢内容）。
  合并成功后**在主干跑端到端复测**：`npm run build` / `npm run gate` / `npm test` /
  `npm run smoke:server`，逐项记录真实退出码；任一项红如实报告失败，不得放宽门禁、
  不得为变绿而重录 golden。证据写入 `iterations/NNNN/evidence/`（日志 + 图像 + manifest），
  结论写入 `iterations/NNNN/MERGE.md`。
- **CLOSE**：合并复测通过后，在**主干侧、合并锁内**做最终记账（BACKLOG 置终态、
  metrics 追加一行、STATE 的 phase=idle / iteration+1 / last_result 含复测与证据路径），
  随后提交归档（`chore(evolution): 归档迭代 NNNN`）与证据产物；工作树与分支清理。
  合并受阻（产品代码冲突待裁决 / 锁占用超时）→ 成果保留在分支与工作树，
  主干不记账、不关单，等下一轮或用户处置。
  来源为 `issue#N` 的项：脚本回执对应 issue（done 关单 / failed 留开放待重试）；
  心跳开头同步 needs-approval 批复（批准→修宪通道立项 / 驳回→关单+skipped）与
  user-request 收录（循环的 issue 评论一律带 🤖 前缀，批复仅认用户本人）。

## 5. 定时执行机制

自动化由**用户在客户端手动创建并持有**（AI 协作者不代建、不代改）；唤起词以本节为
权威版本，复制即用。推荐组合：定时·心跳（每天）+ 定时·治理（每周日）；闲时任务用于
按需补跑，同一描述即可。

### 5.1 定时 · 进化心跳（推荐每 2 小时，cron `0 */2 * * *`；夜间降本可用 `0 9-23/2 * * *`，
标题「进化心跳（每 2 小时）」。慢节奏场景退回每天一次亦可，同一描述通用）

执行引擎为混合架构：协调者优先调用**保存的项目工作流 `evolution-iteration`**
（`.zcode/workflows/evolution-iteration.dwf.ts`，本机文件、不入库；CreateWorkflow 的
saved 源、无参数）。工作流把 §4 状态机脚本化：基线预检（连败熔断 + 主干产品改动
扫描 + 迭代号原子分配 + 工作树基线门禁）、GitHub issue 同步与回执、侦察档案采集
与空转收尾、选题/规格/实现/验收四角色 subagent（各自先读 `.zcode/agents/` 职责定义）、
**工作树内** build/gate/test 门禁、修复循环 ≤2、特性分支双提交（产品 + 机制件）、
**合并仲裁员合回主干并检出解决冲突**、**主干端到端复测 + 日志与图像证据留档**、
主干侧最终记账与归档提交、工作树与分支清理。工作流不可用
（未保存/平台需确认/报错）时回退为按 §4 手动协调。工作流 v2 能力：GitHub issue
同步与回执（user-request 收录 / needs-approval 批复处理 / 完成关单）、侦察档案
采集与空转收尾、S 项免 SPEC、修宪轮 gate:update 通道。手动回退路径不处理 issue
同步（工作流恢复后自动补齐），其余按 §4。任务描述：

```
你是 AgentFlow 进化工作流的协调者。按顺序读取 CONSTITUTION.md、AGENTS.md、
docs/evolution/WORKFLOW.md、docs/evolution/STATE.md，然后执行一次「进化心跳」：
1) 预检：STATE.md 可解析；主干工作区无未提交的产品代码改动（机制件共存属正常，
   由合并仲裁阶段分类解决）；metrics 无连续 3 次失败的跨项熔断。任一不满足 → 置
   stuck 收尾，不做任何改动。
2) 并发判定（v3）：**允许多路并行**——迭代号由工作流原子分配（不撞号），主干合并
   与最终记账由排他锁串行化，故不同工作流可同时运行、互不冲突。仅需确认本会话没有
   尚未收尾的同源运行：用 ListWorkflowRuns（statuses=["running","pending"]）核对，
   对标注 possibly_interrupted 的条目用 GetWorkflowRun 复核——已终态（errored/stopped/
   interrupted/superseded）不算在跑；仍显示 running 且确属本会话未收尾的，才等待或
   报告该 run id（跨会话的在途运行不阻塞本次启动）。
3) 首选路径：用 CreateWorkflow 的 saved 源调用项目工作流 evolution-iteration（无参数），
   一次调用完成整个迭代（内含预检 / 迭代号分配与工作树建立 / 工作树基线门禁 /
   issue 同步与批复处理 / 侦察与空转判定 / PLAN / SPEC（S 项可免）/ BUILD+工作树内
   门禁 / VERIFY / 修复循环≤2 / 特性分支双提交 / 合并仲裁与冲突解决 / 主干端到端复测
   与日志图像证据留档 / 主干最终记账与归档提交 / 工作树清理 / issue 回执）。
   运行结束后向用户转述其结论即可，不要重复执行其中的阶段。
4) 回退路径：工作流未保存、调用被拒或报错时，按 WORKFLOW.md §4 手动协调执行一次迭代
   （逐阶段派发 .zcode/agents/ 子智能体；同样遵守工作树隔离与路径纪律）。
5) 铁律：触 UI 的项只能转入待批准区；绝不自主实现 UI 变更；绝不运行 npm run gate:update；
   绝不强制推送。与 CONSTITUTION.md 冲突时以宪法为准。
```

### 5.2 定时 · 周度治理（建议每周日 10:00，cron `0 10 * * 0`，标题「周度治理（每周日 10:00）」）

```
你是 AgentFlow 进化工作流的协调者，执行「周度治理」（治理日不写业务代码）。按顺序读取
CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md、docs/evolution/STATE.md、
docs/evolution/BACKLOG.md、docs/evolution/ROADMAP.md、docs/evolution/metrics.md 后：
1) 派发 product-manager：结合 metrics 与近周迭代重排 BACKLOG、更新 ROADMAP 里程碑、
   补充枯竭的 ready 项；批量消化 doc 类积压项；产出覆盖差集 / 文档漂移 / dogfooding
   （用浏览器真实跑一条工作流记摩擦点）三类侦察证据，可开 scout-proposal issue 作通知。
2) 派发 test-manager：全量回归（npm run build + npm run gate + npm test + 后端冒烟），
   产出体检结论。
3) 汇总周报 docs/evolution/weekly/<ISO周号>.md：本周迭代结果、指标趋势、待批准清单、
   风险与建议；STATE 为 stuck 或连续 failed 的项在周报显著标注，等待用户决策。
4) 铁律：不写业务代码、不做产品提交；与 CONSTITUTION.md 冲突时以宪法为准。
```

### 5.3 闲时 · 补跑心跳（按需一次性，无固定时间，标题「进化心跳·闲时补跑」）

任务描述直接复制 §5.1 全文。闲时任务适合：心跳因 stuck/环境问题中断后的补跑、
BACKLOG 积压时的加急消化；执行时按同一状态机续跑，不会与定时心跳冲突（预检兜底）。

### 5.4 续跑与熔断

- 每次唤起先读 STATE：`phase != idle` 说明有迭代在途（v3 中可能正是另一路并行运行）。
  **不据此拒绝开工**——并行由迭代号原子分配与合并锁保证安全；在途运行的成果由各自
  的工作树与分支承载，互不覆盖。
- 熔断条件（任一即本次不动代码，置 `stuck` 并写明原因）：主干有未提交的**产品代码**
  改动；gate 基线红（工作树内基线或主干复测）；连续 3 次迭代 failed（跨项熔断）；
  连续 2 次迭代 failed 于同一 BACKLOG 项；子智能体报告需求不可解。
- 续跑语义（v3）：迭代的阶段产物在工作树内（`iterations/NNNN/`），分支未合并前成果
  保留在分支与工作树中；合并受阻时成果同样保留，等下一轮或用户处置——**不丢弃**。

## 6. 安全护栏（硬性）

1. 触 UI（视觉/DOM 结构/交互三层）= 只进待批准区，绝不自主实现（宪法第 3 条）。
2. `npm run gate:update` / golden 重录：仅允许出现在已获用户批准的 ADR 迭代内。
3. 不修改 `CONSTITUTION.md`、`AGENTS.md`、`tools/pixel-gate/`、CI 配置；进化机制自身
   （本文件）的修订需在治理周报中提出并征得用户同意。
4. 密钥不入库（`.env` 模板除外）；出站请求走 guard；文件工具限沙箱；代码节点子进程
   + 超时（细则见 AGENTS.md 硬性约定）。
5. 推送仅在远端已配置且 gate 全绿时进行；CI `ui-constitution` 红则先修。
6. 修复循环 ≤ 2 轮，超限回滚；`git revert` 是唯一的回滚手段，禁止 force/reset。
7. issue 操作护栏：只用 gh CLI；循环的 issue 评论一律带 🤖 前缀；绝不代用户批复
   `needs-approval`（批复仅认用户本人评论，POLICY.md 禁止区）；`gate:update` 仅
   允许出现在修宪轮（issue 批复在案）。
8. **工作树隔离（v3）**：迭代期间禁止在主干工作区写入产品代码——一切改动落在
   `.zcode/worktree/feat/<分支>/` 内。subagent 派发必须给**带工作树前缀的完整路径**
   （裸相对路径会落到主干，隔离失效）。主干只在合并 + 复测 + 最终记账阶段被触碰，
   且该阶段持合并排他锁。
9. **合并仲裁边界（v3）**：机制件冲突按类解决（定义见 `.zcode/agents/merge-arbiter.md`）；
   **产品代码冲突不得自行择一**，如实报告交用户裁决。合并后必须在主干实跑复测，
   禁止伪造通过、禁止为变绿而放宽门禁或重录 golden。

## 7. 长期进化引导

- 主题地图维护在 `ROADMAP.md`（当前四主题：移植收尾与骨架一致性 / 质量基建 /
  后端执行能力 / 文档与治理）。v2 起心跳取活来源为：issue 批复项 → BACKLOG ready
  项 → 带证据侦察候选；ROADMAP 不再是唯一来源，但仍是主题追溯锚点。
- 每迭代向 `metrics.md` 追加一行（结果、gate、测试、行数差、bug 数），治理周报
  汇总趋势，PM 依趋势调主题权重——形成「度量 → 决策 → 迭代」的长期闭环。
- `needs-approval` issue 是用户的主权接口：用户评论「批准」（或对话中确认）即
  进入修宪通道（ADR → 实现 → 同迭代重录 golden）；决策权限边界见 `POLICY.md`
  （用户直接编辑该文件即调整授权范围，即时生效）。
