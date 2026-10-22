# JOURNAL · 迭代 0009 · BK-0005 MCP 工具能力核对：sqlite/browser 如实降级文案与日志一致性（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-22 21:42
> 输入：`PRD.md`（REQ-0005-01~06 / AC1~AC6）+ `SPEC.md`（§4 修复规格 F1-F4 / §6 断言设计
> M01-M11 / §7 受影响文件清单 / §9 验收口径）。实现严格按 SPEC §7 白名单落点，
> 未扩大影响面、未触及 UI（`packages/shared` 与 `apps/web` 零改动，git status 为证）。
> 完整门禁（build/gate/test/smoke）与 git 提交由脚本统一执行，BUILD 未自行运行。

## 1. 改动清单（4 文件，与 SPEC §7 一一对应）

| 文件 | 净改动（实得 git diff） | 改动内容 |
| --- | --- | --- |
| `apps/server/src/tools.ts` | +14/−2（SPEC 预估 +10/−1） | F1：新增 `STUB_MARK` / `stubOf(server,name)` / `isStubImpl` 导出（置于 ToolSpec 接口后，注释注明 tools.ts 无 emit/pino 通道、观测归 llm.ts 单一出口）；`collectTools` else 分支改挂 `stubOf(server, n)`（stub 载荷两字段文本逐字保留）；另追加 `export` 关键字于既有 `IMPL` const（见 §2 偏差 1）。改后 116 行 |
| `apps/server/src/llm.ts` | +9/−5（SPEC 预估 +7/−3） | F2/F3/F4：import 补 `isStubImpl`；`stubCount` 计数（工具循环首行）；execute 回调 stub 路由——`ctx.log[stub?'warn':'info']`（pino 载荷新增布尔 `stub` 字段）+ SSE `lvl: stub?'warn':'sys'` + `bound = stub?200:60` 双路 preview 边界；✓ 摘要改 `mcpTxt`（含 `（${stubCount} 未接入）` 分项，无 stub 时逐字节同旧格式）。改后 122 行。**明确不动**（SPEC §4 清单，行号为改后现行号）：`llm.ts:70` 🤖 模型请求调用预告、`:80` 工具循环异常 warn、`:109` lvl='ok'——diff 中均未触及 |
| `tests/smoke/mcp-stubs.mjs` | 新增 133 行（≤400 ✓） | M01-M11 断言组：M01 dist/tools.js 第二道保险（缺产物 FAIL+可操作报错，不静默跳过）；M02 TOOL_SPECS 12 键 + IMPL 5 服务器恰等冻结面（基准=前端 MCP_SERVERS 注册表）；M03/M04 desc 前缀双向（五未实现项必含、七已实现项必无，逐工具命名）；M05 五 stub 直调 deepEqual 如实载荷；M06 七已实现项非 stub（不直调，避免触沙箱/网络）；M07 逐服务器组三向配对（IMPL null ⟺ desc 前缀 ⟺ stub）；M08-M11 源锁 llm.ts 四锁点。全部 `C.check`（计入汇总不 fail-fast）；M02-M11 均为单 id 单 PASS 行（11 项恰数） |
| `tests/smoke/smoke-server.mjs` | +4/−0（SPEC 预估 +3/−1） | +1 import（`runMcpChecks`）+ 挂接调用与两行注释，插在 P 组 preflight 之后、`getFreePort`/H 组起服务之前（SPEC §6.1 位点）。改后 346 行 |

产品净改动合计 +23/−7（SPEC 预算口径「净约 +17/−4 ≪ 40 行文本级」同量级，实际亦 ≪40）。

## 2. 与 SPEC 的偏差记录（2 处，均为实现级微调，无行为语义偏差）

1. **`IMPL` 追加 `export` 关键字**：SPEC §4 F1 导出清单未列 IMPL，但 M02（「IMPL 键集恰为
   5 服务器」）与 M07（「IMPL[srv]===null ⟺ …」）要求从 `dist/tools.js` 可见 IMPL 键集——
   原 `const IMPL` 未导出则两条断言无法忠实落地。处置：仅追加 `export` 关键字（1 词，
   零行为变化；SPEC §4 头注「等价微调允许，语义与锁点字符串须保持」）；全仓 grep 确认
   tools.ts 消费者唯一（llm.ts，SPEC §2.1 末行），无影响面外溢。
2. **M11 锁点正则的落地形态**：SPEC §6.2 表格中 M11 正则因 markdown 反引号转义显示不全；
   按其语义（锁 ✓ 摘要「（N 未接入）」三元分项）落地为
   `/stubCount\s*\?\s*\`（\$\{stubCount\}\s*未接入）\`\s*:\s*''/`——已对编辑后
   llm.ts 实测 HIT（见 §3）。

## 3. 自检（BUILD 内执行；完整门禁 build/gate/test/smoke 由脚本统一执行，未自行运行）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| server TS 类型检查（`--noEmit` 无产物，非 build 门禁；先例迭代 0005 JOURNAL §3 同口径） | `cd apps/server && npx tsc -p tsconfig.json --noEmit` | 退出码 0，零错误（含 `ctx.log[stub?'warn':'info']` 索引调用——pino `info/warn` 同为 `LogFn`，类型安全） |
| 冒烟脚本语法 | `node --check tests/smoke/mcp-stubs.mjs && node --check tests/smoke/smoke-server.mjs` | `syntax OK` |
| M08-M11 源锁正则对编辑后 llm.ts 实测 | `node -e`（readFileSync + 四正则 .test） | M08/M09/M10/M11 全 **HIT**；stubOf 载荷字面量 PRESENT |
| stub 载荷长度复核（SPEC §2.2） | `node -e`（JSON.stringify 逐字符） | 60/62/64/61/66（sqlite.query/execute、browser.navigate/click/screenshot）——与 SPEC §2.2 表逐项吻合，max 66 < bound 200（F3 判据成立的独立复核） |
| 改动面白名单（AC5 前置核对，只读 git） | `git status --porcelain` + `git diff --stat` | 产品路径恰为 SPEC §7 四文件；`apps/web/**`、`packages/shared/**`、`tools/pixel-gate/**`、`tests/golden/**`、`.github/**`、`README.md`、根 `package.json` 零触及（README 不触发条件修订，SPEC §5 判定遵守） |
| 行数规模 | `wc -l` | 新增唯一源文件 mcp-stubs.mjs 133 ≤400；tools.ts 116 / llm.ts 122 / smoke-server.mjs 346 均存量内 |

**未运行**（属 SPEC §9.1 门禁序列，由脚本统一执行）：`npm run build` /
`npm run build:server` / `npm run gate` / `npm test` / `npm run smoke:server` /
`git show --name-only <产品提交>`。M02-M07 行为断言依赖 dist 重建（脚本 build:server 后生效）；
BUILD 侧以类型检查 + 语法检查 + 源锁实测 + 判据静态核对为自检边界。

## 4. 冒烟断言基数口径（VERIFY 引用）

- 断言 id：35 → **46**（+M01-M11），M 组全部单 id 单 PASS 行（M02 合并 TOOL_SPECS+IMPL
  两键集判据为一条；M01 FAIL 时 M02-M07 逐条记 FAIL 不静默跳过）。
- 预期汇总：39（既有，STATE.md:13 口径，C 组打点随自建 run 数动态）+ 11 → 约 **50 passed /
  0 failed**；硬判据 `C.failed === 0`，实得值以脚本实跑输出为准（SPEC §6.2 同口径）。
- M 组离线确定性：不起服务、不触网、不依赖模型密钥；M06 不直调已实现工具（避免触沙箱/
  网络），M05 只直调 stub（纯内存返回）。

## 5. 触 UI 与影响面声明

- 触 UI = **否**，与 PRD/SPEC 结论一致：全部改动为后端运行态文本/日志取值 + 测试；
  `apps/web/**` 与 `packages/shared/**` 零字节改动（SSE 事件名/字段结构零变化，`lvl`
  仅取契约枚举既有值 warn/sys——`events.ts:24`）；gate 为零渲染路径接触的机器证据，
  由脚本执行。
- 无需扩大影响面：唯一超 SPEC 文字清单的动作是 §2 偏差 1 的 `export` 关键字（同文件内
  一词，M02/M07 断言的必要前提），未触发「中止转待批准区」条件。

## 6. 遗留与交接

- BUILD 侧无阻塞、无 UI 触及、无影响面扩大。
- VERIFY 承接：SPEC §9.1 六条命令门禁（含 `git show --name-only` 白名单核对与
  `apps/server/src` 净行数量级核对）；§9.2 手动 E2E E1-E4（E5 可选）——需
  `apps/server/.env` 配任一模型密钥；§9.3 AC3 反演演练四步（摘前缀→M03 红、加前缀→
  M04 红、换伪造载荷→M05 红、删锁点→M08 红；演练后还原复绿，不入产品提交）。
- REPORT 需以修复后状态重录 SPEC §3 矩阵终论 + AC6 计数（SPEC §3 已给出目标口径：
  发现 10 格不一致 / 修复 F1-F4 / 维持 10 格，疑点 A/B/C 实判结论——BUILD 实现与该判定
  一一对应，无新增不一致发现）。
