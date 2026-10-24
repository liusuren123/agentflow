/* ================================================================
 *  mcp/connection.ts — 真 MCP client 统一连接抽象（迭代 0023 / BK-0028）
 *  ADR-0012 §3：McpConnection 五面（serverId / connect / listTools /
 *  callTool / close）+ timeoutMs 参数化；双传输（http.ts / stdio.ts）各为
 *  本抽象的一个构造分支，上层注册与注入（BK-0029/0030）对传输类型无感知。
 *  超时直传 SDK RequestOptions.timeout：超时抛 SdkError code=REQUEST_TIMEOUT，
 *  如实向外抛出不伪造结果（沿 tools.ts:4-5 原则）；SDK 自身 60s 默认因
 *  恒显式传值不生效。abort 走 RequestOptions.signal（callTool 可选第 4 参，
 *  承载 BK-0029/0030 时代 run 中止级联；SDK 原生 AbortError 语义）。
 *  本模块零生产调用路径（唯一消费者 = tests/smoke/mcp-transport.mjs）；
 *  任何真实 endpoint 出站必须经 guard 收口（BK-0030，ADR §6.2）。
 * ================================================================ */
import { Client } from '@modelcontextprotocol/client';
import type { Transport } from '@modelcontextprotocol/client';

export interface McpToolInfo {
  name: string;
  desc: string;
  inputSchema: Record<string, unknown>;
}

export interface McpConnection {
  readonly serverId: string;
  /** SDK connect() 内含 initialize 握手 */
  connect(timeoutMs?: number): Promise<void>;
  /** 工具发现：{ name, desc, inputSchema }（desc 为 description 的空串归一） */
  listTools(timeoutMs?: number): Promise<McpToolInfo[]>;
  /** SDK CallToolResult 原样透传（content 解包语义归 BK-0030，本层不做取值面承诺） */
  callTool(name: string, args: Record<string, unknown>, timeoutMs?: number, signal?: AbortSignal): Promise<unknown>;
  close(): Promise<void>;
}

/* 默认超时（ADR §6.1）：连接/发现 10s、工具调用 30s（MCP 工具普遍更重故放宽；
 * 量级对齐既有出站动作 fetch 15s / download 20s / bocha 15s / searxng 12s） */
const CONNECT_TIMEOUT_MS = 10_000;
const CALL_TIMEOUT_MS = 30_000;

/* 静态身份标识：刻意不读 package.json 版本，避免引入文件读取面（冒烟 MT01 断言透传） */
const CLIENT_INFO = { name: 'AgentFlow', version: '1.0.0' };

/* 子类经构造注入 Transport 的基类封装：统一持有 SDK Client、超时与 close 语义 */
export abstract class BaseMcpConnection implements McpConnection {
  readonly serverId: string;
  protected readonly client: Client = new Client(CLIENT_INFO);
  protected readonly transport: Transport;
  private connectAttempted = false;   /* 置位于 connect 发起时：握手失败也要走 close 拆链（防 stdio 孤儿） */
  private closed = false;

  constructor(serverId: string, transport: Transport) {
    this.serverId = serverId;
    this.transport = transport;
  }

  /** 传输级拆链钩子（HTTP 覆写为 terminateSession；stdio 空默认——SDK 负责结束子进程） */
  protected async teardown(): Promise<void> { /* 空默认 */ }

  async connect(timeoutMs?: number): Promise<void> {
    this.connectAttempted = true;
    await this.client.connect(this.transport, { timeout: timeoutMs ?? CONNECT_TIMEOUT_MS });
  }

  async listTools(timeoutMs?: number): Promise<McpToolInfo[]> {
    const { tools } = await this.client.listTools(undefined, { timeout: timeoutMs ?? CONNECT_TIMEOUT_MS });
    return tools.map((t) => ({
      name: t.name,
      desc: String(t.description ?? ''),
      inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>, timeoutMs?: number, signal?: AbortSignal): Promise<unknown> {
    return this.client.callTool({ name, arguments: args }, { timeout: timeoutMs ?? CALL_TIMEOUT_MS, signal });
  }

  /** 幂等可重入（非功能 3）：首次 = teardown() → client.close()；此后直接 resolve；
   *  从未发起 connect 的连接为无抛 no-op（无传输资源可拆）。 */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    if (!this.connectAttempted) return;
    await this.teardown();
    await this.client.close();
  }
}
