# JOURNAL · 迭代 0025 · BK-0030（BUILD 阶段）

> 产出角色：code-developer · 2026-10-25 02:35 ~ 03:10
> 输入：`iterations/0025/PRD.md` + `SPEC.md`（已全文读）+ ADR-0012 定界（经
> PRD/SPEC 引用消费）。执行序 = SPEC §13：guard.mcpFetch → registry 缝 →
> inject.ts → tools 注释 → llm 接线 → fixture 探针 → 冒烟 → script。
> 完整门禁（npm run build / gate / test）与 git 提交由工作流脚本统一执行，
> 本阶段未自行运行、未做任何 git 提交（本文件即过程记录）。

## 实现清单（对照 SPEC §6 受影响文件白名单，逐文件）

| 文件 | 动作 | 行数（SPEC 预算） | 说明 |
| --- | --- | --- | --- |
| `apps/server/src/guard.ts` | +mcpFetch | 109（≤130）✓ | §3.1 字面：guardedFetch 薄包装，置于 searxngSearch 之后；无独立 fetch 调用/定时器/重试 |
| `apps/server/src/mcp/registry.ts` | +httpFetch 注入缝 | 183（≤200）✓ | §3.3 字面：BuildRegistryOptions 可选字段 + McpRegistry 构造可选参 + discoverTools HTTP 分支持 conditional opts；默认 undefined = 现行为 |
| `apps/server/src/mcp/inject.ts` | 新增 | 124（≤200）✓ | §3.2：模块级单例（envLoader + httpFetch: mcpFetch）+ buildToolSession 三分支 + dynamicImpl（per-call：connect→callTool(signal 透传)→finally close）+ bridgeSpec 从窄映射 + DISCOVER_FAIL_WARN 字面量 |
| `apps/server/src/tools.ts` | 仅注释 | 119（预算 116 注释互换） | §3.4：collectTools 上方 1 行旧注释扩为 5 行三分支指针；**代码行零变化**，git diff 仅注释行（AC1 最强形态，见下「核对」）；总行数 +3 为注释净增，JOURNAL 在案 |
| `apps/server/src/llm.ts` | :38 异步接线 | 126（≤140）✓ | §3.5 字面 diff 形态：import 行拆分 + `await buildToolSession(n.mcp, ctx.ac.signal)` + extSpecs 消费（desc 回退 + shape Object.assign）；M08-M11 源锁行零触碰（smoke:server 89 断言含 M 组全绿） |
| `tests/smoke/fixtures/mock-stdio-server.mjs` | +探针 | 77（≤80）✓ | §5 增量：--pid-file 启动即写 pid（吞错）+ **--hang-tool 门控**（见「SPEC 内部不一致处置 2」）；两参未传行为零变化 |
| `tests/smoke/mcp-inject.mjs` | 新增 | 400（≤400）✓ | MI01-MI12 全组（MI02/MI03 单 run 双断言、MI09 并入 MI08 块但独立 PASS 行——SPEC §5 压缩序字面执行）；执行序 MI01→MI07→MI02/03→MI04→MI05→MI06→MI08/09→MI10→MI11→MI12（MI07 先行见处置 3） |
| `package.json`（根） | +1 script | ✓ | `"smoke:mcp:inject": "node tests/smoke/mcp-inject.mjs"` |

## SPEC 内部不一致的三处实现处置（非静默偏离，均有 SPEC 自身条款或测试面证据）

1. **ToolImpl 类型导入不可行（SPEC §3.2 草图 vs §3.4/§8 自相矛盾）**：草图
   `import type { ToolImpl } from '../tools.js'`，但 tools.ts 的 `type ToolImpl`
   未导出，且 §8 git 核对要求 tools.ts diff **仅注释行**（加 export 即违）。
   处置：inject.ts 内本地声明同型别名（`type ToolImpl = (args:any)=>Promise<any>`，
   inject.ts:25），tools.ts 保持纯注释 diff。类型形状一致由 tsc 零错误 +
   MI05 引用相等断言双证。
2. **MI08 的 stdio hang 不在 fixture 清单面（SPEC §5 表 vs fixture 现状）**：
   SPEC MI08 要求「stdio hang 工具调用中 abort + PIDFILE 探针」，但
   fixtures 的 tools/list 面只有 echo/add（hang 仅为 tools/call 隐藏路由），
   且 MR08 对该清单面 deepEqual 冻结（mcp-registry.mjs 零改动白名单）——
   manifest 未命中即落分支③ stub，MI08 按 SPEC 字面不可驱动。处置：fixture
   增补 argv 门控 `--hang-tool`（未传 = 行为零变化，MT08-MT11/MR08 全绿
   亲证），使 hang 进清单、MI08 按 SPEC 断言字面全量成立（在途 abort +
   pidfile per-call 探针 + 1 次模型请求）。增量仍在 §6 白名单文件与 ≤80 行
   预算内，超出 SPEC §5 fixture bullet 字面描述的部分即此 3 行门控。
3. **MI07 的 discoveryCount 探针不可达（SPEC §5 表 vs §3.2 导出面矛盾）**：
   MI07 要求 `registry.discoveryCount === 0`，但 §3.2 明文「registry 常量
   不导出——测试经行为断言，不触单例」。处置：MI07 以行为面机器证据等价
   承载（extSpecs 空 + IMPL 条目引用相等 + mockhttp 请求数不变），并前移
   到 MI02-MI06 之前执行使「对 deadhttp 亦零发现」由执行序 + MI06 的首次
   发现 warn 构成证据链；断言名内如实注明。
   附带修正：MI07 初版判据「与 collectTools 逐项引用相等」对 stub 条目
   不可成立（stubOf 每调用生成新闭包，tools.ts:81-85 语义）——改为 IMPL
   条目引用相等 + stub 条目 isStubImpl 等价（session ≡ collectTools 现状
   输出的忠实语义）。

## 自测记录（本阶段实际运行的命令与结果）

- `npm run build:server` → tsc **零错误零输出**（注入层类型面）。
- `node tests/smoke/mcp-inject.mjs` → **MI01-MI12：12 passed / 0 failed，
  exit 0**；复跑两遍均绿（时序敏感组 MI08 稳定）。
- `node tests/smoke/mcp-transport.mjs` → **12 passed / 0 failed**（MT 组
  零回退：注入面开闭零破坏）。
- `node tests/smoke/mcp-registry.mjs` → **11 passed / 0 failed**（MR 组零
  回退：httpFetch 缝后向兼容证明）。
- `npm run smoke:server` → **89 passed / 0 failed**（含 mcp-stubs M01-M11
  冻结面 + llm.ts 源锁 M08-M11 + G 组模型链路——llm.ts 接线回归面）。
- 行数预算：guard 109/130 · inject 124/200 · registry 183/200 · llm 126/140 ·
  mcp-inject 400/400 · fixture 77/80（tools 119：代码行零变化，注释 +3，见上表）。
- 新文件 EOL/BOM：inject.ts、mcp-inject.mjs 均无 BOM、UTF-8、LF（od/file 亲核）。
- git 只读核对（未提交）：
  - `git status --porcelain` 改动面 = SPEC §6 白名单 7 项 + docs/evolution
    机制件（STATE.md + iterations/0025/），无白名单外文件；
  - `git diff -- packages/shared apps/web tools/pixel-gate .github tests/golden`
    **输出为空**（AC6）；
  - `git diff -- apps/server/src/tools.ts` **仅注释行**（AC1 最强形态）；
  - `grep -rn createHttpMcpConnection apps/server/src` 调用/定义点恰三处
    （http.ts:41 定义 / registry.ts:161 注入缝 / inject.ts:52 动态 impl，
    另 3 处为 import 与既有注释）（AC7 注入面唯一性）。
- 冒烟实测锚：MI06 连接失败 error 字面为 SDK 包装消息（含 fetch failed），
  断言按 /fetch failed|ECONNREFUSED|refused|连接拒绝/i 容忍集判（SPEC
  「连接拒绝字样」意图等价）；MI08 abort 型错误经 cause 链判据命中
  （MT07 同型扩展）。

## 未运行项（归脚本/VERIFY）

- `npm run build`（shared+web）、`npm run gate`、`npm test`：按派发指令由
  工作流脚本统一执行，本阶段未运行（本轮零前端/shared 改动，纯后端回归面）。
- git 产品提交：脚本执行（建议信息见 PRD AC6：
  `feat(server): BK-0030 MCP 工具会话注入与 guard 出站收口——collectTools 三分支 + mcpFetch 网关 + run 级联`）。
- SPEC §8 手动 E2E 点位（浏览器人感面）：归 VERIFY。
