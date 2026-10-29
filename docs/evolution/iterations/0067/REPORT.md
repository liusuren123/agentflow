# REPORT · 迭代 0067 · BK-0062 扩展发现器「安全方案」SPEC 先行（ADR 草案轮）

> 执行者：test-manager（VERIFY 阶段）· 2026-10-29 13:03
> 依据：`iterations/0067/PRD.md` §7（AC1~AC7）+ `iterations/0067/SPEC.md` §5（验收口径执行化）
> 验收环境：隔离工作树 `.zcode/worktree/feat/0067-iter`（分支 feat/0067-iter @ 42ad94a，
> 与主干 main 同点——双提交归脚本门禁轮，本报告为**提交前 VERIFY 结论**，见 §4 前提）。

## 结论：PASS（0 BUG · repair_round 维持 0）

七项验收 AC1~AC7 全部通过（其中 AC1/AC4 的**提交级**核验项因双提交未落盘，以工作区
口径 + productFiles 申报预核通过，提交级复核随脚本门禁轮/MERGE 执行——前提见 §4）。
无 Blocker/Critical/Major/Minor 缺陷；2 项非缺陷知悉项见 §3。

## 1. 逐 AC 验收证据

### AC1 草案落盘且形态达标 —— PASS

- **存在 + 行数**：`wc -l docs/adr/0023-mcp-extension-discovery-security.md` → `307`（≤400 ✓；
  SPEC 预算区间 260~340 内）。
- **UTF-8 无 BOM**：`head -c 3 | od -An -tx1` → `23 20 41`（"# A"，无 BOM ✓）。
- **纯 LF**：`tr -dc '\r' < 文件 | wc -c` → `0`（CR 计数为零 ✓）。
- **头部状态行**：ADR:3-5 = 「状态：**草案 · 待用户批准（扫描源与激活白名单 env 请批面
  ——附录 A）/ 待实现轮消费（BK-0014——实现轮）**」——含「草案」且双位标注在位
  （ADR-0014 先例形态 ✓）。
- **「已批准」计数**：`grep -c '已批准'` → `0`（grep exit=1 无匹配 ✓）。
- **产品提交恰 1 路径**：产品提交未落盘（归脚本，JOURNAL.md §5 明载派发契约）。提交级
  `git show --numstat` 待脚本提交后复核；本会话预核：`git status --porcelain` 改动面
  仅 4 处（M BACKLOG / M STATE / ?? ADR-0023 / ?? iterations/0067/）**零代码路径**，
  productFiles 申报（JOURNAL §6）恰 1 路径 `docs/adr/0023-mcp-extension-discovery-security.md`。

### AC2 六要素成文且锚点真实 —— PASS

- **六节各自成节**（Read 全文亲核）：§2 扫描范围白名单（要素①，ADR:53）、§3 首次确认
  语义（②，:105）、§4 审计留痕（③，:131）、§5 出站类别清单（④，:163）、§6 loaders 接线
  定界（⑤，:179）、§7 BK-0014 定界回写（⑥，:220）。
- **锚点抽验 30+ 组逐一命中、零杜撰**（sed/grep/wc 实跑；★ = JOURNAL 4 处勘误后坐标，
  独立复核确认漂移属实）：
  - `registry.ts:99-101`（BK-0014 loaders 扩展点注释 + `McpRegistrySources` v1 两成员 +
    `McpServersLoader` 签名）、`:103-104`（「后续 .mcp.json / ~/.agents 扫描 loader（BK-0014）
    届时以新成员加入本签名」）、`:105-108`（envLoader 读两 key）——**PRD AC2 点名的
    registry.ts:99-105 扩展点区间三段拆引全部落在区间内** ✓；
  - `registry.ts:24-26`（三 Entry 类型）、`:31`（BUILTIN_MCP_IDS 五 id）、`:33-34`
    （CONFLICT_WARN）、`:37`（NAME_RE）、`:56`（parseSpec 无 export 亲核）、`:83-84`
    （E6 http/https）、`:124-130`（合并段冲突 warn+拒该条）；
  - `guard.ts:102-109`（MCP Streamable HTTP 出站网关注释 + mcpFetch → guardedFetch）、
    `:33-50`（assertPublicUrl + localhost/.local/私网/dns.lookup 动态校验 + ALLOW_PRIVATE_NET 逃生）；
  - `inject.ts:37`（registry 单例）、`:52`（`{ fetch: mcpFetch }` 注入缝）、`:93-124`
    （buildToolSession 三分支）；
  - `llm.ts:32`（contextText 6000 量级）、`:34-35`★（技能名注入——原引 33-34 漂移，
    实锚 34 `const skills =` / 35 `'你装配了以下技能'`）；
  - `capabilities.ts:26-32`★（SKILLS 五条目——原引 31-35 漂移）、`:39`★（自建实例——
    原引 40-41 漂移）；
  - `workbench/root.ts:17-18`★（PROJECT_ROOT dist 上溯四级——原引 18-19 漂移）；
  - `config.ts:18-25`（readFileSync 读 .env）、`:29-38`（rawEnv 键表，**19 键亲数**：
    AI×5 + PORT/ALLOW_PRIVATE_NET/BOCHA/SEARXNG×4 + 四 API key×4 + MCP×2 + PTY×4；
    DISCOVERY 前缀 0 = 两新键零重叠）、`:66-74`（MCP 两 env superRefine fail-fast）、
    `:79-82`（PTY 先例）、`:109-117`（E9 交叉校验）；
  - `pty/audit.ts:1-9`（第二连接 + store.ts 零改动头注）、`:20`（SUMMARY_MAX_CHARS=256）、
    `:38-43`（initPtyAuditStore + new Database + busy_timeout=2000）、`:71-73`（clip 截断）、
    `:77-89`（recordPtyAudit 容错 warn 不阻断）；
  - `workbench/tree.ts:9`（fs 只读两员）、`:34`（FOLD 名单）、`:35`（ENTRIES_CAP=500）、
    `:112`（.git 恒排除）、`:115-121`（lstat 不追踪符号链接 + ENOENT 竞态跳过）；
  - `store.ts`：`wc -l` = **400**（「恰 400 行贴线」声明属实）；`server.ts:103/:115`
    （initStore → initPtyAuditStore 接线先例在位）。

### AC3 请批面裁定明文化 —— PASS（结论 = (b)）

- ADR §8（:232-282）附录 A 五要素自包含在案：标题（:241-243）+ 正文（:247-275，请批
  清单 ①新增 env 语义 ×2：MCP_DISCOVERY_SOURCES / MCP_DISCOVERY_ALLOW；②残余风险
  知悉 ×2：stdio 子进程 + skills/rules 提示词注入）+ 批复语义（:271-274，批准/驳回
  二态 + BK-0014 晋升条件）+ 反转预案（:277-282，四触发条件）。
- 「获批前零实现」全文 ≥5 处（ADR:5/:21/:226/:236/:251/:282）。
- 三选一恰一成立：§8 明文「出站/依赖/golden/shared 均零新增（§5/§9），不在请批清单」，
  与 §5 结论「零新增出站类别」自洽——排除 (a)；无「风险声明知悉」单列面（知悉款已并入
  附录 A 正文②）——排除 (c)。

### AC4 零代码机器证明 —— PASS（工作区口径；提交级随脚本）

- `git diff HEAD -- apps packages tools tests .github package.json package-lock.json`
  → 输出为空（本会话实跑，FORBIDDEN-DIFF-EMPTY）。
- `git status --porcelain` 过滤代码路径 → 零命中（改动面仅 BACKLOG/STATE/ADR/iterations 四处）。
- productFiles 白名单（JOURNAL §6）不含任何代码路径 ✓。
- 提交级终判（`git diff <merge-base>..分支 -- 禁区` 恒空）随脚本双提交后复核。

### AC5 回归面全绿 —— PASS

| 命令 | 执行者 | 结果 |
| --- | --- | --- |
| `npm run build` | 脚本（工作树内，派发指令声明通过） | 见前提 §4-a |
| `npm run gate` | 脚本（工作树内，派发指令声明通过） | 见前提 §4-a |
| `npm test` | 脚本（工作树内，派发指令声明通过） | 见前提 §4-a |
| `npm run smoke:server` | **本会话实跑 ×2** | 第 1 次：`168 passed / 0 failed`（= 0064/0066 基线 168 零回退、零增量断言 ✓）；第 2 次静默复跑取退出码：`smoke_exit=0` ✓ |

- 按派发纪律未重复跑 build/gate/test 全套；工作树内未留脚本门禁日志文件
  （`.zcode` 下无 2026-10-29 12:00 后 .log），命令级证据以脚本门禁轮输出与 MERGE 复测为准。
- **交互回归抽查**：手动 E2E **不适用**（SPEC §5 明文——纯文档轮零运行时行为变化），
  以 AC4 禁区 diff 恒空（机器证明）+ smoke:server 168/0 全量回归替代，如实声明；
  s3-library 抖动形态未出现（脚本门禁轮声明通过，无触发 PRD §5.4 预案的事由）。

### AC6 指针抽样 —— PASS（跨文档 ≥6 条全命中）

- `BACKLOG.md:83`（BK-0062 行：capability/否/P2/M/ready/T5 + registry.ts:99-105 证据
  指针在文 ✓）；`BACKLOG.md:111`（BK-0014 行：状态 proposed + 新备注以「ADR-0023 即
  权威」开头 ✓）；`ROADMAP.md:161-165`（T5-M2 主题与四项 ✓）；`ROADMAP.md:210-211`
  （「T5-M2 SPEC 三连穿插：BK-0060 → BK-0061 → BK-0062」✓）；`ROADMAP.md:221-223`
  （ADR 编号落盘时序裁决机制提案在案 ✓）；`metrics.md:64`（0066 done 行载「BK-0020
  晋升条件余附录 A needs-approval 获批」——PRD 所引 #15 批复等待面佐证 ✓）。
- ADR §1.3 三源实况**复现亲核**：仓库根 `.mcp.json`/`.agents` 均 `ls` → No such file；
  `ls ~/.agents` → 仅 `skills/`，内含 `mmx-cli` ——与 ADR 声明逐字相符 ✓。

### AC7 BK-0014 定界回写就绪 —— PASS

node 程序化比对（临时脚本 `.zcode/verify-0067-verbatim.mjs`，行级切栏 + trim 全等）：

```
rowLine=111, verbatimLen=1593, remarkLen=1593, trimEqual=true,
statusCol=proposed, sourceCol=T5, titleHead="智能体扩展发现器：扫描项目 .mcp.json …",
prefix8IdenticalToHead=true, changedLines(归一 CRLF 后)=[111],
bk0062RowUntouched=true, bk0062StillReady=true
```

- `git diff --stat docs/evolution/BACKLOG.md` → `1 file changed, 1 insertion(+), 1 deletion(-)`；
  `git diff --numstat` → `1  1` ——恰 ±1/1 ✓。
- VERBATIM 源 = ADR §7 代码块全文（1593 字符，ADR:228-230 唯一含「触UI=否」的 text 围栏），
  回写备注 trim 全等 ✓；前 8 列与 HEAD 逐字全等（状态 proposed / 来源 T5 / 标题不动）✓；
  BK-0062 行（:83）零触碰且仍 `ready`（终态回写正确留给 CLOSE）✓。

## 2. 与 SPEC §6 BUILD 残余清单的完成度对照

| # | SPEC §6 项 | 状态 |
| --- | --- | --- |
| 1 | 锚点复核勘误 | ✓ JOURNAL §2 记录 4 处勘误，本 VERIFY 独立复核全部确认（见 AC2 ★ 项） |
| 2 | BK-0014 VERBATIM 回写 | ✓ AC7 全过 |
| 3 | 产品提交（恰 1 路径） | 待脚本（提交信息建议见 JOURNAL §6，与 SPEC §6.3 字面一致） |
| 4 | 机制件提交（iterations/0067 四产物 + BACKLOG ±1/1） | 待脚本（REPORT 本文件落盘后齐） |
| 5 | 工作树内四命令门禁 | build/gate/test 脚本已跑（派发声明）；smoke 本 VERIFY 补跑 168/0 exit 0 |

## 3. 知悉项（非 BUG，不阻塞）

1. **SPEC.md §7.3 计数笔误**：「与既有 12 个已知键（config.ts:29-35 亲核）」——实数
   **19 键**（AC2 亲数）。JOURNAL §2 已知悉；本 VERIFY 独立复核：`grep -n '12 个\|已知键'
   docs/adr/0023-*.md` → exit 1（ADR 全文零污染），笔误仅存 SPEC.md:114。按「不回改已定稿
   产物」先例（BK-0063 口径）不回改；「两 discovery 键与既有键零重叠」结论对 19 键成立。
2. **SPEC/PRD 自身锚点滞后 2 处**（llm.ts:33-34 → 实锚 34-35；capabilities.ts:40-41 →
   实锚 39/26-32）：与 ADR 同源，ADR 已勘误且为权威（§7 明文），机制件定稿不回改；
   VERIFY 锚点抽验以 ADR 勘误后坐标执行。

## 4. 通过判定的前提（如实声明）

- **a. 脚本门禁采信**：`npm run build` / `npm run gate` / `npm test` 三项由脚本在本工作树
  内运行且通过（本 ask 派发指令声明；JOURNAL §5 同口径「归脚本统一执行」）。工作树内未留
  日志文件，本 VERIFY 按派发纪律未重复跑全套——该三项的证据以脚本门禁轮输出与 MERGE
  阶段主干复测（`iterations/0067/evidence/`）为最终留档。
- **b. 双提交未落盘**：分支 HEAD 仍为 42ad94a（与主干同点），产品/机制件提交归脚本门禁轮。
  因此 AC1 的「`git show --numstat` 恰 1 产品路径」与 AC4 的提交级终判在本报告时点以工作区
  口径预核通过；若脚本提交面与 productFiles 申报不符（混入清单外文件），以 MERGE 复核为准
  追溯本报告。

## 5. BUG 清单

无。（无 Blocker / Critical / Major / Minor 缺陷；知悉项 2 条见 §3，均非缺陷、不阻塞。）
