import { z } from 'zod'
import { db, bad, today } from '../db'
import { body, done, router } from '../http'
import { credit } from '../services'

/** Living World daily rewards. Fixed server-side amounts, once per (user, reward, Bangkok day). */
const r = router()
export const WORLD_REWARDS: Record<string, { points: number; label: string }> = {
  'quest:walk': { points: 20, label: 'ภารกิจรายวัน: เดิน' },
  'quest:greet': { points: 20, label: 'ภารกิจรายวัน: ทักทาย' },
  'quest:care': { points: 30, label: 'ภารกิจรายวัน: ดูแลน้อง' },
  'care:all': { points: 15, label: 'ดูแลน้องครบ 3 อย่าง' },
  checkin: { points: 5, label: 'เช็คอินจุดในโลก' },
}

r.post('/world/claim', body(z.object({ reward: z.string().max(40) })), (c) => {
  const id = c.get('userId'), { reward } = c.req.valid('json')
  const def = WORLD_REWARDS[reward]
  if (!def) throw bad('ไม่พบรางวัลนี้', 'unknown_reward')
  const ref = `${reward}:${today()}`
  if (db.prepare('SELECT 1 FROM transactions WHERE user_id=? AND kind=? AND ref=?').get(id, 'world', ref)) throw bad('รับรางวัลนี้ไปแล้ววันนี้', 'already_claimed')
  credit(id, def.points, def.label, 'world', undefined, ref)
  return done(c, { points: def.points })
})
export default r
