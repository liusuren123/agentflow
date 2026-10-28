/* ================================================================
 *  embed.ts — kb 管道·嵌入段（迭代 0064 / BK-0019 · ADR-0020 §3/§4.3）
 *  推荐案 L1 本地词法嵌入 = bigram TF-IDF：
 *    · terms()      自 kb.ts:43-54 等距迁移（函数体逐字保留：拉丁词 + CJK 二字组）
 *    · DocVec       自 kb.ts:57 迁出
 *    · buildDocVecs 自 kb.ts:59-77 索引构建循环机械提取为纯函数——同一 KB 内
 *      先算 df（含词条的文档数）与 N（文档数），再逐文档 TF-IDF 加权与 L2 归一。
 *  数值语义逐字保留（权重式 / Math.log 形态 / ||1 兜底）——等价性支柱一：
 *  本函数对相同输入产生与改造前逐位相同的 vec/norm（AC4 零漂移硬边界）。
 *  纯函数模块：零 import、零 IO、零出站。
 * ================================================================ */

/* ---------- 切词：拉丁词 + CJK 二字组（kb.ts:43-54 原文） ---------- */
export function terms(text: unknown): string[] {
  const out: string[] = [];
  const s = String(text ?? '');
  const latin = s.toLowerCase().match(/[a-z0-9]+/g) || [];
  out.push(...latin);
  const cjk = s.match(/[\u4e00-\u9fa5]+/g) || [];
  for(const seg of cjk){
    if(seg.length === 1) out.push(seg);
    for(let i=0; i<seg.length-1; i++) out.push(seg.slice(i, i+2));
  }
  return out;
}

/* ---------- 文档向量类型（kb.ts:57 原文迁出） ---------- */
export type DocVec = { vec: Map<string, number>; norm: number; src: string; text: string };

/* ---------- TF-IDF 索引构建（kb.ts:59-77 循环体机械提取；纯函数） ----------
 * 入参 docs = 同一 KB 的全量 chunk（声明序即输出序）；调用方（kb.ts）负责
 * 自 DB 取数与缓存——本模块不持有任何状态。 */
export function buildDocVecs(docs: { src: string; text: string }[]): DocVec[] {
  const df = new Map<string, number>();
  const docVecs = docs.map(d=>{
    const vec = new Map<string, number>();
    for(const t of terms(d.text)) vec.set(t, (vec.get(t) || 0)+1);
    for(const t of vec.keys()) df.set(t, (df.get(t) || 0)+1);
    return { vec, src:d.src, text:d.text };
  });
  const N = docs.length;
  return docVecs.map(d=>{
    const vec = new Map<string, number>();
    let norm = 0;
    for(const [t,tf] of d.vec){
      const idf = Math.log(1 + N/(df.get(t) || 1));
      const w = (1+Math.log(tf)) * idf;
      vec.set(t, w); norm += w*w;
    }
    return { vec, norm:Math.sqrt(norm)||1, src:d.src, text:d.text };
  });
}
