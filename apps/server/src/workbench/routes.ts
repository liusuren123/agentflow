/* ================================================================
 *  routes.ts — workbench 端点承载（BK-0040 / 迭代 0036 · ADR-0016 §3.1；
 *  E2 diff 审查 = BK-0041 / 迭代 0054 · ADR-0016 §3.2；
 *  E3 目录树 = BK-0042 / 迭代 0056 · ADR-0016 §3.3）
 *  E1 GET /api/v1/workbench/git（v1-only，无 /api/* 别名——ADR-0005 先例；
 *  注册在 server.ts:219 段尾）。错误码：400 limit 非法 / 404 非 git 仓库 /
 *  500 超时或退出码异常（细节进 logger 不进响应）。零 shared 契约
 *  （面板数据源非节点/SSE 面，sessions 先例）。
 * ================================================================ */
import type { RequestHandler } from 'express';
import { collectGitInfo, WorkbenchGitError } from './git.js';
import { collectDiff, validateDiffQuery, WorkbenchDiffInputError, WorkbenchDiffRevisionError } from './diff.js';
import { collectTree, validateTreeQuery, WorkbenchTreeInputError, WorkbenchTreeError } from './tree.js';
import { logger } from '../logger.js';

export const workbenchGitHandler: RequestHandler = (req, res)=>{
  const n = Number(req.query.limit ?? 20);
  if(!Number.isInteger(n) || n < 1 || n > 100){
    res.status(400).json({ error:'limit 必须是 1-100 的整数' }); return;   // server.ts:173 同款
  }
  collectGitInfo(n).then(
    info => res.json(info),
    err=>{
      if(err instanceof WorkbenchGitError && err.kind === 'not-repo'){
        res.status(404).json({ error:'not a git repository' }); return;    // ADR-0016 §3.1 字面量
      }
      logger.warn({ err: String((err as Error).message || err) }, 'workbench git 端点失败');
      res.status(500).json({ error:'git command failed' });               // 超时/退出码异常同码
    });
};

/* E2 diff 审查（BK-0041 / 迭代 0054 · ADR-0016 §3.2）：入参校验同步段（400 直返，
   字面量见 diff.ts §3.1.2 各条）→ collectDiff 异步段；not-repo 404（E1 字面量一致）/
   ref 不可解析 400 / 其余 logger.warn + 500（E1 同款：细节进 logger 不进响应） */
export const workbenchDiffHandler: RequestHandler = (req, res)=>{
  let q;
  try{ q = validateDiffQuery(req.query); }
  catch(e){
    if(e instanceof WorkbenchDiffInputError){
      res.status(400).json({ error: e.message }); return;
    }
    logger.warn({ err: String((e as Error).message || e) }, 'workbench diff 入参校验异常');
    res.status(500).json({ error:'git command failed' });
    return;
  }
  collectDiff(q).then(
    d => res.json(d),
    err=>{
      if(err instanceof WorkbenchGitError && err.kind === 'not-repo'){
        res.status(404).json({ error:'not a git repository' }); return;
      }
      if(err instanceof WorkbenchDiffRevisionError){
        res.status(400).json({ error:'base 或 head ref 不存在或不可解析' }); return;
      }
      logger.warn({ err: String((err as Error).message || err) }, 'workbench diff 端点失败');
      res.status(500).json({ error:'git command failed' });
    });
};

/* E3 目录树（BK-0042 / 迭代 0056 · ADR-0016 §3.3）：入参校验同步段（400 直返，
   字面量见 tree.ts validateTreeQuery 各条）→ collectTree 异步段；not-found 404
   （'path 不存在或不是目录'）/ 其余 logger.warn + 500（'tree traversal failed'
   ——E3 零 git 故不复用 E1/E2 的 'git command failed' 字面量；细节进 logger
   不进响应，E1/E2 同款形态） */
export const workbenchTreeHandler: RequestHandler = (req, res)=>{
  let q;
  try{ q = validateTreeQuery(req.query); }
  catch(e){
    if(e instanceof WorkbenchTreeInputError){
      res.status(400).json({ error: e.message }); return;
    }
    logger.warn({ err: String((e as Error).message || e) }, 'workbench tree 入参校验异常');
    res.status(500).json({ error:'tree traversal failed' });
    return;
  }
  collectTree(q).then(
    t => res.json(t),
    err=>{
      if(err instanceof WorkbenchTreeError && err.kind === 'not-found'){
        res.status(404).json({ error:'path 不存在或不是目录' }); return;
      }
      logger.warn({ err: String((err as Error).message || err) }, 'workbench tree 端点失败');
      res.status(500).json({ error:'tree traversal failed' });
    });
};
