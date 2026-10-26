# 迭代 0051 · PRD — BK-0059 .env.example 模板同步：可选段补 MCP 注册表两条目

> PLAN 轮产物（WORKFLOW.md §4 PLAN 契约 v2/v3）。S 项免独立 SPEC：受影响文件清单与
> 验收口径内嵌于本 PRD（§4/§5），返回 skipSpec=true。本轮隔离工作树
> `.zcode/worktree/feat/0051-iter/`（分支 `feat/0051-iter`），产物全部落在工作树内。
> 选题时间 2026-10-26 13:47–13:52。

## 0. 结论与分类（先行）

- **建议：做**（本轮项）。ready 队列枯竭下的规则④证据补题，同径先例 BK-0052（0040）/
  BK-0053（0041）/ BK-0054（0045）/ BK-0055（0046）/ BK-0056（0047）/ BK-0057（0050）
  连续六轮 done。本项为**部署面配置模板与已批准 env 白名单的同步**——ADR-0012 落地
  的外部 MCP 注册表两个环境变量自迭代 0024 起进入 config.ts 白名单，但运维模板
  `.env.example` 从未补行（迭代 0005 先例：BOCHA/SEARXNG 落地同轮即补模板行），
  属**当轮漏项**非刻意省略。S 级零行为风险。
- **触UI 分类结论：否**。仅改 `apps/server/.env.example`（配置模板注释行，全部
  `#` 前缀）。本会话亲跑 `grep -rn "env\.example" tests apps tools .github
  package.json` → **零命中**（构建/测试/门禁/渲染路径对该文件零引用），无像素/
  DOM/CSS/交互因果。POLICY 自主区（「文档与实现同步」）。
- **非新增环境变量语义**（POLICY 需批准区不触发）：`MCP_HTTP_SERVERS` /
  `MCP_STDIO_SERVERS` 的语义与白名单已随 ADR-0012 经 needs-approval issue#10
  用户批复（2026-10-24，迭代 0023/0024/0025 消费）定稿在库；本项**零语义变更、
  零代码改动**，仅把已批准变量的值形态示例补进模板注释——`config.ts` 零触碰。
- **非修宪轮**：全程禁 `npm run gate:update`，golden 零接触；S 项 skipSpec。
- **单轮项**：无批次编排，无姊妹子项。

## 1. 背景与选题过程（枯竭判定存证）

选题前置亲核（本会话实跑/实读，均在隔离工作树 feat/0051-iter 内）：

1. **ready 队列**：`grep -n "| ready |" docs/evolution/BACKLOG.md` 全表唯一
   BK-0040（BACKLOG.md:53）——已被并行工作流占位，派发提示明令本轮禁选
   （feat/0036-iter 在途）。ready 队列枯竭成立。
2. **批复档案**：approved 无 / rejected 无 → 规则①③零动作。
3. **issue 面板**：#13/#12/#6/#5/#4 均 needs-approval 无新批复——#13（BK-0058
   gate.mjs 头注场景数，tools/pixel-gate/ 属 POLICY 需批准区明文）与 #12（CI 像素
   门禁 s3 抖动，golden/pixel-gate/CI 需批准射程）均不自主处理（0045~0050 同判）；
   #4/#5/#6 修宪授权链已承继消费（BACKLOG 各行在案），对应子项各有前置未竟
   （#4→BK-0041/0042 前置 BK-0040 在途；#5→BK-0044/0045 阻塞于 ADR-0014 附录 A
   依赖批复；#6→BK-0047/0048 硬前置 BK-0019/0020 仍 proposed）；无 user-request
   新项 → 规则②零动作。
4. **侦察档案**：残缺标记唯一实质项 = browser stub（tools.ts:138），ADR-0011 评估
   终态非缺陷不立项（0041/0045/0046/0047/0050 五轮同判在案）；tools.ts:5 系 stub
   设计说明非缺陷；package-lock.json:787 系 integrity 哈希内 "XXX" 字符误报；
   悬挂 run 探针 `[]` 空；覆盖差集/文档漂移/dogfooding 系治理日产物，心跳不重复
   采集。
5. **近 3 迭代（0046/0047/0050，工作树 iterations 目录最新三个）在档观察复览**：
   全部闭口或已有归属——0046「遗留观察：无需后续动作」；0047 OBS-0047-01（本机
   :3000 陈旧进程，环境侧）+ OBS-0047-02（头注尾句措辞归治理日）；0050 的 s3
   采样抖动（issue #12 在案待批复）与 BK-0058（pending-approval，issue #13 已开
   2026-10-26 协调者）均已有承载。→ 在档残留清零，本轮转 PM 自主侦察。
6. **PM 自主侦察（0046/0047/0050 同法：只读 grep/亲读/git log）**：本轮扫描面 =
   「配置/模板/清单类静态载体 vs 实现实况」——server 源码头注族（guard/config/
   engine/agent/llm/mcp-*/capabilities）与前端/测试基建头注（server-sync.js /
   app.js / Skeleton.tsx / lib.mjs×2 / nodes.ts / events.ts）逐文件亲读**均无
   漂移**（store.ts/tools.ts/sessions.ts 0046/0047 已核维持）；唯一实质缺口 =
   `.env.example` 可选段缺 MCP 注册表两条目（证据见 §2，入选本项）。
   同轮排除：docs/frontend-module-boundaries.md:13-18 行数表与 BK-0051 README
   漂移 = doc 类归治理日批处理（doc 心跳不选）；AGENTS.md:47 断言数漂移 =
   POLICY 禁止区；ROADMAP.md:66 状态行与 BK-0015 随批关账 = 治理日 PM 回写件
   （0050 PRD §0.5 同判，不重复立项）。

**先例链**（为什么心跳可补题且可选）：BK-0055/0056（源码头注同步）、BK-0057
（冒烟编排串同步）均为 PM 自主侦察发现的「静态载体滞后实况」同族项，证据形态
（文件:行 + 亲跑输出 + git 取证 + 滞后源 BACKLOG/ADR 在案）与本项同构；本项载体
为配置模板（apps/server/ 产品树内，非 README/docs/**，非 doc 类型），心跳可选。

## 2. 立项证据（可验证指针）

| # | 指针 | 现值 | 实况 | 滞后源 |
| --- | --- | --- | --- | --- |
| E1 | `apps/server/.env.example`（全文 19 行，本会话 head/cat 亲读） | 「可选」段仅 BOCHA_API_KEY / SEARXNG_URL / ALLOW_PRIVATE_NET / PORT 四条；`grep -c "MCP" apps/server/.env.example` → **0** | `MCP_HTTP_SERVERS` / `MCP_STDIO_SERVERS` 已是正式 env（E2），模板零记载 | 迭代 0024（BK-0029）落地注册表时未同步模板 |
| E2 | `apps/server/src/config.ts:31-33` ENV 白名单 | — | 白名单行含 `'MCP_HTTP_SERVERS', 'MCP_STDIO_SERVERS'`；`:68/:71` 各有 `z.string().superRefine` 格式校验（E1-E8 fail-fast） | （实况锚点） |
| E3 | `git log --oneline --all -- apps/server/.env.example`（本会话亲跑） | 全历史仅 2 提交：`f322df6`（monorepo 化搬移）+ `a5b284f`（0005/BK-0007 补 BOCHA/SEARXNG 行） | `git log --oneline -S "MCP_HTTP_SERVERS" -- apps/server/src/config.ts` → `82f5b56`（0024/BK-0029）只改 registry/config/mcp-registry.mjs/package.json 四路径（metrics 0024 行在案），模板未触 | 0024 当轮漏项 |
| E4 | ADR-0012:191（env 白名单方案 A 定稿） | — | 明文值形态示例：`MCP_HTTP_SERVERS="name1=https://host/mcp,name2=…"`；`MCP_STDIO_SERVERS="name1=npx --yes @modelcontextprotocol/server-sqlite --db-path …,name2=…"`，并注「**运维故事同 SEARXNG_URL**」——SEARXNG_URL 在 .env.example 有模板行，运维故事对齐即模板应对齐 | 设计意图与模板现状的落差 |
| E5 | `find` 亲证 + AGENTS.md 锚点 | — | 全仓唯一 `.env.example` = `apps/server/.env.example`；AGENTS.md「server/.env 不入库（.env.example 是模板）」——模板即 env 的运维文档面 | （定位锚点） |

**同轮先例对照（证明「当轮补模板」是既有义务而非新惯例）**：迭代 0005（BK-0007）
落地 BOCHA_API_KEY/SEARXNG_URL 时产品提交 a5b284f 同轮含 `.env.example +1`
（metrics 0005 行文件清单在案）——env 落地与模板同步同轮完成；0024 落地 MCP 两
变量时漏做本步，本项即补账。

## 3. 需求（REQ）

- **REQ-0059-01（唯一需求，必做）**：`apps/server/.env.example`「── 可选 ──」段
  纯插入 MCP 注册表两条注释行（建议 2 行、上限 4 行），每条含：
  ① 变量名字面（`MCP_HTTP_SERVERS` / `MCP_STDIO_SERVERS`）；
  ② 值形态示例（与 ADR-0012:191 一致的 `name1=url,name2=…` /
  `name1=命令 参数…,…` 形态，示例值不得为真实密钥/内网地址）；
  ③ 一句话用途注（外部 MCP server 注册表；可含 ADR-0012 / BK-0029 溯源指针）。
  全部新增行为 `#` 前缀注释（模板风格与现有 BOCHA/SEARXNG 行一致），不引入任何
  生效配置。
- **非功能**：全产品面 diff 恰 1 文件、纯插入 ≤4 行；`config.ts` 零改动（env 语义
  已批准定稿，本项零语义变更的机器证明 = AC2/AC5）；新行行尾与文件现状一致
  （本会话 `cat -A` 亲证该文件现存行尾为 CRLF，`.gitattributes` 未对其设策略
  ——仅 baseline.json 有 eol=lf 条目，BUILD 保持文件既有风格即可）。

## 4. 受影响文件清单（S 项免 SPEC 内嵌）

| 文件 | 改动 |
| --- | --- |
| `apps/server/.env.example` | 「可选」段纯插入 2~4 行注释（REQ-0059-01 字面） |
| `docs/evolution/iterations/0051/` | 机制件（PRD/JOURNAL/REPORT，随机制件提交） |

**零触碰清单**（验收硬边界）：`apps/server/src/**`（**含 config.ts——env 语义面
零触碰**）、`apps/web/**`、`packages/**`（含 test 与 baseline）、
`tools/pixel-gate/**`、`tests/**`（含 golden 与 smoke）、`.github/**`、
`package*.json`、`docs/adr/**`。

**不为模板新增断言/护栏**：两 env 的语义面已由 config.ts zod E1-E8 fail-fast +
smoke MR01-MR11（mcp-registry.mjs，迭代 0024）+ CAP01-CAP05（0039）机器守护；
模板是注释零行为、无断言锚——新增模板断言属过度工程，明确不做（BK-0055/0056/0057
同口径）。

## 5. 验收标准（Given / When / Then）

- **AC1（正路径/回归零变化）**：Given 工作树基线绿，When `npm run build` 与
  `npm test`，Then 构建成功 + 30/30 全绿（与 0047/0050 基线一致，零增量断言）；
  `.env.example` 非构建/测试输入（§0 grep 亲证零引用），行为面零变化。
- **AC2（改动面机器证明）**：When `git diff HEAD -- apps/`（产品面），Then 恰
  1 文件（.env.example）纯插入 ≤4 行；新增行全部 `#` 前缀；diff 含字面
  `MCP_HTTP_SERVERS` 与 `MCP_STDIO_SERVERS` 且值形态与 ADR-0012:191 一致
  （name=… 逗号分隔）；`git diff HEAD -- apps/server/src` → 恒空（env 语义面
  零触碰）。
- **AC3（门禁红预案——先例形态）**：Given 0037~0050 已归档的本机 s3-library
  采样抖动（diffPx≈21~23、rerun 即绿、CI 权威，issue #12 在案），When 合并后
  gate 首跑仅 s3 红，Then 按预案处置：不消费 `gate:update`，复核 DOM 不变量
  逐键全等后以复跑/CI 权威裁决（本项对渲染路径零因果，§0 grep 亲证）。
- **AC4（回归面）**：`npm run build` / `npm run gate`（除 AC3 预案形态外全绿）/
  `npm test` 30/30 / `npm run smoke:server` 133/0（=0047/0050 基线，零回退；
  MR/CAP 组 env 断言原样通过）。
- **AC5（禁区白名单）**：When `git diff HEAD -- apps/server/src packages
  apps/web tools/pixel-gate tests .github 'package*.json'`，Then 恒空；且
  `git diff HEAD --stat` 产品面仅 .env.example 1 文件。

**验收命令口径**：`npm run build` + `npm run gate` + `npm test` +
`npm run smoke:server`（主干复测四件套，归合并复测执行）。

## 6. 不做范围

- 不动 `config.ts` 与任何 env 语义（POLICY 需批准区「新增环境变量语义」不触发
  也不扩大——本项为已批准变量的模板补账）。
- 不动 README.md（BK-0051 doc 项治理日批处理）与
  docs/frontend-module-boundaries.md 行数表（doc 类同批）。
- 不动 gate.mjs:4（BK-0058，pending-approval，issue #13 待批复，tools/pixel-gate/
  需批准射程）与 issue #12（CI 抖动，待批复）。
- 不动 AGENTS.md:47 断言数漂移（POLICY 禁止区，0046 PRD §2 已留档）；不动
  ROADMAP.md:66 状态行与 BK-0015 随批关账（治理日 PM 回写件）。
- 不为模板行新增断言（§4 既定）；不改文件既有行（纯插入，存量 19 行逐字保留）。
- 不回改 0050 及此前已定稿的 PRD/REPORT 文本（双层记录惯例）。

## 7. 风险

- 唯一可预见风险 = AC3 所列本机 s3 采样抖动（环境侧，0037 五次采样 0/23/0/21/0、
  0039~0041/0045~0047/0050 多轮同形态在案），预案已备，零产品因果路径。
- EOL 细节：.env.example 现存 CRLF（cat -A 亲证）、.gitattributes 无该文件条目
  ——新增行保持文件现状风格即可，避免引入 EOL 噪音（BUILD 期以 `git diff` 目验
  确认无整文件重写）。
- 模板示例值安全：仅形态示例（name1=url 占位），不含真实密钥/内网地址，符合
  「密钥不入库（.env 模板除外）」边界。

## 8. 溯源与优先级

- 来源主题：T3·后端执行能力（BACKLOG BK-0059 来源列 T3；ROADMAP.md:66-73 现状
  基线明载真 MCP client 落地 + env 白名单注册表）；派生链 = 规则④枯竭补题，
  先例 BK-0052（0040）/0053（0041）/0054（0045）/0055（0046）/0056（0047）/
  0057（0050）连续六轮同径 done；授权链不涉 issue（ADR-0012 语义批复已关单
  issue#10，本项零语义变更）。
- 优先级 P1 / 大小 S / 类型 debt / 触UI 否——P1 取齐 BK-0051（MCP 能力文档族，
  部署面可发现性直接受损：模板零记载则外部注册能力仅存于 ADR/源码可发现）。
- 无 issue 来源（sourceIssue 无）；reconstitutional=false（纯注释、非修宪轮、
  禁 gate:update）；itemContinues=false（单轮可完，无批次编排）。
