# PRD · 迭代 0057 · BK-0045 PTY 交互终端节点 UI（修宪轮 · BK-9005 链终轮）

> **补录（2026-10-28 · 迭代 0061 重试轮代录）· 原件随 0057 工作树丢失（MERGE.md §1 留痕）**
> 本件由 code-developer 依在库证据结构等价重建，证据源逐条标注；
> **0057 期 PLAN 选题过程存证原始细节（占位核查快照、ready 队列现场等）不可复原
> （依 BACKLOG BK-0045 行述结构等价重建）**，禁杜撰处一律如实标注。

## 证据源映射（重建依据，全部在库）

| 内容块 | 证据源 |
| --- | --- |
| 立项范围/受影响文件/验收口径 | BACKLOG BK-0045 行（BACKLOG.md:66 受影响文件段、验收口径段） |
| 前置链与授权 | BK-0043 行（:64，迭代 0028 done·ADR-0014 落盘）+ BK-0044 行（:65，迭代 0055 done·issue#14 批复在案）+ 0056 晋升事实注 |
| 安全/定界权威 | docs/adr/0014-pty-terminal-security-world.md §7（BK-0044/0045 定界索引） |
| 实际交付面 | MERGE.md §1 改动面清单（19 文件）+ evidence/ |

## 结论（重建）

做（修宪轮，BK-9005 链终轮）：交付 PTY 交互终端节点的 UI 层——terminal NDP 定义
（packages/shared/src/nodes/terminal/）+ 画布终端节点 + 前端会话共享交互三件
（终端节点渲染 / 流式呈现 / 用户输入交互，@xterm/xterm ^6.0.0 随 issue#14 批复）。
授权链 = issue#5 批复承继 2026-10-23T15:49:06Z + ADR-0014（§7 定界）。

## 触 UI 分类结论（重建，依 BK-0045 行）

**是——修宪轮**：golden 增量 = 新场景 s19-terminal-panel-online（gate.mjs:565 在库）
+ 受波及场景 s3-library 重录（节点库新增 terminal 类目行，119528→118762 B，
MERGE.md 头注在案）。

## 需求与验收标准（重建，依 BK-0045 行验收口径段 + ADR-0014 §7）

- AC1 `npm run build` exit 0；
- AC2 `npm run gate` 增量后全绿（20 场景 diffPx=0，含 s19 新增与 s3 重录）；
- AC3 共享会话交互：**同一面板可见 agent 注入命令的回显**（用户与 agent 双写方
  共享同一 shell 会话，ADR-0014 §3 共享会话矩阵）；
- AC4 `npm test` 契约联动（NODES 21 目录 / baseline / README 生成器）零回退；
- AC5 `npm run smoke:server` 零回退 + PT 终端组扩充；
- AC6 手动 E2E 六点位：建会话 → 面板订阅 → agent 注入（M4）→ 回显 → 停止 →
  重开恢复回放（BK-0045 行「验收口径」段字面：建会话→用户键入→agent 注入→停止→恢复）。

## 风险（重建）

- SSE 契约护栏：PTY 流走端点私有事件面零 shared 改动，确需进 RunEventSchema 即
  中止转 needs-approval（BK-0045 行字面）；
- 修宪轮 golden 重录仅限 s19 新增 + s3 重录最小集。

## 附：结局指针（补录时点在库事实）

本迭代终态 **failed**（修复循环耗尽，BUG-0057-02）：失败要点、三证、重试定界全部
在案于 BACKLOG BK-0045 行「2026-10-28 迭代 0057 终态 failed」段；重试收口为迭代
0061（iterations/0061/PRD.md），其判别矩阵为本 PRD AC3/AC6 的机器化重建载体。
