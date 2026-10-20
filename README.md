# AgentFlow · 智能体工作流（UI 原型 + 真实执行后端）

参考 **ComfyUI 新前端（ComfyUI_frontend）源码布局**实现的智能体工作流编辑器。画布/交互/视觉为纯前端单文件实现；`server/` 目录提供基于 **Vercel AI SDK 7** 的真实执行后端——LLM 真实流式生成、条件真实求值、循环真实迭代、代码真实运行、人工审批真实挂起。（AI SDK 7 完整子集功能清单见 [`docs/ai-sdk-7-功能汇总.md`](docs/ai-sdk-7-功能汇总.md)）

> **像素级对齐**：视觉规格（配色/尺寸/形状）通过脚本对 ComfyUI 实机截图逐像素采样提取：
> 画布 `#171718`、顶栏 `#101018`(37px)、左栏 `#141414`(48px 纯图标)、节点体 `#333`(直角/偏移阴影/300px 宽/同色标题栏+白字+`#202020` 分隔线)、widget 行式样式+`#484848` 底线、端口为**内嵌节点体内**的实心圆（中心距边框 ≈10.5px、直径 11px，node.png/K采样器实采 +9.4~+10.5px）；未连接为类型色暗化（`#602020` 等实采值），已连接为类型色调白 40%（text 实测 `#64b5f6`），any 类型显示实际对端类型色；线画在节点下层、终点为圆点中心，可见部分在边框处被节点体截断、连线为类型亮色（`#0080e0`/`#f0d000`/`#b090d0`/`#f06060`/`#60b0f0`）、运行按钮 `#0b8ce9`、贝塞尔曲线低弧度平缓出入。并排对比迭代 3 轮，视觉相似度 9/10。
> 接入后端后 UI **零改动**（无 CSS 变更；浏览器 canvas 逐像素对比基线 = 0 差异）。

## 使用方式

**方式一 · 真实智能体执行（推荐）**

```bash
cd server
npm install          # ai@7 + @ai-sdk/openai-compatible + express + zod
npm start            # → http://localhost:3000
```

模型配置自动探测环境变量（`DEEPSEEK_API_KEY` / `ZHIPU_API_KEY` / `OPENAI_API_KEY` / `MOONSHOT_API_KEY` 任一即可），或复制 `server/.env.example` 为 `.env` 指定任意 OpenAI 兼容端点（GLM / DeepSeek / OpenAI / Ollama / LM Studio…）。打开 http://localhost:3000 点击 **▶ 运行**：节点按真实执行进度点亮、LLM 逐 token 打字机输出、条件按真实求值分流、人工审批弹窗真实挂起等待你在界面上通过/拒绝。

**方式二 · 离线演示**

双击打开 `index.html` 即可（单文件、零依赖、离线可用）。未检测到后端时自动回退内置模拟执行动画，首次打开自动加载模板「智能客服助手」。

也可本地起服务访问：`python -m http.server 8734` → http://localhost:8734

## 真实执行引擎（server/，Vercel AI SDK 7）

| 节点 | 真实实现 |
| --- | --- |
| LLM 对话 | `streamText` 逐 token 流式（无工具时）/ `generateText` 多轮工具循环（勾选 MCP 工具时，最多 3 轮）；usage 统计回传日志 |
| 知识库检索 | 内置 3 个语料库，CJK 二字组 + TF-IDF 余弦相似度真实检索，分数 ×4 归一化后过节点阈值，top 分写入 `confidence` 变量 |
| 网页搜索 | `BOCHA_API_KEY`（博查）优先，缺省尝试 DuckDuckGo HTML；均不可用时如实降级跳过，不伪造结果 |
| HTTP 请求 | 真实 fetch（方法/请求体/超时），状态码·耗时·内容类型回显 |
| 代码执行 | Python(`python -I -c`) / JavaScript(`node -e`) 独立子进程 + 5s 超时强杀 + JSON over stdio；stdout 进日志 |
| MCP 工具 | filesystem（沙箱目录内读写，路径穿越防护）/ fetch（真实抓取）/ web-search；sqlite、browser 未实现时如实告知模型 |
| 条件分支 | 自研安全表达式求值器（无 eval：词法+Pratt 语法+求值，支持比较/逻辑/算术/len/str/num/contains） |
| 循环 | 下游闭包子图按元素逐轮真实执行（支持并发 3），迭代内 `item`/`index` 变量注入 |
| 人工审批 | 真实挂起（SSE `approval:required` → 前端弹窗 → `/api/run/:id/approve`）；自动通过/拒绝策略立即生效 |
| 消息通知 | Webhook 渠道为真实 POST；邮件/短信渠道如实标注「未接入，已记录」 |
| 其余 | 触发器/用户输入/提示词模板（`{{变量}}` 渲染）/延时/合并/变量赋值/直接回复 均按语义真实执行 |

**接口**：`POST /api/run`（SSE 事件流：node:start/delta/done/error、cond、approval、run:progress/done）· `POST /api/run/:id/stop`（AbortController 中止）· `POST /api/run/:id/approve` · `GET /api/health` · `GET /api/models`（前端据此刷新 LLM 模型下拉）。

**安全**：出站 URL 一律经 `guard.js` SSRF 守卫（私网/回环/链路本地默认拦截，`ALLOW_PRIVATE_NET=1` 显式放行）；文件工具限制在 `server/sandbox/`；代码节点子进程隔离 + 超时；前端零密钥（API Key 只在服务端）。

## 布局还原依据（对应 ComfyUI_frontend 源码）

| 本原型区域 | ComfyUI 源码出处 | 说明 |
| --- | --- | --- |
| 左侧竖排图标工具栏（菜单/历史/节点/工作流/模板 + 帮助/日志/设置） | `src/components/sidebar/SideToolbar.vue`、`registerCoreSidebarTabs.ts` | 图标+微型文字标签竖排，选中高亮 |
| 工具栏宽度 56px | `src/constants/splitterConstants.ts` `SIDE_TOOLBAR_WIDTH = 56` | |
| 侧栏内容面板 312px（节点库搜索/分类树、工作流列表、模板卡、任务历史、设置） | `LiteGraphCanvasSplitterOverlay.vue`、`NodeLibrarySidebarTabV2.vue`，`SIDEBAR_MIN_WIDTH = 312` | 点同一图标收起 |
| 顶栏工作流标签页（多标签 + ＋新建 + 关闭 + 双击重命名） | `src/components/topbar/WorkflowTabs.vue` | 中键关闭标签 |
| 画布顶部居中浮动运行卡（▶ 运行 / 进度 / 撤销重做） | `TopMenuSection.vue` → `ComfyActionbar`/`ComfyQueueButton` | |
| 画布右下工具条（平移/框选模式、适应视图、缩放%） | `src/components/graph/GraphCanvasMenu.vue` | 右下角锚定 |
| 右侧属性面板 264px | `NodePropertiesPanel`，`PROPERTIES_PANEL_MIN_WIDTH = 240` | 选中节点/连线后编辑参数 |
| 底部面板（执行日志，可从工具栏开关） | `src/components/bottomPanel/BottomPanel.vue` | |
| 节点彩色标题栏 + 端口类型分色 | litegraph 渲染体系 | 分类色标题栏、类型色连线 |

> 注：仓库 `Comfy-Org/ComfyUI_frontend`（main 分支）源码已下载至本地阅读（`.comfyui_ref/`，仅作参考，不属于本原型）。

## 功能清单

| 类别 | 能力 |
| --- | --- |
| 画布 | 点阵网格、滚轮缩放、拖拽平移、Ctrl 框选 / 框选模式、适应视图、小地图、坐标信息栏 |
| 节点 | 16 种智能体节点（输入/LLM/知识/工具/逻辑/输出/人工审批），节点内直接编辑参数、可折叠、双击标题重命名 |
| **能力配置** | 节点属性面板支持 **MCP 服务/工具选择**（5 个模拟 MCP 服务、可展开逐工具勾选）与 **Skill 选择**；节点声明能力（LLM=mcp+skill、代码执行=mcp）；画布节点显示能力徽章 chips，模拟执行日志输出能力统计 |
| 连线 | 端口拖出贝塞尔曲线（生长动画）、5 种端口类型分色与兼容高亮、端口/连线悬停提示、悬停删除、**拖到空白释放 → 弹出搜索并自动连线** |
| **选中工具条** | 选中节点后上方悬浮工具条（仿 SelectionToolbox.vue）：删除 / 节点信息 / 旁路跳过（节点变暗、执行时跳过）/ 重置状态 / 仅执行此节点 / 更多菜单；拖拽与缩放平移实时跟随，顶部空间不足自动翻到下方 |
| 编辑 | 撤销/重做、复制/粘贴、双击画布搜索添加、右键菜单（含重命名）、选中节点时高亮其连线、数字参数拖动调节（ComfyUI widget 行为）、网格吸附（设置可开关） |
| 多工作流 | 顶栏标签页切换/新建/关闭/重命名，模板在新标签页打开 |
| 节点库 | 「全部 / ★ 收藏」双 Tab、搜索、分类树、卡片星标收藏（本地持久化） |
| 执行模拟 | 离线模式：拓扑排序逐节点点亮、连线流动、LLM 打字机、条件分支、浮动卡进度条、运行历史、可停止、三档速度；在线模式：同一套视觉语言由后端真实事件驱动（见上节） |
| 属性面板 | 选中节点显示**端口/连接摘要**（端口名·类型·连接的对端节点.端口）；真实运行后显示**运行数据**（各输入端口的实际到达值与输出值，随事件实时刷新）；提示词/回复节点显示**可用变量** chips（来自最近真实运行的变量表，未运行时静态扫描画布；点击在光标处插入 `{{变量}}`） |
| 微交互 | 侧栏/底部面板开合过渡动画、节点添加弹入/删除淡出动画、连线绘制生长动画、Toast 提示 |
| 持久化 | 自动保存至 localStorage、JSON 导入导出 |

## 技术说明

- 前端：原生 HTML/CSS/JS 单文件实现，SVG 连线 + DOM 节点 + Canvas 小地图，无外部依赖。
- 后端（`server/`）：Node ≥ 20 · Express 5 · Vercel AI SDK 7（`ai@7`）· `@ai-sdk/openai-compatible` · zod。前后端同源托管，`index.html` 保持单文件双击可用。
