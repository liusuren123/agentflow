# 迭代 0070 · 合并与主干复测记录（MERGE）

> 合并仲裁员产出 · 2026-10-31 · 分支 `feat/0070-iter` → `main`

## 合并结果

- **合并方式**：主干工作区干净（`git status` clean，HEAD=`0922d25`）后执行
  `git merge --no-ff feat/0070-iter`，ort 策略直接完成。
- **合并提交**：`53bf3c68ee7c7fccae17068d07feafceead3c447`
- **特性分支提交**：`10bf122`（产品提交：BK-0048 节点级 on-error 参数）+ `87fe13b`（机制件：归档迭代 0070 产物与机制件）
- **变更规模**：98 files changed, 2193 insertions(+), 210 deletions(-)
  （产品：`apps/server/src/engine.ts`、21 类节点 `node.ts`/`README.md`、契约守护四件、
  golden 42 文件、`tests/smoke/smoke-server.mjs`；机制件：ADR-0025、BACKLOG 1 行、`iterations/0070/**`）

## 冲突清单与处理方式

**零冲突**。merge-base = 主干 HEAD（`0922d25`），主干自分支创建以来无新提交，
两侧无并发改动；本轮为单路迭代，无金场景号竞争、无集成收口计数校正需求。
分支未携带 `STATE.md`/`metrics.md` 改动（按 v3 记账约定由 CLOSE 阶段在主干侧完成），
仅 `BACKLOG.md` 1 行（BK-0048 随链状态）随分支干净合入。

## 主干端到端复测（实跑留证）

| 项 | 命令 | 退出码 | 结果 |
| --- | --- | --- | --- |
| build | `npm run build` | 0 | 绿（vite 72 modules，built in 1.91s） |
| gate | `npm run gate` | 0 | 绿（**首跑即全绿**：21/21 场景 pass · diffPx=0，宪法门禁通过 ✓；未触发 issue #12 抖动复跑通道） |
| test | `npm test` | 0 | 绿（30/30 pass，0 fail） |
| smoke | `npm run smoke:server` | 0 | 绿（**196 passed / 0 failed**，含本轮新增 OEN01-07 断言组全部 PASS，见 smoke.log:147-153） |

复测期间未放宽门禁、未重录 golden（`gate:update` 未运行；本轮 golden 42 文件重录
已在分支内按 ADR-0025 / issue#6 批复完成并随合并进入主干，主干复测验证其一致性）。

## 证据路径

```
docs/evolution/iterations/0070/evidence/
  build.log    npm run build 全量输出（EXIT=0）
  gate.log     npm run gate 21 场景逐行结果（EXIT=0，首跑即绿）
  test.log     npm test 30/30 输出（EXIT=0）
  smoke.log    npm run smoke:server 196/0 输出 + OEN01-07 逐条 PASS（EXIT=0）
  01-initial.png / 02-node-selected.png / 03-settings.png / 04-library.png
               确定性截图 4 张（renderedNodes=35，node .zcode/tools/wt.mjs evidence 采集）
  manifest.json  截图清单（sha256 × 4，capturedAt 2026-10-30T20:05:19Z）
```

## 结论

迭代 0070（BK-0048 节点级 on-error 参数：NDP 全 21 类统一 onError/onErrorRetries
双参数 + 属性面板 UI，修宪轮 issue#6 批复通道）已成功合并回主干并复测全绿。
待 CLOSE 阶段主干侧最终记账（STATE / BACKLOG / metrics / issue#6 回执关单）。
