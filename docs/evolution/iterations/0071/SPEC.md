# SPEC · 迭代 0071 · BK-0014 智能体扩展发现器（扫描 .mcp.json / .agents/ 与 ~/.agents/ 并注册进会话上下文）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-31 · 工作树 feat/0071-iter
> 输入：`iterations/0071/PRD.md`（PLAN 产出）+ **ADR-0023**（`docs/adr/0023-mcp-extension-discovery-security.md`，权威蓝图，
> 其 §7 = BK-0014 定界权威字面量）+ issue#16 获批（2026-10-30T14:40:18Z，env×2 + 两项风险知悉在案）。
> **触UI=否（非修宪轮）**：零前端文件、零 packages/shared、零 SSE 契约、零 golden 接触、全程禁 `gate:update`（PRD §5/ADR-0023 §3.1 硬边界）。
> 本 SPEC 全部行号锚点为**本工作树实读值**（2026-10-31 亲核），BUILD 轮若因并行合并漂移以实锚为准、语义不变。

---

## 0. 架构决策结论：无需新 ADR（needsAdr=false）

架构与安全语义已在 **ADR-0023** 定稿并获 issue#16 批复（新增 env 语义 ×2 + stdio/skill 两项残余风险知悉）。
本轮为该 ADR 的**实现消费轮**，未出现 ADR-0023 §8 反转预案任一触发项：

| 反转预案项（ADR-0023 §8） | 本轮核对 | 结论 |
| --- | --- | --- |
| ① 需要第三处配置承载 | 扫描根仅经函数参数注入缝（§4.3 di 缝，测试专用，非用户配置面）；用户配置面仍恰为获批的两 env | 未触发 |
| ② 需要新出站类别 | http 发现/调用仍全走 `mcpFetch`（guard.ts:107-109，经 `assertPublicUrl`）；stdio=本地子进程（批复知悉款在案）；skills/rules=进程内文本拼接 | 未触发 |
| ③ 需要新 npm 依赖 | JSON 解析用内置 `JSON.parse`；零新依赖（package.json/lock 零 diff） | 未触发 |
| ④ 需要前端呈现面 | capabilities `external` 清单为 BK-0049 已落地动态渲染，条目数据自动出现属既有机制，零前端改动；SKILLS 五条勾选常量逐字不动 | 未触发 |

故**不新建 ADR 草案**；ADR-0023 即架构记录。本 SPEC 仅做实现级定稿（字面量锚点、时序论证、断言清单）。

## 1. 现状锚点（全部本工作树实读）

| 锚点 | 位置（实读） | 与 ADR-0023 引用差异 |
| --- | --- | --- |
| `McpRegistrySources` v1 两成员 | apps/server/src/mcp/registry.ts:100 | ADR 写 :99-101（含注释行），实质一致 |
| `envLoader` 读两 key | registry.ts:105-108 | 一致 |
| 扩展点注释「BK-0014 届时以新成员加入本签名」 | registry.ts:103-104 | 一致 |
| `NAME_RE` | registry.ts:37（未导出） | 一致 |
| `BUILTIN_MCP_IDS` | registry.ts:31 | 一致 |
| `CONFLICT_WARN`（内置冲突 warn 锚） | registry.ts:34；拒绝循环 :124-130 | 一致 |
| `parseSpec`/`parseHttpServersSpec`（E6 :83-84）/`parseStdioServersSpec` | registry.ts:56-97 | ADR 写 :56-76，实为 56-97（含两导出函数），实质一致 |
| 注册源解析失败抛错（「理论不可达」通道） | registry.ts:120-122 | §6.4 discovery 臂不适用该通道 |
| rawEnv 键表 | apps/server/src/config.ts:29-39 | 一致 |
| MCP 两 env zod superRefine 先例 | config.ts:70-75 | 一致 |
| PTY/ON_ERROR fail-fast 枚举先例 | config.ts:80-90 | 一致 |
| `fail()` 输出形态 `${key}=${value}：${msg}` | config.ts:93-96, :101-107 | AC4 依赖此形态 |
| inject 单例 | apps/server/src/mcp/inject.ts:37 | 一致（`buildMcpRegistry(envLoader(), { httpFetch: mcpFetch })`） |
| capabilities 自建实例 | apps/server/src/capabilities.ts:39 | 一致（`{ warn: () => {} }`） |
| SKILLS 五条勾选常量（触UI 面，零改动） | capabilities.ts:26-32 | 一致 |
| external 清单派生 | capabilities.ts:60 | 一致（registry.entries 自动带上 discovery 条目） |
| llm sys 组装点 | apps/server/src/llm.ts:34-35 | 一致 |
| agent sys 组装点 | apps/server/src/agent.ts:40-41（ADR §3.4「实现轮以 agent.ts 实锚为准」） | **实锚 = agent.ts:40-41** |
| agent 会话建卡（sys 落库） | agent.ts:48（`createSession({…, sys: p.sys })`） | 本轮**零改动**（见 §5.7） |
| guard mcpFetch | apps/server/src/guard.ts:107-109 | 一致（注释块 :102-106） |
| server 启动/停机接线 | apps/server/src/server.ts:103（initStore）、:115（initPtyAuditStore）、:329（closePtyAuditStore）、:331（closeStore）、:62（capabilities 导入） | 一致 |
| 审计仓储同型先例 | apps/server/src/pty/audit.ts（ROOT :17-18、SUMMARY_MAX_CHARS :20、init :39-60、close :63-68、clip :71-73、record 容错 :77-89） | 一致 |
| **懒自启兜底先例（本 SPEC 新引）** | apps/server/src/kb/store.ts:70-75（`conn()`：`if(!db) initKbStore()`，注释「幂等 DDL 保证任意序安全」） | §5.5 时序问题的解法依据 |
| FOLD 名单 | apps/server/src/workbench/tree.ts:34（`['node_modules','dist','data','.zcode']`）；`.git` 恒排除 :112；lstat ENOENT 竞态 :115-121；链接不追踪 :140-143 | 一致 |
| PROJECT_ROOT（dist 上溯四级） | apps/server/src/workbench/root.ts:17 | 一致（discovery 自派生同型，不 import——避免跨域依赖，见 §5.3） |
| 仓库根实况 | 本工作树根**无** `.mcp.json`、**无** `.agents/`；`~/.agents` 实存仅 `skills/` | 与 ADR-0023 §1.3 一致 |

## 2. 受影响文件清单（productFiles 白名单建议）

### 2.1 新增（2 个源文件 + 1 冒烟 + fixtures）

| 文件 | 行数预算 | 内容 |
| --- | --- | --- |
| `apps/server/src/mcp/discovery.ts` | ≤400（新增源文件上限，硬性） | 扫描器：两纯函数 `parseDiscoverySourcesSpec` / `parseDiscoveryAllowSpec` + `discoverCandidates`（扫描+审计+ALLOW 过滤）+ `composeSources`（生产组合器，模块级单次记忆化）+ `discoveredSysExtension`（sys 文本组装）+ 类型 `DiscoverySnapshot`；PROJECT_ROOT/HOME 生产锚自派生（root.ts:17 / pty/audit.ts:17 同型）+ 测试注入缝（§5.3） |
| `apps/server/src/mcp/discovery-audit.ts` | ≤400 | `discovery_audits` 审计仓储：pty/audit.ts 同型第二连接 + kb/store.ts:70-75 懒自启兜底；`initDiscoveryAuditStore` / `closeDiscoveryAuditStore` / `recordDiscoveryAudit`（容错不阻断）/ `SUMMARY_MAX_CHARS=256` / `clip()` |
| `tests/smoke/mcp-discovery.mjs` | ≤400 目标（tests 非源文件，mcp-inject.mjs 恰 400 行先例；硬上限仍遵守可读性） | 冒烟断言组 MC01-MC22（§6.3），进程内直测 dist 模块 + startServer 子进程 E2E |
| `tests/smoke/fixtures/discovery/**` | 数据文件 | 固定布局样例树（project 根模拟 + home 根模拟）：`.mcp.json`、`.agents/skills/<name>/SKILL.md`、`.agents/rules/*.md`、纪律矩阵样本（链接/oversize/坏 JSON/非法名/`.git` 域）——**子进程 E2E 不消费此目录**（§5.3、§6.4） |

### 2.2 修改（7 个源文件，逐文件改动面与禁区）

| 文件 | 现行数 | 改动面（封闭清单，超出即违约） |
| --- | --- | --- |
| `apps/server/src/mcp/registry.ts` | 183 | ① `NAME_RE` 加 `export`（唯一字面变化，供 discovery 复用，零行为差）；② `McpRegistrySources` v2 **append-only** 三可选成员（`discoverySources?` / `discoveryAllow?`（envLoader 供 raw 串）+ `discoveredEntries?: readonly McpServerEntry[]`（discovery 供，注释明示 envLoader 不供））；③ `envLoader` 追加读 `MCP_DISCOVERY_SOURCES`/`MCP_DISCOVERY_ALLOW` 两 key（`|| undefined` 空串归一，同 :106-107 形态）；④ `buildMcpRegistry` 追加 discovery 合并臂（§5.6）——既有 v1 两成员解析、E1-E8、:120-122 抛错通道、:124-130 内置冲突拒绝**语义零改动**；头注补两行 BK-0014 记载 |
| `apps/server/src/config.ts` | 160 | ① rawEnv 键表 :29-39 追加两 key；② `EnvSchema` 追加两字段（superRefine 调 discovery 两纯函数，形态同 :70-75）；③ import 行 +1。`loadConfig` 返回对象 :133-156 **零改动**（MCP_HTTP_SERVERS 亦不在返回对象，同构）；既有交叉校验 :109-132 零改动 |
| `apps/server/src/mcp/inject.ts` | 124 | :37 一处表达式替换：`buildMcpRegistry(envLoader(), …)` → `buildMcpRegistry(composeSources(envLoader()), …)` + import +1。其余（buildToolSession 三分支、dynamicImpl、bridgeSpec）零改动 |
| `apps/server/src/capabilities.ts` | 64 | :39 同型一处表达式替换（`composeSources(envLoader())`）+ import +1。SKILLS 常量 :26-32、external 派生 :60、handler 契约零改动 |
| `apps/server/src/llm.ts` | 127 | :35 sys 表达式**纯追加** `+ discoveredSysExtension()` + import +1。:39 `buildToolSession` 通道零改动（并行 BK-0018 冲突面预判，PRD §8）；工具循环/流式两路径经同一 `sys` 变量自然生效（:71/:85/:94），零额外改动 |
| `apps/server/src/agent.ts` | 120 | :41 同型纯追加 + import +1。:48 `createSession({…, sys: p.sys })` **零改动**（会话落库仍存原始 sys，发现正文不持久化——发现快照每次会话组装时重新注入，ADR-0023 §9.3 不落跨会话存储）；:52 零改动 |
| `apps/server/src/server.ts` | ~430（仅插入两行 + import 一行） | ① init 段：`initDiscoveryAuditStore()` 插于 :115 `initPtyAuditStore()` 之后（PTY 块后、KB 块 :125 前）；② 停机段：`closeDiscoveryAuditStore()` 插于 :329 `closePtyAuditStore()` 邻位（:331 `closeStore()` 之前——时序不变式：审计连接先于主库关闭）；③ import +1 |

### 2.3 零改动面（禁区，AC9 机器证明对象）

`apps/web/**`、`packages/shared/**`、`tools/pixel-gate/**`、`tests/golden/**`、`.github/**`、`package.json`、`package-lock.json`、
`apps/server/src/store.ts`（恰 400 行贴线，AC8 单列机器证明）、`apps/server/src/tools.ts`、`apps/server/src/guard.ts`、
`apps/server/src/mcp/{http,stdio,connection}.ts`、`apps/server/src/pty/**`、`apps/server/src/kb/**`、`apps/server/src/workbench/**`、
CONSTITUTION.md / AGENTS.md（WORKFLOW §6.3 禁改清单）。
**验收命令口径**：`npm run build` + `npm run gate`（纯回归面）+ `npm test` + `node tests/smoke/mcp-discovery.mjs`（新）+
`npm run smoke:server`（回归）+ 手动 E2E 点位（§6.5）。

> **决策记录（package.json 不加脚本别名）**：PRD AC10 曾建议「package.json +1 脚本」并明示「终稿归 SPEC」；PRD AC9 则把
> `package*.json` 列为恒空机器证明。两者取交集：**零 package.json diff**，新冒烟以
> `node tests/smoke/mcp-discovery.mjs` 直跑（mcp-registry.mjs:23-24 的脚本别名是纯人体工学，非能力）。
> 理由：AC9 是 VERIFY 逐字机器证明项，别名零能力增量，且并行在途的 BK-0018 重试轮共享 package.json 邻接面，
> 小 diff = 小合并面（WORKFLOW §4「不做夹带」）。

## 3. 模块边界

```
packages/shared  ──零接触──┐
apps/web        ──零接触──┤
                           ▼
config.ts ──(启动期 zod fail-fast：两 env 静态格式)──┐
                                                    │ import 纯函数（零行为差复用）
mcp/registry.ts（v2：类型 append-only + envLoader 两 key + 合并臂）◄──┤
    ▲ import NAME_RE / 条目类型                                      │
    │                                                                │
mcp/discovery.ts（新：扫描纪律 + 纯解析 + 快照 + sys 组装）───────────┤ 唯一接缝：
    │ write audit                                                    │ inject.ts:37 /
    ▼                                                                │ capabilities.ts:39
mcp/discovery-audit.ts（新：discovery_audits 第二连接）               │ 各一处 composeSources 表达式
                                                                     │ llm.ts:35 / agent.ts:41
logger / guard.mcpFetch / fs 只读三员（readFileSync/readdirSync/lstatSync）┘ 各一处纯追加表达式
```

- **discovery.ts 不 import config.ts**（config.ts 单向 import discovery 纯函数——与 config.ts:13 import registry.js 同构，
  无环）；扫描入口经 `composeSources(loader)` 拿 raw 串，不经 `process.env` 直读（测试可注入）。
- **discovery-audit.ts 不 import store.ts**（store.ts 零改动硬约束）；与 pty/audit.ts、kb/store.ts 并列为「同库第三连接」，
  幂等 DDL + 懒自启保证任意求值序安全（kb/store.ts:70-75 先例注释原文「幂等 DDL 保证任意序安全」）。
- **合并语义单归 registry.ts**：discovery 只产 `McpServerEntry[]`（复用 registry.ts:24-26 两类型，零新条目类型），
  重复拒绝在 buildMcpRegistry 合并臂——registry.ts:124-130 冲突语义的通用化扩展点。
- **UI 面零接触**：capabilities `external` 数组自动多出的条目由前端 BK-0049 既有动态渲染呈现（机制既有，非新呈现面）；
  SKILLS 勾选清单（前端回退集逐字对齐面）逐字不动——新技能正文注入走 sys，**不进**勾选清单。

## 4. 数据结构定稿

### 4.1 快照（discovery.ts 内部，模块级单次记忆化）

```ts
interface DiscoveredSkill { source: DiscoverySourceId; name: string; path: string; body: string }
interface DiscoveredRule  { source: DiscoverySourceId; name: string; path: string; body: string }
// name：skill=目录名；rule=文件名去 .md；body：仅 ALLOW 命中者读入，≤6000 UTF-8 字节，截断加 '…'
interface DiscoverySnapshot {
  entries: McpServerEntry[];   // 仅 ALLOW 命中的 mcp 条目（kind/serverId/url|command/args）
  skills: DiscoveredSkill[];
  rules: DiscoveredRule[];
  counts: Record<source, { mcp: number; skill: number; rule: number; parseFail: number }>; // scan 汇总与审计载荷
}
```

### 4.2 审计表 DDL（discovery-audit.ts；字段级定稿 = ADR-0023 §4.2 逐字）

```sql
CREATE TABLE IF NOT EXISTS discovery_audits(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,      -- 'project-mcp' | 'project-agents' | 'home-agents'；全局解析失败行用 '-'
  entry  TEXT NOT NULL,      -- 条目名（mcp 键名 / skill 名 / rule 名去扩展名）；scan 行为 '-'
  kind   TEXT NOT NULL,      -- 'scan' | 'candidate' | 'allow-hit' | 'parse-fail'
  summary TEXT NOT NULL,     -- ≤256 字符截断加 '…'；只含元数据（名称/路径/原因/计数），不落文件正文
  created_at INTEGER NOT NULL
);
```

粒度（每进程启动一次扫描）：每配置源一行 `scan`（summary=`mcp=N skill=N rule=N parseFail=N`）；每发现候选一行
`candidate`（**含未ALLOW与已ALLOW**——发现事实与激活事实分立并存，AC3「恰一行 allow-hit」不排斥同行 candidate）；
每 ALLOW 命中激活一行 `allow-hit`（首次确认锚点）；每解析失败一行 `parse-fail`（summary 含原因分类与路径）。
ALLOW 中快照不存在的条目**不落任何审计行**（无发现事实可审，ADR-0023 §4.3），仅 AC5 warn。

## 5. 行为定稿（BUILD 按此实现；字面量除 §5.8 锚子串外可微调正文）

### 5.1 两 env 静态解析（config.ts fail-fast 层，AC4）

- `parseDiscoverySourcesSpec(spec)`：整值 trim 后空 = 未配置（空集零问题）；`,` 分割逐条 trim；
  空条目 → problem `条目 N：空条目（连续/首尾逗号）`（parseSpec :68 E5 同型）；未知名 → problem
  `条目 N：未知扫描源：xxx（值域 project-mcp|project-agents|home-agents）`；重复 → problem（E8 同型）。
- `parseDiscoveryAllowSpec(spec)`：每条须为 `源:名称`（首个 `:` 分割；NAME_RE 无冒号故唯一分割）；
  缺冒号/空段 → problem `条目 N：须为 源:名称 形态`；源不在三值域 → 同上未知扫描源 problem
  （**决策**：未知源键属静态格式非法 → fail-fast，与 ADR-0023 §3.2「格式合法性由 zod fail-fast 前置」一致；
  §3.5 时序宽容仅针对「静态合法但快照无此条」的动态缺席）；名称不过 NAME_RE → problem（E3 同型文案）；
  `源:名称` 整条重复 → problem（E8 同型）。
- 两函数 problems 经 config.ts `EnvSchema` superRefine 进既有 fail 通道（config.ts:101-107 输出
  `MCP_DISCOVERY_SOURCES=<值>：条目 N：…`）→ 进程 exit 1，**变量名+条目序号天然在消息内**（AC4 达成形态）。

### 5.2 扫描纪律（fail-open 层；全部 ADR-0023 §2 落地）

- **三源布局**（固定层级，零全树递归）：`project-mcp`=`<ROOT>/.mcp.json` 单文件；`project-agents`=`<ROOT>/.agents/`；
  `home-agents`=`<homeDir>/.agents/`（`os.homedir()`）。后两源布局同构：`skills/<name>/SKILL.md`、`rules/*.md`、
  `mcp.json`（语法同 project-mcp）。SOURCES 未列出的源**零 fs 触碰**（含 home-agents 主权区默认永不读）。
- **根缺失 = 合法空态**：根文件/目录不存在 → 仅 scan 行（计数全 0）+ 空集，非 parse-fail、非 warn（零噪音，
  与「未配置」的唯一差别是多一行 scan 审计）。
- **名称域**：mcp 键名 / skill 目录名 / rule 文件名（去 `.md`）均过 `NAME_RE`（registry.ts:37，本轮转 export）；
  不过 → 该条 parse-fail 行 + 跳过，他条不受阻断。
- **mcp.json 条目构造**：顶层须为对象且含对象型 `mcpServers`（否则整源 parse-fail + 空集）；每条目值：
  `{url}` → HttpServerEntry（URL 仅 http/https，registry.ts:83-84 E6 同语义）；`{command, args?}` →
  StdioServerEntry（args 须 string[]，缺省 `[]`）；`url` 与 `command` 并存 / 两者皆缺 / 类型不符 →
  **该条** parse-fail + 跳过（从窄，歧义不猜测）。
- **fs 纪律**：只读三员 `readFileSync`/`readdirSync`/`lstatSync`（tree.ts:9 纪律同款）；符号链接一律不入扫描
  （`lstat` 判 isSymbolicLink → 该条 parse-fail 行「符号链接不入扫描」+ 跳过；比 tree.ts:140-143 更严——
  链接连本体形态都不取）；`.git` 与 FOLD 名单（tree.ts:34 字面）命中于**任一路径分量**（skill 目录名/rule 文件名）
  → 该条 parse-fail + 跳过；扫描根解析后落入 FOLD/`.git` 语义域 → 整源 parse-fail + 跳过（防御性，固定锚定下理论不可达）；
  readdir/lstat ENOENT 竞态单条跳过不击穿整源（tree.ts:117-119 同型）。
- **上限**：单文件 256 KiB（`lstatSync().size` 判定，**oversize 不读内容**）；每源 mcp 候选 ≤64、skill ≤64、
  rules ≤32。超限 → 该类落一条 parse-fail 行（summary 注明上限值），该源该类后续条目全部跳过、已接受者保留。
  枚举一律**排序后处理**（`localeCompare`）——确定性快照是测试断言与 sys 输出稳定序的前提。
- **正文读取最小化**：`mcp.json` 内容必读（发现枚举所需）；skill/rule 正文**仅 ALLOW 命中者读入快照**
  （未确认候选的文件内容不进内存——供应链面从窄）；oversize 判定仅靠 lstat size，与 ALLOW 与否无关（AC7 矩阵成立）。
- **编码**：UTF-8 文本；截断按 `Buffer.byteLength` ≤ 6000 字节（llm.ts:32 contextText 6000 量级先例），
  截断尾部加 `…`（pty/audit.ts:71-73 clip 同型）。

### 5.3 快照构建与注入缝

- `discoverCandidates(spec, opts?)`：`spec = { sources?: string; allow?: string }`（raw 串），
  `opts = { projectRoot?: string; homeDir?: string }`（**测试注入缝**；缺省 = 生产锚：ROOT 自派生
  dist 上溯四级（pty/audit.ts:17 同型）+ `os.homedir()`）。执行 §5.1 两纯函数解析（此处 problems 已被
  config 前置清空，理论不可达防御：非空 → 全部转 parse-fail 审计行，不抛错）→ 扫描 → 写审计 → 返回快照。
  **零模块级副作用**（config.ts 可安全 import 纯函数）。
- `composeSources(loader, opts?)`：生产组合器。模块级 `let prodSnapshot` **单次记忆化**（进程生命周期即缓存
  生命周期，registry.ts:8-10 头注同构；零热重载零轮询，变更需重启）：首次调用执行
  `discoverCandidates({ sources: loader().discoverySources, allow: loader().discoveryAllow }, opts)` 并冻结；
  返回 `{ ...loader(), discoveredEntries: snapshot.entries }`。零 env 配置时 `loader()` 无两 key →
  **零扫描、零 fs 读、零审计行、零日志**（AC1 的实现机关）。
- **时序论证（为何扫描发生在 inject.ts:37 求值点是安全的）**：inject.ts 模块体求值前，config.ts 必已求值完毕——
  server.ts:49 `engine.js` 是首个 import，engine.ts:17 `config.js` 先于 :18/:19/:20 的 handlers/llm/agent；
  llm.ts:8 `providers.js`（其 :9 import config）先于 :10 `inject.js`；agent.ts:13 先于 :15。ESM 按声明序深度
  优先求值 ⇒ 扫描运行时 `.env` 已装载、两 env 已过 zod fail-fast。capabilities.ts 由 server.ts:62 导入，更晚。
  审计连接以 kb/store.ts:70-75 懒自启兜底 ⇒ 扫描期审计行必落库（server.ts:115 的显式 init 幂等无冲突）。

### 5.4 ALLOW 匹配（激活语义）

- ALLOW 键 = `源:名称`；mcp/skill/rule 一律按（源标识，名称）精确匹配。`project-agents` 的 mcp.json 条目
  源标识是 `project-agents`（**不是** `project-mcp`——源标识=扫描源，非文件名）。
- 未命中候选：仅 candidate 审计行 + 结构化日志（§5.8），**不进注册表、不进 sys、零出站、零 spawn**
  （AC2；spawn 面只存在于 registry 命中后的 discoverTools/dynamicImpl，未进注册表即结构性不可达）。
- 命中 mcp 条目：进 `discoveredEntries` → 合并臂（§5.6）→ registry.entries → capabilities `external` 可见 +
  会话 buildToolSession 可发现可调用（mock 链路经既有 `httpFetch: mcpFetch` 注入缝，inject.ts:37/:52）。
- 命中 skill/rule：正文进快照 → `discoveredSysExtension()` 输出，**凡 llm/agent 会话一律注入**（ALLOW 即激活，
  不经 `n.skills` 勾选门控——ADR-0023 §3.4；`n.skills` 勾选名单的名字注入段 :34-35/:40-41 语义零改动）。

### 5.5 审计仓储（discovery-audit.ts）

pty/audit.ts 逐型同构：ROOT 派生（:17-18 同式）、`SUMMARY_MAX_CHARS=256`（:20 同值）、幂等 `initDiscoveryAuditStore()`
（:39-60 同型，`if(db) return`）、`closeDiscoveryAuditStore()`（:63-68 同型）、`clip()`（:71-73 同型）、
`recordDiscoveryAudit()` 内部 try/catch + pino warn 容错（:77-89 同型，「审计失败不阻断行为」），
**另加 kb/store.ts:70-75 `conn()` 懒自启兜底**（`recordDiscoveryAudit` 首写时自 init——模块加载期扫描的时序兜底，§5.3）。
v1 无 HTTP 读面，对账 = sqlite 直查（ADR-0023 §4.5）。

### 5.6 registry 合并臂（AC6）

`buildMcpRegistry` 在既有 v1 合并循环（:124-130）后追加：按快照序遍历 `sources.discoveredEntries ?? []`，
`serverId` 命中「已接受条目 ∪ `BUILTIN_MCP_IDS`」→ `warn`（§5.8 冲突锚）+ 拒该条、继续；否则接受。
**discovery 臂永不走 :120-122 抛错通道**（其候选已在扫描层消化为空集+审计行，§2.3 fail-open 分层）。
v1 语义（env 条目优先、内置冲突 warn+拒条、E1-E8）零改动。

### 5.7 sys 注入组装（llm.ts:35 / agent.ts:41）

`discoveredSysExtension(): string`——零命中返回 `''`（两文件表达式追加后与现状**逐字节等价**，AC1 的另一实现机关）；
命中时输出（快照序：skills 先、rules 后，各按 源序[SOURCES 声明序]×名称字典序）：

```
\n\n【发现技能 <name>】\n<body>\n\n【规则 <name>】\n<body>   （逐条拼接；锚子串「【发现技能 」「【规则 」）
```

agent.ts:48 `createSession({…, sys: p.sys })` 保持原样——会话落库仍为原始 sys，发现正文每次会话组装时重新注入，
不落跨会话存储（ADR-0023 §9.3 与 BK-0018 记忆域互斥）。

### 5.8 日志与固定锚子串表（BUILD 可微调锚外正文，锚子串不得改）

| 事件 | 级别 | 固定锚子串（冒烟断言用） |
| --- | --- | --- |
| 候选呈现（每候选） | info | `MCP 扩展发现候选`（字段：source/entry/kind/path） |
| 激活（每 ALLOW 命中） | info | `MCP 扩展发现激活`（字段：source/entry/kind） |
| 解析失败（每 parse-fail） | warn | `MCP 扩展发现解析失败` |
| ALLOW 条目不在快照（AC5） | warn | `不在扫描快照中，已忽略`（字段：allow 条目原文） |
| 合并重名拒绝（AC6） | warn | `已拒绝该 discovery 条`（沿 CONFLICT_WARN registry.ts:33-34 固定子串锚先例） |
| scan 汇总（每配置源） | info | `MCP 扩展发现扫描`（字段：source/counts） |

## 6. 验收口径（VERIFY 执行清单；= PRD AC1-AC10 的执行化 + SPEC 增补点）

### 6.1 命令门禁（工作树内逐项实跑、记录真实退出码）

| 命令 | 通过标准 |
| --- | --- |
| `npm run build` | exit 0（shared+web 构建零回退） |
| `npm run build:server` | exit 0（tsc 零错） |
| `npm run gate` | 21 场景全绿（diffPx=0；首跑若现 s3 diffPx≈21~23 本机采样抖动按 issue#12 口径双留档、复跑为准；**全程零 `gate:update`**） |
| `npm test` | 30/30（shared 契约零漂移） |
| `npm run smoke:server` | 既有 84+ 断言零回退（exit 0） |
| `node tests/smoke/mcp-discovery.mjs` | MC01-MC22 全绿（新，§6.3），汇总行 `==== smoke:mcp:discovery：X passed / 0 failed ====` |
| `npm run smoke:mcp:registry` / `npm run smoke:mcp:inject` | 各自 exit 0（邻接面回归抽查） |

### 6.2 机器证明项（VERIFY 以 git diff / sqlite 直查取证）

- **AC1 零行为基线**：无两 env 时启动 server 子进程 → `discovery_audits` 零新行（直查前后 count 相等）、
  server 日志零 `MCP 扩展发现` 锚、`node tests/smoke/mcp-discovery.mjs` 的零配置组全绿。
- **AC8 store 零改动**：`git diff -- apps/server/src/store.ts` 输出为空。
- **AC9 禁区恒空**：`git diff -- packages/shared apps/web tools/pixel-gate tests/golden .github package.json package-lock.json`
  输出为空；`git diff --stat` 全集 ⊆ §2.1/§2.2 清单（超出即违约，BUILD 中止）。
- **AC10 audit 承载**：扫描发生后 sqlite 直查 `discovery_audits`：五字段齐备、`length(summary) ≤ 257`（256+`…`）、
  summary 不含任何 fixture 文件正文的 ≥50 字符连续片段。

### 6.3 新冒烟断言组 MC01-MC22（tests/smoke/mcp-discovery.mjs）

进程内组（直测 `apps/server/dist/mcp/*.js`，fixtures 注入缝供根；mcp-registry.mjs「dist 进程内直测 + lib.mjs 基建」先例形态）：

- **MC01** SOURCES+ALLOW 全链（AC3）：composeSources 返回 discoveredEntries=fixture http 条目；
  buildMcpRegistry 合并后 `registry.has('fixture-server')===true`；`discoverTools` 经注入 httpFetch 对
  进程内 mock http MCP（mcp-registry.mjs:33-71 同源裁剪）tools/list 成功；capabilities 同构实例 external
  含该条目。
- **MC02** 恰一行 allow-hit：直查库中该 fixture 条目 `kind='allow-hit'` 计数=1（每快照构建一次）。
- **MC03** 仅 SOURCES 零激活（AC2）：allow 缺省 → discoveredEntries 空、skills/rules 空 body、
  candidate 行落库、registry 无该条、零出站零 spawn（无任何连接尝试计数）。
- **MC04** 零配置零行为（AC1）：spec 两 key 均缺省 → discoverCandidates 短路（可断言零 fs 触碰：
  projectRoot 指向不存在路径亦不抛错不读盘）、零审计行、composeSources 输出 ≡ loader() 输出（deepEqual）。
- **MC05** `discoveredSysExtension()` 三态：零配置 `''`；仅 SOURCES `''`；SOURCES+ALLOW 输出含
  `【发现技能 fixture-skill】`+正文、`【规则 fixture-rule】`+正文，序=skills 先 rules 后（deepEqual 全文）。
- **MC06** 6000 字节截断：oversize-body fixture（>6000 字节）ALLOW 后 body 长 = 6000+1（`…`），尾字符 `…`。
- **MC07-MC12** 纪律矩阵（AC7）：符号链接不入扫描（parse-fail 行 + 条目缺席）；`.git`/FOLD 名条目跳过
  （他条保留）；>256KiB 文件 parse-fail 且**文件内容未被读取**（fixture 内嵌哨兵：若被读，后续断言可检出的
  标记位方案——实现可在读路径打桩或以「oversize 条目不出现在任何快照/日志正文」佐证，取其一即可）；非法名称条目
  parse-fail + 他条保留；坏 JSON 整源 parse-fail + 空集 + 进程不退；条目上限截断（>64 skill fixture 取
  65 个空名目录成本过高时允许以 65 条 rule 或单元级注入上限值方式断言，报告须注明实际手段）。
- **MC13** 根缺失合法空态：scan 行计数全 0、零 parse-fail、零 warn。
- **MC14-MC15** 纯函数矩阵（AC4 静态层）：parseDiscoverySourcesSpec / parseDiscoveryAllowSpec 对
  空串/未知源/缺冒号/非法名/重复条目/空条目的 problems 逐条 deepEqual（错误文案含 `条目 N：`）。
- **MC16** 合并重名（AC6）：discoveredEntries 与 env 条目同名 → warn collector 收到
  `已拒绝该 discovery 条` 锚、env 条目保留、discovery 条缺席、注册表整体可用；与 BUILTIN_MCP_IDS 同名同理。
- **MC17** discovery 臂不抛错：构造 discoveredEntries 含问题条目的直接 buildMcpRegistry 调用（绕过扫描层
  的防御断言）不触发 :120-122 抛错通道（理论不可达防御，允许以「不抛错且问题条被拒」表达）。

子进程组（startServer，lib.mjs 基建；**fixture 写入真实仓库根，前置存在性守卫 + finally 必达清理**）：

- **MC18** 存在性守卫：仓库根已有 `.mcp.json` 或 `.agents/` → 该组 SKIP 并显式报告（绝不覆写用户文件）。
- **MC19** AC2 子进程版：SOURCES=project-mcp,project-agents（根 fixture：合法 `.mcp.json` +
  `.agents/skills/rules` 树）+ ALLOW 缺省 → server 健康、`/api/v1/capabilities` external **不含** fixture 条目、
  日志含 `MCP 扩展发现候选` 锚、sqlite 直查 candidate 行落库。
- **MC20** AC3 子进程版（接线证明）：同上 + ALLOW 含 fixture mcp 条目 → capabilities external **含**
  `{serverId, kind:'http'}`；sqlite 直查恰一行 allow-hit。
- **MC21** AC4 子进程版：SOURCES 含未知源（如 `nope`）→ startServer 的 boom 路径（子进程提前退出、
  exit 1），logTail 含 `MCP_DISCOVERY_SOURCES` 变量名与 `条目 1`（config.ts:101-107 形态）。
- **MC22** AC5 子进程版：SOURCES=project-mcp + ALLOW 含快照不存在条目（`project-mcp:ghost`）→
  server 正常健康（不退），日志含 `不在扫描快照中，已忽略` 锚，sqlite 零该条审计行。

> fixtures 目录（`tests/smoke/fixtures/discovery/`）仅服务进程内组（MC01-MC17 经注入缝消费）；
> 子进程组（MC19-MC20）因生产锚定不可注入而写真实根临时文件——两组分离是注入缝设计的直接推论，
> VERIFY 报告须如实记载 MC18 守卫是否触发。

### 6.4 手动 E2E 点位（真机走查，VERIFY 记录观察结论）

1. **三态点位**（同机依次三启，env 见 PRD AC1-AC3）：逐态检查启动日志锚、`/api/v1/capabilities` external、
   sqlite `discovery_audits` 行数与 kind 分布——与 MC19/MC20 结论互证。
2. **sys 注入端到端**（AC3 的模型观测面）：配置真实模型 + SOURCES/ALLOW 指向含已知标语的 fixture skill，
   跑一条单 LLM 节点工作流（提示词：复述你装配的技能内容），观察回复含标语正文；同工作流在仅 SOURCES 态
   复跑，回复**不含**标语（未激活不注入的反例面）。
3. **home-agents 主权区点位**：SOURCES 含 `home-agents` 时确认扫描日志/审计行恰为本机 `~/.agents` 实存内容
   （mmx-cli）；SOURCES 去除 `home-agents` 后确认 `~/.agents` **零读取**（无任何相关日志/审计行）。
4. **停机点位**：扫描发生态下 SIGTERM → 优雅停机 exit 0（closeDiscoveryAuditStore 邻位接线无卡阻；
   Linux 为权威、win32 参考，沿 smoke:shutdown 口径）。

### 6.5 BUILD 申报与并行冲突面提示

- productFiles = §2.1 + §2.2 全部（**跨修复轮累积并集，不可覆盖**——WORKFLOW §4 教训）；
  机制件 = 本目录产物 + 无 ADR 新增（§0）。
- 并行在途 BK-0018 重试轮（feat/0068-iter）与本项目共享 `llm.ts` 邻接面：本轮 llm.ts diff 限定为
  import +1 行与 :35 表达式尾部纯追加，若合并冲突按 WORKFLOW §4 类别解决；`inject.ts:37`/`capabilities.ts:39`
  两处表达式替换在 BK-0018 射程外（其面为 MEMORY env 与工具注入段）。
- 反转中止条款（承 ADR-0023 §8）：实现中出现需第三配置承载 / 新出站类别 / 新依赖 / 前端呈现面任一，
  立即中止转 needs-approval，本迭代按回滚处理。

## 7. 不做范围（承 PRD §6 / ADR-0023 §9，逐字继承）

不改写既有 env 注册通道任何行为（E1-E8/E9/内置冲突拒绝）；不触碰 ON_ERROR 三键与 MEMORY_ENABLED；
不提供跨会话存储、不借道注入未过 ALLOW 的能力面；零新依赖/零新出站类别/零 packages/shared/零前端/golden 零接触；
发现候选的前端可视化不做；不实现热重载/fs watch（快照缓存，变更需重启）；`gate:update` 全程禁用（非修宪轮）。
