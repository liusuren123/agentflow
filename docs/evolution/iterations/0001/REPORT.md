# REPORT · 迭代 0001 · BK-0001 现状盘点（VERIFY 验收报告）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-22 00:46
> 输入：`iterations/0001/PRD.md`（AC1–AC5）/ `iterations/0001/SPEC.md`（§8 V1–V7）/
> `iterations/0001/JOURNAL.md`（BUILD 留证）。
> 运行环境：本机 Windows（win32 10.0.26300）Git Bash + Node v24.21.0；gate 以 CI
> （windows-latest）为权威（AGENTS.md 已知陷阱 / PRD 风险 2）。

## 结论

**PASS。** AC1–AC5 全部通过、SPEC §8 V1–V7 全部通过（V1–V3 为工作流脚本门禁结果
＋VERIFY 产物级佐证；V4–V7 由 VERIFY 亲自执行）。T1-M1 关账成立，无缺陷（BUG 清单空）。

## 一、AC 逐条验收（PRD 验收标准）

### AC1 · 残留注入路径 —— 通过（VERIFY 复跑）

- 命令（仓库根，VERIFY 2026-10-22 00:4x 亲跑）：
  `grep -rn "dangerouslySetInnerHTML" apps/web/src` → 无输出，`exit=1`
  `grep -rn "?raw" apps/web/src` → 无输出，`exit=1`
- 与 PLAN（PRD 背景 4）/ SPEC（§2 初核）/ BUILD（JOURNAL §2）四轮一致：0 匹配。
- 备注（预防性辨析，非缺陷）：`grep "dangerouslySetInnerHTML" apps/web/dist/index.html`
  会命中 1 处——那是 **React 压缩运行时内部的属性名列表**（`"children
  dangerouslySetInnerHTML defaultValue ..."`），属第三方库代码，非应用注入路径；AC1 的
  口径是 `apps/web/src`（源码域），不受影响。

### AC2 · 基线命令（build/gate/test）—— 通过（脚本门禁 + 产物佐证）

- 按本轮派发契约，`npm run build` / `npm run gate` / `npm test` 由工作流脚本在 BUILD 后
  统一执行且通过（派发指令原文：「build/gate/test 已由脚本运行且通过」）；VERIFY 按指令
  **不重复跑全套**，以下为 VERIFY 取得的独立佐证：
  - 构建产物在位且新鲜：`apps/web/dist/index.html` 存在，337,761 字节，mtime
    **2026-10-22 00:39:32**（晚于 BUILD JOURNAL 落盘 00:37，与「脚本在 BUILD 后执行
    build」时序一致）。
  - gate 差异图目录为空：`ls tests/golden/diff/` → 无文件（exit=0）。gate 仅在场景有
    差异时向该目录写 diff 图（test-manager 职责定义 / gate.mjs `DIFF_DIR`），空目录与
    「4 场景 diffPx=0」一致。
  - golden 基线未被触碰：`tests/golden/ui/` 仍为 4 场景 ×（png+invariants.json），
    `git status` 无该目录变更。
  - 对照基线 `weekly/43.md` §二（2026-10-22 治理日：gate 4 场景 diffPx=0、test 5/5）。
- 局限声明：VERIFY 未亲自运行这三条命令（遵循派发指令），上表为「脚本结果（派发指令
  转述）+ 文件系统级佐证」；CI（windows-latest）仍为权威运行环境。

### AC3 · CP 逐项结论 —— 通过（VERIFY 逐行复核，10/10 一致）

VERIFY 对 JOURNAL §1 矩阵全部 10 行的每一份证据做了独立复核（亲读文件 / 亲跑命令）：

| # | 结论 | VERIFY 独立证据（亲读/亲跑） |
| --- | --- | --- |
| B1 | 一致 | 亲读 `apps/web/package.json:14`（react ^18.3.0）`:21-23`（typescript ^5.6.0 / vite ^5.4.0 / vite-plugin-singlefile ^2.0.0）；`apps/web/vite.config.ts:7` `plugins: [react(), viteSingleFile()]` |
| B2 | 一致 | 亲读 `apps/server/src/server.ts:52-56`：`WEB_INDEX = path.join(ROOT,'apps','web','dist','index.html')`，缺失 `logger.fatal` + `process.exit(1)` |
| B3 | 一致 | 亲读 `tools/pixel-gate/gate.mjs:25-30`：无 `--target` 默认 `apps/web/dist`，无 index.html 时 `process.exit(2)` |
| B4 | 一致 | AC1 两条 grep 复跑 0 匹配（见上） |
| C1 | 一致 | 亲读 `apps/web/src/App.tsx:12-15`（仅 `useEffect(bootLegacyApp)` + `return <Skeleton />`）；`ls apps/web/src` = App.tsx / Skeleton.tsx / app.css / legacy / main.tsx / server-sync.js |
| C2 | 一致 | 亲跑 `git ls-files \| grep -i skeleton` → 仅 `apps/web/src/Skeleton.tsx`（exit=0）；工作区无 skeleton.html；`git show --stat 828ae57`：Skeleton.tsx +182 / skeleton.html −168 |
| C3 | 一致 | 亲跑 `git log --oneline --follow -- apps/web/src/skeleton.html` → 520d918（引入）→ 828ae57（删除）两条可溯 |
| D1 | 一致 | 亲读 `apps/web/src/legacy/app.js:3`（`import { NODES } from '@agentflow/shared'`）与 `:133`（`const DEFS = NODES;` 注释「单一事实源」），无本地 DEFS 字面量 |
| D2 | 一致 | 与 B2/B3 同一证据两用（VERIFY 同样亲读两处，SPEC §1 D2 注明成立） |
| D3 | 一致 | 亲跑 `git ls-files \| grep -E "^index.html\|^tools/extract-web"` → 0 匹配（exit=1）；`ls index.html tools/extract-web.mjs` → 双 No such file（exit=2）；`ls tools` 仅 pixel-gate；`apps/web/index.html` 12 行（Vite 合法入口，`wc -l` 实测）；extract-web.mjs 末次变更 2e36688（亲跑 `git log -1`） |

行数记档差复核：`wc -l` 实测 182 / 2419 / 131 / 532 / 12，与 JOURNAL §4.1、ROADMAP
T1-M2 验收口径中的行数逐一相符；ADR-0002「约 170 行」vs 182 行的容差判定（不进关账
判定）VERIFY 认可——核对点是结构性的，且已通过。

### AC4 · ROADMAP 回写质量 —— 通过（VERIFY 审读）

`git diff docs/evolution/ROADMAP.md`（VERIFY 亲跑）逐编辑点核对：

1. T1-M1 状态行：置「**已完成（迭代 0001 盘点关账，BK-0001）**」，附三类证据（核对
   矩阵 10/10 含 `路径:行` 指针 / grep ×2 0 匹配 / gate·test 基线指针）；
   「待 BK-0001 交叉核对手工关账」过渡表述已删除。✓
2. T1-M2 条目：细化为带验收口径 ①② 的条目（四模块 + 实测行数 182/2419/131/532 +
   「合入后 gate 仍 4 场景全绿」），状态附盘点证据指针（头注 + JOURNAL §4）。✓
3. 「待办（治理周维护）」首条：更新为关账结论一行摘要 + 证据指针；ready 队列与待批准
   区行文未动（diff 证实仅改首条）。✓
4. 无证据表述扫描：`grep -n "看起来" docs/evolution/ROADMAP.md` → 仅 2 处命中
   （`ROADMAP.md:6,13`），均为**规则原文**（头部口径「禁止以『看起来一致』作为判定依据」
   与 T1 主题导语「不是『看起来一样』」），非完成度判定表述。✓
5. T2–T4 与主题结构未动（diff 无相关 hunk）。✓

### AC5 · 渲染零影响 —— 通过（结构性论证 + 佐证 + E2E）

- 结构性论证：本迭代唯一产品性改动是 `docs/evolution/ROADMAP.md`；gate 的校验对象
  `TARGET_DIR` 只读 `apps/web/dist`（gate.mjs:26 亲读），`docs/` 不在任何渲染路径上，
  物理上不可能改变 gate 结果。
- 佐证：脚本在 ROADMAP 回写（00:37 前后）之后执行 build（00:39）与 gate 且通过
  （派发指令转述 + `tests/golden/diff/` 为空）。
- E2E 行为面：见 V7——文档改动后应用实际行为与 golden 基线逐项一致。

## 二、SPEC §8 验收门（V1–V7）

| 门 | 结果 | 证据归属 |
| --- | --- | --- |
| V1 `npm run build` 退出码 0 | 通过 | 工作流脚本执行（派发指令转述）；VERIFY 佐证：dist/index.html mtime 00:39:32、337,761 字节 |
| V2 `npm run gate` 4 场景 diffPx=0 | 通过 | 工作流脚本执行（派发指令转述）；VERIFY 佐证：`tests/golden/diff/` 为空、golden 4×2 文件未被触碰；另 V7 附 gate 同流程不变量全等复核 |
| V3 `npm test` 5/5 | 通过 | 工作流脚本执行（派发指令转述）；对照 weekly/43.md §二 同基线 |
| V4 grep ×2 = 0 匹配 | 通过 | **VERIFY 亲跑**（AC1，exit=1 ×2） |
| V5 核对矩阵逐行 | 通过 | **VERIFY 亲证 10/10**（AC3 表） |
| V6 ROADMAP 审读 | 通过 | **VERIFY 亲跑 git diff + grep**（AC4） |
| V7 手动 E2E 点位 | 通过 | **VERIFY 亲测**（下节） |

## 三、V7 · 手动 E2E（VERIFY 亲自执行，2026-10-22 00:41–00:45）

环境：`node apps/server/dist/server.js`（dist 00:10 构建、经 `find src -newer dist`
核验不落后于 src；本迭代零代码改动）→ `curl /api/v1/health` → `{"ok":true,...}`
（exit=0）；浏览器 1：ZCode 内置浏览器（IAB，1600×900）交互实测；浏览器 2：仓库
Playwright Chromium 临时脚本（含控制台捕获，脚本存系统临时目录、未落源码）。

### E2E-1 · 首屏画布 —— 通过

- IAB 实测 + Playwright 脚本双通道，counts 与 golden s0 不变量
  （`tests/golden/ui/s0-initial.invariants.json:48-54`）完全相等：
  **nodes=8 / edges=7 / widgets=15 / ports=15 / tabs=1**。
- 加做 gate 同流程对照（localStorage.clear → reload → fonts.ready → normalize →
  稳定双帧，与 gate.mjs:69-83 逐步一致）：`view` = `translate(16.7143px, 159.879px)
  scale(0.557143)`、`zoom` = `56%`、8 个节点矩形串、32 个 `:root` CSS 变量表与 golden
  s0 **逐字节相等**（脚本输出 `viewEqual/zoomEqual/nodeRectsEqual/cssVarsEqual` 均
  `true`）——本地环境复现了 gate 的 DOM 不变量全等。
- 记档（非缺陷）：IAB 首次进入（未走 gate 的 clear+normalize 流程）时 view 为
  `scale(1.03378)`/103%、底部面板展开——系底部面板开合参与首屏 fit-view 计算的正常
  初始态差异；走 gate 流程后即与 golden 全等。

### E2E-2 · 四侧栏面板开合 —— 通过

IAB 依次点击 rail「设置 / 节点 / 历史 / 工作流」（`app.js:287-296` 交互语义），四面板
全部：开（`#sidebar.open` ✓、`#side-title` = 设置/节点库/任务历史/工作流 ✓、rail 按钮
`selected` ✓、面板有内容 ✓）→ 二次点击同钮收起 ✓。Playwright 脚本独立复测同样全过。
（对应 gate s2=clickRail('settings') / s3=clickRail('nodes') 的交互面。）

### E2E-3 · 控制台无新增报错 —— 通过

Playwright 脚本挂接 `console`（error/warning）、`pageerror`、`requestfailed` 三类事件，
覆盖完整会话（加载 → localStorage 清空 → 重载 → 四面板开合 → 选中节点）：
**consoleIssues = []**（零输出）。本迭代零代码改动 + 全程零报错 ⇒ 无「新增」报错。

### 交互回归抽查（附加，test-manager 职责）

- 节点选中（s1 等价）：对 `.node[data-id="3"]` 派发 mousedown/mouseup → 节点
  `selected` ✓、悬浮工具条 `#node-tb` 可见 ✓。
- 缩放：`#zoom-in` 103%→124%，`#zoom-out` 回 103%（可逆）✓。
- 多工作流标签：`#tab-new` 点击后 `.wtab` 1→2 ✓。

## 四、缺陷清单

无（BUG-000：空）。无回滚、无修复轮次需求。

## 五、遗留与移交 CLOSE

- 一切按 PRD 目标交付；T1-M1 关账成立（AC1–AC3 全过 + 判定规则满足）。
- V1–V3 的第一手命令输出在工作流脚本侧（VERIFY 依据派发指令与产物佐证采信）；若需
  逐字输出留档，可由协调者从工作流运行日志补录——不影响本次 PASS 判定。
- E2E 结论基于本机 Windows（CI 为 gate 权威环境）；本机已用 gate 同流程取得 DOM
  不变量全等，与 weekly/43.md §二 治理日结果互相印证。
- 测试服务器已停止（验证后清理）；临时脚本位于系统临时目录，未进入仓库。
