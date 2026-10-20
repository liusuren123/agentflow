# ADR-0004 · apps/server TypeScript 化与运行时强化

- 状态：已接受（2026-10-20）· **已实施（Stage 3a，2026-10-20，见文末实施记录）**
- 背景：
  - ADR-0002 完成前端 React + TS 机械移植后，`apps/server` 成为仓库唯一的 JS 岛：它消费
    `packages/shared` 的 TS 类型，自身却无类型保障；engine 的 16 种 handler 参数与返回
    形状全靠约定，重构无护栏。
  - 运行时短板（实查 `apps/server/server.js` / `providers.js`）：
    1. 环境变量零校验——`AI_BASE_URL` 拼错、`AI_MODELS` 格式非法，只在运行到 LLM 节点时暴露；
    2. `console.log` 平铺文本，多 run 并发无法按 run 聚合；密钥/Authorization 无脱敏约定；
    3. 无优雅停机——Ctrl-C 或 `docker stop` 直接断 SSE，活动 run 无中止记录；
    4. API 无版本命名空间，ADR-0005 的持久化端点需要稳定的 `/api/v1` 前缀。
- 决策：
  1. **TS 化与构建**：`apps/server` 迁移 TypeScript（保持 ESM）；`tsc` 构建到
     `apps/server/dist/`，运行 `node dist/server.js`。根 package.json 新增
     `npm run build:server`（与 `build:shared` / `build:web` 命名对齐）；`npm start` 与
     `dev:server` 改为「构建后运行 dist」。`npm run build`（gate 前置链）**保持只构建
     shared + web 不变**，避免门禁链路引入新变量。
  2. **渐进严格 + 显式 NodeResult**：tsconfig 从 `strict: true` 起步，engine 的动态求值
     结果用显式接口收口，不为过类型检查而引入 any 泛滥：

     ```ts
     interface NodeResult {
       value: unknown;      // 主输出，沿边传播
       ports?: unknown[];   // 各输出端口实际值（多路分发，如检索/搜索）
       out: string;         // 节点输出区摘要（node:done.out）
       ms?: number;         // 耗时（node:done.ms）
       tokens?: number;     // LLM usage（node:done.tokens）
       firePort?: number;   // 条件分支命中端口（0 真 / 1 假；null = 全部出边激活）
     }
     ```

     字段与 `engine.js` 实现逐一对应（实查：L137/L149 消费 `firePort`/`ms`/`tokens`；
     retrieval/websearch 返回 `ports`，condition 返回 `firePort`，llm 返回 `tokens`）。
  3. **zod 环境配置校验**（启动时解析一次，非法即 fail-fast 并指明变量名；zod 版本与
     packages/shared 对齐，不新增依赖家族）。全部变量可选——未配置任何密钥合法
     （非 LLM 节点可跑，与现状一致）；「配了但非法」直接退出。

     | 变量 | 类型 / 约束 | 缺省 |
     | --- | --- | --- |
     | `AI_BASE_URL` | 合法绝对 URL | — |
     | `AI_API_KEY` | 非空 string | — |
     | `AI_MODELS` | `显示名:模型ID` 逗号分隔对 | — |
     | `AI_MODEL` | string（提供时须在 `AI_MODELS` 值域） | 模型列表首个 |
     | `AI_PROVIDER_NAME` | string | `'agentflow'` |
     | `PORT` | int 1–65535 | `3000` |
     | `ALLOW_PRIVATE_NET` | `'0'` / `'1'` | `'0'`（SSRF 守卫默认拦截） |
     | `BOCHA_API_KEY` | string | — |
     | `DEEPSEEK_API_KEY` 等 4 个 KNOWN 端点密钥 | string；探测优先级 = `providers.js` `KNOWN_ENDPOINTS` 顺序（DeepSeek → 智谱 → OpenAI → Moonshot） | — |

     > 注：`AI_PROVIDER_NAME` 为实查 `providers.js` L43 / `.env.example` 补充项，
     > 原始决策清单遗漏；与实现逐一对齐时必须收录。
  4. **pino 结构化日志**：每 run 以 runId 作 request-id 贯穿（accepted → done/error/stopped）；
     redact 脱敏 `req.headers.authorization` 与一切 `*api_key` / `*apiKey` 字段；记录点：
     run 生命周期、node:error（带 nodeId/title）、审批决议、优雅停机序列。开发态可用
     pino-pretty（devDependency），生产输出 JSON 单行。
  5. **优雅停机**（SIGINT / SIGTERM 同径）：① `server.close()` 停止接受新请求；
     ② 遍历 `runsById` 逐个 `ac.abort()` 并等待 SSE 收尾（宽限上限 5s，超时强制）；
     ③ 关闭资源（ADR-0005 落地后含 SQLite 连接）；④ `process.exit(0)`。
     全序列预算须在 Docker 默认 10s 停机窗口内完成。
  6. **API v1 命名空间**：`/api/v1/*` 为正式命名空间（首批端点由 ADR-0005 定义；既有
     run / stop / approve / health / models 同步提供 `/api/v1` 等价路径）；旧 `/api/*`
     保留为别名，删除别名需另立 ADR。**前端本阶段零改动——不改 `apps/web` 任何文件**
     （宪法第 4 条机械移植边界；前端切换调用属后续独立变更，另行评审）。
- 备选：
  - 维持 JS（拒绝：shared 已 TS，双语言心智负担；运行时短板无解）；
  - esbuild / tsup（拒绝：tsc 零新依赖，类型检查即构建，无需打包器）；
  - 一步全量 strict 重写 engine（拒绝：风险大；NodeResult 显式收口即可达目标）；
  - 引入 dotenv 生态全家桶（拒绝：`providers.js` 已有 .env 读取，只补校验层即可）。
- 后果：
  - 全仓 TS 统一；后端获得启动期配置 fail-fast、可聚合脱敏日志、可预期的停机行为。
  - CI 需补后端构建/测试步骤（`npm run build:server`）；镜像构建链含 tsc（见 ADR-0005）。
  - `/api/*` 与 `/api/v1/*` 并存期间，接口文档以 v1 为准。
  - 本 ADR 全程不触碰 `apps/web`（宪法第 4 条「不适用」清单内的后端/构建变更，
    不触发像素门禁；`npm run gate` 应保持全绿不动）。

## 实施记录（Stage 3a · 2026-10-20）

- **TS 化与拆分**：8 个 .js → `apps/server/src/` 15 个 .ts（engine 超单文件 400 行上限，
  拆为 engine / handlers / llm / code / util / types）。tsconfig extends `tsconfig.base.json`
  （module 覆写 NodeNext），源内相对导入保留 .js 扩展名，tsc 产物同名 .js 直跑 ESM。
  `NodeResult`/`RunCtx`/`HandlerArgs` 按 ADR 收口；动态值局部 any/unknown，未关闭 strict。
  路径锚点修正：`.env`、`sandbox/`、托管 `apps/web/dist` 均从 `dist/` 回锚到包根/仓库根，
  运行时位置与 TS 化前一致。
- **行为零变化证据**：engine 全部 `out:`/`msg:` 字符串与原实现逐字节相等（提取比对）；
  kb 语料内容全等；guard/expr/search/tools 编译产物与原 JS 仅 tsc 格式化差异。
  保留原实现的字面行为细节（含 NODE_NAMES 值为字符串导致 `meta.name` 恒 undefined 的
  Stage 1 既有回退语义、`||`/falsy 探测语义、webSearch 空查询返回 `[]` 的边界行为）。
- **配置校验**：`config.ts` zod 校验 ADR 全表（含 AI_PROVIDER_NAME），空字符串视为未配置；
  交叉校验 AI_MODEL ∈ AI_MODELS 值域；ALLOW_PRIVATE_NET 接受 1/true/yes/0/false/no
  （覆盖 ADR 表 '0'/'1' 并兼容既有 true/yes 用法），非法值 fatal + exit(1)。
  实测：PORT=abc / AI_BASE_URL=not-a-url / AI_MODEL 越界均启动即报清晰错误退出。
- **pino 日志**：`logger.ts`（redact Authorization/apiKey/api_key 任意层级 +
  req.headers.authorization）。run 级 `logger.child({ runId })` 贯穿：run 开始（节点/边数）/
  run 结束（ms/done/total/ok/stopped）/工具调用/审批挂起与决议/节点失败/run 异常/停机序列。
- **优雅停机**：SIGINT/SIGTERM → server.close → 遍历 abort 活动 run（SSE 发
  run:done(stopped) 后收尾）→ 5s 宽限 → exit(0)。本机 Windows 无法投递 POSIX 信号
  （实测 kill/child.kill 不进 JS 处理器，Linux/CI/Docker 生效）；同等 abort 机制经
  `/api/run/:id/stop` 实测：SSE 收到 run:done(stopped=true, ok=false) 后断开。
- **API v1**：5 个既有端点在 `/api/v1/*` 注册同 handler 别名；`apps/web` 零改动。
- **验证**：build:shared + build:server 通过；`/api/health` 与 `/api/v1/health` 均 ok
  （DeepSeek 端点自动探测）；真实 E2E（kefu 模板，默认问题→假分支→人工审批→approve→
  升级通知）：run:done ok=true、7/8 节点（真分支 reply 跳过）、run:error 无；
  `npm run gate` 4 场景 diffPx=0 全绿；`npm test` 5/5 通过。
- **依赖**：+ pino@9（dependencies）；+ @types/express / @types/node / typescript（dev）。
  根脚本新增 `build:server`，`start`/`dev:server` 链插入 server 构建；`build`（gate
  前置链）按 ADR 保持只构建 shared+web。
