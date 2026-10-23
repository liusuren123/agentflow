# ADR-0009 · golden 场景扩充：s4 工作流面板在线态 / s5 历史面板在线态

- 状态：**草案 · 待用户批准（批准前零实现）**
- 日期：2026-10-23（周度治理日产出，BK-0010 承载）
- 关联：CONSTITUTION.md 第 2 条（执行手段）、第 3 条（变更流程）；POLICY.md 需批准区
  「golden 基线重录与 tools/pixel-gate/ 改动」；ADR-0006/0007（工作流/历史面板服务端
  在线态 UI，已批准实施——本 ADR 不新增任何 UI，仅把既有已批准 UI 的在线态像素纳入
  门禁保护）；BACKLOG BK-0010；needs-approval issue
  [liusuren123/agentflow#7](https://github.com/liusuren123/agentflow/issues/7)

> **显著声明：本 ADR 属宪法第 3 条通道，须经用户本人批准后方可实施；批准前，
> 仓库中除本草案外不得出现任何相关实现改动。**

## 1. 动机

现行宪法门禁仅 4 个静态场景（s0 初始 / s1 选节点 / s2 settings / s3 nodes，
`tools/pixel-gate/gate.mjs:60-65`），全部为离线静态托管态。ADR-0006/0007 落地后，
前端新增了两块**已获批准**的服务端在线态 UI——「工作流」面板服务端分组（列表/保存/
删除）与「任务历史」面板在线优先列表 + 回放——它们目前**不在任何 golden 基线保护
范围内**：若未来某次改动破坏在线面板渲染，gate 不会变红。本 ADR 提议扩充 s4/s5 两个
场景，把保护面延伸到这两块 UI，收紧（而非放松）门禁。

## 2. 影响面

| 对象 | 改动 | 性质 |
| --- | --- | --- |
| `tools/pixel-gate/gate.mjs` | SCENARIOS 新增 2 项；runScenario 支持 per-scenario 路由拦截 fixture 与 `browser.newPage({ timezoneId })`；不变量采集器追加侧栏在线态字段 | POLICY 需批准区（pixel-gate 改动） |
| `tests/golden/ui/` | 新增 s4/s5 各 png+invariants.json（首跑经 gate.mjs golden-created 通道自动落基线） | POLICY 需批准区（golden 基线） |
| `apps/web/**` | **零改动**（在线态 UI 已存在且已批准） | — |
| CI（ui-constitution） | 运行时长 +2 场景（估 +20~40s），无新依赖（Playwright route 原生能力） | 仅时长 |
| s0~s3 既有基线 | 逐字节不动（回归承诺：获批迭代内 gate 全绿含 s0~s3 diffPx=0） | — |

## 3. 新场景步骤定义（草案）

**公共机制（两场景共用）**：
- gate 的静态服务无后端（gate.mjs:32-41），在线态用 **Playwright 路由拦截**确定性供数：
  `page.route('**/api/v1/...', route => route.fulfill({ json: fixture }))`，路由须在
  goto 之前注册；fetch 带 AbortSignal.timeout(8000)（server-sync.js:17），拦截即时
  fulfill 无超时风险。
- **时区钉死 `timezoneId: 'UTC'`**：面板渲染 started_at/updated_at 经 fmtTs 本地时区
  格式化（server-sync.js:71-76），不钉死则 CI 与录基线环境渲染不同字符串，golden 必
  抖动。s0~s3 无时间渲染，不受影响、参数不动。
- fixture 数据固定字面量（名称用 ASCII+固定中文样例、时间戳取整点毫秒），确保任何
  环境重放字节一致。

**s4-workflows-online**：
1. 注册路由 `**/api/v1/workflows` → fixture：3 条工作流摘要
   （{id, name, updated_at} 固定值）。
2. goto → localStorage.clear → reload → fonts.ready → 稳定等待（复用 gate 既有流程
   gate.mjs:69-83）。
3. clickRail('workflows')（与 s2/s3 同型，app.js:287-293 交互面）。
4. normalize（复用）→ 稳定双帧 → 截图 + DOM 不变量。
- 不变量增量字段：`#sidebar.open`、`#side-title`==='工作流'、服务端分组容器存在且
  卡片数 === fixture 条数（3）。

**s5-history-online**：
1. 注册路由 `**/api/v1/runs**` → fixture：3 条 RunRow（done/error/running 三态各一，
   {id, workflow_name, status, started_at, ended_ms, done, total} 固定值；running 态
   刻意纳入——僵尸行渲染正是 ADR-0007 §3.2 关注面）。
2~4. 同 s4，clickRail('history')。
- 不变量增量字段：`#side-title`==='任务历史'、服务端卡片数 === 3、三态 class 分布
  （runCardMeta 映射，server-sync.js:124-131）。
- **本场景不含回放展开**（点击卡片触发 loadRunDetail 二次 fetch + 展开 DOM，作为
  后续扩展场景候选，首批不并入——控制批准面与抖动风险）。

## 4. 对宪法门禁与 CI 的影响

- 门禁语义：4 → 6 场景，0 容差与 DOM 不变量双重复核机制不变；s4/s5 首跑走
  golden-created（gate.mjs:114-117），此后与 s0~s3 同权参与比对。
- CI：ui-constitution required check 场景数 +2；无新 npm 依赖；Playwright 版本不变。
- 风险与对策：若获批实施时 s0~s3 出现非零 diff（Playwright/字体环境漂移），必须停下
  排查、不允许盲目重录——那是既有基线漂移信号，须另立 ADR 说明。

## 5. 重录方案概要（获批后的同一迭代内）

1. 实现 gate.mjs 扩充（SCENARIOS + 路由 fixture + timezoneId + 不变量字段）。
2. 本地 `npm run gate`：预期 s0~s3 pass diffPx=0、s4/s5 golden-created；二次运行
   全 6 场景 pass（自一致性）。
3. 提交 gate.mjs + 新基线 4 文件，PR 附 s4/s5 截图与不变量 JSON 摘要（前后对比即
   「新增保护面」证明——本 ADR 无「前」像素，对比对象是保护缺失现状本身）。
4. 推送后盯 CI ui-constitution（golden 权威在 windows-latest）。
- 说明：本 ADR 是**新增**基线而非重录既有基线，原则上无需 `npm run gate:update`
  （golden-created 通道即入口）；gate:update 仍仅限修宪轮的铁律不变。

## 6. 验收标准（获批后）

1. `npm run gate` 6 场景全 pass（两次）。
2. 反演证明：临时破坏服务端分组渲染（如 fixture 置空）→ s4 FAIL（证明场景确有
   保护力）→ 还原复绿。
3. `npm test` 8/8 不受影响。
4. CI ui-constitution 绿。

## 7. 回滚方式

SCENARIOS 数组回退两行 + 删除 s4/s5 基线 4 文件即完全恢复现状；无数据/契约影响。

## 8. 待用户批准事项（needs-approval issue #7 要点）

批准 = 授权：改 tools/pixel-gate/gate.mjs + 新增 s4/s5 golden 基线（含上述时区钉死
与 fixture 方案）。驳回或要求修改 = 在 issue 评论说明，草案按意见修订后再报。
