# REPORT · 迭代 0076 · BK-0066 workbench 安全面对抗审查与反演加固（VERIFY 轮）

> 执行角色：test-manager · 2026-10-31 11:17 · 隔离工作树 `feat/0076-iter`（HEAD 9c3a10c，产品改动未提交——WORKFLOW §4 顺序：VERIFY 通过后才做特性分支提交）
> 验收依据：`iterations/0076/PRD.md` §6（AC1~AC7 + 命令口径）；BUILD 侧输入：`iterations/0076/JOURNAL.md` + `docs/workbench-security-audit.md`。
> **结论：PASS（零缺陷，BUG 清单为空）**。两项 Mimosa high 裁定误报、零加固（条件加固未触发），
> AC1~AC7 逐条核验通过；核验手段 = 源码锚点亲读 + 冒烟实跑 ×3（绿绿红红绿闭环）+ 白名单/禁区 git 实查。

## 0. 验收总表

| AC | 结论 | 一手证据（本轮 VERIFY 亲跑/亲读） |
| --- | --- | --- |
| AC1 矩阵取证完整性 | ✅ | 审计报告 §4 六表覆盖 3 端点 × 7 入参；§5.1/§5.2 两端到端裁定段在案；矩阵格子与五源文件逐锚点比对一致（§2 抽样 21 组全命中） |
| AC2 增量负例钉死 | ✅ | `npm run smoke:server` 实跑：`PASS B19~B23` 五行 + `208 passed / 0 failed`、exit 0（final-green.log:118-122,213）；第 5 类宽松放行只记录于审计 §6.2；第 6 类 B22 锁定实测形态，无未决项 |
| AC3 源码锁反演 | ✅ | 篡改 `diff.ts:84` → 模板字面量 → smoke exit 1、`FAIL B23 … "badAsm":1`、此前 150 断言全绿（ac3-red.log）→ `git checkout` 逐字节还原 → apps/server 零 diff → 终态复绿 |
| AC4 校验点反演红绿 | ✅ | 篡改 `diff.ts:27 REF_MAX→MAX_SAFE_INTEGER` + `npm run build:server` → smoke exit 1、`FAIL B20 … base 201 字符:500:git command failed`、此前 147 断言全绿（ac4-red.log）→ 还原 + 重建 → `208 passed / 0 failed`、exit 0 |
| AC5 审计报告质量 | ✅ | 锚点抽样 21 组（≥8）全部命中（routes/git/diff/tree/root 五文件逐一亲读，明细见 §2）；报告 248 行 ≤400（`wc -l`）；§1/§8.1 两项 high 最终裁定明确（均误报）；§9 复测命令四条与 package.json scripts 实名比对一致可复制 |
| AC6 门禁与回归 | ✅ | `npm run smoke:server` 本轮 VERIFY 实跑 ×3：绿 208/0 → 红（反演）→ 绿 208/0，exit 0 终态；`npm run build` / `npm run gate` / `npm test` 由脚本在工作树内运行且通过（派发指令给定，VERIFY 未复跑全套——按派发契约；golden 零接触：tests/golden 零 diff，全程零 gate:update）；条件加固未触发 → 行为一致性子条款空 vacuous（端点承载面零 diff，行为按构造不变） |
| AC7 改动面白名单 | ✅（提交级子项延后） | `git status --short` + `git diff --numstat` 实查：产品面恰 `tests/smoke/smoke-server.mjs`（+107，PRD 预期 +60~+150 内）+ `docs/workbench-security-audit.md`（新增 248 行 ≤400）；条件面 workbench 五文件零 diff；禁区（apps/web / packages/shared / tests/golden / tools/pixel-gate / .github / package*.json / docs/adr）零 diff（git diff --stat 空输出）；机制件 STATE.md（5/5）+ iterations/0076/ 按 §5 白名单外另行提交。Conventional Commits 单一事项检查在 VERIFY 时点不适用（分支提交在 VERIFY 之后由脚本执行），延后至提交步骤核验 |

## 1. 一手命令与输出（本轮实跑）

```
# 绿基线（篡改前）
$ npm run smoke:server            # （工作树根）
==== smoke:server：208 passed / 0 failed ====    EXIT=0
# PASS 计数复核：grep -c "^PASS" → 208（W45 基线 203/0 + B19~B23 恰 5，既有断言零回退）

# AC3 红侧：node 替换 diff.ts:84 `args.push(q.base ?? 'HEAD');` → `args.push(`${q.base ?? 'HEAD'}`);`
$ npm run smoke:server > ac3-red.log; echo EXIT=$?
EXIT=1
FAIL B23 … actual: {"spawnCount":1,"spawnForm":true,"asmLines":10,"badAsm":1,"badRunGit":[]}
==== smoke:server：150 passed / 1 failed ====
# 还原：git checkout -- apps/server/src/workbench/diff.ts
$ git status --short apps/server/ && git diff --stat apps/server/src/workbench/   # 均空 → 零残留

# AC4 红侧：node 替换 diff.ts:27 `const REF_MAX = 200;` → `const REF_MAX = Number.MAX_SAFE_INTEGER;`
$ npm run build:server   # tsc 通过；端点断言打 dist，须重建（BUILD 教训复核成立）
$ npm run smoke:server > ac4-red.log; echo EXIT=$?
EXIT=1
FAIL B20 … base 201 字符:500:git command failed | 200字符:500:git command failed
==== smoke:server：147 passed / 1 failed ====
# 注：门移除后 201/200 字符均直达 git → 本机（win32 长根路径）500——反证 REF_MAX 门
# 恰为 201→400 的拦截点，且证实审计 §6.1 的 stat 二态机制（两态皆固定字面量零泄露）。

# 终态：还原 + npm run build:server → 复跑
$ npm run smoke:server > final-green.log; echo EXIT=$?
EXIT=0
PASS B19 …（final-green.log:118）
PASS B20 …（:119）
PASS B21 …（:120）
PASS B22 …（:121）
PASS B23 …（:122）
==== smoke:server：208 passed / 0 failed ====（:213）
```

> 反演产物日志（ac3-red.log / ac4-red.log / final-green.log）存于 VERIFY 临时目录（系统
> /tmp/verify0076/），不入库——审计报告 §7 已载两条闭环的关键输出；本报告 §1 为其转录。

## 2. AC5 锚点抽样明细（21 组亲读命中，全部与源码现状一致）

`routes.ts:17-19`（limit 门三行：Number ?? 20 / isInteger 1-100 / 400 字面量）·
`routes.ts:21`（collectGitInfo(n)）· `routes.ts:55`（diff 细节进 logger.warn 不进响应）·
`routes.ts:76`（collectTree(q)）· `git.ts:30`（spawn('git', args, {cwd,stdio}) 数组形态）·
`git.ts:33,39`（5s setTimeout kill / killed 拒绝分支）· `git.ts:48,53,56`（rev-parse/status/log
三命令，limit 经 String(limit) 仅作 argv 元素）· `diff.ts:26-27`（REF_RE 白名单 + REF_MAX=200）·
`diff.ts:34-37`（isWithinRoot resolve 前缀比对）· `diff.ts:47-52`（ref 校验：非 string/空串/
超长/`-` 前缀/字符类）· `diff.ts:54-58`（path 校验）· `diff.ts:82-86`（argv 装配六行零拼接）·
`diff.ts:89-90`（revision 正则归类 400）· `tree.ts:34-35`（FOLD 四目录 + ENTRIES_CAP=500）·
`tree.ts:41-44`（私有同构 isWithinRoot）· `tree.ts:52-55`（path 校验）· `tree.ts:58-61`
（depth 整数门 1-6）· `tree.ts:78`（承载内二次 resolve）· `tree.ts:112`（.git 恒不入树）·
`tree.ts:140-143`（符号链接不追踪，lstat 判型呈 file 形态）· `root.ts:17-18`（PROJECT_ROOT
模块级冻结，四级上溯）。

AC1 复核口径：矩阵 §4 各格「进入路径/拦截点」锚点与上述源码逐一相符；§5.1 链路
（routes.ts:17→18→21→git.ts:56→git.ts:30，用户可控值仅 1..100 整数的 String 形态）
与 §5.2 链路（tree.ts:52-55→78→81-91→112→140-143）均与代码实况一致，且实测引用
（B03/B19/B20/B21/B22/B23、B10/B16/B17/B13/B18）为本次实跑确认存在的断言——非照抄初判。

## 3. 与 PRD 预期的偏差记录（复核 BUILD 判定，均在 PRD §7 授权口径内）

1. **AC2「REF_MAX 200 通过得契约内 400」预期在本机实测为 500「git command failed」**：
   BUILD 已按 PRD §7.1「实测 + 文档化 + 二态集合断言」处置（B20 二态集、审计 §6.1）。
   本轮 VERIFY 以 AC4 反演独立复核该机制：门移除后 201 字符 500（而非 400）证实拦截点
   恰为 REF_MAX；两态皆固定字面量、零 stderr 泄露（routes.ts:55 亲读在案）。**裁定：
   处置正确，不构成缺陷。**
2. **AC4 端点反演须先 `npm run build:server`**：本轮复跑证实（首次篡改 src 不重建 dist
   不可观测的教训成立）；AC3 源码锁读 src 直读无需重建。已在审计 §9 口径中，无异议。

## 4. 回归抽查说明（test-manager 职责口径）

- **后端回归**：`npm run smoke:server` 全套（208 断言，覆盖 B/C/W/PT/T/H 全组含
  workbench B01~B18 happy path 与负例、workflows CRUD、SSE、terminal、持久化清理）
  实跑三轮全绿——即本轮的 E2E 回归，既有断言零回退。
- **前端交互回归清单**（拖拽/缩放/框选/连线/滚轮门控/数字步进/快捷键/审批弹窗/
  撤销重做/导入导出/多标签/节点库收藏）：本轮改动面经 AC7 实查**零前端接触**
  （apps/web / packages/shared / tests/golden / tools/pixel-gate 零 diff），无前端
  交互路径变更点，清单逐项无对应改动对象——按「对渲染存疑按影响处理」条款反向
  适用：改动面与渲染路径零交集（纯 tests/ + docs/ + 条件面零触发），交互回归清单
  本轮不适用、未逐项执行，以脚本侧 `npm run gate` 全绿（21 场景像素 0 容差 + DOM
  不变量，派发指令给定）作前端面健康佐证。如实记录，不以目测代测。

## 5. 缺陷清单

无（BUG 清单为空）。VERIFY→BUILD 修复轮次消耗：0。

## 6. 交接 CLOSE/提交步骤的事项

1. 分支提交（VERIFY 通过后）：产品提交 = `tests/smoke/smoke-server.mjs` +
   `docs/workbench-security-audit.md`（productFiles 白名单恰此两文件）；机制件提交 =
   `docs/evolution/iterations/0076/`（PRD/JOURNAL/REPORT）+ `docs/evolution/STATE.md`
   过程态；提交信息 Conventional Commits 单一事项——此为 AC7 提交级子项的延后核验点。
2. 审计报告 §9 复测命令口径（build/gate/test/smoke 四命令）与主干复测（MERGE 阶段）
   直接可复用；AC4 类端点反演若在主干复测执行，须先 `npm run build:server`。
