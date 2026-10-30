<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 终端只读流（`termview`）

将上游文本流以等宽终端样式只读呈现（终点节点）

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-stream` | 数据流 | any |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `lines` | 缓冲行数 | number | 200 | [20–2000] step 20 | 已实现 |
| 2 | `autoscroll` | 自动滚动 | toggle | true | — | 已实现 |
| 3 | `onError` | 失败策略 | combo | 跟随全局 | 跟随全局 / 跳过 / 重试 / 中止 | 已实现 |
| 4 | `onErrorRetries` | 重试次数 | number | 2 | [0–5] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- 只读呈现 sink：emit('output') + ctx.outputs 汇入（handlers.ts termview）；lines/autoscroll 为前端呈现参数（服务端零参与，僵尸登记在案）；无用户输入面（PTY 切割，ADR-0015 §4.4）。
