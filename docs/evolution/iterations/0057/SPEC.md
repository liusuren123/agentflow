# SPEC · 迭代 0057 · BK-0045 PTY 交互终端节点 UI 技术方案

> **补录（2026-10-28 · 迭代 0061 重试轮代录）· 原件随 0057 工作树丢失（MERGE.md §1 留痕）**
> 本件**依在库实现与 ADR-0014 反推**重建（MERGE.md §1 改动面清单 19 文件 + 主干现行
> 源码逐处锚点 + gate s19 基建）；**原 SPEC 章节原文与设计取舍过程不可复原**——
> 以下为「交付了什么」的事实性反推，非「当时怎么决定」的复原。

## 反推的受影响文件与实现要点（证据锚点全部在库）

| 面 | 实现（现行源码锚点） |
| --- | --- |
| NDP 定义 | `packages/shared/src/nodes/terminal/node.ts`（protocol 1 · type terminal · 类目 tools · in-ctx 入 / out-session 出 · params cmd/session 皆 text · capabilities.exec.mode='pty'；本文件本体为合并仲裁员等价重建件，头部补录注记在案——MERGE.md §2） |
| 契约联动 | `nodes.ts:33` import + `:131` 入列（21 目录）；`nodes.baseline.json` terminal 条目；7 个契约测试（MERGE.md §1） |
| 服务端 handler | `apps/server/src/handlers.ts:305-345` terminal handler：PTY_ENABLED=0 warn 降级不挂 run / session 绑定判活（失活→新建）/ 满员自检降级（内部通道不经 routes 429 闸门）/ strInput 优先 cmd 兜底、末字符非 \n 补行 / agentWrite（origin=agent 服务端权威填写 + signal=ctx.ac 透传） |
| 前端面板 | `apps/web/src/legacy/app.js:3200-3333`：TERM 模块级单例 + #term-panel 动态单例 + 双击主体开面板（agent 监听器之外第二个 nodesLayer dblclick）+ session 写回（画布侧单一事实源 D4）+ xterm 确定性参数组（cols 80/rows 24 与服务端 spawn 几何一致）+ warn/exit/end 只进状态行（D3）+ termStopSession |
| 数据层 | `apps/web/src/server-sync.js:70-114`：createPtySessionOnServer / writePtySession / stopPtySessionOnServer + openPtyStream（fetch + getReader 逐帧 JSON.parse → onFrame 回调；body 耗尽补发本地 {t:'end'}；端点私有帧零 shared 契约，ADR-0014 §3.4） |
| 样式 | `apps/web/src/app.css:706-718` tp- 面板族（静态规则，默认 display:none 零波及既有场景） |
| 冒烟 | `tests/smoke/smoke-server.mjs` PT01-PT06 终端组（+167；主实例禁用态 + 探针 A/B/C 会话契约 + 源码锁） |
| golden | `tools/pixel-gate/gate.mjs:488-527` PTY_ROUTES fixture + TERM_WF_SEED + termOpen/termReady/termInv；场景 19→20（:565）；`gen-node-readmes.mjs` 21 计数 |

## 反推的验收命令（V 口径）

`npm run build`（含 @xterm/xterm 安装前置）/ `npm run gate`（20 场景，s3 重录 + s19 新增）
/ `npm test`（30/30）/ `npm run smoke:server`（157/0，+PT01-PT06）/ 手动 E2E 六点位。

## 附：结局与反推边界

实现面全部并入主干且复测四绿（MERGE.md §3）；本轮遗留缺陷 BUG-0057-02（注入回显
并行多根形态）的根因判别与修复方案属迭代 0061 SPEC（iterations/0061/SPEC.md §5
根因假设面 P1-P4），不在本件反推范围。
