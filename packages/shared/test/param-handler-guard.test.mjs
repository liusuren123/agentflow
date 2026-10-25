/* ================================================================
 *  param-handler-guard.test.mjs — 参数键名 ↔ handler 引用一致性守卫
 *  （迭代 0021 / BK-0021 批次 1，迁移 SPEC §6 / NDP §4.2 必踩点 2）
 *  静态提取 apps/server/src/{handlers,llm,agent}.ts 与 engine.ts 的 p.<key>：
 *  handlers.ts 按最近前导 `async <name>(` 方法项归属（无名箭头不匹配，
 *  闭包内 p. 归宿主 handler）；llm.ts / agent.ts 全文件各归 llm / agent；
 *  engine.ts 仅含 `n.type === 'condition'` 守卫的行归 condition。
 *  正向：提取键 ∈ NODES[owner].params[].k（改名即红）；反向：有而无引用
 *  的键集合恰等于僵尸清单（NDP §6.4）。不硬编码行数/处数/键数。
 *  跨包读源先例：contract.test.mjs:66。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NODES } from '../dist/index.js';

const SERVER_SRC = fileURLToPath(new URL('../../../apps/server/src', import.meta.url));

/* ---- 提取原语：逐行剥 // 行内注释后以 /\bp\.(\w+)/ 提取 ---- */
function pKeysOf(line) {
  const i = line.indexOf('//');
  const stripped = i === -1 ? line : line.slice(0, i);
  return [...stripped.matchAll(/\bp\.([A-Za-z_]\w*)/g)].map(m => m[1]);
}

function addRefs(refs, owner, keys) {
  if (!refs.has(owner)) refs.set(owner, new Set());
  for (const k of keys) refs.get(owner).add(k);
}

function readLines(file) {
  return readFileSync(`${SERVER_SRC}/${file}`, 'utf8').split(/\r?\n/);
}

/* handlers.ts：行归属 = 最近前导 `async <name>(` 方法项（BASIC_HANDLERS 表内） */
function extractHandlers() {
  const refs = new Map();
  const unattributed = [];
  let owner = null;
  for (const raw of readLines('handlers.ts')) {
    const m = raw.match(/^\s*async\s+([A-Za-z_]\w*)\s*\(/);
    if (m) owner = m[1];
    const keys = pKeysOf(raw);
    if (!keys.length) continue;
    if (owner === null) unattributed.push(raw.trim());
    else addRefs(refs, owner, keys);
  }
  return { refs, unattributed };
}

/* llm.ts：全文件归 llm（llmHandler 即 llm 节点实现） */
function extractLlm() {
  const refs = new Map();
  const unattributed = [];
  for (const raw of readLines('llm.ts')) {
    const keys = pKeysOf(raw);
    if (keys.length) addRefs(refs, 'llm', keys);
  }
  return { refs, unattributed };
}

/* agent.ts：全文件归 agent（agentHandler 即 agent 节点实现；extractLlm 同型） */
function extractAgent() {
  const refs = new Map();
  const unattributed = [];
  for (const raw of readLines('agent.ts')) {
    const keys = pKeysOf(raw);
    if (keys.length) addRefs(refs, 'agent', keys);
  }
  return { refs, unattributed };
}

/* engine.ts：仅含 `n.type === 'condition'` 守卫的行归 condition（唯一 p. 引用 = engine.ts:128） */
function extractEngine() {
  const refs = new Map();
  const unattributed = [];
  for (const raw of readLines('engine.ts')) {
    const keys = pKeysOf(raw);
    if (!keys.length) continue;
    if (/n\.type === 'condition'/.test(raw)) addRefs(refs, 'condition', keys);
    else unattributed.push(raw.trim());
  }
  return { refs, unattributed };
}

/* ---- 期望僵尸清单（NDP §6.4：已声明未接入实现的 UI-only 参数）----
 * webshow.sandbox（迭代 0033）：iframe sandbox 属性开关，消费面在前端
 * （app.js setNodeWebshow 读 paramsOf(n).sandbox），服务端 handler 无语义——
 * UI-only 僵尸，与 trigger.mode/cron/path 同类。 */
const EXPECTED_ZOMBIES = [
  ['trigger', ['mode', 'cron', 'path']],
  ['userinput', ['vtype', 'req']],
  ['termview', ['lines', 'autoscroll']],
  ['webshow', ['sandbox']],
  ['jsoncanvas', ['expand', 'fmt']],
];

test('守卫：参数键名 ↔ handler 引用一致（正向 ∈ 断言 + 反向僵尸清单精确断言）', () => {
  /* 汇总三源提取结果；无法归属的引用 = 红（不静默，SPEC §9） */
  const refs = new Map();
  const unattributed = [];
  for (const { refs: r, unattributed: u } of [extractHandlers(), extractLlm(), extractAgent(), extractEngine()]) {
    for (const [owner, keys] of r) {
      if (!refs.has(owner)) refs.set(owner, new Set());
      for (const k of keys) refs.get(owner).add(k);
    }
    unattributed.push(...u);
  }
  assert.deepEqual(
    unattributed,
    [],
    `存在无法归属的 p.<key> 引用（新增归属规则或修正提取器，不得静默丢弃）：${unattributed.join(' | ')}`,
  );

  /* 正向：每个 (owner,key) ∈ NODES[owner].params[].k —— 参数改名即红（运行时静默失效防线） */
  const violations = [];
  for (const [owner, keys] of refs) {
    const def = NODES[owner];
    if (!def) { violations.push(`owner「${owner}」不是注册表节点类型`); continue; }
    for (const k of keys)
      if (!def.params.some(p => p.k === k)) violations.push(`${owner}.${k}`);
  }
  assert.deepEqual(violations, [], `handler 引用了注册表不存在的参数键：${violations.join(', ')}`);

  /* 反向：有而无引用的键集合恰等于僵尸清单（新僵尸出现或旧僵尸被接通都红） */
  const zombies = [];
  for (const [type, def] of Object.entries(NODES)) {
    const refd = refs.get(type) ?? new Set();
    const dead = def.params.map(p => p.k).filter(k => !refd.has(k));
    if (dead.length) zombies.push([type, dead]);
  }
  assert.deepEqual(
    zombies,
    EXPECTED_ZOMBIES,
    '僵尸参数清单漂移——提示同步 NDP §6.4 与本清单（新僵尸出现或旧僵尸被接通）',
  );

  /* 两数分开（AC3）：40 已定义 / 32 已实现 = 总数 − 僵尸数（由清单推导，不硬编码）
     合并自 0033(webshow)+0034(termview) 两路并行：总数 38+2=40，僵尸 6+2=8 → 已实现 32
     0035(jsoncanvas)：总数 40+2=42，僵尸 8+2=10 → 已实现 32 不变 */
  const total = Object.values(NODES).reduce((n, d) => n + d.params.length, 0);
  assert.equal(total, 42, '已定义参数总数应为 42（结构信号，非质量信号）');
  const zombieCount = EXPECTED_ZOMBIES.reduce((n, [, ks]) => n + ks.length, 0);
  const refCount = [...refs.values()].reduce((n, s) => n + s.size, 0);
  assert.equal(
    refCount,
    total - zombieCount,
    `已实现参数数（(owner,key) 引用对）应为 ${total - zombieCount}——两数分开一致性自检`,
  );
});
