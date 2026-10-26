/* ================================================================
 *  routes.ts — workbench 端点承载（BK-0040 / 迭代 0036 · ADR-0016 §3.1）
 *  E1 GET /api/v1/workbench/git（v1-only，无 /api/* 别名——ADR-0005 先例；
 *  注册在 server.ts:219 段尾）。错误码：400 limit 非法 / 404 非 git 仓库 /
 *  500 超时或退出码异常（细节进 logger 不进响应）。零 shared 契约
 *  （面板数据源非节点/SSE 面，sessions 先例）。
 * ================================================================ */
import type { RequestHandler } from 'express';
import { collectGitInfo, WorkbenchGitError } from './git.js';
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
