# REPORT · 迭代 0039 · BK-0049 MCP·skills 清单动态化（VERIFY 验收报告）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-26 02:52（工作树
> `.zcode/worktree/feat/0039-iter`，分支 `feat/0039-iter`）。
> 输入：`iterations/0039/PRD.md`（Given/When/Then）+ `iterations/0039/SPEC.md` §8
> 验收口径 + BUILD 轮 `JOURNAL.md`（含修复轮 1 记录）。
> 验收环境：本机 Windows（win32 10.0.26300）· Node v24.21.0 · 工作树内
> `apps/web/dist`（02:31 构建）+ `apps/server/dist`（02:32，含 capabilities.js）。

## 结论

**PASS** —— PRD REQ-0049-00 ~ REQ-0049-04 逐条验收通过；回归抽查通过；
零接触面全部核验为零改动。发现 **1 项既有（非本轮引入）缺陷 BUG-0027**
（不阻塞本轮验收，建议立项），另附 3 条测试基建备注（非产品缺陷）。

| REQ | 结论 | 本会话亲跑证据（命令/断言 ID） |
| --- | --- | --- |
| 0049-00 ADR 草案要件 | PASS | 文件亲读 + `grep -n "已批准"`（唯一命中为规则自述行） |
| 0049-01 后端清单端点 | PASS | `node verify-cap-api.mjs`（临时脚本，已删）**10/10**；`npm run smoke:server` **130/0 ×2 轮**（CAP01~05 全 PASS，exit 0） |
| 0049-02 前端供数链 + 回退 | PASS | Playwright 浏览器 E2E（临时脚本，已删）**23/23**：五点位全覆盖 + 交互回归抽查 4 项 |
| 0049-03 golden 新场景 | PASS | s13 双文件在库、invariants 与 SPEC §6.3 定稿逐项吻合、PNG 图像亲核；既有 13 场景零波及（脚本统一门禁实测 + 三重旁证） |
| 0049-04 回归面 | PASS | smoke 本会话亲跑 130/0；build/gate/test 为脚本统一门禁已跑（派发令声明通过，本轮未重复全套），旁证核验见 §4 |

> **执行口径说明**：派发令明示「build/gate/test 已由脚本在工作树内运行且通过，
> 不要重复跑全套」——本报告对这三项如实标注为**脚本运行结果**（非本会话亲跑），
> 并以间接证据核验（§4）；smoke 与全部针对性 E2E 为本会话亲跑。

---

## 1. REQ-0049-00 · ADR-0018 草案要件（PASS）

`docs/adr/0018-mcp-skills-capability-list.md` 亲读（全文 111 行）：

- **状态行**（:3-5）：「**草案 · 待实施轮消费**（BK-0049 修宪轮，迭代 0039）」✓；
- **授权链**（:4-5）：issue#6 owner 批复承继 2026-10-24T08:38:51Z +
  iterations/0037/PRD.md:10-11 gh 亲核留档 + BACKLOG.md:77 承继明载——与
  PRD REQ-0049-00 Then 一致 ✓；
- **零「已批准」终态措辞**：`grep -n "已批准"` 全文唯一命中 ：20——且该行本身
  即规则自述（「全文不使用『已批准』终态措辞，BK-0032/0035 先例口径」），无任何
  终态声明 ✓（ADR-0017 同口径对照：零命中）；
- **七要素齐备**：§1 动机 / §3 影响面（含预期零改动清单）/ §2.1 端点契约定界
  （路径 + 出参形态 + 「恒 200 只读派生无 4xx/5xx」错误码口径）/ §6 回退语义 /
  §2.4+§5 golden 场景与 fixture 预案（golden-created 通道 + 既有零波及实测口径）/
  §4 三层回写表 ✓。

## 2. REQ-0049-01 · 后端清单端点（PASS）

**本会话亲跑 ①**：临时脚本 `verify-cap-api.mjs`（双实例串行，用毕已删）——

```
PASS E01 GET /api/v1/capabilities（无 env）→ 200
PASS E02 顶层键恰 [mcp,skills]
PASS E03 mcp.builtin 与 SPEC §4.1 期望字面量全字段 deepEqual
PASS E04 无 env 时 mcp.external deepEqual []
PASS E05 skills 五条与迁移字面量 deepEqual
PASS E06 builtin id/工具名与前端回退集（app.js:107-121）逐字一致（迁移零笔误）
PASS E07 POST /api/v1/capabilities → 404（仅 GET，只读面）
PASS E08 env 双条目 → external 恰 [{caps-ext,http}]（内置 id filesystem 冲突条被拒）
PASS E09 冲突拒条不污染：builtin/skills 仍 deepEqual 期望
PASS E10 清单调用后 health 200（端点零出站不拨打 discard 端口 9、进程不崩）
==== cap-api E2E：10 passed / 0 failed ====
```

（E03 期望字面量本会话已对照单一事实源亲核：`apps/server/src/tools.ts:145-158`
TOOL_SPECS 13 工具 desc 逐字一致；E06 对照 app.js 回退区亲读。）

**本会话亲跑 ②**：`npm run smoke:server`（工作树内，两轮）——

```
==== smoke:server：130 passed / 0 failed ====   （两轮一致，exit 0）
PASS CAP01 … mcp.builtin 与迁移期望字面量全字段 deepEqual …
PASS CAP02 … skills … 全字段 deepEqual；无 MCP env 时 mcp.external deepEqual [] …
PASS CAP03 … 顶层键恰 ['mcp','skills'] … 两次调用 deepEqual …
PASS CAP04 … POST → 404（仅 GET 注册，清单端点只读）
PASS CAP05 … external 恰 [{serverId:"caps-ext",kind:"http"}] …builtin 五条不受污染…
```

125 基线零回退（125→130，+5 恰为 CAP 组）；REQ-0049-01 Then ①（smoke 两态断言）
②（无 env 等价断言，E03/E06/CAP01 双锁）③（零出站/零新依赖/零新 env——git diff
无 package.json/config.ts 改动，E10 佐证）④（build:server 由脚本 build 覆盖 + smoke
零回退）全部落点。

## 3. REQ-0049-02 · 前端供数链 + 离线回退 + 手动 E2E 五点位（PASS）

**本会话亲跑**：Playwright（Chromium）浏览器 E2E，Phase A = 无后端静态托管
dist（/api/v1/* 真实 404，同 gate 静态服结构性保证；与 SPEC 口径「dev:web 代理
不可达」同构），Phase B = 真后端（PORT=39611，`MCP_HTTP_SERVERS=
'caps-ext=http://127.0.0.1:9'`）经透明反代同源供数（浏览器拿到的
/api/v1/capabilities 为**真后端派生数据**，非 fixture）——

```
PASS A1 回退①：面板 MCP 组恰五条 builtin（filesystem/fetch/sqlite/browser/web-search）
PASS A2 回退①：技能五条且 doc-writer 预选
PASS A3 回退①：画布徽章分母 = 回退集 5（MCP 1/5 · 工具 1）
PASS A4 回退①：filesystem 展开工具名/描述 = 前端回退字面量（读取文件/写入文件/列出目录）
PASS A5 回退①：无 pageerror / 未处理拒绝 / console.error
PASS R1 交互抽查：真实鼠标拖拽节点位移 (+120,+60)
PASS R2 交互抽查：Ctrl+Z 撤销拖拽（回到原位）
PASS R3 交互抽查：Ctrl+Y 重做（回到拖拽后位置）
PASS R4 交互抽查：空白处滚轮缩放生效（100% → 111%）
PASS B1 ②在线供数：面板 MCP 组六条 = builtin 五 + 外部 caps-ext（供数链到达）
PASS B2 ②外部条目行：cap-name = caps-ext
PASS B3 ②画布徽章分母随供数变 6（MCP 1/6 · 工具 1）
PASS B4 ③双源收口：filesystem 工具描述 = TOOL_SPECS 派生值（≠回退集「读取文件」）
PASS B5 ③web-search 展开描述 = TOOL_SPECS 派生值；预选 1/2、行 on
PASS B6 ②caps-ext 展开为空工具区（v1 服务级行，tools=[]）
PASS B7 ④skills 五条 id/name/desc 与迁移字面量逐字一致，doc-writer 预选 on
PASS B8 ②勾选 caps-ext → n.mcp["caps-ext"]=[] 落 localStorage（v1 已知降级形态）
PASS B9 ②空工具条目重渲染后勾选态不保持（SPEC §5.3 已知降级如实核验）
PASS B10 ⑤空数组不计摘要/徽章（capsSum 语义不回退）
PASS B11 ⑤刷新页面后勾选态/徽章/caps-sum 恢复（持久化读写不受供数链影响）
PASS B12 ⑤取消服务级勾选 → n.mcp["web-search"] 键删除（:1032 delete 语义不回退）
PASS B13 ⑤全部取消后 skills=[]、caps-sum 归零、徽章无 MCP 条
PASS B14 ②残留恰 caps-ext=[]（v1 降级：无工具可走 mcp-tool 清键路径，ADR-0018 §2.3 如实标注）
==== cap-ui E2E：23 passed / 0 failed ====
```

PRD Then 五点位逐条对应：①=A1~A5（回退五+五、徽章分母 5、无未处理拒绝）；
②=B1/B2/B3/B6/B8/B9（外部条目出现、可勾选展开为服务级行、`n.mcp['caps-ext']=[]`
形态如实）；③=B4/B5（id/工具名/描述与 TOOL_SPECS 派生值逐字一致，双源收口的
预期差异「读取文件→读取沙箱目录内的文本文件」在位）；④=B7；⑤=B10~B14
（勾选持久化读写、刷新恢复、:1032 清键语义不回退）。

**零改动供数链核验**（git diff 亲核）：app.js 全部改动 = 注释更新 + 两处
`const`→`let` + import 增补 + onCapsArrive 注册块 + init() 一行 `refreshCaps()`；
**数组字面量逐字节比对**（`git show HEAD:app.js` :105-123 vs 工作树 :107-125）：
仅两条声明行 `const/let` 差异，字面量内容零差异；消费点 :804/:995/:1030（HEAD
:785/:976/:1011）等无任何 diff hunk。server-sync.js +39 行全在数据面（capShapeOf
纯数据变换零 DOM、SVR.caps/capsErr、onCapsArrive、refreshCaps 失败静默）——
ADR-0006 边界内。

## 4. REQ-0049-03 / 04 · golden 与回归面

**s13 新基线（本会话亲核）**：`tests/golden/ui/s13-caps-panel.png` +
`.invariants.json` 双文件在库（git status untracked，productFiles 已申报）。
invariants 四键与 SPEC §6.3 定稿逐项吻合（亲读）：

- `capServers` = `['filesystem','fetch','sqlite','browser','web-search*','caps-ext']`
  （六元组，'on' 仅 web-search）；
- `capSkills` = 五 id，'on' 仅 `doc-writer*`；
- `capsSum` = `'已启用 1 个 MCP 服务 · 1 个工具 · 1 个技能'`；
- `nodeCaps` = `' MCP 1/6 · 工具 1 技能 1'`（**分母 6 = 供数链动态化铁证**）。

PNG 图像亲核：属性面板能力配置区 6 行 MCP（含 caps-ext 行）、llm 节点徽章
「MCP 1/6 · 工具 1」与「技能 1」、trigger→llm 两节点布局——与场景定义一致。
（技能区在截图中位于面板滚动区下方未入帧，以 invariants 的 capSkills 五元组为
gate 断言面，采集自同一 DOM，一致性由 gate invDiff=false 保证。）

**既有 13 场景零波及**：脚本统一门禁（派发令声明）`npm run gate` 14 场景全
pass、s0~s12 diffPx=0。本会话旁证核验：① `tests/golden/diff/` 目录为空
（gate.mjs:367-369 全 pass 自动清空——BUILD 修复轮 1 保留的 s3 残留已被最终
全绿运行清空）；② 既有 13 场景 golden 文件 `git status` 零 M（无重录副作用，
修复轮 gate:update 的净效果为零——JOURNAL §7 取证与本会话 git 状态一致）；
③ 修复轮 1 的 s3 抖动归因（本机渲染瞬态 23 散点、invariants 逐键全等、复跑
字节级回基线）复核成立，**不构成产品缺陷**；gate:update 修宪授权已消费恰一次，
CI（windows-latest）权威待推送后 `ui-constitution` 复核。

**REQ-0049-04 逐项**：① build exit 0——脚本运行（dist 产物在库且新代码已入
bundle）；② gate 14 场景全 pass——脚本运行（旁证如上）；③ `npm test` 全绿
（shared 零触及 → 零漂移预期）——脚本运行；本会话旁证：`git diff HEAD --stat
-- packages/shared` 零输出；④ `npm run smoke:server` 130/0 + CAP01~05——
**本会话亲跑两轮**；⑤ 手动 E2E 五点位——**本会话亲跑 23/23**（§3）。

## 5. 零接触面核验（SPEC §1.2 逐项，全部零改动）

| 面 | 核验方式 | 结果 |
| --- | --- | --- |
| `packages/shared/**`（SSE 契约/DEFS） | `git diff HEAD --stat -- packages/shared` | 零输出 ✓ |
| `apps/web/src/app.css` / `Skeleton.tsx` | `git diff HEAD --stat --`（同命令合并跑） | 零输出 ✓ |
| `apps/server/src/mcp/`（registry/inject 等） | 同上 | 零输出 ✓ |
| 渲染模板与处理器（capsHtml/capsChips/change） | git diff hunk 亲核 + 字面量逐字节比对 | 仅供数链改动，模板/处理器零 diff ✓ |
| 零新依赖/零新 env | git status 无 package.json/config.ts；E10 零出站 | ✓ |
| 既有 golden s0~s12 零重录 | git status 13 场景零 M（gate:update 净效果零，JOURNAL §7 取证复核） | ✓ |

## 6. 发现与建议

### BUG-0027 · Major · 既有缺陷（非本轮引入，不阻塞验收）

- **现象**：产品后端 `GET /`（静态托管 apps/web/dist/index.html，
  `apps/server/src/server.ts:64-65`）在本机 win32 返回 404（Express/send 对
  盘符绝对路径 `D:\...` 的行为，`NotFoundError: Not Found` @ send/index.js:861），
  即 `npm start` 在本机无法同源打开前端 UI（/api/v1/* 正常）。
- **证据（本会话亲跑）**：① 最小复现：仅 express `res.sendFile()` 一个存在
  的 dist/index.html（零迭代代码参与）→ 404；② 主干同版构建（未经本轮改动）
  同探针 → 404。**与迭代 0039 无因果**（该路由本轮零改动）。
- **影响**：本机 win32 的 `npm start` 一体化入口失效；Linux/CI（POSIX 绝对
  路径）不受影响；本轮验收以透明反代组合绕过（见 §3 口径），验证对象未受损。
- **建议**：入 BACKLOG（debt，S/M）；候选修法 `res.sendFile(WEB_INDEX)`
  改 `res.sendFile(WEB_INDEX, { root: '/' })` 或 `res.type('html').send(...)`。
  golden 权威与 CI 不受影响。

### 测试基建备注（非产品缺陷，供后续 VERIFY 轮参考）

1. `saveLocal()` 为 **350ms 防抖**（app.js saveLocal 实现）——任何「改完立即读
   localStorage」的自动化断言须 ≥600ms 等待，否则读到旧值（本轮已踩并修正）。
2. caps 勾选框为视觉隐藏的 switch input（`<label class="switch"><input><i>`），
   Playwright 真实鼠标 click 会因不可见超时——用 `el.click()` DOM 激活（change
   事件真实触发）。
3. `page.addInitScript` 播种会在**每次 reload 重播种** localStorage，使「刷新
   恢复」类断言失真——须改为「goto → 手动 setItem → reload」。
4. 本机双实例**并发**起服会 `SQLITE_BUSY`（两进程抢同一 data/agentflow.db，
   JOURNAL §3 已载）；本会话全程序列均串行，未复现。

## 7. 回归抽查对照（test-manager 职责清单本轮覆盖项）

拖拽（R1）/ 撤销重做（R2/R3）/ 滚轮缩放（R4，空白处画布缩放 + 选中数字框步进
门控逻辑未触）/ 勾选变更（B8/B12/B13 真实 change 链）/ 展开交互（A4/B4/B5/B6）/
面板滚动位置（实现按 :1046 先例保持，E2E 到达重渲染后断言面板内容在位）；
其余清单项（框选/连线/导入导出/多标签等）以既有 13 场景 golden 零波及 +
`s0~s12 diffPx=0`（脚本门禁）为回归面背书。未逐项手测的清单项在此如实列明。

## 8. 验收裁定

- **PASS**。BK-0049 验收口径（BACKLOG 行「注册表条目出现在勾选清单」 +
  PRD 五 REQ + SPEC §8 九行验收表）全部满足且证据在案。
- BUG-0027 为既有环境缺陷，建议独立立项，不改变本轮结论。
- 后续：MERGE 阶段按流程在主干做端到端复测（build/gate/test/smoke 四项 +
  evidence/ 留档）；golden 权威以 CI `ui-constitution` 为准。
