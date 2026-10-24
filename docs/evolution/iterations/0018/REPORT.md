# REPORT · 迭代 0018 · BK-0031 先行：NDP 迁移前等价基线快照 + 实施轮 SPEC + issue 草案 · VERIFY

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-24 18:09。
> 输入：`PRD.md`（AC1~AC7 / REQ-0031-01~05，S 项 skipSpec 内嵌验收口径）+
> `JOURNAL.md`（BUILD 自检）。
> 门禁分工：build / gate / test 由脚本统一执行且通过（派发指令载明；PRD AC7
> 明文按 0012/0014/0016/0017 先例采信，VERIFY 不复跑全套）；`npm test`（AC2
> 点名命令，本阶段为取一手证据亲跑一次）、`npm run smoke:server`（AC7 第四
> 命令，脚本门禁不含）及 AC1 再生产比对 / AC4 / AC5 / AC6 机器核对 / 交互
> 回归抽查由本阶段亲自执行。

## 总结论

**PASS —— 零 BUG，1 个观察项（OBS-001：smoke V09 在 VERIFY 窗口期的时点性
假红，实验证明唯一变量为本迭代快照「在场且尚未提交」，产品提交落地后自愈，
非产品缺陷，不阻塞）。**

三件先行产物全数验收通过：快照 `packages/shared/test/nodes.baseline.json`
再生产**逐字节相等**（cmp 输出空 + sha256 双文件一致 `08ba1229…f275`，字节
规范 11521/无 BOM/零 CR/末尾单换行，16 键且键序与 `nodes.ts` 源码声明序
**直接对照**一致，无 `"if"` 键）；SPEC 342 行七要素齐备、两批 8+8 拆分表
机器核对无遗漏无重复；issue 草案五要素自包含。工作区全量改动恰白名单四
路径 + 机制文件，禁止路径（apps/packages/tools/tests/.github/两 json/宪法/
AGENTS/README）diff **0 行**（package-lock.json 零变化 = 零依赖机器证明）。
指针抽样 **20+ 条全部命中**。`npm test` 亲跑 **8/8**；`smoke:server` 亲跑
83/1→（快照暂移复跑）**84/0**→还原零漂移；浏览器画布 8 节点/15 端口/15
widget、平移缩放生效、**pageerror=0**。BK-0021/BK-0023 状态均仍 proposed，
POLICY 合规形态（草案 ≠ 开 issue ≠ 获批）三重保险在案。

## 验收矩阵（逐 AC）

| AC | 判定 | 证据（本阶段亲跑/亲读） |
| --- | --- | --- |
| AC1 快照正确性与可再生产 | **PASS** | Given：`npm run build:shared`（tsc，exit 0）。When：按 REQ-0031-01 固化命令重新生成到临时文件 → `cmp` 输出空 **CMP-IDENTICAL**；`sha256sum` 双文件一致 `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275`（与 SPEC 头部/JOURNAL 记载一致）。字节规范探针（node 亲跑）：总长 **11521**（= JSON 体 11520 + 1）；**无 BOM**（头三字节非 EF BB BF）；**CR 计数 0**（全 LF）；**末尾恰 1 个换行**（倒数第二字节非 0x0A）；`JSON.parse` 后 **16 键**；键序 `trigger,userinput,llm,prompt,retrieval,websearch,http,code,notify,condition,loop,delay,merge,reply,setvar,approval`——与 `nodes.ts` 源码声明序**直接对照**逐键一致（`grep -nE "^  [a-z]+: \{" nodes.ts` 亲提，声明行 :10~:101）；全文无 `"if"` 键（`JSON.stringify` 丢弃函数值，与 PRD 背景 2 语义一致）；re-stringify 等于原文件字节 |
| AC2 测试链零扰动 | **PASS** | `npm test`（根 test 链：build:shared → build:server → `node --test`）亲跑 → **tests 8 / pass 8 / fail 0**（含「DEFS 默认值 33/33 全量断言」等既有 8 项）——快照文件在场（BUILD 已落盘）而测试链全绿，`.json` 不被 `node --test` 拾取的 PRD 背证在真实链上复核成立 |
| AC3 SPEC 要素齐备 | **PASS** | `wc -l` = **342** ≤ 400（非功能 5）；文档头草案标注在位（`:3`「SPEC · 待 needs-approval issue 获批后进入实施（BK-0021），批准前零实现」亲读）。七要素逐一在案（全文亲读）：(a) §3.1~§3.4 四步各含文件面/红→绿次序/验证命令；(b) §5 九条机器可执行化——**验收 1 执行形态有明确推荐**（§5.1 常驻契约测试 + 三条理由 + Buffer 字节级比较代码形态）、验收 2 `if` 探针六行真值表（§5.2，2 参数 × 3 入参 = PRD「三组入参」）、验收 6 在线态 E2E 五点位（§5.6）；(c) §4 两批拆分表——机器核对（node 集合运算）：批次 1（delay/trigger/llm/userinput/code/retrieval/condition/http）+ 批次 2（prompt/websearch/notify/loop/merge/reply/setvar/approval）= **8+8、重复 0、并集与 16 DEFS 键集合相等**；(d) §6 守卫测试设计（静态提取法 + 行归属 + 精确僵尸清单 `[trigger:mode,cron,path]/[userinput:vtype,req]`，不硬编码行数）；(e) §7 证明力边界五条如实（`if` 除外/派生层除外/运行期突变/结构≠语义/资产≠防护）；(f) §8 回滚（revert 唯一手段，快照与 .gitattributes 留库无害）；(g) §9 行数预算表 + 400 行拆分预判（`nodes/index.ts` 预案不启用） |
| AC4 issue 草案 + 状态不变式 | **PASS** | 附录 A（`:292-342` 亲读）：标题含「BK-0021 NDP 节点定义目录制迁移」与「请批」关键词；正文五要素齐备自包含——① 请批面（DEFS 重组射程 + `POLICY.md:23` 条款引用）② 等价证据方案（快照逐字节 + gate diffPx=0 + 在线 E2E，NDP §10 验收 9 逐条）③ BK-0023 随批增量段（events.ts:32 一行语义注释 + 消费端证据 + CLOSE 随批关账口径）④ 两批 8+8 预告 ⑤ 证据链接五项；结尾批准/驳回语义双分支（:339-341）。状态不变式（`git diff docs/evolution/BACKLOG.md` 亲看）：**BK-0021 与 BK-0023 状态列均仍 `proposed`**；BACKLOG 增量恰一处 = BK-0021 行备注单元格追加（含三件产物路径 + sha256 指纹 + 「转 ready 唯一条件 = issue 获用户批复，批准前零实现」），BK-0018~0020/0022~0024 各行逐字零改动 |
| AC5 白名单与零实现机器证明 | **PASS**（提交前态等价核对，见「时点说明」） | `git status --porcelain=v1 -uall` 全量恰 **7 条**：白名单四路径（`M docs/evolution/BACKLOG.md` + `?? packages/shared/test/nodes.baseline.json` + `?? .gitattributes` + `?? docs/node-definition-protocol-migration-spec.md`）+ 机制文件三件（`M STATE.md`、`?? iterations/0018/{PRD,JOURNAL}.md`）；`git diff --cached --stat` = 0（无 staged）；**禁止路径 diff 0 行**：`git diff -- apps packages tools tests .github package.json package-lock.json CONSTITUTION.md AGENTS.md README.md \| wc -l` → **0**；untracked 清单中亦无任何禁止路径。`.gitattributes` 内容恰一行（Read 亲证）且 `git check-attr`：快照 `text: set / eol: lf` 生效、README/package.json/CONSTITUTION 均 `unspecified`（存量检出形态零牵动）。package-lock.json 零变化 = **零依赖引入机器证明**；`packages/shared/src/**` 零字节改动 = 零源码机器证明 |
| AC6 指针可核查 | **PASS**（抽样 20+ 条 ≥ 下限 5，全部命中，零失效） | 逐条亲开亲比：`POLICY.md:23`（shared DEFS 需批准条款原文）；`events.ts:32`（`ok: z.boolean()` 无注释——issue ③ 主张成立）；`server-sync.js:105-107`（`(ev.ok !== false && !ev.stopped)` 消费端语义）；`nodes.ts:9`（NODES 导出）/`:14-15`（cron/path 两 `if` 函数——探针真值表语义源）/`:41`（retrieval 三固定名 demo kb）/`:110-119`（NODE_NAMES + paramDefaultsOf 派生层）；`nodes.ts` 全文 119 行、16 键声明序 :10~:101（AC1 直接对照）；`contract.test.mjs:12-19`（name/icon 仅 `assert.ok` truthy，无 desc/kw/caps/min·max·step/端口内容断言——「零断言区」主张成立）与 `:66-68`（读 app.js 源先例）；`engine.ts:23-24`（DEFS_META = NODE_NAMES）/`:74`（`src.ports[e.fp]` 端口索引寻址——不变式 C 依据）/`:128`（condition + p.expr cond 事件）；`store.ts:149`（`db.exec(DDL)` 持久化层起点）；`app.js:103`（MCP_SERVERS）/`:334`（caps chip 按数组序渲染）/`:763`（`filter(p=>!p.if\|\|p.if(ps))` widgets——`if` 唯一消费点）/`:1866`（`const RUN_META = {`）/`:2055`（`DEFS.llm.params[0].o = prov.models.map(…)` 运行期覆写，现行行号与 SPEC §5.8 漂移标注一致）；`handlers.ts:22-23`（trigger 签名 + 「手动触发 · run #」硬编码）；`docs/node-definition-protocol.md:597-620`（§10 验收九条全文）+ `:599`（验收 1 全量结构快照逐字节比对）；`BACKLOG.md` BK-0023 行（随批关账口径） |
| AC7 回归面 | **PASS**（口径：脚本门禁采信 + 本阶段补跑，见 OBS-001） | build / gate（8 场景）/ test：脚本统一执行且通过（派发指令载明；PRD AC7 明文按 0012/0014/0016/0017 先例引用门禁结论，不复跑全套）——本迭代零源码/零 UI 改动，纯回归面。**`npm test` 本阶段另亲跑一次**：8/8 全绿（同时作为 AC2 一手证据）。**`npm run smoke:server` 本阶段亲跑**：83 passed / 1 failed——唯一 FAIL 为 V09 的 git 卫生检查时点性假红（OBS-001，事件校验 51/51 全过）；快照暂移复跑 **84 passed / 0 failed**、还原后 sha256 不变零残留 |

### AC5 时点说明（机制性，沿 0017 REPORT 同款先例）

VERIFY 时产品提交尚未生成——工作流脚本在 VERIFY 判定后才创建产品提交
（`.zcode/workflows/evolution-iteration.dwf.ts:390-405`，0017 REPORT AC4 已
证），且 productPaths 过滤器排除 `docs/evolution/` → 产品提交将恰含白名单
四路径。故本阶段以「提交前全量改动核对」作 AC5 等价机器证明（上方矩阵）。
产品提交落地后 CLOSE 可用 `git show --numstat` 终验（预期恰 4 路径：
快照 + `.gitattributes` + SPEC + BACKLOG）。

## 交互回归抽查（本阶段亲跑，0017 同款）

1. **起服 + API**：`node apps/server/dist/server.js`（后台）→ `curl
   /api/v1/health` 返回 `{"ok":true,"engine":"agentflow-server","node":
   "v24.21.0",…}`（provider：DeepSeek 已配置）。验后 `taskkill //PID //F`
   终止（输出「成功: 已终止 PID 为 37756 的进程」）。
2. **浏览器画布**（Playwright Chromium 实开 http://localhost:3000）：
   `#viewport` 存在、`.node`×8、`.port`×15、`.wdg`×15——与 0017 REPORT
   记载的画布基线一致；**pageerror=0**（资产+文档轮对运行时零影响得证）。
3. **交互抽查**：空白画布拖拽 → 视图平移生效（viewport background-position
   `-75.25px 161.925px` → `24.75px 211.925px`）；滚轮 → 画布缩放生效
   （background-size `14.3px` → `15.8873px`）。探针脚本存系统临时目录，
   验后已删除，仓库零残留。

## 观察项（不阻塞）

- **OBS-001（Minor，时点性非缺陷）**：`smoke:server` 的 V09 断言（
  `smoke-server.mjs:833-847`）=「V01-V04/V06 事件逐条 RunEventSchema 校验 +
  `git status --porcelain -- packages/shared` 为空」双成分。VERIFY 窗口期
  亲跑结果 83/1：FAIL V09 的 `actual: 51/51；shared=?? packages/shared/test/
  nodes.baseline.json`——**事件校验 51/51 全过**，红的唯一成分是 git 卫生
  检查发现本迭代交付物快照（在场且尚未提交；产品提交时点在 VERIFY 判定后，
  见 AC5 时点说明）。对照实验（本阶段执行）：临时移走快照 → `git status
  --porcelain -- packages/shared` 输出为空 → 复跑 smoke **84/0**；移回后
  sha256 `08ba1229…f275` 不变（零字节漂移、零残留）。结论：唯一失败变量
  =「快照在场且未提交」，产品提交落地后 porcelain 复空、V09 自愈；CI
  （ui-constitution 跑 gate / contracts 跑 test）不含 smoke，不受影响。
  PRD REQ-0031-01 选址 `packages/shared/test/`（NDP §10 验收 1 前置资产的
  定死位置）时未预见该窗口期交互，属 PRD 层面预见缺口而非产品缺陷，且不
  可能在不违 AC5 白名单的前提下「修复」（改 smoke 断言 = tests/ 白名单外
  改动；挪快照 = 违 REQ-0031-01）。处置：不列 BUG；建议脚本在产品提交
  落地后（归档前）复跑一次 smoke 确认 84/0 自愈；后续迭代若在 VERIFY
  窗口跑 smoke 遇 V09 单红且 shared 下仅未提交的迭代交付物，同口径判时点
  性假红。

## 本阶段执行的检查（命令 + 结果摘要）

1. `npm run build:shared` → tsc exit 0（AC1 Given）。
2. `node -e "import('./packages/shared/dist/index.js')…"` > 临时文件 →
   `cmp` → **CMP-IDENTICAL**；`sha256sum` 双文件 `08ba1229…f275`。
3. node 字节/结构探针：11521 字节 / 无 BOM / CR=0 / 末尾单换行 / 16 键 /
   键序一致 / 无 `"if"` / re-stringify 等值（AC1）。
4. `grep -nE "^  [a-z]+: \{" packages/shared/src/nodes.ts` → 16 声明键序
   直接对照（AC1/AC6）。
5. `npm test` → **tests 8 / pass 8 / fail 0**（AC2，亲跑）。
6. `npm run smoke:server` ×2：快照在场 83/1（唯一 FAIL V09，事件 51/51 过）；
   快照暂移 **84/0**；还原 sha256 复核不变（AC7 + OBS-001 对照实验）。
7. `git status --porcelain=v1 -uall`（恰 7 条）+ `git diff --cached --stat`
   （0）+ `git diff -- <禁止路径>` （**0 行**）（AC5）。
8. `git diff docs/evolution/BACKLOG.md` → 恰 BK-0021 行备注追加（AC4/AC5）。
9. `git check-attr text eol --` 快照/README/package.json/CONSTITUTION →
   eol=lf 仅及快照（AC5/REQ-0031-02）。
10. `wc -l` SPEC=342；node 集合核对拆分表 8+8 无重无漏（AC3）。
11. 指针抽样 20+ 条（sed/Read 逐条打开比对，清单见 AC6 行）。
12. 起服 + `curl /api/v1/health` + Playwright 画布/交互探针（临时目录脚本，
    验后删除）+ `taskkill` 关服。

## 结论

迭代 0018（BK-0031，零 shared 源码改动的资产+文档先行轮）按 PRD AC1~AC7
与内嵌验收口径**全数通过**：快照可再生产且逐字节确定，SPEC 七要素齐备，
issue 草案自包含可用，白名单与零依赖有机器证明，指针零失效，回归面全绿
（脚本门禁 build/gate/test + 亲跑 test 8/8 + smoke 84/0（时点性 V09 假红
经对照实验排除）+ 浏览器画布 pageerror=0）。**建议 CLOSE**：BK-0031 置
done；脚本持 SPEC 附录 A 字面量开 needs-approval issue；BK-0021/BK-0023
维持 proposed 等待用户批复。无修复轮需求（repair_round 保持 0）。
