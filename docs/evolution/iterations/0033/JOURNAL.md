# JOURNAL · 迭代 0033 · BK-0036 网页展示节点（webshow）BUILD 轮实施记录

> 执行者：code-developer · 2026-10-25（工作树 `.zcode/worktree/feat/0033-iter`，分支 `feat/0033-iter`）
> 输入：`iterations/0033/PRD.md` + `iterations/0033/SPEC.md` + ADR-0015（定界权威）。
> 本文如实记录落地过程、门禁实测、SPEC 偏差与环境发现；VERIFY 复验请对照 §5 判据索引。

## 1. 开工前置（SPEC §9-8）

- 工作树状态核对：`git status --short` = `M docs/evolution/BACKLOG.md` + `M docs/evolution/STATE.md`
  + `?? docs/evolution/iterations/0033/`（与 SPEC §0 记载一致），HEAD = `84ee8ec`，产品代码零未提交改动。
- 基线门禁（改动前实跑）：`npm run build` ✓（vite built）→ `npm run gate` **10 场景全绿
  diffPx=0** → `npm test` **30 pass / 0 fail**。起点绿，开工。

## 2. 落地面（与 SPEC §2 表 19 项一一对应）

| # | 文件 | 动作 | 实测（numstat） |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/webshow/node.ts` | 新增 24 行 | §3 终稿全文逐字落盘 |
| 2 | `packages/shared/src/nodes/webshow/README.md` | 新增（生成器产出） | 五段结构 + MANUAL_NOTES |
| 3 | `packages/shared/src/nodes/README.md` | 总索引再生成 | +webshow 行（setvar 后）+「18 种」文案 |
| 4 | `packages/shared/src/nodes.ts` | +1 import +1 键 + 头注 | 145 → 147 行（webshow 位于 setvar 后、approval 前） |
| 5 | `packages/shared/test/nodes.baseline.json` | 再生产 | 17→**18 键**，diff 恰 +28 行/+1 键，键位 D1 |
| 6 | `tools/gen-node-readmes.mjs` | 三处 | :107「18 种」/ :117 `!== 18` / MANUAL_NOTES +webshow 条目 |
| 7 | `packages/shared/test/nodes-dirs.test.mjs` | D===18 | :5 注释 + :31 断言同步 |
| 8 | `packages/shared/test/defs-drift.test.mjs` | +webshow 行 | 计数 36→38、头注/标题/消息同步（偏差 d/e 见 §4） |
| 9 | `packages/shared/test/contract.test.mjs` | 18 种/length 18 | :10-11 |
| 10 | `packages/shared/test/synthesis.test.mjs` | caps 回归锚 + EXPECTED_ORDER +webshow | 偏差 f 见 §4 |
| 11 | `packages/shared/test/readme-consistency.test.mjs` | 计数文案 18/19 份 | 含 :4 头注陈旧值同步 |
| 12 | `apps/server/src/handlers.ts` | +webshow 键 | 298 → **317 行**（+19，≤400 ✓）；零新 import |
| 13 | `apps/web/src/legacy/app.js` | 四处纯插入 | 2650 → **2684 行**（+34）；`setNodeOut` 逐字节零改动（§5 断言） |
| 14 | `apps/web/src/app.css` | +4 行纯插入 | `.node.st-done .node-out` 后，三个新选择器 |
| 15 | `tests/smoke/smoke-server.mjs` | O 组 O01~O05 + wfShow | 1129 → **1271 行**（+142） |
| 16 | `tools/pixel-gate/gate.mjs` | WEBSHOW_WF_SEED + s10 行 | 332 → **343 行**（+11，纯插入，比对逻辑零触碰） |
| 17 | `tests/golden/ui/s10-webshow-node.{png,invariants.json}` | 新增 | golden-created 通道（1600×900 PNG + 公共六键不变量） |
| 18 | `tests/golden/ui/s3-library.png` | **零触碰** | 实测 diffPx=0，未走重录（偏差 a 见 §4） |
| 19 | `docs/adr/0015-presentation-triplet-nodes.md` | 实施轮增补 | 状态行 + §7.1 纪要 + §2.4/§5 计数校正 17→18 |

## 3. 门禁实测（BUILD 自测全记录，均为本会话实跑）

### 3.1 基线（改动前）

`npm run build` ✓ → `npm run gate` 10 场景 pass diffPx=0 → `npm test` 30/30。

### 3.2 golden 双通道时序（SPEC §7.3 步骤序，实测对 SPEC 的偏差见 §4-a）

- ① `npm run build` ✓（dist 351.31 kB → 352.85 kB，webshow 入列）。
- ② `npm run gate` 首跑：**s0~s9 全部 pass diffPx=0 + s10-webshow-node `golden-created`**，
  宪法门禁通过、退出码 0——**s3-library 未 FAIL**（SPEC 预期 FAIL；成因见 §4-a）。
- ③ `npm run gate:update` **未执行**：WORKFLOW §4 修宪轮条款为「gate 失败时允许执行一次」
  ——gate 未红，通道前置不成立，通道未消费（不做无依据重录）。
- ④ 复跑 `npm run gate`：**11 场景全绿 diffPx=0**（app.js 传参修复重建后再次复跑仍 11/11，
  s10 对既有基线 diffPx=0——修复仅涉运行分支，静态渲染零变化）。
- ⑤ `git status --short -- tests/golden/ui/` = **恰 2 路径**（s10 png + s10 invariants，
  均 `??`）；s3 两文件零 diff；`tests/golden/diff/` 零残留。s10 png 亲验：output 粉色
  类目标题栏 + globe 图标 + in-url 端口 + 兜底网址/沙箱隔离两 widget 行 + 一条连线 +
  独立标签页「网页展示示例」，与 SPEC §7.1 采集面一致。

### 3.3 契约测试

`npm test`（根链 build:shared + build:server + shared 契约）**30 pass / 0 fail**——
nodes-dirs D===18 / defs-drift 38 参数（webshow url `''` + sandbox `true`）/ contract 18 /
synthesis（EXPECTED_ORDER 含 webshow + caps 回归锚）/ param-handler-guard 38 + 僵尸清单
3 项 / readme-consistency 19 份幂等 / handlers-coverage ⊇ NODES。`node -e` 亲数 baseline
**18 键含 webshow**，快照 diff 恰 +1 键（键位 setvar 后 approval 前）。

### 3.4 后端冒烟（时点性假红如实记录）

`npm run smoke:server` 实得 **89 passed / 1 failed**——唯一 FAIL = **V09**
（「git status --porcelain -- packages/shared 为空」前置：本轮 shared 有未提交产品改动，
正是 SPEC §9-2 预判的提交前时点性假红，0018/0021/0022/0031 同款先例，提交后复跑自愈，
VERIFY 以提交后实得值为判据）。V09 的 `C.ok` 抛 SmokeFailError 触发 fail-fast，
**套件内排在 V 组之后的 O 组/A 组/Z 组本轮被跳过**，故 O 组以独立实例先行实证：

- **O 组预验（临时脚本复刻 O01~O05 判据，独立实例实跑，脚本在系统 TEMP 不入库）**：
  O01 URL 透传（outputs 含 URL + out 摘要锚 + output 事件 text=URL）✓ / O02 静态兜底
  （trigger 对象归空→params.url 生效）✓ / O03 `javascript:` 降级（ok:true + outputs=[] +
  占位 out + warn 含「webshow」「占位降级」+ 零 output 事件）✓ / O04 空输入降级同判据 ✓ /
  O05 契约零新增（40/40 事件过 validateEvent）✓。
- 全量套件绿（含 O 组在套内执行 + A/Z 组恢复）待脚本产品提交后由 VERIFY 复跑出实得值。

### 3.5 AC6 手动 E2E 四点位（浏览器真实路径，PLAYWRIGHT 实跑全绿）

承载方式见 §4-g（工作树环境限制）。七断言全 PASS：

1. `AC6-①` 节点库**输出**分组出现「网页展示」（组计数 2→**3**，条目序 直接回复 | 变量赋值 |
   网页展示，globe 图标 svg 在，无 mini-tag）；
2. `AC6-②` 拖入画布（seed 预置）节点底盘：`--nc=#f472b6`（--cat-output 粉）+ in-url 入端口
   （title「网址 · 类型：任意」）+ 兜底网址/沙箱隔离两 widget 行；
3. `AC6-③` 连线 1 条（in-url ← 上游）；
4. `AC6-④a` 真实在线运行（SSE node:done 路径）：`.node-out` 出现 `.ws-frame`，
   `src=https://example.com/agentflow`、**`sandbox=""`（默认最严）**、`referrerpolicy=no-referrer`；
5. `AC6-④b` widget 关掉「沙箱隔离」重跑：iframe `sandbox` 属性**移除**（src 不变）——用户
   显式选择责任翻转；
6. `AC6-④c` defv 改 `javascript:alert(1)` 重跑：占位 `无有效网址 · 占位呈现`（前端双保险拒绝）；
7. `AC6-console` 全程 **零 console error**（favicon 已路由消音；含 pageerror 监听）。

### 3.6 机器证明面（AC5 / AC2③ / AC3 代码级断言）

- 禁区零 diff（`git diff --name-only` 恒空）：`package-lock.json`、`events.ts`、
  `nodes.schema.ts`、`types.ts`、`index.ts`、`engine.ts`、`guard.ts`、`Skeleton.tsx`、
  `server-sync.js`、`tests/canvas/**`、`.github/**`、既有 17 节点目录内容。
- 变更全景 `git status --porcelain`（除 docs/evolution 机制件）恰 §2 表 19 项 +
  17 份既有 README 的 EOL 工作区状态噪声（`git diff` 内容比对为空，`git add` 归一后
  不入提交；真实内容变化 numstat 仅总索引 README）。
- AC2③ 零出站：webshow handler 体 `grep -cE "fetch|guardedFetch|AbortSignal|http\."` = **0**；
  `guard.ts` 零 diff；handlers.ts 零新 import。
- AC3：`setNodeOut` 增删行 **0**（diff `^[+-].*setNodeOut` 零命中）；新增行 `allow-`/
  `innerHTML` 令牌 **0**；sandbox 仅 `setAttribute('sandbox','')` 或不设置（无中间态、无
  `allow-*` 分化）；前端 `WS_HTTP_S`（app.js:1900 `/^https?:\/\/\S+$/i`）与 handler 正则
  （handlers.ts:247）字面量一致。

## 4. SPEC 偏差与实施决策（如实记录，VERIFY 复验对照）

- **a · s3-library 未重录（golden:update 通道未消费）**：SPEC §7.3 预期 s3 FAIL，实测
  s3 diffPx=0——节点库面板 900px 视口只渲染到「逻辑」分组（golden 亲核），输出分组
  （含计数徽标与新条目）在折叠线以下，像素零变化。gate 全绿 → 「gate 失败时重录一次」
  前置不成立 → 不重录（比预期保守，PRD 风险表「s3 重录通道被泛化」风险的天然兑现）。
  PRD AC4「s3 经修宪轮 gate:update 一次通道重录后全绿」的落点改为「s3 零漂移实测全绿、
  通道未消费」——**golden 区恰 2 路径变化（s10 两文件），恰合一但路径少于 SPEC 预期**。
- **b · EXPECTED_ZOMBIES 增 `['webshow', ['sandbox']]`**：SPEC §6.5 断言「两参数均被
  引用 → 零新僵尸、EXPECTED_ZOMBIES 不动」，但其自身 §4.1 伪码 handler 只引用 `p.url`，
  §5.3 又把 sandbox 消费定在前端（`paramsOf(n).sandbox`）——矛盾。按 NDP §6.4 机制语义
  如实登记 UI-only 僵尸（与 trigger.mode/cron/path 同类），不伪造服务端引用。
  AC1 相应实得：param-handler-guard = 总数 38 + 僵尸清单 3 项。
- **c · `setNodeWebshow(id, ev)` 直读事件载荷**：SPEC §5.2 设计 `webshowUrlOf(n)` 读
  `lastRunData`，但其指定插入点（node:done case 的 setNodeOut 后、barDone 前）在
  `lastRunData.set`（case 尾）**之前**——AC6 E2E 实跑捕获：输入端口路径必落占位分支
  （静态兜底路径不受影响）。修正为 `setNodeWebshow(ev.id, ev)` 直读 node:done 事件
  `inputs`（与 lastRunData.set 将写入的数据同源），`webshowUrlOf(n, inputs)` 保留
  lastRunData 兜底回退；插入位不变（既有 measurePorts+updateEdgesOf 消化 iframe 撑高，
  AGENTS.md portCache 陷阱条款）。
- **d · defs-drift webshow 行对齐**：SPEC §6.2 字面 `webshow:     {`（5 空格）与表内
  `{` 列对齐惯例不符（setvar 行 7 字符键 + 5 空格；webshow 8 字符键应对齐 4 空格），
  按 4 空格落盘（`{` 同列），值字面量逐字一致。
- **e · readme-consistency 头注**：SPEC #11「:5 注释」实指头部注释块——`:4` 的
  「总索引 16 行」为 agent 入列前陈旧值，一并同步「18 行」（注释性文字，零行为）。
- **f · synthesis caps 回归锚**：SPEC §6.4「:20 跳过集 +`|| type === 'webshow'`」与其
  括注意图「断言 webshow 无 caps 键（回归锚）」互相矛盾——加入跳过集会**豁免**该断言。
  按意图落盘：webshow 不进跳过集，由循环 `!('caps' in def)` 自然覆盖，另加显式回归锚
  断言一行（`!('caps' in NODES.webshow)`）；标题按 SPEC「其余 15 键」→「其余 16 键」。
- **g · handler 签名 `ctx`**：SPEC §4.1 伪码首参为 `ctx`（体内 `ctx.outputs!.push`），
  首次落盘误写 `_ctx` 致 `TS2552` 编译红，即刻修正为 `ctx`（与 reply 同构）。
- **h · 环境发现（非产品缺陷、零产品改动）**：工作树路径含 `.zcode` 点目录段，
  express `res.sendFile` 底层 send 的默认 `dotfiles:'ignore'` 策略将其判为 dotfile →
  后端 `GET /` 托管 404（`existsSync` 守卫照常通过；主仓路径实测 200；gate 自带静态
  服务器不受影响）。AC6 E2E 以「临时静态自服务（fs 直读 dist，同 gate.mjs）+ /api
  反向代理真后端（流式透传 SSE）」承载。后续迭代/合并仲裁员注意：工作树内浏览器联调
  需同法或回主干；**不在本轮改 server.ts**（越出白名单，且主库行为无变化）。

## 5. PRD AC1~AC7 逐条结论

| AC | 结论 | 证据 |
| --- | --- | --- |
| AC1 DEFS 入列与契约全绿 | ✅ | §3.3（30/30；18 键 diff 恰 +1；D===18；38 参数；19 份） |
| AC2 呈现承载语义 | ✅（提交前 V09 假红如实记录） | §3.4（O 组独立实证 5/5；零出站 grep=0；guard.ts 零 diff） |
| AC3 画布 iframe 安全呈现 | ✅ | §3.5 ④a/④b/④c + §3.6 代码级断言 |
| AC4 修宪 golden 双通道 | ✅（s3 零漂移、通道未消费——偏差 a） | §3.2（11 场景 diffPx=0；golden 区恰 2 路径；意外红 0） |
| AC5 白名单与零依赖/零契约 | ✅ | §3.6 禁区零 diff + numstat 白名单吻合 |
| AC6 手动 E2E 四点位 | ✅ | §3.5 七断言全 PASS、零 console error |
| AC7 指针抽样 | ✅ | PRD AC7 所列锚点本会话全部打开核对（nodes.ts/baseline/reply 样板/nodes.schema/handlers/app.js/app.css/gate.mjs/ADR-0015 各节） |

## 6. 回滚指针

单提交 revert 即整体回退（s10 两基线随提交删除、baseline 18→17、守卫计数、ADR-0015
增补段）。实施中未触及 PRD out of scope（服务端抓取 / PTY / 新 SSE 事件 / sandbox
组合放权均零发生），无需工作树整体丢弃路径。
