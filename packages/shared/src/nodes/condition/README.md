<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 条件分支（`condition`）

按条件表达式将流程分流为 真 / 假 两路。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-input` | 输入 | any |
| 1 | out | `out-true` | 真 | any |
| 2 | out | `out-false` | 假 | any |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `expr` | 条件表达式 | text | confidence > 0.7 | — | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- cond 事件唯一发射点：engine 按 n.type===condition 求值 p.expr（engine.ts:128）。
