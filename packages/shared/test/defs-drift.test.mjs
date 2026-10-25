/* ================================================================
 *  defs-drift.test.mjs — DEFS 默认值漂移防护（38/38 全量字面量断言）
 *  期望值表源自 2026-10 定稿 DEFS（packages/shared/src/nodes.ts），宪法保护对象。
 *  本测试变红 = 出现未经 ADR 的契约变更——先走宪法第 3 条流程，再改本表。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NODES, paramDefaultsOf } from '../dist/index.js';

/* 字面量期望表（SPEC §4.1 机器实测快照，BUILD 逐字抄录，禁手打重写防笔误）：
 * 18 种节点 × 38 参数 = nodes.ts 各 params[].d 的 2026-10 定稿值 */
const EXPECTED_DEFAULTS = {
  trigger:    { mode: '手动触发', cron: '0 9 * * 1-5', path: '/api/run' },
  userinput:  { var: 'question', vtype: '文本', req: true, defv: '如何申请退货?' },
  llm:        { model: 'GLM-4.7', sys: '你是智能客服助手，回答需准确、简洁、友好。', temp: 0.7, max: 2048 },
  agent:      { model: 'GLM-4.7', sys: '你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。', maxSteps: 32 },
  prompt:     { tpl: '你是一名金牌客服。请结合以下资料回答用户问题：\n{{context}}\n\n用户问题：{{question}}' },
  retrieval:  { kb: '产品手册 v2.3', topk: 3, th: 0.5 },
  websearch:  { eng: 'Bing', max: 5 },
  http:       { m: 'GET', url: 'https://api.example.com/v1/orders', to: 30 },
  code:       { lang: 'Python', code: '# 处理输入后返回\nresult = input\nreturn result' },
  notify:     { ch: '邮件', to: 'support@team.com' },
  condition:  { expr: 'confidence > 0.7' },
  loop:       { max: 10, conc: false },
  delay:      { s: 2 },
  merge:      { mode: '等待全部' },
  reply:      { tpl: '{{content}}' },
  setvar:     { name: 'answer' },
  webshow:    { url: '', sandbox: true },
  approval:   { role: '值班经理', to: '挂起' },
};

test('DEFS 默认值 38/38 全量断言（字面量期望，防未经 ADR 的漂移）', () => {
  /* ① 全表计数自检：期望表自身被误删行时必须红，防止「抽样假绿」 */
  assert.equal(
    Object.values(EXPECTED_DEFAULTS).reduce((n, e) => n + Object.keys(e).length, 0),
    38,
    '期望表参数总数应为 38——表自身被误改',
  );

  /* ② 节点键集对表：新增/删除节点必须红 */
  assert.deepEqual(
    Object.keys(NODES).sort(),
    Object.keys(EXPECTED_DEFAULTS).sort(),
    '节点注册表键集与定稿 18 种漂移（未经 ADR 的 DEFS 变更？）',
  );

  /* ③ 逐节点参数键集：抓参数新增/删除/改名 */
  for (const type of Object.keys(EXPECTED_DEFAULTS)) {
    assert.deepEqual(
      Object.keys(paramDefaultsOf(type)).sort(),
      Object.keys(EXPECTED_DEFAULTS[type]).sort(),
      `${type} 参数键集漂移：DEFS=[${Object.keys(paramDefaultsOf(type)).sort()}] vs 2026-10 定稿=[${Object.keys(EXPECTED_DEFAULTS[type]).sort()}]`,
    );
  }

  /* ④ 逐参数值断言：失败信息含 type 与 k（AC1） */
  for (const [type, exp] of Object.entries(EXPECTED_DEFAULTS))
    for (const [k, v] of Object.entries(exp))
      assert.equal(paramDefaultsOf(type)[k], v, `${type}.${k} 默认值漂移（未经 ADR 的 DEFS 变更？）`);
});
