/* ================================================================
 *  App.tsx — React 仅承载静态骨架（ADR-0002）
 *  CP-B：骨架以 ?raw 引入经 dangerouslySetInnerHTML 注入，逐字节等于
 *  原 <body>；CP-C 将替换为等价 JSX。画布与全部交互在 legacy 模块
 *  （命令式，挂载后 boot）。
 * ================================================================ */
import { useEffect } from 'react';
import { bootLegacyApp } from './legacy/app.js';
import SHELL_HTML from './skeleton.html?raw';

export default function App(){
  useEffect(() => { bootLegacyApp(); }, []);
  /* 挂载适配层用内联样式传递 100% 高度：#app{height:100%} 依赖祖先链高度。
     不改 CSS 源文件（宪法：样式逐字保留），渲染结果与原版一致。 */
  return <div id="af-shell" style={{ height: '100%' }} dangerouslySetInnerHTML={{ __html: SHELL_HTML }} />;
}
