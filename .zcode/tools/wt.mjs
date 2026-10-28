#!/usr/bin/env node
/* ================================================================
 *  wt.mjs — zcode 进化工作流 · 工作树生命周期辅助器
 *  （.zcode/ 内，本机文件，不入库）
 *
 *  模式：
 *   alloc  <mainRepo> <worktreeParent> <baseRef> <startIter> <slug>
 *        原子分配迭代号 + 建分支 + 建工作树；打印 JSON {branch,path,iter}。
 *        号位来源：主干已有迭代目录 ∪ 既有 feat/* 分支 ∪ worktree 分支，
 *        与 startIter（STATE 的当前/下一个迭代号）取大者；号位被占则顺延。
 *        git ref 创建本身原子 → 并发两路不会撞号。
 *   prepare <worktree> <mainRepo>
 *        工作树依赖：node_modules 顶层依赖 junction 到主仓库，
 *        @agentflow/* 指向工作树自身（否则工作树编译的是主仓库源码）。
 *   run    <cwd> <cmd> [args...]        指定 cwd 执行（world.run 的 cwd 固定）
 *   runlog <cwd> <logFile> <cmd> [args...]  执行并把输出落盘（证据日志）
 *   status <worktree>                   打印 JSON {staged,unstaged,untracked}
 *   remove <mainRepo> <worktree> <branch>  移除工作树并删分支
 *   rename <mainRepo> <worktree> <newBranch> 分支改名 + 工作树移位
 *   copy   <src> <dst>                  递归复制目录
 *   write  <file> <content>             写文本文件
 *   evidence <distDir> <outDir>         图像证据采集（4 张确定性截图）
 *   lock   <lockFile> [--wait ms]       排他锁（原子创建）
 *   unlock <lockFile>                   释放锁
 * ================================================================ */
import {
  readdirSync, existsSync, mkdirSync, symlinkSync, lstatSync, rmSync,
  writeFileSync, openSync, closeSync, unlinkSync, cpSync, readFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const [, , mode, ...rest] = process.argv;

/* 锁根目录：与工作树同级（.zcode/locks/），跨工作流共享的本机状态 */
const WT_PARENT_LOCKS = '.zcode/locks';

const fail = (msg, code = 1) => {
  console.error(msg);
  process.exit(code);
};
const ls = p => {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
};
const linkDir = (target, linkPath) => {
  mkdirSync(path.dirname(linkPath), { recursive: true });
  if (existsSync(linkPath) || ls(linkPath)) return;
  try {
    symlinkSync(target, linkPath, 'junction');
  } catch (err) {
    console.error(`link failed: ${linkPath} -> ${target}: ${err.message}`);
    process.exitCode = 1;
  }
};
const git = (cwd, args) =>
  spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true });
const freePort = () =>
  new Promise(resolve => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
  });
const sleep = ms => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`]);

/* ---------------- alloc：迭代号 + 分支 + 工作树 ---------------- */
if (mode === 'alloc') {
  const [main, parentDir, baseRef, startIterRaw, slugRaw] = rest;
  if (!main || !parentDir || !baseRef || !startIterRaw || !slugRaw) {
    fail('alloc 需要 <mainRepo> <worktreeParent> <baseRef> <startIter> <slug>');
  }
  const slug = slugRaw.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'spec';

  /* 已消耗的号位：主干迭代目录 + 既有分支号 + 在途 worktree 分支号 */
  const consumed = new Set();
  const iterDir = path.join(main, 'docs', 'evolution', 'iterations');
  if (existsSync(iterDir)) {
    for (const e of readdirSync(iterDir)) if (/^\d{4}$/.test(e)) consumed.add(Number(e));
  }
  for (const line of (git(main, ['branch', '--list', 'feat/*']).stdout || '').split('\n')) {
    const m = /feat\/(\d{4})-/.exec(line.trim());
    if (m) consumed.add(Number(m[1]));
  }
  for (const line of (git(main, ['worktree', 'list', '--porcelain']).stdout || '').split('\n')) {
    const m = /^branch refs\/heads\/feat\/(\d{4})-/.exec(line.trim());
    if (m) consumed.add(Number(m[1]));
  }

  let n = Math.max(Number(startIterRaw), ...(consumed.size > 0 ? [...consumed] : [0]));
  mkdirSync(parentDir, { recursive: true });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (consumed.has(n)) {
      n += 1;
      continue;
    }
    const iter = String(n).padStart(4, '0');
    const branch = `feat/${iter}-${slug}`;
    const wtPath = path.join(parentDir, branch);
    const res = git(main, ['worktree', 'add', '-b', branch, wtPath, baseRef]);
    if (res.status === 0) {
      console.log(JSON.stringify({ branch, path: path.resolve(wtPath), iter }));
      process.exit(0);
    }
    const msg = `${res.stderr || ''}${res.stdout || ''}`;
    if (/already exists|already used by worktree|already checked out/i.test(msg)) {
      n += 1;
      continue;
    }
    fail(`worktree add 失败：${msg.trim().slice(0, 300)}`);
  }
  fail('连续 80 次无法分配空闲迭代号');
}

/* ---------------- prepare：工作树依赖 ---------------- */
else if (mode === 'prepare') {
  const [wt, main] = rest;
  if (!wt || !main) fail('prepare 需要 <worktree> <mainRepo>');
  const mainNm = path.join(main, 'node_modules');
  const wtNm = path.join(wt, 'node_modules');
  if (!existsSync(mainNm)) {
    fail(`主仓库缺少 node_modules（${mainNm}）：请先在主仓库执行 npm install 再准备工作树依赖`);
  }
  mkdirSync(wtNm, { recursive: true });

  for (const entry of readdirSync(mainNm)) {
    if (entry === '@agentflow' || entry === '.bin') continue;
    const src = path.join(mainNm, entry);
    const dst = path.join(wtNm, entry);
    const st = ls(src);
    if (!st) continue;
    if (st.isDirectory()) linkDir(src, dst);
    else {
      try {
        symlinkSync(src, dst, 'file');
      } catch {
        /* 单个文件链接失败不影响构建 */
      }
    }
  }
  linkDir(path.join(mainNm, '.bin'), path.join(wtNm, '.bin'));

  const scope = path.join(wtNm, '@agentflow');
  mkdirSync(scope, { recursive: true });
  const selfMap = {
    shared: path.join(wt, 'packages', 'shared'),
    web: path.join(wt, 'apps', 'web'),
    server: path.join(wt, 'apps', 'server'),
  };
  for (const [name, target] of Object.entries(selfMap)) {
    const dst = path.join(scope, name);
    if (!existsSync(dst)) linkDir(target, dst);
  }

  const serverSrc = path.join(main, 'apps', 'server', 'node_modules');
  if (existsSync(serverSrc)) {
    const serverDst = path.join(wt, 'apps', 'server', 'node_modules');
    if (!existsSync(serverDst)) linkDir(serverSrc, serverDst);
  }
  console.log(`prepare ok: ${wtNm}`);
}

/* ---------------- run：指定 cwd 执行 ---------------- */
else if (mode === 'run') {
  const [cwd, cmd, ...args] = rest;
  if (!cwd || !cmd) fail('run 需要 <cwd> <cmd> [args...]');
  const env = { ...process.env };
  if (!env.GATE_PORT) env.GATE_PORT = String(await freePort());
  const isWin = process.platform === 'win32';
  const needsShell = isWin && /^(npm|npx)(\.cmd)?$/i.test(cmd);
  let res;
  if (needsShell) {
    const line = [cmd.replace(/\.cmd$/i, ''), ...args].join(' ');
    res = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', line], {
      cwd, stdio: 'inherit', shell: false, windowsHide: true, env,
    });
  } else {
    res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: false, windowsHide: true, env });
  }
  process.exit(res.status === null ? 1 : res.status);
}

/* ---------------- runlog：执行并留日志 ---------------- */
else if (mode === 'runlog') {
  const [cwd, logFile, cmd, ...args] = rest;
  if (!cwd || !logFile || !cmd) fail('runlog 需要 <cwd> <logFile> <cmd> [args...]');
  mkdirSync(path.dirname(logFile), { recursive: true });
  const env = { ...process.env };
  if (!env.GATE_PORT) env.GATE_PORT = String(await freePort());
  const isWin = process.platform === 'win32';
  const needsShell = isWin && /^(npm|npx)(\.cmd)?$/i.test(cmd);
  const argv = needsShell
    ? { file: process.env.ComSpec || 'cmd.exe', argv: ['/d', '/s', '/c', [cmd.replace(/\.cmd$/i, ''), ...args].join(' ')] }
    : { file: cmd, argv: args };
  const res = spawnSync(argv.file, argv.argv, {
    cwd, encoding: 'utf8', shell: false, windowsHide: true, env, maxBuffer: 64 * 1024 * 1024,
  });
  const out = (res.stdout || '') + (res.stderr || '');
  writeFileSync(logFile, out, 'utf8');
  process.stdout.write(out);
  process.exit(res.status === null ? 1 : res.status);
}

/* ---------------- status：工作树改动清单 ---------------- */
else if (mode === 'status') {
  const [wt] = rest;
  if (!wt) fail('status 需要 <worktree>');
  const res = git(wt, ['status', '--porcelain']);
  if (res.status !== 0) fail(`git status 失败：${(res.stderr || '').slice(0, 200)}`);
  const out = { staged: [], unstaged: [], untracked: [] };
  for (const line of (res.stdout || '').split('\n')) {
    if (!line.trim()) continue;
    const code = line.slice(0, 2);
    let p = line.slice(3).trim();
    if (p.includes(' -> ')) p = p.split(' -> ')[1];
    p = p.replace(/^"(.*)"$/, '$1');
    if (code === '??') out.untracked.push(p);
    else if (code[1] !== ' ') out.unstaged.push(p);
    if (code[0] !== ' ' && code[0] !== '?') out.staged.push(p);
  }
  console.log(JSON.stringify(out));
}

/* ---------------- remove：清理工作树与分支 ---------------- */
else if (mode === 'remove') {
  const [main, wt, branch] = rest;
  if (!main || !wt) fail('remove 需要 <mainRepo> <worktree> [branch]');
  if (existsSync(wt)) {
    /* 先摘掉 junction 依赖与构建产物：git worktree remove 遇到非空目录会失败，
       而目录里的 node_modules 链接与 dist 产物本就不该进版本库 */
    const nm = path.join(wt, 'node_modules');
    if (existsSync(nm)) {
      try {
        rmSync(nm, { recursive: true, force: true });
      } catch {
        /* junction 移除失败不致命，继续尝试 git 移除 */
      }
    }
    for (const rel of ['apps/web/dist', 'apps/server/dist', 'packages/shared/dist', 'data', 'tests/golden/diff']) {
      const p = path.join(wt, rel);
      if (existsSync(p)) {
        try {
          rmSync(p, { recursive: true, force: true });
        } catch {
          /* 忽略单个产物清理失败 */
        }
      }
    }
    const res = git(main, ['worktree', 'remove', '--force', wt]);
    if (res.status !== 0) {
      /* 目录仍非空（Windows 上文件句柄占用等）：git 侧注销已尽力，残留目录人工处理 */
      console.error(`worktree remove 未完全成功（目录残留 ${wt}）：${(res.stderr || '').slice(0, 200)}`);
    }
  }
  if (branch) {
    const res = git(main, ['branch', '-d', branch]);
    if (res.status !== 0) {
      const hard = git(main, ['branch', '-D', branch]);
      if (hard.status !== 0) console.error(`branch 删除失败：${(hard.stderr || '').slice(0, 200)}`);
    }
  }
  console.log('remove ok');
}

/* ---------------- rename：分支重命名 + 工作树移位 ---------------- */
else if (mode === 'rename') {
  const [main, wt, newBranch] = rest;
  if (!main || !wt || !newBranch) fail('rename 需要 <mainRepo> <worktree> <newBranch>');
  const mv = git(wt, ['branch', '-m', newBranch]);
  if (mv.status !== 0) fail(`branch 重命名失败：${(mv.stderr || '').slice(0, 200)}`);
  const newPath = path.join(path.dirname(wt), newBranch);
  mkdirSync(path.dirname(newPath), { recursive: true });
  const wm = git(main, ['worktree', 'move', wt, newPath]);
  if (wm.status !== 0) {
    console.error(`worktree move 失败（分支已改名，路径保持原样）：${(wm.stderr || '').slice(0, 200)}`);
    console.log(JSON.stringify({ branch: newBranch, path: wt }));
    process.exit(0);
  }
  console.log(JSON.stringify({ branch: newBranch, path: newPath }));
}

/* ---------------- copy / write ---------------- */
else if (mode === 'copy') {
  const [src, dst] = rest;
  if (!src || !dst) fail('copy 需要 <src> <dst>');
  mkdirSync(path.dirname(dst), { recursive: true });
  cpSync(src, dst, { recursive: true });
  console.log(`copy ok: ${src} → ${dst}`);
} else if (mode === 'write') {
  const [file, content] = rest;
  if (!file) fail('write 需要 <file> <content>');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
  console.log(`write ok: ${file}`);
} else if (mode === 'read') {
  const [file] = rest;
  if (!file) fail('read 需要 <file>');
  if (!existsSync(file)) fail(`文件不存在：${file}`);
  process.stdout.write(readFileSync(file, 'utf8'));
}

/* ---------------- evidence：图像证据采集 ---------------- */
else if (mode === 'evidence') {
  const [distDir, outDir] = rest;
  if (!distDir || !outDir) fail('evidence 需要 <distDir> <outDir>');
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'evidence.mjs');
  const res = spawnSync(process.execPath, [script, distDir, outDir], {
    stdio: 'inherit', shell: false, windowsHide: true, env: process.env,
  });
  process.exit(res.status === null ? 1 : res.status);
}

/* ---------------- claim-item / claimed-items：选题占位互斥 ----------------
   并行工作流各自持有 BACKLOG 的独立副本，PM 可能选中同一项 → 两路做同一件事，
   最终在产品代码上冲突。迭代号分配防的是「撞号」，选题占位防的是「撞项」：
   原子 mkdir 即互斥，谁先建目录谁占住该项。 */
else if (mode === 'claim-item') {
  const [itemId] = rest;
  if (!itemId) fail('claim-item 需要 <itemId>');
  const dir = path.join(WT_PARENT_LOCKS, 'items', itemId);
  mkdirSync(path.dirname(dir), { recursive: true });
  try {
    mkdirSync(dir);            /* 原子：已存在则 EEXIST */
    /* 2026-10-28 修复（0063 实发）：mkdir 成功后 owner.json 写入在高负载机上可被
       杀软/索引器瞬时占用抛非 EEXIST 错 → 旧逻辑直接 fail，空目录泄漏且调用方把
       工具错误误读为「被他路占位」（三选题连撞空转）。修复：写入重试 ×3（60ms
       间隔）；终败撤销自建目录（防自阻塞泄漏）后按工具错误退出——与 claimed-busy
       的 exit 3 显式区分，供调用方分类处置。 */
    let wrote = false;
    let lastWriteErr = null;
    for (let i = 0; i < 3 && !wrote; i++) {
      try {
        writeFileSync(path.join(dir, 'owner.json'), JSON.stringify({ itemId, at: new Date().toISOString(), pid: process.pid }));
        wrote = true;
      } catch (werr) {
        lastWriteErr = werr;
        if (i < 2) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60);
      }
    }
    if (!wrote) {
      try { rmSync(dir, { recursive: true, force: true }); } catch { /* 撤销失败留人工清理 */ }
      fail(`claim-item owner.json 写入失败（重试 3 次终败，已撤销自建目录）：${lastWriteErr && lastWriteErr.message}`);
    }
    console.log(`claimed ${itemId}`);
    process.exit(0);
  } catch (err) {
    if (err.code !== 'EEXIST') fail(`claim-item 失败：${err.message}`);
    console.error(`claimed-busy ${itemId}`);
    process.exit(3);
  }
} else if (mode === 'release-item') {
  const [itemId] = rest;
  if (!itemId) fail('release-item 需要 <itemId>');
  const dir = path.join(WT_PARENT_LOCKS, 'items', itemId);
  try {
    rmSync(dir, { recursive: true, force: true });
    console.log(`released ${itemId}`);
  } catch (err) {
    console.error(`release 失败：${err.message}`);
  }
} else if (mode === 'claimed-items') {
  const base = path.join(WT_PARENT_LOCKS, 'items');
  const ids = existsSync(base) ? readdirSync(base) : [];
  console.log(JSON.stringify(ids));
}

/* ---------------- lock / unlock：合并排他锁 ---------------- */
else if (mode === 'lock') {
  const [lockFile] = rest;
  const waitIdx = rest.indexOf('--wait');
  const waitMs = waitIdx >= 0 ? Number(rest[waitIdx + 1] || 0) : 0;
  if (!lockFile) fail('lock 需要 <lockFile>');
  mkdirSync(path.dirname(lockFile), { recursive: true });
  const deadline = Date.now() + waitMs;
  for (;;) {
    try {
      const fd = openSync(lockFile, 'wx');
      writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      closeSync(fd);
      console.log('locked');
      process.exit(0);
    } catch (err) {
      if (err.code !== 'EEXIST') fail(`lock 失败：${err.message}`);
      if (Date.now() >= deadline) {
        console.error('lock busy');
        process.exit(3);
      }
      sleep(1500);
    }
  }
} else if (mode === 'unlock') {
  const [lockFile] = rest;
  if (!lockFile) fail('unlock 需要 <lockFile>');
  try {
    unlinkSync(lockFile);
  } catch {
    /* 已释放 */
  }
  console.log('unlocked');
} else {
  fail('未知模式。用法：alloc | prepare | run | runlog | status | remove | rename | copy | write | read | evidence | lock | unlock');
}
