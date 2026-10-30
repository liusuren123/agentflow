/* ================================================================
 *  defs-drift.test.mjs — DEFS 默认值漂移防护（86/86 全量字面量断言）
 *  期望值表源自 2026-10 定稿 DEFS（packages/shared/src/nodes.ts）+ 迭代 0070
 *  BK-0048 节点级 on-error 双参数（ADR-0025，issue#6 批复承继），宪法保护对象。
 *  本测试变红 = 出现未经 ADR 的契约变更——先走宪法第 3 条流程，再改本表。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NODES, paramDefaultsOf } from '../dist/index.js';

/* 字面量期望表（SPEC §4.1 机器实测快照，BUILD 逐字抄录，禁手打重写防笔误）：
 * 21 种节点 × 86 参数 = nodes.ts 各 params[].d 的定稿值（2026-10 定稿 44 +
 * 0070 全 21 类统一 onError/onErrorRetries 双参数 42） */
const ON_ERROR_PARAMS = { onError: '跟随全局', onErrorRetries: 2 };   /* 迭代 0070 / BK-0048 · ADR-0025：全 21 类统一双参数 */
const EXPECTED_DEFAULTS = {
  trigger:    { mode: '手动触发', cron: '0 9 * * 1-5', path: '/api/run', ...ON_ERROR_PARAMS },
  userinput:  { var: 'question', vtype: '文本', req: true, defv: '如何申请退货?', ...ON_ERROR_PARAMS },
  llm:        { model: 'GLM-4.7', sys: '你是智能客服助手，回答需准确、简洁、友好。', temp: 0.7, max: 2048, ...ON_ERROR_PARAMS },
  agent:      { model: 'GLM-4.7', sys: '你是通用智能体，围绕用户目标自主推进，工具调用前评估必要性。', maxSteps: 32, ...ON_ERROR_PARAMS },
  prompt:     { tpl: '你是一名金牌客服。请结合以下资料回答用户问题：\n{{context}}\n\n用户问题：{{question}}', ...ON_ERROR_PARAMS },
  retrieval:  { kb: '产品手册 v2.3', topk: 3, th: 0.5, ...ON_ERROR_PARAMS },
  websearch:  { eng: 'Bing', max: 5, ...ON_ERROR_PARAMS },
  http:       { m: 'GET', url: 'https://api.example.com/v1/orders', to: 30, ...ON_ERROR_PARAMS },
  code:       { lang: 'Python', code: '# 处理输入后返回\nresult = input\nreturn result', ...ON_ERROR_PARAMS },
  notify:     { ch: '邮件', to: 'support@team.com', ...ON_ERROR_PARAMS },
  terminal:   { cmd: '', session: '', ...ON_ERROR_PARAMS },
  condition:  { expr: 'confidence > 0.7', ...ON_ERROR_PARAMS },
  loop:       { max: 10, conc: false, ...ON_ERROR_PARAMS },
  delay:      { s: 2, ...ON_ERROR_PARAMS },
  merge:      { mode: '等待全部', ...ON_ERROR_PARAMS },
  reply:      { tpl: '{{content}}', ...ON_ERROR_PARAMS },
  termview:   { lines: 200, autoscroll: true, ...ON_ERROR_PARAMS },
  setvar:     { name: 'answer', ...ON_ERROR_PARAMS },
  webshow:    { url: '', sandbox: true, ...ON_ERROR_PARAMS },
  jsoncanvas: { expand: 2, fmt: true, ...ON_ERROR_PARAMS },
  approval:   { role: '值班经理', to: '挂起', ...ON_ERROR_PARAMS },
};

test('DEFS 默认值 86/86 全量断言（字面量期望，防未经 ADR 的漂移）', () => {
  /* ① 全表计数自检：期望表自身被误删行时必须红，防止「抽样假绿」 */
  /* 计数护栏值变更（经批准的 DEFS 增删）时，测试名字面量须随改——BK-0053 */
  assert.equal(
    Object.values(EXPECTED_DEFAULTS).reduce((n, e) => n + Object.keys(e).length, 0),
    86,
    '期望表参数总数应为 86——表自身被误改',
  );

  /* ② 节点键集对表：新增/删除节点必须红 */
  assert.deepEqual(
    Object.keys(NODES).sort(),
    Object.keys(EXPECTED_DEFAULTS).sort(),
    '节点注册表键集与定稿 21 种漂移（未经 ADR 的 DEFS 变更？）',
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
