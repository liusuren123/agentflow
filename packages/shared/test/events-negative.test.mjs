/* ================================================================
 *  events-negative.test.mjs — SSE 事件契约反例（12 条坏样本，表驱动）
 *  逐条对应 events.ts 各字段的 zod 契约点；全部本会话实测被
 *  RunEventSchema 拒绝（SPEC F8）。既有 15 正例回放与 2 条旧反例
 *  保留在 contract.test.mjs 原样不动。
 * ================================================================ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent } from '../dist/index.js';

/* 12 条坏样本：id 前缀 N=必填缺失 T=类型错误 E=非法枚举 L=可空性违规 */
const BAD = [
  { id: 'N01', shape: '必填缺失',   family: 'run:accepted',      ev: { type: 'run:accepted' }, why: '缺 runId（events.ts:9）' },
  { id: 'N02', shape: '必填缺失',   family: 'approval:required', ev: { type: 'approval:required', nodeId: 7, title: '转人工审批', role: '值班经理', inputPreview: '预览' }, why: '缺 runId（events.ts:26）' },
  { id: 'N03', shape: '必填缺失',   family: 'cond',              ev: { type: 'cond', id: 5, title: '置信度判断' }, why: '缺 branch（events.ts:23）' },
  { id: 'T01', shape: '类型错误',   family: 'node:delta',        ev: { type: 'node:delta', id: 4, text: 99 }, why: 'text 非串（events.ts:14）' },
  { id: 'T02', shape: '类型错误',   family: 'run:progress',      ev: { type: 'run:progress', done: 3, total: '8', elapsed: 1200 }, why: 'total 非数（events.ts:11）' },
  { id: 'T03', shape: '类型错误',   family: 'approval:done',     ev: { type: 'approval:done', nodeId: 7, approve: 'yes' }, why: 'approve 非布尔（events.ts:27）' },
  { id: 'T04', shape: '类型错误',   family: 'run:done',          ev: { type: 'run:done', ms: 1, done: 1, total: 1, ok: 'true' }, why: 'ok 非布尔（events.ts:32）' },
  { id: 'T05', shape: '类型错误',   family: 'output',            ev: { type: 'output', text: null }, why: "text 为 null——z.string() 拒 null（events.ts:25）" },
  { id: 'T06', shape: '类型错误',   family: 'node:bypass',       ev: { type: 'node:bypass', id: '7', title: '转人工审批' }, why: 'id 非数（events.ts:13）' },
  { id: 'E01', shape: '非法枚举',   family: 'log',               ev: { type: 'log', msg: 'x', lvl: 'bad' }, why: "lvl 超出 ['info','sys','ok','warn']（events.ts:24）" },
  { id: 'L01', shape: '可空性违规', family: 'node:start',        ev: { type: 'node:start', id: 4, title: 'LLM 生成回复' }, why: 'iteration 为必填可空字段（z.number().nullable()，events.ts:12）——只放行 null 不放行缺失；对照组：显式 iteration:null 放行' },
  { id: 'L02', shape: '可空性违规', family: 'node:done',         ev: { type: 'node:done', id: 4, title: 'LLM', out: null, firePort: null, iteration: 'x' }, why: '可空字段传非数非 null 的串（events.ts:19）' },
];

test('SSE 事件契约反例：12 条坏样本全部被 validateEvent 拒绝', () => {
  /* ① 条数自检 */
  assert.equal(BAD.length, 12);

  /* ② 形态覆盖自检（AC2）：四类失败形态各 ≥1，事件族 ≥6 */
  for (const shape of ['必填缺失', '类型错误', '非法枚举', '可空性违规'])
    assert.ok(BAD.filter(b => b.shape === shape).length >= 1, `失败形态「${shape}」至少 1 条——反例覆盖偏科`);
  assert.ok(new Set(BAD.map(b => b.family)).size >= 6, '坏样本应覆盖 ≥6 个事件族');

  /* ③ 逐条校验器必须拒绝 */
  for (const b of BAD)
    assert.throws(() => validateEvent(b.ev), undefined, `${b.id} 未被拒绝：${b.why}`);
});
