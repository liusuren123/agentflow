# AGENTS.md — AI 协作者工作约定

> 进入本仓库工作的任何 AI 代理（或人类）请先读 `CONSTITUTION.md`（宪法），
> 再读本文件。宪法优先级最高。

## 仓库地图

```
index.html          前端 UI（宪法保护对象：视觉/DOM/交互三层 1:1，勿动渲染）
apps/server/        执行后端（Express + Vercel AI SDK 7，本轮 JS，Stage 3 TS 化）
apps/server/engine.js  工作流执行引擎（16 种节点 handler、LLM 流式/工具循环）
packages/shared/    单一事实源（TS）：节点注册表 + SSE 事件契约（前后端共享）
tools/pixel-gate/   宪法门禁执行器（Playwright 像素 diff + DOM 不变量）
tests/golden/ui/    golden 基线（CI 权威，重录需宪法第 3 条流程）
docs/adr/           架构决策记录
docs/ai-sdk-7-功能汇总.md  AI SDK 7 API 清单（本仓实装版本逐项提取）
```

## 常用命令（在仓库根执行）

| 命令 | 用途 |
| --- | --- |
| `npm run gate` | **宪法门禁**（改了任何前端相关代码后必须跑，贴结果） |
| `npm run gate:update` | 重录 golden —— 仅在 ADR + 用户批准后使用（宪法第 3 条） |
| `npm run build:shared` | 构建 shared 包（改 packages/shared 后） |
| `npm test` | shared 契约测试（注册表一致性 + SSE 事件 schema） |
| `npm run dev:server` | 启动后端 → http://localhost:3000 |

## 硬性约定

1. **UI 三层（视觉/DOM 结构/CSS）不许改**。重构一律机械移植：DOM/CSS 逐字保留，
   画布层保持命令式实现（见 ADR-0002）。对「是否影响渲染」存疑时按「影响」处理。
2. **节点类型、参数默认值、SSE 事件**的唯一来源是 `packages/shared`。
   前后端各自复制即违例（契约测试会抓 DEFS 漂移）。
3. 后端出站请求必须走 `apps/server/guard.js`；文件工具只在
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
