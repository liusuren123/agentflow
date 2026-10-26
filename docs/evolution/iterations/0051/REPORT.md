# 迭代 0051 · REPORT — BK-0059 .env.example 模板同步：可选段补 MCP 注册表两条目（VERIFY）

> VERIFY 轮产物（WORKFLOW.md §4 VERIFY 契约）。test-manager 产出。
> 本轮隔离工作树 `.zcode/worktree/feat/0051-iter/`（分支 `feat/0051-iter`），
> 全部文件读写与命令均在工作树内执行。验收时间 2026-10-26 14:00–14:07（Node v24.21.0，win32）。
>
> ## 结论：**PASS（5/5 验收标准全过，缺陷清单空，2 条环境/运维侧观察非缺陷）**

执行口径声明：派发指令明示 build / gate / test 已由脚本在工作树内运行且通过、VERIFY 不重复
跑全套；本会话亲跑项 = AC2/AC5 的全部 git 取证、零引用复证、EOL 复证、针对性 E2E
（smoke:server / smoke:mcp:registry）、config 加载器活体验证与 dist 起服抽查。凡非本会话
亲跑的检查，下文均如实标注证据来源。

## 1. AC 逐条验收（PRD §5）

### AC1 正路径/回归零变化 — PASS

- build / test：**由脚本在工作树内运行且通过（派发指令声明，本会话未复跑）**。佐证：
  `apps/web/dist/index.html` mtime `2026-10-26 14:01:30`、`apps/server/dist/*.js`
  mtime `2026-10-26 14:02:14`（本会话 `ls --time-style=full-iso` 亲核）——均晚于
  BUILD 收口（JOURNAL 13:59），且 smoke:server 冒烟即以该 dist 起服通过（见 AC4），
  产物有效性有下游行为背书。
- `.env.example` 非构建/测试输入的复证（本会话亲跑）：
  `grep -rn --exclude-dir=node_modules "env\.example" tests apps tools .github package.json`
  → **零命中（exit=1）**，与 PRD §0 声明一致 → 行为面零变化成立。
  （首轮不带 --exclude-dir 时 ugrep 因悬空符号链接目录告警 exit=2，见 OBS-0051-01；
  排除后干净复跑。）

### AC2 改动面机器证明 — PASS（本会话亲跑）

- `git diff HEAD -- apps/` → **恰 1 文件** `apps/server/.env.example`，唯一 hunk
  `@@ -15,5 +15,7 @@`，纯插入 **2 行**（`git diff --numstat` → `2  0`，零删除），
  落点在「── 可选 ──」段 SEARXNG_URL 与 ALLOW_PRIVATE_NET 之间，存量 19 行逐字保留。
- 两新增行（`.env.example:18-19` 亲读）全部 `#` 前缀、零生效配置，含字面
  `MCP_HTTP_SERVERS` 与 `MCP_STDIO_SERVERS`；值形态
  `name1=https://host/mcp,name2=…` / `name1=npx --yes @modelcontextprotocol/server-sqlite --db-path …,name2=…`
  与 **ADR-0012:191**（§7 案 A 字面量，本会话亲读 `docs/adr/0012-mcp-client-transport.md:187-197`）
  **逐字一致**（name=… 逗号分隔）。行数 2 ≤ 上限 4。
- REQ-0059-01 三要素：① 变量名字面两条均在；② 值形态 = ADR 逐字；③ 用途注
  「外部 MCP server 注册表（HTTP 端点 / stdio 命令）」+ ADR-0012 / BK-0029 溯源指针。齐备。
- `git diff HEAD -- apps/server/src` → 恒空（env 语义面零触碰；实况锚点复核：
  `config.ts:33` 白名单含 `'MCP_HTTP_SERVERS', 'MCP_STDIO_SERVERS'`，`:68/:71`
  superRefine 原样，本会话亲读）。
- EOL 一致性（PRD §7 风险点关闭复证）：`grep -c $'\r' apps/server/.env.example` →
  **21/21** 行含 CR（19 存量 + 2 新增），`wc -l` → 21，无混合行尾。

### AC3 门禁红预案 — 未触发（N/A-PASS）

- 预案 Given 条件（gate 首跑仅 s3 红）未发生：**gate 由脚本在工作树内运行且通过
  （派发指令声明）**，无 s3-library 红需要处置；本项对渲染路径零因果（AC1 零引用
  复证 + AC5 apps/web 零 diff）。未消费 `gate:update`，golden 零接触（AC5 亲证
  tests/golden 无 diff）。

### AC4 回归面 — PASS（亲跑项 + 脚本项分列）

- `npm run smoke:server`（本会话工作树内亲跑）→ **133 passed / 0 failed，exit 0**
  （输出末行 `==== smoke:server：133 passed / 0 failed ====`，smoke_exit=0）——与
  0047/0050 基线 133/0 零回退。
- 补充（env 语义面守护，AC4 括注 MR 组）：`npm run smoke:mcp:registry`（本会话亲跑）
  → **MR01–MR11 全 PASS，11 passed / 0 failed，exit 0**（含 MR02/MR03 fail-fast、
  MR04 形态枚举 E1-E8、MR09 内置清单防漂移）。
- build / gate / npm test：**由脚本运行且通过（派发指令声明，本会话未复跑）**。

### AC5 禁区白名单 — PASS（本会话亲跑）

- `git diff HEAD -- apps/server/src packages apps/web tools/pixel-gate tests .github 'package*.json'`
  → **输出恒空**。
- 追加禁区 `git diff HEAD -- docs/adr` → 恒空（PRD §4 零触碰清单含 docs/adr/**）。
- `git diff HEAD --stat` → 产品面仅 `apps/server/.env.example | 2 ++`；另两处
  （BACKLOG.md +1、STATE.md）与未跟踪 `iterations/0051/` 均为 PRD §4 申报的机制件，
  随机制件提交，不违 AC5。BACKLOG 过程改动亲核 = 仅新增 BK-0059 行（PLAN 轮回写，
  状态 ready，终态记账归主干 CLOSE）。

## 2. 针对性 E2E 与交互回归抽查（test-manager 职责，本会话实跑）

**UI 交互回归清单**（拖拽/缩放/连线等）：本轮不适用——AC5 机器证明 `apps/web`、
`packages`、`tools/pixel-gate`、`tests` 对 HEAD 零 diff，且 AC1 零引用复证证明
渲染/测试/构建路径对 `.env.example` 零引用；HEAD（f2b89eb）承载 0050 已归档的
gate 绿基线，UI 位同一致 → 交互行为必然一致（沿 0047 REPORT:86-90 纯注释零前端
足迹同判：未执行 UI 交互清单，因无可回归对象，如实记录）。

**后端活体抽查**（交互回归在后端平面的等价物，全部本会话亲跑）：

1. **模板真实性验证（本迭代存在意义的直接判据）**——把模板注释中的值形态示例
   具体化（占位名跨变量不同名）喂给真实 config 加载器：
   `MCP_HTTP_SERVERS='name1=https://host/mcp,name2=https://host2/mcp'
   MCP_STDIO_SERVERS='db1=npx --yes @modelcontextprotocol/server-sqlite --db-path
   db.sqlite,cmd2=node helper.js' node --input-type=module -e "import …dist/config.js"`
   → `CONFIG_OK port=3000 allowPrivateNet=false`，**exit 0**——模板示例形态被
   生产校验器接受，模板记载与实现一致。
2. **负面对照**：`MCP_HTTP_SERVERS='no-equals-sign'` 同法 → pino fatal
   `MCP_HTTP_SERVERS="no-equals-sign"：条目 1：name 缺失（无 "="）`，**exit 1**
   ——校验通道活体有效（与 MR02 一致）。
3. **E9 跨变量同名防护顺带验证**：两变量同用 name1/name2 → fatal
   `MCP_HTTP_SERVERS × MCP_STDIO_SERVERS：name 重复注册 [name1, name2]
   （跨变量同名歧义…）`，exit 1（config.ts:100-108 设计行为，见 OBS-0051-02）。
4. **dist 起服抽查**：`PORT=3999 node apps/server/dist/server.js`（工作树 dist，
   boot log 亲核 SQLite 指向工作树 `data\agentflow.db`、监听 :3999）→
   `GET /api/v1/health` 200 `{"ok":true,…}`；`GET /api/v1/models` 200 JSON 正常；
   抽查后进程干净停止。

## 3. 观察项（非缺陷，不阻塞）

- **OBS-0051-01（环境侧）**：工作树 `apps/server/node_modules` 为悬空符号链接，
  指向 doubled path `…/feat/0051-iter/apps/server/apps/server/node_modules`
  （`ls -la` 亲核，git 不跟踪、工作区 status 不受影响）。后果仅为本会话首轮递归
  grep 触发 ugrep 目录告警（exit=2），`--exclude-dir=node_modules` 后干净；构建/
  冒烟依赖经根 node_modules 解析，全部通过。建议：工作树依赖准备步骤（wt.mjs）的
  链接构造留待机制侧排查，非本轮产品范围。
- **OBS-0051-02（运维提示）**：模板两行示例按 PRD 要求逐字取自 ADR-0012:191，
  两变量示例占位名同为 name1/name2；运维若把两行原样启用且跨变量同名，将被 E9
   fail-fast 拒绝（消息自解释，见 §2.3 实测）。这是 ADR 权威字面量 + 设计内防护，
  非本轮缺陷；如需示例占位名跨变量错开，属未来 doc 微调（须与 ADR 同步改），本轮不做。

## 4. 缺陷清单

**空（零 BUG-xxx）。** AC1–AC5 全过；改动恰 1 文件纯插入 2 行注释，零行为、零契约、
零渲染因果；回归面 smoke 133/0 + MR 11/0 与基线零回退。

## 5. 结论与移交

- **VERIFY：PASS**。可进入特性分支双提交（产品提交唯一文件 `apps/server/.env.example`，
  与 JOURNAL §7 申报一致）与 MERGE 阶段；主干复测四件套（build/gate/test/smoke）
  归合并复测执行（AC 验收命令口径，PRD §5）。
- 证据索引：本文件 §1/§2（命令 + 输出摘要）；派发声明项（脚本已跑的 build/gate/test）
  已如实标注来源；AC3 预案未触发。
