# 迭代 0050 · PRD — BK-0057 冒烟编排头注序列同步（PLAN）

> PLAN 轮产物（WORKFLOW.md §4 PLAN 契约，v2）。产品经理产出。
> **S 项免独立 SPEC**（非 doc、非触 UI）：受影响文件清单与验收口径内嵌本 PRD（§3/§5），
> 返回 skipSpec=true。本轮隔离工作树 `.zcode/worktree/feat/0050-iter/`（分支
> `feat/0050-iter`），产物全部落在工作树内。
> 选题时间 2026-10-26 12:47–12:53。

## 0. 选题过程与枯竭判定存证（规则④）

优先序逐级排查（全部本轮亲核，方法=只读 grep / 亲读 / awk / git log）：

1. **规则①（issue 批复项）**：派发档案「approved：无；rejected：无」——无修宪轮
   ready 项解锁，无 skipped 改写。
2. **规则②（user-request 收录）**：档案无 user-request 新项（#12/#6/#5/#4 均为
   needs-approval 待批复），无收录动作。
3. **规则④（ready 常规选题）**：BACKLOG 全表亲读（工作树副本 130 行），**唯一
   `ready` 项 = BK-0040（BACKLOG.md:53）**，且派发指令明示被并行工作流占位
   **严禁选择**——ready 队列枯竭成立。
4. **侦察档案候选逐一排除**：
   - 残缺标记唯一实质项 = browser stub（apps/server/src/tools.ts:138）——ADR-0011
     评估终态（维持 stub 如实降级），0041/0045/0046/0047 四轮同判不立项，本轮同判；
   - 悬挂 run 探针 = `[]`（空）；
   - issue 面板：#12 属 golden/pixel-gate/CI 需批准射程（0045/0046/0047 同判，
     不自主处理）；#4/#5/#6 授权链已承继在库、对应子项各有前置未竟
     （#4→BK-0041/0042 前置 BK-0040 在途；#5→BK-0044/0045 阻塞于 ADR-0014
     附录 A 依赖批复；#6→BK-0047/0048 硬前置 BK-0019/0020 仍 proposed）；
   - 覆盖差集 / 文档漂移 / dogfooding = 治理日产物，心跳不重复采集；
   - 近 3 迭代（0045/0046/0047，工作树 iterations 目录最新三个，0048/0049 为主干
     空转轮无目录）在档观察全数闭口：0045 OBS-0045-01（期望表键序全等，无需动作）、
     0046「遗留观察：无需后续动作」、0047 OBS-0047-01（本机 :3000 陈旧进程，
     环境侧）与 OBS-0047-02（头注尾句措辞归治理日）。
5. **PM 自主侦察（0046/0047 同法：只读 grep/亲读/亲跑）** 扫描「注释/清单/计数类
   头注 vs 实现实况」同族漂移面（BK-0052~0056 证据系），发现三项候选：
   - **候选 A（本项，入选）**：tests/smoke/smoke-server.mjs:5 编排序列串滞后——
     详见 §1；
   - 候选 B（建行不入选）：tools/pixel-gate/gate.mjs:4「6 个 golden 场景」vs 实况
     16 场景——**POLICY 需批准区（tools/pixel-gate/ 目录改动明文需批准）**，
     建 BK-0058（pending-approval）留档，开 needs-approval issue 归协调者/脚本，
     获批前零实现（沿 BK-0043→ADR-0014 附录 A 先例）；
   - 候选 C（doc 类，治理日批处理，不立项）：docs/frontend-module-boundaries.md:13-18
     四模块行数表（核对日期 2026-10-22：app.js 2419 / app.css 532 / Skeleton 182）
     vs 本轮 `wc -l` 实况（2948 / 621 / 189——0032/0037/0038/0039 前端迭代后未
     回写），BK-0051（README 漂移）同族，攒治理日与 BK-0051 一并批处理。
   - 侦察同时复核排除：AGENTS.md:47「现 84 断言」滞后（实况 133）属 POLICY 禁止区
     （用户亲自修改，沿 #9 先例不立项不代改）；ROADMAP.md:66「16 种 handler 全部
     实装」滞后（实况 20 节点/18+llm+agent handler）属治理日 PM 状态行回写件；
     BK-0015 账本滞后（承载项 BK-0033 已于迭代 0031 done，备注「待 BK-0033 CLOSE
     后随批关账」已到期未执行）属治理日记账动作——均不在心跳轮混入（一次迭代只做
     一件事）。

## 1. 背景（漂移证据与溯源）

**证据（本轮亲读 + 亲跑）**：

- `tests/smoke/smoke-server.mjs:5` 头注声明：
  「步骤编排 **P→H→W→N→CAP→S→R→D→E→K→G→C**；fail-fast（…）」——恰 **12 组**。
- 同文件 `main()` 实际编排 **19 组**（awk 亲核组标记行号，`tests/smoke/smoke-server.mjs`）：

  | 序 | 组 | 行号 | 落地迭代 / 来源 |
  | --- | --- | --- | --- |
  | 1 | P 前置 | :379 | 0002 / BK-0002 |
  | 2 | **M** MCP stub 离线断言 | :384 | 0009 / BK-0005（mcp-stubs.mjs 挂接） |
  | 3 | H 起进程健康等待 | :389 | 0002 |
  | 4 | W workflows CRUD | :402 | 0002（W08/W09 扩于 0040 / BK-0052） |
  | 5 | N 参数反例 | :454 | 0002 |
  | 6 | CAP 能力清单 | :464 | 0039 / BK-0049 |
  | 7 | S SSE 全事件链 | :513 | 0002 |
  | 8 | R runs 列表回放 | :552 | 0002 |
  | 9 | D 删除守卫+approve | :573 | 0002 |
  | 10 | E websearch eng 路由 | :617 | 0005 / BK-0007 |
  | 11 | K code 兜底 | :660 | 0014 / BK-0022（K04 扩于 0038） |
  | 12 | G 持久会话 | :706 | 0015 / BK-0016 |
  | 13 | **V** 智能体互审 | :869 | 0016 / BK-0017 |
  | 14 | **A** agent 节点 | :1020 | 0031 / BK-0033 |
  | 15 | **T** termview | :1169 | 0034 / BK-0037 |
  | 16 | **O** webshow | :1229 | 0033 / BK-0036 |
  | 17 | **J** jsoncanvas | :1358 | 0035 / BK-0038 |
  | 18 | **Z** 悬挂 run 扫尾 | :1443 | 0019 / BK-0011 |
  | 19 | C 清理（finally，:321/:332 一带） | — | 0002 |

- **缺席七组 = M / V / A / T / O / J / Z**（上表加粗）：自各自落地迭代起从未进入 :5 序列串。
- **溯源（git log -S 亲跑，工作树内）**：该行原始形态（提交 79788a3，2026-10-22，
  迭代 0002）为「P→H→W→N→S→R→D→C」8 组；现行 12 组说明 E/K/G/CAP 曾随各自迭代
  **部分入列**——该行是「活清单」但历次只加自家组、漏补此前已缺席的组
  （BK-0056 server.ts 头注路由清单同型：0039 补 capabilities 行而 0015 的 sessions
  行始终缺席，经查此处 0039 也只加了 CAP 而未补 V/Z）。
- 头注其余部分（:6-31）已含 G/V/A/O/Z/CAP 六组**逐组详述**（各迭代补写），
  :5 序列串是唯一未同步的汇总行；M/T/J 详述分别在 mcp-stubs.mjs 头注与 main()
  内联注释（:1169/:1358），不属本项范围（本项只同步序列串，不扩写详述）。

**为什么值得做**：编排序列串是该 1534 行冒烟主控文件的「阅读地图」——新会话
（含 AI 协作者）据 :5 判断断言组覆盖面，缺 7 组（其中 V/A/T/O/J 五组恰是近 15 个
迭代新增的核心节点/协议行为面）会低估冒烟覆盖；与 BK-0056（server.ts 头注路由
清单，主干在库先例）完全同型，纯注释行、零行为变化、零渲染因果。

## 2. 需求定界

- **REQ-0057-01（唯一需求）**：`tests/smoke/smoke-server.mjs:5` 步骤编排序列串
  由「P→H→W→N→CAP→S→R→D→E→K→G→C」替换为
  「**P→M→H→W→N→CAP→S→R→D→E→K→G→V→A→T→O→J→Z→C**」（19 组，
  与 main() 实际执行序逐组一致，M 落 P 与 H 之间、C 为 finally 清理段尾），
  行内其余文字（「；fail-fast（首 FAIL 打印上下文 + server 日志尾，进 finally
  清理）」起）逐字保留。
- 触UI 分类结论：**否**——tests/smoke 注释行；本轮亲跑
  `grep -rn "smoke-server" apps/web/src tools/pixel-gate` → **零命中（exit 1）**，
  渲染路径对该文件零引用，无像素/DOM/CSS 因果；POLICY 自主区「测试与回归基建
  （tests/**）」（BK-0053/0054 同文件族同判在案）。
- 不为注释新增断言：19 组行为面已由既有 133 断言机器守护（各组断言 ID 在组内），
  注释无断言锚（BK-0055/0056 同口径）。

## 3. 受影响文件清单（S 项内嵌，skipSpec）

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `tests/smoke/smoke-server.mjs` | :5 行内替换，恰 1 文件 1 行（1+/1−） | 唯一产品面改动；REQ-0057-01 字面 |

**零触碰清单（机器证明口径）**：`apps/**`、`packages/**`、`tools/pixel-gate/**`、
`tests/golden/**`、`.github/**`、`package*.json`、其余 `tests/smoke/**` 文件
（lib.mjs / mcp-stubs.mjs 等一律不动）。

## 4. 非功能要求

- 行级预算：恰 1 行替换（净 0 行增长）；文件 1534 行存量（>400 上限系存量豁免，
  AGENTS.md 硬性约定 4 只约束新增源文件）。
- EOL/编码：保持 LF、UTF-8 无 BOM（仅行内替换不触行尾）。
- 语义不变：断言本体、组逻辑、fail-fast/清理编排零改动；smoke 结果与基线完全一致。

## 5. 验收标准（Given / When / Then）

- **AC1 正路径（行为零变化）**
  Given 工作树基线绿；When 改动落地后运行 `npm run smoke:server`；
  Then 输出 `==== smoke:server：133 passed / 0 failed ====`（与 0045/0046/0047
  基线一致，exit 0）。
- **AC2 改动面机器证明**
  When 运行 `git diff HEAD --stat -- tests/` 与 `git diff HEAD -- tests/`；
  Then 恰 1 文件（smoke-server.mjs）1+/1−；diff 行含 19 组序列字面（M/V/A/T/O/J/Z
  七组新在列、序为 P→M→H→W→N→CAP→S→R→D→E→K→G→V→A→T→O→J→Z→C），
  行内 fail-fast 及其后文字逐字保留；运行
  `git diff HEAD -- apps packages tools .github 'package*.json'` → 恒空。
- **AC3 编排一致性（名实相符）**
  When 以 awk/grep 重取 main() 组标记行号序并与新串逐组比对；Then 19 组组名与
  先后序逐一对应（M 在 P 后 H 前；C 对应 finally 清理段）；断言 ID 计数
  （如 `grep -c "C.ok\|C.check"` 前后一致）证明断言本体零改动。
- **AC4 回归面**
  When 运行 `npm test`（30/30）与脚本统一门禁 `npm run build` / `npm run gate`；
  Then 全绿——本项零渲染因果（§2 grep 亲证），gate 为纯回归面；**零 gate:update、
  golden 零接触**（非修宪轮，宪法第 3 条）。
- **AC5 禁区白名单终判**
  When 运行 `git diff HEAD -- apps packages/shared/src tools/pixel-gate tests/golden
  .github 'package*.json'`；Then 输出恒空。

## 6. 不做范围

- 不扩写 M/T/J 组的头注详述（其描述已在 mcp-stubs.mjs 头注与 main 内联注释）；
  不动 :6-31 既有逐组详述段。
- 不触碰 gate.mjs:4 场景数漂移（→ BK-0058 需批准区）、边界文档行数表与
  BK-0051 README 漂移（→ 治理日 doc 批处理）、AGENTS.md:47 断言数漂移（→ 禁止区，
  处置归用户）、ROADMAP.md:66 状态行与 BK-0015 随批关账（→ 治理日 PM 回写）。
- 不新增断言、不改清理编排、不动其余 smoke 文件。
- 主干零写入：一切改动限工作树（PRD/BACKLOG/STATE 过程件亦在工作树内）。

## 7. 溯源与优先级

- 来源主题：T2·质量基建（BACKLOG BK-0057 来源列 T2；ROADMAP.md:36）；派生链 =
  规则④枯竭补题，先例 BK-0052（0040）/0053（0041）/0054（0045）/0055（0046）/
  0056（0047）连续五轮同径 done。
- 优先级 P2 / 大小 S / 类型 test / 触UI 否——同族同判（BK-0053/0054 test、
  BK-0055/0056 debt，本项载体为测试脚本故 test）。
- 无 issue 来源（sourceIssue 无）；reconstitutional=false（纯注释、非修宪轮、
  禁 gate:update）；itemContinues=false（单轮可完，无批次编排）。
