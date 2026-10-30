import { z } from 'zod'
import { createHash } from 'node:crypto'
import { db, now, uid, bad, notFound, tx, ApiError } from '../db'
import { body, done, query, router } from '../http'
import { haversine, bearing, destination, zoneOf } from '../geo'
import { getUser, personOf, isFriend, friendIds, type UserRow } from '../state'
import { addEgg, credit } from '../services'
import { config } from '../config'
import { emitExplorerChanged } from '../realtime'

const r = router()
const DEMO_BOTS = config.demoBots
const FRESH_MS = 15 * 60_000
const HUES = ['#F5A9C5', '#9FD3F5', '#A8E6CF', '#CDB8F2', '#FFD3B5']
const MAX_SPEED = 70 // m/s — anything faster is rejected as a GPS spoof/teleport (except first fix / big gaps)

type Loc = { lat: number; lng: number; accuracy: number | null; source: string; updated_at: number }
const locOf = (id: string) => db.prepare('SELECT * FROM locations WHERE user_id=?').get(id) as Loc | undefined

r.post('/explorer/location', body(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().min(0).max(100_000).optional(), source: z.enum(['gps', 'mock']).default('gps') })), (c) => {
  const id = c.get('userId'), f = c.req.valid('json')
  if (f.source === 'mock' && !config.allowMockLocation) throw new ApiError(403, 'ตำแหน่งจำลองปิดในโหมดจริง ต้องใช้ GPS / mock locations are disabled in production', 'mock_location_disabled')
  const prev = locOf(id)
  let moved = 0
  if (prev) {
    moved = haversine(prev.lat, prev.lng, f.lat, f.lng)
    const dt = (now() - prev.updated_at) / 1000
    if (dt < 600 && dt > 0 && moved / dt > MAX_SPEED && moved > 1000) throw bad('ตำแหน่งเปลี่ยนเร็วผิดปกติ', 'teleport')
  }
  db.prepare('INSERT OR REPLACE INTO locations (user_id,lat,lng,accuracy,source,updated_at) VALUES (?,?,?,?,?,?)').run(id, f.lat, f.lng, f.accuracy ?? null, f.source, now())
  db.prepare('INSERT INTO location_trail (user_id,lat,lng,created_at) VALUES (?,?,?,?)').run(id, f.lat, f.lng, now())
  db.prepare('DELETE FROM location_trail WHERE user_id=? AND created_at<?').run(id, now() - 24 * 3600_000)
  if (!prev || moved > 15) {
    // push "re-fetch nearby" to friends + people seen near me in the last 15 min (ids only — never coordinates)
    const near = (db.prepare('SELECT user_id, lat, lng FROM locations WHERE updated_at > ? AND user_id != ?').all(now() - FRESH_MS, id) as { user_id: string; lat: number; lng: number }[])
      .filter((l) => haversine(l.lat, l.lng, f.lat, f.lng) < 5000).map((l) => l.user_id)
    emitExplorerChanged(id, [...friendIds(id), ...near])
  }
  return c.json({ ok: true, result: { moved: Math.round(moved), eggs: eggSpots(id) } })
})

/** Bots wander slowly around their home offset so the radar feels alive. */
function botOffset(u: UserRow, i: number) {
  const t = now() / 1000
  const d = Math.max(25, (u.bot_distance ?? 300) + Math.sin(t / 40 + i) * 45 * (i % 3 === 0 ? 1.4 : 1))
  const b = ((u.bot_bearing ?? 0) + t * (i % 2 ? 0.05 : -0.04)) % 360
  return { d, b: (b + 360) % 360 }
}
const anonId = (viewer: string, id: string) => 'anon_' + createHash('sha1').update(viewer + ':' + id).digest('hex').slice(0, 10)

function nearby(viewer: string, radius: number) {
  const me = locOf(viewer)
  if (!me) return { located: false as const, people: [] }
  const friends = new Set(friendIds(viewer))
  const out: ReturnType<typeof present>[] = []
  function present(u: UserRow, dist: number, brg: number) {
    const z = zoneOf(dist)
    const rounded = Math.max(10, Math.round(dist / 5) * 5)
    const base = personOf(u, { distance: rounded, angle: Math.round(brg) })
    const hidden = u.status === 'hidden'
    if (z === 'far' || (hidden && !friends.has(u.id))) {
      // identity stripped: only a status dot
      return { ...base, id: anonId(viewer, u.id), name: '', handle: '', bio: '', mood: '', petEmoji: undefined, petName: undefined, mutual: 0, level: 0, visibility: 'dot' as const, friend: false }
    }
    return { ...base, visibility: z === 'near' ? ('clear' as const) : ('blur' as const), mood: z === 'near' ? base.mood : '', bio: z === 'near' ? base.bio : '', friend: friends.has(u.id) }
  }
  if (DEMO_BOTS) {
    const bots = db.prepare('SELECT * FROM users WHERE is_bot=1 ORDER BY rowid').all() as UserRow[]
    bots.forEach((u, i) => { const o = botOffset(u, i); if (o.d <= radius) out.push(present(u, o.d, o.b)) })
  }
  const real = db.prepare(`SELECT u.*, l.lat, l.lng FROM users u JOIN locations l ON l.user_id=u.id WHERE u.id<>? AND u.is_bot=0 AND l.updated_at>?`).all(viewer, now() - FRESH_MS) as (UserRow & { lat: number; lng: number })[]
  for (const u of real) {
    if (u.privacy === 'invisible' || u.privacy === 'ghost') continue
    if (u.privacy === 'friends' && !friends.has(u.id)) continue
    const dist = haversine(me.lat, me.lng, u.lat, u.lng)
    if (dist > radius) continue
    out.push(present(u, dist, bearing(me.lat, me.lng, u.lat, u.lng)))
  }
  return { located: true as const, people: out.sort((a, b) => a.distance - b.distance) }
}

r.get('/explorer/nearby', query(z.object({ radius: z.coerce.number().min(50).max(5000).default(1000) })), (c) => {
  const id = c.get('userId'), q = c.req.valid('query')
  const res = nearby(id, q.radius)
  const me = locOf(id)
  return c.json({ ok: true, located: res.located, updatedAt: me?.updated_at ?? null, source: me?.source ?? null, people: res.people, eggs: res.located ? eggSpots(id) : [], zones: { clear: 200, blur: 500 } })
})

/** Egg spots near the user; spawns a new one 150–450 m away if none within 600 m. */
function eggSpots(userId: string) {
  const me = locOf(userId)
  if (!me) return []
  const spots = db.prepare('SELECT * FROM egg_spots WHERE user_id=? AND collected=0').all(userId) as { id: string; lat: number; lng: number; rarity: string; created_at: number }[]
  let live = spots.map((s) => ({ ...s, distance: haversine(me.lat, me.lng, s.lat, s.lng) }))
  // drop stale/far spots
  for (const s of live) if (s.distance > 3000 || now() - s.created_at > 6 * 3600_000) db.prepare('DELETE FROM egg_spots WHERE id=?').run(s.id)
  live = live.filter((s) => s.distance <= 3000 && now() - s.created_at <= 6 * 3600_000)
  const cooldown = db.prepare('SELECT MAX(created_at) t FROM egg_spots WHERE user_id=? AND collected=1').get(userId) as { t: number | null }
  if (!live.some((s) => s.distance <= 600) && (!cooldown.t || now() - cooldown.t > 8000)) {
    const p = destination(me.lat, me.lng, 150 + Math.random() * 300, Math.random() * 360)
    const rarity = Math.random() < 0.15 ? 'Epic' : Math.random() < 0.5 ? 'Rare' : 'Common'
    const id = uid('es')
    db.prepare('INSERT INTO egg_spots (id,user_id,lat,lng,rarity,created_at) VALUES (?,?,?,?,?,?)').run(id, userId, p.lat, p.lng, rarity, now())
    live.push({ id, lat: p.lat, lng: p.lng, rarity, created_at: now(), distance: haversine(me.lat, me.lng, p.lat, p.lng) })
  }
  return live.map((s) => ({ id: s.id, distance: Math.round(s.distance), angle: Math.round(bearing(me.lat, me.lng, s.lat, s.lng)), rarity: s.rarity, lat: s.lat, lng: s.lng }))
}
r.get('/explorer/eggs', (c) => c.json({ ok: true, eggs: eggSpots(c.get('userId')) }))

r.post('/explorer/eggs/:id/collect', (c) => {
  const id = c.get('userId')
  const res = tx(() => {
    const s = db.prepare('SELECT * FROM egg_spots WHERE id=? AND user_id=? AND collected=0').get(c.req.param('id'), id) as { id: string; lat: number; lng: number; rarity: string } | undefined
    if (!s) throw notFound('ไม่พบไข่ (อาจถูกเก็บไปแล้ว)')
    const me = locOf(id)
    if (!me || now() - me.updated_at > 5 * 60_000) throw bad('ยังไม่มีตำแหน่งล่าสุด เปิด GPS ก่อนนะ', 'no_location')
    const dist = haversine(me.lat, me.lng, s.lat, s.lng)
    if (dist > 200) throw bad(`ไข่อยู่ห่าง ${Math.round(dist)} ม. เดินเข้าไปให้ใกล้ ≤200 ม. ก่อนนะ`, 'too_far')
    db.prepare('UPDATE egg_spots SET collected=1, created_at=? WHERE id=?').run(now(), s.id)
    const dur = ({ Common: 20_000, Rare: 35_000, Epic: 50_000 } as Record<string, number>)[s.rarity] ?? 20_000
    const eggId = addEgg(id, s.rarity, HUES[Math.floor(Math.random() * HUES.length)], 'เก็บได้จากแผนที่', dur)
    credit(id, 10, 'เก็บไข่บนแผนที่', 'explore')
    return { eggId, rarity: s.rarity, distance: Math.round(dist) }
  })
  return done(c, res)
})
r.get('/explorer/trail', (c) => c.json({ ok: true, trail: db.prepare('SELECT lat,lng,created_at t FROM location_trail WHERE user_id=? ORDER BY id DESC LIMIT 200').all(c.get('userId')) }))
r.get('/explorer/person/:id', (c) => {
  const u = getUser(c.req.param('id')); if (!u) throw notFound()
  return c.json({ ok: true, friend: isFriend(c.get('userId'), u.id) })
})
export default r
