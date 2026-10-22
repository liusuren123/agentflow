# REPORT · 迭代 0009 · BK-0005 MCP 工具能力核对：sqlite/browser 未实现项的如实降级文案与日志一致性

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-22 21:55 · 环境：Windows（win32 10.0.26300）/ Node v24.21.0 / 在线（DEEPSEEK_API_KEY 经环境变量注入，E2E 真模型驱动）
> 输入：`PRD.md` AC1-AC6 + `SPEC.md` §3 矩阵 / §6 断言 / §9 验收口径 + `JOURNAL.md`。
> **验收结论：PASS（6/6 AC 全过，零缺陷）**。BUILD/gate/test 由工作流脚本统一执行且通过（本会话未重复
> 跑全套，按 VERIFY 指令做针对性复核）；本报告全部结论均来自本会话亲跑命令与亲读代码的证据。

## 0. 验收总表

| AC | 结论 | 关键证据（本会话亲得） |
| --- | --- | --- |
| AC1 审计矩阵完整（20 格 + 三疑点实判） | **PASS** | SPEC §3 已含 20 格形态与 BUILD 前结论；本会话独立复核 §2.2 载荷长度逐字符实算（node -e，60/62/64/61/66 与 SPEC 表逐项吻合）+ 修复后矩阵重录见 §2（每格带路径:行指针） |
| AC2 修复对照可断言 | **PASS** | 修复前行为：git diff 旧代码行（`lvl:'sys'` + `preview(res,60)` 无区分，本报告 §3 引用）；修复后：E2E-1a/1b/1c、E2E-2a/2b、E2E-3a/3b/3c 九项全绿（§4）+ 源锁 M08-M11 命中（smoke 输出） |
| AC3 自愈断言双向生效 | **PASS** | `npm run smoke:server` = **50 passed / 0 failed**（39 既有 + M01-M11）；反演演练四步全命中：摘前缀→M03 红、加前缀→M04 红、伪造载荷→M05 红、撤 lvl 路由→M08 红；还原重建后 11/0 复绿（§5） |
| AC4 既有防护零回退 | **PASS** | smoke 亲跑 50/0（W/N/S/R/D/E 既有组全绿零回退）；gate 4 场景与 npm test 8 项由脚本统一执行且通过（本会话未重复运行，如实记载）；AC4 对 smoke 的口径为「推荐」，本会话已实跑 |
| AC5 改动面白名单 | **PASS** | `git status --porcelain` 产品路径恰为 SPEC §7 四文件；禁区（apps/web、packages/shared、tools/pixel-gate、tests/golden、.github、README.md、根 package.json、CONSTITUTION、AGENTS）`git diff` 与 `git status` 双查 **0 改动**（§6） |
| AC6 如实终论 | **PASS** | 发现 10 格不一致（触点3×5 + 触点4×5）/ 修复 F1-F4 / 维持 10 格（触点1×5 + 触点2×5）；疑点 A/B/C 全部实判成立（A/B/C 见 §3；C 范围修正 4/5 为 SPEC §2.3-1 已载，本会话实算复核一致）；无虚构不一致 |

## 1. 验证方法与命令清单（全部本会话亲跑）

| # | 命令/动作 | 结果 |
| --- | --- | --- |
| V1 | `npm run smoke:server`（仓库根） | `==== smoke:server：50 passed / 0 failed ====`（M01-M11 + P/H/W/N/S/R/D/E/C 全组） |
| V2 | M 组独立驱动（临时脚本 `$TEMP/af-0009-verify/run-m.mjs` 直跑 `runMcpChecks`，基准态） | `==== M-driver: 11 passed / 0 failed ====` |
| V3 | AC3 反演演练（Edit 工具篡改 src → `npm run build:server` → V2 驱动 → Edit 反向还原；四步） | ①M03 红（M07 联动红）②M04 红 ③M05 红（M07 联动红）④M08 红；终态重建 11/0 复绿 |
| V4 | 演练完整性核对 | 还原后 `sha256sum` 两源文件与演练前逐字节一致（tools.ts `e579409d…`、llm.ts `35c0718c…`）；`git diff --stat` 与演练前相同（+32/−12 四文件） |
| V5 | 手动 E2E（临时脚本 `$TEMP/af-0009-verify/e2e-mcp.mjs`，复用 `tests/smoke/lib.mjs` 起真实 server + DeepSeek 真模型跑三个工作流） | `==== E2E: 9 passed / 0 failed ====`（SPEC §9.2 E2E-1/2/3/4 全点位；E2E-5 为可选项未跑，理由见 §7） |
| V6 | SPEC §2.2 载荷长度独立复核（`node -e` JSON.stringify 逐字符 + preview(60) 模拟） | 60/62/64/61/66；4/5 截断、browser.navigate/screenshot 语义尾部受损——与 SPEC §2.2 表逐项吻合 |
| V7 | AC5 白名单（`git status --porcelain` + `git diff --numstat` + 禁区双查） | 见 §6 |
| V8 | 只读风险复核：`packages/shared/src/events.ts:24` lvl 枚举 = `['info','sys','ok','warn']`；前端 `app.js:1841` lvl→CSS class 直挂、`app.css:327-329` `.warn/.sys` 均有既有样式 | 修复仅用枚举内既有值 warn/sys，无新级别值；前端渲染分支零踩空面（PRD 风险 3 闭合） |
| V9 | dist 新鲜度 | `dist/tools.js`、`dist/llm.js` 时间戳 21:44（晚于 src 21:42），含 `stubOf`/`isStubImpl` 编译产物 |

未由本会话执行（如实记载）：`npm run build` / `npm run gate` / `npm test` —— 按 VERIFY 指令由工作流脚本统一执行且已通过，未重复跑全套；`git show --name-only <产品提交>` —— 产品提交在本阶段之后由脚本创建（当前工作区为未提交状态），故 AC5 以工作区 diff 为核对对象（§6），该口径差异如实声明。

## 2. 审计矩阵终论（5 工具 × 4 触点 = 20 格；修复后状态；AC1/AC6）

触点定义与判据基准同 SPEC §3（`tools.ts:4-5` 不伪造原则 + `handlers.ts:68` warn 先例）。行内 `路径:行` 为本会话亲读核对的现行号。

| 工具 | 触点1 模型 desc | 触点2 模型 stub 结果 | 触点3 SSE 日志行 | 触点4 pino 日志 |
| --- | --- | --- | --- | --- |
| sqlite.query | 一致·维持（前缀 `tools.ts:97`，装配直达 `llm.ts:54`） | 一致·维持（`tools.ts:82` 载荷逐字） | **修复后一致**（warn + bound200，`llm.ts:57-59`；E2E-1a/1b 实证） | **修复后一致**（level40+stub:true，`llm.ts:58`；E2E-3a 实证） |
| sqlite.execute | 一致·维持（`tools.ts:98`） | 一致·维持（`tools.ts:82`） | **修复后一致**（同上路由；M05 载荷 62 字符 < 200 实算） | **修复后一致**（同上） |
| browser.navigate | 一致·维持（`tools.ts:99`） | 一致·维持（`tools.ts:82`） | **修复后一致**（修复前 60 截断丢「实现」尾部——本会话实算复核；M10 锁 bound=200） | **修复后一致**（同上） |
| browser.click | 一致·维持（`tools.ts:100`） | 一致·维持（`tools.ts:82`） | **修复后一致**（修复前截断仅收尾 `}`；M10） | **修复后一致**（同上） |
| browser.screenshot | 一致·维持（`tools.ts:101`） | 一致·维持（`tools.ts:82`） | **修复后一致**（修复前 66>60 丢「真实实现」尾部；M10） | **修复后一致**（同上） |

矩阵断言机器保障：触点1/2 由 M02-M07（smoke 亲跑全绿）+ M08-M11 源锁；触点3/4 取值路由由源锁 + §4 真模型 E2E 实证（SSE 与 pino 双路）。

## 3. 三疑点实判 + 修复前后对照（AC2）

修复前代码（`git diff` 旧行，本会话提取）：
`ctx.log.info({ tool: name, args: preview(a, 40), result: preview(res, 60) }, '工具调用');`
`emit('log', { lvl:'sys', msg:\`🔧 工具调用 ${name}(${preview(a,40)}) → ${preview(res,60)}\` });`
`const capsTxt = (cap.servers ? \` · MCP ${cap.servers} 服务/${cap.tools} 工具\` : '') + …`

| 疑点 | 实判 | 修复前行为 | 修复后行为（本会话实证） |
| --- | --- | --- | --- |
| A · 日志级别不一致 | **成立，已修复（F2）** | stub 与真实调用同为 SSE sys / pino info，日志面板不可分辨 | E2E-1a：sqlite.query 行 `lvl="warn"`；E2E-1c：filesystem.read_file 行 `lvl="sys"`；E2E-3a/3b：pino `"level":40`+`"stub":true` vs `"level":30`——两路均可一眼分辨 |
| B · ✓ 摘要不区分 stub | **成立，已修复（F4）** | ` · MCP 2 服务/2 工具`，2 个 stub 照计无提示 | E2E-2a：`✓ E2E-LLM-A · 生成 1894 tokens · MCP 2 服务/2 工具（1 未接入） · 3.3s`；E2E-2b：全已实现组 `· MCP 1 服务/3 工具 ·` 无分项（无 stub 时逐字节同旧格式） |
| C · preview 截断吞尾 | **成立且范围 4/5（SPEC §2.3-1 修正成立），已修复（F3）** | `preview(res,60)`：browser.navigate/screenshot 如实 note 尾部「实现」「真实实现」被截（本会话实算 64/66>60）；sqlite.execute/browser.click 仅丢收尾引号/花括号 | E2E-1b：sqlite.query 行尾部全文 `…未接入真实实现"}`（`msg.slice(-24)` 实测）；E2E-3c：pino result 字段全文含「未接入真实实现」无 `…`；真实调用维持 60（E2E-1c 行内 `content":"BK-0005 E2E fixture: hello…` 可见截断仍在，仅 stub 路径放宽） |

## 4. 手动 E2E 记录（SPEC §9.2；DEEPSEEK_API_KEY → deepseek-chat；一次性凑齐，9/0）

关键原始输出（驱动脚本 V5，第一手）：

```
[warn] 🔧 工具调用 sqlite.query({"sql":"SELECT 1"}) → {"error":"not implemented","note":"工具 sqlite.query 未接入真实实现"}
[sys]  🔧 工具调用 filesystem.read_file({"path":"e2e-0009.txt"}) → {"path":"e2e-0009.txt","content":"BK-0005 E2E fixture: hello…
✓ E2E-LLM-A · 生成 1894 tokens · MCP 2 服务/2 工具（1 未接入） · 3.3s
{"level":30,…,"tool":"filesystem.read_file","stub":false,…,"msg":"工具调用"}
{"level":40,…,"tool":"sqlite.query","stub":true,"args":"{\"sql\":\"SELECT 1\"}","result":"{\"error\":\"not implemented\",\"note\":\"工具 sqlite.query 未接入真实实现\"}","msg":"工具调用"}
✓ E2E-LLM-B · 生成 481 tokens · MCP 1 服务/3 工具 · 0.6s
✓ E2E-LLM-C · 生成 36 tokens · 0.9s        ← E2E-4 无 MCP 回归：基线形态、无 MCP 分项、无工具调用行
```

E2E-1a/1b/1c、E2E-2a/2b、E2E-3a/3b/3c、E2E-4 共 9 断言全 PASS（逐条判据与实得值见 V5 输出）。

## 5. AC3 反演演练（红绿双向）

| 演练 | 篡改（Edit 工具，均演练后精确还原） | 期望红 | 实得（V2 驱动输出） |
| --- | --- | --- | --- |
| ① | 摘 `sqlite.query` desc 前缀 | M03 | **FAIL M03**（+FAIL M07 联动）`9 passed / 2 failed` |
| ② | 给 `filesystem.read_file` 加前缀 | M04 | **FAIL M04** `10 passed / 1 failed` |
| ③ | collectTools else 分支换 `(async () => ({ ok: true }))` | M05 | **FAIL M05**（+FAIL M07 联动）`9 passed / 2 failed` |
| ④ | llm.ts `lvl: stub ? 'warn' : 'sys'` 改 `lvl: 'sys'` | M08 | **FAIL M08** `8 passed / 3 failed`（另两条红为 dist 停留在演练③产物、src 已还原未重建所致，行为自洽） |
| 还原 | 全部反向还原 + `npm run build:server` 重建 | 全绿 | **`M-driver: 11 passed / 0 failed`**；sha256 与演练前一致；`git diff --stat` 不变 |

演练结论：断言双向自愈成立——忘摘标记（①）、忘加/误加标记（②）、stub 伪造成功（③）、无声回退路由（④）四类漂移均被对应断言捕获（AC3/REQ-0005-04，含 BK-0008 摘除路径守护 M07）。

## 6. AC5 改动面白名单（产品提交尚由脚本后续创建，以工作区 diff 为核对对象）

- 产品路径（`git status --porcelain` + `git diff --numstat`）：`apps/server/src/llm.ts`（+9/−5）、`apps/server/src/tools.ts`（+14/−2）、`tests/smoke/smoke-server.mjs`（+4/−0）、`tests/smoke/mcp-stubs.mjs`（新增 133 行 ≤400）——恰为 SPEC §7 四路径白名单；apps/server/src 净 **+23/−7 ≪ 40 行文本级**（SPEC §4 预算达成）。
- 迭代产物 `docs/evolution/STATE.md` 与 `docs/evolution/iterations/0009/` 属归档提交通道（SPEC §7 明示不计入产品提交）。
- 禁区零改动双查（`git diff --name-only -- <禁区>` 与 `git status --porcelain <禁区>` 均 0 行）：apps/web、packages/shared、tools/pixel-gate、tests/golden、.github、README.md、根 package.json、CONSTITUTION.md、AGENTS.md。README 未触发条件修订（SPEC §5 判定被遵守）。
- SPEC「明确不动」复核：`llm.ts:70`（🤖 预告 sys）、`llm.ts:80`（工具循环异常 warn）、`llm.ts:109`（✓ 行 lvl:'ok'）三行现行完好；IMPL null 结构未变（`tools.ts:59-60`）；stub 载荷两字段文本逐字保留（diff 旧内联函数 vs `stubOf` 逐字等价）。

## 7. 偏差与如实声明（非缺陷）

1. **SPEC §9.2 E2E-3 措辞与 F2/实现不一致（文档级）**：该处写真实调用「无 stub 字段」，但 SPEC §4 F2 目标形态与实现均为**无条件携带 `stub` 布尔字段**（真实调用 `stub:false`）。实得行为与 F2 一致（E2E-3b 行 `"stub":false` 可见）。判定为 SPEC §9.2 的文案笔误，以 §4 F2 为准，不构成产品缺陷。
2. **JOURNAL §2 两处实现偏差复核通过**：`IMPL` 追加 `export`（M02/M07 键集断言的必要前提，全仓消费者仍仅 llm.ts，零行为变化）；M11 正则按语义落地（演练④外的常态跑 M11 绿即证）。
3. **E2E-5（可选目检）未执行**：SPEC §9.2 标注「非判定必需——gate 已机器证明」；gate 由脚本执行通过（零前端 diff 的机器证据），本会话未重复。
4. **模型调用不确定性**：E2E 驱动内置 ≤3 次重试（SPEC §9.2 E2E-1 授权），实际第 1 次即凑齐两行工具调用，未动用重试。
5. **E2E 环境说明**：`apps/server/.env` 不存在，密钥经环境变量 `DEEPSEEK_API_KEY` 注入（`config.ts:18-25` .env 不覆盖已有 env，两路等效）；E2E 夹具文件建于 gitignored 的 `apps/server/sandbox/`（`.gitignore:16`），run 记录已 DELETE、server 进程已终、夹具已删，工作区与演练前逐字节一致（V4）。

## 8. 交互回归抽查（VERIFY 契约要求）

本迭代触 UI=否、前端零字节改动（§6 禁区双查），交互面的机器证明 = 脚本执行的 `npm run gate` 4 场景全绿（本会话未重复运行，如实记载）；后端行为回归 = smoke 既有 W/N/S/R/D/E 组全绿（V1）+ E2E-4 无 MCP 基线形态一致（V5）。lvl 新取值 warn 为契约枚举与前端 CSS 既有值（V8），渲染分支零踩空。

## 9. 终论

- **计数（AC6）**：20 格矩阵——发现 **10 格不一致**（触点3×5 + 触点4×5，全部经 F2/F3 修复后一致）/ **维持 10 格**（触点1×5 + 触点2×5，零改动即如实）；另有矩阵外 ✓ 摘要行 1 处（疑点 B，F4 修复）。三疑点 A/B/C 实判全部成立（C 范围修正 4/5 成立），无虚构不一致。
- **自愈保障**：M01-M11 十一条断言常态全绿（smoke 50/0），四类反演篡改全红、还原复绿——BK-0008（sqlite 真实接入）的摘标记/删 stub 路径已有断言守护。
- **verdict：PASS**，无 BUG 条目；建议 CLOSE。
