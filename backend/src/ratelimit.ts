import { createMiddleware } from 'hono/factory'
import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'
import { config } from './config'

/**
 * Fixed-window in-memory rate limiter (per client IP + bucket).
 * Single-instance only — when you run >1 API replica, move this to Redis (or use your proxy/WAF's limiter).
 */
const hits = new Map<string, { n: number; reset: number }>()
setInterval(() => { const t = Date.now(); for (const [k, v] of hits) if (v.reset < t) hits.delete(k) }, 60_000).unref()

export function clientIp(c: Context): string {
  if (config.trustProxy) {
    const xff = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (xff) return xff
    const real = c.req.header('x-real-ip'); if (real) return real
  }
  try { return getConnInfo(c).remote.address ?? 'unknown' } catch { return 'unknown' }
}

export const rateLimit = (bucket: string, limit: number, windowMs = 60_000) => createMiddleware(async (c, next) => {
  if (!config.rateLimit || limit <= 0) return next()
  const key = `${bucket}:${clientIp(c)}`, t = Date.now()
  let h = hits.get(key)
  if (!h || h.reset < t) { h = { n: 0, reset: t + windowMs }; hits.set(key, h) }
  h.n++
  c.header('RateLimit-Limit', String(limit))
  c.header('RateLimit-Remaining', String(Math.max(0, limit - h.n)))
  if (h.n > limit) {
    const retry = Math.ceil((h.reset - t) / 1000)
    c.header('Retry-After', String(retry))
    return c.json({ ok: false, error: `ส่งคำขอถี่เกินไป ลองใหม่ใน ${retry} วินาที / too many requests`, code: 'rate_limited' }, 429)
  }
  await next()
})
