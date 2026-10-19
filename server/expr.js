/* ================================================================
 *  expr.js — 条件分支节点的安全表达式求值器（无 eval / 无 Function）
 *  支持：数字/单双引号字符串/布尔/null、标识符、成员访问 a.b、
 *        括号、一元 ! -、* / % + -、比较 > >= < <= == !=、逻辑 && ||
 *        函数 len() str() num() lower() upper() contains(a,b)
 *  标识符从作用域对象解析（工作流变量 + input），未定义 → undefined
 * ================================================================ */

export function evalExpr(src, scope){
  const s = String(src ?? '').trim();
  if(!s) return true;
  const toks = tokenize(s);
  const p = new Parser(toks);
  const ast = p.parseExpr(0);
  if(p.peek() != null) throw new SyntaxError(`表达式在位置 ${p.peek().pos} 附近存在多余内容`);
  return evalNode(ast, scope ?? {});
}

/* ---------- 词法 ---------- */
function tokenize(src){
  const toks = []; let i = 0;
  const isDigit = c => c >= '0' && c <= '9';
  const isIdStart = c => /[A-Za-z_\u4e00-\u9fa5]/.test(c);
  const isId = c => /[A-Za-z0-9_\u4e00-\u9fa5]/.test(c);
  while(i < src.length){
    const c = src[i];
    if(/\s/.test(c)){ i++; continue; }
    if(isDigit(c) || (c === '.' && isDigit(src[i+1]))){
      let j = i; while(j < src.length && (isDigit(src[j]) || src[j]==='.')) j++;
      toks.push({t:'num', v:Number(src.slice(i,j)), pos:i}); i = j; continue;
    }
    if(c === '"' || c === "'"){
      let j = i+1, out = '';
      while(j < src.length && src[j] !== c){
        if(src[j] === '\\' && j+1 < src.length){ out += src[j+1]; j += 2; }
        else { out += src[j]; j++; }
      }
      if(j >= src.length) throw new SyntaxError('字符串缺少结束引号');
      toks.push({t:'str', v:out, pos:i}); i = j+1; continue;
    }
    if(isIdStart(c)){
      let j = i; while(j < src.length && isId(src[j])) j++;
      toks.push({t:'id', v:src.slice(i,j), pos:i}); i = j; continue;
    }
    const two = src.slice(i, i+2);
    if(['>=','<=','==','!=','&&','||'].includes(two)){
      toks.push({t:'op', v:two, pos:i}); i += 2; continue;
    }
    if('><!+-*/%(),.'.includes(c)){ toks.push({t:'op', v:c, pos:i}); i++; continue; }
    throw new SyntaxError(`无法识别的字符 "${c}"（位置 ${i}）`);
  }
  return toks;
}

/* ---------- 语法（Pratt 优先级爬升） ---------- */
const BIN = {
  '||':1, '&&':2,
  '==':3, '!=':3, '>':4, '>=':4, '<':4, '<=':4,
  '+':5, '-':5, '*':6, '/':6, '%':6,
};

class Parser{
  constructor(toks){ this.toks = toks; this.i = 0; }
  peek(){ return this.toks[this.i] ?? null; }
  next(){ return this.toks[this.i++]; }
  expectOp(v){
    const t = this.next();
    if(!t || t.t !== 'op' || t.v !== v) throw new SyntaxError(`期望 "${v}"`);
  }
  parseExpr(minPrec){
    let left = this.parseUnary();
    for(;;){
      const t = this.peek();
      if(!t || t.t !== 'op' || !(t.v in BIN) || BIN[t.v] < minPrec) return left;
      this.next();
      const right = this.parseExpr(BIN[t.v] + 1);
      left = { k:'bin', op:t.v, l:left, r:right };
    }
  }
  parseUnary(){
    const t = this.peek();
    if(t && t.t === 'op' && (t.v === '!' || t.v === '-')){
      this.next();
      return { k:'un', op:t.v, x:this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary(){
    const t = this.next();
    if(!t) throw new SyntaxError('表达式意外结束');
    if(t.t === 'num') return { k:'lit', v:t.v };
    if(t.t === 'str') return { k:'lit', v:t.v };
    if(t.t === 'id'){
      if(t.v === 'true')  return { k:'lit', v:true };
      if(t.v === 'false') return { k:'lit', v:false };
      if(t.v === 'null')  return { k:'lit', v:null };
      /* 函数调用 */
      const nx = this.peek();
      if(nx && nx.t === 'op' && nx.v === '('){
        this.next();
        const args = [];
        if(!(this.peek() && this.peek().t==='op' && this.peek().v===')')){
          for(;;){
            args.push(this.parseExpr(0));
            const a = this.next();
            if(!a || a.t!=='op') throw new SyntaxError('函数参数格式错误');
            if(a.v === ')') break;
            if(a.v !== ',') throw new SyntaxError('期望 "," 或 ")"');
          }
        } else this.next();
        return { k:'call', fn:t.v, args };
      }
      /* 成员访问链 a.b.c */
      let node = { k:'var', name:t.v };
      while(this.peek() && this.peek().t==='op' && this.peek().v==='.'){
        this.next();
        const m = this.next();
        if(!m || m.t !== 'id') throw new SyntaxError('成员访问格式错误');
        node = { k:'member', obj:node, name:m.v };
      }
      return node;
    }
    if(t.t === 'op' && t.v === '('){
      const inner = this.parseExpr(0);
      this.expectOp(')');
      return inner;
    }
    throw new SyntaxError(`意外的记号 "${t.v}"（位置 ${t.pos}）`);
  }
}

/* ---------- 求值 ---------- */
const FUNCS = {
  len:    x => x == null ? 0 : (Array.isArray(x)||typeof x==='string' ? x.length : Object.keys(x).length),
  str:    x => stringify(x),
  num:    x => { const n = Number(x); if(Number.isNaN(n)) throw new Error(`无法将 ${stringify(x)} 转为数字`); return n; },
  lower:  x => String(x).toLowerCase(),
  upper:  x => String(x).toUpperCase(),
  trim:   x => String(x).trim(),
  contains:(a,b) => stringify(a).includes(stringify(b)),
};

function stringify(v){
  if(v == null) return '';
  if(typeof v === 'string') return v;
  if(typeof v === 'number' || typeof v === 'boolean') return String(v);
  try{ return JSON.stringify(v); }catch{ return String(v); }
}

function evalNode(n, scope){
  switch(n.k){
    case 'lit': return n.v;
    case 'var': return scope[n.name];
    case 'member': {
      const o = evalNode(n.obj, scope);
      if(o == null) return undefined;
      if(typeof o === 'object') return o[n.name];
      return undefined;
    }
    case 'un': {
      const v = evalNode(n.x, scope);
      return n.op === '!' ? !truthy(v) : -Number(v);
    }
    case 'call': {
      const f = FUNCS[n.fn];
      if(!f) throw new Error(`不支持的函数 ${n.fn}()（可用：${Object.keys(FUNCS).join(', ')}）`);
      return f(...n.args.map(a=>evalNode(a, scope)));
    }
    case 'bin': {
      const op = n.op;
      if(op === '&&') return truthy(evalNode(n.l, scope)) ? evalNode(n.r, scope) : false;
      if(op === '||') { const l = evalNode(n.l, scope); return truthy(l) ? l : evalNode(n.r, scope); }
      const a = evalNode(n.l, scope), b = evalNode(n.r, scope);
      switch(op){
        case '+': return (typeof a === 'string' || typeof b === 'string') ? stringify(a)+stringify(b) : a+b;
        case '-': return Number(a)-Number(b);
        case '*': return Number(a)*Number(b);
        case '/': { const d = Number(b); if(d === 0) throw new Error('除以零'); return Number(a)/d; }
        case '%': return Number(a)%Number(b);
        case '==': return looseEq(a,b);
        case '!=': return !looseEq(a,b);
        case '>':  return compare(a,b) > 0;
        case '>=': return compare(a,b) >= 0;
        case '<':  return compare(a,b) < 0;
        case '<=': return compare(a,b) <= 0;
      }
      throw new Error(`未知运算符 ${op}`);
    }
  }
}
function truthy(v){ return !(v == null || v === false || v === 0 || v === '' || (Array.isArray(v)&&!v.length)); }
function looseEq(a,b){
  if(a == null && b == null) return true;
  if(typeof a === 'string' || typeof b === 'string') return stringify(a) === stringify(b);
  return a === b;
}
function compare(a,b){
  if(typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  const x = Number(a), y = Number(b);
  if(Number.isNaN(x) || Number.isNaN(y)) return stringify(a) < stringify(b) ? -1 : 1;
  return x - y;
}
