import { Hono } from 'hono'
import { z } from 'zod'
import { db, ApiError } from '../db'
import { body, done, router } from '../http'
import { config } from '../config'
import { adapter, applyWebhook, createPromptPay, createTrueMoneyCharge, getPayment, markSucceeded, view, type PaymentRow } from '../payments/service'
import { normalizeWebhook, SANDBOX_WEBHOOK_SECRET, LIVE_REQUIRED } from '../payments/truemoney'
import { promptPayConfigured } from '../payments/promptpay'
import { verifyHmac } from '../payments/signature'

/* ---------- authenticated: /api/payments/* ---------- */
const r = router()
const phone = z.string().regex(/^0[689]\d{8}$/, 'เบอร์ TrueMoney ไม่ถูกต้อง')

r.get('/payments/config', (c) => c.json({ ok: true, result: {
  mode: config.payMode, truemoney: { ready: adapter().missingConfig().length === 0, missing: adapter().missingConfig() },
  promptpay: { ready: promptPayConfigured() },
} }))
// sandboxAsync=true (sandbox only): keep the charge pending so the webhook flow can be exercised end-to-end.
r.post('/payments/truemoney/charge', body(z.object({ thb: z.number().int(), phone, sandboxAsync: z.boolean().optional() })), async (c) => {
  const f = c.req.valid('json')
  const p = await createTrueMoneyCharge(c.get('userId'), f.thb, f.phone, { sandboxAsync: f.sandboxAsync && config.payMode === 'sandbox' })
  return done(c, view(p), p.status === 'pending' ? 202 : 200)
})
r.post('/payments/promptpay/qr', body(z.object({ thb: z.number().int() })), (c) => done(c, view(createPromptPay(c.get('userId'), c.req.valid('json').thb)), 201))
r.get('/payments', (c) => {
  const rows = db.prepare('SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(c.get('userId')) as PaymentRow[]
  return c.json({ ok: true, result: rows.map(view) })
})
r.get('/payments/:id', (c) => {
  const p = getPayment(c.req.param('id'))
  if (!p || p.user_id !== c.get('userId')) throw new ApiError(404, 'ไม่พบรายการชำระเงิน', 'not_found')
  return c.json({ ok: true, result: view(p) })
})
/** Sandbox only: simulate the provider confirming a pending payment (e.g. PromptPay QR scanned). */
r.post('/payments/:id/sandbox-complete', (c) => {
  const p = getPayment(c.req.param('id'))
  if (!p || p.user_id !== c.get('userId')) throw new ApiError(404, 'ไม่พบรายการชำระเงิน', 'not_found')
  if (config.payMode !== 'sandbox' || p.mode !== 'sandbox') throw new ApiError(403, 'ใช้ได้เฉพาะโหมด sandbox / sandbox only', 'forbidden')
  const res = markSucceeded(p.id)
  return done(c, { credited: res.credited, payment: view(res.payment) })
})
export default r

/* ---------- public webhooks: /api/payments/<provider>/webhook (no JWT — HMAC signature instead) ---------- */
export const webhooks = new Hono()
const lowerHeaders = (h: Headers) => { const o: Record<string, string> = {}; h.forEach((v, k) => { o[k.toLowerCase()] = v }); return o }

webhooks.post('/truemoney/webhook', async (c) => {
  const a = adapter()
  if (a.mode === 'live' && !process.env.TRUEMONEY_WEBHOOK_SECRET?.trim()) throw new ApiError(501, `TrueMoney webhook ยังไม่ได้ตั้งค่า — ขาดตัวแปร: TRUEMONEY_WEBHOOK_SECRET / webhook not configured (live needs: ${LIVE_REQUIRED.join(', ')})`, 'payment_not_configured')
  const raw = await c.req.text()
  if (!a.verifyWebhook(raw, lowerHeaders(c.req.raw.headers))) {
    console.warn('[hello] rejected TrueMoney webhook: bad signature')
    throw new ApiError(401, 'invalid signature', 'bad_signature')
  }
  let json: unknown
  try { json = JSON.parse(raw) } catch { throw new ApiError(400, 'invalid JSON', 'bad_json') }
  const res = applyWebhook('truemoney', a.parseWebhook(json), raw)
  return c.json({ ok: true, ...res })
})

webhooks.post('/promptpay/webhook', async (c) => {
  const secret = process.env.PROMPTPAY_WEBHOOK_SECRET?.trim() || (config.payMode === 'sandbox' ? SANDBOX_WEBHOOK_SECRET : '')
  if (!secret) throw new ApiError(501, 'PromptPay webhook ยังไม่ได้ตั้งค่า — ขาดตัวแปร: PROMPTPAY_WEBHOOK_SECRET / not configured', 'payment_not_configured')
  const raw = await c.req.text(), h = lowerHeaders(c.req.raw.headers)
  const sig = h[(process.env.PROMPTPAY_SIGNATURE_HEADER ?? 'x-promptpay-signature').toLowerCase()]
  const ts = h[(process.env.PROMPTPAY_TIMESTAMP_HEADER ?? 'x-promptpay-timestamp').toLowerCase()]
  if (!verifyHmac({ secret, rawBody: raw, signature: sig, timestamp: ts })) throw new ApiError(401, 'invalid signature', 'bad_signature')
  let json: unknown
  try { json = JSON.parse(raw) } catch { throw new ApiError(400, 'invalid JSON', 'bad_json') }
  const ev = normalizeWebhook(json)
  // Bank notifications echo Ref1 (our id without the "pay_" prefix, upper-cased)
  if (ev.reference && !ev.reference.startsWith('pay_')) ev.reference = 'pay_' + ev.reference.toLowerCase()
  return c.json({ ok: true, ...applyWebhook('promptpay', ev, raw) })
})
