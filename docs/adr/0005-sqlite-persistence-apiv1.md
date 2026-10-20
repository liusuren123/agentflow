# ADR-0005 · SQLite 持久化与 API v1

- 状态：已接受（2026-10-20）· **已实施**（2026-10-20，见文末实施记录）
- 背景：
  - 工作流与运行历史目前只存前端 localStorage（`apps/web/src/legacy/app.js` L1142/L1148，
    LS_KEY 单键整存）；后端 run 状态是内存注册表（`server.js` `runsById`），进程重启即失；
    SSE 事件流过即弃，无回放、无跨设备能力。
  - 容器化部署需要明确的有状态落点（卷挂载一个文件即可备份），且新端点需要版本化
    前缀（ADR-0004 已确立 `/api/v1` 命名空间）。
- 决策：
  1. **选型 better-sqlite3**：同步 API 与 Express 单进程模型天然匹配（无回调竞态）、
     零运维、单文件即数据库。数据文件 `data/agentflow.db`（仓库根 `data/` 目录加入
     `.gitignore`；开启 WAL 模式）。仓储访问收敛到独立模块（接口层隔离：调用方只见
     函数、不见 SQL），未来可平移 PostgreSQL。
  2. **表结构**（首批最小集）：

     ```sql
     workflows(id TEXT PRIMARY KEY, text TEXT NOT NULL, updated_at INTEGER NOT NULL);
     -- text = 工作流 JSON 文档 {name, nodes, edges, inputs?}（与 POST /api/run body 同构）

     runs(id TEXT PRIMARY KEY, text TEXT NOT NULL, workflow_name TEXT NOT NULL,
          status TEXT NOT NULL, started_at INTEGER NOT NULL,
          ended_ms INTEGER, done INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0);
     -- text = run 概要 JSON；status: running | done | error | stopped
     -- started_at 为 Unix 毫秒；ended_ms 为总耗时（run:done.ms 同源）

     run_events(run_id TEXT NOT NULL, seq INTEGER NOT NULL, json TEXT NOT NULL,
                PRIMARY KEY(run_id, seq));
     -- json = 单条 SSE 事件原样（packages/shared RunEventSchema 的 15 种之一）
     ```

  3. **落库机制**：落库钩子挂在事件序列化的单一出口（server.js 组装 `data: {...}\n\n`
     处，覆盖 `run:accepted` 与 ctx.emit 的全部事件；ping 注释行不落库）。seq 自
     `run:accepted` = 0 递增；run:start / run:done / run:error / stop 时同步更新 runs 行
     （status、done/total、ended_ms）。同进程同步写：先落库后写网，SSE 断线不丢历史。
     正例：一次 3 节点运行的事件回放至少含 run:accepted → run:start → 3×(node:start +
     node:done) → ≥1×run:progress → run:done 的完整有序序列；反例：进程崩溃时最多丢
     「最后一条尚未写入」的事件，已写行因事务保持原子一致。
  4. **API v1 端点**（正式命名空间；旧 `/api/*` 别名继续可用，见 ADR-0004）：

     | 方法与路径 | 语义 | 成功载荷（200） |
     | --- | --- | --- |
     | `GET /api/v1/workflows` | 工作流列表（updated_at 倒序） | `{workflows:[{id,name,updated_at}]}` |
     | `PUT /api/v1/workflows` | upsert；body `{id?, name, nodes, edges, inputs?}` | `{id, updated_at}` |
     | `GET /api/v1/runs?limit=20` | 最近运行（started_at 倒序；limit 1–100，默认 20） | `{runs:[{id,workflow_name,status,started_at,ended_ms,done,total}]}` |
     | `GET /api/v1/runs/:id` | 运行详情 + 事件回放 | `{run:{…同上行}, events:RunEvent[]}`；未知 id → 404 |

     另：`/api/v1/run`、`/api/v1/run/:id/stop`、`/api/v1/run/:id/approve`、
     `/api/v1/health`、`/api/v1/models` 为既有端点的 v1 等价路径，行为不变。
     SSE 事件载荷字段以 `packages/shared/src/events.ts` 为唯一事实源（15 种）。
  5. **前端事实源不变**：localStorage 仍是前端当前事实源（`apps/web` 零改动）。服务端
     消费（如侧栏新增「运行历史」入口）属 UI 变更——**需宪法第 3 条流程（ADR + 用户
     本人批准 + golden 重录），本 ADR 不构成许可**。
  6. **Docker 部署**：
     - multi-stage：`build` 阶段 `node:22-bookworm-slim` + python3/make/g++（better-sqlite3
       无预编译时本地构建），安装并构建 shared / web / server；`runtime` 阶段仅
       `node:22-bookworm-slim` + dist 产物 + 生产依赖。两阶段同 glibc（bookworm），
       保证原生模块二进制兼容。
     - 卷：`/app/data`（宿主挂载持久化 `agentflow.db`）；env 透传清单同 ADR-0004
       校验表（AI_* / KNOWN 密钥 / PORT / ALLOW_PRIVATE_NET / BOCHA_API_KEY）。
     - `.dockerignore`：`node_modules`、`**/dist`、`data/`、`tests/`、`.git/`、
       `.mimosa/`、`tools/pixel-gate/`、`**/.env`（密钥绝不进入镜像层）。
- 备选：
  - JSON 文件存储（拒绝：并发写与原子性要自造轮子）；
  - PostgreSQL（拒绝：本地工具引入服务运维成本；接口层已留切换缝，真需求出现再迁）；
  - 仅内存 + 前端导出（拒绝：重启即失、无回放）；
  - sql.js（拒绝：纯内存、需手工落盘，失去事务与并发读）。
- 后果：
  - 运行历史可回放（`GET /api/v1/runs/:id` 返回完整事件序列）；备份 = 复制单文件。
  - 引入原生依赖 better-sqlite3：Node 大版本升级需重装编译；Docker/CI 统一 node:22 缓解。
  - 服务端成为「可选事实源」：前端何时切换、如何切换，留待后续合宪流程，本 ADR 显式
    不授权任何 UI 改动。
- 配套文档：README 增补「持久化与部署」小节、AGENTS.md 常用命令表补 `build:server`
  （均标注规划状态，落地后去除标注）。

## 实施记录（2026-10-20 · Stage 3b，提交见 git log）

- **仓储模块** `apps/server/src/store.ts`：全部 SQL 收敛于此（DDL 幂等迁移、WAL、
  两个事务封装），路由与引擎零裸 SQL；`data/agentflow.db`，`data/` 已入 `.gitignore`。
- **落库钩子**：`apps/server/src/server.ts` 的 `send()` 为事件序列化单一出口——
  `run:accepted` 直写与 `ctx.emit` 同径，先落库后写网；seq 自 0 递增；
  `: ping` 保活注释不经 `send()`，天然不落库。事务①（runs 行插入 + 首事件）、
  事务②（事件行 + runs 状态更新：`run:start`→total；`run:done`→status/done/total/
  ended_ms，stopped 映射 `stopped`、ok=false 映射 `error`；`run:error`→status）。
  持久化异常不阻断 SSE（降级 + error 日志如实记录）。优雅停机时 `closeStore()`
  关库（WAL checkpoint）。
- **端点**：`GET/PUT /api/v1/workflows`（另注册 `PUT /api/v1/workflows/:id` 路径式
  upsert，路径 id 优先于 body.id）、`GET /api/v1/runs?limit=`（1–100，默认 20，
  非法值 400）、`GET /api/v1/runs/:id`（未知 id 404）。均为新端点，仅 v1 命名空间
  （无旧别名；既有 5 端点 `/api/*` 别名不变）。
- **Docker**：`Dockerfile` multi-stage（build：`node:22-bookworm-slim` + python3/
  make/g++ + `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`；runtime：同底镜像、非 root
  `USER node`、`VOLUME /app/data`、目录布局与仓库一致使 dist 的仓库根解析为 `/app`）；
  `.dockerignore`（含 `**/.env`）；`docker-compose.yml` 透传 ADR-0004 全部 12 个
  环境变量 + `agentflow-data` 卷。
- **验证**（2026-10-20 实测）：删除旧库全新启动建表无错；kefu 真实 E2E（DeepSeek，
  tokens=540）默认问题→假分支→`approval:required`→approve→`run:done`（done/total=7/8）；
  回放 30 事件与实时 SSE 逐条 deepEqual（含 `run:accepted` 首事件）；运行中 stop →
  `runs.status=stopped`；workflows PUT/GET 往返一致（body.id 与 `:id` 两形态）；
  **硬杀进程重启后 runs/workflows/事件全量存活**（WAL 崩溃一致性实测）；
  `npm run gate` 4 场景 diffPx=0、`npm test` 5 契约全过。本机无 Docker
  （`docker: command not found`），镜像构建为静态校验（结构断言 + compose YAML 解析 +
  env 清单比对），未实际 build。
