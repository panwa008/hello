import { db, now, uid, tx, ApiError } from '../db'
import { config } from '../config'
import { credit } from '../services'
import { TOPUP } from '../catalog'
import type { PaymentAdapter, WebhookEvent } from './types'
import { PaymentNotConfigured } from './types'
import { liveAdapter, sandboxAdapter } from './truemoney'
import { promptPayConfigured, promptPayPayload } from './promptpay'
import { emitToUser } from '../realtime'

export const adapter = (): PaymentAdapter => (config.payMode === 'live' ? liveAdapter : sandboxAdapter)

export type PaymentRow = {
  id: string; user_id: string; provider: string; method: string; mode: string; amount_thb: number; points: number; status: string
  provider_ref: string | null; redirect_url: string | null; qr_payload: string | null; phone_masked: string | null; error: string | null
  created_at: number; updated_at: number; credited_at: number | null
}
export const view = (p: PaymentRow) => ({
  id: p.id, method: p.method, mode: p.mode, status: p.status, thb: p.amount_thb, points: p.points,
  redirectUrl: p.redirect_url, qrPayload: p.qr_payload, phone: p.phone_masked, createdAt: p.created_at, creditedAt: p.credited_at,
})
export const getPayment = (id: string) => db.prepare('SELECT * FROM payments WHERE id=?').get(id) as PaymentRow | undefined

export function packageFor(thb: number) {
  const pack = TOPUP.find((p) => p.thb === thb)
  if (!pack) throw new ApiError(400, 'แพ็กเกจไม่ถูกต้อง', 'bad_package')
  return pack
}
const mask = (phone?: string) => (phone ? `${phone.slice(0, 3)}-xxx-${phone.slice(-4)}` : null)
export const notConfigured = (e: PaymentNotConfigured) => {
  const err = new ApiError(501, e.message, 'payment_not_configured') as ApiError & { missing?: string[] }
  err.missing = e.missing
  return err
}

/** Credit the wallet for a payment exactly once. Safe to call repeatedly (webhook retries, races). */
export function markSucceeded(paymentId: string, info: { providerRef?: string; amountThb?: number } = {}) {
  const res = tx(() => {
    const p = getPayment(paymentId)
    if (!p) throw new ApiError(404, 'payment not found', 'not_found')
    if (p.status === 'succeeded') return { credited: false, payment: p }
    // A verified success after we marked it expired/failed still means money arrived → credit it (once).
    if (info.amountThb !== undefined && Math.abs(info.amountThb - p.amount_thb) > 0.001) throw new ApiError(409, 'amount mismatch', 'amount_mismatch')
    const u = db.prepare("UPDATE payments SET status='succeeded', provider_ref=COALESCE(?,provider_ref), credited_at=?, updated_at=? WHERE id=? AND status!='succeeded'").run(info.providerRef ?? null, now(), now(), p.id)
    if (u.changes === 0) return { credited: false, payment: p }
    const label = p.method === 'promptpay' ? `เติมเงิน PromptPay ฿${p.amount_thb}` : `เติมเงิน TrueMoney ฿${p.amount_thb}${p.phone_masked ? ` (${p.phone_masked})` : ''}`
    credit(p.user_id, p.points, label + (p.mode === 'sandbox' ? ' · sandbox' : ''), 'topup', p.amount_thb, p.id) // unique index on ref ⇒ never double-credit
    return { credited: true, payment: getPayment(p.id)! }
  })
  if (res.credited) emitToUser(res.payment.user_id, 'payment:update', view(res.payment))
  return res
}
export function markFailed(paymentId: string, reason: string) {
  const r = db.prepare("UPDATE payments SET status='failed', error=?, updated_at=? WHERE id=? AND status='pending'").run(reason.slice(0, 300), now(), paymentId)
  const p = getPayment(paymentId)
  if (r.changes && p) emitToUser(p.user_id, 'payment:update', view(p))
  return p
}

/** Create a TrueMoney charge. Sandbox credits immediately; live stays pending until the signed webhook. */
export async function createTrueMoneyCharge(userId: string, thb: number, phone: string, opts: { sandboxAsync?: boolean } = {}) {
  const a = adapter()
  const missing = a.missingConfig()
  if (missing.length) throw notConfigured(new PaymentNotConfigured(missing))
  const pack = packageFor(thb)
  const id = uid('pay')
  db.prepare('INSERT INTO payments (id,user_id,provider,method,mode,amount_thb,points,status,phone_masked,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, userId, 'truemoney', 'truemoney', a.mode, pack.thb, pack.points, 'pending', mask(phone), now(), now())
  const pub = process.env.PUBLIC_API_URL?.replace(/\/+$/, '')
  let r
  try {
    r = await a.createCharge({ paymentId: id, userId, amountThb: pack.thb, phone, description: `Hello points ${pack.points}`, notifyUrl: pub ? `${pub}/api/payments/truemoney/webhook` : undefined, returnUrl: process.env.PAYMENT_RETURN_URL })
  } catch (e) {
    markFailed(id, e instanceof Error ? e.message : 'charge error')
    if (e instanceof PaymentNotConfigured) throw notConfigured(e)
    throw new ApiError(502, 'ติดต่อ TrueMoney ไม่สำเร็จ ลองใหม่อีกครั้ง / payment provider unreachable', 'provider_error')
  }
  db.prepare('UPDATE payments SET provider_ref=?, redirect_url=?, updated_at=? WHERE id=?').run(r.providerRef ?? null, r.redirectUrl ?? null, now(), id)
  if (r.status === 'failed') { markFailed(id, 'provider rejected charge'); throw new ApiError(402, 'TrueMoney ปฏิเสธรายการ / charge rejected', 'charge_failed') }
  if (r.status === 'succeeded' && a.mode === 'sandbox' && !opts.sandboxAsync) markSucceeded(id, { providerRef: r.providerRef }) // only the sandbox may short-circuit
  return getPayment(id)!
}

/** PromptPay QR (stays pending until a verified bank notification or, in sandbox, the sandbox-complete call). */
export function createPromptPay(userId: string, thb: number) {
  if (!promptPayConfigured()) throw notConfigured(new PaymentNotConfigured(['PROMPTPAY_ID or PROMPTPAY_BILLER_ID'], 'PromptPay'))
  const pack = packageFor(thb)
  const id = uid('pay')
  const qr = promptPayPayload({ amountThb: pack.thb, promptpayId: process.env.PROMPTPAY_ID?.trim(), billerId: process.env.PROMPTPAY_BILLER_ID?.trim(), ref1: id.replace(/^pay_/, '').slice(0, 20), ref2: 'HELLO' })
  db.prepare('INSERT INTO payments (id,user_id,provider,method,mode,amount_thb,points,status,qr_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, userId, 'promptpay', 'promptpay', config.payMode === 'live' ? 'live' : 'sandbox', pack.thb, pack.points, 'pending', qr, now(), now())
  return getPayment(id)!
}

/** Record + apply a verified webhook event (idempotent by event id and by payment status). */
export function applyWebhook(provider: string, ev: WebhookEvent, rawBody: string) {
  if (!ev.eventId || !ev.reference) throw new ApiError(400, 'missing event id / reference', 'bad_event')
  // One transaction: if crediting fails (e.g. amount mismatch) the event row rolls back, so a provider retry is re-evaluated.
  return tx(() => applyWebhookTx(provider, ev, rawBody))
}
function applyWebhookTx(provider: string, ev: WebhookEvent, rawBody: string) {
  const ins = db.prepare('INSERT OR IGNORE INTO payment_events (id,payment_id,provider,status,verified,body,received_at) VALUES (?,?,?,?,1,?,?)').run(`${provider}:${ev.eventId}`, ev.reference, provider, ev.status, rawBody.slice(0, 8000), now())
  if (ins.changes === 0) return { duplicate: true }
  const p = getPayment(ev.reference)
  if (!p || p.provider !== provider) return { ignored: 'unknown_reference' }
  if (ev.status === 'succeeded') return { ...markSucceeded(p.id, { providerRef: ev.providerRef, amountThb: ev.amountThb }), payment: undefined }
  if (ev.status === 'failed') { markFailed(p.id, 'provider reported failure'); return { failed: true } }
  return { pending: true }
}

/** Expire stale pending payments (30 min). */
setInterval(() => {
  db.prepare("UPDATE payments SET status='expired', updated_at=? WHERE status='pending' AND created_at < ?").run(now(), now() - 30 * 60_000)
}, 5 * 60_000).unref()
