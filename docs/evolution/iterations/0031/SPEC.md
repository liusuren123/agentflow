# SPEC · 迭代 0031 · BK-0033 通用智能体节点落地（agent NDP + 注册表 + handler 会话/预算承载 + 节点库呈现，修宪轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-25 14:46
> 输入：`iterations/0031/PRD.md`（PLAN 产物）+ ADR-0013（定界权威）+ 本会话只读代码核实。
> 权威顺位：CONSTITUTION > AGENTS > WORKFLOW > POLICY > ADR-0013 > PRD > 本 SPEC。
> 修宪授权链（宪法第 3 条三要素齐备）：**issue#2 用户批复承继（2026-10-23T15:49:39Z，
> BK-9002 行在案）+ ADR-0013（§2 DEFS 定稿草案 / §3 handler 边界 / §6 golden 双通道
> 预案 / §8.1 实施定界）+ 本迭代内重录/增量 golden**。
> ADR 处置：**零新 ADR**——本迭代全部架构决策已由 ADR-0013 承载（迭代 0027 落盘），
> 本 SPEC 仅消费之；ADR-0013 头部状态行的「已获用户 issue#2 批复 · BK-0033 已消费」
> 回写归 BUILD 产品提交（§8.6，时点依据 ADR-0013 显著声明自定 + ADR-0009/0010 先例）。

## 0. 本会话代码核实记录（2026-10-25 14:30~14:46，只读）

PRD 背景节全部锚点复核命中：`nodes/llm/node.ts:22-28`（model 6 项）、`nodes.ts:97-99`
（caps 只映射 mcp/skill 两键）、`nodes.ts:113-130`（16 键 NODES 表 + 三导出）、
`llm.ts:39/:70-81/:89/:113`（buildToolSession / round≤3 循环 / node:delta / ✓ 摘要）、
`mcp/inject.ts:93`（buildToolSession export）、`store.ts:346/:356/:375`（createSession /
listSessions / appendMessage）、`engine.ts:26-29`（HANDLERS 展开）、`events.ts:8-37`
（15 种事件）、`app.js:77`（sparkles 图标）/`:170`（LS_KEY）/`:322-336`（节点库
DEFS×CATS 通用渲染）/`:1374-1388`（loadLocal）/`:2407`（boot loadLocal 分支）、
`app.css:19-20`（--cat-chat:#a06bff）、`gate.mjs:176-187`（8 场景）/`:249-253`
（golden-created 通道）、`nodes.schema.ts:81`（agent kind 已在十 kind 键集）/:69
（sessionMode 占位）。**PRD 未列、本 SPEC 新核实的四处硬依赖**：
`tools/gen-node-readmes.mjs:114`（`types.length !== 16` 硬断言）、`:37`
（agent 护栏文案「未批准不启用」）、`:42-59`（MANUAL_NOTES 无 agent 条目 →
现状备注渲染 `undefined`）、`packages/shared/test/param-handler-guard.test.mjs`
（提取源仅 {handlers,llm,engine}.ts——**不含 agent.ts 时 agent 三参数必判僵尸假红**，
:109-120 反向断言）。工作区干净（`git status --porcelain` 本会话亲跑输出空）。

## 1. 范围与护栏裁示

- **触 UI = 是，修宪轮**：shared DEFS 新增 agent → 节点库 chat 分组自动新增
  「通用智能体」条目（app.js:322-336 数据驱动渲染）→ s3-library 像素变化 +
  s8 新场景（§6）。前端三文件（Skeleton.tsx / app.js / app.css）**预期零改动**
  （PRD AC4 机器证明；若实施确需改动：纯插入优先，波及面超 ADR-0013 §6 预案
  即中止转 needs-approval，不沿用 issue#2 承继扩面）。
- **gate.mjs 修改合法性裁示**：WORKFLOW §6.3「不修改 tools/pixel-gate/」在修宪轮
  让位于宪法第 3 条通道——直系先例：迭代 0011 e3bf60b 与 0013 9bcb3bd 均在
  已批准 ADR 下改 gate.mjs 增场景（本会话 `git log -- tools/pixel-gate/gate.mjs`
  亲核）；本迭代授权链同构（issue#2 承继 + ADR-0013 §8.1 明载「gate.mjs +s8 场景
  行」+ PRD 表 #9）。**改动形态硬边界：仅「新增 s8 场景行 + AGENT_WF_SEED 常量 +
  seed 钩子两行」纯插入；既有 s0~s7 场景定义与比对逻辑（0 容差 pixelmatch、
  阈值、不变量采集）逐字节零改动**。
- **llm 节点零触碰**（ADR-0013 §7）：`llm.ts` / `nodes/llm/node.ts` 零 diff 为
  AC5 机器证明；「抽共享 helper 重构」不作为验收项（§4.7 备选预案仅超预算时启用，
  且不得改 llm.ts）。
- **零新依赖 / 零新 env / 零新增 SSE 事件 / 零新增 API 端点**：lock、`events.ts`、
  `server.ts` 路由区零 diff（AC5 机器证明）；确需新增即中止转 needs-approval
  （BK-0016 护栏先例）。

## 2. 受影响文件清单终稿（AC5 白名单；`git show --numstat <产品提交>` 核对基准）

PRD 表 1~9 的**落定细化 + 三处增补**（增补依据：①生成器硬断言 16 不改则 README
再生产必然 throw（§0 核实），AC1 不可达成——PRD 表 #2「README 生成器产出」的
必然前置；②守卫测试的具名落定归 PRD 表 #5「SPEC 定」授权；③ADR-0013 状态行
回写是 ADR-0013 自定协议的兑现义务）。

| # | 文件 | 动作 | 行级说明与预算 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/agent/node.ts` | 新增 | ~45 行，§3 定稿全文（ADR-0013 §2.1 草案逐字 + 头注） |
| 2 | `packages/shared/src/nodes/agent/README.md` | 新增 | 生成器产出（`node tools/gen-node-readmes.mjs`） |
| 3 | `packages/shared/src/nodes/README.md` | 改（再生成） | 总索引：+agent 行、行序随 NODES、「16 种节点」文案 → 17（#6 生成器改） |
| 4 | `packages/shared/src/nodes.ts` | 改 | +1 import（agentDef，插 llmDef 后）+1 键（agent，插 llm 后）+ 头注「16 目录」→「17 目录」；142 → ~145 行 |
| 5 | `packages/shared/test/nodes.baseline.json` | 再生产 | 16→17 键（§5.1 命令；diff 恰 +1 agent 键为判据） |
| 6 | `tools/gen-node-readmes.mjs` | 改 | 四处：:37 KIND_GUARDRAILS.agent 启用态文案 / MANUAL_NOTES +agent / :114 硬断言 16→17 / :104 总索引模板「16 种」→「17 种」；+4~6 行 |
| 7 | `packages/shared/test/nodes-dirs.test.mjs` | 改 | :31 `D.size===16`→`17` + 注释 :5 同步 |
| 8 | `packages/shared/test/defs-drift.test.mjs` | 改 | EXPECTED_DEFAULTS +agent 三参数（§5.2 字面量）；① 计数 33→36 + 头注 |
| 9 | `packages/shared/test/synthesis.test.mjs` | 改 | caps 用例：+`NODES.agent.caps` 深等断言、跳过集 +agent、「其余 14 键」→15；快照用例标题「16 键」→17；EXPECTED_ORDER +agent（§5.3） |
| 10 | `packages/shared/test/contract.test.mjs` | 改 | :10-11 「16 种节点」/`length===16`→17 |
| 11 | `packages/shared/test/param-handler-guard.test.mjs` | 改 | 提取源 +agent.ts（全文件归 agent，extractLlm 同型 §5.4）；:124 总数 33→36 |
| 12 | `packages/shared/test/readme-consistency.test.mjs` | 改 | 标题/消息文案 16→17、:87「17 份」→「18 份」（比对本体动态零改） |
| 13 | `apps/server/src/agent.ts` | 新增 | ≤200 行，§4 设计 |
| 14 | `apps/server/src/engine.ts` | 改 | +import +`agent: agentHandler,` 一键（+2 行） |
| 15 | `tests/smoke/smoke-server.mjs` | 改 | mock 路由 +3 关键词 + A 组 A01~A05 + 头注 A 组行；+~110 行 |
| 16 | `tools/pixel-gate/gate.mjs` | 改 | s8 场景行 + AGENT_WF_SEED 常量 + seed 钩子两行；§6.1 |
| 17 | `tests/golden/ui/s8-agent-node.png` + `.invariants.json` | 新增 | golden-created 通道（§6.2） |
| 18 | `tests/golden/ui/s3-library.png`（`.invariants.json` 若字节不变则零 diff） | 重录 | 修宪轮 gate:update 一次通道（§6.3） |
| 19 | `docs/adr/0013-agent-node-goal-session-panel.md` | 改 | 头部状态行回写（§8.6 字面，BUILD 产品提交内） |

**零 diff 机器证明面（禁区）**：`apps/web/src/**`（Skeleton.tsx/app.js/app.css）、
`apps/server/src/{llm.ts,handlers.ts,server.ts,sessions.ts,store.ts,mcp/*,tools.ts,events 相关}`、
`packages/shared/src/{events.ts,nodes/llm/**}`、`package.json`/`package-lock.json`、
`.github/**`、`tests/golden/ui/` 除 #17/#18 外全部。

## 3. agent NDP 定义终稿（#1）

`satisfies NodeDefJson` 纯数据模块，正文 = **ADR-0013 §2.1 代码块逐字**（差异裁决
表 §2.2 五条已并入），此处不复贴全文，仅锁定三点：

1. **头注**（~5 行）：`/* agent — 通用智能体（NDP 纯数据模块，goal 会话形态）。
   迭代 0031 / BK-0033 修宪轮落盘（issue#2 承继 + ADR-0013 §2.1）；
   maxSteps=步数预算（v1 无 token 硬顶，ADR-0013 §3）；model 6 项与 llm 节点
   逐字同源（nodes/llm/node.ts:22-28）。*/`
2. **schema 纪律自检（ADR-0013 §2.3 五条，本会话逐条复核仍成立）**：端口 id
   `in-goal/in-ctx/out-result/out-session` 合规且节点内唯一；类型 text/any/text/object
   均在五枚举（nodes.schema.ts:13-15）；combo default 'GLM-4.7' ∈ options 值域、
   number default 32 ∈ [1,256] step 1、textarea default string；capabilities
   {llm, mcp, skills, agent} ⊆ 十 kind（:81 agent 键已在，**schema 零改动**）；
   无 visibleIf。
3. **键位决策 D1**：NODES 键序 agent 紧随 llm（nodes.ts import 与键表同位插入）。
   影响链：baseline 键序（17 键序 = trigger,userinput,llm,**agent**,prompt,…）、
   节点库 chat 组内条目序（LLM 对话 → 通用智能体，app.js:322-336 按
   Object.entries(NODES) 序）、README 总索引行序——三处同源一次性再生产。
   caps 合成：mcp+skills → caps=['mcp','skill']（nodes.ts:97-99），`agent` kind
   不进 caps → 前端渲染面零新增（mini-tag 恰 MCP/Skill 两枚）。

## 4. agent.ts 设计（#13，≤200 行）

### 4.1 循环序伪码（PRD 派发要点 3 必答）

```
agentHandler(ctx, args):
  model = getModel(p.model)；未配置 → throw（llm.ts:16-19 同型，run:error 承载）
  /* 输入合成（llm.ts:20-32 同型）*/
  goal = renderIfTemplate(strInput(inVals[0], ''), vars)      // in-goal
  ctxText = inVals[1] 数组 join【src】/ toStr（__trigger 跳过）  // in-ctx
  if(!goal) goal = vars.question || strInput(input, '')
  userMsg = goal || '(未提供目标，请根据系统提示词自主推进)'
  if(ctxText) userMsg += '\n\n【参考资料】\n' + ctxText.slice(0,6000)
  sys = (p.sys||'') + 技能装配段（n.skills，llm.ts:35 同型）
  /* 会话绑定（先建后跑；BK-0016 仓储复用）*/
  session = createSession({ title: n.title || '通用智能体', model: p.model, sys: p.sys })
  appendMessage(session.id, 'user', userMsg)
  /* 工具会话（三分支原样）*/
  sess = await buildToolSession(n.mcp, ctx.ac.signal)          // mcp/inject.ts:93
  zTools/keyOf 桥接 = llm.ts:45-66 同型（safe 名清洗 + stub 计数 + 🔧 log）
  /* 预算循环（ADR-0013 §3：步数上限语义；token 仅报告）*/
  messages = [{role:'user', content:userMsg}]；text=''；tokens=0；steps=0
  for step in 1..clampMaxSteps:                                // §4.4 钳制
    res = await generateText({ model, system: sys||undefined, messages,
      tools: zTools(可空), temperature 0.7, maxOutputTokens 2048,
      abortSignal: ctx.ac.signal })
    tokens += res.usage?.totalTokens ?? 0；steps = step
    if(ctx.ac.signal.aborted) throw 中止                       // 显式出口（PRD 风险表）
    if(res.toolCalls?.length):
      emit log 🤖 工具请求（第 step 步）                        // llm.ts:74 同型
      messages = messages.concat(res.response.messages)        // 续接（llm.ts:76 先例）
      continue
    text = res.text || ''；break
  /* 预算耗尽（D4）：循环自然收束，text 可能为 '' */
  emit('node:delta', { id: n.id, text })                       // llm.ts:89 同型（一次性终稿）
  if(text) appendMessage(session.id, 'assistant', text)        // 空文本不落库（G07/G09 先例语义）
  outSummary = text || `（已达最大步数 ${maxSteps}）`
  emit log `✓ ${n.title||'通用智能体'} · ${steps}/${maxSteps} 步${预算耗尽标注} · 生成 ${tokens||'?'} tokens${caps 摘要} · Xs`
  return { value: text, ports: [text, { sessionId: session.id }],
           tokens: tokens||undefined, out: outSummary>160 字截断 }
```

### 4.2 会话绑定调用序与生命周期（D2）

`createSession → appendMessage(user) → [循环] → appendMessage(assistant, 仅非空)`。
每次节点执行创建**一个新持久会话**（DEFS 无 session 参数 → 无跨 run 复用面；
`out-session` 端口输出 `{sessionId}` 即 goal 面板恢复入口数据锚，BK-0034 消费）。
中止/异常路径：assistant **零落库**——agent v1 循环为 generateText 非流式，无
增量累积面（区别于 sessions.ts G07 停止保留部分文本；如实不伪造）。循环子图
多次执行 = 多会话（状态less，天然安全）。

### 4.3 异常与中止口径（D3）

- 中止：每 await 后显式判 `ctx.ac.signal.aborted` + 捕获面 `isAbort(e) ||
  ac.signal.aborted` rethrow（llm.ts:83 同型）→ engine node:error「已中止」→
  run:done{stopped:true}。
- 非 abort 异常：**如实上抛**（node:error → run:error 路径），**不沿用** llm.ts:82-88
  「工具循环异常降级直接生成」——agent 的会话绑定 + goal 语义下降级为无上下文
  单轮生成会静默丢失语义（NDP §7.3「不虚构行为」；工具级降级已由 buildToolSession
  三分支 stub 承载）。与 llm.ts 的此差异为 SPEC 显式决策，JOURNAL 记录。

### 4.4 maxSteps 钳制与常量

`clampMaxSteps = Math.min(256, Math.max(1, Math.round(Number(p.maxSteps) || 32)))`
（DEFS min/max 的运行时兜底；llm.ts:37 温度/max 同型手法）。temperature 固定
0.7 / maxOutputTokens 2048（sessions.ts:29-30 常量同值，v1 无参数面）。

### 4.5 事件面（零新增机器证明）

仅取用既有事件：node:delta（1 次）/ log（🤖/🔧/✓）/ node:done（引擎发射，
tokens 附带）。`events.ts` 零 diff。

### 4.6 行预算

头注 8 + 输入合成 20 + 会话 10 + 桥接 40 + 循环 35 + 摘要/返回 20 + 辅助 10
≈ 143 行 + 余量 ≤ 200。

### 4.7 超预算预案（自主区，不作为验收项）

若实现超 200 行：抽 zTools 桥接段为 `apps/server/src/mcp/ztools.ts`（新文件
≤80 行，纯新增**不改 llm.ts**），白名单随之 +1（记 JOURNAL）；agent.ts 主体
回落 ~120 行。

## 5. 守卫/契约测试联动（#5~#12 逐文件）

1. **baseline 再生产（#5）**：仓库根 `npm run build:shared && node -e
   "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > packages/shared/test/nodes.baseline.json`
   （NDP 迁移 SPEC §2 固化命令，.gitattributes 已钉 LF）。判据：`node -e` 亲数
   17 键含 agent；diff 恰 +1 键（键序按 D1）。
2. **defs-drift（#8）**：EXPECTED_DEFAULTS 增行（BUILD 逐字抄录禁手打）：
   `agent: { model: 'GLM-4.7', sys: '你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。', maxSteps: 32 },`
   （插 llm 行后，与 D1 键位一致）；① 断言 33→36；头注「33/33」→「36/36」。
3. **synthesis（#9）**：caps 用例改「llm/agent=[mcp,skill]、code=[mcp]、其余 15 键
   无 caps」+ 深等断言 `NODES.agent.caps`；EXPECTED_ORDER 增
   `agent: ['model','sys','maxSteps']`（顺序即契约，不变式 C 延伸）；快照用例
   标题 16→17（比对本体动态）。
4. **param-handler-guard（#11）**：新增 `extractAgent()`（全文件归 owner 'agent'，
   extractLlm 同型复制）并入汇总源；:124 总数 33→36。实现纪律：agent.ts 注释
   中不得出现 `p.<非参数键>` 字样（提取器剥注释前的行内 // 后匹配，行尾注释
   安全，整行注释行已被剥离——但保守起见注释一律不用 `p.` 前缀）。
5. **nodes-dirs（#7）**：:31 `D.size` 16→17；:5 注释同步。D===R 与 D⊆keys 本体
   动态零改。
6. **contract（#10）**：:10-11 计数与标题 16→17；字段齐全循环动态零改。
7. **readme-consistency（#12）**：:63 标题、:66 消息、:80 标题「16」→「17」；
   :87 标题「17 份」→「18 份」；比对本体（TYPES 自 NODES 派生）零改。
8. **handlers-coverage**：**零改动自动满足**（agent 经 engine HANDLERS 注册后
   ⊇ NODES；额外键仅 __pass 校验不受影响）。
9. **README 生成链（#2/#3/#6）**：先 `npm run build:shared`，后
   `node tools/gen-node-readmes.mjs`；产物 = agent/README.md 新增 + 总索引
   再生成（其余 16 份字节不变——生成器幂等只写变化文件）。生成器四处改动
   字面：KIND_GUARDRAILS.agent = `'goal 会话形态（sessionMode:goal，BK-0033/0034 承载）'`；
   MANUAL_NOTES.agent = `'goal 模式智能体：maxSteps 步数预算工具循环（v1 无 token 硬顶）；每次执行绑定一个持久会话（out-session={sessionId}，goal 面板 BK-0034 消费）；模型未配置/异常如实失败不降级。'`。

## 6. golden 重录方案（修宪轮必答；PRD 派发要点 2 / WORKFLOW §4 BUILD 修宪轮条款）

### 6.1 s8-agent-node 场景定义（gate.mjs #16）

- **seed 机制（D5）**：SCENARIOS 增可选 `seed` 字段；`runScenario` 在
  `localStorage.clear()` 之后、`page.reload()` 之前插 `if(sc.seed) await sc.seed(page);`
  （两行纯插入，沿 routes/ready/inv 可选字段先例；s0~s7 无 seed 字段 = 零行为变化）。
- **常量**：`AGENT_WF_SEED = JSON.stringify({ tabs: [{ name:'智能体示例', nodes:[
  {id:1,type:'trigger',x:40,y:330,title:'手动触发'},
  {id:2,type:'agent',x:410,y:250,title:'通用智能体'}],
  edges:[{id:1,fn:1,fp:0,tn:2,tp:0}], nextId:3, view:{x:60,y:40,scale:1} }],
  activeTab:0 })`（LS_KEY='agentflow.v2' app.js:170；loadLocal :1374-1388 消费；
  runs/settings 缺省 = boot 默认，deterministic）。
- **场景行**：`{ id:'s8-agent-node', steps:[], seed: async page => page.evaluate(v =>
  localStorage.setItem('agentflow.v2', v), AGENT_WF_SEED) }`。触发形态 =
  **localStorage 预置含 agent 节点最小工作流**（ADR-0013 §6 两案中的定稿）；
  离线静态态（无路由拦截，probe 失败静默 → model combo 保持 DEFS 6 项）；
  采集面 = chat 类目色标题栏 + sparkles 图标 + 2 入 2 出端口 + model/sys/maxSteps
  widget 行 + 一条连线。
- **确定性**：seed 后 boot 走 loadLocal 分支（fresh=false，无 fitView/欢迎日志）；
  复用既有 fonts.ready + 稳定双帧等待；不变量 = 公共六键（无 per-scenario 增量）。

### 6.2 s8 落盘通道：golden-created

基线 png 不存在 → 首跑自动落盘并记 `golden-created`（gate.mjs:249-253 既有通道，
迭代 0011 s4/s5 先例）。**禁用 gate:update 落 s8**。

### 6.3 s3-library 重录：修宪轮 gate:update 一次通道

- 依据：宪法第 3 条（ADR + 用户批准 + 同迭代重录三要素在案：issue#2 承继 +
  ADR-0013 §6 表列 s3 行）；WORKFLOW §4「脚本在 gate 失败时允许执行一次
  npm run gate:update」。**仅限 s3**；s0/s1/s2/s4~s7 理论零波及（sparkles
  app.js:77 与 --cat-chat app.css:19 均既有常量、无 rail/默认工作流变化）——
  **任一意外红即中止排查，禁止顺手重录**（PRD AC3 硬边界）。
- 步骤序（BUILD 门禁时序）：①`npm run build` → ②`npm run gate`：预期
  s3 FAIL（像素 diff，chat 组 1→2 条目 + 计数徽标）、**s8 golden-created**、
  其余 7 场景 pass（差异图 `tests/golden/diff/s3-library.*.png` 留存为
  前后对比证据指针，记 JOURNAL）→ ③执行**恰一次** `npm run gate:update` →
  ④复跑 `npm run gate`：9 场景全绿 diffPx=0 → ⑤`git status -- tests/golden/ui/`
  核对：恰 `s8-agent-node.png`/`.invariants.json` 新增 + `s3-library.png` 修改
  （s3 invariants 预期字节不变；其余 16 文件零 diff = 零波及机器证明）。
- golden 权威在 CI（windows-latest）：本地重录后推送，盯 `ui-constitution`
  required check；红即修（宪法第 2 条）。

### 6.4 前后对比证据

宪法第 3 条「附前后对比截图」以 ②步差异图（s3 diff.png + current.png，gate
自动落 tests/golden/diff/）+ ④步全绿输出兑现，JOURNAL §2 记录路径与摘要
（diff 目录在 gate 全绿时自动清空，勿提交）。

## 7. smoke A 组断言设计（#15；PRD 派发要点 4）

**组序**：字母 A 未占用（现役 P/M/H/W/N/S/R/D/E/K/G/V/Z/C，本会话亲核）——
A 组编号 A01~A05，落位 V 组后 Z 组前；**实例** = mockSrv（AI_BASE_URL→mockModel，
G/V 组基建复用）；**基线** = 既有 95 断言零回退 + 新增 5（预期 100）；
**残留纪律** = 会话无删除端点，按自建 id 存在性断言（G 组同款）。

**mock 路由扩展**（startMockModel 非流式支，`智能体` 前缀关键词与互审路由正交）：
- `智能体工具轮`：请求 messages 无 role:'tool' → 返回 tool_call
  （`choices[0].message.tool_calls=[{id:'call_a',type:'function',function:{name:'sqlite_execute',arguments:'{"sql":"CREATE TABLE IF NOT EXISTS agent_smoke(k TEXT);INSERT INTO agent_smoke VALUES(1)"}'}}]`、finish_reason:'tool_calls'；safe 名
  sqlite_execute ← sqlite.execute 清洗，llm.ts:56 同规）；有 tool 消息 → 返回
  终文本「智能体工具轮完成」。
- `智能体预算穷尽`：恒返 tool_call（永不终文本）。
- `智能体慢轮`：await sleep(4000) 后应答（写失败容忍，中止窗口）。

| # | 夹具（params 显式） | 断言要点 |
| --- | --- | --- |
| A01 会话绑定+出参锚 | trigger(1)→agent(2)→reply(3)（edge fn:2,fp:1→tn:3，取 out-session）；agent params {model:'MockChat', sys:'你是测试智能体', maxSteps:4}；inputs.question='智能体直答'（mock 默认 verdict 支即终文本） | run:done{ok:true}；agent node:done.out 含终文本；reply node:done inputs[0].val 含 `"sessionId"`（preview JSON 锚，util.ts:37）；GET /api/v1/sessions/:id（从 sessions 列表按 title=节点标题 定位）→ session{title,model:'MockChat',sys:'你是测试智能体'} + messages 恰 2 条（user 含 in-goal 全文、assistant=终文本） |
| A02 工具循环两步 | 单 agent 节点，mcp:{'sqlite':['execute']}，maxSteps:8，inputs.question='智能体工具轮' | mockModel 非流式请求增量恰 2（步数=2 后模型终答）；log 含「🔧 工具调用 sqlite.execute」与「🤖」工具请求行；node:done.out 含「智能体工具轮完成」且 tokens 为 number；messages 恰 2 条；run:done{ok:true} |
| A03 预算上限 | 同 A02 但 maxSteps:2，inputs.question='智能体预算穷尽' | mock 请求增量恰 2（=maxSteps，绝不超）；node:done.out=`（已达最大步数 2）`；✓ log 含「2/2 步」；messages 恰 1 条（user，assistant 空文本不落库）；run:done{ok:true}（预算耗尽=正常收束） |
| A04 停止透传 | trigger(1)→agent(2)，inputs.question='智能体慢轮' | waitFor node:start(id2) → POST /api/v1/run/:id/stop → run:done{ok:false,stopped:true}；node:error{id:2,message:'已中止'} 出现且 agent 无 node:done；messages 恰 1 条（assistant 零落库）；随后 GET sessions 列表 200（服务健康无孤儿） |
| A05 契约零新增 | — | A01/A03/A04 捕获事件逐条 RunEventSchema 校验通过（agent 仅取用既有 15 种，events.ts 零 diff 联证） |

A 组前置失败处理沿 G05/G09 先例（C.fail + SmokeFailError fail-fast）。

## 8. 验收口径（BUILD 自测 = VERIFY 复跑；PRD AC1~AC7 映射）

1. **AC1 · 契约全绿**：`npm test`（根链：build:shared+build:server+shared 契约）
   全绿——nodes-dirs 17 / defs-drift 36 含 agent / contract 17 / synthesis /
   param-handler-guard 36+0 僵尸增量的 agent 三键 / readme-consistency 18 份 /
   handlers-coverage ⊇；baseline 亲数 17 键、diff 恰 +1 键。
2. **AC2 · handler 语义**：`npm run smoke:server` A01~A05 全绿 + 既有 95 零回退
   （汇总行实得值记 REPORT）。
3. **AC3 · golden 双通道**：§6.3 步骤序①~⑤全过（9 场景 diffPx=0；意外红即中止）。
4. **AC4 · 前端零改动**：`git diff -- apps/web` 恒空。
5. **AC5 · 白名单与零依赖**：`git show --numstat <产品提交>` 恰 §2 表 #1~#19；
   `package-lock.json` / `events.ts` / `llm.ts` / `nodes/llm/node.ts` 零 diff。
6. **AC6 · 手动 E2E 四点位**（浏览器 + dev:server，需真实 provider key）：
   ①节点库 chat 分组出现「通用智能体」条目（sparkles + MCP/Skill mini-tag，分组
   计数 2）；②拖入画布：--cat-chat 紫标题栏 + in-goal/in-ctx 入 + out-result/
   out-session 出 + model/sys/maxSteps widget 行；③连线：in-goal←上游 text 出、
   in-ctx←any 出（compat 高亮）；④运行：SSE 既有事件流（node:start/delta/done +
   🤖/🔧/✓ log）+ 会话绑定（GET /api/v1/sessions 可见新会话）+ ✓ 摘要步数。
7. **AC7 · 指针抽样**：PRD 列 13 组任五以上可开（VERIFY 执行）。
8. **BUILD 前置**：动工前 `npm run gate` 确认基线绿（存量差异不算自己头上）。
9. **产品提交恰一个**（Conventional Commits，建议 `feat(node): BK-0033 通用智能体
   节点（agent NDP + handler 会话/预算承载 + 节点库入列，修宪轮）`），含 §2 全部
   路径（golden 与 ADR 状态行同迭代落地，宪法第 3 条三要素）。
10. **EOL 纪律**：新文件 LF 无 BOM；ADR-0013 状态行回写字面（#19）：
    「状态：**已获用户 issue#2 批复（2026-10-23T15:49:39Z 承继）· BK-0033 实施轮
    已消费（迭代 0031）· BK-0034 待实施（链终轮）——原文其余按草案态保留至链终**」
    （沿 ADR-0009/0010 实施轮先例 + ADR-0013 显著声明自定协议）。

## 9. 模块边界（PRD 派发要点 1 必答）

- **shared**：agent/node.ts 纯数据模块（只 import nodes.schema.js 类型）；nodes.ts
  聚合层三导出面不变（不变式 B）；events.ts / nodes/llm 零触碰。
- **server**：agent.ts 独立 handler 模块（沿 llm.ts 拆分先例，不并入 handlers.ts
  298 行）；消费 providers（getModel）/ mcp/inject（buildToolSession）/ store
  （createSession/appendMessage）/ util（strInput/toStr/preview/renderIfTemplate/
  isAbort）；engine.ts 仅 +1 键注册；server.ts / sessions.ts / store.ts 零改动
  （会话仓储全复用 BK-0016 产物）。
- **web**：零改动（DEFS 通用渲染链承载：节点库 app.js:322-336 + 节点标题栏类目色
  :130 + widget/端口通用渲染；caps 合成层只映射 mcp/skill）。
- **gate**：仅 §6.1 纯插入；比对逻辑与既有场景定义零触碰。

## 10. 回滚方案（PRD 派发要点 5）

VERIFY FAIL 达上限（修复 ≤2 轮后仍红）→ `git revert <产品提交>` 单提交回滚
（唯一手段，禁 force/reset）：一并回退 s8 新基线（随提交删除）、s3 重录
（随提交还原 16 键像素）、baseline 17→16、ADR-0013 状态行；BACKLOG item=failed。
gate 与 npm test 复跑确认回到迭代前基线（9→8 场景全绿）。

## 11. 风险与对策（PRD 风险表全继承，实施级增补）

| 风险 | 对策 |
| --- | --- |
| SDK tool_call 响应形状与 @ai-sdk/openai-compatible 解析不匹配（A 组 mock 新形状） | V 组先例（裁决路由）+ A02 首跑若红：以 mock 实收请求体为准修 mock 形状（记 JOURNAL，不改被测代码）；provider 侧解析为既有 llm.ts 依赖面零新险 |
| generateText abort 不抛错（ai@7 行为差异） | §4.3 每 await 后显式判 signal.aborted（PRD 风险表预置）+ A04 停止路径断言兜底 |
| agent.ts 超 200 行 | §4.7 拆分预案（新文件 mcp/ztools.ts，不改 llm.ts，白名单 +1 记 JOURNAL） |
| baseline/README 再生产漂移（17 键外差异） | §5.1 diff 恰 +1 键判据 + 生成器幂等只写变化文件（`git status` 核对 #2/#3 恰两路径） |
| s3 重录被泛化 | §6.3 ⑤机器核对（golden 区恰 3 文件变化）+ AC3 硬边界（意外红中止） |
| smoke V09 时点性假红（产品提交前 git 半边） | 0018/0021/0022 先例：提交后复跑自愈；VERIFY 记实得值 0 failed 判据 |
| param-handler-guard 提取器漏 agent 源（实施笔误） | §5.4 新增提取器与汇总并测；漏则 agent 三参数判僵尸红（结构性护栏自带兜底） |
| 节点库/画布渲染意外（agent 参数 widget 形态） | 通用渲染链既有 16 节点全覆盖先例；gate 9 场景实测 + AC4 前端零 diff 兜底；意外红按 §6.3 中止条款 |
