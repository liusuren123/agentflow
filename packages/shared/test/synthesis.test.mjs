/* ================================================================
 *  synthesis.test.mjs — 聚合层反向合成测试（迭代 0021 / BK-0021 批次 1）
 *  ① caps 固定序（NDP §4.2 必踩点 1）；② trigger 两 if 六行真值表
 *  （迁移 SPEC §5.2，快照对此零证明力——函数不可序列化）；③ 8 已迁移键
 *  params[].k 声明序（不变式 C，与 defs-drift 的 .sort() 互补）；
 *  ④ 快照常驻比对（不变式 A，Buffer 级、零文本模式、免疫 EOL 事故，
 *  迁移 SPEC §5.1 推荐形态原文实现）；⑤ 可写性常驻断言（app.js 运行期
 *  覆写 DEFS.llm.params[0].o 是现状行为，SPEC §5.7——不得 Object.freeze）。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NODES } from '../dist/index.js';

test('caps 固定序：llm/agent=[mcp,skill] / code=[mcp] / 其余 18 键无 caps 键', () => {
  assert.deepEqual(NODES.llm.caps, ['mcp', 'skill']);
  assert.deepEqual(NODES.agent.caps, ['mcp', 'skill']);
  assert.deepEqual(NODES.code.caps, ['mcp']);
  /* webshow 回归锚（迭代 0033）：capabilities.data 不进 caps（合成层只映射 mcp/skill）
   * ——不进上方跳过集，由下方循环 !('caps' in def) 自然覆盖，再显式锚定一次 */
  assert.ok(!('caps' in NODES.webshow), 'webshow 不应含 caps 键（data 不进 caps 的回归锚）');
  for (const [type, def] of Object.entries(NODES)) {
    if (type === 'llm' || type === 'agent' || type === 'code') continue;
    assert.ok(!('caps' in def), `${type} 不应含 caps 键（18 节点无 caps 的复现条件）`);
  }
});

test('if 编译产物六行真值表（迁移前语义 = 旧 nodes.ts trigger 的 if 谓词）', () => {
  const cron = NODES.trigger.params.find(p => p.k === 'cron');
  const path = NODES.trigger.params.find(p => p.k === 'path');
  assert.equal(typeof cron.if, 'function', 'cron.if 应为编译产物函数');
  assert.equal(typeof path.if, 'function', 'path.if 应为编译产物函数');
  /* cron: p.mode === '定时触发' */
  assert.equal(cron.if({ mode: '手动触发' }), false);
  assert.equal(cron.if({ mode: '定时触发' }), true);
  assert.equal(cron.if({ mode: 'Webhook' }), false);
  /* path: p.mode === 'Webhook' */
  assert.equal(path.if({ mode: '手动触发' }), false);
  assert.equal(path.if({ mode: 'Webhook' }), true);
  assert.equal(path.if({ mode: '定时触发' }), false);
});

test('10 已迁移键 params[].k 声明序逐字搬运（不变式 C：顺序即契约）', () => {
  const EXPECTED_ORDER = {
    trigger: ['mode', 'cron', 'path'],
    userinput: ['var', 'vtype', 'req', 'defv'],
    llm: ['model', 'sys', 'temp', 'max'],
    agent: ['model', 'sys', 'maxSteps'],
    retrieval: ['kb', 'topk', 'th'],
    http: ['m', 'url', 'to'],
    code: ['lang', 'code'],
    condition: ['expr'],
    delay: ['s'],
    webshow: ['url', 'sandbox'],
  };
  for (const [type, ks] of Object.entries(EXPECTED_ORDER))
    assert.deepEqual(NODES[type].params.map(p => p.k), ks, `${type} params 序漂移`);
});

test('快照常驻比对：NODES 运行时输出与迁移前基线逐字节等价（不变式 A，21 键全量）', () => {
  const baseline = readFileSync(new URL('./nodes.baseline.json', import.meta.url)); // Buffer，零文本模式
  const actual = Buffer.from(JSON.stringify(NODES, null, 2) + '\n', 'utf8');
  let off = -1;
  for (let i = 0; i < Math.min(actual.length, baseline.length); i++)
    if (actual[i] !== baseline[i]) { off = i; break; }
  assert.ok(
    actual.equals(baseline),
    () =>
      `NODES 输出与迁移前基线存在字节级漂移：首异字节偏移 ${off}` +
      `（actual ${actual.length}B / baseline ${baseline.length}B）` +
      (off >= 0 ? `；基线上下文 ${JSON.stringify(baseline.subarray(Math.max(0, off - 20), off + 20).toString('utf8'))}` : '') +
      '；若为经批准的 DEFS 变更，须在同一提交内按 docs/node-definition-protocol-migration-spec.md §2 命令重生成基线，否则即未批漂移',
  );
});

test('可写性常驻断言（app.js 运行期覆写现状，聚合层不得 Object.freeze）', () => {
  assert.ok(!Object.isFrozen(NODES), 'NODES 不得被 freeze');
  assert.ok(!Object.isFrozen(NODES.llm), 'NODES.llm 不得被 freeze');
  /* 向 dist 导入对象的 llm.params[0].o 赋值不抛（写后还原） */
  const param = NODES.llm.params[0];
  const orig = param.o;
  param.o = ['x'];
  assert.deepEqual(param.o, ['x'], 'params[0].o 赋值应生效（app.js 覆写路径的现状行为）');
  param.o = orig;
  assert.deepEqual(param.o, orig, '还原失败会污染同进程后续测试');
});
