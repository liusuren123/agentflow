/* ================================================================
 *  kb.ts — 知识库检索（bigram TF-IDF 余弦；迭代 0064 / BK-0019 索引源改造）
 *  语料面自「三固定 demo 库硬编码」升级为「DB 播种 + 上传管道」：
 *    · KB 常量（原 :7-40）迁出 → kb/seed.ts（逐字迁移幂等播种）
 *    · terms()/索引构建循环迁出 → kb/embed.ts（等距迁移纯函数）
 *    · 索引启动期自 DB 读 chunk 重建（initKbIndex，server.ts 显式调用为主
 *      路径——fail-fast；retrieve()/kbNames() 入口 ensureIndex() 懒构建兜底）
 *  retrieve()（原 :81-96）签名与打分语义逐字不变——handlers.ts:40-53 零改动；
 *  kbNames()（原 :98，现零消费）改自索引派生。清单端点数据源 = indexMeta
 *  （kb/routes.ts → kbStats()，ADR-0020 §5「进程内索引派生只读」）。
 *  等价性支柱三（SPEC §5）：listChunksByKb ORDER BY doc id, seq = seed 声明序
 *  = 改造前数组序 ⇒ 排序平分时输出序一致 ⇒ 检索输出逐位一致（AC4）。
 * ================================================================ */
import { buildDocVecs, terms } from './kb/embed.js';
import type { DocVec } from './kb/embed.js';
import { listChunksByKb, listKbStats } from './kb/store.js';

type KbMeta = { docs: number; chunks: number; updated_at: number };
const index = new Map<string, DocVec[]>();        // kbName -> [{vec, norm, src, text}]
const indexMeta = new Map<string, KbMeta>();      // kbName -> {docs, chunks, updated_at}（清单端点数据源）
let built = false;                                // ensureIndex 幂等标记

/* ---------- 索引构建（原 :56-78 循环体已迁 embed.buildDocVecs） ---------- */
export function initKbIndex(): void {
  index.clear();
  indexMeta.clear();
  for(const st of listKbStats()){
    const vecs = buildDocVecs(listChunksByKb(st.name));
    if(vecs.length === 0) continue;               // 零 chunk 库防御：不入索引
    index.set(st.name, vecs);
    indexMeta.set(st.name, { docs: st.docs, chunks: st.chunks, updated_at: st.updated_at });
  }
  built = true;
}

/* 入库后单库重建（kb/routes.ts 上传成功后触发；chunk 计 0 → 摘除该键防御） */
export function rebuildKbIndex(name: string): void {
  const st = listKbStats().find(s => s.name === name);
  const vecs = st ? buildDocVecs(listChunksByKb(name)) : [];
  if(vecs.length === 0){ index.delete(name); indexMeta.delete(name); }
  else{
    index.set(name, vecs);
    indexMeta.set(name, { docs: st!.docs, chunks: st!.chunks, updated_at: st!.updated_at });
  }
  built = true;
}

/* 懒构建兜底：防御 server.ts 显式 init 之外的导入路径（幂等） */
function ensureIndex(): void {
  if(!built) initKbIndex();
}

/* ---------- kb 清单（行序 = listKbStats 的 name 码点升序，确定性） ---------- */
export function kbStats(): { name: string; docs: number; chunks: number; updated_at: number }[] {
  ensureIndex();
  return [...indexMeta.entries()].map(([name, m]) => ({ name, docs: m.docs, chunks: m.chunks, updated_at: m.updated_at }));
}

/* ---------- 检索（原 :81-96 逐字保留；仅入口加 ensureIndex） ---------- */
export function retrieve(kbName: string, query: string, topK = 3, threshold = 0.05){
  ensureIndex();
  const docs = index.get(kbName) || index.get('产品手册 v2.3') || [];
  const qTerms = terms(query);
  if(!qTerms.length) return [];
  const qVec = new Map<string, number>();
  for(const t of qTerms) qVec.set(t, (qVec.get(t) || 0)+1);
  let qNorm = 0;
  for(const [t,tf] of qVec){ const w = 1+Math.log(tf); qVec.set(t,w); qNorm += w*w; }
  qNorm = Math.sqrt(qNorm)||1;
  const scored = docs.map(d=>{
    let dot = 0;
    for(const [t,w] of qVec){ const dw = d.vec.get(t); if(dw) dot += w*dw; }
    return { score:+(dot/(qNorm*d.norm)).toFixed(4), src:d.src, text:d.text };
  }).filter(r=>r.score >= threshold).sort((a,b)=>b.score-a.score);
  return scored.slice(0, Math.max(1, topK|0));
}

export function kbNames(): string[] { ensureIndex(); return [...index.keys()]; }
