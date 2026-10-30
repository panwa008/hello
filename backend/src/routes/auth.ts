import { Hono } from 'hono'
import { z } from 'zod'
import { db, now, uid, bad, ApiError, tx } from '../db'
import { hashPassword, checkPassword, issueTokens, rotateRefresh, revokeRefresh, requireAuth, type AuthEnv } from '../auth'
import { body, done } from '../http'
import { buildState, getUser } from '../state'
import { starterKit } from '../seed'
import { credit } from '../services'
import { config } from '../config'

const PW_MIN = config.prod ? 8 : 6

const r = new Hono<AuthEnv>()
const email = z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง')

r.post('/register', body(z.object({ name: z.string().trim().min(1, 'กรุณาใส่ชื่อที่แสดง').max(40), email, password: z.string().min(PW_MIN, `รหัสผ่านอย่างน้อย ${PW_MIN} ตัวอักษร`).max(128), gender: z.enum(['f', 'm']).default('f') })), async (c) => {
  const f = c.req.valid('json')
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(f.email)) throw new ApiError(409, 'อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบ', 'email_taken')
  const hash = await hashPassword(f.password)
  const id = uid('usr')
  tx(() => {
    db.prepare('INSERT INTO users (id,email,pass_hash,name,handle,bio,gender,hair,skin,level,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)').run(id, f.email, hash, f.name, '@' + f.name.toLowerCase().replace(/[^\w.]+/g, '.').slice(0, 20), 'สวัสดี! เพิ่งมาใหม่ใน Hello 👋', f.gender, f.gender === 'f' ? '#7A4A35' : '#2A2433', '#FCE0CF', now())
    starterKit(id, { points: config.starterPoints })
    if (!config.prod) credit(id, 500, 'โบนัสสมาชิกใหม่', 'bonus')
  })
  const tokens = await issueTokens(id)
  return c.json({ ok: true, result: { tokens }, state: buildState(id) }, 201)
})

r.post('/login', body(z.object({ email, password: z.string().min(1) })), async (c) => {
  const f = c.req.valid('json')
  const u = db.prepare('SELECT id, pass_hash FROM users WHERE email=? AND is_bot=0').get(f.email) as { id: string; pass_hash: string } | undefined
  if (!u || !(await checkPassword(f.password, u.pass_hash))) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'bad_credentials')
  const tokens = await issueTokens(u.id)
  return c.json({ ok: true, result: { tokens }, state: buildState(u.id) })
})

r.post('/refresh', body(z.object({ refreshToken: z.string().min(10) })), async (c) => {
  const { tokens } = await rotateRefresh(c.req.valid('json').refreshToken)
  return c.json({ ok: true, result: { tokens } })
})

r.post('/logout', body(z.object({ refreshToken: z.string().optional() })), (c) => {
  const t = c.req.valid('json').refreshToken
  if (t) revokeRefresh(t)
  return c.json({ ok: true })
})

// ---- profile (/api/me) ----
export const me = new Hono<AuthEnv>()
me.use('*', requireAuth)
me.get('/', (c) => c.json({ ok: true, state: buildState(c.get('userId')) }))
me.patch('/', body(z.object({
  name: z.string().trim().min(1, 'ชื่อห้ามว่าง').max(40).optional(),
  handle: z.string().regex(/^@[\w.]{2,24}$/, 'ชื่อผู้ใช้ต้องขึ้นต้นด้วย @ และใช้ a-z 0-9 . _').optional(),
  bio: z.string().max(200).optional(), gender: z.enum(['f', 'm']).optional(),
  hair: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(), skin: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
})), (c) => {
  const p = c.req.valid('json'), id = c.get('userId')
  for (const [k, v] of Object.entries(p)) if (v !== undefined) db.prepare(`UPDATE users SET ${k}=? WHERE id=?`).run(v, id)
  return done(c, getUser(id) && null)
})
me.post('/password', body(z.object({ old: z.string(), password: z.string().min(PW_MIN, `รหัสผ่านใหม่อย่างน้อย ${PW_MIN} ตัวอักษร`).max(128) })), async (c) => {
  const f = c.req.valid('json'), id = c.get('userId')
  const u = getUser(id)!
  if (!(await checkPassword(f.old, u.pass_hash ?? ''))) throw bad('รหัสผ่านเดิมไม่ถูกต้อง', 'bad_password')
  db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(await hashPassword(f.password), id)
  db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?').run(id)
  return done(c)
})
me.patch('/privacy', body(z.object({ privacy: z.enum(['public', 'nearby', 'friends', 'ghost', 'invisible']).optional(), relationship: z.enum(['open', 'single', 'heartbroken', 'taken', 'family', 'hidden']).optional() })), (c) => {
  const p = c.req.valid('json'), id = c.get('userId')
  if (p.privacy) db.prepare('UPDATE users SET privacy=? WHERE id=?').run(p.privacy, id)
  if (p.relationship) db.prepare('UPDATE users SET status=? WHERE id=?').run(p.relationship, id)
  return done(c)
})
me.put('/prefs', body(z.record(z.string(), z.unknown())), (c) => {
  const s = JSON.stringify(c.req.valid('json'))
  if (s.length > 20_000) throw bad('prefs too large')
  db.prepare('UPDATE users SET prefs=? WHERE id=?').run(s, c.get('userId'))
  return c.json({ ok: true })
})
me.delete('/', (c) => {
  db.prepare('DELETE FROM users WHERE id=?').run(c.get('userId'))
  return c.json({ ok: true })
})
export default r
