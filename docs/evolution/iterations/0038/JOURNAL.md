# JOURNAL · 迭代 0038 · BUILD 轮

> 执行角色：code-developer。输入：PRD.md + SPEC.md（受影响文件清单终稿 §1）+ ADR-0017。
> 环境：工作树 `.zcode/worktree/feat/0038-iter`（分支 feat/0038-iter）；全程带工作树前缀读写。
> 时间：2026-10-26 01:12 → 01:25。

## 实施顺序与落点（沿 SPEC §8）

按 SPEC 建议序执行，四步代码改动一次落盘后统一自测（每步间 gate 的替代 =
末尾 gate 双跑覆盖；改动均为纯插入、无中间态可渲染差异）：

1. **§3.2 lang 联动（app.js 纯插入 +77 行）**
   - 新函数区块插于 capsHtml 结束与 `$('#props')` change 委托之间：
     `CODE_JS_SAMPLE` 常量（与 handlers.ts:113 兜底字面量逐字一致，含 `\n` 转义形态）
     + `syncCodeSampleLang(n)`（Python 样例单一来源 = `DEFS.code.params` 运行时值，
     自定义 code 零改动口径，替换后 rerenderNode + #props textarea 同步 + toast）。
   - 双入口挂点各 1 行：#props change 委托 params 写入后、既有
     `rerenderNode(n); renderMinimap(); saveLocal();` 前；nodesLayer change 委托
     params 写入后、`const def = defOf(n)...` 前。
2. **§3.1 拾取器（同上区块）**
   - `mountApprovalRolePicker`（renderProps 单选分支 `return;` 前 1 行挂点，
     仅 `n.type==='approval'` 注入 `.role-pick` 按钮）+ `openApprovalRolePicker`
     （showMenu 复用；排除自身；LLM 项 mk='LLM' 可点、非 LLM 项 `cls:'off'` 置灰 +
     toast 拒绝；role 已为 node:<id> 时 ✓ 现状态；无 LLM 节点时 mtitle 提示行）+
     `writeRolePick`（整体覆盖 + 既有 change 委托落 params，与 .pvar 同型）。
   - #props click 委托：data-expand 分支后、.pvar 分支前插入 `.role-pick` 分支。
3. **§3.3 app.css 纯插入 +9 行**：`#props .role-pick` 三条（含 svg 尺寸，置于
   `.prow .switchline` 后）+ `#ctxmenu .mi.off` 两条（置于 `#ctxmenu .mtitle` 后）。
   零新增 CSS 变量（s12/s13 基线 cssVars 32 键与既有场景一致，实测佐证）。
4. **§4 gate 场景（gate.mjs 纯插入 +40 行）**：s12 基建（pickOpen/pickReady/pickInv）
   + s13 基建（CODE_WF_SEED/codeLangJs/codeSwapped/codeInv）+ SCENARIOS 追加 2 条。
   落盘前 `ls tests/golden/ui` 实查既有最大场景号 = s11 → 新场景取 s12/s13
   （SPEC §4.4 编号按落盘时序，无并行路占号）。
5. **§3.4 K04 源锁（smoke-server.mjs 纯插入 +15 行）**：+1 import 行
   （`readFileSync` from node:fs）+ K03 块后 G 组注释前 K04 断言块。

## 对 SPEC 的一处必要修正（非范围变更）

- **K04 正则补 `g` 旗标**：SPEC §3.4 代码片段的 `lockRe` 无 `/g`，而
  `String.prototype.matchAll` 对无 `g` 旗标正则会抛 `TypeError`（ECMAScript 规范
  行为，实装即红）。实施时补 `g`，断言语义（两文件各恰 1 处 + 捕获组逐字相等）
  与 SPEC 完全一致。孤立验证：

  ```
  node -e "...matchAll(lockRe)..."
  → app.js hits: 1 / handlers.ts hits: 1 / equal: true
  ```

  Python 样例（`#` 前缀，code/node.ts:24）不匹配 `// ` 锚定前缀，无误捕。

## 自测（全部在工作树根实跑）

| 命令 | 结果 | 关键输出 |
| --- | --- | --- |
| `npm run build` | ✅ | vite 68 modules，711ms（dist/index.html 357.03 kB） |
| `npm run gate`（第 1 次） | ✅ | s0~s11 全 `pass · diffPx=0`（零波及实测）；s12/s13 `golden-created` 落盘 |
| `npm run gate`（第 2 次） | ✅ | 14 场景全 `pass · diffPx=0` → 新基线连续两次采集逐字节一致（AC7/REQ-0046-03 达成；`gate:update` 全程 0 次） |
| `npm test` | ✅ | 30/30 pass / 0 fail（shared 零 diff 佐证） |
| `npm run smoke:server` | ✅ | `==== smoke:server：119 passed / 0 failed ====`（118 基线 + K04；K01~K04 逐条 PASS，两轮实跑均 119/0） |

### 新基线语义抽查（不变量内容人工核验）

- s12：`menuOpen:true`；menuItems 7 项 = kefu 8 节点排除自身（id=7），唯一 LLM 项
  `|LLM 生成回复 · #4LLM`（无 off + mk），其余 6 项全 `off|` 前缀——与 SPEC §4.2
  预期逐字一致。
- s13：`propsLang:"JavaScript"`；propsCode 与 nodeCode 同值
  `// 处理输入后返回\nresult = input\nreturn result`——联动经 #props 入口生效且
  节点体同步。

## 禁区与白名单机器判据（AC5）

- `git diff --stat -- packages/shared apps/server package.json package-lock.json
  CONSTITUTION.md AGENTS.md .github/workflows` → **输出为空**（禁区零 diff）。
- `git status --porcelain -- tests/golden` 无 M 行 → 既有 12 基线零修改，仅新增
  s12/s13 四文件（2 png + 2 invariants.json）。
- `git diff --numstat`：app.js +77/−0、app.css +9/−0、gate.mjs +40/−0、
  smoke-server.mjs +15/−0 → **纯插入形态**（既有行零删改）；app.js 2740→2817
  （PRD 预期 +60~90 内）、app.css 597→606（SPEC 预期 +6~10 内）。

## 未做 / 留给后续阶段

- 手动 E2E 五点位（SPEC §6，需 `npm start` 起真实后端）归 VERIFY 轮执行；
  本轮以 gate 双场景 + smoke 全量 + 不变量语义抽查覆盖其可自动化面。
- BACKLOG 终态回写与标题勘误归 CLOSE 轮（PRD 迭代编排节）。
