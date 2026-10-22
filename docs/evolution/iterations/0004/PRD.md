# PRD · 迭代 0004 · BK-0006 README 能力同步：补记 ADR-0006/0007 已落地能力（DELETE 端点 + 服务端工作流/历史回放）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 12:40
> 来源：BACKLOG BK-0006（P1 / doc / S / ready / 触UI=否，`docs/evolution/BACKLOG.md:14`）；
> 主题归属 ROADMAP T4-M2（文档与实现同步，`docs/evolution/ROADMAP.md:93-97`）。
> 选题依据：ready 队列现存 3 项（BK-0006/0007/0004，`BACKLOG.md:14-16`）；最高优先级
> P1 共 2 项，按 BACKLOG 头注「同优先级按表中顺序」取表首 BK-0006（先于 BK-0007，
> 且 S 大小正是选题规则偏好）。与最近 3 次迭代零重叠：0001=T1 盘点（doc，blocked）、
> 0002=T2-M2 冒烟脚本（test，done）、0003=T2-M1 契约测试（test，done）；本项为 T4
> 文档同步，主题与改动面互斥。
> 可行性预检（针对迭代 0001 失败模式「产品提交为空」）：本项唯一产品面写入目标是
> 仓库根 `README.md`——位于 `docs/evolution/` 之外，而防打转校验仅排除
> `docs/evolution/` 前缀路径（`.zcode/workflows/evolution-iteration.dwf.ts:241-244`，
> `productPaths = changed.filter(p => !p.startsWith("docs/evolution/"))`），故本项
> 产品提交必非空，不复发 BK-0001 的 blocked 终态。

## 结论

**建议做（本迭代即做）**：一句话理由——README「持久化与部署」节止于 ADR-0005
（`README.md:67-74`），不仅缺记 DELETE 两端点，更残留一句**与已实施现状相反**的
陈述「localStorage 仍是前端当前事实源；前端接入服务端属 UI 变更，需宪法第 3 条
流程」（`README.md:74`）——而 ADR-0006（前端接入服务端持久化）与 ADR-0007（删除
能力）均已于 2026-10-21 用户批准并实施（`docs/adr/0006-frontend-persistence-ui.md:3`
状态行「已批准 · 已实施」+ §11 实施记录；`docs/adr/0007-workflow-delete.md:3` 同）。
README 是仓库门面，现行文案会误导新协作者以为前端尚未接入服务端；补记属纯文档
变更（宪法第 4 条「不适用」清单），S 大小单迭代可完整交付并直接关账 ROADMAP T4-M2
的 README 验收点。

## 触 UI 分类结论

**否。** 本项改动面仅两处：① `README.md`（文档，宪法第 4 条「不适用」清单明确
「文档」不触发门禁）；② 本迭代目录产物（`docs/evolution/iterations/0004/`，机制
文件）。不改 `apps/web`、`apps/server`、`packages/shared` 任何源码，不在任何渲染
路径上；README 中「布局还原依据」等前端记述只**新增已实施能力的文字**，不动任何
代码与视觉规格。验收仍要求 `npm run gate` 复跑全绿以防误触（AC6）。

## 背景（含代码事实源，2026-10-22 12:40 只读核实）

1. **README 滞后现状**（`README.md`，111 行）：
   - 「持久化与部署」节标题即注明「ADR-0004/0005 已落地 2026-10-20」
     （`README.md:67`）；v1 端点清单只列 `GET|PUT /api/v1/workflows[/:id]` ·
     `GET /api/v1/runs?limit=` · `GET /api/v1/runs/:id`（`README.md:72-73`），
     **无任何 DELETE 端点**。
   - `README.md:74` 陈旧陈述：「**localStorage 仍是前端当前事实源**；前端接入
     服务端属 UI 变更，需宪法第 3 条流程」——与 ADR-0006 已实施后的现状相反
     （见下条），属必须更正的错误信息，不只是缺记。
   - 常用命令表（`README.md:39-46`）缺 `npm run smoke:server`（根
     `package.json:19` 已有该脚本，BK-0002 迭代 0002 落地）。
2. **后端真实端点面**（`apps/server/src/server.ts:194-202`，本会话 grep 实查）：
   持久化 8 端点全部仅注册 `/api/v1`——GET/PUT workflows ×3 + GET runs ×2 之外，
   `app.delete('/api/v1/workflows/:id')`（server.ts:201）与
   `app.delete('/api/v1/runs/:id')`（server.ts:202）在位。runs DELETE 语义：
   活动 run 409（内存注册表 `runsById` 判活，非 DB status）+ 事务级联删除
   `run_events`（ADR-0007 §3.2 规格 + §11 实施记录；迭代 0002 冒烟已自动化覆盖
   409/404/级联语义，`docs/evolution/iterations/0002/PRD.md` REQ-0002-03/06）。
3. **前端已实施能力**（ADR-0006 §11 / ADR-0007 §11 实施记录，逐项可追溯）：
   - `apps/web/src/server-sync.js` 新增（131 行，`wc -l` 实查）：`/api/v1` fetch
     封装 + 服务端列表缓存 + 事件回放映射。
   - 「工作流」面板「服务端」分组：保存当前工作流到服务端（PUT upsert）/ 打开
     （GET :id 装载新标签页）/ 覆盖保存 / 删除（`data-wf-del` + `confirmDialog`
     确认弹窗，ADR-0007 §4）。
   - 「任务历史」面板：在线时服务端优先（GET /api/v1/runs），卡片点击展开只读
     事件回放时间线（`.logline` 行 ×事件序号）；单卡删除（含 409 文案转译）；
     离线及拉取失败回退本地 localStorage runs（本地写入路径零改动）。
   - 离线行为（双击 dist / 后端未启动）：服务端分组显示「后端未连接」、无任何
     网络请求；`file:` 协议直接 offline。
4. **ADR-0008（审批弹窗盒体样式补齐）同为已实施**（`docs/adr/0008-approve-modal-box-fix.md:3`），
   但它是 CSS 缺陷修复、无独立用户可感知能力需要在 README 记述——列入 out of
   scope（见非目标），README 不为它新增段落。
5. **不得虚构的红线事实**（README 新增文字的边界，均为本会话核实）：
   - websearch 的 `eng` 参数当前被后端完全忽略（ROADMAP T3 现状基线，
     `ROADMAP.md:72`；BK-0007 未做）——README 不得写成「支持引擎选择」。
   - MCP 工具 sqlite/browser 如实降级 not implemented（`ROADMAP.md:71`）——README
     现有记述「未实现者如实告知模型」（`README.md:57`）准确，保持不扩写。
   - 服务端历史「清空历史」按钮按 ADR-0007 C1 批复**不渲染**（ADR-0007 §3.3/§11）
     ——README 不得记述批量清空能力。
6. **防打转校验事实**：产品提交非空判据 = `docs/evolution/` 之外有改动
     （`evolution-iteration.dwf.ts:241-244`）；README.md 满足。BK-0001 当年失败的
     原因是其产出只落 `docs/evolution/ROADMAP.md`（`BACKLOG.md:11` 备注），本项
     写入目标本质不同。

## 目标

1. 关账 ROADMAP T4-M2 的 README 验收点（`ROADMAP.md:95-96`：「README 补齐 DELETE
   端点行与服务端工作流分组/历史回放/删除入口能力描述（承载项 BK-0006）」）。
2. 消除 README 与已实施现状的**矛盾陈述**（`README.md:74`），使新协作者从 README
   即可获得正确的持久化能力全景：8 个 v1 端点 + 前端在线态能力 + 离线回退语义。
3. 命令表与实际 scripts 同步（补 `smoke:server` 一行）。

## 非目标（out of scope）

- 不改任何代码（doc 项）：`apps/`、`packages/`、`tools/`、`tests/` 零改动；
  也不改 `AGENTS.md`（其仓库地图已含 server-sync.js，`AGENTS.md` 仓库地图节）。
- 不触 UI 三层；不改 `tools/pixel-gate/`、CI 配置与 golden 基线（WORKFLOW §6 护栏
  2/3）；不运行 `npm run gate:update`。
- 不为 ADR-0008 新增 README 段落（背景 4：无独立用户能力可记）。
- **不改写 `docs/ai-sdk-7-功能汇总.md`**：T4-M2 的另一验收点（该文档与
  `apps/server/src/llm.ts` 实装 API 抽查一致）在本项中只做**只读抽查**（REQ-0006-05，
  VERIFY 阶段执行）；若发现不一致，如实记录并新立项，本迭代不修。
- 不重写 README 中与实现一致的既有章节（如执行引擎表、布局还原表）；不趁势做
  「顺手润色」（WORKFLOW §1 原则 4「不做顺手优化」）。
- 不在 README 承诺任何未落地能力（背景 5 红线）。

## 用户故事

1. 作为新协作者（人类或 AI），我读 README「持久化与部署」节即可知道完整的 8 端点
   v1 契约（含 DELETE 的 404/409/级联语义）与前端在线态能力入口，而不是被一句
   「前端尚未接入」的过时陈述误导。
2. 作为仓库所有者，我需要 README 与已批准已实施的 ADR-0006/0007 能力一致，
   门面文档不落后于实现两个版本。
3. 作为协调者，我需要 T4-M2 README 验收点的关账证据（README diff + 抽查命令
   输出），并顺带完成该里程碑 ai-sdk 文档抽查点的闭环。

## 需求条目

- **REQ-0006-01 · DELETE 端点补记**：「持久化与部署」节 v1 端点清单补两行——
  `DELETE /api/v1/workflows/:id`（404 不存在）与 `DELETE /api/v1/runs/:id`
  （活动 run 409；runs 行与 run_events 同事务级联删除），与 server.ts:201-202
  及 ADR-0007 §3 语义逐字一致；沿用现清单的分隔符与括注风格（`README.md:72-73`
  现有格式）。
- **REQ-0006-02 · 前端能力补记与陈旧表述更正**：同一节内补记 ADR-0006/0007 前端
  能力（「工作流」面板服务端分组：保存/打开/覆盖保存/删除（确认弹窗）；「任务
  历史」面板：在线服务端优先 + 点击展开事件回放 + 单卡删除；离线或后端未连接时
  回退本地，本地写入路径不变），并**更正** `README.md:74` 陈旧句——更正后须
  表达：前端已接入服务端持久化（ADR-0006，2026-10-21 批准实施），localStorage
  仍是本地工作流/离线历史的存储（准确的双源语义），不得残留「前端接入属未来
  UI 变更」语义。节标题的「ADR-0004/0005 已落地」相应更新为涵盖 0006/0007。
- **REQ-0006-03 · 命令表同步**：常用命令表补一行 `npm run smoke:server`
  （后端 E2E 冒烟：/api/v1 CRUD + /run SSE 全事件链 + 删除守卫），描述与
  `package.json:19` 及 tests/smoke 实际行为一致。
- **REQ-0006-04 · 不虚构红线**：README 本次新增的全部文字必须可追溯至 ADR-0006
  §11 / ADR-0007 §11 实施记录或本 PRD 背景 1-3 所列源码行；明令禁止出现对
  未落地能力的肯定性表述（背景 5 三条抽查点：websearch eng 路由、sqlite/browser
  MCP 真实实现、服务端批量清空历史）。
- **REQ-0006-05 · ai-sdk 文档只读抽查（T4-M2 第二验收点，VERIFY 承载）**：VERIFY
  阶段对 `docs/ai-sdk-7-功能汇总.md` 与 `apps/server/src/llm.ts` 做实装 API 抽查
  一致性核对（样本 ≥5 条，由 SPEC 定清单，如 streamText/generateText/工具循环/
  usage 回传/系统提示词独立参数）；**只读，零文件改动**；发现不一致 → REPORT
  如实记录 + 建议新 BACKLOG 项，本迭代不修、且不影响 AC1–AC6 的判定。

## 非功能要求

1. **可追溯**：README 新增每句能力描述在 PRD/SPEC 中有指针（ADR 节号或 `路径:行`）；
   README 正文保持门面简洁，不内联代码行号。
2. **渲染零影响**：本迭代产品面仅 README.md 变更；产品提交前 `npm run gate` +
   `npm test` 复跑全绿（防误触兜底，AC6）。
3. **风格一致**：沿用 README 现有中英混排、表格与括注风格；增量精炼（预计
   +10～20 行），不逐 ADR 复述实施细节（细节留在 ADR）。
4. **单提交收敛**：产品提交只含 README.md（`git revert` 即完全恢复）。

## 验收标准（Given / When / Then）

- **AC1 · DELETE 端点记述**：Given README 已更新，When 检查「持久化与部署」节
  v1 端点清单，Then 含 `DELETE /api/v1/workflows/:id` 与 `DELETE /api/v1/runs/:id`
  两行，语义括注含 404（不存在）、409（活动 run，且判据为运行中而非 DB status）、
  run_events 级联删除——与 server.ts:201-202 及 ADR-0007 §3 逐条对照一致。
- **AC2 · 陈旧表述已更正**：Given 原 `README.md:74` 陈旧句，When 全文检索
  「前端接入服务端属 UI 变更」或「localStorage 仍是前端当前事实源」，Then 0 处
  残留；且更正后文字准确表达双源语义（在线态服务端能力可用 + localStorage 保留
  本地/离线存储职责）。
- **AC3 · 前端能力记述可追溯**：When 逐条核对 README 新增的前端能力句，Then 每条
  可在 ADR-0006 §11.1（服务端分组/保存/打开/覆盖、历史服务端优先/回放、离线回退）
  或 ADR-0007 §11（删除按钮/确认弹窗/防复活清理/单卡删除 409 转译）找到对应
  实施记录，无凭空条目。
- **AC4 · 不虚构能力**：When 检索 README 全文，Then 不出现以下未落地能力的肯定性
  表述——①websearch 引擎参数（eng）路由/选择；②sqlite/browser MCP 工具真实实现
  （现有「未实现者如实告知」表述允许保留）；③服务端历史批量清空（C2）。
- **AC5 · 命令表同步**：Given 根 `package.json:19` 存在 `smoke:server`，When 检查
  README 常用命令表，Then 含该行且用途描述与 tests/smoke 实际断言范围一致。
- **AC6 · 渲染零影响**：Given 本迭代产品面仅 README.md 变更，When 产品提交前运行
  `npm run gate` 与 `npm test`，Then gate 4 场景全绿（diffPx=0）、test 全绿
  （迭代 0003 后为 node --test 8 项，`STATE.md:13`）。
- **AC7 · ai-sdk 抽查闭环（只读）**：Given `docs/ai-sdk-7-功能汇总.md` 与
  `apps/server/src/llm.ts`，When VERIFY 按 SPEC 样本清单抽查 ≥5 条 API记述，
  Then 每条给出「一致 / 不一致 + 证据」结论；若存在不一致，Then REPORT 记录 +
  新 BACKLOG 项建议，且不改动该文档（本 AC 的不一致发现不判迭代 FAIL，隐瞒
  不一致才判 FAIL）。

## 依赖与风险

- **依赖**：无构建/运行时依赖（纯文档）；gate/test 基线与 2026-10-22 治理日
  全量回归一致（`docs/evolution/weekly/43.md` §二）。REQ-0006-05 依赖
  `apps/server/src/llm.ts` 源码与 ai-sdk 文档可读（均入库）。
- **风险 1 · 重蹈「产品提交为空」**（迭代 0001 失败模式）：已预检排除——README.md
  在 `docs/evolution/` 之外，防打转过滤只排除该前缀（背景 6 / PRD 头注）；SPEC
  不得把改动面挪回 docs/evolution 内。
- **风险 2 · 文档走样/过度承诺**：README 由 BUILD 代理撰写时可能夹带未实现细节 →
  REQ-0006-04 红线 + VERIFY AC3/AC4 逐条核对；反演手段 = 对照 ADR 实施记录抽查。
- **风险 3 · ai-sdk 抽查发现不一致**：按 AC7 规则处理（记录 + 新立项，不修不判
  FAIL），T4-M2 在 metrics/BACKLOG 备注中如实保留「部分关账」痕迹。
- **风险 4 · 双源语义写绕**：更正 line 74 时可能把「localStorage 仍是本地存储」
  写成「服务端已是唯一事实源」（过度）或保留旧句（不足）→ AC2 的检索式验收
  （旧句 0 残留 + 双源语义俱在）收敛此风险。

---

> 选题过程存证：本 PRD 由独立 PLAN 会话产出。ready 队列核对（`BACKLOG.md:14-16`）：
> P1 两项 BK-0006（S/doc）与 BK-0007（M/capability），按表序取 BK-0006；BK-0004
> （P2/S）殿后；无 L 项需拆分。与最近 3 次迭代（0001=T1 盘点 blocked、0002=T2-M2
> 冒烟 done、0003=T2-M1 契约测试 done）主题与改动面零重叠。代码与文档引用均于
> 2026-10-22 12:40 本会话只读核实（README.md / server.ts:194-202 / package.json:19 /
> server-sync.js 存在性 wc -l / ADR-0006/0007/0008 / evolution-iteration.dwf.ts
> 防打转过滤 / BACKLOG / ROADMAP / metrics / 三迭代 PRD）。
