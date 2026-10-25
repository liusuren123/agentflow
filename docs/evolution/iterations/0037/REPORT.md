# REPORT · 迭代 0037 · BK-0050 节点库「智能体」类目（VERIFY 轮）

> 产出角色：test-manager（VERIFY 阶段）· 2026-10-26 01:10~01:40（工作树
> `.zcode/worktree/feat/0037-iter`，分支 `feat/0037-iter`）。
> 输入：PRD REQ-0050-01~04 验收标准 + SPEC §2 勘误终稿/§3 清单/§6.2 红模式表/§8 验收口径。
> 前置声明：build/gate/test 全量由脚本在工作树内运行且通过（派发指令明示，本轮不重复
> 全套）；本轮亲自执行的针对性验证为 smoke 两轮、生成器直跑、E2E 五点位、
> 全部代码 diff 与 golden 变更集核对——逐项证据如下。

## 一、总结论

**PASS**（无 BUG）。PRD 四条 Given/When/Then 全部通过；SPEC §8 验收口径 1~6 逐项
落实（7 归 CLOSE）；交互回归抽查（节点库/搜索/画布节点类目色）零回退。
smoke 出现的 1 个 FAIL 为 PRD REQ-0050-04 ④ 明文预告的 V09 时点性假红
（详见 §五·R4），穿透后 118/118 全绿。

## 二、代码改动核对（SPEC §3 十行清单 vs 工作区 diff，本轮 `git diff` 逐文件亲核）

| # | 文件 | 实测 diff | 判定 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/nodes.schema.ts:15` | CATEGORIES 数组 `'chat',` 后插 `'agent',` | ✓ 逐字命中 |
| 2 | `packages/shared/src/types.ts:23` | NodeCategory `'chat'` 后插 `\| 'agent'` | ✓（SPEC 勘误 1） |
| 3 | `packages/shared/src/nodes/agent/node.ts:10` | `category: 'chat'`→`'agent'` 恰一词 | ✓ 唯一非纯插入点 |
| 4 | `packages/shared/test/contract.test.mjs:14` | cat 白名单 `'chat',` 后插 `'agent',` | ✓（SPEC 勘误 2） |
| 5 | `packages/shared/test/nodes.baseline.json` | `git diff -U0` **恰 1 hunk/1 行**：`@@ -155 @@` agent 块 `"cat":"chat"`→`"cat":"agent"`；其余 18 键逐字节不变 | ✓ REQ-0050-01 ②③ 双证（快照仅 cat 变 = agent 其余 DEFS 字段零变化的机器证明） |
| 6 | `apps/web/src/legacy/app.js` | CATS chat 行后插 `agent:{name:'智能体',c:'var(--cat-agent)'}` + catColor 映射 chat 后插 `agent:'--cat-agent'`，两处纯插入 | ✓ |
| 7 | `apps/web/src/app.css:19` | `--cat-chat:#a06bff;` 后插 ` --cat-agent:#14b8a6;`，纯插入 | ✓ |
| 8 | `docs/node-definition-protocol.md:121` | 类目枚举串 chat 后插 agent | ✓ |
| 9 | `tests/golden/ui/s3/s8/s9` | png 3 份实质变化（见 §四） | ✓ |
| 10 | `tests/golden/ui/` 其余 9 场景 | 仅 invariants.json 各 +1 行，png 零变化（git status 不出现 9 份 png） | ✓（SPEC 勘误 5 精确兑现） |

**零接触面机器证明（本轮实跑）**：`git diff -- apps/server
packages/shared/src/events.ts packages/shared/src/nodes.ts
apps/web/src/Skeleton.tsx tools/pixel-gate/gate.mjs tests/smoke` 输出 **0 行**
（SPEC §8.7 前半）。§8.7 后半（`git show --numstat` 产品提交核对）归 CLOSE——
产品提交尚未发生，工作区改动集亲核恰为上表 + 机制件，无清单外文件。

## 三、E2E 五点位（PRD REQ-0050-02 ①~⑤；本轮亲测 7/7 PASS）

方式：`node verify-e2e-0037.mjs`（临时脚本，跑完即删）——静态服务与
`tools/pixel-gate/gate.mjs` 同款（node:http + readFileSync，端口 3101），浏览器
Playwright Chromium 1600×900，seed 机制同 gate s8（localStorage
`agentflow.v2`）。输出摘要：

```
分组实测: input(2):[trigger,userinput] | chat(2):[llm,prompt] | agent(1):[agent]
        | knowledge(2):[retrieval,websearch] | tools(3):[http,code,notify]
        | logic(4):[condition,loop,delay,merge] | output(4):[reply,termview,setvar,webshow]
        | human(1):[approval]
PASS ① 智能体分组存在、恰含通用智能体一条、cnt=1 | {"cat":"agent","title":"智能体 1▼","cnt":"1","items":["agent"]}
PASS ② 对话组回到 agent 入列前形态（llm+prompt 两行，不含通用智能体）
PASS ⑤ 既有七分组计数零变化 + 八分组渲染序正确 + 总数 19（order=true cnt=true total=19）
PASS ④ 节点库搜索「智能体」命中通用智能体 | ["agent"]
PASS ③ :root --cat-agent 计算值 = #14b8a6 | 实测=#14b8a6
PASS ③ 画布 agent 节点 --nc = #14b8a6（catColor 正常解析，非 #666 回退） | 实测=#14b8a6
PASS ③ 对照：trigger 节点 --nc = #4f8cff（既有类目色链路不受扰） | 实测=#4f8cff
==== E2E-0037: 7/7 PASS ====
```

- ⑤ 的对照基线 = SPEC §0 亲读的 DEFS cat 分布（input×2/knowledge×2/tools×3/
  logic×4/output×4/human×1）+ baseline 恰 1 行 diff（§二#5）证明本轮仅 agent
  归属变化 → 既有七组零变化成立；分组渲染序 = `Object.entries(CATS)` 键序
  （app.js:323），chat 后插 agent 与 SPEC §4.1 定稿一致。
- ③ 按 JOURNAL §6.2 问题②修正后的 DevTools 计算值口径验收（`--nc` 全仓零
  消费、标题栏像素不取类目色属冻结 UI 既有行为）——agent 节点 `--nc` 实值
  #14b8a6、:root 变量 #14b8a6、既有类目 trigger 对照 #4f8cff 三点齐证，无
  #666 静默回退。

## 四、golden 重录核验（PRD REQ-0050-03 / SPEC §6）

- **变更集（本轮 `git diff --stat -- tests/golden/` 亲跑）**：恰 15 files =
  12 份 invariants.json 各 +1 行（`+ "--cat-agent": "#14b8a6",`，s0/s8 抽查
  diff 内容一致）+ 3 份 png（s3-library 121140→119528B / s8-agent-node
  52171→52167B / s9-goal-panel-online 73649→73549B 实质变化）+ **9 份 png 零
  变化不出现**——与 SPEC §6.3-3 预测逐格吻合。
- **重录前红模式**：JOURNAL §6.1 mtime 序列记录 00:54:49~00:55:11 gate 实跑
  仅 s3/s8/s9 落 `.diff.png`（diffPx>0 恰三场景）、12 场景全 invDiff——与
  SPEC §6.2 表逐格吻合（勘误 4：s9 必波及；勘误 5：9 场景不变量波及属预期）。
- **前后对比证据**：`iterations/0037/gate-diff-pre-update/` 27 文件在位
  （本轮 `ls | wc -l` = 27：12 current.png + 12 invariants + 3 diff.png）。
- **gate:update 恰一次**：JOURNAL §6.1（00:55:17~00:55:40 单次窗口）；
  **重录后全绿**：`tests/golden/diff/` 目录现为空（本轮 `ls | wc -l` = 0；
  gate.mjs:351-353 全绿自动清空，非全绿必有残留）+ JOURNAL §6.2 五场景
  `cmp` current vs golden 全 IDENTICAL + 脚本门禁轮 gate 通过（派发指令
  明示）。本轮按派发指令未复跑全量 gate。

## 五、逐条验收结论（PRD Given/When/Then 映射）

| REQ | 结论 | 关键证据（本轮亲跑，除注明外） |
| --- | --- | --- |
| REQ-0050-01 shared DEFS | **PASS** | §二 #1~#5 diff 逐字/逐行；`npm test` 全绿（脚本已跑，派发明示；JOURNAL 定向自测 30/30、契约 19 键计数在案） |
| REQ-0050-02 前端类目地图+色 | **PASS** | §二 #6/#7 diff + §三 E2E 7/7 |
| REQ-0050-03 golden 重录 | **PASS** | §四三项（变更集/红模式/恰一次+全绿） |
| REQ-0050-04 回归面 | **PASS**（④含预告假红豁免） | R1 build：脚本已跑 exit 0 + 三 dist 产物亲核在位；R2 gate 12 场景：脚本已跑 + diff/ 空佐证；R3 test：脚本已跑；R4 smoke：见下；R5 生成器：本轮直跑 `node tools/gen-node-readmes.mjs` exit 0（输出 20 份写入），`git diff --stat -- packages/shared/src/nodes/` 仅既有 agent/node.ts 一行——**agent README 零变化（幂等实证）**；R6 E2E：§三 |

**R4 smoke:server 详情（本轮两轮实跑）**：

- 首轮（工作树原态）：`==== smoke:server：89 passed / 1 failed ====`，唯一
  FAIL 为 **V09**：`actual: 51/51；shared=M packages/shared/src/nodes.schema.ts`
  ——事件 RunEventSchema 校验 51/51 全过，红点仅在「packages/shared 工作区
  干净」守护：本轮**正当**修改 nodes.schema.ts 等且产品提交未发生，属
  PRD REQ-0050-04 ④ 明文预告的「V09 时点性假红先例形态（产品提交后自愈）」。
  附带发现：smoke fail-fast 机制使 V09 假红**阻断了其后 A/T/O 组 28 个断言**
  （118−90=28），首轮日志 99 行「（fail-fast：断言 V09 失败，停止后续断言，
  进入清理）」在案。
- 复跑（穿透假红取 A 组真实结果）：`git stash push -- packages/shared` →
  复跑 smoke → `git stash pop`（被测物不变：smoke 不自建（P01/P02 断言 dist
  在位为证）、shared 运行时入口 `dist/index.js` 亲核，stash 仅动源码）→
  **`==== smoke:server：118 passed / 0 failed ====`，exit 0**：A01-A05
  （agent 会话绑定/工具循环/预算/中止/契约零新增）全 PASS **零回退**，
  T01-T03/O01-O05 同绿。pop 后 `git status` 完整恢复（shared 5 个 M 文件
  俱在，stash list 空）。
- 判定：非产品缺陷；产品提交后（MERGE 主干复测）V09 自愈，smoke 应直接
  118/118——留待 MERGE 阶段复核。

## 六、交互回归抽查（test-manager 职责清单中与本轮改动面相交项）

节点库与收藏（分组/计数/搜索/条目左条色）、画布节点类目色消费链
（catColor→--nc，trigger 对照组不回归）——§三覆盖；其余交互面（拖拽/缩放/
连线/审批等）本轮改动零接触（§二零接触面 0 行 diff）且 gate 12 场景全绿
（脚本门禁轮，含全部既有交互场景的像素与 DOM 不变量）背书。

## 七、观察与注记（非缺陷，供后续轮次参考）

1. **OBS-001（流程）**：V09 的 DEFS 零漂移守护在「迭代内未提交态」必假红，
   且 fail-fast 会连带阻断后续断言组——凡改 `packages/shared/**` 的迭代，
   MERGE 主干复测前的工作树内 smoke 都会呈现此形态（本迭代 PRD 已预告；
   VERIFY 以 stash 复跑穿透，被测 dist 不变）。
2. **OBS-002（环境）**：工作树路径位于 `.zcode/`（dot 目录），express
   `res.sendFile` 默认 `dotfiles:'ignore'` 导致 `GET /` 静态 404（health 正常）。
   属工作树环境特有现象，非 server 产品缺陷（主干路径无 dot 段）；gate.mjs
   的 node:http 自 serve 先例不受影响。本轮 E2E 按 gate 同款方式完成。
3. **OBS-003（环境）**：本机 3000 端口被外部 node 进程（PID 26324）占用，
   与本迭代无关；E2E 已改用独立端口完成验证，未触碰该进程。

## 八、BUG 清单

无。

## 九、遗留

- SPEC §8.7 后半（`git show --numstat` 产品提交 = §3 十行清单）与 smoke
  V09 自愈复核：归 MERGE/CLOSE（产品提交发生后）。
