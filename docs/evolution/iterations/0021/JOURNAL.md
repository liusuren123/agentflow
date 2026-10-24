# JOURNAL · 迭代 0021 · BK-0021 批次 1（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 20:45–21:07
> 输入：`iterations/0021/PRD.md` + `iterations/0021/SPEC.md` + 迁移 SPEC
> （`docs/node-definition-protocol-migration-spec.md`）+ NDP v0.2
> （`docs/node-definition-protocol.md`）。授权链：issue#11 用户批复（存储形式
> 重组·内容零漂移）；**非修宪轮**：全程零接触 golden、未运行 gate:update、
> `apps/**` 零改动。
> 完整门禁（`npm run build` / `npm run gate` / 根 `npm test` 链 /
> `npm run smoke:server`）与 git 提交由工作流脚本在 BUILD 之后统一执行——
> 本 JOURNAL 所载命令为 SPEC §8 逐步验证链（build:shared + shared 测试 +
> build:server）与一次性快照再生产对照，非完整门禁。

## 实施序（迁移 SPEC §3 四步的批次 1 化，SPEC 尾「给 BUILD 的实施序」）

### 步一 · schema 先行

- 落盘 `packages/shared/src/nodes.schema.ts`（174 行，预算 ≤300）：zod 3.25.76
  `.strictObject` 全体 + `discriminatedUnion('widget', …)` 五支 +
  `superRefine` 六规则（① params id 唯一 ② visibleIf.param 悬挂 ③ handler
  非空串 ④ combo 值域/number min≤d≤max·step>0 ⑤ strict 结构性 ⑥ 端口 id
  节点内唯一 + in-/out- 前缀）。预留字段（appearance/status/edgeRules/
  requiresApproval）以可选 + z.unknown 进 schema；capabilities 十 kind 键集
  （核心 6 + 扩展 4）枚举冻结、值 = boolean | strictObject 二选一。
- `test/schema.test.mjs`（150 行，预算 ≤150）：正例 T1/T2/T3 + protocol 缺省
  兜底 1；负例六类 + 端口前缀违例 + 端口 id 重复（共 8）。
- 验证：`npm run build:shared` → `node --test test/schema.test.mjs` **10/10 绿**。

### 步二/三 · 8 目录 + 聚合层反向合成（一次性落地，因 build 失败一次暴露类型问题）

- 落盘 8 目录 `src/nodes/{delay,trigger,llm,userinput,code,retrieval,condition,http}/node.ts`
  （21–41 行/个，预算 ≤60）：纯数据模块 `export default {…} satisfies NodeDefJson`，
  仅 type-only import；identity/params 文案为现行 DEFS 机械转写，端口 id 按
  SPEC §5 表一次性定稿（delay: in-any/out-any；trigger: out-start；userinput:
  out-value；llm: in-prompt/in-ctx/out-reply；retrieval: in-query/out-hits；
  http: in-body/out-response；code: in-input/out-result；condition:
  in-input/out-true/out-false）；implemented:false 标注 5 僵尸参数
  （trigger.mode/cron/path + userinput.vtype/req，参数本体原样保留）；
  llm.model 标 runtimeOverridable:true；capabilities 依 handler 实况（trigger
  `{}`、data 系 `{data:true}`、llm `{llm,mcp,skills}`、http `{net:{mode:
  'guarded'}}`、code `{exec:{mode:'sandboxed'},mcp}`）。
- `src/nodes.ts` 改造为聚合层（168 行，预算 ≤250）：8 静态 import（.js 后缀）→
  `loadJsonDef`（safeParse，失败 throw 含 type 与 issue 路径）→ `synthesize`/
  `synthesizeParam`（输出键插入序按 SPEC §4 键序表定死：name,cat,icon,[caps],
  desc,inputs,outputs,params,kw；caps 固定 `['mcp','skill']` 先 mcp 后 skill、
  皆无整键省略；visibleIf 编译 `if: p => p[param] === equals`；min/max/step
  仅提供时输出；implemented/runtimeOverridable/protocol/type/binding 不进输出）→
  NODES 16 键装配（8 合成 + 8 内联逐字搬运）→ 派生层 NODE_NAMES/
  paramDefaultsOf 逐字保留。对外仍且仅三导出（不变式 B）；index.ts 零改动。
- **踩坑记录（唯一一次红）**：`synthesizeParam` 中间变量 `const base = { t: p.widget … }`
  失去函数返回类型的上下文类型，字面量被拓宽为 `string`，TS2322 × 8。修复：
  各 case 改为直接字面量返回（ternary 两支均获 ParamDef 上下文类型）。教训与
  SPEC §4 键序表互证：键序由字面量书写序决定，直接返回反而更贴合「键序表」本义。
- 验证（不变式 A 首证）：`npm run build:shared` → node -e 序列化 NODES 与
  `test/nodes.baseline.json` Buffer.equals **逐字节相等（11521B）**。

### 步四批次 1 段 · 其余 6 目录已并入步二/三一次落盘（SPEC §4 全形态覆盖表不变）

### 测试四件套

- `test/nodes-dirs.test.mjs`（60 行，预算 ≤100）：D===R（import 集 ≡ 目录集）、
  D ⊆ keys(NODES)、内联残留集恰为批次 2 八键（AC9 机器化；「残留=0」终态
  断言按 SPEC 不启用）、引用边界（apps/web/src + apps/server/src 全源扫描，
  拒 `@agentflow/shared/dist/nodes/` 与 `nodes/<dir>/node` 直引模式，NDP §2.5）。
- `test/synthesis.test.mjs`（80 行，预算 ≤180）：caps 序（llm=['mcp','skill']、
  code=['mcp']、余 14 键负存在断言）、if 六行真值表（AC2）+ typeof function、
  8 键 params[].k 声明序（不变式 C）、**快照常驻比对**（Buffer.equals + 首异
  字节偏移 + 重生成指引，迁移 SPEC §5.1 推荐形态原文实现）、可写性常驻断言
  （!Object.isFrozen + params[0].o 赋值后还原，守护 app.js 运行期覆写现状）。
- `test/param-handler-guard.test.mjs`（132 行，预算 ≤200）：静态提取
  handlers.ts（最近前导 `async <name>(` 归属，无名箭头不匹配、闭包归宿主）+
  llm.ts（全文件归 llm）+ engine.ts（仅 `n.type === 'condition'` 守卫行归
  condition）；无法归属引用即红（不静默）；正向 (owner,key) ∈ params[].k；
  反向僵尸清单精确断言 `[['trigger',['mode','cron','path']],['userinput',
  ['vtype','req']]]`；两数分开（33 已定义 + 28 已实现 = 总数 − 僵尸数推导，
  不硬编码行数/处数/键数）。
- `test/schema.test.mjs` 见步一。

## 验证记录（本会话实跑，命令与结果如实）

| # | 命令 | 结果 |
| --- | --- | --- |
| 1 | `npm run build:shared` | ✅ tsc 零错误（修复 TS2322 后；dist 含 nodes.schema.* 与 nodes/<8 目录>） |
| 2 | `npm run build:server` | ✅ tsc 零错误（server 类型链对新 shared 包完好） |
| 3 | `npm test -w @agentflow/shared` | ✅ **26/26 绿**（既有 8 项 + 新增 18 项；复跑两次确认） |
| 4 | node -e Buffer.equals（NODES 序列化 vs 基线） | ✅ 11521B 逐字节相等 |
| 5 | 一次性快照再生产对照（SPEC §2 命令：node -e 重定向临时文件 + `cmp` + `sha256sum`） | ✅ cmp 输出空；双侧 sha256 `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275`（与迁移 SPEC 头部记载一致） |
| 6 | `git diff --stat -- <既有四测试>` | ✅ 输出空（AC4） |
| 7 | `git diff -- apps/web` | ✅ 输出空（AC6） |
| 8 | `git status --porcelain` | ✅ 产品改动恰 = SPEC §7 白名单（nodes.schema.ts/nodes.ts/nodes/×8/test×4）；nodes.baseline.json、events.ts、index.ts、`tools/**`、`.github/**`、根 package.json 零触碰 |
| 9 | 行数预算 wc -l | ✅ 174/168/21–41/150/60/80/132（预算 300/250/60/150/100/180/200 全达标） |
| 10 | EOL/BOM | ✅ 新文件全部 LF、无 BOM（grep CR 零命中） |

**未运行（按派发约定由脚本统一执行）**：`npm run build`（含 web）、
`npm run gate`、根 `npm test` 链（其组件 build:shared/build:server/shared 测试
已分别实跑且绿）、`npm run smoke:server`、git 提交。gate 基线绿的前置确认
（WORKFLOW §4）亦由脚本侧执行。

## 与 SPEC 的偏差记录（零实质偏差，两处路径级勘误）

1. **node.ts import 路径**：SPEC §2 边界表写 `'../nodes.schema.js'`，自
   `src/nodes/<type>/node.ts` 出发的正确相对路径为 `'../../nodes.schema.js'`
   （`../` 指 `src/nodes/`，该层无 schema 文件）。已按正确路径实现，type-only
   语义与「运行时零依赖」约束不变。
2. **schema.test.mjs 行数**：初版 153 行，压缩头注释至 150（预算 ≤150 达标）。

## 不变式与 AC 对照（BUILD 侧自证部分）

- **A 内容零漂移**：表 4/5 双证（常驻测试 + 一次性 cmp/sha256），16 键全量含未迁移 8 键。
- **B 导出面**：nodes.ts 仅三导出；index.ts 零改动（git status 无此文件）。
- **C 顺序**：键序/params 序由快照字节等价 + synthesis ③ 序断言双保。
- **D 波及面**：表 7/8。
- AC2 → synthesis ② 六行真值表绿；AC3 → guard 测试绿（33/28 分开）；
  AC4/AC6 → 表 6/7；AC9 → nodes-dirs 残留集断言 + 白名单核对。
  AC1 的常驻形态已落盘；AC5（gate）/AC8 后半（smoke）留脚本统一门禁与 VERIFY。

## 回滚

`git revert` 本迭代产品提交即可（纯存储形式重组，无数据迁移/依赖增减/env
变更）；常驻快照比对 revert 后仍绿（基线本就从原状生成）。BK-0021 保持
doing，批次 2（余 8 目录 + README 生成器 + 终态断言 + §5.6 在线 E2E 五点位）
为后续迭代；BK-0023 events.ts:32 注释留批次 2 终轮随批关账（本轮零触碰）。
