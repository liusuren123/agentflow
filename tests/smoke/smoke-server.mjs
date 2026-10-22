#!/usr/bin/env node
/* ================================================================
 * smoke-server.mjs — 后端 E2E 冒烟编排层（迭代 0002 / BK-0002 · SPEC §6-§8）
 * 一键入口：npm run smoke:server（根 package.json scripts）
 * 步骤编排 P→H→W→N→S→R→D→C；fail-fast（首 FAIL 打印上下文 + server 日志尾，
 * 进 finally 清理）；SIGINT/SIGBREAK 触发同一清理后 exit 130；
 * 汇总 `==== smoke:server：X passed / Y failed ====`，退出码 Y===0 ? 0 : 1。
 * ================================================================ */
import {
  Checker, SmokeFailError, api, ctxOf, deepEqual, getFreePort, openSse, preflight, sleep, startServer,
} from './lib.mjs';

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

const C = new Checker();
const CLEAN = { runIds: [], wfIds: [] };
let srv = null;
let cleanupPromise = null;

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
  const port = await getFreePort();

  /* H 组：起进程 + 健康等待（H01） */
  try {
    srv = await startServer(port);
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
