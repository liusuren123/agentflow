<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 触发器（`trigger`）

工作流执行入口，支持手动 / 定时 / Webhook 触发。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | out | `out-start` | 开始 | any |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `mode` | 触发方式 | combo | 手动触发 | 手动触发 / 定时触发 / Webhook | **UI-only（implemented:false）** |
| 2 | `cron` | Cron 表达式 | text | 0 9 * * 1-5 | — | **UI-only（implemented:false）** |
| 3 | `path` | Webhook 路径 | text | /api/run | — | **UI-only（implemented:false）** |

## 能力与护栏

本节点无能力声明（handler 无任何 IO；capabilities 为空对象）。

## 现状备注

- mode/cron/path 三参数 UI-only：handler 零参签名、out 硬编码「手动触发」（handlers.ts trigger）；定时/Webhook 触发后端未接入。
