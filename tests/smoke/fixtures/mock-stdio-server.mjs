#!/usr/bin/env node
/* ================================================================
 *  mock-stdio-server.mjs — 可 spawn 的 stdio mock MCP server（迭代 0023 /
 *  BK-0028 冒烟夹具，SPEC §5.3）
 *  帧协议：stdin 逐行读（newline-delimited JSON-RPC），每请求回写单行
 *  JSON 到 stdout；notification（无 id）不回写；未知 method → 单行
 *  error -32601；stdin 关闭即进程自然退出。
 *  工具面与延迟语义与 mcp-transport.mjs 的 HTTP mock 逐字相同：
 *  echo / add 即答；slow_echo 800ms 延迟；hang 3000ms 延迟。
 *  stdout 只写协议帧（无杂音输出）；stderr 全程静默。
 * ================================================================ */
import readline from 'node:readline';
import { writeFileSync } from 'node:fs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* argv 门控探针（迭代 0025 / BK-0030 冒烟夹具增量）：
 * --pid-file <path>：启动即写 pid（尽力而为吞错）——MI 孤儿断言数据源；
 * --hang-tool：tools/list 增补 hang 清单项——MI08 中止级联的确定性在途源。
 * 两参均未传 = 行为零变化（MT08-MT11/MR08 冻结面零回退）。 */
const ARGV = process.argv.slice(2);
const PID_IDX = ARGV.indexOf('--pid-file');
if (PID_IDX >= 0 && ARGV[PID_IDX + 1]) {
  try { writeFileSync(ARGV[PID_IDX + 1], String(process.pid)); } catch { /* 尽力而为 */ }
}

const MOCK_TOOLS = [
  { name: 'echo', description: '回显输入', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },
  { name: 'add', description: '两数相加', inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
  ...(ARGV.includes('--hang-tool') ? [{ name: 'hang', description: '挂起 3 秒后返回', inputSchema: { type: 'object', properties: {} } }] : []),
];
const MOCK_DELAY = { slow_echo: 800, hang: 3000 };

function rpcError(code, message) {
  const e = new Error(message);
  e.rpcCode = code;
  return e;
}

async function route(method, params) {
  if (method === 'initialize') {
    return {
      protocolVersion: params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: 'mock-stdio-mcp', version: '1.0.0' },
    };
  }
  if (method === 'tools/list') return { tools: MOCK_TOOLS };
  if (method === 'tools/call') {
    const name = params.name;
    const args = params.arguments ?? {};
    const delay = MOCK_DELAY[name] ?? 0;
    if (delay) await sleep(delay);
    if (name === 'echo' || name === 'slow_echo') return { content: [{ type: 'text', text: JSON.stringify({ echo: args.text }) }], isError: false };
    if (name === 'add') return { content: [{ type: 'text', text: String((args.a ?? 0) + (args.b ?? 0)) }], isError: false };
    if (name === 'hang') return { content: [{ type: 'text', text: 'late' }], isError: false };
    throw rpcError(-32602, `未知工具：${name}`);
  }
  throw rpcError(-32601, `未知 method：${method}`);
}

function writeFrame(obj) {
  try { process.stdout.write(JSON.stringify(obj) + '\n'); } catch { /* 对端已关闭（abort 后写失败容忍） */ }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const s = line.trim();
  if (!s) return;
  let msg = null;
  try { msg = JSON.parse(s); } catch { return; }
  if (msg?.id === undefined || msg?.id === null) return;   /* notification → 不回写 */
  route(msg.method, msg.params ?? {})
    .then((result) => writeFrame({ jsonrpc: '2.0', id: msg.id, result }))
    .catch((e) => writeFrame({ jsonrpc: '2.0', id: msg.id, error: { code: e.rpcCode ?? -32603, message: String(e?.message ?? e) } }));
});
rl.on('close', () => { process.exit(0); });   /* stdin 关闭即自然退出（无孤儿） */
