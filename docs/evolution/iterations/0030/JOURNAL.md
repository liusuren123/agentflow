# JOURNAL · 迭代 0030 · BK-0039 会话面板右侧工作台容器与三页签定界 + 分批修宪 ADR 草案（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 14:05
> 输入：`PRD.md`（S 项 skipSpec=true——§7 内嵌定界即 SPEC 替代；REQ-0039-01~06 /
> AC1~AC7；触UI=否、纯文档轮、全程禁 gate:update）。
> 本轮零代码 / 零依赖 / 零 env / 零出站 / 零 shared 契约 / 零 UI / 零 golden：
> 未对 `apps/**`、`packages/**`、`tests/**`、`tools/**`、`.github/**`、根/子包
> package.json / package-lock.json 执行任何写操作（全程只读核实代码锚点）。
> 完整门禁（build / gate / test / smoke:server）与 git 提交由脚本统一执行，BUILD
> 未自行运行。STATE.md 已按派发指令更新：`phase: PLAN → BUILD`、
> `updated: 2026-10-25 14:05`。

## 1. 改动清单（产品提交面 = AC5 白名单一路径；BACKLOG/STATE/JOURNAL 为机制件）

| 文件 | 净改动 | 改动内容 |
| --- | --- | --- |
| `docs/adr/0016-workbench-right-panel-git-diff-tree.md` | **纯新增 286 行**（≤400 硬性上限达成、在 PRD 建议区间 260±60 内；UTF-8 无 BOM、纯 LF，od/CR 计数亲核） | 七要素成节（PRD AC1 逐项）：头部状态块（:3-5 状态行 = 「草案 · 待实施轮消费（BK-0040/0041/0042——链终轮）」+ 授权链 issue#4 承继 2026-10-23T15:49:17Z；零依赖零出站零 env 面故无 0014 式「待用户批准」位）+ 显著声明 → §1 动机与现状证据（右栏容器现状四锚组 / workbench 零现状 grep / BK-0016 端点契约样板 / 子进程与防越界纪律先例）→ §2 右栏容器信息架构（§2.1 属性面板共存三选一表 A/B/C + 推荐 B 独立容器切换·#props 零触碰 / §2.2 三页签结构表（git 仓库·diff 变更·tree 目录，数据源 E1/E2/E3）/ §2.3 入口交互与 BK-0034 协同（推荐右栏顶部件常驻页签条，C 案记入口增强可选项非硬依赖）/ §2.4 数据消费与刷新语义（on-open fetch + 手动刷新，零轮询零 SSE 消费护栏）/ §2.5 前端三文件影响面定性（动态创建优先、静态骨架化回退案需重录 s0））→ §3 workbench 只读端点契约定界（头部三端点总表 + 零 shared/零出站/v1-only 声明；§3.0 项目根锚定零 env 推荐案——模块级常量锚定（SANDBOX 同构）推荐 + process.cwd() 案实测否决 + 零 env 护栏写死；§3.1 E1 git 信息 / §3.2 E2 diff 审查 / §3.3 E3 目录树逐端点路径·方法·入参·出参·错误码·git 白名单；§3.4 git 子进程承载纪律（argv 零 shell + 5s 超时 + 只读白名单不变式 + 可写命令逐类排除））→ §4 路径防越界与安全面（safePath 机理同构转写锚定根=项目根 + 只读不变式 + 零出站/零依赖/零 env 三写死 + secrets 面）→ §5 分批修宪编排（0040→0041→0042 一页签一迭代 + 每批四件套表 + 与 ADR-0015 §5 同构/差异注记（不涉 shared DEFS/baseline/守卫联动））→ §6 golden 增量预案（双通道 + 右栏在线态每批一场景 + s8/s9 已预定 s10+ 按落盘时序不锁死 + WB_ROUTES fixture 需求评估（预期需要，WF_ROUTES/RUN_ROUTES 先例））→ §7 三段 ```text 权威回写字面量 + 晋升/关单口径 → §8 影响面与不做范围 |
| `docs/evolution/BACKLOG.md` | 3 行备注列原地替换（随归档提交） | BK-0040/BK-0041/BK-0042 三行备注列替换为 ADR §7 三个代码块字面量**逐字粘贴**（node 程序化提取比对 VERBATIM OK ×3，见 §4）；其余列（状态 `proposed`、来源 `issue#4`、标题）逐字不动（split('\|') 字段校验）；BK-0039（:52）与 BK-9004（:75）行未触碰（状态流转归脚本/CLOSE）；PLAN 轮已做的 BK-0036/0037/0038 晋升回写（本轮开工前已在工作区）未触碰 |

## 2. PRD 内嵌定界 vs 代码现状复核（BUILD 义务；「矛盾即中止」未触发）

复核方法：PRD §背景/AC2/AC7 全部指针本会话 Read / grep / wc / ls / npm exec 逐一
亲核。**结论：技术结论与代码现状零矛盾、零杜撰，无需中止；PRD 两处口径按代码
事实转写（§3.1/§3.2），一处锚点行号偏移按实际转写。**

命中的指针（超出 AC7 下限 ≥5 条，全部命中）：

- `Skeleton.tsx:136-137`：:136 注释行 + :137 `<aside id="rightbar"><div
  id="props"></div></aside>`——#props 为 #rightbar 唯一住户 ✓；
- `app.js`（2426 行，wc 亲核）：`:914` renderProps `const box = $('#props')` ✓、
  `:1001/:1037/:1065` change/click/input 三事件委托 ✓、`:1025-1026` 滚动恢复
  （PRD 未列、补核）、`:2128` focus 归属判断（refreshPropsIfIdle 内
  `$('#props').contains(document.activeElement)`）✓；`grep '#props'` 全文恰
  7 行（:914/:1001/:1025/:1026/:1037/:1065/:2128）——「属性面板为唯一住户、
  操作面全在 #props」论据完整；
- `app.css`：`:23` `--props-w:264px`、`:333` `#rightbar`（宽度/边框/z-index）、
  `:335` `#props`（滚动容器）——两容器全部布局规则 ✓；
- `server.ts`（254 行）：`:205-213` workflows/runs 七端点 v1-only 注册 ✓、
  `:214-219` sessions 五端点（注册体 :215-219 恰五行）✓、`:197-203` /api 与
  /api/v1 双 base 循环（旧别名不承接新端点，ADR-0005 先例）✓；
- `code.ts`（69 行，落点 apps/server/src/code.ts）：`:7` `import { spawn }
  from 'node:child_process'` ✓、`:50` `spawn(cmd, argv, …)` argv 数组形态 ✓、
  `:53` `setTimeout(…, 5000)` 超时 kill ✓；
- `tools.ts`（175 行）：`:16` SANDBOX 常量（import.meta.url 模块级锚定，注释
  「编译产物位于 dist/，沙箱锚定到包根」）✓、`:18-22` safePath（resolve 后
  前缀校验 + throw「路径越界：只允许访问沙箱目录」——PRD 写 :18-20，实际函数
  体至 :22，ADR 按实际转写）✓；
- `config.ts` 129 行、`apps/server/src` 全树 grep `PROJECT_ROOT|workbench|
  WORKBENCH` 零命中（PRD 背景 5「零命中」复核成立）✓；
- `gate.mjs`（282 行）：SCENARIOS 定义 :176-187 恰 8 场景 s0~s7（PRD 写
  :177-186，实际 :176-187，ADR §6 引用 WF_ROUTES/RUN_ROUTES fixture :181-184
  命中）✓；
- `sessions.ts` 错误码风格：`:46` 400（limit 校验）/`:52` 404/`:77` 409，
  `{ error:'…' }` 形态；`server.ts:173` limit 1-100 校验先例 ✓——§3.1 入参
  校验与 §3 错误码风格依据；
- `docs/adr/` ls 亲核现行至 0015 → **0016 编号顺延成立** ✓；ADR-0015（260 行）
  §5 分批编排 / §6 golden 双通道 / §7 回写字面量制式亲读对齐；ADR-0013 §6
  s8/s9 预定经 ADR-0015 §6 引文核对 ✓；
- `BACKLOG.md`：BK-0039（:52）/ BK-0040（:53）/ BK-0041（:54）/ BK-0042（:55）/
  BK-9004（:75，批复承继 2026-10-23T15:49:17Z）亲读，拆分口径与授权链在案 ✓；
- `ROADMAP.md`：:126-128 差异化定位「画布编排 × 深度智能体工作台」✓、:186
  SPEC 四连先行 ✓、:189-190 BK-9002 链先于 :193-194 BK-9004 链（0040→0041→
  0042、0042 链终轮回执 #4）✓——§1/§2.3/§5 编排依据。

## 3. 实现期偏差记录

### 3.1 PRD「项目根锚定 = process.cwd()」推荐案按代码现状改写为零 env 模块级锚定（核心偏差，证据在案）

PRD 背景 5 / §7 制式约束写「锚定默认 = process.cwd()，零 env」「process.cwd()
服务进程工作目录即项目根」。本会话实测否决该机理（PRD §7 顺位「CONSTITUTION >
代码现状 > 本 PRD」授权按代码事实转写）：

- 实测命令：`npm exec -w @agentflow/server -- node -e "console.log(process.cwd())"`
  → 输出 `D:\Projects\CodeRepo\agent-workflow\apps\server`——workspace 脚本以
  workspace 目录为 cwd；而根 package.json `start`/`dev:server` 均为
  `npm start -w @agentflow/server`（package.json:17/:26）→ 生产启动路径下进程
  cwd = **apps/server 而非仓库根**，「cwd 即项目根」假设不成立（tree 页会错锚为
  apps/server 子树）。
- 改写：ADR §3.0 推荐案 = 模块级常量锚定（`tools.ts:16` SANDBOX 同构机理：
  import.meta.url 一次性 resolve、模块加载即冻结，层级自 dist 上溯两级），cwd
  案以实测证据记为「评估后否决」。**零 env 要求原样保持**（无 WORKBENCH_ROOT
  类覆盖项；反转即中止转 needs-approval 护栏写死）——不触 PRD 的需批准面中止
  条件（该条件针对「需新增 env 语义」的反转，本轮推荐案仍零 env）。

### 3.2 PRD §7 骨架行数预算低估（沿 0028/0029 同类记录）

PRD §7 骨架表预估 ADR §7 ~15 行；实际 20 行（awk 节段计数亲核，含标题/空行；
三段 ```text 权威字面量各占 1 行内容行，本身 1154/848/943 字符为 AC4 逐字比对
基准不可压缩）——轻微低估，非硬性偏离。全文 286 行 ≤400 硬性上限、在建议区间
260±60 内（AC1 硬判据达成）。

### 3.3 其余零偏差

七要素成节（§1~§7）+ §8 影响面与不做范围（ADR-0015 §8 同款收尾节）；容器
信息架构三选一（选项+利弊+推荐，AC2 必答项①）、端点契约逐端点五要素（路径/
方法/入参/出参/错误码，制式约束逐项落位，必答项②）、safePath 同构 + 零出站 +
零 env（必答项③）；git 只读白名单逐条列明（rev-parse/status/log/diff 四命令）
且可写命令逐类点名排除；golden 编号「按落盘时序、s8/s9 已预定、s10+ 交错、
不锁死」纪律明示；WB_ROUTES fixture 需求评估成文（预期需要）；「不预写实现
代码块」纪律入显著声明（ADR-0015「不预写 DEFS 终稿」同款）。工具性笔误 1 处
（§4 secrets 面续行首误入 `>` 引用符）落盘后即改（Edit 亲证，非内容偏差）。

## 4. 自测与边界核验（文件级；门禁四命令归脚本）

- `wc -l docs/adr/0016-workbench-right-panel-git-diff-tree.md` → **286**
  （≤400 ✓、260±60 区间内 ✓）；
- 状态行：`:3-5` 含「草案 · 待实施轮消费」+ 链终轮标注 + 授权链
  2026-10-23T15:49:17Z（AC1）；标题 `:1` 含「草案」二字；`grep -c "已批准"`
  = **0**（非功能要求 3：全文无批准态措辞）；
- EOL/BOM：首三字节 `# A`（od 亲核，无 BOM）、`grep -c $'\r'` = 0（纯 LF，
  非功能要求 4）；
- **BACKLOG 回写 VERBATIM**：node 脚本提取 ADR §7 三段 ```text 字面量与
  BACKLOG 三行备注列（split('\|') 第 10 列）trim 后全等 → `VERBATIM OK ×3`
  （长度 1154/848/943 一致）；三行状态列均 `proposed`、来源列均 `issue#4`、
  标题列逐字不动（字段校验输出亲核）；首跑曾因脚本切片 bug 误报 MISMATCH，
  修正提取列后全绿——非数据差异（比对脚本临时落盘于迭代目录执行后已删除）；
- 产品白名单外零改动：`git status --porcelain` 仅 `docs/adr/0016-*.md` 新增 +
  `docs/evolution/{BACKLOG,STATE}.md` 修改 + `iterations/0030/` 未跟踪（PLAN/
  BUILD 机制件），`apps/**`、`packages/**`、`tools/**`、`tests/**`、
  `.github/**`、package.json / package-lock.json 零出现（零依赖 = lock 零变化
  的机器前置证明，AC5 终判归 VERIFY 于提交后执行）；
- 未运行（归脚本统一执行，本 JOURNAL 不代报）：`npm run build` / `npm run
  gate` / `npm test` / `npm run smoke:server`；`npm run gate:update` 全程
  禁止（非修宪轮，POLICY 禁止区）——未运行、未接触 golden 任何字节。

## 5. 移交说明

- VERIFY 按 PRD AC1~AC7 执行：AC1（恰一文件纯新增 / 286 行 ≤400 / 七要素成节 /
  草案双标注 / 授权链引用）、AC2（锚点对照零杜撰——§2 清单可作抽样池，含 §3.1
  cwd 实测证据与 tools.ts:18-22 实际行段；容器信息架构节显式覆盖共存方案三选一
  + 推荐；端点契约节显式零出站与零 env 推荐案）、AC3（§5 编排四件套逐批列明 +
  链终轮（BK-0042）回执 issue#4 关单口径在列 + §6 双通道与「s8/s9 已预定、
  s10+ 按落盘时序交错」明示 + WB_ROUTES 需求评估成文）、AC4（三行 VERBATIM——
  §4 已载程序化比对 OK ×3，VERIFY 复跑；BK-0042 链终轮关单口径保留）、AC5
  （产品提交恰 `docs/adr/0016-*.md` 一路径 +N/−0 + 禁区 diff 恒空 + lock
  零变化）、AC6（门禁四命令，脚本侧；smoke V09 时点性假红沿 0018/0021/0022
  先例：提交后复跑自愈，记实得值判据 0 failed）、AC7（指针抽样 ≥5 条——§2
  清单 20+ 条全部本会话亲核命中）。
- CLOSE 注意：BK-0039 置 done；issue#4 仅发进度回执**不关单**（关单留 BK-0042
  链终轮，BK-0039/BK-0042 行内明载，itemContinues=true，沿 issue#10/11 先例）；
  BK-0040/0041/0042 状态全程 proposed 不动，晋升条件 = BK-0039 CLOSE 后晋升
  （BK-0040 先行，0041/0042 随链；实施序 0040 → 0041 → 0042，ADR-0016 §5/§7）。
- 下轮选题提示（非本轮动作）：SPEC 四连就此收官，按 ROADMAP.md:186-190 进入
  实现段（预期 BK-0033，BK-9002 链差异化主轴优先）。
