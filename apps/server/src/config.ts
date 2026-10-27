/* ================================================================
 *  config.ts — 环境配置装载 + zod 启动期校验（ADR-0004）
 *  · 先读 server/.env（不覆盖已有环境变量，行为与原 providers.js 一致），
 *    再对全部已知变量做 zod 校验：全部可选——未配置任何密钥合法；
 *    「配了但非法」fail-fast，指明变量名后以退出码 1 终止。
 *  · 空字符串一律视为未配置（与原实现的 falsy 语义一致）。
 * ================================================================ */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { logger } from './logger.js';
import { parseHttpServersSpec, parseStdioServersSpec } from './mcp/registry.js';

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // dist/ → apps/server

/* ---- 读取 server/.env（若存在；不覆盖已有环境变量） ---- */
try{
  const raw = readFileSync(path.join(PKG_ROOT, '.env'), 'utf8');
  for(const line of raw.split(/\r?\n/)){
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!m || process.env[m[1]!] !== undefined) continue;
    process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g,'');
  }
}catch{ /* 无 .env，忽略 */ }

/* ---- 空字符串 → 未配置（保持原 falsy 探测语义） ---- */
const rawEnv: Record<string, string | undefined> = {};
for(const key of [
  'AI_BASE_URL', 'AI_API_KEY', 'AI_MODELS', 'AI_MODEL', 'AI_PROVIDER_NAME',
  'PORT', 'ALLOW_PRIVATE_NET', 'BOCHA_API_KEY', 'SEARXNG_URL',
  'DEEPSEEK_API_KEY', 'ZHIPU_API_KEY', 'OPENAI_API_KEY', 'MOONSHOT_API_KEY',
  'MCP_HTTP_SERVERS', 'MCP_STDIO_SERVERS',
  'PTY_ENABLED', 'PTY_IDLE_TIMEOUT_MS', 'PTY_MAX_SESSION_MS', 'PTY_MAX_SESSIONS',
]){
  const v = process.env[key];
  rawEnv[key] = v !== undefined && v !== '' ? v : undefined;
}

const TRUTHY = /^(1|true|yes)$/i;
const FALSY = /^(0|false|no)$/i;

/* AI_MODELS="显示名:模型ID,..." → 值域（模型 ID 集合），供 AI_MODEL 交叉校验 */
function modelIdsOf(spec: string | undefined): string[] {
  if(!spec) return [];
  return spec.split(',').map(s=>s.trim()).filter(Boolean).map(pair=>{
    const [n = '', id = ''] = pair.split(':');
    return id || n;
  });
}

const EnvSchema = z.object({
  AI_BASE_URL: z.string().trim().url('必须是合法绝对 URL').optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODELS: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_PROVIDER_NAME: z.string().optional(),
  PORT: z.coerce.number({ invalid_type_error: '必须是整数' }).int('必须是整数').min(1, '必须在 1-65535').max(65535, '必须在 1-65535').optional(),
  ALLOW_PRIVATE_NET: z.string().refine(v => TRUTHY.test(v) || FALSY.test(v), { message: '只接受 1/true/yes 或 0/false/no' }).optional(),
  BOCHA_API_KEY: z.string().optional(),
  SEARXNG_URL: z.string().trim().url('必须是合法绝对 URL').optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  ZHIPU_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  MOONSHOT_API_KEY: z.string().optional(),
  /* 外部 MCP server 注册表（BK-0029 / ADR-0012 §7 案 A）：E1-E8 字段内校验
   * （解析实现 = mcp/registry.ts 两纯函数，复用零漂移）；problems 经既有
   * fail 通道指明变量名 + 条目序号 + 原因。 */
  MCP_HTTP_SERVERS: z.string().superRefine((v, ctx) => {
    for (const p of parseHttpServersSpec(v).problems) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p });
  }).optional(),
  MCP_STDIO_SERVERS: z.string().superRefine((v, ctx) => {
    for (const p of parseStdioServersSpec(v).problems) ctx.addIssue({ code: z.ZodIssueCode.custom, message: p });
  }).optional(),
  /* PTY 会话运行时（ADR-0014 §5.5 / 迭代 0055 BK-0044；issue#14 批复）：
   * ENABLED 默认关（ALLOW_PRIVATE_NET 同款 TRUTHY/FALSY 词形）；IDLE 下限
   * 1000ms 防误配亚秒级（SPEC D6 对例示值 60000 的显式偏离，默认值不变）；
   * MAX_SESSION_MS 与 IDLE 的交叉校验见 loadConfig（E9 先例）。 */
  PTY_ENABLED: z.string().refine(v => TRUTHY.test(v) || FALSY.test(v), { message: '只接受 1/true/yes 或 0/false/no' }).optional(),
  PTY_IDLE_TIMEOUT_MS: z.coerce.number({ invalid_type_error: '必须是整数' }).int('必须是整数').min(1000, '必须 ≥1000ms（防误配亚秒级）').optional(),
  PTY_MAX_SESSION_MS: z.coerce.number({ invalid_type_error: '必须是整数' }).int('必须是整数').min(1000, '必须 ≥1000ms').optional(),
  PTY_MAX_SESSIONS: z.coerce.number({ invalid_type_error: '必须是整数' }).int('必须是整数').min(1, '必须在 1-16').max(16, '必须在 1-16').optional(),
});

function fail(problems: string[]): never {
  logger.fatal({ problems }, '环境变量配置错误，启动终止（详见 problems，逐项修正后重试）');
  process.exit(1);
}

function loadConfig(){
  const problems: string[] = [];
  const parsed = EnvSchema.safeParse(rawEnv);
  if(!parsed.success){
    for(const iss of parsed.error.issues){
      const key = iss.path.join('.') || '(未知变量)';
      problems.push(`${key}=${JSON.stringify(rawEnv[key] ?? '')}：${iss.message}`);
    }
    fail(problems);
  }
  const env = parsed.data;
  /* 交叉校验（ADR-0004）：AI_MODEL 提供且 AI_MODELS 提供时，须在 AI_MODELS 值域内 */
  if(env.AI_MODEL && env.AI_MODELS){
    const ids = modelIdsOf(env.AI_MODELS);
    if(!ids.includes(env.AI_MODEL)){
      problems.push(`AI_MODEL=${env.AI_MODEL}：不在 AI_MODELS 的模型 ID 值域 [${ids.join(', ')}] 内`);
      fail(problems);
    }
  }
  /* 交叉校验（BK-0029 / E9）：两 MCP env 各自合法但 name 跨集合重复 → 歧义 fail-fast */
  if(env.MCP_HTTP_SERVERS && env.MCP_STDIO_SERVERS){
    const stdioIds = new Set(parseStdioServersSpec(env.MCP_STDIO_SERVERS).entries.map((e) => e.serverId));
    const dup = parseHttpServersSpec(env.MCP_HTTP_SERVERS).entries.map((e) => e.serverId).filter((id) => stdioIds.has(id));
    if(dup.length > 0){
      problems.push(`MCP_HTTP_SERVERS × MCP_STDIO_SERVERS：name 重复注册 [${dup.join(', ')}]（跨变量同名歧义，逐项修正后重试）`);
      fail(problems);
    }
  }
  /* 交叉校验（BK-0044 / ADR-0014 §5.5）：两超时均配置时，最大时长须 ≥ idle 超时
     （否则 max 硬顶先于 idle 兑现属配置自相矛盾，fail-fast 指明两变量名） */
  if(env.PTY_IDLE_TIMEOUT_MS !== undefined && env.PTY_MAX_SESSION_MS !== undefined
      && env.PTY_MAX_SESSION_MS < env.PTY_IDLE_TIMEOUT_MS){
    problems.push(`PTY_MAX_SESSION_MS=${env.PTY_MAX_SESSION_MS}：必须 ≥ PTY_IDLE_TIMEOUT_MS=${env.PTY_IDLE_TIMEOUT_MS}（最大时长须 ≥ idle 超时）`);
    fail(problems);
  }
  return {
    port: env.PORT ?? 3000,
    allowPrivateNet: !!env.ALLOW_PRIVATE_NET && TRUTHY.test(env.ALLOW_PRIVATE_NET),
    ptyEnabled: !!env.PTY_ENABLED && TRUTHY.test(env.PTY_ENABLED),
    ptyIdleTimeoutMs: env.PTY_IDLE_TIMEOUT_MS ?? 600000,
    ptyMaxSessionMs: env.PTY_MAX_SESSION_MS ?? 3600000,
    ptyMaxSessions: env.PTY_MAX_SESSIONS ?? 4,
    aiBaseUrl: env.AI_BASE_URL,
    aiApiKey: env.AI_API_KEY,
    aiModels: env.AI_MODELS,
    aiModel: env.AI_MODEL,
    aiProviderName: env.AI_PROVIDER_NAME,
    bochaApiKey: env.BOCHA_API_KEY,
    searxngUrl: env.SEARXNG_URL,
    knownKeys: {
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY,
      ZHIPU_API_KEY: env.ZHIPU_API_KEY,
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      MOONSHOT_API_KEY: env.MOONSHOT_API_KEY,
    } as Record<string, string | undefined>,
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
export const config: AppConfig = loadConfig();
