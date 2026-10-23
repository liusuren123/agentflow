# REPORT · 迭代 0011 · BK-0026 golden 场景扩充实现：s4 工作流面板在线态 / s5 历史面板在线态

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 01:50
> 输入：`iterations/0011/PRD.md`（AC1~AC6）+ `iterations/0011/SPEC.md`（§6 验收口径 1~9）
> **结论：PASS**（AC1~AC5 + SPEC §6.5/6.6/6.7/6.8 全过 + 交互回归抽查 17/17；AC6 属推送后
> 义务，本轮尚未到执行时点——产品提交未发生，见 §AC6。无 BUG。）
> 环境：本机 Windows（win32 10.0.26300）· Node v24.21.1 · Playwright 1.64.1 Chromium。
> golden 权威在 CI（windows-latest，宪法第 2 条）；本机结果为参考性证据 + CI 盯守的前置。
> 门禁声明：`npm run build` + 首跑 gate（s4/s5 golden-created 落盘）+ 二跑 gate + `npm test`
> 已由工作流脚本统一执行且通过（本 VERIFY 的 ask 声明）；VERIFY 按契约未重复全套，只做
> 定向复核（AC3 反演两跑 / npm test / 交互抽查），全部本会话实跑、逐项列证据于下。

## 验收结论总表

| # | 验收项 | 结论 | 证据（本会话实跑，详见对应节） |
| --- | --- | --- | --- |
| AC1 | 六场景自一致性 | PASS | 还原后实跑 `npm run gate`：6 行全 `pass · diffPx=0`、exit 0；4 基线文件在盘（唯一写入口是 golden-created 通道 `gate.mjs:192-196`） |
| AC2 | 既有基线零漂移 | PASS | `git diff HEAD --name-only -- tests/golden/ui/` 输出为空；porcelain 在 `tests/golden/ui/` 下仅 4 个 s4/s5 新增（??）文件；s0~s3 共 8 文件在盘未触 |
| AC3 | 保护力反演 | PASS | 临时置空 s4 fixture → gate exit 1（`wfReady` 超时，红即 FAIL 信号、无伪基线）；还原（sha256 一致）→ 6/6 复绿 exit 0 |
| AC4 | 产品代码与契约零变化 | PASS | porcelain 无 `apps/web|apps/server|packages/shared|.github` 任何路径；`npm test` 8/8 pass（VERIFY 实跑） |
| AC5 | ADR 批复标注在档 | PASS | `docs/adr/0009-*.md:3` 状态行三要素齐（已批准 + issue#7 + 2026-10-23T15:48:48Z） |
| AC6 | CI 权威盯守 | **未到执行时点** | HEAD=c381d1d，产品提交未发生（改动仍在工作区）；推送后由脚本盯 `ui-constitution`，VERIFY 不代判 |
| SPEC §6.8 | 基线内容 sanity | PASS | invariants 与 SPEC §3.4 字面量逐项相等；PNG 视觉复核：侧栏开/标题正确/3 卡在线态/UTC 时间渲染/无「加载中…」「后端未连接」 |
| 交互回归抽查 | test-manager 职责 | PASS | 临时 Playwright 脚本 17/17 断言过（rail 切换往返/三态分布/时长进度列/画布拖拽/console 零错误），exit 0 |
| REQ-0026-05 | 改动面白名单 | PASS | 产品相关改动恰为 gate.mjs（M）+ ADR-0009（M）+ 4 新基线（??）；STATE/BACKLOG/iterations 为流程产物（归档提交承载，JOURNAL §1 同口径） |

## AC1 · 六场景自一致性 — PASS

- 脚本侧（ask 声明，VERIFY 未重复）：首跑 gate s0~s3 `pass · diffPx=0`、s4/s5
  `golden-created` 落盘 4 文件；二跑 6 场景全 pass。
- VERIFY 实跑（AC3 反演的还原复绿跑，兼作 AC1 独立复核），命令 `npm run gate`，输出：

```
✓ s0-initial       pass · diffPx=0
✓ s1-select-node   pass · diffPx=0
✓ s2-settings      pass · diffPx=0
✓ s3-library       pass · diffPx=0
✓ s4-workflows-online pass · diffPx=0
✓ s5-history-online pass · diffPx=0

宪法门禁：通过 ✓        （EXIT=0）
```

- 4 个新增基线在盘（`ls tests/golden/ui/`：s4/s5 各 png+invariants.json，与 s0~s3 并列
  共 12 文件）；落盘唯一写入口是 golden-created 通道（`tools/pixel-gate/gate.mjs:192-196`），
  本迭代未使用 `gate:update`（REQ-0026-02 ✓）。

## AC2 · 既有基线零漂移 — PASS

- `git diff HEAD --name-only -- tests/golden/ui/` → **空输出**（tracked 文件零改动）。
- `git status --porcelain -- tests/golden/ui/` → 恰 4 行 `??`（s4/s5 png+invariants.json），
  无任何 `M`。
- s0~s3 的 8 个文件在盘存在（`ls` 证实）且不在 diff 中——逐字节冻结达成。

## AC3 · 保护力反演 — PASS

按 SPEC §6.6 / PRD AC3 执行完整演练（破坏 → 红 → 还原 → 复绿）：

1. **备份**：`cp gate.mjs → %TEMP%/gate.mjs.backup`，sha256 双方一致
   （`36c05ea8…4ece94e4cc`）。
2. **破坏供数**：以 node 脚本把 s4 fixture `workflows: […]` 置为 `workflows: []`
   （`node --check` 过；唯一改动就是该数组）。
3. **红**：`npm run gate` → **EXIT=1**，异常栈定位 s4 就绪等待：
   `page.waitForFunction: Timeout 10000ms exceeded · at Object.wfReady
   (gate.mjs:96，打补丁后行号) · at runScenario (…:143)`。gate 非零退出 = FAIL 信号
   （SPEC §4 设计：「超时抛错使该轮 gate 非零退出——红即 FAIL 信号，不落伪基线」）。
   崩溃发生在比对写盘之前：golden 未被污染，`tests/golden/diff/` 无残留（事后 ls 证实）。
4. **还原**：`cp %TEMP%/gate.mjs.backup → gate.mjs`，sha256 与破坏前逐字节一致
   （`36c05ea8…` 双文件相同），`node --check` 过。
5. **复绿**：`npm run gate` → 6 场景全 `pass · diffPx=0`、EXIT=0（输出见 §AC1）；
   全绿触发 BUG-002 清理逻辑（`gate.mjs:222-224`），`tests/golden/diff/` 清空。
6. **收尾**：`git status --porcelain` 与演练前完全一致（反演改动未入场）；临时文件已删。

形态学说明（OBS-1，非缺陷）：SPEC §6.6 预言的 FAIL 形态是「比对 FAIL 行 + diff 证据落盘」，
实测（置空 fixture）的 FAIL 形态是更早的就绪等待超时异常——因 `wfReady`（`gate.mjs:100-102`）
条件即「3 张服务端卡」，0 卡在比对前就被卡死。两者都是「破坏供数 → gate 红」；比对型 FAIL
路径（卡片数量不变而内容变）仍由 pixelmatch 0 容差 + 不变量双重复核覆盖，无保护缺口。

## AC4 · 产品代码与契约零变化 — PASS

- `git status --porcelain -- apps/web apps/server packages/shared .github` → **空输出**。
- `npm test`（VERIFY 实跑）→ **8/8 pass, 0 fail**（节点注册表/端口/SSE 契约/DEFS 漂移/
  handler 键集全绿，`duration_ms 714`）。
- `tools/pixel-gate/` 其余文件、`tests/smoke/**`、`tests/canvas/**` 均不在 porcelain 中。

## AC5 · ADR 批复标注在档 — PASS

`grep -n "已批准\|issue#7\|2026-10-23T15:48:48Z" docs/adr/0009-golden-s4-s5-online-panels.md`：

```
3:- 状态：**已批准（issue#7 用户批复 2026-10-23T15:48:48Z，PLAN 0011 会话 gh 亲核）· 实现于迭代 0011**
```

`git diff docs/adr/0009-*.md` 复核改动面：仅状态行 + 显著声明块两处（与 JOURNAL §1 声明
一致），§1~§8 正文零改动。issue #7 链接在档（ADR 头部关联行）。

## AC6 · CI 权威盯守 — 未到执行时点（不判过、不判挂）

`git log --oneline -3`：HEAD=c381d1d（0011 产品提交尚未产生，全部改动仍在工作区）。
推送与 CI 盯守发生在 CLOSE/脚本侧推送之后；VERIFY 如实记录「待推送后盯
`ui-constitution`（windows-latest）6 场景」，不以本机绿自判通过（宪法第 2 条）。
**移交：脚本推送后须确认 CI 6 场景绿；CI 红则以 CI 为权威排查。**

## SPEC §6.8 · 基线内容 sanity — PASS

- `tests/golden/ui/s4-workflows-online.invariants.json`：`sideOpen:true`、
  `sideTitle:"工作流"`、`serverWf === ["wf-alpha-001","wf-beta-002","wf-gamma-003"]`
  ——与 SPEC §3.4 字面量逐项相等；公共六键（view/zoom/nodes/cssVars/counts/bottomClosed）
  与 s0~s3 同源一致（画布背景态在线/离线零漂移）。
- `tests/golden/ui/s5-history-online.invariants.json`：`sideTitle:"任务历史"`、
  `serverRuns === ["run-done-001:ok","run-error-002:stop","run-live-003:stop"]`——三态
  class 分布恰为 runCardMeta 映射（done→ok / error→stop / running→stop）。
- PNG 视觉复核（AI 视觉分析，两张全图）：s4 侧栏开、标题「工作流」、「服务端」分组 3 卡
  （Demo Alpha / 示例工作流乙 / Runner Gamma），时间列 `1/1 00:00:00`、`1/2 00:00:00`、
  `1/3 00:00:00`（timezoneId UTC 确定性渲染实证）；s5 标题「任务历史」、3 卡三态
  （✓ done 812.3s 4/4 节点 / ■ 失败 245.0s 2/5 / ■ 进行中 — 1/3）；两图均无
  「加载中…」「后端未连接」占位、无错误 toast。（视觉结论有 invariants 数据级证据互证。）

## 交互回归抽查 — PASS（17/17）

临时 Playwright 脚本（OS temp 目录，不入仓；同款三路由 fixture + timezoneId UTC + 静态托管
dist，模拟 gate s4/s5 环境）实跑，exit 0：

- s4 交互 7 项：标题=工作流 / 侧栏 open / 服务端 3 卡 id 序 exact / 无「后端未连接」「加载中」/
  中英卡名渲染 / 含「服务端」分组 / UTC 时间 `1/1 00:00:00`。
- s5 交互 6 项：标题=任务历史 / 三态分布 `run-done-001:ok, run-error-002:stop,
  run-live-003:stop` exact / 时长列 812.3s+245.0s / 状态后缀 失败+进行中 / 进度列 4/4+2/5+1/3 /
  无占位符。
- rail 切换 2 项：history→nodes 面板切换（节点库）/ nodes→workflows 往返 3 卡仍在。
- 画布回归 1 项：拖拽平移改变 view transform（`translate(16.7143px,159.879px)
  scale(0.557143)` → `translate(76.7143px,199.879px) scale(0.557143)`）；滚轮行为记录
  zoom 56%→62%（门控语义由既有 gate/canvas 套件守护，此处仅记录）。
- console 面 1 项：页面错误 0（favicon 404 除外）。

## BUG 清单

无。

## 观察记录（非缺陷，供后续参考）

- **OBS-1**：AC3 反演的实测 FAIL 形态（就绪等待超时异常）与 SPEC §6.6 预言（比对 FAIL 行
  + diff 落盘）不同——SPEC §4 本就定义超时=红，实测是其直接结果，保护面无缺口（见 §AC3）。
- **OBS-2**：交互抽查脚本首次运行失败，定位为本会话自建 harness 的 Windows 路径 bug
  （正斜杠常量 vs `path.join` 反斜杠产物 → `startsWith` 永假 → 静态服务 404）；与仓库代码
  无关（gate.mjs 用 `path.resolve` 无此问题），修正后全绿。记录以免误读首跑失败。
- **OBS-3**：s4 场景「已打开 (1)」本地分组含默认标签页名「智能客服助手」（PNG 视觉复核
  可见）——与 s0~s3 同源的 boot 确定性内容，SPEC §3.3 已预见，非异常。

## VERIFY 实跑命令清单（全部本会话执行）

1. `git status --porcelain` / `git diff HEAD --name-only -- tests/golden/ui/` /
   `git diff --name-only -- tests/golden/ui/` / `git log --oneline -3`
2. `grep -n "已批准|issue#7|2026-10-23T15:48:48Z" docs/adr/0009-*.md` + `git diff docs/adr/0009-*.md`
3. `npm test`（8/8）
4. 读 `tests/golden/ui/s4|s5-*.invariants.json` + 两 PNG 视觉分析
5. 临时交互回归脚本（17 断言，exit 0；脚本已删）
6. AC3 反演：备份 sha256 → 置空 s4 fixture → `npm run gate`（EXIT=1）→ 还原（sha256 一致）
   → `npm run gate`（6/6 pass，EXIT=0）→ porcelain 复核 + temp 清理
