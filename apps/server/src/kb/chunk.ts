/* ================================================================
 *  chunk.ts — kb 管道·切分段（迭代 0064 / BK-0019 · ADR-0020 §4.2）
 *  段落边界优先（空行分段）+ 目标块长 500（JS string.length，CJK 口径）
 *  + 相邻块重叠 50 + 超长段硬切（步幅 450 开窗）。确定性算法，无随机。
 *  chunk src 沿用 kb.ts 语料 § 标注形态（`${filename} §${seq}`，seq 自 1 起）。
 *  纯函数模块：零 import、零 IO、零出站。
 * ================================================================ */

/* 参数终值（SPEC §3.2：ADR-0020 §4.2 草案值转正） */
export const CHUNK_TARGET = 500;   /* 目标块长（JS string.length，CJK 口径） */
export const CHUNK_OVERLAP = 50;   /* 相邻块重叠（硬切步幅 = 500-50 = 450） */

/* ---------- 超长段硬切：步幅 450 开窗 [i, i+500) ----------
 * 尾窗两分支（SPEC §3.2 第 5 步）：开窗后剩余 ≤ 50 → 尾接并入本窗（块长上浮
 * 至 ≤550，目标软容差）；剩余 ∈ (50, 500] → 循环退出后末窗收尾切片。
 * 邻窗重叠恰 50（= CHUNK_TARGET - CHUNK_OVERLAP）。边界例（KB06 锚）：
 * 1200 字单段 → [0,500)/[450,950)/[900,1200) = 3 块。 */
function hardSplit(p: string): string[] {
  const L = p.length;
  const out: string[] = [];
  let i = 0;
  while(L - i > CHUNK_TARGET){
    let end = i + CHUNK_TARGET;
    if(L - end <= CHUNK_OVERLAP) end = L;   /* 剩余 ≤ 50：并入本窗（尾接） */
    out.push(p.slice(i, end));
    if(end === L){ i = L; break; }
    i += CHUNK_TARGET - CHUNK_OVERLAP;
  }
  if(i < L) out.push(p.slice(i));
  return out;
}

/* ---------- 切分主入口（SPEC §3.2 六步） ----------
 * 空 / 纯空白归一后为 '' → 返回 []（调用方 400 如实拒绝，不静默入库）。 */
export function chunkText(raw: string, filename: string): { src: string; text: string }[] {
  /* 1. 归一：去 BOM → CRLF/CR 归一为 \n → 整体 trim */
  const s = String(raw ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if(!s) return [];
  /* 2-3. 空行分段；段内 \n+ 折叠为单空格并 trim；纯空白段丢弃 */
  const paras = s.split(/\n[ \t]*\n+/)
    .map(p => p.replace(/\n+/g, ' ').trim())
    .filter(p => p.length > 0);
  /* 4-5. 贪心合并（段落边界优先）+ 超长段硬切 */
  const blocks: string[] = [];
  let cur = '';
  for(const p of paras){
    if(p.length > CHUNK_TARGET){
      if(cur){ blocks.push(cur); cur = ''; }
      blocks.push(...hardSplit(p));
      continue;
    }
    if(!cur){ cur = p; continue; }
    if(cur.length + 1 + p.length <= CHUNK_TARGET) cur += '\n' + p;
    else { blocks.push(cur); cur = p; }
  }
  if(cur) blocks.push(cur);
  /* 6. 输出：src = filename + § 块序（自 1 起） */
  return blocks.map((b, i) => ({ src: `${filename} §${i + 1}`, text: b }));
}
