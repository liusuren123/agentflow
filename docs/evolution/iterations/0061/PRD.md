# PRD · 迭代 0061 · BK-0045 重试收口轮：BUG-0057-02 注入回显并行多根形态修复（BK-9005 链终轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-28 09:44
> 来源：BACKLOG BK-0045（ui-proposal / **触UI=是 / P0 / M / ready** / 来源 issue#5，
> BACKLOG.md:66）。2026-10-28 05:10 协调者依 0057 终态 failed 将本项翻回 ready
> （重试轮，0033 同径；收窄范围 + 闭环矩阵 + 熔断提示三件定界随行）。
> 定界权威：BACKLOG BK-0045 行「2026-10-28 协调者翻回 ready」段——重试范围收窄为：
> ① BUG-0057-02（注入回显并行多根形态）修复；② iterations/0057 矩阵 C/D 各 ≥2 轮
> 全绿闭环；③ 补全 0057 迭代目录机制件（PRD/SPEC/JOURNAL/REPORT 未随分支提交，
> MERGE.md §1 留痕在案）。
> 授权链：issue#5 批复承继 2026-10-23T15:49:06Z + ADR-0014（修宪轮）；issue#14
> 用户批复在案（node-pty + @xterm/xterm ^6.0.0 + env×4 + 残余风险知悉），其关单
> 同留本链终轮（BK-0044 行「issue#14 关单同留本链终轮（BK-0045）」在案）。
> 批次编排：**单迭代终轮（重试收口）**——itemContinues=false；done 即 BK-9005 链
> 闭合：issue#5 与 issue#14 **双关单**（回执归脚本 CLOSE）。M 级修宪轮 →
> skipSpec=false（SPEC 必须独立成文）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-28 09:36~09:44 核实）

- **占位互斥核查（只读）**：`.zcode/locks/items/` 空目录（本会话 `ls` 亲核）+
  `git worktree list` 亲核唯一在途工作树 = feat/0061-iter（本路）→ **BK-0045 无
  占位冲突，可选**。占位目录的获取归工作流脚本（本轮派发未授权写主干 `.zcode/`，
  按「不碰主干目录」纪律仅核查不代建）。
- **① 批复同步**：档案「approved：无；rejected：无」→ 本轮零动作（无建行、无
  转 ready 门槛解除、无 skipped 改写）。issue 面板四项均 needs-approval 无新批复：
  #14（PTY 依赖批复已消费，关单留本链终轮）、#12（CI 像素门禁 s3 亚像素抖动——
  golden/CI 需批准射程，0045~0052 同判不自主处理）、#6/#5（修宪授权链已承继
  消费中，关单留各链终轮）。
- **② user-request**：档案无 user-request 条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 无 skipped 改写。
- **④ 常规选题（本轮入选路径）**：ready 队列 grep `| ready |` 亲核全表恰 3 项
  （行号实核）——BK-0045（:66，P0/M，issue#5）✅ **入选**；BK-0061（:82，P2/S）、
  BK-0062（:83，P2/M）顺位靠后不选；无 doc 项混入。BK-0045 同时命中优先序①
  （issue#5 批复承继的修宪轮 ready 项）与④最高优先（唯一 P0）；ROADMAP 待办节
  序列 4「BK-9005 链：issue#14 获批 → BK-0044 → BK-0045 终端节点 UI（链终轮回执
  #5）」（ROADMAP.md:212）恰指向本项收口。
- **晋升义务（本轮执行）**：BK-0019（:116）由 proposed 晋升 **ready**——0059
  CLOSE 遗留「晋升条件就此兑现归下轮 PLAN」（BK-0060 终态 done + ADR-0020 §8
  推荐案零反转、四零全落自主区 → 无批复等待项），本轮即承接下轮，晋升备注随本
  轮 BACKLOG 过程改动落工作树。BK-0047 维持 proposed（待 BK-0019 实现块 kb 清单
  端点承载段落地）；BK-0048 维持 proposed（待 BK-0061 CLOSE + env 批复）。
- **重试史三跳核实（本会话 git 亲核，修复起点据此定）**：
  1. **0057 failed**：产品成果已全在主干（合并 810835e + 补录 5d7fcdc；主干复测
     四绿：gate 20 场景 diffPx=0 / test 30/30 / smoke 157/0，MERGE.md §3）；唯
     BUG-0057-02 未竟——修复轮 b442840 的 openPtyStream 读循环防御性加固（整体
     try/catch + 单帧回调隔离 + {t:'error'} 如实呈现）**未除根**：VERIFY 判定
     C/D 形态 2/2 复现（resid2.mjs）、完整 E2E 6/6 失败、同形态 diag 偶过=时序
     敏感高概率（BACKLOG BK-0045 行在案）。
  2. **0058 重试 #1 合并受阻且成果被脚本销毁**：归档提交 882653b 仅 STATE 三行；
     `git log main..feat/0058-iter` 本会话亲核**空输出**（分支零独有提交）——
     0058 产品成果已不存在；0327566「工作流失败路径三修复——0058 成果被脚本
     销毁事故根治」在案（仅改 .zcode/workflows/evolution-iteration.dwf.ts
     +52/−6，`git show --stat` 亲核）。
  3. **0060 重试 #2 预检 stuck 前提证伪复位**：db3c586（STATE 复位 idle，同提交
     主干 20/20 全绿 + CI 绿，判本地突发抖动窗口，重启 BK-0045 重试）；
     feat/0060-iter == db3c586 == main 零独有提交（git log 亲核）——0060 零
     产品工作。
  → **本轮（0061）修复起点 = 主干 HEAD db3c586**：0057 全部产品成果（terminal
  NDP / 面板 / PT 组冒烟 / s19 场景 / 20 场景 golden 基线）已在库，本轮为**在库
  成果上的缺陷修复**，非重做。
- **侦察档案核对**：与 0059 PRD 同判——残缺标记 `tools.ts:5/:138` 为 stub 如实
  降级设计面（ADR-0011 终态）；`package-lock.json:787` base64 哈希偶合；悬挂 run
  探针 `[]` = BK-0011 启动扫尾预期态——均无补题需求；治理日产物心跳不重复采集。
- **与最近 3 次迭代关系**（0056 / 0057 / 0059）：0057 即本项前轮（成果=本轮修复
  对象与基座）；0056（workbench/tree）/0059（ADR-0020 纯文档）零触碰，仅作回归
  面口径引用。

## 结论

**建议做（重试收口轮，选做与否不是问题——熔断线前的最后一次自主修复机会）**：
一句话理由——BK-9005 链唯一未竟验收点（BUG-0057-02 违反 AC3「同一面板可见其
回显」与 AC6 M4 点位的多根形态），服务端三证已排除后端、修复面收窄到前端帧
路由/时序单一焦点；本项已 1 败，本轮再败即触发「连续 2 次同项 failed」熔断置
stuck 交用户（WORKFLOW §5.4）——本轮必须以「确定性复现 → 根因修复 → 闭环矩阵
≥2 轮全绿」的最保守口径执行，杜绝「偶过即过」。

## 触 UI 分类结论

**是——修宪轮重试（reconstitutional=true，机械口径：所选项 ui-proposal /
触UI=是；授权链 ADR-0014 + issue#5 批复承继在案）。** 但本轮修复对象是**运行期
数据流行为**（PTY SSE 帧 → 面板 xterm 的渲染路由），**预期零静态渲染变化、零
golden 接触、gate:update 零消费**：

1. 既有 20 场景（含 s19-terminal-panel-online 与 PTY_ROUTES fixture，gate.mjs
   :488/:503/:565 亲核在库）必须 diffPx=0——修复若波及任一场景像素即属影响面
   扩大，按 BUILD 中止条款处置。
2. 仅当根因定位确需改静态渲染面（DOM 结构 / CSS / 视觉）时，方可按修宪授权
   （ADR-0014 + issue#5）在 SPEC 预写 golden 方案并消费一次 `gate:update`
   ——**预期不需要**；若发生，SPEC 须附 PIXEL 前后对比证据获取方式。
3. UI 三层冻结纪律全程有效：面板交互语义（键入透传 / 停止 / 关闭重开 / 恢复
   回放）零变化。

## 背景：BUG-0057-02 现状与在库证据

**现象**（BACKLOG BK-0045 行 + 0057 归档口径）：run 含并行第二根（如游离
terminal 节点）时，terminal handler 对面板已订阅会话的 agent 注入**回显不在
面板 xterm 渲染**；串行链（trigger→terminal / trigger→delay→terminal）实测
完全正常。

**服务端三证无责**（0057 在案，本轮修复不得无据推翻）：
① `node:done` 输出含「已注入命令 · 回显 21 字」（handlers.ts:342-343 out 组装，
:337-339 agentWrite 返回 echo.length 实测 21 字）；② 独立流订阅者 live 收到
注入帧（pty/session.ts:91-92 broadcast 对 s.subscribers 全量扇出）；③ 原生
curl SSE 完整收流至 run:done。

**前端在库锚点**（本轮会话亲读）：
- `apps/web/src/legacy/app.js:3212` TERM 模块级单例 `{nodeId, sid, term, stream,
  abort}`——面板与流的绑定态全在此；`:3250-3272 termAttach`：先建 xterm 再
  `openPtyStream` 订阅；`:3264-3269` onFrame 路由——`data` 帧写 `TERM.term`
  **判空即静默丢弃**（`if(TERM.term) TERM.term.write(...)`），warn/exit/end/error
  只进状态行；`:3244-3249 termDispose` 置空全部字段。
- `apps/web/src/server-sync.js:86-114 openPtyStream`：fetch + getReader 逐帧
  解析，已含 0057 修复轮加固（读循环 try/catch + 单帧回调隔离 + {t:'error'}）。
- `apps/server/src/handlers.ts:316-345` terminal handler：绑定判活 / 新建 / 
  agentWrite 注入 / 降级路径。
- `apps/server/src/pty/session.ts:232-` agentWrite：origin=agent 权威填写 +
  echoCollectors 回显收集窗口 + s.agentInFlight 单飞约束。

**修复线索**（BACKLOG 定界：聚焦前端已订阅会话的帧路由/时序；「diag 偶过」=
时序敏感高概率）：候选面（不设限，SPEC 轮以根因证据定案）——① `TERM.term`
判空丢弃窗口与多根 run 下节点状态/重渲对流生命周期的交叠（`app.js:3298-3300`
makeNodeEl replaceWith 仅在 openTermPanel 写回分支，但 run 期节点状态类 DOM
操作须复核）；② 面板订阅建立与 run 注入的竞态；③ 多根执行下引擎事件（SSE
run 流）与 pty 流（端点私有流）双通道消费的相互干扰。**服务端不在改动面**，
除非新证据推翻三证——推翻即属影响面扩大，按中止条款升级而非顺手改后端。

## 需求（REQ）与验收标准（Given / When / Then）

### REQ-0061-01 · BUG-0057-02 修复：注入回显并行多根形态（核心）

- **Given**：终端面板已打开并订阅会话 S（绑定于 run 图内 terminal 节点 T），
  且 run 图含并行第二根（判别矩阵 C/D 形态，见 REQ-0061-02）；
- **When**：run 执行，T 的 handler 经 agentWrite 向 S 注入命令（node:done 出现
  「已注入命令 · 回显 N 字」）；
- **Then**：注入命令的回显帧在面板 xterm 渲染（与串行形态 A/B 表现一致），
  面板状态行无 `error/end` 异常态；服务端三证口径不变（broadcast 扇出 /
  echoCollectors / curl 收流）。

### REQ-0061-02 · 判别矩阵重建与闭环（验收基建）

- **矩阵定义**（依 BACKLOG 行述**重建**——原 0057 REPORT §4.3 矩阵定义随
  0057 工作树丢失：MERGE.md §1 留痕「机制件未随分支提交」，本会话全仓 grep
  `resid2` 零命中亲核；故本矩阵为结构等价重建，SPEC 轮定稿具体图拓扑）：
  - **形态 A（对照，已过）**：trigger → terminal（串行单根）；
  - **形态 B（对照，已过）**：trigger → delay → terminal（串行带中间节点）；
  - **形态 C（复现形态）**：trigger → terminal + **游离 terminal 节点**（不
    连线的第二根，terminal 型）——BACKLOG「如游离 terminal 节点」字面；
  - **形态 D（复现形态）**：并行第二根为**非 terminal** 形态（如
    trigger → terminal 与 trigger → delay 双根并存）——覆盖「并行第二根」的
    另一代表形；与 C 的差异点（第二根类型对复现的影响）须在驱动脚本断言中
    显式化。
- **闭环口径**：修复后 **C/D 各 ≥2 轮全绿**（0057 失败判据「C/D 2/2 复现」的
  同位反转）；A/B 同轮回归不破。
- **时序敏感处置（硬性）**：驱动脚本须确定性化（等待/轮询边界显式、无裸
  sleep 竞态）；「偶过」不得作为通过依据。若无法稳定复现，须以**高频采样
  ≥10 轮统计口径**（失败率 0 方可判绿）替代，数据留 REPORT。

### REQ-0061-03 · 完整 E2E 链路重建（0057 口径等位）

- **Given/When/Then**：跨矩阵形态（A/B/C/D）各走完整链路——建会话 → 面板订阅
  → run 注入 → **面板回显**（断言点）→ 停止 → 重开恢复回放——六点位全绿
  （0057 期「完整 E2E 6/6 失败」的同位反转）。E2E 驱动脚本为新增测试资产，
  落点与形态（tests/smoke/ 或独立脚本）由 SPEC 定，单文件 ≤400 行。

### REQ-0061-04 · 回归面全绿

- **Given**：修复合入后；**When**：跑全量门禁；**Then**：`npm run build` exit 0
  + `npm run gate` **20 场景 diffPx=0**（golden 零接触、零 gate:update）+
  `npm test` 30/30 + `npm run smoke:server` **157/0**（PT01-PT06 终端组零回退）
  + 交互回归抽查（面板键入透传 / 停止 / 关闭重开 / 恢复回放 / 降级态
  PTY_ENABLED=0 呈现）。

### REQ-0061-05 · 机制件补全（重试轮附加义务）

- **Given**：iterations/0057/ 现仅 MERGE.md + evidence/（本会话 ls 亲核）；
- **When**：本轮 BUILD/VERIFY 产出时；**Then**：补录 iterations/0057/{PRD,
  SPEC,JOURNAL,REPORT}.md 四件——每件头部显著标注「**补录（2026-10-28 ·
  迭代 0061 重试轮代录）· 原件随 0057 工作树丢失（MERGE.md §1 留痕）**」；
  内容仅依在库证据重建（BACKLOG BK-0045 行述 / 0057 MERGE.md / evidence/ 六
  日志四截图 / b442840 提交说明），**无据处如实标「不可复原」，禁止杜撰**。
- 本轮 0061 自身四件套（PRD 本件 + SPEC/JOURNAL/REPORT）正常产出。

### REQ-0061-06 · 改动面纪律（受影响文件预期清单——SPEC 轮定稿）

- **预期受影响文件**：
  - `apps/web/src/legacy/app.js`（TERM 面板段 ~:3200-3333——帧路由/时序修复
    主战场）；
  - `apps/web/src/server-sync.js`（openPtyStream :86-114，如根因在读循环侧）；
  - `tests/`（判别矩阵 + E2E 驱动脚本新增，落点 SPEC 定）；
  - `apps/server/**` 仅当新证据推翻三证（**预期零改动**——改服务端须先在
    JOURNAL 留推翻证据链）；
  - `docs/evolution/iterations/0057/`（机制件补录 ×4）。
- **零新增面**：零新依赖（@xterm/xterm ^6.0.0 已在库）、零新 env、零 shared
  契约改动、零新端点、零 CSS/DOM 静态改动（REQ-0061-04 的 gate 零波及即机器
  证明）。

## 风险与熔断

1. **熔断线（最高风险）**：本项已 1 败（0057），本轮再败 →「连续 2 次同项
   failed」熔断（WORKFLOW §5.4）→ 置 stuck 交用户。BUILD/VERIFY 全程按最保守
   口径：先确定性复现（稳定红）、后修复、后 C/D ×2 绿；根因证据链（修复前后
   对比）必须留 JOURNAL。
2. **时序缺陷的「假修复」风险**：0057 修复轮防御性加固后 BUILD 期一度 4/4 绿、
   VERIFY 期 6/6 败——本轮不以单轮绿判过，以矩阵 ×2 + E2E 全绿判过；驱动脚本
   的稳定性本身是交付物（复现不稳定 = 验收基建未达标）。
3. **影响面扩大中止条款**：根因若指向需改服务端契约 / 静态 UI 面 / shared——
   立即中止，item 置 pending-approval/blocked，本迭代按回滚处理（WORKFLOW §4
   BUILD 条款），escalate 交用户。
4. **主干并发**：本轮与 0059 后主干无分叉（起点 db3c586 = origin/main，git
   亲核）；合并冲突风险低。

## 里程碑与回执

- **done**：BK-9005 链闭合（BK-0043/0044/0045 三段全收口）→ **issue#5 关单 +
  issue#14 关单**（双关单，回执归脚本 CLOSE）→ ROADMAP 待办节序列 4 收口；
  BK-0046~0049 中 BK-0047 仍待 BK-0019 实现块（本轮已晋升 ready）。
- **failed**：熔断置 stuck，成果与证据留档交用户裁决（不再自动重试）。
