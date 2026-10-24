# JOURNAL · 迭代 0024 · BK-0029 外部 MCP server 注册与工具清单发现（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 01:33–01:45
> 输入：`iterations/0024/PRD.md` + `iterations/0024/SPEC.md` + ADR-0012（PRD/SPEC
> 引述面）+ BK-0028 三模块源码（connection/http/stdio 亲读，仅被 import 消费）。
> 授权链：issue#10 用户批复（授权面 = 附录 A ③ 新增 env 语义两项
> MCP_HTTP_SERVERS / MCP_STDIO_SERVERS，均入 config.ts zod fail-fast）；
> **非修宪轮**：全程零接触 golden、未运行 gate:update、`apps/web/**` /
> `tools/pixel-gate/**` / `packages/shared/**` / `.github/**` 零改动
>（下文 §3 diff 亲核为空）。完整门禁（`npm run build` / `npm run gate` /
> 根 `npm test` / `npm run smoke:server`）与 git 提交由工作流脚本在 BUILD
> 之后统一执行——本 JOURNAL 所载命令为 BUILD 自测链（`npm run
> build:server` + `npm run smoke:mcp:registry` + `npm run smoke:mcp` 回归 +
> 行数/grep/diff/EOL/进程卫生核查），非完整门禁（0021~0023 JOURNAL 同口径）。

## 1. 实施序（SPEC §2/§3/§5/§6 定界逐项落地）

### 步 1 · `apps/server/src/mcp/registry.ts`（新增 179 行 ≤ 预算 200，AC1/AC3/AC4/AC7 载体）

- **纯解析两函数**（SPEC §2.1 规则 + E1-E8 枚举全落地）：`parseHttpServersSpec`
  / `parseStdioServersSpec` 共用 `parseSpec` 骨架（整值 trim 空 = 未配置 →
  零条目零 problems；逗号分割 + 逐条目 trim；首 `=` 分割、值内后续 `=` 归值；
  name 白名单 `[A-Za-z0-9_-]`；同 env 重复 name fail）。E6 在 http 面用
  `new URL()` + 协议 ∈ {http, https} 双判（zod `.url()` 同源语义再窄一步，
  SPEC §2.1 规则 4）；E7（`name=  `）落在 stdio 回调消息「值为空（command
  缺失）」——见 §4 偏差记录第 1 条的形态归位。
- **BUILTIN_MCP_IDS**：五 id 字面常量（filesystem/fetch/sqlite/browser/
  web-search，tools.ts IMPL 键镜像）；冒烟 MR09 与 dist/tools.js IMPL 键集
  排序 deepEqual 防漂移。
- **loaders 扩展点**（BK-0014 预留，PRD 做 5）：`McpServersLoader` 函数签名
  + `McpRegistrySources` 两字段 + v1 唯一成员 `envLoader`（读两 env key，空串
  归一 undefined，config.ts rawEnv 同语义）；未设抽象基类/注册机制（SPEC
  §3.1「仅结构预留」）。
- **buildMcpRegistry**：parse problems 非空（理论不可达）直接 throw 不静默吞；
  逐条目判内置 id 冲突 → warn（§2.2 字面量 `外部 MCP 注册名与内置 id 冲突…`
  + fields {serverId, kind}）+ 拒绝该条进程继续；warn 可注入（BuildRegistryOptions，
  冒烟 MR05 collector / MR06 默认 logger 两路）。
- **McpRegistry.discoverTools**（SPEC §2.3 口径）：命中缓存直接回快照（零连接
  零出站）；未命中 → 按 kind 分发 `createHttpMcpConnection` /
  `createStdioMcpConnection` → connect → listTools → 存快照，**finally 必达
  close（发现即关立即拆链）**；失败原样外抛、失败不缓存；超时继承 BK-0028
  默认不自制定时器；未知 serverId → throw「未注册的 MCP server: <id>」。
  测试探针面：`discoveryCount`（缓存命中断言）+ `stdioPidOf`（connect 后、
  close 前记录 transport.pid，MR08 孤儿断言数据源）——均标注非接口承诺。
- TS 实现细节：zod 不进 registry（纯字符串处理，SPEC §3.2 口径）；解析中间
  结果用判别联合 `StepResult{T} = {ok:true,value} | {ok:false,problem}`
  ——初版非判别 `{entry:T}|{problem}` 在 TS 推断下把 T 污染为 `T|undefined`
  （编译错亲踩），判别式修正后过。

### 步 2 · `apps/server/src/config.ts`（109 → 129 行 ≤ 预算 130，AC1/AC2）

- +1 import（registry 两纯函数）；rawEnv 白名单 13→15 key；EnvSchema +2
  `z.string().superRefine`（problems 逐条 `ctx.addIssue`，E1-E8 字段内校验，
  经既有 fail 通道输出 `MCP_HTTP_SERVERS="…"：条目 N：原因`——AC2「指明变量
  名与原因」由既有 problems 拼装先例直接满足）。
- loadConfig 交叉校验段 +E9（两 env 均提供时 name 集合交集非空 → fail，沿
  AI_MODEL×AI_MODELS 先例）。
- **返回对象零新增字段**（SPEC §3.2.4：两原始串不入 AppConfig，registry
  消费方走 envLoader 自取；BUILD 亲核 `config` 返回 keys=10 与改前一致）。
- 依赖方向 `config.ts → mcp/registry.ts → {http,stdio,logger} → SDK` 单向
  无环；registry 不 import config（SPEC §4 边界）。

### 步 3 · `tests/smoke/mcp-registry.mjs`（新增 340 行 ≤ 预算 400）+ 根 package.json +1 script

- SPEC §5.1 落位定稿执行：**独立文件**（不并入 mcp-transport.mjs——避免改
  MT12 源扫描面；不并入 smoke-server.mjs——规避 V09 时点性假红）；复用
  lib.mjs `Checker/SmokeFailError/deepEqual/getFreePort/sleep/startServer`；
  fail-fast 运行器 + finally 清理 + SIGINT/SIGBREAK exit 130 + 汇总行
  `==== smoke:mcp:registry：X passed / Y failed ====`（mcp-transport.mjs
  同款）。
- MR01 前置六产物自检（mcp 四 js + server.js + tools.js，缺失全量 FAIL 并给
  「先 npm run build:server」）；main() 起始 `delete` 两 env（宿主 MCP env
  不泄入本进程与子进程，MR02/03/11 确定性）。
- mock 面（SPEC §5.2）：stdio 直用 fixtures/mock-stdio-server.mjs（零改动）；
  HTTP 为文件内精简进程内 mock（initialize + tools/list 两路由 + 逐请求计数，
  mcp-transport.mjs startMockHttpMcp 同源裁剪）；EXPECT_TOOLS 与 BK-0028
  逐字相同。
- **实现期环境适配（SPEC 留白处的测试侧裁量）**：SPEC §5.2 的 stdio 条目
  `<process.execPath> <fixtureAbsPath>` 假定 execPath 无空格——本机无空格
  可直用，但通用环境（如 CI windows-latest 的 `C:\Program Files\...`）会因
  案 A 值按空白分割 argv 而碎裂。冒烟内加 `resolveNodeCommandToken()`：
  execPath 含空格时经 `cmd /c for %~sA` 解析 8.3 短名绕行（**仅测试代码，
  生产注册表无此逻辑**；ADR §7「复杂命令用包装脚本」同源取舍）。
- MR06 默认 logger 路：spawn `node --input-type=module -e`（pathToFileURL
  import dist/mcp/registry.js → buildMcpRegistry 冲突源 → console.log 完成
  标记），断言 stdout 含 pino warn 固定子串 + `"serverId":"fetch"` 字段 +
  完成标记、退出码 0。

## 2. 自测记录（BUILD 会话亲跑，2026-10-25 01:33–01:45）

| # | 命令 | 结果 |
| --- | --- | --- |
| 1 | `npm run build:server` | exit 0（三次：首版判别联合编译错 → 修正；E7 消息归位 → 修正后定型），dist/mcp/{connection,http,stdio,registry}.js 在位 |
| 2 | `npm run smoke:mcp:registry` | **MR01-MR11 全 PASS，`==== smoke:mcp:registry：11 passed / 0 failed ====`，exit 0**（首跑 MR04 抓出 E7 形态命中 E4 消息的实现偏差，修正后一次全绿；MR01 补显式 PASS 使计数与 SPEC §7-G「MR01-MR11 全 passed」对齐） |
| 3 | `npm run smoke:mcp` | MT01-MT12 **12 passed / 0 failed**，exit 0（BK-0028 组零回退；config.ts 改动的既有面回归） |
| 4 | `wc -l`（三产品文件） | registry.ts 179（≤200）/ config.ts 129（≤130）/ mcp-registry.mjs 340（≤400），全部达标 |
| 5 | `grep -in "shell" apps/server/src/mcp/registry.ts apps/server/src/config.ts` | 无命中（AC7 手工复核；与 MR10 机器断言互证） |
| 6 | `git diff --stat -- apps/server/src` | 仅 config.ts +20 行 + 新增 registry.ts；`git diff -- packages/shared apps/web tools/pixel-gate .github` 恒空（AC5）；mcp/ 既有三文件零改动 |
| 7 | EOL/BOM | od 字节级亲核：registry.ts（首 3 字节 2f2a20）/ mcp-registry.mjs（23212f）/ config.ts / package.json 均 LF-only、UTF-8 无 BOM |
| 8 | 进程卫生 | smoke 后 Win32_Process 命令行逐条核：无一条指向 mock 夹具/冒烟（MR08 亦已断言子进程退出） |
| 9 | 空注册表基线 | `env -u MCP_HTTP_SERVERS -u MCP_STDIO_SERVERS node -e import ./dist/config.js` → config-ok、返回 keys=10（与改前一致，AC1「未配置 = 行为零变化」的直接证据） |

未运行（归脚本统一执行，如实声明）：`npm run build`（根 shared+web）、
`npm run gate`、根 `npm test`、`npm run smoke:server`、git 提交。

## 3. 边界与安全自查

- registry.ts import 面恰为 SPEC §4 白名单四项：`./http.js`、`./stdio.js`、
  `./connection.js`（仅类型）、`../logger.js`。**零 node:fs、零
  node:child_process、零 config/tools/guard/llm/engine/sessions/server 引用**；
  反向零生产模块引用 registry（唯一消费者 = config.ts 两纯函数引用 +
  tests/smoke/mcp-registry.mjs）——「发现缓存无生产消费方」成立，llm.ts /
  tools.ts / guard.ts / engine.ts / handlers.ts / server.ts 全部零改动。
- 零生产出站路径：registry 只把解析出的 argv 传给 createStdioMcpConnection
  （SDK 直 spawn，无命令拼接/解释形态，AC7）；真实 endpoint 出站收口归
  BK-0030 guard mcpFetch 注入（PRD 非功能 2）。冒烟对 localhost mock 直连
  仅在测试代码。
- env 语义面恰两项（PRD 非功能 4）：未新增第三种 env、未引入配置文件面；
  E9 交叉校验沿用 config 既有 fail 通道。
- 零 shared 契约、零 UI、零 golden 接触；未运行 gate:update（POLICY 禁止区）。
- 超时如实报错不伪造（继承 BK-0028 SDK 直传超时）；close 幂等（继承基类）；
  未知 serverId 如实 throw。

## 4. 偏差与豁免记录

1. **E7 消息归属的实现落点（SPEC §2.1 表内既注「同 E4 的 stdio 面」）**：
   首版把「值为空」统一判在共享 splitNameValue（E4），导致 `name=  ` 在
   stdio 面也出 E4 消息、MR04 期望关键词「command 缺失」不满足——冒烟首跑
   即抓出。修正：空值判断下放到两传输各自回调，http 面消息「值为空」（E4）、
   stdio 面消息「值为空（command 缺失）」（E7，同时含两关键词）。行为仍为
   fail-fast 退出 1，仅 problems 文案分面，与 SPEC 枚举表逐行一致。
2. **MR01 计数口径**：SPEC §5.3 把 MR01 列为断言行（前置六产物在位）——
   首版实现沿用 mcp-transport.mjs「前置缺失才 FAIL」形态（成功时无 PASS
   行，计数 10）。为对齐 §7-G「MR01-MR11 全 passed」判据，成功路径补显式
   `C.pass('MR01', …)`，汇总 11/11。
3. **冒烟内 8.3 短名绕行**（SPEC 留白）：`resolveNodeCommandToken` 处理
   execPath 含空格环境（见 §1 步 3），测试侧专用，产品代码零涉及。
4. 无影响面扩大：产品改动恰为 SPEC §6 白名单 4 项（见 §5）；未触及 PRD
   「不做」清单任何一项（guard/collectTools/llm 注入/前端面板/loaders 新
   loader 均未碰）。

## 5. 产品提交白名单（= SPEC §6；脚本 add 口径）

```
apps/server/src/mcp/registry.ts      新增 179 行
apps/server/src/config.ts            +20 行（109→129）
tests/smoke/mcp-registry.mjs         新增 340 行
package.json                         +1 script 行（smoke:mcp:registry）
```

零新依赖（SDK 已由 BK-0028 引入，apps/server/package.json 与
package-lock.json 零改动）。docs/evolution/**（STATE/JOURNAL）不属本清单，
归脚本/归档提交处置。
