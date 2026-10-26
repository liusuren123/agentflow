/* ================================================================
 *  git.ts — workbench git 执行器 + E1 数据组装（BK-0040 / 迭代 0036）
 *  纪律（ADR-0016 §3.4，code.ts 同构）：argv 数组形态，一切外部输入只作
 *  argv 元素，永不拼接命令行（不启用命令解释器）；5s setTimeout 超时强杀；
 *  只读白名单 = rev-parse / status / log 三命令（E1 承载），可写命令一律
 *  排除——workbench 对仓库零写入、零副作用。cwd 显式取 PROJECT_ROOT
 *  （root.ts 模块级常量，非进程 cwd）；零出站（本地子进程，guard 面无涉）。
 * ================================================================ */
import { spawn } from 'node:child_process';
import { PROJECT_ROOT } from './root.js';

export interface GitChange { status: string; path: string; from?: string }
export interface GitCommit { sha: string; short: string; author: string; ts: number; subject: string }
export interface GitInfo { branch: string; head: string; changes: GitChange[]; commits: GitCommit[] }

export class WorkbenchGitError extends Error {
  constructor(public readonly kind: 'not-repo' | 'failed', message: string) {
    super(message);
  }
}

/* runGit：resolve {code,out,err}——非零退出码交调用方按语义归类
   （rev-parse 非零 = not-repo；其余 = failed）；error 事件 / 超时即 reject */
function runGit(args: string[], cwd: string = PROJECT_ROOT): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject)=>{
    let child;
    try{
      child = spawn('git', args, { cwd, stdio:['pipe','pipe','pipe'] });
    }catch(e){ reject(new WorkbenchGitError('failed', `无法启动 git：${(e as Error).message}`)); return; }
    let out = '', err = '', killed = false;
    const timer = setTimeout(()=>{ killed = true; child.kill(); }, 5000);
    child.stdout.on('data', (d: Buffer)=>{ out += d; });
    child.stderr.on('data', (d: Buffer)=>{ err += d; });
    child.on('error', e=>{ clearTimeout(timer); reject(new WorkbenchGitError('failed', `git 执行失败：${e.message}`)); });
    child.on('close', codeNum=>{
      clearTimeout(timer);
      if(killed){ reject(new WorkbenchGitError('failed', `git ${args[0]} 超时（5s），已终止`)); return; }
      resolve({ code: codeNum ?? -1, out, err });
    });
  });
}

/* collectGitInfo：三命令组装 E1 出参（ADR-0016 §3.1 契约级字段清单）；
   cwd 为纯函数参数（默认即锚定根），非 env/config 注入 */
export async function collectGitInfo(limit: number, cwd: string = PROJECT_ROOT): Promise<GitInfo> {
  const probe = await runGit(['rev-parse', '--is-inside-work-tree'], cwd);
  if(probe.code !== 0 || probe.out.trim() !== 'true'){
    throw new WorkbenchGitError('not-repo', 'not a git repository');   // ADR-0016 §3.1 字面量
  }
  /* -c core.quotepath=off：防非 ASCII 路径八进制转义（子命令仍为 status，白名单语义不变） */
  const st = await runGit(['-c', 'core.quotepath=off', 'status', '--porcelain=v1', '--branch'], cwd);
  if(st.code !== 0) throw new WorkbenchGitError('failed', `git status 退出码 ${st.code}：${st.err.slice(-200)}`);
  /* limit 上游已校验整数 1-100，此处只作 argv 元素（零注入面） */
  const lg = await runGit(['log', '-n', String(limit), '--format=%H%x1f%h%x1f%an%x1f%at%x1f%s'], cwd);
  /* 已知限制（如实标注）：零提交新仓库 log 退出码 128 → failed → 500，不伪造空数据 */
  if(lg.code !== 0) throw new WorkbenchGitError('failed', `git log 退出码 ${lg.code}：${lg.err.slice(-200)}`);

  const stLines = st.out.split(/\r?\n/).filter(l=>l !== '');
  /* 首行 `## <branch>...[tracking]`：剥 `## ` 后截断于 `...` 或首个空格（detached → 'HEAD'） */
  let branch = stLines[0]?.startsWith('## ') ? stLines[0].slice(3) : '';
  if(branch){
    const dots = branch.indexOf('...');
    if(dots >= 0) branch = branch.slice(0, dots);
    const sp = branch.indexOf(' ');
    if(sp >= 0) branch = branch.slice(0, sp);
  }
  /* 变更行：前两字符 = porcelain 状态码（' M'/'??'/'R ' 原样两位）；余部含 ` -> ` 即 rename（from → path） */
  const changes: GitChange[] = stLines.slice(1).map(l=>{
    const status = l.slice(0, 2);
    const rest = l.slice(3);
    const arrow = rest.indexOf(' -> ');
    if(arrow >= 0) return { status, from: rest.slice(0, arrow), path: rest.slice(arrow + 4) };
    return { status, path: rest };
  });
  /* 提交行：\x1f 分隔 [sha, short, author, atSecs, subject]；ts = 秒 × 1000（全仓毫秒惯例，fmtTs 直接可渲染） */
  const commits: GitCommit[] = lg.out.split(/\r?\n/).filter(l=>l !== '').map(l=>{
    const [sha, short, author, at, subject] = l.split('\x1f');
    return { sha: sha ?? '', short: short ?? '', author: author ?? '',
      ts: Math.round(Number(at) * 1000) || 0, subject: subject ?? '' };
  });
  return { branch, head: commits.length ? commits[0]!.short : '', changes, commits };
}
