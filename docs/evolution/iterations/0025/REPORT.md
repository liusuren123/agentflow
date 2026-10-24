# REPORT · 迭代 0025 · BK-0030（VERIFY 阶段验收报告）

> 产出角色：test-manager · 2026-10-25（VERIFY 轮，本会话全部证据亲跑）
> 输入：`iterations/0025/PRD.md`（AC1-AC7）+ `iterations/0025/SPEC.md`（§8 验收口径、
> §4 REQ-0025-01 定稿）+ `iterations/0025/JOURNAL.md`（BUILD 自测与三处 SPEC 内部
> 不一致处置）。
> 环境：Windows 10 26300 / Git Bash / Node v24.21.0（本机；golden/gate 权威在 CI
> windows-latest，本机结果按 AGENTS.md 口径仅参考——本轮纯后端回归面）。

## 结论

**PASS（0 BUG）**。AC1-AC7 全部通过；SPEC §8 命令组中 4 项冒烟本轮亲跑全绿
（新增 MI 组 12/12 + 既有 smoke:server 89/89 + MT 12/12 + MR 11/11 零回退），
手动 E2E 点位 1-3 以真实 server（HTTP/SSE 全链）7/7 通过；git 核对 5 项全过。
`npm run build` / `npm run gate` / `npm test` 由工作流脚本于本轮统一执行且通过
（派发指令在案），VERIFY 未复跑（指令明示「不要重复跑全套」），如实记录如下。

## 1. SPEC §8 命令组执行记录

| # | 命令 | 执行方 | 结果 |
| --- | --- | --- | --- |
| 1 | `npm run build`（shared+web） | 工作流脚本（派发指令声明通过） | **本轮 VERIFY 未复跑**（按指令不重复全套）；间接证据：`apps/web/dist/index.html` 与 `apps/server/dist/server.js` 在位且 MI01/smoke:server 均以该产物运行全绿 |
| 2 | `npm run build:server` | 同上（脚本）+ 间接证据：`apps/server/dist/llm.js` 含 `buildToolSession`×2、`dist/mcp/inject.js`×1（grep 亲核）——dist 与本轮源码一致 | 未复跑，产物一致性已核 |
| 3 | `npm run gate`（8 场景 diffPx=0） | 工作流脚本（声明通过）；VERIFY 未复跑 | AC6 的 gate 面以「保护路径 diff 恒空」（下节亲证）+ 脚本声明承载；权威在 CI `ui-constitution` |
| 4 | `npm test`（shared 契约） | 工作流脚本（声明通过）；VERIFY 未复跑 | shared 零改动（diff 恒空亲证），契约测试无回退面 |
| 5 | `npm run smoke:server` | **VERIFY 亲跑** | **89 passed / 0 failed**（含 M01-M11 stub 冻结面、M08-M11 llm.ts 源锁、G 组模型链路） |
| 6 | `npm run smoke:mcp` | **VERIFY 亲跑** | **12 passed / 0 failed**（MT01-MT12 零回退，注入面开闭零破坏） |
| 7 | `npm run smoke:mcp:registry` | **VERIFY 亲跑** | **11 passed / 0 failed**（MR01-MR11 零回退，httpFetch 缝后向兼容：默认 undefined = 现行为） |
| 8 | `npm run smoke:mcp:inject` | **VERIFY 亲跑** | **12 passed / 0 failed，exit 0**（MI01-MI12 首轮即全绿） |

## 2. git 核对（AC6/AC7；产品提交时点注记）

**时点说明**：VERIFY 轮产品提交尚未发生（HEAD = a3b5695 归档迭代 0024，改动仍在
工作区）。SPEC §8「产品提交后 git diff HEAD~1」以等价的**工作区 diff（vs HEAD）**
口径执行；产品提交恰一个（Conventional Commits、白名单 ⊆ SPEC §6）归 CLOSE 阶段
脚本执行。

| 核对 | 命令（亲跑） | 结果 |
| --- | --- | --- |
| 改动面 ⊆ 白名单 | `git status --porcelain` | 恰 10 条：SPEC §6 白名单 8 项（guard/llm/registry/tools/inject/mcp-inject.mjs/fixture/package.json）+ 机制件（STATE.md、iterations/0025/）；**白名单外零出现** |
| UI/契约保护面恒空 | `git diff -- packages/shared apps/web tools/pixel-gate .github tests/golden` | **输出为空**（AC6 字面满足；亦即本轮零 shared/UI/golden 改动，交互回归三层无涉的机器证据） |
| tools.ts 仅注释 | `git diff -- apps/server/src/tools.ts` 的 +/- 行 | 旧 1 行注释 → 新 4 行注释，**代码行零变化**（AC1「内置分支 git diff 零变化」最强形态；总行数 116→119 为注释净增 +3，在 SPEC §3.4「≤5 行注释」授权内，SPEC §9 表「116 不变」系注释互换预期与实现的微小出入，JOURNAL 已在案） |
| 注入面唯一性 | `grep -rn "createHttpMcpConnection" apps/server/src` | 实义恰三处：http.ts:41（定义）/ registry.ts:161（发现缝，conditional opts）/ inject.ts:52（per-call 动态 impl，恒 `{fetch:mcpFetch}`）；另 3 处为 import 与既有注释 |
| 无绕过裸出站 | `grep -rnP "(?<![\w.$])fetch\s*\(" apps/server/src/mcp` | **零命中**（exit 1）；MI12 源扫描同判据在跑批中独立复现 |

## 3. AC 逐条验收（PRD §验收标准）

### AC1 · 基线不变式 —— PASS

- 两 MCP env 未配置空注册表：E2E-1a/1b/1c（真实 server，见 §5）——health
  `{ok:true}`；LLM 工作流收束 `run:done ok:true`、终值=mock 终文、SSE 日志零
  MCP 字样；勾选内置 `filesystem.read_file` 时模型收到的工具 spec 与现状
  TOOL_SPECS 逐字一致（desc=「读取沙箱目录内的文本文件」、path→string）。
- 冒烟零回退：smoke:server **89/89**（M01-M11 冻结面全绿）+ MI07（extSpecs 空 +
  IMPL 引用相等 + 零发现）+ MR11（空注册表零副作用）。
- 内置五 IMPL 语义零改动：tools.ts diff 仅注释（§2 亲证）+ MI05 引用相等断言
  （`filesystem.read_file === IMPL.filesystem.read_file`）。

### AC2 · guard 收口与私网拦截 —— PASS

- `mcpFetch` 实现（guard.ts:107-109 亲读）：`guardedFetch` 薄包装——无独立
  fetch 调用、无定时器/重试/绕过面（AC7 同证）。
- 拦截：MI10（`ALLOW_PRIVATE_NET=""` 子进程自起 mock MCP，session 构建即拦——
  warn 含「已拦截」+「已降级为 stub」，**子进程 mock 收到 0 请求 = 未出站证明**，
  impl stub 化）+ MI11（直调 `mcpFetch('ftp://…')` →「仅允许 http(s) 协议」；
  `http://127.0.0.1:<port>/` →「已拦截」）。
- 逃生放行：MI02-MI04（主进程 `ALLOW_PRIVATE_NET=1` 对 127.0.0.1 mock 全通）
  + E2E-3b（真实 server：同配置重启无「已拦截」字样、error 为连接拒绝型）。
- 出站面唯一：§2 grep 双判据（createHttpMcpConnection 恰三处 + 裸 `fetch(` 零
  命中）；HTTP 两个构造点（registry.ts:161 发现缝 / inject.ts:52 per-call）全量
  `{fetch:mcpFetch}` 注入，stdio 无出站面。

### AC3 · 外部工具注入与调用（mock 链路 E2E）—— PASS

- HTTP 形态 MI02/MI03：模型首轮请求 `tools` 含 `mockhttp_echo`（desc=「回显
  输入」，text→string+required、a/b→number+required、opt_flag→boolean 非
  required、weird 无 type→string 非 required——SPEC §4.2 映射表逐行）；mock MCP
  收到 `tools/call echo {text:'hi'}`；模型次轮收到工具结果 `{"echo":"hi"}`
  （CallToolResult 原样透传 text 面）；emit 含「🔧 工具调用 mockhttp.echo(」日志行。
- stdio 形态 MI04 + **E2E-2a（真实 server/SSE 全链）**：`MCP_STDIO_SERVERS=demo
  =node fixture` 下 `POST /api/v1/run`（`n.mcp={"demo":["echo"]}`）→ SSE 日志含
  「🔧 工具调用 demo.echo(」、模型次轮收到 `{"echo":"你好"}`、模型可见
  `demo_echo` spec（desc=「回显输入」）、run:done ok:true。

### AC4 · run 中止级联 —— PASS

- MI08：stdio `hang` 调用在途 `ctx.ac.abort()` → handler 以 abort 型错误拒绝
  （cause 链判据）；per-call 子进程 pid 经 PIDFILE 探针轮询至退出（无孤儿）；
  mock 模型恰 +1 次请求（未入次轮）。
- 正常结束零残留：MI04（发现 pid 与末次 per-call pid 均退出）+ E2E-2b（真实
  server run 结束后 fixture 子进程退出）。
- 中止不污染后续：MI09（中止后同进程再建 session 缓存命中零重连 + 完整 handler
  正常收束）。

### AC5 · 三分支边界 —— PASS

MI05：`{filesystem:[read_file], mockhttp:[echo,not_in_manifest], nosuch:[ghost]}`
混合勾选 → 内置走 IMPL（**引用相等**）、外部走动态 impl（非 stub、直调返回 mock
结果）、未注册/清单未命中落 stub（isStubImpl===true，摘要口径不变）；extSpecs 仅
含清单命中项。发现失败分支：MI06（deadhttp → stub 化 + warn
`{serverId:'deadhttp',kind:'http'}` + msg 含「工具发现失败，已降级为 stub」+
error 连接失败字样，不静默吞）。

### AC6 · 回归与提交不变式 —— PASS（提交项归 CLOSE）

- 冒烟全绿：§1 命令 5-8（89+12+11+12 断言零失败）。
- gate：工作流脚本本轮执行通过（派发指令声明）；VERIFY 以「保护路径 diff 恒空」
  （§2 亲证，gate 的被检产物 apps/web/dist 源头零改动）为等价证据，CI
  `ui-constitution` 为权威终审。
- 产品提交恰一个：**尚未发生**（HEAD=a3b5695）；工作区改动面 ⊆ SPEC §6 白名单
  （§2 亲证）。此 AC 的提交半项移交 CLOSE 脚本按白名单执行（建议信息已在
  PRD AC6/JOURNAL 备好）。

### AC7 · 出站类别审计（评审级） —— PASS

- `mcpFetch`（guard.ts:107-109）= `guardedFetch(rawUrl, init)` 字面薄包装，
  签名与 ADR-0012 §6.2 草图一致（`rawUrl: unknown` 逆变可赋值 SDK FetchLike）；
  无独立 fetch、无绕过面（AC2 段亲读 + grep 双判据）。
- MCP HTTP 生产出站无第二通道：全仓 `createHttpMcpConnection` 实义调用恰两处，
  均带 fetch 注入（registry 缝为 conditional——默认 undefined 时走 SDK 全局
  fetch，但生产唯一构造路径 inject.ts:37 单例恒传 `mcpFetch`，故生产发现连接
  全量收口；MR 组五调用点不带 httpFetch = 冒烟路径，非生产面）。

## 4. 行数预算与非功能核对（PRD §非功能要求）

| 文件 | 实测（wc -l 亲跑） | 预算 | 判定 |
| --- | --- | --- | --- |
| apps/server/src/guard.ts | 109 | ≤130 | ✓ |
| apps/server/src/mcp/inject.ts | 124 | ≤200 | ✓ |
| apps/server/src/mcp/registry.ts | 183 | ≤200 | ✓ |
| apps/server/src/llm.ts | 126 | ≤140 | ✓ |
| apps/server/src/tools.ts | 119 | 116+注释 | ✓（代码行零变化，注释 +3 ≤ SPEC §3.4 授权 5 行） |
| tests/smoke/mcp-inject.mjs | 400 | ≤400 | ✓（贴线达标） |
| tests/smoke/fixtures/mock-stdio-server.mjs | 77 | ≤80 | ✓ |

- EOL/BOM（亲核 `file` + `od -c` 首三字节）：inject.ts（`/*` 起）、mcp-inject.mjs
  （`#!` 起）均 UTF-8 无 BOM、LF。
- 超时纪律：dynamicImpl 未自设定时器（inject.ts:49-61 亲读），继承 BK-0028 默认；
  close 在 finally 必达（connection.ts 幂等 close）。
- gate:update / golden 零接触：§2 保护面 diff 恒空 + 全程未执行（本轮无任何
  golden 相关命令）。

## 5. 手动 E2E 点位（SPEC §8；真实 server 全链，VERIFY 亲跑）

方法：临时脚本（系统 temp，不落仓库源码）起 OpenAI 兼容 mock 模型（G 组同型，
按 `body.stream` 分流：streamText → SSE 分块 / generateText → JSON tool_calls）
+ `lib.mjs startServer` 起真实 `dist/server.js` 子进程（env 直传，本机无
`apps/server/.env` 亲核，无泄入面）+ `openSse` 消费 `POST /api/v1/run` 事件流。
工作流 = userinput → prompt → llm（`n.mcp` 节点字段，与 MI 直驱器同形态）。

| # | 断言 | 结果 |
| --- | --- | --- |
| E2E-1a | 空注册表：`GET /api/v1/health` → `{ok:true}` | **PASS** |
| E2E-1b | 空注册表：LLM 工作流 run:done ok:true、终值=mock 终文、SSE 日志零 MCP 字样 | **PASS** |
| E2E-1c | 空注册表：勾选内置 filesystem.read_file → 模型收到现状 TOOL_SPECS spec（desc/参数型逐字） | **PASS** |
| E2E-2a | `MCP_STDIO_SERVERS=demo=node fixture`：SSE 日志含「🔧 工具调用 demo.echo(」；模型次轮收到 `{"echo":"你好"}`；模型可见 demo_echo spec（desc=回显输入） | **PASS** |
| E2E-2b | 同上 run 结束后 fixture 子进程（--pid-file 探针）已退出，无孤儿 | **PASS** |
| E2E-3a | `MCP_HTTP_SERVERS=bad=http://127.0.0.1:9/mcp`（无逃生）：服务端 pino 日志含「已拦截」+「已降级为 stub」；run 仍 ok:true；模型调用降级 stub 收到 not implemented note | **PASS** |
| E2E-3b | 同配置 + `ALLOW_PRIVATE_NET=1`：日志**无**「已拦截」、error 为连接拒绝型（端口 9 无监听）、仍降级 stub、run ok:true | **PASS** |

（过程注记：首轮脚本 mock 模型未分流 stream 请求导致 E2E-1b 假红一次
「Response stream ended without a finish reason」——属**测试脚本缺陷**而非产品
缺陷，按 G 组先例补 SSE 分块后 7/7 全绿；两轮结果均如实保留于此。）

## 6. JOURNAL 三处 SPEC 内部不一致处置的复核意见（VERIFY 裁定）

1. **ToolImpl 类型不导出、inject.ts 本地别名**（inject.ts:25 亲读）：合规——
   tools.ts 保持纯注释 diff（AC1 最强形态优先级高于 SPEC §3.2 草图 import 形态），
   类型一致性由 tsc 零错误 + MI05 引用相等双证。**认可**。
2. **fixture 增补 `--hang-tool` 门控**：合规——未传参时行为零变化由 MT08-MT11/
   MR08 全绿（本轮亲跑）机器证明；增量 3 行在 SPEC §6 fixture 白名单与 ≤80 预算
   内；MI08 的 SPEC 字面断言因此可驱动。**认可**。
3. **MI07 discoveryCount 探针改为行为面等价证据**：合规——SPEC §3.2 明文单例不
   导出，discoveryCount 断言按 SPEC 自身即不可达；以「extSpecs 空 + IMPL 引用
   相等 + mock 请求数不变 + 执行序前移 + MI06 首次发现证明」构成等价证据链，断言
   名内如实注明。**认可**。

## 7. 交互回归抽查说明

本轮零前端改动（`git diff -- apps/web packages/shared tools/pixel-gate .github
tests/golden` 恒空，§2 亲证），test-manager 交互回归清单（拖拽/缩放/框选/连线/
滚轮门控/数字步进/快捷键/审批弹窗/撤销重做/导入导出/多标签/节点库与收藏）的
被检对象源头未动；gate 8 场景由工作流脚本本轮执行通过（声明），CI
`ui-constitution` 权威终审。后端行为回归以 smoke:server 89 断言（覆盖 SSE 事件
契约/审批挂起恢复/中止/持久化端点/画布无关面）+ 本报告 E2E 真实链路承载。
**交互回归专项未逐项人感复测**（无涉改面的情况下按既有门禁与冒烟承载，如实
记录）。

## 8. 缺陷清单

无（BUG-000 起 0 项）。测试过程缺陷 1 项（§5 注记：E2E 临时脚本 mock 模型首轮
未分流 stream 请求，当轮修复，不涉产品代码）。
