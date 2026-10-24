# JOURNAL · 迭代 0017 · BK-0027 真 MCP client 传输选型 SPEC 先行（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 17:05
> 输入：`PRD.md`（REQ-0027-01~04 / AC1~AC6；触UI=否、纯文档轮、skipSpec=false）+
> `SPEC.md`（§0 硬前置判定通过：零代码/零依赖/零契约；§1 受影响文件两路径白名单；
> §2 模块边界——BUILD 仅 BACKLOG 回写 + ADR 复核后原样纳入；§7 回写模板字面量；
> §8 验收口径；§9 回滚）。
> 本轮零代码 / 零依赖 / 零契约：未触碰 `apps/**`、`packages/**`、`tests/**`、
> `tools/**`、`.github/**`、package.json / package-lock.json 任何字节。
> 完整门禁（build / gate / test / smoke:server）与 git 提交由脚本统一执行，BUILD
> 未自行运行。STATE.md 已按派发指令更新：`phase: SPEC → BUILD`，
> `updated: 2026-10-24 17:05`（沿 0016 先例仅动 phase/updated 两字段）。

## 1. 改动清单（产品提交面 = AC4 白名单两路径；STATE/JOURNAL 为机制文件）

| 文件 | 净改动 | 改动内容 |
| --- | --- | --- |
| `docs/adr/0012-mcp-client-transport.md` | 新增（SPEC 阶段已落盘，BUILD 复核后**原样纳入，零改动**） | 278 行（≤400 预算）：六要素齐备——§1 动机与现状证据（伪 MCP 五内置 + 前端原型模拟数据 + 竞品对照）/ §2 传输对比矩阵（stdio × Streamable HTTP × 6 维度）/ §3 传输结论（两者都做 · 统一 McpConnection 四方法抽象 · Streamable HTTP 先行）/ §4 依赖选型（推荐 `@modelcontextprotocol/client` ^2.4，否决 v1 与手写）/ §5 调研记录（2026-10-24 六条来源）/ §6 安全边界（stdio 白名单+超时+生命周期；HTTP guard 网关收口 + mcpFetch 草图）/ §7 env 语义三案（A env 注册表推荐）/ §8 三子项定界索引 + 模块草图 / §9 影响面与不做范围 / 附录 A needs-approval issue 草案字面量（标题 + 正文五要素）。:3 状态行与头部显著声明双位标注「草案 · 待用户批准，批准前零实现」 |
| `docs/evolution/BACKLOG.md` | +3/−3（三行**备注列原地替换**，表结构零变化） | BK-0028 / BK-0029 / BK-0030 三行备注替换为 SPEC §7 模板**字面量逐字粘贴**（每行四要素：受影响文件 / 验收口径 / 依赖关系 / 需批准面与转 ready 条件=issue 获批）；其余列（含状态 `proposed`）逐字未动；**BK-0013 行（skipped）零改动**（HEAD 对比 IDENTICAL）；BK-0027 行状态流转归脚本/CLOSE，BUILD 未碰 |

## 2. ADR 复核记录（BUILD 义务，SPEC §2「不改 ADR 正文，矛盾即中止」）

复核方法：ADR 引用的代码指针本会话逐一 Read/grep 亲核。**结论：ADR 技术结论与
代码现状无矛盾，原样纳入，无需中止。**

命中的指针（抽样远超 AC6 下限，全部 file:line 精确命中）：

- `tools.ts:26-73`（IMPL 五内置写死映射）、`:59`/`:60`（sqlite/browser null）、
  `:81-85`（stubOf）、`:104-116`（collectTools）、`:46`/`:51`（fetch 15s /
  download 20s 超时）、`:4-5`（如实降级不伪造原则）；
- `guard.ts:33-56`（assertPublicUrl）、`:39-40`（ALLOW_PRIVATE_NET=1 逃生提示）、
  `:59-62`（guardedFetch）、`:64-68`（固定主机网关安全论述注释）、`:77`/`:85`/`:99`
  （bocha 15s / ddg 12s / searxng 12s）、`:88-100` 与 `:93-100`（searxngSearch
  动态主机网关，行段射程内双口径均命中）；
- `llm.ts:9`（import collectTools）、`:38`（调用，位于 async handler 内——异步化
  无结构性障碍的主张成立）、`:54`（本仓 zod 3 schema 进 AI SDK tool()）；
- `config.ts:28-35`（13 个 env 变量清单，逐一点数=13）、`:49-63`（EnvSchema zod
  fail-fast）；
- `app.js:102`（「原型模拟数据」注释）、`:103-114`（MCP_SERVERS 五项）、
  `:115-121`（SKILL_LIST）、`:123-127`（capSummary 只计数不辨来源）；
- `code.ts:50-53`（spawn 子进程 + 5s 超时强杀——实际路径 `apps/server/src/code.ts`
  （src 平铺无 handlers/ 子目录），:50 spawn / :53 setTimeout kill 精确命中）；
- `tsconfig.json:4-5`（module/moduleResolution NodeNext）；
- `apps/server/package.json` 依赖面（无任何 MCP SDK；zod `^3.24.0` floor 属实，
  佐证 ADR §4 案 B peer 违例论证）；`sessions.ts:167` abortActiveSessions +
  `server.ts:228` 停机链（grep 亲核，ADR §6.1 生命周期先例）。

**唯一偏差（指针级行号偏移，不构成技术矛盾，未改 ADR 正文）**：ADR §4 引
`"type":"module"（package.json:4）`——实际在 `apps/server/package.json:5`
（:4 为 `"private": true,`）；主张本身（apps/server 为 ESM type:module）经本会话
Read 亲核为**真**。按 SPEC §2「BUILD 不改 ADR 正文」记录在案、原样纳入。SPEC §8
AC6 建议抽样六条（tools.ts:26-73 / guard.ts:88-100 / llm.ts:38 / app.js:103-114 /
config.ts:49-63 / code.ts:50-53）不含此指针，且六条本会话已全部命中——AC6 按
建议抽样不受影响；若 VERIFY 扩大抽样命中该条，以本节记录为准（事实成立、行号偏一）。

## 3. 自检（BUILD 内执行；完整门禁与 git 提交由脚本统一执行，未自行运行）

| 检查 | 命令（本会话实跑） | 结果 |
| --- | --- | --- |
| 回写逐字性（AC2 前半） | `diff <(sed -n '137p' SPEC.md) <(BACKLOG BK-0028 备注单元格)`（:143/:149 同法） | **VERBATIM-OK ×3**——三行备注与 SPEC §7 模板字面量字节级一致 |
| BK-0013 行不变式（AC2） | `diff <(git show HEAD:BACKLOG.md \| grep "^\\| BK-0013 \\|") <(worktree 同行)` | **IDENTICAL**（逐字零改动） |
| proposed 不变式（AC2） | `grep "^\\| BK-00(28\\|29\\|30) \\|" BACKLOG.md \| awk -F'\\|' '{print $2 $8}'` | 三行状态均 `proposed` ✓（全表 proposed 计 10 行） |
| 回写范围 | `git diff --stat -- docs/evolution/BACKLOG.md` | **3 insertions(+), 3 deletions(-)**——恰三行原地替换，表结构/零新行 |
| 白名单（AC4 半证，提交前态） | `git status --porcelain` + `git diff -- apps packages tests tools .github package.json package-lock.json CONSTITUTION.md AGENTS.md README.md docs/evolution/ROADMAP.md docs/evolution/metrics.md \| wc -l` | 改动恰 `M BACKLOG.md` / `M STATE.md` / `?? docs/adr/0012-*` / `?? iterations/0017/`（后两属机制文件，产品提交面仅前二白名单）；禁止路径 diff **0 行**（含 package-lock.json 零变化=零依赖引入之半证；完整 AC4 证明=产品提交后 `git show --numstat`） |
| ADR 行数预算（非功能 4） | `wc -l docs/adr/0012-mcp-client-transport.md` | **278** ≤400 ✓（与 SPEC §1 所记 278 一致） |
| 草案双位标注（AC1） | `grep -n "草案 · 待用户批准" docs/adr/0012-*.md` | `:3` 命中（+头部显著声明块 :14-17，全文 Read 亲核） |

## 4. 声明与过程事件

- **POLICY 合规形态**：ADR 内规划的「新增 npm 依赖 / 出站类别 / env 语义」全部
  仅以文字方案存在；BK-0028~0030 维持 `proposed`（转 ready 唯一条件 = 对应
  needs-approval issue 获用户本人批复）；issue 草案仅 ADR 附录 A 文本——未开
  issue、未代批（POLICY 禁止区）。
- **AC5 回归面**：纯文档轮零代码改动，build/gate/test/smoke 四命令为纯回归面，
  按派发由工作流脚本统一执行；BUILD 未自行运行（前端渲染路径零触碰，宪法第 5
  条 gate 义务由脚本门禁承载）。
- 环境注记：Windows 下 `git diff` 对 BACKLOG.md 报 LF→CRLF 换行警告
  （core.autocrlf 常规行为），diff 内容核对不受影响，未做任何换行转换操作。
