# 迭代 0055 · PRD — BK-0044 PTY 会话后端运行时：pty 模块 + /api/v1/pty 端点族 + pty_audits + 生命周期约束落地

> 产物角色：product-manager（PLAN 轮）· 2026-10-27 22:40 · 工作树 feat/0055-iter
> 消费方：spec-designer（M 项，不免 SPEC）→ code-developer → test-manager
> 迭代号 0055（主干迭代目录亲核至 0054；STATE iteration=0055）

## 0. 结论

- **建议做，且为本轮项（outcome=selected）**：issue#14 用户批复本轮在案（档案
  approved: #14），BK-0044 转 ready 双门槛齐备——BK-0043 已终态 done（迭代 0028，
  ADR-0014 落盘）+ #14 获批。选题走 WORKFLOW §4 优先序①（用户 issue 批复产生的
  ready 项）：**本轮批复同步项优先于存量 ready 队列更高优先项**（迭代 0052 先例：
  fresh 批复 #13 → BK-0058 入选，先于 P1 存量 ready 项）；BK-0042（P0/S/ready，
  「下轮心跳首选」在案）留下一轮，不受损。
- **触UI 分类结论：触UI=否**（类型 capability，纯后端承载：apps/server/** +
  tests/smoke/** + package*.json + .env.example + ADR 状态行；apps/web/** 与
  packages/shared/** 零改动承诺，§7）。**非修宪轮：reconstitutional=false**——
  #14 批复射程只解除 POLICY 需批准面（新增依赖 node-pty + 新 env 语义 ×4 + 残余
  风险知悉），**不构成重录轮：golden 零接触、全程禁 `npm run gate:update`**。
- **授权链三元组**：issue#14 用户批复（ADR-0014 §6 附录 A 五要素承载；W44 治理日
  补开，BK-0044 行备注在案）+ ADR-0014（§2/§3/§4/§5/§7 定界）+ BK-0043 done。
  分立声明：父项 issue#5 批复承继（2026-10-23T15:49:06Z）覆盖的是 BK-0045 修宪
  实施授权；#14 覆盖依赖/env/风险知悉——两者在本链分立不混同（ADR-0014 头部
  显著声明）。
- **回执口径**：sourceIssue=14；**itemContinues=true**——#14 标题即「BK-0044/0045」，
  名下姊妹子项 BK-0045（终端节点 UI 修宪轮，@xterm/xterm 消费面）未竟，本轮 done
  仅发进度回执不关单；issue#14 与 issue#5 关单均留 BK-0045 链终轮 CLOSE（沿
  issue#10/11 终轮先例）。

## 1. 背景与现状证据

BK-9005（交互式 PTY 终端节点）拆分：BK-0043（安全世界设计，done·迭代 0028·
ADR-0014 落盘 389 行）→ **BK-0044（本项，后端运行时）** → BK-0045（终端节点 UI
修宪轮，链终轮）。W44 治理日补开 issue#14（ADR-0014 附录 A 字面量，此前从未
开出）承载依赖/env/残余风险请批，本轮获用户批复——BK-0044 转 ready 的最后一道
门槛解除。

现状证据（本 PLAN 会话在工作树 feat/0055-iter 内逐项亲核/亲跑）：

| 基建 | 现状指针 |
| --- | --- |
| PTY 零承载 | `grep -rni "node-pty\|\bpty\b" apps/server/src package.json apps/server/package.json` 零命中（本会话亲跑；ADR-0014 §1 同判复核成立）——全新能力面，无存量包袱亦无存量防护 |
| 子进程+超时先例 | `apps/server/src/code.ts:50` spawn 三管道子进程 / `:53` 5s 超时强杀 / `:60` 超时语义如实报错 |
| 沙箱锚定 | `apps/server/src/tools.ts:16` SANDBOX 常量锚定；`:33` SQLITE_DB 派生锚定先例（pty 会话目录派生同构） |
| 会话注册表先例 | `apps/server/src/sessions.ts:36` sessionsById 内存判活（`:12` 头注「进程崩溃后 DB 残留不可信」BK-0011 教训）；`:56-63` stop 404 先例；`:167` abortActiveSessions 停机出口 |
| 停机链 | `apps/server/src/server.ts:249-277` shutdown：abortActiveSessions 同批中止、5s 宽限轮询、closeStore、exit 0 |
| env 白名单 | `apps/server/src/config.ts:28-34`（15 key）+ `:36-37` TRUTHY/FALSY + zod fail-fast 纪律 |
| 审计表先例 | `apps/server/src/store.ts:100` approval_audits DDL（字段族形态，pty_audits 直系先例） |
| store 贴线 | `wc -l` 亲核 **store.ts 恰 400 行**（AGENTS.md 硬性约定 4 上限）——扩表须同步拆分（ADR-0014 §3.2-a 约束） |
| allowScripts | 根 `package.json:34-36` 现仅 `better-sqlite3@12.11.1: true` |
| server 依赖 | `apps/server/package.json` dependencies 8 项，无 node-pty（本会话亲读） |
| 路由注册先例 | `server.ts:229-244` v1-only 注册区 + 头注活清单纪律（BK-0056：新增 pty 端点族须同步头注行） |
| 回归基线 | gate **18 场景 s0~s17** / npm test **30/30** / smoke:server **145/0**（迭代 0054 收口径，BACKLOG BK-0041 行终态纪要） |

**npm 时效复核义务（ADR-0014 §5.6 明文，SPEC 必须兑现）**：node-pty ^1.1.0 /
@xterm/xterm 调研快照为 2026-10-25——SPEC 落笔时必须逐项复验版本号与 install 面
（沿 ADR-0012「实施轮必须复核时效」先例）；若变化超出附录 A 批复射程（如新增
运行依赖、engines 约束变化），即中止上报，不得静默偏航。

## 2. 用户故事

- **US-1**（智能体会话使用者）：在终端节点 UI（BK-0045）就位前，先有一个可信赖的
  后端会话面——创建/列出/停止 PTY 会话，输出以 SSE 流回放，写入与生命周期全程
  审计可查。
- **US-2**（运维）：PTY_ENABLED 默认关，启用主权在我；三闸门数值（idle 超时/最大
  时长/并发上限）全部 env 承载，误配启动即 fail-fast 拒绝。
- **US-3**(安全审计者)：用户键入与 agent 注入双源可区分（origin 贯穿）、全量
  pty_audits 留痕；残余风险（子进程网络不经 guard / shell 可 cd 出沙箱）如实
  声明 + 三层缓解，不虚报强制边界。

## 3. 功能范围（REQ-0044-xx）

权威定界 = ADR-0014 §7 BK-0044 块（与迭代 0028 SPEC §8.4 字面一致，BACKLOG
BK-0044 行逐字承载）；本 PRD 转述并按现状具体化，**SPEC 终稿以 ADR-0014 为准**。

- [ ] **REQ-0044-01 pty 模块与会话管理**（`apps/server/src/pty/` 新模块，各文件
  ≤400 行）：
  - 进程模型 = ADR §2.1 案 a：**每会话一 PTY 子进程**（会话创建时惰性 spawn；
    shell 会话状态即会话状态，无池化/复用/共享——b/c 案已否决）；会话关闭即
    进程收尾（kill + wait 双确认）。
  - 沙箱锚定：每会话初始 cwd = SANDBOX 派生 `sandbox/pty/<sessionId>/`
    （tools.ts:16→:33 先例；惰性 mkdir 对齐 ensureSandbox）。**如实定级**：
    safePath 强制越界拒绝在 PTY 形态不可移植（shell 可 cd），按 §2.2 声明
    「如实降级 + 三层缓解（cwd 锚定 + 全量审计 + 默认关）」——SPEC 与代码注释
    均不得宣称同等强度。
  - 判活只用内存注册表 ptyById（sessions.ts:36 同构）；DB/审计表只作事后审计
    不作判活源。
  - 输出环形缓冲 + 单帧限幅 + 写入载荷限幅（存在性为 ADR §2.4 原则，数值 SPEC 定）。
  - 资源上限：会话数 = PTY_MAX_SESSIONS，满时 create 拒绝（429/409 语义 SPEC 定）。
- [ ] **REQ-0044-02 端点族五端点**（/api/v1/pty/*，v1-only 沿 sessions
  server.ts:229-244 先例；**头注活清单同步补 pty 行**——BK-0056 纪律）：
  - `POST /api/v1/pty/sessions` → 201 {sessionId}；PTY_ENABLED=0 拒绝（503 语义，
    具体码 SPEC 定，须与 404「会话不存在」可区分）。
  - `GET /api/v1/pty/sessions` → 活动会话列表。
  - `GET /api/v1/pty/sessions/:id/stream` → SSE 输出流（服务端→客户端单向）。
  - `POST /api/v1/pty/sessions/:id/write` → body {data, origin}，origin ∈
    'user'|'agent'（缺省/非法 400）。
  - `POST /api/v1/pty/sessions/:id/stop` → 显式停止；404 无活动（sessions.ts:56-63
    先例）。
  - **流格式 = 端点私有 SSE 帧**（如 JSON 帧 {t:'data'|'exit', …}），**零 shared
    契约**——不进 RunEventSchema（ADR §3.4 定稿；与 BK-0016「复用 15 种事件」
    是两条不同的合规路径，本案选「不进契约」）。护栏：实施中确需进 RunEventSchema
    即中止转 needs-approval。
- [ ] **REQ-0044-03 双源写入与 pty_audits 审计**：
  - origin 贯穿（ADR §3.1-a）：全链路透传至审计表与流回显；**agent 身份由服务端
    权威填写**，外部 write 端点不得可被伪造为 agent——防伪造机制（如外部端点仅收
    origin=user、agent 注入走服务端内部通道）**SPEC 定**，验收须含伪造反例
    （AC3）。
  - pty_audits 表（ADR §3.2-a）：{sessionId, origin('user'|'agent'|'system'),
    kind('write'|'create'|'close'|'timeout'…), 摘要（限幅）, created_at}，沿
    approval_audits（store.ts:100）字段族先例；承载落点 = store.ts 扩表 vs pty
    模块自有仓储，**SPEC 定**；约束 = store.ts 现 400 行贴线，扩表须同步拆分沿
    ≤400 纪律。
  - 危险命令面 = ADR §3.3-a **仅警示 + 审计（v1）**：只读模式匹配命中固定清单族
    （rm -rf/格式化/shutdown 类）不拦截，emit 警示 + 审计标记位；**不做拦截清单/
    白名单**（b/c 案已否决——伪安全）。
  - 注入并发约束：同一会话同一时刻至多一个进行中 agent 注入（409 守卫，ADR §4.2）。
- [ ] **REQ-0044-04 三闸门超时与状态机**（ADR §4.1 六迁移）：
  - idle 超时（PTY_IDLE_TIMEOUT_MS 无输入输出）→ closed（每次有效输入/输出刷新
    计时器）；最大时长（PTY_MAX_SESSION_MS 硬顶）→ closed；显式停止 → closed；
    优雅停机 → closed；PTY 子进程自然退出（exit）→ closed。
  - closed = 终态：close 幂等（双标志——spawnAttempted 置位于 spawn 发起时，spawn
    失败也走收尾路径防半开态；closed 置位后重复 close no-op，connection.ts:46-47
    先例）。
  - run 正交（ADR §4.2）：PTY 会话生命周期不随 run 绑定（sessions.ts:3 先例）；
    run 域内的 agent 注入调用随 run 中止级联取消（signal 透传），级联只断「本次
    注入调用」不断会话本身。
- [ ] **REQ-0044-05 停机级联与启动扫尾**：
  - shutdown 链并入：abortActivePtySessions 与 abortActiveSessions 同批
    （server.ts:256 邻域），5s 宽限内未收尾强杀后退出。
  - 启动扫尾义务（ADR §4.3-②）：server 重启后遗留 PTY 子进程/开放会话记录的收尾
    机制沿 BK-0011 sweepDanglingRuns 形态——具体机制 SPEC 定（如按审计表开放
    记录打 stopped 标记 + 孤儿进程检测）。
- [ ] **REQ-0044-06 env 语义 ×4**（config.ts；POLICY 需批准区「新增环境变量语义」
  已随 #14 获批）：
  - PTY_ENABLED（默认 0；TRUTHY/FALSY——ALLOW_PRIVATE_NET 同款）/ 
    PTY_IDLE_TIMEOUT_MS（默认 600000；正整数下限护栏 ≥60000 防误配秒级）/
    PTY_MAX_SESSION_MS（默认 3600000；正整数，≥ idle 超时交叉校验——E9 跨 env
    先例）/ PTY_MAX_SESSIONS（默认 4；正整数 1-16）。
  - 白名单 +4 key（config.ts:28-34）；非法值启动 fail-fast（zod，fatal 指明变量名
    与原因——MR E1-E9 先例）。
- [ ] **REQ-0044-07 依赖接入**（node-pty ^1.1.0，已随 #14 获批）：
  - apps/server/package.json +node-pty ^1.1.0；根 package.json allowScripts
    +node-pty（better-sqlite3 同款纪律，ADR §5.2）。
  - native 面实测：prebuild 命中即零编译；被墙/未命中回退源码编译（PLAYWRIGHT_
    DOWNLOAD_HOST 镜像同域处置先例，ADR §5.2）。
  - **@xterm/xterm ^6.0.0 不在本轮**（BK-0045 消费面；授权已随 #14 在案留后）。
- [ ] **REQ-0044-08 smoke 断言组**（载体 SPEC 定：独立 tests/smoke/pty*.mjs + 根
  script 行，或并入 smoke-server.mjs）：
  - 覆盖 ADR §7 清单八类：创建 / 双源写入 / 流回放 / 停止 / idle 与 max 超时
    （小数值 env 覆盖驱动，探针实例形态沿 Z 组先例）/ 停机级联 / 无孤儿
    （Win32_Process 探针，BK-0028 先例）/ PTY_ENABLED=0 拒绝。
  - 既有 145 断言零回退（新总数口径 SPEC 定并写入 MERGE 收口）。
- [ ] **REQ-0044-09 .env.example 可选段同步**（**PRD 增补项，ADR §7 索引外显式
  标注**）：四条 PTY env 补入「── 可选 ──」段（BK-0059 先例：新 env 语义同轮补
  模板防再欠 doc 债）；纯 # 注释行零运行时行为。
- [ ] **REQ-0044-10 ADR-0014 状态行收口**：实施轮 CLOSE 时状态行按 ADR-0010/0012
  先例更新（附录 A 批复事实 + BK-0044 消费纪要）；npm 时效复核结论回写 §5.6 纪要。

**不做范围（out of scope）**：BK-0045 全部（终端节点 UI / @xterm/xterm 接入 /
DEFS 终端节点 / gate 场景增量）；PTY 事件进 RunEventSchema（packages/shared
零触碰）；命令拦截清单或白名单模式（ADR §3.3 b/c 否决案）；池化/复用/共享单
shell（§2.1 b/c 否决案）；agent 侧 MCP 工具接线（tools.ts 注册面——本项只承载
端点族与内部会话 API，若 SPEC 认为必须接 tools.ts 即属影响面扩大，回核 ADR §7
定界后再动）；guard.ts 任何改动（零新增出站类别，ADR §5.4）；新增出站网络目标；
speculative 的跨平台特判（node-pty 已抹平）。

## 4. 非功能要求（安全/性能，ADR §2/§3/§4 转述）

- **子进程纪律**：per-session PTY 子进程；超时三闸门 = code 节点 5s 一次性硬超时
  向长驻交互形态的外推（AGENTS 硬性约定 3 对照表：子进程=同等强度；超时=同等
  强度·形态外推）。
- **安全声明口径**：两处残余风险（PTY 子进程网络不经 guard.ts / shell 可 cd 出
  沙箱）按 ADR §2.2-2.3「如实降级 + 三层缓解」声明；SPEC、代码注释、日志与
  （未来）UI 文案**不得宣称同等强度或强制边界**。
- **审计完整性**：写入与生命周期事件全量留痕；若落 store 则与业务数据同库同事务
  纪律（§3.2-a）。
- **资源面**：会话数上限 + 环形缓冲 + 帧限幅 + 写入限幅，防资源耗尽（§2.4）。
- **secrets 面**：PTY 输出可能含用户环境内容——审计摘要限幅，不整段落库大输出
  （数值 SPEC 定）。

## 5. 验收标准（Given/When/Then）

> 逐条供 test-manager 转验收用例。命令口径 = `npm run build`（含 node-pty native
> 面）+ `npm run gate` + `npm test` + `npm run smoke:server`（+ pty 冒烟载体）+
> 手动 E2E。基线：gate 18 场景 s0~s17 / npm test 30/30 / smoke 145/0。

- **AC0 授权与定界核验**：Given issue#14 用户批复（本人评论）+ ADR-0014 §7
  BK-0044 块 + 迭代 0028 SPEC §8.4，When 逐字比对 BACKLOG BK-0044 行与实施 SPEC
  受影响文件清单，Then VERBATIM 一致（REQ-0044-09 增补项显式标注为 PRD 增补、
  不计漂移）；SPEC 含 npm 时效复核记录（§5.6 义务兑现，node-pty 版本/install 面
  逐项复验）。
- **AC1 五端点契约**：Given PTY_ENABLED=1 且会话数<上限，When `POST
  /api/v1/pty/sessions`，Then 201 {sessionId}，且 pty_audits 有 create 记录、
  `sandbox/pty/<id>/` 目录建立；When `GET /api/v1/pty/sessions`，Then 活动会话
  列表含该 id；When `POST …/:id/write` {data:'echo hi\n', origin:'user'}，Then
  200 且 `GET …/:id/stream` SSE 流按序回放 {t:'data'} 帧含 'hi'，write 事件入
  审计（origin=user）；When `POST …/:id/stop`，Then 会话 closed、流发 {t:'exit'}
  帧、审计 close 记录；再 stop 同 id → 404（无活动语义）；各端点未知 :id → 404。
- **AC2 未启用与上限**：Given PTY_ENABLED=0（默认态），When create，Then 拒绝
  （503 语义码，SPEC 定案且与 404 可区分）且零 PTY 子进程产生；Given 会话数已至
  PTY_MAX_SESSIONS，When create，Then 拒绝（429/409 语义，SPEC 定案）。
- **AC3 双源与防伪造**：When write body origin 缺省 / 非法值，Then 400；When
  外部通道提交 origin='agent'（防伪造机制反例），Then 被拒或按 SPEC 定案机制
  降级，且审计如实记录实际 origin；When 同一会话并发第二个 agent 注入，Then 409。
- **AC4 危险命令仅警示**：When write 内容命中只读危险模式（固定清单族），Then
  **不拦截**（写入照常透传 PTY），警示事件发出 + 审计标记位命中；Then 源扫描
  证明危险清单命中处不存在「拒绝写入」分支（3.3-b 案未夹带）。
- **AC5 三闸门与状态机**：Given 小数值 env 覆盖（如 PTY_IDLE_TIMEOUT_MS=1000），
  When 会话空闲超阈值，Then closed + 审计 kind='timeout' + 流 exit 帧 + 子进程
  收尾（kill+wait 双确认无僵尸）；Given PTY_MAX_SESSION_MS 小值，When 超硬顶，
  Then closed 同上；When PTY 子进程自然退出（exit），Then closed（第六迁移）；
  close 幂等——重复停止/超时双触发 no-op 无双 kill 异常。
- **AC6 停机级联与孤儿**：Given 活动会话存在，When 停机链触发（win32 以模块级
  演练/探针实例背书，CI ubuntu 权威——0012/0016 先例），Then abortActivePtySessions
  与 sessions 同批、5s 宽限内收尾或强杀、退出码 0；When 冒烟/手动 E2E 全链跑完，
  Then Win32_Process 探针无 pty/shell 孤儿进程残留。
- **AC7 env 校验**：When PTY_IDLE_TIMEOUT_MS=500（< 下限）/ PTY_MAX_SESSION_MS
  < PTY_IDLE_TIMEOUT_MS / PTY_MAX_SESSIONS=0 或 17 / PTY_ENABLED 非法词形，
  Then 启动 fail-fast（exit 非 0，fatal 指明变量名与原因）。
- **AC8 回归面与零接触机器证明**：`npm run build` exit 0（node-pty prebuild/
  编译实测通过）；`npm test` 30/30；`npm run smoke:server` = 145 基线零回退 +
  pty 断言组新增全绿；`npm run gate` 18 场景 diffPx=0（纯后端零波及实测）；
  **`git diff` 对 apps/web/**、packages/shared/**、tools/pixel-gate/**、
  tests/golden/** 恒空；全程 gate:update 零消费**。
- **AC9 手动 E2E（端点级走查）**：五端点 curl 走查 → 双源写入流式回放 → 显式
  停止 → 超时触发 → 停机级联无孤儿（SPEC 细化五~七点位，如实标注真实/演练）。
- **AC10 CI 盯守（推送后义务，未到时点不判过不判挂——0012 先例）**：contracts
  job 含 node-pty native 安装编译面首次接入实测；ui-constitution 18 场景全绿
  （本项零 golden 接触，预期零变化；红则按 WORKFLOW §6 处置）。

## 6. 竞品对照（宪法第 1 条语境下的产品定位）

ComfyUI（基准竞品）无 PTY/共享终端对应物——本项属 T5「画布编排 × 深度智能体
工作台」差异化空白带（ADR-0014 §1、ROADMAP T5-M3 :166-168）。端点族语义对齐
通用终端会话管理惯例（创建/列表/流/写入/停止即 tmux/SSH 会话管理最小面），
不发明私有会话语义；双源标识（origin）是 agent 工作台赛道共享会话形态
（Claude Code / Cursor 同型交互）的后端审计地基。

## 7. 受影响文件清单与验收命令口径（SPEC 输入；M 项不免 SPEC，skipSpec=false）

| 文件 | 动作 | 要点 |
| --- | --- | --- |
| `apps/server/src/pty/session.ts`（新增，模块内拆分 SPEC 定） | 新增 | 会话管理 + ptyById 注册表 + 三闸门 + close 幂等 + 环形缓冲；≤400 行 |
| `apps/server/src/pty/routes.ts`（新增，命名 SPEC 定） | 新增 | 五端点 + SSE 私有帧 + origin 校验/防伪造；≤400 行 |
| pty_audits 仓储（`apps/server/src/pty/audit*.ts` 新增 或 store.ts 扩表，SPEC 定） | 新增/扩展 | §3.2-a 字段族；store 400 行贴线，扩表须同步拆分 |
| `apps/server/src/server.ts` | +少量 | v1-only 注册（:229-244 邻域）+ 停机出口并入（:256 邻域）+ 头注活清单补 pty 行（BK-0056 纪律）+ 启动扫尾接线 |
| `apps/server/src/config.ts` | +4 key | 白名单 + zod + 交叉校验（E9 先例） |
| `apps/server/src/store.ts` | 仅当扩表落此 | pty_audits DDL + 仓储；拆分方案 SPEC 定 |
| `apps/server/package.json` | +1 依赖 | node-pty ^1.1.0 |
| `package.json`（根） | +1-2 行 | allowScripts +node-pty；（若独立冒烟载体）+script 行 |
| `apps/server/.env.example` | +4 注释行 | REQ-0044-09（PRD 增补项，BK-0059 先例） |
| `tests/smoke/`（pty 断言组，载体 SPEC 定） | 新增/扩展 | 八类覆盖（§3 REQ-0044-08）+ 编排头注序列同步（BK-0057 纪律，若并入 smoke-server.mjs） |
| `docs/adr/0014-pty-terminal-security-world.md` | 状态行 | CLOSE 时按 ADR-0010/0012 先例收口 + §5.6 时效复核纪要 |
| **零改动承诺** | — | apps/web/** · packages/shared/** · tools/pixel-gate/** · tests/golden/** · .github/** · guard.ts |

验收命令（BUILD/VERIFY 口径）：`npm run build` → `npm run gate`（18 场景零波及
实测）→ `npm test` → `npm run smoke:server`（145 基线 + pty 组）→ pty 冒烟载体
（若独立）→ 手动 E2E（AC9 点位）。

## 8. 编排、预案与回执口径

- **非链终轮**：BK-0045 待本项 CLOSE 后随链晋升（ADR-0014 §7）；@xterm/xterm
  授权已随 #14 在案。本轮 done 时 issue#14 仅进度回执（itemContinues=true），
  issue#14 与 issue#5 关单均留 BK-0045 链终轮 CLOSE（沿 issue#10/11 先例）。
- **非修宪轮铁律**：golden 零接触、全程禁 gate:update。若 gate 出现 s3-library
  diffPx≈23 抖动形态（issue #12 在案本机采样噪声，0037~0052 多轮先例），按
  rerun/CI 权威口径处置，**不得以此消费 gate:update**——本项 apps/web 零 diff，
  任何场景红须先核环境形态再归因。
- **中止条件**（WORKFLOW §4 BUILD 铁律 + ADR-0014 护栏）：确需 PTY 事件进
  RunEventSchema / 新增 node-pty 与 @xterm 之外依赖 / 新增出站网络目标 / store
  拆分波及既有表行为——立即中止转 needs-approval/上报（父项与附录 A 批复均不
  自动覆盖新面）。
- **工作树依赖注意**：本迭代为 v3 工作树模型下**首个新增 native 依赖轮**——
  node_modules 顶层链接主仓库（WORKFLOW §3），BUILD 期 npm install/allowScripts
  approve/rebuild 须在工作树内完成并验证 dist 可跑；若工作树依赖链接形态阻碍
  native 安装，如实上报协调者，不得转为主干安装。
- **metrics 行**：CLOSE 时由协调者按 0054 行同构口径追加（gate 18 场景/smoke 新
  总数/±行数/bug 数/CI 盯守结论）。

## 9. 选题过程存证（PLAN 轮合规记录）

- **批复同步（规则①）**：本轮档案 approved: #14、rejected 无——#14 系 ADR-0014
  附录 A 依赖/env/残余风险请批 issue（W44 治理日补开；BK-0044 行备注载明「转
  ready 门槛余一 = #14 获用户批复」）。BACKLOG 已有承载行 → 不重复建行，仅解除
  门槛：BK-0043 已终态 done（迭代 0028）+ #14 获批 → **BK-0044 转 ready P0 并选
  为本轮项**（0052 先例：fresh 批复项优先于存量 ready 队列更高优先项）。rejected
  无 → 无 skipped 改写。
- **itemContinues 判定**：#14 标题即「BK-0044/0045」——名下姊妹子项 BK-0045
  （@xterm/xterm 消费面）未竟 → itemContinues=true；BK-0045 行同步事实注
  （依赖授权已到位、晋升门槛不变）。
- **常规 ready 队列亲核**（grep 全表）：BK-0042（P0/S/ready，issue#4 链终轮，
  「下轮心跳首选」在案——本轮被规则①抢占，留下一轮优先）/ BK-0060（P1/S）/
  BK-0061（P2/S）/ BK-0062（P2/M）；doc 类仅 BK-0063（proposed，心跳不选）。
- **占位互斥**：`ls .zcode/locks/items/` = 空（2026-10-27 22:38 亲核），无他路
  占位；派发提示未注入任何已占项。
- **侦察档案消费**：残缺标记唯一实质项 browser stub（tools.ts:138）系 ADR-0011
  评估终态不立项（0041/0045/0046/0047/0050/0051 同判在案）；悬挂 run 探针 []
  空；治理日产物不重复采集——均不构成本轮候选，无补题。
- **基建亲核**：§1 表全部指针本会话在工作树内实读/实跑（wc/grep/sed 亲核）。
