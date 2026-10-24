# PRD · 迭代 0017 · BK-0027 真 MCP client 传输选型 SPEC 先行（BK-0013 拆分）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 16:42
> 来源：BACKLOG BK-0027（P1 / capability / M / ready / 触UI=否，来源 T5；2026-10-24
> 第三次周度治理由 BK-0013[L/skipped] 拆分产生——「SPEC 先行」轮，BUILD 阶段零依赖
> 引入零代码，BACKLOG.md:32 行内备注明载）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · 里程碑 M1「runtime 承重墙」四项之一
> BK-0013 的拆分先行轮（`ROADMAP.md:127,136-139`；M1 现状 2/4——BK-0016/0017 已
> 落地，BK-0013 经本项解阻后进入三子项 BK-0028~0030 实施链）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 16:3x~16:42 核实）：
> ① **批复项无新动作且现存批复项全部顺延**——档案「approved：无」与 BACKLOG 实况
> 一致（七项批复已于 0011 轮全部落 ready，其中 BK-0026/BK-0025/BK-9001 及 BK-0016
> 相关地基已相继 done）。余下批复 ready 项 BK-9002~9005（P0/L/触UI=是）顺延论证
> **本轮复核仍成立**（0016 PRD 头部先例）：BK-9002/BK-9003/BK-9005 前置 BK-0021
> （NDP 迁移——其先行项 BK-0031 ready 未做），BK-9004 前置 BK-0016 已 done 但为
> L 项且「拆分排序待下个治理日」（`ROADMAP.md:154-155`，10-25 周日）——心跳抓取
> 即夹带拆分、违反「一次迭代只做一件事」→ 顺延。② **user-request 无**——本轮
> 档案 issue 面板仅含 needs-approval 五项（#2~#6），无 user-request 条目；#6 open
> 未批复维持待批准区不建行、不催办；既往面板的 #9（AGENTS.md 漂移通知）本轮未
> 出现且 0014/0016 轮已按禁止区先例处置（用户已亲改在库，待自行确认关单），无
> 增量动作。③ rejected 无。④ **常规选题取 BK-0027**——批复项顺延后非修宪 ready
> 队首（P1/M，类型 capability 非 doc、非触 UI；主池表序第一 `BACKLOG.md:32`），
> 且治理日解阻链明示心跳选题第一顺位「BK-0027 → BK-0031 → BK-0011 → BK-0008」
> （`ROADMAP.md:166-169`）。与最近 3 次迭代重叠面核对：0016=approval-review.ts
> 新增 + handlers/store/smoke V 组、0015=sessions.ts 新增 + store/server/smoke
> G 组、0014=handlers code handler + smoke K 组——本轮**纯 docs/ 改动**（ADR
> 草案新增 + BACKLOG 定界回写），对三迭代的全部代码触点零重叠。

## 结论

**建议做（本迭代即做）**：一句话理由——T5 主题的差异化定位是「画布编排 × 深度智能体
工作台」，而当前画布上的「MCP 服务器」是五个**内置伪 server**：前端注册表注释自认
「原型模拟数据」（`app.js:102-114`），后端只有写死的 IMPL 映射、连不上任意外部
MCP server（`tools.ts:26-73`）。真 MCP client 是接入既有工具生态（数以千计的
MCP server）的唯一桥梁，但其实现轮含 POLICY 需批准承载（新增 npm 依赖 + 新增
出站类别）——按 BK-0021 同款从严路径，必须**先出 ADR 草案 + 三子项定界 +
needs-approval issue 草案，获批后才开工**。本迭代即做这个 SPEC 先行轮：零代码、
零依赖、零 UI，纯文档产出，解阻 T5-M1 承重墙剩余主项。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为 `docs/adr/0012-*.md`（**新增**，技术选型 ADR 草案）与
   `docs/evolution/BACKLOG.md`（BK-0028~0030 三行备注定界回写）；`apps/**`、
   `packages/**`、`tests/**`、`tools/**`、`.github/**`、`package.json` 零字节
   改动——视觉 / DOM 结构 / 交互三层与 golden 基线均不接触，`npm run gate`
   8 场景为纯回归面（AC5）。
2. POLICY 校验：文档与实现同步（ADR 记述）+ 侦察与立项（BACKLOG 维护）——
   **自主区**。ADR 草案规划的「未来新增 npm 依赖 / 出站类别 / env 语义」全部
   只以**文字方案**存在：草案显著标注「待用户批准，批准前零实现」，三子项
   BK-0028~0030 维持 proposed（转 ready 的唯一条件 = issue 获批），本迭代
   不引入任何依赖、不动 guard.ts / tools.ts / llm.ts 一行代码。
3. **DEFS / SSE 契约零涉及**：不改 `packages/shared/**`（AC4 机器核对含
   package-lock.json 零变化的零依赖证明）。ADR 草案须显式声明：外部 server
   的工具清单如何呈现到画布（MCP_SERVERS 动态化）触 UI，归 BK-9006
   （issue #6 未批复）——本轮与实施轮的协议接入均不以此为前提（后端注册表
   先行，前端清单动态化独立走修宪）。

## 背景（代码事实源，2026-10-24 16:3x~16:42 本会话只读核实）

1. **后端伪 MCP 现状**：`tools.ts:26-73` `IMPL` 为五个内置 server 的写死映射
   （filesystem / fetch / web-search 内置实现；sqlite `:59`、browser `:60` 为
   `null`，由 `stubOf` `:81-85` 如实降级「not implemented」——残缺标记档案
   tools.ts:5/:82 即此，已知状态：BK-0005 done + M07 断言守护 / BK-0008 ready
   承载 sqlite 真实化）。**不存在任何外部 MCP server 连接代码**（无 stdio
   spawn、无 MCP HTTP client）。
2. **工具装配链（BK-0029 注入点）**：`collectTools(mcpSel)` 把节点勾选展开为
   `{server.tool: impl}`（`tools.ts:104-116`——勾选了 IMPL 没有的工具即落
   stub）；消费点在 `llm.ts:9,38`（`collectTools(n.mcp)` → AI SDK tool 循环）。
   外部 server 工具发现的注入点即此：发现结果并入 IMPL 之上的动态层，还是
   替换 IMPL 语义，是 ADR 须定界的接口问题。
3. **前端硬编码清单**：`app.js:102-114` `MCP_SERVERS` 五项写死（`:102` 注释
   自认「原型模拟数据」），`SKILL_LIST :115-121` 同性质；节点属性面板的能力
   勾选清单即由此渲染。动态化触 UI 归 BK-9006，本迭代零接触。
4. **guard.ts 出站类别三形态（网关模式先例）**：`guardedFetch` 用户可控 URL +
   SSRF 校验（`:58-62`）；固定主机网关（bocha `:71-79` / ddg `:81-86`，编译期
   常量主机）；SearXNG **动态主机** env 网关（`:88-100`，env 主机经
   assertPublicUrl 动态校验）——BK-0030 行内「Streamable HTTP 出站须经
   guard.ts 网关模式收口」的先例锚点即 searxngSearch 形态。
5. **依赖面现状**：`apps/server/package.json:11-19` 依赖 = shared /
   @ai-sdk/openai-compatible / ai / better-sqlite3 / express / pino / zod——
   无任何 MCP client SDK；根 `package.json:25-33` 与 allowScripts 同样无。
   `@modelcontextprotocol/sdk` 引入即 POLICY 需批准区（新增 npm 依赖）。
6. **子进程与沙箱先例（stdio 安全锚点）**：AGENTS.md 硬性约定 3——「文件工具
   只在 apps/server/sandbox/ 内；代码节点必须子进程 + 超时」（code.ts wrapper
   + 5s 超时 + 退出码判定的核查在案：iterations/0014/PRD.md 背景 1 第五环）。
   stdio 传输 = 在服务器 spawn 外部命令，其约束方案（命令注册白名单 / 超时 /
   禁任意 shell）必须对齐该约定的同等强度。
7. **ADR 序列现状**：`docs/adr/` 现有 0001~0011（本会话 ls 实查），本轮草案
   编号 **0012**（ADR-0011 为 browser MCP 可行性评估「近期不实施」结论——
   与本项正交：那是「内置 browser 工具是否真化」，本项是「连接外部 MCP
   server」）。
8. **竞品对照**（product-manager.md 职责 2）：ComfyUI 无 MCP 概念（工具生态
   走 Python 自定义节点安装路径，与本仓宪法保护的画布形态不同源）；n8n /
   Langflow / Dify 均已提供 MCP 节点或触发器；Claude Code / Cursor 等 agent
   工作台把 MCP 作为工具生态一等公民（项目级 .mcp.json / 全局注册）。定位
   「画布编排 × 深度智能体工作台」空白带（ROADMAP T5 头注）的 AgentFlow，
   MCP client 是不做重生态共建的前提下接入存量工具的桥——ADR 需对照该格局
   论证 stdio（本地进程生态，Claude Code 同款）与 Streamable HTTP（远程
   服务生态）的取舍与次序。

## 目标

1. **ADR-0012 草案落盘**：真 MCP client 传输选型（stdio / Streamable HTTP）
   与依赖选型、安全边界的完整决策文档（六要素见 REQ-0027-01），显著标注
   草案状态。
2. **三子项定界**：BK-0028（传输层）/ BK-0029（注册与工具发现）/ BK-0030
   （会话注入与 guard 出站类别扩展）的实施边界、验收口径、依赖顺序与需批准
   面，回写 BACKLOG 行内备注。
3. **needs-approval issue 草案**：请批清单（新增依赖项 + 出站类别扩展 +
   env 语义面）成文在案，供脚本开 issue。
4. **证明**：零代码 / 零依赖 / 零契约的机器核对（AC4）+ 回归面全绿（AC5）。

## 非目标（out of scope）

- **不实现任何 MCP client 代码**：tools.ts / guard.ts / llm.ts / server.ts
  零改动；`@modelcontextprotocol/sdk` 或任何新依赖零引入（issue 获批前的
  铁律，BACKLOG BK-0027 行内明示「BUILD 阶段零依赖引入零代码」）。
- **不动 `packages/shared/**`**：DEFS / SSE 事件契约零涉及（外部 server 不
  是画布节点；工具清单进前端面板 = BK-9006 触 UI 待批准）。
- **不动前端**：MCP_SERVERS / SKILL_LIST 动态化归 BK-9006（issue #6 未批复）。
- **不代开 issue、不代批**：issue 草案只产出文本；开 issue 由脚本，批复只认
  用户本人（POLICY 禁止区）。
- **不改 BK-0028~0030 状态**：维持 proposed；转 ready 唯一条件 = 对应
  needs-approval issue 获用户批复。
- **不做 BK-0014（扩展发现器）的设计**：.mcp.json / ~/.agents 扫描是下游项
  （依赖 BK-0028~0030 落地），ADR 仅在影响面章节预留衔接说明。
- 不更新 ROADMAP / metrics 状态（CLOSE 职责）。

## 用户故事

1. 作为工作流作者，我希望画布上的 LLM 节点能勾选**我自己部署的** MCP server
   工具（本地 mcp-server-sqlite、团队 SearXNG MCP 网关），而不是只有五个
   写死的内置项——画布的价值在于编排任意工具生态。
2. 作为宪法主权者，MCP client 的每一项需批准承载（新依赖、新出站类别、新
   env 语义）都必须先经我批复——本轮只出方案不动工，三子项在 issue 获批前
   不得转 ready。
3. 作为 spec-designer / code-developer，BK-0028~0030 三个子项的边界、接口
   契约与验收口径要在开工前定死，避免实施轮才发现传输层与注入层互相踩面。
4. 作为安全审计者，「在服务器上 spawn 外部命令」（stdio）与「向用户配置的
   URL 发请求」（Streamable HTTP）两面的风险与约束方案必须显式成文，对齐
   仓库既有的沙箱 / SSRF 约束强度。
5. 作为 test-manager，纯文档轮的验收必须是可机器核对的文件级判据（白名单
   diff / 零依赖证明），不接受「文档看起来写好了」。

## 需求条目

- **REQ-0027-01 · ADR-0012 草案落盘（docs/adr/0012-mcp-client-transport.md，
  文件名 SPEC 可微调、编号 0012 固定）**：状态行显著标注「草案 · 待用户批准
  （对应 needs-approval issue），批准前零实现」。六要素逐节：
  (a) **动机与现状证据**——伪 MCP 五内置（tools.ts:26-73）+ 前端原型模拟
  数据（app.js:102-114）+ T5 定位论证（竞品对照结论入文）；
  (b) **传输选型对比矩阵**——stdio vs Streamable HTTP，至少五维度（适用
  场景 / 依赖与实现面 / 安全面 / 运维与配置面 / 与 16 节点引擎的集成复杂度），
  结论须明确：两者是否都做、先后次序、统一抽象（连接层接口如何同时承载
  两种传输）；
  (c) **依赖选型**——官方 SDK（@modelcontextprotocol/sdk）vs 手写最小
  JSON-RPC client，论证含协议面清单（initialize 握手 / capabilities 协商 /
  tools/list / tools/call / notifications / 版本演进负担）、许可与体积、
  与 ai@7 + ESM + tsc 构建链的兼容（SPEC 会话联网调研，标注调研日期与
  来源），给出推荐结论；
  (d) **安全边界**——stdio：spawn 命令注册面方案（白名单来源选项：env /
  配置文件，均属未来 env 语义→需批准）、超时与生命周期约束、对齐 AGENTS.md
  硬性约定 3 同等强度；Streamable HTTP：guard.ts 网关模式收口方案（对齐
  searxngSearch 先例 :88-100）、SSRF 校验、允许内网 MCP server 的逃生口径；
  (e) **三子项定界索引**——指向 BACKLOG 回写（REQ-0027-02），含模块划分
  草图（新增文件名建议 + 各 ≤400 行约束下的拆分预判）；
  (f) **影响面与不做范围**——零 UI 声明（BK-9006 归属）、BK-0014 衔接
  预留、BK-0008（sqlite 真实化）与内置 IMPL 的共存口径（内置五项是否
  保留为「built-in 伪 server」层）。
- **REQ-0027-02 · BACKLOG 定界回写**：BK-0028 / BK-0029 / BK-0030 三行备注
  更新为定界口径，每行四要素：受影响文件清单（预估）、验收口径（一句话
  可验证形态）、依赖关系（28 无前置；29 依赖 28；30 依赖 28+29 之序或并行
  论证）、需批准面与转 ready 条件（= issue 获批）。BK-0013（skipped）行
  零改动；若 ADR 结论与三子项现行标题有出入（如实施次序调整），在备注内
  注明「以 ADR-0012 为准」，不改标题。
- **REQ-0027-03 · issue 草案成文**：固定章节落在 ADR 附录（或 SPEC §issue
  草案，SPEC 定）——标题（含「BK-0028~0030 真实 MCP client 实施」与请批
  关键词）+ 正文（请批清单：① 新增 npm 依赖项与理由；② 出站类别扩展
  （Streamable HTTP 网关）与安全方案摘要；③ stdio spawn 的 env 语义面；
  ④ 三子项实施顺序；⑤ 证据链接（ADR-0012 / 本 PRD / 代码现状指针））。
  文本可被脚本逐字取用。
- **REQ-0027-04 · 改动面白名单**：产品提交 git diff 仅允许——
  `docs/adr/0012-*.md`（新增）、`docs/evolution/BACKLOG.md`（定界回写）；
  其余任何路径零改动（AC4 机器核对，含 package-lock.json 零变化 = 零依赖
  引入证明）。

## 非功能要求

1. **零实现铁律**：本迭代不引入依赖、不改任何 apps/ / packages/ / tests/ /
   tools/ / .github 文件（AC4 白名单 + lock 文件双证明）。
2. **可核查性**：ADR 草案内引用的一切代码指针（file:line）必须真实可开
   （AC6 抽样 ≥5 条逐一比对；本 PRD 背景节指针为本会话亲核基线）。
3. **POLICY 合规形态**：草案显著标注待批准；BK-0028~0030 维持 proposed
   （AC2 断言状态未变）；issue 草案 ≠ 开 issue ≠ 获批，三段分清。
4. **规模**：ADR 草案 ≤ 400 行（对齐仓库文件规模惯例）；BACKLOG 回写增量
   ≤ 30 行；SPEC 给精确行数预算。

## 验收标准（Given / When / Then）

- **AC1 · ADR 草案六要素齐备**：Given `docs/adr/` 目录（现行 0001~0011），
  When 读本轮新增的 0012 号草案全文，Then (a)~(f) 六要素逐一在案且均有实质
  内容——对比矩阵覆盖两传输 × ≥5 维度并给出先后次序与统一抽象结论；依赖
  选型含协议面清单、调研来源与推荐结论；安全边界含 stdio 约束方案与
  Streamable HTTP guard 网关收口方案；文件头显著位置标注「草案 · 待用户
  批准，批准前零实现」。
- **AC2 · 定界回写与状态不变式**：When 读回写后的 BACKLOG，Then BK-0028~
  0030 三行备注各含四要素（受影响文件 / 验收口径 / 依赖关系 / 需批准面与
  转 ready 条件）；三行**状态列仍为 proposed**；BK-0013 行（skipped）逐字
  未动；BK-0027 行状态流转由 CLOSE 置 done（BUILD 期 doing 归脚本）。
- **AC3 · issue 草案完整可用**：When 读 ADR 附录（或 SPEC 固定章节）的
  issue 草案，Then 标题 + 正文五要素（依赖项 / 出站类别与安全摘要 / env
  语义面 / 实施顺序 / 证据链接）齐备，文本自包含（不依赖会话上下文即可
  理解请批内容）。
- **AC4 · 白名单与零实现机器证明**：When 对产品提交执行
  `git show --numstat` 与 `git diff` 核对，Then 仅 REQ-0027-04 白名单两
  路径；全库无 apps/ packages/ tests/ tools/ .github/ package.json/
  package-lock.json 任何改动（零依赖引入的机器证明）。
- **AC5 · 回归面**：`npm run build` + `npm run gate`（8 场景）+ `npm test`
  + `npm run smoke:server` 全绿——零代码改动的纯回归面，按工作流脚本统一
  门禁执行口径采信（先例 0012/0014/0016：VERIFY 不必复跑全套，REPORT 引用
  门禁结论）。
- **AC6 · 指针可核查**：When（VERIFY 执行）从 ADR 草案引用的代码指针中
  抽样 ≥5 条逐一打开比对，Then 全部与代码现状一致（file:line 或行段射程
  内命中）；发现任一指针失效即 FAIL 并列 BUG。

## SPEC 要求（skipSpec=false）

BK-0027 为 M 项——不免 SPEC。SPEC 须含：ADR 章节骨架逐节展开与行数预算
（六要素 → 章节 → 各节要点与上限）；传输对比矩阵的维度定稿与每维度评估
口径；依赖调研方法（SDK 当前版本 / 许可 / 依赖树规模 / peer 冲突 / 与
ai@7 ESM + tsc 构建链兼容性，联网调研结论标注日期与来源 URL，并预留
「实施轮 SPEC 复核时效」提示）；stdio 安全约束的方案选项展开（env 白名单
vs 配置文件注册表 vs 两者并存——均标注为未来 env 语义需批准面）；Streamable
HTTP 网关模式设计草图（函数签名级，对齐 searxngSearch 先例）；BK-0028~
0030 定界回写的 BACKLOG 备注模板字面量；issue 草案标题/正文字面量；AC1~AC6
逐条的执行命令与核对方法；回滚步骤（纯文档 revert，无运行时影响）。

## 依赖与风险

- **依赖**：零代码依赖；SPEC 会话需联网调研 MCP SDK（WebSearch / WebFetch，
  product-manager / spec-designer 工具面均可用）。
- **风险 1 · ADR 结论与子项现行口径漂移**：若选型结论调整实施次序或范围
  （如「先 Streamable HTTP 后 stdio」），BACKLOG 回写须与 ADR 一致并在备注
  注明「以 ADR-0012 为准」，不改标题（REQ-0027-02 已内建）。
- **风险 2 · 草案被误当批准**：ADR 显著标注草案状态 + 三子项维持 proposed
  （AC1/AC2 双断言）+ issue 未开前不进入任何实施——POLICY 需批准区合规三重
  保险。
- **风险 3 · 调研信息时效**：MCP SDK 与协议演进快（Streamable HTTP 自身
  即 2025 年对 SSE 传输的替代），ADR 标注调研日期，BK-0028 实施 SPEC 强制
  复核（SPEC 要求节已固化）。
- **风险 4 · 安全方案过度设计**：本轮只定边界与方案选项，不写实现细节
  （实现细节归 BK-0028/0030 实施 SPEC）；ADR 安全章以「约束强度对齐既有
  约定」为验收尺度，不发明新机制。
- **风险 5 · 纯文档产品提交误判**：本迭代产品提交含 docs/adr 新增 + BACKLOG
  修改（docs/evolution 之外有 docs/adr 改动），v2 机制下无 0001 轮判空问题
  （BK-0001 备注在案）。

---

## 选题过程存证

- **批复栏「approved：无」处置（规则①）**：与 BACKLOG 实况一致——七项批复
  已于 0011 轮全部落 ready，相关项已相继 done（BK-0026/0025/9001 + BK-0016
  会话地基）。现存批复 ready 项 BK-9002~9005（P0/L/触UI=是）**顺延**（本轮
  逐项复核：BK-9002/9003/9005 前置 BK-0021 未竟（其先行项 BK-0031 ready
  未做）；BK-9004 前置已满足但 L 项拆分排序归 10-25 周日治理日——同 0016
  PRD 先例，心跳抓取即夹带拆分违「一次迭代只做一件事」）。
- **user-request（规则②）**：本轮档案 issue 面板仅含 needs-approval 五项
  （#2~#6），**无 user-request 条目**——无建行、无 uiIssueNumbers。#6 open
  未批复：维持待批准区不建行、不催办、不代批。既往面板的 #9（AGENTS.md
  漂移通知）本轮未出现；0014/0016 轮已按禁止区先例处置（用户已亲改在库
  提交 21d94a3，待自行确认关单），无增量动作。
- **rejected（规则③）**：无处置。
- **残缺标记档案**（tools.ts:5,82 stub 如实降级）与**悬挂 run 探针**
  （161ce4ff running 1 条，智能客服助手，started 2026-10-20 无新增）：均
  已知状态——前者 BK-0005 done + M07 断言守护 / BK-0008 ready 承载，后者
  BK-0011 ready 承载（周报 W43 观察 O1 口径未变）；无新项，不重复立项。
- **覆盖差集 / 文档漂移 / dogfooding**：治理日产物（weekly/ 与 BACKLOG 既有
  证据行），心跳不重复采集。
- **选题（规则④）**：BK-0027——批复项顺延后非修宪 ready 队首（P1/M；类型
  capability 非 doc、非触 UI；主池表序第一）+ 治理日解阻链明示第一顺位
  （ROADMAP.md:166-169「BK-0027 → BK-0031 → BK-0011 → BK-0008」）。次序
  参考：BK-0031（P1/S）→ BK-0011（P2/S）→ BK-0008（P2/M）。doc 类型项
  本轮 ready 池为 0（BK-0009/0024 已于 10-24 治理日消化），无跳过争议。
- **skipSpec 判定**：M 项 → 不免 SPEC（skipSpec=false），SPEC 要求见专节。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE /
  POLICY / WORKFLOW / CONSTITUTION 全文 read；iterations/0016 PRD 全文
  read + 0015 PRD 头部 60 行 read + 0014 PRD 全文 read（近 3 迭代选题
  先例与重叠面）；`apps/server/src/tools.ts` 全文 read 117 行（IMPL :26-73、
  sqlite/browser null :59-60、stubOf :81-85、collectTools :104-116）；
  `app.js:95-124` read（MCP_SERVERS :103-114、注释「原型模拟数据」:102、
  SKILL_LIST :115-121）；`guard.ts` 全文 read 101 行（guardedFetch :58-62、
  bocha :71-79、ddg :81-86、searxngSearch 动态主机网关 :88-100）；根
  `package.json` 全文 read（依赖与 allowScripts 现状）；`apps/server/
  package.json` 全文 read（server 依赖面无 MCP SDK）；`llm.ts` grep
  collectTools（:9 import、:38 调用）；`ls docs/adr/`（0001~0011 在库，
  本轮草案编号 0012）；`date` 实查 2026-10-24 16:42。
