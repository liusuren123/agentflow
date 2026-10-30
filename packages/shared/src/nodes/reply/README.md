<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 直接回复（`reply`）

将内容直接输出给用户（终点节点）。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-content` | 内容 | any |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `tpl` | 输出模板 | textarea | {{content}} | — | 已实现 |
| 2 | `onError` | 失败策略 | combo | 跟随全局 | 跟随全局 / 跳过 / 重试 / 中止 | 已实现 |
| 3 | `onErrorRetries` | 重试次数 | number | 2 | [0–5] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- 终点节点：emit('output') + ctx.outputs 汇入运行产物（handlers.ts reply）。
