#!/usr/bin/env node
/* ================================================================
 *  gen-node-readmes.mjs — 节点 README 生成器（NDP §8；迭代 0022 / BK-0021 批次 2）
 *  数据源 = packages/shared/dist（dist 即 node.ts 的 tsc 逐字编译产物，
 *  与运行时同源、零 TS 源文本解析）；键序唯一取自 dist/index.js 的
 *  Object.keys(NODES)（= 声明序，免疫目录枚举顺序差异）。前置：
 *  npm run build:shared（先构建后生成）。
 *  调用：node tools/gen-node-readmes.mjs [--out <dir>]——缺省写
 *  packages/shared/src/nodes/；根 package.json 零改动（不变式 D，
 *  不新增 npm script，直呼本文件）。
 *  幂等：顺序唯一来自 NODES 键序 + 固定模板 + LF + 末尾恰一换行；
 *  只写内容有变化的文件。人工文案（现状备注）单一持有于本文件
 *  MANUAL_NOTES 常量——手改生成物会被重跑覆盖且 readme-consistency
 *  测试红（NDP §8「禁止手写漂移」；SPEC §12-② 定稿）。
 * ================================================================ */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'packages/shared/dist');
const outDir = process.argv.includes('--out')
  ? resolve(process.argv[process.argv.indexOf('--out') + 1])
  : join(ROOT, 'packages/shared/src/nodes');

/* ---------------- 固定护栏文案（NDP §7.2 表镜像；SPEC §5.2） ---------------- */
const KIND_ORDER = ['llm', 'exec', 'net', 'fs', 'human', 'data', 'mcp', 'skills', 'agent', 'ingress'];
const KIND_GUARDRAILS = {
  llm: '温度/token 上限由参数约束；密钥只进环境变量',
  exec: 'mode:sandboxed——必须子进程 + 超时强杀；文件操作限沙箱根',
  net: 'mode:guarded——出站必须走 guard.ts（SSRF 守卫）',
  fs: '限沙箱根 apps/server/sandbox/，路径穿越防护',
  human: '挂起-恢复语义（approval:required + /run/:id/approve）',
  data: '无 IO（纯数据变换）',
  mcp: '扩展预留（caps 复现条件：caps 含 mcp）',
  skills: '扩展预留（caps 复现条件：caps 含 skill 单数）',
  agent: 'goal 会话形态（sessionMode:goal，BK-0033/0034 承载）',
  ingress: '扩展预留（入站触发，与出站 net 区分）',
};

/* -------- 现状备注：人工撰写、生成器持有、readme-consistency 测试守护（SPEC §5.3 事实锚点） -------- */
const MANUAL_NOTES = {
  trigger: 'mode/cron/path 三参数 UI-only：handler 零参签名、out 硬编码「手动触发」（handlers.ts trigger）；定时/Webhook 触发后端未接入。',
  userinput: 'vtype/req UI-only：handler 只读 var/defv（handlers.ts userinput）。',
  llm: 'model options 运行期被 /api/health 返回的 provider.models 覆写（runtimeOverridable:true；「UI 显示值===实际存值」不变量现状未完整履行，NDP §6.3 实现缺陷单独立项）。',
  prompt: '纯模板渲染：render(tpl, {...vars, input})，无 IO（handlers.ts prompt）。',
  retrieval: '本地 TF-IDF 检索、无出站网络；原始分 ×4 归一化后按相似度阈值过滤（handlers.ts retrieval）。',
  websearch: 'Bing/Google 未接真实 API——按回退链 博查→DuckDuckGo 执行并 warn；博查/SearXNG 严格路由，未配置/失败如实跳过、绝不静默换引擎（迭代 0005/BK-0007）。',
  http: '出站走 guardedFetch SSRF 守卫（handlers.ts http；guard.ts 拦私网/回环）。',
  code: '子进程 + 超时强杀（runUserCode）；JS 默认样例错配兜底（BUG-0012）；sqlite/browser MCP 工具 stub 如实降级（tools.ts:5/:82，BK-0008 在案）。',
  notify: '仅 Webhook 渠道实接（guardedFetch）；邮件/短信/企业微信未接入真实发送（handlers.ts notify）。',
  condition: 'cond 事件唯一发射点：engine 按 n.type===condition 求值 p.expr（engine.ts:128）。',
  loop: '并发批大小固定 3（CONC）；maxIter 引擎侧 clamp 1–100（handlers.ts loop）。',
  delay: '等待秒数引擎侧 clamp 0.1–60（handlers.ts delay）。',
  merge: '多入边取值语义=首条非 undefined（engine.ts:92-93 已知债务）；「任一到达」取首条非 null。',
  reply: '终点节点：emit(\'output\') + ctx.outputs 汇入运行产物（handlers.ts reply）。',
  termview: '只读呈现 sink：emit(\'output\') + ctx.outputs 汇入（handlers.ts termview）；lines/autoscroll 为前端呈现参数（服务端零参与，僵尸登记在案）；无用户输入面（PTY 切割，ADR-0015 §4.4）。',
  setvar: '纯数据：将输入写入运行级变量表 vars[name]（handlers.ts setvar）。',
  approval: '人工挂起 10 分钟超时自动通过；智能体互审 role=node:<id>（迭代 0016/BK-0017），裁决失败按超时策略降级、挂起策略回退人工；审计落 store。',
  agent: 'goal 模式智能体：maxSteps 步数预算工具循环（v1 无 token 硬顶）；每次执行绑定一个持久会话（out-session={sessionId}，goal 面板 BK-0034 消费）；模型未配置/异常如实失败不降级。',
};

/* ---------------- 单元格转义与列构造（SPEC §5.2 规则） ---------------- */
const esc = v => String(v).replaceAll('|', '\\|').replaceAll('\n', '\\n');
const numberConstraint = p => {
  const parts = [];
  if (p.min !== undefined || p.max !== undefined) parts.push(`[${p.min ?? ''}–${p.max ?? ''}]`);
  if (p.step !== undefined) parts.push(`step ${p.step}`);
  return parts.length ? parts.join(' ') : '—';
};
const constraintOf = p => p.widget === 'combo' ? p.options.map(o => o.label).join(' / ')
  : p.widget === 'number' ? numberConstraint(p) : '—';
const statusOf = p => p.implemented === false ? '**UI-only（implemented:false）**' : '已实现';

/* ---------------- 每节点 README（NDP §8 五段结构） ---------------- */
function nodeReadme(def) {
  const L = ['<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；人工文案持有于生成器 MANUAL_NOTES，重跑覆盖 -->', ''];
  L.push(`# ${def.identity.name}（\`${def.type}\`）`, '', def.identity.description, '');
  L.push('## 端口', '', '| # | 方向 | id | 名称 | 类型 |', '| --- | --- | --- | --- | --- |');
  def.ports.inputs.forEach((pt, i) => L.push(`| ${i + 1} | in | \`${pt.id}\` | ${pt.label} | ${pt.type} |`));
  def.ports.outputs.forEach((pt, i) => L.push(`| ${i + 1} | out | \`${pt.id}\` | ${pt.label} | ${pt.type} |`));
  if ([...def.ports.inputs, ...def.ports.outputs].some(pt => pt.type === 'any'))
    L.push('', '> any=透传通配（迁移保持现行类型，NDP §5.1）。');
  L.push('', '## 参数', '',
    '| # | id | 名称 | 控件 | 默认值 | 约束/选项 | 状态 |',
    '| --- | --- | --- | --- | --- | --- | --- |');
  def.params.forEach((p, i) =>
    L.push(`| ${i + 1} | \`${p.id}\` | ${p.label} | ${p.widget} | ${esc(p.default)} | ${constraintOf(p)} | ${statusOf(p)} |`));
  L.push('', '## 能力与护栏', '');
  const caps = Object.entries(def.binding.capabilities)
    .filter(([k]) => KIND_ORDER.includes(k))
    .sort((a, b) => KIND_ORDER.indexOf(a[0]) - KIND_ORDER.indexOf(b[0]));
  if (!caps.length) L.push('本节点无能力声明（handler 无任何 IO；capabilities 为空对象）。');
  else {
    L.push('| kind | 声明值 | 护栏（NDP §7.2） |', '| --- | --- | --- |');
    for (const [kind, val] of caps) L.push(`| ${kind} | \`${JSON.stringify(val)}\` | ${KIND_GUARDRAILS[kind]} |`);
  }
  L.push('', '## 现状备注', '', `- ${MANUAL_NOTES[def.type]}`);
  return L.join('\n') + '\n';
}

/* ---------------- 总索引 README（NDP §3「类型 → 目录 → 一句话用途」） ---------------- */
function indexReadme(types, defs) {
  const L = ['<!-- 生成物：tools/gen-node-readmes.mjs 生成，勿手改；重跑命令见下 -->', '',
    '# 节点总索引（NDP v0.2）', '',
    '18 种节点定义一节点一目录（`node.ts` 纯数据模块 + `README.md` 生成文档，NDP §3）。',
    '生成器：仓库根执行 `npm run build:shared && node tools/gen-node-readmes.mjs`（幂等；**生成物勿手改**——人工文案持有于生成器 MANUAL_NOTES）。', '',
    '| type | 目录 | 名称 | 一句话用途 |', '| --- | --- | --- | --- |'];
  for (const t of types) L.push(`| \`${t}\` | \`nodes/${t}/\` | ${defs[t].identity.name} | ${defs[t].identity.description} |`);
  return L.join('\n') + '\n';
}

/* ---------------- 主流程（读 dist → 生成 → 只写有变化文件） ---------------- */
const { NODES } = await import(pathToFileURL(join(DIST, 'index.js')).href);
const types = Object.keys(NODES); /* 声明序唯一来源 */
if (types.length !== 18) throw new Error(`dist/index.js NODES 键数 ${types.length} ≠ 18（先 npm run build:shared？）`);
const defs = {};
for (const t of types) {
  defs[t] = (await import(pathToFileURL(join(DIST, 'nodes', t, 'node.js')).href)).default;
  if (defs[t].type !== t) throw new Error(`dist/nodes/${t}/node.js type 字段「${defs[t].type}」与目录名不符`);
}
let written = 0, unchanged = 0;
const emit = (rel, content) => {
  const file = join(outDir, rel);
  let prev = null;
  try { prev = readFileSync(file, 'utf8'); } catch { /* 新文件 */ }
  if (prev === content) { unchanged++; console.log(`  = ${rel}`); return; }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8'); /* LF、无 BOM、末尾恰一换行 */
  written++; console.log(`  + ${rel}`);
};
console.log(`gen-node-readmes → ${outDir}`);
emit('README.md', indexReadme(types, defs));
for (const t of types) emit(join(t, 'README.md'), nodeReadme(defs[t]));
console.log(`完成：${written} 写入 / ${unchanged} 无变化 / 共 ${types.length + 1} 份`);
