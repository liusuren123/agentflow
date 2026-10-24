# JOURNAL · 迭代 0019 · BK-0011（BUILD）

> 执行角色：code-developer · 2026-10-24 18:48~18:57 · 输入：本目录 PRD.md
> （S 项 skipSpec=true，受影响文件清单与验收口径内嵌 PRD REQ-0011-01~04 / AC1~AC7）。
> 门禁（build/gate/test/smoke）与 git 提交由工作流脚本统一执行，本阶段不自行运行
> （见 §4）。触 UI 分类结论维持 PRD「否」：改动面全部在 `apps/server/src/**` 与
> `tests/smoke/**`，`apps/web/**`/`packages/shared/**`/`tools/**`/golden 零字节触及，
> 无需扩大影响面，未触发停止条件。

## 1. 交付物（PRD 白名单三路径逐项）

| # | 产物 | 关键内容与证据（本会话实做/实跑） |
| --- | --- | --- |
| REQ-0011-01 | `apps/server/src/store.ts`（改） | ① `S` 表新增两条 prepared statement：`listDanglingRuns`（`SELECT id FROM runs WHERE status='running'`）与 `sweepRuns`（`UPDATE runs SET status='stopped' WHERE status='running'`，SET 列仅 status——ended_ms/done/total 原值不动）；② 事务⑤ `txSweepDanglingRuns = db.transaction((): string[] => …)`——SELECT+UPDATE **同事务**（防竞态窗口），返回命中 id 列表；③ 导出 `sweepDanglingRuns(): { count; ids }`。`wc -l` = **400 行**（基线 385，净增恰 15 ≤ 预算） |
| REQ-0011-02 | `apps/server/src/server.ts`（改） | import 追加 `sweepDanglingRuns`（行内改动零净增）；`initStore()` 之后、任何路由注册与 `app.listen` 之前调用：count>0 时 `logger.warn({count, ids: ids.slice(0,20)}, '启动扫尾：…')`（固定子串「启动扫尾」+ 数量 + ids 超长截断 20），count=0 不打。净增 6 行 ≤ 8 |
| REQ-0011-03 | `tests/smoke/smoke-server.mjs`（改） | Z01-Z04 断言组（+71 行 diff，含头部 Z 组说明块/模块级 `zSrv`/清理回路纳管）：**独立实例**（专用端口，不杀主实例）WFAPPR 挂起 run（`approval:required` 事件门，D 组同款）→ 击杀前 GET 采样 `status='running'`/`ended_ms=null`/events 长度 N → `child.kill('SIGKILL')` + `exitPromise` 等退出 → **同端口**重启（health 200 即扫尾完成时序门）→ GET 断言 `status='stopped'`、`ended_ms===null`、done/total 等于击杀前采样、events 仍恰 N 条（零伪造终结事件）、ringLog 含「启动扫尾」→ DELETE 200（无 409）+ GET 404 自清理。断言全程经 /api/v1（lib.mjs:12-13 边界，不直读 DB）。`node --check` 语法通过 |
| REQ-0011-04 | 产品提交白名单 | `git diff --stat` 预检：代码改动恰三路径（store.ts +15 / server.ts +8−1 / smoke-server.mjs +69−2）；`apps/web/**`、`packages/shared/**`、`tools/**`、`.github/**`、`package.json`/lock 零改动（零依赖）；STATE/JOURNAL 走归档提交通道（0011~0018 同机制）。正式核对（`git show --numstat`）归 AC5/VERIFY |

## 2. 修复前证据固化（AC1 前置采样，PRD 风险 2 处置）

本阶段 18:53 只读探针（better-sqlite3 readonly，与 PRD 背景 5 同款方法），冒烟尚未
运行、开发库现场仍在：

```
running_rows=1
{"id":"161ce4ff-0b87-40f2-ad4f-aba461975fdc","workflow_name":"智能客服助手",
 "status":"running","started_at":1792570720608,"ended_ms":null,"done":0,"total":8,
 "event_count":22,"last_event":"approval:required","last_seq":21}
```

与 PRD 背景 5 逐字段一致（同 id / 同 epoch / done=0 / total=8 / 22 事件 / 无终结
事件）。脚本门禁首次跑 smoke 后该行将被扫尾收敛——「修复前」证据以本节为准。
VERIFY 复核 AC1 时：该行应为 `status='stopped'`、ended_ms 仍 null、done/total 仍
0/8、run_events 仍 22 行（经 `GET /api/v1/runs/161ce4ff-0b87-40f2-ad4f-aba461975fdc`
断言，或等价只读探针）。

## 3. 决策与偏差

1. **store.ts 注释压缩**：初稿净增 17 行超预算 2 行，按 PRD 风险 4「压缩为最小
   形态」处置——删除事务⑤与导出函数的独立注释行，关键不变量（SELECT+UPDATE
   同事务、SET 仅 status、ended_ms/done/total 原值、事件零新增——不伪造历史）
   以 `txSweepDanglingRuns` 声明行的行内注释承载；语义零损失，落点 400 行恰达
   「改后 ≤ 400」边界。
2. **Z 组用独立实例而非主实例**：主实例是 C01/C03 清理与 G 组实例收尾断言的
   依赖，SIGKILL 主实例会破坏 finally 清理路径；专用端口实例 + 同端口重启同时
   满足 PRD「startServer 同端口重启」与隔离要求。三实例共享仓库根
   data/agentflow.db（store.ts ROOT 推导与 spawn cwd 无关），重启实例扫尾必然
   触达本组悬挂行——这正是被测语义。
3. **zRunId 纳入 CLEAN.runIds**：正常路径 Z04 已自删（C01 容忍 404，D06 先例）；
   失败路径 fail-fast 后 C01 经仍存活的主实例 DELETE 兜底（run 非主实例内存
   注册表成员，DELETE 可达 200）。
4. **AC2 零命中静默未加 Z 硬断言**：负断言依赖 dev DB 干净度（若历史失败冒烟
   遗留 running 行，Z 实例首启即 warn，负断言必假）；PRD REQ-0011-03 只列正
   断言，不夹带。AC2 按 PRD 口径由 VERIFY 主实例日志/重启行为验收。
5. **SQL 无参数化**：两条语句均为字面量条件（`status='running'`），无用户输入
   拼接，与 PRD 非功能要求 2 一致。

## 4. 未做 / 边界（如实）

- `npm run build` / `npm run gate` / `npm test` / `npm run smoke:server` **未自行
  运行**（派发指令：完整门禁由脚本统一执行）。已跑的自检均为非门禁项：
  `node --check tests/smoke/smoke-server.mjs`（语法 OK）、`wc -l`（行数预算）、
  `git diff --stat`（白名单预检）、只读 DB 探针（§2）。TS 侧以桌面复核替代编译
  （类型形态逐一对齐既有 txDeleteRun/patchRun/listRuns 先例）；AC4 反演（摘除
  扫尾复跑冒烟）归 VERIFY。
- 未触碰：`packages/shared/**`（'stopped' 为既有枚举值，DEFS/SSE 契约零涉及）、
  `apps/web/**`、`tools/**`、`.github/**`、`package.json`/lock（零依赖、零 env、
  零出站）。
- ROADMAP / metrics / BACKLOG 状态未动（CLOSE 职责）；BK-0011 行备注「started
  2026-10-20」口径差未改（PRD 非目标，治理日顺手项）。
- STATE.md：phase PLAN → BUILD、updated 18:57、last_result 回写本阶段结论。
