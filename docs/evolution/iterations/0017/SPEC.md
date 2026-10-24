# SPEC · 迭代 0017 · BK-0027 真 MCP client 传输选型 SPEC 先行（纯文档轮）

> 产出角色：spec-designer（SPEC 阶段）· 2026-10-24 17:35
> 输入：`docs/evolution/iterations/0017/PRD.md`（PLAN 产物）+ 本会话只读核实与联网调研。
> 冲突顺位：CONSTITUTION.md > 代码实现 > 本文档。本文引用的 `path:line` 均本会话亲读，
> 联网事实均标注查询日期与来源（ADR §5 同源）。
> **本迭代零代码 / 零依赖 / 零契约**：BUILD 阶段仅按本 SPEC 落两份文档产物。

## 0 · 定位与硬前置判定

- **纯文档轮**：产品提交 = ADR-0012 草案新增 + BACKLOG 三行备注定界回写，其余
  一切路径零字节改动（AC4 白名单机器核对，含 package-lock.json 零变化 = 零依赖
  引入证明）。
- **POLICY 校验**：文档与实现同步（ADR 记述）+ 侦察与立项（BACKLOG 维护）均属
  自主区；ADR 内规划的新依赖 / 出站类别 / env 语义只以文字方案存在，草案显著
  标注待批准（`docs/adr/0012-mcp-client-transport.md:3` + 显著声明块）。
- **ADR 判定：needsAdr=true**——PRD REQ-0027-01 即要求 ADR 草案（BK-0021 同款
  从严路径：架构选型 + 需批准承载先行成文）。草案已落盘
  `docs/adr/0012-mcp-client-transport.md`（278 行 ≤ 预算 400；编号 0012 顺延，
  本会话 `ls docs/adr/` 实查 0001~0011 在库）。**注意：该 ADR 是「待用户批准」
  草案而非已接受决策——批准通道 = 附录 A issue 获用户本人批复。**

## 1 · 受影响文件清单（本迭代全部改动面）

| 文件 | 改动 | 预算 |
| --- | --- | --- |
| `docs/adr/0012-mcp-client-transport.md` | **新增**（SPEC 阶段已落盘，BUILD 复核后原样纳入产品提交） | 278 行（实际；上限 400） |
| `docs/evolution/BACKLOG.md` | BK-0028 / BK-0029 / BK-0030 三行**备注列替换**为 §7 模板字面量；表结构不变（零新行）；**BK-0013 行逐字不动**；BK-0027 状态流转归 CLOSE | 增量 ≤30 行口径下实际为 3 行原地替换 |
| 其余一切路径（`apps/**` `packages/**` `tests/**` `tools/**` `.github/**` `package.json` `package-lock.json` `CONSTITUTION.md` `AGENTS.md` `README.md` `docs/evolution/ROADMAP.md` `docs/evolution/metrics.md`） | **零改动**（AC4 机器核对） | — |

## 2 · 模块边界（纯文档轮）

```
spec-designer（本阶段）    产出 ADR-0012 草案 + 本 SPEC；不碰任何代码与 CONSTITUTION 正文
code-developer（BUILD）    仅执行 §7 BACKLOG 备注回写（模板字面量逐字粘贴）+ 提交；
                           不改 ADR 正文（若发现 ADR 与代码现状矛盾：中止并上报，
                           不得自行改写技术结论）
test-manager（VERIFY）     按 §8 AC1~AC6 逐条执行；AC6 指针抽样 ≥5 条
协调者（CLOSE）            BK-0027 置 done；脚本持 ADR 附录 A 字面量开 needs-approval
                           issue（开 issue 是脚本动作，本轮只交文本）
```

ADR 与代码冲突顺位（spec-designer 职责约定）：以代码实现为准——本 SPEC 撰写时
全部指针已亲核（PRD 背景节指针为本 PRD 会话核、本 SPEC 会话复核关键锚点：
tools.ts:26-73/:81-85/:104-116、guard.ts:33-56/:59-62/:88-100、llm.ts:9/:38、
app.js:102-121、config.ts:28-35/:49-63、code.ts:50-53）。

## 3 · ADR-0012 章节骨架与行数预算（REQ-0027-01 六要素 → 章节映射）

| ADR 章节 | 承载的 PRD 要素 | 要点 | 行数（实际/预算） |
| --- | --- | --- | --- |
| 头部状态块 + 显著声明 | 状态标注 | 「草案 · 待用户批准，批准前零实现」双位（:3 + 声明块） | 15 / 20 |
| §1 动机与现状证据 | (a) | 伪 MCP 五内置（tools.ts:26-73）+ 前端原型模拟数据（app.js:103-114）+ 竞品对照结论 | 22 / 30 |
| §2 传输选型对比矩阵 | (b) | 两传输 × 6 维度（§4 定稿） | 18 / 25 |
| §3 传输结论 | (b) | 两者都做 / 统一 McpConnection 抽象 / HTTP 先行次序 + 理由 | 24 / 30 |
| §4 依赖选型 | (c) | 三案对比（v2 拆分包 / v1 / 手写）+ 协议面清单 + 兼容性核验（ESM+tsc / node / zod 双实例 / guard 注入点）+ 推荐结论 | 40 / 50 |
| §5 调研记录 | (c) | 六条事实 × 来源 URL（2026-10-24 查询） | 12 / 15 |
| §6 安全边界 | (d) | 6.1 stdio（白名单/超时/生命周期/残余风险）；6.2 HTTP（guard 网关收口 + mcpFetch 签名草图 + 逃生口径）；6.3 内置共存 + 命名冲突 + BK-9006 归属 | 52 / 60 |
| §7 env 语义方案选项 | (d) | 案 A env 注册表（推荐）/ B 配置文件 / C 并存 | 12 / 15 |
| §8 三子项定界索引 + 模块草图 | (e) | 新增文件名 + ≤400 行拆分预判 + 实施顺序（权威字面量指针 → 本 SPEC §7） | 30 / 35 |
| §9 影响面与不做范围 | (f) | 零 UI / 零 shared / BK-0014 衔接 / BK-0008 正交 / 本轮零代码 | 14 / 20 |
| 附录 A issue 草案 | REQ-0027-03 | 标题 + 正文五要素字面量（见 §6 存放决策） | 39 / 45 |
| **合计** | | | **278 / 400** ✓ |

## 4 · 传输对比矩阵维度定稿（SPEC 定稿，ADR §2 载体）

六维度（超出 PRD 下限五维度；每维度评估口径 = 以本仓既有约束与先例为参照系）：

1. **适用场景与生态**：本地进程生态（Claude Code .mcp.json 同款）vs 远程服务生态
   （团队网关/云服务，n8n/Dify 场景）——定性对比，引竞品对照。
2. **依赖与实现面**：SDK 导入路径 + 本仓需新写的代码形态（传输构造/生命周期 vs
   传输构造/guard 注入）。
3. **安全面**：stdio = 服务器 spawn 外部命令（最重，白名单+超时+生命周期三约束，
   对齐 AGENTS.md 硬性约定 3 与 code.ts:50-53 先例；残余风险声明）；HTTP = SSRF
   （guard 网关收口，对齐 guard.ts:88-100 searxngSearch 先例 + ALLOW_PRIVATE_NET
   逃生 guard.ts:39-40）。
4. **运维与配置面**：命令注册 + 进程随 run 启停 vs URL 注册 + 无进程管理。
5. **与 16 节点引擎集成复杂度**：生命周期绑定/中止级联/平台进程行为 vs 进程内 mock
   可测性（smoke G 组 mock 先例）。
6. **协议演进暴露度**：帧格式稳定性 vs 12 个月三改（HTTP+SSE 废弃 → Streamable
   HTTP 会话式 → 2026-07-28 去会话化+header 镜像）——结论必须由 SDK 承担。

矩阵结论三要素（PRD 要求，ADR §3 已含）：**两者都做**（BK-0028 单项内）、
**统一抽象**（McpConnection 四方法接口：connect/listTools/callTool/close）、
**次序 Streamable HTTP 先行**（guard 先例最短评审路径 + 进程内 mock 可测性 +
团队网关场景先通；stdio 同项紧随）。

## 5 · 依赖调研方法与结论要点（ADR §4/§5 载体）

- **方法**：registry.npmjs.org 元数据（版本/许可/依赖树/peer/engines/type）+
  官方文档与规范页（协议修订内容）+ SDK 源码 issue（注入点先例）；全部标注
  2026-10-24 查询日期与来源 URL（ADR §5 六条）。
- **结论要点**：推荐 `@modelcontextprotocol/client` ^2.4（Apache-2.0 / ESM-only /
  node≥20 / 直接依赖 7 项 / 无 peer）；否决 v1 `@modelcontextprotocol/sdk`
  （维护窗口约止 2027-01、依赖树 17 项拖入 server 侧件、peer zod ^3.25‖^4 与本仓
  floor ^3.24.0 不合）；否决手写（协议演进负担）。兼容性核验四项：ESM+tsc
  （apps/server 已 NodeNext + type:module，ai@7 同链先例）、node 版本（本机 v24.21.0
  实查 / Docker node:22）、zod 双实例（SDK 自带 zod4 嵌套共存，无互传面）、
  guard 注入点（v1 在案、**v2 待实施轮复核**，回退链已写明）。
- **时效提示（固化）**：BK-0028 实施 SPEC 强制逐项复核版本号与 API 面（PRD 风险 3
  已内建；ADR 头部「调研时点」注记同步承载）。

## 6 · 安全方案定稿要点 + issue 草案存放决策（ADR §6/§7/附录 A 载体）

- **stdio 约束方案选项（三案，均标注为未来 env 语义需批准面）**：
  案 A env 白名单注册表 `MCP_STDIO_SERVERS="name=命令 参数"`（**推荐**——与
  config.ts:28-35 全 env 风格一致、零新文件面、运维故事同 SEARXNG_URL、zod
  fail-fast 先例 config.ts:49-63）；案 B 配置文件注册表（args 结构化，但新增文件面
  与加载顺序需另议）；案 C 两者并存（双源复杂，v1 无必要）。白名单语义 = 注册表
  本身（工作流/模型侧无法注入任意命令；无 shell 拼接）；超时 10s/30s；生命周期
  绑定 run + 停机宽限内强 close；残余风险（子进程自身网络不经 guard）显式声明。
- **Streamable HTTP 网关模式设计草图（函数签名级，对齐 searxngSearch
  guard.ts:93-100 先例）**：

  ```ts
  /* guard.ts 追加（BK-0030）——复用 guardedFetch（guard.ts:59-62）作收口内核，
   * 语义命名薄包装用于出站类别审计；作为 SDK transport 的 fetch 注入 */
  export async function mcpFetch(rawUrl: unknown, init: RequestInit = {}): Promise<Response> {
    return guardedFetch(rawUrl, init);  // assertPublicUrl + fetch；signal 由连接层注入 30s 硬顶
  }
  ```

  逃生口径：内网 MCP server 走 `ALLOW_PRIVATE_NET=1`（guard.ts:39-40，与本地
  Ollama/SearXNG 同一运维故事）。
- **issue 草案存放决策（PRD REQ-0027-03 留给 SPEC 定）**：落 **ADR 附录 A**（单一
  载体，决策与请批文本同文，脚本逐字取用一处；本 SPEC 不复制正文避免双源漂移）。
  标题与正文五要素（依赖项 / 出站类别与安全摘要 / env 语义面 / 实施顺序 / 证据
  链接）齐备性由 AC3 核对。

## 7 · BACKLOG 定界回写模板（字面量，BUILD 逐字粘贴；REQ-0027-02 载体）

仅替换备注列（`|` 分隔的最后一个单元格）内容，其余列（含状态 proposed）逐字不动：

**BK-0028 行备注 →**

```
原 BK-0013 拆分 (a)；实现轮涉新增 npm 依赖（POLICY 需批准区）→ BK-0027 SPEC 定稿 + issue 获批后转 ready；ADR-0012 定界（与现行标题有出入处以 ADR 为准）：受影响文件=新增 apps/server/src/mcp/{connection,http,stdio}.ts（统一 McpConnection：connect/listTools/callTool/close + 超时 10s/30s + 生命周期绑定 run；Streamable HTTP 先行、stdio 同项）+ apps/server/package.json +1 依赖 @modelcontextprotocol/client ^2.4；验收口径=mock MCP server（HTTP 进程内 + stdio 子进程）initialize→tools/list→tools/call→close 全链冒烟断言 + 超时/abort 生效 + gate/test 全绿；依赖关系=无前置；需批准面=新增 npm 依赖 + stdio spawn env 语义 + MCP HTTP 出站类别（转 ready 唯一条件=issue 获批，ADR-0012 附录 A）
```

**BK-0029 行备注 →**

```
原 BK-0013 拆分 (b)；依赖 BK-0028；工具发现结果注入 LLM 节点工具集（llm.ts collectTools 扩展点）；ADR-0012 定界（以 ADR 为准）：受影响文件=新增 apps/server/src/mcp/registry.ts（env 注册表 MCP_HTTP_SERVERS/MCP_STDIO_SERVERS 解析 + zod fail-fast + 内置五 id 冲突拒绝 + tools/list 发现缓存 + BK-0014 loaders 扩展点）+ apps/server/src/config.ts +2 env 校验；验收口径=env 非法值启动 fail-fast + 注册名与内置冲突拒绝并 warn + 发现结果可被断言（冒烟）；依赖关系=前置 BK-0028；需批准面=新增环境变量语义两项（转 ready 唯一条件=issue 获批，ADR-0012 附录 A）
```

**BK-0030 行备注 →**

```
原 BK-0013 拆分 (c)；新增出站网络目标类别 = POLICY 需批准区；Streamable HTTP 出站须经 guard.ts 网关模式收口；ADR-0012 定界（以 ADR 为准）：受影响文件=apps/server/src/guard.ts +mcpFetch 网关函数（复用 guardedFetch 内核，对齐 searxngSearch 先例 guard.ts:88-100；内网 MCP 走 ALLOW_PRIVATE_NET=1 逃生）+ apps/server/src/tools.ts collectTools 增外部注册表动态分支（内置五 IMPL 语义零改动）+ apps/server/src/llm.ts:38 注入点异步接线；验收口径=外部 server 工具经 n.mcp 引用被 LLM 节点调用（mock 链路冒烟）+ guard 拦截私网 endpoint + run 中止级联 close + gate/test 全绿；依赖关系=BK-0028+0029（guard 函数与注入点可并行开发、验收在后两者产物上）；需批准面=新增出站类别 MCP Streamable HTTP（转 ready 唯一条件=issue 获批，ADR-0012 附录 A）
```

**BK-0013 行（skipped）零改动**；BK-0027 行状态流转归脚本/CLOSE，BUILD 不碰。

## 8 · 验收口径（AC1~AC6 逐条执行命令与核对方法）

**总门禁（AC5，工作流脚本统一执行——先例 0012/0014/0016：VERIFY 不必复跑全套，
REPORT 引用门禁结论）**：`npm run build` → `npm run gate`（8 场景，纯回归面——
前端零改动，预期与基线逐像素一致）→ `npm test` → `npm run smoke:server`
（84 断言零回退）。零代码改动轮，四命令全绿即证基线未受扰动。

- **AC1 · ADR 六要素**（VERIFY 人工读文 + 辅助 grep）：
  `grep -n "草案 · 待用户批准" docs/adr/0012-mcp-client-transport.md`（:3 命中）；
  逐节核对 §1~§9 + 附录 A 对照 PRD (a)~(f)：矩阵两传输 × 6 维度（≥5 达标）+ 次序
  + 统一抽象结论（§2/§3）；依赖选型含协议面清单、调研来源表（§5）与推荐结论
  （§4）；安全边界含 stdio 约束方案（§6.1）与 HTTP guard 网关收口方案（§6.2）。
- **AC2 · 定界回写与状态不变式**：读 BACKLOG BK-0028~0030 三行——备注各含四要素
  （受影响文件 / 验收口径 / 依赖关系 / 需批准面与转 ready 条件）；`grep -n "| proposed |" docs/evolution/BACKLOG.md` 三行仍在；`git diff <base> -- docs/evolution/BACKLOG.md` 中 BK-0013 行零变化（逐字比对）。
- **AC3 · issue 草案完整可用**：读 ADR 附录 A——标题含「BK-0028~0030 真实 MCP
  client 实施」与请批关键词；正文 ①~⑤ 五要素齐备且自包含（不依赖会话上下文）。
- **AC4 · 白名单与零实现机器证明**：`git show --numstat <产品提交>` 输出仅
  `docs/adr/0012-mcp-client-transport.md`（新增）与 `docs/evolution/BACKLOG.md`
  （修改）两行；`git diff <base>..<产品提交> -- apps packages tests tools .github package.json package-lock.json` 输出为空（零依赖引入 = lock 零变化）。
- **AC6 · 指针可核查**：从 ADR 引用的代码指针抽样 ≥5 条逐一打开比对（建议抽样：
  tools.ts:26-73 / guard.ts:88-100 / llm.ts:38 / app.js:103-114 / config.ts:49-63 /
  code.ts:50-53 任五），file:line 或行段射程内命中；任一失效即 FAIL 列 BUG。
- **手动 E2E 点位（非阻塞，纯文档轮仅一项）**：浏览器打开 http://localhost:3000
  （或 `npm start`）确认应用可起、画布正常加载——证明文档轮对运行时零影响；
  门禁四命令已覆盖其余回归面。

## 9 · 回滚步骤

`git revert <产品提交>`（WORKFLOW §6 唯一回滚手段）。纯文档提交无运行时影响：
ADR-0012 移除、BACKLOG 三行备注回到拆分时文案；BK-0028~0030 状态全程 proposed
不受回滚影响；无数据迁移、无降级脚本。needs-approval issue 若已开，回滚后由
协调者留言作废（脚本动作，非本轮义务）。

## 10 · 风险与声明

1. **草案 ≠ 批准**（PRD 风险 2）：三重保险已就位——ADR 双位草案标注、三子项
   proposed 不变（AC2）、issue 开立与批复归脚本/用户（附录 A 仅文本）。
2. **调研时效**（PRD 风险 3）：ADR 头部注记调研时点 + §4 guard 注入点显式标注
   「实施轮复核」；BK-0028 实施 SPEC 复核义务已写入定界备注。
3. **ADR 结论与子项标题出入**（PRD 风险 1）：未发生——ADR 实施顺序（0028→0029→0030）
   与三子项现行标题语义一致；模板已内嵌「以 ADR 为准」兜底条款。
4. **规模**：ADR 实际 278 行 ≤400；BACKLOG 回写 3 行原地替换 ≤30 行口径 ✓。
