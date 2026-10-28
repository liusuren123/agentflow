# SPEC · 迭代 0061 · BK-0045 重试收口轮：BUG-0057-02 注入回显并行多根形态修复

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-28 09:55 · 消费方：BUILD / VERIFY
> 输入：iterations/0061/PRD.md（重试收口定界权威）+ 本会话对工作树代码的全量亲读
> （引用格式 `文件:行`，均本轮工作树内实读，非转抄）。
> 修宪属性：**是（重试轮）**——授权链 = ADR-0014 §7 + issue#5 批复承继
> 2026-10-23T15:49:06Z；issue#14（node-pty + @xterm/xterm ^6.0.0 + env×4 +
> 残余风险知悉）批复在案。**预期零静态渲染变化、零 golden 接触、gate:update
> 预期零消费**（§7 golden 重录方案为或有预案，消费条件硬性约束）。

## 0. 与 PRD 的关系及两处口径细化（如实声明）

SPEC 在 PRD 定界内细化技术方案，两处口径细化如下（不扩大范围）：

1. **REQ-0061-03 六点位中「停止」的语义定稿**：PRD 字面「停止 → 重开恢复回放」
   未区分「运行停止」与「会话停止」。按 ADR-0014 §4.1（会话与 run 正交；面板
   关闭仅客户端拆链、会话存续）与 PRD 自身 REQ-0061-04 交互回归清单（「停止」
   与「关闭重开」「恢复回放」**并列**为三个独立点位）裁定：六点位 E2E 中
   ⑤停止 = **运行收尾/停止**（run:done 到达，面板仍附着）；⑥重开恢复 = **面板
   关闭（拆链）→ 重开（环形缓冲回放恢复，ADR-0014 §4.1 语义）**。会话级停止
   （termStopSession，app.js:3310-3320）与降级态（PTY_ENABLED=0）归
   REQ-0061-04 交互回归抽查承载，不入六点位。
2. **判别矩阵 C 形态的游离节点参数定稿**：原 0057 REPORT §4.3 矩阵定义随
   工作树丢失（PRD §选题过程存证；本会话全仓 grep `resid2` 零命中复核同判），
   PRD 授权「SPEC 轮定稿图拓扑」。C 形态游离 terminal 节点定稿为「**同 cmd、
   无 session 绑定**」（§3），并设 C2 探针变体（同绑定）供 BUILD 根因取证
   （§5.3）——若取证证明 0057 实测形态为 C2，驱动脚本一键切换且 JOURNAL 留痕。

## 1. 目标与不可动摇约束

1. **修复 BUG-0057-02**：run 含并行第二根（判别矩阵 C/D 形态）时，terminal
   handler 对面板已订阅会话的 agent 注入回显不在面板 xterm 渲染（违反 0057
   AC3「同一面板可见其回显」）。
2. **判别矩阵 C/D 各 ≥2 轮全绿闭环**（0057 期「C/D 2/2 复现」的同位反转），
   A/B 同轮回归不破；完整 E2E 六点位 × A/B/C/D 全绿。
3. **补录 0057 机制件四件**（PRD REQ-0061-05，§9）。
4. 硬性纪律（全程）：服务端三证在案不得无据推翻（PRD §背景）；改服务端须先
   在 JOURNAL 留推翻证据链（PRD REQ-0061-06）；本轮再败即触发「连续 2 次同项
   failed」熔断置 stuck 交用户（WORKFLOW §5.4）——**先确定性复现（或 ≥10 轮
   采样失败率>0），后修复，后 C/D ×2 绿**，杜绝 0057「偶过即过」教训
   （0057 BUILD 期 4/4 绿、VERIFY 期 6/6 败）。

## 2. 现状证据基线（本会话工作树内亲读，修复方案的事实底座）

### 2.1 服务端（三证 + 本会话补证，均非改动面）

| # | 证据 | 出处 |
| --- | --- | --- |
| S1 | 注入回显计数入 node:done out（「已注入命令 · 回显 N 字」） | `apps/server/src/handlers.ts:342-343`（out 组装）、`:337-339`（agentWrite 返回 echo.length） |
| S2 | broadcast 对 s.subscribers 全量扇出 | `apps/server/src/pty/session.ts:91-93` |
| S3 | 原生 curl SSE 完整收流至 run:done | 0057 在案（BACKLOG BK-0045 行引 0057 REPORT；本会话不可复跑，如实标注） |
| S4 | **引擎为严格顺序执行**：主循环 `for(const id of topo){ ... await runNode(...) }`，无并行 Promise | `apps/server/src/engine.ts:136-141`——「并行多根」仅改变 **Kahn 拓扑序**（入度 0 起始队列按 nodes 数组序，`engine.ts:53-63`），不引入服务端并发 |
| S5 | sseWriteEvent 内置 try/catch，broadcast 不可能因单订阅者断连抛错 | `apps/server/src/util.ts:14-17` |
| S6 | 流接入（attach→ready→回放→subscribe）为同步体，无 onData 交错窗 | `apps/server/src/pty/routes.ts:43-60`、`pty/session.ts:267-280` |
| S7 | PTY_MAX_SESSIONS 默认 **4**（PTY 会话积累的硬上限；C 形态每轮新建 1-2 会话） | `apps/server/src/config.ts:131`、满员降级 `handlers.ts:326-328` |
| S8 | agentWrite 回显窗口 500ms + 同会话单飞（409）；echoCollectors 先于 broadcast 收 chunk | `apps/server/src/pty/session.ts:38`、`:232-257`、`:138-141` |

**推论**（S4+S6+S5）：服务端在「面板已订阅 → run 注入」序列中不存在帧丢失
窗口；修复面按 PRD 定界收敛在前端帧路由/时序，除非 BUILD 取证推翻（→中止条款
§10）。

### 2.2 前端（改动主战场锚点）

| # | 证据 | 出处 |
| --- | --- | --- |
| F1 | TERM 模块级单例 `{nodeId, sid, term, stream, abort}`——面板绑定态全在此 | `apps/web/src/legacy/app.js:3212` |
| F2 | termAttach：先建 xterm（:3256-3259）后 openPtyStream 订阅（:3264）；onFrame 中 `data` 帧写 `TERM.term` **判空即静默丢弃**（:3265）；warn/exit/end/error 只进状态行（:3266-3269） | `app.js:3250-3272` |
| F3 | termDispose 置空全部字段；调用方 = 面板关闭钮（:3230）/ termShowEmpty（:3240）/ openTermPanel 首行拆链（:3275）/ 双击切换（:3329） | `app.js:3244-3249` |
| F4 | **run 事件流（onEvent）不触碰 TERM 与 #term-panel**：node 状态仅 classList 增删 + setNodeOut（`.node-out` textContent 赋值，零节点元素重建）+ measurePorts；全仓 replaceWith 仅 4 处（:1180 rerenderNode / :1371 addNode / :3300 openTermPanel 写回 / 画布外 0 处），run 路径零命中 | `app.js:2437-2492`、`:2004`（setNodeOut 实现）、本会话 grep 亲核 |
| F5 | #term-panel 为**全动态单例**（termEnsure appendChild 到 body），Skeleton.tsx 零出现（grep 亲核）；app.css tp- 族为静态规则（:702-718），无 run 期动态类切换 | `app.js:3214-3234`、`apps/web/src/app.css:706-718` |
| F6 | openPtyStream 读循环：fetch + getReader 逐帧，整体 try/catch + 单帧回调隔离 + {t:'error'}（0057 修复轮 b442840 加固在库）；body 耗尽补发本地 {t:'end'} | `apps/web/src/server-sync.js:86-114` |
| F7 | 运行提交体透传节点 params（含 session 写回值） | `app.js:2542-2545`（`nodes: state.nodes`） |
| F8 | handler 绑定判活链：session 失活 → 新建会话注入（**面板若仍订阅旧会话即永不可见**——根因假设 P1 的机制通道） | `handlers.ts:323-332` |
| F9 | gate s19 场景在库：PTY_ROUTES 静态 fixture（create 201 固定 sid + stream 静态 body 两条回放帧）→ 确定性终态「流已结束」 | `tools/pixel-gate/gate.mjs:497-507`（fixture）、`:509-514`（seed/termOpen）、`:517-518`（termReady）、`:565`（s19 场景行） |

## 3. 判别矩阵定稿（REQ-0061-02 落地，驱动脚本 §4 固化）

节点 id 沿 TERM_WF_SEED 惯例（gate.mjs:509-512）；T = 面板绑定的 terminal
节点；marker 为每轮唯一的 ASCII 串（如 `af0061c1`）；T 的 cmd = `echo <marker>`。
拓扑序为断言项（源 S4：Kahn 按数组序），驱动脚本须从 run SSE 的 node:start
事件序列显式断言，把「第二根的存在改变执行时序」这一差异点**机器化**（PRD
REQ-0061-02「差异点显式化」要求）。

| 形态 | 图拓扑（nodes 数组序 / edges 数组序） | 预期拓扑序 | 角色 |
| --- | --- | --- | --- |
| **A** | 1 trigger → 2 terminal(T, cmd, 面板写回 session) | 1, 2 | 对照（0057 实测已过） |
| **B** | 1 trigger → 2 delay(s:1) → 3 terminal(T, cmd) | 1, 2, 3 | 对照（串行带中间节点，0057 已过） |
| **C** | nodes [1 trigger, 2 terminal(T, cmd, **面板写回 session**), 3 terminal(**cmd 同、session 空**，不连线)]；edges 仅 1→2 | 1, **3**, 2 | 复现形：游离 terminal 第二根（Kahn：3 与 1 同为入度 0，数组序 3 先入队后于 1 执行、先于 2） |
| **C2**（探针变体，非闭环口径） | 同 C 但节点 3 `session = T 的绑定值` | 1, 3, 2 | 根因取证专用（§5.3）：区分「第二根新建会话」与「第二根共写同会话」两分支 |
| **D** | nodes [1 trigger, 2 delay(s:1), 3 terminal(T, cmd, 面板写回 session)]；edges **[1→2, 1→3]**（单 trigger 扇出双支，delay 支先入队） | 1, 2, 3 | 复现形：非 terminal 第二根（PRD D 字面「trigger→terminal 与 trigger→delay 双根并存」；与 C 的差异 = 第二根类型，断言显式化） |

**会话纪律（硬性，确定性前提）**：每轮结束停止本轮新建的全部会话（POST
/api/v1/pty/sessions/:id/stop）并以 GET /api/v1/pty/sessions 断言回归基线数
——S7 上限 4，C 形态每轮 +1~2 会话，不清理则第 3-4 轮起触发满员降级
（handlers.ts:326-328），污染复现口径。此纪律本身就是对「跨轮会话积累」
假象源的排除（§5.2 P4）。

## 4. 驱动脚本设计（新增测试资产，REQ-0061-02/03 载体）

### 4.1 落点与形态

- **新文件 `tests/e2e/pty-echo-matrix.mjs`**（≤400 行，硬性）+ 根 package.json
  增一行脚本 `"test:pty-e2e": "node tests/e2e/pty-echo-matrix.mjs"`。
  选型理由：smoke:server 为纯 Node HTTP 断言（157/0 基线零回退口径，不可混入
  浏览器栈拖慢每轮冒烟）；gate 为像素门禁（mock 供数，测不到真实 SSE 路由）；
  本缺陷在**真实浏览器 × 真实后端**交界面，独立脚本唯一可行。先例：
  `test:canvas`（package.json:25）、`smoke:pty`（:20）。
- **复用件**：`tests/smoke/lib.mjs`（startServer :69-104 / api :107-118 /
  waitFor :192-199 / Checker :219-245——同仓既有基建零复制）；Playwright
  chromium 为根 devDependency（package.json:31，gate.mjs:23 先例）——
  **零新依赖**。
- **环境**：自起真实 server 子进程 `PTY_ENABLED=1`（env 全量钉值防 .env 泄入，
  smoke PT 探针 A 同款口径，smoke-server.mjs:1930-1932 注释在案）；页面 =
  `apps/web/dist` 静态产物（DIST_REQUIREMENTS 前置检查，lib.mjs:20-23）；
  前置命令 `npm run build && npm run build:server`（VERIFY 口径 §8）。
- **驱动动作**（沿 gate 既有探针形态，全部状态量等待、禁裸 sleep）：
  localStorage 预置工作流（TERM_WF_SEED 同型，gate.mjs:509-512）→ reload →
  双击 T 主体开面板（`termOpen` 同型，:513-514）→ **订阅确立探针**：等
  `#term-panel .xterm-rows` 出现回放提示符（`termReady` 同型 waitForFunction
  polling 100ms，:517-518——**比 0057「面板可见」更强判据，直接封死 §5.2
  P2 判据竞态**）→ 点击 `#float-run`（jcRunClick 同型，:251）→ 等 run:done
  （运行收尾状态量：`document.body.classList` 无 running 或日志面板含
  「运行完成/运行停止」）→ 断言 `#term-panel .xterm-rows` textContent 含
  marker → 关闭面板（click `[data-tp="close"]`）→ 断言 GET /pty/sessions 仍
  含该 sid（会话存续，ADR-0014 §4.1）→ 重开面板（再双击）→ 断言 xterm 回放
  含 marker（环形缓冲恢复）→ 本轮会话清理（§3 会话纪律）。

### 4.2 断言组（断言 ID 前缀 PE = Pty Echo）

| 组 | 内容 | 判绿口径 |
| --- | --- | --- |
| PE0 | 前置：dist 产物存在 + 探针 server 健康 + 会话基线数 | 全过 |
| PE1（矩阵闭环） | A/B/C/D 四形态各跑 §4.1 全链；C/D 断言含「拓扑序 == §3 预期」「node:done（T）out 含『已注入命令 · 回显 N 字』且 N>0」「面板 xterm 含 marker」「面板状态行无 error/end 异常」 | **C/D 各 ≥2 轮全绿**（两轮独立：会话全清理后重跑），A/B 同轮回归绿 |
| PE2（六点位） | §0.1 定稿六点位逐点断言（①create 写回：`input[data-k="session"]` 值非空（termInv.sessionParam 同型，gate.mjs:522-526）②订阅确立 ③注入计数 ④回显 marker ⑤run:done ⑥重开回放）× A/B/C/D | 全绿 |
| PE3（确定性自证） | C 形态高频采样 **≥10 轮失败率 0**（修复后）；修复前基线运行（BUILD 期）同口径须 **失败率 >0** 方可确认「已复现」（PRD REQ-0061-02 时序敏感处置硬性条款） | 数据留 JOURNAL + REPORT |

### 4.3 探针模式（`--probe`，BUILD 根因取证专用，不进 VERIFY 判绿口径）

三通道同步观测一轮 C 形态，一次性判别 §5 全部假设：

1. **浏览器侧**（DOM 可观测面）：`.xterm-rows` textContent 增量时间线 +
   `.tp-status` 文本时间线（TERM 单例在 legacy 闭包内不可直达——F1，故一律
   经 DOM 观测，不为此改产品代码加调试口）；
2. **网络侧**：page.on('response') 捕获 POST /api/v1/pty/sessions 的
   sessionId（面板 attach 的 sid）；驱动自开一条 Node fetch SSE 订阅同 sid
   （复刻 0057 证明②的独立订阅者），记录到达帧序列与时刻；
3. **业务侧**：run SSE 事件流（lib.openSse）中 T 的 node:done out 全文
   （含 `#<sid 前 8 位>`——与通道 2 的 sid **逐字比对**，直接判别会话漂移
   P1）；GET /pty/sessions 前后快照（会话计数）。

## 5. 根因假设面与判别协议（BUILD 先取证后动手，证据链留 JOURNAL）

### 5.1 假设与判别矩阵（按当前证据排序，不设限——新证据可重排）

| # | 假设 | 机制 | 判别证据（--probe） |
| --- | --- | --- | --- |
| **P1** | **面板会话与节点运行期会话漂移**：T 在 run 时实际注入的会话 ≠ 面板订阅的会话（F8 判活链失活重建 / 写回未及序列化 / 双 terminal 抢绑） | 面板订阅 S，handler 注入 S′（node:done 的 #sid′ ≠ S） | 通道 3 的 sid 前缀 ≠ 通道 2 捕获的 sid |
| **P2** | **「已订阅」判据不足的竞态**（0057 驱动侧）：以面板可见性而非流就绪为起点，订阅建立晚于注入广播（S2 扇出无缓冲重发，仅 ring 留痕 S8） | 0057 harness 已丢失无法复核；本 SPEC §4.1 订阅确立探针已**结构性封死**此分支——若重建后不复现，P2 即为 0057 失败的最优解释 | 修复前基线采样失败率 = 0 且 P1/P3 证据均阴性 |
| **P3** | **读侧丢弃窗**：onFrame 到达时 TERM.term 判空即丢（F2 :3265）；触发路径仅 F3 四处（run 流已排除，F4）——窗口极窄但「偶过」特征吻合 | 面板开/关/重开与注入交叠 | 通道 2 收到 data 帧但通道 1 xterm 无增量且面板 show 态 |
| **P4** | **跨轮会话积累假象**（harness 缺陷面）：PTY_MAX_SESSIONS=4（S7），0057 六点位连跑不清理 → 满员降级/绑定失活连锁 | 与 P1 复合 | 通道 3 会话快照计数逐轮递增且 ≥4 |
| 排除项 | 服务端帧丢失（S4/S5/S6 已封死）；引擎并发（不存在，S4） | —— | 若 --probe 显示通道 2 也丢帧 → **推翻三证 → 触发 §10 中止条款**（改服务端前必须留证） |

### 5.2 执行序（BUILD 硬性）

1. 落地驱动脚本（含 --probe）→ **修复前基线**：C/D 采样（≤10 轮）取得
   失败率>0 的确定性复现（红），PE0-PE3 数据落 JOURNAL；
2. `--probe` 单轮取证 → 按 §5.1 判别出根因（允许重排/新增假设，须留证）；
3. 若修复前基线**失败率=0**（不复现）：不得盲改产品代码——以 PE3 十轮采样
   + probe 三通道证据出「无法复现」结论，按 PRD 风险 2 口径如实上报
   （验收基建达标 + 缺陷未复现，VERIFY 按实跑数据裁定），JOURNAL 全量留痕。
   此为诚实路径，非失败路径。

### 5.3 修复面约束（按根因映射，全部前端）

| 根因 | 修复形态（候选，BUILD 定案） | 边界 |
| --- | --- | --- |
| P1 | 面板与节点绑定的一致性收敛：如 openTermPanel 写回后到 run 提交的绑定读取收敛 / 面板检测 node:done 中 sid 漂移并状态行如实提示或重挂 | 改动限 app.js TERM 段（:3200-3333）+ 视需要 server-sync.js 数据层；**零服务端改动** |
| P2 | 产品代码零改动（harness 判据已由 §4.1 修复）；若同时暴露真实可改进点（如状态行「已连接」提示），仅状态行文本级、s19 fixture 静态 body 下零像素影响须 gate 实测证明 | 同上 |
| P3 | 丢弃窗收敛：如 attach 生命周期内 data 帧的微缓冲（TERM.term 置空窗口内暂存、重建后重放）或 dispose/attach 次序整固 | 同上 |
| P4 | 驱动脚本会话纪律（§3）承载，产品代码零改动 | —— |

规模预算：产品代码净改动预期 ≤60 行（对照 0057 修复轮 b442840 量级收窄）；
`app.js` 为存量文件不受 400 行新文件上限约束，新文件仅 `tests/e2e/pty-echo-matrix.mjs` 一枚（≤400 硬性）。

## 6. 受影响文件清单（productFiles 申报口径）

| 文件 | 改动 | 性质 |
| --- | --- | --- |
| `apps/web/src/legacy/app.js` | TERM 段（:3200-3333）帧路由/绑定生命周期修复 | 预期主改（P1/P3 时） |
| `apps/web/src/server-sync.js` | openPtyStream/:86-114 邻域，仅当根因在读循环侧 | 预期零改（P3 读侧分支时小改） |
| `tests/e2e/pty-echo-matrix.mjs` | **新增**：判别矩阵 + 六点位 E2E 驱动（含 --probe） | 必改 |
| `package.json` | +1 行 `test:pty-e2e` 脚本 | 必改 |
| `apps/server/**` | **预期零改动**——改前须 JOURNAL 留三证推翻证据链，否则禁止 | 禁区（除非 §10） |
| `packages/shared/**` | 零改动（PTY 流端点私有帧零 shared 契约，ADR-0014 §3.4） | 禁区 |
| `apps/web/src/app.css` / `Skeleton.tsx` / 任何静态 DOM | 零改动（§7 golden 零接触的机器前提） | 禁区 |
| `docs/evolution/iterations/0057/{PRD,SPEC,JOURNAL,REPORT}.md` | **补录 ×4**（§9，机制件提交承载，不入 productFiles） | 必改 |

零新增面（PRD REQ-0061-06 逐条继承）：零新依赖、零新 env、零新端点、零
shared 契约改动、零 CSS/DOM 静态改动。

## 7. golden 重录方案（修宪轮必备节；宪法第 3 条依据在案）

- **根本规范依据**：CONSTITUTION 第 3 条（变更流程：ADR + 用户批准 + 同 PR
  重录 golden）+ 第 2 条（重录唯一入口 `npm run gate:update`，CI 为权威）。
  授权链：ADR-0014 §7 + issue#5 批复承继 2026-10-23T15:49:06Z（修宪轮重试，
  用户已 issue 批准——PRD 头部授权链段）。
- **预期重录范围 = 空集**：本轮修复对象为运行期数据流行为（PTY SSE 帧 →
  xterm 渲染路由），不触三层静态面（§2.2 F5；§6 禁区行）。在库 20 场景
  （含 s19-terminal-panel-online，gate.mjs:565）必须 **diffPx=0**——任一
  场景像素波动即属影响面扩大信号，先查构建/环境（s3 本机抖动先例，issue#12
  口径：不消费抖动重录），确属本改动所致 → 按下行或有通道处置。
- **或有重录通道（消费条件硬性，三者缺一不可）**：① 根因取证（§5.2 第 2 步
  证据链）证明修复**必须**改静态渲染面（DOM 结构/CSS/视觉）；② 重录范围收敛
  到受波及场景的最小集（按 0057/0054 先例推演：terminal 静态面唯一关联场景
  为 s19；节点库类目行零改 → s3 预期不波及——以 gate 实测红场景清单为准，
  不得全量重录，0056 P1「25 文件超口径」教训在案）；③ 工作树内 `npm run
  gate:update` 恰一次 + 前后截图对比证据进 JOURNAL，CI `ui-constitution`
  推送后盯守。**预期不触发**；触发即说明 §5 根因定性升级，SPEC §6 禁区行
  同步失效评估，JOURNAL 如实记档。

## 8. 验收口径（VERIFY 逐项实跑，命令名即口径）

| # | 命令/点位 | 通过标准 |
| --- | --- | --- |
| V1 | `npm run build` | exit 0 |
| V2 | `npm run gate` | 20 场景全绿 **diffPx=0**，零 gate:update 消费（§7 或有通道除外，须证据链） |
| V3 | `npm test` | 30/30（shared 契约零回退） |
| V4 | `npm run smoke:server` | **157/0**（PT01-PT06 终端组零回退） |
| V5 | `npm run build:server && npm run test:pty-e2e` | PE0-PE2 全绿 + PE3 C 形态 ≥10 轮失败率 0；C/D 各 ≥2 轮独立全绿留输出 |
| V6 | 手动 E2E 点位（浏览器，沿 PRD REQ-0061-04）：① 面板键入透传（键入 `echo hi` 回显可见）② 会话停止（stop 钮 → 「会话已结束」状态行）③ 关闭重开（回放恢复）④ 降级态（PTY_ENABLED=0 server：面板呈现「未启用」空态，run 中 terminal 节点 warn 降级）⑤ 多根 C/D 形态手工复刻一次回显可见 | 五点位全过，截图/记录留 REPORT |
| V7 | 0057 机制件补录四件落盘且头部标注合规（§9） | 逐件核验 |

## 9. 0057 机制件补录方案（REQ-0061-05 落地）

落盘 `docs/evolution/iterations/0057/`（现仅 MERGE.md + evidence/，本会话 ls
亲核）四件，**每件头部显著标注**：「**补录（2026-10-28 · 迭代 0061 重试轮
代录）· 原件随 0057 工作树丢失（MERGE.md §1 留痕）**」。内容仅依在库证据
重建，逐件证据源映射：

| 件 | 证据源（全部在库） | 不可复原项（如实标注，禁杜撰） |
| --- | --- | --- |
| PRD | BACKLOG BK-0045 行（BACKLOG.md:66 全段）+ BK-0043/0044 行 + ADR-0014 §7 + 0056 行「BK-0045 已列 ready」 | 0057 期 PLAN 选题过程存证原始细节（占位核查快照等）→ 标「不可复原（依 BACKLOG 行述结构等价重建）」 |
| SPEC | 0057 产品成果反推：MERGE.md §1 改动面清单（19 文件）+ handlers.ts:305-345 / session.ts / routes.ts / app.js:3200-3333 / server-sync.js:70-114 现行实现 + ADR-0014 §7 + gate.mjs s19 基建 | 原 SPEC 章节原文与设计取舍过程 → 标「依在库实现与 ADR-0014 反推」 |
| JOURNAL | git log b442840 提交说明 + MERGE.md §1/§2（修复轮合并为单提交的形态异常、NDP 漏提交事故链） | 逐日开发过程记录 → 标「不可复原」 |
| REPORT | MERGE.md §3 复测四绿 + evidence/ 六日志四截图 + BACKLOG BK-0045 行「失败要点」段（BUG-0057-01/02 定级、C/D 2/2 复现、E2E 6/6 败、三证）+ §4.3 矩阵定义（**已丢失，依 PRD §0.1/本 SPEC §3 重建版回链并标注「结构等价重建」**） | VERIFY 期原始断言输出 → 标「不可复原，以 evidence/ 日志与 MERGE.md §3 为准」 |

补录件为机制件（迭代目录产物提交承载，WORKFLOW §4 分支提交②），不入
productFiles 白名单。

## 10. 中止条款与风险（PRD 风险段的技术化）

1. **三证被推翻**：--probe 通道 2（独立订阅者）也丢帧 → 服务端确有缺陷 →
   **立即中止**，item 置 pending-approval/blocked，本迭代按回滚处理，证据
   链 JOURNAL 留档后 escalate 交用户（PRD 风险 3 / WORKFLOW §4 BUILD 条款）。
2. **影响面扩大**：根因指向须改 shared 契约 / 静态 UI 面 / 新依赖 → 同上中止
   （§7 或有通道仅覆盖「重录」，不覆盖「未获批的静态设计变更」——ADR-0014
   §7 + issue#5 授权射程为终端节点既有设计，非无限授权）。
3. **熔断**：本轮 failed = 连续 2 次同项 failed → stuck 交用户，不再自动重试
   （PRD 风险 1）。
4. **假修复防线**：单轮绿不判过（PE1 双轮 + PE3 十轮采样 + PE2 六点位 ×4
   形态 + V4/V6 回归面，四重口径，PRD 风险 2）。

## 11. ADR 评估：本轮无需新 ADR（needsAdr=false）

理由：本轮为**已批准架构内的缺陷修复**——授权载体 ADR-0014（§7 终端节点
定界、§3.4 端点私有帧契约、§4.1 会话正交）+ issue#5 批复承继 + issue#14
依赖批复均已存在并覆盖 §6 全部改动面；修复不产生新的架构决策（进程模型/
端点面/契约面/依赖面零变化）。新建 ADR 将与既有授权重复，无决策增量。
若 §10 中止条款触发（三证被推翻需改服务端契约），届时按宪法第 3 条另提
ADR 草案（编号顺延 0021，标注「已获用户 issue #5 批复」的射程外事项则标
「待用户批准」）——**该情形本轮未发生**。

## 12. 模块边界（docs/frontend-module-boundaries.md 口径 + ADR-0006）

- `app.js`（legacy）：TERM 面板全部 DOM/交互/生命周期持有方——本轮唯一可能
  的产品代码主战场；画布/节点库/属性面板零触碰（F4 证据）。
- `server-sync.js`：仅数据层（fetch 封装 + 流解析回调），**不操作面板 DOM**
  （文件头注 :1-9 契约）；改动仅限读循环健壮性，不新增缓存/arrive 面（PTY
  无列表 UI 消费面，:70-73 注释在案）。
- `packages/shared`：零改动（PTY 帧为端点私有，不入 RunEventSchema——
  ADR-0014 §3.4 定稿，MERGE.md 改动面佐证）。
- `apps/server`：零改动预期（§6 禁区行）；`tests/`：新增资产独立于 smoke
  基线（157/0 口径不动）。
