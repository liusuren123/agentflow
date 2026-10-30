# JOURNAL · 迭代 0069 · BUILD（BK-0020 引擎 on-error 三策略）

> 执行角色：code-developer · 2026-10-31 01:10~01:29 · 工作树 feat/0069-iter
> 输入：PRD（skipSpec，§8 受影响文件清单 + §9 验收口径）+ ADR-0022（权威蓝图）。
> 触UI=否纯后端承载轮，golden 零接触、全程未运行 gate:update（宪法第 3 条）。

## 1. 实现过程（按文件，含关键决策）

### apps/server/src/engine.ts（154 → 约 205 行）

- **imports**：新增 `config`（策略单一来源，handlers.ts:15 同款直引先例）、
  `ABORT_MSG`/`abortableSleep`（util.ts 既有导出，abortable sleep 硬护栏直接复用）；
  类型补 `NodeHandler`/`WorkflowRunResult`。头部注释补 on-error 一行。
- **签名**（原 :34）：返回类型改 `Promise<WorkflowRunResult>`（ok 字段入返回值）。
- **策略块**（mainScope 之后插入）：`onErrorStrategy = config.onError`（默认 skip）；
  `onErrorRetries` 仅 `onErrorStrategy==='retry'` 时取 env，否则恒 0（ADR-0022 §3
  「仅 retry 消费，0 = 退化 skip」的代码化——skip/abort 配了 RETRIES 也不重试）；
  `onErrorAborted` 独立 let 标志位（不调 ac.abort，stopped 语义独占保持）。
- **重试宿主 `callHandlerWithRetry`**（仅包裹 handler 调用的循环，ADR-0022 §4.2）：
  每次尝试前 `ac.signal.aborted` 复查（合成 AbortError 走既有中止分支）；
  重试通报**先行于退避**（既有 `log` 事件 lvl:'warn'，零新事件类型；措辞
  `第 n 次尝试将在 Xms 退避后执行（前次失败：…）`，n=attempt+1——恰 maxAttempts-1
  条）；退避 `delay × 2^(attempt-1)` 单次 `Math.min(…, 30000)` 封顶，
  以 `abortableSleep(ms, ac.signal)` 竞速（stop 端点/优雅停机等待期内即时中断）；
  `isAbort(err) || ac.signal.aborted` 即原样上抛（中止不被策略截获）；
  **maxAttempts===1 时原样上抛 lastErr**（未配置/skip/abort 路径零漂移的代码保证——
  不加「已重试 0 次」概要、不改错误对象）；耗尽抛 `末次错误（已重试 N 次）` 概要。
- **catch 分派点**（runNode）：`scope.executed.add` → `prog.done++; progress()` →
  中止判定三段既有序列**零搬移**（ADR-0022 §4.1）；中止后插入策略分派：skip 终态
  = 既有 node:error + log.warn 序列 named 化（message 变量提取，行为逐位一致）；
  abort = 同一终态序列 + `onErrorAborted = true`，return（不上抛）。
- **主循环**：`:137` 同位增 `if(onErrorAborted) break;`（全部后续节点含同级独立
  分支不再调度；stopped 保持 false）。
- **收尾**：`ok = !stopped && !onErrorAborted`（标志位仅 abort 策略置位 → 未配置/
  skip/retry 恒 ≡ !stopped，ADR-0022 §4.4 二态语义的等价实现）；run:done 与返回值
  同源。

### apps/server/src/config.ts（149 → 约 163 行）

- 白名单数组 +3 行（PTY 段后）；EnvSchema +3 字段：`ON_ERROR` 用 `z.enum(['skip',
  'retry','abort'])`，两数值用 `z.coerce.number().int().min/max`（PTY :80-82 同款
  zod 形态）；输出映射 +3 键（`onError`/`onErrorRetries`/`onErrorRetryDelayMs`，
  默认 skip/0/1000）。无交叉校验需求（ADR-0022 §3：单变量值域自洽）。

### apps/server/src/types.ts（81 → 96 行）

- +`WorkflowRunResult` 接口（executeWorkflow 返回形状收口，ok 字段注释引 ADR-0022
  §4.4 与消费链 store.ts:302 自然承接）。「策略配置透传」未采用 RunCtx 透传形态——
  engine 直引 config 单例与 handlers.ts 同款，零新耦合面（PRD §8「如实施需要」裁量）。

### apps/server/src/server.ts（1 行）

- `.then(r=>{ outcome = { ms: r.ms, ok: r.ok, stopped: r.stopped }; })`——服务端
  outcome 日志改消费引擎返回值（abort 收尾时与 SSE run:done 不再自相矛盾）；
  实锚 ：175（PRD §8 写 :176 系其笔误口径，ADR-0022 §4.4 本就标注 ±1 漂移按代码
  事实实施）。

### packages/shared/src/events.ts（仅注释行 :32）

- ok 语义注释刷新（仅 abort 策略显式配置才可 false）+ 漂移坐标修正
  `server-sync.js:105-107 → :295-297`（文档同步面；schema 字段零变更，AC9）。

### apps/server/.env.example（25 → 28 行）

- PTY 段后 +3 行 `#` 模板注释（零生效配置，值域注 + ADR-0022/BK-0020 溯源），
  0005/0055 先例（REQ-0069-08）。

### tests/smoke/smoke-server.mjs（新增 OE 组 OE01-OE08）

- 头部编排注释补 OE 组段；步骤序补 `→OE`；模块级 +7 实例/mock 声明；
  `wfOeFail` 夹具工厂（根 userinput → 失败 http → 下游 prompt，sibling 变体追加
  根的第二分支）；`startOeMock` 进程内计数端点（**连接销毁 = 必失败**——http 节点
  handler 对非 2xx 不抛错，5xx mock 不可用，本会话先以临时探针脚本实测
  destroy→fetch 抛错/第三次成功 三连确定性后再定案）；清理数组与 mock 收尾纳入
  doCleanup；主实例 env 三键空串钉值（OE01 未配置前提防开发者 env 泄入，T 组纪律）。
- 断言面：OE01 未配置零漂移（主实例）/ OE02 skip 显式等价 / OE03 retry 耗尽
  （mock 命中恰 3 = 尝试次数硬证据 + warn 恰 2 + 「已重试 2 次」概要 + 下游失活 +
  ok:true + status done）/ OE04 第 3 次成功（[1,2,3] 全 done + out 200）/
  OE05 abort fail-fast（starts=[1,2] 含同级分支不再调度 + ok:false/stopped:false +
  status 'error'）/ OE06 30s 退避期 stop 即时中断（<7s 收束 + stopped:true +
  「已中止」）/ OE07 非法值 ×3 fail-fast（code=1 + 变量名 + 约束）/ OE08 边界值
  0/0 与 5/60000 双实例通过。**OE 组 ID 前缀经 grep 既有组全量比对零撞号**
  （A/B/C/CAP/D/E/G/H/J/K/KB/N/O/PT/R/S/T/V/W/Z 在用）。

## 2. 关键决策与裁量（PRD/ADR 授权范围内）

1. **重试宿主收口在引擎闭包函数**（非 HANDLERS 层包装）：args 保持 runNode 内单次
   重建、bypass/node:start 一次性语义天然保留（ADR-0022 §4.2 逐字落地）。
2. **maxAttempts===1 原样上抛**：保证 skip/abort/未配置路径错误对象与现状逐位一致
   （AC1 硬护栏的实现级保证，smoke OE01 锚定）。
3. **mock 必失败 = 连接销毁**：探针实测 5xx 不触发 handler 异常（handlers.ts:93-99
   仅透传 status），改用 req.socket.destroy()（本会话临时脚本三连验证）。
4. **retry 实例 ALLOW_PRIVATE_NET=1**：既有 env 语义（guard.ts 白名单存量），仅为
   计数 mock 回环触达；abort/stop 探针显式钉空保持 guard 拦截失败面。
5. **重试通报先行于退避（自测首轮教训返工）**：初版通报置于循环顶（尝试开始前），
   位于退避**之后**——30s 退避等待窗内无任何事件可等，OE06 的 stop 无时序门可依
   （首轮实跑 OE06 红：waitFor log 15s 超时）。修正为 catch 内「emit 通报 →
   abortableSleep」，通报在等待窗内即达（亦正是 issue#15 ③知悉项要的 delta 叠加
   可解释性时点），修正后全绿。
6. **OE06 stop 路径实错自纠**：首轮误写复数 `/api/v1/runs/:id/stop`（404 静默不
   abort），端点实为单数 `/api/v1/run/:id/stop`（server.ts 路由注册，A04 同款）——
   自测的价值实证，修正后 OE06 即时中断 <7s 收束。

## 3. 自测记录（工作树内实跑；全量门禁归脚本统一执行）

- `npm run build:server`（tsc）：见 §4 ①（首轮 1 个类型错误当场修正后 exit 0）。
- `npm test`（shared 契约 30 断言）：见 §4 ②（终态树复跑仍 30/30）。
- `npm run smoke:server`：见 §4 ③（OE 组 8 断言全绿 + 既有基线零回退）。
- `npm run gate`：未运行（非前端渲染路径改动；纯后端承载轮，归脚本统一门禁）。

## 4. 附记（实跑记录，含时点性假红处置——0037 先例同型）

- **① `npm run build:server`**：首轮 `src/engine.ts(137,38) TS2345`（noUncheckedIndexedAccess
  下 `HANDLERS.__pass` 亦 `| undefined`，沿既有 `!` 断言形态修正）→ 复跑 exit 0。
- **② `npm test`**：`ℹ tests 30 / ℹ pass 30 / ℹ fail 0`（events 契约断言含在内，
  注释行变更零影响；**真实 events.ts 在位时实跑**）。
- **③ `npm run smoke:server`**：终态 **`==== smoke:server：182 passed / 0 failed ====`
  exit 0**（168 基线 + OE 组 8 + 本轮新增 6 个 run 的 C01 清理断言，账目吻合；
  OE01-OE08 全绿，V09/Z/KB 等既有组全绿零回退）。过程如实记录（三跑）：
  - 首跑 `97 passed / 1 failed`：唯一 FAIL=**V09 后半段** `git status --porcelain
    -- packages/shared` 非空（`shared=M packages/shared/src/events.ts`）——**V09
    时点性假红**（iterations/0037/REPORT.md:14 明文先例：「产品提交后自愈」）：
    本轮 events.ts 注释行系 PRD §8 授权面，schema 校验前半段 51/51 通过、
    字段零变更；fail-fast 依机制阻断其后各组。该检查在脚本真实时序（工作树内
    仅跑 build/gate/test，smoke 归**合并后主干复测**——届时树净）恒绿，产品
    提交后自愈。
  - 为取得全量绿证据（含 OE 组），以 `git stash push -- packages/shared/src/events.ts`
    临时摘除唯一 shared 改动 →（注释行不进编译产物，运行时行为零差异）→ 复跑
    `179 passed / 1 failed`（OE06 红：通报时点 + stop 路径两处自测缺陷，见 §2
    决策 5/6，均系 smoke 断言与实现时点问题、无产品逻辑缺陷）→ 修正 engine 通报
    时点与 OE06 stop 路径后终跑 **182/0** → `git stash pop` 完整恢复（终态树
    events.ts 变更在位，`npm test` 复跑 30/30 复证）。
  - **对 VERIFY 的提示**：若验收在工作树内复跑 smoke，V09 将因 events.ts 未提交
    再现时点性假红（0037 同型）——以本节三跑记录 + `npm test` 契约断言为
    events.ts 变更的权威证据即可，勿据假红立项缺陷；脚本主干复测自愈。
