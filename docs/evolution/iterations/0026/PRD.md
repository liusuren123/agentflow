# PRD · 迭代 0026 · BK-0008 sqlite MCP 工具真实接入（重试轮：query/execute 落地 better-sqlite3，DB 锚定沙箱专用文件）

> 产出角色：product-manager（PLAN 阶段）· 2026-10-25 03:07
> 来源：BACKLOG BK-0008（capability / 触UI=否 / **P2 / M / ready** / 来源 T3）。这是
> 本轮 ready 队列中**唯一的非 doc、非 L 项**：P0 修宪项 BK-9002~9006 全为 L 级且行内
> 备注明令「先拆分再实现 / 拆分排序待治理日 / 心跳不夹带拆分」（BACKLOG.md:47-51），
> 0021/0023/0024/0025 四轮 PRD 选题存证已按同据顺延；BK-0008 为 ROADMAP 治理日钦定
> 心跳选题序（BK-0027 → BK-0031 → BK-0011 → **BK-0008**，ROADMAP.md:167-168）的末项。
> **重试链**：迭代 0020（2026-10-24）BUILD 环境阻塞判 blocked——Mimosa 编辑钩子对
> `exec` 命名调用形态启发式误报（better-sqlite3 `Database.exec` 为进程内 SQL，
> store.ts:21 同库先例），非需求失败、零产品残留；2026-10-24 用户会话三选一决策
> 「两个门都降为 warn」落地（用户级环境变量 `MIMOSA_HOOK_BLOCK=warn` +
> `MIMOSA_GIT_GATE_MODE=warn`，setx 写入），据此 BACKLOG 翻回 ready 重试
> （BACKLOG.md:59 行内备注明载重试前置义务）。
> 定界权威：迭代 0020 存档 SPEC（`docs/evolution/iterations/0020/SPEC.md` 389 行，
> 本会话全文 Read）——0020 JOURNAL §4.2 明载「重试即拿即用：三段式设计 +
> SPEC §3.3/§3.6 全文仍有效」。冲突顺位：CONSTITUTION.md > 代码现状 > 0020 SPEC
> 存档 > 本 PRD；SPEC 阶段须对存档逐节复核并以当前 HEAD 基线刷新后定稿。
> 主题归属：ROADMAP T3·后端执行能力 · M2 sqlite MCP 工具沙箱接入
> （ROADMAP.md:77-82，状态行「待心跳选题」本轮兑现）。

## 选题过程存证（WORKFLOW §4 优先序逐条处置，本会话 2026-10-25 03:02~03:07 核实）

- **跨迭代续选**：无——BK-0021 批次链已于 0022 终轮收口、BK-0028/0029/0030 已于
  0023/0024/0025 相继 done 且 BK-0013 拆分三子项全部收官（STATE.md:13 last_result
  明载；issue#10 关单回执归脚本）。本轮从零选题。
- ① **批复同步**：档案「approved：无；rejected：无」→ 本轮零动作。issue 面板
  #2~#6 虽 open，但其批复均已在此前 PLAN 轮消化入行（#2~#5 于 2026-10-23 批复、
  #6 于迭代 0021 轮批复，BK-9002~9006 主池 ready P0 原状，BACKLOG.md:47-51 +
  待批准区注记 ：89-93）——无新增 ready 义务、无 skipped 改写、无建行。
- ② **user-request**：无（档案 issue 面板仅 needs-approval 五项，无 user-request
  条目；无建行、无 uiIssueNumbers）。
- ④ **常规选题（本轮入选路径）**：ready 队列逐项处置——
  - **P0 修宪项 BK-9002~9006（全 L）顺延**：行内备注均为「L 项先拆分再实现
    （BK-0013 先例）」「拆分排序待治理日」或明示「心跳不夹带拆分」
    （BACKLOG.md:47-51）；0021/0023/0024/0025 四轮 PRD 已按同据顺延——心跳抓取
    任一项即夹带 L 项拆分、违「一次迭代一件事」，且拆分系治理日职责（BK-0013
    拆分即 2026-10-24 治理日执行）。NDP 前置虽已解阻（迭代 0022），拆分排序仍
    未做，本轮沿用先例。
  - **→ 选 BK-0008（P2 / M / ready / 前置 BK-0002+BK-0005 均 done）**：ready 中
    唯一 S/M 非 doc 项（「优先 S/M」口径满足）；重试阻塞已由用户决策解除
    （档位降 warn）；0020 存档 SPEC + JOURNAL §1/§4 设计档案完整，重试边际成本
    最低、验证面（M12-M17 桌面设计）已定稿；做完即 T3-M2 里程碑关账（ROADMAP
    验收点「工具返回不再含 not implemented；sandbox 外路径被拒；gate 全绿」）。
- **重试前置探针（PLAN 侧只读部分，本会话实跑）**：`echo $MIMOSA_HOOK_BLOCK` /
  `echo $MIMOSA_GIT_GATE_MODE` 输出均为 `warn`——两用户级环境变量在本会话环境
  可见且取值正确（BACKLOG.md:59 前置义务的只读半段）。**写探针半段（含 exec
  命名调用形态的最小 Edit 验证钩子确实放行/仅 warn）属 BUILD 开工前置**，本 PRD
  REQ-0026-01 承载（沿 0020 JOURNAL §3.5-§3.6 裁决纪律：仍被 hard-block → 立即
  停止、零产品残留、escalate，不硬闯不变形绕过）。
- **侦察档案核对**：残缺标记 `tools.ts:5/:82` 即本项要消灭的 stub 如实降级面
  （sqlite 半面；browser 半面归 ADR-0011 维持 stub 终态）——正是立项对象本身，
  无需另立新项；`package-lock.json:787` 命中为 base64 哈希偶合非标记；悬挂 run
  探针 `[]` = BK-0011 启动扫尾的预期表现（迭代 0019 done）——无补题需求。
- 与最近 3 次迭代重叠面：0025 触 `tools.ts`（仅 :104-107 三分支撑**注释** +2 行，
  IMPL['sqlite'] null 槽、stub 链、TOOL_SPECS 零触碰——本会话 Read 亲核）与
  guard/llm/registry/inject；0024 触 mcp/registry+config；0023 触 mcp/ 传输三文件
  ——本项改动面 `tools.ts`（sqlite 槽位置换）+ `tests/smoke/mcp-stubs.mjs`（0023~
  0025 三轮零触碰，133 行与 0020 SPEC 基线一致），M08-M11 llm.ts 源锁经 0025 轮
  89/0 亲证仍绿，零冲突。

## 结论

**建议做**：一句话理由——用户已亲自解除 0020 环境阻塞（两门降 warn，本会话只读
探针亲证档位在位），0020 存档 SPEC 三段式设计与 M12-M17 断言桌面设计「即拿即用」；
ready 队列唯一 S/M 非 doc 项，边际成本最低；做完即消灭 `sqlite` stub 半面（工具
返回不再含 not implemented 的 sqlite 部分）、T3-M2 关账；非修宪轮、全程禁
gate:update。

## 触 UI 分类结论

**否（非修宪轮，reconstitutional=false）。** 论证（逐层对照宪法第 1 条三层）：

1. 改动面限 `apps/server/src/tools.ts`（IMPL['sqlite'] 槽位 null → {query,execute}
   真实现 + TOOL_SPECS 两行摘「（未实现）」前缀）+ `tests/smoke/mcp-stubs.mjs`
   （冻结基准与 M03-M07 口径联动 + M12-M17 新增）恰两路径。`apps/web/**`、
   `tools/pixel-gate/**`、`.github/**`、`packages/shared/**`、golden 基线零接触
   ——视觉 / DOM 结构 / 交互三层无涉，**全程禁 `npm run gate:update`**（POLICY
   禁止区）。
2. POLICY 授权链：命中自主区双条——后端能力演进（`apps/server/src/**`）+ 测试与
   回归基建。better-sqlite3 为既有依赖（apps/server/package.json:16 `^12.11.1` +
   :22 `@types/better-sqlite3 ^9.6.0` + 根 package.json:35 allowScripts，本会话
   grep 亲核）；进程内沙箱库零出站、零新 env、零新依赖、零 shared 契约。
3. 前端 MCP_SERVERS 注册表 sqlite 条目（app.js:103-114，宪法冻结面）**早已广告**
   query/execute——服务器名/工具名/面板文案一字不动，翻真对前端零感知
   （0020 SPEC §6 同口径）。

## 背景（代码事实，本会话 2026-10-25 03:02 只读核实）

1. **tools.ts 现状 119 行**（0020 SPEC 基线 117 + BK-0030 三分支撑注释 2 行）：
   `IMPL['sqlite'] = null`（:59「未实现：如实告知模型」）；TOOL_SPECS sqlite 两行
   带「（未实现）」前缀（:97-98）；`stubOf` STUB_MARK 链（:80-87）；
   `collectTools` 两臂内核（:108-119，:112 else 落 stub）；`SANDBOX` 锚定
   （:15）+ `safePath` throw 先例（:17-21，消息含「沙箱」语义）+ `ensureSandbox`
   （:22）；限幅先例 read_file 200\*1024 / fetch excerpt 4000（:30/:48）。
2. **mcp-stubs.mjs 现状 133 行**（与 0020 SPEC §4.1 联动清单「现文」列逐字一致，
   本会话 Read 亲核）：FROZEN sqlite `impl:false`（:30）；M03「5/5 含前缀」
   （:62-63）；M04「7/7 无前缀」（:69-70）；M05「5/5 如实载荷」（:85-87）；M06
   「7/7 真实函数」（:96-98）；M07 三向配对自愈 + BK-0008 摘除路径守护注释
   （:100-108）；M08-M11 llm.ts 源锁。冒烟基线 89 passed / 0 failed
   （metrics 0023/0024/0025 三行亲证，M 组含 M01-M11 11 条）。
3. **better-sqlite3 先例与类型面**：store.ts 400 行在用（:21 import 先例、主库
   data/agentflow.db 与沙箱库不同根物理隔离）；0020 JOURNAL §2 已对
   `@types/better-sqlite3` 逐条核签名（Statement.reader/get/iterate/exec）。
4. **0020 SPEC 行为实证在档**（§2.2 十二探针，OS temp 临时脚本实跑）：ATTACH/
   VACUUM INTO/PRAGMA temp_store_directory 为真实逃逸向量（#1/#4/#12）→ 全文
   token 黑名单设计的直接依据；exec 多语句 total_changes 差值计数成立（#9）；
   整数列文本化（#11）；ai@7.0.146 工具异常语义源码级核实（§2.3：impl throw →
   SDK catch 为 tool-error 错误文本 tool-result，不 reject generateText——llm.ts
   降级分支不触发、工具循环不夭折）。
5. **重试前置**：Mimosa 两档位环境变量本会话只读探针输出均 `warn`（§选题存证）；
   写探针义务归 BUILD 开工第一步（REQ-0026-01）。2026-10-24 用户会话三选一决策
   全文在 BACKLOG.md:59。
6. **工作区干净**（`git status --porcelain` 输出空，本会话亲跑）；HEAD = 8768b2c
   （归档迭代 0025）。

## 目标与范围（= 0020 SPEC §1/§3/§4 定界复用；SPEC 阶段对当前 HEAD 复核刷新）

**做**：

1. **IMPL['sqlite'] 真实现**（0020 SPEC §3.1-3.3）：DB 锚定
   `apps/server/sandbox/mcp-sqlite.db`（路径仅由 SANDBOX 常量派生，源码零主库/
   用户路径字面量）；模块级惰性单例连接（首次调用 `ensureSandbox()` 后
   `new Database(SQLITE_DB)`，句柄缓存到进程退出，不注册停机钩子）；query 走
   prepare→reader 门→iterate 限幅（MAX_ROWS=100，单元格 ≤512 字符文本化 + '…'
   截断，返回 {rows,truncated}）；execute 走 total_changes 差值 + exec 多语句
   （返回 {changes,lastInsertRowid}，lastInsertRowid 以 SQL 读回）。
2. **SQL 越界防护黑名单**（0020 SPEC §3.2）：`/\b(attach|detach|pragma|vacuum)\b/i`
   全文 token 扫描 + `/\bload_extension\s*\(/i` 调用面，任一命中 throw 如实错误
   （消息含「沙箱」语义，对齐 safePath 风格）；PRAGMA 全量拒绝（实证 #12 文件级
   向量为据，schema 自省走 sqlite_master）；错误呈现 throw（与 filesystem 三工具
   safePath 异常语义同构，llm.ts 零改动下模型可读错误文本自我纠正）。
3. **TOOL_SPECS 摘标记**（0020 SPEC §3.5）：sqlite 两行 desc 改为含「沙箱数据库」
   限定语的真实语义字面量，schema 形态不变；`IMPL` 表 :59 行注释同步删「未实现」。
4. **mcp-stubs.mjs 口径联动 + M12-M17**（0020 SPEC §4.1/§4.2）：§4.1 联动清单
   逐处更新（M03 3/3、M04 9/9、M05 3/3、M06 9/9、M07 三向、文件头注释四行、
   FROZEN impl:true）；M12-M17 六断言（多语句计数/文本化往返/限幅/越界七探针
   矩阵含词边界反例护栏/计数如实/副产自清+主库隔离快照）——桌面设计 0020 SPEC
   §4.2 全文在档即拿即用，SPEC 阶段按当前文件行号刷新锚点。
5. **重试写探针前置**（REQ-0026-01）：BUILD 开工第一步以最小 exec 形态探针 Edit
   验证 Mimosa warn 档位确实生效，通过后方进正式实现。

**不做（out of scope，沿 0020 SPEC §7 明确不改清单）**：

- `apps/server/src/llm.ts` 零字节（路由/计数/日志全动态，翻真自动生效；M08-M11
  源锁原样绿）；`tests/smoke/smoke-server.mjs` 零字节（M 组挂接点 :300-302 既有）。
- browser 三工具维持 stub（ADR-0011 结论=近期不实施，维持 stub 如实降级为默认
  终态；M03/M05 口径更新后恰为其独立守护面）。
- 不做 SQL 解析器/白名单方言校验；不提供任何指定 DB 路径的参数；不 ATTACH/
  复制/读写主库；不新增 env/依赖/出站类别。
- `packages/shared/**`、`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、
  `.github/**`、根/子包 `package.json`/`package-lock.json`、`README.md` 零改动；
  `npm run gate:update` / golden 任何接触（非修宪轮；POLICY 禁止区）。
- AGENTS.md「现 84 断言」口径漂移（0019 OBS 已知存量）留治理日文档批处理，本轮
  不夹带。

## 受影响文件清单（= 产品提交白名单；SPEC 阶段定稿）

| 文件 | 动作 | 预算（行） |
| --- | --- | --- |
| `apps/server/src/tools.ts` | sqlite 基建块 + IMPL['sqlite'] 真实现 + TOOL_SPECS 两行摘标记 | 119 → ~167（≤190，0020 SPEC §3.6 预算 +2 行注释基线差） |
| `tests/smoke/mcp-stubs.mjs` | §4.1 联动清单逐处更新 + M12-M17 新增 | 133 → ~240（≤260，0020 SPEC §5 预算原样） |

零改动白名单：`apps/server/src/` 其余全部模块（llm/store/server/handlers/guard/
search/code/mcp/\* 等）、`apps/server/package.json` 与 `package-lock.json`（零新
依赖——better-sqlite3 既有）、`packages/shared/**`、`apps/web/**`、
`tools/pixel-gate/**`、`.github/**`、`tests/golden/**`、其余既有测试文件
（smoke-server/lib/transport/registry/inject/canvas/shutdown 等）。

## 验收标准（Given/When/Then）

- **AC1 · 真实往返与限幅（M12-M14）**：Given `npm run build:server` 后离线直驱
  `collectTools({sqlite:['query','execute']})`，When execute 多语句（建表+2 插入）
  后 query 查回、再以 CTE 插入 105 行查询全表、插入 600 字符单元格查询，Then
  载荷 deepEqual `{changes:2,lastInsertRowid:2}` 与 `{rows:[{id:'1',…},{id:'2',…}],
  truncated:false}`（整数列文本化）、全表 `rows.length===100 && truncated===true`、
  单元格 === `'x'.repeat(512)+'…'`；全程无 `not implemented`。
- **AC2 · 越界拒绝与沙箱锚定（M15/M17）**：When 以 ATTACH 绝对路径 / ATTACH
  data/agentflow.db / 注释引导+小写 attach / VACUUM INTO 沙箱外路径 / PRAGMA
  temp_store_directory / load_extension 六探针调用，Then 逐条 throw 且消息含
  「沙箱」、绝不返回成功载荷；反例护栏 `VALUES('vacuum_log 备忘')` 成功（词边界
  不误伤）；结束后沙箱外探针文件不存在、`data/agentflow.db` 存在性与段首快照
  一致、测试表 DROP 后 sqlite_master 计数为 0。
- **AC3 · 计数如实（M16）**：When UPDATE 命中 / 未命中 / DELETE 定命三路调用，
  Then changes 分别为 1 / 0 / 1（与执行序无关的确定性判据）。
- **AC4 · 反演红绿双向**：When 临时把 `IMPL.sqlite` 改回 null（一行）→ build →
  `npm run smoke:server`，Then M12-M17 全 FAIL 且 exit 1（输出重定向落盘取
  `$?`，沿 0019 纠正口径）；逐字还原 → 复绿 0 failed → `git diff` 与反演前
  逐字节相同、零残留。
- **AC5 · 口径联动与提交不变式**：When 核对 mcp-stubs.mjs §4.1 联动清单逐处
  （M03 3/3、M04 9/9、M05 3/3、M06 9/9、M07 三向、FROZEN impl:true、文件头注释），
  Then 漏改即红（M07 防漂移设计意图）且全部更新到位；产品提交恰一个
  （Conventional Commits，如 `feat(server): BK-0008 sqlite MCP 工具真实接入——
  沙箱锚定 + SQL 越界黑名单 + M12-M17 行为断言`），`git show --numstat` 输出恰
  上表两路径；`git diff -- packages/shared apps/web tools/pixel-gate .github
  package.json package-lock.json` 恒空（零依赖机器证明）。
- **AC6 · 回归与门禁**：When `npm run smoke:server` + `npm test` + `npm run gate`
  执行，Then smoke 0 failed（预期 95 passed = 现基线 89 + M12-M17 净增 6；C 组
  动态行记实得值，判据 0 failed——沿 0009 SPEC §6.2 口径）+ 契约测试全绿 +
  gate 8 场景 diffPx=0（纯后端回归面）。
- **AC7 · 重试前置兑现与指针抽样**：Given BACKLOG.md:59 行内义务「重试轮 BUILD
  前先用只读探针确认新档位确实生效，仍拦则再升级勿硬闯」，When BUILD 会话开工，
  Then 先完成写探针（含 exec 命名调用形态的最小 Edit）且结果记入 JOURNAL
  （PLAN 侧只读探针已在本 PRD 存证）；VERIFY 从 PRD/SPEC 引用指针抽样 ≥5 条
  逐一打开比对（建议：tools.ts:59/:97-98、mcp-stubs.mjs:30/:100-108、
  store.ts:21、app.js:103-114 任五）。

## 非功能要求

1. 行数预算：tools.ts ≤190 / mcp-stubs.mjs ≤260（0020 SPEC §5，新文件无——
   零新文件，符合 AGENTS.md 硬性约定 4）。
2. **零新依赖 / 零新 env / 零出站类别 / 零 shared 契约 / 零 UI 接触**
   （POLICY 自主区五零口径；lock 文件零变化为机器证明）。
3. 同步执行边界如实声明（0020 SPEC §8.2）：better-sqlite3 同步 API，query 侧
   iterate+100 行早停 + 单元格 512 截断压缩可达面；worker 线程隔离超 M 尺寸，
   沿 BK-0011「双实例」先例明示边界照案不测。
4. 黑名单不完备性如实声明（0020 SPEC §8.1）：枚举面 = 实证四向量，沙箱锚定为
   第二道兜底，不做完备性虚称。
5. 全程禁 `npm run gate:update` / golden 零接触（POLICY 禁止区）。
6. 回滚 = `git revert` 单提交（无数据迁移 / 契约改动 / 依赖变化；沙箱内
   mcp-sqlite.db 为 gitignored 运行产物，不影响回滚正确性）。
7. EOL 纪律：改动文件维持既有 EOL 形态，无 BOM。

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| Mimosa 钩子仍拦 exec 形态（0020 全档事故事件，warn 档位未生效场景） | BUILD 开工第一步写探针（REQ-0026-01/AC7）；仍 hard-block → 立即停止、零产品残留、escalate（沿 0020 §3.5-§3.6 裁决纪律），**不硬闯、不换写入通道、不别名混淆** |
| 黑名单不完备（无 SQL 解析器） | 枚举面=实证四向量 + 全文 token 扫描覆盖注释/小写/次语句变体；沙箱锚定第二道兜底；残余风险 PRD/SPEC 如实声明（非功能 4） |
| 同步执行阻塞事件循环 | query iterate+100 行早停不整表物化 + 单元格 512 截断 + PRAGMA 全拒压缩可达面；边界照案声明（非功能 3） |
| 期望计数硬编码漂移（M03-M07 联动多处） | §4.1 联动清单逐处列明（0020 SPEC 原表），漏改即 M03-M07 红——防漂移即设计意图；VERIFY 逐条对照（AC5） |
| smoke V09 时点性假红（产品提交前 git 半边必红，0018/0021/0022/0024 先例） | 本轮独立冒烟文件 mcp-stubs.mjs 由 smoke-server.mjs 统一挂载，仍可能涉 V09；沿先例口径：提交后 CLOSE 复跑自愈，VERIFY 记实得值判据 0 failed |
| >2^53 整数精度损失（实证 #11） | 文本化如实呈现转换后值（非伪造），边界声明；精确大整数留后续提案（非目标） |

## 需求清单（REQ-0026-xx）

- REQ-0026-01：BUILD 开工前置——写探针验证 Mimosa warn 档位生效（只读半段本
  PRD 已存证；结果记 JOURNAL；仍拦即停+escalate，AC7）。
- REQ-0026-02：落地「做」1~3（IMPL 真实现 + 黑名单 + 摘标记），行数预算达标
  （AC1/AC2/AC3/AC5）。
- REQ-0026-03：落地「做」4（mcp-stubs.mjs 联动清单 + M12-M17 六断言），SPEC 按
  当前 HEAD 刷新锚点（AC1/AC2/AC3/AC5）。
- REQ-0026-04：边界不变式——llm.ts/smoke-server.mjs 零字节、browser 维持 stub、
  零新依赖/env/出站、零 shared、零 UI（AC5/AC6）。
- REQ-0026-05：产品提交恰一个（Conventional Commits），白名单 = 受影响文件清单
  两路径；反演红绿双向（AC4）；BACKLOG 备注回写随归档提交（机制件，与
  0011~0025 同机制）；来源非 issue 无回执义务。

## SPEC 阶段衔接说明

BK-0008 为 M 项，**不免 SPEC（skipSpec=false）**。SPEC 以 0020 存档
（iterations/0020/SPEC.md）为基线**复核后定稿**：① 逐节对照当前 HEAD 刷新基线
（tools.ts 117→119 行、collectTools 行号 :105-116→:108-119、其余锚点 SPEC 亲核
重算）；② §4.1 联动清单「现文」列与本会话 Read 结果逐字核对一致性已预验（本
PRD 背景 2），SPEC 定稿沿用；③ §2.2 十二探针与 §2.3 ai@7 语义可直接复引（行为
面未变——better-sqlite3 版本未动、ai@7 未动，SPEC 复核 version 字段确认）；④
M12-M17 设计原文复用。新架构决策：无（needsAdr=false——0020 SPEC 同款判据：既有
架构模式内的实现补全，零新依赖/零新 env/零出站/零契约/零 UI，POLICY 自主区）；
若写探针复测发现钩子行为与 warn 档位语义不符，升级回协调者处置，不静默偏离。
