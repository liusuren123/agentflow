import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* 单文件产物：dist/index.html 内联全部 JS/CSS，双击可用（离线=模拟执行） */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },   // 开发时代理到执行后端
  },
});
