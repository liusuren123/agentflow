# JOURNAL · 迭代 0071 · BK-0014 智能体扩展发现器（BUILD 轮）

> 产出角色：code-developer · 2026-10-31 05:11 · 工作树 feat/0071-iter
> 输入：`iterations/0071/PRD.md` + `iterations/0071/SPEC.md`（行号锚点均本工作树实读核验一致）
> + ADR-0023（权威蓝图）+ issue#16 获批在案。**触UI=否（非修宪轮）：全程零 `gate:update`、
> 零 golden 接触、零 packages/shared、零前端文件**（AC9 机器证明见 §4）。

## 1. 实现清单（按 SPEC §2 受影响文件白名单逐项）

### 1.1 新增（2 源文件 + 1 冒烟 + fixtures）

| 文件 | 行数 | 要点 |
| --- | --- | --- |
| `apps/server/src/mcp/discovery-audit.ts` | 90 | pty/audit.ts 逐型同构：ROOT 上溯派生、`SUMMARY_MAX_CHARS=256`、幂等 `initDiscoveryAuditStore`/`closeDiscoveryAuditStore`、`clip()`、`recordDiscoveryAudit` 容错（try/catch + pino warn，审计失败不阻断行为）；**另加 kb/store.ts:70-75 `conn()` 懒自启兜底**（inject.js 模块装载期扫描早于 server.ts 显式 init 的时序兜底，幂等 DDL 任意序安全）；DDL 与 SPEC §4.2 逐字一致（`source/entry/kind/summary/created_at` 五字段）。**store.ts 零改动**（AC8 git diff 恒空，§4） |
| `apps/server/src/mcp/discovery.ts` | 344（≤400 ✓） | 两纯函数 `parseDiscoverySourcesSpec`/`parseDiscoveryAllowSpec`（registry parseSpec 同风格：`条目 N：` 前缀 + E3/E5/E8 同型文案）+ `discoverCandidates`（三源固定层级扫描 + §5.2 全部纪律 + 审计/日志 + ALLOW 过滤）+ `composeSources`（模块级单次记忆化）+ `discoveredSysExtension`（§5.7 组装，零命中=''）+ `resetDiscoverySnapshotForTest`（测试探针面，registry.ts discoveryCount 同型先例）；PROJECT_ROOT/HOME 生产锚自派生（pty/audit.ts:17 同型）+ `DiscoverOptions` 注入缝；**零模块级副作用**（config.ts 安全 import 纯函数）；`NAME_RE`/条目类型复用 registry（零新类型） |
| `tests/smoke/mcp-discovery.mjs` | 481 | MC01-MC22 全绿（§3）；进程内组（dist 直测 + 注入缝）+ 子进程组（startServer 真实接线 + 真仓根 fixture 守卫/清理） |
| `tests/smoke/fixtures/discovery/**` | 8 数据文件 | `project/`（.mcp.json + .agents 树含 skills/rules/mcp.json）、`home/`（主权区形态）、`badjson/`、`badname/` 四棵固定布局样例树；链接/oversize/上限应力样本**运行时生成进 tmp 副本**（git 不保符号链接形态、300KiB 样例不入库——SPEC §6.3「报告须注明实际手段」，见 §2.6） |

### 1.2 修改（7 文件，SPEC §2.2 封闭清单逐项对表）

| 文件 | 改动 |
| --- | --- |
| `mcp/registry.ts` | ① `NAME_RE` 加 export（唯一字面变化）；② `McpRegistrySources` v2 append-only 三可选成员 + 头注补两行 BK-0014 记载；③ `envLoader` 追读两 key（`|| undefined` 空串归一同形态）；④ `buildMcpRegistry` 追加 discovery 合并臂：`taken = BUILTIN ∪ 已接受` 去重 + `discoveredEntryProblem` 形状防御复核（kind/http URL/stdio command+args），重名或非法 → warn（固定锚 `已拒绝该 discovery 条`）+ 拒该条、进程不退；v1 两成员解析、E1-E8、抛错通道、内置冲突拒绝语义零改动 |
| `config.ts` | rawEnv 键表 +2 key；`EnvSchema` +2 字段（superRefine 调 discovery 两纯函数，:70-75 先例形态）；import +1。`loadConfig` 返回对象与既有交叉校验零改动 |
| `mcp/inject.ts` | :37 表达式替换 `buildMcpRegistry(composeSources(envLoader), { httpFetch: mcpFetch })` + import +1（envLoader 传函数本体，非调用结果） |
| `capabilities.ts` | :39 同型替换 `composeSources(envLoader)` + import +1；SKILLS 常量与 external 派生零改动 |
| `llm.ts` | :35 表达式尾部纯追加 `+ discoveredSysExtension()` + import +1（零命中='' ⇒ 与现状逐字节等价）；`:39 buildToolSession` 通道零改动（并行 BK-0018 冲突面最小化，SPEC §6.5） |
| `agent.ts` | :41 同型纯追加 + import +1；:48 `createSession({…, sys: p.sys })` 零改动（发现正文不落跨会话存储） |
| `server.ts` | import +1；`initDiscoveryAuditStore()` 插于 PTY 块后/KB 块前；`closeDiscoveryAuditStore()` 插于 `closePtyAuditStore()` 后、`closeKbStore()`/`closeStore()` 前（审计连接先于主库关闭时序不变式） |

## 2. 实现决策与偏差记录（如实）

1. **Mimosa 安全钩子处置（路径穿越告警）**：Write discovery.ts 时钩子报「第 240 行动态路径片段
   经 path.join 进入文件读写」高危建议。评估：不可信分量仅 readdir 条目名（win32/POSIX
   文件名均不可能含路径分隔符，遍历结构性不可达），projectRoot/homeDir 为 SPEC §4.3 测试
   注入缝非用户配置面。按 AGENTS.md「按其建议修复、禁止绕过」采**建议形态**：新增
   `withinRoot(root, target)`（tree.ts isWithinRoot 同构私有实现）在 skills/rules 两处
   条目名拼接点做包含性防御（候选路径越出扫描根 → parse-fail 拒条），扫描根本身不约束
   （约束即废注入缝）。自动化会话无用户可询，取安全侧选项 1，语义零放宽。
2. **rootExcluded 判定域解读**：SPEC §5.2「扫描根落入 FOLD/.git 语义域→整源 parse-fail
   （固定锚定下理论不可达）」。若按「任一路径分量」字面实现，本仓工作树锚
   `.zcode/worktree/…` 天然含 `.zcode` 分量 → project 两源在一切工作树内恒 parse-fail，
   与「理论不可达」的防御定位自相矛盾。实现取「扫描根本身及其直接父目录名」为判定域
   （锚定链上级路径不判），头注注明依据；条目级（skill 目录名/rule 文件名）仍按
   任一分量字面执行。
3. **快照 = 激活事实集**：`skills/rules/entries` 仅含 ALLOW 命中者（MC03 断言空集），
   `counts` 承载发现事实（含未激活候选）——两集分立并存（ADR-0023 §4.3）；SPEC §4.1
   「body 仅 ALLOW 命中者读入」在该口径下自然成立，未确认候选的文件内容零读入内存。
4. **MC05 测试流经生产接缝**：首轮实现测试直调 `discoverCandidates` 后调
   `discoveredSysExtension()` 得空串——根因：记忆化按 SPEC §5.3 单归 `composeSources`
   （discoverCandidates 为无副作用的裸扫描，不喂 memo），直调路径下 sys 组装从 envLoader
   重建空快照，**产品行为正确、测试流错位**。已改经 `composeSources(loader, opts)` 供
   快照（与生产唯一接缝同形）。
5. **纪律矩阵实际手段**（SPEC §6.3 注记义务）：MC07 符号链接 = win32 junction
   （免特权）/POSIX dir 符号链接，运行时创建进 tmp 副本；MC09 oversize = 300KiB 运行时
   生成 + 哨兵串零泄漏佐证（内容未被读取）；MC12 上限 = 65 个 rule 文件运行时生成
   （恰收 32 + 1 条上限 parse-fail）。
6. **冒烟行数 481 > 400 目标**：SPEC §2.1 明示 tests 非源文件、400 为目标且「硬上限仍
   遵守可读性」——22 断言含子进程 E2E 与运行时 fixture 增补，压缩至 400 以下须牺牲
   断言可读性；已做无损压缩（信号 handler 去重 + SUB_ENV 提取），如实申报 481 行。
   源文件预算双双达标（344/90）。
7. **package.json 零 diff 决策兑现**：新冒烟以 `node tests/smoke/mcp-discovery.mjs` 直跑，
   无脚本别名（SPEC §2.2 决策记录）。
8. **EPIPE 事故与加固**：自测中一次输出管道中断（ugrep 解析错误提前退出）致运行中冒烟
   收 EPIPE 未及 finally → 真仓根 MC19 fixture 遗留（下一轮守卫正确 SKIP 未覆写任何
   用户文件）；已手工清理（rm 后 `git status` 复核）并在冒烟内加 `process.on('exit')`
   同步兜底清理（`repoFixturesLive` 门控），同形态遗留不再可能。
9. **`discoveredSysExtension` 的 opts 传参**：llm.ts/agent.ts 生产调用不带 opts（生产锚），
   与 SPEC §5.7 签名一致；带 opts 重载仅供冒烟零配置态断言使用。

## 3. 自测记录（全部本会话实跑，工作树内）

| 命令 | 结果 |
| --- | --- |
| `npm run build:server` | **exit 0**（三轮迭代：① inject/capabilities 误传 `envLoader()` 调用结果改传函数本体；② discovery.ts url 三元收窄失败改显式 null 守卫——均 tsc 拦截即修） |
| `node tests/smoke/mcp-discovery.mjs` | **22 passed / 0 failed，exit 0**（MC01-MC22 全绿；汇总行 `==== smoke:mcp:discovery：22 passed / 0 failed ====`） |
| `npm run smoke:mcp:registry` | 11 passed / 0 failed，exit 0（邻接面回归） |
| `npm run smoke:mcp:inject` | 12 passed / 0 failed，exit 0（邻接面回归） |
| `npm test` | 30/30，exit 0（shared 契约零漂移；其脚本含 build:shared + build:server） |
| AC1 零 env 启动点查（node 内联子进程） | 健康 200、`capabilities.mcp.external=[]`、日志零「MCP 扩展发现」锚、`discovery_audits 审计存储已就绪`（表建零行） |

**未跑（留脚本统一门禁，如实申报）**：`npm run build`（完整 shared+web——web 半边未由本轮
构建）、`npm run gate`、`npm run smoke:server` 全量、`node tests/smoke/mcp-transport.mjs`。
SPEC §6.4 手动 E2E 三态点位（含真实模型标语复述、home-agents 主权区真机、停机点位）归 VERIFY。

## 4. 机器证明（AC8/AC9 的 BUILD 侧取证）

- `git diff -- apps/server/src/store.ts` → **0 行**（AC8 ✓，恰 400 行贴线文件零触碰）
- `git diff -- packages/shared apps/web tools/pixel-gate tests/golden .github package.json package-lock.json` → **0 行**（AC9 ✓）
- `git status --porcelain` 未跟踪集 = `apps/server/src/mcp/discovery.ts`、
  `discovery-audit.ts`、`tests/smoke/mcp-discovery.mjs`、`tests/smoke/fixtures/discovery/`、
  `docs/evolution/iterations/0071/`——全部 ⊆ SPEC §2.1 + 机制件，无清单外混入。
- 行数预算：discovery.ts 344 ≤400、discovery-audit.ts 90 ≤400（新增源文件上限 ✓）。

## 5. BUILD 申报

- **productFiles（相对工作树根，跨修复轮累积并集）**：
  - 新增：`apps/server/src/mcp/discovery.ts`、`apps/server/src/mcp/discovery-audit.ts`、
    `tests/smoke/mcp-discovery.mjs`、`tests/smoke/fixtures/discovery/`（project/.mcp.json、
    project/.agents/mcp.json、project/.agents/skills/fixture-skill/SKILL.md、
    project/.agents/rules/fixture-rule.md、home/.agents/skills/home-skill/SKILL.md、
    home/.agents/rules/home-rule.md、badjson/.mcp.json、badname/.mcp.json）
  - 修改：`apps/server/src/mcp/registry.ts`、`apps/server/src/config.ts`、
    `apps/server/src/mcp/inject.ts`、`apps/server/src/capabilities.ts`、
    `apps/server/src/llm.ts`、`apps/server/src/agent.ts`、`apps/server/src/server.ts`
- 机制件：本目录（JOURNAL.md）+ STATE.md 过程态（工作树内，不合入主干）。
- **反转预案核对（ADR-0023 §8）**：全程未触发——无第三配置承载（注入缝为测试参数面）、
  零新出站类别（http 发现/调用仍全走 mcpFetch，MC01 经 httpFetch 注入实证）、零新依赖
  （package*.json 零 diff）、零前端呈现面。
- **并行冲突面提示**：llm.ts 本轮 diff = import +1 行与 ：35 表达式尾部纯追加
  （`buildToolSession` :39 通道零触碰），BK-0018 重试轮（feat/0068-iter）合并时按
  WORKFLOW §4 类别解决；inject.ts:37 / capabilities.ts:39 两处替换在 BK-0018 射程外。
- 零触 UI 发现：无 ui_quarantined 事项，无扩大影响面。
