# REPORT · 迭代 0003 · BK-0003 契约测试补齐：DEFS 漂移防护（VERIFY 验收报告）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-22 12:10
> 输入：本目录 PRD.md（AC1-AC6）+ SPEC.md（§5 验收口径 #1-#8、手动 E2E P1-P3）+ JOURNAL.md。
> 环境：Windows (win32 10.0.26300) · Node v24.21.0 · 仓库根 D:\Projects\CodeRepo\agent-workflow。

## 结论

**PASS。** AC1-AC6 全部通过（含三项反演演练与裸跑防御实测），SPEC §5 口径 #2/#5-#8 由本会话
实测执行，#1/#3/#4（build / gate / smoke）由工作流脚本先行运行且通过（VERIFY 任务指令明示
「不要重复跑全套」，本报告如实区分引用与自测）；手动 E2E P1-P3 全过（真实 LLM 流式 + 审批
挂起/恢复 + UI 默认值对照）。**缺陷清单：无。**

## 一、门禁分层与证据归属

| 层 | 执行者 | 命令 | 结果 |
| --- | --- | --- | --- |
| 脚本侧（引用，VERIFY 指令明示已跑且通过） | 工作流脚本 | `npm run build` / `npm test`（新链）/ `npm run gate` / `npm run smoke:server` | 通过（本会话未复跑全套，按指令不重复） |
| VERIFY 自测① 契约测试 | 本会话 | `node --test`（cwd=packages/shared，根链末段真实形态，发现模式） | **tests 8 / pass 8 / fail 0 / skipped 0**（旧 5 + 新 3 全绿；handlers-coverage 110.6ms 为真实动态加载 engine 之证） |
| VERIFY 自测② 反演演练 + 裸跑防御 | 本会话 | SPEC §5 #5-#8（见下表逐条） | 全部先红后还原复绿 |
| VERIFY 自测③ 后端/UI E2E | 本会话 | 临时脚本（系统临时目录，不落源码）+ 浏览器实操 | P1/P2/P3 全过（见 §四） |

## 二、SPEC §5 验收口径逐条

| # | 口径 | 执行与证据 | 判定 |
| --- | --- | --- | --- |
| 1 | `npm run build` exit 0 | 脚本侧已跑通过（引用）；本会话未复跑（按指令） | PASS（引用） |
| 2 | `npm test` 新链全绿，旧 5 + 新 3 全 pass | 脚本侧全链已跑通过（引用）；本会话以根链末段 `node --test`（发现模式）复测：`tests 8 / pass 8 / fail 0`，输出含三个新测试名（「DEFS 默认值 33/33 全量断言」「SSE 事件契约反例：12 条坏样本」「后端 HANDLERS 键集 ⊇ NODES 键集」） | PASS |
| 3 | `npm run gate` 4 场景全绿 diffPx=0 | 脚本侧已跑通过（引用）；本会话未复跑 | PASS（引用） |
| 4 | `npm run smoke:server` 33 断言 exit 0 | 脚本侧已跑通过（引用）；本会话未复跑，另做等价后端 E2E（§四 P2-API） | PASS（引用） |
| 5 | 反演 a：期望表任一值改错 → 红，信息含 type.k | 实测：`llm.temp` 期望 0.7→0.9 后 `node --test test/defs-drift.test.mjs` → `fail 1`，报错原文 `AssertionError: llm.temp 默认值漂移（未经 ADR 的 DEFS 变更？）`（含 type=llm、k=temp）；还原后复绿 | PASS |
| 6 | 反演 b：断言输入移除一键 → missing 非空红 | 实测：模拟 handler 表缺 `approval` 键（`Object.keys(HANDLERS).filter(k => k !== 'approval')`）→ `fail 1`，报错原文 `以下节点类型缺后端 handler（将静默 __pass 假成功）：approval`；还原复绿 | PASS |
| 7 | 反演 c：坏样本改合法 → assert.throws 红 | 实测：N01 补 `runId:'x'` 后 → `fail 1`，报错原文 `Missing expected exception: N01 未被拒绝：缺 runId（events.ts:9）`；还原复绿 | PASS |
| 8 | 裸跑防御：engine 产物缺失 → 含「先构建」报错失败（非 skip） | 实测（方式说明：直接 `mv dist/engine.js` 被 Mimosa 提交前钩子拦截——Bash 直写该路径需走 Write/Edit 扫描；改以等价方式把测试内 `ENGINE_URL` 临时指向不存在路径 `engine.__missing__.js`，走的是同一 `existsSync` 分支与同一报错文案）→ `fail 1`（非 skip），报错原文 `apps/server/dist/engine.js 不存在——先在仓库根执行 npm run build:server（或完整 npm test）后再跑本测试`；还原复绿 | PASS |

**演练后还原确认**：`grep -n "演练" packages/shared/test/*.test.mjs` 零命中（exit 1）；
复跑 `node --test`（发现模式）tests 8 / pass 8 / fail 0；`git status --short` 与 BUILD 交付态
完全一致（M engine.ts + M package.json + M STATE.md + ?? iterations/0003/ + ?? 三个新测试文件，
无任何演练残留）；`grep -c "export const HANDLERS"` 源码与 dist 均 1 处（导出落位）。

## 三、PRD 验收标准（Given/When/Then）逐条

- **AC1 · 默认值 33/33 —— PASS**：新测试单测名含「33/33」且 pass（§一自测①）；计数自检
  断言（期望表合计=33）在文件内（defs-drift.test.mjs:33-37）；反演演练红且信息含 `llm.temp`
  （§二#5）。**期望表 vs DEFS 原文独立比对**（PRD 风险 2 要求抽 3 项，本会话抽 5 项）：
  `llm.temp=0.7`（nodes.ts:30 ↔ 测试 :15）、`prompt.tpl` 全文含 `\n` 转义（nodes.ts:36 ↔ :16）、
  `approval.to='挂起'`（nodes.ts:105 ↔ :28）、`trigger.cron='0 9 * * 1-5'`（nodes.ts:14 ↔ :13）、
  `retrieval.kb='产品手册 v2.3'`（nodes.ts:41 ↔ :17）——逐字一致。
- **AC2 · 事件反例 —— PASS**：12 条反例全部 pass（含逐条 `assert.throws`）；文件内机器自检：
  四类形态（必填缺失 N01-N03 / 类型错误 T01-T06 / 非法枚举 E01 / 可空性违规 L01-L02）各 ≥1、
  事件族 12 个（≥6）——events-negative.test.mjs:32-34；反演演练 c 红（§二#7）。15 正例回放与
  2 条旧反例在 contract.test.mjs 原样保留（git status：该文件未修改；其「全部 15 种事件可解析」
  测试在 §一自测①输出中 pass）。
- **AC3 · HANDLERS ⊇ NODES —— PASS**：测试 pass，断言①缺失键=红、②每键为函数、③额外键仅许
  `__pass`（handlers-coverage.test.mjs:25-31）；反演演练 b 红（§二#6）。
- **AC4 · 一键与不可静默跳过 —— PASS**：新链 `build:shared && build:server && test`（package.json
  diff 仅此一行）；根 `npm test` exit 0 由脚本侧引用（§一）；裸跑防御实测 fail 非 skip 且报错含
  build:server 指引（§二#8）。
- **AC5 · 既有防护不回退 —— PASS**：contract.test.mjs 零改动（git status 不在修改清单），其 5 条
  测试语义原样（§一自测①输出可见 5 条旧测试名全 pass：16 节点字段齐全 / 端口类型合法 /
  paramDefaultsOf 抽样 / 15 事件回放 / legacy 从 shared 导入）。
- **AC6 · 渲染零影响 —— PASS**：gate 4 场景 diffPx=0 与 smoke 33 断言 exit 0 由脚本侧引用；
  本会话补充零行为证据：git diff 确认 engine.ts 仅一行加 `export`（fallback 逻辑
  `HANDLERS[n.type] || HANDLERS.__pass` 不在 diff 内）；E2E 全链运行正常（§四）。

## 四、手动 E2E 点位（SPEC §5 P1-P3，本会话实测）

**环境**：`PORT=3213 node dist/server.js` 后台启动（health `{"ok":true,...,"node":"v24.21.0"}`，
provider 已配置 DeepSeek）；浏览器（ZCode 内置 Chromium 1280×720）打开 http://localhost:3213/。

- **P1 · 启动与渲染 —— PASS**：页面标题「AgentFlow · 智能体工作流原型」；宪法 DOM 不变量实测
  （页面 evaluate）：`#viewport`×1、`.node`×8、`.wdg`×15、`.port`×15、`.modal-mask`×3（隐藏
  帮助/审批弹窗常驻 DOM，常态）；节点库/属性面板/执行日志/浮动运行卡均在位（DOM 快照证据）；
  截图已归档（12:02 像素级等价的权威证据为脚本侧 gate diffPx=0）。
- **P2 · 端到端事件链 —— PASS（真实 LLM 环境）**：UI 点「运行」触发默认工作流（8 节点 7 连线），
  日志面板事件流完整推进（DOM 快照逐行）：`开始运行「智能客服助手」→ ▶手动触发 ✓ → ▶客服提示词
  ✓(38 字符) → ▶知识库检索 ✓(命中 1 条片段·相似度 0.5) → ▶LLM 生成回复 ✓(真实流式·540 tokens·1.5s)
  → 置信度判断「confidence > 0.7 判定为 假」→ 转人工审批挂起 → 审批弹窗（运行 #208b0095·审批人
  值班经理·含 LLM 生成内容预览）→ 点「通过」→ 升级通知 ✓`。Server 日志权威闭环：
  `run 开始{nodes:8,edges:7} → 审批挂起{nodeId:7} → 审批决议{approve:true} → run 结束{ok:true,
  stopped:false, done:7, total:8, ms:82599}`（7/8 为条件分支假路跳过 reply 的正确语义，非假成功）。
  **另做 API 级复测**（临时脚本，非 UI）：POST /api/v1/run 三节点链（userinput→prompt→reply，无
  LLM）→ 13 事件序列 `run:accepted → run:start → (node:start→run:progress→node:done)×3 → output →
  run:done`，`run:done.ok=true` 且 done/total=3/3、node:start 覆盖节点 {1,2,3}、models 200。
  两路证据共同证明 engine 导出改动**零行为变化**。
- **P3 · 默认值人眼对照 —— PASS**：DOM 快照中 LLM 节点属性面板：模型=GLM-4.7（选中）、温度=0.7、
  最大 Tokens=2048；另见检索 Top K=3、相似度阈值=0.5、审批人=值班经理、通知渠道=邮件——
  与 §4.1 期望表逐项一致。

## 五、改动面闭包与护栏核对（git 实测）

- SPEC §2 五文件闭包成立：`git diff --stat` = engine.ts 1 行 + package.json 1 行（各 2 insert/
  delete 计行级变更）；三个新测试文件 59/39/32 行（≤400 上限，合计 130）；iterations/0003/ 文档。
- 不触碰清单核对（git status 为证）：`packages/shared/src/nodes.ts`/`events.ts`、
  `contract.test.mjs`、`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、
  `.github/workflows/ci.yml`、`CONSTITUTION.md`、`AGENTS.md` 均未动。
- UI 三层零触及：无任何 apps/web 改动 + 脚本侧 gate diffPx=0 —— 交互回归抽查以 P1-P3 实操 +
  DOM 不变量实测覆盖（本迭代不触交互层，像素/DOM 权威由 gate 把关）。

## 六、观察记录（不构成缺陷）

1. **VERIFY 工具性观察**：浏览器自动化对画布内浮动按钮 `#float-run` 的 Playwright role/locator
   点击因 actionability 检查超时（画布容器带 transform、`offsetParent=null`），改用页面内 DOM
   click 触发成功且运行真实发生（server 日志为证）。属自动化工具与自绘 UI 的适配现象，非产品
   缺陷（真实点击事件路径正常工作）；不立案 BUG。
2. 裸跑防御演练方式说明见 §二#8（Mimosa 钩子拦截 mv，改走同一 `existsSync` 分支的等价演练）。

## 七、结论与移交

- **verdict：PASS**，无 BUG 清单；修复轮次未消耗（repair_round 维持 0）。
- 移交 CLOSE：可按 WORKFLOW §4 归档（BACKLOG BK-0003 → done、metrics 追加、iteration+1、
  phase=idle），产品提交建议主题与 JOURNAL §五一致。
