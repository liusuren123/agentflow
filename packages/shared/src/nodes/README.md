<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；重跑命令见下 -->

# 节点总索引（NDP v0.2）

20 种节点定义一节点一目录（`node.ts` 纯数据模块 + `README.md` 生成文档，NDP §3）。
生成器：仓库根执行 `npm run build:shared && node tools/gen-node-readmes.mjs`（幂等；**生成物勿手改**——人工文案持有于生成器 MANUAL_NOTES）。

| type | 目录 | 名称 | 一句话用途 |
| --- | --- | --- | --- |
| `trigger` | `nodes/trigger/` | 触发器 | 工作流执行入口，支持手动 / 定时 / Webhook 触发。 |
| `userinput` | `nodes/userinput/` | 用户输入 | 采集用户提供的输入变量。 |
| `llm` | `nodes/llm/` | LLM 对话 | 调用大语言模型生成回复，可注入提示词与上下文。 |
| `agent` | `nodes/agent/` | 通用智能体 | goal 模式智能体：自主工具循环 + 持久会话，可点开进入流式会话面板。 |
| `prompt` | `nodes/prompt/` | 提示词模板 | 使用 {{变量}} 组装提示词文本。 |
| `retrieval` | `nodes/retrieval/` | 知识库检索 | 从知识库中检索相关片段（RAG）。 |
| `websearch` | `nodes/websearch/` | 网页搜索 | 调用搜索引擎查询互联网信息。 |
| `http` | `nodes/http/` | HTTP 请求 | 调用外部 HTTP 接口获取或提交数据。 |
| `code` | `nodes/code/` | 代码执行 | 运行自定义 Python / JavaScript 代码片段。 |
| `notify` | `nodes/notify/` | 消息通知 | 通过邮件 / 短信 / IM 发送通知。 |
| `condition` | `nodes/condition/` | 条件分支 | 按条件表达式将流程分流为 真 / 假 两路。 |
| `loop` | `nodes/loop/` | 循环 | 遍历列表，逐项执行下游节点。 |
| `delay` | `nodes/delay/` | 延时等待 | 等待指定时间后继续执行。 |
| `merge` | `nodes/merge/` | 合并 | 汇聚多路输入为一路。 |
| `reply` | `nodes/reply/` | 直接回复 | 将内容直接输出给用户（终点节点）。 |
| `termview` | `nodes/termview/` | 终端只读流 | 将上游文本流以等宽终端样式只读呈现（终点节点） |
| `setvar` | `nodes/setvar/` | 变量赋值 | 将值写入工作流全局变量。 |
| `webshow` | `nodes/webshow/` | 网页展示 | 将上游网址以内嵌安全视图呈现（终点节点）。 |
| `jsoncanvas` | `nodes/jsoncanvas/` | JSON 画布 | 将上游 JSON 数据以结构化树呈现（终点节点） |
| `approval` | `nodes/approval/` | 人工审批 | 流程转人工审核，通过后继续执行。 |
