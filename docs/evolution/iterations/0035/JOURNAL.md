# JOURNAL · 迭代 0035 · BK-0038 jsoncanvas（BUILD 轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25/26 · 工作树 feat/0035-iter 内。
> 输入：`iterations/0035/PRD.md` + `iterations/0035/SPEC.md`（SPEC §0 基线四项全绿在案）。

## 一、实现落盘清单（按 SPEC §7 白名单序）

| # | 文件 | 动作 | SPEC 依据 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes/jsoncanvas/node.ts` | 新增 | §2 终稿逐字 | ✓ |
| 2 | `packages/shared/src/nodes/jsoncanvas/README.md` | 新增（生成器产出） | §6.9 | ✓ |
| 3 | `packages/shared/src/nodes/README.md` | 改（生成器重跑：总索引 +1 行 + 「19 种」→「20 种」） | §6.9 | ✓（git 内容级 diff 仅此一文件，其余节点 README 为 EOL 归一噪声零内容差） |
| 4 | `packages/shared/src/nodes.ts` | 改（+1 import +1 键 + 头注计数置换） | §2（键位 webshow 后 approval 前） | ✓ |
| 5 | `tools/gen-node-readmes.mjs` | 改（MANUAL_NOTES +jsoncanvas 条目 + 「19 种」→「20 种」 + `!==19`→`!==20`） | §6.8 | ✓ |
| 6 | `packages/shared/test/nodes.baseline.json` | 重产（19→20 键） | §6.1（NDP §2 权威命令） | ✓ |
| 7 | `packages/shared/test/contract.test.mjs` | 改（19→20） | §6.2 | ✓ |
| 8 | `packages/shared/test/nodes-dirs.test.mjs` | 改（D.size 20 + 头注） | §6.3 | ✓ |
| 9 | `packages/shared/test/defs-drift.test.mjs` | 改（+jsoncanvas 行 42 参数 + 头注/注释） | §6.4 | ✓ |
| 10 | `packages/shared/test/param-handler-guard.test.mjs` | 改（+jsoncanvas 僵尸行 + total 42 + 注释追加） | §6.5 | ✓ |
| 11 | `packages/shared/test/readme-consistency.test.mjs` | 改（计数串 20 ×4 + 头注「18 份」→「20 份」） | §6.6 | ✓ |
| 12 | `apps/server/src/handlers.ts` | 改（+jsoncanvas handler，插 webshow 与 approval 之间，纯插入） | §3 | ✓ |
| 13 | `apps/web/src/legacy/app.js` | 改（五处纯插入：呈现模块块 / RUN_META 一行 / runSimulated 一行 / onEvent 预钩子） | §4.1 | ✓（SPEC 谓「五处」其中第 5 处为零 case 体改动的裁示项，实际插入四处） |
| 14 | `apps/web/src/app.css` | 改（新选择器追加文件尾，纯插入） | §4.2 | ✓ |
| 15 | `tools/pixel-gate/gate.mjs` | 改（JSONCANVAS_WF_SEED + jcRunClick/jcReady 基建块 + 场景表 s12 行，纯插入） | §5.1 | ✓ |
| 16 | `tests/golden/ui/s12-jsoncanvas-node.png` + `.invariants.json` | 新增 | §5.1 golden-created | 见自测记录 |
| 18 | `tests/smoke/smoke-server.mjs` | 改（J 组 J01-J04 整块插 O 组后、Z 组注释前） | §9 AC3 | ✓ |
| 19 | `docs/adr/0015-presentation-triplet-nodes.md` | 改（状态行链闭合 + §7 jsoncanvas 代码块尾实施纪要） | §8 | ✓ |

17 号（s3-library 重录）按预期**不在集内**（见自测记录四）。

## 二、实现要点与裁示执行记录

1. **DEFS**：node.ts 按 SPEC §2 终稿逐字落盘（26 行 ≤60 行上限）；NDP schema 加载校验随
   `loadJsonDef` 走（build:shared 后生成器亲跑通过 = schema 校验通过）。
2. **handler**：SPEC §3 逐字；摘要三分（JSON N 项 / 空输入 0 项 / 原文 N 字）；`toStr`
   复用既有 import（handlers.ts:11 已有）；engine.ts 零改动（BASIC_HANDLERS 展开自动注册）。
3. **前端**：jsonConsume 三旁路（start 归属 / output 全文 / done 兜底）+ jcBuild 树构造
   + jcRender parse 降级；`jcFoldClick` 委托容器；全部 textContent 注入零 innerHTML
   （安全必答项）；惰性挂载保静态场景零创建。onEvent 既有 case 体零触碰（预钩子旁路，
   termview 同款）。
4. **gate s12**：静态 seed + `#float-run` 点击走 runSimulated（离线分支）+ jcReady 等
   `!body.running && jc-row≥4` 终态门；判定逻辑零触碰（纯数据插入）。
5. **smoke J 组**：整块连续插入（a89bf60 教训）；jRun 同 tRun 型（mock 实例）；
   J04 采样 jReqBefore 在 J01 之前。
6. **ADR-0015 回写**：状态行「BK-0038 实施轮已消费（迭代 0035）· 链闭合」；实施纪要
   引用块插 jsoncanvas 权威字面量代码块尾（BK-0037 先例形态）。**注**：纪要内 s3 零波及
   / gate:update 0 次为实测后核对项，见自测记录四；若实测不符须修正纪要后再交付。

## 三、自测记录（工作树内亲跑；门禁与提交由脚本统一执行）

### 记录一 · 实现后构建与契约测试

- `npm run build` → vite 构建成功，`dist/index.html 359.26 kB`，`✓ built in 704ms`。
- `npm test` → `ℹ tests 30 · ℹ pass 30 · ℹ fail 0`（基线 30 项零回退；nodes-dirs D===20 /
  defs-drift 42 / contract 20 键 / readme-consistency / param-handler-guard 42 全部联动通过；
  synthesis 陈旧计数串「19 键全量」按 SPEC §6.7 裁定不动，断言本体数据驱动恒绿）。

### 记录二 · 冒烟（含 V09 脏树哨兵的先例处置）

- `npm run smoke:server`（全量，脏树）→ fail-fast 于 **V09**（89 passed / 1 failed）：
  V09 的 `git status --porcelain -- packages/shared` 环境断言要求干净检出，预提交工作树
  必然脏；事件 schema 校验部分 51/51 通过。**0034 先例在案**（iterations/0034/JOURNAL.md
  :44-45：同款 V09 fail-fast = 预提交运行必然结果，提交后即绿）。
- 一次性副本（0034 同款跑法）：`tests/.selftest-tmp/`（.gitignore:18 在案不入库）复制
  smoke 套件 + 仅豁免 V09 shared-clean 断言 → **125 passed / 0 failed**：
  **J01 PASS**（`node:done.out === '已呈现 JSON · 2 项'` + output 恰 1 条 text=`{"a":1,"b":2}`
  + run:done.outputs 含该 JSON）、**J02 PASS**（trigger 直连降级「已呈现 JSON · 0 项」）、
  **J03 PASS**（tpl=hello → out「已呈现原文 · 5 字（非 JSON，前端原文降级）」+ output
  text=hello）、**J04 PASS**（mock 模型请求数零增量）。125 = 基线 118 + J 组 4 + 新 run
  的 C01 清理断言 3。副本跑完即删。

### 记录三 · gate 首轮（s12 golden-created 落盘；s3 波及实测裁定）

- `npm run gate` → **s0~s11 全 pass diffPx=0 + ⊕ s12-jsoncanvas-node golden-created**，
  「宪法门禁：通过 ✓」。**s3-library 实测 diffPx=0 零波及**（新增「JSON 画布」条目落位
  1600×900 视口折叠线下——0033/0034 同款结论第三轮复证）；**gate:update 实际消费 0 次**
  （≤1 合规）。
- s12 不变量亲核（`tests/golden/ui/s12-jsoncanvas-node.invariants.json`）：counts
  `{nodes:2, edges:1, widgets:3, ports:2, tabs:1}`（widgets=trigger mode+expand+fmt、
  ports=trigger 单出+jsoncanvas 单入，与 SPEC §5.1 预期一致）；view `translate(60px, 40px)
  scale(1)` / zoom 100% 沿 seed 字面；cssVars 键集与 s11 基线全等（零新变量）；节点 2
  高度 300x323（含树区；对照节点 1 300x133）= 树已渲染。

### 记录四 · gate 确定性双采（AC7）+ AC5 自查

- 第二轮 `npm run gate` → **13 场景全 pass diffPx=0**（s12 由 golden-created 转 pass，
  两轮独立采集与基线逐字节一致）——AC7 达成，无抖动。
- `git diff --numstat` 三敏感文件删除行数全 0：app.js +110/0、app.css +15/0、gate.mjs
  +16/0（纯插入判据达成）。
- 禁区路径 `git diff` 恒空（package.json / package-lock.json / engine.ts / guard.ts /
  events.ts / Skeleton.tsx / nodes.schema.ts / server.ts / util.ts / synthesis.test.mjs）；
  package-lock 零变化 = 零依赖。
- grep 断言：jsoncanvas 新增代码 `contenteditable` / `<input` / `stdin` 零命中；
  `node-pty` 全库恰 1 命中 = `packages/shared/src/nodes/termview/node.ts:6` **既有禁令
  注释**（0034 轮在库原文「严禁 node-pty/PTY」，本轮零触碰）——非引入非使用，禁区
  语义成立。
- 呈现区只读性（AC4-⑤ 静态可证部分）：`.node-jtree` 子树仅 div/span + textContent 注入
  + jcFoldClick 折叠切换，无任何可编辑控件（代码事实）。

### 记录五 · AC4 手动 E2E 五点位

**未执行**（BUILD 轮无浏览器交互实跑；归 VERIFY 轮 test-manager 按验收口径执行——
SPEC §9 AC4 口径「浏览器实跑 npm start」）。s12 场景的机器可证子集（节点库条目渲染、
widget 行、树终态、折叠初态）已由 gate 不变量与像素基线覆盖。

## 四、AC8 并行冲突申报

本轮 BUILD 全程核查：`.zcode/locks/items` 空、`git worktree list` 仅主干 + 本路
feat/0035-iter（PLAN 轮口径维持）——无并行路在途，无文件交集申报事项。
