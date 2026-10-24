# JOURNAL · 迭代 0022 · BK-0021 批次 2 终轮（BUILD）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-24 23:55–2026-10-25 00:2x
> 输入：`iterations/0022/PRD.md` + `iterations/0022/SPEC.md` + 迁移 SPEC
> （`docs/node-definition-protocol-migration-spec.md`）+ NDP v0.2
> （`docs/node-definition-protocol.md`）。授权链：issue#11 用户批复（授权面 =
> 附录 A ①存储形式重组·内容零漂移 + ③BK-0023 随批增量）；**非修宪轮**：
> 全程零接触 golden、未运行 gate:update、`apps/**` 零改动。
> 完整门禁（`npm run build` / `npm run gate` / 根 `npm test` 链 /
> `npm run smoke:server`）与 git 提交由工作流脚本在 BUILD 之后统一执行——
> 本 JOURNAL 所载命令为 SPEC §9「BUILD 每步验证」链（build:shared +
> shared 全量测试 + build:server）与一次性快照再生产对照，非完整门禁
> （0021 JOURNAL 同口径）。SPEC §10 步 0 的 gate 基线预检同由脚本统一执行。

## 实施序（SPEC §10，红→绿逐步落地）

### 步 1 · nodes-dirs 终态断言翻转（红）

- `test/nodes-dirs.test.mjs`（64 行，预算 ≤100）：断言 3 由「残留集恰为
  批次 2 八键」收敛为 **residual `[]`**；新增终态计数断言 `D.size === 16`
  （显式计数防迁移中态误判绿）；断言 1 的 D===R + D ⊆ keys(NODES) 结构与
  断言 2 引用边界扫描零改动回归；头注更新为终态口径。
- 验证：`npm run build:shared && npm test`（shared）→ **26 项：25 绿
  1 红**，唯一红 = nodes-dirs `AssertionError: 8 !== 16`——与 SPEC 预期
  精确一致（其余 25 项全绿含快照常驻比对）。

### 步 2 · 8 目录逐个迁移（每步一验，不变式 A 逐步成立）

按 SPEC §10 步 2 逐目录落地（新建 `node.ts` → nodes.ts 加 import + 该键
换 `synthesize(loadJsonDef(...))` → 每步 `npm run build:shared && npm test`
shared 链），顺序与形态：

| # | 目录 | 行数 | 形态要点（SPEC §3 定界表逐字执行） |
| --- | --- | --- | --- |
| 1 | prompt | 22 | textarea 默认值含 `\n` 换行（同 code 已验形态）；in-var/out-prompt |
| 2 | websearch | 28 | combo 4 项 + number d5 min1 max20 step1；`p.max`=结果数量义；net.guarded |
| 3 | notify | 28 | **空 outputs** + combo + text；`p.to`=接收人义；net.guarded |
| 4 | loop | 22 | **list 输入端口** + number + toggle conc；`p.max`=迭代义；data |
| 5 | merge | 28 | **双 inputs** in-a/in-b + combo 2 项；data |
| 6 | reply | 21 | 空 outputs + textarea d'{{content}}'；data |
| 7 | setvar | 20 | text；data |
| 8 | approval | 28 | combo 超时策略 3 项 + text；`p.to`=超时策略义；**human+llm 双能力** |

- 每步结果恒为 **26 项：25 绿 1 红**（唯一红 = 终态计数 N≠16 递增计数），
  synthesis 快照常驻比对（Buffer 级、16 键全量）**每步必绿**——8 步无一
  字节漂移；identity/params 文案与默认值逐字取自 `nodes.ts:107-155` 内联
  DEFS（本会话 Read 亲核后机械转写，零润色）。
- 第 8 目录（approval）落地 → **26/26 全绿**（残留=0 + D===R=16 终态达成）。

### 步 3 · 聚合层收敛 + 头注更新

- `nodes.ts` 142 行（预算 ≤250，SPEC 估 130–150）：16 静态 import（批次 1
  8 行后追加批次 2 8 行，键序 = 现行声明序逐字不变，不变式 C）；16 键全量
  `synthesize(loadJsonDef(...))`、8 键内联字面量删除；loadJsonDef/
  synthesize/synthesizeParam/compileVisibleIf 与三导出及派生层零改动；
  头注更新为终态口径（16 目录全量 + 常驻快照守护 + README 生成器指针）。

### 步 4 · readme-consistency 测试落盘（红）

- `test/readme-consistency.test.mjs`（110 行，预算 ≤150）四 test：① 表格
  回比（16 类型端口/参数表 ⇄ dist node.js 源数据 + 标题/一句话用途 +
  目录集恰 16 无缺无孤 + 根层孤儿 md 断言）；② 总索引恰 16 行且序 =
  Object.keys(NODES)；③ 生成器确定性（spawnSync(process.execPath) 重生成
  到 os.tmpdir，17 份产物逐字节比对；在库侧 CRLF→LF 归一以免疫本仓
  core.autocrlf=true 的再检出 EOL 策略，生成器 tmp 产物本身以恒 LF 无 BOM
  逐字节断言——SPEC §6.2-③ 口径落在生成器产物侧）；④ 在库 README 无 BOM。
- 落盘首跑 **4/4 红**（ENOENT：README 未生成）——SPEC 预期先红。

### 步 5 · README 生成器 + 17 份生成物入库（绿）

- `tools/gen-node-readmes.mjs`（133 行，预算 ≤200）：数据源 = dist
  （SPEC §12-① 定稿）——`await import(dist/nodes/<type>/node.js)` 取
  NodeDefJson，键序唯一取自 `dist/index.js` 的 Object.keys(NODES)；CLI
  `node tools/gen-node-readmes.mjs [--out <dir>]`（根 package.json 零改动
  不新增 npm script，不变式 D）；只写内容有变化的文件；KIND_GUARDRAILS
  固定护栏文案（NDP §7.2 镜像）+ MANUAL_NOTES 16 条现状备注单一持有于
  生成器常量（SPEC §12-② 定稿，文案事实锚点全部本会话核实：handlers.ts/
  engine.ts/search.ts/approval-review.ts 行号逐一亲核）。
- 生成物 17 份入库：`src/nodes/README.md` 总索引（30 行）+ 16 份
  `src/nodes/<type>/README.md`（各 29–41 行，NDP §8 五段结构：标题/一句话
  用途/端口表（含 append-only 顺序号与 any 脚注）/参数表（含 implemented
  状态列）/能力与护栏表/现状备注）；转义规则 = 换行→字面 `\n`、`|`→`\|`；
  LF、无 BOM、末尾恰一换行。
- 首跑暴露一处**实施笔误**（非源数据漂移）：测试断言模板误写全角 `（` +
  半角 `)`，与生成器的全角 `（…）` 不匹配 → 修测试断言（生成器与生成物
  零改动）→ **shared 30/30 全绿**（26 + 4 新增）。

### 步 6 · 生成器幂等自检

- `node tools/gen-node-readmes.mjs` 重跑 → 输出「**0 写入 / 17 无变化**」；
  `git diff --stat -- packages/shared/src/nodes tools/gen-node-readmes.mjs`
  输出空（生成物均为新增未跟踪文件，无已跟踪文件漂移）——SPEC §10 步 6 达成。

### 步 7 · BK-0023 events.ts +1 行注释

- `git diff -- packages/shared/src/events.ts` = **恰 +1 行注释**（42→43 行，
  SPEC §7 形态定死逐字落地）：`/* ok = 本次运行未被中止（≠全部节点成功）；
  消费端 apps/web/src/server-sync.js:105-107 按「ok !== false && !ev.stopped」
  定级渲染 */` 插入 `ok: z.boolean(),` 上方；schema 行逐字零变化，
  events-negative 测试零改动全绿（30/30 内含）。

### 步 8 · BUILD 收尾链 + 快照再生产对照

- SPEC §9 BUILD 每步验证链终跑：`npm run build:shared && npm test -w
  @agentflow/shared && npm run build:server` → **shared 30/30 绿
  （26 既有 + 4 新增）；build:server 0 error**。
- 一次性快照再生产对照（迁移 SPEC §2 命令，0021 JOURNAL 同款证据形态）：
  `node -e "import('./packages/shared/dist/index.js').then(m=>process.stdout.
  write(JSON.stringify(m.NODES,null,2)+'\n'))" > $TEMP/baseline.check.json`
  → `cmp packages/shared/test/nodes.baseline.json $TEMP/baseline.check.json`
  **输出空**；双侧 sha256 均为
  `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275`、
  双侧 11521 字节——与迁移 SPEC §2 记载逐字一致，**不变式 A 终态铁证**。

## 实施发现与处置

1. **MSYS grep 假信号**：Git Bash 下 `grep -c $'\r'` 对 LF 文件误报行数，
   以 `od -c` / node 字节级检查为权威——Write 工具在 win32 落盘 CRLF，
   已将 10 个新文件（8 node.ts + 生成器 + 测试）统一转 LF 后字节级复验
   **全 0 CR、无 BOM**（PRD 非功能 4 EOL 纪律），转换后收尾链复跑全绿。
2. **全角括号笔误**（步 5）：测试断言半角 `)` vs 生成器全角 `）`——
   修测试不改生成物，生成器与 README 零回改。
3. **schema 零缺口**（SPEC §11 风险 2 预判属实）：批次 2 八键（空 outputs/
   双 inputs/list 端口/boolean 默认值）随 loadJsonDef 全部通过校验，
   `nodes.schema.ts` 零改动——无需启用例外口径。

## 行数预算核销（SPEC §8/§9）

| 文件 | 预算 | 实际 |
| --- | --- | --- |
| 8 × `nodes/<type>/node.ts` | ≤60/个 | 20–28 |
| `nodes.ts` | ≤250 | 142 |
| `tools/gen-node-readmes.mjs` | ≤200 | 133 |
| `test/nodes-dirs.test.mjs` | ≤100 | 64 |
| `test/readme-consistency.test.mjs` | ≤150 | 110 |
| `events.ts` | 42→43 | 43（恰 +1 注释行） |
| README 生成物 17 份 | 约 25–30 / 40–60 | 30 / 29–41（文档不计源码上限） |

## 白名单边界终核（AC4/AC7/AC9 前半，git status/diff 亲核）

- `git diff --stat -- packages/shared/test/{contract,defs-drift,events-negative,
  handlers-coverage}.test.mjs` 输出空（既有四测试零改动）；
- `git status --porcelain -- apps tools/pixel-gate .github package.json
  package-lock.json packages/shared/src/index.ts packages/shared/src/
  nodes.schema.ts packages/shared/test/nodes.baseline.json packages/shared/
  test/{schema,synthesis,param-handler-guard}.test.mjs` 输出空（零改动
  白名单全部零触碰）；
- 本轮改动面 = SPEC §8 白名单 30 文件（8 node.ts 新增 + nodes.ts +
  events.ts + 生成器 + 17 README + nodes-dirs 改 + readme-consistency 新增）
  + `docs/evolution/**`（机制件，随归档提交口径）——白名单外零出现。

## 未执行项（由脚本统一执行，如实标注）

- SPEC §9 终轮收尾门禁四条（`npm run build` / `npm run gate` / 根
  `npm test` / `npm run smoke:server`）与 git 产品提交：本轮 BUILD 未运行，
  由工作流脚本在 BUILD 之后统一执行（本 ask 指令 + 0021 先例口径）。
- AC6 §5.6 在线态人工 E2E 五点位（npm start + 浏览器五点位）：VERIFY 阶段
  test-manager 亲跑取证（0021 REPORT 先例），BUILD 不替代。
