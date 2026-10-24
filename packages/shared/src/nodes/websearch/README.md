<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 网页搜索（`websearch`）

调用搜索引擎查询互联网信息。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-query` | 查询 | text |
| 1 | out | `out-results` | 结果 | list |

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `eng` | 搜索引擎 | combo | Bing | Bing / Google / 博查 / SearXNG | 已实现 |
| 2 | `max` | 结果数量 | number | 5 | [1–20] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| net | `{"mode":"guarded"}` | mode:guarded——出站必须走 guard.ts（SSRF 守卫） |

## 现状备注

- Bing/Google 未接真实 API——按回退链 博查→DuckDuckGo 执行并 warn；博查/SearXNG 严格路由，未配置/失败如实跳过、绝不静默换引擎（迭代 0005/BK-0007）。
