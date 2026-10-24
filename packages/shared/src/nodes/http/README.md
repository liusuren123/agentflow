<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# HTTP 请求（`http`）

调用外部 HTTP 接口获取或提交数据。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-body` | 请求体 | any |
| 1 | out | `out-response` | 响应 | object |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `m` | 请求方法 | combo | GET | GET / POST / PUT / DELETE | 已实现 |
| 2 | `url` | URL | text | https://api.example.com/v1/orders | — | 已实现 |
| 3 | `to` | 超时 (秒) | number | 30 | [1–120] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| net | `{"mode":"guarded"}` | mode:guarded——出站必须走 guard.ts（SSRF 守卫） |

## 现状备注

- 出站走 guardedFetch SSRF 守卫（handlers.ts http；guard.ts 拦私网/回环）。
