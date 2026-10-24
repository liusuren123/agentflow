<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 知识库检索（`retrieval`）

从知识库中检索相关片段（RAG）。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-query` | 查询 | text |
| 1 | out | `out-hits` | 片段 | list |

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `kb` | 知识库 | combo | 产品手册 v2.3 | 产品手册 v2.3 / FAQ-售前 / 工单历史 2026 | 已实现 |
| 2 | `topk` | Top K | number | 3 | [1–20] step 1 | 已实现 |
| 3 | `th` | 相似度阈值 | number | 0.5 | [0–1] step 0.05 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- 本地 TF-IDF 检索、无出站网络；原始分 ×4 归一化后按相似度阈值过滤（handlers.ts retrieval）。
