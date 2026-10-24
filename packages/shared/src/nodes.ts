/* ================================================================
 *  nodes.ts — 节点注册表聚合层（单一事实源）
 *  内容自 index.html 的 DEFS 逐字移植（2026-10 定稿，宪法保护对象）。
 *  · 迭代 0021 / BK-0021 批次 1（NDP 目录制迁移）：8 目录
 *    （trigger/userinput/llm/retrieval/http/code/condition/delay）为
 *    经 schema 加载校验 + 反向合成的 NDP 纯数据模块；余 8 键
 *    （prompt/websearch/notify/loop/merge/reply/setvar/approval）暂
 *    内联，批次 2 迁移。内容零漂移由 test/nodes.baseline.json 常驻
 *    Buffer 级比对守护（docs/node-definition-protocol-migration-spec.md §2/§5.1）。
 *  · 前端节点库/属性渲染 与 后端 engine 的 DEFS_META/paramsDefaults
 *    均从本表派生，禁止在别处手工复制。
 *  · 对外仍且仅导出 NODES / NODE_NAMES / paramDefaultsOf（不变式 B）；
 *    loadJsonDef / synthesize 为私有（NDP §3 聚合层边界）。
 * ================================================================ */
import type { NodeDef } from './types.js';
import { NodeDefSchema, type NodeDefJson, type ParamJson } from './nodes.schema.js';
import triggerDef from './nodes/trigger/node.js';
import userinputDef from './nodes/userinput/node.js';
import llmDef from './nodes/llm/node.js';
import retrievalDef from './nodes/retrieval/node.js';
import httpDef from './nodes/http/node.js';
import codeDef from './nodes/code/node.js';
import conditionDef from './nodes/condition/node.js';
import delayDef from './nodes/delay/node.js';

/* ---------------- 加载期校验（NDP §3：模块初始化期执行、每进程一次） ---------------- */
function loadJsonDef(raw: unknown): NodeDefJson {
  const r = NodeDefSchema.safeParse(raw);
  if (!r.success) {
    const type = (raw as { type?: unknown } | null | undefined)?.type;
    throw new Error(
      `节点定义「${typeof type === 'string' ? type : '<unknown>'}」未通过 NDP schema 校验：` +
        r.error.issues.map(i => `${i.path.join('.') || '<root>'} ${i.message}`).join('；'),
    );
  }
  return r.data;
}

/* ---------------- 反向合成（NDP §4.2：新形状 → 现行旧键结构） ----------------
 * 输出键插入序 = 基线逐字节等价倒逼（迭代 0021 SPEC §4 键序表）：
 * name, cat, icon, [caps], desc, inputs, outputs, params, kw
 * （caps 仅 llm/code 有：紧跟 icon 后、desc 前；两者皆无 → 整键省略）。
 * params 逐 widget：combo k,l,t,o,d · text/textarea/toggle k,l,t,d ·
 * number k,l,t,d,min?,max?,step?（各自仅提供时输出）· visibleIf 编译为尾键 if。
 * implemented / runtimeOverridable / protocol / type / edgeRules / binding
 * 与全部预留字段不进输出（NDP §4.1 统一裁决：忽略即内容零漂移的一部分）。 */
function compileVisibleIf(v: NonNullable<ParamJson['visibleIf']>): (p: Record<string, unknown>) => boolean {
  return p => p[v.param] === v.equals;
}

function synthesizeParam(p: ParamJson): NodeDef['params'][number] {
  switch (p.widget) {
    case 'combo':
      return p.visibleIf
        ? { k: p.id, l: p.label, t: 'combo', o: p.options.map(op => op.label), d: p.default, if: compileVisibleIf(p.visibleIf) }
        : { k: p.id, l: p.label, t: 'combo', o: p.options.map(op => op.label), d: p.default };
    case 'number':
      return p.visibleIf
        ? { k: p.id, l: p.label, t: 'number', d: p.default,
            ...(p.min !== undefined ? { min: p.min } : {}),
            ...(p.max !== undefined ? { max: p.max } : {}),
            ...(p.step !== undefined ? { step: p.step } : {}),
            if: compileVisibleIf(p.visibleIf) }
        : { k: p.id, l: p.label, t: 'number', d: p.default,
            ...(p.min !== undefined ? { min: p.min } : {}),
            ...(p.max !== undefined ? { max: p.max } : {}),
            ...(p.step !== undefined ? { step: p.step } : {}) };
    case 'toggle':
      return p.visibleIf
        ? { k: p.id, l: p.label, t: 'toggle', d: p.default, if: compileVisibleIf(p.visibleIf) }
        : { k: p.id, l: p.label, t: 'toggle', d: p.default };
    case 'text':
      return p.visibleIf
        ? { k: p.id, l: p.label, t: 'text', d: p.default, if: compileVisibleIf(p.visibleIf) }
        : { k: p.id, l: p.label, t: 'text', d: p.default };
    case 'textarea':
      return p.visibleIf
        ? { k: p.id, l: p.label, t: 'textarea', d: p.default, if: compileVisibleIf(p.visibleIf) }
        : { k: p.id, l: p.label, t: 'textarea', d: p.default };
  }
}

function synthesize(def: NodeDefJson): NodeDef {
  /* caps 固定序 ['mcp','skill'] 先 mcp 后 skill，skills 复数键合成单数 'skill'
   * （app.js:334 按数组序渲染能力 chip；app.js:989 判定 includes('skill')）
   * ——禁止按 Object.keys 枚举序合成（NDP §4.2 必踩点 1） */
  const caps: ('mcp' | 'skill')[] = [];
  if (def.binding.capabilities.mcp) caps.push('mcp');
  if (def.binding.capabilities.skills) caps.push('skill');
  return {
    name: def.identity.name,
    cat: def.identity.category,
    icon: def.identity.icon,
    ...(caps.length ? { caps } : {}),
    desc: def.identity.description,
    inputs: def.ports.inputs.map(pt => ({ n: pt.label, t: pt.type })),
    outputs: def.ports.outputs.map(pt => ({ n: pt.label, t: pt.type })),
    params: def.params.map(synthesizeParam),
    kw: def.identity.keywords,
  };
}

export const NODES: Record<string, NodeDef> = {
  trigger: synthesize(loadJsonDef(triggerDef)),
  userinput: synthesize(loadJsonDef(userinputDef)),
  llm: synthesize(loadJsonDef(llmDef)),
  prompt: { name: '提示词模板', cat: 'chat', icon: 'file-text', desc: '使用 {{变量}} 组装提示词文本。',
    inputs: [{ n: '变量', t: 'any' }], outputs: [{ n: '提示词', t: 'text' }],
    params: [
      { k: 'tpl', l: '模板内容', t: 'textarea', d: '你是一名金牌客服。请结合以下资料回答用户问题：\n{{context}}\n\n用户问题：{{question}}' },
    ], kw: 'prompt template 模板 提示词' },
  retrieval: synthesize(loadJsonDef(retrievalDef)),
  websearch: { name: '网页搜索', cat: 'knowledge', icon: 'globe', desc: '调用搜索引擎查询互联网信息。',
    inputs: [{ n: '查询', t: 'text' }], outputs: [{ n: '结果', t: 'list' }],
    params: [
      { k: 'eng', l: '搜索引擎', t: 'combo', o: ['Bing', 'Google', '博查', 'SearXNG'], d: 'Bing' },
      { k: 'max', l: '结果数量', t: 'number', d: 5, min: 1, max: 20, step: 1 },
    ], kw: 'search web 联网 搜索 engine bing google' },
  http: synthesize(loadJsonDef(httpDef)),
  code: synthesize(loadJsonDef(codeDef)),
  notify: { name: '消息通知', cat: 'tools', icon: 'send', desc: '通过邮件 / 短信 / IM 发送通知。',
    inputs: [{ n: '内容', t: 'any' }], outputs: [],
    params: [
      { k: 'ch', l: '通知渠道', t: 'combo', o: ['邮件', '短信', '企业微信', 'Webhook'], d: '邮件' },
      { k: 'to', l: '接收人', t: 'text', d: 'support@team.com' },
    ], kw: 'notify message send 通知 邮件 短信' },
  condition: synthesize(loadJsonDef(conditionDef)),
  loop: { name: '循环', cat: 'logic', icon: 'repeat', desc: '遍历列表，逐项执行下游节点。',
    inputs: [{ n: '列表', t: 'list' }], outputs: [{ n: '元素', t: 'text' }],
    params: [
      { k: 'max', l: '最大迭代', t: 'number', d: 10, min: 1, max: 100, step: 1 },
      { k: 'conc', l: '并发执行', t: 'toggle', d: false },
    ], kw: 'loop for each 循环 遍历 迭代' },
  delay: synthesize(loadJsonDef(delayDef)),
  merge: { name: '合并', cat: 'logic', icon: 'merge', desc: '汇聚多路输入为一路。',
    inputs: [{ n: 'A', t: 'any' }, { n: 'B', t: 'any' }], outputs: [{ n: '合并', t: 'any' }],
    params: [
      { k: 'mode', l: '合并策略', t: 'combo', o: ['等待全部', '任一到达'], d: '等待全部' },
    ], kw: 'merge join 合并 汇聚' },
  reply: { name: '直接回复', cat: 'output', icon: 'reply', desc: '将内容直接输出给用户（终点节点）。',
    inputs: [{ n: '内容', t: 'any' }], outputs: [],
    params: [
      { k: 'tpl', l: '输出模板', t: 'textarea', d: '{{content}}' },
    ], kw: 'reply output answer 输出 回复 结果 终点' },
  setvar: { name: '变量赋值', cat: 'output', icon: 'tag', desc: '将值写入工作流全局变量。',
    inputs: [{ n: '值', t: 'any' }], outputs: [{ n: '值', t: 'any' }],
    params: [
      { k: 'name', l: '变量名', t: 'text', d: 'answer' },
    ], kw: 'variable set assign 变量 赋值 保存' },
  approval: { name: '人工审批', cat: 'human', icon: 'user-check', desc: '流程转人工审核，通过后继续执行。',
    inputs: [{ n: '输入', t: 'any' }], outputs: [{ n: '结果', t: 'any' }],
    params: [
      { k: 'role', l: '审批人', t: 'text', d: '值班经理' },
      { k: 'to', l: '超时策略', t: 'combo', o: ['自动通过', '自动拒绝', '挂起'], d: '挂起' },
    ], kw: 'human approval audit 人工 审批 审核' },
};

/** 节点显示名映射（后端 DEFS_META 的替代） */
export const NODE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(NODES).map(([k, v]) => [k, v.name]),
);

/** 参数默认值（后端 paramsDefaults 的替代）：与 DEFS 单一来源 */
export function paramDefaultsOf(type: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of NODES[type]?.params ?? []) out[p.k] = p.d;
  return out;
}
