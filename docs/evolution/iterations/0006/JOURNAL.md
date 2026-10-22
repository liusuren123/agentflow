# JOURNAL · 迭代 0006 · BK-0004 portCache 失效场景回归测试（BUILD · 修复轮 1）

> 产出角色：code-developer（BUILD 阶段；修复轮 1 于 VERIFY FAIL 后进行）· 2026-10-22
> 输入：`PRD.md`（REQ-0004-01~06 / AC1~AC7）+ `SPEC.md`（§1 决策 D1-D6 / §2 受影响
> 文件清单 / §4 详细设计 / §5 验收口径）+ VERIFY 的 BUG-0001 清单。
> 实现严格按 SPEC §2 落点：`tests/canvas/` 新目录两文件 + 根 `package.json` scripts
> 一行，**零产品代码改动、零 UI 触碰、零依赖新增、零 CI 变更**（两轮均如此）。

## 1. 改动清单（3 文件，与 SPEC §2 一一对应）

| 文件 | 实际行数（SPEC 预估） | 内容 |
| --- | --- | --- |
| `tests/canvas/lib.mjs` | 147（~150；轮 1 +11） | 基建：`ROOT/TOL/DIST_HTML/EDGE_SEL` 常量、`preflight()`（缺 dist → 指引 + exit 1）、`startServer()`（仅 `/` → dist/index.html，其余 404 使 `ENGINE.probe` 走离线分支；默认 `listen(0)`，`CANVAS_PORT` 可注入）、`Checker`（ok/pre 双轨：`pre` 失败即记 FAIL 并抛 `PreconditionError` 中止该场景——非空虚设防的实现载体）、`SEED`（§4.3 字面量 + 见 §2 偏差）、`bootPage()`（1600×900 新页 → 播种 → reload → fonts.ready → 800ms）、`fit()`（SPEC §4.1 定稿实现体：d 属性正则提数 → `getScreenCTM` 世界系→屏幕系 → 与 `.port` rect 中心算 startDev/endDev；轮 1 增 `excludeIds` 页内定位新边——单往返，见 §6） |
| `tests/canvas/geometry.mjs` | 216（~230；轮 1 +12） | 入口：C1 单节点执行 / C2a+C2b 折叠展开 / C3 textarea 改高 / C4 拖拽位移 / C5 拖线释放→搜索弹窗新建节点自动连线（轮 1 改双时点，见 §6）；每场景独立 `bootPage` 播种、骨架 = 前置断言 → 合成事件操作 → 稳定等待 → fit；main 逐场景 try/catch（`PreconditionError` 不重复计败）+ finally 关浏览器/服务 + `X passed / Y failed` 汇总 + 退出码 |
| `package.json`（根） | +1 | scripts 增 `"test:canvas": "node tests/canvas/geometry.mjs"`（置于 `smoke:server` 行后，SPEC §2 原文）；`gate`/`test`/`build*`/`start`/`dev:*`/`smoke:server` 全部未动 |

两文件均 ≤400 行（AGENTS 硬性约定 4），无拆分需要。

## 2. 关键实现决策：种子 C3 敏感化（对 SPEC §4.3 的唯一实质偏差）

**偏差内容**：种子在 SPEC §4.3 字面量基础上追加节点 `C(reply, id=3, x:920)` +
边 `200(B.out[0]→C.in[0])`，`nextId` 3→4（C5 新节点 id 相应为 4，C5 新边排除法
同时排除 100/200）。C3 的 fit 断言标的由边 100 改为**边 200**。

**原因（源码级论证，反演实测佐证见 §4）**：SPEC 原种子的边 100 = `A.out[0]→B.in[0]`，
而 `makeNodeEl` 的 DOM 序为 head → progress → **ports-in** → widgets → ports-out
（`app.js:766-774`）——textarea 属 widgets，改高只下移其**下方**的 out 端口
（`app.css:220-261` 布局序），B 的 in 端口不动、A 不动。若按原种子断言边 100，
即使 `app.js:1669` 的 `measurePorts()` 被整体移除，连线两端点均未移动 →
startDev=endDev=0 → **假绿**，直接违背 PRD AC4「移除 app.js:1669 后 C3 必红」。
边 200 的 FROM 端点 = `B.out[0]`（widgets 之下，改高下移 60px），补齐该敏感性；
类型链 `llm.out(text)→reply.in(any)` 合法（typeOk，F7）。PRD（WORKFLOW 顺位高于
SPEC）的 AC4 敏感性要求以此满足；SPEC 其余设计（场景集、容差、通道边界、脚本
命名）照单承接。**改动面未扩大**（仍在 SPEC §2 白名单 `tests/canvas/` 内）。

其余实现要点（均在 SPEC 授权内）：
1. **C5 释放点换算**：屏幕坐标经 `getComputedStyle(#world).transform` →
   `DOMMatrix`（e/f=translate、a/d=scale）精确换算世界 (880,340)（B/C 之间空白），
   不硬编码 view 值——鲁棒于种子 view 与 `applyView` 的双重来源。
2. **C3 改高量**：`ta.style.height = (ta.offsetHeight+60)+'px'`（全局
   `box-sizing:border-box` `app.css:28`，offsetHeight 即 border-box 高，增量精确 60）。
3. **C1 完成判据**：`waitForFunction` 轮询 `.st-done` 且 node-out 非空（上限 3s），
   USERINPUT 固定 350ms/speed=1（RUN_META，F7），非脆弱。
4. **场景异常不重复计败**：`pre` 失败已记 FAIL，main 捕获 `PreconditionError` 静默；
   其他异常（选择器缺失/超时）才另记「场景执行异常」——保证 `X passed / Y failed`
   计数诚实。

## 3. 自检（BUILD 初轮内执行；断言基数 14 为轮 0 口径，轮 1 后见 §5/§6；
完整门禁 build/gate/test 由脚本统一执行，未自行运行）

| 检查 | 命令（仓库根实跑） | 结果 |
| --- | --- | --- |
| 语法 | `node --check tests/canvas/lib.mjs && node --check tests/canvas/geometry.mjs` | `syntax OK`；wc -l：136 + 204 行 |
| **现状首跑（AC7）** | `npm run test:canvas`（未修改的 dist） | **14 passed / 0 failed，exit 0**——全部 startDev/endDev=0.00px，**未发现存量失配**（REQ-0004-06 预案未触发） |
| 确定性（P2） | 连续两次 `npm run test:canvas` | 均 `14 passed / 0 failed`，结果一致 |
| dist 缺失防御（AC3） | 临时 `mv apps/web/dist dist.tmpbak` → `npm run test:canvas` → 还原 | 输出 `apps/web/dist 不存在——先在仓库根执行 npm run build:web（或完整 npm run build）后再跑本测试`，**exit 1**（不静默）；还原后复跑绿 |
| 产物零污染（P2/边界 3） | `git status --porcelain` | 仅 `package.json`、`tests/canvas/`、`docs/evolution/`（STATE+迭代目录，协调者/BUILD 契约产物）；`apps/**`、`packages/**`、`tools/pixel-gate/**`、`tests/golden|smoke/**`、`.github/**` 零改动 |

## 4. 单点反演抽查（BUILD 自证；AC4 全 5 点演练归 VERIFY，SPEC §5 #6）

因 §2 偏差建立在「原种子对 1669 反演盲」的分析之上，BUILD 做了一次单点实证
（临时改源 → `npm run build:web` → 跑 → 还原源码与 dist → 复跑）：

- **反演**：临时移除 `app.js:1669` 的 `measurePorts();`（保留 `updateEdgesOf`），
  重建 web 后 `npm run test:canvas` → **`✗ C3 · … startDev=60.25px, endDev=0.00px`，
  13 passed / 1 failed**——仅 C3 红，偏差值与 §2「改高量直传 out 端口」逐字吻合
  （endDev=0 同时实证：该失效只有 widgets 之下的端口被 stale 缓存错位）。
- **还原**：源码经 git status 确认零残留 → `npm run build:web` → 复跑
  `npm run test:canvas` → **14 passed / 0 failed** 复绿。
- 结论：测试对陷阱真敏感（红得出来、绿得回去），§2 偏差必要性获实证。
  C1/C2/C4/C5 四点反演（1214/1078/1473/1272）留待 VERIFY 按 SPEC §5 #6 全量执行。

## 5. 断言基数口径（VERIFY 引用；轮 1 更新）

- **15 个命名断言**：C1（2 前置 + 1 fit）、C2a/C2b（各 1 前置 + 1 fit）、C3（1 前置 +
  1 fit）、C4（1 前置 + 1 fit）、C5（2 前置 + **2 fit**——早期 <220ms 自愈窗 + 300ms
  稳定，§6）；通过信息内嵌实测 startDev/endDev，失败信息含 TOL、实测值、
  edge（或排除表）/from/to 选择器（PRD 非功能 2）。
- 全程离线（静态服务 404 `/api/health` → `ENGINE.online=false`，F7）；零
  Playwright actionability API（全合成事件，PRD 风险 1 规避）。

## 6. 修复轮 1 · BUG-0001（C5 反演不敏感）的处置

**缺陷**（VERIFY 实测 + 源码级核实）：单独移除 `app.js:1272`（addNode 同步
`measurePorts()`）后 C5 仍绿——`app.js:1271` 的 220ms 定时器会做全量重测
（`app.js:792-804`）+ `updateEdgesOf`（`app.js:856-859`），把 portCenter 回退
猜测值（`app.js:805-809`）造成的 d 属性错位**自愈**；本测试 300ms 断言晚于
自愈窗（PRD ≥260ms 地板），对此单点反演结构性失明，违背 SPEC §5 #6
「app.js:1272→C5 红」。

**修复**（仅改 `tests/canvas/`，产品代码零触碰）：
1. `lib.fit` 增 `excludeIds` 参数：页内定位「id 不在排除表中的那条边」
   （新边 id 为 `Date.now()+random` 不可预测，`app.js:1299`），**单次 evaluate
   往返**完成发现+测量——把断言时点压到 click 返回后 ≈ms 级，稳进 0-220ms
   失效窗（多一次发现往返都可能吃掉预算）。
2. `geometry.c5` 改**双时点**：早期 fit（`<220ms 自愈窗`，锁 1272——丢失即
   portCenter 落回退猜测值，新边 TO 端 ≈140px 偏差）+ 既有 300ms 稳定 fit
   （覆盖入场动画/最终态，命名后缀区分）。创建类前置（节点/连线计数）需额外
   往返、后置于早期断言；存在性由 fit 自身保证（边缺失即抛错判场景失败，
   无「没建出来所以贴合」的假绿路径，REQ-0004-03 精神不受损）。

**自检（修复轮内实跑）**：

| 检查 | 命令（仓库根） | 结果 |
| --- | --- | --- |
| 语法/规模 | `node --check` ×2 + `wc -l` | `syntax OK`；147 + 216 行（均 ≤400） |
| 现状源码双时点 | `npm run test:canvas` | **15 passed / 0 failed**（C5 两时点均 0.00px）；连续两次结果一致（确定性） |
| **BUG-0001 反演** | 临时仅移除 `app.js:1272` 的 `measurePorts();`（1271 定时器原样保留，git diff 1 行）→ `npm run build:web` → `npm run test:canvas` | `✗ C5 · …（早期时点 <220ms 自愈窗）（startDev=0.00px, endDev=141.38px）`，**14 passed / 1 failed**——早期时点必红，偏差与 VERIFY B5b 实测（141.38px）及 SPEC §4.2 预测（≈140px）一致；300ms 时点仍绿（自愈路径本体，属预期） |
| 还原 | 源码经 git status 确认零残留 → `npm run build:web` → 双跑 `npm run test:canvas` | 均 **15 passed / 0 failed** 复绿 |
| 改动面 | `git status --porcelain` | 仅 `package.json`、`tests/canvas/`、`docs/evolution/`；`apps/**`（含本轮反演临时改动，已还原）等白名单外路径零残留 |

**未运行**（脚本统一执行）：`npm run build` / `npm run gate` / `npm test` /
`npm run smoke:server` / AC4 全量反演复验 / 产品提交。
