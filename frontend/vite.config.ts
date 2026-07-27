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
      },
    },
  },
  // Keep production chunking automatic. The former package-based manualChunks
  // strategy created a circular chunk dependency under Rolldown (Ant Design →
  // Zustand → Ant Design), which made the Docker/Nginx production build render
  // a blank page at runtime.
})
