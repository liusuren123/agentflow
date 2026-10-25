/* ================================================================
 *  readme-consistency.test.mjs — README 生成物一致性测试（迭代 0022 / BK-0021 批次 2）
 *  ① 表格回比：解析在库 README 端口/参数表回比 dist/nodes/<type>/node.js
 *     源数据；总索引 18 行且序 = Object.keys(NODES)；目录集 ↔ README
 *     一一对应（NDP §8：README 由 node.ts 生成，手写漂移即红）。
 *  ② 生成器确定性：spawnSync(process.execPath) 重生成到 os.tmpdir，18 份
 *     产物与在库文件比对——在库侧先 CRLF→LF 归一（本仓 core.autocrlf=true
 *     下再检出会 CRLF 化，属 git EOL 策略非内容漂移）；生成器 tmp 产物
 *     本身以 LF 无 BOM 逐字节断言。
 *  ③ 回归免疫自检：在库 README 无 BOM（BOM 不可能由 git EOL 转换产生）。
 *  单元格转义规则与 tools/gen-node-readmes.mjs 共用（SPEC §5.2）：
 *  值中换行 → 字面 \n 两字符；| → \|（解析侧统一逆变换）。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SHARED = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(SHARED, '../..');
const NODES_DIR = join(SHARED, 'src/nodes');
const GEN = join(ROOT, 'tools/gen-node-readmes.mjs');
const { NODES } = await import(pathToFileURL(join(SHARED, 'dist/index.js')).href);
const TYPES = Object.keys(NODES);

/* ---------------- 解析助手（转义规则逆变换，SPEC §5.2） ---------------- */
const unesc = s => s.replaceAll('\\|', '|').replaceAll('\\n', '\n');
const cells = line => {
  const t = line.trim().slice(1, -1); /* 剥首尾 | */
  return t.split(/(?<!\\)\|/).map(c => unesc(c.trim()));
};
/** 取「<heading>」段下首个表格的数据行（跳表头行与分隔行，遇非 | 行止） */
function tableRowsOf(lines, heading) {
  const i = lines.indexOf(heading);
  assert.ok(i >= 0, `README 缺少段落「${heading}」`);
  let j = i + 1;
  while (j < lines.length && !lines[j].trim().startsWith('|')) j++;
  assert.ok(j < lines.length, `「${heading}」段下无表格`);
  const rows = [];
  for (j += 2; j < lines.length && lines[j].trim().startsWith('|'); j++) rows.push(cells(lines[j]));
  return rows;
}

/* ---------------- 期望行构造（= 生成器模板口径的镜像） ---------------- */
const numberConstraint = p => {
  const parts = [];
  if (p.min !== undefined || p.max !== undefined) parts.push(`[${p.min ?? ''}–${p.max ?? ''}]`);
  if (p.step !== undefined) parts.push(`step ${p.step}`);
  return parts.length ? parts.join(' ') : '—';
};
const paramRow = (p, i) => [String(i + 1), `\`${p.id}\``, p.label, p.widget, String(p.default),
  p.widget === 'combo' ? p.options.map(o => o.label).join(' / ')
    : p.widget === 'number' ? numberConstraint(p) : '—',
  p.implemented === false ? '**UI-only（implemented:false）**' : '已实现'];
const portRows = def => [
  ...def.ports.inputs.map((pt, i) => [String(i + 1), 'in', `\`${pt.id}\``, pt.label, pt.type]),
  ...def.ports.outputs.map((pt, i) => [String(i + 1), 'out', `\`${pt.id}\``, pt.label, pt.type]),
];

test('表格回比：18 类型 README 端口/参数表 ⇄ dist node.js 源数据', async () => {
  const dirs = readdirSync(NODES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => e.name).sort();
  assert.deepEqual(dirs, [...TYPES].sort(), 'src/nodes 目录集应恰为 18 类型（无缺无孤）');
  assert.deepEqual(readdirSync(NODES_DIR).filter(f => f.endsWith('.md')), ['README.md'],
    'src/nodes 根层只应有总索引 README.md（孤儿 md 即红）');
  for (const type of TYPES) {
    const def = (await import(pathToFileURL(join(SHARED, `dist/nodes/${type}/node.js`)).href)).default;
    assert.equal(def.type, type, `${type} 目录内 node.ts 的 type 字段与目录名不符`);
    const lines = readFileSync(join(NODES_DIR, type, 'README.md'), 'utf8').replace(/\r\n/g, '\n').split('\n');
    assert.ok(lines.includes(`# ${def.identity.name}（\`${type}\`）`), `${type} README 标题漂移`);
    assert.ok(lines.includes(def.identity.description), `${type} README 缺一句话用途行`);
    assert.deepEqual(tableRowsOf(lines, '## 端口'), portRows(def), `${type} 端口表与源数据漂移`);
    assert.deepEqual(tableRowsOf(lines, '## 参数'), def.params.map(paramRow), `${type} 参数表与源数据漂移`);
  }
});

test('总索引 README：恰 18 行且序 = Object.keys(NODES)', () => {
  const lines = readFileSync(join(NODES_DIR, 'README.md'), 'utf8').replace(/\r\n/g, '\n').split('\n');
  const rows = tableRowsOf(lines, '# 节点总索引（NDP v0.2）');
  assert.deepEqual(rows, TYPES.map(t => [`\`${t}\``, `\`nodes/${t}/\``, NODES[t].name, NODES[t].desc]),
    '总索引行集/行序与 NODES 声明序漂移');
});

test('生成器确定性：temp 重生成 19 份产物与在库一致（幂等回比）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'gen-node-readmes-'));
  try {
    const r = spawnSync(process.execPath, [GEN, '--out', tmp], { encoding: 'utf8' });
    assert.equal(r.status, 0, `生成器退出非 0：${r.stderr}`);
    const rels = ['README.md', ...TYPES.map(t => `${t}/README.md`)];
    const drift = [];
    for (const rel of rels) {
      const gen = readFileSync(join(tmp, rel), 'utf8');                          /* 生成器产物：恒 LF */
      const repo = readFileSync(join(NODES_DIR, rel), 'utf8').replace(/\r\n/g, '\n'); /* 在库侧归一 git EOL 策略 */
      if (gen !== repo) drift.push(rel);
      assert.ok(!gen.includes('\r'), `${rel}：生成器产物混入 CR（应恒 LF）`);
      assert.ok(gen.charCodeAt(0) !== 0xFEFF, `${rel}：生成器产物混入 BOM`);
    }
    assert.deepEqual(drift, [], `生成器重跑与在库 README 漂移（首异文件清单）：${drift.join('、')}`);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('回归免疫自检：在库 README 无 BOM（前 3 字节非 EF BB BF）', () => {
  for (const rel of ['README.md', ...TYPES.map(t => `${t}/README.md`)]) {
    const buf = readFileSync(join(NODES_DIR, rel));
    assert.ok(!(buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF), `${rel} 存在 BOM`);
  }
});
