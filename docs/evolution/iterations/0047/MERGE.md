# 迭代 0047 · 合并仲裁与主干复测 — BK-0056 server.ts 头注路由清单同步

> MERGE 轮产物（WORKFLOW.md §4 MERGE 契约，执行者 merge-arbiter）。
> 环境：主干 main（合并前 HEAD=c6c0311，`git status` 亲核干净），
> Node v24.21.0 / win32 / Git Bash；会话时间 2026-10-26 10:13–10:19。

## 1. 合并结果

- 命令：`git merge --no-ff feat/0047-iter -m "merge(evolution): 合并迭代 0047 server.ts 头注路由清单同步：补 /api/v1/sessions 五端点行 + v1-only 括注补全"`
- 结果：**exit 0，ort 策略自动合并，零冲突**。冲突清单为空，无逐文件仲裁记录。
- 合并提交：**16e538e**（主干领先 origin/main 21 个提交，未推送——推送归用户/后续流程）。
- 合并面（`git diff 16e538e^1 16e538e --stat` 亲核）：
  - 产品面恰 1 文件：`apps/server/src/server.ts` +3/−1，全部位于 `/* … */`
    块注释头注区（新增 :13-14 两行 sessions 五端点行 + :16 v1-only 括注
    「workflows/runs」→「workflows/runs/sessions/capabilities」），零代码行变化；
  - 机制面：`docs/evolution/BACKLOG.md`（BK-0056 新行）+
    `docs/evolution/iterations/0047/{PRD,JOURNAL,REPORT}.md`（新建）。
- 合并后头注亲核（`sed -n '1,20p' apps/server/src/server.ts`）：sessions
  五端点两行与 v1-only 括注补全均在位，capabilities 行原样保留。

## 2. 冲突清单与处理方式

无冲突（ort 自动合并完成，未检出任何冲突文件）。STATE.md / metrics.md /
BACKLOG.md / iterations/** 均无两侧并发改动；最终记账（STATE / metrics /
BACKLOG 终态）按 WORKFLOW.md §3.1 归 CLOSE 轮，不在本轮。

## 3. 主干端到端复测（四项实跑，退出码为准）

| 项 | 命令 | 退出码 | 关键输出 | 日志 |
| --- | --- | --- | --- | --- |
| 构建 | `npm run build` | **0** | vite：69 modules transformed，dist/index.html 362.51 kB（gzip 109.69 kB），✓ built in 705ms | evidence/build.log |
| 宪法门禁 | `npm run gate` | **0**（二次采样） | 16/16 场景 pass · diffPx=0（s0~s15 全绿，「宪法门禁：通过 ✓」） | evidence/gate.log（首跑红见 §3.1 与 gate-first-run.log） |
| 契约测试 | `npm test` | **0** | tests 30 / pass 30 / fail 0（含「20 键全量」快照常驻比对） | evidence/test.log |
| 后端冒烟 | `npm run smoke:server` | **0** | **133 passed / 0 failed**（含 sessions 五端点 G01–G10、capabilities CAP、C01–C04 清理零残留） | evidence/smoke.log |

### 3.1 门禁首跑 s3-library 红：环境侧采样抖动定性（未重录 golden）

首跑（evidence/gate-first-run.log，exit=1）：唯 **s3-library FAIL diffPx=23**，
其余 15 场景 diffPx=0。复跑（evidence/gate.log，exit=0）：16/16 diffPx=0。
定性为本机采样抖动而非本轮改动所致，四路依据：

1. **零因果**：合并对 `apps/web`、`packages/`、`tools/`、`tests/golden` 的 diff
   恒空（`git diff 16e538e^1 16e538e --stat -- apps/web apps/server packages tools
   tests` 亲核：仅 server.ts 注释 4 行，全在块注释内，零渲染路径接触）。
2. **首跑 15/16 全零**：若改动致变应全局性出现，非单场景 23px。
3. **同形态在案先例**：0037 MERGE §4.1（五次采样 0/23/0/21/0）、0039/0040
   合并后首跑 s3 diffPx=23、0041（预案命中）、0045（序列 21/21/0 终绿）——
   散点均位于左侧图标工具栏下缘 x≈15–30/y≈780–890，同一环境侧形态。
4. **复跑即绿且未消费任何放宽手段**：未运行 `gate:update`（本轮非重录轮，
   派发指令明示禁止）、未改门禁参数，仅原样重跑同一条命令。

golden 权威仍在 CI（windows-latest `ui-constitution`），本机差异仅参考
（CONSTITUTION 第 2 条 / AGENTS 已知陷阱）。

## 4. 证据清单（evidence/，manifest.json 含 4 场景 sha256）

- 日志：`build.log` / `gate.log`（终绿）/ `gate-first-run.log`（首跑 s3 红，
  如实保留）/ `test.log` / `smoke.log`
- 图像：`node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0047/evidence`
  （exit 0）产出 4 张确定性截图，渲染节点数均 19：
  `01-initial.png`（76884B）/ `02-node-selected.png`（91689B）/
  `03-settings.png`（94615B）/ `04-library.png`（119520B），另 `manifest.json`。

## 5. 结论

合并成功（16e538e，零冲突）；主干复测四项全绿（build 0 / gate 0（16/16）/
test 30/30 / smoke 133/0）；证据齐备于 `docs/evolution/iterations/0047/evidence/`。
VERIFY 结论（REPORT.md「PASS，零 BUG」）与主干实测一致。可进入 CLOSE 记账。
