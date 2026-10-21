# ADR-0008 · 审批弹窗盒体样式补齐（#approve-modal .box 缺失规则修复）

- 状态：**已批准（2026-10-21 用户批准，经 ADR-0007 决策问题一并批准）· 已实施**
- 日期：2026-10-21
- 关联：CONSTITUTION.md 第 1 条（UI 不变式）、第 3 条（变更流程）、第 4 条（适用范围）；
  ADR-0007（第 2 节末「核对中发现的一处实现事实」与第 9.4 节如实声明：该缺陷不在
  ADR-0007 修复范围，「若后续认定是缺陷，修复属独立 UI 变更，另走宪法第 3 条」——本文件即该独立变更）

## 1. 缺陷发现（ADR-0007 §2 核对记录，2026-10-20）

`#approve-modal .box` 在 `apps/web/src/app.css` 中**没有任何样式规则**——弹窗区只有
`#search-modal .box` 与 `#help-modal .box` 两个 id 作用域规则。三个静态弹窗
（search / help / approve）由 `Skeleton.tsx` 以同构 `.modal-mask > .box` 结构渲染，
但审批弹窗的盒体从未获得与另两个弹窗一致的盒体声明（宽度/背景/边框/圆角/阴影/内边距），
实际依赖浏览器默认样式 + 遮罩层呈现，与既有弹窗呈现语言不一致。属遗留缺陷，非有意设计。

## 2. 用户批准记录

2026-10-21，用户在批准 ADR-0007 的决策过程中，一并批准了本缺陷的修复
（批准形态：完整 / C1 / 两按钮确认；本修复作为 ADR-0007 §2/§9.4 记录的遗留项随同获批）。

## 3. 修复方式

`apps/web/src/app.css` 在 `#help-modal .box` 规则（弹窗区）旁**新增一条**作用域规则：

```css
#approve-modal .box{margin-top:10vh;width:480px;background:var(--panel2);border:1px solid var(--border2);
  border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.6);padding:22px 26px}
```

- 声明**逐字复制**既有 `#help-modal .box` 的全部声明（`margin-top:10vh;width:480px;
  background:var(--panel2);border:1px solid var(--border2);border-radius:14px;
  box-shadow:0 24px 80px rgba(0,0,0,.6);padding:22px 26px`），仅选择器不同。
- 不改动任何既有规则、不新增 CSS 变量、`Skeleton.tsx` 零改动、DOM 零改动。

## 4. golden 影响（像素对比证据）

- 审批弹窗不在 `tools/pixel-gate/gate.mjs` 的 4 个基线场景（s0 初始 / s1 选节点 /
  s2 settings / s3 nodes）中——`.modal-mask` 默认 `display:none`，场景流程不触发
  `approval:required` 事件，盒体不占像素。
- DOM 不变量不受影响：新增规则不含 `--` 自定义属性，`cssVars` 快照逐字段不变。
- **预期 diffPx=0，不重录 golden**；实施 PR 以 `npm run gate` 4 场景全绿为实证
  （跑两次排除偶发抖动）。修复验证另附 `#approve-modal.show` 时
  `getComputedStyle(.box)` 读得背景/内边距/圆角的 E2E 证据（修复前该 computed style
  为浏览器默认值），存证截图不入库。

## 5. 验收标准

1. `npm run gate`：4 场景全部 `pass · diffPx=0`（两次）。
2. E2E：触发一次到达审批弹窗的运行 → `#approve-modal.show` 时 `.box` 的 computed
   `background-color`/`padding`/`border-radius` 与声明值一致。
3. `npm test`：既有 5 契约全过。

## 6. 回滚方式

删除该条规则即完全恢复原状（单行级 revert）；无数据、无 schema、无交互影响。
