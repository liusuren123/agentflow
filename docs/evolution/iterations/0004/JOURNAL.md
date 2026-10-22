# JOURNAL · 迭代 0004 · BK-0006 README 能力同步（BUILD 过程记录）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-22 12:51
> 输入：本目录 PRD.md（REQ-0006-01~04，REQ-05 为 VERIFY 只读承载）+ SPEC.md
> （§1.1 受影响文件清单为产品面全闭包：仅 README.md 四处）。
> 完整门禁（build/gate/test）与 git 提交由工作流脚本统一执行，本文只记录
> BUILD 侧实现与自检。

## 一、实现清单（与 SPEC §1.1 四处一一对应，别无其他改动）

README.md 111 行 → 120 行（净 +9，在 SPEC 行预算 +10～20 的精炼范围内；无 AC
以行数为判据）。四落点（行号为改后）：

| # | 位置 | 动作 | 要点 |
| --- | --- | --- | --- |
| 1 | `README.md:43` 常用命令表 | +1 行（`npm test` 行之后） | `npm run smoke:server` 行，描述 = SPEC §3.3 建议文案逐字（独立端口起 server：/api/v1 workflows CRUD + /run SSE 全事件链 + 删除守卫 409/200，自清理）——REQ-0006-03 |
| 2 | `README.md:68` 节标题 | 原位更新 | 「ADR-0004/0005 已落地 2026-10-20」→「ADR-0004~0007 已落地 2026-10-20/21」（SPEC §3.2(a) 建议文案逐字）——REQ-0006-02 |
| 3 | `README.md:74-77` v1 端点清单 | +2 行 DELETE + 续行 | 沿清单既有续行风格（行首空格 + `·` + 全角括注）；`GET /api/v1/runs/:id` 行句号移至末条——REQ-0006-01 |
| 4 | `README.md:78-83` 原陈旧句 | 整句替换（+5 行） | 双源语义 + 前端能力补记（SPEC §3.2(b) 正例要素 ①②③ 全含 + §3.2(c) 建议文案为基础的合并措辞）——REQ-0006-02 |

**产品面闭包核对**：`git diff --stat` 实测改动仅 `README.md`（+12/-3）+ 机制面
（STATE.md，SPEC 阶段已改的 phase 行 + 本次 BUILD phase 推进）+ 本迭代目录产物；
`apps/**`、`packages/**`、`tools/**`、`tests/**`、`AGENTS.md`、`docs/adr/**`、
`docs/ai-sdk-7-功能汇总.md` 零改动（SPEC §1.3 逐项满足）。

## 二、实现前事实复核（本 BUILD 会话逐项重读源码/ADR，非转抄 SPEC）

写入 README 的每个语义元素均在落笔前于本会话核实出处：

| 文案元素 | 本会话核实处 |
| --- | --- |
| workflows DELETE 仅 v1、404 | `apps/server/src/server.ts:201`（注册）、`:172-175`（handler，`workflow not found`） |
| runs DELETE 仅 v1、活动 409 判内存注册表、404、事务级联删 run_events | `apps/server/src/server.ts:202`、`:176-183`（`:178-179` 注释明文守卫用 runsById 非 DB status；`:182` 注释明文「runs 行 + 全部 run_events 行同一事务删除」） |
| `smoke:server` 脚本存在 | 根 `package.json:19`（`node tests/smoke/smoke-server.mjs`） |
| 前端能力 C1（保存/PUT upsert/写回 wfId）、C2（打开装新标签页）、C3（覆盖保存：目标 id=所点条目、内容=当前标签页） | ADR-0006 §4.1 + §11.1（`cloudSaveCurrent`/`openServerWorkflow`/`cloudOverwrite` 实施记录） |
| C4（删除两按钮确认弹窗 + 防复活清理）、C7（单卡删除 + 409 文案转译） | ADR-0007 §4.1/§4.3/§4.4 + §11（`data-wf-del` + `confirmDialog` + `cloudDeleteWorkflow`；`data-run-del` + `deleteRunCard`） |
| C5（在线服务端优先，拉取失败/离线回退本地）、C6（点击展开只读回放，`.logline` 行 × 事件序号）、C8（离线「后端未连接」、本地写入路径不变） | ADR-0006 §4.2/§4.5 + §11.1 ④/§11.3-e |
| 陈旧句确在其位、须更正 | 改前 `README.md:74` 原文（本会话 Read） |

## 三、BUILD 侧自检（文档检索式，非完整门禁）

按任务指令，根级完整门禁（`npm run build` / `npm run gate` / `npm test`）与
git 提交由脚本统一执行，BUILD 未运行（纯文档变更，无前端渲染路径改动；gate
全绿按 PRD AC6 为防误触兜底，由脚本取证）。以下为 SPEC §4.2 文档 E2E 的
BUILD 侧预检（git bash 单次执行，命令与真实输出）：

| # | 点位 | 命令 | 结果 |
| --- | --- | --- | --- |
| 1 | E1 陈旧句残留 | `grep -n "前端接入服务端属 UI 变更" README.md; grep -n "localStorage 仍是前端当前事实源" README.md` | 均无输出（0 残留）✓ |
| 2 | E2 DELETE 端点 | `grep -n "DELETE /api/v1/workflows/:id" README.md && grep -n "DELETE /api/v1/runs/:id" README.md` | 各 1 行：`:75`（括注含 404）、`:76`（括注含 409 + 内存注册表判据 + 事务级联删除）✓ |
| 3 | E5 命令表 | `grep -n "smoke:server" README.md` | `:43` 1 行，描述含 workflows CRUD / SSE 全事件链 / 删除守卫 409/200 / 自清理 ✓ |
| 4 | E4 禁句 | `grep -nE "eng\|引擎选择" README.md; grep -n "清空" README.md; grep -nE "sqlite\|browser" README.md` | 前两条无输出；第三条仅命中既有 `:70`「better-sqlite3」（SQLite 存储引擎记述，先于本次存在，非 MCP 工具能力句，无新增命中）✓ |
| 5 | 节标题 | `grep -n "持久化与部署" README.md` | `:68`「ADR-0004~0007 已落地 2026-10-20/21」✓ |
| 6 | 改动足迹 | `git diff --stat` | `README.md | 15 ++++++++++++---`（+12/-3）+ STATE.md（机制面）；无其他文件 ✓ |

## 四、偏差与决策记录

- 与 SPEC 零语义偏差：四落点文案均以 SPEC §3.1/§3.2/§3.3 建议文案为基，
  措辞自由度仅在允许范围内（端点两行将「进程内存注册表」表述保留、级联语义
  拆续行；前端能力段按 §3.2(c) 建议文案逐句采用）。反例逐条规避：未写「幂等
  204」、未写旧别名可用、未残留任一陈旧短语、未写「服务端已是唯一事实源」
  （保留「localStorage 仍是本地工作流与离线运行历史的存储」双源表述）。
- C9（不提供批量清空）按 SPEC 裁定省略未记——README 无义务记述「不做」的事，
  且否定式表述有被误读为能力承诺的风险，全文无「清空」新增字样即最稳形态。
- 行数 +9（预算 +10～20 的下沿略低 1 行）：SPEC 建议文案合并措辞后自然收敛，
  增量精炼符合 PRD 非功能 3 的本意（「不逐 ADR 复述实施细节」），不注水凑数。
- 红线自查（REQ-0006-04）：新增文字全部落在 §3.2 C1–C8 封闭清单内，无凭空
  条目；R1（eng 路由）/R2（sqlite/browser 实现）/R3（批量清空）三条禁句零出现。

## 五、遗留（交后续阶段）

- 脚本：`npm run build` → `npm run gate`（4 场景 diffPx=0，输出不含
  golden-created/updated）→ `npm test`（node --test 8 项）全绿后做产品提交
  （仅 `git add README.md`；Conventional Commits 建议
  `docs(readme): 补记 ADR-0006/0007 已落地能力（DELETE 端点 + 服务端工作流/历史回放/删除）（BK-0006）`，SPEC §4.3）。
- VERIFY：SPEC §4.2 E1–E6 复跑取证（E7 smoke:server 可选旁证）；REQ-0006-05
  ai-sdk 文档 × `llm.ts` 实装抽查按 SPEC §3.5 样本 S1–S7 只读执行（≥5 条，
  不一致如实记录 + 建议新 BACKLOG 项，不判 FAIL）。
