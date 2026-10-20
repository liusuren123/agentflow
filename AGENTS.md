# AGENTS.md — AI 协作者工作约定

> 进入本仓库工作的任何 AI 代理（或人类）请先读 `CONSTITUTION.md`（宪法），
> 再读本文件。宪法优先级最高。

## 仓库地图

```
apps/web/           前端（React 18 + Vite + TS，宪法保护渲染结果 1:1）
  src/skeleton.html  静态骨架原文（经 dangerouslySetInnerHTML 注入；JSX 化为待办 CP-C）
  src/legacy/app.js  画布/交互命令式模块（自原单文件逐字提取 + bootLegacyApp 包装）
  src/app.css        CSS 原文（逐字，勿改）
apps/server/        执行后端（TypeScript · Express · Vercel AI SDK 7，ADR-0004 已落地）
apps/server/src/    TS 模块群：server（HTTP/SSE/优雅停机）· engine（拓扑执行）
                     handlers/llm/code（16 种节点 handler）· providers/config（模型接入+zod 校验）
                     logger（pino）· guard（SSRF）· tools（MCP 沙箱工具）· kb/expr/search
                     · store（SQLite 持久化，ADR-0005 已落地；`/api/v1/*` 正式命名空间
                     与 `/api/*` 别名并存；workflows/runs 新端点仅 v1）
packages/shared/    单一事实源（TS）：节点注册表 + SSE 事件契约（前后端共享）
tools/pixel-gate/   宪法门禁执行器（Playwright 像素 diff + DOM 不变量）
tests/golden/ui/    golden 基线（2026-10 定稿，永不重录）
docs/adr/           架构决策记录
docs/ai-sdk-7-功能汇总.md  AI SDK 7 API 清单（本仓实装版本逐项提取）
```

> 原单文件 `index.html` 与提取工具 `tools/extract-web.mjs` 已退役（git 历史可溯）；
> golden 基线即该时代定稿，是 React 产物的永久对照。

## 常用命令（在仓库根执行）

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 构建 shared + web（gate/serve 的前置） |
| `npm run gate` | **宪法门禁**（校验 apps/web/dist 对定稿 golden；先 build） |
| `npm run gate:update` | 重录 golden —— 仅限宪法第 3 条流程（ADR + 用户批准） |
| `npm test` | shared 契约测试 |
| `npm start` | 构建 + 启动后端 → http://localhost:3000 |
| `npm run dev:web` | Vite 开发服（热更新，/api 代理 :3000，需另跑 dev:server） |
| `npm run dev:server` | 仅启动后端（自动先构建 shared + server） |
| `npm run build:server` | 构建后端 TS → `apps/server/dist`（tsc，ADR-0004） |

## 硬性约定

1. **UI 三层（视觉/DOM 结构/CSS）不许改**。重构一律机械移植：DOM/CSS 逐字保留，
   画布层保持命令式实现（见 ADR-0002）。对「是否影响渲染」存疑时按「影响」处理。
2. **节点类型、参数默认值、SSE 事件**的唯一来源是 `packages/shared`。
   前后端各自复制即违例（契约测试会抓 DEFS 漂移）。
3. 后端出站请求必须走 `apps/server/src/guard.ts`；文件工具只在
   `apps/server/sandbox/` 内；代码节点必须子进程 + 超时。
4. 文件规模上限：新增源文件 ≤ 400 行，超出先拆分再继续。
5. 提交信息用 Conventional Commits（中文描述可）；一个提交只做一件事。
6. 每个阶段/检查点以 `npm run gate` 全绿为完成标准，证据贴进 PR/提交说明。

## 工作流（改代码的标准动作序列）

1. 改动前：`npm run gate` 确认基线绿（避免把存量差异算到自己头上）。
2. 改动（前端相关时每完成一步跑一次 gate；后端改动跑 `npm test` + 手动 E2E）。
3. 提交：`git add` 明确文件 → conventional commit（Mimosa 钩子会做提交前安全扫描，
   被拦截时按其建议修复后重试，禁止绕过）。
4. 推送：CI 的 `ui-constitution` 是 required check，红了先修再推。

## 已知陷阱（实踩记录）

- AI SDK 7：system 提示词走独立参数；带 execute 的工具结果已在
  `res.response.messages` 里，勿重复追加；工具名 `^\w+$`。
- 画布端口缓存（portCache）在节点高度/变换变化后必须 `measurePorts()+updateEdgesOf()`。
- `server/.env` 不入库（`.env.example` 是模板）；DeepSeek/GLM 密钥只进环境变量。
- Playwright 浏览器下载被墙时：`PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright`。
- golden 基线以 CI（windows-latest）为权威；本机 Windows 差异仅参考。
- `data/`（SQLite `agentflow.db`，ADR-0005 已落地）不入库；better-sqlite3 为原生模块，
  Node 大版本升级后需重装编译（本仓 allowScripts 需先 `npm install-scripts approve
  better-sqlite3` 再 `npm rebuild better-sqlite3`）。
