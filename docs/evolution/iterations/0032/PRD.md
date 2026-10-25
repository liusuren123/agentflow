# PRD · 迭代 0032 · BK-0034 goal 模式会话面板 UI（BK-9002 链终轮，修宪轮）

> 产出角色：协调者手动 PLAN（2026-10-25，用户指示手动模式延续）。来源：BACKLOG
> BK-0034（P0/M/ui-proposal/触UI=是/ready，issue#2 批复承继 2026-10-23T15:49:39Z；
> 迭代 0028 PLAN 轮晋升）。定界权威：ADR-0013 §4（入口案 B）+ §5（五端点/7 事件
> 消费映射）+ §6（golden s9 预案）+ §8（BK-0034 实施定界索引）。
> 选题依据：BK-0033 已于迭代 0031 终态 done（入口节点已入列），本链实施序
> 0033→0034 的收尾轮；本链终轮——CLOSE 时回执 issue#2 关单。

## 结论

**建议做（本迭代即做）**：agent 节点已入列（0031），其 identity.description 承诺
「可点开进入流式会话面板」——面板不落地则节点承诺名不副实；后端五端点（BK-0016
done）与会话级 SSE 已就绪，前端纯消费即可点亮「画布编排 × 智能体工作台」差异化
主轴的第一条完整链路。

## 触UI 分类结论

**是（修宪轮）**。授权链 = issue#2 批复承继（2026-10-23T15:49:39Z）+ ADR-0013
（§4 入口案 B + §6 golden s9 预案）。宪法第 3 条三要素齐备（ADR 在案 / 用户批复
在案 / 同迭代 golden 增量）。**波及控制**：入口案 B（浮动面板默认不可见）→
s0~s8 理论零波及（gate 实测确认，任一意外红即中止排查）；唯一 golden 增量 =
s9-goal-panel-online（golden-created 通道）。

## 需求（ADR-0013 §4.2 四件 + §5 消费映射， Given/When/Then）

- **R1 入口**：Given 画布含 agent 节点，When 用户双击该节点主体（非标题/非 widget
  输入/非端口），Then 打开绑定该节点的浮动会话面板；再次双击或关闭按钮收起。
  标题重命名（.ntitle dblclick）与 widget 交互行为零变化。
- **R2 会话流**：Given 面板打开，When 有历史消息（恢复或本回合产生），Then 按
  user/assistant 气泡 + 系统行渲染；assistant 气泡在 node:delta 时全文覆盖式更新
  （打字机），node:done 定稿并附 tokens/耗时脚注。
- **R3 输入与续聊**：Given 面板绑定会话且无活动 turn，When 输入文本点发送，
  Then POST chat SSE 流式消费（恰 7 种事件，ADR §5.2 语义逐条）；空文本不发。
- **R4 停止**：Given 活动 turn，When 点停止，Then POST stop；run:done{stopped:true}
  时以最后一次 delta 累积全文固化气泡并标「已停止」（服务端不发 node:done 的语义
  如实呈现）。
- **R5 恢复列表**：When 点面板头部「历史会话」，Then 拉取列表（limit 20）供选择；
  选中 → GET detail 回放全量气泡并绑定为当前会话。
- **R6 兜底语义**：409（turn 活动）→「回复进行中」提示；stop 404 →「当前无进行中
  回复」提示；404 detail → 面板空态提示；fetch 失败静默降级（server-sync 先例）。

## 非功能要求

1. server-sync.js 仅数据层（ADR-0006）：不操作面板 DOM；AbortSignal.timeout(8000)。
2. SSE 恰消费 7 种事件；新增事件类型即中止转 needs-approval（ADR §5.3 护栏）。
3. Skeleton.tsx 零改动（动态创建）；sessions.ts/server.ts 后端零改动预期。
4. app.js/app.css 改动形态 = 纯插入（新监听分支 + 新选择器），既有行为零触碰。

## 验收口径（AC）

- AC1 gate：10 场景全绿 diffPx=0（s9 golden-created；s0~s8 零波及实测）。
- AC2 契约：npm test 30/30（shared 零改动纯回归面）。
- AC3 冒烟：smoke:server 全绿（G 组零回退；提交前 V09 时点性假红按先例处置）。
- AC4 手动 E2E 五点位（新建→流式→停止→恢复→续聊）：浏览器实跑（无 provider
  key 时以离线态 + mock 端点页面对照，如实标注）。
- AC5 白名单：恰 SPEC 清单；禁区（Skeleton.tsx/sessions.ts/server.ts/shared/package*.json）
  零 diff。
- AC7 指针抽样 ≥5 组。
