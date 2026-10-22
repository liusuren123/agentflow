/* ================================================================
 *  search.ts — 网页搜索（websearch 节点 & web-search MCP 工具共用）
 *  优先级：BOCHA_API_KEY（博查，国内可用）> DuckDuckGo HTML > 不可用
 *  不可用时返回 null（由调用方决定降级行为），绝不伪造结果。
 *  另提供严格路由调用器（迭代 0005 · BK-0007）：strictBochaSearch /
 *  strictSearxngSearch 供 websearch 节点 eng=博查/SearXNG 专用——失败或
 *  未配置一律如实跳过（{skipped, reason}），不走回退链、不换引擎。
 *  本模块不含任何网络出口：外部 API 的请求由 guard.ts 的网关
 *  （bochaWebSearch / ddgHtmlSearch / searxngSearch）代发，
 *  目标主机为编译期常量或运维 env（经 guard 校验），用户查询只进
 *  请求体或编码后的查询参数。
 * ================================================================ */
import { bochaWebSearch, ddgHtmlSearch, searxngSearch } from './guard.js';
import { config } from './config.js';

export interface SearchResult { title: string; url: string; snippet: string }
export interface SearchResponse { engine: string; results: SearchResult[] }

export async function webSearch(query: unknown, count = 5): Promise<SearchResponse | [] | null> {
  const q = String(query ?? '').trim();
  if(!q) return [];
  const n = Math.min(20, Math.max(1, count|0));

  if(config.bochaApiKey){
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

/* ---------------- 严格路由调用器（迭代 0005 · BK-0007 · SPEC §3.2） ----------------
 * 与 webSearch 的回退链语义相反：未配置/请求失败一律返回 {skipped, reason}
 * 如实跳过，不回退其他引擎、不重试、不伪造结果（REQ-0007-01）。
 * reason 为短原因短语（所缺变量名/失败短语，恰好是冒烟可断言子串），
 * 不含 eng 值——eng 由 handler 组装文案，保持单一文案出口。 */
export type StrictResult = SearchResponse | [] | { skipped: true; reason: string };

const normQ = (query: unknown): string => String(query ?? '').trim();
const clampN = (count: number): number => Math.min(20, Math.max(1, count|0));

export async function strictBochaSearch(query: unknown, count = 5): Promise<StrictResult> {
  const q = normQ(query);
  if(!q) return [];
  const n = clampN(count);
  if(!config.bochaApiKey) return { skipped:true, reason:'未配置 BOCHA_API_KEY' };
  try{
    const r = await bochaWebSearch(q, n);
    if(!r.ok) return { skipped:true, reason:'博查 API 请求失败' };
    const j: any = await r.json();
    const pages: any[] = j?.data?.webPages?.value || [];
    const out = pages.slice(0, n).map(p=>({ title:p.name, url:p.url, snippet:(p.summary||p.snippet||'').slice(0,200) }));
    return { engine:'博查', results:out };   /* 0 条也算成功 */
  }catch{
    return { skipped:true, reason:'博查 API 请求失败' };   /* 网络异常/JSON 解析失败 */
  }
}

export async function strictSearxngSearch(query: unknown, count = 5): Promise<StrictResult> {
  const q = normQ(query);
  if(!q) return [];
  const n = clampN(count);
  const baseUrl = config.searxngUrl;
  if(!baseUrl) return { skipped:true, reason:'未配置 SEARXNG_URL' };
  try{
    const r = await searxngSearch(baseUrl, q, n);
    if(!r.ok) return { skipped:true, reason:'SearXNG 实例请求失败' };
    const j: any = await r.json();
    const list: any[] = Array.isArray(j?.results) ? j.results : [];
    const out = list.slice(0, n).map(x=>({ title:x.title, url:x.url, snippet:String(x.content||'').slice(0,200) }));
    return { engine:'SearXNG', results:out };   /* 0 条也算成功；字段缺失按空串容错 */
  }catch{
    /* 网络/超时/guard 拦截（内网目标未开 ALLOW_PRIVATE_NET）/JSON 解析失败，统一归并 */
    return { skipped:true, reason:'SearXNG 实例请求失败' };
  }
}
