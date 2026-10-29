# SPEC · 迭代 0067 · BK-0062 扩展发现器「安全方案」SPEC 先行（ADR 草案轮）

> 迭代：0067（工作树 feat/0067-iter）｜项：BK-0062（BACKLOG.md:83）｜类型 capability｜
> 优先 P2｜大小 M｜skipSpec=false｜触UI=否（自主区，纯文档轮零实现）。
> 结论先行：本 SPEC 阶段已随文落盘 **ADR-0023 草案**（`docs/adr/0023-mcp-extension-discovery-security.md`，
> 编号按落盘时序顺延——现行至 ADR-0022，落盘前 `ls docs/adr` 亲核；落盘时序裁决机制
> ROADMAP.md:221-223 在案）——SPEC 阶段产出 ADR 的先例 = ADR-0014（迭代 0028 / BK-0043，
> 「SPEC 阶段产出」头部自载）；BUILD 轮残余工作收敛为 **BK-0014 行定界回写（VERBATIM）+
> 产品提交**，见 §6。请批面裁定 = **(b) 新增 env 语义 ×2**（扫描源开关 + 激活白名单），
> 附录 A 五要素字面量已随 ADR-0023 §8 落盘，获批前 BK-0014 零实现（REQ-0062-03）。

## 1. 三产物分工与本轮性质

| 产物 | 产出阶段 | 提交归属 | 内容 |
| --- | --- | --- | --- |
| `docs/adr/0023-mcp-extension-discovery-security.md` | **SPEC（本文随文交付，已落盘）** | **产品提交**（productFiles 恰 1 路径，BK-0032/0043 先例：产品提交 ef54320/f78f983 均 +ADR 恰 1 路径） | 扩展发现器安全方案六要素定稿（PRD §2.1 表）+ BK-0014 回写权威字面量（§7）+ 附录 A 请批草案（§8） |
| `docs/evolution/BACKLOG.md` BK-0014 行 | BUILD | 机制件/归档提交（ADR-0022 §6「回写随归档提交入库」先例） | 备注定界回写 ±1/1，VERBATIM 源 = ADR-0023 §7 代码块，状态列 proposed 不动 |
| `docs/evolution/iterations/0067/*`（PRD/SPEC/JOURNAL/REPORT） | 各阶段 | 机制件提交 | 过程产物，不入 productFiles |

本迭代**零实现**：发现器本体（扫描/审计/注入）全部归 BK-0014 实现块；ADR-0023 全部
表结构 / env 语法 / 模块划分仅以**定界方案**存在（定界到契约级：env 语法、审计表字段、
合并冲突规则、出站逐源声明），不预写实现代码块（ADR-0020 显著声明同款纪律）。

## 2. 六要素定稿结论（REQ-0062-02；正文与代码锚点见 ADR-0023 对应节）

| # | 要素 | SPEC 裁定（ADR-0023 细化节） |
| --- | --- | --- |
| 1 | 扫描范围白名单 | 三源逐一定界：`project-mcp`（仓库根 `.mcp.json`）、`project-agents`（仓库根 `.agents/`）、`home-agents`（`~/.agents/`）；发现物 = mcp 条目 + skill/rules 文本；扫描**默认关**（`MCP_DISCOVERY_SOURCES` 未配置 = 零扫描零 IO 零行为，现状逐位不变）；`home-agents` 必须显式列入方触用户主权区（本机实况：`ls ~/.agents` → 仅 `skills/`，内含 `mmx-cli/`，即 `skills/<name>/SKILL.md` 布局实存样例；仓库根 `.mcp.json`/`.agents/` 当前不存在——`ls` 亲核 2026-10-29）；忽略与上限沿 workbench/tree.ts 形态（FOLD 折叠 tree.ts:34、ENTRIES_CAP tree.ts:35、`.git` 恒排除 tree.ts:112、lstat 不追踪符号链接 tree.ts:115-121/:140-143）；项目源锚定 PROJECT_ROOT（workbench/root.ts:18-19 dist 上溯四级），主权区锚定 `os.homedir()`（ADR §2） |
| 2 | 首次确认语义 | **硬边界：零 UI 面**（PRD §5.3 中止条件守护）。载体 =「显式配置即确认」：新 env `MCP_DISCOVERY_ALLOW` 逐条 `源:名称` 登记，条目被用户显式写入本 env 即视为知情确认（与既有 env 白名单注册表 MCP_HTTP_SERVERS / MCP_STDIO_SERVERS 同构——ADR-0012 §7）；未登记候选仅审计 + 呈现，**零激活**（ADR §3） |
| 3 | 审计留痕 | 沿 pty_audits 同型：新模块 `apps/server/src/mcp/discovery-audit.ts`，同一主库 `data/agentflow.db` 的第二个 better-sqlite3 连接（pty/audit.ts:1-9/:17-18/:42-43 先例），**store.ts 零改动**（恰 400 行贴线，`wc -l` 亲核；pty/audit.ts 头注明载该约束）；新表 `discovery_audits`，粒度 = scan 汇总 / candidate / allow-hit（首次确认留痕锚点）/ parse-fail 四类行；写入容错同 recordPtyAudit（audit.ts:77-89：审计失败 warn 不阻断）（ADR §4） |
| 4 | 出站类别清单 | 逐源声明、**零新增出站类别**：① 扫描本体 = 本地 fs 只读，零出站；② mcp 候选（http）发现/调用 = 既有「MCP Streamable HTTP 出站网关」类别 `mcpFetch`（guard.ts:102-109，动态主机经 assertPublicUrl，注入缝 inject.ts:37/:52 先例）；③ mcp 候选（stdio）= 本地子进程 spawn，非出站，残余风险**知悉面**（BK-0044 附录 A 同款形态）；④ skills/rules 注入 = 进程内文本拼接（llm.ts:33-34 sys 组装点扩展，单文件 ≤6000 字节、llm.ts:32 量级先例），零出站。全部落 guard 既有类别 ⇒ POLICY「后端能力演进」自主区出站面（ADR §5） |
| 5 | loaders 接线定界 | 唯一接缝 = `McpServersLoader` 签名（registry.ts:100-101）不动、`McpRegistrySources` **v1→v2 追加两个可选成员**（`discoverySources?` / `discoveryAllow?` raw 串）+ `envLoader`（registry.ts:105-108）追加读两 key——成员 append-only、既有两成员语义零改动、零抽象设施（签名注释明示的扩展方式，registry.ts:103-104）；已确认 discovery 条目经 `buildMcpRegistry` 合并，serverId 对 env 条目或 BUILTIN_MCP_IDS（registry.ts:31）冲突 → warn + 拒绝该条（CONFLICT_WARN 语义 registry.ts:33-34/:124-130 扩展）；消费方（inject.ts:37 单例、capabilities.ts:40-41 自建实例）零改动自动携带（ADR §6） |
| 6 | 与实现块定界回写 | 权威字面量 = ADR-0023 §7 代码块（BUILD 轮 VERBATIM 程序化回写 BK-0014 行备注列，trim 全等比对，`git diff --stat` 恰 ±1/1；BK-0014 晋升条件 = BK-0062 CLOSE **且**附录 A needs-approval 获批——新增 env 语义 = POLICY 需批准区，BACKLOG.md:111 既有「实现轮涉…需批准区」口径兑现）（ADR §7/§8） |

## 3. 受影响文件清单（正式，取代 PRD §6 建议清单）

| 路径 | 动作 | 提交归属 | 说明 |
| --- | --- | --- | --- |
| `docs/adr/0023-mcp-extension-discovery-security.md` | 新增 | **产品提交（productFiles 唯一路径）** | 已随本 SPEC 落盘；BUILD 仅允许勘误级微调（锚点行号漂移/笔误），结构级改动须回退本 SPEC 重议 |
| `docs/evolution/BACKLOG.md` | 回写 | 机制件/归档提交 | BK-0014 行备注 ±1/1（VERBATIM 源 = ADR-0023 §7）；BK-0062 行 CLOSE 终态回写归协调者 CLOSE 阶段，不在 BUILD |
| `docs/evolution/iterations/0067/`（PRD/SPEC/JOURNAL/REPORT） | 新增 | 机制件提交 | 过程产物 |
| `apps/`、`packages/`、`tools/`、`tests/`、`.github/`、`package*.json` | **零改动** | — | 禁区；AC4 机器证明对象（`git diff HEAD -- apps packages tools tests .github package*.json` 恒空）；BK-0014 实现轮的 apps/server 面见 ADR-0023 §7 受影响文件段，不在本轮 |

## 4. 模块边界（BK-0014 实现轮的定界，本轮以 ADR 冻结）

**允许触碰面（实现轮，全在 POLICY 自主区出站/依赖面内）**：
- `apps/server/src/mcp/` 新增 `discovery.ts`（扫描 + 纯解析，parseSpec 同风格——registry.ts:56-76
  未导出，实现轮可导出复用或同型复制，注释说明取舍，零行为差异）与 `discovery-audit.ts`
  （审计仓储，pty/audit.ts 同型，各 ≤400 行——AGENTS.md 硬性约定 4）；
- `apps/server/src/mcp/registry.ts`：仅 v2 追加（Sources 两可选成员 + envLoader 两行 +
  合并段），既有成员/纯函数语义零改动；
- `apps/server/src/config.ts`：rawEnv 键表（config.ts:29-38）+ zod 两键 fail-fast（PTY 先例
  config.ts:79-82 形态）+ 交叉校验（E9 先例 config.ts:109-117 形态）；
- `apps/server/src/llm.ts`：sys 组装点扩展（:33-34 邻域，纯追加）；`apps/server/src/server.ts`：
  启动接线一行段（initStore 同段，initPtyAuditStore 先例）；
- `tests/smoke/` 扩断言（env 正反例 × 三态：未配置零行为 / 仅 SOURCES 扫描零激活 /
  SOURCES+ALLOW 全链激活 + 审计行落库）。

**零改动禁区（实现轮亦不得触碰，违者即中止转 needs-approval）**：
- `packages/shared`（DEFS/SSE 契约零接触——skills/rules 注入走 sys 文本，不新增事件类型/字段）；
- `apps/web` 全部（零 UI 面硬边界，PRD §5.3）；`store.ts`（审计走第二连接，扩表不进该文件）；
- `tools/pixel-gate/`、CI 配置、golden（POLICY 禁止/需批准区）；
- guard.ts 出站类别集合（`mcpFetch`/`guardedFetch`/`assertPublicUrl` 语义零改动——发现器
  只**取用**既有类别，不新增类别；确需新增即附录 A 反转预案，ADR-0023 §8）。

**互斥边界（REQ-0062-05，正文 ADR-0023 §9）**：与 ADR-0012（env 注册表语义——发现器不得
改写既有两 key 的 E1-E8 语义与 E9 交叉校验）、ADR-0022（on-error env 面——两 env 空间
不相交）、BK-0018（记忆工具组——skills/rules 是显式白名单文本注入，非跨会话记忆写入）
三者互斥；发现器**不得借道注入任何未过 ALLOW 登记的能力面**。

## 5. 验收口径（PRD AC1~AC7 的执行化；BUILD/VERIFY 阶段义务，本 SPEC 阶段未实跑）

| 命令 | 口径 | 对应 AC |
| --- | --- | --- |
| `npm run build` | exit 0 | AC5 |
| `npm run gate` | 全场景 diffPx=0（s3-library 若现 issue#12 已知本机抖动 diffPx 21~23、其余全绿、不变量逐键全等 → 按 PRD §5.4 预案双留档复跑/CI 权威处置，**绝不 gate:update**——非修宪轮） | AC5 |
| `npm test` | 30/30（shared 契约零接触，零增量预期） | AC5 |
| `npm run smoke:server` | 与 0066 基线 168/0 零回退、零增量断言（PRD AC5 口径；AGENTS.md 命令表「84 断言」为历史口径不作基线） | AC5 |
| 手动 E2E | **不适用——纯文档轮零运行时行为变化**，以四命令回归面 + AC4 禁区 diff 恒空机器证明替代（BK-0060/0061 纯文档轮同款如实声明）；BK-0014 实现轮的 E2E 点位（env 三态正反例 + 审计行落库走查）已预写进 ADR-0023 §7 回写字面量验收段 | — |

- **AC1 草案形态**：ADR-0023 行数 ≤400、UTF-8 无 BOM 纯 LF（`od`/`file` 字节级核）、头部
  状态行含「草案」与双位标注（ADR-0014 先例）、全文「已批准」计数 0；产品提交
  `git show --numstat` 恰 1 路径。
- **AC2 六要素锚点真实**：ADR 六节各自成节；VERIFY 抽验 ≥5 组「文件:行」锚点逐一命中
  零杜撰，**registry.ts:99-105 扩展点锚点必抽**（PRD AC2 点名）。
- **AC3 请批面裁定**：恰一结论成立——本案 = (b)：ADR-0023 §8 附录 A 五要素自包含草案
  在案 + 全文「获批前零实现」标注（REQ-0062-03）。
- **AC4 零代码机器证明**：`git diff HEAD -- apps packages tools tests .github package*.json`
  恒空；productFiles 不含任何代码路径。
- **AC6 指针抽样**：≥5 条「文件:行」可开且语义相符，含跨文档指针（BACKLOG.md:83/:111、
  ROADMAP.md:210-211 等）。
- **AC7 回写就绪**：BK-0014 行新备注与 ADR-0023 §7 字面量 trim 全等（node 程序化比对）、
  状态列仍 proposed、`git diff --stat` 恰 ±1/1、其余行零触碰。

## 6. BUILD 轮残余工作清单（顺序）

1. 复核 ADR-0023 代码锚点（行号漂移仅勘误级修正，STRUCTURE 零变动）；
2. BK-0014 行 VERBATIM 回写（源 = ADR-0023 §7 代码块全文，node 程序化 trim 全等比对；
   状态列 proposed/来源 T5/标题逐字不动；BK-0062 行零触碰——其终态归 CLOSE）；
3. 产品提交：`git add docs/adr/0023-mcp-extension-discovery-security.md` →
   `docs(adr): ADR-0023 扩展发现器安全方案（…）草案——迭代 0067 BK-0062 SPEC 先行
   （纯文档轮，触UI=否自主区）`（Conventional Commits；Mimosa 钩子被拦按建议修复，
   禁止绕过）；
4. 机制件提交：iterations/0067/ 四产物 + BACKLOG.md 回写（±1/1）；
5. 工作树内四命令门禁（§5 表）→ 交 VERIFY。

## 7. 风险与中止条件（承 PRD §5/§8，SPEC 级补注）

1. **「首次确认」零 UI 载体**：本案以「显式配置即确认」（ALLOW 登记）落地，成立前提 =
   确认动作对用户可发现（候选呈现通道 = 结构化日志 + 审计表，实现轮 smoke 断言覆盖）；
   VERIFY 若认定呈现通道不足以支撑知情确认 → 按 PRD §5.3 中止转 needs-approval，不硬闯。
2. **ADR 编号撞号**：并行路先行落盘 0023 → 按 ROADMAP.md:221-223 落盘时序顺延下一号，
   改名非重写（仅文件名与头部编号字面量，内容零变化）。
3. **env 命名冲突**：`MCP_DISCOVERY_SOURCES` / `MCP_DISCOVERY_ALLOW` 与既有 12 个已知键
   （config.ts:29-35 亲核）零重叠；实现轮若改命名，语义域不得与既有键相交。
4. **回滚**：任一 AC 不可达 → 工作树整体丢弃、主干零影响（WORKFLOW §4）。
