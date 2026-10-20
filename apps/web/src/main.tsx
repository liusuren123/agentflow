import { createRoot } from 'react-dom/client';
import App from './App';
import './app.css';

/* 无 StrictMode：legacy 命令式模块要求单次挂载（bootLegacyApp 已幂等，
   但双调用仍会重复查询/注册，机械移植阶段保持与原版完全一致的单次生命周期） */
const rootEl = document.getElementById('root')!;
rootEl.style.height = '100%';   /* #app{height:100%} 的祖先链适配（同 App.tsx 说明） */
createRoot(rootEl).render(<App />);
