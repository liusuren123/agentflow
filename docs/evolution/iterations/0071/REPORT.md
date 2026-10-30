# REPORT · 迭代 0071 · BK-0014 智能体扩展发现器（VERIFY 轮）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-31 05:22 · 工作树 feat/0071-iter
> 输入：`iterations/0071/PRD.md` §7 验收标准（AC1-AC10）+ `iterations/0071/SPEC.md` §6 验收口径
> + `iterations/0071/JOURNAL.md`（BUILD 申报）。工作树隔离纪律：全部文件操作带
> `.zcode/worktree/feat/0071-iter/` 前缀，命令均在该工作树内执行。

## 结论：**PASS**（无阻断缺陷；2 项 Minor 观察项记录在案，不阻塞合并）

BK-0014 扩展发现器按 ADR-0023 蓝图实现，AC1-AC10 全部达成或以如实降级口径达成；
新冒烟 MC01-MC22 22/22 全绿、既有 E2E 面 196/0 零回退、AC8/AC9 机器证明恒空、
产品 diff 恰收敛于 SPEC §2 白名单。

---

## 1. 执行摘要（哪些谁跑的，如实区分）

| 类别 | 项目 | 执行者 | 结果 |
| --- | --- | --- | --- |
| 脚本统一门禁 | `npm run build` / `npm run gate`（21 场景）/ `npm test`（30/30） | 工作流脚本（派发指令明示「已由脚本在工作树内运行且通过」，本 VERIFY **未复跑**） | 采信通过；旁证：`apps/web/dist/index.html` mtime 2026-10-31 05:13（JOURNAL 05:11 明说 web 半边未由 BUILD 构建 → 该产物只能是脚本 build 所生成，build/gate 链真实发生过） |
| VERIFY 实跑 | 下表 §2 全部命令与检查 | test-manager（本会话逐一实跑，真实退出码在案） | 全绿 |

## 2. SPEC §6.1 命令门禁（本 VERIFY 逐项实跑，记录真实退出码）

| 命令 | 通过标准 | 实跑结果 |
| --- | --- | --- |
| `npm run build:server` | exit 0 | **exit 0**（VERIFY 先重跑以固化 dist ≡ 当前源码前提） |
| `node tests/smoke/mcp-discovery.mjs` | MC01-MC22 全绿，汇总行 | **`==== smoke:mcp:discovery：22 passed / 0 failed ====`, exit 0**（§4） |
| `npm run smoke:mcp:registry` | exit 0 | **11 passed / 0 failed, exit 0**（邻接面回归） |
| `npm run smoke:mcp:inject` | exit 0 | **12 passed / 0 failed, exit 0**（邻接面回归） |
| `npm run smoke:server` | 既有断言零回退 | **196 passed / 0 failed, exit 0**（JOURNAL §3 留白项，本 VERIFY 补跑） |
| `npm run smoke:shutdown` | win32 口径 | **SKIP（win32 如实降级）exit 0**（§5.4） |
| `npm run build` / `npm run gate` / `npm test` | 脚本已跑 | 采信（见 §1），未复跑 |

## 3. PRD AC1-AC10 逐项验收

### AC1 三态之「零行为」基线 — **PASS**
- **机器证明（§6.2 口径）**：`node tests/smoke/mcp-discovery.mjs` 的 **MC04** PASS（两 key 缺省 →
  空快照 deepEqual、审计零新行、`composeSources` 输出 ≡ loader() + `discoveredEntries:[]`）。
- **子进程真机（临时 E2E `E2E-AC1`，node 直启 dist/server.js 零 discovery env）**：
  `/api/v1/capabilities` 200 且 `mcp.external=[]`；启动日志**零**「MCP 扩展发现」锚；
  sqlite 直查 `discovery_audits` 前后 delta 四 kind（scan/candidate/allow-hit/parse-fail）**全 0**。
- **既有面零回退**：`npm run smoke:server` 196/0（§2）。
- 实现机关复核：discovery.ts:299-300 短路于任何 IO 前（零 env 时 `composeSources`
  —discovery.ts:325-329— 零 fs 读零审计零日志）；inject.ts:40 / capabilities.ts:40 两接缝在
  零 env 下与现状逐位一致（MC04 deepEqual 实证）。

### AC2 三态之「仅 SOURCES 扫描零激活」 — **PASS**
- **MC03** PASS：SOURCES=三源 + ALLOW 缺省 → 快照 entries/skills/rules 空集；六候选
  （project 两源 mcp + fixture-skill/rule + home-skill/rule，含 home-agents 注入根）逐条
  candidate 审计行落库；mock HTTP **请求零增量**（零出站）。
- **MC19 子进程版** PASS（真实仓库根 fixture，经 §4 MC18 守卫）：server 健康、
  `capabilities.external` **不含** fixture 条目、日志含「MCP 扩展发现候选」锚、
  candidate/scan 行落库。
- 零子进程 spawn：未 ALLOW 候选不进 `discoveredEntries` → registry 无该条 →
  `discoverTools`/stdio spawn 结构性不可达（discovery.ts:120-128 候选过滤 +
  registry.ts:179-187 合并臂实读）；MI10/MI12（inject 冒烟）旁证出站收口无绕过。

### AC3 三态之「SOURCES+ALLOW 全链激活」 — **PASS**
- **MC01** PASS：composeSources 返回 fixture http 条目 → `buildMcpRegistry` 合并后
  `has('fixture-server')===true` → `discoverTools` 经 `httpFetch: mcpFetch`（guard 收口）
  对进程内 mock tools/list 成功回 echo 工具；capabilities 同构实例 external 含该条目。
- **MC02** PASS：fixture-server 的 `allow-hit` 审计行**每快照构建恰 +1**（delta=1，
  candidate 行并存 ≥4）。
- **MC20 子进程版** PASS：+ALLOW → `capabilities.external` 含 `{serverId:'mc19-server',
  kind:'http'}`，sqlite 直查恰一行 allow-hit。
- sys 正文注入：**MC05** PASS（三态：零配置 `''`；仅 SOURCES `''`；SOURCES+ALLOW 输出
  `【发现技能 fixture-skill】`+正文、`【规则 fixture-rule】`+正文，skills 先 rules 后，
  **deepEqual 全文等值**）；**MC06** PASS（>6000 字节正文截断加 `…`，body 长 6001）。

### AC4 env 校验 fail-fast — **PASS**
- **MC14/MC15** PASS：两纯函数矩阵逐形态 deepEqual（未知源/重复/空条目/缺冒号/非法名，
  错误文案含 `条目 N：`）。
- **MC21 子进程版** PASS：SOURCES=`nope` → 子进程提前退出 **code=1**，logTail 含变量名
  `MCP_DISCOVERY_SOURCES` 与「条目 1」（config.ts `fail()` 通道形态）。
- 接线复核：config.ts:75-90（diff）两字段 zod superRefine 复用 discovery 两纯函数，
  rawEnv 键表 +2（:35），与 :80-90 PTY/ON_ERROR 先例同构。

### AC5 ALLOW 时序宽容 — **PASS**
- **MC22 子进程版** PASS：ALLOW 登记 `project-mcp:ghost`（快照不存在）→ server 正常健康、
  warn 锚「不在扫描快照中，已忽略」在日志、ghost **零**审计行（scan 行落库证 DB 链路活着）。
- 实现复核：discovery.ts:316-318 差集 warn，无发现事实即无审计行（SPEC §4.2/ADR-0023 §4.3）。

### AC6 重名冲突拒绝 — **PASS**
- **MC16** PASS：discoveredEntries 与 env 条目同名、与 BUILTIN_MCP_IDS（filesystem）同名 →
  warn 锚「已拒绝该 discovery 条」各一次、env 条目保留、注册表整体可用。
- **MC17** PASS：直调 buildMcpRegistry 注入问题条目（非法 URL/非法 kind）→ 不触发
  registry.ts:164-165 抛错通道，问题条 warn+拒、合法条接受（discovery 臂 fail-open 语义）。
- v1 语义零改动复核：registry.ts:159-173 既有循环逐字保留（diff 审查），MR 冒烟 11/0 旁证。

### AC7 扫描纪律矩阵 — **PASS**
- **MC07** PASS：符号链接（win32 junction 实建）→ parse-fail「符号链接不入扫描」+ 条目缺席 +
  零 candidate 行；他条（fixture-skill）不受阻断。
- **MC08** PASS：`skills/.git`、`skills/node_modules`、`rules/data.md` 三条 parse-fail
  （EXCLUDE = .git + FOLD 字面），fixture-skill 保留。
- **MC09** PASS：>256KiB（262144 字节上限，实测 300KiB）→ parse-fail 且**文件内容未被读取**
  （哨兵串 BIG_SENTINEL 零出现于审计 summary 与快照 JSON；lstat size 判定）。
- **MC10** PASS：非法名称（mcp 键 `bad.name`、skill 目录 `bad$name`）各 parse-fail；
  合法条 good-entry 激活入快照。
- **MC11** PASS：坏 JSON → 整源 parse-fail（entry=`-`）+ 空集 + 进程不退（fail-open 分层）。
- **MC12** PASS：65 条 rule → 恰接受 32（排序后字典序前 32）+ 1 条上限 parse-fail
  （SPEC §6.3 注记义务：实际手段 = 运行时生成 65 个 rule 文件进 tmp 副本，JOURNAL §2.5 在案）。
- **MC13** PASS：三源根缺失 → scan 行计数全 0、零 parse-fail（合法空态非失败）。

### AC8 审计承载与 store 零改动 — **PASS**
- `git diff -- apps/server/src/store.ts` → **0 行**（本 VERIFY 实跑；store.ts 恰 400 行贴线未触碰）。
- sqlite 直查（本 VERIFY，全表 552 行）：五字段齐备（NULL 字段 **0**）、
  `length(summary) > 257` **0 行**、fixtures 四文件正文 **3 个 ≥50 字符连续片段探针零命中**
  （另 mmx-cli 真实正文探针近 400 行零命中）；kind 分布 scan=116 / candidate=356 /
  allow-hit=55 / parse-fail=45。

### AC9 零改动面与禁区机器证明 — **PASS**
- `git diff -- packages/shared apps/web tools/pixel-gate tests/golden .github package.json
  package-lock.json` → **0 行**（本 VERIFY 实跑）。
- 跟踪 diff 全集（`git diff --name-only`）= 七个产品文件（agent/capabilities/config/llm/
  inject/registry/server）+ 机制件（BACKLOG.md/STATE.md）——恰 ⊆ SPEC §2.2 封闭清单；
  untracked（`git ls-files --others`）= discovery.ts、discovery-audit.ts、
  mcp-discovery.mjs、fixtures/discovery/**（8 文件）+ iterations/0071/（PRD/SPEC/JOURNAL）
  ——恰 ⊆ SPEC §2.1 + 机制件。**无清单外混入**。
- 行数预算：discovery.ts **344** ≤400、discovery-audit.ts **90** ≤400（新增源文件上限达标）；
  mcp-discovery.mjs **481**（tests 非源文件，SPEC §2.1 目标 400 + 「硬上限仍遵守可读性」，
  JOURNAL §2.6 已如实申报理由）。
- golden 零接触、全程零 `gate:update`（本 VERIFY 未执行该命令；`tests/golden/` diff 恒空）。

### AC10 门禁全绿与 E2E 走查 — **PASS**（gate 项采信脚本，其余实跑）
- `npm run gate` 21 场景：脚本执行通过（采信，§1；本 VERIFY 未复跑、未消费 gate:update）。
- `npm test` 30/30：脚本执行通过（采信，§1）。
- smoke:server 196/0 + 新冒烟 22/0 + 邻接面 11/0·12/0：**实跑**（§2）。
- 手动 E2E 三态点位：实跑（§5）。
- allow-hit 审计行 sqlite 直查：实跑（AC8 项 + MC02/MC20）。
- CI `ui-constitution` 推送后盯守：属脚本义务（沿先例不判过不判挂）。

## 4. 新冒烟 MC01-MC22（`node tests/smoke/mcp-discovery.mjs`，本 VERIFY 实跑）

**22 passed / 0 failed，exit 0**。逐条 PASS 输出在案（§3 已按 AC 归组引用）。
要点复核：
- **MC18 存在性守卫**：触发前检查通过（仓库根无 `.mcp.json`/`.agents`）→ 子进程组
  MC19/MC20 以临时 fixture 写真实根全链实跑，finally + exit 钩子清理；跑后本 VERIFY
  复核 `ls .mcp.json .agents` → 均不存在（零遗留），`git status` 无意外条目。
- JOURNAL §2.4 申报的 MC05 测试流修正（经 `composeSources` 生产接缝供快照）在实跑中
  表现正确（MC05 PASS，三态语义与生产唯一接缝同形）。

## 5. SPEC §6.4 手动 E2E 点位（真机走查，本 VERIFY 实跑记录）

### 5.1 三态点位 — 行为面全符合
临时脚本（node 直启 dist/server.js 子进程，本 VERIFY 执行，脚本本身不落源码）：
- **态 1（零 env，AC1）**：external=[]、日志零「MCP 扩展发现」锚、审计 delta 全 0。
- **态 2（SOURCES=home-agents 真机主权区）**：日志含「MCP 扩展发现候选」锚且条目恰为本机
  `~/.agents` 实存内容 **mmx-cli**（candidate delta=1、scan delta=1、allow-hit delta=0）、
  external=[]（零激活）、启动日志零正文出现（`【发现技能` 零命中——sys 正文仅会话面）。
- **态 3（SOURCES+ALLOW 全链）**：由 §4 MC19/MC20 真实仓库根 fixture 子进程版承载
  （external 含/不含条目 + 恰一行 allow-hit），与本点位口径互证。
- **主权区零读取反例（态 2b）**：SOURCES 去除 home-agents → mmx-cli candidate 行零新增、
  scan 零新增、全表 candidate 零增量、日志零提及 mmx-cli——`~/.agents` 零读取（US-2 达成）。

### 5.2 sys 注入端到端（模型观测面）— **未执行（如实降级），替代面已覆盖**
本机无 `apps/server/.env`（VERIFY 实查不存在）→ 无真实模型密钥，单 LLM 节点标语复述
点位不可行。替代证据面：**MC05** `discoveredSysExtension()` 全文 deepEqual（含截断面 MC06）
+ llm.ts:36 / agent.ts:42 表达式**纯追加** diff 审查（零命中 = `''` 与现状逐字节等价，
:39 `buildToolSession` 通道零改动）。该点位可在合并后主干复测或用户 dogfooding 时补跑。

### 5.3 home-agents 主权区点位 — PASS（见 5.1 态 2 / 态 2b）

### 5.4 停机点位 — win32 如实降级（沿既有权威口径）
- 实跑观察：扫描发生态 SIGTERM → 子进程立即终止 `exit={code:null, signal:'SIGTERM'}`、
  无悬挂（与零 env 态同形态）。win32 下 SIGTERM 经 TerminateProcess 投递、
  `process.on('SIGTERM')` 停机 handler 不触发——**本仓既有权威口径**
  （tests/smoke/shutdown-sigterm.mjs:43-48「Windows 跨进程信号模拟限制……权威断言路径：
  CI ubuntu-latest」，周报 W43 观察 O4 先例；AGENTS.md 已知陷阱同口径）。
- `npm run smoke:shutdown` 实跑：win32 SKIP + 原因说明 + exit 0（如实降级不伪造通过）。
- 优雅停机路径（server.ts:342-343 handler → shutdown → `closeDiscoveryAuditStore()` 插于
  closePtyAuditStore 后、closeKbStore/closeStore 前，diff 审查确认）本机不可断言，
  **权威归 CI Linux**，推送后盯守属脚本义务。判定：非缺陷，平台已知形态。

## 6. 交互回归抽查（test-manager 职责清单口径）

本轮 **触UI=否**，前端零改动：`git diff -- apps/web` = 0 行（AC9 机器证明）、
packages/shared 零 diff → SSE 契约零漂移。交互回归清单（拖拽/缩放/框选/连线/滚轮门控/
数字步进/快捷键/审批弹窗/撤销重做/导入导出/多标签/节点库收藏）的渲染与行为载体零 diff，
gate 21 场景（含 DOM 不变量）由脚本全绿 → 交互面回归风险 = 0。本 VERIFY 据此判定
「逐项手点交互」在本轮无对象、以零 diff + gate 全绿为回归证据（如实口径：未逐项手点，
因其前提「前端有改动」不成立）。

## 7. 观察项（Minor，不阻断验收，留合并轮或治理日顺手处置）

- **OBS-001**（Minor·注释笔误）：`apps/server/src/mcp/inject.ts:39` 注释写
  「composeSources(envLoader())」，实码为 `composeSources(envLoader)`（传函数本体，
  composeSources 内部首行 `loader()` 调用，语义等价；JOURNAL §1.2 已如实申报该形态）。
- **OBS-002**（Minor·头注语境部分过时）：`apps/server/src/capabilities.ts:37` 头注
  「buildMcpRegistry 纯解析零 IO」——buildMcpRegistry 本身仍纯解析，但该行表达式现经
  `composeSources` 含启动期一次扫描 IO（模块级单次记忆化，非每请求 IO）。读者可能误解
  表达式整体零 IO。行为正确（两实例一致性由同一记忆化快照保证，反而更强）。

## 8. 缺陷清单

**无 BUG-xxx 阻断/非阻断缺陷。** 仅 §7 两项 Minor 观察项（注释/头注文本面，零行为差）。

## 9. 移交与遗留

1. MERGE 阶段：主干复测四件套（build/gate/test/smoke:server）+ llm.ts 邻接面与并行
   BK-0018 轮（feat/0068-iter）的冲突按 WORKFLOW §4 类别解决（本轮 llm.ts diff = import
   +1 行 + :35 尾部纯追加，冲突面极小，JOURNAL §5 在案）。
2. CLOSE 阶段：issue#16 回执关单（PRD 回执口径 sourceIssue=16、单目的 issue 先例）。
3. CI 盯守：`ui-constitution` required check 推送后由脚本义务承担；smoke:shutdown 优雅
   停机三要素的权威断言在 CI ubuntu-latest（win32 如实降级已留痕 §5.4）。
4. sys 注入真机模型观测点位（§5.2）可在合并后 dogfooding 补跑，非合并阻塞项。
