# PRD · 迭代 0059 · BK-0060 BK-0019 拆分 SPEC 先行：KB 管道后端嵌入存储选型 + 上传/切分/嵌入/入库管道与 kb 清单端点定界 + ADR 草案

> 产出角色：product-manager（PLAN 阶段）· 2026-10-28 06:58
> 来源：BACKLOG BK-0060（capability / 触UI=否 / **P1 / S / ready** / 来源 T5，
> BACKLOG.md:81）。2026-10-26 W44 第五次治理由 BK-0019 拆分落地（先例 BK-0032 /
> BK-0043 / BK-0035 / BK-0039「SPEC 先行四连」同款立项语），本项为纯文档轮
> 零实现。
> 定界权威：BACKLOG BK-0060 行内口径 + ROADMAP 待办节实施序列 3「T5-M2 SPEC
> 三连穿插：BK-0060 → BK-0061 → BK-0062（纯文档轮……BK-0060 若定新依赖即持
> 附录开 needs-approval，等待期不空转）」（ROADMAP.md:210-211；本序列为 PLAN
> 指导、先例在案，优先于主池表序）。
> 先例：BK-0032（迭代 0027，ADR-0013）/ BK-0043（迭代 0028，ADR-0014，附录 A
> 请批草案样板）/ BK-0035（迭代 0029，ADR-0015，**S 项免 SPEC 直系先例**）/
> BK-0039（迭代 0030，ADR-0016，端点契约草案样板）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · M2 环境感知与数据真实化
> （ROADMAP.md:161-165——M2 四项均 proposed 未开工，本项即 M2 首个开工块）。
> 批次编排：无——单项单迭代（S 级纯文档轮，skipSpec=true，本 PRD §7 内嵌定界
> 即 SPEC 替代）。来源 T5 无 issue → 无回执义务（itemContinues=false）；BK-0019
> 实现块与 BK-0047（issue#6 子项）各有独立行，晋升/关单口径见「目标与范围」。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-28 06:55~06:58 核实）

- **跨迭代续选**：无——0055（BK-0044）/0056（BK-0042）/0057（BK-0045 failed）
  均已终态归档；0058 系 BK-0045 失败重试轮、终态**合并受阻**（归档提交 882653b
  仅改 STATE 一文件三行，`git show --stat` 本会话亲核；成果滞留 feat/0058-iter
  分支，`git branch` 亲核在库，无迭代目录、无 metrics 行）。
- **BK-0045 占位禁选**（派发提示「已被其他并行工作流占位，本轮严禁选择」）：
  实况补充——0058 合并受阻后成果仍在分支待合并仲裁，WORKFLOW §4「合并受阻/
  锁超时时占位有意保留」口径下该项仍处进行中，禁选与机制口径一致，双保险不选。
- **① 批复同步**：档案「approved：无；rejected：无」→ 本轮零动作（无建行、
  无转 ready 门槛解除、无 skipped 改写）。issue 面板四项均 needs-approval 未获
  新批复：#14（PTY 依赖批复已消费，关单留 BK-0045 链终轮，BK-0044 行在案）、
  #12（CI 像素门禁 s3 亚像素抖动处置——golden/CI 需批准射程，0045~0052 同判
  不自主处理）、#6/#5（修宪授权链已承继消费中，关单留各链终轮）。
- **② user-request**：档案无 user-request 条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 无 skipped 改写。
- **④ 常规选题（本轮入选路径）**：ready 队列逐项处置（本会话 grep `| ready |`
  亲核全表恰四项，行号实核）——
  - BK-0045（BACKLOG.md:66，P0/M，issue#5）——**禁选**（并行占位，见上）；
  - BK-0060（:81，P1/S，T5）——✅ **入选**；
  - BK-0061（:82，P2/S，T5）；BK-0062（:83，P2/M，T5）——顺位靠后不选；
  - BK-0063（:84，P2/S，doc，proposed）——类型 doc 心跳不选 + 状态非 ready，
    双重不入选（治理日批处理）。
  - **无晋升义务**：BK-0019 实现块晋升 = 本项 CLOSE 且（若定新依赖）获批
    （未 CLOSE 维持 proposed）；BK-0047 前置 BK-0019、BK-0048 前置 BK-0061 链，
    均未竟零回写；0058 无遗留晋升动作（合并受阻不记账）。
  - **选 BK-0060 的依据**：禁选项剔除后唯一 P1（次高优先级）+ S 项（「优先
    S/M」口径满足）+ 无前置（行内「晋升条件=无前置（本项即 ready，心跳可选）」）；
    ROADMAP 待办节序列 3 首位（T5-M2 SPEC 三连 BK-0060 → BK-0061 → BK-0062，
    序列优先于主池表序）；行内 P1 取向理由——「解锁 P0 修宪子项 BK-0047 +
    依赖批复等待期长宜尽早开」。
- **侦察档案核对**：残缺标记 `tools.ts:5/:138` 为 stub 如实降级设计面（:5 文件
  头注自认设计原则、:138 为未注册外部工具兜底 stub——迭代 0025 inject 设计；
  browser 半面系 ADR-0011 评估终态，0041/0045~0051 各轮同判非立项对象）；
  `package-lock.json:787` 为 base64 哈希偶合非标记；悬挂 run 探针 `[]` =
  BK-0011 启动扫尾预期表现（迭代 0019 done）——无补题需求；覆盖差集/文档漂移/
  dogfooding 治理日产物心跳不重复采集。
- **与最近 3 次迭代重叠面**：0055（apps/server/src/pty/** 后端）、0056
  （workbench/tree.ts + 前端三文件）、0057（terminal 节点链，已并入主干）——
  本项纯文档轮零代码，对三次迭代产物零触碰；仅**引用**其结论（0055 pty 自有
  仓储先例入 ADR §6 评估参数；0057 落定的 20 场景 gate 基线为 AC6 回归口径）。

## 结论

**建议做**：一句话理由——ROADMAP 待办节 T5-M2 SPEC 三连首位（治理日钦定
序列，BK-0061/0062 排其后）；纯文档轮零代码零依赖边际成本最低；**解锁链最长**
——BK-0019 实现块晋升与 BK-0047（P0 修宪子项，issue#6 批复已承继）双双以本项
为前置，且存储/嵌入选型与需批准面清单是实现轮依赖批复的决策前置，选型不定
则 needs-approval 无法成文、等待期空转（行内 P1 理由「依赖批复等待期长宜尽早
开」）；ADR-0013/0014/0015/0016 四块 SPEC 先行样板齐备（含附录 A 请批草案与
端点契约两种子样板）。非修宪轮、全程禁 gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证：

1. 本迭代唯一产品路径为 `docs/adr/0020-*.md` 纯新增（编号取 0020 的理由见
   背景 7）。`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、
   golden 基线、package.json/lock 零接触——视觉 / DOM 结构 / 交互三层无涉，
   **全程禁 `npm run gate:update`**（POLICY 禁止区）。
2. ADR **草案内容**虽为 KB 管道（上传/切分/嵌入/入库 + kb 清单端点）定界，
   但均为后端承载面（`apps/server/src/**` 自主区射程）；前端唯一触面——
   retrieval 节点 combo options 动态化——是 DEFS 变更触 UI 修宪轮，归
   BK-0047（issue#6 批复承继，BACKLOG.md:68），本轮零 DEFS、零前端、ADR 须
   写死该边界切割。
3. 需批准面增量（预埋护栏，本轮结论不预支）：若 ADR 推荐案定**新依赖**（SQLite
   向量扩展 / 独立向量库）或**新出站类别**（外部 embedding API），ADR 附附录 A
   needs-approval issue 草案（五要素自包含，ADR-0012/0014 先例），开 issue 归
   协调者/脚本（沿 BK-0027→#10 先例），**获批前 BK-0019 实现块零实现**；若
   推荐案为纯表扫描 + 本地嵌入（零新依赖零新出站）则明确「无需批复」结论。
   无论何案，本轮自身均零依赖零出站（纯文档）。

## 背景（代码事实，本会话 2026-10-28 06:55~06:58 只读核实）

1. **BK-0019 与拆分链**：知识库管理管道后端（上传 → 切分 → 嵌入 → 入库，
   retrieval 检索真实化）。demo kb 写死现状三点联动——`packages/shared/src/
   nodes/retrieval/node.ts:17-22`（params kb combo 三固定名 options「产品手册
   v2.3 / FAQ-售前 / 工单历史 2026」+ default，本会话 sed 亲读）+ `apps/server/
   src/kb.ts:6-40`（KB 常量三库硬编码语料）+ `handlers.ts:40`（retrieval
   handler）。BK-0060 为 SPEC 先行；实现块 BK-0019（proposed，BACKLOG.md:116）
   晋升 = 本项 CLOSE 且（若定新依赖）获批；BK-0047（kb 参数动态化，issue#6）
   硬前置 = BK-0019 的 kb 清单端点承载段（BACKLOG.md:68）。
2. **锚点勘误（按代码现状转写）**：BK-0019 行内旧锚点「nodes.ts:41 三个固定
   名」系 NDP 迁移（迭代 0021/0022）前坐标，现状三固定名锚点为
   `nodes/retrieval/node.ts:17-22`；本 PRD 与 ADR 一律采用现状锚点（BK-0011
   「证据指针随扩表刷新」同款锚点演进先例），AC4 回写时同步刷新 BK-0019 行。
3. **kb.ts 现状**：98 行（wc -l 亲核）。内置语料三库（产品手册 v2.3 12 条 /
   FAQ-售前 8 条 / 工单历史 2026 6 条）+ bigram TF-IDF 余弦检索，确定性本地
   计算、无出站（文件头注 :1-5 自证）。检索**计算面**已真实，缺口在**语料面**：
   不可上传、不可管理、三库固定——即「真实化」的需求依据。
4. **嵌入存储三案（BK-0060 行钦定评估对象）**：a) SQLite 向量扩展；b) 独立
   向量库；c) 纯表扫描（SQLite 表 + 进程内计算，零新依赖——kb.ts TF-IDF 路线
   的等距演进）。ADR 必答：每案数据模型 / 读写路径 / 依赖清单 / 需批准面 /
   迁移回滚，并给推荐案与否决理由。
5. **嵌入实现选型（ADR 必答，行内未展开故此处立项定界）**：本地嵌入（零出站）
   vs 外部 embedding API（**新出站类别 → POLICY 需批准区**）。与存储三案
   正交组合后给统一推荐。
6. **store.ts 400 行贴线**（wc -l 亲核）——行内 SPEC 注意「KB 加表方案须评估
   先拆分」；0055 先例可资参照：pty_audits 采用 pty 自有仓储（同库第二
   better-sqlite3 连接，store.ts 零改动）。KB 数据面走自有仓储 vs store 扩表
   拆分为 ADR 必答项（两案利弊 + 行数预算）。
7. **kb 清单端点样板**：`capabilities.ts` 64 行（wc -l 亲核）——GET
   /api/v1/capabilities 只读供数端点（迭代 0039 / ADR-0018）为 kb 清单端点
   契约草案的直系样板；BK-0047 前端 combo 换源消费该端点（0039 caps 换源
   同构）。
8. **上传承载面既有纪律**：文件工具只在 `apps/server/sandbox/` 内（AGENTS.md
   硬性约定 3；tools.ts SANDBOX 常量锚定先例、ADR-0016 §3.0 模块级常量锚定
   同构）——上传落盘位置 / 大小限额 / 类型白名单为 ADR §4 必答项。
9. **ADR 编号**：`docs/adr/` 现行 0001~0018 + **双 0017**（ls 亲核；BK-0063
   撞号未消解，proposed doc 项预告「后落 0017 改 **0019**」，BACKLOG.md:84）；
   feat/0058-iter 分支 docs/adr 同集合零新增（git ls-tree 亲核）→ 本项 ADR
   取 **0020** 规避二次撞号；与 ROADMAP 机制提案「ADR 编号比照 golden 场景号
   落盘时序裁决」一致（若 BK-0063 处置时序倒转，BUILD 期 ls 复核按实际空号
   顺延）。
10. **回归基线（0057 归档后）**：gate **20 场景**（tests/golden/ui/*
    *.invariants.json 本会话亲数 20 份；s19-terminal-panel-online 系 0057
    新增）/ npm test **30/30** / smoke:server **157 passed / 0 failed**
    （0057 metrics 行 tail 亲读）。本项零代码，理论零漂移。
11. **工作树与基点**：feat/0059-iter @ 0327566（= main HEAD，git log 亲核，
    零落后）；工作树内未提交改动仅 STATE.md 过程态（git status 亲核）；路径
    纪律——本 PRD 及后续产物一律落工作树前缀路径（WORKFLOW §2 v3）。

## 目标与范围

**做（本迭代产品提交面 = docs/adr/0020-*.md 单文件纯新增）**：

1. **ADR-0020 草案落盘**（≤400 行硬性，建议 280±60 对齐 ADR-0016 体量 286 行），
   八要素成节（骨架详见 §7 内嵌定界）：① 动机与现状证据；② 嵌入存储选型
   三案；③ 嵌入实现选型与出站结论；④ 上传/切分/嵌入/入库管道定界（含上传
   承载面安全必答）；⑤ kb 清单端点契约草案；⑥ 存储承载与 store.ts 拆分
   评估；⑦ BK-0019 定界回写索引 + 晋升条件 + BK-0047 边界切割；⑧ 附录 A
   依赖/出站请批草案（若推荐案需要；零依赖零出站案则成文「无需批复」结论）。
2. **BK-0019 行定界回写**：BACKLOG 行备注按 ADR 定界节更新（VERBATIM 一致；
   回写随归档提交入库，BK-0027/0032/0035/0039 同机制），含锚点现状刷新
   （nodes.ts:41 → nodes/retrieval/node.ts:17-22）与晋升条件细化（本项 CLOSE
   且（若推荐案定新依赖/出站）对应 needs-approval 获批）。

**不做（out of scope）**：

- 零代码、零依赖、零 env、零出站、零 UI、零 golden 接触（纯文档轮；
  `git diff -- apps packages tools tests .github package.json package-lock.json`
  恒空为机器证明）。
- 不实现任何端点 / 表 / 管道 / 上传承载；不改 retrieval DEFS 与 kb.ts（实现
  归 BK-0019）；ADR 不预写表结构终稿 DDL 与端点终稿代码块（草案级——BK-0035/
  BK-0045 同款「终稿归实施 SPEC」纪律）。
- 不开 needs-approval issue（PLAN 轮无此动作；附录草案若成立，开 issue 归
  协调者/脚本，沿 #10/#14 先例）。
- BK-0061/BK-0062（T5-M2 SPEC 三连后两位）不在本轮——一次迭代一件事；
  BK-0063（doc）归治理日；`npm run gate:update` / golden 任何接触（POLICY
  禁止区）。

## 受影响文件清单（= 产品提交白名单；S 项免 SPEC，本清单即定稿口径）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `docs/adr/0020-kb-pipeline-embedding-storage.md`（命名语义：KB 管道与嵌入存储选型定界） | 纯新增 | ~280（≤400，AGENTS.md 硬性约定 4；对齐 ADR-0016 体量 286 行） |

机制件（随归档提交，不属产品白名单）：`docs/evolution/BACKLOG.md`（BK-0060
置 done + BK-0019 定界回写）、`docs/evolution/STATE.md`、
`docs/evolution/metrics.md`、`iterations/0059/` 三件（S 项免 SPEC，PRD/
JOURNAL/REPORT）。

零改动白名单：`apps/**`、`packages/**`、`tools/**`、`tests/**`、`.github/**`、
根/子包 `package.json` 与 `package-lock.json`、`README.md`（doc 漂移归治理日）。

## 验收标准（Given/When/Then）

- **AC1 · ADR 落盘与要素完备**：Given 工作区干净、docs/adr 现行至 0018（双
  0017 待 BK-0063 消解），When 产品提交落盘，Then `docs/adr/0020-*.md` 恰一
  文件纯新增、行数 ≤400，八要素（动机/存储三案/嵌入选型/管道/端点契约/存储
  承载与拆分评估/回写索引/附录 A）每要素成节可索引；标题与状态标注含「草案」
  字样，状态行语义 =「草案 · 待实施轮消费（BK-0019——实现轮）」，若附录 A
  请批草案成立则加「附录 A 待用户批准」位（ADR-0014 双位标注先例）；不出现
  「已批准」字样（本项来源 T5 治理日立项，无 issue 批复承继——授权语义与
  ADR-0015/0016 自主区文档轮同款）。
- **AC2 · 选型锚点真实可核**：Given ADR 选型与现状节，When 按引用逐条对照
  代码锚点（nodes/retrieval/node.ts:17-22 三固定名、kb.ts:1-40 三库语料与
  TF-IDF 头注、handlers.ts:40 retrieval handler、store.ts 400 行、
  capabilities.ts 64 行端点样板、BACKLOG BK-0019/BK-0047/BK-0060 行、
  ROADMAP.md:161-165），Then 与代码逐一相符、无一杜撰；存储三案每案五要素
  （数据模型/读写路径/依赖清单/需批准面/迁移回滚）齐备，推荐案给否决理由。
- **AC3 · 管道与端点定界成文**：Given ADR 管道与端点节，When 读定界，Then
  ① 上传→切分→嵌入→入库四段每段定承载文件草案（`apps/server/src/**`
  自主区射程）与验收口径草案；② 上传承载面安全必答齐备（落盘锚定沿
  sandbox/项目根锚定纪律、大小限额、类型白名单、零出站结论或请批结论）；
  ③ kb 清单端点契约五要素（路径/入参/出参/错误码/样板指针 capabilities.ts）
  成文；④ BK-0047 边界切割写死（DEFS combo options 动态化归 BK-0047 修宪轮
  消费 issue#6 批复，本链零 shared 改动）；⑤ 嵌入实现选型（本地 vs 外部
  API）结论与出站判定成文。
- **AC4 · 定界回写 VERBATIM 一致**：When 核对 BACKLOG BK-0019 行备注与 ADR
  定界回写索引节，Then 受影响文件清单/验收命令口径/实施序/晋升条件（= 本项
  CLOSE 且（若推荐案定新依赖/出站）对应 needs-approval 获批）与 ADR 字面
  一致（BK-0027 VERBATIM-OK 标准），且旧锚点 nodes.ts:41 已刷新为
  nodes/retrieval/node.ts:17-22；回写随归档提交（产品提交仍恰 1 路径）。
- **AC5 · 白名单与零代码机器证明**：When `git show --numstat <产品提交>` 与
  `git diff` 核对，Then 产品提交恰 `docs/adr/0020-*.md` 一路径纯新增
  （+N/−0）；`git diff -- apps packages tools tests .github package.json
  package-lock.json` 恒空；`package-lock.json` 零变化（零依赖证明）。
- **AC6 · 纯回归面全绿**：When `npm run build` + `npm run gate` + `npm test`
  + `npm run smoke:server` 执行，Then 全部 exit 0——gate 20 场景 diffPx=0、
  契约测试 30/30、smoke 157 passed / 0 failed（0057 基线，本轮零代码理论零
  漂移，任何红即环境异常回滚不硬闯）；s3-library 本机采样抖动预案（diffPx≈23
  形态，0037~0052 在案）：rerun 处置、CI 为权威、**绝不 gate:update 消费**
  （issue#12 纪律）。
- **AC7 · 指针抽样可开**：When 从 ADR 引用的代码/文件指针抽样 ≥5 条逐一打开，
  Then 全部命中无误（建议抽样：nodes/retrieval/node.ts:17-22、kb.ts:1-40、
  handlers.ts:40、store.ts（wc -l 400）、capabilities.ts（64 行）、BACKLOG
  BK-0019/BK-0047/BK-0060/BK-0063 行、ROADMAP.md:161-165 与 :210-211、
  ADR-0014 附录 A 样板、ADR-0016 §3.0 锚定纪律——任五以上）。

## 非功能要求

1. 行数预算：ADR ≤400 行（唯一新增文件，符合 AGENTS.md 硬性约定 4；建议
   280±60）。
2. 零新依赖 / 零新 env / 零新出站 / 零 shared 契约 / 零 UI 接触 / 零 golden
   接触（POLICY 自主区「文档与实现同步」；lock 零变化为机器证明）。
3. ADR 状态行标注纪律：「草案 · 待实施轮消费（BK-0019——实现轮）」；（若
   成立）附录 A 位「待用户批准」——两态均不写「已批准」（附录获批与否的
   回写留 BK-0019 链各轮 CLOSE，ADR-0014 先例）。
4. EOL 纪律：新文件 LF、无 BOM。
5. 回滚 = `git revert` 单提交（纯文档，无迁移面）。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| ADR 越界预支实现（写成 DDL 终稿 / 端点代码堆砌） | 定界粒度锚定 ADR-0015/0016 草案级（选项+利弊+推荐+文件清单+验收口径）+「不预写终稿代码块」纪律（BK-0035/0045 先例）；BUILD 期零代码边界由 AC5 机器证明 |
| 推荐案定新依赖/出站而附录 A 缺席（实现轮裸奔触需批准区） | AC1/AC3 必答：推荐案若涉新依赖/出站，附录 A 五要素草案（沿 ADR-0012/0014 附录样板）随 ADR 成文；BACKLOG 晋升条件（AC4）锁死「获批前 BK-0019 零实现」 |
| ADR 编号二次撞号（BK-0063 已预告占 0019） | 取 0020 + BUILD 期 `ls docs/adr` 复核空号；BK-0063 处置时序倒转则按落盘时序顺延（ROADMAP 机制提案在案，ADR-0015 §5 场景号同构） |
| store.ts 400 行贴线下实现轮直接加表 | ADR §6 拆分评估成文为 BK-0019 实施前提（自有仓储 vs 先拆分扩表两案利弊，0055 pty_audits 自有仓储先例入参） |
| 上传承载面遗漏安全纪律（任意路径落盘/无限额/越沙箱） | ADR §4 必答：sandbox/项目根锚定（AGENTS.md 硬性约定 3 + ADR-0016 §3.0）+ 大小/类型限额 + 零出站或请批结论写死 |
| BK-0019 行旧锚点（nodes.ts:41）误导实施轮 | 本 PRD 已按 NDP 现状转写；ADR 采用现状锚点，AC4 回写同步刷新 BK-0019 行 |
| 嵌入选型只写存储不写嵌入实现（半截选型） | 本 PRD 背景第 5 点已将嵌入实现选型立项为 ADR 必答项（AC3-⑤），与存储三案正交组合给统一推荐 |
| s3-library 本机采样抖动假红 | rerun / CI 权威处置，禁 gate:update 消费（issue#12 纪律，0050~0052 先例） |

## 需求清单（REQ-0060-xx）

- REQ-0060-01：ADR-0020 草案落盘（八要素 + 草案标注 + 状态行语义，AC1）。
- REQ-0060-02：存储三案 + 嵌入实现选型定界（每案五要素 + 推荐 + 需批准面
  结论，锚点逐条可核，AC2）。
- REQ-0060-03：管道四段 + 上传安全必答 + kb 清单端点契约 + BK-0047 边界
  切割成文（AC3）。
- REQ-0060-04：BK-0019 行 BACKLOG 定界回写 VERBATIM（含锚点刷新与晋升条件
  细化，AC4）。
- REQ-0060-05：边界不变式——产品提交恰 docs/adr/0020-*.md 一路径、零代码
  零依赖零 shared 零 UI 零 golden（AC5）；全程禁 gate:update。
- REQ-0060-06：纯回归面全绿 + 指针抽样 ≥5（AC6/AC7）；产品提交恰一个
  （Conventional Commits，如 `docs(adr): BK-0060 KB 管道与嵌入存储选型 ADR
  草案 + BK-0019 定界回写`）。

## §7 · SPEC 内嵌定界（S 项免独立 SPEC，skipSpec=true——BK-0031/0035 先例）

> 本节即 SPEC 替代物：BUILD/VERIFY 以本节 + 上文清单/AC 为准；与 CONSTITUTION /
> 代码现状冲突时以 CONSTITUTION > 代码现状 > 本 PRD 为顺位。

**ADR-0020 章节骨架与行数预算分配（建议，总 ~280 行 ≤400）**：

| 节 | 内容 | 行数 |
| --- | --- | --- |
| 头部 + 状态行 + 来源链 | 「草案 · 待实施轮消费（BK-0019——实现轮）」+（若成立）「附录 A 待用户批准」+ W44 治理日拆分溯源 + 零代码零依赖声明 | ~10 |
| §1 动机与现状证据 | T5-M2 语境 + demo kb 三点写死证据（node.ts:17-22 / kb.ts / handlers.ts:40）+ 检索计算面已真实而语料面固定的事实区分 | ~25 |
| §2 嵌入存储选型三案 | SQLite 向量扩展 / 独立向量库 / 纯表扫描；每案数据模型/读写路径/依赖清单/需批准面/迁移回滚五要素 + 推荐案与否决理由 | ~55 |
| §3 嵌入实现选型与出站结论 | 本地嵌入（零出站）vs 外部 embedding API（新出站类别 → 需批准）；与 §2 推荐案组合给统一推荐 | ~30 |
| §4 上传/切分/嵌入/入库管道定界 | 四段各承载文件草案 + 上传安全必答（锚定/限额/类型白名单）+ 切分策略参数草案 | ~45 |
| §5 kb 清单端点契约草案 | 五要素（路径/入参/出参/错误码/样板指针 capabilities.ts）+ BK-0047 消费映射 | ~30 |
| §6 存储承载与 store.ts 拆分评估 | 自有仓储（0055 先例）vs store 扩表先拆分两案 + 行数预算 | ~30 |
| §7 BK-0019 定界回写索引 + 边界切割 | 回写字面模板（供 VERIFY VERBATIM 比对）+ 晋升条件 + BK-0047（DEFS 触 UI）边界切割 | ~20 |
| §8 附录 A 依赖/出站请批草案（或「无需批复」结论） | 五要素自包含（若推荐案需要）沿 ADR-0012/0014 附录样板；零依赖零出站案则明文结论 | ~35 |

**制式约束（§2/§3 逐案必答）**：依赖结论须逐项列 npm 包名与版本区间或「零」；
需批准面结论按 POLICY 需批准区逐条对号（新依赖 / 新出站 / 新 env / shared
契约——KB 链预期零 shared 零 env）；推荐案必须给其余两案的否决理由；管道与
端点只到「文件 + 契约草案」粒度，不写终稿代码。

**验收命令口径（BUILD/VERIFY 执行面）**：`npm run build` + `npm run gate`
（20 场景 diffPx=0 纯回归）+ `npm test`（30/30）+ `npm run smoke:server`
（157 passed / 0 failed 基线零漂移）+ AC7 指针抽样 ≥5 条；产品提交白名单恰
`docs/adr/0020-*.md` 一路径，提交信息 Conventional Commits 单提交。
