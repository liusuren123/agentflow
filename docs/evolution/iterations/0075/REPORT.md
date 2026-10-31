# REPORT · 迭代 0075 · BK-0064 工具执行异常可观测性（llm.ts execute 包装器异常捕获 emit warn + 触发既有降级直生成轮）

> 验收角色：test-manager（VERIFY 阶段）· 2026-10-31 08:1x~08:3x · 隔离工作树
> `feat/0075-iter`（分支同名）· 验收依据 = `iterations/0075/PRD.md` §5 六条
> Given/When/Then + §4 验收命令口径（skipSpec=true，S 项验收口径内嵌 PRD）
> + JOURNAL §6 移交清单（含反演抽查）。
> **结论：PASS**（REQ-0075-01~06 全过，0 BUG，1 项 Minor 观察 OBS-0075-01，0 修复轮）。

## 一、结论

**PASS**。六条验收标准全部在本工作树内取得第一手运行证据：

1. **负例可观测双路亲证（REQ-0075-01）**：定向探针（临时脚本，OS temp，已清除）
   spawn 工作树 `apps/server/dist/server.js` + 进程内 mock 模型，复刻 MEM05 负例
   （memory_set 非法 key），**14/14 检查全 OK（PROBE_PASS）**——SSE 事件流含
   `lvl:'warn'` 且 msg=`「工具执行异常 memory_set：memory 工具参数错误：key 非法
   （…）」`（固定子串+工具名+错误摘要俱全）；pino stdout 同 run 含
   `{"level":40,"tool":"memory_set","err":"memory 工具参数错误：…","msg":"工具执行异常"}`。
2. **降级直生成轮请求流实证（REQ-0075-02）**：同一探针 run 的请求恰 2 个——
   第 1 携 tools（`["memory_get","memory_set","memory_list"]`）、第 2 **零 tools**
   （降级直生成请求，非日志措辞）；`node:delta` 恰 1 条文本=`负键降级完成`、
   `node:done.out`=`负键降级完成`（不再空串）、`run:done.ok=true` 不崩、事件流零 🔧 行；
   事件类型面 = `run:accepted/run:start/node:start/log×4/node:delta/run:progress/
   node:done/run:done`——**零新增事件类型**。
3. **冒烟全绿零回退（REQ-0075-04）**：`npm run smoke:server` 两轮独立实跑均
   exit 0、`==== smoke:server：203 passed / 0 failed ====`（= 0074 主干复测基线
   203/0 零回退），第二轮取证 **MEM05 PASS 行**（新形态锚定断言全命中，见 §二 R4）。
4. **反演抽查复红复绿（JOURNAL §6 移交项）**：摘除包装器 catch → `build:server`
   重建 → 全量冒烟 **MEM05 复红**（actual=`reqK:3,outK:"",warnK:false`——恰 0075
   前静默回灌形态）且仅 MEM05 域失败；原样还原（Edit 逆操作）→ 机器证明复跑
   numstat 与禁区与改前逐位一致 → 重建 → 复绿 `203 passed / 0 failed`。
   反演红 = 实现因果性证明：MEM05 新断言确实锚定在本轮改动上。
5. **改动面机器证明（REQ-0075-05①②）**：product 面 `git status --porcelain`
   恰 §4 三文件（llm.ts / smoke-server.mjs / ADR-0024）+ 机制件（BACKLOG /
   STATE / iterations/0075/ 未跟踪目录）；禁区
   `git diff -- packages/shared apps/web tools/pixel-gate tests/golden .github
   package.json package-lock.json` **恒空**（反演还原后复跑仍空）——零 shared/
   零前端/零 pixel-gate/零 golden/零 CI/零依赖。
6. **ADR-0024 反写注在位（REQ-0075-06）**：§4.1 0068 补记原文（:182-187）逐字
   保留，其后追加 0075 反写注（:188-192），文中不再支持「静默回灌仍是现状」误读。

无 BUG-0075-xx 缺陷。一项 Minor 观察（OBS-0075-01）如实记录于 §四，不构成立项点、
不阻塞收口。

## 二、逐条验收证据（命令均在本工作树根实跑，2026-10-31）

### REQ-0075-01 · 负例可观测——warn 双路可见 —— PASS

方法：临时探针 `verify-0075-probe.mjs`（写 OS temp、不落仓；import 工作树
`tests/smoke/lib.mjs` 的 `startServer/openSse/getFreePort`，与冒烟同款 spawn 形态；
mock 模型为进程内 http server，路由与 smoke `startMockModel` MEM05 支逐字同形）。
环境：`AI_BASE_URL` 指 mock、`MEMORY_ENABLED=1`、`MCP_HTTP_SERVERS=''`、
`MCP_STDIO_SERVERS=''`。命令：`node verify-0075-probe.mjs` → **`PROBE_PASS`（exit 0）**。

- **SSE 路**：`log` 事件 `lvl:'warn'`、msg 原文：
  `工具执行异常 memory_set：memory 工具参数错误：key 非法（只允许 1-128 字符，
  字母数字起头，字符集 A-Za-z0-9 与 ._:/-；不含空白/控制字符）`——固定子串
  「工具执行异常」+ 工具名 + `preview(err,120)` 摘要三要素俱全。
- **pino 路**：`srv.log.tail()`（startServer stdout 环形缓冲）命中 JSON 行
  `level=40`（pino warn）、`tool="memory_set"`、`err=错误全文`、`msg="工具执行异常"`
  （llm.ts:78）。冒烟 MEM05 断言子串 `includes('工具执行异常')`（smoke-server.mjs:2634-2635）
  与 llm.ts:79/106 模板串字面一致（`grep -c "工具执行异常"` llm.ts=5 / smoke=6）。
- 冒烟面：MEM05 PASS 行（第二轮绿跑取证，§二 R4）含同断言。

### REQ-0075-02 · 降级直生成轮发生 —— PASS

同一探针 run 的机器证据：

| 断言 | 结果 | 证据 |
| --- | --- | --- |
| 请求流恰 2（第 1 携 tools、第 2 无 tools） | OK | `reqTools=[[memory_get,memory_set,memory_list],[]]`（mock 实收请求体 tools 键集） |
| 降级 warn 行（与既有 catch 降级同形态措辞） | OK | `工具执行异常（memory 工具参数错误：…），降级为直接生成` |
| node:delta 按工具循环分支形态恰 1 条 | OK | `deltaText="负键降级完成"`，事件类型序列无纯流式打字机多 delta |
| out 为降级轮直生成文本（不再空串） | OK | `node:done.out="负键降级完成"` |
| run ok:true 不崩（AC5 安全核保持） | OK | `runOk=true` |
| 零 🔧 工具调用行（异常先于正常 emit，既有语义保持） | OK | `zeroWrench=true` |
| 零新增事件类型 | OK | eventTypes 仅既有 8 种 |

冒烟面同证：MEM05 断言 `reqsK.length===2 && memToolsOf(reqsK[0]).length>0 &&
memToolsOf(reqsK[1]).length===0 && outK.includes('负键降级完成')`（smoke-server.mjs:2643-2651）绿。

### REQ-0075-03 · abort 不吞 —— PASS（代码路径 + 既有面零回退）

- **代码路径核对**（本轮 Read 亲读）：包装器捕获后第一判即 abort 透传——
  `apps/server/src/llm.ts:76` `if(isAbort(e) || ctx.ac.signal.aborted) throw e;`
  （先于 toolErr 置位/warn/标记返回，:77-80）；降级 fallback 携
  `abortSignal: ctx.ac.signal`（:107）；既有外层 catch abort 透传原样保留（:112）。
- **既有 abort/停止面零回退**：两轮绿跑 203/0 零 FAIL（fail-fast 语义下任何一项
  红即中止全量），涵盖 A04 停止透传（smoke-server.mjs:1420 起，stop→
  `run:done{ok:false,stopped:true}`+`node:error 已中止`）、OE06 stop 窗、V 组互审
  停止面——PRD 本条 Then 即「既有面零回退」，兑现。
- 如实声明：未单独构造「execute 执行中途 abort」专属探针（现网工具 impl 无慢
  throw 形态、无既有挂点）；以上代码路径 + 既有面绿为 PRD 口径内的完整验证。

### REQ-0075-04 · 正例零回归 —— PASS

命令：`npm run smoke:server`（工作树根，两轮独立实跑）。

- 第一轮：`SMOKE_EXIT=0`，`==== smoke:server：203 passed / 0 failed ====`
  （=0073/0074 基线 203/0 零回退；MEM01~MEM07/M02/G/A/OE/OEN/V/Z/C 全套件在内）。
- 第二轮（反演还原后重建再跑）：`SMOKE_RESTORED_EXIT=0`，`203 passed / 0 failed`，
  `grep -E "^FAIL"` 零命中；**MEM05 PASS 行取证**（`^PASS MEM05 负例可观测（迭代
  0075 / BK-0064 改写后形态）…` 全行在案）——stub warn 形态、🔧 行、🧠 注入、
  capabilities 零污染（MEM06）、env fail-fast（MEM07）全部原样绿。

### REQ-0075-05 · 改动面机器证明 + 门禁 —— PASS

- **① product 面恰 §4 三文件**：`git status --porcelain` →
  ` M apps/server/src/llm.ts`、` M docs/adr/0024-memory-tools-crossrun.md`、
  ` M tests/smoke/smoke-server.mjs`（product）+ ` M docs/evolution/BACKLOG.md`、
  ` M docs/evolution/STATE.md`、`?? docs/evolution/iterations/0075/`（机制件，
  PRD §4 明载不入 productFiles）。`git diff --numstat`：llm.ts +18/−1（138→155）·
  smoke +32/−17（3029→3044）· ADR +5/−0（348→353）——与 JOURNAL §4 申报逐位一致
  （ADR +5 超 +2~4 预算 1 行，BUILD 已如实披露、语义零反转，VERIFY 判可接受：
  反写注须载明机制与收口指针）。
- **② 禁区恒空**：`git diff -- packages/shared apps/web tools/pixel-gate
  tests/golden .github package.json package-lock.json` → 空输出
  （FORBIDDEN_ZONE_EMPTY_OK；反演还原后复跑 FORBIDDEN_ZONE_STILL_EMPTY）。
- **③ 门禁**：`npm run build` + `npm run gate` + `npm test` 由脚本在本工作树内
  运行且通过（**派发指令既给事实，本轮未重跑全套**，遵派发指令；旁证：反演前
  亲核 `apps/server/dist/llm.js` mtime 08:23 ≥ `src/llm.ts` 08:15——脚本构建覆盖
  实现版本；web/shared 全程零改动由禁区证明兜底，gate 客观面不可能被本轮影响；
  全程零 `gate:update`——tests/golden 在禁区恒空内）。
  `npm run smoke:server` 由 VERIFY 两轮亲跑全绿（§二 R4）——本轮验收主命令。

### REQ-0075-06 · ADR-0024 §4.1 反写注 —— PASS

工作树 `docs/adr/0024-memory-tools-crossrun.md` 本轮亲读（:178-192）：0068 补记
原文（:182-187，含「留 backlog 另议，不在本定界射程内修正」）逐字保留；其后再加
`【0075 反写注 · BK-0064 已落地】`块（:188-192）——载明 execute 包装器捕获（abort
除外）、pino+SSE 双路 warn「工具执行异常」、触发既有降级直生成轮、静默回灌不再
是可观测终态、0068 原文保留作历史、「留 backlog 另议」所指即 BK-0064 现已收口。
纯追加 5 行（`git diff --numstat` = +5/−0），ADR 历史不重写纪律兑现。

## 三、反演抽查（JOURNAL §6 移交项 · PRD §7 预案）—— 复红复绿成立

1. **摘除**：Edit 将 llm.ts:72-81 包装器 try/catch 整块替换为
   `const res = await impl(a || {})`（= 0075 前静默回灌形态；toolErr 恒 null →
   无 break、无降级、无 warn）。
2. **复红**：`npm run build:server` ✓ → `npm run smoke:server` →
   `SMOKE_INVERTED_EXIT=1`，`167 passed / 1 failed`——**唯一 FAIL = MEM05**，
   actual=`{"warnK":false,"warnV":false,"degradeK":false,"degradeV":false,
   "reqK":3,"reqV":3,"kTools":[3,3],"vTools":[3,3],"outK":"","outV":"",…}`
   （恰 0075 前 3 轮预算耗尽/空文本/零 warn 形态；167=203−MEM05 fail-fast 跳过面，
   MEM05 之前全部套件仍绿）。
3. **还原**：Edit 精确逆操作 → 机器证明复跑：numstat 与改前逐位一致（llm.ts
   +18/−1 等）、禁区恒空、`grep -c "工具执行异常"` llm.ts=5（与改前同）→
   `npm run build:server` ✓（REBUILD_RESTORED_OK）。
4. **复绿**：`npm run smoke:server` → `SMOKE_RESTORED_EXIT=0`，`203 passed / 0 failed`。

反演红→还原绿证明 MEM05 新断言确实锚定在本轮改动上，非环境巧合。

## 四、交互回归抽查与观察项

- **前端交互面**：本轮零前端（禁区恒空机器证明）+ gate 由脚本全绿（既给事实）
  ——UI 三层冻结无接触面，交互回归清单（拖拽/缩放/框选/连线/滚轮门控/数字步进/
  快捷键/审批弹窗/撤销重做/导入导出/多标签/节点库收藏）无一处于改动因果链。
- **后端交互面（SSE 契约消费者）**：两轮绿跑 203/0 覆盖——流式会话（G 组）、
  停止透传（A04/OE06）、on-error 重试/跳过/中止（OE01-08/OEN01-07，第一轮输出
  亲见 OEN01~OEN07 PASS 行）、互审协议（V 组）、记忆工具交互（MEM01-07）、
  持久化清理（C01-C04）；探针事件流零新增事件类型（§二 R2）。
- **OBS-0075-01（Minor，不阻塞）**：同一 generateText 轮内模型并行请求多个工具
  且多个 impl 皆 throw 时，`toolErr` 被**最后一次**异常覆写（llm.ts:77 直接赋值），
  降级 warn 行（:106）携带的是最后一条错误摘要——llm.ts:59 注释自述「本轮首个
  工具执行异常摘要」措辞与实际「末次覆写」不符。可观测性本体无损（每个异常各自
  emit warn 一行，:78-79；降级照常触发），PRD REQ-0075-01/02 无一违反。建议留
  治理日顺手处置（改注释措辞或改为首见不覆写），不立项不回修。

## 五、验收命令清单（全部在本工作树根实跑）

| # | 命令 | 结果 |
| --- | --- | --- |
| 1 | `git status --porcelain` / `git diff --numstat` | product 恰三文件 + 机制件；numstat 与 JOURNAL 逐位一致 |
| 2 | `git diff -- packages/shared apps/web tools/pixel-gate tests/golden .github package.json package-lock.json` | 恒空 ×2（改前 + 反演还原后） |
| 3 | `grep -c "工具执行异常" apps/server/src/llm.ts tests/smoke/smoke-server.mjs` | 5 / 6；断言子串与模板串字面一致（风险 2 对账） |
| 4 | `npm run smoke:server`（第一轮） | exit 0，`203 passed / 0 failed` |
| 5 | `node <OS-temp>/verify-0075-probe.mjs` | `PROBE_PASS`（14/14，SSE+pino 双路 + 请求流降级实证；临时脚本已清除） |
| 6 | `npm run build:server` + `npm run smoke:server`（反演态） | 重建 ✓；`167 passed / 1 failed`，唯一 FAIL=MEM05 |
| 7 | 还原 + `npm run build:server` + `npm run smoke:server`（复绿态） | 机器证明逐位复原 ✓；exit 0，`203 passed / 0 failed`，MEM05 PASS 行取证 |
| 8 | `npm run build` / `npm run gate` / `npm test` | 脚本在工作树内已运行且通过（派发指令既给事实；本轮未重跑，理由见 §二 R5③） |

## 六、移交 CLOSE

- 零 BUG、零修复轮（repair_round 维持 0）；OBS-0075-01 Minor 留治理日，不立项。
- 工作树最终态：改动面与 §二 R5① 清单一致，无反演残留（numstat/禁区/子串计数
  三路复原证明）；`data/` 不入库（.gitignore:17），冒烟/探针的本地库副作用零入库面。
- 来源非 issue，无回执义务；issue#16/#12 维持待批准不动（PRD §7 口径）。
- BK-0064 终态记账（ready→done）归 CLOSE 依本 REPORT 回写主干；本工作树
  STATE.md phase 已由 VERIFY 轮置为 `VERIFY`（过程态，不随分支合入主干）。
