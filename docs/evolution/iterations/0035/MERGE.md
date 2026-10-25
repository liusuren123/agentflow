# MERGE · 迭代 0035（BK-0038 JSON 画布节点 jsoncanvas · 修宪轮批次 3 · BK-9003 链终轮）

> 合并仲裁员（merge-arbiter）在主干 main 上执行 `git merge --no-ff feat/0035-iter`，
> 完成冲突仲裁（零冲突）、合并后收口（补交漏提交节点目录）、主干端到端复测与证据留档。
> 本轮为修宪轮（issue#3 批复承继，ADR-0015 §5 链终轮），golden 新场景 s12 随分支合入。

## 1. 合并事实

| 项 | 值 |
| --- | --- |
| 分支 | `feat/0035-iter`（15f3502 产品提交 + 8692040 机制件提交） |
| 合并前主干 | 915e131（工作区干净，`git status` 无未提交改动） |
| 合并命令 | `git merge --no-ff feat/0035-iter` |
| 合并提交 | **`1e770d1`**（merge(evolution): 合并迭代 0035 呈现三件套·JSON 画布节点） |
| 合并结果 | 'ort' 策略自动合并成功，**21 文件 +1463/−22，零冲突** |

golden 场景号核对：主干原有 s0~s11，本轮新增 s12-jsoncanvas-node，无撞号
（链终轮前序 s10-webshow / s11-termview 已在 0034 合流时按落盘时序裁决定号）。

## 2. 冲突清单与解决方式

**检出冲突文件：无**（空数组）。合并全程零冲突块，无 `<<<<<<<`/`=======`/`>>>>>>>`
残留核查项。两侧改动无同位置交叠：本轮产品改动（nodes.ts、handlers.ts、app.js、
app.css、gate.mjs、smoke、4 个契约测试、生成器）在主干侧自 0034 收口后无并发修改。

## 3. 合并后收口：jsoncanvas 节点目录漏提交（build 拦截 → 补交）

合并提交完成后的首轮 `npm run build` **红**（exit 2）：

```
src/nodes.ts(38,27): error TS2307: Cannot find module './nodes/jsoncanvas/node.js'
  or its corresponding type declarations.
```

**根因**：产品提交 15f3502 漏了 BUILD 新建的节点目录
`packages/shared/src/nodes/jsoncanvas/{node.ts,README.md}`——分支内 nodes.ts:38
引用悬空模块，工作树内门禁因磁盘上文件存在而通过、分支本身编译不过，合并到主干
被 tsc 拦下。与迭代 0034 termview 目录漏提交**同款**（WORKFLOW.md §4 与
`b1be4f3` 先例在案；0034 后工作流脚本已改跨轮累积并集，本轮仍复发，工作流侧
根因待复查——见 §6 遗留）。

**核实**（合并后主干 vs 工作树磁盘，`diff -r --strip-trailing-cr`）：
`packages/shared/src`、`apps/server/src`、`apps/web/src`、`tests/smoke`、`tools`
五处产品目录除 `jsoncanvas` 目录缺失外**零实质差异**（其余 differ 均为 CRLF/LF
行尾伪影，与 0034 先例记录一致）；PRD §受影响文件清单（0035/PRD.md:181-199）
逐项比对，缺口恰为该两文件。

**处置**（按 `b1be4f3` 先例，内容零改动仅补交）：经 Mimosa PreToolUse 检查
（Bash cp 被拒改用 Write 提交同一内容）补交两文件，
提交 **`f3fc830`** fix(node): 补提交 BK-0038 首轮新建的 jsoncanvas 节点目录
（+55 行：node.ts 25 + README.md 30，core.autocrlf 规范化与仓库既有文件一致）。
补交后重跑复测四项全绿（§4）。

## 4. 主干端到端复测（merge-arbiter 实跑）

| 项 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| build | `npm run build` | ✅ exit 0（shared tsc + web vite 712ms） | `evidence/build.log` |
| gate | `npm run gate` | ✅ exit 0 · **13 场景全 pass diffPx=0**（s0~s11 零波动 + 新场景 s12-jsoncanvas-node） | `evidence/gate.log` |
| test | `npm test` | ✅ exit 0 · **30/30**（快照对 20 键基线逐字节等价） | `evidence/test.log` |
| smoke | `npm run smoke:server` | ✅ exit 0 · **125 passed / 0 failed**（0034 基线 118 + jsoncanvas 组 7 条） | `evidence/smoke.log` |

四项全绿。本轮虽为修宪轮，复测 gate 一次通过、**未触发 gate:update**（无需重录）。

## 5. 图像证据

`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0035/evidence`
→ exit 0，4 张确定性截图 + `manifest.json`（各场景 sha256 + viewport 1600×900）：

| 场景 | 文件 | bytes | sha256（前 8 位） |
| --- | --- | --- | --- |
| 01-initial | `01-initial.png` | 76884 | c98852a5 |
| 02-node-selected | `02-node-selected.png` | 91689 | 51dc09c7 |
| 03-settings | `03-settings.png` | 94615 | f20c748d |
| 04-library | `04-library.png` | 121140 | c84b98b5 |

manifest `renderedNodes=19` 为初始画布 DOM 节点数（golden 冻结场景，
`evidence.mjs:107` 统计 `#world` 内 .node/svg/canvas 元素），与节点**类型注册表
20 类型**（本轮 +jsoncanvas）为两个维度，预期一致（0034 manifest 同值）。

## 6. 遗留与后续

- **文案漂移（非阻断）**：`packages/shared/test/synthesis.test.mjs:60` 测试描述
  仍写「19 键全量」，实际断言对 20 键基线（nodes.baseline.json 含 jsoncanvas）
  逐字节等价且通过——仅描述字符串未随 0035 更新，留待后续 doc 项顺手校正。
- **工作流脚本根因待复查**：productFiles 跨轮累积修复（f009036）后本轮仍漏交
  新建节点目录，建议治理日核查 `.zcode/workflows/evolution-iteration.dwf.ts`
  累积逻辑是否被本轮运行实际加载。
- **Mimosa 提交前扫描覆盖度降级**（library_source_limit_exceeded /
  callgraph_partial，按兼容策略放行）：不据此宣称项目安全，留待完整审计。
- **BK-9003 链闭合**：BK-0036 webshow（0033）/ BK-0037 termview（0034）/
  BK-0038 jsoncanvas（0035）三件套全部落主干；issue#3 关单与 STATE/BACKLOG/
  metrics 最终记账归 CLOSE 阶段（协调者），主干 STATE 现仍为 0034 记账态
  （iteration=0035 / phase=idle），未越权改动。
