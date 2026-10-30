import { z } from 'zod'
import { db, now, uid, bad, notFound, ApiError, tx } from '../db'
import { body, done, router } from '../http'
import { marketView, getUser } from '../state'
import { debit, credit, logThb } from '../services'
import { config } from '../config'

const r = router()
const TINTS = [['#FFE9D6', '#FFF6EE'], ['#DDF0FC', '#F2FAFF'], ['#EEE3FA', '#F8F3FF'], ['#DDF7E9', '#F2FFF8'], ['#FDE4EF', '#FFF5F9']]

const PAYS: Record<string, string> = { truemoney: 'TrueMoney Wallet', promptpay: 'PromptPay', card: 'บัตรเครดิต', cod: 'จ่ายเงินตอนนัดรับ' }

r.get('/market', (c) => {
  const q = `%${(c.req.query('q') ?? '').toLowerCase()}%`, cat = c.req.query('category')
  const rows = db.prepare(`SELECT * FROM listings WHERE status='active' AND lower(name) LIKE ? ${cat ? 'AND category=?' : ''} ORDER BY created_at DESC LIMIT 100`).all(...(cat ? [q, cat] : [q])) as never
  return c.json({ ok: true, items: marketView(rows, c.get('userId')) })
})
r.post('/market/listings', body(z.object({ name: z.string().trim().min(1).max(80), thb: z.number().positive().max(1_000_000), category: z.string().max(40).default('อื่น ๆ'), condition: z.string().max(40).default('มือสอง'), emoji: z.string().max(8).default('📦'), points: z.number().int().positive().optional() })), (c) => {
  const f = c.req.valid('json'), id = uid('ls')
  db.prepare('INSERT INTO listings (id,seller_id,name,thb,points,emoji,tint,condition,category,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id, c.get('userId'), f.name, f.thb, f.points ?? Math.round(f.thb * 100), f.emoji, JSON.stringify(TINTS[Math.floor(Math.random() * TINTS.length)]), f.condition, f.category, 'active', now())
  return done(c, { id }, 201)
})
r.delete('/market/listings/:id', (c) => {
  const l = db.prepare('SELECT seller_id FROM listings WHERE id=?').get(c.req.param('id')) as { seller_id: string } | undefined
  if (!l) throw notFound('ไม่พบประกาศ')
  if (l.seller_id !== c.get('userId')) throw new ApiError(403, 'ลบได้เฉพาะประกาศของตัวเอง', 'forbidden')
  db.prepare("UPDATE listings SET status='removed' WHERE id=?").run(c.req.param('id'))
  return done(c)
})
r.post('/market/orders', body(z.object({ listingId: z.string(), method: z.enum(['points', 'thb']), pay: z.enum(['truemoney', 'promptpay', 'card', 'cod']).default('cod'), meet: z.string().trim().min(1).max(120).default('BTS ใกล้ที่สุด') })), (c) => {
  {
    const f0 = c.req.valid('json')
    // Online THB payments between users = holding money for third parties (escrow/marketplace payout) → needs a
    // licensed payment facilitator + seller KYC. Not implemented: refuse in live mode instead of pretending.
    if (f0.method === 'thb' && f0.pay !== 'cod' && config.payMode === 'live') throw new ApiError(501, 'การจ่ายเงินออนไลน์ระหว่างผู้ใช้ยังไม่เปิดในโหมดจริง ใช้ "จ่ายตอนนัดรับ" หรือพอยท์ / online P2P payment is not available in live mode (needs a licensed escrow/marketplace payout provider)', 'payment_not_configured')
  }
  const me = c.get('userId'), f = c.req.valid('json')
  const res = tx(() => {
    const l = db.prepare("SELECT * FROM listings WHERE id=?").get(f.listingId) as { id: string; seller_id: string; name: string; thb: number; points: number | null; status: string; emoji: string } | undefined
    if (!l) throw notFound('ไม่พบสินค้า')
    if (l.status !== 'active') throw bad('สินค้านี้ขายไปแล้ว', 'sold')
    if (l.seller_id === me) throw bad('ซื้อของตัวเองไม่ได้')
    let amount: number, payLabel: string
    if (f.method === 'points') {
      if (!l.points) throw bad('สินค้านี้ไม่รับ Hello Points')
      debit(me, l.points, `ตลาด: ${l.name}`, 'market'); amount = l.points; payLabel = 'Hello Points'
      const seller = getUser(l.seller_id)
      if (seller && !seller.is_bot) credit(l.seller_id, l.points, `ขายในตลาด: ${l.name}`, 'market')
    } else {
      amount = l.thb; payLabel = PAYS[f.pay] + (f.pay === 'cod' ? '' : ' (sandbox)')
      if (f.pay !== 'cod') logThb(me, `ตลาด: ${l.name} (${payLabel})`, -l.thb, 'market_thb')
    }
    db.prepare("UPDATE listings SET status='sold' WHERE id=?").run(l.id)
    const oid = uid('od')
    db.prepare('INSERT INTO orders (id,buyer_id,listing_id,method,pay,amount,meet,status,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(oid, me, l.id, f.method, payLabel, amount, f.meet, 'pending', now())
    db.prepare('INSERT INTO messages (id,from_id,to_id,text,kind,created_at) VALUES (?,?,?,?,?,?)').run(uid('m'), me, l.seller_id, `สั่งซื้อ "${l.name}" แล้วนะคะ นัดรับที่ ${f.meet} 🙏`, 'market', now())
    if (getUser(l.seller_id)?.is_bot) db.prepare('INSERT INTO messages (id,from_id,to_id,text,kind,created_at) VALUES (?,?,?,?,?,?)').run(uid('m'), l.seller_id, me, `ได้เลย เจอกันที่ ${f.meet} นะ 😊`, 'text', now() + 2500)
    return { orderId: oid, amount, pay: payLabel, sandbox: f.method === 'thb' && f.pay !== 'cod' }
  })
  return done(c, res, 201)
})
r.post('/market/orders/:id/confirm', (c) => {
  const ch = db.prepare("UPDATE orders SET status='done' WHERE id=? AND buyer_id=? AND status='pending'").run(c.req.param('id'), c.get('userId'))
  if (!ch.changes) throw notFound('ไม่พบคำสั่งซื้อที่รอรับ')
  return done(c)
})
export default r
