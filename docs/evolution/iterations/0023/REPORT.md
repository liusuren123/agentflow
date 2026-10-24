# REPORT · 迭代 0023 · BK-0028 真 MCP client 传输层 VERIFY（统一 McpConnection + Streamable HTTP/stdio 双传输 + 冒烟）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 01:07–01:12
> 输入：`iterations/0023/PRD.md` AC1–AC8 + `iterations/0023/SPEC.md` §5 断言清单/§6 白名单/§7 验收口径。
> 执行环境：本机 Windows（win32 10.0.26300）· Node v24（node-v24 运行时）· Git Bash；
> 本地非 CI 权威环境（gate 以 CI 为权威，本地下结论按 CONSTITUTION 第 2 条如实标注）。
>
> ## 总结论：**PASS**（零 BUG；OBS-001~002 两条观察记录，均非产品缺陷）
>
> 脚本侧已运行的完整门禁（`npm run build` / `npm run gate` / 根 `npm test` /
> `npm run build:server`）按派发约定（ask：「build/gate/test 已由脚本运行且通过，
> 不要重复跑全套」）不重复全套；本报告以测试经理职责亲跑的针对性验证覆盖全部
> 实质验收面：核心验收载体 `npm run smoke:mcp`（MT01–12）与回归抽查
> `npm run smoke:server` 均为本会话亲跑全绿，SPEC §7 手动 E2E 七点位逐条执行。

## 0. 验收面 × 证据形式总览

| AC | 结论 | 证据形式（全部本会话亲跑，除非注明「脚本侧」） |
| --- | --- | --- |
| AC1 依赖引入与构建链 | **PASS** | `npm ls` resolved 2.4.0 无 peer 违例（亲跑）+ package.json 恰 +1 行（亲跑 diff）+ dist/mcp 可加载可执行（smoke:mcp 全链亲跑即证）；build:server exit 0 为脚本侧声明 |
| AC2 McpConnection 统一抽象 | **PASS** | 三源文件 Read 亲核接口五面 = ADR-0012 §3 草图（callTool 第 4 参 signal 为 SPEC §3.1 定稿扩展面）+ `wc -l` 84/43/45 ≤ 200/150/150（亲跑） |
| AC3 Streamable HTTP 全链 | **PASS** | MT01/MT02/MT03 PASS（`npm run smoke:mcp` 亲跑，12/0，exit 0） |
| AC4 stdio 全链 + 无孤儿 | **PASS** | MT08/MT09 PASS（同上亲跑） |
| AC5 超时与 abort | **PASS** | MT06/MT07/MT10/MT11 PASS（同上亲跑；小值 100ms 覆写，实测拒绝） |
| AC6 零生产接线（边界不变式） | **PASS** | `git diff --stat -- apps/server/src` 空 + 禁区五路径 diff 恒空 + status 产品面恰白名单 8 项（亲跑）；gate 8 场景 diffPx=0 为脚本侧声明 |
| AC7 回归与提交不变式 | **PASS（带 OBS-001）** | `npm run smoke:server` 89 passed / 0 failed exit 0（亲跑，既有组零回退）+ smoke:mcp 12/0（亲跑）+ 工作区白名单形态核对（亲跑）；npm test 为脚本侧声明；产品提交 VERIFY 时点未发生（git 归脚本后置，OBS-001） |
| AC8 spawn 安全核验 | **PASS** | `grep -in "shell" apps/server/src/mcp/*.ts` 无命中（亲跑，exit 1）+ MT12 机器断言 PASS（亲跑冒烟内） |

## 一、AC 逐条验收

### AC1 · 依赖引入与构建链 — **PASS**

- **依赖树（SPEC §7 点位 1，亲跑）**：`npm ls @modelcontextprotocol/client`
  （仓库根，workspace 解析）→
  `agentflow@1.0.0 → @agentflow/server@1.2.0 → @modelcontextprotocol/client@2.4.0`，
  **exit 0，输出无任何 UNMET/invalid/peer 违例行**（SDK 无 peerDependencies，
  SPEC §2-V2 复核口径的落地形态）。
- **依赖行（亲跑 diff）**：`git diff -- package.json apps/server/package.json` →
  apps/server/package.json 恰 +1 行 `"@modelcontextprotocol/client": "^2.4.0"`
  （字典序插入于 `@ai-sdk/openai-compatible` 与 `ai` 之间）；根 package.json 恰
  +1 行 `"smoke:mcp": "node tests/smoke/mcp-transport.mjs"`。版本字面 `^2.4.0`
  与 SPEC/ADR `^2.4` 同 semver 区间——JOURNAL §4 已声明的 npm install 归一行为，
  非裁量偏差。
- **构建链**：`npm run build:server` exit 0 为脚本侧声明（ask 给定，VERIFY 未
  复跑）；**dist/mcp 三产物在位且可加载可执行由 smoke:mcp 亲跑全绿直接证明**
  （mcp-transport.mjs:142-150 前置自检 dist/mcp/{connection,http,stdio}.js 在位
  并动态 import 执行全链——12/0 全 PASS 即加载与执行面成立）。

### AC2 · McpConnection 统一抽象 — **PASS**

- **接口面对照（三源文件 Read 亲核 vs ADR-0012 §3 草图，本会话 sed 提取 §3 原文比对）**：
  - `connection.ts:22-31`：`readonly serverId` / `connect(timeoutMs?)` /
    `listTools(timeoutMs?)` / `callTool(name, args, timeoutMs?)` / `close()` 五面
    **与草图前 3 参逐字一致**；callTool 增可选第 4 参 `signal?: AbortSignal`
    （`connection.ts:29`）——SPEC §3.1 定稿的扩展面（AC5 abort 承载），SPEC 已
    声明「可选参扩展而非改面」，不构成偏差。
  - 默认超时 `CONNECT_TIMEOUT_MS=10_000` / `CALL_TIMEOUT_MS=30_000`
    （`connection.ts:35-36`）= ADR §6.1；实现为直传 SDK `RequestOptions.timeout`
    （`connection.ts:59/:63/:72`），不自制定时器，超时如实抛出不伪造结果。
  - close 幂等可重入（`connection.ts:77-83`：closed 标志 + 未 connect 的连接
    为无抛 no-op）——非功能 3 达标，且 MT04「二次 close 不抛」机器断言 PASS。
  - CLIENT_INFO 静态常量 `{name:'AgentFlow', version:'1.0.0'}`
    （`connection.ts:39`）不读 package.json——零文件读取面。
- **行数（SPEC §7 点位 2，亲跑）**：`wc -l` → connection.ts **84**（≤200）/
  http.ts **43**（≤150）/ stdio.ts **45**（≤150）/ mcp-transport.mjs **311**
  （≤400）/ mock-stdio-server.mjs **65**（≤150）——全部低于 SPEC §6 预算表。
- **两传输构造分支（Read 亲核）**：http.ts 工厂
  `createHttpMcpConnection(serverId, url, {fetch?, requestInit?})`（:41-43），
  teardown 覆写 = terminateSession best-effort 吞错（:36-38，405/网络错误容忍
  = SPEC V9）；stdio.ts 工厂 `createStdioMcpConnection(serverId, command, args?,
  {env?, cwd?, stderr?})`（:43-45），argv 直传 SDK，`get pid()` 测试探针面
  （:38-40）= MT09 数据源。上层对传输类型无感知（ADR §3.2 统一抽象达成）。

### AC3 · Streamable HTTP 全链（先行传输）— **PASS**

`npm run smoke:mcp` 本会话亲跑（2026-10-25 01:09），MT 组输出逐条：

- **MT01 PASS**：HTTP connect 成功；mock 请求日志含 initialize 且
  `clientInfo.name==="AgentFlow"`（进程内 node:http mock 起于 127.0.0.1 动态端口，
  SPEC §5.2 形态：单 POST 端点 + DELETE→405 + notification→202 + 未知
  method→-32601 liberal 路由 + `Mcp-Session-Id` 会话头，mock 源码 Read 亲核
  与 SPEC §5.2 逐条对应）。
- **MT02 PASS**：listTools 返回恰 2 项（echo/add），name/desc/inputSchema 与
  mock 定义 deepEqual（断言面 = SPEC §2-V11 的 name/description/inputSchema）。
- **MT03 PASS**：callTool echo → `{"echo":"hi"}`、add(2,3) → `"5"`
  （content[0].text 逐字比对；CallToolResult 原样透传不解包，BK-0030 界面）。
- **MT04 PASS**：close 后 mock 日志含 DELETE（terminateSession 已发；会话头
  令 SDK 不短路——JOURNAL §1 实现期发现的设计修正，验证有效）；405 下 close
  仍成功；二次 close 不抛（幂等）。
- **MT05 PASS**：fetch 注入面——计数 wrapper 构造
  `createHttpMcpConnection(…, {fetch: countingFetch})`，connect+listTools+
  callTool 全链后调用数 ≥3（注入点真实生效，BK-0030 前向兼容依据，
  SPEC §2-V5/V6 收口结论的行为级证明）。

### AC4 · stdio 全链（同项第二传输）+ 无孤儿 — **PASS**

- **MT08 PASS**：`createStdioMcpConnection('mock-stdio', process.execPath,
  [fixture])` spawn node 子进程 mock（newline-delimited JSON-RPC，夹具
  mock-stdio-server.mjs Read 亲核 = SPEC §5.3 帧协议：单行回写/notification
  不回写/未知 method→-32601/stdin 关闭自然退出；工具面与 HTTP mock 逐字相同）
  → connect→listTools→callTool(echo/add) 全链成功，断言形状同 MT02/MT03。
- **MT09 PASS**：close 前记 `conn.pid`，close 后 `process.kill(pid,0)` 轮询
  （50ms×40 上限 2s）至抛出——子进程已退出，无孤儿。

### AC5 · 超时与 abort — **PASS**

- **MT06 PASS（HTTP 超时）**：slow_echo（800ms 延迟源）+ `timeoutMs=100` →
  拒绝；错误判据 `SdkErrorCode.RequestTimeout`（直引 SDK，冒烟 :19 import）
  或消息含 timeout；实测耗时 <1s——小值覆写证明超时逻辑，未实等 30s 默认。
- **MT07 PASS（HTTP abort）**：hang（3000ms 悬挂源）+ AbortController 100ms
  后 abort → 拒绝（AbortError 判据）；随后 close() 成功无泄漏。
- **MT10 PASS（stdio 超时）**：同 MT06 判据，stdio 传输下及时拒绝。
- **MT11 PASS（stdio abort）**：hang + abort → 拒绝；close 成功。
- 四条均断言**拒绝路径**而非伪造成功——tools.ts:4-5「如实报错」原则达标
  （PRD 非功能 3）；超时恒显式传值使 SDK 自身 60s 默认不生效（SPEC V10 口径）。

### AC6 · 零生产接线（边界不变式）— **PASS**

- **既有模块零改动（SPEC §7 点位 3，亲跑）**：`git diff --stat -- apps/server/src`
  → **输出空**（tracked 既有 17 模块零改动；mcp/ 为新增未跟踪目录）。
- **禁区恒空（亲跑）**：`git diff -- packages/shared apps/web tools/pixel-gate
  .github tests/golden` → **输出空**（零 shared 契约、零 UI、零门禁基建、
  零 golden 接触）。
- **status 产品面（亲跑）**：`git status --porcelain` 产品改动恰为
  `M apps/server/package.json`、`M package-lock.json`、`M package.json`、
  `?? apps/server/src/mcp/`、`?? tests/smoke/mcp-transport.mjs`、
  `?? tests/smoke/fixtures/`——**恰为 SPEC §6 白名单 8 项**（三 M + 三路径
  覆盖 5 新文件），白名单外零出现；既有测试文件（smoke-server.mjs/
  mcp-stubs.mjs/lib.mjs/shutdown-sigterm.mjs/tests/canvas/**）无 M 条目
  （零改动白名单达标）。另有 `M docs/adr/0012…`、`M docs/evolution/STATE.md`、
  `?? docs/evolution/iterations/0023/` 为机制件，JOURNAL §5 已声明归脚本/
  归档提交处置，不计产品面。
- **import 边界（Read 亲核，SPEC §4）**：connection.ts ←
  `@modelcontextprotocol/client`；http.ts ← `./connection.js` +
  `@modelcontextprotocol/client`；stdio.ts ← `./connection.js` +
  `@modelcontextprotocol/client/stdio`——恰为白名单，**零 node:fs、零
  guard/tools/config/llm/engine/sessions/server 引用**；mcp/ 零生产消费者
  （既有 17 模块零改动即反证）。零生产出站路径：mcp/ 生产代码无任何请求
  URL 面（localhost 直连仅存在于测试代码，PRD 非功能 2 明文许可形态）。
- **gate 8 场景 diffPx=0**：脚本侧声明（ask 给定，VERIFY 未复跑）。

### AC7 · 回归与提交不变式 — **PASS（带 OBS-001）**

- **既有组零回退（亲跑）**：`npm run smoke:server` →
  **`==== smoke:server：89 passed / 0 failed ====`，exit 0**（本会话
  2026-10-25 01:10 完整输出核对：V/Z/C 组及全量 PASS；含 V09「git status
  --porcelain -- packages/shared 为空（DEFS 零漂移）」PASS——独立冒烟文件
  方案如 PRD 预告不涉 V09 时点性假红面）。
- **新增传输组全绿（亲跑）**：`npm run smoke:mcp` →
  **`==== smoke:mcp：12 passed / 0 failed ====`，exit 0**。
- **npm test**：脚本侧声明（ask 给定，VERIFY 未复跑）。
- **产品提交恰一个**：VERIFY 时点 HEAD=332f7fc（归档迭代 0022），**产品提交
  尚未发生**——git 操作按工作流 v2 归脚本统一执行（ask 明示）；以工作区形态
  替代核对：产品改动恰为 SPEC §6 白名单 8 项（见 AC6），建议提交信息已由
  PRD/ SPEC 给定（`feat(server): BK-0028 …`）。**提交本身的单提交性与
  Conventional Commits 形态留待脚本执行，CLOSE 时点应复核**（OBS-001）。

### AC8 · spawn 安全核验（评审级）— **PASS**

- **手工复核（SPEC §7 点位 4，亲跑）**：`grep -in "shell" apps/server/src/mcp/*.ts`
  → **无命中（exit 1 = no match）**。
- **机器断言互证（亲跑）**：MT12 PASS——冒烟内 readFileSync 三个
  src/mcp/*.ts 逐行 `/shell/i` 扫描零命中（argv 直传、零命令解释器拼接）；
  源码 Read 亲核 stdio.ts:26-32 构造参数恰 `{command, args, env?, cwd?,
  stderr?}`，SDK StdioServerParameters API 面无任何命令解释器选项
  （SPEC §2-V7 实核口径一致）。

## 二、SPEC §7 手动 E2E 点位逐条回执（全部亲跑）

| # | 点位 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | `npm ls @modelcontextprotocol/client` | ✅ resolved 2.4.0、无 peer 违例、exit 0 | §一 AC1 |
| 2 | `wc -l` 五新文件 vs 预算表 | ✅ 84/43/45/311/65 ≤ 200/150/150/400/150 | §一 AC2 |
| 3 | 边界 diff（apps/server/src 既有模块 / 禁区五路径） | ✅ 双空；status 产品面恰白名单 | §一 AC6 |
| 4 | `grep -n "shell" apps/server/src/mcp/*.ts` | ✅ 无命中（与 MT12 互证） | §一 AC8 |
| 5 | 产品提交恰一个 + `git show --stat` ⊆ 白名单 | ⏳ VERIFY 时点未提交（OBS-001）；工作区形态核对 ✅ | §一 AC7 |
| 6 | 新文件 EOL：LF、UTF-8 无 BOM | ✅ 五文件 od/grep 字节级：noBOM + LF-only（无 \r） | 本表（亲跑 od -An -tx1 首 3 字节 + grep $'\r' 零命中） |
| 7 | 冒烟后进程卫生（无僵尸 node） | ✅ 见 §三 | §三 |

## 三、进程卫生（点位 7，亲跑）

`powershell Get-CimInstance Win32_Process`（node.exe 全量命令行逐条核对）：

- **零命中本迭代冒烟路径**：无任何进程命令行指向 `mock-stdio-server.mjs` /
  `mcp-transport.mjs` / `tests/smoke/**`——stdio mock 子进程无孤儿
  （MT09 的进程外复核）。
- 唯一形态相近的 `node dist/server.js`（PID 38108）**创建于
  2026-10-24 21:17:05**——早于本次迭代（BUILD 00:56 起）约 4 小时，为宿主
  环境常驻 dev:server，非冒烟残留；smoke:server 自身 C04「server 子进程已
  终止（kill → 3s → SIGKILL 兜底）」PASS 即其子进程管理自洽。

## 四、交互回归抽查

- **零 UI 接触的反证（亲跑）**：`git diff -- apps/web` 输出空（AC6 禁区
  核对的一部分）；本迭代改动全部位于新增后端目录 `apps/server/src/mcp/`、
  冒烟测试与两处单行 package 配置——前端三层（视觉/DOM/交互）无任何被触
  代码路径（mcp/ 零生产消费者，改动不可能到达渲染层）。
- **gate 8 场景 diffPx=0**：脚本侧声明（ask 给定，VERIFY 未复跑）。
- 画布交互清单（拖拽/缩放/框选/连线/滚轮门控/数字步进/快捷键/审批弹窗/
  撤销重做/导入导出/多标签/节点库）**未逐项人工执行**——因零前端代码路径
  被触碰，无回归载体；以 apps/web 零 diff + gate 脚本侧全绿 + smoke:server
  89/0（后端行为面）作为交互等价性的机器证据链。如实标注，非省略。

## 五、观察项（非缺陷）

- **OBS-001（时序事实）**：产品提交在 VERIFY 时点尚未发生（HEAD=332f7fc，
  git 操作归工作流脚本后置统一执行）。AC7「提交恰一个/白名单/Conventional
  Commits」以工作区形态替代核对通过；**建议 CLOSE 时点以 `git show --stat`
  复核提交路径 ⊆ SPEC §6 白名单后归档**。
- **OBS-002（版本字面）**：apps/server/package.json 依赖写 `^2.4.0` 而
  SPEC/ADR 写 `^2.4`——同 semver 区间，npm install 归一行为（JOURNAL §4
  已声明）。CLOSE 无需动作，BK-0029/0030 沿用时任一写法均可。

## 六、结论与 CLOSE 建议

**VERIFY = PASS**：PRD AC1–AC8 全部通过（AC7 提交子项带 OBS-001 时序说明），
零 BUG，无需修复轮。核心验收载体 smoke:mcp MT01–12 与回归 smoke:server
89 断言均本会话亲跑全绿；边界不变式（零生产接线/零 shared/零 UI/零 shell）
全部机器证据在案。建议协调者按 §4 状态机进入 CLOSE：归档提交时含本 REPORT
与 STATE/BACKLOG/metrics 变更，并执行 OBS-001 的提交白名单复核。
