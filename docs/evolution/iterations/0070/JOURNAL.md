# JOURNAL · 迭代 0070 · BUILD（BK-0048 节点级 on-error 参数 + 属性面板 UI，修宪轮）

> 执行角色：code-developer · 2026-10-31 02:55~03:12 · 工作树 feat/0070-iter
> 输入：`iterations/0070/PRD.md` + `iterations/0070/SPEC.md`（§3 受影响文件清单 +
> §2 技术方案 + §4 golden 方案 + §5 smoke OEN 组矩阵）+ ADR-0025（授权链 issue#6）。
> 修宪轮：SPEC §4.3 golden 重录序列（gate 首跑核对 → `gate:update` 恰一次 → 复跑）
> **按派发指令归脚本统一执行，BUILD 未运行任何 gate/gate:update**；BUILD 自测仅及
> build 子步 / npm test / smoke（下表逐项实跑留痕）。

## 1. 实现过程（按文件，含关键决策）

### packages/shared/src/nodes/<21 type>/node.ts ×21（各 +8 行）

- params 数组**尾部**统一追加 SPEC §2.1 逐字双参数：`onError` combo 四值
  （`跟随全局`（哨兵默认）/`跳过`/`重试`/`中止`，value≡label）/ `onErrorRetries`
  number（default 2，min 0，max 5，step 1）。机械插入脚本按「`  ],` + `  binding:`
  唯一锚点」执行（CRLF 感知，21 文件恰 +8 行/文件，`git diff --stat` 亲验）；
  schema 既有形态容纳（combo default ∈ options[].value、number default ∈ [min,max]
  加载期校验全过），`nodes.schema.ts` 零改动。

### packages/shared/test/nodes.baseline.json（重生成）+ src/nodes/*/README.md ×21（重跑）

- NDP §2 命令原样执行：
  `node -e "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > packages/shared/test/nodes.baseline.json`
  （前置 `npm run build:shared`；+441 行，`.gitattributes` 钉 LF）。
- `node tools/gen-node-readmes.mjs` → 22 写入 / 0 无变化；21 份类型 README 各 +2
  参数行（`onError` combo 列 = `跟随全局 / 跳过 / 重试 / 中止`、`onErrorRetries`
  = `[0–5] step 1`，均「已实现」态）。**父级 `src/nodes/README.md` 虽被生成器写入
  但内容逐字未变（`git diff` 零行）**——白名单 glob `nodes/*/README.md ×21` 恰好
  成立，无清单外文件。

### packages/shared/test/defs-drift.test.mjs

- 期望表 21 型统一以 `...ON_ERROR_PARAMS`（`{ onError: '跟随全局', onErrorRetries: 2 }`
  常量展开）尾接——字面量仍单点定义、21 行逐型可见；计数护栏 44→86 ×1（断言体）；
  测试名「44/44」→「86/86」×2（头注 + test 名，BK-0053 名字面量随改纪律）；
  头注补 0070/ADR-0025 来源行。

### packages/shared/test/param-handler-guard.test.mjs

- `extractEngine` 增 SPEC §2.5 归属规则：`ENGINE_WIDE_PARAMS = ['onError',
  'onErrorRetries']`，行内 `p.` 键全属该键集时归属全部节点类型（condition 规则
  之后、`unattributed` 兜底之前；混入其他键仍落 unattributed 即红，不静默）。
  正向=逐类型存在性断言（21 类全带齐两参数的机器执法点），反向僵尸计算自然豁免
  （`EXPECTED_ZOMBIES` 零改动）；计数 44→86、注记续写「0070：44+21×2=86，僵尸 8
  不变 → 已实现 78」。
- 中间态实录：DEFS 落盘而 engine.ts 未改时本测试如预期红（21 型全成僵尸）——
  engine.ts 解析层落盘后回绿，即「漏改任一 node.ts / engine.ts 即红」的双向执法
  在本会话被实际观测。

### packages/shared/test/synthesis.test.mjs

- `EXPECTED_ORDER` 10 型尾键各追加 `'onError', 'onErrorRetries'`（+ 注记两行）；
  其余 11 型由 defs-drift `.sort()` 键集断言覆盖（SPEC §1.4 原设计）。

### apps/server/src/engine.ts（201 → 223 行，机制零新增）

- **解析层**（executeWorkflow 内、run 级三常量之后）：`ON_ERROR_NODE_MAP`（中文值
  → 枚举显式映射）+ `clampRetries`（`Math.max(0, Math.min(5, Math.trunc(Number(v)
  || 0)))`）+ `resolveOnError(p)`——优先序 ADR-0022 §5 写死：节点参数（若设，非
  哨兵）> env 全局默认 > 内建缺省 skip+0；重试次数仅 retry 语义消费（节点 retry 取
  `p.onErrorRetries` 默认 2，env 承接取 env 次数——陷阱破解）；退避基值恒 env-only。
- **重试宿主签名**：`callHandlerWithRetry(handler, args, title, retries)`——
  `maxAttempts = 1 + retries`（原读 run 级闭包值改入参）；delay/指数退避/通报先行/
  abortable sleep 竞速/中止上抛**逐字不动**。
- **runNode**：`const oe = resolveOnError(p)` 前段解析一次（循环子节点经 `sub()`
  逐 runNode 调用独立解析，ADR-0022 §2.4）；调用点传 `oe.retries`；catch 分派点
  `if(oe.strategy === 'abort') onErrorAborted = true`（原 env 判定改逐节点解析值）。
  标志位/主循环 fail-fast/`ok` 语义三处零改动。
- **对 SPEC §2.2 代码样的一处 TS 修正（语义零差，如实申报）**：样例的
  `(MAP as Record<...>|undefined)[key]` 在 `noUncheckedIndexedAccess: true`
  （tsconfig.base.json）下产生 TS2532（cast 把**对象本身**变 possibly-undefined，
  索引即报错）；改为 `const ON_ERROR_NODE_MAP: Record<string, 'skip'|'retry'|
  'abort'> = {...}` 声明态类型——未知键经 noUncheckedIndexedAccess 自然 `undefined`
  → 哨兵承接，运行时语义与样例逐位一致。`npm run build:server` exit 0 实证。

### tests/smoke/smoke-server.mjs（2633 → 2741 行，OEN 组纯插入 + 夹具/探针注记）

- **`wfOeFail` 扩展第 4 参 `np`**：node#2 params 尾接 `...(np || {})`——既有 OE01-OE08
  六调用点零改动（缺省 undefined = 逐字不变）。
- **`startOeMock` 失败条件扩展 `/oen*` 前缀**（零新增 mock）：OEN 夹具路径命中即
  `req.socket.destroy()`（OE03 同款确定性失败源）；`/oe-fail-always`/`/oe-fail-twice`
  语义逐字保留。
- **主实例与 oeSrvSkip 的 env 追加 `ALLOW_PRIVATE_NET: '1'`**（既有 env 语义，零新
  env——BUILD 决策，如实申报）：OEN03/OEN04 的「mock 命中计数恰 N」断言要求被测
  实例回环可达计数 mock；两实例断言（OE01/OE02）均不涉失败成因，OE05 的「已拦截」
  断言留在 oeSrvAbort（其 env 保持 `ALLOW_PRIVATE_NET: ''`）不受波及。改动前以
  `grep 已拦截\|127.0.0.1:9\|ALLOW_PRIVATE_NET` 亲核全文件确认零既有断言依赖主
  实例/skip 实例的 guard 拦截行为。
- **OEN01-OEN07**（OE08 后纯插入，每行恰一条复合 `C.ok`，命名沿 OE 组双行 fail
  形态）：OEN01 显式哨兵零漂移（主实例）/ OEN02 哨兵→env retry×2 承接（恰 3 +
  warn 恰 2）/ OEN03 节点重试×1 压制 env skip（恰 2 = 节点胜）/ OEN04 次数缺省
  默认 2 注入恰 3（**陷阱破解机器证明**）/ OEN05 节点中止 fail-fast 全链（ok:false/
  stopped:false + status='error'）/ OEN06 节点中止覆盖 env retry（恰 1 零重试 =
  策略类型节点胜）/ OEN07 loop 闭包子图 per-call（恰 2 = sub() 逐调用独立解析）。
  探针声明区注记 + 头注 OEN 组说明 + 编排行 `OE→OEN→C`。

## 2. 偏差与如实申报（均在白名单内，零射程扩大）

1. **V09 时点性假红（OBS-001 · 0018 REPORT 同判先例）**：V09 既有断言含
   `git status --porcelain -- packages/shared` 为空检查——BUILD 期（产品提交未
   生成）合法在改的 shared 使其为非空，且 `C.ok` fail-fast 会中断后续断言（首轮
   实测 97/1 中止于 V09）。处置沿 0018 REPORT「快照暂移复跑 84/0 → 还原零漂移」
   先例：`git stash push -- packages/shared` → 复跑 **196 passed / 0 failed（exit 0，
   OEN01-07 全 PASS）** → `git stash pop` 还原 → `git status` 改动集逐文件复核与
   stash 前一致 + `npm test` 复跑 30/30。**V09 在产品提交落地后自愈**（shared 入
   提交即干净），VERIFY/脚本门禁若在提交前跑 smoke 见 V09 唯一红，按本条处置，
   非产品缺陷。
2. **断言总数口径**：SPEC §5 预期 182→189 为名义值；实测汇总行计数随清理组 C01
   断言条数（= 自建 run 数）浮动——本轮 clean-tree 实跑汇总 **196 passed / 0
   failed**（含 OEN×7；既有断言零回退以逐条 PASS 为准，REPORT 可按实跑原文记录）。
3. **SPEC §2.2 样例 TS 修正**（见上 engine.ts 节，语义零差）。
4. **OEN06 夹具 URL 修正**：SPEC 矩阵未写明 URL 形态，首版误用 `127.0.0.1:9`
   （guard 形态，hits 断言失去计数硬证据）→ 改指计数 mock 路径 `/oen06`，恰 1
   命中即「零重试」的服务端硬证据（实测红→绿闭环在案）。
5. **golden 序列未由 BUILD 执行**（派发指令归脚本）：SPEC §4.2/§4.3 的「gate 首跑
   FAIL 集合 ≡ {s0..s20} 恰枚举核对 → `gate:update` 恰一次 → 复跑 21/21 diffPx=0
   → `git status tests/golden/` 恰 42 文件」四步请脚本按序执行并留痕；BUILD 已备
   妥的波及前提 = web build 成功（新 DEFS 进 dist 实证 `npm run build:web` ✓ 1.92s）
   + 参数行经 `makeNodeEl`/`renderProps` 通用渲染链进入每节点体（SPEC §4.2 判据）。

## 3. 自检（BUILD 内执行；完整门禁 build/gate/test 与 golden 重录及 git 提交由脚本统一执行，未自行运行 gate）

| 检查 | 命令（本会话实跑） | 结果 |
| --- | --- | --- |
| 契约测试（三改表 + 全量回归） | `npm test`（= build:shared + build:server + shared 30 测试） | **30/30 pass / 0 fail**（defs-drift 86/86、param-handler-guard 含 ENGINE_WIDE 逐类型断言、synthesis 序 + baseline 逐字节等价、readme-consistency、nodes-dirs、schema、events-negative、handlers-coverage 全绿）；stash 还原后复跑再证 30/30 |
| 冒烟（clean-tree 口径） | `git stash push -- packages/shared` + `npm run smoke:server` + `git stash pop` | **196 passed / 0 failed，exit 0**；OEN01-07 七条全 PASS（输出原文见 §4）；既有 OE01-OE08/A/V/K/G 等全组零回退 |
| 服务端编译 | `npm run build:server`（随 npm test） | exit 0（SPEC §2.2 样例 TS2532 修正后） |
| 前端编译 | `npm run build:web` | ✓ built in 1.92s（新 DEFS 进 dist，gate 前置就绪） |
| 冒烟脚本语法 | `node --check tests/smoke/smoke-server.mjs` | OK |
| 禁区机器证明（负清单） | `git diff --stat -- apps/server/src/config.ts packages/shared/src/events.ts apps/server/src/types.ts apps/server/src/server.ts apps/server/src/handlers.ts apps/server/src/llm.ts apps/server/src/agent.ts apps/server/src/store.ts apps/web/src packages/shared/src/nodes.ts packages/shared/src/nodes.schema.ts packages/shared/test/{nodes-dirs,contract,schema,events-negative,handlers-coverage,readme-consistency}.test.mjs tools/pixel-gate/gate.mjs tools/gen-node-readmes.mjs .env.example package.json package-lock.json .github tests/canvas CONSTITUTION.md` | **输出零行（全部零 diff）**——零新增 env / SSE 契约零变更 / 前端零改动 / 零新依赖 / gate 工具零改动 |
| 文件规模 | `wc -l` | engine.ts 223（≤400）；smoke 2741（既有文件不受上限约束）；**零新增源文件** |

## 4. OEN01-07 实跑输出摘录（clean-tree 口径，/tmp/smoke-run4.log）

```
PASS OEN01 节点 onError=跟随全局（显式哨兵）…（与 OE01 同型零漂移）
PASS OEN02 节点哨兵 + ON_ERROR=retry×2：… mock 命中恰 3（1+2）、log warn 恰 2 …
PASS OEN03 节点 onError=重试×1 + env=skip：… mock 命中恰 2（1+1，节点策略压制 env skip——节点胜）…
PASS OEN04 节点 onError=重试（次数缺省，env 三键钉空）：DEFS 默认 onErrorRetries=2 注入 → mock 命中恰 3 …
PASS OEN05 节点 onError=中止：… starts=[1,2] … run:done{ok:false,stopped:false,done=2} … status="error"
PASS OEN06 节点 onError=中止 + env=retry×2：mock 命中恰 1（零重试——节点策略类型覆盖 env 策略类型…）
PASS OEN07 loop 闭包子图内 http 节点 onError=重试×1：… mock 命中恰 2（1+1）… node:start 恰 1 次（重试不重跑）…
==== smoke:server：196 passed / 0 failed ====
```

## 5. 留给 VERIFY 的提示

1. **V09 时点性假红**（§2-1）：产品提交前跑 smoke 必见 V09 唯一红（fail-fast 中止
   于 V09，OEN 组在其后）。按 0018 OBS-001 处置：stash shared 复跑（本轮已留
   196/0 exit 0 实录）或引用产品提交后的脚本门禁结论；不得据此判 FAIL。
2. **golden 执法四步**（§2-5）：首跑 FAIL 集 ≡ {s0..s20} 恰 21/21；出现枚举外场景
   红 = 归因排查修 BUG，禁止重录掩盖（0056 教训）；`gate:update` 恰一次后复跑
   21/21 diffPx=0；`git status tests/golden/` 恰 42 文件（21 png + 21 invariants）。
   s3-library 抖动按 SPEC §4.4（issue#12）纪律。——**其中前三步的脚本侧执行与本轮
   产物级核验见 §6**；末步复跑仍待脚本执行。
3. **手动 E2E 五点位**（SPEC §6 E1-E5）与锚点抽样 ≥5 组按 SPEC §7 执行；锚点坐标
   实现后漂移（以实现为准，本会话 grep 实锚）：解析层块 engine.ts:87-101（注释
   87-91 + 映射 92-93 + resolveOnError 94-101）/ 宿主签名 :108-109 / runNode 解析点
   :147 / 调用点传参 :162 / abort 分派 :177。
4. 断言总数按实跑汇总行如实记录（§2-2），不写死 189。

## 6. 修复轮（验收/门禁问题排查 · 2026-10-31 03:2x~03:4x）

> 派发口径「修复验收/门禁发现的问题后完成本轮」。本节 = 对脚本门禁序列落盘痕迹的
> 逐一排查与结论；**全程未运行 npm run gate / gate:update / npm test / smoke / git
> commit（派发禁令），全部核验取自磁盘产物与 git 元数据**。

### 6.1 脚本门禁序列的落盘痕迹（mtime 重建，`ls --time-style=full-iso` 实测）

| 时刻 | 痕迹 | 判读 |
| --- | --- | --- |
| 03:16:15 | `packages/shared/dist/index.js` | 脚本 `npm run build`（shared 步） |
| 03:16:21-23 | `apps/web/dist/index.html` | 同上（web 步，新 DEFS 进产物） |
| 03:16:28~03:17:24 | `tests/golden/diff/` 63 文件（21×.diff.png + 21×.current.png + 21×.invariants.json） | **gate 首跑**：21 场景全 FAIL（gate.mjs:690-695 失败即写 diff 产物） |
| 03:18:07~03:18:59 | `tests/golden/ui/` 42 文件全部重写 | **`gate:update` 恰一次**（修宪通道，issue#6） |
| 03:18:59 之后 | 零新产物（仅 .mimosa hook-state 会话簿记） | **确认性 `npm run gate` 复跑未发生**——gate.mjs:709-711 全绿非 update 运行会自清 diff/（BUG-002），diff/ 仍在且 mtime 早于重录；若复跑失败则 diff 产物 mtime 必新于 03:18，亦不存在 |

### 6.2 逐项排查（问题清单 → 证据 → 结论）

1. **「首跑 21 场景全红」= 预期枚举，非缺陷**：diff/ 产物恰覆盖 s0~s20（21 份
   invariants，`ls tests/golden/diff/*.invariants.json | wc -l` = 21）——**恰等于
   SPEC §4.2 枚举（21/21，不多不少）**，即 REQ-0070-06 的「波及面以 gate 实测为准」
   实测兑现。s0 采样：diff/invariants `counts.widgets: 31`（15 + 2×8，SPEC §4.2
   预测值逐字命中）；`git show HEAD:tests/golden/ui/s0-initial.invariants.json`
   旧值 widgets=15、重录后 31（node 实读双值）。
2. **重录 golden 与改动面一致性 = 21/21 逐键全等**：对全部 21 份
   `diff/*.invariants.json`（首跑 current 捕获）vs `ui/*.invariants.json`（重录
   golden）做逐键 JSON.stringify 比对（node 脚本实跑）：**identical 21/21，
   mismatched NONE**——重录捕获的正是改动后 DOM；待执行的最终复跑以同一 dist
   （03:16:23 未再变）渲染比对同一 DOM 形状，确定性一致为预期（s3-library 亚像素
   抖动若现按 §4.4/issue#12 纪律处置）。
3. **diff.png 人工判读复核**：s0-initial.diff.png 红色像素分布 x-band 实测
   （node 脚本全图扫描）集中 x≤1300 画布节点区（每节点体 +2 widget 行、矩形增高
   连锁位移，枚举内形态）；初读疑似的属性面板区红色为缩略渲染误读——**面板区域
   （x 1340-1595, y 40-230）HEAD 旧 golden vs 首跑 current 逐像素比对 = 0 差异**
   （pngjs 实跑，差异阈值 6/255；空选面板为静态 HTML，app.js:962-969 亲读无 DEFS
   依赖，两证互恰）。
4. **新 widget 对 gate 探针零碰撞**：gate.mjs 全部探针为精确选择器
   （`:284` `#props select[data-k="lang"]` / `:294` `.node[data-id="2"]
   textarea[data-k="code"]` / `:344` `#props .cap-server input[data-sid]` / s19
   `.node[data-id="2"] input[data-k="session"]` 等，逐条 grep 审计）；新增
   `data-k="onError"` / `data-k="onErrorRetries"` widget 不与任何探针选择器相交；
   公共六键不变量（`:644-665`）的 counts.widgets/节点矩形随重录一致收敛（§6.2-2）。
5. **golden 变更集恰 42 文件**：`git status --porcelain tests/golden/ui` = 42 条
   ` M`、0 条新增/删除；`git diff --stat -- tests/golden/ui` = 42 files changed,
   147 insertions / 147 deletions（invariants 结构化重写，png 二进制替换）；diff/
   残留 63 文件系 `.gitignore` 明文的 `tests/golden/diff/`（主仓库 .gitignore
   「# 本地工具产物」段），不入提交、由最终全绿 gate 自清。
6. **产品文件面零新问题**：`git status --porcelain` 全量 94 条 = 42 golden + 48
   产品（21 node.ts + 21 README + baseline + 契约测试三件 + engine.ts + smoke）+
   BACKLOG/STATE 两机制件 + 2 untracked 目录（ADR-0025、iterations/0070/），与
   BUILD 申报白名单逐一对得上，零清单外文件。

### 6.3 结论

**未发现需要修复的产品缺陷**——门禁发现的红全部收敛为：① 首跑 21/21 = 枚举内
预期红（已被恰一次 gate:update 消费，宪法第 3 条通道在案）；② 待执行的确认性
gate 复跑（脚本侧职责，本轮按禁令未代跑）；③ 既有已知项 V09 OBS-001（§5-1，
提交后自愈）。产品文件相对 BUILD 交付态**零改动**（本轮未触碰任何源文件）；
golden 42 文件系脚本 gate:update 所写、经 §6.2 核验恰枚举恰一次。VERIFY 侧剩余
动作：终跑 `npm run gate`（预期 21/21 pass · diffPx=0，diff/ 自清）+ smoke
（V09 按 §5-1）+ 手动 E2E 五点位 + REPORT。
