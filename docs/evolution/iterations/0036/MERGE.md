# MERGE · 迭代 0036（BK-0040 工作台右栏容器 + git 信息页）

> 合并仲裁员执行 W44 周报 §五处置建议（三硬条件全项落实）。分支 `feat/0036-iter`
> 自 2026-10-25 完成后滞留，主干其后经 0035~0052 演进（golden 16 场景、smoke 133
> 断言、gate 头注计数 16）；本次合流含场景号时序裁决与三处收口。
>
> 提交链：`a820b1d`（分支侧补提交，见 §0）→ **`85067b6`（合并提交，amend 自
> 0d9116e——首轮解冲突自伤 bug 由门禁抓出后修复并入，见 §3.1）** → `0f5726c`
> （s16 不变量单行同步，40f9d06 同型先例）→ 本证据提交。

## 0. 合并前发现：分支漏提交 workbench 三模块（0034 同型故障）

预检 `git ls-tree -r feat/0036-iter -- apps/server/src/` 实查发现：产品提交 3eb86e5
声称的「后端 workbench 三模块」**不在任何提交里**——分支 server.ts 引入
`import { workbenchGitHandler } from './workbench/routes.js'`，但
`apps/server/src/workbench/{root,git,routes}.ts` 仅存在于工作树磁盘（工作树
status `??` 未跟踪），JOURNAL.md 产品改动清单第 1-3 项明载三文件（15/82/26 行，
与磁盘逐字吻合）。若照并，主干 tsc 必红（引用悬空模块）——与迭代 0034 termview
目录漏提交（b1be4f3 处置）同根因：productFiles 白名单申报未覆盖首轮新建文件。

**处置**：按 b1be4f3 先例在**分支侧、合并前**补提交 `a820b1d`
（`fix(workbench): 补提交 BK-0040 首轮新建的 workbench 三模块`，内容零改动、
逐字取自工作树 BUILD 产物），并在工作树内 `npm run build:server`（tsc）零错误
亲验分支自洽后才触碰主干。**W44 周报「分支含完整成果」表述与实况不符，特此更正。**

## 1. 冲突清单与解决方式

`git merge --no-ff feat/0036-iter` 检出 6 文件 9 处冲突块，**全部为「双方各自新增 /
不同区域」型，无同段逻辑两侧不同改法的语义对立**，按并存原则解决；机制件
（BACKLOG/STATE/metrics）分支侧本就未提交过程态，零冲突零处理。

| 文件 | 块数 | 冲突型 | 解法与双侧留存证据 |
| --- | --- | --- | --- |
| `apps/server/src/server.ts` | 2 | 双方各增 import 行 / 各增端点注册块 | 主干 capabilities（0039）与分支 workbench 两 import 并存；端点区两块并存（capabilities 在前、workbench 在后）。`git diff b8010b9 85067b6` 该文件删除行仅头注括注 1 行（有意收口改写），产品区纯增量 |
| `apps/web/src/legacy/app.js` | 1 | import 区双方各增 | 主干 caps 面 import（含 refreshCaps/onCapsArrive）与分支 `refreshWorkbenchGit` 两行并存；对主干纯增量（删除行零） |
| `apps/web/src/server-sync.js` | 2 | SVR 缓存/回调/refresh 函数双方各增 | caps 面（字段+回调+refreshCaps）与 wbGit 面（字段+回调+refreshWorkbenchGit）并存；对主干纯增量（删除行零） |
| `apps/web/src/app.css` | 1 | 文件尾双方各增一节 | 主干 jsoncanvas 节（15 行）在前、分支 workbench 节（36 行）在后并存。**首轮解冲突误漏主干 jsoncanvas 节前 12 行**（见 §3.1），修复后 `git diff b8010b9` 该文件删除行为零 = 纯增量亲核 |
| `tools/pixel-gate/gate.mjs` | 2 | 场景基建区/SCENARIOS 表双方各增（0034 型碎块：两侧 evaluate 各缺收尾、共享尾括号唯一） | 按 0034 方法重组：主干 s12~s15 基建完整保留并补回 capsInv 收尾；分支 workbench 基建整体插入并同部位完成 s12→s16 改号（含仲裁注）；SCENARIOS 表 s12~s15 四行保留 + s16 行追加表尾。`node --check` 通过；对主干删除行仅头注 3 行（16→17 收口有意改写）。**另有两处 reconstruction 误改**（CAP_FIXTURE 字面量，见 §3.1）已修复亲核 |
| `tests/smoke/smoke-server.mjs` | 2 | import 区（分支为超集）/组插入区（0034 型碎块：J04 与 B05 各缺块尾括号） | import 取分支超集行（主干 readFileSync 含于其中）；J 组（主干 0035）完整保留补回块尾、B 组（分支 B01-B05）整体插入其后，共享尾括号归 B05。`node --check` 通过；`'J01'-'J04'` 与 `'B01'-'B05'` 逐 ID grep 在场 |

自检记录：冲突标记全树 grep 零残留；两 .mjs `node --check` 双验；六个文件对主干
b8010b9 的删除行逐条人工核过（见上表右列与 §3.1 修正记录）。

## 2. 场景号时序裁决 s12→s16（改名非重录）

分支 `s12-workbench-git-online` 与主干 0035 先落盘的 `s12-jsoncanvas-node` 撞号；
后落者取下一号 **s16**（主干现最大号 s15）。0034/0038/0039 三连先例（s10→s11、
s12→s13/s14、s13→s15）之后续，WORKFLOW §4「golden 场景号按落盘时序裁决」条款。

- gate.mjs：场景基建注释改 s16 + 仲裁注；SCENARIOS 行 `s16-workbench-git-online`；
  头注 16→17 + 枚举行补 s16（授权依据：场景增量属 BK-0040 修宪授权面——issue#4
  批复承继 2026-10-23T15:49:17Z + ADR-0016 §6；计数/枚举须与 SCENARIOS 实况一致，
  BK-0058 同型先例）。
- golden 双文件 `git mv` 改名，**像素内容零变化亲核**（sha256 改名前后一致）：

| 文件 | 改名前 sha256 | 改名后 sha256 |
| --- | --- | --- |
| `s12-workbench-git-online.png` → `s16-workbench-git-online.png` | `56bfd10c3061f807188b51596166e1e1905f75fc72c9f50cb7932e475ae41f68` | 同左（逐字节一致） |
| `s12-workbench-git-online.invariants.json` → `s16-…invariants.json` | `b69c1403633d8a4030239bf152311980d9bf51bee8cb8277f199d45fd8521498` | 同左（改名阶段零变化；其后 0f5726c 单行同步见 §2.1） |

invariants JSON 内部无场景 id 字符串（grep 亲核），无随改内容；全仓代码面
`s12-workbench` 零残留（apps/tools/tests/packages 扫描）。

### 2.1 s16 不变量单行同步（0f5726c，40f9d06 同型先例）

s16 基线采集于分支工作树（基点 915e131，早于主干 6d038cd/BK-0050 落盘
`--cat-agent:#14b8a6`），合流后 gate 首跑 s16 红：**diffPx=0**（像素逐一致），
仅 cssVars 表缺 --cat-agent 一行（golden 与 live 逐行 diff 亲核，其余 63 行全同，
wbTabs/propsShown/wbBranch/wbCounts 工作台四键全对——非合并缺陷，是基线环境
年代差）。按 0037×0035 合流先例 40f9d06（s12 同型同因同处置）：单行同步收口
（恰 +1 行，与先例足印一致），png 零触碰（sha256 不变），不触宪法第 3 条重录
通道——本场景即本轮修宪 golden-created 通道所生，基线随合流环境对齐。

## 3. 主干端到端复测（merge-arbiter 实跑，真实退出码）

| 项 | 命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| build | `npm run build` | ✅ exit 0 | `evidence/build.log` |
| gate | `npm run gate` | ✅ exit 0 · **17 场景全 pass diffPx=0**（s0~s15 零波动 + s16-workbench-git-online 新场景） | `evidence/gate.log` |
| test | `npm test` | ✅ exit 0 · 30/30 | `evidence/test.log` |
| smoke | `npm run smoke:server` | ✅ exit 0 · **138 passed / 0 failed**（原 133 + B01~B05 共 5 条，B01-B05 逐条 PASS 在 log） | `evidence/smoke.log` |
| 图像 | `node .zcode/tools/evidence.mjs` | ✅ 4 张确定性截图 + manifest（19 渲染节点；01-initial sha256 与 0047 基线一致 = 确定性渲染互证） | `evidence/*.png` `evidence/manifest.json` |

### 3.1 首跑两红的如实记录（根因、修复、与门禁的正价值）

gate 首跑（`evidence/gate-first-run-red.log`）两场景红，**均非分支成果缺陷**：

1. **s12-jsoncanvas 红 diffPx=53250**——根因是**本仲裁员解 app.css 冲突时误漏主干
   jsoncanvas 节前 12 行规则**（`.node-jtree` 主规则/jc-kids 缩进等，导致树渲染
   矮 14px、节点 323→309）。0 容差门禁精确抓到该自伤回归（这正是它存在的意义）。
   修复：12 行逐字恢复（对 b8010b9 纯增量复核零删除行），连同下述 gate.mjs 两处
   reconstruction 误改（CAP_FIXTURE `（未实现）点击元素`/`多语言翻译` 被截短）
   一并 **amend 进合并提交**（0d9116e → 85067b6，自建未推送提交、双亲不变），
   主干任何提交不留坏中间态。
2. **s16 红 diffPx=0 + DOM 不变量变化**——即 §2.1 的基线年代差，按先例单行同步。

复跑（`evidence/gate-s3-flaky-run.log`）仅 s3-library 红 diffPx=23——已知 issue#12
抖动区间（≈21~23），按既定口径复跑一次：**全绿 17/17**（`evidence/gate.log`），
未 gate:update、未改任何 golden。三份日志全部留档备查。

## 4. 集成收口清单

- `tools/pixel-gate/gate.mjs` 头注：「16 个 golden 场景」→「17 个」；在线态枚举
  `s4/s5/s9/s15` → `s4/s5/s9/s15/s16` + 溯源迭代补 0036（计数与 SCENARIOS 实况一致）。
- `tests/smoke/smoke-server.mjs` 头注：编排串 `…T→O→J→Z→C` → `…T→O→J→B→Z→C`
  （按 main() 实际执行序：B 组插在 J 组后、Z 组前）+ B 组说明段（B01-B03 主实例 /
  B04 探针实例锚定双向证明 / B05 源扫描）。
- `apps/server/src/server.ts` 头注：端点清单补 `GET /api/v1/workbench/git` 行 +
  v1-only 括注 `workflows/runs/sessions/capabilities` →
  `workflows/runs/sessions/capabilities/workbench`（BK-0056 同型，W44 治理日
  「AGENTS/头注漂移」注记的收口项）。
- 受影响文件清单核对：3eb86e5 的 9 文件 + a820b1d 的 3 文件全部并入，
  `git diff b8010b9 85067b6 --stat` 恰 16 文件（含 iterations/0036 四产物与
  ADR-0016 状态行/实施纪要），无遗漏无多余。

## 5. 遗留与风险

- **STATE/BACKLOG/metrics 最终记账与选题锁释放归协调者 CLOSE**（本次未动；分支
  工作树 `M docs/evolution/STATE.md` 过程态仍在工作树内未提交，随 CLOSE 清理）。
- **workbench git 页真模型/真仓库首跑 dogfooding 欠账**（W44 §五第 5 条⑥）：
  B01-B05 与 gate s16 均为 mock/夹具供数，真实仓库在线消费首跑待验。
- **CI 权威复验**：golden 以 CI（windows-latest）为权威，推送后须盯
  `ui-constitution`（17 场景）与 `contracts`；本机 s3 已知抖动（issue#12）待用户
  处置，不催办。
- **productFiles 漏提交故障两发**（0034 termview、0036 workbench）：工作流脚本
  「跨轮累积并集」修复未覆盖本路（本路为单轮申报即漏，或为另一分支路径），
  建议协调者侧排查脚本归档提交面完整性断言（如提交前 ls-tree 对照 JOURNAL 清单）。
- BK-0041（diff 审查页）/ BK-0042（目录树页，链终轮回执 issue#4 关单）待后续
  轮消费 ADR-0016 与本轮容器基建。
