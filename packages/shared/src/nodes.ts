/* ================================================================
 *  nodes.ts — 节点注册表聚合层（单一事实源）
 *  内容自 index.html 的 DEFS 逐字移植（2026-10 定稿，宪法保护对象）。
 *  · 迭代 0021~0022 / BK-0021（NDP 目录制迁移）终态：18 目录全量
 *    （trigger/userinput/llm/agent/retrieval/http/code/condition/delay +
 *    prompt/websearch/notify/loop/merge/reply/termview/setvar/approval）为
 *    经 schema 加载校验 + 反向合成的 NDP 纯数据模块，聚合层零内联
 *    定义。内容零漂移由 test/nodes.baseline.json 常驻 Buffer 级比对
 *    守护（docs/node-definition-protocol-migration-spec.md §2/§5.1）；
 *    各目录 README 由 tools/gen-node-readmes.mjs 生成、
 *    test/readme-consistency.test.mjs 常驻回比（NDP §8）。
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
import agentDef from './nodes/agent/node.js';
import retrievalDef from './nodes/retrieval/node.js';
import httpDef from './nodes/http/node.js';
import codeDef from './nodes/code/node.js';
import conditionDef from './nodes/condition/node.js';
import delayDef from './nodes/delay/node.js';
import promptDef from './nodes/prompt/node.js';
import websearchDef from './nodes/websearch/node.js';
import notifyDef from './nodes/notify/node.js';
import loopDef from './nodes/loop/node.js';
import mergeDef from './nodes/merge/node.js';
import replyDef from './nodes/reply/node.js';
import termviewDef from './nodes/termview/node.js';
import setvarDef from './nodes/setvar/node.js';
import approvalDef from './nodes/approval/node.js';

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
  agent: synthesize(loadJsonDef(agentDef)),
  prompt: synthesize(loadJsonDef(promptDef)),
  retrieval: synthesize(loadJsonDef(retrievalDef)),
  websearch: synthesize(loadJsonDef(websearchDef)),
  http: synthesize(loadJsonDef(httpDef)),
  code: synthesize(loadJsonDef(codeDef)),
  notify: synthesize(loadJsonDef(notifyDef)),
  condition: synthesize(loadJsonDef(conditionDef)),
  loop: synthesize(loadJsonDef(loopDef)),
  delay: synthesize(loadJsonDef(delayDef)),
  merge: synthesize(loadJsonDef(mergeDef)),
  reply: synthesize(loadJsonDef(replyDef)),
  termview: synthesize(loadJsonDef(termviewDef)),
  setvar: synthesize(loadJsonDef(setvarDef)),
  approval: synthesize(loadJsonDef(approvalDef)),
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
