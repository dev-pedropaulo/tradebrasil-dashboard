import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/nocodb': {
        target: 'https://agentesn8n-nocodb.cqc86v.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nocodb/, '')
      }
    }
  }
})
