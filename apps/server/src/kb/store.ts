/* ================================================================
 *  store.ts — kb 管道·入库段：kb 自有仓储（迭代 0064 / BK-0019）
 *  承载 = ADR-0020 §6 案甲：同一主库文件 data/agentflow.db 的第二个
 *  better-sqlite3 连接（pty/audit.ts:1-60 直系同构：WAL 同库、
 *  busy_timeout=2000 兜底跨进程并发、DDL 收敛自有模块、store.ts 主仓储
 *  零改动）。kb_ 前缀域三表与主仓储六表无联合查询、无外键（领域正交）。
 *  SQL 收敛本模块：路由与索引层只见函数。
 * ================================================================ */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../logger.js';

/* dist/kb/store.js → 仓库根（pty/audit.ts:17 ROOT 派生式同型，同退四层） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DB_FILE = path.join(ROOT, 'data', 'agentflow.db');

export interface KbChunk { src: string; text: string }
export interface KbStat { name: string; docs: number; chunks: number; updated_at: number }

let db: Database.Database | null = null;

/* DDL 终稿（SPEC §3.3）：表名 kb_ 前缀域防撞名（pty_audits 先例同型），
 * 字段集合与 ADR-0020 §2.3 草案（kbs/documents/chunks）逐项对应。
 * 逐条单语句 prepare 执行（非多语句 exec）：DDL 为模块级常量、零用户输入，
 * 单语句形态即静态可核（安全面更窄，语义与 exec 多语句块等价、幂等不变）。 */
const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS kbs(
    name TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS kb_documents(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kb_name TEXT NOT NULL,
    filename TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_kb_documents_kb ON kb_documents(kb_name)`,
  `CREATE TABLE IF NOT EXISTS kb_chunks(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER NOT NULL,
    seq INTEGER NOT NULL,
    src TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc ON kb_chunks(doc_id)`,
];

/* ---------- 启动期开连接 + DDL（server.ts initStore 之后调用；幂等） ---------- */
export function initKbStore(): void {
  if(db) return;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('busy_timeout = 2000');
  for(const stmt of DDL) db.prepare(stmt).run();
  logger.info('kb 知识库存储已就绪');
}

/* ---------- 优雅停机关连接（server.ts closeStore 之前调用） ---------- */
export function closeKbStore(): void {
  if(!db) return;
  try{ db.close(); }catch{ /* 已关闭 */ }
  db = null;
}

/* 连接访问器：懒自启兜底（kb.ts ensureIndex 的防御路径——server.ts 显式
 * initKbStore 之外被导入时各函数自洽；幂等 DDL 保证任意序安全） */
function conn(): Database.Database {
  if(!db) initKbStore();
  return db!;
}

/* ---------- 入库：单事务（SPEC §3.3）
 * ① kbs UPSERT（不存在 → INSERT created_at/updated_at=now；存在 → 仅刷 updated_at）
 * ② 同 (kb_name, filename) 旧行替换：先 DELETE 其 kb_chunks 行再 DELETE kb_documents 行
 * ③ INSERT 新 kb_documents 行 ④ 批量 INSERT kb_chunks（seq 自 1 递增）
 * —— 替换语义 = 重复上传同 filename 以新换旧，计数不膨胀（幂等重跑锚）。 */
export function insertDocument(kbName: string, filename: string, bytes: number,
                               chunks: KbChunk[]): void {
  const d = conn();
  const now = Date.now();
  d.transaction(()=>{
    const has = d.prepare('SELECT 1 FROM kbs WHERE name = ?').get(kbName);
    if(has) d.prepare('UPDATE kbs SET updated_at = ? WHERE name = ?').run(now, kbName);
    else d.prepare('INSERT INTO kbs(name, created_at, updated_at) VALUES(?,?,?)').run(kbName, now, now);
    const oldDocs = d.prepare('SELECT id FROM kb_documents WHERE kb_name = ? AND filename = ?')
      .all(kbName, filename) as { id: number }[];
    const delChunks = d.prepare('DELETE FROM kb_chunks WHERE doc_id = ?');
    const delDoc = d.prepare('DELETE FROM kb_documents WHERE id = ?');
    for(const od of oldDocs){ delChunks.run(od.id); delDoc.run(od.id); }
    const docId = Number(d.prepare(
      'INSERT INTO kb_documents(kb_name, filename, bytes, created_at) VALUES(?,?,?,?)')
      .run(kbName, filename, bytes, now).lastInsertRowid);
    const ins = d.prepare(
      'INSERT INTO kb_chunks(doc_id, seq, src, text, created_at) VALUES(?,?,?,?,?)');
    chunks.forEach((c, i)=>{ ins.run(docId, i + 1, c.src, c.text, now); });
  })();
}

/* ---------- 单 KB chunk 计数（上限闸用，routes INSERT 前 SELECT 判定） ---------- */
export function countKbChunks(kbName: string): number {
  const row = conn().prepare(`
    SELECT COUNT(*) AS n FROM kb_chunks c
      JOIN kb_documents d ON c.doc_id = d.id
    WHERE d.kb_name = ?`).get(kbName) as { n: number };
  return row.n;
}

/* ---------- 清单聚合：docs=documents 计数、chunks=chunks 计数 ----------
 * ORDER BY name（BINARY = UTF-8 字节序 = 码点序）——确定性输出序（§4.2）。 */
export function listKbStats(): KbStat[] {
  return conn().prepare(`
    SELECT k.name AS name, k.updated_at AS updated_at,
      (SELECT COUNT(*) FROM kb_documents d WHERE d.kb_name = k.name) AS docs,
      (SELECT COUNT(*) FROM kb_chunks c JOIN kb_documents d ON c.doc_id = d.id
        WHERE d.kb_name = k.name) AS chunks
    FROM kbs k ORDER BY k.name`).all() as KbStat[];
}

/* ---------- 全量 chunk 取数：索引重建用 ----------
 * ORDER BY kb_documents.id, kb_chunks.seq —— 保持声明序（等价性支柱三：
 * DocVec 数组序 = seed 声明序 = 改造前数组序 ⇒ 平分时输出序一致）。 */
export function listChunksByKb(kbName: string): KbChunk[] {
  return conn().prepare(`
    SELECT c.src AS src, c.text AS text
    FROM kb_chunks c JOIN kb_documents d ON c.doc_id = d.id
    WHERE d.kb_name = ?
    ORDER BY d.id, c.seq`).all(kbName) as KbChunk[];
}
