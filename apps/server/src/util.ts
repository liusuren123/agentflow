/* ================================================================
 *  util.ts — 引擎小工具（自 engine.js 原文提取，逻辑逐字保留）
 * ================================================================ */
import { evalExpr } from './expr.js';
import type { Response } from 'express';

export const ABORT_MSG = 'The operation was aborted';

/* ---------- SSE 帧写出（唯一出口；server.ts 的 run 通道使用） ----------
 * 纵深防御：JSON.stringify 不产生裸换行（事件注入面为零），但仍显式转义
 * U+2028/2029（JSON 合法但属行终止符的历史包袱）；帧以纯字符串拼接构造。
 * 响应 Content-Type 为 text/event-stream 且带 nosniff 头，浏览器不会
 * 将响应体作为 HTML 执行。 */
export function sseWriteEvent(res: Response, ev: Record<string, unknown>): void {
  const payload = JSON.stringify(ev).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const frame = 'data: ' + payload + '\n\n';
  try{ res.write(frame); }catch{ /* 连接已断 */ }
}
export function sseWriteComment(res: Response, text: string): void {
  const frame = ': ' + String(text).replace(/[\r\n]/g, ' ') + '\n\n';
  try{ res.write(frame); }catch{ /* 连接已断 */ }
}

export const isAbort = (e: unknown) => !!(e && (typeof e === 'object' && e !== null) && ((e as { name?: string }).name === 'AbortError' || /abort/i.test(String((e as { message?: unknown }).message || ''))));

export function toStr(v: unknown): string {
  if(v == null) return '';
  if(typeof v === 'string') return v;
  if(typeof v === 'object'){
    if((v as { __trigger?: unknown }).__trigger) return '';
    try{ return JSON.stringify(v, null, 0) ?? ''; }catch{ return String(v); }
  }
  return String(v);
}

export const preview = (v: unknown, n = 44): string => { const s = toStr(v); return s.length > n ? s.slice(0, n)+'…' : s; };

export function render(tpl: unknown, vars: Record<string, any>): string {
  return String(tpl ?? '').replace(/\{\{\s*([\w\u4e00-\u9fa5.\[\]'"]+)\s*\}\}/g, (_, k)=>{
    let v: unknown;
    try{ v = evalExpr(k, vars); }catch{ v = undefined; }
    if(v == null) return '';
    return typeof v === 'object' ? toStr(v) : String(v);
  });
}

export const renderIfTemplate = (s: unknown, vars: Record<string, any>): string => /\{\{.*\}\}/.test(String(s || '')) ? render(s, vars) : String(s ?? '');

export const strInput = (v: unknown, fallback = ''): string => {
  if(typeof v === 'string' && v.trim()) return v;
  if(Array.isArray(v) && v.length) return v.map(x=>toStr(x)).join('\n');
  if(v && typeof v === 'object' && !(v as { __trigger?: unknown }).__trigger){ return toStr(v); }
  return fallback;
};

export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] as string));

export const abortableSleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject)=>{
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', ()=>{ clearTimeout(t); reject(Object.assign(new Error(ABORT_MSG), { name: 'AbortError' })); }, { once: true });
});
