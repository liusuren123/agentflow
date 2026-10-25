# 迭代 0040 合并记录（MERGE）· BK-0052 Windows 静态托管修复

> 合并仲裁员产出（2026-10-26）。特性分支 `feat/0040-iter` → 主干 `main`，
> 合并提交 `e9f0fceff6912eeafdef7e6ad94f040122c7febf`（`git merge --no-ff`）。

## 1. 合并结果

| 项 | 值 |
| --- | --- |
| 特性分支 | `feat/0040-iter`（2 提交：`145fe46` 产品修复 + `7d8f36e` 机制件归档） |
| 分支点 | `b6f8f55`（主干在此之后合入迭代 0039 的 5 个提交） |
| 合并提交 | `e9f0fce`（`merge(evolution): 合并迭代 0040 Windows 静态托管修复：server.ts sendFile 绝对路径实参改 {root} 相对形态（GET / 与 /index.html 本机 404，存量 Minor 缺陷闭口）`） |
| 冲突文件 | **0 个**——`git merge` ort 策略自动合并成功 |
| 改动面 | `apps/server/src/server.ts`（+12/-4）· `tests/smoke/smoke-server.mjs`（+17）· `docs/evolution/BACKLOG.md`（+2：BK-0052/BK-0053 新行）· `docs/evolution/iterations/0040/{PRD,JOURNAL,REPORT}.md`（新增） |

## 2. 冲突与解决

**零冲突。** 分支点后主干侧合入了迭代 0039，与特性分支在 3 个文件上改动面交叠，
但区域互不重叠，ort 策略全部自动合并：

| 文件 | 主干侧（0039） | 特性侧（0040） | 合并方式 |
| --- | --- | --- | --- |
| `apps/server/src/server.ts` | capabilities 端点：头注释（:13-14）/ import（:43）/ 路由注册（:228） | sendFile 改「相对路径+{root}」（:59-69，静态托管区） | 自动；两侧区域相距 >150 行 |
| `tests/smoke/smoke-server.mjs` | CAP 组（CAP01-CAP05，:464+）+ capSrv 声明/清理 | W08/W09 静态托管护栏（:437-443，W07 与 N 组之间） | 自动；两个插入点相距约 10 行不重叠 |
| `docs/evolution/BACKLOG.md` | BK-0049 行置 done（:62） | :65 后插入 BK-0052/BK-0053 两新行 | 自动；修改行与插入行不同位 |

**合并后自检（按仲裁员职责，零冲突也执行）**：三文件 `grep '<<<<<<<\|=======\|>>>>>>>'` 零残留；
双侧实质内容逐项核对在位——server.ts 的 capabilitiesHandler import/路由（:43/:228）与
sendFile 相对形态（:62-69）并存；smoke 的 CAP 组全量（:464-494+，capSrv 清理 :363）与
W08/W09（:437-443）并存；BACKLOG 的 BK-0049 done 行与 BK-0052/BK-0053 新行并存。
无产品代码语义冲突，无需用户裁决项。

## 3. 主干端到端复测（四项实跑）

| 项 | 命令 | 退出码 | 结果 | 关键输出 |
| --- | --- | --- | --- | --- |
| build | `npm run build` | **0** | ✅ | vite 69 模块 → `dist/index.html` 362.51 kB（gzip 109.69 kB），built in 712ms |
| gate | `npm run gate`（复跑） | **0** | ✅ | **16 场景全 pass · diffPx=0**（s0~s15）· `宪法门禁：通过 ✓` |
| test | `npm test` | **0** | ✅ | 30 tests / 30 pass / 0 fail（含快照常驻比对、caps 固定序、负例 12 条） |
| smoke | `npm run smoke:server` | **0** | ✅ | **133 passed / 0 failed**；含本轮 **W08/W09 双过**（GET `/` 与 `/index.html` → 200 + text/html + 响应体与 `apps/web/dist/index.html` 逐字相等——BK-0052 修复的直接回归锚，该路由首次获得机器护栏）与 0039 CAP01-CAP05 零回归 |

### 3.1 gate 首跑红（如实留档，沿 0037/0038/0039 双留档先例）

合并提交后 gate **首跑** exit 1：`s3-library` diffPx=23，DOM 不变量全过（view/nodes/cssVars
逐项输出无报错）；其余 15 场景全 pass diffPx=0。与 0039 MERGE §3.1、BK-0050 在案记录
（「s3 本机采样抖动，以 CI 为权威」）完全同形态，且本轮改动面（后端 sendFile 实参形态）
不触及 s3 采集面、更不触前端渲染路径。**未做任何收口修改、未跑 `npm run gate:update`
（本轮非重录轮，明令禁止）、未放宽门禁**，仅复跑验证：复跑即 16 场景全 pass diffPx=0
（exit 0），差异不再复现。留档：`gate-first-run.log`（首跑红）/ `gate.log`（复跑绿）。

## 4. 证据清单（`docs/evolution/iterations/0040/evidence/`）

- `build.log` / `gate.log`（复跑绿，16 场景全 pass）/ `gate-first-run.log`（首跑红留档）/ `test.log` / `smoke.log`；
- `01-initial.png` / `02-node-selected.png` / `03-settings.png` / `04-library.png`（4 张确定性截图，
  `node .zcode/tools/wt.mjs evidence apps/web/dist docs/evolution/iterations/0040/evidence` 采集，均渲染 19 节点）+ `manifest.json`。

## 5. 结论

迭代 0040（BK-0052）合并零冲突、主干侧零丢失；主干复测四项全绿（gate 首跑 s3 本机
采样抖动如实双留档，复跑稳定全绿）；修复目标 W08/W09 香烟级护栏在主干实跑通过，
迭代 0039 既有断言（CAP 组等）零回归。合并完成，可进入 CLOSE 记账。
