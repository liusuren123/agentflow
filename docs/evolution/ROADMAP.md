# AgentFlow 进化路线图

> 产品经理维护；心跳选题须可追溯至本图某主题。主题权重由周度治理依 metrics 趋势调整。
> 铁律：一切「触 UI=是」的候选只进 BACKLOG 待批准区，未经用户批准不得进入里程碑。
> 完成度标注口径（2026-10-22 周度治理核定）：已完成 = 有可复现证据（命令输出 / ADR 实施
> 记录 / 文件现状）；部分完成 = 证据仅覆盖部分验收点；未开始 = 无证据。禁止以「看起来一致」
> 作为任何判定依据。

## T1 · 移植收尾与骨架一致性

React 机械移植（ADR-0002 系列）的收尾：等价 JSX 骨架覆盖度核对、legacy 命令式模块
边界清晰化、`apps/web/dist` 与 golden 基线的持续 1:1。**验收口径永远是 `npm run gate`
全绿，不是「看起来一样」。**

- 里程碑 M1 · 全部静态骨架等价 JSX 化
  - 状态：**已落地，待 BK-0001 交叉核对手工关账**（证据：ADR-0002 实施记录 CP-B/CP-D/
    CP-C 均于 2026-10-21 完成、每步 4 场景 diffPx=0；`apps/web/src/Skeleton.tsx` 为唯一
    骨架源，skeleton.html 已退役）
  - 关账验收：`npm run build && npm run gate` 4 场景 diffPx=0；`npm test` 5/5；
    BK-0001 盘点确认 `apps/web/src` 无 `?raw` / `dangerouslySetInnerHTML` 残留注入路径
- 里程碑 M2 · legacy 模块与 React 骨架职责边界文档化
  - 状态：未开始（无边界文档产物）
  - 验收：边界说明文档合入 `docs/`（明确三块——Skeleton.tsx 只承载静态骨架；
    `src/legacy/app.js` 画布/交互命令式；`src/server-sync.js` 数据接入、不操作面板 DOM）；
    合入后 `npm run gate` 仍 4 场景全绿（文档变更不得触碰渲染路径）

## T2 · 质量基建

- 里程碑 M1 · shared 契约测试防漂移覆盖全部 16 种节点 + SSE 事件全集
  - 状态：**部分完成**（证据：`packages/shared/test/contract.test.mjs` 现有 5 测试——
    16 节点字段齐全 / 端口类型合法 / 默认值抽样 6 处（33 参数中） / 15 事件样本回放 /
    legacy 从 shared 导入；缺口：①默认值仅覆盖 4/16 种节点；②后端 HANDLERS 键集与
    NODES 注册表一致性零防护——`apps/server/src/engine.ts` 对缺 handler 静默回退
    `__pass`；③事件契约反例仅 2 条）
  - 验收：`npm test` 全绿且新增断言：paramDefaultsOf 对 16 种节点全部 33 参数逐一断言；
    HANDLERS 键集 ⊇ NODES 键集；事件反例覆盖主要字段型错误（承载项 BK-0003）
- 里程碑 M2 · 后端 E2E 冒烟脚本一键执行
  - 状态：未开始（证据：仓库无服务端自动化测试，ADR-0007 §2 明文「服务端至今无测试
    基建」，历次端点验证均为手工 curl / 一次性 E2E）
  - 验收：一键命令（建议 `npm run smoke:server`，脚本落 `tests/`）对真实进程断言：
    workflows PUT/GET/DELETE 往返与 404；runs 列表/详情回放 seq 升序；活动 run 删除
    409；SSE 流出现 run:accepted → run:start → node:start → node:done → run:done
    有序序列；任一断言失败退出码非 0（承载项 BK-0002）
- 里程碑 M3 · golden 场景扩充提案（s4 工作流面板在线态 / s5 历史面板）
  - 状态：未开始；**触门禁基础设施**——golden 基线受宪法第 2/3 条与 WORKFLOW §6 护栏
    2/3 保护，实现须用户批准后走宪法第 3 条全流程
  - 验收（仅提案阶段）：ADR 草案产出并入 BACKLOG 待批准区，含新场景步骤定义与
    影响面（承载项 BK-0010）

## T3 · 后端执行能力

基于 Vercel AI SDK 7 引擎（ADR-0004）与 SQLite 持久化（ADR-0005）的节点能力进化：
handler、变量/表达式、检索与工具链增强。所有出站走 guard、沙箱与超时约束不变。
**硬边界：`packages/shared/src/nodes.ts` 的 DEFS（名称/参数/默认值/关键词）是宪法
保护对象——T3 一切演进只改后端实现（handler/engine/tools），不改 DEFS 呈现性字段；
需要新节点或新参数即触 UI，只能走待批准区。**

现状基线（2026-10-22 核对）：16 种 handler 全部实装（`apps/server/src/handlers.ts` +
`llm.ts`）；MCP 工具 filesystem/fetch/web-search 真实实现，sqlite/browser 如实降级
`not implemented`（`tools.ts`）；websearch 的 eng 参数当前被后端完全忽略。

- 里程碑 M1 · websearch 引擎参数生效化：eng=博查 走 BOCHA_API_KEY；eng=SearXNG 走
  新增可选 env `SEARXNG_URL`（config zod 校验、缺省合法）；Bing/Google 未接入时
  out 摘要与日志如实标注。验收：冒烟断言 engine 随 eng 切换；`npm run gate`
  4 场景全绿（零前端改动）（承载项 BK-0007）
- 里程碑 M2 · sqlite MCP 工具沙箱接入：sqlite.query/execute 真实实现，DB 文件锚定
  `apps/server/sandbox/`，拒绝越界路径。验收：工具返回不再含 not implemented；
  sandbox 外路径被拒；gate 全绿（承载项 BK-0008，依赖 T2-M2 先行）
- 里程碑 M3 · browser MCP 工具可行性评估：仅产出 ADR 草案（Playwright headless 资源
  预算 / 并发与超时约束 / 明确放弃条件），不实现。验收：草案存在于 `docs/adr/`
  （承载项 BK-0009）

## T4 · 文档与治理

ADR 体系持续沉淀；`docs/evolution/` 机制自身按 WORKFLOW.md §6 护栏第 3 条迭代；
README 与 `docs/ai-sdk-7-功能汇总.md` 随实现同步。

- 里程碑 M1 · 进化闭环首跑：状态未开始（STATE=idle 等首次心跳，metrics 空表）。
  验收：`docs/evolution/metrics.md` 出现首行；`docs/evolution/iterations/0001/` 四产物
  （PRD/SPEC/REPORT/JOURNAL）齐全并随归档提交入库
- 里程碑 M2 · 文档与实现同步：**部分完成**（证据 2026-10-22 核实：README「持久化与
  部署」节止于 ADR-0005，无 DELETE 端点与 ADR-0006/0007 前端能力记述）。
  验收：README 补齐 DELETE 端点行与服务端工作流分组/历史回放/删除入口能力描述
  （承载项 BK-0006）；`docs/ai-sdk-7-功能汇总.md` 与 `apps/server/src/llm.ts`
  实装 API 抽查一致
- 里程碑 M3 · 治理节奏成型：验收：自 `docs/evolution/weekly/43.md`（本次治理）起，
  每个治理日产出周报且含 metrics 趋势、待批准清单、风险三节；连续两周缺席即视为
  治理失效信号，在周报显著标注

---

## 待办（治理周维护）

- 迭代 0001 首跳取 BK-0001（P0/doc/S）；其关账结论回写本图完成度标注。
- ready 队列 2026-10-22 补至 6 项（BK-0001/0002/0003/0004/0006/0007），预计支撑至
  下个治理日；枯竭时心跳按 WORKFLOW §4 转「补题」。
- 待批准区现 1 项（BK-9001 日志级别过滤），等待用户批复或驳回；不催办、不代批。
