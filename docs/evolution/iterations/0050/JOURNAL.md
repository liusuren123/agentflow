# 迭代 0050 · JOURNAL — BK-0057 冒烟编排头注序列同步（BUILD）

> BUILD 轮产物（WORKFLOW.md §4 BUILD 契约）。code-developer 产出。
> 本轮隔离工作树 `.zcode/worktree/feat/0050-iter/`（分支 `feat/0050-iter`）。
> 时间 2026-10-26 12:54–12:56。

## 1. 开工前阅读（按派发指令）

- `.zcode/agents/code-developer.md`（职责与硬约束）、`CONSTITUTION.md`（第 1/3/4/5 条）、
  `AGENTS.md`（仓库地图与硬性约定）、`docs/evolution/WORKFLOW.md`（§4 BUILD 契约、
  §6 安全护栏）、`docs/evolution/iterations/0050/PRD.md`（S 项免 SPEC，受影响文件
  清单与验收口径内嵌 §3/§5）。

## 2. 改动（REQ-0057-01，恰 1 文件 1 行）

- `tests/smoke/smoke-server.mjs:5` 步骤编排序列串：
  - 旧：`步骤编排 P→H→W→N→CAP→S→R→D→E→K→G→C；fail-fast（…`
  - 新：`步骤编排 P→M→H→W→N→CAP→S→R→D→E→K→G→V→A→T→O→J→Z→C；fail-fast（…`
  - 行内「；fail-fast（首 FAIL 打印上下文 + server 日志尾，」起逐字保留（PRD §2 字面）。
  - 纯注释行内替换，零行为、零渲染因果（PRD §2 触UI=否，grep 亲证在案）。

## 3. BUILD 期间自检（本人在工作树内实跑，命令+真实输出）

1. **改动前基线取证（AC3 前半）**：
   - `grep -n "组：" tests/smoke/smoke-server.mjs` → main() 组标记序亲核为
     P(:379)→M(:384)→H(:389)→W(:402)→N(:454)→CAP(:464)→S(:513)→R(:552)→D(:573)
     →E(:617)→K(:660)→G(:706)→V(:869)→A(:1020)→T(:1169)→O(:1229)→J(:1358)→Z(:1443)
     →C(:318 finally 清理段)，与 PRD §1 表逐组吻合、与新串先后序一致。
   - `grep -c "C.ok\|C.check"` → **78**（改动前锚点）。
2. **改动面机器证明（AC2 口径）**：
   - `git diff --stat -- tests/` → `1 file changed, 1 insertion(+), 1 deletion(-)`
     （恰 smoke-server.mjs 一个文件，1+/1−）。
   - `git diff -- tests/` → 唯一 hunk 即 :5 行，含 19 组序列字面（M/V/A/T/O/J/Z
     七组新在列），行内 fail-fast 及其后文字逐字保留。
   - `git diff -- apps packages tools .github 'package*.json'` → 输出恒空（零触碰）。
3. **零行为自检**：
   - `node --check tests/smoke/smoke-server.mjs` → 通过（syntax-OK）。
   - `grep -c "C.ok\|C.check"` → **78**（与改动前一致，断言本体零改动）。
4. **EOL/编码澄清（PRD §4）**：`file` 报工作树 CRLF 系 `core.autocrlf=true` 的
   Windows 检出常态（HEAD blob 实为 LF，`git show HEAD:… | od -c` 无 `\r`）；
   `git diff --numstat` 归一化后恰 `1 1`，提交侧内容仍为 LF，零行尾漂移、零 BOM。

## 4. 未跑项（归脚本统一门禁，如实声明）

- `npm run build` / `npm run gate` / `npm test` / `npm run smoke:server` 未由本人
  运行——派发指令明示完整门禁与 git 提交由脚本统一执行。本项零渲染因果，gate 为
  纯回归面；AC1（133 passed）/AC4（test 30/30）由脚本与 VERIFY 轮裁决。

## 5. 边界确认

- 未触 UI、未扩大影响面：改动恰为 PRD §3 白名单唯一文件；零触碰清单
  （apps/**、packages/**、tools/pixel-gate/**、tests/golden/**、.github/**、
  package*.json、其余 tests/smoke/**）diff 恒空，无 blockedReason。
- 未运行 `npm run gate:update`、未接触 golden（非修宪轮，宪法第 3 条）。
- 不做范围（PRD §6）：未扩写 M/T/J 详述、未动 :6-31 详述段与其余 smoke 文件。

## 6. productFiles 申报（相对工作树根）

- `tests/smoke/smoke-server.mjs`（唯一产品面改动；STATE/JOURNAL 为过程件，
  由机制件提交承载，不入产品提交）。

## 7. 修复轮 1（2026-10-26 13:00–13:02）：门禁 s3-library 红 取证与定性

**触发**：脚本统一门禁报告工作树内像素门禁 1 场景违宪——s3-library FAIL
· diffPx=23（其余 15 场景全 pass · diffPx=0）。

**取证（本人实跑，命令+真实输出，全部只读）**：

1. **差异产物**：`tests/golden/diff/` 内 s3-library 三件（current.png / diff.png /
   invariants.json，12:58 本轮门禁所产）；主干 `tests/golden/diff/` 为空
   （10:16 后清空）。
2. **不变量**：invariants.json 显示 DOM 状态完整恒等（view
   `translate(16.7143px, 159.879px) scale(0.557143)`、zoom 56%、8 节点 7 边
   15 widget、CSS 变量全表）——纯像素级差异，零 DOM/结构差异。
3. **逐像素定位**（pngjs 7.0.0 只读诊断脚本，非跑门禁）：基线与 current 均
   1600×900；原始差异像素 **50 个**（pixelmatch 阈值后计 23），包围盒
   **x[20..30] × y[792..887]（11×96 竖条）**——正落在左侧图标栏
   （`--rail-w: 48px`）底部图标字形区；全部为灰阶 ±2~±6 微扰
   （如 110→106、29→35、142→146），**字形抗锯齿/字体栅格化运行间抖动形态**，
   非布局/样式变化（布局变化不可能仅 50 像素且全为灰度微差）。
4. **因果排除**：工作树 HEAD = 主干 HEAD = 8cf561e（git rev-parse 亲核）；
   `git diff --stat main feat/0050-iter -- apps packages tools .github
   'package*.json' tests/golden tests/smoke` → 恒空（两树产品代码逐字节同源）；
   本轮改动 = tests/smoke/smoke-server.mjs:5 纯注释（PRD §2 亲证
   `grep -rn "smoke-server" apps/web/src tools/pixel-gate` 零命中）。
5. **构建产物**：两树 apps/web/dist 逐文件比对，唯一差异 = index.html 骨架行
   CRLF vs LF（370553−370541=12 字节 = 11 行各 1 个 CR；第 7–217 行巨型内联
   内容行字节一致）——core.autocrlf=true 的 Windows 检出常态，HTML 解析对
   CR/LF 等价为空白，零渲染因果。
6. **历史先例**：主干 STATE.md（提交 8cf561e，今日 11:58）明载「**s3-library
   已知本机采样抖动再次发作（0037~0048 同形态 rerun 即绿，CI 为权威，
   issue #12 待用户批复），非代码回归**」——主干同 HEAD 今日 11:58 复验
   16 场景全绿（含 s3-library）；今日 11:46 心跳 0049 预检工作树同场景同形态
   发作后翻案。

**定性结论**：非代码回归、非本轮改动所致；产品范围内**无可修复项**。任何触及
apps/web、tests/golden、tools/pixel-gate 的「修复」均属宪法第 3 条/POLICY
需批准区（issue #12 正待用户批复），本轮禁改。**正确处置 = 复跑门禁**
（仓库先例 0037~0048 同形态 rerun 即绿；完整门禁归脚本统一执行，本人未跑）。

**修复轮改动**：零产品代码改动（productFiles 不变）；仅本 JOURNAL 与 STATE
过程件更新。

## 8. 修复轮 2（2026-10-26 13:06–13:10）：复跑仍红，确定性复现定性 + 升级裁决

**触发**：脚本复跑门禁（13:04，diff/ 产物时间戳亲核为新鲜），s3-library 仍
FAIL · diffPx=23，其余 15 场景全绿——「rerun 即绿」未成立。

**取证（本人实跑，全部只读）**：

1. **确定性复现证明**：pngjs 逐像素重算（同修复轮 1 方法），本轮 50 个原始
   差异像素与修复轮 1 **逐坐标完全一致**（coords 串 sha256 一致、包围盒同为
   x[20..30] × y[792..887]、计数同为 50）——非运行间随机抖动，是当前环境下
   的**稳定复现**（12:58 与 13:04 两次独立门禁同一定位差异）。
2. **差异区域定元素**：6 倍放大裁剪（x[8..44] × y[770..900]）+ 视觉模型辨
   识 + 前端源码亲核（Skeleton.tsx:45-57）——差异落点 = 左栏底部组
   `rail-group bottom` 三个图标的 SVG 描边：帮助「?」(rail-help)、底部面板
   (rail-bp)、设置齿轮（均内联 SVG path，非字体字形）→ 差异层级 = SVG
   抗锯齿栅格化。
3. **issue #12 亲读（gh issue view，只读）**：标题「CI 像素门禁偶发误报：
   s3-library 亚像素渲染噪声（diffPx≈23，rerun 即绿）」，OPEN/needs-approval；
   CI 侧同样发作过（run 40219539885 首跑红 --failed 重跑绿），CI 侧包围盒
   x∈[20,29]·y∈[794,887] 与本工作树两次取证几乎重合；修复方案 A（gate 稳定
   等待）/B（亚像素容差）/C（CI 重试）全部落禁区或动 0 容差口径，**待用户
   裁决**；两条评论均 🤖 证据帖（本机累计 10+ 次发作全部 rerun 即绿；ADR-0002
   时代同型 23px 先例在案），无用户批复。
4. **与历史形态的偏离**：历史 10+ 次全部 rerun 即绿；本工作树连续两次复跑
   逐坐标复现（主干同 HEAD 11:58 曾全绿）——本机当前处于「持续复现态」，
   继续无差别 rerun 不再是可靠处置。

**定性结论**：同 issue #12 亚像素渲染噪声，但当前本地持续复现。修复轮内
**无合法修复动作**：tools/pixel-gate（WORKFLOW §6 护栏 3 禁区 + PRD §6
不做范围 + issue #12 待批）、tests/golden（非修宪轮禁 gate:update，宪法
第 3 条）、apps/web（无 UI 缺陷且三层冻结）均不可动；产品改动因果清白已
穷尽证明（§7：同 HEAD、产品代码逐字节同源、dist 逐文件一致仅骨架行 CRLF、
渲染路径零引用）。宪法第 2 条明载「golden 基线以 CI 为权威，本地差异仅作
参考」——工作树门禁绿的硬性前提与已知环境 flake 冲突，处置权在协调者/用户。

**动作**：按 WORKFLOW 修复循环上限（2）与「无法完成时 escalate 不绕过」
纪律，升级协调者裁决（选项：按宪法以 CI 为权威放行本轮 / 再择时复跑 /
挂起等 issue #12 批复）。零产品代码改动。

**修复轮 2 改动**：零产品代码改动（productFiles 不变）；本 JOURNAL §8 与
STATE 过程件更新。

## 9. 协调者裁定（2026-10-26 13:11，escalate 回执）：选项 A 放行，CI 为权威

**裁定**：按宪法第 2 条 CI 权威口径放行进入 VERIFY/合并，附硬性护栏逐条执行：

1. **放行依据（备查）**：宪法第 2 条明载 golden 以 CI（windows-latest）为
   权威、本地差异仅参考，宪法顺位高于 WORKFLOW §4 的工作树门禁契约；本轮
   产品改动因果清白（git diff 恒空、唯一改动为 smoke-server.mjs:5 纯注释、
   两树 dist 逐文件一致、主干同 HEAD 8cf561e 今日 11:58 复验 16 场景全绿）；
   s3-library 抖动为 issue #12 在案已知形态（同 bbox，CI 侧亦发作过）；
   0049 已有同形态「复验翻案」先例（STATE last_result 在案）；修复轮上限 2
   已到且方案 A/B/C 全部待批，不得为变绿触碰任何禁区。
2. **如实留痕（硬性，REPORT/MERGE/主干记账同口径）**：本轮门禁结论必须
   表述为——「**本地工作树门禁 15/16 场景绿，s3-library 红（diffPx=23，
   12:58/13:04 两次逐坐标一致复现，coords sha256 相同），依宪法第 2 条
   CI 权威口径放行，issue #12 在案待批复**」；禁止表述为「门禁全绿」，
   禁止省略失败场景。
3. **主干复测照常实跑**（build/gate/test/smoke 逐项记录真实退出码，证据
   照常留档）。预期主干 16 场景全绿（同 HEAD 11:58 先例）；若主干复测
   s3-library 也红：不得放宽门禁、不得 gate:update、不得判定 PASS——如实
   记录后升级回报协调者处置，最终记账暂停。
4. **推送后盯 CI ui-constitution**：绿即闭环；红则按 issue #12 事实处置
   rerun 一次；rerun 仍红 → 不强推、不 force，如实报告并在 issue #12 评论
   补发本次 CI 发作证据（带 🤖 前缀），等用户处置。
5. **铁律重申**：绝不运行 npm run gate:update；不改 tools/pixel-gate/、
   CI 配置、0 容差口径、golden——修复方案 A/B/C 只能经 issue #12 用户
   批复后的修宪通道。本轮放行不构成对 #12 任何方案的预批准。

**BUILD 收口**：产品改动 = smoke-server.mjs:5 编排串 12→19 组（1+/1−），
零 UI 触及、零渲染因果；productFiles = [tests/smoke/smoke-server.mjs]；
门禁结论按上文第 2 条口径如实随行；交 VERIFY。
