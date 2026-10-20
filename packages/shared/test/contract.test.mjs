/* ================================================================
 *  shared 契约测试（node:test，零额外依赖）
 *  npm run build && npm test -w @agentflow/shared
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NODES, NODE_NAMES, paramDefaultsOf, validateEvent } from '../dist/index.js';

test('节点注册表完整：16 种节点，字段齐全', () => {
  assert.equal(Object.keys(NODES).length, 16);
  for (const [type, def] of Object.entries(NODES)) {
    assert.ok(def.name, `${type} 缺 name`);
    assert.ok(['input', 'chat', 'knowledge', 'tools', 'logic', 'output', 'human'].includes(def.cat), `${type} cat 非法`);
    assert.ok(def.icon, `${type} 缺 icon`);
    assert.ok(Array.isArray(def.inputs) && Array.isArray(def.outputs), `${type} 缺端口数组`);
    assert.ok(Array.isArray(def.params), `${type} 缺参数数组`);
    assert.equal(NODE_NAMES[type], def.name);
  }
});

test('端口类型合法', () => {
  for (const def of Object.values(NODES))
    for (const p of [...def.inputs, ...def.outputs])
      assert.ok(['any', 'text', 'list', 'object', 'number'].includes(p.t), `非法端口类型 ${p.t}`);
});

test('paramDefaultsOf 与注册表一致（抽样）', () => {
  assert.equal(paramDefaultsOf('llm').model, 'GLM-4.7');
  assert.equal(paramDefaultsOf('llm').temp, 0.7);
  assert.equal(paramDefaultsOf('llm').max, 2048);
  assert.equal(paramDefaultsOf('condition').expr, 'confidence > 0.7');
  assert.equal(paramDefaultsOf('retrieval').topk, 3);
  assert.equal(paramDefaultsOf('approval').to, '挂起');
  assert.deepEqual(paramDefaultsOf('__unknown__'), {});
});

test('SSE 事件契约：全部 15 种事件可解析（真实事件样本回放）', () => {
  const samples = [
    { type: 'run:accepted', runId: 'abc123' },
    { type: 'run:start', name: '客服', total: 8 },
    { type: 'run:progress', done: 3, total: 8, elapsed: 1200 },
    { type: 'node:start', id: 4, title: 'LLM 生成回复', defName: 'LLM 对话', iteration: null },
    { type: 'node:bypass', id: 7, title: '转人工审批' },
    { type: 'node:delta', id: 4, text: '您好' },
    { type: 'node:done', id: 4, title: 'LLM', out: '您好…', ms: 1500, tokens: 168, firePort: null, iteration: null,
      inputs: [{ tp: 0, from: '客服提示词', fromFp: 0, val: '模板渲染完成' }] },
    { type: 'node:error', id: 8, title: '升级通知', message: 'Webhook 推送失败' },
    { type: 'cond', id: 5, title: '置信度判断', expr: 'confidence > 0.7', branch: '真' },
    { type: 'log', msg: '✓ 完成', lvl: 'ok' },
    { type: 'output', text: '最终回复' },
    { type: 'approval:required', runId: 'abc123', nodeId: 7, title: '转人工审批', role: '值班经理', inputPreview: '预览' },
    { type: 'approval:done', nodeId: 7, approve: true },
    { type: 'run:error', message: '引擎错误' },
    { type: 'run:done', ms: 9500, done: 7, total: 8, ok: true, stopped: false, outputs: ['回复'], vars: { question: '如何申请退货?' } },
  ];
  assert.equal(samples.length, 15);
  for (const s of samples) validateEvent(s);
  assert.throws(() => validateEvent({ type: 'run:start', total: 'x' }));   // total 非数
  assert.throws(() => validateEvent({ type: 'unknown:event' }));           // 未注册事件
});

test('注册表与前端 DEFS 逐字一致（宪法结构层）', () => {
  /* 从权威 index.html 提取 DEFS，与共享注册表交叉校验默认值——
     消灭前后端 5 处手工同步点的回归防线 */
  const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
  const m = html.match(/const DEFS = \{([\s\S]*?)\n\};/);
  assert.ok(m, 'index.html 中未找到 DEFS');
  const types = [...m[1].matchAll(/^  (\w+): \{/gm)].map(x => x[1]);
  assert.deepEqual([...types].sort(), Object.keys(NODES).sort());
  for (const t of types) {
    const seg = m[1].split(new RegExp(`^  ${t}: \\{`, 'm'))[1]?.split(/\n  \w+: \{/)[0] ?? '';
    const unq = s => s.startsWith("'")
      ? s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\')
      : JSON.parse(s);
    const defs = [...seg.matchAll(/\{k:'(\w+)'[^\n]*?d:('(?:[^'\\]|\\.)*'|[\d.]+|true|false)/g)]
      .map(x => [x[1], unq(x[2])]);
    const sharedDefs = paramDefaultsOf(t);
    for (const [k, v] of defs) assert.deepEqual(sharedDefs[k], v, `${t}.${k} 前后端默认值不一致`);
  }
});
