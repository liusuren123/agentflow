# PRD · 迭代 0019 · BK-0011 悬挂 run 启动终结标记

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 18:47
> 来源：BACKLOG BK-0011（P2 / capability / S / ready / 触UI=否，来源 T3；周报 W43
> 体检观察 O1 立项、0007 补题轮晋升 ready，`BACKLOG.md:54`）。
> 主题归属：ROADMAP T3·后端执行能力（`ROADMAP.md:58-62`）——无专属里程碑锚点
> （T3-M1 已由 BK-0007 关账、T3-M2 为 BK-0008 ready、T3-M3 已由 BK-0009 关账），
> 为治理日派生的数据如实性补题（W43 观察 O1，`weekly/43.md:314`）。
> 选题依据（WORKFLOW §4 优先序逐条处置，本会话 2026-10-24 18:3x~18:47 核实）：
> ① **批复项无新动作且现存批复项全部顺延**——档案「approved：无」与实况一致：
> 本轮面板 #10/#11 均 open 未批复，BK-0028~0030（转 ready 唯一条件=issue#10 获批）
> 与 BK-0021/0023（唯一条件=issue#11 获批）维持 proposed 零实现；余下批复 ready 项
> BK-9002~9005（P0/L/触UI=是）顺延论证本轮逐项复核仍成立（0016/0017/0018 PRD
> 先例）：BK-9002/9003/9005 前置 BK-0021（NDP）未批——其先行项 BK-0031 已 done、
> 实施轮 issue #11 open 未批；BK-9004 前置 BK-0016 已 done 但 L 项拆分排序归
> 10-25 周日治理日（`ROADMAP.md:154-155`），心跳抓取即夹带拆分违「一次迭代只做
> 一件事」→ 顺延。② **user-request 无**——本轮档案 issue 面板七项（#2~#6、#10、
> #11）全为 needs-approval，无 user-request 条目——无建行、无 uiIssueNumbers；
> #6 open 未批复维持待批准区不建行、不催办、不代批。③ rejected 无。④ **常规
> 选题取 BK-0011**——治理日解阻链明示心跳选题序列「0019→BK-0011 → 0020→
> BK-0008」（`weekly/43.md:315-316`、`ROADMAP.md:166-169`，前两顺位 BK-0027/
> BK-0031 已于迭代 0017/0018 done）；批复项顺延后非 doc ready 池恰两项
> {BK-0011（P2/S）、BK-0008（P2/M）}，按「优先 S」取 BK-0011（doc ready 池为 0，
> 无跳过争议）。与最近 3 次迭代重叠面核对：0018=shared test 资产 + docs（零重叠）；
> 0017=纯 docs（零重叠）；0016=store.ts 追加 approval_audits + handlers + smoke
> V 组（本轮共享 store.ts 触点——追加式新增语句与函数，不改既有表/语句，正交；
> smoke 追加 Z 组断言，与 V 组正交）；server.ts 最后实质触达为迭代 0015（sessions
> 路由），本轮仅在启动序列 `initStore()` 调用点后追加数行，正交。

## 结论

**建议做（本迭代即做）**：一句话理由——run 行插入即硬编码 `'running'`
（`store.ts:159-160`），只有 `run:done`/`run:error` 事件会把它推到终态
（`store.ts:288-300`）；进程被 SIGKILL/断电/崩溃杀死时来不及写终结事件，
该行就**永久悬挂**——本会话只读探针证实开发库现存恰 1 条（id
`161ce4ff-0b87-40f2-ad4f-aba461975fdc`，started_at epoch 1792570720608 =
2026-10-21T08:18:40.608Z，done=0/total=8/ended_ms=null，run_events 已落 22 行、
无终结事件），历史面板里它永远显示「运行中」，状态失真。优雅停机路径早已把
中止的 run 收敛为 `'stopped'`（`server.ts:222-243` → `store.ts:291-293`），崩溃
是唯一漏网路径。本迭代补上启动期扫尾：服务启动时把遗留 `running` 行标记为
`'stopped'`（枚举既有值，`store.ts:33`），**不伪造任何事件行、不虚构 ended_ms**，
S 尺寸一轮可完。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为 `apps/server/src/store.ts`（新增一条 prepared statement + 一个扫尾
   函数）、`apps/server/src/server.ts`（启动序列一处调用 + 一行 pino warn）、
   `tests/smoke/smoke-server.mjs`（Z 组断言追加）；`apps/web/**`、
   `packages/shared/**`、`tools/pixel-gate/**`、`tests/golden/**`、`.github/**`、
   根 `package.json` 零字节改动——视觉 / DOM 结构 / 交互三层与 golden 基线均
   不接触，`npm run gate` 8 场景为纯回归面（AC6）。
2. POLICY 校验：后端能力演进（`apps/server/src/**`，不新增 npm 依赖、零出站、
   零新增 env）+ 测试与回归基建（smoke 扩充）——**自主区**。
3. **DEFS / SSE 契约零涉及**：状态值 `'stopped'` 为 `RunStatus` 既有枚举成员
   （`store.ts:33`），由既有 stop 端点与优雅停机中止路径产生（`store.ts:291-293`
   ev.stopped → 'stopped'）；**不新增事件类型、不新增状态值、不改 shared**。
   前端零改动且零新值接触：历史卡片按 `runCardMeta(r.status)` 映射展示
   （`app.js:581`），`server-sync.js:123-129` 的 status→样式映射注释明载
   「error/stopped 共用琥珀，差异落文本」、default 分支即承接 `stopped`——本
   特性只是让既有 `'stopped'` 值出现在它该出现的地方。

## 背景（代码事实源，2026-10-24 18:3x~18:47 本会话只读核实）

1. **run 状态机唯一写入点**：`RunStatus = 'running' | 'done' | 'error' | 'stopped'`
   （`store.ts:33`）；runs 行插入即 `'running'`（`store.ts:159-160` INSERT 字面量）；
   终态只经 `openRunRecorder` 的 txEvent 事务写入——`run:done`（ok/stopped 分流
   done/error/stopped）与 `run:error`（error）（`store.ts:288-300`，映射在
   `:291-293`）。事件先落库后写网（`store.ts:6-8` ADR-0005 doctrine）。
2. **启动期无扫尾**：`initStore()` 全体为建目录 + DDL + prepared statements +
   四个事务装配（`store.ts:145-225`），无任何对 runs 的启动扫描；`server.ts:65`
   启动期调用 `initStore()` 后直接进入路由与 listen，全文件 grep "running" 仅
   `:183` 注释（本会话复核实况，与 BK-0011 行内 0007 轮记录一致）。
3. **优雅停机不是漏网路径**：SIGINT/SIGTERM → `shutdown()` 中止全部活动 run，
   各 run 走停止路径发 `run:done(stopped)` 后收尾、注册表自清（`server.ts:222-243`，
   文件头注释 `:20` 同口径；0015 起会话 turn 同批）。**崩溃/强杀不经过该路径**
   ——`run_events` 止于最后一条真实事件，runs 行 status 停留 `'running'`。
4. **僵尸现象是代码自认的已知态**：run 删除守卫特意用内存注册表而非 DB status，
   注释明载「进程崩溃重启后残留的僵尸 running 行恰需可删」（`server.ts:180-187`，
   409 断言 `smoke-server.mjs:435-436` D02）——即架构早已承认该态存在，只是
   无人收尾。
5. **本会话只读探针（better-sqlite3 readonly，2026-10-24 18:41）**：
   `SELECT … FROM runs WHERE status='running'` 恰 1 行——id
   `161ce4ff-0b87-40f2-ad4f-aba461975fdc`、workflow_name「智能客服助手」、
   started_at `1792570720608`（= 2026-10-21T08:18:40.608Z，本地 UTC+8 即 10-21
   16:18）、done=0、total=8（run:start 已写 total）、ended_ms=null、run_events
   22 行。与档案探针（同 id 同工作流）一致。**口径差观察**：BACKLOG BK-0011 行
   与 weekly/43.md §四.4 记「started 2026-10-20」，epoch 换算为 10-21——备注
   口径漂移非缺陷，以探针原始值为准（本轮不改既有行，治理日可顺手刷新）。
6. **治理日链**：W43 观察 O1（悬挂 run）→ BK-0011 承载、选题序列已排
   （`weekly/43.md:314-316`）；ROADMAP 待办同款解阻链
   「前置期间心跳按 ②BACKLOG ready 序选题（BK-0027 → BK-0031 → BK-0011 →
   BK-0008）；任一 needs-approval 获批则该链优先于常规选题」
   （`ROADMAP.md:166-169`）。本轮无新批复 → 链继续生效。
7. **冒烟基座可行性（Z 组设计依据）**：lib.mjs 边界规则——触达被测系统仅
   /api/v1 HTTP 契约与构建产物存在性两条通道、**不直接读写 data/agentflow.db**
   （`lib.mjs:6-7`，2026-10-25 治理日批处理修正——原稿笔误 12-13，见 REPORT BUG-0001）；`startServer` 返回 `{child, base, log, exitPromise, …}`
   （`lib.mjs:71-107`），`process.execPath + shell:false` 使 `child.kill()`
   Windows 下直达 node 进程（TerminateProcess，`lib.mjs:63` 注释）——显式
   `kill('SIGKILL')` 双平台一致模拟崩溃、不经优雅停机；ringLog(200) 环形缓冲
   可供日志子串断言；挂起 fixture WFAPPR（单 approval 节点，`smoke-server.mjs:43`）
   已被 D 组用于「run 确定处于挂起活动态」的门（`:419-430` waitFor
   approval:required）。被测 server 进程经 `store.ts:28-31` ROOT 推导使用仓库根
   `data/agentflow.db`（与 spawn cwd 无关）——Z 组重启实例的启动扫尾会顺带把
   开发库现存真实悬挂 run（161ce4ff）收尾，属特性预期生效；其「修复前」证据
   已固化于本节 5 与迭代 REPORT 采样义务（AC1 前置采样）。
8. **冒烟既有断言正交性**：R02 断言 run:done 后 `status==='done'`（
   `smoke-server.mjs:404-406`）——扫尾只碰启动时刻的遗留 running 行，不触活动
   run 生命周期；D02 409 判活走内存注册表（`:435-436`），与 DB status 正交
   （BK-0011 行内既有判断，本轮复核成立）；C01/C02 清理走 DELETE 端点
   （`:245-257`），Z 组自建 run 同样自清。
9. **竞品对照**（product-manager.md 职责 2）：n8n/Dify 等执行引擎在进程重启后
   均将中断的执行标记为终态（interrupted/crashed 类语义）而非永久「运行中」；
   AgentFlow 在枚举既有四值内以 `'stopped'`（被外力中止，非工作流错误）承载，
   与优雅停机中止同语义，是最小如实实现——不引入第五个状态值。

## 目标

1. **启动扫尾**：服务启动时把上次进程遗留的 `status='running'` runs 行标记为
   `'stopped'`（ended_ms/done/total 保持原值——时长不可知，NULL 即如实）。
2. **审计留痕**：扫尾命中时打一条 pino warn（数量 + run id 列表），零命中时
   不打（正常路径无噪音）。
3. **机器断言**：冒烟新增 Z 组——SIGKILL 模拟崩溃 → 重启 → 经 API 断言扫尾
   生效、事件历史零伪造、清理干净；既有 84 断言零回退。

## 非目标（out of scope）

- **不新增 RunStatus 枚举值**（无第五状态）、**不新增 SSE 事件类型**、**不改
  `packages/shared/**`**（'stopped' 为既有值）。
- **不伪造历史**：不写入任何合成 `run:done`/`run:error` 事件行，不回填
  ended_ms/done/total——「不伪造结果」原则（`tools.ts:5` 同源 doctrine）；
  回放流保持止于最后一条真实事件。
- **不删除悬挂 run**：只改状态标记；删除是用户既有手动能力（DELETE 端点，
  `server.ts:180-187`），且悬挂行恰是可删的注释在案。
- **不做跨实例协调**：单实例部署为基线（与 DELETE 409 守卫同族口径）；
  「双实例共用同一 DB 文件时后启实例会误标先启实例活动 run」记为已知边界
  （见风险 1），不引入进程锁/属主列（S 尺寸，不扩 schema）。
- **不动会话域**：sessions/messages 无状态列、无悬挂语义（0015 起会话 turn
  中止已由停机路径处理），零接触。
- **不更新 ROADMAP / metrics / BACKLOG 状态**（CLOSE 职责）；不改 BK-0011 行
  备注「started 2026-10-20」口径差（治理日顺手项）。

## 用户故事

1. 作为工作流作者，我在历史面板看到的 run 状态必须如实——服务器崩溃后重启，
   中断的 run 应显示为已停止，而不是永远「运行中」骗我去看一条早已断流的
   回放。
2. 作为部署运维者，重启即自愈：不需要手工 DELETE 或写 SQL 去清理僵尸行；
   启动日志里有一条 warn 告诉我收尾了几条、是哪几条。
3. 作为 test-manager，「崩溃→重启→状态收敛」这条链路要有机器断言（Z 组），
   并能反演证明断言真的在守护（摘除扫尾必须红）。

## 需求条目

- **REQ-0011-01 · store.ts 扫尾函数（新增，SQL 收敛本模块 `store.ts:4`）**：
  `sweepDanglingRuns(): { count: number; ids: string[] }`——先 SELECT 遗留
  `status='running'` 的 id 列表，后在单个事务内 `UPDATE runs SET
  status='stopped' WHERE status='running'`（ended_ms/done/total 不在 SET 列，
  保持原值；SELECT+UPDATE 同事务防竞态窗口）；返回命中数与 id 列表供日志。
  prepared statement 装配进既有 `S` 表（对齐 patchRun 先例形态）。行预算：
  store.ts 净增 ≤ 15 行（基线 385 行，改后 ≤ 400，AGENTS.md 硬性约定 4 的
  从严口径）。
- **REQ-0011-02 · server.ts 启动接线（新增）**：在 `initStore()`（`server.ts:65`）
  之后、`app.listen` 之前调用 `sweepDanglingRuns()`；count>0 时 `logger.warn`
  一行：固定子串「启动扫尾」+ 数量 + ids（超长截断），count=0 时不打。净增
  ≤ 8 行。
- **REQ-0011-03 · 冒烟 Z 组（tests/smoke/smoke-server.mjs 追加，断言经 API——
  lib.mjs:6-7 边界规则，不直接读 DB）**：
  - Z01：复用 WFAPPR fixture 发起 run，waitFor `approval:required` 确认 run 处于
    挂起活动态（D 组同款门），记录 runId；击杀前 GET /api/v1/runs/:id 采样
    events 数组长度 N 与 status='running'。
  - Z02：`child.kill('SIGKILL')` + `exitPromise` 等退出（双平台崩溃语义，
    `lib.mjs:63`）；`startServer` 同端口重启（健康就绪即扫尾已完成——扫尾在
    listen 之前，health 200 可作时序门）。
  - Z03：重启后 GET /api/v1/runs/:id → 200 且 `status==='stopped'`、
    `ended_ms===null`、done/total 保持击杀前值、events 数组长度仍 === N（**无
    合成终结事件**）；新实例 ringLog tail 含「启动扫尾」子串。
  - Z04：清理——DELETE /api/v1/runs/:id → 200（重启后非活动，无 409）；
    DELETE 后 GET → 404。
- **REQ-0011-04 · 产品提交白名单**：恰三路径——`apps/server/src/store.ts`（改）、
  `apps/server/src/server.ts`（改）、`tests/smoke/smoke-server.mjs`（改）；
  其余任何路径零改动（AC5 机器核对，含 package-lock.json 零变化 = 零依赖证明）；
  BACKLOG/STATE/metrics 回写随归档提交（0011~0018 同机制）。

## 非功能要求

1. **性能**：启动扫尾为单 SELECT + 单 UPDATE（走索引无需——runs 表量级小，
  SQLite 全扫可接受；不新增索引不扩 schema）。启动延迟增量可忽略。
2. **安全**：零出站请求、零新 env、零新依赖；UPDATE 无用户输入拼接（无参
  化必要——字面量条件 `status='running'`）。
3. **可核查性**：PRD 引用的一切代码指针（file:line）真实可开（AC7 抽样 ≥5 条
   逐一比对；本 PRD 背景节指针为本会话亲核基线）。
4. **规模**：store.ts 改后 ≤ 400 行；server.ts 净增 ≤ 8 行；smoke Z 组增量
   不设 400 硬限（测试文件先例：0016 加 V 组 +205 行）。
5. **POLICY 合规形态**：全程自主区；不触 UI / 不触 shared / 不触 golden。

## 验收标准（Given / When / Then）

- **AC1 · 扫尾语义（真实悬挂 run）**：Given 开发库 `data/agentflow.db` 存在
  悬挂 run（本会话探针：161ce4ff，BUILD 前由 VERIFY 再采样一次固化「修复前」
  证据），When 构建并以 dist 产物启动服务（冒烟 Z02 的重启实例即触发），
  Then 该行经 GET /api/v1/runs/:id 断言 `status==='stopped'`、`ended_ms===null`、
  done/total 保持崩溃前已落库值（0/8），且 run_events 行数不变（无合成终结
  事件——「不伪造历史」验收）。
- **AC2 · 幂等与零命中静默**：Given 库中无 `status='running'` 遗留行，When
  服务再次重启，Then 启动正常（health 200）、日志无「启动扫尾」warn（零命中
  不打）、既有 runs 行状态不被触碰（Z 组外的主实例/后续重启不误伤已终态行）。
- **AC3 · 冒烟全量**：When 执行 `npm run smoke:server`，Then 全部断言通过
  0 failed（84 既有 + Z 组新增 ≥4；既有 R02 status='done'、D02 409 内存判活、
  G/V/K/M 组零回退）。
- **AC4 · 反演红绿双向**：Given 临时摘除 server.ts 的扫尾调用（注释或删行），
  When 复跑冒烟，Then Z03 断言 FAIL（status 仍 'running'）且 exit 1 → 逐字
  还原后复跑复绿、git status 零残留。
- **AC5 · 白名单与零依赖机器证明**：When 对产品提交执行 `git show --numstat`
  与 `git diff` 核对，Then 仅 REQ-0011-04 三路径；`apps/web/**`、
  `packages/shared/**`、`tools/**`、`.github/**`、根/子包 `package.json`/
  `package-lock.json` 零改动。
- **AC6 · 回归面**：`npm run build` + `npm run gate`（8 场景）+ `npm test` +
  `npm run smoke:server` 全绿——本轮零 apps/web/packages/shared 触及，
  gate 为纯回归面，按工作流脚本统一门禁执行口径采信（先例 0012/0014/0016/
  0017/0018：VERIFY 不必复跑全套，REPORT 引用门禁结论）。
- **AC7 · 指针可核查**：When（VERIFY 执行）从本 PRD 引用的代码指针中抽样
  ≥5 条逐一打开比对，Then 全部与代码现状一致；发现任一指针失效即 FAIL 并列
  BUG。

## S 项免 SPEC 内嵌（skipSpec=true）

BK-0011 为 S 项（非 doc、非触 UI）——按 WORKFLOW §4 免独立 SPEC，受影响文件
清单与验收口径即本 PRD REQ-0011-04 与 AC1~AC7，BUILD 逐条执行、VERIFY 逐条
验收。

### 受影响文件清单（产品提交白名单，恰三路径）

| 路径 | 动作 | 内容 |
| --- | --- | --- |
| `apps/server/src/store.ts` | 改 | prepared statement ×1 + `sweepDanglingRuns()`（REQ-0011-01，净增 ≤15 行） |
| `apps/server/src/server.ts` | 改 | 启动序列调用 + pino warn（REQ-0011-02，净增 ≤8 行） |
| `tests/smoke/smoke-server.mjs` | 改 | Z01-Z04 崩溃-重启-扫尾断言组（REQ-0011-03） |

### 验收口径速查（VERIFY 逐条执行）

AC1 真实悬挂 run 收敛（BUILD 前采样）→ AC2 幂等零命中静默 → AC3 冒烟全量
0 failed → AC4 反演红绿双向 → AC5 `git show --numstat` 白名单 + lock 零变化 →
AC6 回归面（脚本门禁口径）→ AC7 指针抽样 ≥5。

## 依赖与风险

- **依赖**：零新依赖、零 env、零出站；仅需既有 `npm run build:server` 产物链。
- **风险 1 · 双实例共用 DB 误标（已知边界，不解决）**：后启实例的启动扫尾会把
  先启实例正在跑的活动 run 误标 'stopped'。依据：架构对双实例本就只有「容忍」
  没有「协调」——messages 序列号注释明载「双实例共用同一 DB 文件时语句级锁
  保证不重号」（`store.ts:179-180`），DELETE 409 守卫同样以单实例内存注册表
  为准（`server.ts:180-187`）。处置：PRD 明示单实例基线 + 备注已知边界；
  不引入属主列/进程锁（扩 schema 超 S 尺寸，且无现实部署诉求）。
- **风险 2 · Z 组副作用吃掉真实证据**：重启实例会顺带收尾开发库真实悬挂 run
  161ce4ff——BUILD 后「修复前」现场即消失。处置：本 PRD 背景 5 已固化探针
  原始输出（id/epoch/done/total/事件数），AC1 要求 VERIFY 在 BUILD 前再采样
  一次落 REPORT。
- **风险 3 · 平台击杀语义差异**：win32 `child.kill()` 即 TerminateProcess
  （`lib.mjs:63` 注释「kill 直达 node 进程」）；POSIX 下显式 `'SIGKILL'` 亦
  不经 SIGTERM 优雅停机——双平台崩溃语义一致，Z02 显式用 `'SIGKILL'`
  （lib 既有超时清理同款，`lib.mjs:99`）。
- **风险 4 · store.ts 行数逼近上限**：基线 385 行 + 净增预算 ≤15 = ≤400 恰在
  AGENTS.md 硬性约定 4 从严口径内；若实现超限，优先压缩为最小形态（statement
  字面量 + 六行函数），拆分文件不在本轮。
- **风险 5 · 扫尾时序**：扫尾必须位于 `initStore()` 之后（依赖 S 装配）且
  `app.listen` 之前（外部可见前完成收敛——Z02 以 health 200 作扫尾已完成时序
  门）。REQ-0011-02 已定死调用点。

---

## 选题过程存证

- **批复栏「approved：无」处置（规则①）**：与实况一致——#10/#11 open 未批复
  （BK-0028~0030、BK-0021/0023 转_ready 条件未满足，维持 proposed）；现存批复
  ready 项 BK-9002~9005（P0/L/触UI=是）**顺延**（0016/0017/0018 先例，本轮
  逐项复核）：BK-9002/9003/9005 前置 BK-0021 实施轮未批（先行项 BK-0031 已
  done、issue #11 open）；BK-9004 前置已满足但 L 项拆分排序归 10-25 周日治理日
  （`ROADMAP.md:154-155`），心跳抓取即夹带拆分违「一次迭代只做一件事」。
- **user-request（规则②）**：本轮档案 issue 面板七项（#2~#6、#10、#11）全为
  needs-approval，**无 user-request 条目**——无建行、无 uiIssueNumbers。#6 open
  未批复：维持待批准区不建行、不催办、不代批。
- **rejected（规则③）**：无处置。
- **残缺标记档案**（tools.ts:5/:82 stub 如实降级）：已知状态——BK-0005 done +
  M07 断言守护 / BK-0008 ready 承载 sqlite 真实化，无新项不重复立项。
- **悬挂 run 探针**：即本项证据——本轮亲验（只读 better-sqlite3，18:41）仍恰
  1 条、id 与档案一致（161ce4ff，智能客服助手）；started 口径差（备注 10-20 vs
  epoch 10-21T08:18Z）见背景 5，非缺陷。无新项。
- **覆盖差集 / 文档漂移 / dogfooding**：治理日产物（weekly/ 与 BACKLOG 既有
  证据行），心跳不重复采集。
- **选题（规则④）**：BK-0011——治理日解阻链明示「0019→BK-0011」
  （`weekly/43.md:315-316`、`ROADMAP.md:166-169`，前两顺位已 done）；批复项
  顺延后非 doc ready 池 {BK-0011（P2/S）、BK-0008（P2/M）}，按「优先 S」取
  BK-0011。doc ready 池为 0，无跳过争议。
- **skipSpec 判定**：S 项（非 doc、非触 UI）→ 免独立 SPEC（skipSpec=true），
  受影响文件清单与验收口径内嵌于本 PRD（见专节）。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE /
  POLICY / WORKFLOW / CONSTITUTION / .zcode/agents/product-manager.md 全文
  read；iterations/0018/PRD.md 全文 read + 0017/0016 PRD 头部选题节 read
  （近 3 迭代重叠面据此核对）；weekly/43.md:310-320 read（§四.4/四.5）；
  `apps/server/src/store.ts` 全文 read 386 行（枚举 :33、insertRun :159-160、
  initStore :145-225、终态写入 :288-300、ROOT :28-31、双实例注 :179-180）；
  `apps/server/src/server.ts` grep + 分段 read（:55-110 启动/runHandler、
  :150-200 路由与 DELETE、:215-247 shutdown）；`tests/smoke/lib.mjs`:1-130
  read（边界 :6-7、startServer :71-107、kill 注 :63、SIGKILL 清理 :99）；
  `tests/smoke/smoke-server.mjs` grep（WFAPPR :43、D 组 :418-436、R02
  :404-406、C 清理 :245-257）；`apps/web/src/legacy/app.js` grep（:581
  runCardMeta）；`apps/web/src/server-sync.js` grep（:106-107、:123-129 stopped
  映射）；悬挂 run 只读探针两连查（id/status/started_at/done/total/ended_ms/
  事件数 + 原始 epoch）；`date` 实查 2026-10-24 18:42。
