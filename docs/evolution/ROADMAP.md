# AgentFlow 进化路线图

> 产品经理维护；心跳选题须可追溯至本图某主题。主题权重由周度治理依 metrics 趋势调整。
> 铁律：一切「触 UI=是」的候选只进 BACKLOG 待批准区，未经用户批准不得进入里程碑。

## T1 · 移植收尾与骨架一致性

React 机械移植（ADR-0002 系列）的收尾：等价 JSX 骨架覆盖度核对、legacy 命令式模块
边界清晰化、`apps/web/dist` 与 golden 基线的持续 1:1。**验收口径永远是 `npm run gate`
全绿，不是「看起来一样」。**

- 里程碑 M1：全部静态骨架等价 JSX 化（CP-C 已落地，剩余清单待 BK-0001 盘点确认）
- 里程碑 M2：legacy 模块与 React 骨架职责边界文档化（SPEC 产物）

## T2 · 质量基建

- 里程碑 M1：shared 契约测试防漂移覆盖全部 16 种节点 + SSE 事件全集
- 里程碑 M2：后端 E2E 冒烟脚本（`/api/v1` workflows/runs + SSE 全事件链）可一键执行
- 里程碑 M3：golden 场景扩充提案（触门禁基础设施，走待批准区）

## T3 · 后端执行能力

基于 Vercel AI SDK 7 引擎（ADR-0004）与 SQLite 持久化（ADR-0005）的节点能力进化：
新 handler、变量/表达式能力、检索与工具链增强。所有出站走 guard、沙箱与超时约束不变。

## T4 · 文档与治理

ADR 体系持续沉淀；`docs/evolution/` 机制自身按 WORKFLOW.md §6.3 迭代；
README 与 `docs/ai-sdk-7-功能汇总.md` 随实现同步。

---

## 待办（治理周维护）

- 首次心跳执行 BK-0001（现状盘点），据实细化各主题里程碑与完成度标注。
