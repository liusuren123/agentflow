/* ================================================================
 *  App.tsx — React 仅承载静态骨架（ADR-0002）
 *  CP-C：骨架为等价 JSX（Skeleton.tsx），#af-shell 适配层移除
 *  （#root 内联 height:100% 直接作为 #app{height:100%} 的父级，
 *  高度链不变，不改 CSS 源文件）。画布与全部交互在 legacy 模块
 *  （命令式，挂载后 boot）。
 * ================================================================ */
import { useEffect } from 'react';
import { bootLegacyApp } from './legacy/app.js';
import Skeleton from './Skeleton';

export default function App(){
  useEffect(() => { bootLegacyApp(); }, []);
  return <Skeleton />;
}
