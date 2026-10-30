/* ================================================================
 *  capabilities.ts — 能力清单端点（迭代 0039 / BK-0049 · ADR-0018）
 *  GET /api/v1/capabilities：builtin MCP 服务清单 + 外部注册条目 + skills 清单，
 *  供前端属性面板「能力配置」勾选清单动态化（app.js 离线回退集的在线供数源）。
 *  单一事实源收口：builtin id 序 = BUILTIN_MCP_IDS（registry.ts:31）；工具名/
 *  描述 ← TOOL_SPECS（tools.ts:145-158）派生；服务级描述与 skills 五条 = 自
 *  app.js:105-123 逐字迁移的常量（迁移后的新家，冒烟 CAP01/02 锁死逐字一致）。
 *  只读进程内状态：零出站（不做 tools/list 发现——那是 BK-0029/0030 run 会话
 *  链路）、零新依赖、零新 env、零 SSE 事件（events.ts 零改动）。
 * ================================================================ */
import type { RequestHandler } from 'express';
import { TOOL_SPECS } from './tools.js';
import { BUILTIN_MCP_IDS, buildMcpRegistry, envLoader } from './mcp/registry.js';
import { composeSources } from './mcp/discovery.js';   /* BK-0014：env 源 + 发现快照组合器（与 inject.ts:37 同型一处替换） */

/* 服务级描述（自 app.js MCP_SERVERS 各条 desc 逐字迁移） */
const BUILTIN_SERVER_DESC: Record<string, string> = {
  'filesystem': '本地文件读写',
  'fetch':      '网页抓取',
  'sqlite':     '数据库查询',
  'browser':    '浏览器自动化',
  'web-search': '联网搜索',
};

/* skills 常量（自 app.js SKILL_LIST 逐字迁移；字段名 id/name/desc 与前端消费
 * 形态逐字对齐 → 下游零适配。env 注册表/上传管理不在本轮射程，ADR-0018 §6） */
const SKILLS: ReadonlyArray<{ id: string; name: string; desc: string }> = [
  { id: 'ppt-builder',  name: 'PPT 生成器',  desc: '根据大纲生成演示文稿' },
  { id: 'doc-writer',   name: '文档撰写',    desc: '长文写作与润色' },
  { id: 'data-analyst', name: '数据分析',    desc: '表格解读与图表建议' },
  { id: 'coder',        name: '编程助手',    desc: '代码生成与审查' },
  { id: 'translator',   name: '多语言翻译',  desc: '中英日韩互译' },
];

/* 第二注册表实例：mcp/inject.ts:37 单例未导出且 ADR-0018 钦定 mcp/ 目录零改动
 * → 本模块自建同源实例（同一 envLoader()，env 在进程内只读，两实例数据必然
 * 一致）。buildMcpRegistry 本体纯解析零 IO（传入 sources 经 composeSources 含
 * 启动期一次发现扫描 IO，BK-0014）；warn 传 no-op——内置 id 冲突 warn 已由
 * inject 单例在启动期发出（ADR-0012 §6.3），此处静默防双份日志噪音（冲突条目
 * 两侧行为一致：均拒条）。 */
const registry = buildMcpRegistry(composeSources(envLoader), { warn: () => {} });

/* builtin 派生：序 = BUILTIN_MCP_IDS 声明序；每服务 tools = TOOL_SPECS 键前缀
 * `${id}.` 的条目按声明序过滤（n=去前缀键名，d=ToolSpec.desc）。 */
function builtinServers() {
  return BUILTIN_MCP_IDS.map(id => ({
    id,
    name: id,
    desc: BUILTIN_SERVER_DESC[id] ?? id,
    tools: Object.entries(TOOL_SPECS)
      .filter(([key]) => key.startsWith(`${id}.`))
      .map(([key, spec]) => ({ n: key.slice(id.length + 1), d: spec.desc })),
  }));
}

/* 恒 200（只读派生无 4xx/5xx 路径；env 非法在启动期已被 config.ts zod fail-fast，
 * 到达本 handler 的进程状态必然合法）。字段名与前端回退集逐字对齐（sv.tools[].n/.d）。 */
export const capabilitiesHandler: RequestHandler = (_q, res) => {
  res.json({
    mcp: {
      builtin: builtinServers(),
      external: registry.entries.map(e => ({ serverId: e.serverId, kind: e.kind })),
    },
    skills: SKILLS,
  });
};
