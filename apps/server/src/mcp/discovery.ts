/* ================================================================
 *  mcp/discovery.ts — 智能体扩展发现器（迭代 0071 / BK-0014 · ADR-0023 实现消费轮）
 *  扫描（只读发现）与激活（能力面授予）分离（威胁模型：克隆得来的仓库自带
 *  .mcp.json/.agents/ 属不可信输入）：扫描仅经 MCP_DISCOVERY_SOURCES 白名单
 *  （未配置 = 零扫描零 fs 读零审计零日志，AC1 基线；home-agents 主权区必须
 *  显式列入方触 ~/.agents）；激活唯一通道 = MCP_DISCOVERY_ALLOW 显式登记
 *  （「源:名称」，显式配置即知情确认）——未登记候选仅 candidate 审计行 +
 *  结构化日志，不进注册表、不进 sys、零出站零子进程（AC2）。
 *  三源布局（固定层级，零全树递归）：project-mcp = <ROOT>/.mcp.json 单文件；
 *  project-agents = <ROOT>/.agents/；home-agents = <home>/.agents/
 *  （os.homedir()）。后两源布局同构：skills/<name>/SKILL.md、rules/*.md、
 *  mcp.json（语法同 project-mcp）。fs 只读三员 readFileSync/readdirSync/
 *  lstatSync（tree.ts:9 纪律同款）；符号链接一律不入扫描；'.git' 恒排除 +
 *  FOLD 名单（tree.ts:34 字面）命中候选名 → 该条 parse-fail；单文件 256KiB
 *  （oversize 不读内容）；每源 mcp≤64 / skill≤64 / rules≤32；正文仅 ALLOW
 *  命中者读入（≤6000 字节截断加 '…'）。
 *  扫描层 fail-open（ADR-0023 §2.3 分层）：解析失败 = parse-fail 审计行 +
 *  该条（或该源）空集，进程不退——与 config.ts env 静态格式 fail-fast 不混淆。
 *  快照 = 模块级单次记忆化（进程生命周期即缓存生命周期，registry.ts 头注
 *  同构；零热重载零轮询，变更需重启）。零模块级副作用——config.ts 可安全
 *  import 两纯函数（§5.1 静态格式层）。唯一接缝 = inject.ts / capabilities.ts
 *  各一处 composeSources(envLoader()) 表达式替换 + llm.ts/agent.ts sys 纯追加。
 * ================================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';
import { recordDiscoveryAudit } from './discovery-audit.js';
import { envLoader, NAME_RE } from './registry.js';
import type { McpRegistrySources, McpServersLoader, McpServerEntry } from './registry.js';

/* dist/mcp/discovery.js → 仓库根（pty/audit.ts:17 / root.ts:17 同型上溯） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

export type DiscoverySourceId = 'project-mcp' | 'project-agents' | 'home-agents';
const SOURCE_IDS: readonly string[] = ['project-mcp', 'project-agents', 'home-agents'];

export const FILE_SIZE_CAP = 256 * 1024;            /* 单文件上限（oversize 不读内容） */
export const BODY_MAX_BYTES = 6000;                  /* skill/rule 正文注入上限（llm.ts contextText 量级先例） */
export const SOURCE_CAPS = { mcp: 64, skill: 64, rule: 32 } as const;   /* 每源每类候选上限 */
const EXCLUDE = new Set(['.git', 'node_modules', 'dist', 'data', '.zcode']);   /* '.git' 恒排除 + FOLD 名单（tree.ts:34 字面） */

export interface DiscoveredSkill { source: DiscoverySourceId; name: string; path: string; body: string }
export interface DiscoveredRule { source: DiscoverySourceId; name: string; path: string; body: string }
export interface DiscoveryCounts { mcp: number; skill: number; rule: number; parseFail: number }

/* 快照（激活事实集：entries/skills/rules 仅含 ALLOW 命中者；counts = 发现
 * 事实集含未激活候选——分立并存，ADR-0023 §4.3） */
export interface DiscoverySnapshot {
  entries: McpServerEntry[];
  skills: DiscoveredSkill[];
  rules: DiscoveredRule[];
  counts: Record<DiscoverySourceId, DiscoveryCounts>;
}
export interface DiscoverySpec { sources?: string; allow?: string }
export interface DiscoverOptions { projectRoot?: string; homeDir?: string }   /* 测试注入缝（生产缺省 = ROOT / homedir） */
export interface AllowKey { source: DiscoverySourceId; name: string }

interface ParseResult<T> { entries: T[]; problems: string[] }   /* registry.ts ParseResult 同构（零行为差复用取舍：parseSpec 泛型回调形态不适配无「name=值」语法的枚举串，故同型自实现） */

/* ---- §5.1 两 env 静态解析（纯函数；config.ts zod fail-fast 层复用，AC4） ---- */
export function parseDiscoverySourcesSpec(spec: string): ParseResult<DiscoverySourceId> {
  const entries: DiscoverySourceId[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  const s = spec.trim();
  if (!s) return { entries, problems };   /* 整值空白 = 未配置 */
  s.split(',').forEach((raw, i) => {
    const item = raw.trim();
    const label = `条目 ${i + 1}`;
    if (!item) { problems.push(`${label}：空条目（连续/首尾逗号）`); return; }
    if (!SOURCE_IDS.includes(item)) { problems.push(`${label}：未知扫描源：${item}（值域 project-mcp|project-agents|home-agents）`); return; }
    if (seen.has(item)) { problems.push(`${label}：扫描源重复：${item}`); return; }
    seen.add(item);
    entries.push(item as DiscoverySourceId);
  });
  return { entries, problems };
}

export function parseDiscoveryAllowSpec(spec: string): ParseResult<AllowKey> {
  const entries: AllowKey[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  const s = spec.trim();
  if (!s) return { entries, problems };
  s.split(',').forEach((raw, i) => {
    const item = raw.trim();
    const label = `条目 ${i + 1}`;
    if (!item) { problems.push(`${label}：空条目（连续/首尾逗号）`); return; }
    const c = item.indexOf(':');   /* NAME_RE 无冒号 → 首个冒号即唯一分割点 */
    const src = c < 0 ? '' : item.slice(0, c).trim();
    const name = c < 0 ? '' : item.slice(c + 1).trim();
    if (!src || !name) { problems.push(`${label}：须为 源:名称 形态`); return; }
    if (!SOURCE_IDS.includes(src)) { problems.push(`${label}：未知扫描源：${src}（值域 project-mcp|project-agents|home-agents）`); return; }
    if (!NAME_RE.test(name)) { problems.push(`${label}：name 含非法字符（只允许字母/数字/_/-）：${name}`); return; }
    if (seen.has(`${src}:${name}`)) { problems.push(`${label}：条目重复：${src}:${name}`); return; }
    seen.add(`${src}:${name}`);
    entries.push({ source: src as DiscoverySourceId, name });
  });
  return { entries, problems };
}

/* ---- 扫描上下文与审计/日志原语（锚子串表 = SPEC §5.8，锚子串不得改） ---- */
interface ScanState {
  source: DiscoverySourceId;
  counts: DiscoveryCounts;
  allow: ReadonlySet<string>;
  hitKeys: Set<string>;                 /* ALLOW 命中键（AC5 warn 的差集来源） */
  snapshot: DiscoverySnapshot;
}

function parseFail(st: ScanState, entry: string, reason: string, rel?: string): void {
  st.counts.parseFail++;
  recordDiscoveryAudit({ source: st.source, entry: entry || '-', kind: 'parse-fail', summary: rel ? `${reason}（${rel}）` : reason });
  logger.warn({ source: st.source, entry: entry || '-', reason, path: rel }, 'MCP 扩展发现解析失败');
}

/** 候选留痕（发现事实；含未激活）。返回是否 ALLOW 命中（命中方进快照）。 */
function candidate(st: ScanState, name: string, kind: string, rel: string): boolean {
  recordDiscoveryAudit({ source: st.source, entry: name, kind: 'candidate', summary: `${kind} ${rel}` });
  logger.info({ source: st.source, entry: name, kind, path: rel }, 'MCP 扩展发现候选');
  const key = `${st.source}:${name}`;
  if (!st.allow.has(key)) return false;
  st.hitKeys.add(key);
  recordDiscoveryAudit({ source: st.source, entry: name, kind: 'allow-hit', summary: `${kind} ${rel}` });   /* 首次确认锚点 */
  logger.info({ source: st.source, entry: name, kind }, 'MCP 扩展发现激活');
  return true;
}

type LstatOk = { ok: true; st: fs.Stats } | { ok: false; missing: boolean };
function lstatSafe(p: string): LstatOk {
  try { return { ok: true, st: fs.lstatSync(p) }; }
  catch (e) { return { ok: false, missing: (e as NodeJS.ErrnoException).code === 'ENOENT' }; }
}

function tryURL(v: string): URL | null {
  try { return new URL(v); } catch { return null; }
}

/** 正文限幅：≤6000 UTF-8 字节，截断加 '…'（pty/audit.ts clip 字节版同型） */
function clipBody(buf: Buffer): string {
  return buf.byteLength <= BODY_MAX_BYTES ? buf.toString('utf8')
    : buf.subarray(0, BODY_MAX_BYTES).toString('utf8') + '…';
}

/** 扫描根本身落入排除域的防御判定（固定锚定下理论不可达；判定域 = 扫描根
 *  与其直接父目录名——锚定链上级路径不在判定域，工作树路径天然含 .zcode
 *  上级分量属锚定外，不误伤）。 */
function rootExcluded(p: string): boolean {
  return EXCLUDE.has(path.basename(p)) || EXCLUDE.has(path.basename(path.dirname(p)));
}

/** 候选路径包含性防御（tree.ts isWithinRoot 同构的私有实现，Mimosa 建议形态）：
 *  readdir 条目名拼接后必须仍落在扫描根内才允许触碰 fs。readdir 条目名在
 *  win32/POSIX 均不可能含路径分隔符（遍历结构性不可达），此为纵深防御——
 *  不约束扫描根本身（projectRoot/homeDir 注入缝 = 测试专用参数面，SPEC §4.3 /
 *  ADR-0023 §8①，非用户配置面，生产恒为 ROOT/homedir 固定锚）。 */
function withinRoot(root: string, target: string): boolean {
  const r = path.resolve(root);
  const t = path.resolve(target);
  return t === r || t.startsWith(r + path.sep);
}

/* ---- mcp.json 条目构造（project-mcp 与 .agents/mcp.json 共用；从窄不猜测） ---- */
function collectMcpEntries(st: ScanState, raw: string, rel: string): void {
  let doc: unknown;
  try { doc = JSON.parse(raw); }
  catch (e) { parseFail(st, '-', `JSON 解析失败：${String((e as Error).message ?? e)}`, rel); return; }
  const servers = doc !== null && typeof doc === 'object' && !Array.isArray(doc)
    ? (doc as Record<string, unknown>).mcpServers : null;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    parseFail(st, '-', '顶层须为对象且含对象型 mcpServers', rel);
    return;
  }
  for (const name of Object.keys(servers as Record<string, unknown>).sort((a, b) => a.localeCompare(b))) {
    if (st.counts.mcp >= SOURCE_CAPS.mcp) { parseFail(st, '-', `mcp 候选数超上限（>${SOURCE_CAPS.mcp}），该源后续条目全部跳过、已接受者保留`); break; }
    const relName = `${rel}#${name}`;
    const val = (servers as Record<string, unknown>)[name];
    if (!NAME_RE.test(name)) { parseFail(st, name, 'name 含非法字符（只允许字母/数字/_/-）', relName); continue; }
    if (!val || typeof val !== 'object' || Array.isArray(val)) { parseFail(st, name, '条目值须为对象', relName); continue; }
    const o = val as Record<string, unknown>;
    if (o.url !== undefined && o.command !== undefined) { parseFail(st, name, 'url 与 command 并存（歧义不猜测）', relName); continue; }
    let entry: McpServerEntry;
    if (o.url !== undefined) {
      const urlStr = typeof o.url === 'string' ? o.url : null;
      if (urlStr === null) { parseFail(st, name, 'url 须为字符串', relName); continue; }
      const u = tryURL(urlStr);
      if (!u || (u.protocol !== 'http:' && u.protocol !== 'https:')) { parseFail(st, name, 'URL 非法或协议非 http/https', relName); continue; }
      entry = { kind: 'http', serverId: name, url: urlStr };
    } else if (o.command !== undefined) {
      if (typeof o.command !== 'string' || !o.command.trim()) { parseFail(st, name, 'command 须为非空字符串', relName); continue; }
      if (o.args !== undefined && (!Array.isArray(o.args) || o.args.some((a) => typeof a !== 'string'))) { parseFail(st, name, 'args 须为 string[]', relName); continue; }
      entry = { kind: 'stdio', serverId: name, command: o.command, args: o.args === undefined ? [] : o.args as string[] };
    } else { parseFail(st, name, 'url 与 command 皆缺', relName); continue; }
    st.counts.mcp++;
    if (candidate(st, name, entry.kind, relName)) st.snapshot.entries.push(entry);
  }
}

function scanProjectMcp(st: ScanState, file: string): void {
  if (rootExcluded(file)) { parseFail(st, '-', '扫描根落入排除域（.git/FOLD），整源跳过', path.basename(file)); return; }
  const lst = lstatSafe(file);
  if (!lst.ok) { if (!lst.missing) parseFail(st, '-', 'mcp.json lstat 失败', '.mcp.json'); return; }   /* 根缺失 = 合法空态（零 parse-fail 零 warn） */
  if (lst.st.isSymbolicLink()) { parseFail(st, '-', '符号链接不入扫描', '.mcp.json'); return; }
  if (lst.st.size > FILE_SIZE_CAP) { parseFail(st, '-', `文件超限（>${FILE_SIZE_CAP} 字节，不读内容）`, '.mcp.json'); return; }
  let raw: string;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) { parseFail(st, '-', `mcp.json 读取失败：${String((e as Error).message ?? e)}`, '.mcp.json'); return; }
  collectMcpEntries(st, raw, '.mcp.json');
}

/** skills/<name>/SKILL.md 固定层级（单层枚举，零递归）。可选子布局缺失 = 合法空态。 */
function scanSkills(st: ScanState, dir: string): void {
  let names: string[];
  try { names = fs.readdirSync(dir); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') parseFail(st, '-', `skills 目录枚举失败：${String((e as Error).message ?? e)}`, 'skills/'); return; }
  for (const name of names.sort((a, b) => a.localeCompare(b))) {
    if (st.counts.skill >= SOURCE_CAPS.skill) { parseFail(st, '-', `skill 数超上限（>${SOURCE_CAPS.skill}），该源后续条目全部跳过、已接受者保留`); break; }
    if (EXCLUDE.has(name)) { parseFail(st, name, '路径分量命中排除域（.git/FOLD）', `skills/${name}`); continue; }
    if (!NAME_RE.test(name)) { parseFail(st, name, 'name 含非法字符（只允许字母/数字/_/-）', `skills/${name}`); continue; }
    const entDir = path.join(dir, name);
    if (!withinRoot(dir, entDir)) { parseFail(st, name, '候选路径越出扫描根（防御拒绝）', `skills/${name}`); continue; }
    const rel = `skills/${name}/SKILL.md`;
    const dirSt = lstatSafe(entDir);
    if (!dirSt.ok) { if (!dirSt.missing) parseFail(st, name, 'lstat 失败', `skills/${name}`); continue; }   /* ENOENT 竞态单条静默跳过（tree.ts:117-119 同型） */
    if (dirSt.st.isSymbolicLink()) { parseFail(st, name, '符号链接不入扫描', `skills/${name}`); continue; }
    if (!dirSt.st.isDirectory()) { parseFail(st, name, '布局不符：skills 下应为目录', `skills/${name}`); continue; }
    const md = path.join(entDir, 'SKILL.md');
    if (!withinRoot(dir, md)) { parseFail(st, name, '候选路径越出扫描根（防御拒绝）', rel); continue; }
    const mdSt = lstatSafe(md);
    if (!mdSt.ok) { parseFail(st, name, 'SKILL.md 缺失', rel); continue; }
    if (mdSt.st.isSymbolicLink()) { parseFail(st, name, '符号链接不入扫描', rel); continue; }
    if (mdSt.st.size > FILE_SIZE_CAP) { parseFail(st, name, `文件超限（>${FILE_SIZE_CAP} 字节，不读内容）`, rel); continue; }
    st.counts.skill++;
    if (!candidate(st, name, 'skill', rel)) continue;   /* 正文读取最小化：仅 ALLOW 命中者读入快照 */
    let body: string;
    try { body = clipBody(fs.readFileSync(md)); }
    catch (e) { st.counts.skill--; parseFail(st, name, `SKILL.md 读取失败：${String((e as Error).message ?? e)}`, rel); continue; }
    st.snapshot.skills.push({ source: st.source, name, path: rel, body });
  }
}

/** rules/*.md 固定层级（非 .md 不属发现语法，静默忽略；名称判 定取去扩展名） */
function scanRules(st: ScanState, dir: string): void {
  let names: string[];
  try { names = fs.readdirSync(dir); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') parseFail(st, '-', `rules 目录枚举失败：${String((e as Error).message ?? e)}`, 'rules/'); return; }
  for (const fileName of names.sort((a, b) => a.localeCompare(b))) {
    if (!fileName.endsWith('.md')) continue;
    if (st.counts.rule >= SOURCE_CAPS.rule) { parseFail(st, '-', `rules 数超上限（>${SOURCE_CAPS.rule}），该源后续条目全部跳过、已接受者保留`); break; }
    const name = fileName.slice(0, -3);
    const rel = `rules/${fileName}`;
    if (EXCLUDE.has(name)) { parseFail(st, name, '路径分量命中排除域（.git/FOLD）', rel); continue; }
    if (!NAME_RE.test(name)) { parseFail(st, name, 'name 含非法字符（只允许字母/数字/_/-）', rel); continue; }
    const f = path.join(dir, fileName);
    if (!withinRoot(dir, f)) { parseFail(st, name, '候选路径越出扫描根（防御拒绝）', rel); continue; }
    const fSt = lstatSafe(f);
    if (!fSt.ok) { if (!fSt.missing) parseFail(st, name, 'lstat 失败', rel); continue; }
    if (fSt.st.isSymbolicLink()) { parseFail(st, name, '符号链接不入扫描', rel); continue; }
    if (!fSt.st.isFile()) { parseFail(st, name, '布局不符：rules 下应为 .md 文件', rel); continue; }
    if (fSt.st.size > FILE_SIZE_CAP) { parseFail(st, name, `文件超限（>${FILE_SIZE_CAP} 字节，不读内容）`, rel); continue; }
    st.counts.rule++;
    if (!candidate(st, name, 'rule', rel)) continue;
    let body: string;
    try { body = clipBody(fs.readFileSync(f)); }
    catch (e) { st.counts.rule--; parseFail(st, name, `规则文件读取失败：${String((e as Error).message ?? e)}`, rel); continue; }
    st.snapshot.rules.push({ source: st.source, name, path: rel, body });
  }
}

function scanAgentsDir(st: ScanState, base: string): void {
  if (rootExcluded(base)) { parseFail(st, '-', '扫描根落入排除域（.git/FOLD），整源跳过', path.basename(base)); return; }
  const rootSt = lstatSafe(base);
  if (!rootSt.ok) { if (!rootSt.missing) parseFail(st, '-', '.agents lstat 失败', '.agents/'); return; }   /* 根缺失 = 合法空态 */
  if (!rootSt.st.isDirectory()) { parseFail(st, '-', '布局不符：.agents 应为目录', '.agents/'); return; }
  const mcpJson = path.join(base, 'mcp.json');
  const mj = lstatSafe(mcpJson);
  if (mj.ok && mj.st.isFile() && !mj.st.isSymbolicLink() && mj.st.size <= FILE_SIZE_CAP) {
    try { collectMcpEntries(st, fs.readFileSync(mcpJson, 'utf8'), 'mcp.json'); }
    catch (e) { parseFail(st, '-', `mcp.json 读取失败：${String((e as Error).message ?? e)}`, 'mcp.json'); }
  } else if (mj.ok && !mj.st.isSymbolicLink() && mj.st.size > FILE_SIZE_CAP) {
    parseFail(st, '-', `文件超限（>${FILE_SIZE_CAP} 字节，不读内容）`, 'mcp.json');
  } else if (mj.ok && mj.st.isSymbolicLink()) {
    parseFail(st, '-', '符号链接不入扫描', 'mcp.json');
  }   /* 缺失/目录形态 = 该文件无 mcp 候选（合法空态，零噪音） */
  scanSkills(st, path.join(base, 'skills'));
  scanRules(st, path.join(base, 'rules'));
}

/* ---- 快照构建（启动期一次；§5.3） ---- */
export function discoverCandidates(spec: DiscoverySpec, opts?: DiscoverOptions): DiscoverySnapshot {
  const snapshot: DiscoverySnapshot = {
    entries: [], skills: [], rules: [],
    counts: { 'project-mcp': { mcp: 0, skill: 0, rule: 0, parseFail: 0 }, 'project-agents': { mcp: 0, skill: 0, rule: 0, parseFail: 0 }, 'home-agents': { mcp: 0, skill: 0, rule: 0, parseFail: 0 } },
  };
  const sources = parseDiscoverySourcesSpec(spec.sources ?? '');
  const allowSpec = parseDiscoveryAllowSpec(spec.allow ?? '');
  /* 全未配置 → 零扫描零 fs 读零审计零日志（AC1 的实现机关，短路于任何 IO 前） */
  if (sources.entries.length === 0 && sources.problems.length === 0 && allowSpec.problems.length === 0) return snapshot;
  const allow = new Set(allowSpec.entries.map((k) => `${k.source}:${k.name}`));
  const hitKeys = new Set<string>();
  const projectRoot = path.resolve(opts?.projectRoot ?? ROOT);
  const homeDir = path.resolve(opts?.homeDir ?? os.homedir());
  /* 防御（理论不可达）：config 静态校验前置后 problems 应恒空；非空 → parse-fail
   * 审计行（source='-'），不抛错（扫描层 fail-open 分层）。 */
  for (const p of sources.problems) recordDiscoveryAudit({ source: '-', entry: '-', kind: 'parse-fail', summary: p });
  for (const p of allowSpec.problems) recordDiscoveryAudit({ source: '-', entry: '-', kind: 'parse-fail', summary: p });
  for (const source of sources.entries) {
    const st: ScanState = { source, counts: snapshot.counts[source], allow, hitKeys, snapshot };
    if (source === 'project-mcp') scanProjectMcp(st, path.join(projectRoot, '.mcp.json'));
    else scanAgentsDir(st, path.join(source === 'project-agents' ? projectRoot : homeDir, '.agents'));
    recordDiscoveryAudit({ source, entry: '-', kind: 'scan', summary: `mcp=${st.counts.mcp} skill=${st.counts.skill} rule=${st.counts.rule} parseFail=${st.counts.parseFail}` });
    logger.info({ source, counts: { ...st.counts } }, 'MCP 扩展发现扫描');
  }
  for (const key of allow) {
    if (!hitKeys.has(key)) logger.warn({ allow: key }, '不在扫描快照中，已忽略');   /* AC5 时序宽容：无发现事实可审 → 仅 warn，零审计行 */
  }
  return snapshot;
}

/* ---- 生产组合器（唯一接缝）：模块级单次记忆化（进程生命周期即缓存生命周期） ---- */
let prodSnapshot: DiscoverySnapshot | null = null;

export function composeSources(loader: McpServersLoader, opts?: DiscoverOptions): McpRegistrySources {
  const src = loader();
  if (!prodSnapshot) prodSnapshot = discoverCandidates({ sources: src.discoverySources, allow: src.discoveryAllow }, opts);
  return { ...src, discoveredEntries: prodSnapshot.entries };
}

/** sys 注入组装（llm.ts / agent.ts 组装点纯追加；§5.7）：快照序 = skills 先、
 *  rules 后（各按源序[SOURCES 声明序]×名称字典序）；零命中返回 ''（与现状
 *  逐字节等价）。每次调用复用同一快照——发现正文不落跨会话存储（ADR-0023 §9.3）。 */
export function discoveredSysExtension(opts?: DiscoverOptions): string {
  if (!prodSnapshot) prodSnapshot = discoverCandidates({ sources: envLoader().discoverySources, allow: envLoader().discoveryAllow }, opts);
  let out = '';
  for (const s of prodSnapshot.skills) out += `\n\n【发现技能 ${s.name}】\n${s.body}`;
  for (const r of prodSnapshot.rules) out += `\n\n【规则 ${r.name}】\n${r.body}`;
  return out;
}

/* 测试探针面（非接口承诺，生产代码不得依赖；registry.ts discoveryCount 同型
 * 先例）：模块级单次记忆化的重置缝——冒烟须以不同 fixture 根构建多份快照 */
export function resetDiscoverySnapshotForTest(): void { prodSnapshot = null; }
