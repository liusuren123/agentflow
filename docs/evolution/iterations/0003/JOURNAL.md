# JOURNAL · 迭代 0003 · BK-0003 契约测试补齐（BUILD 过程记录）

> 产出角色：code-developer（BUILD 阶段）· 2026-10-22 11:54
> 输入：本目录 PRD.md（REQ-0003-01~04）+ SPEC.md（§2 受影响文件清单为改动面全闭包）。
> 完整门禁（build/gate/test/smoke）与 git 提交由工作流脚本统一执行，本文只记录
> BUILD 侧实现与自检。

## 一、实现清单（与 SPEC §2 五文件一一对应，别无其他改动）

| # | 文件 | 动作 | 要点 |
| --- | --- | --- | --- |
| 1 | `apps/server/src/engine.ts` | 修改 1 行（engine.ts:26） | `const HANDLERS` → `export const HANDLERS`，类型注解与表内容逐字不动（D1） |
| 2 | `packages/shared/test/defs-drift.test.mjs` | 新增（约 58 行） | REQ-0003-01：33/33 字面量期望表（SPEC §4.1 快照逐字抄录）+ 四步断言（计数自检 33 / 节点键集 / 逐节点参数键集 / 逐参数值，失败信息含 `type.k`） |
| 3 | `packages/shared/test/events-negative.test.mjs` | 新增（约 41 行） | REQ-0003-02：12 条坏样本表驱动（四类失败形态各 ≥1、12 个事件族），逐条 `assert.throws`；正例回放留在 contract.test.mjs 未动 |
| 4 | `packages/shared/test/handlers-coverage.test.mjs` | 新增（约 40 行） | REQ-0003-03：动态 import `apps/server/dist/engine.js`（URL 经 `import.meta.url`，与 contract.test.mjs:66 同深度手法），断言 ⊇ NODES 16 键 + 每键为函数 + 额外键仅 `__pass`；existsSync 裸跑保险（D2 第二道，报错含 build:server 指引，不静默跳过） |
| 5 | `package.json`（根） | 修改 1 行（scripts.test） | `build:shared && build:server && test`（D2 先行构建；顺序不可换——server tsc 依赖 shared dist types） |

**不触碰清单核对**：`packages/shared/src/nodes.ts` / `events.ts`、`contract.test.mjs`、
`apps/web/**`、`tools/pixel-gate/**`、`tests/golden/**`、`tests/smoke/**`、CI 配置均未动
（git status 佐证：改动仅上述 5 文件 + 本迭代目录文档 + STATE.md）。

## 二、实现前事实复核（本 BUILD 会话逐项重读源码，非转抄 SPEC）

- 33 项期望值逐一与 `packages/shared/src/nodes.ts:13-105` 各 `params[].d` 比对一致；
  计数 3+4+4+1+3+2+3+2+2+1+2+1+1+1+1+2 = 33。
- 12 条反例逐一与 `packages/shared/src/events.ts:8-36` zod 定义比对：N 族缺必填、
  T 族类型不符、E01 超 `z.enum`、L 族违反 `.nullable()`（可 null 不可缺）——语义吻合。
- `BASIC_HANDLERS` 键集 grep 实测（handlers.ts:14-205）：`__pass` + 15 节点键；
  engine.ts:27-28 注入 `llm` → 16 节点键 + `__pass`，与 SPEC F2 一致。
- `apps/server/package.json:5` `"type": "module"` + tsconfig NodeNext → dist/engine.js
  为 ESM，测试动态 import 可行（与 SPEC F3 判断一致）。

## 三、BUILD 侧自检（scoped，非完整门禁）

按任务指令，根级完整门禁（`npm run build` / `npm test` / `npm run gate` /
`npm run smoke:server`）与 git 提交由脚本统一执行，BUILD 未运行。以下为交付前
定向自检（防手滑笔误交坏测试），命令与真实输出：

| # | 命令（cwd） | 结果 |
| --- | --- | --- |
| 1 | `npm run build -w @agentflow/shared && npm run build -w @agentflow/server`（仓库根） | 两次 tsc 均 exit 0——engine.ts 加 `export` 后编译干净 |
| 2 | `node --test test/contract.test.mjs test/defs-drift.test.mjs test/events-negative.test.mjs test/handlers-coverage.test.mjs`（packages/shared，显式 4 文件） | tests 8 / pass 8 / fail 0（旧 5 + 新 3 全绿） |
| 3 | `node --test`（packages/shared，**发现模式**，即根链末段的真实形态） | tests 8 / pass 8 / fail 0——3 个新文件均被发现（PRD 风险 3 排除） |
| 4 | `grep -n "HANDLERS" apps/server/dist/engine.js` | dist/engine.js:23 `export const HANDLERS = {`——导出落位；:103 fallback `(HANDLERS[n.type] \|\| HANDLERS.__pass)` 逐字未变（零行为佐证） |

handlers-coverage 测试耗时 ~107ms（远高于其他测试），为真实动态加载 engine 及其
依赖图（ai/pino 等）之证，非空转。SPEC §5 反演演练 5-7 与裸跑防御 8 属 VERIFY 阶段
口径，BUILD 未执行（避免临时红灯与工作区污染）。

## 四、偏差与决策记录

- 与 SPEC 零偏差：五文件、行数预算（三测试文件 40-58 行，远低于 400 上限）、
  期望表与反例逐字采用 SPEC 快照；REQ-0003-03 约束②按 D2 选定「test 链先行构建」。
- 唯一实现自由度：三测试文件头部补了注释块（文件用途 + 防护栏说明），SPEC §4.3
  代码体逐字保留——属文档性内容，不影响断言语义。
- 风险复核：PRD 风险 3（node --test 发现范围）经自检 #3 实测排除；PRD 风险 2
  （期望表笔误）经实现前逐值比对 + 自检 #2 双重排除；`import engine.js` 传递依赖
  加载（SPEC 风险表末行）在本机实测无错（自检 #2/#3 内含该 import）。

## 五、遗留（交后续阶段）

- VERIFY：按 SPEC §5 命令序列 1-8 逐条执行（含 3 项反演演练与裸跑防御，演练后
  须复跑 #2 复绿）；手动 E2E 点位 P1-P3 抽查。
- 脚本：完整门禁 build/gate/test/smoke 全绿后做产品提交（Conventional Commits，
  建议主题 `test(contracts): 契约测试补齐 DEFS 漂移防护 33/33 + 事件反例 + HANDLERS⊇NODES（BK-0003）`）。
