<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 用户输入（`userinput`）

采集用户提供的输入变量。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | out | `out-value` | 值 | text |

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `var` | 变量名 | text | question | — | 已实现 |
| 2 | `vtype` | 值类型 | combo | 文本 | 文本 / 数字 / 布尔 | **UI-only（implemented:false）** |
| 3 | `req` | 必填 | toggle | true | — | **UI-only（implemented:false）** |
| 4 | `defv` | 默认值 | text | 如何申请退货? | — | 已实现 |
| 5 | `onError` | 失败策略 | combo | 跟随全局 | 跟随全局 / 跳过 / 重试 / 中止 | 已实现 |
| 6 | `onErrorRetries` | 重试次数 | number | 2 | [0–5] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- vtype/req UI-only：handler 只读 var/defv（handlers.ts userinput）。
