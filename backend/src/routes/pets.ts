import { z } from 'zod'
import { db, now, bad, notFound, tx } from '../db'
import { body, done, router } from '../http'
import { FOOD_FX, ITEM, PET_SLOTS } from '../catalog'
import { getPet, savePet, petView, consume, createPet, debit, equipPet, tickPet, type PetRow } from '../services'

const r = router()
r.get('/pets', (c) => c.json({ ok: true, pets: (db.prepare('SELECT * FROM pets WHERE user_id=? ORDER BY created_at').all(c.get('userId')) as PetRow[]).map(tickPet).map(petView) }))
r.get('/pets/:id', (c) => c.json({ ok: true, pet: petView(getPet(c.get('userId'), c.req.param('id'))) }))

r.post('/pets/:id/feed', body(z.object({ food: z.string() })), (c) => {
  const uidv = c.get('userId'), food = c.req.valid('json').food
  const it = ITEM.get(food)
  if (!it || it.kind !== 'food') throw bad('ไม่ใช่อาหารสัตว์เลี้ยง')
  const res = tx(() => {
    const p = getPet(uidv, c.req.param('id'))
    if (p.hunger >= 100) throw bad(`น้อง ${p.name} อิ่มแล้ว~`, 'full')
    consume(uidv, food)
    const fx = FOOD_FX[food] ?? { hunger: 15, mood: 3 }
    return petView(savePet({ ...p, xp: p.xp + 5, hunger: p.hunger + fx.hunger, mood: p.mood + fx.mood }))
  })
  return done(c, { pet: res, xp: 5 })
})
r.post('/pets/:id/play', (c) => {
  const res = tx(() => {
    const p = getPet(c.get('userId'), c.req.param('id'))
    if (p.energy < 10) throw bad(`น้อง ${p.name} เหนื่อยแล้ว ให้พักก่อนนะ`, 'tired')
    if (p.hunger < 10) throw bad(`น้อง ${p.name} หิวจนเล่นไม่ไหว ให้อาหารก่อน`, 'hungry')
    return petView(savePet({ ...p, xp: p.xp + 8, mood: p.mood + 12, energy: p.energy - 10, hunger: p.hunger - 4 }))
  })
  return done(c, { pet: res, xp: 8 })
})
r.post('/pets/:id/rest', (c) => {
  const p = getPet(c.get('userId'), c.req.param('id'))
  return done(c, { pet: petView(savePet({ ...p, energy: p.energy + 30, mood: p.mood + 2 })) })
})
r.post('/pets/:id/pet', (c) => { // tap to cuddle
  const p = getPet(c.get('userId'), c.req.param('id'))
  return done(c, { pet: petView(savePet({ ...p, mood: p.mood + 1 })) })
})
r.patch('/pets/:id', body(z.object({ name: z.string().trim().min(1).max(16) })), (c) => {
  const p = getPet(c.get('userId'), c.req.param('id'))
  return done(c, { pet: petView(savePet({ ...p, name: c.req.valid('json').name })) })
})
r.delete('/pets/:id', (c) => {
  const id = c.get('userId')
  const n = (db.prepare('SELECT COUNT(*) n FROM pets WHERE user_id=?').get(id) as { n: number }).n
  if (n <= 1) throw bad('ต้องมีสัตว์เลี้ยงอย่างน้อย 1 ตัว')
  getPet(id, c.req.param('id'))
  db.prepare('DELETE FROM pets WHERE id=?').run(c.req.param('id'))
  db.prepare('UPDATE users SET active_pet=(SELECT id FROM pets WHERE user_id=? ORDER BY created_at LIMIT 1) WHERE id=? AND (active_pet=? OR active_pet IS NULL)').run(id, id, c.req.param('id'))
  return done(c)
})
r.post('/pets/:id/active', (c) => {
  const p = getPet(c.get('userId'), c.req.param('id'))
  db.prepare('UPDATE users SET active_pet=? WHERE id=?').run(p.id, c.get('userId'))
  return done(c, { activePet: p.id })
})
r.post('/pets/:id/equip', body(z.object({ itemId: z.string() })), (c) => {
  equipPet(c.get('userId'), c.req.param('id'), c.req.valid('json').itemId)
  return done(c, { pet: petView(getPet(c.get('userId'), c.req.param('id'))) })
})
r.post('/pets/:id/unequip', body(z.object({ slot: z.enum(PET_SLOTS as [string, ...string[]]).optional(), itemId: z.string().optional() })), (c) => {
  const p = getPet(c.get('userId'), c.req.param('id')), f = c.req.valid('json')
  if (f.slot) db.prepare('DELETE FROM pet_gear WHERE pet_id=? AND slot=?').run(p.id, f.slot)
  else if (f.itemId) db.prepare('DELETE FROM pet_gear WHERE pet_id=? AND item_id=?').run(p.id, f.itemId)
  else db.prepare('DELETE FROM pet_gear WHERE pet_id=?').run(p.id)
  return done(c, { pet: petView(p) })
})
r.post('/walking', body(z.object({ walking: z.boolean() })), (c) => {
  db.prepare('UPDATE users SET walking=? WHERE id=?').run(c.req.valid('json').walking ? 1 : 0, c.get('userId'))
  return done(c)
})

// ---- eggs ----
r.post('/eggs/:id/hatch', (c) => {
  const uidv = c.get('userId')
  const pet = tx(() => {
    const e = db.prepare('SELECT * FROM eggs WHERE id=? AND user_id=?').get(c.req.param('id'), uidv) as { id: string; rarity: string; start_at: number; dur_ms: number } | undefined
    if (!e) throw notFound('ไม่พบไข่')
    if (now() < e.start_at + e.dur_ms - 500) throw bad(`ยังฟักไม่ได้ อีก ${Math.ceil((e.start_at + e.dur_ms - now()) / 1000)} วินาที`, 'not_ready')
    db.prepare('DELETE FROM eggs WHERE id=?').run(e.id)
    return petView(createPet(uidv, e.rarity))
  })
  return done(c, { pet }, 201)
})
r.post('/eggs/:id/speed', (c) => {
  const uidv = c.get('userId')
  tx(() => {
    const e = db.prepare('SELECT * FROM eggs WHERE id=? AND user_id=?').get(c.req.param('id'), uidv) as { id: string; start_at: number; dur_ms: number } | undefined
    if (!e) throw notFound('ไม่พบไข่')
    if (now() >= e.start_at + e.dur_ms) throw bad('ไข่พร้อมฟักแล้ว')
    debit(uidv, 50, 'เร่งการฟักไข่')
    db.prepare('UPDATE eggs SET start_at=? WHERE id=?').run(now() - e.dur_ms, e.id)
  })
  return done(c)
})
export default r
