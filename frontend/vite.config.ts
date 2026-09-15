import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
        agent: false, // 禁用代理agent，直接连接
        bypass: (req) => {
          // 绕过系统代理
          if (req.headers['x-real-ip']) {
            delete req.headers['x-real-ip'];
          }
        },
        configure: (proxy, _options) => {
          // 清除代理环境变量
          delete process.env.http_proxy;
          delete process.env.https_proxy;
          delete process.env.HTTP_PROXY;
          delete process.env.HTTPS_PROXY;
          
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  // Keep production chunking automatic. The former package-based manualChunks
  // strategy created a circular chunk dependency under Rolldown (Ant Design →
  // Zustand → Ant Design), which made the Docker/Nginx production build render
  // a blank page at runtime.
})
