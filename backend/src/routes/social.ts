import { z } from 'zod'
import { db, now, uid, bad, notFound, ApiError, tx } from '../db'
import { body, done, router } from '../http'
import { getUser, personOf, isFriend } from '../state'
import { credit, debit, bump } from '../services'
import { emitToUser } from '../realtime'

const r = router()
const REPLIES = ['ได้เลยยย 😆', 'จริงหรอ น่าสนใจมาก ✨', 'ฮ่า ๆ น่ารักอะ 💜', 'เดี๋ยวพาน้องไปเจอนะ 🐾', 'ตอนนี้อยู่แถวสวนเลย มาเดินด้วยกันมั้ย 🌸', 'ขอบคุณน้าา 🫶', 'โอเค แล้วเจอกัน 👋', 'วันนี้เดินไปกี่ก้าวแล้ว? 👣']
const MARKET_BACK = ['ยังอยู่ครับ/ค่ะ 😊 นัดรับได้เลย', 'ยังไม่มีคนจองนะ สนใจนัดดูของไหม?', 'ได้เลย ส่งรูปเพิ่มให้ทีหลังนะ 📸']
const WAVE_BACK = ['👋 หวัดดีจ้า!', 'โบกมือกลับ 👋😊', 'ไฮ~ ยินดีที่ได้รู้จักนะ ✨']
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]

const other = (id: string) => { const u = getUser(id); if (!u) throw notFound('ไม่พบผู้ใช้'); return u }

r.get('/users/:id', (c) => {
  const u = other(c.req.param('id'))
  return c.json({ ok: true, person: personOf(u, u.is_bot ? { distance: u.bot_distance ?? 0, angle: u.bot_bearing ?? 0 } : {}), friend: isFriend(c.get('userId'), u.id) })
})
r.get('/users', (c) => {
  const q = `%${(c.req.query('q') ?? '').toLowerCase()}%`
  const rows = db.prepare('SELECT * FROM users WHERE id<>? AND (lower(name) LIKE ? OR lower(handle) LIKE ?) LIMIT 30').all(c.get('userId'), q, q) as never[]
  return c.json({ ok: true, people: rows.map((u) => personOf(u)) })
})

// ---- friends ----
r.post('/friends/request', body(z.object({ id: z.string() })), (c) => {
  const me = c.get('userId'), to = other(c.req.valid('json').id)
  if (to.id === me) throw bad('เพิ่มตัวเองไม่ได้')
  if (isFriend(me, to.id)) throw bad('เป็นเพื่อนกันอยู่แล้ว', 'already_friends')
  // if they already requested me -> accept
  const theirs = db.prepare("SELECT 1 FROM friendships WHERE requester=? AND addressee=? AND status='pending'").get(to.id, me)
  if (theirs) { db.prepare("UPDATE friendships SET status='accepted' WHERE requester=? AND addressee=?").run(to.id, me); emitToUser(to.id, 'state:changed'); return done(c, { status: 'accepted' }) }
  const auto = !!to.is_bot && (to.status === 'open' || to.status === 'single')
  db.prepare('INSERT OR REPLACE INTO friendships (requester,addressee,status,created_at) VALUES (?,?,?,?)').run(me, to.id, auto ? 'accepted' : 'pending', now())
  emitToUser(to.id, 'state:changed')
  return done(c, { status: auto ? 'accepted' : 'pending', name: to.name }, 201)
})
r.post('/friends/:id/accept', (c) => {
  const me = c.get('userId'), id = c.req.param('id')
  const res = tx(() => {
    const ch = db.prepare("UPDATE friendships SET status='accepted', created_at=? WHERE requester=? AND addressee=? AND status='pending'").run(now(), id, me)
    if (!ch.changes) throw notFound('ไม่พบคำขอเป็นเพื่อน')
    credit(me, 10, 'เพื่อนใหม่', 'friend')
    return { reward: 10 }
  })
  emitToUser(id, 'state:changed')
  return done(c, res)
})
r.post('/friends/:id/decline', (c) => {
  db.prepare("DELETE FROM friendships WHERE requester=? AND addressee=? AND status='pending'").run(c.req.param('id'), c.get('userId'))
  return done(c)
})
r.delete('/friends/:id', (c) => {
  const me = c.get('userId'), id = c.req.param('id')
  db.prepare('DELETE FROM friendships WHERE (requester=? AND addressee=?) OR (requester=? AND addressee=?)').run(me, id, id, me)
  return done(c)
})
r.post('/friends/:id/feed-pet', (c) => {
  const me = c.get('userId'), f = other(c.req.param('id'))
  if (!isFriend(me, f.id)) throw new ApiError(403, 'ให้อาหารได้เฉพาะสัตว์เลี้ยงของเพื่อน', 'forbidden')
  tx(() => { debit(me, 20, `ให้อาหาร ${f.pet_name ?? 'สัตว์เลี้ยง'} ของ ${f.name}`); bump(me, 'feedOthers') })
  return done(c, { cost: 20 })
})

// ---- chat ----
r.post('/chats/:peer', body(z.object({ text: z.string().trim().min(1).max(1000), kind: z.enum(['text', 'wave', 'hi', 'feed', 'market']).default('text') })), (c) => {
  const me = c.get('userId'), peer = other(c.req.param('peer')), f = c.req.valid('json')
  if (peer.id === me) throw bad('ส่งหาตัวเองไม่ได้')
  const id = uid('m')
  db.prepare('INSERT INTO messages (id,from_id,to_id,text,kind,created_at) VALUES (?,?,?,?,?,?)').run(id, me, peer.id, f.text, f.kind, now())
  let reply: { text: string; at: number } | null = null
  if (peer.is_bot && peer.status !== 'hidden') {
    const text = f.kind === 'market' ? pick(MARKET_BACK) : f.kind === 'wave' || f.kind === 'hi' ? pick(WAVE_BACK) : pick(REPLIES)
    const at = now() + 1800 + Math.floor(Math.random() * 1500)
    db.prepare('INSERT INTO messages (id,from_id,to_id,text,kind,created_at) VALUES (?,?,?,?,?,?)').run(uid('m'), peer.id, me, text, 'text', at)
    reply = { text, at }
    setTimeout(() => emitToUser(me, 'chat:message', { from: peer.id, to: me }), Math.max(0, at - now()) + 50).unref()
  }
  emitToUser(peer.id, 'chat:message', { from: me, to: peer.id, id })
  return done(c, { id, reply }, 201)
})
r.post('/chats/:peer/read', (c) => {
  db.prepare('UPDATE messages SET read_at=? WHERE to_id=? AND from_id=? AND read_at IS NULL AND created_at<=?').run(now(), c.get('userId'), c.req.param('peer'), now())
  return done(c)
})
export default r
