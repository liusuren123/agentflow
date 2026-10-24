# REPORT · 迭代 0024 · BK-0029 外部 MCP server 注册与工具清单发现 VERIFY（env 白名单注册表 + 内置五 id 冲突拒绝 + tools/list 发现缓存）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 01:48–01:53
> 输入：`iterations/0024/PRD.md` AC1–AC7 + `iterations/0024/SPEC.md` §2 定稿三项/§5 MR
> 断言清单/§6 白名单/§7 验收口径（命令组 A–G + 手动 E2E 七点位）。
> 执行环境：本机 Windows（win32 10.0.26300）· Node v24.21.0 · Git Bash；
> 本地非 CI 权威环境（gate 以 CI 为权威，本地下结论按 CONSTITUTION 第 2 条如实标注）。
>
> ## 总结论：**PASS**（零 BUG；OBS-001~003 三条观察记录，均非产品缺陷）
>
> 脚本侧已运行的完整门禁（`npm run build` / `npm run gate` / 根 `npm test`，含
> smoke:server）按派发约定（ask：「build/gate/test 已由脚本运行且通过，不要重复跑
> 全套；针对性 E2E 按你的职责执行」）不重复全套；本报告以测试经理职责亲跑的针对性
> 验证覆盖全部实质验收面：本迭代验收载体 `npm run smoke:mcp:registry`（MR01–11）
> 与直接依赖面回归 `npm run smoke:mcp`（MT01–12）均为本会话亲跑全绿，SPEC §7
> 手动 E2E 七点位逐条执行，另对 SPEC 冒烟未机器覆盖的 E9 形态做了活的启动亲测补证。

## 0. 验收面 × 证据形式总览

| AC | 结论 | 证据形式（全部本会话亲跑，除非注明「脚本侧」） |
| --- | --- | --- |
| AC1 config 扩展与基线不变式 | **PASS** | `wc -l` 179/129/340 ≤ 200/130/400（亲跑）+ config 返回面 keys=10 与改前一致（亲跑 `env -u` 两 env 直 import dist/config.js）+ config.ts diff 恰 +1 import/+2 rawEnv key/+2 zod/E9 交叉校验、返回对象零新增字段（亲跑 diff）+ MR11 空注册表基线 PASS（亲跑冒烟内）；build:server exit 0 为脚本侧声明（dist 产物在位且新于 src，两冒烟亲跑即执行面成立） |
| AC2 非法值 fail-fast | **PASS** | MR02（E1）/MR03（E8）/MR04（E1–E8 进程内）PASS（亲跑冒烟，11/0 exit 0）+ 活启动亲测：`MCP_HTTP_SERVERS='bad'` → exit=1 + fatal problems 指明变量名/条目序号/原因；**E9 跨 env 同名活启动亲测** → exit=1 + `name 重复注册 [a]`（E9 无 MR 机器断言，VERIFY 亲测补证，见 OBS-002） |
| AC3 内置五 id 冲突拒绝 | **PASS** | MR05（注入路：entries 恰 1 条 good、sqlite 不在、warn 固定子串 + fields.serverId/kind、进程继续）+ MR06（默认 logger 路：独立子进程 pino warn 固定子串 + `"serverId":"fetch"` + 完成标记 + 退出码 0）+ MR09（dist/tools.js IMPL 键集 ↔ BUILTIN_MCP_IDS deepEqual 防漂移）全 PASS（亲跑冒烟内） |
| AC4 注册表构造与发现 | **PASS** | MR07（HTTP：discoverTools → EXPECT_TOOLS deepEqual；二次发现 discoveryCount=1 + mock initialize 请求数仍 1，命中免重连）+ MR08（stdio：deepEqual + count=1 + pid 轮询至退出无孤儿）全 PASS（亲跑冒烟内） |
| AC5 registry 边界不变式 | **PASS** | `git diff --stat -- apps/server/src` 恰 config.ts +20 与新增 registry.ts（亲跑）+ mcp/ 既有三文件零 diff（亲跑）+ 禁区四路径 `git diff -- packages/shared apps/web tools/pixel-gate .github` 恒空（亲跑）+ 生产 import 面机器核验：src 引用 mcp/registry 恰 config.ts:13 一处、dist 引用面恰 config.js + 自身（亲跑 grep） |
| AC6 回归与提交不变式 | **PASS（带 OBS-001）** | `npm run smoke:mcp:registry` **11 passed / 0 failed，exit 0**（亲跑）+ `npm run smoke:mcp` **12 passed / 0 failed，exit 0**（亲跑）+ 工作区改动面 = SPEC §6 白名单 4 项 + docs/evolution 机制件（亲跑 status/diff）；npm test / build / gate(8 场景 diffPx=0) / smoke:server 为脚本侧声明（ask 给定，未复跑）；产品提交 VERIFY 时点未发生（git 归脚本后置，OBS-001，0023 同口径） |
| AC7 env 语义安全核验 | **PASS** | `grep -n "shell" apps/server/src/mcp/registry.ts apps/server/src/config.ts` 零命中（亲跑，exit 1）+ MR10 源扫描 PASS（亲跑冒烟内）；registry 仅将解析 argv 直传 createStdioMcpConnection（registry.ts:150-158 Read 亲核，无命令拼接/解释形态） |

## 一、AC 逐条验收

### AC1 · config 扩展与基线不变式 — **PASS**

- **行数预算（SPEC §7 点位 1，亲跑 `wc -l`）**：`apps/server/src/mcp/registry.ts`
  179（≤200）/ `apps/server/src/config.ts` 129（≤130）/ `tests/smoke/mcp-registry.mjs`
  340（≤400）——三项全部达标（ADR §8 + AGENTS.md 硬性约定 4）。
- **config.ts 精确 diff（亲跑 `git diff -- apps/server/src/config.ts`）**：恰四处增量
  ——① +1 import（registry 两纯函数，config.ts:13）；② rawEnv 白名单 +2 key
  `MCP_HTTP_SERVERS` / `MCP_STDIO_SERVERS`（config.ts:33）；③ EnvSchema +2
  `z.string().superRefine`（E1–E8 字段内校验，problems 逐条 addIssue，
  config.ts:68-73）；④ E9 交叉校验块（config.ts:100-108）。返回对象零新增字段。
- **返回面零变化（亲跑）**：`env -u MCP_HTTP_SERVERS -u MCP_STDIO_SERVERS
  node --input-type=module -e "import …/dist/config.js"` → `keys=10 ->
  port,allowPrivateNet,aiBaseUrl,aiApiKey,aiModels,aiModel,aiProviderName,
  bochaApiKey,searxngUrl,knownKeys`、`config-ok`——与改前一致（两原始串不入
  AppConfig，SPEC §3.2.4 口径落地）。
- **空注册表零副作用（亲跑冒烟内 MR11）**：envLoader（两 env 未设）→ sources 两值
  undefined、注册表 0 条目、has() 恒 false、`discoverTools("any")` reject 含
  「未注册的 MCP server」——PASS。
- **既有组零回退**：`npm run smoke:mcp` 12/12（亲跑，BK-0028 传输面）；smoke:server
  / npm test / gate 为脚本侧声明（ask 给定）。dist 新鲜度亲核：dist/mcp/*.js
  mtime 01:47:16 > src 最后修改 01:44:01——两冒烟亲跑执行的即最新代码（MR01 前置
  亦断言六产物在位）。

### AC2 · 非法值 fail-fast — **PASS**

- **冒烟机器断言（亲跑 `npm run smoke:mcp:registry`，11/0，exit 0）**：
  - MR02：`MCP_HTTP_SERVERS='no-equal-sign'`（E1）→ startServer 子进程提前退出
    code=1，logTail 含 `MCP_HTTP_SERVERS` 与「环境变量配置错误」。
  - MR03：`MCP_STDIO_SERVERS='a=node x,a=node y'`（E8 同 env 重复）→ code=1，
    logTail 含变量名与「重复」。
  - MR04：E1–E8 逐形态（HTTP 9 例 + stdio 4 例）problems 非空且含期望关键词；
    整值空白=未配置；两合法正例 entries 结构精确 deepEqual（含 `sql=npx --yes
    @modelcontextprotocol/server-sqlite` → command=npx + args 2 项）。
- **活启动亲测（SPEC §7 点位 4 前半，亲跑）**：`MCP_HTTP_SERVERS='bad' PORT=37892
  node apps/server/dist/server.js` → **exit=1**，fatal 单行：
  `problems:["MCP_HTTP_SERVERS=\"bad\"：条目 1：name 缺失（无 \"=\"）"]`——变量名
  + 条目序号 + 原因齐备（沿 config.ts:76-79 既有通道）。
- **E9 补证（亲跑）**：`MCP_HTTP_SERVERS='a=http://x.invalid/mcp'
  MCP_STDIO_SERVERS='a=node dummy.mjs'` → **exit=1**，fatal：
  `MCP_HTTP_SERVERS × MCP_STDIO_SERVERS：name 重复注册 [a]（跨变量同名歧义，逐项
  修正后重试）`——config.ts:100-108 交叉校验行为与 SPEC §2.1 E9 行一致。

### AC3 · 内置五 id 冲突拒绝 — **PASS**

- **MR05（注入路，亲跑冒烟内）**：`buildMcpRegistry({ mcpStdioServers:
  'sqlite=node a,good=node b' }, { warn: collector })` → entries 恰 1 条（good）、
  `has('sqlite')===false`、collector 恰 1 次且 msg 含固定子串
  「外部 MCP 注册名与内置 id 冲突」+ `fields.serverId==='sqlite'` /
  `kind==='stdio'`；无异常进程继续——**语义冲突 ≠ fail-fast** 边界正确。
- **MR06（默认 logger 路，亲跑冒烟内）**：独立 `node --input-type=module -e` 子进程
  import dist/mcp/registry.js → `buildMcpRegistry({ mcpHttpServers:
  'fetch=http://127.0.0.1:9/mcp' })` → stdout pino warn 行含固定子串 +
  `"serverId":"fetch"` + 完成标记 `MR06_DONE`，**退出码 0（进程不退出）**。
- **MR09 防漂移锚（亲跑冒烟内）**：dist/tools.js `IMPL` 键集排序 deepEqual
  `BUILTIN_MCP_IDS` 排序（filesystem/fetch/sqlite/browser/web-search）——五 id
  单一事实源机器锚成立。
- 边界注记（非缺陷）：真服务启动时 buildMcpRegistry 不被调用（零生产消费方，
  AC5 机器核验），冲突拒绝在 registry 构造时点生效——MR05/MR06 即该时点的直接
  证据，与 SPEC §4「唯一消费者 = 冒烟 + config 纯函数引用」设计一致。

### AC4 · 注册表构造与发现 — **PASS**

- **MR07（HTTP，亲跑冒烟内）**：registry（HTTP 条目 → 进程内 mock）首次
  `discoverTools('mock-http')` → 与 EXPECT_TOOLS（echo/add，name/desc/
  inputSchema）deepEqual；再次发现 → 结果 deepEqual + `discoveryCount===1` +
  mock initialize 请求数仍 1——**命中免重连**双保险断言成立。
- **MR08（stdio，亲跑冒烟内）**：stdio 条目（node + fixtures/
  mock-stdio-server.mjs，复用 BK-0028 夹具零改动）→ EXPECT_TOOLS deepEqual +
  count=1；`stdioPidOf` 取 pid 后 `process.kill(pid,0)` 轮询至**已退出**（发现即
  关 + connection close 语义，无孤儿子进程）。
- 缓存口径（SPEC §2.3）Read 亲核落地：快照 Map + finally 必达 close
  （registry.ts:150-168）；失败原样外抛不缓存；未知 serverId throw
  「未注册的 MCP server: <id>」（registry.ts:154）。

### AC5 · registry 边界不变式 — **PASS**

- **diff 面（亲跑）**：`git diff --stat -- apps/server/src` → 仅
  `apps/server/src/config.ts | 20 ++++++++++++`（+20/-0）+ 新增未跟踪
  registry.ts（git status `??`）；`git diff -- apps/server/src/mcp/connection.ts
  http.ts stdio.ts` 零输出（三文件零改动，仅被 import 消费）；`git diff --
  packages/shared apps/web tools/pixel-gate .github` 恒空。
- **零生产消费方（亲跑 grep 机器核验）**：`grep -rn "mcp/registry"
  apps/server/src --include='*.ts'` → 恰 config.ts:13 一处（两纯函数）；
  dist 面引用 registry.js 的文件恰 config.js + registry.js 自身——llm/tools/
  guard/engine/handlers/server 均未接线，与 PRD「不做」清单一致。
- **冒烟落位**：tests/smoke/mcp-registry.mjs 为独立文件（mcp-transport.mjs /
  smoke-server.mjs 零改动，git status 亲核）；根 package.json 恰 +1 行
  `smoke:mcp:registry` script（亲跑 diff）。

### AC6 · 回归与提交不变式 — **PASS（带 OBS-001）**

- **本迭代验收载体（亲跑）**：`npm run smoke:mcp:registry` →
  `==== smoke:mcp:registry：11 passed / 0 failed ====`，**EXIT_CODE=0**。
- **直接依赖面回归（亲跑）**：`npm run smoke:mcp` → `==== smoke:mcp：12 passed
  / 0 failed ====`，**EXIT_CODE=0**（MT01–12 含 MT12 三文件源扫描面维持）。
- **脚本侧声明（ask 给定，VERIFY 未复跑，如实标注）**：`npm run build` /
  `npm run gate`（8 场景 diffPx=0）/ 根 `npm test` / `npm run smoke:server`
  已由脚本运行且通过。
- **提交白名单预核（亲跑 git status/diff）**：工作区改动恰 = 白名单 4 项
  （registry.ts 新增 / config.ts +20 / mcp-registry.mjs 新增 / package.json +1
  script）+ docs/evolution 机制件（STATE.md、iterations/0024/）——产品提交本体
  按 WORKFLOW §4 归脚本 VERIFY 后执行（OBS-001，0023 REPORT 同口径先例）。

### AC7 · env 语义安全核验 — **PASS**

- **亲跑**：`grep -n "shell" apps/server/src/mcp/registry.ts
  apps/server/src/config.ts` → 零命中（exit 1）。
- **MR10（亲跑冒烟内）**：readFileSync 两源文件逐行 `/shell/i` 扫描零命中。
- **形态亲核（Read）**：registry 仅将解析产物分发构造
  （registry.ts:156-158 `createHttpMcpConnection(serverId, url)` /
  `createStdioMcpConnection(serverId, command, args)`），spawn 面全在
  createStdioMcpConnection 内部 SDK 直传（MT12 源扫描 12/12 内维持）；无任何
  命令拼接/解释形态。
- 注记（非缺陷）：tests/smoke/mcp-registry.mjs 内 `shell: false` 两处为**显式关闭**
  shell 的测试侧 spawn 参数（:80/:222），不在 AC7 的生产源扫描面内（AC7 目标 =
  registry.ts；MR10 面 = registry.ts + config.ts）。

## 二、SPEC §7 手动 E2E 七点位

| # | 点位 | 结论 | 证据（本会话亲跑） |
| --- | --- | --- | --- |
| 1 | `wc -l` 三产品文件 | **达标** | 179 / 129 / 340 ≤ 200 / 130 / 400 |
| 2 | `git diff` 边界 | **达标** | 见 AC5（产品提交 `git show --stat` 归 OBS-001 后置） |
| 3 | `grep -n "shell"` 两源文件 | **达标** | 零命中（exit 1），与 MR10 互证 |
| 4 | 真 env 冒烟抽验 | **达标（超额）** | 合法 `MCP_STDIO_SERVERS='demo=node <fixture>'` 启动 → health `{"ok":true,…}` + models 正常（curl_exit=0 ×2）、启动日志仅常规两行无 fatal/warn；非法 `MCP_HTTP_SERVERS='bad'` → exit=1 + fatal 指明变量名（AC2 引用原文）；另补 E9 活测 exit=1 |
| 5 | 产品提交恰一个 | **待脚本后置（OBS-001）** | 提交前不变式已核：改动面 ⊆ SPEC §6 白名单 |
| 6 | EOL：LF、UTF-8 无 BOM | **达标** | node 字节级亲测：四文件 CR(0x0d)=0（纯 LF）、首 3 字节 `2f 2a 20`/`23 21 2f`/`7b 0a 20` 均非 BOM |
| 7 | 冒烟后进程卫生 | **达标（带 OBS-003）** | MR08 孤儿断言 PASS；Win32_Process 全量 node.exe 命令行筛查：mock 夹具/冒烟脚本零残留；见 OBS-003 两条环境注记 |

## 三、观察记录（非缺陷，不阻塞 PASS）

- **OBS-001 · 产品提交 VERIFY 时点未发生**（2023/0023 先例同口径）：WORKFLOW §4
  设计为 VERIFY PASS 后由脚本统一提交；本次预核工作区改动面恰为白名单 4 项 +
  docs/evolution 机制件，CLOSE 归档时以 `git show --stat` 路径 ⊆ SPEC §6 收口。
- **OBS-002 · E9 无专属 MR 机器断言**：SPEC §5.3 fail-fast 组选型为 MR02（E1）/
  MR03（E8），E9（跨 env 同名）仅有 config.ts:100-108 实现而无冒烟断言。VERIFY
  已活测补证（exit=1 + `name 重复注册 [a]`，见 AC2）；建议 BK-0030 扩冒烟面时
  补一条 E9 端到端断言（不影响本轮验收，SPEC 断言清单本身全绿）。
- **OBS-003 · win32 验证环境注记（非产品缺陷）**：① 本会话 boot-valid 亲测用
  Git Bash `kill <msys-pid>` 未能终止 Windows 子进程（MSYS 信号限制），残留
  listener（pid 9144 / :37891）经 `taskkill //F` 清理——后续 win32 上的手动
  E2E 应直接用 taskkill；② 筛查发现一台先前会话遗留 dev server（pid 38108，
  `node dist/server.js`，创建于 2026-10-24 21:17:05——早于本迭代 BUILD 窗口
  2026-10-25 01:33，非本轮产物，疑似用户自起，未动）。二者均与本迭代代码无关。
- **测试侧 8.3 短名分支未在本机走到**（如实声明）：本机 execPath 无空格
  （`C:\Users\Administrator\Tools\node\node-v24\node.exe`），MR08 走直用路径；
  `resolveNodeCommandToken` 的 8.3 绕行分支为纯测试基建（生产注册表无此逻辑，
  JOURNAL §4-3），本机未覆盖，CI（execPath 含空格形态）首次跑该冒烟时自然走到。

## 四、结论与路由建议

**VERIFY · PASS**——PRD AC1–AC7 与 SPEC §7 命令组（G/F 亲跑全绿；A–E 脚本侧声明
通过）+ 手动 E2E 七点位全部达成，零 BUG。BUILD JOURNAL §4 四条偏差记录逐条复核
均与 SPEC 定稿一致（E7 消息分面含双关键词、MR01 显式 PASS 对齐 11/11 计数、
8.3 短名为测试侧裁量、影响面未扩大）。建议协调者按 §4 转 **CLOSE**：归档
（BK-0029 → done、metrics 追加一行、iteration 0025、issue#10 进度回执不关单——
BK-0030 未竟，沿 0023 口径）。
