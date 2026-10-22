# JOURNAL · 迭代 0008 · BK-0012 legacy 模块与 React 骨架职责边界文档化（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-22 19:23
> 输入：`PRD.md`（REQ-0012-01~06 / AC1~AC6）+ `SPEC.md`（§1 交付物规格 /
> §2 受影响文件清单 / §4 验收口径 / §5 BUILD 实施序列）。
> 实现严格按 SPEC §2 落点：产品改动**仅** `docs/frontend-module-boundaries.md`
> 纯新增 1 文件——零代码改动、零 UI 触碰、零既有文件修改（含四模块头注）。
> 门禁（build/gate/test）与 git 提交由工作流脚本统一执行（本 JOURNAL §6 如实
> 记录未跑项）。

## 1. 改动清单（产品面 1 文件，与 SPEC §2.1 一一对应）

| 文件 | 动作 | 实际行数（SPEC 约束） | 内容 |
| --- | --- | --- | --- |
| `docs/frontend-module-boundaries.md` | 新增 | 178（≤200 建议） | 按 SPEC §1.2 骨架：头部定位声明 → §1 总览表（四模块路径/行数(核对日期)/一句话职责/边界权威指针）→ §2-§5 四模块各一节（四要素小节）→ §6 组合时序与数据流四步；§4 含 /api 作用域精确化注记 |

迭代产物面（非产品面）：`docs/evolution/STATE.md`（phase SPEC→BUILD）+ 本
JOURNAL。SPEC §2.2 零改动面达成：`apps/**`、`packages/**`、`tools/**`、
`tests/**`、`.github/**`、`CONSTITUTION.md`、`AGENTS.md`、既有 `docs/` 文件
全部未动（git status 核对见 §5）。

## 2. 基线复核（SPEC §5 步骤 1，BUILD 会话实跑）

- `wc -l apps/web/src/Skeleton.tsx apps/web/src/legacy/app.js
  apps/web/src/server-sync.js apps/web/src/app.css apps/web/src/App.tsx
  apps/web/src/main.tsx` → **182 / 2419 / 131 / 532**（另 App.tsx 15、
  main.tsx 9），与 SPEC §3.1、PRD 背景 2、迭代 0001 盘点基线
  （`iterations/0001/JOURNAL.md:164-169`）**零漂移** → 文档行数按基线值记载，
  核对日期 2026-10-22。
- `ls docs/` + `ls docs/adr/`：边界文档不存在（`frontend-module-boundaries.md`
  为新增）；ADR 编号止于 0008，PRD 背景 8「不新增 ADR」成立。

## 3. 事实指针逐条核验（撰写前置，文档每条断言的 grounding）

SPEC §3 核验表 9 项在 BUILD 会话**全部重跑**（不盲信 SPEC），结果全一致：

| 指针 | 核验方式（本会话实跑） | 结果 |
| --- | --- | --- |
| `Skeleton.tsx:1-7` 头注、:3-6 五规则、:71 `#viewport`、:74 空 `#nodes-layer`、:2-3 退役史 | Read `Skeleton.tsx:1-90` | 一致 |
| `App.tsx:1-7` 头注、:10 import、:12-15（effect :13 / return :14） | Read 全文 | 一致 |
| `main.tsx:3` 引 app.css、:5-6 无 StrictMode 注 | Read 全文 | 一致 |
| `app.js:1-2` 头注、:3,133 `const DEFS = NODES`、:9-11 `__af_booted` | Read `app.js:1-20` + `sed -n '125,140p'` | 一致 |
| app.js fetch 恰 4 处且均 `/api/*`（:2041 health / :2062 stop / :2220 approve / :2230 run） | `grep -n "fetch(" apps/web/src/legacy/app.js` + 上下文 sed | 一致（grep 仅 4 行命中） |
| `server-sync.js` 全部引用段（:1-9 头注、:11 V1、:15-20 apiJson、:35-43 SVR、:45-48 回调、:50-67 refresh/load、:78-84 回放注释、:78-120 映射） | Read 全文（131 行） | 一致 |
| ADR-0002 CP-C（`0001-0003-...md:33-44`）与决策 2（:24-26 画布保持命令式） | `sed -n '28,46p'` + `sed -n '14,30p'` + grep 决策 | 一致 |
| ADR-0006 §4.3=142 / §4.4=170-177 / §4.6=187-191 | `grep -n "^### 4\." 0006-...md` + `sed -n '140,195p'` | 一致 |
| gate 4 场景（`gate.mjs:60-65`）+ cssVars 断言（:91） | `sed -n '55,70p'` + `sed -n '88,93p'` | 一致 |
| 提交 `828ae57`：skeleton.html −168 / Skeleton.tsx +182 | `git show --stat 828ae57`（活仓库实跑） | 一致 |
| 迭代 0001 JOURNAL §4.2-1（:93-95）/§4.2-2（:96-97）/git show 段（:135-145）/wc 段（:164-169） | `sed -n` 四段 | 一致 |

## 4. 撰写过程与结构决策

1. 按 SPEC §1.2 骨架落笔，内容取自 §1.3 四表 + §1.4 时序 + §1.5 规约；指针
   全部取自上节本会话复核值（非转抄 SPEC）。
2. **四要素小节齐备化**：SPEC §1.3 的 §4（server-sync）基线表无独立「事实源
   指针」行、§5（app.css）基线表无独立「禁止事项」行（均为内联表达）；因
   REQ-0012-02 与 SPEC §5 自查第 1 项均要求「每节四要素」，补 §4「事实源
   指针」小节（ADR-0005/0006 文件指针，头注 :8 已引 ADR-0005）与 §5「禁止
   事项」小节（内容仍是 SPEC §1.3 §5 行内既有约束的结构化，无新增断言）。
   属 SPEC §1.2 骨架要求的落实，非影响面扩大（仍在单文件内）。
3. §4 精确化注记按 SPEC 强制要求全文落位：运行类 `/api/*`（app.js:2041/
   2062/2220/2230 合法现状）与持久化类「仅 /api/v1」（server-sync.js）分写，
   防双向误改。
4. 引用不复制：宪法条文一律指针（「宪法第 1 条结构层」「`CONSTITUTION.md:16-18`」）；
   仅两处短属性短语带引号引用文件头注原文（「CSS 原文（逐字，勿改）」「被
   legacy/app.js 消费」）作定位，非条文/DEFS 复制。

## 5. 自查清单输出（SPEC §5 步骤 3，逐项）

| 项 | 判据 | 结果 |
| --- | --- | --- |
| 四节×四要素 | §2-§5 各含 职责/禁止/互操作/事实源 | ✅ `grep -n "^## \|^### "` 实跑：§2 五小节、§3 四小节、§4 四小节+注记、§5 四小节（事实源指针按 SPEC §1.3 §5 基线内联于各小节） |
| 时序四步 | §6 在位且每步挂指针 | ✅ 四步对应 App.tsx:14 / :13+app.js:9-11 / server-sync.js:50-67+ADR-0006 §4.6 / :78-84 |
| 头部声明 | 现状整合视图 + 约束顺位 + 核对日期 | ✅ 文件头 3-8 行 |
| 行数 ≤200 | `wc -l` | ✅ 178 |
| 每条断言有指针 | 四类指针（路径:行/ADR/宪法·AGENTS 条款/提交号） | ✅ 撰写时逐条挂（§3 复核表支撑） |
| 无宪法/AGENTS/DEFS 整段复制 | 对照原文 | ✅ 仅指针 + 两处短属性短语（§4.4 条） |
| 「仅 /api/v1」作用域注记 | §4 精确化注记在位 | ✅ 文档 §4 末小节 |
| 改动面白名单 | 产品路径仅新文档 1 个 | ✅ `git status --porcelain` 产品面仅 `?? docs/frontend-module-boundaries.md`（另迭代产物 STATE/JOURNAL 在 `docs/evolution/` 内，属 §2.3 非产品面） |

## 6. 未跑项（如实记档，非本角色职责）

- `npm run build` / `npm run gate` / `npm test` / 产品 git 提交：**未跑**——
  按 WORKFLOW §4 与派发指令，由工作流脚本在 BUILD 后统一执行（SPEC §4.1 /
  §5 步骤 4 同分工，沿迭代 0001 JOURNAL §0 惯例）。本项为纯文档新增、
  零渲染路径接触，AC3 以脚本门禁输出为裁决。
- `npm run gate:update` / golden 重录：非本项验收面（WORKFLOW §6 护栏 2），
  未跑且禁跑。

## 7. 偏差与风险记录

- **对 SPEC 无实质偏差**：落点、行数、骨架、内容基线、注记全部照单；唯一
  结构性动作是 §4.4 条的四要素小节齐备化（SPEC §1.2 骨架自身要求）。
- 文档陈旧化风险按 PRD 风险 1 处置：行数均带核对日期 2026-10-22，治理日
  抽查兜底，不建自动机制。
