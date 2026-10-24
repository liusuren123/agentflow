/* ================================================================
 *  nodes-dirs.test.mjs — 目录制加载机制测试（迭代 0021 / BK-0021 批次 1）
 *  D===R：nodes.ts 源文本 import 集 ≡ src/nodes/ 目录集（无漏 import /
 *  无孤儿目录）；D ⊆ keys(NODES)；批次 1 边界 = 内联残留集恰为批次 2
 *  八键（批次 2 收尾收敛为「残留=0」，迁移 SPEC §3.2 终态）；
 *  引用边界（NDP §2.5）：apps 源不得直引 nodes/<type>/node 定义模块。
 *  读源先例：contract.test.mjs:66-68。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NODES } from '../dist/index.js';

const SRC = fileURLToPath(new URL('../src', import.meta.url));

test('D===R：nodes.ts 静态 import 集与 nodes/ 目录集一致，且 D ⊆ keys(NODES)', () => {
  const src = readFileSync(`${SRC}/nodes.ts`, 'utf8');
  const D = new Set([...src.matchAll(/from '\.\/nodes\/([a-z][a-z0-9-]*)\/node\.js'/g)].map(m => m[1]));
  const R = new Set(
    readdirSync(`${SRC}/nodes`, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name),
  );
  assert.deepEqual([...D].sort(), [...R].sort(), 'import 集 D 与目录集 R 不一致（漏 import / 孤儿目录）');
  const keys = Object.keys(NODES);
  for (const d of D) assert.ok(keys.includes(d), `目录「${d}」不是注册表键（D ⊆ keys(NODES) 破坏）`);

  /* 批次 1 边界形态：内联残留集恰为批次 2 八键（AC9 机器化）；
     keys(NODES) 为声明序 → 残留序同声明序，deepEqual 精确断言 */
  const residual = keys.filter(k => !D.has(k));
  assert.deepEqual(
    residual,
    ['prompt', 'websearch', 'notify', 'loop', 'merge', 'reply', 'setvar', 'approval'],
    '内联残留键集应恰为批次 2 八键（多迁/漏迁即红）',
  );
});

test('引用边界（NDP §2.5）：apps 源文本不直引节点定义子模块', () => {
  /* exports map 仅 "." 已机械挡包外子路径；本断言挡源码层直引模式回流 */
  const PATTERNS = [
    [/@agentflow\/shared\/dist\/nodes\//, 'shared dist 子路径直引'],
    [/nodes\/[a-z][a-z0-9-]*\/node/, 'nodes/<type>/node 直引'],
  ];
  const EXTS = /\.(js|mjs|cjs|ts|tsx|jsx|css)$/;
  const violations = [];
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (EXTS.test(e.name)) {
        const text = readFileSync(p, 'utf8');
        for (const [re, why] of PATTERNS) if (re.test(text)) violations.push(`${p}（${why}）`);
      }
    }
  };
  walk(fileURLToPath(new URL('../../../apps/web/src', import.meta.url)));
  walk(fileURLToPath(new URL('../../../apps/server/src', import.meta.url)));
  assert.deepEqual(violations, [], 'apps 源出现节点定义直引——必须经 @agentflow/shared 包根（单一事实源）');
});
