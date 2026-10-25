# REPORT · 迭代 0035 · BK-0038 JSON 画布节点（jsoncanvas）——VERIFY 轮

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-26 00:44 · 隔离工作树
> `.zcode/worktree/feat/0035-iter`（分支 `feat/0035-iter`，BUILD 产品改动按 v3 时序
> 待 VERIFY 后由脚本双提交，本轮全部验收在**未提交工作区**上进行）。
> 输入：`iterations/0035/PRD.md`（Given/When/Then）+ `iterations/0035/SPEC.md`（§9 AC 口径）
> + BUILD 产物（JOURNAL.md + 工作区 diff）+ 脚本已跑的 build/gate/test 结论（派发指令给定）。

## 一、结论

**PASS** —— PRD 六条 REQ 与 SPEC AC0~AC8 逐条核验，未发现产品缺陷（BUG 清单为空）；
交互回归抽查 8 项全绿。 VERIFY 期间实际执行的三类检查：① 静态核验（SPEC §2~§8 白名单
逐文件比对 + AC5 禁区/纯插入/grep 断言）；② 后端冒烟实跑（官方套件 89P/1F + 一次性副本
125P/0F，J01-J04 亲验）；③ 浏览器真实 E2E 五点位 + 回归抽查（在线真实运行路径，零模型调用）。

## 二、验收矩阵（AC 逐条）

| AC | 口径 | 结果 | 证据（本轮亲跑 ✎ / 引用 ※） |
| --- | --- | --- | --- |
| AC0 基线 | build/test/gate/smoke 四项起点全绿 | ✅ | ※ SPEC §0.1 亲跑在案（build ✓ / test 30 / gate 12 场景 diffPx=0 / smoke 118）；脚本于工作树内复跑 build/gate/test 全绿（派发指令给定） |
| AC1 gate | 13 场景全绿 + s12 golden-created + 既有场景零波及 + gate:update ≤1 | ✅ | ※ 脚本工作树内 `npm run gate` 通过（13 场景含 s12）；✎ 静态佐证：`git status --porcelain`（本轮收尾复核 39 条目）中 golden 区**仅新增** `tests/golden/ui/s12-jsoncanvas-node.{png,invariants.json}` 两文件、`git diff -- tests/golden/ui/` **恒空**（s3-library 与 s0~s11 基线字节级零变更=零波及+gate:update 0 次的字节级佐证）；s12 不变量 `counts{nodes:2,edges:1,widgets:3,ports:2,tabs:1}`、view `translate(60px,40px) scale(1)`、节点2 `300x323`（含树区，对照节点1 `300x133`）、cssVars 键集与 s11 全等 32 键零新增（node 亲比 s11/s12 两文件）——与 SPEC §5.1 预期逐项一致 |
| AC2 契约 | npm test 30 项零回退 + 计数联动 | ✅ | ※ 脚本工作树内 `npm test` 通过；✎ 五测试联动 diff 逐一亲读：contract 19→20（消息+断言）、nodes-dirs `D.size===20`+头注、defs-drift +`jsoncanvas:{expand:2,fmt:true}` 行（:32，webshow 后）+40→42+头注/注释、param-handler-guard +`['jsoncanvas',['expand','fmt']]` 僵尸行+total 40→42+注释追加（已实现 32 不变）、readme-consistency 计数串 20 ×4 + 头注「18 份」→「20 份」；baseline.json 亲点 **20 键**且键序=声明序（…webshow,**jsoncanvas**,approval）；synthesis 零改动（git diff 恒空） |
| AC3 冒烟 | 118 断言零回退 + J01-J04 | ✅ | ✎ 亲跑 `npm run smoke:server`（工作树）：**89 passed / 1 failed**——唯一 FAIL 为 **V09 环境哨兵**（`git status --porcelain -- packages/shared` 要求干净检出；预提交树必然脏，actual `51/51；shared=M packages/shared/src/nodes.ts` 即 **schema 校验部分 51/51 全过**，0034 JOURNAL 同款先例）。为亲验 J 组（fail-fast 未达），按 0034/0035-BUILD 先例做一次性副本（仓库外 data/.verify-smoke，仅豁免 V09 的 shared-clean 环境子句、其余逐字节同源）：**125 passed / 0 failed**（exit 0）——**J01** PASS（out=`已呈现 JSON · 2 项`+output 恰 1 条 text=`{"a":1,"b":2}`+run:done.outputs 含全文）、**J02** PASS（空输入 `已呈现 JSON · 0 项`）、**J03** PASS（tpl=hello→`已呈现原文 · 5 字（非 JSON，前端原文降级）`+output text=hello）、**J04** PASS（mock 模型请求数零增量）。副本即删，工作区复原（git status 复核 39 条目=BUILD 原状） |
| AC4 手动 E2E 五点位 | 浏览器实跑 | ✅ | ✎ 详见 §三（全部亲跑，在线真实 SSE 路径，零模型调用） |
| AC5 白名单与禁区 | 改动恰为清单+禁区恒空+零依赖+纯插入+grep | ✅ | ✎ `git diff --numstat`：app.js +110/**0**、app.css +15/**0**、gate.mjs +16/**0**、smoke-server.mjs +85/**0**（删除行全 0=纯插入）；禁区路径（package.json / package-lock.json / engine.ts / guard.ts / events.ts / Skeleton.tsx / nodes.schema.ts / server.ts / util.ts / synthesis.test.mjs / CONSTITUTION.md / AGENTS.md / .github/）`git diff --stat` **恒空**（package-lock 零变化=零依赖）；`grep -rn "node-pty"` 全库恰 1 命中=`packages/shared/src/nodes/termview/node.ts:6` 既有禁令注释（本轮零触碰）；app.js **新增行** grep `contenteditable/<input/stdin` **零命中**（既有文件的既有 input 控件非本轮新增）；改动文件集=git status 39 条目，与 SPEC §7 清单逐一对上（17 号 s3 重录预期不在集内 ✓；另 20 个既有节点 README 经 `git diff --ignore-cr-at-eol` 逐一核验为 **EOL 归一噪声零内容差**，内容级真差仅 nodes/README.md 总索引 +1 行 +「19 种」→「20 种」）；handlers.ts 插入位=webshow 闭合与 approval 之间、engine.ts 零改动（HANDLERS={...BASIC_HANDLERS,llm,agent} :27-31 亲读=自动注册） |
| AC6 指针抽样 | ≥5 组指针亲核零杜撰 | ✅ | ✎ 六组亲读全命中：nodes.schema.ts:13-15（PORT_TYPES 5/WIDGETS 5/CATEGORIES 7 枚举）· events.ts:25（output={type,text} 无 id）· engine.ts:27-31（HANDLERS 展开）· app.js:775（`.node-out` 模板原文）· app.js:85（`box-select` 图标，SPEC 对 PRD 的 :84→:85 转写正确）· gate.mjs golden-created 通道（`UPDATE || !existsSync(gPng)`，SPEC 锚 :321-325 系插行前基线、BUILD 后现实 :337-340——行移逻辑零触碰，如实记录） |
| AC7 确定性 | 双采逐字节一致 | ✅ | ※ JOURNAL 记录四：两轮 `npm run gate` 13 场景 diffPx=0（s12 由 golden-created 转 pass，两次独立采集与基线逐字节一致）；※ 脚本轮 gate 通过复证基线稳态；✎ 确定性机理静态复核：RUN_META 固定 JSON 字面量（app.js diff 亲读）+ expand 钳位 [0,6] 非有限数回落 2（jcRender 亲读）+ 惰性挂载/重渲染整体重建（innerHTML=''）三锚在码 |
| AC8 并行申报 | 并行路状态如实记录 | ✅（有申报） | ✎ 亲核：`.zcode/locks/items` 现有 **BK-0038（本路）/ BK-0040（他路）** 两占位；`git worktree list` 三路=主干 + feat/0035-iter（本路）+ **feat/0036-iter（并行路，@915e131）**。0036 工作区现状 `git status --porcelain` 仅 `M docs/evolution/STATE.md` + `?? docs/evolution/iterations/0036/`（机制件，**产品代码零改动**）→ 本轮 BUILD/VERIFY 期间**尚无产品文件交集**；若 0036 进入 BUILD（BK-0040 同构四件套），SPEC §10 预告的机械可并形清单（nodes.ts/baseline/五测试/gen-node-readmes/nodes README/handlers.ts/app.js/app.css/gate.mjs/smoke-server.mjs）交合并仲裁员按「产品代码冲突不得自行择一 + 计数按合并后实跑值校正」处置。另：主干 tip（915e131）较本分支基点（1ce62dc）多两个**机制件**提交（WORKFLOW/merge-arbiter 文案），产品代码无分歧，合并时无产品冲突预期 |

## 三、AC4 手动 E2E 五点位（本轮亲跑全过程）

**环境**：工作树内 `node apps/server/dist/server.js`（:3000，health OK，provider=DeepSeek 配置在案 →
前端 ENGINE.online=true → 走**真实运行**路径）。UI 因环境事项 B-ENV-2（见 §六）无法由被测服务器
直接托管，按测试经理职责用**仓库外一次性静态+代理载具**（:3100，`/` 静态返回工作树
`apps/web/dist/index.html` + `/api/*` 反代 :3000 含 SSE pipe；被测服务器与源码零改动）承载，
Playwright/浏览器实操作。全程**零 LLM 调用**（上游用 userinput 的 defv 兜底，非模型节点）。

| 点位 | 操作 | 实测 |
| --- | --- | --- |
| ① 节点库条目 | 打开节点库读 `#lib-list` | `output` 分组 **cnt=5**，条目 `reply,termview,setvar,webshow,**jsoncanvas**`（`data-type=jsoncanvas`，名称「JSON 画布」；截图留证）——AC4-① ✓ |
| ② 节点体 widget/端口 | 节点库拖入（CUA 真实鼠标序列）画布 | 新节点 id=9/2：`.wdg` 两行=「展开层级」（`input[type=number]`）+「格式化缩进」（`input[type=checkbox]` toggle）；端口 `数据 · 类型：任意` 恰 1 入 0 出（sink 同构）——AC4-② ✓ |
| ③ 连线运行→结构化树 | 空白工作流：userinput（defv=固定 JSON 字面量）→jsoncanvas 连线（toast「已创建连线」），点击运行（真实 SSE run） | 运行完成 2/2 节点；`.node-jtree` 渲染 **8 条 jc-row**（顶层 4 项=键数；`名称:"AgentFlow"`/`版本:2`/`特性:▾Array(2)`+子行×2/`配置:▾{2}`+子行×2；badge/折叠箭头齐备）；`.node-out`=「已呈现 JSON · 4 项」（摘要通道语义保持，全文经 **output 事件**渲染成树=SPEC §1 分工实证）；日志「✓ JSON 画布 · 已呈现 JSON · 4 项」。**expand 交互**：改 0→重跑=2 行 jc-closed+箭头全 ▸（全折叠）；改 6→重跑=0 折叠；**fmt 交互**：关→重跑=树替换为紧凑原文 fallback（text=重序列化 JSON，rows=0）——AC4-③ ✓（截图留证） |
| ④ 非 JSON 降级+零额外请求 | defv 改普通文字→重跑；运行窗口前后 fetch/XHR 探针 | `.node-jtree-fallback`=原文逐字、`.node-jtree-warn`=「注意：非 JSON 文本 · 已按原文降级呈现」（**不伪造树**，rows=0）；`.node-out`=「已呈现原文 · 16 字（非 JSON，前端原文降级）」（与 smoke J03 同口径）；运行窗口网络请求**恰 1 条**=应用自身 `/api/run`（SSE），零第三方/零新增——AC4-④ ✓ |
| ⑤ 呈现区只读 | 呈现区可编辑控件清点 | `.node-jtree` 子树 `input/textarea/select/[contenteditable=true]` = **0**；点击仅折叠切换（fold 点击 ▾→▸+jc-closed、再点还原，亲测）——AC4-⑤ ✓ |

**回归抽查（8 项全绿）**：撤销/重做（加节点 2→3，Ctrl+Z→2，Ctrl+Y→3，Ctrl+Z→2）· 节点拖拽
（JSON 画布节点 (717,308)→(877,428)，连线贝塞尔 `d` 同步重渲染、portCache 刷新机制工作正常）
· 滚轮缩放（100%→111%→100%；滚轮门控为既有语义：未选中节点控件上不接管=照常缩放，本轮
零触碰）· 数字步进（expand 步进钮 2→3）· 节点库点击添加（!moved 分支画布中心落点）· 多工作流
标签切换（智能客服助手 9 节点 ⇄ 未命名工作流 2 节点+1 连线均保真；切回后树/摘要 DOM 为空属
**既有临时呈现语义**（.node-out/termEl 同款非持久化），非本轮回归）· onEvent 预钩子（5+ 次真实
run 全程 termview/webshow 既有 case 语义无异常表现）· 呈现区折叠交互（详见 ⑤）。

## 四、PRD REQ 逐条映射

| REQ | 核验 | 证据 |
| --- | --- | --- |
| REQ-0038-01 节点定义与入列 | ✅ | node.ts 26 行纯数据 `satisfies NodeDefJson` 与 SPEC §2 终稿**逐字一致**（type/identity/ports/params/binding 全字段亲比）；nodes.ts +1 import +1 键、键位 webshow 后 approval 前、头注 19→20 目录（diff 亲读）；DEFS 全字段在冻结枚举内（§二 AC6 [1]）；节点库/DEFS_META/paramDefaultsOf 自动派生（E2E ①② 即派生实证） |
| REQ-0038-02 呈现承载（handler） | ✅ | handlers.ts jsoncanvas 与 SPEC §3 **逐字一致**、纯插 webshow/approval 之间；语义三分（对象/数组序列化·字符串原样·空/哨兵空呈现）由 J01/J02/J03 亲验；零出站由 J04 亲验；行数 324→约 361 ≤400（`git diff --numstat` +38 行口径内） |
| REQ-0038-03 画布呈现 | ✅ | 独立新容器 `.node-jtree`+新选择器纯插入（app.css +15/0）；`.node-out` 既有语义零改写（E2E ③ 摘要单行原样）；parse 失败如实降级+warn（E2E ④）；只读无输入面（E2E ⑤）；RUN_META 纯插入一行固定 JSON 字面量；模拟执行共用 jsonConsume 路径（runSimulated 插行 diff 亲读；模拟面由 gate s12 覆盖） |
| REQ-0038-04 节点库与通用渲染链 | ✅ | 「输出」分组自动 +1（E2E ①）；节点体自动渲染两 widget+入端口（E2E ②）——前端零改动即自动承载的论断成立；s3-library 零波及（AC1 字节级佐证） |
| REQ-0038-05 确定性 | ✅ | 静态 fixture（RUN_META 字面量）+树终态 ready 门+jc-row≥4 机器判据（gate.mjs diff 亲读）；场景号 **s12** 如期；AC7 双采在案 |
| REQ-0038-06 契约与守卫联动 | ✅ | baseline 20 键/D.size 20/defs-drift 42/僵尸 +2/readme-consistency/生成器!==20+MANUAL_NOTES 条目（diff 亲读）；SPEC §6 对 PRD 清单的三处补齐（contract/gen-node-readmes/nodes README）均已落地 |

## 五、缺陷清单

**无产品缺陷**（无 BUG-xxx）。以下三项为**环境/文档级事项**，均不阻断本迭代，如实留档：

- **ENV-1（预期内，非缺陷）**：预提交工作树上官方 smoke 套件 fail-fast 于 V09 环境哨兵
  （`packages/shared` 要求干净检出；事件 schema 部分 51/51 通过）。0034 JOURNAL 同款先例，
  分支提交后自然转绿——**合并后主干复测（MERGE 阶段）必须复跑官方全量 smoke 确认 V09 转绿**。
- **ENV-2（既有行为，非本轮引入；建议知会合并仲裁员/主干复测参考）**：`send@1.2.1`（express
  5.3.0 依赖树）`res.sendFile` 默认 `dotfiles:'ignore'`，对路径含 `.zcode` 段的文件一律 404——
  v3 工作树位于 `.zcode/worktree/` 下，故**工作树内 `npm start` 无法直接托管前端 UI**
  （`GET / → 404`，最小复现+send 源码 dotfile 分支亲读定位）。本轮 VERIFY 用仓库外静态+代理
  载具绕开（被测代码零改动）。主干路径无 `.zcode` 段不受影响；此行为非 0035 改动所致
  （deps/serving 代码本轮零 diff，AC5 佐证），如需修复应走独立迭代（如 sendFile 传
  `dotfiles:'allow'` 或 ROOT 判定），不属本项范围。
- **DOC（文档指针陈旧，非缺陷）**：JOURNAL.md 记录二称一次性副本目录「.gitignore:18 在案
  不入库」——现 `.gitignore` :18 实为 `tests/golden/diff/`，`tests/.selftest-tmp` 并未被忽略
  （本轮 VERIFY 曾短时创建该目录并已删除复原，git status 收尾复核 39 条目=BUILD 原状）。
  后续修复轮若再用副本法，建议放 `data/`（已忽略）或仓库外。

## 六、给 MERGE/CLOSE 的交接提示

1. 主干复测照 WORKFLOW §4 全量四件套跑（含 V09 转绿确认）；golden 权威在 CI，盯 `ui-constitution`。
2. 本分支基点 1ce62dc 落后主干两个机制件提交（6617b98/915e131 文案改动），预期零冲突可并；
   若 0036 路先行合入产品代码，按 SPEC §10/AC8 机械可并形处置，计数以合并后实跑为准。
3. CLOSE 回执 issue#3 关单（链终轮）在案；BACKLOG BK-0038 终态、metrics 行、STATE 收尾按 v3
   在主干锁内记账。
