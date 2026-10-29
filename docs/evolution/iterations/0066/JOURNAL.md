# JOURNAL · 迭代 0066 · BK-0061 BK-0020 拆分 SPEC 先行：引擎 on-error 策略 env 语义清单与失败路径改造定界 + ADR 草案（纯文档轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-29
> 输入：`iterations/0066/PRD.md`（S 项 skipSpec——受影响文件清单与验收口径内嵌
> PRD §受影响文件清单/§验收标准，无独立 SPEC）。reconstitutional=false（非修宪
> 轮）：零 golden 接触、全程未运行 gate:update。本文件为 BUILD 过程留痕；全部
> 改动发生在隔离工作树 `feat/0066-iter` 内，主干零触碰。

## 1. 交付物清单（受影响文件白名单口径）

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| `docs/adr/0022-engine-onerror-policy-env.md` | 新增 | 315 行（≤400 预算内，wc 亲核）；产品面唯一路径 |
| `docs/evolution/BACKLOG.md` BK-0020 行 | 机制件回写 | 备注列整格替换为 ADR-0022 §6 权威字面量（VERBATIM） |
| `docs/evolution/STATE.md` / `iterations/0066/JOURNAL.md` | 机制件过程态 | phase=BUILD + 本文件 |

按 PRD 口径：BK-0061 行终态备注归 CLOSE 侧（本轮零触碰）；BK-0048 行零触碰
（其约束原文已足够）。

## 2. ADR-0022 结构与关键定案（六要素成节，REQ-0061-01~06 对应）

- **§1 动机与现状证据（REQ-0061-01）**：按 PRD「现状与证据」节逐条转写并全部
  亲核（见 §3 锚点核对表）。两处按「锚点按代码事实转写」纪律**修正了 PRD 继承
  坐标**：① PRD/`events.ts:32` 注释引「server-sync.js:105-107」，实读该区间为
  SSE 帧解析循环收尾（:103-107 亲读），注释所述「ok !== false && !ev.stopped
  定级渲染」实锚 **server-sync.js:295-297**——ADR §1.2 记录漂移、修正归
  BK-0020 实施轮（events.ts 属 shared，本轮零触碰）；② 注释溯源 `git log -S`
  亲跑 = c17866f（BK-0021 批次 2 随批 BK-0023 注释），坐实 PRD「BK-0023 随批
  注释口径」表述。
- **§2 三策略语义定界（REQ-0061-02）**：矩阵表 + skip 两案对照（推荐案 a 下游
  失活=现状 named 化；否决案 b 默认出边放行——undefined 输入污染下游 + 非条件
  节点无「默认出边」既定语义）；retry 耗尽终态=skip；abort 用**独立 run 级标志位**
  而非 `ctx.ac.abort()`（不污染 stopped 语义与 store.ts:302 status='stopped' 判定）。
- **§3 env 语义清单（REQ-0061-03）**：**定案=新增 env 三项**（`ON_ERROR`
  skip/retry/abort 默认 skip、`ON_ERROR_RETRIES` 0-5 默认 0、
  `ON_ERROR_RETRY_DELAY_MS` 0-60000 默认 1000）——POLICY 需批准区命中，附录 A
  五要素 needs-approval 草案在案，「获批前零实现」字面两处命中；未配置兜底=
  现状逐位（零强制漂移）；零 env 常量备选案显式否决论证在案（REQ-0061-03 两分支
  处置：env 路径定案 + 备选否决留档，AC3「恰好其一」以定案为准）。
- **§4 引擎失败路径改造定界（REQ-0061-04）**：catch 扩展点=中止判定（:105-108）
  不动、其后插分派；重试宿主=runNode try 内仅包 handler 调用；abortable sleep
  竞速 ac.signal（stop/停机即时中断写死）；**node:error 仅终态一次**（定案依据：
  app.js:2506-2513 置 st-error 终态语义 + termview 错误行追加面，过程可观测走
  既有 `log` 事件零新类型）；run:done ok 分策略二态（未配置/skip/retry 零变化；
  abort 策略 ok=false——store.ts:302 status='error' 与 server-sync.js:317 卡片
  既有链路自然承接，SSE 零新增硬护栏）；LLM/agent delta 叠加风险如实声明
  （llm.ts:89/:101/:103、agent.ts:98 亲核）。
- **§5 BK-0048 边界切割（REQ-0061-05）**：优先序写死=节点参数 > env 全局默认 >
  内建缺省；三否决案对照表；BK-0048 参数面零预写声明。
- **§6 权威回写字面量（REQ-0061-06）**：BK-0020 备注列整格字面量（fenced text）。
- **§7 附录 A**：五要素（①env×3 请批清单 ②ok 语义扩展知悉 ③delta 残余风险知悉
  ④实施顺序 BK-0020→BK-0048 ⑤证据链接 + 批复语义尾注），字面量形态沿
  ADR-0014 §6 直系先例。
- **§8 不做范围与验证口径（REQ-0061-07）**。

## 3. 锚点核对表（AC6 抽样基数，全部本会话亲读/亲跑）

| 锚点 | 核实方式与结果 |
| --- | --- |
| engine.ts:102-112 catch 块 | Read 全文（154 行）；:103 executed / :104 done++ / :105-108 中止分支 / :109 emit / :110 log.warn / :111 return / :112 收口，逐行在案 |
| engine.ts:152 run:done ok | 同上；`ok: !stopped` |
| engine.ts 零 `failed` | `grep -n "failed\|node:error\|run:done\|status"` = :106/:109/:152 三命中、failed/status 零命中（与 PRD 白描一致） |
| 出边激活/下游失活 | engine.ts:116-118（firedEdges）+ :140（入边零命中 continue）亲读 |
| events.ts:32 注释 | Read 全文（43 行）；注释文案与 :22 node:error / :24 log 契约在案；溯源 `git log -S 'ok = 本次运行未被中止'` = c17866f |
| server-sync.js 消费面 | :295-297 run:done 定级 + :314-321 runCardMeta（:317 error→`· 失败`）awk 亲读；:103-107 确证为帧解析循环（PRD 坐标漂移勘误依据） |
| app.js node:error | :2506-2513（st-error 终态）+ :2109-2116（termview 追加错误行）awk 亲读 |
| store.ts:302 status 派生 | grep+awk 亲读：`ev.stopped ? 'stopped' : (ev.ok ? 'done' : 'error')` |
| server.ts 级联 | :173-188（catch 路径 run:error + run:done ok:false）、:192-198 stopHandler、:296-333 shutdown（:316-318 abort 循环、:319-327 宽限 5s）awk 亲读 |
| config.ts 白名单/schema | Read 全文（149 行）：:29-35 白名单数组、:52-83 EnvSchema、:69-74 superRefine、:75-82 PTY 词形/数值先例、:85-88 fail、:125-131 输出映射 |
| delta 发射点 | grep：llm.ts:89/:101/:103、agent.ts:98 |
| 零 retry 现状 | `grep -rni retry apps/server/src` 输出空 |
| 文件行数 | wc：engine.ts 154 / config.ts 149 / server.ts 335 / events.ts 43 |
| ROADMAP 序列 | :161-165（M2 四项+验收 :164）、:210-211（SPEC 三连）、:215（BK-0048 待 BK-0020）awk 亲读 |
| BACKLOG 行 | :69 BK-0048 / :82 BK-0061 / :117 BK-0020 grep 亲读 |

## 4. BK-0020 行回写记录（AC4）

- 回写方式：node 脚本自 ADR-0022 §6 fenced text 提取字面量（先校验零 `|`
  保证表格安全），整格替换 BK-0020 行备注列（第 9 列；前 8 列含状态 proposed
  逐字不动），写后回读**程序化比对 trim 全等 = true**（脚本输出在案）。
- `git diff --stat` 亲核：BACKLOG.md 恰 1 行变更（BK-0020 行）——BK-0061 行、
  BK-0048 行零触碰（AC4 后半）。

## 5. 自检结果（本会话实跑；build/gate/test/smoke 归脚本）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| ADR 行数 ≤400 | `wc -l docs/adr/0022-engine-onerror-policy-env.md` | 315 ✓ |
| 「已批准」计数 0 | `grep -c 已批准 <ADR>` | 0（exit=1 无命中）✓ |
| UTF-8 无 BOM / LF | `file` + `grep -c $'\r'` | UTF-8 text、CR 零命中 ✓ |
| AC4 VERBATIM | node 脚本比对（§4） | trim 全等 true ✓ |
| AC1 零产品代码 | `git diff HEAD -- apps packages tools tests .github package*.json` | 输出空 ✓ |
| 改动面 | `git diff --stat` | BACKLOG.md（1 行）+ STATE.md（过程态）+ 新增 ADR（untracked）✓ |

- **未运行**（按派发指令归脚本统一执行）：`npm run build` / `npm run gate` /
  `npm test` / `npm run smoke:server`——AC5 以脚本侧实跑为准；本轮纯文档零代码，
  gate 为纯回归面。
- 全程未运行 `npm run gate:update`（非修宪轮，宪法第 3 条）。

## 6. 边界与如实声明

- 触UI=否全程成立：apps/web / packages/shared / tools / tests / .github /
  package*.json 零接触（AC1 git diff 恒空实跑证明）。
- PRD §现状与证据中「engine.ts:102-112 catch 跨 :102-112（:102 起、:112 止）」
  亲核一致；PRD 行内「server-sync.js:105-107 同语义」按代码事实勘误为
  :295-297（ADR §1.2 已记录，非 PRD 改写义务）。
- 附录 A issue 的实际开立归协调者/脚本（本 agent 无 gh 授权义务），ADR §7
  字面量供其逐字取用。
