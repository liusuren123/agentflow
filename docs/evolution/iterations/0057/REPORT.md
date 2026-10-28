# REPORT · 迭代 0057 · 验收报告

> **补录（2026-10-28 · 迭代 0061 重试轮代录）· 原件随 0057 工作树丢失（MERGE.md §1 留痕）**
> **VERIFY 期原始断言输出不可复原，以 evidence/ 日志与 MERGE.md §3 为准**。本件仅
> 汇聚在库的验收事实与判 FAIL 的在案依据，无杜撰。

## 判定：FAIL（修复循环耗尽）——依据 BACKLOG BK-0045 行「2026-10-28 迭代 0057 终态 failed」段（BACKLOG.md:66 在案原文）

## §1 通过项（在库证据）

| 项 | 证据 |
| --- | --- |
| build exit 0 | `evidence/build.log`（MERGE.md §3 R1；首轮 TS2307 / 次轮依赖未装两次失败均留档 build-first-run.log / build-second-run.log） |
| gate 20/20 场景 diffPx=0 | `evidence/gate.log`（MERGE.md §3 R2；s3 重录 + s19 新增） |
| npm test 30/30 | `evidence/test.log`（MERGE.md §3 R3；NODES 21 / baseline 逐字节 / D===R / README 回比） |
| smoke:server 157/0 | `evidence/smoke.log`（MERGE.md §3 R4；+PT01-PT06 终端组） |
| 截图四张 + manifest | `evidence/01-initial.png ~ 04-library.png + manifest.json` |

## §2 失败项（BUG 清单，在案原文转写）

- **BUG-0057-02（Major）**：run 含并行第二根（如游离 terminal 节点）时，terminal
  handler 对面板已订阅会话的 agent 注入回显不在面板 xterm 渲染；判别矩阵 C/D 形态
  2/2 复现（resid2.mjs），完整 E2E 6/6 失败，同形态 diag 偶过=时序敏感高概率；
  服务端三证无责（node:done「已注入命令·回显 21 字」+ 独立流订阅者 live 收到注入帧
  + 原生 curl SSE 完整收流至 run:done）；串行链（trigger→terminal /
  trigger→delay→terminal）实测完全正常；违反 AC3「同一面板可见其回显」与 AC6 M4
  点位的多根形态。
- **BUG-0057-01（Minor，已修）**：tests/smoke/ T 组断言 ID 与 0034 轮 termview 撞号
  ——修复轮 b442840 重编号 PT01-PT06（提交面亲核，b442840 提交说明在案）。

## §3 修复轮记录

b442840 对 BUG-0057-02 施以 openPtyStream 读循环防御性加固（整体 try/catch + 单帧
回调隔离 + {t:'error'} 如实呈现）；BUILD 期闭环矩阵 C/D×2 一度 4/4 绿——**未除根**：
VERIFY 判定 C/D 形态 2/2 复现、完整 E2E 6/6 失败（BK-0045 行在案），修复循环耗尽 →
终态 failed。防御性加固本身保留在库（server-sync.js:79-114 现行注释「BUG-0057-02
修复轮」字样）。

## §4 判别矩阵（原 §4.3 定义已丢失——重建版回链）

原 REPORT §4.3 矩阵定义随 0057 工作树丢失（MERGE.md §1 留痕；全仓 grep `resid2`
零命中）。**结构等价重建版** = 迭代 0061 SPEC §3（iterations/0061/SPEC.md：形态
A/B 串行对照 + C 游离 terminal 第二根 [1,3,2] + D 单 trigger 扇出 delay+terminal
双根 [1,2,3]，拓扑序自 node:start 序列机器断言），其可复现驱动载体为
`tests/e2e/pty-echo-matrix.mjs`（迭代 0061 新增）。

## §5 重试指针

重试收口轮 = 迭代 0061（PRD/SPEC/JOURNAL/REPORT 见 iterations/0061/）：C/D 各 ≥2
轮全绿闭环 + 完整 E2E 六点位 ×4 形态 + C ≥10 轮采样失败率 0 四重口径（SPEC §10.4）。
