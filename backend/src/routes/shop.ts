import { z } from 'zod'
import { db, bad, notFound, tx } from '../db'
import { body, done, router } from '../http'
import { CATALOG, ITEM, LOOT, EGG_HUE, EGG_DUR, AVATAR_SLOTS, OPTIONAL_SLOTS, priceOf, SALE } from '../catalog'
import { debit, credit, grant, qtyOf, addEgg, createPet, petView, outfitOf } from '../services'

const r = router()
// DIGITAL SHOPS (realm: digital) — Pet Shop + Avatar Shop, Hello Points only. Never real goods.
r.get('/shop/catalog', (c) => c.json({ ok: true, items: CATALOG.map((i) => ({ ...i, salePrice: SALE.has(i.id) ? priceOf(i) : undefined })), loot: LOOT.map(({ w, ...l }) => ({ ...l, chance: w })) }))

/** Pet shop: eggs, food, pet cosmetics. */
r.post('/shop/buy', body(z.object({ itemId: z.string(), qty: z.number().int().min(1).max(20).default(1) })), (c) => {
  const id = c.get('userId'), f = c.req.valid('json')
  const it = ITEM.get(f.itemId)
  if (!it || it.kind === 'wardrobe') throw notFound('ไม่พบสินค้าในร้านสัตว์เลี้ยง')
  const n = it.kind === 'pet_cosmetic' ? 1 : f.qty
  const res = tx(() => {
    if (it.kind === 'pet_cosmetic' && qtyOf(id, it.id) > 0) throw bad('มีไอเท็มนี้แล้ว', 'already_owned')
    debit(id, priceOf(it) * n, `ซื้อ ${it.name}${n > 1 ? ` x${n}` : ''}`)
    if (it.kind === 'egg') { const ids = Array.from({ length: n }, () => addEgg(id, it.rarity ?? 'Common', EGG_HUE[it.id] ?? '#F5A9C5', `ซื้อจากร้าน (${it.name})`, EGG_DUR[it.rarity ?? 'Common'])); return { eggs: ids } }
    grant(id, it.id, n)
    return { itemId: it.id, qty: n }
  })
  return done(c, { ...res, cost: priceOf(it) * n })
})

/** Legendary box: 300 P, weighted roll server-side. */
r.post('/shop/lootbox', (c) => {
  const id = c.get('userId')
  const res = tx(() => {
    debit(id, 300, 'เปิดกล่อง Legendary')
    const total = LOOT.reduce((a, b) => a + b.w, 0)
    let x = Math.random() * total
    const l = LOOT.find((o) => (x -= o.w) < 0) ?? LOOT[LOOT.length - 1]
    let note: string | undefined, pet
    if (l.key === 'pts') credit(id, 200, 'Legendary Box: Points', 'loot')
    else if (l.key === 'nova') pet = petView(createPet(id, 'Legendary', { palette: 'nova', kind: 'มังกรดวงดาว', name: 'Nova' }))
    else if (l.key === 'f6' || l.key === 'f5') grant(id, l.key, l.key === 'f6' ? 3 : 2)
    else if (qtyOf(id, l.key) > 0) { credit(id, 150, `Legendary Box: ${l.name} ซ้ำ`, 'loot'); note = 'มีอยู่แล้ว แปลงเป็น 150 P' }
    else grant(id, l.key)
    const { w: _w, ...loot } = l
    return { loot, pet, note }
  })
  return done(c, res)
})

// ---- avatar ----
r.get('/avatar', (c) => {
  const id = c.get('userId')
  const owned = (db.prepare('SELECT item_id FROM inventory WHERE user_id=?').all(id) as { item_id: string }[]).map((r) => r.item_id).filter((i) => ITEM.get(i)?.kind === 'wardrobe')
  return c.json({ ok: true, outfit: outfitOf(id), owned, slots: AVATAR_SLOTS })
})
r.post('/avatar/buy', body(z.object({ itemId: z.string(), equip: z.boolean().default(false) })), (c) => {
  const id = c.get('userId'), f = c.req.valid('json')
  const it = ITEM.get(f.itemId)
  if (!it || it.kind !== 'wardrobe' || !it.slot) throw notFound('ไม่พบสินค้าในร้านแต่งตัว')
  tx(() => {
    if (qtyOf(id, it.id) > 0) throw bad('มีชุดนี้แล้ว', 'already_owned')
    debit(id, priceOf(it), `ซื้อ ${it.name}`)
    grant(id, it.id)
    if (f.equip) db.prepare(`UPDATE outfits SET ${it.slot}=? WHERE user_id=?`).run(it.id, id)
  })
  return done(c, { itemId: it.id, cost: priceOf(it), equipped: f.equip })
})
const slotVal = z.string().max(8)
r.put('/avatar/outfit', body(z.object(Object.fromEntries(AVATAR_SLOTS.map((s) => [s, slotVal.optional()])) as Record<(typeof AVATAR_SLOTS)[number], z.ZodOptional<typeof slotVal>>)), (c) => {
  const id = c.get('userId'), f = c.req.valid('json') as Record<string, string | undefined>
  const next = { ...outfitOf(id) } as Record<string, string>
  for (const s of AVATAR_SLOTS) {
    const v = f[s]; if (v === undefined) continue
    if (v === 'none') { if (!OPTIONAL_SLOTS.includes(s)) throw bad(`ช่อง ${s} ต้องมีไอเท็ม`); next[s] = 'none'; continue }
    const it = ITEM.get(v)
    if (!it || it.slot !== s) throw bad(`ไอเท็ม ${v} ใส่ช่อง ${s} ไม่ได้`, 'wrong_slot')
    if (qtyOf(id, v) <= 0) throw bad(`ยังไม่มี ${it.name}`, 'not_owned')
    next[s] = v
  }
  db.prepare('INSERT OR REPLACE INTO outfits (user_id,hair,top,bottom,shoes,acc,aura,backpack) VALUES (?,?,?,?,?,?,?,?)').run(id, next.hair, next.top, next.bottom, next.shoes, next.acc, next.aura, next.backpack)
  return done(c, { outfit: next })
})
export default r
