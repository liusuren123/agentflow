# 迭代 0072 · PRD — BK-0065 0071 轮 Minor 观察项注释同步（inject.ts:38 实参形态笔误 + capabilities.ts:37 头注「零 IO」语境过时）

> PLAN 轮产物（WORKFLOW.md §4 PLAN 契约 v2/v3，隔离工作树 feat/0072-iter）。S 项免独立
> SPEC：受影响文件清单与验收口径内嵌于本 PRD（§4/§5），返回 skipSpec=true。

## 0. 结论与分类（先行）

- **建议：做**（本轮项；outcome=replenished 补题轮）。ready 队列唯一项 BK-0018 被并行
  工作流占位禁选 → 规则④证据补题，同径先例 BK-0052（0040）/BK-0053（0041）/
  BK-0054（0045）/BK-0055（0046）/BK-0056（0047）/BK-0057（0050）/BK-0059（0051）
  连续同型 done。本项与 BK-0055/0056 同性质（源码注释/头注与实况同步），证据 =
  `iterations/0071/REPORT.md` §7 OBS-001/OBS-002 两项 Minor 观察项 + 本轮代码现场
  亲核复核成立（§2）。
- **触UI 分类结论：否**。仅改 `apps/server/src/mcp/inject.ts:38` 注释块一处实参形态
  字面与 `apps/server/src/capabilities.ts:37` 头注一处语境句——零行为、零 shared 契约、
  零 golden、零依赖、零 env、零出站、零前端。POLICY 自主区（「文档与实现同步」+
  后端 `apps/server/src/**` 自主演进射程）。
- **非修宪轮**：全程禁 `npm run gate:update`，golden 零接触；S 项 skipSpec。
- **单轮项**：无批次编排、无姊妹子项、无来源 issue（sourceIssue 不设、
  itemContinues=false、reconstitutional=false）。

## 1. 选题过程存证（枯竭判定 + 批复同步 + BK-0064 延后裁定）

选题前置亲核（本会话实跑/实读，均在隔离工作树 feat/0072-iter 内，2026-10-31）：

1. **ready 队列**：`grep -n "| ready |\|| proposed |\|| pending-approval |\|| blocked |\|| doing |" docs/evolution/BACKLOG.md`
   全表非终态恰两行——BK-0018（:116，ready，P2/S，0068 失败后的重试轮）与 BK-0064
   （:85，proposed）。BK-0018 被并行工作流占位**本轮严禁选择**（派发提示明令；
   `.zcode/locks/items` 本轮 `ls` 亲核恰 `BK-0018` 一个条目）。
2. **批复档案**：approved 无 / rejected 无 → 规则①③零建行、零解锁、零 skipped 改写。
   issue 面板 #16/#17 虽挂 needs-approval 标签，批复早已分别在迭代 0069
   （2026-10-30T14:40:18Z）与迭代 0068（2026-10-30）消费记账（BACKLOG BK-0014/
   BK-0018 行备注在案；BK-0014 已于迭代 0071 终态 done、issue#16 关单归脚本），
   本轮零新动作；#12（CI 像素门禁 s3 亚像素抖动）未获批，属 golden/pixel-gate/CI
   需批准射程，维持待批准不自主处理（0045~0050 同判先例）。
3. **侦察档案**（派发指令携带）：残缺标记唯一实质项 browser stub（tools.ts:138）
   系 ADR-0011 评估终态非缺陷不立项（0041~0051 连续同判在案）；tools.ts:5 系 stub
   设计说明非缺陷；apps/server/package-lock.json:787 系 integrity 哈希内 "XXX" 字符
   误报非标记；悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系治理日产物，
   心跳不重复采集。
4. **近 3 迭代（0069/0070/0071）在档观察排查**：
   - 0069 REPORT：§7 缺陷清单**零产品缺陷**（V09 时点性假红 + 验证脚本字段名笔误
     均过程级已闭环），§8 移交注意三项均过程级且已随合并 65e8c98 消化——无遗留立项点；
   - 0070 REPORT §8「如实声明与遗留」：六项全过程声明（numstat 口径 / AC9 引用口径 /
     E2E 语义承载 / 工作树 data/ 内 status=**stopped** run 记录不入库非悬挂 / V09 假红
     自愈 / gh 亲核归 CLOSE）——无遗留立项点；
   - 0071 REPORT §7：**OBS-001 / OBS-002 两项 Minor**「留合并轮或治理日顺手处置」，
     本轮 grep `0071/MERGE.md` 对 "OBS-00" 零命中（合并轮未处置）→ 由本项承接闭口
     （BK-0053 先例：「留治理日」标签不阻心跳入选——metrics 0035 留治理日 → 0040
     补题 → 0041 心跳入选同径）。两项观察均经本轮代码现场亲核**仍未修复**（§2 证据）。
5. **BK-0064 延后裁定（本轮最重要的选题负决定）**：BK-0064（proposed，P2/S，0068
   REPORT §二 BUG-0068-05 剥离立项）证据指针有效，本可作为第二补题候选，但——
   - BK-0018 重试轮正并行在途，其重试范围含「BUG-05 选项 A = MEM05 期望对齐实测
     现实 + ADR-0024 §4.1 行为特征补记」（BACKLOG BK-0018 行重试范围原文），即把
     冒烟负例断言对齐到「工具 execute 异常 → 静默 tool-result 回灌 → 预算耗尽 →
     空文本 ok:true、用户零可见」的**现状**；
   - BK-0064 的实施内容恰是**改写该现状**（llm.ts execute 包装器异常捕获 → emit
     warn + 触发既有降级直生成轮）。两轮先后合入主干时：
     - BK-0018 先合：BK-0064 在其上改写行为并同步断言，安全——行内依赖注「BK-0018
       重试轮完成其 MEM05 期望对齐后本项即唯一负例行为改写者」即此序；
     - **BK-0064 先合：BK-0018 重试轮工作树内基于旧现实对齐的 MEM05 合并后主干复测
       必红 → BK-0018 第二败 → 触发「连续 2 次同项 failed」熔断置 stuck（WORKFLOW
       §5.4；BK-0018 行熔断提示在案）**，且其「期望对齐」工作整轮作废；
   - 合并顺序不受 PM 控制（两路并行，合并锁只串行化不排序）→ 知情选择冒险不合算：
     收益仅一轮提前，代价可能是用户面 stuck + 并行轮成果作废。
   - **裁定**：BK-0064 延后至 BK-0018 收口（终态 done）后的下一轮 PLAN 首选（届时按
     BK-0052 同径 promote ready + 入选）；本轮已在 BK-0064 行追加延后注留痕，防下轮
     PM 在 BK-0018 未收口时误选。

## 2. 背景与问题（证据现场复核，2026-10-31 本轮亲核）

迭代 0071（BK-0014 扩展发现器）VERIFY 产出两项 Minor 观察项（REPORT §7），均系
BK-0014 落地时注释/头注未随代码形态同步，行为正确、纯文本面：

- **OBS-001 · inject.ts 注释实参形态笔误**：
  - `apps/server/src/mcp/inject.ts:38`：` * BK-0014：源 = composeSources(envLoader())——env 两源 + 发现快照（零 env 配置`
  - `:40` 实码：`const registry: McpRegistry = buildMcpRegistry(composeSources(envLoader), { httpFetch: mcpFetch });`
  - 注释写 `envLoader()`（调用形态），实码传**函数本体** `envLoader`（`loader()` 调用
    在 composeSources 内部首行，语义等价）。读者据注释会误以为此处立即调用 envLoader。
- **OBS-002 · capabilities.ts 头注语境部分过时**：
  - `apps/server/src/capabilities.ts:37`：` * 一致）。buildMcpRegistry 纯解析零 IO；warn 传 no-op——内置 id 冲突 warn 已由`
  - `:40` 实码：`const registry = buildMcpRegistry(composeSources(envLoader), { warn: () => {} });`
  - 头注断言「buildMcpRegistry 纯解析零 IO」——buildMcpRegistry 本身仍纯解析，但该行
    表达式现经 `composeSources(envLoader)` 组合，组合器含**模块级单次记忆化的启动期
    一次扫描 IO**（迭代 0071 / ADR-0023 落地；0071 REPORT §7 OBS-002 原文：「行为正确
    （两实例一致性由同一记忆化快照保证，反而更强）」）。头注使读者误读「表达式整体
    零 IO」。capabilities 为对外供数端点文件，IO 语义表述准确性有真实阅读价值。

## 3. 功能范围（改什么）

- **REQ-0065-01**：inject.ts:38 注释 `composeSources(envLoader())` → `composeSources(envLoader)`
  （词级替换；可在同注释块内补半句「传函数本体，loader() 于组合器内部首行调用」，
  以最小改动为准、非强制）。该行可执行代码零字节变化。
- **REQ-0065-02**：capabilities.ts:37 头注句刷新为区分两层的表述——「buildMcpRegistry
  本身仍纯解析；本行表达式经 composeSources 含启动期一次（模块级记忆化）扫描 IO，
  非每请求 IO」（措辞实施定），同块既有后半句「warn 传 no-op——内置 id 冲突 warn 已由…」
  语义逐字保留。该文件可执行代码零字节变化。
- **不做范围（out of scope）**：不新增断言（discovery 三态行为面已由
  tests/smoke/mcp-discovery.mjs MC01-22 守护、capabilities 供数面已由 CAP01-05 守护，
  注释无断言锚——BK-0055/0056 同口径）；不动两文件任何可执行语句；不动
  inject.ts:40 / capabilities.ts:40 表达式；不动 capabilities.ts:37 同块其余行；
  不处理 BK-0064（延后，§1.2）；不处理 #12（未获批）；不做任何「顺手」文本润色
  超出两处观察项范围。

## 4. 受影响文件清单（S 项 skipSpec 内嵌 · productFiles 白名单）

| 文件 | 改动 | 预算 |
| --- | --- | --- |
| `apps/server/src/mcp/inject.ts` | :38（注释块 38-39 内）词级替换 `envLoader()` → `envLoader`（可选补说明半句） | ±1 行 |
| `apps/server/src/capabilities.ts` | :37 头注句刷新（同块其余行逐字保留） | ±1 行 |

机制件（不入 productFiles、随机制件提交）：`docs/evolution/iterations/0072/PRD.md`、
`docs/evolution/BACKLOG.md`（BK-0065 建行 + BK-0064 延后注）、`docs/evolution/STATE.md`
（工作树过程态，不随分支合入主干）。

**验收命令口径**：`npm run build` + `npm run gate`（纯回归面）+ `npm test` +
`npm run smoke:server`；改动面机器证明（§5 REQ-0065-03）。

## 5. 验收标准（Given / When / Then）

- **REQ-0065-01（inject.ts 注释同步）**
  - Given `apps/server/src/mcp/inject.ts:38` 注释含 `composeSources(envLoader())` 字面，
    而 `:40` 实码为 `composeSources(envLoader)`；
  - When 注释按实码修正（仅注释 token 变化）；
  - Then 注释与实码实参形态一致；`git diff` 该文件仅注释行 M，可执行语句零变化。
- **REQ-0065-02（capabilities.ts 头注刷新）**
  - Given `apps/server/src/capabilities.ts:37` 头注断言「buildMcpRegistry 纯解析零 IO」，
    而 `:40` 表达式经 `composeSources(envLoader)` 组合（启动期一次扫描 IO）；
  - When 头注改为区分「buildMcpRegistry 本身纯解析」与「本行表达式经 composeSources
    含启动期一次（模块级记忆化）扫描 IO、非每请求 IO」的表述；
  - Then 头注不再支持「表达式整体零 IO」误读；该文件可执行代码零字节变化。
- **REQ-0065-03（改动面机器证明 + 回归面全绿）**
  - Given 本项为纯注释同步；
  - When 实施完成后在工作树内实跑门禁；
  - Then ① 产品面 `git diff` 恰 §4 白名单两文件且逐 hunk 均为注释行；② 禁区
    `git diff -- packages/shared apps/web tools tests/golden .github package.json package-lock.json`
    恒空（零 shared/零前端/零 pixel-gate/零 golden/零 CI/零依赖机器证明）；③
    `npm run build` ✓ + `npm run gate` 全绿（基线 21 场景 diffPx=0、**零 gate:update**）+
    `npm test` 30/30 + `npm run smoke:server` 零回退（工作树基线 196/0，0071 收口基线；
    s3-library 若现 diffPx≈21~23 本机采样抖动，按 issue#12 在案口径双留档 + 复跑，
    不消费 gate:update——BK-0059 AC6 预案先例）。

## 6. 非功能要求与护栏

- 零新增源文件、零 env、零依赖、零出站、零 shared 契约、零前端、零 golden；
  非修宪轮全程禁 `npm run gate:update`。
- 触UI 判定复核：inject.ts/capabilities.ts 均 apps/server/src 后端文件，`apps/web`、
  `packages/shared` 零引用其注释文本（注释无渲染因果）——按宪法第 4 条不触发门禁红线，
  仍走常规 review。
- 与在途并行轮零交集：BK-0018 重试轮重试面 = tests/smoke/mcp-stubs.mjs + MEM 套件 +
  ADR-0024（零产品代码）；BK-0064（延后）= llm.ts——均不含本项两文件。两文件主干
  自 0071 合并（8dbeca3）后无其他在途改写者。

## 7. 风险与移交

- **风险**：仅注释语义表述精度——OBS-002 的新表述须与 ADR-0023/composeSources 实际
  机制一致（模块级单次记忆化、启动期一次），SPEC 免除情况下由 BUILD 直接对照
  0071 REPORT §7 OBS-002 原文与 `apps/server/src/mcp/discovery.ts` composeSources 实现
  转写，VERIFY 复核。
- **移交 CLOSE**：来源非 issue，无回执义务；issue#12 维持待批准不动；BK-0064 延后注
  已在 BACKLOG 留痕，BK-0018 收口后的下一轮 PLAN 以其为首选。
