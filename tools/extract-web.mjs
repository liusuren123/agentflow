/* ================================================================
 *  extract-web.mjs — Stage 2 机械移植的提取器（构建工具）
 *  从宪法权威 index.html 中提取三件套到 apps/web/src：
 *    app.css        原 <style> 全文（逐字）
 *    skeleton.html  原 <body> 静态骨架（去掉 <script>）
 *    legacy/app.js  原 <script> 全文（逐字，经 bootstrap 包装后使用）
 *  运行：node tools/pixel-gate/../extract-web.mjs（在仓库根）
 *  仅在 index.html 仍是权威源期间使用；切换后本工具作废。
 * ================================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const style = html.match(/<style>([\s\S]*)<\/style>/)[1];
const body = html.match(/<body>([\s\S]*)<script>/)[1];
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
if (!style || !body || !script) throw new Error('index.html 结构不符（缺 style/body/script）');

const outDir = path.join(ROOT, 'apps', 'web', 'src');
mkdirSync(path.join(outDir, 'legacy'), { recursive: true });
writeFileSync(path.join(outDir, 'app.css'), style.replace(/^\r?\n/, ''));
writeFileSync(path.join(outDir, 'skeleton.html'), body.replace(/^\r?\n/, '').replace(/\s*$/, '\n'));

/* legacy 脚本包装：导出 bootLegacyApp，幂等（防意外二次挂载）。
   内容逐字保留 —— 只在头部插入幂等守卫，尾部不改动。 */
const bootstrapped = `/* 本文件由 tools/extract-web.mjs 从 index.html 逐字提取（宪法：机械移植）。
 * 原脚本为顶层副作用式；此处包装为 bootLegacyApp() 供 React 在骨架渲染后调用。 */
` + script.replace("'use strict';", "'use strict';\nlet __af_booted = false;\nexport function bootLegacyApp(){\n  if (__af_booted) return; __af_booted = true;\n") + '\n}\n';
writeFileSync(path.join(outDir, 'legacy', 'app.js'), bootstrapped);

console.log(`css ${style.length}B | skeleton ${body.length}B | script ${script.length}B → apps/web/src`);
