/* ================================================================
 *  schema.test.mjs — NDP zod schema 校验测试（迭代 0021 / BK-0021 批次 1）
 *  正例 = NDP §9 T1/T2/T3 最小 fixture；负例 = 六类拒绝 + 端口前缀违例
 *  与节点内重复（superRefine ⑥）。import 不经包根（SPEC §2 导出面零漂移）。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeDefSchema } from '../dist/nodes.schema.js';

/* ---- 正例 fixture：T1 纯数据节点（delay 最小骨架） ---- */
const T1 = {
  protocol: 1,
  type: 'delay',
  identity: { name: '延时等待', category: 'logic', icon: 'timer',
    keywords: 'delay wait sleep 等待 延时', description: '等待指定时间后继续执行。' },
  ports: {
    inputs: [{ id: 'in-any', label: '输入', type: 'any' }],
    outputs: [{ id: 'out-any', label: '输出', type: 'any' }],
  },
  params: [{ id: 's', label: '等待 (秒)', widget: 'number', default: 2, min: 1, max: 60, step: 1 }],
  binding: { handler: 'delay', capabilities: { data: true } },
};

/* ---- T2 条件参数输入节点（trigger 形状：visibleIf×2 + implemented×3 + 空 inputs） ---- */
const T2 = {
  protocol: 1,
  type: 'trigger',
  identity: { name: '触发器', category: 'input', icon: 'zap',
    keywords: 'trigger start 开始 入口 启动', description: '工作流执行入口。' },
  ports: { inputs: [], outputs: [{ id: 'out-start', label: '开始', type: 'any' }] },
  params: [
    { id: 'mode', label: '触发方式', widget: 'combo',
      options: [{ value: '手动触发', label: '手动触发' }, { value: '定时触发', label: '定时触发' }],
      default: '手动触发', implemented: false },
    { id: 'cron', label: 'Cron 表达式', widget: 'text', default: '0 9 * * 1-5',
      visibleIf: { param: 'mode', equals: '定时触发' }, implemented: false },
  ],
  binding: { handler: 'trigger', capabilities: {} },
};

/* ---- T3 能力绑定节点（llm 形状：combo 多选项 + runtimeOverridable + number min/max/step + 双 inputs） ---- */
const T3 = {
  protocol: 1,
  type: 'llm',
  identity: { name: 'LLM 对话', category: 'chat', icon: 'bot',
    keywords: 'llm gpt 大模型 对话', description: '调用大语言模型生成回复。' },
  ports: {
    inputs: [{ id: 'in-prompt', label: '提示词', type: 'text' }, { id: 'in-ctx', label: '上下文', type: 'any' }],
    outputs: [{ id: 'out-reply', label: '回复', type: 'text' }],
  },
  params: [
    { id: 'model', label: '模型', widget: 'combo',
      options: [{ value: 'GLM-4.7', label: 'GLM-4.7' }, { value: 'DeepSeek-V4', label: 'DeepSeek-V4' }],
      default: 'GLM-4.7', runtimeOverridable: true },
    { id: 'sys', label: '系统提示词', widget: 'textarea', default: '你是智能客服助手。' },
    { id: 'temp', label: '温度', widget: 'number', default: 0.7, min: 0, max: 2, step: 0.1 },
    { id: 'flag', label: '开关', widget: 'toggle', default: true },
  ],
  binding: { handler: 'llm', capabilities: { llm: true, mcp: { toolSelection: 'user' }, skills: true } },
};

test('正例：T1/T2/T3 三模板形状均可解析（NDP §9）', () => {
  for (const [name, doc] of [['T1', T1], ['T2', T2], ['T3', T3]]) {
    const r = NodeDefSchema.safeParse(doc);
    assert.ok(r.success, `${name} 应通过校验：${JSON.stringify(r.error?.issues)}`);
  }
});

test('正例：protocol 缺省兜底为 1（NDP §4.1 可省略）', () => {
  const { protocol: _omit, ...noProto } = T1;
  const r = NodeDefSchema.safeParse(noProto);
  assert.ok(r.success);
  assert.equal(r.data.protocol, 1);
});

/* ---- 负例：断言 safeParse 失败且 issue 含可定位路径 ---- */
function mustReject(name, doc, isExpectedIssue) {
  test(`负例：${name}`, () => {
    const r = NodeDefSchema.safeParse(doc);
    assert.ok(!r.success, '应被 schema 拒绝');
    const issues = r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    assert.ok(issues.some(isExpectedIssue), `issue 应可定位，实得 ${JSON.stringify(issues)}`);
  });
}

const clone = doc => structuredClone(doc);

/* ① 未知键（keywords 拼成 keyword 的典型事故，NDP §6.5 规则 ⑤） */
{
  const doc = clone(T1);
  doc.identity.keyword = 'delay wait';
  mustReject('未知键 identity.keyword（.strict() 拒绝）', doc,
    i => i.path.startsWith('identity') && i.message.includes('keyword'));
}

/* ② combo default ∉ options[].value 值域 */
{
  const doc = clone(T2);
  doc.params[0].default = '不存在';
  mustReject('combo default 不在 options 值域', doc,
    i => i.path === 'params.0.default' && i.message.includes('值域'));
}

/* ③ number default 越界（> max） */
{
  const doc = clone(T1);
  doc.params[0].default = 99;
  mustReject('number default 超过 max', doc,
    i => i.path === 'params.0.default' && i.message.includes('max'));
}

/* ④ params[].id 节点内重复 */
{
  const doc = clone(T3);
  doc.params.push({ id: 'model', label: '重复', widget: 'text', default: 'x' });
  mustReject('参数 id 节点内重复', doc,
    i => i.path === 'params.4.id' && i.message.includes('重复'));
}

/* ⑤ visibleIf.param 悬挂（不指向本节点参数 id） */
{
  const doc = clone(T2);
  doc.params[1].visibleIf.param = 'nope';
  mustReject('visibleIf.param 悬挂', doc,
    i => i.path === 'params.1.visibleIf.param' && i.message.includes('nope'));
}

/* ⑥ toggle default 非 boolean */
{
  const doc = clone(T3);
  doc.params[3].default = 'yes';
  mustReject('toggle default 非 boolean', doc,
    i => i.path === 'params.3.default' && /boolean/i.test(i.message));
}

/* 加验 ⑦ 输入端口 id 缺 in- 前缀（superRefine ⑥） */
{
  const doc = clone(T1);
  doc.ports.inputs[0].id = 'out-any';
  mustReject('输入端口 id 缺 in- 前缀', doc,
    i => i.path === 'ports.inputs.0.id' && i.message.includes('in-'));
}

/* 加验 ⑧ 端口 id 节点内重复（inputs+outputs 合计，superRefine ⑥） */
{
  const doc = clone(T1);
  doc.ports.outputs[0].id = 'in-any';
  mustReject('端口 id 节点内重复', doc,
    i => i.path === 'ports.outputs.0.id' && i.message.includes('重复'));
}
