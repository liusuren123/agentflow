<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 通用智能体（`agent`）

goal 模式智能体：自主工具循环 + 持久会话，可点开进入流式会话面板。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-goal` | 目标 | text |
| 2 | in | `in-ctx` | 上下文 | any |
| 1 | out | `out-result` | 结果 | text |
| 2 | out | `out-session` | 会话引用 | object |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `model` | 模型 | combo | GLM-4.7 | GLM-4.7 / GLM-4.7-Air / GLM-4.6-Flash / DeepSeek-V4 / GPT-5 / Claude Sonnet 4.5 | 已实现 |
| 2 | `sys` | 系统提示词 | textarea | 你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。 | — | 已实现 |
| 3 | `maxSteps` | 最大步数 | number | 32 | [1–256] step 1 | 已实现 |
| 4 | `onError` | 失败策略 | combo | 跟随全局 | 跟随全局 / 跳过 / 重试 / 中止 | 已实现 |
| 5 | `onErrorRetries` | 重试次数 | number | 2 | [0–5] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| llm | `true` | 温度/token 上限由参数约束；密钥只进环境变量 |
| mcp | `{"toolSelection":"user"}` | 扩展预留（caps 复现条件：caps 含 mcp） |
| skills | `true` | 扩展预留（caps 复现条件：caps 含 skill 单数） |
| agent | `{"sessionMode":"goal"}` | goal 会话形态（sessionMode:goal，BK-0033/0034 承载） |

## 现状备注

- goal 模式智能体：maxSteps 步数预算工具循环（v1 无 token 硬顶）；每次执行绑定一个持久会话（out-session={sessionId}，goal 面板 BK-0034 消费）；模型未配置/异常如实失败不降级。
