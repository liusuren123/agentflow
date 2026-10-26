# 迭代 0054 · REPORT — VERIFY 轮验收报告

> 产出角色：test-manager（VERIFY 轮，2026-10-27 02:0x~02:4x 首轮；03:0x 修复轮复验）。
> 输入：PRD §5 AC0~AC8 + SPEC §5 验收口径 + JOURNAL §5 独立复核要求（root.ts）+
> 修复轮记录（JOURNAL §7，BUG-0054-01）。执行环境：工作树 feat/0054-iter
> （HEAD=d880b62，BUILD 产物未提交在区），Node v24.21.0，win32。
> 验证实例：工作树构建产物 `node apps/server/dist/server.js`（PORT=3100 自起自停，
> 端口 3000 被外部进程 PID 26324 占用，未触碰）；浏览器 = ZCode IAB（真实交互）。
> 门禁分工：build / gate / test 已由脚本在工作树内执行且通过（本 REPORT 以产物取证
> 核对其结论，未重复跑全套，逐项标注）；smoke:server 与针对性 E2E / 手动 E2E 由本
> 轮实测（test-manager 职责面）。

## 0. 结论

**PASS（修复轮 1 后复验通过）**——首轮（02:4x）判 FAIL：BUG-0054-01（E2 默认
模式二进制文件块 path 空串，击穿 smoke B06，133/1）。修复轮（JOURNAL §7）按
REPORT §3 建议在 diff.ts:118 补第四优先级兜底 `pick(/^diff --git a\/(.+) b\//)`
（+4 行，零 UI/golden/前端改动）。本轮（03:0x）复验：源码+dist 双面修复在案、
B06 专项（空 path 0 / 二进制 path 填充 / 固定对回归精确）、**`npm run smoke:server`
全量 145 passed / 0 failed**（两次运行同结果，B01~B12 逐条 PASS 在案，B11 探针
HTTP 级首次真实执行通过）。首轮其余验收面（AC0/1/2/3/4/6/7 + root.ts 复核）全
过且修复未触及其任何面（改动仅 diff.ts 后端解析层），证据见 §1~§2 与 §7。

### 首轮结论存档（2026-10-27 02:4x，FAIL→已由修复轮 1 消解）

> **FAIL（1 项 Major）**——BUG-0054-01：E2 默认模式下二进制文件变更块 `path`
> 为空串，击穿 smoke B06「path 非空」断言（fail-fast 连带 B07~B12 未执行，
> smoke 终态 133 passed / 1 failed，非预期 145/0）。其余验收面全部通过：AC0
> 定界 VERBATIM、AC1 正路径契约（14 断言）、AC2 安全面（11 HTTP 断言 + 源扫描
> 4 项 + B11 旁证）、AC3 前端交互与几何前提、AC4 golden 双通道产物、AC6 手动
> E2E 七点位（六点位实测 + ⑦按 SPEC 允许如实记「fixture/契约面承载，手动未
> 构造」）、AC7 四零、root.ts 批准扩面独立复核。

## 1. AC 逐条结果与证据

### AC0 定界消费核验 — PASS

- **VERBATIM 机器比对**：python 提取 ADR-0016 `:271` §7 第二代码块（848 字符）与
  BACKLOG.md `:62` BK-0041 行备注定界段（「触UI=是」起至状态注记前，848 字符）
  逐字符比较：`VERBATIM-IDENTICAL: True`。
- **授权链三元组一致**：issue#4 批复承继 2026-10-23T15:49:17Z（PRD §0 / SPEC §1 /
  ADR-0016 :271 / BACKLOG :62 四处一致）+ ADR-0016 在案 + BK-0041 状态 ready
  （BACKLOG :62 状态列，选题合规）。
- **ADR-0016 实施义务兑现**：`docs/adr/0016-*.md:274` 实施纪要在案（含
  `--numstat` 定形偏差记档，BUILD 义务 #12）；`:4` 状态行含「BK-0041 实施轮已消费
  （迭代 0054 BUILD 落地）」。

### AC1 E2 正路径契约 — PASS（14 断言，工作树 3100 实例实测）

命令：python urllib 对 `http://localhost:3100/api/v1/workbench/diff` 逐形态请求。

- 无参（缺省 HEAD↔工作区）：200；键集恰 `{files,truncated}`；files 14 项（工作树
  真实未提交变更）每项恰五键 `{path,status,adds,dels,patch}`；status 全部
  `/^[MADR]$/`；adds/dels 非负整数；truncated=false。
- 显式对 `?base=ed2f8ed&head=d880b62`：200；files.length===2；path 集合恰
  `{.zcode/workflows/evolution-iteration.dwf.ts, docs/evolution/STATE.md}`；两项
  `(M,21,7)/(M,2,2)`；truncated=false。
- `&path=docs` → 恰 1 条 `docs/evolution/STATE.md`；`?path=.zcode` → 恰 1 条
  `.zcode/...dwf.ts`（前缀过滤生效；注：**经 `pathInput` 正确字段复测**——首测误传
  `path` 字段致 pathspec 未装配，非代码缺陷，见 §4 观察项 3）。
- `&stat=1` / `stat=true`：200；2 项五键；`patch===''`、`status===''`；adds/dels
  与默认模式逐文件相等（跨模式计数一致互证）。
- 仅 `?base=ed2f8ed`（base↔工作区形态）：200，files 列表 15 项（含 d880b62 引入
  的 2 文件），形态正确。

### AC2 安全面 — PASS（11 HTTP 断言 + 源扫描 + B11 旁证）

HTTP 反例（3100 实测，全部命中 SPEC §3.2 字面量）：

| 入参 | 实测 | 断言 |
| --- | --- | --- |
| `base=-x`（`-` 开头） | 400 `base 或 head ref 非法` | ✓ |
| `base=main;rm`（白名单外字符） | 400 同上 | ✓ |
| `base=`（空串在而缺省不在） | 400 同上 | ✓ |
| `head=HEAD~1`（`~` 不在白名单） | 400 同上 | ✓ |
| `base=deadbeef`（合法形状不可解析） | 400 `base 或 head ref 不存在或不可解析` | ✓ |
| `path=../` / `path=../../` | 400 `path 越界` | ✓ |
| `path=D:/`（win32 绝对）/ `path=/etc`（POSIX） | 400 `path 越界` | ✓ |
| `stat=abc` | 400 `stat 必须是 0/1/true/false` | ✓ |
| `/api/workbench/diff`（无 v1 别名） | 404 | ✓ |

源扫描（B12 同型，工作树源码实跑 grep）：workbench 四文件 `/shell/i` 零命中
（exit 1）；diff.ts + routes.ts 可写命令单引号 argv 字面量零命中（exit 1）；
diff.ts 含 `'diff'`/`'--no-color'`/`'--numstat'` 各 1 处 + `:13` `'./git.js'`
import（runGit 复用非复制）。

B11（404 无仓库）HTTP 级由 smoke 承载：首轮 fail-fast 未跑到，补旁证
（`collectDiff(q, cwd=mkdtemp 非git目录)` 直调 → `kind: not-repo, message:
not a git repository`，routes 映射 404 面）；**修复轮复验 smoke 全量中 B11
探针实例 HTTP 级首次真实执行 PASS**（`404 {error:"not a git repository"}`，
smoke 输出在案）。超时 500 不做 HTTP 级（win32 不可移植伪造，
B05 已断言 setTimeout/kill 形态背书——SPEC §3.8 如实口径）。

### AC3 前端交互 — PASS（浏览器实测，详见 AC6 七点位）

- 页签切换激活（`#rightbar` 类 `wb-on wb-page-diff` / `wb-page-git`）、on-open
  取数、刷新重取、文件行选中、属性页回归全部实测通过（§AC6）。
- **几何前提**：工作台未打开（reload 后）`#wb-tabs`/`#workbench` **不存在于
  DOM**（懒创建，wbEnsure 未调用——比 display:none 更强的不在场证明），
  `#props` display:block 默认右栏——s0~s15 零波及前提成立。

### AC4 golden 双通道 — PASS（脚本执行 + 本轮产物取证核对）

- `git status --short -- tests/golden/ui/` = 恰 `M s16-*.png` + `M
  s16-*.invariants.json` + `?? s17-*.png` + `?? s17-*.invariants.json`；
  `git diff --name-status -- tests/golden/ui/` 仅 s16 两文件 M——**其余 32 基线
  文件零字节漂移**（「重录仅此一处」机器证明）。
- s16 不变量差异恰一行 `"diff!"` → `"diff"`（SPEC §6 预判兑现）；png
  Bin 86429→86436 字节。
- s17 基线与 SPEC §3.7.2 逐键吻合：`wbTabs ["props","git","diff*","tree!"]` /
  `propsShown:false` / `diffCounts:"2f"` / `patchHead:"diff --git a/apps/web/sr"` /
  cssVars 31 键零新增 / counts 零新增键。
- 确定性证据链：基线 `tests/golden/ui/s16-*.png` sha256
  `21c9fbf87cdeb766472d3f10c4664c42c083e3b79bda70978031637a18ed8bb6` 与 JOURNAL
  §6 记录的首跑失败产物 sha256（21c9fbf8…）一致；`tests/golden/diff/` 目录已空
  ——gate 全绿自清（gate.mjs BUG-002 清理分支）旁证脚本 18/18 复跑通过。
- gate.mjs 场景 18 个（s0~s17；grep "id: 's" 的第 19 命中系 `:313` 节点 DEFS
  `sqlite` 非场景）；头注 :5「18 个 golden 场景」+ 枚举行含 s17 溯源注记。
- **未复跑 gate 全量**（按派发口径：脚本已跑且通过）；本轮核对以产物取证替代，
  如上四项均与 SPEC §6 预判/JOURNAL §6 记录吻合。

### AC5 回归面 — PASS（修复轮复验后；首轮 FAIL 已消解）

- `npm run build` exit 0：**脚本执行通过**（本轮未复跑；旁证 = dist 时间戳新 +
  dist/workbench/diff.js 在案 + 3100 实例即该 dist 运行）。
- `npm test` 30/30：**脚本执行通过，本轮未复跑**（如实标注；本轮改动面不触
  shared，无回退通道）。
- `npm run smoke:server`：**修复轮复验实测 145 passed / 0 failed**（两次独立
  运行同结果，03:0x）——恰为 SPEC §3.8 预期新总数（138 基线 + B06~B12 七条），
  B01~B12 逐条 PASS 在案（含 B06 修复后全形状、B07~B12 首次真实执行、B11 探针
  HTTP 级 404 验证）。首轮 133/1（B06）已由修复轮 1 消解，详见 §3/§7。
  MERGE 收口新总数口径 = **145**。

### AC6 手动 E2E 七点位 — PASS（①~⑥实测 + ⑦按 SPEC 允许如实记）

浏览器（ZCode IAB）对 `http://localhost:3100/`（工作树 dist + 3100 后端）实走，
数据 = 本工作树真实 git 数据（含未提交改动，如实标注）：

1. **①** 空画布 contextmenu → 「工作台 · 仓库信息」→ git 页正常（分支
   feat/0054-iter、HEAD d880b62、变更 18 个文件、最近提交列表渲染）；页签条四枚：
   属性✓可用 / 仓库✓可用 / **变更✓已解禁** / **目录 disabled + title「后续批次
   提供」**（BK-0042 射程占位像素零变化）。
2. **②** 点「变更」→ 标题「变更对比」；ref 对行三输入（placeholder
   HEAD/工作区/路径过滤，值空=缺省）；文件列表 **14 行**（与 API n=14 一致）；
   13 行 path/status/±行数与本机 `git diff --numstat HEAD` **逐项一致**
   （server.ts M+7/-0、git.ts M+4/-2、root.ts M+8/-5、routes.ts M+31/-1、
   app.css M+24/-0、app.js M+77/-6、server-sync +22/-0、ADR +6/-3、BACKLOG
   +1/-1、STATE +6/-6、s16.json +1/-1、smoke +169/-0、gate +43/-3）；首文件
   自动选中（.on）+ 等宽补丁（`diff --git a/apps/server/src/server.ts…`，与
   本机 `git diff --no-color` 首文件首 hunk 一致）；**第 12 行 = 二进制
   s16.png（BUG-0054-01 前端实录：path 空、+0/-0）**。
3. **③** base=ed2f8ed / head=d880b62 → 点刷新 → 列表切为该对恰 2 文件
   ((M,21,7)/(M,2,2))；path=docs → 再刷新 → 恰 1 文件 `docs/evolution/STATE.md`。
4. **④** 点第 2 行 → .on 激活态迁移 `[false,true]`、补丁区切换为 STATE.md diff。
5. **⑤** performance 资源表实录请求序列：`(no-query)` → `base=ed2f8ed&head=
   d880b62` → `…&path=docs` → 撤过滤 → 再刷新（查询串随 WBD 变化）；输入框
   Enter 同径触发（base 清空后 Enter → 新请求 `head=d880b62`，空串省略=缺省
   语义）。
6. **⑥** 切「属性」→ #props display:block 恢复；选中节点 3（知识库检索）后
   参数面板 4 输入（首值「知识库检索」）经 **工作台往返（diff 页）后逐字段
   一致**（#props 零触碰承诺回归）；切「仓库」→ git 页重取正常（branch/commits
   在案）；再切「变更」→ **WBD 态保持**（输入回填 ed2f8ed/d880b62/空 + 列表仍
   为该对 2 文件）。
7. **⑦ 截断提示行**：手动未构造 >20,000 字符 patch 场景（SPEC §5 AC5-⑦ 明示
   允许：改 cap 需临时构建不做）——fixture 语义（s17 truncated:false）与契约面
   （PATCH_CHAR_CAP=20000 / FILES_CAP=500，diff.ts:28-29）承载，如实记录，不判
   FAIL。
- **error 钩子零捕获**：挂 window error/unhandledrejection 监听后走完整交互环
  （右键开工作台 → diff 页 → 刷新 → 切属性），捕获数组 `[]` 空。

### AC7 四零机器证明 — PASS（root.ts 批准扩面除外，见 §2）

`git diff --stat` 对 Skeleton.tsx / packages/shared/** / package.json /
package-lock.json / apps/server/src/config.ts / apps/server/src/guard.ts /
.env.example **全部恒空**（lock 零变化=零新依赖）。root.ts 经主代理批准扩面修改
（JOURNAL §3，2026-10-27 escalate 答复在案）——AC6 字面上「root.ts 恒空」由批准
口径覆盖，本轮独立复核确认修复正确（§2）。

### AC8 CI 盯守 — 未到时点，不判过不判挂（沿 0012 先例）

分支未推送（BUILD 产物未提交），`ui-constitution` 未运行；修复轮提交推送后按
WORKFLOW §6 护栏盯守（红则 rerun 一次仍红报 issue #12 / 用户）。

## 2. root.ts 禁区偏差独立复核 — PASS（JOURNAL §5-1 要求，不采信 JOURNAL 自述）

1. **dist 实跑锚定**：`node --input-type=module` 加载工作树
   `apps/server/dist/workbench/root.js` 打印 `PROJECT_ROOT` =
   `D:\Projects\CodeRepo\agent-workflow\.zcode\worktree\feat\0054-iter`（=仓库根，
   `MATCH-REPO-ROOT: true`）——修复前为 `…\apps`（JOURNAL §3-①，错锚）。
2. **pathspec 缺陷机理复现对照**（固定对 `git -c core.quotepath=off diff
   --no-color ed2f8ed d880b62 -- docs`）：cwd=仓库根 → **4778 字节**（修复后
   形态）；cwd=apps/（旧错锚复现）→ **0 字节**（静默空结果机理在案）。
   注：JOURNAL §3-② 记真根形态 3029 字节，与本轮实测 4778 不一致（固定对历史
   不可变，3029 无法复现）——方向性结论（修复前 0 / 修复后非空）不受影响，
   数字差异如实记 §4 观察项 2。
3. **修复后功能面**：dist `collectDiff` 真实 git 只读直调——固定对默认/stat 双
   模式逐文件 `(M,21,7)/(M,2,2)`；`pathInput:'docs'`→1 条、`'.zcode'`→1 条、
   不存在前缀→0 条（过滤精确）。
4. **E1 回归**：3100 实例 git 页正常渲染（branch/HEAD/changes/commits，
   AC6-①⑥ 实测）。
5. B04 探针形态推演（tmp 探针 dist/workbench 4 级上溯=tmp 无 .git → 404 保持）
   与 B01~B05 既有断言在 smoke 本轮 133 passed 内全绿（fail-fast 发生在 B06）。

**复核结论**：修复正确且必要（E2 pathspec 前缀过滤依赖锚定正确性）；0036 验收
盲区归属（JOURNAL §3-③）成立；productFiles 以 #13 并入白名单（累积并集口径）
合规。

## 3. BUG 清单

### BUG-0054-01 · Major · E2 默认模式二进制文件块 path 为空串，击穿 B06 —— **已修复（修复轮 1）+ 复验通过（§7）**

- **现象**：`npm run smoke:server` → `FAIL B06`（expected: 200 两键契约 + 五键
  文件形状；actual: `{"status":200,"keys":"files,truncated","n":14,
  "truncated":false,"filesOk":false}`）→ fail-fast 停止 B 组后续断言 → 终态
  **133 passed / 1 failed**（预期 145/0）。
- **根因**（本轮定位）：`apps/server/src/workbench/diff.ts:112-114` parsePatch
  的 path 提取三优先级（`+++ b/<path>` → `--- a/<path>`（仅 /dev/null）→
  `rename to`）对**二进制文件块全部 miss**——二进制块（`Binary files a/x and
  b/x differ`）无 `+++`/`---`/rename 头行 → path=''。实测复现：工作树
  HEAD↔工作区 diff 中 `tests/golden/ui/s16-workbench-git-online.png`（本迭代
  golden 重录自身即制造的二进制变更）→ 出参该项
  `{path:'', status:'M', adds:0, dels:0, patch:'diff --git a/…\nBinary files
  a/… differ\n'}`。SPEC §3.1.3 对二进制块只规定了 adds/dels/patch 语义
  （「如实呈现不特判」），path 提取规则系**规格盲点**；B06「path 非空」为 SPEC
  §3.8 自定断言——实现忠实于规格字面但规格内部矛盾，按 B06（产品正确性）判
  实现需修。
- **影响**：① smoke B06 红且 B07~B12 连带未执行（AC4/AC5 不达标）；
  ② 前端文件列表出现空路径行（本轮浏览器实录第 12 行：path 空、+0/-0）。
  触发条件为 diff 范围含任意二进制文件变更（图像/golden/数据库类仓库常态）。
- **定位与修复建议**：`diff.ts:112-114` 后补第四优先级兜底——块首行
  `diff --git a/<path> b/<path>` 是所有块（含二进制）的公共结构，取
  `pick(/^diff --git a\/(.+) b\//)` 即可全覆盖（也可仅对 Binary 行
  `^Binary files a\/(.+) and` 特判；推荐前者：语义为「最终兜底」，不影响既有
  三优先级命中序）。修复后 B06 该项 path=`tests/golden/ui/…png` 非空 → filesOk
  通过；B07~B12 首次真正执行（固定对纯文本不受此 bug 影响，本轮 HTTP 级已逐一
  预验证其契约面，B11 探针形态旁证在案）——**修复轮须全量重跑 smoke 至
  145/0**。修复不触 UI/golden 面（后端解析层），gate/test 预期零影响。

## 4. 观察项（不判 FAIL，如实留档）

1. **loadLocal 对非规范本地数据白屏（既有面，非本迭代射程）**：VERIFY 手动 E2E
   期间向 localStorage 注入手工构造的合法 JSON 但字段不兼容的
   `agentflow.v2` seed 后 reload，React 骨架不渲染（#root children=0）且
   #viewport 缺失；清除该键后 reload 恢复（8 节点自服务端列表回放）。无证据
   表明正常操作路径可产生该形态数据；不构成 BK-0041 验收障碍，留作侦察轮证据
   指针（loadLocal 防御性 try-catch 评估候选）。
2. **JOURNAL §3-② 字节数记录不一致**：其记「真根 cwd 下 docs pathspec 3029
   字节」，本轮同命令实测 4778 字节（固定对不可变，3029 无法复现）。方向性
   结论（错锚 0 字节 / 正锚非空）两侧一致，不影响的缺陷定性与修复验收。
3. **VERIFY 首测误报说明**：collectDiff 直调首测传 `path` 字段（接口字段名为
   `pathInput`，diff.ts:24）致 pathspec 未装配返回 2 文件——系本轮调用错误，
   更正字段后复测全部正确。留此记录以防后续复读者误读首次输出。
4. **AC6「root.ts 恒空」字面偏差**：经主代理批准扩面（JOURNAL §3），独立复核
   通过（§2）；PRODUCT 白名单 #13 并入（productFiles 累积并集口径，
   WORKFLOW §4）。

## 5. 修复轮建议（首轮产出；已由修复轮 1 全部采纳执行，见 §7）

1. BUG-0054-01 按 §3 建议修 diff.ts（一处兜底，≤3 行）；修复属后端解析层，
   不触 UI 三层与 golden。
2. 全量重跑 `npm run build` + `npm test` + `npm run smoke:server`（预期
   **145 passed / 0 failed**——B07~B12 将首次执行）；gate 无需重录（场景与
   fixture 未变），按惯例复跑确认 18/18 即可。
3. 修复后 productFiles 白名单维持 §2 表 #1~#13 累积并集（diff.ts 已在 #1，
   无新增文件）。
4. VERIFY 复验面：smoke 145/0 + B06 二进制 path 专项——其余 AC 本报告已
   覆盖，无需重验。

## 6. 验收执行环境与命令实录（证据索引）

| 项 | 命令/方式 | 结果 |
| --- | --- | --- |
| VERBATIM 比对 | python splitlines + 切片等值比较 | True（848=848 字符） |
| 四零 | `git diff --stat -- <7 禁区路径>` | 恒空（exit 0 零输出） |
| golden 机器证明 | `git status/diff --name-status/--stat -- tests/golden/ui/` | 仅 s16×2 M + s17×2 ?? |
| s16 不变量 | `git diff -- s16-*.invariants.json` | 恰一行 `diff!`→`diff` |
| app.js 段外 | `git diff -U0 -- app.js` 的 `@@` hunk 头 | 7 hunks 全落 :9/:10 + :2955~:3038 段内 |
| numstat | `git diff --numstat -- <产品文件>` | 与 JOURNAL §4 逐文件一致（css/smoke −0；gate −3=头注；app −6=申报内） |
| root.ts 锚定 | node 加载 dist/workbench/root.js | PROJECT_ROOT=工作树根 |
| pathspec 对照 | `git diff … -- docs`（cwd 根 vs apps/） | 4778 vs 0 字节 |
| E2 正/反例 | python urllib ×25 请求（3100 工作树实例） | 25/25 PASS |
| B11 旁证 | collectDiff(cwd=mkdtemp) | not-repo ✓ |
| 源扫描 | grep ×4（workbench 四文件） | 零命中 ×2 + 三词在场 + import 在场 |
| smoke（首轮 02:4x） | `npm run smoke:server`（两次） | 133/1（B06，BUG-0054-01） |
| smoke（复验 03:0x） | `npm run smoke:server`（两次） | **145 passed / 0 failed**（B01~B12 逐条 PASS） |
| gate/test/build | 脚本已执行通过（两轮均未复跑全套，产物取证核对） | §AC4/AC5 如上 |
| 手动 E2E | ZCode IAB 真实交互（evaluate 辅助） | ①~⑥ PASS + ⑦ 如实记 + error [] |

## 7. 修复轮复验记录（2026-10-27 03:0x，本 REPORT 终态依据）

修复内容（JOURNAL §7 申报，本轮独立核对）：

- **源码双面在案**：`apps/server/src/workbench/diff.ts:118`
  `if(p === '') p = pick(/^diff --git a\/(.+) b\//)`（文件 158 行，154+4）；
  `apps/server/dist/workbench/diff.js:117` 同款兜底已编译（8583 字节）——与
  首轮 REPORT §3 修复建议**逐字同型**（块首行公共结构兜底，仅前三优先级全
  miss 才生效，文本块提取路径零变化；:108-112 注释含 BUG 记档）。
- **无意外扩散**：`git status --short` 与首轮验收时完全一致（产品面 14 项 +
  机制件，diff.ts 仍为唯一新增源文件）——修复零清单变更，productFiles 白名单
  不动（累积并集口径合规）。

复验实测（全部本轮亲跑）：

1. **B06 专项（dist 直调，真实 git 只读）**：`collectDiff({stat:false})` →
   14 文件**空 path 数 = 0**（修复前 1）；二进制项
   `["tests/golden/ui/s16-workbench-git-online.png","M",0,0]`、patch 原文
   （`diff --git a/…png b/…` + Binary 行）完整携带。
2. **固定对回归**：`(M,21,7)/(M,2,2)`、truncated=false——精确不变。
3. **`npm run smoke:server` 全量**：**145 passed / 0 failed**（两次独立运行
   同结果）；`grep` 抽取 B01~B12 逐条 PASS 在案——B06 修复后全形状绿、
   B07~B12 首次真实执行全绿、**B11 探针实例 HTTP 级 404 首次真验证**（补齐
   首轮仅旁证的缺口）、B12 源扫描（含兜底后 diff.ts 158 行）绿。
4. 修复未触及首轮已验收的任何面（AC0/1/2/3/4/6/7 + root.ts 复核 + 手动
   E2E），其证据（§1~§2、§4、§6）持续有效。

**复验结论：BUG-0054-01 已消解，无新增缺陷，AC0~AC8（AC8 未到时点除外）全部
达成——迭代 0054 验收 PASS。**
