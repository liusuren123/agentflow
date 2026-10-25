# REPORT · 迭代 0033 · BK-0036 呈现三件套·网页展示节点（webshow）：NDP 定义 + 呈现承载 + 画布 iframe 安全呈现（修宪轮 · 批次 1）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 21:03（工作树
> `.zcode/worktree/feat/0033-iter`，分支 `feat/0033-iter`，HEAD = `84ee8ec`，产品代码
> 已落盘待脚本双提交）。输入：`iterations/0033/PRD.md`（AC1~AC7）+
> `iterations/0033/SPEC.md`（§9 验收口径）+ `iterations/0033/JOURNAL.md`（BUILD 实测
> 与偏差 a~h）。执行方式：build/gate/test 由脚本在工作树内已跑且通过（协调者指令：
> 不重复跑全套）；本 VERIFY 做**静态代码级核对 + 针对性 E2E 实跑复验 + 交互回归抽查
> + 指针抽样**，全部结论基于本会话实跑命令与输出。

## 结论

**PASS（修复轮次 0；BUG 清单为空；6 项非缺陷备注单列于 §4）。**

- AC1~AC7 全部通过（§2 逐条证据）；BUILD JOURNAL §5 结论与本轮独立复验一致。
- 安全面三写死（服务端零出站 / sandbox 默认最严 / http(s) 白名单双保险）本轮以
  grep 机器证明 + 浏览器两态实证**独立复验通过**。
- 全量 `smoke:server` 套内 O 组实得值待产品提交后复跑（提交前 V09 时点性假红会
  fail-fast 跳过 O 组，SPEC §9-2 预判在案）——本轮以独立后端实例复刻 O01~O05 判据
  实跑 **5/5 全绿**替代覆盖（§2-AC2）。

## 1. 验收执行清单（本轮实跑命令与结果）

| # | 检查 | 命令/方法 | 结果 |
| --- | --- | --- | --- |
| 1 | 产品改动白名单 | `git diff --numstat`（排除 docs/evolution）+ `git status --porcelain` | 16 文件改动 + 4 未跟踪（webshow/node.ts、webshow/README.md、s10 两基线），恰 SPEC §2 表（§2-AC5） |
| 2 | 禁区零 diff | `git diff --name-only -- <禁区清单>` | 空（package-lock/events/schema/types/index/engine/guard/llm/agent/server/store/tools/Skeleton/server-sync/tests/canvas/.github）；既有 17 节点目录亦空 |
| 3 | webshow handler 零出站 | `sed` 提取 handler 体 + `grep -cE 'fetch\|guardedFetch\|AbortSignal\|http\.'` | **0**；handlers.ts 全 diff 唯一 hunk `@@ -237,6 +237,25 @@`（import 区零 diff） |
| 4 | AC3 代码断言 | `git diff -U0` grep `^[+-]function setNodeOut` = 0；新增行 grep `allow-\|innerHTML` = 0；`grep -Fn 'https?:'` 两文件 | setNodeOut 零改动；无 allow-*/innerHTML 令牌；app.js:1900 与 handlers.ts:247 正则字面量逐字一致 |
| 5 | param-handler-guard 注释纪律 | handler 体注释行 grep `p\.(url\|sandbox)` | 0（代码行 1 处 `p.url` 为提取器应捕捉的真实引用） |
| 6 | baseline 亲数 | `node -e` require baseline | **18 键含 webshow**；键位 `setvar,webshow,approval`（D1）；diff +28/−0 零既有键删除；webshow 参数 `url d:""` / `sandbox d:true` |
| 7 | 守卫/契约联动 diff 抽查 | `git diff` 七个测试文件 + nodes.ts + gen-node-readmes.mjs | 与 SPEC §6 逐条一致（§2-AC1） |
| 8 | gate.mjs 改动形态 | `git diff -- tools/pixel-gate/gate.mjs` | 恰两处纯插入（WEBSHOW_WF_SEED 常量 + s10 场景行），既有 s0~s9 定义与比对逻辑零触碰 |
| 9 | golden 区状态 | `git status --porcelain -- tests/golden/ui/` | **恰 2 路径**（s10 png + s10 invariants，均新增）；s3-library 两文件零 diff；`tests/golden/diff/` 无残留 |
| 10 | s10 基线形态 | PNG 头解析 + invariants 读取 | 1600×900 8-bit RGB；公共六键 `view/zoom/nodes/cssVars/counts/bottomClosed`；counts `{nodes:2, edges:1, tabs:1}` 与 WEBSHOW_WF_SEED 一致；尾部无 LF 与既有 s8/s9 工具产物形态一致 |
| 11 | EOL/BOM | node 逐字节读 | node.ts / webshow README：无 BOM、纯 LF、尾部 LF ✓ |
| 12 | **smoke O 组独立复验** | 临时脚本（系统 TEMP 不入库）复刻 O01~O05 判据 + `lib.mjs startServer` 独立后端实例 | **5 passed / 0 failed**（§2-AC2 实录） |
| 13 | **AC6 浏览器 E2E 复验** | 临时脚本：静态自服务（fs 直读 dist，同 gate.mjs）+ `/api` 反代真后端（流式透传 SSE，沿 JOURNAL §4-g 环境绕行）+ Playwright | **19 passed / 0 failed**（§2-AC6 实录）；截图 ac6-4a/4b/4c png 落 TEMP（不入库） |
| 14 | 交互回归抽查 | 临时脚本：既有节点文本路径 / 拖拽 / 折叠同构性对照 | 4+3 全绿（§3） |
| 15 | 指针抽样（AC7） | 逐文件/行打开核对 | 10+ 组全命中（§2-AC7） |

## 2. PRD AC1~AC7 逐条结论

### AC1 · DEFS 入列与契约全绿 — ✅

- `node -e` 亲数 `packages/shared/test/nodes.baseline.json` = **18 键含 webshow**，
  键位 setvar→**webshow**→approval（D1）；`git diff` 快照 +28/−0，无任何既有键删除行；
  webshow 条目 `params url d:"" / sandbox d:true`、`inputs in-url any`、`outputs []`。
- 契约测试 diff 逐一核对（本轮实读）：nodes-dirs `D.size===18`（:31+:5 注释）；
  defs-drift `webshow: { url: '', sandbox: true }`（4 空格对齐，JOURNAL 偏差 d）+
  计数 36→38 + 头注「18 种节点 × 38 参数」；contract `length===18` + 标题；synthesis
  webshow 回归锚 `!('caps' in NODES.webshow)` 显式断言（JOURNAL 偏差 f，比 SPEC 跳过集
  方案更强）+ EXPECTED_ORDER `webshow:['url','sandbox']` + 标题 10 键/16 键/18 键同步；
  readme-consistency 19 份 + 表格回比 18 类型；param-handler-guard 总数 38 +
  EXPECTED_ZOMBIES 增 `['webshow',['sandbox']]`（JOURNAL 偏差 b，注释载明 UI-only
  依据）；gen-node-readmes `!== 18` + 「18 种」+ MANUAL_NOTES webshow 条目。
- `npm test` 30/30：脚本已跑（JOURNAL §3.3 记录），本轮按协调者指令未重跑全套，
  以上 diff 亲核与其结论一致。

### AC2 · 呈现承载语义（URL 校验 / 如实降级） — ✅

- **O 组独立复验 5/5**（本轮实跑，独立后端实例 + 与 smoke-server.mjs 逐字同型的
  wfShow 夹具）：
  - `PASS O01 {"ok":true,"outputs":["https://example.com/agentflow"],"out":"已呈现网页 · https://example.com/agentflow","outEv":"https://example.com/agentflow"}`
  - `PASS O02 {"ok":true,"outputs":["https://example.com/static-fallback"],"out":"已呈现网页 · https://example.com/static-fallback"}`（trigger 对象 strInput 归空 → params.url 生效）
  - `PASS O03 {"ok":true,"outputs":[],"out":"未呈现 · 无有效网址（占位降级）","warnHit":true,"outEvents":0}`（`javascript:` 输入：不崩、零汇入、warn、零 output 事件）
  - `PASS O04` 同 O03 判据（空输入）`"ok":true,"outputs":[]`
  - `PASS O05 30/30 事件过 validateEvent`（契约零新增）
- **零出站机器证明**：webshow handler 体 grep `fetch|guardedFetch|AbortSignal|http.` = 0；
  `guard.ts` 零 diff；handlers.ts 零新 import（唯一 hunk @237）。
- **时点性假红如实记录**：产品提交前 `git status packages/shared` 非空 → 全量套件
  fail-fast 于 V09 并跳过其后组别（BUILD §3.4 已记录同形态 89/1）。SPEC §9-2 判据
  「VERIFY 以提交后实得值为判据」——**套内 O 组 + 既有断言零回退的全量实得值待脚本
  产品提交后复跑**（合并仲裁主干复测阶段另有 `npm run smoke:server` 全量门，双保险）。

### AC3 · 画布 iframe 安全呈现 — ✅

- 代码级断言（本轮 grep 实跑）：`setNodeOut` 函数体增删行 **0**；新增行 `allow-`/
  `innerHTML` 令牌 **0**（iframe src 走属性赋值 `f.src = url`）；sandbox 仅
  `setAttribute('sandbox','')`（空值最严）或不设置（`sandbox !== false` 守卫），无
  中间态、无 allow-* 分化；前端 `WS_HTTP_S`（app.js:1900）与 handler 正则
  （handlers.ts:247）`/^https?:\/\/\S+$/i` 字面量逐字一致。
- 行为级（E2E 实证）：④a `sandbox=""` + `referrerpolicy=no-referrer` +
  `src=https://example.com/agentflow`；④b 关闭「沙箱隔离」重跑 → 属性移除
  （`{"src":"...","sandbox":null}`，责任翻转）；④c `javascript:` 输入 → 占位
  「无有效网址 · 占位呈现」且 **iframe 未创建**（src 永不接收非白名单值）。

### AC4 · 修宪 golden 双通道 — ✅（按 JOURNAL 偏差 a 修正后口径）

- gate.mjs 改动 = 恰两处纯插入（WEBSHOW_WF_SEED + s10 场景行），既有场景定义与
  0 容差比对逻辑逐字节零触碰（本轮 diff 亲核）。
- golden 区 `git status` = **恰 2 路径**（s10-webshow-node.png + .invariants.json 新增）；
  s3-library.png/.invariants.json 零 diff；diff 目录无残留。
- **s3 零漂移、gate:update 通道未消费**（偏差 a）：BUILD 首跑 gate 全绿（s3 diffPx=0
  ——输出分组在 900px 视口折叠线下，新增条目零可见像素），修宪重录「gate 失败时
  一次」前置不成立。PRD AC4 原文「s3 经重录后全绿」的落点如实修正为「s3 零漂移实测
  全绿、通道未消费」——比预期保守，PRD 风险表既定「不视为意外红」，VERIFY 认可。
- 11 场景全绿 diffPx=0（含 s10 golden-created 后复跑）：脚本门禁实测（JOURNAL §3.2-④），
  本轮未重跑；golden 区机器状态（恰 2 路径 + s10 形态）与该结论一致。
- s10 基线亲验：1600×900 PNG、公共六键不变量、counts `nodes:2/edges:1` 与场景
  SEED 一致、尾部 LF 形态与 s8/s9 工具产物一致。

### AC5 · 白名单与零依赖/零契约机器证明 — ✅

- `git diff --numstat` 16 文件 + `git status` 4 未跟踪，恰对应 SPEC §2 表
  #1~#17 + #19（#18 s3 重录未发生 = 偏差 a 的如实结果）；handlers.ts +19、app.js +34、
  app.css +4、smoke +142、gate +11、nodes.ts +5/−2、baseline +28——与 JOURNAL §2
  实测逐一吻合。
- 禁区零 diff（命令与结果见 §1-#2）：`package-lock.json`（零依赖）、`events.ts`
  （零新增 SSE 事件）、`engine.ts`（自动注册）、`guard.ts`（零出站类别）、
  `Skeleton.tsx`/`server-sync.js`、`tests/canvas/**`、`.github/**`、既有 17 节点目录
  全部为空。

### AC6 · 手动 E2E 四点位 — ✅（本轮复验 19/19）

承载：静态自服务 + /api 反代真后端（沿 JOURNAL §4-g 环境限制绕行）。逐点实录：

- **① 节点库**：`输出` 分组计数 **2→3**（cnt=3）；`.lib-node[data-type="webshow"]` 存在、
  条目名「网页展示」、**无 mini-tag**（caps.data 不进 chips）、globe 图标 svg 在；
  搜索「webshow」命中。
- **② 拖入画布（seed）**：`--nc=#f472b6`（--cat-output 粉）；in-url 入端口
  `title="网址 · 类型：任意"`；兜底网址/沙箱隔离两 widget 行（`data-k="url"/"sandbox"`）。
- **③ 连线**：`.edge` 恰 1 条（in-url ← 上游 any）。
- **④ 运行**：④a 真实在线运行（#float-run → SSE node:done）`.node-out.ws-on` 出现
  `.ws-frame`，`src=https://example.com/agentflow`、`sandbox=""`（默认最严）、
  `referrerPolicy=no-referrer`；④b 关闭沙箱重跑 → `sandbox` 属性移除、src 不变；
  ④c defv 改 `javascript:alert(1)` 重跑 → 占位「无有效网址 · 占位呈现」、iframe 未创建。
- **console**：应用自身帧 **0 error**；全程唯一 1 条 console error 来自外部
  `example.com` iframe 内容自身（外站 favicon 404，`@ https://example.com/agentflow:0`）
  ——非应用缺陷（BUILD 轮还观测到 sandbox 拦截外站脚本的消息，同类外部来源，且恰是
  sandbox 生效证据）。与 JOURNAL §3.5「全程零 console error」的口径差异如实记录（§4-NOTE-D）。

### AC7 · 指针抽样 ≥5 条 — ✅（本轮抽样 10+ 组全命中）

reply/node.ts sink 样板（webshow 同构：outputs []、单入 any、binding data:true）；
`nodes.schema.ts` :13 五端口枚举（any ∈）/:15 七类目（output ∈）/:18-21 PortId 正则
（`in-url` 合规）/:50-58 widget×default 矩阵（text↔string、toggle↔boolean）/:72-83
十 kind（data ∈）；`handlers.ts` :17 BASIC_HANDLERS / :225-232 reply sink / :91
guardedFetch（webshow 零触碰的对照面）；`app.css` :20 `--cat-output:#f472b6` /
:259-261 `.node-out` 与 st-done 门控（新选择器紧随其后纯插入）；`app.js` :64 globe
图标既有键 / :1900 WS_HTTP_S；ADR-0015 状态行（「已获用户 issue#3 批复…BK-0036 实施轮
已消费（迭代 0033）」逐字符合 SPEC §9-11 字面）+ §7.1 BK-0036 实施纪要（含 s3 零漂移
实测与 17→18 计数校正）；BACKLOG BK-0036 行（:49，ready）与 BK-0050 晋升备注（:63，
本轮 PLAN 轮回写在案）；webshow/README.md 生成物五段结构 + 总索引 webshow 行
（nodes/README.md:26）。

## 3. 交互回归抽查（test-manager 职责，本轮实跑）

| # | 抽查项 | 结果 |
| --- | --- | --- |
| R1 | 既有节点（userinput）运行后 `.node-out` 文本照常（`q = "回归输入"`，setNodeOut 文本路径零变化） | PASS |
| R1b | 既有节点无 `.ws-frame`（新分支不误触） | PASS |
| R2' | **折叠同构性对照**：既有 userinput 折叠后 st-done/输出同样丢失 ↔ webshow 折叠后 iframe 同样不可见——**行为完全同构**（折叠 = `rerenderNode` 重建 DOM，app.js:1664，连 st-done 一起丢，属既有 17 种节点同款架构行为）；折叠态重跑后 iframe 重新呈现 | PASS ×3 |
| R3 | 拖拽（iframe 撑高后 node:done 既有 `measurePorts()+updateEdgesOf` 消化 portCache）：位移 dx=100.0 / dy=100.0 精确 | PASS |
| R4 | 全程零 pageerror | PASS |

> R2 原计划按 SPEC §5.3「折叠仅隐 widgets、node-out 不受影响」断言，实测不符；追查
> 为**既有架构行为**（非本轮回归），改判同构性对照——详见 §4-NOTE-B。

## 4. 备注清单（非 BUG；供后续批次/合并仲裁参考）

- **NOTE-A（SPEC 文档瑕疵）**：SPEC §2 受影响文件表漏列 `param-handler-guard.test.mjs`，
  但其 §0 硬依赖②与 §6.5 正文明确「:135 总数断言 36→38 本条必改」——实际改动
  （+7/−3：总数 38 + EXPECTED_ZOMBIES 增 webshow.sandbox）在 SPEC 授权面内，AC5 白名单
  按此口径核对通过。批次 2/3 的 SPEC 应把该测试文件显式入表。
- **NOTE-B（SPEC 论断与机制不符，行为无回归）**：SPEC §5.3「节点折叠仅隐
  `.node-widgets`（app.css:223），node-out 不受影响」——CSS 层面属实，但折叠动作走
  `rerenderNode(n)`（app.js:1664）**重建整个节点 DOM**，st-done 状态类与 node-out 内容
  一并丢失（既有 17 种节点同款；本会话 PARITY 对照实测双侧一致，R2'/§3）。webshow
  呈现态因此折叠后消失、重跑恢复——与既有节点输出文本折叠后消失**同构**，非本轮引入
  缺陷，不构成验收失败。批次 2/3（termview/jsoncanvas）若需「折叠后呈现保持」须另行
  立项，勿默认 SPEC §5.3 论断成立。
- **NOTE-C（Micro 文档陈旧）**：`readme-consistency.test.mjs` 头注「…重生成到
  os.tmpdir，18 份产物…」注释文字未随本轮同步为 19 份（:87 测试标题已正确改「19 份」；
  纯注释零行为）。JOURNAL 偏差 e 同步了 :4 的「总索引 16→18 行」，漏了此处的份数。
- **NOTE-D（AC6 console 口径）**：JOURNAL §3.5 声称「全程零 console error」；本轮实测
  为「**应用自身帧**零 console error」，外部 example.com iframe 内容产生 1 条外站
  favicon 404（BUILD 轮另观测到 sandbox 拦截外站脚本消息）——均来自外站内容在
  sandbox iframe 中的行为，属 sandbox 安全特性生效证据，非应用缺陷；口径差异如实
  记录，验收按「应用自身零 error」判准通过。
- **NOTE-E（环境限制，非产品缺陷）**：工作树路径含 `.zcode` 点目录段 → express
  `res.sendFile` 默认 `dotfiles:'ignore'` → 后端静态托管 `GET /` 404（JOURNAL §4-h）。
  本轮 E2E 以静态自服务 + /api 反代承载复验成功；合并回主干后该限制自然消失，
  `server.ts` 零改动正确（越白名单）。
- **NOTE-F（收尾动作）**：全量 `npm run smoke:server` 套内实得值（O 组在套内 + 既有
  断言零回退）待脚本产品提交后复跑得出——提交前 V09 时点性假红 fail-fast 属既有先例
  形态（0018/0021/0022/0031），不作为 FAIL 依据；合并仲裁主干复测另有全量 smoke 门。

## 5. BUG 清单

**空（0 项）。** 未发现 Blocker/Critical/Major/Minor 级缺陷；无需回 BUILD 修复，
`repair_round` 维持 0。

## 6. 回滚指针（沿用 JOURNAL §6，本轮确认成立）

单提交 `git revert` 即整体回退（s10 两基线随提交删除、baseline 18→17、守卫计数、
ADR-0015 增补段）；实施未触及 PRD out of scope（服务端抓取 / PTY / 新 SSE 事件 /
sandbox 组合放权零发生——本轮 grep 与禁区 diff 独立复证）。
