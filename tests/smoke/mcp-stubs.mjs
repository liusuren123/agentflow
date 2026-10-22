/* ================================================================
 *  mcp-stubs.mjs — MCP 未实现工具「如实降级」离线断言组（M01-M11）
 *  迭代 0009 / BK-0005 · SPEC §6：由 smoke-server.mjs 在 P 组之后、
 *  H 组起服务之前挂接（M 组失败计入汇总但不 fail-fast，不影响后续组）。
 *  纯离线：不经 HTTP、不起服务、不依赖模型密钥/外网/sqlite/browser 环境。
 *  行为断言（M02-M07）直连 apps/server/dist/tools.js；M01 是第二道保险
 *  （P02 只查 dist/server.js），缺产物即 FAIL 并给可操作报错，绝不静默
 *  跳过——先例 packages/shared/test/handlers-coverage.test.mjs:22-26。
 *  触点 3/4（SSE/pino 取值路由）离线不可驱动（llmHandler 需真实模型密钥
 *  才进工具循环，llm.ts:15-18 getModel 门槛），由 M08-M11 源锁 src/llm.ts
 *  锁点字符串 + SPEC §9.2 手动 E2E 覆盖——覆盖边界如实声明，不虚报已自动化。
 * ================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deepEqual } from './lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_TOOLS = path.join(REPO_ROOT, 'apps', 'server', 'dist', 'tools.js');
const SRC_LLM = path.join(REPO_ROOT, 'apps', 'server', 'src', 'llm.ts');
const PREFIX = '（未实现）';

/* 冻结基准 = 前端 MCP_SERVERS 注册表（app.js:103-114，宪法冻结面；SPEC §6.2 M02）。
 * impl 标志 = 后端 IMPL 现状分类（sqlite/browser 未接入）；M07 会把该分类与
 * dist 实际行为三向交叉核对（IMPL null ⟺ desc 前缀 ⟺ stub）。BK-0008 真实
 * 接入 sqlite 时 M03/M05/M06 的冻结分类须随摘标记同步更新（有意防无声漂移）。 */
const FROZEN = [
  { server: 'filesystem', tools: ['read_file', 'write_file', 'list_directory'], impl: true },
  { server: 'fetch', tools: ['fetch', 'download'], impl: true },
  { server: 'sqlite', tools: ['query', 'execute'], impl: false },
  { server: 'browser', tools: ['navigate', 'click', 'screenshot'], impl: false },
  { server: 'web-search', tools: ['search', 'news'], impl: true },
];
const UNIMPL = FROZEN.filter((g) => !g.impl).flatMap((g) => g.tools.map((t) => [g.server, t]));
const IMPLD = FROZEN.filter((g) => g.impl).flatMap((g) => g.tools.map((t) => [g.server, t]));

export async function runMcpChecks(C) {
  /* M01 · dist/tools.js 在位（M02-M07 行为断言前提；可操作报错，不静默跳过） */
  const m01 = C.check(existsSync(DIST_TOOLS), 'M01', 'apps/server/dist/tools.js 在位（M02-M07 行为断言前提）',
    { expected: '存在', actual: existsSync(DIST_TOOLS) ? '存在' : '缺失（请先在仓库根执行 npm run build:server）', ctx: `file: ${DIST_TOOLS}` });

  let T = null;
  let loadErr = null;
  if (m01) {
    try { T = await import(pathToFileURL(DIST_TOOLS).href); } catch (e) { loadErr = e; }
  }
  if (T) {
    /* M02 · 键集恰为冻结面：TOOL_SPECS 12 键 + IMPL 5 服务器（键漂移即红） */
    const specKeys = Object.keys(T.TOOL_SPECS).sort();
    const implKeys = Object.keys(T.IMPL).sort();
    const wantSpec = FROZEN.flatMap((g) => g.tools.map((t) => `${g.server}.${t}`)).sort();
    const wantImpl = FROZEN.map((g) => g.server).sort();
    C.check(JSON.stringify(specKeys) === JSON.stringify(wantSpec) && JSON.stringify(implKeys) === JSON.stringify(wantImpl),
      'M02', 'TOOL_SPECS 键集恰为冻结 12 键 且 IMPL 键集恰为 5 服务器（基准=前端 MCP_SERVERS 注册表）',
      { expected: `TOOL_SPECS=[${wantSpec.join(',')}] IMPL=[${wantImpl.join(',')}]`,
        actual: `TOOL_SPECS=[${specKeys.join(',')}] IMPL=[${implKeys.join(',')}]`, ctx: 'dist/tools.js 导出面' });

    /* M03 · 五未实现项 desc 均以「（未实现）」开头（逐工具命名；摘标记→红） */
    const noPrefix = UNIMPL
      .filter(([s, t]) => !String(T.TOOL_SPECS[`${s}.${t}`]?.desc ?? '').startsWith(PREFIX))
      .map(([s, t]) => `${s}.${t}`);
    C.check(noPrefix.length === 0, 'M03', `五未实现项 desc 均以「${PREFIX}」开头（${UNIMPL.map(([s, t]) => `${s}.${t}`).join('/')}）`,
      { expected: '5/5 含前缀', actual: noPrefix.length === 0 ? '5/5 含前缀' : `缺前缀：${noPrefix.join(', ')}`, ctx: 'dist/tools.js TOOL_SPECS' });

    /* M04 · 七已实现项 desc 均不含「（未实现）」（逐工具命名；误加标记→红） */
    const withPrefix = IMPLD
      .filter(([s, t]) => String(T.TOOL_SPECS[`${s}.${t}`]?.desc ?? '').includes(PREFIX))
      .map(([s, t]) => `${s}.${t}`);
    C.check(withPrefix.length === 0, 'M04', `七已实现项 desc 均不含「${PREFIX}」（${IMPLD.map(([s, t]) => `${s}.${t}`).join('/')}）`,
      { expected: '7/7 无前缀', actual: withPrefix.length === 0 ? '7/7 无前缀' : `含前缀：${withPrefix.join(', ')}`, ctx: 'dist/tools.js TOOL_SPECS' });

    /* M05 · 五未实现项均挂 stub 且直调返回如实载荷（stub 换伪造成功载荷→红） */
    const selU = {};
    for (const [s, t] of UNIMPL) { selU[s] = selU[s] || []; selU[s].push(t); }
    const gotU = T.collectTools(selU);
    const badPayload = [];
    for (const [s, t] of UNIMPL) {
      const k = `${s}.${t}`;
      const f = gotU.get(k);
      if (typeof f !== 'function' || !T.isStubImpl(f)) { badPayload.push(`${k}: 非 stub（isStubImpl=${f ? T.isStubImpl(f) : '缺失'}）`); continue; }
      const r = await f({});
      const want = { error: 'not implemented', note: `工具 ${k} 未接入真实实现` };
      if (!deepEqual(r, want)) badPayload.push(`${k}: ${JSON.stringify(r)}`);
    }
    C.check(badPayload.length === 0, 'M05', 'collectTools 五未实现项均挂 stub，直调返回 {error:"not implemented",note:"工具 <s>.<t> 未接入真实实现"}（逐工具 deepEqual）',
      { expected: '5/5 如实载荷', actual: badPayload.length === 0 ? '5/5 如实载荷' : badPayload.join(' | '),
        ctx: 'collectTools({sqlite:[query,execute],browser:[navigate,click,screenshot]}) 离线直调' });

    /* M06 · 七已实现项均为真实函数且非 stub（已实现项误挂 stub→红；不直调避免触沙箱/网络） */
    const selI = {};
    for (const [s, t] of IMPLD) { selI[s] = selI[s] || []; selI[s].push(t); }
    const gotI = T.collectTools(selI);
    const badReal = IMPLD
      .filter(([s, t]) => { const f = gotI.get(`${s}.${t}`); return typeof f !== 'function' || T.isStubImpl(f); })
      .map(([s, t]) => `${s}.${t}`);
    C.check(badReal.length === 0, 'M06', 'collectTools 七已实现项均为真实函数且 isStubImpl===false（filesystem/fetch/web-search 全组）',
      { expected: '7/7 真实函数', actual: badReal.length === 0 ? '7/7 真实函数' : `异常：${badReal.join(', ')}`,
        ctx: 'collectTools({filesystem,fetch,web-search}) 离线直查' });

    /* M07 · 三向配对自愈（逐服务器组；BK-0008 摘除路径守护：真接入→强制摘标记删 stub） */
    const drift = [];
    for (const g of FROZEN) {
      const nullFlag = T.IMPL[g.server] === null;
      const allPrefixed = g.tools.every((t) => String(T.TOOL_SPECS[`${g.server}.${t}`]?.desc ?? '').startsWith(PREFIX));
      const got = T.collectTools({ [g.server]: g.tools });
      const allStub = g.tools.every((t) => T.isStubImpl(got.get(`${g.server}.${t}`)));
      if (!(nullFlag === allPrefixed && nullFlag === allStub))
        drift.push(`${g.server}: IMPL null=${nullFlag} / 全组desc前缀=${allPrefixed} / 全组stub=${allStub}`);
    }
    C.check(drift.length === 0, 'M07', '三向配对自愈（逐服务器组）：IMPL[srv]===null ⟺ 全组 desc 含前缀 ⟺ collectTools 全组挂 stub（任一向漂移→红）',
      { expected: '5/5 组三向一致', actual: drift.length === 0 ? '5/5 组三向一致' : drift.join(' | '),
        ctx: 'dist/tools.js IMPL×TOOL_SPECS×collectTools 交叉核对' });
  } else {
    /* M01 FAIL 或 dist 导入异常：M02-M07 逐条记 FAIL（绝不静默跳过） */
    for (const id of ['M02', 'M03', 'M04', 'M05', 'M06', 'M07'])
      C.fail(id, '（dist/tools.js 不可用，本条无法执行——见 M01）',
        { expected: 'dist/tools.js 导入成功', actual: loadErr ? `导入异常：${loadErr?.message ?? loadErr}` : 'M01 已 FAIL（产物缺失）', ctx: `file: ${DIST_TOOLS}` });
  }

  /* M08-M11 · 源锁 llm.ts 触点 3/4 取值路由（锁语义行而非全文件哈希，SPEC §10.3） */
  let src = '';
  let srcErr = null;
  try { src = readFileSync(SRC_LLM, 'utf8'); } catch (e) { srcErr = e; }
  const LOCKS = [
    ['M08', /lvl:\s*stub\s*\?\s*'warn'\s*:\s*'sys'/, 'SSE 日志 lvl 路由（stub=warn / 真实=sys）'],
    ['M09', /ctx\.log\[stub\s*\?\s*'warn'\s*:\s*'info'\]/, 'pino 日志级别路由（stub=warn / 真实=info）'],
    ['M10', /const\s+bound\s*=\s*stub\s*\?\s*200\s*:\s*60/, 'preview 截断边界（stub=200 / 真实=60，如实 note 不截断）'],
    ['M11', /stubCount\s*\?\s*`（\$\{stubCount\}\s*未接入）`\s*:\s*''/, '✓ 摘要「（N 未接入）」分项'],
  ];
  for (const [id, re, name] of LOCKS)
    C.check(srcErr === null && re.test(src), id, `源锁 llm.ts：${name}`,
      { expected: '命中锁点', actual: srcErr ? `llm.ts 不可读：${srcErr?.message ?? srcErr}` : '未命中（锁点被改动/移除，无声回退即红）', ctx: 'file: apps/server/src/llm.ts' });
}
