# JOURNAL · 迭代 0034 · BK-0037 终端只读流节点 termview（BUILD 轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25（工作树 feat/0034-iter 内）。
> 输入：`iterations/0034/PRD.md` + `iterations/0034/SPEC.md`（含 §0.2 代码锚点，BUILD 轮逐条复核成立）。
> 授权链：issue#3 用户批复（2026-10-23T15:49:32Z 承继，SPEC 亲核在案）+ ADR-0015（本轮回写状态行）。

## 1. 落盘清单（对照 SPEC §7 白名单，20 项）

| # | 文件（相对工作树根） | 动作 | 备注 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/termview/node.ts` | 新增 | SPEC §2 逐字落盘，24 行（≤30） |
| 2 | `packages/shared/src/nodes/termview/README.md` | 新增 | 生成器产出（勿手写纪律） |
| 3 | `packages/shared/src/nodes/README.md` | 改 | 恰 2 行内容变更：计数 17→18 + termview 总索引行 |
| 4 | `packages/shared/src/nodes.ts` | 改 | 头注计数置换 + import（reply 后）+ 键（reply 后），081b32d 同款三处 |
| 5 | `packages/shared/src/nodes.schema.ts` | 零改动 | ✓（git diff 空） |
| 6 | `tools/gen-node-readmes.mjs` | 改 | MANUAL_NOTES +termview（SPEC §5.8 建议文案）+ 两处计数 17→18 |
| 7 | `packages/shared/test/nodes.baseline.json` | 改 | NDP 权威命令重产（§2 命令，docs/node-definition-protocol-migration-spec.md:36），numstat +31/−0 = 恰一键 |
| 8 | `packages/shared/test/contract.test.mjs` | 改 | 17 种→18 种（:10-11） |
| 9 | `packages/shared/test/nodes-dirs.test.mjs` | 改 | D.size 17→18（:31）+ 头注 :5 |
| 10 | `packages/shared/test/defs-drift.test.mjs` | 改 | +termview 期望行（reply 后）、自检 36→38、标题/消息计数、头注 |
| 11 | `packages/shared/test/param-handler-guard.test.mjs` | 改 | EXPECTED_ZOMBIES +`['termview', ['lines','autoscroll']]`、total 36→38 |
| 12 | `packages/shared/test/readme-consistency.test.mjs` | 改 | 18 类型 / 18 行 / 19 份 三处计数文案 |
| 13 | `apps/server/src/handlers.ts` | 改 | +termview handler（reply 与 setvar 之间纯插入，SPEC §3 逐字）；298→305 行 ≤400 |
| 14 | `apps/web/src/legacy/app.js` | 改 | 四处纯插入共 +39/−0（termEl/termConsume + onEvent 钩子 + RUN_META 一行 + runSimulated 一行） |
| 15 | `apps/web/src/app.css` | 改 | 尾部纯插入 +7/−0（.node-term / .collapsed / .node-term-err） |
| 16 | `tools/pixel-gate/gate.mjs` | 改 | 纯插入 +11/−0（TERMVIEW_WF_SEED + s10 场景行），判定逻辑零触碰 |
| 17 | `tests/golden/ui/s10-termview-node.png` + `.invariants.json` | **归脚本** | golden-created 通道（BUILD 不跑 gate，见 §4） |
| 18 | `tests/golden/ui/s3-library.png` + `.invariants.json` | **归脚本** | 修宪轮 gate:update 恰一次（脚本执行） |
| 19 | `tests/smoke/smoke-server.mjs` | 改 | +T 组断言 T01-T03（A05 后、Z 组前，openSse/waitFor 沿 A 组先例） |
| 20 | `docs/adr/0015-presentation-triplet-nodes.md` | 改 | 状态行置换（081b32d 先例形态）+ §7 termview 块尾实施纪要（块外引用行，代码块本体零改动保 VERBATIM 基线） |

**禁区核对（AC5，本会话亲跑）**：`git diff --name-only -- package.json package-lock.json
apps/server/src/{engine,guard,server,llm,agent,store}.ts packages/shared/src/{events.ts,nodes.schema.ts}
apps/web/src/Skeleton.tsx packages/shared/test/synthesis.test.mjs tests/golden/ui/` → **空输出（零触）**。
纯插入判据：`git diff --numstat` 三敏感文件 = app.js **39/0** · app.css **7/0** · gate.mjs **11/0**（删除行全 0）。

## 2. 自测记录（工作树内亲跑；gate/golden 归脚本，见 §4）

| 命令 | 结果 |
| --- | --- |
| `npm run build:shared` | tsc 零报错 |
| baseline 重产 + `node tools/gen-node-readmes.mjs` | 19 份产出（18 README + 总索引）；既有 17 份为纯 EOL 重写（git numstat 0 行，autocrlf 检出 CRLF vs 生成器 LF，readme-consistency 已有归一口径） |
| `npm test` | **tests 30 · pass 30 · fail 0**（含 nodes-dirs D===18 / defs-drift 38 / param-handler-guard 僵尸+2 / baseline 逐字节 / readme-consistency 19 份幂等回比） |
| `npm run build:server` + `npm run smoke:server` | 全量套件在**脏树**上 fail-fast 于 **V09**（其 `git status --porcelain -- packages/shared` 环境断言要求干净检出；事件 schema 校验部分 51/51 通过）——预提交运行的必然结果，**提交后即绿**（WORKFLOW §4 冒烟本就归 VERIFY/主干复测的提交后阶段） |
| `node tests/.selftest-tmp/smoke-server.mjs`（一次性副本：仅豁免 V09 的 shared-clean 环境断言，跑完即删） | **109 passed / 0 failed**：**T01 PASS**（termview out=「已呈现流 · 14 字」+ output 全文 + run:done.outputs 含全文）、**T02 PASS**（trigger 直连降级「已呈现流 · 0 字」）、**T03 PASS**（mock 模型请求零增量）；109 = 基线 104 + T 组 3 + 两次新 run 的 C01 清理断言 2 |
| AC5 grep | 非注释新增代码 `contenteditable`/`<input`/`stdin`/`node-pty`/`textarea` **零命中**（exit=1） |

## 3. 如实申报与待 VERIFY 裁定点

1. **SPEC §2 逐字落盘 vs §7 grep 零命中的字面冲突**：termview/node.ts 头注按 SPEC §2
   逐字含「严禁 node-pty/PTY」护栏文案（SPEC §4.1 app.js 注释同理含「无 input/stdin」字样）
   → 全库字面 grep `node-pty` 有且仅 1 命中 = 该注释行。AC5 的意图判据（无 PTY 依赖/用法）
   成立：非注释代码零命中、package.json/lock 零 diff、无子进程/端点。VERIFY 可按
   「剥注释 grep 或查依赖清单」口径裁定；BUILD 未擅改逐字代码块。
2. **synthesis.test.mjs 测试标题陈旧文案**（「不变式 A，17 键全量」）：SPEC §5.7 裁定该文件
   零改动，本测试实际比对的是重产后的 18 键 baseline 与运行时逐字节等价（30/30 全绿佐证），
   标题文案未动，如实记录。
3. **生成器全量 EOL 重写**：17 份既有 README 工作树字节被刷新为 LF（git numstat 0 行、
   git diff 零内容差异），未列入 productFiles 提交清单（内容零漂移，纯检出态差异），
   工作树清理时随分支丢弃，不影响主干。
4. **AC8 并行冲突申报（与 BK-0036 的产品文件交集）**：`nodes.ts` / `nodes.baseline.json` /
   `contract.test.mjs` / `nodes-dirs.test.mjs` / `defs-drift.test.mjs` /
   `param-handler-guard.test.mjs` / `readme-consistency.test.mjs` / `nodes/README.md` /
   `gen-node-readmes.mjs` / `handlers.ts` / `app.js` / `app.css` / `gate.mjs` /
   `smoke-server.mjs` / s3-library golden——交仲裁员按 WORKFLOW §6 护栏 9 处置
   （产品代码冲突不得自行择一；本分支计数口径 = 本工作树合并前事实 17→18，若 BK-0036
   先落地则后落地方按合并后基线重产校正，SPEC §10 口径）。场景号撞号时 s10-termview-node
   由后落地方机械改名顺延。
5. **未跑项（如实）**：`npm run gate` / `npm run gate:update` / 全量 web build（AC1/AC7）
   与 AC4 手动 E2E 五点位——按本轮派发指令归脚本统一执行，BUILD 未代跑、未触碰 golden。

## 4. 实现要点备忘（供 VERIFY 抽查）

- 呈现区惰性挂载：`termEl` 仅在首个 delta/error 时创建并 `insertBefore(.node-out)`，
  静态态（s0~s9）DOM 零新增——s3 之外场景零波及的机理。
- delta = 累积全文覆盖（llm.ts:89/:101/:103 acc 语义）+ `lines` 行数裁旧 + `▌` 光标；
  done 仅去光标（区不存在则零操作，不伪造流式语义）；autoscroll!==false 才滚动。
- 服务端 handler 不引用 `p.lines/p.autoscroll`（僵尸登记在案）；`toStr` 承载 `__trigger`
  →'' 空输入降级（T02 实证）。
- gate.mjs 仅数据插入（seed 常量 + 场景行），`UPDATE || !existsSync` 判定与比对逻辑零触碰。

## 5. 修复轮（VERIFY BUG-001 / BUG-002，2026-10-25）

### 5.1 BUG-001（Critical）· 在线运行路径呈现区永不出现——已修复

- **根因复核（本轮亲读代码）**：`node:delta` 的 `ev.id` 归属**发射节点**（`apps/server/src/llm.ts`
  纯流式分支 `emit('node:delta', { id: n.id, text: acc })`，acc 累积语义；工具分支 :89 同型）；
  原 `termConsume` 以 `ev.id` 匹配节点且 `n.type!=='termview'` 即丢弃全部上游 delta；termview
  handler 自身仅 `emit('output')`（handlers.ts，无 delta 通道）；termview 自身 `node:done`
  到达时 `.node-term` 未创建则惰性零操作——三因合拢致在线路径 delta/done 分支可达性互斥。
- **修复（`apps/web/src/legacy/app.js` termConsume 改写，仅动本轮自插块，零引擎改动）**：
  delta 事件按边关系转发——`state.edges` 中 `e.fn===ev.id` 的下游 `type==='termview'`
  且未旁路节点为呈现目标集（发射节点自身即 termview 时并入，覆盖模拟执行直喂形态）；
  done/error 仍按 `ev.id` 自有语义（termview 的 done 去光标在转发出的呈现区上生效：
  引擎拓扑序上游 done → termview 执行 → termview done，时序成立）。旁路（bypass）节点
  不进目标集（不改变既有旁路语义）。
- **补验 AC4-③⑤（本轮亲跑）**：一次性 E2E 脚本（复刻 VERIFY 复现环境：进程内 mock
  OpenAI 兼容**流式**端点，30 行文本分 5 段 ×150ms 流出 + `AI_BASE_URL`/`AI_API_KEY`/
  `AI_MODEL` 注入后端实例（显式空串压制本机 .env 真实密钥）+ 静态托管 dist（/api 代理）
  + Playwright 实跑 `#float-run` 在线运行，trigger→llm→termview 连线，跑毕即删）：
  **12 passed / 0 failed**——
  - AC4-③：`.node-term` 在线运行中出现（BUG-001 症状消除）；60ms 轮询截到 delta 中间帧
    `▌` 光标（流式逐次更新直证）；done 后去光标定稿；`.node-out` 摘要照常（「已呈现流 · 119 字」）；
  - AC4-⑤：`lines=20` 裁旧实证（30 行输入 → 保留末 20 行「行11..行30」，首行消失）；
    `autoscroll=true` 滚到底（scrollTop=171 = scrollHeight 331 − clientHeight 160）；
    `autoscroll=false` 滚动位置不动（scrollTop=0）。
- **门禁影响评估**：修复仅涉及运行期事件路径，静态态（s0~s9/s10 采集面）DOM 零变化
  （delta 事件离线不发生、惰性挂载不触发）——既有 golden 无需任何重录；`npm test`
  修复轮重跑 **30/30 全绿**；对迭代基底（merge-base 84ee8ec）`git diff --numstat`
  app.js **+56/−0** · app.css **+7/−0** · gate.mjs **+11/−0**，纯插入判据保持成立
  （删除行=0）。

### 5.2 BUG-002（Minor）· ADR-0015 实施纪要失实——已按事实校正

- VERIFY 实测（引用 VERIFY 材料）：s3-library 基线从未被重录也无需重录——节点库新增行
  （y≈1116–1177）在 gate 视口 1600×900 之外被页面裁剪、#lib-list 无内部滚动，两轮亲跑
  gate s3 **diffPx=0**；git status golden 目录仅 s10 两文件新增，s3 mtime/numstat 零变更；
  `gate:update` 实际 **0 次**（≤1 合规）。
- 修复：ADR-0015 §7 实施纪要改为事实表述（s10 golden-created 落盘；s3 零波及免重录及
  机理；gate:update 实际 0 次）。BUILD 轮原纪要写于 golden 执行前、属计划口径误作
  结果陈述，如实记档于此。

### 5.3 合并申报补充（交仲裁员，随 AC8 清单）

- 本分支基于 merge-base `84ee8ec`；主干已并入并行路 BK-0036（0033 webshow，含 RUN_META
  webshow 行 / WS_HTTP_S 辅助块 / onEvent 钩子等）。`git diff main` 视角的 app.js 删除行
  全部为主干侧 webshow 内容（分支基龄差异，非本轮删改）——合并时与 termview 插入块
  的邻接区域交仲裁员按 WORKFLOW §6 护栏 9 分类处置；termview 侧对 merge-base 保持
  纯插入（5.1 numstat 实证）。
- productFiles 相对 BUILD 轮的口径修正：`tests/golden/ui/s3-library.*` 两文件经 VERIFY
  实测零变更，移出提交清单（BUILD 轮曾按 SPEC §7 预案列入；本轮起清单只含实际变更）。
