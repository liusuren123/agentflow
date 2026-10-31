# JOURNAL · 迭代 0075 · BK-0064 工具执行异常可观测性（BUILD 轮）

> 执行角色：code-developer · 2026-10-31 08:14~08:1x · 隔离工作树 `feat/0075-iter`
> 依据：`iterations/0075/PRD.md`（skipSpec=true，§4 白名单 / §5 验收口径即实施定界）。

## 1. 锚点亲核（PRD 风险 3 预案的现场刷新）

BUILD 开工前逐锚点亲读工作树现场，与 PRD（2026-10-31 08:0x 定稿）全部一致，零漂移：

- `apps/server/src/llm.ts`：execute 包装器 :70-77（impl await :71、stub 判定 :72、
  pino/🔧 emit :74-75）、循环 `for(round=1;round<=3)` :82、catch 降级 :94-100
  （abort 判别 :95、「工具循环异常」warn + 无工具 generateText :96-99）、
  node:delta :101、纯流式分支 :102-120——全数命中；
- `tests/smoke/smoke-server.mjs`：MEM05 块 :2622-2638、文件头 MEM 描述段 :58-70
  （MEM05 句 :65-67）、MEM 组节头 :2511-2514、mock mem05 路由 :399-414（
  `hasTools ? tool_call : 降级文本` 双支**早已备好**——0068 落盘时即按降级支
  预留，本轮降级请求恰命中无 tools 支）；
- `docs/adr/0024-memory-tools-crossrun.md`：§4.1 0068 补记 :182-187。

结论：无「代码现状 > PRD」转写发生，语义零反转。

## 2. 降级触发机制（PRD §6 硬约束的落地方案，留痕备 VERIFY 复核）

AI SDK 7 会把 execute 内 throw 的异常**静默转为 error tool-result 回灌**（0068
探针 S5 + ADR-0024 §4.1 补记实证），不传播至 llm.ts 既有 try/catch——单纯重抛
不可达降级。本轮采用**包装器/循环层协作标记位**（PRD §3 REQ-0075-02 预案的
「标记位」形态，最小侵入）：

1. **包装器捕获**（llm.ts execute 回调内）：`await impl(a||{})` 包 try/catch；
   捕获后先判 `isAbort(e) || ctx.ac.signal.aborted` → 命中照旧 throw（REQ-0075-03
   abort 不吞，与外层 catch :95 语义一致）；否则置闭包标记 `toolErr = 错误消息`、
   pino `ctx.log.warn`（附 tool/args/err 摘要）与 `emit('log', lvl:'warn')` 各一行
   （msg 均含固定子串「工具执行异常」+ 工具名 + preview(err,120) 摘要），并返回
   `{ __toolError: msg }` 作正常 tool-result 兜底回灌（模型可见；降级触发不依赖
   它——检测走标记位，规避对 SDK 序列化形态的字符串耦合）。
2. **循环层检测**：每轮 `generateText` 返回后立即判 `if(toolErr) break`（异常只
   可能发生在本轮 execute 内，时序封闭）；break 后在 try 块内执行**既有降级直生成
   同形态**的 `generateText({ …, prompt: userMsg })`（无 tools），emit
   「工具执行异常（…），降级为直接生成」warn（与既有 catch 降级行平行措辞）。
   fallback 若再抛仍落入既有 catch 承接（abort 透传 / 非 abort 二次降级），既有
   catch 行为零改动。

固定子串对账：llm.ts 两处模板串与 smoke 断言子串均为「工具执行异常」，字面一致
（风险 2 对账通过；degrade 断言另用「降级为直接生成」子串，同源既有措辞）。

## 3. MEM05 期望改写口径（以新行为实测推演，断言不硬编推算值之外的形态）

负例 run 请求流推演：第 1 请求携 tools（mock 返 tool_call → impl throw → 捕获
置标）→ break → 第 2 请求**无 tools**（降级直生成，mock 命中 `hasTools=false`
支返「负键降级完成」/「负值降级完成」）。断言集：双 run ok:true + warn 子串命中
（「工具执行异常」+「降级为直接生成」）+ 每 run 请求恰 2 且形态恰 [携tools, 无tools]
（`memToolsOf` 实测请求体）+ out 含降级文本（不再空串）+ 零 🔧 行（异常发生在
impl await 处先于正常 emit，既有语义保持）+ token 域行数仍 2（负例零落库）。
若 VERIFY 实跑与推演不符（如 SDK 请求计数差异），按 PRD 风险 1 以实测现实对齐
断言并回写本 JOURNAL。

同批刷新：文件头 MEM 描述段（:65-67 MEM05 句）、MEM 组节头（:2511 起）、mock
mem05 路由两处注释（携 tools/无 tools 双支语义——同文件同批，防注释误导后人）。

## 4. 改动清单与行数预算对账

| 文件 | 改动 | 行数差（git diff --numstat 实测） |
| --- | --- | --- |
| `apps/server/src/llm.ts` | toolErr 标记声明 + 包装器 try/catch（abort 透传/warn 双路/标记返回）+ 循环 break 检测 + try 块内降级直生成块 | 138 → 155（+18/-1，净 +17，预算 ±20 内，仍 ≤400） |
| `tests/smoke/smoke-server.mjs` | MEM05 期望块改写 + 头注/节头/mock 路由注释刷新 | 3029 → 3044（+32/-17，净 +15，净额预算 ±25 内；毛变更 49 系 MEM05 整块断言重写所致，如实披露） |
| `docs/adr/0024-memory-tools-crossrun.md` | §4.1 追加 0075 反写注（0068 原文零删） | 348 → 353（+5/-0；预算 +2~4 超出 1 行——反写注须载明机制与收口指针，压缩会失「措辞实施定」所需信息量；语义零反转，如 VERIFY 判超预算可再压缩） |

机制件（不入 productFiles）：PRD.md（既有）、STATE.md（phase→BUILD）、本 JOURNAL。

## 5. 不做范围确认（PRD §3 out-of-scope 逐条）

`memory/tools.ts` 负例 throw 零触及；`tools.ts` stub 判定零触及；`mcp/**` 零触及；
零新增 env/依赖/出站/shared 事件；纯流式分支（llm.ts else 支）零改动；「工具重试」
语义未引入；既有 catch（generateText 传播异常路径）零改动。零前端、零 golden、
全程未运行 `npm run gate:update`（非修宪轮）。

## 6. 自测与移交

- 自测（BUILD 轮内已实跑，2026-10-31 08:1x）：① `node --check
  tests/smoke/smoke-server.mjs` → 退出码 0（SMOKE_SYNTAX_OK，结构语法通过）；
  ② `cd apps/server && npx tsc --noEmit -p tsconfig.json` → 退出码 0（类型零错）；
  ③ 禁区机器证明 `git diff -- packages/shared apps/web tools/pixel-gate
  tests/golden .github package.json package-lock.json` → 恒空（FORBIDDEN_ZONE_EMPTY_OK）。
  完整门禁（`npm run build` + gate + `npm test` + `npm run smoke:server`）归脚本
  统一执行，本轮未运行；MEM05 新断言的运行时命中由 smoke 实跑承载。
- 移交 VERIFY：逐条执行 PRD §5 六条 GWT + MEM 套件全量 + 禁区机器证明
  （`git diff -- packages/shared apps/web tools/pixel-gate tests/golden .github
  package.json package-lock.json` 应恒空）+ 反演抽查（临时摘除包装器 catch →
  MEM05 复红 → 还原复绿）。
