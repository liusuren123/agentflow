#!/usr/bin/env node
/* ================================================================
 * smoke-server.mjs — 后端 E2E 冒烟编排层（迭代 0002 / BK-0002 · SPEC §6-§8）
 * 一键入口：npm run smoke:server（根 package.json scripts）
 * 步骤编排 P→M→H→W→N→CAP→S→R→D→E→K→G→V→A→T→O→J→B→KB→MEM→Z→OE→OEN→C；fail-fast（首 FAIL 打印上下文 + server 日志尾，
 * 进 finally 清理）；SIGINT/SIGBREAK 触发同一清理后 exit 130；
 * 汇总 `==== smoke:server：X passed / Y failed ====`，退出码 Y===0 ? 0 : 1。
 * G 组（迭代 0015 / BK-0016）：三实例矩阵——主实例 G01-G04（CRUD/404/limit
 * 反例/stop 404，零模型调用）、mock 实例 G05-G08（进程内 OpenAI 兼容端点，
 * AI_BASE_URL 注入显式配置分支，分块延时流出保证时序确定）、minimal 实例
 * G09（全密钥空串压制 → 降级路径无条件确定）；G10 契约校验仅作校验器使用
 * @agentflow/shared validateEvent（被测系统仍只经 HTTP 触达，0015 SPEC §3.4-6）。
 * V 组（迭代 0016 / BK-0017）：智能体互审协议——mock 端点按请求体 stream 标志
 * 路由裁决三态+1（非流式=裁决子任务，SPEC §4.6）；V01-V03/V07/V08 mock 实例、
 * V04/V05 主实例、V06 minimal 实例；审计核对 = auditsOf 只读直查共享 SQLite（SPEC §5.1）。
 * A 组（迭代 0031 / BK-0033）：通用智能体节点——mock 实例 A01-A05（「智能体」前缀
 * 关键词路由与互审正交）：会话绑定与出参锚 / sqlite 真工具两步循环 / 预算上限 /
 * 停止透传 / 契约零新增（SPEC §7；残留纪律沿 G 组：按自建 title 定位存在性）。
 * O 组（迭代 0033 / BK-0036）：网页展示节点——主实例 O01-O05（无模型依赖、零出站，
 * 不需要 mock 实例）：URL 透传（out 摘要锚 + output 事件 + outputs 汇入）/ 静态兜底
 * （trigger 对象 strInput 归空）/ 非 http(s) 与空输入占位降级（不伪造结果、outputs
 * 零汇入、run 不崩）/ 契约零新增（SPEC §8）。
 * Z 组（迭代 0019 / BK-0011）：悬挂 run 启动扫尾——独立实例 WFAPPR 挂起 run（事件为门）
 * → SIGKILL 崩溃语义击杀（不经优雅停机）→ 同端口重启（扫尾在 listen 前，health 200
 * 即扫尾完成时序门）→ 经 API 断言 status 收敛 stopped、ended_ms/done/total 原值、
 * events 恰 N 条（零伪造终结事件）→ DELETE 自清理；断言全程走 /api/v1（lib.mjs 边界）。
 * CAP 组（迭代 0039 / BK-0049）：能力清单端点——CAP01-CAP04 主实例（无 MCP env，
 * 零模型依赖零出站）：builtin/skills 与迁移字面量全字段 deepEqual（双源收口 +
 * 迁移保真双锁）+ 契约面（顶层键/两次调用确定性/POST 404 只读证明）；CAP05 第二
 * 实例（MCP_HTTP_SERVERS 注册外部条目 + 内置 id 冲突条，URL 指向 discard 端口 9）
 * 断言冲突拒条不污染 builtin、端点调用零出站进程不崩（SPEC §7）。
 * B 组（迭代 0036 / BK-0040）：workbench git 信息端点 E1（ADR-0016 §3.1）——
 * B01-B03 主实例（四键契约 / limit 有效双界 / 非法 400 反例）、B04 专用探针实例
 * （临时非 git 目录 + spawn cwd 刻意=仓库根 → 404，与 B01 合成 PROJECT_ROOT 模块级
 * 锚定双向机器证明）、B05 纪律源扫描（shell 零命中 + 5s 超时强杀形态 + 只读白名单
 * 三命令在场，MT12 先例）。
 * B06-B12（迭代 0054 / BK-0041）扩 E2 diff 端点（ADR-0016 §3.2）：默认契约
 * （HEAD↔工作区，只锁形状不锁数量）/ 固定提交对 ref+path 前缀 / stat 模式
 * （--numstat 定形面）/ ref 白名单与 path 越界 400 反例 / 404 探针实例（B04 同型）/
 * diff.ts 纪律源扫描（B05 同型）。
 * B13-B18（迭代 0056 / BK-0042）扩 E3 tree 端点（ADR-0016 §3.3）：默认契约
 * （含 .git 排除/FOLD 占位/先序/条目上限性质断言）/ path 前缀与 depth 语义 /
 * depth 界值 400 / 防越界矩阵双形态 / 404 与折叠恒空 / tree.ts 纪律源扫描
 * （零子进程 + fs 只读白名单）。
 * PT01-PT06（迭代 0057 / BK-0045）terminal handler 契约（ADR-0014 §7）：
 * ENABLED=0 降级 / ENABLED=1 建会话 + agentWrite 注入 + 审计 origin=agent /
 * out-session 形状 + 下游消费 / run 正交存续 / 内部通道满员护栏 /
 * 纪律源扫描与前端源锁（探针 A/B：lib.mjs startServer(port,{env}) 注入，
 * pty-sessions.mjs 先例；run 中止级联半面 = PT06 源扫描 + 手动 E2E M5 承载，
 * SPEC D9 定形；编号 PT 系 = BUG-0057-01 修复轮避让 0034 轮既有 termview
 * T01-T03 撞号）。
 * KB 组（迭代 0064 / BK-0019）：kb 管道后端（ADR-0020）——KB01-KB04 清单契约/
 * seed 可见性/检索等价（pristine 时 KB_EQ_ANCHORS 基线 deepEqual 零漂移机器锁，
 * output 事件 = retrieval→jsoncanvas 全保真 JSON 锚面）；KB05-KB11 上传管道
 * 正负例（201 五键契约 / 切分参数行为锚 500·450·50 / 415·400·413·空文档负例）
 * + 新语料可检索与同 filename 替换语义；主实例承载（零模型依赖零出站），
 * 上传目标库名固定 smoke-kb-*（替换语义跨轮幂等；残留属 gitignore 运行时区）。
 * MEM 组（迭代 0068 / BK-0018 · ADR-0024 §4.4）：跨 run 记忆工具组——MEM01
 * 默认关零漂移（mock 实例 MEMORY_ENABLED='' 钉空串 = 未配置语义，防开发者
 * .env 泄入；请求体 tools 键集零 memory_* + 无 🧠 注入 log + 本轮 token 命名域
 * 零写入）；MEM02-MEM05 开启实例（MEMORY_ENABLED=1 专用实例，MCP 两 env 空串
 * 钉值防泄漏；mock 端点 tool_call 两步循环 A02 同通道）：恰三键注入 + 🧠 sys
 * 锚 + 工具循环形态（node:delta 一次性）/ 跨 run 持久化 + SQLite 直查对账
 * （memoryRowsOf 只读直查，auditsOf 同款窄口径）/ list 前缀过滤-字典序-分页-
 * truncated / 负例不崩 run（BUG-0068-05 对齐现实：AI SDK 7 把 execute 异常转为
 * error tool-result 回灌模型、不传播至 llm catch——3 轮预算耗尽收束，安全核
 * ok:true/零落库/不截断如实锚定，可观测性缺口另立 backlog）；MEM06
 * capabilities 零污染（默认关与开启实例双 deepEqual，plain key 前缀派生零命中
 * 的机器证明）；MEM07 env fail-fast（MEMORY_ENABLED=abc 启动终止退出码 1 且
 * fatal 日志指明变量名与合法词形，PTY env fail-fast 先例形态）。
 * OE 组（迭代 0069 / BK-0020）：引擎 on-error 策略（ADR-0022 · issue#15 批复）——
 * OE01/OE02 未配置零漂移与 skip 显式等价（主实例 + skip 探针实例：node:error 恰 1
 * 终态、下游失活、run:done ok 不反映失败）；OE03/OE04 retry 耗尽降级与第 3 次成功
 * （retry 探针实例 + 进程内计数 mock 端点：http 节点经 ALLOW_PRIVATE_NET=1 回环触达，
 * 连接销毁 = 必失败（handler 对非 2xx 不抛错），服务端命中计数 = 恰 N 次尝试硬证据；
 * log warn 恰 2 条通报 + node:error 恰 1 次「已重试 2 次」概要 + 耗尽后下游失活 +
 * run:done ok 语义不变）；OE05 abort fail-fast（abort 探针实例：guard 拦截 = 确定性
 * 失败零出站，失败节点先于同级分支调度 → 同级分支与下游全部不再调度、run:done
 * ok:false/stopped:false、持久层 status='error'）；OE06 retry 退避等待期 stop 即时
 * 中断（stop 探针实例 30s 退避不拖穿：log「第 2 次尝试」后 stop → 8s 内收束
 * stopped:true、stopped 语义不污染）；OE07 env fail-fast 非法值 ×3（提前退出 code=1
 * + 报文指明变量名与约束）；OE08 边界值 0/5 · 0/60000 双实例健康通过。
 * OEN 组（迭代 0070 / BK-0048）：节点级 on-error 参数（ADR-0025 · issue#6 批复承继）
 * ——OEN01 显式哨兵「跟随全局」（主实例）：与 OE01 同型零漂移；OEN02 哨兵 + env
 * retry×2 承接（retry 探针：mock 恰 3 + warn 恰 2）；OEN03 节点=重试×1 压制 env=skip
 * （skip 探针 + ALLOW_PRIVATE_NET=1 回环触达：mock 恰 2 = 节点胜）；OEN04 节点=重试
 * 次数缺省（主实例 env 钉空 + ALLOW_PRIVATE_NET=1 触达计数 mock：恰 3 = env retries=0
 * 未使节点 retry 退化，陷阱破解机器证明）；OEN05 节点=中止 fail-fast（abort 探针：
 * 同级分支不再调度 + ok:false/stopped:false + status=error）；OEN06 节点=中止覆盖
 * env=retry（retry 探针：mock 恰 1 零重试 = 策略类型节点胜）；OEN07 循环子节点
 * per-call（retry 探针 + loop 闭包子图：sub() 逐 runNode 调用独立解析，mock 恰 2）。
 * 夹具复用 wfOeFail（扩展 params 入参）与六探针实例/oeMock，零新增探针实例与 mock。
 * ================================================================ */
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { validateEvent } from '@agentflow/shared';
import {
  Checker, SmokeFailError, api, ctxOf, deepEqual, getFreePort, openSse, preflight, sleep, startServer,
  REPO_ROOT,
} from './lib.mjs';
import { runMcpChecks } from './mcp-stubs.mjs';

/* ---------- 夹具（SPEC §7；params 显式给出，不依赖 DEFS 默认值） ---------- */
const WF = {
  name: 'smoke-crud',
  nodes: [{ id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'question', defv: '冒烟' } }],
  edges: [],
};
const WFMIN = {
  name: 'smoke-minimal',
  nodes: [
    { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'question', defv: '冒烟测试问题' } },
    { id: 2, type: 'prompt', x: 320, y: 100, params: { tpl: '问题：{{question}}' } },
  ],
  edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
  inputs: { question: '冒烟测试问题' },
};
const WFAPPR = {
  name: 'smoke-approval',
  nodes: [{ id: 1, type: 'approval', x: 100, y: 100, params: { role: '冒烟测试', to: '挂起' } }],
  edges: [],
  inputs: {},
};
/* E 组夹具工厂（迭代 0005 / BK-0007 · SPEC §6.2）：userinput → websearch(eng) */
const wfEng = (eng) => ({
  name: `smoke-eng-${eng}`,
  nodes: [
    { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'question', defv: '冒烟测试问题' } },
    { id: 2, type: 'websearch', x: 320, y: 100, params: { eng, max: 3 } },
  ],
  edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
  inputs: { question: '冒烟测试问题' },
});
/* K 组夹具工厂（迭代 0014 / BK-0022 · BUG-0012）：单 code 节点。K01/K03 刻意不给
 * code 参数——缺陷本体即「不显式给 code 时 DEFS 默认值合并出错配」，勿补 code
 * （豁免上方「params 显式给出」夹具约定，PRD 背景 5 已论证）。 */
const wfCode = (params, name) => ({
  name,
  nodes: [{ id: 1, type: 'code', x: 100, y: 100, params }],
  edges: [],
});
/* O 组夹具工厂（迭代 0033 / BK-0036）：userinput(defv) → webshow(url 兜底) */
const wfShow = (defv, url) => ({
  name: 'smoke-webshow',
  nodes: [
    { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'url', defv } },
    { id: 2, type: 'webshow',   x: 320, y: 100, params: { url } },
  ],
  edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
});
/* T 组夹具工厂（迭代 0057 / BK-0045 · SPEC §3.8）：prompt(tpl) → terminal；
 * chain 形态追加 terminal → termview（out-session object → in any 下游消费链）。 */
const wfTerm = (tpl, name, session, chain) => ({
  name: name || 'smoke-terminal',
  nodes: [
    { id: 1, type: 'prompt', x: 100, y: 100, params: { tpl } },
    { id: 2, type: 'terminal', x: 320, y: 100, params: { cmd: '', session: session || '' } },
    ...(chain ? [{ id: 3, type: 'termview', x: 540, y: 100, params: { lines: 200, autoscroll: true } }] : []),
  ],
  edges: [
    { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
    ...(chain ? [{ id: 2, fn: 2, fp: 0, tn: 3, tp: 0 }] : []),
  ],
});

/* KB 组夹具工厂（迭代 0064 / BK-0019 · SPEC §6）：userinput(defv=q) →
 * retrieval(kb,topk=3,th) → jsoncanvas——数组直 JSON.stringify 经 output 事件
 * 全保真透出，KB03/KB11 的 hits 深比对锚面（node:done 只携带 out 摘要）。 */
const wfKb = (kb, q, th, name) => ({
  name: name || 'smoke-kb-run',
  nodes: [
    { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'question', defv: q } },
    { id: 2, type: 'retrieval', x: 320, y: 100, params: { kb, topk: 3, th } },
    { id: 3, type: 'jsoncanvas', x: 540, y: 100, params: {} },
  ],
  edges: [
    { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
    { id: 2, fn: 2, fp: 0, tn: 3, tp: 0 },
  ],
});

/* OE 组夹具工厂（迭代 0069 / BK-0020 · ADR-0022 §2/§4）：根 userinput → 失败 http
 * 节点 → 下游 prompt（失活断言面）；sibling=true 时追加根的第二分支 prompt（fail-fast
 * 调度断言面：边序保证失败节点先于同级分支出队，失败即 break）。np（迭代 0070 /
 * BK-0048 · ADR-0025）：node#2 追加节点级 onError/onErrorRetries 键（缺省 undefined
 * = 既有 OE 用例逐字不变）。 */
const wfOeFail = (failUrl, name, sibling, np) => ({
  name,
  nodes: [
    { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'question', defv: '冒烟' } },
    { id: 2, type: 'http', x: 320, y: 100, params: { url: failUrl, m: 'GET', to: 5, ...(np || {}) } },
    { id: 3, type: 'prompt', x: 540, y: 100, params: { tpl: '下游 {{question}}' } },
    ...(sibling ? [{ id: 4, type: 'prompt', x: 540, y: 320, params: { tpl: '同级 {{question}}' } }] : []),
  ],
  edges: [
    { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
    { id: 2, fn: 2, fp: 0, tn: 3, tp: 0 },
    ...(sibling ? [{ id: 3, fn: 1, fp: 0, tn: 4, tp: 0 }] : []),
  ],
});

/* KB03 锚定字面量（SPEC §5 A/B 采集）：改造前基线 dist（2026-10-28 本轮 BUILD
 * 亲采，18 组 diff 零差异）经 handler 同参映射（topK=20/th=0.02 → ×4 归一 →
 * th 过滤 → topk=3）后的期望 hits——零漂移机器锁（pristine 分支 deepEqual 用）。 */
const KB_EQ_ANCHORS = [
  { kb: '产品手册 v2.3', q: '退货政策 7 天', hits: [
    { score: 0.5, src: '退货政策 §2.1', text: '商品自签收之日起 7 天内可申请无理由退货，需保持商品及包装完好、不影响二次销售；定制类商品与贴身衣物不支持无理由退货。' },
    { score: 0.3, src: '配送说明 §1', text: '现货商品 48 小时内发货，偏远地区追加 1-2 天；支持顺丰加急（补差价 15 元），大件商品由第三方物流配送并送上楼。' },
    { score: 0.21, src: '退货政策 §2.5', text: '退货退款将在质检通过后 3 个工作日内原路退回；优惠券与积分抵扣部分将按原比例退回，运费险可抵扣首重运费。' },
  ] },
  { kb: 'FAQ-售前', q: '优惠 券', hits: [
    { score: 0.37, src: 'FAQ-价格', text: '问：现在有什么优惠？答：新人首单立减 20 元，页面领券可叠加满 300 减 40；以商品详情页展示的活动为准。' },
    { score: 0.34, src: 'FAQ-企业采购', text: '问：企业采购有优惠吗？答：企业认证后享批量阶梯价与月结账期，50 台以上可联系大客户经理定制方案。' },
  ] },
  { kb: '工单历史 2026', q: '退款多久到账', hits: [
    { score: 0.82, src: '工单 #8842 · 已解决', text: '用户反馈退款未到账：云闪付渠道退款周期较长，财务核查后第 4 个工作日原路退回，已短信告知用户。' },
  ] },
];

/* CAP 组期望字面量（迭代 0039 / BK-0049 · SPEC §4.1/§7）：builtin 工具名/描述自
 * TOOL_SPECS（tools.ts:145-158）逐条誊取、服务级描述与 skills 五条自 app.js:105-123
 * 誊取——迁移保真（id/工具名与前端回退集逐字一致）+ 双源收口（描述 = 后端派生值）
 * 的双锁锚点；与 tools/pixel-gate/gate.mjs CAP_FIXTURE 同源同文。 */
const CAP_EXPECTED_BUILTIN = [
  { id: 'filesystem', name: 'filesystem', desc: '本地文件读写',
    tools: [ { n: 'read_file', d: '读取沙箱目录内的文本文件' },
             { n: 'write_file', d: '将文本写入沙箱目录内的文件' },
             { n: 'list_directory', d: '列出沙箱目录的内容' } ] },
  { id: 'fetch', name: 'fetch', desc: '网页抓取',
    tools: [ { n: 'fetch', d: '抓取一个 http(s) URL，返回正文摘录' },
             { n: 'download', d: '下载 URL 资源保存到沙箱目录' } ] },
  { id: 'sqlite', name: 'sqlite', desc: '数据库查询',
    tools: [ { n: 'query', d: '在沙箱数据库执行 SELECT 查询并返回行集（上限 100 行；仅限沙箱数据库，不能访问其他数据库文件）' },
             { n: 'execute', d: '在沙箱数据库执行写入或结构 SQL（CREATE/INSERT/UPDATE/DELETE 等，多语句以 ; 分隔；仅限沙箱数据库）' } ] },
  { id: 'browser', name: 'browser', desc: '浏览器自动化',
    tools: [ { n: 'navigate', d: '（未实现）打开页面' },
             { n: 'click', d: '（未实现）点击元素' },
             { n: 'screenshot', d: '（未实现）截屏' } ] },
  { id: 'web-search', name: 'web-search', desc: '联网搜索',
    tools: [ { n: 'search', d: '联网搜索，返回标题/链接/摘要' },
             { n: 'news', d: '检索某话题的最新新闻' } ] },
];
const CAP_EXPECTED_SKILLS = [
  { id: 'ppt-builder',  name: 'PPT 生成器',  desc: '根据大纲生成演示文稿' },
  { id: 'doc-writer',   name: '文档撰写',    desc: '长文写作与润色' },
  { id: 'data-analyst', name: '数据分析',    desc: '表格解读与图表建议' },
  { id: 'coder',        name: '编程助手',    desc: '代码生成与审查' },
  { id: 'translator',   name: '多语言翻译',  desc: '中英日韩互译' },
];

const C = new Checker();
const CLEAN = { runIds: [], wfIds: [] };
let srv = null;
let mockModel = null;   /* G 组：进程内 mock 模型端点（迭代 0015） */
let mockSrv = null;     /* G 组：AI_BASE_URL 指向 mock 的第二实例 */
let minimalSrv = null;  /* G 组：全密钥空串压制的第三实例（降级路径确定性） */
let zSrv = null;        /* Z 组：启动扫尾专用实例（迭代 0019 / BK-0011，SIGKILL 后同端口重启） */
let capSrv = null;      /* CAP 组：能力清单第二实例（迭代 0039 / BK-0049，env 注册外部 MCP 条目） */
let tSrvA = null;       /* T 组探针 A：PTY_ENABLED=1 实例（迭代 0057 / BK-0045） */
let tSrvB = null;       /* T 组探针 B：PTY_ENABLED=1 + PTY_MAX_SESSIONS=1 实例（T05 满员护栏） */
let memSrv = null;      /* MEM 组探针：MEMORY_ENABLED=1 实例（迭代 0068 / BK-0018） */
let oeSrvSkip = null;   /* OE 组探针：ON_ERROR=skip 实例（迭代 0069 / BK-0020，OE02） */
let oeSrvRetry = null;  /* OE 组探针：ON_ERROR=retry + 计数 mock 实例（OE03/OE04） */
let oeSrvAbort = null;  /* OE 组探针：ON_ERROR=abort 实例（OE05） */
let oeSrvStop = null;   /* OE 组探针：ON_ERROR=retry + 30s 退避实例（OE06 stop 窗） */
let oeSrvB1 = null;     /* OE 组探针：边界值下端（RETRIES=0 + DELAY=0，OE08） */
let oeSrvB2 = null;     /* OE 组探针：边界值上端（RETRIES=5 + DELAY=60000，OE08） */
/* OEN 组（迭代 0070 / BK-0048）零新增探针实例：复用 oeSrvSkip（OEN03，env 加
 * ALLOW_PRIVATE_NET=1 回环触达计数 mock）/ oeSrvRetry（OEN02/OEN06/OEN07）/
 * oeSrvAbort（OEN05）与主实例（OEN01/OEN04，env 加 ALLOW_PRIVATE_NET=1 同径触达）。 */
let oeMock = null;      /* OE 组：进程内计数 mock 端点（连接销毁=必失败 / 命中数=尝试次数） */
let cleanupPromise = null;

/* ---------- G 组基础设施（迭代 0015 / BK-0016 · SPEC §3.4-2/3） ---------- */
/* 进程内 OpenAI 兼容 mock 端点：接受任何 POST（@ai-sdk/openai-compatible 发
 * ${AI_BASE_URL}/chat/completions）；三块固定文本、块间 400ms 延时流出（总流出
 * ≥800ms，为 G07 停止窗与 G08 并发窗留确定性时序）；逐请求记录 body 供 G06
 * 续聊历史断言；客户端中止（stop abort）后写失败容忍。 */
const MOCK_FULL = '你好，我是会话冒烟助手。';
const MOCK_CHUNKS = ['你好，', '我是会话', '冒烟助手。'];
function startMockModel() {
  return new Promise((resolve) => {
    const requests = [];
    const m = http.createServer((req, res) => {
      const bufs = [];
      req.on('data', (c) => bufs.push(c));
      req.on('end', async () => {
        let body = null;
        try { body = JSON.parse(Buffer.concat(bufs).toString('utf8')); } catch { /* 非 JSON 容忍 */ }
        requests.push(body);
        /* 裁决路由（迭代 0016 / BK-0017 · SPEC §4.6）：generateText 走 provider doGenerate
         * ——请求体不带 stream 键、期望 application/json 的 chat.completion；streamText（G 组
         * 会话流量）恒带 stream:true → SSE 分块。按最后一条 user 消息 content（含审批节点
         * 标题）路由三态+1。 */
        if (body?.stream !== true) {
          const lastUser = [...(body?.messages ?? [])].reverse().find((m) => m?.role === 'user');
          const c = String(lastUser?.content ?? '');
          /* A 组路由（迭代 0031 / BK-0033 · SPEC §7）：「智能体」前缀关键词与互审路由正交；
           * 工具轮次以 messages 是否含 role:'tool' 区分（agent 预算循环续接后带 tool 结果）。
           * tool_call 形状 = OpenAI 标准 chat.completion（A02 首跑若红以 mock 实收为准修形状，不改被测代码）。 */
          const hasToolMsg = (body?.messages ?? []).some((m) => m?.role === 'tool');
          const agentToolCallMsg = { role: 'assistant', content: null, tool_calls: [
            { id: 'call_a', type: 'function', function: {
              name: 'sqlite_execute',
              arguments: '{"sql":"CREATE TABLE IF NOT EXISTS agent_smoke(k TEXT);INSERT INTO agent_smoke VALUES(1)"}',
            } },
          ] };
          const agentJson = (message, finish) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              id: 'chatcmpl-agent', object: 'chat.completion', created: 1700000000, model: 'mock-model',
              choices: [{ index: 0, message, finish_reason: finish }],
              usage: { prompt_tokens: 9, completion_tokens: 9, total_tokens: 18 },
            }));
          };
          if (c.includes('智能体工具轮')) {          /* 步1 → tool_call；步2（已有 tool 消息）→ 终文本 */
            agentJson(hasToolMsg ? { role: 'assistant', content: '智能体工具轮完成' } : agentToolCallMsg,
              hasToolMsg ? 'stop' : 'tool_calls');
            return;
          }
          if (c.includes('智能体预算穷尽')) {        /* 恒返 tool_call（永不终文本）→ 预算必然穷尽 */
            agentJson(agentToolCallMsg, 'tool_calls');
            return;
          }
          if (c.includes('智能体慢轮')) {            /* 应答前留 4s 中止窗口（A04 stop 竞速） */
            await sleep(4000);                       /* 中止后写失败容忍（与流式支同语义） */
          }
          /* MEM 组路由（迭代 0068 / BK-0018 · ADR-0024 §4.4）：标记词与互审/智能体
           * 路由正交；记忆键以 mem:smoke:<token>: 命名域隔离（token 取自标记词，
           * 跨轮重跑幂等——upsert 覆盖不膨胀）。tool_call 形状与 A02 同款
           * （OpenAI chat.completion 标准）；count 参数 = zod 数值（llm.ts
           * /数量|count/i 派生），offset = 字符串（与 TOOL_SPECS schema 声明一致）。 */
          const memTokOf = (s) => (s.match(/mem:smoke:([a-z0-9]+):/) ?? [])[1] ?? '';
          const memToolCall = (name, argsObj) => ({ role: 'assistant', content: null, tool_calls: [
            { id: 'call_mem', type: 'function', function: { name, arguments: JSON.stringify(argsObj) } },
          ] });
          const memToolMsgs = () => (body?.messages ?? []).filter((m) => m?.role === 'tool');
          const memToolVal = (m) => {   /* 工具结果载值提取（字符串 JSON 或分段数组两形态容忍） */
            const raw = m?.content;
            const txt = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map((p) => p?.text ?? '').join('') : '';
            try { return JSON.parse(txt); } catch { return txt; }
          };
          if (c.includes('mem03 写入')) {
            const tok = memTokOf(c);
            agentJson(hasToolMsg ? { role: 'assistant', content: `记忆写入完成 mem:smoke:${tok}` }
              : memToolCall('memory_set', { key: `mem:smoke:${tok}:alpha`, value: '跨run记忆值' }),
              hasToolMsg ? 'stop' : 'tool_calls');
            return;
          }
          if (c.includes('mem03 读取')) {
            const tok = memTokOf(c);
            if (hasToolMsg) {
              const j = memToolVal(memToolMsgs()[memToolMsgs().length - 1]);
              agentJson({ role: 'assistant', content: `读回:${j && j.found ? j.value : '(未命中)'}` }, 'stop');
            } else {
              agentJson(memToolCall('memory_get', { key: `mem:smoke:${tok}:alpha` }), 'tool_calls');
            }
            return;
          }
          if (c.includes('mem04 备列表')) {
            const tok = memTokOf(c);
            const n = memToolMsgs().length;          /* 第 1 轮 set l1 → 第 2 轮 set 域外键 → 第 3 轮终文本（llm 3 轮预算内） */
            const calls = [
              memToolCall('memory_set', { key: `mem:smoke:${tok}:l1`, value: '列表甲' }),
              memToolCall('memory_set', { key: `zz${tok}other`, value: '外域' }),
            ];
            agentJson(n < calls.length ? calls[n] : { role: 'assistant', content: '列表备齐' },
              n < calls.length ? 'tool_calls' : 'stop');
            return;
          }
          if (c.includes('mem04 查列表')) {          /* 两页：offset 0 → offset 1 → 终文本汇总 */
            const tok = memTokOf(c);
            const n = memToolMsgs().length;
            if (n < 2) {
              agentJson(memToolCall('memory_list', { prefix: `mem:smoke:${tok}:`, count: 1, offset: String(n) }), 'tool_calls');
            } else {
              const pages = memToolMsgs().map((m) => {
                const j = memToolVal(m);
                return `${(j?.entries ?? []).map((e) => e.key).join(',')}|trunc=${j?.truncated}`;
              });
              agentJson({ role: 'assistant', content: `列表页:${pages.join(' ; ')}` }, 'stop');
            }
            return;
          }
          if (c.includes('mem04 翻页')) {            /* 第三页：offset 2 → 空页 + truncated=false → 终文本 */
            const tok = memTokOf(c);
            if (hasToolMsg) {
              const j = memToolVal(memToolMsgs()[memToolMsgs().length - 1]);
              agentJson({ role: 'assistant', content: `列表页:${(j?.entries ?? []).map((e) => e.key).join(',')}|trunc=${j?.truncated}` }, 'stop');
            } else {
              agentJson(memToolCall('memory_list', { prefix: `mem:smoke:${tok}:`, count: 1, offset: '2' }), 'tool_calls');
            }
            return;
          }
          const hasTools = Array.isArray(body?.tools) ? body.tools.length > 0   /* BUG-0068-03：AI SDK 7 数组形态，防空数组 truthy 陷阱 */
            : !!(body?.tools && typeof body.tools === 'object');
          if (c.includes('mem05 负键')) {            /* 非法 key：恒返 tool_call——AI SDK 7 把 execute 异常转为
             error tool-result 回灌模型继续循环（不传播至 llm.ts catch 降级通道，BUG-0068-05 探针实证），3 轮预算耗尽 */
            agentJson(hasTools
              ? memToolCall('memory_set', { key: 'bad key!', value: 'x' })
              : { role: 'assistant', content: '负键降级完成' }, hasTools ? 'tool_calls' : 'stop');
            return;
          }
          if (c.includes('mem05 负值')) {            /* value 超 4096 字节：同上，如实 throw 不截断 */
            const tok = memTokOf(c);
            agentJson(hasTools
              ? memToolCall('memory_set', { key: `mem:smoke:${tok}:big`, value: 'x'.repeat(4097) })
              : { role: 'assistant', content: '负值降级完成' }, hasTools ? 'tool_calls' : 'stop');
            return;
          }
          let content = '{"verdict":"allow","reason":"mock 允许：符合规范"}';
          if (c.includes('互审驳回')) content = '{"verdict":"deny","reason":"mock 拒绝：内容不合规"}';
          else if (c.includes('互审坏输出')) content = '抱歉，我认为这个请求无法用 JSON 回答。';
          else if (c.includes('互审错形状')) content = '{"verdict":"maybe","reason":"不确定"}';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'chatcmpl-verdict', object: 'chat.completion', created: 1700000000, model: 'mock-model',
            choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 9, completion_tokens: 9, total_tokens: 18 },
          }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        const writeChunk = (delta, finish) => {
          res.write(`data: ${JSON.stringify({
            id: 'chatcmpl-mock', object: 'chat.completion.chunk', created: 1700000000, model: 'mock-model',
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`);
        };
        try {
          for (let i = 0; i < MOCK_CHUNKS.length; i += 1) {
            if (i > 0) await sleep(400);   /* 首块无延时（chat 发出后 ~即时可达） */
            writeChunk(i === 0 ? { role: 'assistant', content: MOCK_CHUNKS[i] } : { content: MOCK_CHUNKS[i] }, null);
          }
          writeChunk({}, 'stop');
          res.write('data: [DONE]\n\n');
          res.end();
        } catch { /* 客户端断开（stop abort）后写失败容忍 */ }
      });
    });
    getFreePort().then((port) => {
      m.listen(port, '127.0.0.1', () => resolve({ srv: m, url: `http://127.0.0.1:${port}`, requests }));
    });
  });
}

/* POST /api/v1/sessions/:id/chat 的 SSE 消费（lib.mjs openSse 硬编码 /api/v1/run
 * 且 lib.mjs 不在本迭代白名单——帧解析/waitFor/waitEnd 以本地函数复制，
 * 语义与 lib.mjs:126-189 互逆一致）。 */
async function chatSse(base, sessionId, body, timeoutMs = 60000) {
  const res = await fetch(`${base}/api/v1/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status !== 200) throw new Error(`POST /api/v1/sessions/${sessionId}/chat 意外状态 ${res.status}`);
  const events = [];
  const waiters = new Set();
  let ended = false;
  let endErr = null;
  let endResolve;
  const endPromise = new Promise((r) => { endResolve = r; });
  const wake = () => { for (const w of [...waiters]) w(); waiters.clear(); };
  void (async () => {
    try {
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, i);
          buf = buf.slice(i + 2);
          for (const line of frame.split('\n')) {
            if (!line.startsWith('data: ')) continue;   /* `: ping` 等注释行跳过 */
            try { events.push(JSON.parse(line.slice(6))); } catch { /* 非法帧忽略 */ }
          }
        }
      }
    } catch (e) { endErr = e; }
    ended = true;
    wake();
    endResolve();
  })();
  return {
    events,
    async waitFor(predicate, timeoutMs2) {
      const t0 = Date.now();
      for (;;) {
        const hit = events.find(predicate);
        if (hit) return hit;
        if (ended) throw endErr ?? new Error('SSE 流已收束，未等到期望事件');
        if (Date.now() - t0 > timeoutMs2) throw new Error(`SSE 等待超时（${timeoutMs2}ms，已收 ${events.length} 事件）`);
        await new Promise((resolve) => {
          const w = () => { clearTimeout(timer); waiters.delete(w); resolve(); };
          const timer = setTimeout(() => { waiters.delete(w); resolve(); }, 250);
          waiters.add(w);
        });
      }
    },
    async waitEnd(ms = 10000) {
      const ok = await Promise.race([endPromise.then(() => true), sleep(ms).then(() => false)]);
      if (ok && endErr) throw endErr;
      return ok;
    },
  };
}

/* ---------- V 组基础设施（迭代 0016 / BK-0017 · SPEC §5/§5.1） ---------- */
/* auditsOf：审计只读直查（lib.mjs「不读写 data/agentflow.db」边界的窄口径例外，SPEC §5.1
 * 论证）——readonly/单表单 SELECT/finally close；仅 run waitEnd 后调用；三实例共享 DB。 */
function auditsOf(runId) {
  const db = new Database(path.join(REPO_ROOT, 'data', 'agentflow.db'), { readonly: true, fileMustExist: true });
  try {
    return db.prepare(
      'SELECT id, run_id, node_id, reviewer, mode, verdict, reason, created_at FROM approval_audits WHERE run_id = ? ORDER BY id ASC',
    ).all(runId);
  } finally { db.close(); }
}

/* V 组夹具工厂（SPEC §5）：审官节点一律 bypass:true——只跳过审官自身拓扑执行，
 * 不影响被引为审官（每 run 恰一次裁决调用、零多余流式调用）。 */
const wfReview = (title, to, reviewer = 'llm') => ({
  name: `smoke-review-${title}-${to}`,
  nodes: [
    { id: 1, type: 'approval', x: 100, y: 100, title, params: { role: 'node:2', to } },
    reviewer === 'llm'
      ? { id: 2, type: 'llm', x: 320, y: 100, title: '审官A', bypass: true, params: { model: 'MockChat', sys: '你是审官' } }
      : { id: 2, type: 'prompt', x: 320, y: 100, title: '审官B', bypass: true, params: { tpl: 'x' } },
  ],
  edges: [],
});
/* 单 approval 节点夹具（V04/V05：不存在审官 id / 普通文本 role 的人工对照） */
const wfPlain = (name, role, to) => ({ name, nodes: [{ id: 1, type: 'approval', x: 100, y: 100, title: '人工审批', params: { role, to } }], edges: [] });

/* ---------- T 组基础设施（迭代 0057 / BK-0045 · SPEC §3.8） ---------- */
/* pty_audits 只读直查（V 组 auditsOf 同款窄口径例外：readonly/单表单 SELECT/
 * finally close；表未建视 0 行，pty-sessions.mjs 先例）。 */
function ptyAuditsOf(sessionId) {
  const dbFile = path.join(REPO_ROOT, 'data', 'agentflow.db');
  if (!existsSync(dbFile)) return [];
  const db = new Database(dbFile, { readonly: true, fileMustExist: true });
  try {
    return db.prepare(
      'SELECT id, session_id, origin, kind, summary, reason, danger, pid, created_at FROM pty_audits WHERE session_id = ? ORDER BY id ASC',
    ).all(sessionId);
  } finally { db.close(); }
}

/* ---------- MEM 组基础设施（迭代 0068 / BK-0018 · ADR-0024 §4.4）----------
 * memory_entries 只读直查（auditsOf/ptyAuditsOf 同款窄口径例外：readonly/
 * 单表单 SELECT/finally close；表未建视 0 行——默认关实例不建表，先于开启
 * 实例启动的直查必须容忍表缺失）。LIKE 前缀转义与服务端 likePrefixOf 同构。 */
function memoryRowsOf(keyPrefix) {
  const dbFile = path.join(REPO_ROOT, 'data', 'agentflow.db');
  if (!existsSync(dbFile)) return [];
  let db = null;
  try {
    db = new Database(dbFile, { readonly: true, fileMustExist: true });
    const has = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'memory_entries'").get();
    if (!has) return [];
    return db.prepare(
      "SELECT key, value, bytes, created_at, updated_at FROM memory_entries WHERE key LIKE ? ESCAPE '\\' ORDER BY key",
    ).all(keyPrefix.replace(/[\\%_]/g, (c) => '\\' + c) + '%');
  } finally { try { if (db) db.close(); } catch { /* 已关闭 */ } }
}
function memoryTableExists() {
  const dbFile = path.join(REPO_ROOT, 'data', 'agentflow.db');
  if (!existsSync(dbFile)) return false;
  let db = null;
  try {
    db = new Database(dbFile, { readonly: true, fileMustExist: true });
    return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'memory_entries'").get();
  } finally { try { if (db) db.close(); } catch { /* 已关闭 */ } }
}

/* ---------- OE 组基础设施（迭代 0069 / BK-0020 · ADR-0022） ----------
 * 进程内计数 mock 端点：/oe-fail-always 恒失败、/oe-fail-twice 前两次失败第三次
 * 成功；「失败」= 销毁连接（req.socket.destroy()）而非 5xx——http 节点 handler
 * 对非 2xx 不抛错（fetch 语义），连接级失败才产生 handler 异常；按路径累计命中
 * 计数 = 服务端视角的恰好尝试次数硬证据。仅回环监听，经探针实例
 * ALLOW_PRIVATE_NET=1 被 http 节点触达（既有 env 语义，零新授权面）。 */
function startOeMock() {
  return new Promise((resolve) => {
    const hits = new Map();   // path → 请求命中数
    const srv = http.createServer((req, res) => {
      const p = String(req.url || '/').split('?')[0];
      const n = (hits.get(p) || 0) + 1;
      hits.set(p, n);
      if (p === '/oe-fail-always' || p.startsWith('/oen') || (p === '/oe-fail-twice' && n <= 2)) {
        /* /oen*（OEN 组，迭代 0070）：恒失败路径——命中即销毁连接（OE03 同款确定性失败源） */
        req.socket.destroy();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, n }));
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port, hits }));
  });
}

/* ---------- C 组：自清理与零残留（finally 内；尽力而为 + 如实报告，不抛） ---------- */
async function doCleanup() {
  if (!srv) {
    console.log('SKIP C01-C04（无服务实例，无可清理对象）');
    return;
  }
  /* 清理请求逐个兜底：服务不可达时记 0 而非抛出（§8 汇总行必须到达） */
  const safeApi = async (method, urlPath, body) => {
    try {
      return await api(srv.base, method, urlPath, body);
    } catch (e) {
      return { status: 0, json: null, text: String(e), method, url: urlPath, ctx: `网络错误：${e}` };
    }
  };
  for (const id of CLEAN.runIds.filter(Boolean)) {                        /* C01 */
    let r = await safeApi('DELETE', `/api/v1/runs/${id}`);
    if (r.status === 409) {                      /* 仍活动（仅失败路径会发生）：stop 后重删 */
      await safeApi('POST', `/api/v1/run/${id}/stop`, {});
      await sleep(1000);
      r = await safeApi('DELETE', `/api/v1/runs/${id}`);
    }
    /* 404 = 已在断言中删除（如 D06 收尾后即删），与 C02 同语义容忍 */
    C.check(r.status === 200 || r.status === 404, 'C01', `清理自建 run ${id.slice(0, 8)}…（DELETE → 200；404=已删容忍）`,
      { expected: '200 或 404', actual: r.status, ctx: ctxOf(r) });
  }
  for (const id of CLEAN.wfIds.filter(Boolean)) {                          /* C02 */
    const r = await safeApi('DELETE', `/api/v1/workflows/${id}`);
    C.check(r.status === 200 || r.status === 404, 'C02', `清理自建 workflow ${id.slice(0, 8)}…（404=已删，容忍）`,
      { expected: '200 或 404', actual: r.status, ctx: ctxOf(r) });
  }
  const wl = await safeApi('GET', '/api/v1/workflows');                    /* C03 */
  const rl = await safeApi('GET', '/api/v1/runs?limit=100');
  const wfLeft = (wl.json?.workflows ?? []).filter((x) => CLEAN.wfIds.includes(x.id));
  const runLeft = (rl.json?.runs ?? []).filter((x) => CLEAN.runIds.includes(x.id));
  C.check(wl.status === 200 && rl.status === 200 && wfLeft.length === 0 && runLeft.length === 0,
    'C03', '复查：workflows 与 runs 列表均不含任何自建 id（零残留）',
    { expected: '自建 id 0 条', actual: `workflow 残留 ${wfLeft.length} / run 残留 ${runLeft.length}`, ctx: ctxOf(rl) });
  /* SPEC §5.6 时序：kill() → 3s 未退 → SIGKILL → 再等 1s */
  try { srv.child.kill(); } catch { /* 已退出 */ }
  let exited = await Promise.race([srv.exitPromise.then(() => true), sleep(3000).then(() => false)]);
  if (!exited) { try { srv.child.kill('SIGKILL'); } catch { /* 已退出 */ } }
  exited = await Promise.race([srv.exitPromise.then(() => true), sleep(1000).then(() => false)]);
  C.check(exited, 'C04', 'server 子进程已终止（kill → 3s → SIGKILL 兜底）',   /* C04 */
    { expected: 'exit 事件到达', actual: exited ? '已终止' : '未观察到退出' });
  /* G 组实例收尾（迭代 0015；沿 C04 kill 模式，尽力而为不计断言）；Z 组/CAP 组实例同批（迭代 0019/0039）；T 组探针同批（迭代 0057）；OE 组探针同批（迭代 0069）；MEM 探针同批（迭代 0068） */
  for (const inst of [mockSrv, minimalSrv, zSrv, capSrv, tSrvA, tSrvB, oeSrvSkip, oeSrvRetry, oeSrvAbort, oeSrvStop, oeSrvB1, oeSrvB2, memSrv]) {
    if (!inst) continue;
    try { inst.child.kill(); } catch { /* 已退出 */ }
    let ex = await Promise.race([inst.exitPromise.then(() => true), sleep(3000).then(() => false)]);
    if (!ex) { try { inst.child.kill('SIGKILL'); } catch { /* 已退出 */ } }
    await Promise.race([inst.exitPromise.then(() => true), sleep(1000).then(() => false)]);
  }
  if (mockModel) { try { await new Promise((r) => mockModel.srv.close(() => r())); } catch { /* 已关闭 */ } }
  if (oeMock) { try { await new Promise((r) => oeMock.srv.close(() => r())); } catch { /* 已关闭 */ } }
}
function cleanup() {
  if (!cleanupPromise) cleanupPromise = doCleanup();
  return cleanupPromise;
}

/* ---------- 断言主体（SPEC §6；全部走 /api/v1 正式命名空间） ---------- */
async function main() {
  /* P 组：前置（P01/P02） */
  for (const d of preflight()) {
    C.ok(d.exists, d.id, `${d.file} 在位`,
      { expected: '存在', actual: d.exists ? '存在' : `缺失（请先在仓库根执行 ${d.buildCmd}）`, ctx: `file: ${d.abs}` });
  }
  /* M 组：MCP 未实现工具如实降级离线断言（迭代 0009 / BK-0005 · mcp-stubs.mjs）
   * 纯离线、不 fail-fast：失败计入汇总，不影响后续组（SPEC §6.1 挂接位点） */
  await runMcpChecks(C);
  const port = await getFreePort();

  /* H 组：起进程 + 健康等待（H01）；env 空串双重压制 BOCHA_API_KEY/SEARXNG_URL
   * （SPEC §6.1：.env 不覆盖已有键 + config 空串归一为未配置 → E 组受控环境）；
   * ON_ERROR 三键空串同径钉空（迭代 0069：OE01「未配置零漂移」前提防开发者 env 泄入）；
   * ALLOW_PRIVATE_NET=1（迭代 0070：OEN04 节点级重试需回环触达计数 mock，
   * 既有 env 语义——OE01 断言不涉失败成因，其余主实例用例零 http 出站面） */
  try {
    srv = await startServer(port, { env: { BOCHA_API_KEY: '', SEARXNG_URL: '', ON_ERROR: '', ON_ERROR_RETRIES: '', ON_ERROR_RETRY_DELAY_MS: '', ALLOW_PRIVATE_NET: '1' } });
  } catch (e) {
    C.fail('H01', 'GET /api/v1/health → 200 且 ok===true',
      { expected: '200 + ok:true', actual: String(e.message ?? e), ctx: `PORT=${port}` });
    if (e.logTail) console.log(`---- server 日志尾（末 200 行）----\n${e.logTail}`);
    throw new SmokeFailError('H01');
  }
  C.ok(srv.health.status === 200 && srv.health.json?.ok === true, 'H01', 'GET /api/v1/health → 200 且 ok===true',
    { expected: '200 + ok:true', actual: `${srv.health.status} ${JSON.stringify(srv.health.json)}`, ctx: `GET /api/v1/health（PORT=${port}）` });

  /* W 组：workflows CRUD 往返（W01-W07） */
  const w1 = await api(srv.base, 'PUT', '/api/v1/workflows', WF);
  C.ok(w1.status === 200 && typeof w1.json?.id === 'string' && w1.json.id !== '' && typeof w1.json?.updated_at === 'number',
    'W01', 'PUT /workflows 新建 → 返回非空 id + 数字 updated_at',
    { expected: '200 + {id, updated_at}', actual: `${w1.status} ${w1.text.slice(0, 120)}`, ctx: ctxOf(w1) });
  const wfId = w1.json.id;
  CLEAN.wfIds.push(wfId);

  const wf2Body = { ...WF, name: 'smoke-crud-v2' };
  const w2 = await api(srv.base, 'PUT', `/api/v1/workflows/${wfId}`, wf2Body);
  C.ok(w2.status === 200 && w2.json?.id === wfId, 'W02', 'PUT /workflows/:id 更新 → 返回 id===路径 id（路径优先）',
    { expected: `id === ${wfId}`, actual: `${w2.status} ${w2.text.slice(0, 120)}`, ctx: `${ctxOf(w2)} | req.name=${wf2Body.name}` });

  const w3 = await api(srv.base, 'GET', '/api/v1/workflows');
  C.includes(w3.json?.workflows, (x) => x?.id === wfId, `列表含自建 id ${wfId.slice(0, 8)}…`,
    'W03', 'GET /workflows 列表含自建 id', ctxOf(w3));

  const w4 = await api(srv.base, 'GET', `/api/v1/workflows/${wfId}`);
  C.ok(w4.status === 200 && w4.json?.id === wfId && w4.json?.updated_at >= w2.json.updated_at
    && deepEqual({ name: w4.json?.name, nodes: w4.json?.nodes, edges: w4.json?.edges },
      { name: wf2Body.name, nodes: wf2Body.nodes, edges: wf2Body.edges }),
  'W04', 'GET /workflows/:id 详情与 W02 所存深相等（name/nodes/edges + updated_at 不回退）',
  { expected: '与 W02 body 深相等', actual: w4.status === 200 ? w4.text.slice(0, 160) : `status ${w4.status}`, ctx: ctxOf(w4) });

  const w5 = await api(srv.base, 'DELETE', `/api/v1/workflows/${wfId}`);
  C.ok(w5.status === 200 && w5.json?.ok === true, 'W05', 'DELETE /workflows/:id → 200 {ok:true}',
    { expected: '200 {ok:true}', actual: `${w5.status} ${w5.text.slice(0, 80)}`, ctx: ctxOf(w5) });

  const w6 = await api(srv.base, 'GET', `/api/v1/workflows/${wfId}`);
  C.ok(w6.status === 404 && w6.json?.error === 'workflow not found', 'W06', '删除后 GET → 404 {error:"workflow not found"}',
    { expected: '404 workflow not found', actual: `${w6.status} ${w6.text.slice(0, 80)}`, ctx: ctxOf(w6) });

  const w7 = await api(srv.base, 'DELETE', `/api/v1/workflows/${wfId}`);
  C.eq(w7.status, 404, 'W07', '再次 DELETE → 404（再删反例）', ctxOf(w7));

  { /* W08/W09 · 静态托管正路径护栏（迭代 0040 / BK-0052 · REQ-0052-03）：GET / 与
       GET /index.html → 200 + text/html + 响应体与构建产物逐字相等（Windows 下
       sendFile 绝对路径 404 的回归锚，该路由首次获得机器护栏）。fetch 直连：
       api() 不透出 Content-Type，沿 chatSse 直连前例；触达通道按本轮 PRD 明示
       扩至静态路由（非 /api/v1/*）。 */
    const distIndex = readFileSync(path.join(REPO_ROOT, 'apps', 'web', 'dist', 'index.html'), 'utf8');
    for (const [id, urlPath] of [['W08', '/'], ['W09', '/index.html']]) {
      const r = await fetch(`${srv.base}${urlPath}`, { signal: AbortSignal.timeout(15000) });
      const body = await r.text();
      C.ok(r.status === 200 && (r.headers.get('content-type') ?? '').includes('text/html') && body === distIndex,
        id, `GET ${urlPath} → 200、Content-Type 含 text/html、响应体与 apps/web/dist/index.html 逐字相等`,
        { expected: '200 text/html + body === dist/index.html',
          actual: `${r.status} ${r.headers.get('content-type') ?? '(无 Content-Type)'} · body ${body.length} 字符${body === distIndex ? `（= dist ${distIndex.length}）` : `（≠ dist ${distIndex.length}）`}：${JSON.stringify(body.slice(0, 60))}`,
          ctx: `GET ${urlPath}（主实例；P01 已保证 dist 在位）` });
    }
  }

  /* N 组：参数反例（N01-N03） */
  const n1 = await api(srv.base, 'POST', '/api/v1/run', { name: 'x', nodes: {} });
  C.ok(n1.status === 400 && n1.json?.error === 'body.nodes 必须是数组', 'N01', 'POST /run nodes 非数组 → 400 {error:"body.nodes 必须是数组"}',
    { expected: '400 body.nodes 必须是数组', actual: `${n1.status} ${n1.text.slice(0, 80)}`, ctx: `${ctxOf(n1)} | req.nodes={}` });
  for (const [id, lim] of [['N02', 0], ['N03', 101]]) {
    const r = await api(srv.base, 'GET', `/api/v1/runs?limit=${lim}`);
    C.ok(r.status === 400 && r.json?.error === 'limit 必须是 1-100 的整数', id, `GET /runs?limit=${lim} → 400`,
      { expected: '400 limit 必须是 1-100 的整数', actual: `${r.status} ${r.text.slice(0, 80)}`, ctx: ctxOf(r) });
  }

  /* CAP 组：能力清单端点（CAP01-CAP05 · 迭代 0039 / BK-0049 · SPEC §7）——纯 HTTP
   * 断言不掺流式时序；CAP01-CAP04 主实例（无 MCP env，零模型依赖零出站），
   * CAP05 第二实例（env 注册外部条目 + 内置 id 冲突条；注册 URL 指向 discard
   * 端口 9，端点零出站不拨打，SPEC §4.3）。 */
  { /* CAP01 · builtin 五条全字段 deepEqual（id/工具名迁移保真 + 描述收口双锁） */
    const cap1 = await api(srv.base, 'GET', '/api/v1/capabilities');
    C.ok(cap1.status === 200 && deepEqual(cap1.json?.mcp?.builtin, CAP_EXPECTED_BUILTIN),
      'CAP01', 'GET /capabilities → 200；mcp.builtin 与迁移期望字面量全字段 deepEqual（id/name/desc/tools 的 n/d 逐字——无 env 时行为 = 现前端回退集等价，双源收口）',
      { expected: 'builtin 五条 deepEqual', actual: cap1.status === 200 ? JSON.stringify(cap1.json?.mcp?.builtin).slice(0, 220) : `${cap1.status} ${cap1.text.slice(0, 80)}`, ctx: ctxOf(cap1) });
  }
  { /* CAP02 · skills 五条逐字迁移保真 + 无 env 时 external 恰 [] */
    const cap2 = await api(srv.base, 'GET', '/api/v1/capabilities');
    C.ok(cap2.status === 200 && deepEqual(cap2.json?.skills, CAP_EXPECTED_SKILLS)
      && deepEqual(cap2.json?.mcp?.external, []),
      'CAP02', 'GET /capabilities：skills 与 app.js:117-123 迁移字面量全字段 deepEqual；无 MCP env 时 mcp.external deepEqual []',
      { expected: 'skills 五条 deepEqual + external []', actual: JSON.stringify({ skills: cap2.json?.skills?.map((s) => s.id), external: cap2.json?.mcp?.external }), ctx: ctxOf(cap2) });
  }
  { /* CAP03 · 契约面：顶层键恰 ['mcp','skills'] + 两次调用 deepEqual（无状态确定性） */
    const cap3a = await api(srv.base, 'GET', '/api/v1/capabilities');
    const cap3b = await api(srv.base, 'GET', '/api/v1/capabilities');
    C.ok(cap3a.status === 200 && deepEqual(Object.keys(cap3a.json ?? {}), ['mcp', 'skills'])
      && deepEqual(cap3a.json, cap3b.json),
      'CAP03', '响应顶层键恰 [\'mcp\',\'skills\']（无多余键，契约面锁定）；两次调用响应 deepEqual（只读派生无状态，确定性）',
      { expected: "keys=['mcp','skills'] + 两次 deepEqual", actual: `keys=${JSON.stringify(Object.keys(cap3a.json ?? {}))} twiceEqual=${deepEqual(cap3a.json, cap3b.json)}`, ctx: ctxOf(cap3a) });
  }
  { /* CAP04 · 只读面证明：POST 未注册 → 404（沿 Express 未注册方法路径 404 语义） */
    const cap4 = await api(srv.base, 'POST', '/api/v1/capabilities');
    C.eq(cap4.status, 404, 'CAP04', 'POST /api/v1/capabilities → 404（仅 GET 注册，清单端点只读）', ctxOf(cap4));
  }
  try {
    capSrv = await startServer(await getFreePort(), {
      env: { MCP_HTTP_SERVERS: 'caps-ext=http://127.0.0.1:9,filesystem=http://127.0.0.1:9' },
    });
  } catch (e) {
    C.fail('CAP05', 'CAP 第二实例启动（MCP_HTTP_SERVERS 外部条目 + 冲突条注入）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
    throw new SmokeFailError('CAP05');
  }
  { /* CAP05 · 外部条目出现 + 冲突拒条不污染 builtin；端点调用零出站、进程不崩 */
    const cap5 = await api(capSrv.base, 'GET', '/api/v1/capabilities');
    const health5 = await api(capSrv.base, 'GET', '/api/v1/health');
    C.ok(cap5.status === 200
      && deepEqual(cap5.json?.mcp?.external, [{ serverId: 'caps-ext', kind: 'http' }])
      && deepEqual(cap5.json?.mcp?.builtin, CAP_EXPECTED_BUILTIN)
      && deepEqual(cap5.json?.skills, CAP_EXPECTED_SKILLS)
      && health5.status === 200,
      'CAP05', 'env MCP_HTTP_SERVERS=caps-ext(合法)+filesystem(内置 id 冲突)：mcp.external 恰 [{serverId:"caps-ext",kind:"http"}]（冲突条被拒，复用 registry 拒条）；builtin 五条不受污染仍 deepEqual 期望；skills 仍五条；随后 health 200（注册 URL 指向 discard 端口 9 不可达也不影响——端点不做发现零出站，进程不崩）',
      { expected: 'external 恰 caps-ext + builtin/skills 不污染 + health 200', actual: JSON.stringify({ external: cap5.json?.mcp?.external, builtinIds: cap5.json?.mcp?.builtin?.map((s) => s.id), skillsN: cap5.json?.skills?.length, health: health5.status }), ctx: ctxOf(cap5) });
  }

  /* S 组：SSE 全事件链（S01-S05；WFMIN：userinput→prompt，无 LLM/出站/审批） */
  const sse = await openSse(srv.base, WFMIN);
  let accepted = null;
  try {
    accepted = await sse.waitFor((e) => e.type === 'run:accepted', 15000);
  } catch (e) {
    C.fail('S01', '流首事件 run:accepted 且 runId 为非空字符串',
      { expected: 'run:accepted + 非空 runId', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（SSE 流）' });
    throw new SmokeFailError('S01');
  }
  C.ok(accepted?.type === 'run:accepted' && sse.events[0]?.type === 'run:accepted'
    && typeof accepted.runId === 'string' && accepted.runId !== '',
    'S01', '流首事件 run:accepted 且 runId 为非空字符串',
    { expected: 'run:accepted + 非空 runId', actual: JSON.stringify(accepted).slice(0, 120), ctx: 'POST /api/v1/run（SSE 流）' });
  const runId = accepted.runId;
  CLEAN.runIds.push(runId);

  const done1 = await sse.waitFor((e) => e.type === 'run:done', 30000);
  const KEY = ['run:accepted', 'run:start', 'node:start', 'node:done', 'run:done'];
  let ki = 0;
  for (const t of sse.events.map((e) => e.type)) { if (ki < KEY.length && t === KEY[ki]) ki += 1; }
  C.ok(ki === KEY.length, 'S02', '有序子序列 run:accepted→run:start→node:start→node:done→run:done（跳过 run:progress 等）',
    { expected: KEY.join(' → '), actual: `命中前 ${ki}/${KEY.length} 键；实收 ${sse.events.map((e) => e.type).join(',')}`, ctx: `runId=${runId}` });

  const startIds = sse.events.filter((e) => e.type === 'node:start').map((e) => e.id);
  const doneIds = sse.events.filter((e) => e.type === 'node:done').map((e) => e.id);
  C.ok(JSON.stringify(startIds) === '[1,2]' && JSON.stringify(doneIds) === '[1,2]',
    'S03', 'node:start / node:done 的 id 序列均恰为 [1,2]（拓扑序覆盖全部节点）',
    { expected: 'start [1,2] 且 done [1,2]', actual: `start ${JSON.stringify(startIds)} / done ${JSON.stringify(doneIds)}`, ctx: `runId=${runId}` });

  C.ok(done1.ok === true && done1.stopped === false && done1.done === 2 && done1.total === 2,
    'S04', '末事件 run:done {ok:true, stopped:false, done:2, total:2}',
    { expected: JSON.stringify({ ok: true, stopped: false, done: 2, total: 2 }), actual: JSON.stringify({ ok: done1.ok, stopped: done1.stopped, done: done1.done, total: done1.total }), ctx: `runId=${runId}` });

  const ended1 = await sse.waitEnd(10000);
  C.ok(ended1 && sse.events[sse.events.length - 1]?.type === 'run:done',
    'S05', 'run:done 后流收束（reader done，无后续事件）',
    { expected: '流结束且末事件 run:done', actual: `ended=${ended1}，末事件=${sse.events[sse.events.length - 1]?.type}`, ctx: `runId=${runId}` });

  /* R 组：runs 列表与回放（R01-R03；承 S 阶段 runId） */
  const r1 = await api(srv.base, 'GET', '/api/v1/runs?limit=20');
  C.includes(r1.json?.runs, (x) => x?.id === runId, `列表含新 runId ${runId.slice(0, 8)}…`,
    'R01', 'GET /runs?limit=20 列表含新 runId', ctxOf(r1));

  const r2 = await api(srv.base, 'GET', `/api/v1/runs/${runId}`);
  const run = r2.json?.run;
  C.ok(r2.status === 200 && run?.status === 'done' && run?.done === 2 && run?.total === 2 && typeof run?.ended_ms === 'number',
    'R02', 'GET /runs/:id → run {status:"done", done:2, total:2, ended_ms:number}',
    { expected: 'status=done done=2 total=2 ended_ms=number', actual: r2.status === 200 ? JSON.stringify(run) : `status ${r2.status}`, ctx: ctxOf(r2) });

  const evs = r2.json?.events ?? [];
  let diffIdx = -1;
  if (evs.length !== sse.events.length) diffIdx = Math.min(evs.length, sse.events.length);
  for (let k = 0; diffIdx < 0 && k < evs.length; k += 1) {
    if (!deepEqual(evs[k], sse.events[k])) diffIdx = k;
  }
  C.ok(diffIdx < 0 && evs[0]?.type === 'run:accepted',
    'R03', 'detail.events 与 SSE 全量事件按序深相等（首条 run:accepted=seq0；seq 升序由 ORDER BY seq ASC 保证）',
    { expected: `${sse.events.length} 条按序深相等`, actual: `回放 ${evs.length} 条${diffIdx < 0 ? '' : `，首个差异位 seq=${diffIdx}`}`, ctx: ctxOf(r2) });

  /* D 组：活动 run 删除 409 + approve 收尾（D01-D07；WFAPPR：单 approval 节点挂起） */
  const sse2 = await openSse(srv.base, WFAPPR);
  let required = null;
  try {
    /* PRD 风险 3 的实现级答案：以事件为门再发 DELETE，不猜时序 */
    required = await sse2.waitFor((e) => e.type === 'approval:required', 20000);
  } catch (e) {
    C.fail('D01', 'waitFor approval:required（nodeId=1；以事件为门，run 确定处于挂起活动态）',
      { expected: 'approval:required nodeId=1', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（WFAPPR，SSE 流）' });
    throw new SmokeFailError('D01');
  }
  C.ok(required?.nodeId === 1, 'D01', 'waitFor approval:required（nodeId=1；以事件为门，run 确定处于挂起活动态）',
    { expected: 'approval:required nodeId=1', actual: JSON.stringify(required).slice(0, 140), ctx: 'POST /api/v1/run（WFAPPR，SSE 流）' });
  const apprRunId = sse2.events.find((e) => e.type === 'run:accepted')?.runId;
  if (typeof apprRunId === 'string') CLEAN.runIds.push(apprRunId);

  const d2 = await api(srv.base, 'DELETE', `/api/v1/runs/${apprRunId}`);
  C.ok(d2.status === 409 && d2.json?.error === 'run is active', 'D02', '活动 run DELETE → 409 {error:"run is active"}',
    { expected: '409 run is active', actual: `${d2.status} ${d2.text.slice(0, 80)}`, ctx: ctxOf(d2) });

  const d3 = await api(srv.base, 'POST', `/api/v1/run/${apprRunId}/approve`, { nodeId: 1, approve: true });
  C.ok(d3.status === 200 && d3.json?.ok === true, 'D03', 'POST /run/:id/approve {nodeId:1, approve:true} → 200 {ok:true}',
    { expected: '200 {ok:true}', actual: `${d3.status} ${d3.text.slice(0, 80)}`, ctx: `${ctxOf(d3)} | req={nodeId:1,approve:true}` });

  const done2 = await sse2.waitFor((e) => e.type === 'run:done', 30000);
  const apprDone = sse2.events.find((e) => e.type === 'approval:done');
  C.ok(done2.ok === true && done2.stopped === false && apprDone?.nodeId === 1 && apprDone?.approve === true,
    'D04', 'waitFor run:done {ok:true,stopped:false}，且此前出现 approval:done {nodeId:1, approve:true}',
    { expected: 'run:done ok=true stopped=false + approval:done(1,true)', actual: `run:done=${JSON.stringify({ ok: done2.ok, stopped: done2.stopped })} approval:done=${JSON.stringify(apprDone)}`, ctx: `runId=${apprRunId}` });

  /* 等流收束再断言/删除：server.ts:120-121 先删 runsById 再 res.end()，
   * 客户端见流结束即保证 run 已不活动（消除 D06 的 409/200 竞态） */
  const ended2 = await sse2.waitEnd(10000);
  const d5 = await api(srv.base, 'GET', `/api/v1/runs/${apprRunId}`);
  C.ok(ended2 && d5.status === 200 && d5.json?.run?.status === 'done', 'D05', 'GET /runs/:id → 200 且 run.status==="done"',
    { expected: '200 + status=done', actual: `ended=${ended2}，${d5.status} ${d5.text.slice(0, 100)}`, ctx: ctxOf(d5) });

  const d6 = await api(srv.base, 'DELETE', `/api/v1/runs/${apprRunId}`);
  C.ok(d6.status === 200 && d6.json?.ok === true, 'D06', 'run 收尾后 DELETE → 200 {ok:true}',
    { expected: '200 {ok:true}', actual: `${d6.status} ${d6.text.slice(0, 80)}`, ctx: ctxOf(d6) });

  const d7 = await api(srv.base, 'GET', `/api/v1/runs/${apprRunId}`);
  C.eq(d7.status, 404, 'D07', '删除后 GET → 404', ctxOf(d7));

  /* E 组：websearch 节点 eng 参数路由（E01-E03；迭代 0005 / BK-0007 · SPEC §6.2）
   * 服务以受控 env 启动（H 组空串压制 BOCHA_API_KEY/SEARXNG_URL）：E01/E02 在
   * 严格路由的配置探测步即如实跳过（不触网）；E03 的「未接入」标注先于回退链
   * 任何网络调用发出——三条断言在完全离线环境结果一致（只锁路由证据文案，
   * 不锁外部引擎返回；正路径列 SPEC §7 手动 E2E 可选点位）。 */
  const runEng = async (eng) => {
    const sse = await openSse(srv.base, wfEng(eng));
    const runId = (await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId;
    CLEAN.runIds.push(runId);
    /* 30s 覆盖回退链 DDG 12s 超时档（E03 离线时回退链全败，标注已先行发出） */
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    const out = sse.events.filter((e) => e.type === 'node:done' && e.id === 2).map((e) => String(e.out ?? '')).join(' | ');
    const logs = sse.events.filter((e) => e.type === 'log').map((e) => String(e.msg ?? ''));
    return { runId, done, out, logs };
  };

  { /* E01 · eng=博查（未配置 key）：严格路由 → 如实跳过，不回退（AC1 缺 key 半支） */
    const { done, out, logs } = await runEng('博查');
    C.ok(done.ok === true && done.done === 2 && done.total === 2
      && out.includes('eng=博查') && out.includes('BOCHA_API_KEY') && !out.includes('DuckDuckGo')
      && logs.some((m) => m.includes('不回退其他引擎')),
      'E01', 'eng=博查（未配置 key）：run:done {ok:true,done:2,total:2}；out 含 eng=博查+BOCHA_API_KEY 且无 DuckDuckGo；log 含「不回退其他引擎」',
      { expected: 'out=搜索不可用 · 已跳过联网参考（eng=博查 · 未配置 BOCHA_API_KEY）',
        actual: JSON.stringify({ done: { ok: done.ok, done: done.done, total: done.total }, out, logs: logs.slice(0, 3) }).slice(0, 220),
        ctx: 'websearch(eng=博查) 受控 env（BOCHA_API_KEY 空串压制）' });
  }
  { /* E02 · eng=SearXNG（未配置 URL）：严格路由 → 如实跳过（AC2 缺 URL 半支） */
    const { done, out } = await runEng('SearXNG');
    C.ok(done.ok === true && out.includes('eng=SearXNG') && out.includes('SEARXNG_URL'),
      'E02', 'eng=SearXNG（未配置 URL）：run:done {ok:true}；out 含 eng=SearXNG+SEARXNG_URL',
      { expected: 'out=搜索不可用 · 已跳过联网参考（eng=SearXNG · 未配置 SEARXNG_URL）',
        actual: JSON.stringify({ done: { ok: done.ok }, out }).slice(0, 220),
        ctx: 'websearch(eng=SearXNG) 受控 env（SEARXNG_URL 空串压制）' });
  }
  { /* E03 · eng=Bing（未接入）：先导「未接入」标注 + 回退链文案无 eng= 前缀（AC3 标注半支） */
    const { done, out, logs } = await runEng('Bing');
    C.ok(done.ok === true && logs.some((m) => m.includes('未接入')) && !out.includes('eng='),
      'E03', 'eng=Bing：run:done {ok:true}；log 含「未接入」标注（网络无关）；out 不含 eng=（互斥反证：未误入严格分支文案）',
      { expected: '标注 log「未接入」+ out 无 eng= 前缀',
        actual: JSON.stringify({ done: { ok: done.ok }, out, logs: logs.slice(0, 3) }).slice(0, 220),
        ctx: 'websearch(eng=Bing) 受控 env（回退链成败均不改变判据）' });
  }

  /* K 组：code 节点 lang=JavaScript 默认码错配后端兜底（K01-K03；迭代 0014 / BK-0022 ·
   * REQ-0022-02）。K01=AC1 正路径：兜底替换 + 告知 log + 执行成功；K02/K03=AC3
   * 不误伤对照：自定义 JS 码 / lang=Python 默认路径 → 零告知、行为与现状一致。 */
  const CODE_NOTE = '默认样例与所选语言不匹配，已替换为等价样例执行';
  const runCode = async (params, name) => {
    const sse = await openSse(srv.base, wfCode(params, name));
    CLEAN.runIds.push((await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    return { done,
      out: sse.events.filter((e) => e.type === 'node:done' && e.id === 1).map((e) => String(e.out ?? '')).join(' | '),
      logs: sse.events.filter((e) => e.type === 'log').map((e) => String(e.msg ?? '')),
      errCount: sse.events.filter((e) => e.type === 'node:error').length };
  };
  { /* K01 · AC1：lang=JavaScript 不带 code（DEFS 默认合并错配）→ 兜底后 run 完成、out 执行成功、log 含告知子串 */
    const { done, out, logs, errCount } = await runCode({ lang: 'JavaScript' }, 'smoke-code-js-default');
    C.ok(done.ok === true && errCount === 0 && out.startsWith('执行成功') && logs.some((m) => m.includes(CODE_NOTE)),
      'K01', 'code 节点 lang=JavaScript 不带 code：run:done {ok:true}、无 node:error、out「执行成功」类文案、log 含兜底告知子串',
      { expected: 'run 完成 + out=执行成功… + log 含告知子串', actual: JSON.stringify({ ok: done.ok, errCount, out, logs: logs.slice(0, 3) }).slice(0, 260), ctx: 'POST /api/v1/run（单 code 节点，params 仅 lang:JavaScript）' });
  }
  { /* K02 · AC3 对照①：自定义 JS 码（≠默认样例字面量）→ 零替换零告知，行为与现状一致 */
    const { done, out, logs, errCount } = await runCode({ lang: 'JavaScript', code: 'result = "smoke-" + String(input)' }, 'smoke-code-js-custom');
    C.ok(done.ok === true && errCount === 0 && out.startsWith('执行成功') && !logs.some((m) => m.includes(CODE_NOTE)),
      'K02', 'code 节点 lang=JavaScript + 自定义码：run:done {ok:true}、无 node:error、out「执行成功」、log 无兜底告知（不误伤）',
      { expected: 'run 完成 + out=执行成功… + log 无告知子串', actual: JSON.stringify({ ok: done.ok, errCount, out, logs: logs.slice(0, 3) }).slice(0, 260), ctx: 'POST /api/v1/run（单 code 节点，自定义 JS 码）' });
  }
  { /* K03 · AC3 对照②：lang=Python 不带 code（code=默认样例逐字）→ 恒不触发兜底（反向组合不存在，PRD 背景 3） */
    const { done, out, logs, errCount } = await runCode({ lang: 'Python' }, 'smoke-code-py-default');
    C.ok(done.ok === true && errCount === 0 && out.startsWith('执行成功') && !logs.some((m) => m.includes(CODE_NOTE)),
      'K03', 'code 节点 lang=Python 不带 code：run:done {ok:true}、无 node:error、out「执行成功」（默认样例按 Python 原样执行）、log 无兜底告知',
      { expected: 'run 完成 + out=执行成功… + log 无告知子串', actual: JSON.stringify({ ok: done.ok, errCount, out, logs: logs.slice(0, 3) }).slice(0, 260), ctx: 'POST /api/v1/run（单 code 节点，params 仅 lang:Python；依赖本机 python 运行时）' });
  }
  { /* K04 · REQ-0046-02 源锁：app.js JS 等价样例字面量 ↔ handlers.ts 兜底字面量
       逐字一致（防两处漂移；沿 M08-M11 源锁先例 mcp-stubs.mjs:205-217，锁语义
       字面量而非全文件哈希；校验器用途，被测系统仍只经 HTTP 触达——V09 git 检查同类） */
    const lockRe = /['"](\/\/ 处理输入后返回[^'"]*)['"]/g;
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

  /* G 组：持久会话与流式会话 API（G01-G10；迭代 0015 / BK-0016 · SPEC §6）
   * 三实例矩阵：主实例 G01-G04（零模型调用）→ mock 实例 G05-G08（分块延时流出，
   * 时序确定）→ minimal 实例 G09（降级路径无条件确定）→ G10 离线契约校验。
   * 残留纪律：会话无删除端点，一律按自建 id 存在性断言，不做全局计数（0015 SPEC §3.4-5）。 */
  const newSession = async (base, title, assertId) => {
    const r = await api(base, 'POST', '/api/v1/sessions', { title });
    if (r.status !== 201 || typeof r.json?.id !== 'string' || r.json.id === '') {
      C.fail(assertId, `建会话前置（${title}）`, { expected: '201 {id}', actual: `${r.status} ${r.text.slice(0, 120)}`, ctx: ctxOf(r) });
      throw new SmokeFailError(assertId);
    }
    return r.json.id;
  };
  { /* G01 · 建会话：201 + SessionRow 形状 */
    const g1 = await api(srv.base, 'POST', '/api/v1/sessions', { title: '测试' });
    C.ok(g1.status === 201 && typeof g1.json?.id === 'string' && g1.json.id !== '' && g1.json?.title === '测试'
      && g1.json?.model === null && g1.json?.sys === null
      && typeof g1.json?.created_at === 'number' && typeof g1.json?.updated_at === 'number',
      'G01', 'POST /sessions {title:"测试"} → 201 SessionRow（id 非空、title、"model/sys":null、时间戳 number）',
      { expected: '201 {id,title:"测试",model:null,sys:null,created_at,updated_at}', actual: `${g1.status} ${g1.text.slice(0, 160)}`, ctx: ctxOf(g1) });
    var sidG1 = g1.json?.id;   /* G02/G03/G04 复用 */
  }
  { /* G02 · 列表含自建 id + limit 反例（N02/N03 同型） */
    const g2 = await api(srv.base, 'GET', '/api/v1/sessions');
    const g2a = await api(srv.base, 'GET', '/api/v1/sessions?limit=0');
    const g2b = await api(srv.base, 'GET', '/api/v1/sessions?limit=101');
    const hit = (g2.json?.sessions ?? []).some((x) => x?.id === sidG1);
    C.ok(g2.status === 200 && hit && g2a.status === 400 && g2a.json?.error === 'limit 必须是 1-100 的整数'
      && g2b.status === 400 && g2b.json?.error === 'limit 必须是 1-100 的整数',
      'G02', 'GET /sessions 列表含自建 id（updated_at 倒序）；limit=0 / limit=101 → 400 {error:"limit 必须是 1-100 的整数"}',
      { expected: '200 含自建 id + 两个 400 反例', actual: `list=${g2.status}（含 id=${hit}）limit0=${g2a.status} limit101=${g2b.status}`, ctx: `${ctxOf(g2)} | ${ctxOf(g2a)}` });
  }
  { /* G03 · 恢复（session + 空 messages）+ 不存在 404 */
    const g3 = await api(srv.base, 'GET', `/api/v1/sessions/${sidG1}`);
    const g3b = await api(srv.base, 'GET', '/api/v1/sessions/00000000-0000-0000-0000-000000000000');
    C.ok(g3.status === 200 && g3.json?.session?.id === sidG1 && Array.isArray(g3.json?.messages) && g3.json.messages.length === 0
      && g3b.status === 404 && g3b.json?.error === 'session not found',
      'G03', 'GET /sessions/:id → 200 {session.id===id, messages:[]}；GET 不存在 id → 404 {error:"session not found"}',
      { expected: '200 空 messages + 404 反例', actual: `detail=${g3.status}（messages=${g3.json?.messages?.length}）404=${g3b.status} ${g3b.json?.error}`, ctx: ctxOf(g3b) });
  }
  { /* G04 · stop 无活动 turn → 404（主实例全程零模型调用） */
    const g4 = await api(srv.base, 'POST', `/api/v1/sessions/${sidG1}/stop`, {});
    C.ok(g4.status === 404 && g4.json?.error === 'session turn not found',
      'G04', 'POST /sessions/:id/stop（无活动 turn）→ 404 {error:"session turn not found"}',
      { expected: '404 session turn not found', actual: `${g4.status} ${g4.text.slice(0, 80)}`, ctx: ctxOf(g4) });
  }
  /* mock 实例：AI_BASE_URL 注入显式配置分支（providers.ts 显式优先），宿主密钥不影响；
   * MEMORY_ENABLED 钉空串 = 未配置语义（config 空串归一，G09 同款压制先例——防开发者
   * apps/server/.env 携 MEMORY_ENABLED=1 泄入后 G05 流式正则与 MEM01 默认关断言双红） */
  mockModel = await startMockModel();
  try {
    mockSrv = await startServer(await getFreePort(), {
      env: { AI_BASE_URL: mockModel.url, AI_API_KEY: 'smoke-mock-key', AI_MODELS: 'MockChat:mock-model', AI_MODEL: 'mock-model', MEMORY_ENABLED: '' },
    });
  } catch (e) {
    C.fail('G05', 'mock 实例启动（AI_BASE_URL 显式注入）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
    throw new SmokeFailError('G05');
  }
  let g05Events = [];
  { /* G05 · 确定性流式 turn + 落库复核（正常路径） */
    const sidM = await newSession(mockSrv.base, 'mock 会话', 'G05');
    const s5 = await chatSse(mockSrv.base, sidM, { text: '你好' });
    const d5 = await s5.waitFor((e) => e.type === 'run:done', 30000);
    const ended5 = await s5.waitEnd(10000);
    g05Events = s5.events;   /* G10 契约校验素材 */
    const deltas = g05Events.filter((e) => e.type === 'node:delta');
    const nd = g05Events.find((e) => e.type === 'node:done');
    const msgs = (await api(mockSrv.base, 'GET', `/api/v1/sessions/${sidM}`)).json?.messages ?? [];
    C.ok(d5.ok === true && d5.done === 1 && d5.total === 1 && d5.outputs?.[0] === MOCK_FULL
      && /^run:accepted,node:start,(?:node:delta,)+node:done,log,run:done$/.test(g05Events.map((e) => e.type).join(','))
      && deltas.length >= 1 && deltas[deltas.length - 1]?.text === MOCK_FULL
      && nd?.out === MOCK_FULL && nd?.firePort === null && nd?.iteration === null && ended5
      && msgs.length === 2 && msgs[0]?.role === 'user' && msgs[0]?.text === '你好' && msgs[0]?.seq === 1
      && msgs[1]?.role === 'assistant' && msgs[1]?.text === MOCK_FULL && msgs[1]?.seq === 2,
      'G05', 'chat {text:"你好"}：事件序恰 run:accepted→node:start→node:delta×N（末次=全文）→node:done{out=全文,firePort:null,iteration:null}→log→run:done{ok:true,done:1,total:1,outputs:[全文]}；GET :id → messages 恰 2 条（user+assistant 全文，seq 1,2）',
      { expected: '正常路径事件序 + 2 条落库', actual: JSON.stringify({ types: g05Events.map((e) => e.type).join(','), done: { ok: d5.ok, done: d5.done, total: d5.total, outputs: d5.outputs }, msgs: msgs.map((m) => `${m.seq}:${m.role}`), ended: ended5 }).slice(0, 280), ctx: 'mock 实例 POST chat + GET :id' });
  }
  { /* G06 · 续聊上下文：第二轮请求含第一轮 user/assistant 历史（mock 记录断言） */
    const sidM = await newSession(mockSrv.base, '续聊会话', 'G06');
    const s6a = await chatSse(mockSrv.base, sidM, { text: '你好' });
    await s6a.waitFor((e) => e.type === 'run:done', 30000);
    await s6a.waitEnd(10000);
    const s6 = await chatSse(mockSrv.base, sidM, { text: '再问' });
    await s6.waitFor((e) => e.type === 'run:done', 30000);
    await s6.waitEnd(10000);
    const msgs = (await api(mockSrv.base, 'GET', `/api/v1/sessions/${sidM}`)).json?.messages ?? [];
    const reqMsgs = (mockModel.requests ?? []).find((r) => {
      const ms = r?.messages ?? [];
      const l = ms[ms.length - 1];
      return l?.role === 'user' && String(l?.content) === '再问';
    })?.messages ?? [];
    const last = reqMsgs[reqMsgs.length - 1];
    C.ok(mockModel.requests.length >= 3
      && reqMsgs.some((m) => m?.role === 'user' && String(m?.content) === '你好')
      && reqMsgs.some((m) => m?.role === 'assistant' && String(m?.content) === MOCK_FULL)
      && last?.role === 'user' && String(last?.content) === '再问' && msgs.length === 4,
      'G06', '第二轮 chat {text:"再问"}：mock 收到的第二轮请求 messages 含第一轮 user/assistant 历史且末位 {role:"user",content:"再问"}；GET :id → messages 恰 4 条（续聊上下文生效）',
      { expected: '第二轮含历史 + 4 条落库', actual: JSON.stringify({ reqMsgs: reqMsgs.map((m) => `${m?.role}:${String(m?.content).slice(0, 8)}`), msgs: msgs.length }), ctx: `mock 请求数=${mockModel.requests.length}` });
  }
  let g07Events = [];
  { /* G07 · 停止信号与部分保留（三块 ×400ms 流出未完即停 → 已累积为前缀） */
    const sid7 = await newSession(mockSrv.base, '停止会话', 'G07');
    const s7 = await chatSse(mockSrv.base, sid7, { text: '长输出' });
    await s7.waitFor((e) => e.type === 'node:delta', 20000);
    const stop = await api(mockSrv.base, 'POST', `/api/v1/sessions/${sid7}/stop`, {});
    const d7 = await s7.waitFor((e) => e.type === 'run:done', 20000);
    g07Events = s7.events;   /* G10 契约校验素材 */
    const msgs = (await api(mockSrv.base, 'GET', `/api/v1/sessions/${sid7}`)).json?.messages ?? [];
    const asst = [...msgs].reverse().find((m) => m?.role === 'assistant');
    C.ok(stop.status === 200 && stop.json?.ok === true
      && d7.stopped === true && d7.ok === false && d7.done === 0 && d7.total === 1
      && asst && asst.text !== '' && MOCK_FULL.startsWith(asst.text),
      'G07', '流出中 POST stop → 200 {ok:true} 且 SSE 以 run:done{stopped:true,ok:false,done:0,total:1} 收尾；GET :id → assistant 消息非空且为 MOCK_FULL 前缀（已累积部分保留落库）',
      { expected: 'stopped 终态 + 部分文本落库', actual: JSON.stringify({ stop: stop.status, done: { stopped: d7.stopped, ok: d7.ok, done: d7.done, total: d7.total }, asst: asst?.text }), ctx: `POST /api/v1/sessions/:id/stop（首块已流出后停止）` });
  }
  { /* G08 · 并发守卫：活动 turn 中二次 chat → 409；不存在 session chat → 404；stop 清场 */
    const sid8 = await newSession(mockSrv.base, '并发会话', 'G08');
    const s8 = await chatSse(mockSrv.base, sid8, { text: '并发' });
    await s8.waitFor((e) => e.type === 'node:delta', 20000);
    const dup = await api(mockSrv.base, 'POST', `/api/v1/sessions/${sid8}/chat`, { text: '并发2' });
    const nf = await api(mockSrv.base, 'POST', '/api/v1/sessions/00000000-0000-0000-0000-000000000000/chat', { text: 'x' });
    const stop = await api(mockSrv.base, 'POST', `/api/v1/sessions/${sid8}/stop`, {});
    await s8.waitEnd(10000);
    C.ok(dup.status === 409 && dup.json?.error === 'session turn is active'
      && nf.status === 404 && nf.json?.error === 'session not found' && stop.status === 200,
      'G08', '活动 turn 进行中同 session 二次 chat → 409 {error:"session turn is active"}；chat 不存在 session → 404 {error:"session not found"}；对活动会话 stop 清场 → 200',
      { expected: '409 + 404 + 清场 200', actual: `dup=${dup.status} ${dup.json?.error} / nf=${nf.status} ${nf.json?.error} / stop=${stop.status}`, ctx: ctxOf(dup) });
  }
  /* minimal 实例：全密钥空串压制（config 空串归一）→ configured=false 确定，降级路径无条件触发 */
  try {
    minimalSrv = await startServer(await getFreePort(), {
      env: {
        AI_BASE_URL: '', AI_API_KEY: '', AI_MODELS: '', AI_MODEL: '', AI_PROVIDER_NAME: '',
        DEEPSEEK_API_KEY: '', ZHIPU_API_KEY: '', OPENAI_API_KEY: '', MOONSHOT_API_KEY: '',
      },
    });
  } catch (e) {
    C.fail('G09', 'minimal 实例启动（全密钥空串压制）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
    throw new SmokeFailError('G09');
  }
  { /* G09 · 降级路径：模型未配置 → log(warn) + run:error + run:done{ok:false}，assistant 不落库 */
    const sid9 = await newSession(minimalSrv.base, '降级会话', 'G09');
    const s9 = await chatSse(minimalSrv.base, sid9, { text: '无模型' });
    const d9 = await s9.waitFor((e) => e.type === 'run:done', 15000);
    await s9.waitEnd(10000);
    const types = s9.events.map((e) => e.type).join(',');
    const det9 = await api(minimalSrv.base, 'GET', `/api/v1/sessions/${sid9}`);
    const msgs = det9.json?.messages ?? [];
    C.ok(types === 'run:accepted,log,run:error,run:done'
      && d9.ok === false && d9.done === 0 && d9.total === 1
      && msgs.length === 1 && msgs[0]?.role === 'user' && msgs[0]?.text === '无模型',
      'G09', 'minimal 实例 chat：事件序恰 run:accepted→log(warn)→run:error→run:done{ok:false,done:0,total:1}；GET :id → messages 恰 1 条 user（assistant 不落库）',
      { expected: '降级事件序 + 恰 1 条 user', actual: JSON.stringify({ types, done: { ok: d9.ok, done: d9.done, total: d9.total }, msgs: msgs.map((m) => `${m.seq}:${m.role}`) }), ctx: ctxOf(det9) });
  }
  { /* G10 · SSE 契约零漂移：G05/G07 全事件流逐条 RunEventSchema 校验（AC5 机器证明） */
    const all = [...g05Events, ...g07Events];
    let parsed = 0;
    let bad = null;
    for (const ev of all) {
      try { validateEvent(ev); parsed += 1; } catch (e) { bad = { type: ev?.type, err: String(e?.message ?? e) }; break; }
    }
    C.ok(bad === null && parsed === all.length,
      'G10', 'G05 与 G07 捕获的全部事件（run:accepted/node:start/node:delta/node:done/log/run:done）逐条通过 RunEventSchema 校验（零新增契约，packages/shared 零改动）',
      { expected: `${all.length}/${all.length} 通过`, actual: bad ? `${parsed} 通过后失败于 ${bad.type}：${bad.err}` : `${parsed}/${all.length}`, ctx: '@agentflow/shared validateEvent（仅作校验器，被测系统仍只经 HTTP 触达）' });
  }

  /* V 组：智能体互审协议（V01-V09 · SPEC §5）——mock 实例 V01-V03/V07/V08、主实例 V04/V05、minimal 实例 V06（§12 偏移 1）。 */
  const vRun = async (base, wf) => {
    const sse = await openSse(base, wf);
    const runId = (await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId;
    CLEAN.runIds.push(runId);
    return { sse, runId };
  };
  const vOut = (events) => events.filter((e) => e.type === 'node:done' && e.id === 1).map((e) => String(e.out ?? '')).join(' | ');
  const vLogs = (events) => events.filter((e) => e.type === 'log').map((e) => String(e.msg ?? ''));
  const vDone = (events, approve) => !events.some((e) => e.type === 'approval:required')
    && events.some((e) => e.type === 'approval:done' && e.nodeId === 1 && e.approve === approve);
  /* 恰一行审计且 mode/verdict 命中（extra 追加断言以行内回调给出） */
  const vAudit = (rows, mode, verdict, extra = () => true) => rows.length === 1
    && rows[0]?.mode === mode && rows[0]?.verdict === verdict && extra(rows[0]);
  const inOrder = (events, preds) => {
    let i = 0;
    for (const e of events) { if (i < preds.length && preds[i](e)) i += 1; }
    return i === preds.length;
  };
  const vCap = { v01: [], v02: [], v03: [], v04: [], v06: [] };   /* V09 素材 */
  { /* V01 · AC1 互审正路径（mock allow）：裁决中 sys log → approval:done{true}，全程无 approval:required，审计 agent/allow */
    const { sse, runId } = await vRun(mockSrv.base, wfReview('互审放行', '挂起'));
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    vCap.v01 = sse.events;
    const sysLog = sse.events.find((e) => e.type === 'log' && e.lvl === 'sys' && String(e.msg).includes('互审裁决中'));
    const out = vOut(sse.events), a = auditsOf(runId);
    C.ok(inOrder(sse.events, [
      (e) => e.type === 'run:accepted', (e) => e.type === 'run:start',
      (e) => e.type === 'node:start' && e.id === 1,
      (e) => e.type === 'log' && e.lvl === 'sys' && String(e.msg).includes('互审裁决中'),
      (e) => e.type === 'approval:done' && e.nodeId === 1 && e.approve === true,
      (e) => e.type === 'node:done' && e.id === 1, (e) => e.type === 'node:bypass' && e.id === 2,
      (e) => e.type === 'run:done',
    ]) && !sse.events.some((e) => e.type === 'approval:required')
      && done.ok === true && done.done === 2 && done.total === 2
      && sysLog && String(sysLog.msg).includes('审官A') && String(sysLog.msg).includes('node:2')
      && out.includes('智能体裁决') && out.includes('审官A')
      && vAudit(a, 'agent', 'allow', (r) => r.node_id === 1 && r.reviewer === 'node:2' && r.reason === 'mock 允许：符合规范' && typeof r.created_at === 'number'),
      'V01', '互审正路径：有序子序列 run:accepted→run:start→node:start(1)→log(sys 互审裁决中·审官A·node:2)→approval:done{1,true}→node:done(1)→node:bypass(2)→run:done{ok:true,done:2,total:2}；全程无 approval:required；out 含「智能体裁决」「审官A」；审计恰 1 行 {node:1,reviewer:node:2,mode:agent,verdict:allow,reason:mock 允许：符合规范}',
      { expected: '裁决 allow + 审计 agent/allow', actual: JSON.stringify({ done: { ok: done.ok, done: done.done, total: done.total }, sysLog: sysLog?.msg, out, a }).slice(0, 320), ctx: `runId=${runId}（mock 实例，role=node:2）` });
  }
  { /* V02 · AC2 deny 分支：approval:done{approve:false}，out 以「审批拒绝」开头，审计 agent/deny 带 mock 理由 */
    const { sse, runId } = await vRun(mockSrv.base, wfReview('互审驳回', '挂起'));
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    vCap.v02 = sse.events;
    const out = vOut(sse.events), a = auditsOf(runId);
    C.ok(vDone(sse.events, false) && done.ok === true && out.startsWith('审批拒绝')
      && vAudit(a, 'agent', 'deny', (r) => r.reason === 'mock 拒绝：内容不合规'),
      'V02', 'mock 返回 deny JSON：无 approval:required；approval:done{approve:false}；run:done{ok:true}；out 以「审批拒绝」开头；审计恰 1 行 {mode:agent, verdict:deny, reason:mock 拒绝：内容不合规}',
      { expected: 'deny 裁决 + 审计 agent/deny', actual: JSON.stringify({ out, a }).slice(0, 280), ctx: `runId=${runId}（mock 实例，互审驳回）` });
  }
  { /* V03 · AC3 前半 F5 降级：mock 非 JSON + to=自动拒绝 → 不挂起直接 deny + warn + agent-fallback 审计 */
    const { sse, runId } = await vRun(mockSrv.base, wfReview('互审坏输出', '自动拒绝'));
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    vCap.v03 = sse.events;
    const logs = vLogs(sse.events), a = auditsOf(runId);
    C.ok(vDone(sse.events, false) && done.ok === true
      && logs.some((m) => m.includes('互审裁决失败') && m.includes('输出不可解析'))
      && vAudit(a, 'agent-fallback', 'deny', (r) => String(r.reason ?? '').startsWith('裁决失败：')),
      'V03', 'mock 返回非 JSON + to=自动拒绝：无 approval:required（不挂起）；直接 approval:done{approve:false}；warn log 含「互审裁决失败」「输出不可解析」；审计 {mode:agent-fallback, verdict:deny, reason 前缀「裁决失败：」}',
      { expected: 'F5 降级 deny', actual: JSON.stringify({ logs: logs.slice(0, 3), a }).slice(0, 280), ctx: `runId=${runId}（mock 实例，互审坏输出）` });
  }
  { /* V04 · AC3 后半 F1 回退人工：审官 node:99 不存在 → warn + approval:required → approve 端点 → run 完成；审计恰 1 行 human */
    const { sse, runId } = await vRun(srv.base, wfPlain('smoke-review-missing', 'node:99', '挂起'));
    const required = await sse.waitFor((e) => e.type === 'approval:required', 20000);
    const ap = await api(srv.base, 'POST', `/api/v1/run/${runId}/approve`, { nodeId: 1, approve: true });
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    vCap.v04 = sse.events;
    const logs = vLogs(sse.events), a = auditsOf(runId);
    C.ok(required?.nodeId === 1 && required?.role === 'node:99' && ap.status === 200 && ap.json?.ok === true
      && done.ok === true && logs.some((m) => m.includes('审官节点不可用'))
      && vAudit(a, 'human', 'allow', (r) => r.reviewer === 'node:99'),
      'V04', '审官 node:99 不存在 + to=挂起：warn 含「审官节点不可用」；approval:required{nodeId:1, role:node:99} 出现（回退人工）；POST approve {nodeId:1,approve:true} → 200 {ok:true}；run:done{ok:true}；审计恰 1 行 {mode:human, verdict:allow, reviewer:node:99}',
      { expected: 'F1 回退人工 + human 审计', actual: JSON.stringify({ required, ap: ap.status, ok: done.ok, logs: logs.slice(0, 3), a }).slice(0, 320), ctx: `runId=${runId}（主实例，role=node:99）` });
  }
  { /* V05 · AC4 人工零回归：①挂起+人工通过与现状同型（事件序/out/审计 human）；②纯自动拒绝零审批事件（审计 auto） */
    const { sse, runId } = await vRun(srv.base, wfPlain('smoke-review-human', '普通审批人', '挂起'));
    await sse.waitFor((e) => e.type === 'approval:required', 20000);
    await api(srv.base, 'POST', `/api/v1/run/${runId}/approve`, { nodeId: 1, approve: true });
    const done1 = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const a1 = auditsOf(runId);
    const { sse: sse2, runId: runId2 } = await vRun(srv.base, wfPlain('smoke-review-auto', '普通审批人', '自动拒绝'));
    const done2 = await sse2.waitFor((e) => e.type === 'run:done', 30000);
    await sse2.waitEnd(10000);
    const a2 = auditsOf(runId2);
    C.ok(inOrder(sse.events, [
      (e) => e.type === 'approval:required',
      (e) => e.type === 'approval:done' && e.nodeId === 1 && e.approve === true, (e) => e.type === 'run:done',
    ]) && done1.ok === true && vOut(sse.events) === '审批通过 · 普通审批人'
      && vAudit(a1, 'human', 'allow', (r) => r.reviewer === '普通审批人')
      && !sse2.events.some((e) => e.type === 'approval:required' || e.type === 'approval:done')
      && done2.ok === true && vOut(sse2.events) === '审批拒绝 · 普通审批人'
      && vAudit(a2, 'auto', 'deny'),
      'V05', 'role=普通审批人（无前缀）：①挂起+人工通过——approval:required→approval:done{true}→run:done{ok:true}，out=「审批通过 · 普通审批人」（与现状同型），审计 {mode:human,verdict:allow}；②to=自动拒绝——无 approval:required 且无 approval:done（现状行为），out=「审批拒绝 · 普通审批人」，审计 {mode:auto,verdict:deny}',
      { expected: '人工路径零回归 + auto 审计', actual: JSON.stringify({ out1: vOut(sse.events), a1, out2: vOut(sse2.events), a2 }).slice(0, 300), ctx: `runId=${runId} / ${runId2}（主实例，普通文本 role）` });
  }
  { /* V06 · F3 模型未配置降级（minimal 实例确定性，SPEC §12 偏移 1）：无挂起、deny、warn「模型未配置」 */
    const { sse, runId } = await vRun(minimalSrv.base, wfReview('互审放行', '自动拒绝'));
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    vCap.v06 = sse.events;
    const logs = vLogs(sse.events), a = auditsOf(runId);
    C.ok(vDone(sse.events, false) && done.ok === true && logs.some((m) => m.includes('模型未配置'))
      && vAudit(a, 'agent-fallback', 'deny'),
      'V06', 'minimal 实例（模型必未配置）+ to=自动拒绝：无 approval:required；approval:done{approve:false}；warn 含「模型未配置」；审计 {mode:agent-fallback, verdict:deny}',
      { expected: 'F3 降级 deny', actual: JSON.stringify({ logs: logs.slice(0, 3), a }).slice(0, 260), ctx: `runId=${runId}（minimal 实例，全密钥空串压制）` });
  }
  { /* V07 · F6 zod 拒收：合法 JSON 但 verdict='maybe' → 按 to=自动通过降级 allow；审计 reason 含协议不符 */
    const { sse, runId } = await vRun(mockSrv.base, wfReview('互审错形状', '自动通过'));
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const logs = vLogs(sse.events), a = auditsOf(runId);
    C.ok(vDone(sse.events, true) && done.ok === true && logs.some((m) => m.includes('输出不符合裁决协议'))
      && vAudit(a, 'agent-fallback', 'allow', (r) => String(r.reason ?? '').includes('输出不符合裁决协议')),
      'V07', 'mock 返回 {"verdict":"maybe"}（JSON 但 schema 不符）+ to=自动通过：无 approval:required；降级 approval:done{approve:true}；warn 含「输出不符合裁决协议」；审计 {mode:agent-fallback, verdict:allow}',
      { expected: 'F6 降级 allow', actual: JSON.stringify({ logs: logs.slice(0, 3), a }).slice(0, 260), ctx: `runId=${runId}（mock 实例，互审错形状）` });
  }
  { /* V08 · F2 非 LLM 审官（prompt 节点）：warn「审官节点不可用」→ deny 降级；mock 请求数不增（零模型调用） */
    const reqBefore = mockModel.requests.length;
    const { sse, runId } = await vRun(mockSrv.base, wfReview('互审放行', '自动拒绝', 'prompt'));
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const logs = vLogs(sse.events), a = auditsOf(runId);
    C.ok(vDone(sse.events, false) && done.ok === true && logs.some((m) => m.includes('审官节点不可用'))
      && mockModel.requests.length === reqBefore && vAudit(a, 'agent-fallback', 'deny'),
      'V08', '审官节点 type=prompt（非 LLM）+ to=自动拒绝：无 approval:required；降级 approval:done{approve:false}；warn 含「审官节点不可用」；mock 请求数不增（F2 零模型调用）；审计 {mode:agent-fallback, verdict:deny}',
      { expected: 'F2 降级 deny + 零模型调用', actual: JSON.stringify({ mockReqs: mockModel.requests.length - reqBefore, logs: logs.slice(0, 3), a }).slice(0, 280), ctx: `runId=${runId}（mock 实例，审官B=prompt）` });
  }
  { /* V09 · AC5 契约零漂移：V01-V04/V06 全事件流逐条 RunEventSchema 校验 + git packages/shared 零改动 */
    const all = [...vCap.v01, ...vCap.v02, ...vCap.v03, ...vCap.v04, ...vCap.v06];
    let parsed = 0, bad = null;
    for (const ev of all) {
      try { validateEvent(ev); parsed += 1; } catch (e) { bad = { type: ev?.type, err: String(e?.message ?? e) }; break; }
    }
    const sharedDirty = await new Promise((resolve) => {
      const p = spawn('git', ['status', '--porcelain', '--', 'packages/shared'], { cwd: REPO_ROOT, shell: false });
      let out = '';
      p.stdout.on('data', (c) => { out += c; });
      p.on('error', () => resolve('git 不可用'));
      p.on('close', () => resolve(out.trim()));
    });
    C.ok(bad === null && parsed === all.length && sharedDirty === '',
      'V09', `V01-V04、V06 捕获的全部事件（${all.length} 条，含互审 log/approval:done/approval:required）逐条通过 RunEventSchema 校验；git status --porcelain -- packages/shared 为空（DEFS 零漂移）`,
      { expected: `${all.length}/${all.length} 通过 + shared 干净`, actual: bad ? `${parsed} 通过后失败于 ${bad.type}：${bad.err}` : `${parsed}/${all.length}；shared=${sharedDirty === '' ? '干净' : sharedDirty}`, ctx: '@agentflow/shared validateEvent + git status（均仅作校验器，被测系统只经 HTTP 触达）' });
  }

  /* A 组：通用智能体节点（A01-A05 · 迭代 0031 / BK-0033 · SPEC §7）——mock 实例。
   * 会话绑定（title/model/sys=节点标题/参数）/ 预算循环 / 停止透传 / 契约零新增；
   * 残留纪律沿 G 组：会话无删除端点，按自建 title 定位存在性断言（?limit=100 全量窗口）。 */
  const AGENT_ALLOW = '{"verdict":"allow","reason":"mock 允许：符合规范"}';
  const aRun = async (wf) => {
    const sse = await openSse(mockSrv.base, wf);
    const runId = (await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId;
    CLEAN.runIds.push(runId);
    return { sse, runId };
  };
  const aSessionByTitle = async (title) => {
    const r = await api(mockSrv.base, 'GET', '/api/v1/sessions?limit=100');
    return (r.json?.sessions ?? []).find((s) => s?.title === title) ?? null;
  };
  const aMsgsOf = async (sid) => sid ? (await api(mockSrv.base, 'GET', `/api/v1/sessions/${sid}`)).json?.messages ?? [] : [];
  let aCapA01 = [], aCapA03 = [], aCapA04 = [];
  { /* A01 · 会话绑定 + 出参锚：trigger→agent→reply（reply 取 out-session 端口）；
       session 行 {title,model,sys}=节点标题/参数，messages 恰 2 条（user=in-goal 全文 + assistant=终文本） */
    const wfA01 = {
      name: 'smoke-agent-direct',
      nodes: [
        { id: 1, type: 'trigger', x: 40, y: 100, title: '手动触发' },
        { id: 2, type: 'agent', x: 320, y: 100, title: '测试智能体', params: { model: 'MockChat', sys: '你是测试智能体', maxSteps: 4 } },
        { id: 3, type: 'reply', x: 600, y: 100, title: '输出' },
      ],
      edges: [
        { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
        { id: 2, fn: 2, fp: 1, tn: 3, tp: 0 },
      ],
      inputs: { question: '智能体直答' },
    };
    const { sse } = await aRun(wfA01);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    aCapA01 = sse.events;
    const agentDone = sse.events.find((e) => e.type === 'node:done' && e.id === 2);
    const replyDone = sse.events.find((e) => e.type === 'node:done' && e.id === 3);
    const sess = await aSessionByTitle('测试智能体');
    const msgs = await aMsgsOf(sess?.id);
    C.ok(done.ok === true
      && String(agentDone?.out ?? '').includes('mock 允许：符合规范')
      && String(replyDone?.inputs?.[0]?.val ?? '').includes('"sessionId"')
      && !!sess && sess.model === 'MockChat' && sess.sys === '你是测试智能体'
      && msgs.length === 2 && msgs[0]?.role === 'user' && msgs[0]?.text === '智能体直答'
      && msgs[1]?.role === 'assistant' && msgs[1]?.text === AGENT_ALLOW,
      'A01', 'trigger→agent→reply：run:done{ok:true}；agent node:done.out 含 mock 终文本；reply node:done inputs[0].val 含 "sessionId"（out-session 出参锚）；GET sessions 按 title=测试智能体 → {model:"MockChat",sys:"你是测试智能体"} 且 messages 恰 2 条（user=智能体直答 / assistant=终文本）',
      { expected: 'run 完成 + sessionId 出参锚 + 会话 2 条落库', actual: JSON.stringify({ done: { ok: done.ok }, agentOut: agentDone?.out, replyVal: replyDone?.inputs?.[0]?.val, sess: sess ? { model: sess.model, sys: sess.sys } : null, msgs: msgs.map((m) => `${m.seq}:${m.role}`) }).slice(0, 300), ctx: 'mock 实例 POST /api/v1/run（agent params 显式，reply 接 fp:1）' });
  }
  { /* A02 · sqlite 真工具两步循环：步1 tool_call（safe 名 sqlite_execute → 内置 impl 真执行沙箱 SQL）
       → 步2 终文本；mock 非流式请求增量恰 2（步数=2 后模型终答） */
    const wfA02 = {
      name: 'smoke-agent-tool-loop',
      nodes: [
        { id: 1, type: 'agent', x: 100, y: 100, title: '工具轮智能体',
          params: { model: 'MockChat', sys: '你是测试智能体', maxSteps: 8 }, mcp: { sqlite: ['execute'] } },
      ],
      edges: [],
      inputs: { question: '智能体工具轮' },
    };
    const reqBefore = mockModel.requests.length;
    const { sse } = await aRun(wfA02);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const logs = sse.events.filter((e) => e.type === 'log').map((e) => String(e.msg ?? ''));
    const agentDone = sse.events.find((e) => e.type === 'node:done' && e.id === 1);
    const sess = await aSessionByTitle('工具轮智能体');
    const msgs = await aMsgsOf(sess?.id);
    C.ok(done.ok === true && mockModel.requests.length - reqBefore === 2
      && logs.some((m) => m.includes('🔧 工具调用 sqlite.execute')) && logs.some((m) => m.includes('🤖'))
      && String(agentDone?.out ?? '').includes('智能体工具轮完成') && typeof agentDone?.tokens === 'number'
      && msgs.length === 2 && msgs[0]?.role === 'user' && msgs[1]?.role === 'assistant' && msgs[1]?.text === '智能体工具轮完成',
      'A02', '单 agent（mcp sqlite.execute）+ 恒返 tool_call 两步 mock：请求增量恰 2；log 含「🔧 工具调用 sqlite.execute」与「🤖」工具请求行；node:done.out 含「智能体工具轮完成」且 tokens 为 number；会话 messages 恰 2 条（assistant=终文本）；run:done{ok:true}',
      { expected: '两步循环 + 工具 log + 终文本落库', actual: JSON.stringify({ done: { ok: done.ok }, reqs: mockModel.requests.length - reqBefore, toolLog: logs.some((m) => m.includes('🔧 工具调用 sqlite.execute')), robotLog: logs.some((m) => m.includes('🤖')), out: agentDone?.out, tokens: agentDone?.tokens, msgs: msgs.map((m) => `${m.seq}:${m.role}`) }).slice(0, 300), ctx: 'mock 实例 POST /api/v1/run（tool_call 形状见 SPEC §7 风险表）' });
  }
  { /* A03 · 预算上限：恒返 tool_call + maxSteps=2 → 恰 2 步自然收束（绝不超）；
       out=「（已达最大步数 2）」；assistant 空文本不落库（messages 恰 1 条 user） */
    const wfA03 = {
      name: 'smoke-agent-budget',
      nodes: [
        { id: 1, type: 'agent', x: 100, y: 100, title: '预算智能体',
          params: { model: 'MockChat', sys: '你是测试智能体', maxSteps: 2 }, mcp: { sqlite: ['execute'] } },
      ],
      edges: [],
      inputs: { question: '智能体预算穷尽' },
    };
    const reqBefore = mockModel.requests.length;
    const { sse } = await aRun(wfA03);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    aCapA03 = sse.events;
    const agentDone = sse.events.find((e) => e.type === 'node:done' && e.id === 1);
    const okLog = sse.events.find((e) => e.type === 'log' && String(e.msg ?? '').startsWith('✓'));
    const sess = await aSessionByTitle('预算智能体');
    const msgs = await aMsgsOf(sess?.id);
    C.ok(done.ok === true && mockModel.requests.length - reqBefore === 2
      && agentDone?.out === '（已达最大步数 2）'
      && String(okLog?.msg ?? '').includes('2/2 步')
      && msgs.length === 1 && msgs[0]?.role === 'user' && msgs[0]?.text === '智能体预算穷尽',
      'A03', 'maxSteps=2 + 恒返 tool_call：mock 请求增量恰 2（=maxSteps，绝不超）；node:done.out=「（已达最大步数 2）」（预算耗尽=正常收束 run:done{ok:true}）；✓ log 含「2/2 步」；messages 恰 1 条 user（assistant 空文本不落库）',
      { expected: '恰 2 步收束 + 预算耗尽 out + 1 条落库', actual: JSON.stringify({ done: { ok: done.ok }, reqs: mockModel.requests.length - reqBefore, out: agentDone?.out, okLog: okLog?.msg, msgs: msgs.map((m) => `${m.seq}:${m.role}`) }).slice(0, 300), ctx: 'mock 实例 POST /api/v1/run（maxSteps=2）' });
  }
  { /* A04 · 停止透传：慢轮 4s 应答窗内 stop → run:done{ok:false,stopped:true}；
       node:error{id:2,message:'已中止'} 出现且 agent 无 node:done；assistant 零落库；服务健康无孤儿 */
    const wfA04 = {
      name: 'smoke-agent-stop',
      nodes: [
        { id: 1, type: 'trigger', x: 40, y: 100, title: '手动触发' },
        { id: 2, type: 'agent', x: 320, y: 100, title: '慢轮智能体', params: { model: 'MockChat', sys: '你是测试智能体', maxSteps: 4 } },
      ],
      edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
      inputs: { question: '智能体慢轮' },
    };
    const { sse, runId } = await aRun(wfA04);
    let started = null;
    try {
      started = await sse.waitFor((e) => e.type === 'node:start' && e.id === 2, 15000);
    } catch (e) {
      C.fail('A04', 'waitFor node:start(id=2)（事件门，stop 前置）',
        { expected: 'node:start id=2', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（mock 实例，慢轮）' });
      throw new SmokeFailError('A04');
    }
    const stop = await api(mockSrv.base, 'POST', `/api/v1/run/${runId}/stop`, {});
    const done = await sse.waitFor((e) => e.type === 'run:done', 20000);
    await sse.waitEnd(10000);
    aCapA04 = sse.events;
    const agentErr = sse.events.find((e) => e.type === 'node:error' && e.id === 2);
    const agentDoneCount = sse.events.filter((e) => e.type === 'node:done' && e.id === 2).length;
    const sess = await aSessionByTitle('慢轮智能体');
    const msgs = await aMsgsOf(sess?.id);
    const listAfter = await api(mockSrv.base, 'GET', '/api/v1/sessions?limit=100');
    C.ok(started?.id === 2 && stop.status === 200
      && done.ok === false && done.stopped === true
      && agentErr?.message === '已中止' && agentDoneCount === 0
      && msgs.length === 1 && msgs[0]?.role === 'user' && msgs[0]?.text === '智能体慢轮'
      && listAfter.status === 200,
      'A04', 'node:start(2) 后 POST /run/:id/stop → 200 且 run:done{ok:false,stopped:true}；node:error{id:2,message:"已中止"} 出现且 agent 无 node:done；messages 恰 1 条 user（assistant 零落库）；随后 GET sessions 200（服务健康无孤儿）',
      { expected: '停止透传 + 已中止 + 零 assistant 落库', actual: JSON.stringify({ started: started?.id, stop: stop.status, done: { ok: done.ok, stopped: done.stopped }, err: agentErr?.message, agentDoneCount, msgs: msgs.map((m) => `${m.seq}:${m.role}`), list: listAfter.status }).slice(0, 300), ctx: `runId=${runId}（mock 实例，4s 应答窗内停止）` });
  }
  { /* A05 · 契约零新增：A01/A03/A04 捕获事件逐条 RunEventSchema 校验（agent 仅取用既有 15 种，events.ts 零 diff 联证） */
    const all = [...aCapA01, ...aCapA03, ...aCapA04];
    let parsed = 0, bad = null;
    for (const ev of all) {
      try { validateEvent(ev); parsed += 1; } catch (e) { bad = { type: ev?.type, err: String(e?.message ?? e) }; break; }
    }
    C.ok(bad === null && parsed === all.length,
      'A05', `A01/A03/A04 捕获的全部事件（${all.length} 条，含 node:delta/node:done/log/run:done）逐条通过 RunEventSchema 校验（零新增契约）`,
      { expected: `${all.length}/${all.length} 通过`, actual: bad ? `${parsed} 通过后失败于 ${bad.type}：${bad.err}` : `${parsed}/${all.length}`, ctx: '@agentflow/shared validateEvent（仅作校验器，被测系统仍只经 HTTP 触达）' });
  }

  /* T 组：终端只读流节点（T01-T03 · 迭代 0034 / BK-0037 · SPEC §9 AC3）——mock 实例。
   * 呈现承载 = reply 同构 sink：全文汇入 / out 摘要 / 空输入如实降级；
   * 零出站佐证 = T01/T02 全链路 mock 模型请求数零增量（termview 链路无任何模型调用）。 */
  const tReqBefore = mockModel.requests.length;
  const tRun = async (wf) => {
    const sse = await openSse(mockSrv.base, wf);
    const runId = (await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId;
    CLEAN.runIds.push(runId);
    return { sse, runId };
  };
  { /* T01 · userinput→prompt→termview 全文汇入：out 摘要「已呈现流 · N 字」+ output 事件全文 + run:done.outputs 含全文 */
    const full = '终端流固定文本：冒烟测试问题';
    const wfT01 = {
      name: 'smoke-termview-fulltext',
      nodes: [
        { id: 1, type: 'userinput', x: 40, y: 100, params: { var: 'question', defv: '冒烟测试问题' } },
        { id: 2, type: 'prompt', x: 320, y: 100, params: { tpl: '终端流固定文本：{{question}}' } },
        { id: 3, type: 'termview', x: 600, y: 100, title: '终端只读流' },
      ],
      edges: [
        { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
        { id: 2, fn: 2, fp: 0, tn: 3, tp: 0 },
      ],
      inputs: { question: '冒烟测试问题' },
    };
    const { sse } = await tRun(wfT01);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const tvDone = sse.events.find((e) => e.type === 'node:done' && e.id === 3);
    const outs = sse.events.filter((e) => e.type === 'output');
    C.ok(done.ok === true
      && tvDone?.out === `已呈现流 · ${full.length} 字`
      && outs.length === 1 && outs[0]?.text === full
      && Array.isArray(done.outputs) && done.outputs.includes(full),
      'T01', 'userinput→prompt→termview：termview node:done.out === 「已呈现流 · 14 字」（N=渲染文本实长）；output 事件恰 1 条且 text=全文；run:done.outputs 含全文（ctx.outputs 汇入）',
      { expected: '全文汇入 + 摘要字数一致 + outputs 落 run 产物', actual: JSON.stringify({ tvOut: tvDone?.out, outputs: outs.map((o) => o.text), runOutputs: done.outputs }).slice(0, 300), ctx: 'mock 实例 POST /api/v1/run（termview 零参数）' });
  }
  { /* T02 · trigger→termview 空输入如实降级：__trigger 对象经 toStr → ''，out=「已呈现流 · 0 字」不伪造内容 */
    const wfT02 = {
      name: 'smoke-termview-empty',
      nodes: [
        { id: 1, type: 'trigger', x: 40, y: 100, title: '手动触发' },
        { id: 2, type: 'termview', x: 320, y: 100, title: '终端只读流' },
      ],
      edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
    };
    const { sse } = await tRun(wfT02);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const tvDone = sse.events.find((e) => e.type === 'node:done' && e.id === 2);
    C.ok(done.ok === true && tvDone?.out === '已呈现流 · 0 字',
      'T02', 'trigger→termview 直连（__trigger 对象输入）：node:done.out === 「已呈现流 · 0 字」（toStr 对 __trigger 返回空串，如实降级不伪造）',
      { expected: '0 字降级摘要', actual: JSON.stringify({ tvOut: tvDone?.out, ok: done.ok }), ctx: 'mock 实例 POST /api/v1/run' });
  }
  { /* T03 · 零出站佐证：T01/T02 全链路 mock 模型请求数零增量（呈现承载 = 纯数据变换 + 事件转发） */
    C.ok(mockModel.requests.length === tReqBefore,
      'T03', 'T01/T02 两次 termview 全链路 run 的 mock 模型请求数零增量（零出站零进程零新依赖的运行时佐证）',
      { expected: '请求增量 0', actual: String(mockModel.requests.length - tReqBefore), ctx: 'mockModel.requests 计数（T01 前采样 vs T02 后）' });
  }

  /* O 组：网页展示节点（O01-O05 · 迭代 0033 / BK-0036 · SPEC §8）——主实例。
   * 呈现型 sink 无模型依赖、服务端零出站（仅校验 + 透传字符串 + 事件），
   * 全部走主实例（与 G/V/A 组的 mockSrv 差异点）；SSE 消费沿 aRun 同型。 */
  const oRun = async (wf) => {
    const sse = await openSse(srv.base, wf);
    const runId = (await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId;
    CLEAN.runIds.push(runId);
    return { sse, runId };
  };
  let oCapO01 = [], oCapO03 = [], oCapO04 = [];
  { /* O01 · URL 透传：userinput(defv=http URL) → webshow：out 摘要锚 + output 事件 + outputs 汇入 */
    let sse = null;
    try {
      ({ sse } = await oRun(wfShow('https://example.com/agentflow', '')));
    } catch (e) {
      C.fail('O01', 'O 组前置（openSse + run:accepted）', { expected: 'run:accepted', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，wfShow）' });
      throw new SmokeFailError('O01');
    }
    let done = null;
    try {
      done = await sse.waitFor((e) => e.type === 'run:done', 20000);
    } catch (e) {
      C.fail('O01', 'waitFor run:done（事件门）', { expected: 'run:done{ok:true}', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，O01 URL 透传）' });
      throw new SmokeFailError('O01');
    }
    await sse.waitEnd(10000);
    oCapO01 = sse.events;
    const wsDone = sse.events.find((e) => e.type === 'node:done' && e.id === 2);
    const outEv = sse.events.find((e) => e.type === 'output');
    C.ok(done.ok === true && Array.isArray(done.outputs) && done.outputs.includes('https://example.com/agentflow')
      && wsDone?.out === '已呈现网页 · https://example.com/agentflow'
      && outEv?.text === 'https://example.com/agentflow',
      'O01', 'userinput(defv=https URL)→webshow：run:done{ok:true} 且 outputs 含该 URL；webshow node:done(id=2).out ===「已呈现网页 · <url>」；存在 output 事件且 text === 该 URL',
      { expected: 'ok:true + outputs 含 URL + out 摘要锚 + output 事件', actual: JSON.stringify({ done: { ok: done.ok, outputs: done.outputs }, out: wsDone?.out, outEv: outEv?.text }).slice(0, 300), ctx: 'POST /api/v1/run（主实例，输入端口值优先）' });
  }
  { /* O02 · 静态兜底：trigger 对象经 strInput 归空 → params.url 生效（独立夹具常量） */
    const wfStatic = {
      name: 'smoke-webshow-static',
      nodes: [
        { id: 1, type: 'trigger', x: 40, y: 100, title: '手动触发' },
        { id: 2, type: 'webshow', x: 320, y: 100, params: { url: 'https://example.com/static-fallback' } },
      ],
      edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
      inputs: {},
    };
    let sse = null;
    try {
      ({ sse } = await oRun(wfStatic));
    } catch (e) {
      C.fail('O02', 'O 组前置（openSse + run:accepted）', { expected: 'run:accepted', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，trigger→webshow）' });
      throw new SmokeFailError('O02');
    }
    let done = null;
    try {
      done = await sse.waitFor((e) => e.type === 'run:done', 20000);
    } catch (e) {
      C.fail('O02', 'waitFor run:done（事件门）', { expected: 'run:done{ok:true}', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，O02 静态兜底）' });
      throw new SmokeFailError('O02');
    }
    await sse.waitEnd(10000);
    const wsDone = sse.events.find((e) => e.type === 'node:done' && e.id === 2);
    C.ok(done.ok === true && Array.isArray(done.outputs) && done.outputs.includes('https://example.com/static-fallback')
      && wsDone?.out === '已呈现网页 · https://example.com/static-fallback',
      'O02', 'trigger→webshow(params.url=静态兜底)：trigger 对象输入端口值归空（strInput 语义）→ 兜底参数生效：out ===「已呈现网页 · <兜底URL>」且 outputs 含该 URL；run:done{ok:true}',
      { expected: 'ok:true + outputs 含兜底 URL + out 摘要锚', actual: JSON.stringify({ done: { ok: done.ok, outputs: done.outputs }, out: wsDone?.out }).slice(0, 300), ctx: 'POST /api/v1/run（主实例，静态兜底路径）' });
  }
  { /* O03 · 非 http(s) 降级：javascript: 输入 → warn + 占位，不伪造、不崩、零汇入 */
    let sse = null;
    try {
      ({ sse } = await oRun(wfShow('javascript:alert(1)', '')));
    } catch (e) {
      C.fail('O03', 'O 组前置（openSse + run:accepted）', { expected: 'run:accepted', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，wfShow）' });
      throw new SmokeFailError('O03');
    }
    let done = null;
    try {
      done = await sse.waitFor((e) => e.type === 'run:done', 20000);
    } catch (e) {
      C.fail('O03', 'waitFor run:done（事件门，降级不崩的直接锚）', { expected: 'run:done{ok:true}', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，O03 非 http(s)）' });
      throw new SmokeFailError('O03');
    }
    await sse.waitEnd(10000);
    oCapO03 = sse.events;
    const wsDone = sse.events.find((e) => e.type === 'node:done' && e.id === 2);
    const warns = sse.events.filter((e) => e.type === 'log' && e.lvl === 'warn').map((e) => String(e.msg ?? ''));
    C.ok(done.ok === true && Array.isArray(done.outputs) && done.outputs.length === 0
      && wsDone?.out === '未呈现 · 无有效网址（占位降级）'
      && warns.some((m) => m.includes('webshow') && m.includes('占位降级'))
      && !sse.events.some((e) => e.type === 'output'),
      'O03', 'javascript: 输入：run:done{ok:true}（降级不崩）且 outputs 深等 []（零汇入）；node:done.out ===「未呈现 · 无有效网址（占位降级）」；log warn 含「webshow」与「占位降级」；无任何 output 事件（不伪造结果）',
      { expected: 'ok:true + outputs=[] + 占位 out + warn + 零 output 事件', actual: JSON.stringify({ done: { ok: done.ok, outputs: done.outputs }, out: wsDone?.out, warnHit: warns.some((m) => m.includes('webshow') && m.includes('占位降级')), outEvents: sse.events.filter((e) => e.type === 'output').length }).slice(0, 300), ctx: 'POST /api/v1/run（主实例，协议白名单拒绝路径）' });
  }
  { /* O04 · 空输入降级：defv 空 + 兜底空 → 同 O03 判据 */
    let sse = null;
    try {
      ({ sse } = await oRun(wfShow('', '')));
    } catch (e) {
      C.fail('O04', 'O 组前置（openSse + run:accepted）', { expected: 'run:accepted', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，wfShow）' });
      throw new SmokeFailError('O04');
    }
    let done = null;
    try {
      done = await sse.waitFor((e) => e.type === 'run:done', 20000);
    } catch (e) {
      C.fail('O04', 'waitFor run:done（事件门，降级不崩的直接锚）', { expected: 'run:done{ok:true}', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（主实例，O04 空输入）' });
      throw new SmokeFailError('O04');
    }
    await sse.waitEnd(10000);
    oCapO04 = sse.events;
    const wsDone = sse.events.find((e) => e.type === 'node:done' && e.id === 2);
    const warns = sse.events.filter((e) => e.type === 'log' && e.lvl === 'warn').map((e) => String(e.msg ?? ''));
    C.ok(done.ok === true && Array.isArray(done.outputs) && done.outputs.length === 0
      && wsDone?.out === '未呈现 · 无有效网址（占位降级）'
      && warns.some((m) => m.includes('webshow') && m.includes('占位降级'))
      && !sse.events.some((e) => e.type === 'output'),
      'O04', '空输入 + 空兜底：run:done{ok:true} 且 outputs 深等 []；out ===「未呈现 · 无有效网址（占位降级）」；log warn 含「webshow」与「占位降级」；无任何 output 事件',
      { expected: 'ok:true + outputs=[] + 占位 out + warn + 零 output 事件', actual: JSON.stringify({ done: { ok: done.ok, outputs: done.outputs }, out: wsDone?.out, warnHit: warns.some((m) => m.includes('webshow') && m.includes('占位降级')), outEvents: sse.events.filter((e) => e.type === 'output').length }).slice(0, 300), ctx: 'POST /api/v1/run（主实例，空输入路径）' });
  }
  { /* O05 · 契约零新增：O01/O03/O04 捕获事件逐条 RunEventSchema 校验（webshow 仅取用既有 15 种，events.ts 零 diff 联证——A05 同型） */
    const all = [...oCapO01, ...oCapO03, ...oCapO04];
    let parsed = 0, bad = null;
    for (const ev of all) {
      try { validateEvent(ev); parsed += 1; } catch (e) { bad = { type: ev?.type, err: String(e?.message ?? e) }; break; }
    }
    C.ok(bad === null && parsed === all.length,
      'O05', `O01/O03/O04 捕获的全部事件（${all.length} 条，含 node:done/log/run:done）逐条通过 RunEventSchema 校验（零新增契约）`,
      { expected: `${all.length}/${all.length} 通过`, actual: bad ? `${parsed} 通过后失败于 ${bad.type}：${bad.err}` : `${parsed}/${all.length}`, ctx: '@agentflow/shared validateEvent（仅作校验器，被测系统仍只经 HTTP 触达）' });
  }

  /* J 组：JSON 画布节点（J01-J04 · 迭代 0035 / BK-0038 · SPEC §9 AC3）——mock 实例。
   * 呈现承载 = reply/webshow 同构 sink：对象/数组序列化汇入 / 字符串原样 /
   * 空输入 0 项 / 非 JSON 原文降级；零出站佐证 = J01-J03 全链路 mock 模型请求数零增量。 */
  const jReqBefore = mockModel.requests.length;
  const jRun = async (wf) => {
    const sse = await openSse(mockSrv.base, wf);
    const runId = (await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId;
    CLEAN.runIds.push(runId);
    return { sse, runId };
  };
  { /* J01 · userinput→prompt(固定 JSON 字面量)→jsoncanvas：out 摘要「已呈现 JSON · 2 项」+ output 事件全文 + run:done.outputs 含全文 */
    const json = '{"a":1,"b":2}';
    const wfJ01 = {
      name: 'smoke-jsoncanvas-object',
      nodes: [
        { id: 1, type: 'userinput', x: 40, y: 100, params: { var: 'question', defv: '冒烟测试问题' } },
        { id: 2, type: 'prompt', x: 320, y: 100, params: { tpl: '{"a":1,"b":2}' } },
        { id: 3, type: 'jsoncanvas', x: 600, y: 100, title: 'JSON 画布' },
      ],
      edges: [
        { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
        { id: 2, fn: 2, fp: 0, tn: 3, tp: 0 },
      ],
      inputs: { question: '冒烟测试问题' },
    };
    const { sse } = await jRun(wfJ01);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const jcDone = sse.events.find((e) => e.type === 'node:done' && e.id === 3);
    const outs = sse.events.filter((e) => e.type === 'output');
    C.ok(done.ok === true
      && jcDone?.out === '已呈现 JSON · 2 项'
      && outs.length === 1 && outs[0]?.text === json
      && Array.isArray(done.outputs) && done.outputs.includes(json),
      'J01', 'userinput→prompt(固定 JSON)→jsoncanvas：jsoncanvas node:done.out === 「已呈现 JSON · 2 项」（顶层键数 N=2）；output 事件恰 1 条且 text=该 JSON（字符串原样通道）；run:done.outputs 含该 JSON（ctx.outputs 汇入）',
      { expected: 'JSON 序列化汇入 + 摘要 2 项 + outputs 落 run 产物', actual: JSON.stringify({ jcOut: jcDone?.out, outputs: outs.map((o) => o.text), runOutputs: done.outputs }).slice(0, 300), ctx: 'mock 实例 POST /api/v1/run（jsoncanvas 零参数）' });
  }
  { /* J02 · trigger→jsoncanvas 空输入如实呈现：__trigger 哨兵 → 空串，out=「已呈现 JSON · 0 项」不伪造内容 */
    const wfJ02 = {
      name: 'smoke-jsoncanvas-empty',
      nodes: [
        { id: 1, type: 'trigger', x: 40, y: 100, title: '手动触发' },
        { id: 2, type: 'jsoncanvas', x: 320, y: 100, title: 'JSON 画布' },
      ],
      edges: [{ id: 1, fn: 1, fp: 0, tn: 2, tp: 0 }],
    };
    const { sse } = await jRun(wfJ02);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const jcDone = sse.events.find((e) => e.type === 'node:done' && e.id === 2);
    C.ok(done.ok === true && jcDone?.out === '已呈现 JSON · 0 项',
      'J02', 'trigger→jsoncanvas 直连（__trigger 哨兵输入）：node:done.out === 「已呈现 JSON · 0 项」（空输入如实空呈现，不伪造内容）',
      { expected: '0 项空呈现摘要', actual: JSON.stringify({ jcOut: jcDone?.out, ok: done.ok }), ctx: 'mock 实例 POST /api/v1/run' });
  }
  { /* J03 · 非 JSON 字符串原样透传：prompt tpl=hello → out「已呈现原文 · 5 字（非 JSON，前端原文降级）」+ output text=hello */
    const wfJ03 = {
      name: 'smoke-jsoncanvas-prose',
      nodes: [
        { id: 1, type: 'userinput', x: 40, y: 100, params: { var: 'question', defv: '冒烟测试问题' } },
        { id: 2, type: 'prompt', x: 320, y: 100, params: { tpl: 'hello' } },
        { id: 3, type: 'jsoncanvas', x: 600, y: 100, title: 'JSON 画布' },
      ],
      edges: [
        { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
        { id: 2, fn: 2, fp: 0, tn: 3, tp: 0 },
      ],
      inputs: { question: '冒烟测试问题' },
    };
    const { sse } = await jRun(wfJ03);
    const done = await sse.waitFor((e) => e.type === 'run:done', 30000);
    await sse.waitEnd(10000);
    const jcDone = sse.events.find((e) => e.type === 'node:done' && e.id === 3);
    const outs = sse.events.filter((e) => e.type === 'output');
    C.ok(done.ok === true
      && jcDone?.out === '已呈现原文 · 5 字（非 JSON，前端原文降级）'
      && outs.length === 1 && outs[0]?.text === 'hello',
      'J03', 'prompt(tpl=hello)→jsoncanvas：非 JSON 字符串原样透传（output text=hello）；node:done.out === 「已呈现原文 · 5 字（非 JSON，前端原文降级）」（不谎称已呈现 JSON）',
      { expected: '字符串原样 + 原文降级摘要', actual: JSON.stringify({ jcOut: jcDone?.out, outputs: outs.map((o) => o.text) }).slice(0, 300), ctx: 'mock 实例 POST /api/v1/run（字符串原样通道）' });
  }
  { /* J04 · 零出站佐证：J01-J03 全链路 mock 模型请求数零增量（呈现承载 = 纯数据变换 + 事件转发） */
    C.ok(mockModel.requests.length === jReqBefore,
      'J04', 'J01-J03 三次 jsoncanvas 全链路 run 的 mock 模型请求数零增量（零出站零进程零新依赖的运行时佐证）',
      { expected: '请求增量 0', actual: String(mockModel.requests.length - jReqBefore), ctx: 'mockModel.requests 计数（J01 前采样 vs J03 后）' });
  }

  /* B 组：workbench git 信息端点 E1（B01-B05 · 迭代 0036 / BK-0040 · SPEC §3.7）——
   * B01-B03 主实例、B04 专用探针实例、B05 纯源扫描（MT12 先例）。B01/B04 合成
   * PROJECT_ROOT 锚定精确性双向机器证明：B01 拦「锚少一级」（apps/server 无 .git →
   * 404 → 红），B04 拦「误用 process.cwd()」（cwd=真仓库则 200 → 红，ADR-0016 §3.0
   * 否决案）。已知限制如实标注：git 超时 / git 二进制缺失（ENOENT）不做 HTTP 级
   * 测试（win32 无法可移植地伪造慢 git/缺二进制），由 B05 源扫描同构形态背书
   * （setTimeout 5s + .kill()，code.ts:53 同款）。 */
  { /* B01 · E1 正常契约（主实例，工作树即真 git 仓库）：键集恰四键 + 各字段形状 */
    const b1 = await api(srv.base, 'GET', '/api/v1/workbench/git');
    const keys = b1.json && typeof b1.json === 'object' && !Array.isArray(b1.json)
      ? Object.keys(b1.json).sort().join(',') : '';
    const changesOk = Array.isArray(b1.json?.changes) && b1.json.changes.every(c =>
      typeof c?.status === 'string' && c.status.length === 2
      && typeof c?.path === 'string' && c.path !== ''
      && (c?.from === undefined || typeof c.from === 'string'));
    const commitsOk = Array.isArray(b1.json?.commits) && b1.json.commits.length >= 1
      && b1.json.commits.length <= 20
      && b1.json.commits.every(c => /^[0-9a-f]{40}$/.test(String(c?.sha ?? ''))
        && /^[0-9a-f]{7,40}$/.test(String(c?.short ?? ''))
        && typeof c?.author === 'string' && c.author !== ''
        && Number.isInteger(c?.ts) && c.ts > 0
        && typeof c?.subject === 'string');
    C.ok(b1.status === 200 && keys === 'branch,changes,commits,head'
      && typeof b1.json?.branch === 'string' && b1.json.branch !== ''
      && /^[0-9a-f]{7,40}$/.test(String(b1.json?.head ?? ''))
      && changesOk && commitsOk,
      'B01', 'GET /api/v1/workbench/git → 200；键集恰 {branch,head,changes,commits}；branch 非空；head 7-40 hex；changes 每项 {status:2字符,path,from?}；commits 1..20 条、每项 {sha:40hex,short:7-40hex,author:非空,ts:正整数毫秒,subject:string}',
      { expected: '200 四键契约', actual: JSON.stringify({ status: b1.status, keys, branch: b1.json?.branch, head: b1.json?.head, nChanges: b1.json?.changes?.length, nCommits: b1.json?.commits?.length, changesOk, commitsOk }).slice(0, 260), ctx: ctxOf(b1) });
  }
  { /* B02 · limit 有效值：?limit=1 → 恰 1 条；?limit=3 → 1..3 条 */
    const b2a = await api(srv.base, 'GET', '/api/v1/workbench/git?limit=1');
    const b2b = await api(srv.base, 'GET', '/api/v1/workbench/git?limit=3');
    C.ok(b2a.status === 200 && b2a.json?.commits?.length === 1
      && b2b.status === 200 && Array.isArray(b2b.json?.commits)
      && b2b.json.commits.length >= 1 && b2b.json.commits.length <= 3,
      'B02', 'GET /workbench/git?limit=1 → commits.length===1；?limit=3 → commits 1..3 条',
      { expected: 'limit1=1 且 limit3∈1..3', actual: `limit1=${b2a.json?.commits?.length} limit3=${b2b.json?.commits?.length}`, ctx: `${ctxOf(b2a)} | ${ctxOf(b2b)}` });
  }
  { /* B03 · limit 非法值：0 / 101 / abc → 各 400 {error:"limit 必须是 1-100 的整数"}（N02/G02 同型） */
    const rs = [];
    for (const u of ['/api/v1/workbench/git?limit=0', '/api/v1/workbench/git?limit=101', '/api/v1/workbench/git?limit=abc']) {
      rs.push(await api(srv.base, 'GET', u));
    }
    C.ok(rs.every(r => r.status === 400 && r.json?.error === 'limit 必须是 1-100 的整数'),
      'B03', 'limit=0 / limit=101 / limit=abc → 各 400 {error:"limit 必须是 1-100 的整数"}',
      { expected: '3× 400 + error 字面量', actual: rs.map(r => `${r.status}:${r.json?.error ?? r.text.slice(0, 40)}`).join(' | '), ctx: rs.map(ctxOf).join(' | ') });
  }
  { /* B04 · 404 无仓库 + cwd 无关（专用探针实例，自建自清理）：mkdtemp 临时非 git 目录，
       递归复制两 dist 目录（server.ts 启动校验需 index.html）+ node_modules junction 指向
       本仓 node_modules（依赖全提升至根，@agentflow/* 指向工作树自身）；spawn cwd 刻意
       = REPO_ROOT（真仓库）——若实现误用 process.cwd() 则 rev-parse 成功 → 200 → 红。 */
    const bTmp = mkdtempSync(path.join(tmpdir(), 'af-wb-smoke-'));
    let bChild = null;
    let bExit = null;
    try {
      cpSync(path.join(REPO_ROOT, 'apps', 'server', 'dist'), path.join(bTmp, 'apps', 'server', 'dist'), { recursive: true });
      /* package.json 必须随行：ESM 裸包解析以最近 package.json 为作用域基点，
         缺失时模块上下文漂移到用户目录（实测 ERR_MODULE_NOT_FOUND 'express'） */
      cpSync(path.join(REPO_ROOT, 'apps', 'server', 'package.json'), path.join(bTmp, 'apps', 'server', 'package.json'));
      cpSync(path.join(REPO_ROOT, 'apps', 'web', 'dist'), path.join(bTmp, 'apps', 'web', 'dist'), { recursive: true });
      /* 依赖仓定位：REPO_ROOT/node_modules 在工作树形态下是挂满悬挂 junction 的壳
         （实测解析穿透到主仓 node_modules——工作树物理嵌套于主仓内，主实例同款
         解析路径）；向上取第一个真含 express 的 node_modules。CI（主干 checkout）
         首跳即命中 REPO_ROOT/node_modules 自身。 */
      let depStore = null;
      for (let d = REPO_ROOT; ; d = path.dirname(d)) {
        if (existsSync(path.join(d, 'node_modules', 'express', 'package.json'))) { depStore = path.join(d, 'node_modules'); break; }
        if (path.dirname(d) === d) break;
      }
      if (!depStore) {
        C.fail('B04', '依赖仓定位（向上找含 express 的 node_modules）', { expected: '命中一处依赖仓', actual: 'REPO_ROOT 向上未找到', ctx: `REPO_ROOT=${REPO_ROOT}` });
        throw new SmokeFailError('B04');
      }
      symlinkSync(depStore, path.join(bTmp, 'node_modules'), 'junction');
      const bPort = await getFreePort();
      const bBase = `http://127.0.0.1:${bPort}`;
      bChild = spawn(process.execPath, [path.join(bTmp, 'apps', 'server', 'dist', 'server.js')], {
        cwd: REPO_ROOT,
        env: { ...process.env, PORT: String(bPort), BOCHA_API_KEY: '', SEARXNG_URL: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      bExit = new Promise(res => bChild.once('exit', (c, s) => res({ code: c, signal: s })));
      let bOut = '';
      let bExited = false;
      void bExit.then(() => { bExited = true; });
      bChild.stdout.setEncoding('utf8'); bChild.stdout.on('data', d => { bOut += d; });
      bChild.stderr.setEncoding('utf8'); bChild.stderr.on('data', d => { bOut += d; });
      let bHealth = null;
      const bt0 = Date.now();
      for (;;) {
        if (bExited) break;
        try {
          const r = await fetch(`${bBase}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
          if (r.status === 200) { bHealth = { status: r.status, json: await r.json().catch(() => null) }; break; }
        } catch { /* 未就绪，继续轮询 */ }
        if (Date.now() - bt0 > 20000) break;
        await sleep(250);
      }
      const b4 = bHealth
        ? await api(bBase, 'GET', '/api/v1/workbench/git')
        : { status: 0, json: null, text: `探针实例未就绪（exit=${bExited}）${bOut.slice(-160)}`, method: 'GET', url: '/api/v1/workbench/git' };
      C.ok(bHealth?.status === 200 && bHealth.json?.ok === true
        && b4.status === 404 && b4.json?.error === 'not a git repository',
        'B04', '探针实例（临时非 git 目录，spawn cwd=仓库根）健康 200 → GET /api/v1/workbench/git → 404 {error:"not a git repository"}（误锚 process.cwd() 会得 200 恰好击穿；与 B01 合成锚定双向证明）',
        { expected: 'health 200 + 404 not a git repository', actual: JSON.stringify({ health: bHealth?.status, ok: bHealth?.json?.ok, wb: `${b4.status} ${b4.json?.error ?? String(b4.text).slice(0, 60)}` }), ctx: `tmp=${bTmp} | spawn cwd=REPO_ROOT` });
    } finally {
      if (bChild) {
        try { bChild.kill(); } catch { /* 已退出 */ }
        await Promise.race([bExit, sleep(3000)]);
        try { bChild.kill('SIGKILL'); } catch { /* 已退出 */ }
      }
      try { rmSync(bTmp, { recursive: true, force: true }); } catch { /* 尽力而为，如实容忍 */ }
    }
  }
  { /* B05 · 纪律源扫描（MT12 先例）：workbench 三源码 /shell/i 零命中（含注释——注释
       写「命令解释器」；推论 spawn 未显式传命令解释器选项）；git.ts 含 setTimeout( 与
       .kill()（5s 超时强杀形态在场）；可写命令单引号 argv 字面量零命中；
       rev-parse/status/log 三词在场（只读白名单承载本体） */
    const wbSrc = {};
    for (const f of ['root.ts', 'git.ts', 'routes.ts']) {
      wbSrc[f] = readFileSync(path.join(REPO_ROOT, 'apps', 'server', 'src', 'workbench', f), 'utf8');
    }
    const g = wbSrc['git.ts'];
    const shellHit = Object.entries(wbSrc).filter(([, s]) => /shell/i.test(s)).map(([f]) => f);
    const writeHit = g.match(/'(add|commit|push|pull|checkout|reset|clean|merge|rebase|stash)'/g) ?? [];
    C.ok(shellHit.length === 0 && g.includes('setTimeout(') && g.includes('.kill()')
      && writeHit.length === 0
      && ['rev-parse', 'status', 'log'].every(w => g.includes(w)),
      'B05', '源码扫描：workbench 三文件 /shell/i 零命中；git.ts 有 setTimeout( 与 .kill()（5s 强杀）；可写命令单引号 argv 字面量零命中；rev-parse/status/log 在场（只读白名单）',
      { expected: 'shell 零命中 + 超时形态在场 + 可写零命中 + 三命令在场', actual: JSON.stringify({ shellHit, timeout: g.includes('setTimeout('), kill: g.includes('.kill()'), writeHit }), ctx: 'apps/server/src/workbench/{root,git,routes}.ts readFileSync 字面扫描' });
  }

  /* B 组续：workbench diff 审查端点 E2（B06-B12 · 迭代 0054 / BK-0041 · SPEC §3.8）——
   * B06-B10 主实例（确定性锚 = 固定提交对 ed2f8ed↔d880b62：父子相邻、历史不可变、
   * diff 恰 2 文件非二进制无改名；必须用字面 sha——HEAD~1 形态在 BUILD 提交后漂移，
   * 且 ~ 被 ref 白名单拒绝）、B11 专用探针实例（B04 同型自建自清理）、B12 纯源扫描
   * （B05 同型，扩扫 diff.ts + 复扫 routes.ts）。已知限制如实标注：git 超时 / git
   * 二进制缺失（ENOENT）不做 HTTP 级测试（win32 无法可移植伪造，B04 同款），由
   * B12 源扫描 + runGit 复用（B05 已断言 setTimeout/kill 形态在 git.ts）背书。 */
  { /* B06 · E2 默认契约（无参 = HEAD↔工作区）：键集恰两键 + files 每项五键形状；
       files 条数不定不断言（主实例工作区脏度随轮次变化，CI 干净检出时可为空——
       只锁形状不锁数量，如实口径） */
    const b6 = await api(srv.base, 'GET', '/api/v1/workbench/diff');
    const b6keys = b6.json && typeof b6.json === 'object' && !Array.isArray(b6.json)
      ? Object.keys(b6.json).sort().join(',') : '';
    const b6filesOk = Array.isArray(b6.json?.files) && b6.json.files.every(f =>
      typeof f?.path === 'string' && f.path !== ''
      && typeof f?.status === 'string' && /^[MADR]$/.test(f.status)
      && Number.isInteger(f?.adds) && f.adds >= 0
      && Number.isInteger(f?.dels) && f.dels >= 0
      && typeof f?.patch === 'string');
    C.ok(b6.status === 200 && b6keys === 'files,truncated' && b6filesOk
      && typeof b6.json?.truncated === 'boolean',
      'B06', 'GET /api/v1/workbench/diff（无参 = HEAD↔工作区）→ 200；键集恰 {files,truncated}；files 每项恰五键 {path,status,adds,dels,patch}（path 非空 / status /^[MADR]$/ / adds、dels 非负整数 / patch string）；truncated boolean；条数不定不断言（工作区脏度随轮次变化）',
      { expected: '200 两键契约 + 五键文件形状', actual: JSON.stringify({ status: b6.status, keys: b6keys, n: b6.json?.files?.length, truncated: b6.json?.truncated, filesOk: b6filesOk }).slice(0, 220), ctx: ctxOf(b6) });
  }
  { /* B07 · 显式 ref 对 + path 前缀（固定提交对）：默认模式 files 锁 2 条 + 路径集合
       + 逐文件 status/adds/dels + truncated=false；path 前缀过滤生效（docs → 1 条、
       .zcode → 1 条） */
    const b7 = await api(srv.base, 'GET', '/api/v1/workbench/diff?base=ed2f8ed&head=d880b62');
    const files7 = b7.json?.files ?? [];
    const paths7 = files7.map(f => f.path).sort().join('|');
    const by7 = Object.fromEntries(files7.map(f => [f.path, f]));
    const b7d = await api(srv.base, 'GET', '/api/v1/workbench/diff?base=ed2f8ed&head=d880b62&path=docs');
    const b7z = await api(srv.base, 'GET', '/api/v1/workbench/diff?base=ed2f8ed&head=d880b62&path=.zcode');
    C.ok(b7.status === 200 && files7.length === 2 && b7.json?.truncated === false
      && paths7 === '.zcode/workflows/evolution-iteration.dwf.ts|docs/evolution/STATE.md'
      && by7['.zcode/workflows/evolution-iteration.dwf.ts']?.status === 'M'
      && by7['.zcode/workflows/evolution-iteration.dwf.ts']?.adds === 21
      && by7['.zcode/workflows/evolution-iteration.dwf.ts']?.dels === 7
      && by7['docs/evolution/STATE.md']?.status === 'M'
      && by7['docs/evolution/STATE.md']?.adds === 2
      && by7['docs/evolution/STATE.md']?.dels === 2
      && b7d.status === 200 && b7d.json?.files?.length === 1
      && String(b7d.json?.files?.[0]?.path ?? '').startsWith('docs/')
      && b7z.status === 200 && b7z.json?.files?.length === 1
      && String(b7z.json?.files?.[0]?.path ?? '').startsWith('.zcode/'),
      'B07', 'diff?base=ed2f8ed&head=d880b62 → 200 files=2（.zcode/workflows/evolution-iteration.dwf.ts=(M,21,7)、docs/evolution/STATE.md=(M,2,2)）、truncated=false；&path=docs → 1 条 docs/ 前缀；&path=.zcode → 1 条 .zcode/ 前缀（固定提交对确定性锚）',
      { expected: '固定提交对确定性 diff', actual: JSON.stringify({ status: b7.status, paths: paths7, addsDels: files7.map(f => `${f.path}:${f.adds}+${f.dels}:${f.status}`), docs: `${b7d.status}:${b7d.json?.files?.length}`, zcode: `${b7z.status}:${b7z.json?.files?.length}` }).slice(0, 320), ctx: ctxOf(b7) });
  }
  { /* B08 · stat 模式（--numstat 定形面，SPEC §3.1.3）：跨模式计数一致（numstat 行数
       === patch 块数机器互证）+ 每项 status=''/patch='' + adds/dels 与 B07 逐文件相等；
       stat=abc → 400 */
    const b8 = await api(srv.base, 'GET', '/api/v1/workbench/diff?base=ed2f8ed&head=d880b62&stat=1');
    const files8 = b8.json?.files ?? [];
    const by8 = Object.fromEntries(files8.map(f => [f.path, f]));
    const b8bad = await api(srv.base, 'GET', '/api/v1/workbench/diff?stat=abc');
    C.ok(b8.status === 200 && files8.length === 2
      && files8.every(f => f.status === '' && f.patch === '')
      && by8['.zcode/workflows/evolution-iteration.dwf.ts']?.adds === 21
      && by8['.zcode/workflows/evolution-iteration.dwf.ts']?.dels === 7
      && by8['docs/evolution/STATE.md']?.adds === 2
      && by8['docs/evolution/STATE.md']?.dels === 2
      && b8bad.status === 400 && b8bad.json?.error === 'stat 必须是 0/1/true/false',
      'B08', 'diff?base=ed2f8ed&head=d880b62&stat=1 → 200 files=2（与 B07 默认模式跨模式计数一致）；每项 status===""、patch===""、adds/dels 与 B07 逐文件相等；stat=abc → 400 {error:"stat 必须是 0/1/true/false"}',
      { expected: 'numstat 定形面 + stat 界值反例', actual: JSON.stringify({ status: b8.status, n: files8.length, rows: files8.map(f => `${f.path}:${f.adds}+${f.dels}`), bad: `${b8bad.status}:${b8bad.json?.error}` }).slice(0, 300), ctx: ctxOf(b8) });
  }
  { /* B09 · ref 白名单 400 反例：- 开头（选项注入）/ 白名单外字符（;rm）/ 空串（在而
       缺省不在）/ HEAD~1（~ 不在白名单——SPEC §3.1.2 已知限制的正反例承载）；
       合法形状但不可解析（假 sha deadbeef）→ 400 ref 不存在或不可解析 */
    const bads9 = ['-x', 'main;rm', '', 'HEAD~1'];
    const rs9 = [];
    for(const v of bads9) rs9.push(await api(srv.base, 'GET', `/api/v1/workbench/diff?base=${encodeURIComponent(v)}`));
    const unres9 = await api(srv.base, 'GET', '/api/v1/workbench/diff?base=deadbeef');
    C.ok(rs9.every(r => r.status === 400 && r.json?.error === 'base 或 head ref 非法')
      && unres9.status === 400 && unres9.json?.error === 'base 或 head ref 不存在或不可解析',
      'B09', 'base=-x / base=main;rm / base=（空串在而缺省不在）/ base=HEAD~1 → 各 400 {error:"base 或 head ref 非法"}；base=deadbeef（合法形状不可解析）→ 400 {error:"base 或 head ref 不存在或不可解析"}（git 语义级 400，用户手误 ref 得 4xx 非 5xx）',
      { expected: '5× 400 两类字面量', actual: rs9.map((r, i) => `${JSON.stringify(bads9[i])}:${r.status}:${r.json?.error}`).join(' | ') + ` | deadbeef:${unres9.status}:${unres9.json?.error}`, ctx: rs9.map(ctxOf).join(' | ') });
  }
  { /* B10 · path 越界 400：../ 逃逸 / 深层逃逸 / 绝对路径注入（win32 盘符形态 D:/ +
       POSIX 根形态 /etc——resolve 归一后非项目根内同拒；smoke:server 仅本机 win32
       与 windows CI 面向，CI contracts job 不跑本组） */
    const bads10 = ['../', '../../', 'D:/', '/etc'];
    const rs10 = [];
    for(const v of bads10) rs10.push(await api(srv.base, 'GET', `/api/v1/workbench/diff?path=${encodeURIComponent(v)}`));
    C.ok(rs10.every(r => r.status === 400 && r.json?.error === 'path 越界'),
      'B10', 'path=../ / path=../../ / path=D:/（win32 绝对注入）/ path=/etc（POSIX 绝对注入）→ 各 400 {error:"path 越界"}（path.resolve 归一后前缀校验，非项目根内即拒）',
      { expected: '4× 400 path 越界', actual: rs10.map((r, i) => `${bads10[i]}:${r.status}:${r.json?.error}`).join(' | '), ctx: rs10.map(ctxOf).join(' | ') });
  }
  { /* B11 · 404 无仓库（B04 同型专用探针实例，自建自清理）：mkdtemp 临时非 git 目录 +
       双 dist 复制 + node_modules junction；spawn cwd 刻意 = REPO_ROOT（真仓库）→
       健康后 GET /api/v1/workbench/diff → 404（E2 rev-parse 探测面；误锚
       process.cwd() 会得 200 恰好击穿——与 B01/B04 同款双向证明的 diff 侧延伸） */
    const b11Tmp = mkdtempSync(path.join(tmpdir(), 'af-wbdiff-smoke-'));
    let b11Child = null;
    let b11Exit = null;
    try {
      cpSync(path.join(REPO_ROOT, 'apps', 'server', 'dist'), path.join(b11Tmp, 'apps', 'server', 'dist'), { recursive: true });
      cpSync(path.join(REPO_ROOT, 'apps', 'server', 'package.json'), path.join(b11Tmp, 'apps', 'server', 'package.json'));
      cpSync(path.join(REPO_ROOT, 'apps', 'web', 'dist'), path.join(b11Tmp, 'apps', 'web', 'dist'), { recursive: true });
      let dep11 = null;
      for(let d = REPO_ROOT; ; d = path.dirname(d)){
        if(existsSync(path.join(d, 'node_modules', 'express', 'package.json'))){ dep11 = path.join(d, 'node_modules'); break; }
        if(path.dirname(d) === d) break;
      }
      if(!dep11){
        C.fail('B11', '依赖仓定位（向上找含 express 的 node_modules）', { expected: '命中一处依赖仓', actual: 'REPO_ROOT 向上未找到', ctx: `REPO_ROOT=${REPO_ROOT}` });
        throw new SmokeFailError('B11');
      }
      symlinkSync(dep11, path.join(b11Tmp, 'node_modules'), 'junction');
      const b11Port = await getFreePort();
      const b11Base = `http://127.0.0.1:${b11Port}`;
      b11Child = spawn(process.execPath, [path.join(b11Tmp, 'apps', 'server', 'dist', 'server.js')], {
        cwd: REPO_ROOT,
        env: { ...process.env, PORT: String(b11Port), BOCHA_API_KEY: '', SEARXNG_URL: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      b11Exit = new Promise(res => b11Child.once('exit', (c, s) => res({ code: c, signal: s })));
      let b11Out = '';
      let b11Exited = false;
      void b11Exit.then(() => { b11Exited = true; });
      b11Child.stdout.setEncoding('utf8'); b11Child.stdout.on('data', d => { b11Out += d; });
      b11Child.stderr.setEncoding('utf8'); b11Child.stderr.on('data', d => { b11Out += d; });
      let b11Health = null;
      const b11t0 = Date.now();
      for(;;){
        if(b11Exited) break;
        try{
          const r = await fetch(`${b11Base}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
          if(r.status === 200){ b11Health = { status: r.status, json: await r.json().catch(() => null) }; break; }
        }catch{ /* 未就绪，继续轮询 */ }
        if(Date.now() - b11t0 > 20000) break;
        await sleep(250);
      }
      const b11 = b11Health
        ? await api(b11Base, 'GET', '/api/v1/workbench/diff')
        : { status: 0, json: null, text: `探针实例未就绪（exit=${b11Exited}）${b11Out.slice(-160)}`, method: 'GET', url: '/api/v1/workbench/diff' };
      C.ok(b11Health?.status === 200 && b11Health.json?.ok === true
        && b11.status === 404 && b11.json?.error === 'not a git repository',
        'B11', '探针实例（临时非 git 目录，spawn cwd=仓库根）健康 200 → GET /api/v1/workbench/diff → 404 {error:"not a git repository"}（误锚 process.cwd() 会得 200 恰好击穿；B01/B04 锚定双向证明的 diff 侧延伸）',
        { expected: 'health 200 + 404 not a git repository', actual: JSON.stringify({ health: b11Health?.status, ok: b11Health?.json?.ok, wb: `${b11.status} ${b11.json?.error ?? String(b11.text).slice(0, 60)}` }), ctx: `tmp=${b11Tmp} | spawn cwd=REPO_ROOT` });
    } finally {
      if(b11Child){
        try { b11Child.kill(); } catch { /* 已退出 */ }
        await Promise.race([b11Exit, sleep(3000)]);
        try { b11Child.kill('SIGKILL'); } catch { /* 已退出 */ }
      }
      try { rmSync(b11Tmp, { recursive: true, force: true }); } catch { /* 尽力而为，如实容忍 */ }
    }
  }
  { /* B12 · 纪律源扫描 diff.ts（B05 同型）+ routes.ts 复扫（扩后）：/shell/i 零命中
       （含注释）；可写命令单引号 argv 字面量零命中（B05 同 regex）；'diff'/
       '--no-color'/'--numstat' 三词在场（E2 只读白名单承载本体）；'./git.js' import
       在场（runGit 复用非复制） */
    const d12 = readFileSync(path.join(REPO_ROOT, 'apps', 'server', 'src', 'workbench', 'diff.ts'), 'utf8');
    const r12 = readFileSync(path.join(REPO_ROOT, 'apps', 'server', 'src', 'workbench', 'routes.ts'), 'utf8');
    const shell12 = [d12, r12].filter(s => /shell/i.test(s)).length;
    const writeRe = /'(add|commit|push|pull|checkout|reset|clean|merge|rebase|stash)'/g;
    const write12 = (d12.match(writeRe) ?? []).concat(r12.match(writeRe) ?? []);
    const words12 = ["'diff'", "'--no-color'", "'--numstat'"];
    C.ok(shell12 === 0 && write12.length === 0
      && words12.every(w => d12.includes(w))
      && d12.includes("'./git.js'"),
      'B12', '源码扫描 diff.ts + routes.ts（扩后）：/shell/i 零命中；可写命令单引号 argv 字面量零命中；diff.ts 含 \'diff\'/\'--no-color\'/\'--numstat\'（只读白名单承载本体）与 \'./git.js\' import（runGit 复用非复制）',
      { expected: 'shell 零命中 + 可写零命中 + 三命令词与复用 import 在场', actual: JSON.stringify({ shell12, write12, wordsOk: words12.every(w => d12.includes(w)), importOk: d12.includes("'./git.js'") }), ctx: 'apps/server/src/workbench/{diff,routes}.ts readFileSync 字面扫描' });
  }

  /* B 组续：workbench 目录树端点 E3（B13-B18 · 迭代 0056 / BK-0042 · SPEC §3.8）——
   * B13-B17 主实例（E3 为 fs 只读遍历，工作树即真仓库直接可测；E1/E2 的「非 git
   * 目录探针」对 E3 无证明力——SPEC §3.8 定形偏差记档：E3 零 git 探测、404 面是
   * 「子路径不存在」，主实例直接可测，锚定证明由 B13 root.path==='' + 仓库根标志
   * 目录合成）、B18 纯源扫描（B05/B12 同型，E3 差异面：零子进程 + fs 只读白名单）。
   * 已知限制如实标注：遍历异常 500 不做 HTTP 级测试（win32 无法可移植伪造
   * lstat/readdir 异常），由 B18 源扫描同构形态背书（WorkbenchTreeError('failed')
   * → 500 映射字面量在场，B04/B11 同款如实口径）。 */
  const FOLD_B = ['node_modules', 'dist', 'data', '.zcode'];
  { /* B13 · E3 默认契约（主实例）：键集恰两键 {root,truncated}；root.name 非空
       （不锁字面量——工作树/主干/CI 目录名异）、root.path===''、children 含仓库根
       标志目录 apps/docs（锚定合成证明——锚错任何一级即缺失）；递归形状（name 非空、
       type ∈ dir/file、dir 无 size 键、file 带 size 非负整数）；.git 递归零出现；
       FOLD 名目录 children 恒 []（node_modules/data/.zcode 默认请求亲核 + dist 经
       apps/server 深度 1 子树补充亲核——默认深度 2 看不到第三层 dist）；同层目录
       先序（root.children 内全部 dir 下标 < 全部 file 下标）；truncated boolean；
       全树条目递归计数 ≤ 500（「不爆响应」性质断言，不依赖仓库规模触发截断） */
    const b13 = await api(srv.base, 'GET', '/api/v1/workbench/tree');
    const keys13 = b13.json && typeof b13.json === 'object' && !Array.isArray(b13.json)
      ? Object.keys(b13.json).sort().join(',') : '';
    let shapeOk13 = true, gitHit13 = false, total13 = 0;
    const seenFold13 = new Set();
    const check13 = n => {
      total13++;
      if(!n || typeof n !== 'object'){ shapeOk13 = false; return; }
      if(typeof n.name !== 'string' || n.name === '') shapeOk13 = false;
      if(n.type !== 'dir' && n.type !== 'file') shapeOk13 = false;
      if(n.name === '.git') gitHit13 = true;
      if(n.type === 'file' && (!Number.isInteger(n.size) || n.size < 0)) shapeOk13 = false;
      if(n.type === 'dir'){
        if(n.size !== undefined) shapeOk13 = false;
        if(FOLD_B.includes(n.name)){
          seenFold13.add(n.name);
          if(!(Array.isArray(n.children) && n.children.length === 0)) shapeOk13 = false;   // 折叠占位恒空
        }else if(Array.isArray(n.children)){
          n.children.forEach(check13);
        }
      }
    };
    const kids13 = Array.isArray(b13.json?.root?.children) ? b13.json.root.children : [];
    kids13.forEach(check13);
    const names13 = new Set(kids13.map(n => n?.name));
    const firstFile13 = kids13.findIndex(n => n?.type === 'file');
    const lastDir13 = kids13.reduce((m, n, i) => (n?.type === 'dir' ? i : m), -1);
    const b13d = await api(srv.base, 'GET', '/api/v1/workbench/tree?path=apps/server&depth=1');
    const distRow13 = (b13d.json?.root?.children ?? []).find(n => n?.name === 'dist');
    const distFoldOk13 = b13d.status === 200 && !!distRow13 && distRow13.type === 'dir'
      && Array.isArray(distRow13.children) && distRow13.children.length === 0;
    C.ok(b13.status === 200 && keys13 === 'root,truncated'
      && typeof b13.json?.root?.name === 'string' && b13.json.root.name !== ''
      && b13.json?.root?.path === '' && kids13.length > 0
      && names13.has('apps') && names13.has('docs')
      && shapeOk13 && !gitHit13
      && ['node_modules', 'data', '.zcode'].every(f => seenFold13.has(f))
      && (firstFile13 === -1 || lastDir13 < firstFile13)
      && typeof b13.json?.truncated === 'boolean' && total13 <= 500
      && distFoldOk13,
      'B13', 'GET /api/v1/workbench/tree → 200；键集恰 {root,truncated}；root.name 非空（不锁字面量）、root.path===""；children 含 apps/docs（锚定合成证明）；递归形状（dir 无 size / file size 非负整数）；.git 零出现；FOLD 占位（node_modules/data/.zcode 根级 + dist 经 apps/server 子树亲核，children 恒 []）；同层 dir 先序；truncated boolean；全树条目 ≤ 500',
      { expected: '200 两键契约 + 形状 + 折叠 + 先序 + ≤500', actual: JSON.stringify({ status: b13.status, keys: keys13, rootName: b13.json?.root?.name, rootPath: b13.json?.root?.path, n: kids13.length, total13, shapeOk: shapeOk13, gitHit: gitHit13, foldSeen: [...seenFold13], truncated: b13.json?.truncated, firstFile: firstFile13, lastDir: lastDir13, distFoldOk: distFoldOk13 }).slice(0, 320), ctx: ctxOf(b13) });
  }
  { /* B14 · path 前缀下钻 + depth 语义：?path=apps/server → root.name==='server'、
       root.path==='apps/server'、children 含 src（dir）；同路径 depth=1 → 非折叠
       dir 全部无 children 键（depth 耗尽形态；折叠 dir 仍为 children:[] 占位）；
       depth=4 → src 子层出现 workbench 目录且带 children（≥3 层嵌套，深度机器判据） */
    const b14 = await api(srv.base, 'GET', '/api/v1/workbench/tree?path=apps/server');
    const b14d1 = await api(srv.base, 'GET', '/api/v1/workbench/tree?path=apps/server&depth=1');
    const b14d4 = await api(srv.base, 'GET', '/api/v1/workbench/tree?path=apps/server&depth=4');
    const kids14 = b14.json?.root?.children ?? [];
    const srcRow14 = kids14.find(n => n?.name === 'src');
    const kids14d1 = b14d1.json?.root?.children ?? [];
    const depth1Ok14 = kids14d1.every(n =>
      !(n?.type === 'dir' && !FOLD_B.includes(n?.name)) || n?.children === undefined);
    const src4 = (b14d4.json?.root?.children ?? []).find(n => n?.name === 'src');
    const wb4 = Array.isArray(src4?.children) ? src4.children.find(n => n?.name === 'workbench') : null;
    C.ok(b14.status === 200 && b14.json?.root?.name === 'server'
      && b14.json?.root?.path === 'apps/server'
      && srcRow14?.type === 'dir'
      && b14d1.status === 200 && kids14d1.length > 0 && depth1Ok14
      && b14d4.status === 200 && !!wb4 && wb4.type === 'dir' && Array.isArray(wb4.children),
      'B14', 'tree?path=apps/server → 200 root.name="server"、root.path="apps/server"、children 含 src(dir)；&depth=1 → 非折叠 dir 全部无 children 键（depth 耗尽）；&depth=4 → src 子层出现 workbench 目录且带 children（≥3 层嵌套，深度机器判据）',
      { expected: '下钻子树 + 深度语义', actual: JSON.stringify({ root: `${b14.json?.root?.name}@${b14.json?.root?.path}`, srcType: srcRow14?.type, d1: `${b14d1.status}:${kids14d1.length}:depth1Ok=${depth1Ok14}`, d4: `${b14d4.status}:workbench=${!!wb4}` }), ctx: ctxOf(b14) });
  }
  { /* B15 · depth 界值反例（B03 同型）：0 / 7 / abc / 2.5 → 各 400 {error:"depth 必须是 1-6 的整数"} */
    const rs15 = [];
    for(const v of ['0', '7', 'abc', '2.5']){
      rs15.push(await api(srv.base, 'GET', `/api/v1/workbench/tree?depth=${v}`));
    }
    C.ok(rs15.every(r => r.status === 400 && r.json?.error === 'depth 必须是 1-6 的整数'),
      'B15', 'depth=0 / depth=7 / depth=abc / depth=2.5 → 各 400 {error:"depth 必须是 1-6 的整数"}',
      { expected: '4× 400 + error 字面量', actual: rs15.map(r => `${r.status}:${r.json?.error ?? r.text.slice(0, 40)}`).join(' | '), ctx: rs15.map(ctxOf).join(' | ') });
  }
  { /* B16 · path 越界 400（B10 同款双形态）：../ 逃逸 / 深层逃逸 / 绝对路径注入
       （win32 盘符形态 D:/ + POSIX 根形态 /etc——resolve 归一后非项目根内同拒） */
    const bads16 = ['../', '../../', 'D:/', '/etc'];
    const rs16 = [];
    for(const v of bads16){
      rs16.push(await api(srv.base, 'GET', `/api/v1/workbench/tree?path=${encodeURIComponent(v)}`));
    }
    C.ok(rs16.every(r => r.status === 400 && r.json?.error === 'path 越界'),
      'B16', 'path=../ / path=../../ / path=D:/（win32 绝对注入）/ path=/etc（POSIX 绝对注入）→ 各 400 {error:"path 越界"}（path.resolve 归一后前缀校验，非项目根内即拒）',
      { expected: '4× 400 path 越界', actual: rs16.map((r, i) => `${bads16[i]}:${r.status}:${r.json?.error}`).join(' | '), ctx: rs16.map(ctxOf).join(' | ') });
  }
  { /* B17 · 404 与折叠语义：不存在子路径 → 404；存在但为文件（package.json）→ 404
       同字面量（下钻语义两态共用）；折叠目录显式下钻（path=node_modules）→ 200
       children===[] 恒空 + truncated=false（折叠语义机器证明，SPEC §3.1.3） */
    const b17a = await api(srv.base, 'GET', '/api/v1/workbench/tree?path=no-such-dir-xyz');
    const b17b = await api(srv.base, 'GET', '/api/v1/workbench/tree?path=package.json');
    const b17c = await api(srv.base, 'GET', '/api/v1/workbench/tree?path=node_modules');
    C.ok(b17a.status === 404 && b17a.json?.error === 'path 不存在或不是目录'
      && b17b.status === 404 && b17b.json?.error === 'path 不存在或不是目录'
      && b17c.status === 200 && b17c.json?.root?.name === 'node_modules'
      && Array.isArray(b17c.json?.root?.children) && b17c.json.root.children.length === 0
      && b17c.json?.truncated === false,
      'B17', 'tree?path=no-such-dir-xyz → 404 {error:"path 不存在或不是目录"}；?path=package.json（存在但为文件）→ 404 同字面量；?path=node_modules（折叠目录显式下钻）→ 200 root.children===[] 恒空、truncated=false（折叠语义机器证明）',
      { expected: '404×2 同字面量 + 折叠恒空 200', actual: JSON.stringify({ a: `${b17a.status}:${b17a.json?.error}`, b: `${b17b.status}:${b17b.json?.error}`, c: `${b17c.status}:${b17c.json?.root?.name}:n=${b17c.json?.root?.children?.length}:truncated=${b17c.json?.truncated}` }), ctx: `${ctxOf(b17a)} | ${ctxOf(b17b)} | ${ctxOf(b17c)}` });
  }
  { /* B18 · 纪律源扫描（B05/B12 同型，E3 差异面）：tree.ts + routes.ts（扩后复扫）
       + root.ts（复扫）/shell/i 零命中（含注释——注释措辞禁 shell 字样）；tree.ts
       'spawn' 零命中（E3 零 git 子进程承载差异面）；'readdir' 与 'lstat' 在场
       （fs 承载本体）；fs 写面禁词零命中（writeFile/appendFile/unlink/rename/
       mkdir/chmod/chown/truncate/rm——调用形态词表 \b词\s*（，规避出参字段名
       truncated 的子串误报；E1/E2 的可写命令 regex 是 git argv 面，E3 换 fs API
       面词表）；'.git' 排除与 FOLD 四名字面量在场（'node_modules'/'dist'/'data'/'.zcode'） */
    const t18 = readFileSync(path.join(REPO_ROOT, 'apps', 'server', 'src', 'workbench', 'tree.ts'), 'utf8');
    const r18 = readFileSync(path.join(REPO_ROOT, 'apps', 'server', 'src', 'workbench', 'routes.ts'), 'utf8');
    const o18 = readFileSync(path.join(REPO_ROOT, 'apps', 'server', 'src', 'workbench', 'root.ts'), 'utf8');
    const shell18 = [t18, r18, o18].filter(s => /shell/i.test(s)).length;
    const spawn18 = t18.includes('spawn');
    const writeRe18 = /\b(writeFile|appendFile|unlink|rename|mkdir|chmod|chown|truncate|rm)\s*\(/g;
    const write18 = [t18, r18, o18].flatMap(s => s.match(writeRe18) ?? []);
    const foldWords18 = ["'node_modules'", "'dist'", "'data'", "'.zcode'"];
    C.ok(shell18 === 0 && !spawn18 && write18.length === 0
      && t18.includes('readdir') && t18.includes('lstat')
      && t18.includes("'.git'") && foldWords18.every(w => t18.includes(w)),
      'B18', '源码扫描 tree.ts + routes.ts（扩后）+ root.ts（复扫）：/shell/i 零命中（含注释）；tree.ts \'spawn\' 零命中（零 git 子进程）；\'readdir\'/\'lstat\' 在场（fs 承载本体）；fs 写面禁词（调用形态）零命中（writeFile/appendFile/unlink/rename/mkdir/chmod/chown/truncate/rm——词表规避 truncated 字段子串误报）；\'.git\' 排除与 FOLD 四名字面量在场',
      { expected: 'shell/spawn/写面零命中 + readdir/lstat/.git/FOLD 四名在场', actual: JSON.stringify({ shell18, spawn18, write18, fsOk: t18.includes('readdir') && t18.includes('lstat'), gitExcl: t18.includes("'.git'"), foldOk: foldWords18.every(w => t18.includes(w)) }), ctx: 'apps/server/src/workbench/{tree,routes,root}.ts readFileSync 字面扫描' });
  }

  /* T 组（PT 系断言 ID，BUG-0057-01）：terminal 节点 handler 契约（PT01-PT06 · 迭代 0057 / BK-0045 · ADR-0014 §7
   * · SPEC §3.8）——PT01 主实例（PTY_ENABLED 默认关，无 .env 即确定性禁用态）；
   * PT02-PT04 探针 A（PTY_ENABLED=1）；PT05 探针 B（PTY_ENABLED=1 + PTY_MAX_SESSIONS=1，
   * 内部通道满员护栏）；PT06 纪律源扫描 + 前端源锁。探针 env 全量钉值防开发者
   * .env 泄入（pty-sessions.mjs ENV_ON 同款）；探针会话在断言内显式 stop
   * （PTY_IDLE 默认 10min 内不清，防跨组泄漏，D9）。 */
  let tSid = null;   /* T02 建立的会话（T03 绑定 / T04 存续与自清理共用） */
  const tRunSse = async (base, wf, id, label) => {
    let sse = null;
    try { sse = await openSse(base, wf); }
    catch (e) { C.fail(id, `${label}（openSse）`, { expected: 'SSE 200', actual: String(e?.message ?? e), ctx: `POST /api/v1/run（${wf.name}）` }); throw new SmokeFailError(id); }
    let done = null;
    try { done = await sse.waitFor((e) => e.type === 'run:done', 20000); }
    catch (e) { C.fail(id, `${label}（waitFor run:done）`, { expected: 'run:done', actual: String(e?.message ?? e), ctx: `POST /api/v1/run（${wf.name}）` }); throw new SmokeFailError(id); }
    await sse.waitEnd(10000);
    return { done, events: sse.events };
  };
  { /* PT01 · ENABLED=0 降级契约（主实例）：run 含 terminal → log(warn) 固定子串 +
       节点降级 out + run ok 不挂 + 不伪造会话（list 恒空集） */
    const { done, events } = await tRunSse(srv.base, wfTerm('echo t01', 'smoke-terminal-degrade'), 'PT01', 'prompt→terminal（禁用态）');
    const tDone = events.find((e) => e.type === 'node:done' && e.id === 2);
    const tWarn = events.find((e) => e.type === 'log' && String(e.msg || '').includes('PTY 会话功能未启用'));
    const list = await api(srv.base, 'GET', '/api/v1/pty/sessions');
    C.ok(done.ok === true && !!tWarn && typeof tDone?.out === 'string' && tDone.out.includes('降级')
      && list.status === 200 && Array.isArray(list.json?.sessions) && list.json.sessions.length === 0,
      'PT01', 'PTY_ENABLED=0：run 含 terminal → log(warn) 固定子串「PTY 会话功能未启用」+ node:done out 含「降级」+ run:done{ok:true} 不挂；GET /pty/sessions → {"sessions":[]}（不伪造会话）',
      { expected: 'warn 子串 + 降级 out + ok:true + 空列表', actual: JSON.stringify({ ok: done.ok, warn: !!tWarn, out: tDone?.out, list: list.json }), ctx: ctxOf(list) });
  }
  { /* PT02 · ENABLED=1 建会话 + agentWrite 注入 + 审计（探针 A）：node:done 就绪 out +
       list 恰 1 会话 + pty_audits 该会话 create(origin=system) 与 write(origin=agent) 双行 */
    try {
      tSrvA = await startServer(await getFreePort(), {
        env: { PTY_ENABLED: '1', PTY_IDLE_TIMEOUT_MS: '600000', PTY_MAX_SESSION_MS: '600000', PTY_MAX_SESSIONS: '4' },
      });
    } catch (e) {
      C.fail('PT02', '探针 A 启动（PTY_ENABLED=1）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('PT02');
    }
    const { done, events } = await tRunSse(tSrvA.base, wfTerm('echo t02-inject', 'smoke-terminal-create'), 'PT02', 'prompt→terminal（探针 A）');
    const tDone = events.find((e) => e.type === 'node:done' && e.id === 2);
    const list = await api(tSrvA.base, 'GET', '/api/v1/pty/sessions');
    tSid = list.json?.sessions?.[0]?.id ?? null;
    const audits = tSid ? ptyAuditsOf(tSid) : [];
    const createRow = audits.find((r) => r.origin === 'system' && r.kind === 'create');
    const agentRow = audits.find((r) => r.origin === 'agent' && r.kind === 'write');
    C.ok(done.ok === true && typeof tDone?.out === 'string' && tDone.out.includes('终端会话就绪 · #')
      && list.status === 200 && list.json?.sessions?.length === 1 && !!tSid
      && !!createRow && !!agentRow && String(agentRow.summary || '').includes('echo t02-inject'),
      'PT02', 'PTY_ENABLED=1：run prompt→terminal → node:done out 含「终端会话就绪 · #」+ GET list 恰 1 会话 + pty_audits 该会话含 create(origin=system) 与 write(origin=agent，summary 含注入文本)（agentWrite 服务端通道审计留痕）',
      { expected: '就绪 out + 1 会话 + create/agent 双审计行', actual: JSON.stringify({ ok: done.ok, out: tDone?.out, n: list.json?.sessions?.length, sid: tSid, createRow: !!createRow, agentRow: !!agentRow, agentSummary: agentRow?.summary }), ctx: ctxOf(list) });
  }
  { /* PT03 · out-session 形状 + 下游消费（探针 A）：terminal(session=PT02 会话)→termview；
       output 事件文本 = termview toStr(ports[0]) = {"sessionId":"…"} 可 parse 且命中绑定
       会话（接管不新建 → list 仍恰 1） */
    const { done, events } = await tRunSse(tSrvA.base, wfTerm('echo t03-chain', 'smoke-terminal-chain', tSid, true), 'PT03', 'prompt→terminal(绑定)→termview');
    const outEv = events.find((e) => e.type === 'output');
    let sidOut = null;
    try {
      const v = JSON.parse(outEv?.text ?? '');
      if (v && typeof v.sessionId === 'string') sidOut = v.sessionId;
    } catch { /* 非 JSON → sidOut 保持 null，断言如实红 */ }
    const list = await api(tSrvA.base, 'GET', '/api/v1/pty/sessions');
    const ids = (list.json?.sessions ?? []).map((s) => s.id);
    C.ok(done.ok === true && !!sidOut && sidOut === tSid && ids.includes(sidOut) && ids.length === 1,
      'PT03', 'terminal(绑定 PT02 会话)→termview：output 事件文本 JSON.parse 得 {sessionId} 且 === 绑定会话（接管不新建）；list 仍恰 1 会话（out-session {sessionId} 形状 + 下游 toStr 消费链双断言）',
      { expected: `{sessionId:"${tSid}"} + list 恰 1`, actual: JSON.stringify({ ok: done.ok, text: outEv?.text, sidOut, ids }), ctx: ctxOf(list) });
  }
  { /* PT04 · run 正交存续 + 自清理（探针 A）：run 结束会话仍 active（ADR-0014 §4.1）
       → POST stop → 200 → list 收敛空（closePtySession 异步收尾 ≤CLOSE_WAIT_MS，
       PY6 exit 帧同款时序：轮询等待注册表删除，非即时断言；防探针会话跨组泄漏） */
    const g1 = await api(tSrvA.base, 'GET', '/api/v1/pty/sessions');
    const still = (g1.json?.sessions ?? []).some((s) => s.id === tSid);
    const st = await api(tSrvA.base, 'POST', `/api/v1/pty/sessions/${tSid}/stop`);
    let after = -1;
    for (let i = 0; i < 20 && after !== 0; i++) {   /* ≤5s：kill→exit 确认→删注册表 */
      await sleep(250);
      const g = await api(tSrvA.base, 'GET', '/api/v1/pty/sessions');
      after = (g.json?.sessions ?? []).length;
    }
    C.ok(g1.status === 200 && still && st.status === 200 && st.json?.ok === true && after === 0,
      'PT04', 'PT02/PT03 run 结束后 GET list 仍含该会话（run 与会话正交，ADR-0014 §4.1）→ POST stop → 200 {ok:true} → list 轮询收敛空（close 异步收尾，PY6 时序同款；探针 A 自清理）',
      { expected: '存续 + stop 200 + 空 list', actual: JSON.stringify({ still, stop: `${st.status}:${st.json?.ok}`, after }), ctx: ctxOf(st) });
  }
  { /* PT05 · 内部通道满员护栏（探针 B：PTY_MAX_SESSIONS=1）：HTTP create 1 会话占满 →
       run terminal → warn「并发会话数已达上限」+ run ok 不挂 + list 仍恰 1（内部
       create 不经 routes.ts:27 的 HTTP 429 闸 → handler 自检护栏生效，D2）→ stop 清理 */
    try {
      tSrvB = await startServer(await getFreePort(), {
        env: { PTY_ENABLED: '1', PTY_IDLE_TIMEOUT_MS: '600000', PTY_MAX_SESSION_MS: '600000', PTY_MAX_SESSIONS: '1' },
      });
    } catch (e) {
      C.fail('PT05', '探针 B 启动（PTY_ENABLED=1 + PTY_MAX_SESSIONS=1）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('PT05');
    }
    const mk = await api(tSrvB.base, 'POST', '/api/v1/pty/sessions');
    const { done, events } = await tRunSse(tSrvB.base, wfTerm('echo t05-full', 'smoke-terminal-full'), 'PT05', 'prompt→terminal（满员）');
    const warn = events.find((e) => e.type === 'log' && String(e.msg || '').includes('并发会话数已达上限'));
    const list = await api(tSrvB.base, 'GET', '/api/v1/pty/sessions');
    const n = (list.json?.sessions ?? []).length;
    const st = await api(tSrvB.base, 'POST', `/api/v1/pty/sessions/${mk.json?.sessionId}/stop`);
    C.ok(mk.status === 201 && done.ok === true && !!warn && n === 1 && st.status === 200,
      'PT05', 'PTY_MAX_SESSIONS=1：HTTP create 占满（201）→ run terminal → log(warn) 固定子串「并发会话数已达上限」+ run:done{ok:true} 不挂 + list 仍恰 1（内部通道护栏挡下第 2 会话，未偷偷新建）→ stop 200 清理',
      { expected: '201 占满 + warn 子串 + ok:true + 恰 1 会话', actual: JSON.stringify({ mk: mk.status, ok: done.ok, warn: !!warn, n, stop: st.status }), ctx: ctxOf(list) });
  }
  { /* PT06 · 纪律源扫描 + 前端源锁（B05/B12/B18 同型）：handlers.ts terminal 段——
       agentWrite 调用含 signal: ctx.ac.signal 透传形态（run 中止级联半面的源扫描
       背书，D9）；ptySessionActive/activePtyCount/createPtySession 在场且无
       userWrite/guardedFetch 混入（服务端不走 HTTP/出站通道）；「PTY 会话功能未启用」
       降级字面量在场。前端源锁三件：app.js #term-panel + nodesLayer 双 dblclick
       监听器形态 + ICON_PATHS 表无 'terminal': 键（零新增图标常量）；app.css tp- 家族 */
    const h6 = readFileSync(path.join(REPO_ROOT, 'apps', 'server', 'src', 'handlers.ts'), 'utf8');
    const i6 = h6.indexOf('async terminal(');
    const termSec6 = i6 >= 0 ? h6.slice(i6).split('\n  async ')[0] : '';
    const appJs6 = readFileSync(path.join(REPO_ROOT, 'apps', 'web', 'src', 'legacy', 'app.js'), 'utf8');
    const appCss6 = readFileSync(path.join(REPO_ROOT, 'apps', 'web', 'src', 'app.css'), 'utf8');
    const dbl6 = (appJs6.match(/nodesLayer\.addEventListener\('dblclick'/g) ?? []).length;
    C.ok(termSec6.includes('agentWrite(') && termSec6.includes('signal: ctx.ac.signal')
      && ['ptySessionActive(', 'activePtyCount(', 'createPtySession('].every(s => termSec6.includes(s))
      && !termSec6.includes('userWrite(') && !termSec6.includes('guardedFetch(')
      && termSec6.includes('PTY 会话功能未启用')
      && appJs6.includes('#term-panel') && dbl6 >= 2 && !appJs6.includes("'terminal':")
      && appCss6.includes('#term-panel') && appCss6.includes('.tp-body'),
      'PT06', '源码扫描 handlers.ts terminal 段：agentWrite(signal: ctx.ac.signal 透传) + ptySessionActive/activePtyCount/createPtySession 在场 + userWrite/guardedFetch 零混入 + 「PTY 会话功能未启用」字面量在场；前端源锁：app.js #term-panel + nodesLayer 双 dblclick 监听器 + ICON_PATHS 无 terminal 键；app.css tp- 家族在场',
      { expected: 'signal 透传 + 内部 API 三件 + 零 HTTP/出站混入 + 前端三锁', actual: JSON.stringify({ sec: termSec6.length, sig: termSec6.includes('signal: ctx.ac.signal'), apis: ['ptySessionActive(', 'activePtyCount(', 'createPtySession('].every(s => termSec6.includes(s)), noHttp: !termSec6.includes('userWrite(') && !termSec6.includes('guardedFetch('), degrade: termSec6.includes('PTY 会话功能未启用'), panel: appJs6.includes('#term-panel'), dbl: dbl6, noIcon: !appJs6.includes("'terminal':"), css: appCss6.includes('.tp-body') }), ctx: 'apps/server/src/handlers.ts + apps/web/src/{legacy/app.js,app.css} readFileSync 字面扫描' });
  }

  /* KB 组：知识库管理管道后端（KB01-KB11 · 迭代 0064 / BK-0019 · ADR-0020 ·
   * SPEC §6）——主实例承载（零模型依赖、零出站、无 MCP env，CAP 组同条件）；
   * 上传目标库名固定 smoke-kb-*（替换语义保证跨轮重跑幂等：同 (kb,filename)
   * 重传即整替、计数不膨胀；残留可见于开发库/沙箱，属 gitignore 运行时区——
   * 零删除端点系 ADR-0020 §8 射程外，SPEC §8.1 如实声明）。raw-text POST 走
   * 本地 postText（lib.mjs api() 只封装 JSON——零改动，边界规则 :6-8 不破）。 */
  let kbPristine = false;   /* KB02 判定（恰 12/8/6 时 KB03 收紧为逐位 deepEqual） */
  const postText = async (urlPath, body, contentType = 'text/plain; charset=utf-8', timeoutMs = 30000) => {
    const res = await fetch(`${srv.base}${urlPath}`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* 非 JSON 体 */ }
    return { status: res.status, json, text, method: 'POST', url: urlPath };
  };
  const kbList = () => api(srv.base, 'GET', '/api/v1/kb');
  const kbOf = (r, name) => (r.json?.kbs ?? []).find((x) => x?.name === name);
  /* 原生 path 直送（不走 fetch/URL 规范化）：`..` 形态经 fetch 会被 WHATWG
   * URL 按双点段折叠成上级路径（路由 404，服务端白名单收不到）——http.request
   * options.path 原样发送，验证服务端 NAME_RE 对字面 `..` 段的拒绝面。 */
  const postTextRaw = (urlPath, body) => new Promise((resolve, reject) => {
    const u = new URL(srv.base);
    const req = http.request(
      { hostname: u.hostname, port: u.port, path: urlPath, method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch { /* 非 JSON 体 */ }
          resolve({ status: res.statusCode, json, text, method: 'POST', url: urlPath });
        });
      });
    req.on('error', reject);
    req.end(body);
  });
  { /* KB01 · kb 清单契约：恒 200；顶层恰一键 {kbs}；每行恰四键（name 非空串 /
       docs/chunks 非负整数 / updated_at 正整数）；两次调用 deepEqual（确定性）；
       行序 name 码点升序（跨重启稳定，SPEC §4.2） */
    const r1 = await kbList();
    const r2 = await kbList();
    const kbs1 = r1.json?.kbs;
    const shapeOk = Array.isArray(kbs1) && kbs1.length > 0 && kbs1.every((x) =>
      deepEqual(Object.keys(x).sort(), ['chunks', 'docs', 'name', 'updated_at'])
      && typeof x.name === 'string' && x.name !== ''
      && Number.isInteger(x.docs) && x.docs >= 0
      && Number.isInteger(x.chunks) && x.chunks >= 0
      && Number.isInteger(x.updated_at) && x.updated_at > 0);
    const names = Array.isArray(kbs1) ? kbs1.map((x) => x.name) : [];
    const sortedOk = names.every((n, i) => i === 0 || names[i - 1] <= n);
    C.ok(r1.status === 200 && deepEqual(Object.keys(r1.json ?? {}), ['kbs']) && shapeOk
      && deepEqual(r1.json, r2.json) && sortedOk,
      'KB01', 'GET /api/v1/kb → 恒 200；顶层恰一键 {kbs}；每行恰四键 {name,docs,chunks,updated_at}（类型/非空如 SPEC §4.2）；两次调用 deepEqual；行序 name 码点升序',
      { expected: '200 + 契约形状 + 确定性 + 升序', actual: `${r1.status} rows=${names.length} shape=${shapeOk} stable=${deepEqual(r1.json, r2.json)} sorted=${sortedOk}`, ctx: ctxOf(r1) });
  }
  { /* KB02 · seed 播种可见性：kbs 含三固定名且 docs/chunks ≥ 12/8/6（≥ 口径
       容忍开发库用户追加；恰等时置 pristine 标记供 KB03 收紧，SPEC §6/§8.5） */
    const r = await kbList();
    const got = {};
    for (const [name, min] of [['产品手册 v2.3', 12], ['FAQ-售前', 8], ['工单历史 2026', 6]]) {
      const row = kbOf(r, name);
      got[name] = row ? `${row.docs}/${row.chunks}` : 'absent';
    }
    kbPristine = got['产品手册 v2.3'] === '12/12' && got['FAQ-售前'] === '8/8' && got['工单历史 2026'] === '6/6';
    C.ok(Object.values(got).every((v, i) => v !== 'absent' && Number(v.split('/')[0]) >= [12, 8, 6][i] && Number(v.split('/')[1]) >= [12, 8, 6][i]),
      'KB02', 'seed 播种可见性：清单含三固定名（产品手册 v2.3/FAQ-售前/工单历史 2026）且 docs/chunks ≥ 12/8/6（恰等置 pristine 标记）',
      { expected: '≥12/12 · ≥8/8 · ≥6/6', actual: JSON.stringify(got), ctx: ctxOf(r) });
  }
  { /* KB03 · seed 检索等价回归·命中（AC4 零漂移机器锁）：三库各一固定查询经
       /api/v1/run（userinput→retrieval(kb,topk=3,th=0.1)→jsoncanvas，output
       事件 = hits 全保真 JSON）；pristine 时与 KB_EQ_ANCHORS（SPEC §5 改造前
       基线采集）deepEqual，污染时降级 src 锚（JOURNAL 记档分支） */
    const results = [];
    for (const a of KB_EQ_ANCHORS) {
      const { done, events } = await tRunSse(srv.base, wfKb(a.kb, a.q, 0.1, `smoke-kb-eq`), 'KB03', `retrieval 等价（${a.kb}）`);
      const output = events.find((e) => e.type === 'output');
      let hits = null;
      try { hits = JSON.parse(output?.text ?? 'null'); } catch { hits = null; }
      results.push({ kb: a.kb, done: done?.ok, hits,
        exact: deepEqual(hits, a.hits),
        srcOk: Array.isArray(hits) && hits.length > 0 && a.hits.every((b) => hits.some((h) => h.src === b.src)) });
    }
    C.ok(results.every((x) => x.done === true && (kbPristine ? x.exact : x.srcOk)),
      'KB03', `seed 检索等价回归·命中：三固定库检索输出（score/src/text）与改造前基线${kbPristine ? '逐位 deepEqual（pristine · 零漂移机器锁）' : 'src 集合一致（开发库已污染 · 降级锚，JOURNAL 记档）'}`,
      { expected: '三库全部一致', actual: JSON.stringify(results.map((x) => ({ kb: x.kb, done: x.done, exact: x.exact, srcOk: x.srcOk }))), ctx: 'POST /api/v1/run（userinput→retrieval→jsoncanvas；output 事件 JSON.parse）' });
  }
  { /* KB04 · seed 检索等价回归·未命中：`zzzqqq 无关词` 三库 hits 空
       （output='[]'）+ node:done out 含「命中 0 条」+ run:done vars.confidence='0' */
    const results = [];
    for (const a of KB_EQ_ANCHORS) {
      const { done, events } = await tRunSse(srv.base, wfKb(a.kb, 'zzzqqq 无关词', 0.1, 'smoke-kb-miss'), 'KB04', `retrieval 未命中（${a.kb}）`);
      const output = events.find((e) => e.type === 'output');
      const nd = events.find((e) => e.type === 'node:done' && e.id === 2);
      results.push({ kb: a.kb, ok: done?.ok, empty: output?.text === '[]',
        out0: String(nd?.out ?? '').includes('命中 0 条'), conf0: done?.vars?.confidence === '0' });
    }
    C.ok(results.every((x) => x.ok === true && x.empty && x.out0 && x.conf0),
      'KB04', 'seed 检索等价回归·未命中：`zzzqqq 无关词` 三库 hits 空（output="[]"）+ node:done out 含「命中 0 条片段」+ run:done vars.confidence=0',
      { expected: '三库全空命中', actual: JSON.stringify(results), ctx: 'POST /api/v1/run（userinput→retrieval→jsoncanvas）' });
  }
  { /* KB05 · 上传正例：POST smoke-kb-upload filename=sample.md（两段中文正文）
       → 201；出参恰五键 {ok,kb,filename,bytes,chunks}、chunks ≥ 1；清单含该库
       且 docs=1、chunks=出参值（清单与入库实况一致性经端点面核，AC1）。
       独占库名（BUG-0064-01 修复）：绝对计数断言要求本库全轮仅 KB05 触达——
       原共用 smoke-kb-main 时 KB11 追加 rag.md，第二轮起 docs=2 必 FAIL
       （fail-fast 连带 KB06-KB11 不执行）；独占 + 同 filename 替换语义 ⇒
       docs 恒 1、跨轮重跑幂等（SPEC §6 自身声明的兑现）。 */
    const body5 = '智能体工作流编辑器支持节点拖拽与连线编排，画布层保持命令式实现，静态骨架由 React 承载。\n\n执行后端提供拓扑执行引擎与 SSE 事件流，全部节点参数以 shared 契约为单一事实源。';
    const up = await postText('/api/v1/kb/smoke-kb-upload/documents?filename=sample.md', body5);
    const keys5 = up.json ? Object.keys(up.json).sort() : [];
    const lst = await kbList();
    const row = kbOf(lst, 'smoke-kb-upload');
    C.ok(up.status === 201 && deepEqual(keys5, ['bytes', 'chunks', 'filename', 'kb', 'ok'])
      && up.json?.ok === true && up.json?.kb === 'smoke-kb-upload' && up.json?.filename === 'sample.md'
      && up.json?.bytes === Buffer.byteLength(body5, 'utf8') && Number.isInteger(up.json?.chunks) && up.json.chunks >= 1
      && !!row && row.docs === 1 && row.chunks === up.json.chunks,
      'KB05', '上传正例：POST /kb/smoke-kb-upload/documents?filename=sample.md → 201 出参恰五键 {ok,kb,filename,bytes,chunks}（bytes=UTF-8 字节数、chunks ≥ 1）；随后清单含该库 docs=1、chunks=出参值（独占库绝对计数，跨轮幂等）',
      { expected: '201 + 五键契约 + 清单一致', actual: `${up.status} ${up.text.slice(0, 120)} | list=${JSON.stringify(row)}`, ctx: ctxOf(up) });
  }
  { /* KB06 · 切分参数行为锚（SPEC §3.2 边界例锁定 500/450/50）：①1200 字单段
       （无空行）上传 long.txt → chunks===3（[0,500)/[450,950)/[900,1200)）；
       ②两段各 200 字 short.txt → chunks===1（200+1+200=401 ≤ 500 贪心合并） */
    const up1 = await postText('/api/v1/kb/smoke-kb-chunk/documents?filename=long.txt', '块'.repeat(1200));
    const up2 = await postText('/api/v1/kb/smoke-kb-chunk/documents?filename=short.txt', '短'.repeat(200) + '\n\n' + '段'.repeat(200));
    C.ok(up1.status === 201 && up1.json?.chunks === 3 && up2.status === 201 && up2.json?.chunks === 1,
      'KB06', '切分参数行为锚：1200 字单段 → chunks=3（硬切步幅 450 / 窗 500 / 尾窗收尾）；两段各 200 字 → chunks=1（段落边界优先贪心合并 ≤500）',
      { expected: 'chunks 3 / 1', actual: `long=${up1.status}:${up1.json?.chunks} short=${up2.status}:${up2.json?.chunks}`, ctx: ctxOf(up1) });
  }
  { /* KB07 · 上传负例 415 族：filename=spec.pdf / spec.docx（后缀白名单外）与
       Content-Type=application/json（传输形态——全局 JSON 解析器消费）→ 各 415
       且响应均 { error } 形态（AC2） */
    const p1 = await postText('/api/v1/kb/smoke-kb-neg/documents?filename=spec.pdf', '内容');
    const p2 = await postText('/api/v1/kb/smoke-kb-neg/documents?filename=spec.docx', '内容');
    const p3 = await postText('/api/v1/kb/smoke-kb-neg/documents?filename=spec.txt', JSON.stringify({ a: 1 }), 'application/json');
    C.ok(p1.status === 415 && p2.status === 415 && p3.status === 415
      && typeof p1.json?.error === 'string' && typeof p2.json?.error === 'string' && typeof p3.json?.error === 'string',
      'KB07', '上传负例 415 族：spec.pdf → 415「不支持的文件类型」；spec.docx → 415；Content-Type=application/json → 415 传输形态（附 text/* 直传指引）；响应均 {error} 形态',
      { expected: '415×3 + {error} 形态', actual: JSON.stringify({ pdf: `${p1.status}:${p1.json?.error}`, docx: `${p2.status}:${p2.json?.error}`, json: `${p3.status}:${p3.json?.error}` }), ctx: ctxOf(p1) });
  }
  { /* KB08 · 上传负例 400 族：name 含 `/`（%2F 编码形态）、name=`..`（postTextRaw
       原样直送——fetch 层会被 URL 规范化折叠，见上注）、name 超长（65 字）、
       filename 缺失、filename=`../x.txt` 形态 → 各 400 {error}；随后清单零残留
       （无新库出现——端点可见零残留证明） */
    const bad = [
      await postText('/api/v1/kb/a%2Fb/documents?filename=x.txt', '内容'),
      await postTextRaw('/api/v1/kb/../documents?filename=x.txt', '内容'),
      await postText(`/api/v1/kb/${'a'.repeat(65)}/documents?filename=x.txt`, '内容'),
      await postText('/api/v1/kb/smoke-kb-neg/documents', '内容'),
      await postText('/api/v1/kb/smoke-kb-neg/documents?filename=..%2Fx.txt', '内容'),
    ];
    const lst8 = await kbList();
    const leaked = ['a/b', '..', 'a'.repeat(65), 'smoke-kb-neg'].filter((n) => kbOf(lst8, n));
    C.ok(bad.every((r) => r.status === 400 && typeof r.json?.error === 'string') && leaked.length === 0,
      'KB08', '上传负例 400 族：name 含 `/`、name=`..`、name 65 字、filename 缺失、filename=`../x.txt` 形态 → 各 400 {error}；清单零残留（无新库出现）',
      { expected: '400×5 + 零残留', actual: JSON.stringify({ codes: bad.map((r) => r.status), leaked }), ctx: ctxOf(bad[0]) });
  }
  { /* KB09 · 上传负例 413（错误映射器路径）：5 MiB+1 KiB body（text/plain 直传）
       → entity.too.large 映射 413 且 {error} 形态（AC2①） */
    const big = 'x'.repeat(5 * 1024 * 1024 + 1024);
    const p9 = await postText('/api/v1/kb/smoke-kb-big/documents?filename=big.txt', big);
    C.ok(p9.status === 413 && typeof p9.json?.error === 'string' && p9.json.error.includes('5 MiB'),
      'KB09', '上传负例 413：超 5 MiB body（text/plain 直传）→ 413「文件超限：单文件上限 5 MiB」（kbUploadErrorMapper 映射路径，{error} 形态）',
      { expected: '413 + 超限字面量', actual: `${p9.status} ${p9.text.slice(0, 120)}`, ctx: ctxOf(p9) });
  }
  { /* KB10 · 空文档 400：空 body 与纯空白 body（"\n\n  \n"）→ 400「文档内容为
       空或无可切分文本」（如实拒绝，不静默入库）+ 清单零残留 */
    const e1 = await postText('/api/v1/kb/smoke-kb-empty/documents?filename=e.txt', '');
    const e2 = await postText('/api/v1/kb/smoke-kb-empty/documents?filename=e.txt', '\n\n  \n');
    const lst10 = await kbList();
    C.ok(e1.status === 400 && e1.json?.error === '文档内容为空或无可切分文本'
      && e2.status === 400 && e2.json?.error === '文档内容为空或无可切分文本'
      && !kbOf(lst10, 'smoke-kb-empty'),
      'KB10', '空文档 400：空 body 与纯空白 body → 400「文档内容为空或无可切分文本」；清单零残留（smoke-kb-empty 未出现）',
      { expected: '400×2 同字面量 + 零残留', actual: JSON.stringify({ e1: `${e1.status}:${e1.json?.error}`, e2: `${e2.status}:${e2.json?.error}`, leaked: !!kbOf(lst10, 'smoke-kb-empty') }), ctx: ctxOf(e1) });
  }
  { /* KB11 · 新语料可检索 + 替换语义（AC5/US-1 全链）：上传 rag.md（特征串
       「量子矩阵融霜冷却协议」）→ run 链 retrieval(kb='smoke-kb-main', th=0.05)
       查特征串 → 命中 ≥1 且首条 src=`rag.md §1`（src 指向上传 filename）；重传
       rag.md 为新特征串内容 → 201、清单 docs 不增（同 filename 替换）、旧特征串
       不再命中、新特征串命中 */
    const f1 = '量子矩阵融霜冷却协议采用环状液冷微通道设计，冷板覆盖全部计算单元，整机满载温升不超过八摄氏度。';
    const up1 = await postText('/api/v1/kb/smoke-kb-main/documents?filename=rag.md', f1);
    const run1 = await tRunSse(srv.base, wfKb('smoke-kb-main', '量子矩阵融霜冷却协议', 0.05, 'smoke-kb-rag'), 'KB11', 'retrieval 命中新语料');
    let hits1 = null;
    try { hits1 = JSON.parse(run1.events.find((e) => e.type === 'output')?.text ?? 'null'); } catch { hits1 = null; }
    const lst1 = await kbList();
    const docsBefore = kbOf(lst1, 'smoke-kb-main')?.docs;
    const f2 = '磁悬浮石墨烯散热阵列通过磁悬浮风扇与石墨烯复合均热板实现被动散热，整机关闭状态下仍可快速降温。';
    const up2 = await postText('/api/v1/kb/smoke-kb-main/documents?filename=rag.md', f2);
    const lst2 = await kbList();
    const docsAfter = kbOf(lst2, 'smoke-kb-main')?.docs;
    const run2 = await tRunSse(srv.base, wfKb('smoke-kb-main', '量子矩阵融霜冷却协议', 0.05, 'smoke-kb-rag'), 'KB11', '旧特征串替换后不命中');
    const run3 = await tRunSse(srv.base, wfKb('smoke-kb-main', '磁悬浮石墨烯散热阵列', 0.05, 'smoke-kb-rag'), 'KB11', '新特征串命中');
    const text2 = run2.events.find((e) => e.type === 'output')?.text;
    let hits3 = null;
    try { hits3 = JSON.parse(run3.events.find((e) => e.type === 'output')?.text ?? 'null'); } catch { hits3 = null; }
    C.ok(up1.status === 201 && Array.isArray(hits1) && hits1.length >= 1 && hits1[0]?.src === 'rag.md §1'
      && up2.status === 201 && docsAfter === docsBefore && text2 === '[]'
      && Array.isArray(hits3) && hits3.length >= 1 && hits3[0]?.src === 'rag.md §1',
      'KB11', '新语料可检索 + 替换语义：上传 rag.md → retrieval(kb=smoke-kb-main) 查特征串命中 ≥1 且首条 src=`rag.md §1`；重传 rag.md（新特征串）→ 201、清单 docs 不增（同 filename 整替）、旧特征串零命中、新特征串命中（首条同 src）',
      { expected: '命中+替换全链', actual: JSON.stringify({ up1: up1.status, n1: hits1?.length, src1: hits1?.[0]?.src, up2: up2.status, docs: `${docsBefore}→${docsAfter}`, oldMiss: text2, n3: hits3?.length, src3: hits3?.[0]?.src }), ctx: ctxOf(up1) });
  }

  /* MEM 组：跨 run 记忆工具组（MEM01-MEM07 · 迭代 0068 / BK-0018 · ADR-0024 §4.4）
   * ——MEM01 mock 实例（MEMORY_ENABLED='' 钉未配置语义）；MEM02-MEM05 开启探针
   * 实例（memSrv）；MEM06 双实例对照；MEM07 env fail-fast 探针（快速退出自清，
   * 无实例收尾）。记忆键命名域 mem:smoke:<token>:（token 进程内生成）跨轮幂等。 */
  const memTok = Date.now().toString(36);
  const wfMem = (marker, name) => ({
    name: name || `smoke-mem-${marker.replace(/\s+/g, '-').slice(0, 24)}`,
    nodes: [{ id: 1, type: 'llm', x: 100, y: 100, title: '记忆冒烟', params: { model: 'MockChat' } }],
    edges: [],
    inputs: { question: marker },
  });
  const memRun = async (base, wf, id, label) => {
    let sse = null;
    try { sse = await openSse(base, wf); }
    catch (e) { C.fail(id, `${label}（openSse）`, { expected: 'SSE 200', actual: String(e?.message ?? e), ctx: `POST /api/v1/run（${wf.name}）` }); throw new SmokeFailError(id); }
    let done = null;
    try { done = await sse.waitFor((e) => e.type === 'run:done', 30000); }
    catch (e) { C.fail(id, `${label}（waitFor run:done）`, { expected: 'run:done', actual: String(e?.message ?? e), ctx: `POST /api/v1/run（${wf.name}）` }); throw new SmokeFailError(id); }
    await sse.waitEnd(10000);
    return { sse, done, events: sse.events };
  };
  /* 请求 tools 键集提取（BUG-0068-03）：AI SDK 7（ai@^7.0.0）OpenAI 兼容线上
   * 形态为数组 [{type:'function',function:{name,…}}]（VERIFY 探针实证
   * toolsIsArray:true、toolsNames 恰三），兼容 object 映射旧形态（防空数组
   * truthy 陷阱交由调用方语义）。标记词查找扫全消息（BUG-0068-02）：
   * messages[0] 为 providers 默认 system 提示词，用户标记在 user 消息。 */
  const memToolsOf = (req) => {
    const t = req?.tools;
    if (Array.isArray(t)) return t.map((x) => x?.function?.name ?? x?.name ?? '').filter(Boolean);
    if (t && typeof t === 'object') return Object.keys(t);
    return [];
  };
  const memReqOf = (requests, from, marker) => requests.slice(from)
    .find((r) => (r?.messages ?? []).some((m) => String(m?.content ?? '').includes(marker)));
  { /* MEM01 · 默认关零漂移（AC1）：请求体 tools 键集零 memory_* + 无 🧠 注入 log
       + 本轮 token 命名域零写入；表存在态只记录不判（共享库跨轮残留属环境态，
       断言取 token 命名域写入口径——默认关不写任何行） */
    const reqBefore = mockModel.requests.length;
    const { done, events } = await memRun(mockSrv.base, wfMem(`mem01 默认关 ${memTok}`, 'smoke-mem-default-off'), 'MEM01', 'llm（默认关实例）');
    const req = memReqOf(mockModel.requests, reqBefore, 'mem01 默认关');
    const toolKeys = memToolsOf(req);
    const memKeys = toolKeys.filter((k) => k.startsWith('memory_'));
    const injectLog = events.some((e) => e.type === 'log' && String(e.msg ?? '').includes('🧠'));
    const tokRows = memoryRowsOf(`mem:smoke:${memTok}:`);
    C.ok(done.ok === true && !!req && toolKeys.length === 0 && memKeys.length === 0
      && !injectLog && tokRows.length === 0,
      'MEM01', 'MEMORY_ENABLED 未配置：单 llm 节点 run:done{ok:true}；mock 端点请求体无 tools 键（更无 memory_*）；事件流无 🧠 注入 log；SQLite 直查本轮 token 命名域零写入（零强制漂移：不建表由 server.ts 门控接线承载，表存在态见 actual 记录）',
      { expected: 'ok:true + tools 零 memory_* + 无 🧠 log + token 域零写入', actual: JSON.stringify({ ok: done.ok, reqFound: !!req, toolKeys, injectLog, tokRows: tokRows.length, tableExists: memoryTableExists() }), ctx: 'mock 实例（MEMORY_ENABLED=\'\' 钉未配置，防开发者 .env 泄入）' });
  }
  { /* MEM02 · 开启注入恰三键（AC2）：专用实例 MEMORY_ENABLED=1 → 请求体 tools
       恰含 memory_get/memory_list/memory_set 三键 + 🧠 sys log 锚 + 工具循环
       形态（node:delta 一次性，ADR-0024 §4.1 行为特征如实锚定）+ 启动即建表 */
    try {
      memSrv = await startServer(await getFreePort(), {
        env: {
          AI_BASE_URL: mockModel.url, AI_API_KEY: 'smoke-mock-key', AI_MODELS: 'MockChat:mock-model', AI_MODEL: 'mock-model',
          MEMORY_ENABLED: '1', MCP_HTTP_SERVERS: '', MCP_STDIO_SERVERS: '',
        },
      });
    } catch (e) {
      C.fail('MEM02', 'MEM 探针启动（MEMORY_ENABLED=1，MCP 两 env 空串钉值防泄漏）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('MEM02');
    }
    const reqBefore = mockModel.requests.length;
    const { done, events } = await memRun(memSrv.base, wfMem(`mem02 注入面 mem:smoke:${memTok}:`, 'smoke-mem-inject'), 'MEM02', 'llm（开启实例）');
    const req = memReqOf(mockModel.requests, reqBefore, 'mem02 注入面');
    const toolKeys = memToolsOf(req).sort();
    const injectLog = events.find((e) => e.type === 'log' && e.lvl === 'sys' && String(e.msg ?? '').includes('🧠'));
    const deltas = events.filter((e) => e.type === 'node:delta');
    C.ok(done.ok === true && deepEqual(toolKeys, ['memory_get', 'memory_list', 'memory_set'])
      && !!injectLog && String(injectLog.msg).includes('🧠 跨 run 记忆 ×3 已注入')
      && deltas.length === 1 && memoryTableExists(),
      'MEM02', 'MEMORY_ENABLED=1：mock 请求体 tools 键集恰 [memory_get,memory_list,memory_set]（零 mcp 选择时注入即全部工具面）；注入 sys log「🧠 跨 run 记忆 ×3 已注入」出现在 run 事件流；node:delta 恰 1 条（工具循环形态，纯流式打字机不再——ADR-0024 §4.1 声明行为）；开启实例启动后 memory_entries 表在库（门控建表）',
      { expected: '恰三键 + 🧠 锚 + delta×1 + 表已建', actual: JSON.stringify({ ok: done.ok, toolKeys, inject: injectLog?.msg, deltas: deltas.length, tableExists: memoryTableExists() }), ctx: `memSrv（MEMORY_ENABLED=1）POST /api/v1/run` });
  }
  { /* MEM03 · 跨 run 持久化 + SQLite 直查对账（AC3）：run1 memory_set → run2
       memory_get 读回同值（不同工作流）；memory_entries 行键值对账 */
    const { done: wDone, events: wEvents } = await memRun(memSrv.base, wfMem(`mem03 写入 mem:smoke:${memTok}:`, 'smoke-mem-write'), 'MEM03', 'run1 memory_set');
    const rows1 = memoryRowsOf(`mem:smoke:${memTok}:`);
    const alpha1 = rows1.find((r) => r.key === `mem:smoke:${memTok}:alpha`);
    const valBytes = Buffer.byteLength('跨run记忆值');
    const { done: rDone, events: rEvents } = await memRun(memSrv.base, wfMem(`mem03 读取 mem:smoke:${memTok}:`, 'smoke-mem-read'), 'MEM03', 'run2 memory_get');
    const outR = String(rEvents.find((e) => e.type === 'node:done')?.out ?? '');
    C.ok(wDone.ok === true && rDone.ok === true
      && wEvents.some((e) => e.type === 'log' && String(e.msg ?? '').includes('🔧 工具调用 memory_set'))
      && rEvents.some((e) => e.type === 'log' && String(e.msg ?? '').includes('🔧 工具调用 memory_get'))
      && rows1.length === 1 && !!alpha1 && alpha1.value === '跨run记忆值' && alpha1.bytes === valBytes
      && typeof alpha1.created_at === 'number' && typeof alpha1.updated_at === 'number'
      && outR.includes('读回:跨run记忆值'),
      'MEM03', '跨 run 持久化：run1（smoke-mem-write）模型调 memory_set(mem:smoke:<tok>:alpha, 跨run记忆值) → 工具 log「🔧 工具调用 memory_set」；run2（smoke-mem-read，不同工作流）memory_get 读回同值（out 含「读回:跨run记忆值」）；SQLite 直查 memory_entries 恰 1 行且 key/value/bytes(UTF-8)/created_at/updated_at 对账一致',
      { expected: '读回同值 + 直查 1 行对账', actual: JSON.stringify({ wOk: wDone.ok, rOk: rDone.ok, rows: rows1.map((r) => ({ key: r.key, value: r.value, bytes: r.bytes })), out: outR.slice(0, 60) }), ctx: `memSrv 两次 run（token=${memTok}；memoryRowsOf 只读直查共享库）` });
  }
  { /* MEM04 · list 语义（AC4）：前缀过滤 + key 字典序 + count=1/offset 翻页 +
       truncated 标记如实（域外键 zz<tok>other 不入前缀结果） */
    const { done: pDone } = await memRun(memSrv.base, wfMem(`mem04 备列表 mem:smoke:${memTok}:`, 'smoke-mem-seed'), 'MEM04', 'memory_set ×2 备列表');
    const rows = memoryRowsOf(`mem:smoke:${memTok}:`);
    const { done: lDone, events: lEvents } = await memRun(memSrv.base, wfMem(`mem04 查列表 mem:smoke:${memTok}:`, 'smoke-mem-list'), 'MEM04', 'list 前两页');
    const outL = String(lEvents.find((e) => e.type === 'node:done')?.out ?? '');
    /* truncated 公式 = offset+limit < total（ADR-0024 §2.2）：首页 0+1<2=true、
     * 次页 1+1<2=false（BUG-0068-04：原期望 true 系断言笔误，产品实现正确——
     * VERIFY 探针 S4 实证 page2 l1|trunc=false）、第三页 2+1<2=false */
    const page12 = `列表页:mem:smoke:${memTok}:alpha|trunc=true ; mem:smoke:${memTok}:l1|trunc=false`;
    const { done: oDone, events: oEvents } = await memRun(memSrv.base, wfMem(`mem04 翻页 mem:smoke:${memTok}:`, 'smoke-mem-page3'), 'MEM04', 'list 第三页');
    const outO = String(oEvents.find((e) => e.type === 'node:done')?.out ?? '');
    const page3 = '列表页:|trunc=false';
    C.ok(pDone.ok === true && lDone.ok === true && oDone.ok === true
      && rows.length === 2 && rows[0]?.key === `mem:smoke:${memTok}:alpha` && rows[1]?.key === `mem:smoke:${memTok}:l1`
      && outL === page12 && outO === page3,
      'MEM04', 'list 语义：count=1 + offset 0/1/2 三页——首页恰 1 条（字典序 alpha）且 truncated=true、次页恰 l1 且 truncated=false（offset+limit=total 公式如实）、第三页空且 truncated=false（终文本逐字对账）；域外键 zz<tok>other 被 prefix=mem:smoke:<tok>: 过滤；SQLite 直查恰 2 行且 key BINARY 升序',
      { expected: `rows=[alpha,l1] 字典序 + 「${page12}」+「${page3}」`, actual: JSON.stringify({ pOk: pDone.ok, rows: rows.map((r) => r.key), outL, outO }), ctx: `memSrv 三次 run（token=${memTok}）` });
  }
  { /* MEM05 · 负例不崩 run（AC5 安全核；BUG-0068-05 对齐现实）：非法 key /
       value 超 4097 字节 → execute 异常被 AI SDK 7 转为 error tool-result 回灌
       模型继续循环（未传播至 llm.ts 工具循环 catch 降级通道——VERIFY 探针 S5
       请求流实证），3 轮预算耗尽自然收束 → run:done ok:true；库零污染 */
    const reqBefore = mockModel.requests.length;
    const { done: kDone, events: kEvents } = await memRun(memSrv.base, wfMem(`mem05 负键 mem:smoke:${memTok}:`, 'smoke-mem-negkey'), 'MEM05', '非法 key');
    const { done: vDone, events: vEvents } = await memRun(memSrv.base, wfMem(`mem05 负值 mem:smoke:${memTok}:`, 'smoke-mem-negval'), 'MEM05', 'value 超限');
    const toolLogK = kEvents.some((e) => e.type === 'log' && String(e.msg ?? '').includes('🔧 工具调用'));
    const toolLogV = vEvents.some((e) => e.type === 'log' && String(e.msg ?? '').includes('🔧 工具调用'));
    const degradeK = kEvents.some((e) => e.type === 'log' && e.lvl === 'warn' && String(e.msg ?? '').includes('工具循环异常'));
    const degradeV = vEvents.some((e) => e.type === 'log' && e.lvl === 'warn' && String(e.msg ?? '').includes('工具循环异常'));
    C.ok(kDone.ok === true && vDone.ok === true
      && mockModel.requests.length - reqBefore === 6
      && !toolLogK && !toolLogV && !degradeK && !degradeV
      && memoryRowsOf(`mem:smoke:${memTok}:`).length === 2,
      'MEM05', '负例不崩 run（AI SDK 7 工具异常语义如实锚定）：非法 key（含空白）与 value 超 4096 字节各一 run——execute 异常被 AI SDK 7 转为 error tool-result 回灌模型（未传播至 llm.ts 工具循环 catch 降级通道），mock 恒返 tool_call 至 3 轮预算耗尽自然收束：run:done 均 ok:true（不崩）；mock 请求增量恰 6（每 run 3 轮）；事件流零 🔧 工具调用行（异常发生在 impl await 处，先于 emit）且零「工具循环异常」warn（不触发降级）；token 域行数仍 2（负例零落库、不截断不写入）。行为特征与可观测性缺口（负例错误对模型可见但运行日志不可见）已按 BUG-0068-05 处置采 A 补记 PRD/ADR 并另立 backlog 建议',
      { expected: '两 run ok:true + 请求增量 6（3 轮耗尽×2）+ 零 🔧/零降级 warn + token 域零污染', actual: JSON.stringify({ kOk: kDone.ok, vOk: vDone.ok, reqDelta: mockModel.requests.length - reqBefore, toolLogK, toolLogV, degradeK, degradeV, rows: memoryRowsOf(`mem:smoke:${memTok}:`).length }), ctx: `memSrv 两次负例 run（token=${memTok}；BUG-0068-05 VERIFY 探针 S5 实证语义）` });
  }
  { /* MEM06 · capabilities 零污染（AC1/MEM06 同证）：默认关与开启实例 builtin
       仍五条 deepEqual（plain key 前缀派生零命中的机器证明，CAP_EXPECTED_BUILTIN
       字面量复用） */
    const capOff = await api(mockSrv.base, 'GET', '/api/v1/capabilities');
    const capOn = await api(memSrv.base, 'GET', '/api/v1/capabilities');
    C.ok(capOff.status === 200 && capOn.status === 200
      && deepEqual(capOff.json?.mcp?.builtin, CAP_EXPECTED_BUILTIN)
      && deepEqual(capOn.json?.mcp?.builtin, CAP_EXPECTED_BUILTIN)
      && deepEqual(capOn.json?.mcp?.external, []),
      'MEM06', 'GET /api/v1/capabilities：默认关实例与 MEMORY_ENABLED=1 实例的 mcp.builtin 均与 CAP_EXPECTED_BUILTIN 逐字段 deepEqual（memory 三 plain key 不进任何 `${id}.` 前缀派生——端点响应逐字节不变），开启实例 external 仍 []（零 MCP env）',
      { expected: '双实例 builtin 五条 deepEqual + external []', actual: JSON.stringify({ off: capOff.status, on: capOn.status, onBuiltinIds: capOn.json?.mcp?.builtin?.map((s) => s.id), external: capOn.json?.mcp?.external }), ctx: `GET /api/v1/capabilities ×2（mockSrv / memSrv）` });
  }
  { /* MEM07 · env fail-fast（AC6）：MEMORY_ENABLED=abc → 启动终止退出码 1 +
       fatal 日志指明变量名与合法词形（PTY env fail-fast 先例形态，spawn 快速
       退出自清——config 模块级装载先于 listen） */
    const failPort = await getFreePort();
    const r = await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(REPO_ROOT, 'apps', 'server', 'dist', 'server.js')], {
        cwd: path.join(REPO_ROOT, 'apps', 'server'),
        env: { ...process.env, PORT: String(failPort), MEMORY_ENABLED: 'abc' },
        shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let out = '';
      child.stdout.setEncoding('utf8'); child.stdout.on('data', (d) => { out += d; });
      child.stderr.setEncoding('utf8'); child.stderr.on('data', (d) => { out += d; });
      const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* 存活兜底 */ } }, 15000);
      child.once('exit', (code) => { clearTimeout(timer); resolve({ code, out }); });
    });
    C.ok(r.code === 1 && r.out.includes('MEMORY_ENABLED') && r.out.includes('只接受 1/true/yes 或 0/false/no'),
      'MEM07', 'MEMORY_ENABLED=abc 启动 → 进程以退出码 1 终止（config zod fail-fast），fatal 日志含变量名 MEMORY_ENABLED 与合法词形提示「只接受 1/true/yes 或 0/false/no」',
      { expected: 'exit 1 + 指明变量名与合法词形', actual: `code=${r.code}，out 尾 200 字=${r.out.slice(-200)}`, ctx: `spawn dist/server.js（PORT=${failPort}，MEMORY_ENABLED=abc）` });
  }

  /* Z 组：悬挂 run 启动扫尾（迭代 0019 / BK-0011 · PRD REQ-0011-03 / AC1-AC4）——独立实例
   * 隔离（不杀主实例：C01/C03 清理与实例收尾依赖其存活）；被测进程经 store.ts ROOT 推导
   * 共享仓库根 data/agentflow.db（与 spawn cwd 无关），重启实例的启动扫尾即触达本组悬挂行。 */
  const zPort = await getFreePort();
  let zRunId = null;
  let zPre = null;   /* 击杀前采样 {done, total, n} */
  try {
    zSrv = await startServer(zPort);
  } catch (e) {
    C.fail('Z01', 'Z 实例启动（专用端口）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
    throw new SmokeFailError('Z01');
  }
  { /* Z01 · WFAPPR 挂起 run（D 组同款事件门）→ 击杀前采样 status='running'、ended_ms=null、events 长度 N */
    const zs = await openSse(zSrv.base, WFAPPR);
    let zReq = null;
    try {
      zReq = await zs.waitFor((e) => e.type === 'approval:required', 20000);
    } catch (e) {
      C.fail('Z01', 'waitFor approval:required（run 确定处于挂起活动态）', { expected: 'approval:required nodeId=1', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（WFAPPR，SSE 流）' });
      throw new SmokeFailError('Z01');
    }
    zRunId = zs.events.find((e) => e.type === 'run:accepted')?.runId;
    if (typeof zRunId === 'string') CLEAN.runIds.push(zRunId);
    const r = await api(zSrv.base, 'GET', `/api/v1/runs/${zRunId}`);
    const run = r.json?.run;
    zPre = { done: run?.done, total: run?.total, n: (r.json?.events ?? []).length };
    C.ok(zReq?.nodeId === 1 && typeof zRunId === 'string' && r.status === 200
      && run?.status === 'running' && run?.ended_ms === null && zPre.n >= 1,
      'Z01', 'WFAPPR run 挂起中 GET /runs/:id → 200 {status:"running", ended_ms:null}，events 长度 N≥1（击杀前采样；事件为门，挂起后无新事件，N 稳定）',
      { expected: 'running + ended_ms:null + N≥1', actual: JSON.stringify({ nodeId: zReq?.nodeId, runId: zRunId, status: run?.status, ended_ms: run?.ended_ms, ...zPre }), ctx: ctxOf(r) });
  }
  { /* Z02 · SIGKILL 崩溃语义击杀（双平台一致，lib.mjs:63；不经优雅停机）→ 同端口重启 */
    try { zSrv.child.kill('SIGKILL'); } catch { /* 已退出 */ }
    const zExit = await zSrv.exitPromise;
    try {
      zSrv = await startServer(zPort);
    } catch (e) {
      C.fail('Z02', '同端口重启（健康 200 = 扫尾已完成时序门）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('Z02');
    }
    C.ok(!!zExit && zSrv.health.status === 200 && zSrv.health.json?.ok === true,
      'Z02', 'SIGKILL → exitPromise 到达（崩溃退出，不经优雅停机）；同端口重启健康 200（扫尾在 listen 前，health 即扫尾完成时序门）',
      { expected: '退出到达 + 200 ok:true', actual: JSON.stringify({ exit: zExit, health: zSrv.health.json }), ctx: `PORT=${zPort}（kill SIGKILL → restart）` });
  }
  { /* Z03 · 扫尾语义：status 收敛 stopped；ended_ms=null、done/total 保持击杀前值；events 仍恰 N 条（无合成 run:done/run:error）；日志含「启动扫尾」 */
    const r = await api(zSrv.base, 'GET', `/api/v1/runs/${zRunId}`);
    const run = r.json?.run;
    const n2 = (r.json?.events ?? []).length;
    const sweptLog = zSrv.log.tail().includes('启动扫尾');
    C.ok(r.status === 200 && run?.status === 'stopped' && run?.ended_ms === null
      && run?.done === zPre.done && run?.total === zPre.total && n2 === zPre.n && sweptLog,
      'Z03', '重启后 GET /runs/:id → 200 {status:"stopped", ended_ms:null, done/total 保持击杀前值}；events 仍恰 N 条（零伪造终结事件，回放止于最后一条真实事件）；重启实例日志含「启动扫尾」',
      { expected: `stopped + ended_ms:null + done=${zPre.done} total=${zPre.total} + ${zPre.n} 条`, actual: `${r.status} ${JSON.stringify(run)} events=${n2} 扫尾日志=${sweptLog}`, ctx: ctxOf(r) });
  }
  { /* Z04 · 自清理：重启后非活动（内存注册表空）→ DELETE 200 无 409；删除后 GET → 404 */
    const d = await api(zSrv.base, 'DELETE', `/api/v1/runs/${zRunId}`);
    const g = await api(zSrv.base, 'GET', `/api/v1/runs/${zRunId}`);
    C.ok(d.status === 200 && d.json?.ok === true && g.status === 404,
      'Z04', 'DELETE /runs/:id → 200 {ok:true}（重启后非活动，无 409）；删除后 GET → 404（零残留）',
      { expected: '200 {ok:true} + 404', actual: `DELETE=${d.status} GET=${g.status}`, ctx: ctxOf(d) });
  }

  /* OE 组：引擎 on-error 策略（OE01-OE08 · 迭代 0069 / BK-0020 · ADR-0022 · issue#15
   * 批复）——主实例承载未配置零漂移（OE01，env 三键已在 H 组钉空）；skip/retry/abort/
   * stop 四探针实例 env 全量钉值防开发者 .env 泄入（T 组同款纪律）；确定性失败源两型：
   * guard 拦截回环 URL（零出站即时失败）/ 进程内计数 mock 连接销毁（必失败 + 尝试次数
   * 硬证据）。OE 编号组 = 既有组前缀避让（BUG-0057-01 同款纪律）。 */
  const oeRun = async (base, wf, id, label) => {
    let sse = null;
    try { sse = await openSse(base, wf); }
    catch (e) { C.fail(id, `${label}（openSse）`, { expected: 'SSE 200', actual: String(e?.message ?? e), ctx: `POST /api/v1/run（${wf.name}）` }); throw new SmokeFailError(id); }
    let done = null;
    try { done = await sse.waitFor((e) => e.type === 'run:done', 30000); }
    catch (e) { C.fail(id, `${label}（waitFor run:done）`, { expected: 'run:done', actual: String(e?.message ?? e), ctx: `POST /api/v1/run（${wf.name}）` }); throw new SmokeFailError(id); }
    await sse.waitEnd(10000);
    const runId = sse.events.find((e) => e.type === 'run:accepted')?.runId;
    if (typeof runId === 'string') CLEAN.runIds.push(runId);
    return { done, events: sse.events, runId };
  };
  { /* OE01 · 未配置零漂移（主实例，AC1）：失败节点 node:error 恰 1 终态、下游失活、
       run:done ok 不反映失败（= 现状逐位一致）、持久层 status='done' */
    const { done, events, runId } = await oeRun(srv.base, wfOeFail('http://127.0.0.1:9/oe01', 'smoke-oe01-unconfigured'), 'OE01', '未配置 on-error（主实例）');
    const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
    const errs = events.filter((e) => e.type === 'node:error');
    const r = await api(srv.base, 'GET', `/api/v1/runs/${runId}`);
    C.ok(JSON.stringify(starts) === '[1,2]' && errs.length === 1 && errs[0]?.id === 2
      && done.ok === true && done.stopped === false && r.status === 200 && r.json?.run?.status === 'done',
      'OE01', '未配置 on-error：失败节点 node:error 恰 1 次（id=2）、下游节点 3 无 node:start（失活形态与现状逐位一致）、run:done{ok:true,stopped:false}（ok 不反映节点失败）、GET /runs/:id status="done"',
      { expected: 'starts=[1,2] + 恰 1 node:error + ok:true + status=done', actual: JSON.stringify({ starts, errs: errs.length, ok: done.ok, stopped: done.stopped, status: r.json?.run?.status, msg: errs[0]?.message?.slice(0, 60) }), ctx: ctxOf(r) });
  }
  { /* OE02 · skip 显式等价（探针实例 ON_ERROR=skip，AC2）：断言集与 OE01 同型（named 化零行为差）；
       ALLOW_PRIVATE_NET=1（迭代 0070：OEN03 复用本实例触达计数 mock，OE02 断言不涉失败成因） */
    try {
      oeSrvSkip = await startServer(await getFreePort(), {
        env: { ON_ERROR: 'skip', ON_ERROR_RETRIES: '', ON_ERROR_RETRY_DELAY_MS: '', ALLOW_PRIVATE_NET: '1' },
      });
    } catch (e) {
      C.fail('OE02', 'skip 探针实例启动（ON_ERROR=skip）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('OE02');
    }
    const { done, events, runId } = await oeRun(oeSrvSkip.base, wfOeFail('http://127.0.0.1:9/oe02', 'smoke-oe02-skip'), 'OE02', 'ON_ERROR=skip 显式等价');
    const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
    const errs = events.filter((e) => e.type === 'node:error');
    const r = await api(oeSrvSkip.base, 'GET', `/api/v1/runs/${runId}`);
    C.ok(JSON.stringify(starts) === '[1,2]' && errs.length === 1 && errs[0]?.id === 2
      && done.ok === true && done.stopped === false && r.status === 200 && r.json?.run?.status === 'done',
      'OE02', 'ON_ERROR=skip 显式配置：行为与未配置逐位一致（ADR-0022 §2.1 案 a named 化）——node:error 恰 1、下游失活、run:done{ok:true}、status="done"',
      { expected: '与 OE01 同型', actual: JSON.stringify({ starts, errs: errs.length, ok: done.ok, stopped: done.stopped, status: r.json?.run?.status }), ctx: ctxOf(r) });
  }
  { /* OE03/OE04 · retry 策略（探针实例 ON_ERROR=retry ×2 ×50ms + 计数 mock，AC3） */
    oeMock = await startOeMock();
    try {
      oeSrvRetry = await startServer(await getFreePort(), {
        env: { ON_ERROR: 'retry', ON_ERROR_RETRIES: '2', ON_ERROR_RETRY_DELAY_MS: '50', ALLOW_PRIVATE_NET: '1' },
      });
    } catch (e) {
      C.fail('OE03', 'retry 探针实例启动（ON_ERROR=retry ×2 ×50ms）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('OE03');
    }
    { /* OE03 · 耗尽降级：恰 3 次尝试（mock 命中计数）+ log warn 恰 2 条通报 + node:error
         恰 1 次含「已重试 2 次」概要 + 下游失活 + run:done ok 语义不变 + status='done' */
      const { done, events, runId } = await oeRun(oeSrvRetry.base, wfOeFail(`http://127.0.0.1:${oeMock.port}/oe-fail-always`, 'smoke-oe03-exhaust'), 'OE03', 'retry 耗尽降级');
      const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
      const errs = events.filter((e) => e.type === 'node:error');
      const retryLogs = events.filter((e) => e.type === 'log' && /第 \d+ 次尝试/.test(String(e.msg ?? ''))).map((e) => String(e.msg));
      const r = await api(oeSrvRetry.base, 'GET', `/api/v1/runs/${runId}`);
      C.ok(oeMock.hits.get('/oe-fail-always') === 3 && retryLogs.length === 2
        && retryLogs.some((m) => m.includes('第 2 次尝试')) && retryLogs.some((m) => m.includes('第 3 次尝试'))
        && errs.length === 1 && String(errs[0]?.message ?? '').includes('已重试 2 次')
        && JSON.stringify(starts) === '[1,2]'
        && done.ok === true && done.stopped === false && r.json?.run?.status === 'done',
        'OE03', 'ON_ERROR=retry ×2：mock 命中计数恰 3（=1+2 次尝试硬证据，且 node:start 未重跑）、log warn 恰 2 条「第 2/3 次尝试」通报、node:error 恰 1 次 message 含「已重试 2 次」概要、耗尽后按 skip 终态下游失活（starts=[1,2]）、run:done{ok:true} ok 语义不变、status="done"',
        { expected: 'hits=3 + warn×2 + 概要 + 失活 + ok:true', actual: JSON.stringify({ hits: oeMock.hits.get('/oe-fail-always'), retryLogs, errMsg: errs[0]?.message?.slice(0, 80), starts, ok: done.ok, status: r.json?.run?.status }), ctx: ctxOf(r) });
    }
    { /* OE04 · 第 3 次成功：任一次成功即按成功路径收尾（结果以末次成功尝试为准）+ 下游继续 */
      const { done, events } = await oeRun(oeSrvRetry.base, wfOeFail(`http://127.0.0.1:${oeMock.port}/oe-fail-twice`, 'smoke-oe04-recover'), 'OE04', 'retry 第 3 次成功');
      const doneNodes = events.filter((e) => e.type === 'node:done').map((e) => e.id);
      const errs = events.filter((e) => e.type === 'node:error');
      const out2 = String(events.find((e) => e.type === 'node:done' && e.id === 2)?.out ?? '');
      C.ok(oeMock.hits.get('/oe-fail-twice') === 3 && errs.length === 0
        && JSON.stringify(doneNodes) === '[1,2,3]' && out2.startsWith('200') && done.ok === true,
        'OE04', 'ON_ERROR=retry：前两次失败第三次成功 → mock 命中恰 3、零 node:error、node:done 恰 [1,2,3]（下游按成功路径继续）、节点 out 以末次成功尝试为准（200 开头）、run:done{ok:true}',
        { expected: 'hits=3 + 零 node:error + done=[1,2,3] + out 200', actual: JSON.stringify({ hits: oeMock.hits.get('/oe-fail-twice'), errs: errs.length, doneNodes, out2: out2.slice(0, 40), ok: done.ok }), ctx: '-' });
    }
  }
  { /* OE05 · abort fail-fast（探针实例 ON_ERROR=abort，AC5）：失败节点先于同级分支出队
       → 失败后全部后续节点（含同级分支）不再调度；run:done ok:false/stopped:false；
       持久层 status='error'（store.ts:302 既有链路）；stopped 恒保持用户中止独占 */
    try {
      oeSrvAbort = await startServer(await getFreePort(), {
        env: { ON_ERROR: 'abort', ON_ERROR_RETRIES: '', ON_ERROR_RETRY_DELAY_MS: '', ALLOW_PRIVATE_NET: '' },
      });
    } catch (e) {
      C.fail('OE05', 'abort 探针实例启动（ON_ERROR=abort）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('OE05');
    }
    const { done, events, runId } = await oeRun(oeSrvAbort.base, wfOeFail('http://127.0.0.1:9/oe05', 'smoke-oe05-abort', true), 'OE05', 'abort fail-fast');
    const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
    const errs = events.filter((e) => e.type === 'node:error');
    const r = await api(oeSrvAbort.base, 'GET', `/api/v1/runs/${runId}`);
    C.ok(JSON.stringify(starts) === '[1,2]' && errs.length === 1 && errs[0]?.id === 2
      && String(errs[0]?.message ?? '').includes('已拦截')
      && done.ok === false && done.stopped === false && done.done === 2
      && r.status === 200 && r.json?.run?.status === 'error',
      'OE05', 'ON_ERROR=abort：guard 拦截确定性失败 → node:error 恰 1 次（message 含「已拦截」）、下游节点 3 与同级分支节点 4 全部不再调度（starts=[1,2]）、run:done{ok:false,stopped:false,done=2}（fail-fast 收尾且 stopped 语义不被污染）、GET /runs/:id status="error"（store.ts:302 既有派生链路）',
      { expected: 'starts=[1,2] + 拦截 message + ok:false/stopped:false + status=error', actual: JSON.stringify({ starts, errMsg: errs[0]?.message?.slice(0, 60), ok: done.ok, stopped: done.stopped, done: done.done, status: r.json?.run?.status }), ctx: ctxOf(r) });
  }
  { /* OE06 · retry 退避等待期 stop 即时中断（探针实例 30s 退避，AC4）：log「第 2 次尝试」
       = 已入退避等待窗 → POST stop → 8s 内收束（30s 退避未到期 = abortable sleep 弃眠）
       + stopped:true（用户中止独占语义）+ node:error「已中止」（走既有中止级联） */
    try {
      oeSrvStop = await startServer(await getFreePort(), {
        env: { ON_ERROR: 'retry', ON_ERROR_RETRIES: '3', ON_ERROR_RETRY_DELAY_MS: '30000', ALLOW_PRIVATE_NET: '' },
      });
    } catch (e) {
      C.fail('OE06', 'stop 探针实例启动（retry ×3 ×30s）', { expected: '健康 200', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('OE06');
    }
    let sse = null;
    try { sse = await openSse(oeSrvStop.base, wfOeFail('http://127.0.0.1:9/oe06', 'smoke-oe06-stop')); }
    catch (e) {
      C.fail('OE06', 'stop 探针 run（openSse）', { expected: 'SSE 200', actual: String(e?.message ?? e), ctx: 'POST /api/v1/run（smoke-oe06-stop）' });
      throw new SmokeFailError('OE06');
    }
    const runId = (await sse.waitFor((e) => e.type === 'run:accepted', 15000)).runId;
    if (typeof runId === 'string') CLEAN.runIds.push(runId);
    try { await sse.waitFor((e) => e.type === 'log' && String(e.msg ?? '').includes('第 2 次尝试'), 15000); }   // 尝试 1 已失败、通报先行、正在 30s 退避等待
    catch (e) {
      C.fail('OE06', 'waitFor 退避通报 log「第 2 次尝试」（确定处于退避等待窗）', { expected: 'log warn 通报先行', actual: String(e?.message ?? e), ctx: `已收 ${sse.events.length} 事件` });
      throw new SmokeFailError('OE06');
    }
    const tStop = Date.now();
    const st = await api(oeSrvStop.base, 'POST', `/api/v1/run/${runId}/stop`);   // stop 端点单数 run（server.ts 路由注册，A04 同款）
    let done = null;
    try { done = await sse.waitFor((e) => e.type === 'run:done', 8000); }   // 若退避未被中断，需等满 30s → 此处必超时失败
    catch (e) {
      C.fail('OE06', 'waitFor run:done（退避等待期内 stop 即时中断）', { expected: '8s 内收束（30s 退避未到期）', actual: String(e?.message ?? e), ctx: `已收 ${sse.events.length} 事件` });
      throw new SmokeFailError('OE06');
    }
    const elapsed = Date.now() - tStop;
    const abortErr = sse.events.find((e) => e.type === 'node:error' && String(e.message ?? '').includes('已中止'));
    C.ok(st.status === 200 && done.stopped === true && done.ok === false && !!abortErr && elapsed < 7000,
      'OE06', 'retry 退避等待期内 POST stop：run 即时中断（stop→run:done 实测 <7s，30s 退避未到期 = abortable sleep 弃眠、无孤儿等待）、run:done{ok:false,stopped:true}（stopped 恒为用户中止独占语义）、node:error「已中止」走既有中止级联',
      { expected: 'stop 200 + <7s 收束 + stopped:true + 「已中止」', actual: JSON.stringify({ stop: st.status, elapsedMs: elapsed, stopped: done.stopped, ok: done.ok, abortErr: !!abortErr }), ctx: ctxOf(st) });
  }
  { /* OE07/OE08 · env 装载与 fail-fast（AC6）：非法值 → 提前退出 code=1 + 报文指明
       变量名与约束（PTY 先例形态）；边界值 0/0 · 5/60000 双实例健康通过 */
    const oeBad = async (env) => {
      let inst = null;
      try {
        inst = await startServer(await getFreePort(), { env, timeoutMs: 15000 });
        try { inst.child.kill('SIGKILL'); } catch { /* 已退出 */ }   // 意外通过 → 即杀（断言如实红）
        return '意外启动成功（未 fail-fast）';
      } catch (e) {
        return `${String(e?.message ?? e)} | logTail: ${String(e?.logTail ?? '')}`;
      }
    };
    const m1 = await oeBad({ ON_ERROR: 'boom', ON_ERROR_RETRIES: '', ON_ERROR_RETRY_DELAY_MS: '' });
    const m2 = await oeBad({ ON_ERROR: '', ON_ERROR_RETRIES: '9', ON_ERROR_RETRY_DELAY_MS: '' });
    const m3 = await oeBad({ ON_ERROR: '', ON_ERROR_RETRIES: '', ON_ERROR_RETRY_DELAY_MS: 'abc' });
    C.ok(m1.includes('提前退出') && m1.includes('code=1') && m1.includes('ON_ERROR')
      && m2.includes('code=1') && m2.includes('ON_ERROR_RETRIES') && m2.includes('0-5')
      && m3.includes('code=1') && m3.includes('ON_ERROR_RETRY_DELAY_MS') && m3.includes('必须是整数'),
      'OE07', 'env fail-fast 非法值 ×3：ON_ERROR=boom / ON_ERROR_RETRIES=9 / ON_ERROR_RETRY_DELAY_MS=abc → 各自启动即退出 code=1，报文指明变量名与约束（枚举值域 / 0-5 / 必须是整数，PTY 先例形态）',
      { expected: 'code=1 + 变量名 + 约束 ×3', actual: JSON.stringify({ m1: m1.slice(0, 160), m2: m2.slice(0, 160), m3: m3.slice(0, 160) }), ctx: 'startServer 提前退出路径（lib.mjs）' });
    try {
      oeSrvB1 = await startServer(await getFreePort(), { env: { ON_ERROR: 'skip', ON_ERROR_RETRIES: '0', ON_ERROR_RETRY_DELAY_MS: '0' } });
      oeSrvB2 = await startServer(await getFreePort(), { env: { ON_ERROR: 'abort', ON_ERROR_RETRIES: '5', ON_ERROR_RETRY_DELAY_MS: '60000' } });
    } catch (e) {
      C.fail('OE08', '边界值实例启动（0/0 与 5/60000）', { expected: '健康 200 ×2', actual: String(e?.message ?? e), ctx: String(e?.logTail ?? '').slice(0, 200) });
      throw new SmokeFailError('OE08');
    }
    C.ok(oeSrvB1.health.status === 200 && oeSrvB1.health.json?.ok === true
      && oeSrvB2.health.status === 200 && oeSrvB2.health.json?.ok === true,
      'OE08', '边界值通过：ON_ERROR_RETRIES=0 + DELAY=0（下端）与 ON_ERROR=abort + RETRIES=5 + DELAY=60000（上端）两实例健康 200 ok:true（zod 值域闭区间可装载）',
      { expected: '健康 200 ×2', actual: JSON.stringify({ b1: oeSrvB1.health.json?.ok, b2: oeSrvB2.health.json?.ok }), ctx: 'startServer 健康等待' });
  }

  /* OEN 组：节点级 on-error 参数（OEN01-OEN07 · 迭代 0070 / BK-0048 · ADR-0025 ·
   * issue#6 批复承继）——优先序三层矩阵（节点参数（若设）> env 全局默认 > 内建缺省，
   * ADR-0022 §5）+ 陷阱破解（节点 retry 次数由节点参数承载，env retries=0 不使之
   * 退化）+ abort fail-fast + 循环子节点 per-call（ADR-0022 §2.4）。夹具复用
   * wfOeFail（np 入参）与既有探针实例/计数 mock，零新增探针实例与 mock。 */
  { /* OEN01 · 显式哨兵「跟随全局」（主实例三 env 钉空，AC1 显式形态）：与 OE01 同型零漂移 */
    const { done, events, runId } = await oeRun(srv.base, wfOeFail('http://127.0.0.1:9/oen01', 'smoke-oen01-sentinel', false, { onError: '跟随全局' }), 'OEN01', '节点哨兵「跟随全局」');
    const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
    const errs = events.filter((e) => e.type === 'node:error');
    const r = await api(srv.base, 'GET', `/api/v1/runs/${runId}`);
    C.ok(JSON.stringify(starts) === '[1,2]' && errs.length === 1 && errs[0]?.id === 2
      && done.ok === true && done.stopped === false && r.status === 200 && r.json?.run?.status === 'done',
      'OEN01', '节点 onError=跟随全局（显式哨兵）：env 承接（未配置=内建 skip）——node:error 恰 1 次（id=2）、下游节点 3 无 node:start、run:done{ok:true,stopped:false}、GET /runs/:id status="done"（与 OE01 同型零漂移）',
      { expected: '与 OE01 同型', actual: JSON.stringify({ starts, errs: errs.length, ok: done.ok, stopped: done.stopped, status: r.json?.run?.status }), ctx: ctxOf(r) });
  }
  { /* OEN02 · 哨兵 + env=retry×2 承接（retry 探针，AC2 ①）：env 策略与次数全量生效 */
    const { done, events } = await oeRun(oeSrvRetry.base, wfOeFail(`http://127.0.0.1:${oeMock.port}/oen02`, 'smoke-oen02-env-adopt', false, { onError: '跟随全局' }), 'OEN02', '哨兵承接 env retry×2');
    const errs = events.filter((e) => e.type === 'node:error');
    const retryLogs = events.filter((e) => e.type === 'log' && /第 \d+ 次尝试/.test(String(e.msg ?? '')));
    C.ok(oeMock.hits.get('/oen02') === 3 && retryLogs.length === 2 && errs.length === 1
      && String(errs[0]?.message ?? '').includes('已重试 2 次') && done.ok === true,
      'OEN02', '节点哨兵 + ON_ERROR=retry×2：env 策略与次数承接生效——mock 命中恰 3（1+2）、log warn 恰 2、node:error 恰 1 含「已重试 2 次」、耗尽按 skip 终态 run:done{ok:true}',
      { expected: 'hits=3 + warn×2 + 概要 + ok:true', actual: JSON.stringify({ hits: oeMock.hits.get('/oen02'), retryLogs: retryLogs.length, errMsg: errs[0]?.message?.slice(0, 60), ok: done.ok }), ctx: '-' });
  }
  { /* OEN03 · 节点=重试×1 压制 env=skip（skip 探针，AC2 ②）：策略维度节点胜 */
    const { done, events } = await oeRun(oeSrvSkip.base, wfOeFail(`http://127.0.0.1:${oeMock.port}/oen03`, 'smoke-oen03-node-win', false, { onError: '重试', onErrorRetries: 1 }), 'OEN03', '节点重试×1 压制 env skip');
    const errs = events.filter((e) => e.type === 'node:error');
    const retryLogs = events.filter((e) => e.type === 'log' && /第 \d+ 次尝试/.test(String(e.msg ?? '')));
    C.ok(oeMock.hits.get('/oen03') === 2 && retryLogs.length === 1 && errs.length === 1
      && String(errs[0]?.message ?? '').includes('已重试 1 次') && done.ok === true,
      'OEN03', '节点 onError=重试×1 + env=skip：mock 命中恰 2（1+1，节点策略压制 env skip——节点胜）、log warn 恰 1、node:error 恰 1 含「已重试 1 次」、耗尽降级 run:done{ok:true}（退避取实例 DELAY 缺省 1000ms）',
      { expected: 'hits=2 + warn×1 + 概要 + ok:true', actual: JSON.stringify({ hits: oeMock.hits.get('/oen03'), retryLogs: retryLogs.length, errMsg: errs[0]?.message?.slice(0, 60), ok: done.ok }), ctx: '-' });
  }
  { /* OEN04 · 节点=重试次数缺省（主实例三 env 钉空，AC3 陷阱破解）：DEFS 默认 2 注入 → 恰 3 次尝试 */
    const { done, events } = await oeRun(srv.base, wfOeFail(`http://127.0.0.1:${oeMock.port}/oen04`, 'smoke-oen04-default-retries', false, { onError: '重试' }), 'OEN04', '节点重试次数缺省=2');
    const errs = events.filter((e) => e.type === 'node:error');
    const retryLogs = events.filter((e) => e.type === 'log' && /第 \d+ 次尝试/.test(String(e.msg ?? '')));
    const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
    C.ok(oeMock.hits.get('/oen04') === 3 && retryLogs.length === 2 && errs.length === 1
      && String(errs[0]?.message ?? '').includes('已重试 2 次') && JSON.stringify(starts) === '[1,2]' && done.ok === true,
      'OEN04', '节点 onError=重试（次数缺省，env 三键钉空）：DEFS 默认 onErrorRetries=2 注入 → mock 命中恰 3（1+2）——env retries=0 未使节点 retry 退化（陷阱破解机器证明）、node:start 未重跑、log warn 恰 2、耗尽按 skip 终态 ok:true',
      { expected: 'hits=3 + warn×2 + 概要 + ok:true', actual: JSON.stringify({ hits: oeMock.hits.get('/oen04'), retryLogs: retryLogs.length, errMsg: errs[0]?.message?.slice(0, 60), starts, ok: done.ok }), ctx: '-' });
  }
  { /* OEN05 · 节点=中止（abort 探针，AC4）：fail-fast 全链与 OE05 同型（status='error'
       持久层派生 + stopped 语义独占），触发面在节点参数；节点胜因果由 OEN06 承载 */
    const { done, events, runId } = await oeRun(oeSrvAbort.base, wfOeFail('http://127.0.0.1:9/oen05', 'smoke-oen05-abort', true, { onError: '中止' }), 'OEN05', '节点中止 fail-fast');
    const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
    const errs = events.filter((e) => e.type === 'node:error');
    const r = await api(oeSrvAbort.base, 'GET', `/api/v1/runs/${runId}`);
    C.ok(JSON.stringify(starts) === '[1,2]' && errs.length === 1 && errs[0]?.id === 2
      && done.ok === false && done.stopped === false && done.done === 2
      && r.status === 200 && r.json?.run?.status === 'error',
      'OEN05', '节点 onError=中止：失败后下游节点 3 与同级分支节点 4 全部不再调度（starts=[1,2]）、run:done{ok:false,stopped:false,done=2}（fail-fast 且 stopped 恒用户中止独占）、GET /runs/:id status="error"',
      { expected: 'starts=[1,2] + ok:false/stopped:false + status=error', actual: JSON.stringify({ starts, errs: errs.length, ok: done.ok, stopped: done.stopped, status: r.json?.run?.status }), ctx: ctxOf(r) });
  }
  { /* OEN06 · 节点=中止覆盖 env=retry×2（retry 探针，AC2 ② 延伸/B4）：策略类型节点胜 */
    const { done, events } = await oeRun(oeSrvRetry.base, wfOeFail(`http://127.0.0.1:${oeMock.port}/oen06`, 'smoke-oen06-abort-over-env', true, { onError: '中止' }), 'OEN06', '节点中止覆盖 env retry');
    const starts = events.filter((e) => e.type === 'node:start').map((e) => e.id);
    const errs = events.filter((e) => e.type === 'node:error');
    C.ok(oeMock.hits.get('/oen06') === 1 && JSON.stringify(starts) === '[1,2]' && errs.length === 1
      && done.ok === false && done.stopped === false,
      'OEN06', '节点 onError=中止 + env=retry×2：mock 命中恰 1（零重试——节点策略类型覆盖 env 策略类型，env 次数不叠加）、fail-fast starts=[1,2]、run:done{ok:false,stopped:false}',
      { expected: 'hits=1 + starts=[1,2] + ok:false/stopped:false', actual: JSON.stringify({ hits: oeMock.hits.get('/oen06'), starts, errs: errs.length, ok: done.ok, stopped: done.stopped }), ctx: '-' });
  }
  { /* OEN07 · 循环子节点 per-call（retry 探针，AC7 · ADR-0022 §2.4）：loop 闭包子图内
       节点策略经 sub() 逐 runNode 调用独立解析——userinput → loop → http(重试×1)，
       单元素 1 次迭代 → mock 恰 2 命中（1+1） */
    const wfOenLoop = {
      name: 'smoke-oen07-loop',
      nodes: [
        { id: 1, type: 'userinput', x: 100, y: 100, params: { var: 'question', defv: '冒烟' } },
        { id: 2, type: 'loop', x: 320, y: 100, params: { max: 10, conc: false } },
        { id: 3, type: 'http', x: 540, y: 100, params: { url: `http://127.0.0.1:${oeMock.port}/oen07`, m: 'GET', to: 5, onError: '重试', onErrorRetries: 1 } },
      ],
      edges: [
        { id: 1, fn: 1, fp: 0, tn: 2, tp: 0 },
        { id: 2, fn: 2, fp: 0, tn: 3, tp: 0 },
      ],
    };
    const { done, events } = await oeRun(oeSrvRetry.base, wfOenLoop, 'OEN07', '循环子节点 per-call 重试×1');
    const errs = events.filter((e) => e.type === 'node:error');
    const retryLogs = events.filter((e) => e.type === 'log' && /第 \d+ 次尝试/.test(String(e.msg ?? '')));
    const httpStarts = events.filter((e) => e.type === 'node:start' && e.id === 3).length;
    C.ok(oeMock.hits.get('/oen07') === 2 && retryLogs.length === 1 && errs.length === 1 && httpStarts === 1
      && String(errs[0]?.message ?? '').includes('已重试 1 次') && done.ok === true,
      'OEN07', 'loop 闭包子图内 http 节点 onError=重试×1：循环子节点经 sub() 逐 runNode 调用独立解析——mock 命中恰 2（1+1）、log warn 恰 1、node:error 恰 1 含「已重试 1 次」、node:start 恰 1 次（重试不重跑）、run:done{ok:true}',
      { expected: 'hits=2 + warn×1 + 概要 + ok:true', actual: JSON.stringify({ hits: oeMock.hits.get('/oen07'), retryLogs: retryLogs.length, httpStarts, errMsg: errs[0]?.message?.slice(0, 60), ok: done.ok }), ctx: '-' });
  }
}

/* ---------- 运行器：fail-fast + finally 清理 + 汇总 + 退出码（SPEC §8） ---------- */
process.on('SIGINT', () => {
  console.log('\n收到 SIGINT：执行清理后退出');
  void (async () => { await cleanup(); process.exit(130); })();
});
process.on('SIGBREAK', () => {
  console.log('\n收到 SIGBREAK：执行清理后退出');
  void (async () => { await cleanup(); process.exit(130); })();
});

try {
  await main();
} catch (e) {
  if (e instanceof SmokeFailError) {
    console.log(`（fail-fast：断言 ${e.assertId} 失败，停止后续断言，进入清理）`);
  } else {
    console.error(`ERROR 未预期的异常：${e?.stack ?? e}`);
    C.failed += 1;   /* OBS-001：未预期异常计入 failed，退出码如实为 1（不再 73/0/exit 0 误报全绿） */
  }
  if (srv?.log) console.log(`---- server 日志尾（末 200 行）----\n${srv.log.tail(200)}`);
} finally {
  try {
    await cleanup();
  } catch (e) {
    console.error(`ERROR 清理阶段异常：${e?.stack ?? e}`);
  }
}
console.log(`==== smoke:server：${C.passed} passed / ${C.failed} failed ====`);
process.exit(C.failed === 0 ? 0 : 1);
