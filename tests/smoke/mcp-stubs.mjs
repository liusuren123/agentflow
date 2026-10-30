/* ================================================================
 *  mcp-stubs.mjs — MCP 未实现工具「如实降级」离线断言组（M01-M17）
 *  迭代 0009 / BK-0005 · SPEC §6：由 smoke-server.mjs 在 P 组之后、
 *  H 组起服务之前挂接（M 组失败计入汇总但不 fail-fast，不影响后续组）。
 *  纯离线：不经 HTTP、不起服务、不依赖模型密钥/外网/browser 环境；sqlite
 *  组经 better-sqlite3 进程内直驱沙箱专用库（迭代 0026 起为真实行为断言，
 *  仅触 gitignored 沙箱目录）。
 *  行为断言（M02-M07、M12-M17）直连 apps/server/dist/tools.js；M01 是第二道保险
 *  （P02 只查 dist/server.js），缺产物即 FAIL 并给可操作报错，绝不静默
 *  跳过——先例 packages/shared/test/handlers-coverage.test.mjs:22-26。
 *  触点 3/4（SSE/pino 取值路由）离线不可驱动（llmHandler 需真实模型密钥
 *  才进工具循环，llm.ts:15-18 getModel 门槛），由 M08-M11 源锁 src/llm.ts
 *  锁点字符串 + SPEC §9.2 手动 E2E 覆盖——覆盖边界如实声明，不虚报已自动化。
 * ================================================================ */
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deepEqual } from './lib.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST_TOOLS = path.join(REPO_ROOT, 'apps', 'server', 'dist', 'tools.js');
const SRC_LLM = path.join(REPO_ROOT, 'apps', 'server', 'src', 'llm.ts');
const PREFIX = '（未实现）';

/* 冻结基准 = 前端 MCP_SERVERS 注册表（app.js:103-114，宪法冻结面；SPEC §6.2 M02）。
 * impl 标志 = 后端 IMPL 现状分类（browser 未接入；sqlite 已于迭代 0026 真实
 * 接入，M12-M17 行为断言在案）；M07 会把该分类与 dist 实际行为三向交叉核对
 * （IMPL null ⟺ desc 前缀 ⟺ stub）。未来任何 stub↔real 翻转仍须三处同步
 * （IMPL/前缀/断言口径）。 */
const FROZEN = [
  { server: 'filesystem', tools: ['read_file', 'write_file', 'list_directory'], impl: true },
  { server: 'fetch', tools: ['fetch', 'download'], impl: true },
  { server: 'sqlite', tools: ['query', 'execute'], impl: true },
  { server: 'browser', tools: ['navigate', 'click', 'screenshot'], impl: false },
  { server: 'web-search', tools: ['search', 'news'], impl: true },
];
const UNIMPL = FROZEN.filter((g) => !g.impl).flatMap((g) => g.tools.map((t) => [g.server, t]));
const IMPLD = FROZEN.filter((g) => g.impl).flatMap((g) => g.tools.map((t) => [g.server, t]));

export async function runMcpChecks(C) {
  /* M01 · dist/tools.js 在位（M02-M07 行为断言前提；可操作报错，不静默跳过） */
  const m01 = C.check(existsSync(DIST_TOOLS), 'M01', 'apps/server/dist/tools.js 在位（M02-M07、M12-M17 行为断言前提）',
    { expected: '存在', actual: existsSync(DIST_TOOLS) ? '存在' : '缺失（请先在仓库根执行 npm run build:server）', ctx: `file: ${DIST_TOOLS}` });

  let T = null;
  let loadErr = null;
  if (m01) {
    try { T = await import(pathToFileURL(DIST_TOOLS).href); } catch (e) { loadErr = e; }
  }
  if (T) {
    /* M02 · 键集恰为冻结面（BUG-0068-01 扩容口径）：TOOL_SPECS 点前缀键恰为
     * 冻结 12 键（基准=前端 MCP_SERVERS 注册表）+ plain key 白名单恰三条
     * （BK-0018 / ADR-0024 §2.1：memory_get/set/list 无点前缀——capabilities
     * `${id}.` 派生零命中与 tools.ts IMPL 豁免的结构前提，两白名单外漂移即红）
     * + IMPL 5 服务器（键漂移即红；memory 三工具绝不入 IMPL）。 */
    const specKeys = Object.keys(T.TOOL_SPECS).sort();
    const implKeys = Object.keys(T.IMPL).sort();
    const wantSpec = FROZEN.flatMap((g) => g.tools.map((t) => `${g.server}.${t}`)).sort();
    const wantImpl = FROZEN.map((g) => g.server).sort();
    const PLAIN_ALLOW = ['memory_get', 'memory_list', 'memory_set'];
    const dottedKeys = specKeys.filter((k) => k.includes('.'));
    const plainKeys = specKeys.filter((k) => !k.includes('.'));
    C.check(JSON.stringify(dottedKeys) === JSON.stringify(wantSpec)
      && JSON.stringify(plainKeys) === JSON.stringify(PLAIN_ALLOW)
      && JSON.stringify(implKeys) === JSON.stringify(wantImpl),
      'M02', 'TOOL_SPECS 点前缀键集恰为冻结 12 键 且 plain key 恰 memory_* 白名单三条（无点前缀=capabilities 派生零命中与 IMPL 豁免的结构前提）且 IMPL 键集恰为 5 服务器（基准=前端 MCP_SERVERS 注册表 + ADR-0024 §2.1）',
      { expected: `TOOL_SPECS 点前缀=[${wantSpec.join(',')}] + plain=[${PLAIN_ALLOW.join(',')}] IMPL=[${wantImpl.join(',')}]`,
        actual: `TOOL_SPECS 点前缀=[${dottedKeys.join(',')}] + plain=[${plainKeys.join(',')}] IMPL=[${implKeys.join(',')}]`, ctx: 'dist/tools.js 导出面' });

    /* M03 · 三未实现项 desc 均以「（未实现）」开头（逐工具命名；摘标记→红） */
    const noPrefix = UNIMPL
      .filter(([s, t]) => !String(T.TOOL_SPECS[`${s}.${t}`]?.desc ?? '').startsWith(PREFIX))
      .map(([s, t]) => `${s}.${t}`);
    C.check(noPrefix.length === 0, 'M03', `三未实现项 desc 均以「${PREFIX}」开头（${UNIMPL.map(([s, t]) => `${s}.${t}`).join('/')}）`,
      { expected: '3/3 含前缀', actual: noPrefix.length === 0 ? '3/3 含前缀' : `缺前缀：${noPrefix.join(', ')}`, ctx: 'dist/tools.js TOOL_SPECS' });

    /* M04 · 九已实现项 desc 均不含「（未实现）」（逐工具命名；误加标记→红） */
    const withPrefix = IMPLD
      .filter(([s, t]) => String(T.TOOL_SPECS[`${s}.${t}`]?.desc ?? '').includes(PREFIX))
      .map(([s, t]) => `${s}.${t}`);
    C.check(withPrefix.length === 0, 'M04', `九已实现项 desc 均不含「${PREFIX}」（${IMPLD.map(([s, t]) => `${s}.${t}`).join('/')}；含 sqlite.query/execute）`,
      { expected: '9/9 无前缀', actual: withPrefix.length === 0 ? '9/9 无前缀' : `含前缀：${withPrefix.join(', ')}`, ctx: 'dist/tools.js TOOL_SPECS' });

    /* M05 · 三未实现项均挂 stub 且直调返回如实载荷（stub 换伪造成功载荷→红） */
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
    C.check(badPayload.length === 0, 'M05', 'collectTools 三未实现项均挂 stub，直调返回 {error:"not implemented",note:"工具 <s>.<t> 未接入真实实现"}（逐工具 deepEqual）',
      { expected: '3/3 如实载荷', actual: badPayload.length === 0 ? '3/3 如实载荷' : badPayload.join(' | '),
        ctx: 'collectTools({browser:[navigate,click,screenshot]}) 离线直调' });

    /* M06 · 九已实现项均为真实函数且非 stub（误挂 stub→红；本条仅类型面检查，
     * 不直调避免触沙箱/网络——sqlite 行为面收敛到 M12-M17，SPEC §4.1 边界） */
    const selI = {};
    for (const [s, t] of IMPLD) { selI[s] = selI[s] || []; selI[s].push(t); }
    const gotI = T.collectTools(selI);
    const badReal = IMPLD
      .filter(([s, t]) => { const f = gotI.get(`${s}.${t}`); return typeof f !== 'function' || T.isStubImpl(f); })
      .map(([s, t]) => `${s}.${t}`);
    C.check(badReal.length === 0, 'M06', 'collectTools 九已实现项均为真实函数且 isStubImpl===false（filesystem/fetch/sqlite/web-search 全组；sqlite 仅类型面，行为面归 M12-M17）',
      { expected: '9/9 真实函数', actual: badReal.length === 0 ? '9/9 真实函数' : `异常：${badReal.join(', ')}`,
        ctx: 'collectTools({filesystem,fetch,sqlite,web-search}) 离线直查' });

    /* M07 · 三向配对自愈（逐服务器组；已执行轮——0026 sqlite 翻真落地；断言语义
     * 不变：任一组三向漂移即红，防未来 stub↔real 翻转漏同步） */
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

    /* M12-M17 · sqlite 真实行为断言（迭代 0026 / BK-0008 · SPEC §4.2；全部经
     * collectTools 通道离线直驱 better-sqlite3 沙箱专用库）。夹具：测试表
     * mcp_smoke_t 全程唯一、结束即清；越界探针语句在 assertSql 黑名单处即被拒，
     * 从不真正执行（SPEC §3.7——探针路径为测试自建常量，非外部输入）。 */
    const sqTools = T.collectTools({ sqlite: ['query', 'execute'] });
    const sqlExec = sqTools.get('sqlite.execute');
    const sqlQuery = sqTools.get('sqlite.query');
    const toFwd = (p) => p.replaceAll('\\', '/');   /* Windows 路径写入 SQL 统一正斜杠（实证 #1 同款） */
    const ESCAPE_PROBE = toFwd(path.join(REPO_ROOT, 'mcp-escape-probe.db'));
    const VACUUM_PROBE = toFwd(path.join(REPO_ROOT, 'mcp-vacuum-probe.db'));
    const TMP_DIR = toFwd(tmpdir());
    const MAIN_DB = path.join(REPO_ROOT, 'data', 'agentflow.db');
    rmSync(ESCAPE_PROBE, { force: true });   /* 卫生预清：防历史残留误红（SPEC §4.2 前置夹具） */
    rmSync(VACUUM_PROBE, { force: true });
    const mainDbBefore = existsSync(MAIN_DB);   /* M17② 对照快照（CI fresh clone 预期 false） */

    /* M12 · execute 多语句（幂等 DROP+建表+2 插入）：载荷恰 {changes:2,lastInsertRowid:2} */
    const r12 = await sqlExec({ sql: "DROP TABLE IF EXISTS mcp_smoke_t; CREATE TABLE mcp_smoke_t(id INTEGER PRIMARY KEY, name TEXT); INSERT INTO mcp_smoke_t(id,name) VALUES(1,'alice'); INSERT INTO mcp_smoke_t(id,name) VALUES(2,'bob');" });
    C.check(deepEqual(r12, { changes: 2, lastInsertRowid: 2 }) && !JSON.stringify(r12).includes('not implemented'),
      'M12', 'sqlite.execute 多语句（建表+2 插入）载荷 deepEqual {changes:2,lastInsertRowid:2} 且无 not implemented（DROP 幂等前置不计 changes）',
      { expected: '{"changes":2,"lastInsertRowid":2}', actual: JSON.stringify(r12), ctx: 'collectTools({sqlite:[query,execute]}) 离线直驱 apps/server/sandbox/mcp-sqlite.db' });

    /* M13 · query 往返与整数列文本化（实证 #11：JS number → String） */
    const r13 = await sqlQuery({ sql: 'SELECT id,name FROM mcp_smoke_t ORDER BY id' });
    C.check(deepEqual(r13, { rows: [{ id: '1', name: 'alice' }, { id: '2', name: 'bob' }], truncated: false }),
      'M13', 'sqlite.query 往返：整数列文本化（id 1→"1"）且 {rows:[alice,bob],truncated:false}',
      { expected: '{"rows":[{"id":"1","name":"alice"},{"id":"2","name":"bob"}],"truncated":false}', actual: JSON.stringify(r13), ctx: '同 M12 通道' });

    /* M14 · 限幅：105 行 CTE 插入 → 全表 100 行截断；600 字符单元格 → 512+'…'
     * （CTE 计数 x=1..105 但 id 落 2001..2105 段：避开 M12 的 1/2 与后续 999/1000，
     * name 仍为 n1..n105 供 M16 定命 DELETE） */
    const r14a = await sqlExec({ sql: "WITH RECURSIVE cnt(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM cnt WHERE x<105) INSERT INTO mcp_smoke_t(id,name) SELECT x+2000,'n'||x FROM cnt" });
    const r14b = await sqlQuery({ sql: 'SELECT id FROM mcp_smoke_t' });
    await sqlExec({ sql: `INSERT INTO mcp_smoke_t(id,name) VALUES(1000,'${'x'.repeat(600)}')` });
    const r14d = await sqlQuery({ sql: 'SELECT name FROM mcp_smoke_t WHERE id=1000' });
    C.check(r14a?.changes === 105 && r14b?.rows?.length === 100 && r14b?.truncated === true
      && r14d?.rows?.[0]?.name === 'x'.repeat(512) + '…',
      'M14', '限幅：CTE 插入 105 行 changes=105（顺带验计数）；query 全表 rows.length=100 且 truncated=true；600 字符单元格截断为 512+"…"',
      { expected: 'changes=105 / rows=100,truncated=true / cell=512+"…"', actual: `changes=${r14a?.changes} / rows=${r14b?.rows?.length},truncated=${r14b?.truncated} / cell=${r14d?.rows?.[0]?.name?.length}字符`, ctx: 'MAX_ROWS=100 / MAX_CELL=512（dist/tools.js）' });

    /* M15 · 越界拒绝矩阵（a-f 逐条 throw 且消息含「沙箱」、绝不返回成功载荷；
     * g 反例护栏——连写词 vacuum_log 不误伤，钉住 \b 词边界语义防黑名单误扩） */
    const denials = [];
    const expectDeny = async (label, fn) => {
      try { const r = await fn(); denials.push(`${label}: 未拒绝，返回 ${JSON.stringify(r)}`); }
      catch (e) { const msg = String(e?.message ?? e); if (!msg.includes('沙箱')) denials.push(`${label}: throw 但消息缺「沙箱」:${msg}`); }
    };
    await expectDeny('a ATTACH 绝对路径', () => sqlExec({ sql: `ATTACH '${ESCAPE_PROBE}' AS probe` }));
    await expectDeny('b ATTACH 主库相对路径', () => sqlQuery({ sql: "ATTACH 'data/agentflow.db' AS main2" }));
    await expectDeny('c 注释引导+小写 attach', () => sqlExec({ sql: "-- 备忘\nattach 'probe2.db' as p2" }));
    await expectDeny('d VACUUM INTO 沙箱外', () => sqlExec({ sql: `VACUUM INTO '${VACUUM_PROBE}'` }));
    await expectDeny('e PRAGMA temp_store_directory', () => sqlQuery({ sql: `PRAGMA temp_store_directory='${TMP_DIR}'` }));
    await expectDeny('f load_extension 调用面', () => sqlQuery({ sql: "SELECT load_extension('x')" }));
    const r15g = await sqlExec({ sql: "INSERT INTO mcp_smoke_t(id,name) VALUES(999,'vacuum_log 备忘')" });
    C.check(denials.length === 0 && deepEqual(r15g, { changes: 1, lastInsertRowid: 999 }),
      'M15', '越界七探针：a ATTACH 绝对路径 / b ATTACH 主库 / c 注释+小写 attach / d VACUUM INTO / e PRAGMA temp_store_directory / f load_extension 逐条 throw 且消息含「沙箱」；g 反例 vacuum_log 连写词成功（词边界不误伤）',
      { expected: '6/6 拒绝（消息含沙箱）+ g {changes:1,lastInsertRowid:999}', actual: denials.length === 0 ? `6/6 拒绝；g=${JSON.stringify(r15g)}` : denials.join(' | '), ctx: 'assertSql 黑名单（dist/tools.js SQL_DENY / SQL_DENY_FN）' });

    /* M16 · 计数如实（WHERE 定命，与执行序无关） */
    const r16a = await sqlExec({ sql: "UPDATE mcp_smoke_t SET name='updated' WHERE id=1" });
    const r16b = await sqlExec({ sql: "UPDATE mcp_smoke_t SET name='miss' WHERE id=99999" });
    const r16c = await sqlExec({ sql: "DELETE FROM mcp_smoke_t WHERE name='n7'" });
    C.check(r16a?.changes === 1 && r16b?.changes === 0 && r16c?.changes === 1,
      'M16', '计数如实：UPDATE 命中=1 / 未命中=0 / DELETE 定命=1（total_changes 前后差值）',
      { expected: '1 / 0 / 1', actual: `${r16a?.changes} / ${r16b?.changes} / ${r16c?.changes}`, ctx: 'SELECT total_changes() 差值计数（dist/tools.js execute）' });

    /* M17 · 副产与自清：① 探针文件不存在（黑名单先于执行）② 主库存在性与段首
     * 快照一致（离线轮不得创建/触碰主库）③ DROP 后 sqlite_master 无 mcp_smoke%
     * 表 ④ 探针卫生兜底（成败皆清）。 */
    await sqlExec({ sql: 'DROP TABLE IF EXISTS mcp_smoke_t' });
    const r17c = await sqlQuery({ sql: "SELECT count(*) AS c FROM sqlite_master WHERE type='table' AND name LIKE 'mcp_smoke%'" });
    const noProbeFiles = !existsSync(ESCAPE_PROBE) && !existsSync(VACUUM_PROBE);
    const mainDbStable = existsSync(MAIN_DB) === mainDbBefore;
    rmSync(ESCAPE_PROBE, { force: true });   /* 卫生兜底：成败皆清（SPEC §4.2 ④） */
    rmSync(VACUUM_PROBE, { force: true });
    C.check(deepEqual(r17c, { rows: [{ c: '0' }], truncated: false }) && noProbeFiles && mainDbStable,
      'M17', '副产与自清：越界探针文件不存在 + data/agentflow.db 存在性与快照一致 + DROP 后 sqlite_master 计数 {rows:[{c:"0"}],truncated:false} + 探针清理',
      { expected: '无探针文件 / 主库不变 / {rows:[{c:"0"}],truncated:false}', actual: `探针${noProbeFiles ? '不存在' : '存在'} / 主库${mainDbStable ? '一致' : '漂移'} / ${JSON.stringify(r17c)}`, ctx: `仓库根探针 ×2 + ${MAIN_DB} + apps/server/sandbox/mcp-sqlite.db` });
  } else {
    /* M01 FAIL 或 dist 导入异常：M02-M07、M12-M17 逐条记 FAIL（绝不静默跳过） */
    for (const id of ['M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M12', 'M13', 'M14', 'M15', 'M16', 'M17'])
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
