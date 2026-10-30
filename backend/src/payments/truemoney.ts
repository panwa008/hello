import { randomBytes } from 'node:crypto'
import type { ChargeInput, ChargeResult, PaymentAdapter, WebhookEvent } from './types'
import { PaymentNotConfigured } from './types'
import { hmacHex, verifyHmac } from './signature'

const env = (k: string) => { const v = process.env[k]; return v && v.trim() ? v.trim() : undefined }
const sigHeader = () => (env('TRUEMONEY_SIGNATURE_HEADER') ?? 'x-truemoney-signature').toLowerCase()
const tsHeader = () => (env('TRUEMONEY_TIMESTAMP_HEADER') ?? 'x-truemoney-timestamp').toLowerCase()

/** Accepts both camelCase and snake_case payloads; maps common provider status words. */
export function normalizeWebhook(body: unknown): WebhookEvent {
  const b = (body ?? {}) as Record<string, unknown>
  const d = (typeof b.data === 'object' && b.data ? b.data : b) as Record<string, unknown>
  const s = String(d.status ?? b.status ?? '').toLowerCase()
  const status: WebhookEvent['status'] = ['success', 'succeeded', 'successful', 'paid', 'completed', 'approved'].includes(s) ? 'succeeded' : ['failed', 'fail', 'declined', 'cancelled', 'canceled', 'expired', 'rejected'].includes(s) ? 'failed' : 'pending'
  const amt = d.amount ?? d.amountThb ?? d.amount_thb
  return {
    eventId: String(b.eventId ?? b.event_id ?? b.id ?? d.eventId ?? ''),
    reference: String(d.reference ?? d.merchantRef ?? d.merchant_ref ?? d.order_id ?? d.paymentId ?? d.payment_id ?? ''),
    providerRef: d.transactionId ?? d.transaction_id ?? d.providerRef ? String(d.transactionId ?? d.transaction_id ?? d.providerRef) : undefined,
    status,
    amountThb: amt === undefined || amt === null || amt === '' ? undefined : Number(amt),
  }
}

/** Sandbox: no money moves. Charges succeed instantly; webhooks verify against TRUEMONEY_WEBHOOK_SECRET or a dev default. */
export const sandboxAdapter: PaymentAdapter = {
  mode: 'sandbox', provider: 'truemoney',
  missingConfig: () => [],
  async createCharge(i: ChargeInput): Promise<ChargeResult> {
    return { status: 'succeeded', providerRef: 'sbx_' + randomBytes(6).toString('hex'), raw: { sandbox: true, ref: i.paymentId } }
  },
  verifyWebhook(rawBody, h) {
    return verifyHmac({ secret: env('TRUEMONEY_WEBHOOK_SECRET') ?? SANDBOX_WEBHOOK_SECRET, rawBody, signature: h[sigHeader()], timestamp: h[tsHeader()] })
  },
  parseWebhook: normalizeWebhook,
}
export const SANDBOX_WEBHOOK_SECRET = 'sandbox-webhook-secret'

/** Required env for live TrueMoney. Values come from your TrueMoney / payment-gateway merchant contract — never commit them. */
export const LIVE_REQUIRED = ['TRUEMONEY_API_BASE', 'TRUEMONEY_MERCHANT_ID', 'TRUEMONEY_API_KEY', 'TRUEMONEY_API_SECRET', 'TRUEMONEY_WEBHOOK_SECRET', 'PUBLIC_API_URL'] as const

/**
 * Live adapter — real plumbing, provider-specific field names isolated here.
 * ⚠️ The request/response field mapping below is a generic shape. Before go-live, align it with the API spec
 * in your TrueMoney (or gateway: 2C2P / Omise / GB Prime Pay / KBank…) merchant documentation.
 */
export const liveAdapter: PaymentAdapter = {
  mode: 'live', provider: 'truemoney',
  missingConfig() {
    const m: string[] = LIVE_REQUIRED.filter((k) => !env(k))
    const base = env('TRUEMONEY_API_BASE'), pub = env('PUBLIC_API_URL')
    if (base && !/^https:\/\//.test(base)) m.push('TRUEMONEY_API_BASE (must be https://)')
    if (pub && !/^https:\/\//.test(pub)) m.push('PUBLIC_API_URL (must be https:// — webhooks require HTTPS)')
    return m
  },
  async createCharge(i: ChargeInput): Promise<ChargeResult> {
    const missing = this.missingConfig()
    if (missing.length) throw new PaymentNotConfigured(missing)
    const url = env('TRUEMONEY_API_BASE')!.replace(/\/+$/, '') + (env('TRUEMONEY_CHARGE_PATH') ?? '/v1/payments')
    const body = JSON.stringify({
      merchant_id: env('TRUEMONEY_MERCHANT_ID'), reference: i.paymentId, amount: i.amountThb.toFixed(2), currency: 'THB',
      description: i.description, payer_mobile: i.phone, notify_url: i.notifyUrl, return_url: i.returnUrl,
    })
    const ts = String(Math.floor(Date.now() / 1000))
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), Number(env('TRUEMONEY_TIMEOUT_MS') ?? 15_000))
    try {
      const r = await fetch(url, {
        method: 'POST', signal: ctl.signal, body,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('TRUEMONEY_API_KEY')}`, 'X-Timestamp': ts, 'X-Signature': hmacHex(env('TRUEMONEY_API_SECRET')!, `${ts}.${body}`), 'Idempotency-Key': i.paymentId },
      })
      const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
      if (!r.ok) return { status: 'failed', raw: { http: r.status, body: j } }
      const d = (typeof j.data === 'object' && j.data ? j.data : j) as Record<string, unknown>
      // Never trust the charge response as proof of payment: always `pending` until the signed webhook arrives.
      return { status: 'pending', providerRef: String(d.transaction_id ?? d.id ?? ''), redirectUrl: (d.payment_url ?? d.deeplink ?? d.redirect_url) as string | undefined, raw: j }
    } finally { clearTimeout(t) }
  },
  verifyWebhook(rawBody, h) {
    const secret = env('TRUEMONEY_WEBHOOK_SECRET')
    if (!secret) return false
    return verifyHmac({ secret, rawBody, signature: h[sigHeader()], timestamp: h[tsHeader()] })
  },
  parseWebhook: normalizeWebhook,
}
