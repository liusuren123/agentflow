# JOURNAL · 迭代 0015 · BK-0016 持久会话与流式会话 API（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 08:05
> 输入：`PRD.md`（REQ-0016-01~07 / AC1~AC7）+ `SPEC.md`（§0 硬前置判定通过：15 种事件内
> 取用 7 种，零新增契约；§1-§10 受影响文件清单/事件字段表/竞态时序/预算/回滚）。
> 实现严格按 REQ-0016-07 白名单四处落点，未扩大影响面；零 UI / 零 shared 契约 /
> 零新依赖 / 零新 env / 零新出站类别。完整门禁（build / gate / test）与 git 提交由
> 脚本统一执行，BUILD 未自行运行。
> STATE.md 已按派发指令更新：`phase: SPEC → BUILD`，`updated: 2026-10-24 08:05`。

## 1. 改动清单（恰 REQ-0016-07 白名单四处，git diff 实查）

| 文件 | 净改动 | 行数（预算） | 改动内容（落点） |
| --- | --- | --- | --- |
| `apps/server/src/store.ts` | +96 | 255→**351**（≤360 ✓） | REQ-0016-01：头注表清单 + 正交性声明；DDL 幂等追加 `sessions`/`messages` 两表（SPEC §3.1-2 逐字）；`SessionRow`/`MessageRow` 导出类型；7 个 prepared statements（含 `insertMessage` 单语句子查询 seq 自增——跨实例原子）；事务④ `txAppendMessage`（消息行 + sessions.updated_at 原子）；仓储函数 6 个：`createSession`（uuid + 缺省 `'新会话'` + 回读）/ `listSessions`（updated_at 倒序）/ `getSession` / `getSessionDetail`（messages seq 升序）/ `listRecentMessages`（DESC 截断取数）/ `appendMessage`。既有 workflows/runs 函数零改动 |
| `apps/server/src/sessions.ts` | 新增 | 0→**176**（≤300 ✓；硬上限 400 ✓） | REQ-0016-02/03：头注硬声明（turn 事件不入 run_events / 不经 guard / 断连不中止 / 内存判活）；常量 6 个（HISTORY_LIMIT=20、SESSION_NODE_ID=0、TEMP=0.7、MAX_TOKENS=2048、DELTA_EMIT_MS=60、PING_MS=15000）；`sessionsById` 注册表（置入唯一入口=chat 步④，删除唯一出口=chat finally）；五 handler：`sessionsCreateHandler`（201）/ `sessionsListHandler`（limit 1-100 校验，runsListHandler 同型）/ `sessionDetailHandler`（404/`{session,messages}`）/ `sessionStopHandler`（注册表 miss 404 / hit abort→200）/ `sessionChatHandler`（SPEC §3.2-5 步骤①-⑬ 全序：①400→②404→③409→④同步闭合→⑤SSE 六头+run:accepted+ping→⑥user 先落库→⑦降级三事件→⑧DESC 取 20 反序组装 ModelMessage[]→⑨node:start+streamText(独立 system 参数)+60ms 节流累积 delta→⑩补发末次+abort 判定（见 §2-1）→⑪node:done(全文/tokens?/firePort:null)+log(ok)+assistant 先落库+run:done→⑫catch 停止/异常双路径→⑬finally 三清）；shutdown 出口 `abortActiveSessions`/`activeSessionCount`（注册表不出模块） |
| `apps/server/src/server.ts` | +22 | 233→**247**（≤260 ✓） | REQ-0016-04/05：import 一处；v1-only 路由注册 5 行（集合路由先于 `:id`，ADR-0005 先例段后）；shutdown 扩展两处——`abortActiveSessions()` 与 run abort 同批 + 日志行字段 `activeSessions`，宽限轮询与 warn 行均扩为 runs+sessions 双计数（SPEC §3.3-3、§5-4 收尾顺序） |
| `tests/smoke/smoke-server.mjs` | +291 | 386→**675**（≤690 ✓） | REQ-0016-06：头注步骤编排 `…K→C`→`…K→G→C` + G 组三实例矩阵说明；import `node:http` + `@agentflow/shared` validateEvent（仅校验器，SPEC §3.4-6 边界例外在案）；模块级 `mockModel`/`mockSrv`/`minimalSrv`；`startMockModel()`（OpenAI 兼容 SSE，MOCK_FULL 三块 ×400ms 延时，逐请求记录 body，断开写失败容忍）；`chatSse()` 本地 helper（lib.mjs 不在白名单，帧解析/waitFor/waitEnd 语义互逆复制）；G01-G10 按 SPEC §6 表逐条（主实例 G01-G04 零模型调用 / mock 实例 G05-G08 / minimal 实例 G09 全密钥空串压制 / G10 离线契约校验）+ `newSession` fail-fast 前置；doCleanup 并入 mock/minimal 实例 kill 与 mock 端点 close（沿 C04 模式，不计断言）；残留纪律：按自建 id 存在性断言，C 组零改动 |

## 2. 与 SPEC 的偏差/定纪录实（1 处行为修正 + 4 处纪实）

1. **【行为修正·G07 首跑 FAIL 的根因】ai@7 abort 后 textStream 优雅终止，不抛
   AbortError**：SPEC §5-2 预测「stop → for-await 抛 AbortError → 步⑫ 停止路径」。
   本机实测（node v24.21.0 + `ai@7`，冒烟首轮 G07 FAIL：`{stop:200, done:{ok:true,
   done:1}, asst:'你好，'}`）——abort 后流迭代**正常退出**（done），已收部分保留在
   acc，落入正常路径收尾（ok:true）。修复：步⑩ 循环出口（补发末次 delta 之后、
   `full = acc` 之前）显式判 `ac.signal.aborted` → 停止路径（acc 落库 +
   `run:done{stopped:true,ok:false,done:0}`）。该判定与 SPEC §3.2 步⑫ 的
   `isAbort(e) || ac.signal.aborted` 同语义（catch 分支保留，覆盖流建立前中止等
   真抛错路径）。修复后 G07 复绿，事件序/落库断言全过——**停止路径语义与 SPEC
   §2.1/§2.3 完全一致，仅触发点从 catch 前移至循环出口**。
2. **`abortActiveSessions()` 调用位置**：SPEC §3.3-3 措辞「②中止段之后追加一行」，
   但同条要求日志行含 `activeSessions: sessionsAborted`——声明必须在 logger 之前。
   实际置于 `const active = …` 之后、`logger.info` 之前（`server.ts:224`）：与 run
   abort 同批、宽限轮询之前，§5-4 收尾顺序语义不变，仅语句位置前移满足字段要求。
3. **store.ts 仓储函数实为 6 个**：SPEC §3.1-6 清单列五个，但 §3.2 步⑧ 要求
   sessions.ts 调用 `listRecentMessages(id, HISTORY_LIMIT)`——按 §3.1-4 语句同名
   导出第六个取数函数（返回 DESC 行，调用方反序），SQL 仍全收敛 store.ts，白名单
   不变。
4. **G06 第二轮请求按末位消息内容查找**：G06 自建会话自带两轮 chat，其第二轮为
   mock `requests[2]`（非 SPEC 示意的数组序号直取）——改为按「末位
   {role:'user',content:'再问'}」查找请求，断言不耦合跨断言的数组索引（断言语义
   不变：第二轮请求含第一轮 user/assistant 历史）。
5. **chatSse waitFor 用 250ms 轮询兜底**：lib.mjs openSse 的 waiters 即时唤醒改为
   轮询（时序断言窗口 ≥400ms，语义等价）——为贴近 SPEC §7 行数预算 690 的压缩项。

## 3. 自检（BUILD 内执行；完整门禁 build/gate/test 与 git 提交由脚本统一执行，未自行运行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| TS 编译 | `npm run build:server` | 通过（tsc 零错误，两轮：初版 + G07 修复后） |
| 冒烟（首轮） | `npm run smoke:server` | **62 passed / 1 failed**——既有全组 + G01-G06 过，G07 FAIL（§2-1 根因）；fail-fast 进清理，C 组过 |
| 冒烟（修复后） | `npm run build:server && npm run smoke:server` | **66 passed / 0 failed**（= 既有 56 断言零回退 + G01-G10 全过） |
| 冒烟（稳定性复跑） | `npm run smoke:server` | **66 passed / 0 failed**（时序敏感断言两轮全绿） |
| 改动面白名单 | `git status --short` + `git diff --stat` | 产品改动恰白名单四处：`server.ts`(+22)/`store.ts`(+96)/`sessions.ts`(新增 176 行)/`smoke-server.mjs`(+291)；`STATE.md` 与 `iterations/0015/` 为进化过程文件（0014 先例，不入产品提交）；`packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、`.github/**` 零触及（AC5「shared 零改动」+ AC6 白名单前置成立） |
| 行数预算 | `wc -l` 四文件 | 351/176/247/675 vs SPEC §7 预算 360/300/260/690，全部达标 |
| gate / test | —（未自行运行） | 由脚本统一执行（派发指令明示）；本轮零前端/shared 改动，gate 为纯回归面 |

## 4. 移交 VERIFY 的要点

- §2-1 的 SDK 行为差异已在本机两轮冒烟实证，VERIFY 的 AC7 反演（摘除落库步⑪/⑫）
  直接按 SPEC §6 末段两轮红绿演练即可；反演时注意步⑩ 的 abort 判定与步⑫ catch
  双入口都会走「停止路径落库」——反演摘除点应覆盖两处之一即可使对应断言 FAIL
  （G05 摘步⑪、G07 摘步⑩/⑫ 任一落库点）。
- 手动 E2E ②（真实密钥流式 + 流中 stop）：本机 .env 已配 DeepSeek（server 日志
  「已连接 DeepSeek」实查），可直接按 SPEC §8 表演练；预期 stop 走步⑩ 分支（优雅
  终止型），`run:done{stopped:true}` 与已累积落库。
- 双实例共享 `data/agentflow.db`：G 组会话行本机累积（每轮 ~6 行），无清理通道，
  SPEC §10 已定案可接受。
