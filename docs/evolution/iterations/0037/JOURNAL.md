# JOURNAL · 迭代 0037 · BK-0050 节点库「智能体」类目（BUILD 轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-26 00:48~00:53（首轮）/ 01:00~01:05（修复轮）·
> 工作树 `feat/0037-iter` 内。输入：`iterations/0037/PRD.md` + `iterations/0037/SPEC.md`
> （含 §2 PRD 勘误 5 项，BUILD 以 SPEC §3 终稿清单为准）。
> 授权链（承 PRD/SPEC 亲核，不重开）：issue#6 owner 批复 2026-10-24T08:38:51Z
> + ADR-0013 §2.4/§6:223 + ADR-0017（SPEC 阶段已落盘 `docs/adr/`）。

## 一、实现落盘清单（按 SPEC §3 白名单序，全部 ✓）

| # | 文件 | 动作 | SPEC 依据 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes.schema.ts` | `:15` CATEGORIES `'chat',` 后插 `'agent',` | §3 #1 | ✓ |
| 2 | `packages/shared/src/types.ts` | `:23` NodeCategory `'chat'` 后插 `\| 'agent'`（勘误 1 清单外必改点） | §3 #2 | ✓ |
| 3 | `packages/shared/src/nodes/agent/node.ts` | `:10` `category: 'chat'` → `'agent'`（唯一非纯插入点，一词） | §3 #3 | ✓ |
| 4 | `packages/shared/test/contract.test.mjs` | `:14` cat 白名单 `'chat',` 后插 `'agent',`（勘误 2） | §3 #4 | ✓ |
| 5 | `packages/shared/test/nodes.baseline.json` | §5 两步命令再生产 | §3 #5 | ✓（diff 恰 1 hunk/1 行，见二） |
| 6 | `apps/web/src/legacy/app.js` | CATS `chat:` 行后插 `agent:` 行 + catColor 映射 `chat:'--cat-chat',` 后插 `agent:'--cat-agent',`（纯插入×2） | §3 #6 | ✓ |
| 7 | `apps/web/src/app.css` | `:19` `--cat-chat:#a06bff;` 后插 ` --cat-agent:#14b8a6;`（纯插入×1） | §3 #7 | ✓ |
| 8 | `docs/node-definition-protocol.md` | `:121` 类目枚举串 chat 后插 agent | §3 #8 | ✓ |
| 9 | `tests/golden/ui/s3-library.*`、`s8-agent-node.*`、`s9-goal-panel-online.*` | 修宪轮重录 | §3 #9/§6.3 | **归脚本门禁轮**（gate:update 恰一次由脚本执行，本轮未跑 gate） |
| 10 | `tests/golden/ui/{s0,s1,s2,s4~s7,s10,s11}.invariants.json` | cssVars +1 键（勘误 5） | §3 #10 | 同上 |

## 二、baseline 再生产记录（SPEC §5，Git Bash 内执行）

```
npm run build:shared    # tsc 过（= types.ts 扩枚举自证，§8.1 之 build:shared 半）
node -e "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > packages/shared/test/nodes.baseline.json
```

`git diff -U0 -- packages/shared/test/nodes.baseline.json` 实测：**恰 1 hunk / 1 行**
（`@@ -155 @@` agent 块内 `"cat": "chat"` → `"cat": "agent"`；1 insertion 1 deletion，
其余 18 键逐字节不变）——与 SPEC §5 预期 diff 逐格吻合。

## 三、自测记录（本轮实际执行的命令；gate/gate:update/smoke 未跑，归脚本）

| 命令（工作树根执行） | 结果 |
| --- | --- |
| `npm run build:shared` | exit 0（tsc 编译通过） |
| §5 baseline 再生两步命令 | diff 恰 1 行（见二） |
| `npm test -w @agentflow/shared` | **30 tests · pass 30 · fail 0**（非根门禁 `npm test`——根门禁 = build:shared + build:server + 本测试，归脚本门禁轮；本轮为定向自测） |

关键测试逐项对照 SPEC §7 预期（实跑输出）：

- 契约「节点注册表完整：19 种节点」✓（cat 白名单已扩，`agent.cat='agent'` 合法）；
- 「快照常驻比对：NODES 运行时输出与迁移前基线逐字节等价（19 键全量）」✓
  （synthesis Buffer 级比对，baseline 再生后绿）；
- 「生成器确定性：temp 重生成 19 份产物与在库一致（幂等回比）」✓ —— 该测试在
  temp 内重跑生成器并与在库 README 逐字节回比，**等价覆盖 SPEC §8.5「agent README
  无变化」**（本轮未单独直跑 `node tools/gen-node-readmes.mjs`，以该测试实跑为证）；
- schema 正/负例、caps 固定序、params 声明序、可写性断言全绿（30/30）。

零接触面机器核对（SPEC §8.7 前半）：`git diff -- apps/server
packages/shared/src/events.ts packages/shared/src/nodes.ts apps/web/src/Skeleton.tsx
tools/pixel-gate/gate.mjs tests/smoke` 输出 **0 行**；`git status --porcelain` 改动
文件恰为 §3 #1~#8 + 机制件（STATE.md/iterations/0037//ADR-0017）。

## 四、实现要点

1. **五处插入位一致（§4.1）**：schema 枚举 / types 联合 / CATS / catColor 映射 /
   CSS 变量全部取 chat 之后，`Object.entries(CATS)` 键序即分组渲染序，终态分组序
   输入/对话/**智能体**/知识/工具/逻辑/输出/人工。
2. **类目色（§4.2）**：`--cat-agent:#14b8a6`（teal-500，SPEC 定稿值）；CATS.agent.c
   = `var(--cat-agent)` → catColor('agent') 消费链单点闭合，无 #666 回退风险路径。
3. **数据流（§4.3）**：node.ts category 一词 → zod 枚举（已扩）→ synthesize
   `cat: def.identity.category` 自动流过 → 前端 `DEFS = NODES` 命中新分组；
   搜索行为自动获得（分组名 `cfg.name` 参与搜索串），零额外代码。
4. **发现清单外必改点：无**。SPEC §2 勘误 1/2（types.ts / contract.test.mjs）已在
   §3 终稿清单内兑现；实现过程未再遇到清单外必改点，无需中止条款。

## 五、遗留（归脚本门禁轮与 VERIFY，非本轮缺口）

1. `npm run build`（全量）→ `npm run gate` 实跑对照 SPEC §6.2 预期红模式表
   （s3/s8/s9 diffPx>0 + 9 场景 diffPx=0·invDiff；**不符任一格即中止排查**）；
2. diff 产物拷贝到 `iterations/0037/gate-diff-pre-update/`（gate 全绿会被自动清空，
   必须先拷，§6.3-2）；
3. `npm run gate:update` **恰一次** → 连续两轮 `npm run gate` 12 场景 diffPx=0；
4. 根 `npm test` 全量 + `npm run smoke:server` 零回退（§8.3/8.4）；
5. 手动 E2E 五点位（§8.6，`npm start` 后浏览器实走：智能体分组 cnt=1 / 对话组
   回两行 / agent 节点标题栏 #14b8a6 实值 / 搜索「智能体」命中 / 既有七分组零变化）；
6. §8.7 后半（`git show --numstat` 十行清单核对）归 CLOSE。

## 六、修复轮记录（round 2 · 2026-10-26 01:00~01:05，门禁轮后派发）

### 6.1 脚本门禁轮实际序列（mtime 证据，本轮亲核）

- **00:54:49~00:55:11** `npm run gate` 实跑：12 场景逐个落
  `tests/golden/diff/{id}.current.png + .invariants.json`，仅 s3/s8/s9 另落
  `.diff.png`——**与 SPEC §6.2 预期红模式表逐格吻合**（s3/s8/s9 像素红 + 全 12 场景
  invDiff）。
- **00:55:17~00:55:40** `npm run gate:update` 恰一次：12 份 golden png+invariants
  全量重录。
- 此后至本轮结束**未再跑 gate**（diff/ 目录未被清空、无更新 .current 产物）——
  §6.3-4 的连续两轮确认 gate 留待脚本修复轮后执行。

### 6.2 发现的问题与处置

**问题①（流程缺口，已修复）**：SPEC §6.3-2 强制的「gate:update 前先拷贝 diff 产物」
未执行——`iterations/0037/gate-diff-pre-update/` 原不存在，而宪法第 3 条「前后对比」
证据仍完整存于 `tests/golden/diff/`（尚未被全绿清空）。**本轮已补拷**：27 个文件
（12 current.png + 12 invariants.json + 3 diff.png）→
`docs/evolution/iterations/0037/gate-diff-pre-update/`（ls 实数 27 ✓）。该目录属
机制件（docs/evolution），不入 productFiles。

**问题②（实证修正，非实现缺陷，记录供 VERIFY/ADR 复核）**：SPEC §6.2 与 PRD
REQ-0050-03② 均称 s8/s9 波及源含「agent 节点**标题栏** `--nc` 紫→teal」。实证
（本轮 pngjs 像素簇分析 + 直接采样）：

- `--nc` 在 `app.js:763` 设置后**全仓零消费**（`grep -rn "var(--nc" apps/web/src/`
  零命中）——冻结 UI 的画布节点标题栏本就渲染 `--node-bg #353535`，不取类目色
  （两版 golden 标题栏像素同为 #353535）。
- s8 像素差 **diffPx=1720，全部**位于 x1175-1250 / y750-825 小地图区：旧色簇
  `#714fb3`、新色簇 `#168179` = `#a06bff`→`#14b8a6` 各经 globalAlpha .65 混
  `#171718` 底的期望值（app.js:1110 小地图填充，逐值对得上）；
- s9 像素差 **diffPx=961**，同源小地图残余露边（goal 面板 1222-1582 遮挡大部，
  与 §6.2 s9 描述的「残余露边同源变色」一致）；
- s8/s9 nodes 矩形/counts 不变量零变化（§6.2 硬边界守住 ✓）。

即：**实现与授权面完全正确**（类目色在库分组/搜索面板/属性面板/小地图四处消费面
如常生效），仅 SPEC 对 s8/s9 像素波及源的归因写多了一处「标题栏」。VERIFY 注意：
§8.6 E2E ③ 只能以 **DevTools 计算值口径**验证（agent 节点元素 `--nc` 计算值
= `#14b8a6`，catColor 正常解析非 #666 回退）——「标题栏像素变 teal」的口径在冻结
UI 下不成立，不应据此判 FAIL。

**其余核对（全吻合，零意外波及）**：

- 12 份 invariants diff 每份恰 1 行 `+  "--cat-agent": "#14b8a6"`（§2 勘误 5 精确兑现）；
- git golden 变更集 = 3 份 png（s3/s8/s9）+ 12 份 invariants.json，9 份 png 不出现
  （§6.3-3 预测逐格吻合）；
- 当前渲染与重录 golden 逐字节一致：s0/s3/s8/s9/s10 五场景 `cmp` current vs golden
  全 IDENTICAL（重录确定性自证，脚本后续两轮确认 gate 预期全绿——本轮未自行运行）；
- s3 diff.png 视觉核验（图像分析）通过：变更全部集中于左侧节点库列表（新「智能体」
  组插入致其下分组整体下移），canvas/顶栏/右侧面板零变化。s8 diff.png 图像服务两次
  400 解析错误，改用上述像素簇分析完成等价核验。

### 6.3 修复轮零产品代码改动

本轮未改任何产品文件（问题①是证据拷贝、问题②是记录修正）；productFiles 维持
首轮 23 路径累积并集不变（WORKFLOW §4「跨修复轮累积并集，不可覆盖」）。
