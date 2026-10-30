# ADR-0025 · 节点级 on-error 参数 UI（NDP 参数面终稿 + 属性面板/节点体呈现 + golden 全量重录方案）草案

- 状态：**草案 · 已获用户 issue#6 批复（2026-10-24T08:38:51Z 修宪批复承继在库）**
  ——BK-9006「既有节点 UI 参数扩展杂项」之「on-error 参数」条目（BACKLOG.md:69/:98
  亲读）；本 ADR 为该批复射程内参数面与重录方案的定稿载体，宪法第 3 条「ADR →
  用户批准 → 同 PR 重录 golden」三步中的前两步已就位，第三步（重录）归迭代 0070
  BUILD 按 SPEC §4.3 执行。版式沿 ADR-0017/0018/0021 先例：全文不使用「已批准」
  终态措辞替换状态行，状态行随实施轮 CLOSE 按先例更新。
- 日期：2026-10-31（SPEC 阶段产出，迭代 0070 / BK-0048，BK-9006 链终轮）
- 关联：ADR-0022（引擎 on-error 策略语义与优先序权威——本 ADR 是其 §5「BK-0048
  参数面零预写」纪律的合法落点）/ 迭代 0069（BK-0020 引擎实现已合并 65e8c98，
  解阻本项）/ BK-9006 母项（issue#6，本链末项 CLOSE 关单）/ 迭代 0037/0038/0039/
  0065（同链修宪通道 golden 消费四先例）/ NDP 迁移 spec §2（baseline 重生成通道）/
  POLICY.md 需批准区（packages/shared DEFS 变更——issue#6 批复覆盖）
- 配套：`docs/evolution/iterations/0070/SPEC.md`（受影响文件清单、验收口径、
  smoke OEN 组矩阵、golden「不多不少」执法流程——本文不重复，只记录决策）

## 1. 动机

BK-0048 把失败策略从「部署级 env」（BK-0020 已落地：`ON_ERROR` /
`ON_ERROR_RETRIES` / `ON_ERROR_RETRY_DELAY_MS`，ADR-0022 §3）提升到**节点编排
粒度**：易失败节点（http/code）单独重试、关键节点中止、其余跟随全局缺省。这是
issue#6 修宪链（BK-9006）的收官子项——引擎机制（重试循环 / abortable sleep /
onErrorAborted 标志位 / fail-fast）已于 0069 全数落地，本轮仅：① DEFS 新增两参数
（21 类统一）；② 引擎解析层下沉 runNode 逐调用（优先序按 ADR-0022 §5 写死：
**节点参数（若设）> env 全局默认 > 内建缺省 skip+0**）；③ 属性面板/节点体的
DEFS 通用渲染链自然呈现（前端代码零改动）；④ 波及 golden 场景修宪重录。

## 2. 影响面（三层定位，宪法第 1 条口径）

- **结构层**：`packages/shared/src/nodes/<21 type>/node.ts` params 各 +2（NDP 纯
  数据模块，schema 既有形态容纳，nodes.schema.ts 零改动）+ 契约守护四件联动
  （baseline 重生成 / defs-drift 期望表 / param-handler-guard 提取器 / synthesis
  EXPECTED_ORDER）+ 21 份节点 README 生成物刷新。**前端源文件零改动**——参数行由
  `makeNodeEl`（app.js:811）/`renderProps`（app.js:979）的 DEFS 通用渲染链承载。
- **视觉层**：每个非折叠节点体 +1 combo 行（恒显）+1 number 行（恒显）；属性面板
  同步 +2 行。节点矩形增高、`counts.widgets` +2×可见节点数——**全部 21 个 gate
  场景像素与 DOM 不变量变化**（s0 实测 8 节点/15 widgets → 31）。波及面 = 全场景
  （SPEC §4.2 逐场景判据表），恰枚举、恰一次 `npm run gate:update` 重录。
- **交互层**：零新增交互机制——combo 选择 / number 步进（drag-num）均为既有
  widget 形态，写回走既有 change 委托（app.js:1146-1153 / :1798-1808）。

## 3. 决策记录（参数面终稿；每项附否决案）

| # | 决策 | 内容 | 否决案（留档） |
| --- | --- | --- | --- |
| D1 | 受影响节点集合 | **全 21 类统一**——策略分派在 runNode catch，对所有 handler 的 throw 生效；统一避免「部分节点可编排、部分不可」的不对称 | 收窄子集（否决：需逐类「无失败抛出路径」证据，而任一 handler 均可 throw——http/code/llm 自不待言，even __pass 之外的路径异常皆可达 catch） |
| D2 | 参数名与取值 | `onError` combo 四值：`跟随全局`（哨兵，「若设」否定态，默认）/`跳过`/`重试`/`中止`，**value≡label**（前端选中匹配按 label 逐字比对 app.js:787/:981 的消费面约束）；引擎侧显式中文→枚举映射表 + fail-safe（非法值走哨兵承接） | value≠label 英文枚举值（否决：选中态丢失，需改前端 combo 渲染）；label 即英文枚举（否决：与全库中文 UI 语言不一致） |
| D3 | 重试次数承载 | **独立 number 参数 `onErrorRetries`**（min 0 / max 5 / step 1 / **默认 2**）：节点 retry 时次数恒取节点参数；env 次数仅在哨兵承接路径消费。**陷阱破解**——ADR-0022 §3 明载 env 默认 0，若节点 retry 无自有次数承载，env 未配置即退化 skip、参数形同虚设 | 隐含下限 `max(env,1)`（否决：次数不可编排、想 3 次须改全局 env 反向污染其他节点、「节点胜」优先序在次数维失效）；无次数参数复用 env（否决：即本陷阱本体） |
| D4 | 次数行显隐 | **无条件双行（不用 visibleIf）**——visibleIf 源参数变化在两条 change 路径均不触发重渲染（app.js:1806 只查被改参数自身 `if`；:1152 面板路径不调 renderProps），补齐需改两处冻结交互面且波及既有 trigger 面板；无条件行零前端改动、UI 恒一致 | visibleIf 条件显隐（否决：半残于两处 change 路径的证据在 SPEC §1.3）；panel-only 行（否决：需新增 per-param 呈现面机制，偏离「全参数进节点体」的既有形态） |
| D5 | 退避基值 | **恒 env-only**（`ON_ERROR_RETRY_DELAY_MS`），节点级退避不入——过度细粒度，留演进缝（后续如需，走新一轮 needs-approval） | 节点级退避参数（否决：本轮不入射程） |
| D6 | 值域 | 0-5 对齐 env `ON_ERROR_RETRIES`（config.ts:89）；min:0 保留「显式关闭重试」表达（显式 0 = 用户意图，与缺省 2 可区分） | min:1（否决：无损且收窄表达）；独立值域 >5（否决：与 env 不对称无收益） |

## 4. 像素对比证据（宪法第 3 条要件）

- **变更前基座**：golden 21 场景（gate.mjs:573-615），s0~s5/s6/s16 六例不变量实测
  `nodes:8 / counts.widgets:15`（kefu 示例工作流）。
- **变更后预测**：每可见节点 +2 widget 行（combo「失败策略」+ number「重试次数」），
  节点矩形增高 → `counts.widgets` 15→31（s0 等默认画布场景）；属性面板行 +2。
- **对比流程**：BUILD 落盘后 `npm run gate` 首跑产出 21 组 diff png + 不变量差
  （留档 `iterations/0070/evidence/`）→ 恰一次 `gate:update` → 复跑 21/21
  diffPx=0 → `git status tests/golden/` 恰 42 文件。变更集收敛恰枚举（0056 超枚举
  违约教训在案）；golden 权威在 CI（windows-latest），推送后盯 `ui-constitution`；
  s3-library 本机抖动按 issue#12 纪律（复跑判定、双留档、不消费抖动重录）。
- **「不多不少」执法**：实测 FAIL 集 ≠ 枚举集（21/21）时——枚举外红 = 归因排查修
  BUG，禁止重录掩盖；枚举内零波及 = 如实上报收窄重录集。两向偏离均留痕 JOURNAL。

## 5. 不做范围

零新增 env（config.ts 零 diff）；零 SSE 契约变更（node:error/run:done/log 既有三
事件承载，确需新增立即中止转 needs-approval——ADR-0022 §4.4 硬护栏延续）；前端
源文件零改动；retry×abort 组合枚举、失败节点默认出边放行维持否决/演进缝
（ADR-0022 §2.1/§2.2）；节点级退避不入（D5）；不动 BK-0018（他路占位）与 BK-0064
面；不改 handlers/store/server-sync 消费链。

## 6. 验证口径（详见 SPEC §7，此处仅列命令）

`npm run build` + `npm run gate`（重录后 21/21 diffPx=0）+ `npm test`（baseline
逐字节等价 + defs-drift 86/86 + param-handler-guard 逐类型存在性 + synthesis 序）
+ `npm run smoke:server`（182 零回退 + OEN01-OEN07）+ 手动 E2E 五点位（SPEC §6）
+ 机器证明（`git show --numstat` 恰白名单 / 禁区 diff 恒空 / golden 变更集恰 42
文件 / gate:update 恰一次）。
