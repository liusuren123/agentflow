# JOURNAL · 迭代 0001 · BK-0001 现状盘点（BUILD 阶段记录）

> 产出角色：code-developer（BUILD）· 2026-10-22 00:37
> 输入：`iterations/0001/PRD.md`（REQ-0001-01~05 / AC1–AC5）+ `iterations/0001/SPEC.md`
> （§1 核对矩阵 / §2 grep / §3 基线 / §4 余量 / §5 回写方案）。
> 运行环境：本机 Windows（win32 10.0.26300）Git Bash；gate 以 CI（windows-latest）为权威
> （AGENTS.md 已知陷阱 / PRD 风险 2 / SPEC §10）。本阶段零代码改动，所有核对命令均为只读。

## 0. 门禁分工声明

按本轮派发契约：`npm run build` / `npm run gate` / `npm test` 与 git 提交由工作流脚本
在 BUILD 之后**统一执行**，BUILD 未自行运行。因此：

- 本文证据 = BUILD 亲自执行的只读核对（第 1、2、4 节，命令原文 + 输出全文/摘要）；
- SPEC §3 / V1–V3 的 build/gate/test 输出摘要不在本文伪造，以脚本执行结果与
  `REPORT.md`（VERIFY）落档为准；
- SPEC §8 V7 手动 E2E（E2E-1~3）依赖 build 产物，BUILD 同样未执行，移交 VERIFY。

本项为纯文档盘点（doc），唯一产品性改动 `docs/evolution/ROADMAP.md`，不触任何渲染路径。

## 1. CP 落地状态核对矩阵执行结果（REQ-0001-01 / AC3；SPEC §1 逐行复跑留证）

### CP-B（最终形态：构建链 + 托管 + 门禁 target）

| # | 结论 | 证据（BUILD 2026-10-22 复跑） |
| --- | --- | --- |
| B1 | 一致 | `apps/web/package.json:14,21-23`：react ^18.3.0 / typescript ^5.6.0 / vite ^5.4.0 / vite-plugin-singlefile ^2.0.0；`apps/web/vite.config.ts:7`：`plugins: [react(), viteSingleFile()]` |
| B2 | 一致 | `apps/server/src/server.ts:52-56`：`WEB_INDEX = path.join(ROOT,'apps','web','dist','index.html')`，缺失时 `logger.fatal` + `process.exit(1)` |
| B3 | 一致 | `tools/pixel-gate/gate.mjs:25-30`：无 `--target` 时默认 `path.join(ROOT,'apps','web','dist')`；目录无 index.html 时 `process.exit(2)` |
| B4 | 一致 | 见第 2 节 grep ×2：均 0 匹配（exit=1） |

### CP-C（等价 JSX 骨架）

| # | 结论 | 证据 |
| --- | --- | --- |
| C1 | 一致 | `apps/web/src/App.tsx:12-15`：仅 `useEffect(() => { bootLegacyApp(); }, [])` + `return <Skeleton />`；`ls apps/web/src` = App.tsx / Skeleton.tsx / app.css / legacy / main.tsx / server-sync.js；`grep -rln "className" apps/web/src` → Skeleton.tsx 与 legacy/app.js 两处，其中 app.js 为**命令式 DOM 属性赋值**（如 `app.js:467` `mask.className = 'modal-mask'`、`app.js:759` `el.className = 'node'...`），非 JSX——骨架 JSX 唯一源于 `Skeleton.tsx` |
| C2 | 一致 | `git ls-files \| grep -i skeleton` → 仅 `apps/web/src/Skeleton.tsx`（exit=0）；工作区 `ls apps/web/src` 无 skeleton.html；删除提交 828ae57 同提交 stat：skeleton.html −168 行 / Skeleton.tsx +182 行（输出见第 6 节附录） |
| C3 | 一致 | `git log --oneline --follow -- apps/web/src/skeleton.html` → 520d918（引入）→ 828ae57（删除），两条可溯（输出见第 6 节） |

记档差（不构成不一致）：ADR-0002 CP-C 记「约 170 行」（ADR `:33`），实测 `wc -l` =
182 行；在「约」容差内，核对点为结构性（唯一源 / 已退役）且均通过，行数不进关账判定。

### CP-D（shared 单一事实源 + 托管 + 门禁 + 退役）

| # | 结论 | 证据 |
| --- | --- | --- |
| D1 | 一致 | `apps/web/src/legacy/app.js:3`：`import { NODES } from '@agentflow/shared';`；`app.js:133`：`const DEFS = NODES;   /* 单一事实源：@agentflow/shared（ADR-0003） */`，无本地 DEFS 字面量 |
| D2 | 一致 | 与 B2 / B3 同一证据两用（`server.ts:52-56` / `gate.mjs:25-30`；SPEC §1 D2 注明，此处照记） |
| D3 | 一致 | `git ls-files \| grep -E "^index.html\|^tools/extract-web"` → 0 匹配（exit=1）；仓库根 `ls index.html tools/extract-web.mjs` → 均 No such file（exit=2）；`ls tools` 仅 pixel-gate；`apps/web/index.html` 存在（`wc -l` = 12 行）——系 Vite 构建链合法入口，非原单文件，SPEC D3 辨析成立；extract-web.mjs 末次变更于 2e36688（`git log --oneline -1 -- tools/extract-web.mjs`） |

**判定**：10/10 一致 → T1-M1 具备关账条件（gate/test 基线复跑归脚本门禁与 VERIFY，
见第 0、3 节）。

## 2. 残留注入路径检查（REQ-0001-02 / AC1；SPEC §2 命令原文与输出全文）

在仓库根（Git Bash）执行，输出全文（含退出码）如下：

```console
$ grep -rn "dangerouslySetInnerHTML" apps/web/src
（无输出）  exit=1

$ grep -rn "?raw" apps/web/src
（无输出）  exit=1
```

两条均 0 处匹配 → **AC1 通过**（与 PLAN/SPEC 两轮初查一致，BUILD 复跑留证完毕）。

## 3. 基线证据（REQ-0001-03 / AC2；SPEC §3）

| 序 | 命令 | BUILD 执行？ | 结果归属 |
| --- | --- | --- | --- |
| 3.1 | `npm run build` | 否 | 工作流脚本统一执行；输出摘要落 VERIFY `REPORT.md` |
| 3.2 | `npm run gate` | 否 | 同上；本机 Windows 结果仅参考（CI 权威） |
| 3.3 | `npm test` | 否 | 同上 |

对照基线：`docs/evolution/weekly/43.md` §二（2026-10-22 治理日全量回归：gate 4 场景
diffPx=0、test 5/5），PRD 依赖节声明预期可复现。本项零代码改动，ROADMAP 回写后
gate 仍应全绿（AC5）——该复跑同归脚本门禁。

## 4. 移植余量清单（REQ-0001-04；SPEC §4 底稿 + BUILD 实测复核）

### 4.1 四模块职责现状（`wc -l` 实测 2026-10-22，输出见第 6 节）

| 模块 | 行数 | 职责现状 | 边界记载位置 |
| --- | --- | --- | --- |
| `apps/web/src/Skeleton.tsx` | 182 | 静态骨架等价 JSX（CP-C 机械转换规则的落地载体） | 文件头注（`Skeleton.tsx:1-7`）+ AGENTS.md 仓库地图 |
| `apps/web/src/legacy/app.js` | 2419 | 画布/交互命令式模块（逐字提取 + `bootLegacyApp` 包装） | 文件头注（`app.js:1-2`）+ `App.tsx:1-7` |
| `apps/web/src/server-sync.js` | 131 | `/api/v1` 数据接入层（fetch 封装 + 列表缓存 + 事件回放映射） | 文件头注（`server-sync.js:1-9`，明示「不直接操作面板 DOM」） |
| `apps/web/src/app.css` | 532 | CSS 原文（逐字，勿改） | AGENTS.md 硬性约定 1 |

### 4.2 其他余量（如实记档，本迭代不改变）

1. `app.css` 逐字等价无专用自动断言，由 gate DOM 不变量的 cssVars 比对间接保护
   （`tools/pixel-gate/gate.mjs:91`：`:root` 变量表随每场景不变量断言逐一相等）——
   现状成立，记录事实。
2. `legacy/app.js` 2419 行：AGENTS.md 硬性约定 4 的 400 行上限只约束**新增**源文件，
   存量不违例；作为长期模块化候选记入余量（是否立项由 CLOSE 决定，本迭代不扩 scope）。
3. ADR-0002 CP-C「约 170 行」vs 实测 182 行的记档差（见第 1 节 CP-C）。

### 4.3 T1-M2 差距结论

职责边界现状散落于「各文件头注 + AGENTS.md 仓库地图」，无独立的边界说明文档合入
`docs/` —— 此即 T1-M2（未开始）的全部余量；验收口径已按 SPEC §5 细化进 ROADMAP
（见第 5 节编辑点 2），边界文档本身不在本迭代产出（PRD 非目标）。

## 5. ROADMAP 回写记录（REQ-0001-05 / AC4；SPEC §5 编辑点逐条落实）

| 编辑点 | 落实情况 |
| --- | --- |
| T1-M1 状态行 | 置「已完成（迭代 0001 盘点关账，BK-0001）」+ 三类证据（核对矩阵 10/10 / grep ×2 = 0 匹配 / gate·test 基线指针 weekly/43.md §二 + REPORT 归档）；已删除「待 BK-0001 交叉核对手工关账」过渡表述 |
| T1-M2 条目 | 状态附盘点证据（头注指针 + 无独立文档）；验收细化为 ①四模块边界文档合入 `docs/` ②合入后 gate 4 场景全绿，附现状行数（182/2419/131/532） |
| 「待办（治理周维护）」首条 | 更新为关账结论一行摘要 + 证据指针到本迭代目录；ready 队列与待批准区行文未动（PM/CLOSE 职权，SPEC §5 约束） |

回写铁律自查：全部标注挂命令输出摘要或 `路径:行` / 提交号指针；无「看起来一致」类
表述；未改 T1 主题结构，未触碰 T2–T4。

## 6. 命令输出附录（原始记录，Git Bash @ 2026-10-22 00:3x）

```console
$ grep -rn "dangerouslySetInnerHTML" apps/web/src
exit=1

$ grep -rn "?raw" apps/web/src
exit=1

$ git ls-files | grep -i skeleton
apps/web/src/Skeleton.tsx        exit=0

$ git log --oneline --follow -- apps/web/src/skeleton.html
828ae57 refactor(web): 静态骨架由 dangerouslySetInnerHTML 注入转为等价 JSX（ADR-0002 CP-C）
520d918 feat(web): React 机械移植 CP-B —— 构建产物对原始 golden 像素级一致

$ git log --diff-filter=D -1 --stat -- apps/web/src/skeleton.html
commit 828ae5714cd65929cbb72d20aec67e6aac51b2a4
（提交说明略，全文见仓库；diffstat 关键行：）
 apps/web/src/skeleton.html | 168 ----...----（168 deletions）

$ git show --stat --oneline 828ae57
828ae57 refactor(web): 静态骨架由 dangerouslySetInnerHTML 注入转为等价 JSX（ADR-0002 CP-C）
 AGENTS.md                                          |   3 +-
 apps/web/src/App.tsx                               |  11 +-
 apps/web/src/Skeleton.tsx                          | 182 ++++++++++++
 apps/web/src/skeleton.html                         | 168 -------
 ...001-0003-constitution-mechanical-port-shared.md |  17 +-
 5 files changed, 202 insertions(+), 179 deletions(-)

$ git ls-files | grep -E "^index.html|^tools/extract-web"
exit=1

$ ls index.html tools/extract-web.mjs
ls: cannot access 'index.html': No such file or directory
ls: cannot access 'tools/extract-web.mjs': No such file or directory
exit=2

$ ls tools
pixel-gate

$ ls apps/web/src
App.tsx  Skeleton.tsx  app.css  legacy  main.tsx  server-sync.js

$ ls apps/web/src/legacy
app.js

$ wc -l apps/web/src/Skeleton.tsx apps/web/src/legacy/app.js apps/web/src/server-sync.js apps/web/src/app.css
   182 apps/web/src/Skeleton.tsx
  2419 apps/web/src/legacy/app.js
   131 apps/web/src/server-sync.js
   532 apps/web/src/app.css
  3264 total

$ wc -l apps/web/index.html
  12 apps/web/index.html

$ git log --oneline -1 -- tools/extract-web.mjs
2e36688 refactor(web): Stage 2 完成切换 —— React 产物成为权威 UI（对定稿 golden 0 差异）

$ grep -rln "className" apps/web/src
apps/web/src\Skeleton.tsx
apps/web/src\legacy\app.js        exit=0

$ grep -n -m 5 "className" apps/web/src/legacy/app.js
467:  mask.className = 'modal-mask'; mask.id = 'confirm-modal';
759:  el.className = 'node'+(...)
1841:  div.className = 'logline '+lvl;
1849:  t.className = 'toast '+cls; t.textContent = msg;
```

## 7. 未尽事项与移交

- `npm run build` / `npm run gate` / `npm test`（V1–V3 / AC2 / AC5 复跑）：工作流脚本
  统一执行，输出摘要归 VERIFY `REPORT.md`（第 0 节分工）。
- 手动 E2E E2E-1~3（V7）：未执行（依赖 build 产物），移交 VERIFY。
- git 提交（产品提交与归档提交）：脚本统一执行，BUILD 未做任何 git 写操作。
- STATE.md：phase 已推进 `BUILD`（本次）；后续按契约由脚本/协调者推进 VERIFY/CLOSE。
