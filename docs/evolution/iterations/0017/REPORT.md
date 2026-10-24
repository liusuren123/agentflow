# REPORT · 迭代 0017 · BK-0027 真 MCP client 传输选型 SPEC 先行（纯文档轮）· VERIFY

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 17:15。
> 输入：`PRD.md`（AC1~AC6 / REQ-0027-01~04）+ `SPEC.md`（§0~§10）+ `JOURNAL.md`（BUILD 自检）。
> 门禁分工：build / gate / test 由脚本统一执行且通过（派发指令载明；PRD AC5 明文按
> 0012/0014/0016 先例采信，VERIFY 不复跑全套）；`npm run smoke:server`（AC5 第四命令，
> 脚本门禁不含）+ AC1~AC4/AC6 机器核对 + 手动 E2E 与交互抽查由本阶段亲自执行。

## 总结论

**PASS —— 零 BUG，1 个观察项（OBS-001，指针行号偏移、事实为真、已在 JOURNAL §2 记录）。**

纯文档轮验收全绿：ADR-0012 草案 278 行六要素齐备且双位标注草案状态；BACKLOG 三行
备注与 SPEC §7 模板**字节级一致**（VERBATIM-OK ×3）、proposed 不变式与 BK-0013 行
逐字不动均机器核证；工作区全量改动恰白名单两路径 + 机制文件四件、禁止路径 diff 0 行
（含 package-lock.json 零变化 = 零依赖引入机器证明）；ADR 代码/环境指针抽样 **20+ 条
全部命中**（含 §8 行数现状与 §4 版本号主张逐一亲核）；smoke:server **84 passed /
0 failed** 本阶段亲跑；浏览器实开 localhost:3000 画布正常加载零 JS 错误 + 平移/缩放
交互抽查与源码语义一致。三重保险（草案标注 / proposed 不变 / issue 仅文本）在案，
POLICY 合规形态成立。

## 验收矩阵（逐 AC）

| AC | 判定 | 证据（本阶段亲跑/亲读） |
| --- | --- | --- |
| AC1 ADR 六要素 | **PASS** | `wc -l docs/adr/0012-mcp-client-transport.md` = **278** ≤400；`grep -n "草案 · 待用户批准"` 命中 `:3`（+显著声明块 :14-17 全文亲读）。六要素逐一在案：(a) §1 动机与现状（tools.ts:26-73 伪 MCP 五内置 / app.js:103-114 前端写死 / 竞品对照 :35-39）；(b) §2 矩阵**两传输 × 6 维度**（≥5）+ §3 三结论（两者都做 :57 / 统一 McpConnection 四方法抽象 :62-71 / Streamable HTTP 先行+三条理由 :75-78）；(c) §4 三案对比 + 协议面清单（:82-84：initialize 握手/capabilities 协商/tools/list/tools/call/notifications/版本演进负担）+ §5 调研记录六条带日期来源 URL + 推荐结论 `@modelcontextprotocol/client ^2.4`；(d) §6.1 stdio（白名单=注册表/超时 10s·30s/生命周期绑定 run/残余风险显式声明）+ §6.2 HTTP（guard 网关收口 + mcpFetch 签名草图 :153-160 + ALLOW_PRIVATE_NET=1 逃生）；(e) §8 定界索引→SPEC §7 权威字面量 + 模块草图（行数现状主张 wc 亲核全中：tools.ts 116 / guard.ts 100 / llm.ts 122 / config.ts 109）；(f) §9 零 UI 声明（BK-9006 归属）/ BK-0014 衔接 / BK-0008 正交 + §6.3 内置五项保留 built-in 层共存口径 |
| AC2 定界回写与状态不变式 | **PASS** | 三行备注四要素齐备（BACKLOG.md:33-35 亲读：各含「受影响文件=…/验收口径=…/依赖关系=…/需批准面=…（转 ready 唯一条件=issue 获批，ADR-0012 附录 A）」）；**VERBATIM-OK ×3**——BACKLOG :33/:34/:35 备注单元格与 SPEC.md :137/:143/:149 模板字面量 `diff` 字节级一致（本阶段独立复跑，JOURNAL §3 结论复核成立）；`grep -c '\|^ \| BK-00(28\|29\|30) \|…\| proposed \|'` 计 **3**（三行状态仍 proposed）；`diff <(git show HEAD:BACKLOG.md \| grep BK-0013) <(worktree 同行)` 输出空 **IDENTICAL**（BK-0013 skipped 行逐字零改动）；BK-0027 行仍 `ready`——AC2 明文该行流转归 CLOSE，BUILD/VERIFY 不碰，符合契约 |
| AC3 issue 草案完整可用 | **PASS** | ADR 附录 A 亲读：标题（:237）含「BK-0028~0030 真实 MCP client 实施」与「请批」关键词；正文 ①~⑤ 五要素齐备（:249-274：新增依赖项与理由 / 出站类别+安全方案摘要 / stdio spawn env 语义面 / 三子项实施顺序 / 证据链接）；自包含——正文自带 POLICY 上下文、批准与驳回语义（:276-277）、证据指针，不依赖会话上下文即可理解 |
| AC4 白名单与零实现机器证明 | **PASS**（提交前态等价核对，见下「时点说明」） | `git status --porcelain=v1 -uall` 全量改动恰 **6 条**：`M docs/evolution/BACKLOG.md`（白名单②）+ `?? docs/adr/0012-mcp-client-transport.md`（白名单①）+ 机制文件四件（`M STATE.md`、`?? iterations/0017/{PRD,SPEC,JOURNAL}.md`，均 docs/evolution/ 内）；`git diff -- apps packages tests tools .github package.json package-lock.json CONSTITUTION.md AGENTS.md README.md` 输出 **0 行**；staged 0；package-lock.json 零变化 = **零依赖引入机器证明** |
| AC5 回归面 | **PASS** | build / gate（8 场景）/ test：脚本统一执行且通过（派发指令载明，PRD AC5 采信口径；前端零改动纯回归面）。**smoke:server 本阶段亲跑**：`npm run smoke:server` → `==== smoke:server：84 passed / 0 failed ====`（V01-V09 全过含 V09「git status --porcelain -- packages/shared 为空（DEFS 零漂移）」机器断言；C01-C04 清理零残留、子进程已终止） |
| AC6 指针可核查 | **PASS**（抽样 20+ 条 ≥ 下限 5，全部命中；1 条已知偏移见 OBS-001） | 逐条 Read/亲核：`tools.ts:26-73`（IMPL 五内置）、`:59`/`:60`（sqlite/browser null）、`:81-85`（stubOf）、`:104-116`（collectTools 两分支）、`:46`（fetch 15s）/`:51`（download 20s）、`:4-5`（如实降级不伪造原则）；`guard.ts:33-56`（assertPublicUrl）、`:39-40`（ALLOW_PRIVATE_NET=1 逃生）、`:59-62`（guardedFetch）、`:64-68`（固定主机网关注释）、`:77`/`:85`/`:99`（bocha 15s/ddg 12s/searxng 12s）、`:88-100` 与 `:93-100`（searxngSearch 动态主机网关双口径射程内均中）；`llm.ts:9`（import）/`:38`（collectTools 调用，位于 async handler 内）/`:54`（zod 3 schema 进 AI SDK tool()）；`app.js:102`（「原型模拟数据」注释）/`:103-114`（MCP_SERVERS 五项）/`:115-121`（SKILL_LIST）/`:123-127`（capSummary 只计数不辨来源）；`config.ts:28-35`（env 清单逐一点数=13）/`:49-63`（EnvSchema zod fail-fast）；`code.ts:50`（spawn）/`:53`（setTimeout 5s kill）；`tsconfig.json:4-5`（module/moduleResolution NodeNext）；`sessions.ts:167`（abortActiveSessions）；`server.ts:224-232`（停机链射程内）；`apps/server/package.json`（zod `^3.24.0` floor、依赖面无任何 MCP SDK）；ADR §4 环境主张 node -e 亲核全中（ai **7.0.146** / zod **3.25.76** / typescript `^5.9.3` devDeps:24 / node **v24.21.0**） |

### AC4 时点说明（机制性，非违例）

VERIFY 时产品提交尚未生成——工作流脚本在 VERIFY 判定后才创建产品提交
（`.zcode/workflows/evolution-iteration.dwf.ts:390-405`），且 productPaths 过滤器
排除 `docs/evolution/`（:392）→ 产品提交将**仅含 `docs/adr/0012-mcp-client-transport.md`**，
BACKLOG 回写随归档提交入库（与 0011~0016 各轮同机制）。故本阶段以上方「提交前全量
改动核对」作 AC4 等价机器证明：迭代总改动面 = 白名单两路径 + 机制文件，禁止路径
（apps/ packages/ tests/ tools/ .github/ package.json/package-lock.json/宪法/AGENTS/
README）零字节改动。产品提交落地后 CLOSE 可用 `git show --numstat` 终验（预期恰
1 个路径）。

## 手动 E2E 与交互回归抽查（SPEC §8 点位，本阶段亲跑）

1. **起服 + API**：`node apps/server/dist/server.js`（后台）→ `curl /api/v1/health`
   返回 `{"ok":true,"engine":"agentflow-server","node":"v24.21.0",…}`；
   `curl /api/v1/models` 返回 DeepSeek 已配置（deepseek-chat/deepseek-reasoner）。
   验后 `taskkill //PID` 终止（输出「成功: 已终止 PID 为 640 的进程」）。
2. **浏览器画布加载**（Playwright Chromium 实开 http://localhost:3000）：
   `#viewport` 存在、`.node`×8、`.port`×15、`.wdg`×15、**pageerror=0**——文档轮对
   运行时零影响得证（截图存系统临时目录，验后已清理，仓库零残留）。
3. **交互抽查**：空白画布拖拽 → 视图平移生效（viewport style background-position
   -55.25px→44.75px 变化）；滚轮 → 画布缩放路径生效（background-size
   14.3px→15.89px）。初版探针把「滚轮门控」预期写成「无修饰键不缩放」，经读源码
   更正：门控语义是**选中节点的编辑控件上接管滚轮**（数字框步进/textarea 原生滚动/
   其余吞掉，`app.js:1555-1575`），未选中控件与空白处一律画布缩放（`app.js:1576-1578`）——
   实测行为与冻结语义**一致**，探针口径之误非产品缺陷。

## 观察项（不阻塞）

- **OBS-001（Minor，JOURNAL §2 已在案）**：ADR §4 引 `"type":"module"（package.json:4）`
  ——实际在 `apps/server/package.json:5`（:4 为 `"private": true,`）。主张本身
  （apps/server 为 ESM type:module）经本阶段 Read 亲核为**真**；行号偏 1 不构成技术
  结论矛盾，BUILD 按 SPEC §2「不改 ADR 正文」原样纳入的处置成立。处置建议：留待
  issue 获批后的 BK-0028 实施 SPEC 复核时顺手校正（该轮本就强制复核 ADR 时效）。

## 本阶段执行的检查（命令 + 结果摘要）

1. `npm run smoke:server` → `84 passed / 0 failed`（AC5 第四命令，本阶段补跑）。
2. `git status --porcelain=v1 -uall`（×2，首末各一次）→ 恰 6 条且集合不变（验收
   检查自身零残留）；`git diff -- <禁止路径清单> | wc -l` → 0；`git diff --cached
   --stat | wc -l` → 0。
3. `diff <(SPEC 模板行) <(BACKLOG 备注单元格)` ×3 → VERBATIM-OK；`diff <(git show
   HEAD:…BK-0013 行) <(worktree 同行)` → IDENTICAL；proposed 正则计数 → 3。
4. `wc -l`：ADR=278、tools.ts=116、guard.ts=100、llm.ts=122、config.ts=109、
   code.ts=69（ADR §8 现状行数主张全中）。
5. `node -e` 版本探针：ai 7.0.146 / zod 3.25.76 / typescript 5.9.3 / node v24.21.0
   （ADR §4 环境主张全中）。
6. `node apps/server/dist/server.js` + `curl /api/v1/health` + `/api/v1/models` +
   Playwright 画布/交互探针（临时脚本存系统临时目录，验后删除）。

## 结论

迭代 0017（BK-0027，纯文档轮）按 PRD AC1~AC6 与 SPEC §8 验收口径**全数通过**：
零代码 / 零依赖 / 零契约有机器证明，ADR-0012 草案与三子项定界、issue 草案齐备可用，
回归面全绿（脚本门禁 build/gate/test + 本阶段亲跑 smoke 84/0 + 浏览器 E2E）。
**建议 CLOSE**：BK-0027 置 done；脚本持 ADR 附录 A 字面量开 needs-approval issue；
BK-0028~0030 维持 proposed 等待用户批复。无修复轮需求（repair_round 保持 0）。
