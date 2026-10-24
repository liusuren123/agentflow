/* ================================================================
 *  mcp/stdio.ts — stdio 传输构造（迭代 0023 / BK-0028 · ADR-0012）
 *  本地子进程形态：newline-delimited JSON-RPC over stdin/stdout（帧格式
 *  稳定，2026-07-28 修订 SHOULD 复用 stdio 帧）。SDK StdioClientTransport
 *  直 spawn（argv 数组直传，不经任何命令解释器拼接——API 面不存在该类
 *  选项，SPEC §2-V7 实核；AC8 由冒烟 MT12 源扫描机器断言）。
 *  close = 基类 client.close()（SDK 负责结束子进程），本文件不加自定义
 *  kill 逻辑；run 级生命周期绑定归 BK-0029/0030 消费侧（ADR §6.1）。
 *  本轮不读 env、不接配置：command/args 为调用方字面量传入；「白名单
 *  来源 = 注册表本身」的 env 语义面归 BK-0029（registry.ts）。
 * ================================================================ */
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { BaseMcpConnection } from './connection.js';
import type { McpConnection } from './connection.js';

export interface StdioMcpOptions {
  env?: Record<string, string>;   /* 不传 → SDK getDefaultEnvironment()（安全子集） */
  cwd?: string;
  stderr?: 'inherit' | 'pipe' | 'ignore';
}

class StdioMcpConnection extends BaseMcpConnection {
  private readonly transport2: StdioClientTransport;

  constructor(serverId: string, command: string, args: string[], opts?: StdioMcpOptions) {
    const transport = new StdioClientTransport({
      command,
      args,
      env: opts?.env,
      cwd: opts?.cwd,
      stderr: opts?.stderr,
    });
    super(serverId, transport);
    this.transport2 = transport;
  }

  /* 测试探针面（非接口承诺，生产代码不得依赖）：冒烟 MT09 孤儿断言的数据源 */
  get pid(): number | null {
    return this.transport2.pid;
  }
}

export function createStdioMcpConnection(serverId: string, command: string, args?: string[], opts?: StdioMcpOptions): McpConnection {
  return new StdioMcpConnection(serverId, command, args ?? [], opts);
}
