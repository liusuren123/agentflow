<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 消息通知（`notify`）

通过邮件 / 短信 / IM 发送通知。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-content` | 内容 | any |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `ch` | 通知渠道 | combo | 邮件 | 邮件 / 短信 / 企业微信 / Webhook | 已实现 |
| 2 | `to` | 接收人 | text | support@team.com | — | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| net | `{"mode":"guarded"}` | mode:guarded——出站必须走 guard.ts（SSRF 守卫） |

## 现状备注

- 仅 Webhook 渠道实接（guardedFetch）；邮件/短信/企业微信未接入真实发送（handlers.ts notify）。
