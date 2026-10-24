# ADR-0011 · browser MCP 工具可行性评估（仅评估，不实现）

- 状态：**已接受（评估性结论）· 零实现零依赖**（BK-0009 承载，2026-10-24 治理日批处理产出）
- 日期：2026-10-24（W43 第三次治理）
- 关联：BACKLOG BK-0009 / ROADMAP T3-M3；apps/server/src/tools.ts（MCP 工具实现层）；
  apps/server/src/guard.ts（出站守卫）；POLICY.md 需批准区「新增 npm 依赖、
  新增出站网络目标类别」；BK-0013（真 MCP client，本结论的战略关联项）
- 版式对齐：ADR-0009

> **显著声明：本 ADR 为评估性决策记录——不实施任何代码、不引入任何依赖、
> 不改变任何运行时行为。结论 = 维持 browser 工具 stub 如实降级为默认终态；
> 若未来实施，须先开 needs-approval issue（新增依赖 + 新增出站类别，
> POLICY 需批准区），批准前零实现。**

## 1. 动机

前端 MCP_SERVERS 已向用户呈现 browser 工具组（navigate/click/screenshot，
app.js:110-111），后端 IMPL 注册表对应槽位为 null（tools.ts:59-60）——模型勾选后
只能得到 "not implemented" 如实降级（tools.ts:75-88 stubOf，llm.ts:46,56,107
计数与 warn 日志）。本 ADR 评估把它做成真实 headless 浏览器工具的可行性、成本与
风险，并明示放弃条件。

## 2. 现状与证据

- 工具面：TOOL_SPECS 三个 browser.* 条目标注「（未实现）」（tools.ts:99-101）；
  前端清单硬编码（app.js:103-117）——若真实现仅需填充 IMPL['browser']，零 UI 改动。
- 依赖面：仓库现有 playwright ^1.50.0 位于根 devDependencies（package.json:27），
  仅供 tools/pixel-gate 门禁使用；生产运行时（apps/server dependencies）无任何
  浏览器依赖。Docker 运行时为 node:22-bookworm-slim（README:87）。
- 安全面：出站守卫 guardedFetch 仅覆盖 fetch() 调用（guard.ts:58-62）；文件落盘
  统一锚定 apps/server/sandbox（tools.ts:15,17-21 safePath 先例）。

## 3. 候选实现路径

| 路径 | 要点 | 评估 |
| --- | --- | --- |
| A · 复用 playwright | devDep 移入 apps/server dependencies + 镜像装 Chromium 二进制 | 技术最顺（同库已在用），但生产依赖面与镜像体积最大化 |
| B · 轻量抓取替代 | 静态 HTML + 解析（复用 fetch 工具思路） | 拒绝：与既有 fetch 工具语义重叠，无法覆盖 click/截图，伪满足工具契约 |
| C · 维持 stub | 现状即合法终态（tools.ts:4-5「不伪造结果」） | 本 ADR 结论，见 §8 |

## 4. headless 资源预算评估（经验量级，实施轮 SPEC 须实测复核）

- 单实例：headless Chromium 空白页 RSS 约 100–150MB，内容页 200–400MB，
  进程树 4–6 个；二进制安装层约 300–400MB（镜像显著增重）。
- 并发放大：server 无全局 run 并发上限（runsById 仅注册表，server.ts:51）；
  循环节点默认并发 3（README 执行引擎表）× 每 run 持有浏览器上下文 → 最坏情况
  为「活动 run 数 × 3」个活跃上下文叠加。对照现有最重资源模式：code 节点
  独立子进程 + 5s 超时强杀（一次性、不驻留）。
- 约束结论：若实施，必须「单例 browser 进程 + 上下文池上限 2 + 超出排队」，
  禁止每次工具调用冷启动浏览器（冷启动 1–3s 且抖动不可控）。

## 5. 超时与并发约束

- 动作预算对齐既有先例（fetch 15s / download 20s，tools.ts:44-52）：
  navigate ≤15s、单次交互 ≤10s、整工具调用硬顶 ≤45s，超时即关上下文并如实报错。
- 生命周期绑定：run 中止（ctx.ac.signal）必须级联 close 上下文（先例：
  sessions.ts:167 abortActiveSessions 停机出口）；优雅停机 5s 宽限内（server.ts:234）
  强制 browser.close()，超时进程树随容器回收。
- 队列化后工具调用延迟上界 = 排队 + 45s 硬顶，SPEC 须定义「队列满」的如实降级文案。

## 6. 安全面：SSRF 与沙箱

- **SSRF（主要风险）**：浏览器网络栈完全不经 guardedFetch——DNS、子资源、重定向、
  iframe、WebSocket 均在 Chromium 内发生。仅对 navigate 目标做 assertPublicUrl
  预检不充分（页内跳转/meta 刷新/XHR 可达任意内网地址）。
- 最强库内缓解：playwright route('**/*') 拦截文档与子资源请求、逐请求私网检查后
  abort——但 WebSocket 握手、非 http(s) 协议、Service Worker 存在残余绕过面；
  完整收敛需 launch({ proxy }) 过滤代理 = 新增常驻组件与故障面。
- 协议与落盘：禁 file:/about:/data: 导航；download/screenshot 产物一律锚定
  sandbox（safePath 同款路径约束）。
- 信任面：click 作用于不可信页面内容，与 LLM 驱动的既有工具同级，无新密钥面。

## 7. 放弃条件（明示，命中任一即维持 stub 终态）

1. SSRF 收敛不可达：route 拦截残余面 + 代理方案复杂度双重不可接受；
2. 依赖与体积：生产依赖引入 + 浏览器二进制镜像增量（数百 MB 级）不可接受；
3. 资源预算：部署目标（容器内存/宿主规格）无法承载「单例 + 池 2」下限；
4. 收益核验失败：若主要场景（抓取/结构化提取）经既有 fetch 工具已可覆盖，
   浏览器无净增量。

## 8. 结论与再评估触发条件

- **结论：近期不实施，维持 stub 如实降级为默认终态**（路径 C）。理由：§4 资源
  成本与 §6 SSRF 面的边际成本，远高于当前无真实用户诉求下的边际收益；命中 §7-1
  与 §7-2 的概率高。
- **再评估触发**：BK-0013（真 MCP client，拆分后 BK-0027~0030）落地后，浏览器
  能力可经外部 MCP server 供给（托管方自担浏览器资源与安全），届时应优先评估
  「外接 browser MCP server」而非本仓内置实现——本 ADR 不因该触发自动失效，
  评估结论另行 ADR 记录。
- 若终将实施：开 needs-approval issue（新增依赖 + 新增出站类别），SPEC 须先
  实测复核 §4 量级并给出 §6 的选定缓解方案与残余风险声明。

## 9. 验收标准（BK-0009 / ROADMAP T3-M3 口径）

草案存在于 docs/adr/（本文件即验收物）；零代码改动、零依赖变化、npm run gate
与 npm test 基线不受影响（doc 类治理日批处理，无产品提交面）。
