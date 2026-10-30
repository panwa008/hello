import { createHmac, timingSafeEqual } from 'node:crypto'

export const hmacHex = (secret: string, data: string) => createHmac('sha256', secret).update(data, 'utf8').digest('hex')

/**
 * HMAC-SHA256 webhook signature check (placeholder scheme — align with your provider contract):
 *   <sigHeader>: "sha256=<hex>" or "<hex>"   where hex = HMAC_SHA256(secret, `${timestamp}.${rawBody}`) when a timestamp header is sent,
 *                                             otherwise HMAC_SHA256(secret, rawBody).
 *   <tsHeader>:  unix seconds; rejected when older/newer than `toleranceSec` (replay protection).
 */
export function verifyHmac(opts: { secret: string; rawBody: string; signature?: string; timestamp?: string; toleranceSec?: number }) {
  const { secret, rawBody, signature, timestamp, toleranceSec = 300 } = opts
  if (!secret || !signature) return false
  let signed = rawBody
  if (timestamp) {
    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false
    signed = `${timestamp}.${rawBody}`
  }
  const got = signature.trim().replace(/^sha256=/i, '').toLowerCase()
  const want = hmacHex(secret, signed)
  if (!/^[0-9a-f]{64}$/.test(got)) return false
  return timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(want, 'hex'))
}
