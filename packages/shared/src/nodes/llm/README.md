<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# LLM 对话（`llm`）

调用大语言模型生成回复，可注入提示词与上下文。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-prompt` | 提示词 | text |
| 2 | in | `in-ctx` | 上下文 | any |
| 1 | out | `out-reply` | 回复 | text |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `model` | 模型 | combo | GLM-4.7 | GLM-4.7 / GLM-4.7-Air / GLM-4.6-Flash / DeepSeek-V4 / GPT-5 / Claude Sonnet 4.5 | 已实现 |
| 2 | `sys` | 系统提示词 | textarea | 你是智能客服助手，回答需准确、简洁、友好。 | — | 已实现 |
| 3 | `temp` | 温度 | number | 0.7 | [0–2] step 0.1 | 已实现 |
| 4 | `max` | 最大 Tokens | number | 2048 | [64–32768] step 64 | 已实现 |
| 5 | `onError` | 失败策略 | combo | 跟随全局 | 跟随全局 / 跳过 / 重试 / 中止 | 已实现 |
| 6 | `onErrorRetries` | 重试次数 | number | 2 | [0–5] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| llm | `true` | 温度/token 上限由参数约束；密钥只进环境变量 |
| mcp | `{"toolSelection":"user"}` | 扩展预留（caps 复现条件：caps 含 mcp） |
| skills | `true` | 扩展预留（caps 复现条件：caps 含 skill 单数） |

## 现状备注

- model options 运行期被 /api/health 返回的 provider.models 覆写（runtimeOverridable:true；「UI 显示值===实际存值」不变量现状未完整履行，NDP §6.3 实现缺陷单独立项）。
