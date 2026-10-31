# MERGE · 迭代 0076 · BK-0066 workbench 安全面对抗审查与反演加固（主干合并复测）

> 执行角色：merge-arbiter · 2026-10-31 11:25 · 主干 main（win32 本机）
> 合并对象：`feat/0076-iter`（81f6da9 产品提交 + b5f847b 机制件提交，merge-base = 9c3a10c）

## 1. 合并结果

- **合并成功**：`git merge --no-ff feat/0076-iter`（ort 策略）→ **合并提交 `cc958ca`**
  （parents: 9c3a10c + b5f847b），提交信息 `merge(evolution): 合并迭代 0076 workbench 安全面对抗审查与反演加固：…`。
- 合并带入 5 文件 / +852 行：
  `docs/evolution/iterations/0076/{JOURNAL,PRD,REPORT}.md`、
  `docs/workbench-security-audit.md`（新增 248 行）、
  `tests/smoke/smoke-server.mjs`（+107，B19~B23 五断言）。
- 预检：合并前主干工作区干净（`nothing to commit, working tree clean`），主干 HEAD
  恰为 merge-base（9c3a10c），自分支创建后主干零移动。
- 本轮非重录轮：全程未运行 `npm run gate:update`，`tests/golden/` 零接触。

## 2. 冲突清单与处理方式

**冲突文件：无（空清单）。** 主干未移动（HEAD = merge-base），合并零冲突，
无需分类仲裁；亦不涉及 `apps/` / `packages/` / `tools/` / `tests/golden` 等产品代码
两侧分叉，无需用户裁决事项。

## 3. 主干端到端复测（逐项实跑，主干相对路径留证）

| # | 命令 | 结果 | 关键输出 |
| --- | --- | --- | --- |
| 1 | `npm run build` | ✅ 绿 EXIT=0 | shared tsc + web vite build，72 modules，`dist/index.html 723.72 kB`，built in 1.93s |
| 2 | `npm run gate` | ✅ 绿 EXIT=0（首跑） | 21 场景全部 `diffPx=0`（s0~s20 含 s16~s18 workbench 三场景），DOM 不变量逐键过，「宪法门禁：通过 ✓」；首跑即全绿，未触发 issue #12 单场景抖动复跑例外 |
| 3 | `npm test` | ✅ 绿 EXIT=0 | `tests 30 / pass 30 / fail 0`（DEFS 默认值 86/86、21 节点注册表、SSE 契约、D⊆R、生成器幂等等） |
| 4 | `npm run smoke:server` | ✅ 绿 EXIT=0 | `==== smoke:server：208 passed / 0 failed ====`；`grep -c "^PASS" = 208`（W45 基线 203 + 本轮 B19~B23 恰 5，既有断言零回退）；`^FAIL` 零行；B19~B23 五行全 PASS（smoke.log:118-122，含注入/越界/多值/源码形态扫描反演断言） |

四项全绿，无放宽门禁、无 golden 重录。

## 4. 证据留档（`docs/evolution/iterations/0076/evidence/`）

| 文件 | 内容 |
| --- | --- |
| `build.log` | npm run build 完整输出（EXIT=0） |
| `gate.log` | npm run gate 21 场景 diffPx=0 全过（EXIT=0，首跑） |
| `test.log` | npm test 30/30（EXIT=0） |
| `smoke.log` | smoke:server 208 passed / 0 failed（EXIT=0，B19~B23 于 :118-122，汇总 :213） |
| `01-initial.png` / `02-node-selected.png` / `03-settings.png` / `04-library.png` | `node .zcode/tools/wt.mjs evidence apps/web/dist <本目录>` 产出的 4 张确定性截图（各 35 渲染节点，manifest.json 含 sha256） |
| `manifest.json` | 截图清单：capturedAt 2026-10-31T03:25:39Z，viewport 1600×900，逐场景 bytes+sha256 |

## 5. 结论与交接

- 合并提交：**`cc958ca`**；冲突：**无**；复测：**build/gate/test/smoke 四绿**；
  证据目录：`docs/evolution/iterations/0076/evidence/`。
- REPORT.md（PASS，零缺陷）在案；两项 Mimosa high 已在分支内实测裁定误报、零加固
  （条件加固未触发），与主干复测行为一致（gate 21 场景零 diff、smoke 208/0）。
- 待 CLOSE（协调者、合并锁内）：BACKLOG BK-0066 置终态、metrics 追加本轮行、
  STATE phase=idle / iteration=0077 / last_result 指向本文件与证据目录。
