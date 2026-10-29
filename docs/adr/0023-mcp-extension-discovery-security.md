# ADR-0023 · 扩展发现器「安全方案」草案（扫描白名单 / 首次确认 / 审计留痕 / 出站类别清单 / loaders 接线定界）

- 状态：**草案 · 待用户批准（扫描源与激活白名单 env 请批面——附录 A）/ 待实现轮消费
  （BK-0014——实现轮）**（双位标注，ADR-0014 先例；本项无授权 issue 承继——env 批面以
  附录 A 首开，获批前零实现）
- 日期：2026-10-29（SPEC 阶段产出，迭代 0067 / BK-0062，BACKLOG.md:83）
- 关联：BACKLOG BK-0062（本 SPEC 先行轮）/ BK-0014（扩展发现器实现块，proposed，
  BACKLOG.md:111——§7 回写其定界）/ BK-0013（真 MCP client 基座，done，迭代 0023~0025
  收官）/ ROADMAP T5-M2 环境感知与数据真实化（:161-165，待办节「T5-M2 SPEC 三连穿插」
  :210-211 第 3 位——第 1 位 BK-0060 已于迭代 0059 done（ADR-0020），第 2 位 BK-0061
  已于迭代 0066 done（ADR-0022））/ ADR-0012（env 白名单注册表语义与 §6.3 内置冲突
  先例——§2/§6 直系前置）/ ADR-0014（头部双位标注 + 附录 A 五要素 + pty_audits 第二
  连接直系先例）/ ADR-0020（§8 请批结论明文化先例）/ ADR-0022（§6 回写字面量 + §7
  附录 A 字面量制式直系样板）/ POLICY.md 需批准区（新增环境变量语义 / 新增出站网络
  目标类别）；版式对齐 ADR-0015 / ADR-0016 / ADR-0022

> **显著声明：本 ADR 为定界方案草案，不实施任何代码、不引入任何依赖、不触碰任何
> 出站类别与 shared 契约 / golden，不改变任何运行时行为。本推荐案含「新增环境变量
> 语义 ×2」（§2.4/§3.2），属 POLICY 需批准区——附录 A 提供字面量草案，**获批前
> BK-0014 零实现**。全部扫描语法 / 审计表 / 合并规则 / 接线成员仅以定界方案存在，
> 不预写实现代码块（ADR-0020 显著声明同款纪律）。

## 1. 动机与现状证据

1. **立项语与安全要求**：BK-0014（BACKLOG.md:111）——扫描项目 `.mcp.json` / `.agents/`
   与 `~/.agents/` 下的 mcp/skill/rules 并注册进会话上下文；「`~/.agents` 为用户主权区，
   自动注入须白名单 + 首次确认 + 审计留痕」。安全方案必须先行（BK-0043「安全世界设计
   先行」同款立项语，先例产出 = ADR-0014，迭代 0028）。
2. **扩展点已在位（锚点亲核）**：`apps/server/src/mcp/registry.ts:99-101`——
   `McpRegistrySources`（v1 两可选成员 mcpHttpServers / mcpStdioServers）与
   `McpServersLoader` 函数签名；:103-104 注释明示「后续 .mcp.json / ~/.agents 扫描
   loader（BK-0014）届时以新成员加入本签名」；:105-108 `envLoader` 读两 env key。
   前置 BK-0013 链（BK-0028~0030）已 done：连接层（http.ts / stdio.ts）、guard 出站
   收口（guard.ts:102-109 `mcpFetch`）、会话注入（inject.ts:93-124 三分支
   `buildToolSession`）全在主干。
3. **三源实况（2026-10-29 亲核）**：本仓库根当前**无** `.mcp.json` 与 `.agents/`
   （`ls` 亲核）；`~/.agents` 实存且仅含 `skills/`，内含 `mmx-cli/`（`ls ~/.agents`
   亲核）——即 `skills/<name>/SKILL.md` 布局为本机实存样例（环境技能注册表同载
   `~/.agents/skills/mmx-cli/SKILL.md` 路径）。`.mcp.json` 的 `mcpServers` 对象形态为
   业界通行约定（Claude Desktop / Cursor 等均采），本仓无样例——故 §2.2 的接受子集
   语法以**本 ADR 为唯一事实源**，实现轮以真实样例校准时仅允许收紧不允许放宽。
4. **威胁模型（白名单必要性的根据）**：克隆得来的仓库自带 `.mcp.json` / `.agents/`
   属**不可信输入**（供应链向量）：若发现即自动注入，任何被克隆仓库都能借工作流
   运行静默获得工具执行面（stdio = 本地进程 spawn）或提示词注入面（skills/rules
   文本进 sys）。故扫描（只读发现）与激活（能力面授予）必须分离，激活唯一通道 =
   用户显式登记（§3）。
5. **现状能力对照**：外部 server 注册现状 = 仅 env 白名单（MCP_HTTP_SERVERS /
   MCP_STDIO_SERVERS，registry.ts:105-108 + config.ts:66-74 zod fail-fast）；skills
   现状 = 前端勾选名单（capabilities.ts:26-32 硬编码五条常量，自 app.js 原型数据逐字
   迁移）+ llm.ts:34-35 仅把技能**名**拼进 sys（正文不注入）。发现器补的是「候选从
   哪来」与「授予如何留痕」，不重复造注册语义。

## 2. 扫描范围白名单（要素①）

### 2.1 三源定界表

| 源标识 | 目录锚定 | 发现物 | 布局语法（接受子集） |
| --- | --- | --- | --- |
| `project-mcp` | 仓库根 `.mcp.json`（单文件） | mcp 条目 | 顶层对象 `mcpServers`：值为 `{url}` → http 条目；`{command, args?}` → stdio 条目；映射到既有 `HttpServerEntry` / `StdioServerEntry`（registry.ts:24-26，零新条目类型） |
| `project-agents` | 仓库根 `.agents/`（目录） | skill / rules / mcp | `skills/<name>/SKILL.md`、`rules/*.md`、`mcp.json`（语法同 `project-mcp`） |
| `home-agents` | `~/.agents/`（目录，`os.homedir()` 锚定） | skill / rules / mcp | 同 `project-agents`（本机实存样例 = `skills/mmx-cli/SKILL.md`，§1.3） |

三源均**默认不扫描**：`MCP_DISCOVERY_SOURCES`（§2.4）未配置 = 零扫描、零 fs 读、
零审计行、零行为（现状逐位不变）。`home-agents` 必须被显式列入才触用户主权区——
默认永不读 `~`。

### 2.2 条目与名称纪律（从窄，沿既有语义）

- mcp 条目名 = `.mcp.json` 键名，须过 `NAME_RE`（registry.ts:37 `/^[A-Za-z0-9_-]+$/`）；
  不过 → 该条 parse-fail 审计行 + 跳过，不阻断他条（内置冲突 warn+拒该条语义
  registry.ts:124-130 在合并层继续生效）。
- http 条目 URL 仅 http/https（E6 语义同 registry.ts:83-84；出站时另有 assertPublicUrl
  动态校验，guard.ts:38-50）。
- skill/rule 名称 = 目录/文件名（去扩展名），同过 `NAME_RE`；SKILL.md / rules 正文
  以 UTF-8 文本读入，单文件注入上限 **6000 字节**（llm.ts:32 contextText 6000 量级
  先例），超长截断加 `…`（pty/audit.ts:71-73 clip 同型）。
- 条目上限（草案值，实现轮 smoke 固化）：单文件 256 KiB 上限（超限 parse-fail）、
  每源 mcp 候选 ≤64、每源 skill ≤64、rules ≤32 文件——防恶意巨型配置爆内存/日志
  （workbench/tree.ts:35 `ENTRIES_CAP=500` 截断 + truncated 顶标记同款思路）。

### 2.3 文件系统纪律（沿 workbench/tree.ts 形态，逐条锚定）

- 布局按**固定层级**解析（`skills/<name>/SKILL.md` 两级、`rules/*.md` 一级），不做
  全树递归——比 tree.ts 全遍历更窄，天然免除深层遍历面；
- 符号链接一律不追踪：`lstat` 判型，链接呈本体形态不入扫描（tree.ts:115-121 lstat、
  tree.ts:140-143「零环引用」契约同型）；
- `.git` 恒排除（tree.ts:112 同字面）；扫描根若解析后落入 node_modules / dist / data /
  .zcode 语义域（tree.ts:34 FOLD 名单同款目录名）→ 整源 parse-fail 审计 + 跳过；
- 项目源路径锚定 = `PROJECT_ROOT` 模块级常量同型实现（workbench/root.ts:17-18 dist
  上溯四级先例；process.cwd() 案已被 ADR-0016 §3.0 实测否决，不得复用）；
- 并发删除竞态：readdir/lstat ENOENT 单条跳过不击穿整源（tree.ts:117-119 同型）；
- 解析失败（JSON 非法 / 布局不符）= warn + parse-fail 审计行 + 该源空集，**进程不退**
  ——扫描层 fail-open 是安全的（未过 §3 确认前零激活），与 config.ts env 格式错
  fail-fast（registry.ts:10-11 语义）不混淆：前者只读发现，后者是用户显式注册。

### 2.4 扫描开关 env（请批面 ①/②）

- `MCP_DISCOVERY_SOURCES`：逗号分隔枚举，值域 ⊆ {`project-mcp`, `project-agents`,
  `home-agents`}；未配置 = 全关（零行为）；含未知名 = zod fail-fast（PTY 先例
  config.ts:79-82 形态；rawEnv 键表 config.ts:29-38 追加）。
- 扫描时机 = **启动期一次**（readFileSync 同步读，config.ts:18-25 读 `.env` 同型），
  快照缓存、变更需重启——与注册表「进程生命周期即缓存生命周期」语义同构
  （registry.ts:8-10 头注）。零热重载、零轮询、零 fs watch。

## 3. 首次确认语义（要素②）

1. **硬边界：零 UI 面**。确认载体只能是显式配置登记或服务端日志级呈现，不得引入
   前端交互面（PRD §2.1 要素②/§5.3 中止条件；宪法第 1 条三层零接触）。
2. **显式配置即确认**：新 env `MCP_DISCOVERY_ALLOW`，逗号分隔 `源:名称`（如
   `project-mcp:context7,home-agents:mmx-cli`）。**候选条目被用户显式写入本 env 的
   动作即知情确认**——与既有 env 白名单注册表（MCP_HTTP_SERVERS / MCP_STDIO_SERVERS，
   ADR-0012 §7）同构：用户在配置面逐字登记名称，格式合法性由 zod fail-fast 前置
   （config.ts:66-74 superRefine 形态）。
3. **发现 ≠ 激活**：未过 ALLOW 登记的候选仅产生（a）candidate 审计行（§4）与（b）
   结构化日志呈现（logger.info，含源/名称/类别/文件路径），**不进注册表、不进 sys
   注入、不产生任何出站或子进程**。三态语义（BK-0014 验收用）：
   - 两 env 均未配置 → 与现状逐位一致（零 fs 读零日志噪音）；
   - 仅 `SOURCES` → 扫描 + 审计 + 呈现，零激活；
   - `SOURCES` + `ALLOW` → 被登记条目激活（mcp 条目合并进注册表 §6；skill/rule
     正文可注入 sys §3.4），全链留痕。
4. **skills/rules 激活语义**：`ALLOW` 命中的 skill = 其 SKILL.md 正文（≤6000 字节，
   §2.2）可注入 llm/agent 会话 sys（组装点 = llm.ts:34-35 既有技能名注入段的扩展，
   纯追加；agent 节点同构组装点行号实现轮以 agent.ts 实锚为准，本 ADR 不预写）；
   rules = 命中文件正文同通道注入。注入是进程内文本拼接，零出站（§5）。未命中
   `ALLOW` 的技能**不**出现在 sys——现状技能名注入（llm.ts:34-35）语义零改动。
5. **ALLOW 时序宽容**：`ALLOW` 条目在扫描快照中不存在（如先配 allow 后关 sources，
   或文件已删）→ warn 日志 + 该条忽略，**不 fail-fast**（扫描结果依赖文件系统状态，
   与 config.ts 静态格式校验分层）；warn 固定子串锚实现轮定（CONFLICT_WARN 先例
   registry.ts:33-34 形态）。

## 4. 审计留痕（要素③）

1. **承载形态 = pty_audits 同型**：新模块 `apps/server/src/mcp/discovery-audit.ts`，
   同一主库 `data/agentflow.db` 的**第二个 better-sqlite3 连接**（WAL +
   busy_timeout=2000；pty/audit.ts:1-9 头注、:42-43 先例；Node 单线程同进程零交错
   竞争论证见其头注）。**store.ts 零改动**——该文件恰 400 行贴线（`wc -l` 亲核），
   pty/audit.ts:3-5 头注明载「扩表须同步拆分」约束，SQL 出 store.ts 的先例即
   tools.ts 沙箱 sqlite 与 pty 自有仓储两单。
2. **表结构草案**（字段级定界，DDL 终稿归实现轮）：
   ```text
   discovery_audits(
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     source TEXT NOT NULL,      -- 'project-mcp' | 'project-agents' | 'home-agents'
     entry  TEXT NOT NULL,      -- 条目名（mcp 键名 / skill 名 / rules 文件名；scan 行为 '-'）
     kind   TEXT NOT NULL,      -- 'scan' | 'candidate' | 'allow-hit' | 'parse-fail'
     summary TEXT NOT NULL,     -- 摘要限幅 ≤256 字符截断加 '…'（SUMMARY_MAX_CHARS
                                -- 同值，pty/audit.ts:20）；不落文件正文，防敏感面整段落库
     created_at INTEGER NOT NULL
   )
   ```
3. **粒度**：每次启动扫描一行 `scan` 汇总（源 × 计数）；每候选一行 `candidate`；
   **每个 `ALLOW` 命中激活一行 `allow-hit`——首次确认的留痕锚点**（谁在何时把哪个
   候选升格为激活，事后可对账）；每解析失败一行 `parse-fail`（含原因摘要）。
   ALLOW 中扫描不存在的条目不落审计行（无发现事实可审），走 §3.5 warn。
4. **写入容错**：审计失败 = pino warn + 行为照常（recordPtyAudit 同型，pty/audit.ts:77-89
   「审计失败不阻断会话行为」）；只作事后审计，不作判活/判权源（ADR-0014 §4.3
   「不作判活源」同款定位）。
5. **生命周期**：`initDiscoveryAuditStore()` 于 server.ts 启动段 initStore 之后调用、
   停机 close（initPtyAuditStore / closePtyAuditStore 接线形态，pty/audit.ts:38-39/:62-68
   头注先例）；v1 无 HTTP 读面——对账直查 SQLite（listOpenPtySessionIds 按需后补
   同款，pty/audit.ts:91-100 形态），探针面冒烟可用。

## 5. 出站类别清单（要素④ · 逐源声明）

| 面 | 出站定性 | 承载（全部既有类别，零新增） |
| --- | --- | --- |
| 扫描本体（三源 fs 读） | **零出站**（本地 fs 只读；fs 调用面 = readFileSync/readdirSync/lstatSync 读三员，tree.ts:9「仅 readdir/lstat 只读两员」同款纪律） | Node 内置 fs，无网络 |
| mcp 候选（http）发现（tools/list）与调用 | 服务端出站，目标主机来自发现配置（动态主机） | **既有「MCP Streamable HTTP 出站网关」类别**：`mcpFetch`（guard.ts:102-109，经 `assertPublicUrl` 动态校验私网/回环/链路本地，guard.ts:38-50；`ALLOW_PRIVATE_NET=1` 逃生既有语义不变）；连接构造注入缝 = `{ fetch: mcpFetch }`（inject.ts:52 先例） |
| mcp 候选（stdio）spawn 与会话 | **零网络出站**；但 = 本地子进程执行面（配置文件指哪打哪） | 非出站类别；**残余风险知悉面**：stdio 条目由磁盘配置文件描述即可 spawn 任意本地命令——缓解 = ALLOW 显式确认 + allow-hit 审计 + NAME_RE/来源前缀约束；如实声明为「缓解非消除」（BK-0044 附录 A 残余风险知悉款同款形态） |
| skills/rules 注入 | **零出站**（进程内文本拼接进 sys） | llm.ts:34-35 组装点扩展；Provider 出站（模型 API）为既有类别，注入不新增目标 |
| 审计落库 | 零出站（本地 SQLite） | pty_audits 同库第二连接（§4.1） |

**结论：零新增出站类别**。全部出站落 guard.ts 既有 `mcpFetch`（及其上游
`guardedFetch`/`assertPublicUrl`，guard.ts:33-62）类别内；POLICY「新增出站网络目标
类别」请批面**未触发**——触发的是「新增环境变量语义」（§2.4/§3.2，附录 A）。
实现轮任何一项反转（如需直连非 http(s) 传输、需绕过 assertPublicUrl 的自托管
发现端点等）→ 立即中止转 needs-approval（§8 反转预案）。

## 6. loaders 接线定界（要素⑤ · 唯一接缝）

1. **签名不动、成员 append-only**：`McpServersLoader` 函数签名 `() => McpRegistrySources`
   保持（registry.ts:101）；`McpRegistrySources` v1→v2 **追加**成员：
   ```text
   interface McpRegistrySources {
     mcpHttpServers?: string;   /* v1 既有，语义零改动 */
     mcpStdioServers?: string;  /* v1 既有，语义零改动 */
     discoverySources?: string; /* v2：MCP_DISCOVERY_SOURCES raw 串（envLoader 供） */
     discoveryAllow?: string;   /* v2：MCP_DISCOVERY_ALLOW raw 串（envLoader 供） */
     discoveredEntries?: readonly McpServerEntry[]; /* v2：已过 ALLOW 确认的 mcp 条目
                                                       （discovery 模块供，envLoader 不供——注释明示） */
   }
   ```
   零抽象基类、零注册机制（registry.ts:99 注释「不做抽象设施」承诺延续）。
2. **envLoader v2** = 既有两行零改动 + 追加读 `MCP_DISCOVERY_SOURCES` /
   `MCP_DISCOVERY_ALLOW` 两 key（registry.ts:105-108 追加；空串归一未配置语义
   同现有 `|| undefined`）。
3. **发现模块**：新增 `apps/server/src/mcp/discovery.ts`（纯解析 + 启动期一次同步
   扫描）：`parseDiscoverySourcesSpec` / `parseDiscoveryAllowSpec` 两纯函数（parseSpec
   同风格，registry.ts:56-76 未导出——实现轮可导出复用或同型复制，注释说明取舍，
   零行为差异）+ `discoverCandidates(sources)`（readFileSync 扫描 + §2 全部纪律 +
   审计写入 + ALLOW 过滤，返回 `{ entries: McpServerEntry[]; skills; rules }`）。
   `.mcp.json` 条目构造复用 `HttpServerEntry`/`StdioServerEntry`（registry.ts:24-26），
   URL/命令校验语义与 E6/E7 对齐。
4. **合并规则（buildMcpRegistry 扩展段）**：合并序 = v1 env 两源条目优先 →
   `discoveredEntries` 次之；serverId 与 env 条目或 `BUILTIN_MCP_IDS`
   （registry.ts:31）重复 → warn + 拒绝该 discovery 条、进程不退（CONFLICT_WARN
   语义 registry.ts:33-34/:124-130 扩展为通用重复注册拒绝，字面量实现轮定）；解析
   problems 抛错路径**不适用于 discovery 臂**（§2.3 fail-open 分层——discovery 候选
   永不触发「理论不可达」抛错通道，其失败已在扫描层消化为空集 + 审计行）。
5. **消费方接线（两处一表达式替换，行为契约不变）**：`mcp/inject.ts:37` 单例与
   `capabilities.ts:39` 自建实例的 `buildMcpRegistry(envLoader(), …)` 改经组合器
   （discovery.ts 提供的 `composeSources(envLoader())` 一类入口，内部 = envLoader()
   + discoverCandidates 填充 discoveredEntries）——各一处表达式替换；集成事实：
   capabilities `external` 清单将自动出现已确认 discovery 条目（前端清单为 BK-0049
   已落地动态渲染，零前端改动；**仅获批实现后**生效）。llm.ts 消费 skills/rules 经
   discovery 模块快照访问器（§3.4）。
6. **零改动面**：连接层（http.ts / stdio.ts / connection.ts）、guard.ts、
   tools.ts、store.ts、packages/shared、apps/web 全部零改动。

## 7. BK-0014 定界回写索引（权威字面量）

以下代码块 = BACKLOG BK-0014 行**备注列的权威回写字面量**（BUILD 轮逐字粘贴回写，
其余列含状态 proposed 逐字不动；回写随归档提交入库；VERIFY 以本节为 VERBATIM
比对基准——BK-0027 VERBATIM-OK 标准 / ADR-0022 §6 制式）。晋升条件：BK-0062 CLOSE
**且**附录 A needs-approval 获批（新增 env 语义两项在请批清单）；获批后由 PLAN 轮
晋升 ready。

```text
触UI=否——后端能力项（安全三件套写死，ADR-0023 即权威：①扫描白名单=MCP_DISCOVERY_SOURCES 枚举 {project-mcp,project-agents,home-agents}，未配置=零扫描零 fs 读零行为（现状逐位不变），home-agents 必须显式列入方触 ~/.agents 主权区；②首次确认=显式配置即确认——MCP_DISCOVERY_ALLOW 逐条 源:名称 登记，未登记候选仅审计+日志呈现零激活，零 UI 面（硬边界，违者中止转 needs-approval）；③审计留痕=mcp/discovery-audit.ts 新模块（pty/audit.ts 同库第二连接同型，store.ts 零改动——恰 400 行贴线），表 discovery_audits(source/entry/kind/summary/created_at)，粒度=scan/candidate/allow-hit（首次确认锚点）/parse-fail，写入容错不阻断）；受影响文件=apps/server/src/mcp/discovery.ts 新增（扫描+两纯函数+组合器，≤400 行）+ discovery-audit.ts 新增（≤400 行）+ registry.ts v2 追加（McpRegistrySources 三可选成员 append-only + envLoader 两 key + 合并段冲突 warn+拒该条——既有成员/纯函数语义零改动，零抽象设施）+ config.ts 两 env 白名单与 zod fail-fast（PTY 先例形态）+ llm.ts sys 组装点扩展（ALLOW 命中 skill/rules 正文注入，单文件 ≤6000 字节；既有技能名注入语义零改动）+ inject.ts/capabilities.ts 各一处组合器表达式替换 + server.ts 启动/停机接线 + tests/smoke 扩断言（三态：未配置零行为/仅 SOURCES 扫描零激活/SOURCES+ALLOW 全链激活+allow-hit 审计行落库）；零 packages/shared、零 SSE 契约、零前端文件、零新依赖、零新增出站类别（http 发现/调用全走既有 mcpFetch 类别 guard.ts:102-109 经 assertPublicUrl；stdio=本地子进程残余风险知悉面——缓解非消除，附录 A 知悉款）；扫描纪律=固定层级布局（skills/<name>/SKILL.md、rules/*.md、mcp.json）+ NAME_RE 名称域 + 符号链接不追踪 + .git/FOLD 域排除 + 条目/字节上限（ADR-0023 §2）；验收命令口径=npm run build + npm run gate（纯回归面）+ npm test + npm run smoke:server 扩断言 + 手动 E2E（env 三态点位走查 + 审计行 sqlite 直查）；依赖关系=前置 BK-0013（done）+ BK-0062（SPEC 先行轮，ADR-0023）；晋升条件=BK-0062 CLOSE 且附录 A needs-approval 获批（新增 env 语义两项=POLICY 需批准区，沿 BK-0027→#10 先例）；边界切割=ADR-0023 §9（不得借道注入未过 ALLOW 的能力面；与 ADR-0012 env 注册表语义/ADR-0022 on-error env 面/BK-0018 记忆工具组互斥）；**2026-10-29 迭代 0067 SPEC 先行产出 ADR-0023 草案（本行定界自其 §7 权威字面量回写）**
```

## 8. 附录 A · needs-approval issue 草案（字面量，脚本逐字取用）

**请批裁定（REQ-0062-03 = (b)）**：推荐案含新增环境变量语义 ×2（§2.4/§3.2）→
触 POLICY 需批准区 → 持本附录字面量开 needs-approval issue（开 issue 归协调者/脚本，
沿 BK-0027→#10 先例）；**获批前 BK-0014 零实现**。出站/依赖/golden/shared 均零新增
（§5/§9），不在请批清单。

**标题**：

```
[needs-approval] BK-0014 扩展发现器实施：请批新增 env 语义 ×2（扫描源开关 + 激活白名单）+ stdio 子进程残余风险知悉（ADR-0023）
```

**正文**：

```
按 POLICY.md 需批准区「新增环境变量语义」，扩展发现器（BK-0014：扫描项目
.mcp.json / .agents/ 与 ~/.agents/ 下的 mcp/skill/rules）实施需先经您批复以下承载。
定界方案全文见 ADR-0023 草案（docs/adr/0023-mcp-extension-discovery-security.md，
迭代 0067 / BK-0062 SPEC 先行产出）。获批前零实现。

请批清单：

① 新增环境变量语义两项（config.ts zod fail-fast 白名单）：
   - MCP_DISCOVERY_SOURCES：扫描源开关，逗号分隔枚举 ⊆ {project-mcp,
     project-agents, home-agents}；未配置 = 零扫描零 fs 读零行为（现状逐位不变）；
     home-agents（用户主权区 ~/.agents）必须显式列入才会被读取；
   - MCP_DISCOVERY_ALLOW：激活白名单，逗号分隔「源:名称」（如
     project-mcp:context7,home-agents:mmx-cli）；未配置 = 全部候选仅审计+日志
     呈现、零激活；条目被您显式写入本 env 即视为该发现的知情确认（首次确认
     语义的载体，零 UI 面）；未登记条目永不进注册表、永不注入会话。

② 残余风险知悉两项（缓解非消除，如实声明）：
   - stdio 类发现条目 = 磁盘配置文件描述即可 spawn 本地命令（您 ALLOW 登记
     哪条才 spawn 哪条；allow-hit 审计行全程留痕）——与既有 MCP_STDIO_SERVERS
     env 注册表同等级执行面，发现器的增量仅在「候选来自文件扫描」；
   - skills/rules 正文注入 = 被确认条目的文本进入模型系统提示词（提示词注入
     风险面）；单文件 ≤6000 字节截断，未确认条目零注入。

批复语义：评论「批准」= 授权上述两项 env + 两项风险知悉，BK-0014 晋升条件
（BK-0062 CLOSE 且本 issue 获批）随即只差前者；评论「驳回」= issue 关单 +
BK-0014 置 skipped。证据：ADR-0023 §2（扫描纪律）/ §3（确认语义）/ §4（审计）/
§5（零新增出站类别论证）/ §7（实现定界）。
```

**反转预案（护栏，不预支）**：实现轮若出现 ① 需要第三处配置承载（白名单文件/
管理端点等——新增配置面即需批准区同判）；② 需要新出站类别（非 http(s) 传输、
绕过 assertPublicUrl 的自托管发现端点）；③ 需要新 npm 依赖（如 JSON Schema 全量
校验器——当前定界零依赖，bridgeSpec 从窄降级先例 inject.ts:63-87 不依赖解析器）；
④ 需要前端呈现面（触 UI 硬边界）——任一即中止实现并按本附录五要素补开
needs-approval，获批前零实现。

## 9. 边界切割、不做范围与验证口径（REQ-0062-05）

1. **与 ADR-0012（env 注册表语义）互斥**：既有 MCP_HTTP_SERVERS / MCP_STDIO_SERVERS
   两 key 的语法（E1-E8）、E9 跨 env 交叉校验（config.ts:109-117）、内置冲突拒绝
   （registry.ts:124-130）语义**零改动**；发现器只在其下游追加候选来源，不改写
   既有注册通道的任何行为。
2. **与 ADR-0022（on-error env 面）互斥**：`ON_ERROR` 三键与本轮两键命名域不相交、
   消费点不相交（engine 失败路径 vs 启动扫描），零语义耦合。
3. **与 BK-0018（记忆工具组）互斥**：skills/rules 是「显式白名单内、每次会话组装
   时重新注入」的静态文本，不落任何跨会话存储、不提供写忆/忆取工具面；发现器
   不得借道注入任何未过 ALLOW 登记的能力面（mcp 工具、技能文本、规则文本三者
   皆是）。
4. **不做范围（本 ADR 轮）**：零代码 / 零依赖 / 零 golden / 零 shared / 零 UI /
   零新增出站类别——本文件纯新增 + BK-0014 行回写（随归档提交）；apps/**、
   packages/**、tools/**、tests/**、.github/**、package.json / lock 零改动（机器
   证明 = 上述路径 git diff 恒空；lock 零变化 = 零依赖）。不实现扫描器/审计表/
   注入点；不预写 DDL 终稿与 handler 终稿代码块；`.agents` 之 mcp/rules 子布局
   本机无实存样例（仅 skills 实存，§1.3）——其语法为约定定界，实现轮以真实样例
   校准时仅允许收紧不允许放宽；发现候选的前端可视化不在本定界射程（BK-0049
   动态清单机制外的新呈现 = 触 UI，须修宪通道）。
5. **验证口径（BK-0014 实现轮）**：`npm run build` + `npm run gate`（纯回归面）+
   `npm test` + `npm run smoke:server` 扩断言（§7 三态组）全绿 + 手动 E2E 三态
   点位走查 + allow-hit 审计行 sqlite 直查；本草案轮验证口径 = 迭代 0067 PRD
   AC1~AC7（SPEC.md §5 执行化），四命令纯回归 + 禁区 diff 恒空机器证明。
