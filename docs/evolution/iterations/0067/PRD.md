# PRD · 迭代 0067 · BK-0062 扩展发现器「安全方案」SPEC 先行（ADR 草案轮）

> 迭代：0067（工作树 feat/0067-iter）｜项：BK-0062｜类型 capability｜优先 P2｜大小 M
> 结论先行：**建议做**——T5-M2 SPEC 三连（BK-0060 → BK-0061 → BK-0062）末位，前两位已
> 于迭代 0059/0066 收官，本项为 ready 队列唯一非 doc 项（BACKLOG.md:83 机器复核 2026-10-29）；
> 纯文档轮零实现，:`~/.agents` 用户主权区的安全方案必须先行（BK-0043「安全世界设计先行」
> 同款立项语）。
>
> **触 UI 分类结论：否（自主区）**。纯 ADR 草案文档轮：apps/packages/tests/tools/.github
> 零改动、零依赖、零 env 语义、零出站、零 golden、零 shared 契约（BK-0027 AC4 白名单 /
> BK-0060·0061 同款先例）。`docs/adr` 属 POLICY 自主区「文档与实现同步」。
> 本轮**绝不实现**发现器本体（归 BK-0014 实现块）；若 SPEC 定稿含新增出站类别 /
> 新依赖 / 新 env 语义，按 POLICY 需批准区持附录 A 开 `needs-approval` issue，
> 获批前实现块零实现（BK-0027→#10 先例）。
>
> M 项不免 SPEC：`skipSpec=false`，受影响文件正式清单与验收命令口径由 spec-designer
> 在 SPEC.md 定稿（本 PRD §6 仅建议性清单）。

## 1. 背景与证据

1. **立项证据链**（BACKLOG.md:83 BK-0062 行 + BACKLOG.md:111 BK-0014 行）：
   - BK-0014 立项语明载「`~/.agents` 为用户主权区，自动注入须白名单 + 首次确认 +
     审计留痕」——安全方案必须为首块产出（BK-0043 先例：BK-9005 链以 ADR-0014
     安全世界设计先行，迭代 0028）。
   - 扩展点已在位（本轮亲核）：`apps/server/src/mcp/registry.ts:99-105`——注释
     「BK-0014 loaders 扩展点（ADR §9）：仅函数签名 + v1 唯一成员」+ 注释「后续
     .mcp.json / ~/.agents 扫描 loader（BK-0014）届时以新成员加入本签名」+
     `McpServersLoader` 签名与 `envLoader` v1 成员。发现器以**新 loader 成员**接入，
     零既有签名改动——这是 ADR 定界的锚点事实。
   - 前置 BK-0013（真 MCP client 基座）已 done：ADR-0012 实施链 BK-0028~0030 于
     迭代 0023~0025 收官（ROADMAP.md:153-157，T5-M1 4/4 收口）。
2. **序列位次**（ROADMAP.md:210-211 待办节序列 3）：「T5-M2 SPEC 三连穿插：
   BK-0060 → BK-0061 → BK-0062」。BK-0060 done（迭代 0059，ADR-0020）、
   BK-0061 done（迭代 0066，ADR-0022），本项为三连收官。
3. **选题过程存证**（规则④常规选题，本轮档案：approved 无 / rejected 无 / 悬挂 run
   探针空 / 残缺标记唯一实质项 browser stub `apps/server/src/tools.ts:138` 系
   ADR-0011 评估终态不立项；issue 面板 #15/#12/#6 均 needs-approval 未批复——
   #15 为 BK-0020 附录 A 请批 issue，批复前 BK-0020/BK-0048 维持 proposed，
   metrics.md:64 亲读佐证）：
   - `grep -n '| ready |' docs/evolution/BACKLOG.md` → 恰 1 行 = :83 BK-0062
     （capability/否/P2/M/ready/T5）；
   - ready/doing 中触UI=是 计数 = 0（grep 复核），无规则⑥隔离对象；
   - `.zcode/locks/items/` 目录为空（2026-10-29 12:00 亲查）→ 无并行路占位冲突；
   - 非递补、非 noop：ready 队列非空且唯一项类型非 doc。

## 2. 目标与范围

### 2.1 目标（本迭代交付物 = 一份 ADR 草案 + BACKLOG 定界回写）

产出扩展发现器的**安全方案 ADR 草案**（编号按落盘时序取下一可用号：现行至 ADR-0022，
预期 **0023**；若并行路先行落盘撞号，按 ROADMAP.md:221-223 落盘时序裁决顺延，改名非重写），
六要素成节：

| # | 要素 | 定界要点（SPEC 细化） |
| --- | --- | --- |
| 1 | 扫描范围白名单 | 项目 `.mcp.json`、项目 `.agents/`、`~/.agents/` 三源逐一定界：发现什么（mcp/skill/rules）、目录锚定、条目上限、忽略清单（含 `.git`/node_modules 同族折叠先例 workbench/tree.ts 形态） |
| 2 | 首次确认语义 | **硬边界：零 UI 面**——确认载体只能是「显式配置即确认」（env/白名单文件登记）或服务端日志级确认；不得引入前端交互面，否则即触 UI 越界（见 §5 中止条件） |
| 3 | 审计留痕 | 沿 approval_audits（store.ts）/ pty_audits（pty/audit.ts，同库第二连接先例）形态评估发现事件的审计承载与粒度 |
| 4 | 出站类别清单 | 逐源声明出站面；凡既有 guard 类别内取用写明对应函数；新增类别即附录 A 请批面（POLICY「新增出站网络目标类别」） |
| 5 | loaders 接线定界 | 以 `McpServersLoader`（registry.ts:100-101）签名新增成员为唯一接缝，v1→v2 成员序、零抽象设施、零既有成员改动 |
| 6 | 与实现块定界回写 | BK-0014 行权威字面量（VERBATIM 段，BUILD 轮程序化回写，BK-0035/0039/0060/0061 先例） |

### 2.2 不做范围（out of scope）

- **零实现**：发现器本体（扫描/注册/注入）归 BK-0014 实现块，本迭代一行代码都不写；
- 不改动 `McpServersLoader` 既有签名与 `envLoader` 成员（零代码承诺的锚点）；
- 不触碰 `packages/shared`（DEFS/SSE 契约零接触）、`apps/web`、golden、
  `tools/pixel-gate/`、CI 配置（POLICY 禁止区/需批准区一律不进本轮）；
- 不立项 BK-0018（记忆工具组）、BK-0020/BK-0048（on-error 链，待 #15 批复）、
  BK-0044/0045 遗留面（已收口）；
- 不采集治理日专属证据（覆盖差集/文档漂移/dogfooding——心跳不重复采集，归周度治理）。

## 3. 触 UI 分类结论

**触UI=否，自主区，正常需求流程**。判定依据：本迭代改动面仅 `docs/adr/00NN-*.md`
新增 + `docs/evolution/BACKLOG.md` 回写，均不在宪法第 1 条三层（视觉/DOM 结构/交互）
射程内；UI 三层零接触由 AC4 禁区 diff 机器证明兜底。**例外中止条件**见 §5——若 SPEC
或 BUILD 阶段发现「首次确认」唯一可行形态是前端 UI，则立即中止转 `needs-approval`，
本迭代按回滚处理（WORKFLOW §4 BUILD 期触 UI 纪律）。

## 4. 需求条目

- **REQ-0062-01（ADR 草案落盘）**：`docs/adr/0023-*.md`（编号以落盘时序为准）新增，
  ≤400 行（BK-0043 389 行 M 级先例；预算区间建议 260~340，附录 A 字面量不可压缩时
  允许贴近上限），UTF-8 无 BOM 纯 LF；头部状态行=「草案 · 待实现轮消费」；若含请批面
  则双位标注「草案 · 待用户批准（请批面——附录 A）/ 待实现轮消费」（ADR-0014 头部
  双位标注先例），全文「已批准」计数必须为 0。
- **REQ-0062-02（安全方案六要素）**：§2.1 表六要素逐节成文，全部结论挂代码锚点
  （文件:行），禁止杜撰；指针抽样 ≥5 条可开（AC6）。
- **REQ-0062-03（请批面裁定）**：三选一并给明文结论——(a) 推荐案零新增出站/依赖/env
  → §8 写「无需批复」明文结论（ADR-0020 §8 先例）；(b) 任一新增 → 附录 A
  needs-approval issue 草案五要素自包含（BK-0027 SPEC 附录 A 先例），由协调者/脚本
  持字面量开 issue，获批前实现块零实现；(c) 与 BK-0044 同款「风险声明知悉」面 →
  并入附录 A 知悉清单。
- **REQ-0062-04（BK-0014 定界回写）**：§7 权威回写字面量段落（供 BUILD 轮 VERBATIM
  程序化回写 BK-0014 行，trim 全等比对）；回写仅更新备注定界，BK-0014 状态列维持
  proposed 不动（晋升条件=BK-0062 CLOSE 且（若定新出站/依赖）needs-approval 获批）。
- **REQ-0062-05（与既有钱链的边界切割）**：写明与 ADR-0012（env 注册表语义）、
  ADR-0022（on-error env 面）、BK-0018（记忆工具组）的互斥边界——扩展发现器不得
  借道注入未在白名单内的能力面。

## 5. 非功能要求与中止条件

1. **安全护栏对齐（POLICY/AGENTS/宪法）**：出站面设计必须落在 guard.ts 既有出站
   类别内；服务端请求 URL 仅 http/https、发请求前校验 host 并拒绝 localhost/环回/
   私有/保留地址（本轮派发 Mimosa 安全约束，与 guard 既有口径一致）——新增出站目标
   类别即需批准区。
2. **零实现承诺的机器证明**：AC4 禁区 diff 恒空为提交级终判（BK-0060 AC5 同款口径）。
3. **触 UI 中止条件**：SPEC/BUILD 任一阶段确认「首次确认」需前端面 → 立即中止，
   item 转 `pending-approval`/`blocked`，工作树整体丢弃（WORKFLOW §4）。
4. **gate 抖动预案**：工作树门禁若出现 s3-library 单场景 diffPx 21~23、其余场景全绿、
   DOM 不变量逐键全等 → 按 issue#12 已知本机抖动口径处置（双留档 gate-first-run.log、
   以复跑/CI 为准），绝不 gate:update（非修宪轮，golden 零接触；0039~0059 连续先例）。

## 6. 受影响文件（建议清单；正式清单与白名单由 SPEC 定稿）

| 路径 | 动作 | 说明 |
| --- | --- | --- |
| `docs/adr/0023-<slug>.md` | 新增 | 产品提交唯一路径预期（BK-0060/0061 恰 1 路径先例；编号时序裁决在案） |
| `docs/evolution/BACKLOG.md` | 回写 | BK-0014 行定界回写 ±1/1（BUILD 轮，VERBATIM）；BK-0062 行 CLOSE 终态回写 |
| `docs/evolution/iterations/0067/*` | 新增 | PRD/SPEC/JOURNAL/REPORT 机制件（随机制件提交，不入 productFiles） |
| apps/ packages/ tools/ tests/ .github/ package*.json | **零改动** | 禁区，AC4 机器证明对象 |

## 7. 验收标准（Given / When / Then）

- **AC1 草案落盘且形态达标**
  - Given 工作树 feat/0067-iter 基线门禁绿；
  - When BUILD 完成产品提交；
  - Then `docs/adr/0023-*.md`（或时序裁决号）存在、行数 ≤400、`git show --numstat`
    实查恰 1 产品路径；文件为 UTF-8 无 BOM 纯 LF（od/tr 字节级核）；头部状态行含
    「草案」，全文「已批准」计数 0。
- **AC2 六要素成文且锚点真实**
  - Given §2.1 六要素清单；
  - When VERIFY 逐节核对；
  - Then 六要素各有独立小节；抽验 ≥5 组「文件:行」锚点逐一命中、零杜撰（含
    registry.ts:99-105 扩展点锚点必抽）。
- **AC3 请批面裁定明文化**
  - Given REQ-0062-03 三选一；
  - When VERIFY 核对 ADR §8/附录 A；
  - Then 恰一结论成立：(a) §8「无需批复」明文在案，或 (b) 附录 A 五要素自包含草案
    在案且全文标注「获批前零实现」，或 (c) 知悉面并入附录 A 清单。
- **AC4 零代码机器证明**
  - Given 本轮纯文档承诺；
  - When CLOSE 复核；
  - Then `git diff HEAD -- apps packages tools tests .github package*.json` 恒空；
    productFiles 白名单不含任何代码路径。
- **AC5 回归面全绿**
  - Given 工作树内门禁流程；
  - When 跑 `npm run build` + `npm run gate` + `npm test` + `npm run smoke:server`；
  - Then 四项 exit 0（gate 全场景 diffPx=0，s3 抖动按 §5.4 预案处置；smoke 与
    0066 基线 168/0 零回退——纯文档轮零增量断言）。
- **AC6 指针抽样**
  - Given ADR 全文锚点；
  - When 抽样 ≥5 条「文件:行」；
  - Then 全部可开且语义相符（含 BK-0014 晋升条件、#15 批复等待面等跨文档指针）。
- **AC7 BK-0014 定界回写就绪**
  - Given REQ-0062-04；
  - When BUILD 轮执行 VERBATIM 回写；
  - Then BK-0014 行新备注与 ADR §7 字面量 trim 全等（node 程序化比对 OK），状态列
    仍为 proposed，其余行零触碰（`git diff --stat` 恰 ±1/1）。

## 8. 风险与预案

1. **「首次确认」无 UI 载体的设计张力**：最大风险点。预案=确认语义收敛为「显式配置
   即确认」（与 env 白名单注册表 MCP_HTTP_SERVERS/MCP_STDIO_SERVERS 同构——用户在
   配置面显式登记即视为知情确认）+ 发现事件审计留痕兜底；若 SPEC 评估认定不足，
   按 §5.3 中止转请批，不硬闯。
2. **ADR 编号撞号**：并行路先行落盘 0023 → 按落盘时序顺延下一号（ROADMAP.md:221-223
   机制提案先例、BK-0063 首例在案），改名非重写。
3. **Mimosa 钩子误报**：对 docs 纯新增文件历史零误报先例（0027/0028/0029/0030/0059/
   0066 六轮同型轮全 done）；仍被拦则按其建议修复，禁止绕过。
4. **回滚**：本迭代若任一 AC 不可达 → 工作树整体丢弃、主干零影响（WORKFLOW §4）。

## 9. 交付与后续

- 本迭代 CLOSE 后：BK-0062 置终态；BK-0014 实现块晋升条件兑现一半（BK-0062 CLOSE），
  若推荐案 (a) 零反转则无批复等待项、归下轮 PLAN 轮随链晋升（BK-0019 链同径先例）；
  若 (b)/(c) 则等待 issue 批复，期间心跳可选其他 ready 项或合法空转。
- T5-M2 SPEC 三连就此收官（0059 ADR-0020 / 0066 ADR-0022 / 本轮 ADR-0023），
  ROADMAP 状态行回写留治理日 PM。
