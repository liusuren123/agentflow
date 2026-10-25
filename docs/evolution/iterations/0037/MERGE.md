# MERGE · 迭代 0037（BK-0050 节点库「智能体」类目 · 修宪轮 issue#6 承继）

> 合并仲裁员（merge-arbiter）在主干 main 上执行 `git merge --no-ff feat/0037-iter`，
> 完成冲突仲裁（零冲突）、合并后收口（s12 场景 DOM 不变量合流同步）、
> 主干端到端复测与证据留档。本轮为修宪轮（issue#6 批复承继，ADR-0017 在案），
> 工作树内已按授权重录 golden（REPORT §四：gate:update 恰一次）。

## 1. 合并事实

| 项 | 值 |
| --- | --- |
| 分支 | `feat/0037-iter`（6d038cd 产品提交 + 804701e 机制件提交） |
| 合并前主干 | 083a9a4（工作区干净，`git status` 无未提交改动） |
| 合并命令 | `git merge --no-ff feat/0037-iter` |
| 合并提交 | **`c0cb38e`**（merge(evolution): 合并迭代 0037 节点库「智能体」类目） |
| 合并结果 | 'ort' 策略自动合并成功，**55 文件 +1593/−8，零冲突** |

## 2. 冲突清单与解决方式

**检出冲突文件：无**（空数组）。全程零冲突块，无 `<<<<<<<`/`=======`/`>>>>>>>`
残留核查项。两侧均改动的 4 个产品文件（`apps/web/src/app.css`、
`apps/web/src/legacy/app.js`、`packages/shared/test/contract.test.mjs`、
`packages/shared/test/nodes.baseline.json`）改动位置互不交叠，git 自动合并；
仲裁员逐文件核对合并语义（0034 教训：自动合并 ≠ 语义正确）：

- `app.css`：`--cat-agent:#14b8a6` 插入 `:root` 色板，主干既有变量零丢失；
- `legacy/app.js`：CATS 表与 catColor 映射各加 `agent` 行，主干侧（0035 渲染
  承载）改动完整保留；
- `contract.test.mjs`：cat 合法值表加 `agent`；节点数断言保持主干侧 **20**
  （0037 只改类目不加节点，jsoncanvas 不丢——合流后两路之和正确）；
- `nodes.baseline.json`：仅 `agent.cat: chat→agent`，主干 jsoncanvas 条目不受影响。

## 3. 合并后收口：s12 场景 DOM 不变量合流缝隙（首跑红 → 同步 → 复跑绿）

合并提交完成后的复测 gate **首跑红**（`evidence/gate-first-run.log`）：

```
✗ s12-jsoncanvas-node FAIL · diffPx=0 · DOM不变量变化
```

**根因**：两路修宪轮的合流缝隙。0037 在工作树重录 golden 时其基线（merge-base
915e131）尚无 s12 场景（s12 是主干侧 0035 新增），物理上无法覆盖；而 0037 获批
变更（issue#6 / ADR-0017）在 `:root` 新增 `--cat-agent:#14b8a6`，波及**全部场景**
的 CSS 变量不变量——s0~s11 已随 0037 分支重录同步，唯 s12 停留在 0035 时代的
7 类目变量表。像素 diffPx=0（渲染结果零变化），仅 cssVars 键差一个条目
（逐键 diff 核实：golden 与 current 唯一差异即缺 `--cat-agent`，其余键全同）。

**处置**：按 WORKFLOW.md §4 合流裁决先例（0033/0034：像素内容零变化的 golden
整理属改名/同步而非重录，且「以实跑值为准，不得手编」），执行主干侧
`npm run gate:update` 一次，由门禁引擎自采不变量；随后最小化收口——
`git checkout` 恢复重录产生的 11 个 invariants 行尾噪音与 s3-library.png 的
16 字节 PNG 编码翻转（0037 版 golden 首跑已证 diffPx=0 像素一致），**最终
golden 净变更仅 1 行**：

```diff
--- a/tests/golden/ui/s12-jsoncanvas-node.invariants.json
+++ b/tests/golden/ui/s12-jsoncanvas-node.invariants.json
   "--cat-chat": "#a06bff",
+  "--cat-agent": "#14b8a6",
   "--cat-knowledge": "#22c55e",
```

收口后 gate 复跑 13 场景全绿（§4）。本轮 gate:update 计两次语境：工作树内一次
（重录 s0~s11，REPORT §四在案）+ 主干收口一次（同步 s12，对象在工作树重录时
不存在）——两次均属 issue#6 修宪轮授权范围内，如实记录。

## 4. 主干端到端复测（merge-arbiter 实跑）

| 项 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| build | `npm run build` | ✅ exit 0（shared tsc + web vite 69 modules / 701ms） | `evidence/build.log` |
| gate | `npm run gate` | ✅ exit 0 · **13 场景全 pass diffPx=0**（含收口后 s12） | `evidence/gate.log` |
| test | `npm test` | ✅ exit 0 · **30/30**（20 种节点 / 38 参数 / README 回比 / 生成器幂等全过） | `evidence/test.log` |
| smoke | `npm run smoke:server` | ✅ exit 0 · **125 passed / 0 failed** | `evidence/smoke.log` |

**REPORT §九遗留闭环**：smoke **V09 在主干提交态自愈 PASS**（`git status
--porcelain -- packages/shared` 为空，DEFS 零漂移）——0037 REPORT 预告的
「迭代内未提交态必假红」在工作树内成立，主干复测实跑证实自愈。

### 4.1 过程注记：s3-library 本机采样抖动（非本轮缺陷）

收口验证期间对 s3-library 同一 golden 同一 dist 共 5 次采样，
diffPx = **0 / 23 / 0 / 21 / 0**（pass/fail 交替，最终留档运行为全绿 pass）。
调查结论：

- 差异像素仅聚集于**左侧图标栏底部两图标字形边缘**（x 20-30，y 792-887），
  同色系灰阶 ±6 的抗锯齿亚像素漂移（逐像素 RGB 核实）；
- s3 的 DOM 不变量**逐键全同**（结构/矩形/计数零变化）；
- gate 引擎已有 `document.fonts.ready` + 1000ms settle（`gate.mjs:286-287`），
  竞态仍偶发——本机 Chromium 字形光栅化非确定性；
- 0037 改动面（CSS 变量 / CATS / catColor / 库面板分组）不触及 rail 图标
  渲染路径；0035 轮 evidence 的 01~03 三场景截图 bytes 与本轮完全一致
  （76884/91689/94615），跨轮确定性佐证。

定性：**存量本机环境抖动，非 0037 变更所致**；golden 权威在 CI
（windows-latest，AGENTS.md 在案），本机差异仅参考。推送后须盯
`ui-constitution` required check，CI 红则按宪法流程处置。

## 5. 图像证据

`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0037/evidence`
→ exit 0，4 张确定性截图 + `manifest.json`（sha256 + viewport 1600×900）：

| 场景 | 文件 | bytes | sha256（前 8 位） | 与 0035 轮对照 |
| --- | --- | --- | --- | --- |
| 01-initial | `01-initial.png` | 76884 | c98852a5 | 同（零接触面） |
| 02-node-selected | `02-node-selected.png` | 91689 | 51dc09c7 | 同（零接触面） |
| 03-settings | `03-settings.png` | 94615 | f20c748d | 同（零接触面） |
| 04-library | `04-library.png` | 119520 | 404b62d7 | 变（预期：agent 独立分组 + 类目色 #14b8a6 + jsoncanvas 在列） |

manifest `renderedNodes=19` 为初始画布 DOM 节点实例数（`evidence.mjs:107`
统计口径），与节点类型注册表 20 类型为两个维度，与 0034/0035 轮同值。
04-library 较 0035 轮（121140B）变 119520B：库面板分组重排（「智能体」
独立分组插入）+ jsoncanvas 条目在列，属本轮获批变更的预期像素结果，
且已由 gate s3 场景 diffPx=0 背书。

## 6. 遗留与后续

- **CI 权威复核**：本轮 golden 净变更（s12 不变量 +1 行）与 s3 本机抖动均以
  CI `ui-constitution` 为准，推送后盯查。
- **issue#6 回执与最终记账**：BK-0050 置 done、STATE/BACKLOG/metrics 记账、
  issue 关单归 CLOSE 阶段（协调者），主干 STATE 现仍为 0036 记账态，未越权改动。
- **s3 抖动观察**（非阻断）：建议后续治理日在 CI 复采样确认；若 CI 亦抖动，
  考虑 gate 引擎为 rail 图标区增加字形就绪双重等待。
