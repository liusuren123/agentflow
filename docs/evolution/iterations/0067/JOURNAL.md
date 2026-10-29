# JOURNAL · 迭代 0067 · BK-0062 BK-0014 拆分 SPEC 先行：扩展发现器「安全方案」ADR 草案（纯文档轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-29
> 输入：`iterations/0067/PRD.md` + `iterations/0067/SPEC.md`（SPEC 阶段已随文落盘
> ADR-0023 草案，BUILD 残余工作 = SPEC §6 清单：锚点复核勘误 → BK-0014 VERBATIM
> 回写 → 产品提交申报；门禁四命令与双提交归脚本，本 agent 未自行运行）。
> reconstitutional=false（非修宪轮）：零 golden 接触、全程未运行 gate:update。
> 全部改动发生在隔离工作树 `feat/0067-iter` 内，主干零触碰。

## 1. 交付物清单（受影响文件白名单口径）

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| `docs/adr/0023-mcp-extension-discovery-security.md` | 新增（SPEC 落盘 + BUILD 勘误 4 处） | 307 行 ≤400；产品提交唯一路径（productFiles 恰 1，BK-0032/0043/0060/0061 先例同型） |
| `docs/evolution/BACKLOG.md` BK-0014 行 | 机制件回写 | 备注列整格替换为 ADR-0023 §7 权威字面量（VERBATIM，`git diff --stat` 恰 ±1/1） |
| `docs/evolution/STATE.md` / `iterations/0067/JOURNAL.md` | 机制件过程态 | phase=BUILD + 本文件 |

BK-0062 行（BACKLOG.md:83）零触碰——其终态回写归 CLOSE 侧（PRD §6/SPEC §3 口径）；
其余全部行零触碰（`git diff --numstat` = 1/1 唯一改动行即 BK-0014 行）。

## 2. 锚点复核（SPEC §6.1）——9 文件 40+ 锚点逐一亲核，4 处行号漂移勘误

复核方式：逐文件 Read 全文或锚点邻域（registry.ts / guard.ts / inject.ts / llm.ts /
config.ts / capabilities.ts / pty/audit.ts / workbench/tree.ts / workbench/root.ts），
另以 `grep -n` 独立复核漂移嫌疑点、`wc -l` 核 store.ts。

**勘误后全部命中清单**（抽验口径远超 AC2 的 ≥5 条；registry.ts 扩展点锚点已抽）：

- **registry.ts**：99-101（BK-0014 loaders 扩展点注释 + `McpRegistrySources` v1 两成员
  + `McpServersLoader` 签名）｜103-104（「后续 .mcp.json / ~/.agents 扫描 loader
  （BK-0014）届时以新成员加入本签名」）｜105-108（envLoader 读两 key，`|| undefined`
  空串归一）｜8-10（头注「进程生命周期即缓存生命周期」）｜10-11（config zod
  fail-fast 语义）｜24-26（HttpServerEntry/StdioServerEntry/McpServerEntry）｜31
  （BUILTIN_MCP_IDS 五 id）｜33-34（CONFLICT_WARN）｜37（NAME_RE）｜56-76（parseSpec
  未导出——`function parseSpec<T>` 无 export 亲核）｜83-84（E6 http/https）｜99
  （「不做抽象设施」）｜124-130（合并段 BUILTIN 冲突 warn+拒该条）——对应 ADR
  §1.2/§1.5/§2.1/§2.2/§2.3/§2.4/§3.2/§3.5/§6.1-§6.4/§9.1。
- **guard.ts**：102-109（MCP Streamable HTTP 出站网关注释块 + mcpFetch 函数）｜33-62
  （assertPublicUrl + guardedFetch）｜38-50（localhost/私网/链路本地动态校验）｜
  ALLOW_PRIVATE_NET 逃生（:6/:12/:40/:43/:49）。
- **inject.ts**：37（registry 模块级单例）｜52（`{ fetch: mcpFetch }` per-call 注入缝）｜
  93-124（buildToolSession 三分支）｜63-87（bridgeSpec 从窄降级、零 JSON-Schema 解析器）。
- **config.ts**：18-25（readFileSync 读 .env）｜28-38（rawEnv 键表）｜66-74（MCP 两
  env zod superRefine fail-fast）｜79-82（PTY 四键先例）｜109-117（E9 跨 env 交叉
  校验）。**计数事实核（非 ADR 勘误，SPEC 侧知悉项）**：键表 :29-35 实数 **19 键**
  （node 正则提取亲数：AI×5 + PORT/ALLOW_PRIVATE_NET/BOCHA/SEARXNG×4 + 四 API
  key×4 + MCP×2 + PTY×4，含 DISCOVERY 前缀 = 0）——SPEC.md §7.3「与既有 12 个已知键
  （config.ts:29-35 亲核）」系计数笔误（该句仅在 SPEC.md，ADR 全文无「已知键/12 个」
  引用、grep 亲证 exit=1，故 ADR 零勘误）；SPEC 已定稿不回改（BK-0063「不回改已定稿
  产物」口径），留 VERIFY 知悉；「两 discovery 键与既有键零重叠」结论对 19 键成立。
- **pty/audit.ts**：1-9（头注：同库第二连接 + WAL + 不作判活源）｜3-5（「store.ts
  零改动——该文件恰 400 行贴线，扩表须同步拆分」）｜20（SUMMARY_MAX_CHARS=256）｜
  38-39（initPtyAuditStore，server.ts initStore 之后调用）｜42-43（new Database +
  busy_timeout=2000）｜62-68（closePtyAuditStore）｜71-73（clip 截断加 …）｜77-89
  （recordPtyAudit 写入容错 warn 不阻断）｜91-100（listOpenPtySessionIds 对账面）。
- **workbench/tree.ts**：9（「fs 调用面仅 readdir/lstat 只读两员」）｜34（FOLD 名单）｜
  35（ENTRIES_CAP=500）｜112（.git 恒排除）｜115-121（lstat 判型不追踪符号链接）｜
  117-119（ENOENT 并发删除竞态单条跳过）｜140-143（「零环引用契约义务」）。
- **workbench/root.ts**：17-18（PROJECT_ROOT dist 上溯四级两行声明）。
- **store.ts**：`wc -l` = **400**（ADR「恰 400 行贴线」声明属实，无需勘误）。
- **llm.ts**：32（`contextText.slice(0, 6000)` 6000 量级先例）✓。

**4 处勘误（行号漂移仅数字，STRUCTURE 零变动；ADR-0022 迭代 0066「锚点勘误」同款
处置，SPEC §3「勘误级微调」授权内）**：

| # | ADR 原引 | 实锚 | 依据（grep -n 独立复核） | ADR 内位置 |
| --- | --- | --- | --- | --- |
| 1 | llm.ts:33-34 | llm.ts:34-35 | `:34 const skills = (n.skills…` / `:35 const sys = …'你装配了以下技能'`（:33 为空行） | §1.5（replace_all，共 4 处：§1.5/§3.4×2/§5） |
| 2 | capabilities.ts:31-35 | capabilities.ts:26-32 | `:26 const SKILLS: ReadonlyArray<…> = [`（五条目 27-31、闭括号 32） | §1.5 |
| 3 | capabilities.ts:40-41 | capabilities.ts:39 | `:39 const registry = buildMcpRegistry(envLoader(), { warn: () => {} });` | §6.5 |
| 4 | workbench/root.ts:18-19 | workbench/root.ts:17-18 | `:17 export const PROJECT_ROOT =` / `:18 path.resolve(…'..','..','..','..')` | §2.3 |

**过程注记**：SPEC.md 自身两处锚点（要素④ llm.ts:33-34、要素⑤ capabilities.ts:40-41）
与 ADR 同源滞后——SPEC/PRD 属已定稿机制件不回改（「不回改已定稿 PRD」BK-0063 先例
口径），ADR 为权威（§7 字面量明文「ADR-0023 即权威」），VERIFY 锚点抽验以 ADR 勘误后
坐标为准（PRD AC2 点名的 registry.ts:99-105 扩展点区间在 ADR 拆引为 99-101/103-104/
105-108，全部命中）。§7 权威字面量代码块零触碰——4 处勘误锚点均不在 §7 内（grep
证实），VERBATIM 源字节不变，回写不受影响。

## 3. BK-0014 行 VERBATIM 回写（SPEC §6.2 / ADR-0023 §7）

- **方法**：node 程序化（脚本提取 §7 ```text 围栏块全文 → BACKLOG.md 按行定位
  `| BK-0014 |` 行 → 仅替换第 9 列备注 → 回读重切列自检）。脚本置于 gitignored 的
  仓库级 `.zcode/`（工作树外），用后即删，不入任何提交。
- **自检输出（node JSON 亲跑）**：`row=111 / verbatimLen=1593 / remarkLen=1593 /
  trimEqual=true / prefix8Untouched=true / statusProposed=true / sourceT5=true /
  bk0062Present=true / bk0062Untouched=true` → **VERBATIM-OK**。
- **`git diff --stat docs/evolution/BACKLOG.md`** = `1 file changed, 1 insertion(+),
  1 deletion(-)`——恰 ±1/1（AC7）。
- **CRLF 注**：工作区 BACKLOG.md 系 CRLF（autocrlf checkout 形态），首次回写把目标
  行写成裸 LF，已补 `\r` 统一（修复后 144/144 行 CRLF，`git diff --numstat` 维持
  1/1）；修复后只读复核 `remarkTrimEqual=true`（trim 全等对 `\r` 不敏感）。在库内容
  经 autocrlf 归一 LF，不受影响（`git show HEAD:…BACKLOG.md | grep -c \r` = 0 佐证
  在库本就纯 LF）。
- **其余列零触碰**：状态列 proposed / 来源列 T5 / 标题列「智能体扩展发现器：扫描项目
  .mcp.json / .agents/ 与 ~/.agents/ 下的 mcp/skill/rules 并注册进会话上下文」逐字
  不动（前 8 列回写前后逐字比对 prefix8Untouched=true）；BK-0062 行零触碰亲核
  （bk0062Untouched=true，行内容含原 W44 拆分注与 `| ready |`）。

## 4. ADR-0023 形态自检（AC1 口径，BUILD 勘误后复核）

- `wc -l` = **307**（≤400，勘误均为行内替换行数不变）；BOM 检查 `head -c 3 | od` =
  `23 20 41`（"# A"，**无 BOM**）；CR 计数 = **0**（纯 LF）；「已批准」grep 计数 =
  **0**；头部状态行 = 「**草案** · 待用户批准（扫描源与激活白名单 env 请批面——附录 A）
  / 待实现轮消费…」双位标注在位（ADR-0014 先例形态）。

## 5. 未跑事项（如实声明）

- **四命令门禁**（`npm run build` / `npm run gate` / `npm test` / `npm run
  smoke:server`）与**双提交**（产品 + 机制件）：按派发契约归脚本统一执行，本 agent
  未自行运行——AC5 的命令级证据以脚本门禁轮与 VERIFY 实跑为准（s3 抖动按 PRD §5.4
  预案处置，绝不 gate:update）。
- 本轮**纯文档零实现**：`git status --short` 实查改动面仅 4 处——`M
  docs/evolution/BACKLOG.md`、`M docs/evolution/STATE.md`、`??
  docs/adr/0023-mcp-extension-discovery-security.md`、`??
  docs/evolution/iterations/0067/`——**零代码路径**；AC4 禁区（apps packages tools
  tests .github package*.json）diff 恒空的提交级机器证明归脚本。

## 6. productFiles 申报（产品提交白名单，恰 1 路径）

- `docs/adr/0023-mcp-extension-discovery-security.md`

产品提交信息建议（SPEC §6.3 字面）：
`docs(adr): ADR-0023 扩展发现器安全方案（扫描白名单/首次确认/审计留痕/出站类别/loaders 接线定界）草案——迭代 0067 BK-0062 SPEC 先行（纯文档轮，触UI=否自主区）`
