# MERGE · 迭代 0066 · BK-0061（BK-0020 拆分 SPEC 先行：引擎 on-error 策略 env 语义清单与失败路径改造定界 + ADR 草案，纯文档轮）· 合并仲裁与主干复测

> 执行角色：merge-arbiter（MERGE 阶段）· 2026-10-29
> 输入：特性分支 `feat/0066-iter`（tip 05b032b，双提交：产品 271080f ADR-0022 + 机制件 05b032b）· 主干 main（合并前 137043f）
> 合并方式：`git merge --no-ff feat/0066-iter`（ort 策略，合并排他锁在案）

## 1. 合并结果

**成功，零冲突。** 合并提交 **`cd16c37`**（父：`137043f` 主干 + `05b032b` 分支 tip），提交信息
`merge(evolution): 合并迭代 0066 BK-0020 拆分 SPEC 先行：引擎 on-error 策略（重试/跳过/中止）env 语义清单与引擎失败路径改造定界 + ADR 草案（纯文档轮，触UI=否自主区）`。

合入面恰 5 路径 +722/−1（`git diff --stat main...feat/0066-iter` 与合并输出一致）：

| 路径 | 变化 | 性质 |
| --- | --- | --- |
| `docs/adr/0022-engine-onerror-policy-env.md` | +315（新建） | 产品面唯一产物（ADR 草案，315 行 ≤400） |
| `docs/evolution/BACKLOG.md` | 1 行回写（BK-0020 定界自 ADR-0022 §6） | 机制件 |
| `docs/evolution/iterations/0066/{PRD,JOURNAL,REPORT}.md` | +213/+108/+85（新建） | 机制件（迭代产物） |

**冲突清单：空**（`git diff --name-only --diff-filter=U` 零输出）。预检判断与实况一致：分支与主干
（merge-base 2f85347 之后的 137043f）虽同改 `docs/evolution/BACKLOG.md`，但分属不同行/hunk——
分支改 BK-0020（:117），主干改 BK-0063（:84，治理日置 done）——git ort 自动归并；REPORT.md §6-1
预警的「将呈机制件冲突」未成事实，ADR 目录 0017/0019 改名分叉亦零涉（分支未触既有 ADR）。

**解决方式自检（零冲突仍执行）**：

- 冲突标记 `<<<<<<<` / `=======` / `>>>>>>>` 在全部 5 个合入文件 grep 计数 = 0；
- BACKLOG 双侧行级归并验证（互为对照的 diff 各恰 1 行）：`git diff feat/0066-iter HEAD -- docs/evolution/BACKLOG.md` 仅 BK-0063 行（主干侧 done 推进保留）；`git diff 137043f HEAD -- docs/evolution/BACKLOG.md` 仅 BK-0020 行（分支侧定界回写保留）——两侧实质内容零丢失；
- BACKLOG 现 69 条 BK- 行，BK-0020（proposed + ADR-0022 §6 定界备注）/ BK-0061（ready，终态归 CLOSE）/ BK-0063（done）三行实读在位。

## 2. 主干端到端复测（四项全绿，逐项实跑）

主干工作树（合并后 cd16c37）逐条实跑，日志全量留证 `evidence/`：

| # | 命令 | 退出码 | 关键输出 | 日志 |
| --- | --- | --- | --- | --- |
| ① | `npm run build` | **0** | vite 72 modules transformed，dist/index.html 718.51 kB，built in 1.91s | `build.log` |
| ② | `npm run gate` | **0** | **21 场景全绿 diffPx=0**（s0~s20 逐场景 pass），DOM 不变量全过，「宪法门禁：通过 ✓」 | `gate.log` |
| ③ | `npm test` | **0** | tests 30 / pass 30 / fail 0（含快照常驻比对不变式 A 21 键逐字节等价） | `test.log` |
| ④ | `npm run smoke:server` | **0** | **168 passed / 0 failed**（= 0064 基线 157 + KB01~KB11 零漂移） | `smoke.log` |

**issue#12 抖动口径未触发**：gate 首跑即全绿（s3-library diffPx=0），无单场景像素红，未消费复跑预案，
`gate:update` 全程零消费、golden 零触碰（本轮纯文档轮，无重录权）。

## 3. 图像证据

`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0066/evidence` exit 0：
4 张确定性截图（1600×900，渲染节点 19）+ `manifest.json`（含逐张 sha256）：

- `01-initial.png`（76884B，sha256 c98852a5…）
- `02-node-selected.png`（91689B，sha256 51dc09c7…）
- `03-settings.png`（94615B，sha256 f20c748d…）
- `04-library.png`（118762B，sha256 3483b6a5…）

## 4. 结论与移交

**合并成功（cd16c37，零冲突）+ 主干复测四绿（build ✓ / gate 21 场景 diffPx=0 ✓ / test 30/30 ✓ / smoke 168/0 ✓）。**
迭代 0066 成果（ADR-0022 草案 + 迭代产物）已在主干存活，移交 CLOSE 最终记账（BACKLOG BK-0061 终态、
metrics 追加、STATE 收尾 idle、附录 A needs-approval issue 开立归脚本回执面）。

注：本文件与 `evidence/`（4 日志 + 4 PNG + manifest）为主干侧新增机制件，按派发指令写入未随合并提交
打包（合并提交先于复测产生）；随 CLOSE 归档提交入库。
