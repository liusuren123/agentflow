# MERGE · 迭代 0034（BK-0037 终端只读流节点 termview）

> 本文件记录**并行合流**过程：迭代 0033（BK-0036 webshow）与迭代 0034（BK-0037 termview）
> 自同一基点 `84ee8ec` 并行推进，两路成果在主干合流时的裁决与收口。属 v3 工作树模型的
> 首个真实合流案例（合并仲裁员首跑）。

## 1. 并行事实

| 项 | 迭代 0033 | 迭代 0034 |
| --- | --- | --- |
| BACKLOG 项 | BK-0036（网页展示 webshow） | BK-0037（终端只读流 termview） |
| 分支 / 工作树 | `feat/0033-iter` | `feat/0034-iter` |
| 基点 | `84ee8ec` | `84ee8ec` |
| 场景号 | s10-webshow-node | s11-termview-node（合流后校正） |
| 授权链 | issue#3 批复承继（2026-10-23T15:49:32Z） | 同左 |

选题防撞项：迭代 0034 的 PM 首轮选中 BK-0036（与 0033 撞项）→ 脚本占位互斥检出
（`.zcode/locks/items/BK-0036` 已占）→ 要求重选 → 选中 BK-0037。PRD 留痕
「PLAN 轮重选，BK-0036 已被并行工作流占位故跳过」。

## 2. 场景号裁决

ADR-0015 §5 编排约定「场景编号按落盘时序」。两路自同一基点并行，各自按先到先得取了
`s10`：

- **裁决**：webshow 先落（迭代 0033）保留 `s10`；termview 后落（迭代 0034）改用 `s11`。
- **改动性质**：仅编号字面量与 golden 文件名，**场景内容与像素零变化**（png/invariants
  随之改名，字节不变）——非重录，不触宪法第 3 条重录通道。
- **依据**：issue#3 批复承继覆盖 BK-9003 链实现段三子项（BK-0036/0037/0038），
  ADR-0015 §5 明载「一节点一迭代一 ADR 增补」与场景时序约定。

## 3. 冲突清单与解决方式

合并仲裁员检出 5 个文件、7 处冲突块。**全部为「双方各自新增 / 各自更新状态行」型，
无语义对立**，故按并存原则解决（产品代码零丢内容）：

| 文件 | 冲突处 | 解决方式 |
| --- | --- | --- |
| `tools/pixel-gate/gate.mjs` | 1 | 场景表并列保留 `s10-webshow-node` + `s11-termview-node` |
| `packages/shared/src/nodes.ts` | 1 | 头部注释合并为 19 目录全量（含 termview + webshow） |
| `packages/shared/test/param-handler-guard.test.mjs` | 2 | 僵尸清单并列保留并按 NODES 声明序排列（termview 先于 webshow）；计数断言 38→40 |
| `tests/smoke/smoke-server.mjs` | 2 | O 组（webshow）+ T 组（termview）并列保留 |
| `docs/adr/0015-presentation-triplet-nodes.md` | 1 | 状态行合并为「BK-0036（迭代 0033）与 BK-0037（迭代 0034）实施轮均已消费，BK-0038 待实施（链终轮）」 |

### 3.1 一处工具级教训：机械「保留双方」会切碎块

首次机械拼接（逐冲突块取 ours+theirs）对 `tests/smoke/smoke-server.mjs` 造成语法错误：
git 对「两路在同一位置各自插入」的冲突会把块**切成碎片**（ours 段只有 `oRun` 开头半截、
theirs 段是完整 T 组），拼接后函数体截断（`Unexpected end of input`），冒烟脚本整体不可运行。

修正：恢复干净 ours（base+O 组），用 `git diff --unified=0` 取 theirs 的精确 hunk
（base 第 1037 行后插入 60 行 = 完整 T 组块），整体插入 O 组之前——两侧各自完整、
base 结构零改动。

## 4. 合并后集成收口

两路各自 +1，合并后计数为两路之和（18→19 节点、38→40 参数、18→19 目录）：

- 契约测试 6 处计数断言同步校正（19/40/19）
- `tools/gen-node-readmes.mjs` 护栏同步（键数 18→19、索引文案）
- `defs-drift` 期望表补 termview 默认值（`lines:200` / `autoscroll:true`）
- 节点 README 按生成器重跑（3 写 / 17 无变化）
- `nodes/README.md` 总索引 19 行

## 5. 主干端到端复测（merge-arbiter 实跑）

| 项 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| build | `npm run build` | ✅ exit 0 | `evidence/build.log` |
| gate | `npm run gate` | ✅ exit 0 · **12 场景全 pass diffPx=0**（s0~s9 零波动 + s10-webshow-node + s11-termview-node） | `evidence/gate.log` |
| test | `npm test` | ✅ exit 0 · 30/30 | `evidence/test.log` |
| smoke | `npm run smoke:server` | ✅ exit 0 · **118 passed / 0 failed**（原 113 + T 组 T01~T03 共 5 条） | `evidence/smoke.log` |
| 图像 | `wt.mjs evidence` | ✅ 4 张确定性截图 + manifest（含 4 场景 sha256 与渲染节点数 19） | `evidence/*.png` |

## 6. 遗留与后续

- **BK-0038（JSON 画布节点）待实施**（ADR-0015 §5 链终轮）→ issue#3 保持开放。
- **脚本缺陷已修**（工作流侧）：`productFiles` 白名单跨轮累积（修复轮覆盖首轮申报导致
  首轮新建文件漏提交，分支引用悬空模块）；证据落盘自检路径改为主干优先。
