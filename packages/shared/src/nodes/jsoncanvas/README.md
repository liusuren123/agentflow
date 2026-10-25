<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# JSON 画布（`jsoncanvas`）

将上游 JSON 数据以结构化树呈现（终点节点）

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-data` | 数据 | any |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `expand` | 展开层级 | number | 2 | [0–6] step 1 | 已实现 |
| 2 | `fmt` | 格式化缩进 | toggle | true | — | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- sink 呈现节点：输入序列化 emit('output') + ctx.outputs 汇入（handlers.ts jsoncanvas）；字符串原样/空输入 0 项/非 JSON 原文降级，不伪造 JSON；expand/fmt 为前端呈现参数（服务端零参与，僵尸登记在案）；零出站零用户输入面。
