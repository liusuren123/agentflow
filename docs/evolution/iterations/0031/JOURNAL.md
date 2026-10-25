# JOURNAL · 迭代 0031 · BK-0033 通用智能体节点落地（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 16:0x–16:2x（本会话）
> 输入：`iterations/0031/PRD.md` + `iterations/0031/SPEC.md` + ADR-0013（定界权威）。
> 授权链：issue#2 用户批复承继（2026-10-23T15:49:39Z，BACKLOG BK-9002 行）+ ADR-0013
> ——**修宪轮**（宪法第 3 条三要素齐备）：本迭代 golden 双通道（s8 golden-created +
> s3-library 修宪轮 gate:update 一次）按 SPEC §6.3 步骤序由工作流脚本在 BUILD 之后
> 统一执行。完整门禁（`npm run build` / `npm run gate` / 根 `npm test` 链 /
> `npm run smoke:server` / `npm run gate:update`）与 git 提交由脚本统一执行——
> 本 JOURNAL 所载命令为 BUILD 自检链（build:shared / build:server / shared 全量
> 测试 / 一次性快照与 README 再生产 / 语法与 EOL 核对），非完整门禁（0022 JOURNAL
> 同口径）。SPEC §8.8 的 gate 基线预检同由脚本统一执行。

## 0. 开工现场（前序中断会话产物核收）

本会话开工时工作区已含一处**前序 BUILD 尝试的部分产物**（STATE 当时仍 `phase: SPEC`，
无 JOURNAL）：`packages/shared/src/nodes/agent/node.ts`（新增）、`nodes.ts`（+1 import
+1 键 + 头注 17 目录）、`defs-drift.test.mjs`（36/36 + agent 行）、`nodes-dirs.test.mjs`
（D===17）。本会话逐文件对照 ADR-0013 §2.1 / SPEC §2 #1/#4/#7/#8 复核：node.ts 与
ADR-0013 §2.1 代码块逐字一致（含 SPEC §3.1 头注五 行）、model 6 项与
`nodes/llm/node.ts:22-28` 逐字同源、nodes.ts 键位 = D1（agent 紧随 llm）——四处全部
**核收采纳，零重写**；其余 15 项白名单文件由本会话补齐。BACKLOG/STATE 的 PLAN/SPEC
期未提交改动（BK-0040 晋升回写、phase 流转）非产品文件，随脚本归档链处置。

## 1. 实施序（SPEC §2 清单序，#1~#19）

### #1/#4 agent NDP + 聚合层（前序核收）

- `packages/shared/src/nodes/agent/node.ts`（48 行，预算 ~45 ✓）：ADR-0013 §2.1 逐字
  （type=agent / chat / sparkles / keywords 7 词 / 端口 in-goal,in-ctx,out-result,
  out-session / model 6 项 runtimeOverridable / sys textarea / maxSteps number
  d32 min1 max256 step1 / handler='agent' / capabilities llm+mcp{toolSelection:user}
  +skills+agent{sessionMode:goal}）。schema 纪律自检（ADR-0013 §2.3 五条）复核仍成立，
  `nodes.schema.ts` 零改动（agent kind 与 sessionMode 占位既有）。
- `nodes.ts`：agentDef import 插 llmDef 后 + NODES.agent 键插 llm 后（D1）+ 头注
  「16 目录」→「17 目录」；三导出面不变（不变式 B），142 → 145 行（预算 ~145 ✓）。

### #5 nodes.baseline.json 再生产（SPEC §5.1 固化命令）

- `npm run build:shared` → `node -e "import('./packages/shared/dist/index.js')…"
  > packages/shared/test/nodes.baseline.json`。
- 判据实测：**17 键含 agent**，键序 `trigger,userinput,llm,agent,prompt,…`（=D1）；
  `git diff --stat` = **62 insertions / 0 deletions（恰 +1 agent 键纯新增）**；LF、
  无 BOM。synthesis 快照常驻比对（Buffer 级）随 §3 全量测试绿。

### #2/#3/#6 README 生成链（SPEC §5.9）

- 生成器四处改动：`KIND_GUARDRAILS.agent = 'goal 会话形态（sessionMode:goal，
  BK-0033/0034 承载）'`；`MANUAL_NOTES.agent`（SPEC §5.9 字面）；`:114` 硬断言
  `types.length !== 17`；总索引模板「16 种」→「17 种」。
- `node tools/gen-node-readmes.mjs` 实测：**2 写入 / 16 无变化 / 共 18 份**——恰
  `nodes/README.md`（+agent 行 + 17 种文案）与 `nodes/agent/README.md`（新增）两路径，
  其余 16 份字节不变（幂等只写变化文件，SPEC 风险表判据达成）。

### #7~#12 守卫/契约测试联动（SPEC §5.2~§5.7 逐文件）

- `synthesis.test.mjs`：caps 用例改「llm/agent=[mcp,skill]、code=[mcp]、其余 15 键」
  + `NODES.agent.caps` 深等断言；EXPECTED_ORDER +`agent:['model','sys','maxSteps']`
  （不变式 C；用例标题 8→9 键同步）；快照用例标题 16→17 键。
- `contract.test.mjs`：17 种节点 + `length===17`。
- `param-handler-guard.test.mjs`：新增 `extractAgent()`（全文件归 'agent'，extractLlm
  同型）并入汇总源；:124 总数 33→36；头注提取源 +agent.ts。**agent.ts 全文 `p.<键>`
  引用恰为 model/sys/maxSteps 三键**（块注释一律不用 `p.` 前缀，SPEC §5.4 纪律）——
  僵尸清单漂移/无法归属引用两项断言随 §3 全量测试绿。
- `readme-consistency.test.mjs`：标题/消息 16→17（:63/:66/:80）、:87「17 份」→
  「18 份」+ 头注 ②行同步；比对本体（TYPES 自 NODES 派生）零改动。
- `defs-drift.test.mjs` / `nodes-dirs.test.mjs`：前序核收（36/36 + agent 行插 llm 后；
  D.size===17）。
- `handlers-coverage`：零改动自动满足——首跑曾红（`apps/server/dist` 为陈旧产物缺
  agent 键），`npm run build:server` 后即绿（与 SPEC §5.8「随 engine HANDLERS 注册
  自动满足」一致，非测试改动）。

### #13/#14 agent.ts + engine 注册（SPEC §4）

- `apps/server/src/agent.ts`（120 行含头注，预算 ≤200 ✓）：SPEC §4.1 循环序伪码逐条
  落地——getModel 未配置 throw（run:error 承载）；输入合成（in-goal renderIfTemplate /
  in-ctx 【src】join / question 兜底 / 【参考资料】6000 截断，llm.ts 同型）；会话绑定
  调用序 = `createSession({title:n.title||'通用智能体', model:p.model, sys:p.sys})` →
  `appendMessage(user)` → 循环 → `appendMessage(assistant, 仅非空)`（D2，§4.2）；
  `buildToolSession(n.mcp, ctx.ac.signal)` 三分支原样 + zTools/keyOf 桥接（llm.ts
  45-66 同型，safe 名清洗 + stub 计数 + 🔧 log）；钳制
  `Math.min(256, Math.max(1, Math.round(Number(p.maxSteps)||32)))`（§4.4）；
  temperature 0.7 / maxOutputTokens 2048 常量（sessions.ts 同值）；预算循环
  `for(step=1; step<=maxSteps; step++)`：每 await 后显式判 `ctx.ac.signal.aborted`
  （D3/风险表：SDK 优雅终止不抛错时兜底）→ toolCalls 则 🤖 log +
  `messages.concat(res.response.messages)` 续接 → 否则 text 收束 break；
  node:delta 一次性终稿；out-session 端口输出 `{sessionId}`；✓ 摘要
  `steps/maxSteps 步（预算耗尽标注）· tokens · caps · Xs`；out 超 160 截断。
- **D3 刻意差异兑现**：无 try/catch 降级支（区别于 llm.ts:82-88）——工具循环异常
  如实上抛（会话绑定 + goal 语义下降级会静默丢语义）；中止经显式判 + 引擎
  `isAbort(e)||ac.signal.aborted` 面承载 node:error「已中止」→ run:done{stopped:true}。
- **§4.7 拆分预案未启用**（120 行 < 200，零新文件 mcp/ztools.ts）。
- `engine.ts`：+`import { agentHandler } from './agent.js'` + `agent: agentHandler,`
  一键（恰 +2 行）。

### #15 smoke A 组（SPEC §7）

- mock 非流式支 +「智能体」前缀三路由（与互审正交）：`智能体工具轮`（无 tool 消息 →
  tool_call `sqlite_execute`（safe 名 ← sqlite.execute 清洗，llm.ts:56 同规）/ 有 →
  终文本「智能体工具轮完成」）；`智能体预算穷尽`（恒返 tool_call）；`智能体慢轮`
  （await sleep(4000) 后落既有默认裁决支，中止窗口）。tool_call 形状 = OpenAI 标准
  chat.completion（SPEC 风险表：A02 首跑若红以 mock 实收为准修形状，不改被测代码）。
- A01~A05 落位 V 组后 Z 组前；实例 = mockSrv（G/V 组基建复用）；会话定位 = 按自建
  title 存在性断言（G 组残留纪律，无删除端点）；头注 +A 组行。
- 断言锚点：A01 会话绑定（session{title/model:'MockChat',sys}）+ messages 恰 2 +
  reply inputs[0].val 含 `"sessionId"`（out-session 出参锚）+ agent out 含 mock 终
  文本；A02 mock 请求增量恰 2 + 🔧/🤖 log + out 含终文本 + tokens number；A03 增量
  恰 2（=maxSteps 绝不超）+ out=`（已达最大步数 2）` + ✓ log 含「2/2 步」+ messages
  恰 1（assistant 空文本不落库）；A04 node:start 门 → stop → node:error「已中止」+
  无 node:done + messages 恰 1 + run:done{ok:false,stopped:true} + GET sessions 200
  （无孤儿）；A05 A01/A03/A04 事件逐条 RunEventSchema 校验（零新增契约联证）。
- 已知时点项（非本组缺陷）：V09 的 `git status --porcelain -- packages/shared` 断言
  在产品提交前必红（本迭代 shared 有产品改动在盘）——沿 0018/0021/0022 先例提交后
  复跑自愈，VERIFY 记实得值判据 0 failed。

### #16~#18 gate s8 场景 + golden 双通道（SPEC §6；脚本执行）

- `gate.mjs` 纯插入三处（既有 s0~s7 场景定义与比对逻辑逐字节零触碰）：
  `AGENT_WF_SEED` 常量（localStorage 预置 trigger→agent 最小工作流，LS_KEY/
  loadLocal 消费形态本会话对 app.js:170/:1374-1388 亲核）；`runScenario` seed 钩子
  （`localStorage.clear()` 之后、`reload()` 之前一行，s0~s7 无 seed 字段 = 零行为
  变化）；SCENARIOS 尾部 `s8-agent-node` 场景行（无 routes/inv，公共六键不变量）。
- 双通道由脚本按 SPEC §6.3 步骤序①~⑤执行：`npm run build` → `npm run gate`
  （**预期 s3 FAIL** 像素 diff + **s8 golden-created** + 其余 7 场景 pass，diff 图
  留 tests/golden/diff/ 为前后对比证据）→ 恰一次 `npm run gate:update` → 复跑
  gate 9 场景全绿 diffPx=0 → `git status -- tests/golden/ui/` 核对恰 s8 两文件新增 +
  s3-library.png 修改。**本会话未运行 gate / gate:update（授权与执行归脚本）**；
  s0/s1/s2/s4~s7 意外红 = 中止排查，禁止顺手重录（AC3 硬边界）。

### #19 ADR-0013 状态行回写（SPEC §8.6/§8.10 字面）

- 头部状态行置换为「**已获用户 issue#2 批复（2026-10-23T15:49:39Z 承继）· BK-0033
  实施轮已消费（迭代 0031）· BK-0034 待实施（链终轮）——原文其余按草案态保留至
  链终**」（沿 ADR-0009/0010 实施轮先例；正文 §8.1 等原文零触碰）。

## 2. BUILD 自检记录（本会话实跑命令与输出）

| 命令 | 结果 |
| --- | --- |
| `npm run build:shared` | tsc 零错误 |
| `node -e "…NODES 键数/键序"` | `keys: 17`，序 `trigger,userinput,llm,agent,prompt,…` |
| `git diff --stat -- packages/shared/test/nodes.baseline.json` | `62 insertions(+), 0 deletions(-)`（恰 +1 键） |
| `node tools/gen-node-readmes.mjs` | `完成：2 写入 / 16 无变化 / 共 18 份` |
| `npx tsc -p apps/server/tsconfig.json --noEmit` | exit=0（agent.ts 类型面零错） |
| `npm run build:server` | tsc 零错误（handlers-coverage 的 dist 依赖面） |
| `npm test -w @agentflow/shared` | **30/30 pass / 0 fail**（nodes-dirs 17 / defs-drift 36 / contract 17 / synthesis 快照 Buffer 级 / param-handler-guard 36+0 僵尸 / readme-consistency 18 份 / handlers-coverage ⊇） |
| `node --check` ×3（smoke-server.mjs / gate.mjs / gen-node-readmes.mjs） | 语法全过 |
| 新文件 EOL 核对（node 逐字节） | node.ts 48 行 / agent.ts 120 行 / agent README 38 行：均 LF、无 BOM |
| `git status --porcelain` 白名单核对 | 产品改动恰 SPEC §2 #1~#16+#19 路径；禁区（`apps/web/**`、`llm.ts`、`handlers.ts`、`server.ts`、`sessions.ts`、`store.ts`、`mcp/*`、`events.ts`、`nodes/llm/**`、`package*.json`）`git diff --stat` 恒空（AC4/AC5 机器证明基面）；`tests/golden/` 零改动（待脚本双通道） |

**未运行（脚本统一执行）**：`npm run build`（web 面）/ `npm run gate` /
`npm run gate:update`（恰一次，s3 通道）/ 根 `npm test` 链 / `npm run smoke:server`
（预期 95 存量 + 5 新增 = 100 passed / 0 failed，V09 时点性假红提交后自愈）/
全部 git 提交。**手动 E2E 四点位（AC6）** 留 VERIFY（需 dev:server + 真实 provider
key 的浏览器实跑，BUILD 无密钥环境不虚测）。

## 3. 实施决策与偏差记录

1. **前序中断会话产物核收**（§0）：四处既有改动与 SPEC/ADR 逐字复核一致后采纳，
   未重写；本会话补齐其余白名单文件。迭代产物归属以「最终树内容符合 SPEC」为准。
2. **budget 耗尽标注字面**：SPEC §4.1 伪码「${预算耗尽标注}」未定字面——落地为
   `（预算耗尽）`（仅 `!text && steps>=maxSteps` 时附注）；A03 判据只锁「2/2 步」
   子串，不受影响。
3. **synthesis 用例标题「8 已迁移键」→「9 已迁移键」**：EXPECTED_ORDER 增 agent 后
   计数自洽（SPEC 未点名，属同文件计数纪律，沿 33→36 同型处理）。
4. **readme-consistency 头注 ②行「17 份」→「18 份」**：SPEC §5.7 点名 :87 标题，
   头注同字面同步（同文件自洽，非比对本体改动）。
5. **A01 reply 节点参数面**：夹具未给 params（reply 无参数键，defs-drift 表既定），
   依赖 DEFS 默认合并——与「params 显式给出」夹具约定的关系同 K 组豁免逻辑（无参
   可显式）。
6. smoke mock `智能体慢轮` 路由应答内容 = 既有默认裁决 JSON（中止后写失败容忍，
   内容无谓）——SPEC §7 只锁「sleep(4000) 后应答」窗口语义。

## 4. 移交 VERIFY 的核对点

- AC1：`npm test` 根链（脚本）；AC2：`npm run smoke:server`（A01~A05 + 95 存量零
  回退；V09 提交后复跑）；AC3：SPEC §6.3 步骤序①~⑤（s3 意外红即中止排查）；AC4/
  AC5：`git diff -- apps/web` 恒空 + `git show --numstat <产品提交>` 恰 §2 #1~#19
  （#17/#18 由脚本 gate 通道产出后随产品提交入库）；AC6：手动 E2E 四点位（需真实
  key）；AC7：PRD 指针抽样 ≥5。
- 风险表盯防：A02 tool_call 形状首跑若红 → 以 mock 实收请求体为准修 mock 形状
  （不改被测代码，记 REPORT）；generateText abort 不抛错 → A04 已双路径覆盖
  （显式判 + SDK AbortError 传播同归引擎中止面）。

## 5. 修复轮（BUILD round 2）记录 · 2026-10-25 16:3x

### 5.1 本轮定性：修宪轮脚本化重入，非缺陷返工

本轮 ask（「修复验收/门禁发现的问题后完成本轮：…更新 JOURNAL.md」）**feedback 为空**。
对照协调者工作流脚本（`.zcode/workflows/evolution-iteration.dwf.ts:319/333-347` 亲读）：
修宪轮门禁序为 `npm run build` → `npm run gate`（首跑预期 s3 红）→ **gate:update 恰一次
成功后 `continue` 回到 BUILD ask（round 2），且该成功路径不写 feedback**——即本轮系
SPEC §6.3 步骤序①~③执行完毕后的**脚本化「复跑门禁」重入**，不是缺陷返工；步骤④
（复跑 gate 全绿）⑤（golden 区零波及核对）与 `npm test`、VERIFY 由脚本在本轮返回后
继续执行。

### 5.2 round 1 门禁产物核验（本会话实跑的只读取证）

| 检查（命令） | 实测 |
| --- | --- |
| `git status --porcelain`（golden 区） | 恰 `s8-agent-node.png`/`.invariants.json` 新增 + `s3-library.png` 修改；**s0~s2/s4~s7 零 diff**（gate:update 全量重写后字节不变 = 零波及机器证明，SPEC §6.3 ⑤判据）；`s3-library.invariants.json` 零 diff（DOM 不变量字节不变，仅像素变化，合 ADR-0013 §6 预案） |
| golden mtime（`ls --time-style=full-iso`） | 全部 9 场景 16:23:35~16:23:52（gate:update 一次全量重写）；diff 目录三文件 16:23（= 步骤② 预期 FAIL 的留存证据） |
| `diff <(cat tests/golden/diff/s3-library.invariants.json) <(cat tests/golden/ui/s3-library.invariants.json)` | 完全一致（步骤② 的当前渲染不变量 = 重录后基线不变量） |
| s3 差异图目验（Read `tests/golden/diff/s3-library.diff.png`） | 恰「LLM 对话」下方插入「通用智能体」条目（icon+MCP/Skill mini-tag），其后条目整体下移一行——与 ADR-0013 §6「chat 分组 1→2 条目」预案一致，无任何计划外差异区 |
| s8 基线目验 + pngjs 逐像素采样（`node -e` pngjs） | 节点结构正确（2 节点/1 连线/model·sys·maxSteps 三 widget/2 入 2 出端口）；标题栏底 `rgb(53,53,53)` = `--node-bg`（app.css:198-200 全节点统一）；标题圆点 `rgb(125,125,125)` = `.ncollapse` 固定灰 `#7d7d7d`（app.css:213，全节点统一）——排除了「类目色异常」假象（初见的蓝色像素为 in-goal 端口圆点）；编译面 `NODES.agent.cat==='chat'`（dist 亲查） |
| `data/agentflow.db` 只读查询（better-sqlite3 readonly） | sessions 最新行 06:15Z（= 14:15 本地，治理日全量回归残留），**无 A 组四会话**；runs 最新行 2026-10-24——round 1 脚本未跑到 smoke（smoke 属 VERIFY 段，按脚本序在本轮 gate/test 全绿后执行，与 DB 证据一致） |
| `apps/server/sandbox/mcp-sqlite.db` 只读查询 | 无 `agent_smoke` 表（A02/A03 未执行过，同上佐证） |

### 5.3 本轮处置与结论

- **零产品改动**：round 1 产物树经上述全量核验与 SPEC §2 白名单/§6.3 判据逐一吻合，
  无可修缺陷；本轮按 ask 仅更新本 JOURNAL。工作区相对 round 1 末的增量 = 本文件。
- **未运行（脚本统一执行，纪律同 round 1）**：`npm run build` / `npm run gate`（步骤④
  复跑）/ `npm test` / `npm run gate:update`（round 1 已消费其一次通道，round 2 起
  `goldenReRecorded=true` 不再重录——若步骤④ 复跑出现非预期红即硬失败，按 WORKFLOW
  §4 回滚条款处置）/ `npm run smoke:server`（VERIFY 段）/ 全部 git 提交。
- **tests/golden/diff/ 残留**：已被 .gitignore 覆盖（.gitignore:20），gate 全绿后由
  其自带清理逻辑删除（BUG-002 机制）；即便残留也不入任何提交。
- 移交 VERIFY 核对点同 §4，另加两条：① round 1 门禁序实证（本节表格）；② A 组为
  首次实跑，mock tool_call 形状首跑若红按 SPEC §7 风险表处置（修 mock 形状不改被测
  代码，记 REPORT）。
