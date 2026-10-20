/* ================================================================
 *  search.ts — 网页搜索（websearch 节点 & web-search MCP 工具共用）
 *  优先级：BOCHA_API_KEY（博查，国内可用）> DuckDuckGo HTML > 不可用
 *  不可用时返回 null（由调用方决定降级行为），绝不伪造结果。
 *  本模块不含任何网络出口：两个外部 API 的请求由 guard.ts 的
 *  固定主机网关（bochaWebSearch / ddgHtmlSearch）代发，
 *  目标主机为编译期常量，用户查询只进请求体或编码后的查询参数。
 * ================================================================ */
import { bochaWebSearch, ddgHtmlSearch } from './guard.js';

export interface SearchResult { title: string; url: string; snippet: string }
export interface SearchResponse { engine: string; results: SearchResult[] }

export async function webSearch(query: unknown, count = 5): Promise<SearchResponse | [] | null> {
  const q = String(query ?? '').trim();
  if(!q) return [];
  const n = Math.min(20, Math.max(1, count|0));

  if(process.env.BOCHA_API_KEY){
    try{
      const r = await bochaWebSearch(q, n);
      if(r.ok){
        const j: any = await r.json();
        const pages: any[] = j?.data?.webPages?.value || [];
        const out = pages.slice(0, n).map(p=>({ title:p.name, url:p.url, snippet:(p.summary||p.snippet||'').slice(0,200) }));
        if(out.length) return { engine:'博查', results:out };
      }
    }catch{ /* 落到下一种 */ }
  }

  /* DuckDuckGo HTML 版（无密钥可用；部分地区网络不可达） */
  try{
    const r = await ddgHtmlSearch(q);
    if(r.ok){
      const html = (await r.text()).slice(0, 600*1024);
      const decode = (s: string) => s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();
      const out: SearchResult[] = [];
      for(const m of html.matchAll(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)){
        if(out.length >= n) break;
        const title = decode(m[2] || '');
        let url = m[1] || '';
        const uddg = url.match(/[?&]uddg=([^&]+)/);
        if(uddg) url = decodeURIComponent(uddg[1]!);
        if(title && url.startsWith('http')) out.push({ title, url, snippet:'' });
      }
      if(out.length){
        let i = 0;
        for(const m of html.matchAll(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)){
          if(i >= out.length) break;
          out[i++]!.snippet = decode(m[1] || '').slice(0,200);
        }
        return { engine:'DuckDuckGo', results:out };
      }
    }
  }catch{ /* 不可用 */ }

  return null; /* 未配置且网络不可达 */
}
