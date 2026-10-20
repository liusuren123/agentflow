/* ================================================================
 *  providers.js — 模型接入层（Vercel AI SDK 7）
 *  通过 @ai-sdk/openai-compatible 接入任意 OpenAI 兼容端点：
 *    DeepSeek / 智谱 GLM / OpenAI / Moonshot / Ollama / LM Studio …
 *  配置优先级：环境变量 > server/.env > 内置默认（按已存在的 *_API_KEY 探测）
 * ================================================================ */
import { readFileSync } from 'node:fs';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/* ---- 读取 server/.env（若存在；不覆盖已有环境变量） ---- */
try{
  const raw = readFileSync(new URL('./.env', import.meta.url), 'utf8');
  for(const line of raw.split(/\r?\n/)){
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g,'');
  }
}catch{ /* 无 .env，忽略 */ }

/* ---- 内置端点档案：检测到对应 KEY 时自动生效 ---- */
const KNOWN_ENDPOINTS = [
  { key:'DEEPSEEK_API_KEY', name:'DeepSeek', baseURL:'https://api.deepseek.com/v1',
    models:{ 'DeepSeek-V4':'deepseek-chat', 'DeepSeek-R2':'deepseek-reasoner' }, def:'deepseek-chat' },
  { key:'ZHIPU_API_KEY', name:'智谱 GLM', baseURL:'https://open.bigmodel.cn/api/paas/v4',
    models:{ 'GLM-4.7':'glm-4.7', 'GLM-4.7-Air':'glm-4.7-air', 'GLM-4.6-Flash':'glm-4.6-flash' }, def:'glm-4.7' },
  { key:'OPENAI_API_KEY', name:'OpenAI', baseURL:'https://api.openai.com/v1',
    models:{ 'GPT-5':'gpt-5', 'GPT-5-mini':'gpt-5-mini' }, def:'gpt-5' },
  { key:'MOONSHOT_API_KEY', name:'Moonshot', baseURL:'https://api.moonshot.cn/v1',
    models:{ 'Kimi-K2.6':'kimi-k2.6' }, def:'kimi-k2.6' },
];

const DEFAULT_MODEL_LIST = ['GLM-4.7','GLM-4.7-Air','GLM-4.6-Flash','DeepSeek-V4','GPT-5','Claude Sonnet 4.5'];

function resolveConfig(){
  // 显式配置：AI_BASE_URL + AI_API_KEY（+ 可选 AI_MODELS="显示名:模型ID,..." 与 AI_MODEL 默认模型）
  if(process.env.AI_BASE_URL && process.env.AI_API_KEY){
    const models = {};
    (process.env.AI_MODELS||'').split(',').map(s=>s.trim()).filter(Boolean).forEach(pair=>{
      const [n,id] = pair.split(':'); models[n||id] = id||n;
    });
    const names = Object.keys(models);
    return {
      providerName: process.env.AI_PROVIDER_NAME || 'agentflow',
      baseURL: process.env.AI_BASE_URL, apiKey: process.env.AI_API_KEY,
      models: names.length?models:null,
      defaultModel: process.env.AI_MODEL || (names.length?Object.values(models)[0]:null),
      display: new URL(process.env.AI_BASE_URL).host,
    };
  }
  // 自动探测内置端点
  for(const ep of KNOWN_ENDPOINTS){
    if(process.env[ep.key]){
      return { providerName:'agentflow', baseURL:ep.baseURL, apiKey:process.env[ep.key],
        models:ep.models, defaultModel:ep.def, display:ep.name };
    }
  }
  return null;
}

const cfg = resolveConfig();

/* 前端 LLM 节点下拉显示名 → 实际模型 ID */
export function resolveModel(displayName){
  if(!cfg) return null;
  if(!displayName) return cfg.defaultModel;
  const dn = String(displayName).trim();
  if(cfg.models && cfg.models[dn]) return cfg.models[dn];
  const low = dn.toLowerCase();
  for(const [name,id] of Object.entries(cfg.models||{})){
    if(low.includes(name.toLowerCase()) || name.toLowerCase().includes(low)) return id;
  }
  return cfg.defaultModel;
}

let _provider = null;
export function getProvider(){
  if(!cfg) return null;
  if(!_provider){
    _provider = createOpenAICompatible({ name: cfg.providerName, apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  }
  return _provider;
}

export function getModel(displayName){
  const p = getProvider(); if(!p) return null;
  return p(resolveModel(displayName));
}

/* /api/models 与 /api/health 汇报 */
export function providerInfo(){
  if(!cfg) return {
    configured:false, endpoint:null,
    models: DEFAULT_MODEL_LIST.map(n=>({name:n, id:null})),
    note:'未检测到模型密钥：LLM 节点将报错（其余节点正常）。可在 server/.env 配置 AI_BASE_URL + AI_API_KEY，或设置 DEEPSEEK_API_KEY / ZHIPU_API_KEY / OPENAI_API_KEY 之一。'
  };
  const models = Object.entries(cfg.models||{}).map(([name,id])=>({name,id}));
  return { configured:true, endpoint:cfg.display, default:cfg.defaultModel,
    models: models.length?models:[{name:cfg.defaultModel,id:cfg.defaultModel}],
    note:`已连接 ${cfg.display}（OpenAI 兼容端点）` };
}
