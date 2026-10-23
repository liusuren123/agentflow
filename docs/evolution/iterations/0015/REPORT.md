# REPORT · 迭代 0015 · BK-0016 持久会话与流式会话 API（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 07:03（Node v24.21.0 · win32 本机）
> 输入：`PRD.md` AC1-AC7 / `SPEC.md` §8 验收口径 · JOURNAL.md 移交要点。
> 门禁说明：`npm run build` / `npm run gate` / `npm test` 由进化工作流脚本统一执行且通过
> （派发指令明示，本阶段不重复跑全套）；VERIFY 独立执行项为冒烟复跑、针对性 E2E
> 三路、AC7 反演两轮、白名单/零改动机器核对——全部于本会话实跑，证据如下。

## 0 · 结论

**PASS（7/7 AC 全过，0 BUG）**。所有结论均有本会话命令输出为证；两处「不可本机验证项」
按 0012 先例如实降级并注明权威路径（见 §4），不构成缺陷。

| AC | 结论 | 独立证据（本会话实跑） |
| --- | --- | --- |
| AC1 会话 CRUD 与恢复 | ✅ | 冒烟 G01-G03 + E2E-① AC1-a~f（24/0） |
| AC2 续聊流式（确定性） | ✅ | 冒烟 G05/G06 + E2E-① AC2-a~g |
| AC3 停止信号与部分保留 | ✅ | 冒烟 G07 + E2E-① AC3-a~d + E2E-② A/B/C（真实密钥） |
| AC4 并发守卫 | ✅ | 冒烟 G08 + E2E-① AC4-a~c（含 SPEC 补全的 400 反例） |
| AC5 SSE 契约零漂移 | ✅ | 冒烟 G10 + E2E-① AC5-a（19 条）+ E2E-② F（12 条）逐条 `RunEventSchema.parse`；`packages/shared/**` 零改动机器核对 |
| AC6 白名单与全量回归 | ✅ | 产品面恰四处（git diff --stat 实查）；行数 351/176/247/675 ≤ 预算 360/300/260/690；冒烟 66/0（既有 56 断言零回退 + G01-G10） |
| AC7 保护力反演 | ✅ | 两轮红绿演练（§3），还原后源/产物 md5 与反演前一致、复绿 66/0、`git status` 零残留 |
| REQ-0016-05 停机并入 | ✅（分级） | 模块级核心链 6/0（E2E-③）；代码级 server.ts:225-241 双计数扩展核对；进程级 SIGTERM 见 §4 降级 |

## 1 · 冒烟独立复跑（AC1-AC5 机器断言面）

命令：`npm run smoke:server`（VERIFY 独立执行，非 BUILD 自述转引）。

```
==== smoke:server：66 passed / 0 failed ====
```

- 既有全组（M/H/W/N/S/R/D/E/K/C，56 断言基线）零回退；G01-G10 全 PASS
  （G05 流式事件序+落库、G06 续聊历史、G07 stopped+前缀落库、G08 409/404、
  G09 降级恰 1 条 user、G10 逐条契约校验）。
- 时序敏感断言（G05/G07/G08）确定性成立（mock 三块 ×400ms），BUILD 后至此
  本机已四轮全绿（BUILD 两轮 + VERIFY 两轮，含反演复绿轮）。

## 2 · 针对性 E2E（test-manager 职责 · 本会话实跑）

### E2E-① mock 实例五端点全走查（独立于冒烟 G 组的第二实现）→ **24 passed / 0 failed**

进程内 OpenAI 兼容 mock 端点（`MOCK_FULL='你好，我是会话冒烟助手。'` 三块 ×400ms，
独立于 smoke-server.mjs 的实现重写）+ spawn `apps/server/dist/server.js`
（env 注入 `AI_BASE_URL/AI_API_KEY/AI_MODELS/AI_MODEL`）。要点：

- **AC1**：`POST /api/v1/sessions {title:"测试"}` → 201 SessionRow 形状完整
  （id/title/model:null/sys:null/created_at/updated_at）；`GET /sessions` → 列表含自建
  id；`limit=0/101/abc` → 400 文案一致、`limit=5` → ≤5 行；`GET /:id` →
  `{session.id===id, messages:[]}`；不存在 id → 404 `session not found`。
- **AC2**：事件序恰 `run:accepted→node:start{id:0,iteration:null,title:"测试"}→
  node:delta×4→node:done→log→run:done`（末位收束）；delta 末次 text===MOCK_FULL
  （累积全文）；`node:done{out=全文,firePort:null,iteration:null,ms=841}`（tokens
  省略——mock 不回传 usage，schema optional，SPEC §2.2「取不到则省略」合规）；
  `run:done{ok:true,done:1,total:1,stopped:false,outputs:[全文]}`；GET :id → messages
  恰 2 条（user seq1 + assistant 全文 seq2）；第二轮后恰 4 条，且 **mock 收到的第二轮
  请求体含第一轮 user/assistant 历史且末位 `{role:'user',content:'再问'}`、
  model==='mock-model'**（续聊上下文生效）。
- **AC3**：流出中 `POST stop` → 200 `{ok:true}`；SSE 以
  `run:done{stopped:true,ok:false,done:0,total:1}` 收尾；GET :id → assistant
  `"你好，"` 落库且为 MOCK_FULL 真前缀；无活动 turn stop → 404。
- **AC4**：活动 turn 二次 chat → 409 `session turn is active`；不存在 session chat →
  404；无 text / 空白 text → 400 `body.text 必须是非空字符串`（SPEC §3.2-5 步① 补全项）。
- **AC5**：三轮 turn 全部 19 条事件逐条 `validateEvent` 通过（`RunEventSchema.parse`
  成功返回解析值/失败抛异常——沿 G10 的 try/catch 用法）。
- **回归抽查**：`GET /` → 200 托管 React 产物（零 UI 接触回归面）；旧别名
  `GET /api/health` → 200（并存不受影响）。

### E2E-② 真实密钥（DeepSeek）→ **8 passed / 0 failed**

spawn server 继承宿主 env（`DEEPSEEK_API_KEY` 在位，`GET /api/v1/models` →
`configured=true, note=已连接 DeepSeek, 默认=deepseek-chat`）：

- 长文生成流中（首个 `node:delta` 已到）`POST stop` → 200 `{ok:true}` →
  `run:done{stopped:true,ok:false,done:0,total:1}` → **assistant 已累积部分落库**
  （2 字 `"##"`——真实端点首块内容，证明「保住已生成部分」在真实模型下成立）。
- 正常轮（`请只回复两个字：收到`）→ `run:done{ok:true,done:1}` outputs=`"收到"`；
  **真实端点 usage 可得时 node:done 回填 `tokens=24, ms=836`**（与 E2E-① 的
  「mock 下省略」互补，两分支均实证）；两轮 12 条事件逐条契约校验通过；
  GET :id → messages 恰 4 条。

### E2E-③ 停机协作（REQ-0016-05 可本机验证核心链）→ **6 passed / 0 failed**

进程内 mock + 直接驱动 `sessionChatHandler`（假 req/res）+ 调用 shutdown 协作出口：

- 活动 turn 期间 `activeSessionCount()===1` → 首帧 delta 后 `abortActiveSessions()`
  返回 1（与 run abort 同批，server.ts:225-228 调用点）→ turn 在宽限窗内
  `res.end`（shutdown 只轮询不代删）→ 事件流以
  `run:done{stopped:true,ok:false,done:0,total:1}` 收尾（**步⑩ 显式判
  `ac.signal.aborted` 的停止路径——JOURNAL §2-1 SDK 行为差异的独立复证**）→
  已累积部分 `"你好，"` 落库（closeStore/WAL checkpoint 之前完成，停机无孤儿消息）→
  `activeSessionCount()===0`（finally 自清注册表，宽限轮询收敛）。

## 3 · AC7 保护力反演（两轮红绿演练）

反演前基线指纹：`sessions.ts` md5 `c05c7a3c…`、`dist/sessions.js` md5 `b6c826f2…`。

| 轮 | 摘除点 | 重跑结果 | 还原后 |
| --- | --- | --- | --- |
| 一 | 正常路径 assistant 落库（步⑪ sessions.ts:147） | `build:server` + `smoke:server` → **FAIL G05**：`actual:{"msgs":["1:user"]}`（assistant 未落库，恰 2 条断言破）——60 passed/1 failed，fail-fast 止于 G05 | md5 复归 `c05c7a3c…` |
| 二 | 停止路径落库两处（步⑩ :135 实际执行点 + 步⑫ :151 catch 分支——JOURNAL §4 提醒双入口，两处同摘） | `build:server` + `smoke:server` → **FAIL G07**：`actual:{"stop":200,"done":{"stopped":true,…}}` 仅事件序过、前缀落库断言破——62 passed/1 failed | md5 复归 `c05c7a3c…` |

还原后：`npm run build:server` + `npm run smoke:server` → **66 passed / 0 failed**
复绿；源/产物 md5 与反演前**逐字节一致**；`git status --short` 与反演前相同
（零残留）。S/G 组断言非恒真，保护力成立。

## 4 · 如实降级项（非缺陷，0012 先例口径）

1. **进程级 SIGTERM 三要素演练（SPEC §8 手动 E2E ③ 原文「Ctrl+C 服务端」）**：
   Windows 跨进程信号经 TerminateProcess 投递，`process.on('SIGTERM')` 不触发
   （`tests/smoke/shutdown-sigterm.mjs:43-48` 确立的既知限制），本机不可演练进程级
   停机。已做替代验证：① E2E-③ 模块级核心链 6/0（§2）；② 代码级核对
   `server.ts:225-241`（abortActiveSessions 与 run abort 同批 + 日志
   `activeSessions` 字段 + 宽限轮询/warn 行 runs+sessions 双计数 + closeStore 前
   收尾）。权威断言路径：CI ubuntu-latest（ci.yml contracts job `smoke:shutdown`
   ——空载停机在跑；活动会话 turn 的进程级停机演练建议随下次 CI 变更补入，本迭代
   不扩 CI 面——CI 配置在 SPEC 零改动清单内）。
2. **`npm run build` / `npm run gate` / `npm test`**：由工作流脚本统一执行且通过
   （派发指令明示「不要重复跑全套」）；本报告未复跑，`apps/web/dist` 在位已由
   E2E-① REG-a（GET / → 200）旁证。gate 8 场景为纯回归面（§5 零 UI 接触机器核对）。

## 5 · 零 UI 接触与白名单机器核对（AC5/AC6）

- `git status --porcelain -- packages/shared apps/web tools/pixel-gate tests/golden .github`
  → **空输出**（零改动）；`git diff --stat` 同面为空。
- 产品面恰 REQ-0016-07 白名单四处：
  `store.ts +96`（255→351）、`sessions.ts`（新增 176）、`server.ts +22`（233→247）、
  `smoke-server.mjs +291`（386→675）；`STATE.md` 与 `iterations/0015/` 为进化过程
  文件（0014 先例，不入产品提交）。
- 行数预算：351/176/247/675 vs SPEC §7 的 360/300/260/690，全部达标。
- 交互回归清单（拖拽/缩放/连线等，test-manager 职责 2）：本迭代 `apps/web/**`
  零字节改动（上列机器核对），像素/DOM 不变量由脚本 gate 8 场景全绿把关（权威面）；
  后端行为回归由冒烟既有 56 断言零回退 + E2E-① REG-a/b（GET /、旧别名并存）覆盖。
  未做画布交互人工抽查——无 UI 改动面，非抽样可增量覆盖的对象。

## 6 · 过程纪实（不影响结论）

- E2E-① 首跑出现 2 条 FAIL，甄别为**验收脚本自身口径错误**（误查
  `validateEvent().success` 字段——实际 parse 成功返回解析值/失败抛异常；误断言
  `tokens` 必填——schema optional 且 mock 不回 usage）：修正脚本口径后 24/0。
  产品行为全程符合 SPEC，非缺陷。
- E2E 期间本机 `data/agentflow.db` 累积会话行 ~10 行（mock/真实演练），SPEC §10
  已定案可接受（data/ 不入库、无清理通道为 PRD 非目标）。

## 7 · 移交 CLOSE

- 结论 **PASS**：可按 WORKFLOW §4 归档（BACKLOG BK-0016 → done、metrics 追加行、
  iteration→0016、归档提交）；无 BUG 清单。
- 残留建议（下轮选题参考，非本迭代范围）：进程级「活动会话 turn 停机」演练随
  CI 契约演进补入 contracts job；会话删除/分页端点按 BK-9002 消费侧需求另立 S 项。
