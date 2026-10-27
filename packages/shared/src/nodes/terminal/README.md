<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->

# 交互终端（`terminal`）

双击打开终端面板：与 agent 共享同一 shell 会话（PTY）。

## 端口

| # | 方向 | id | 名称 | 类型 |
| --- | --- | --- | --- | --- |
| 1 | in | `in-ctx` | 上下文 | any |
| 1 | out | `out-session` | 会话引用 | object |

> any=透传通配（迁移保持现行类型，NDP §5.1）。

## 参数

| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `cmd` | 兜底命令 | text |  | — | 已实现 |
| 2 | `session` | 会话绑定 | text |  | — | 已实现 |

## 能力与护栏

| kind | 声明值 | 护栏（NDP §7.2） |
| --- | --- | --- |
| exec | `{"mode":"pty"}` | mode:sandboxed——必须子进程 + 超时强杀；文件操作限沙箱根 |

## 现状备注

- PTY 共享会话节点（BK-0045 / 迭代 0057 修宪轮，ADR-0014）：双击打开终端面板，用户与 agent 双写方共享同一 shell 会话（origin 贯穿审计）；PTY_ENABLED=0 如实 warn 降级不挂 run；exec.mode=pty 为 ADR-0014 §2.2 定级（初始 cwd 锚定 + 全量审计 + 默认关三层缓解，非 safePath 同等强度）。
