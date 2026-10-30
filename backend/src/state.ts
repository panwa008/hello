import { db, now } from './db'
import { ITEM } from './catalog'
import { walletRow, daily, outfitOf, tickPet, petView, type PetRow } from './services'

export interface UserRow {
  id: string; email: string | null; pass_hash: string | null; name: string; handle: string; bio: string; gender: 'f' | 'm'; hair: string; skin: string
  level: number; is_bot: number; status: string; privacy: string; mood: string; pet_emoji: string | null; pet_name: string | null; bg: string | null
  mutual: number; bot_distance: number | null; bot_bearing: number | null; walking: number; active_pet: string | null; prefs: string; created_at: number
}
export const getUser = (id: string) => db.prepare('SELECT * FROM users WHERE id=?').get(id) as UserRow | undefined
export const publicUser = (u: UserRow) => ({ id: u.id, email: u.email, name: u.name, handle: u.handle, bio: u.bio, gender: u.gender, hair: u.hair, skin: u.skin, level: u.level, createdAt: u.created_at })

/** Person shape the frontend uses (distance/angle filled by explorer). */
export function personOf(u: UserRow, extra: { distance?: number; angle?: number } = {}) {
  return {
    id: u.id, name: u.name, handle: u.handle, status: u.status, distance: extra.distance ?? 9999, angle: extra.angle ?? 0,
    skin: u.skin, hair: u.hair, bg: u.bg ? JSON.parse(u.bg) : ['#EDE3FB', '#FBE3EE'], bio: u.bio, mood: u.mood || 'ออนไลน์อยู่ ✨',
    petEmoji: u.pet_emoji ?? undefined, petName: u.pet_name ?? undefined, gender: u.gender, mutual: u.mutual, level: u.level,
  }
}

export function friendIds(userId: string) {
  return (db.prepare(`SELECT CASE WHEN requester=? THEN addressee ELSE requester END AS id FROM friendships WHERE status='accepted' AND (requester=? OR addressee=?) ORDER BY created_at DESC`).all(userId, userId, userId) as { id: string }[]).map((r) => r.id)
}
export const isFriend = (a: string, b: string) => !!db.prepare(`SELECT 1 FROM friendships WHERE status='accepted' AND ((requester=? AND addressee=?) OR (requester=? AND addressee=?))`).get(a, b, b, a)

const me = (userId: string) => (id: string) => (id === userId ? 'me' : id)

export function feedPosts(userId: string) {
  const m = me(userId)
  const posts = db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 100').all() as { id: string; user_id: string; text: string; tags: string; place: string; scene: string; image: string | null; feeling: string | null; base_likes: number; created_at: number }[]
  const csStmt = db.prepare('SELECT * FROM comments WHERE post_id=? AND created_at<=? ORDER BY created_at')
  const cs = (id: string, t: number) => csStmt.all(id, t)
  const likeCount = db.prepare('SELECT COUNT(*) n FROM post_likes WHERE post_id=? AND user_id<>?')
  return posts.map((p) => {
    const all = cs(p.id, now()) as { id: string; user_id: string; parent_id: string | null; text: string; created_at: number }[]
    const top = all.filter((c) => !c.parent_id).map((c) => ({ id: c.id, by: m(c.user_id), text: c.text, time: c.created_at, replies: all.filter((r) => r.parent_id === c.id).map((r) => ({ id: r.id, by: m(r.user_id), text: r.text, time: r.created_at, replies: [] })) }))
    return {
      id: p.id, authorId: m(p.user_id), time: p.created_at, place: p.place, text: p.text, tags: JSON.parse(p.tags || '[]'), scene: p.scene,
      image: p.image ?? undefined, feeling: p.feeling ?? undefined, likes: p.base_likes + (likeCount.get(p.id, userId) as { n: number }).n, comments: top,
    }
  })
}

export function chats(userId: string) {
  const rows = db.prepare('SELECT * FROM messages WHERE (from_id=? OR to_id=?) AND created_at<=? ORDER BY created_at').all(userId, userId, now()) as { id: string; from_id: string; to_id: string; text: string; kind: string; read_at: number | null; created_at: number }[]
  const out: Record<string, { id: string; from: string; text: string; time: number; kind?: string }[]> = {}
  const unread: Record<string, number> = {}
  for (const r of rows) {
    const peer = r.from_id === userId ? r.to_id : r.from_id
    ;(out[peer] ??= []).push({ id: r.id, from: r.from_id === userId ? 'me' : peer, text: r.text, time: r.created_at, kind: r.kind })
    if (r.to_id === userId && !r.read_at) unread[peer] = (unread[peer] ?? 0) + 1
  }
  return { chats: out, unread }
}

export function marketView(rows: { id: string; seller_id: string; name: string; thb: number; points: number | null; emoji: string; tint: string; condition: string; category: string; status: string }[], viewerId: string) {
  return rows.map((l) => {
    const s = getUser(l.seller_id)
    const dist = s?.is_bot ? `${Math.round(s.bot_distance ?? 0)} ม.` : l.seller_id === viewerId ? '0 ม.' : 'ใกล้คุณ'
    return { id: l.id, name: l.name, thb: l.thb, points: l.points ?? undefined, emoji: l.emoji, tint: JSON.parse(l.tint), seller: s?.name ?? '—', sellerId: l.seller_id, distance: dist, condition: l.condition, category: l.category, status: l.status }
  })
}

/** Full snapshot of a user's world, shaped like the frontend `Data` object. */
export function buildState(userId: string) {
  const u = getUser(userId)!
  const w = walletRow(userId)
  const pets = (db.prepare('SELECT * FROM pets WHERE user_id=? ORDER BY created_at').all(userId) as PetRow[]).map(tickPet).map(petView)
  const eggs = (db.prepare('SELECT * FROM eggs WHERE user_id=? ORDER BY start_at').all(userId) as { id: string; hue: string; rarity: string; start_at: number; dur_ms: number; source: string }[]).map((e) => ({ id: e.id, hue: e.hue, rarity: e.rarity, start: e.start_at, dur: e.dur_ms, source: e.source }))
  const inv = db.prepare('SELECT item_id, qty FROM inventory WHERE user_id=? AND qty>0').all(userId) as { item_id: string; qty: number }[]
  const food: Record<string, number> = {}, owned: string[] = []
  for (const r of inv) { const it = ITEM.get(r.item_id); if (!it) continue; if (it.kind === 'food') food[r.item_id] = r.qty; else owned.push(r.item_id) }
  const friends = friendIds(userId)
  const requests = (db.prepare(`SELECT requester id FROM friendships WHERE addressee=? AND status='pending'`).all(userId) as { id: string }[]).map((r) => r.id)
  const sent = (db.prepare(`SELECT addressee id FROM friendships WHERE requester=? AND status='pending'`).all(userId) as { id: string }[]).map((r) => r.id)
  const liked = (db.prepare('SELECT post_id FROM post_likes WHERE user_id=?').all(userId) as { post_id: string }[]).map((r) => r.post_id)
  const stories = (db.prepare('SELECT * FROM stories WHERE user_id=? AND created_at>? ORDER BY created_at DESC').all(userId, now() - 86_400_000) as { id: string; scene: string; text: string; image: string | null; created_at: number }[]).map((s) => ({ id: s.id, by: 'me', scene: s.scene, text: s.text, image: s.image ?? undefined, time: s.created_at }))
  const txs = (db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 60').all(userId) as { id: string; label: string; points: number; thb: number | null; created_at: number }[]).map((t) => ({ id: t.id, t: t.label, v: t.points, thb: t.thb ?? undefined, time: t.created_at }))
  const orders = (db.prepare('SELECT o.*, l.name, l.emoji, l.seller_id FROM orders o JOIN listings l ON l.id=o.listing_id WHERE o.buyer_id=? ORDER BY o.created_at DESC').all(userId) as { id: string; listing_id: string; name: string; emoji: string; seller_id: string; method: string; pay: string; amount: number; created_at: number; status: string; meet: string }[]).map((o) => ({ id: o.id, itemId: o.listing_id, name: o.name, emoji: o.emoji, seller: getUser(o.seller_id)?.name ?? '—', method: o.method, pay: o.pay, amount: o.amount, time: o.created_at, status: o.status, meet: o.meet }))
  const listings = marketView(db.prepare(`SELECT * FROM listings WHERE seller_id=? AND status<>'removed' ORDER BY created_at DESC`).all(userId) as never, userId)
  const market = marketView(db.prepare(`SELECT * FROM listings WHERE seller_id<>? AND status='active' ORDER BY created_at DESC`).all(userId) as never, userId)
  const best = Object.fromEntries((db.prepare('SELECT game, MAX(score) s FROM game_scores WHERE user_id=? GROUP BY game').all(userId) as { game: string; s: number }[]).map((r) => [r.game, r.s]))
  const wins = (db.prepare(`SELECT COUNT(*) n FROM game_scores WHERE user_id=? AND game='g2' AND score>0`).get(userId) as { n: number }).n
  if (wins) best.g2 = wins
  const people = (db.prepare('SELECT * FROM users WHERE id<>?').all(userId) as UserRow[]).map((p) => personOf(p, p.is_bot ? { distance: p.bot_distance ?? 9999, angle: p.bot_bearing ?? 0 } : {}))
  const { chats: ch, unread } = chats(userId)
  const prefs = JSON.parse(u.prefs || '{}')
  return {
    user: publicUser(u),
    points: w.points, steps: w.steps, stepsDate: w.steps_date, redeemed: w.redeemed,
    pets, activePet: u.active_pet ?? pets[0]?.id ?? '', walking: !!u.walking,
    eggs, food, owned, outfit: outfitOf(userId),
    friends, requests, sent, privacy: u.privacy, relationship: u.status,
    posts: feedPosts(userId), liked, stories, chats: ch, unread,
    tx: txs, orders, listings, market, sold: [] as string[],
    daily: daily(userId), best, people, prefs, serverTime: now(),
  }
}
export type State = ReturnType<typeof buildState>
