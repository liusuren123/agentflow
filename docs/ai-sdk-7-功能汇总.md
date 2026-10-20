# Vercel AI SDK 7（`ai@7.0.143`）子集功能汇总

> 依据：本仓库 `server/node_modules/ai` 实装版本的 `package.json` 导出表与 `dist/index.d.ts` 类型声明逐项提取（共 357 个命名导出 + 100+ 函数/类声明），辅以官方文档与本项目实测。
> 生成日期：2026-10-20 · 对应提交：AgentFlow `server/` 正在使用其中 `streamText` / `generateText` / `tool`。

## 1. 包结构与子路径入口

| 入口 | 用途 |
| --- | --- |
| `ai`（主入口） | 全部公开 API（下文第 3 节） |
| `ai/internal` | 内部实现（无稳定性保证，勿依赖） |
| `ai/test` | 测试工具：`MockLanguageModelV3/V4`、`MockProviderV3/V4`、图像/语音/转写/重排/视频 Mock、`mockValues`、`simulateReadableStream`、`Experimental_EvaluationMockModelV4` |

v7 的**框架绑定不再由 `ai` 包提供**（v4 时代的 `ai/react`、`ai/svelte` 等子路径已移除），改用独立包：

| 生态包 | 说明 |
| --- | --- |
| `@ai-sdk/react` | React Hooks（`useChat`、`useCompletion`、`useObject` 等） |
| `@ai-sdk/svelte` / `@ai-sdk/vue` / `@ai-sdk/angular` | 其它框架绑定 |
| `@ai-sdk/provider` | Language Model 开放规范（自定义 Provider 实现） |
| `@ai-sdk/provider-utils` | Provider 工具（`asSchema`、`zodSchema`、`jsonSchema` 等） |
| `@ai-sdk/gateway` | Vercel AI Gateway（统一路由/计量/缓存） |
| `@ai-sdk/openai-compatible` | 任意 OpenAI 兼容端点（本仓库用它在本地接 DeepSeek/GLM 等） |
| `@ai-sdk/openai` / `anthropic` / `google` / `deepseek` / `mistral` … | 各官方 Provider |
| `@ai-sdk/workflow` | `WorkflowAgent`：持久化/可恢复的工作流执行 |
| `@ai-sdk/tui` | 终端 UI（agent 交互界面） |
| `@ai-sdk/otel` | OpenTelemetry 集成 |

## 2. 能力域总览

| 能力域 | 代表 API | 一句话 |
| --- | --- | --- |
| 文本生成 | `generateText` / `streamText` | 一次性与流式生成，统一的 provider 无关接口 |
| 结构化输出 | `generateObject` / `streamObject` + `Output` | JSON Schema / zod 约束的对象、数组、工具式输出 |
| 工具调用 | `tool` / `dynamicTool` / `toolSearch` | 类型安全工具、自动执行、审批（HMAC 签名） |
| 智能体 | `ToolLoopAgent` + agent 流族 | 工具循环智能体与 UI 消息流 |
| 嵌入/重排 | `embed` / `embedMany` / `rerank` / `cosineSimilarity` | 向量化与检索增强 |
| 多模态 | `generateImage` / `experimental_generateVideo` / `generateSpeech` / `transcribe` / `translate` / Realtime | 图像（含批量）、实验性视频、语音合成/转写/翻译、WebSocket 实时会话 |
| 聊天传输层 | `UIMessage` 体系 + `ChatTransport` 家族 | 前后端消息协议、SSE/WebSocket/直连传输 |
| Provider 体系 | `customProvider` / `wrapProvider` / `createProviderRegistry` / `gateway` | 模型注册、中间件、网关路由 |
| 可观测性 | `registerTelemetry` + 全生命周期回调 | 一次性注册、Node tracing channel、性能统计 |
| 批处理 | `startBatch` / `listBatches` / `cancelBatch` … | 异步批量任务（提交/查询/取消/结果） |
| 辅助 | `createIdGenerator` / `parsePartialJson` / `smoothStream` … | ID 生成、容错解析、流平滑等 |

## 3. 详细清单（按能力域）

### 3.1 文本生成（Text Generation）

- **`generateText`**：一次性生成。v7 新增：顶层 `reasoning` 选项（映射各原生推理档位）、`timeout`（总量/单步/首块/块间/单工具五级粒度）、`toolApproval`（工具审批，含 HMAC 签名验证 `InvalidToolApprovalSignatureError`）、`onStart/onEnd` 生命周期回调。
- **`streamText`**：流式生成。`textStream`（纯文本增量）/ `fullStream`（全事件：`start`、`text-delta`、`reasoning-start/delta/end`、`tool-call`、`tool-result`、`source`、`file`、`finish-step`、`error`、`raw`…）；`onChunk` / `onError` / `onFinish`（含 `totalUsage`、`response.messages`）；`experimental_transform: smoothStream()`（平滑流）；`consumeStream`。
- **步骤与循环**：`prepareStep`、`stopWhen` + `stepCountIs`（v5 起替代 maxSteps）、`hasToolCall`、每步回调 `onStepStart/Finish` 与 `StepResult`（含 `StepResultPerformance`、`OutputChunkTimingStats` 块间时序统计）。
- **消息模型**：`ModelMessage` 家族（`SystemModelMessage` / `UserModelMessage` / `AssistantModelMessage` / `ToolModelMessage`）与 `ContentPart`（text / reasoning / file / source / tool-call / tool-result / tool-error / approval…）；`convertToModelMessages`（UIMessage → ModelMessage）；`fingerprintTools` + `detectToolDrift`（工具漂移检测）。
- **文本流响应**：`createTextStreamResponse` / `pipeTextStreamToResponse` / `toTextStream`。
- **修复**：`RepairTextFunction` / `ToolCallRepairFunction`（流损坏/工具调用格式错乱时修复）。

### 3.2 结构化输出（Structured Output）

- **`generateObject` / `streamObject`**：按 JSON Schema（`jsonSchema`）、zod（`zodSchema`）或值推断生成对象/数组；`NoObjectGeneratedError`、`parsePartialJson`（部分 JSON 容错解析）、`InferPartialOutput`。
- **`Output` 工具集**（v5+）：`Output.text` / `Output.object` / `Output.array` / `Output.tool` —— 在 system 提示词中注入可被「翻页」续读的输出协议，适合长结构化输出；`InferCompleteOutput` 推断最终类型。
- **中间件**：`extractJsonMiddleware`、`addToolInputExamplesMiddleware`（自动示例增强）。

### 3.3 工具调用（Tool Calling）

- **`tool`**：定义工具（`inputSchema` 标准 schema、`description`、`execute`、`toToolResultContent`）；`dynamicTool`（运行时才确定 schema 的动态工具）；`ToolSet`、`ToolChoice`、`activeTools`/`filterActiveTools`、`toolSearch`（MCP 服务端工具搜索协议）。
- **执行语义**：带 `execute` 的工具结果会**自动**进入 `response.messages`（本项目实测：自行追加 tool 消息会因重复 `toolCallId` 触发 `ModelMessage` 校验失败）。
- **审批（v7 重点）**：`toolApproval` 配置（`GenericToolApprovalFunction` / `SingleToolApprovalFunction`）、`ToolApprovalRequest/Response`、`ToolApprovalConfiguration`（含 HMAC 签名，防篡改重放）、`lastAssistantMessageIsCompleteWithToolCalls` / `...WithApprovalResponses`。
- **输入精化**：`ToolInputRefinement`；错误族 `NoSuchToolError` / `InvalidToolInputError` / `ToolChoiceViolationError`。
- **外挂执行器（实验）**：`experimental_toolCaller` + `Experimental_ToolCallerTool`（Claude Code / Codex 等外部工具执行器）。

### 3.4 智能体（Agents）

- **`ToolLoopAgent`**（导出别名 `Experimental_Agent`）：工具循环智能体——`tools`、`prepareStep`、运行时上下文（`contextSchema` / `toolsContext`）、`toolApproval`、`stopWhen`；类型 `Agent` / `AgentCallParameters` / `AgentStreamParameters`、`ToolLoopAgentSettings`。
- **Agent UI 流**：`createAgentUIStream` / `createAgentUIStreamResponse` / `pipeAgentUIStreamToResponse`；`InferAgentUIMessage`。
- **聊天式调用**：`ChatInit` + `chat()`（`ChatState` / `ChatStatus` / `ChatOnToolCallCallback` / `ChatAddToolOutputFunction` / `ChatAddToolApproveResponseFunction`）。
- **持久化/编排**：`@ai-sdk/workflow` 包的 `WorkflowAgent`（可恢复执行）、`@ai-sdk/tui` 终端界面（主包外）。

### 3.5 嵌入与检索（Embeddings & Rerank）

- `embed` / `embedMany`（`Embedding` / `EmbeddingModel` / `EmbeddingModelUsage` / `TooManyEmbeddingValuesForCallError`）；`defaultEmbeddingSettingsMiddleware`。
- `rerank`（`RerankingModel`，搜索结果重排）。
- `cosineSimilarity`（余弦相似度，RAG 本地计算）。

### 3.6 多模态（Multimodal）

- **图像**：`generateImage`（`GeneratedFile` / `DefaultGeneratedFile`、`NoImageGeneratedError`）；批量 `ImageBatch*` 族；`experimental_generateVideo` / `experimental_startVideo` / `experimental_getVideoStatus`（实验性视频，fal/Google/Replicate 端）。
- **语音**：`generateSpeech`（`SpeechModel`、`GeneratedAudioFile`、`NoSpeechGeneratedError`）；`transcribe` / `streamTranscribe`（转写，`TranscriptionModel`）；`streamTranslate`（翻译，`experimental_transcribe`）；`resampleAudio` / `decodeRealtimeAudio` / `encodeRealtimeAudio`（音频工具）。
- **实时会话（实验）**：`AbstractRealtimeSession`、`RealtimeModel` / `RealtimeSession*` / `RealtimeFactory*`、`RealtimeClientEvent` / `RealtimeServerEvent`、`getRealtimeToolDefinitions`、`WebSocket` 会话配置（配合 `@ai-sdk/react` 的 `experimental_useRealtime`）。
- **文件上传（v7）**：`uploadFile` / `uploadSkill`（Provider 可移植的文件/技能上传，`UploadFileResult` / `UploadSkillResult`）；`createDownload` / `getTextFromDataUrl` / `convertFileListToFileUIParts`。

### 3.7 UI 消息与传输层（UIMessage & Transport）

- **消息协议**：`UIMessage` / `UIMessagePart` / `UIMessageChunk`（`data-`、`text-`、`reasoning-`、`tool-`、`source-`、`file-` 分片）、`DataUIPart` / `TextUIPart` / `ToolUIPart` / `ReasoningUIPart` / `FileUIPart`、`CustomContentUIPart`、`CreateUIMessage`、`InferUITools` / `InferUIDataParts`。
- **服务端流**：`createUIMessageStream` / `createUIMessageStreamResponse` / `pipeUIMessageStreamToResponse` / `readUIMessageStream` / `toUIMessageStream` / `toUIMessageChunk`；`UIMessageStreamWriter(WithOutcome)`、`onError` 重试（`StreamTextOnErrorRetryCallback`）。
- **传输抽象**：`ChatTransport` 家族——`DefaultChatTransport`、`DirectChatTransport`（进程内直连）、`TextStreamChatTransport`、`WebSocketChatTransport`（含断线 `Resume`/`Reconnect` 预挂钩）、`JsonToSseTransformStream`。
- **校验**：`validateUIMessages` / `safeValidateUIMessages`、`pruneMessages`；`isTextUIPart` / `isToolUIPart` 等判别函数族。

### 3.8 Provider 体系

- **注册与包装**：`customProvider`（命名子模型/分割器）、`wrapProvider`（中间件包装）、`createProviderRegistry`（`provider('langchain')` 字符串引用）；`NoSuchProviderError` / `NoSuchProviderReferenceError` / `NoSuchModelError`。
- **模型接口**：`LanguageModel` / `ImageModel` / `SpeechModel` / `TranscriptionModel` / `RerankingModel` / `EmbeddingModel`（spec v3/v4）+ `*ModelMiddleware`（`LanguageModelMiddleware`、`defaultInstructionsMiddleware`、`defaultSettingsMiddleware`、`extractReasoningMiddleware`…）。
- **网关**：`gateway` / `createGateway`（AI Gateway：`GatewayModelId`、异步作业 `GatewayAsyncJobMetadata`、可移植 provider 引用 `ProviderReference`）。
- **决策模型**：`decide` + `DecisionModel` / `Experimental_DecisionQuestion`（结构化决策问答）。

### 3.9 可观测性（Telemetry & Callbacks）

- **`registerTelemetry`**（v7 一次性注册）+ `TelemetryOptions` / `TelemetryTracingChannel*`；Node `diagnostics_channel`（`ai:telemetry`）；`InferTelemetryEvent`。
- **全链路回调**：`OnStartEvent` / `OnFinishEvent`、`OnLanguageModelCallStart/EndCallback`、`OnToolCallStart/FinishEvent`、`OnToolExecutionStart/EndCallback`、`OnStepStart/FinishEvent`；`Warning` / `CallWarning(Registry)` / `LogWarningsFunction`。

### 3.10 批处理（Batch API）

`startBatch` / `listBatches` / `getBatchStatus` / `getBatchResults` / `cancelBatch`；类型 `Batch` / `BatchRequest` / `BatchItemResult` / `BatchProvider` / `BatchReference` / `TextBatch*` / `ImageBatch*` 族；执行器 `SerialJobExecutor` / `RetryError`。

### 3.11 辅助与基础设施

- `createIdGenerator`（自定义 ID 策略）、`generateId`；
- `simulateReadableStream` / `simulateStreamingMiddleware`（离线演示/测试）；
- `isDeepEqualData`、`convertDataContentToBase64String`（DataContent 处理）；
- `streamLanguageModelCall`（底层模型流直通）；
- 错误基类族：`AISDKError` / `APICallError` / `InvalidPromptError` / `TypeValidationError` / `JSONParseError` / `UnsupportedFunctionalityError` / `LoadAPIKeyError` 等 30+；
- 超时体系：`TimeoutConfiguration` + `getTotalTimeoutMs` / `getStepTimeoutMs` / `getFirstChunkTimeoutMs` / `getChunkTimeoutMs` / `getToolTimeoutMs` 五级粒度读取。

## 4. 本项目（AgentFlow）实际使用的子集

| 使用点 | API |
| --- | --- |
| LLM 节点·流式路径 | `streamText`（`textStream` 逐 token 推送画布打字机）+ `onError` + `abortSignal` |
| LLM 节点·工具循环 | `generateText`（`messages` + `tools` + `response.messages` 续接，3 轮上限） |
| MCP 工具定义 | `tool`（zod `inputSchema` + `execute`） |
| Provider | `@ai-sdk/openai-compatible` 的 `createOpenAICompatible`（DeepSeek/GLM 等任意兼容端点） |

## 5. v7 实测注意事项（本项目踩坑记录）

1. **system 提示词必须是独立 `system` 参数**，写入 `messages[]` 会报 `Invalid prompt: System messages are not allowed...`。
2. **带 `execute` 的工具**：其结果消息已自动包含在 `res.response.messages` 中，手工再追加 tool 消息会因 `toolCallId` 重复触发 `ModelMessage[]` 校验失败。
3. **工具命名**：OpenAI 兼容端点要求 `^\w+$`，含 `-`/`.` 的名字需清洗。
4. `usage` 为 promise 风格（`await result.usage`），字段为 `totalTokens/outputTokens`。
5. `textStream` 有背压（按需生成），必须消费完流才会 resolve。

## 参考链接

- 官方文档：<https://ai-sdk.dev/docs>
- AI SDK 7 发布博客：<https://vercel.com/blog/ai-sdk-7>
- OpenAI 兼容 Provider：<https://ai-sdk.dev/providers/openai-compatible-providers>
- 本地类型声明（权威）：`server/node_modules/ai/dist/index.d.ts`
