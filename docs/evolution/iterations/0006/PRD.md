# PRD · 迭代 0006 · BK-0004 已知陷阱回归用例：portCache 失效场景（节点高度/变换变化后连线贴合）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-22 16:59
> 来源：BACKLOG BK-0004（P2 / test / S / ready / 触UI=否，`docs/evolution/BACKLOG.md:16`）；
> 主题归属 ROADMAP T2·质量基建（`docs/evolution/ROADMAP.md:39`）。非里程碑关账项——T2-M1/M2
> 已分别由迭代 0003/0002 关账（`BACKLOG.md:12-13`），本项是把 AGENTS.md 已知陷阱转化为
> 可执行回归防护的质量加固，选题可追溯至 T2 主题本身。
> 选题依据：ready 队列现存**唯一 1 项** BK-0004（`BACKLOG.md:11-21` 全表核对：BK-0001
> blocked、BK-0002/0003/0006/0007 done、BK-0005/0008/0009/0010/0011 proposed、BK-9001
> 在待批准区 pending-approval）→ 唯一 ready 即最高优先级 ready；大小 S 正合选题规则偏好
> （优先 S/M，无 L 需拆分）。**选取后 ready 队列归零，下次心跳 PLAN 须按 WORKFLOW §4 转
> 「补题」或由治理日补充——已提示协调者（见尾注）。**
> 与最近 3 次迭代零重叠（0003=T2-M1 shared 契约测试、0004=T4-M2 README 同步、0005=T3-M1
> websearch eng 路由，三者承载项与改动面互斥）：本项虽同属 T2 主题，但防护对象不同——
> 0003 锁 `packages/shared` 的 DEFS/事件契约（node:test，纯数据面），本项锁
> `apps/web/src/legacy/app.js` 运行时的画布连线几何（浏览器自动化，交互时序面），改动面
> 为 `tests/` 新目录，互不重叠。

## 结论

**建议做（本迭代即做）**：一句话理由——AGENTS.md 已知陷阱第 2 条「画布端口缓存
（portCache）在节点高度/变换变化后必须 `measurePorts()+updateEdgesOf()`」（`AGENTS.md:69`）
是全仓唯一被写进协作者约定的前端实现陷阱，但今天**没有任何自动化测试锁定它**：该配对
横跨 app.js 16 处调用点（折叠重渲染/拖拽/单节点执行/模拟运行/SSE 回放），任何未来对这些
路径的重构或机械移植都可能无声丢掉一次 `measurePorts`，造成连线与端口脱节的视觉回归——
而 golden 4 场景全是静态定稿态（`tools/pixel-gate/gate.mjs:60-65`，无运行态节点输出、无
折叠切换、无拖拽位移），对此失效模式天生失明。用 Playwright（根 devDependencies 已在位，
`package.json:25`）把「操作后连线端点仍贴合端口中心」固化为可重复断言，纯新增测试文件、
零产品代码改动，S 大小单迭代可完整交付。

## 触 UI 分类结论

**否。** 论证（逐层对照宪法第 1 条三层）：

1. **改动面是纯新增测试资产**：`tests/` 新目录的测试文件 + 根 `package.json` scripts 新增
   1 行（先例 BK-0002 smoke:server，`package.json:19`、`metrics.md:8`）。零改动：
   `apps/**`、`packages/**`、`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、
   CI 配置（`.github/workflows/ci.yml`，WORKFLOW §6 护栏 3）。测试与构建配置属宪法第 4 条
   「不适用」清单，仍需常规 review。
2. **观察渲染 ≠ 修改渲染**：测试通过浏览器观察渲染结果并断言几何关系，其全部交互
   （点击折叠钮、拖拽节点、填充输出）都是既有交互语义的复现（`app.js` 既有事件路径），
   不新增、不改变任何交互；这与 pixel gate 的姿态相同——gate 是宪法第 2 条的执行器而非
   违宪者，观测类测试同理。
3. **防误触兜底**：验收仍要求 `npm run gate` 4 场景全绿 + `npm test` 全绿（AC6）——若测试
   基建意外触碰渲染产物，gate 立即红。

## 背景（含代码事实源，2026-10-22 16:59 本会话只读核实）

1. **陷阱机制五件套**（失效模式的完整链条）：
   - `portCache`：Map，缓存每节点各端口相对节点原点的世界坐标偏移（`app.js:185`）；
   - `measurePorts()`：清空缓存并经 `getBoundingClientRect` 重测，除以 `view.scale` 折算
     世界单位（`app.js:792-804`）；
   - `portCenter()`：从缓存取偏移加 `n.x/n.y`；缓存缺失时回退猜测值
     `{x:n.x+150,y:n.y+20}`（`app.js:805-809`）；
   - `edgeD()/renderEdges()/updateEdgesOf()`：连线 path 的 `d` 全部由 portCenter 派生
     （`app.js:825,845-854,856-868`）；
   - **失效模式**：任何使节点高度变化的 DOM 改动（输出区填文本/折叠参数/textarea 改高）
     之后若不 `measurePorts`，`updateEdgesOf` 拿到的仍是旧偏移——连线端点与端口实际位置
     脱节，且无任何报错。
2. **调用点全景**（grep 实测 16 处，本陷阱的回归锁定面）：`rerenderNode`
   （`app.js:1078`；被折叠钮 `app.js:1663`、菜单折叠/旁路 `app.js:1651-1652`、条件参数
   重渲染 `app.js:1679` 调用）；单节点执行 `app.js:1202,1213-1214`；新增节点 220ms 入场
   动画后 `app.js:1271`；节点删除 `portCache.delete` `app.js:1282`；textarea mouseup
   `app.js:1666-1670`；拖拽移动中 `app.js:1470-1473` / 松手 `app.js:1508`；模拟运行起始
   `app.js:1916`、逐节点 `app.js:1966,1995-1998`、收尾 `app.js:2072`；SSE 回放
   node:start/node:done/node:error `app.js:2136,2158-2160,2175-2177`。`setNodeOut` 仅写
   `.node-out` 文本、不自带重测（`app.js:1889`）——高度变化与重测的**配对全靠调用方
   自觉，这正是陷阱所在**。
3. **高度/变换变化源**（测试场景的物理依据）：`.node-out` 文本填充（makeNodeEl
   `app.js:774`）；折叠类 `collapsed` 切换（`app.js:759,1663`）；textarea 手工改高
   （widgetHtml `app.js:749-752`；textarea 参数存在于 llm.sys/prompt.tpl/code.code/
   reply.tpl，`packages/shared/src/nodes.ts:29,36,62,94`）；入场动画 `anim-in`
   （`app.js:1269-1271`）；节点位移 `el.style.left/top`（`app.js:1471`）。
4. **golden 为什么抓不住**：4 场景为 s0 静态/s1 点选/s2 设置面板/s3 节点库
   （`gate.mjs:60-65`），全部处于定稿静态态——像素门禁锁定的是定稿视觉，不是交互时序
   几何，对本陷阱 0 覆盖（设计使然，非 gate 缺陷）。
5. **测试基建现状**：`tests/` 仅 golden/ + smoke/ 两目录（本会话 ls 实查）；Playwright
   ^1.50.0 已是根 devDependencies（`package.json:25`）——浏览器自动化**零新增依赖**。
   可借鉴模式（只借鉴、不 import、不修改）：gate.mjs 的极简静态服务 `gate.mjs:32-41`、
   localStorage 清空+reload 引导 `gate.mjs:70-71`、事件构造点击 `gate.mjs:54-58`；
   smoke:server 的前置构建校验+逐断言命名+退出码风格（`tests/smoke/lib.mjs`）。
6. **确定性种子**：`loadLocal()` 从 `localStorage['agentflow.v2']` 读
   `{tabs:[{name,nodes,edges,nextId,view}],activeTab,...}`（`app.js:170,1374-1388`）——
   测试可在加载前注入确定性的双节点+单连线工作流（SPEC 定稿种子方式）；离线无后端时
   ENGINE.online=false 走 runSimulated 纯客户端执行（`app.js:1902-1906`），与 gate 同源
   的确定性。
7. **CI 不接入**：ci.yml 仅跑 build+gate 与 npm test（`.github/workflows/ci.yml:19-22,40-41`），
   smoke:server 亦不在 CI（本会话 grep 实查 ci.yml 无 smoke 引用）——新脚本同样定位为
   本地/VERIFY 阶段回归工具；护栏 3 禁改 CI，本项不动 ci.yml。
8. **规模参照**：gate.mjs 147 行、smoke 两文件 245/342 行（本会话 wc -l 实查）——同类
   测试单文件 ≤400 行（`AGENTS.md:53` 硬性约定 4）有余量。

## 目标

1. 把 `AGENTS.md:69` 的已知陷阱从「文字约定」升级为「可执行回归资产」：npm 级一键命令，
   任何未来重构丢掉 `measurePorts` 配对时测试红。
2. 建立 canvas 运行时几何回归的首个基座（`tests/` 第三个测试家族），与 shared 契约测试
   （数据面，迭代 0003）、smoke:server（服务端面，迭代 0002）、pixel gate（静态视觉面）
   互补，补齐「交互时序几何」这一层防护。
3. 沉淀 Playwright 驱动 dist 的独立测试模式（自建静态服务、localStorage 种子、离线
   确定性、事件构造交互），供后续回归项复用。

## 非目标（out of scope）

- **不修任何产品代码**：预设现状所有调用点配对正确（背景 2 全景核对）；若测试暴露真实
  失配，按 REQ-0004-06 预案处置，本迭代不修 `apps/web`。
- 不改 `tools/pixel-gate/`、`tests/golden/**`、`tests/smoke/**` 任何既有文件；不接入 CI
  （护栏 3）；不运行 `npm run gate:update`。
- 不新增依赖（Playwright 已在位，`package.json:25`）；不做视觉/像素断言（那是 gate 的
  领地），只做几何贴合断言。
- 不覆盖全部 16 调用点（S 大小约束）：按「高度变化族 + 位移族 + 动画族」抽代表场景 ≥4
  个（REQ-0004-02），全量覆盖扩展留后续项。
- 不更新 ROADMAP/README（治理日职责；顺带观察：ROADMAP T2-M1/M2 状态行仍写「部分完成/
  未开始」（`ROADMAP.md:42,50`）而 BK-0003/0002 早已 done——记录给治理日校正，本项不动）。

## 用户故事

1. 作为重构 `apps/web` 的开发者（含未来机械移植），我跑一条命令即可确认没有弄丢任何
   `measurePorts` 配对、连线仍贴合端口，而不必肉眼逐场景拖拽检查。
2. 作为 test-manager，我需要可重复、离线确定性、逐条命名的几何断言，使 VERIFY 阶段能对
   「交互后连线贴合」给出机器证据，而非手工目测。
3. 作为协调者，我需要在 ready 队列清空前把唯一的已知陷阱文字约定变成测试资产，并获知
   下次心跳需转「补题」。

## 需求条目

- **REQ-0004-01 · 端点贴合不变量（核心断言）**：对被测连线，断言其 `vis` path 的 `d`
  两端点（起点 M 与曲线终点）换算屏幕坐标后，与两端 `.port` 元素
  `getBoundingClientRect` 中心的距离 ≤1px（换算依据：`#world` transform
  `translate(view.x,view.y) scale(view.scale)`，`app.js:687`；世界系换算等价）。path 解析
  方式与容差值 SPEC 定稿并论证（亚像素舍入来源），不得为凑绿无限放宽。
- **REQ-0004-02 · 代表场景 ≥4（覆盖三族失效源）**：①输出区文本填充致高度增长（走真实
  runSingleNode 或 runSimulated 路径）；②折叠/展开（点击 `.ncollapse`，rerenderNode
  路径 `app.js:1663`）；③textarea 高度变化后 mouseup（`app.js:1666-1670` 路径，用
  llm.sys 等 textarea 节点）；④节点拖拽位移 ≥50px（mousedown→mousemove→mouseup）；
  建议⑤新增节点入场动画（等待 ≥260ms 后断言，`app.js:1271`）。场景逐条命名；种子工作流
  确定性固定（背景 6）。
- **REQ-0004-03 · 非空虚设防**：每场景断言贴合前先断言前置成立——高度类场景断言节点
  offsetHeight 确已变化、位移类断言位置确已变化；前置不成立即判该场景失败（防「没动
  所以贴合」的假绿）。
- **REQ-0004-04 · 一键脚本与前置校验**：根 `package.json` scripts 新增 1 行（命名 SPEC
  定，建议 `test:canvas` / `regression:canvas`），指向 `tests/` 新目录入口；脚本自检
  `apps/web/dist` 在位（缺则报「先 `npm run build:web`」类可操作错误并退出非 0，先例
  smoke 前置校验）；自建极简静态服务托管 dist（模式借鉴 `gate.mjs:32-41` 但**独立实现，
  不 import `tools/pixel-gate`**）。
- **REQ-0004-05 · 改动面收敛（硬约束）**：产品提交的 git diff 仅允许——`tests/` 新目录
  新增文件（每文件 ≤400 行，`AGENTS.md:53`）+ 根 `package.json` scripts 新增 1 行；其余
  任何路径零改动（AC6 机器核对）。
- **REQ-0004-06 · 现状缺陷处置预案**：若任一场景在**未修改的现状 dist** 上失败（即暴露
  真实存量失配）：本迭代不修 `apps/web`（连线几何属渲染路径，宪法第 5 条「存疑按影响
  处理」），VERIFY 记 BUG-xxx + 实测坐标/截图证据，item 处置转协调者裁定（blocked 或
  新立项；若评估须改前端渲染路径则进待批准区流程）。如实发现不判实现为过，隐瞒才判过。

## 非功能要求

1. **确定性**：全程离线（无后端、无外网、无真实计时断言；动画类等待取 ≥260ms 固定值），
   同机重复运行结果一致（口径与 gate 头注「离线模式，天然确定性」同源，`gate.mjs:3`）。
2. **可定位**：每场景输出命名与通过/失败计数（先例 smoke:server 逐断言命名，
   `BACKLOG.md:12`）；失败信息含实测偏差值与节点/连线 id。
3. **Windows 兼容**：路径经 node:path/url 处理（先例 `gate.mjs:12-17`）；监听端口可经
   env 注入（先例 GATE_PORT，`gate.mjs:20`）防占用冲突。
4. **规模**：新增源文件 ≤400 行/文件，超出先拆分（lib+场景模块），不砍场景优先砍实现
   冗余。

## 验收标准（Given / When / Then）

- **AC1 · 端点贴合不变量**：Given 已构建 dist、测试以离线静态服务启动、画布含确定性
  A→B 连线，When 依次执行 REQ-0004-02 各场景，Then 每场景后 A→B 连线 vis path 两端点与
  两端口实际中心偏差均 ≤1px（按 SPEC 定稿的坐标换算），全部场景通过且逐条命名输出。
- **AC2 · 非空虚设防**：When 各场景执行预置断言，Then 高度/位置变化前置全部成立（输出
  操作前后值佐证）；When 人为把某场景改为空操作（反演演练，VERIFY 可选），Then 该场景红。
- **AC3 · 一键与前置校验**：When 仓库根执行新脚本，Then 全场景通过、退出码 0；When
  dist 缺失时执行，Then 以含「先构建」指引的报错退出非 0（不静默跳过）。
- **AC4 · 陷阱敏感性（反演演练，VERIFY 执行）**：When 临时移除任一配对调用点的
  `measurePorts()`（如 rerenderNode `app.js:1078` 或单节点执行 `app.js:1214`）后重建
  web 并重跑，Then 对应场景红（证明测试真的锁住了陷阱）；演练后恢复源码、复跑复绿。
- **AC5 · 既有防护零回退**：When 运行 `npm test` 与（推荐）`npm run smoke:server`，
  Then 全绿（node --test 8 项 / smoke 39 断言，口径 `STATE.md:13`、`BACKLOG.md:15`）。
- **AC6 · 渲染零影响与改动面白名单**：When 产品提交前运行 `npm run gate`，Then 4 场景
  全绿（diffPx=0）；git diff 核对满足 REQ-0004-05 白名单（`tests/` 新目录 +
  `package.json` 1 行），`apps/**`、`packages/**`、`tools/pixel-gate/**`、
  `tests/golden/**`、`tests/smoke/**`、`.github/**` 零改动。
- **AC7 · 现状结论如实记录**：Then REPORT 明确记载「现状 dist 上各场景首跑结果」——
  全过则记「未发现存量失配」；任一失败则按 REQ-0004-06 记 BUG 清单与证据，不隐瞒。

## 依赖与风险

- **依赖**：`apps/web/dist` 构建链在位（`npm run build:web`）；Playwright Chromium 可跑
  gate 即满足（CI 与本机均已安装）；无后端依赖（离线模式）。
- **风险 1 · Playwright actionability 超时**：迭代 0003/0004/0005 三次实踩 locator 点击
  超时改 DOM click 的先例（`metrics.md:9-11`）——拖拽/点击场景 SPEC 直接按「事件构造
  优先」（dispatchEvent MouseEvent，`gate.mjs:54-58` 同款）设计，规避此坑。
- **风险 2 · 容差过紧误红**：getBoundingClientRect 与 path 渲染存在亚像素差 → 容差 1px
  起步；若本机/CI 字体栈差异导致系统性偏差，SPEC 论证后放宽至 2px 并写明理由。
- **风险 3 · 暴露存量失配**：处置按 REQ-0004-06/AC7——不修产品、如实上报；发现本身是
  本测试的价值而非迭代失败（隐瞒才失败）。
- **风险 4 · S 大小膨胀**：若 SPEC 阶段发现 4+1 场景超 400 行/文件，先按 lib+场景模块
  拆分；仍超则回 PLAN 收窄场景数（WORKFLOW §2 回签），不夹带进 BUILD。
- **风险 5 · 与 gate 模式相似被误判「改门禁」**：REQ-0004-04 明写「独立实现、不
  import」；AC6 白名单机器核对 `tools/pixel-gate/**` 与 `tests/golden/**` 零改动。

---

> 选题过程存证：本 PRD 由独立 PLAN 会话产出。ready 队列核对（`BACKLOG.md:11-21`）：
> 唯一 ready 项 BK-0004（P2/S/test）→ 选中；其余为 done×4 / blocked×1 / proposed×6 /
> pending-approval×1（待批准区）。无 L 项需拆分。与最近 3 次迭代（0003=T2-M1、0004=T4-M2、
> 0005=T3-M1）承载项与改动面零重叠。**协调者提示：本项选取后 ready 队列归零，下次心跳
> PLAN 应按 WORKFLOW §4 转「补题」（对照 done/failed 防重复）或由周度治理补充。**
> 代码与文档引用均于 2026-10-22 16:59 本会话只读核实（app.js portCache 段/渲染段/交互段/
> SSE 段 grep+read、nodes.ts textarea 参数、gate.mjs、ci.yml、根 package.json、
> tests/ 目录 ls、wc -l、BACKLOG / ROADMAP / metrics / 0003-0005 三迭代 PRD）。
