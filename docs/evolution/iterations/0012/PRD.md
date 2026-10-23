# PRD · 迭代 0012 · BK-0025 CI 补 SIGTERM 优雅停机断言（issue#8 批复项）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-24 02:04
> 来源：BACKLOG BK-0025（P0 / test / S / ready / 触UI=否，来源 issue#8；2026-10-24
> 迭代 0011 PLAN 轮落行，批复时间戳在案）。
> 主题归属：ROADMAP T2·质量基建（无专属里程碑——由周报 W43 观察 O4 派生，与
> T2-M2 冒烟基座同族；BACKLOG BK-0025 行）。
> 选题依据：WORKFLOW §4 优先序 ①——issue#8 为用户批复项（OWNER 本人评论「批准」
> 2026-10-23T15:48:25Z，0011 PLAN 会话 gh 亲核，BK-0025 行备注在案）。批复项现存
> 六个 ready（BK-0025 + BK-9001~9005），本轮取 BK-0025 的排序论证：
> (a) **唯一非修宪轮批复项**——零 UI/golden 接触，S 尺寸最小，授权链完备、独立无
> 前置，风险在批复项中最小；(b) BK-9001（#1）为 M 级修宪轮（触 UI + ADR + golden
> 重录），BK-9002~9005（#2~#5）为 L 级修宪轮且各有未竟前置（BK-0016 会话 API、
> BK-0021 NDP——0011 PRD 已论证「急选即夹带拆分」），按「优先 S/M + 一次迭代只做
> 一件事」均不宜先于 BK-0025；(c) STATE 0011 轮 last_result 明示「下次心跳队首
> BK-0025（issue#8）」。与最近 3 次迭代零重叠：0011=tools/pixel-gate + tests/golden
> + docs/adr；0009=apps/server/src + tests/smoke/mcp-stubs；0008=docs/ 新文档——
> 本轮改动面为 tests/smoke 新增脚本 + package.json 一行 + .github/workflows/ci.yml，
> 与 0009 的 tests/smoke 触点仅共享目录不共享文件（mcp-stubs.mjs / smoke-server.mjs /
> lib.mjs 零改动）。

## 结论

**建议做（本迭代即做）**：一句话理由——ADR-0004 落地的优雅停机路径
（`apps/server/src/server.ts:204-233`）至今只有本机部分验证：周报 W43 §二明载
「停机日志路径因 Windows 信号模拟限制无法本机触发」，观察 O4 结论「Windows 跨进程
SIGINT 走 TerminateProcess，停机 handler 不触发；建议 CI（Linux）补一条停机断言」；
用户已批复 issue#8，本迭代在 CI Linux 环境补上这条断言，把停机行为纳入机器证明。

## 触 UI 分类结论

**否。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面为**新增测试脚本 + 根 package.json 脚本行 + CI workflow step**；
   `apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**` 零字节改动——视觉/
   DOM 结构/交互三层与 golden 基线均不接触，`npm run gate` 预期零影响（AC5 回归）。
2. POLICY 校验：「CI 与 `.github/workflows` 变更」属**需批准区**——issue#8 用户
   OWNER 本人批复在案（2026-10-23T15:48:25Z），授权闭环；其余落点（tests/**、
   测试基建）属自主区。
3. **非修宪轮**（reconstitutional=false）：无 UI/golden 变更，gate:update 不适用
   （BK-0025 行备注同口径）。

## 背景（代码事实源，2026-10-24 01:5x~02:04 本会话只读核实）

1. **停机实现现状**（`apps/server/src/server.ts:204-233`，ADR-0004）：SIGINT/SIGTERM
   同径注册（:232-233）→ `shutdown()` 依次：log「优雅停机开始」（含 signal 与
   activeRuns 字段，:216）→ `server.close()`（:217）→ abort 全部活动 run（:218-220）
   → ≤5s 宽限轮询（:221-224）→ log「优雅停机完成」（:228）→ `closeStore()`
   SQLite 落盘（:229）→ `process.exit(0)`（:230）。
2. **验证盲区**（周报 W43 §二体检行 + §四 O4）：本机 Windows 跨进程信号走
   TerminateProcess，`process.on('SIGTERM')` handler 不触发——停机日志路径
   （开始/完成/退出码 0）在本机**无法触发验证**，目前只有「进程退出、端口释放、
   0 残留」的间接证据；静态复核完整但无运行时断言。
3. **CI 现状**（`.github/workflows/ci.yml`）：仅两 job——ui-constitution
   （windows-latest，gate）+ contracts（ubuntu-latest，npm ci + npm test，
   `ci.yml:32-41`）。无任何停机断言。
4. **断言可行性事实**：
   - 端口可注入：`config.ts:90` `port: env.PORT ?? 3000`——脚本可用独立端口
     spawn，避开 3000 占用与并发心跳互踩。
   - 日志流：`logger.ts:10` `pino({...})` 无显式 destination——pino 默认写
     **stdout**（JSON 单行，msg 字段），脚本从子进程 stdout 匹配停机日志行
     （BUILD 时复核一次，若实测为 stderr 则以实测为准调整读取管道，断言口径不变）。
   - 就绪探针：`/api/health` 及 v1 别名已有（AGENTS.md 命令表、周报 §二
     `/api/v1/health` 200）。
   - Linux 信号语义：Node 子进程收 SIGTERM 正常触发 handler——CI ubuntu-latest
     即权威环境（与 golden「CI 权威」口径同理）。
5. **授权链**：issue#8（2026-10-23 治理日开，needs-approval）→ 用户 OWNER 本人
   评论「批准」（2026-10-23T15:48:25Z，0011 PLAN 会话 gh 亲核，无 🤖 前缀）→
   BK-0025 行落 ready P0（BACKLOG 备注）。

## 目标

1. **断言脚本**：新增 `npm run smoke:shutdown`——spawn 构建产物 server → 健康探针
   就绪 → 发 SIGTERM → 断言停机三要素（停机日志链 + 退出码 0 + 端口释放）。
2. **CI 挂接**：ci.yml contracts job（ubuntu-latest）追加执行该脚本，使停机行为进入
   每次 push/PR 的机器证明。
3. **如实降级**：Windows 本机运行该脚本时显式 SKIP（exit 0 + 原因说明），不伪造
   通过、不红——权威断言在 CI Linux（O4 原设计意图）。

## 非目标（out of scope）

- **不改停机实现**：`apps/server/src/**` 零改动——ADR-0004 既有行为只验证不修改；
  若断言发现实现缺陷，本迭代按 FAIL 处理另立 BUG 项，不顺手修。
- **不做 SIGINT 断言**：SIGINT/SIGTERM 同径注册（`server.ts:232-233`），一条
  SIGTERM 即覆盖 `shutdown()` 全路径；CI 环境自然信号即 SIGTERM，避免冗余用例。
- **不新增 CI job / 并发矩阵 / npm 依赖**：挂 contracts job 最小增量（省一次
  checkout + npm ci）；零新依赖（node:child_process / node:http 内建）。
- **不做活动 run 中止断言**（发 SIGTERM 时挂起中 run 的 run:done(stopped) 收尾）：
  需要真实长跑 run 编排，超 S 尺寸；空载停机（activeRuns=0）即 O4 指向的日志路径，
  活动收尾路径留后续按证据另立。
- 不处理 BK-0011 悬挂 run（正交项，ready 在池）。
- 不更新 ROADMAP / metrics 状态（CLOSE 职责）。

## 用户故事

1. 作为用户（宪法主权者），我批复了 #8，期望停机行为断言按 O4 建议落在 CI Linux，
   且我的宪法门禁（gate）与既有测试零影响。
2. 作为 test-manager，未来任何改动破坏优雅停机（日志链断裂、退出码非 0、端口不
   释放）时，我需要 CI contracts job 直接变红，而不是靠 Windows 本机无法复现的
   人工检查。
3. 作为运维部署者（Docker 场景），我依赖 SIGTERM → 5s 宽限 → exit(0) 的停机契约
   （`server.ts:221` 注释明示 Docker 默认 10s 窗口），需要它被机器持续看守。

## 需求条目

- **REQ-0025-01 · 断言脚本**：新增 `tests/smoke/shutdown-sigterm.mjs`（node 内建
  模块实现）：注入独立 `PORT`（如 3901）spawn `apps/server/dist/server.js` → 轮询
  `/api/v1/health` 200 就绪（上限 ~10s）→ `process.kill(child.pid, 'SIGTERM')` →
  断言：① stdout 日志行先后含「优雅停机开始」（signal==='SIGTERM'）与「优雅停机
  完成」；② 子进程退出码 === 0；③ 退出后对端口的连接被拒（ECONNREFUSED）。
  空载场景 activeRuns=0，不应出现「强制退出」warn 行（可作附带断言）。
- **REQ-0025-02 · Windows 如实降级**：脚本在 `process.platform === 'win32'` 时打印
  SKIP 原因（O4：Windows 信号模拟限制，断言权威在 CI Linux）并 exit 0——不静默、
  不伪造断言通过。
- **REQ-0025-03 · 脚本注册**：根 `package.json` scripts 追加
  `"smoke:shutdown": "node tests/smoke/shutdown-sigterm.mjs"`（一行，格式沿
  smoke:server 先例 `package.json:19`）。
- **REQ-0025-04 · CI 挂接**：ci.yml contracts job（ubuntu-latest）在 `npm test`
  后追加两 step：`npm run build:server`（脚本的 spawn 对象）+ `npm run smoke:shutdown`
  （需 CI 权威真断言，非 SKIP 路径）。不改 ui-constitution job。
- **REQ-0025-05 · 改动面白名单**：产品提交 git diff 仅允许——`tests/smoke/
  shutdown-sigterm.mjs`（新增）、`package.json`（+1 行）、`.github/workflows/ci.yml`
  （contracts job +2 step）；其余任何路径零改动（AC5 机器核对）。
- **REQ-0025-06 · 超时与卫生**：脚本整体设硬超时（如 30s，防止停机宽限逻辑回归
  造成 CI 挂死）；结束前确保 kill 子进程（无论成败），不留孤儿进程占端口。

## 非功能要求

1. **确定性**：断言只依赖固定字面量（日志 msg 中文串、退出码 0、ECONNREFUSED），
   不依赖时序 sleep 完成停机（等待用「进程 exit 事件 + 端口拒绝探针」而非定时猜）。
2. **时长可控**：脚本全程 < 15s（启动 ~2s + 停机 < 1s + 探针余量），CI 增量可忽略。
3. **规模**：新文件 ≤ 400 行上限（预估 ~100 行）。
4. **可审计**：issue#8 批复链接 + 本 PRD + VERIFY 报告构成授权与证据链。

## 验收标准（Given / When / Then）

- **AC1 · 停机断言通过（CI 权威路径）**：Given `npm run build:server` 已完成且
  非 Windows 环境，When 运行 `npm run smoke:shutdown`，Then 脚本 PASS（exit 0），
  且断言记录覆盖三要素：SIGTERM 后 stdout 先后出现「优雅停机开始」（signal=
  'SIGTERM'）与「优雅停机完成」、子进程退出码 0、退出后原端口连接 ECONNREFUSED。
- **AC2 · 断言保护力反演**：When（VERIFY 演练）临时注释 `server.ts:233` 的
  SIGTERM 注册并重建后重跑脚本（非 Windows 环境），Then 脚本 FAIL（exit ≠ 0——
  子进程被默认 SIGTERM 终止、无停机日志、退出码非 0 至少一项触发失败）；还原注释
  重建后复绿。证明断言非恒真。
- **AC3 · Windows 如实降级**：When 在 Windows 本机运行 `npm run smoke:shutdown`，
  Then 输出含 SKIP 与原因说明（Windows 信号模拟限制）且 exit 0；不出现断言通过的
  伪造输出。
- **AC4 · CI 生效**：Then ci.yml contracts job（ubuntu-latest）含 build:server +
  smoke:shutdown 两 step；推送后 contracts job 绿（CI 为权威，本机绿仅参考）。
- **AC5 · 改动面与回归**：When 核对产品提交 git diff，Then 仅 REQ-0025-05 白名单
  三处；`npm run gate` 6 场景全绿（s0~s5，迭代 0011 后基线）+ `npm test` 全绿 +
  `npm run smoke:server` 全绿（三者为回归证明，脚本是新增不触碰既有断言）。
- **AC6 · 授权链在档**：Then PRD 本文件 §背景 5 引用 issue#8 与批复时间戳；无需
  ADR（非宪法类变更，CI 变更授权由 issue#8 批复承载）。

## S 项免 SPEC：内嵌受影响文件清单与验收口径（skipSpec=true）

BK-0025 为 S 项（非 doc、非触 UI），按 WORKFLOW §4 免独立 SPEC，受影响文件清单与
验收口径以本 PRD 为准：

| 文件 | 动作 | 内容 |
| --- | --- | --- |
| `tests/smoke/shutdown-sigterm.mjs` | 新增 | REQ-0025-01/02/06：spawn + SIGTERM + 三要素断言 + win32 SKIP + 硬超时与进程卫生 |
| `package.json` | +1 行 | REQ-0025-03：`smoke:shutdown` 脚本行 |
| `.github/workflows/ci.yml` | contracts job +2 step | REQ-0025-04：build:server + smoke:shutdown（ui-constitution job 零改动） |

验收命令口径：AC1/AC3 = `npm run build:server && npm run smoke:shutdown`（本机
Windows 验 SKIP 路径；PASS 路径以 AC4 CI 为权威）；AC2 = 反演演练（注释
`server.ts:233` → `npm run build:server` → 重跑 FAIL → 还原重建复绿，演练后
`git status` 须干净）；AC5 = `git diff` 白名单核对 + `npm run build && npm run gate`
+ `npm test` + `npm run smoke:server` 全绿。

## 依赖与风险

- **依赖**：`npm run build:server`（spawn 对象 dist/server.js）；CI contracts job
  既有 node 22 + npm ci。零新 npm 依赖。
- **风险 1 · pino 输出流口径**：PRD 按 pino 默认 stdout 记载（`logger.ts:10` 无
  destination 实查）；BUILD 实测若为 stderr，仅改脚本读取管道，断言口径不变
  （REQ-0025-01 附注）。
- **风险 2 · 本机无 Linux 环境，AC1 PASS 路径本机不可复现**：权威在 CI
  （AC4），与 golden 同口径；AC2 反演如在 Windows 本机执行需 WSL/Git Bash 信号
  语义复核——若本机不可行，VERIFY 以「篡改脚本预期日志串 → 脚本自 FAIL」等价
  反演示断言非恒真，并在 REPORT 如实记载反演方式。
- **风险 3 · 端口冲突**：独立端口注入（config.ts:90 事实）+ 进程卫生
  （REQ-0025-06）双保障。
- **风险 4 · CI contracts job 时长**：+build:server（tsc ~数秒）+ 脚本 <15s，
  增量可忽略；不触及 required check（ui-constitution）。

---

## 选题过程存证

- **档案处置（本轮档案三项）**：
  - 批复栏「approved：无」——与 BACKLOG 实况一致（#1~#5/#7/#8 七项批复已于 0011
    轮全部落 ready，BK-0026[#7] 已 done 归档），无新批复需落行，规则①无动作。
  - rejected：无——规则③无处置。
  - user-request #9——**不建行**（规则②例外，POLICY 判定顺序「先查禁止区」）：
    #9 系循环 2026-10-23 治理日以 🤖 前缀开的**通知 issue**（请用户亲改 AGENTS.md，
    非用户方向提案），其内容属 POLICY 禁止区（AGENTS.md 仅用户可改）；三处漂移
    用户已亲改在库（AGENTS.md:28 docs/evolution/ 仓库地图行、:30
    frontend-module-boundaries.md、:48-49 smoke:server/test:canvas 命令行——本
    会话经系统注入的现行 AGENTS.md 全文核对三处在位，最近触达提交 21d94a3），
    issue 待用户自行确认关闭。此处置沿 0011 轮先例（iterations/0011/PRD.md
    §选题过程存证「#9 不建行」）。禁止区工作不入执行池，建 proposed 行无执行主体。
  - 残缺标记档案（tools.ts:5,82 stub 如实降级）与悬挂 run 探针（161ce4ff running
    1 条）：均为已知状态，前者 BK-0005 done + M07 断言守护 / BK-0008 ready 承载，
    后者 BK-0011 ready 承载——无新项，不重复立项。
- **选题**：BK-0025（排序论证见头部 (a)(b)(c)）。常规 ready 队列（BK-0022/0016/
  0017/0011/0008 等）因批复项优先（WORKFLOW §4 优先序 ①）顺延，行未动。
- **skipSpec 判定**：S 项 + 非 doc + 非触 UI → 免独立 SPEC，本 PRD 内嵌清单与
  口径（见 §S 项免 SPEC 节）。
- **引用核实清单**（均本会话执行）：BACKLOG / ROADMAP / metrics / STATE / 周报
  weekly/43.md 全文 read；iterations/0011 PRD 全文 read；`server.ts:190-233` read
  （停机实现 + 路由注册）；`logger.ts:1-20` read；`config.ts:90` grep（PORT 注入）；
  `ci.yml` 全文 read；`package.json:10-23` scripts read；`tests/smoke/` 目录 ls
  （三文件在位）；AGENTS.md 三处修复经系统注入现行版核对在位。
