/* ================================================================
 *  nodes.schema.ts — NDP 节点定义协议 zod schema（NDP v0.2 §4/§6）
 *  加载期校验 nodes/<type>/node.ts 纯数据模块：一律 .strict() 拒未知键
 *  （§6.5 规则 ⑤，典型事故 keywords 拼成 keyword 被静默丢弃）+
 *  superRefine 六规则（§6.5 清单五条 + 端口 id 节点内唯一，迭代 0021
 *  SPEC §3-⑥）。预留字段（appearance/status/edgeRules/requiresApproval）
 *  以可选 + 不定义内形进 schema；聚合层忽略其值（NDP §4.1 统一裁决）。
 *  模块边界：只 import zod；不 import 任何节点数据 / types.js。
 * ================================================================ */
import { z } from 'zod';

/* ---------------- 枚举冻结（NDP §5.1 端口五种 / §6.1 widget 五种 / §4.1 分类） ---------------- */
const PORT_TYPES = ['any', 'text', 'list', 'object', 'number'] as const;
const WIDGETS = ['text', 'textarea', 'number', 'combo', 'toggle'] as const;
const CATEGORIES = ['input', 'chat', 'knowledge', 'tools', 'logic', 'output', 'human'] as const;

/* ---------------- 端口（NDP §5.3 稳定 id：字符集 ^[a-z][a-z0-9-]{2,31}$，总长 3-32） ---------------- */
const PortIdSchema = z.string().regex(
  /^[a-z][a-z0-9-]{2,31}$/,
  "端口 id 违反规则：^[a-z][a-z0-9-]{2,31}$（小写开头，仅小写字母/数字/连字符，总长 3-32）",
);
export const PortJsonSchema = z.strictObject({
  id: PortIdSchema,
  label: z.string().min(1),
  type: z.enum(PORT_TYPES),
});

/* ---------------- combo 选项（NDP §4.3 value/label 分离；迁移期 value ≡ label） ---------------- */
export const OptionJsonSchema = z.strictObject({
  value: z.string().min(1),
  label: z.string().min(1),
});

/* ---------------- visibleIf DSL（NDP §6.2：v0.2 仅单条件 {param, equals}） ---------------- */
export const VisibleIfJsonSchema = z.strictObject({
  param: z.string().min(1),
  equals: z.union([z.string(), z.number(), z.boolean()]),
});

/* ---------------- 参数（widget × default 契约矩阵，NDP §6.1：协议不得比现行 types.ts 更松） ----------------
 * 公共字段：id/label + 可选 visibleIf / implemented / runtimeOverridable；
 * 各 widget 支的 default 类型互斥（text·textarea·combo=string，number=number，toggle=boolean）。 */
const ParamCommon = {
  id: z.string().min(1),
  label: z.string().min(1),
  visibleIf: VisibleIfJsonSchema.optional(),
  implemented: z.boolean().optional(),
  runtimeOverridable: z.boolean().optional(),
};
export const ParamJsonSchema = z.discriminatedUnion('widget', [
  z.strictObject({ ...ParamCommon, widget: z.literal('text'), default: z.string() }),
  z.strictObject({ ...ParamCommon, widget: z.literal('textarea'), default: z.string() }),
  z.strictObject({ ...ParamCommon, widget: z.literal('number'), default: z.number(),
    min: z.number().optional(), max: z.number().optional(), step: z.number().optional() }),
  z.strictObject({ ...ParamCommon, widget: z.literal('combo'), default: z.string(),
    options: z.array(OptionJsonSchema).min(1) }),
  z.strictObject({ ...ParamCommon, widget: z.literal('toggle'), default: z.boolean() }),
]);

/* ---------------- 能力声明（NDP §7.2：值 = boolean | strictObject 二选一，取消裸字符串枚举） ----------------
 * kind 键集 = 核心六种（llm/exec/net/fs/human/data）+ 扩展四种（mcp/skills/agent/ingress），
 * 未知 kind 由 strictObject 拒绝；内形 mode（exec:'sandboxed'/net:'guarded'）、
 * toolSelection（mcp）、sessionMode（agent）均为协议占位。 */
const CapabilityValueSchema = z.union([
  z.boolean(),
  z.strictObject({
    mode: z.string().optional(),
    toolSelection: z.enum(['user', 'auto']).optional(),
    sessionMode: z.string().optional(),
  }),
]);
export const CapabilitiesJsonSchema = z.strictObject({
  llm: CapabilityValueSchema.optional(),
  exec: CapabilityValueSchema.optional(),
  net: CapabilityValueSchema.optional(),
  fs: CapabilityValueSchema.optional(),
  human: CapabilityValueSchema.optional(),
  data: CapabilityValueSchema.optional(),
  mcp: CapabilityValueSchema.optional(),
  skills: CapabilityValueSchema.optional(),
  agent: CapabilityValueSchema.optional(),
  ingress: CapabilityValueSchema.optional(),
});

/* ---------------- 节点定义（NDP §4.1 字段总表） ---------------- */
export const NodeDefSchema = z
  .strictObject({
    protocol: z.number().int().default(1),
    type: z.string().min(1),
    identity: z.strictObject({
      name: z.string().min(1),
      category: z.enum(CATEGORIES),
      icon: z.string().min(1),
      keywords: z.string(),
      description: z.string().min(1),
      appearance: z.unknown().optional(),   /* 预留·未启用（启用即触 UI 走修宪） */
      status: z.enum(['active', 'proposed', 'deprecated']).optional(),  /* 预留·未启用 */
    }),
    ports: z.strictObject({
      inputs: z.array(PortJsonSchema),
      outputs: z.array(PortJsonSchema),
    }),
    params: z.array(ParamJsonSchema),
    edgeRules: z.unknown().optional(),      /* 预留·未启用（缺省即 default，NDP §5.5） */
    binding: z.strictObject({
      handler: z.string(),
      requiresApproval: z.string().optional(),  /* 预留·未启用（NDP §7.3） */
      capabilities: CapabilitiesJsonSchema,
    }),
  })
  .superRefine((def, ctx) => {
    const bad = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    /* ① params[].id 节点内唯一 */
    const seen = new Set<string>();
    const dupIdx: number[] = [];
    def.params.forEach((p, i) => {
      if (seen.has(p.id)) dupIdx.push(i);
      else seen.add(p.id);
    });
    dupIdx.forEach(i => bad(['params', i, 'id'], `参数 id「${def.params[i]!.id}」节点内重复`));

    /* ② visibleIf.param 指向同节点存在的参数 id */
    def.params.forEach((p, i) => {
      if (p.visibleIf && !seen.has(p.visibleIf.param))
        bad(['params', i, 'visibleIf', 'param'], `visibleIf.param「${p.visibleIf.param}」不指向本节点任何参数 id`);
    });

    /* ③ binding.handler 非空字符串 */
    if (def.binding.handler.trim() === '')
      bad(['binding', 'handler'], 'binding.handler 不能为空字符串');

    /* ④ combo / number 约束（NDP §6.1 矩阵） */
    def.params.forEach((p, i) => {
      if (p.widget === 'combo' && !p.options.some(op => op.value === p.default))
        bad(['params', i, 'default'], `combo default「${p.default}」不在 options[].value 值域内`);
      if (p.widget === 'number') {
        if (p.min !== undefined && p.default < p.min)
          bad(['params', i, 'default'], `number default ${p.default} 低于 min ${p.min}`);
        if (p.max !== undefined && p.default > p.max)
          bad(['params', i, 'default'], `number default ${p.default} 超过 max ${p.max}`);
        if (p.min !== undefined && p.max !== undefined && p.min > p.max)
          bad(['params', i], `number min ${p.min} 大于 max ${p.max}`);
        if (p.step !== undefined && p.step <= 0)
          bad(['params', i, 'step'], 'number step 必须 > 0');
      }
    });

    /* ⑤ = 结构性 .strict()（全体 strictObject），非 refine 体 */

    /* ⑥ 端口 id：节点内唯一（inputs+outputs 合计，NDP §5.3 Critical）+ 前缀规则（in-/out-） */
    const portSeen = new Set<string>();
    def.ports.inputs.forEach((pt, i) => {
      if (!pt.id.startsWith('in-'))
        bad(['ports', 'inputs', i, 'id'], `输入端口 id「${pt.id}」缺 in- 前缀`);
      if (portSeen.has(pt.id)) bad(['ports', 'inputs', i, 'id'], `端口 id「${pt.id}」节点内重复`);
      else portSeen.add(pt.id);
    });
    def.ports.outputs.forEach((pt, i) => {
      if (!pt.id.startsWith('out-'))
        bad(['ports', 'outputs', i, 'id'], `输出端口 id「${pt.id}」缺 out- 前缀`);
      if (portSeen.has(pt.id)) bad(['ports', 'outputs', i, 'id'], `端口 id「${pt.id}」节点内重复`);
      else portSeen.add(pt.id);
    });
  });

/* ---------------- 导出类型（运行时仅导出 schema 本体，不导出任何函数） ---------------- */
export type PortJson = z.infer<typeof PortJsonSchema>;
export type OptionJson = z.infer<typeof OptionJsonSchema>;
export type VisibleIfJson = z.infer<typeof VisibleIfJsonSchema>;
export type ParamJson = z.infer<typeof ParamJsonSchema>;
export type CapabilitiesJson = z.infer<typeof CapabilitiesJsonSchema>;
export type NodeDefJson = z.infer<typeof NodeDefSchema>;
