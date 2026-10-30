import { db, now, today, uid, bad, notFound, tx } from './db'
import { ITEM, PET_SLOTS, EGG_DUR, HATCH_POOL, MISSIONS, AVATAR_SLOTS } from './catalog'

// ---------- wallet ----------
export function points(userId: string): number {
  return (db.prepare('SELECT points FROM wallets WHERE user_id=?').get(userId) as { points: number } | undefined)?.points ?? 0
}
export function credit(userId: string, n: number, label: string, kind = 'earn', thb?: number, ref?: string) {
  if (!Number.isInteger(n) || n < 0) throw bad('จำนวนพอยท์ไม่ถูกต้อง')
  db.prepare('UPDATE wallets SET points = points + ? WHERE user_id=?').run(n, userId)
  db.prepare('INSERT INTO transactions (id,user_id,label,points,thb,kind,ref,created_at) VALUES (?,?,?,?,?,?,?,?)').run(uid('tx'), userId, label, n, thb ?? null, kind, ref ?? null, now())
}
export function debit(userId: string, n: number, label: string, kind = 'spend') {
  if (!Number.isInteger(n) || n <= 0) throw bad('จำนวนพอยท์ไม่ถูกต้อง')
  const r = db.prepare('UPDATE wallets SET points = points - ? WHERE user_id=? AND points >= ?').run(n, userId, n)
  if (r.changes === 0) throw bad('พอยท์ไม่พอ ลองเติมเงินหรือแลกก้าวเดินนะ', 'insufficient_points')
  db.prepare('INSERT INTO transactions (id,user_id,label,points,kind,created_at) VALUES (?,?,?,?,?,?)').run(uid('tx'), userId, label, -n, kind, now())
}
export function logThb(userId: string, label: string, thb: number, kind = 'thb') {
  db.prepare('INSERT INTO transactions (id,user_id,label,points,thb,kind,created_at) VALUES (?,?,?,?,?,?,?)').run(uid('tx'), userId, label, 0, thb, kind, now())
}

// ---------- inventory ----------
export const qtyOf = (userId: string, itemId: string) => (db.prepare('SELECT qty FROM inventory WHERE user_id=? AND item_id=?').get(userId, itemId) as { qty: number } | undefined)?.qty ?? 0
export function grant(userId: string, itemId: string, n = 1) {
  const it = ITEM.get(itemId); if (!it) throw notFound('ไม่พบไอเท็ม')
  if (it.kind === 'food') db.prepare('INSERT INTO inventory (user_id,item_id,qty) VALUES (?,?,?) ON CONFLICT(user_id,item_id) DO UPDATE SET qty = qty + excluded.qty').run(userId, itemId, n)
  else db.prepare('INSERT OR IGNORE INTO inventory (user_id,item_id,qty) VALUES (?,?,1)').run(userId, itemId)
}
export function consume(userId: string, itemId: string) {
  const r = db.prepare('UPDATE inventory SET qty = qty - 1 WHERE user_id=? AND item_id=? AND qty > 0').run(userId, itemId)
  if (r.changes === 0) throw bad('อาหารหมด ไปซื้อที่ร้านสัตว์เลี้ยงนะ', 'out_of_stock')
}

// ---------- daily counters ----------
export function bump(userId: string, key: string, n = 1) {
  db.prepare('INSERT INTO daily_counters (user_id,date,key,n) VALUES (?,?,?,?) ON CONFLICT(user_id,date,key) DO UPDATE SET n = n + excluded.n').run(userId, today(), key, n)
}
export function daily(userId: string) {
  const d = today()
  const rows = db.prepare('SELECT key,n FROM daily_counters WHERE user_id=? AND date=?').all(userId, d) as { key: string; n: number }[]
  const c = Object.fromEntries(rows.map((r) => [r.key, r.n])) as Record<string, number>
  const claimed = (db.prepare('SELECT mission FROM mission_claims WHERE user_id=? AND date=?').all(userId, d) as { mission: string }[]).map((r) => r.mission)
  return { date: d, feedOthers: c.feedOthers ?? 0, battleWins: c.battleWins ?? 0, puzzlePlays: c.puzzlePlays ?? 0, runnerPlays: c.runnerPlays ?? 0, advPlays: c.advPlays ?? 0, claimed }
}
export function claimMission(userId: string, missionId: string) {
  const m = MISSIONS.find((x) => x.id === missionId); if (!m) throw notFound('ไม่พบภารกิจ')
  return tx(() => {
    const d = daily(userId)
    const v = m.key === 'steps' ? walletRow(userId).steps : (d as unknown as Record<string, number>)[m.key]
    if (v < m.n) throw bad('ภารกิจยังไม่สำเร็จ', 'mission_incomplete')
    const r = db.prepare('INSERT OR IGNORE INTO mission_claims (user_id,date,mission) VALUES (?,?,?)').run(userId, d.date, m.id)
    if (r.changes === 0) throw bad('รับรางวัลไปแล้ว', 'already_claimed')
    credit(userId, m.r, `ภารกิจ: ${m.t}`, 'mission')
    return { reward: m.r }
  })
}

// ---------- steps ----------
export interface WalletRow { points: number; steps: number; steps_date: string | null; steps_synced_at: number | null; redeemed: number }
export function walletRow(userId: string): WalletRow {
  const w = db.prepare('SELECT * FROM wallets WHERE user_id=?').get(userId) as WalletRow
  if (w.steps_date !== today()) {
    db.prepare('UPDATE wallets SET steps=0, redeemed=0, steps_date=?, steps_synced_at=? WHERE user_id=?').run(today(), now(), userId)
    return { ...w, steps: 0, redeemed: 0, steps_date: today() }
  }
  return w
}

// ---------- pets ----------
export interface PetRow { id: string; user_id: string; name: string; kind: string; palette: string; rarity: string; level: number; xp: number; hunger: number; mood: number; energy: number; last_tick: number }
const MIN = 60_000
/** Lazily apply time-based decay (hunger/mood drop, energy regenerates). */
export function tickPet(p: PetRow): PetRow {
  const mins = Math.floor((now() - p.last_tick) / MIN)
  if (mins < 1) return p
  const k = Math.min(mins, 600)
  const n = { ...p, hunger: Math.max(0, p.hunger - k * 0.5), mood: Math.max(0, p.mood - k * 0.25), energy: Math.min(100, p.energy + k * 0.4), last_tick: p.last_tick + mins * MIN }
  db.prepare('UPDATE pets SET hunger=?, mood=?, energy=?, last_tick=? WHERE id=?').run(n.hunger, n.mood, n.energy, n.last_tick, p.id)
  return n
}
export function getPet(userId: string, petId: string) {
  const p = db.prepare('SELECT * FROM pets WHERE id=? AND user_id=?').get(petId, userId) as PetRow | undefined
  if (!p) throw notFound('ไม่พบสัตว์เลี้ยง')
  return tickPet(p)
}
export function savePet(p: PetRow) {
  let xp = p.xp, level = p.level
  while (xp >= 100) { xp -= 100; level++ }
  const c = (v: number) => Math.max(0, Math.min(100, v))
  db.prepare('UPDATE pets SET name=?, level=?, xp=?, hunger=?, mood=?, energy=? WHERE id=?').run(p.name, level, xp, c(p.hunger), c(p.mood), c(p.energy), p.id)
  return { ...p, xp, level, hunger: c(p.hunger), mood: c(p.mood), energy: c(p.energy) }
}
export function gearOf(petId: string) {
  const rows = db.prepare('SELECT slot,item_id FROM pet_gear WHERE pet_id=?').all(petId) as { slot: string; item_id: string }[]
  return Object.fromEntries(rows.map((r) => [r.slot, r.item_id])) as Record<string, string>
}
export function petView(p: PetRow) {
  const gear = gearOf(p.id)
  return { id: p.id, name: p.name, kind: p.kind, palette: p.palette, rarity: p.rarity, level: p.level, xp: p.xp, hunger: Math.round(p.hunger * 10) / 10, mood: Math.round(p.mood * 10) / 10, energy: Math.round(p.energy * 10) / 10, gear, acc: gear.head ?? Object.values(gear)[0] }
}
export function createPet(userId: string, rarity: string, opts: { palette?: string; kind?: string; name?: string } = {}) {
  const pool = HATCH_POOL[rarity] ?? HATCH_POOL.Common
  const pick = opts.palette ? { kind: opts.kind ?? 'มังกร', palette: opts.palette, names: [opts.name ?? 'Nova'] } : pool[Math.floor(Math.random() * pool.length)]
  const used = new Set((db.prepare('SELECT name FROM pets WHERE user_id=?').all(userId) as { name: string }[]).map((r) => r.name))
  const count = used.size
  const name = pick.names.find((n) => !used.has(n)) ?? `${pick.names[0]} ${count + 1}`
  const id = uid('pt')
  db.prepare('INSERT INTO pets (id,user_id,name,kind,palette,rarity,level,xp,hunger,mood,energy,last_tick,created_at) VALUES (?,?,?,?,?,?,1,0,70,90,100,?,?)').run(id, userId, name, pick.kind, pick.palette, rarity, now(), now())
  return getPet(userId, id)
}
export function addEgg(userId: string, rarity: string, hue: string, source: string, dur?: number) {
  const id = uid('eg')
  db.prepare('INSERT INTO eggs (id,user_id,hue,rarity,start_at,dur_ms,source) VALUES (?,?,?,?,?,?,?)').run(id, userId, hue, rarity, now(), dur ?? EGG_DUR[rarity] ?? 20_000, source)
  return id
}
export function equipPet(userId: string, petId: string, itemId: string) {
  const it = ITEM.get(itemId)
  if (!it || it.kind !== 'pet_cosmetic' || !it.slot || !PET_SLOTS.includes(it.slot as never)) throw bad('ไอเท็มนี้ใส่ให้สัตว์เลี้ยงไม่ได้')
  if (qtyOf(userId, itemId) <= 0) throw bad('ยังไม่มีไอเท็มนี้ในกระเป๋า', 'not_owned')
  getPet(userId, petId)
  tx(() => {
    // one physical item can be worn by only one pet: remove from others
    db.prepare('DELETE FROM pet_gear WHERE item_id=? AND pet_id IN (SELECT id FROM pets WHERE user_id=?)').run(itemId, userId)
    db.prepare('INSERT INTO pet_gear (pet_id,slot,item_id) VALUES (?,?,?) ON CONFLICT(pet_id,slot) DO UPDATE SET item_id=excluded.item_id').run(petId, it.slot, itemId)
  })
}

// ---------- outfit ----------
export type Outfit = Record<(typeof AVATAR_SLOTS)[number], string>
export function outfitOf(userId: string): Outfit {
  const o = db.prepare('SELECT hair,top,bottom,shoes,acc,aura,backpack FROM outfits WHERE user_id=?').get(userId) as Outfit | undefined
  return o ?? { hair: 'h1', top: 'a1', bottom: 'b1', shoes: 's1', acc: 'none', aura: 'none', backpack: 'none' }
}
