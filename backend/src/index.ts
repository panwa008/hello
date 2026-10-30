import { serve } from '@hono/node-server'
import type { Server as HttpServer } from 'node:http'
import { app, VERSION } from './app'
import { seedIfEmpty } from './seed'
import { config, configErrors, configWarnings } from './config'
import { attachRealtime, closeRealtime } from './realtime'

const errors = configErrors()
if (errors.length) {
  console.error('[hello] refusing to start — fix these settings / ไม่สามารถเริ่มระบบได้:\n  - ' + errors.join('\n  - '))
  process.exit(78) // EX_CONFIG
}
for (const w of configWarnings()) console.warn('[hello] WARNING: ' + w)

seedIfEmpty().then(() => {
  const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (i) =>
    console.log(`[hello] API v${VERSION} (${config.env}, payments=${config.payMode}) listening on http://${config.host}:${i.port}  (health: /api/health, realtime: /api/socket.io)`))
  attachRealtime(server as unknown as HttpServer)
  const stop = () => { closeRealtime(); server.close(); process.exit(0) }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
})
