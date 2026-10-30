<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 提示词模板（`prompt`）

使用 {{变量}} 组装提示词文本。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-var` | 变量 | any |
| 1 | out | `out-prompt` | 提示词 | text |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `tpl` | 模板内容 | textarea | 你是一名金牌客服。请结合以下资料回答用户问题：\n{{context}}\n\n用户问题：{{question}} | — | 已实现 |
| 2 | `onError` | 失败策略 | combo | 跟随全局 | 跟随全局 / 跳过 / 重试 / 中止 | 已实现 |
| 3 | `onErrorRetries` | 重试次数 | number | 2 | [0–5] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| data | `true` | 无 IO（纯数据变换） |

## 现状备注

- 纯模板渲染：render(tpl, {...vars, input})，无 IO（handlers.ts prompt）。
