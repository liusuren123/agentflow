# PRD · 迭代 0065 · BK-0047 BK-9006 子项·retrieval kb 参数动态化：combo 选项由后端 kb 清单端点供数（修宪轮）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-28 21:24
> 来源：BACKLOG BK-0047（ui-proposal / **触UI=是** / **P0 / S** / 本轮 PLAN 轮
> 晋升 ready / 来源 **issue#6**，BACKLOG.md:68）。**修宪轮**——授权链 =
> issue#6 用户批复承继（2026-10-24 在案，BACKLOG 待批准区记录「#6 终获批复 →
> BK-9006 建行入主池 ready P0」；BK-9006 行批复承继口径；BK-0049 行 gh 留档
> 批复时间戳 2026-10-24T08:38:51Z 沿 BK-0050 先例）。
> **晋升依据（本会话亲核）**：前置 BK-0019 已终态 done（迭代 0064，合并
> 5c1627c，BACKLOG.md:116）——GET /api/v1/kb 在主干存活：`apps/server/src/
> server.ts:292` `app.get('/api/v1/kb', kbListHandler)`（本会话亲核）+
> `apps/server/src/kb/routes.ts:3` 头注自证「GET /api/v1/kb → kb 清单（恒 200
> 只读供数，**BK-0047 供数源**…）」；行内「至少其 kb 清单端点承载段落地」实施
> 顺序约束就此解除，「晋升条件=BK-0019 落地后随链晋升」兑现——本轮 PLAN 轮
> 晋升 ready 并入选（先例：BK-0046·0038 / BK-0049·0039 / BK-0045·0056 同径
> 「PLAN 轮晋升 ready 并选为本轮项」）。
> 主题归属：ROADMAP T5·智能体运行时与工作台 · T5-M3 工作台 UI 系列（BK-9006
> 参数扩展杂项链子项；ROADMAP.md:166-169、待办节 5「BK-9006 收官」）。
> 批次编排：无——单项单迭代（S 级）。**S 项但触UI=是——修宪轮 SPEC 豁免不
> 适用（WORKFLOW §4「S 项（非 doc、非触 UI）可免独立 SPEC」反面），
> skipSpec=false**：受影响文件清单终稿、golden 场景增量与受波及重录清单、
> 供数链实现形态、手动 E2E 点位均归实施 SPEC。
> 回执口径：sourceIssue=**6**；**itemContinues=true**——issue#6 名下姊妹子项
> BK-0048 未竟（前置 BK-0020 仍 proposed），本轮 done 仅进度回执不关单，
> issue#6 关单留 BK-9006 末项 CLOSE（BACKLOG BK-9006 行关单口径）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-28 21:17~21:24 核实）

- **跨迭代续选**：无——0056（BK-0042 done·BK-9004 链终）/0057+0061（BK-0045
  终态 done·BK-9005 链闭合，用户授权 A 案收口）/0059（BK-0060 done）/
  0064（BK-0019 done）均已归档（近 3 迭代目录 0059/0061/0064 本会话列目录
  亲核：四产物 + evidence/ 齐备）。
- **① 批复同步**：档案「approved：无；rejected：无」→ 本轮零新批复动作（无
  建行、无新门槛解除、无 skipped 改写）。issue 面板两项均 needs-approval：
  #12（CI 像素门禁 s3 亚像素抖动——golden/CI 需批准射程，0045~0061 多轮
  同判不自主处理，按 issue#12 纪律处置抖动）；#6（修宪授权链承继消费中，
  本轮即其消费——非新批复，关单留末项）。
- **② user-request**：档案无 user-request 新条目 → 无建行、无 uiIssueNumbers。
- **③ rejected**：无 → 无 skipped 改写。
- **④ 常规选题（本轮入选路径）**：ready 队列逐项处置（本会话 `grep -n
  "| ready |" docs/evolution/BACKLOG.md` 亲核，**ready 恰两项**）——
  - BK-0061（BACKLOG.md:82，P2/S，T5，BK-0020 拆分 SPEC 先行纯文档轮）——
    不选：P2 低于本轮晋升项；SPEC 文档轮让位修宪链功能项（「功能优先」
    指示下 BK-0019 行 2026-10-28 晋升注同径先例）；
  - BK-0062（:83，P2/M，T5，BK-0014 拆分 SPEC 先行纯文档轮）——不选：同上；
  - **BK-0047（:68，P0/S，issue#6）——✅ 晋升 ready 并入选**：属 WORKFLOW
    §4 优先序①「用户 issue 批复产生的 ready 项（修宪轮）」范畴（issue#6
    拆分链 BK-9006 子项，批复承继在案）；P0 高于队列全部 P2；晋升条件
    （BK-0019 done + kb 清单端点落地）本会话逐项亲核兑现（见头部）；占位锁
    `.zcode/locks/items/` 亲核为空、无在途占用（`ls` 输出空，exit=0）；
    类型 ui-proposal 非 doc；无熔断记录（本项零失败史）。
- **侦察档案消费（均不构成候选，无补题）**：残缺标记 grep 唯一实质项
  browser stub（apps/server/src/tools.ts:138「not implemented」）系
  ADR-0011 评估终态（维持 stub 如实降级），0041/0045/0046/0047/0050/0051/
  0059/0064 连续同判不立项（package-lock.json:787 系 integrity 串内 XXX
  假阳性）；悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系治理日
  产物，心跳不重复采集。
- **NOT-selected 项零触碰**：BK-0061/0062 状态与备注本轮不改写。

## 结论

**建议做（本轮入选，P0 修宪轮）**——理由一句话：BK-0019 已把 kb 真实清单
端点送上主干、三固定名 combo 已成「数据源失真」的最后一环，BK-0047 以
S 级成本把属性面板换到真实供数源，兑现 issue#6 修宪链倒数第二子项，且为
BK-0048（链末项）清场。

## 触UI 分类结论（必答）

**触UI=是——修宪轮（宪法第 3 条变更；授权已在案，本 PRD 不构成新授权）。**

- 触及层：**结构层**——retrieval 节点属性面板 kb combo（widget 行）的选项
  数据源由「shared DEFS 写死三固定名渲染链」改为「服务端 GET /api/v1/kb
  运行时供数」（属性面板 DOM 呈现内容随服务端清单变化）；选项集合变化即
  **视觉层**呈现内容变化（下拉项文本/条数）。
- 授权链：issue#6 用户批复承继（2026-10-24T08:38:51Z 在案，BK-9006 拆分五
  子项逐项消费中——BK-0046/0049/0050 已按同链落地关账）。
- golden 影响（修宪轮双通道，方案归实施 SPEC）：**新场景 golden-created**
  （retrieval 属性面板 kb combo 在线态，场景编号按落盘时序，预期 s20+）+
  **受波及既有场景修宪轮重录**（哪些既有场景呈现 retrieval 属性面板由
  SPEC 逐场景核对枚举；若零波及则如实记录零重录）；`npm run gate:update`
  仅允许在波及重录确需时、授权链内消费并全程留痕（先例：0054 s16 / 0056
  s16·s17 波及重录恰一次；0056 P1 教训——重录变更集必须收敛恰枚举口径，
  全量重写实得超枚举即 git checkout -- 恢复 HEAD 字节）。
- **reconstitutional=true**（触UI=是·修宪轮：门禁失败时脚本允许一次
  gate:update 重录，宪法第 3 条通道在案）。
- shared DEFS 冻结面处置方向（终裁归 SPEC）：**优先案=零 shared 改动**——
  DEFS 三固定名 options 原样保留为离线回退集，运行时由服务端清单覆盖
  （迭代 0039 caps 勾选清单换源同构先例：离线回退集逐字保留 + SVR 供数
  刷新）；且 BK-0019 seed 已把三固定名做成真实在库 KB，回退集与真实库
  语义一致、无失真。若 SPEC 裁定必须改 `packages/shared/src/nodes/
  retrieval/node.ts` options（DEFS 变更），属 POLICY 需批准区——issue#6
  修宪批复射程已含本子项「combo 选项由后端 kb 清单端点供数」，BK-0047 行
  亦预写「packages/shared/.../node.ts（若参数形态变更）」，授权面成立；
  但仍须同步守卫期望表（nodes.baseline.json / defs-drift）并在 SPEC 留痕。

## 背景与现状证据（本会话逐项亲核，非转抄）

1. **combo 三固定名写死**：`packages/shared/src/nodes/retrieval/node.ts:17-22`
   （本会话亲读）kb 参数 `widget: 'combo'` options 三固定名「产品手册 v2.3 /
   FAQ-售前 / 工单历史 2026」+ default『产品手册 v2.3』——用户在建新检索
   节点时只能从这三项选择，无法感知服务端真实 KB 集合。
2. **真实清单端点已在主干**：BK-0019（迭代 0064 done）落地
   `GET /api/v1/kb`（server.ts:292 注册，kb/routes.ts 承载，出参契约级
   `{ kbs: [{name, docs, chunks, updated_at}] }`，ADR-0020 §5）与上传管道
   `POST /api/v1/kb/:name/documents`；kb 五模块 chunk/embed/store/seed/
   routes 各 ≤400 行在库（本会话 `ls apps/server/src/kb/` 亲核）；seed
   已把三固定名播种为真实 KB——写死选项从「demo 失真」转为「真实子集」，
   但新上传库对前端不可见，缺口仍在。
3. **直系同构先例（方案蓝图）**：BK-0049 caps 动态化（迭代 0039，ADR-0018）
   ——`GET /api/v1/capabilities` 只读供数端点 + app.js 勾选清单换源
   （**离线回退集逐字保留**）+ server-sync.js 数据面（SVR 缓存 + 回调）+
   s15 golden-created 新场景；本项与其四点同构（只读清单端点→combo 换源→
   server-sync 数据面→新 golden 场景），差异仅在消费 widget（勾选清单 vs
   combo 下拉）与是否回写。
4. **server-sync 数据面边界**：ADR-0006——server-sync 不操作面板 DOM，
   只供数据（wbGit/wbTree/caps 数据面先例）；combo 供数链 = app.js 消费
   server-sync 数据渲染，边界不变。
5. **检索语义面（零漂移硬边界）**：BK-0019 已保证「既有工作流取值语义
   不变」——三固定名 seed 等价检索 18 组零漂移 + smoke KB01-KB11
   （主干冒烟基线 168/0）；本项只动「选项从哪来」，不动「选中后怎么检索」
   （handlers retrieval 链、kb.ts 索引零改动预期）。
6. **既有 gate 面**：现 20 场景 s0~s19（s19-terminal-panel-online 为
   最新，迭代 0061 收口）；主干复测基线 build ✓ / gate 20 场景 diffPx=0 /
   npm test 30/30 / smoke 168/0（metrics 0061/0064 行在案）。

## 目标与范围

一句话目标：retrieval 属性面板 kb combo 的选项由后端 `GET /api/v1/kb`
真实清单供数（运行时刷新、离线回退三固定名），既有检索行为零漂移，
兑现 BK-9006 链第 4/5 子项。

### 功能需求（REQ-0065-xx；定界承 BK-0047 行备注列，终稿归 SPEC）

- [ ] **REQ-0065-01 供数链（前端）**：选中 retrieval 节点时，属性面板 kb
      combo 选项自服务端 kb 清单渲染（清单随 server-sync 数据面刷新；
      0039 caps 同构）；选项集合 ⊇ seed 三固定名 + 已上传新库，与服务端
      GET /api/v1/kb 返回一致。
- [ ] **REQ-0065-02 离线回退**：/api/v1/kb 不可达（离线/降级）时 combo
      回退呈现 DEFS 三固定名（离线回退集逐字保留，0039 先例；服务在库
      形态下三固定名恒为真实 KB，回退无失真）。
- [ ] **REQ-0065-03 server-sync 数据面**：kb 清单缓存 + 刷新回调
      （ADR-0006 边界：只供数据不碰面板 DOM；caps SVR.caps 先例同构）。
- [ ] **REQ-0065-04 shared 面处置**：优先零 shared 改动案（见触UI 结论）；
      若 SPEC 裁定需改 node.ts options，则同步 nodes.baseline.json /
      defs-drift 守卫期望（修宪授权链在案，SPEC 留痕）。
- [ ] **REQ-0065-05 gate 场景增量（修宪轮）**：新场景 golden-created
      （retrieval 属性面板 kb combo 在线态；路由 fixture 按 GET /api/v1/kb
      契约 mock，HEALTH_FIXTURE/CAPS 先例族）+ 受波及既有场景重录清单
      （SPEC 逐场景核对枚举、变更集收敛恰枚举）。
- [ ] **REQ-0065-06 冒烟扩断言（如有服务端可断言面）**：清单端点已有
      KB01-KB11 承载（BK-0019），本项新增断言仅限「供数一致性」可服务端
      断言部分；纯前端呈现面归 golden 场景 + 手动 E2E，不重复造断言。
- [ ] **REQ-0065-07 手动 E2E 点位（SPEC 定稿）**：选中 retrieval → combo
      显示服务端清单（含新上传库）→ 选新库运行命中入库片段 → 离线回退
      三固定名。

### 不做范围（out of scope，护栏）

- **BK-0048**（on-error 参数，链末项）不在本轮；其前置 BK-0020 仍
  proposed（SPEC 先行 BK-0061 ready 未排）——issue#6 关单留其 CLOSE。
- **检索语义零改动**：handlers.ts retrieval 链、kb.ts 索引/打分、topk/th
  参数、DEFS 默认值均不动（BK-0019 已关账的等价性结论承继）。
- **不做 kb 管理 face**（删除文档/删除库/重建索引端点）——不在 BK-0047
  定界射程。
- **反转护栏（过程护栏 REQ-0065-G1）**：实现中若需 ①新增 npm 依赖
  ②新增出站网络目标类别 ③新增环境变量语义——**立即中止转 needs-approval
  issue**（POLICY 需批准区；issue#6 修宪批复不自动覆盖依赖/出站/env 面，
  BK-0043→#14 先例明示「父项批复不自动覆盖」），获批前零实现。
- **golden 纪律**：s3-library 本机亚像素抖动按 issue#12 口径处置（diffPx
  21~23 区间、DOM 不变量逐键全等、CI 权威）——**不消费 gate:update 重录
  抖动**；gate:update 仅用于本项波及重录且变更集收敛恰枚举。

### 用户故事

- US-1（工作流作者）：我上传了一个新知识库——打开 retrieval 节点属性面板，
  下拉里直接能看到并选到它，不用改代码或猜库名。
- US-2（既有工作流用户）：我的工作流用「产品手册 v2.3」——下拉里它还在、
  运行结果与之前完全一致，零迁移成本。
- US-3（离线/降级用户）：后端不可达时编辑器仍可用——kb 下拉回退三固定名，
  不出现空白或报错弹窗。

## 非功能要求

- **安全**：供数源为既有只读端点（恒 200 只读，BK-0019 已承载）；前端零
  新出站；零新依赖、零新 env（反转护栏 G1 在案）。
- **性能**：清单为启动期索引派生只读（capabilities 同构，O(库数)）；combo
  刷新随属性面板打开时机，不引入轮询。
- **等价性（最高优先验收面）**：三固定名检索行为零漂移（BK-0019 seed 等价
  基线承继）；既有 smoke 168 断言 + 契约 30 断言零回退。
- **文件规模**：新增源文件各 ≤400 行（AGENTS.md 硬性约定 4）。
- **宪法面**：改动收敛于供数链与属性面板渲染数据源；骨架/画布/交互语义
  零触碰；golden 变更集收敛可枚举。

## 验收标准（Given/When/Then；VERIFY 逐条执行）

- **AC1 供数正例**：Given 服务已启动且 kb 清单含 seed 三固定名 + 已上传新库
  N，When 选中画布 retrieval 节点展开属性面板，Then kb combo 选项集合与
  GET /api/v1/kb 返回的 kbs 名称集合一致（N 在列）。
- **AC2 离线回退**：Given /api/v1/kb 不可达，When 展开 retrieval 属性面板，
  Then combo 呈现 DEFS 三固定名回退集，无空白态、无报错弹窗。
- **AC3 检索零漂移**：Given 既有工作流 kb=『产品手册 v2.3』，When 运行，
  Then 检索命中与 BK-0019 后基线一致（seed 语料等价），smoke KB01-KB11
  零回退。
- **AC4 新库可选可检索**：Given 已上传新库 N，When 属性面板选 N 并运行
  retrieval，Then 命中 N 的入库片段（检索链语义不变）。
- **AC5 契约守卫**：When `npm test`，Then 30/30 全绿——零 shared 案下
  nodes.baseline.json 字节不变（nodes-dirs/defs-drift/synthesis 守卫全绿）；
  若 SPEC 采 DEFS 变更案则守卫期望表同步且断言全绿（授权链留痕）。
- **AC6 门禁（修宪轮双通道）**：When `npm run build` + `npm run gate`，
  Then gate 全绿——新场景 golden-created + 受波及场景重录（恰 SPEC §golden
  枚举清单、变更集收敛可枚举、全程留痕）+ 非波及场景零波及实测；
  s3 抖动按 issue#12 纪律、CI 权威。
- **AC7 冒烟零回退**：When `npm run smoke:server`，Then 既有断言零回退
  （基线 168/0）+ 新增断言（如有）全绿。
- **AC8 手动 E2E**：SPEC §点位逐项走查（AC1/AC2/AC4 的浏览器级复现 +
  交互回归抽查）。
- **AC9 改动面白名单**：SPEC §白名单外路径 diff 恒空（机器证明）；
  golden 变更文件恰 §枚举（0056 P1 教训口径）。

## 依赖关系与实施序

- 前置：BK-0019 done（迭代 0064）——**已兑现，无剩余前置**；授权链
  issue#6 批复承继在案——无批复等待项。
- 实施序：单迭代承载；**S 项但触UI=是 → SPEC 轮跟随（skipSpec=false）**：
  受影响文件清单终稿、golden 双通道方案（新场景定义 + 波及枚举）、
  shared 零改动案 vs DEFS 变更案终裁、供数链实现形态、smoke 断言取舍、
  手动 E2E 点位均归实施 SPEC。
- 验收命令口径：`npm run build` + `npm run gate` + `npm test` +
  `npm run smoke:server` + 手动 E2E（AC8）。
- 解阻下游：本轮 CLOSE 后 BK-9006 链仅余 BK-0048（待 BK-0020 实现块 +
  env 批复）——issue#6 关单留其链终轮 CLOSE。

## 状态与回执

- 来源 issue#6：sourceIssue=6；**itemContinues=true**（姊妹子项 BK-0048
  未竟——本轮 done 仅发进度回执，issue#6 不关单）。
- **reconstitutional=true**（修宪轮：触UI=是，issue#6 批复授权链在案，
  gate 失败时允许一次波及重录）。
- STATE：item=BK-0047、phase=PLAN（随本 PRD 落盘）。
- BK-0061/0062（本轮未选）状态与备注零触碰，留后续 PLAN 轮。
