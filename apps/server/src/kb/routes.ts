/* ================================================================
 *  routes.ts — kb 管道·端点承载（迭代 0064 / BK-0019 · ADR-0020 §4.1/§5）
 *  · GET  /api/v1/kb                → kb 清单（恒 200 只读供数，BK-0047 供数源；
 *    数据源 = kb.ts indexMeta 进程内索引派生，请求路径零 SQL——capabilities.ts 同构）
 *  · POST /api/v1/kb/:name/documents → 上传管道：上传→切分→嵌入→入库（v1-only）
 *  校验序（SPEC §3.6，单请求内确定性）：express.text 字节闸（413，中间件层）
 *  → body 形态（非 string → 415）→ name 白名单（400）→ filename 缺失/形态（400）
 *  /后缀白名单（415）→ 空/零 chunk（400）→ 单 KB chunk 上限（413）→ 落盘+入库
 *  （500）→ 索引重建（500）。全程本地 fs + SQLite，零出站（guard.ts 零涉）。
 * ================================================================ */
import type { ErrorRequestHandler, RequestHandler } from 'express';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';
import { chunkText } from './chunk.js';
import { countKbChunks, insertDocument } from './store.js';
import { kbStats, rebuildKbIndex } from '../kb.js';

/* dist/kb/routes.js → apps/server → sandbox/kb（tools.ts:16 SANDBOX 同型派生，多退一层） */
const KB_ROOT = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), 'sandbox', 'kb');

/* 白名单终值（ADR-0020 §4.1 草案转正；首字符禁 .，字符类无 / \ ——路径穿越
 * 形态在正则层即拒；resolve 前缀校验为第二闸，纵深防御） */
const NAME_RE = /^[A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 _-]{0,63}$/;
const FILENAME_RE = /^[A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 ._-]{0,127}\.(txt|md|csv|json)$/i;
const FILENAME_SHAPE_RE = /^[A-Za-z0-9\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5 ._-]{0,127}$/;
const KB_CHUNK_LIMIT = 10000;   /* 单 KB chunk 总量上限（ADR-0020 §4.1 草案 10⁴ 转正） */

/* ---------- kb 清单端点（§4.2：恒 200，无 4xx/5xx 路径） ---------- */
export const kbListHandler: RequestHandler = (_q, res)=>{
  res.json({ kbs: kbStats() });
};

/* ---------- 上传管道端点（§4.1：上传→切分→嵌入→入库） ---------- */
export const kbUploadHandler: RequestHandler = async (req, res)=>{
  /* ② body 形态：非 text/* 传输（application/json 被全局 JSON 解析器消费为对象、
   * urlencoded/缺失不被 text 解析）→ 415 传输形态错误 */
  if(typeof req.body !== 'string'){
    res.status(415).json({ error:'上传必须以 text/* Content-Type 直传文件全文（application/json 会被全局 JSON 解析器消费）' });
    return;
  }
  const body: string = req.body;
  /* ③ name 白名单（name 入盘路径段——防注入第一闸） */
  const name = String(req.params.name ?? '');
  if(!NAME_RE.test(name)){
    res.status(400).json({ error:'知识库名非法：1-64 位，字母/数字/中文/空格/_/-，且以字母、数字或中文开头' });
    return;
  }
  /* ④ filename：必填（落盘文件名与 chunk src 均需其承载）→ 形态 400 → 后缀白名单 415 */
  const filename = req.query.filename === undefined ? '' : String(req.query.filename);
  if(!filename){
    res.status(400).json({ error:'缺少 filename 查询参数' });
    return;
  }
  if(!FILENAME_RE.test(filename)){
    if(FILENAME_SHAPE_RE.test(filename)){
      res.status(415).json({ error:'不支持的文件类型：仅允许 .txt/.md/.csv/.json' });
    }else{
      res.status(400).json({ error:'filename 非法：1-128 位加后缀，仅允许字母/数字/中文/空格/./_/-，禁止路径分隔符' });
    }
    return;
  }
  /* ⑤⑥ 切分：空文档 / 零 chunk → 400 如实拒绝（不静默入库空库） */
  const chunks = chunkText(body, filename);
  if(chunks.length === 0){
    res.status(400).json({ error:'文档内容为空或无可切分文本' });
    return;
  }
  /* ⑦ 单 KB chunk 上限（INSERT 前 SELECT 计数判定，防进程内索引爆内存） */
  if(countKbChunks(name) + chunks.length > KB_CHUNK_LIMIT){
    res.status(413).json({ error:'知识库 chunk 总量超上限（10000）' });
    return;
  }
  /* ⑧ 落盘（锚定 sandbox/kb/<name>/，resolve 归一后前缀校验——第二闸）+ 入库事务 */
  const dest = path.resolve(KB_ROOT, name, filename);
  if(dest !== KB_ROOT && !dest.startsWith(KB_ROOT + path.sep)){
    res.status(400).json({ error:'路径越界：只允许访问沙箱 kb 目录' });
    return;
  }
  const bytes = Buffer.byteLength(body, 'utf8');
  try{
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.writeFile(dest, body, 'utf8');   /* 同名覆盖，与 DB 替换语义对齐 */
    insertDocument(name, filename, bytes, chunks);
  }catch(e){
    /* 写盘成功而入库失败：best-effort unlink 回清理（负例 4xx 族在写之前即拒，零残留） */
    try{ await fsp.unlink(dest); }catch{ /* 落盘未成功，无残留 */ }
    logger.warn({ err: String((e as Error).message || e), kb: name, filename }, 'kb 上传入库失败');
    res.status(500).json({ error:'kb store failed' });
    return;
  }
  /* ⑨ 索引重建（进程内，异常如实 500） */
  try{
    rebuildKbIndex(name);
  }catch(e){
    logger.warn({ err: String((e as Error).message || e), kb: name }, 'kb 索引重建失败');
    res.status(500).json({ error:'kb store failed' });
    return;
  }
  res.status(201).json({ ok:true, kb:name, filename, bytes, chunks:chunks.length });
};

/* ---------- body 解析错误映射（随路由同栈注册，server.ts 不加全局错误器） ----------
 * express.text 字节闸/字符集错误 → 413/415；其余 body 解析错 → 400；
 * 统一 { error } JSON 形态，细节进 logger 不进响应（workbench/routes.ts 风格）。 */
export const kbUploadErrorMapper: ErrorRequestHandler = (err, _q, res, _n)=>{
  const type = (err && typeof err === 'object' && 'type' in err)
    ? String((err as { type?: unknown }).type) : '';
  if(type === 'entity.too.large'){
    res.status(413).json({ error:'文件超限：单文件上限 5 MiB' });
    return;
  }
  if(type === 'charset.unsupported'){
    res.status(415).json({ error:'不支持的字符集：仅支持 UTF-8' });
    return;
  }
  logger.warn({ err: String((err as Error)?.message || err), type }, 'kb 上传 body 解析失败');
  res.status(400).json({ error:'请求体解析失败' });
};
