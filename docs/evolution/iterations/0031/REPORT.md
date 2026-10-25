# REPORT · 迭代 0031 · BK-0033 通用智能体节点落地（修宪轮）

> 产出角色：协调者手动 VERIFY（2026-10-25，用户指示工作流停止后手动接管；测试经理
> 未派发，本报告全部证据为协调者亲跑命令输出，逐条可复现）。

## 一、验收结论

**PASS（AC1~AC5、AC7 全过；AC6 离线三点位由 gate s8 场景承载、④真模型点位未跑如实标注）。**

## 二、逐条证据

### AC1 · 契约全绿 ✅

`npm test`（根链）**30 pass / 0 fail**——含 nodes-dirs `D.size===17`、defs-drift
36/36（agent 三参数）、synthesis（EXPECTED_ORDER agent 键序 + caps 深等 + 快照
17 键 Buffer 级比对）、contract 17 种、param-handler-guard 36+0 僵尸增量、
readme-consistency 18 份、handlers-coverage `HANDLERS ⊇ NODES`。
`nodes.baseline.json` 亲数 17 键含 agent、`git diff` 判据恰 +1 agent 键
（+62/−0，键序 trigger,userinput,llm,**agent**,prompt… = D1）。

### AC2 · handler 语义（smoke）✅

产品提交 **前**：89/1（唯一 FAIL = V09 的 `git status --porcelain -- packages/shared`
时点性断言——shared 产品改动在盘必红，沿 0018/0021/0022 先例形态；fail-fast 挡住
A 组未跑，非实现缺陷）。产品提交 081b32d **后**复跑：**104 passed / 0 failed**——
A01（会话绑定+out-session 出参锚+messages 恰 2）／A02（sqlite 真工具两步循环，
mock 请求增量恰 2 + 🔧/🤖 log + tokens number）／A03（预算穷尽增量恰 2=maxSteps、
out=`（已达最大步数 2）`、assistant 空文本不落库）／A04（stop 透传 node:error
「已中止」+ run:done{stopped:true} + 零孤儿）／A05（36 条捕获事件逐条
RunEventSchema 通过，零新增契约）全 PASS，既有组零回退。

### AC3 · golden 双通道 ✅

gate 最终态 **9 场景全绿 diffPx=0**（s0~s7 既有零漂移 + s8-agent-node 在列）。
通道合规：s8 基线经 golden-created（gate.mjs:249-253 既有通道，未用 gate:update）；
s3-library.png 经修宪轮 `gate:update` 恰一次（SPEC §6.3 步骤序①~⑤由工作流门禁
执行——首跑 s3 FAIL diff 图留存 → gate:update 一次 → 复跑全绿；JOURNAL §5.2 目验
差异图=恰「通用智能体」条目插入 chat 组、无计划外差异区）。golden 区零波及机器
核对：`git status -- tests/golden/ui/` 恰 s8 双文件新增 + s3-library.png 修改，
**s3 invariants 字节不变，其余 16 文件零 diff**。

### AC4 · 前端零改动 ✅

`git show --numstat 081b32d` 无任何 `apps/web/**` 路径（AC4 机器证明；节点库新增
条目由 DEFS 数据驱动渲染链承载，app.js/app.css/Skeleton.tsx 零 diff）。

### AC5 · 白名单与零依赖 ✅

产品提交恰 20 行 numstat = SPEC §2 #1~#19（#17 s8 双文件分行）：+569/−37。
禁区零触及：`package-lock.json`/`events.ts`/`llm.ts`/`nodes/llm/**`/`apps/web/**`
全部零 diff（=零新依赖/零新增 SSE 事件/零 llm 触碰机器证明）。agent.ts 119 行
≤200 预算（§4.7 拆分预案未启用）。

### AC6 · 手动 E2E（部分，如实标注）⚠️

①②③（节点库出现「通用智能体」条目/画布渲染 --cat-chat 标题栏 + 2 入 2 出端口 +
model/sys/maxSteps widget 行/连线）由 **s8 场景 Chromium 实渲染像素级承载**
（gate s8 基线即真实浏览器截图，JOURNAL §5.2 pngjs 逐像素采样佐证结构正确）。
④（真实 provider key 运行流）未跑——运行语义已由 A01~A05 mock 全链覆盖
（会话/工具循环/预算/停止/契约）；需要时按 0005/0009 先例补跑真模型 E2E。

### AC7 · 指针抽样 ✅（5 组）

`nodes.ts` agent 键紧随 llm（D1）✓／`agent.ts:44` maxSteps 钳制 ✓／`gate.mjs`
seed 钩子两行纯插入 ✓／ADR-0013 头部状态行 = SPEC §8.6 字面 ✓／smoke `:126-135`
「智能体」三 mock 路由 ✓——全部命中。

## 三、BUG 清单

无产品缺陷。OBS-001（非缺陷）：V09 时点性假红，先例处置（提交后复跑自愈），
实测 104/0 判据达成。

## 四、VERIFY 结论

**PASS**。建议 CLOSE：BACKLOG BK-0033 → done、metrics 追加、STATE → 0032 idle；
issue#2 仅进度回执不关单（BK-0034 链终轮关单，沿 issue#10/11 先例）。
