# JOURNAL · 迭代 0039 · BK-0049 MCP·skills 清单动态化（BUILD 轮）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-26 02:25（工作树
> `.zcode/worktree/feat/0039-iter`，分支 `feat/0039-iter`）。
> 输入：`iterations/0039/PRD.md` + `iterations/0039/SPEC.md` + ADR-0018 草案
> （SPEC 轮已落盘）。授权链不重开：issue#6 批复承继 2026-10-24T08:38:51Z。

## 1. 改动清单（逐文件，按 SPEC §2 受影响文件表落位）

| 文件 | 实际改动 | 与 SPEC 差异 |
| --- | --- | --- |
| `apps/server/src/capabilities.ts` | **新建** 67 行：capabilitiesHandler + BUILTIN_SERVER_DESC 五条 + SKILLS 五条（自 app.js:105-123 逐字迁移）+ 第二注册表实例（`buildMcpRegistry(envLoader(), { warn: () => {} })`）+ builtinServers() 派生（BUILTIN_MCP_IDS 序 × TOOL_SPECS 前缀过滤） | 无（≤200 行约束内） |
| `apps/server/src/server.ts` | 头注释路由清单 +1 行；import capabilitiesHandler +1 行；sessions 块后 v1-only 注册 2 行（含注释） | 无 |
| `apps/web/src/server-sync.js` | +capShapeOf（归一化+防御校验，external→服务级行 `desc:'外部注册（'+kind+'）'`、tools:[]）+fetchCapabilities +SVR.caps/capsErr 两键 +onCapsArrive +refreshCaps（失败静默） | 无（147→186 行） |
| `apps/web/src/legacy/app.js` | :104 注释改注回退集口径；`const MCP_SERVERS`→`let`、`const SKILL_LIST`→`let`（**数组字面量与每个字符串逐字不动**）；import +refreshCaps/onCapsArrive；:637 后 onCapsArrive 注册块（赋值 + caps 节点 rerenderNode + 选中恰 1 个 caps 节点时 renderProps+scrollTop 保持）；init() `ENGINE.probe()` 后 +`refreshCaps()` 一行 | 无（消费点 :785/:976/:986-987/:993/:1011-1013 原样零改动，git diff 证实） |
| `tools/pixel-gate/gate.mjs` | s12 块后纯插入：CAP_FIXTURE（SPEC §4.1 字面量原样 + external caps-ext）+ CAP_ROUTES（health+capabilities）+ CAPS_WF_SEED（trigger→llm，预选 web-search:['search']+skills:['doc-writer']）+ capsReady/capsInv + SCENARIOS 表 s13 行 | **选择器勘误一处**（见 §2） |
| `tests/smoke/smoke-server.mjs` | 头注释编排行 `P→H→W→N→CAP→S→…` + CAP 组描述段；CAP_EXPECTED_BUILTIN/SKILLS 常量（与 gate.mjs CAP_FIXTURE 同源同文）；N 组后 CAP01-CAP04（主实例）+ CAP05（第二实例 capSrv，env `MCP_HTTP_SERVERS='caps-ext=http://127.0.0.1:9,filesystem=http://127.0.0.1:9'`）；capSrv 变量 + C 组清理列表收编 | 无 |
| `tests/golden/ui/s13-caps-panel.png` + `.invariants.json` | golden-created 通道，gate 首跑自动落盘 | **BUILD 轮未产出**（见 §3，归脚本统一门禁） |

机制件（不入 productFiles）：STATE.md phase→BUILD、本 JOURNAL。（ADR-0018 / PRD / SPEC / BACKLOG 过程改动为前序阶段产物，已在工作树。）

## 2. SPEC 落地勘误一处（选择器，非语义变更）

SPEC §6.3 capsReady/capsInv 原文选择器 `#props .cap-server[data-sid]`——但
capsHtml 冻结面（app.js:979-987）的 `data-sid` 在 `.cap-server` 容器**内部的
input** 上（`<input data-cap="mcp-server" data-sid="...">`），容器本身无该属性，
原选择器恒匹配 0 元素 → capsReady 必超时、gate 崩溃。处置：按冻结 DOM 实况修正
取值路径，**意图零变化**——

- 计数判据：`#props .cap-server` 计数 === 6（5 builtin + 1 caps-ext，模板零改动
  前提下唯一既有路径）；caps-ext 存在性经 `.cap-server input[data-sid="caps-ext"]`；
- capsInv 取 sid：`s.querySelector('input[data-sid]')?.dataset.sid`；'on' 标记仍取
  容器 classList（`.cap-server ${sel.length?'on':''}` 原逻辑）。

SPEC §6.3「invariants 断言定稿」的语义目标（capServers 六元组带 on 标记 / capSkills
五元组 / capsSum / nodeCaps 分母 6）全部保留。未改渲染模板一行（宪法冻结面零触碰）。

## 3. BUILD 轮自测（全部实跑，命令与结果）

| # | 命令（工作树内） | 结果 |
| --- | --- | --- |
| 1 | `node --check` × app.js / server-sync.js / gate.mjs / smoke-server.mjs | 全部零输出通过（ALL SYNTAX OK） |
| 2 | `npm run build:server` | exit 0；`apps/server/dist/capabilities.{js,d.ts,js.map}` 产出 |
| 3 | 端点手 curl（PORT=39394 无 MCP env；PORT=39392 env 双条目） | 无 env：keys=[mcp,skills]、external=[]、builtin 五 id 序=filesystem,fetch,sqlite,browser,web-search、fs 工具序 read_file→write_file→list_directory、sqlite query→execute、browser navigate→click→screenshot、web-search/desc/tools 全字段与 SPEC §4.1 逐字一致、skills 五条逐字；env 态：external 恰 `[{serverId:"caps-ext",kind:"http"}]`（filesystem 冲突条被拒）、builtin 不受污染；`POST /api/v1/capabilities` → 404；冲突 warn 恰一条（inject 单例发出，第二实例静默无双报——日志亲核） |
| 4 | `npm run smoke:server` ×2 轮 | `==== smoke:server：130 passed / 0 failed ====`（两轮一致；125 基线零回退 + CAP01-CAP05 全 PASS，grep 逐行核实） |

过程小插曲（非产品问题）：首次双实例**并发**起服测端点时 no-env 实例
`SQLITE_BUSY`（两进程并发 initStore 抢同一 data/agentflow.db 锁）——改串行
后正常；smoke 套件内实例本就串行，不受影响（130/0 实跑佐证）。

## 4. 待脚本统一执行（BUILD 轮不自行运行，per 派发令）

1. `npm run build`（shared+web+server 全链；app.js/server-sync.js 经 vite 打包验证）；
2. `npm run gate`：预期 s0~s12 全 pass diffPx=0（零波及结构性保证 = 回退集逐字
   保留 + 静态服对 /api/v1/capabilities 必 404 + 模板零改动）；s13 首跑
   **golden-created** 落盘双文件（tests/golden/ui/s13-caps-panel.png +
   .invariants.json，productFiles 已含该两路径）；复跑 s13 pass；
   s0~s12 任一红即中止排查，不重录掩盖（SPEC §6.4 应急通道默认不消费）；
3. `npm test`（shared 零触及，30/30 零漂移预期）；
4. 手动 E2E 五点位（REQ-0049-02 ①~⑤，VERIFY 轮覆盖）；
5. 双提交：产品提交 productFiles 7 项（§5）/ 机制件提交（ADR+迭代目录+BACKLOG+STATE）。

## 5. productFiles 申报（相对工作树根）

1. `apps/server/src/capabilities.ts`（新增）
2. `apps/server/src/server.ts`
3. `apps/web/src/server-sync.js`
4. `apps/web/src/legacy/app.js`
5. `tools/pixel-gate/gate.mjs`
6. `tests/golden/ui/s13-caps-panel.png`（gate 首跑 golden-created 落盘后生效）
7. `tests/golden/ui/s13-caps-panel.invariants.json`（同上）
8. `tests/smoke/smoke-server.mjs`

## 6. 零接触面复核（SPEC §1.2 逐项）

- `packages/shared/**`：git diff 无该目录（smoke V09 亦断言 shared 干净）；
- `apps/web/src/Skeleton.tsx` / `app.css`：零 diff；
- `apps/server/src/mcp/`：零 diff（registry/inject 只读复用）；
- SSE 事件 / shared DEFS：零新增（CAP 组纯 HTTP）；
- 既有 golden s0~s12：零重录（本 JOURNAL 写就时 gate 未跑，实测归脚本门禁）；
- 渲染模板与处理器：capsHtml/capsChips/change 处理器零改动（git diff 亲核，
  app.js 全部 28 行增量集中在声明区/导入/arrive 块/init 一行）。

## 7. 修复轮 1（2026-10-26 02:30 前后，脚本门禁后派发）

**门禁发现（本会话取证还原）**：脚本统一门禁跑 gate 时 s3-library FAIL
（`tests/golden/diff/` 残留 s3 三件套为证：current.png / diff.png / invariants.json）；
随后脚本按修宪轮授权（WORKFLOW §4「gate 失败时允许执行一次 gate:update」）执行了
恰一次 `npm run gate:update`——13 个既有场景 PNG 重录后 **git 零 M**（字节级回到
HEAD），invariants 仅 EOL 归一（内容零变化，git diff 无任何 +/- 行），s13 双文件
经 golden-created 通道落盘。

**取证（本会话实跑命令与结果）**：

1. `node` 逐键比对 `git show HEAD:.../s3-library.invariants.json` vs
   `diff/s3-library.invariants.json`（失败帧不变量）：**逐键全等、零额外键** →
   失败仅像素面；
2. pixelmatch（工作树 node_modules，threshold:0）：HEAD s3 PNG vs 失败帧
   current.png → **diffPx=23**（1600×900 上的 23 个散点）；HEAD s3 PNG vs
   gate:update 后的 `ui/s3-library.png` → **diffPx=0**；
3. `ls apps/web/dist/index.html`：02:26 构建（晚于本轮全部前端改动），内联 bundle
   含 `外部注册` 字面量（server-sync 新代码在产物中；`api/v1/capabilities` 为
   运行时 `V1+path` 拼接故无整串；「离线回退集」是注释被压缩剥离）→
   **13 场景零波及是带新代码的实测**，非旧产物空跑。

**根因裁定：本机渲染瞬态抖动，与本轮改动无关**——① s3 = 节点库侧栏，面板内
零 caps 内容（capsHtml/capsChips 只在 #props 与节点徽章渲染，s3 两者均不在采集面）；
② 本轮供数链离线失败路径可证零 DOM 写（refreshCaps → apiJson 404 抛错 → catch →
arrive 回调 `if(!SVR.caps) return`）；③ 同代码同场景下一次捕获 23 散点、下一次
逐字节回到定稿基线——非确定性属环境侧（AGENTS.md「本机 Windows 差异仅参考，
golden 权威在 CI」）。**产品代码无缺陷可修**；gate:update 的净效果对既有 13
场景为零（字节不变，不构成宪法意义上的基线变更），s13 新基线经核与 SPEC §6.3
定稿逐项吻合（capServers 六元组恰 `filesystem,fetch,sqlite,browser,web-search*,
caps-ext`、capSkills 五元组 doc-writer*、capsSum「已启用 1 个 MCP 服务 · 1 个
工具 · 1 个技能」、nodeCaps 含「MCP 1/6 · 工具 1」——分母 6 = 供数链动态化铁证，
亲读 `tests/golden/ui/s13-caps-panel.invariants.json` 核实）。

**本轮处置**：

- 无产品代码改动（productFiles 维持 §5 清单 8 项不变）；
- 还原 13 个既有 invariants 的 EOL 噪音（`git checkout --` 精确 13 路径；内容
  零变化，git status 复核：产品 5 改 + capabilities.ts 新增 + s13 双文件新增 +
  机制件，与申报清单严格一致）；
- `tests/golden/diff/s3-library.*` 残留保留（目录 gitignored 不入提交；gate 全
  pass 时自动清空，gate.mjs:367-369）——留作本次抖动的诊断证据。

**本轮未跑**（派发令明令不自行运行）：gate / build / test / smoke——冒烟 130/0
为上一轮两轮实跑结果（§3），本轮未复跑。VERIFY 复测口径：s0~s12+s13 共 14 场景
全 pass（s13 已有基线，比较模式）；若 s3 抖动复现，按本节根因裁定处置（重跑/
CI 权威），勿再消费 gate:update（本轮已用掉修宪轮的一次授权）。
