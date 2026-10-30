# REPORT · 迭代 0073 · BK-0018 跨 run 记忆工具组（memory.get/set/list）重试轮

> 验收角色：test-manager（VERIFY 阶段）· 2026-10-31 · 隔离工作树
> `feat/0073-iter`（分支同名，HEAD 基点 823a4a2）· 验收依据 = PRD §6/§7/§8
>（skipSpec 内嵌验收口径）+ ADR-0024 + iterations/0068/REPORT.md。
> **结论：PASS**（AC-R1~R6 全过，0 新增 BUG，0 修复轮）。

## 一、结论

**PASS**。BK-0018 重试轮的交付物——「验收载体的正确性」与「全套件内执行证据」——
在本工作树内取得第一手机器证据：

1. **冒烟全绿（AC-R1 核心）**：`npm run smoke:server` 两轮独立实跑均 exit 0、
   `==== smoke:server：203 passed / 0 failed ====`；**MEM01~MEM07 与 Z01~Z04
   全部首次取得套件内 PASS 行**（0068 两轮 fail-fast 掩盖下的未竟补证面就此闭环）；
   M02 白名单式断言 PASS。
2. **产品行为三态走查（AC-R2）独立复证 12/12 OK**：默认关零 memory 行 + 干净库
   零建表；开启恰一条就绪行 + 建表；capabilities 两态 **IDENTICAL-BYTES（1651
   字节逐相等）** 且 grep memory 零命中；abc 态 exit=1 fatal problems 含
   MEMORY_ENABLED 与合法词形提示。
3. **产品代码零改动申报机器核验成立**：5 路径与留档提交 d5ddb27 `git hash-object`
   逐字节一致；rebase 4 路径纯 memory 增量（+1/+6/+9/+5，零删除行、零夹带）；
   本轮唯一手改 = smoke-server.mjs 八处标记词补尾冒号（亲核 9 行标记词形态）。
4. **禁区证明（AC-R4）**：`git diff` 禁区五路径 0 字节、porcelain 同域 0、
   tests/golden 零接触、全程零 `gate:update`。

无 BUG-0073-xx 缺陷。两项过程级观察（OBS-001/OBS-002）如实记录于 §四，均不构成立项点。

## 二、逐条验收证据（命令均在本工作树根实跑，2026-10-31）

### AC-R1 · 冒烟全绿 —— PASS

命令：`npm run smoke:server`（两轮独立实跑，第二轮全量日志留 /tmp 取证后清除）。

- 第一轮：`SMOKE_EXIT=0`，尾部 `==== smoke:server：203 passed / 0 failed ====`。
- 第二轮：`EXIT=0`，`203 passed / 0 failed`；`grep -E "^PASS (MEM|Z)"` 全量日志取证：
  - **MEM01**（默认关零强制漂移）、**MEM02**（注入面 tools 键集恰
    `[memory_get,memory_list,memory_set]` + 🧠 注入 log + 门控建表）、**MEM03**
    （跨 run 写读回读 + SQLite 直查五行对账）、**MEM04**（list 三页 + truncated
    公式 + prefix 过滤 + BINARY 升序直查）、**MEM05**（负例不崩 run，AI SDK 7
    error tool-result 语义锚定，零落库）、**MEM06**（capabilities CAP_EXPECTED_BUILTIN
    deepEqual）、**MEM07**（abc fail-fast exit=1）——7/7 PASS；
  - **Z01~Z04**（挂起采样/SIGKILL 重启/stopped 语义保持/DELETE 零残留）——4/4 PASS；
  - `grep -cE "^FAIL"` = **0**。
- **M02 白名单式断言 PASS**（套件内原行）：`TOOL_SPECS 点前缀键集恰为冻结 12 键
  且 plain key 恰 memory_* 白名单三条…且 IMPL 键集恰为 5 服务器`。

### AC-R2 · 产品行为复证（三态走查）—— PASS（12/12 OK）

VERIFY 独立执行（不消费 BUILD 侧同语义证据，JOURNAL §2-4 口径兑现）。方法：
临时脚本（/tmp，已清除）spawn 工作树 `apps/server/dist/server.js`（与
tests/smoke/lib.mjs startServer 同款 spawn 形态），独立端口 3971/3972/3973；
因主库 `data/agentflow.db` 已被冒烟 MEM02 建表，采用**备份-移走-恢复法**在干净库
复验默认关不建表（data/ 不入库、冒烟 C03 已证零残留，影响面仅本地测试数据；
恢复后 `data/agentflow.db` size=491520 在位）。逐项输出：

| # | 断言 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | 主库备份移走 | OK | moved=db/-wal/-shm 三件 |
| 2 | 默认关·启动日志零 memory 行 | OK | `/memory/i` 命中 0 行 |
| 3 | 默认关·干净库无 memory_entries 表 | OK | sqlite_master 命中=0（全新库 12 张既有表：approval_audits…workflows，无 memory_entries） |
| 4 | 默认关·capabilities 抓取 | OK | HTTP 200，1651 bytes |
| 5 | 开启·日志恰一条 memory 就绪行 | OK | 恰 1 行 pino `msg:"memory 跨 run 记忆存储已就绪"`（store.ts:54 文本） |
| 6 | 开启·memory_entries 表在库 | OK | sqlite_master 命中=1 |
| 7 | 开启·capabilities 抓取 | OK | HTTP 200，1651 bytes |
| 8 | capabilities 两态逐字节 cmp | OK | **IDENTICAL-BYTES (1651 bytes)** |
| 9 | 默认关·capabilities grep memory | OK | 命中=0 |
| 10 | abc·spawn exit | OK | exit=1 |
| 11 | abc·fatal 含 MEMORY_ENABLED | OK | fatal(level=60) problems=`["MEMORY_ENABLED=\"abc\"：只接受 1/true/yes 或 0/false/no"]` |
| 12 | 主库恢复 | OK | data/agentflow.db 在位 size=491520 |

汇总行：`==== AC-R2 walkup: 12 ok / 0 failed ====`。

### AC-R3 · 结构执法复跑 —— PASS

- `grep -n "memory_" apps/server/src/tools.ts` → **恰 3 行**（:160 memory_get /
  :161 memory_set / :162 memory_list，即 TOOL_SPECS 三行），exit=0；
- `grep -rn "memory" apps/server/src/{mcp/inject.ts,agent.ts,engine.ts,capabilities.ts,guard.ts,store.ts}` → **零命中，exit=1**。

### AC-R4 · 禁区机器证明复跑 —— PASS

- `git diff -- apps/web packages tests/golden .github package-lock.json package.json | wc -c` → **0**；
- `git status --porcelain -- <同域>` → **0 字节**；
- `git status --porcelain -- tests/golden` → **0 字节**（零 golden 接触）；全程零
  `gate:update`（本 VERIFY 未运行该命令，porcelain 亦无任何 golden 产物）；
- 行数预算：`wc -l` → **store.ts=115 / tools.ts=82**，与 0068 JOURNAL §1 申报一致；
- porcelain 全量清单与 PRD §7 白名单逐路径吻合、**无清单外文件**（9 修改 + 3 未跟踪，
  详见 §三 AC-R6）。

### AC-R5 · 门禁四件套 —— PASS（口径如实）

- `npm run build` / `npm run gate` / `npm test`：**由脚本在工作树内执行且通过**
 （派发指令明示；本 VERIFY 按指令未重复跑全套）。旁证：工作树 `apps/web/dist/index.html`
 在位、`apps/server/dist/*.js` 编译产物 mtime=2026-10-31 07:04（本轮工作树内新构建，
 含 `apps/server/dist/memory/{store,tools}.js` 与 `dist/server.js`）——三态走查
 （AC-R2）与冒烟两轮（AC-R1）均实际消费该产物并全绿，构成「构建产物可运行」的
 独立证明。
- 工作树内冒烟（四件套之四）：AC-R1 两轮 exit 0（本轮独立实跑，非转引）。
- s3-library 抖动处置通道未触发（脚本门禁一次通过，无 diffPx=21~23 事件）；
  本轮零 `gate:update`。

### AC-R6 · 提交面与机制件 —— PASS（提交前核验；双提交本体按 §4 时序待 VERIFY 后执行）

- **时点如实声明**：WORKFLOW §4 时序为 VERIFY → 特性分支双提交 → MERGE，故双提交
  本体检验在 VERIFY 通过后由协调者执行；本轮核验「提交前改动面 = 白名单」这一
  提交面的全部前置事实。
- **产品面（PRD §7-A + §7-B）逐项核验**：
  - 5 路径与留档提交 `d5ddb27`（=d5ddb2793a0c…，`git rev-parse` 可解析）逐字节
    一致：`git hash-object <file>` == `git rev-parse d5ddb27:<path>`，IDENT：
    memory/store.ts、memory/tools.ts、tools.ts、ADR-0024、mcp-stubs.mjs；
  - rebase 4 路径 diffstat：.env.example **+1** / config.ts **+6** / llm.ts **+9** /
    server.ts **+5**（与 0068 申报行数逐文件全等）；diff 内容逐行亲核全为 memory
    语义增量（env 注释/白名单/zod fail-fast/映射/注入点/接线/停机），**零删除行、
    零夹带**；
  - smoke-server.mjs（§7-B 本轮唯一手改载体）：diffstat **293+/5−**（与 JOURNAL §2-1
    申报一致）；**BUG-0068-06 八处标记词亲核**：`grep -n 'wfMem(`mem0'` 恰 9 行——
    mem01（:2549）裸 token 不含域（PRD §4.2「不受影响」），其余 8 处均为
    ``mem:smoke:${memTok}:`` 尾冒号形态（mem02×1 :2575 / mem03×2 :2588,:2592 /
    mem04×3 :2605,:2607,:2613 / mem05×2 :2627,:2628），与 PRD §4.2 枚举逐处吻合；
    mock 正则 `memTokOf` = `/mem:smoke:([a-z0-9]+):/` 在 :337 **零改动**（PRD 所记
    :285 为 0068 版行号，rebase 后漂移，内容一致）。
- **机制件（§7-C）在位**：`iterations/0073/{PRD,JOURNAL}` + 本 REPORT；
  `iterations/0068/{PRD,JOURNAL,REPORT,evidence/gate-first-run.log}` 四件归档带入
  （ls 亲核，evidence 文件 3650 bytes）；STATE.md 过程态改动 +5/−5 随机制件；
  BACKLOG.md 工作树内无过程改动（BACKLOG 终态记账按 v3 记账位置归主干 CLOSE 侧，
  工作树过程态可无改动，不构成缺失）。

## 三、交互回归抽查 —— PASS（触UI=否证明面）

本迭代触UI=否、前端零改动。抽查面与结论：

1. **前端零触碰机器证明**：AC-R4 禁区 diff 0 字节（apps/web/packages/golden 全域）
   ——渲染路径不存在改动面，交互回归的前置条件（gate 全绿）由脚本门禁承载；
2. **后端 API/SSE 交互面**：冒烟 203 断言含 SSE 事件流契约（validateEvent 全组）、
   审批挂起/恢复、run 停止、workflows/runs 持久化端点 CRUD（Z01~Z04 重启语义组
   全 PASS）——覆盖 test-manager 职责清单中的后端交互语义面；
3. **补充抽查**：默认关实例 `GET /api/v1/health` → 200 `ok:true`（engine/node/provider
   元数据正常）、`GET /api/v1/models` → 200 结构完整（DeepSeek 端点、模型数组）。

## 四、缺陷与观察

**BUG 清单：无（0 新增，0 修复轮）。**

- **OBS-001（方法学记录，非缺陷）**：AC-R2 子断言「主库无 memory_entries 表」在
  冒烟后的共享主库上不可直接复验（MEM02 开启实例已建表）；本次以备份-移走-恢复法
  在干净库复验默认关「不建表不连接」，语义与 PRD 意图一致。默认关对**已有表**库的
  零写入行为由套件 MEM01 直查断言独立覆盖（PASS 在案）。
- **OBS-002（BUILD 侧申报复核，非缺陷）**：BUG-0068-06 的 8 处标记词中 2 处
  （mem02 注入面、mem05 负键）在 d5ddb27 原文本不含 `mem:smoke:${memTok}` 域前缀，
  与 0068 REPORT §6-3 方案文本的字面配方存在偏差（JOURNAL §2-2 已申报）；本次
  VERIFY 亲核 9 行标记词，8 处均呈 `mem:smoke:${memTok}:` 完整形态，且 MEM01~07
  全 PASS 实证该改写语义中性（mem02 mock 路由落互审兜底支、mem05 负键路由用固定
  键，均不消费 token 域）。偏差记录完整，无需处置。

## 五、验收台账

| 验收项 | 结果 | 证据锚点 |
| --- | --- | --- |
| AC-R1 冒烟全绿 | PASS | 两轮 exit 0 / 203 passed 0 failed / MEM·Z 组 PASS 行 / M02 PASS |
| AC-R2 三态走查 | PASS | 12/12 OK，IDENTICAL-BYTES 1651B，abc exit=1 fatal problems |
| AC-R3 结构执法 | PASS | tools.ts 恰 3 行；六文件 exit=1 |
| AC-R4 禁区证明 | PASS | diff 0 字节；porcelain 0；store 115/tools 82 |
| AC-R5 门禁四件套 | PASS | 脚本门禁通过（指令明示+产物旁证）；冒烟 VERIFY 独立两轮 exit 0 |
| AC-R6 提交面/机制件 | PASS（提交前核验） | hash=d5ddb27 五路径；rebase 行数全等；八处标记词；0068 四件归档 |

**VERIFY 修复轮次：0。建议：进入特性分支双提交（产品提交白名单 = PRD §7-A/§7-B
共 10 路径；机制件提交 = §7-C），随后合并仲裁。**
