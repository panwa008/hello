/**
 * PromptPay EMVCo QR payload (Thai QR Payment standard).
 *   PROMPTPAY_ID        → tag 29 "credit transfer" to a mobile (10 digits), national/tax ID (13) or e-wallet ID (15).
 *                         No reference field → payment must be matched manually or via your bank's API.
 *   PROMPTPAY_BILLER_ID → tag 30 "bill payment" (merchant/biller ID from your bank) with Ref1 = our payment reference,
 *                         which your bank's payment-notification webhook echoes back → automatic reconciliation.
 */
const f = (id: string, v: string) => id + String(v.length).padStart(2, '0') + v

export function crc16(s: string) {
  let crc = 0xffff
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function promptPayTarget(id: string): string {
  const d = id.replace(/\D/g, '')
  if (d.length === 10 && d.startsWith('0')) return f('01', '0066' + d.slice(1))
  if (d.length === 13) return f('02', d)
  if (d.length === 15) return f('03', d)
  throw new Error('PROMPTPAY_ID must be a 10-digit mobile, 13-digit national/tax ID or 15-digit e-wallet ID')
}

export function promptPayPayload(opts: { amountThb?: number; promptpayId?: string; billerId?: string; ref1?: string; ref2?: string }) {
  const { amountThb, promptpayId, billerId, ref1, ref2 } = opts
  let merchant: string
  if (billerId) {
    const r1 = (ref1 ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
    merchant = f('30', f('00', 'A000000677010112') + f('01', billerId.replace(/\D/g, '')) + (r1 ? f('02', r1) : '') + (ref2 ? f('03', ref2.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)) : ''))
  } else if (promptpayId) {
    merchant = f('29', f('00', 'A000000677010111') + promptPayTarget(promptpayId))
  } else throw new Error('PROMPTPAY_ID or PROMPTPAY_BILLER_ID required')
  let s = f('00', '01') + f('01', amountThb ? '12' : '11') + merchant + f('53', '764') + (amountThb ? f('54', amountThb.toFixed(2)) : '') + f('58', 'TH')
  s += '6304'
  return s + crc16(s)
}

export const promptPayConfigured = () => !!(process.env.PROMPTPAY_BILLER_ID?.trim() || process.env.PROMPTPAY_ID?.trim())
