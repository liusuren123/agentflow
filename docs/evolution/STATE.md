# 进化状态（唯一事实源）

> 本文件由协调者（及其派发的阶段 agent 按契约）更新；字段定义见 WORKFLOW.md §3.1。
> 任何定时唤起/新会话均以本文件为循环状态的唯一依据。

```yaml
iteration: 0053      # 当前/下一个迭代号（CLOSE 时 +1）
phase: idle      # idle | PLAN | SPEC | BUILD | VERIFY | CLOSE | stuck
item: -       # 处理中的 BACKLOG 项 ID（idle 时为 `-`）
started: 2026-10-26 13:47  # 本次迭代开始时间
updated: 2026-10-27 00:44  # 最近更新时间
repair_round: 0     # VERIFY→BUILD 修复轮次（上限 2）
last_result: 迭代 0053 首次启动（2026-10-26 16:25 工作流 dwfrun-0b4862c5）未开工即中止：工作树基线像素门禁红 1 场景（场景名因门禁输出截断未辨、两树 diff/ 均未留档即清理）——同 commit 主干基线 3 分钟前全绿（该运行阶段 1 亲证），判 issue #12 本机亚像素抖动间歇形态非代码差异（2026-10-26 深夜三连咬：治理首跑 / 合并复测 / 本轮工作树基线）；协调者连夜加固进化工作流（.zcode/workflows/evolution-iteration.dwf.ts：①基线 gate 红→抖动重试至多 2 次共 3 次、任一绿即过、系统性 3 连红仍熔断 ②合并仲裁员复测提示词补「仅单场景像素红且 DOM 不变量全过→复跑一次双留档以复跑为准」例外，大/小合并两路），STATE 复位 idle 待重启迭代 0053（BK-0041 diff 审查页为 ready 队列唯一 P0 首选）；0036（BK-0040 工作台右栏+git 页）已于本日经合并仲裁入主干并 CLOSE（分支补提交 a820b1d / 合并 85067b6 / s12→s16 改名 / 主干复测四绿 gate 17 场景·smoke 138/0 / CI run 40358512285 双 success / BK-0041 晋升 ready），详见 git 历史本文件 00:19 版与 docs/evolution/iterations/0036/{MERGE.md,evidence/}
```
