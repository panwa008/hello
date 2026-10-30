import { z } from 'zod'
import { db, now, uid, bad, notFound, today, ApiError } from '../db'
import { body, done, router } from '../http'
import { feedPosts, getUser } from '../state'
import { credit } from '../services'

const r = router()
const SCENES = ['sunset', 'lavender', 'city', 'beach', 'cafe', 'night'] as const
const img = z.string().max(2_500_000).refine((s) => /^data:image\/(png|jpe?g|webp|gif);base64,/.test(s) || /^https?:\/\//.test(s), 'รูปภาพไม่ถูกต้อง').optional()

r.get('/feed', (c) => c.json({ ok: true, posts: feedPosts(c.get('userId')) }))

r.post('/posts', body(z.object({ text: z.string().trim().max(2000).default(''), tags: z.array(z.string().max(40)).max(10).default([]), place: z.string().max(80).default('ใกล้ฉัน'), scene: z.enum(SCENES).default('lavender'), image: img, feeling: z.string().max(40).optional() })), (c) => {
  const p = c.req.valid('json'), id = c.get('userId')
  if (!p.text && !p.image) throw bad('เขียนอะไรสักหน่อยหรือแนบรูปนะ')
  const firstToday = !(db.prepare('SELECT 1 FROM transactions WHERE user_id=? AND kind=? AND ref=?').get(id, 'post_bonus', today()))
  const pid = uid('p')
  db.prepare('INSERT INTO posts (id,user_id,text,tags,place,scene,image,feeling,base_likes,created_at) VALUES (?,?,?,?,?,?,?,?,0,?)').run(pid, id, p.text, JSON.stringify(p.tags), p.place, p.scene, p.image ?? null, p.feeling ?? null, now())
  if (firstToday) credit(id, 20, 'โพสต์แรกของวัน', 'post_bonus', undefined, today())
  return done(c, { id: pid, bonus: firstToday ? 20 : 0 }, 201)
})
r.delete('/posts/:id', (c) => {
  const p = db.prepare('SELECT user_id FROM posts WHERE id=?').get(c.req.param('id')) as { user_id: string } | undefined
  if (!p) throw notFound('ไม่พบโพสต์')
  if (p.user_id !== c.get('userId')) throw new ApiError(403, 'ลบได้เฉพาะโพสต์ของตัวเอง', 'forbidden')
  db.prepare('DELETE FROM posts WHERE id=?').run(c.req.param('id'))
  return done(c)
})
r.post('/posts/:id/like', body(z.object({ like: z.boolean().optional() })), (c) => {
  const pid = c.req.param('id'), id = c.get('userId')
  if (!db.prepare('SELECT 1 FROM posts WHERE id=?').get(pid)) throw notFound('ไม่พบโพสต์')
  const has = !!db.prepare('SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?').get(pid, id)
  const want = c.req.valid('json').like ?? !has
  if (want && !has) db.prepare('INSERT INTO post_likes (post_id,user_id) VALUES (?,?)').run(pid, id)
  if (!want && has) db.prepare('DELETE FROM post_likes WHERE post_id=? AND user_id=?').run(pid, id)
  return done(c, { liked: want })
})
const AUTHOR_BACK = ['ขอบคุณน้าา 💜', 'ฮ่า ๆ ใช่เลย 😆', 'ไว้ไปด้วยกันนะ ✨', '🫶🫶']
r.post('/posts/:id/comments', body(z.object({ text: z.string().trim().min(1).max(500), parentId: z.string().optional() })), (c) => {
  const pid = c.req.param('id'), id = c.get('userId'), f = c.req.valid('json')
  const post = db.prepare('SELECT user_id FROM posts WHERE id=?').get(pid) as { user_id: string } | undefined
  if (!post) throw notFound('ไม่พบโพสต์')
  if (f.parentId && !db.prepare('SELECT 1 FROM comments WHERE id=? AND post_id=?').get(f.parentId, pid)) throw notFound('ไม่พบคอมเมนต์')
  const cid = uid('c')
  db.prepare('INSERT INTO comments (id,post_id,user_id,parent_id,text,created_at) VALUES (?,?,?,?,?,?)').run(cid, pid, id, f.parentId ?? null, f.text, now())
  // demo bot authors answer replies after a short delay (stored with a future timestamp)
  const author = getUser(post.user_id)
  if (author?.is_bot && post.user_id !== id) db.prepare('INSERT INTO comments (id,post_id,user_id,parent_id,text,created_at) VALUES (?,?,?,?,?,?)').run(uid('c'), pid, post.user_id, f.parentId ?? cid, AUTHOR_BACK[Math.floor(Math.random() * AUTHOR_BACK.length)], now() + 2500)
  return done(c, { id: cid }, 201)
})
r.delete('/posts/:pid/comments/:cid', (c) => {
  const cm = db.prepare('SELECT user_id FROM comments WHERE id=? AND post_id=?').get(c.req.param('cid'), c.req.param('pid')) as { user_id: string } | undefined
  if (!cm) throw notFound('ไม่พบคอมเมนต์')
  if (cm.user_id !== c.get('userId')) throw new ApiError(403, 'ลบได้เฉพาะคอมเมนต์ของตัวเอง', 'forbidden')
  db.prepare('DELETE FROM comments WHERE id=? OR parent_id=?').run(c.req.param('cid'), c.req.param('cid'))
  return done(c)
})
r.post('/stories', body(z.object({ scene: z.enum(SCENES).default('sunset'), text: z.string().max(200).default(''), image: img })), (c) => {
  const s = c.req.valid('json'), sid = uid('st')
  db.prepare('INSERT INTO stories (id,user_id,scene,text,image,created_at) VALUES (?,?,?,?,?,?)').run(sid, c.get('userId'), s.scene, s.text, s.image ?? null, now())
  return done(c, { id: sid }, 201)
})
r.delete('/stories/:id', (c) => {
  db.prepare('DELETE FROM stories WHERE id=? AND user_id=?').run(c.req.param('id'), c.get('userId'))
  return done(c)
})
export default r
