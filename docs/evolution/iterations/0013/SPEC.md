# SPEC · 迭代 0013 · BK-9001 底部日志面板按级别过滤（issue#1 批复 · 修宪轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 03:40
> 输入：`docs/evolution/iterations/0013/PRD.md`（PLAN 产物）+ 本会话只读核实（引用均带
> `文件:行` 锚点）。架构决策载体：`docs/adr/0010-log-panel-level-filter.md`
> （状态：**已获用户 issue #1 批复**，2026-10-23T15:50:05Z 用户本人评论「批准」，
> PLAN 会话 gh 亲核在案）。
> 冲突顺位：CONSTITUTION.md > 代码实现 > 本文件。

## 0. 代码事实锚点（本会话逐项核实）

| 事实 | 锚点 |
| --- | --- |
| `#bp-head` 现结构：`.ldot` + 文本「执行日志」+ `#log-clear`/`#bp-close` 两个 `.ibtn` | `apps/web/src/Skeleton.tsx:120-124` |
| `#bp-head .ibtn` 规格基线：`height:22px;padding:0 8px;font-size:11px;margin-left:auto` | `apps/web/src/app.css:322` |
| 面板收起 = `.closed`（`max-height:0;border-top-color:transparent;overflow:hidden`） | `apps/web/src/app.css:317-319` |
| `#bp-head` 为 flex（`gap:9px;align-items:center`），ibtn 组靠 `margin-left:auto` 右贴 | `apps/web/src/app.css:320` |
| addLog：`div.className='logline '+lvl`，`.t`/`.m` 两 span，上限 300 行、滚底；**函数体零改动** | `apps/web/src/legacy/app.js:1838-1846` |
| 面板开关：`#rail-bp` toggle / `#bp-close` 只收（均调 `renderMinimap()`）；`#log-clear` 只清行 | `apps/web/src/legacy/app.js:1790-1792` |
| boot 时面板**展开**（骨架无 `.closed`，app.js 无 boot 收起语句）；boot 有 fresh 欢迎日志行 | `Skeleton.tsx:120`、`app.js:2416` |
| probe 失败**静默**（`catch(_){}` 无 addLog），无周期重试定时器 → 注入后无新行来源 | `app.js:2043-2057`（本会话 grep 全量定时器核实） |
| 实发级别四级 sys/info/warn/ok；`.logline.err` 为死规则（全仓零发射源） | PRD 背景 2（本会话复核一致） |
| 既有 chip 惯用语：`.cap-chip` pill 圆角 `border-radius:99px`（节点能力徽章） | `app.css:449-452` |
| 色板 token 全在 `:root`（`--accent/#0b8ce9`、`--accent-soft`、`--panel2/3`、`--text/2/3`、`--border2`） | `app.css:2-27` |
| gate：6 场景（s0~s5）12 基线；**normalize 在每场景快照前给 `#bottompanel` 加 `.closed`** | `tools/pixel-gate/gate.mjs:46-52,122-131` |
| 公共不变量六键：view/zoom/nodes/cssVars/counts/bottomClosed（cssVars 只采 `--` 前缀属性） | `gate.mjs:159-176`（cssVars `:167`） |
| golden-created 通道：基线不存在时首跑落盘（0011 s4/s5 先例） | `gate.mjs:192-196` |
| 命名无冲突：`chip`/`log-filter`/`data-lvl` 于 app.css/Skeleton/app.js 均无既有占用（`.cap-chip` 属另一类名） | 本会话 grep 核实 |

## 1. 方案总览（推荐实现形态，PRD REQ-9001-02 备选形态即本形态）

**过滤状态 = `#log-body` 的 `data-lvl` 属性；过滤执行 = 4 条 CSS 属性选择器规则；
chips = `#bp-head` 内新增 `#log-filter` 包裹的 5 个按钮；JS 仅一段事件委托。**

- 「全部」= **删除** `data-lvl` 属性（属性缺省即无过滤），不设 `data-lvl="all"`——
  CSS 只需 4 条级别规则，无 all 分支。
- 激活态类沿用本仓既有 `on` 惯例（`#mode-pan` `ct-btn on`，`Skeleton.tsx:108`）。
- `addLog` **零改动**：CSS 属性选择器对既有行与未来行自动生效；300 行上限、滚底、
  「清空」清行不清属性（`innerHTML=''` 只删子节点，`#log-body` 自身属性存活）。
- 事件**委托绑在 `#log-filter` 包裹层**（单一监听、作用域收敛于 bp-head 内，满足
  PRD 风险 4「不得绑 document 级」）。

## 2. 受影响文件清单（PRD REQ-9001-06 白名单展开到函数/规则级）

| # | 文件 | 改动（全部为**追加/插入新行**，既有行零删改） | 预算（PRD NFR-3） |
| --- | --- | --- | --- |
| 1 | `apps/web/src/Skeleton.tsx` | `#bp-head` 内插入 7 行：`#log-filter` 包裹 + 5 chip 按钮（§3 全文） | —（插入 7 行） |
| 2 | `apps/web/src/app.css` | 文件**尾部**（`#pal-drag-ghost` 规则后，`app.css:532` 之后）追加 12 行：1 空行 + 1 注释 + `#log-filter` 1 行 + `.chip` 2 行 + `:hover` 1 行 + `.on` 1 行 + 4 条 `data-lvl` 隐藏规则（§4 全文） | ≤15 ✓（实作 12） |
| 3 | `apps/web/src/legacy/app.js` | `:1792`（`#log-clear` 监听）之后插入 7 行：`#log-filter` click 委托（§5.4 全文） | ≤30 ✓（实作 7） |
| 4 | `tools/pixel-gate/gate.mjs` | ① `runInv` 块后（`:120` 附近）追加 s6/s7 基建 ~36 行（§5.1-5.3）；② `SCENARIOS` 数组尾部追加 2 条目；③ `runScenario` 内 `await normalize(page);`（`:148`）之后**插入 1 行** after 钩子分发（§5.1 时序论证） | ≤60 ✓（实作 ~40） |
| 5 | `tests/golden/ui/` | **新增** 4 文件：`s6-log-panel.png/.invariants.json`、`s7-log-filter-warn.png/.invariants.json`（golden-created 通道落盘）；s0~s5 既有 12 文件逐字节零变化 | — |
| 6 | `docs/adr/0010-log-panel-level-filter.md` | 新增（本 SPEC 同步产出） | — |

**零改动区**（AC5/AC6 机器核对）：`packages/shared/**`、`apps/server/**`、
`apps/web/src/server-sync.js`、`apps/web/src/App.tsx`、`apps/web/src/main.tsx`、
`.github/**`、`tests/smoke/**`、`tests/canvas/**`、其余一切路径。

> **诚实披露（唯一非纯追加点）**：gate.mjs ③ 是向 `runScenario` 既有函数体内
> **插入一行** `if (sc.after) await sc.after(page);`。原因见 §5.1——normalize
> 会在每个场景快照前收起面板，展开态快照无法在 normalize 之前构造。该插入对
> s0~s5 是无操作（无 `after` 字段），PRD 白名单两处红线「既有场景步骤零改动 /
> 公共不变量采集器零改动」均不触碰（SCENARIOS 既有条目、`:159-176` 采集器原文
> 不动）。此点已写入 ADR-0010 影响面。

## 3. 精确 DOM 规格（Skeleton.tsx，逐字）

插入位置：`执行日志` 文本之后、`<button className="ibtn" id="log-clear">` 之前
（`Skeleton.tsx:121-122` 之间）。插入后 `#bp-head` 全文：

```jsx
<div id="bp-head"><span className="ldot"></span>执行日志
  <span id="log-filter">
    <button className="chip on" data-lvl="all">全部</button>
    <button className="chip" data-lvl="sys">sys</button>
    <button className="chip" data-lvl="info">info</button>
    <button className="chip" data-lvl="warn">warn</button>
    <button className="chip" data-lvl="ok">ok</button>
  </span>
  <button className="ibtn" id="log-clear">清空</button>
  <button className="ibtn" id="bp-close">收起</button>
</div>
```

设计依据：

- **包裹层 `#log-filter`**：① 事件委托的精确锚（§5.4）；② CSS 选择器
  `#log-filter .chip` 以 id 收敛、零外溢；③ 不变量采集锚（§5.3）。作为
  `#bp-head` flex 子项参与 `gap:9px`，ibtn 组 `margin-left:auto` 靠右**原样**
  （`app.css:322` 不动，chips 自然位于标题与按钮组之间）。
- **默认态**：`全部` chip 携带 `on`（静态骨架即默认态，React 侧零逻辑——
  模块边界 §6）。
- **词表**：实发四级原词 + 全部（PRD 背景 3 调和结论；不造恒空的 err chip）。
- 机械转换五规则口径内的纯静态 JSX（`className`/显式闭合），与 ADR-0002 CP-C
  一致。

## 4. 精确 CSS 规格（app.css 尾部追加，逐字；同步全文入 ADR-0010）

```css

/* ===== 日志级别过滤 chips（迭代 0013 · BK-9001 · ADR-0010 · issue#1 批复追加） ===== */
#log-filter{display:inline-flex;align-items:center;gap:5px}
#log-filter .chip{display:inline-flex;align-items:center;height:22px;padding:0 9px;border:1px solid var(--border2);
  background:var(--panel2);color:var(--text3);border-radius:99px;cursor:pointer;font-size:11px;white-space:nowrap;transition:all .15s}
#log-filter .chip:hover{background:var(--panel3);color:var(--text2);border-color:#45454f}
#log-filter .chip.on{background:var(--accent-soft);border-color:var(--accent);color:var(--text)}
#log-body[data-lvl="sys"] .logline:not(.sys){display:none}
#log-body[data-lvl="info"] .logline:not(.info){display:none}
#log-body[data-lvl="warn"] .logline:not(.warn){display:none}
#log-body[data-lvl="ok"] .logline:not(.ok){display:none}
```

像素规格逐项来源（ADR-0010 §3 同文）：

| 属性 | 取值 | 来源/理由 |
| --- | --- | --- |
| `height` | `22px` | 同 `#bp-head .ibtn` 口径（`app.css:322`；PRD REQ-9001-01 指定） |
| `font-size` | `11px` | 同上 |
| `border` | `1px solid var(--border2)` | `.ibtn` 同款（`app.css:37`） |
| `border-radius` | `99px`（pill） | 本仓既有 chip 惯用语 `.cap-chip`（`app.css:449`）；与动作按钮 `.ibtn` 的 7px 圆角形成「过滤状态 ≠ 动作」语义区分 |
| `background`/`color`（常态） | `var(--panel2)`/`var(--text3)` | `.ibtn` 常态同款但降一档文字（未选中的次要态） |
| `:hover` | `var(--panel3)`/`var(--text2)`/`#45454f` | 镜像 `.ibtn:hover`（`app.css:39`） |
| `.on` | `var(--accent-soft)` 底 + `var(--accent)` 描边 + `var(--text)` 字 | 既有 accent token 族（`app.css:12-13`；PRD「激活态用既有色 token」）；软底+描边保证 22px 高小控件上的激活可辨识度 |
| `padding` | `0 9px` | pill 比 `.ibtn` 的 `0 8px` 左右各多 1px 视觉配平（圆角增大后等视觉边距） |
| `transition` | `all .15s` | 同 `.ibtn`（`app.css:38`） |

**刻意不做**：`:active` 位移（`.ibtn:active` 的 `translateY(1px)`）——chips 是
单选状态控件非动作按钮，且少一条规则少一分冻结面（PRD 风险 3 对策）。无
`--` 自定义属性 → 公共不变量 `cssVars`（`gate.mjs:167` 只采 `--` 前缀）零影响。
4 条隐藏规则的选择器匹配集与既有任何选择器不相交（`#log-body[data-lvl]`
属性仅由 §5.4 JS 写入，boot 缺省 → s0~s5 中永不匹配）。

## 5. gate.mjs 扩充规格（s6/s7）

### 5.1 时序论证：为什么必须新增 post-normalize 钩子（本 SPEC 关键设计点）

`runScenario` 流程（`gate.mjs:144-156`）：steps → ready → **normalize（收起面板）**
→ 稳定双帧 → 截图。PRD REQ-9001-04 要求 s6/s7 快照时面板**展开**且含注入行——
而 normalize 对**每个**场景无条件加 `.closed`（`gate.mjs:48`），面板展开态不可能
在 normalize 之前构造（先展开也会被收起）。三个候选方案：

| 方案 | 代价 | 结论 |
| --- | --- | --- |
| A. normalize 增参条件化 | 改既有共享函数签名，白名单红线擦边 | 否决 |
| B. steps/ready 里展开 | 时序上必被 normalize 收起，方案不成立 | 否决 |
| C. **`sc.after` 钩子**：normalize 之后、稳定帧之前执行 per-scenario 后处理 | `runScenario` 插入 1 行分发；s0~s5 无此字段=无操作，行为与基线逐字节等价 | **采用** |

```js
  await normalize(page);
  if (sc.after) await sc.after(page);   /* s6/s7 post-normalize 钩子（迭代 0013）；s0~s5 无此字段=无操作 */
```

（插入于 `gate.mjs:148` 之后；公共不变量采集器 `:159-176` 与既有 SCENARIOS
条目原文零改动。）

### 5.2 s6/s7 基建 helper（追加于 `runInv` 块之后、`SCENARIOS` 之前）

```js
/* ---------- s6/s7 底部日志面板场景基建（ADR-0010 · SPEC 0013） ---------- */
/* 时序：normalize 收起面板（gate.mjs:46-52）→ 本钩子经 #rail-bp 真实 toggle 重开
   （走 app.js:1790 真实交互路径，含 renderMinimap；normalize 保证前置必为 closed，
   toggle 结果必为展开，幂等成立）。注入不走 addLog：规避 now() 时间戳（app.js:32）
   与时区依赖，改 evaluate 直写固定字面量（.t 恒 '00:00:00'）；innerHTML='' 先清
   boot 欢迎行（app.js:2416）；probe 失败静默（app.js:2250 catch 无 addLog）且无
   周期重试 → 注入后 #log-body 无新行来源。字面量仅 ASCII+CJK（沿 ADR-0009 §3
   fixture 字形安全口径，规避 emoji 跨环境字形差异）；5 行不溢出（面板体约 188px
   可视高，5 行约 110px）→ 无滚动条不确定性。login 入场动画 .2s 与面板 max-height
   过渡 .22s 均被既有稳定双帧等待（gate.mjs:149-156，350ms×10）消化。 */
const logPanelAfter = openLvl => async page => {
  await page.evaluate(() => { document.getElementById('rail-bp').click(); });
  await page.evaluate(() => {
    const body = document.getElementById('log-body');
    body.innerHTML = '';
    const LINES = [
      ['sys',  '执行后端已连接 node v20.11.0'],
      ['info', 'LLM 节点开始执行 #3'],
      ['warn', 'HTTP 请求节点已旁路，跳过执行'],
      ['ok',   '运行完成 3/3 节点，总耗时 2.4s'],
      ['info', '最终输出：你好，AgentFlow'],
    ];
    for (const [lvl, m] of LINES) {
      const div = document.createElement('div');
      div.className = 'logline ' + lvl;
      div.innerHTML = '<span class="t">00:00:00</span><span class="m">' + m + '</span>';
      body.appendChild(div);
    }
  });
  if (openLvl) await page.evaluate(lvl => {
    document.querySelector('#log-filter .chip[data-lvl="' + lvl + '"]').click();
  }, openLvl);
};
/* s6/s7 专属不变量（spread 于公共六键之后，s0~s5 零新增键，JSON 键序稳定）：
   chips 词表+激活态（'*' 后缀）、过滤属性缺省读作 'all'、逐行级别+可见性
   （display:none 判定，'-' 隐藏 / '+' 可见） */
const logInv = page => page.evaluate(() => ({
  chips: [...document.querySelectorAll('#log-filter .chip')]
    .map(c => c.dataset.lvl + (c.classList.contains('on') ? '*' : '')),
  filter: document.getElementById('log-body').dataset.lvl || 'all',
  lines: [...document.querySelectorAll('#log-body .logline')]
    .map(l => (getComputedStyle(l).display === 'none' ? '-' : '+') + l.className.replace('logline ', '')),
}));
```

### 5.3 SCENARIOS 追加条目（数组尾部，s0~s5 条目原文不动）

```js
  { id: 's6-log-panel',       after: logPanelAfter(null),   inv: logInv },
  { id: 's7-log-filter-warn', after: logPanelAfter('warn'), inv: logInv },
```

**s6 完整步骤语义**：boot → normalize（收面板/清 toasts/blur）→ after：点
`#rail-bp` 展开面板 → 直写 5 行样例（sys/info/warn/ok/info 各级覆盖，info×2
验证多行）→ 稳定双帧 → 截图 + 不变量。**默认态「全部」由骨架静态携带，无需
点击**——s6 即「chips 默认视觉 + 全级别行可见」快照。

**s7 完整步骤语义**：同 s6 注入后**追加点 `warn` chip**（真实 click，走 §5.4
事件路径）→ 快照「warn chip 激活 + 仅 warn 行可见」。

**无 routes / 无 timezoneId**：s6/s7 为离线静态态（同 s0~s3 口径）；注入行
`.t` 为字面量非 Date 派生，页面无其他时间渲染 → 时区钉死无必要（PRD
REQ-9001-04「若走 addLog 途径须 timezoneId」的前提不成立，本方案不走 addLog）。

### 5.4 期望不变量（VERIFY 断言基准；公共六键同 s0 但 `bottomClosed:false`）

| 键 | s6-log-panel | s7-log-filter-warn |
| --- | --- | --- |
| `bottomClosed`（公共键，`gate.mjs:175`） | `false` | `false` |
| `view`/`zoom`/`nodes`/`cssVars`/`counts` | 与 s0 同值（面板展开只压缩 `#viewport` 底边，world transform 与节点绝对坐标不变——PRD 风险 2；`#bottompanel` 为 `flex:none` 定高，`app.css:317`） | 同左 |
| `chips` | `["all*","sys","info","warn","ok"]` | `["all","sys","info","warn*","ok"]` |
| `filter` | `"all"` | `"warn"` |
| `lines` | `["+sys","+info","+warn","+ok","+info"]` | `["-sys","-info","+warn","-ok","-info"]` |

像素面新增可见元素（进入 PNG 基线即受 0 容差保护）：展开面板全高 224px、
bp-head 含 5 chips（激活/非激活两态分别由 s6/s7 覆盖）、log-body 5 行/1 行、
`#minimap-wrap` 随 viewport 收缩上移 224px（绝对定位 `bottom:58px`，内容不变）。

### 5.5 app.js 事件规格（`:1792` 之后插入，逐字）

```js
$('#log-filter').addEventListener('click', e=>{
  const chip = e.target.closest('.chip'); if(!chip) return;
  document.querySelectorAll('#log-filter .chip').forEach(c=>c.classList.toggle('on', c===chip));
  const lvl = chip.dataset.lvl;
  if(lvl==='all') delete $('#log-body').dataset.lvl;
  else $('#log-body').dataset.lvl = lvl;
});
```

行为映射（PRD REQ-9001-02 / AC3 逐条）：

| 操作 | 结果 |
| --- | --- |
| 点任意 chip | 该 chip 独占 `on`；`data-lvl` 写入（或「全部」时 `delete`——`delete dataset` 属性即移除 DOM attribute，boot 缺省态复得） |
| 注入/未来日志行 | `addLog` 零改动，CSS 属性选择器即时生效（既有行与未来行同规则） |
| 清空 | `innerHTML=''` 只删子节点，`data-lvl` 与 chip 激活态**保留** |
| 收起/展开 | `.closed` 类切换不触 `data-lvl`，**保留** |
| reload | 属性为运行态，不持久化 → 重置「全部」 |
| 300 行上限 | 隐藏行仍占上限计数（`firstChild.remove()` 不感知可见性）——行为守恒，不另设「按可见行计数」 |

## 6. 模块边界（docs/frontend-module-boundaries.md 口径）

| 模块 | 本项角色 | 约束 |
| --- | --- | --- |
| `Skeleton.tsx`（React 骨架） | chips 静态结构唯一源（§3 纯 JSX，默认 `on` 为静态初始态） | 不含运行态逻辑；React 侧零 effect/state 增量 |
| `legacy/app.js`（交互命令式模块） | 过滤交互语义唯一载体（§5.4 事件委托） | 宪法第 1 条交互层新增项归此模块；不复制 shared 契约；不绑 document 级监听 |
| `app.css`（样式原文） | 尾部**追加** chips 与过滤规则（§4）；既有选择器与声明逐字不动 | 结构层冻结的唯一合法例外=宪法第 3 条通道（ADR-0010 已批复） |
| `server-sync.js` | **零改动** | 过滤是纯查看层；回放行 `.logline` 由同规则覆盖，无需参与 |
| `packages/shared` / `apps/server` | **零改动** | `lvl` 字段契约已够用（PRD 非目标 3）；AC5 机器核对 |
| `tools/pixel-gate/gate.mjs` | §5 扩充（门禁执行器，POLICY 需批准区——issue#1 批复在案） | 既有场景步骤与公共不变量采集器零改动（§2 披露的唯一插入行除外） |

## 7. 验收口径（BUILD 自检 / VERIFY 执行基准）

### 7.1 构建

- `npm run build`（shared + web）成功，`apps/web/dist` 就绪——gate 前置。

### 7.2 门禁双跑自一致性（AC1/AC2/AC5，本机）

前置：`npm run build`。命令：`npm run gate`（同 scale，两轮）。

- **首轮**（s6/s7 基线不存在）：s0~s5 六场景 `pass · diffPx=0` 且无
  `DOM不变量变化`；s6/s7 两场景 `golden-created`（`gate.mjs:192-196` 通道）。
- **次轮**：8 场景全 `pass · diffPx=0`。
- 核对 `tests/golden/ui/`：仅新增 s6/s7 共 4 文件；`git status` 证明 s0~s5
  12 既有文件零触碰（AC1）。
- `npm test` 全绿（shared 契约零漂移，AC5）。

### 7.3 手动 E2E 点位（AC3；`npm start` → http://localhost:3000）

1. **chips 渲染**：点 `#rail-bp` 展开面板 → bp-head 出现 5 chips（全部·sys·
   info·warn·ok），「全部」激活（accent 蓝描边软底），ibtn 组仍靠右。
2. **产生四级行**：画布搭 2 节点连线，选中其一旁路（`#ntb-bypass`）→ 点
   `#float-run`（无后端密钥时自动回退模拟执行，`app.js:1904`）→ 面板产生
   sys（`━━ 开始运行`）/ info（`▶`）/ warn（`⏸ 已旁路`）/ ok（`● 运行完成`）行。
3. **过滤切换**：点 warn → 仅 warn 行可见；点 sys → 仅 sys；点全部 → 全恢复；
   激活态随单击转移。
4. **清空守恒**：点清空 → 行清空、warn 激活态不变。
5. **收展守恒**：`#bp-close` 收起 → `#rail-bp` 展开 → 过滤态保留。
6. **reload 重置**：F5 → 「全部」激活、面板回 boot 展开态。
7. **回归肉眼扫描**：顶栏/画布拖拽缩放/侧栏面板/弹窗/Toast 无异样（机器面由
   gate s0~s5 守护）。

### 7.4 保护力反演演练（AC4；VERIFY 执行，工作树临时态不入产品提交）

任选其一破坏 → `npm run build && npm run gate` → 预期红 → 还原 → 复绿：

- 破坏 A（交互）：注释 `app.js` §5.4 中 `$('#log-body').dataset.lvl = lvl;`
  一行 → s7 不变量 `filter` 恒 `"all"` + 像素 diff（全部行可见）→ **s7 FAIL**。
- 破坏 B（样式）：删 `app.css` warn 隐藏规则一行 → s7 像素 diff（非 warn 行
  可见）→ **s7 FAIL**。
- 破坏 C（结构）：Skeleton 删「warn」chip 按钮 → s6/s7 双 FAIL（chips 计数 4）。
- 还原后 `npm run gate` 8 场景复绿（证明新基线非恒真）。

### 7.5 白名单核对（AC6）

`git diff --stat` + 逐文件核对：仅 §2 六处；`app.css`/`Skeleton.tsx`/`app.js`
既有行零删改（追加/插入之外无删改；`git diff -U0` 逐 hunk 核对无 `-` 行，仅
插入 hunk）。

### 7.6 CI 权威盯守（AC8）

推送后 `ui-constitution`（windows-latest）8 场景绿。golden 权威在 CI（宪法第
2 条）：本机绿 ≠ 通过；若 CI 仅 s6/s7 红（s0~s5 绿）→ 字形/字体环境差异信号，
排查 §5.2 字面量字形覆盖后修产品代码并重录该两基线（修宪轮 gate 通道在案）；
若 s0~s5 红 → 基线漂移信号，立即中止另查（PRD 非目标 5），**不得借本项重录**。

## 8. golden 新增方案与宪法依据（修宪核心）

- **性质**：本项 golden 变更是**新增场景**（s6/s7 四文件经 golden-created 通道
  `gate.mjs:192-196` 首跑落盘），**不是重录既有基线**——`npm run gate:update`
  非本项预期入口（沿 ADR-0009 §5 先例；WORKFLOW §4 BUILD 修宪轮的 gate:update
  应急条款仅当门禁失败且归因自身时一次性兜底）。
- **宪法第 3 条依据链**：① ADR（`docs/adr/0010-log-panel-level-filter.md`，
  含动机/影响面/像素规格全文/证据方式/回滚）→ ② 用户本人批准（issue #1 评论
  「批准」，2026-10-23T15:50:05Z，PLAN 会话 gh 亲核，无 🤖 前缀、无撤销）→
  ③ 同迭代新增基线并附前后对比（s6/s7 基线即「新增保护面」证明；ADR-0009 §5
  同款口径：新增类 ADR 无「前」像素，对比对象是保护缺失现状本身）。
- **既有保护面零削弱**：s0~s5 十二基线逐字节零变化（normalize 全场景收起面板
  `gate.mjs:48` + `overflow:hidden` `app.css:318`，chips 在既有快照不可见；
  公共六键无 bp-head 内部结构、cssVars 无 `--` 新增——§0/§4 论证，AC1 机器核对）。
- **CI 时长**：8 场景，估 +20~40s（沿 ADR-0009 §4 口径，NFR-2）。

## 9. 回滚步骤（ADR-0010 §6 同款）

1. `SCENARIOS` 回退新增 2 条目（含 §5.1 插入的 after 分发行与 §5.2 基建块）；
2. 删除 `tests/golden/ui/` 下 s6/s7 共 4 基线文件；
3. `git revert` 产品提交（chips DOM/事件/CSS 规则随单提交整体回退）；
4. `npm run build && npm run gate` → 6 场景复绿即恢复现状。无数据/契约/后端影响。

## 10. 风险与对策（SPEC 级增量，PRD 风险 1-5 之外）

| 风险 | 对策 |
| --- | --- |
| 注入字面量跨环境字形差异（本机录基线 vs CI 比对） | 字面量仅 ASCII+CJK（既有 golden 已验证字形类）；不用 emoji/生僻符号；AC8 CI 红的分级处置预案（§7.6） |
| normalize 与面板展开的时序冲突 | §5.1 after 钩子（本 SPEC 关键设计），normalize 逐字节不动 |
| `delete dataset` 兼容性 | 标准 DOMStringMap 语义（删属性即移除 attribute）；AC3 reload/全部 步骤验证 |
| 隐藏行仍占 300 行上限的语义争议 | 明示为设计决策（§5.5 表末行，行为守恒优先）；不引入可见行计数 |
| s6/s7 与 s0 共享 chrome 的快照耦合 | world transform/节点坐标不受面板展开影响（PRD 风险 2 + §5.4 表）；minimap 位移为确定性布局变化，入 s6/s7 自身基线，不回写 s0~s5 |
