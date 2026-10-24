<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 循环（`loop`）

遍历列表，逐项执行下游节点。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-list` | 列表 | list |
| 1 | out | `out-item` | 元素 | text |

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `max` | 最大迭代 | number | 10 | [1–100] step 1 | 已实现 |
| 2 | `conc` | 并发执行 | toggle | false | — | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- 并发批大小固定 3（CONC）；maxIter 引擎侧 clamp 1–100（handlers.ts loop）。
