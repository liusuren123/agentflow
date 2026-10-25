#!/usr/bin/env node
/* ================================================================
 * smoke-server.mjs — 后端 E2E 冒烟编排层（迭代 0002 / BK-0002 · SPEC §6-§8）
 * 一键入口：npm run smoke:server（根 package.json scripts）
 * 步骤编排 P→H→W→N→S→R→D→E→K→G→C；fail-fast（首 FAIL 打印上下文 + server 日志尾，
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

const C = new Checker();
const CLEAN = { runIds: [], wfIds: [] };
let srv = null;
let mockModel = null;   /* G 组：进程内 mock 模型端点（迭代 0015） */
let mockSrv = null;     /* G 组：AI_BASE_URL 指向 mock 的第二实例 */
let minimalSrv = null;  /* G 组：全密钥空串压制的第三实例（降级路径确定性） */
let zSrv = null;        /* Z 组：启动扫尾专用实例（迭代 0019 / BK-0011，SIGKILL 后同端口重启） */
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
  /* G 组实例收尾（迭代 0015；沿 C04 kill 模式，尽力而为不计断言）；Z 组实例同批（迭代 0019） */
  for (const inst of [mockSrv, minimalSrv, zSrv]) {
    if (!inst) continue;
    try { inst.child.kill(); } catch { /* 已退出 */ }
    let ex = await Promise.race([inst.exitPromise.then(() => true), sleep(3000).then(() => false)]);
    if (!ex) { try { inst.child.kill('SIGKILL'); } catch { /* 已退出 */ } }
    await Promise.race([inst.exitPromise.then(() => true), sleep(1000).then(() => false)]);
  }
  if (mockModel) { try { await new Promise((r) => mockModel.srv.close(() => r())); } catch { /* 已关闭 */ } }
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
   * （SPEC §6.1：.env 不覆盖已有键 + config 空串归一为未配置 → E 组受控环境） */
  try {
    srv = await startServer(port, { env: { BOCHA_API_KEY: '', SEARXNG_URL: '' } });
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

  /* N 组：参数反例（N01-N03） */
  const n1 = await api(srv.base, 'POST', '/api/v1/run', { name: 'x', nodes: {} });
  C.ok(n1.status === 400 && n1.json?.error === 'body.nodes 必须是数组', 'N01', 'POST /run nodes 非数组 → 400 {error:"body.nodes 必须是数组"}',
    { expected: '400 body.nodes 必须是数组', actual: `${n1.status} ${n1.text.slice(0, 80)}`, ctx: `${ctxOf(n1)} | req.nodes={}` });
  for (const [id, lim] of [['N02', 0], ['N03', 101]]) {
    const r = await api(srv.base, 'GET', `/api/v1/runs?limit=${lim}`);
    C.ok(r.status === 400 && r.json?.error === 'limit 必须是 1-100 的整数', id, `GET /runs?limit=${lim} → 400`,
      { expected: '400 limit 必须是 1-100 的整数', actual: `${r.status} ${r.text.slice(0, 80)}`, ctx: ctxOf(r) });
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
  /* mock 实例：AI_BASE_URL 注入显式配置分支（providers.ts 显式优先），宿主密钥不影响 */
  mockModel = await startMockModel();
  try {
    mockSrv = await startServer(await getFreePort(), {
      env: { AI_BASE_URL: mockModel.url, AI_API_KEY: 'smoke-mock-key', AI_MODELS: 'MockChat:mock-model', AI_MODEL: 'mock-model' },
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
