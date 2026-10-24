# REPORT · 迭代 0026 · BK-0008 sqlite MCP 工具真实接入（VERIFY 阶段验收报告）

> 产出角色：test-manager · 2026-10-25 03:25~03:36（VERIFY 轮，标注「亲跑」的证据均为本会话执行）
> 输入：`iterations/0026/PRD.md`（AC1-AC7 / REQ-0026-01…05）+ `iterations/0026/SPEC.md`
> （§3 三段式 / §4.1 联动 / §4.2 M12-M17 / §9 验收口径）+ `iterations/0026/JOURNAL.md`
> （BUILD 自检、两处 SPEC 桌面设计微调记录、写探针结论）。
> 环境：Windows 10 26300 / Git Bash / Node v24.21.0（本机；golden/gate 权威在 CI
> windows-latest，本机结果按 AGENTS.md 口径仅参考——本轮纯后端回归面）。
> 派发指令注记：`npm run build` / `npm run gate` / `npm test` 已由工作流脚本统一
> 运行且通过，按指令不重复全套；VERIFY 亲跑面 = smoke:server 全量（两轮）+ AC4
> 反演红绿双向 + AC7 指针抽样 + SPEC §9.2 手动 E2E 点位（16 判据）+ git 机器核对。

## 结论

**PASS（0 BUG）**。AC1-AC7 全部通过：冒烟亲跑 **95 passed / 0 failed，exit 0**
（恰 PRD 预期 89+6=95；M01-M07 口径联动后全绿 + M12-M17 新增 6 条全绿 +
M08-M11 llm.ts 源锁原样绿）；AC4 反演红绿双向闭环（红侧 exit 1、M12-M17 全
FAIL → 逐字还原零残留 → 复绿 95/0 exit 0）；手动 E2E 点位 16/16 通过（真实
server HTTP/SSE 全链，mock 模型编排工具循环，沿 0025 先例方法）；git 白名单/
保护面/行数预算机器核对全过。产品提交恰一个（Conventional Commits）归 CLOSE
阶段脚本执行（0025 同款时点口径），提交不变式的可验部分以工作区 diff 口径
亲证如下。

## 1. SPEC §9.1 命令组执行记录

| # | 命令 | 执行方 | 结果 |
| --- | --- | --- | --- |
| 1 | `npm run build`（shared+web） | 工作流脚本（派发指令声明通过） | VERIFY 未复跑（按指令不重复全套）；间接证据：本轮 smoke/E2E 均以现行 dist 产物运行全绿 |
| 2 | `npm run build:server` | **VERIFY 亲跑 ×3**（反演红/绿两侧各一次 + E2E 前刷新一次） | 3 次 exit 0（tsc 零错误；反演红侧改回 null 后同样编译通过——IMPL 槽位类型 `Record<…>\|null` 两态合法） |
| 3 | `npm run gate`（8 场景 diffPx=0） | 工作流脚本（声明通过）；VERIFY 未复跑 | AC6 gate 面以「保护路径 diff 恒空」（§2 亲证）+ 脚本声明承载；权威在 CI `ui-constitution` |
| 4 | `npm test`（shared 契约） | 工作流脚本（声明通过）；VERIFY 未复跑 | shared 零改动（diff 恒空亲证），契约测试无回退面 |
| 5 | `npm run smoke:server` | **VERIFY 亲跑 ×2**（反演前后各一轮） | 第 1 轮 **95 passed / 0 failed，exit 0**；第 2 轮（反演还原后）**95 passed / 0 failed，exit 0**——恰 PRD AC6 预期 95（89+6） |
| 6 | AC7 指针抽样 | **VERIFY 亲核** | 6/6 一致（§5） |

M 组逐条结果（第 1 轮亲跑日志）：M01 在位、M02 键集、M03 三未实现项（browser×3）
3/3 含前缀、M04 九已实现项 9/9 无前缀（含 sqlite.query/execute）、M05 三未实现项
3/3 如实载荷、M06 九已实现项 9/9 真实函数、M07 5/5 组三向一致、**M12-M17 全
PASS**、M08-M11 源锁 4/4 命中。

## 2. git 机器核对（AC5/AC6；产品提交时点注记）

**时点说明**：VERIFY 轮产品提交尚未发生（HEAD = 8768b2c 归档迭代 0025，改动仍在
工作区）。「产品提交恰一个 + `git show --numstat` 恰两路径」归 CLOSE 阶段脚本
执行（0025 REPORT 同款口径）；提交不变式的可验部分以下列工作区 diff 口径亲证。

| 核对 | 命令（亲跑） | 结果 |
| --- | --- | --- |
| 白名单 | `git status --porcelain` | 恰 `M apps/server/src/tools.ts` + `M tests/smoke/mcp-stubs.mjs` + 机制件（`M docs/evolution/STATE.md` + `?? docs/evolution/iterations/0026/`）；**白名单外零出现**（llm.ts / smoke-server.mjs / mcp/* / store.ts / lock 零触碰） |
| UI/契约/依赖保护面恒空 | `git diff -- packages/shared apps/web tools/pixel-gate .github tests/golden package.json package-lock.json` | **输出为空，exit 0**（AC5「零依赖机器证明」+ 宪法 UI 三层无涉的机器证据；交互回归抽查见 §6） |
| diff 规模 | `git diff --stat` | tools.ts +62、mcp-stubs.mjs +137/-33（连同 STATE 共 3 文件）——与 §5 受影响文件清单两路径一致 |
| 行数预算 | `wc -l` | tools.ts **175**（≤190 ✓）/ mcp-stubs.mjs **218**（≤260 ✓；JOURNAL 记 216 与实得 218 差 2 行，为 §3.2 一致性小改的统计时点差，预算判据满足） |
| 沙箱副产 | `ls apps/server/sandbox/` + `git check-ignore` | 仅 `mcp-sqlite.db`，被 `.gitignore` 覆盖（check-ignore exit 0）——gitignored 运行产物，不污染提交（SPEC §10） |
| 探针残留 | E2E-2f / M17 断言 | 仓库根无 `mcp-*-probe.db`；`data/` 仅 agentflow.db(+wal/shm/log)——server 正常运行产物，无 ATTACH/VACUUM 副产 |

## 3. AC 逐条验收（PRD §验收标准）

### AC1 · 真实往返与限幅（M12-M14）—— PASS

- M12（冒烟亲跑）：execute 多语句（幂等 DROP+建表+2 插入）载荷 deepEqual
  `{changes:2,lastInsertRowid:2}`，无 `not implemented`。JOURNAL §3.1 微调 2
  （DROP 并入 M12 载荷幂等化）经核对在 `mcp-stubs.mjs:137` 落地，DROP 不计
  changes、期望值 2 不变——等价范围内，裁定接受。
- M13：query 往返 `{rows:[{id:'1',name:'alice'},{id:'2',name:'bob'}],truncated:false}`
  （整数列文本化）。M14：CTE 插入 105 行 changes=105 → 全表 rows=100、
  truncated=true；600 字符单元格 === `'x'.repeat(512)+'…'`。JOURNAL §3.1 微调 1
  （CTE id 落 2001..2105 段避开 UNIQUE 撞车）在 `mcp-stubs.mjs:151` 落地，
  changes=105 与 M16 `DELETE name='n7'` 定命性不变——等价范围内，裁定接受。
- E2E-1 全链（§4）补强：真实 server/SSE 下 🔧 sqlite.execute/query 均 sys 色、
  载荷真实（`{"changes":1,…}` / `{"rows":[{"id":"1","v":"hello-sqlite"}]}`）、
  模型次轮可见真实行集（mock 第 3 请求 messages 含 hello-sqlite tool-result）。

### AC2 · 越界拒绝与沙箱锚定（M15/M17）—— PASS

- M15（亲跑）：六探针（ATTACH 绝对路径 / ATTACH data/agentflow.db / 注释+小写
  attach / VACUUM INTO 沙箱外 / PRAGMA temp_store_directory / load_extension）
  逐条 throw 且消息含「沙箱」；反例护栏 `VALUES('vacuum_log 备忘')` 成功
  （词边界不误伤）。
- M17：探针文件不存在、`data/agentflow.db` 存在性与段首快照一致、DROP 后
  sqlite_master 计数 `{rows:[{c:'0'}]}`、卫生兜底清理。
- 源码级核对（Read 亲核 `tools.ts:33-54`）：`SQLITE_DB` 仅由 `SANDBOX` 常量
  派生（源码零主库/用户路径字面量）；黑名单正则
  `/\b(attach|detach|pragma|vacuum)\b/i` + `/\bload_extension\s*\(/i` 与 SPEC
  §3.2 逐字一致；错误消息含「沙箱」且对齐 safePath 风格。
- E2E-2 全链补强：真实 run 中模型收到 `Error: SQL 越界：ATTACH/DETACH/PRAGMA/
  VACUUM/扩展加载被拒（sqlite 工具仅允许操作沙箱专用数据库）` 的 tool-result
  （§2.3 ai@7 语义端到端兑现），run ok:true、工具循环自愈继续、被拒调用无 🔧 行
  （SPEC §3.4 观测边界如实）。

### AC3 · 计数如实（M16）—— PASS

UPDATE 命中=1 / 未命中=0 / DELETE 定命=1（亲跑；WHERE 定命判据与执行序无关）。
E2E-1b 顺带证 `{"changes":1,…}` 真实计数出线。

### AC4 · 反演红绿双向 —— PASS（VERIFY 亲跑，SPEC §9.3）

1. **红**：经 Edit 工具把 `IMPL.sqlite` 整块临时改回 `'sqlite': null,` →
   `npm run build:server` exit 0 → `npm run smoke:server`（输出重定向落盘取
   `$?`）→ **exit 1，87 passed / 8 failed**：**M12-M17 全 FAIL（6/6，actual 全为
   `{error:"not implemented",note:"工具 sqlite.query/execute 未接入真实实现"}`
   stub 载荷或 undefined）** + M06/M07 额外 FAIL（sqlite 组三向漂移 + 类型面
   stub 化被防漂移断言抓获——正是 M07 防漂移设计意图与 M06 守护面的预期表现，
   PRD AC5「漏改即红」的实证，非缺陷）。
   过程注记：反演 Edit 触发 Mimosa 钩子 `db.exec` 命令注入启发式告警（0020
   同款误报，better-sqlite3 进程内 SQL 非 shell）——按用户 2026-10-24 两门降
   warn 决策（BACKLOG.md:59）与 JOURNAL §1 裁决，warn 档位放行、未 hard-block，
   还原内容为反演前逐字原文故保持原写法（AC4 要求逐字还原，改写即违判据）。
2. **绿**：逐字还原 → `git diff` 与反演前**逐字节相同**（pre/post 两份 diff
   文本 `diff` 比对零差异，175 行复原）→ `npm run build:server` exit 0 →
   复跑 `npm run smoke:server` → **95 passed / 0 failed，exit 0**。
3. **零残留**：终态 `git status --porcelain` 恰 §2 白名单四条目；反演全部
   临时产物（/tmp 快照与日志）已清理。

### AC5 · 口径联动与提交不变式 —— PASS

- SPEC §4.1 联动清单 16 处逐处 Read 亲核全部到位：文件头 :2（M01-M17）/:5-7
  （sqlite 直驱声明）/:8（M02-M07、M12-M17）、:26-30 注释块（已接入实况+三处
  同步义务）、:34 FROZEN `impl:true`、:66-67 M03 3/3（browser 三项）、:73-74
  M04 9/9（含 sqlite.query/execute）、:89-91 M05 3/3（ctx 收敛 browser）、
  :101-103 M06 9/9（ctx 加 sqlite、仅类型面边界声明）、:105-106 M07 已执行轮
  注释——冒烟 M03-M07 实跑结果与口径一致（M03 3/3、M04 9/9、M05 3/3、M06 9/9、
  M07 5/5 组）。
- JOURNAL §3.2 两处联动清单外一致性小改（M01 消息措辞 + dist 不可用 FAIL 循环
  扩至 M12-M17）经 Read 亲核在 :43/:200 落地，判据语义零变化——边界内，裁定接受。
- 提交不变式：工作区 diff 口径亲证（§2：白名单恰两路径+机制件、保护面+lock
  恒空、零新依赖）；「产品提交恰一个 + numstat 恰两路径」归 CLOSE 脚本执行
  （时点口径同 0025）。M07 三向自愈保证回退同步质量（回滚后 5/7 旧口径自检）。

### AC6 · 回归与门禁 —— PASS

smoke:server 亲跑两轮均 **0 failed / 95 passed**（实得值=预期值 89+6，C 组动态
行口径沿 0009 SPEC §6.2）；`npm test` + `npm run gate` 由工作流脚本统一执行
且通过（派发指令声明），VERIFY 未复跑、如实记录；shared/web/golden/pixel-gate/
CI 配置 diff 恒空（§2 亲证）——纯后端回归面，UI 三层无机器可证。

### AC7 · 重试前置兑现与指针抽样 —— PASS

- 写探针半段：JOURNAL §1 在案（最小 `db.exec` 形态 Edit 触发钩子仅 warn 级、
  编辑成功应用、判定为 0020 同款启发式误报、按用户决策保持原写法）——前置
  义务兑现，本轮 VERIFY 反演过程的 Edit 再次实证 warn 档位放行行为一致。
- 指针抽样（≥5 条，实际 6 条，Read/sed/git show 亲核，全部一致）：

| # | 指针（PRD/SPEC 引用） | 核对结果 |
| --- | --- | --- |
| 1 | `tools.ts:59/:97-98`（HEAD 基线：IMPL sqlite null + 两行「（未实现）」前缀） | `git show HEAD:…` 亲核逐字一致（基线陈述属实；翻真后现为 :91-115 实现 + :153-154 新 desc） |
| 2 | 当前 `tools.ts` TOOL_SPECS sqlite 两行 vs SPEC §3.5 目标字面量 | :153-154 与 SPEC §3.5 代码块**逐字相同**（含「沙箱数据库」限定语，schema 形态不变） |
| 3 | `store.ts:21`（better-sqlite3 import 先例）+ `:29-31`（主库 data/agentflow.db 不同根） | 亲核一致（沙箱库与主库物理隔离的前提成立） |
| 4 | `app.js:103-114`（前端 MCP_SERVERS 注册表，sqlite 条目 :108-109 早已广告 query/execute） | 亲核一致，零改动（git diff 恒空）——翻真对前端零感知 |
| 5 | `mcp-stubs.mjs` FROZEN（SPEC §4.1 :30 联动 → impl:true） | :31-35 亲核：sqlite 组 `impl: true` 到位 |
| 6 | `smoke-server.mjs:300-302`（M 组挂接点）+ `:30` import | 亲核在位，文件零改动（挂接点早已在位的白名单论证成立） |

## 4. SPEC §9.2 手动 E2E 点位（真实 server HTTP/SSE 全链，VERIFY 亲跑 16/16）

方法沿 0025 先例：OS temp 临时脚本（不入仓库，已清理）起进程内 OpenAI 兼容 mock
模型（**带 tool_calls 编排**，按请求 tool 消息计数推进 3 轮工具循环；按 stream
语义 generateText 走非流式 JSON）+ `lib.mjs startServer` 起真实 `dist/server.js`
（env 显式注入 `AI_BASE_URL/AI_API_KEY`，本机无 `apps/server/.env` 亲核，宿主
密钥不泄入）+ `openSse` 消费 `POST /api/v1/run`。工作流 = userinput → llm
（`n.mcp` 节点字段）。判据全部机器断言，不依赖真实模型随机性（SPEC §9.2「判据
只看已发生事件」口径的确定性实现）。

| # | 断言 | 结果 |
| --- | --- | --- |
| E2E-1a | run:done ok:true，工具循环 3 轮收束无降级（无「工具循环异常」行） | **PASS**（ok=true） |
| E2E-1b | 🔧 sqlite.execute 行为 **sys 色**、无「未接入」；载荷真实 `{"changes":1,…}` | **PASS**（lvl=sys） |
| E2E-1c | 🔧 sqlite.query 行为 sys 色且载荷为真实行集 `{"rows":[{"id":"1","v":"hello-sqlite"}]}` | **PASS**（lvl=sys） |
| E2E-1d | 模型次轮可见真实查询载荷（mock 第 3 请求 messages 含 hello-sqlite 的 tool-result 续接） | **PASS** |
| E2E-1e | 最终回答反映库内真实数据（node:done out 含 hello-sqlite） | **PASS** |
| E2E-1f | ✓ 摘要 `MCP 1 服务/2 工具` 且无「（N 未接入）」 | **PASS**（`✓ L · 生成 54 tokens · MCP 1 服务/2 工具 · 0.1s`） |
| E2E-1g | 全事件流无 `not implemented` | **PASS** |
| E2E-2a | ATTACH data/agentflow.db 诱导下 run 不失败、工具循环继续（ok:true） | **PASS** |
| E2E-2b | 模型收到黑名单错误文本 tool-result：`Error: SQL 越界：ATTACH/DETACH/PRAGMA/VACUUM/扩展加载被拒（sqlite 工具仅允许操作沙箱专用数据库）` | **PASS**（req2 tool 消息原文截获） |
| E2E-2c | 被拒调用无 🔧 行（§3.4 观测边界如实）且无 not implemented 成功载荷 | **PASS**（🔧行数=1，属第二轮） |
| E2E-2d | 自愈：第二轮改写查询有 🔧 sys 行 | **PASS** |
| E2E-2e | 结束后 `apps/server/sandbox/` 目录集合不变（仅 mcp-sqlite.db，无新副产） | **PASS** |
| E2E-2f | 仓库根/data 无 ATTACH/探针残留 | **PASS**（data/ 仅 agentflow.db 系+server.log） |
| E2E-3 | 混合勾选（sqlite 2 + browser 3）：✓ 行 `MCP 2 服务/5 工具（3 未接入）`（stubCount 仅计 browser） | **PASS**（摘要原文一致） |
| E2E-4 | E2E-1/2 之后 `GET /api/v1/workflows` → 200 正常返回（主库未受沙箱活动影响） | **PASS**（status=200，n=7） |
| PRE | 真实 server 健康 200（providers 显式分支连 mock） | **PASS** |

## 5. 交互回归抽查（WORKFLOW §4 VERIFY 契约）

本轮改动面纯后端（tools.ts + mcp-stubs.mjs），前端零接触的机器证据：
`git diff -- packages/shared apps/web tools/pixel-gate .github tests/golden` 输出
为空（§2 亲证）——宪法 UI 三层（视觉/DOM 结构/交互）无涉，test-manager 交互
回归清单（拖拽/缩放/连线/审批弹窗等）在本轮**无触发面**，不适用逐项执行；gate
8 场景由工作流脚本统一执行通过（权威在 CI `ui-constitution`）。前端 MCP 面板
文案一字未动（app.js diff 恒空 + §3 AC7 #4 指针亲核）。

## 6. 结论与移交

- **verdict：PASS，0 BUG**。JOURNAL 三处偏离记录（§3.1 两处桌面设计微调 +
  §3.2 两处一致性小改，实为四处）全部经 VERIFY 复核裁定为 SPEC 等价范围内，
  无需修复。
- 移交 CLOSE：产品提交恰一个（建议 `feat(server): BK-0008 sqlite MCP 工具真实
  接入——沙箱锚定 + SQL 越界黑名单 + M12-M17 行为断言`，白名单恰
  `apps/server/src/tools.ts` + `tests/smoke/mcp-stubs.mjs` 两路径）；
  `git show --numstat` 终验；BACKLOG BK-0008 置 done、metrics 追加行、
  STATE iteration+1/phase=idle；ROADMAP T3-M2 状态行兑现「工具返回不再含
  not implemented（sqlite 半面；browser 半面归 ADR-0011 终态）/sandbox 外
  路径被拒/gate 全绿」。
