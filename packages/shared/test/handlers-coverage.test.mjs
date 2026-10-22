/* ================================================================
 *  handlers-coverage.test.mjs — 后端 HANDLERS ⊇ NODES 键集防护
 *  堵 engine.ts:99 的静默回退：缺 handler 的节点会 fallback 到
 *  HANDLERS.__pass 假装成功（handlers.ts:14-16）——「新增节点忘写
 *  handler」必须在这里变红，而不是运行时静默漂移。
 *  前置：根 npm test 链已先行 build:server（SPEC D2）；本文件内的
 *  existsSync 报错是裸跑（未走根链）时的第二道保险，绝不静默跳过。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { NODES } from '../dist/index.js';

const ENGINE_URL = new URL('../../../apps/server/dist/engine.js', import.meta.url);

test('后端 HANDLERS 键集 ⊇ NODES 键集（新增节点缺 handler = 红，堵 engine 静默 __pass 假成功）', async () => {
  /* D2 第二道保险：裸跑（未走根 test 链）时给出可操作报错，绝不静默跳过 */
  if (!existsSync(ENGINE_URL))
    assert.fail('apps/server/dist/engine.js 不存在——先在仓库根执行 npm run build:server（或完整 npm test）后再跑本测试');
  const { HANDLERS } = await import(ENGINE_URL.href);
  assert.ok(HANDLERS, 'engine.js 未导出 HANDLERS（engine.ts:26 应为 export const HANDLERS）');
  const keys = Object.keys(HANDLERS);
  const nodeKeys = Object.keys(NODES);
  /* ① 缺失键 = 红（engine.ts:99 会对缺失键静默回退 __pass 假成功） */
  const missing = nodeKeys.filter(k => !keys.includes(k));
  assert.deepEqual(missing, [], `以下节点类型缺后端 handler（将静默 __pass 假成功）：${missing.join(', ')}`);
  /* ② 每个节点键必须是可调用 handler（防键在而值为非函数的形似神不似） */
  for (const k of nodeKeys) assert.equal(typeof HANDLERS[k], 'function', `${k} 的 handler 不是函数`);
  /* ③ 额外键只允许 __pass（engine 内部回退专用，engine.ts:99）；出现其他额外键 = 表被污染，红 */
  const extra = keys.filter(k => !nodeKeys.includes(k));
  assert.ok(extra.every(k => k === '__pass'), `handler 表存在节点注册表与 __pass 之外的额外键：${extra.join(', ')}`);
});
