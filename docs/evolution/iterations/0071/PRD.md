# PRD · 迭代 0071 · BK-0014 智能体扩展发现器：扫描项目 .mcp.json / .agents/ 与 ~/.agents/ 下的 mcp/skill/rules 并注册进会话上下文

> 产出角色：product-manager（PLAN 阶段）· 2026-10-31 04:24 · 工作树 feat/0071-iter
> 来源：BACKLOG **BK-0014**（capability / **触UI=否** / P2 / **M** / **ready**，
> BACKLOG.md:112），解阻批复链 **issue#16**（ADR-0023 附录 A：新增 env 语义 ×2
> MCP_DISCOVERY_SOURCES/MCP_DISCOVERY_ALLOW + stdio 子进程与 skill/rules 注入两项
> 残余风险知悉；用户 liusuren123 2026-10-30T14:40:18Z 评论「批准」，0069 轮
> `gh issue view 16` 亲核在案，本行备注载「issue#16 获批解阻——转 ready」）。
> **触UI=否——纯后端能力实现轮，非修宪轮**：授权射程=解除 POLICY 需批准面
> （env×2 + 两项风险知悉），**不构成重录轮——golden 零接触、全程禁 `gate:update`**
> （宪法第 3 条）；零 UI 面是 ADR-0023 §3.1 硬边界（违者中止转 needs-approval）。
> **skipSpec=false**：M 项不免独立 SPEC（WORKFLOW §4「S 项（非 doc、非触 UI）」
> 豁免反面——本项 M 且实施面跨 discovery/audit/registry/config/llm/inject/
> capabilities/server 多文件）；SPEC 必做，实施定界以 **ADR-0023（迭代 0067 /
> BK-0062 SPEC 先行产出，307 行）为权威蓝图**，本 PRD §7 给定验收口径。
> 回执口径：**sourceIssue=16**；**itemContinues=false**——issue#16 系单目的批复
> issue（正文仅 BK-0014 实施批准一事，无姊妹子项；BK-0018 名下在 issue#17），
> **done 时 CLOSE 回执 issue#16 关单**（0069 issue#15 / 0052 issue#13 单目的先例）。
> **reconstitutional=false（非修宪轮）**。

## 0. 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-31 04:15~04:24 核实）

- **并行占用核查（只读）**：派发档案明示 **BK-0018 已被其他并行工作流占位、
  严禁选择**；`.zcode/locks/items/` 本会话 `ls` 亲核恰 `BK-0018` 一个条目——
  其余项无在途占用。BK-0018（BACKLOG.md:116，ready，重试轮）本轮零触碰
  （其成果载体 feat/0068-iter d5ddb27 与重试范围收窄注在案）。
- **① 批复同步**：档案「**approved：无；rejected：无**」→ 零新批复动作
  （issue#16/#17 的批复已分别于 0069/0068 轮消费并记账在库；issue 面板 #17/#16/#12
  三项 needs-approval 开放态与「批复在案、issue 保持开放至消费完毕/处置」的既定
  形态一致，#12 系 CI 抖动处置待批——属 golden/pixel-gate/CI 需批准射程，
  0045~0050 同判，本循环不自主处理）。
- **② user-request**：面板无 user-request 条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 无 skipped 改写。
- **④ 常规选题**：ready 队列 grep 亲核全表**恰 2 项**——**BK-0014**（P2/M，
  capability，触UI=否，无在途占用）与 **BK-0018**（P2/S，占位禁选）。两候选同为
  P2；BK-0018 系 S 但被占位锁排除，**BK-0014 为唯一可选 ready 项**，且 BACKLOG.md:112
  行尾明载 0069 轮选题存证「**列 ready 队列次位，下轮心跳候选首选**」——本轮即该
  「下轮心跳」，承接兑现。BK-0064（proposed，0068 REPORT 剥离立项）非 ready 不可选
  （选题规则「只可选取 ready 状态项」），其准 ready 途径=治理日 PM 评审或补题轮，
  维持原判。
- **⑥ 触 UI 排查**：BK-0014 触UI=否为 ADR-0023 §7 权威定界与 §3.1 硬边界承载
  （零前端文件、零 UI 面）；本轮无触 UI 发现，无 ui_quarantined。

## 1. 背景与动机（结论先行）

**建议做**——扩展发现器是 ROADMAP T5-M2「环境感知与数据真实化」四项中最后一项
后端语义实现块（BK-0019 done·0064 / BK-0020 done·0069 / BK-0018 重试轮在途归
占位方），其 SPEC 先行轮（BK-0062·迭代 0067）与 env 批复（issue#16）双门槛均已
兑现，ready 且无前置阻塞；落地后 agent 会话即可消费项目与用户主权区的扩展配置
（MCP server / skills / rules），且安全三件套（白名单+首次确认+审计）已在
ADR-0023 定稿，实现面全部落 POLICY 自主区。

- **现状缺口**：外部扩展只能经 env 白名单注册（MCP_HTTP_SERVERS/MCP_STDIO_SERVERS，
  config.ts:33 + zod fail-fast :70-90）；skills 现状=前端勾选名单
  （capabilities.ts:26-32 硬编码五条）+ llm.ts:34-35 仅注入技能**名**（正文不注入）。
  「候选从哪来」（文件发现）与「授予如何留痕」（审计）两端缺位。
- **扩展点已在位**：`apps/server/src/mcp/registry.ts:99-101` McpRegistrySources v1
  两可选成员 + McpServersLoader 签名，:102-104 注释明示「后续 .mcp.json / ~/.agents
  扫描 loader（BK-0014）届时以新成员加入本签名」；:105-109 envLoader 读两 key。
  连接层（http/stdio/connection）、guard mcpFetch 收口（guard.ts:102-109）、会话注入
  三分支（inject.ts:37 单例）全在主干。
- **威胁模型（为何扫描与激活必须分离）**：克隆得来的仓库自带 `.mcp.json`/`.agents/`
  属不可信输入（供应链向量）——若发现即自动注入，任何被克隆仓库都能借工作流运行
  静默获得工具执行面（stdio=本地进程 spawn）或提示词注入面（skills/rules 文本进
  sys）。故扫描（只读发现）与激活（能力面授予）分离，激活唯一通道=用户显式 env
  登记（MCP_DISCOVERY_ALLOW），全程 allow-hit 审计留痕。

## 2. 目标与用户故事

- **US-1（用户）**：作为 agent 用户，我在 env 里登记「扫描哪些来源」与「激活哪些
  条目」后，agent 会话即能使用我项目内 / 主权区 `~/.agents` 内的 MCP server、
  技能正文与规则正文；我未登记的一切候选**只被看见（审计+日志）永不被启用**。
- **US-2（安全）**：作为仓库维护者，任何候选升格为激活都有 discovery_audits
  `allow-hit` 行可对账（谁在何时把哪个候选授予了能力面）；`~/.agents` 主权区默认
  永不读取（home-agents 必须显式列入 SOURCES）。
- **US-3（运维）**：作为部署者，未配置两个新 env 时系统行为与现状**逐位一致**
  （零扫描零 fs 读零审计行零日志噪音）——升级零成本、回退零残留。

## 3. 功能范围（REQ）

实施定界以 **ADR-0023 全文为权威**（§2 扫描纪律 / §3 确认语义 / §4 审计 /
§5 出站定性 / §6 接线 / §7 受影响文件清单），本节仅列需求面：

- **REQ-0071-01 扫描白名单（env ①）**：`MCP_DISCOVERY_SOURCES` 逗号分隔枚举
  ⊆ {project-mcp, project-agents, home-agents}；未配置=零扫描零 fs 读零行为；
  home-agents 必须显式列入方触 `~/.agents` 主权区；含未知名=zod fail-fast
  （config.ts PTY/ON_ERROR 先例形态，rawEnv 键表 :33-35 追加）。扫描时机=启动期
  一次、快照缓存、零热重载零轮询。
- **REQ-0071-02 首次确认（env ②）**：`MCP_DISCOVERY_ALLOW` 逗号分隔「源:名称」；
  显式登记即知情确认；未登记候选仅 candidate 审计行 + 结构化日志呈现，**不进
  注册表、不进 sys 注入、不产生任何出站或子进程**；**零 UI 面（硬边界）**。
  ALLOW 时序宽容：登记条目不在扫描快照 → warn+忽略，不 fail-fast、无审计行。
- **REQ-0071-03 审计留痕**：新模块 `mcp/discovery-audit.ts`（pty/audit.ts 同库
  第二连接同型，**store.ts 零改动**——恰 400 行贴线）；表
  discovery_audits(source/entry/kind/summary/created_at)；粒度=scan/candidate/
  **allow-hit（首次确认锚点）**/parse-fail；summary ≤256 字符截断、不落文件正文；
  写入容错不阻断行为；server.ts 启动 initStore 后接线、停机 close。
- **REQ-0071-04 注册表合并与消费**：McpRegistrySources v2 追加三可选成员
  （append-only，签名与既有成员语义零改动，零抽象设施）；合并序=env 两源优先 →
  discoveredEntries 次之；serverId 与 env 条目或 BUILTIN_MCP_IDS 重复 → warn+
  拒该条进程不退；inject.ts:37 与 capabilities.ts:39 各一处组合器表达式替换；
  skills/rules 激活语义=ALLOW 命中正文注入 llm/agent 会话 sys（组装点=llm.ts:34-35
  既有技能名注入段纯追加；单文件 ≤6000 字节截断加 `…`；未命中不出现——既有技能名
  注入语义零改动）。
- **REQ-0071-05 扫描纪律（安全）**：固定层级布局（skills/<name>/SKILL.md、
  rules/*.md、mcp.json）；名称过 NAME_RE（registry.ts:37）；http 条目仅 http/https；
  符号链接不追踪；`.git`/FOLD 语义域恒排除；单文件 256KiB、每源 mcp≤64/skill≤64/
  rules≤32 上限；解析失败=warn+parse-fail 审计+该源空集**进程不退**（扫描层
  fail-open 与 config env fail-fast 分层，ADR-0023 §2.3）。
- **REQ-0071-06 出站边界**：零新增出站类别——http 发现/调用全走既有 mcpFetch
  类别（guard.ts:102-109 经 assertPublicUrl）；stdio=本地子进程执行面（issue#16
  知悉款在案，缓解=ALLOW 显式确认+allow-hit 审计）；skills/rules 注入=进程内文本
  拼接零出站。实现轮任一反转（新配置承载/新出站类别/新依赖/前端呈现面）→ 立即
  中止转 needs-approval（ADR-0023 §8 反转预案）。

## 4. 非功能要求

- 安全：§3 REQ-0071-02/03/05/06 全部硬性；审批残余风险两项（stdio spawn 面 /
  skill 正文提示词注入面）已获 issue#16 知悉批复，实现内如实 warn 呈现。
- 性能：启动期一次同步扫描，快照缓存；上限值防巨型配置爆内存/日志。
- 兼容：两 env 未配置时与现状逐位一致（AC1 机器证明）；ADR-0012 既有注册通道
  （E1-E8/E9 交叉校验/内置冲突拒绝）语义零改动（ADR-0023 §9.1）。
- 文件预算：discovery.ts ≤400 行、discovery-audit.ts ≤400 行（新增源文件上限）。

## 5. 触 UI 分类结论

**触UI=否**（分类结论，PRD 必载项）：本项全部改动落 apps/server/src/** 与
tests/smoke/**——零前端文件（apps/web 三文件零 diff 为验收机器证明项）、零
packages/shared、零 SSE 契约、零 golden 接触、零 gate:update。首次确认语义的
载体是显式 env 配置与服务端日志，ADR-0023 §3.1 写死「零 UI 面」硬边界；发现
候选的前端可视化不在本定界射程（新呈现=触 UI，须修宪通道，ADR-0023 §9.4）。
实现中发现任何触 UI 必要 → 立即中止，按 WORKFLOW §4 转 pending-approval。

## 6. 不做范围（ADR-0023 §9 承接）

1. 不改写既有 env 注册通道任何行为（MCP_HTTP_SERVERS/MCP_STDIO_SERVERS 语法、
   E9 交叉校验、内置冲突拒绝语义零改动）。
2. 不触碰 ON_ERROR 三键（ADR-0022 面）与 MEMORY_ENABLED（BK-0018/issue#17 面）；
   三 env 域互斥（ADR-0023 §9.2/§9.3）。
3. 不提供跨会话存储、不借道注入任何未过 ALLOW 的能力面（mcp 工具/技能文本/
   规则文本三者皆是，ADR-0023 §9.3）。
4. 零新依赖（JSON 解析用内置能力，bridgeSpec 从窄降级先例）；零新出站类别；
   零 packages/shared；零前端；golden 零接触。
5. 发现候选的前端可视化不做（BK-0049 动态清单机制外的新呈现=修宪通道）。
6. 不实现热重载/fs watch（快照缓存，变更需重启）。

## 7. 验收标准（Given/When/Then）

- **AC1 三态之「零行为」基线**：Given 服务端进程未配置 MCP_DISCOVERY_SOURCES 与
  MCP_DISCOVERY_ALLOW；When 启动并运行既有全部测试面；Then 行为与现状逐位一致
  ——零扫描、零 fs 读、discovery_audits 零行、零日志噪音；`npm run build` +
  `npm test` + `npm run smoke:server` 既有断言零回退（exit 0）。
- **AC2 三态之「仅 SOURCES 扫描零激活」**：Given 仅配置 SOURCES（含
  project-mcp 与 home-agents）且 fixture 提供样例 `.mcp.json` 与 `~/.agents` 形态
  目录（含 skills/<name>/SKILL.md、rules/*.md）；When 启动；Then 扫描发生——
  scan 汇总行 + 每候选 candidate 审计行落库、结构化日志呈现（源/名称/类别/路径）；
  **候选不进注册表**（capabilities external 清单不出现）、skill/rules 正文不入
  sys、零出站连接、零子进程 spawn。
- **AC3 三态之「SOURCES+ALLOW 全链激活」**：Given SOURCES+ALLOW 配置且 fixture
  含合法 http 形态 mcp 条目与 skill/rules 文件；When 启动并驱动一次引用该外部
  server 的会话；Then 被登记 mcp 条目合并进注册表（capabilities external 可见）、
  **每条目恰一行 allow-hit 审计**、skill 正文（>6000 字节截断加 `…`）与 rules
  正文注入会话 sys；mock 链路上工具可发现可调用。
- **AC4 env 校验 fail-fast**：Given SOURCES 含未知名（或 ALLOW 条目缺「源:名称」
  形态）；When 启动；Then 进程以非零码退出且错误信息指明变量名与条目序号
  （config.ts:80-90 PTY/ON_ERROR 先例形态）。
- **AC5 ALLOW 时序宽容**：Given ALLOW 登记了扫描快照中不存在的条目；When 启动；
  Then warn 日志（固定子串锚，SPEC 定稿）+ 该条忽略，进程不退、不 fail-fast、
  无审计行。
- **AC6 重名冲突拒绝**：Given 发现条目与 env 注册条目或 BUILTIN_MCP_IDS 重名；
  When 启动；Then warn + 仅拒该 discovery 条、进程不退，既有 env/内置条目行为
  零变化（registry.ts CONFLICT_WARN 语义扩展为通用重复拒绝）。
- **AC7 扫描纪律矩阵**：Given fixture 含符号链接、`.git` 域文件、>256KiB 文件、
  非法名称条目、非法 JSON；When 扫描；Then 链接不入扫描、`.git`/FOLD 域恒排除、
  超限/非法名/坏 JSON 均为 parse-fail 审计行+该条（或该源）跳过，**他条不受阻断、
  进程不退**。
- **AC8 审计承载与 store 零改动**：Given 任一扫描发生；When 直查
  data/agentflow.db 的 discovery_audits；Then 五字段齐备、summary ≤256 字符截断、
  不落文件正文；`git diff -- apps/server/src/store.ts` 恒空（机器证明）。
- **AC9 零改动面与禁区机器证明**：Given 实现完成；When 检查 `git diff`；Then
  packages/shared、apps/web、tools/pixel-gate、tests/golden、.github、
  package*.json（含 lock——零新依赖）恒空；golden 零接触、**全程零 gate:update**。
- **AC10 门禁全绿与 E2E 走查**：`npm run gate` 纯回归面全绿（21 场景 diffPx=0；
  首跑若现 s3 diffPx≈21~23 本机采样抖动按 issue#12 口径双留档、复跑为准，
  不消费 gate:update）+ `npm test` 30/30 + smoke:server 全绿 + 新增 discovery
  断言组全绿（承载建议：新 tests/smoke/mcp-discovery.mjs + package.json +1 脚本，
  mcp-registry/mcp-inject 先例形态——终稿归 SPEC）+ 手动 E2E 三态点位走查 +
  allow-hit 审计行 sqlite 直查。CI ui-constitution 推送后盯守属脚本义务（沿先例
  不判过不判挂）。

## 8. 依赖与实施序

- 前置双门槛已兑现：BK-0062 CLOSE（迭代 0067 done，ADR-0023 §7 权威字面量已
  回写本行）+ issue#16 获批（2026-10-30T14:40:18Z 在案）。无其他硬前置
  （BK-0013 链 done·0023~0025）。
- 实施序（PLAN 指导）：SPEC（spec-designer，ADR-0023 为权威蓝图，须列受影响
  文件清单与验收命令）→ BUILD（工作树内门禁）→ VERIFY → 合并。与本轮并行的
  BK-0018 重试轮（占位方）共用 llm.ts 邻接面时以合并仲裁按类解决——本项不改
  llm.ts 工具注入段（:39 buildToolSession 通道），仅扩展 sys 组装点（:34-35），
  冲突面预期极小。
