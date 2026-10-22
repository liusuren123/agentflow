# PRD · 迭代 0002 · BK-0002 后端 E2E 冒烟脚本：`/api/v1` workflows/runs CRUD + `/api/v1/run` SSE 全事件链

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 08:02
> 来源：BACKLOG BK-0002（P1 / test / M / ready / 触UI=否，`docs/evolution/BACKLOG.md:12`）；
> 主题归属 ROADMAP T2-M2（质量基建 · 后端 E2E 冒烟脚本一键执行，`docs/evolution/ROADMAP.md:49-55`）。
> 选题依据：ready 队列最高优先级 P1 的表首项（同优先级按表中顺序，BACKLOG 头注），
> 备注明示「是 T3 各项 VERIFY 的公共基座，故列 P1 表首」；与周度治理确认的选题序
> 「0002→BK-0002」一致（`docs/evolution/weekly/43.md` §一.3）。大小 M，无需拆分。

## 结论

**建议做（本迭代即做）**：一句话理由——服务端至今零自动化测试（ADR-0007 §2 明文
「服务端至今无测试基建」，历次端点验证均为手工 curl / 一次性 E2E，见 ROADMAP T2-M2
现状「未开始」），一键冒烟既直接关账 T2-M2，又为 BK-0007 等 T3 项提供 VERIFY 公共
基座（BACKLOG.md:15 备注「VERIFY 依赖 BK-0002」），并成为此后每次后端心跳迭代的
回归底线；M 大小单迭代可完整交付。

## 触 UI 分类结论

**否。** 本项改动面仅两处：① 新增 `tests/` 下的冒烟脚本文件（测试，宪法第 4 条
「不适用」清单）；② 根 `package.json` 增一行 `smoke:server` scripts（构建配置，
同属「不适用」清单但仍需常规 review）。不改 `apps/web`、`apps/server`、
`packages/shared` 任何源码，不在任何渲染路径上。验收仍要求 `npm run gate` 复跑
全绿以防误触（AC8）。

## 背景（含代码事实源，2026-10-22 只读核实）

1. **被测端点全景**（路由注册 `apps/server/src/server.ts:185-202`）：
   - workflows：GET 列表（updated_at 倒序摘要，server.ts:144-146）、GET 详情
     （缺失 404，server.ts:147-151）、PUT upsert（`/api/v1/workflows` 与
     `/:id` 两路由同型，路径 id 优先、body.id 次之、均缺省生成新 id，
     server.ts:152-157,196-197）、DELETE（缺失 404，server.ts:172-175,201）。
   - runs：GET 列表（limit 1-100 整数校验，违规 400，server.ts:160-164,198）、
     GET 详情（`{ run, events }` 完整事件回放，缺失 404，server.ts:165-169,199）、
     DELETE（活动 run 409 / 不存在 404 / 成功 `{ok:true}`，server.ts:176-183,202）。
   - POST `/api/v1/run`：SSE 流式执行（body.nodes 非数组 400，server.ts:74）。
2. **SSE 事件链事实源**：run:accepted（seq=0，先落库后写网，server.ts:83-93）→
   run:start（`apps/server/src/engine.ts:67`）→ node:start（engine.ts:91）→
   node:done（engine.ts:127）→ run:done（engine.ts:150）；seq 自 run:accepted=0
   递增（server.ts:88-92），历史回放与 SSE 同源。
3. **活动 run 判定**：内存注册表 runsById（server.ts:47,104，运行结束即删
   server.ts:120）——DELETE 409 仅在 run 进行中成立；approval 节点可让 run 稳定
   停留活动态最长 10 分钟（等待 approve，超时自动通过，
   `apps/server/src/handlers.ts:205-221`），为 409 断言提供确定性窗口。
4. **无一键入口**：根 package.json scripts 无 smoke 相关条目（2026-10-22
   `grep -n "smoke" package.json apps/server/package.json` → 0 匹配，exit=1）；
   `tests/` 现仅含 `golden/`（ls 实查）。
5. **启动前置**：server 启动即校验 `apps/web/dist/index.html`，缺失 fatal 退出
   （server.ts:52-56）——冒烟脚本须前置校验或自行构建；端口默认 3000、可 env
   `PORT` 覆盖（`apps/server/src/config.ts:89`）。
6. **持久化固定路径**：`data/agentflow.db`（仓库根 data/，WAL，不入库），无 env
   覆盖（`apps/server/src/store.ts:23-24`）——冒烟断言会写真实开发库，必须自建自清。

## 目标

1. 提供一键命令（`npm run smoke:server`）对**真实 server 进程**断言 `/api/v1`
   workflows/runs CRUD、`/api/v1/run` SSE 全事件链与删除守卫语义，任一断言失败
   退出码非 0（ROADMAP T2-M2 验收口径逐条承载）。
2. 脚本自编排服务生命周期（前置校验 → 起进程 → 健康等待 → 断言 → 清理 → 杀进程），
   全程零手工步骤、零库残留。
3. 关账 ROADMAP T2-M2，并为 T3 项（BK-0007 起全部依赖本基座）解锁 VERIFY 路径。

## 非目标（out of scope）

- 不改 `apps/` 与 `packages/` 任何产品源码；包括不为 store 增加 DB 路径 env——
  若 SPEC 评审认定必需，属产品代码变更，超出本项范围须另立项。
- 不触 UI 三层；不改 CI 配置与 `tools/pixel-gate/`（WORKFLOW §6 护栏 3）；
  CI 是否接入冒烟由治理日另行决策。
- 不做浏览器面 E2E（该面由 gate golden 场景 + test-manager 手动清单承载）。
- 不覆盖 stop/approve 全组合（409 断言收尾二选一即可）；不做性能/并发/停机断言
  （Windows 信号盲区见 weekly/43.md §四 O4，停机断言属 CI 侧后续项）。
- 不引入任何新依赖（SSE 读取用 Node 内置 fetch 流式读体，Node 18+ 均可）。

## 用户故事

1. 作为开发者，我需要一条命令验证后端全部 `/api/v1` 端点契约，使每次后端迭代
   有可重复的回归底线，替代手工 curl。
2. 作为 test-manager，我需要 BK-0007 等 T3 项 VERIFY 的一键冒烟基座
   （BACKLOG.md:15「VERIFY 依赖 BK-0002」），使 VERIFY 证据可复现。
3. 作为协调者，我需要 T2-M2 关账证据（一键命令 + 断言全过的输出摘要 + 退出码）。

## 需求条目

- **REQ-0002-01 · 一键入口**：根 package.json 新增 `smoke:server`；脚本落
  `tests/smoke/`（新增文件，≤400 行，AGENTS 硬性约定 4；Node 内置能力，零新依赖）。
- **REQ-0002-02 · 服务生命周期编排**：启动前校验 `apps/web/dist/index.html` 与
  `apps/server/dist/server.js` 在位（缺失时给出「先 npm run build / build:server」
  可操作报错，对应 server.ts:52-56 的 fatal 行为）；经 env `PORT` 使用空闲端口
  （config.ts:89）；健康轮询 `/api/v1/health` 就绪后再断言；退出时（成败皆然）
  终止子进程、释放端口。
- **REQ-0002-03 · workflows CRUD 往返断言**（承载 AC2）：PUT 新建得 id → PUT
  同 id 更新 → 列表含该 id → 详情内容一致 → DELETE 成功 → 详情与再删均 404。
- **REQ-0002-04 · SSE 全事件链断言**（承载 AC3）：对确定性最小工作流（无 LLM、
  无出站请求、无审批，如 userinput→prompt 二节点）断言有序子序列
  run:accepted → run:start → node:start → node:done → run:done，流以 run:done
  收束且各 node 事件按拓扑序覆盖全部节点。
- **REQ-0002-05 · runs 列表/详情回放断言**（承载 AC4）：列表含新 runId；详情
  events 自 seq=0 严格升序、与 SSE 所见事件一致。
- **REQ-0002-06 · 活动 run 删除 409 断言**（承载 AC5）：含 approval 节点的
  工作流等待审批期间 DELETE 得 409 `{error:'run is active'}`；approve（或 stop）
  收尾后再删得 `{ok:true}`。
- **REQ-0002-07 · 参数反例断言**（承载 AC6）：run body.nodes 非数组 → 400；
  runs limit=0 与 101 → 400。
- **REQ-0002-08 · 自清理与退出码契约**（承载 AC1/AC7）：所有断言逐条命名输出；
  任一失败输出失败断言名与上下文后退出码非 0；finally 清理自建 workflow/run
  （复用 DELETE 端点），对既有行零破坏（只操作自建 id）。

## 非功能要求

1. **可重复**：幂等可连跑——自建自清，不依赖库内既有状态，不污染开发库。
2. **可诊断**：断言失败时输出「断言名 + 请求/响应摘要」，不留静默 pass。
3. **环境**：Windows 本机（Git Bash / Node v24）优先兼容（路径、子进程终止、
   端口等待）；gate 以 CI 为权威的口径不受本项影响。
4. **规模**：新增脚本文件 ≤400 行；超出先拆分（AGENTS 硬性约定 4）。
5. **零渲染影响**：不改任何渲染路径；产品提交后 gate 必须 4 场景全绿（防误触
   兜底，AC8）。

## 验收标准（Given / When / Then）

- **AC1 · 一键可跑**：Given `apps/web/dist/index.html` 与 `apps/server/dist/
  server.js` 已构建在位（或脚本自行完成构建），When 在仓库根执行
  `npm run smoke:server`，Then 脚本对真实 server 进程完成全部断言并输出逐条
  摘要、退出码 0；任一断言失败时输出失败项与请求/响应上下文、退出码非 0。
- **AC2 · workflows CRUD 往返**：Given 服务健康，When PUT `/api/v1/workflows`
  新建（断言返回 id）→ PUT `/api/v1/workflows/:id` 同 id 更新 → GET
  `/api/v1/workflows` 列表含该 id → GET `/api/v1/workflows/:id` 内容与所存
  一致，Then 全部成立；When DELETE `/api/v1/workflows/:id`，Then 返回
  `{ok:true}`，随后 GET 详情与再次 DELETE 均 404。
- **AC3 · SSE 全事件链**：Given 一个确定性最小工作流（无 LLM、无出站、无审批），
  When POST `/api/v1/run`，Then SSE 流按序出现 run:accepted → run:start →
  node:start → node:done → run:done（有序子序列断言，node 事件覆盖全部节点），
  且流在 run:done 后收束。
- **AC4 · runs 列表与回放**：Given AC3 的 run 已完成，When GET
  `/api/v1/runs?limit=N`，Then 列表含该 runId；When GET `/api/v1/runs/:id`，
  Then events 自 seq=0 起严格升序且与 SSE 所见事件一致。
- **AC5 · 活动 run 删除 409**：Given 含 approval 节点的工作流处于等待审批的
  活动态，When DELETE `/api/v1/runs/:id`，Then 409 `{error:'run is active'}`；
  When 随后 approve（或 stop）使 run 收尾，Then 再 DELETE 返回 `{ok:true}`。
- **AC6 · 参数反例**：When POST `/api/v1/run` 且 body.nodes 非数组，Then 400；
  When GET `/api/v1/runs?limit=0` 与 `?limit=101`，Then 均 400。
- **AC7 · 自清理零残留**：Given 冒烟可能失败于任一步，When 脚本退出（无论成败），
  Then 自建 workflow 与 run 均已删除（finally 清理），列表复查不含自建项；库中
  既有行零读写破坏（断言只针对自建 id）。
- **AC8 · 渲染零影响**：Given 本迭代仅新增 `tests/` 文件与 package.json scripts
  行，When 产品提交前运行 `npm run gate` 与 `npm test`，Then gate 4 场景全绿
  （diffPx=0）、test 5/5 通过。

## 依赖与风险

- **依赖**：`apps/web/dist` 与 `apps/server/dist` 构建在位（脚本前置校验兜底，
  REQ-0002-02）；与 2026-10-22 治理日全量回归基线一致（weekly/43.md §二），
  预期断言可复现。
- **风险 1 · 写真实开发库**（store.ts:23-24 固定路径）：缓解——finally 自清 +
  只操作自建 id（AC7）；极端情况进程被杀残留自建行，不影响断言本身（断言不查
  既有行），残留行与 BK-0011（悬挂 run 收尾）互补治理。
- **风险 2 · 端口占用**：缓解——脚本经 env PORT 选空闲端口（config.ts:89）。
- **风险 3 · approval 窗口内 run 意外提前结束**（10 分钟超时窗，handlers.ts:215）：
  断言前先确认 run 仍活动（实现细节归 SPEC）。
- **风险 4 · Windows 子进程清理**：脚本须确保子进程随脚本退出终止，避免端口
  泄漏（治理日冒烟已有同类经验，weekly/43.md §二）。

---

> **PLAN 交叉核实注记**（product-manager，2026-10-22 08:04）：本 PRD 首稿由并发
> PLAN 会话落盘（08:02）；本会话独立完成选题分析（结论同为 BK-0002：P1 表首、
> 周 W43 预定序 `weekly/43.md:31`、test 类产品提交非空可规避迭代 0001「产品提交
> 为空」失败模式）后，逐项复核首稿全部代码引用——`server.ts:47,74,83-93,104,120,`
> `144-183,194-202`、`engine.ts` 四事件行、`handlers.ts:205-221`（10 分钟超时自动
> 通过）、`config.ts:89`、`store.ts:23-24,121`、`events.ts:8-33`——全部与源码一致，
> 采纳为迭代 0002 正式 PRD，不重写。触 UI 结论（否）与 AC1–AC8 经复核维持。
