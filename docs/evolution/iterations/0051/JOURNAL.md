# 迭代 0051 · JOURNAL — BK-0059 .env.example 模板同步：可选段补 MCP 注册表两条目（BUILD）

> BUILD 轮产物（WORKFLOW.md §4 BUILD 契约）。code-developer 产出。
> 本轮隔离工作树 `.zcode/worktree/feat/0051-iter/`（分支 `feat/0051-iter`）。
> 时间 2026-10-26 13:56–13:59。

## 1. 开工前阅读（按派发指令）

- `.zcode/agents/code-developer.md`（职责与硬约束）、`CONSTITUTION.md`（第 1/3/4/5 条）、
  `AGENTS.md`（仓库地图与硬性约定）、`docs/evolution/WORKFLOW.md`（§4 BUILD 契约、
  §6 安全护栏）、`docs/evolution/iterations/0051/PRD.md`（S 项免 SPEC，受影响文件
  清单与验收口径内嵌 §4/§5）。

## 2. 立项证据锚点亲核（动手前复核 PRD §2 指针，全部只读）

1. **E2（实况锚点）**：`apps/server/src/config.ts:31-33` 白名单亲读确认含
   `'MCP_HTTP_SERVERS', 'MCP_STDIO_SERVERS'`；`:68/:71` 各有 `z.string().superRefine`
   格式校验（解析复用 mcp/registry.ts 纯函数）——两变量为已批准正式 env。
2. **E4（值形态权威）**：`docs/adr/0012-mcp-client-transport.md` §7 方案 A 定稿
   字面量亲读：`MCP_HTTP_SERVERS="name1=https://host/mcp,name2=…"`；
   `MCP_STDIO_SERVERS="name1=npx --yes @modelcontextprotocol/server-sqlite
   --db-path …,name2=…"`（值为命令+参数，空格分隔），并注「运维故事同
   SEARXNG_URL」。新行示例值逐字取自该 ADR 字面量（占位 host/公共 npm 包名，
   非真实密钥/内网地址）。
3. **E1（现状）**：改动前 `.env.example` 全文 19 行亲读，「可选」段仅
   BOCHA/SEARXNG/ALLOW_PRIVATE_NET/PORT 四条，`MCP` 零记载。

## 3. 改动（REQ-0059-01，恰 1 文件纯插入 2 行）

- `apps/server/.env.example`「── 可选 ──」段：在 SEARXNG_URL 行与
  ALLOW_PRIVATE_NET 行之间纯插入两行（落点依据 = ADR-0012「运维故事同
  SEARXNG_URL」的相邻性；存量 19 行逐字保留，零改写）：

  ```
  # MCP_HTTP_SERVERS=         # 外部 MCP server 注册表（HTTP 端点）：逗号分隔 name=url，如 name1=https://host/mcp,name2=…（ADR-0012 / BK-0029）
  # MCP_STDIO_SERVERS=        # 外部 MCP server 注册表（stdio 命令）：逗号分隔 name=命令 参数，如 name1=npx --yes @modelcontextprotocol/server-sqlite --db-path …,name2=…
  ```

- REQ 三要素逐条满足：① 变量名字面两条均在；② 值形态示例与 ADR-0012 §7 案 A
  逐字一致（name=… 逗号分隔）；③ 用途注 =「外部 MCP server 注册表（HTTP 端点 /
  stdio 命令）」+ ADR-0012 / BK-0029 溯源指针。全部 `#` 前缀注释，零生效配置。
- 行内对齐：两条内联 `#` 注释均起于第 29 列，与既有 BOCHA_API_KEY（col 29）、
  ALLOW_PRIVATE_NET（col 29）主对齐一致（SEARXNG 为 27，系存量个别不齐，
  不动它）。

## 4. BUILD 期间自检（本人在工作树内实跑，命令+真实输出）

1. **改动面机器证明（AC2 口径）**：
   - `git diff --numstat -- apps/server/.env.example` → `2  0`（纯插入 2 行零删除）。
   - `git diff -- apps/` → 唯一文件 .env.example 唯一 hunk，两新增行全 `#` 前缀，
     含 `MCP_HTTP_SERVERS` / `MCP_STDIO_SERVERS` 字面与 ADR 形态示例；
     `# ── 可选 ──`、BOCHA、SEARXNG、ALLOW_PRIVATE_NET、PORT 五行上下文原样。
2. **禁区白名单恒空（AC5 口径）**：
   `git diff -- apps/server/src packages apps/web tools/pixel-gate tests .github 'package*.json'`
   → 输出恒空（config.ts 等 env 语义面零触碰）。
3. **EOL 一致性（PRD §7 风险点关闭）**：`git ls-files --eol` 亲证
   `i/lf w/crlf` + `core.autocrlf=true`；`grep -c $'\r'` → 21/21 行含 CR
   （新增两行亦 CRLF，与文件现状逐行一致，无混合行尾）；git 提交侧归一化为 LF
   与 index 现状一致，`git diff` 无整文件重写、无 `\ No newline` 噪音。
4. **改动前 EOL/对齐基线**：`sed -n '15,19p' … | cat -A` 亲证存量行为 CRLF；
   `awk` 亲测存量内联注释列位（BOCHA 29 / SEARXNG 27 / ALLOW 29），新行按 29
   列构造。

## 5. 未跑项（归脚本统一门禁，如实声明）

- `npm run build` / `npm run gate` / `npm test` / `npm run smoke:server` 未由本人
  运行——派发指令明示完整门禁与 git 提交由脚本统一执行。`.env.example` 非构建/
  测试/门禁输入（PRD §0 grep 亲证零引用），AC1/AC4 由脚本与 VERIFY 轮裁决；
  gate 若现 s3-library 单场景红，按 PRD AC3 预案处置（issue #12 在案，CI 权威）。

## 6. 边界确认

- 未触 UI、未扩大影响面：改动恰为 PRD §4 白名单唯一产品文件；零触碰清单
  （apps/server/src/**、apps/web/**、packages/**、tools/pixel-gate/**、tests/**、
  .github/**、package*.json、docs/adr/**）diff 恒空，无 blockedReason。
- 未运行 `npm run gate:update`、未接触 golden（非修宪轮，宪法第 3 条）。
- 不做范围（PRD §6）：未动 config.ts 与任何 env 语义；未为模板行新增断言
  （§4 既定，语义面已由 config.ts zod E1-E8 + smoke MR01-MR11 + CAP01-CAP05
  机器守护）；未动存量 19 行任何一字。

## 7. productFiles 申报（相对工作树根）

- `apps/server/.env.example`（唯一产品面改动；STATE/JOURNAL 为过程件，
  由机制件提交承载，不入产品提交）。
