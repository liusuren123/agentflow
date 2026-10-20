/* ================================================================
 *  code.ts — 代码节点：Python / JavaScript 均在独立子进程中执行
 *  协议：stdin 传入 JSON {input, vars}；stdout 末行 __AF_RESULT__<json>
 *  5 秒超时强杀；进程内无服务端对象，天然隔离
 *  自 engine.js 原文拆出，逻辑逐字保留（ADR-0004 TS 化拆分）。
 * ================================================================ */
import { spawn } from 'node:child_process';

export function runUserCode(lang: string, code: string, input: unknown, vars: Record<string, any>, logs: string[]): Promise<any> {
  return new Promise((resolve, reject)=>{
    let wrapper: string;
    const py = process.platform === 'win32' ? 'python' : 'python3';
    if(lang === 'JavaScript'){
      /* 用户代码在函数体内执行：显式 return 优先生效；
         未 return 时回退取其设置的 result 变量（非严格模式下为全局赋值，typeof 可安全探测） */
      const body = String(code) + '\n;return (typeof result === "undefined" ? undefined : result);';
      wrapper = [
        "let __af_chunks=[];",
        "process.stdin.on('data',d=>__af_chunks.push(d));",
        "process.stdin.on('end',()=>{",
        "  const __af_in=JSON.parse(Buffer.concat(__af_chunks).toString()||'{}');",
        "  const input=__af_in.input, vars=__af_in.vars;",
        "  const __af_str=x=>{try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}};",
        "  const console={log:(...a)=>process.stdout.write(a.map(__af_str).join(' ')+'\\n')};",
        "  let result;",
        "  const __af_out=(function(){",
        body,
        "  })();",
        "  process.stdout.write('__AF_RESULT__'+JSON.stringify(__af_out===undefined?null:__af_out));",
        "});",
      ].join('\n');
    } else {
      const indented = String(code).split('\n').map(l=>'    '+l).join('\n');
      wrapper = [
        'import json, sys, math, re, datetime',
        '__af_in = json.loads(sys.stdin.read() or "{}")',
        'input = __af_in.get("input")',
        'vars = __af_in.get("vars", {})',
        'def __af_main():',
        indented,
        '    return locals().get("result")',
        '__af_out = __af_main()',
        'sys.stdout.write("__AF_RESULT__" + json.dumps(__af_out, ensure_ascii=False, default=str))',
      ].join('\n');
    }
    const cmd = lang === 'JavaScript' ? process.execPath : py;
    const argv = lang === 'JavaScript' ? ['--input-type=commonjs', '-e', wrapper] : ['-I', '-c', wrapper];
    let child;
    try{
      child = spawn(cmd, argv, { stdio:['pipe','pipe','pipe'] });
    }catch(e){ reject(new Error(`无法启动 ${lang} 运行时：${(e as Error).message}`)); return; }
    let out = '', err = '', killed = false;
    const timer = setTimeout(()=>{ killed = true; child.kill(); }, 5000);
    child.stdout.on('data', (d: Buffer)=>out += d);
    child.stderr.on('data', (d: Buffer)=>err += d);
    child.on('error', e=>{ clearTimeout(timer); reject(new Error(`无法启动 ${lang} 运行时（${cmd}）：${(e as Error).message}`)); });
    child.on('close', codeNum=>{
      clearTimeout(timer);
      out.split(/\r?\n/).filter(Boolean).forEach(l=>{ if(!l.startsWith('__AF_RESULT__')) logs.push(l); });
      if(killed){ reject(new Error(`${lang} 执行超时（5s），已终止`)); return; }
      if(codeNum !== 0){ reject(new Error(`${lang} 退出码 ${codeNum}：${err.slice(-300)}`)); return; }
      const m = out.match(/__AF_RESULT__([\s\S]*)$/);
      if(!m){ resolve(null); return; }
      try{ resolve(JSON.parse(m[1]!)); }catch{ resolve(m[1]); }
    });
    child.stdin.write(JSON.stringify({ input: input ?? null, vars }));
    child.stdin.end();
  });
}
