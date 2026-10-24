/* ================================================================
 *  mcp/http.ts — Streamable HTTP 传输构造（迭代 0023 / BK-0028 · ADR-0012）
 *  ADR §3「Streamable HTTP 先行」：向用户配置的 endpoint 发 JSON-RPC POST，
 *  无进程管理面；协议演进负担（会话头/元数据头镜像/Base64 sentinel）全部
 *  由 SDK 承担。close 拆链 = transport.terminateSession()（协议允许 server
 *  405 拒绝与网络错误，best-effort 吞错不阻断）→ client.close()。
 *  fetch 注入点（BK-0030 前向兼容承载面，SPEC §2-V5/V6 实核）：
 *  StreamableHTTPClientTransportOptions.fetch?: FetchLike——本轮生产默认
 *  undefined（SDK 全局 fetch）；BK-0030 落地 guard mcpFetch 后以
 *  createHttpMcpConnection(id, url, { fetch: mcpFetch }) 完成收口，本文件
 *  零改动（开闭）。本轮不 import guard.ts：注入点是参数而非硬编码。
 * ================================================================ */
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import type { FetchLike } from '@modelcontextprotocol/client';
import { BaseMcpConnection } from './connection.js';
import type { McpConnection } from './connection.js';

export interface HttpMcpOptions {
  fetch?: FetchLike;          /* BK-0030 将注入 guard 的 mcpFetch；默认 SDK 全局 fetch */
  requestInit?: RequestInit;  /* 透传 SDK（如自定义 headers） */
}

class HttpMcpConnection extends BaseMcpConnection {
  private readonly transport2: StreamableHTTPClientTransport;

  constructor(serverId: string, url: URL, opts?: HttpMcpOptions) {
    const transport = new StreamableHTTPClientTransport(url, {
      fetch: opts?.fetch,
      requestInit: opts?.requestInit,
    });
    super(serverId, transport);
    this.transport2 = transport;
  }

  /* best-effort 拆链：server 可 405 拒绝 DELETE / 网络错误——吞掉，不阻断后续 client.close() */
  protected async teardown(): Promise<void> {
    try { await this.transport2.terminateSession(); } catch { /* 405/网络错误容忍（SPEC §3.2） */ }
  }
}

export function createHttpMcpConnection(serverId: string, url: string | URL, opts?: HttpMcpOptions): McpConnection {
  return new HttpMcpConnection(serverId, url instanceof URL ? url : new URL(url), opts);
}
