# REPORT · 迭代 0022 · BK-0021 批次 2 终轮 VERIFY（余 8 目录 + README 生成器 + 「内联残留=0」终态断言 + 在线 E2E 五点位 + BK-0023 随批）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-25 00:1x–00:2x
> 输入：`iterations/0022/PRD.md` AC1–AC10 + `iterations/0022/SPEC.md` §9 验收口径 + 迁移 SPEC §5/§6。
> 执行环境：本机 Windows（win32 10.0.26300）· Node v24.21.0 · Git Bash；本地非 CI 权威环境
> （gate 基线以 CI 为权威，本地结果按 CONSTITUTION 第 2 条仅作参考级证据，如实标注）。
>
> ## 总结论：**PASS**（零 BUG；OBS-001~003 三条观察记录，均非产品缺陷）
>
> 脚本侧已运行的完整门禁（`npm run build` / `npm run gate` / 根 `npm test` 链）按派发约定
> （ask：「build/gate/test 已由脚本运行且通过，不要重复跑全套」）不重复全套；本报告以测试
> 经理职责亲跑的针对性验证覆盖全部实质验收面（下表「亲跑」标注）。dist 新鲜度证明：
> AC1 快照再生产 + readme-consistency 对 `dist/nodes/<type>/node.js` 全 16 类型（含批次 2
> 八个新目录）的 dist 导入均通过——当前 dist 即批次 2 构建。

## 0. 验收面 × 证据形式总览

| AC | 结论 | 证据形式（全部本会话亲跑，除非注明「脚本侧」） |
| --- | --- | --- |
| AC1 快照逐字节 | **PASS** | cmp 空 + sha256 双侧一致（亲跑）+ 常驻断言绿 |
| AC2 if 探针 | **PASS** | shared 30/30 内六行真值表 ✔（亲跑） |
| AC3 守卫+两数分开 | **PASS** | 守卫测试 ✔ + defs-drift 33/33 ✔（亲跑） |
| AC4 既有四测试零改动 | **PASS** | git diff 空（亲跑）+ 全绿（亲跑） |
| AC5 gate | **脚本侧通过**（ask 声明，VERIFY 未复跑）；在线分支由 AC6 补证 | — |
| AC6 在线五点位 | **PASS** | 浏览器 DOM 断言逐点取证（亲跑，§二） |
| AC7 波及面+可写性 | **PASS** | `git diff -- apps/web` 空（亲跑）+ 可写性断言 ✔ |
| AC8 回归零回退 | **PASS（带 OBS-001）** | shared 30/30（亲跑）+ smoke 83/1 唯一红=V09 时点性（亲跑两轮） |
| AC9 终态+提交不变式 | **PASS（工作区口径）** | 终态断言/readme-consistency/幂等/+1 行/白名单/行数/EOL 全亲跑 |
| AC10 终轮回执关账 | **CLOSE 就绪**（协调者执行） | issue#11 实况 gh 亲核 OPEN（§六） |

## 一、AC 逐条验收

### AC1 · 快照逐字节比对（不变式 A）— **PASS**

- **VERIFY 一次性再生产对照（SPEC §9 命令，亲跑）**：
  1. `node -e "import('./packages/shared/dist/index.js').then(m=>process.stdout.write(JSON.stringify(m.NODES,null,2)+'\n'))" > $TEMP/baseline.check.0022.json`；
  2. `cmp packages/shared/test/nodes.baseline.json $TEMP/baseline.check.0022.json` → **输出空（CMP_OK: byte-identical）**；
  3. `wc -c` 双侧均 **11521 字节**；`sha256sum` 双侧均
     `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275`
     ——与迁移 SPEC §2 / 0022 SPEC §1 头注记载逐字一致（不变式 A 终态铁证）。
- **常驻形态**：shared 30/30 绿内「快照常驻比对：NODES 运行时输出与迁移前基线逐字节等价
  （不变式 A，16 键全量）」✔（Buffer.equals，`test/synthesis.test.mjs`）。

### AC2 · if 行为探针 — **PASS**

- shared 30/30 内「if 编译产物六行真值表（迁移前语义 = 旧 nodes.ts trigger 的 if 谓词）」✔：
  `cron.if`/`path.if` × {手动触发, 定时触发, Webhook} 六行逐一相等（批次 1 产物回归，
  零改动绿）。在线侧由 AC6 点位⑤以真实交互再证（§二）。

### AC3 · 两数分开 + 守卫（回归+终态）— **PASS**

- 「守卫：参数键名 ↔ handler 引用一致（正向 ∈ 断言 + 反向僵尸清单精确断言）」✔（30/30 内，
  `param-handler-guard.test.mjs` 批次 1 产物零改动回归——零改动 git 断言见 AC9）。
- 「DEFS 默认值 33/33 全量断言」✔（defs-drift，既有四测试零改动）。
- **批次 2 不产生新僵尸、不接通旧僵尸**：僵尸清单仍精确断言
  `[['trigger',['mode','cron','path']],['userinput',['vtype','req']]]`（守卫测试内嵌，
  随绿证明）；同名异义键归属在线佐证——AC6 回归抽查中 notify「通知渠道/接收人」与
  approval「超时策略」combo 均从新 DEFS 正确渲染（`p.to`/`p.max` 各归其主）。

### AC4 · 既有契约测试零改动全绿 — **PASS**

- `git diff --stat -- packages/shared/test/{contract,defs-drift,events-negative,handlers-coverage}.test.mjs`
  → **输出空**（亲跑）。
- 四文件全绿（亲跑 shared 30/30 内含：「节点注册表完整：16 种节点」「SSE 事件契约：全部
  15 种事件」「SSE 事件契约反例：12 条坏样本全部被拒」「后端 HANDLERS 键集 ⊇ NODES 键集」等）。

### AC5 · gate — **脚本侧通过（VERIFY 未复跑，如实标注）**

- ask 声明脚本已运行 `npm run build` + `npm run gate` 且通过（8 场景 diffPx=0 口径见
  SPEC §9 门禁 1/2）；VERIFY 按派发约定不重复全套，未复跑。
- 证明力补强（亲跑侧）：AC7 `git diff -- apps/web` 空 + AC1 内容逐字节等价 + AC6 在线
  五点位——静态渲染等价与在线行为两条链均非 gate 盲区。PRD AC5 原文口径即如此分工
  （「静态托管；在线分支由 AC6 补证」）。CI 权威（ui-constitution）待推送后。

### AC6 · 在线态人工 E2E 五点位 — **PASS（五点全过，亲跑）**

环境：`PORT=3210 node apps/server/dist/server.js`（本轮脚本构建的 dist；:3000 被 0021
遗留测试服务占用，故用独立端口，见 OBS-002）+ ZCode 内置浏览器（IAB，Chromium）开
`http://localhost:3210/`；`curl /api/v1/health` 独立取证
`provider.models = [{name:"DeepSeek-V4"},{name:"DeepSeek-R2"}]`。Windows 本机参考级，
如实标注（0021 REPORT 先例口径）。

| # | 点位 | 结果 | 证据（DOM 断言输出 / domSnapshot 摘录） |
| --- | --- | --- | --- |
| ① | 启动日志「⚡ 执行后端已连接」 | **PASS** | 底部日志面板（首屏 domSnapshot）：`00:14:15 ⚡ 执行后端已连接 · Vercel AI SDK 7 · Node v24.21.0 · 已连接 DeepSeek（OpenAI 兼容端点）`——`ENGINE.probe`（app.js:2044 起）真实执行 |
| ② | LLM 模型下拉被 provider.models 覆写 | **PASS** | 选中 LLM 节点后属性面板（`#props`）模型行：`options=["DeepSeek-V4","DeepSeek-R2"]`——恰等后端 health 返回（app.js:2055 `DEFS.llm.params[0].o = prov.models…` 真实执行；覆写前画布 widget 仍显示 DEFS 原生 6 项 GLM 系，属 NPD §6.3 已知现状、MANUAL_NOTES llm 条在案，非本轮回归） |
| ③ | 覆写后取值仍在 options 内 | **PASS** | 同一下拉：`value="DeepSeek-V4"`，`valueInOptions=true` |
| ④ | 控制台零 TypeError | **PASS** | 页面侧预装 `error`/`unhandledrejection`/`console.error` 三钩子后执行全部交互（选节点/属性面板渲染/模型覆写读值/触发方式两向切换/节点库打开/适应视图），**捕获 0 条**（`capturedErrors: []`） |
| ⑤ | trigger 触发方式切「定时触发」→ Cron 行显、切回「手动触发」→ 隐 | **PASS** | 属性面板切「定时触发」→ 画布 trigger 节点 `[data-k="cron"]` 出现（label=「Cron 表达式」），且 `[data-k="path"]` 正确保持隐（visibleIf=Webhook 语义正确）；切回「手动触发」→ cron 行消失（`canvasCronVisible: false`）。链路 = props change（app.js:1001/:1034 无条件 rerenderNode）→ makeNodeEl `p.if(ps)` 过滤（app.js:763，`if` 编译产物行为落点） |

取证方式如实标注：IAB 环境 Playwright 合成点击 actionability 超时（force 亦然；按钮
命中测试正常），故交互以 DOM 事件派发执行——`MouseEvent('mousedown'/'mouseup')` 冒泡
至 viewport 委托（app.js:1395）完成节点选中、`Event('change')` 冒泡至 `#props`/
`nodesLayer` 委托（app.js:1001/:1672）完成参数切换——事件链与应用真实监听路径一致；
另取整页截图一张（会话工件，未入仓库）。**PRD/迁移 SPEC §5.6 的五点位语义全部以真实
前端代码路径执行与观测**。

### AC7 · 波及面与可写性 — **PASS**

- `git diff -- apps/web` → **输出空**（亲跑）。
- 可写性常驻断言 ✔：「可写性常驻断言（app.js 运行期覆写现状，聚合层不得
  Object.freeze）」（30/30 内）——AC6 点位②本身即一次真实覆写（`DEFS.llm.params[0].o`
  运行期可写）。

### AC8 · 散落点核对 + 回归零回退 — **PASS（带 OBS-001 时点性说明）**

- **散落点八指针**：`app.js:2055`（模型覆写）AC6②在线亲证；`app.js:193-197/:1866/:103/:178`
  与 `engine.ts:128/:23-24`、handlers+llm `p.<key>` 消费——由 AC7 静态链（apps 零 diff +
  聚合层恰三导出：nodes.ts 实读全文件确认 `NODES/NODE_NAMES/paramDefaultsOf` 无第四导出，
  index.ts 零改动）+ AC3 守卫绿 + AC1 内容逐字节等价 + smoke 在线全链（下条）共同证明。
- **`npm test`**：脚本侧根链已过（ask 声明）；VERIFY 亲跑其实际测试负载
  `npm test -w @agentflow/shared` → **30/30 绿**（= 既有 8 + 批次 1 18 + 批次 2 增量 4）。
- **`npm run smoke:server`**（亲跑两轮，输出一致）：**83 passed / 1 failed，exit 1**。
  - 唯一 fail = **V09**：`expected: 51/51 通过 + shared 干净 | actual: 51/51；shared=M
    packages/shared/src/events.ts`——**schema 半边 51/51 事件全过 RunEventSchema 校验**
    （含 BK-0023 注释后的 events.ts），git 半边红仅因产品提交尚未落地（提交按流程由
    脚本在 VERIFY 通过后统一执行，JOURNAL 尾部 + 0021 REPORT AC9 同款时序约定）。
  - **时点性假红，非产品缺陷**：PRD AC8 原文编码该先例口径（0018/0021）；「DEFS 内容
    漂移」担忧已由 AC1 cmp 空 + sha256 双侧一致以更强形式证伪。
  - 连带：V09 fail-fast 使 Z01–Z04（悬挂 run 启动扫尾组，与 DEFS 迁移正交）本轮未执行
    （smoke 全文零出现）——CLOSE 产品提交后复跑确认自愈与 Z 组恢复（PRD AC8 口径）。

### AC9 · 终态与提交不变式 — **PASS（工作区口径；提交动作留脚本时序）**

1. **「内联残留=0」终态断言**：nodes-dirs 测试 ✔（亲跑 30/30 内）——`residual` 断言
   收敛为 `[]`、显式计数 `D.size === 16`、D===R + D ⊆ keys(NODES) + 引用边界扫描全绿
   （`test/nodes-dirs.test.mjs:18-64` 实读核对断言形态与 SPEC §6.1 一致）。
2. **readme-consistency** ✔（亲跑 4/4）：表格回比（16 类型端口/参数表 ⇄ dist node.js
   源数据 + 目录集恰 16 无缺无孤 + 根层无孤儿 md）、总索引恰 16 行且序 =
   `Object.keys(NODES)`、生成器确定性（spawnSync 重生成到 os.tmpdir，17 份逐字节比对，
   在库侧 CRLF→LF 归一免疫 git EOL 策略、生成器产物恒 LF 无 BOM）、在库 README 无 BOM。
3. **生成器幂等**（亲跑）：`node tools/gen-node-readmes.mjs` 直接重跑 → 输出
   「**完成：0 写入 / 17 无变化 / 共 17 份**」，重跑前后 `git status --porcelain --
   packages/shared/src/nodes tools/gen-node-readmes.mjs` 完全一致（零漂移）。
4. **BK-0023 恰 +1 行注释**（亲跑 git diff）：events.ts 42→43 行，唯一增行为
   `/* ok = 本次运行未被中止（≠全部节点成功）；消费端 apps/web/src/server-sync.js:105-107 按「ok !== false && !ev.stopped」定级渲染 */`
   ——SPEC §7 形态逐字；schema 行（`ok: z.boolean(),` 等）零变化；events-negative
   12 反例 ✔（30/30 内）。消费端语义复核：`server-sync.js:105-107` 现行实现与注释一致。
5. **白名单（= SPEC §8 表）**：`git status --porcelain` 全量恰为——`M events.ts`/
   `M nodes.ts`/`M nodes-dirs.test.mjs` + 新增 `tools/gen-node-readmes.mjs` +
   `test/readme-consistency.test.mjs` + 8 新目录 `{prompt,websearch,notify,loop,merge,
   reply,setvar,approval}/`（各恰 node.ts+README.md）+ 批次 1 八目录各 +README.md +
   `src/nodes/README.md`——即白名单 8 行全覆盖；**零改动白名单 git 断言全空**（亲跑）：
   `git status --porcelain -- apps tools/pixel-gate .github package.json package-lock.json
   packages/shared/src/index.ts packages/shared/src/nodes.schema.ts
   packages/shared/test/nodes.baseline.json packages/shared/test/{schema,synthesis,
   param-handler-guard}.test.mjs` → 空。机制件（docs/evolution/**）随归档提交口径，不计。
6. **行数预算**（`wc -l` 亲测）：nodes.ts **142**≤250（SPEC 估 130–150）/ 8 新 node.ts
   **20–28**≤60 / 生成器 **133**≤200 / nodes-dirs **64**≤100 / readme-consistency
   **110**≤150 / events.ts **43**（42→43）/ 总索引 README **25**∈[25,30] / 节点 README
   29–41（SPEC「约 40–60」估值的下浮侧，文档产物不计源码上限——非违例）。
7. **EOL/BOM**（node 字节级亲检，38 文件=本轮全部产品面+批次 1 同类）：全 LF、无 BOM、
   0 个 CR 字节。
8. **「恰一个产品提交」**：截至本 REPORT 落盘产品提交尚未发生（脚本在 VERIFY 后执行，
   `git log -1` 仍为 772f589）——白名单已核对即满足 AC9 内容面；提交时点属脚本时序约定
   （0021 REPORT AC9 同款），不构成验收缺口。提交信息应循 PRD 建议的 Conventional
   Commits 形态。
9. **源码逐字对照**（亲核）：`git show HEAD:packages/shared/src/nodes.ts`（旧内联
   :107-155）与 8 份新 node.ts 逐字段比对——identity（name/cat/icon/desc/kw）、params
   （id≡k、label、widget、default 含 `\n` 换行、min/max/step）、combo options 逐项、
   端口 label/type 全部逐字吻合；端口 id 与 SPEC §3 定界表一致（in-var/out-prompt、
   in-query/out-results、in-content/空 outputs、in-list/out-item、in-a/in-b/out-merged、
   in-content/空 outputs、in-value/out-value、in-input/out-result）；capabilities 取值
   与 §3 表一致（websearch/notify=net.guarded、loop/merge/reply/setvar/prompt=data、
   approval=human+llm）。

### AC10 · 终轮回执与关账 — **CLOSE 就绪核（执行者=协调者，非 VERIFY 面）**

- **issue#11 实况**（gh 亲核，2026-10-25 00:2x）：`gh issue view 11` → **OPEN** |
  「[needs-approval] BK-0021 NDP 节点定义迁移实施请批…」——与 PRD 存证（23:36 勘误）
  一致，CLOSE 按 sourceIssue 标准流程**关单 + 🤖 终轮说明评论**，证据指针 =
  本 REPORT AC1（cmp/sha256）+ AC5（gate 脚本侧）+ AC6（五点位）路径。
- BK-0021 置 done（终轮收口）+ BK-0023 置 done（随批关账）+ STATE.item 置 `-`；
  BACKLOG/metrics「#11 已提前关单」旧记载勘误回写随归档提交（PRD AC10 全项清单）。

## 二、AC6 补充：在线渲染回归抽查（超 PRD 点位的加分取证）

- **节点库**：打开侧栏节点库 → **恰 16 条目**（`data-type` 序 = trigger, userinput, llm,
  prompt, retrieval, websearch, http, code, notify, condition, loop, delay, merge, reply,
  setvar, approval——**与 NODES 声明序逐字一致**，不变式 C 的前端投射）；分组计数
  输入2/对话2/知识2/工具3/逻辑4/输出2/人工1 = 16。
- **默认工作流画布**：8 节点（手动触发/客服提示词/知识库检索/LLM 生成回复/置信度判断/
  直接回复用户/转人工审批/升级通知）+ 7 连线全部从 16 目录聚合层渲染：批次 2 迁移键的
  控件逐字呈现——prompt 多行 textarea 默认值（`你是一名金牌客服。…\n{{context}}\n\n…`
  换行渲染）、approval 超时策略 combo「挂起」选中 + 审批人 text「值班经理」、notify
  渠道 combo「邮件」选中 + 接收人 `support@team.com`；批次 1 键（retrieval combo/number、
  llm 温度 0.7/Tokens 2048、condition textarea）同样正常。
- **属性面板/适应视图/缩放条/小地图**：全部正常响应（DOM 事件链路，见 AC6 取证标注）。
- 全量交互回归清单（拖拽/框选/连线/滚轮门控等）对象代码零改动（AC7），留周度治理
  test-manager 全量口径（WORKFLOW §5.2）——0021 REPORT §五同款结论。

## 三、静态审查记录（源码实读）

- `nodes.ts`（142 行）：16 静态 import（.js 后缀，批次 1 8 行 + 批次 2 8 行）→
  `loadJsonDef`（safeParse 失败 throw，16 次模块初始化期校验）→ `synthesize`/
  `synthesizeParam`/`compileVisibleIf` 批次 1 形态逐字保留 → NODES 16 键全
  `synthesize(loadJsonDef(...))`、**键序 = 现行声明序逐字**（不变式 C）→ 派生层
  （NODE_NAMES/paramDefaultsOf）零改动；对外恰三导出；无 Object.freeze。
- `test/nodes-dirs.test.mjs`（64 行）：断言 3 翻转（residual `[]`）+ `D.size===16` 计数
  断言 + 断言 1/2 零改动——SPEC §6.1 一致。
- `test/readme-consistency.test.mjs`（110 行）：四 test 与 SPEC §6.2 设计一一对应；
  转义规则（`\|`/`\n` 逆变换）与生成器 `esc` 互为镜像；CRLF→LF 在库侧归一口径在头注
  留档（SPEC §12-③ 落位独立文件的执行形态）。
- `tools/gen-node-readmes.mjs`（133 行）：数据源 = dist（§12-① 定稿）、键序唯一取自
  `dist/index.js` 的 `Object.keys(NODES)`、`--out` CLI、只写有变化文件、KIND_GUARDRAILS
  九 kind + MANUAL_NOTES 16 条（§12-② 单一持有）；MANUAL_NOTES 事实锚点抽核 5 条
  （trigger UI-only 三参/llm 运行期覆写/websearch 回退链/notify 仅 Webhook/approval
  互审 role=node:\<id\>）与 handlers/engine/approval-review 实况及 SPEC §5.3 锚点行号相符。
- 8 份新 node.ts：type-only import、`satisfies NodeDefJson`、无副作用——NDP §2.3 合规；
  数据逐字对照见 AC9-9。

## 四、观察记录（非缺陷）

- **OBS-001（Minor·时序，沿 0021 OBS-001 同款）**：smoke V09 的 git 半边在「产品提交前
  跑 smoke」的任何时点必红（断言设计前提是干净检出）；本轮 83/1 + Z01–Z04 被 fail-fast
  跳过。处置（PRD AC8 已编码）：CLOSE 产品提交落地后由脚本侧复跑一次
  `npm run smoke:server` 确认全绿（V09 自愈 + Z 组恢复执行）。
- **OBS-002（信息·环境）**：:3000 端口存在迭代 0021 VERIFY 会话遗留的测试服务
  （PID 38108，`node dist/server.js`，2026-10-24 21:17:05 启动，0021 取证产物）。本轮
  以 `PORT=3210` 独立端口取证，未动该进程（避免破坏性操作）；建议用户择机清理或重启
  后自然消失。对仓库与 CI 零影响。
- **OBS-003（信息·微）**：JOURNAL 步 5 记总索引 README「30 行」，实测 `wc -l` = 25
  （SPEC §8 预算区间 25–30 内）——JOURNAL 计数小误差，无产品影响，如实记录。

## 五、BUG 清单

无（BUG-0000：本轮零缺陷）。

## 六、VERIFY 结论

**PASS**。AC1–AC9 全过（AC5 为脚本侧通过 + VERIFY 未复跑的如实标注；AC8 带 OBS-001
时点性说明），AC10 CLOSE 就绪核完成。建议 CLOSE 时：

1. 脚本执行产品提交（白名单 = SPEC §8 表；提交信息循 PRD 建议形态）后**复跑
   `npm run smoke:server`** 确认 V09 自愈与 Z01–Z04 全绿（OBS-001 处置）；
2. BK-0021 置 done（跨迭代 doing 至本轮收口）、BK-0023 置 done（随批关账）、
   STATE.item 置 `-`（终轮收口不再续填）；
3. issue#11（gh 亲核 OPEN 实况）标准关单 + 🤖 终轮说明评论，附证据指针（本 REPORT
   AC1/AC5/AC6）；BACKLOG/metrics「#11 已提前关单」旧记载勘误回写；
4. OBS-002 遗留服务清理交用户/治理日；OBS-001 的 smoke 基建优化建议仍留 PM 评估
   （0021 REPORT §六③ 在案，本轮不改判）。
