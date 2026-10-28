# REPORT · 迭代 0061 · BK-0045 重试收口轮验收报告

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-28 10:42 · 工作树 feat/0061-iter
> 输入：iterations/0061/PRD.md 验收标准（REQ-0061-01~06）+ SPEC.md §8 验收口径
> （V1-V7）。全部结论基于本轮会话在工作树内的实测与实读，逐项附证据；
> 未亲跑的检查如实标注采信来源，不以转抄冒充实测。

## 判定：**FAIL（V6② 一点红）→ 转 BUG 清单进修复轮 1**（repair_round 上限 2 内）

- **核心目标（BUG-0057-02 注入回显并行多根形态收口）达成**：V5 两轮独立全量
  E2E 全绿（PASS 170 / FAIL 0 ×2）+ PE3 C 形态两轮各 ×10 采样失败率 0，
  C/D 各 ≥2 轮独立全绿兑现于两次独立实跑（§1 V5）。
- **判红点与核心目标无关**：V6 手动五点位之②「会话停止」终态呈现不符 SPEC
  字面——**BUG-0061-01（Minor，存量缺陷，本轮零产品改动的在库形态）**，
  证据链见 §2；其余四点位（①③④⑤）与 V4/V5/V7 全绿。
- 熔断状态：本轮 VERIFY FAIL ≠ 迭代终态 failed（WORKFLOW §4「BUILD ⇄ VERIFY
  修复 ≤2 轮」过程态）；修复面完全落在 SPEC §6 受影响文件清单内
  （`app.js` TERM 段一行级），无影响面扩大、无静态渲染接触，熔断风险低。

## §1 SPEC §8 验收口径逐项结果

| # | 口径 | 结果 | 证据 |
| --- | --- | --- | --- |
| V1 | `npm run build` exit 0 | ✅（采信） | **本轮 VERIFY 未复跑**（派发指令明示 build/gate/test 已由工作流脚本在工作树内运行且通过，勿重复全套；JOURNAL §4 同口径记录归属）。采信来源如实标注 |
| V2 | `npm run gate` 20 场景 diffPx=0、零 gate:update | ✅（采信） | 同上（脚本已跑）。本轮产品改动面仅 `package.json` +1 行脚本 + 新增 `tests/e2e/pty-echo-matrix.mjs`（git diff main --stat 亲核：3 文件 +9/−8，`apps/web`/**`apps/server`**`/packages/shared`/CSS/DOM 零改动），无渲染路径输入，gate 零波及有路径可循 |
| V3 | `npm test` 30/30 | ✅（采信） | 同 V1（脚本已跑）；shared 零改动（git diff 亲核）与 30/30 零回退自洽 |
| V4 | `npm run smoke:server` **157/0** | ✅ **本轮实测** | 命令 `npm run smoke:server`（工作树内），尾部输出 `==== smoke:server：157 passed / 0 failed ====`（含 C01-C04 清理断言全过）——PT01-PT06 终端组零回退 |
| V5 | `npm run build:server && npm run test:pty-e2e`：PE0-PE2 全绿 + PE3 C×10 失败率 0 + C/D 各 ≥2 轮独立全绿 | ✅ **本轮实测 ×2** | 首跑 `== 结果 PASS 170 / FAIL 0 ==`（尾部 C-s1~s10 十轮全 GREEN + `PASS PE3-summary`）；二跑完整日志 `/tmp/pe2nd.log`：`EXIT=0`、`PASS 170 / FAIL 0`，`PE1-C-r1` `PE1-C-r2` `PE1-D-r1` `PE1-D-r2` 四个轮级断言 + topo/status/sid/clean 逐项 PASS（topo C=[1,3,2]、D=[1,2,3] 与 SPEC §3 预期一致）。**两次独立全量 = C/D 各 4 组独立全绿轮 + PE3 采样 ×2 组**。六点位 c1-c6 ×16 轮 ×2 次全过 |
| V6 | 手动 E2E 五点位（浏览器） | ❌ **4/5** | `node tmp-v6-manual.mjs`（临时脚本，Playwright 真实浏览器 × 真实后端，跑毕已删）：`PASS V6-A1`①键入透传（真实键盘 `echo v6hi` 回显可见）/ `PASS V6-A3`③关闭重开回放恢复（活动会话回放含 v6hi）/ **`FAIL V6-A2`②会话停止终态=「流已结束」**（BUG-0061-01，§2）/ `PASS V6-A2b`（停止后重开落新建分支=设计行为 app.js:3283-3284 绑定解析 404 路径）/ `PASS V6-A5`⑤多根 C 形态手工复刻回显可见（marker=v6cform1）/ `PASS V6-B4a`④降级态面板「未启用」空态 / `PASS V6-B4b`④run 中 terminal 节点 warn 降级（out=「终端节点降级 · PTY 未启用」）。顺序说明：③在②前执行——SPEC §0.1 已裁定「回放恢复」语义属活动会话（环形缓冲回放），会话停止后重开=绑定失活落新建分支，故 ③ 先于 ② 验证方能覆盖「回放恢复」点位本义；②停止语义另以 A2b 补充覆盖 |
| V7 | 0057 机制件补录四件落盘 + 头部标注合规 | ✅ **本轮实测** | `ls` 亲核 iterations/0057/ 现有 PRD/SPEC/JOURNAL/REPORT + MERGE.md + evidence/；四件头部均含「**补录（2026-10-28 · 迭代 0061 重试轮代录）· 原件随 0057 工作树丢失（MERGE.md §1 留痕）**」字样（逐件亲读）；不可复原项如实标注（PRD 选题存证 / SPEC 设计取舍 / JOURNAL 逐日记录 / REPORT 原始断言输出各标「不可复原」）。**防杜撰抽查**：补录 REPORT §2 转写与 BACKLOG.md:66 原文逐字比对——「已注入命令·回显 21 字」「三证无责」「BUG-0057-02（Major）」「BUG-0057-01（Minor）」「2/2 复现」「6/6 失败」全部命中；补录 JOURNAL §1 引用的 b442840 提交说明与 `git log --format=%s -1 b442840` 输出逐字一致 |

### PRD Given/When/Then 逐条对照

- **REQ-0061-01（BUG-0057-02 修复）**：Given/When/Then 全链在 V5 两轮全量
  （PE2 c3/c4 + PE1 status/sid）与 V6⑤（手工复刻）双口径下达成——注入回显
  marker 落面板 xterm、状态行无 error/end 异常、三证口径不变（V4 157/0 含
  PT 组会话契约、PE1-sid 逐轮断言 `node:done #sid8 == 面板绑定 sid`）。
  修复形态 = 诚实路径（产品代码零改动 + 驱动基建重建），JOURNAL §2-§3
  证据链完整（基线 C/D ×10 失败率 0 + probe 三通道 P1/P3 阴性、P4 排除、
  三证维持），PRD 风险 2「验收基建达标 + 缺陷未复现」口径兑现，合规。
- **REQ-0061-02（判别矩阵闭环）**：A/B 同轮回归绿（PE1-A-r1/B-r1 PASS ×2
  次实跑）；C/D 各 ≥2 轮全绿（四次轮组 PASS ×2 次实跑）；拓扑序差异机器
  断言（C=[1,3,2]、D=[1,2,3]）显式化兑现；时序敏感处置硬性条款兑现
  （PE3 ×2 组各 10 轮失败率 0，数据留 JOURNAL + 本报告 §1 V5）。
- **REQ-0061-03（完整 E2E 六点位）**：PE2 c1-c6 ×16 轮 ×2 次实跑全绿
  （①create 写回 ②订阅确立 ③注入计数 ④回显 marker ⑤run:done ⑥重开回放）。
- **REQ-0061-04（回归面）**：V1-V4 如上；交互回归抽查 4/5 绿（V6①③④⑤），
  ②红 = BUG-0061-01（§2）。
- **REQ-0061-05（0057 机制件补录）**：V7 ✅。
- **REQ-0061-06（改动面纪律）**：git diff main --stat 亲核——产品提交面 =
  `package.json`（+1 行 `test:pty-e2e`，:26 亲核）+ `tests/e2e/pty-echo-matrix.mjs`
  （264 行 ≤400 硬性，`node --check` 过）；`apps/server/**`、`packages/shared/**`、
  CSS/DOM 静态面、新依赖/env/端点 **零改动零新增**；0057 补录四件为机制件
  （不入 productFiles，与 SPEC §6 一致）。app.js/server-sync.js 预期主改未发生
  = SPEC §5.2 第 3 步诚实路径的合法结果（§5.3 P2 行明文「产品代码零改动」）。

## §2 BUG 清单（唯一判红点）

### BUG-0061-01 · [Minor] 会话停止后面板状态行终态为「流已结束」，exit 帧的「会话已结束（reason）」文本被本地合成 end 帧覆盖

- **复现步骤**（win32 / Node 24.21 / PTY_ENABLED=1 conpty / 在线模式，
  Playwright 真实浏览器；临时脚本两跑一致 + 专项诊断一跑）：
  1. 预置 trigger→terminal 工作流，双击 terminal 节点开面板，等订阅确立；
  2. 点击 `#term-panel [data-tp="stop"]`（POST /api/v1/pty/sessions/:id/stop → 200）；
  3. 采样 `.tp-status` 终态。
- **预期**（SPEC V6② 字面 + app.js:3267 exit 分支设计意图 + ADR-0014 六
  reason 收尾语义）：状态行呈现「会话已结束（stop）」并稳定保持。
- **实际**：终态「流已结束」（诊断采样 `+212ms` 即达终态，「会话已结束」
  文本仅可能闪现 <100ms）。
- **证据**（专项诊断 `tmp-v6-diag.mjs` 输出，跑毕已删）：
  - 帧时间线（独立订阅者通道）：`exit reason=stop @936ms` 帧确实先到达——
    服务端广播无缺陷；
  - 状态行时间线：`+1ms "连接会话…"` → `+212ms "流已结束"`（终态）；
  - `GET /api/v1/pty/sessions` → `{"sessions":[]}`（会话确已停止，功能正确）。
- **机制定位**（初步，供修复轮）：`apps/web/src/legacy/app.js:3267-3268`——
  onFrame 的 `exit` 分支（写「会话已结束（reason）」）与 `end` 分支（写
  「流已结束」）同写状态行；服务端 closePtySession 广播 exit 后即收束连接
  （session.ts close 出口「广播 exit 帧并收束 subscribers」），客户端读循环
  done → `server-sync.js:107` 无条件补发本地合成 `{t:'end'}` → 后到覆盖先到。
  **后果**：exit 分支的六 reason 终态文本（stop/idle/max-duration/exit/shutdown，
  ADR-0014 §2 六迁移收尾出口的呈现面）在稳定态结构性不可达，用户无法区分
  「自己停止」与「流中断/自然结束」。
- **严重级别理由**：功能语义全部正确（停止生效、会话出表、重开新建分支
  正确、终端内容零损失），仅状态行终态文本信息弱化 → Minor，不 Block
  本轮核心收口结论。
- **存量声明**：本轮产品代码零改动（git diff 亲核），缺陷为 0057 在库形态；
  0057 期手动点位未验证过（其 E2E 6/6 失败），故属本轮验收**新暴露**的
  既有缺陷，非本轮引入。
- **修复建议**（交 code-developer，最小面）：候选 a（推荐）——`app.js`
  TERM 段 onFrame `end` 分支加判据：会话终态文本已呈现（状态行含「已结束」）
  时不覆盖，一行级；候选 b——`server-sync.js:107` 合成 end 帧标记 local 由
  消费方决定呈现。修复后复验口径：V6② 终态含「会话已结束（stop）」+
  V5 全量回归（帧路由未破坏）+ gate（静态面零改应 diffPx=0，脚本统一跑）。

## §3 结论与处置

1. **BUG-0057-02 收口达成**（REQ-0061-01/02/03 全绿，双实跑口径）；0057 期
   「C/D 2/2 复现、E2E 6/6 失败」由重建的确定性驱动（订阅确立强判据 + 会话
   纪律）结构性反转，JOURNAL P2+P4 判别结论与实测自洽。
2. **VERIFY 判 FAIL** 仅因 SPEC V6② 字面判据未达（BUG-0061-01，Minor，
   存量、一行级修复面）。按 WORKFLOW §4 转 BUILD 修复轮 1（repair_round
   0→1，上限 2 内）；修复后复验点 = §2 修复建议末行三件。
3. 交互回归其余清单（gate 20 场景含 s19 终端面板在线态）由 V2 采信覆盖；
   面板键入透传/关闭重开/回放恢复/降级态/多根形态本轮实测绿（§1 V6）。
