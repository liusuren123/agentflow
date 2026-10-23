# ADR-0010 · 底部日志面板按级别过滤 chips（BK-9001）

- 状态：**已获用户批复（issue #1 用户本人评论「批准」，2026-10-23T15:50:05Z，
  PLAN 0013 会话 gh 亲核：OWNER liusuren123、无 🤖 前缀、其后无撤销）· 实现于
  迭代 0013**
- 日期：2026-10-24（SPEC 阶段产出）
- 关联：CONSTITUTION.md 第 1 条（UI 不变式）、第 3 条（变更流程）；POLICY.md
  需批准区「任何 UI 三层改动」「golden 基线重录与 tools/pixel-gate/ 改动」；
  BACKLOG BK-9001；needs-approval issue
  [liusuren123/agentflow#1](https://github.com/liusuren123/agentflow/issues/1)；
  技术规格 `docs/evolution/iterations/0013/SPEC.md`；PRD
  `docs/evolution/iterations/0013/PRD.md`
- 先例：ADR-0008（UI 修复类）、ADR-0009（golden 场景扩充 s4/s5，golden-created
  通道先例）

> **显著声明：本 ADR 已按宪法第 3 条通道获用户本人批准（issue #1），实施于迭代
> 0013。授权范围：底部日志面板头部新增级别过滤 chips（全部/sys/info/warn/ok，
> 单选）+ app.css 尾部追加过滤规则 + gate 新增 s6/s7 两场景基线。既有 s0~s5
> 十二基线文件逐字节不动；`npm run gate:update` 非本项入口（golden-created
> 通道即新增场景的合法入口）。**

## 1. 动机

一次 run 产生数十行 info/sys 流水行，异常（warn 级）被滚动淹没，且底部日志面板
仅保留最近 300 行（`apps/web/src/legacy/app.js:1844`），事后排查全靠肉眼翻找。
issue #1（用户方向注入）要求日志按级别过滤查看；ComfyUI 新前端控制台同样具备
按级别降噪能力（产品意图基准）。本 ADR 在 `#bp-head` 新增 5 个单选过滤 chips
（全部 · sys · info · warn · ok），是最小修宪面的查看层降噪能力：

- 词表取**实发四级原词** sys/info/warn/ok +「全部」——全仓错误语义由 warn 级
  承载（错误行一律映射 warn：`server-sync.js:95,104`、`app.js:2178,2207`），
  CSS 第五级 `.logline.err` 为死规则（全仓零发射源，PRD 背景 2 本会话 grep
  复核），不造恒空过滤的 err chip；未来启用 err 级另行修宪。
- 交互取最小单选模型（默认「全部」，单击某级只看该级）；多选/正则/关键字搜索
  留后续修宪（PRD 非目标 1）。

## 2. 影响面

### 2.1 宪法第 1 条三层触点清单

| 层 | 触点 |
| --- | --- |
| 结构层 | `Skeleton.tsx:120-124` `#bp-head` 内插入 `#log-filter` 包裹 + 5 chip 按钮；`app.css`（结构层保护对象）尾部追加 chips 规则与 4 条 `#log-body[data-lvl]` 过滤隐藏规则——既有选择器与声明逐字不动，文件尾部追加 |
| 视觉层 | 面板展开态 `#bp-head` 像素渲染变化（新增可见控件，激活/非激活两态）；boot 面板即展开态可见 |
| 交互层 | 新增「单击 chip 单选切换过滤级别」交互语义；事件委托绑定于 `#log-filter`（不绑 document，不触碰既有快捷键） |

### 2.2 改动面白名单（产品提交 git diff 仅允许以下六处；其余零改动）

1. `apps/web/src/Skeleton.tsx` —— `#bp-head` 内插入 7 行 chips JSX（ADR §3）；
2. `apps/web/src/app.css` —— 尾部追加 12 行（ADR §3 规则全文）；
3. `apps/web/src/legacy/app.js` —— `:1792` 后插入 7 行事件委托（SPEC §5.5）；
   `addLog` 函数零改动；
4. `tools/pixel-gate/gate.mjs` —— 追加 s6/s7 场景与注入基建；`runScenario` 内
   插入 1 行 post-normalize 钩子分发（`if (sc.after) await sc.after(page);`，
   s0~s5 无此字段=无操作；既有场景步骤与公共不变量采集器零改动——SPEC §5.1
   时序论证：normalize 每场景收起面板（`gate.mjs:46-52`），展开态快照只能在
   normalize 之后构造）；
5. `tests/golden/ui/` —— 仅**新增** s6/s7 共 4 基线文件；s0~s5 十二文件逐字节
   零变化；
6. `docs/adr/0010-log-panel-level-filter.md`（本文件）。

零改动区：`packages/shared/**`、`apps/server/**`、`server-sync.js`、CI 配置、
其余一切路径（SSE `lvl` 字段契约已够用，过滤是纯前端查看层）。

### 2.3 既有保护面零削弱论证

全部既有 golden 场景的 normalize 在快照前给 `#bottompanel` 加 `.closed`
（`gate.mjs:48` + `overflow:hidden` `app.css:318`）→ 新 chips 在 s0~s5 全部
既有快照中不可见；公共不变量六键（`gate.mjs:159-176`）不含 bp-head 内部结构，
`cssVars` 只采 `--` 前缀属性而追加规则无自定义属性 → s0~s5 像素与不变量设计上
零影响，由验收 AC1/AC2 机器核对兜底。

## 3. 新 UI 像素规格（全文；与 SPEC §3/§4 逐字一致）

### 3.1 DOM（Skeleton.tsx 插入，`执行日志` 文本后、`#log-clear` 前）

```jsx
<span id="log-filter">
  <button className="chip on" data-lvl="all">全部</button>
  <button className="chip" data-lvl="sys">sys</button>
  <button className="chip" data-lvl="info">info</button>
  <button className="chip" data-lvl="warn">warn</button>
  <button className="chip" data-lvl="ok">ok</button>
</span>
```

默认「全部」静态携带激活类 `on`（本仓既有激活态惯例，同 `#mode-pan` 的
`ct-btn on`）。

### 3.2 CSS（app.css 尾部追加，逐字）

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

规格来源：高 22px/字号 11px 同 `#bp-head .ibtn` 口径（`app.css:322`）；pill
圆角 99px 沿既有 chip 惯用语 `.cap-chip`（`app.css:449`）；常态/hover 镜像
`.ibtn`（`app.css:37-39`）；激活态用既有 accent token 族（`app.css:12-13`）；
过滤状态挂 `#log-body` 的 `data-lvl` 属性，「全部」= 删除属性（缺省即无过滤），
`addLog` 零改动（CSS 属性选择器对既有行与未来行自动生效）。

## 4. golden 新增方案（宪法第 3 条同一迭代通道）

- 新增两场景经 **golden-created 通道**（基线不存在时首跑落盘，
  `gate.mjs:192-196`；ADR-0009 先例）：
  - **s6-log-panel**：normalize 后经 `#rail-bp` 真实交互展开面板 → evaluate
    直写 5 行固定字面量样例行（sys/info/warn/ok/info；`.t` 恒 `00:00:00` 规避
    `now()` 时间戳与时区；字面量仅 ASCII+CJK 规避跨环境字形差异）→ 快照
    「全部」默认态（5 chips + 全级别行可见）。
  - **s7-log-filter-warn**：同上注入后真实 click `warn` chip → 快照过滤激活态
    （warn chip 激活 + 仅 warn 行可见）。
  - per-scenario 不变量增量：chips 词表与激活态、`data-lvl` 过滤值、逐行级别
    与可见性（公共六键原样、s0~s5 零新增键；`bottomClosed` 沿公共键，s6/s7
    值为 false）。
- 本 ADR 是**新增**基线而非重录既有基线，`npm run gate:update` 非本项入口。
- CI：ui-constitution 8 场景（+20~40s 估），无新依赖。

## 5. 像素对比证据获取方式

1. **golden 基线**（机器证据主体）：s6/s7 首跑 golden-created 落盘 PNG + 不变量
   JSON，此后任何破坏 chips 视觉/过滤行为的改动使 gate 红（验收含反演演练：
   临时破坏 `data-lvl` 写入或删一条隐藏规则 → s7 FAIL → 还原复绿，证明基线
   非恒真）。新增类 ADR 无「前」像素可对比，对比对象是**保护缺失现状本身**
   （ADR-0009 §5 同款口径）。
2. **前后截图**（人工核对面板展开态）：实现提交说明附面板展开态实现前
   （无 chips）后（5 chips 两态）截图；CI 权威以 windows-latest 的
   ui-constitution 8 场景绿为准（宪法第 2 条）。

## 6. 回滚步骤

`SCENARIOS` 回退新增 2 条目（含 after 分发行与注入基建）→ 删除 s6/s7 共 4 基线
文件 → `git revert` 产品提交 → `npm run build && npm run gate` 6 场景复绿。
无数据/契约/后端影响。

## 7. 验收标准（摘要；全文见 SPEC §7 / PRD AC1-AC8）

1. `npm run build` + `npm run gate` 双跑：首轮 s0~s5 pass diffPx=0 + s6/s7
   golden-created；次轮 8 场景全 pass。
2. s0~s5 十二既有基线文件逐字节零变化（AC1）；`npm test` 全绿、
   `packages/shared/**`/`apps/server/**`/`.github/**` 零改动（AC5）。
3. 手动 E2E：过滤切换/清空守恒/收展守恒/reload 重置逐条符合（AC3）。
4. 反演演练 s6/s7 可红可复绿（AC4）；CI ui-constitution 8 场景绿（AC8）。
