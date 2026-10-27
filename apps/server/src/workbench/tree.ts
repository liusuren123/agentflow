/* ================================================================
 *  tree.ts — workbench E3 目录树承载（BK-0042 / 迭代 0056 · ADR-0016 §3.3）
 *  入参校验（path 防越界 / depth 界值）+ collectTree（Node fs 只读遍历：
 *  readdir + lstat 逐条判型，不追踪符号链接——链接一律呈 file 形态取本体
 *  size，零环引用零无限递归；'.git' 恒不入树；node_modules/dist/data/.zcode
 *  按目录名折叠为占位行（children 恒空数组，内容任何情况下不入响应）；
 *  条目上限 ENTRIES_CAP 截断 + truncated 顶标记（防大仓爆响应、不静默吞）。
 *  承载差异面（ADR-0016 §3.3）：E3 不经 git 子进程（E1/E2 为 git 承载）——
 *  本文件零子进程调用、零出站、零 env；fs 调用面仅 readdir/lstat 只读两员。
 *  锚定 = root.ts PROJECT_ROOT 模块级常量直接复用（零改动）。
 * ================================================================ */
import path from 'node:path';
import type { Stats } from 'node:fs';
import { readdir, lstat } from 'node:fs/promises';
import { PROJECT_ROOT } from './root.js';

export interface TreeNode { name: string; type: 'dir' | 'file'; size?: number; children?: TreeNode[] }
export interface TreeResult { root: { name: string; path: string; children: TreeNode[] }; truncated: boolean }

/* 入参校验失败（400 面，message 即响应字面量） */
export class WorkbenchTreeInputError extends Error {}
/* 404（子路径不存在/非目录）与 500（遍历异常）两面 */
export class WorkbenchTreeError extends Error {
  constructor(public readonly kind: 'not-found' | 'failed', message: string) { super(message); }
}

export interface TreeQuery { pathInput?: string; depth: number }

/* 折叠目录名单（按目录名匹配、任何层级生效）：node_modules/dist/data = 依赖与
   生成物三类（ADR-0016 §3.3）；.zcode = 工作树/工具目录（含完整依赖副本，
   不折叠即爆树，PRD 契约级义务）。占位行 = { name, type:'dir', children: [] }
   ——children 键在场且恒空数组，与「未取」（children 键缺席，可下钻）严格
   二态区分；折叠目录与真空目录同形是「无内容可展开」的有意语义统一 */
const FOLD = ['node_modules', 'dist', 'data', '.zcode'];
const ENTRIES_CAP = 500;   // 全局条目上限（响应内全部 children 条目总数，含占位行）

/* path 防越界（diff.ts isWithinRoot 机理同构的私有实现、锚定根 = 项目根，
   ADR-0016 §4；不从 diff.ts 导出复用——那会迫使 E2 文件为 E3 改动，扰动其
   既有源扫描断言面）：resolve 归一后前缀比对，../ 逃逸与绝对路径注入
   （win32 盘符 / POSIX 根）同拒；越界即 400，不做修复式放行 */
function isWithinRoot(input: string): boolean {
  const resolved = path.resolve(PROJECT_ROOT, input);
  return resolved === PROJECT_ROOT || resolved.startsWith(PROJECT_ROOT + path.sep);
}

/* 入参校验（SPEC §3.1.2）：path 缺省/空串 = 根；在而非字符串（express 同名
   多值参数为数组）或越界即 400。depth：Number(query.depth ?? 2)，非整数或
   1-6 外即 400（'abc'→NaN、'2.5'→非整数、0/7→越界；E1 limit 校验同风格） */
export function validateTreeQuery(query: { [k: string]: unknown }): TreeQuery {
  const q: TreeQuery = { depth: 2 };
  const p = query.path;
  if(p !== undefined && p !== ''){
    if(typeof p !== 'string' || !isWithinRoot(p)){
      throw new WorkbenchTreeInputError('path 越界');
    }
    q.pathInput = p;
  }
  const n = Number(query.depth ?? 2);
  if(!Number.isInteger(n) || n < 1 || n > 6){
    throw new WorkbenchTreeInputError('depth 必须是 1-6 的整数');
  }
  q.depth = n;
  return q;
}

/* win32 分隔符 → POSIX（出参 path 前缀契约）；'' 表根 */
function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

/* collectTree：lstat 锚定根判型（不存在/非目录 → not-found 404 面）→
   折叠根短路（显式下钻折叠目录 → 子树恒占位）→ walk 递归（level 1..depth，
   depth 界值即递归深度上限，防深递归）。排序：同层 dir 先序、同类名按码点
   序（不依赖 locale——跨环境确定性） */
export async function collectTree(
  q: TreeQuery, rootAbs: string = PROJECT_ROOT,
): Promise<TreeResult> {
  const resolved = path.resolve(rootAbs, q.pathInput ?? '.');
  const rel = path.relative(rootAbs, resolved);
  let rootSt: Stats;
  try{ rootSt = await lstat(resolved); }
  catch(e){
    if((e as NodeJS.ErrnoException).code === 'ENOENT'){
      throw new WorkbenchTreeError('not-found', 'path 不存在或不是目录');
    }
    throw new WorkbenchTreeError('failed', `根路径 lstat 失败：${(e as Error).message}`);
  }
  if(!rootSt.isDirectory()){
    /* 存在但为文件：与「子路径不存在」对下钻语义等价，两态共用 404 字面量 */
    throw new WorkbenchTreeError('not-found', 'path 不存在或不是目录');
  }
  /* 折叠根短路：显式请求折叠目录（或其下级——按首段判 FOLD）→ 子树恒占位 */
  if(rel !== '' && FOLD.includes(rel.split(path.sep)[0]!)){
    return { root: { name: path.basename(resolved), path: toPosix(rel), children: [] }, truncated: false };
  }
  const state = { count: 0, truncated: false };
  const children = await walk(resolved, 1, q.depth, state);
  return { root: { name: path.basename(resolved), path: toPosix(rel), children }, truncated: state.truncated };
}

async function walk(
  dirAbs: string, level: number, depth: number,
  state: { count: number; truncated: boolean },
): Promise<TreeNode[]> {
  let names: string[];
  try{ names = await readdir(dirAbs); }
  catch(e){
    throw new WorkbenchTreeError('failed', `readdir 失败：${(e as Error).message}`);
  }
  const rows: TreeNode[] = [];
  for(const name of names){
    if(name === '.git') continue;                                     // EXCLUDE：恒不入树
    if(state.count >= ENTRIES_CAP){ state.truncated = true; break; }  // 该层剩余兄弟丢弃
    let st: Stats;
    try{ st = await lstat(path.join(dirAbs, name)); }
    catch(e){
      /* readdir 后被并发删除的竞态：跳过该条目（不置 truncated、不 500——
         文件系统竞态是常态，不击穿整树）；其余单条目异常 500 兜底 */
      if((e as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw new WorkbenchTreeError('failed', `lstat 失败：${(e as Error).message}`);
    }
    if(st.isDirectory()){
      if(FOLD.includes(name)){
        rows.push({ name, type: 'dir', children: [] });               // 折叠占位（不递归）
        state.count++;
      }else if(level >= depth){
        rows.push({ name, type: 'dir' });                             // children 键缺席 = 未取可下钻
        state.count++;
      }else{
        const node: TreeNode = { name, type: 'dir' };
        rows.push(node);
        state.count++;
        if(state.count < ENTRIES_CAP){
          node.children = await walk(path.join(dirAbs, name), level + 1, depth, state);
        }else{
          state.truncated = true;                                     // 上限后更深层级不再递归
        }
      }
    }else{
      /* 符号链接不追踪（lstat 判型）：一律呈 file 形态、size = 链接本体字节——
         目标不揭示、目录型链接降级为 file；零环引用契约义务由此满足 */
      rows.push({ name, type: 'file', size: st.size });
      state.count++;
    }
  }
  /* 同层 dir 先序、同类名按码点序（a.name < b.name） */
  return rows.sort((a, b) =>
    a.type === b.type ? (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    : (a.type === 'dir' ? -1 : 1));
}
