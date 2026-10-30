import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Dev server: web on 5173, proxies /api (incl. the Socket.io WebSocket at /api/socket.io) → the Hello API (default http://localhost:3001).
// HTTPS=1 serves over a self-signed cert so phones on the LAN can use real GPS (Geolocation needs a secure context).
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const target = env.API_PROXY_TARGET || 'http://localhost:3001'
  const https = env.HTTPS === '1' || env.HTTPS === 'true'
  return {
    plugins: [react(), tailwindcss(), ...(https ? [basicSsl()] : [])],
    server: { host: '0.0.0.0', port: 5173, proxy: { '/api': { target, changeOrigin: true, ws: true } } },
    preview: { host: '0.0.0.0', port: 5173, proxy: { '/api': { target, changeOrigin: true, ws: true } } },
  }
})
