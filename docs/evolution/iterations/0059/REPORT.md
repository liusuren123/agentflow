# REPORT · 迭代 0059 · BK-0060 KB 管道后端嵌入存储选型 SPEC 先行（VERIFY）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-28 07:50
> 输入：`PRD.md`（AC1~AC7 + §7 内嵌定界，S 项 skipSpec）+ `JOURNAL.md`（BUILD 与修复轮 1 记录）。
> 验收环境：隔离工作树 `.zcode/worktree/feat/0059-iter`（分支 feat/0059-iter @ 0327566 = main HEAD），
> win32 / Git Bash / Node v24.21.0；UI 抽查 IAB Chromium。
> 派发口径：build/gate/test 已由脚本在工作树内运行且通过（VERIFY 不复跑全套）；
> smoke:server 与针对性 E2E 由本 VERIFY 亲跑。

## 结论

**PASS · 零 BUG（AC1~AC7 全过 + 交互回归抽查过）。** 本迭代为纯文档轮
（产品提交面 = `docs/adr/0020-kb-pipeline-embedding-storage.md` 单文件纯新增 288 行），
零代码/零依赖/零 env/零出站/零 shared/零 UI/零 golden 全部以机器证明或亲跑核实。
观察项 OBS-001~003 均非缺陷（见 §观察项）。

## AC 逐条判定

### AC1 · ADR 落盘与要素完备 — PASS

| 核对项 | 结果 | 证据 |
| --- | --- | --- |
| 恰一文件纯新增 | ✓ | `git status --porcelain`：产品面仅 `?? docs/adr/0020-kb-pipeline-embedding-storage.md`（另三项为机制件 BACKLOG/STATE/iterations/0059/） |
| 行数 ≤400 | ✓ | `wc -l` = **288**（PRD 建议 280±60 区间内） |
| 八要素成节可索引 | ✓ | `grep -n "^#"` 亲核：§1(:29) 动机 / §2(:62) 存储三案（§2.1-2.4） / §3(:125) 嵌入选型 / §4(:146) 管道四段（§4.1-4.4） / §5(:210) kb 清单端点 / §6(:231) 存储承载与拆分 / §7(:250) 回写索引 / §8(:263) 附录 A 结论 |
| 标题含「草案」 | ✓ | :1「…定界方案草案（嵌入存储选型 + …kb 清单端点）」 |
| 状态行语义 | ✓ | :3 = `**草案 · 待实施轮消费（BK-0019——实现轮）**`（AC1 逐字） |
| 附录 A 位 | ✓（不设，条件不成立） | 推荐案四零全落自主区 → §8 成文「**无需批复（明文结论）**」+ 反转预案；PRD AC1「若附录 A 请批草案成立则加位」——条件不成立故无 ADR-0014 式「待用户批准」位，符合 |
| 无「已批准」 | ✓ | `grep -c "已批准"` = **0**（exit 1 无匹配） |
| EOL/BOM | ✓ | `od` 首三字节 `23 20 41`（无 BOM）；`grep -c $'\r'` = 0（纯 LF） |

### AC2 · 选型锚点真实可核 — PASS

全部指针在本 VERIFY 会话逐一亲核（命令：sed/grep/wc/ls/netstat 组合，工作树内路径），
**无一杜撰**。命中清单（18 组）：

1. `packages/shared/src/nodes/retrieval/node.ts:17-22` — sed 亲读：:17 参数行
   `{ id: 'kb', label: '知识库', widget: 'combo'`、:19-21 三固定名 options
   （产品手册 v2.3 / FAQ-售前 / 工单历史 2026）、:22 default '产品手册 v2.3' ✓
2. `apps/server/src/kb.ts`（wc = 98 行）— :1-5 头注「三个知识库与前端下拉一致…」
   「确定性真实计算（非随机模拟）」✓；:7-40 三库语料（`grep -c "src:'"` = **26** = 12+8+6）✓；
   :43-54 terms() bigram（拉丁词 + CJK 二字组）✓；:98 `export function kbNames()` ✓
3. `apps/server/src/handlers.ts:40-53` — sed 亲读 retrieval handler
   （「两级阈值…先 ×4 归一化…再用节点阈值过滤」注释 + 实现逐行）✓
4. `apps/server/src/store.ts` — wc = **恰 400 行**；:62 `const DDL = `` ` `` / :110 收口 ✓
5. `apps/server/src/capabilities.ts` — wc = 64 行；:54-55 注释「恒 200（只读派生无 4xx/5xx 路径…）」✓
6. `apps/server/src/server.ts` — :75 `app.use(express.json({ limit: '4mb' }))` ✓；
   :244-273 sed 输出 **17 条路由全部 /api/v1/**（无 /api/* 旧别名，ADR-0005 v1-only）✓；
   :261 capabilities 注册 ✓
7. `apps/server/src/tools.ts` — :16 SANDBOX 模块级常量 ✓；:18-22 safePath（resolve 归一 +
   前缀校验「路径越界」）✓；:33 `mcp-sqlite.db` 沙箱专用库 ✓；:36-37 `SQL_DENY_FN =
   /\bload_extension\s*\(/i` ✓（ADR §2.4 否决案 a 第③点依据）
8. `apps/server/src/pty/audit.ts` — 头注亲读：pty_audits 自有仓储「同一主库…
   第二个 better-sqlite3 连接…store.ts 零改动——该文件恰 400 行贴线…busy_timeout=2000」✓（§6 案甲先例）
9. `apps/server/package.json` — better-sqlite3 `^12.11.1` / express `^5.0.0` / ai `^7.0.0` ✓
10. kbNames 零消费 — 全仓 grep（apps/packages/tests/tools，排除 dist）仅 :98 定义 + dist 产物 ✓
11. tests 零 KB 断言 — `grep -rn "产品手册|知识库|retrieval" tests --include=*.mjs` exit 1 零命中 ✓
12. `docs/ai-sdk-7-功能汇总.md:37/:79` — embed/embedMany 两条 ✓
13. `docs/evolution/POLICY.md` — :13-14 自主区（apps/server/src/**）/ :25 需批准区
    （新增 npm 依赖/出站类别/env 语义）✓
14. BACKLOG 行号 — BK-0047=**:68** / BK-0060=**:81** / BK-0061=:82 / BK-0062=:83 /
    BK-0063=:84 / BK-0019=**:116**（grep -n 亲核）✓
15. `docs/evolution/ROADMAP.md:161-165`（M2 定义含「retrieval 命中真实入库文档」验收原文）✓；
    `:210-211`（「T5-M2 SPEC 三连穿插：BK-0060 → BK-0061 → BK-0062…若定新依赖即持附录开
    needs-approval」）✓
16. ADR-0014 §6「附录 A · needs-approval issue 草案（字面量，脚本逐字取用）」存在（§8 形态参照）✓
17. ADR-0015 §7「定界回写索引（权威字面量）」:236 + ```text 块 ×3 ✓（§7 制式直系样板）
18. ADR-0016 §3.0「项目根锚定（必答项 · 零 env 推荐案）」:134 + :136「模块级常量锚定
    （SANDBOX 同构）——沿 tools.ts:16 机理」✓

存储三案五要素齐备性（AC2 后半）：§2.1 案 a / §2.2 案 b / §2.3 案 c 每案均含
数据模型·读写路径·依赖清单·需批准面·迁移回滚五要素（逐案 sed 核对）；§2.4 推荐案 c
给出否决案 a 四点理由（量级前提缺失/native 分发风险/load_extension 新安全审面/需批准面可避免）
与否决案 b 四点理由（运维面/双需批准面/本地优先形态冲突/量级不达），并如实声明案 c
线性扫描代价与 10⁵ 反转阈值 ✓。

### AC3 · 管道与端点定界成文 — PASS

读 ADR §3~§5 全文逐项核对：

- **① 四段承载 + 验收口径**：§4.1 上传段（kb/routes.ts + server.ts 接线，端点
  `POST /api/v1/kb/:name/documents` + 验收口径草案 :179-180）/ §4.2 切分段（kb/chunk.ts，
  段落边界 + 块长/重叠参数草案 + 空文档 400）/ §4.3 嵌入段（kb/embed.ts，L1 terms()
  等距迁移 + 等价性断言）/ §4.4 入库段（kb/store.ts + kb.ts 索引源改造 + seed 回归断言）✓
- **② 上传安全必答**：落盘锚定 `apps/server/sandbox/kb/<name>/`（SANDBOX 派生 + safePath
  机理同构 + 越界 400）/ 单文件 ≤5 MiB + 单 KB chunk 上限 10⁴ / 类型白名单
  txt·md·csv·json（非白名单 415，二进制解析=新依赖反转护栏）/ 零出站（guard.ts 零涉）——
  四项齐备 ✓；multipart 不采写死（新依赖→需批准）✓
- **③ kb 清单端点五要素**：§5 表格成文——路径 `GET /api/v1/kb`（v1-only 无旧别名）/
  入参（无，全量只读）/ 出参 `{ kbs: [{ name, docs, chunks, updated_at }] }` /
  错误码（恒 200，capabilities.ts:54-55 同构）/ 样板指针 capabilities.ts（ADR-0018）✓
- **④ BK-0047 边界切割写死**：§5 :223-229（combo 换源触 UI 结构层归 BK-0047 修宪轮
  消费 issue#6 批复承继；**BK-0019 实现轮 packages/shared 零改动**，node.ts:17-22 三固定名
  options 原样保留）+ §7 :256-257 双重承载 ✓
- **⑤ 嵌入实现选型与出站判定**：§3 三路对照表（L1 本地词法推荐·零依赖零出站 /
  L2 本地稠密·新依赖 / L3 外部 embedding API·**新增出站类别**→POLICY 需批准区）+
  与 §2 案 c 组合统一推荐 ✓
- 偏差核处：JOURNAL §3.2 将 PRD 两分法细化为 L1/L2/L3 三路——PRD 钦定的出站分类
  （外部 API→需批准区）原样保持、推荐案与 PRD「纯表扫描+本地嵌入→无需批复」分支精确对应，
  细化不越界，判合规。

### AC4 · 定界回写 VERBATIM 一致 — PASS

VERIFY 独立 node 脚本比对（临时脚本，已清理；非复述 BUILD 自报）：

- ADR §7 ```text 块字面量：长度 **1919**、单行、不含管道符（表格安全）✓
- BACKLOG BK-0019 行备注列（split('|') 末非空列）：长度 **1919**，trim 后全等 →
  **VERBATIM OK** ✓
- 其余列逐字不动：`ID=BK-0019 | capability | 否 | P2 | M | proposed | T5` ✓
- 锚点刷新：备注含旧锚点 `nodes.ts:41` 恰 1 处（说明语境「系 NDP 迁移前坐标，本次刷新」）、
  新锚点 `nodes/retrieval/node.ts:17-22` 在 ✓
- 晋升条件字面：`=BK-0060 CLOSE 且（若实施轮反转采 §2 案 a/b 存储、§3 L2/L3 嵌入或新增
  multipart/pdf 解析依赖）对应 needs-approval 获批…推荐案零反转则无批复等待项`——与 ADR
  §7 导语/§8 结论语义一致且以字面量承载 ✓
- 波及面：`git diff --stat docs/evolution/BACKLOG.md` = 1 file / +1/−1（恰一行改写）；
  BK-0060/BK-0047 行未被触碰（脚本核验）✓；回写随归档提交，产品提交仍恰 1 路径 ✓

### AC5 · 白名单与零代码机器证明 — PASS（工作区证据；numstat 留提交时点）

- 产品提交尚未发生（WORKFLOW §4 状态机：BUILD⇄VERIFY → 特性分支提交在后），
  `git show --numstat <产品提交>` 在 VERIFY 时点**不可执行**——如实记录为 OBS-001，
  提交后由脚本按 AC5 口径复核（预期恰 `docs/adr/0020-*.md` 一路径 +288/−0）。
- 工作区等价证据（VERIFY 亲跑）：
  - `git status --porcelain` 恰四项：`M BACKLOG.md`、`M STATE.md`、
    `?? docs/adr/0020-*.md`、`?? iterations/0059/`（全部在申报白名单/机制件面内）；
  - **禁区 diff 恒空**：`git diff -- apps packages tools tests .github package.json
    package-lock.json` 零输出；
  - **lock 零变化**：`git diff --stat -- package-lock.json` 空（零依赖机器证明）；
  - 分支 vs main 零提交差异（`git diff main...HEAD --stat` 空，HEAD=0327566）。

### AC6 · 纯回归面全绿 — PASS（混合证据，如实区分亲跑/采信）

| 命令 | 结果 | 证据性质 |
| --- | --- | --- |
| `npm run build` | 通过 | **采信派发指令**（脚本侧已运行且通过；VERIFY 遵「不重复跑全套」未复跑） |
| `npm run gate` | 通过 | 同上采信 + 旁证：20 场景基线亲数（`ls tests/golden/ui/*.invariants.json` = **20**）；`tests/golden/diff/` **空**（无失败残留）；JOURNAL §6 修复轮 1 记录 07:29 门禁 s3-library 抖动红（diffPx=23，与 issue#12 已知形态逐字吻合）+ DOM 不变量 keys/deep equal 双 true + rerun 处置——与最终通过声明一致（0037~0052 rerun 自愈先例）；golden 权威在 CI（宪法第 2 条） |
| `npm test` | 通过 | 采信派发指令（同上） |
| `npm run smoke:server` | **157 passed / 0 failed，exit 0** | **VERIFY 亲跑**（工作树内，2026-10-28 07:4x；输出尾行 `==== smoke:server：157 passed / 0 failed ====` `SMOKE-EXIT=0`）——与 0057 基线零漂移 |
| 后端健康抽查 | ok | VERIFY 亲跑：`npm run dev:server` 启动（Node v24.21.0，dbFile 指向**工作树内** data/agentflow.db——隔离成立）；`curl /api/v1/health` → `{"ok":true,…provider configured DeepSeek}`；`GET /` 200；`GET /api/v1/capabilities` 200；抽查后进程已终止、端口释放 |

### AC7 · 指针抽样可开 — PASS

PRD 建议抽样池全部覆盖：亲核 **18 组 / 23+ 条**（清单见 AC2），远超 ≥5 下限，全部命中无误。

## 交互回归抽查（WORKFLOW §4 契约项）— PASS

零代码轮的交互回归以「零 UI 改动机器证明（AC5）+ gate 20 场景（脚本侧通过）」为主承载，
另做浏览器实跑抽查（IAB Chromium @ localhost:3000，dev:server 亲启；节点选中用页面内
MouseEvent 派发走 legacy 事件委托链，见 OBS-002）：

1. **页面加载与骨架**：标题「AgentFlow · 智能体工作流原型」；banner/导航/侧栏/画布/
   属性面板/日志面板 DOM 结构完整（domSnapshot 亲核）。
2. **DOM 不变量**（只读 evaluate）：`#viewport`=1、`.node`=3、`.wdg`=7、`.port`=5、
   `#props`=1、`:root` CSS 变量在（`--bg #171718`）——与状态栏「节点 3 · 连线 2」一致。
3. **节点选中交互**：LLM 节点 mousedown/click → `.node.selected` 命中（app.js:786/:1324
   选中类名）+ 属性面板切换参数表单（模型 combo DeepSeek-V4/R2 与 DEFS 一致、系统提示词/
   温度/最大 Tokens/端口/能力配置 MCP 服务/技能 Skill 完整渲染）+ 工具条出现选中态按钮组
   （删除/节点信息/旁路/重置节点状态/仅执行此节点）。
4. **节点库切换 + 添加节点**：rail「节点库」tab（data-stab=nodes）点击切换 → 「知识库检索」
   条目点击 → 画布节点 **3→4**。
5. **kb combo 三固定名（本迭代直接相关面）**：新 retrieval 节点**节点体内** combo 与
   **属性面板** combo options 均 = `['产品手册 v2.3','FAQ-售前','工单历史 2026']`——与
   `node.ts:19-21` 逐一相符，ADR §5「三固定名 options 原样保留（DEFS 冻结面）」在 UI
   实测兑现（BK-0047 边界切割的 UI 侧证据）。
6. **撤销交互**：Ctrl+Z → 节点 4→3 恢复原状（无脏状态残留）。
7. **在线态**：日志面板「⚡ 执行后端已连接 · Vercel AI SDK 7 · Node v24.21.0 ·
   已连接 DeepSeek（OpenAI 兼容端点）」。

> 覆盖深度说明：本机抽查为行为一致性证据；像素级判定归 gate 20 场景（脚本侧通过声明，
> CI 为权威）。零代码轮下 UI 三层零接触已由 AC5 机器证明闭环。

## 观察项（非缺陷）

- **OBS-001（时序性，非缺陷）**：AC5 的 `git show --numstat <产品提交>` 在 VERIFY 时点
  不可执行（状态机：VERIFY → 特性分支提交）。工作区证据（status 恰四项 + 禁区 diff 空 +
  lock 零变化）已在提交前闭环改动面证明；**建议脚本提交后复核 numstat = 恰
  `docs/adr/0020-*.md` 一路径 +288/−0**（机械后验，不改变 PASS 判定）。
- **OBS-002（工具面，非产品缺陷）**：IAB CUA 坐标点击（cua.click 视口坐标 532,232 / 532,354，
  elementFromPoint 证实落点在 LLM 节点内）未触发选中；页面内完整 MouseEvent 序列派发
  （mousedown/mouseup/click，冒泡走 app.js 委托链）正常触发。指向 IAB CUA 坐标系与 CSS
  视口坐标的换算偏差（疑 DPR 相关），系本次抽查工具的局限；产品事件链在真实事件下工作正常。
- **OBS-003（粒度差异，已在 JOURNAL §3.1 记档）**：BK-0060 行内锚点「node.ts:19-22」
  （options 内层）与 PRD/ADR「:17-22」（完整参数块）粒度不同——代码亲核两锚皆真
  （:17 参数行 / :19-21 options / :22 default），按 PRD 口径统一为 :17-22，非冲突。

## CLOSE 就绪核（供协调者/脚本）

- BK-0060 置 done（来源 T5 无 issue → 无回执义务）；BK-0019 维持 proposed、
  **晋升条件就位**（本项 CLOSE + 推荐案零反转 → 无批复等待项，ADR §8 明文）；
  BK-0047 维持 proposed 待链晋升（issue#6 关单留 BK-9006 末项，JOURNAL §5 口径）。
- metrics 行建议：result=done / gate=20 场景 / test=30/30 / smoke=157/0（AC6 基线零漂移，
  以脚本侧实测值为准）/ 行数差=+288（ADR 单文件）/ bug=0。
- 修复轮：本轮零 BUG，repair_round 维持 0。
- 证据完备性：本 REPORT 所引全部命令输出为本 VERIFY 会话实跑或派发指令明示；
  未亲跑项（build/gate/test 三命令本体）已在 AC6 表格中逐项标注证据性质为「采信派发指令」。
