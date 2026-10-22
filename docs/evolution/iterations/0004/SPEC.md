# SPEC · 迭代 0004 · BK-0006 README 能力同步（ADR-0006/0007 已落地能力补记）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-22 12:45
> 输入：`docs/evolution/iterations/0004/PRD.md`（PLAN 产物，本 SPEC 的需求权威）。
> 事实核实时点：2026-10-22 12:45 本会话只读核实；引用行号均为当前工作区 HEAD
> （b081d55）状态。冲突顺位：CONSTITUTION.md > 代码实现 > 其他文档（角色定义）。

## 0. 结论与架构决策判定

- **纯文档变更，唯一产品面 = 仓库根 `README.md`**。触 UI = 否（PRD「触 UI 分类结论」；
  宪法第 4 条「不适用」清单明文「文档」不触发门禁）。
- **无需新 ADR（needsAdr = false）**：本项不涉及任何架构选型（WORKFLOW §4 SPEC 契约
  中 ADR 草案的触发条件）；所补记能力的载体 ADR-0006（前端接入服务端持久化）与
  ADR-0007（删除能力）均已存在且状态为「已批准 · 已实施」
  （`docs/adr/0006-frontend-persistence-ui.md:3`、`docs/adr/0007-workflow-delete.md:3`，
  实施记录分别见其 §11）。ADR-0008（审批弹窗盒体 CSS 修复）按 PRD 非目标不为它
  增设 README 段落。
- 现状矛盾确认（本会话 Read）：`README.md:74` 现存陈述「**localStorage 仍是前端当前
  事实源**；前端接入服务端属 UI 变更，需宪法第 3 条流程」与 ADR-0006 已实施后的
  双源现状相反，必须更正（REQ-0006-02）。

## 1. 受影响文件清单

### 1.1 产品面（唯一；产品提交只含此一个文件）

| 文件 | 当前区间 | 变更类型 | 对应 REQ |
| --- | --- | --- | --- |
| `README.md` | `:39-46` 常用命令表 | +1 行（`smoke:server`） | REQ-0006-03 |
| `README.md` | `:67` 「持久化与部署」节标题 | 更新（涵盖 ADR-0006/0007） | REQ-0006-02 |
| `README.md` | `:72-73` v1 端点清单 | +2 行（两个 DELETE 端点） | REQ-0006-01 |
| `README.md` | `:74` 陈旧句 | 更正 + 扩写前端在线态能力 | REQ-0006-02 |

注：README 现共 111 行（本会话 Read 全文核实）；上述 4 处在物理上连续耦合于
「常用命令」与「持久化与部署」两节，行预算合计 **+10～20 行**（PRD 非功能 3）。

### 1.2 机制面（不进产品提交；`docs/evolution/` 前缀被防打转过滤排除）

| 文件 | 变更 |
| --- | --- |
| `docs/evolution/iterations/0004/SPEC.md` | 本文件 |
| `docs/evolution/STATE.md` | phase PLAN → SPEC（本次已同步更新） |
| `docs/evolution/iterations/0004/{REPORT,JOURNAL}.md` | 后续 VERIFY/BUILD 阶段产物 |

### 1.3 零改动清单（负面约束，BUILD 自检 + VERIFY 复核）

- `apps/**`、`packages/**`、`tools/**`、`tests/**`：**零改动**（doc 项，PRD 非目标 1）。
- `AGENTS.md`：零改动——仓库地图已含 `apps/web/src/server-sync.js` 条目
  （AGENTS.md 仓库地图节，`server-sync.js /api/v1 数据接入层`），无需重复。
- `docs/ai-sdk-7-功能汇总.md`：**只读**（REQ-0006-05 抽查对象，禁止本迭代修改）。
- `docs/adr/**` 既有 ADR 正文：零改动。
- `CONSTITUTION.md`、`tools/pixel-gate/**`、CI 配置、`tests/golden/**`：零改动
  （WORKFLOW §6 护栏 2/3）。
- **README 其余章节零改动**，特别是：视觉规格表（宪法第 1 条引用的宪法配套文档，
  `README.md:110-111`；本迭代无任何获批 UI 变更，不得触碰其数值）、执行引擎表
  （`:48-64`，其中 `:57`「未实现者如实告知模型」表述准确保持不扩写——REQ-0006-04）、
  布局还原表（`:97-108`）、Docker 段（`:78-87`）。

## 2. 模块边界

1. **写入边界**：README 仅「常用命令」表与「持久化与部署」节（§1.1 四处）；其余
   章节逐字不动。不做顺手润色（WORKFLOW §1 原则 4）。
2. **追溯边界**：README 新增的每句能力描述必须落在 §3.2 溯源表的条目内
   （REQ-0006-04）；README 正文保持门面简洁、不内联代码行号（PRD 非功能 1）。
3. **防打转边界**：产品提交非空判据 = `docs/evolution/` 之外有改动
   （`.zcode/workflows/evolution-iteration.dwf.ts:241-244`，本会话 sed 核实其过滤
   实现）；README.md 满足。**SPEC 禁止把任何产品面改动挪入 `docs/evolution/`**
   （PRD 风险 1）。
4. **回滚边界**：单提交收敛，提交只 `git add README.md`；`git revert` 即完全恢复
   （PRD 非功能 4）。

## 3. 详细规格（逐 REQ，BUILD 按此实现、VERIFY 按此核对）

### 3.1 REQ-0006-01 · DELETE 端点两行

**位置**：`README.md:72-73` 端点清单尾部（现清单止于 `GET /api/v1/runs/:id` 行）。

**格式基线**：沿用现清单的续行风格（行首空格 + `·` 分隔 + 全角括注，
见 `README.md:72-73` 原文）。

**建议文案**（BUILD 可等价微调措辞，但语义元素不得增减）：

```
  · `DELETE /api/v1/workflows/:id`（不存在 → 404）
  · `DELETE /api/v1/runs/:id`（活动 run → 409，判据为进程内存注册表而非 DB status；
    删除时 runs 行与全部 run_events 行同一事务级联删除）。
```

**语义对照表**（文案元素 ↔ 实现 ↔ ADR 规格，逐条可验证）：

| 文案元素 | 实现出处 | ADR 规格 |
| --- | --- | --- |
| workflows DELETE 仅 v1、404 `workflow not found` | `apps/server/src/server.ts:201`（注册）、`:172-175`（handler） | ADR-0007 §3.1 |
| runs DELETE 仅 v1 | `server.ts:202` | ADR-0007 §3.2 |
| 活动 run 409，判内存注册表 `runsById` 而非 DB status | `server.ts:178-180`（注释明文「守卫用内存注册表（runsById）而非 DB status」） | ADR-0007 §3.2（僵尸 running 行可删的理由） |
| run 不存在 404 | `server.ts:181` | ADR-0007 §3.2 |
| runs 行 + 全部 run_events 行同一事务级联删除 | `server.ts:182`（注释）；事务在 `store.ts` `txDeleteRun`（ADR-0007 §11 实施记录） | ADR-0007 §3.2 |
| 8 端点仅注册 `/api/v1`、无旧别名 | `server.ts:193-202`（8 条路由注册，注释「仅注册 v1」） | ADR-0005/0007 |

**反例**：不得写成「幂等 204」（ADR-0007 §3.4 明文否决）、不得写「DELETE /api/workflows/:id
旧别名可用」（不存在，`server.ts:186-192` 旧别名循环只含 health/models/run/stop/approve）。

### 3.2 REQ-0006-02 · 节标题更新 + 陈旧句更正 + 前端能力补记

**（a）节标题**（`README.md:67`）：现「持久化与部署（ADR-0004/0005 已落地 2026-10-20）」
→ 建议改为：

```
## 持久化与部署（ADR-0004~0007 已落地 2026-10-20/21）
```

（0004/0005 实施于 2026-10-20，0006/0007 于 2026-10-21——两 ADR §11 实施记录日期。）

**（b）陈旧句更正**（`README.md:74` 整句替换）。更正后必须表达**双源语义**：

- 正例要素（缺一不可）：① 前端已接入服务端持久化（ADR-0006/0007，2026-10-21
  批准实施）；② localStorage 仍是**本地工作流与离线运行历史**的存储；③ 离线或
  后端未连接时回退本地、本地写入路径不变。
- 反例（判 FAIL）：残留「前端接入服务端属 UI 变更」或「localStorage 仍是前端当前
  事实源」任一短语（AC2 检索式验收）；或写成「服务端已是唯一事实源」（过度，PRD
  风险 4）。

**（c）前端能力补记**——允许写入 README 的能力句全集（**封闭清单**，每条附溯源；
BUILD 只能从此清单取材，VERIFY AC3 逐句核对出处）：

| # | 能力句要点 | 溯源（实施记录） |
| --- | --- | --- |
| C1 | 「工作流」面板「服务端」分组：保存当前工作流到服务端（PUT upsert，成功写回标签页 wfId） | ADR-0006 §4.1 / §11.1（③「服务端」分组 + `cloudSaveCurrent`） |
| C2 | 服务端卡片点击「打开」→ 装载为新标签页 | ADR-0006 §4.1 / §11.1（`openServerWorkflow`，仿 addTabFromSample） |
| C3 | 卡片「覆盖保存」（目标 id=所点条目，内容=当前激活标签页） | ADR-0006 §4.1 / §11.1（`cloudOverwrite`） |
| C4 | 服务端工作流「删除」：两按钮确认弹窗；删除后防复活清理标签页 wfId | ADR-0007 §4.1 / §4.3 / §4.4 / §11（`data-wf-del` + `confirmDialog` + `cloudDeleteWorkflow`） |
| C5 | 「任务历史」面板：在线时服务端优先（GET /api/v1/runs，limit 默认 20）；拉取失败/离线回退本地 | ADR-0006 §4.2 / §11.1（④数据源切换） |
| C6 | 历史卡片点击展开只读事件回放时间线（`.logline` 行 × 事件序号 `#00` 起；`run:progress`/`node:delta` 不渲染行） | ADR-0006 §4.2 / §4.3 / §11.1（`replayLines`/`toggleRunReplay`） |
| C7 | 运行历史单卡删除（含 409「运行中不可删除」文案转译；删除展开卡时收起展开态） | ADR-0007 §4.2 / §4.4 / §11（`data-run-del` + `deleteRunCard`） |
| C8 | 离线行为：双击 dist / 后端未启动 →「服务端」分组显示「后端未连接」、零网络请求；`file:` 协议直接 offline | ADR-0006 §4.5 / §11.3-e |
| C9 | 服务端模式**不提供**「清空历史」批量入口（按 C1 批复，仅逐卡删除） | ADR-0007 §3.3（C1）/ §11（批复形态「C1」） |

SPEC 裁定：C1–C8 为建议记述项（BUILD 可合并措辞但不得虚构超出项）；C9 允许省略
（README 无义务记述「不做」的事），若记述必须是否定式表述——**禁止**出现「清空/
批量删除服务端历史」的肯定性能力句（REQ-0006-04 红线 ③）。

**建议文案**（供 BUILD 参考，等价微调允许）：

```
  **前端已接入服务端持久化**（ADR-0006/0007，2026-10-21 批准实施）：「工作流」面板
  「服务端」分组支持保存当前工作流到服务端（PUT upsert）/ 打开 / 覆盖保存 / 删除
  （两按钮确认弹窗）；「任务历史」面板在线时服务端优先，卡片点击展开只读事件回放
  （`.logline` 行 × 事件序号），支持单卡删除（运行中 409 转译提示）；离线或后端
  未连接时回退 localStorage（本地写入路径不变）——localStorage 仍是本地工作流与
  离线运行历史的存储。
```

### 3.3 REQ-0006-03 · 命令表补 `smoke:server` 行

**位置**：`README.md:39-46` 常用命令表；建议插在 `npm test` 行之后（同为验证类命令）。

**脚本事实**（`package.json:19`：`"smoke:server": "node tests/smoke/smoke-server.mjs"`；
脚本断言范围本会话 grep 核实，`tests/smoke/smoke-server.mjs`）：

- P 组前置 → H 组起进程健康等待 → W 组 workflows CRUD 往返（W01-W07）→ N 组
  参数反例（400）→ S 组 `/run` SSE 全事件链（S01-S05，有序子序列 run:accepted→
  run:start→node:start→node:done→run:done）→ R 组 runs 列表与回放深相等
  （R01-R03）→ D 组删除守卫（D01-D07：活动 run DELETE 409 → approve 收尾 →
  DELETE 200 → 再 GET 404）→ C 组自清理零残留；fail-fast，汇总
  `==== smoke:server：X passed / Y failed ====`。

**建议文案**：

```
| `npm run smoke:server` | 后端 E2E 冒烟（独立端口起 server：/api/v1 workflows CRUD + /run SSE 全事件链 + 删除守卫 409/200，自清理） |
```

### 3.4 REQ-0006-04 · 红线禁句（VERIFY 检索式核对）

README 本次新增文字**禁止**出现以下未落地能力的肯定性表述（PRD 背景 5，均为本
会话或 PRD 会话核实）：

| # | 禁句语义 | 事实依据 |
| --- | --- | --- |
| R1 | websearch 引擎参数（eng）路由/选择 | `ROADMAP.md:72`「websearch 的 eng 参数当前被后端完全忽略」（BK-0007 未做） |
| R2 | sqlite / browser MCP 工具真实实现 | `ROADMAP.md:71`「sqlite/browser 如实降级 not implemented」；README:57 现有「未实现者如实告知模型」表述准确、保留不扩写 |
| R3 | 服务端历史批量清空能力 | ADR-0007 §3.3 C1 批复：服务端模式不渲染「清空历史」 |

核对命令（VERIFY 用，git bash）：

```bash
grep -nE "eng|引擎选择" README.md            # 不得出现引擎选择/路由语义的新增句
grep -n "清空" README.md                     # 「清空」仅允许出现在本地历史/画布语义或否定式
grep -nE "sqlite|browser" README.md          # 不得出现二者已实现的肯定表述
```

### 3.5 REQ-0006-05 · ai-sdk 文档 × llm.ts 实装抽查样本清单（VERIFY 只读执行）

样本 7 条（PRD 要求 ≥5；VERIFY 至少抽查 5 条，建议全查 7 条），每条给「一致 /
不一致 + 证据」结论；文档侧 = `docs/ai-sdk-7-功能汇总.md`，实装侧 =
`apps/server/src/llm.ts`（两文件本会话均已 Read，行号为当前 HEAD）：

| # | 样本 | 文档侧出处 | 实装侧出处 | 一致判据 |
| --- | --- | --- | --- | --- |
| S1 | `streamText` 流式路径（textStream 逐 token + onError + abortSignal） | §4 使用子集表「streamText（textStream 逐 token 推送画布打字机）+ onError + abortSignal」 | `llm.ts:86-90`（参数集 model/system/prompt/temperature/maxOutputTokens/abortSignal/onError）、`:91-95`（for await textStream） | 参数集与消费方式与文档记述一致 |
| S2 | `generateText` 工具循环（messages + tools + response.messages 续接，3 轮上限） | §4「generateText（messages + tools + response.messages 续接，3 轮上限）」 | `llm.ts:63`（`round<=3`）、`:64`（messages/tools）、`:69`（`messages.concat(res.response.messages)`） | 3 轮上限与续接方式一致 |
| S3 | system 提示词独立参数 | §5.1 | `llm.ts:61-62`（注释）+ `:64/:78/:87`（`system: sys \|\| undefined`；messages 仅 user 起） | 一致（messages 内无 system 角色） |
| S4 | 带 execute 工具结果自动进 response.messages（勿重复追加） | §3.3「执行语义」+ §5.2 | `llm.ts:68`（注释「response.messages 已含 assistant 调用与 tool 结果，直接续接」） | 一致（代码无手工追加 tool 消息） |
| S5 | 工具命名 `^\w+$` 清洗 | §5.3 | `llm.ts:51`（`name.replace(/[^\w]/g,'_')`） | 一致 |
| S6 | usage 为 promise 风格、字段 totalTokens/outputTokens | §5.4 | `llm.ts:65/:79`（`res.usage?.totalTokens \|\| res.usage?.outputTokens`）、`:98`（`await result.usage`） | 一致 |
| S7 | `tool` 定义（zod inputSchema + execute） | §4「tool（zod inputSchema + execute）」 | `llm.ts:53`（`tool({ description, inputSchema: z.object(shape), execute })`） | 一致 |

**规则**（PRD REQ-0006-05 / AC7）：只读零改动；发现不一致 → REPORT 如实记录 +
建议新 BACKLOG 项，本迭代不修；不一致不判 FAIL，**隐瞒不一致才判 FAIL**。

## 4. 验收口径（命令 + 手动 E2E 点位；与 PRD AC1–AC7 一一映射）

### 4.1 自动命令链（BUILD 收尾必跑；VERIFY 复跑取证）

| 序 | 命令 | 通过标准 | 映射 |
| --- | --- | --- | --- |
| 1 | `npm run build` | shared + web 构建零错误（gate 前置） | AC6 前置 |
| 2 | `npm run gate` | 4 场景全部 `pass · diffPx=0`；无 DOM 不变量变化；输出**不含** `golden-created`/`golden-updated`（本项文档变更，gate 全绿 = 防误触兜底证据） | AC6 |
| 3 | `npm test` | 全绿（迭代 0003 后基线为 node --test 8 项，`STATE.md:13`；测试链含 build:shared→build:server 前置，`package.json:18`） | AC6 |

### 4.2 手动 E2E 点位（本项无浏览器 E2E——产品面零代码改动；E2E 形态 = 文档核对）

以下检索在仓库根（git bash）执行，逐条记录输出：

| 点位 | 命令 | 预期 | 映射 |
| --- | --- | --- | --- |
| E1 | `grep -n "前端接入服务端属 UI 变更" README.md; grep -n "localStorage 仍是前端当前事实源" README.md` | 均无输出（0 残留） | AC2 |
| E2 | `grep -n "DELETE /api/v1/workflows/:id" README.md` 与 `grep -n "DELETE /api/v1/runs/:id" README.md` | 各 ≥1 行，且括注含 404 / 409 / 级联删除要素（对照 §3.1 语义对照表） | AC1 |
| E3 | 逐句核对 README 新增前端能力句 ⊆ §3.2 C1–C9 封闭清单，每条在 ADR-0006 §11.1 或 ADR-0007 §11 找到实施记录 | 无凭空条目 | AC3 |
| E4 | §3.4 三条禁句检索 | 无肯定性表述 | AC4 |
| E5 | `grep -n "smoke:server" README.md` | ≥1 行，用途描述与 §3.3 脚本事实一致（W/S/D 组断言范围） | AC5 |
| E6 | 按 §3.5 样本清单抽查 ≥5 条（建议 7 条全查），逐条出「一致/不一致 + 证据（双侧行号）」 | 每条有结论；不一致如实记录不判 FAIL | AC7 |
| E7（可选增强） | `npm run smoke:server` | 全绿可佐证 AC5 描述真实性；**不作为 AC 判定条件**（PRD 未列为 AC） | AC5 旁证 |

### 4.3 提交口径

产品提交仅含 `README.md`（`git add README.md`，禁止 `git add -A`）；Conventional
Commits 建议 `docs(readme): 补记 ADR-0006/0007 已落地能力（DELETE 端点 + 服务端工作流/历史回放/删除）（BK-0006）`。归档提交由协调者按 WORKFLOW §4 CLOSE 执行。

## 5. 风险与回滚

| 风险 | 应对（本 SPEC 落点） |
| --- | --- |
| 产品提交为空（迭代 0001 失败模式） | §2 边界 3：唯一产品面 README.md 在 `docs/evolution/` 之外，防打转过滤（dwf.ts:241-244）不排除它；提交口径 §4.3 限定单文件 |
| 文档走样/过度承诺 | §3.2 封闭清单 C1–C9 + §3.4 禁句表 + E3/E4 检索式核对 |
| ai-sdk 抽查发现不一致 | §3.5 规则：记录 + 新立项，不修不判 FAIL |
| 双源语义写绕（过度/不足） | §3.2(b) 正例要素三缺一不可 + 反例判 FAIL + E1 检索 |
| 误触渲染路径 | §4.1 命令 1/2：build + gate 4 场景 diffPx=0 兜底 |

回滚：单提交收敛（README.md 单文件），`git revert <提交>` 即完全恢复；回滚后
复跑 `npm run gate` + `npm test` 全绿证明基线无损（纯文档变更，预期必然全绿）。

## 6. BUILD 执行序

1. 改 README §1.1 四处（按 §3.1/§3.2/§3.3 建议文案，行预算 +10～20）。
2. `npm run build` → `npm run gate` → `npm test`（§4.1）。
3. `git add README.md` → conventional commit（§4.3）。
4. `docs/evolution/iterations/0004/JOURNAL.md` 记录实现过程与命令输出摘要。
