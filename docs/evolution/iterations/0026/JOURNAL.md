# JOURNAL · 迭代 0026 · BK-0008 sqlite MCP 工具真实接入（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-25 03:18~03:24（本会话）
> 输入：PRD.md（REQ-0026-01…05 / AC1…AC7）+ SPEC.md（§3 三段式 / §4.1 联动清单 /
> §4.2 M12-M17 / §5 白名单）。全程零 UI 接触、零 gate:update、零新依赖/env/出站。

## 1. 重试前置兑现（REQ-0026-01 / AC7 写探针半段）

- 开工第一步即以**最小 `exec` 命名调用形态**的 Edit 探针（对 tools.ts 的首个
  改动即包含 `db.exec(q)` 行，随真实现一体落笔）：**Mimosa 钩子触发但仅 warn
  级**——编辑成功应用，未 hard-block。钩子上下文原文（要点）：
  「🔴 高危 · 命令注入 — 第 78 行 … 建议：别拼接 shell 命令，用参数列表」。
- **判定为 0020 同款启发式误报**：`db` 是 better-sqlite3 `Database` 实例
  （`db.exec` = 进程内 SQL 执行，store.ts:21 同库先例），全文件无任何 shell/
  子进程调用。用户 2026-10-24 三选一决策（两门降 warn，BACKLOG.md:59 / PRD
  背景 5）正是为放行此形态——故按既定决策选「保持原写法」（钩子选项 2），
  不改写、不别名混淆、不换写入通道。
- 结论：**warn 档位确实生效，前置义务兑现，正常进入实现**（PLAN 侧只读半段
  `echo $MIMOSA_HOOK_BLOCK` / `MIMOSA_GIT_GATE_MODE` = warn 已由 PRD 存证）。

## 2. tools.ts 实现（REQ-0026-02；SPEC §3.1-3.6 逐项落地）

- §3.1 DB 锚定：`SQLITE_DB = path.join(SANDBOX, 'mcp-sqlite.db')`（路径仅由
  SANDBOX 常量派生，源码零主库/用户路径字面量）；模块级惰性单例
  `let sdb: Database.Database | null = null`，`getDb()` 首调
  `ensureSandbox()` 后 `new Database(SQLITE_DB)`，句柄缓存到进程退出，零停机
  钩子、零启动 PRAGMA。
- §3.2 黑名单：`SQL_DENY = /\b(attach|detach|pragma|vacuum)\b/i` +
  `SQL_DENY_FN = /\bload_extension\s*\(/i`，对原始 SQL 全文扫描，任一命中
  throw `SQL 越界：ATTACH/DETACH/PRAGMA/VACUUM/扩展加载被拒（sqlite 工具仅允许
  操作沙箱专用数据库）`（含「沙箱」，对齐 safePath 风格）。
- §3.3 契约：`MAX_ROWS=100`（iterate 早停，不整表物化）+ `MAX_CELL=512`
  （单元格文本化 + `'…'` 截断；null→null、number/bigint→String、Buffer→utf8）；
  query 走 `prepare→stmt.reader 门→iterate`（非行集语句 throw 指引改用
  execute）；execute 走 `total_changes()` 差值 + `SELECT last_insert_rowid()`
  读回（辅助语句均为编译期字面量）；入参空串/非字符串 throw 如实错误。
- §3.5 TOOL_SPECS 两行按 SPEC 目标字面量逐字落盘（含「沙箱数据库」限定语，
  schema 形态不变）；IMPL 表 `'sqlite': null` 行内「未实现」注释随翻真删除。
- §3.7 SQL 组装纪律：模型传入 SQL 原样透传 prepare/exec，产品代码零拼装、
  零插值；黑名单为纯正则只读校验。
- 规模：119 → **175 行**（预算 ≤190 ✓）；`npm run build:server`（tsc）编译
  零错误（本会话实跑）。

## 3. mcp-stubs.mjs 联动与 M12-M17（REQ-0026-03；SPEC §4.1/§4.2）

- §4.1 联动清单 16 处逐条落位：文件头 :2/:5/:6（M01-M11→M01-M17、sqlite 直驱
  声明）、:23-26 注释块（已接入实况 + 三处同步义务保留）、:30 FROZEN
  `impl:true`、M03 3/3、M04 9/9（含 sqlite.query/execute 命名）、M05 3/3（ctx
  收敛 browser）、M06 9/9（ctx 加 sqlite；仅类型面检查边界照案）、M07 注释
  刷新为已执行轮。
- §4.2 M12-M17 六断言全部经 `collectTools({sqlite:[query,execute]})` 通道
  离线直驱 dist/tools.js：M12 多语句 `{changes:2,lastInsertRowid:2}`、M13
  整数列文本化往返、M14 限幅（105 行 CTE→100 行 truncated + 600 字符→512+…）、
  M15 越界七探针（6 拒绝消息含「沙箱」+ vacuum_log 词边界反例）、M16 计数
  1/0/1、M17 副产自清（探针不存在 + 主库快照一致 + sqlite_master 归零 + 卫生
  兜底）。前置夹具（探针预清 + 主库快照）与 Windows 正斜杠纪律照 SPEC。
- 规模：133 → **216 行**（预算 ≤260 ✓）。

### 3.1 实现期两处 SPEC 桌面设计微调（等价范围内，如实记录）

1. **M14 CTE id 错段**：SPEC §4.2 原文「CTE 一句插入 105 行」未指定 id 段，
   首版按 `SELECT x,'n'||x` 直插 x=1..105 与 M12 既有 id 1/2 撞 UNIQUE
   （自检实跑抓出 SqliteError）。修正为 `SELECT x+2000,'n'||x`（id 2001..2105，
   避开 1/2/999/1000；name 仍 n1..n105，M16 `DELETE name='n7'` 定命性不变，
   changes=105 语义不变）。
2. **M12 幂等化**：多语句前置 `DROP TABLE IF EXISTS mcp_smoke_t;`（SPEC §4.2
   前置夹具「段首执行 DROP（幂等）」以同语句并入 M12 载荷实现，DROP 不计
   changes，期望值 2 不变）——防历史残留（如上次运行中断于 M14 后）误红。

### 3.2 SPEC 未列明的两处一致性小改（联动清单外，边界内）

- M01 消息「M02-M07 行为断言前提」→「M02-M07、M12-M17 行为断言前提」（dist
  现亦为 M12-M17 前提，措辞如实化；判据语义零变化）。
- dist 不可用分支的 FAIL 循环由 M02-M07 扩至含 M12-M17（文件头既有教义
  「缺产物即 FAIL 并给可操作报错，绝不静默跳过」的一致性延伸）。

## 4. 自检（本会话实跑；完整门禁 build/gate/test/smoke 与提交由脚本统一执行）

| 检查 | 命令（本会话实跑） | 结果 |
| --- | --- | --- |
| TS 编译 | `npm run build:server` | 0 错误 |
| M 组离线直驱 | 临时脚本（OS temp，仓库外）import `runMcpChecks` + `Checker` 直跑 | **M01-M17 17/17 PASS，exit 0**（含 M08-M11 llm.ts 源锁 4 条原样绿） |
| 沙箱副产 | `ls apps/server/sandbox/` | 仅 `mcp-sqlite.db`（.gitignore:16 覆盖，`git status` 不显） |
| 探针残留 | 仓库根 glob `*probe*` | 无（M17 卫生清理生效） |
| 主库隔离 | M17 断言内 `existsSync(data/agentflow.db)` 与段首快照比对 | 一致（未创建/未触碰） |
| 白名单 | `git status --porcelain` | 恰 `apps/server/src/tools.ts` + `tests/smoke/mcp-stubs.mjs` + STATE.md + iterations/0026/（llm.ts/smoke-server.mjs/lock/shared/web/golden 零触碰） |
| 行数预算 | `wc -l` | tools.ts 175（≤190）/ mcp-stubs.mjs 216（≤260） |

未做（明确移交）：AC4 反演红侧（IMPL.sqlite 临时回 null）按 SPEC §9.3 归
VERIFY 执行；`npm run build/gate/test` + `npm run smoke:server` 完整门禁与
产品提交归工作流脚本统一执行（本轮指令明示，BUILD 不代跑）。

## 5. 边界不变式核对（REQ-0026-04）

- llm.ts / smoke-server.mjs / mcp/* / store.ts / server.ts：零字节改动
  （git status 机器证明）；M08-M11 源锁正则对现行 llm.ts 逐条命中（自检实跑
  4/4 PASS）——sqlite 翻真后 stub/真实路由、stubCount、✓ 摘要全动态自动生效。
- browser 三工具维持 stub（ADR-0011 终态）；M03/M05 新口径恰为其独立守护面。
- 零新依赖（better-sqlite3 既有 `^12.11.1`，lock 零触碰）、零新 env、零出站
  类别（better-sqlite3 进程内库，不经 guard 面）、零 shared 契约、零 UI 接触
  （apps/web/**、tools/pixel-gate/**、tests/golden/**、.github/** 零触碰，
  全程未运行 gate:update）。
- inject.ts 会话层「绝不覆写非 stub」执法对翻真后的 sqlite 自动生效（零改动）。
