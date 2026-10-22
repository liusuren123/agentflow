# SPEC · 迭代 0005 · BK-0007 websearch 引擎参数生效化

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 15:37
> 输入：`docs/evolution/iterations/0005/PRD.md`（PLAN 产物，REQ-0007-01~06 / AC1~AC7）。
> 本文所有代码行号均于 2026-10-22 本会话只读核实（handlers.ts / search.ts / guard.ts /
> config.ts / engine.ts / tools.ts / nodes.ts / .env.example / tests/smoke 两文件 / 根与
> shared 的 package.json）。
> 冲突顺位遵守 spec-designer 职责约定：CONSTITUTION.md > 代码实现 > 其他文档。

## 0. 结论摘要

**纯后端改造，触 UI = 否（沿用 PRD §触UI 结论）**；**无架构选型分叉，不需 ADR**
（判定理由见 §9）。改动集中在 `apps/server/src` 四个文件 + `.env.example` +
`tests/smoke` 两文件；`packages/shared`、`apps/web`、`tools/pixel-gate`、CI、golden
**零触及**（REQ-0007-06）。技术核心：

1. **eng 路由判定放 handlers.ts**（eng 值在手、文案组装与 SSE emit 是 handler 职责），
   search.ts 新增两个**严格引擎调用器**（`strictBochaSearch` / `strictSearxngSearch`），
   既有 `webSearch(query, count)` 签名与回退链行为**一字不动**——MCP web-search 工具
   （`tools.ts:62-71`）共用它，零改动即保持现状（非目标边界）。
2. **SearXNG 出站走 guard.ts 新增动态主机网关 `searxngSearch`**：目标 URL 来自运维 env
   （非常量），经既有 `assertPublicUrl`（`guard.ts:33`）校验后 fetch——与固定主机网关
   （`guard.ts:64-86`）同层集中出口，满足 AGENTS 硬性约定 3「出站请求必须走 guard.ts」。
3. **config.ts 新增可选 `SEARXNG_URL`**：`.trim().url()` zod 校验（先例 `AI_BASE_URL`，
   `config.ts:50`），缺省/空串合法，配错 fail-fast 指名变量；产物字段 `searxngUrl`。
   顺手把 search.ts 直读 `process.env.BOCHA_API_KEY`（`search.ts:19`）统一为
   `config.bochaApiKey`（PRD 背景 3 授权、语义零变化，见 §3.6）。
4. **降级文案定稿**（§3.5 表格）：严格分支的 out 携带 `eng=<值>` 前缀 + 所缺变量名，
   与现状回退链全败文案（`handlers.ts:53`，含「BOCHA_API_KEY」字样但无 `eng=` 前缀）
   互斥可判；Bing/Google 分支新增「未接入」warn log（先于回退链发出，网络无关）。

## 1. 代码事实基线（本会话逐行核实）

| 事实 | 出处 |
| --- | --- |
| websearch handler 只消费 `p.max`，`webSearch(q, Number(p.max)\|\|5)` 不传引擎 | `apps/server/src/handlers.ts:49-59` |
| `webSearch(query, count=5)` 固定回退链：BOCHA→DDG→null；直读 `process.env.BOCHA_API_KEY` | `apps/server/src/search.ts:14-58`（:19 直读 env） |
| `p.eng` 恒有值：engine 以 DEFS 默认值 + 节点 params 合并装袋 `P(n)` | `apps/server/src/engine.ts:38`；DEFS eng combo `['Bing','Google','博查','SearXNG']` d:'Bing' 在 `packages/shared/src/nodes.ts:48` |
| guard 两种既有出站通道：`guardedFetch`（动态 URL，`guard.ts:59-62`）与固定主机网关 `bochaWebSearch`/`ddgHtmlSearch`（`guard.ts:71-86`，bocha 段已消费 `config.bochaApiKey`，`guard.ts:75`） | `apps/server/src/guard.ts` |
| config 白名单 / EnvSchema / 产物三段落；空串视为未配置；URL 校验先例 `.trim().url()` | `apps/server/src/config.ts:28-35, 49-62, 88-103`（:50 先例，:96 bochaApiKey） |
| MCP web-search 工具共用 `webSearch`，schema 无 engine 参数 | `apps/server/src/tools.ts:61-72, 83-84` |
| `.env.example` BOCHA 注释行先例 | `apps/server/.env.example:16` |
| 冒烟：`startServer(port)` 唯一调用点，env 通道 `{...process.env, PORT}` | `tests/smoke/lib.mjs:67-74`；`tests/smoke/smoke-server.mjs:101` |
| 冒烟断言基数：**32 个断言 id**（P2+H1+W7+N3+S5+R3+D7+C4），典型运行 33 passed（C01 对 2 个待清理 run 各打一行 PASS） | 迭代 0002 SPEC §6 与 REPORT `:133/:218`；本会话对 `smoke-server.mjs` 静态清点一致 |
| `npm test` = 根脚本先构建 shared+server 再 `node --test`（shared 4 个 test 文件） | `package.json:18`；`packages/shared/package.json:15`；test/ 目录 4 文件（contract/defs-drift/events-negative/handlers-coverage） |

> 口径澄清（PRD「既有 33 断言」）：权威定义是 **32 个断言 id**；33 为典型运行的 PASS
> 行数（C01 逐 run 打点）。本 SPEC 以下均用「断言 id」口径。

## 2. 触及边界总览

```
改动（7 文件）                       零触及（机器判据：git diff 为空）
  apps/server/src/config.ts            packages/shared/**   （REQ-0007-06 / AC6-AC7）
  apps/server/src/guard.ts             apps/web/**
  apps/server/src/search.ts            apps/server/src/tools.ts
  apps/server/src/handlers.ts          apps/server/src/engine.ts
  apps/server/.env.example             apps/server/src/server.ts
  tests/smoke/lib.mjs                  tools/pixel-gate/** · .github/** · tests/golden/**
  tests/smoke/smoke-server.mjs         docs/ai-sdk-7-功能汇总.md · README.md
```

- tools.ts 零触及论证：`webSearch` 签名/回退链不动 → `tools.ts:62-71` 行为与类型上下文
  均不变。
- engine.ts 零触及论证：`P(n)`（`engine.ts:38`）已把 DEFS 默认值并入 params，`p.eng`
  对 handler 已就位，装配层无感知。
- server.ts 零触及论证：不发新事件类型——严格路由分支只复用既有 `log`（lvl/msg）与
  `node:done`（out）载荷字段，SSE 契约（`packages/shared` 事件表）零漂移。

## 3. 技术方案

### 3.1 引擎路由分支总览（REQ-0007-01 定档的实现映射）

| # | `p.eng` 值 | 路径 | 网络出口 | 失败语义 |
| --- | --- | --- | --- | --- |
| R1 | `'博查'` | `strictBochaSearch(q, n)` 严格路由 | `guard.bochaWebSearch`（既有，`guard.ts:71-79`） | 未配置 key / 请求失败 → **如实跳过，不回退** |
| R2 | `'SearXNG'` | `strictSearxngSearch(q, n)` 严格路由 | `guard.searxngSearch`（**新增**，§3.3） | 未配置 URL / 实例不可达 / 响应异常 → **如实跳过，不回退** |
| R3 | `'Bing'`（DEFS 默认）、`'Google'`、其他未知值 | 先发「未接入」warn log（含实收 eng 值）→ 既有 `webSearch(q, n)` 回退链**原样** | 既有 `guard.bochaWebSearch`/`ddgHtmlSearch` | 与现状逐字一致（成功→引擎名 out；全败→现状跳过文案） |

R3 是存量主路径（eng 默认 'Bing'）：行为 = 现状 + 一条先导 warn 标注，**存量工作流零
行为回归**（AC3「三条收尾形态与改造前逐一对照」即：博查成功 / DDG 成功 / 全败跳过，
均不变）。未知 eng 值与 Bing/Google 同走 R3，warn 文案带实收值（REQ-0007-01 第四分支）。

### 3.2 search.ts — 严格引擎调用器（无网络出口约定保持）

既有 `webSearch` 与 `SearchResult`/`SearchResponse`（`search.ts:11-12`）不动。新增：

```ts
/* 严格路由结果：skipped 时 reason 为短原因短语（不含 eng 值——eng 由 handler 组装文案） */
export type StrictResult =
  | SearchResponse                                   // 成功（含 0 条结果，engine='博查'|'SearXNG'）
  | []                                               // 空查询（与 webSearch 首行语义对齐，见下）
  | { skipped: true; reason: string };

export async function strictBochaSearch(query: unknown, count = 5): Promise<StrictResult>
export async function strictSearxngSearch(query: unknown, count = 5): Promise<StrictResult>
```

**行为表**（两函数同构，仅引擎与配置项不同）：

| 步骤 | strictBochaSearch | strictSearxngSearch |
| --- | --- | --- |
| 查询归一 | `q` 空白 → 返回 `[]`（`search.ts:15-16` 同款归一） | 同左 |
| 配置探测 | `config.bochaApiKey` 缺失 → `{skipped:true, reason:'未配置 BOCHA_API_KEY'}` | `config.searxngUrl` 缺失 → `{skipped:true, reason:'未配置 SEARXNG_URL'}` |
| 请求 | `bochaWebSearch(q, n)`（既有网关） | `searxngSearch(config.searxngUrl, q, n)`（新网关） |
| 成功判定 | HTTP ok 且 body 可 JSON 解析 → 成功：`j.data.webPages.value` 映射前 n 条（解析式与 `search.ts:24-26` 一致），**0 条也算成功** | 同左：`j.results[]` 映射前 n 条（§3.4），0 条也算成功 |
| 失败判定 | 网络异常 / HTTP 非 ok / JSON 解析失败 → `{skipped:true, reason:'博查 API 请求失败'}` | `{skipped:true, reason:'SearXNG 实例请求失败'}`（guard 拦截、超时、非 JSON 均归此） |

设计要点：

- **`reason` 不含 eng 值**：eng 值在 handler 层（`p.eng`），文案由 handler 拼（单一文案
  出口，避免双处拼接漂移）；reason 只含所缺变量名/失败短语，恰好是 REQ-0007-04 要求的
  可断言子串。
- **失败一律单次尝试、不重试、不回退**（REQ-0007-01「不回退其他引擎、不伪造结果」）。
- **空查询返回 `[]`**：与 `webSearch` 首行语义对齐；handler 对 `[]` 的处理沿用现状
  处理段（见 §3.5 实现说明第 4 点的边缘行为记录）。
- 顺手统一：`webSearch` 内部 `process.env.BOCHA_API_KEY`（`search.ts:19`）改读
  `config.bochaApiKey`。语义等价证明：config 装载把空串归一为 undefined
  （`config.ts:33-35`），而 `process.env.X` 为空串时本就 falsy——两通道在「未配置/
  空串/有值」三态下行为一致；且 `.env` 文件值同样经 config 装载（`config.ts:17-24`），
  无双读时序差。此为 PRD 背景 3 明示的可顺手项，**行为零变化**。

### 3.3 guard.ts — SearXNG 动态主机网关（新增导出，置于 `ddgHtmlSearch` 后）

```ts
/* SearXNG：目标主机来自运维 env（非常量）——经 assertPublicUrl 动态校验后请求，
 * 与固定主机网关同层集中出口。查询词只经 URL API 编码进查询参数。 */
export async function searxngSearch(baseUrl: string, q: string, count: number): Promise<Response> {
  const u = new URL(baseUrl);
  u.pathname = u.pathname.replace(/\/+$/, '') + '/search';
  u.searchParams.set('q', q);
  u.searchParams.set('format', 'json');
  await assertPublicUrl(u);
  return fetch(u, { headers:{ 'User-Agent':UA }, signal: AbortSignal.timeout(12000) });
}
```

**SearXNG 查询协议定稿**（REQ-0007-03 要求写入验收点）：

| 项 | 定稿 |
| --- | --- |
| `SEARXNG_URL` 语义 | 实例根 URL（如 `http://searx.example:8080`，可含子路径）；请求端点恒拼 `/search` |
| 请求 | `GET <SEARXNG_URL>/search?q=<URL-API 编码>&format=json`，UA 复用 guard 既有 `UA`（`guard.ts:69`），超时 12s（同 DDG 档） |
| 响应映射 | HTTP 200 且 JSON 可解析 → `j.results[]` 每条 `{title, url, content}` 映射 `{title, url, snippet: String(content\|\|'').slice(0,200)}`，取前 n 条（snippet 截断档与博查一致，`search.ts:25`） |
| 异常归并 | 非 200 / JSON 解析失败 / 网络错误 / guard 拦截（内网目标且未开 `ALLOW_PRIVATE_NET`）/ 超时 → 统一 `{skipped:true, reason:'SearXNG 实例请求失败'}`（handler 文案会携带该短语；guard 拦截场景运行时可读原文见 warn log） |

**安全论证**：目标 URL 来源是运维 env 而非工作流用户输入（PRD 非功能 3）；默认拦截
私网/回环（`assertPublicUrl`，`guard.ts:37-55`），自托管内网实例走既有
`ALLOW_PRIVATE_NET=1` 逃生通道（`guard.ts:5-6` 头注、`config.ts:90`）——与 HTTP 节点
同规。查询词经 `u.searchParams.set` 编码，只进查询参数（维持 `search.ts:5-7` 头注
约定）。**注意**：开启 `ALLOW_PRIVATE_NET` 后 SearXNG 与 HTTP 节点同样获得内网通行，
不新增额外开关（运维单一开关语义）。

### 3.4 config.ts — 新增可选 `SEARXNG_URL`（REQ-0007-02）

| 落点 | 改动 |
| --- | --- |
| 白名单（`config.ts:28-32`） | 数组追加 `'SEARXNG_URL'` |
| EnvSchema（`config.ts:49-62`） | `SEARXNG_URL: z.string().trim().url('必须是合法绝对 URL').optional()`（与 `AI_BASE_URL` 同款，`:50`） |
| 产物（`config.ts:88-103`） | `searxngUrl: env.SEARXNG_URL,` |
| `.env.example` | `# SEARXNG_URL=            # SearXNG 自托管实例根 URL（网页搜索节点 eng=SearXNG；缺省该引擎如实跳过）`（置于 BOCHA 行后，先例 `:16`） |

行为：未设置/空串 → `searxngUrl` 为 undefined，启动正常（缺省合法，`config.ts:33-35`
空串归一）；配了非法 URL（如 `not-a-url`）→ 启动期 fail-fast，problems 指名
`SEARXNG_URL`（`config.ts:64-67` 机制，AC4）。zod 仅校验「合法 URL」，不限定
http(s)——与 `AI_BASE_URL` 先例一致；若运维误配 `ftp://` 等，运行时由
`assertPublicUrl` 以「仅允许 http(s) 协议」拦截并落入如实跳过（§3.2 失败判定），
不做双层校验（避免与先例不一致的过度设计）。

### 3.5 handlers.ts — websearch 段路由与文案定稿（REQ-0007-04）

改造 `handlers.ts:49-59`（其余 handler 零触及）。结构：

```ts
async websearch(_ctx, { p, input, vars, emit }): Promise<NodeResult> {
  const q = strInput(input, vars.question || '');
  const eng = String(p.eng ?? 'Bing');
  const n = Number(p.max) || 5;
  if(eng === '博查' || eng === 'SearXNG'){
    const r = eng === '博查' ? await strictBochaSearch(q, n) : await strictSearxngSearch(q, n);
    if(r && !Array.isArray(r) && r.skipped){
      emit('log', { lvl:'warn', msg:`搜索不可用：引擎「${eng}」${r.reason}，本次跳过联网参考（不回退其他引擎）` });
      return { value: [], ports: [[]], out: `搜索不可用 · 已跳过联网参考（eng=${eng} · ${r.reason}）` };
    }
    /* 成功（含空查询 [] 与 0 条结果）：沿用现状成功路径组装 */
    const res = r as { engine: string; results: { title: string; url: string; snippet: string }[] };
    vars.results = res.results; /* …现状 :56-58 三行原样… */
    return { value: res.results, ports: [res.results], out: `${res.engine} 返回 ${res.results.length} 条结果` };
  }
  emit('log', { lvl:'warn', msg:`引擎「${eng}」未接入 AgentFlow 后端，已按回退链（博查 → DuckDuckGo）执行` });
  const res = (await webSearch(q, n)) as { engine: string; results: … } | null;
  /* …现状 :52-58 逐字保留（null→现状跳过文案；成功→现状成功文案）… */
}
```

**文案定稿表**（四分支互斥可判；「断言子串」列即 §6 冒烟判据）：

| 分支 | log（warn）msg | node:done.out | 断言子串（out） |
| --- | --- | --- | --- |
| R1 博查·缺 key | `搜索不可用：引擎「博查」未配置 BOCHA_API_KEY，本次跳过联网参考（不回退其他引擎）` | `搜索不可用 · 已跳过联网参考（eng=博查 · 未配置 BOCHA_API_KEY）` | `eng=博查` + `BOCHA_API_KEY` |
| R1 博查·请求失败 | `搜索不可用：引擎「博查」博查 API 请求失败，本次跳过联网参考（不回退其他引擎）` | `搜索不可用 · 已跳过联网参考（eng=博查 · 博查 API 请求失败）` | `eng=博查` |
| R2 SearXNG·缺 URL | `搜索不可用：引擎「SearXNG」未配置 SEARXNG_URL，本次跳过联网参考（不回退其他引擎）` | `搜索不可用 · 已跳过联网参考（eng=SearXNG · 未配置 SEARXNG_URL）` | `eng=SearXNG` + `SEARXNG_URL` |
| R2 SearXNG·不可达 | `搜索不可用：引擎「SearXNG」SearXNG 实例请求失败，本次跳过联网参考（不回退其他引擎）` | `搜索不可用 · 已跳过联网参考（eng=SearXNG · SearXNG 实例请求失败）` | `eng=SearXNG` |
| R3 未接入标注（先导，任何网络结果前发出） | `引擎「<eng>」未接入 AgentFlow 后端，已按回退链（博查 → DuckDuckGo）执行` | （后续由回退链结果决定） | log 判据：`未接入`（out 无） |
| R3·回退链全败（现状原文） | `搜索服务不可用（未配置 BOCHA_API_KEY 且 DuckDuckGo 不可达），本次跳过联网参考`（`handlers.ts:53` 原文保留） | `搜索不可用 · 已跳过联网参考（其余流程继续）`（`:54` 原文保留） | — |
| R1/R2/R3·成功 | —（不发新 log） | `<引擎名> 返回 N 条结果`（`:58` 语义保留，引擎名 ∈ {博查, SearXNG, DuckDuckGo}） | — |

**互斥性论证**（PRD 风险：现状全败文案 `handlers.ts:53` 也含「BOCHA_API_KEY」字样，
单用该子串不互斥）：

- 严格分支主判据是 **out 的 `eng=<值>` 前缀**——现状全败文案无此前缀，天然互斥；
- 「不回退其他引擎」短语仅出现在严格分支 log，现状文案无；
- 「未接入」短语仅出现在 R3 先导 warn；严格分支与现状全败文案均无（websearch 场景
  内无 notify 节点，不受 `handlers.ts:97` 通知渠道「未接入」文案干扰——冒烟夹具可证）。
- 任何分支均无「搜索成功」类伪装表述（跳过即明示跳过，REQ-0007-04 红线）。

**实现说明**：

1. 「未接入」warn **先于** `webSearch` 调用发出（AC3「先于回退链尝试发出，网络
   无关」）——受控/离线环境下该断言确定性成立。
2. 跳过返回 `{value:[], ports:[[]], out:…}`，与现状跳过同构（run 不失败、流程继续，
   `handlers.ts:54` 语义）。
3. `eng` 归一为 `String(p.eng ?? 'Bing')`——`p.eng` 由 `P(n)` 恒供默认值
   （`engine.ts:38`），`??` 仅为类型收窄兜底，不改变装配语义。
4. **边缘行为记录（不改、不修）**：空查询（input 显式空串且 `vars.question` 空）在
   R3 现状路径会因 `res.results` 为 undefined 在组装行抛错——这是**存量行为**，
   本迭代不触碰（WORKFLOW「不做夹带」）；R1/R2 新路径对空查询返回 `[]` 后同样进入
   现状成功组装段（同款边缘），即新路径与存量边缘行为对齐、不新增特判。冒烟断言
   不覆盖空查询（非 REQ 要求）。

### 3.6 不做的事（与 PRD 非目标一一对应）

- 不为 MCP web-search 工具加 engine 参数（`tools.ts:83-84` schema 不动）。
- 不接 Bing/Google 真实 API；不做结果合并/重排/缓存。
- 不改 README / `docs/ai-sdk-7-功能汇总.md`（0004 AC4 红线的解除留给治理日小项）。
- 不动 `webSearch` 回退链内部逻辑（除 §3.2 末点的 env 读取统一）。

## 4. 受影响文件清单（含规模核对，AGENTS 硬性约定 4）

| 文件 | 改动内容 | 现行数 | 预估净增 | 改后预估 |
| --- | --- | --- | --- | --- |
| `apps/server/src/config.ts` | 白名单 +schema +产物字段 `searxngUrl` | 107 | +3 | ~110 |
| `apps/server/src/guard.ts` | 新增 `searxngSearch` 动态主机网关 | 87 | +12 | ~99 |
| `apps/server/src/search.ts` | `StrictResult` 类型 + 两严格调用器 + BOCHA 读取统一 config | 58 | +45 | ~103 |
| `apps/server/src/handlers.ts` | websearch 段路由改造 + 文案（仅 :49-59 段） | 226 | +25 | ~251 |
| `apps/server/.env.example` | `SEARXNG_URL` 注释行 | 19 | +1 | 20 |
| `tests/smoke/lib.mjs` | `startServer` 增加 env 覆盖通道 | 243 | +6 | ~249 |
| `tests/smoke/smoke-server.mjs` | E 组夹具 + 断言 E01-E03 | 288 | +60 | ~348 |

全部 ≤400 行，无拆分需要（PRD 风险 5 解除：smoke-server.mjs 预估 ~348 < 400）。
不新增源文件。

## 5. 模块边界（改后依然成立的分层契约）

```
config.ts    唯一 env 装载与校验层：SEARXNG_URL/BOCHA_API_KEY 均只在此入仓，
             产物字段 searxngUrl/bochaApiKey 供下游消费（search.ts 直读 env 的口径就此归一）
guard.ts     唯一网络出口层：固定主机网关 ×2（既有）+ 动态主机网关 searxngSearch（新增）；
             所有出站经 assertPublicUrl（私网默认拦截，ALLOW_PRIVATE_NET 逃生）
search.ts    搜索编排层，无网络出口（头注 search.ts:5-7 约定保持）：回退链 webSearch
             （签名/行为不变，tools.ts 共用）+ 严格调用器 ×2（返回 StrictResult，
             skipped 携带变量名短语）
handlers.ts  节点文案与 SSE 层：eng 判定（§3.1 分支表）+ 降级/标注文案组装（§3.5
             定稿表）+ emit；不直接触网、不直接读 env
engine.ts / server.ts / tools.ts / packages/shared / apps/web   零触及（§2 论证）
```

## 6. 冒烟断言扩展（REQ-0007-05；承迭代 0002 基座）

### 6.1 受控 env（PRD 风险 1 的落实）

`lib.mjs startServer` 签名改为 `startServer(port, opts = {})`，`opts.env` 为子进程
env 覆盖表，spawn env 变为 `{...process.env, PORT:String(port), ...opts.env}`：
现唯一调用点 `smoke-server.mjs:101` 改传
`{ env: { BOCHA_API_KEY:'', SEARXNG_URL:'' } }`。**空串双重压制的机理**：
`config.ts:21` 装载 `.env` 时「不覆盖已有环境变量」——显式空串使 `process.env` 已有
该键，`.env` 文件值被跳过；`config.ts:33-35` 再把空串归一为未配置。开发者本机
`process.env` 或 `apps/server/.env` 的密钥均无法泄入冒烟子进程（AC5/风险 1 关闭）。

### 6.2 新增断言 E01-E03（E 组，接在 D 组后、C 组清理语义不变）

夹具（一条工厂函数，params 显式给出——沿 `smoke-server.mjs:13` 夹具约定）：

```js
const wfEng = (eng) => ({
  name: `smoke-eng-${eng}`,
  nodes: [
    { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'question', defv: '冒烟测试问题' } },
    { id: 2, type: 'websearch', x: 320, y: 100, params: { eng, max: 3 } },
  ],
  edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
  inputs: { question: '冒烟测试问题' },
});
```

| id | 夹具 eng | 断言（全部经既有 `openSse` → `waitFor('run:done')` → events 过滤） | 对应 AC |
| --- | --- | --- | --- |
| E01 | `'博查'` | ① `run:done {ok:true, done:2, total:2}`（跳过不失败、流程继续）；② `node:done(id=2).out` 含 `eng=博查` **且** 含 `BOCHA_API_KEY`；③ 存在 `log` 事件 msg 含 `不回退其他引擎`；④ out **不含** `DuckDuckGo`（严格路由未触 DDG） | AC1（缺 key 半支） |
| E02 | `'SearXNG'` | ① `run:done {ok:true}`；② `node:done(id=2).out` 含 `eng=SearXNG` **且** 含 `SEARXNG_URL` | AC2（缺 URL 半支） |
| E03 | `'Bing'` | ① `run:done {ok:true}`；② 存在 `log` 事件 msg 含 `未接入`（先导标注，与网络成败无关——无外网时回退链全败，标注已发出）；③ `node:done(id=2).out` **不含** `eng=`（互斥性反证：未误入严格分支文案） | AC3（标注半支） |

**确定性论证**（PRD 非功能 1）：受控 env 下 E01 在配置探测步即 skip（不触网）、E02
同理、E03 的标注先于任何网络调用——三条断言在完全离线环境结果一致；断言只锁路由
证据文案，不锁外部引擎返回（正路径不入冒烟，列 §7 手动 E2E 可选点位）。
三 run 的 runId 照 `CLEAN.runIds.push` 约定登记清理。

**基数口径**：断言 id 32 → **35**（+E01/E02/E03）；典型运行输出
`==== smoke:server：36 passed / 0 failed ====`（33+3，C01 打点行随待清理 run 数
3→5 增至 5 行——C01 逐 run 打点是 0002 SPEC 既有语义）。VERIFY 以
`C.failed === 0 && C.passed >= 36` 且 E01-E03 各有 PASS 行为准。

### 6.3 反演演练（AC5 可选半支，VERIFY 裁量）

人为破坏任一路由分支（如 BUILD 后临时把 `eng === '博查'` 判定改坏）→ 对应 E 断言红；
验证后还原。不强制执行，REPORT 注明做否。

## 7. 验收口径（命令 + 手动 E2E 点位）

**命令序列（仓库根，产品提交前全跑，证据贴 JOURNAL/REPORT）**：

| # | 命令 | 通过判据 |
| --- | --- | --- |
| V1 | `npm run build` | shared+web 构建成功（gate 前置） |
| V2 | `npm run build:server` | server TS 编译零错误（tsc，AC4 改动可编译） |
| V3 | `npm run gate` | 4 场景全绿 diffPx=0（AC6；零前端改动机器证据） |
| V4 | `npm test` | shared 契约测试全绿（AC7：默认值 33/33 等漂移防护未触；PRD 口径 node --test 8 项，以实跑输出为准） |
| V5 | `npm run smoke:server` | 退出码 0；E01-E03 PASS；既有 32 id 断言零回退（§6.2 基数口径） |
| V6 | `git diff --stat -- packages/shared apps/web apps/server/src/tools.ts apps/server/src/engine.ts apps/server/src/server.ts tools/pixel-gate .github` | 无输出（零触及清单机器判据，AC6/REQ-0007-06） |

**手动 E2E 点位（可选，不阻断 VERIFY 判定；PRD AC1/AC2/AC4 正路径）**：

| # | 点位 | 步骤 | 预期 |
| --- | --- | --- | --- |
| M1 | 博查正路径 | 配置 `BOCHA_API_KEY` 后建 userinput→websearch(eng=博查) 工作流运行 | out = `博查 返回 N 条结果`（N≥0） |
| M2 | SearXNG 正路径 | 配置可达 `SEARXNG_URL`（实例需开 `format=json`）后运行 eng=SearXNG | out = `SearXNG 返回 N 条结果` |
| M3 | SearXNG 不可达 | 配置不可达 URL（如 `http://127.0.0.1:1`，需 `ALLOW_PRIVATE_NET=1` 视目标而定） | 如实跳过：out 含 `eng=SearXNG · SearXNG 实例请求失败`，run 不失败 |
| M4 | AC4 fail-fast | `SEARXNG_URL=not-a-url node apps/server/dist/server.js` | 进程退出码 1，日志 problems 指名 `SEARXNG_URL`；不设置/空串时启动正常 |
| M5 | 存量回归眼验 | 打开 Web UI 跑默认示例工作流（eng 默认 Bing） | 行为与改造前一致 + 日志面板多一条「未接入」warn |

## 8. 风险与对策（对 PRD 风险表的实现级收口）

| PRD 风险 | 本 SPEC 收口 |
| --- | --- |
| 1 冒烟 env 泄漏 | §6.1 空串双重压制（`.env` 不覆盖 + 空串归一），机理闭环 |
| 2 SearXNG 实例异构 | §3.3 协议定稿：仅依赖 `format=json` 的 `results[]` 三字段，字段缺失按空串容错（`String(content\|\|'')`）；解析失败归「实例请求失败」如实跳过 |
| 3 文案变化误判 UI | PRD §触UI 已逐层论证；本 SPEC 补机器证据链（V3/V6）；如仍存疑按宪法第 5 条升级 |
| 4 handlers/search 边界重构 | §5 分层契约定档（判定在 handler、调用器在 search、出口在 guard），行为语义以 REQ-0007-01 为唯一口径 |
| 5 smoke 行数触顶 | §4 规模核对：~348 < 400，无需拆分 |

新增实现级风险：**无**（不新增依赖、不新增文件、不改构建链）。

## 9. ADR 判定：不需要（needsAdr = false）

本迭代无架构选型分叉，理由：

1. **无新顶层模块/数据流**：eng 路由是既有 handler 内分支；SearXNG 网关是 guard 既有
   「集中出口」模式向动态主机的自然延展（复用 `assertPublicUrl` 与既有固定网关同一
   分层）；`SEARXNG_URL` 是 config 既有「可选 env + zod 校验」模式的第 N 次应用
   （先例 `AI_BASE_URL`/`BOCHA_API_KEY`）。
2. **契约零漂移**：SSE 事件契约（`packages/shared`）零改动（§2）；API 端点零增删。
3. **不触宪法三案件**：非 UI 变更（无需宪法第 3 条 ADR）、非宪法修订、非 WORKFLOW
   协议修订（护栏 3 所列「重要变更附 ADR」不适用）。
4. ROADMAP T3-M1（`ROADMAP.md:74-77`）已给验收口径，本 SPEC 是其实现定稿，无超出
   既定口径的决策需要用户裁决。

> 若 BUILD/VERIFY 期间发现须突破 §2 零触及清单（如被迫动 shared 契约），按
> WORKFLOW §4 BUILD 契约立即中止转 `pending-approval`/`blocked`——那才是提 ADR 的
> 触发点，届时编号顺延为 ADR-0009（现最大编号 `docs/adr/0008-approve-modal-box-fix.md`）。

---

> 存证：本 SPEC 由独立 SPEC 会话产出，2026-10-22 15:37。所有行号引用基于当日 main
> （88dfb13）工作区实读；冒烟基数 32 id/33 行口径经迭代 0002 SPEC §6 与 REPORT:133
> 交叉核实。行为语义歧义处均以 PRD REQ-0007-01 为唯一口径回溯。
