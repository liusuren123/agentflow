# 迭代 0045 · PRD — BK-0054 契约测试同族字面残留清理

> PLAN 轮产物（WORKFLOW.md §4 PLAN 契约 v2/v3）。S 项免独立 SPEC：受影响文件清单与
> 验收口径内嵌于本 PRD（§4/§5），返回 skipSpec=true。

## 0. 结论与分类（先行）

- **建议：做**（本轮项）。ready 队列枯竭下的规则④证据补题，同族先例 BK-0053 两轮前
  刚以同径完成（done，+3/−2）；本项承接其在案残留，S 级零风险。
- **触UI 分类结论：否**。仅改 `packages/shared/test/` 两测试文件的字符串字面量与
  一行重复键，零 `src/**`、零 `apps/**`、零 golden、零 gate、零 DEFS 契约、零依赖。
  POLICY 自主区「测试与回归基建（契约测试扩充）」——BK-0053 同文件同判在案。
- **非修宪轮**：全程禁 `gate:update`，golden 零接触；S 项 skipSpec。
- **单轮项**：无批次编排，无姊妹子项。

## 1. 背景与选题过程（枯竭判定存证）

选题前置亲核（本会话实跑/实读）：

1. **ready 队列**：`grep -n "| ready |" docs/evolution/BACKLOG.md` 全表唯一
   BK-0040（BACKLOG.md:53）——已被并行工作流占位，派发提示明令本轮禁选；其成果
   在 `feat/0036-iter` 分支（0a92918）待合并仲裁，`git merge-base --is-ancestor
   0a92918 HEAD` → NOT-MERGED 亲核，不重做。
2. **批复档案**：approved 无 / rejected 无 → 规则①③零动作。
3. **issue 面板**：#12/#6/#5/#4 均 needs-approval 未批复；#12（CI 像素门禁 s3 抖动）
   属 golden/pixel-gate 需批准射程，维持待批准不自主处理。
4. **侦察档案**：残缺标记唯一实质项 = browser stub（tools.ts:138），ADR-0011 评估
   终态非缺陷不立项（0041 PLAN 同判在案）；悬挂 run 探针 `[]` 空；覆盖差集/文档
   漂移/dogfooding 系治理日产物，心跳不重复采集。
5. **近 3 迭代目录（0039/0040/0041）复览**：0041/REPORT.md:96-106 留有两条在案
   观察（OBS-01/OBS-02，VERIFY 官方留档）——即本项立项证据。0042~0044 三轮 noop
   的「侦察无带证据候选可立项」结论未消化此在档残留，本轮回补。

**先例链**（为什么心跳可选）：BK-0053 本身即「留治理日」标签项——metrics 0035
CLOSE 观察 → 0040 PLAN 补题 → 0041 PLAN 在 ready 枯竭（BK-0040 被占）下入选并
done。本项与其完全同构（同文件、同性质、同证据形态）。OBS-01 的「酌并」为授权
性措辞非禁令，承接闭口沿 BK-0024「同文件同表同性质一并清账非夹带」先例。

## 2. 立项证据（可验证指针）

| # | 指针 | 现值 | 实况 | 滞后源 |
| --- | --- | --- | --- | --- |
| E1 | `packages/shared/test/synthesis.test.mjs:15` 测试名 | 「其余 **16** 键无 caps 键」 | 20 类型 − 3 caps（llm/agent/code）= **17** | 0035 jsoncanvas 落地 |
| E2 | `packages/shared/test/synthesis.test.mjs:24` 断言消息 | 「**16** 节点无 caps 的复现条件」 | **17**（同上） | 同上（OBS-02 仅列 :15，:24 为本轮亲核新增同族） |
| E3 | `packages/shared/test/defs-drift.test.mjs:49` 断言消息 | 「定稿 **18** 种漂移」 | **20** 种（:11 注释自证「20 种节点 × 42 参数」） | 0034/0035 后 |
| E4 | `packages/shared/test/defs-drift.test.mjs:28/:31` | 重复键 `termview` 两行，值全同 `{ lines: 200, autoscroll: true }` | JS 对象字面量后者覆盖前者，键集合不受影响（20 键 × 42 参数实测通过） | 0034 termview 落地时并入笔误 |

E1~E3 断言本体全部正确，仅名字/消息字面滞后（与 BK-0053「38/38」「19 键全量」
同族）；E4 语义无影响但属同表杂质。来源：iterations/0041/REPORT.md:96-106
（OBS-01/OBS-02）+ 本会话逐行亲读（见 §1.5）。

## 3. 需求（REQ）

- **REQ-0054-01**：synthesis.test.mjs:15 测试名「其余 16 键」→「其余 17 键」。
- **REQ-0054-02**：synthesis.test.mjs:24 断言消息「16 节点」→「17 节点」。
- **REQ-0054-03**：defs-drift.test.mjs:49 断言消息「定稿 18 种」→「定稿 20 种」。
- **REQ-0054-04**：defs-drift.test.mjs EXPECTED_DEFAULTS 重复键 `termview`
  （:28 与 :31）二留一，删除一行；保留行值逐字不变（OBS-01 承接闭口）。
- **非功能**：改动总量 ≤ 5 行级（3 处字面量替换 + 1 行删除）；两文件其余一切行
  零变化；期望表键值集合改前后 deepEqual 相等。

## 4. 受影响文件清单（S 项免 SPEC 内嵌）

| 文件 | 改动 |
| --- | --- |
| `packages/shared/test/synthesis.test.mjs` | :15 / :24 两处计数字面量 16→17 |
| `packages/shared/test/defs-drift.test.mjs` | :49 消息字面量 18→20；:28 与 :31 重复 termview 行删一行 |
| `docs/evolution/iterations/0045/` | 机制件（PRD/JOURNAL/REPORT，随机制件提交） |

**零触碰清单**（验收硬边界）：`packages/shared/src/**`、`apps/**`、
`tools/pixel-gate/**`、`tests/golden/**`、`.github/**`、`package*.json`、
`docs/adr/**`。

## 5. 验收标准（Given / When / Then）

- **AC1（正路径）**：Given 工作树基线绿，When `npm test`，Then 30/30 全绿（与
  0041 基线一致，纯字面修正零增量断言），且两文件改动后字面计数与实况一致
  （17 / 17 / 20）。
- **AC2（改动面机器证明）**：When `git diff`（工作树内产品面），Then 恰 2 文件：
  synthesis +2 处替换、defs-drift 1 处替换 + 1 行删除；`EXPECTED_DEFAULTS`
  键集合（20 键）与参数总数（42）改前后相等（assertion ①②③ 既有断言即为机器
  证明，AC1 全绿即证）。
- **AC3（门禁红预案——先例形态）**：Given 0037~0041 已归档的本机 s3-library
  采样抖动（diffPx≈23、rerun 即绿、CI 权威），When 合并后 gate 首跑仅 s3 红，
  Then 按预案处置：不消费 `gate:update`，复核 DOM 不变量逐键全等后以复跑/CI
  权威裁决（本项两文件对 `apps/` 零因果引用，grep 可证）。
- **AC4（回归面）**：`npm run build` / `npm run gate`（除 AC3 预案形态外全绿）/
  `npm test` 30/30 / `npm run smoke:server` 133/0（=0041 基线，零回退）。
- **AC5（禁区白名单）**：When `git diff HEAD -- apps packages/shared/src
  tools/pixel-gate tests/golden .github package*.json`，Then 恒空。

**验收命令口径**：`npm run build` + `npm run gate` + `npm test` +
`npm run smoke:server`（主干复测四件套，归合并复测执行）。

## 6. 不做范围

- 不改 `EXPECTED_DEFAULTS` 任何键的值或键集合组成（REQ-0054-04 仅为去重一行，
  保留行值逐字不变）。
- 不动 BK-0051（README 漂移，doc 项归治理日批处理）。
- 不动 issue #12（CI 像素门禁抖动，needs-approval 待用户批复，golden/pixel-gate
  需批准射程）。
- 不做任何 BK-0040 链或 BK-9004/BK-9005 链子项（占位/批复门未解）。
- 不回改 0041 已定稿的 PRD/REPORT 文本（双层记录惯例）。

## 7. 风险

- 唯一可预见风险 = AC3 所列本机 s3 采样抖动（环境侧，五轮先例在案），预案已备，
  零产品因果路径。
- 期望表去重后若未来再有键序断言类新增（现无），以当轮 SPEC 为准——本表键序无
  任何断言依赖（② 为 .sort() 后 deepEqual）。
