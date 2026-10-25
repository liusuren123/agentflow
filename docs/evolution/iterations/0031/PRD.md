# PRD · 迭代 0031 · BK-0033 通用智能体节点落地：agent NDP 定义 + 注册表入列 + 后端 handler（会话/预算承载）+ 节点库呈现（修宪轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 14:36
> 来源：BACKLOG BK-0033（ui-proposal / 触UI=是 / **P0 / M / ready** / 来源 issue#2，
> BACKLOG.md:46）。2026-10-25 周度治理（W43 第四次）由 BK-9002[L→skipped] 拆分的
> 实现段首项；迭代 0028 PLAN 轮晋升 ready（前置 BK-0032 SPEC 先行已于迭代 0027
> 终态 done，晋升条件兑现）。
> 授权链：issue#2 用户批复承继（2026-10-23T15:49:39Z，BK-9002 行备注 BACKLOG.md:73）
> + ADR-0013（迭代 0027 落盘）——ADR §8.1 即本项实施定界权威（与 BACKLOG 行字面
> 一致）；修宪通道三要素齐备（ADR 先行 + 用户批准 + 同迭代重录，宪法第 3 条）。
> 定界权威：BACKLOG BK-0033 行内口径 + ADR-0013（§2.1 DEFS 定稿草案 / §2.3 schema
> 纪律自检 / §2.4 类目色两段口径 / §3 handler 边界 / §6 golden 双通道预案 / §7
> BK-0015 联合评估 / §8.1 实施定界）+ ROADMAP 待办节实施序列（ROADMAP.md:188-189
> 「BK-9002 链（差异化主轴，优先）：BK-0033 agent 节点 → BK-0034 goal 会话面板」
> ——序列为 PLAN 指导、优先于主池表序，ROADMAP.md:184-186）。
> 先例：迭代 0013（BK-9001，修宪轮 golden-created + gate:update 重录双通道直系
> 先例）、迭代 0018/0021/0022（BK-0031/BK-0021，nodes.baseline.json 快照再生产与
> nodes-dirs/defs-drift 守卫联动机制）、迭代 0015/0026（smoke 断言组扩充实态）；
> ADR-0015 §5（呈现链 BK-0036 同走「NDP 新目录 + baseline 16→17」路径，与本项
> 同构，后续互为先例）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M3 智能体工作台 UI（BK-9002 链实现
> 段首项；差异化主轴「画布编排 × 深度智能体工作台」，ROADMAP.md:124-130/156-168）；
> 关联 T5-M1 验收点「LLM 节点具备停止条件与预算控制」由 agent 节点承载达成
> （ADR-0013 §7 重解读在案，ROADMAP 状态行回写留治理日 PM）。
> 批次编排：无——单项单迭代（M 级，**需独立 SPEC，skipSpec=false**）。issue#2 名下
> 姊妹子项 BK-0034（goal 会话面板修宪轮——链终轮）未竟：本轮 done 仅发进度回执、
> 不关 issue#2（关单留 BK-0034 终轮 CLOSE，BK-0033/BK-0034 行内明载；itemContinues=true）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 14:30~14:36 核实）

- **跨迭代续选**：无——SPEC 四连 BK-0032/0043/0035/0039 已分别于迭代 0027/0028/
  0029/0030 相继终态 done（STATE.md:13 last_result 明载 ADR-0016 落盘 + VERIFY
  PASS 7/7 AC；归档提交 cc6eae9 本会话 `git log --oneline -2` 亲核）——本轮从零
  选题，SPEC 四连先行就此收官、实现段开启。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作。issue 面板
  #2~#6 虽 open 且标签仍 needs-approval，但其批复均已在此前 PLAN 轮消化入行
  （#2~#5 于 2026-10-23 批复、#6 于迭代 0021 轮批复；0011/0021 轮存证；L 项拆分
  BK-0032~0050 完成）——无新增 ready 义务、无 skipped 改写、无建行。下一预期新批项
  = BK-0043 SPEC 产出的 PTY 依赖/出站清单（ADR-0014 附录 A）：档案面板尚无该
  issue（仅 #2~#6），STATE.md:13 与 BACKLOG 待批准区（:123-124）明载开 issue 归
  协调者/脚本（沿 BK-0027→#10 先例）——非 PLAN 轮动作，本轮零处理，如实记档
  （0029/0030 PRD 同判）。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 五项且批复均已承继在案，
  无 user-request 条目；无建行、无 uiIssueNumbers）。
- ③ **rejected**：无 → 无 skipped 改写。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - **本轮 PLAN 轮晋升义务（BK-0040，沿 0028 轮 BK-0033/0034、0030 轮 BK-0036~
    0038 先例）**：BK-0040 晋升条件「BK-0039 CLOSE 后晋升」已随迭代 0030 终态
    done 兑现（iterations/0030/REPORT.md 明载「BK-0040/0041/0042 维持 proposed，
    晋升条件=BK-0039 CLOSE 后由心跳 PLAN 轮晋升（0040 容器先行）」；STATE.md:13
    last_result 同载）→ 本轮将 BK-0040 proposed → ready 回写 BACKLOG（回写随归档
    提交入库，与 0028/0030 轮同机制）。BK-0041/0042 晋升条件 =「两者 CLOSE 后随链
    晋升」（BK-0039 done + BK-0040 未 CLOSE）→ 维持 proposed 零回写；BK-0044 转
    ready 门槛余一 = ADR-0014 附录 A needs-approval issue 获用户批复（issue 未开，
    见 ①）；BK-0046~0050 维持各自晋升条件不动。
  - **ready 非 doc 队列全貌（本轮晋升 BK-0040 后七项，BACKLOG 主池亲核）**：
    BK-0033（:46，P0/M，issue#2 agent 节点修宪轮）、BK-0034（:47，P0/M，issue#2
    goal 会话面板修宪轮——链终轮）、BK-0036/0037/0038（:49-51，P0/M×3，issue#3
    呈现三件套修宪轮）、BK-0040（:53，P0/M，issue#4 右栏容器+git 修宪轮——本轮
    晋升）；BK-0051（:64，P1/S，doc，proposed）——类型 doc 心跳不选（WORKFLOW
    §4）且状态非 ready，双重不入选。七项全 P0/M——「优先 S/M」口径不区分，以
    ROADMAP 待办节实施序列定序（序列优先于主池表序，ROADMAP.md:184-186）：SPEC
    四连先行（0032 → 0043 → 0035 → 0039）已全部收官，序列第 2 位 = **BK-9002 链
    实现段 BK-0033**（差异化主轴优先，ROADMAP.md:188）；STATE.md:13 last_result
    亦明载「下轮选题预期按 ROADMAP:189-190 进 BK-9002 链实现段 BK-0033，
    BK-0036~0038 已 ready 亦可取」。
  - **→ 选 BK-0033**：BK-9002 链实现段首项（agent 节点先入列——BK-0034 面板
    入口 = agent 节点点开，「节点先入列」的实施序依据，ADR-0013 §8）；亦系
    「用户 issue 批复产生的 ready 项」（优先序①语义，来源 issue#2 直连）。
- **侦察档案核对**：残缺标记 `tools.ts:5/:138` 为 stub 如实降级设计面（:138 为
  未注册外部工具兜底 stub——迭代 0025 inject 设计；0027~0030 PRD 同判），非新立项
  对象；`package-lock.json:787` 为 base64 哈希偶合非标记；悬挂 run 探针 `[]` =
  BK-0011 启动扫尾预期表现（迭代 0019 done）——无补题需求。覆盖差集/文档漂移/
  dogfooding 已由治理日承载（BK-0051 在库，下个治理日消化）。
- 与最近 3 次迭代重叠面：0028（ADR-0014 落盘）、0029（ADR-0015 落盘）、0030
  （ADR-0016 落盘）均为纯文档轮——本项为 SPEC 四连收官后的**首个实现轮（修宪轮）**，
  消费 ADR-0013（迭代 0027 产物）定界实施；对 0028~0030 迭代产物零触碰（BK-0044/
  0036~0038/0040~0042 行维持不动，仅 BK-0040 状态列晋升）。

## 结论

**建议做**：一句话理由——SPEC 四连（迭代 0027~0030）已收官，ROADMAP 实施序列进入
BK-9002 链实现段（差异化主轴优先）；ADR-0013 定界完备（DEFS 定稿草案 + schema
纪律自检 + handler 边界 + golden 双通道 + 护栏全在案），三块地基均 done（BK-0016
sessions 五端点 / BK-0030 buildToolSession / BK-0021 NDP 目录制）；agent 节点是
「画布编排 × 深度智能体工作台」差异化定位的首块实现拼图（画布现有节点止于单轮 LLM
调用，无「目标自主推进 + 工具循环 + 持久会话」形态，ADR-0013 §1）。修宪授权链闭合
（issue#2 批复承继 + ADR-0013）——reconstitutional=true（s8 新增 golden-created +
s3 修宪轮 gate:update 重录一次通道，WORKFLOW §4 BUILD 修宪轮条款）。

## 触 UI 分类结论

**是——修宪轮（reconstitutional=true）。** 论证：

1. **shared DEFS 新增即触 UI**（POLICY 需批准区「shared DEFS 变更 + golden 基线
   重录」双命中）：agent 节点注册表入列 → 节点库 chat 分组自动新增「通用智能体」
   条目行（DEFS×CATS 通用渲染 app.js:322-336——本会话亲核为数据驱动渲染，非代码
   改动而是**数据驱动的像素变化**）→ s3-library 基线变化须修宪重录；新场景
   s8-agent-node 基线落盘。授权链 = issue#2 用户批复承继（2026-10-23T15:49:39Z，
   BK-9002 行在案）+ ADR-0013 §2/§6/§8.1——宪法第 3 条通道在案（ADR + 用户批准 +
   同迭代重录三要素齐备）。
2. **golden 双通道**（ADR-0013 §6 + 迭代 0013 BK-9001 直系先例）：s8-agent-node
   新场景走 golden-created（基线 png 不存在即落盘，gate.mjs:247-253 通道）；
   s3-library 受波及走**修宪轮 gate:update 重录**（WORKFLOW §4 BUILD 修宪轮条款
   「脚本在 gate 失败时允许执行一次 npm run gate:update」——issue#2 批复在案）；
   s0/s1/s2/s4~s7 理论零波及（sparkles 图标 app.js:77 与 --cat-chat app.css:19 均
   既有常量，本会话亲核；无 rail/面板/默认工作流变化）——gate 全场景实测确认，
   任一意外红即中止排查；golden 权威仍在 CI，推送后盯 ui-constitution。
3. **前端三文件预期零改动**（ADR-0013 §8.1 既定）：DEFS 通用渲染链承载（app.js
   :322-336 节点库 + 节点标题栏类目色链）；caps 合成（nodes.ts:97-99——本会话亲核）
   只映射 mcp/skill 两键，`agent` kind 不进 caps → 前端 caps 渲染面零新增；
   Skeleton.tsx 静态骨架与画布动态节点无涉。若实施期确需前端改动：纯插入优先，
   波及面经 gate 实测评估——**超出 ADR-0013 §6 预案面（预期零波及场景出现红）且
   排查确证需改前端源码时即中止转 needs-approval**，不沿用本修宪授权扩面。

## 背景（代码事实，本会话 2026-10-25 14:30~14:36 只读核实）

1. **DEFS 定稿草案（ADR-0013 §2.1，BK-0033 落 `packages/shared/src/nodes/agent/
   node.ts`，`satisfies NodeDefJson` 数据模块形态）**：type=agent / 类目 chat /
   icon sparkles / keywords 7 词（agent 智能体 goal 会话 自主 loop 预算）；端口
   in-goal(text) + in-ctx(any) 入 / out-result(text) + out-session(object) 出；
   参数 model（combo 6 项对齐 llm 节点——`nodes/llm/node.ts:22-28` 本会话亲核逐字
   同源，default GLM-4.7，runtimeOverridable: true）+ sys（textarea）+ maxSteps
   （number default 32 / min 1 / max 256 / step 1）；binding handler='agent' +
   capabilities 四键 llm / mcp{toolSelection:'user'} / skills / agent
   {sessionMode:'goal'}。schema 纪律自检在案（ADR-0013 §2.3 五条：端口 id 规则 /
   widget×default 矩阵 / capabilities 键集 ⊆ 十 kind / caps 合成面 / 无 visibleIf）。
2. **聚合层与快照**：`nodes.ts` 现 142 行、16 import + 16 键（本会话 wc/grep 亲核；
   三导出 NODES/NODE_NAMES/paramDefaultsOf 不变）→ +1 import +1 键 → ~145 行；
   `nodes.baseline.json` 现 16 键（node -e 亲数：trigger…approval）→ 再生产 17 键
   （快照机制 = 迭代 0018 BK-0031 建立、0021/0022 消费；重生产 cmp 对照，diff 恰
   +1 键为判据）。
3. **守卫/契约测试联动**（BACKLOG BK-0033 行既定）：nodes-dirs（D===16→17）、
   defs-drift（+1 agent 默认值断言）、readme-consistency（README 由
   `tools/gen-node-readmes.mjs` 生成——文件在库亲核）、handlers-coverage（随
   engine HANDLERS +agent 键自动满足）。
4. **handler 承载（ADR-0013 §3）**：新增 `apps/server/src/agent.ts` ≤200 行：
   maxSteps 预算循环（`for(let step=1; step<=maxSteps; step++)`——形态对齐
   `llm.ts:70` 现行 round≤3 定长循环，本会话亲核；generateText +
   res.response.messages 续接沿 llm.ts:71-81 先例）；工具会话复用
   `buildToolSession(n.mcp, ctx.ac.signal)`（`mcp/inject.ts:93` export 亲核；
   `llm.ts:10/:39` 消费先例）三分支语义原样；会话绑定 = store.ts `createSession`
   （:346）/ `appendMessage`（:375）/ `listSessions`（:356）复用（BK-0016 产物，
   本会话亲核）——每 agent 节点首次执行绑定持久会话（title=节点标题 / model /
   sys=节点参数），out-session 输出 {sessionId}（goal 面板恢复入口数据锚）；
   `engine.ts` HANDLERS 展开（`{...BASIC_HANDLERS, llm: llmHandler}` 形态本会话
   亲核 :26-29）+ agent 键一行；handlers.ts 298 行不并入（独立模块沿 llm.ts 拆分
   先例，AGENTS.md 硬性约定 4）。token 逐轮累加仅作报告（node:done.tokens / ✓
   摘要），v1 不设 token 硬顶（如实标注，不虚构预算——ADR-0013 §3）。
5. **llm 节点不动（BK-0015 联合评估结论，ADR-0013 §7）**：`llm.ts:70` round≤3
   维持现状；agent 路径零额外请批面（预算承载 = agent 节点 maxSteps DEFS 参数，
   issue#2 承继覆盖）；T5-M1 验收点「LLM 节点具备停止条件与预算控制」由 agent
   节点承载达成（重解读在 ADR 显式记录）。附条件条款：若实施期扩展 llm 节点参数
   （超出本结论范围）须立即中止转 needs-approval，不得沿用 issue#2 承继。
6. **golden 面现状**：gate.mjs 现八场景 s0~s7（:177-186 亲核）；ADR-0013 §6 预定
   s8-agent-node（BK-0033）/ s9-goal-panel-online（BK-0034）；呈现链（ADR-0015）
   与工作台链（ADR-0016）场景编号按落盘时序——本项为 SPEC 四连后首个落盘新场景的
   实现轮，s8 号位无冲突（先于 BK-0034/0036 等实现轮）。
7. **smoke 基线**：smoke:server 现基线 95 passed / 0 failed（metrics 0026~0030 行
   五连一致）；本项新增 agent 断言组（会话绑定/预算上限/出参锚点/停止路径，SPEC
   定）+ 既有 95 零回退。
8. **工作区干净**（`git status --porcelain` 输出空，本会话亲跑）；HEAD = cc6eae9
   （迭代 0030 归档提交）；docs/adr 现行至 0016（ls 亲核）。

## 目标与范围

**做（本迭代产品提交面 = 受影响文件清单；M 项——SPEC 由 spec-designer 终稿细化，
本清单为 ADR-0013 §8.1 / BACKLOG BK-0033 行既定口径）**：

| # | 文件 | 动作 | 预算（行） |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/agent/node.ts` | 新增 | ~45（ADR-0013 §2.1 草案为纲） |
| 2 | `packages/shared/src/nodes/agent/README.md` | 新增（生成器产出） | 生成 |
| 3 | `packages/shared/src/nodes.ts` | +1 import +1 键 | 142 → ~145 |
| 4 | `packages/shared/test/nodes.baseline.json` | 再生产（16→17 键，经批准通道） | 快照 |
| 5 | `packages/shared/test/`（nodes-dirs / defs-drift / readme-consistency 联动） | 小改 | SPEC 定 |
| 6 | `apps/server/src/agent.ts` | 新增 | ≤200 |
| 7 | `apps/server/src/engine.ts` | HANDLERS +agent 一行 | +1 |
| 8 | `tests/smoke/smoke-server.mjs` | agent 断言组新增 | SPEC 定 |
| 9 | `tools/pixel-gate/gate.mjs` + `tests/golden/ui/`（s8 新基线 + s3 重录） | +s8 场景行 + 双通道基线 | SPEC 定 |

前端三文件（Skeleton.tsx / app.js / app.css）**预期零改动**（AC4 机器核对；若需
改动纯插入优先且波及评估超出 ADR-0013 §6 预案即中止转 needs-approval）。

**不做（out of scope）**：

- BK-0034 goal 会话面板（BK-9002 链终轮，下轮按序）；BK-0036~0038 / BK-0040 等
  其他链实现项（一次迭代一件事）。
- llm 节点参数面 / llm.ts 工具循环任何改动（ADR-0013 §7 附条件条款）；可选后端
  重构「llm 工具循环抽共享 helper 供 agent.ts 复用」属自主区纯重构——量力而行、
  不作为验收项（ADR-0013 §3 既定）。
- 新增 SSE 事件 / 新增 API 端点：15 种事件内取用（`events.ts` 零 diff 为机器
  证明），确需新增即中止转 needs-approval（BK-0016 护栏先例，ADR-0013 §3）。
- 新增 npm 依赖 / 新 env 语义 / 新出站类别（零依赖零 env——agent handler 复用
  buildToolSession 既有 guard 面；lock 零变化为机器证明）。
- 独立「智能体」类目 + `--cat-agent` CSS 变量（BK-0050 专属，issue#6 承继——
  ADR-0013 §2.4 两段口径：本轮归既有 chat 类目，零新增 CSS 变量）。
- token 硬顶预算（v1 步数预算语义，如实标注——ADR-0013 §3）。

## 验收标准（Given/When/Then）

- **AC1 · DEFS 入列与契约全绿**：Given nodes.baseline.json 16 键、NODES 16 目录、
  守卫/契约测试现状绿，When agent/node.ts 按 ADR-0013 §2.1 落盘 + nodes.ts +1
  import +1 键 + baseline 再生产 + 守卫/契约联动更新，Then `npm test` 全绿
  （nodes-dirs D===17、defs-drift 含 agent 默认值、readme-consistency、
  handlers-coverage ⊇ NODES）；node 亲数 baseline 17 键含 agent、diff 恰 +1 键。
- **AC2 · handler 语义（会话/预算承载）**：Given 含 agent 节点的工作流
  （trigger → agent → reply 或等效，smoke mock 形态 SPEC 定），When 运行至完成，
  Then ① maxSteps 预算循环生效（工具循环步数不超参数上限）；② 会话绑定创建
  （sessions 表新增行：title=节点标题 / model / sys=节点参数；messages 落
  user+assistant）；③ out-session 端口输出 {sessionId}、out-result 输出全文；
  ④ 中止信号透传（stop 后无孤儿）。`npm run smoke:server` agent 断言组新增全绿 +
  既有 95 零回退。
- **AC3 · 修宪 golden 双通道**：Given gate 现八场景 s0~s7 全绿基线，When gate.mjs
  +s8-agent-node 场景行（触发形态沿 ADR-0013 §6：画布加载含 agent 节点的工作流，
  localStorage 预置或等效注入，SPEC 定），Then 首跑 s8 golden-created 落盘、二跑
  9 场景全绿 diffPx=0；s3-library 因 chat 分组自动新增「通用智能体」条目经**修宪轮
  gate:update 一次通道**重录后全绿（授权链在案）；s0/s1/s2/s4~s7 逐字节零漂移
  （意外红即中止排查，不许顺手重录）。
- **AC4 · 前端零改动确认**：When `git diff -- apps/web` 核对，Then Skeleton.tsx /
  app.js / app.css 三文件零改动（DEFS 通用渲染链承载的机器证明）；若实施确需
  改动：纯插入形态 + gate 全场景实测波及评估，超出 ADR-0013 §6 预案面即中止转
  needs-approval（WORKFLOW §4 BUILD 中止条款）。
- **AC5 · 白名单与零依赖机器证明**：When `git show --numstat <产品提交>` 核对，
  Then 改动恰在受影响文件清单（表 1~9）内；`package-lock.json` 零变化（零依赖）；
  `events.ts` 零 diff（零新增 SSE 事件）；`llm.ts` 与 `nodes/llm/node.ts` 零 diff
  （llm 节点不动，ADR-0013 §7 附条件条款兑现）。
- **AC6 · 手动 E2E 四点位**（BACKLOG BK-0033 行既定）：① 节点库 chat 分组出现
  「通用智能体」条目（sparkles 图标 + MCP/Skill mini-tag）；② 拖入画布
  （--cat-chat 类目色标题栏 + in-goal/in-ctx 入端口 + out-result/out-session
  出端口 + model/sys/maxSteps widget 行）；③ 连线（in-goal ← 上游 text 出、
  in-ctx ← any 出）；④ 运行（SSE 既有事件流 + 会话绑定 + 预算循环 ✓ 摘要）。
- **AC7 · 指针抽样可开**：When 从本 PRD / ADR-0013 引用的代码指针抽样 ≥5 条逐一
  打开（建议：nodes.ts:97-99、nodes/llm/node.ts:22-28、llm.ts:70、
  mcp/inject.ts:93、store.ts:346/375、app.js:77/:322-336、app.css:19、
  gate.mjs:177-186、ADR-0013 §2.1/§6/§8.1、BK-0033/BK-9002 BACKLOG 行、issue#2
  链任五以上），Then 全部命中无误。

## 非功能要求

1. 新增源文件 ≤400 行（AGENTS.md 硬性约定 4）：agent.ts ≤200、node.ts ~45；
   改动文件增量按上表预算。
2. 零新依赖 / 零新 env / 零新出站类别 / 零新增 SSE 事件 / 零新增 API 端点
   （lock 与 events.ts 零 diff 为机器证明）。
3. EOL 纪律：新文件 LF、无 BOM。
4. 产品提交恰一个（Conventional Commits，如 `feat(node): BK-0033 通用智能体节点
   （agent NDP 定义 + handler 会话/预算承载 + 节点库入列，修宪轮）`）；修宪轮
   golden 变更与产品代码同迭代落地（宪法第 3 条三要素）。
5. 回滚 = `git revert` 单提交（含 s8/s3 基线回退）。
6. `npm run gate:update` 仅限 s3 重录一次通道（修宪轮条款）；其余场景禁改基线。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| s3 重录通道被泛化（顺手重录其他场景） | AC3 硬边界：仅 s3-library 走 gate:update 一次；s0/s1/s2/s4~s7 意外红 = 中止排查（ADR-0013 §6 预期零波及论据：sparkles/--cat-chat 均既有常量，本会话亲核） |
| agent loop SDK 行为差异（res.response.messages 续接 / abort 不抛错） | llm.ts:71-81 直系先例复用 + 迭代 0015 JOURNAL §2-1 abort 行为发现（ai@7 textStream 优雅终止不抛 AbortError）在案——SPEC 伪码预置循环出口显式判 ac.signal.aborted；smoke 断言覆盖停止路径 |
| baseline 重产漂移（17 键外意外差异） | 快照再生产机制（0018/0021/0022）：cmp 对照 diff 恰 +1 键为判据；ADR-0013 §2.3 schema 纪律自检五条前置 |
| agent.ts 超 200 行 | 会话绑定段复用 store 仓储函数不重复实现；超限先拆分（AGENTS 硬性约定 4）；SPEC 按节分配预算 |
| caps/agent kind 前端渲染意外（多出 AGENT mini-tag 等） | caps 合成层只映射 mcp/skill 两键（nodes.ts:97-99 本会话亲核）；AC4 前端零 diff 机器证明兜底 |
| smoke V09 时点性假红（产品提交前 git 半边必红） | 沿 0018/0021/0022 先例：提交后复跑自愈，VERIFY 记实得值判据 0 failed |
| 实施滑向 llm 节点参数扩展 / SSE 新增事件 / 前端源码改动 | AC5 机器证明（llm.ts / nodes/llm / events.ts 零 diff）+ AC4（apps/web 零 diff）；ADR-0013 §7 附条件条款 + BK-0016 护栏 + §6 预案面边界——中止转 needs-approval |

## 需求清单（REQ-0033-xx）

- REQ-0033-01：agent NDP 定义落盘（node.ts ~45 行 + README 生成 + nodes.ts 聚合
  +1 键 + baseline 再生产 17 键 + 守卫/契约联动，AC1）。
- REQ-0033-02：agent handler 落盘（agent.ts ≤200 行：maxSteps 预算循环 +
  buildToolSession 复用 + 会话绑定 + out-session {sessionId}；engine HANDLERS
  +agent 注册，AC2）。
- REQ-0033-03：smoke agent 断言组（会话绑定 / 预算上限 / 出参锚点 / 停止路径 +
  既有 95 零回退，AC2）。
- REQ-0033-04：修宪 golden 双通道（s8-agent-node golden-created + s3-library
  gate:update 重录一次 + 其余场景零漂移实测，AC3）。
- REQ-0033-05：边界不变式——前端三文件零改动（或纯插入且波及评估内）、零依赖、
  零新增 SSE 事件 / 端点、llm 节点面零触碰（AC4/AC5）。
- REQ-0033-06：手动 E2E 四点位 + 指针抽样 ≥5 条（AC6/AC7）；产品提交恰一个
  （Conventional Commits）。

## SPEC 派发要点（M 项需独立 SPEC，skipSpec=false）

spec-designer 依本 PRD + ADR-0013 产出 `iterations/0031/SPEC.md`，必含：

1. 受影响文件清单终稿（表 1~9 逐文件行级改动说明 + 行数预算分配）。
2. **golden 重录方案**（WORKFLOW §4 BUILD 修宪轮条款必答）：s8 场景触发形态
   （localStorage 预置或等效注入，含 agent 节点的最小工作流 fixture）、s3 重录
   步骤与「gate 失败时脚本执行一次 gate:update」通道声明、其余场景零波及实测口径。
3. agent handler 循环序伪码（generateText 续接 / 工具会话三分支 / 中止出口
   显式判 ac.signal.aborted / token 报告）与会话绑定调用序（createSession →
   appendMessage 时点）。
4. smoke 断言组设计（agent 组编号续接现有组序；mock 模型端点形态沿 G 组先例）。
5. 回滚方案（git revert 含 s8/s3 基线回退）。
