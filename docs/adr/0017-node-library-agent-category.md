# ADR-0017 · 节点库「智能体」独立类目与类目色（--cat-agent）

- 状态：**已获用户 issue #6 批复（owner 评论「批准」2026-10-24T08:38:51Z，
  PRD 迭代 0037 PLAN 轮 gh 亲核在案）· BK-0050 实施轮（迭代 0037）消费**
- 日期：2026-10-26（迭代 0037 SPEC 阶段产出）
- 关联：ADR-0013 §2.4（类目色两段口径——本 ADR 的源头预案）/§6:223（golden
  预案行）/§9（明文 BK-0050「不在本 ADR 射程」——本 ADR 即该缺口的专属载体）；
  CONSTITUTION 第 3 条（修宪通道）；POLICY.md 需批准区（`packages/shared`
  DEFS 变更 / UI 三层 / golden）；BACKLOG BK-0050（ui-proposal / P0 / S /
  ready / issue#6）；BK-9006 五子项之一；ROADMAP T5-M3 智能体工作台 UI
  （「BK-0050 节点库智能体类目随 0033 落地后可插入」——插入条件已随迭代
  0031 终态 done 兑现）；迭代 0037 SPEC（影响面与验收的权威细化）
- 版式对齐：ADR-0009 / ADR-0013

> **显著声明：本 ADR 为已获批修宪决策的记录载体，不实施任何代码。全部 DEFS /
> 前端 / golden 改动归迭代 0037（BK-0050）实施轮——授权链 = issue#6 批复
> （不重开 needs-approval）+ ADR-0013 §2.4/§6:223 预案承继 + 本 ADR。**
> 与迭代 0031「零新 ADR」先例的差异：ADR-0013 §8 明载 BK-0033/0034 实施定界，
> 而 §9 明文将 BK-0050 排除在射程外——宪法第 3 条要素①（动机/影响面/像素
> 对比证据）在本变更上无既有 ADR 承载，故由本 ADR 补齐。

## 1. 动机

T5 差异化主轴是「画布编排 × 深度智能体工作台」（ROADMAP.md:124-130），节点库
是用户感知能力地图的第一入口。agent 节点（迭代 0031 / BK-0033 落地）现归
「对话」类目（ADR-0013 §2.4 两段口径第一段：agent 入列时独立类目尚未获批，
暂借 chat 组 + `--cat-chat` 紫色）——通用智能体（自主工具循环 + 持久会话 +
goal 面板）与单轮 LLM 对话节点（llm/prompt）同组同色，弱化了差异化主张；
issue#6 原文五要点之一即「独立『智能体』分组让能力地图与叙事对齐」。前置
BK-0033 已 done（agent 节点在库），「空类目无意义」的依赖已解（BACKLOG
BK-0050 行）；ROADMAP 待办节实施序列「随 0033 落地后可插入」条件兑现。

## 2. 决策

1. **shared 契约**：`CATEGORIES` 枚举（nodes.schema.ts:15）与 `NodeCategory`
   类型（types.ts:23）各 +`'agent'`（chat 之后）；agent 节点
   `identity.category` `'chat'`→`'agent'`（nodes/agent/node.ts:10 一词）；
   `nodes.baseline.json` 按迁移 SPEC §2 命令再生产（恰 agent 块 1 行 cat 值
   变化，其余 18 键逐字节不变）。
2. **前端（纯插入）**：CATS +`agent:{name:'智能体',c:'var(--cat-agent)'}`（
   app.js:49，chat 后——`Object.entries(CATS)` 序即节点库分组渲染序）；
   catColor 映射 +`agent:'--cat-agent'`（app.js:131）；`app.css` `:root`
   +`--cat-agent:#14b8a6`（:19，chat 后）。
3. **色值 #14b8a6（teal-500）**：承接 issue#6 链 PRD 建议值；与既有七色的
   区分度与色板族一致性论证见迭代 0037 SPEC §4.2（七色中五色为 Tailwind
   标准板，teal-500 同族；色相 173° 与绿/青亮度差显著、与其余五色距 ≥44°）。
4. **零接触面**：SSE 事件契约（events.ts）、gate.mjs 场景表、后端（grep 亲核
   零消费 category）、agent 节点 DEFS 其余字段——全部零改动。

## 3. 影响面（权威细化见迭代 0037 SPEC §3；本节为索引）

- **shared**：nodes.schema.ts / types.ts / nodes/agent/node.ts /
  test/contract.test.mjs（:14 七值 cat 白名单须同步扩，否则 npm test 红）/
  test/nodes.baseline.json（再生产）。
- **前端**：app.js（CATS + catColor 两处纯插入）/ app.css（:root 一变量）。
- **文档**：docs/node-definition-protocol.md:121 类目枚举同步（自主区）。
- **golden**：见 §4。
- **零改动**：Skeleton.tsx / events.ts / nodes.ts 聚合层 / gate.mjs /
  apps/server/** / tests/smoke/** / tools/gen-node-readmes.mjs（19 键断言
  不触发）/ 各节点 README（生成器模板无 category 行）。
- **SPEC 阶段勘误（相对 PRD，详见 SPEC §2）**：PRD 清单漏 types.ts 与
  contract.test.mjs 两个必改点（tsc/test 硬依赖）；「17 键/D===17」实为
  19；s9 波及由「以实测为准」定稿为必波及（几何证明）；`:root` 新变量使
  **全部 12 场景的 cssVars 不变量**变化（宪法第 2 条「:root CSS 变量表」面），
  非仅 s3/s8/s9。

## 4. 像素对比证据与 golden 重录范围（宪法第 3 条要素③）

双通道口径沿 ADR-0013 §6：本轮**无新场景**（s3-library / s8-agent-node /
s9-goal-panel-online 均既有），全部走**修宪轮 `npm run gate:update` 恰一次**
（迭代 0013 先例；一次调用全量重录 12 场景 png+invariants）。重录前的一次
`npm run gate` 实跑即为前后对比证据（diff 产物自动落 `tests/golden/diff/`，
须先拷贝留档再 update——gate 全绿会自动清空该目录）。预期波及：

| 场景 | 像素 | 不变量 | 波及源 |
| --- | --- | --- | --- |
| s3-library | 变 | 变 | 节点库分组重组（对话 -1 行；新「智能体」组 +头 +1 行） |
| s8-agent-node | 变 | 变 | agent 节点标题栏类目条 + 小地图填充（紫→teal） |
| s9-goal-panel-online | 变 | 变 | 画布 agent 节点标题栏（节点矩形 519-819×327-607 与 goal 面板 1222-1582×304-824 零交叠——必入镜） |
| 其余 9 场景 | **不变（diffPx=0）** | **变** | 公共不变量 cssVars +`--cat-agent` 键（每场景都采 `:root` 变量表） |

重录后连续两轮 gate 全 pass diffPx=0 确认稳定；golden 权威在 CI
（windows-latest），推送后盯 `ui-constitution` required check。**9 场景 png
在重录中预期逐字节不变**——若 git diff 显示其 png 变化，即非预期波及，中止
排查，不得以重录掩盖（SPEC §6.2 判定硬边界）。

## 5. 不做范围

- 不迁移其他节点类目（llm/prompt 留「对话」组）、不新增节点类型、不动 agent
  DEFS 其余字段与 goal 面板（BK-0033/0034 已 done）。
- 不做 BK-0046~0049（approval 审批人选择器 / kb 动态化 / on-error 参数 /
  MCP·skills 清单动态化）——issue#6 名下姊妹子项，各自独立修宪轮。
- 零新 npm 依赖、零新 env、零新出站类别、零新 SSE 事件（护栏沿 BK-0016
  先例：确需新增即中止转 needs-approval）。
- 关单口径：issue#6 五子项未全终了，本轮 done 仅发进度回执、不关 issue
  （BK-9006 行明载关单留末项 CLOSE）。
