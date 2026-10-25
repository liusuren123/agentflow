# REPORT · 迭代 0027 · BK-0032 agent 节点与 goal 会话面板 ADR 草案 SPEC 先行（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 12:10 前后
> 输入：`PRD.md` AC1~AC7 + `SPEC.md` §9 验收口径 + `JOURNAL.md` 移交说明（含 §3.1 偏差提请裁定）。
> 环境：Windows（AI-WorkStation）· Node v24.21.0 · HEAD = f16663d · 工作区含本迭代未提交产物。

## 0 · 总结论

**PASS（7/7 AC 全过，零缺陷，无需修复轮）。** 纯文档轮兑现：产品面恰
`docs/adr/0013-agent-node-goal-session-panel.md` 一文件纯新增（297 行 ≤400），
BACKLOG 三行定界回写与 SPEC §8.2 字面量**字节级全等（VERBATIM=true ×3）**，
`apps/packages/tools/tests/.github/package*.json` 禁区 diff 恒空（零代码/零依赖
机器证明）。消费映射全部锚点与代码逐一相符、无一杜撰；针对性 E2E（sessions
五端点语义 + SSE 正常/停止双路径 + 浏览器交互回归抽查）实测通过。BUG 清单：空。

例外说明（派发指令预见的并行收尾情形未发生）：STATE.md `iteration` 仍为 0027
（phase: BUILD），本报告按常规 VERIFY 路径产出。

## 1 · AC 逐条结论与证据

### AC1 · ADR 落盘与六要素完备 — PASS

命令与输出（本会话亲跑）：

- `ls docs/adr/0013-*.md` → 恰一文件 `0013-agent-node-goal-session-panel.md`
  （docs/adr/ 现行 0001~0012 + 本文件，编号顺延成立）；
- `wc -l` → **297 行** ≤400（且 ∈ SPEC §3 预算区间 280±60）；
- `grep -n "草案"` → `:3` 状态行命中：「草案 · 待实施轮消费（BK-0033 …/BK-0034
  ——链终轮）；授权链 = issue#2 用户批复承继（2026-10-23T15:49:39Z，见 BACKLOG
  BK-9002 行）」；`grep -n "2026-10-23T15:49:39Z"` → :4/:26/:241 三处（授权链引用在案）；
- `grep -c "已批准"` → **0**（非功能要求 3 兑现，全文无批准态措辞）；
- EOL/BOM：`tr -cd '\r' | wc -c` → **0 字节 CR**、LF=297（纯 LF）；首三字节
  `23 20 41`（"# A"，UTF-8 无 BOM；`file` = UTF-8 text）。注：Git Bash 下
  `grep -c $'\r'` 曾误报 297（MSYS 文本模式伪象），以 `tr`/`od` 字节级结果为准；
- 六要素成节可索引（`grep -n "^## "` 亲核）：§1 动机与现状证据（①）、
  §2 DEFS 方案+§2.4 类目色两段口径（④）、§3 handler 边界（④）、§4 goal 面板
  方案（②前半）、§5 消费映射+护栏（⑤）、§6 像素对比证据方案（③）、§7 BK-0015
  联合评估、§8 BK-0033/0034 定界（⑥）、§9 影响面与不做范围（②收口）。

### AC2 · 消费映射与护栏真实可核 — PASS

逐条对照（本会话 Read/sed/grep -n 亲核，非引用他人结论）：

- **五端点**：`sed -n '210,225p' apps/server/src/server.ts` → :214 注释「迭代
  0015 / BK-0016 会话端点：仅注册 v1」+ :215-219 恰五行：POST/GET
  `/api/v1/sessions`、GET `/:id`、POST `/:id/chat`、POST `/:id/stop`——与 ADR
  §5.1 表逐行相符（含 :215~:219 每行锚点）；handler 落位与语义亲核：create
  :39-42（201）、list :44-48（limit 1-100 否则 400，默认 `?? 20`）、detail
  :50-54（404/`{session, messages}`）、stop :58-63（无活动 turn 404，:56-57
  注释「不区分会话不存在与无活动 turn」字面在）、chat :69-164（①400 text 非
  非空字符串 → ②404 → ③409 顺序与 ADR 表一致）。
- **15 事件**：`packages/shared/src/events.ts` RunEventSchema z.literal 恰 15
  个（run:accepted/start/progress/error/done、node:start/bypass/delta/done/
  error、cond、log、output、approval:required/done）——ADR §5.2「7 消费 + 8
  不消费」清单与 15 种总集完全对账（7+8=15），无一杜撰。
- **7 事件发射点**（grep -n 精确命中）：run:accepted **:91**、run:done **:95**
  （finish 闭包 :95-97）、log warn **:106**、run:error **:107**、node:start
  **:114**（`id: SESSION_NODE_ID`，常量 =0 在 **:28** 亲核）、node:delta
  **:126/:130**（`text: acc` 累积全文；节流常量 DELTA_EMIT_MS=60 在 **:31**
  亲核）、node:done **:144**、log ok **:146**、run:error **:155**；停止路径
  `if(ac.signal.aborted)` 在 **:134-137**（部分保留落库、不发 node:done）——
  ADR §5.2 run:done 行的加粗语义与代码逐字相符。头注「turn 流式复用现有 15
  种 SSE 事件承载……零新增契约」在 :7-9（SPEC 引 :8-9 射程内）。
- **护栏声明**：ADR §5.3 与 SPEC §5.4 规定文本**逐字一致**（含「立即中止转
  needs-approval issue，不得自主新增（沿 BK-0016 行内护栏先例，BACKLOG.md:93）」；
  BK-0016 行现位 :93 亲核）。PRD AC2 的「15 种内取用，确需新增即中止转
  needs-approval」在 ADR 中以完整分句形式在案（「在既有 15 种 SSE 事件内取用…
  实施中确需新增事件类型即触 POLICY 需批准区…立即中止转 needs-approval」），
  语义与先例口径完整，判定满足。

### AC3 · BK-0015 联合评估成文 — PASS

- `grep -n "for(let round" apps/server/src/llm.ts` → **:70**
  `for(let round=1; round<=3; round++){`，文件 126 行（wc -l）——现状锚点精确；
- ADR §7 四段齐备：①锚点（含「SDK 面复核为实施轮 SPEC 义务」时效声明）；
  ②三选一利弊表（a env / b DEFS 参数 / c 引擎常量，含需批准面列）；③最小
  需批准面结论——**「agent 节点路径零额外请批面」** + **「llm 节点 round≤3
  维持现状不动」**双面声明在案（:241 加粗）；④请批清单「无（零请批面）」+
  附条件条款（BK-0033 若扩展 llm 节点参数须另开 needs-approval，不得沿用
  issue#2 承继）。PRD AC3 全要素命中。

### AC4 · 定界回写 VERBATIM 一致 — PASS

node 脚本字节级比对（本会话亲跑，从 SPEC §8.2 fenced 字面量提取 vs BACKLOG
行备注列）：

```
BK-0033: status=proposed, bytes backlog=1015 spec=1015, VERBATIM=true
BK-0034: status=proposed, bytes backlog=902 spec=902, VERBATIM=true
BK-0015: status=proposed, bytes backlog=417 spec=417, VERBATIM=true
```

- 三行状态列均仍 `proposed`（其余列逐字不动，split('|') 9 列结构校验）；
- BK-9002 行、BK-0032 行与 `git show HEAD:docs/evolution/BACKLOG.md` 逐字节
  比较 → **unchanged=true**（BK-0032 状态流转归 CLOSE、BK-9002 留指向，均未碰）；
- `git diff --stat -- docs/evolution/BACKLOG.md` → 恰 3 insertions / 3 deletions
  （三行原地替换，表结构零变化）；
- ADR §8 与 SPEC §8.1 四要素（受影响文件/验收口径/依赖关系/需批准面）逐项
  语义相等（BK-0033：agent/node.ts+nodes.ts+baseline 重产+agent.ts+engine
  注册+s8/s3 golden；BK-0034：app.js 面板+app.css 纯插入+server-sync sessions
  面+s9+SESSION_ROUTES；两轮验收命令与链终轮回执编排一致），双向互指
  「ADR §8 定界与迭代 0027 SPEC §8 字面一致」在 BACKLOG 行与 ADR §8 头部
  均在案——SPEC §8.3 VERBATIM-OK 判据达成。

### AC5 · 白名单与零代码机器证明 — PASS（附如实记录）

- `git status --porcelain` → 仅 `M docs/evolution/BACKLOG.md`、
  `M docs/evolution/STATE.md`、`?? docs/adr/0013-*.md`、
  `?? docs/evolution/iterations/0027/`（PRD/SPEC/JOURNAL 机制件）；
- `git diff -- apps packages tools tests .github package.json package-lock.json`
  → **输出为空**（零代码/零 UI/零契约；package-lock.json 零变化 = 零依赖引入）；
- **如实记录**：AC5 规定的 `git show --numstat <产品提交>` 部分**未执行**——
  产品提交在本 VERIFY 时点尚未落库（WORKFLOW §5.1：全部 git 操作由脚本统一
  执行，产品提交在 VERIFY 之后创建）。以工作区状态为该时点的等效机器证明：
  待提交产品面 = 恰 `docs/adr/0013-*.md` 一路径纯新增（untracked，+297/−0 等价），
  其余改动均为 SPEC §1 归档提交面机制件。CLOSE/脚本侧提交后本条自动闭合。

### AC6 · 纯回归面全绿 — PASS（脚本侧结论引用，未复跑）

按 SPEC §9 总门禁条款（先例 0012/0014/0016/0017/0019/0023~0026：VERIFY 不必
复跑全套，REPORT 引用门禁结论）与本次派发指令（「build/gate/test 已由脚本
运行且通过，不要重复跑全套」）：`npm run build` / `npm run gate` / `npm test` /
`npm run smoke:server` 为脚本侧执行并告知通过，本 VERIFY 未复跑、如实记为
引用。旁证：本报告 AC5 禁区 diff 恒空 + §2 E2E 实测（应用可起、后端已连接、
16 节点清单不变）共同佐证基线未受扰动。

### AC7 · 指针抽样可开 — PASS（实查 17 组，远超 ≥5）

全部 file:line 本会话亲读命中（详见 §1 各条）：① server.ts:215-219；②
events.ts 15 literals；③ llm.ts:70；④ sessions.ts :7-9/:27/:28/:31/:39-42/
:44-48/:50-54/:56-63/:69/:91/:95-97/:106/:107/:114/:126/:130/:134-137/:144/
:146/:155；⑤ gate.mjs:176-187（SCENARIOS 恰 8 项 s0~s7；s4 WF_ROUTES :181 /
s5 RUN_ROUTES :182）+ **:247-253 golden-created 通道**（`if (UPDATE ||
!existsSync(gPng))` 落盘并记 status——SPEC §6 对 PRD :192-196 的勘正经亲核
成立，ADR 采用核实值正确）；⑥ `packages/shared/src/nodes/` **16 目录 +
README**（ls 亲核）+ nodes.ts 142 行 + :97-99 caps 合成（只映射 mcp/skill
两键，ADR §2.3「agent kind 不进 caps」论断与代码相符）；⑦ nodes/llm/node.ts
:22-28 model options 恰 6 项（与 ADR §2.1 草图逐值一致）+ :39 三键；⑧
nodes.schema.ts（路径 `packages/shared/src/nodes.schema.ts`，174 行）：:13-15
端口五/widget 五/分类七枚举、:18-26 端口 id 正则、:50-58 widget×default 矩阵、
:72-83 十 kind 含 agent、:107 requiresApproval「预留·未启用」；⑨ app.js
:46-54 CATS 七类目、:77 sparkles、:133 `DEFS=NODES`、:322-336 节点库通用渲染
（~:325 kw 搜索/~:334 caps mini-tag）、:469 浮动 box、:1264 def 取用、
:2237-2242 run SSE fetch+getReader；⑩ app.css:19-20 `--cat-chat:#a06bff`；
⑪ store.ts:48-56 SessionRow 六字段；⑫ handlers.ts:17 + engine.ts:26-27；
⑬ server-sync.js:45-48 wfArrive/runsArrive；⑭ node-definition-protocol.md
:529-531（T4+「未获批准前不落地」）、:541（「可点开进入流式会话面板」）、
:390-394（agent sessionMode「BK-9002 批准后启用」）；⑮ BACKLOG :45/:46/:47/
:63/:73/:92/:93/:98 行（BK-9002 行含批复时间戳 2026-10-23T15:49:39Z 亲核）；⑯
ROADMAP :126-128（差异化空白带）、:138-139（「停止条件与预算控制」——短语
跨 :138/139 两行，锚点行命中）、:163-164（先迁移后扩展）、:184-190（SPEC
四连先行 BK-0032 首位）；⑰ docs/adr 现行 0001~0012。**零失效指针。**

## 2 · 针对性 E2E（test-manager 职责；纯文档轮运行时零影响证明）

实测环境说明：本会话启动的服务进程（pid 17984）退出后，:3000 由**既有**进程
（pid 38108，先于本 VERIFY 存在）继续监听并应答了下列全部请求——本轮零代码，
任何在跑构建与当前源码行为一致；且下述全部响应与当前源码逐字相符（错误文案、
事件形态均亲核自 sessions.ts），不影响证据效力。实测写入的 1 条会话与 2 个
turn 落在 `data/agentflow.db`（git 忽略区，不入库）。

**（a）sessions 五端点语义（curl 实测，HTTP 码 + 响应体亲核）**：

| 用例 | 期望（ADR §5.1） | 实测 |
| --- | --- | --- |
| POST /api/v1/sessions {title,model,sys} | 201 + SessionRow 六字段 | **201**，`{id,title,model,sys,created_at,updated_at}` 恰六字段 ✓ |
| GET /api/v1/sessions?limit=20 | 200 {sessions}（updated_at 倒序） | **200**，列表含新建会话居首 ✓ |
| GET ?limit=0 | 400 | **400** `{"error":"limit 必须是 1-100 的整数"}` ✓ |
| GET /:id（不存在） | 404 | **404** `{"error":"session not found"}` ✓ |
| POST /:id/chat text="  " | 400 | **400** `{"error":"body.text 必须是非空字符串"}`（且 400 先于 404 判定，与代码步①②一致）✓ |
| POST /不存在/chat text="hi" | 404 | **404** ✓ |
| POST /:id/stop（无活动 turn） | 404 | **404** `{"error":"session turn not found"}` ✓ |

**（b）SSE 事件流双路径实测（curl -N 采流 + 事件名统计）**：

- 正常路径（短问答，turn 697ms 完成）：事件序列 `run:accepted → node:start →
  node:delta ×4 → node:done → log(ok) → run:done{ok:true, stopped:false,
  done:1}`，node:done 载荷含 out=全文，log 为「✓ 会话回复 · 生成 N tokens ·
  Xs」——与 ADR §5.2 表逐行一致 ✓；
- 停止路径（长文生成 1.2s 后 POST stop → 200 {ok:true}）：`run:accepted →
  node:start → node:delta ×9 → run:done{ok:false, stopped:true, done:0,
  outputs:[部分文本]}`，**node:done 计数 = 0**，最后一条 node:delta 的
  text=累积部分全文（与 outputs 起始一致，id 恒 0）——ADR §5.2 run:done 行
  「stopped=true → 已停止且服务端不发 node:done，面板以最后一次 node:delta
  固化气泡（部分文本已落库）」的契约**实测逐项兑现** ✓（沿 0015 真实 DeepSeek
  stop 先例；该 turn 为环境既有 DeepSeek 配置的真实出站，成本一次性且极小）。

**（c）浏览器交互回归抽查（IAB 实开 http://localhost:3000）**：

- 应用可起：标题「AgentFlow · 智能体工作流原型」，日志面板显示「⚡ 执行后端
  已连接 · Vercel AI SDK 7 · Node v24.21.0 · 已连接 DeepSeek」✓；
- 画布正常加载：`#viewport` =1、`.node` =4（与「节点 4 · 连线 0」状态条一致）✓；
- 节点库：打开后 `.lib-node` =**16**、`.lib-cat` =**7**（输入 2/对话 2/知识 2/
  工具 3/逻辑 4/输出 2/人工 1，条目名与 16 目录一一对应），**无「通用智能体」
  条目**——文档轮对运行时 DEFS 零影响实证 ✓（SPEC §9 手动 E2E 点位达成）；
- 交互链：节点库 rail 按钮开合正常；画布节点（data-id=2 LLM 对话）点击选中
  → 属性面板由「未选中任何对象」切换为编辑态（#2 · LLM 对话 · 节点名称/模型
  DeepSeek-V4…）✓；收藏/快捷键/搜索/审批三类 modal-mask 均为 display:none
  挂载态（无异常弹层）；
- 截图证据：`C:\Users\Administrator\.zcode\cli\artifacts\...(call_756743dc…).png`
  （节点库开 + 节点选中态；会话内留档）。

## 3 · BUILD 移交事项裁定（JOURNAL §3.1 偏差）

**裁定：认可（非偏差性缺陷，按代码事实修正正确）。** SPEC §4.2 表第 2 行论据
栏「llm 节点仅声明四键」为计数笔误——本会话亲核 `nodes/llm/node.ts:39` 实为
**三键** `capabilities: { llm: true, mcp: {…}, skills: true }`；ADR §2.2 第 2
行按事实转写为「仅声明 llm/mcp/skills 三键」，技术结论（agent 定稿草案收敛为
llm/mcp/skills/agent 四键、不声明 exec/net、护栏由工具层承载）零改动，且使
AC7 指针核对与代码一致。BACKLOG 回写字面量（SPEC §8.2 权威载体）不含该表述，
VERBATIM 比对不受影响。无需回退方案。

## 4 · 缺陷清单

无（BUG-0000：本轮零缺陷）。观察项（非缺陷，不计入）：① Git Bash 下
`grep -c $'\r'` 对纯 LF 文件误报行数（MSYS 文本模式伪象），EOL 判定应以
`tr`/`od` 字节级为准——已在本报告 AC1 记录方法学；② 本机 :3000 存在先于本
轮的常驻服务进程（pid 38108），后续迭代 E2E 若需测「冷启动」行为需先辨明
监听进程。

## 5 · 移交 CLOSE

- 结论：**PASS**——BK-0032 可置 done；issue#2 仅发进度回执**不关单**（关单留
  BK-0034 链终轮，PRD 批次编排在案）；
- 产品提交由脚本按白名单创建（恰 `docs/adr/0013-*.md` 一路径纯新增）；AC5 的
  `git show --numstat` 复核在提交落库后自动闭合（本报告 §1/AC5 已载工作区
  等效证明）；
- BACKLOG 三行回写随归档提交入库（已 VERBATIM 校验）；BK-0015 行备注已按
  评估结论刷新、状态 proposed 不动（待 BK-0033 CLOSE 后随批关账）。
