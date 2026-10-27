# JOURNAL · 迭代 0059 · BK-0060 KB 管道后端嵌入存储选型 SPEC 先行（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-28 07:24
> 输入：`PRD.md`（S 项 skipSpec=true——§7 内嵌定界即 SPEC 替代；REQ-0060-01~06 /
> AC1~AC7；触UI=否、纯文档轮、全程禁 gate:update）。
> 本轮零代码 / 零依赖 / 零 env / 零出站 / 零 shared 契约 / 零 UI / 零 golden：
> 未对 `apps/**`、`packages/**`、`tests/**`、`tools/**`、`.github/**`、根/子包
> package.json / package-lock.json 执行任何写操作（全程只读核实代码锚点）。
> 完整门禁（build / gate / test / smoke:server）与 git 提交由脚本统一执行，BUILD
> 未自行运行。STATE.md 已按派发指令更新：`phase: PLAN → BUILD`、
> `updated: 2026-10-28 07:24`（last_result 保持 PLAN 结论不代写）。

## 1. 改动清单（产品提交面 = AC5 白名单一路径；BACKLOG/STATE/JOURNAL 为机制件）

| 文件 | 净改动 | 改动内容 |
| --- | --- | --- |
| `docs/adr/0020-kb-pipeline-embedding-storage.md` | **纯新增 288 行**（≤400 硬性上限达成、在 PRD 建议区间 280±60 内；UTF-8 无 BOM、纯 LF，od/CR 计数亲核） | 八要素成节（PRD AC1 逐项，分节行数 awk 亲核）：头部状态块（:2 状态行 =「草案 · 待实施轮消费（BK-0019——实现轮）」；推荐案四零全落自主区故无 0014 式「待用户批准」位；全文「已批准」计数 0）+ 显著声明（零代码零依赖零 env 零出站零 shared 零 golden + 不预写终稿 DDL/代码块纪律 + 反转护栏）→ §1 动机与现状证据（demo kb 三点写死 / 计算面已真实语料面固定的事实区分 / kbNames 零消费 / 存储承载先例 / 端点与上传承载样板，五条 32 行）→ §2 嵌入存储三案（案 a SQLite 向量扩展 / 案 b 独立向量库 / 案 c 纯表扫描——**推荐**，每案数据模型·读写路径·依赖清单·需批准面·迁移回滚五要素齐备；§2.4 推荐与否决理由，62 行）→ §3 嵌入实现选型（L1 本地词法——**推荐** / L2 本地稠密模型 / L3 外部 embedding API——新出站类别，三路对照表 + 与 §2 案 c 组合统一推荐，20 行）→ §4 管道四段定界（§4.1 上传段含安全必答四项 + multipart 不采写死 + 错误码 / §4.2 切分 / §4.3 嵌入 / §4.4 入库与 kb.ts 检索面改造，63 行）→ §5 kb 清单端点契约（五要素表 + BK-0047 消费映射与边界切割写死，20 行）→ §6 存储承载两案（案甲 kb 自有仓储——**推荐**（pty/audit.ts 直系先例）/ 案乙 store.ts 扩表先拆分——否决，18 行）→ §7 回写字面量（单段 ```text 权威字面量 1919 字符 + 晋升条件 + BK-0047 边界切割，12 行）→ §8 无需批复明文结论 + 反转预案（ADR-0014 §6 五要素形态参照）+ 不做范围（25 行） |
| `docs/evolution/BACKLOG.md` | 1 行备注列原地替换（随归档提交；`git diff --stat` = 1 file / +1/−1 亲核） | BK-0019 行（:116）备注列替换为 ADR §7 代码块字面量**逐字粘贴**（node 程序化提取回写 + 独立脚本复检 VERBATIM OK，见 §4；旧备注 269 字符 → 新 1919 字符）；其余列（状态 `proposed`、来源 `T5`、类型/优先/大小）逐字不动（字段校验输出亲核）；BK-0060/BK-0061/BK-0062/BK-0063/BK-0047 行未触碰（状态流转归脚本/CLOSE；BK-0060 置 done 归 CLOSE 记账） |
| `docs/evolution/STATE.md` | 过程态两字段（机制件） | `phase: PLAN → BUILD`、`updated: 2026-10-28 07:24`（派发指令要求面，其余字段不动） |

## 2. PRD 内嵌定界 vs 代码现状复核（BUILD 义务；「矛盾即中止」未触发）

复核方法：PRD 背景/AC2/AC7 全部指针本会话 Read / grep / wc / ls / od 逐一
亲核。**结论：技术结论与代码现状零矛盾、零杜撰，无需中止；一处锚点粒度
差异按 PRD 口径统一（§3.1），一处两分法细化为三路（§3.2）。**

命中的指针（超出 AC7 下限 ≥5 条，全部命中）：

- `packages/shared/src/nodes/retrieval/node.ts`（27 行）：:17-22 kb 参数块
  （:17 参数行起、:19-21 三固定名 options、:22 default '产品手册 v2.3'）✓；
- `apps/server/src/kb.ts`（98 行，wc 亲核）：:1-5 头注（「三个知识库与前端
  下拉一致」「确定性真实计算（非随机模拟）」）✓、:7-40 KB 常量三库
  （产品手册 v2.3 12 条 / FAQ-售前 8 条 / 工单历史 2026 6 条 = 26 条，逐行
  点数）✓、:43-54 terms() bigram 切词 ✓、:56-78 启动期 TF-IDF 索引 ✓、
  :81-96 retrieve() 余弦检索 ✓、:98 kbNames() 导出——**全仓 grep 零调用方**
  （apps/packages/tests/tools 仅定义与 dist 产物命中）✓；
- `apps/server/src/handlers.ts:40-53` retrieval handler（两级阈值 ×4 归一化
  + 节点阈值过滤）✓；
- `apps/server/src/store.ts` **恰 400 行**（wc 亲核，贴线坐实）+ DDL 块
  :62-110（workflows/runs/run_events/sessions/messages/approval_audits 六表）✓；
- `apps/server/src/capabilities.ts` **64 行**（wc 亲核）+ :54-55「恒 200（只读
  派生无 4xx/5xx 路径）」注释 ✓——§5 错误码口径依据；
- `apps/server/src/server.ts`（314 行）：:75 `express.json({ limit: '4mb' })`
  ✓、:244-273 v1-only 注册先例族（ADR-0005「新端点仅注册 v1」注释在 :244）✓、
  :261 capabilities 注册 ✓；
- `apps/server/src/tools.ts`（175 行）：:16 SANDBOX 模块级常量锚定 ✓、:18-22
  safePath（resolve 归一后前缀校验）✓、:33 沙箱专用 mcp-sqlite.db（第二库
  先例）✓、:36-37 SQL_DENY / SQL_DENY_FN（load_extension 明示拒绝面）✓；
- `apps/server/src/pty/audit.ts:1-60`：pty_audits 自有仓储（同库
  data/agentflow.db 第二 better-sqlite3 连接、busy_timeout=2000、DDL 收敛
  自有模块、store.ts 零改动——0055/BK-0044 SPEC D1）✓——§6 案甲直系先例；
- `apps/server/package.json`：better-sqlite3 ^12.11.1 / express ^5.0.0 /
  ai ^7.0.0 在树亲核 ✓——§2.3 案 c「零依赖」与 §8 结论的依据；
- `docs/ai-sdk-7-功能汇总.md:37/:79`：embed/embedMany 为 ai@7 树内既有面 ✓
  ——§3 L3 依赖列「零新增 npm 面预期」依据；
- `tests/`（全 .mjs）grep `产品手册|知识库|retrieval` **零命中**（exit 1
  亲核）✓——ADR §4.4「smoke 扩断言为纯新增面」依据；
- `docs/adr/` ls 亲核现行 0001~0018 + **双 0017**（BK-0063 撞号未消解、预告
  改 0019）→ **本 ADR 取 0020** ✓（PRD 背景 9 口径；feat/0058-iter 分支零
  新增 ADR 系 PRD 亲核，本轮沿用其结论）；
- `docs/evolution/BACKLOG.md`：BK-0047（:68，issue#6 承继 +「至少其 kb 清单
  端点承载段落地」实施顺序约束原文）/ BK-0060（:81）/ BK-0061（:82）/
  BK-0062（:83）/ BK-0063（:84）/ BK-9006（:97）/ BK-0019（:116）亲读 ✓；
- `docs/evolution/ROADMAP.md`：:161-165 M2 定义（「retrieval 命中真实入库
  文档」验收原文）✓、:210-211 待办节实施序列 3「T5-M2 SPEC 三连穿插：
  BK-0060 → BK-0061 → BK-0062」✓；
- `docs/evolution/POLICY.md`：需批准区 :25（新增 npm 依赖 / 新增出站网络
  目标类别 / 新增环境变量语义）、自主区 :13-14（apps/server/src/** 后端
  能力演进）✓——§2/§3/§8 需批准面逐条对号依据；
- 先例 ADR：ADR-0014 §6 附录 A 五要素样板（:287-342 亲读）✓、ADR-0015 §7
  回写字面量制式（:236 起，三段 ```text 单行长字面量形态）✓、ADR-0016 端点
  契约草案样板 + §3.0 模块级常量锚定纪律 + 状态行更新先例（ADR-0010/0012）
  ✓。

## 3. 实现期偏差记录

### 3.1 锚点粒度差异统一（BK-0060 行 :19-22 vs PRD/ADR :17-22）

BACKLOG BK-0060 行（:81）证据指针写「node.ts:19-22 三固定名」（options
内层子段）；PRD 背景 2 / AC2 / AC4 与本 ADR 统一采用 **:17-22**（完整 kb
参数块：参数行起 + 三 options + default）。代码事实：:17 参数行、:19-21 三
固定名、:22 default——两锚皆真，粒度不同；按 PRD 口径统一为 :17-22，AC4
回写已同步刷新 BK-0019 行旧锚点 nodes.ts:41 → nodes/retrieval/node.ts:17-22
（回写字面量内明示「行内旧锚点 nodes.ts:41 系 NDP 迁移前坐标，本次刷新」）。
非冲突，记档供 VERIFY 对齐。

### 3.2 PRD 嵌入两分法细化为三路（L1/L2/L3）

PRD 背景 5 钦定两维「本地嵌入（零出站）vs 外部 embedding API（新出站类别 →
POLICY 需批准区）」。本 ADR §3 将「本地」侧细化为 L1 词法（零依赖）与 L2
稠密模型（新依赖 + 权重分发）两形态——避免「本地=零成本」隐含误读，且 PRD
风险表「嵌入选型只写存储不写嵌入实现（半截选型）」对策要求正交组合给统一
推荐，三路对照表为最完备形态。PRD 钦定的出站分类（外部 API → 需批准区）
原样保持，推荐案（L1）与 PRD「纯表扫描 + 本地嵌入（零新依赖零新出站）则
明确无需批复」分支精确对应——§8 走「无需批复」结论，无 ADR-0014 式附录 A
请批草案（其五要素形态仅作 §8 反转预案参照）。

### 3.3 行数预算达成（沿 0028/0029/0030 同类记录）

PRD §7 骨架表预估总 ~280 行；实际 **288 行**（≤400 硬性上限 ✓、280±60 建议
区间内 ✓）。分节 awk 亲核：§1 32 / §2 62 / §3 20 / §4 63 / §5 20 / §6 18 /
§7 12 / §8 25 + 头部声明 28 + 空行若干——与 PRD 骨架预算（§1~25/§2~55/§3~30/
§4~45/§5~30/§6~30/§7~20/§8~35）同量级，§7 实际 12 行（预估 ~20）：单段
```text 字面量 1919 字符为 AC4 逐字比对基准不可压缩，节内说明从简。

### 3.4 其余零偏差

存储三案每案五要素齐备（AC2）、推荐案给其余两案否决理由（§2.4 四点 × 2
案 + 案 c 代价如实声明，AC2）；管道四段每段承载文件草案 + 验收口径草案
（AC3-①）、上传安全必答四项（锚定/限额/白名单/零出站，AC3-②）、kb 清单
端点五要素含 capabilities.ts 样板指针（AC3-③）、BK-0047 边界切割写死
（§5 + §7 字面量双重承载，AC3-④）、嵌入实现选型与出站判定成文（AC3-⑤）；
multipart / pdf 解析 / L2/L3 / 案 a/b 四类反转护栏写死入 §8（PRD 风险表
「推荐案定新依赖/出站而附录 A 缺席」对策的实现形态——因推荐案零反转，附录
A 以「反转预案 + 五要素形态参照」存在，不预开支）。

## 4. 自测与边界核验（文件级；门禁四命令归脚本）

- `wc -l docs/adr/0020-kb-pipeline-embedding-storage.md` → **288**
  （≤400 ✓、280±60 区间内 ✓）；
- 状态行：`:2` =「草案 · 待实施轮消费（BK-0019——实现轮）」（AC1 逐字）；
  标题 `:1` 含「草案」二字；`grep -c "已批准"` = **0**（非功能要求 3）；
- EOL/BOM：首三字节 `23 20 41`（od 亲核，无 BOM）、`grep -c $'\r'` = 0
  （纯 LF，非功能要求 4）；工作树 EOL 约定核实：仓 core.autocrlf=true、
  index 侧 i/lf（git ls-files --eol 亲核）——新建文件落 LF 与 ADR-0016
  先例一致，BACKLOG.md 回写经 node 脚本**保留 CRLF 工作树形态**（写入前后
  CR 计数 144 不变）；
- **BACKLOG 回写 VERBATIM**：写入用 node 脚本自 ADR §7 ```text 块提取字面量
  （1919 字符，含管道符检查 = 0、单行检查 OK）替换 BK-0019 备注列；另以
  独立脚本复检——ADR 字面量与 BACKLOG 行备注列（split('|') 末非空列）trim
  后全等 → `VERBATIM OK`（长度 1919 = 1919）；其余列字段校验
  `ID=BK-0019 / capability / 否 / P2 / M / proposed / T5` 逐字不动（输出
  亲核）；`git diff --stat docs/evolution/BACKLOG.md` = 1 file / +1/−1，
  `git diff | grep -c "^[+-]| BK-"` = 2（恰一行改写）；
- 产品白名单外零改动：`git status --porcelain` 仅 `docs/adr/0020-*.md` 新增 +
  `docs/evolution/{BACKLOG,STATE}.md` 修改 + `iterations/0059/` 未跟踪（PLAN/
  BUILD 机制件），`apps/**`、`packages/**`、`tools/**`、`tests/**`、
  `.github/**`、package.json / package-lock.json 零出现（零依赖 = lock 零变化
  的机器前置证明，AC5 终判归 VERIFY 于提交后执行）；
- 未运行（归脚本统一执行，本 JOURNAL 不代报）：`npm run build` / `npm run
  gate` / `npm test` / `npm run smoke:server`；`npm run gate:update` 全程
  禁止（非修宪轮，POLICY 禁止区）——未运行、未接触 golden 任何字节。

## 5. 移交说明

- VERIFY 按 PRD AC1~AC7 执行：AC1（恰一文件纯新增 / 288 行 ≤400 / 八要素
  成节可索引（grep ^## 亲核 §1~§8 + §2.1-2.4 + §4.1-4.4）/ 草案标注 /
  状态行语义 / 无「待用户批准」位且「已批准」=0）、AC2（锚点对照零杜撰——
  §2 清单 20+ 条可作抽样池；存储三案五要素 + §2.4 否决理由）、AC3（管道
  四段 + 安全必答四项 + 端点五要素 + BK-0047 边界切割 + 嵌入三路出站
  判定）、AC4（BK-0019 行 VERBATIM——§4 已载程序化比对 OK，VERIFY 复跑；
  旧锚点 nodes.ts:41 已在字面量内刷新为 node.ts:17-22）、AC5（产品提交恰
  `docs/adr/0020-*.md` 一路径 +N/−0 + 禁区 diff 恒空 + lock 零变化）、
  AC6（门禁四命令，脚本侧；s3-library 本机采样抖动预案：rerun / CI 权威 /
  禁 gate:update 消费，issue#12 纪律）、AC7（指针抽样 ≥5 条——§2 清单
  全部本会话亲核命中）。
- CLOSE 注意：BK-0060 置 done（无 issue 回执义务，来源 T5）；**BK-0019 晋升
  条件就此就位** = 本项 CLOSE 且推荐案零反转（纯表扫描 + 本地词法嵌入四零
  落自主区）→ **无批复等待项**，心跳 PLAN 轮可直接晋升；BK-0047 维持
  proposed（待 BK-0019 实现块落地后随链晋升，issue#6 关单留 BK-9006 末项）；
  metrics 行建议记 gate=20 场景 / test=30/30 / smoke=157/0 基线零漂移（AC6
  脚本侧实测值为准）。
- 下轮选题提示（非本轮动作）：T5-M2 SPEC 三连第二位 BK-0062 或第三位按
  ROADMAP :210-211 序列为 BK-0061 → BK-0062（P2/S、P2/M 均 ready 无前置）；
  BK-0063（doc）仍归治理日。

## 6. 修复轮 1 · 门禁 s3-library 红取证与处置（2026-10-28 07:34）

门禁回执（脚本侧 07:29 运行）：s6~s19 全绿（diffPx=0），**1 个场景违宪
✗（差异详见 tests/golden/diff/）**——diff/ 目录恰含 s3-library 三件
（current.png / diff.png / invariants.json，ls 亲核），违宪场景 = **s3-library**
（s0~s5 段输出被截断，但 diff 工件唯一指向 s3）。**取证四步（本会话实跑，
命令与输出逐一在案）：**

1. **DOM 不变量比对**（0039 取证标准②）：`node -e` 深度比对
   `tests/golden/diff/s3-library.invariants.json`（失败帧，07:29 落盘）vs
   `tests/golden/ui/s3-library.invariants.json`（golden 基线）→ **keys equal:
   true · deep equal: true**（view/zoom/8 节点矩形/31 CSS 变量/counts
   8-7-15-15-1/bottomClosed 逐键全等零额外键）；逐字节 cmp 报 byte 2 差异系
   EOL 噪音（失败帧 LF `7b 0a` vs 基线 CRLF `7b 0d 0a`——autocrlf 检出形态
   vs gate 新写形态，od 亲核；内容零差异）。
2. **像素差计量**（0039 取证标准③，同 gate.mjs:640 参数）：node 直调主仓
   node_modules 的 pngjs+pixelmatch（v6.0.0）比对基线与失败帧两 PNG（均
   1600×900）→ **diffPx（threshold:0）= 23**——与 PRD AC6 预案「diffPx≈23
   形态」逐字吻合（0037~0052 在案、issue#12 待批处置对象即此形态）；差异
   像素散点全部聚于 **x 20-28 / y 792-807**（左下角图标栏底缘 ~8×16px 区域，
   坐标枚举亲核）——子像素抗锯齿抖动特征，非结构性渲染差异。
3. **本轮零代码复核**：`git status --porcelain` 恰四项（ADR 新增 / BACKLOG /
   STATE 修改 / iterations/0059/ 未跟踪），禁区 `git diff -- apps packages
   tools tests .github package.json package-lock.json` **恒空**——本轮唯一
   产品文件为 docs/adr/0020-*.md 纯新增（不进 web 构建输入），渲染路径物理
   无涉；`git status --porcelain tests/` 为空——**golden 基线零触碰**
   （无 0039 式 EOL 噪音改动需还原）。
4. **根因裁定**：本机渲染瞬态抖动（环境侧非确定性），与本轮改动无关——
   纯文档轮对 20 场景的输入面零变化，19 场景 diffPx=0 与此结论互证；golden
   权威在 CI（CONSTITUTION 第 2 条 3 款）。

**处置（PRD AC6 预案 + issue#12 纪律，本轮严格执行）**：①**rerun 处置**——
门禁由脚本统一执行（本轮派发明令「不要自行运行门禁」），建议脚本侧重跑
一次 gate（0037~0052 先例：本机瞬态抖动重跑即自愈；重跑仍红则以 CI
windows-latest 为权威判据，不据本机红判 FAIL）；②**绝不 gate:update 消费**
——0039 轮的一次授权消费已用尽且明示「勿再消费」，本轮非修宪轮，golden
任何字节零接触（POLICY 禁止区）；③**零产品改动**——修复轮 productFiles
与首轮完全一致（累积并集口径，WORKFLOW §4），本节为唯一新增产物（JOURNAL
机制件）。

修复轮边界自检：git status 四项不变、禁区 diff 恒空（复跑亲核）；diff/ 目录
工件（gitignored）保留供脚本复核后自行清理。
