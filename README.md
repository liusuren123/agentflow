# AgentFlow · 智能体工作流（React 前端 + AI SDK 7 后端 + 宪法门禁）

ComfyUI 像素级复刻的智能体工作流编辑器 + Vercel AI SDK 7 真实执行引擎。
**UI 受宪法保护（[`CONSTITUTION.md`](CONSTITUTION.md)）：与 2026-10 定稿设计 1:1，
由 CI 像素门禁（0 容差）强制执行；工程持续演进，视觉永不漂移。**

## 架构（npm workspaces monorepo）

```
apps/web/           前端：React 18 + Vite + TS（单文件产物，双击可用）
                    · React 仅承载静态骨架；画布/交互为命令式 legacy 模块（ADR-0002）
apps/server/        后端：Express + ai@7 + @ai-sdk/openai-compatible（SSE 执行引擎）
packages/shared/    单一事实源（TS）：16 节点注册表 + 15 种 SSE 事件契约
tools/pixel-gate/   宪法门禁执行器（Playwright 像素 diff + DOM 不变量）
tests/golden/ui/    golden 基线（2026-10 定稿，永不重录；变更需宪法第 3 条流程）
docs/adr/           架构决策记录 · AGENTS.md 为 AI 协作约定
```

## 使用方式

**真实智能体执行（推荐）**

```bash
npm install
npm start           # 构建 shared+web+server 并启动后端 → http://localhost:3000
```

模型配置自动探测 `DEEPSEEK_API_KEY` / `ZHIPU_API_KEY` / `OPENAI_API_KEY` / `MOONSHOT_API_KEY`
任一环境变量，或复制 `apps/server/.env.example` 为 `.env` 指定任意 OpenAI 兼容端点
（GLM / DeepSeek / OpenAI / Ollama / LM Studio…）。

**离线演示**：`npm run build:web` 后直接双击 `apps/web/dist/index.html`（单文件、零依赖，
无后端时自动回退内置模拟执行）。

**开发**：`npm run dev:server`（后端 :3000）+ `npm run dev:web`（Vite 热更新，/api 代理）。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run gate` | **宪法门禁**（改前端后必跑；需先 `npm run build`） |
| `npm test` | shared 契约测试（注册表/SSE 事件 schema/单一来源防回归） |
| `npm run build` | 构建 shared + web |
| `npm run build:server` | 构建后端 TS（tsc → `apps/server/dist`） |
| `npm start` | 构建（shared+web+server）+ 启动后端 |
| `npm run gate:update` | 重录 golden —— 仅限宪法第 3 条流程（ADR + 用户批准） |

## 执行引擎（apps/server，Vercel AI SDK 7）

| 节点 | 真实实现 |
| --- | --- |
| LLM 对话 | `streamText` 逐 token 流式 / `generateText` 多轮 MCP 工具循环；usage 回传 |
| 知识库检索 | 内置 3 语料库，CJK 二字组 + TF-IDF 余弦，分数归一化后过阈值，写 `confidence` |
| 网页搜索 | 博查（`BOCHA_API_KEY`）> DuckDuckGo > 如实降级（不伪造结果） |
| HTTP 请求 | 真实 fetch（SSRF 守卫：私网/回环默认拦截） |
| 代码执行 | Python / JS 独立子进程 + 5s 超时强杀 + JSON over stdio |
| MCP 工具 | filesystem（沙箱）/ fetch / web-search；未实现者如实告知模型 |
| 条件分支 | 自研安全表达式求值器（无 eval） |
| 循环 | 下游闭包子图逐轮真实执行（并发 3，注入 item/index） |
| 人工审批 | 真实挂起 → SSE 弹窗 → `/api/run/:id/approve` |

**接口**：`POST /api/run`（SSE：node:start/delta/done/error、cond、approval、run:progress/done，
`node:done` 含各输入端口实际到达值）· `POST /api/run/:id/stop` · `POST /api/run/:id/approve`
· `GET /api/health`（含模型列表，前端据此刷新下拉）。
全部端点在 `/api/v1/*` 有等价命名空间（ADR-0004，旧 `/api/*` 保留为别名）。

## 持久化与部署（ADR-0004 已落地 · ADR-0005 规划，落地后更新本节）

- **SQLite 持久化**（规划 · better-sqlite3，本地文件 `data/agentflow.db`，目录不入库）：
  `workflows` / `runs` / `run_events` 三表；引擎 emit 钩子与 SSE 同点落库，
  支持运行历史回放。新增 v1 端点：
  `GET|PUT /api/v1/workflows` · `GET /api/v1/runs?limit=` · `GET /api/v1/runs/:id`（含事件回放）。
  **localStorage 仍是前端当前事实源**；前端接入服务端属 UI 变更，需宪法第 3 条流程。
- **后端 TS 化与运行时强化**（已落地 2026-10-20）：tsc 构建 → `node dist/server.js`
  （`npm run build:server`）；zod 启动期环境校验（非法值 fail-fast）、
  pino 结构化日志（runId 贯穿、密钥脱敏）、SIGINT/SIGTERM 优雅停机（5s 宽限）。
- **Docker**（multi-stage，runtime `node:22-bookworm-slim` + data 卷）：

  ```bash
  docker build -t agentflow .
  docker run -p 3000:3000 -v agentflow-data:/app/data \
    -e AI_BASE_URL=... -e AI_API_KEY=... agentflow
  ```

  密钥只经环境变量传入（`**/.env` 已进 `.dockerignore`，绝不入镜像层）。

## 工程制度（AI 软件工程）

- **宪法**：UI 三层（视觉/DOM/交互）1:1 不变式；CI required check 像素门禁 +
  DOM 不变量；变更需 ADR + 用户批准 + 重录 golden。
- **单一事实源**：节点定义与事件契约只在 `packages/shared`，前后端各自复制即违例。
- **ADR**：重大决策留痕（`docs/adr/`）；**AGENTS.md**：AI 协作约定（命令/地图/陷阱）。
- **安全**：出站 URL 统一 guard；文件工具沙箱；代码子进程隔离；密钥只进环境变量。

## 布局还原依据（对应 ComfyUI_frontend 源码）

| 区域 | 出处 |
| --- | --- |
| 左侧竖排图标工具栏（48px 纯图标） | `SideToolbar.vue`、`registerCoreSidebarTabs.ts` |
| 侧栏内容面板 312px | `LiteGraphCanvasSplitterOverlay.vue`、`SIDEBAR_MIN_WIDTH` |
| 顶栏工作流标签页 | `WorkflowTabs.vue` |
| 画布顶中浮动运行卡 | `TopMenuSection.vue` → `ComfyActionbar`/`ComfyQueueButton` |
| 右下工具条 / 小地图 | `GraphCanvasMenu.vue` |
| 右侧属性面板 264px | `NodePropertiesPanel` |
| 底部日志面板 | `BottomPanel.vue` |
| 节点彩色标题栏 + 端口类型分色 | litegraph 渲染体系 |

视觉规格（画布 `#171718`、节点体 `#333`、端口 Ø11 内嵌等）逐像素采样自 ComfyUI 实机截图，
详见 git 历史中的原 README 版本；React 迁移以「对定稿 golden 0 像素差异」验收。
