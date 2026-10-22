# 进化度量

> CLOSE 时由协调者追加一行；周度治理汇总趋势。口径见 WORKFLOW.md §7。

| 日期 | 迭代 | 项 | 结果 | gate | 测试 | 行数± | bug 发现/修复 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-10-22 | 0001 | BK-0001 | blocked | 4 场景 diffPx=0（工作流脚本门禁执行通过 + VERIFY 佐证，REPORT.md V1–V2） | 5/5（工作流脚本门禁执行通过，REPORT.md V3；VERIFY 未亲跑） | +24/−10（ROADMAP.md，`git diff --numstat` 实查；产品提交为空） | 0/0 | 来源主题 T1·移植收尾与骨架一致性（ROADMAP.md:9）；防打转校验判产品提交为空（docs/evolution 之外无改动）不予提交，实现改动已清理；VERIFY 本身 PASS，迭代产物见 iterations/0001/ |
| 2026-10-22 | 0002 | BK-0002 | done | 4 场景全绿（工作流脚本门禁执行通过；VERIFY 未亲跑 gate，REPORT.md §0/§1F） | test 5/5（脚本门禁通过，VERIFY 未亲跑）；smoke:server 亲跑两连跑 33 passed/0 failed、exit 0 + 负例 exit 1（REPORT.md §2.1–2.3） | +532/−0（package.json +1、lib.mjs +243、smoke-server.mjs +288，`git show --numstat` 79788a3 实查） | 0/0 | 来源主题 T2·质量基建（ROADMAP.md:39，T2-M2 落地）；产品提交 79788a3，VERIFY PASS 证据 iterations/0002/REPORT.md；2 项非阻断观察（Mimosa 钩子拦截 mv 致负例用临时目录等价法、库内历史 verify-smoke-* 行需按 ^smoke- 前缀判残留） |
