# 进化循环决策权限表（POLICY）

> 定义哪些改动进化循环可自主执行、哪些必须开 `needs-approval` issue 等用户批复、
> 哪些绝对禁止。**用户可随时直接编辑本表**调整授权范围，改动即时生效（本表自身的
> 修订不需要 ADR / 治理周报流程——它就是你的授权界面）。
> 权威顺位：`CONSTITUTION.md` > `AGENTS.md` > `WORKFLOW.md` > 本表。
> 判定顺序：先查禁止区 → 再查需批准区 → 都不命中才落自主区。

## 自主区（默认放行，无需 issue）

- bug 修复（不触 UI、不改 shared 契约）
- 测试与回归基建（`tests/**`、smoke / canvas / 契约测试扩充）
- 后端能力演进（`apps/server/src/**`：handler / engine / tools / llm / search /
  store 等），限 guard 既有出站类别、不新增 npm 依赖
- 文档与实现同步（README / ADR 记述 / 边界文档）
- 性能与稳定性优化（零契约、零 UI 接触）
- 侦察与立项（五源扫描、BACKLOG 维护、issue 同步与回执）

## 需批准区（开 `needs-approval` issue，等用户评论「批准 / 驳回」）

- 任何 UI 三层改动（视觉 / DOM 结构 / CSS / 交互）——批准后走修宪通道：
  ADR 入 `docs/adr/` → 实现 → 同迭代重录 golden
- `packages/shared` DEFS 变更（节点类型 / 参数 / 默认值 / SSE 事件契约）
- golden 基线重录与 `tools/pixel-gate/` 改动
- 新增 npm 依赖、新增出站网络目标类别、新增环境变量语义
- CI 与 `.github/workflows` 变更
- `WORKFLOW.md` 协作契约的重大修订（治理周报提出 + 用户同意；用户会话内明示
  同意亦生效）

## 禁止区（任何情况下不做）

- 修改 `CONSTITUTION.md`、`AGENTS.md`（用户亲自修改）
- `npm run gate:update` / golden 重录出现在未获批准的迭代内
- 强制推送、绕过 Mimosa 提交钩子、密钥入库
- 以循环身份批复任何 `needs-approval` issue——批复只认用户本人评论
  （进化循环的 issue 评论一律带 🤖 前缀以示区分）
