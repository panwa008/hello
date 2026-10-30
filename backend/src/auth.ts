import { sign, verify } from 'hono/jwt'
import { createMiddleware } from 'hono/factory'
import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db, now, uid, ApiError } from './db'

import { config } from './config'

// Production refuses to boot without a strong JWT_SECRET (see config.ts → configErrors()).
export const JWT_SECRET = config.jwtSecret
const ACCESS_TTL = config.accessTtl     // clamped 1 min – 1 h (default 15 min)
const REFRESH_TTL = config.refreshTtl   // clamped 1 h – 90 d (default 30 d)

export const hashPassword = (pw: string) => bcrypt.hash(pw, config.bcryptRounds) // ≥10 (prod default 12)
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash)
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export async function issueTokens(userId: string) {
  const iat = Math.floor(Date.now() / 1000)
  const accessToken = await sign({ sub: userId, iat, exp: iat + ACCESS_TTL, typ: 'access' }, JWT_SECRET, 'HS256')
  const raw = randomBytes(32).toString('hex')
  const id = uid('rt')
  db.prepare('INSERT INTO refresh_tokens (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').run(id, userId, sha(raw), now() + REFRESH_TTL * 1000, now())
  return { accessToken, refreshToken: `${id}.${raw}`, expiresIn: ACCESS_TTL }
}
/** Rotate a refresh token: old one is revoked, a new pair is issued. */
export async function rotateRefresh(token: string) {
  const [id, raw] = token.split('.')
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE id=?').get(id ?? '') as { user_id: string; token_hash: string; expires_at: number; revoked: number } | undefined
  if (!row || row.token_hash !== sha(raw ?? '')) throw new ApiError(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'invalid_refresh')
  if (row.revoked) {
    // Reuse of an already-rotated token ⇒ likely stolen. Kill every session of this user.
    db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?').run(row.user_id)
    console.warn(`[hello] refresh-token reuse detected for ${row.user_id} — all sessions revoked`)
    throw new ApiError(401, 'ตรวจพบการใช้เซสชันซ้ำ กรุณาเข้าสู่ระบบใหม่ / session reuse detected', 'refresh_reused')
  }
  if (row.expires_at < now()) throw new ApiError(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'invalid_refresh')
  const r = db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE id=? AND revoked=0').run(id)
  if (r.changes === 0) throw new ApiError(401, 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 'invalid_refresh')
  // housekeeping: drop long-expired tokens
  db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ?').run(now() - 7 * 24 * 3600 * 1000)
  return { userId: row.user_id, tokens: await issueTokens(row.user_id) }
}
export function revokeRefresh(token: string) {
  const [id] = token.split('.')
  db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE id=?').run(id ?? '')
}

/** Verify an access token; returns the user id or null (used by the realtime socket handshake). */
export async function verifyAccess(token: string): Promise<string | null> {
  try {
    const p = await verify(token, JWT_SECRET, 'HS256') as { sub?: unknown; typ?: unknown }
    if (typeof p.sub !== 'string' || p.typ !== 'access') return null
    return db.prepare('SELECT 1 FROM users WHERE id=? AND is_bot=0').get(p.sub) ? p.sub : null
  } catch { return null }
}

export type AuthEnv = { Variables: { userId: string } }
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const h = c.req.header('authorization') ?? ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) throw new ApiError(401, 'กรุณาเข้าสู่ระบบ', 'unauthorized')
  let payload: { sub?: unknown; typ?: unknown }
  try { payload = await verify(token, JWT_SECRET, 'HS256') as typeof payload } catch { throw new ApiError(401, 'โทเค็นไม่ถูกต้องหรือหมดอายุ', 'token_expired') }
  if (typeof payload.sub !== 'string' || payload.typ !== 'access') throw new ApiError(401, 'โทเค็นไม่ถูกต้อง', 'unauthorized')
  const exists = db.prepare('SELECT 1 FROM users WHERE id=? AND is_bot=0').get(payload.sub)
  if (!exists) throw new ApiError(401, 'ไม่พบผู้ใช้', 'unauthorized')
  c.set('userId', payload.sub)
  await next()
})
