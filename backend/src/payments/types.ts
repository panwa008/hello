/** Payment adapter contract. `sandbox` never moves money; `live` talks to the real provider. */
export interface ChargeInput {
  paymentId: string        // our reference (sent to the provider, echoed back in the webhook)
  userId: string
  amountThb: number
  phone?: string           // TrueMoney wallet mobile (0XXXXXXXXX)
  description: string
  notifyUrl?: string       // webhook URL (live: must be https)
  returnUrl?: string
}
export interface ChargeResult {
  /** `succeeded` only from the sandbox adapter. Live charges are always `pending` until a verified webhook arrives. */
  status: 'pending' | 'succeeded' | 'failed'
  providerRef?: string
  redirectUrl?: string     // web payment page / deeplink returned by the provider
  raw?: unknown
}
export interface WebhookEvent {
  eventId: string          // provider event id (dedupe key)
  reference: string        // our payment id
  providerRef?: string
  status: 'succeeded' | 'failed' | 'pending'
  amountThb?: number
}
export interface PaymentAdapter {
  readonly mode: 'sandbox' | 'live'
  readonly provider: 'truemoney'
  /** Env vars that are required but missing (empty = ready). */
  missingConfig(): string[]
  createCharge(input: ChargeInput): Promise<ChargeResult>
  /** Verify the signature header against the raw request body. */
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>): boolean
  parseWebhook(body: unknown): WebhookEvent
}

export class PaymentNotConfigured extends Error {
  constructor(public missing: string[], what = 'TrueMoney live') {
    super(`${what} ยังไม่ได้ตั้งค่า — ขาดตัวแปร: ${missing.join(', ')} / ${what} is not configured — missing env: ${missing.join(', ')}`)
  }
}
