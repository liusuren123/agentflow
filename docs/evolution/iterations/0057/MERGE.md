# 迭代 0057 · MERGE — 合并仲裁记录（BK-0045 PTY 交互终端节点 UI 修宪轮）

> 产物角色：merge-arbiter · 2026-10-28 · 主干 main · 消费方：CLOSE 记账
> 输入：feat/0057-iter（b442840）· 迭代目录 docs/evolution/iterations/0057/（本轮由合并轮在主干新建）
> 本轮重录轮：**是**（BK-9005 链终轮；授权链 = ADR-0014 §7 + issue#5 用户批复承继
> 2026-10-23T15:49:06Z。golden 变更已在**分支侧**完成提交——s3-library 重录
> 119528→118762 B（节点库新增 terminal 类目行）+ s19-terminal-panel-online 新增
> （53884 B + invariants 55 行）；合并轮在主干**未执行** gate:update，仅校验）

## 1. 合并结果

| 项 | 值 |
| --- | --- |
| 合并方式 | `git merge --no-ff feat/0057-iter`（主干工作区干净：`git status --porcelain` 零输出） |
| 分叉状态 | merge-base `52f898e` = 主干 HEAD，**零分叉**，纯快进载荷（与 0055 同型） |
| 合并提交 | **`810835e`** `merge(evolution): 合并迭代 0057 PTY 交互终端节点 UI：NDP 定义 + 画布终端节点 + 会话共享交互（修宪轮）——BK-9005 链终轮` |
| 冲突文件 | **无**（STATE.md / metrics.md / BACKLOG.md 分支侧零改动，未进冲突面） |
| 补录提交 | **`5d7fcdc`** `fix(shared): 补录迭代 0057 分支遗漏提交的 terminal NDP 模块`（见 §2） |

**分支形态异常（如实记录）**：分支相对主干仅 **1 个提交**（b442840 修复轮，
21 文件 +590/−31），工作树 reflog 佐证 52f898e → b442840 单跳——首轮产品提交
与修复轮在工作树内被并为单提交；**机制件（PRD/SPEC/JOURNAL/REPORT 与
BACKLOG 过程改动）本轮未随分支提交**（对比 0056 分支携带机制件 6 文件），
验收报告 `REPORT.md` 不存在，与派发口径「若存在」相符。迭代目录
（evidence/ + 本 MERGE.md）由合并轮在主干新建。

**改动面**（合并入主干）：产品 19 文件——apps/server `handlers.ts`（terminal
handler +46）/ apps/web `package.json`（+@xterm/xterm ^6.0.0）+ `app.css`
（tp- 面板族 +19）+ `legacy/app.js`（终端面板 + 双击打开 + 会话绑定写回 +136）+
`server-sync.js`（openPtyStream 等会话共享交互 +46）/ packages/shared
`nodes.ts`（terminal 入列 21 目录）+ `nodes/README.md`（总索引 21 行）+
7 个契约测试 + `nodes.baseline.json`（terminal 条目）/ tests `smoke-server.mjs`
（PT01-PT06 组 +167）/ tools `pixel-gate/gate.mjs`（19→20 场景 + PTY_ROUTES
fixture）+ `gen-node-readmes.mjs`（21 计数 + terminal 人工文案）+ golden 2 件。

## 2. 重大发现：分支漏提交 terminal NDP 模块（已补救，`5d7fcdc`）

**事实链**（逐条可复核）：

1. 合并提交后首跑 `npm run build` **红**（evidence/build-first-run.log）：
   `packages/shared/src/nodes.ts:33` `import terminalDef from './nodes/terminal/node.js'`
   → tsc `TS2307: Cannot find module './nodes/terminal/node.js'`。
2. `git ls-tree -r feat/0057-iter` 证实分支树**无** `packages/shared/src/nodes/terminal/`
   目录；工作树磁盘亦无（worktree status 干净）——源文件在提交流程中被清除且
   **从未被 stage**（`git fsck` 悬空对象排查无该文件 blob、stash 空）。这是
   productFiles 提交面缺陷**第 4 发**（0034/0036/0055 后再现，新形态：
   0034 是白名单跨轮覆盖，0055 是漏 `git add` 新目录，本轮是未跟踪源文件
   被提交流程清除）。
3. 工作树存留**验证轮编译产物**：`.zcode/worktree/feat/0057-iter/packages/shared/
   dist/nodes/terminal/`（node.js 766 B + node.d.ts 743 B + node.js.map，
   mtime 2026-10-28 04:28，先于分支提交 04:31:42）——即修复轮 VERIFY
   「4/4 绿 + 单元三态验证」所编译的同一源的数据面。
4. **补救**（0055 `7908a5b` 补录先例路径，经 Write 通道，Mimosa 通过）：
   - `node.ts`：依工作树 dist `node.js` 数据面重建——数据零自由度
     （`test/nodes.baseline.json` terminal 条目逐字段钉死 + d.ts 字面量类型
     佐证）；仅头注释为仲裁员撰写并**在文件内载明补录出处**；
   - `README.md`：由**已提交的**生成器 `tools/gen-node-readmes.mjs` 重生成
     （terminal 人工文案 MANUAL_NOTES 已随分支合入，生成物无手改）。
5. **等价性证明**：重建后 `npm run build:shared` → `cmp` 主干
   `dist/nodes/terminal/node.js` 与 `node.d.ts` 对工作树验证轮产物
   **逐字节一致**（tsc 剥离注释并规范化格式 → 输出一致即 AST 一致 →
   数据面与开发者原源码编译等价）；随后 `npm test` 30/30（含
   「NODES 运行时输出与基线逐字节等价·21 键全量」「D===R 目录集一致」
   「README 幂等回比」）全绿。
6. 补录提交：**`5d7fcdc`**（2 文件 61 行，仅 terminal 目录，无其他夹带）。

**与 0055 补录的差异（如实记录）**：0055 为工作树磁盘**字节级复制**
（`cmp` 可证零改动）；本轮源文件已失，为**等价重建**——数据面经 dist 字节
互证 + 全套契约测试机器验证，但头注释文本非开发者原文（文件内已注记，
用户如不认可此处置可 revert `5d7fcdc` 交代码开发角色重写）。

**复测前置**：`npm install`（exit 0，新增 @xterm/xterm@6.0.0 1 包，
package-lock 已随合并提交——0055 轮 node-pty 先例同型）。第二轮 build 曾红
（evidence/build-second-run.log：vite 无法解析 `@xterm/xterm`，依赖未装），
安装后第三轮绿。

## 3. 主干端到端复测（全部本会话实跑，日志在 evidence/）

| # | 命令 | 退出码 | 结果 | 日志 |
| --- | --- | --- | --- | --- |
| R1 | `npm run build` | **0** | shared tsc + web vite ✓（72 模块，1.02s，xterm 内联打包；首轮 TS2307 / 次轮依赖未装两次失败均留档） | `evidence/build.log` |
| R2 | `npm run gate` | **0** | **首跑全绿**：**20/20 场景 pass，diffPx 全 0**（s0~s18 存量零波动 + 重录 s3-library + 新增 s19-terminal-panel-online）；「宪法门禁：通过 ✓」；未触发 issue #12 抖动口径（单场景红才复跑，本轮无红）；主干未重录 golden | `evidence/gate.log` |
| R3 | `npm test` | **0** | 契约测试 **30/30**（节点注册表 21 种、DEFS 默认值 44/44、baseline 逐字节、D===R 21 目录、README 表格回比 + 幂等、HANDLERS ⊇ NODES） | `evidence/test.log` |
| R4 | `npm run smoke:server` | **0** | 后端 E2E **157 passed / 0 failed**（沿革：0055=145 → 0056=151 → 本轮 **+PT01-PT06 终端组** = 157；PTY_ENABLED=0 降级 / 会话创建+双向审计 / 绑定接管不新建 / run·会话正交 / 并发上限 / 源码锁；C01-C04 清理复查零残留） | `evidence/smoke.log` |

## 4. 证据清单（docs/evolution/iterations/0057/evidence/）

| 文件 | 内容 |
| --- | --- |
| `build-first-run.log` | 合并后首跑 build 失败输出（TS2307，§2 缺口发现证据） |
| `build-second-run.log` | 补录后第二次 build 失败输出（@xterm/xterm 未装，npm install 前置依据） |
| `build.log` | 最终 build 全绿（R1 定档） |
| `gate.log` | 宪法门禁 20/20 全绿（R2 定档） |
| `test.log` | 契约测试 30/30（R3 定档） |
| `smoke.log` | 后端 E2E 157/0（R4 定档） |
| `01-initial.png` ~ `04-library.png` + `manifest.json` | `node .zcode/tools/wt.mjs evidence apps/web/dist <本目录>` 采集的 4 张确定性截图（1600×900，含 sha256 与渲染节点数 19；04-library 118762 B 与重录后 s3 golden 字节数一致） |

## 5. 遗留与后续

- **Mimosa 提交钩子提示（既有代码，非本轮 diff 引入，0055 轮已同源留痕）**：
  `apps/server/src/workbench/routes.ts:21` collectGitInfo 经 1 跳到达
  command-injection（high）；`routes.ts:76` collectTree 是 path-traversal
  入口（high）。按钩子要求**明确告知用户**：属既有 workbench 代码（0056
  合入），建议后续迭代立项审查。
- **工作流侧缺陷线索**：productFiles 提交面漏文件第 4 发（新形态，§2.2）。
  ae6e3dc 的提交面完整性断言只核对**申报清单**，未覆盖「磁盘存在但未申报
  的已构建源文件」——建议工作流在提交前增加「构建产物引用的源 ⊆ 提交面」
  断言（本轮缺口即 `nodes.ts:33` import 了磁盘上未跟踪的 terminal/node.ts，
  tsc 恰可检出，可在提交前以 `npm run build:shared` 兜底）。
- **机制件缺失**：本轮 PRD/SPEC/JOURNAL/REPORT 未随分支提交（§1 异常），
  迭代目录现仅含本 MERGE.md 与 evidence/——CLOSE 记账时 last_result 已含
  证据路径可溯源；如需补齐过程产物，建议下轮治理日补录。
- BK-9005 链终轮 issue 回执与 BACKLOG/metrics/STATE 终态记账归 CLOSE 阶段
  （协调者，合并锁内）；选题占位 `.zcode/locks/items/BK-0045` 随 CLOSE 释放。

## 6. 结论

合并零冲突；发现并补救分支漏提交的 terminal NDP 模块（`5d7fcdc`，dist 字节
互证 + 契约测试机器验证）；主干四项复测全绿（build/gate/test/smoke 退出码均
0，gate 20 场景 diffPx=0、smoke 157/0）；证据齐备（6 日志 + 4 截图 +
manifest）。迭代 0057 成果已完整并入主干：合并提交 `810835e` + 补录 `5d7fcdc`。
