/* ================================================================
 *  guard.ts — 出站请求 URL 守卫（SSRF 防护）
 *  工作流的 HTTP 节点 / Webhook 通知 / fetch 工具都会按用户配置的
 *  URL 发起服务端请求；默认拦截私网/回环/链路本地目标，防止页面
 *  借本地引擎探测内网。需要访问内网（如本地 Ollama）时设置
 *  环境变量 ALLOW_PRIVATE_NET=1（经 config.ts zod 校验后生效）。
 * ================================================================ */
import dns from 'node:dns/promises';
import net from 'node:net';
import { config } from './config.js';

const ALLOW_PRIVATE = config.allowPrivateNet;

function isPrivateIp(ip: string): boolean {
  if(net.isIPv4(ip)){
    const [a, b] = ip.split('.').map(Number) as [number, number];
    if(a === 0 || a === 10 || a === 127) return true;                 // 0.x / 10.x / loopback
    if(a === 169 && b === 254) return true;                           // link-local
    if(a === 172 && b >= 16 && b <= 31) return true;                  // 172.16/12
    if(a === 192 && b === 168) return true;                           // 192.168/16
    if(a === 100 && b >= 64 && b <= 127) return true;                 // CGNAT 100.64/10
    if(a >= 224) return true;                                         // 组播/保留
    return false;
  }
  const low = ip.toLowerCase();
  if(low === '::1' || low === '::') return true;
  if(low.startsWith('fe8') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb')) return true; // link-local
  if(low.startsWith('fc') || low.startsWith('fd')) return true;       // ULA
  if(low.startsWith('::ffff:')) return isPrivateIp(low.slice(7));     // IPv4-mapped
  return false;
}

export async function assertPublicUrl(raw: unknown): Promise<URL> {
  let u: URL;
  try{ u = new URL(String(raw)); }catch{ throw new Error(`无效 URL：${raw}`); }
  if(u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`仅允许 http(s) 协议（收到 ${u.protocol}）`);
  if(ALLOW_PRIVATE) return u;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
  if(host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host === 'metadata.google.internal'){
    throw new Error(`目标 ${host} 属于内网/本地地址，已拦截（如确需访问请设置 ALLOW_PRIVATE_NET=1）`);
  }
  if(net.isIP(host)){
    if(isPrivateIp(host)) throw new Error(`目标 ${host} 是私网地址，已拦截（如确需访问请设置 ALLOW_PRIVATE_NET=1）`);
    return u;
  }
  try{
    const addrs = await dns.lookup(host, { all:true });
    for(const { address } of addrs){
      if(isPrivateIp(address)) throw new Error(`${host} 解析到私网地址 ${address}，已拦截（如确需访问请设置 ALLOW_PRIVATE_NET=1）`);
    }
  }catch(e){
    if(e && /已拦截/.test(String((e as Error).message))) throw e;
    /* DNS 解析失败：放行，让 fetch 报原始错误 */
  }
  return u;
}

/* 带守卫的 fetch：所有用户可控 URL 的出站请求都走这里 */
export async function guardedFetch(rawUrl: unknown, opts: RequestInit = {}): Promise<Response> {
  await assertPublicUrl(rawUrl);
  return fetch(rawUrl as string | URL, opts);
}

/* ================================================================
 *  固定主机出站网关：联网搜索的两个外部 API 出口集中在本安全模块。
 *  目标主机为编译期常量（不可能被引导至内网/任意地址），
 *  用户查询只进入请求体或经 URL API 编码后的查询参数。
 * ================================================================ */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgentFlow/1.0';

export async function bochaWebSearch(q: string, count: number): Promise<Response> {
  await assertPublicUrl('https://api.bochaai.com/v1/web-search');
  return fetch('https://api.bochaai.com/v1/web-search', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${config.bochaApiKey}` },
    body: JSON.stringify({ query:q, summary:true, count }),
    signal: AbortSignal.timeout(15000),
  });
}

export async function ddgHtmlSearch(q: string): Promise<Response> {
  const u = new URL('https://html.duckduckgo.com/html/');
  u.searchParams.set('q', q);
  await assertPublicUrl(u);
  return fetch(u, { headers:{ 'User-Agent':UA }, signal: AbortSignal.timeout(12000) });
}

/* SearXNG 动态主机网关（迭代 0005 · BK-0007）：目标主机来自运维 env
 * SEARXNG_URL（非常量），经 assertPublicUrl 动态校验（私网/回环默认拦截，
 * 自托管内网实例走 ALLOW_PRIVATE_NET=1 逃生）后请求——与固定主机网关
 * 同层集中出口。查询词只经 URL API 编码进查询参数。count 不进请求
 * （SearXNG JSON 格式无服务端条数参数），由调用方在结果侧截断。 */
export async function searxngSearch(baseUrl: string, q: string, count: number): Promise<Response> {
  const u = new URL(baseUrl);
  u.pathname = u.pathname.replace(/\/+$/, '') + '/search';
  u.searchParams.set('q', q);
  u.searchParams.set('format', 'json');
  await assertPublicUrl(u);
  return fetch(u, { headers:{ 'User-Agent':UA }, signal: AbortSignal.timeout(12000) });
}

/* MCP Streamable HTTP 出站网关（迭代 0025 / BK-0030 · ADR-0012 §6.2）：
 * 目标主机来自运维 env 注册表（MCP_HTTP_SERVERS），经 assertPublicUrl 动态
 * 校验后请求——与 searxngSearch 动态主机网关同层集中出口；作为 SDK transport
 * 的 fetch 注入（http.ts HttpMcpOptions.fetch，BK-0028 预留注入面）。
 * init.signal 由连接层注入（callTool 30s 硬顶在 connection.ts）。 */
export async function mcpFetch(rawUrl: unknown, init: RequestInit = {}): Promise<Response> {
  return guardedFetch(rawUrl, init);
}
