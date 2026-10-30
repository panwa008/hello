import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import { db, ApiError } from './db'
import { requireAuth, type AuthEnv } from './auth'
import authRoutes, { me } from './routes/auth'
import feed from './routes/feed'
import social from './routes/social'
import pets from './routes/pets'
import shop from './routes/shop'
import market from './routes/market'
import wallet from './routes/wallet'
import explorer from './routes/explorer'
import games from './routes/games'
import payments, { webhooks } from './routes/payments'
import { CATALOG } from './catalog'
import { config, publicFeatures } from './config'
import { rateLimit } from './ratelimit'
import { promptPayConfigured } from './payments/promptpay'

export const VERSION = '1.0.0'
export const app = new Hono<AuthEnv>()

// Strict CORS: exact origins from CORS_ORIGIN (production refuses "*" — see config.ts).
const origins = config.corsOrigins
app.use('*', cors({ origin: origins.includes('*') ? '*' : origins, allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], maxAge: 600 }))
if (process.env.NODE_ENV !== 'test' && process.env.LOG !== 'false') app.use('*', logger())
app.use('*', secureHeaders({
  crossOriginResourcePolicy: false,
  // JSON API: nothing may be rendered/framed from here
  contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] },
  xFrameOptions: 'DENY', referrerPolicy: 'no-referrer',
  strictTransportSecurity: config.prod ? 'max-age=31536000; includeSubDomains' : false,
  permissionsPolicy: { geolocation: [], camera: [], microphone: [] },
}))
app.use('*', async (c, next) => { await next(); c.header('Cache-Control', c.res.headers.get('Cache-Control') ?? 'no-store') })
// Rate limits (per IP, per minute)
for (const p of ['/api/auth/login', '/api/auth/register', '/api/me/password']) app.use(p, rateLimit('auth', config.rlAuthPerMin))
app.use('/api/auth/refresh', rateLimit('refresh', config.rlRefreshPerMin))
const payRL = rateLimit('pay', config.rlPayPerMin), hookRL = rateLimit('webhook', config.rlWebhookPerMin)
app.use('/api/payments/*', (c, next) => (c.req.path.endsWith('/webhook') ? hookRL(c, next) : c.req.method === 'GET' ? next() : payRL(c, next)))
app.use('/api/wallet/topup', payRL)
app.use('/api/wallet/demo-topup', payRL)
app.use('/api/*', bodyLimit({ maxSize: 4 * 1024 * 1024, onError: (c) => c.json({ ok: false, error: 'ข้อมูลใหญ่เกินไป', code: 'too_large' }, 413) }))

app.get('/', (c) => c.json({ name: 'hello-api', version: VERSION, docs: 'see README.md', health: '/api/health' }))
app.get('/api/health', (c) => {
  const users = (db.prepare('SELECT COUNT(*) n FROM users WHERE is_bot=0').get() as { n: number }).n
  return c.json({ ok: true, status: 'up', version: VERSION, time: new Date().toISOString(), db: 'sqlite', users, demoBots: config.demoBots, truemoney: config.payMode, realtime: true, features: { ...publicFeatures(), promptpay: promptPayConfigured() } })
})
app.get('/api/catalog', (c) => c.json({ ok: true, items: CATALOG }))

app.route('/api/auth', authRoutes)
app.route('/api/payments', webhooks) // public (signature-verified) — must be registered before the JWT-protected /api
app.route('/api/me', me)

const api = new Hono<AuthEnv>()
api.use('*', requireAuth)
for (const r of [feed, social, pets, shop, market, wallet, explorer, games, payments]) api.route('/', r)
app.route('/api', api)

app.notFound((c) => c.json({ ok: false, error: 'ไม่พบ endpoint นี้', code: 'not_found' }, 404))
app.onError((err, c) => {
  if (err instanceof ApiError) return c.json({ ok: false, error: err.message, code: err.code, ...((err as { missing?: string[] }).missing ? { missing: (err as { missing?: string[] }).missing } : {}) }, err.status as 400)
  if (err instanceof HTTPException) return c.json({ ok: false, error: err.message, code: 'http' }, err.status)
  if (err instanceof SyntaxError) return c.json({ ok: false, error: 'JSON ไม่ถูกต้อง', code: 'bad_json' }, 400)
  console.error('[hello] unhandled', err)
  return c.json({ ok: false, error: 'เซิร์ฟเวอร์ขัดข้อง ลองใหม่อีกครั้ง', code: 'server_error' }, 500)
})
