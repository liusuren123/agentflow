# JOURNAL · 迭代 0029 · BK-0035 呈现三件套节点分批修宪 ADR 草案 SPEC 先行（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 13:26
> 输入：`PRD.md`（S 项 skipSpec=true——§7 内嵌定界即 SPEC 替代；REQ-0035-01~06 /
> AC1~AC7；触UI=否、纯文档轮、全程禁 gate:update）。
> 本轮零代码 / 零依赖 / 零 env / 零出站 / 零 shared 契约 / 零 UI / 零 golden：
> 未对 `apps/**`、`packages/**`、`tests/**`、`tools/**`、`.github/**`、根/子包
> package.json / package-lock.json 执行任何写操作（全程只读核实代码锚点）。
> 完整门禁（build / gate / test / smoke:server）与 git 提交由脚本统一执行，BUILD
> 未自行运行。STATE.md 已按派发指令更新：`phase: PLAN → BUILD`、
> `updated: 2026-10-25 13:26`。

## 1. 改动清单（产品提交面 = AC5 白名单一路径；BACKLOG/STATE/JOURNAL 为机制件）

| 文件 | 净改动 | 改动内容 |
| --- | --- | --- |
| `docs/adr/0015-presentation-triplet-nodes.md` | **纯新增 260 行**（≤400 硬性上限达成、恰在 PRD 建议区间 260±60；UTF-8 无 BOM、纯 LF，od/CR 计数亲核） | 七要素成节（PRD AC1 逐项）：头部状态块（:3 状态行 = 「草案 · 待实施轮消费（BK-0036/0037/0038——链终轮）」+ 授权链 issue#3 承继 2026-10-23T15:49:32Z；零依赖面故无 0014 式「待用户批准」位，PRD AC1 口径）+ 显著声明 → §1 动机与现状证据（sink 同构/160 字截断差距/DEFS 通用渲染链/NDP 终态四条）→ §2 三节点 DEFS 定界草案（§2.1 webshow / §2.2 termview / §2.3 jsoncanvas 字段级草图——type/identity/ports/params/binding 逐字段表 + 双输入与 object 严型两否决案记录；§2.4 schema 纪律合规自检九条，ADR-0013 §2.3 样板）→ §3 呈现承载定界（三 handler 新键入 BASIC_HANDLERS 经 engine.ts:26-29 自动注册 / reply 同构形态 / 逐节点降级语义 / handlers.ts 298→~335 行容量论证 + present.ts 回退案 / handlers-coverage 联动）→ §4 画布渲染面定界（§4.1 iframe sandbox + http(s) 白名单 + 服务端零出站三写死 / §4.2 等宽流式只读 / §4.3 结构化树降级 / §4.4 PTY ×BK-0045 边界切割 + 实施护栏 / §4.5 SSE 15 种内取用护栏）→ §5 分批修宪编排（0036→0037→0038 一节点一迭代一 ADR 增补 + 每批四件套表 + baseline 16→17→18→19 与守卫联动逐批列明）→ §6 golden 增量预案（双通道 + s3 每批必然重录 + s0~s2/s4~s7 预期零波及实测 + 编号按落盘时序预期 s10+ 不锁死 + RUN_ROUTES fixture 评估）→ §7 三段 ```text 权威回写字面量 + 晋升/关单口径 → §8 影响面与不做范围（ADR-0013 §9 同款收尾节） |
| `docs/evolution/BACKLOG.md` | 3 行备注列原地替换（随归档提交） | BK-0036/BK-0037/BK-0038 三行备注列替换为 ADR §7 三个代码块字面量**逐字粘贴**（node 程序化提取比对 VERBATIM OK ×3，见 §4）；其余列（含状态 `proposed`、来源 `issue#3`）逐字不动（split('\|') 字段校验）；BK-0035（:48）与 BK-9003（:74）行未触碰（状态流转归脚本/CLOSE） |

## 2. PRD 内嵌定界 vs 代码现状复核（BUILD 义务；「矛盾即中止」未触发）

复核方法：PRD §背景/AC2/AC7 全部指针本会话 Read / grep / wc / ls 逐一亲核。
**结论：技术结论与代码现状零矛盾、零杜撰，无需中止；PRD 背景节 6 处行号偏移
按代码事实转写（§3.1）。**

命中的指针（超出 AC7 下限 ≥5 条，全部命中）：

- `nodes.schema.ts`（175 行）：`:13-15` 三枚举冻结（PORT_TYPES 五 / WIDGETS 五 /
  CATEGORIES 七）、`:18-21` PortIdSchema 正则、`:50-58` ParamJsonSchema
  widget×default 判别联合、`:72-83` CapabilitiesJsonSchema 恰十 kind、`:136-146`
  combo 值域 / number min-max-step 约束、`:152-165` 端口唯一 + in-/out- 前缀；
- `nodes/reply/node.ts` 全文 21 行：outputs 空数组 / in-content type any /
  binding `{handler:'reply', capabilities:{data:true}}` / 单 textarea 参数——
  sink 同构样板与 PRD §背景 4 逐字相符；
- `nodes.ts` 142 行（wc 亲核）：imports :19-34、loadJsonDef :37-47、synthesize
  :93-111（caps 只映射 mcp/skill :97-99——§2.4「data 不进 caps」依据）、
  NODES 16 键 :113-130、paramDefaultsOf :138-142；
- `handlers.ts`（298 行）：`:225-232` reply handler（render → ctx.outputs!.push
  + emit('output',{text}) + out 摘要）精确命中；
- `engine.ts`（152 行）：`:26-29` `HANDLERS = {...BASIC_HANDLERS, llm}`、`:99`
  `HANDLERS[n.type] || HANDLERS.__pass`——§3「入 BASIC_HANDLERS 即自动注册、
  engine 零改动」依据；
- `app.js`（2426 行）：`:36-42` PTYPES 五类型、`:43` typeOk、`:46-54` CATS 七类目
  （output :52 → `--cat-output`）、`:57-99` ICON_PATHS、`:100` I() 按键查表、
  `:763` widget 行 / `:764-765` port-row（DEFS 通用渲染链）、`:774` .node-out
  唯一输出容器、`:897` slice(0,160)、`:1866`/`:1203` RUN_META 单行文案、
  `:1896` setNodeOut textContent 单行（`:1213` 调用点）、`:778-784` capsChips；
- `events.ts:8-37` 恰 15 个 z.literal（SSE 护栏 §4.5 的取值域）；
- `gate.mjs`（282 行）：`:176-187` SCENARIOS 恰 8 场景 s0~s7、`:181-184`
  s4/s5 WF_ROUTES/RUN_ROUTES fixture（§6 在线场景评估先例）；
- 16 节点 icon 占用 grep 亲核：globe→websearch、code→代码执行、box-select
  无节点占用、reply→直接回复、tag→变量赋值——§2 三节点图标复用案（globe/code/
  box-select）与 §6「output 分组现占用 setvar/reply 两行」依据；
- `docs/adr/` ls 亲核现行至 0014 → 0015 编号顺延成立；ADR-0013（297 行）§2.3
  自检表 / §6 双通道样板亲读对齐；
- `BACKLOG.md`：BK-0035（:48）/ BK-0036 / BK-0037 / BK-0038 / BK-9003（:74，
  批复承继 2026-10-23T15:49:32Z）亲读，拆分口径与授权链在案；
- `ROADMAP.md` 待办节亲核：BK-9003 链序列 0036→0037→0038（一节点一修宪迭代，
  0038 链终轮回执 #3）与 SPEC 四连先行 0032→0043→0035→0039——§5 编排依据。

## 3. 实现期偏差记录

### 3.1 PRD 背景节 6 处锚点行号偏移（按代码事实转写，沿迭代 0027 JOURNAL §3.1 先例）

PRD 所写与实际：nodes.schema.ts「:50-57 矩阵」→ 实际 :50-58；「:18-19 正则」→
实际 :18-21；app.js「:54+ ICON_PATHS」→ 实际 :57-99；「app.js:1210 setNodeOut」
→ 实际定义 :1896（:1210 邻域为 RUN_META 消费点、:1213 为调用点）；gate.mjs
「:177-186」→ 实际 :176-187；nodes.ts「:29-33 loadJsonDef」→ 实际 :37-47。均属
行段内偏移（PRD AC7 判据「行段射程内命中」仍成立），技术结论零矛盾。处置：ADR
全部按本会话亲核的实际行号转写——照抄 PRD 行号会使 VERIFY AC2 逐条对照代码
反判 ADR 杜撰。

### 3.2 §7 行数预算低估（沿迭代 0028 JOURNAL §4 同类记录）

PRD §7 骨架表预估 ADR §7 ~15 行；实际约 70 行——三段 VERBATIM 权威字面量本身
1284/1354/1222 字符（AC4 逐字比对基准，不可压缩）。全文 260 行 ≤400 硬性上限、
恰在建议区间 260±60 内，AC1 硬判据达成。

### 3.3 其余零偏差

七要素成节（§1~§7）+ §8 影响面与不做范围（ADR-0013 §9 同款收尾节，非七要素外
新增实质面）；三节点 DEFS 采用字段级草图表制式而非终稿代码块（PRD「不预写 DEFS
终稿代码块」纪律，BK-0045 行同款）；冻结枚举内组合零溢出（类别落 output、端口
any、widget 用 text/toggle/number 三种，combo 未用但保留枚举内取用口径）；iframe
安全面（§4.1 三写死）、PTY 切割（§4.4）、SSE 护栏（§4.5）三必答项均成节；
golden 编号「按落盘时序、预期 s10+、不锁死」纪律明示。

## 4. 自测与边界核验（文件级；门禁四命令归脚本）

- `wc -l docs/adr/0015-presentation-triplet-nodes.md` → **260**（≤400 ✓、
  260±60 ✓）；
- 状态行：`:3` 含「草案 · 待实施轮消费」+ 授权链 2026-10-23T15:49:32Z +
  链终轮标注（AC1）；标题 `:1` 含「草案」二字（PRD AC1 明文要求，0012/0013
  标题无草案字样但本 PRD 有明文，补齐）；`grep -c "已批准"` = **0**（非功能
  要求 3：全文无批准态措辞）；
- EOL/BOM：首三字节 `# A`（od 亲核，无 BOM）、CR 计数 0（纯 LF，非功能要求 4）；
- **BACKLOG 回写 VERBATIM**：node 脚本提取 ADR §7 三段 ```text 字面量与
  BACKLOG 三行备注列 trim 后全等 → `VERBATIM: OK ×3`（长度 1284/1354/1222
  一致）；三行状态列均 `proposed`、来源列均 `issue#3`（split('\|') 字段校验）；
  BK-0035/BK-9003/其余行未触碰（比对脚本临时落盘于迭代目录执行后已删除）；
- 产品白名单外零改动：`git status --porcelain` 仅 `docs/adr/0015-*.md` 新增 +
  `docs/evolution/{BACKLOG,STATE}.md` 修改 + `iterations/0029/` 未跟踪（PLAN/
  BUILD 机制件），`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、
  package.json / package-lock.json 零出现（零依赖 = lock 零变化的机器前置证明，
  AC5 终判归 VERIFY 于提交后执行）；
- 未运行（归脚本统一执行，本 JOURNAL 不代报）：`npm run build` / `npm run
  gate` / `npm test` / `npm run smoke:server`；`npm run gate:update` 全程
  禁止（非修宪轮，POLICY 禁止区）——未运行、未接触 golden 任何字节。

## 5. 移交说明

- VERIFY 按 PRD AC1~AC7 执行：AC1（恰一文件纯新增 / 260 行 ≤400 / 七要素成节 /
  草案双标注 / 授权链引用）、AC2（锚点对照零杜撰——§2 清单可作抽样池，含 §3.1
  六处实际行号）、AC3（§5 编排四件套 + baseline 16→17→18→19 + 守卫联动清单 +
  §6 双通道与 s10+ 纪律 + §4.1 iframe 安全面 + §4.4 PTY 切割）、AC4（三行
  VERBATIM——§4 已载程序化比对，VERIFY 复跑；BK-0038 链终轮关单口径保留）、
  AC5（产品提交恰 `docs/adr/0015-*.md` 一路径 +N/−0 + 禁区 diff 恒空 + lock
  零变化）、AC6（门禁四命令，脚本侧；smoke V09 时点性假红沿 0018/0021/0022
  先例：提交后复跑自愈，记实得值判据 0 failed）、AC7（指针抽样 ≥5 条——§2
  清单 20+ 条全部本会话亲核命中）。
- CLOSE 注意：BK-0035 置 done；issue#3 仅发进度回执**不关单**（关单留 BK-0038
  链终轮，BK-0035/0038 行内明载，沿 issue#10/11 先例）；BK-0036/0037/0038 状态
  全程 proposed 不动，晋升条件 = BK-0035 CLOSE 后由 PLAN 轮晋升（三项同批可
  晋升，实施序仍 0036 → 0037 → 0038，ADR-0015 §5/§7）。
