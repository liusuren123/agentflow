/* ================================================================
 *  diff.ts — workbench E2 diff 审查承载（BK-0041 / 迭代 0054 · ADR-0016 §3.2）
 *  入参校验（ref 白名单 / path 防越界 / stat 界值）+ collectDiff 双模式解析
 *  （默认 patch 模式按 /^diff --git / 边界切块；stat 模式 = --numstat 逐行，
 *  0054 SPEC §3.1.3 定形：adds/dels 精确分离，--stat 人读格式无法填出五键）。
 *  纪律（ADR-0016 §3.4，git.ts runGit 复用非复制）：argv 数组形态，一切外部
 *  输入只作 argv 元素，永不拼接命令行（不启用命令解释器）；5s setTimeout
 *  超时强杀；只读白名单 = diff 一命令（rev-parse 探测复用 E1 形态），可写命令
 *  一律排除；cwd 显式取 PROJECT_ROOT（root.ts 模块级常量，非进程 cwd）；
 *  零出站（本地子进程，guard 面无涉）、零 env、零 shared 契约。
 * ================================================================ */
import path from 'node:path';
import { runGit, WorkbenchGitError } from './git.js';
import { PROJECT_ROOT } from './root.js';

export interface DiffFile { path: string; status: string; adds: number; dels: number; patch: string }
export interface DiffResult { files: DiffFile[]; truncated: boolean }

/* 入参校验失败（400 面，message 即响应字面量） */
export class WorkbenchDiffInputError extends Error {}
/* ref 合法形状但不可解析（git 语义级 400，ADR-0016 §3.2「400 ref 非法」覆盖读法） */
export class WorkbenchDiffRevisionError extends Error {}

export interface DiffQuery { base?: string; head?: string; pathInput?: string; stat: boolean }

const REF_RE = /^[A-Za-z0-9._/@-]+$/;   // ADR-0016 §3.2 白名单字面（拒选项注入与空串）
const REF_MAX = 200;                     // 界值上限（对齐 E1 limit 界值风格）
const PATCH_CHAR_CAP = 20000;            // 逐文件 patch 截断上限（PRD §4 终值裁定）
const FILES_CAP = 500;                   // files 条目上限（防大 diff 爆响应）

/* path 防越界（tools.ts safePath 机理同构、锚定根 = 项目根，ADR-0016 §4）：
   resolve 归一后前缀比对——../ 逃逸与绝对路径注入（win32 盘符 / POSIX 根）同样被拒；
   越界即 400，不做修复式放行 */
function isWithinRoot(input: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, input);
  return resolved === PROJECT_ROOT || resolved.startsWith(PROJECT_ROOT + path.sep);
}

/* 入参校验（§3.1.2）：ref 缺省 = base 取 'HEAD' / head 不传（工作区形态）；
   在但为空串 = 400；path 缺省/空串 = 不过滤；stat 严格 0/1/true/false。
   校验通过后传给 git 的仍是原始输入串（作 argv 单元素 pathspec，相对
   cwd=PROJECT_ROOT 解析；校验仅作门禁） */
export function validateDiffQuery(query: { [k: string]: unknown }): DiffQuery {
  const q: DiffQuery = { stat: false };
  for(const key of ['base', 'head'] as const){
    const v = query[key];
    if(v === undefined) continue;
    if(typeof v !== 'string' || v === '' || v.length > REF_MAX
       || v.startsWith('-') || !REF_RE.test(v)){
      throw new WorkbenchDiffInputError('base 或 head ref 非法');
    }
    q[key] = v;
  }
  const p = query.path;
  if(p !== undefined && p !== ''){
    if(typeof p !== 'string' || !isWithinRoot(p)){
      throw new WorkbenchDiffInputError('path 越界');
    }
    q.pathInput = p;
  }
  const s = query.stat;
  if(s !== undefined){
    const t = typeof s === 'string' ? s.toLowerCase() : '';
    if(t === '1' || t === 'true') q.stat = true;
    else if(t !== '0' && t !== 'false') throw new WorkbenchDiffInputError('stat 必须是 0/1/true/false');
  }
  return q;
}

/* collectDiff：rev-parse 仓库探测（E1 同款）→ git diff 单命令 → 双模式解析。
   错误归类：探测非零 → not-repo（404 面）；diff 非零且 stderr 命中不可解析
   形态 → WorkbenchDiffRevisionError（400 面）；其余非零/超时 → failed（500 面） */
export async function collectDiff(
  q: DiffQuery, cwd: string = PROJECT_ROOT,
): Promise<DiffResult> {
  const probe = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
  if(probe.code !== 0 || probe.out.trim() !== 'true'){
    throw new WorkbenchGitError('not-repo', 'not a git repository');   // E1 字面量一致
  }
  /* argv 装配（全元素零拼接）：-c core.quotepath=off 与 E1 同款（防非 ASCII 路径
     八进制转义，本仓 docs/ 含中文名文件）；head 缺省 = base↔工作区形态 */
  const args = ['-c', 'core.quotepath=off', 'diff', '--no-color'];
  if(q.stat) args.push('--numstat');            // 统计模式（§3.1.3 定形）
  args.push(q.base ?? 'HEAD');
  if(q.head !== undefined) args.push(q.head);
  if(q.pathInput !== undefined) args.push('--', q.pathInput);
  const d = await runGit(args, cwd);
  if(d.code !== 0){
    if(/unknown revision|bad revision|ambiguous argument/i.test(d.err)){
      throw new WorkbenchDiffRevisionError('base 或 head ref 不存在或不可解析');
    }
    throw new WorkbenchGitError('failed', `git diff 退出码 ${d.code}：${d.err.slice(-200)}`);
  }
  return q.stat ? parseNumstat(d.out) : parsePatch(d.out);
}

/* 默认（patch）模式解析：按 /^diff --git / 行首边界切块（零宽 lookahead 切分保留
   块原文）；每块 → path/status/adds/dels/patch 五键 */
function parsePatch(out: string): DiffResult {
  const blocks = out.split(/(?=^diff --git )/m).filter(b => b !== '');
  let truncated = false;
  const kept = blocks.length > FILES_CAP ? blocks.slice(0, FILES_CAP) : blocks;
  if(kept.length !== blocks.length) truncated = true;
  const files: DiffFile[] = kept.map(block => {
    const pick = (re: RegExp): string => {
      const m = block.match(re);
      return m ? m[1]! : '';
    };
    /* path：优先 +++ b/<path>；删除文件（+++ /dev/null）取 --- a/<path>；纯改名
       零内容块取 rename to 值；末级兜底取块首行 diff --git a/<path> b/（所有块的
       公共结构——二进制块（Binary files … differ）无 +++/---/rename 行，前三级
       全 miss，无兜底则 path 空串击穿 B06「path 非空」（BUG-0054-01，修复轮 2）；
       已知限制：C 引号形态原样透传不剥引号，quotepath=off 已消八进制转义面，
       本仓常规路径不受影响） */
    let p = pick(/^\+\+\+ b\/(.+)$/m);
    if(p === '') p = /^\+\+\+ \/dev\/null$/m.test(block) ? pick(/^--- a\/(.+)$/m) : '';
    if(p === '') p = pick(/^rename to (.+)$/m);
    if(p === '') p = pick(/^diff --git a\/(.+) b\//);
    /* status：扩展头语义（A 新增 / D 删除 / R 改名 / 其余 M） */
    const status = /^new file mode /m.test(block) ? 'A'
      : /^deleted file mode /m.test(block) ? 'D'
      : (/^rename from /m.test(block) && /^rename to /m.test(block)) ? 'R' : 'M';
    /* adds/dels：以 + 开头行数（排除 +++）／以 - 开头行数（排除 ---）；二进制块
       （Binary files … differ）无 +/- 行自然为 0，patch 携带块原文如实呈现 */
    let adds = 0, dels = 0;
    for(const line of block.split(/\r?\n/)){
      if(line.startsWith('+') && !line.startsWith('+++')) adds++;
      else if(line.startsWith('-') && !line.startsWith('---')) dels++;
    }
    /* patch：块原文（含 diff --git/index/@@ 头），逐文件字符截断；截断无内联
       标记（ADR-0016 §3.2 出参为顶单标记形态，不加每文件标志位 = 契约不扩） */
    const patch = block.length > PATCH_CHAR_CAP ? block.slice(0, PATCH_CHAR_CAP) : block;
    if(patch.length !== block.length) truncated = true;
    return { path: p, status, adds, dels, patch };
  });
  return { files, truncated };
}

/* stat 模式解析（--numstat）：逐行 adds\tdels\tpath → 五键骨架一致（status 置空串
   不伪造 'M'，--numstat 不携带状态位；二进制行 -\t-\t → 归 0） */
function parseNumstat(out: string): DiffResult {
  let truncated = false;
  const files: DiffFile[] = [];
  const lines = out.split(/\r?\n/).filter(l => l !== '');
  for(const line of lines.slice(0, FILES_CAP)){
    const m = line.match(/^([0-9]+|-)\t([0-9]+|-)\t(.*)$/);
    if(!m) continue;
    files.push({
      path: m[3]!,
      status: '',
      adds: m[1] === '-' ? 0 : Number(m[1]),
      dels: m[2] === '-' ? 0 : Number(m[2]),
      patch: '',
    });
  }
  if(lines.length > FILES_CAP) truncated = true;
  return { files, truncated };
}
