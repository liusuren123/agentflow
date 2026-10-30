# JOURNAL · 迭代 0073 · BK-0018 跨 run 记忆工具组重试轮

> 本文件由各阶段 agent 按序续写（PLAN 留证 → BUILD → VERIFY）；字段契约见
> WORKFLOW.md §2/§4。本节为 PLAN 阶段（product-manager）留证，落盘 2026-10-31 06:39。

## §1 · PLAN 轮选题占位自撞误判与协调者授权清除（留证义务兑现）

**事件链（五轮，2026-10-31 06:13~06:39，全部时间为本机时间；详细五轮记录见
PRD §1.1，此处录裁决要点供工作流侧根治）**：

| 轮次 | 时刻 | 事件 |
| --- | --- | --- |
| R1 | 06:23 | PLAN 选题 BK-0018（全表唯一 ready 项，BACKLOG.md:117）；按 WORKFLOW §4 原子占位 `mkdir .zcode/locks/items/BK-0018`（目录 mtime 06:23）；PRD/STATE 落盘，提交被接受 |
| R2 | 06:2x | 脚本裁定「BK-0018 已被另一并行工作流占位」→ 本 PM 按裁定空转，零写入零改锁 |
| R3 | 06:27~06:33 | 再次全量派发（无占位警告）；四路文件证据复核（锁 mtime=自建时间戳 / 无新工作树 / 无新 feat 分支 / 0068 留档树 clean 零新文件）判定自撞误判 → 重选（提交被接受） |
| R4 | 06:3x | 脚本以同一措辞再否决 → 空转零写入，结果中呈报循环诊断 |
| R5 | 06:39 | **escalate 升级 → 协调者裁决**（要点见下）；执行 `rmdir .zcode/locks/items/BK-0018`（06:39 删除成功，`ls` 亲核目录为空）；重选 BK-0018 |

**协调者裁决要点（R5，两路独立证据）**：

1. ListWorkflowRuns（statuses=["running","pending"]）全账本**恰一条 = 本运行
   dwfrun-ede78ca8（迭代 0073）自身**——不存在任何并行在途工作流；
2. `.zcode/locks/items/BK-0018` mtime 06:23（=2026-10-30T22:23Z）落在本运行窗口
   （22:15:41Z 起）内，与 R1 本 PM 自建时间戳吻合——即 claim-item 校验判定的
   「占位冲突」正是**本运行自己写的占位锁**（自撞误判）。

**根因定性（协调者裁决原文）**：0063 三选题自撞同族——根治提交 2c5b612 未覆盖
「**子代理 shell 写锁 + 脚本侧 claim-item 校验**」路径：PM 按 WORKFLOW §4 用
shell mkdir 占位后，脚本 claim-item 读到同一锁即误判为他路占用。

**处置（经授权）**：删除残留锁（本节 R5）；**不重建锁**——该锁即自撞根因，
重建将复发循环；占位语义由脚本侧接管（WORKFLOW §4 默认「选题后占位」步骤经
协调者明示指令豁免，本行为偏差记录在案）。

**同型案例合并（完整证据链）**：本案与 0068 失败轮残留锁误导 0069~0072 四轮
PLAN 连续禁选 BK-0018 同型（主干 BACKLOG.md:86 记账注 + 主干 HEAD 823a4a2
提交信息「0072 PLAN 误记更正（『BK-0018 并行轮在途』实为 0068 失败轮残留选题锁，
已亲核释放存证）」）——两条案例共同指认同一缺陷族：**锁生命周期与 claim-item
校验的归属判定缺失**，建议工作流侧根治方向：占位锁写入 owner 运行 ID（或 PM
占位改由脚本 claim-item 原子完成、子代理只读），校验时 owner=本运行即放行。

**选题结论（冲突解除后）**：BK-0018 重试轮照常成立——重试范围权威 =
BACKLOG.md:117 行 0068 记账注（MEM 套件断言面修复 + BUG-05 选项 A 期望对齐 +
ADR-0024 §4.1 行为特征补记），成果载体 feat/0068-iter 留档提交 d5ddb27 可
checkout/cherry-pick，产品代码预期零改动；**熔断提示=本项已 1 败（迭代 0068），
本轮再败即「连续 2 次同项 failed」熔断置 stuck 交用户**（WORKFLOW §5.4）。

## §2 · BUILD 轮记录（code-developer，落盘 2026-10-31 06:59）

### §2-1 · 带入方式的事实校正：d5ddb27 不能逐字节整体 restore，须 rebase

PRD §7-A「自留档提交带入（预期逐字节零改动）」的预设被本会话第一手证据证伪：
d5ddb27 基点（父提交 1898113）之后，主干已并轨迭代 0069（BK-0020 ON_ERROR 三
env）/ 0070（BK-0048 OEN 组）/ 0071（BK-0014 MCP_DISCOVERY 两 env）——这些改动
恰落在 d5ddb27 也改过的同批文件上。硬证据：整文件 restore d5ddb27 后
`npm run build:server` tsc 红 3 条（engine.ts:82-84 读 `config.onError/
onErrorRetries/onErrorRetryDelayMs`，而 d5ddb27 版 config.ts 无此三字段——
BK-0020 产品面被静默回退）；`git diff d5ddb27^ 823a4a2 --stat` 逐文件亲核：
tools.ts / ADR-0024 / mcp-stubs.mjs 零变化，.env.example / config.ts / llm.ts /
server.ts / smoke-server.mjs 各 12/63/23/42/424 diff 行。

**据此带入策略（未扩影响面，路径集与 PRD §7 完全一致）**：

- **7 路径逐字节带入**（`git hash-object` 与 `git rev-parse d5ddb27:<path>` 双
  端哈希逐一相等）：memory/{store.ts,tools.ts}（新增文件）、tools.ts、ADR-0024、
  mcp-stubs.mjs（主干自基点零变化 ⇒ d5ddb27 版 = 主干 + 纯 memory/BUG-01 增量）；
- **5 路径 = 主干现版 + 纯 memory 增量手工 rebase**（.env.example +1 / config.ts
  +6 / llm.ts +9 / server.ts +5——与 0068 申报行数逐文件全等；0069/0070/0071
  的 ON_ERROR、MCP_DISCOVERY、OEN 组、discovery-audit 接线零触碰）；
- **smoke-server.mjs = 主干现版 + MEM 组移植**（最终 `git diff` 293+/5−）：头注
  编排 `…KB→MEM→Z→OE→OEN→C`（0068 原位 KB→MEM→Z 与主干 OE/OEN 后插段合并）、
  MEM 组头注块、memSrv 声明、mock 路由 MEM 八路由+`hasTools`（主干 :291 有
  `hasToolMsg` 无 `hasTools`，零重名）、memoryRowsOf/memoryTableExists 两助手
  （ptyAuditsOf 之后、OE 基础设施之前）、cleanup 数组并 memSrv、G05 mock 实例
  MEMORY_ENABLED='' 钉空 + 三行头注、MEM01-07 套件块（161 行整块插于 KB11 后、
  Z 组前）。

### §2-2 · BUG-0068-06 修复：八处标记词补尾冒号（本轮唯一手改语义点）

按 PRD §4.2「共 8 处：mem02×1、mem03×2、mem04×3、mem05×2」枚举实施，mem01 不动、
mock 正则 `memTokOf`（现 :337）零改动。**与 REPORT §6-3 方案文本的一处偏差如实
记录**：d5ddb27 快照实际只有 6 处标记含 `mem:smoke:${memTok}` 域前缀（mem03×2/
mem04×3/mem05 负值）；mem02（`mem02 注入面 ${memTok}`）与 mem05 负键（
`mem05 负键 ${memTok}`）标记本不含域前缀，REPORT 的「把 `mem:smoke:${memTok}`
补尾冒号」字面配方对二者不可套用（REPORT 误记其含域）。本轮按 PRD 八处枚举对
二者补全为 `… mem:smoke:${memTok}:`（域前缀+尾冒号一次到位）——语义中性有据：
mem02 的 mock 路由不消费 memTokOf（落互审 verdict 兜底支），mem05 负键路由用
固定键 `'bad key!'` 亦不取 tok；`memReqOf` 子串过滤与路由 `c.includes('mem0x…')`
均不受影响。最终 `grep -n "wfMem(\`mem0"` 九行在案（mem01 裸 token、其余八处
尾冒号）。

### §2-3 · 自测证据（全部本会话工作树内实跑）

1. `node --check tests/smoke/smoke-server.mjs` → 通过（移植后与八处改后各一次）；
2. `npm run build:server` → tsc 零错误（rebase 后 BK-0020 字段在位）；
3. `npm run smoke:server` 两轮 → **均 exit 0，`==== smoke:server：203 passed /
   0 failed ====`**；第二轮全量日志 grep 在案：**MEM01~MEM07 全 PASS、Z01~Z04
   全 PASS**——MEM03~07 与 Z 组系 0068 两轮 fail-fast 掩盖下首次取得套件内执行
   证据（AC-R1/US-R1 达成）；G05/MEM06 双实例证据行同在；
4. AC-R3 结构执法：`grep -n "memory_" apps/server/src/tools.ts` 恰 TOOL_SPECS
   三行（:160-162）；六文件 `grep -rn "memory" {mcp/inject,agent,engine,
   capabilities,guard,store}.ts` 零命中（exit 1）；
5. AC-R4 禁区：`git diff -- apps/web packages tests/golden .github
   package-lock.json package.json` = 0 字节；porcelain 同域零条目；全程零
   golden 接触、零 gate:update；行数预算 store 115 / tools 82 与 0068 申报一致。

### §2-4 · 遗留给 VERIFY 的口径提示

- AC-R2 三态走查（默认关/开启/abc 的独立端口启动日志计数 + capabilities cmp）
  归 VERIFY 独立执行；BUILD 侧对应证据为套件内 MEM01/MEM02/MEM06/MEM07 PASS
  （同语义面），不替代 AC-R2 本体。
- gate 由脚本统一跑（AC-R5）；若 s3-library 抖动按 PRD §9 风险 2 口径处置。
- 主干 BACKLOG.md:117 的 BK-0018 行与 metrics 记账归 CLOSE；本工作树 STATE 已
  推进 BUILD（过程态）。
