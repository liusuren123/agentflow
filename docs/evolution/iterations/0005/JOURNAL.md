# JOURNAL · 迭代 0005 · BK-0007 websearch 引擎参数生效化（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-22 15:51
> 输入：`PRD.md`（REQ-0007-01~06 / AC1~AC7）+ `SPEC.md`（§3 技术方案 / §4 受影响文件
> 清单 / §6 冒烟扩展 / §7 验收口径）。实现严格按 SPEC 受影响文件清单落点，
> 未扩大影响面、未触及 UI（`packages/shared` 与 `apps/web` 零改动）。

## 1. 改动清单（7 文件，与 SPEC §4 一一对应）

| 文件 | 改后行数（SPEC 预估） | 改动内容 |
| --- | --- | --- |
| `apps/server/src/config.ts` | 109（~110） | 白名单数组、EnvSchema、产物三段落新增 `SEARXNG_URL`（`.trim().url()` zod，缺省/空串合法；产物字段 `searxngUrl`），SPEC §3.4 |
| `apps/server/src/guard.ts` | 100（~99） | `ddgHtmlSearch` 后新增动态主机网关 `searxngSearch(baseUrl, q, count)`：拼 `/search`、`q`/`format=json` 经 URL API 编码、`assertPublicUrl` 校验、UA 复用、12s 超时；`count` 不进请求（SearXNG JSON 无服务端条数参数，调用方结果侧截断，注释已说明），SPEC §3.3 |
| `apps/server/src/search.ts` | 109（~103） | 新增 `StrictResult` 类型 + `strictBochaSearch` / `strictSearxngSearch`（配置探测→单次请求→失败如实 `{skipped, reason}`，不回退不重试；博查解析式与既有 `webSearch` 一致，SearXNG 映射 `j.results[]` 三字段、`String(content\|\|'')` 截断 200）；顺手统一 `webSearch` 内 `process.env.BOCHA_API_KEY` → `config.bochaApiKey`（SPEC §3.2 授权，语义零变化）；模块头注更新（严格调用器 + 出口网关清单补 searxngSearch） |
| `apps/server/src/handlers.ts` | 244（~251） | 仅 websearch 段（原 :49-59）：`eng='博查'/'SearXNG'` → 严格调用器，skipped 时按 SPEC §3.5 文案定稿表 emit warn log + out（含 `eng=<值>` 前缀 + 所缺变量名）；否则先发「未接入」warn（先于回退链，含实收 eng 值）→ 既有 `webSearch` 回退链**逐字保留**（null→现状跳过文案、成功→现状成功文案均原文）；import 行补两个严格调用器 |
| `apps/server/.env.example` | +1 | `# SEARXNG_URL=…` 注释行置于 BOCHA 行后（SPEC §3.4 原文） |
| `tests/smoke/lib.mjs` | 245（~249） | `startServer(port, opts = {}, timeoutMs = 20000)`：spawn env 变为 `{...process.env, PORT, ...opts.env}`（覆盖表后置，空串双重压制机理注释入档），SPEC §6.1 |
| `tests/smoke/smoke-server.mjs` | 342（~348） | ① `startServer` 调用点传 `{env:{BOCHA_API_KEY:'', SEARXNG_URL:''}}`（受控 env，防本机 `.env` 泄入）；② `wfEng(eng)` 夹具工厂（userinput→websearch，params 显式给出）；③ D 组后新增 E 组 `runEng` 辅助 + E01/E02/E03 断言（判据逐条对应 SPEC §6.2 表格：E01 四判据、E02 两判据、E03 三判据，各自单 PASS 行；runId 照 `CLEAN.runIds.push` 登记清理） |

全部 ≤400 行（AGENTS 硬性约定 4），无新增源文件，无拆分需要。

## 2. 关键实现决策（均在 SPEC 授权范围内）

1. **TS 收窄实现**：SPEC §3.5 伪码 `if(r && !Array.isArray(r) && r.skipped)` 在
   strict 模式下无法通过类型检查（`skipped` 不在 `SearchResponse` 上）——落地为
   `if(!Array.isArray(r) && 'skipped' in r && r.skipped)`（`in` 收窄，运行时语义与
   伪码等价：`StrictResult` 三态中仅 skipped 分支命中）。
2. **严格分支成功组装的内层 map 变量**改名 `x`（外层 `r` 为 StrictResult，避免
   遮蔽）；回退分支 `:56-58` 三行逐字保留（内层仍为 `r`，与原文一致）。
3. **`config.searxngUrl` 先收窄为局部常量 `baseUrl`** 再传入网关（干净的
   `string` 收窄；SPEC 行为表同语义）。
4. **SearXNG `j.results` 非数组时按空结果容错**（`Array.isArray` 探测 → `[]`，
   「0 条也算成功」+ PRD 风险 2 字段缺失容错；解析失败仍归 skipped）。
5. **空查询边缘行为不新增特判**（SPEC §3.5 实现说明 4）：R1/R2 空查询返回 `[]`
   进入现状成功组装段，与存量 `webSearch` 返回 `[]` 的边缘完全对齐，冒烟不覆盖。

## 3. 自检（BUILD 内执行；完整门禁 build/gate/test 由脚本统一执行，未自行运行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| server TS 类型检查（无产物，非 V2 门禁） | `cd apps/server && npx tsc -p tsconfig.json --noEmit` | 退出码 0，零错误 |
| 冒烟脚本语法检查 | `node --check tests/smoke/smoke-server.mjs && node --check tests/smoke/lib.mjs` | `syntax OK` |
| 改动面核对（只读 git） | `git status --porcelain` + `git diff --stat` | 仅 SPEC §2 改动清单 7 文件 + STATE.md/迭代目录（协调者产物）；`packages/shared`、`apps/web`、`tools.ts`、`engine.ts`、`server.ts`、`tools/pixel-gate`、`.github` 零触及 |
| 行数规模核对 | `wc -l`（上表） | 7 文件全部 ≤400，与 SPEC §4 预估一致 |

**未运行**（属 SPEC §7 V1-V6 门禁序列，由脚本统一执行）：`npm run build` /
`npm run build:server` / `npm run gate` / `npm test` / `npm run smoke:server` /
V6 `git diff --stat` 正式判据。冒烟因需先构建 dist 产物（P01/P02 前置）一并留交
脚本；BUILD 侧以类型检查 + 语法检查 + 判据文案静态核对为自检边界。

## 4. 冒烟断言基数口径（VERIFY 引用）

- 断言 id：32 → **35**（+E01/E02/E03），全部经既有 `openSse` → `waitFor('run:done')`
  → events 过滤，单 id 单 PASS 行。
- 典型 PASS 行数：既有 33（32 id，C01 逐 run 打点 2 行）+ E 组 3 id + C01 随
  `CLEAN.runIds` 2→5 增至 5 行 → 预计 **39 passed**（SPEC §6.2 的「≥36」为下限
  口径，实际以脚本实跑输出为准；C.failed===0 为硬判据）。
- 三条断言离线确定性：E01/E02 在配置探测步即 skip（不触网）；E03 标注先于回退链
  任何网络调用，且 out 无论回退链成败（DDG 成功 `DuckDuckGo 返回 N 条` / 全败
  现状跳过文案）均不含 `eng=`。

## 5. 与 SPEC 的偏差记录

- 无行为语义偏差。仅两处纯实现级适配：§2.1 的 TS `in` 收窄写法、§3.3 网关
  `count` 参数保留在签名但不进请求（SPEC 定稿请求格式即无 count，注释已说明
  缘由）。
- 冒烟典型 PASS 行数预计 39（SPEC §6.2 行文「36 passed」按 33+3 粗算，未计
  C01 打点行 2→5 的增量；硬判据 `C.failed === 0 && C.passed >= 36` 不受影响，
  以实跑为准）。

## 6. 遗留与交接

- BUILD 侧无阻塞、无 UI 触及、无影响面扩大（§3 改动面核对为证）。
- VERIFY 承接：SPEC §7 V1-V6 全序列 + E01-E03 判据 + 可选 M1-M5 手动 E2E /
  §6.3 反演演练（REPORT 注明做否）。
- README 补记 eng 路由属治理日另行小项（PRD 非目标，本迭代未动）。
