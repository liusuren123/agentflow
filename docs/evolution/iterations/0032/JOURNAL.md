# JOURNAL · 迭代 0032 · BK-0034 goal 模式会话面板（BUILD）

> 产出角色：协调者手动全流程（2026-10-25，手动模式延续——用户指示不走工作流）。
> PLAN/SPEC/BUILD/VERIFY/CLOSE 均为本会话执行，证据全部一手。

## 1. 实施序（SPEC §2 白名单 #1~#6）

1. **server-sync.js（#1，+17/−1）**：四函数（fetchSessionList/fetchSessionDetail/
   createSessionOnServer/stopSessionOnServer）+ `SVR.sessions/sessionsErr` +
   `onSessionsArrive`/`refreshSessions()`（沿 wf/runs 先例同型）；−1 为 SVR 块收尾
   `};` 行重写（语义纯插入）。AbortSignal.timeout(8000) 沿 apiJson 既有封装。
2. **app.css（#2，+43/−0）**：`#goal-panel` 系 13 个新选择器尾部纯插入；值全取既有
   变量（--panel2/--border2/--text2/--accent-soft）；默认 display:none（零波及关键）。
3. **app.js（#3，+224/−0）**：第二条 import 语句（新增绑定，既有 import 行零改动）+
   闭包尾面板段——入口监听（nodesLayer dblclick 新分支：`.node` 主体 + `n.type==='agent'`
   + 排除 .ntitle/.wdg/.port；同节点再双击=收起）、动态单例（.gp-head/.gp-stream/
   .gp-list/.gp-input）、同名恢复优先绑定（GOAL_BIND 运行时 Map，不入 localStorage）、
   SSE 恰 7 事件消费（getReader 沿 :2237 先例；stopped=末次 delta 固化+「已停止」）、
   停止（POST stop，404 兜底提示）、恢复列表（refreshSessions → .gp-item 点击回放）。
4. **gate.mjs（#4，+34/−0）**：SESSION_ROUTES（health + GET list + GET :id 三路由，
   注册序=detail 在 list 后（Playwright 后注册先匹配，list 通配会遮 detail））+
   goalOpen/goalReady + s9-goal-panel-online 场景行（seed 同 s8 + steps=[goalOpen] +
   ready=goalReady）。
5. **golden s9（#5）**：golden-created 通道首跑落盘（png + invariants 双文件），
   禁 gate:update（s0~s8 无重录面）。
6. **ADR-0013 状态行（#6，+2/−2）**：链终回写「BK-0033/0034 实施轮均已消费
   （迭代 0031/0032）· BK-9002 链闭合——全文按定稿态保留」。

## 2. 实施期缺陷与修复（BUILD 内闭环，未入 VERIFY）

- **入口守卫字段错**：初版写 `defOf(n).type !== 'agent'`——DEFS 条目为旧形态
  （name/params/…，无 type 字段）恒 undefined → 监听器静默早退。以一次性 Playwright
  探针定位（dblclick 派发链路 nl-seen 证明到达、标题重命名对照正常、bundle grep
  确认代码在包内），修复为 `n.type !== 'agent'`（节点 state 本尊字段）。
- **node_modules/.bin 被清空事故**：BUILD 首跑 build 失败（tsc 不是内部或外部命令）
  ——根因为此前一次裸 `npx tsc`（packages/shared 下无本地 tsc 时 npx 解析到假包）
  触发的 npx 安装行为清空了根 .bin 与 workspace 链接；`npm install`（lockfile 完好）
  恢复 63 项 bin。教训入协调者记忆：shared 下调试类型一律 `npm run build:shared`
  或根 npx，不裸跑 npx tsc。

## 3. 门禁实录（本会话亲跑）

| 门禁 | 结果 |
| --- | --- |
| `npm run build` | 绿（修复 .bin 后；web 351.30 kB） |
| `npm test` | 30 pass / 0 fail（shared 零改动纯回归面） |
| `npm run gate` | **10 场景全绿**——s0~s8 diffPx=0（零波及实测）+ s9 golden-created |
| `npm run smoke:server` | **104 passed / 0 failed**（零 shared 触及 → V09 无假红；G 组零回退） |
| `npm run test:canvas` | 15 passed / 0 failed |
| golden 区零波及 | `git status -- tests/golden/` 恰 s9 双文件新增，零修改 |

## 4. 手动 E2E 五点位（AC4；mock 会话后端 + 真实 dist + Chromium）

无 provider key，按 PRD AC4 预案以 mock 端点驱动真实面板（一次性探针，已删）：

| 点位 | 结果 | 证据 |
| --- | --- | --- |
| 恢复+呈现 | PASS | 面板打开 + 历史 UA 气泡回放 + 标题「通用智能体」 |
| 续聊流式 | PASS | 第二轮流式定稿 + 「42 tokens · 0.8s」脚注 |
| 新建绑定 | PASS | 未命中同名 → POST create 201 → 绑定（title=节点标题） |
| 停止控件 | PASS | turning 即挂（停止钮立即可见可点）+ run:done 即释（插桩探针 t0/t500 时序实证）；服务端停止语义由 smoke A04 + G 组承载 |
| 恢复列表 | PASS | 2 项渲染（模型 + fmtTs 时间）+ 列表/会话流模式切换 |

真实 provider key 的流式全链（模型真实生成）未跑——SSE 服务端语义由 smoke
G01~G10 + A01~A05 mock 全链覆盖，需要时按 0005/0009 先例补跑。

## 5. 移交 CLOSE

BACKLOG BK-0034 → done；issue#2 **链终关单**（沿 issue#10/11 先例）；STATE → 0033
idle；metrics 行。
