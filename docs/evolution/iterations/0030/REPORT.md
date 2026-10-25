# REPORT · 迭代 0030 · BK-0039 会话面板右侧工作台容器与三页签定界 + 分批修宪 ADR 草案（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 14:20
> 输入：`PRD.md` AC1~AC7（S 项 skipSpec=true——验收口径内嵌 PRD §7）+ `JOURNAL.md`
> 移交说明（含 §3.1 项目根锚定机理偏差 / §3.2 行数预算低估两处提请裁定）。
> 环境：Windows（win32 10.0.26300）· Git Bash · HEAD = aec5eb1 · 工作区含本迭代
> 未提交产物（产品提交按工作流机制归脚本统一执行、VERIFY 先于产品提交时点——
> `.zcode/workflows/evolution-iteration.dwf.ts` 既定机制，0029 REPORT 同款口径）。
> 门禁分工：`npm run build` / `npm run gate` / `npm test` 已由脚本统一执行且通过
> （派发指令明示，本轮不重复跑全套）；本轮亲跑的针对性 E2E = `npm run
> smoke:server` + `npm run test:canvas` + 浏览器交互回归抽查（见 §2/§3）。

## 0 · 总结论

**PASS（7/7 AC 全过，零缺陷，无需修复轮）。** 纯文档轮兑现：产品面恰
`docs/adr/0016-workbench-right-panel-git-diff-tree.md` 一文件纯新增（**286 行**
≤400、在 PRD 建议区间 260±60 内；UTF-8 无 BOM 纯 LF），七要素成节可索引
（§1~§7 各成 `##` 节 + §8 收尾）、草案双位标注 + 授权链 issue#4 批复
2026-10-23T15:49:17Z 承继（gh 亲核 issue#4 OPEN 且标题与本链范围逐字对口）；
20+ 代码锚点与代码逐一相符**无一杜撰**（本会话 Read/grep/sed 逐条亲核，含
JOURNAL §3.1 锚点行号偏移后的 ADR 实际转写复核）；BACKLOG BK-0040/0041/0042
三行备注与 ADR §7 三段权威字面量**逐字全等（VERBATIM OK ×3，本会话独立 node
脚本全等亲跑，长度 1154/848/943）**，状态列 proposed 不动、BK-0039/BK-9004 行
零触碰；`apps/packages/tools/tests/.github/package*.json` 禁区 diff 恒 0 行 +
package-lock.json 零变化（零代码/零依赖机器证明）。针对性 E2E：smoke:server
亲跑 **95 passed / 0 failed**（exit 0 退出码语义亲核；基线零漂移，V09 时点性
假红未出现——shared 干净）+ test:canvas **15 passed / 0 failed** + 浏览器交互
回归抽查 4 项通过（初始渲染 / 选中节点→属性面板渲染 / 节点库 7 类目 /
ctrl+wheel 滚轮门控缩放；#rightbar 唯一住户 #props 的 live 佐证恰为本 ADR §1
核心论据）。BUG 清单：空。

例外说明（派发指令预见的并行收尾情形未发生）：STATE.md `iteration` 仍为
0030（phase 本轮按派发指令 BUILD→VERIFY 改写），本报告按常规 VERIFY 路径产出。

## 1 · AC 逐条结论与证据

### AC1 · ADR 落盘与七要素完备 — PASS

命令与输出（本会话亲跑）：

- `ls docs/adr/ | grep -c 0016` → **1**（恰一文件
  `0016-workbench-right-panel-git-diff-tree.md`，编号按落盘时序顺延成立，
  现行至 0015 后恰一新文件）；
- `wc -l` → **286 行** ≤400（AGENTS.md 硬性约定 4 达成；在 PRD §7 建议区间
  260±60 内）；
- `grep -n "^## "` → §1 动机(:26) / §2 容器信息架构（必答项①，:60）/ §3 端点
  契约（必答项②，:118）/ §4 防越界与安全面（必答项③，:197）/ §5 分批修宪
  编排(:214) / §6 golden 增量预案(:235) / §7 定界回写索引(:254)——**七要素
  逐项成节可索引**（+§8 影响面与不做范围 :274，ADR-0015 §8 同款收尾）；
- 状态行 :3-5 = 「**草案 · 待实施轮消费**（BK-0040/0041/0042——链终轮）」+
  授权链「issue#4 用户批复承继（2026-10-23T15:49:17Z，见 BACKLOG BK-9004 行）」；
  标题 :1 含「草案」二字；`grep -c "草案 · 待实施轮消费"` = 1；
- `grep -c "已批准"` → **0**（非功能要求 3：全文无批准态措辞；零依赖面无
  0014 式「待用户批准」位——与 ADR-0013/0015 样板一致）；
- BOM/EOL：首三字节 `# A`（od 亲核，无 BOM）；`grep -c $'\r'` = 0（纯 LF，
  非功能要求 4）。

### AC2 · 定界锚点真实可核 — PASS（无一杜撰）

逐条亲核（Read / `grep -n` / `sed -n` 本会话输出）：

| ADR 引用锚点 | 本会话核实结果 |
| --- | --- |
| `Skeleton.tsx:136-137` | :136 注释行 + :137 `<aside id="rightbar"><div id="props"></div></aside>` ✓（#props 为 #rightbar 唯一住户，另经浏览器 live 复核，见 §3） |
| `app.js` props 操作面 | `grep -n "#props"` 恰 7 行：:914 renderProps `const box = $('#props')`、:1001 change、:1025-1026 滚动恢复、:1037 click、:1047 模板 textarea 查询（ADR 未列、非矛盾）、:1065 input、:2128 `$('#props').contains(document.activeElement)` 焦点归属 ✓——ADR 引用的六处全数命中 |
| `app.css:23/:333/:335` | :23 `--props-w:264px`、:333 `#rightbar{…}`、:335 `#props{…}` ✓ |
| `server.ts:205-219` | :205-213 workflows/runs v1-only 注册（含 ADR-0007 删除端点）+ :215-219 sessions 五端点（POST/GET/GET/POST/POST 恰五行）✓；:197-203 `/api` 与 `/api/v1` 双 base 循环（旧别名不承接新端点）✓；:173 limit 1-100 → 400 先例 ✓ |
| `sessions.ts:46/:52/:77` | :46 400（limit）/ :52 404 / :77 409，`{ error:'…' }` 形态 ✓ |
| `code.ts:7/:50/:53` | :7 `import { spawn } from 'node:child_process'`、:50 `spawn(cmd, argv, …)` argv 数组、:53 `setTimeout(…, 5000)` 超时 kill ✓ |
| `tools.ts:16/:18-22` | :16 SANDBOX 常量（import.meta.url 模块级锚定）+ :18-22 safePath（resolve 后前缀校验 + throw「路径越界：只允许访问沙箱目录」）✓——PRD 写 :18-20、实际函数体至 :22，ADR 已按实际转写（JOURNAL §2 如实记录） |
| `config.ts` 零 PROJECT_ROOT | `grep -rn "PROJECT_ROOT\|workbench\|WORKBENCH" apps/server/src/` → **零命中**（exit 1）✓（workbench 零现状论据成立） |
| `gate.mjs` 场景表 | `sed -n '176,190p'`：SCENARIOS 定义 :176-187 **恰 8 场景 s0~s7**，`routes: WF_ROUTES`(:181) / `routes: RUN_ROUTES`(:182) ✓——PRD 写 :177-186、实际 :176-187，ADR 引用按实际（同上偏移转写） |
| 容器信息架构节显式覆盖 | §2.1 属性面板共存**三选一表**（A 页签并入 / B 独立容器切换 / C 会话面板联动，各列利弊）+ 推荐 = B（#props 零触碰）✓（AC2 必答项①） |
| 端点契约节显式声明 | §3 头部「**零出站**（全部本地：git 子进程 + Node fs）」+ 零 shared 契约 + v1-only ✓；§3.0 **零 env 推荐案** + 评估反转即中止转 needs-approval 护栏写死 ✓（AC2 必答项②③的前置声明面） |

**JOURNAL §3.1 偏差裁定：认可。** PRD 背景 5 / §7 原推荐「项目根锚定 =
process.cwd()」；BUILD 以实测证据改写为模块级常量锚定（tools.ts:16 SANDBOX
同构）。本会话**独立复现实测**：`npm exec -w @agentflow/server -- node -e
"console.log(process.cwd())"` → 输出 `D:\Projects\CodeRepo\agent-workflow\apps\
server`；且根 `package.json:17`（start）与 `:26`（dev:server）均为
`npm start -w @agentflow/server` 形态——生产启动路径下进程 cwd = apps/server
而非仓库根，「cwd 即项目根」前提在本仓启动拓扑下**不成立**（tree 页会错锚为
apps/server 子树）。PRD §7 自带顺位「CONSTITUTION > 代码现状 > 本 PRD」授权按
代码事实转写；**零 env 不变量原样保持**（模块级常量锚定非环境变量，无
WORKBENCH_ROOT 类覆盖项）→ 不触 PRD 的需批准面中止条件（该条件针对「需新增
env 语义」的反转，本轮推荐案仍零 env）。ADR §3.0 将 cwd 案以实测证据记为
「评估后否决」并写明仅存例外形态——定性准确，非杜撰。

### AC3 · 分批编排与 golden 预案成文 — PASS

- **§5（:214-233）**：一页签一迭代口径齐备——**BK-0040（容器+git，批次 1，
  容器为本链共享基建先行）→ BK-0041（diff）→ BK-0042（tree，链终轮）**（
  :216-217，与 ROADMAP.md:193-194 链序、BACKLOG 拆分口径一致）；每批受影响面
  **四件套表逐批列明**（:222-226：① 前端三文件 ② 后端 workbench 端点 ③
  smoke 扩断言 ④ gate 场景增量，三行各自具体化）；**BK-0042 链终轮 CLOSE 回执
  issue#4 关单口径在列**（:232-233，沿 issue#10/11 终轮先例、中间子项不回执）；
  与 ADR-0015 §5 的同构/差异注记成文（不涉 shared DEFS / 无 baseline/守卫联动，
  :228-231）；
- **§6（:235-252）**：**双通道口径**（新场景 golden-created + 受波及既有场景
  修宪轮重录；既有场景零波及须 gate 全场景实测确认才免，:246-248）；每批一个
  右栏在线态新场景；**场景编号按落盘时序**——s8/s9 已由 ADR-0013 §6 预定
  （本会话亲核 ADR-0013:219 `s8-agent-node` / :222 `s9-goal-panel-online` 与
  ADR-0016 引文逐字一致）、s10+ 由呈现链与本链按实际落盘序交错不锁死
  （:243-245）；**WB_ROUTES 路由 fixture 需求评估成文**（:249-252：右栏打开即
  fetch、无 mock 像素不可复现 → 预期需要，WF_ROUTES/RUN_ROUTES 先例）。

### AC4 · 定界回写 VERBATIM 一致 — PASS

本会话独立程序化比对（临时 node 脚本亲跑，非复用 BUILD 产物）：

- 从 ADR §7 提取 ` ```text ` 围栏代码块 → **恰 3 段**；
- BACKLOG `| BK-0040 |`(:53) / `| BK-0041 |`(:54) / `| BK-0042 |`(:55) 三行
  `split('|')` 备注列（第 10 列）trim 后与对应块**全等比较**：

```
BK-0040: status=proposed source=issue#4 remarkLen=1154 blockLen=1154 VERBATIM=OK
BK-0041: status=proposed source=issue#4 remarkLen=848  blockLen=848  VERBATIM=OK
BK-0042: status=proposed source=issue#4 remarkLen=943  blockLen=943  VERBATIM=OK
```

- 三行**状态列均 proposed、来源列均 issue#4、标题列逐字不动**（字段校验输出
  亲核）；BK-0042 备注内**链终轮回执 issue#4 关单口径保留**（与 ADR §7 第三段
  字面一致，AC4 专项要求）；受影响文件清单/验收命令口径/实施序/晋升条件四要素
  皆在字面量内（VERBATIM 全等即覆盖）；
- 周边行核对：BK-0039（:52，状态 `ready`——置 done 归 CLOSE，本轮未动 ✓）、
  BK-9004（:75，`skipped` + 批复时间戳 2026-10-23T15:49:17Z 在案 ✓）零触碰；
  `git diff --stat docs/evolution/BACKLOG.md` = **12 行（6+/6−）恰两处**：①
  BK-0036/0037/0038（:49-51）proposed→**ready** 晋升回写（PLAN 轮存量义务，
  PRD 选题存证第④条明载；带「2026-10-25 迭代 0030 PLAN 轮晋升 ready」注记，
  备注/VARBATIM 其余字面不动）② BK-0040/0041/0042 备注列回写（本 AC 对象）；
- 回写随归档提交入库（当前工作区态符合预期；产品提交仍恰 1 路径，见 AC5）。

### AC5 · 白名单与零代码机器证明 — PASS（工作区级；提交级归 CLOSE）

本会话亲跑：

- `git status --porcelain` → 恰 4 条：` M docs/evolution/BACKLOG.md`、
  ` M docs/evolution/STATE.md`（机制件）、`?? docs/adr/0016-workbench-right-
  panel-git-diff-tree.md`（**产品面恰一未跟踪路径**）、`??
  docs/evolution/iterations/0030/`（PRD/JOURNAL/REPORT 机制件）——白名单外
  零出现；
- `git diff -- apps packages tools tests .github package.json package-lock.json`
  → **0 行（恒空）**；`git diff --cached` 同域 → 0 行（无暂存残留）；
- `package-lock.json` 不在 porcelain → **零变化 = 零依赖机器证明**；
- **产品提交尚未落盘**（HEAD = aec5eb1，迭代 0029 归档提交）：`git show
  --numstat <产品提交>` 提交级终判沿 0018/0021/0022/0028/**0029** 先例归
  **CLOSE 于产品提交落盘后复核**（预期恰 `docs/adr/0016-*.md` 一路径
  +286/−0）——工作流脚本统一执行 git 操作、VERIFY 先于产品提交时点为既定
  机制（0029 REPORT :7-8/:135-136 同款记载），非本轮缺陷。

### AC6 · 纯回归面全绿 — PASS（smoke/canvas 本会话亲跑；build/gate/test 脚本侧）

- `npm run build` / `npm run gate` / `npm test`：**由脚本统一执行且通过**（
  派发指令明示「不要重复跑全套」，本轮未重复运行——如实记档非本会话亲跑）；
  本轮零代码机器证明（AC5 禁区 diff 恒空）与 gate 绿一致：dist 构建输入零漂移，
  gate 8 场景对象与基线无差异来源；
- **`npm run smoke:server`（本会话亲跑，AC6 点名 E2E）**：输出末行
  `==== smoke:server：95 passed / 0 failed ====`——**95/0 = metrics 0026~0029
  基线零漂移**；exit 0 语义亲核（smoke-server.mjs:947 `process.exit(C.failed
  === 0 ? 0 : 1)`）；**V09 时点性假红未出现**：V09 断言
  `git status --porcelain -- packages/shared` 为空（smoke-server.mjs:845），
  本轮 shared 零改动故绿（0018/0021/0022 的假红场景是产品提交前 shared 半边
  脏，本轮纯文档轮无此形态——与 PRD AC6 预案一致但未触发）；
- **`npm run test:canvas`（本会话亲跑，交互回归离线项）**：`15 passed /
  0 failed`（portCache 几何回归，0029 同款抽查基线一致）。

### AC7 · 指针抽样可开 — PASS（抽样 12 组 ≥5 下限）

全部本会话亲核命中：① Skeleton.tsx:136-137 ✓；② app.js:914/:1001/:1037/:1065/
:2128（grep -n 精确行号）✓；③ server.ts:205-219（+197-203/:173）✓；④
code.ts:50-53（+:7）✓；⑤ tools.ts:16-22 ✓；⑥ gate.mjs:176-187（SCENARIOS
恰 8 + WF_ROUTES/RUN_ROUTES）✓；⑦ ADR-0015 §5（:195）/§6（:211）成节 ✓；⑧
BACKLOG BK-0039(:52)/BK-0040(:53)/BK-0041(:54)/BK-0042(:55)/BK-9004(:75)
行 ✓；⑨ **issue#4**：`gh issue view 4` → OPEN ·「【待批准】BK-9004 · 会话面板
右侧工作台：git 信息 / diff 审查 compare / 项目目录树」——标题与本 ADR 定界
范围逐字对口 ✓；⑩ ROADMAP.md:126-128 差异化定位「画布编排 × 深度智能体
工作台」+ :186-195 SPEC 四连先行/BK-9004 链序（0042 链终轮回执 #4）✓；⑪
ADR-0013 §6 s8(:219)/s9(:222) 预定与 ADR-0016 §6 引文一致 ✓；⑫ cwd 实测
（`npm exec -w @agentflow/server` → apps\server + package.json:17/:26）——
ADR §3.0 否决论据独立复现 ✓。

## 2 · 交互回归抽查（浏览器 · dist 静态服 :4173 · IAB）

> 零 UI 代码改动（AC5 机器证明），抽查按 0029 先例做行为面抽样；静态服
> `npx http-server apps/web/dist -p 4173`（348KB 单文件自包含构建，curl 200
> 亲核），抽查毕已停服（PID 18500 kill 亲证）+ 关闭浏览器页签。

| # | 抽查项 | 方法 | 结果 |
| --- | --- | --- | --- |
| 1 | 初始渲染不变量 | evaluate 读 DOM | ✓ title=AgentFlow · 智能体工作流原型；`#viewport` 在位；**8 节点**（与 golden s0 基线一致）；**`#rightbar` 恰 1 子元素且 id=`props`**——ADR §1「#props 是 #rightbar 的唯一住户」核心论据 **live 佐证**；空态属性面板「属性/未选中任何对象」正常 |
| 2 | 选中节点 → 属性面板渲染 | gate.mjs:56-59 官方路径同款（evaluate 合成 mousedown+mouseup 于 `.node[data-id="3"]`） | ✓ 节点 3 进入 `selected` 态；`#props` 渲染该节点参数面板：标题「知识库检索#3」+ 4 组 widget（节点名称/知识库/Top K/相似度阈值）+ 4 输入控件 + 端口行（查询文本/片段列表）+ 复制/删除——app.js:914/:1001/:1037/:1065 事件面工作正常 |
| 3 | 节点库面板 | gate.mjs:53 `clickRail('nodes')` 同款 | ✓ 节点库展开，**7 类目**（输入/对话/知识/工具/逻辑/输出/人工）——与 0029 抽查记录一致 |
| 4 | 画布缩放（滚轮门控） | `#viewport` 派发 `WheelEvent(ctrlKey:true, deltaY:-240)` | ✓ `#view` transform `scale(0.55)` → `scale(0.61105)`（放大生效；plain wheel 不缩放的门控语义未破坏——事件带 ctrlKey 才触发，与 AGENTS 交互清单一致） |

环境差异记录（非产品缺陷）：IAB 后端下 Playwright locator 直点 `.node` 超时
（actionability 判定差异；CUA 坐标点击亦未触发选中——画布命令式层监听合成
事件序列），改用 gate.mjs 官方 selectNode 同款合成事件路径完成——与 CI
（gate s1-select-node 场景全绿，脚本侧）互为印证；golden 权威仍在 CI。

## 3 · 缺陷清单

**空。** 无 BUG-xxx 条目；两处观察项（非缺陷）：

- AC5 提交级 `git show --numstat` 证明因产品提交时点在 VERIFY 之后（脚本机制）
  挂起至 CLOSE 复核（§1 AC5）；
- IAB 浏览器 locator 点击行为差异（§2 环境记录，权威以 CI gate 为准）。

## 4 · 偏差裁定汇总（对 JOURNAL 移交两处）

| 偏差 | 裁定 | 依据 |
| --- | --- | --- |
| §3.1 项目根锚定 PRD「process.cwd()」→ ADR「模块级常量锚定（SANDBOX 同构）」 | **认可** | 本会话独立复现实测（cwd=apps/server + package.json:17/:26 `-w` 启动形态）；PRD §7 顺位「CONSTITUTION > 代码现状 > 本 PRD」授权；零 env 不变量保持 → 不触需批准面中止条件 |
| §3.2 PRD §7 骨架 §7 节行数预算 ~15 → 实际 20 | **认可（非硬性）** | VERBATIM 字面量不可压缩（1154/848/943 字符为 AC4 比对基准）；全文 286 ≤400 硬上限达成 |

## 5 · CLOSE 移交说明

- **BK-0039 置 done**；`metrics.md` 追加一行（gate/test 引脚本侧结果，smoke
  95/0、canvas 15/0 本报告亲跑值可引）；iteration → 0031、phase → idle；
- **issue#4 仅发进度回执不关单**（关单留 BK-0042 链终轮，BK-0039/BK-0042 行内
  明载，itemContinues=true，沿 issue#10/11 先例；gh 亲核 #4 现 OPEN、label
  needs-approval 维持）；
- 产品提交落盘后 CLOSE 复核：`git show --numstat` 恰 `docs/adr/0016-
  workbench-right-panel-git-diff-tree.md` 一路径 **+286/−0** + 禁区 diff 复跑
  （AC5 提交级终判）；归档提交纳入本目录三件 + BACKLOG/STATE/metrics 变更；
- BK-0040/0041/0042 状态全程 proposed 不动；BK-0036/0037/0038 已在本轮 PLAN
  晋升 ready（BACKLOG diff 亲核）——下轮选题按 ROADMAP.md:186-190 进入实现段
  （预期 BK-0033，BK-9002 链差异化主轴优先）；BK-0040 晋升条件 = BK-0039
  CLOSE 后由 PLAN 轮晋升。
