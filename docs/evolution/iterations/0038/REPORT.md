# REPORT · 迭代 0038 · BK-0046 approval 审批人节点引用拾取器 + BUG-0012 前端联动（修宪轮）

> 产出角色：test-manager（VERIFY 轮）。
> 输入：`iterations/0038/PRD.md`（REQ-0046-01~04 / AC1~AC8）+ `iterations/0038/SPEC.md`（§5 验收口径、§6 手动 E2E 点位）+ ADR-0017。
> 环境：工作树 `.zcode/worktree/feat/0038-iter`（分支 feat/0038-iter）；win32 10.0.26300 · Node v24.21.0 · Playwright Chromium（本机）。
> 验收时间：2026-10-26。

## 结论：**PASS**（0 个本轮缺陷）

- PRD 四组需求（REQ-0046-01~04）与 AC1~AC8 逐条验收通过；针对性 E2E（真实后端 + mock 模型）
  **31/31 断言通过**；s12/s13 新基线独立像素复核 **diffPx=0**；禁区零 diff 机器判据亲核通过。
- 按 VERIFY 派发指令，build / gate 全套 / test / smoke 全套已由脚本在工作树内运行且通过
  （BUILD 轮 JOURNAL 自测表 + STATE.last_result 在案），本轮**未重复跑全套**，改以针对性
  独立复核补强（§2.4 像素复核、§2.5 K04 源锁独立复核）——如实区分「亲跑」与「BUILD 轮记录」。

## 1. 验收矩阵（AC1~AC8）

| AC | 口径 | 结果 | 证据（本轮亲核 / BUILD 轮记录） |
| --- | --- | --- | --- |
| AC1 gate | 全绿：s0~s11 零波及 + s12/s13 golden-created；gate:update 次数 0 | ✅ | BUILD 轮 gate 双跑（首轮 s0~s11 全 pass·diffPx=0 + s12/s13 golden-created；次轮 14 场景全 pass·diffPx=0），JOURNAL 自测表在案；本轮另做**独立像素复核**：复刻 gate 采集管线重采 s12/s13 与基线比对，`diffPx=0` + 不变量全等（§2.4，即第三次连续一致采集）；`gate:update` 使用 0 次为 BUILD 申报 + 既有 12 基线 `git status --porcelain -- tests/golden` 零 M 行亲核佐证 |
| AC2 契约 | `npm test` 30/30 零回退 | ✅ | BUILD 轮实跑 30/30（JOURNAL）；本轮亲核 `git diff --stat -- packages/shared apps/server package.json package-lock.json CONSTITUTION.md AGENTS.md .github/workflows` 输出**为空**（§2.6） |
| AC3 冒烟 | smoke:server 119/0（118 基线 + K04） | ✅ | BUILD 轮两轮实跑均 `119 passed / 0 failed`（JOURNAL）；K04 断言本体本轮独立复核一致（§2.5） |
| AC4 手动 E2E 五点位 | SPEC §6 ①~⑤ | ✅ | 本轮亲跑 **30/30**（§2.1~§2.3）+ 边界 1 补测 PASS（§2.3 末） |
| AC5 白名单与禁区 | 改动恰为 SPEC §1 清单；禁区 diff 恒空 | ✅ | `git status --porcelain` 恰为：app.js/app.css/gate.mjs/smoke-server.mjs 四改动 + BACKLOG/STATE 两机制件 + ADR-0017/iterations/0038/ 未跟踪 + golden 仅新增 4 文件；`git diff --numstat`：app.js +77/−0、app.css +9/−0、gate.mjs +40/−0、smoke-server.mjs +15/−0（**纯插入**）；package-lock.json 零变化（含于禁区空 diff） |
| AC6 指针抽样 | ≥5 组指针亲核零杜撰 | ✅ | 8 组亲核（§3），全部命中；行号偏差 ≤4 行（SPEC 自声明行号为 BUILD 前快照、锚点语义为准，PRD/SPEC 已预先声明该口径） |
| AC7 确定性 | 新基线连续两次采集逐字节一致 | ✅ | BUILD 轮 gate 两次（golden-created → 全 pass·diffPx=0）；本轮第三次独立采集仍逐字节一致（§2.4 diffPx=0）——三连一致 |
| AC8 样例一致性 | JS 等价样例与 handlers.ts:113 兜底字面量逐字一致 | ✅ | smoke K04 断言在库（BUILD 119/0 含 K04）+ 本轮以 K04 原始正则独立复核：两文件各恰 1 处、捕获组逐字相等（§2.5） |

## 2. 本轮亲跑的验证

### 2.1 E2E 点位①② · REQ-0046-01 拾取器（kefu 默认工作流）

E2E 拓扑：进程内 OpenAI 兼容 mock 模型端点（沿 smoke :99-180 路由语义：非流式=裁决 JSON、
流式=分块）→ 工作树后端 `apps/server/dist/server.js`（env `AI_BASE_URL/AI_API_KEY/
AI_MODELS=MockChat:mock-model`，即 smoke V 组同口径）→ 本地静态 + `/api/*` 反向代理
（同源、SSE 透传）→ Playwright Chromium 1600×900。命令：`node verify-0038-e2e.mjs`
（临时脚本，跑完已删；流程与断言清单见本节）。

| # | 断言 | 结果 | 关键输出 |
| --- | --- | --- | --- |
| 1 | approval（id=7）单选 → #props role 输入框 + `.role-pick` 入口出现 | PASS | 按钮文案「从画布选择审官节点」 |
| 2 | 反例：单选非 approval 节点（id=3）无入口 | PASS | `.role-pick` 不存在 |
| 3 | 打开清单 = 画布节点排除自身（7 项） | PASS | `["手动触发 · #1","客服提示词 · #2","知识库检索 · #3","LLM 生成回复 · #4LLM","置信度判断 · #5","直接回复用户 · #6","升级通知 · #8"]` |
| 4 | LLM 项（#4）可辨：无 off + mk「LLM」 | PASS | `{"cls":"mi","t":"LLM 生成回复 · #4LLM"}` |
| 5 | 非 LLM 6 项全置灰 `off` | PASS | off 计数 6 |
| 6 | 选择 #4 → role 写入 `node:4`（#props 输入框） | PASS | `val=node:4` |
| 7 | 节点体 role widget 同步 | PASS | `.node[data-id="7"] [data-k="role"]` = `node:4` |
| 8 | 覆盖语义：params 持久化（localStorage `agentflow.v2`） | PASS | `stored=node:4` |
| 9 | 现状选中态：重开菜单 #4 项带 ✓（PRD 第二组 GWT） | PASS | `"LLM 生成回复 · #4✓"` |
| 10 | 置灰项点击 → toast「仅 LLM 节点可担任互审审官」且 role 不变 | PASS | toast 原文命中，role 保持 `node:4` |

### 2.2 E2E 点位③⑤ · 互审链路与人工路径（最小工作流 trigger→llm(MockChat)→approval）

| # | 断言 | 结果 | 关键输出 |
| --- | --- | --- | --- |
| 11 | 最小画布清单 2 项（trigger 置灰 + LLM #2 可选） | PASS | `[{"cls":"mi off","t":"手动触发 · #1"},{"cls":"mi","t":"审官 LLM · #2LLM"}]` |
| 12 | 拾取器写入 role=`node:2` | PASS | — |
| 13 | node:id 运行：全程无人工审批弹窗（MutationObserver 监听 #approve-modal class） | PASS | `modalShown=false` |
| 14 | 互审链路回填：审批节点出「智能体裁决 · 审官 node:2」 | PASS | out=`审批通过 · 智能体裁决 · 审官 审官 LLM（node:2） · mock 允许：符合规范` |
| 15 | 链路完整性：LLM 节点 mock 流式回填 | PASS | out=`你好，我是会话冒烟助手。` |
| 16 | 运行收敛：审批节点 `st-done` | PASS | — |
| 17 | 手敲自由文本 role=`值班经理`（#props change 委托） | PASS | 输入框值覆盖成功 |
| 18 | 人工路径：`approval:required` 弹窗出现且审批人=值班经理 | PASS | `#approve-info` 含「值班经理」 |
| 19 | 点 #approve-ok → 收敛：弹窗已用 + 审批完成 | PASS | out=`审批通过 · 值班经理` |

### 2.3 E2E 点位④ · REQ-0046-02 lang 联动（seed 触发器→code 工作流）

| # | 断言 | 结果 | 关键输出 |
| --- | --- | --- | --- |
| 20 | 前置：DEFS 默认 Python 样例在位 | PASS | `# 处理输入后返回\nresult = input\nreturn result` |
| 21 | 入口①（#props change 委托）切 JavaScript → #props 与节点体两处 code 同步替换 + toast | PASS | 两处 = `// 处理输入后返回\nresult = input\nreturn result`；toast 含「已替换为等价样例」 |
| 22 | 切回 Python → 往返恢复（逐字节） | PASS | 两处 = Python 样例 |
| 23 | 入口②（节点体 widget nodesLayer change 委托）切 JavaScript → 同效联动 | PASS | 两处 = JS 样例 |
| 24 | 入口② 切回 Python → 往返恢复 | PASS | — |
| 25 | 反例：code 自定义为 `print(42)` 后切 lang → **零改动 + 无 toast** | PASS | 两处仍 `print(42)`，toast 空 |
| 26 | 边界 1（SPEC §3.2 语义表·边 1）：lang=Python 且 code 逐字=JS 样例 → 切 JavaScript → 零改动、无 toast | PASS | 补测脚本亲跑 PASS（两处保持 JS 样例不变、toast 空） |

### 2.4 s12/s13 独立像素复核（AC1/AC7 补强）

复刻 gate.mjs `runScenario` 采集管线（同 1600×900 视口、同 normalize、同稳定双帧等待、
同公共六键 + per-scenario 不变量），仅对两新场景重采并与 `tests/golden/ui/` 基线比对
（pixelmatch `threshold:0`）。命令：`node verify-0038-pixel.mjs`（临时脚本，已删）。输出：

```
PASS · s12-approval-role-picker · diffPx=0 · invariants=equal
PASS · s13-code-lang-sync · diffPx=0 · invariants=equal
```

即当前工作树代码对 s12/s13 的渲染与 golden 基线**逐字节一致**——BUILD 轮 gate 双跑之后的
第三次连续一致采集，AC7 确定性成立。基线不变量内容亲核：s12 `menuOpen:true` + menuItems
7 项（唯一 LLM 项 `|LLM 生成回复 · #4LLM`，其余 6 项 `off|` 前缀）；s13 `propsLang:"JavaScript"`
+ propsCode/nodeCode 同为 JS 样例——与 SPEC §4.2 预期逐字一致。

### 2.5 K04 源锁独立复核（AC8）

以 smoke K04 原始正则 `/['"](\/\/ 处理输入后返回[^'"]*)['"]/g`（含 JOURNAL 申报的 `g`
旗标修正，diff 中实装确认）独立扫两文件：

```
app.js hits: 1 ["// 处理输入后返回\nresult = input\nreturn result"]
handlers.ts hits: 1 ["// 处理输入后返回\nresult = input\nreturn result"]
K04 独立复核·逐字一致: true
```

### 2.6 AC5/AC2 机器判据（亲核命令与输出）

- `git diff --stat -- packages/shared apps/server package.json package-lock.json
  CONSTITUTION.md AGENTS.md .github/workflows` → **输出为空**（禁区零 diff）。
- `git status --porcelain -- tests/golden` → 仅 4 个 `??`（s12/s13 png+invariants），零 M 行。
- `git diff --numstat` → `9 0 app.css / 77 0 app.js / 1 1 BACKLOG.md / 6 6 STATE.md /
  15 0 smoke-server.mjs / 40 0 gate.mjs`——四个产品文件全部纯插入（+N/−0）。

### 2.7 交互回归抽查（test-manager 职责清单节选，与改动面相邻）

| # | 断言 | 结果 | 证据 |
| --- | --- | --- | --- |
| 27 | 节点拖拽生效 | PASS | id=7 位置 `1540,350 → 1640,430`（localStorage 实读） |
| 28 | Ctrl+Z 撤销拖拽 | PASS | `1640,430 → 1540,350` |
| 29 | 多工作流标签（#tab-new 新建空标签 → 切回原标签） | PASS | kefu 8 节点 → 新标签 0 → 切回 8 |
| 30 | 画布/菜单既有交互（s0~s11 全场景像素零波及） | PASS | BUILD 轮 gate 双跑 s0~s11 全 pass·diffPx=0（JOURNAL） |

> 30/30 主表 + 边界 1 补测 = 31/31。首轮跑曾出 1 例「标签切换」FAIL，排查为本验收脚本
> 选择器笔误（误用 `#tabs .tab`，实际为 `#tabs-list .wtab`，app.js:268-272），修正后
> 通过——**测试侧问题，非产品缺陷**，如实留痕。

## 3. 指针抽样（AC6 · 8 组亲核，零杜撰）

| 文档指针 | 实核结果 |
| --- | --- |
| PRD/SPEC/ADR：`approval/node.ts:19` role 为 text widget、default `'值班经理'` | ✅ `packages/shared/src/nodes/approval/node.ts:19` 逐字命中 |
| PRD：`code/node.ts:18-22` lang combo（Python/JavaScript）、`:23-24` code 默认 Python 样例 | ✅ `code/node.ts:18`（combo 起）、`:24`（`default: '# 处理输入后返回…'`） |
| PRD/ADR：`approval-review.ts` role `^node:(\d+)$` 解析 | ✅ `apps/server/src/approval-review.ts:25-26`（`parseAgentRole` + match 正则逐字一致） |
| SPEC/ADR：`handlers.ts:113` JS 兜底字面量、`:110` paramDefaultsOf 单一来源 | ✅ 两行逐字命中（§2.5 亦证） |
| PRD：`handlers.ts:290-306` 互审编排、审官须为 LLM | ✅ 实际编排块 :288-318，非 LLM 判定在 `:295`（`reviewer.type !== 'llm'` → 不可用），语义命中 |
| PRD/SPEC：`app.js:147` 默认工作流 approval id=7 | ✅ `{id:7, type:'approval', x:1540,y:350, title:'转人工审批'}` 逐字命中 |
| SPEC §3.1/§3.2 代码块 ↔ 实装 diff | ✅ 拾取器三函数、联动函数、双入口挂点、CSS 五条、gate 场景基建、K04 块与 SPEC 逐行对应（`git diff` 亲读）；差异仅 K04 正则补 `g` 旗标（JOURNAL §「必要修正」申报在案，实装正确） |
| golden 不变量 ↔ SPEC §4.2 预期 | ✅ s12 menuItems 7 项/LLM 标记/off 分布、s13 双处 JS 样例，逐字一致（§2.4） |

## 4. 观察与遗留（不计入本轮 PASS/FAIL）

1. **存量环境怪癖（非本轮引入）**：本机 Windows 下后端静态托管 `GET /` 返回 404——
   `res.sendFile(绝对路径)`（server.ts:61）在 send 库的 Windows 绝对路径处理下抛
   NotFoundError；最小复现：`sendFile(absPath)` → 404、`sendFile(rel, {root})` → 200。
   `apps/server/**` 属本轮禁区零 diff（主干同形），smoke 只走 API 不触此路由，CI（Linux）
   不受影响。对本轮 E2E 已用「本地静态 + /api 反代」同源拓扑绕开。建议后续立 Minor 项
   （存量，触后端不触 UI，自主区）修复为 `{root}` 形式。
2. BUILD 轮 `gate:update` 使用 0 次为 JOURNAL 申报值；机器佐证 = 既有 12 基线零 M 行 +
   新基线走 golden-created 通道（png 不存在时落盘，gate.mjs:321-325 机制亲读）。
3. BACKLOG.md 的 M 行为 PLAN 轮晋升记录（BK-0046 proposed→ready + 晋升依据备注），
   BK-0046 终态回写与标题 to→role 勘误按 PRD 迭代编排归 CLOSE 轮，本轮不代行。

## 5. 验收判定

- REQ-0046-01（拾取器）：✅（§2.1 十项 + §2.2 两项前置）
- REQ-0046-02（lang 联动）：✅（§2.3 七项，正/反/边界全覆盖）
- REQ-0046-03（golden 增量）：✅（AC1/AC7 证据链：golden-created → 双跑 pass → 本轮第三次 diffPx=0）
- REQ-0046-04（回归面）：✅（AC2/AC3 + 禁区零 diff + 交互抽查）
- **总判定：PASS，0 BUG，可进入分支提交/合并阶段。**
