# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0031      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-25 13:54  # 本次迭代开始时间
updated: 2026-10-25 14:24  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0030 BK-0039 终态 done：ADR-0016 草案落盘 docs/adr/0016-workbench-right-panel-git-diff-tree.md（右栏容器三选一推荐 B 独立容器切换·#props 零触碰 + E1 git/E2 diff/E3 tree 只读端点契约与 git 白名单纪律 + §3.0 项目根零 env 模块级常量锚定（PRD cwd 案经 npm exec -w 实测否决）+ safePath 同构 + 0040→0041→0042 分批修宪编排 + golden 双通道预案，286 行 ≤400）+ BK-0040/0041/0042 定界回写 VERBATIM ×3，产品提交 c6a6b89 +286/−0 恰 1 路径，纯文档轮零代码/零依赖/零 UI/零 golden，VERIFY PASS 零 BUG（7/7 AC，smoke:server 95/0 + test:canvas 15/0 亲跑），证据 iterations/0030/REPORT.md；BK-0040/0041/0042 晋升条件就此满足（由心跳 PLAN 轮晋升，0040 容器先行；下轮选题预期按 ROADMAP:189-190 进 BK-9002 链实现段 BK-0033，BK-0036~0038 已 ready 亦可取）；issue#4 仅进度回执不关单（关单留 BK-0042 链终轮）
```
