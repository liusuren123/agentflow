# REPORT · 迭代 0004 · BK-0006 README 能力同步：ADR-0006/0007 已落地能力补记（VERIFY 验收报告）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-22 13:04
> 输入：本目录 PRD.md（AC1-AC7）+ SPEC.md（§4 验收口径：§4.1 命令链 / §4.2 E1-E7 / §3.5 样本 S1-S7）+ JOURNAL.md。
> 环境：Windows (win32 10.0.26300) · Node v24.21.0 · 仓库根 D:\Projects\CodeRepo\agent-workflow · 后端在线（DeepSeek 已配置）。

## 结论

**PASS。** AC1-AC7 全部通过：SPEC §4.2 文档 E2E E1-E6 由本会话独立复跑取证（非转抄 JOURNAL 预检），
E7 冒烟由本会话实测 33/33 全绿；AC6 的 build/gate/test 全套由工作流脚本先行运行且通过
（VERIFY 任务指令明示「不要重复跑全套」，本报告如实区分引用与自测，并附独立佐证）；
交互回归抽查 = E7 后端全链 + 浏览器在线态实操（README 新记述的全部前端能力入口逐一见诸实机）。
**缺陷清单：无。**

## 一、门禁分层与证据归属

| 层 | 执行者 | 命令 | 结果 |
| --- | --- | --- | --- |
| 脚本侧（引用，VERIFY 指令明示已跑且通过） | 工作流脚本 | `npm run build` / `npm run gate`（4 场景 diffPx=0 口径）/ `npm test`（node --test 8 项） | 通过（本会话未复跑全套，按指令不重复） |
| VERIFY 自测① 文档 E2E | 本会话 | SPEC §4.2 E1/E2/E4/E5 检索 + E3 逐句溯源（git bash，仓库根） | 全过（§二） |
| VERIFY 自测② 后端 E2E | 本会话 | `npm run smoke:server`（SPEC §4.2 E7 可选增强） | **33 passed / 0 failed**（§四） |
| VERIFY 自测③ 浏览器在线态实操 | 本会话 | `node apps/server/dist/server.js`（:3000，health ok）+ 浏览器 DOM 实测 | 服务端分组/确认弹窗/历史回放/单卡删除全实证（§四） |

## 二、SPEC §4.2 文档 E2E 逐条（本会话独立执行，命令与真实输出）

| # | 点位 | 命令（仓库根 git bash） | 真实输出 | 判定 |
| --- | --- | --- | --- | --- |
| E1 | 陈旧句残留 | `grep -n "前端接入服务端属 UI 变更" README.md; grep -n "localStorage 仍是前端当前事实源" README.md` | 均无输出（exit=1，0 残留）；另 `grep -n "唯一事实源" README.md` 无输出（过度表述反例同样零出现），`localStorage` 全文恰 1 处即新双源句（:81-83） | PASS |
| E2 | DELETE 两端点 | `grep -n "DELETE /api/v1/workflows/:id" README.md && grep -n "DELETE /api/v1/runs/:id" README.md` | `:75`（括注「不存在 → 404」）、`:76-77`（括注「活动 run → 409，判据为进程内存注册表而非 DB status；删除时 runs 行与全部 run_events 行同一事务级联删除」）——四语义元素（404/409/内存注册表判据/事务级联）与实现逐条对上：`server.ts:172-175`（workflow 404）、`:178-180`（注释明文守卫用 runsById 非 DB status + 409）、`:181`（run 404）、`:182`（注释「runs 行 + 全部 run_events 行同一事务删除」）、`:201-202`（两路由仅注册 v1）、`store.ts:138-140/:245-247`（txDeleteRun 事务级联）——ADR-0007 §3.1/§3.2/§3.4 规格一致（404 非 204 幂等、无旧别名、无「幂等 204」反例措辞） | PASS |
| E3 | 前端能力句 ⊆ C1-C9 封闭清单 | 逐句拆解 `README.md:78-83` 对照 SPEC §3.2(c) + ADR-0006/0007 实施记录 | 10 个语义元素逐条有源（见 §三 AC3 表），无凭空条目、无超出项 | PASS |
| E4 | 禁句三条 | `grep -nE "eng\|引擎选择" README.md; grep -n "清空" README.md; grep -nE "sqlite\|browser" README.md` | 第一/二条无输出；第三条仅命中 `:70`「SQLite 持久化…better-sqlite3」——该行为 diff 上下文（先于本次存在的存储引擎记述，非 MCP 工具能力句，git diff 证未新增）；R1/R2/R3 禁句零出现 | PASS |
| E5 | 命令表同步 | `grep -n "smoke:server" README.md` | `:43` 一行，描述四要素（workflows CRUD / /run SSE 全事件链 / 删除守卫 409/200 / 自清理）与 `tests/smoke/smoke-server.mjs` 实际断言组逐项一致（W01-W07 CRUD·S01-S05 SSE 有序子序列·D01-D07 409→200→404·C01-C04 零残留；`package.json:19` 脚本存在） | PASS |
| E6 | ai-sdk 抽查（AC7） | 按 §3.5 样本 S1-S7 全查 7 条（PRD 下限 5） | 7/7「一致」，零不一致（明细见 §三 AC7 表） | PASS |
| E7 | 冒烟旁证（可选） | `npm run smoke:server` | `==== smoke:server：33 passed / 0 failed ====`（P2 前置/H1/W7/N3/S5/R3/D7/C4 全绿，含活动 run DELETE 409→approve→DELETE 200→GET 404 全链） | PASS（旁证） |

## 三、PRD 验收标准（Given/When/Then）逐条

- **AC1 · DELETE 端点记述 —— PASS**：E2 实测两行在位（README:75-77），四语义元素与
  `server.ts:201-202` + handler 区（:172-183）+ `store.ts` txDeleteRun（:138-140）及
  ADR-0007 §3.1/§3.2 逐条对照一致；格式沿用清单既有续行风格（行首空格 + `·` + 全角括注）。
- **AC2 · 陈旧表述已更正 —— PASS**：E1 检索两条旧短语均 0 残留；SPEC §3.2(b) 正例要素
  三缺一不可逐项核对：①「前端已接入服务端持久化（ADR-0006/0007，2026-10-21 批准实施）」
  （:78，与 ADR-0006:3 / ADR-0007:3 状态行日期一致）②「localStorage 仍是本地工作流与
  离线运行历史的存储」（:82-83）③「离线或后端未连接时回退 localStorage（本地写入路径
  不变）」（:81-82）——三要素俱在，且无「服务端已是唯一事实源」过度表述（检索零命中）。
- **AC3 · 前端能力记述可追溯 —— PASS**：README:78-83 全部能力句逐句拆解，落点均在
  SPEC §3.2(c) 封闭清单内并对应 ADR 实施记录：

  | README 语义元素 | 清单项 | 实施记录出处（本会话 Read 核实） |
  | --- | --- | --- |
  | 「服务端」分组 + 保存当前工作流到服务端（PUT upsert） | C1 | ADR-0006 §4.1 / §11.1（cloudSaveCurrent，成功写回 wfId） |
  | 打开（装载） | C2 | ADR-0006 §4.1 / §11.1（openServerWorkflow，仿 addTabFromSample） |
  | 覆盖保存 | C3 | ADR-0006 §4.1 / §11.1（cloudOverwrite） |
  | 删除（两按钮确认弹窗） | C4 | ADR-0007 §4.1/§4.3/§4.4 / §11（data-wf-del + confirmDialog，批复「确认①」） |
  | 任务历史在线服务端优先 | C5 | ADR-0006 §4.2 / §11.1（④数据源切换，拉取失败/离线回退本地） |
  | 卡片点击展开只读事件回放（.logline 行 × 事件序号） | C6 | ADR-0006 §4.2/§4.3 / §11.1（replayLines/toggleRunReplay，#00 起、delta/progress 不渲染） |
  | 单卡删除（运行中 409 转译提示） | C7 | ADR-0007 §4.2/§4.4 / §11（data-run-del + deleteRunCard） |
  | 离线/后端未连接回退本地（本地写入路径不变） | C8（合并于双源句） | ADR-0006 §4.5 / §11.3-e（「后端未连接」态、本地写入路径零改动） |
  | C9（不提供批量清空）按 SPEC 裁定省略，全文无「清空」新增字样 | — | ADR-0007 §3.3（C1 批复：服务端模式不渲染清空按钮） |

- **AC4 · 不虚构能力 —— PASS**：E4 三条禁句检索零肯定性表述（唯一 sqlite 命中为先于
  本次存在的 :70 存储引擎行，非 MCP 工具能力句）；README:58 既有「未实现者如实告知模型」
  保留未扩写（diff 证未触碰）。
- **AC5 · 命令表同步 —— PASS**：E5 实测 :43 行在位且四要素与 smoke 脚本断言组一致；
  另有 E7 实跑 33/33 全绿佐证描述真实性（「自清理」由 C01-C04 零残留断言背书）。
- **AC6 · 渲染零影响 —— PASS（引用 + 独立佐证）**：`npm run gate`（4 场景 diffPx=0）与
  `npm test`（8 项）由工作流脚本运行且通过（VERIFY 指令明示，本会话未复跑全套，如实归属
  见 §一）。独立佐证：`git status --porcelain` 产品面闭包 = 仅 `README.md`（+12/-3），
  `apps/**`、`packages/**`、`tools/**`、`tests/**` 零改动——自 HEAD b081d55（迭代 0003
  归档态，gate 全绿）以来无任何渲染路径文件变更，文档变更不触及宪法第 1 条三层。
- **AC7 · ai-sdk 抽查闭环（只读） —— PASS**：按 SPEC §3.5 全查 7 条（≥5 下限），逐条
  「一致」，零隐瞒：

  | # | 样本 | 文档侧 | 实装侧（llm.ts，本会话 Read） | 结论 |
  | --- | --- | --- | --- | --- |
  | S1 | streamText 流式 | §4「streamText（textStream 逐 token 推送画布打字机）+ onError + abortSignal」 | :86-90（model/system/prompt/temperature/maxOutputTokens/abortSignal/onError）+ :91-95（for await textStream） | 一致 |
  | S2 | generateText 工具循环 | §4「messages + tools + response.messages 续接，3 轮上限」 | :63（round<=3）、:64（messages/tools）、:69（messages.concat(res.response.messages)） | 一致 |
  | S3 | system 独立参数 | §5.1 | :61-62（注释）+ :64/:78/:87（system: sys \|\| undefined；:62 messages 仅 user 起） | 一致 |
  | S4 | execute 工具结果自动进 response.messages | §3.3 + §5.2 | :68（注释）+ :69（仅 concat，无手工追加 tool 消息） | 一致 |
  | S5 | 工具命名 ^\w+$ 清洗 | §5.3 | :51（name.replace(/[^\w]/g,'_')） | 一致 |
  | S6 | usage promise + totalTokens/outputTokens | §5.4 | :65/:79（res.usage?.totalTokens \|\| outputTokens）、:98（await result.usage） | 一致 |
  | S7 | tool（zod inputSchema + execute） | §4 | :53（tool({ description, inputSchema: z.object(shape), execute })） | 一致 |

  零不一致 → 无需新 BACKLOG 项建议；该文档本迭代零改动（git status 为证，符合 REQ-0006-05 只读约束）。

## 四、交互回归抽查（本会话实测）

**① E7 后端全链（`npm run smoke:server`，33/33）**：W 组 CRUD 往返（W01-W07，含 DELETE 200/
404/再删 404）、S 组 SSE 有序子序列 run:accepted→run:start→node:start→node:done→run:done（S01-S05）、
D 组删除守卫（D01 approval 挂起 → D02 活动 run DELETE **409** {error:'run is active'} → D03 approve →
D06 收尾后 DELETE **200** → D07 GET **404**）、C 组自清理零残留（C03 复查列表不含自建 id）——
README:43/:75-77 本次新增记述的后端语义全部实跑实证。

**② 浏览器在线态实操**（`node apps/server/dist/server.js` → http://localhost:3000，health
`{"ok":true,"engine":"agentflow-server","provider":{"configured":true,"endpoint":"DeepSeek"}}`；
日志面板状态行「⚡ 执行后端已连接 · Vercel AI SDK 7 · Node v24.21.0」确认在线态）：

- **「工作流」面板 →「服务端」分组（C1-C4 入口）—— PASS**：DOM 快照实证「服务端」分组标题 +
  「保存当前工作流到服务端」按钮 + 6 张服务端卡片（每张含「更新于 … · 点击打开」元信息行 +
  「覆盖保存」按钮 + 「删除」按钮）。
- **删除确认弹窗（两按钮）—— PASS**：点 `data-wf-del` 后 `#confirm-modal` 实测
  `{showing:true, okText:"删除", cancelText:"取消", text:"将从服务端删除工作流「智能客服助手」。
  此操作不可恢复；对应标签页的本地内容不受影响。"}`（ADR-0007 §4.3 批复「确认①」形态）；
  点「取消」后 `{stillShowing:false}` 且列表未变（取消路径零删除）。
- **「任务历史」面板（C5/C7/C1 批复）—— PASS**：在线服务端优先（18 张卡片，started_at 倒序，
  含 status 映射「进行中」后缀）；每卡行尾「删除此运行记录（不可恢复，需确认）」按钮；
  **服务端数据源下无「清空历史」按钮**（面板内零批量清空入口，与 ADR-0007 §3.3 C1 批复一致；
  快照中唯一「清空」为底部日志面板既有按钮，语义无关）。
- **事件回放时间线（C6）—— PASS**：点击首卡（run 208b0095…）展开实测 `{lineCount:22,
  first:"#00 run 已受理 · #208b0095", last:"#29 ● 运行完成 · 7/8 · 82.599s",
  deltaOrProgressRendered:false}`——`.logline` 行 × 事件序号 `#00` 起、`node:delta`/
  `run:progress` 不渲染，与 ADR-0006 §4.3 映射逐条吻合。
- 其余交互面（rail 面板切换、撤销/重做按钮、缩放控件、底部日志开合）DOM 在位、页面无报错；
  本迭代产品面零代码改动，像素/DOM 权威由脚本侧 gate（4 场景 diffPx=0）把关。

## 五、改动面闭包与护栏核对（git 实测）

- SPEC §1.1 产品面闭包成立：`git diff --stat` = `README.md | 15 ++++++++++++---`（+12/-3，净 +9 行，
  111→120）；四落点与 JOURNAL 一致（:43 命令表 / :68 节标题 / :74-77 端点清单 / :78-83 双源句）。
- `git status --porcelain`：`M README.md` + `M docs/evolution/STATE.md`（机制面）+
  `?? docs/evolution/iterations/0004/`——别无其他。
- SPEC §1.3 零改动清单逐项核对（git status 为证）：`apps/**`、`packages/**`、`tools/**`、
  `tests/**`、`AGENTS.md`、`docs/adr/**`、`docs/ai-sdk-7-功能汇总.md`、`CONSTITUTION.md`、
  CI 配置、golden 基线均未动；README 其余章节（视觉规格表/执行引擎表/布局还原表/Docker 段）
  均在 diff 之外。
- `npm run gate:update` 未运行（护栏 2）；无任何 golden 触碰。

## 六、观察记录（不构成缺陷）

1. **VERIFY 工具性观察**：浏览器自动化对 rail 按钮（`[data-stab="workflows"]`，accessible
   name「工作流」×2 含侧栏内同名元素）的 Playwright actionability 点击超时——与迭代 0003
   REPORT §六1 同型现象（自绘 UI + transform 容器的适配问题），改用页面内 DOM click 触发
   成功且面板真实切换。非产品缺陷，不立案 BUG。
2. 历史面板存在一张「10/21 16:18:40 · 进行中」卡片（进程崩溃重启后的僵尸 running 行，恰为
   ADR-0007 §3.2 以 runsById 而非 DB status 判活的设计动机实例），其删除按钮正常渲染——
   与 README:76「判据为进程内存注册表而非 DB status」记述互证，如实记录不立案。

## 七、结论与移交

- **verdict：PASS**，无 BUG 清单；修复轮次未消耗（repair_round 维持 0）。
- 移交 CLOSE：可按 WORKFLOW §4 归档（BACKLOG BK-0006 → done、metrics 追加一行、iteration+1、
  phase=idle）；ROADMAP T4-M2 两验收点（README 补记 + ai-sdk 文档抽查）均以本报告证据关账。
  产品提交口径按 SPEC §4.3（仅 `git add README.md`）。
