/* ================================================================
 *  util.ts — 引擎小工具（自 engine.js 原文提取，逻辑逐字保留）
 * ================================================================ */
import { evalExpr } from './expr.js';

export const ABORT_MSG = 'The operation was aborted';

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
