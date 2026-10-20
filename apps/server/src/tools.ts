/* ================================================================
 *  tools.ts — LLM 节点 MCP 工具的真实实现（供 AI SDK tool 调用）
 *  与前端 MCP_SERVERS 注册表一一对应；文件操作全部限制在
 *  server/sandbox/ 目录内（路径穿越防护），未实现的工具如实返回
 *  "not implemented"，不伪造结果。
 * ================================================================ */
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webSearch } from './search.js';
import type { SearchResponse } from './search.js';
import { guardedFetch } from './guard.js';

/* 编译产物位于 dist/，沙箱锚定到包根 apps/server/sandbox（与 TS 化前一致） */
const SANDBOX = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'sandbox');

async function safePath(rel: unknown): Promise<string> {
  const p = path.resolve(SANDBOX, String(rel ?? '').replace(/^[/\\]+/,''));
  if(p !== SANDBOX && !p.startsWith(SANDBOX + path.sep)) throw new Error('路径越界：只允许访问沙箱目录');
  return p;
}
async function ensureSandbox(){ await fsp.mkdir(SANDBOX, { recursive:true }); }

type ToolImpl = (args: any) => Promise<any>;

const IMPL: Record<string, Record<string, ToolImpl> | null> = {
  'filesystem': {
    read_file: async ({ path: rel }) => {
      const p = await safePath(rel);
      return { path:rel, content:(await fsp.readFile(p,'utf8')).slice(0, 200*1024) };
    },
    write_file: async ({ path: rel, content }) => {
      const p = await safePath(rel);
      await fsp.mkdir(path.dirname(p), { recursive:true });
      await fsp.writeFile(p, String(content ?? ''), 'utf8');
      return { path:rel, bytes:Buffer.byteLength(String(content ?? '')) };
    },
    list_directory: async ({ path: rel = '' }) => {
      const p = await safePath(rel);
      const names = await fsp.readdir(p, { withFileTypes:true });
      return { entries: names.map(d=>({ name:d.name, type:d.isDirectory()?'dir':'file' })) };
    },
  },
  'fetch': {
    fetch: async ({ url }) => {
      const r = await guardedFetch(url, { signal: AbortSignal.timeout(15000), headers:{ 'User-Agent':'AgentFlow/1.0' } });
      const text = (await r.text()).slice(0, 200*1024);
      return { status:r.status, contentType:r.headers.get('content-type') || '', excerpt:text.slice(0, 4000) };
    },
    download: async ({ url }) => {
      const r = await guardedFetch(url, { signal: AbortSignal.timeout(20000) });
      const buf = Buffer.from(await r.arrayBuffer());
      const name = 'download-' + Date.now() + '-' + (String(url).split('/').pop() || 'file').replace(/[^\w.-]/g,'_').slice(0,60);
      await ensureSandbox();
      await fsp.writeFile(path.join(SANDBOX, name), buf);
      return { savedAs:name, bytes:buf.length, status:r.status };
    },
  },
  'sqlite': null,   /* 未实现：如实告知模型 */
  'browser': null,  /* 未实现 */
  'web-search': {
    search: async ({ query, count = 5 }) => {
      const res = (await webSearch(query, count)) as SearchResponse | null;
      if(!res) return { available:false, note:'搜索服务不可用（未配置 BOCHA_API_KEY 且 DuckDuckGo 不可达）' };
      return { engine:res.engine, results:res.results };
    },
    news: async ({ query, count = 5 }) => {
      const res = (await webSearch(query + ' 最新消息 新闻', count)) as SearchResponse | null;
      if(!res) return { available:false, note:'搜索服务不可用' };
      return { engine:res.engine, results:res.results };
    },
  },
};

export interface ToolSpec { desc: string; schema: Record<string, string> }

export const TOOL_SPECS: Record<string, ToolSpec> = {
  'filesystem.read_file':      { desc:'读取沙箱目录内的文本文件', schema:{ path:'要读取的相对路径' } },
  'filesystem.write_file':     { desc:'将文本写入沙箱目录内的文件', schema:{ path:'相对路径', content:'要写入的内容' } },
  'filesystem.list_directory': { desc:'列出沙箱目录的内容', schema:{ path:'相对路径，可为空' } },
  'fetch.fetch':               { desc:'抓取一个 http(s) URL，返回正文摘录', schema:{ url:'完整 URL' } },
  'fetch.download':            { desc:'下载 URL 资源保存到沙箱目录', schema:{ url:'URL' } },
  'web-search.search':         { desc:'联网搜索，返回标题/链接/摘要', schema:{ query:'搜索关键词', count:'结果数量，默认5' } },
  'web-search.news':           { desc:'检索某话题的最新新闻', schema:{ query:'话题关键词', count:'结果数量，默认5' } },
  'sqlite.query':              { desc:'（未实现）执行 SQL 查询', schema:{ sql:'SQL 语句' } },
  'sqlite.execute':            { desc:'（未实现）执行 SQL 写入', schema:{ sql:'SQL 语句' } },
  'browser.navigate':          { desc:'（未实现）打开页面', schema:{ url:'URL' } },
  'browser.click':             { desc:'（未实现）点击元素', schema:{ selector:'选择器' } },
  'browser.screenshot':        { desc:'（未实现）截屏', schema:{} },
};

/* 把节点勾选的 mcp 配置（{serverId:[toolName,...]}）展开为 {toolName: impl} 映射 */
export function collectTools(mcpSel: Record<string, unknown> | undefined | null): Map<string, ToolImpl> {
  const out = new Map<string, ToolImpl>();
  for(const [server, names] of Object.entries(mcpSel || {})){
    if(!Array.isArray(names)) continue;
    for(const n of names){
      const group = IMPL[server];
      if(group && typeof group[n] === 'function') out.set(`${server}.${n}`, group[n]!);
      else out.set(`${server}.${n}`, async ()=>({ error:'not implemented', note:`工具 ${server}.${n} 未接入真实实现` }));
    }
  }
  return out;
}
