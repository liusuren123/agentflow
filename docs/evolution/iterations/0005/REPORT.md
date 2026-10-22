# REPORT · 迭代 0005 · BK-0007 websearch 引擎参数生效化（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-22 16:16
> 输入：`PRD.md`（AC1-AC7 / REQ-0007-01~06）+ `SPEC.md`（§6 冒烟判据 / §7 验收口径 V1-V6 + M1-M5）+ `JOURNAL.md`（BUILD 交接）。
> 环境：本机 Windows（win32 10.0.26300）· Node v24.21.0 · 仓库 @ main 88dfb13 + 本迭代未提交工作区改动。
> **结论：PASS（0 缺陷）**，可进入 CLOSE。

## 0. 验收总结论

| AC | 判定 | 关键证据（详见 §2-§5） |
| --- | --- | --- |
| AC1 eng=博查 严格路由 | **PASS**（缺 key 半支实跑；配 key 正路径 M1 未跑，PRD 标可选不阻断） | E01 冒烟 PASS；反演演练红/绿双向；A1/A2 fail-fast |
| AC2 eng=SearXNG 严格路由 | **PASS**（三分支全实跑：缺 URL / 可达正路径 / 不可达） | E02 冒烟；C1（假实例正路径 `SearXNG 返回 3 条结果`）；C2（不可达如实跳过） |
| AC3 eng=Bing/Google 回退链 + 如实标注 | **PASS** | E03 冒烟（warn 先于网络、out 无 `eng=`）；E04 脏值分支；回退链代码逐字保留（diff 证据）+ DDG 实跑成功形态 |
| AC4 SEARXNG_URL 配置校验 | **PASS** | A1 退出码 1；A2 指名 `SEARXNG_URL：必须是合法绝对 URL`；B1 空串 / B2 缺省启动正常 |
| AC5 冒烟断言 engine 随 eng 切换 | **PASS** | `npm run smoke:server` → **39 passed / 0 failed**，退出码 0，E01-E03 PASS；反演演练证实断言可检出破坏 |
| AC6 渲染零影响 | **PASS** | V6 `git diff` 零触及（本会话实跑）；gate 4 场景由脚本运行通过（见 §1 口径）；UI 交互抽查结构不变 |
| AC7 契约零漂移 | **PASS** | `packages/shared` diff 为空（V6 实跑）；`npm test` 由脚本运行通过；UI 实测 eng 组合框恰 4 选项、默认 Bing（§5） |

## 1. 执行口径与边界（如实声明）

- **由编排脚本运行、本次未复跑**（按 VERIFY 指令约定）：V1 `npm run build`、V2 `npm run build:server`、
  V3 `npm run gate`（4 场景全绿）、V4 `npm test`——脚本在派发本阶段前已运行且通过。
  旁证：`apps/server/dist/*` 产物时间戳 15:52 > src 最后改动 15:49（构建在源改动之后）；
  本会话在反演演练后复跑 `npm run build:server` 亦零错误（§4），等价覆盖 V2。
- **本会话实跑**：V5 冒烟全套、V6 零触及判据、AC4 fail-fast、SearXNG 三态 E2E（本地假实例）、
  脏值 eng 分支、反演演练（dist 临时破坏→断言红→重建→断言绿）、Web UI 交互回归抽查（真实浏览器）。
- **未运行（原因如实）**：M1 博查正路径——本机无 `BOCHA_API_KEY`（真实 API 收费），PRD §依赖与风险
  明示「可选，不阻断 VERIFY 判定」；严格路由的请求/解析代码形态与 SearXNG 同构（`search.ts` 同一段
  实现模式，正路径已经 C1 全真验证），但博查专线未实测，留作部署后点位。M5 全量 UI 跑默认示例——
  会真实调用本机已配置的 DeepSeek LLM（产生费用）且含审批挂起节点；以 E03（同一后端路径）+ 零前端
  diff + UI 结构抽查（§5）替代，全量眼验留治理日。

## 2. V5 冒烟（AC5 主判据）与 V6 零触及

**V5**：`npm run smoke:server`（仓库根，退出码 **0**）：

```
==== smoke:server：39 passed / 0 failed ====
PASS E01 eng=博查（未配置 key）：run:done {ok:true,done:2,total:2}；out 含 eng=博查+BOCHA_API_KEY 且无 DuckDuckGo；log 含「不回退其他引擎」
PASS E02 eng=SearXNG（未配置 URL）：run:done {ok:true}；out 含 eng=SearXNG+SEARXNG_URL
PASS E03 eng=Bing：run:done {ok:true}；log 含「未接入」标注（网络无关）；out 不含 eng=（互斥反证：未误入严格分支文案）
```

- 与 JOURNAL §4 预告一致（39 = 既有 32 id/33 行 + E 组 3 id + C01 打点 2→5 行）；SPEC §6.2 硬判据
  `C.failed===0 && C.passed>=36` 满足；既有断言（P01-C04 全部）零回退。
- E03 在本机联网环境下通过（回退链 DDG 实际成功），同时印证回退链在改造后仍然活着；
  「未接入」标注判据与网络成败无关（先导发出），离线/在线结果一致（SPEC §6.2 确定性论证成立）。

**V6**：`git diff --stat -- packages/shared apps/web apps/server/src/tools.ts apps/server/src/engine.ts apps/server/src/server.ts tools/pixel-gate .github` → **无输出（零触及确认）**；`git status --porcelain` 仅 SPEC §2 清单 7 文件 + docs/evolution 产物。REQ-0007-06 / AC6 前半 / AC7 前半的机器判据成立。

**规模**：`wc -l` 实测 config.ts 109 / guard.ts 100 / search.ts 109 / handlers.ts 244 / .env.example 19 / lib.mjs 245 / smoke-server.mjs 342——全部 ≤400（AGENTS 硬性约定 4）。

## 3. 定向 E2E（AC1/AC2/AC4 · 临时脚本，仓库外 OS temp，不落源码）

脚本 `verify.mjs`（经 `tests/smoke/lib.mjs` 基座起真实 server 子进程 + SSE 断言），输出 **13 passed / 0 failed**：

| id | 场景 | 结果 |
| --- | --- | --- |
| A1 | `SEARXNG_URL=not-a-url` 启动 | **退出码 1**（fail-fast，AC4） |
| A2 | 启动报错指名 | pino fatal `problems:["SEARXNG_URL=\"not-a-url\"：必须是合法绝对 URL"]` |
| B1 | `SEARXNG_URL=''`（空串） | health 200 `ok:true`（缺省合法） |
| B2 | `SEARXNG_URL` 键删除 | health 200 `ok:true` |
| C1a-d | **SearXNG 正路径**：本地假实例（`format=json` 协议）+ `ALLOW_PRIVATE_NET=1` | run:done `{ok:true,done:2,total:2}`；out=`SearXNG 返回 3 条结果`（4 条假结果被 max=3 截断）；假实例恰收到 1 次请求 `path=/search q=验证问题 format=json`（SPEC §3.3 查询协议实证）；无误报降级文案 |
| C2a-c | **不可达实例**（`http://127.0.0.1:1` + ALLOW_PRIVATE_NET=1） | run ok；out=`搜索不可用 · 已跳过联网参考（eng=SearXNG · SearXNG 实例请求失败）`；log 含「不回退其他引擎」（不回退、不伪造） |
| C3a-b | **私网默认拦截**（假实例 URL，不开 ALLOW_PRIVATE_NET） | 同款如实跳过文案；假实例**零新请求**（guard 在 fetch 前拦截，SSRF 防护实证，REQ-0007-03） |

补充 `dirty-eng.mjs`（REQ-0007-01 第四分支）：`eng='Yahoo'`（combo 外脏值）→
warn=`引擎「Yahoo」未接入 AgentFlow 后端，已按回退链（博查 → DuckDuckGo）执行`（**携带实收值**），
out=`DuckDuckGo 返回 3 条结果`（回退链成功形态实跑）、run ok、out 无 `eng=` 前缀 —— **PASS**。

E2E 产生的 run 记录均已 `DELETE /api/v1/runs/:id` 清理；未创建 workflow。

## 4. 反演演练（AC5 可选半支 · **已做**）

1. 临时破坏编译产物 `apps/server/dist/handlers.js:49`：`if (eng === '博查' || eng === 'SearXNG')` → `if (eng === 'SearXNG')`（dist 为构建产物非源码；源文件零改动）。
2. 对破坏态跑 E01 判据 → **如预期红**：`FAIL E01(破坏态) :: out="DuckDuckGo 返回 3 条结果" | warn logs=["引擎「博查」未接入 AgentFlow 后端，已按回退链…"]`——博查被误入回退链，断言四判据（`eng=博查`/`BOCHA_API_KEY`/无 DuckDuckGo/不回退其他引擎）全部检出。
3. `npm run build:server` 重建（tsc 零错误），grep 确认 `eng === '博查' || eng === 'SearXNG'` 回位。
4. 还原态复跑 E01 判据 → **回绿**：`PASS E01(还原态) :: out="搜索不可用 · 已跳过联网参考（eng=博查 · 未配置 BOCHA_API_KEY）"`。

断言敏感性（可检出路由分支破坏）双向证实，AC5「人为破坏任一路由分支→对应断言红」成立。

## 5. 交互回归抽查（真实浏览器 · IAB @ http://127.0.0.1:39417 · 真实 server 进程）

本迭代零前端改动（V6 机器判据），抽查聚焦「UI 承诺未被破坏 + 既有交互存活」：

| # | 抽查项 | 结果 |
| --- | --- | --- |
| UI-1 | UI 加载与 DOM 骨架 | ✅ banner（◆ AgentFlow / 标签 智能客服助手）、左侧导航 8 键、节点库侧栏、属性面板、底部执行日志面板、运行/撤销/重做/平移/框选/适应视图/缩放工具条、示例工作流 8 节点 7 连线——快照全在 |
| UI-2 | 双击空白画布 → 快速搜索弹窗 | ✅ 「搜索要添加的节点…」输入框激活，节点全列可见 |
| UI-3 | 搜索「网页搜索」+ 回车添加 | ✅ 节点 #9 添加，Toast「已添加『网页搜索』」，计数 8→9 节点 |
| UI-4 | **eng 组合框（本迭代的 UI 承诺面）** | ✅ 画布 widget 与右侧属性面板两处组合框**均恰 4 选项：Bing [选中]、Google、博查、SearXNG**；结果数量默认 5——DEFS 呈现零漂移（AC7 的 UI 实测旁证） |
| UI-5 | 属性面板切引擎 → 画布 widget 同步 | ✅ selectOption 博查后两处组合框值均为「博查」 |
| UI-6 | 节点工具条「仅执行此节点」 | ✅ 日志面板出现「▶ 网页搜索 · 单节点执行 #9」——注：该按钮为**存量客户端模拟执行**（`apps/web/src/legacy/app.js:1196-1218` RUN_META 假进度/假输出），不触后端（既有原型行为，非本迭代引入，见 §7 观察-1） |
| UI-7 | 撤销 / 重做 | ✅ 9n/7e → 撤销 → 8n/7e → 重做 → 9n/7e |
| UI-8 | 缩放 | ✅ 50% → ＋ → 59% → 重置为 100% → 100% |

抽查会话未触发工作流保存（`saveWorkflowToServer` 仅显式保存调用，`apps/web/src/server-sync.js:25`），服务端 data/ 无工作流残留；抽查后浏览器标签与服务进程均已关闭。

## 6. 代码走查（diff 级，与 SPEC 定稿逐项对照）

- `handlers.ts` websearch 段：严格分支（博查/SearXNG）→ `{skipped,reason}` 时 warn + `out` 携带 `eng=<值>` 前缀与所缺变量名；Bing/Google/未知值 → 先发「未接入」warn（含实收 eng 值）再走**逐字保留**的原 `webSearch` 回退链（原 :52-58 行在 diff 中无改动）——与 SPEC §3.5 文案定稿表逐串一致（含「（不回退其他引擎）」「（其余流程继续）」互斥措辞）。
- `search.ts`：`StrictResult` 三态、两严格调用器单次尝试不回退不重试、reason 不含 eng 值（单一文案出口）；`webSearch` 内 `process.env.BOCHA_API_KEY` → `config.bochaApiKey`（SPEC §3.2 授权的顺手统一，空串归一语义等价）。
- `guard.ts` `searxngSearch`：URL API 编码 `q`/`format=json`、`assertPublicUrl` 先于 fetch、UA/12s 超时同 DDG 档、`count` 不进请求（注释说明）。
- `config.ts`：白名单/`z.string().trim().url()`/产物 `searxngUrl` 三段落齐备（先例 `AI_BASE_URL` 同款）。
- `tests/smoke`：`startServer(port, opts, timeout)` env 覆盖表后置实现空串双重压制（`.env` 不覆盖已有键 + config 空串归一，SPEC §6.1 机理）；E 组夹具 params 显式给出、runId 登记清理。

## 7. 观察记录（非缺陷，不阻断）

1. **「仅执行此节点」为客户端模拟**（`app.js:1196-1218`）：前端原型既有的假执行路径，输出文案为 RUN_META 模拟值而非后端真实结果——与本迭代无关（后端真实路径为 ▶ 运行 → `/api/v1/run` SSE，E01-E03/C1-C3 已实证）。若未来要求单节点真实执行，属新 backlog 项。
2. 顶部工具条按钮以 `title`/`aria-label` 命名且 Playwright 常规 click 不达（actionability 拦截），自动化需坐标/键盘路径——既有 UI 自动化特性记录，供后续测试基建参考。
3. E03/脏值分支在本机联网环境走通 DDG 真实请求（回退链成功形态）；「回退链全败」形态未在本会话直接复现（需离线/断网），但该分支文案代码为原 :52-58 逐字保留（diff 证据），且迭代 0002 冒烟时代同形态曾验证。

## 8. 结论

- PRD AC1-AC7 全部满足（AC1/AC2 的「已配置密钥」正路径：SearXNG 已全真验证（C1），博查未实测（无密钥，PRD 明示可选不阻断））。
- SPEC §7 验收口径：V5/V6 本会话实跑通过；V1-V4 脚本已跑通过（§1 口径）；M2/M3/M4 已做（且超出：以本地假实例完成 M2 正路径）；M1 未做（无密钥）；M5 以等价证据替代（§1）。
- SPEC §6.3 反演演练：**已做**，断言敏感性双向证实。
- 交互回归抽查 8 项全过（§5），UI 三层零漂移与「UI 承诺兑现」均获实测证据。
- **缺陷清单：无（0 BUG）。verdict = PASS**，建议进入 CLOSE（归档 + BACKLOG 置 done + metrics 追加）。

---

> 存证：本 REPORT 全部结论出自 2026-10-22 15:52-16:16 本会话实跑（命令与输出见 §2-§5）或对
> 未提交工作区 diff 的逐行走查（§6）；脚本已跑项按 VERIFY 指令口径如实标注未复跑（§1）。
