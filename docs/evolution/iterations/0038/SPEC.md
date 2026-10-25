# SPEC · 迭代 0038 · BK-0046 approval 审批人节点引用拾取器 + BUG-0012 前端联动

> 产出角色：spec-designer（SPEC 轮）。
> 输入：`iterations/0038/PRD.md`（本轮全部需求编号 REQ-0046-01~04 与 AC1~AC8 沿用其
> 定义，本文不复述需求动机）；架构决策载体 = **ADR-0017**
> （`docs/adr/0017-approval-role-picker-code-lang-sync.md`，状态：已获用户 issue#6
> 批复 2026-10-24 在案，BK-0046 批复承继——修宪轮，无需新一轮 needs-approval）。
> 本文行号为 **2026-10-26 工作树 feat/0038-iter 快照值**；BUILD 纯插入后自然漂移，
> 定位以锚点语义为准（函数名 / 委托块 / 相邻语句），不得以行号盲改。

## 0. 结论摘要

纯前端接线 + golden 两场景增量，后端与 shared 契约全域零 diff。三件交互件全部落在
`#props` 属性面板与既有轻量菜单原语上：① approval 节点审批人行的**节点引用拾取器**
（复用 `showMenu`/`#ctxmenu`）；② code 节点 **lang 切换默认样例联动**（统一函数 +
双入口一行挂点）；③ smoke **K04 源锁断言**（app.js ↔ handlers.ts JS 样例字面量
逐字一致）。既有 s0~s11 十二场景零波及（论证见 §4.3）；`gate:update` 预期使用
次数 **0**。

## 1. 受影响文件清单（终稿）

| 路径 | 动作 | 形态 | 内容 |
| --- | --- | --- | --- |
| `apps/web/src/legacy/app.js` | 改 | **纯插入**（既有行零删改；预期 +60~90 行） | §3.1 拾取器三函数 + renderProps 一行挂点 + #props click 一分支；§3.2 联动函数 + 两条 change 委托各一行挂点 |
| `apps/web/src/app.css` | 改 | **纯插入**（预期 +6~10 行） | §3.3 四条新选择器（`.role-pick` 两态 + `.mi.off` 两态） |
| `apps/web/src/Skeleton.tsx` | **零改动** | — | #props 为 legacy 动态渲染区（app.js:914-964），骨架不含参数行 |
| `tools/pixel-gate/gate.mjs` | 改 | **纯插入** | §4 场景 A/B 的 seed 常量 + 步骤/就绪/不变量助手 + SCENARIOS 数组 +2 条 |
| `tests/golden/ui/**` | **仅新增** | golden-created 通道 | s12/s13 两套基线（png + invariants.json；编号按落盘时序，见 §4.4） |
| `tests/smoke/smoke-server.mjs` | 改 | **纯插入** | §3.4 K04 源锁断言（+1 import 行 + K03 后一断言块；118 → 119 passed） |
| `docs/adr/0017-approval-role-picker-code-lang-sync.md` | 新增（本轮已落盘） | — | ADR 草案（授权链 issue#6 承继） |
| `docs/evolution/BACKLOG.md` | 改（CLOSE 回写） | — | BK-0046 终态 + 标题 to→role 勘误 |

**禁区（零 diff 机器判据，默认落点方案）**：`packages/shared/**`（含
`nodes.schema.ts` WIDGETS 枚举、`nodes.baseline.json`、`events.ts`）、
`apps/server/**`（K04 只**读** handlers.ts，不改）、`package.json`、
`package-lock.json`、`CONSTITUTION.md`、`AGENTS.md`、`.github/workflows/`、
`tests/golden/`（既有基线零修改——仅新增）。

> gate.mjs 属 `tools/pixel-gate/`，WORKFLOW §6.3 名义禁改——但**场景增量**自
> ADR-0009（s4/s5）起即为修宪轮的法定例外（s6~s11 全部经此通道加入，ADR-0010/
> 0013/0015 先例）：本改动仅向 SCENARIOS 追加条目与配套 seed/助手，**零触碰**比对
> 机制、0 容差阈值、公共六键不变量与既有场景定义。越此界（改比对逻辑/既有场景）
> 即违宪。

## 2. 模块边界

| 模块 | 边界约定 |
| --- | --- |
| app.js（legacy） | 本轮全部新代码限定两个新区块（§3.1 / §3.2 各一个带注释边界的 section），不新 import（`toast`/`showMenu`/`state`/`DEFS`/`paramsOf`/`rerenderNode` 均已在作用域内）；不触碰 `widgetHtml`（app.js:734-756）、画布渲染、`server-sync.js` |
| app.css | 新选择器仅两条命名族：`#props .role-pick`、`#ctxmenu .mi.off`——不与既有选择器碰撞（全库无 `.role-pick`/`.mi.off`）；**零新增 CSS 变量**（`cssVars` 不变量键零变化，gate.mjs:296 只采 `--*` 声明） |
| shared（禁区） | `role` 保持 `text` widget（approval/node.ts:19）；DEFS/SSE/baseline 零改动；任何 shared 契约变更 = 越界，**中止转 needs-approval**（PRD 触UI 分类结论） |
| server（禁区） | 互审后端语义 BK-0017 已 done（approval-review.ts:25-28 + handlers.ts:288-318），本轮零触碰；K04 仅 readFileSync 源文本 |
| gate.mjs | 只增场景；场景 B 的 seed/就绪等待/不变量模式逐项沿 s10/s11（seed，gate.mjs:253-256）、s4/s5（状态量就绪，:100-105）、s4/s5（per-scenario inv 增量键，:109-120）先例 |
| smoke-server.mjs | K04 与 V09 同类（校验器用途：V09 跑 `git status`，K04 读两份源文件文本——被测系统仍只经 HTTP 触达，lib.mjs 边界注释口径不破）；断言编号续 K 组（K01-K03 在 :556-586），K04 语义 = K 组主题「code lang 错配」的前端半面收口 |

## 3. 技术方案

### 3.1 REQ-0046-01 · 审批人节点引用拾取器

**渲染挂点（1 行插入）**：renderProps 单节点分支 `box.innerHTML = ...` 赋值之后、
`return;`（现 :953）之前，插入：

```js
    if(n.type==='approval') mountApprovalRolePicker();
```

**新函数区块**（插入位置：capsHtml 函数结束（现 :1000）与 `$('#props')` change
委托（现 :1002）之间，带 `/* ===== 审批人节点引用拾取器（BK-0046 / ADR-0017 §2）===== */` 注释边界）：

```js
function mountApprovalRolePicker(){
  /* 幂等：innerHTML 刚整体替换，无残留按钮；仅 approval 单选态被调用 */
  const inp = $('#props input[data-k="role"]');
  if(!inp) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'role-pick';
  btn.title = '从画布选择节点作为互审审官（写入 node:<id>）';
  btn.innerHTML = I('workflow') + '<span>从画布选择审官节点</span>';
  inp.insertAdjacentElement('afterend', btn);
}
function openApprovalRolePicker(n){
  /* 现状选中态：role 已为 node:<id> 时对应项带 ✓（PRD REQ-0046-01 第二组 GWT） */
  const cur = String(paramsOf(n).role||'').match(/^node:(\d+)$/);
  const others = state.nodes.filter(x=>x.id!==n.id);   /* 排除自身（PRD 硬约束） */
  const items = [];
  if(!others.some(x=>x.type==='llm'))
    items.push({ cls:'mtitle', t:'画布无 LLM 节点（审官须为 LLM 类型）' });
  others.forEach(x=>{
    const isLLM = x.type==='llm';
    const hit = cur && +cur[1]===x.id;
    items.push({
      ic: defOf(x).icon,
      t: `${x.title||defOf(x).name} · #${x.id}`,
      cls: isLLM ? '' : 'off',
      mk: hit ? '✓' : (isLLM ? 'LLM' : ''),
      f: isLLM ? ()=>{ writeRolePick(n, 'node:'+x.id); }
               : ()=>{ toast('仅 LLM 节点可担任互审审官','warn'); },
    });
  });
  const r = $('#props .role-pick').getBoundingClientRect();
  showMenu(r.left, r.bottom+6, items);
}
function writeRolePick(n, val){
  /* 覆盖语义（PRD：含已有值时整体覆盖，SPEC 定）：选中即整体替换；
   * 经既有 change 委托落 params + rerenderNode（与 .pvar 插入同型，app.js:1055） */
  const inp = $('#props input[data-k="role"]');
  if(!inp) return;
  inp.value = val;
  inp.dispatchEvent(new Event('change',{bubbles:true}));
}
```

**点击分支（一个 if 块插入）**：`$('#props')` click 委托（现 :1038-1065）内，
`data-expand` 分支（:1039-1044）之后、`.pvar` 分支注释（:1045）之前插入：

```js
  /* BK-0046：审批人行拾取入口 → 打开画布节点清单（ADR-0017 §2） */
  const rpick = e.target.closest('.role-pick');
  if(rpick && sel.nodes.size===1){
    const n = nodeById([...sel.nodes][0]);
    if(n && n.type==='approval') openApprovalRolePicker(n);
    return;
  }
```

**行为要点**：

- 菜单复用 `showMenu`（app.js:1753-1763）→ 单例 `#ctxmenu`；点击项内任意处由既有
  `#ctxmenu` click 委托（:1768-1773）关闭菜单并执行 `f`；点击菜单外由既有
  document mousedown 捕获监听（:1764-1767）关闭。**零新增关闭/定位逻辑**。
- 非 LLM 项 `cls:'off'` 置灰（CSS §3.3），`f` 为 toast 提示（不写 role）——与
  handlers.ts:295-296「节点类型不是 LLM → 审官不可用」前端预对齐，杜绝可配置出
  已知坏组合。
- 空态：画布除自身外无 LLM 节点 → 菜单首行 mtitle 提示（不可点）。
- LLM 判定 = `x.type==='llm'`（state.nodes 的 type 键即 DEFS 键，nodes.ts:117-137）；
  `defOf(x).icon` 存在于聚合层输出（nodes.ts:107），全部为 ICON_PATHS 既有键，
  零新增图标。
- 手敲自由文本路径零触碰：role 输入框仍是普通 text input，change 委托原样生效。

### 3.2 REQ-0046-02 · code 节点 lang 切换默认样例联动（BUG-0012 前端半面）

**统一联动函数**（与 §3.1 同一新函数区块内，注释边界
`/* ===== code 节点 lang 切换样例联动（BUG-0012 / ADR-0017 §3）===== */`）：

```js
/* JS 等价样例：与 apps/server/src/handlers.ts:113 兜底字面量逐字一致（含 \n 转义
 * 形态）——两处漂移由 smoke K04 源锁断言守护（ADR-0017 §3）。 */
const CODE_JS_SAMPLE = '// 处理输入后返回\nresult = input\nreturn result';

function syncCodeSampleLang(n){
  /* 触发条件：lang change 已写入（select 的 change 仅在取值实际变化时触发）；
   * cur 逐字等于「切换前语言的默认样例」才替换，其余零改动（绝不覆盖用户代码，
   * 与后端兜底「唯一组合命中」同口径，handlers.ts:106-109）。 */
  const ps = paramsOf(n);
  const pySample = DEFS.code.params.find(p=>p.k==='code').d;   /* 单一来源：DEFS 运行时值 */
  const cur = ps.code;
  let next = null;
  if(ps.lang==='JavaScript' && cur===pySample) next = CODE_JS_SAMPLE;
  else if(ps.lang==='Python' && cur===CODE_JS_SAMPLE) next = pySample;
  if(next===null || next===cur) return;
  n.params = n.params||{};
  n.params.code = next;
  rerenderNode(n);                                    /* 节点体 textarea 重建为新值 */
  const ta = $('#props textarea[data-k="code"]');     /* #props 面板同步（该委托不重渲染 #props） */
  if(ta) ta.value = next;
  toast('默认样例与所选语言不匹配，已替换为等价样例');
}
```

**双入口挂点（各 1 行插入，同一形态）**：

1. `#props` change 委托：`if(k!==undefined){...}` 块内，params 写入语句（现 :1033-1034）
   之后、`rerenderNode(n); renderMinimap(); saveLocal();`（现 :1035）之前：
   ```js
     if(n.type==='code' && k==='lang') syncCodeSampleLang(n);
   ```
   注：联动函数内部已 `rerenderNode(n)`，随后的既有 :1035 再跑一次 rerenderNode——
   **冗余但幂等无害**（同值重建，像素不变）；保留既有行零删改优先于消冗余。
2. `nodesLayer` change 委托（节点体 widget 路径，现 :1673-1682）：params 写入（:1678）
   之后、`if((def.params||[]).some(...))` 条件重渲染（:1680）之前插入同一行。
   code 节点无 visibleIf 参数，既有条件重渲染不会触发，节点体刷新完全由联动函数的
   `rerenderNode(n)` 承载。

**语义边界（正例/反例）**：

| # | 前置 | 动作 | 结果 |
| --- | --- | --- | --- |
| 正 1 | code=DEFS Python 样例（含未显式设置） | lang → JavaScript | code 替换为 JS 样例 + toast |
| 正 2 | code=JS 样例（正 1 之后或逐字手敲） | lang → Python | code 恢复 Python 样例 + toast（往返逐字节稳定） |
| 反 1 | code=任意自定义值（≠任一语言默认样例） | lang 切换 | **零改动**（无 toast） |
| 反 2 | lang 切换后 code 已是新语言样例 | 重复选择同值 | select 不触发 change，联动不运行 |
| 边 1 | lang=Python、code 逐字=JS 样例 | lang → JavaScript | 零改动（cur 非切换前语言样例；对称规则下该值视为「未自定义」仅对 Python↔JS 互切生效） |

- Python 样例**单一来源** = DEFS 运行时值（前端不复制字面量，对齐 handlers.ts:110
  `paramDefaultsOf` 先例）；JS 样例为前端字面量，与 handlers.ts:113 逐字一致由 K04
  源锁守护（§3.4）。**备选落点**（shared 常量导出）不采用——那将破「packages/shared
  零 diff」禁区并需联动申报 handlers.ts 改动（PRD REQ-0046-02 落点论证）。
- 导入 JSON / 服务端装载 / undo 路径**不经**联动（非交互式 lang 切换，整态装载数据
  自洽；undo 还原切换前整态）——联动仅挂两条 change 委托，语义面即交互面。

### 3.3 app.css 新选择器（纯插入）

插入位置两处（各自区域尾部，零既有行改动）：

```css
/* BK-0046 · 审批人节点引用拾取入口（#props 参数行内，ADR-0017 §2） */
#props .role-pick{display:flex;align-items:center;justify-content:center;gap:6px;
  width:100%;height:26px;background:var(--panel2);border:1px solid var(--border2);
  border-radius:7px;color:var(--text2);font-size:11px;cursor:pointer;padding:0}
#props .role-pick:hover{border-color:var(--accent);color:var(--text)}
#props .role-pick svg.ic{width:13px;height:13px;flex:none}
```

（置于 `.prow` 段之后，即现 :369 `.prow .switchline` 行后；具体属性值与相邻
`.ibtn`/`.pvar` 视觉族一致，BUILD 可在 ±2px 内对齐族样式，**不得**引入新 CSS 变量。）

```css
/* BK-0046 · 拾取菜单非 LLM 节点置灰（复用 #ctxmenu，ADR-0017 §2） */
#ctxmenu .mi.off{color:var(--text3);opacity:.55}
#ctxmenu .mi.off:hover{background:none}
```

（置于 `#ctxmenu .mtitle` 行之后，现 :522 后。`.mi.off:hover` 覆盖既有
`.mi:hover`（:517）的悬停底色，使置灰项无可交互视觉暗示。）

### 3.4 K04 源锁断言（tests/smoke/smoke-server.mjs 纯插入）

1. **import 行**（新增一行，现 import 区 :28-37 内追加）：
   `import { readFileSync } from 'node:fs';`
2. **断言块**：K03 块（现 :581-586）之后、G 组注释（现 :588）之前：

```js
  { /* K04 · REQ-0046-02 源锁：app.js JS 等价样例字面量 ↔ handlers.ts 兜底字面量
       逐字一致（防两处漂移；沿 M08-M11 源锁先例 mcp-stubs.mjs:205-217，锁语义
       字面量而非全文件哈希；校验器用途，被测系统仍只经 HTTP 触达——V09 git 检查同类） */
    const lockRe = /['"](\/\/ 处理输入后返回[^'"]*)['"]/;
    const srcOf = (f) => { try { return readFileSync(path.join(REPO_ROOT, f), 'utf8'); } catch { return null; } };
    const webSrc = srcOf('apps/web/src/legacy/app.js');
    const srvSrc = srcOf('apps/server/src/handlers.ts');
    const w = webSrc ? [...webSrc.matchAll(lockRe)] : [];
    const s = srvSrc ? [...srvSrc.matchAll(lockRe)] : [];
    C.ok(webSrc !== null && srvSrc !== null && w.length === 1 && s.length === 1
        && w[0][1] === s[0][1],
      'K04', '源锁 JS 等价样例：app.js 与 handlers.ts 各恰 1 处「// 处理输入后返回」字符串字面量，且逐字一致（含 \\n 转义形态）',
      { expected: '两文件各 1 处且捕获组相等', actual: `app.js ${w.length} 处 / handlers.ts ${s.length} 处${w.length===1&&s.length===1 ? (w[0][1]===s[0][1] ? ' · 一致' : ' · 不一致：' + JSON.stringify([w[0][1], s[0][1]])) : ''}`, ctx: 'readFileSync 源文本（apps/web/src/legacy/app.js + apps/server/src/handlers.ts）' });
  }
```

要点：正则以 `// 处理输入后返回` 前缀锚定（两文件中该子串唯一——BUILD 不得在
app.js 第二处复制该字面量）；`[^'"]*` 含 `\n` 转义序列在内的字面量原文，比较的是
**源码书写形态逐字一致**（等价于运行时字符串一致，因两侧同为单引号 + `\n` 转义）。
断言计数 118 → **119 passed**。

## 4. golden 增量方案（REQ-0046-03 · 重录范围与宪法第 3 条依据）

### 4.1 宪法依据与重录范围（硬口径）

- **依据**：本迭代触 UI 交互层 + 视觉层 → 宪法第 3 条三要素齐备：① ADR-0017
  （SPEC 轮产出）；② 用户本人批准 = issue#6 批复 2026-10-24 在案（BK-9006 链，
  BK-0046 备注明载批复承继）；③ 同一迭代内 golden 增量 + 前后对比证据
  （ADR-0017 §5 证据方案）。
- **重录范围 = 零既有重录**：s0~s11 既有基线**零修改**（`tests/golden/` 禁区仅
  新增）；`gate:update` 预期使用次数 **0**。例外通道：任一既有场景意外红 → FAIL
  并中止排查，不以重录掩盖；**确属**预期受波及（波及论证 §4.3 失效时）须留证
  （diff 图 + 归因）且 ≤1 次（PRD REQ-0046-03）。
- **新增通道 = golden-created**（gate.mjs:321-325：基线 png 不存在即落盘并记
  `golden-created`，非 gate:update）——沿 ADR-0015 §6 双通道口径中「新增场景」一侧。

### 4.2 场景定义（gate.mjs 纯插入）

**场景 A · s12-approval-role-picker**（无 seed：fresh boot = kefu 模板，approval
id=7 在库，app.js:147 + :2498-2508）：

```js
/* ---------- s12 审批人拾取器场景基建（BK-0046 / ADR-0017 · 迭代 0038 修宪轮） ----------
   采集面 = #props approval 参数行（role 输入框 + .role-pick 入口按钮）+ #ctxmenu
   打开态（7 项：kefu 8 节点排除自身；LLM 项 id=4 带 mk「LLM」，非 LLM 项 .off 置灰）。
   菜单位置由 .role-pick getBoundingClientRect 派生，视口 1600x900 固定 → 确定性。 */
const pickOpen = page => page.evaluate(() => {
  document.querySelector('#props .role-pick').click();   /* 程序化 click：仅派发 click（无 mousedown），既有菜单外关闭监听不触发 */
});
const pickReady = page => page.waitForFunction(
  () => document.getElementById('ctxmenu').classList.contains('show'),
  undefined, { timeout: 10000, polling: 100 });
const pickInv = page => page.evaluate(() => ({
  menuOpen: document.getElementById('ctxmenu').classList.contains('show'),
  menuItems: [...document.querySelectorAll('#ctxmenu .mi')].map(el => el.className.replace('mi','').trim() + '|' + el.textContent.trim()),
}));
```

SCENARIOS 追加条目（s11 之后）：

```js
  { id: 's12-approval-role-picker',
    steps: [selectNode('.node[data-id="7"]'), pickOpen], ready: pickReady, inv: pickInv },
```

**场景 B · s13-code-lang-sync**（seed 触发器→code 双节点，沿 TERMVIEW_WF_SEED
先例 gate.mjs:232-235）：

```js
/* ---------- s13 code lang 联动场景基建（BUG-0012 前端半面 / ADR-0017 · 迭代 0038） ----------
   采集面 = #props code 参数行（lang=JavaScript + code=JS 等价样例）+ 节点体 widget
   （同值）+ 一条连线。联动 toast 由 normalize 清空（gate.mjs:49），不进快照。 */
const CODE_WF_SEED = JSON.stringify({ tabs: [{ name: '代码语言联动示例', nodes: [
  { id: 1, type: 'trigger', x: 40,  y: 330, title: '手动触发' },
  { id: 2, type: 'code',    x: 410, y: 250, title: '代码执行' },
], edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }], nextId: 3, view: { x: 60, y: 40, scale: 1 } }], activeTab: 0 });
const codeLangJs = page => page.evaluate(() => {
  const sel = document.querySelector('#props select[data-k="lang"]');
  sel.value = 'JavaScript';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
const codeSwapped = page => page.waitForFunction(
  () => (document.querySelector('#props textarea[data-k="code"]') || {}).value?.startsWith('// 处理输入后返回'),
  undefined, { timeout: 10000, polling: 100 });
const codeInv = page => page.evaluate(() => ({
  propsLang: document.querySelector('#props select[data-k="lang"]')?.value,
  propsCode: document.querySelector('#props textarea[data-k="code"]')?.value,
  nodeCode: document.querySelector('.node[data-id="2"] textarea[data-k="code"]')?.value,
}));
```

SCENARIOS 追加条目：

```js
  { id: 's13-code-lang-sync', seed: async page => page.evaluate(v => localStorage.setItem('agentflow.v2', v), CODE_WF_SEED),
    steps: [selectNode('.node[data-id="2"]'), codeLangJs], ready: codeSwapped, inv: codeInv },
```

### 4.3 既有 s0~s11 零波及论证（gate 实测前的静态论证）

| 场景 | 是否触新代码路径 | 论证 |
| --- | --- | --- |
| s0-initial | 否 | 无选中 → #props 空态（app.js:916-921），无参数行无按钮；无 lang 操作 |
| s1-select-node | 否 | 选中 id=3（retrieval，gate.mjs:239）≠ approval/code → 无按钮、无联动 |
| s2/s3（settings/library） | 否 | 侧栏面板，#props 未涉 |
| s4/s5（在线态） | 否 | 侧栏列表，无节点选中 |
| s6/s7（日志面板） | 否 | after 钩子只注日志行，无节点交互 |
| s8-agent-node | 否 | seed 工作流无 approval/code 选中步骤 |
| s9-goal-panel | 否 | goalOpen 双击 id=2（agent）→ renderProps 为 agent 节点，非 approval |
| s10/s11（webshow/termview） | 否 | 仅 seed，无选中步骤 → #props 空态 |
| 公共不变量 | 否 | `cssVars` 只采 `--*`（新 CSS 零新变量）；`counts` 不计按钮/菜单项；新选择器不命中既有 DOM（§2 命名族无碰撞） |

### 4.4 场景编号与确定性

- **编号按落盘时序**：预期 s12/s13；若并行路（如 BK-0050 路径）先落盘占用 s12，
  后落盘者顺延取下一号（ADR-0015 §5 先例：改动仅编号字面量与 golden 文件名，
  像素内容零变化——属改名非重录，不触宪法第 3 条重录通道）。BUILD 落盘前以
  `ls tests/golden/ui` 实查既有最大场景号。
- **确定性论证**：两场景输入全部确定——场景 A 状态 = fresh kefu 8 节点（无 seed、
  localStorage clear → boot 固定装载 SAMPLES.kefu）；菜单内容 = `state.nodes`
  派生（固定）+ ICON_PATHS 固定 SVG + 位置 = `.role-pick` 矩形派生（视口 1600×900
  固定，`showMenu` 的 `Math.min` 收边不触发）。场景 B 状态 = 固定 seed + 两次
  evaluate 步骤（无坐标依赖）；就绪门 = 状态量（菜单 show / 样例前缀），非时延量
  （SPEC 0011 §4 先例）；联动 toast 在 normalize（gate.mjs:46-52 清 #toasts）后
  不进快照，其 setTimeout 回调只作用已脱离 DOM 的节点。saveLocal 的 350ms 防抖
  renderTabsBar 为同内容重渲染，像素中性。
- **收敛判据**：新基线**连续两次采集逐字节一致**（BUG-0026 间歇抖动教训，迭代
  0013；gate 稳定双帧机制 gate.mjs:279-285 之上，VERIFY 轮再以二次 `npm run gate`
  实跑复核——两次 run 均 s12/s13 pass（基线已存在走比对分支）即证逐字节稳定）。

## 5. 验收口径（对 PRD AC1~AC8 的执行映射）

| 命令 / 检查 | 口径 | 对应 AC |
| --- | --- | --- |
| `npm run build` | 全绿（shared + web 构建；gate/serve 前置） | AC1 前置 |
| `npm run gate` | 全绿：s0~s11 全 `pass`（diffPx=0、无 DOM 不变量变化）+ s12/s13 `golden-created` 落盘（首次）/ `pass`（复跑）；`gate:update` 全程未执行 | AC1、AC7 |
| `npm test` | 30/30 零回退（shared 零 diff 佐证：`git diff --stat -- packages/shared` 为空） | AC2 |
| `npm run smoke:server` | **119** passed / 0 failed（基线 118 + K04；K01-V09 全组零回退） | AC3、AC8 |
| `git status --porcelain`（工作树） | 改动恰为 §1 清单文件；禁区路径 `git diff` 恒空；`package-lock.json` 零变化 | AC5 |
| 手动 E2E 五点位 | §6 逐点位 | AC4 |
| 指针抽样 | SPEC/ADR 所引行号与锚点 ≥5 组亲核（VERIFY 轮执行） | AC6 |

补充机器判据：`git diff --stat -- packages/shared apps/server package.json package-lock.json`
输出为空（AC5 禁区零 diff）。

## 6. 手动 E2E 点位（AC4 五点位，BUILD 后本地 `npm start` 起真实后端执行）

1. **拾取入口出现**：清 localStorage → 载入默认工作流 → 单选「转人工审批」节点
   （id=7）→ #props 审批人行输入框下方出现「从画布选择审官节点」按钮；单选其他
   节点无此按钮。
2. **清单与选择**：点击按钮 → 菜单列出除自身外 7 节点；「LLM 生成回复（#4）」带
   LLM 标记可点，其余置灰；点击 #4 → role 输入框 = `node:4`，节点体 role widget
   同步；重开菜单 → #4 项带 ✓；点击置灰项 → toast「仅 LLM 节点可担任互审审官」
   且 role 不变。
3. **互审链路回填**（需可配置模型，或按 V 组口径以 mock/最小实例代替）：role=
   `node:4` 运行 → SSE 依序 `approval:required` 不出现、`log(sys 互审裁决中)` →
   `approval:done` → `run:done`（后端语义 V01-V09 已测，此处验前端接线——role 值
   经拾取器写入后运行链路行为与手敲 `node:4` 完全一致）。
4. **lang 联动双入口**：① #props 入口——选中 code 节点 → lang 切 JavaScript →
   code（#props 与节点体两处）变为 JS 样例 + toast；切回 Python → 恢复 Python
   样例；② 节点体入口——节点体 lang widget 同切同效；③ 反例——手改 code 为任意
   自定义值后切 lang → code 零改动、无 toast。
5. **手敲自由文本回归**：role 手敲「值班经理」→ 运行走人工审批路径
   （`approval:required` → approve → `approval:done`，V05 语义）行为与改动前一致。

## 7. 风险与回滚

- **主要风险**：新 CSS 选择器意外命中既有 DOM（§2 命名族已排险）；拾取器挂点漏
  幂等（innerHTML 整体替换天然幂等，mount 前有 `if(!inp) return` 兜底）；K04 正则
  误捕第二处字面量（断言 `length===1` 自捕获）。
- **回滚**：单迭代单提交，`git revert` 产品提交即整体回滚（含 golden 新增文件，
  git revert 不自动删未跟踪文件——新增基线文件须在产品提交内一并纳入，见下）。
- **提交注意**：`tests/golden/ui/s12*.png|*.invariants.json`、`s13*` 同属产品提交
  `productFiles` 白名单（golden 基线是产品面，非机制件；沿 0033/0034/0035 先例）；
  修复轮白名单**累积并集**，不得覆盖（WORKFLOW §4 教训）。

## 8. 实施顺序建议（BUILD 轮）

1. §3.2 联动（最小面，先行可独立验证）→ 2. §3.1 拾取器 → 3. §3.3 CSS →
   4. `npm run build` + 手动点位 1/2/4 冒验 → 5. §4 gate 场景 + 首跑 gate
   （golden-created 落盘）→ 6. §3.4 K04 → 全量验收（§5）。
   每步之间 `npm run gate` 确认 s0~s11 恒绿（AGENTS.md 工作流约定）。
