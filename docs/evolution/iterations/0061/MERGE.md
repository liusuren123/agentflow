# 迭代 0061 · MERGE — 收口合并记录（BK-0045 PTY 交互终端节点 UI，用户授权 A 案）

> 产物角色：协调者（心跳外·用户会话授权）· 2026-10-28 · 主干 main
> 输入：feat/0061-iter（留档提交 08461c3）· 迭代目录 docs/evolution/iterations/0061/
> 授权链：BK-0045 同项两连败熔断（0057 + 0061，WORKFLOW §5.4）→ 处置选项呈用户 →
> **用户批复「A」**（2026-10-28 会话指示：对保全分支重验——门禁 + V5 矩阵复跑 +
> V6 五点位重测——绿即合并关单 issue#5/#14）。本文件即 A 案执行记录。
> 性质：**账本更正式收口（0033/0040 同径双层记录）**——原终态 failed 系过程性
> （修复轮后提交阶段环节），产品实质与验收证据本轮全部复核兑现后改记 done。

## 1. 重验（工作树 feat/0061-iter @ 08461c3，全部本会话实跑，日志见 evidence/ 前缀 reverify）

| # | 命令 | 退出码 | 结果 | 日志 |
| --- | --- | --- | --- | --- |
| W1 | `npm run build` | **0** | shared tsc + server tsc + web vite ✓（dist 全新构建） | reverify-build.log |
| W2 | `npm test` | **0** | 契约测试 **30/30**（节点 21 种 / baseline 逐字节 / D===R / README 回比 / HANDLERS ⊇ NODES） | reverify-test.log |
| W3 | `npm run gate` | **0** | **20/20 场景 pass，diffPx 全 0**（s0~s19 含 s19-terminal-panel-online；零 gate:update、无 issue#12 抖动形态） | reverify-gate.log |
| W4 | `npm run smoke:server` | **0** | 后端 E2E **157 passed / 0 failed**（PT01-PT06 终端组零回退） | reverify-smoke.log |
| W5 | `npm run build:server` + `npm run test:pty-e2e`（全量） | **0** | **V5 矩阵 PASS 170 / FAIL 0**：PE0 前置 + A/B×1 + C/D×2 全链六点位 + PE1 轮级（拓扑序 C=[1,3,2] / D=[1,2,3]、状态行无异常、sid 绑定一致、会话纪律）+ PE3 C×10 高频采样失败率 0——与 0061 轮两次独立实跑持平 | reverify-pty-matrix.log |
| W6 | V6 手动五点位（临时 Playwright 脚本 tests/e2e/tmp-v6-recheck.mjs，**用后即删**） | **0** | **PASS 9 / FAIL 0**：①键入透传（真实键盘 echo v6hi 回显可见）/ ③a 关闭后会话存续 + ③b 重开回放恢复含 v6hi / ②停止终态=「会话已结束（stop）」且 +1s/+1.3s 双采样稳定不被「流已结束」覆盖（**BUG-0061-01 修复验证点**）+ 停止后会话出表 / ⑤a C 形态回显 marker 落面板 + 状态行无异常 + ⑤b node:done 注入计数 > 0（**BUG-0057-02 验收点**）/ ④a PTY_ENABLED=0 面板「未启用」空态 + ④b run 中 terminal out=「终端节点降级 · PTY 未启用」 | reverify-v6-recheck.log |

重验结论：六项全绿，0061 REPORT §3 三条件（V6② 终态口径 + V5 全量回归 + gate 零波及）全部兑现。

## 2. 合并结果

| 项 | 值 |
| --- | --- |
| 合并方式 | `git merge --no-ff feat/0061-iter` |
| 分叉状态 | merge-base `db3c586`；主干侧自基点前进 13 提交（0062 空转/0063 基线豁免/0064 BK-0019 链），分支侧 1 提交（08461c3 留档） |
| 合并提交 | **`b0b2a19`** |
| 冲突 | 2 文件——STATE.md / BACKLOG.md（**状态机文件，双侧均改**）：分支侧为 0061 迭代中过程态（VERIFY 中态 + BK-0045 行过程注），主干侧为 0062~0064 推进后的现行权威版 → **按契约取主干版（--ours）**，终态记账由本收口轮后续 docs 提交落盘；产品代码零冲突 |
| 载入主干 | 产品：app.js sessionEnded 守卫（BUG-0061-01 修复，+3/−2）+ package.json `test:pty-e2e` 脚本行 + tests/e2e/pty-echo-matrix.mjs（264 行判别矩阵驱动）；机制件：0057 补录四件（PRD/SPEC/JOURNAL/REPORT，头部「补录·不可复原」标注）+ 0061 四件（PRD/SPEC/JOURNAL/REPORT） |

## 3. 主干端到端复测（合并后 main @ b0b2a19 实跑，日志 evidence/）

| # | 命令 | 退出码 | 结果 | 日志 |
| --- | --- | --- | --- | --- |
| R1 | `npm run build` | **0** | shared + server + web ✓ | build.log |
| R2 | `npm run gate` | **0** | **20/20 场景 pass，diffPx 全 0**（首跑全绿；零 gate:update） | gate.log |
| R3 | `npm test` | **0** | **30/30** | test.log |
| R4 | `npm run smoke:server` | **0** | **168 passed / 0 failed**（= 0064 基线 168 零回退，含 KB01-KB11 与 PT01-PT06 两组并存） | smoke.log |
| — | `wt.mjs evidence` | 0 | 4 张确定性截图（1600×900，渲染节点 19）+ manifest.json | 01~04 PNG + manifest.json |

## 4. 遗留与回执

- **issue#5 / issue#14 关单回执**：BK-9005 链终轮达成（BK-0043 SPEC → BK-0044 后端 → BK-0045 终端 UI 三段全落地），本收口后由协调者持本记录执行 🤖 回执关单。
- **Mimosa 提交钩子提示（既有代码，非本轮 diff 引入，0057 MERGE.md §5 同源留痕）**：`apps/server/src/workbench/routes.ts:21` collectGitInfo 经 1 跳到达 command-injection（high）；`routes.ts:76` collectTree 是 path-traversal 入口（high）。属 0056 合入的 workbench 既有代码，按钩子要求明确告知用户，建议后续立项审查。
- BK-0045 行终态改记 done（双层记录：原 failed 系过程性，不改写原判说明）；metrics 追加 0061 更正行（原行保留）。
- 选题锁 `.zcode/locks/items/BK-0045` 释放归 CLOSE 记账。

## 5. 结论

用户授权 A 案执行完毕：保全分支重验六项全绿 → 合并零产品冲突 → 主干复测四绿 +
证据在库。BK-0045 **done**，BK-9005 链闭合（ADR-0014 安全世界 → PTY 后端运行时 →
终端节点 UI 全链落地）。
