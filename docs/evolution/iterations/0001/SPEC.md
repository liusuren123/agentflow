# SPEC · 迭代 0001 · BK-0001 现状盘点：技术规格

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 00:31
> 输入：`docs/evolution/iterations/0001/PRD.md`（REQ-0001-01~05 / AC1–AC5）；
> 上游文档：ADR-0002（`docs/adr/0001-0003-constitution-mechanical-port-shared.md:15-45`）、
> `docs/evolution/ROADMAP.md`、`docs/evolution/weekly/43.md` §二。
> 触 UI 分类：**否**（与 PRD 一致；本规格不含任何代码改动，BUILD 的「实现」=
> 执行本规格第 1–3 节的核对命令、按第 5 节回写 ROADMAP、把证据沉淀进 JOURNAL）。

## 0. 任务定性与技术方案概述

纯文档盘点项（doc / S）。技术方案 = **只读核对 + 定向回写**：

1. 以仓库现状逐项核对 ADR-0002 三条 CP 的最终形态（第 1 节核对矩阵）；
2. 采集命令基线证据（第 3 节）；
3. 把核对结论与移植余量按第 4–5 节的编辑方案回写 `docs/evolution/ROADMAP.md`。

无源代码改动、无新依赖、无渲染路径接触、无架构选型（→ 不提 ADR 草案，见第 9 节）。
SPEC 阶段已做只读初核（证据已在本文中标 `路径:行` 或命令输出），**正式留证由 BUILD
执行并在 JOURNAL 记录**（PRD 背景 4 的分工）。

## 1. CP 落地状态核对矩阵（REQ-0001-01 / AC3）

BUILD 逐行执行；每行产出「一致 / 不一致 + 证据」。SPEC 阶段初核结论列于末列，
BUILD 必须复跑留证，不得直接抄用。

### CP-B（最终形态：构建链 + 托管 + 门禁 target）

| # | 核对点 | 期望（ADR-0002 CP-B 最终形态口径） | 检查方式 | SPEC 初核 |
| --- | --- | --- | --- | --- |
| B1 | Vite + React 18 + TS + singlefile 构建链在位 | `apps/web/package.json` 声明 react ^18.3.0 / vite ^5.4.0 / typescript ^5.6.0 / vite-plugin-singlefile ^2.0.0；`apps/web/vite.config.ts` 启用 `react()` + `viteSingleFile()` | 读文件比对 | 一致（`apps/web/package.json:14-23`、`apps/web/vite.config.ts:6-7`） |
| B2 | server 托管 `apps/web/dist` | server 启动时从 dist 托管 index.html，缺失时 fatal 提示 | 读 `apps/server/src/server.ts:50-54` | 一致（`WEB_INDEX = ROOT/apps/web/dist/index.html`） |
| B3 | 门禁默认 target 为构建产物 | gate 无 `--target` 时默认校验 `apps/web/dist` | 读 `tools/pixel-gate/gate.mjs:22-26` | 一致（默认 `path.join(ROOT,'apps','web','dist')`，缺 index.html 时 exit 2） |
| B4 | `?raw + dangerouslySetInnerHTML` 中间形态已被 CP-C 取代 | `apps/web/src` 内零残留（与 AC1 同一检查，见第 2 节） | grep × 2 | 一致（初核 0 匹配，exit=1；BUILD 复跑留证） |

### CP-C（等价 JSX 骨架）

| # | 核对点 | 期望 | 检查方式 | SPEC 初核 |
| --- | --- | --- | --- | --- |
| C1 | `Skeleton.tsx` 为唯一骨架源 | `apps/web/src` 下骨架 JSX 仅存在于 `Skeleton.tsx`；`App.tsx` 仅 `return <Skeleton />` + `useEffect(bootLegacyApp)` | 读 `apps/web/src/App.tsx:8-15` + `ls apps/web/src` | 一致（src 树仅 App/Skeleton/main/app.css/legacy/server-sync） |
| C2 | `skeleton.html` 不在工作区 | `git ls-files` 无 skeleton.html；工作区无该文件 | `git ls-files \| grep -i skeleton` + `ls` | 一致（仅 `apps/web/src/Skeleton.tsx`；删除发生在提交 828ae57，同提交 stat：skeleton.html −168 行 / Skeleton.tsx +182 行） |
| C3 | 原文权威在 git 历史 | `git log --follow` 可溯 skeleton.html（520d918 引入 → 828ae57 删除） | `git log --oneline --follow -- apps/web/src/skeleton.html` | 一致（两条提交可溯） |

记档差（不构成不一致）：ADR-0002 CP-C 记「约 170 行」，实测 `Skeleton.tsx` 182 行
（`wc -l`）。在「约」的容差内；核对点是结构性的（唯一源/已退役），行数不进关账判定，
仅在盘点结论中如实记档。

### CP-D（shared 单一事实源 + 托管 + 门禁）

| # | 核对点 | 期望 | 检查方式 | SPEC 初核 |
| --- | --- | --- | --- | --- |
| D1 | legacy 消费 `@agentflow/shared` | `legacy/app.js` 从 shared 导入 NODES，无本地 DEFS 字面量 | 读 `apps/web/src/legacy/app.js:3` 与 `:133`（`const DEFS = NODES;`） | 一致 |
| D2 | server 托管 dist / 门禁 target 构建产物 | 同 B2/B3（一条证据两用，JOURNAL 中注明） | 同 B2/B3 | 一致 |
| D3 | 原单文件 index.html 与提取工具退役 | 仓库根无 `index.html`（原单文件）且 `tools/extract-web.mjs` 不在工作区与 git 索引。**注意辨析**：`apps/web/index.html`（12 行，`<div id="root">` + `/src/main.tsx`）是 Vite 构建链的合法入口（CP-B 最终形态的组成部分），不是原单文件，**应当存在** | `git ls-files \| grep -E "^index.html|^tools/extract-web"`（期望无匹配）+ 仓库根 `ls index.html tools/extract-web.mjs`（期望 No such file） | 一致（初核：git 索引无匹配、根工作区均不存在；extract-web.mjs 末次变更于退役提交 2e36688） |

**判定规则**：全部一致 → T1-M1 具备关账条件（还需第 2/3 节通过）；任一不一致 →
T1-M1 不关账，缺口 + 证据写入 ROADMAP（PRD 风险 1），本迭代仍算成功交付。

## 2. 残留注入路径检查（REQ-0001-02 / AC1）

命令原文（在仓库根执行，输出全文贴 JOURNAL，含退出码）：

```bash
grep -rn "dangerouslySetInnerHTML" apps/web/src
grep -rn "?raw" apps/web/src
```

通过标准：两条均 0 处匹配（grep 退出码 1）。SPEC 阶段初核：两条均 0 匹配、exit=1
（2026-10-22 SPEC 阶段复跑，与 PRD 背景 4 的 PLAN 初查一致）。出现任何匹配 → 如实入 ROADMAP
缺口，T1-M1 不关账，不得隐藏。

## 3. 基线证据（REQ-0001-03 / AC2）

在仓库根按序执行，输出摘要（关键行 + 计数）贴 JOURNAL，并标注运行环境
（本机 Windows Git Bash；CI windows-latest 为权威——AGENTS.md 已知陷阱，PRD 风险 2）：

| 序 | 命令 | 通过标准 | 对照基线（weekly/43.md §二，2026-10-22 治理日） |
| --- | --- | --- | --- |
| 3.1 | `npm run build` | 退出码 0（= build:shared + build:web，`package.json:16`） | vite 48 modules、dist 331.21 kB、tsc 0 错误 |
| 3.2 | `npm run gate` | 4 场景（s0-initial / s1-select-node / s2-settings / s3-library）全部 `diffPx=0` 且无 DOM 不变量变化，末行「宪法门禁：通过 ✓」，退出码 0 | 4 场景 diffPx=0 |
| 3.3 | `npm test` | 5/5 通过（= build:shared + shared 契约测试，`package.json:18`） | tests 5 / pass 5 / fail 0 |

基线数字（48 modules / 331.21 kB / 5/5）仅作对照参考；通过标准以命令退出码与
gate 场景行为准，构建体积自然漂移（±）不构成 FAIL，如实记录即可。

## 4. 移植余量清单（REQ-0001-04）

BUILD 产出清单（进 JOURNAL，结论性行回写 ROADMAP），以 SPEC 已核实的现状为底稿：

### 4.1 三模块职责现状（证据已在 SPEC 阶段核实）

| 模块 | 行数（`wc -l` 实测） | 职责现状 | 边界记载位置 |
| --- | --- | --- | --- |
| `apps/web/src/Skeleton.tsx` | 182 | 静态骨架等价 JSX（CP-C 机械转换规则的落地载体） | 文件头注释（Skeleton.tsx:1-7）+ AGENTS.md 仓库地图 |
| `apps/web/src/legacy/app.js` | 2419 | 画布/交互命令式模块（逐字提取 + `bootLegacyApp` 包装，幂等单次挂载） | 文件头注释（app.js:1-2）+ App.tsx:1-7 |
| `apps/web/src/server-sync.js` | 131 | `/api/v1` 数据接入层（fetch 封装 + 列表缓存 + 事件回放映射；头注声明「不直接操作面板 DOM」） | 文件头注释（server-sync.js:1-9） |
| `apps/web/src/app.css` | 532 | CSS 原文（逐字，勿改） | AGENTS.md 硬性约定 1 |

**T1-M2 差距结论（模板）**：职责边界目前散落在各文件头注 + AGENTS.md 仓库地图，
无独立的边界说明文档合入 `docs/` —— 即 T1-M2（未开始）的全部余量；本迭代只确认差距
并细化其验收口径（见第 5 节），不产出边界文档本身（PRD 非目标）。

### 4.2 其他余量盘盘点（如实记档，不在本迭代改变）

1. `app.css` 逐字等价目前无专用自动断言，由 gate（像素 0 容差 + DOM 不变量，含 32 个
   `:root` CSS 变量表比对，`tools/pixel-gate/gate.mjs:84-100`）间接保护——现状成立，
   记录事实即可。
2. `legacy/app.js` 2419 行：AGENTS.md 硬性约定 4 的 400 行上限只约束**新增**源文件，
   存量不违例；作为长期模块化候选记入余量（是否立项由 CLOSE 决定，本迭代不扩scope）。
3. ADR-0002 CP-C「约 170 行」vs 实测 182 行的记档差（见第 1 节 CP-C 说明）。

## 5. ROADMAP 回写方案（REQ-0001-05 / AC4）

只编辑 `docs/evolution/ROADMAP.md`，编辑点与手法：

| 编辑点（现行号） | 手法 |
| --- | --- |
| T1-M1 状态行（ROADMAP.md:16-20） | 全一致 → 置「已完成（迭代 0001 盘点关账）」，证据指针指向本迭代 REPORT/JOURNAL 与命令输出摘要；有缺口 → 状态改「部分完成」，逐条列缺口 + 证据。删除「待 BK-0001 交叉核对手工关账」的过渡表述 |
| T1-M2 条目（ROADMAP.md:21-25） | 细化为带验收口径的条目：验收 = ①边界说明文档合入 `docs/`（覆盖 4.1 节四模块，明确 Skeleton.tsx 只承载静态骨架 / legacy 画布命令式 / server-sync 数据接入不操作面板 DOM / app.css 逐字冻结）②合入后 `npm run gate` 4 场景全绿。附现状行数与头注证据指针 |
| 「待办（治理周维护）」节（ROADMAP.md:92-97） | 更新迭代 0001 首跳条目为关账结论摘要（一行，证据指针到迭代目录）；不动 ready 队列与待批准区行文（PM/CLOSE 职权） |

回写铁律：全文不得出现「看起来一致」类无证据表述（ROADMAP 头部口径，ROADMAP.md:5-7）；
每条完成度标注必须挂命令输出摘要或 `路径:行` 指针；增量精炼、条目可勾选（PRD 非功能 3）。
回写完成后重跑 `npm run gate` 确认 4 场景全绿（AC5，文档改动不得触碰渲染路径）。

## 6. 受影响文件清单

改动（产品面，随 BUILD 产品提交）：

- `docs/evolution/ROADMAP.md` —— 唯一产品性改动（第 5 节编辑点）。

新增（迭代产物，随归档提交；WORKFLOW §4 CLOSE）：

- `docs/evolution/iterations/0001/SPEC.md`（本文件）
- `docs/evolution/iterations/0001/JOURNAL.md`（BUILD 记录：核对矩阵执行结果 + 命令输出摘要）
- `docs/evolution/STATE.md`（phase 推进；协调者/阶段 agent 按契约更新）

明确不动（负面清单）：

- `apps/web/**`、`apps/server/**`、`packages/shared/**` —— 零代码改动，全程只读；
- `CONSTITUTION.md`、`AGENTS.md`、`tools/pixel-gate/**`、CI 配置（WORKFLOW §6 护栏 3）；
- `tests/golden/**` —— 不重录、不触碰（PRD 非目标；护栏 2）；
- `docs/evolution/BACKLOG.md` 待批准区（用户主权接口，PRD 非目标）。

## 7. 模块边界

本项的边界是**文档域 vs 代码域**：代码域（前端三模块 + shared + server）只读；
写入面仅 `docs/evolution/`。渲染路径三模块的职责现状即盘点对象（第 4.1 节），
BUILD 不得「顺手」修改任何被盘点对象——发现疑似不一致只记录、不修复（PRD 非目标 5，
修复立项由 CLOSE 处理）。ROADMAP 属 PM 维护文件，本迭代按 PRD 目标 3 授权 BUILD 代行
回写，范围限第 5 节编辑点，不改主题结构与 T2–T4 内容。

## 8. 验收口径（BUILD 自检 / VERIFY 依据；对应 PRD AC1–AC5）

| 门 | 命令 / 动作 | 通过标准 | 对应 AC |
| --- | --- | --- | --- |
| V1 | `npm run build`（仓库根） | 退出码 0，输出摘要留证 | AC2 |
| V2 | `npm run gate` | 4 场景 `diffPx=0` + DOM 不变量一致，「宪法门禁：通过 ✓」，退出码 0 | AC2/AC5 |
| V3 | `npm test` | 5/5 通过，输出摘要留证 | AC2 |
| V4 | 第 2 节 grep × 2 | 均 0 匹配（exit=1），输出全文留证 | AC1 |
| V5 | 第 1 节核对矩阵逐行执行 | 每行有「一致/不一致」+ 可复现证据；CP-B/D 共用证据注明 | AC3 |
| V6 | ROADMAP 审读 | 第 5 节编辑点全部落实；证据指针齐全；无「看起来」类表述 | AC4 |
| V7 | 手动 E2E 点位（轻量冒烟，证明文档改动后应用行为不变） | 见下 | AC5 |

手动 E2E 点位（BUILD 完成回写后在同一工作区执行；gate 已覆盖像素层，此处补行为证据）：

- **E2E-1** `npm start` → 打开 `http://localhost:3000`：首屏画布渲染 8 节点 / 7 连线
  （对照 golden s0 不变量实测值：nodes=8, edges=7, widgets=15, ports=15, tabs=1）。
- **E2E-2** 依次点击左侧 rail「设置 / 节点 / 历史 / 工作流」四个面板：可开合，
  视觉与基线一致（对应 gate 场景 s2/s3 的交互面）。
- **E2E-3** DevTools 控制台无新增报错（对比改动前启动一次为准）。

## 9. 架构决策

**无。** 纯盘点与文档回写，不涉及选型、不触契约、不引入依赖 → 不提 ADR 草案
（needsAdr=false）。

## 10. 风险与回退

- **本机 vs CI 差异**：gate 证据标注运行环境；CI（windows-latest）为权威（AGENTS.md
  已知陷阱 / PRD 风险 2）。
- **盘点发现不一致**：按 PRD 风险 1 处理——T1-M1 不关账、缺口如实入 ROADMAP、
  建议 BACKLOG 新项留 CLOSE；本迭代仍算成功交付。
- **回退**：纯文档改动，`git revert` 产品提交即可恢复，无代码耦合。
