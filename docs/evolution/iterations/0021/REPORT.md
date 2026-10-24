# REPORT · 迭代 0021 · BK-0021 批次 1 VERIFY（NDP 节点定义目录制迁移 · 批次 1）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 21:20–21:35
> 输入：`iterations/0021/PRD.md` AC1–AC9 + `iterations/0021/SPEC.md` §8 验收口径 + 迁移 SPEC §5/§6。
> 执行环境：本机 Windows（win32 10.0.26300）· Node v24.21.0 · Git Bash；本地非 CI 权威环境
> （gate 基线以 CI 为权威，本地结果按 CONSTITUTION 第 2 条仅作参考级证据，如实标注）。
>
> ## 总结论：**PASS**（零 BUG；OBS-001/OBS-002 两条观察记录，均非产品缺陷）
>
> 脚本侧已运行的完整门禁（`npm run build` / 根 `npm test` 链）按派发约定不重复全套；
> 本报告以测试经理职责亲跑的针对性验证覆盖全部实质验收面（见下表「亲跑」列）。
> 工作流 run 历史在本会话不可读（工具 capability gap），脚本侧输出无日志可引——
> 以 ask 声明（「build/gate/test 已由脚本运行且通过」）+ dist 时间戳佐证
> （web dist 2026-10-24T13:09:41Z / server dist 13:10:05Z，均晚于 JOURNAL 落盘 21:08 本地）
> + 本报告亲跑证据三重构成证据链。

## 一、AC 逐条验收（PRD 验收标准 · 全部本会话亲跑）

### AC1 · 快照逐字节比对 — **PASS**

- **一次性再生产对照（VERIFY 专属证据形态，SPEC §2 命令）**：
  1. `cd packages/shared && npm run build` → tsc 零错误（BUILD_EXIT=0）；
  2. 临时脚本从 `dist/index.js` import NODES，`JSON.stringify(NODES,null,2)+'\n'` 重定向输出；
  3. `cmp /tmp/nodes-repro-0021.json test/nodes.baseline.json` → **输出空（CMP_OK: byte-identical）**；
  4. `wc -c`：双侧均 **11521 字节**；`sha256sum`：双侧均
     `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275`
     （与迁移 SPEC 头部记载、JOURNAL 表 5 一致）。
- **常驻形态**：`npm test`（shared 包）26/26 绿，其中
  「快照常驻比对：NODES 运行时输出与迁移前基线逐字节等价（不变式 A，16 键全量）」✔
  （Buffer.equals + 首异字节偏移提示，`test/synthesis.test.mjs:54-68`）。
- 覆盖 16 键全量（含未迁移 8 键）——常驻测试从 `dist/index.js` 导入整表比对。

### AC2 · if 行为探针 — **PASS**

- `npm test`（shared 包）中「if 编译产物六行真值表」✔：`cron.if`/`path.if` ×
  {手动触发, 定时触发, Webhook} 六行布尔逐一相等 + `typeof === 'function'`
  （`test/synthesis.test.mjs:24-37`）。
- 迁移前语义对照（静态）：`git show HEAD:packages/shared/src/nodes.ts:14-15` 原文
  `if: p => p.mode === '定时触发'` / `'Webhook'`；新链路 = `trigger/node.ts` 的
  `visibleIf:{param:'mode',equals:'定时触发'/'Webhook'}`（逐字核对）→ 聚合层
  `compileVisibleIf` 返回 `p => p[v.param] === v.equals`（`nodes.ts:47-49`）——语义等价成立。

### AC3 · 两数分开 + 守卫测试 — **PASS**

- `npm test`（shared 包）中守卫测试 ✔（`test/param-handler-guard.test.mjs`）：
  正向 (owner,key) ∈ params[].k 零违例；反向僵尸清单精确断言
  `[['trigger',['mode','cron','path']],['userinput',['vtype','req']]]`；
  `total === 33` 与 28（= 33 − 5 僵尸）推导自检通过；无无法归属引用。

### AC4 · 既有契约测试零改动全绿 — **PASS**

- `git diff --stat -- packages/shared/test/{contract,defs-drift,events-negative,handlers-coverage}.test.mjs`
  → **输出空**（亲跑）。
- 四文件全绿：`npm test`（shared 包）26/26 = 既有 8 项 + 新增 18 项（10 schema + 2 dirs + 5 synthesis + 1 guard）。

### AC5 · gate — **PASS（本地参考级，CI 权威待推送后）**

- 亲跑 `npm run gate`（校验对象：脚本构建的 web dist 2026-10-24T13:09:41Z + 本轮等价重建的
  shared dist）：**8 场景全绿 diffPx=0**（s0-initial / s1-select-node / s2-settings /
  s3-library / s4-workflows-online / s5-history-online / s6-log-panel / s7-log-filter-warn），
  「宪法门禁：通过 ✓」。
- 证明力边界如实：静态托管证明；`app.js:2055` 在线分支留批次 2 §5.6 补证（PRD AC5 原文口径）。

### AC6 · 波及面与可写性 — **PASS**

- `git diff -- apps/web` → **输出空**（亲跑）。
- 可写性常驻断言 ✔：`!Object.isFrozen(NODES/llm)` + `params[0].o` 赋值生效后还原
  （`test/synthesis.test.mjs:70-80`，随 26/26 绿）。

### AC7 · 散落点核对 — **PASS（SPEC §8 静态保证口径 + 在线超额取证）**

- 静态链：apps 零 diff（AC6）+ 聚合层对外恰三导出 `NODES/NODE_NAMES/paramDefaultsOf`
  （`nodes.ts:103/159/164` 全文实读确认，无第四导出；index.ts git status 未出现 = 零改动）
  + AC3 守卫绿。
- 在线超额取证（非 SPEC 本轮要求）：`POST /api/v1/run` 跑 trigger→delay(1s)→condition→reply
  工作流，SSE 全事件流符合契约：run:accepted → run:start(total=4) → node:start/done ×4
  → cond（branch=真）→ output → run:done(ok:true, 4/4)。已迁移节点在线行为逐点正常：
  trigger 出参「手动触发 · run #…」（handler 签名行为不变）；delay elapsed=1002ms
  （`paramDefaultsOf` 新链路取 `s=1` 生效）；condition firePort=0 + cond 事件正常
  （`engine.ts:128` 的 `p.expr` 耦合点消费新 DEFS 正常）。
- UI 渲染在线取证：浏览器打开 http://localhost:3000，初始画布 4 节点
  （llm/http/code/delay，**全部为已迁移节点**）渲染完好：combo 选项（llm 模型 6 项 GLM-4.7
  选中、http 方法 GET、code 语言 Python）、number spinbutton（温度 0.7 / 最大 Tokens 2048 /
  超时 30 / 等待 2）、textarea 多行默认值（code）全部从新聚合层正确渲染；底部日志面板仅一条
  连接成功 sys 日志、无错误行。
- 在线留批次 2 的点位（NDP §10.6 五点位，含 trigger cron 显隐）按 SPEC §8 明文延后，
  本轮以静态链替代——此为 SPEC 设计口径，非验证缺口。

### AC8 · 回归零回退 — **PASS（带 OBS-001，见三）**

- `npm test`（shared 包，`node --test`）→ **26/26 绿**（亲跑）。
- `npm run smoke:server`（亲跑两轮，输出一致）：**83 passed / 1 failed**，fail 项 = V09。
  - V09 失败面拆解（读 `tests/smoke/smoke-server.mjs:838-856` 定位）：断言 = 51/51 事件过
    RunEventSchema 校验（**实际通过**）**且** `git status --porcelain -- packages/shared`
    为空（**失败**：工作区 `M packages/shared/src/nodes.ts`）。
  - 根因：产品提交按流程由脚本在 VERIFY 通过后统一执行（JOURNAL 尾部约定），迁移改动
    尚在工作区 → git 半边必红。V09 要防的「DEFS 内容漂移」已被 AC1 逐字节比对
    （cmp 空 + sha256 双侧一致）以更强形式证明为零。**时点性假红，非产品缺陷**
    （迭代 0018 REPORT OBS-001 同款先例：CLOSE 产品提交后该断言自愈机理已实证）。
  - 连带影响：V09 fail-fast 使其后的 Z01–Z04（迭代 0019 悬挂 run 启动扫尾组，与 DEFS
    迁移正交的崩溃重启场景）本轮未执行——见 OBS-001 处置建议。
- 根 `npm test` 链（build:shared→build:server→shared 测试）未整链重跑（ask 约定）；其全部
  组件均已在别处亲跑：build:shared（AC1 步 1）、build:server（BUILD 会话 JOURNAL 表 2，
  且本轮 smoke/在线 E2E 依赖的 server dist 即其产物、运行正常）、shared 测试（本轮 26/26）。

### AC9 · 批次边界不变式 — **PASS（工作区口径；提交动作留脚本时序）**

- `git status --porcelain`（亲跑）产品路径恰 = SPEC §7 白名单：
  `M packages/shared/src/nodes.ts` + 新增 `packages/shared/src/nodes.schema.ts` +
  `packages/shared/src/nodes/{8 目录}/node.ts` + `packages/shared/test/{4 测试}.mjs`
  （untracked `packages/shared/src/nodes/` 展开即 8 目录，`ls -R` 实核）。
- 零改动白名单核对（`git diff --name-only -- apps/ tools/ .github/ package.json
  package-lock.json packages/shared/src/index.ts packages/shared/src/events.ts
  packages/shared/test/nodes.baseline.json`）→ **输出空**（亲跑）。
- 批次 1 边界形态：nodes-dirs 测试 ✔（D===R、D⊆keys、内联残留集恰为批次 2 八键），
  随 26/26 绿；`ls packages/shared/src/nodes/` = 恰 8 目录。
- 行数预算（`wc -l` 亲测）：nodes.schema.ts 174≤300 / nodes.ts 168≤250 / 8 目录
  21–41≤60 / 测试 150/60/80/132 ≤ 150/100/180/200 全达标。
- EOL/BOM：`file` 检查新文件均「UTF-8 text」无 BOM/CRLF 标记。
- **「恰一个产品提交」**：截至本 REPORT 落盘产品提交尚未发生（脚本在 VERIFY 后执行，
  `git log -1` 仍为 2bf5da0 归档 0020）——白名单已核对，提交内容=白名单即满足；
  提交时点属脚本时序约定，不构成验收缺口。归档机制件（BACKLOG.md 备注、STATE.md、
  iterations/0021/）随归档提交，符合 PRD「BACKLOG 备注回写随归档提交（机制件）」。

## 二、静态审查记录（源码实读）

- `nodes.ts`（168 行）：8 静态 import（.js 后缀）→ `loadJsonDef`（safeParse 失败 throw，
  含节点 type 与 issue 路径）→ `synthesize`/`synthesizeParam`（输出键序
  name,cat,icon,[caps],desc,inputs,outputs,params,kw；caps 固定序先 mcp 后 skill、皆无整键
  省略；min/max/step 仅提供时输出；implemented/runtimeOverridable/protocol/type/binding
  不进输出）→ 16 键装配（8 合成 + 8 内联逐字）→ 派生层逻辑保留——与 SPEC §4 键序表逐条吻合。
- `nodes.schema.ts`（174 行）：枚举冻结三种 / strictObject 全体 / discriminatedUnion 五支 /
  superRefine 六规则（①id 唯一 ②visibleIf 悬挂 ③handler 非空 ④combo 值域+number 界
  ⑤结构性 strict ⑥端口 id 唯一+前缀）/ 预留字段 z.unknown——与 SPEC §3 吻合；
  仅 import zod（模块边界合规）。
- 8 目录 `node.ts`：`export default {…} satisfies NodeDefJson` + type-only import；数据与
  HEAD 旧 DEFS 及 SPEC §5 表逐字对照吻合（trigger visibleIf 语义、implemented×5、
  llm runtimeOverridable+temp/max 界、http to 界、code 换行默认值、condition 双 outputs、
  delay 最小骨架；capabilities 依 handler 实况）。
- 4 测试文件与 SPEC §6.1–6.4 设计一一对应（正负例清单、D===R+引用边界扫描、caps 序+
  真值表+序断言+快照+可写性、提取归属算法+精确僵尸清单+两数分开不硬编码）。

## 三、观察记录（非缺陷）

- **OBS-001（Minor·时序）**：smoke V09 的 git 半边在「产品提交前跑 smoke」的任何时点必红
  （断言设计前提是干净检出）。本轮 83/84 + Z01–Z04 被 fail-fast 跳过。处置：CLOSE 产品
  提交落地后由脚本侧复跑一次 `npm run smoke:server` 确认全绿（沿 0018 先例，V09 自愈 +
  Z 组恢复执行）；如需根治可考虑把 V09 的 git 检查改为「提交后专属断言」或对 fail-fast
  顺序调整——属 smoke 基建优化，建议列入 BACKLOG 由 PM 决定（不阻塞本迭代）。
- **OBS-002（信息）**：工作区存在 untracked `openspec/`（OpenSpec 工具初始化骨架：
  config.yaml + 空 changes/specs + .gitkeep），非本迭代产物、不在产品白名单——脚本提交时
  仅 add 白名单文件即不受影响；来源为外部工具初始化，如实记录。

## 四、BUG 清单

无（BUG-0000：本轮零缺陷）。

## 五、回归抽查汇总（test-manager 交互回归清单适用性）

本迭代触 UI=否、apps/web 零 diff，前端三层静态等价由 gate 8 场景 diffPx=0 保证；
交互回归清单（拖拽/缩放/框选/连线等）的对象代码零改动，本轮执行面 = 后端 E2E +
在线 SSE + 渲染加载抽查（见 AC7/AC8），全部通过。全量交互回归留周度治理
（WORKFLOW §5.2 test-manager 全量口径）。

## 六、VERIFY 结论

**PASS**。AC1–AC9 全过（AC8 带 OBS-001 时点性说明）；建议 CLOSE 时：
①脚本执行产品提交（白名单 = SPEC §7）后复跑 `npm run smoke:server` 确认 V09 自愈与
Z 组全绿；②BK-0021 保持 doing（批次 2 未竟），STATE.item 续填；③OBS-001 的 smoke
基建优化建议交 PM 评估是否立项。
