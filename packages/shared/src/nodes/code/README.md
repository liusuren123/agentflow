<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 代码执行（`code`）

运行自定义 Python / JavaScript 代码片段。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-input` | 输入 | any |
| 1 | out | `out-result` | 结果 | any |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `lang` | 语言 | combo | Python | Python / JavaScript | 已实现 |
| 2 | `code` | 代码 | textarea | # 处理输入后返回\nresult = input\nreturn result | — | 已实现 |
| 3 | `onError` | 失败策略 | combo | 跟随全局 | 跟随全局 / 跳过 / 重试 / 中止 | 已实现 |
| 4 | `onErrorRetries` | 重试次数 | number | 2 | [0–5] step 1 | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| exec | `{"mode":"sandboxed"}` | mode:sandboxed——必须子进程 + 超时强杀；文件操作限沙箱根 |
| mcp | `{"toolSelection":"user"}` | 扩展预留（caps 复现条件：caps 含 mcp） |

## 现状备注

- 子进程 + 超时强杀（runUserCode）；JS 默认样例错配兜底（BUG-0012）；sqlite/browser MCP 工具 stub 如实降级（tools.ts:5/:82，BK-0008 在案）。
