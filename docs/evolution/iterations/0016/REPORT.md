# REPORT · 迭代 0016 · BK-0017 智能体互审协议（引擎侧）· VERIFY

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 08:45 初判（R0）；2026-10-24 08:54
> 修复轮 R1 复验收定（见文末 §修复轮 R1 复验，**最终判定以该节为准**）。
> 输入：`PRD.md`（AC1-AC7 / REQ-0017-01~06）+ `SPEC.md`（§0-§12）+ `JOURNAL.md`（含 §5 修复轮 R1）。
> 门禁分工：build / gate / test 由脚本统一执行且通过（派发指令载明，VERIFY 未复跑全套，
> 下文如实标注）；smoke E2E、AC7 反演、交互回归抽查由本阶段亲自执行。

## 总结论（最终）

**PASS（R1 修复后复验收定）** —— R0 初判 FAIL（BUG-0013 Critical + OBS-001 Minor）→
回 BUILD 修复一轮（JOURNAL §5）：BUG-0013 以 `humanApproval` 闭包重构降级链控制流、
OBS-001 以 smoke catch 分支 `C.failed += 1` 修复。R1 复验（本阶段亲跑）：smoke
**84 passed / 0 failed / EXIT=0**（V01-V09 全过，含 R0 中断的 V04/V05/V09）；BUG-0013
API 级双案例 + 浏览器 UI 面均证实回退人工全链路（approval:required → approve 端点 →
审计恰 1 行 mode=human）；AC7 反演闭环完成（FAIL 半 R0 已证 exit=1，复绿半本轮全绿）。
白名单、行数预算、禁止区零改动复核在案。**两 BUG 均已修复并验证，无遗留缺陷。**

> R0 初判详情与证据保留于下（历史记录，其中 AC 判定以 R0 时点代码为对象）；
> 各 AC 的 R1 终态见文末「修复轮 R1 复验」逐条覆盖表。

## 总结论（R0 初判 · 2026-10-24 08:45 · 历史）

**FAIL —— 1 个 Critical 产品缺陷（BUG-0013：互审失败 × to='挂起' 未回退人工，
静默自动通过），按 WORKFLOW §4 回 BUILD 修复（repair_round 0 → 1）。**

- 互审正路径（AC1/AC2）、F5/F6/F3/F2 × 自动策略降级（AC3 前半 + V06/V07/V08 断言
  载体已就位）、人工路径零回归（AC4，含浏览器交互面抽查）、白名单与禁止区 git 核对
  （AC4/AC5/AC6 前半）、审计落库与 V 断言非空转（AC7 前半反演）全部验证通过或证据在案。
- 唯一致命点：**降级链「挂起→回退人工全链路」控制流断裂**（handlers.ts:271-292）——
  SPEC §4.4 矩阵六失败方式 × to=挂起 列全部落空，PRD 非功能 5「安全侧默认：默认挂起
  策略下一切裁决失败都回到人工主权，不自动放行」被破坏。smoke V04 以未预期异常中断，
  V05-V09（fail-fast）未执行到。

## 验收矩阵（逐 AC）

| AC | 判定 | 证据（本阶段亲跑） |
| --- | --- | --- |
| AC1 互审正路径 | **PASS** | `npm run smoke:server`：V01 PASS——有序子序列 run:accepted→run:start→node:start(1)→log(sys「⚖ 互审裁决中 · 审官 审官A（node:2）」)→approval:done{1,true}→node:done(1)→node:bypass(2)→run:done{ok:true,done:2,total:2}；全程无 approval:required；out 含「智能体裁决」「审官A」；审计恰 1 行 `{node_id:1, reviewer:'node:2', mode:'agent', verdict:'allow', reason:'mock 允许：符合规范'}`（/tmp/smoke-run2.log:60） |
| AC2 deny 分支 | **PASS** | V02 PASS——approval:done{approve:false}、out 以「审批拒绝」开头、审计 `{mode:'agent',verdict:'deny',reason:'mock 拒绝：内容不合规'}`、无 approval:required（/tmp/smoke-run2.log:61） |
| AC3 降级链 | **FAIL（后半）** | 前半 PASS：V03（F5 非 JSON + to=自动拒绝）——无挂起、直接 approval:done{false}、warn 含「互审裁决失败」「输出不可解析」、审计 agent-fallback/deny（log:62）。**后半 FAIL**：V04（审官 node:99 不存在 + to=挂起）应以 approval:required 回退人工——实测 run 7c89e106 服务端日志无「审批挂起」，waitFor(approval:required) 抛「SSE 流已收束，未等到期望事件」（smoke-server.mjs:768 / lib.mjs:173，log:63）→ **BUG-0013** |
| AC4 人工路径零回归 | **PASS** | ① 既有 D 组 smoke-approval（role=冒烟测试，挂起→approve 端点→完成）本次运行 PASS（服务端日志见 run d50bc2e6 审批挂起→审批决议→run 结束 ok）；② git 核对 `git status --porcelain -- apps/server/src/engine.ts apps/server/src/server.ts apps/web packages/shared tools/pixel-gate tests/golden .github` 输出为空（零改动）；③ **浏览器交互面抽查**（详见下节）：弹窗出现→「通过」→`审批通过 · 测试审批人`→运行完成 1/1，与现状同型。V05 断言因 fail-fast 未执行到，但①②③已覆盖其口径 |
| AC5 契约零漂移 | **PASS（部分亲证）** | `packages/shared/**` 零改动由我核对（上述 git status 为空）；`npm test` 由脚本执行通过（派发指令载明，未复跑）。V09 机器断言（RunEventSchema 逐条 parse）因 fail-fast 未执行到——如实记录：AC1-AC3 已捕获事件全部为既有 15 种事件类型（log/approval:done 等），但正式逐条 parse 待修复后 V09 补跑 |
| AC6 白名单与全量回归 | **FAIL（smoke 未全绿）** | 白名单 PASS：工作区改动恰 `apps/server/src/{handlers,store}.ts` + 新增 `apps/server/src/approval-review.ts` + `tests/smoke/smoke-server.mjs`（+ STATE.md/迭代目录，派发产物）；gate 8 场景由脚本执行通过（未复跑，前端零改动纯回归面）。smoke：`==== smoke:server：73 passed / 0 failed ====` 但 **V04 未预期异常中断、V05-V09 未执行**（预期 75），且退出码为 0（见 OBS-001）→ 未达 SPEC §7.5「全绿」口径 |
| AC7 保护力反演 | **部分完成（非空转已证，复绿被 BUG-0013 阻断）** | 反演前半亲跑：注释 handlers.ts 全部 5 处 recordApprovalAudit 调用 → `npm run build:server` → `npm run smoke:server` → **V01 干净 FAIL**（actual `"a":[]` 审计空），fail-fast 生效，`67 passed / 1 failed`，**EXIT=1**（/tmp/smoke-inversion.log:60-61,95）。还原：四处 Edit 逆操作 → `git hash-object apps/server/src/handlers.ts` = `8fbe94c0a6193efbef810e166430ad72f7a60237`（与实验前基线**字节级一致**）→ 重建 → 复跑回到实验前同一状态（V01-V03 PASS + V04 ERROR，73/0）→ `git status --porcelain` 与基线集合一致、无反演标记残留。「还原重建**复绿**」半因产品 BUG-0013 当前不可能满足——须修复后补做完整 AC7。另：V04 对真实缺陷的有机失败本身即 V 断言非恒真的更强实证 |

## 本阶段执行的检查（命令 + 结果摘要）

1. `npm run smoke:server`（三次：基线 / 反演 / 还原后）——基线与还原后均为
   `73 passed / 0 failed` + V04 未预期异常 + EXIT=0；反演为 `67 passed / 1 failed` + EXIT=1。
2. `git status --porcelain -- packages/shared apps/web tools/pixel-gate tests/golden .github
   apps/server/src/engine.ts apps/server/src/server.ts` —— 输出空（AC4/AC5/AC6 禁止区零改动）。
3. `git hash-object apps/server/src/handlers.ts`（反演前后）—— 一致
   （8fbe94c0a6193efbef810e166430ad72f7a60237）。
4. `npm run build:server` ×2（反演注入后 / 还原后）—— 均 exit 0。
5. 独立复现脚本（test-manager 临时脚本，存系统临时目录不入仓库）：起真实 server
   （PORT=39901 系 lib.mjs startServer）+ `POST /api/v1/run` 两例 + approval_audits
   只读直查（better-sqlite3 readonly）→ 固化 BUG-0013 双案例（见下）。
6. 浏览器交互回归抽查（IAB + `node apps/server/dist/server.js` @39911，页面既有
   `#file-import` 通道导入夹具，非改前端代码）——人工路径 ✓ / BUG-0013 UI 面 ✗（见下）。
7. `wc -l`：approval-review 99/160 · handlers 294/310 · store 385/385 ·
   smoke-server 880/880 —— SPEC §6 预算全达标。

## BUG 清单

### BUG-0013 · Critical · 互审失败 × to='挂起'（及未知 to 值）未回退人工，静默自动通过

- **违反**：AC3 后半（V04）/ REQ-0017-03 降级链「挂起→回退人工审批全链路」/ SPEC §4.4
  矩阵 F1-F6 × 挂起列 / PRD 非功能 5 安全侧默认「不自动放行」/ 用户故事 2「绝不静默乱判」。
- **定位**：`apps/server/src/handlers.ts:245-292` 控制流断裂——互审块（`if(agentId !== null){…}`，
  :245）在裁决失败且 policy 非自动策略时于 :272 emit「回退人工审批」warn 后**自然结束**；
  而 :274/:275 的 `else if` 与 :276 `else`（人工分支）**挂接在 :245 的 if 上**，因该 if
  已命中被整体跳过 → 直落 :292 return，`ok` 保持 :242 初始值 `true` → 输出
  `审批通过 · node:99`。无 approval:required、无 approvalWaiters、**无审计行**。
  JOURNAL §2.2 声称「未知 to 值 + 互审失败 → 回退人工」同路径同断。
- **API 级复现**（临时脚本，runId 419b1b82 / 89b6ee0e）：
  - F1（role='node:99' 不存在）×挂起：事件序 `run:accepted→run:start→node:start→log:warn
    （⚖ 互审裁决失败（审官节点不可用：node:99 不存在），回退人工审批）→run:progress→
    node:done→run:done{ok:true}`；out=`审批通过 · node:99`；approval:required=false；
    **approval_audits 行数=0**。
  - F2（role='node:2' 指向 prompt 节点）×挂起：同型，out=`审批通过 · node:2`，审计 0 行。
- **UI 级复现**（浏览器真跑，run #3b2c16b5 同会话对照）：日志面板出现
  `⚖ 互审裁决失败（…），回退人工审批` 后 **0.1s** 即 `✓ 互审审批节点 · 审批通过 · node:99`、
  `● 运行完成`，**审批弹窗全程未出现**（#approve-modal 无 show 类）——用户被告知「回退
  人工」却从未获得人工决议入口，直接被放行。
- **修复建议**（供 code-developer，不代改）：使互审失败且非自动策略时真正落入人工分支
  ——例如把 :274-275 的分支条件从挂接 :245 的 `else if` 改为独立判定
  （`agentId === null` 已在条件里，去掉 else 挂接即可让互审块自然下落进 :276 人工分支），
  或在互审块末尾显式进入人工等待逻辑；修后 V04-V09 必须补跑全绿。

### OBS-001 · Minor（测试基建观察，非本迭代引入）· smoke 对「未预期异常」退出码为 0

- `tests/smoke/smoke-server.mjs` 运行器（既有代码，本次 diff 未触碰）：非 SmokeFailError
  异常仅打印 `ERROR 未预期的异常`，不计入 `C.failed`，末行 `process.exit(C.failed === 0 ? 0 : 1)`
  → **EXIT=0**。本次 V04 的 waitFor 异常因此以「73 passed / 0 failed / exit 0」呈现，
  脚本统一门禁若只看退出码会被误判全绿（对照：计数型断言失败正确 exit 1——反演运行
  `67 passed / 1 failed`、EXIT=1 证实双路径差异）。
- 建议（可与 BUG-0013 同轮修复，smoke-server.mjs 已在白名单内）：catch 分支置
  `C.failed += 1`（或直接 `process.exitCode = 1`），使任何非预期中断都红。

## 交互回归抽查（test-manager 清单摘选）

- **审批弹窗（人工路径）✓**：导入 1 节点 approval 工作流（role=测试审批人，to=挂起）→
  点击运行 → `#approve-modal` 弹出（信息「工作流在 人工审批节点 处等待人工审批 /
  审批人：测试审批人 · 运行 #3b2c16b5」）→ 截图留证 → 点击「通过」→ 弹窗关闭、
  日志 `👤 审批已通过`、`✓ 审批通过 · 测试审批人`、`● 运行完成 1/1`，节点 out 同文
  ——与现状交互语义一致（AC4 交互面）。
- **互审路径不弹窗（AC1 语义面）✓**：V01 事件流全程无 approval:required（机器断言），
  与前端 `app.js:2197-2207` 只在 approval:required 弹窗的行为吻合——本迭代未引入任何
  智能体裁决弹窗。
- **BUG-0013 UI 面 ✗**：见上——宣称回退人工却无弹窗、静默放行（截图与日志面板文本在案）。
- 其余清单项（拖拽/缩放/连线/撤销重做/导入导出/多标签等）本迭代零前端改动且 gate 8 场景
  由脚本执行通过（像素 0 容差 + DOM 不变量），VERIFY 未逐项重跑——如实标注为脚本门禁覆盖。

## 修复后需复验项（下一轮 VERIFY 入口清单）

1. BUG-0013 修复 → `npm run smoke:server` 全绿（V01-V09，预期 75 断言，含 V04 回退人工
   + approve 端点 + 审计 human；V05 双支；V09 契约 parse）。
2. AC7 完整反演补做（复绿半）：摘除审计写入 → FAIL → 还原 → 复绿 → `git status` 干净。
3. OBS-001 若同轮修复：确认未预期异常路径 exit ≠ 0（可临时注入异常观察）。

## 附注

- 交互抽查在开发库 `data/agentflow.db` 留有验证 run（R0 两例 + R1 复验两例 + UI 两例，
  各含 human 审计行或 0 行对照）——本地开发数据不入库（git ignore），如实记录。
- 本报告全部结论基于本阶段亲跑命令与亲读代码；脚本统一门禁（build/gate/test）结果按
  派发指令采信并在文中逐处标注「未复跑」。

---

# 修复轮 R1 复验（最终判定 · test-manager · 2026-10-24 08:54）

> 对象：JOURNAL §5 修复（handlers.ts `git hash-object` 由 R0 基线 8fbe94c… 变为
> 0dee25d…，本会话实查）；STATE phase 仍为 R0 VERIFY/FAIL（修复轮未动 STATE）。
> dist 时效：dist/handlers.js 08:52:07 > src/handlers.ts 08:49:13（冒烟测的是修复后构建）。

## R1 执行的检查（命令 + 结果）

1. `npm run smoke:server` → **`==== smoke:server：84 passed / 0 failed ====`，EXIT=0，
   无 FAIL、无「未预期的异常」**（/tmp/smoke-r1.log）。计数构成：V01-V09 计 9 条全过
   + C 组 20 条（C01 随 run 数动态）+ 既有 M/W/N/D/K/G 断言全过——SPEC §7.5「合计 75」
   系对动态 C01 行数的低估，判据以「0 failed + V 组全过 + 既有组全过」为准。
2. 修复代码复读（`git diff apps/server/src/handlers.ts` 全量）：人工分支语句逐字提为
   `humanApproval` 闭包，两处真正调用——无前缀挂起 `else { await humanApproval(); }` 与
   互审失败挂起回退（warn 后 `await humanApproval()`）；六路径（无前缀×三策略 /
   verdict / 非挂起降级 / 挂起回退）与 SPEC §4.4 矩阵逐格对齐；`else if` 冗余
   `&& agentId === null` 守卫移除（语义不变，非挂起互审路径均早返回）。
3. OBS-001 修复核对：`tests/smoke/smoke-server.mjs` catch 分支追加
   `C.failed += 1;`（:246，注释注明 OBS-001）——异常路径退出码不再为 0；全绿路径
   汇总 84/0 不受影响（本轮实证）。
4. BUG-0013 API 级独立复验（临时脚本，runId 96f1a0cf / 476a0669）：
   - F1（node:99 不存在）×挂起：`approval:required {nodeId:1, role:'node:99'}` 出现 →
     `POST /api/v1/run/:id/approve` 200 {ok:true} → out=`审批通过 · node:99` →
     run:done{ok:true} → **审计恰 1 行 {mode:'human', verdict:'allow',
     reviewer:'node:99', reason:null}**。
   - F2（node:2 指向 prompt 节点）×挂起：同型，审计恰 1 行 human/allow。
   —— R0 复现脚本的两案例（当时 0 事件 0 审计静默通过）全部转绿。
5. UI 面复验（IAB + 修复后 dist @39911，run #b1a82486）：导入 role=node:99×挂起 →
   运行 → **审批弹窗出现**（`#approve-modal.show`，信息「工作流在 互审审批节点 处等待
   人工审批 / 审批人：node:99」），run 保持挂起（非 0.1s 放行）→ 截图留证 → 点击
   「通过」→ 日志 `⚖ 互审裁决失败（…node:99 不存在），回退人工审批` → `⏳ 等待人工审批
   （弹窗中通过 / 拒绝）` → `👤 审批已通过` → `✓ 审批通过 · node:99` → `● 运行完成 1/1
   · 总耗时 13.9s`——日志宣称与实际行为一致，无静默放行。
6. 白名单/预算/禁止区复核：`git status --porcelain` 仍恰四产品路径 + STATE/迭代目录；
   `wc -l` handlers **298**/310 · smoke **880**/880（store 385 / approval-review 99 未动）；
   禁止区（shared/web/golden/pixel-gate/.github/engine.ts/server.ts）零改动（R0 核对 +
   本轮 git status 复核，工作区集合未变）。

## R1 逐 AC 终态

| AC | R0 | R1 终态 | 依据 |
| --- | --- | --- | --- |
| AC1 / AC2 | PASS | **PASS** | V01/V02 复跑全过（smoke-r1.log:60-61，断言全文同 R0） |
| AC3 | FAIL（后半） | **PASS** | V04 过：warn「审官节点不可用」→ approval:required{nodeId:1,role:node:99} 回退人工 → approve 200 → run:done ok:true → 审计恰 1 行 {mode:human,verdict:allow,reviewer:node:99}（:63）；V03 前半维持 PASS（:62）；API/UI 双重复验同口径 |
| AC4 | PASS | **PASS** | V05 双支过（:64）——①人工挂起+approve 事件序/out=`审批通过 · 普通审批人`/审计 human 与现状同型；②纯自动拒绝零审批事件/审计 auto；engine.ts/server.ts 零改动复核不变；R0 浏览器交互面证据仍有效（人工路径未再改） |
| AC5 | PASS（部分） | **PASS** | V09 过（:68）：V01-V04/V06 共 **51 条事件逐条 RunEventSchema 校验通过** + `git status --porcelain -- packages/shared` 为空；npm test 脚本通过（未复跑） |
| AC6 | FAIL（smoke 未全绿） | **PASS** | smoke 84/0 全绿 EXIT=0（V 组 + 既有组零回退）；白名单恰四路径；gate 8 场景脚本通过（未复跑） |
| AC7 | 部分（复绿被阻断） | **PASS（闭环）** | FAIL 半 R0 已证（摘审计 → V01 FAIL `"a":[]`、EXIT=1）；复绿半本轮完成——字节级还原后的代码 + 修复 → 全量 84/0 全绿；工作区与基线集合一致、无反演残留。V04「有机失败→修复转绿」进一步双向实证断言非恒真 |

## R1 结论

**迭代 0016 / BK-0017 验收通过（PASS）。** BUG-0013、OBS-001 均修复且经机器断言 +
独立 API 复验 + 浏览器 UI 面三重证实；PRD AC1-AC7 与 SPEC §7 验收口径全部满足
（脚本统一门禁项按派发指令采信）；零 UI / 零 shared 契约 / 零新依赖 / 行数预算达标。
建议进入 CLOSE。
