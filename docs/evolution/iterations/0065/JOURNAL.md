# JOURNAL · 迭代 0065 · BK-0047 retrieval kb 参数动态化（修宪轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-28
> 输入：`iterations/0065/PRD.md` + `iterations/0065/SPEC.md`（方案权威）；授权链
> issue#6 批复承继在案。本文件为 BUILD 过程留痕；全部改动发生在隔离工作树
> `feat/0065-iter` 内，主干零触碰。
> **修复轮（repair_round 1）留痕见文末 §7（BUG-0065-01）。**

## 1. 实施记录（按 SPEC §7 BUILD 实施序）

### ① 数据面 `apps/web/src/server-sync.js`（SPEC §2.1，caps 同构四件套）

- `kbShapeOf(j)`：GET /api/v1/kb 契约全字段形态校验（`{kbs:[{name,docs,chunks,
  updated_at}]}`，数组 + 四键 typeof 校验，非法抛错），校验后归一化全形返回
  （消费面当前只取 name，全形缓存为 BK-0048 与未来管理面留档）——capShapeOf
  （server-sync.js:120-140）同型。
- `export const fetchKbList = () => apiJson('/kb').then(kbShapeOf)`（apiJson 8s
  超时同口径）。
- `SVR` 增两键：`kbs: null`（null = 尚未成功拉取过 → 前端回退集）、
  `kbsErr: false`（静默降级，无 toast/日志行，capsErr 同口径）。
- 回调注册：`let …capsArrive = null, kbsArrive = null` + `onKbsArrive(fn)`。
- `refreshKbs()`：fire-and-forget，失败静默保持 SVR.kbs=null，到达回调照发
  （refreshCaps 同型）。
- 落点：kb 段紧随 capabilities 段（fetchCapabilities 之后），SVR/回调/refresh
  三处均紧随 caps 先例行——模块内聚与 diff 最小化。

### ② 消费面 `apps/web/src/legacy/app.js`（SPEC §2.2，五处增量）

- **import**：`refreshKbs, onKbsArrive` 并入 refreshSessions 段（原 :7-8）。
- **到达回调**（紧随 onCapsArrive 注册）：`if(!SVR.kbs) return;`（失败/未到达
  no-op，回退集不动）→ `state.nodes.forEach(n=>{ if(n.type==='retrieval')
  rerenderNode(n); })`（rerenderNode 自带 measurePorts+updateEdgesOf）→ 选中恰
  1 个 retrieval 节点时 `renderProps()` + `#props` scrollTop 保持（caps 先例同款）。
- **comboOptionsOf 纯函数**（紧邻 widgetHtml 定义，先于两渲染点消费）：
  `(node.type==='retrieval' && p.k==='kb' && SVR.kbs) ?
  SVR.kbs.kbs.map(x=>x.name) : p.o`——仅 (retrieval, kb) 命中换源，其余 combo
  恒 p.o；回退态 = DEFS 合成 `o` 原样（零拷贝零漂移，ADR-0003 单一来源）。
- **两渲染点换源**：`widgetHtml` combo 分支（原 :765-766）与 `renderProps` 单节点
  combo 行（原 :959）的 `p.o.map(...)` → `comboOptionsOf(node, p).map(...)`——
  模板字面量 / DOM 结构 / selected 按值匹配逐字不变，仅选项数组来源可替换。
- **选中时机刷新**：renderProps 单节点分支内 `if(n.type==='retrieval')
  refreshKbs();`（用户操作驱动、非轮询；离线静默失败）。
- **init 消费**：`refreshKbs();` 紧随 `refreshCaps();`（boot fire-and-forget）。

### ③ gate.mjs s20 场景（SPEC §4.3，golden-created 通道）

- 头注：场景总数 20→21，在线态清单补 s20 溯源（迭代 0065 / BK-0047 / ADR-0021）。
- `KB_FIXTURE`：四行 = seed 三固定名 + `kb-gate-ext`（fixture 独有名 =「供数链
  到达」确定性判据，s15 caps-ext 同型），行序按服务端 `ORDER BY name` UTF-8
  码点升序（FAQ-售前 < kb-gate-ext < 产品手册 v2.3 < 工单历史 2026）；四键
  `{name,docs,chunks,updated_at}` 逐键符合 ADR-0020 §5 契约，updated_at 取
  2026-01 整点毫秒（1767225600000/1767312000000/1767398400000）。
- `KB_ROUTES`：`**/api/health` + `**/api/v1/kb`（两 pattern 全串无重叠，注册序
  沿 SESSION_ROUTES 注记纪律）。
- `KB_WF_SEED`：trigger→retrieval 两节点，retrieval `params:{kb:'kb-gate-ext'}`
  ——seed 值刻意取 fixture 独有名：回退渲染期 selectedIndex=-1（既有行为）→
  到达重绘后 selected 命中 → 闭合态像素直接呈现「服务端清单可供新库被选中」。
- `kbReady` 探针（状态量非时延量）：面板 option 数===4 && 面板选中值===
  'kb-gate-ext' && 节点 widget 行选中值==='kb-gate-ext'（面板+画布双落 DOM）。
- `kbInv`（公共六键后 spread）：`kbOptions`（面板 option 全文本清单，序=fixture
  序）/ `kbSelected` / `nodeKbSelected`。
- SCENARIOS 增行：`{ id:'s20-retrieval-kb-online', routes:KB_ROUTES,
  timezoneId:'UTC', seed:…KB_WF_SEED, steps:[selectNode('.node[data-id="2"]')],
  ready:kbReady, inv:kbInv }`。

## 2. 自测记录（BUILD 自测，工作树内执行；官方门禁与提交归脚本）

| # | 命令（工作树根执行） | 结果 |
| --- | --- | --- |
| 1 | `npm run build` | ✓ vite 72 modules transformed，9.64s，无告警 |
| 2 | `npm run gate`（第 1 跑） | ✓ **s0~s19 全 pass · diffPx=0**（既有 20 场景零波及实测背书，SPEC §4.2 口径）+ `⊕ s20-retrieval-kb-online golden-created`；`宪法门禁：通过 ✓` |
| 3 | `npm run gate`（第 2 跑复跑） | ✓ 21 场景全 pass，**s20 pass · diffPx=0**（golden 确定性成立）；`宪法门禁：通过 ✓` |
| 4 | `npm test` | ✓ 30/30 pass（零 shared 案：nodes-dirs/defs-drift/synthesis 守卫零期望表变更，AC5） |
| 5 | `npm run smoke:server` | ✓ **168 passed / 0 failed**（既有基线零回退，AC7；本项零新增断言） |

- **s20 golden 双文件落盘核验**：`tests/golden/ui/s20-retrieval-kb-online.png`
  （61754 B）+ `.invariants.json`——invariants 实测 `kbOptions` = ["FAQ-售前",
  "kb-gate-ext","产品手册 v2.3","工单历史 2026"]（fixture 码点序）、
  `kbSelected` = `nodeKbSelected` = "kb-gate-ext"（面板+画布双落 DOM）；png 目检：
  属性面板与节点 widget 行 kb combo 闭合态均显示 "kb-gate-ext"，其余版面与
  既有形态一致。
- **AC9 白名单机器证明**（`git status --short` / `git diff --name-only` 实跑）：
  产品 diff 恰 = server-sync.js + app.js + gate.mjs；golden 变更恰 = s20 双文件；
  负清单（`packages/shared/**` / `Skeleton.tsx` / `app.css` / `apps/server/**` /
  `index.html` / gate 比对逻辑）零涉——git status 无对应路径。

## 3. 修宪轮通道消费记录

- **主通道**：s20 经 `npm run gate` 首跑自动 `golden-created` 落盘（gate.mjs
  `!existsSync` 即写盘），**非手工、非 `npm run gate:update`**——本轮未运行
  gate:update。
- **应急重录通道（SPEC §4.4）**：未消费——既有 20 场景零波及实测成立，触发条件
  ①不成立。
- **s3 抖动纪律**：本轮两次 gate 实跑 s3-library 均 pass diffPx=0，未触及
  issue#12 抖动口径；golden 权威在 CI。

## 4. 反转护栏自查（PRD G1 / SPEC §8）

- 零新增 npm 依赖（package.json 零改动）；零新增出站网络目标（前端 fetch 走既有
  同源 `/api/v1`，apiJson 复用，guard 出站面零涉）；零新增环境变量语义。
- 检索语义面零改动：handlers retrieval 链 / kb.ts / topk/th / DEFS 默认值零触碰
  （`apps/server/**`、`packages/shared/**` 零 diff 为机器证明）。

## 5. 改动面汇总（productFiles 白名单口径，相对工作树根）

| 文件 | 增/删行 | 总行数（≤400 约束核验） |
| --- | --- | --- |
| `apps/web/src/server-sync.js` | +28 / −1 | 311（既有文件，无新增源文件） |
| `apps/web/src/legacy/app.js` | +26 / −3 | 3357（既有文件） |
| `tools/pixel-gate/gate.mjs` | +50 / −3 | 712（既有文件） |
| `tests/golden/ui/s20-retrieval-kb-online.png` | 新增（gate 生成物，61754 B） | — |
| `tests/golden/ui/s20-retrieval-kb-online.invariants.json` | 新增（gate 生成物） | — |

机制件（不入 productFiles，随机制件提交）：`docs/adr/0021-*.md`（SPEC 阶段已
落盘）、`docs/evolution/iterations/0065/{PRD,SPEC,JOURNAL}.md`、BACKLOG/STATE
过程改动。

## 6. 遗留与移交 VERIFY

- 手动 E2E E1~E5（SPEC §5 / PRD AC8）未在本轮执行（浏览器级走查归 VERIFY
  test-manager）；s20 场景已在真实 Chromium 内实跑在线供数链（E1 的 DOM 级
  等价承载），E2 新库可检索 / E3 离线回退 / E4 保真 / E5 交互回归留待走查。
- 官方门禁（build/gate/test/smoke 的门禁留证口径）、golden CI 权威复核与
  双提交（产品 + 机制件）由脚本统一执行。

## 7. 修复轮（repair_round 1）· BUG-0065-01 · 2026-10-28

> 输入：REPORT §1（Critical：在线态选中 retrieval 触发
> renderProps⇄refreshKbs⇄onKbsArrive 自反馈死循环，实测 315 次 GET /api/v1/kb
> /3s；复验清单四条）+ 派发指令（更新 JOURNAL；官方门禁与提交仍归脚本）。

### 7.1 根因与修复方案

- **环的三条边**（REPORT §1 定位，本会话亲读复核）：renderProps 单节点分支
  `refreshKbs()`（app.js，SPEC §2.2-4）→ refreshKbs **无条件** `kbsArrive()`
  （server-sync.js:223，SPEC §2.1 携带缺陷）→ 到达回调 `renderProps()`
  （app.js，SPEC §2.2-2）→ 无限循环。`if(!SVR.kbs) return` 只防「未到达」，
  不防「已到达后的重复到达」，故环仅在在线态成立。
- **修复 = 数据层单点断环（「仅变更到达」）**：`refreshKbs` 成功且内容有变
  （含 null→首达；`kbShapeOf` 归一化输出键序固定，`JSON.stringify` 比对确定）
  才发 `kbsArrive`；失败保持原值且**不触发回调**（数据未变无需重绘；同时消除
  「stale+失败」型潜在环）。**app.js / gate.mjs 零改动**（REPORT §6 预期口径）。
  采用 REPORT §1 预告候选一「到达回调按选项集合实际变化判重后再重绘」；候选三
  「刷新点移出 renderProps」会砍 US-1（页面开着上传新库→重选即见），不取。
- 语义代价核查：选中/重选/撤销重做等每次 renderProps 仍至多 1 次拉取（用户
  操作驱动非轮询，PRD 口径保持）；数据变化路径有界收敛（F1 变更到达→重绘→
  F2 不变静默，共 2 次拉取后终止）。

### 7.2 自测记录（修复轮 BUILD 自测，工作树内执行；官方门禁归脚本）

| # | 命令/探针 | 结果 |
| --- | --- | --- |
| 1 | `npm run build` | ✓ vite 718.52 kB（index-DaTbpH9y.js），12.25s |
| 2 | 环复现探针（:3100 真实后端 + Playwright Chromium，REPORT 同款环境；脚本在系统临时目录 `verify0065-fix-probe.cjs`，不落源码树） | **A 对照**（选中非 retrieval 节点 3s）= **0 次**；**B 修复组**（选中 retrieval 3s）= **1 次**（REPORT 缺陷态 315 → 1，≤2 阈值达成）；**C 交互可用性**：`selectOption` 选 `FAQ-售前` 后 600ms 值保持（修复前 3 轮竞态全败）；**D US-1 保真**：上传 `repair-verify-0065`（201）→ 重选 retrieval → 选项含新库（变更路径 2 次拉取有界收敛）；**E 数据不变重选 3s** = 1 次、值稳定；console/pageerror 零 |
| 3 | A/B 归因实验（见 §7.3） | 修复版 s20 确定性 diffPx=15；缺陷版 s20 pass diffPx=0——15px 归因坐实 |
| 4 | `npm run gate`（修复版终态，共 3 跑：15/15/15） | s0~s19 全 pass diffPx=0（零波及保持）；**s20 FAIL diffPx=15（确定性，非抖动）**，DOM 不变量全等（输出无「DOM不变量变化」） |
| 5 | `npm run gate`（A/B 缺陷版对照，2 跑） | 一轮全 21 场景绿；一轮 2 个无关场景环境抖动违宪、复跑即绿（issue#12 类本机亚像素抖动，与 s20 无涉） |

未重复执行：`npm test` / `npm run smoke:server`（本轮改动仅 server-sync.js
前端数据面，shared 契约与 server 零涉；官方口径归脚本）。

### 7.3 s20 golden 缺陷态污染——归因证据与处置建议（需脚本/VERIFY 决断）

**现象**：修复版下 s20 恒定 FAIL diffPx=15（3 跑全 15，非随机）；DOM 不变量
逐键全等。**像素级定位**（pngjs 实测 golden vs current）：68 个任意通道差像素
（pixelmatch 计 15）**全部**位于属性面板四个表单控件（节点名称 input / 知识库
select / Top K / 相似度阈值）的 **x≈1583-1584 右缘 1px 边框**，通道差仅 1~2
（如 `[40,40,43]` → `[40,40,42]`，蓝通道恰差 1 的 AA 混合舍入差）——无任何
位移/内容/结构差异。

**归因（A/B 实验）**：s20 golden 落盘于本迭代 BUILD 首轮，彼时页面正处
BUG-0065-01 请求风暴态（选中后面板以 ~100 次/秒重建，golden 帧捕获于风暴中
某次重建后的光栅状态）。修复后末次重绘序列改变（面板重建 2 次→1 次），AA 边
缘的合成舍入残留随之改变。临时还原缺陷版重建后 s20 即 pass diffPx=0、恢复
修复版又恒定 15——**15px 是缺陷态 golden 的光栅污染，不是修复引入的视觉变化**。

**为何不可用代码复现旧光栅**：断环的任何正确修法（仅变更到达 / 移出刷新点）
都必然改变末次重绘序列；为对齐 15px 而保留冗余重绘 = 为 golden 追踪缺陷态，
违 0056 P1 精神，不取。

**处置结果（脚本已消费，2026-10-28 23:45）**：脚本按上述建议执行了恰一次
`npm run gate:update`（s20 双文件 mtime 23:45；s20 png 61754→61707 字节，
`.invariants.json` 内容与重录前逐键全等——view/nodes/kbOptions/kbSelected/
nodeKbSelected/counts 实读比对一致，仅 png 字节随干净稳态光栅更新）。
**恰枚举核验（本会话实跑）**：update 重写扫过全部 21 场景落盘，s0~s19 的
png 与 HEAD **字节一致**（git status 零 png 改动）、`.invariants.json` 仅
LF→CRLF 行尾漂移且 `git diff --stat` **零内容 hunk**——本会话已对 20 个行尾
漂移文件 `git checkout --` 恢复 HEAD 字节（0056 P1 恰枚举纪律），最终 golden
变更集 = **恰 s20 双文件**（git status 实证：仅 s20 png+invariants 两个
untracked 新文件）。

**重录后收尾核验（本会话 `npm run gate` 实跑 4 轮，自测口径）**：s20
**4/4 pass · diffPx=0**（重录基线与修复版完全吻合）；其中 1 轮 21 场景全绿；
另 3 轮各出现 1 个与本案无关的场景抖动违宪——已定位者为 **s3-library
diffPx=21**（diff 目录工件在案，issue#12 已知本机亚像素抖动、文档区间 21~23、
DOM 不变量全等），按 PRD 护栏纪律**不消费重录**、CI（windows-latest）为
golden 权威；该抖动在本会话此前 5 轮 gate 中均未出现（间歇性，与 machine 负载
相关），非本轮改动面（s3 场景与代码本轮零涉）。

### 7.4 修复轮观察项（非缺陷，不动文件）

- 新上传 KB 在清单中**追加于末尾**而非码点序位（探针 D 实测
  `repair-verify-0065` 列于 `工单历史 2026` 之后）：服务端 `apps/server/src/kb.ts`
  indexMeta Map 的 set 追加语义——新库 append 到 Map 尾，进程重启后才恢复
  `listKbStats` 的 `ORDER BY name` 码点序；kb.ts:53 头注「行序 = listKbStats
  的 name 码点升序」在**上传后、重启前**的窗口内与实现不符。属 BK-0019 存量
  行为；`apps/server/**` 在本轮负清单（AC9 零 diff），前端如实呈现服务端返回序
  （AC1「集合一致」不受影响）。建议另立 backlog 观察项（kb.ts 注释与实现对齐
  或 indexMeta 重排），不在本轮修复。

### 7.5 修复轮改动面（productFiles 口径不变，相对工作树根）

| 文件 | 修复轮增量 | 累计（相对分支基点） |
| --- | --- | --- |
| `apps/web/src/server-sync.js` | refreshKbs 重写（+10 行净增） | +38 / −1（321 行） |
| `apps/web/src/legacy/app.js` | 零改动 | +29 / −3（不变） |
| `tools/pixel-gate/gate.mjs` | 零改动 | +50 / −3（不变） |
| `tests/golden/ui/s20-retrieval-kb-online.{png,invariants.json}` | png 经脚本 gate:update 重录（缺陷态光栅→干净稳态，61754→61707 B）；invariants 内容逐键全等 | golden 终态 = 修复版稳态 |

### 7.6 移交 VERIFY（复验清单执行口径）

REPORT §1 四条中：① 请求计数已由 §7.2 探针预验（315→1、对照 0、重选 1），
VERIFY 可复跑；② T3/T4/T5 与 ③ T1/T2/T6c/B1 抽查待 VERIFY 复测（本 agent 未
执行浏览器级回归全量）；④ gate 已闭环——s20 经脚本 gate:update 重录后 4/4
pass diffPx=0（§7.3），s0~s19 零波及保持（png 字节一致），残余仅 s3 已知
issue#12 间歇抖动（CI 权威，非本轮改动面）。
