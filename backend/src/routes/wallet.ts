import { z } from 'zod'
import { db, now, bad, tx, inStepWindow, secondsSinceMidnight, ApiError } from '../db'
import { body, done, router } from '../http'
import { TOPUP } from '../catalog'
import { credit, walletRow } from '../services'
import { config } from '../config'
import { createTrueMoneyCharge, view } from '../payments/service'

const r = router()
export const MAX_STEPS_DAY = 80_000
export const MAX_STEPS_PER_SEC = 4

r.get('/wallet', (c) => {
  const id = c.get('userId'), w = walletRow(id)
  const tx = db.prepare('SELECT id,label t,points v,thb,created_at time FROM transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(id)
  return c.json({ ok: true, wallet: { points: w.points, steps: w.steps, stepsDate: w.steps_date, redeemed: w.redeemed, redeemable: Math.floor((w.steps - w.redeemed) / 100) }, tx, topup: TOPUP, truemoneyMode: config.payMode, features: { manualSteps: config.allowManualSteps, simSteps: config.allowSimSteps, demoTopup: config.demoTopup } })
})

/** Sync today's cumulative step count. Server validates plausibility. */
r.post('/wallet/steps', body(z.object({ steps: z.number().int().min(0).max(MAX_STEPS_DAY), source: z.enum(['manual', 'sim', 'device']).default('manual') })), (c) => {
  const id = c.get('userId'), { steps, source } = c.req.valid('json')
  if (source === 'sim' && !config.allowSimSteps) throw new ApiError(403, 'ปิดการจำลองก้าวเดินในโหมดจริง / simulated steps are disabled', 'sim_disabled')
  if (source === 'manual' && !config.allowManualSteps) throw new ApiError(403, 'ปิดการกรอกก้าวเองในโหมดจริง ใช้เซ็นเซอร์ของเครื่อง / manual steps are disabled — use the device pedometer', 'manual_disabled')
  // max steps/sec accepted between two syncs: simulator 30, real device ~5 (fast running ≈ 3–4 steps/s)
  const rate = source === 'sim' ? 30 : source === 'device' ? 5 : Infinity
  const w = walletRow(id)
  if (steps < w.redeemed) throw bad(`ก้าวต้องไม่น้อยกว่าที่แลกไปแล้ว (${w.redeemed.toLocaleString()})`, 'steps_below_redeemed')
  if (steps < w.steps) throw bad('จำนวนก้าวของวันนี้ลดลงไม่ได้', 'steps_decrease')
  const cap = Math.max(0, secondsSinceMidnight()) * MAX_STEPS_PER_SEC
  if (steps > cap) throw bad(`จำนวนก้าวมากเกินเวลาที่ผ่านไปของวันนี้ (สูงสุด ${cap.toLocaleString()})`, 'steps_implausible')
  if (rate !== Infinity && w.steps_synced_at && steps > w.steps) {
    const dt = Math.max(1, (now() - w.steps_synced_at) / 1000)
    if ((steps - w.steps) / dt > rate && steps - w.steps > 200) throw bad('ก้าวเพิ่มเร็วเกินไป ลองซิงก์ใหม่อีกครั้ง', 'steps_too_fast')
  }
  db.prepare('UPDATE wallets SET steps=?, steps_synced_at=? WHERE user_id=?').run(steps, now(), id)
  return done(c, { steps })
})
r.post('/wallet/redeem', (c) => {
  const id = c.get('userId')
  if (!inStepWindow()) throw bad('แลกก้าวได้เฉพาะ 00:01–23:59 น.', 'outside_window')
  const res = tx(() => {
    const w = walletRow(id)
    const avail = Math.floor((w.steps - w.redeemed) / 100)
    if (avail <= 0) throw bad('ยังไม่มีก้าวให้แลก (100 ก้าว = 1 P)', 'nothing_to_redeem')
    db.prepare('UPDATE wallets SET redeemed = redeemed + ? WHERE user_id=?').run(avail * 100, id)
    credit(id, avail, `แลกก้าวเดิน ${(avail * 100).toLocaleString()} ก้าว`, 'steps')
    return { points: avail, steps: avail * 100 }
  })
  return done(c, res)
})
/**
 * TrueMoney top-up (kept for older clients — same as POST /api/payments/truemoney/charge).
 * sandbox: no money moves, points credited immediately.
 * live:    creates a pending charge; points are credited ONLY by the signed webhook.
 *          Without merchant keys → 501 payment_not_configured (never a fake credit).
 */
r.post('/wallet/topup', body(z.object({ thb: z.number().int(), phone: z.string().regex(/^0[689]\d{8}$/, 'เบอร์ TrueMoney ไม่ถูกต้อง') })), async (c) => {
  const f = c.req.valid('json')
  const p = await createTrueMoneyCharge(c.get('userId'), f.thb, f.phone)
  return done(c, { ...view(p), sandbox: p.mode === 'sandbox', pending: p.status === 'pending' }, p.status === 'pending' ? 202 : 200)
})
/** Demo top-up for testing (off by default in production; DEMO_TOPUP=true to enable). */
r.post('/wallet/demo-topup', body(z.object({ points: z.number().int().min(1).max(50_000) })), (c) => {
  if (!config.demoTopup) throw new ApiError(403, 'ปิดการเติมพอยท์ทดสอบ / demo top-up disabled', 'forbidden')
  credit(c.get('userId'), c.req.valid('json').points, 'เติมพอยท์ทดสอบ (demo)', 'demo')
  return done(c)
})
export default r
